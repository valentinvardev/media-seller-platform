import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { sendPurchaseApprovedEmail } from "~/lib/email";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
