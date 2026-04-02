"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type FileStatus = "pending" | "uploading" | "done" | "error";

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  previewUrl: string;
  errorMsg?: string;
  visible: boolean; // for fade-in animation
};

export function PhotoUploader({ folderId, collectionId }: { folderId: string; collectionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const bulkAdd = api.photo.bulkAdd.useMutation({
    onSuccess: () => router.refresh(),
  });

  const updateEntry = (id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setGlobalError(null);

    // Build entries and fade them in staggered
    const newEntries: FileEntry[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      status: "pending",
      previewUrl: URL.createObjectURL(file),
      visible: false,
    }));

    setEntries((prev) => [...prev, ...newEntries]);

    // Stagger fade-in
    for (let i = 0; i < newEntries.length; i++) {
      const entry = newEntries[i]!;
      setTimeout(() => {
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, visible: true } : e));
      }, i * 60);
    }

    const uploaded: { storageKey: string; filename: string }[] = [];

    for (const entry of newEntries) {
      updateEntry(entry.id, { status: "uploading" });

      const path = `${collectionId}/${folderId}/${Date.now()}-${entry.file.name}`;

      try {
        // Get signed URL
        const res = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });

        if (!res.ok) {
          const body = await res.json() as { error?: string };
          const msg = body.error ?? "Error al obtener URL.";
          updateEntry(entry.id, { status: "error", errorMsg: msg });
          if (msg.includes("SERVICE_ROLE")) { setGlobalError(msg); return; }
          continue;
        }

        const { signedUrl } = await res.json() as { signedUrl: string };

        // Upload to Supabase
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": entry.file.type },
          body: entry.file,
        });

        if (!uploadRes.ok) {
          updateEntry(entry.id, { status: "error", errorMsg: uploadRes.statusText });
          continue;
        }

        uploaded.push({ storageKey: path, filename: entry.file.name });
        updateEntry(entry.id, { status: "done" });
      } catch {
        updateEntry(entry.id, { status: "error", errorMsg: "Error de red." });
      }
    }

    if (uploaded.length > 0) {
      await bulkAdd.mutateAsync({ folderId, photos: uploaded });
    }
  };

  const doneCount = entries.filter((e) => e.status === "done").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const isUploading = entries.some((e) => e.status === "uploading");
  const allDone = entries.length > 0 && !isUploading && entries.every((e) => e.status === "done" || e.status === "error");

  const clearDone = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: isDragging ? "#f59e0b80" : "#1e1e35",
          background: isDragging ? "#f59e0b08" : "#0a0a15",
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
          <svg className="w-5 h-5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-white font-medium text-sm">
          {isUploading ? "Subiendo fotos..." : "Arrastrá fotos aquí"}
        </p>
        <p className="text-slate-500 text-xs mt-1">
          {isUploading ? `${doneCount} de ${entries.length} completadas` : "o hacé clic para seleccionar"}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); }} />

      {/* Global error */}
      {globalError && (
        <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}>
          {globalError}
        </div>
      )}

      {/* Summary bar */}
      {entries.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            {doneCount > 0 && (
              <span style={{ color: "#34d399" }}>✓ {doneCount} subida{doneCount !== 1 ? "s" : ""}</span>
            )}
            {errorCount > 0 && (
              <span style={{ color: "#f87171" }}>✕ {errorCount} con error</span>
            )}
            {isUploading && (
              <span style={{ color: "#94a3b8" }}>
                <span className="inline-block w-2 h-2 rounded-full mr-1 animate-pulse" style={{ background: "#f59e0b" }} />
                Subiendo...
              </span>
            )}
          </div>
          {allDone && (
            <button onClick={clearDone} className="text-xs px-3 py-1 rounded-lg transition-all"
              style={{ color: "#64748b", background: "#1e1e35" }}>
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Per-file list */}
      {entries.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: "#0f0f1a",
                border: `1px solid ${entry.status === "error" ? "#ef444430" : entry.status === "done" ? "#10b98120" : "#1e1e35"}`,
                opacity: entry.visible ? 1 : 0,
                transform: entry.visible ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.4s ease",
              }}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
                style={{ background: "#1e1e35" }}>
                <img src={entry.previewUrl} alt={entry.file.name}
                  className="w-full h-full object-cover" />
                {/* Uploading shimmer overlay */}
                {entry.status === "uploading" && (
                  <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(245,158,11,0.25)" }} />
                )}
              </div>

              {/* Filename */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{entry.file.name}</p>
                {entry.status === "error" && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#f87171" }}>{entry.errorMsg}</p>
                )}
                {entry.status === "uploading" && (
                  <p className="text-xs mt-0.5" style={{ color: "#f59e0b" }}>Subiendo...</p>
                )}
                {entry.status === "pending" && (
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>En cola</p>
                )}
              </div>

              {/* Status icon */}
              <div className="flex-shrink-0">
                {entry.status === "done" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "#10b98120" }}>
                    <svg className="w-3.5 h-3.5" style={{ color: "#34d399" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {entry.status === "uploading" && (
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#f59e0b40", borderTopColor: "#f59e0b" }} />
                )}
                {entry.status === "error" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "#ef444420" }}>
                    <svg className="w-3.5 h-3.5" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {entry.status === "pending" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "#ffffff08" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#475569" }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
