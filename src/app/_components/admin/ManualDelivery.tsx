"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type Collection = { id: string; title: string; _count: { photos: number } };

export function ManualDelivery({ collections }: { collections: Collection[] }) {
  const [collectionId, setCollectionId] = useState("");
  const [bib, setBib] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<{ downloadToken: string; photoCount: number } | null>(null);

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
    },
  });

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
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs text-green-600 underline"
          >
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
            onChange={(e) => { setCollectionId(e.target.value); setBib(""); }}
            className={inp}
          >
            <option value="">Seleccioná un evento…</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Bib */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Número de dorsal</label>
          <input
            type="text"
            value={bib}
            onChange={(e) => setBib(e.target.value)}
            placeholder="Ej: 1234"
            className={inp}
            disabled={!collectionId}
          />
          {collectionId && bib && (
            <p className="mt-1.5 text-xs text-gray-500">
              {bibQuery.isLoading
                ? "Buscando fotos…"
                : photoCount > 0
                  ? `${photoCount} foto${photoCount !== 1 ? "s" : ""} encontrada${photoCount !== 1 ? "s" : ""} para este dorsal`
                  : "No se encontraron fotos para este dorsal"}
            </p>
          )}
        </div>

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
