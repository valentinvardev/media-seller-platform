"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function FolderActions({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const router = useRouter();

  const toggle = api.folder.togglePublish.useMutation({
    onSuccess: () => router.refresh(),
  });
  const del = api.folder.delete.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <>
      <button
        onClick={() => toggle.mutate({ id })}
        disabled={toggle.isPending}
        className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: "#94a3b8" }}
      >
        {isPublished ? "Ocultar" : "Publicar"}
      </button>
      <button
        onClick={() => {
          if (confirm("¿Eliminar esta carpeta y todas sus fotos?")) {
            del.mutate({ id });
          }
        }}
        disabled={del.isPending}
        className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        Eliminar
      </button>
    </>
  );
}
