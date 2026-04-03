"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderActions } from "./FolderActions";

type Folder = {
  id: string;
  number: string;
  isPublished: boolean;
  isPublic: boolean;
  updatedAt: Date;
  _count: { photos: number };
};

type SortKey = "num-asc" | "num-desc" | "recent" | "oldest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "num-asc",  label: "Número: menor a mayor" },
  { value: "num-desc", label: "Número: mayor a menor" },
  { value: "recent",   label: "Modificadas: recientes" },
  { value: "oldest",   label: "Modificadas: antiguas" },
];

export function FolderList({ folders, collectionId }: { folders: Folder[]; collectionId: string }) {
  const [sort, setSort] = useState<SortKey>("num-asc");

  const sorted = [...folders].sort((a, b) => {
    if (sort === "num-asc")  return Number(a.number) - Number(b.number);
    if (sort === "num-desc") return Number(b.number) - Number(a.number);
    if (sort === "recent")   return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  if (folders.length === 0) {
    return <p className="text-gray-500">No hay carpetas aún.</p>;
  }

  return (
    <div>
      {/* Sort dropdown */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "#475569" }}>
          {folders.length} carpeta{folders.length !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs outline-none cursor-pointer transition-colors"
            style={{ background: "#1e1e35", color: "#94a3b8", border: "1px solid #2a2a45" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {sorted.map((folder) => (
          <div
            key={folder.id}
            className="rounded-xl px-4 py-3 flex items-center justify-between transition-all hover:border-white/10"
            style={{ background: "#0f0f1a", border: "1px solid #1e1e35" }}
          >
            <div className="flex items-center gap-3">
              {/* Lock / unlock icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={folder.isPublic
                  ? { background: "#6366f120", color: "#818cf8" }
                  : { background: "#f59e0b15", color: "#f59e0b" }}
                title={folder.isPublic ? "Carpeta pública" : "Carpeta privada"}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {folder.isPublic ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
              </div>
              <span className="font-mono text-white font-semibold">#{folder.number}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={folder.isPublished
                  ? { background: "#10b98120", color: "#34d399" }
                  : { background: "#ffffff10", color: "#64748b" }}
              >
                {folder.isPublished ? "Publicada" : "Oculta"}
              </span>
              <span className="text-slate-500 text-sm">{folder._count.photos} fotos</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/colecciones/${collectionId}/carpetas/${folder.id}`}
                className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "#f59e0b" }}
              >
                Editar
              </Link>
              <FolderActions id={folder.id} isPublished={folder.isPublished} isPublic={folder.isPublic} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
