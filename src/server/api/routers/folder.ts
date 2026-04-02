import { z } from "zod";
import { createSignedUrl } from "~/lib/supabase/admin";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const PREVIEW_PHOTO_COUNT = 4;

export const folderRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  listByCollection: publicProcedure
    .input(
      z.object({
        collectionId: z.string(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const folders = await ctx.db.folder.findMany({
        where: {
          collectionId: input.collectionId,
          isPublished: true,
          ...(input.search
            ? { number: { contains: input.search, mode: "insensitive" } }
            : {}),
        },
        orderBy: { number: "asc" },
        include: {
          _count: { select: { photos: true } },
          photos: {
            take: PREVIEW_PHOTO_COUNT,
            orderBy: { order: "asc" },
            select: { storageKey: true, id: true },
          },
        },
      });

      return Promise.all(
        folders.map(async (folder) => {
          const previewUrls = await Promise.all(
            folder.photos.map((photo) => createSignedUrl(photo.storageKey, 3600)),
          );

          return {
            id: folder.id,
            number: folder.number,
            price: folder.price,
            isPublic: folder.isPublic,
            photoCount: folder._count.photos,
            previewUrls: previewUrls.filter(Boolean) as string[],
          };
        }),
      );
    }),

  getPreview: publicProcedure
    .input(z.object({ folderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const folder = await ctx.db.folder.findFirst({
        where: { id: input.folderId, isPublished: true },
        include: {
          collection: { select: { title: true, slug: true } },
          photos: {
            take: PREVIEW_PHOTO_COUNT,
            orderBy: { order: "asc" },
            select: { storageKey: true, id: true },
          },
          _count: { select: { photos: true } },
        },
      });

      if (!folder) return null;

      const previewUrls = await Promise.all(
        folder.photos.map((photo) => createSignedUrl(photo.storageKey, 3600)),
      );

      return {
        id: folder.id,
        number: folder.number,
        price: folder.price,
        collectionTitle: folder.collection.title,
        collectionSlug: folder.collection.slug,
        isPublic: folder.isPublic,
        photoCount: folder._count.photos,
        previewUrls: previewUrls.filter(Boolean) as string[],
      };
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminGetById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.folder.findUnique({
        where: { id: input.id },
        include: {
          collection: { select: { title: true, slug: true } },
          photos: { orderBy: { order: "asc" } },
          purchases: { orderBy: { createdAt: "desc" } },
        },
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        number: z.string().min(1),
        price: z.number().positive(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.folder.create({ data: input }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        number: z.string().min(1).optional(),
        price: z.number().positive().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.folder.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.folder.delete({ where: { id: input.id } }),
    ),

  togglePublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.folder.findUniqueOrThrow({
        where: { id: input.id },
        select: { isPublished: true },
      });
      return ctx.db.folder.update({
        where: { id: input.id },
        data: { isPublished: !current.isPublished },
      });
    }),

  togglePublicFolder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.folder.findUniqueOrThrow({
        where: { id: input.id },
        select: { isPublic: true },
      });
      return ctx.db.folder.update({
        where: { id: input.id },
        data: { isPublic: !current.isPublic },
      });
    }),

  reorderPhotos: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        orderedPhotoIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.orderedPhotoIds.map((id, index) =>
          ctx.db.photo.update({ where: { id }, data: { order: index } }),
        ),
      );
    }),
});
