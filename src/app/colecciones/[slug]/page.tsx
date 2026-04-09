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
    <div className="min-h-screen" style={{ background: "#060608" }}>

      {/* ── Back nav ──────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: "#1a1a2e", background: "rgba(6,6,8,0.90)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm text-white font-semibold truncate">{collection.title}</span>
        </div>
      </div>

      {/* ── Hero banner ───────────────────────────────────── */}
      {bannerSrc ? (
        <div className="relative h-72 sm:h-96 overflow-hidden">
          <img
            src={bannerSrc}
            alt={collection.title}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.45)" }}
          />
          {/* Diagonal speed-line overlay */}
          <div className="absolute inset-0 speed-lines" />
          {/* Bottom gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #060608 0%, transparent 50%)" }} />
          {/* Right diagonal fade */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,6,8,0.6) 0%, transparent 60%)" }} />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-7xl mx-auto">
            <div className="flex items-end gap-5">
              {collection.logoUrl && (
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2"
                  style={{ borderColor: "rgba(245,158,11,0.5)" }}
                >
                  <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p
                  className="font-display font-600 uppercase tracking-widest text-xs mb-2"
                  style={{ color: "#f59e0b" }}
                >
                  Colección de fotos
                </p>
                <h1
                  className="font-display font-800 uppercase text-white leading-none"
                  style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}
                >
                  {collection.title}
                </h1>
                {collection.description && (
                  <p className="text-slate-300 mt-2 text-sm sm:text-base max-w-xl">{collection.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No banner — plain header */
        <div className="px-6 pt-12 pb-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-5">
            {collection.logoUrl && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border flex-shrink-0" style={{ borderColor: "#f59e0b40" }}>
                <img src={collection.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="font-display font-600 uppercase tracking-widest text-xs mb-1" style={{ color: "#f59e0b" }}>
                Colección
              </p>
              <h1 className="font-display font-800 uppercase text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-slate-400 mt-2 text-sm">{collection.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Divider with folder count ──────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-4 mb-0 flex items-center gap-4">
        <div className="h-px flex-1" style={{ background: "#1a1a2e" }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#252540" }}>
          {collection._count.photos} foto{collection._count.photos !== 1 ? "s" : ""}
        </span>
        <div className="h-px flex-1" style={{ background: "#1a1a2e" }} />
      </div>

      {/* ── Folder browser ────────────────────────────────── */}
      <FolderBrowser collectionId={collection.id} />
    </div>
  );
}
