import { api } from "~/trpc/server";
import Link from "next/link";
import { HeicCleanupButton } from "~/app/_components/admin/HeicCleanupButton";

export default async function AdminDashboard() {
  const [collections, sales] = await Promise.all([
    api.collection.adminList(),
    api.purchase.adminList({ page: 1, limit: 8 }),
  ]);

  const totalFolders = collections.reduce((acc, c) => acc + c._count.folders, 0);
  const approvedSales = sales.items.filter((s) => s.status === "APPROVED");
  const totalRevenue = approvedSales.reduce((acc, s) => acc + Number(s.amountPaid), 0);
  const publishedCollections = collections.filter((c) => c.isPublished).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Colecciones publicadas"
          value={publishedCollections}
          total={collections.length}
          icon="◫"
          accent="#6366f1"
        />
        <StatCard
          label="Carpetas totales"
          value={totalFolders}
          icon="▦"
          accent="#f59e0b"
        />
        <StatCard
          label="Ventas aprobadas"
          value={approvedSales.length}
          total={sales.total}
          icon="◈"
          accent="#10b981"
        />
        <StatCard
          label="Ingresos totales"
          value={`$${totalRevenue.toLocaleString("es-AR")}`}
          icon="$"
          accent="#f59e0b"
          isText
        />
      </div>

      {/* Utilities */}
      <div className="mb-10 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Mantenimiento</h2>
        <HeicCleanupButton />
      </div>

      {/* Quick actions */}
      <div className="mb-10">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/admin/colecciones/nueva"
            className="flex items-center gap-3 px-5 py-4 rounded-xl border transition-all hover:border-amber-500/40 group"
            style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ background: "#f59e0b15" }}>
              <span className="text-lg" style={{ color: "#f59e0b" }}>+</span>
            </div>
            <div>
              <p className="font-medium text-white text-sm group-hover:text-amber-400 transition-colors">Nueva colección</p>
              <p className="text-xs text-slate-500">Crear un nuevo evento</p>
            </div>
          </Link>
          <Link
            href="/admin/colecciones"
            className="flex items-center gap-3 px-5 py-4 rounded-xl border transition-all hover:border-white/10 group"
            style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#6366f115" }}>
              <span className="text-sm" style={{ color: "#818cf8" }}>◫</span>
            </div>
            <div>
              <p className="font-medium text-white text-sm group-hover:text-slate-300 transition-colors">Gestionar colecciones</p>
              <p className="text-xs text-slate-500">{collections.length} colecciones</p>
            </div>
          </Link>
          <Link
            href="/admin/ventas"
            className="flex items-center gap-3 px-5 py-4 rounded-xl border transition-all hover:border-white/10 group"
            style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#10b98115" }}>
              <span className="text-sm" style={{ color: "#34d399" }}>◈</span>
            </div>
            <div>
              <p className="font-medium text-white text-sm group-hover:text-slate-300 transition-colors">Ver todas las ventas</p>
              <p className="text-xs text-slate-500">{sales.total} ventas totales</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent sales */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ventas recientes</h2>
          <Link href="/admin/ventas" className="text-xs transition-colors hover:text-amber-300" style={{ color: "#f59e0b" }}>
            Ver todas →
          </Link>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
          {sales.items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#1e1e35" }}>
                <svg className="w-6 h-6" style={{ color: "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">Aún no hay ventas registradas</p>
              <p className="text-slate-600 text-xs mt-1">Cuando se realice una compra aparecerá aquí</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "#1e1e35" }}>
                  <th className="px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Carpeta</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a28]">
                {sales.items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-300">{sale.buyerEmail}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-white">#{sale.folder.number}</span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={sale.status} /></td>
                    <td className="px-5 py-4 text-right font-medium text-white">
                      ${Number(sale.amountPaid).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, total, icon, accent, isText }: {
  label: string; value: string | number; total?: number; icon: string; accent: string; isText?: boolean;
}) {
  return (
    <div className="rounded-2xl border px-5 py-5" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${accent}15`, color: accent }}>
          {icon}
        </div>
      </div>
      <p className={`font-bold text-white ${isText ? "text-xl" : "text-3xl"}`}>{value}</p>
      {total !== undefined && (
        <p className="text-xs text-slate-600 mt-1">de {total} total</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    APPROVED: { bg: "#10b98120", text: "#34d399", label: "Aprobada" },
    PENDING: { bg: "#f59e0b20", text: "#fbbf24", label: "Pendiente" },
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
