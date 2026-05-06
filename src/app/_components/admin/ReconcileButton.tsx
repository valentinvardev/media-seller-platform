"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function ReconcileButton() {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<{ checked: number; updated: number; approvedNow: number; errors: string[]; details: Array<{ id: string; from: string; to: string }> } | null>(null);
  const reconcile = api.purchase.reconcileWithMercadoPago.useMutation({
    onSuccess: (data) => { setResult(data); router.refresh(); },
  });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-5 py-4 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-gray-800">Reconciliar con MercadoPago</p>
          <p className="text-xs text-gray-500 mt-1">
            Compara ventas con MercadoPago y actualiza estados desactualizados (útil después de un corte de servicio).
            Si encuentra ventas aprobadas que no se habían marcado, manda el email automáticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-gray-500">Últimos
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="mx-2 px-2 py-1 rounded border border-gray-200 text-sm">
              <option value={1}>1 día</option>
              <option value={3}>3 días</option>
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </label>
          <button
            onClick={() => { setResult(null); reconcile.mutate({ days }); }}
            disabled={reconcile.isPending}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            {reconcile.isPending ? "Reconciliando..." : "Reconciliar"}
          </button>
        </div>
      </div>
      {result && (
        <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-700">
          <p className="font-semibold mb-1">
            {result.checked === 0
              ? "✓ Todo en orden — no había ventas pendientes para revisar"
              : `Revisé ${result.checked} venta${result.checked !== 1 ? "s" : ""}, actualicé ${result.updated}.`}
          </p>
          {result.approvedNow > 0 && (
            <p className="text-green-700 font-medium">
              🎉 Se aprobaron {result.approvedNow} venta{result.approvedNow !== 1 ? "s" : ""} y se mandó el email al cliente.
            </p>
          )}
          {result.details.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5">
              {result.details.map((d) => (
                <li key={d.id} className="text-gray-600">
                  <code className="text-gray-400">{d.id.slice(-8)}</code> · {d.from} → <span className="font-bold">{d.to}</span>
                </li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">{result.errors.length} error{result.errors.length !== 1 ? "es" : ""}</summary>
              <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
      {reconcile.isError && (
        <p className="mt-3 text-xs text-red-500">Error: {reconcile.error?.message}</p>
      )}
    </div>
  );
}
