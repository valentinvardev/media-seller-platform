import Link from "next/link";
import { api } from "~/trpc/server";

// ── Color tokens (Argentine blue palette)
// Primary:  #0057A8  (celeste)
// Navy:     #002D6E
// Surface:  #F0F6FF  (tinted white)

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen bg-white">

      {/* ════════════════════ NAV ════════════════════ */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">FotoDeporte</span>
          </Link>

          {/* Links */}
          <div className="hidden sm:flex items-center gap-8">
            <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors uppercase tracking-wide">
              Inicio
            </Link>
            <Link href="#contacto" className="text-sm font-semibold text-gray-500 hover:text-blue-700 transition-colors uppercase tracking-wide">
              Contacto
            </Link>
          </div>

          {/* Cart */}
          <Link href="#eventos" className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "#0057A8", color: "#fff" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden sm:inline">Ver fotos</span>
          </Link>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #F0F6FF 0%, #fff 60%)" }}>
        {/* Decorative circle */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: "#0057A8" }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-5 pointer-events-none"
          style={{ background: "#002D6E" }} />

        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                Encontrá tus fotos<br />
                <span style={{ color: "#0057A8" }}>de carrera</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-10">
                Todos los corredores de Argentina merecen recordar su esfuerzo.
                Buscá por dorsal y comprá tus fotos en HD al instante.
              </p>

              {/* Steps — card style */}
              <div className="flex flex-col gap-3 mb-10">
                {[
                  { num: "1", title: "Elegí tu evento", desc: "Seleccioná la carrera en la que participaste" },
                  { num: "2", title: "Buscá tu dorsal", desc: "Ingresá tu número o subí una selfie" },
                  { num: "3", title: "Descargá en HD", desc: "Pagá con MercadoPago y recibís al instante" },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                      style={{ background: "#0057A8" }}>
                      {s.num}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="#eventos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all hover:scale-105 shadow-lg"
                style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)", boxShadow: "0 8px 24px rgba(0,87,168,0.3)" }}>
                Ver eventos disponibles
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Right — photo placeholder */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]"
                style={{ background: "linear-gradient(135deg, #002D6E 0%, #0057A8 50%, #60A5FA 100%)" }}>
                {/* Decorative grid pattern */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
                  }} />
                {/* Center icon */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                  <svg className="w-24 h-24 mb-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium opacity-70">Tu foto de carrera aquí</p>
                </div>
                {/* Corner accent */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  HD · Sin marca
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#E8F3FF" }}>
                  <svg className="w-5 h-5" style={{ color: "#0057A8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Descarga inmediata</p>
                  <p className="text-xs text-gray-400">Fotos en alta resolución</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ EVENTS ════════════════════ */}
      <section id="eventos" className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "#0057A8" }}>
              Eventos disponibles
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              ¿En qué carrera corriste?
            </h2>
          </div>

          {collections.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" style={{ color: "#0057A8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">Próximamente</p>
              <p className="text-sm text-gray-400">Los próximos eventos aparecerán aquí</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((col) => (
                <div key={col.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200 group flex flex-col">

                  {/* Cover image with circular logo */}
                  <div className="relative h-52 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
                    {(col.bannerUrl ?? col.coverUrl) ? (
                      <img
                        src={(col.bannerUrl ?? col.coverUrl)!}
                        alt={col.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Circular logo */}
                    {col.logoUrl ? (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
                        <img src={col.logoUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                        style={{ background: "#0057A8" }}>
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content — push below circular logo */}
                  <div className="pt-10 pb-5 px-5 flex flex-col flex-1 text-center">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
                      {col.title}
                    </h3>
                    {col.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{col.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mb-5">
                      {col._count.photos} foto{col._count.photos !== 1 ? "s" : ""}
                    </p>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Link
                        href={`/colecciones/${col.slug}`}
                        className="block w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 text-center"
                        style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
                      >
                        Explorar fotos
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════ MERCADOPAGO ════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #002D6E 0%, #0057A8 100%)" }} className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-4">Método de pago aceptado</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-4 bg-white rounded-2xl px-8 py-5 shadow-xl">
              {/* MercadoPago wordmark (text-based) */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#00BCFF" }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-extrabold text-gray-900 text-2xl leading-none">MercadoPago</p>
                <p className="text-xs text-gray-500 mt-0.5">Pagos seguros en Argentina</p>
              </div>
            </div>
          </div>
          <p className="text-blue-200 text-sm max-w-lg mx-auto leading-relaxed">
            Aceptamos tarjetas de crédito, débito, transferencia bancaria y efectivo a través de MercadoPago.
            Tus datos de pago están 100% protegidos.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-blue-300">
            {["Visa", "Mastercard", "Débito", "Rapipago", "Pago Fácil"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-full border border-blue-400/40 bg-blue-400/10">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer id="contacto" style={{ background: "#001A4D" }} className="py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0057A8, #60A5FA)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-bold text-white">FotoDeporte</span>
              </div>
              <p className="text-blue-300 text-xs leading-relaxed">
                Fotografía deportiva profesional en Argentina. Inmortalizamos tu esfuerzo.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-white font-semibold text-sm mb-3">Legal</p>
              <ul className="flex flex-col gap-2">
                <li><Link href="/terminos" className="text-blue-300 text-xs hover:text-white transition-colors">Condiciones de servicio</Link></li>
                <li><Link href="/privacidad" className="text-blue-300 text-xs hover:text-white transition-colors">Política de privacidad</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-white font-semibold text-sm mb-3">Contacto</p>
              <p className="text-blue-300 text-xs">¿Preguntas sobre tus fotos?</p>
              <a href="mailto:hola@fotodeporte.com.ar"
                className="text-xs font-medium mt-1 block hover:text-white transition-colors"
                style={{ color: "#60A5FA" }}>
                hola@fotodeporte.com.ar
              </a>
            </div>
          </div>

          <div className="border-t border-blue-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-400 text-xs">© {new Date().getFullYear()} FotoDeporte. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="text-blue-500 text-xs hover:text-blue-300 transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-blue-500 text-xs hover:text-blue-300 transition-colors">Privacidad</Link>
              <Link href="/admin" className="text-blue-800 text-xs hover:text-blue-600 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
