import QRCode from "react-qr-code";
import { AutoPrint } from "./AutoPrint";

type Format = "sticker" | "card" | "poster" | "plain";

export default async function QrPrintRoute({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string; format?: string }>;
}) {
  const { url = "", title = "", format = "card" } = await searchParams;
  const fmt = format as Format;
  const shortUrl = url.replace(/^https?:\/\//, "");

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const logoSrc = `${BASE_URL}/logo.png`;

  return (
    <>
      <AutoPrint />
      <style>{getPageCss(fmt)}</style>

      {fmt === "plain" && (
        <div className="plain-wrap">
          <QRCode value={url} size={300} fgColor="#000000" bgColor="#ffffff" />
        </div>
      )}

      {fmt === "sticker" && (
        <div className="card sticker">
          <div className="s-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="logo" />
          </div>
          <div className="s-accent" />
          <div className="s-qr">
            <QRCode value={url} size={120} fgColor="#0057A8" bgColor="#ffffff" />
          </div>
          <div className="s-footer">
            <span>Escaneá · Encontrá tus fotos</span>
          </div>
        </div>
      )}

      {fmt === "card" && (
        <div className="card card-wrap">
          <div className="c-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="logo" />
            <div className="c-divider" />
            <span className="c-url">{shortUrl}</span>
          </div>
          <div className="c-right">
            <div className="c-qr-wrap">
              <QRCode value={url} size={160} fgColor="#0057A8" bgColor="#ffffff" />
            </div>
            <div className="c-title">{title}</div>
            <div className="c-sub">↑ Escaneá y encontrá tus fotos</div>
          </div>
        </div>
      )}

      {fmt === "poster" && (
        <div className="card poster-wrap">
          <div className="p-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="logo" />
            <div className="p-title">{title}</div>
          </div>
          <div className="p-accent" />
          <div className="p-body">
            <div className="p-intro">📸 ¿Corriste hoy? Tus fotos te esperan.</div>
            <div className="p-qr-wrap">
              <QRCode value={url} size={240} fgColor="#0057A8" bgColor="#ffffff" />
            </div>
            <div className="p-event">{title}</div>
            <div className="p-steps">
              <span>Escaneá el código</span>
              <span className="dot">·</span>
              <span>Ingresá tu número</span>
              <span className="dot">·</span>
              <span>Descargá en HD</span>
            </div>
          </div>
          <div className="p-footer">
            <span className="p-url">{shortUrl}</span>
          </div>
        </div>
      )}
    </>
  );
}

function getPageCss(fmt: Format): string {
  const base = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    body { background: white; display: flex; align-items: center; justify-content: center; }
    .logo { display: block; }
  `;

  if (fmt === "plain") return `
    ${base}
    @page { size: 10cm 10cm; margin: 0.5cm; }
    body { min-height: 9cm; }
    .plain-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
  `;

  if (fmt === "sticker") return `
    ${base}
    @page { size: 6cm 6cm; margin: 0; }
    body { width: 6cm; height: 6cm; }
    .sticker { width: 5.6cm; height: 5.6cm; border: 3px solid #0057A8; border-radius: 10px; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
    .s-header { background: #0057A8; width: 100%; display: flex; align-items: center; justify-content: center; padding: 5px 0; flex-shrink: 0; }
    .s-header .logo { height: 22px; filter: brightness(0) invert(1); }
    .s-accent { height: 3px; width: 100%; background: linear-gradient(90deg, #F97316, #c2410c); flex-shrink: 0; }
    .s-qr { flex: 1; display: flex; align-items: center; justify-content: center; padding: 4px; }
    .s-footer { background: #F97316; width: 100%; text-align: center; padding: 4px 0; flex-shrink: 0; }
    .s-footer span { font-size: 6.5pt; font-weight: 800; color: white; letter-spacing: 0.4px; text-transform: uppercase; }
  `;

  if (fmt === "card") return `
    ${base}
    @page { size: 10cm 7cm landscape; margin: 0; }
    body { width: 10cm; height: 7cm; }
    .card-wrap { width: 10cm; height: 7cm; display: flex; overflow: hidden; border: 2px solid #0057A8; border-radius: 8px; }
    .c-left { width: 3.2cm; background: linear-gradient(160deg, #003D7A, #0057A8); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 10px 8px; }
    .c-left .logo { width: 2.4cm; filter: brightness(0) invert(1); }
    .c-divider { width: 1.4cm; height: 2px; background: #F97316; border-radius: 2px; }
    .c-url { font-size: 5pt; color: rgba(255,255,255,0.65); text-align: center; word-break: break-all; }
    .c-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 10px 12px; background: white; }
    .c-qr-wrap { padding: 6px; border: 2.5px solid #0057A8; border-radius: 8px; line-height: 0; }
    .c-title { font-size: 8pt; font-weight: 800; color: #0057A8; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; }
    .c-sub { font-size: 7pt; color: #F97316; font-weight: 700; text-align: center; }
  `;

  // poster
  return `
    ${base}
    @page { size: A5 portrait; margin: 0; }
    body { width: 14.8cm; height: 21cm; }
    .poster-wrap { width: 14.8cm; height: 21cm; display: flex; flex-direction: column; overflow: hidden; }
    .p-header { background: linear-gradient(135deg, #002D6E 0%, #0057A8 100%); padding: 1.1cm 1cm 0.9cm; display: flex; flex-direction: column; align-items: center; gap: 0.5cm; }
    .p-header .logo { height: 1.2cm; filter: brightness(0) invert(1); }
    .p-title { font-size: 12pt; font-weight: 900; color: white; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    .p-accent { height: 7px; background: linear-gradient(90deg, #F97316, #c2410c); flex-shrink: 0; }
    .p-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.45cm; padding: 0.5cm 1cm; background: white; }
    .p-intro { font-size: 9.5pt; color: #4b5563; text-align: center; font-weight: 500; }
    .p-qr-wrap { padding: 0.3cm; border: 3px solid #0057A8; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,87,168,0.18); line-height: 0; }
    .p-event { font-size: 14pt; font-weight: 900; color: #0057A8; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    .p-steps { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; justify-content: center; }
    .p-steps span { font-size: 8pt; color: #374151; font-weight: 500; }
    .p-steps .dot { color: #F97316; font-weight: 900; }
    .p-footer { background: #F97316; padding: 0.35cm 1cm; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .p-url { font-size: 8.5pt; font-weight: 800; color: white; letter-spacing: 0.3px; }
  `;
}
