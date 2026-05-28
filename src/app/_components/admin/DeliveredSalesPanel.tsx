"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type Item = {
  id: string;
  buyerEmail: string;
  buyerName: string | null;
  amountPaid: number;
  createdAt: Date;
  photoCount: number;
  collectionTitle: string;
  isOrphaned: boolean;
  downloadToken: string;
};

export function DeliveredSalesPanel({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = api.purchase.findDeliveredByCollection.useQuery(
    { collectionId },
    { enabled: open },
  );

  const fix = api.purchase.fixOrphanedPurchases.useMutation({
    onSuccess: () => { setSelected(new Set()); void refetch(); },
  });

  const orphaned = data?.items.filter((i) => i.isOrphaned) ?? [];
  const toggleAll = () => {
    if (selected.size === orphaned.length) setSelected(new Set());
    else setSelected(new Set(orphaned.map((i) => i.id)));
  };

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-900">Entregas de este evento</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Busca compras aprobadas cuyos fotos pertenecen a este evento, aunque estén guardadas bajo otro evento.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          {open ? "Ocultar" : "Buscar entregas"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {isLoading && (
            <p className="text-xs text-amber-700 text-center py-4">Buscando...</p>
          )}

          {data && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{data.total}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Entregas totales</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{orphaned.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Bajo otro evento</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700">
                    ${data.revenue.toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Ingresos reales</p>
                </div>
              </div>

              {data.items.length === 0 && (
                <p className="text-xs text-amber-700 text-center py-4">
                  No se encontraron entregas para las fotos de este evento.
                </p>
              )}

              {data.items.length > 0 && (
                <div className="bg-white rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-8">
                          {orphaned.length > 0 && (
                            <input
                              type="checkbox"
                              checked={selected.size === orphaned.length && orphaned.length > 0}
                              onChange={toggleAll}
                              className="rounded"
                            />
                          )}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Comprador</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Fotos</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Monto</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Fecha</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Evento guardado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item: Item) => (
                        <tr key={item.id} className={`border-b border-gray-50 last:border-0 ${item.isOrphaned ? "bg-amber-50/50" : ""}`}>
                          <td className="px-3 py-2">
                            {item.isOrphaned && (
                              <input
                                type="checkbox"
                                checked={selected.has(item.id)}
                                onChange={() => {
                                  const next = new Set(selected);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  setSelected(next);
                                }}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-800">{item.buyerEmail}</p>
                            {item.buyerName && <p className="text-gray-400">{item.buyerName}</p>}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{item.photoCount}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">
                            ${item.amountPaid.toLocaleString("es-AR")}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString("es-AR")}
                          </td>
                          <td className="px-3 py-2">
                            {item.isOrphaned ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                                {item.collectionTitle}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                Correcto
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selected.size > 0 && (
                <div className="mt-3 flex items-center justify-between bg-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-amber-900">
                    {selected.size} compra{selected.size !== 1 ? "s" : ""} seleccionada{selected.size !== 1 ? "s" : ""} para mover a este evento
                  </p>
                  <button
                    onClick={() => fix.mutate({ purchaseIds: Array.from(selected), collectionId })}
                    disabled={fix.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
                  >
                    {fix.isPending ? "Moviendo..." : "Mover a este evento"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
