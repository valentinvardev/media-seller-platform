import { z } from "zod";
import { getAdminClient } from "~/lib/supabase/admin";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB

export const photoRouter = createTRPCRouter({
  bulkAdd: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        photos: z.array(
          z.object({
            storageKey: z.string(),
            filename: z.string(),
            fileSize: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.photo.count({ where: { folderId: input.folderId } });
      await ctx.db.photo.createMany({
        data: input.photos.map((p, i) => ({
          folderId: input.folderId,
          storageKey: p.storageKey,
          filename: p.filename,
          fileSize: p.fileSize,
          width: p.width,
          height: p.height,
          order: count + i,
        })),
      });
    }),

  getStorageUsage: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.photo.aggregate({ _sum: { fileSize: true } });
    return {
      usedBytes: Number(result._sum.fileSize ?? 0),
      limitBytes: STORAGE_LIMIT_BYTES,
    };
  }),

  setPreview: protectedProcedure
    .input(z.object({ id: z.string(), isPreview: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.isPreview) {
        // Turning OFF: remove watermarked file from storage
        const photo = await ctx.db.photo.findUniqueOrThrow({
          where: { id: input.id },
          select: { previewKey: true },
        });
        if (photo.previewKey) {
          const client = getAdminClient();
          if (client) await client.storage.from("photos").remove([photo.previewKey]);
        }
        return ctx.db.photo.update({
          where: { id: input.id },
          data: { isPreview: false, previewKey: null },
        });
      }
      // Turning ON: just mark it — the watermark API route handles file generation
      return ctx.db.photo.update({
        where: { id: input.id },
        data: { isPreview: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.photo.findUniqueOrThrow({ where: { id: input.id } });
      const client = getAdminClient();
      if (client) {
        const toRemove: string[] = [];
        if (!photo.storageKey.startsWith("http")) toRemove.push(photo.storageKey);
        if (photo.previewKey) toRemove.push(photo.previewKey);
        if (toRemove.length) await client.storage.from("photos").remove(toRemove);
      }
      return ctx.db.photo.delete({ where: { id: input.id } });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({ where: { id: { in: input.ids } } });
      const client = getAdminClient();
      if (client) {
        const keys: string[] = [];
        for (const p of photos) {
          if (!p.storageKey.startsWith("http")) keys.push(p.storageKey);
          if (p.previewKey) keys.push(p.previewKey);
        }
        if (keys.length) await client.storage.from("photos").remove(keys);
      }
      await ctx.db.photo.deleteMany({ where: { id: { in: input.ids } } });
    }),

  previewStatus: protectedProcedure.query(async ({ ctx }) => {
    const photos = await ctx.db.photo.findMany({
      where: { isPreview: true, previewKey: { not: null } },
      select: { id: true, previewGeneratedAt: true },
    });

    // Get watermark last-modified from Supabase storage
    const client = getAdminClient();
    let wmUpdatedAt: Date | null = null;
    if (client) {
      const { data } = await client.storage.from("photos").list("watermarks");
      const entry = data?.find((f) => f.name === "active.png");
      if (entry?.updated_at) wmUpdatedAt = new Date(entry.updated_at);
    }

    const ids = photos.map((p) => p.id);
    const stale = photos.filter((p) =>
      !p.previewGeneratedAt || (wmUpdatedAt && p.previewGeneratedAt < wmUpdatedAt),
    ).length;

    return { ids, total: ids.length, stale, fresh: ids.length - stale, wmUpdatedAt };
  }),

  cleanupHeic: protectedProcedure.mutation(async ({ ctx }) => {
    const heicPhotos = await ctx.db.photo.findMany({
      where: {
        OR: [
          { filename: { endsWith: ".heic", mode: "insensitive" } },
          { filename: { endsWith: ".heif", mode: "insensitive" } },
        ],
      },
      select: { id: true, storageKey: true, previewKey: true },
    });

    if (heicPhotos.length === 0) return { deleted: 0 };

    const client = getAdminClient();
    if (client) {
      const keys: string[] = [];
      for (const p of heicPhotos) {
        if (!p.storageKey.startsWith("http")) keys.push(p.storageKey);
        if (p.previewKey) keys.push(p.previewKey);
      }
      if (keys.length) await client.storage.from("photos").remove(keys);
    }

    await ctx.db.photo.deleteMany({ where: { id: { in: heicPhotos.map((p) => p.id) } } });
    return { deleted: heicPhotos.length };
  }),
});
