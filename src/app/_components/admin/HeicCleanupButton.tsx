"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function HeicCleanupButton() {
  const [done, setDone] = useState<number | null>(null);

  const cleanup = api.photo.cleanupHeic.useMutation({
    onSuccess: (res) => setDone(res.deleted),
  });

  if (done !== null) {
    return (
      <p className="text-xs" style={{ color: done > 0 ? "#34d399" : "#64748b" }}>
        {done > 0 ? `✓ ${done} foto${done !== 1 ? "s" : ""} HEIC eliminada${done !== 1 ? "s" : ""}` : "No había fotos HEIC"}
      </p>
    );
  }

  return (
    <button
      onClick={() => cleanup.mutate()}
      disabled={cleanup.isPending}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
      style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}
    >
      {cleanup.isPending ? (
        <>
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Limpiando...
        </>
      ) : (
        "Eliminar fotos HEIC"
      )}
    </button>
  );
}
