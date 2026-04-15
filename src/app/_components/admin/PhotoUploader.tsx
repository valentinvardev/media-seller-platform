"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { StorageBar } from "./StorageBar";

type UploadStatus = "pending" | "uploading" | "done" | "error";
type OcrStatus = "idle" | "queued" | "processing" | "found" | "not-found" | "error";

type FileEntry = {
  id: string;
  file: File;
  status: UploadStatus;
  previewUrl: string;
  errorMsg?: string;
  visible: boolean;
  photoId?: string;
  ocrStatus: OcrStatus;
  bib?: string;
  ocrSource?: string;
};

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 4;
const POLL_INTERVAL_MS = 4_000;
const POLL_MAX_ATTEMPTS = 30; // ~2 min
const UPLOAD_CONCURRENCY = 5;
const OCR_MAX_RETRIES = 3;

// ── Icons ─────────────────────────────────────────────────────────────────────

function UploadIcon({ status }: { status: UploadStatus }) {
  if (status === "done") return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  if (status === "uploading") return (
    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
      style={{ borderColor: "#bfdbfe", borderTopColor: "#2563eb" }} />
  );
  if (status === "error") return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
      <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
  return <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0" />;
}

function OcrBadge({ status, bib, ocrSource }: { status: OcrStatus; bib?: string; ocrSource?: string }) {
  if (status === "idle") return null;

  if (status === "queued") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
      OCR en cola
    </span>
  );
  if (status === "processing") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
      <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "#bfdbfe", borderTopColor: "#2563eb" }} />
      Leyendo dorsal...
    </span>
  );
  if (status === "found" && bib) {
    const bibs = bib.split(",").map(b => b.trim()).filter(Boolean);
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold" title={ocrSource ?? undefined}>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {bibs.map(b => `#${b}`).join(" · ")}
      </span>
    );
  }
  if (status === "not-found") return (
    <span className="text-xs text-gray-300">Sin dorsal{ocrSource && <span className="opacity-50"> ({ocrSource})</span>}</span>
  );
  if (status === "error") return (
    <span className="text-xs text-red-400">OCR falló</span>
  );
  return null;
}

function FileRow({ entry }: { entry: FileEntry }) {
  const borderColor = entry.status === "error" ? "#fecaca"
    : entry.ocrStatus === "found" ? "#fde68a"
    : entry.status === "done" ? "#bbf7d0"
    : "#e2e8f0";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: "#f8fafc",
        border: `1px solid ${borderColor}`,
        opacity: entry.visible ? 1 : 0,
        transform: entry.visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.4s ease",
      }}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-200">
        <img src={entry.previewUrl} alt={entry.file.name} className="w-full h-full object-cover" />
        {entry.status === "uploading" && (
          <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(245,158,11,0.25)" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 truncate">{entry.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs" style={{
            color: entry.status === "uploading" ? "#2563eb"
              : entry.status === "done" ? "#16a34a"
              : entry.status === "error" ? "#ef4444"
              : "#94a3b8",
          }}>
            {entry.status === "uploading" ? "Subiendo..."
              : entry.status === "done" ? "Subida"
              : entry.status === "error" ? (entry.errorMsg ?? "Error")
              : "En cola"}
          </p>
          {entry.status === "done" && <OcrBadge status={entry.ocrStatus} bib={entry.bib} ocrSource={entry.ocrSource} />}
        </div>
      </div>
      <UploadIcon status={entry.status} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PhotoUploader({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const bulkAdd = api.photo.bulkAdd.useMutation({ onSuccess: () => router.refresh() });

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))), []);

  // Poll a photo until bib appears or max attempts reached
  const pollBib = useCallback(async (entryId: string, photoId: string) => {
    updateEntry(entryId, { ocrStatus: "processing" });
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const res = await fetch(`/api/ocr-status?photoId=${photoId}`);
        if (!res.ok) continue;
        const data = await res.json() as { bib: string | null };
        if (data.bib) {
          updateEntry(entryId, { ocrStatus: "found", bib: data.bib });
          router.refresh();
          return;
        }
      } catch {
        // keep polling
      }
    }
    // Timed out — photo may still get bib but we stop polling
    updateEntry(entryId, { ocrStatus: "not-found" });
    router.refresh();
  }, [updateEntry, router]);

  // Trigger OCR with automatic retry on error (up to OCR_MAX_RETRIES)
  const triggerOcr = useCallback(async (entryId: string, photoId: string, attempt = 0) => {
    updateEntry(entryId, { photoId, ocrStatus: attempt === 0 ? "queued" : "processing" });
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      const data = await res.json() as {
        bib?: string | null;
        source?: string;
        found?: boolean;
        accepted?: boolean;
        skipped?: boolean;
        cached?: boolean;
        error?: string;
      };

      if (data.bib) {
        updateEntry(entryId, { ocrStatus: "found", bib: data.bib, ocrSource: data.source ?? "amazon" });
        router.refresh();
      } else if (data.accepted) {
        void pollBib(entryId, photoId);
      } else if (data.skipped ?? data.found === false) {
        // OCR ran successfully — no bib in this photo, that's fine
        updateEntry(entryId, { ocrStatus: "not-found", ocrSource: data.source });
      } else {
        // Error — retry with exponential backoff
        if (attempt < OCR_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
          return triggerOcr(entryId, photoId, attempt + 1);
        }
        updateEntry(entryId, { ocrStatus: "error" });
      }
    } catch {
      if (attempt < OCR_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
        return triggerOcr(entryId, photoId, attempt + 1);
      }
      updateEntry(entryId, { ocrStatus: "error" });
    }
  }, [updateEntry, pollBib, router]);

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setGlobalError(null);

    const HEIC_RE = /\.(heic|heif)$/i;
    const allFiles = Array.from(files);
    const heicCount = allFiles.filter((f) => HEIC_RE.test(f.name) || f.type === "image/heic" || f.type === "image/heif").length;
    const validFiles = allFiles.filter((f) => !HEIC_RE.test(f.name) && f.type !== "image/heic" && f.type !== "image/heif");

    if (heicCount > 0 && validFiles.length === 0) {
      setGlobalError("Las fotos HEIC no son compatibles. Convertí a JPG antes de subir.");
      return;
    }
    if (heicCount > 0) {
      setGlobalError(`Se ignoraron ${heicCount} foto${heicCount !== 1 ? "s" : ""} HEIC.`);
    }
    if (!validFiles.length) return;

    const newEntries: FileEntry[] = validFiles.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      status: "pending",
      previewUrl: URL.createObjectURL(file),
      visible: false,
      ocrStatus: "idle",
    }));

    setEntries((prev) => [...newEntries, ...prev]);
    for (let i = 0; i < newEntries.length; i++) {
      const id = newEntries[i]!.id;
      setTimeout(() => updateEntry(id, { visible: true }), i * 60);
    }

    // ── Upload files in parallel (UPLOAD_CONCURRENCY at a time) ───────────────
    type UploadResult = { storageKey: string; filename: string; fileSize: number; entryId: string };
    const uploaded: UploadResult[] = [];
    let serviceRoleError = false;

    const uploadOne = async (entry: FileEntry): Promise<UploadResult | null> => {
      if (serviceRoleError) return null;
      updateEntry(entry.id, { status: "uploading" });
      const path = `${collectionId}/${Date.now()}-${entry.file.name}`;
      try {
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        if (!signRes.ok) {
          const body = await signRes.json() as { error?: string };
          const msg = body.error ?? "Error al obtener URL.";
          updateEntry(entry.id, { status: "error", errorMsg: msg });
          if (msg.includes("SERVICE_ROLE")) {
            serviceRoleError = true;
            setGlobalError(msg);
          }
          return null;
        }
        const { signedUrl } = await signRes.json() as { signedUrl: string };
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": entry.file.type },
          body: entry.file,
        });
        if (!uploadRes.ok) {
          updateEntry(entry.id, { status: "error", errorMsg: uploadRes.statusText });
          return null;
        }
        updateEntry(entry.id, { status: "done" });
        return { storageKey: path, filename: entry.file.name, fileSize: entry.file.size, entryId: entry.id };
      } catch {
        updateEntry(entry.id, { status: "error", errorMsg: "Error de red." });
        return null;
      }
    };

    // Process in chunks of UPLOAD_CONCURRENCY
    for (let i = 0; i < newEntries.length; i += UPLOAD_CONCURRENCY) {
      if (serviceRoleError) break;
      const chunk = newEntries.slice(i, i + UPLOAD_CONCURRENCY);
      const results = await Promise.all(chunk.map(uploadOne));
      for (const r of results) {
        if (r) uploaded.push(r);
      }
    }

    if (uploaded.length === 0) return;

    // Save to DB — get photoIds back
    const result = await bulkAdd.mutateAsync({
      collectionId,
      photos: uploaded.map(({ storageKey, filename, fileSize }) => ({ storageKey, filename, fileSize })),
    });

    if (!result?.ids) return;

    // Trigger OCR + face indexing + watermark per photo.
    // Stagger by 300ms each to avoid saturating the DB connection pool.
    for (let i = 0; i < result.ids.length; i++) {
      const photoId = result.ids[i];
      const entryId = uploaded[i]?.entryId;
      if (!photoId || !entryId) continue;

      const delay = i * 300;
      setTimeout(() => {
        void triggerOcr(entryId, photoId);
        void fetch("/api/face-index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId, collectionId }),
        });
        void fetch("/api/watermark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        });
      }, delay);
    }
  };

  const isUploading = entries.some((e) => e.status === "uploading" || e.status === "pending");
  const doneCount = entries.filter((e) => e.status === "done").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const allSettled = entries.length > 0 && !isUploading;
  const ocrDone = entries.filter((e) => e.ocrStatus === "found").length;

  const clearAll = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
  };

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
        style={{ borderColor: isDragging ? "#2563eb80" : "#e2e8f0", background: isDragging ? "#eff6ff" : "#f8fafc" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-gray-800 font-medium text-sm">
          {isUploading ? "Subiendo fotos..." : "Arrastrá fotos aquí"}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {isUploading
            ? `${doneCount} de ${entries.length} subidas`
            : "o hacé clic para seleccionar"}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); }} />

      {globalError && (
        <div className="mt-3 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-100">
          {globalError}
        </div>
      )}

      {/* Summary bar */}
      {entries.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {doneCount > 0 && <span className="text-green-600">✓ {doneCount} subida{doneCount !== 1 ? "s" : ""}</span>}
            {ocrDone > 0 && <span className="text-amber-600 font-semibold">#{ocrDone} dorsal{ocrDone !== 1 ? "es" : ""} detectado{ocrDone !== 1 ? "s" : ""}</span>}
            {errorCount > 0 && <span className="text-red-500">✕ {errorCount} con error</span>}
            {isUploading && (
              <span className="text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full animate-pulse bg-blue-400" />
                Subiendo...
              </span>
            )}
          </div>
          {allSettled && (
            <button onClick={clearAll} className="text-xs px-3 py-1 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200">
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Feed */}
      {sorted.length > 0 && (
        <div className="mt-3 relative">
          <div className="flex flex-col gap-2 overflow-hidden"
            style={{ maxHeight: showCap ? `${capHeight}px` : "none" }}>
            {sorted.map((entry) => <FileRow key={entry.id} entry={entry} />)}
          </div>
          {showCap && (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-3"
              style={{ height: "96px", background: "linear-gradient(to top, #ffffff 20%, transparent 100%)", pointerEvents: "none" }}>
              <button onClick={() => setModalOpen(true)}
                className="text-xs font-medium px-4 py-1.5 rounded-full transition-all hover:scale-105"
                style={{ background: "#e2e8f0", color: "#475569", pointerEvents: "all" }}>
                Ver todas ({sorted.length})
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100">
        <StorageBar />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setModalOpen(false)}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden border border-gray-100 flex flex-col bg-white"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Todas las fotos</h2>
                <p className="text-xs mt-0.5 text-gray-500">
                  {doneCount} subidas · {ocrDone} dorsales · {errorCount} con error
                </p>
              </div>
              <div className="flex items-center gap-2">
                {allSettled && (
                  <button onClick={() => { clearAll(); setModalOpen(false); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200">
                    Limpiar
                  </button>
                )}
                <button onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-800">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2" style={{ scrollbarWidth: "thin" }}>
              {sorted.map((entry) => <FileRow key={entry.id} entry={entry} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
