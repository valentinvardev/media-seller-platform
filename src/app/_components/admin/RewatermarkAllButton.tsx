"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const CONCURRENCY = 4;

export function RewatermarkAllButton({ collectionId, totalPhotos }: { collectionId: string; totalPhotos: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  const utils = api.useUtils();

  const handleRun = async () => {
    if (!confirm(`¿Regenerar la marca de agua de las ${totalPhotos} fotos? Esto sobrescribe las previews actuales.`)) return;

    setStatus("running");
    const ids = await utils.photo.listAllIds.fetch({ collectionId });
    setProgress({ done: 0, total: ids.length, errors: 0 });

    let done = 0;
    let errors = 0;

    // Simple worker pool — keeps CONCURRENCY parallel requests in flight
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const photoId = ids[cursor++];
        if (!photoId) continue;
        try {
          const res = await fetch("/api/watermark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId }),
          });
          if (!res.ok) { errors++; console.error("Rewatermark failed for", photoId, res.status); }
        } catch (err) {
          errors++;
          console.error("Rewatermark error for", photoId, err);
        }
        done++;
        setProgress({ done, total: ids.length, errors });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setStatus(errors > 0 ? "error" : "done");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => void handleRun()}
        disabled={status === "running" || totalPhotos === 0}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#e5e7eb",
          color: status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#374151",
          background: status === "running" ? "#f9fafb" : "white",
        }}
      >
        {status === "running" ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Regenerando {progress.done}/{progress.total}{progress.errors > 0 ? ` · ${progress.errors} errores` : ""}…
          </>
        ) : status === "done" ? (
          <>✓ {progress.done} marcas de agua regeneradas</>
        ) : status === "error" ? (
          <>⚠ {progress.done - progress.errors}/{progress.total} ok · {progress.errors} errores · <span className="underline" onClick={(e) => { e.stopPropagation(); void handleRun(); }}>reintentar</span></>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerar todas las marcas de agua
          </>
        )}
      </button>
      {status === "idle" && (
        <span className="text-xs text-gray-400">Usá esto si cambiaste el watermark o si las previews quedaron mal</span>
      )}
    </div>
  );
}
