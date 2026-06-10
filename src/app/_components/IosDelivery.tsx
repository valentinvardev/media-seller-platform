"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { id: string; filename: string; url: string };

type Props = {
  photos: Photo[];
  buyerName: string | null;
  collectionTitle: string;
  bibNumber: string | null;
};

type Phase = "hero" | "saving" | "done";

/** Web Share API with file support — present on iOS 15+ Safari. */
function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!("share" in navigator) || !("canShare" in navigator)) return false;
  try {
    const f = new File([""], "t.jpg", { type: "image/jpeg" });
    return (navigator as Navigator & { canShare: (d: ShareData) => boolean }).canShare({ files: [f] });
  } catch {
    return false;
  }
}

export function IosDelivery({ photos, buyerName, collectionTitle, bibNumber }: Props) {
  const [phase, setPhase] = useState<Phase>("hero");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [useLongPress, setUseLongPress] = useState(false);

  // Blob cache so the share sheet opens instantly once the user taps Save.
  // We pre-fetch the current photo + the next one in the background while
  // they're viewing, then read from cache on tap. Keys are photo URLs.
  const blobCache = useRef<Map<string, Promise<Blob>>>(new Map());

  const currentPhoto = photos[currentIdx];
  const isLast = currentIdx === photos.length - 1;

  const prefetchBlob = (url: string): Promise<Blob> => {
    const cached = blobCache.current.get(url);
    if (cached) return cached;
    const p = fetch(url).then((r) => r.blob());
    blobCache.current.set(url, p);
    // If fetch fails, drop from cache so a retry can try again.
    p.catch(() => blobCache.current.delete(url));
    return p;
  };

  // Pre-fetch the current photo and the next one whenever we advance.
  useEffect(() => {
    if (phase !== "saving" || !currentPhoto) return;
    void prefetchBlob(currentPhoto.url);
    const next = photos[currentIdx + 1];
    if (next) void prefetchBlob(next.url);
  }, [phase, currentIdx, currentPhoto, photos]);

  const advance = () => {
    if (isLast) setPhase("done");
    else setCurrentIdx((i) => i + 1);
  };

  const handleSave = async () => {
    if (!currentPhoto || isLoading) return;

    if (!canShareFiles()) {
      setUseLongPress(true);
      return;
    }

    setIsLoading(true);
    let sheetOpened = false;
    try {
      const blob = await prefetchBlob(currentPhoto.url);
      const mimeType = blob.type || "image/jpeg";
      const file = new File([blob], currentPhoto.filename, { type: mimeType });
      sheetOpened = true;
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ files: [file] });
    } catch {
      if (!sheetOpened) {
        setUseLongPress(true);
        setIsLoading(false);
        return;
      }
    } finally {
      setIsLoading(false);
    }

    if (sheetOpened) {
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        advance();
      }, 1200);
    }
  };

  // ── Hero ─────────────────────────────────────────────────────────────────
  if (phase === "hero") {
    return (
      <main className="min-h-screen bg-white text-gray-900 flex flex-col">
        <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        <div className="px-6 h-14 flex items-center border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ALTAFOTO" className="h-auto" style={{ width: 140 }} />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-16" style={{ animation: "fadeUp 0.5s ease both" }}>
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: "#F97316" }}
          >
            {collectionTitle}
          </p>
          <h1
            className="font-display font-800 uppercase leading-none tracking-tight text-gray-900"
            style={{ fontSize: "clamp(40px, 12vw, 64px)" }}
          >
            Gracias
            <br />
            por tu
            <br />
            compra.
          </h1>

          {buyerName && buyerName !== "public@system" && (
            <p className="mt-5 text-base text-gray-500">{buyerName}</p>
          )}

          <div className="mt-8 flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Fotos</p>
              <p className="font-display font-800 text-3xl text-gray-900 leading-none">{photos.length}</p>
            </div>
            {bibNumber && (
              <>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Dorsal</p>
                  <p className="font-display font-800 text-3xl text-gray-900 leading-none">
                    #{bibNumber}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-12">
            <button
              onClick={() => setPhase("saving")}
              className="w-full flex items-center justify-between px-6 py-5 rounded-2xl text-white transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
            >
              <span className="font-display font-800 uppercase tracking-wide text-lg">
                Continuar
              </span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-gray-400 text-center">
              Te guiamos foto por foto
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <main className="min-h-screen bg-white text-gray-900 flex flex-col">
        <style>{`@keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }`}</style>

        <div className="px-6 h-14 flex items-center border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ALTAFOTO" className="h-auto" style={{ width: 140 }} />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-16">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
            style={{
              background: "linear-gradient(135deg, #F97316, #c2410c)",
              animation: "pop 0.4s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1
            className="font-display font-800 uppercase leading-none tracking-tight text-gray-900 mb-5"
            style={{ fontSize: "clamp(44px, 13vw, 72px)" }}
          >
            ¡Listo!
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed">
            Tus {photos.length} foto{photos.length !== 1 ? "s" : ""} {photos.length !== 1 ? "están guardadas" : "está guardada"} en tu galería.
          </p>
          <p className="mt-3 text-sm text-gray-400">Abrí la app Fotos para verlas.</p>
        </div>
      </main>
    );
  }

  // ── Saving (foto por foto) ───────────────────────────────────────────────
  if (!currentPhoto) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <style>{`
        @keyframes saveBadge { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Header */}
      <div className="px-6 h-14 flex items-center justify-between shrink-0 border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ALTAFOTO"
          className="h-auto"
          style={{ width: 140, filter: "brightness(0) invert(1)" }}
        />
        <span className="text-xs font-mono text-white/50">
          {currentIdx + 1} / {photos.length}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-white/10 shrink-0 mx-6 mt-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(currentIdx / photos.length) * 100}%`,
            background: "linear-gradient(90deg, #0057A8, #F97316)",
          }}
        />
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center px-4 py-3 relative">
        <img
          key={currentPhoto.url}
          src={currentPhoto.url}
          alt=""
          className="max-w-full object-contain rounded-lg select-none transition-opacity duration-300"
          style={{ maxHeight: "calc(100vh - 290px)", opacity: justSaved ? 0.35 : 1 }}
          draggable={false}
        />

        {justSaved && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: "saveBadge 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #F97316, #c2410c)",
                boxShadow: "0 0 60px rgba(249,115,22,0.5)",
              }}
            >
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="shrink-0 px-6 pb-8 pt-3">
        {justSaved ? (
          <div className="flex items-center justify-center gap-3 py-6" style={{ animation: "fadeIn 0.2s ease both" }}>
            <svg className="w-4 h-4" style={{ color: "#F97316" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#F97316" }}>
              Guardada · {isLast ? "terminando…" : "siguiente foto…"}
            </span>
          </div>
        ) : useLongPress ? (
          <div style={{ animation: "fadeIn 0.2s ease both" }}>
            <div
              className="rounded-xl px-5 py-4 mb-4"
              style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)" }}
            >
              <p className="text-sm text-white/85 leading-snug text-center">
                Mantené el dedo apretado sobre la foto y tocá{" "}
                <span className="font-semibold" style={{ color: "#F97316" }}>
                  &ldquo;Guardar foto&rdquo;
                </span>
              </p>
            </div>
            <button
              onClick={advance}
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl border border-white/20 text-white/70 active:bg-white/5 transition-colors"
            >
              <span className="text-[11px] uppercase tracking-widest font-semibold">Siguiente foto</span>
              <span className="text-xs">→</span>
            </button>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.2s ease both" }}>
            <p className="text-sm text-white/50 text-center mb-5 leading-snug">
              Tocá el botón para guardar
              <br />
              esta foto en tu galería
            </p>
            <button
              onClick={() => void handleSave()}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-6 py-5 rounded-2xl text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
            >
              <span className="font-display font-800 uppercase tracking-wide text-lg">
                {isLoading ? "Preparando…" : "Guardar esta foto"}
              </span>
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              )}
            </button>
            <button
              onClick={advance}
              className="w-full mt-3 py-3 text-[11px] uppercase tracking-widest font-semibold text-white/30 active:text-white/60 transition-colors"
            >
              Saltar esta foto →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
