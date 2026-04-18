"use client";

import { useState, useEffect } from "react";

const WA_NUMBER = "5493543513123";
const WA_URL = `https://wa.me/${WA_NUMBER}`;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsAppNavButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors flex items-center gap-1.5"
      >
        <WhatsAppIcon className="w-4 h-4" />
        Contacto
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
                <WhatsAppIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Escribinos por WhatsApp</p>
                <p className="text-gray-500 text-xs mt-0.5">+54 9 3543 51-3123</p>
              </div>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: "#25D366" }}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function WhatsAppFooterButton() {
  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
      style={{ background: "#25D366" }}
    >
      <WhatsAppIcon className="w-4 h-4" />
      Escribinos por WhatsApp
    </a>
  );
}

export function WhatsAppMobileItem({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-display font-700 uppercase tracking-wider text-gray-700 py-3 border-b border-gray-100 hover:text-green-600 transition-colors flex items-center gap-2 w-full text-left"
      >
        <WhatsAppIcon className="w-4 h-4 text-green-500" />
        Contacto
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
              <WhatsAppIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Escribinos por WhatsApp</p>
              <p className="text-gray-500 text-sm mt-1">+54 9 3543 51-3123</p>
            </div>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setOpen(false); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white"
              style={{ background: "#25D366" }}
            >
              <WhatsAppIcon className="w-5 h-5" />
              Abrir WhatsApp
            </a>
            <button onClick={() => setOpen(false)} className="text-gray-400 text-sm hover:text-gray-600">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
