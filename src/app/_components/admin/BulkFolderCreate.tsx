"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { StorageBar } from "./StorageBar";

// ─── Types ───────────────────────────────────────────────────────────────────

type FolderGroup = { number: string; files: File[] };
type UploadPhase = "select" | "uploading" | "done";
type FolderStatus = "pending" | "creating" | "uploading" | "done" | "error";
type FolderProgress = { status: FolderStatus; done: number; total: number; errorMsg?: string };

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

function isImage(f: File) {
  const isHeic = HEIC_EXT.test(f.name) || f.type === "image/heic" || f.type === "image/heif";
  if (isHeic) return false;
  return f.type.startsWith("image/") || IMAGE_EXT.test(f.name);
}

function groupByNumber(files: File[]): FolderGroup[] {
  const map = new Map<string, File[]>();
  for (const f of files) {
    const rel = (f as File & { webkitRelativePath: string }).webkitRelativePath;
    // find first purely numeric path segment (the dorsal folder)
    const num = rel.split("/").slice(0, -1).find((s) => /^\d+$/.test(s));
    if (!num) continue;
    if (!map.has(num)) map.set(num, []);
    map.get(num)!.push(f);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([number, files]) => ({ number, files }));
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function FolderStatusIcon({ status }: { status: FolderStatus }) {
  if (status === "done") return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#10b98120" }}>
      <svg className="w-3 h-3" style={{ color: "#34d399" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  if (status === "uploading" || status === "creating") return (
    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
      style={{ borderColor: "#f59e0b40", borderTopColor: "#f59e0b" }} />
  );
  if (status === "error") return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ef444420" }}>
      <svg className="w-3 h-3" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
  return <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "#1e1e35" }} />;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BulkFolderCreate({ collectionId, defaultPrice }: { collectionId: string; defaultPrice?: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<FolderGroup[]>([]);
  const [progress, setProgress] = useState<Record<string, FolderProgress>>({});
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "3500");
  const [phase, setPhase] = useState<UploadPhase>("select");
  const [globalError, setGlobalError] = useState("");

  const createFolder = api.folder.create.useMutation();
  const bulkAdd = api.photo.bulkAdd.useMutation();

  const updateProgress = useCallback(
    (number: string, patch: Partial<FolderProgress>) =>
      setProgress((prev) => ({ ...prev, [number]: { ...prev[number]!, ...patch } })),
    [],
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files ?? []);
    const heicCount = allFiles.filter((f) => HEIC_EXT.test(f.name) || f.type === "image/heic" || f.type === "image/heif").length;
    const files = allFiles.filter(isImage);
    if (!files.length) {
      setGlobalError(heicCount > 0
        ? `Solo se encontraron fotos HEIC (${heicCount}). Los navegadores no pueden mostrar HEIC. Convertí las imágenes a JPG.`
        : "No se encontraron imágenes.");
      return;
    }
    const detected = groupByNumber(files);
    if (!detected.length) { setGlobalError("No se detectaron carpetas numeradas. Asegurate de seleccionar la carpeta padre (ej: maraton_2024/)."); return; }
    setGlobalError(heicCount > 0
      ? `Se ignoraron ${heicCount} foto${heicCount !== 1 ? "s" : ""} HEIC. Convertí a JPG para incluirlas.`
      : "");
    setGroups(detected);
    e.target.value = "";
  };

  const handleUpload = async () => {
    const priceNum = Number(price);
    if (!groups.length) return;
    if (isNaN(priceNum) || priceNum <= 0) { setGlobalError("Precio inválido."); return; }
    setGlobalError("");

    const init: Record<string, FolderProgress> = {};
    groups.forEach((g) => { init[g.number] = { status: "pending", done: 0, total: g.files.length }; });
    setProgress(init);
    setPhase("uploading");

    for (const group of groups) {
      updateProgress(group.number, { status: "creating" });

      let folderId: string;
      try {
        const created = await createFolder.mutateAsync({
          collectionId,
          number: group.number,
          price: priceNum,
          isPublished: true,
        });
        folderId = created.id;
      } catch {
        updateProgress(group.number, { status: "error", errorMsg: "Ya existe o no se pudo crear" });
        continue;
      }

      updateProgress(group.number, { status: "uploading" });
      const uploaded: { storageKey: string; filename: string; fileSize: number }[] = [];

      for (const file of group.files) {
        const path = `${collectionId}/${folderId}/${Date.now()}-${file.name}`;
        try {
          const signRes = await fetch("/api/uploads/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          if (!signRes.ok) continue;
          const { signedUrl } = await signRes.json() as { signedUrl: string };
          const uploadRes = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "image/jpeg" },
            body: file,
          });
          if (uploadRes.ok) uploaded.push({ storageKey: path, filename: file.name, fileSize: file.size });
        } catch { /* skip failed photo */ }
        updateProgress(group.number, { done: uploaded.length });
      }

      if (uploaded.length > 0) await bulkAdd.mutateAsync({ folderId, photos: uploaded });
      updateProgress(group.number, { status: "done", done: uploaded.length });
    }

    setPhase("done");
    router.refresh();
  };

  const reset = () => {
    setGroups([]);
    setProgress({});
    setPhase("select");
    setGlobalError("");
  };

  const close = () => {
    if (phase === "uploading") return;
    reset();
    setOpen(false);
  };

  const totalPhotos = groups.reduce((s, g) => s + g.files.length, 0);
  const doneGroups = Object.values(progress).filter((p) => p.status === "done").length;
  const errorGroups = Object.values(progress).filter((p) => p.status === "error").length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-xl transition-all hover:bg-white/5"
        style={{ color: "#94a3b8", border: "1px solid #1e1e35" }}
      >
        + Carga masiva
      </button>

      {/* Hidden input — webkitdirectory lets the browser walk the whole folder tree */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInput}
        // @ts-expect-error non-standard but widely supported
        webkitdirectory=""
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => phase !== "uploading" && close()}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border flex flex-col overflow-hidden"
            style={{ background: "#0f0f1a", borderColor: "#1e1e35", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "#1e1e35" }}>
              <div>
                <h2 className="font-bold text-white text-sm">Carga masiva de carpetas</h2>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                  {phase === "select"
                    ? "Seleccioná la carpeta del evento"
                    : phase === "uploading"
                    ? `Subiendo ${groups.length} carpeta${groups.length !== 1 ? "s" : ""}...`
                    : `${doneGroups} creada${doneGroups !== 1 ? "s" : ""} · ${errorGroups} con error`}
                </p>
              </div>
              {phase !== "uploading" && (
                <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#16162a", color: "#64748b" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>

              {phase === "select" && (
                <>
                  {/* Big select button */}
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-all hover:border-amber-500/40 hover:bg-amber-500/5 w-full"
                    style={{ borderColor: "#1e1e35", background: "#07070f" }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
                      <svg className="w-6 h-6" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <p className="text-white font-semibold text-sm">
                      {groups.length > 0 ? "Cambiar selección" : "Seleccionar carpeta del evento"}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: "#475569" }}>
                      Seleccioná la carpeta padre que contiene los dorsales adentro
                    </p>
                  </button>

                  {/* Structure hint */}
                  {groups.length === 0 && (
                    <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "#07070f", border: "1px solid #1e1e35" }}>
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs leading-relaxed" style={{ color: "#475569" }}>
                        <span style={{ color: "#94a3b8" }}>Estructura esperada:</span>
                        <div className="mt-1.5 font-mono space-y-0.5">
                          <div className="flex items-center gap-1" style={{ color: "#64748b" }}>
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            <span>maraton_2024/</span> <span className="font-sans" style={{ color: "#334155" }}>← seleccioná esta</span>
                          </div>
                          {[["42/", "foto1.jpg foto2.jpg"], ["107/", "foto1.jpg"], ["256/", "foto1.jpg foto2.jpg"]].map(([num, files]) => (
                            <div key={num} className="ml-4 flex items-center gap-1" style={{ color: "#475569" }}>
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              <span style={{ color: "#94a3b8" }}>{num}</span> <span>{files}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detected folders */}
                  {groups.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: "#64748b" }}>
                          {groups.length} carpeta{groups.length !== 1 ? "s" : ""} detectada{groups.length !== 1 ? "s" : ""} · {totalPhotos} foto{totalPhotos !== 1 ? "s" : ""}
                        </p>
                        <button onClick={() => setGroups([])} className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: "#475569", background: "#1e1e35" }}>
                          Limpiar
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {groups.map((g) => (
                          <div key={g.number} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ background: "#07070f", border: "1px solid #1e1e35" }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "#f59e0b15", color: "#f59e0b" }}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                            <span className="font-mono font-semibold text-white text-sm">#{g.number}</span>
                            <span className="text-xs flex-1" style={{ color: "#475569" }}>{g.files.length} foto{g.files.length !== 1 ? "s" : ""}</span>
                            <button
                              onClick={() => setGroups((prev) => prev.filter((x) => x.number !== g.number))}
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                              style={{ color: "#f87171" }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: "#64748b" }}>Precio por carpeta (ARS)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                      style={{ background: "#07070f", border: "1px solid #1e1e35" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b40")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e35")}
                    />
                  </div>

                  {globalError && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444415", color: "#f87171" }}>{globalError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleUpload}
                      disabled={groups.length === 0}
                      className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                    >
                      {groups.length > 0
                        ? `Crear y subir ${groups.length} carpeta${groups.length !== 1 ? "s" : ""}`
                        : "Crear y subir"}
                    </button>
                    <button onClick={close} className="px-4 rounded-xl text-sm"
                      style={{ background: "#1e1e35", color: "#94a3b8" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {/* ── UPLOADING / DONE ─────────────────────────────────── */}
              {(phase === "uploading" || phase === "done") && (
                <div className="flex flex-col gap-2">
                  {groups.map((g) => {
                    const p = progress[g.number];
                    if (!p) return null;
                    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                    return (
                      <div key={g.number} className="rounded-xl px-4 py-3 flex flex-col gap-2"
                        style={{
                          background: "#07070f",
                          border: `1px solid ${p.status === "error" ? "#ef444430" : p.status === "done" ? "#10b98120" : "#1e1e35"}`,
                        }}>
                        <div className="flex items-center gap-3">
                          <FolderStatusIcon status={p.status} />
                          <span className="font-mono font-semibold text-white text-sm flex-1">#{g.number}</span>
                          <span className="text-xs" style={{
                            color: p.status === "done" ? "#34d399" : p.status === "error" ? "#f87171"
                              : p.status === "creating" ? "#94a3b8" : "#f59e0b",
                          }}>
                            {p.status === "pending" ? "En cola"
                              : p.status === "creating" ? "Creando carpeta..."
                              : p.status === "uploading" ? `${p.done} / ${p.total}`
                              : p.status === "done" ? `${p.done} foto${p.done !== 1 ? "s" : ""}`
                              : (p.errorMsg ?? "Error")}
                          </span>
                        </div>
                        {(p.status === "uploading" || p.status === "done") && p.total > 0 && (
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1e1e35" }}>
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, background: p.status === "done" ? "#10b981" : "#f59e0b" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {phase === "done" && (
                    <button
                      onClick={() => { reset(); setOpen(false); }}
                      className="w-full py-2.5 mt-2 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              )}

              <div className="pt-1 border-t" style={{ borderColor: "#1e1e35" }}>
                <StorageBar />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
