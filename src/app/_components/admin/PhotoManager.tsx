"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";

type Photo = {
  id: string;
  filename: string;
  storageKey: string;
  url: string | null;
  isPreview: boolean;
  previewKey: string | null;
};

export function PhotoManager({ folderId, photos }: { folderId: string; photos: Photo[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [singleConfirm, setSingleConfirm] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const del = api.photo.delete.useMutation({ onSuccess: () => router.refresh() });
  const bulkDelete = api.photo.bulkDelete.useMutation({
    onSuccess: () => {
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    },
  });
  const setPreview = api.photo.setPreview.useMutation({ onSuccess: () => router.refresh() });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePreviewToggle = async (photo: Photo) => {
    if (photo.isPreview) {
      setPreview.mutate({ id: photo.id, isPreview: false });
      return;
    }
    setGeneratingPreview(photo.id);
    try {
      const res = await fetch("/api/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id }),
      });
      if (!res.ok) throw new Error("Watermark failed");
      router.refresh();
    } finally {
      setGeneratingPreview(null);
    }
  };

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() => { setZoom(1); setLightboxIdx((i) => i !== null ? (i - 1 + photos.length) % photos.length : null); }, [photos.length]);
  const next = useCallback(() => { setZoom(1); setLightboxIdx((i) => i !== null ? (i + 1) % photos.length : null); }, [photos.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.88 : 1.12;
    setZoom((z) => Math.min(5, Math.max(1, z * factor)));
  }, []);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, closeLightbox, prev, next]);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border py-10 text-center" style={{ background: "#0a0a15", borderColor: "#1e1e35" }}>
        <p className="text-slate-500 text-sm">No hay fotos aún. Subí algunas desde el panel izquierdo.</p>
      </div>
    );
  }

  const singlePhoto = singleConfirm ? photos.find((p) => p.id === singleConfirm) : null;
  const currentPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "#64748b" }}>
          {photos.length} foto{photos.length !== 1 ? "s" : ""}
          {selectMode && selected.size > 0 && (
            <span style={{ color: "#fbbf24" }}> · {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
          )}
          {photos.filter((p) => p.isPreview).length > 0 && (
            <span style={{ color: "#818cf8" }}> · {photos.filter((p) => p.isPreview).length} preview{photos.filter((p) => p.isPreview).length !== 1 ? "s" : ""}</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {selectMode && selected.size > 0 && (
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkDelete.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {bulkDelete.isPending ? "Eliminando..." : `Eliminar (${selected.size})`}
            </button>
          )}
          {selectMode ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: "#1e1e35", color: "#94a3b8" }}
              >
                {selected.size === photos.length ? "Ninguna" : "Todas"}
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: "#1e1e35", color: "#94a3b8" }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: "#1e1e35", color: "#94a3b8" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Seleccionar
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          const isGenerating = generatingPreview === photo.id;
          return (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-pointer"
              style={{
                background: "#0f0f1a",
                border: `2px solid ${isSelected ? "#f59e0b" : photo.isPreview ? "#6366f180" : "transparent"}`,
                transition: "border-color 0.15s",
              }}
              onClick={() => {
                if (selectMode) { toggleSelect(photo.id); return; }
                setLightboxIdx(i);
              }}
            >
              {photo.url ? (
                <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-center px-2" style={{ color: "#475569" }}>
                  {photo.filename}
                </div>
              )}

              {/* Preview badge */}
              {photo.isPreview && (
                <div className="absolute top-1.5 right-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#6366f1" }}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Select checkbox */}
              {selectMode && (
                <div className="absolute top-1.5 left-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: isSelected ? "#f59e0b" : "rgba(0,0,0,0.5)",
                      border: `2px solid ${isSelected ? "#f59e0b" : "rgba(255,255,255,0.4)"}`,
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}

              {/* Hover actions (non-select mode) */}
              {!selectMode && (
                <div className="absolute inset-0 flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }}>
                  {/* Expand icon bottom-left */}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Preview toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); void handlePreviewToggle(photo); }}
                      disabled={isGenerating || setPreview.isPending}
                      title={photo.isPreview ? "Quitar preview" : "Usar como preview con marca de agua"}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                      style={{
                        background: photo.isPreview ? "#6366f150" : "rgba(0,0,0,0.4)",
                        color: photo.isPreview ? "#818cf8" : "#94a3b8",
                      }}
                    >
                      {isGenerating ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill={photo.isPreview ? "currentColor" : "none"} viewBox="0 0 20 20" stroke="currentColor" strokeWidth={photo.isPreview ? 0 : 1.5}>
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </button>
                    {/* Delete bottom-right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSingleConfirm(photo.id); }}
                      disabled={del.isPending}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                      style={{ background: "#ef444430", color: "#f87171" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk delete confirm */}
      {bulkConfirm && (
        <ConfirmModal
          title={`Eliminar ${selected.size} foto${selected.size !== 1 ? "s" : ""}`}
          message="Se eliminarán las fotos seleccionadas. Esta acción no se puede deshacer."
          onConfirm={() => { setBulkConfirm(false); bulkDelete.mutate({ ids: Array.from(selected) }); }}
          onCancel={() => setBulkConfirm(false)}
        />
      )}

      {/* Single delete confirm */}
      {singleConfirm && singlePhoto && (
        <ConfirmModal
          title="Eliminar foto"
          message={`Se eliminará "${singlePhoto.filename}". Esta acción no se puede deshacer.`}
          onConfirm={() => { setSingleConfirm(null); del.mutate({ id: singleConfirm }); }}
          onCancel={() => setSingleConfirm(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.97)" }}
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div>
                <p className="text-white text-sm font-medium truncate">{currentPhoto.filename}</p>
                <p className="text-xs" style={{ color: "#475569" }}>{lightboxIdx + 1} / {photos.length}</p>
              </div>
              {currentPhoto.isPreview && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#6366f120", color: "#818cf8" }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Preview
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setSingleConfirm(currentPhoto.id); closeLightbox(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444430" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
              <button
                onClick={closeLightbox}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#1e1e35", color: "#64748b" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center relative px-14 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
          >
            <img
              src={currentPhoto.url ?? ""}
              alt={currentPhoto.filename}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                maxHeight: "calc(100vh - 130px)",
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                transition: zoom === 1 ? "transform 0.2s ease" : "none",
                cursor: zoom > 1 ? "zoom-out" : "zoom-in",
              }}
              draggable={false}
              onDoubleClick={() => setZoom(1)}
            />
            {zoom > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1 rounded-full pointer-events-none"
                style={{ background: "rgba(0,0,0,0.6)", color: "#94a3b8" }}>
                {Math.round(zoom * 10) / 10}× · doble clic para restablecer
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button onClick={prev}
                  className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={next}
                  className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          <div
            className="flex-shrink-0 flex gap-1.5 px-4 pb-4 overflow-x-auto justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightboxIdx(i)}
                className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all relative"
                style={{ border: `2px solid ${i === lightboxIdx ? "#f59e0b" : "transparent"}`, opacity: i === lightboxIdx ? 1 : 0.35 }}
              >
                {p.url && <img src={p.url} alt="" className="w-full h-full object-cover" />}
                {p.isPreview && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: "#6366f1" }}>
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
