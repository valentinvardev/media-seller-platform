"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function NewCollectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    slug: "",
    isPublished: false,
  });

  const create = api.collection.create.useMutation({
    onSuccess: () => router.push("/admin/colecciones"),
  });

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      title: form.title,
      description: form.description || undefined,
      slug: form.slug,
      isPublished: form.isPublished,
    });
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-8">Nueva colección</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título *">
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="ej. Maratón Rosario 2024"
            className={inputClass}
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Descripción opcional"
            className={inputClass}
          />
        </Field>

        <Field label="Slug (URL) *">
          <input
            value={form.slug}
            onChange={(e) =>
              setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
            }
            required
            placeholder="maraton-rosario-2024"
            className={inputClass}
          />
          <p className="text-gray-500 text-xs mt-1">
            URL: /colecciones/{form.slug || "..."}
          </p>
        </Field>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            className="rounded"
          />
          <span className="text-gray-300 text-sm">Publicar inmediatamente</span>
        </label>

        {create.isError && (
          <p className="text-red-400 text-sm">Error al crear. Revisá que el slug no esté en uso.</p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="disabled:opacity-50 font-semibold text-black text-sm px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
          >
            {create.isPending ? "Creando..." : "Crear colección"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}
