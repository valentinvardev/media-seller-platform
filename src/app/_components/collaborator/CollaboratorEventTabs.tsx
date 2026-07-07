"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PhotoUploader } from "~/app/_components/admin/PhotoUploader";

type Tab = "fotos" | "ventas";

export function CollaboratorEventTabs({
  collectionId,
  initialTab,
}: {
  collectionId: string;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-4">
        <TabButton active={tab === "fotos"} onClick={() => setTab("fotos")} label="Fotos" />
        <TabButton active={tab === "ventas"} onClick={() => setTab("ventas")} label="Ventas" />
      </div>

      {tab === "fotos" ? <PhotosTab collectionId={collectionId} /> : <SalesTab collectionId={collectionId} />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-semibold transition-colors relative"
      style={{
        color: active ? "#0057A8" : "#6b7280",
      }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
          style={{ background: "#0057A8" }}
        />
      )}
    </button>
  );
}

// ─── Fotos ────────────────────────────────────────────────────────────────────

function PhotosTab({ collectionId }: { collectionId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = api.collaborator.myPhotos.useQuery({ collectionId, page, limit: 48 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Subir fotos</h2>
          <PhotoUploader collectionId={collectionId} />
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Mis fotos</h2>
            {data && <span className="text-xs text-gray-400">{data.total} en total</span>}
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
          ) : !data || data.photos.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center italic">
              Todavía no subiste fotos a este evento.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {data.photos.map((p) => (
                  <div
                    key={p.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                  >
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        —
                      </div>
                    )}
                    {p.bibNumber && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        #{p.bibNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {data.pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg font-medium border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                  >
                    ← Anterior
                  </button>
                  <span className="text-gray-500">
                    Página {page} de {data.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="px-3 py-1.5 rounded-lg font-medium border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

function SalesTab({ collectionId }: { collectionId: string }) {
  const { data, isLoading } = api.collaborator.mySales.useQuery({ collectionId });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-gray-400 py-6 text-center">Cargando ventas...</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.myPhotoCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center px-4">
        <p className="text-sm text-gray-500">
          Todavía no subiste fotos a este evento. Cuando lo hagas, las ventas relacionadas van a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Mis fotos vendidas" value={data.totalPhotosSold} />
        <Stat label="Ingresos atribuidos" value={`$${Math.round(data.totalRevenue).toLocaleString("es-AR")}`} isText hint="Pro-rata sobre bundles" />
        <Stat label="Compras que me incluyen" value={data.items.length} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {data.items.length === 0 ? (
          <p className="text-sm text-gray-500 py-10 text-center italic">
            Aún no hay ventas con tus fotos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Comprador</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Dorsal</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Mis fotos / total</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Atribuido</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-800">{item.buyerEmail}</p>
                      {item.buyerName && <p className="text-gray-400">{item.buyerName}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {item.bibNumber ? `#${item.bibNumber}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {item.myPhotos} <span className="text-gray-400">de {item.totalPhotos}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      ${Math.round(item.attributedAmount).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, isText }: { label: string; value: string | number; hint?: string; isText?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`font-bold text-gray-900 ${isText ? "text-lg" : "text-2xl"}`}>{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
