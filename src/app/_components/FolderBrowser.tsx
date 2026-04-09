"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { BibCheckoutModal } from "~/app/_components/FolderModal";
import { useCart } from "~/app/_components/CartContext";

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden shadow-2xl w-full"
        style={{ maxWidth: 720, maxHeight: "90vh", borderRadius: 0, background: "transparent" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image — no frame */}
        <img src={url} alt="" className="w-full object-contain" style={{ maxHeight: "75vh", display: "block" }} />

        {/* Bottom overlay */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-white/95 backdrop-blur-sm">
          <div>
            {bibNumber && <p className="text-sm font-bold text-gray-900">Dorsal #{bibNumber}</p>}
            <p className="text-xs text-gray-400 mt-0.5">Vista previa · descargá en HD sin marca de agua</p>
          </div>
          {bibNumber && (
            <button onClick={onBuy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-700 uppercase tracking-wide text-white text-xs transition-all hover:scale-105 shrink-0"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}>
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

// ─── Photo frame tile ─────────────────────────────────────────────────────────

function PhotoTile({
  photoId,
  bibNumber,
  price,
  inCart,
  onOpenLightbox,
  onToggleCart,
}: {
  photoId: string;
  bibNumber: string | null;
  price: number;
  inCart: boolean;
  onOpenLightbox: (url: string) => void;
  onToggleCart: () => void;
}) {
  const { data, isLoading } = api.photo.getPreviewUrls.useQuery({ ids: [photoId] });
  const url = data?.[0]?.url;

  const [cartAnim, setCartAnim] = useState<"add" | "remove" | null>(null);
  const [showFloat, setShowFloat] = useState(false);

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCartAnim(inCart ? "remove" : "add");
    if (!inCart) setShowFloat(true);
    onToggleCart();
    setTimeout(() => setCartAnim(null), 450);
    setTimeout(() => setShowFloat(false), 650);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col">
      {/* Image area */}
      <div
        className="relative overflow-hidden cursor-pointer bg-gray-100"
        style={{ aspectRatio: "4/3" }}
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

        {/* Eye icon overlay — desktop hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-white text-xs font-semibold bg-black/50 rounded-full px-2 py-0.5">
              Vista previa
            </span>
          </div>
        </div>
      </div>

      {/* Frame bottom — price + cart */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-t border-gray-100">
        <div className="min-w-0">
          {bibNumber ? (
            <p className="text-xs font-bold text-gray-700 truncate">Dorsal #{bibNumber}</p>
          ) : (
            <p className="text-xs text-gray-400 truncate">Sin dorsal</p>
          )}
          {price > 0 && bibNumber && (
            <p className="text-sm font-extrabold" style={{ color: "#0057A8" }}>
              ${price.toLocaleString("es-AR")}
            </p>
          )}
        </div>

        {bibNumber && (
          <div className="relative shrink-0">
            {/* Floating +1 */}
            {showFloat && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-extrabold animate-float-up pointer-events-none"
                style={{ color: "#0057A8" }}>
                +1
              </span>
            )}
            <button
              onClick={handleCart}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                inCart
                  ? "text-white"
                  : "text-blue-700 bg-blue-50 hover:bg-blue-100"
              }`}
              style={inCart ? { background: "#0057A8" } : {}}
              title={inCart ? "Quitar del carrito" : "Agregar al carrito"}
            >
              <svg
                className={`w-4 h-4 ${cartAnim === "add" ? "animate-cart-pop" : cartAnim === "remove" ? "animate-cart-remove" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                {inCart ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                )}
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bib group card (search results) ─────────────────────────────────────────

function BibCard({
  bib,
  photoIds,
  price,
  isFuzzy,
  onOpen,
}: {
  bib: string;
  photoIds: string[];
  price: number;
  isFuzzy: boolean;
  onOpen: () => void;
}) {
  const { data: urls, isLoading } = api.photo.getPreviewUrls.useQuery(
    { ids: photoIds.slice(0, 4) },
    { enabled: photoIds.length > 0 },
  );

  return (
    <button onClick={onOpen}
      className="group relative flex flex-col overflow-hidden rounded-2xl border text-left bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 card-hover"
      style={{ borderColor: isFuzzy ? "#fde68a" : "#e5e7eb" }}>
      {isFuzzy && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          similar
        </div>
      )}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
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
          <span className="px-4 py-2 rounded-xl font-display font-700 uppercase tracking-wider text-white text-xs shadow-lg" style={{ background: "#0057A8" }}>
            Ver fotos
          </span>
        </div>
      </div>
      <div className="p-3 border-t border-gray-100 flex items-center justify-between">
        <div>
          <span className="font-bold text-gray-900 text-sm block">#{bib}</span>
          <span className="text-xs text-gray-400">{photoIds.length} foto{photoIds.length !== 1 ? "s" : ""}</span>
        </div>
        {price > 0 && (
          <span className="font-extrabold text-sm" style={{ color: "#0057A8" }}>
            ${price.toLocaleString("es-AR")}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Floating cart bar ────────────────────────────────────────────────────────

function CartBar({
  cart,
  price,
  onCheckout,
  onClear,
}: {
  cart: Set<string>;
  price: number;
  onCheckout: () => void;
  onClear: () => void;
}) {
  if (cart.size === 0) return null;
  const total = cart.size * price;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-blue-100"
        style={{ background: "white", minWidth: 280 }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#0057A8" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900">{cart.size} dorsal{cart.size !== 1 ? "es" : ""} seleccionado{cart.size !== 1 ? "s" : ""}</p>
          {price > 0 && <p className="text-xs text-gray-400">Total: ${total.toLocaleString("es-AR")}</p>}
        </div>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600 p-1" title="Vaciar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button onClick={onCheckout}
          className="px-4 py-2 rounded-xl font-display font-700 uppercase tracking-wide text-white text-xs transition-all hover:scale-105 shrink-0"
          style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}>
          Comprar
        </button>
      </div>
    </div>
  );
}

// ─── Main FolderBrowser ───────────────────────────────────────────────────────

export function FolderBrowser({ collectionId, pricePerBib }: { collectionId: string; pricePerBib: number }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [faceActive, setFaceActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [faceBibs, setFaceBibs] = useState<{ bib: string; photoIds: string[] }[] | null>(null);
  // modal: bib checkout
  const [modal, setModal] = useState<{ bib: string; photoIds: string[] } | null>(null);
  // lightbox: single photo preview
  const [lightbox, setLightbox] = useState<{ url: string; bibNumber: string | null; photoIds: string[] } | null>(null);
  // cart: from shared context (shared with nav)
  const { cart, toggle: toggleCart, clear: clearCart } = useCart();

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

  // Build first bib/photoIds for cart checkout (multi-bib checkout — buy all in cart)
  const cartCheckout = () => {
    const bibs = Array.from(cart);
    if (bibs.length === 0) return;
    // For simplicity open modal for first bib — could extend to multi-bib
    const firstBib = bibs[0]!;
    const photoIds = allPhotos?.filter((p) => p.bibNumber === firstBib).map((p) => p.id) ?? [];
    setModal({ bib: firstBib, photoIds });
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-5 py-8 pb-24">

      {/* ── Mobile legend ──────────────────────────────────── */}
      <div className="sm:hidden mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <p className="text-xs text-blue-700">Tocá una foto para ver la vista previa y comprarla</p>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            inputMode="numeric"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscá por número de dorsal..."
            className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm font-medium outline-none transition-all"
            style={{ boxShadow: search ? "0 0 0 3px rgba(0,87,168,0.12)" : undefined, borderColor: search ? "#0057A8" : "#e5e7eb" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">
              ✕
            </button>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { setFaceActive(!faceActive); if (faceActive) { setFaceBibs(null); setFaceStatus("idle"); } }}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: faceActive ? "#0057A8" : "#9ca3af", background: faceActive ? "#E8F3FF" : "transparent" }}>
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
                  className="px-5 py-2 rounded-lg font-semibold text-white text-sm" style={{ background: "#0057A8" }}>
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

      {/* ── Face results ───────────────────────────────────── */}
      {showingFace && faceBibs && faceBibs.length > 0 && (
        <div className="mb-10">
          <SectionLabel label="Resultados por reconocimiento facial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {faceBibs.map((g) => (
              <BibCard key={g.bib} bib={g.bib} photoIds={g.photoIds} price={pricePerBib} isFuzzy={false}
                onOpen={() => setModal({ bib: g.bib, photoIds: g.photoIds })} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bib search results ─────────────────────────────── */}
      {hasSearch && (
        <>
          {searchLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                  <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: "4/3" }} />
                  <div className="p-3"><div className="h-4 w-16 rounded animate-pulse bg-gray-100" /></div>
                </div>
              ))}
            </div>
          )}
          {noResults && (
            <div className="text-center py-16">
              <p className="font-display font-700 uppercase text-gray-700 text-xl mb-1">Sin resultados para #{debouncedSearch}</p>
              <p className="text-sm text-gray-400">Verificá el número o usá la búsqueda por selfie</p>
            </div>
          )}
          {!searchLoading && exactGroups.length > 0 && (
            <div className="mb-10">
              {fuzzyGroups.length > 0 && <SectionLabel label="Resultado exacto" />}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {exactGroups.map((g) => (
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} price={pricePerBib} isFuzzy={false}
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
                  <BibCard key={g.bib} bib={g.bib} photoIds={g.photos.map((p) => p.id)} price={pricePerBib} isFuzzy
                    onOpen={() => setModal({ bib: g.bib, photoIds: g.photos.map((p) => p.id) })} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Full photo gallery ─────────────────────────────── */}
      {!hasSearch && !showingFace && (
        <>
          {galleryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white border border-gray-200">
                  <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: "4/3" }} />
                  <div className="p-3 h-12 animate-pulse bg-gray-50" />
                </div>
              ))}
            </div>
          ) : allPhotos && allPhotos.length > 0 ? (
            <>
              {/* Desktop legend */}
              <p className="hidden sm:block text-xs text-gray-400 mb-5 text-center">
                {allPhotos.length} foto{allPhotos.length !== 1 ? "s" : ""} ·
                <span className="inline-flex items-center gap-1 ml-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  clic para vista previa ·
                </span>
                <span className="inline-flex items-center gap-1 ml-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  carrito para comprar
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {allPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photoId={p.id}
                    bibNumber={p.bibNumber}
                    price={pricePerBib}
                    inCart={p.bibNumber ? cart.has(p.bibNumber) : false}
                    onOpenLightbox={(url) => {
                      const allSameBib = p.bibNumber
                        ? allPhotos.filter((ph) => ph.bibNumber === p.bibNumber).map((ph) => ph.id)
                        : [p.id];
                      setLightbox({ url, bibNumber: p.bibNumber, photoIds: allSameBib });
                    }}
                    onToggleCart={() => { if (p.bibNumber) toggleCart(p.bibNumber); }}
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

      {/* ── Photo lightbox ─────────────────────────────────── */}
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

      {/* ── Floating cart bar ──────────────────────────────── */}
      <CartBar cart={cart} price={pricePerBib} onCheckout={cartCheckout} onClear={clearCart} />

      {/* ── Checkout modal ─────────────────────────────────── */}
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
