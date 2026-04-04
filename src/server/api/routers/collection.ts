import { z } from "zod";
import { createSignedUrl } from "~/lib/supabase/admin";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/** Resolve a coverUrl field: sign it if it's a storage key, pass through if it's a full URL. */
async function resolveCover(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return createSignedUrl(url, 7200);
}

export const collectionRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  list: publicProcedure.query(async ({ ctx }) => {
    const cols = await ctx.db.collection.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { folders: true } } },
    });
    return Promise.all(
      cols.map(async (c) => ({ ...c, coverUrl: await resolveCover(c.coverUrl) })),
    );
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findFirst({
        where: { slug: input.slug, isPublished: true },
        include: { _count: { select: { folders: true } } },
      });
      if (!col) return null;
      return { ...col, coverUrl: await resolveCover(col.coverUrl) };
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminList: protectedProcedure.query(async ({ ctx }) => {
    const cols = await ctx.db.collection.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { folders: true } } },
    });
    return Promise.all(
      cols.map(async (c) => ({ ...c, coverUrl: await resolveCover(c.coverUrl) })),
    );
  }),

  adminGetById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findUnique({
        where: { id: input.id },
        include: {
          folders: {
            orderBy: { number: "asc" },
            include: { _count: { select: { photos: true } } },
          },
        },
      });
      if (!col) return null;
      return { ...col, coverUrl: await resolveCover(col.coverUrl) };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        coverUrl: z.string().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.collection.create({ data: input }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        coverUrl: z.string().optional().nullable(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.collection.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.collection.delete({ where: { id: input.id } }),
    ),

  togglePublish: protectedProcedure
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
});
