"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function CollaboratorsPanel({ collectionId }: { collectionId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const members = api.member.listForCollection.useQuery({ collectionId });
  const invitations = api.invitation.listForCollection.useQuery({ collectionId });

  const removeMember = api.member.remove.useMutation({
    onSuccess: () => void members.refetch(),
  });
  const revokeInvitation = api.invitation.revoke.useMutation({
    onSuccess: () => void invitations.refetch(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Colaboradores</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Otros fotógrafos que pueden subir sus fotos a este evento.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="text-xs font-semibold px-3 py-2 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
        >
          + Invitar
        </button>
      </div>

      {/* Members */}
      {members.isLoading ? (
        <p className="text-xs text-gray-400">Cargando...</p>
      ) : (members.data?.length ?? 0) === 0 && (invitations.data?.length ?? 0) === 0 ? (
        <p className="text-xs text-gray-400 italic">Todavía no hay colaboradores.</p>
      ) : (
        <div className="space-y-2">
          {members.data?.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "#1a3a6b" }}
                >
                  {(m.name ?? m.email ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name ?? m.email}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {m.email} · Se unió {new Date(m.joinedAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Quitar a ${m.name ?? m.email} de este evento?\n\nSus fotos NO se borran.`)) {
                    removeMember.mutate({ id: m.id });
                  }
                }}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                Quitar
              </button>
            </div>
          ))}

          {/* Pending invitations */}
          {invitations.data?.map((inv) => {
            const url = typeof window !== "undefined" ? `${window.location.origin}/invitar/${inv.token}` : "";
            return (
              <div
                key={inv.id}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                    <p className="text-xs text-amber-700">
                      Invitación pendiente · vence {new Date(inv.expiresAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeInvitation.mutate({ id: inv.id })}
                    className="text-xs text-amber-700 hover:text-amber-900 shrink-0"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-amber-200 bg-white text-gray-700 font-mono"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() => { void navigator.clipboard.writeText(url); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inviteOpen && (
        <InviteModal
          collectionId={collectionId}
          onClose={() => setInviteOpen(false)}
          onCreated={() => { void invitations.refetch(); }}
        />
      )}
    </div>
  );
}

function InviteModal({
  collectionId,
  onClose,
  onCreated,
}: {
  collectionId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ acceptUrl: string; email: string } | null>(null);

  const create = api.invitation.create.useMutation({
    onSuccess: (data) => {
      setResult({ acceptUrl: data.acceptUrl, email: data.email });
      onCreated();
    },
  });

  const inp =
    "w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Invitar colaborador</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Va a poder subir fotos a este evento y ver sus ventas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✓ Invitación enviada a {result.email}
                </p>
                <p className="text-xs text-green-700">
                  Mandamos el email automáticamente y también podés compartir el link:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.acceptUrl}
                  className={`${inp} text-xs font-mono`}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => { void navigator.clipboard.writeText(result.acceptUrl); }}
                  className="px-3 py-3 rounded-xl text-xs font-semibold border border-green-300 text-green-700 hover:bg-green-100 transition-colors whitespace-nowrap"
                >
                  Copiar
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Email del colaborador
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fotografo@email.com"
                  autoFocus
                  className={inp}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email) create.mutate({ collectionId, email });
                  }}
                />
              </div>

              {create.isError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  {create.error.message}
                </p>
              )}

              <button
                disabled={!email || create.isPending}
                onClick={() => create.mutate({ collectionId, email })}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
              >
                {create.isPending ? "Enviando invitación..." : "Enviar invitación"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
