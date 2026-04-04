"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Step = "preview" | "buy" | "email";

export function FolderModal({ folderId, onClose }: { folderId: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>("preview");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const router = useRouter();

  const { data: folder, isLoading } = api.folder.getPreview.useQuery({ folderId });

  const createPreference = api.purchase.createPreference.useMutation({
    onSuccess: (data) => { if (data.initPoint) window.location.href = data.initPoint; },
  });

  const accessByEmail = api.purchase.accessByEmail.useMutation({
    onSuccess: (token) => {
      if (token) {
        router.push(`/descarga/${token}`);
      } else {
        setEmailError("No encontramos una compra aprobada para este email en esta carpeta.");
      }
    },
  });

  const getPublicToken = api.purchase.getPublicFolderToken.useMutation({
    onSuccess: (token) => router.push(`/descarga/${token}`),
  });

  const handleBuy = () => {
    if (!email) return;
    createPreference.mutate({ folderId, buyerEmail: email, buyerName: name || undefined });
  };

  const handleEmailAccess = () => {
    if (!emailInput) return;
    setEmailError("");
    accessByEmail.mutate({ email: emailInput, folderId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden border" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "#2a2a45" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1e1e35" }}>
          <div>
            {!isLoading && folder && (
              <>
                <p className="text-xs text-slate-500 mb-0.5">{folder.collectionTitle}</p>
                <h2 className="font-bold text-white text-lg">Carpeta #{folder.number}</h2>
              </>
            )}
            {isLoading && <div className="h-6 w-32 rounded animate-pulse" style={{ background: "#1e1e35" }} />}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ background: "#16162a" }}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : !folder ? (
          <p className="text-center text-slate-500 py-16">Carpeta no encontrada.</p>
        ) : (
          <>
            {/* Photo previews */}
            <div className="relative overflow-hidden" style={{ height: "200px" }}>
              <div className="grid grid-cols-2 w-full h-full gap-px">
                {folder.previewUrls.length > 0 ? (
                  folder.previewUrls.map((url, i) => (
                    <div key={i} className="overflow-hidden">
                      <img
                        src={url}
                        alt=""
                        className={`w-full h-full object-cover ${
                          !folder.isPublic && !folder.hasWatermarkedPreviews
                            ? "blur-lg scale-110"
                            : ""
                        }`}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 flex items-center justify-center" style={{ background: "#16162a" }}>
                    <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Bottom strip for private folders — replaces center overlay */}
              {!folder.isPublic ? (
                <div
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 100%)" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f59e0b1a", border: "1px solid #f59e0b40" }}>
                      <svg className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white text-sm font-semibold">Carpeta privada</span>
                  </div>
                  <span className="text-slate-300 text-sm">
                    {folder.photoCount} foto{folder.photoCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                /* Subtle gradient for public — just to polish edges */
                <div
                  className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(15,15,26,0.6) 0%, transparent 100%)" }}
                />
              )}
            </div>

            {/* Price */}
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: "#f59e0b0e", borderTop: "1px solid #f59e0b20" }}>
              <span className="text-sm text-slate-400">Precio de la carpeta</span>
              <span className="font-bold text-lg" style={{ color: "#fbbf24" }}>
                $ {Number(folder.price).toLocaleString("es-AR")}
              </span>
            </div>

            {/* Steps */}
            <div className="px-5 py-5">
              {/* PREVIEW: two CTAs */}
              {step === "preview" && (
                <div className="flex flex-col gap-3">
                  {folder.isPublic ? (
                    <button
                      onClick={() => getPublicToken.mutate({ folderId })}
                      disabled={getPublicToken.isPending}
                      className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 0 20px #10b98125" }}
                    >
                      {getPublicToken.isPending ? "Cargando..." : "Ver fotos gratis"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setStep("buy")}
                        className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02]"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", boxShadow: "0 0 20px #f59e0b25" }}
                      >
                        Comprar carpeta · $ {Number(folder.price).toLocaleString("es-AR")}
                      </button>
                      <button
                        onClick={() => setStep("email")}
                        className="w-full py-3 rounded-xl font-medium text-sm border transition-all hover:border-white/20 hover:text-white"
                        style={{ background: "#16162a", borderColor: "#2a2a45", color: "#94a3b8" }}
                      >
                        Ya compré — Acceder con email
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* BUY: payment form */}
              {step === "buy" && (
                <div className="flex flex-col gap-3">
                  <p className="text-slate-400 text-sm text-center mb-1">Completá tus datos para continuar</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre (opcional)"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border transition-colors"
                    style={{ background: "#16162a", borderColor: "#2a2a45" }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu email *"
                    required
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border transition-colors"
                    style={{ background: "#16162a", borderColor: "#2a2a45" }}
                  />
                  <button
                    onClick={handleBuy}
                    disabled={!email || createPreference.isPending}
                    className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                  >
                    {createPreference.isPending ? "Redirigiendo a MercadoPago..." : `Pagar $ ${Number(folder.price).toLocaleString("es-AR")}`}
                  </button>
                  {createPreference.isError && (
                    <p className="text-red-400 text-xs text-center">Ocurrió un error. Intentá de nuevo.</p>
                  )}
                  <button onClick={() => setStep("preview")} className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors">
                    Volver
                  </button>
                </div>
              )}

              {/* EMAIL ACCESS */}
              {step === "email" && (
                <div className="flex flex-col gap-3">
                  <div className="text-center mb-1">
                    <p className="text-white font-medium text-sm">Acceder a tus fotos</p>
                    <p className="text-slate-500 text-xs mt-1">Ingresá el email con el que compraste esta carpeta</p>
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none border transition-colors"
                    style={{ background: "#16162a", borderColor: emailError ? "#ef444450" : "#2a2a45" }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEmailAccess(); }}
                    autoFocus
                  />
                  {emailError && (
                    <p className="text-red-400 text-xs text-center">{emailError}</p>
                  )}
                  <button
                    onClick={handleEmailAccess}
                    disabled={!emailInput || accessByEmail.isPending}
                    className="w-full py-4 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                  >
                    {accessByEmail.isPending ? "Buscando..." : "Acceder a mis fotos"}
                  </button>
                  <button onClick={() => setStep("preview")} className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors">
                    Volver
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
