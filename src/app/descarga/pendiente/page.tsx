"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchase") ?? "";

  const { data } = api.purchase.checkStatus.useQuery(
    { purchaseId },
    {
      enabled: !!purchaseId,
      // Poll every 3s until APPROVED; the webhook normally lands within seconds.
      refetchInterval: (query) =>
        query.state.data?.status === "APPROVED" ? false : 3000,
    },
  );

  useEffect(() => {
    if (data?.status === "APPROVED" && data.downloadToken) {
      router.replace(`/descarga/${data.downloadToken}`);
    }
  }, [data, router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ background: "#0057A8" }}
        />
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
        >
          <svg
            className="w-7 h-7 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3a9 9 0 1 0 9 9"
            />
          </svg>
        </div>
      </div>

      <div>
        <h1 className="font-display font-800 uppercase text-2xl text-white mb-2">
          Confirmando tu pago…
        </h1>
        <p className="text-sm max-w-sm" style={{ color: "#94a3b8" }}>
          Esto puede demorar unos segundos. En cuanto MercadoPago confirme el
          pago, te llevamos directo a tu galería.
        </p>
        <p className="text-xs max-w-sm mt-3" style={{ color: "#64748b" }}>
          Si la confirmación demora, vas a recibir el link de descarga por email
          en unos minutos.
        </p>
      </div>

      <Link
        href="/"
        className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{ background: "#1a1a2e", color: "#94a3b8" }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  );
}
