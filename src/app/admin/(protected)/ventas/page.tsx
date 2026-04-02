import { api } from "~/trpc/server";
import { SalesTable } from "~/app/_components/admin/SalesTable";

export default async function SalesPage() {
  const sales = await api.purchase.adminList({ page: 1, limit: 50 });

  const approved = sales.items.filter((s) => s.status === "APPROVED");
  const totalRevenue = approved.reduce((acc, s) => acc + Number(s.amountPaid), 0);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Ventas</h1>
        <p className="text-slate-500 mt-1">{sales.total} venta{sales.total !== 1 ? "s" : ""} registrada{sales.total !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Total ventas", value: sales.total },
          { label: "Aprobadas", value: approved.length },
          { label: "Pendientes", value: sales.items.filter(s => s.status === "PENDING").length },
          { label: "Ingresos", value: `$${totalRevenue.toLocaleString("es-AR")}`, isText: true },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border px-4 py-4" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
            <p className="text-xs text-slate-500 mb-2">{c.label}</p>
            <p className={`font-bold text-white ${c.isText ? "text-lg" : "text-2xl"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <SalesTable items={sales.items} />
    </div>
  );
}
