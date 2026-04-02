"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
    } else {
      window.location.href = "/admin";
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#07070f" }}
    >
      {/* Back to site */}
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-2 text-xs transition-colors"
        style={{ color: "#475569" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al sitio
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo / icon */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#f59e0b18", border: "1px solid #f59e0b35" }}
          >
            <svg className="w-7 h-7" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Panel de administración</h1>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Ingresá con tus credenciales</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors text-sm"
                style={{ background: "#07070f", border: "1px solid #1e1e35" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b40")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e35")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors text-sm"
                style={{ background: "#07070f", border: "1px solid #1e1e35" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b40")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e35")}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-50 hover:scale-[1.02] mt-1"
              style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
