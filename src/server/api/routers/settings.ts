import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { sendPurchaseApprovedEmail } from "~/lib/email";

export const settingsRouter = createTRPCRouter({
  getMpStatus: adminProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.setting.findUnique({
      where: { key: "mp_access_token" },
    });
    const userId = await ctx.db.setting.findUnique({
      where: { key: "mp_user_id" },
    });
    return {
      connected: !!setting?.value,
      userId: userId?.value ?? null,
    };
  }),

  disconnectMp: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db.setting.deleteMany({
      where: { key: { in: ["mp_access_token", "mp_refresh_token", "mp_user_id"] } },
    });
    return { ok: true };
  }),

  resendPurchaseEmail: adminProcedure
    .input(z.object({ purchaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findUnique({
        where: { id: input.purchaseId },
        include: { collection: { select: { title: true } } },
      });
      if (!purchase || purchase.status !== "APPROVED" || !purchase.downloadToken) {
        throw new Error("Compra no aprobada o sin token");
      }
      // Explicit photoIds beat the bib fallback; bibNumber: undefined would
      // count every photo in the collection for cart purchases.
      let photoCount: number | undefined;
      if (purchase.photoIds) {
        try { photoCount = (JSON.parse(purchase.photoIds) as string[]).length; } catch { /* leave undefined */ }
      } else if (purchase.bibNumber) {
        photoCount = await ctx.db.photo.count({
          where: { collectionId: purchase.collectionId, bibNumber: { contains: purchase.bibNumber, mode: "insensitive" } },
        });
      }
      await sendPurchaseApprovedEmail({
        to: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        bibNumber: purchase.bibNumber,
        collectionTitle: purchase.collection.title,
        downloadToken: purchase.downloadToken,
        photoCount,
      });
      return { ok: true };
    }),
});
