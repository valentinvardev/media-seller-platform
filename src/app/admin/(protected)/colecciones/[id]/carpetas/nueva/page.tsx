"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function NewFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: collectionId } = use(params);
  const router = useRouter();
  const [form, setForm] = useState({ number: "", price: "" });

  const create = api.folder.create.useMutation({
    onSuccess: (folder) =>
      router.push(`/admin/colecciones/${collectionId}/carpetas/${folder.id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      collectionId,
      number: form.number,
      price: Number(form.price),
      isPublished: false,
    });
  };

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold mb-8">Nueva carpeta</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Número de dorsal *
          </label>
          <input
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            required
            placeholder="ej. 1234"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Precio (ARS) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
            placeholder="ej. 3500"
            className={inputClass}
          />
        </div>

        {create.isError && (
          <p className="text-red-400 text-sm">
            Error al crear. Verificá que el número no esté repetido.
          </p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="disabled:opacity-50 font-semibold text-black text-sm px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
          >
            {create.isPending ? "Creando..." : "Crear carpeta"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white px-6 py-2.5 rounded-xl transition-colors"
            style={{ background: "#1e1e35" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-colors"
  + " bg-[#0f0f1a] border border-[#1e1e35] focus:border-[#f59e0b40]";
