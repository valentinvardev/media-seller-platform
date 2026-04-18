"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

type EventItem = {
  id: string;
  title: string;
  slug: string;
  url: string;
  isPublished: boolean;
};

type Format = "sticker" | "card" | "poster" | "plain";

const FORMATS: { id: Format; label: string; desc: string; size: string }[] = [
  { id: "sticker", label: "Sticker",  desc: "6 × 6 cm · dorsal o pechera",     size: "6cm × 6cm"   },
  { id: "card",    label: "Tarjeta",  desc: "10 × 7 cm · flyer de mano",       size: "10cm × 7cm"  },
  { id: "poster",  label: "Póster",   desc: "A5 · cartel en el recorrido",      size: "A5 (14.8cm × 21cm)" },
  { id: "plain",   label: "Solo QR",  desc: "QR limpio sin decoración",         size: "6cm × 6cm"   },
];

const QR_PREVIEW_SIZES: Record<Format, number> = {
  sticker: 90,
  card:    130,
  poster:  180,
  plain:   130,
};

// ─── Print HTML templates ─────────────────────────────────────────────────────

function buildPrintHtml(event: EventItem, format: Format, qrSvg: string, logoSrc: string): string {
  const url = event.url.replace(/^https?:\/\//, "");

  if (format === "sticker") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 0; size: 6cm 6cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 6cm; height: 6cm; display: flex; align-items: center; justify-content: center; background: white; }
  .card {
    width: 5.6cm; height: 5.6cm;
    border: 3px solid #0057A8;
    border-radius: 10px;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 6px 6px 4px;
    overflow: hidden;
  }
  .top { background: #0057A8; width: 100%; border-radius: 5px; display: flex; align-items: center; justify-content: center; padding: 4px 0; }
  .top img { height: 18px; filter: brightness(0) invert(1); }
  .qr { flex: 1; display: flex; align-items: center; justify-content: center; padding: 4px 0; }
  .qr svg { width: 2.8cm; height: 2.8cm; }
  .bar { background: #F97316; width: 100%; border-radius: 4px; text-align: center; padding: 3px 0; }
  .bar span { font-family: sans-serif; font-size: 6pt; font-weight: 800; color: white; letter-spacing: 0.5px; text-transform: uppercase; }
</style></head><body>
<div class="card">
  <div class="top"><img src="${logoSrc}" /></div>
  <div class="qr">${qrSvg}</div>
  <div class="bar"><span>Escaneá · Encontrá tus fotos</span></div>
</div>
</body></html>`;
  }

  if (format === "card") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 0; size: 10cm 7cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 10cm; height: 7cm; display: flex; background: white; font-family: sans-serif; }
  .left {
    width: 3.6cm; background: #0057A8;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 8px;
  }
  .left img { width: 2.6cm; filter: brightness(0) invert(1); }
  .divider { width: 1.6cm; height: 2px; background: #F97316; border-radius: 2px; }
  .left-url { font-size: 5.5pt; color: rgba(255,255,255,0.7); text-align: center; word-break: break-all; }
  .right {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    padding: 12px;
  }
  .qr-wrap { padding: 6px; border: 2px solid #0057A8; border-radius: 8px; line-height: 0; }
  .qr-wrap svg { width: 3.4cm; height: 3.4cm; }
  .title { font-size: 8pt; font-weight: 800; color: #0057A8; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; }
  .sub { font-size: 6.5pt; color: #F97316; font-weight: 700; text-align: center; }
</style></head><body>
<div class="left">
  <img src="${logoSrc}" />
  <div class="divider"></div>
  <div class="left-url">${url}</div>
</div>
<div class="right">
  <div class="qr-wrap">${qrSvg}</div>
  <div class="title">${event.title}</div>
  <div class="sub">↑ Escaneá y encontrá tus fotos</div>
</div>
</body></html>`;
  }

  if (format === "plain") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 0; size: 6cm 6cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 6cm; height: 6cm; display: flex; align-items: center; justify-content: center; background: white; }
  svg { width: 5.4cm; height: 5.4cm; display: block; }
</style></head><body>
${qrSvg}
</body></html>`;
  }

  // poster — A5
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 0; size: A5 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 14.8cm; height: 21cm; display: flex; flex-direction: column; background: white; font-family: sans-serif; overflow: hidden; }
  .header {
    background: linear-gradient(135deg, #003D7A 0%, #0057A8 100%);
    padding: 1cm 1cm 0.7cm;
    display: flex; flex-direction: column; align-items: center; gap: 0.4cm;
  }
  .header img { height: 1.1cm; filter: brightness(0) invert(1); }
  .header-title { font-size: 11pt; font-weight: 800; color: white; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
  .accent { height: 6px; background: linear-gradient(90deg, #F97316, #c2410c); width: 100%; }
  .body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5cm; padding: 0.5cm 1cm; }
  .instruction { font-size: 9pt; color: #6b7280; text-align: center; font-weight: 500; }
  .qr-wrap {
    padding: 0.35cm;
    border: 3px solid #0057A8;
    border-radius: 12px;
    background: white;
    box-shadow: 0 4px 20px rgba(0,87,168,0.15);
    line-height: 0;
  }
  .qr-wrap svg { width: 5.5cm; height: 5.5cm; }
  .event-name { font-size: 14pt; font-weight: 900; color: #0057A8; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
  .tagline { font-size: 9pt; color: #374151; text-align: center; }
  .footer {
    background: #F97316;
    padding: 0.3cm 1cm;
    display: flex; align-items: center; justify-content: center; gap: 0.3cm;
  }
  .footer-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.6); }
  .footer-url { font-size: 8pt; font-weight: 800; color: white; letter-spacing: 0.3px; }
</style></head><body>
<div class="header">
  <img src="${logoSrc}" />
  <div class="header-title">${event.title}</div>
</div>
<div class="accent"></div>
<div class="body">
  <div class="instruction">📸 ¿Corriste hoy? Tus fotos te esperan.</div>
  <div class="qr-wrap">${qrSvg}</div>
  <div class="event-name">${event.title}</div>
  <div class="tagline">Escaneá el código · Ingresá tu número de dorsal · Descargá en HD</div>
</div>
<div class="footer">
  <div class="footer-dot"></div>
  <div class="footer-url">${url}</div>
  <div class="footer-dot"></div>
</div>
</body></html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QrPrintPage({ events }: { events: EventItem[] }) {
  const [selected, setSelected] = useState<string>(events[0]?.id ?? "");
  const [format, setFormat]     = useState<Format>("card");

  const event = events.find((e) => e.id === selected);
  const fmt   = FORMATS.find((f) => f.id === format)!;

  const handlePrint = () => {
    if (!event) return;
    const qrEl = document.getElementById("qr-svg-root")?.querySelector("svg");
    if (!qrEl) return;

    const qrSvg = qrEl.outerHTML;
    const logoSrc = `${window.location.origin}/logo.png`;
    const html = buildPrintHtml(event, format, qrSvg, logoSrc);

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Permitís ventanas emergentes para imprimir."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Códigos QR</h1>
      <p className="text-gray-500 text-sm mb-8">Imprimí QR para que los corredores accedan a sus fotos al instante.</p>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
          No hay eventos publicados aún.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Controls ── */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Evento</h2>
              <div className="flex flex-col gap-1.5">
                {events.map((e) => (
                  <button key={e.id} onClick={() => setSelected(e.id)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: selected === e.id ? "#EFF6FF" : "transparent",
                      border: `1.5px solid ${selected === e.id ? "#0057A8" : "#e5e7eb"}`,
                      color: selected === e.id ? "#0057A8" : "#374151",
                      fontWeight: selected === e.id ? 600 : undefined,
                    }}>
                    <span className="truncate">{e.title}</span>
                    {!e.isPublished && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 ml-2 shrink-0">borrador</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Formato</h2>
              <div className="flex flex-col gap-2">
                {FORMATS.map((f) => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: format === f.id ? "#FFF7ED" : "transparent",
                      border: `1.5px solid ${format === f.id ? "#F97316" : "#e5e7eb"}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: format === f.id ? "#F97316" : "#f3f4f6", color: format === f.id ? "white" : "#9ca3af" }}>
                      {f.id === "sticker" ? "S" : f.id === "card" ? "T" : "P"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </div>
                    {format === f.id && (
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#FED7AA", color: "#c2410c" }}>{f.size}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Preview ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-6">
                Vista previa · {fmt.label} · {fmt.size}
              </p>

              {event && (
                <>
                  {/* Plain preview — no decoration */}
                  {format === "plain" && (
                    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                      <div id="qr-svg-root">
                        <QRCode
                          value={event.url}
                          size={QR_PREVIEW_SIZES.plain}
                          fgColor="#000000"
                          bgColor="#ffffff"
                          style={{ display: "block" }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Sin bordes · Sin texto · Solo QR</p>
                    </div>
                  )}

                  {/* Decorated preview card */}
                  {format !== "plain" && <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                    style={{
                      width: format === "poster" ? 260 : format === "card" ? 320 : 180,
                    }}>

                    {/* Header */}
                    <div className="flex flex-col items-center gap-2 py-5 px-4"
                      style={{ background: "linear-gradient(135deg, #003D7A 0%, #0057A8 100%)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="ALTAFOTO" className="w-auto brightness-0 invert"
                        style={{ height: format === "poster" ? 36 : 24 }} />
                      {format !== "sticker" && (
                        <p className="text-white text-xs font-bold text-center uppercase tracking-wide">{event.title}</p>
                      )}
                    </div>

                    {/* Orange accent */}
                    <div style={{ height: 4, background: "linear-gradient(90deg, #F97316, #c2410c)" }} />

                    {/* QR */}
                    <div className="flex flex-col items-center gap-3 py-5 px-4 bg-white">
                      {format === "poster" && (
                        <p className="text-xs text-gray-500 text-center">📸 ¿Corriste hoy? Tus fotos te esperan.</p>
                      )}
                      <div id="qr-svg-root" className="p-2.5 rounded-xl border-2" style={{ borderColor: "#0057A8" }}>
                        <QRCode
                          value={event.url}
                          size={QR_PREVIEW_SIZES[format]}
                          fgColor="#0057A8"
                          bgColor="#ffffff"
                          style={{ display: "block" }}
                        />
                      </div>
                      {format !== "sticker" && (
                        <p className="text-xs text-center font-semibold" style={{ color: "#F97316" }}>
                          ↑ Escaneá y encontrá tus fotos
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-center gap-2 py-2 px-3"
                      style={{ background: "#F97316" }}>
                      <p className="text-white text-xs font-bold truncate">
                        {event.url.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>}

                  {/* Print button */}
                  <button onClick={handlePrint}
                    className="mt-7 flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)", boxShadow: "0 4px 16px rgba(0,87,168,0.25)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir / Guardar PDF
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Se abre una nueva ventana lista para imprimir o guardar como PDF
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
