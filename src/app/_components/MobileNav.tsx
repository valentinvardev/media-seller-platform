"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WhatsAppMobileItem } from "~/app/_components/WhatsAppModal";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Close on route change / scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-colors"
        aria-label="Menú"
      >
        <span className={`block h-[3px] w-6 rounded transition-all duration-200 ${open ? "rotate-45 translate-y-[7px]" : ""}`} style={{ background: "#F97316" }} />
        <span className={`block h-[3px] w-6 rounded transition-all duration-200 ${open ? "opacity-0" : ""}`} style={{ background: "#F97316" }} />
        <span className={`block h-[3px] w-6 rounded transition-all duration-200 ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} style={{ background: "#F97316" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          {/* Menu panel */}
          <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg px-5 py-4 flex flex-col gap-1">
            <Link href="/" onClick={() => setOpen(false)}
              className="font-display font-700 uppercase tracking-wider text-gray-900 py-3 border-b border-gray-100 hover:text-blue-700 transition-colors">
              Inicio
            </Link>
            <a href="#eventos" onClick={() => setOpen(false)}
              className="font-display font-700 uppercase tracking-wider text-gray-700 py-3 border-b border-gray-100 hover:text-blue-700 transition-colors">
              Eventos
            </a>
            <WhatsAppMobileItem onClose={() => setOpen(false)} />
            <a href="#eventos" onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-display font-700 uppercase tracking-wider text-white text-sm"
              style={{ background: "#0057A8" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mis fotos
            </a>
          </div>
        </>
      )}
    </div>
  );
}
