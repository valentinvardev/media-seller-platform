"use client";

import { useRef, useState } from "react";
import { api } from "~/trpc/react";

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

export function WatermarkSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const presets = api.watermark.listPresets.useQuery();
  const apply = api.watermark.applyPreset.useMutation({ onSuccess: () => void presets.refetch() });
  const del = api.watermark.deletePreset.useMutation({
    onSuccess: () => void presets.refetch(),
    onError: (e) => setMsg({ text: e.message, error: true }),
  });
  const rename = api.watermark.rename.useMutation({ onSuccess: () => void presets.refetch() });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMsg({ text: "Solo se permiten imágenes PNG/WEBP con fondo transparente.", error: true });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/watermark-settings", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Upload failed");
      }
      await presets.refetch();
      setMsg({ text: "Marca de agua subida y activada." });
    } catch (e) {
      setMsg({ text: `Error al subir: ${(e as Error).message}`, error: true });
    } finally {
      setUploading(false);
    }
  };

  const list = presets.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Upload */}
      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}
        >
          {uploading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Subiendo…
            </>
          ) : (
            <>+ Subir nueva marca de agua</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />
      </div>

      {msg && (
        <p className="text-xs" style={{ color: msg.error ? "#ef4444" : "#16a34a" }}>{msg.text}</p>
      )}

      {/* Presets */}
      {presets.isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <span className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#bfdbfe", borderTopColor: "#2563eb" }} />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-xs text-gray-400">Todavía no hay marcas de agua guardadas. Subí una PNG con transparencia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {list.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border overflow-hidden bg-white transition-all"
              style={{ borderColor: p.isActive ? "#2563eb" : "#e5e7eb", boxShadow: p.isActive ? "0 0 0 1px #2563eb" : "none" }}
            >
              <div className="relative h-24" style={CHECKER}>
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.name} className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">sin imagen</div>
                )}
                {p.isActive && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#2563eb" }}>
                    ✓ Activa
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    const n = prompt("Nombre de la marca de agua:", p.name);
                    if (n && n.trim() && n !== p.name) rename.mutate({ id: p.id, name: n.trim() });
                  }}
                  className="block w-full text-left text-xs font-medium text-gray-800 truncate hover:text-blue-600"
                  title="Renombrar"
                >
                  {p.name}
                </button>
                <div className="flex items-center gap-2 mt-1.5">
                  {p.isActive ? (
                    <span className="text-[11px] text-gray-400">En uso</span>
                  ) : (
                    <button
                      onClick={() => apply.mutate({ id: p.id })}
                      disabled={apply.isPending}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      Usar esta
                    </button>
                  )}
                  {!p.isActive && (
                    <button
                      onClick={() => { if (confirm(`¿Borrar la marca de agua "${p.name}"?`)) del.mutate({ id: p.id }); }}
                      disabled={del.isPending}
                      className="text-[11px] text-red-400 hover:text-red-600 ml-auto disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-100">
        <p className="text-xs leading-relaxed text-gray-500">
          Cada marca de agua queda guardada como preset: podés volver a cualquiera con "Usar esta" sin
          re-subirla. La marca activa se compone directamente sobre los píxeles de la imagen — no se
          puede quitar con DevTools. Al cambiarla, regenerá las previews del evento con "Regenerar todas
          las marcas de agua".
        </p>
      </div>
    </div>
  );
}
