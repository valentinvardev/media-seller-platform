"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Photo = {
  id: string;
  filename: string;
  storageKey: string;
  url: string | null;
};

export function PhotoManager({
  folderId,
  photos,
}: {
  folderId: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const del = api.photo.delete.useMutation({ onSuccess: () => router.refresh() });

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border py-10 text-center" style={{ background: "#0a0a15", borderColor: "#1e1e35" }}>
        <p className="text-slate-500 text-sm">No hay fotos aún. Subí algunas desde el panel izquierdo.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square" style={{ background: "#0f0f1a" }}>
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-center px-2" style={{ color: "#475569" }}>
              {photo.filename}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <p className="text-white text-xs text-center px-2 truncate w-full text-center">{photo.filename}</p>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${photo.filename}"?`)) {
                  del.mutate({ id: photo.id });
                }
              }}
              disabled={del.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
