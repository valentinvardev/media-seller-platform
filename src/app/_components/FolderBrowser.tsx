"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { FolderModal } from "~/app/_components/FolderModal";

function FolderCard({
  folder,
  isFuzzy,
  onClick,
}: {
  folder: {
    id: string;
    number: string;
    price: { toString(): string };
    isPublic: boolean;
    photoCount: number;
    updatedAt: Date;
    hasWatermarkedPreviews: boolean;
    previewUrls: string[];
    isFuzzy?: boolean;
  };
  isFuzzy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "#0f0f1a",
        borderColor: isFuzzy ? "#f59e0b30" : "#1e1e35",
      }}
    >
      {isFuzzy && (
        <div
          className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: "#f59e0b20", color: "#fbbf24", border: "1px solid #f59e0b40" }}
        >
          similar
        </div>
      )}

      {/* Preview grid */}
      <div className="relative w-full aspect-square overflow-hidden" style={{ background: "#16162a" }}>
        {folder.previewUrls.length > 0 ? (
          <div className="grid grid-cols-2 w-full h-full gap-px">
            {folder.previewUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#f59e0b" }}>
            {folder.isPublic ? (
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
        <div className="absolute inset-0 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px #f59e0b40" }} />
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-white text-sm">#{folder.number}</span>
          {folder.isPublic ? (
            <span className="text-xs font-semibold" style={{ color: "#34d399" }}>Gratis</span>
          ) : (
            <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
              ${Number(folder.price).toLocaleString("es-AR")}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {folder.photoCount} foto{folder.photoCount !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

export function FolderBrowser({ collectionId }: { collectionId: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sort, setSort] = useState<"num-asc" | "num-desc" | "recent">("num-asc");

  // Face search state
  const [faceSearchActive, setFaceSearchActive] = useState(false);
  const [faceSearchStatus, setFaceSearchStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [faceFolderIds, setFaceFolderIds] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders, isLoading } = api.folder.listByCollection.useQuery({
    collectionId,
    search: debouncedSearch || undefined,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
      () => setDebouncedSearch(value),
      350,
    );
  };

  const handleFaceSearch = async (file: File) => {
    setFaceSearchStatus("uploading");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/face-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, collectionId }),
      });

      if (!res.ok) throw new Error("Face search failed");
      const data = await res.json() as { folderIds: string[] };
      setFaceFolderIds(data.folderIds);
      setFaceSearchStatus("done");
    } catch {
      setFaceSearchStatus("error");
    }
  };

  // Separate exact vs fuzzy
  const exactFolders = folders?.filter((f) => !f.isFuzzy) ?? [];
  const fuzzyFolders = folders?.filter((f) => f.isFuzzy) ?? [];

  const sortFolders = <T extends { number: string; updatedAt: Date }>(list: T[]) =>
    [...list].sort((a, b) => {
      if (sort === "num-asc") return Number(a.number) - Number(b.number);
      if (sort === "num-desc") return Number(b.number) - Number(a.number);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Face search filtered folders
  const faceMatchedFolders =
    faceFolderIds !== null && folders
      ? folders.filter((f) => faceFolderIds.includes(f.id))
      : null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      {/* Search */}
      <div className="mb-8">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-slate-400 text-sm mb-4">
            Ingresá tu número de dorsal para encontrar tu carpeta
          </p>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Número de dorsal..."
              className="w-full pl-12 pr-12 py-4 rounded-2xl text-white placeholder-slate-500 text-lg font-medium outline-none transition-all border focus:border-amber-500/50"
              style={{ background: "#0f0f1a", borderColor: search ? "#f59e0b50" : "#1e1e35" }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                style={{ background: "#2a2a45" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Face recognition toggle */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              onClick={() => { setFaceSearchActive(!faceSearchActive); setFaceFolderIds(null); setFaceSearchStatus("idle"); }}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: faceSearchActive ? "#f59e0b" : "#64748b" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Buscar por mi foto
            </button>

            {faceSearchActive && (
              <div
                className="w-full rounded-2xl border p-4 flex flex-col items-center gap-3"
                style={{ background: "#0a0a15", borderColor: "#f59e0b30" }}
              >
                <p className="text-slate-400 text-xs text-center">
                  Subí una foto con tu cara y buscaremos carpetas donde aparezcás
                </p>

                {faceSearchStatus === "idle" && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFaceSearch(file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl font-semibold text-black text-sm transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                    >
                      Subir foto
                    </button>
                  </>
                )}

                {faceSearchStatus === "uploading" && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    Analizando tu foto...
                  </div>
                )}

                {faceSearchStatus === "done" && (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-sm font-medium" style={{ color: "#34d399" }}>
                      {faceMatchedFolders?.length
                        ? `Encontramos ${faceMatchedFolders.length} carpeta${faceMatchedFolders.length !== 1 ? "s" : ""} con tu rostro`
                        : "No encontramos carpetas con tu rostro"}
                    </p>
                    <button
                      onClick={() => { setFaceFolderIds(null); setFaceSearchStatus("idle"); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Buscar otra vez
                    </button>
                  </div>
                )}

                {faceSearchStatus === "error" && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-red-400 text-sm">No pudimos analizar la imagen. Intentá con otra foto.</p>
                    <button
                      onClick={() => { setFaceSearchStatus("idle"); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Buscando carpetas...</p>
        </div>
      )}

      {/* Face match results */}
      {!isLoading && faceMatchedFolders !== null && (
        <div className="mb-10">
          {faceMatchedFolders.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
                  Resultados por reconocimiento facial
                </span>
                <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortFolders(faceMatchedFolders).map((folder) => (
                  <FolderCard key={folder.id} folder={folder} onClick={() => setSelectedFolderId(folder.id)} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 rounded-2xl border" style={{ background: "#0a0a15", borderColor: "#1e1e35" }}>
              <p className="text-white font-medium mb-1">No encontramos tu cara en esta colección</p>
              <p className="text-slate-500 text-sm">Probá con otra foto o buscá tu dorsal manualmente</p>
            </div>
          )}
        </div>
      )}

      {/* No results for dorsal search */}
      {!isLoading && !faceMatchedFolders && folders?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#0f0f1a" }}>
            {debouncedSearch ? (
              <svg className="w-7 h-7" style={{ color: "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" style={{ color: "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            )}
          </div>
          <p className="text-white font-medium mb-2">
            {debouncedSearch ? `No se encontró el dorsal #${debouncedSearch}` : "Sin carpetas disponibles"}
          </p>
          <p className="text-slate-500 text-sm">
            {debouncedSearch ? "Verificá el número e intentá de nuevo" : "Esta colección no tiene carpetas publicadas aún"}
          </p>
        </div>
      )}

      {/* Sort bar */}
      {!isLoading && !faceMatchedFolders && folders && folders.length > 0 && (
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-slate-500 text-sm">
            {debouncedSearch
              ? `${exactFolders.length} resultado${exactFolders.length !== 1 ? "s" : ""}${fuzzyFolders.length > 0 ? ` · ${fuzzyFolders.length} similares` : ""}`
              : `${folders.length} carpeta${folders.length !== 1 ? "s" : ""} disponible${folders.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "#0f0f1a", border: "1px solid #1e1e35" }}>
            {([
              { value: "num-asc",  label: "# Menor" },
              { value: "num-desc", label: "# Mayor" },
              { value: "recent",   label: "Recientes" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: sort === opt.value ? "#1e1e35" : "transparent",
                  color: sort === opt.value ? "#f1f5f9" : "#475569",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exact results grid */}
      {!isLoading && !faceMatchedFolders && exactFolders.length > 0 && (
        <>
          {debouncedSearch && (
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>
                Resultado exacto
              </span>
              <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {sortFolders(exactFolders).map((folder) => (
              <FolderCard key={folder.id} folder={folder} onClick={() => setSelectedFolderId(folder.id)} />
            ))}
          </div>
        </>
      )}

      {/* Fuzzy results grid */}
      {!isLoading && !faceMatchedFolders && fuzzyFolders.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>
              Números similares — ¿puede ser el tuyo?
            </span>
            <div className="h-px flex-1" style={{ background: "#1e1e35" }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortFolders(fuzzyFolders).map((folder) => (
              <FolderCard key={folder.id} folder={folder} isFuzzy onClick={() => setSelectedFolderId(folder.id)} />
            ))}
          </div>
        </>
      )}

      {/* No-search full grid */}
      {!isLoading && !faceMatchedFolders && !debouncedSearch && folders && folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortFolders(folders).map((folder) => (
            <FolderCard key={folder.id} folder={folder} onClick={() => setSelectedFolderId(folder.id)} />
          ))}
        </div>
      )}

      {selectedFolderId && (
        <FolderModal folderId={selectedFolderId} onClose={() => setSelectedFolderId(null)} />
      )}
    </section>
  );
}
