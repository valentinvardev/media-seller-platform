import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { type PrismaClient } from "../../../../generated/prisma";
import { env } from "~/env";
import { createSignedUrl } from "~/lib/supabase/admin";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const getMp = async (db: PrismaClient) => {
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
        bibNumber: z.string(),
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

      const purchase = await ctx.db.purchase.create({
        data: {
          collectionId: input.collectionId,
          bibNumber: input.bibNumber,
          buyerEmail: input.buyerEmail,
          buyerName: input.buyerName,
          buyerLastName: input.buyerLastName,
          buyerPhone: input.buyerPhone,
          amountPaid: collection.pricePerBib,
        },
      });

      const preference = await new Preference(await getMp(ctx.db)).create({
        body: {
          items: [
            {
              id: `${input.collectionId}-${input.bibNumber}`,
              title: `Fotos dorsal #${input.bibNumber} — ${collection.title}`,
              quantity: 1,
              unit_price: Number(collection.pricePerBib),
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
    .input(z.object({ email: z.string().email(), collectionId: z.string(), bibNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findFirst({
        where: {
          buyerEmail: { equals: input.email, mode: "insensitive" },
          collectionId: input.collectionId,
          bibNumber: input.bibNumber,
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
          collection: { select: { title: true } },
        },
      });

      if (!purchase) return null;
      if (purchase.status !== "APPROVED") return null;
      if (
        !purchase.isPublic &&
        purchase.downloadTokenExpires &&
        purchase.downloadTokenExpires < new Date()
      ) return null;

      // Fetch all photos for this bib in this collection
      const photos = await ctx.db.photo.findMany({
        where: {
          collectionId: purchase.collectionId,
          bibNumber: purchase.bibNumber ?? undefined,
        },
        orderBy: { order: "asc" },
      });

      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const url = await createSignedUrl(photo.storageKey, 3600 * 24);
          return { id: photo.id, filename: photo.filename, url };
        }),
      );

      return {
        bibNumber: purchase.bibNumber,
        collectionTitle: purchase.collection.title,
        buyerName: purchase.buyerName,
        isPublic: purchase.isPublic,
        photos: photoUrls.filter((p): p is { id: string; filename: string; url: string } => p.url !== null),
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
          include: { collection: { select: { title: true } } },
        }),
        ctx.db.purchase.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / input.limit) };
    }),

  manualApprove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 72);
      return ctx.db.purchase.update({
        where: { id: input.id },
        data: { status: "APPROVED", downloadToken: token, downloadTokenExpires: expires },
      });
    }),
});
