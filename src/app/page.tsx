import Link from "next/link";
import { api } from "~/trpc/server";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen" style={{ background: "#080810" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 backdrop-blur-md" style={{ background: "rgba(8,8,16,0.85)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="font-bold text-white tracking-tight">FotoDeporte</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#colecciones" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
              Colecciones
            </Link>
            <Link href="#como-funciona" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
              Cómo funciona
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-3xl" style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border" style={{ background: "#f59e0b15", borderColor: "#f59e0b30", color: "#fbbf24" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Tus fotos están esperándote
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
            Tu mejor momento,
            <br />
            <span style={{ background: "linear-gradient(90deg, #f59e0b, #fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              para siempre.
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Encontrá tu carpeta por número de dorsal y descargá todas las fotos
            de tu carrera en alta resolución.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="#colecciones"
              className="px-8 py-4 rounded-xl font-semibold text-black transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", boxShadow: "0 0 30px #f59e0b30" }}
            >
              Ver colecciones
            </Link>
            <Link
              href="#como-funciona"
              className="px-8 py-4 rounded-xl font-semibold text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all"
              style={{ background: "#ffffff08" }}
            >
              Cómo funciona
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-3xl mx-auto mt-20">
          <div className="grid grid-cols-3 divide-x rounded-2xl overflow-hidden border" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
            {[
              { value: "HD", label: "Alta resolución" },
              { value: "Instant", label: "Entrega inmediata" },
              { value: "100%", label: "Pago seguro" },
            ].map((s, i) => (
              <div key={i} className="px-6 py-5 text-center border-white/5">
                <p className="text-xl font-bold" style={{ color: "#f59e0b" }}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-6 border-t" style={{ borderColor: "#1e1e35" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium mb-2" style={{ color: "#f59e0b" }}>Simple y rápido</p>
            <h2 className="text-3xl font-bold text-white">Cómo funciona</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
                title: "Elegí tu evento",
                desc: "Seleccioná la colección del evento donde participaste.",
              },
              {
                step: "02",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "Buscá tu dorsal",
                desc: "Ingresá tu número de dorsal y encontrá tu carpeta al instante.",
              },
              {
                step: "03",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                ),
                title: "Descargá tus fotos",
                desc: "Pagá con MercadoPago y descargá todas tus fotos en HD al instante.",
              },
            ].map((item) => (
              <div key={item.step} className="relative group rounded-2xl p-6 border transition-all duration-300 hover:border-amber-500/20" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b15", color: "#f59e0b" }}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#f59e0b40" }}>{item.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section id="colecciones" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "#f59e0b" }}>Eventos disponibles</p>
              <h2 className="text-3xl font-bold text-white">Colecciones</h2>
            </div>
            <p className="text-slate-500 text-sm hidden sm:block">
              {collections.length} evento{collections.length !== 1 ? "s" : ""}
            </p>
          </div>

          {collections.length === 0 ? (
            <div className="rounded-2xl p-20 text-center border" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "#1e1e35" }}>
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">Próximamente nuevas colecciones</p>
              <p className="text-slate-500 text-sm">Seguinos para enterarte de los próximos eventos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/colecciones/${col.slug}`}
                  className="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  style={{ background: "#0f0f1a", borderColor: "#1e1e35", boxShadow: "0 0 0 0 transparent" }}
                >
                  {col.coverUrl ? (
                    <div className="relative h-52 overflow-hidden">
                      <img src={col.coverUrl} alt={col.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-75" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0f0f1a 0%, transparent 60%)" }} />
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #16162a, #0f0f1a)" }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f59e0b15" }}>
                        <svg className="w-8 h-8" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-amber-400 transition-colors">
                        {col.title}
                      </h3>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all" style={{ background: "#f59e0b10", borderColor: "#f59e0b20" }}>
                        <svg className="w-4 h-4" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {col.description && (
                      <p className="text-slate-400 text-sm line-clamp-2 mb-3">{col.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "#1e1e35" }}>
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-xs text-slate-500">{col._count.folders} carpeta{col._count.folders !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px #f59e0b30" }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-6" style={{ borderColor: "#1e1e35" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="font-semibold text-white">FotoDeporte</span>
          </div>
          <p className="text-slate-600 text-sm">Fotografía deportiva profesional</p>
          <Link href="/admin" className="text-xs text-slate-700 hover:text-slate-500 transition-colors">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
