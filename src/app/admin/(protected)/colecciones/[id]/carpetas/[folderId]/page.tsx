import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { PhotoUploader } from "~/app/_components/admin/PhotoUploader";
import { PhotoManager } from "~/app/_components/admin/PhotoManager";
import { createSignedUrl } from "~/lib/supabase/admin";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string; folderId: string }>;
}) {
  const { id: collectionId, folderId } = await params;
  const folder = await api.folder.adminGetById({ id: folderId });
  if (!folder) notFound();

  const photosWithUrls = await Promise.all(
    folder.photos.map(async (p) => ({
      ...p,
      url: await createSignedUrl(p.storageKey, 3600),
    })),
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-8 text-sm flex-wrap">
        <Link href="/admin/colecciones" className="text-gray-500 hover:text-white">
          Colecciones
        </Link>
        <span className="text-gray-700">/</span>
        <Link href={`/admin/colecciones/${collectionId}`} className="text-gray-500 hover:text-white">
          {folder.collection.title}
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-white font-semibold">Carpeta #{folder.number}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Info */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Carpeta #{folder.number}</h1>
          <p className="text-gray-400 text-sm mb-6">
            $ {Number(folder.price).toLocaleString("es-AR")} ·{" "}
            {folder.photos.length} foto{folder.photos.length !== 1 ? "s" : ""}
          </p>

          {/* Upload */}
          <h2 className="text-lg font-semibold mb-3">Subir fotos</h2>
          <PhotoUploader folderId={folderId} collectionId={collectionId} />
        </div>

        {/* Photo grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Fotos en esta carpeta</h2>
          <PhotoManager folderId={folderId} photos={photosWithUrls} />
        </div>
      </div>

      {/* Purchases */}
      {folder.purchases.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4">
            Compras ({folder.purchases.length})
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Monto</th>
                </tr>
              </thead>
              <tbody>
                {folder.purchases.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-gray-300">{p.buyerEmail}</td>
                    <td className="px-4 py-3 text-gray-300">{p.status}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      $ {Number(p.amountPaid).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
