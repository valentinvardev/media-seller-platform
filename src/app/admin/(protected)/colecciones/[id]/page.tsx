import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { FolderActions } from "~/app/_components/admin/FolderActions";
import { EditCollectionForm } from "~/app/_components/admin/EditCollectionForm";

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
          <Link
            href={`/admin/colecciones/${id}/carpetas/nueva`}
            className="text-black text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
          >
            + Nueva carpeta
          </Link>
        </div>

        {collection.folders.length === 0 ? (
          <p className="text-gray-500">No hay carpetas aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {collection.folders.map((folder) => (
              <div
                key={folder.id}
                className="rounded-xl px-4 py-3 flex items-center justify-between transition-all hover:border-white/10"
                style={{ background: "#0f0f1a", border: "1px solid #1e1e35" }}
              >
                <div className="flex items-center gap-3">
                  {/* Lock / unlock icon */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={folder.isPublic
                      ? { background: "#6366f120", color: "#818cf8" }
                      : { background: "#f59e0b15", color: "#f59e0b" }}
                    title={folder.isPublic ? "Carpeta pública" : "Carpeta privada"}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {folder.isPublic ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                  </div>
                  <span className="font-mono text-white font-semibold">
                    #{folder.number}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={folder.isPublished
                      ? { background: "#10b98120", color: "#34d399" }
                      : { background: "#ffffff10", color: "#64748b" }}
                  >
                    {folder.isPublished ? "Publicada" : "Oculta"}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {folder._count.photos} fotos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/colecciones/${id}/carpetas/${folder.id}`}
                    className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "#f59e0b" }}
                  >
                    Editar
                  </Link>
                  <FolderActions id={folder.id} isPublished={folder.isPublished} isPublic={folder.isPublic} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
