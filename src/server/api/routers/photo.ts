import { z } from "zod";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const photoRouter = createTRPCRouter({
  addToFolder: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        storageKey: z.string(),
        filename: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.db.photo.create({ data: input })),

  bulkAdd: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        photos: z.array(
          z.object({
            storageKey: z.string(),
            filename: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.photo.count({
        where: { folderId: input.folderId },
      });

      await ctx.db.photo.createMany({
        data: input.photos.map((p, i) => ({
          folderId: input.folderId,
          storageKey: p.storageKey,
          filename: p.filename,
          width: p.width,
          height: p.height,
          order: count + i,
        })),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.photo.findUniqueOrThrow({
        where: { id: input.id },
      });

      const supabase = await createClient();
      await supabase.storage.from("photos").remove([photo.storageKey]);

      return ctx.db.photo.delete({ where: { id: input.id } });
    }),
});
