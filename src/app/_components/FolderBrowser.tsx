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
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <img src={url} alt="" className="w-full object-contain" style={{ maxHeight: "75vh", display: "block" }} />

        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-white/95 backdrop-blur-sm">
          <div>
            {bibNumber
            ? <p className="text-sm font-bold text-gray-900">Dorsal #{bibNumber}</p>
            : <p className="text-sm font-bold text-gray-900">Foto sin dorsal</p>}
            <p className="text-xs text-gray-400 mt-0.5">Vista previa · descargá en HD sin marca de agua</p>
          </div>
          <button onClick={onBuy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-700 uppercase tracking-wide text-white text-xs transition-all hover:scale-105 shrink-0"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Photo tile — borderless, object-top ──────────────────────────────────────

function PhotoTile({
  photoId,
  bibNumber,
  price,
  inCart,
  isFuzzy,
  onOpenLightbox,
  onToggleCart,
}: {
  photoId: string;
  bibNumber: string | null;
  price: number;
  inCart: boolean;
  isFuzzy?: boolean;
  onOpenLightbox: (url: string) => void;
  onToggleCart: (url: string) => void;
}) {
  const { data, isLoading } = api.photo.getPreviewUrls.useQuery({ ids: [photoId] });
  const url = data?.[0]?.url;

  const [cartAnim, setCartAnim] = useState<"add" | "remove" | null>(null);

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    setCartAnim(inCart ? "remove" : "add");
    onToggleCart(url);
    setTimeout(() => setCartAnim(null), 400);
  };

  return (
    <div
      className="relative overflow-hidden group cursor-pointer"
      style={{ aspectRatio: "4/3", background: "#e2e8f0" }}
      onClick={() => { if (url) onOpenLightbox(url); }}
    >
      {/* Image */}
      {isLoading || !url ? (
        <div className="w-full h-full animate-pulse bg-gray-200" />
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Bib badge top-left */}
      {bibNumber && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-sm pointer-events-none">
          #{bibNumber}
        </div>
      )}

      {/* Fuzzy badge */}
      {isFuzzy && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold text-white pointer-events-none"
          style={{ background: "rgba(249,115,22,0.9)" }}>
          similar
        </div>
      )}

      {/* Bottom overlay — always visible, price + cart */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-2.5 py-2.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {price > 0 ? (
            <p className="text-sm font-extrabold text-white leading-tight drop-shadow">
              ${price.toLocaleString("es-AR")}
            </p>
          ) : (
            <p className="text-xs text-white/50">Sin precio</p>
          )}
        </div>

        {/* Cart button */}
        <button
          onClick={handleCart}
          disabled={!url}
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-40 ${
            inCart ? "text-white shadow-md" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
          }`}
          style={inCart ? { background: "linear-gradient(135deg, #F97316, #c2410c)" } : {}}
          title={inCart ? "Quitar del carrito" : "Agregar al carrito"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${cartAnim === "add" ? "scale-125" : cartAnim === "remove" ? "scale-75" : "scale-100"}`}
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
    </div>
  );
}

// ─── Floating cart bar ────────────────────────────────────────────────────────

function CartBar({
  count,
  price,
  onCheckout,
  onClear,
}: {
  count: number;
  price: number;
  onCheckout: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  const total = count * price;

  return (
    <div className="fixed bottom-5 left-1/2 z-40" style={{ transform: "translateX(-50%)", animation: "cartSlideUp 0.35s cubic-bezier(0.32,0,0.15,1) both" }}>
      <style>{`@keyframes cartSlideUp { from { transform: translateX(-50%) translateY(100%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-blue-100"
        style={{ background: "white", minWidth: 280 }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#0057A8" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900">{count} foto{count !== 1 ? "s" : ""} seleccionada{count !== 1 ? "s" : ""}</p>
          {price > 0 && <p className="text-xs text-gray-400">Total: ${total.toLocaleString("es-AR")}</p>}
        </div>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600 p-1" title="Vaciar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button onClick={onCheckout}
          className="px-4 py-2 rounded-xl font-display font-700 uppercase tracking-wide text-white text-xs transition-all hover:scale-105 shrink-0"
          style={{ background: "linear-gradient(135deg, #F97316, #c2410c)" }}>
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
  const [faceStatus, setFaceStatus] = useState<"idle" | "uploading" | "done" | "no-face" | "error">("idle");
  const [faceBibs, setFaceBibs] = useState<{ bib: string; photoIds: string[] }[] | null>(null);
  const [modal, setModal] = useState<{ bib: string; photoIds: string[] } | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; bibNumber: string | null; photoIds: string[] } | null>(null);
  const { items: cartItems, inCart: isInCart, toggle: toggleCart, clear: clearCart } = useCart();

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

  // Flatten search results into individual photo entries (same as gallery)
  const exactPhotos = searchData?.exact.flatMap((g) =>
    g.photos.map((p) => ({ ...p, isFuzzy: false })),
  ) ?? [];
  const fuzzyPhotos = searchData?.fuzzy.flatMap((g) =>
    g.photos.map((p) => ({ ...p, isFuzzy: true })),
  ) ?? [];
  const allSearchPhotos = [...exactPhotos, ...fuzzyPhotos];
  const noResults = hasSearch && !searchLoading && allSearchPhotos.length === 0;

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
      const json = await resp.json() as {
        groups: { bib: string; photoIds: string[] }[];
        noFaceDetected?: boolean;
      };
      if (json.noFaceDetected) {
        setFaceStatus("no-face");
        return;
      }
      setFaceBibs(json.groups);
      setFaceStatus("done");
      setFaceActive(true);
    } catch {
      setFaceStatus("error");
    }
  };

  const showingFace = faceActive && faceStatus === "done" && faceBibs !== null;

  const cartCheckout = () => {
    if (cartItems.length === 0) return;
    // Pass all cart photo IDs; bib is empty string when mixed/no bibs
    const allBibs = [...new Set(cartItems.map((i) => i.bibNumber).filter(Boolean))];
    const bib = allBibs.length === 1 ? (allBibs[0] ?? "") : "";
    setModal({ bib, photoIds: cartItems.map((i) => i.photoId) });
  };

  // Shared tile handler factory
  const makeTileHandlers = (p: { id: string; bibNumber: string | null }) => ({
    onOpenLightbox: (url: string) => {
      const sameBibIds = p.bibNumber && allPhotos
        ? allPhotos.filter((ph) => ph.bibNumber === p.bibNumber).map((ph) => ph.id)
        : [p.id];
      setLightbox({ url, bibNumber: p.bibNumber, photoIds: sameBibIds });
    },
    onToggleCart: (url: string) => toggleCart({ photoId: p.id, bibNumber: p.bibNumber, url }),
  });

  const GRID = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5";

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
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
            style={{ color: search ? "#0057A8" : "#F97316" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            inputMode="numeric"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscá tu número"
            className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white text-sm font-bold outline-none transition-all placeholder:text-gray-600 placeholder:font-bold"
            style={{
              color: "#111827",
              border: `2px solid ${search ? "#0057A8" : "#F97316"}`,
              boxShadow: search ? "0 0 0 3px rgba(0,87,168,0.12)" : "0 0 0 3px rgba(249,115,22,0.10)",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              style={{ background: "rgba(0,87,168,0.1)", color: "#0057A8" }}>
              ✕
            </button>
          )}
        </div>

        {/* Selfie search — clicking directly opens file picker */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFaceUpload(f); }} />

        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            onClick={() => {
              if (faceStatus === "uploading") return;
              if (faceStatus === "done" || faceStatus === "error" || faceStatus === "no-face") {
                setFaceStatus("idle"); setFaceBibs(null);
                if (fileRef.current) fileRef.current.value = "";
              }
              fileRef.current?.click();
            }}
            disabled={faceStatus === "uploading"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: faceStatus === "uploading" ? "#93c5fd" : "linear-gradient(135deg, #0057A8 0%, #1d6fd4 100%)",
              color: "#fff",
              boxShadow: faceStatus === "uploading" ? "none" : "0 2px 12px rgba(0,87,168,0.35)",
              cursor: faceStatus === "uploading" ? "not-allowed" : "pointer",
            }}>
            {faceStatus === "uploading" ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                Buscar con selfie
              </>
            )}
          </button>

          {faceStatus === "done" && (
            <p className="text-xs text-gray-500">
              {faceBibs?.length
                ? `${faceBibs.length} coincidencia${faceBibs.length !== 1 ? "s" : ""} · `
                : "Sin coincidencias · "}
              <button onClick={() => { setFaceStatus("idle"); setFaceBibs(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="underline hover:text-gray-700">intentar con otra foto</button>
            </p>
          )}
          {faceStatus === "no-face" && (
            <p className="text-xs text-amber-500">
              No detectamos un rostro claro ·{" "}
              <button onClick={() => { setFaceStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                className="underline hover:text-amber-700">intentar con otra foto</button>
            </p>
          )}
          {faceStatus === "error" && (
            <p className="text-xs text-red-400">
              Error al procesar la imagen ·{" "}
              <button onClick={() => { setFaceStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                className="underline hover:text-red-600">reintentar</button>
            </p>
          )}
        </div>
      </div>

      {/* ── Face results ───────────────────────────────────── */}
      {showingFace && faceBibs && faceBibs.length > 0 && (
        <div className="mb-10">
          <SectionLabel label="Resultados por reconocimiento facial" />
          <div className={GRID}>
            {faceBibs.flatMap((g) =>
              g.photoIds.map((id) => {
                const p = { id, bibNumber: g.bib };
                return (
                  <PhotoTile key={id} photoId={id} bibNumber={g.bib} price={pricePerBib}
                    inCart={isInCart(id)} {...makeTileHandlers(p)} />
                );
              }),
            )}
          </div>
        </div>
      )}

      {/* ── Bib search results — same tiles as gallery ─────── */}
      {hasSearch && (
        <>
          {searchLoading && (
            <div className={GRID}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-gray-200 animate-pulse" style={{ aspectRatio: "4/3" }} />
              ))}
            </div>
          )}
          {noResults && (
            <div className="text-center py-16">
              <p className="font-display font-700 uppercase text-gray-700 text-xl mb-1">Sin resultados para #{debouncedSearch}</p>
              <p className="text-sm text-gray-400">Verificá el número o usá la búsqueda por selfie</p>
            </div>
          )}
          {!searchLoading && allSearchPhotos.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {exactPhotos.length} foto{exactPhotos.length !== 1 ? "s" : ""} para #{debouncedSearch}
                  {fuzzyPhotos.length > 0 && ` · ${fuzzyPhotos.length} similares`}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className={GRID}>
                {allSearchPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photoId={p.id}
                    bibNumber={p.bibNumber}
                    price={pricePerBib}
                    inCart={isInCart(p.id)}
                    isFuzzy={p.isFuzzy}
                    {...makeTileHandlers(p)}
                  />
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
            <div className={GRID}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-gray-200 animate-pulse" style={{ aspectRatio: "4/3" }} />
              ))}
            </div>
          ) : allPhotos && allPhotos.length > 0 ? (
            <>
              <p className="hidden sm:block text-xs text-gray-400 mb-4 text-center">
                {allPhotos.length} foto{allPhotos.length !== 1 ? "s" : ""} · clic para vista previa · carrito para comprar
              </p>
              <div className={GRID}>
                {allPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photoId={p.id}
                    bibNumber={p.bibNumber}
                    price={pricePerBib}
                    inCart={isInCart(p.id)}
                    {...makeTileHandlers(p)}
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
            setModal({ bib: lightbox.bibNumber ?? "", photoIds: lightbox.photoIds });
            setLightbox(null);
          }}
        />
      )}

      {/* ── Floating cart bar ──────────────────────────────── */}
      <CartBar count={cartItems.length} price={pricePerBib} onCheckout={cartCheckout} onClear={clearCart} />

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
