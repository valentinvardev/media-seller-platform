import { z } from "zod";
import { resolveMediaUrl } from "~/lib/media";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

/** Resolve a storage key or full URL to a display URL (CF or presigned fallback). */
async function resolveUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return resolveMediaUrl(url);
}

// Keep old name as alias for backwards compat inside this file
const resolveCover = resolveUrl;

export const collectionRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  list: publicProcedure.query(async ({ ctx }) => {
    const cols = await ctx.db.collection.findMany({
      where: { isPublished: true, isHidden: false },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { photos: true } } },
    });
    return Promise.all(
      cols.map(async (c) => ({
        ...c,
        coverUrl: await resolveCover(c.coverUrl),
        logoUrl: await resolveUrl(c.logoUrl),
        bannerUrl: await resolveUrl(c.bannerUrl),
        bannerFocalY: c.bannerFocalY ?? 0.5,
      })),
    );
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findFirst({
        where: { slug: input.slug, isPublished: true },
        include: { _count: { select: { photos: true } } },
      });
      if (!col) return null;
      return {
        ...col,
        coverUrl: await resolveCover(col.coverUrl),
        logoUrl: await resolveUrl(col.logoUrl),
        bannerUrl: await resolveUrl(col.bannerUrl),
      };
    }),

  getPrice: publicProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findFirst({
        where: { id: input.collectionId, isPublished: true },
        select: { pricePerBib: true, title: true },
      });
      if (!col) return null;
      return { price: Number(col.pricePerBib), title: col.title };
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminList: adminProcedure.query(async ({ ctx }) => {
    const cols = await ctx.db.collection.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { photos: true } } },
    });
    return Promise.all(
      cols.map(async (c) => ({
        ...c,
        coverUrl: await resolveCover(c.coverUrl),
        logoUrl: await resolveUrl(c.logoUrl),
        bannerUrl: await resolveUrl(c.bannerUrl),
        bannerFocalY: c.bannerFocalY ?? 0.5,
      })),
    );
  }),

  adminGetById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { photos: true } },
        },
      });
      if (!col) return null;
      return {
        ...col,
        coverUrl: await resolveCover(col.coverUrl),
        logoUrl: await resolveUrl(col.logoUrl),
        bannerUrl: await resolveUrl(col.bannerUrl),
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        coverUrl: z.string().optional(),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        bannerFocalY: z.number().min(0).max(1).optional(),
        pricePerBib: z.number().min(0).optional(),
        isPublished: z.boolean().optional(),
        isHidden: z.boolean().optional(),
        hasAlphanumericBibs: z.boolean().optional(),
        eventDate: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { eventDate, ...rest } = input;
      return ctx.db.collection.create({
        data: { ...rest, eventDate: eventDate ? new Date(eventDate) : undefined },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        coverUrl: z.string().optional().nullable(),
        logoUrl: z.string().optional().nullable(),
        bannerUrl: z.string().optional().nullable(),
        bannerFocalY: z.number().min(0).max(1).optional().nullable(),
        pricePerBib: z.number().min(0).optional(),
        isPublished: z.boolean().optional(),
        isHidden: z.boolean().optional(),
        hasAlphanumericBibs: z.boolean().optional(),
        eventDate: z.string().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, eventDate, ...rest } = input;
      return ctx.db.collection.update({
        where: { id },
        data: {
          ...rest,
          ...(eventDate !== undefined
            ? { eventDate: eventDate ? new Date(eventDate) : null }
            : {}),
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Collect every S3 object this event owns BEFORE dropping the rows —
      // photo.deleteMany is a raw DB delete that (unlike photo.delete) never
      // touched S3, so originals + watermarked previews leaked forever.
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: id },
        select: { storageKey: true, previewKey: true },
      });
      const collection = await ctx.db.collection.findUnique({
        where: { id },
        select: { coverUrl: true, logoUrl: true, bannerUrl: true },
      });
      const keys: string[] = [];
      for (const p of photos) {
        if (p.storageKey) keys.push(p.storageKey);
        if (p.previewKey) keys.push(p.previewKey);
      }
      for (const asset of [collection?.coverUrl, collection?.logoUrl, collection?.bannerUrl]) {
        if (asset) keys.push(asset);
      }

      // Drop the Rekognition collection too — otherwise its stored faces are
      // billed forever as orphans (we found 79 such leaks in an audit). Best
      // effort: never block the DB delete on an AWS hiccup.
      try {
        const { deleteRekognitionCollection } = await import("~/lib/photo-processing");
        await deleteRekognitionCollection(id);
      } catch (err) {
        console.error("[collection.delete] Rekognition cleanup failed:", err);
      }

      await ctx.db.purchase.deleteMany({ where: { collectionId: id } });
      await ctx.db.photo.deleteMany({ where: { collectionId: id } });
      const result = await ctx.db.collection.delete({ where: { id } });

      // Clean the S3 objects in the background — for a multi-thousand-photo event
      // this shouldn't block the admin response. Batched (1000/call) inside.
      if (keys.length) {
        const { deleteObjects } = await import("~/lib/s3");
        void deleteObjects(keys).catch((e) => console.error("[collection.delete] S3 cleanup failed:", e));
      }

      return result;
    }),

  togglePublish: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.collection.findUniqueOrThrow({
        where: { id: input.id },
        select: { isPublished: true },
      });
      return ctx.db.collection.update({
        where: { id: input.id },
        data: { isPublished: !current.isPublished },
      });
    }),

  toggleHide: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.collection.findUniqueOrThrow({
        where: { id: input.id },
        select: { isHidden: true },
      });
      return ctx.db.collection.update({
        where: { id: input.id },
        data: { isHidden: !current.isHidden },
      });
    }),
});
