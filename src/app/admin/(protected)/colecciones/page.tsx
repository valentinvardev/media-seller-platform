import Link from "next/link";
import { api } from "~/trpc/server";
import { CollectionActions } from "~/app/_components/admin/CollectionActions";

export default async function CollectionsPage() {
  const collections = await api.collection.adminList();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Colecciones</h1>
          <p className="text-slate-500 mt-1">{collections.length} colección{collections.length !== 1 ? "es" : ""} en total</p>
        </div>
        <Link
          href="/admin/colecciones/nueva"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-black transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
        >
          <span className="text-lg leading-none">+</span>
          Nueva colección
        </Link>
      </div>

      {/* Empty */}
      {collections.length === 0 && (
        <div className="rounded-2xl border py-20 text-center" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
          <p className="text-4xl mb-4">📷</p>
          <p className="text-white font-medium mb-2">No hay colecciones aún</p>
          <p className="text-slate-500 text-sm mb-6">Creá tu primera colección para empezar a vender fotos</p>
          <Link
            href="/admin/colecciones/nueva"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-black"
            style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
          >
            Crear primera colección
          </Link>
        </div>
      )}

      {/* List */}
      {collections.length > 0 && (
        <div className="flex flex-col gap-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group rounded-2xl border px-5 py-4 flex items-center justify-between transition-all hover:border-white/10"
              style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "#1e1e35" }}>
                  📷
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-white">{col.title}</h2>
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5 truncate">
                    /colecciones/{col.slug} · <span className="text-slate-400">{col._count.folders} carpeta{col._count.folders !== 1 ? "s" : ""}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-4">
                <Link
                  href={`/colecciones/${col.slug}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors hover:bg-white/5"
                  title="Ver en sitio público"
                >
                  ↗
                </Link>
                <Link
                  href={`/admin/colecciones/${col.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                  style={{ color: "#f59e0b" }}
                >
                  Editar
                </Link>
                <CollectionActions id={col.id} isPublished={col.isPublished} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
