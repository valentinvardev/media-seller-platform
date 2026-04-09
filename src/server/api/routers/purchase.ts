import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { env } from "~/env";
import { createSignedUrl } from "~/lib/supabase/admin";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const getMp = () => {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) throw new Error("MERCADOPAGO_ACCESS_TOKEN not set");
  return new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN });
};

export const purchaseRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────────────────

  createPreference: publicProcedure
    .input(
      z.object({
        folderId: z.string(),
        buyerEmail: z.string().email(),
        buyerName: z.string().optional(),
        buyerLastName: z.string().optional(),
        buyerPhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.folder.findFirstOrThrow({
        where: { id: input.folderId, isPublished: true },
        include: { collection: { select: { title: true, slug: true } } },
      });

      const purchase = await ctx.db.purchase.create({
        data: {
          folderId: input.folderId,
          buyerEmail: input.buyerEmail,
          buyerName: input.buyerName,
          buyerLastName: input.buyerLastName,
          buyerPhone: input.buyerPhone,
          amountPaid: folder.price,
        },
      });

      const preference = await new Preference(getMp()).create({
        body: {
          items: [
            {
              id: folder.id,
              title: `Carpeta #${folder.number} - ${folder.collection.title}`,
              quantity: 1,
              unit_price: Number(folder.price),
              currency_id: "ARS",
            },
          ],
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
                  failure: `${env.NEXT_PUBLIC_BASE_URL}/colecciones/${folder.collection.slug}`,
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

  getPublicFolderToken: publicProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.folder.findFirst({
        where: { id: input.folderId, isPublished: true, isPublic: true },
      });
      if (!folder) throw new Error("Folder not found or not public");

      // Reuse existing public system token if one exists
      const existing = await ctx.db.purchase.findFirst({
        where: { folderId: input.folderId, buyerEmail: "public@system", status: "APPROVED" },
        select: { downloadToken: true },
      });
      if (existing?.downloadToken) return existing.downloadToken;

      // Create a permanent public access token
      const token = crypto.randomUUID();
      await ctx.db.purchase.create({
        data: {
          folderId: input.folderId,
          buyerEmail: "public@system",
          amountPaid: 0,
          status: "APPROVED",
          downloadToken: token,
          isPublic: true,
        },
      });
      return token;
    }),

  accessByEmail: publicProcedure
    .input(z.object({ email: z.string().email(), folderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findFirst({
        where: {
          buyerEmail: { equals: input.email, mode: "insensitive" },
          folderId: input.folderId,
          status: "APPROVED",
          downloadToken: { not: null },
        },
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
          folder: {
            include: {
              collection: { select: { title: true } },
              photos: { orderBy: { order: "asc" } },
            },
          },
        },
      });

      if (!purchase) return null;
      if (purchase.status !== "APPROVED") return null;
      if (!purchase.isPublic && purchase.downloadTokenExpires && purchase.downloadTokenExpires < new Date()) {
        return null;
      }

      const photoUrls = await Promise.all(
        purchase.folder.photos.map(async (photo) => {
          const url = await createSignedUrl(photo.storageKey, 3600 * 24);
          return { id: photo.id, filename: photo.filename, url };
        }),
      );

      return {
        folderNumber: purchase.folder.number,
        collectionTitle: purchase.folder.collection.title,
        buyerName: purchase.buyerName,
        isPublic: purchase.isPublic,
        photos: photoUrls.filter((p) => p.url !== null),
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
        status: z
          .enum(["PENDING", "APPROVED", "REJECTED", "REFUNDED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        buyerEmail: { not: "public@system" },
        ...(input.status ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        ctx.db.purchase.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            folder: {
              include: { collection: { select: { title: true } } },
            },
          },
        }),
        ctx.db.purchase.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / input.limit) };
    }),

  adminGetById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.purchase.findUnique({
        where: { id: input.id },
        include: {
          folder: {
            include: { collection: { select: { title: true } } },
          },
        },
      }),
    ),

  manualApprove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 72);
      return ctx.db.purchase.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          downloadToken: token,
          downloadTokenExpires: expires,
        },
      });
    }),
});
