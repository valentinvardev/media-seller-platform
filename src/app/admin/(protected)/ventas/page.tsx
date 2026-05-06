import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { SalesTable } from "~/app/_components/admin/SalesTable";
import { ReconcileButton } from "~/app/_components/admin/ReconcileButton";

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; page?: string }>;
}) {
  const { event, page } = await searchParams;

  if (!event) return <EventPicker />;
  const pageNum = Math.max(1, Number(page) || 1);
  return <EventSales collectionId={event} page={pageNum} />;
}

async function EventPicker() {
  const events = await api.purchase.eventsSummary();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <p className="text-gray-500 text-sm mt-0.5">Elegí un evento para ver sus ventas</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-20 text-center">
          <p className="text-gray-900 font-medium mb-1">Sin eventos</p>
          <p className="text-gray-400 text-sm">Creá un evento desde la sección Eventos para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/ventas?event=${e.id}`}
              className="group rounded-2xl border border-gray-100 bg-white shadow-sm px-5 py-4 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <p className="font-semibold text-gray-900 group-hover:text-black truncate">{e.title}</p>
              <div className="mt-3 flex items-baseline gap-3 text-xs text-gray-500">
                <span><span className="font-bold text-gray-900 text-sm">{e.total}</span> ventas</span>
                <span><span className="font-bold text-green-700 text-sm">{e.approved}</span> aprobadas</span>
                {e.pending > 0 && (
                  <span><span className="font-bold text-amber-700 text-sm">{e.pending}</span> pend.</span>
                )}
              </div>
              <p className="mt-2 text-sm font-bold text-gray-900">
                ${e.revenue.toLocaleString("es-AR")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function EventSales({ collectionId, page }: { collectionId: string; page: number }) {
  const [sales, stats, collection] = await Promise.all([
    api.purchase.adminList({ page, limit: PAGE_SIZE, collectionId }),
    api.purchase.adminStats({ collectionId }),
    api.collection.adminGetById({ id: collectionId }),
  ]);

  if (!collection) redirect("/admin/ventas");

  const totalPages = Math.max(1, sales.pages);
  const safePage = Math.min(page, totalPages);

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/ventas" className="text-xs text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Cambiar evento
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{collection.title}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{stats.total} venta{stats.total !== 1 ? "s" : ""} registrada{stats.total !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total ventas", value: stats.total },
          { label: "Aprobadas", value: stats.approved },
          { label: "Pendientes", value: stats.pending },
          { label: "Ingresos", value: `$${stats.totalRevenue.toLocaleString("es-AR")}`, isText: true, hint: "Solo aprobadas" },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-4">
            <p className="text-xs text-gray-500 mb-2">{c.label}</p>
            <p className={`font-bold text-gray-900 ${c.isText ? "text-lg" : "text-2xl"}`}>{c.value}</p>
            {c.hint && <p className="text-[10px] text-gray-400 mt-1">{c.hint}</p>}
          </div>
        ))}
      </div>

      <ReconcileButton />

      <SalesTable items={sales.items} />

      {totalPages > 1 && (
        <Pagination collectionId={collectionId} page={safePage} totalPages={totalPages} total={stats.total} />
      )}
    </div>
  );
}

function Pagination({
  collectionId,
  page,
  totalPages,
  total,
}: {
  collectionId: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const href = (p: number) => `/admin/ventas?event=${collectionId}&page=${p}`;

  return (
    <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
      <p className="text-xs text-gray-500">
        Mostrando <span className="font-medium text-gray-900">{start}</span>–<span className="font-medium text-gray-900">{end}</span> de <span className="font-medium text-gray-900">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
            ← Anterior
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-100 text-gray-300 cursor-not-allowed">
            ← Anterior
          </span>
        )}
        <span className="text-xs text-gray-500">
          Página <span className="font-medium text-gray-900">{page}</span> de {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={href(page + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
            Siguiente →
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-100 text-gray-300 cursor-not-allowed">
            Siguiente →
          </span>
        )}
      </div>
    </div>
  );
}
