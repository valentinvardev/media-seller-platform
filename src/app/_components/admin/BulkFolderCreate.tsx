"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function BulkFolderCreate({ collectionId, defaultPrice }: { collectionId: string; defaultPrice?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "3500");
  const [error, setError] = useState("");

  const create = api.folder.create.useMutation();

  // Parse "1, 2, 3" or "1-10" or "42 107 256"
  const parseNumbers = (raw: string): string[] => {
    const results = new Set<string>();
    const parts = raw.split(/[,\s]+/).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (start !== undefined && end !== undefined && !isNaN(start) && !isNaN(end) && end >= start && end - start < 1000) {
          for (let i = start; i <= end; i++) results.add(String(i));
        }
      } else if (!isNaN(Number(part)) && part.trim() !== "") {
        results.add(part.trim());
      }
    }
    return Array.from(results);
  };

  const numbers = parseNumbers(input);
  const priceNum = Number(price);

  const handleCreate = async () => {
    if (!numbers.length) { setError("Ingresá al menos un número."); return; }
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError("Precio inválido."); return; }
    setError("");

    for (const number of numbers) {
      await create.mutateAsync({ collectionId, number, price: priceNum, isPublished: true });
    }

    setInput("");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-xl transition-all hover:bg-white/5"
        style={{ color: "#94a3b8", border: "1px solid #1e1e35" }}
      >
        + Carga masiva
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-5 mt-4" style={{ background: "#0a0a15", borderColor: "#1e1e35" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-sm">Crear carpetas en masa</h3>
        <button onClick={() => setOpen(false)} style={{ color: "#64748b" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: "#64748b" }}>
            Números de dorsal
          </label>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            placeholder={"42, 107, 256\n1-100\n201 202 203"}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none resize-none"
            style={{ background: "#07070f", border: "1px solid #1e1e35" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b40")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e35")}
          />
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            Separados por coma, espacio, o rangos como <span style={{ color: "#94a3b8" }}>1-50</span>.
            {numbers.length > 0 && (
              <span style={{ color: "#fbbf24" }}> → {numbers.length} carpeta{numbers.length !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: "#64748b" }}>Precio (ARS)</label>
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

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444415", color: "#f87171" }}>{error}</p>
        )}
        {create.isError && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444415", color: "#f87171" }}>
            Error al crear. Algún número puede estar duplicado.
          </p>
        )}

        <div className="flex gap-2 mt-1">
          <button
            onClick={handleCreate}
            disabled={create.isPending || numbers.length === 0}
            className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
          >
            {create.isPending
              ? "Creando..."
              : numbers.length > 0
                ? `Crear ${numbers.length} carpeta${numbers.length !== 1 ? "s" : ""}`
                : "Crear"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "#1e1e35", color: "#94a3b8" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
