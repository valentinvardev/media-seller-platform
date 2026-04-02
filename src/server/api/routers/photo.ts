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

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.photo.findUniqueOrThrow({ where: { id: input.id } });
      const client = getAdminClient();
      if (client && !photo.storageKey.startsWith("http")) {
        await client.storage.from("photos").remove([photo.storageKey]);
      }
      return ctx.db.photo.delete({ where: { id: input.id } });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({ where: { id: { in: input.ids } } });
      const client = getAdminClient();
      if (client) {
        const keys = photos.map((p) => p.storageKey).filter((k) => !k.startsWith("http"));
        if (keys.length) await client.storage.from("photos").remove(keys);
      }
      await ctx.db.photo.deleteMany({ where: { id: { in: input.ids } } });
    }),
});
