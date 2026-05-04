import { z } from "zod";
import { getAdminClient, createSignedUrl } from "~/lib/supabase/admin";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB

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
          const url = await createSignedUrl(key, 3600);
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
          const url = await createSignedUrl(key, 3600);
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
          const url = await createSignedUrl(key, 3600);
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
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.photo.count({ where: { collectionId: input.collectionId } });
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
              order: count + i,
            },
            select: { id: true },
          }),
        ),
      );
      const ids = created.map((c) => c.id);

      // Kick off OCR + watermark + face-index directly in the Node.js process.
      // No HTTP — calls shared lib functions. Runs in background after response is sent.
      void (async () => {
        const { runOcr, runWatermark, runFaceIndex } = await import("~/lib/photo-processing");
        for (let i = 0; i < ids.length; i++) {
          const photoId = ids[i]!;
          // Stagger all photos (including first) to avoid DB connection pool exhaustion
          await new Promise((r) => setTimeout(r, i * 400));
          void runOcr(photoId);
          void runWatermark(photoId);
          void runFaceIndex(photoId, input.collectionId);
        }
      })();

      return { ids };
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
      if (client) {
        const toRemove: string[] = [];
        if (!photo.storageKey.startsWith("http")) toRemove.push(photo.storageKey);
        if (photo.previewKey) toRemove.push(photo.previewKey);
        if (toRemove.length) await client.storage.from("photos").remove(toRemove);
      }
      return ctx.db.photo.delete({ where: { id: input.id } });
    }),

  /**
   * Find duplicate photos in a collection (same filename).
   * Returns groups: keep the oldest, list the rest as duplicates to delete.
   */
  listDuplicates: protectedProcedure
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
              await createSignedUrl(p.previewKey ?? p.storageKey, 3600);
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

  /** IDs of photos in a collection that have no watermark preview yet. */
  listUnwatermarked: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db.photo.findMany({
        where: { collectionId: input.collectionId, previewKey: null },
        select: { id: true },
        orderBy: { order: "asc" },
      });
      return photos.map((p) => p.id);
    }),

  setBibNumber: protectedProcedure
    .input(z.object({ id: z.string(), bibNumber: z.string().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.db.photo.update({ where: { id: input.id }, data: { bibNumber: input.bibNumber } }),
    ),
});
