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
  const name = buyerName ?? "Corredor";
  const bib = bibNumber ? `#${bibNumber}` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tus fotos están listas</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="${BASE_URL}/logo-altafoto.png" alt="ALTAFOTO" height="36" style="height:36px;width:auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;">

              <!-- Hero banner -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0057A8,#003D7A);padding:32px 36px 28px;">
                    <p style="margin:0 0 6px;color:rgba(255,255,255,0.65);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">¡Tus fotos están listas!</p>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.2;">
                      ${collectionTitle}${bib ? ` · Dorsal ${bib}` : ""}
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px;">
                    <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hola, <strong>${name}</strong></p>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                      Tu compra fue aprobada.${photoCount ? ` Tenés <strong>${photoCount} foto${photoCount !== 1 ? "s" : ""}</strong> disponibles para descargar en alta resolución.` : " Tus fotos están disponibles para descargar en alta resolución."}
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#0057A8,#003D7A);border-radius:12px;">
                          <a href="${downloadUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">
                            Ver y descargar mis fotos →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;padding:16px 20px;">
                          <p style="margin:0 0 4px;color:#0369a1;font-size:13px;font-weight:600;">🔗 Link permanente</p>
                          <p style="margin:0;color:#0c4a6e;font-size:12px;line-height:1.5;">Este link no expira. Guardalo para acceder a tus fotos cuando quieras.</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                      Si tenés algún problema con tu descarga, respondé este email y te ayudamos.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                © ${new Date().getFullYear()} ALTAFOTO · Fotografía deportiva profesional
              </p>
              <p style="margin:4px 0 0;">
                <a href="${BASE_URL}" style="color:#9ca3af;font-size:11px;text-decoration:none;">${BASE_URL.replace("https://", "")}</a>
              </p>
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
