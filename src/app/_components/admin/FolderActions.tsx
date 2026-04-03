"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ConfirmModal } from "./ConfirmModal";
import { PublishToggle } from "./PublishToggle";

export function FolderActions({
  id,
  isPublished,
  isPublic,
}: {
  id: string;
  isPublished: boolean;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const toggle = api.folder.togglePublish.useMutation({ onSuccess: () => router.refresh() });
  const togglePublic = api.folder.togglePublicFolder.useMutation({ onSuccess: () => router.refresh() });
  const del = api.folder.delete.useMutation({ onSuccess: () => router.refresh() });

  return (
    <>
      {/* Public / Private toggle */}
      <button
        onClick={() => togglePublic.mutate({ id })}
        disabled={togglePublic.isPending}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
        style={{ color: isPublic ? "#818cf8" : "#64748b" }}
        title={isPublic ? "Hacer privada" : "Hacer pública (sin paywall)"}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isPublic ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          )}
        </svg>
        {isPublic ? "Pública" : "Privada"}
      </button>

      {/* Publish / Hide toggle */}
      <PublishToggle
        isPublished={isPublished}
        isPending={toggle.isPending}
        onToggle={() => toggle.mutate({ id })}
        labelOn="Publicada"
        labelOff="Oculta"
      />

      {/* Delete */}
      <button
        onClick={() => setConfirming(true)}
        disabled={del.isPending}
        className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        Eliminar
      </button>

      {confirming && (
        <ConfirmModal
          title="Eliminar carpeta"
          message="Se eliminará esta carpeta y todas sus fotos. Esta acción no se puede deshacer."
          onConfirm={() => { setConfirming(false); del.mutate({ id }); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
