import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { EditCollectionForm } from "~/app/_components/admin/EditCollectionForm";
import { PhotoUploader } from "~/app/_components/admin/PhotoUploader";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await api.collection.adminGetById({ id });
  if (!collection) notFound();

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
        </div>
        <PhotoUploader collectionId={id} />
      </div>
    </div>
  );
}
