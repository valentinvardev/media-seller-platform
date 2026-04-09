"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Step = "preview" | "buy" | "email";

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function PreviewLightbox({
  urls,
  startIdx,
  onClose,
}: {
  urls: string[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const count = urls.length;
  const drag = useRef({ active: false, startX: 0, startY: 0, px: 0, py: 0 });

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const goPrev = useCallback(() => { resetView(); setIdx((i) => (i - 1 + count) % count); }, [count, resetView]);
  const goNext = useCallback(() => { resetView(); setIdx((i) => (i + 1) % count); }, [count, resetView]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const clamp = (x: number, y: number, z: number) => {
    const el = imgRef.current;
    if (!el) return { x, y };
    const maxX = (el.clientWidth * (z - 1)) / 2;
    const maxY = (el.clientHeight * (z - 1)) / 2;
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    setZoom((z) => {
      const nz = Math.min(6, Math.max(1, z * factor));
      if (nz === 1) setPan({ x: 0, y: 0 });
      return nz;
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active) return;
    const np = clamp(drag.current.px + e.clientX - drag.current.startX, drag.current.py + e.clientY - drag.current.startY, zoom);
    setPan(np);
  };
  const onMouseUp = () => { drag.current.active = false; };

  const touch = useRef({ x0: 0, y0: 0, px: 0, py: 0, dist0: 0, z0: 1, pinching: false });
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      touch.current = { ...touch.current, dist0: Math.hypot(dx, dy), z0: zoom, pinching: true };
    } else {
      touch.current = { x0: e.touches[0]!.clientX, y0: e.touches[0]!.clientY, px: pan.x, py: pan.y, dist0: 0, z0: zoom, pinching: false };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const dist = Math.hypot(dx, dy);
      const nz = Math.min(6, Math.max(1, touch.current.z0 * (dist / touch.current.dist0)));
      setZoom(nz);
      if (nz === 1) setPan({ x: 0, y: 0 });
    } else if (!touch.current.pinching && zoom > 1) {
      const np = clamp(touch.current.px + e.touches[0]!.clientX - touch.current.x0, touch.current.py + e.touches[0]!.clientY - touch.current.y0, zoom);
      setPan(np);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current.pinching) { touch.current.pinching = false; return; }
    if (zoom > 1) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current.x0;
    if (Math.abs(dx) > 50) dx < 0 ? goNext() : goPrev();
  };

  const url = urls[idx] ?? "";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.97)" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: "rgba(0,0,0,0.5)" }}>
        <span className="text-xs" style={{ color: "#64748b" }}>
          {count > 1 ? `${idx + 1} / ${count}` : "Preview"}
        </span>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1e1e35", color: "#64748b" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ userSelect: "none", touchAction: "none" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef}
          src={url}
          alt=""
          draggable={false}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            maxHeight: "calc(100vh - 110px)",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: drag.current.active ? "none" : "transform 0.15s ease",
            cursor: zoom > 1 ? "grab" : "default",
          }}
          onDoubleClick={resetView}
        />

        {count > 1 && zoom === 1 && (
          <>
            <button onClick={goPrev} className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext} className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {zoom > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.65)", color: "#94a3b8" }}>
            {Math.round(zoom * 10) / 10}× · doble toque para restablecer
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 pb-4 pt-2">
          {count <= 12 ? Array.from({ length: count }).map((_, i) => (
            <button key={i} onClick={() => { resetView(); setIdx(i); }}
              className="rounded-full transition-all"
              style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#f59e0b" : "rgba(255,255,255,0.25)" }} />
          )) : (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{idx + 1} / {count}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Photo Preview Slider ─────────────────────────────────────────────────────

function PreviewSlider({ urls, photoCount }: { urls: string[]; photoCount: number }) {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const pauseUntil = useRef(0);
  const count = urls.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      if (Date.now() >= pauseUntil.current) setIdx((i) => (i + 1) % count);
    }, 3500);
    return () => clearInterval(t);
  }, [count]);

  const interact = () => { pauseUntil.current = Date.now() + 5000; };
  const goPrev = () => { interact(); setIdx((i) => (i - 1 + count) % count); };
  const goNext = () => { interact(); setIdx((i) => (i + 1) % count); };
  const goTo = (i: number) => { interact(); setIdx(i); };

  if (urls.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: "220px", background: "#0a0a15" }}>
        <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative overflow-hidden select-none"
        style={{ height: "220px" }}
        onTouchStart={(e) => setTouchX(e.touches[0]!.clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const diff = touchX - e.changedTouches[0]!.clientX;
          if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
          setTouchX(null);
        }}
      >
        {urls.map((url, i) => (
          <div key={i} className="absolute inset-0"
            style={{ opacity: i === idx ? 1 : 0, transition: "opacity 0.45s ease", pointerEvents: i === idx ? "auto" : "none" }}>
            <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        ))}

        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 z-10"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          title="Ver en pantalla completa"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>

        {count > 1 && (
          <>
            <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#f59e0b1a", border: "1px solid #f59e0b40" }}>
              <svg className="w-2.5 h-2.5" style={{ color: "#f59e0b" }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>
              {photoCount} foto{photoCount !== 1 ? "s" : ""}
            </span>
          </div>

          {count > 1 && (
            <div className="flex items-center gap-1">
              {count <= 10 ? Array.from({ length: count }).map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === idx ? "16px" : "6px", height: "6px", background: i === idx ? "#f59e0b" : "rgba(255,255,255,0.35)" }} />
              )) : (
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{idx + 1} / {count}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <PreviewLightbox urls={urls} startIdx={idx} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── BibCheckoutModal ─────────────────────────────────────────────────────────

export function BibCheckoutModal({
  bib,
  photoIds,
  collectionId,
  onClose,
}: {
  bib: string;
  photoIds: string[];
  collectionId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("preview");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const router = useRouter();

  const { data: urls, isLoading: urlsLoading } = api.photo.getPreviewUrls.useQuery(
    { ids: photoIds },
    { enabled: photoIds.length > 0 },
  );

  const { data: collectionInfo } = api.collection.getPrice.useQuery({ collectionId });

  const createPreference = api.purchase.createPreference.useMutation({
    onSuccess: (data) => { if (data.initPoint) window.location.href = data.initPoint; },
  });

  const accessByEmail = api.purchase.accessByEmail.useMutation({
    onSuccess: (token) => {
      if (token) {
        router.push(`/descarga/${token}`);
      } else {
        setEmailError("No encontramos una compra aprobada para este email en este dorsal.");
      }
    },
  });

  const handleBuy = () => {
    if (!email || !name) return;
    createPreference.mutate({
      collectionId,
      bibNumber: bib,
      buyerEmail: email,
      buyerName: name,
      buyerLastName: lastName || undefined,
      buyerPhone: phone || undefined,
    });
  };

  const handleEmailAccess = () => {
    if (!emailInput) return;
    setEmailError("");
    accessByEmail.mutate({ email: emailInput, collectionId, bibNumber: bib });
  };

  const previewUrls = urls?.map((u) => u.url) ?? [];
  const price = collectionInfo?.price ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden border"
        style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "#2a2a45" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1e1e35" }}>
          <div>
            {collectionInfo && (
              <p className="text-xs text-slate-500 mb-0.5">{collectionInfo.title}</p>
            )}
            <h2 className="font-bold text-white text-lg">Dorsal #{bib}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ background: "#16162a" }}
          >
            ✕
          </button>
        </div>

        {/* Preview slider */}
        {urlsLoading ? (
          <div className="flex justify-center items-center" style={{ height: "220px", background: "#0a0a15" }}>
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <PreviewSlider urls={previewUrls} photoCount={photoIds.length} />
        )}

        {/* Price row */}
        {price > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: "#f59e0b0e", borderTop: "1px solid #f59e0b20" }}
          >
            <div>
              <span className="text-sm text-slate-400">Comprar todas las fotos</span>
              <span className="text-xs text-slate-600 ml-2">· {photoIds.length} foto{photoIds.length !== 1 ? "s" : ""} en HD</span>
            </div>
            <span className="font-bold text-lg" style={{ color: "#fbbf24" }}>
              $ {price.toLocaleString("es-AR")}
            </span>
          </div>
        )}

        {/* Steps */}
        <div className="px-5 py-5">
          {step === "preview" && (
            <div className="flex flex-col gap-3">
              {price > 0 ? (
                <>
                  <button
                    onClick={() => setStep("buy")}
                    className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", boxShadow: "0 0 20px #f59e0b25" }}
                  >
                    Comprar todas · $ {price.toLocaleString("es-AR")}
                  </button>
                  <button
                    onClick={() => setStep("email")}
                    className="w-full py-3 rounded-xl font-medium text-sm border transition-all hover:border-white/20 hover:text-white"
                    style={{ background: "#16162a", borderColor: "#2a2a45", color: "#94a3b8" }}
                  >
                    Ya compré — Acceder con email
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setStep("email")}
                  className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 0 20px #10b98125" }}
                >
                  Acceder a mis fotos
                </button>
              )}
            </div>
          )}

          {step === "buy" && (
            <div className="flex flex-col gap-3">
              <p className="text-slate-400 text-sm text-center mb-1">Completá tus datos</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre *"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border text-sm"
                  style={{ background: "#16162a", borderColor: "#2a2a45" }}
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border text-sm"
                  style={{ background: "#16162a", borderColor: "#2a2a45" }}
                />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono (ej: 1165551234)"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border text-sm"
                style={{ background: "#16162a", borderColor: "#2a2a45" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border text-sm"
                style={{ background: "#16162a", borderColor: "#2a2a45" }}
                onKeyDown={(e) => { if (e.key === "Enter" && email && name) handleBuy(); }}
              />
              <button
                onClick={handleBuy}
                disabled={!email || !name || createPreference.isPending}
                className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
              >
                {createPreference.isPending
                  ? "Redirigiendo a MercadoPago..."
                  : `Pagar $ ${price.toLocaleString("es-AR")}`}
              </button>
              {createPreference.isError && (
                <p className="text-red-400 text-xs text-center">Ocurrió un error. Intentá de nuevo.</p>
              )}
              <button
                onClick={() => setStep("preview")}
                className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors"
              >
                Volver
              </button>
            </div>
          )}

          {step === "email" && (
            <div className="flex flex-col gap-3">
              <div className="text-center mb-1">
                <p className="text-white font-medium text-sm">Acceder a tus fotos</p>
                <p className="text-slate-500 text-xs mt-1">
                  Ingresá el email con el que compraste el dorsal #{bib}
                </p>
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border"
                style={{ background: "#16162a", borderColor: emailError ? "#ef444450" : "#2a2a45" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleEmailAccess(); }}
                autoFocus
              />
              {emailError && <p className="text-red-400 text-xs text-center">{emailError}</p>}
              <button
                onClick={handleEmailAccess}
                disabled={!emailInput || accessByEmail.isPending}
                className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
              >
                {accessByEmail.isPending ? "Buscando..." : "Acceder a mis fotos"}
              </button>
              <button
                onClick={() => setStep("preview")}
                className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors"
              >
                Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
