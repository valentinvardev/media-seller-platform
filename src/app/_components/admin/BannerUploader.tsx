"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function BannerUploader({
  collectionId,
  currentBannerUrl,
  currentFocalY,
}: {
  collectionId: string;
  currentBannerUrl: string | null;
  currentFocalY: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startFocal = useRef(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [focalY, setFocalY] = useState(currentFocalY);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const update = api.collection.update.useMutation({
    onSuccess: () => { setStatus("done"); router.refresh(); },
    onError: () => setStatus("error"),
  });

  const displayedUrl = previewUrl ?? currentBannerUrl;

  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const handleFocalSave = useCallback((y: number) => {
    update.mutate({ id: collectionId, bannerFocalY: y, ...(pendingKey ? { bannerUrl: pendingKey } : {}) });
    setStatus("saving");
  }, [collectionId, pendingKey, update]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const delta = e.clientY - startY.current;
      const frac = delta / containerRef.current.clientHeight;
      setFocalY(clamp(startFocal.current + frac));
    };
    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const delta = e.clientY - startY.current;
      const frac = containerRef.current ? delta / containerRef.current.clientHeight : 0;
      const newY = clamp(startFocal.current + frac);
      setFocalY(newY);
      handleFocalSave(newY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const delta = e.touches[0]!.clientY - startY.current;
      const frac = delta / containerRef.current.clientHeight;
      setFocalY(clamp(startFocal.current + frac));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const delta = e.changedTouches[0]!.clientY - startY.current;
      const frac = containerRef.current ? delta / containerRef.current.clientHeight : 0;
      const newY = clamp(startFocal.current + frac);
      setFocalY(newY);
      handleFocalSave(newY);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleFocalSave]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErrorMsg("Solo imágenes."); return; }
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setStatus("uploading");
    setErrorMsg("");
    const path = `_collections/banner/${collectionId}-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!signRes.ok) throw new Error("No se pudo obtener URL de subida.");
      const { signedUrl } = await signRes.json() as { signedUrl: string };
      const upRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upRes.ok) throw new Error("Error al subir la imagen.");
      setPendingKey(path);
      update.mutate({ id: collectionId, bannerUrl: path, bannerFocalY: focalY });
      setStatus("saving");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Error desconocido.");
      URL.revokeObjectURL(local);
      setPreviewUrl(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500">Portada del evento (homepage)</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading" || status === "saving"}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          {status === "uploading" ? (
            <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {status === "uploading" ? "Subiendo..." : "Cambiar imagen"}
        </button>
      </div>

      {displayedUrl ? (
        <div
          ref={containerRef}
          className="relative h-32 rounded-xl overflow-hidden cursor-ns-resize select-none border border-gray-100"
          onMouseDown={(e) => { dragging.current = true; startY.current = e.clientY; startFocal.current = focalY; e.preventDefault(); }}
          onTouchStart={(e) => { dragging.current = true; startY.current = e.touches[0]!.clientY; startFocal.current = focalY; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayedUrl}
            alt="Portada"
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `center ${Math.round(focalY * 100)}%` }}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Arrastrá para reencuadrar
            </span>
          </div>
          <div className="absolute left-0 right-0 h-px bg-white/70 pointer-events-none" style={{ top: `${focalY * 100}%` }} />
        </div>
      ) : (
        <div
          className="h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <p className="text-xs text-gray-400">Clic para subir portada</p>
        </div>
      )}

      {status === "done" && <p className="text-xs text-green-600 mt-1.5">Portada actualizada.</p>}
      {status === "saving" && <p className="text-xs text-blue-500 mt-1.5">Guardando...</p>}
      {errorMsg && <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
    </div>
  );
}
