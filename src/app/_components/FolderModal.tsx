"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useCart } from "~/app/_components/CartContext";

// ─── Animations injected once ─────────────────────────────────────────────────

const STYLE_ID = "folder-modal-styles";

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    .modal-sheet   { animation: slideUp 0.32s cubic-bezier(0.32,0,0.15,1) both; }
    .modal-center  { animation: scaleIn 0.22s cubic-bezier(0.32,0,0.15,1) both; }
    .modal-overlay { animation: fadeIn  0.22s ease both; }
    .lightbox-in   { animation: fadeIn  0.18s ease both; }
  `;
  document.head.appendChild(s);
}

// ─── Single-photo fullscreen lightbox ────────────────────────────────────────

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    injectStyles();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center lightbox-in"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={onClose}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={url}
        alt=""
        className="max-w-full max-h-full object-contain"
        style={{ maxHeight: "90vh", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}

// ─── Photo row in the cart list ───────────────────────────────────────────────

function PhotoRow({
  photoId,
  bibNumber,
  price,
  onRemove,
  onPreview,
}: {
  photoId: string;
  bibNumber: string | null;
  price: number;
  onRemove: () => void;
  onPreview: (url: string) => void;
}) {
  const { data } = api.photo.getPreviewUrls.useQuery({ ids: [photoId] });
  const url = data?.[0]?.url;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full animate-pulse bg-gray-200" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {bibNumber ? `Dorsal #${bibNumber}` : "Sin dorsal"}
        </p>
        {price > 0 && (
          <p className="text-xs font-bold mt-0.5" style={{ color: "#F97316" }}>
            ${price.toLocaleString("es-AR")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => { if (url) onPreview(url); }}
          disabled={!url}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-30"
          title="Ver foto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Quitar del carrito"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Checkout modal ───────────────────────────────────────────────────────────

type Step = "cart" | "buy" | "email";

export function BibCheckoutModal({
  bib,
  photoIds: initialPhotoIds,
  collectionId,
  onClose,
}: {
  bib: string;
  photoIds: string[];
  collectionId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [photoIds, setPhotoIds] = useState(initialPhotoIds);

  const { items: cartItems, toggle: toggleCart } = useCart();
  const router = useRouter();

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (photoIds.length === 0) onClose();
  }, [photoIds, onClose]);

  const { data: collectionInfo } = api.collection.getPrice.useQuery({ collectionId });
  const price = collectionInfo?.price ?? 0;
  const total = price * photoIds.length;

  const createPreference = api.purchase.createPreference.useMutation({
    onSuccess: (data) => { if (data.initPoint) window.location.href = data.initPoint; },
  });

  const accessByEmail = api.purchase.accessByEmail.useMutation({
    onSuccess: (token) => {
      if (token) {
        router.push(`/descarga/${token}`);
      } else {
        setEmailError("No encontramos una compra aprobada para este email.");
      }
    },
  });

  const handleRemove = (photoId: string) => {
    setPhotoIds((prev) => prev.filter((id) => id !== photoId));
    const item = cartItems.find((i) => i.photoId === photoId);
    if (item) toggleCart(item);
  };

  const handleBuy = () => {
    if (!email || !name) return;
    createPreference.mutate({
      collectionId,
      bibNumber: bib,
      photoCount: photoIds.length,
      buyerEmail: email,
      buyerName: name,
      buyerLastName: lastName || undefined,
      buyerPhone: phone || undefined,
    });
  };

  const handleEmailAccess = () => {
    if (!emailInput) return;
    setEmailError("");
    accessByEmail.mutate({ email: emailInput, collectionId, bibNumber: bib });
  };

  const inp = "w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 modal-overlay"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet — slides up on mobile, centered on desktop */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <div
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl flex flex-col pointer-events-auto modal-sheet sm:modal-center"
          style={{ maxHeight: "82vh", minHeight: "60vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              {collectionInfo && (
                <p className="text-xs text-gray-400 mb-0.5">{collectionInfo.title}</p>
              )}
              <h2 className="font-bold text-gray-900 text-base">
                {step === "buy" ? "Tus datos" : step === "email" ? "Ya compré" : bib ? `Dorsal #${bib}` : `${photoIds.length} foto${photoIds.length !== 1 ? "s" : ""} seleccionada${photoIds.length !== 1 ? "s" : ""}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Cart step ── */}
          {step === "cart" && (
            <>
              {/* Scrollable photo list */}
              <div className="flex-1 overflow-y-auto px-5 min-h-0" style={{ scrollbarWidth: "thin" }}>
                {photoIds.map((id) => {
                  const cartItem = cartItems.find((i) => i.photoId === id);
                  return (
                    <PhotoRow
                      key={id}
                      photoId={id}
                      bibNumber={cartItem?.bibNumber ?? null}
                      price={price}
                      onRemove={() => handleRemove(id)}
                      onPreview={(url) => setLightboxUrl(url)}
                    />
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 pb-6 pt-4 border-t border-gray-100">
                {price > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      {photoIds.length} foto{photoIds.length !== 1 ? "s" : ""} · HD sin marca de agua
                    </p>
                    <p className="font-bold text-xl" style={{ color: "#F97316" }}>
                      ${total.toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {price > 0 && bib && (
                    <button
                      onClick={() => setStep("buy")}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
                    >
                      Comprar · ${total.toLocaleString("es-AR")}
                    </button>
                  )}
                  <button
                    onClick={() => setStep("email")}
                    className="w-full py-3 rounded-xl font-medium text-sm border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all"
                  >
                    Ya compré — Acceder con email
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Buy step ── */}
          {step === "buy" && (
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-400">{photoIds.length} foto{photoIds.length !== 1 ? "s" : ""}</p>
                <p className="text-sm font-bold" style={{ color: "#F97316" }}>${total.toLocaleString("es-AR")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre *" className={inp} autoFocus />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido" className={inp} />
              </div>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono" className={inp} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *" required className={inp}
                onKeyDown={(e) => { if (e.key === "Enter" && email && name) handleBuy(); }} />
              <button
                onClick={handleBuy}
                disabled={!email || !name || createPreference.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 mt-1"
                style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
              >
                {createPreference.isPending ? "Redirigiendo a MercadoPago..." : `Pagar $${total.toLocaleString("es-AR")}`}
              </button>
              {createPreference.isError && (
                <p className="text-red-500 text-xs text-center">Error: {createPreference.error?.message ?? "Intentá de nuevo."}</p>
              )}
              <button onClick={() => setStep("cart")} className="text-gray-400 hover:text-gray-600 text-sm text-center transition-colors mt-1">
                ← Volver
              </button>
            </div>
          )}

          {/* ── Email access step ── */}
          {step === "email" && (
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-3 min-h-0">
              <div className="text-center mb-2">
                <p className="text-base font-bold text-gray-900">Acceder a tus fotos</p>
                <p className="text-sm text-gray-400 mt-1">
                  Ingresá el email con el que compraste {bib ? `el dorsal #${bib}` : "estas fotos"}
                </p>
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                placeholder="tu@email.com"
                className={`${inp} ${emailError ? "border-red-300 focus:border-red-400" : ""}`}
                onKeyDown={(e) => { if (e.key === "Enter") handleEmailAccess(); }}
                autoFocus
              />
              {emailError && <p className="text-red-500 text-xs text-center">{emailError}</p>}
              <button
                onClick={handleEmailAccess}
                disabled={!emailInput || accessByEmail.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
              >
                {accessByEmail.isPending ? "Buscando..." : "Acceder a mis fotos"}
              </button>
              <button onClick={() => setStep("cart")} className="text-gray-400 hover:text-gray-600 text-sm text-center transition-colors">
                ← Volver
              </button>
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}
