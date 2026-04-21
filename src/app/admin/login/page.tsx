"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      {/* Back to site */}
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al sitio
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5">
            <Image src="/logo.png" alt="ALTAFOTO" width={160} height={64} className="h-14 w-auto mx-auto" />
          </div>
          <p className="text-sm text-gray-500">Ingresá con tus credenciales</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-center bg-red-50 text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 hover:opacity-90 mt-1"
              style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}
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
