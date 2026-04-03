"use client";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ title, message, confirmLabel = "Eliminar", variant = "danger", onConfirm, onCancel }: Props) {
  const btnStyle = variant === "success"
    ? { background: "#10b98120", color: "#34d399", border: "1px solid #10b98140" }
    : { background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
            style={{ background: "#1e1e35", color: "#94a3b8" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={btnStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
