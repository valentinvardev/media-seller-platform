import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { PhotoUploader } from "~/app/_components/admin/PhotoUploader";
import { PhotoManager } from "~/app/_components/admin/PhotoManager";
import { WatermarkAllButton } from "~/app/_components/admin/WatermarkAllButton";
import { CollectionActions } from "~/app/_components/admin/CollectionActions";
import { createSignedUrl } from "~/lib/supabase/admin";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await api.collection.adminGetById({ id });
  if (!collection) notFound();

  const { db } = await import("~/server/db");
  const rawPhotos = await db.photo.findMany({
    where: { collectionId: id },
    orderBy: { order: "asc" },
    select: { id: true, filename: true, bibNumber: true, storageKey: true, previewKey: true },
  });

  const photos = await Promise.all(
    rawPhotos.map(async (p) => {
      const key = p.previewKey ?? p.storageKey;
      const url = key.startsWith("http") ? key : await createSignedUrl(key, 3600);
      return { ...p, url };
    }),
  );

  // Sort: null bib first (unidentified), then identified
  const sortedPhotos = [
    ...photos.filter((p) => !p.bibNumber),
    ...photos.filter((p) => !!p.bibNumber),
  ];

  const eventDate = collection.eventDate
    ? new Date(collection.eventDate).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const unidentifiedCount = photos.filter((p) => !p.bibNumber).length;

  return (
    <div>
      {/* Back */}
      <Link
        href="/admin/colecciones"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Eventos
      </Link>

      {/* Event header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {collection.coverUrl ? (
              <img src={collection.coverUrl} alt={collection.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{collection.title}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {eventDate && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {eventDate}
                  </span>
                )}
                <span className="text-xs text-gray-400">/colecciones/{collection.slug}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link
              href={`/colecciones/${collection.slug}`}
              target="_blank"
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all"
            >
              ↗ Ver público
            </Link>
            <CollectionActions id={collection.id} isPublished={collection.isPublished} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Fotos totales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: unidentifiedCount > 0 ? "#f59e0b" : "#16a34a" }}>{unidentifiedCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Sin dorsal</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{Number(collection.pricePerBib ?? 0).toLocaleString("es-AR")}</p>
            <p className="text-xs text-gray-400 mt-0.5">Precio ARS</p>
          </div>
        </div>
      </div>

      {/* Two-column layout: uploader left, gallery right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: upload */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Subir fotos</h2>
            <PhotoUploader collectionId={id} />
          </div>
        </div>

        {/* Right: gallery with bib assignment */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">
                Galería
                {unidentifiedCount > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                    {unidentifiedCount} sin dorsal
                  </span>
                )}
              </h2>
              <WatermarkAllButton collectionId={id} />
            </div>
            {sortedPhotos.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-400 text-sm">Subí fotos para empezar</p>
              </div>
            ) : (
              <PhotoManager collectionId={id} photos={sortedPhotos} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
