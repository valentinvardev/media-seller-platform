import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/server";
import { MobileNav } from "~/app/_components/MobileNav";
import { EventCard } from "~/app/_components/EventCard";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen bg-white">

      {/* ════════ NAV ════════ */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: "#0057A8" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo — mobile only */}
          <Link href="/" className="md:hidden flex items-center shrink-0">
            <Image src="/logo-altafoto.png" alt="ALTAFOTO" width={180} height={52} className="h-11 w-auto brightness-0 invert" priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Inicio</Link>
            <a href="#eventos" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Eventos</a>
            <a href="#contacto" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Contacto</a>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <a href="#eventos" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black text-white transition-all hover:scale-105"
              style={{ background: "#F97316" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mis fotos
            </a>
            <MobileNav />
          </div>
        </div>
        {/* Orange separator */}
        <div className="h-0.5 w-full" style={{ background: "#F97316" }} />
      </nav>

      {/* ════════ HERO — 40vh split ════════ */}
      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "40vh" }}>

          {/* Left — content */}
          <div className="flex flex-col justify-center px-8 sm:px-14 py-8 speed-lines"
            style={{ background: "linear-gradient(150deg, #F0F6FF 0%, #ffffff 80%)" }}>
            <Link href="/" className="mb-8 self-start hidden sm:block">
              <Image src="/logo-altafoto.png" alt="ALTAFOTO" width={448} height={128} className="h-28 w-auto" priority />
            </Link>

            <p className="text-gray-500 text-base sm:text-sm leading-relaxed mb-5 max-w-sm font-medium">
              Buscá tu número, comprá y descargá tus fotos en HD al instante.
            </p>

            {/* Steps — column on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-3 gap-x-5 mb-6">
              {[
                { num: "01", label: "Elegí el evento" },
                { num: "02", label: "Ingresá tu número" },
                { num: "03", label: "Descargá en HD" },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center gap-2">
                  {i > 0 && <span className="hidden sm:inline text-gray-200 text-sm mr-2">›</span>}
                  <span className="font-display font-800 text-2xl sm:text-xl leading-none"
                    style={{ color: "#F97316" }}>{s.num}</span>
                  <span className="text-sm sm:text-xs font-semibold text-gray-600">{s.label}</span>
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
          <div className="relative hidden lg:flex items-center justify-center overflow-hidden" style={{ minHeight: "40vh" }}>
            <Image
              src="/banner.jpg"
              alt="Foto de carrera"
              fill
              className="object-cover object-top"
              priority
            />
            {/* Corner badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold text-white z-10"
              style={{ background: "rgba(249,115,22,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>
              Ultra alta definición
            </div>
          </div>
        </div>
      </section>

      <div className="h-0.5 w-full" style={{ background: "#F97316" }} />

      {/* ════════ EVENTS ════════ */}
      <section id="eventos" className="py-14 px-8 sm:px-14 bg-gray-50">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {collections.map((col) => (
                <EventCard key={col.id} col={col} />
              ))}
            </div>
          )}
      </section>

      {/* ════════ MERCADOPAGO ════════ */}
      <section style={{ background: "linear-gradient(135deg, #c2410c 0%, #F97316 100%)" }} className="py-14 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display font-700 uppercase tracking-widest text-white text-xl mb-2">Método de pago aceptado</p>
          <p className="text-orange-100 text-sm mb-8">Tarjetas, transferencia y efectivo — 100% seguro a través de MercadoPago</p>
          <div className="flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mercado_Pago.svg/960px-Mercado_Pago.svg.png"
              alt="MercadoPago"
              className="h-20 w-auto"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["Visa", "Mastercard", "Débito", "Rapipago", "Pago Fácil", "Transferencia"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold text-orange-100 border border-orange-200/40 bg-white/10">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer id="contacto" style={{ background: "#001A4D" }} className="py-10 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="mb-3">
                <Image src="/logo-altafoto.png" alt="ALTAFOTO" width={120} height={34} className="h-8 w-auto brightness-0 invert" />
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
            <p className="text-blue-500 text-xs">© {new Date().getFullYear()} ALTAFOTO. Todos los derechos reservados.</p>
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

