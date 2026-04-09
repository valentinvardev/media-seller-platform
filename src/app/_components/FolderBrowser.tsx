"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { BibCheckoutModal } from "~/app/_components/FolderModal";

// ─── Single photo tile ────────────────────────────────────────────────────────

function PhotoTile({
  photoId,
  bibNumber,
  collectionId,
  onOpenBib,
}: {
  photoId: string;
  bibNumber: string | null;
  collectionId: string;
  onOpenBib: (bib: string, photoIds: string[]) => void;
}) {
  const { data, isLoading } = api.photo.getPreviewUrls.useQuery(
    { ids: [photoId] },
    { enabled: true },
  );
  const url = data?.[0]?.url;

  return (
    <div
      className="relative group aspect-square overflow-hidden rounded-xl bg-gray-100 cursor-pointer"
      onClick={() => {
        if (bibNumber) onOpenBib(bibNumber, [photoId]);
      }}
    >
      {isLoading || !url ? (
        <div className="w-full h-full animate-pulse bg-gray-200" />
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Bib badge */}
      {bibNumber && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-sm">
          #{bibNumber}
        </div>
      )}

      {/* Hover overlay */}
      {bibNumber && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
          <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-lg">
            Ver / Comprar
          </span>
        </div>
      )}

      {/* No bib — show locked icon */}
      {!bibNumber && (
        <div className="absolute inset-0 flex items-end justify-start p-2 pointer-events-none">
          <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Bib group card (search results) ─────────────────────────────────────────

function BibCard({
  bib,
  photoIds,
  collectionId,
  isFuzzy,
  onOpen,
}: {
  bib: string;
  photoIds: string[];
  collectionId: string;
  isFuzzy: boolean;
  onOpen: () => void;
}) {
  const { data: urls, isLoading } = api.photo.getPreviewUrls.useQuery(
    { ids: photoIds.slice(0, 4) },
    { enabled: photoIds.length > 0 },
  );

  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 text-left bg-white hover:border-amber-300 hover:shadow-md transition-all duration-200"
    >
      {isFuzzy && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          similar
        </div>
      )}

      {/* Photo grid */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
        {isLoading ? (
          <div className="w-full h-full grid grid-cols-2 gap-px">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200" />
            ))}
          </div>
        ) : urls && urls.length > 0 ? (
          <div className="grid grid-cols-2 w-full h-full gap-px">
            {urls.slice(0, 4).map((u, i) => (
              <div key={i} className="overflow-hidden">
                <img src={u.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 rounded-xl font-bold text-white text-xs bg-amber-500 shadow-lg">Ver fotos</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-900 text-sm">#{bib}</span>
          <span className="text-xs text-gray-400">{photoIds.length} foto{photoIds.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main FolderBrowser ───────────────────────────────────────────────────────

export function FolderBrowser({ collectionId }: { collectionId: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [faceActive, setFaceActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [faceBibs, setFaceBibs] = useState<{ bib: string; photoIds: string[] }[] | null>(null);
  const [modal, setModal] = useState<{ bib: string; photoIds: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  // All photos for the gallery
  const { data: allPhotos, isLoading: galleryLoading } = api.photo.listAll.useQuery({ collectionId });

  // Bib search (only when typing)
  const hasSearch = debouncedSearch.length > 0;
  const { data: searchData, isLoading: searchLoading } = api.photo.searchByBib.useQuery(
    { collectionId, bib: debouncedSearch },
    { enabled: hasSearch },
  );

  const exactGroups = searchData?.exact ?? [];
  const fuzzyGroups = searchData?.fuzzy ?? [];
  const noResults = hasSearch && !searchLoading && exactGroups.length === 0 && fuzzyGroups.length === 0;

  // Group all photos by bibNumber for gallery (when not searching)
  const galleryGroups = useMemo(() => {
    if (!allPhotos) return [];
    const map = new Map<string | null, string[]>();
    for (const p of allPhotos) {
      const key = p.bibNumber;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p.id);
    }
    return Array.from(map.entries());
  }, [allPhotos]);

  const handleFaceUpload = async (file: File) => {
    setFaceStatus("uploading");
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1] ?? "");
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/face-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, collectionId }),
      });
      if (!resp.ok) throw new Error();
      const json = await resp.json() as { folderIds: string[] };
      setFaceBibs(json.folderIds.map((id) => ({ bib: id, photoIds: [id] })));
      setFaceStatus("done");
    } catch {
      setFaceStatus("error");
    }
  };

  const showingFace = faceActive && faceStatus === "done" && faceBibs !== null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscá por número de dorsal..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selfie search */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setFaceActive(!faceActive);
              if (faceActive) { setFaceBibs(null); setFaceStatus("idle"); }
            }}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: faceActive ? "#d97706" : "#9ca3af", background: faceActive ? "#fef3c7" : "transparent" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
            Buscar con selfie
          </button>
        </div>

        {/* Selfie upload panel */}
        {faceActive && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col items-center gap-3">
            <p className="text-amber-700 text-xs text-center">
              Subí una selfie — buscamos en qué dorsales aparecés
            </p>
            {faceStatus === "idle" && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFaceUpload(f); }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-5 py-2 rounded-lg font-semibold text-white text-sm bg-amber-500 hover:bg-amber-600 transition-colors"
                >
                  Subir foto
                </button>
              </>
            )}
            {faceStatus === "uploading" && (
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                Analizando...
              </div>
            )}
            {faceStatus === "done" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {faceBibs?.length
                    ? `Encontramos ${faceBibs.length} coincidencia${faceBibs.length !== 1 ? "s" : ""}`
                    : "No encontramos tu cara en esta colección"}
                </p>
                <button onClick={() => { setFaceStatus("idle"); setFaceBibs(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  Intentar con otra foto
                </button>
              </div>
            )}
            {faceStatus === "error" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-red-500 text-sm">No pudimos analizar la imagen</p>
                <button onClick={() => { setFaceStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Reintentar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Face results ─────────────────────────────────────── */}
      {showingFace && faceBibs && faceBibs.length > 0 && (
        <div className="mb-10">
          <SectionLabel label="Resultados por reconocimiento facial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {faceBibs.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photoIds} collectionId={collectionId} isFuzzy={false}
                onOpen={() => setModal({ bib: g.bib, photoIds: g.photoIds })} />
            ))}
          </div>
        </div>
      )}

      {/* ── Search results ───────────────────────────────────── */}
      {hasSearch && (
        <>
          {searchLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                  <div className="aspect-square animate-pulse bg-gray-100" />
                  <div className="p-3"><div className="h-4 w-16 rounded animate-pulse bg-gray-100" /></div>
                </div>
              ))}
            </div>
          )}

          {noResults && (
            <div className="text-center py-16 mb-10">
              <p className="font-semibold text-gray-700 mb-1">Sin resultados para #{debouncedSearch}</p>
              <p className="text-sm text-gray-400">Verificá el número o usá la búsqueda por selfie</p>
            </div>
          )}

          {!searchLoading && exactGroups.length > 0 && (
            <div className="mb-10">
              {fuzzyGroups.length > 0 && <SectionLabel label="Resultado exacto" />}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {exactGroups.map((g) => (
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} collectionId={collectionId}
                    isFuzzy={false} onOpen={() => setModal({ bib: g.bib, photoIds: g.photos.map((p) => p.id) })} />
                ))}
              </div>
            </div>
          )}

          {!searchLoading && fuzzyGroups.length > 0 && (
            <div className="mb-10">
              <SectionLabel label="Números similares — ¿es el tuyo?" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {fuzzyGroups.map((g) => (
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} collectionId={collectionId}
                    isFuzzy onOpen={() => setModal({ bib: g.bib, photoIds: g.photos.map((p) => p.id) })} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Full photo gallery (no search) ──────────────────── */}
      {!hasSearch && !showingFace && (
        <>
          {galleryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : allPhotos && allPhotos.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-4 text-center">
                {allPhotos.length} fotos · buscá tu dorsal para encontrar las tuyas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {allPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photoId={p.id}
                    bibNumber={p.bibNumber}
                    collectionId={collectionId}
                    onOpenBib={(bib, ids) => {
                      // Find all photos with same bib for modal
                      const allSameBib = allPhotos
                        .filter((ph) => ph.bibNumber === bib)
                        .map((ph) => ph.id);
                      setModal({ bib, photoIds: allSameBib });
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">No hay fotos en esta colección aún</p>
            </div>
          )}
        </>
      )}

      {/* ── Checkout modal ───────────────────────────────────── */}
      {modal && (
        <BibCheckoutModal
          bib={modal.bib}
          photoIds={modal.photoIds}
          collectionId={collectionId}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
