import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { EditCollectionForm } from "~/app/_components/admin/EditCollectionForm";
import { BulkFolderCreate } from "~/app/_components/admin/BulkFolderCreate";
import { FolderList } from "~/app/_components/admin/FolderList";

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

      {/* Edit form */}
      <EditCollectionForm collection={collection} />

      {/* Folders */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Carpetas ({collection.folders.length})
          </h2>
          <div className="flex items-center gap-2">
            <BulkFolderCreate collectionId={id} />
            <Link
              href={`/admin/colecciones/${id}/carpetas/nueva`}
              className="text-black text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
            >
              + Nueva carpeta
            </Link>
          </div>
        </div>

        <FolderList folders={collection.folders} collectionId={id} />
      </div>
    </div>
  );
}
