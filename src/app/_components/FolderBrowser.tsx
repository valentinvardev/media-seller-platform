"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { BibCheckoutModal } from "~/app/_components/FolderModal";

// ─── Bib Result Card ─────────────────────────────────────────────────────────

function BibCard({
  bib,
  photoIds,
  collectionId,
  isFuzzy,
}: {
  bib: string;
  photoIds: string[];
  collectionId: string;
  isFuzzy: boolean;
}) {
  const [open, setOpen] = useState(false);

  const { data: urls, isLoading } = api.photo.getPreviewUrls.useQuery(
    { ids: photoIds.slice(0, 4) },
    { enabled: photoIds.length > 0 },
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1"
        style={{ background: "#0c0c16", borderColor: isFuzzy ? "#f59e0b25" : "#1a1a2e" }}
      >
        {isFuzzy && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "#f59e0b15", color: "#fbbf24", border: "1px solid #f59e0b30" }}>
            similar
          </div>
        )}

        {/* Photo grid — skeleton while loading */}
        <div className="relative w-full aspect-square overflow-hidden" style={{ background: "#13131f" }}>
          {isLoading ? (
            <div className="w-full h-full grid grid-cols-2 gap-px">
              {[0,1,2,3].map((i) => (
                <div key={i} className="animate-pulse" style={{ background: "#1a1a2e" }} />
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
              <svg className="w-10 h-10" style={{ color: "#252540" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-4 py-2 rounded-xl font-bold text-black text-xs" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}>
              Ver fotos
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-700 uppercase text-white text-sm">#{bib}</span>
            <span className="text-xs text-slate-500">{photoIds.length} foto{photoIds.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </button>

      {open && (
        <BibCheckoutModal
          bib={bib}
          photoIds={photoIds}
          collectionId={collectionId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Main BibSearch ───────────────────────────────────────────────────────────

export function FolderBrowser({ collectionId }: { collectionId: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Face search
  const [faceActive, setFaceActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [faceBibs, setFaceBibs] = useState<{ bib: string; photoIds: string[] }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = api.photo.searchByBib.useQuery(
    { collectionId, bib: debouncedSearch },
    { enabled: debouncedSearch.length > 0 },
  );

  const exactGroups = data?.exact ?? [];
  const fuzzyGroups = data?.fuzzy ?? [];

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
      // folderIds here are photo IDs grouped — for now show as a list
      setFaceBibs(json.folderIds.map((id) => ({ bib: id, photoIds: [id] })));
      setFaceStatus("done");
    } catch {
      setFaceStatus("error");
    }
  };

  const showingFace = faceActive && faceStatus === "done" && faceBibs !== null;
  const hasSearch = debouncedSearch.length > 0;
  const noResults = hasSearch && !isLoading && exactGroups.length === 0 && fuzzyGroups.length === 0;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      {/* Search bar */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ingresá tu número de dorsal..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl text-white placeholder-slate-600 text-lg font-medium outline-none border transition-all"
            style={{
              background: "#0c0c16",
              borderColor: search ? "#f59e0b50" : "#1a1a2e",
            }}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors text-xs"
              style={{ background: "#252540" }}
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
            className="flex items-center gap-2 text-sm font-medium transition-colors px-4 py-2 rounded-xl"
            style={{
              color: faceActive ? "#f59e0b" : "#475569",
              background: faceActive ? "#f59e0b10" : "transparent",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
            Buscar con selfie
          </button>
        </div>

        {/* Selfie upload panel */}
        {faceActive && (
          <div className="mt-3 rounded-2xl border p-4 flex flex-col items-center gap-3"
            style={{ background: "#0a0a15", borderColor: "#f59e0b25" }}>
            <p className="text-slate-500 text-xs text-center">
              Subí una foto con tu cara — buscamos en qué dorsales aparecés
            </p>

            {faceStatus === "idle" && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFaceUpload(f); }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-6 py-2.5 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                >
                  Subir foto
                </button>
              </>
            )}

            {faceStatus === "uploading" && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                Analizando...
              </div>
            )}

            {faceStatus === "done" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium" style={{ color: faceBibs?.length ? "#34d399" : "#94a3b8" }}>
                  {faceBibs?.length
                    ? `Encontramos ${faceBibs.length} coincidencia${faceBibs.length !== 1 ? "s" : ""}`
                    : "No encontramos tu cara en esta colección"}
                </p>
                <button onClick={() => { setFaceStatus("idle"); setFaceBibs(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Intentar con otra foto
                </button>
              </div>
            )}

            {faceStatus === "error" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-red-400 text-sm">No pudimos analizar la imagen</p>
                <button onClick={() => { setFaceStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Reintentar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Face results */}
      {showingFace && faceBibs && faceBibs.length > 0 && (
        <div className="mb-10">
          <Divider label="Resultados por reconocimiento facial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {faceBibs.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photoIds} collectionId={collectionId} isFuzzy={false} />
            ))}
          </div>
        </div>
      )}

      {/* Bib search loading */}
      {hasSearch && isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "#0c0c16", border: "1px solid #1a1a2e" }}>
              <div className="aspect-square animate-pulse" style={{ background: "#13131f" }} />
              <div className="p-3">
                <div className="h-4 w-16 rounded animate-pulse" style={{ background: "#1a1a2e" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="text-center py-16">
          <p className="font-display font-700 uppercase text-xl text-white mb-2">Sin resultados para #{debouncedSearch}</p>
          <p className="text-slate-600 text-sm">Verificá el número o probá con la búsqueda por selfie</p>
        </div>
      )}

      {/* Exact results */}
      {!isLoading && exactGroups.length > 0 && (
        <>
          {fuzzyGroups.length > 0 && <Divider label="Resultado exacto" />}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {exactGroups.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} collectionId={collectionId} isFuzzy={false} />
            ))}
          </div>
        </>
      )}

      {/* Fuzzy results */}
      {!isLoading && fuzzyGroups.length > 0 && (
        <>
          <Divider label="Números similares — ¿es el tuyo?" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {fuzzyGroups.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} collectionId={collectionId} isFuzzy />
            ))}
          </div>
        </>
      )}

      {/* Empty state — no search yet */}
      {!hasSearch && !showingFace && (
        <div className="text-center py-12">
          <p className="text-slate-700 text-sm">Ingresá tu dorsal para encontrar tus fotos</p>
        </div>
      )}
    </section>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1" style={{ background: "#1a1a2e" }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#252540" }}>{label}</span>
      <div className="h-px flex-1" style={{ background: "#1a1a2e" }} />
    </div>
  );
}
