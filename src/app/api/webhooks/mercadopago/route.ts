import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "~/server/db";
import { sendPurchaseApprovedEmail } from "~/lib/email";
import { env } from "~/env";

async function getMpToken(): Promise<string | null> {
  const setting = await db.setting.findUnique({ where: { key: "mp_access_token" } });
  return setting?.value ?? env.MERCADOPAGO_ACCESS_TOKEN ?? null;
}

function verifyWebhookSignature(request: NextRequest, rawBody: string): boolean {
  const secret = env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Skip if not configured

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;

  const tsMatch = /ts=([^,]+)/.exec(signature);
  const v1Match = /v1=([^,]+)/.exec(signature);
  if (!tsMatch?.[1] || !v1Match?.[1]) return false;

  const ts = tsMatch[1];
  const expectedHash = v1Match[1];
  const manifest = `id:${requestId};request-id:${requestId};ts:${ts};${rawBody}`;
  const calculated = createHmac("sha256", secret).update(manifest).digest("hex");

  return calculated === expectedHash;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (!verifyWebhookSignature(request, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      type?: string;
      data?: { id?: string };
    };

    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data.id;

    const mpToken = await getMpToken();
    if (!mpToken) return NextResponse.json({ received: true });

    const paymentClient = new Payment(new MercadoPagoConfig({ accessToken: mpToken }));
    const payment = await paymentClient.get({ id: paymentId });

    const externalRef = payment.external_reference;
    if (!externalRef) return NextResponse.json({ received: true });

    const purchaseIds = externalRef.split(",").filter(Boolean);

    const statusMap: Record<string, string> = {
      approved: "APPROVED",
      rejected: "REJECTED",
      refunded: "REFUNDED",
      cancelled: "REJECTED",
      // A chargeback must revoke access — mapping it to PENDING (the old
      // default) left the download link alive after the buyer disputed.
      charged_back: "REFUNDED",
    };
    const newStatus = statusMap[payment.status ?? ""] ?? "PENDING";

    for (const purchaseId of purchaseIds) {
      const mpFields = {
        mercadopagoPaymentId: String(payment.id),
        mercadopagoOrderId: payment.order?.id ? String(payment.order.id) : undefined,
      };

      if (newStatus !== "APPROVED") {
        if (newStatus === "PENDING") {
          // Webhooks can arrive out of order — a late "in_process" notification
          // must never downgrade an already-APPROVED purchase and kill its
          // download access. Only sync the MP ids.
          await db.purchase.update({ where: { id: purchaseId }, data: mpFields });
        } else {
          // REJECTED / REFUNDED do override APPROVED (refunds revoke access).
          await db.purchase.update({
            where: { id: purchaseId },
            data: { ...mpFields, status: newStatus as "REJECTED" | "REFUNDED" },
          });
        }
        continue;
      }

      // Atomic transition: only generate token + send email if not already APPROVED.
      // updateMany returns count=1 if this call won the "first approval", 0 if another
      // request already approved it (handles MP webhook retries and races).
      const token = crypto.randomUUID();
      const result = await db.purchase.updateMany({
        where: { id: purchaseId, status: { not: "APPROVED" } },
        data: {
          ...mpFields,
          status: "APPROVED",
          downloadToken: token,
          downloadTokenExpires: null,
        },
      });

      if (result.count === 0) {
        // Already approved by a previous webhook — keep MP IDs in sync, no email.
        await db.purchase.update({ where: { id: purchaseId }, data: mpFields });
        continue;
      }

      const purchase = await db.purchase.findUnique({
        where: { id: purchaseId },
        include: { collection: { select: { title: true } } },
      });
      if (!purchase) continue;

      const photoCount = purchase.photoIds
        ? (JSON.parse(purchase.photoIds) as string[]).length
        : await db.photo.count({
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

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
