import { Resend } from "resend";
import { env } from "~/env";

const getResend = () => {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
};

const FROM = env.RESEND_FROM_EMAIL ?? "ALTAFOTO <noreply@altafoto.com.ar>";
const BASE_URL = env.NEXT_PUBLIC_BASE_URL ?? "https://altafoto.com.ar";
const BCC_EMAIL = "valentinvarela0508@gmail.com";

function purchaseApprovedHtml({
  buyerName,
  bibNumber,
  collectionTitle,
  downloadUrl,
  photoCount,
}: {
  buyerName: string | null;
  bibNumber: string | null;
  collectionTitle: string;
  downloadUrl: string;
  photoCount?: number;
}) {
  const name = buyerName ?? "corredor";
  const bib = bibNumber ? `#${bibNumber}` : "";
  const photoText = photoCount
    ? `${photoCount} foto${photoCount !== 1 ? "s" : ""} tuya${photoCount !== 1 ? "s" : ""}`
    : "tus fotos";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tus fotos están listas — ALTAFOTO</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo dentro del recuadro -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${BASE_URL}/logo-altafoto.png" alt="ALTAFOTO" height="40" style="height:40px;width:auto;display:block;" />
            </td>
          </tr>

          <!-- Hero banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#003D7A 0%,#0057A8 60%,#1a7fd4 100%);border-radius:16px 16px 0 0;padding:32px 36px 28px;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">📸 ¡Ya están disponibles!</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;">
                ${collectionTitle}
              </h1>
              ${bib ? `<p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;font-weight:600;">Dorsal ${bib}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 36px 32px;border:1px solid #f1f5f9;border-top:none;">

              <p style="margin:0 0 6px;color:#111827;font-size:17px;font-weight:700;">
                ¡Hola, ${name}! 👋
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
                Capturamos ${photoText} en <strong>${collectionTitle}</strong> y ya las tenés disponibles para ver y descargar en alta resolución.
              </p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">
                Entrá a tu galería, revisalas, y bajate las que más te gusten. Son todas tuyas.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0057A8,#003D7A);border-radius:12px;box-shadow:0 4px 14px rgba(0,87,168,0.3);">
                    <a href="${downloadUrl}" style="display:inline-block;padding:15px 34px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">
                      Ver mis fotos &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="border-top:1px solid #f1f5f9;"></td></tr>
              </table>

              <!-- Info boxes -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td style="background:#f0f9ff;border-radius:10px;border-left:3px solid #0057A8;padding:12px 16px;">
                    <p style="margin:0 0 2px;color:#0057A8;font-size:12px;font-weight:700;">🔗 Tu link es permanente</p>
                    <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">No expira nunca. Guardá este email para acceder a tus fotos cuando quieras.</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#f0fdf4;border-radius:10px;border-left:3px solid #16a34a;padding:12px 16px;">
                    <p style="margin:0 0 2px;color:#15803d;font-size:12px;font-weight:700;">📥 Alta resolución sin marca de agua</p>
                    <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">Listas para imprimir o compartir.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                ¿Alguna duda? Respondé este email y te ayudamos. ¡Gracias por confiar en ALTAFOTO! 🏃
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 3px;color:#cbd5e1;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">
                ALTAFOTO · Fotografía deportiva en Argentina
              </p>
              <a href="${BASE_URL}" style="color:#cbd5e1;font-size:11px;text-decoration:none;">${BASE_URL.replace("https://", "")}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPurchaseApprovedEmail({
  to,
  buyerName,
  bibNumber,
  collectionTitle,
  downloadToken,
  photoCount,
}: {
  to: string;
  buyerName: string | null;
  bibNumber: string | null;
  collectionTitle: string;
  downloadToken: string;
  photoCount?: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const downloadUrl = `${BASE_URL}/descarga/${downloadToken}`;
  const bib = bibNumber ? `dorsal #${bibNumber}` : collectionTitle;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      bcc: BCC_EMAIL,
      subject: `📸 Tus fotos de ${bib} están listas — ALTAFOTO`,
      html: purchaseApprovedHtml({ buyerName, bibNumber, collectionTitle, downloadUrl, photoCount }),
    });
  } catch (err) {
    console.error("[Resend] Error sending email:", err);
  }
}
