import { api } from "~/trpc/server";
import Link from "next/link";
import { PhotoGallery } from "~/app/_components/PhotoGallery";

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await api.purchase.getDownloadInfo({ token });

  if (!info) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-5 px-4 text-center"
        style={{ background: "#07070f", color: "#f1f5f9" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#ef444415", border: "1px solid #ef444430" }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: "#f87171" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Link no válido o expirado
          </h1>
          <p className="text-sm max-w-xs" style={{ color: "#64748b" }}>
            Este link de descarga no es válido, ya expiró, o la compra no fue
            aprobada todavía.
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#1e1e35", color: "#94a3b8" }}
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const photos = info.photos.filter((p): p is { id: string; filename: string; url: string } => p.url !== null);

  return (
    <PhotoGallery
      token={token}
      folderNumber={info.folderNumber}
      collectionTitle={info.collectionTitle}
      buyerName={info.buyerName}
      isPublicInit={info.isPublic}
      photos={photos}
    />
  );
}
