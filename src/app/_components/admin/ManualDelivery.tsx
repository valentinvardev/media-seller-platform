"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";

type Collection = { id: string; title: string; _count: { photos: number } };
type FaceGroup = { bib: string; photoIds: string[] };
type FaceStatus = "idle" | "searching" | "done" | "no-face" | "error";
type FlatPhoto = { id: string; url: string };

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

  // Photo picker state — null means "send all" (legacy behavior).
  // A Set with selected ids means "send only these".
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const bibQuery = api.photo.searchByBib.useQuery(
    { collectionId, bib },
    { enabled: !!(collectionId && bib.length >= 1) },
  );

  // Flatten the exact results into a single photo list for the picker.
  const allPhotos = useMemo<FlatPhoto[]>(() => {
    const groups = bibQuery.data?.exact ?? [];
    return groups.flatMap((g) => g.photos.map((p) => ({ id: p.id, url: p.url })));
  }, [bibQuery.data]);

  // Reset photo selection whenever the bib (or matching photos) changes,
  // so the admin doesn't accidentally send a stale selection.
  useEffect(() => {
    setSelectedIds(null);
  }, [bib, collectionId]);

  const photoCount = selectedIds ? selectedIds.size : allPhotos.length;

  const deliver = api.purchase.manualDeliver.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setBib("");
      setEmail("");
      setName("");
      setFaceGroups([]);
      setFaceStatus("idle");
      setSelectedIds(null);
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

  const handleSubmit = () => {
    const ids = selectedIds ? Array.from(selectedIds) : undefined;
    deliver.mutate({
      collectionId,
      bibNumber: bib,
      buyerEmail: email,
      buyerName: name || undefined,
      photoIds: ids,
    });
  };

  const canSubmit = collectionId && bib && email && photoCount > 0 && !deliver.isPending;
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
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {bibQuery.isLoading
                    ? "Buscando fotos…"
                    : allPhotos.length > 0
                      ? selectedIds
                        ? `${selectedIds.size} de ${allPhotos.length} foto${allPhotos.length !== 1 ? "s" : ""} elegidas`
                        : `${allPhotos.length} foto${allPhotos.length !== 1 ? "s" : ""} encontrada${allPhotos.length !== 1 ? "s" : ""} — se enviarán todas`
                      : "No se encontraron fotos para este dorsal"}
                </p>
                {allPhotos.length > 0 && (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                    style={{ background: "rgba(0,87,168,0.08)", color: "#0057A8" }}
                  >
                    Elegir fotos
                  </button>
                )}
              </div>
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
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
        >
          {deliver.isPending
            ? "Enviando…"
            : photoCount > 0
              ? `Enviar ${photoCount} foto${photoCount !== 1 ? "s" : ""}`
              : "Enviar fotos"}
        </button>
      </div>

      {pickerOpen && (
        <PhotoPickerModal
          photos={allPhotos}
          initialSelected={selectedIds ?? new Set(allPhotos.map((p) => p.id))}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids) => {
            // If they picked all, store null to keep the "send all" semantics.
            setSelectedIds(ids.size === allPhotos.length ? null : ids);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PhotoPickerModal({
  photos,
  initialSelected,
  onClose,
  onConfirm,
}: {
  photos: FlatPhoto[];
  initialSelected: Set<string>;
  onClose: () => void;
  onConfirm: (ids: Set<string>) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = selected.size === photos.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "88vh" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Elegir fotos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected.size} de {photos.length} seleccionada{selected.size !== 1 ? "s" : ""}
            </p>
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

        {/* Toolbar */}
        <div className="px-5 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {photos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No hay fotos para mostrar.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 transition-all active:scale-95"
                    style={{
                      boxShadow: isSelected ? "0 0 0 3px #0057A8" : "0 0 0 1px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="w-full h-full object-cover transition-opacity"
                      style={{ opacity: isSelected ? 1 : 0.55 }}
                      loading="lazy"
                    />
                    <div
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isSelected ? "#0057A8" : "rgba(255,255,255,0.85)",
                        border: isSelected ? "none" : "1.5px solid rgba(0,0,0,0.2)",
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.size === 0}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            Confirmar {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
