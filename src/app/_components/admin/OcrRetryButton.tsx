"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OcrRetryButton({ collectionId, unidentifiedCount }: { collectionId: string; unidentifiedCount: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{ found: number; total: number } | null>(null);

  const run = async () => {
    setStatus("running");
    setResult(null);
    try {
      const res = await fetch("/api/ocr-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { found: number; total: number };
      setResult(data);
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  if (unidentifiedCount === 0 && status === "idle") return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all"
        style={{
          borderColor: status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#e5e7eb",
          color: status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#374151",
          background: status === "running" ? "#f9fafb" : "white",
          cursor: status === "running" ? "not-allowed" : "pointer",
        }}
      >
        {status === "running" ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Releyendo {unidentifiedCount} foto{unidentifiedCount !== 1 ? "s" : ""}…
          </>
        ) : status === "done" ? (
          <>✓ {result?.found} dorsal{result?.found !== 1 ? "es" : ""} detectado{result?.found !== 1 ? "s" : ""} de {result?.total}</>
        ) : status === "error" ? (
          <>✗ Error · <span className="underline" onClick={run}>reintentar</span></>
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
