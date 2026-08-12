import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { FolderBrowser } from "~/app/_components/FolderBrowser";
import { CartProvider } from "~/app/_components/CartContext";
import { NavCartButton } from "~/app/_components/NavCartButton";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await api.collection.getBySlug({ slug });
  if (!collection) notFound();

  const bannerSrc = collection.bannerUrl ?? collection.coverUrl;

  const dateStr = collection.eventDate
    ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(collection.eventDate))
    : null;

  return (
    <CartProvider>
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Eventos
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-semibold truncate">{collection.title}</span>
          <NavCartButton price={Number(collection.pricePerBib)} collectionId={collection.id} />
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      {bannerSrc ? (
        <div className="relative h-52 sm:h-64 overflow-hidden bg-gray-900">
          <img src={bannerSrc} alt={collection.title} className="w-full h-full object-cover opacity-55" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%)" }} />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-6xl mx-auto px-5 pb-6 flex items-end gap-4">
              {collection.logoUrl && (
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white/80 shadow-lg">
                  <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="font-display font-800 uppercase text-white leading-none"
                  style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)" }}>
                  {collection.title}
                </h1>
                {(dateStr ?? collection.description) && (
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {dateStr && (
                      <span className="text-white/80 text-xs font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {dateStr}
                      </span>
                    )}
                    {collection.description && (
                      <span className="text-white/65 text-xs">{collection.description}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-5 py-7 flex items-center gap-4">
            {collection.logoUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="font-display font-800 uppercase text-gray-900"
                style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", lineHeight: 1 }}>
                {collection.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {dateStr && (
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "#F97316" }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {dateStr}
                  </span>
                )}
                {collection.description && (
                  <span className="text-gray-500 text-sm">{collection.description}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats bar — width-contained ───────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span><strong className="text-gray-900">{collection._count.photos}</strong> foto{collection._count.photos !== 1 ? "s" : ""}</span>
          </div>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Marca de agua en preview</span>
          </div>
        </div>
      </div>

      {/* ── Gallery + Search ──────────────────────────────────── */}
      <FolderBrowser
        collectionId={collection.id}
        pricePerBib={Number(collection.pricePerBib)}
        hasAlphanumericBibs={collection.hasAlphanumericBibs}
      />

      {/* ── MercadoPago strip ─────────────────────────────────── */}
      <section style={{ background: "#ffffff" }} className="py-14 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display font-700 uppercase tracking-widest text-black text-xl mb-2">Método de pago aceptado</p>
          <p className="text-gray-600 text-sm mb-8">Tarjetas, transferencia y efectivo — 100% seguro a través de MercadoPago</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mercadopago.svg"
              alt="MercadoPago"
              className="h-16 w-auto"
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ background: "#001A4D" }} className="py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display font-700 uppercase tracking-wider text-blue-300 text-sm">ALTAFOTO</span>
          <p className="text-blue-500 text-xs">© {new Date().getFullYear()} ALTAFOTO. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/altafoto.arg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-400 text-xs hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              @altafoto.arg
            </a>
            <Link href="/terminos" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
    </CartProvider>
  );
}
