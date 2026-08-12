"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * Parallax wedding cover built from two cut-out layers:
 *   bg (capa 2) = far scene — altar, the couple, the ceiling
 *   fg (capa 1) = near scene — pews, guests, side columns (center is transparent)
 *
 * The illusion is "walking down the aisle toward the couple": a slow breathing
 * push-in where the near layer moves more than the far one, plus subtle mouse
 * parallax on desktop for interactive depth. Respects prefers-reduced-motion.
 */
export function WeddingHero({
  eyebrow = "Fotografía de bodas",
  title = "Tu historia, para siempre",
  subtitle = "Encontrá y descargá las fotos de tu casamiento en alta resolución.",
  ctaLabel = "Buscar mis fotos",
  ctaHref = "/",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mouse parallax — near (fg) moves opposite to the cursor and further than
  // the far layer (bg), which is what sells the depth. Updated straight on the
  // DOM node (no React re-render per mousemove).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;  // -0.5 .. 0.5
      const cy = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (fgRef.current) fgRef.current.style.transform = `translate(${cx * -30}px, ${cy * -18}px)`;
        if (bgRef.current) bgRef.current.style.transform = `translate(${cx * 12}px, ${cy * 8}px)`;
      });
    };
    const onLeave = () => {
      if (fgRef.current) fgRef.current.style.transform = "translate(0,0)";
      if (bgRef.current) bgRef.current.style.transform = "translate(0,0)";
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative w-full overflow-hidden"
      style={{ height: "min(88vh, 900px)", minHeight: 520, background: "#140c05" }}
    >
      <style>{`
        @keyframes wh-breathe-bg { from { transform: scale(1.04); } to { transform: scale(1.10); } }
        @keyframes wh-breathe-fg { from { transform: scale(1.06); } to { transform: scale(1.17); } }
        @keyframes wh-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        .wh-breathe-bg { animation: wh-breathe-bg 12s ease-in-out infinite alternate; }
        .wh-breathe-fg { animation: wh-breathe-fg 12s ease-in-out infinite alternate; }
        .wh-rise { animation: wh-rise 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .wh-breathe-bg, .wh-breathe-fg { animation: none; transform: scale(1.05); }
          .wh-rise { animation: none; }
        }
      `}</style>

      {/* Far layer — altar + couple */}
      <div ref={bgRef} className="absolute inset-0 will-change-transform" style={{ transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bodas/bg.webp" alt="" className="wh-breathe-bg absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
      </div>

      {/* Near layer — pews + guests (transparent center reveals the altar) */}
      <div ref={fgRef} className="absolute inset-0 will-change-transform" style={{ transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bodas/fg.webp" alt="Boda en la iglesia" className="wh-breathe-fg absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
      </div>

      {/* Scrims for text legibility — dark at the bottom, a touch at the top */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,6,2,0.82) 0%, rgba(10,6,2,0.35) 32%, transparent 55%)" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28" style={{ background: "linear-gradient(to bottom, rgba(10,6,2,0.45), transparent)" }} />

      {/* Copy */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="wh-rise text-[11px] sm:text-xs uppercase tracking-[0.32em] font-semibold mb-4" style={{ color: "#f5d9a8", animationDelay: "0.05s" }}>
            {eyebrow}
          </p>
          <h1
            className="wh-rise text-white leading-[0.98]"
            style={{ fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 600, fontSize: "clamp(2.6rem, 7vw, 5.5rem)", textShadow: "0 2px 30px rgba(0,0,0,0.45)", animationDelay: "0.14s" }}
          >
            <span style={{ fontStyle: "italic" }}>{title}</span>
          </h1>
          <p className="wh-rise mx-auto mt-5 max-w-xl text-sm sm:text-base text-white/85 leading-relaxed" style={{ animationDelay: "0.24s" }}>
            {subtitle}
          </p>
          <div className="wh-rise mt-8" style={{ animationDelay: "0.34s" }}>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#3a2a12] transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: "linear-gradient(135deg, #f7e3bd, #e9c584)", boxShadow: "0 8px 30px rgba(233,197,132,0.35)" }}
            >
              {ctaLabel}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
