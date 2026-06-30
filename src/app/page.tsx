import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/server";
import { MobileNav } from "~/app/_components/MobileNav";
import { EventCard } from "~/app/_components/EventCard";
import { WhatsAppNavButton, WhatsAppFooterButton } from "~/app/_components/WhatsAppModal";

export default async function HomePage() {
  const collections = await api.collection.list();

  return (
    <div className="min-h-screen bg-white">

      {/* ════════ NAV ════════ */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: "#0057A8" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo — mobile only */}
          <Link href="/" className="md:hidden flex items-center shrink-0">
            <Image src="/logo.png" alt="ALTAFOTO" width={180} height={52} className="h-11 w-auto" priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Inicio</Link>
            <a href="#eventos" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Eventos</a>
            <WhatsAppNavButton />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <a href="#eventos" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-105"
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

      {/* ════════ HERO — full bleed ════════ */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: "40vh" }}>
        <Image
          src="/hero.jpg"
          alt="Foto de carrera"
          fill
          className="object-cover object-[center_95%]"
          priority
        />

        {/* Mobile: centered logo */}
        <div className="sm:hidden relative z-10 flex items-center justify-center w-full py-12">
          <Link href="/">
            <Image src="/logo.png" alt="ALTAFOTO" width={630} height={180} className="h-[134px] w-auto drop-shadow-2xl" priority />
          </Link>
        </div>
        {/* Desktop: top-right logo */}
        <div className="hidden sm:flex absolute top-0 right-0 z-10 pt-2 pr-10 items-start justify-end">
          <Link href="/">
            <Image src="/logo.png" alt="ALTAFOTO" width={630} height={180} className="h-[275px] w-auto drop-shadow-2xl" priority />
          </Link>
        </div>
      </section>

      <div className="h-0.5 w-full" style={{ background: "#F97316" }} />

      {/* ════════ EVENTS ════════ */}
      <section id="eventos" className="py-14 px-8 sm:px-14" style={{ background: "#F97316" }}>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display font-800 uppercase text-white"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.01em" }}>
              Eventos
            </h2>
            {collections.length > 0 && (
              <span className="text-sm text-white/80">{collections.length} disponible{collections.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {collections.length === 0 ? (
            <div className="bg-white/20 rounded-2xl border border-white/30 p-16 text-center">
              <p className="font-display font-700 uppercase text-2xl text-white mb-1">Próximamente</p>
              <p className="text-sm text-white/80">Los próximos eventos aparecerán aquí</p>
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
      <section style={{ background: "#ffffff" }} className="py-14 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display font-700 uppercase tracking-widest text-black text-xl mb-2">Método de pago aceptado</p>
          <p className="text-gray-600 text-sm mb-8">Tarjetas, transferencia y efectivo — 100% seguro a través de MercadoPago</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mercado_Pago.svg/960px-Mercado_Pago.svg.png"
              alt="MercadoPago"
              className="h-20 w-auto"
            />
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer id="contacto" style={{ background: "#001A4D" }} className="py-10 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="mb-3">
                <Image src="/logo.png" alt="ALTAFOTO" width={120} height={34} className="h-8 w-auto" />
              </div>
              <p className="text-blue-300 text-xs leading-relaxed mb-4">Fotografía deportiva profesional en Argentina.</p>
              <a
                href="https://instagram.com/altafoto.arg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-300 text-xs hover:text-white transition-colors group"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span className="font-medium">@altafoto.arg</span>
              </a>
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
              <WhatsAppFooterButton />
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

