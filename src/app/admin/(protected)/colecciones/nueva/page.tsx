"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { EventCard } from "~/app/_components/EventCard";

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [day, month, year] = value
    ? [
        String(parseInt(value.split("-")[2] ?? "0")),
        String(parseInt(value.split("-")[1] ?? "0") - 1),
        value.split("-")[0] ?? "",
      ]
    : ["", "", ""];

  const daysInMonth = month !== "" && year !== ""
    ? new Date(parseInt(year), parseInt(month) + 1, 0).getDate()
    : 31;

  const emit = (d: string, m: string, y: string) => {
    if (d && m !== "" && y) {
      const mm = String(parseInt(m) + 1).padStart(2, "0");
      const dd = String(parseInt(d)).padStart(2, "0");
      onChange(`${y}-${mm}-${dd}`);
    } else {
      onChange("");
    }
  };

  const sel = "flex-1 appearance-none bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer";

  return (
    <div className="flex gap-2">
      {/* Day */}
      <select className={sel} value={day} onChange={(e) => emit(e.target.value, month, year)}>
        <option value="">Día</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d)}>{d}</option>
        ))}
      </select>
      {/* Month */}
      <select className={`${sel} flex-[2]`} value={month} onChange={(e) => emit(day, e.target.value, year)}>
        <option value="">Mes</option>
        {MONTHS.map((m, i) => (
          <option key={i} value={String(i)}>{m}</option>
        ))}
      </select>
      {/* Year */}
      <select className={sel} value={year} onChange={(e) => emit(day, month, e.target.value)}>
        <option value="">Año</option>
        {YEARS.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    slug: "",
    eventDate: "",
    pricePerBib: "",
    isPublished: false,
  });

  const create = api.collection.create.useMutation({
    onSuccess: (col) => router.push(`/admin/colecciones/${col.id}`),
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
    const price = parseFloat(form.pricePerBib);
    create.mutate({
      title: form.title,
      description: form.description || undefined,
      slug: form.slug,
      eventDate: form.eventDate || undefined,
      pricePerBib: isNaN(price) ? undefined : price,
      isPublished: form.isPublished,
    });
  };

  const previewCol = {
    title: form.title || "Nombre del evento",
    description: form.description || null,
    slug: form.slug,
    eventDate: form.eventDate ? new Date(form.eventDate) : null,
    coverUrl: null,
    bannerUrl: null,
    logoUrl: null,
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">

      {/* ── Form ── */}
      <div className="max-w-xl w-full">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a eventos
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear evento</h1>
        <p className="text-gray-500 text-sm mb-8">Completá los datos — la previsualización se actualiza en tiempo real.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Nombre del evento *">
            <input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="ej. Maratón Rosario 2025"
              className={inputClass}
            />
          </Field>

          <Field label="Fecha del evento">
            <DatePicker value={form.eventDate} onChange={(v) => setForm((f) => ({ ...f, eventDate: v }))} />
          </Field>

          <Field label="Precio por dorsal (ARS)">
            <input
              type="number"
              min="0"
              step="100"
              value={form.pricePerBib}
              onChange={(e) => setForm((f) => ({ ...f, pricePerBib: e.target.value }))}
              placeholder="ej. 5000"
              className={inputClass}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Descripción breve del evento..."
              className={inputClass}
            />
          </Field>

          <Field label="URL (slug) *">
            <input
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
              }
              required
              placeholder="maraton-rosario-2025"
              className={inputClass}
            />
            <p className="text-gray-400 text-xs mt-1.5">
              URL pública: /colecciones/{form.slug || "..."}
            </p>
          </Field>

          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 transition-colors">
            <div className="relative">
              <input type="checkbox" checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="sr-only" />
              <div className="w-10 h-5 rounded-full transition-colors"
                style={{ background: form.isPublished ? "#2563eb" : "#e2e8f0" }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ left: form.isPublished ? "22px" : "2px" }} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Publicar inmediatamente</p>
              <p className="text-xs text-gray-400">El evento será visible en el sitio público</p>
            </div>
          </label>

          {create.isError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-red-600 text-sm">Error al crear. Revisá que el slug no esté en uso.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit"
              disabled={create.isPending || !form.title || !form.slug}
              className="disabled:opacity-50 font-semibold text-white text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 shadow-sm"
              style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}>
              {create.isPending ? "Creando..." : "Crear evento →"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-800 px-6 py-3 rounded-xl transition-colors border border-gray-200 hover:border-gray-300 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* ── Live preview ── */}
      <div className="xl:sticky xl:top-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Vista previa de la tarjeta</p>
        <div className="max-w-xs mx-auto xl:mx-0">
          <EventCard col={previewCol} preview />
        </div>
        <p className="text-xs text-gray-300 text-center xl:text-left mt-3">Se actualiza mientras escribís</p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all border border-gray-200 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-600 text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
