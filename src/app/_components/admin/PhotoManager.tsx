"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";

type Photo = {
  id: string;
  filename: string;
  storageKey: string;
  url: string | null;
};

export function PhotoManager({ folderId, photos }: { folderId: string; photos: Photo[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [singleConfirm, setSingleConfirm] = useState<string | null>(null); // photo id

  const del = api.photo.delete.useMutation({ onSuccess: () => router.refresh() });
  const bulkDelete = api.photo.bulkDelete.useMutation({
    onSuccess: () => {
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border py-10 text-center" style={{ background: "#0a0a15", borderColor: "#1e1e35" }}>
        <p className="text-slate-500 text-sm">No hay fotos aún. Subí algunas desde el panel izquierdo.</p>
      </div>
    );
  }

  const singlePhoto = singleConfirm ? photos.find((p) => p.id === singleConfirm) : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "#64748b" }}>
          {photos.length} foto{photos.length !== 1 ? "s" : ""}
          {selectMode && selected.size > 0 && (
            <span style={{ color: "#fbbf24" }}> · {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
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
        {photos.map((photo) => {
          const isSelected = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-pointer"
              style={{
                background: "#0f0f1a",
                border: `2px solid ${isSelected ? "#f59e0b" : "transparent"}`,
                transition: "border-color 0.15s",
              }}
              onClick={() => selectMode && toggleSelect(photo.id)}
            >
              {photo.url ? (
                <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-center px-2" style={{ color: "#475569" }}>
                  {photo.filename}
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

              {/* Hover delete (non-select mode) */}
              {!selectMode && (
                <div className="absolute inset-0 flex items-end justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }}>
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
    </div>
  );
}
