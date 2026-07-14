import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createSignedUrl, deleteObjects } from "~/lib/s3";
import { resolveMediaUrl } from "~/lib/media";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db as dbInstance } from "~/server/db";

const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB

/**
 * Authorize a user to upload / mutate photos in a given collection.
 * Admins pass through. Collaborators must be a CollectionMember of the event.
 */
async function requireUploadAccess(
  ctx: { db: typeof dbInstance; session: { user: { id: string; role: string } } },
  collectionId: string,
): Promise<void> {
  if (ctx.session.user.role === "ADMIN") return;
  const member = await ctx.db.collectionMember.findUnique({
    where: { userId_collectionId: { userId: ctx.session.user.id, collectionId } },
  });
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "No sos parte de este evento" });
}

export const photoRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  /**
   * Search photos in a collection by bib number.
   * Returns: exact matches first, then fuzzy (1-digit-different, 3-4 digit bibs).
   * Only metadata (id, bibNumber) returned immediately; URLs resolved on demand.
   */
  /** All photos in a collection — unidentified bibs first, then identified, ordered by order. */
  listAll: publicProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId },
        orderBy: { order: "asc" },
        select: { id: true, bibNumber: true },
      });
      return [
        ...photos.filter((p) => !p.bibNumber),
        ...photos.filter((p) => !!p.bibNumber),
      ];
    }),

  listPaginated: publicProcedure
    .input(z.object({
      collectionId: z.string(),
      limit: z.number().min(1).max(100).default(48),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.photo.count({ where: { collectionId: input.collectionId } });
      const raw = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId },
        orderBy: { order: "asc" },
        select: { id: true, bibNumber: true, storageKey: true, previewKey: true },
        skip: input.offset,
        take: input.limit,
      });
      const photos = await Promise.all(
        raw.map(async (p) => {
          const key = p.previewKey ?? p.storageKey;
          const url = await resolveMediaUrl(key);
          return { id: p.id, bibNumber: p.bibNumber, url };
        }),
      );
      return {
        photos: photos.filter((p): p is { id: string; bibNumber: string | null; url: string } => p.url !== null),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  searchByBib: publicProcedure
    .input(
      z.object({
        collectionId: z.string(),
        bib: z.string().min(1).max(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.bib.trim();

      // Exact/contains match (supports comma-separated multi-bib strings)
      const exact = await ctx.db.photo.findMany({
        where: {
          collectionId: input.collectionId,
          bibNumber: { contains: q, mode: "insensitive" },
        },
        orderBy: { order: "asc" },
        select: { id: true, bibNumber: true, storageKey: true, previewKey: true, filename: true },
      });

      // Fuzzy group — only for 3-4 digit queries
      let fuzzy: typeof exact = [];
      if (/^\d{3,4}$/.test(q)) {
        const candidates = await ctx.db.photo.findMany({
          where: {
            collectionId: input.collectionId,
            bibNumber: { not: null },
            AND: [
              { bibNumber: { not: q } },
            ],
          },
          select: { id: true, bibNumber: true, storageKey: true, previewKey: true, filename: true },
        });
        fuzzy = candidates.filter((p) => {
          const n = p.bibNumber?.trim() ?? "";
          if (n.length !== q.length) return false;
          let diffs = 0;
          for (let i = 0; i < q.length; i++) {
            if (n[i] !== q[i]) diffs++;
          }
          return diffs === 1;
        });
      }

      // Group by bibNumber so each bib becomes one card
      const groupByBib = (photos: typeof exact) => {
        const map = new Map<string, typeof exact>();
        for (const p of photos) {
          const key = p.bibNumber ?? "?";
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
        }
        return Array.from(map.entries()).map(([bib, photos]) => ({ bib, photos }));
      };

      const resolveUrls = async (photos: typeof exact) =>
        Promise.all(photos.map(async (p) => {
          const key = p.previewKey ?? p.storageKey;
          const url = await resolveMediaUrl(key);
          return { id: p.id, bibNumber: p.bibNumber, url: url ?? "" };
        }));

      const [exactResolved, fuzzyResolved] = await Promise.all([
        resolveUrls(exact),
        resolveUrls(fuzzy),
      ]);

      const groupByBibWithUrls = (photos: { id: string; bibNumber: string | null; url: string }[]) => {
        const map = new Map<string, typeof photos>();
        for (const p of photos) {
          const key = p.bibNumber ?? "?";
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
        }
        return Array.from(map.entries()).map(([bib, photos]) => ({ bib, photos }));
      };

      // Fire-and-forget search log
      void ctx.db.searchLog.create({ data: { collectionId: input.collectionId, type: "bib" } });

      return {
        exact: groupByBibWithUrls(exactResolved),
        fuzzy: groupByBibWithUrls(fuzzyResolved),
      };
    }),

  /** Resolve signed preview URLs for a list of photo IDs (called after initial render). */
  getPreviewUrls: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, storageKey: true, previewKey: true },
      });
      const results = await Promise.all(
        photos.map(async (p) => {
          const key = p.previewKey ?? p.storageKey;
          const url = await resolveMediaUrl(key);
          return { id: p.id, url };
        }),
      );
      return results.filter((r): r is { id: string; url: string } => r.url !== null);
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  bulkAdd: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        photos: z.array(
          z.object({
            storageKey: z.string(),
            filename: z.string(),
            bibNumber: z.string().optional(),
            fileSize: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            contentHash: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireUploadAccess(ctx, input.collectionId);

      const count = await ctx.db.photo.count({ where: { collectionId: input.collectionId } });
      const uploaderId = ctx.session.user.id;
      // createMany doesn't return IDs in all DBs; create individually so we can return IDs for OCR
      const created = await Promise.all(
        input.photos.map((p, i) =>
          ctx.db.photo.create({
            data: {
              collectionId: input.collectionId,
              storageKey: p.storageKey,
              filename: p.filename,
              bibNumber: p.bibNumber ?? null,
              fileSize: p.fileSize,
              width: p.width,
              height: p.height,
              contentHash: p.contentHash,
              uploaderId,
              order: count + i,
            },
            select: { id: true },
          }),
        ),
      );
      const ids = created.map((c) => c.id);

      // Kick off OCR + watermark + face-index in background.
      // Uses a global semaphore (see photo-processing.ts) to cap how many
      // concurrent ops can hit Supabase/Prisma at once.
      void (async () => {
        const { runOcrLimited, runWatermarkLimited, runFaceIndexLimited } = await import("~/lib/photo-processing");
        for (let i = 0; i < ids.length; i++) {
          const photoId = ids[i]!;
          // Slower stagger (800ms) gives more breathing room while batches finish
          await new Promise((r) => setTimeout(r, i * 800));
          void runOcrLimited(photoId);
          void runWatermarkLimited(photoId);
          void runFaceIndexLimited(photoId, input.collectionId);
        }
      })();

      return { ids };
    }),

  /**
   * Before uploading a batch of files, ask the server which ones already exist.
   * Called per file (or batched) from the uploader. Match logic:
   *  - Same collection + same contentHash → duplicate (skip upload, mark as already uploaded).
   *  - Same collection + same filename but different hash → content changed (replace, re-run OCR/watermark/face-index).
   *  - Neither → normal upload.
   */
  checkExisting: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        items: z.array(z.object({ filename: z.string(), contentHash: z.string() })),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.items.length === 0) return { results: [] };

      await requireUploadAccess(ctx, input.collectionId);
      const isAdmin = ctx.session.user.role === "ADMIN";
      // Collaborators only dedupe against their own uploads — so their upload
      // won't be "duplicate" of a different photographer's photo.
      const scopeFilter = isAdmin ? {} : { uploaderId: ctx.session.user.id };

      const hashes = Array.from(new Set(input.items.map((i) => i.contentHash)));
      const filenames = Array.from(new Set(input.items.map((i) => i.filename)));

      // One query per index — Prisma will pick the composite index.
      const [byHash, byFilename] = await Promise.all([
        ctx.db.photo.findMany({
          where: { collectionId: input.collectionId, contentHash: { in: hashes }, ...scopeFilter },
          select: { id: true, contentHash: true, filename: true },
        }),
        ctx.db.photo.findMany({
          where: { collectionId: input.collectionId, filename: { in: filenames }, ...scopeFilter },
          select: { id: true, contentHash: true, filename: true },
        }),
      ]);

      const hashMap = new Map<string, string>();
      for (const p of byHash) if (p.contentHash) hashMap.set(p.contentHash, p.id);

      const filenameMap = new Map<string, { id: string; contentHash: string | null }>();
      for (const p of byFilename) filenameMap.set(p.filename, { id: p.id, contentHash: p.contentHash });

      const results = input.items.map((item) => {
        const byHashId = hashMap.get(item.contentHash);
        if (byHashId) return { filename: item.filename, contentHash: item.contentHash, status: "duplicate" as const, photoId: byHashId };

        const byName = filenameMap.get(item.filename);
        if (byName && byName.contentHash !== item.contentHash) {
          return { filename: item.filename, contentHash: item.contentHash, status: "changed" as const, photoId: byName.id };
        }

        return { filename: item.filename, contentHash: item.contentHash, status: "new" as const };
      });

      return { results };
    }),

  /**
   * Replace the bytes of existing photos in place. The photoId stays stable so
   * Purchase.photoIds and FaceRecord references keep working. Old S3 objects
   * are deleted, bibNumber/previewKey are reset, and re-processing is fired.
   */
  replaceContents: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        replacements: z.array(
          z.object({
            photoId: z.string(),
            storageKey: z.string(),
            filename: z.string(),
            fileSize: z.number().optional(),
            contentHash: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.replacements.length === 0) return { count: 0 };

      await requireUploadAccess(ctx, input.collectionId);
      const isAdmin = ctx.session.user.role === "ADMIN";

      const { deleteObjects } = await import("~/lib/s3");

      for (const r of input.replacements) {
        const existing = await ctx.db.photo.findUnique({
          where: { id: r.photoId },
          select: { storageKey: true, previewKey: true, collectionId: true, uploaderId: true },
        });
        if (!existing || existing.collectionId !== input.collectionId) continue;
        // Collaborators can only replace their own uploads.
        if (!isAdmin && existing.uploaderId !== ctx.session.user.id) continue;

        const toDelete: string[] = [];
        if (existing.storageKey !== r.storageKey && !existing.storageKey.startsWith("http")) toDelete.push(existing.storageKey);
        if (existing.previewKey) toDelete.push(existing.previewKey);
        if (toDelete.length) await deleteObjects(toDelete).catch(() => undefined);

        // Clear stale face records — re-indexing will insert fresh ones.
        await ctx.db.faceRecord.deleteMany({ where: { photoId: r.photoId } });

        await ctx.db.photo.update({
          where: { id: r.photoId },
          data: {
            storageKey: r.storageKey,
            filename: r.filename,
            fileSize: r.fileSize,
            contentHash: r.contentHash,
            bibNumber: null,
            previewKey: null,
          },
        });
      }

      // Fire re-processing for the replaced photos.
      const ids = input.replacements.map((r) => r.photoId);
      void (async () => {
        const { runOcrLimited, runWatermarkLimited, runFaceIndexLimited } = await import("~/lib/photo-processing");
        for (let i = 0; i < ids.length; i++) {
          const photoId = ids[i]!;
          await new Promise((r) => setTimeout(r, i * 800));
          void runOcrLimited(photoId);
          void runWatermarkLimited(photoId);
          void runFaceIndexLimited(photoId, input.collectionId);
        }
      })();

      return { count: ids.length };
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
      // Admins delete anything; collaborators only their own uploads.
      if (ctx.session.user.role !== "ADMIN" && photo.uploaderId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo podés borrar tus propias fotos" });
      }
      const toRemove: string[] = [];
      if (!photo.storageKey.startsWith("http")) toRemove.push(photo.storageKey);
      if (photo.previewKey) toRemove.push(photo.previewKey);
      if (toRemove.length) await deleteObjects(toRemove).catch((e) => console.error("[photo.delete] S3 delete failed:", e));
      return ctx.db.photo.delete({ where: { id: input.id } });
    }),

  /**
   * Find duplicate photos in a collection (same filename).
   * Returns groups: keep the oldest, list the rest as duplicates to delete.
   */
  listDuplicates: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId },
        orderBy: { createdAt: "asc" },
        select: { id: true, filename: true, storageKey: true, previewKey: true, createdAt: true },
      });

      const grouped = new Map<string, typeof rows>();
      for (const r of rows) {
        const arr = grouped.get(r.filename) ?? [];
        arr.push(r);
        grouped.set(r.filename, arr);
      }

      const groups = await Promise.all(
        Array.from(grouped.values())
          .filter((g) => g.length > 1)
          .map(async (g) => {
            const [keep, ...duplicates] = g;
            const resolveUrl = async (p: typeof g[number]) =>
              await resolveMediaUrl(p.previewKey ?? p.storageKey);
            return {
              filename: keep!.filename,
              keep: { id: keep!.id, url: await resolveUrl(keep!) },
              duplicates: await Promise.all(
                duplicates.map(async (d) => ({ id: d.id, url: await resolveUrl(d) })),
              ),
            };
          }),
      );

      const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicates.length, 0);
      return { groups, totalDuplicates };
    }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({ where: { id: { in: input.ids } } });
      const keys: string[] = [];
      for (const p of photos) {
        if (!p.storageKey.startsWith("http")) keys.push(p.storageKey);
        if (p.previewKey) keys.push(p.previewKey);
      }
      if (keys.length) await deleteObjects(keys).catch((e) => console.error("[photo.bulkDelete] S3 delete failed:", e));
      await ctx.db.photo.deleteMany({ where: { id: { in: input.ids } } });
    }),

  /** IDs of photos in a collection that don't yet have a detected bib — used by the OCR retry worker pool. */
  listWithoutBib: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId, bibNumber: null },
        select: { id: true },
        orderBy: { order: "asc" },
      });
      return photos.map((p) => p.id);
    }),

  /** IDs of photos in a collection that have no watermark preview yet. */
  listUnwatermarked: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId, previewKey: null },
        select: { id: true },
        orderBy: { order: "asc" },
      });
      return photos.map((p) => p.id);
    }),

  /** ALL photo IDs in a collection — used to force-regenerate every watermark preview. */
  listAllIds: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId },
        select: { id: true },
        orderBy: { order: "asc" },
      });
      return photos.map((p) => p.id);
    }),

  setBibNumber: adminProcedure
    .input(z.object({ id: z.string(), bibNumber: z.string().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.db.photo.update({ where: { id: input.id }, data: { bibNumber: input.bibNumber } }),
    ),
});
