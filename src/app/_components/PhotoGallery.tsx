"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Photo = { id: string; filename: string; url: string };

type Props = {
  token: string;
  folderNumber: string;
  collectionTitle: string;
  buyerName: string | null;
  isPublicInit: boolean;
  photos: Photo[];
};

const PAGE_SIZE = 24;

export function PhotoGallery({ folderNumber, collectionTitle, buyerName, isPublicInit, photos }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  // ── Lightbox keyboard nav ────────────────────────────────────────────────
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto = useCallback(() =>
    setLightboxIdx((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)), [photos.length]);
  const nextPhoto = useCallback(() =>
    setLightboxIdx((i) => (i !== null ? (i + 1) % photos.length : null)), [photos.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, closeLightbox, prevPhoto, nextPhoto]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(photos.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());
  const exitSelectMode = () => { setSelectMode(false); clearSelection(); };

  // ── Download via blob (works cross-origin) ───────────────────────────────
  const downloadPhoto = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      window.open(url, "_blank");
    }
  };

  const downloadPhotos = async (indices: number[]) => {
    for (let i = 0; i < indices.length; i++) {
      const photo = photos[indices[i]!]!;
      await downloadPhoto(photo.url, photo.filename);
      if (i < indices.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
  };

  const handleDownloadSelected = () => void downloadPhotos(Array.from(selected).sort());

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    await downloadPhotos(photos.map((_, i) => i));
    setDownloadingAll(false);
  };

  // ── Share ────────────────────────────────────────────────────────────────
  const handleShare = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    });
  };

  const currentPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <div className="min-h-screen" style={{ background: "#07070f", color: "#f1f5f9" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4"
        style={{ background: "rgba(7,7,15,0.92)", backdropFilter: "blur(12px)", borderColor: "#1e1e35" }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "#94a3b8" }} title="Inicio">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: "#64748b" }}>{collectionTitle}</p>
            <h1 className="font-bold text-white text-sm sm:text-base leading-tight">
              Carpeta #{folderNumber}
              {buyerName && buyerName !== "public@system" && (
                <span className="text-slate-400 font-normal"> · {buyerName}</span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: shareState === "copied" ? "#10b98120" : "#1e1e35", color: shareState === "copied" ? "#34d399" : "#94a3b8" }}
          >
            {shareState === "copied" ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
            {/* Always show label — even on mobile */}
            <span>{shareState === "copied" ? "¡Copiado!" : "Compartir"}</span>
          </button>

          {/* Download all */}
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: "#f59e0b18", color: "#fbbf24", border: "1px solid #f59e0b30" }}
          >
            {downloadingAll ? (
              <div className="w-3.5 h-3.5 rounded-full border border-amber-400 border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {/* Always show label — even on mobile */}
            <span>{downloadingAll ? "Descargando..." : "Descargar todo"}</span>
          </button>
        </div>
      </header>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b" style={{ borderColor: "#0f0f1a" }}>
        <p className="text-sm" style={{ color: "#64748b" }}>
          {photos.length} foto{photos.length !== 1 ? "s" : ""}
          {selectMode && selected.size > 0 && (
            <span style={{ color: "#fbbf24" }}> · {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#1e1e35", color: "#94a3b8" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Seleccionar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={selected.size === photos.length ? clearSelection : selectAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#1e1e35", color: "#94a3b8" }}>
                {selected.size === photos.length ? "Ninguna" : "Todas"}
              </button>
              <button onClick={exitSelectMode}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#1e1e35", color: "#94a3b8" }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Photo Grid ─────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {visiblePhotos.map((photo, i) => {
            const isSelected = selected.has(i);
            return (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-xl cursor-pointer group"
                style={{
                  background: "#0f0f1a",
                  border: `2px solid ${isSelected ? "#f59e0b" : "transparent"}`,
                  transition: "border-color 0.15s",
                }}
                onClick={() => selectMode ? toggleSelect(i) : setLightboxIdx(i)}
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {!selectMode && (
                  <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); void downloadPhoto(photo.url, photo.filename); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                      title="Descargar"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                )}

                {selectMode && (
                  <div className="absolute top-2 left-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isSelected ? "#f59e0b" : "rgba(0,0,0,0.5)",
                        border: `2px solid ${isSelected ? "#f59e0b" : "rgba(255,255,255,0.4)"}`,
                        backdropFilter: "blur(4px)",
                      }}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex flex-col items-center gap-2 mt-8">
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{ background: "#1e1e35", color: "#94a3b8", border: "1px solid #2a2a45" }}
            >
              Ver más fotos ({photos.length - visibleCount} restantes)
            </button>
            <p className="text-xs" style={{ color: "#334155" }}>
              Mostrando {visibleCount} de {photos.length}
            </p>
          </div>
        )}

        <p className="text-center text-xs mt-8 mb-4" style={{ color: "#334155" }}>
          {isPublicInit ? "Este link es público y no tiene expiración." : "Este link expira en 72 hs desde la aprobación del pago."}
        </p>
      </div>

      {/* ── Bottom action bar (select mode) ────────────────────────── */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6 pt-3"
          style={{ background: "linear-gradient(to top, #07070f 60%, transparent)", pointerEvents: "none" }}>
          <div className="w-full max-w-sm mx-auto flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ pointerEvents: "all", background: "#0f0f1a", borderColor: "#1e1e35" }}>
            <span className="text-sm font-medium text-white flex-1">
              {selected.size} foto{selected.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleDownloadSelected}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
          </div>
        </div>
      )}

      {/* ── Lightbox ───────────────────────────────────────────────── */}
      {lightboxIdx !== null && currentPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.96)" }} onClick={closeLightbox}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
            <span className="text-sm" style={{ color: "#94a3b8" }}>{lightboxIdx + 1} / {photos.length}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void downloadPhoto(currentPhoto.url, currentPhoto.filename)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "#f59e0b18", color: "#fbbf24", border: "1px solid #f59e0b30" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </button>
              <button onClick={closeLightbox} className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#1e1e35", color: "#94a3b8" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative px-12 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <img src={currentPhoto.url} alt={currentPhoto.filename}
              className="max-w-full max-h-full object-contain select-none"
              style={{ maxHeight: "calc(100vh - 140px)" }} />
            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} className="absolute left-2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={nextPhoto} className="absolute right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex-shrink-0 py-3 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs" style={{ color: "#475569" }}>{currentPhoto.filename}</p>
          </div>

          <div className="flex-shrink-0 flex gap-1.5 px-4 pb-4 overflow-x-auto justify-center"
            onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: "none" }}>
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setLightboxIdx(i)}
                className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all"
                style={{ border: `2px solid ${i === lightboxIdx ? "#f59e0b" : "transparent"}`, opacity: i === lightboxIdx ? 1 : 0.4 }}>
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
