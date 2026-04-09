import { api } from "~/trpc/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const [collections, sales] = await Promise.all([
    api.collection.adminList(),
    api.purchase.adminList({ page: 1, limit: 8 }),
  ]);

  const totalPhotos = collections.reduce((acc, c) => acc + c._count.photos, 0);
  const approvedSales = sales.items.filter((s) => s.status === "APPROVED");
  const totalRevenue = approvedSales.reduce((acc, s) => acc + Number(s.amountPaid), 0);
  const publishedCollections = collections.filter((c) => c.isPublished).length;

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Colecciones publicadas" value={publishedCollections} total={collections.length} icon="◫" accent="#6366f1" />
        <StatCard label="Fotos totales" value={totalPhotos} icon="▦" accent="#f59e0b" />
        <StatCard label="Ventas aprobadas" value={approvedSales.length} total={sales.total} icon="◈" accent="#10b981" />
        <StatCard label="Ingresos totales" value={`$${totalRevenue.toLocaleString("es-AR")}`} icon="$" accent="#f59e0b" isText />
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/admin/colecciones/nueva", label: "Nueva colección", sub: "Crear un nuevo evento", icon: "+", bg: "#f59e0b15", color: "#f59e0b" },
            { href: "/admin/colecciones", label: "Gestionar colecciones", sub: `${collections.length} colecciones`, icon: "◫", bg: "#6366f115", color: "#818cf8" },
            { href: "/admin/ventas", label: "Ver todas las ventas", sub: `${sales.total} ventas totales`, icon: "◈", bg: "#10b98115", color: "#34d399" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-5 py-4 rounded-xl border transition-all hover:border-white/10 group"
              style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.bg, color: item.color }}>
                <span className="text-lg leading-none">{item.icon}</span>
              </div>
              <div>
                <p className="font-medium text-white text-sm group-hover:text-slate-300 transition-colors">{item.label}</p>
                <p className="text-xs text-slate-500">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ventas recientes</h2>
          <Link href="/admin/ventas" className="text-xs hover:text-amber-300 transition-colors" style={{ color: "#f59e0b" }}>Ver todas →</Link>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
          {sales.items.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-slate-400 text-sm">Aún no hay ventas registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "#1e1e35" }}>
                  {["Email", "Dorsal", "Estado", "Monto"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a28]">
                {sales.items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-300">{sale.buyerEmail}</td>
                    <td className="px-5 py-4 font-mono font-bold text-white">
                      {sale.bibNumber ? `#${sale.bibNumber}` : "—"}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={sale.status} /></td>
                    <td className="px-5 py-4 font-medium text-white">${Number(sale.amountPaid).toLocaleString("es-AR")}</td>
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
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
      </div>
      <p className={`font-bold text-white ${isText ? "text-xl" : "text-3xl"}`}>{value}</p>
      {total !== undefined && <p className="text-xs text-slate-600 mt-1">de {total} total</p>}
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
