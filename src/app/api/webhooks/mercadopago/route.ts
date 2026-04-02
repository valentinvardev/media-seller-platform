import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
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

    const purchaseId = payment.external_reference;
    if (!purchaseId) return NextResponse.json({ received: true });

    const statusMap: Record<string, string> = {
      approved: "APPROVED",
      rejected: "REJECTED",
      refunded: "REFUNDED",
    };

    const newStatus = statusMap[payment.status] ?? "PENDING";

    const updateData: Record<string, unknown> = {
      mercadopagoPaymentId: String(payment.id),
      mercadopagoOrderId: payment.order?.id ? String(payment.order.id) : undefined,
      status: newStatus,
    };

    if (newStatus === "APPROVED") {
      updateData.downloadToken = crypto.randomUUID();
      updateData.downloadTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 72);
    }

    await db.purchase.update({
      where: { id: purchaseId },
      data: updateData,
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
