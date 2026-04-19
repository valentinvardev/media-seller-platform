"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { WhatsAppMobileItem } from "~/app/_components/WhatsAppModal";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={2.5} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300"
        style={{
          background: "#001A4D",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
          <Image src="/logo.png" alt="ALTAFOTO" width={120} height={34} className="h-8 w-auto brightness-0 invert" />
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col px-4 py-6 gap-1 flex-1">
          <Link href="/" onClick={() => setOpen(false)}
            className="font-display font-800 uppercase tracking-wider text-white/80 hover:text-white py-3 px-3 rounded-xl hover:bg-white/10 transition-all">
            Inicio
          </Link>
          <a href="#eventos" onClick={() => setOpen(false)}
            className="font-display font-800 uppercase tracking-wider text-white/80 hover:text-white py-3 px-3 rounded-xl hover:bg-white/10 transition-all">
            Eventos
          </a>
          <div className="px-3 py-1">
            <WhatsAppMobileItem onClose={() => setOpen(false)} />
          </div>
        </nav>

        {/* Mis fotos CTA */}
        <div className="px-4 pb-8 shrink-0">
          <a href="#eventos" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
            style={{ background: "#F97316" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Mis fotos
          </a>
        </div>
      </div>
    </div>
  );
}
