"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { StorageBar } from "./StorageBar";

// ─── Types ───────────────────────────────────────────────────────────────────

type FolderGroup = { number: string; files: File[] };
type UploadPhase = "select" | "uploading" | "done";
type FolderStatus = "pending" | "creating" | "uploading" | "done" | "error";

type FolderProgress = {
  status: FolderStatus;
  done: number;
  total: number;
  errorMsg?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readDirEntry(
  entry: FileSystemDirectoryEntry,
  prefix = "",
): Promise<Array<{ file: File; path: string }>> {
  const results: Array<{ file: File; path: string }> = [];
  const reader = entry.createReader();

  // readEntries returns max 100 items per call — loop until empty
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (!batch.length) break;

    for (const e of batch) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isFile) {
        const file = await new Promise<File>((res, rej) =>
          (e as FileSystemFileEntry).file(res, rej),
        );
        if (file.type.startsWith("image/")) results.push({ file, path: p });
      } else if (e.isDirectory) {
        const sub = await readDirEntry(e as FileSystemDirectoryEntry, p);
        results.push(...sub);
      }
    }
  }

  return results;
}

function detectNumber(path: string): string | null {
  const segments = path.split("/").slice(0, -1); // directory parts only
  return segments.find((s) => /^\d+$/.test(s.trim())) ?? null;
}

function groupFiles(items: Array<{ file: File; path: string }>): FolderGroup[] {
  const map = new Map<string, File[]>();
  for (const { file, path } of items) {
    const num = detectNumber(path);
    if (!num) continue;
    if (!map.has(num)) map.set(num, []);
    map.get(num)!.push(file);
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
  return (
    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "#1e1e35" }} />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BulkFolderCreate({
  collectionId,
  defaultPrice,
}: {
  collectionId: string;
  defaultPrice?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  // Accumulate groups across multiple drops/selections instead of replacing
  const processFiles = useCallback(
    (items: Array<{ file: File; path: string }>) => {
      const detected = groupFiles(items);
      if (detected.length === 0) {
        setGlobalError("No se detectaron carpetas numeradas.");
        return;
      }
      setGlobalError("");
      setGroups((prev) => {
        const map = new Map(prev.map((g) => [g.number, g]));
        for (const g of detected) {
          // Merge files if same number already exists, otherwise add
          const existing = map.get(g.number);
          if (existing) {
            map.set(g.number, { number: g.number, files: [...existing.files, ...g.files] });
          } else {
            map.set(g.number, g);
          }
        }
        return Array.from(map.values()).sort((a, b) => Number(a.number) - Number(b.number));
      });
    },
    [],
  );

  // Set webkitdirectory imperatively — JSX attribute is unreliable across browsers
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
    }
  }, [open]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      // IMPORTANT: capture all FileSystemEntry references synchronously before
      // any await — dataTransfer.items is cleared after the first async tick.
      // Use index loop: DataTransferItemList doesn't reliably support Array.from().
      const fsEntries: FileSystemEntry[] = [];
      const { items } = e.dataTransfer;
      for (let i = 0; i < items.length; i++) {
        const entry = items[i]?.webkitGetAsEntry();
        if (entry) fsEntries.push(entry);
      }

      const allFiles: Array<{ file: File; path: string }> = [];
      for (const entry of fsEntries) {
        if (entry.isDirectory) {
          const sub = await readDirEntry(entry as FileSystemDirectoryEntry, entry.name);
          allFiles.push(...sub);
        } else if (entry.isFile) {
          const file = await new Promise<File>((res) =>
            (entry as FileSystemFileEntry).file(res),
          );
          if (file.type.startsWith("image/")) allFiles.push({ file, path: entry.name });
        }
      }
      processFiles(allFiles);
    },
    [processFiles],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const items = files
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => ({
          file: f,
          path: (f as File & { webkitRelativePath: string }).webkitRelativePath || f.name,
        }));
      processFiles(items);
    },
    [processFiles],
  );

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
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (uploadRes.ok) uploaded.push({ storageKey: path, filename: file.name, fileSize: file.size });
        } catch { /* skip failed photo */ }
        updateProgress(group.number, { done: uploaded.length });
      }

      if (uploaded.length > 0) {
        await bulkAdd.mutateAsync({ folderId, photos: uploaded });
      }
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
    // Reset input so the same folder can be re-selected
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.setAttribute("webkitdirectory", "");
    }
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
                    ? "Seleccioná la carpeta del evento con los dorsales adentro"
                    : phase === "uploading"
                    ? `Subiendo ${groups.length} carpeta${groups.length !== 1 ? "s" : ""}...`
                    : `${doneGroups} creada${doneGroups !== 1 ? "s" : ""} · ${errorGroups} con error`}
                </p>
              </div>
              {phase !== "uploading" && (
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#16162a", color: "#64748b" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>

              {/* ── SELECT phase ────────────────────────────────────── */}
              {phase === "select" && (
                <>
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                    style={{
                      borderColor: isDragging ? "#f59e0b80" : "#1e1e35",
                      background: isDragging ? "#f59e0b08" : "#07070f",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                      style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
                      <svg className="w-5 h-5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <p className="text-white font-medium text-sm">
                      {groups.length > 0 ? "Agregar más carpetas" : "Arrastrá una carpeta aquí"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#475569" }}>
                      o hacé clic · podés agregar de a una, se acumulan
                    </p>
                  </div>

                  {/* Structure hint */}
                  {groups.length === 0 && (
                    <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "#07070f", border: "1px solid #1e1e35" }}>
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs leading-relaxed" style={{ color: "#475569" }}>
                        Seleccioná o arrastrá la <span style={{ color: "#94a3b8" }}>carpeta del evento</span> que adentro tiene las carpetas por dorsal:
                        <div className="mt-1.5 font-mono" style={{ color: "#334155" }}>
                          <div>📁 <span style={{ color: "#64748b" }}>maraton_2024/</span></div>
                          <div className="ml-4">📁 <span style={{ color: "#94a3b8" }}>42/</span> → foto1.jpg foto2.jpg</div>
                          <div className="ml-4">📁 <span style={{ color: "#94a3b8" }}>107/</span> → foto1.jpg</div>
                          <div className="ml-4">📁 <span style={{ color: "#94a3b8" }}>256/</span> → foto1.jpg foto2.jpg</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hidden folder input — webkitdirectory set imperatively in useEffect */}
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleInput}
                  />

                  {/* Detected folders list */}
                  {groups.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: "#64748b" }}>
                          {groups.length} carpeta{groups.length !== 1 ? "s" : ""} · {totalPhotos} foto{totalPhotos !== 1 ? "s" : ""}
                        </p>
                        <button
                          onClick={() => setGroups([])}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: "#475569", background: "#1e1e35" }}
                        >
                          Limpiar todo
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
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 hover:opacity-100 opacity-40 transition-opacity"
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

              {/* ── UPLOADING / DONE phase ───────────────────────────── */}
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
                            color: p.status === "done" ? "#34d399"
                              : p.status === "error" ? "#f87171"
                              : p.status === "creating" ? "#94a3b8"
                              : "#f59e0b",
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
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                background: p.status === "done" ? "#10b981" : "#f59e0b",
                              }}
                            />
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

              {/* Storage bar always visible */}
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
