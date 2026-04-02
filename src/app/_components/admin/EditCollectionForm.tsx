"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Collection = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
};

export function EditCollectionForm({ collection }: { collection: Collection }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: collection.title,
    description: collection.description ?? "",
    slug: collection.slug,
    isPublished: collection.isPublished,
  });

  const update = api.collection.update.useMutation({
    onSuccess: () => router.refresh(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: collection.id,
      title: form.title,
      description: form.description || undefined,
      slug: form.slug,
      isPublished: form.isPublished,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-4">
      <div>
        <label className="block text-gray-400 text-sm mb-1">Título *</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Slug</label>
        <input
          value={form.slug}
          onChange={(e) =>
            setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
          }
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
        />
        <span className="text-gray-300 text-sm">Publicada</span>
      </label>

      {update.isSuccess && (
        <p className="text-green-400 text-sm">Guardado correctamente.</p>
      )}
      {update.isError && (
        <p className="text-red-400 text-sm">Error al guardar.</p>
      )}

      <button
        type="submit"
        disabled={update.isPending}
        className="self-start disabled:opacity-50 font-semibold text-black text-sm px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
      >
        {update.isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-colors"
  + " bg-[#0f0f1a] border border-[#1e1e35] focus:border-[#f59e0b40]";
