"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { StorageBar } from "./StorageBar";

type FileStatus = "pending" | "uploading" | "done" | "error";

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  previewUrl: string;
  errorMsg?: string;
  visible: boolean;
};

const ROW_HEIGHT = 56; // px per row (thumbnail 40px + gap)
const VISIBLE_ROWS = 4; // rows shown before fade/cap

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "done") return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#10b98120" }}>
      <svg className="w-3.5 h-3.5" style={{ color: "#34d399" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  if (status === "uploading") return (
    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
      style={{ borderColor: "#f59e0b40", borderTopColor: "#f59e0b" }} />
  );
  if (status === "error") return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ef444420" }}>
      <svg className="w-3.5 h-3.5" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ffffff08" }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#475569" }} />
    </div>
  );
}

function FileRow({ entry }: { entry: FileEntry }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: "#0f0f1a",
        border: `1px solid ${entry.status === "error" ? "#ef444430" : entry.status === "done" ? "#10b98115" : "#1e1e35"}`,
        opacity: entry.visible ? 1 : 0,
        transform: entry.visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.4s ease",
      }}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: "#1e1e35" }}>
        <img src={entry.previewUrl} alt={entry.file.name} className="w-full h-full object-cover" />
        {entry.status === "uploading" && (
          <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(245,158,11,0.25)" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{entry.file.name}</p>
        <p className="text-xs mt-0.5 truncate" style={{
          color: entry.status === "uploading" ? "#f59e0b"
            : entry.status === "done" ? "#34d399"
            : entry.status === "error" ? "#f87171"
            : "#475569",
        }}>
          {entry.status === "uploading" ? "Subiendo..."
            : entry.status === "done" ? "Completada"
            : entry.status === "error" ? (entry.errorMsg ?? "Error")
            : "En cola"}
        </p>
      </div>
      <StatusIcon status={entry.status} />
    </div>
  );
}

export function PhotoUploader({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const bulkAdd = api.photo.bulkAdd.useMutation({ onSuccess: () => router.refresh() });

  const updateEntry = (id: string, patch: Partial<FileEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setGlobalError(null);

    const HEIC_RE = /\.(heic|heif)$/i;
    const allFiles = Array.from(files);
    const heicCount = allFiles.filter((f) => HEIC_RE.test(f.name) || f.type === "image/heic" || f.type === "image/heif").length;
    const validFiles = allFiles.filter((f) => !HEIC_RE.test(f.name) && f.type !== "image/heic" && f.type !== "image/heif");

    if (heicCount > 0 && validFiles.length === 0) {
      setGlobalError(`Las fotos HEIC no son compatibles con navegadores web. Convertí las imágenes a JPG antes de subirlas.`);
      return;
    }
    if (heicCount > 0) {
      setGlobalError(`Se ignoraron ${heicCount} foto${heicCount !== 1 ? "s" : ""} HEIC. Convertí a JPG para subirlas.`);
    }

    if (!validFiles.length) return;

    const newEntries: FileEntry[] = validFiles.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      status: "pending",
      previewUrl: URL.createObjectURL(file),
      visible: false,
    }));

    // Active (uploading/pending) always at top — prepend
    setEntries((prev) => [...newEntries, ...prev]);

    // Stagger fade-in
    for (let i = 0; i < newEntries.length; i++) {
      const id = newEntries[i]!.id;
      setTimeout(() => setEntries((prev) => prev.map((e) => e.id === id ? { ...e, visible: true } : e)), i * 60);
    }

    const uploaded: { storageKey: string; filename: string; fileSize: number }[] = [];

    for (const entry of newEntries) {
      updateEntry(entry.id, { status: "uploading" });

      const path = `${collectionId}/${Date.now()}-${entry.file.name}`;
      try {
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

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": entry.file.type },
          body: entry.file,
        });

        if (!uploadRes.ok) {
          updateEntry(entry.id, { status: "error", errorMsg: uploadRes.statusText });
          continue;
        }

        uploaded.push({ storageKey: path, filename: entry.file.name, fileSize: entry.file.size });
        updateEntry(entry.id, { status: "done" });
      } catch {
        updateEntry(entry.id, { status: "error", errorMsg: "Error de red." });
      }
    }

    if (uploaded.length > 0) await bulkAdd.mutateAsync({ collectionId, photos: uploaded });
  };

  const isUploading = entries.some((e) => e.status === "uploading" || e.status === "pending");
  const doneCount = entries.filter((e) => e.status === "done").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const allSettled = entries.length > 0 && !isUploading;

  const clearAll = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
  };

  // Sort: uploading/pending first, then done/error
  const sorted = [
    ...entries.filter((e) => e.status === "uploading" || e.status === "pending"),
    ...entries.filter((e) => e.status === "done" || e.status === "error"),
  ];

  const showCap = sorted.length > VISIBLE_ROWS;
  const capHeight = VISIBLE_ROWS * ROW_HEIGHT;

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{ borderColor: isDragging ? "#f59e0b80" : "#1e1e35", background: isDragging ? "#f59e0b08" : "#0a0a15" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
          <svg className="w-5 h-5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-white font-medium text-sm">{isUploading ? "Subiendo fotos..." : "Arrastrá fotos aquí"}</p>
        <p className="text-slate-500 text-xs mt-1">
          {isUploading ? `${doneCount} de ${entries.length} completadas` : "o hacé clic para seleccionar"}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); }} />

      {globalError && (
        <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}>
          {globalError}
        </div>
      )}

      {/* Summary */}
      {entries.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            {doneCount > 0 && <span style={{ color: "#34d399" }}>✓ {doneCount} subida{doneCount !== 1 ? "s" : ""}</span>}
            {errorCount > 0 && <span style={{ color: "#f87171" }}>✕ {errorCount} con error</span>}
            {isUploading && (
              <span style={{ color: "#94a3b8" }}>
                <span className="inline-block w-2 h-2 rounded-full mr-1 animate-pulse" style={{ background: "#f59e0b" }} />
                Subiendo...
              </span>
            )}
          </div>
          {allSettled && (
            <button onClick={clearAll} className="text-xs px-3 py-1 rounded-lg" style={{ color: "#64748b", background: "#1e1e35" }}>
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Feed with cap + fade */}
      {sorted.length > 0 && (
        <div className="mt-3 relative">
          <div
            className="flex flex-col gap-2 overflow-hidden"
            style={{ maxHeight: showCap ? `${capHeight}px` : "none" }}
          >
            {sorted.map((entry) => <FileRow key={entry.id} entry={entry} />)}
          </div>

          {/* Fade overlay */}
          {showCap && (
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-3"
              style={{
                height: "96px",
                background: "linear-gradient(to top, #07070f 20%, transparent 100%)",
                pointerEvents: "none",
              }}
            >
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs font-medium px-4 py-1.5 rounded-full transition-all hover:scale-105"
                style={{ background: "#1e1e35", color: "#94a3b8", pointerEvents: "all" }}
              >
                Ver todas ({sorted.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Storage */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#1e1e35" }}>
        <StorageBar />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden border flex flex-col"
            style={{ background: "#0f0f1a", borderColor: "#1e1e35", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "#1e1e35" }}>
              <div>
                <h2 className="font-bold text-white text-sm">Todas las fotos</h2>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  {doneCount} completadas · {errorCount} con error · {entries.filter(e => e.status === "uploading" || e.status === "pending").length} en progreso
                </p>
              </div>
              <div className="flex items-center gap-2">
                {allSettled && (
                  <button onClick={() => { clearAll(); setModalOpen(false); }}
                    className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#64748b", background: "#1e1e35" }}>
                    Limpiar
                  </button>
                )}
                <button onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#16162a", color: "#64748b" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2" style={{ scrollbarWidth: "thin" }}>
              {sorted.map((entry) => <FileRow key={entry.id} entry={entry} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
