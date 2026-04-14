import { Resend } from "resend";
import { env } from "~/env";

const getResend = () => {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
};

const FROM = env.RESEND_FROM_EMAIL ?? "ALTAFOTO <noreply@altafoto.com.ar>";
const BASE_URL = env.NEXT_PUBLIC_BASE_URL ?? "https://altafoto.com.ar";

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
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${BASE_URL}/logo-altafoto.png" alt="ALTAFOTO" height="38" style="height:38px;width:auto;display:block;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

              <!-- Hero -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#003D7A 0%,#0057A8 60%,#1a7fd4 100%);padding:36px 36px 32px;">
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">📸 ¡Ya están disponibles!</p>
                    <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;">
                      ${collectionTitle}
                    </h1>
                    ${bib ? `<p style="margin:0;color:rgba(255,255,255,0.7);font-size:15px;font-weight:600;">Dorsal ${bib}</p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 12px;">

                    <p style="margin:0 0 6px;color:#111827;font-size:17px;font-weight:700;">
                      ¡Hola, ${name}! 👋
                    </p>
                    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                      Capturamos ${photoText} en <strong>${collectionTitle}</strong> y ya las tenés disponibles para ver y descargar en alta resolución.
                    </p>
                    <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">
                      Entrá a tu galería personal, revisalas, y bajate las que más te gusten. Son todas tuyas.
                    </p>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#0057A8,#003D7A);border-radius:14px;box-shadow:0 4px 16px rgba(0,87,168,0.35);">
                          <a href="${downloadUrl}" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.01em;">
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
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="background:#f0f9ff;border-radius:12px;border-left:4px solid #0057A8;padding:14px 18px;">
                          <p style="margin:0 0 2px;color:#0057A8;font-size:13px;font-weight:700;">🔗 Tu link es permanente</p>
                          <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">No expira nunca. Guardá este email para acceder a tus fotos cuando quieras, desde cualquier dispositivo.</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:#f0fdf4;border-radius:12px;border-left:4px solid #16a34a;padding:14px 18px;">
                          <p style="margin:0 0 2px;color:#15803d;font-size:13px;font-weight:700;">📥 Descarga en HD</p>
                          <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">Todas las fotos están en alta resolución sin marca de agua, listas para imprimir o compartir.</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;line-height:1.6;">
                      ¿Tenés alguna duda o problema? Respondé este email y te ayudamos enseguida.
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                      ¡Gracias por confiar en ALTAFOTO! 🏃
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">
                ALTAFOTO · Fotografía deportiva en Argentina
              </p>
              <a href="${BASE_URL}" style="color:#94a3b8;font-size:11px;text-decoration:none;">${BASE_URL.replace("https://", "")}</a>
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
      subject: `📸 Tus fotos de ${bib} están listas — ALTAFOTO`,
      html: purchaseApprovedHtml({ buyerName, bibNumber, collectionTitle, downloadUrl, photoCount }),
    });
  } catch (err) {
    console.error("[Resend] Error sending email:", err);
  }
}
