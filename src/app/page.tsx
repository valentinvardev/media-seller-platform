import Link from "next/link";
import { api } from "~/trpc/server";
import { MobileNav } from "~/app/_components/MobileNav";
import { EventCard } from "~/app/_components/EventCard";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen bg-white">

      {/* ════════ NAV ════════ */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-display font-700 text-gray-900 text-xl uppercase tracking-wider">FotoDeporte</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            <Link href="/" className="font-display font-600 uppercase tracking-wider text-sm text-gray-900 hover:text-blue-700 transition-colors">Inicio</Link>
            <a href="#eventos" className="font-display font-600 uppercase tracking-wider text-sm text-gray-500 hover:text-blue-700 transition-colors">Eventos</a>
            <a href="#contacto" className="font-display font-600 uppercase tracking-wider text-sm text-gray-500 hover:text-blue-700 transition-colors">Contacto</a>
            <a href="#eventos" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "#0057A8" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mis fotos
            </a>
          </div>

          <MobileNav />
        </div>
      </nav>

      {/* ════════ HERO — 40vh split ════════ */}
      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "40vh" }}>

          {/* Left — content */}
          <div className="flex flex-col justify-center px-8 sm:px-14 py-8 speed-lines"
            style={{ background: "linear-gradient(150deg, #F0F6FF 0%, #ffffff 80%)" }}>
            <h1 className="font-display font-800 uppercase leading-none text-gray-900 mb-3"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.01em" }}>
              <span className="block">Corriste.</span>
              <span className="block text-gradient">Lo capturamos.</span>
            </h1>

            <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-sm">
              Buscá tu dorsal, comprá y descargá tus fotos en HD al instante.
            </p>

            {/* Steps — horizontal row */}
            <div className="flex items-center gap-6 mb-6">
              {[
                { num: "01", label: "Elegí el evento" },
                { num: "02", label: "Ingresá tu dorsal" },
                { num: "03", label: "Descargá en HD" },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center gap-2 shrink-0">
                  {i > 0 && <span className="text-gray-200 text-sm mr-2">›</span>}
                  <span className="font-display font-800 text-xl leading-none"
                    style={{ color: "#0057A8" }}>{s.num}</span>
                  <span className="text-xs font-semibold text-gray-600">{s.label}</span>
                </div>
              ))}
            </div>

            <a href="#eventos"
              className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display font-700 uppercase tracking-wider text-white text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)", boxShadow: "0 4px 16px rgba(0,87,168,0.28)" }}>
              Ver eventos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Right — full bleed photo area */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ background: "linear-gradient(135deg, #002D6E 0%, #0057A8 60%, #60A5FA 100%)", minHeight: "40vh" }}>
            <div className="absolute inset-0 speed-lines opacity-10" />
            <div className="flex flex-col items-center justify-center text-white/60 relative z-10">
              <svg className="w-16 h-16 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="font-display font-600 uppercase tracking-widest text-xs opacity-50">Tu foto de carrera</p>
            </div>
            {/* Corner badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              HD · Alta resolución
            </div>
          </div>
        </div>
      </section>

      {/* ════════ EVENTS ════════ */}
      <section id="eventos" className="py-14 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display font-800 uppercase text-gray-900"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.01em" }}>
              Eventos
            </h2>
            {collections.length > 0 && (
              <span className="text-sm text-gray-400">{collections.length} disponible{collections.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {collections.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <p className="font-display font-700 uppercase text-2xl text-gray-400 mb-1">Próximamente</p>
              <p className="text-sm text-gray-400">Los próximos eventos aparecerán aquí</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map((col) => (
                <EventCard key={col.id} col={col} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════ MERCADOPAGO ════════ */}
      <section style={{ background: "linear-gradient(135deg, #002D6E 0%, #0057A8 100%)" }} className="py-14 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display font-600 uppercase tracking-widest text-blue-200 text-sm mb-6">Método de pago aceptado</p>
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mercado_Pago.svg/960px-Mercado_Pago.svg.png"
              alt="MercadoPago"
              className="h-24 w-auto"
            />
          </div>
          <p className="text-blue-200 text-sm max-w-md mx-auto leading-relaxed mb-7">
            Tarjetas de crédito, débito, transferencia y efectivo — todo a través de MercadoPago.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["Visa", "Mastercard", "Débito", "Rapipago", "Pago Fácil", "Transferencia"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold text-blue-200 border border-blue-500/40 bg-blue-500/10">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer id="contacto" style={{ background: "#001A4D" }} className="py-10 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0057A8, #60A5FA)" }}>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-display font-700 uppercase tracking-wider text-white text-base">FotoDeporte</span>
              </div>
              <p className="text-blue-300 text-xs leading-relaxed">Fotografía deportiva profesional en Argentina.</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Legal</p>
              <ul className="flex flex-col gap-2">
                <li><Link href="/terminos" className="text-blue-300 text-xs hover:text-white transition-colors">Condiciones de servicio</Link></li>
                <li><Link href="/privacidad" className="text-blue-300 text-xs hover:text-white transition-colors">Política de privacidad</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Contacto</p>
              <a href="mailto:hola@fotodeporte.com.ar" className="text-xs font-medium hover:text-white transition-colors" style={{ color: "#60A5FA" }}>
                hola@fotodeporte.com.ar
              </a>
            </div>
          </div>
          <div className="border-t border-blue-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-500 text-xs">© {new Date().getFullYear()} FotoDeporte. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Privacidad</Link>
              <Link href="/admin" className="text-blue-900 text-xs hover:text-blue-700 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

