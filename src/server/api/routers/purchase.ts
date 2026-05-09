import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { z } from "zod";
import { env } from "~/env";
import { sendPurchaseApprovedEmail } from "~/lib/email";
import { createSignedUrl } from "~/lib/s3";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db as dbInstance } from "~/server/db";

const getMp = async (db: typeof dbInstance) => {
  const setting = await db.setting.findUnique({ where: { key: "mp_access_token" } });
  const token = setting?.value ?? env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MercadoPago no está conectado. Configuralo en /admin/configuracion.");
  return new MercadoPagoConfig({ accessToken: token });
};

export const purchaseRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  createPreference: publicProcedure
    .input(
      z.object({
        collectionId: z.string(),
        photoIds: z.array(z.string()).min(1),
        buyerEmail: z.string().email(),
        buyerName: z.string().optional(),
        buyerLastName: z.string().optional(),
        buyerPhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.findFirstOrThrow({
        where: { id: input.collectionId, isPublished: true },
        select: { title: true, slug: true, pricePerBib: true },
      });

      // Validate all photos exist in this collection
      const photoCount = await ctx.db.photo.count({
        where: { collectionId: input.collectionId, id: { in: input.photoIds } },
      });
      if (photoCount === 0) throw new Error("No se encontraron fotos válidas para comprar.");

      const purchase = await ctx.db.purchase.create({
        data: {
          collectionId: input.collectionId,
          bibNumber: null,
          buyerEmail: input.buyerEmail,
          buyerName: input.buyerName,
          buyerLastName: input.buyerLastName,
          buyerPhone: input.buyerPhone,
          amountPaid: collection.pricePerBib.mul(input.photoIds.length),
          photoIds: JSON.stringify(input.photoIds),
        },
      });

      const preference = await new Preference(await getMp(ctx.db)).create({
        body: {
          items: [{
            id: input.collectionId,
            title: `${input.photoIds.length} foto${input.photoIds.length !== 1 ? "s" : ""} — ${collection.title}`,
            quantity: input.photoIds.length,
            unit_price: Number(collection.pricePerBib),
            currency_id: "ARS",
          }],
          payer: {
            email: input.buyerEmail,
            name: input.buyerName,
            surname: input.buyerLastName,
            phone: input.buyerPhone ? { number: input.buyerPhone } : undefined,
          },
          ...(env.NEXT_PUBLIC_BASE_URL && !env.NEXT_PUBLIC_BASE_URL.includes("localhost")
            ? {
                back_urls: {
                  success: `${env.NEXT_PUBLIC_BASE_URL}/descarga/pendiente?purchase=${purchase.id}`,
                  failure: `${env.NEXT_PUBLIC_BASE_URL}/colecciones/${collection.slug}`,
                  pending: `${env.NEXT_PUBLIC_BASE_URL}/descarga/pendiente?purchase=${purchase.id}`,
                },
                auto_return: "approved" as const,
                notification_url: `${env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
              }
            : {}),
          external_reference: purchase.id,
        },
      });

      await ctx.db.purchase.update({
        where: { id: purchase.id },
        data: { mercadopagoPreferenceId: preference.id },
      });

      return {
        preferenceId: preference.id,
        initPoint: preference.init_point,
      };
    }),

  accessByEmail: publicProcedure
    .input(z.object({ email: z.string().email(), collectionId: z.string(), bibNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findFirst({
        where: {
          buyerEmail: { equals: input.email, mode: "insensitive" },
          collectionId: input.collectionId,
          status: "APPROVED",
          downloadToken: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { downloadToken: true },
      });
      return purchase?.downloadToken ?? null;
    }),

  getDownloadInfo: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findUnique({
        where: { downloadToken: input.token },
        include: {
          collection: { select: { title: true } },
        },
      });

      if (!purchase) return null;
      if (purchase.status !== "APPROVED") return null;

      // Fetch photos: by stored IDs if available, otherwise fall back to bib lookup
      const photos = await ctx.db.photo.findMany({
        where: purchase.photoIds
          ? { id: { in: JSON.parse(purchase.photoIds) as string[] } }
          : {
              collectionId: purchase.collectionId,
              ...(purchase.bibNumber
                ? { bibNumber: { contains: purchase.bibNumber, mode: "insensitive" } }
                : {}),
            },
        orderBy: { order: "asc" },
      });

      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const url = await createSignedUrl(photo.storageKey, 3600 * 24);
          return { id: photo.id, filename: photo.filename, url };
        }),
      );

      // Suggest other published collections with the same bib that haven't been purchased
      const suggestions = purchase.bibNumber
        ? await ctx.db.collection.findMany({
            where: {
              isPublished: true,
              id: { not: purchase.collectionId },
              photos: { some: { bibNumber: purchase.bibNumber } },
              purchases: {
                none: {
                  buyerEmail: purchase.buyerEmail,
                  bibNumber: purchase.bibNumber,
                  status: "APPROVED",
                },
              },
            },
            select: {
              id: true,
              slug: true,
              title: true,
              coverUrl: true,
              pricePerBib: true,
              eventDate: true,
              _count: { select: { photos: { where: { bibNumber: purchase.bibNumber } } } },
            },
          })
        : [];

      return {
        bibNumber: purchase.bibNumber,
        collectionTitle: purchase.collection.title,
        buyerName: purchase.buyerName,
        isPublic: purchase.isPublic,
        photos: photoUrls.filter((p): p is { id: string; filename: string; url: string } => p.url !== null),
        suggestions: suggestions.map((s) => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          coverUrl: s.coverUrl,
          pricePerBib: Number(s.pricePerBib),
          eventDate: s.eventDate,
          photoCount: s._count.photos,
        })),
      };
    }),

  makePublic: publicProcedure
    .input(z.object({ token: z.string(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findFirst({
        where: { downloadToken: input.token, status: "APPROVED" },
      });
      if (!purchase) throw new Error("Invalid token");
      await ctx.db.purchase.update({
        where: { id: purchase.id },
        data: { isPublic: input.isPublic },
      });
      return { isPublic: input.isPublic };
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────

  adminList: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "REFUNDED"]).optional(),
        collectionId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        buyerEmail: { not: "public@system" },
        ...(input.status ? { status: input.status } : {}),
        ...(input.collectionId ? { collectionId: input.collectionId } : {}),
      };
      const [items, total] = await Promise.all([
        ctx.db.purchase.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: { collection: { select: { title: true } } },
        }),
        ctx.db.purchase.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / input.limit) };
    }),

  manualDeliver: protectedProcedure
    .input(z.object({
      collectionId: z.string(),
      bibNumber: z.string().min(1),
      buyerEmail: z.string().email(),
      buyerName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [collection, photoCount] = await Promise.all([
        ctx.db.collection.findFirstOrThrow({
          where: { id: input.collectionId },
          select: { title: true },
        }),
        ctx.db.photo.count({
          where: { collectionId: input.collectionId, bibNumber: { contains: input.bibNumber, mode: "insensitive" } },
        }),
      ]);

      const token = crypto.randomUUID();
      await ctx.db.purchase.create({
        data: {
          collectionId: input.collectionId,
          bibNumber: input.bibNumber,
          buyerEmail: input.buyerEmail,
          buyerName: input.buyerName ?? null,
          amountPaid: 0,
          status: "APPROVED",
          downloadToken: token,
          downloadTokenExpires: null,
        },
      });

      void sendPurchaseApprovedEmail({
        to: input.buyerEmail,
        buyerName: input.buyerName ?? null,
        bibNumber: input.bibNumber,
        collectionTitle: collection.title,
        downloadToken: token,
        photoCount,
      });

      return { downloadToken: token, photoCount };
    }),

  searchStats: protectedProcedure
    .input(z.object({ collectionId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const base = input?.collectionId ? { collectionId: input.collectionId } : {};
      const [total, bib, face] = await Promise.all([
        ctx.db.searchLog.count({ where: base }),
        ctx.db.searchLog.count({ where: { ...base, type: "bib" } }),
        ctx.db.searchLog.count({ where: { ...base, type: "face" } }),
      ]);
      return { total, bib, face };
    }),

  eventsSummary: protectedProcedure.query(async ({ ctx }) => {
    const [collections, grouped] = await Promise.all([
      ctx.db.collection.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, slug: true },
      }),
      ctx.db.purchase.groupBy({
        by: ["collectionId", "status"],
        where: { buyerEmail: { not: "public@system" } },
        _count: { _all: true },
        _sum: { amountPaid: true },
      }),
    ]);
    const byCol = new Map<string, { total: number; approved: number; pending: number; revenue: number }>();
    for (const g of grouped) {
      const cur = byCol.get(g.collectionId) ?? { total: 0, approved: 0, pending: 0, revenue: 0 };
      cur.total += g._count._all;
      if (g.status === "APPROVED") {
        cur.approved += g._count._all;
        cur.revenue += Number(g._sum.amountPaid ?? 0);
      }
      if (g.status === "PENDING") cur.pending += g._count._all;
      byCol.set(g.collectionId, cur);
    }
    return collections.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      ...(byCol.get(c.id) ?? { total: 0, approved: 0, pending: 0, revenue: 0 }),
    }));
  }),

  adminStats: protectedProcedure
    .input(z.object({ collectionId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const base = {
        buyerEmail: { not: "public@system" as const },
        ...(input?.collectionId ? { collectionId: input.collectionId } : {}),
      };
      const [total, approved, pending, revenueAgg] = await Promise.all([
        ctx.db.purchase.count({ where: base }),
        ctx.db.purchase.count({ where: { ...base, status: "APPROVED" } }),
        ctx.db.purchase.count({ where: { ...base, status: "PENDING" } }),
        ctx.db.purchase.aggregate({
          where: { ...base, status: "APPROVED" },
          _sum: { amountPaid: true },
        }),
      ]);
      return {
        total,
        approved,
        pending,
        totalRevenue: Number(revenueAgg._sum.amountPaid ?? 0),
      };
    }),

  manualApprove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID();
      const updated = await ctx.db.purchase.update({
        where: { id: input.id },
        data: { status: "APPROVED", downloadToken: token, downloadTokenExpires: null },
        include: { collection: { select: { title: true } } },
      });
      const photoCount = await ctx.db.photo.count({
        where: { collectionId: updated.collectionId, bibNumber: updated.bibNumber ?? undefined },
      });
      void sendPurchaseApprovedEmail({
        to: updated.buyerEmail,
        buyerName: updated.buyerName,
        bibNumber: updated.bibNumber,
        collectionTitle: updated.collection.title,
        downloadToken: token,
        photoCount,
      });
      return updated;
    }),

  /**
   * Reconcile our purchase records with MercadoPago.
   * Fetches the last N days of payments from MP and updates any purchase
   * whose status is out of sync (e.g. webhook failed during a Supabase outage).
   * Idempotent: re-running is safe and won't duplicate emails.
   */
  reconcileWithMercadoPago: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(7) }))
    .mutation(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      // Pull every purchase in the window that's NOT already terminal-approved
      // OR that has no MP payment id yet (webhook never landed).
      const candidates = await ctx.db.purchase.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { status: "PENDING" },
            { mercadopagoPaymentId: null },
          ],
        },
        include: { collection: { select: { title: true } } },
      });

      if (candidates.length === 0) {
        return { checked: 0, updated: 0, approvedNow: 0, errors: [] as string[], details: [] as Array<{ id: string; from: string; to: string }> };
      }

      const mp = await getMp(ctx.db);
      const paymentClient = new Payment(mp);

      const statusMap: Record<string, "APPROVED" | "REJECTED" | "REFUNDED" | "PENDING"> = {
        approved: "APPROVED",
        rejected: "REJECTED",
        refunded: "REFUNDED",
        cancelled: "REJECTED",
        in_process: "PENDING",
        pending: "PENDING",
      };

      const errors: string[] = [];
      const details: Array<{ id: string; from: string; to: string }> = [];
      let approvedNow = 0;
      let updated = 0;

      for (const purchase of candidates) {
        try {
          // Search MP for any payment whose external_reference is this purchase id
          const result = await paymentClient.search({
            options: { external_reference: purchase.id, limit: 5 },
          });
          const payments = (result.results ?? []) as unknown as Array<{
            id: number | string;
            status: string;
            external_reference?: string;
            order?: { id?: string };
          }>;

          if (payments.length === 0) continue;

          // Take the most recent approved/rejected/refunded payment if any,
          // otherwise the most recent of any status.
          const sorted = [...payments].sort((a, b) => Number(b.id) - Number(a.id));
          const best = sorted.find((p) => ["approved", "refunded", "rejected"].includes(p.status)) ?? sorted[0]!;

          const newStatus = statusMap[best.status] ?? "PENDING";
          if (newStatus === purchase.status && purchase.mercadopagoPaymentId === String(best.id)) continue;

          const needsToken = newStatus === "APPROVED" && !purchase.downloadToken;
          const token = needsToken ? crypto.randomUUID() : undefined;

          await ctx.db.purchase.update({
            where: { id: purchase.id },
            data: {
              status: newStatus,
              mercadopagoPaymentId: String(best.id),
              mercadopagoOrderId: best.order?.id ? String(best.order.id) : undefined,
              ...(token ? { downloadToken: token, downloadTokenExpires: null } : {}),
            },
          });
          updated++;
          details.push({ id: purchase.id, from: purchase.status, to: newStatus });

          // Send email only if we just transitioned to APPROVED and didn't have
          // a token before (= email was never sent).
          if (newStatus === "APPROVED" && token) {
            approvedNow++;
            const photoCount = purchase.photoIds
              ? (JSON.parse(purchase.photoIds) as string[]).length
              : await ctx.db.photo.count({
                  where: {
                    collectionId: purchase.collectionId,
                    ...(purchase.bibNumber ? { bibNumber: { contains: purchase.bibNumber, mode: "insensitive" } } : {}),
                  },
                });
            void sendPurchaseApprovedEmail({
              to: purchase.buyerEmail,
              buyerName: purchase.buyerName,
              bibNumber: purchase.bibNumber,
              collectionTitle: purchase.collection.title,
              downloadToken: token,
              photoCount,
            });
          }
        } catch (err) {
          errors.push(`${purchase.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return { checked: candidates.length, updated, approvedNow, errors, details };
    }),
});
