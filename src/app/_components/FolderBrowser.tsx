"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { BibCheckoutModal } from "~/app/_components/FolderModal";

// ─── Photo lightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({
  url,
  bibNumber,
  onClose,
  onBuy,
}: {
  url: string;
  bibNumber: string | null;
  onClose: () => void;
  onBuy: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative bg-gray-100" style={{ maxHeight: "65vh" }}>
          <img src={url} alt="" className="w-full object-contain" style={{ maxHeight: "65vh" }} />
          {/* Watermark notice */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2 text-center text-xs font-medium text-white/80"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
            Vista previa con marca de agua
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-5 py-4 flex items-center justify-between gap-4 bg-white border-t border-gray-100">
          <div>
            {bibNumber && (
              <p className="text-sm font-bold text-gray-900">Dorsal #{bibNumber}</p>
            )}
            <p className="text-xs text-gray-400">Comprá para descargar en HD sin marca</p>
          </div>
          {bibNumber && (
            <button
              onClick={onBuy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Comprar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Single photo tile ────────────────────────────────────────────────────────

function PhotoTile({
  photoId,
  bibNumber,
  onOpenLightbox,
}: {
  photoId: string;
  bibNumber: string | null;
  onOpenLightbox: (url: string) => void;
}) {
  const { data, isLoading } = api.photo.getPreviewUrls.useQuery({ ids: [photoId] });
  const url = data?.[0]?.url;

  return (
    <div
      className="relative group aspect-square overflow-hidden rounded-xl bg-gray-100 cursor-pointer select-none"
      onClick={() => { if (url) onOpenLightbox(url); }}
    >
      {isLoading || !url ? (
        <div className="w-full h-full animate-pulse bg-gray-200" />
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Bib badge */}
      {bibNumber && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-black/55 text-white backdrop-blur-sm">
          #{bibNumber}
        </div>
      )}

      {/* Hover overlay with cart */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-lg">
            <svg className="w-5 h-5" style={{ color: "#0057A8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {bibNumber && (
            <span className="text-white text-xs font-semibold bg-black/50 rounded-full px-2 py-0.5">
              Ver #{bibNumber}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bib group card (search results) ─────────────────────────────────────────

function BibCard({
  bib,
  photoIds,
  isFuzzy,
  onOpen,
}: {
  bib: string;
  photoIds: string[];
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border text-left bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200"
      style={{ borderColor: isFuzzy ? "#fde68a" : "#e5e7eb" }}
    >
      {isFuzzy && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          similar
        </div>
      )}

      {/* 2×2 grid preview */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
        {isLoading ? (
          <div className="w-full h-full grid grid-cols-2 gap-px">
            {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-200" />)}
          </div>
        ) : urls && urls.length > 0 ? (
          <div className="grid grid-cols-2 w-full h-full gap-px">
            {urls.slice(0, 4).map((u, i) => (
              <div key={i} className="overflow-hidden bg-gray-100">
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

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 rounded-xl font-bold text-white text-xs shadow-lg"
            style={{ background: "#0057A8" }}>
            Ver fotos
          </span>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3 border-t border-gray-100 flex items-center justify-between">
        <span className="font-bold text-gray-900 text-sm">#{bib}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{photoIds.length} foto{photoIds.length !== 1 ? "s" : ""}</span>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#E8F3FF" }}>
            <svg className="w-3.5 h-3.5" style={{ color: "#0057A8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
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
  const [lightbox, setLightbox] = useState<{ url: string; bibNumber: string | null; photoIds: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allPhotos, isLoading: galleryLoading } = api.photo.listAll.useQuery({ collectionId });

  const hasSearch = debouncedSearch.length > 0;
  const { data: searchData, isLoading: searchLoading } = api.photo.searchByBib.useQuery(
    { collectionId, bib: debouncedSearch },
    { enabled: hasSearch },
  );

  const exactGroups = searchData?.exact ?? [];
  const fuzzyGroups = searchData?.fuzzy ?? [];
  const noResults = hasSearch && !searchLoading && exactGroups.length === 0 && fuzzyGroups.length === 0;

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
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Search bar ─────────────────────────────────── */}
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
            className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm font-medium outline-none transition-all"
            style={{ boxShadow: search ? "0 0 0 3px rgba(0,87,168,0.12)" : undefined, borderColor: search ? "#0057A8" : "#e5e7eb" }}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* Selfie search toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => { setFaceActive(!faceActive); if (faceActive) { setFaceBibs(null); setFaceStatus("idle"); } }}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: faceActive ? "#0057A8" : "#9ca3af", background: faceActive ? "#E8F3FF" : "transparent" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
            Buscar con selfie
          </button>
        </div>

        {faceActive && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col items-center gap-3">
            <p className="text-blue-700 text-xs text-center">Subí una selfie — buscamos en qué dorsales aparecés</p>
            {faceStatus === "idle" && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFaceUpload(f); }} />
                <button onClick={() => fileRef.current?.click()}
                  className="px-5 py-2 rounded-lg font-semibold text-white text-sm transition-colors"
                  style={{ background: "#0057A8" }}>
                  Subir foto
                </button>
              </>
            )}
            {faceStatus === "uploading" && (
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                Analizando...
              </div>
            )}
            {faceStatus === "done" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {faceBibs?.length ? `${faceBibs.length} coincidencia${faceBibs.length !== 1 ? "s" : ""}` : "No encontramos tu cara"}
                </p>
                <button onClick={() => { setFaceStatus("idle"); setFaceBibs(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-gray-500 hover:text-gray-700">Intentar con otra foto</button>
              </div>
            )}
            {faceStatus === "error" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-red-500 text-sm">No pudimos analizar la imagen</p>
                <button onClick={() => { setFaceStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-gray-500 hover:text-gray-700">Reintentar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Face results ───────────────────────────────── */}
      {showingFace && faceBibs && faceBibs.length > 0 && (
        <div className="mb-10">
          <SectionLabel label="Resultados por reconocimiento facial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {faceBibs.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photoIds} isFuzzy={false}
                onOpen={() => setModal({ bib: g.bib, photoIds: g.photoIds })} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bib search results ─────────────────────────── */}
      {hasSearch && (
        <>
          {searchLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {exactGroups.map((g) => (
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} isFuzzy={false}
                    onOpen={() => setModal({ bib: g.bib, photoIds: g.photos.map((p) => p.id) })} />
                ))}
              </div>
            </div>
          )}
          {!searchLoading && fuzzyGroups.length > 0 && (
            <div className="mb-10">
              <SectionLabel label="Números similares — ¿es el tuyo?" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {fuzzyGroups.map((g) => (
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} isFuzzy
                    onOpen={() => setModal({ bib: g.bib, photoIds: g.photos.map((p) => p.id) })} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Full photo gallery ─────────────────────────── */}
      {!hasSearch && !showingFace && (
        <>
          {galleryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : allPhotos && allPhotos.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-5 text-center">
                {allPhotos.length} foto{allPhotos.length !== 1 ? "s" : ""} · buscá tu dorsal para encontrar las tuyas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {allPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photoId={p.id}
                    bibNumber={p.bibNumber}
                    onOpenLightbox={(url) => {
                      const allSameBib = p.bibNumber
                        ? allPhotos.filter((ph) => ph.bibNumber === p.bibNumber).map((ph) => ph.id)
                        : [p.id];
                      setLightbox({ url, bibNumber: p.bibNumber, photoIds: allSameBib });
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

      {/* ── Photo lightbox ─────────────────────────────── */}
      {lightbox && (
        <PhotoLightbox
          url={lightbox.url}
          bibNumber={lightbox.bibNumber}
          onClose={() => setLightbox(null)}
          onBuy={() => {
            if (lightbox.bibNumber) {
              setModal({ bib: lightbox.bibNumber, photoIds: lightbox.photoIds });
              setLightbox(null);
            }
          }}
        />
      )}

      {/* ── Checkout modal ─────────────────────────────── */}
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
