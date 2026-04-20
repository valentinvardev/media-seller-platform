import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { sendPurchaseApprovedEmail } from "~/lib/email";

function verifyWebhookSignature(request: NextRequest, rawBody: string): boolean {
  const { env } = require("~/env") as { env: { MERCADOPAGO_WEBHOOK_SECRET?: string } };
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

    // Fetch payment details from MercadoPago
    const { env } = await import("~/env");
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      },
    );

    if (!mpResponse.ok) {
      return NextResponse.json({ received: true });
    }

    const payment = await mpResponse.json() as {
      id: number;
      status: string;
      external_reference?: string;
      order?: { id?: string };
    };

    const externalRef = payment.external_reference;
    if (!externalRef) return NextResponse.json({ received: true });

    const purchaseIds = externalRef.split(",").filter(Boolean);

    const statusMap: Record<string, string> = {
      approved: "APPROVED",
      rejected: "REJECTED",
      refunded: "REFUNDED",
    };
    const newStatus = statusMap[payment.status] ?? "PENDING";

    for (const purchaseId of purchaseIds) {
      const token = newStatus === "APPROVED" ? crypto.randomUUID() : undefined;

      const updated = await db.purchase.update({
        where: { id: purchaseId },
        data: {
          mercadopagoPaymentId: String(payment.id),
          mercadopagoOrderId: payment.order?.id ? String(payment.order.id) : undefined,
          status: newStatus as "APPROVED" | "REJECTED" | "REFUNDED" | "PENDING",
          ...(token ? { downloadToken: token, downloadTokenExpires: null } : {}),
        },
      });

      if (newStatus === "APPROVED" && token) {
        const collection = await db.collection.findUnique({
          where: { id: updated.collectionId },
          select: { title: true },
        });
        const photoCount = await db.photo.count({
          where: {
            collectionId: updated.collectionId,
            ...(updated.bibNumber ? { bibNumber: { contains: updated.bibNumber, mode: "insensitive" } } : {}),
          },
        });
        void sendPurchaseApprovedEmail({
          to: updated.buyerEmail,
          buyerName: updated.buyerName,
          bibNumber: updated.bibNumber,
          collectionTitle: collection?.title ?? "",
          downloadToken: token,
          photoCount,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
