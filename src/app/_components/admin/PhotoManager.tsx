"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";

type Photo = {
  id: string;
  filename: string;
  bibNumber: string | null;
  storageKey: string;
  url: string | null;
};

// ── Multi-bib editor ──────────────────────────────────────────────────────────

function MultiBibEditor({ photo }: { photo: Photo }) {
  const router = useRouter();
  // editingIdx: null = idle, -1 = adding new, 0+ = editing existing
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [inputVal, setInputVal] = useState("");

  const setBib = api.photo.setBibNumber.useMutation({ onSuccess: () => router.refresh() });

  const bibs = photo.bibNumber
    ? photo.bibNumber.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  const saveBibs = (newBibs: string[]) => {
    const val = newBibs.filter(Boolean).join(",") || null;
    if (val !== photo.bibNumber) {
      setBib.mutate({ id: photo.id, bibNumber: val });
    }
    setEditingIdx(null);
    setInputVal("");
  };

  const commitEdit = () => {
    const val = inputVal.trim();
    if (editingIdx === -1) {
      if (val && !bibs.includes(val)) saveBibs([...bibs, val]);
      else { setEditingIdx(null); setInputVal(""); }
    } else if (editingIdx !== null && editingIdx >= 0) {
      const next = bibs.map((b, i) => (i === editingIdx ? val : b)).filter(Boolean);
      saveBibs(next);
    }
  };

  const removeBib = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    saveBibs(bibs.filter((_, i) => i !== idx));
  };

  const startEdit = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setInputVal(bibs[idx] ?? "");
    setEditingIdx(idx);
  };

  const startAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputVal("");
    setEditingIdx(-1);
  };

  const sharedInput = (
    <input
      autoFocus
      type="text"
      value={inputVal}
      onChange={(e) => setInputVal(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") { setEditingIdx(null); setInputVal(""); }
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="dorsal"
      className="w-16 text-xs px-1.5 py-0.5 rounded border border-blue-400 bg-white text-gray-800 focus:outline-none"
      style={{ minWidth: 0 }}
    />
  );

  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {bibs.map((bib, idx) =>
        editingIdx === idx ? (
          sharedInput
        ) : (
          <span
            key={idx}
            className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.65)", color: "#fbbf24" }}
          >
            #{bib}
            <button
              onClick={(e) => startEdit(e, idx)}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Editar dorsal"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            <button
              onClick={(e) => removeBib(e, idx)}
              className="ml-0.5 opacity-60 hover:text-red-400 hover:opacity-100 transition-all"
              title="Quitar dorsal"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ),
      )}

      {editingIdx === -1 ? (
        sharedInput
      ) : (
        <button
          onClick={startAdd}
          className="text-xs px-1.5 py-0.5 rounded font-semibold transition-all hover:bg-white/20"
          style={{
            background: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.75)",
            border: "1px dashed rgba(255,255,255,0.35)",
          }}
          title="Agregar dorsal"
        >
          + dorsal
        </button>
      )}

      {setBib.isPending && (
        <span className="text-xs text-white/50">guardando...</span>
      )}
    </div>
  );
}

// ── Lightbox bib editor (same logic, different styling) ───────────────────────

function LightboxBibEditor({ photo }: { photo: Photo }) {
  const router = useRouter();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [inputVal, setInputVal] = useState("");

  const setBib = api.photo.setBibNumber.useMutation({ onSuccess: () => router.refresh() });

  const bibs = photo.bibNumber
    ? photo.bibNumber.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  const saveBibs = (newBibs: string[]) => {
    const val = newBibs.filter(Boolean).join(",") || null;
    if (val !== photo.bibNumber) setBib.mutate({ id: photo.id, bibNumber: val });
    setEditingIdx(null);
    setInputVal("");
  };

  const commitEdit = () => {
    const val = inputVal.trim();
    if (editingIdx === -1) {
      if (val && !bibs.includes(val)) saveBibs([...bibs, val]);
      else { setEditingIdx(null); setInputVal(""); }
    } else if (editingIdx !== null && editingIdx >= 0) {
      saveBibs(bibs.map((b, i) => (i === editingIdx ? val : b)).filter(Boolean));
    }
  };

  const input = (
    <input
      autoFocus
      type="text"
      value={inputVal}
      onChange={(e) => setInputVal(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") { setEditingIdx(null); setInputVal(""); }
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="dorsal"
      className="w-16 text-xs px-1.5 py-0.5 rounded border border-blue-400 bg-white text-gray-800 focus:outline-none"
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {bibs.map((bib, idx) =>
        editingIdx === idx ? (
          input
        ) : (
          <span key={idx} className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)" }}>
            #{bib}
            <button onClick={(e) => { e.stopPropagation(); setInputVal(bib); setEditingIdx(idx); }}
              className="ml-0.5 opacity-60 hover:opacity-100">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); saveBibs(bibs.filter((_, i) => i !== idx)); }}
              className="ml-0.5 opacity-60 hover:text-red-400 hover:opacity-100">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ),
      )}

      {editingIdx === -1 ? input : (
        <button onClick={(e) => { e.stopPropagation(); setInputVal(""); setEditingIdx(-1); }}
          className="text-xs px-2 py-1 rounded-full font-semibold"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", border: "1px dashed rgba(255,255,255,0.3)" }}>
          + dorsal
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PhotoManager({ photos }: { collectionId: string; photos: Photo[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [singleConfirm, setSingleConfirm] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const del = api.photo.delete.useMutation({ onSuccess: () => router.refresh() });
  const bulkDelete = api.photo.bulkDelete.useMutation({
    onSuccess: () => { setSelected(new Set()); setSelectMode(false); router.refresh(); },
  });

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto = useCallback(() => setLightboxIdx((i) => i !== null ? (i - 1 + photos.length) % photos.length : null), [photos.length]);
  const nextPhoto = useCallback(() => setLightboxIdx((i) => i !== null ? (i + 1) % photos.length : null), [photos.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightboxIdx, closeLightbox, prevPhoto, nextPhoto]);

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 py-10 text-center bg-gray-50">
        <p className="text-gray-400 text-sm">No hay fotos aún. Subí algunas desde arriba.</p>
      </div>
    );
  }

  const singlePhoto = singleConfirm ? photos.find((p) => p.id === singleConfirm) : null;
  const currentPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {photos.length} foto{photos.length !== 1 ? "s" : ""}
          {selectMode && selected.size > 0 && (
            <span className="text-blue-600"> · {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {selectMode && selected.size > 0 && (
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkDelete.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}
            >
              {bulkDelete.isPending ? "Eliminando..." : `Eliminar (${selected.size})`}
            </button>
          )}
          {selectMode ? (
            <div className="flex gap-1">
              <button onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:text-gray-900">
                {selected.size === photos.length ? "Ninguna" : "Todas"}
              </button>
              <button onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setSelectMode(true)}
              className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:text-gray-900">
              Seleccionar
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          const bibs = photo.bibNumber
            ? photo.bibNumber.split(",").map((b) => b.trim()).filter(Boolean)
            : [];
          const isUnidentified = bibs.length === 0;

          return (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-pointer"
              style={{
                background: "#f1f5f9",
                border: `2px solid ${isSelected ? "#2563eb" : isUnidentified ? "#fde68a" : "transparent"}`,
                transition: "border-color 0.15s",
              }}
              onClick={() => selectMode ? toggleSelect(photo.id) : setLightboxIdx(i)}
            >
              {photo.url ? (
                <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-center px-2 text-gray-400">{photo.filename}</div>
              )}

              {/* Always-visible bib summary badge (hides on hover) */}
              <div className="absolute top-1.5 left-1.5 z-10 transition-opacity duration-200 group-hover:opacity-0">
                {bibs.length > 0 ? (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fbbf24" }}>
                    #{bibs[0]}{bibs.length > 1 ? ` +${bibs.length - 1}` : ""}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px dashed #ef444460" }}>
                    sin dorsal
                  </span>
                )}
              </div>

              {/* Select checkbox */}
              {selectMode && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
                  style={{ background: isSelected ? "#2563eb" : "rgba(255,255,255,0.8)", border: `2px solid ${isSelected ? "#2563eb" : "rgba(0,0,0,0.2)"}` }}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              )}

              {/* Hover overlay — bib management + delete */}
              {!selectMode && (
                <div
                  className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)" }}
                >
                  {/* Delete button top-right */}
                  <div className="absolute top-1.5 right-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSingleConfirm(photo.id); }}
                      disabled={del.isPending}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.25)", color: "#f87171" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Bib management at bottom */}
                  <div className="p-2">
                    <MultiBibEditor photo={photo} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {bulkConfirm && <ConfirmModal title={`Eliminar ${selected.size} fotos`} message="Esta acción no se puede deshacer." onConfirm={() => { setBulkConfirm(false); bulkDelete.mutate({ ids: Array.from(selected) }); }} onCancel={() => setBulkConfirm(false)} />}
      {singleConfirm && singlePhoto && <ConfirmModal title="Eliminar foto" message={`Se eliminará "${singlePhoto.filename}".`} onConfirm={() => { setSingleConfirm(null); del.mutate({ id: singleConfirm }); }} onCancel={() => setSingleConfirm(null)} />}

      {/* Lightbox */}
      {lightboxIdx !== null && currentPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.95)" }} onClick={closeLightbox}>
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 gap-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentPhoto.filename}</p>
              <p className="text-xs mt-0.5" style={{ color: currentPhoto.bibNumber ? "#fbbf24" : "#f87171" }}>
                {currentPhoto.bibNumber
                  ? currentPhoto.bibNumber.split(",").map(b => `#${b.trim()}`).join(" · ")
                  : "Sin dorsal identificado"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <LightboxBibEditor photo={currentPhoto} />
              <button onClick={closeLightbox} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-white flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative px-14" onClick={(e) => e.stopPropagation()}>
            <img src={currentPhoto.url ?? ""} alt={currentPhoto.filename} className="max-w-full max-h-full object-contain" style={{ maxHeight: "calc(100vh - 130px)" }} draggable={false} />
            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextPhoto} className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
