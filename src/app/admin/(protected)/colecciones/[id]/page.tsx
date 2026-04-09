import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { EditCollectionForm } from "~/app/_components/admin/EditCollectionForm";
import { PhotoUploader } from "~/app/_components/admin/PhotoUploader";
import { PhotoManager } from "~/app/_components/admin/PhotoManager";
import { WatermarkAllButton } from "~/app/_components/admin/WatermarkAllButton";
import { createSignedUrl } from "~/lib/supabase/admin";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await api.collection.adminGetById({ id });
  if (!collection) notFound();

  // Fetch photos for this collection (server-side, with signed URLs)
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/colecciones" className="text-gray-500 hover:text-white text-sm">
          ← Colecciones
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-2xl font-bold">{collection.title}</h1>
      </div>

      <EditCollectionForm collection={collection} />

      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Fotos ({collection._count.photos})
          </h2>
          <WatermarkAllButton collectionId={id} />
        </div>
        <PhotoUploader collectionId={id} />
      </div>

      {photos.length > 0 && (
        <div className="mt-8">
          <PhotoManager collectionId={id} photos={photos} />
        </div>
      )}
    </div>
  );
}
