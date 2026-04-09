"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";

type Sale = {
  id: string;
  buyerEmail: string;
  buyerName: string | null;
  bibNumber: string | null;
  status: string;
  amountPaid: unknown;
  createdAt: Date;
  downloadToken: string | null;
  collection: { title: string };
};

export function SalesTable({ items }: { items: Sale[] }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmSale, setConfirmSale] = useState<Sale | null>(null);

  const approve = api.purchase.manualApprove.useMutation({
    onSuccess: () => router.refresh(),
  });

  const copyDownloadLink = (token: string, id: string) => {
    const url = `${window.location.origin}/descarga/${token}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border py-20 text-center" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
        <p className="text-white font-medium mb-1">Sin ventas aún</p>
        <p className="text-slate-500 text-sm">Las ventas aparecerán aquí cuando se realice una compra</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "#1e1e35" }}>
            {["Email comprador", "Dorsal", "Colección", "Estado", "Monto", "Fecha", "Acciones"].map((h, i) => (
              <th key={i} className="px-5 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((sale) => (
            <tr key={sale.id} className="border-t transition-colors hover:bg-white/[0.02]" style={{ borderColor: "#1a1a28" }}>
              <td className="px-5 py-4">
                <p className="text-slate-300">{sale.buyerEmail}</p>
                {sale.buyerName && <p className="text-slate-500 text-xs">{sale.buyerName}</p>}
              </td>
              <td className="px-5 py-4">
                <span className="font-mono font-bold text-white">
                  {sale.bibNumber ? `#${sale.bibNumber}` : "—"}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-400 text-xs">{sale.collection.title}</td>
              <td className="px-5 py-4"><StatusBadge status={sale.status} /></td>
              <td className="px-5 py-4 font-medium text-white">
                ${Number(sale.amountPaid).toLocaleString("es-AR")}
              </td>
              <td className="px-5 py-4 text-slate-500 text-xs">
                {new Date(sale.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {sale.status !== "APPROVED" && (
                    <button
                      onClick={() => setConfirmSale(sale)}
                      disabled={approve.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ background: "#10b98120", color: "#34d399" }}
                    >
                      ✓ Aprobar
                    </button>
                  )}
                  {sale.status === "APPROVED" && sale.downloadToken && (
                    <button
                      onClick={() => copyDownloadLink(sale.downloadToken!, sale.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "#6366f120", color: "#818cf8" }}
                    >
                      {copiedId === sale.id ? "¡Copiado!" : "↗ Link descarga"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmSale && (
        <ConfirmModal
          title="Aprobar compra manualmente"
          message={`¿Aprobar la compra de ${confirmSale.buyerEmail} para el dorsal #${confirmSale.bibNumber ?? "—"}?`}
          confirmLabel="Aprobar"
          variant="success"
          onConfirm={() => { approve.mutate({ id: confirmSale.id }); setConfirmSale(null); }}
          onCancel={() => setConfirmSale(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    APPROVED: { bg: "#10b98120", text: "#34d399", label: "Aprobada" },
    PENDING:  { bg: "#f59e0b20", text: "#fbbf24", label: "Pendiente" },
    REJECTED: { bg: "#ef444420", text: "#f87171", label: "Rechazada" },
    REFUNDED: { bg: "#6366f120", text: "#818cf8", label: "Reembolsada" },
  };
  const s = map[status] ?? { bg: "#ffffff10", text: "#94a3b8", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}
