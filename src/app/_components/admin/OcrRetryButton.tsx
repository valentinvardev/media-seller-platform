"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const CONCURRENCY = 4;

export function OcrRetryButton({
  collectionId,
  unidentifiedCount,
}: {
  collectionId: string;
  unidentifiedCount: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0, errors: 0 });

  const utils = api.useUtils();

  const run = async () => {
    setStatus("running");
    setProgress({ done: 0, total: 0, found: 0, errors: 0 });

    let ids: string[] = [];
    try {
      ids = await utils.photo.listWithoutBib.fetch({ collectionId });
    } catch (err) {
      console.error("OCR retry: could not list photos", err);
      setStatus("error");
      return;
    }

    if (ids.length === 0) {
      setStatus("done");
      return;
    }

    setProgress({ done: 0, total: ids.length, found: 0, errors: 0 });

    let done = 0;
    let found = 0;
    let errors = 0;

    // Worker pool — 4 concurrent OCRs against /api/ocr-one, one photo per call.
    // Each request is short enough to avoid nginx/Vercel proxy timeouts, and we
    // get real-time progress instead of the previous "wait many minutes and hope".
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const photoId = ids[cursor++];
        if (!photoId) continue;
        try {
          const res = await fetch("/api/ocr-one", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId }),
          });
          if (!res.ok) {
            errors++;
            console.error("OCR failed for", photoId, res.status);
          } else {
            const data = (await res.json()) as { bib: string | null };
            if (data.bib) found++;
          }
        } catch (err) {
          errors++;
          console.error("OCR network error for", photoId, err);
        }
        done++;
        setProgress({ done, total: ids.length, found, errors });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setStatus(errors > 0 && found === 0 ? "error" : "done");
    router.refresh();
  };

  if (unidentifiedCount === 0 && status === "idle") return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => void run()}
        disabled={status === "running"}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:cursor-not-allowed"
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
            Releyendo {progress.done}/{progress.total}
            {progress.found > 0 ? ` · ${progress.found} detectado${progress.found !== 1 ? "s" : ""}` : ""}
            {progress.errors > 0 ? ` · ${progress.errors} error${progress.errors !== 1 ? "es" : ""}` : ""}
            …
          </>
        ) : status === "done" ? (
          <>
            ✓ {progress.found} dorsal{progress.found !== 1 ? "es" : ""} detectado{progress.found !== 1 ? "s" : ""} de {progress.total}
            {progress.errors > 0 && ` · ${progress.errors} error${progress.errors !== 1 ? "es" : ""}`}
          </>
        ) : status === "error" ? (
          <>
            ✗ Error · <span className="underline" onClick={(e) => { e.stopPropagation(); void run(); }}>reintentar</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Releer dorsales ({unidentifiedCount} sin dorsal)
          </>
        )}
      </button>
      {status === "idle" && (
        <span className="text-xs text-gray-400">Reintenta el OCR en las fotos sin dorsal detectado</span>
      )}
    </div>
  );
}
