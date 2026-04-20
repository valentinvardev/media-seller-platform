"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";

type Collection = { id: string; title: string; _count: { photos: number } };
type FaceGroup = { bib: string; photoIds: string[] };
type FaceStatus = "idle" | "searching" | "done" | "no-face" | "error";

function resizeToBase64(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.88).split(",")[1]!);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function ManualDelivery({ collections }: { collections: Collection[] }) {
  const [collectionId, setCollectionId] = useState("");
  const [bib, setBib] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<{ downloadToken: string; photoCount: number } | null>(null);

  // Face search state
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("idle");
  const [faceGroups, setFaceGroups] = useState<FaceGroup[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const bibQuery = api.photo.searchByBib.useQuery(
    { collectionId, bib },
    { enabled: !!(collectionId && bib.length >= 1) },
  );
  const photoCount = (bibQuery.data?.exact ?? []).reduce((n, g) => n + g.photos.length, 0);

  const deliver = api.purchase.manualDeliver.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setBib("");
      setEmail("");
      setName("");
      setFaceGroups([]);
      setFaceStatus("idle");
    },
  });

  const handleFaceUpload = async (file: File) => {
    if (!collectionId) return;
    setFaceStatus("searching");
    setFaceGroups([]);
    setBib("");
    try {
      const imageBase64 = await resizeToBase64(file);
      const res = await fetch("/api/face-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, collectionId }),
      });
      const data = (await res.json()) as { groups?: FaceGroup[]; noFaceDetected?: boolean };
      if (data.noFaceDetected) { setFaceStatus("no-face"); return; }
      const groups = (data.groups ?? []).filter((g) => g.bib !== "sin-dorsal");
      setFaceGroups(groups);
      setFaceStatus("done");
      if (groups.length === 1) setBib(groups[0]!.bib);
    } catch {
      setFaceStatus("error");
    }
  };

  const resetFace = () => {
    setFaceStatus("idle");
    setFaceGroups([]);
    setBib("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const canSubmit = collectionId && bib && email && !deliver.isPending;
  const downloadUrl = result
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/descarga/${result.downloadToken}`
    : null;

  const inp =
    "w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

  return (
    <div className="max-w-lg">
      {result && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800 mb-1">
            ✓ Entrega enviada — {result.photoCount} foto{result.photoCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-green-700 mb-3">El email fue enviado al comprador con el link de descarga.</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={downloadUrl ?? ""}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-green-200 bg-white text-gray-700 font-mono"
            />
            <button
              onClick={() => { void navigator.clipboard.writeText(downloadUrl ?? ""); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 hover:bg-green-100 transition-colors whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
          <button onClick={() => setResult(null)} className="mt-3 text-xs text-green-600 underline">
            Nueva entrega
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Collection */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Evento</label>
          <select
            value={collectionId}
            onChange={(e) => { setCollectionId(e.target.value); setBib(""); resetFace(); }}
            className={inp}
          >
            <option value="">Seleccioná un evento…</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Bib + face search */}
        {collectionId && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Número de dorsal</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFaceUpload(f); }} />
              <button
                onClick={() => faceStatus === "done" ? resetFace() : fileRef.current?.click()}
                disabled={faceStatus === "searching"}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: faceStatus === "done" ? "#fee2e2" : "rgba(0,87,168,0.08)",
                  color: faceStatus === "done" ? "#dc2626" : "#0057A8",
                }}
              >
                {faceStatus === "searching" ? (
                  <span className="animate-pulse">Buscando…</span>
                ) : faceStatus === "done" ? (
                  "✕ Limpiar"
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    Buscar por cara
                  </>
                )}
              </button>
            </div>

            {/* Face results */}
            {faceStatus === "no-face" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-2">No se detectó ninguna cara en la imagen.</p>
            )}
            {faceStatus === "error" && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-2">Error al procesar la imagen.</p>
            )}
            {faceStatus === "done" && faceGroups.length === 0 && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-2">No se encontraron coincidencias en este evento.</p>
            )}
            {faceStatus === "done" && faceGroups.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {faceGroups.map((g) => (
                  <button
                    key={g.bib}
                    onClick={() => setBib(g.bib)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                    style={{
                      borderColor: bib === g.bib ? "#0057A8" : "#e5e7eb",
                      background: bib === g.bib ? "#eff6ff" : "white",
                      color: bib === g.bib ? "#0057A8" : "#374151",
                    }}
                  >
                    Dorsal #{g.bib} · {g.photoIds.length} foto{g.photoIds.length !== 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={bib}
              onChange={(e) => setBib(e.target.value)}
              placeholder="Ej: 1234"
              className={inp}
            />
            {bib && (
              <p className="mt-1.5 text-xs text-gray-500">
                {bibQuery.isLoading
                  ? "Buscando fotos…"
                  : photoCount > 0
                    ? `${photoCount} foto${photoCount !== 1 ? "s" : ""} encontrada${photoCount !== 1 ? "s" : ""} para este dorsal`
                    : "No se encontraron fotos para este dorsal"}
              </p>
            )}
          </div>
        )}

        {/* Buyer email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email del comprador</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="corredor@email.com"
            className={inp}
          />
        </div>

        {/* Buyer name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del comprador"
            className={inp}
          />
        </div>

        {deliver.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {deliver.error.message}
          </p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => deliver.mutate({ collectionId, bibNumber: bib, buyerEmail: email, buyerName: name || undefined })}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
        >
          {deliver.isPending ? "Enviando…" : "Enviar fotos"}
        </button>
      </div>
    </div>
  );
}
