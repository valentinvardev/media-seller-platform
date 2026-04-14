import { NextResponse } from "next/server";
import { sendPurchaseApprovedEmail } from "~/lib/email";

export async function GET() {

  await sendPurchaseApprovedEmail({
    to: "gatucarpinlila@gmail.com",
    buyerName: "Valentin",
    bibNumber: "1234",
    collectionTitle: "Maratón Buenos Aires 2025",
    downloadToken: "token-de-prueba-abc123",
    photoCount: 8,
  });

  return NextResponse.json({ ok: true, message: "Email enviado" });
}
