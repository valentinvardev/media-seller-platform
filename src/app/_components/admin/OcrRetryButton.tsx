"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const CONCURRENCY = 4;

type Reason =
  | "found"
  | "existing"
  | "photo-not-found"
  | "download-failed"
  | "empty-image"
  | "no-text-detected"
  | "no-bib-in-text"
  | "rekognition-error"
  | "http-error";

type OneResult = { bib: string | null; reason?: Reason; errorMessage?: string };

const REASON_LABEL: Record<Reason, string> = {
  found: "detectado",
  existing: "ya tenía dorsal",
  "photo-not-found": "foto no existe",
  "download-failed": "descarga falló",
  "empty-image": "archivo vacío o corrupto",
  "no-text-detected": "Rekognition no vio ningún texto",
  "no-bib-in-text": "texto detectado, sin dorsal reconocible",
  "rekognition-error": "error de AWS Rekognition",
  "http-error": "error de red",
};

export function OcrRetryButton({
  collectionId,
  unidentifiedCount,
}: {
  collectionId: string;
  unidentifiedCount: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0 });
  const [breakdown, setBreakdown] = useState<Record<Reason, number>>({} as Record<Reason, number>);
  const [firstError, setFirstError] = useState<string | null>(null);

  const utils = api.useUtils();

  const run = async () => {
    setStatus("running");
    setProgress({ done: 0, total: 0, found: 0 });
    setBreakdown({} as Record<Reason, number>);
    setFirstError(null);

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

    setProgress({ done: 0, total: ids.length, found: 0 });

    let done = 0;
    let found = 0;
    const localBreakdown: Record<Reason, number> = {} as Record<Reason, number>;
    let firstErr: string | null = null;

    const bump = (r: Reason) => {
      localBreakdown[r] = (localBreakdown[r] ?? 0) + 1;
    };

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
            bump("http-error");
            if (!firstErr) firstErr = `HTTP ${res.status}`;
          } else {
            const data = (await res.json()) as OneResult;
            const r = (data.reason ?? "no-bib-in-text") as Reason;
            bump(r);
            if (data.bib) found++;
            if ((r === "rekognition-error" || r === "download-failed" || r === "empty-image") && !firstErr) {
              firstErr = data.errorMessage ?? REASON_LABEL[r];
            }
          }
        } catch (err) {
          bump("http-error");
          if (!firstErr) firstErr = err instanceof Error ? err.message : "network";
        }
        done++;
        // Snapshot copy so React actually notices the state change
        setProgress({ done, total: ids.length, found });
        setBreakdown({ ...localBreakdown });
        if (firstErr) setFirstError(firstErr);
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setStatus("done");
    router.refresh();
  };

  if (unidentifiedCount === 0 && status === "idle") return null;

  const errorReasons: Reason[] = ["download-failed", "empty-image", "rekognition-error", "http-error", "photo-not-found"];
  const errorCount = errorReasons.reduce((s, r) => s + (breakdown[r] ?? 0), 0);

  // Breakdown line — shown while running and after done.
  const breakdownLine =
    Object.entries(breakdown)
      .filter(([_, n]) => n > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([r, n]) => `${n} ${REASON_LABEL[r as Reason] ?? r}`)
      .join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => void run()}
          disabled={status === "running"}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:cursor-not-allowed"
          style={{
            borderColor: status === "done" && errorCount > 0 ? "#f59e0b" : status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#e5e7eb",
            color: status === "done" && errorCount > 0 ? "#b45309" : status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#374151",
            background: status === "running" ? "#f9fafb" : "white",
          }}
        >
          {status === "running" ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Releyendo {progress.done}/{progress.total} · {progress.found} detectado{progress.found !== 1 ? "s" : ""}…
            </>
          ) : status === "done" ? (
            <>✓ {progress.found} dorsal{progress.found !== 1 ? "es" : ""} detectado{progress.found !== 1 ? "s" : ""} de {progress.total}</>
          ) : status === "error" ? (
            <>✗ Error · <span className="underline" onClick={(e) => { e.stopPropagation(); void run(); }}>reintentar</span></>
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

      {(status === "running" || status === "done") && breakdownLine && (
        <p className="text-xs text-gray-500 pl-1">
          {breakdownLine}
        </p>
      )}

      {status === "done" && errorCount > 0 && firstError && (
        <p className="text-xs text-amber-700 pl-1">
          Primer error: <code className="bg-amber-50 px-1.5 py-0.5 rounded">{firstError.slice(0, 200)}</code>
        </p>
      )}
    </div>
  );
}
