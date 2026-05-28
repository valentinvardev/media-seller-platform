"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function TokenLookup() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const { data, isFetching, error } = api.purchase.findByToken.useQuery(
    { token: token! },
    { enabled: !!token },
  );

  const run = () => {
    const t = input.trim().replace(/^.*\/descarga\//, "");
    setToken(t || null);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mb-6">
      <p className="text-xs font-semibold text-gray-700 mb-3">Buscar compra por link de entrega</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Pegá el link o token de descarga..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button
          onClick={run}
          disabled={!input.trim() || isFetching}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {isFetching ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-500">Error al buscar.</p>
      )}

      {token && !isFetching && data === null && (
        <p className="mt-3 text-xs text-red-500">No se encontró ninguna compra con ese token.</p>
      )}

      {data && (
        <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden text-xs">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-3 space-y-2">
              <Row label="ID" value={data.id} mono />
              <Row label="Estado" value={<StatusBadge status={data.status} />} />
              <Row label="Comprador" value={`${data.buyerName ?? ""} ${data.buyerEmail}`} />
              <Row label="Monto" value={`$${data.amountPaid.toLocaleString("es-AR")}`} />
              {data.photoCount !== null && <Row label="Fotos" value={`${data.photoCount} foto${data.photoCount !== 1 ? "s" : ""}`} />}
              {data.bibNumber && <Row label="Dorsal" value={data.bibNumber} />}
              <Row label="Fecha" value={new Date(data.createdAt).toLocaleString("es-AR")} />
            </div>
            <div className="p-3 space-y-2">
              <Row label="Evento guardado" value={data.collectionTitle} />
              <Row label="Collection ID" value={data.collectionId} mono />
              <Row
                label="Link público"
                value={
                  <a
                    href={`/colecciones/${data.collectionSlug}`}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    /colecciones/{data.collectionSlug}
                  </a>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0 w-28">{label}</span>
      <span className={`font-medium text-gray-800 break-all ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-600",
    REFUNDED: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full font-semibold ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
