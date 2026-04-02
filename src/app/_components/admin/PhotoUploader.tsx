"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function PhotoUploader({
  folderId,
  collectionId,
}: {
  folderId: string;
  collectionId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bulkAdd = api.photo.bulkAdd.useMutation({
    onSuccess: () => {
      router.refresh();
      setProgress(0);
    },
  });

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const uploaded: { storageKey: string; filename: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const path = `${collectionId}/${folderId}/${Date.now()}-${file.name}`;

      // Get signed upload URL
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? "Error al obtener URL de subida.");
        setUploading(false);
        return;
      }

      const { signedUrl } = await res.json() as { signedUrl: string };

      // Upload directly to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        setError(`Error al subir ${file.name}: ${uploadRes.statusText}`);
        setUploading(false);
        return;
      }

      uploaded.push({ storageKey: path, filename: file.name });
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    await bulkAdd.mutateAsync({ folderId, photos: uploaded });
    setUploading(false);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files) void handleFiles(files);
        }}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
        style={{ borderColor: "#1e1e35", background: "#0a0a15" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f59e0b50")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e35")}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
          <svg className="w-5 h-5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-white font-medium text-sm">Arrastrá fotos aquí</p>
        <p className="text-slate-500 text-xs mt-1">o hacé clic para seleccionar</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />

      {error && (
        <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}>
          {error}
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1" style={{ color: "#94a3b8" }}>
            <span>Subiendo...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: "#1e1e35" }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
