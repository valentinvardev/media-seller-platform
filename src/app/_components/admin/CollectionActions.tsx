"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";

export function CollectionActions({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const toggle = api.collection.togglePublish.useMutation({
    onSuccess: () => router.refresh(),
  });
  const del = api.collection.delete.useMutation({
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
        onClick={() => setConfirming(true)}
        disabled={del.isPending}
        className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        Eliminar
      </button>

      {confirming && (
        <ConfirmModal
          title="Eliminar colección"
          message="Se eliminará esta colección y todas sus carpetas y fotos. Esta acción no se puede deshacer."
          onConfirm={() => { setConfirming(false); del.mutate({ id }); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
