"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function AlphanumericToggle({
  collectionId,
  initialValue,
}: {
  collectionId: string;
  initialValue: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  const update = api.collection.update.useMutation({
    onSuccess: () => {
      setPending(false);
      router.refresh();
    },
    onError: () => {
      // Revert on error
      setValue(!value);
      setPending(false);
    },
  });

  const toggle = () => {
    if (pending) return;
    const next = !value;
    setValue(next);
    setPending(true);
    update.mutate({ id: collectionId, hasAlphanumericBibs: next });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
    >
      <div className="relative shrink-0">
        <div
          className="w-10 h-5 rounded-full transition-colors"
          style={{ background: value ? "#F97316" : "#e2e8f0" }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ left: value ? "22px" : "2px" }}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">Dorsales alfanuméricos</p>
        <p className="text-xs text-gray-400">
          {value
            ? "Búsqueda con teclado de texto. OCR busca A1234, C1722, etc."
            : "Solo números. Búsqueda con teclado numérico."}
        </p>
      </div>
    </button>
  );
}
