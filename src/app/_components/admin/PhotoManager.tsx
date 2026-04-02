"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Photo = {
  id: string;
  filename: string;
  storageKey: string;
};

export function PhotoManager({
  folderId,
  photos,
}: {
  folderId: string;
  photos: Photo[];
}) {
  const router = useRouter();

  const del = api.photo.delete.useMutation({ onSuccess: () => router.refresh() });

  if (photos.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No hay fotos aún. Subí algunas desde el panel izquierdo.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-800 aspect-square">
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs p-2 text-center">
            {photo.filename}
          </div>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${photo.filename}"?`)) {
                del.mutate({ id: photo.id });
              }
            }}
            disabled={del.isPending}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
