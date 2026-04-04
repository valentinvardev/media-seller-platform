"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
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

// ─── Hover preview tooltip ────────────────────────────────────────────────────

function FolderPreviewTooltip({
  folderId,
  mouseX,
  mouseY,
}: {
  folderId: string;
  mouseX: number;
  mouseY: number;
}) {
  const { data: urls, isLoading } = api.folder.adminGetPreviews.useQuery(
    { id: folderId },
    { staleTime: 5 * 60 * 1000 }, // cache 5 min — avoids refetch on every hover
  );

  // Offset so the box doesn't sit under the cursor
  const offsetX = 16;
  const offsetY = -20;
  const boxW = 220;
  const boxH = 220;

  // Keep inside viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let left = mouseX + offsetX;
  let top  = mouseY + offsetY;
  if (left + boxW > vw - 8) left = mouseX - boxW - offsetX;
  if (top  + boxH > vh - 8) top  = vh - boxH - 8;
  if (top < 8) top = 8;

  return (
    <div
      className="fixed z-50 rounded-xl overflow-hidden shadow-2xl pointer-events-none"
      style={{
        left,
        top,
        width: boxW,
        height: boxH,
        background: "#0f0f1a",
        border: "1px solid #2a2a45",
      }}
    >
      {isLoading || !urls ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#f59e0b30", borderTopColor: "#f59e0b" }} />
        </div>
      ) : urls.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-8 h-8" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
      ) : (
        <div
          className="w-full h-full grid gap-px"
          style={{ gridTemplateColumns: `repeat(${urls.length === 1 ? 1 : urls.length <= 4 ? 2 : 3}, 1fr)` }}
        >
          {urls.map((url, i) => (
            <div key={i} className="overflow-hidden">
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                // load smaller decoded image — browser fetches full but renders tiny
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Folder row ───────────────────────────────────────────────────────────────

function FolderRow({
  folder,
  collectionId,
}: {
  folder: Folder;
  collectionId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [overActions, setOverActions] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const handleMouseEnter = () => {
    showTimer.current = setTimeout(() => setVisible(true), 120);
    setHovered(true);
  };
  const handleMouseLeave = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    setVisible(false);
    setHovered(false);
    setOverActions(false);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between transition-all"
      style={{
        background: hovered ? "#131325" : "#0f0f1a",
        border: `1px solid ${hovered ? "#2a2a45" : "#1e1e35"}`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
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

      <div
        className="flex items-center gap-2"
        onMouseEnter={() => setOverActions(true)}
        onMouseLeave={() => setOverActions(false)}
      >
        <Link
          href={`/admin/colecciones/${collectionId}/carpetas/${folder.id}`}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "#f59e0b" }}
        >
          Editar
        </Link>
        <FolderActions id={folder.id} isPublished={folder.isPublished} isPublic={folder.isPublic} />
      </div>

      {visible && !overActions && folder._count.photos > 0 && (
        <FolderPreviewTooltip folderId={folder.id} mouseX={mouse.x} mouseY={mouse.y} />
      )}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "#475569" }}>
          {folders.length} carpeta{folders.length !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
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

      <div className="flex flex-col gap-2">
        {sorted.map((folder) => (
          <FolderRow key={folder.id} folder={folder} collectionId={collectionId} />
        ))}
      </div>
    </div>
  );
}
