"use client";

import { api } from "~/trpc/react";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageBar() {
  const { data } = api.photo.getStorageUsage.useQuery();

  if (!data) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs" style={{ color: "#334155" }}>
          <span>Almacenamiento</span>
          <span>Calculando...</span>
        </div>
        <div className="h-1 rounded-full animate-pulse" style={{ background: "#1e1e35" }} />
      </div>
    );
  }

  const pct = Math.min((data.usedBytes / data.limitBytes) * 100, 100);
  const barColor = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#10b981";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "#475569" }}>Almacenamiento</span>
        <span style={{ color: "#64748b" }}>
          <span style={{ color: "#94a3b8" }}>{formatBytes(data.usedBytes)}</span>
          {" "}de {formatBytes(data.limitBytes)}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1e1e35" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
