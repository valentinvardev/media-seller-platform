import { WatermarkSettings } from "~/app/_components/admin/WatermarkSettings";

export default function ConfigPage() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
        <p className="text-slate-500 mt-1">Ajustes globales de la plataforma</p>
      </div>

      <div className="max-w-lg flex flex-col gap-8">
        <section
          className="rounded-2xl border p-6"
          style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
        >
          <h2 className="text-base font-semibold text-white mb-1">Marca de agua</h2>
          <p className="text-xs mb-5" style={{ color: "#475569" }}>
            Subí un PNG con fondo transparente. Se compone directamente sobre la imagen al generar
            previews — no es un elemento de CSS, no se puede remover con DevTools.
          </p>
          <WatermarkSettings />
        </section>
      </div>
    </div>
  );
}
