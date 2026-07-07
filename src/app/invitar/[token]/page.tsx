"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { api } from "~/trpc/react";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: invitation, isLoading } = api.invitation.getByToken.useQuery({ token });

  if (isLoading) return <Screen><Card><p className="text-sm text-gray-500 text-center py-8">Cargando...</p></Card></Screen>;
  if (!invitation) return <Screen><Card><ErrorState message="No se pudo cargar la invitación." /></Card></Screen>;

  if (invitation.status === "not-found") {
    return <Screen><Card><ErrorState title="Link inválido" message="No encontramos esta invitación. Puede que haya sido cancelada." /></Card></Screen>;
  }
  if (invitation.status === "expired") {
    return <Screen><Card><ErrorState title="Invitación vencida" message="Este link ya venció. Pedile al administrador que te mande una invitación nueva." /></Card></Screen>;
  }
  if (invitation.status === "already-accepted") {
    return <Screen><Card><ErrorState title="Ya usada" message="Esta invitación ya fue aceptada. Iniciá sesión con tu cuenta para acceder al evento." actionLabel="Iniciar sesión" actionHref="/admin/login" /></Card></Screen>;
  }

  return (
    <Screen>
      <Card>
        <AcceptFlow
          token={token}
          invitation={invitation}
        />
      </Card>
    </Screen>
  );
}

// ─── Layout wrappers ──────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "#f8fafc" }}>
      <div className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALTAFOTO" className="h-8 w-auto" />
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      {children}
    </div>
  );
}

function ErrorState({
  title = "Ups",
  message,
  actionLabel,
  actionHref,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
      >
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="font-bold text-gray-900 text-lg mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <Link
        href={actionHref ?? "/"}
        className="inline-block px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        {actionLabel ?? "Volver al inicio"}
      </Link>
    </div>
  );
}

// ─── Accept flow ──────────────────────────────────────────────────────────────

type ValidInvitation = {
  status: "valid";
  email: string;
  eventTitle: string;
  eventSlug: string;
  collectionId: string;
  inviterName: string | null;
  expiresAt: Date;
  hasAccount: boolean;
};

function AcceptFlow({
  token,
  invitation,
}: {
  token: string;
  invitation: ValidInvitation;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = api.invitation.accept.useMutation();

  const handleSignupAndAccept = async () => {
    if (!name || !password) return;
    setError(null);
    setBusy(true);
    try {
      const result = await accept.mutateAsync({ token, signup: { name, password } });
      // Sign the newly created user in
      const signInRes = await signIn("credentials", {
        email: invitation.email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        setError("Cuenta creada pero no pudimos iniciar sesión. Iniciá manualmente.");
        setBusy(false);
        return;
      }
      router.push(`/colaborador/eventos/${result.collectionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  };

  const handleAcceptExisting = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await accept.mutateAsync({ token });
      router.push(`/colaborador/eventos/${result.collectionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      // If not signed in, it'll throw BAD_REQUEST — redirect to login.
      if (msg.toLowerCase().includes("faltan datos") || msg.toLowerCase().includes("unauthorized")) {
        router.push(`/admin/login?callbackUrl=${encodeURIComponent(`/invitar/${token}`)}`);
        return;
      }
      setError(msg);
      setBusy(false);
    }
  };

  const inp =
    "w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

  return (
    <div>
      <div className="text-center mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
        >
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <h1 className="font-bold text-gray-900 text-xl">Te invitaron a colaborar</h1>
        <p className="text-sm text-gray-500 mt-1">
          <strong>{invitation.inviterName ?? "El administrador"}</strong> te invitó a subir fotos al evento{" "}
          <strong className="text-gray-900">{invitation.eventTitle}</strong>.
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 mb-5">
        <p className="text-xs text-gray-500 mb-0.5">Email de la invitación</p>
        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
      </div>

      {invitation.hasAccount ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Ya tenés una cuenta con este email. Iniciá sesión para aceptar la invitación.
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
          <button
            onClick={handleAcceptExisting}
            disabled={busy}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            {busy ? "Aceptando..." : "Iniciar sesión y aceptar"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Creá tu cuenta para aceptar la invitación:
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className={inp}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inp}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name && password.length >= 6) void handleSignupAndAccept();
              }}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <button
            onClick={() => void handleSignupAndAccept()}
            disabled={busy || !name || password.length < 6}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            {busy ? "Creando cuenta..." : "Crear cuenta y aceptar"}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-5">
        Vence el {new Date(invitation.expiresAt).toLocaleDateString("es-AR")}
      </p>
    </div>
  );
}
