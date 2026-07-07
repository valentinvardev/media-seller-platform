import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resolveMediaUrl } from "~/lib/media";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const collaboratorRouter = createTRPCRouter({
  /**
   * List all events the current user is a member of.
   * Admins can see all events via /admin/colecciones — this is specifically
   * for the collaborator dashboard so it only returns memberships.
   */
  myEvents: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.collectionMember.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverUrl: true,
            eventDate: true,
            isPublished: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      memberships.map(async (m) => ({
        id: m.collection.id,
        title: m.collection.title,
        slug: m.collection.slug,
        coverUrl: await resolveMediaUrl(m.collection.coverUrl ?? "").catch(() => null),
        eventDate: m.collection.eventDate,
        isPublished: m.collection.isPublished,
        role: m.role,
      })),
    );
  }),

  /**
   * Full event detail for the collaborator view. Verifies the current user is a
   * member (or admin) before returning anything.
   */
  eventDetail: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireCollectionAccess(ctx, input.collectionId);

      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: {
          id: true, title: true, slug: true, coverUrl: true, eventDate: true,
          pricePerBib: true, isPublished: true,
        },
      });
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });

      const myPhotoCount = await ctx.db.photo.count({
        where: { collectionId: input.collectionId, uploaderId: ctx.session.user.id },
      });

      return {
        ...collection,
        pricePerBib: Number(collection.pricePerBib),
        coverUrl: await resolveMediaUrl(collection.coverUrl ?? "").catch(() => null),
        myPhotoCount,
      };
    }),

  /**
   * List of photos the current user uploaded to this event, paginated.
   * Admins get all photos (uploaderId filter dropped) when passed the event id.
   */
  myPhotos: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        page: z.number().default(1),
        limit: z.number().max(96).default(48),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCollectionAccess(ctx, input.collectionId);

      const where = {
        collectionId: input.collectionId,
        uploaderId: ctx.session.user.id,
      };

      const [total, raw] = await Promise.all([
        ctx.db.photo.count({ where }),
        ctx.db.photo.findMany({
          where,
          orderBy: [{ bibNumber: { sort: "asc", nulls: "first" } }, { order: "asc" }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          select: { id: true, filename: true, bibNumber: true, storageKey: true, previewKey: true },
        }),
      ]);

      const photos = await Promise.all(
        raw.map(async (p) => ({
          id: p.id,
          filename: p.filename,
          bibNumber: p.bibNumber,
          url: await resolveMediaUrl(p.previewKey ?? p.storageKey).catch(() => null),
        })),
      );

      return { photos, total, pages: Math.max(1, Math.ceil(total / input.limit)) };
    }),

  /**
   * Pro-rata sales report for the collaborator's photos in this event.
   * For each APPROVED purchase whose photoIds includes a photo they uploaded:
   *   attributedAmount = amountPaid * (mine.length / photoIds.length)
   */
  mySales: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireCollectionAccess(ctx, input.collectionId);

      const myPhotos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId, uploaderId: ctx.session.user.id },
        select: { id: true },
      });
      const myPhotoIds = new Set(myPhotos.map((p) => p.id));

      if (myPhotoIds.size === 0) {
        return { items: [], totalRevenue: 0, totalPhotosSold: 0, myPhotoCount: 0 };
      }

      const purchases = await ctx.db.purchase.findMany({
        where: {
          collectionId: input.collectionId,
          status: "APPROVED",
          photoIds: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, createdAt: true, buyerEmail: true, buyerName: true,
          bibNumber: true, amountPaid: true, photoIds: true,
        },
      });

      const items: Array<{
        id: string;
        createdAt: Date;
        buyerEmail: string;
        buyerName: string | null;
        bibNumber: string | null;
        myPhotos: number;
        totalPhotos: number;
        attributedAmount: number;
      }> = [];

      for (const p of purchases) {
        let ids: string[];
        try {
          ids = JSON.parse(p.photoIds!) as string[];
        } catch { continue; }
        if (ids.length === 0) continue;

        const mine = ids.filter((id) => myPhotoIds.has(id)).length;
        if (mine === 0) continue;

        const share = mine / ids.length;
        items.push({
          id: p.id,
          createdAt: p.createdAt,
          buyerEmail: p.buyerEmail,
          buyerName: p.buyerName,
          bibNumber: p.bibNumber,
          myPhotos: mine,
          totalPhotos: ids.length,
          attributedAmount: Number(p.amountPaid) * share,
        });
      }

      return {
        items,
        totalRevenue: items.reduce((s, x) => s + x.attributedAmount, 0),
        totalPhotosSold: items.reduce((s, x) => s + x.myPhotos, 0),
        myPhotoCount: myPhotoIds.size,
      };
    }),
});

/**
 * Throws FORBIDDEN unless the current session user is an ADMIN or a member of
 * this collection. Callable from any collaborator procedure that needs event
 * scope enforcement.
 */
async function requireCollectionAccess(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string; role: string } } },
  collectionId: string,
): Promise<void> {
  if (ctx.session.user.role === "ADMIN") return;
  const member = await ctx.db.collectionMember.findUnique({
    where: {
      userId_collectionId: { userId: ctx.session.user.id, collectionId },
    },
  });
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "No sos parte de este evento" });
}
