import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  copyObject,
  createCFInvalidation,
  deleteObjects,
  objectExists,
} from "~/lib/s3";
import { resolveMediaUrl } from "~/lib/media";
import { WATERMARK_KEY } from "~/lib/watermark";
import { invalidateWatermarkCache } from "~/lib/photo-processing";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

const presetKey = (id: string) => `watermark-presets/${id}.png`;

/**
 * One-time migration: if there are no presets yet but a legacy active watermark
 * exists at WATERMARK_KEY, save a copy as the "Actual" preset so switching back
 * to it never requires re-uploading. Safe to call repeatedly.
 */
async function ensureCurrentSaved(db: typeof import("~/server/db").db) {
  const count = await db.watermarkPreset.count();
  if (count > 0) return;
  if (!(await objectExists(WATERMARK_KEY))) return;

  const preset = await db.watermarkPreset.create({
    data: { name: "Actual", isActive: true, storageKey: "" },
  });
  const key = presetKey(preset.id);
  await copyObject(WATERMARK_KEY, key);
  await db.watermarkPreset.update({ where: { id: preset.id }, data: { storageKey: key } });
}

export const watermarkRouter = createTRPCRouter({
  /** All saved presets with preview URLs; marks which one is active. */
  listPresets: adminProcedure.query(async ({ ctx }) => {
    await ensureCurrentSaved(ctx.db);
    const presets = await ctx.db.watermarkPreset.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return Promise.all(
      presets.map(async (p) => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        createdAt: p.createdAt,
        url: await resolveMediaUrl(p.storageKey).catch(() => null),
      })),
    );
  }),

  /** Make a preset the active watermark: mirror it to WATERMARK_KEY. */
  applyPreset: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const preset = await ctx.db.watermarkPreset.findUnique({ where: { id: input.id } });
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: "Preset no encontrado" });

      await copyObject(preset.storageKey, WATERMARK_KEY);
      await ctx.db.watermarkPreset.updateMany({ where: { isActive: true }, data: { isActive: false } });
      await ctx.db.watermarkPreset.update({ where: { id: preset.id }, data: { isActive: true } });

      invalidateWatermarkCache();
      void createCFInvalidation([`/${WATERMARK_KEY}`]);
      return { ok: true };
    }),

  rename: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.watermarkPreset.update({ where: { id: input.id }, data: { name: input.name } });
      return { ok: true };
    }),

  deletePreset: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const preset = await ctx.db.watermarkPreset.findUnique({ where: { id: input.id } });
      if (!preset) return { ok: true };
      if (preset.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No podés borrar la marca de agua activa. Activá otra primero." });
      }
      await deleteObjects([preset.storageKey]).catch(() => undefined);
      await ctx.db.watermarkPreset.delete({ where: { id: preset.id } });
      return { ok: true };
    }),
});
