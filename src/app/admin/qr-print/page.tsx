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

      {/* ── Plain: QR only ── */}
      {fmt === "plain" && (
        <div className="plain-wrap">
          <QRCode value={url} size={300} fgColor="#0057A8" bgColor="#ffffff" />
        </div>
      )}

      {/* ── Sticker 6×6cm ── */}
      {fmt === "sticker" && (
        <div className="sticker">
          <div className="s-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="s-logo" />
          </div>
          <div className="s-qr">
            <QRCode value={url} size={105} fgColor="#0057A8" bgColor="#ffffff" />
          </div>
          <div className="s-line" />
          <div className="s-msg">Tu foto está acá</div>
        </div>
      )}

      {/* ── Card 10×7cm ── */}
      {fmt === "card" && (
        <div className="card-wrap">
          {/* Left: logo + event */}
          <div className="c-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="c-logo" />
            <div className="c-sep" />
            <div className="c-event">{title}</div>
          </div>
          {/* Right: QR + message */}
          <div className="c-right">
            <div className="c-qr-wrap">
              <QRCode value={url} size={150} fgColor="#0057A8" bgColor="#ffffff" />
            </div>
            <div className="c-headline">Tu carrera quedó capturada</div>
            <div className="c-sub">Escaneá y encontrá tu foto</div>
            <div className="c-url">{shortUrl}</div>
          </div>
        </div>
      )}

      {/* ── Poster A5 ── */}
      {fmt === "poster" && (
        <div className="poster-wrap">
          {/* Top bar */}
          <div className="p-top-bar" />
          <div className="p-body">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="ALTAFOTO" className="p-logo" />
            <div className="p-divider" />
            <div className="p-headline">Tu carrera quedó<br />capturada.</div>
            <div className="p-qr-wrap">
              <QRCode value={url} size={230} fgColor="#0057A8" bgColor="#ffffff" />
            </div>
            <div className="p-event">{title}</div>
            <div className="p-msg">Escaneá el código, ingresá tu número y mirá tu foto.</div>
          </div>
          {/* Bottom bar */}
          <div className="p-bottom">
            <span className="p-url">{shortUrl}</span>
          </div>
        </div>
      )}
    </>
  );
}

function getPageCss(fmt: Format): string {
  const base = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background: white; display: flex; align-items: center; justify-content: center; }
  `;

  if (fmt === "plain") return `
    ${base}
    @page { size: 10cm 10cm; margin: 0.5cm; }
    body { min-height: 9cm; }
    .plain-wrap { display: flex; align-items: center; justify-content: center; width: 100%; }
  `;

  if (fmt === "sticker") return `
    ${base}
    @page { size: 6cm 6cm; margin: 0; }
    body { width: 6cm; height: 6cm; }
    .sticker {
      width: 5.7cm; height: 5.7cm;
      border: 2.5px solid #0057A8; border-radius: 10px;
      display: flex; flex-direction: column; align-items: center;
      padding: 0.2cm 0.2cm 0.15cm; gap: 0.1cm; overflow: hidden;
      background: white;
    }
    .s-logo-wrap { width: 100%; display: flex; align-items: center; justify-content: center; padding: 0.1cm 0; }
    .s-logo { height: 0.55cm; width: auto; }
    .s-qr { flex: 1; display: flex; align-items: center; justify-content: center; }
    .s-line { height: 2px; width: 1.5cm; background: #F97316; border-radius: 2px; }
    .s-msg { font-size: 6.5pt; font-weight: 700; color: #0057A8; letter-spacing: 0.2px; text-align: center; padding-bottom: 0.05cm; }
  `;

  if (fmt === "card") return `
    ${base}
    @page { size: 10cm 7cm landscape; margin: 0; }
    body { width: 10cm; height: 7cm; }
    .card-wrap {
      width: 10cm; height: 7cm;
      display: flex; overflow: hidden;
      background: white;
    }
    .c-left {
      width: 3cm; background: white;
      border-right: 2px solid #0057A8;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.3cm; padding: 0.4cm 0.3cm;
    }
    .c-logo { width: 2.2cm; height: auto; }
    .c-sep { width: 1.2cm; height: 2px; background: #F97316; border-radius: 2px; }
    .c-event { font-size: 6pt; font-weight: 700; color: #0057A8; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.3; }
    .c-right {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.2cm; padding: 0.3cm 0.4cm;
    }
    .c-qr-wrap { line-height: 0; }
    .c-headline { font-size: 8.5pt; font-weight: 800; color: #111827; text-align: center; line-height: 1.2; }
    .c-sub { font-size: 7pt; font-weight: 600; color: #F97316; text-align: center; }
    .c-url { font-size: 5.5pt; color: #9ca3af; text-align: center; }
  `;

  // poster A5
  return `
    ${base}
    @page { size: A5 portrait; margin: 0; }
    body { width: 14.8cm; height: 21cm; }
    .poster-wrap { width: 14.8cm; height: 21cm; display: flex; flex-direction: column; background: white; }
    .p-top-bar { height: 0.35cm; background: #0057A8; flex-shrink: 0; }
    .p-body {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.4cm; padding: 0.6cm 1.2cm;
    }
    .p-logo { height: 1.4cm; width: auto; }
    .p-divider { width: 2cm; height: 3px; background: #F97316; border-radius: 2px; }
    .p-headline {
      font-size: 22pt; font-weight: 900; color: #0057A8;
      text-align: center; line-height: 1.15; letter-spacing: -0.3px;
    }
    .p-qr-wrap {
      padding: 0.3cm; border: 3px solid #0057A8; border-radius: 14px;
      box-shadow: 0 4px 20px rgba(0,87,168,0.12); line-height: 0; background: white;
    }
    .p-event { font-size: 9pt; font-weight: 700; color: #6b7280; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    .p-msg { font-size: 9pt; color: #374151; text-align: center; line-height: 1.5; }
    .p-bottom {
      height: 0.9cm; background: #F97316; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .p-url { font-size: 8pt; font-weight: 700; color: white; letter-spacing: 0.3px; }
  `;
}
