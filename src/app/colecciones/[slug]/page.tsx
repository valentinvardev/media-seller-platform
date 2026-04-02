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

  return (
    <div className="min-h-screen" style={{ background: "#080810" }}>
      {/* Back nav */}
      <div className="border-b" style={{ borderColor: "#1e1e35" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </Link>
          <span className="mx-3 text-slate-700">/</span>
          <span className="text-sm text-white font-medium">{collection.title}</span>
        </div>
      </div>

      {/* Collection header */}
      {collection.coverUrl ? (
        <div className="relative h-56 overflow-hidden">
          <img src={collection.coverUrl} alt={collection.title} className="w-full h-full object-cover brightness-50" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080810 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-white">{collection.title}</h1>
            {collection.description && <p className="text-slate-300 mt-2">{collection.description}</p>}
          </div>
        </div>
      ) : (
        <div className="px-6 pt-10 pb-2 max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white">{collection.title}</h1>
          {collection.description && <p className="text-slate-400 mt-2">{collection.description}</p>}
        </div>
      )}

      {/* Folder browser */}
      <FolderBrowser collectionId={collection.id} />
    </div>
  );
}
