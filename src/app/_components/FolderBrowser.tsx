"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { FolderModal } from "~/app/_components/FolderModal";

export function FolderBrowser({ collectionId }: { collectionId: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sort, setSort] = useState<"num-asc" | "num-desc" | "recent">("num-asc");

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

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      {/* Search */}
      <div className="mb-10">
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
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Buscando carpetas...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && folders?.length === 0 && (
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

      {/* Results count + sort */}
      {!isLoading && folders && folders.length > 0 && (
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-slate-500 text-sm">
            {debouncedSearch
              ? `${folders.length} resultado${folders.length !== 1 ? "s" : ""} para "${debouncedSearch}"`
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

      {/* Grid */}
      {!isLoading && folders && folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...folders].sort((a, b) => {
            if (sort === "num-asc")  return Number(a.number) - Number(b.number);
            if (sort === "num-desc") return Number(b.number) - Number(a.number);
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }).map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1"
              style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
            >
              {/* Preview grid */}
              <div className="relative w-full aspect-square overflow-hidden" style={{ background: "#16162a" }}>
                {folder.previewUrls.length > 0 ? (
                  <div className="grid grid-cols-2 w-full h-full gap-px">
                    {folder.previewUrls.slice(0, 4).map((url, i) => (
                      <div key={i} className="overflow-hidden">
                        <img
                          src={url}
                          alt=""
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            !folder.isPublic && !folder.hasWatermarkedPreviews
                              ? "blur-sm scale-110 brightness-75"
                              : ""
                          }`}
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

                {/* Hover overlay — lock for private, eye for public */}
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

                {/* Hover border */}
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
          ))}
        </div>
      )}

      {selectedFolderId && (
        <FolderModal folderId={selectedFolderId} onClose={() => setSelectedFolderId(null)} />
      )}
    </section>
  );
}
