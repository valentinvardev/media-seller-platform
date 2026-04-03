"use client";

type Props = {
  isPublished: boolean;
  isPending?: boolean;
  onToggle: () => void;
  labelOn?: string;
  labelOff?: string;
};

export function PublishToggle({
  isPublished,
  isPending = false,
  onToggle,
  labelOn = "Publicada",
  labelOff = "Borrador",
}: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50 select-none"
      title={isPublished ? "Clic para ocultar" : "Clic para publicar"}
    >
      {/* Track */}
      <div
        className="relative w-8 h-4 rounded-full flex-shrink-0 transition-colors duration-200"
        style={{ background: isPublished ? "#10b981" : "#1e1e35" }}
      >
        {/* Thumb */}
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
          style={{
            background: isPublished ? "#fff" : "#475569",
            left: isPublished ? "calc(100% - 14px)" : "2px",
            boxShadow: isPublished ? "0 0 6px #10b98160" : "none",
          }}
        />
      </div>
      <span
        className="text-xs font-medium transition-colors duration-200"
        style={{ color: isPublished ? "#34d399" : "#475569" }}
      >
        {isPending ? "..." : isPublished ? labelOn : labelOff}
      </span>
    </button>
  );
}
