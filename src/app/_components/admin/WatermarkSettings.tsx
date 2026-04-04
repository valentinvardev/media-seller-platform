"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "uploading" | "deleting" | "done" | "error";

export function WatermarkSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState("");

  // Load existing watermark on mount
  useEffect(() => {
    void fetch("/api/watermark-settings")
      .then((r) => r.json() as Promise<{ url: string | null }>)
      .then(({ url }) => { setCurrentUrl(url); setStatus("idle"); })
      .catch(() => setStatus("idle"));
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMsg("Solo se permiten imágenes PNG/SVG con fondo transparente.");
      return;
    }
    const local = URL.createObjectURL(file);
    setPreview(local);
    setStatus("uploading");
    setMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/watermark-settings", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      // Refresh the signed URL
      const check = await fetch("/api/watermark-settings");
      const { url } = await check.json() as { url: string | null };
      setCurrentUrl(url);
      setPreview(null);
      setStatus("done");
      setMsg("Marca de agua guardada.");
    } catch {
      setStatus("error");
      setMsg("Error al subir el archivo.");
      URL.revokeObjectURL(local);
      setPreview(null);
    }
  };

  const handleDelete = async () => {
    setStatus("deleting");
    setMsg("");
    try {
      await fetch("/api/watermark-settings", { method: "DELETE" });
      setCurrentUrl(null);
      setPreview(null);
      setStatus("idle");
      setMsg("Marca de agua eliminada.");
    } catch {
      setStatus("error");
      setMsg("Error al eliminar.");
    }
  };

  const displayed = preview ?? currentUrl;
  const busy = status === "loading" || status === "uploading" || status === "deleting";

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone / preview */}
      <div
        className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all group overflow-hidden"
        style={{
          borderColor: status === "error" ? "#ef444450" : "#1e1e35",
          background: "#07070f",
          height: "160px",
        }}
        onClick={() => !busy && inputRef.current?.click()}
      >
        {status === "loading" ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#f59e0b30", borderTopColor: "#f59e0b" }} />
          </div>
        ) : displayed ? (
          <>
            {/* Checkerboard background to show transparency */}
            <div className="absolute inset-0" style={{
              backgroundImage: "linear-gradient(45deg, #1e1e35 25%, transparent 25%), linear-gradient(-45deg, #1e1e35 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e1e35 75%), linear-gradient(-45deg, transparent 75%, #1e1e35 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }} />
            <img
              src={displayed}
              alt="Watermark"
              className="relative w-full h-full object-contain p-6 transition-opacity group-hover:opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>
                Cambiar imagen
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs" style={{ color: "#475569" }}>Subir PNG con transparencia</p>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#f59e0b30", borderTopColor: "#f59e0b" }} />
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              {status === "uploading" ? "Subiendo..." : status === "deleting" ? "Eliminando..." : ""}
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {currentUrl ? "Reemplazar" : "Subir marca de agua"}
        </button>

        {currentUrl && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl disabled:opacity-50 transition-all"
            style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        )}
      </div>

      {msg && (
        <p className="text-xs" style={{ color: status === "error" ? "#f87171" : "#34d399" }}>{msg}</p>
      )}

      {/* Note */}
      <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "#07070f", border: "1px solid #1e1e35" }}>
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#6366f1" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
          Al cambiar la marca de agua, las previews ya generadas{" "}
          <span style={{ color: "#94a3b8" }}>no se actualizan automáticamente</span>.
          Para regenerarlas, abrí la carpeta correspondiente, desactivá y volvé a activar la estrella en cada foto preview.
        </p>
      </div>
    </div>
  );
}
