import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { FolderBrowser } from "~/app/_components/FolderBrowser";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await api.collection.getBySlug({ slug });
  if (!collection) notFound();

  const bannerSrc = collection.bannerUrl ?? collection.coverUrl;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Eventos
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-semibold truncate">{collection.title}</span>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      {bannerSrc ? (
        <div className="relative h-56 sm:h-72 overflow-hidden bg-gray-900">
          <img
            src={bannerSrc}
            alt={collection.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 max-w-6xl mx-auto">
            <div className="flex items-end gap-4">
              {collection.logoUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-lg">
                  <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                  {collection.title}
                </h1>
                {collection.description && (
                  <p className="text-white/70 mt-1 text-sm">{collection.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200 px-6 py-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            {collection.logoUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{collection.title}</h1>
              {collection.description && (
                <p className="text-gray-500 mt-1 text-sm">{collection.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span><strong className="text-gray-900">{collection._count.photos}</strong> foto{collection._count.photos !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Marca de agua</span>
          </div>
        </div>
      </div>

      {/* ── Gallery + Search ──────────────────────────────────── */}
      <FolderBrowser collectionId={collection.id} />
    </div>
  );
}
