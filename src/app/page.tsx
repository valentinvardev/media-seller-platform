import Link from "next/link";
import { api } from "~/trpc/server";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen" style={{ background: "#060608" }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 border-b"
        style={{ background: "rgba(6,6,8,0.90)", borderColor: "#1a1a2e", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-800 text-black text-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-display font-700 text-white text-xl tracking-wide uppercase">FotoDeporte</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="#colecciones" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block font-medium">
              Colecciones
            </Link>
            <Link href="#como-funciona" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block font-medium">
              Cómo funciona
            </Link>
            <Link
              href="#colecciones"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
            >
              Ver fotos
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden speed-lines">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
          />
          {/* Diagonal accent line */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 49.8%, rgba(245,158,11,0.06) 49.8%, rgba(245,158,11,0.06) 50.2%, transparent 50.2%)",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 uppercase tracking-widest"
              style={{ background: "#f59e0b18", border: "1px solid #f59e0b35", color: "#fbbf24" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: "#f59e0b" }} />
              Fotos disponibles ahora
            </div>

            {/* Headline */}
            <h1 className="font-display font-800 uppercase leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)", letterSpacing: "-0.01em" }}>
              <span className="block text-white">Corriste.</span>
              <span className="block text-gradient">Lo capturamos.</span>
            </h1>

            <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
              Encontrá tu carpeta por número de dorsal y descargá todas las fotos
              de tu carrera en alta resolución, al instante.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="#colecciones"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-black text-base transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", boxShadow: "0 0 40px rgba(245,158,11,0.3)" }}
              >
                Ver colecciones
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-slate-300 border border-white/10 hover:border-white/25 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                Cómo funciona
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 flex flex-wrap gap-px rounded-2xl overflow-hidden border max-w-2xl" style={{ borderColor: "#1a1a2e" }}>
            {[
              { value: "HD", label: "Alta resolución" },
              { value: "Inmediato", label: "Entrega al instante" },
              { value: "MercadoPago", label: "Pago seguro" },
            ].map((s, i) => (
              <div key={i} className="flex-1 min-w-[120px] px-6 py-5 text-center" style={{ background: "#0c0c16" }}>
                <p className="font-display font-700 text-xl uppercase tracking-wide" style={{ color: "#f59e0b" }}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, #060608)" }} />
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="como-funciona" className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none speed-lines opacity-50" />

        <div className="max-w-6xl mx-auto relative">
          <div className="mb-16">
            <p className="font-display font-600 uppercase tracking-widest text-sm mb-3" style={{ color: "#f59e0b" }}>
              Simple y rápido
            </p>
            <h2 className="font-display font-800 uppercase text-5xl sm:text-6xl text-white leading-none">
              Tres pasos,<br />
              <span className="text-gradient">todas tus fotos.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: "Elegí tu evento",
                desc: "Seleccioná la colección del evento donde corriste.",
              },
              {
                num: "02",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "Buscá tu dorsal",
                desc: "Ingresá tu número de dorsal o subí una foto con tu cara.",
              },
              {
                num: "03",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                ),
                title: "Descargá en HD",
                desc: "Pagá y descargá todas tus fotos en alta resolución de forma inmediata.",
              },
            ].map((item, i) => (
              <div
                key={item.num}
                className="relative rounded-2xl p-7 border card-hover group"
                style={{ background: "#0c0c16", borderColor: "#1a1a2e", animationDelay: `${i * 0.1}s` }}
              >
                {/* Number watermark */}
                <div
                  className="absolute top-4 right-5 font-display font-800 text-6xl leading-none select-none pointer-events-none"
                  style={{ color: "rgba(245,158,11,0.05)" }}
                >
                  {item.num}
                </div>

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "#f59e0b15", color: "#f59e0b" }}
                >
                  {item.icon}
                </div>
                <h3 className="font-display font-700 uppercase text-xl text-white mb-2 tracking-wide">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>

                {/* Hover accent line */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(90deg, #f59e0b, transparent)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Collections ─────────────────────────────────────── */}
      <section id="colecciones" className="py-28 px-6 border-t" style={{ borderColor: "#1a1a2e" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-14 gap-4 flex-wrap">
            <div>
              <p className="font-display font-600 uppercase tracking-widest text-sm mb-3" style={{ color: "#f59e0b" }}>
                Eventos disponibles
              </p>
              <h2 className="font-display font-800 uppercase text-5xl sm:text-6xl text-white leading-none">
                Colecciones
              </h2>
            </div>
            <span className="text-slate-500 text-sm">
              {collections.length} evento{collections.length !== 1 ? "s" : ""}
            </span>
          </div>

          {collections.length === 0 ? (
            <div
              className="rounded-2xl p-24 text-center border speed-lines"
              style={{ background: "#0c0c16", borderColor: "#1a1a2e" }}
            >
              <p className="font-display font-700 uppercase text-2xl text-white mb-2">Próximamente</p>
              <p className="text-slate-500 text-sm">Seguinos para enterarte de los próximos eventos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/colecciones/${col.slug}`}
                  className="group relative overflow-hidden rounded-2xl border card-hover"
                  style={{ background: "#0c0c16", borderColor: "#1a1a2e" }}
                >
                  {/* Cover / Banner image */}
                  {(col.bannerUrl ?? col.coverUrl) ? (
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={(col.bannerUrl ?? col.coverUrl)!}
                        alt={col.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ filter: "brightness(0.55)" }}
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0c0c16 0%, transparent 55%)" }} />

                      {col.logoUrl && (
                        <div className="absolute top-3 left-3 w-10 h-10 rounded-xl overflow-hidden border" style={{ borderColor: "#f59e0b40" }}>
                          <img src={col.logoUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Speed line accent on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none speed-lines" />
                    </div>
                  ) : (
                    <div
                      className="h-52 flex items-center justify-center relative overflow-hidden speed-lines"
                      style={{ background: "linear-gradient(135deg, #13131f, #0c0c16)" }}
                    >
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f59e0b12" }}>
                        <svg className="w-8 h-8" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-display font-700 uppercase text-xl text-white leading-tight group-hover:text-gradient transition-colors">
                        {col.title}
                      </h3>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                        style={{ background: "#f59e0b15", color: "#f59e0b" }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    {col.description && (
                      <p className="text-slate-500 text-sm line-clamp-2 mb-3">{col.description}</p>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "#1a1a2e" }}>
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-xs text-slate-600 font-medium">
                        {col._count.photos} foto{col._count.photos !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: "#1a1a2e" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="font-display font-700 uppercase tracking-wide text-white">FotoDeporte</span>
          </div>
          <p className="text-slate-700 text-sm">Fotografía deportiva profesional</p>
          <Link href="/admin" className="text-xs text-slate-800 hover:text-slate-500 transition-colors">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
