import { NextResponse } from "next/server";
import { sendPurchaseApprovedEmail } from "~/lib/email";

// Solo disponible en desarrollo — eliminar antes de producción
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  await sendPurchaseApprovedEmail({
    to: "valentinvardev@gmail.com", // cambiá por tu email si querés
    buyerName: "Valentin",
    bibNumber: "1234",
    collectionTitle: "Maratón Buenos Aires 2025",
    downloadToken: "token-de-prueba-abc123",
    photoCount: 8,
  });

  return NextResponse.json({ ok: true, message: "Email enviado" });
}
