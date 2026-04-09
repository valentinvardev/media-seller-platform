import Link from "next/link";
import { api } from "~/trpc/server";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-base tracking-tight">FotoDeporte</span>
          </Link>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Admin</Link>
        </div>
      </nav>

      {/* ── Hero — compact ──────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
              Fotografía deportiva
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Encontrá tus fotos<br />
              <span className="text-amber-500">de carrera</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              Seleccioná tu evento, buscá por número de dorsal y descargá todas
              tus fotos en alta resolución.
            </p>
          </div>

          {/* Steps inline */}
          <div className="mt-10 flex flex-col sm:flex-row gap-6 sm:gap-10">
            {[
              { num: "1", label: "Elegí el evento" },
              { num: "2", label: "Ingresá tu dorsal" },
              { num: "3", label: "Descargá en HD" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {s.num}
                </span>
                <span className="text-sm font-medium text-gray-700">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events list ─────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Eventos disponibles
          </h2>
          {collections.length > 0 && (
            <span className="text-sm text-gray-400">
              {collections.length} evento{collections.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {collections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700 mb-1">No hay eventos aún</p>
            <p className="text-sm text-gray-400">Próximamente aparecerán los eventos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/colecciones/${col.slug}`}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-amber-300 hover:shadow-md transition-all duration-200"
              >
                {/* Cover */}
                {(col.bannerUrl ?? col.coverUrl) ? (
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <img
                      src={(col.bannerUrl ?? col.coverUrl)!}
                      alt={col.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {col.logoUrl && (
                      <div className="absolute top-3 left-3 w-9 h-9 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                        <img src={col.logoUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                    <svg className="w-10 h-10 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight truncate group-hover:text-amber-600 transition-colors">
                        {col.title}
                      </h3>
                      {col.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{col.description}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs text-gray-400 font-medium">
                      {col._count.photos} foto{col._count.photos !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 mt-16 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-400">FotoDeporte — Fotografía deportiva profesional</span>
          <span className="text-sm font-medium text-amber-600">MercadoPago</span>
        </div>
      </footer>
    </div>
  );
}
