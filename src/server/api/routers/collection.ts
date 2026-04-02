import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const collectionRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  list: publicProcedure.query(({ ctx }) =>
    ctx.db.collection.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { folders: true } } },
    }),
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.collection.findFirst({
        where: { slug: input.slug, isPublished: true },
        include: { _count: { select: { folders: true } } },
      }),
    ),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminList: protectedProcedure.query(({ ctx }) =>
    ctx.db.collection.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { folders: true } } },
    }),
  ),

  adminGetById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.collection.findUnique({
        where: { id: input.id },
        include: {
          folders: {
            orderBy: { number: "asc" },
            include: { _count: { select: { photos: true } } },
          },
        },
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        coverUrl: z.string().url().optional(),
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
        coverUrl: z.string().url().optional().nullable(),
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
