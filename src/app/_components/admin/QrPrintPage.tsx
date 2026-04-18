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

type Format = "sticker" | "card" | "poster";

const FORMATS: { id: Format; label: string; qrSize: number; desc: string }[] = [
  { id: "sticker", label: "Sticker", qrSize: 80,  desc: "4 × 4 cm · dorsal, pechera" },
  { id: "card",    label: "Tarjeta", qrSize: 140, desc: "9 × 5 cm · flyer de mano" },
  { id: "poster",  label: "Póster",  qrSize: 220, desc: "A5/A4 · cartel en carrera" },
];

export function QrPrintPage({ events }: { events: EventItem[] }) {
  const [selected, setSelected] = useState<string>(events[0]?.id ?? "");
  const [format, setFormat]     = useState<Format>("card");

  const event = events.find((e) => e.id === selected);
  const fmt   = FORMATS.find((f) => f.id === format)!;

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

          {/* Controls */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Event selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Evento</h2>
              <div className="flex flex-col gap-1.5">
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e.id)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: selected === e.id ? "#EFF6FF" : "transparent",
                      border: `1.5px solid ${selected === e.id ? "#0057A8" : "#e5e7eb"}`,
                      color: selected === e.id ? "#0057A8" : "#374151",
                      fontWeight: selected === e.id ? 600 : undefined,
                    }}
                  >
                    <span className="truncate">{e.title}</span>
                    {!e.isPublished && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 ml-2 shrink-0">borrador</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Format selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Formato de impresión</h2>
              <div className="flex flex-col gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: format === f.id ? "#FFF7ED" : "transparent",
                      border: `1.5px solid ${format === f.id ? "#F97316" : "#e5e7eb"}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: format === f.id ? "#F97316" : "#f3f4f6" }}>
                      <svg className="w-4 h-4" style={{ color: format === f.id ? "#fff" : "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview + print */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-6">Vista previa · {fmt.label}</p>

              {event && (
                <>
                  {/* Print card */}
                  <div
                    id="qr-print-area"
                    className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 p-8"
                    style={{ minWidth: 280 }}
                  >
                    {/* Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="ALTAFOTO" className="h-8 w-auto" />

                    {/* QR */}
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                      <QRCode
                        value={event.url}
                        size={fmt.qrSize}
                        fgColor="#0057A8"
                        bgColor="#ffffff"
                        style={{ display: "block" }}
                      />
                    </div>

                    {/* Text */}
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-base">{event.title}</p>
                      <p className="text-xs text-gray-400 mt-1">Escaneá para ver tus fotos</p>
                      <p className="text-xs mt-2 font-mono" style={{ color: "#F97316" }}>
                        {event.url.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>

                  {/* Print button */}
                  <button
                    onClick={() => window.print()}
                    className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir / Guardar PDF
                  </button>

                  <p className="text-xs text-gray-400 mt-3 text-center max-w-xs">
                    El navegador abrirá el diálogo de impresión. Podés guardar como PDF o imprimir directamente.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: flex !important; position: fixed; inset: 0; margin: auto; border: none !important; }
        }
      `}</style>
    </div>
  );
}
