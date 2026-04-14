"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
  icon,
  svgIcon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: string;
  svgIcon?: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group"
      style={{
        color: isActive ? "#1a3a6b" : "#6b7280",
        background: isActive ? "#dbeafe" : "transparent",
        fontWeight: isActive ? 600 : undefined,
      }}
    >
      <span
        className="w-5 flex items-center justify-center flex-shrink-0"
        style={{ color: isActive ? "#2563eb" : "#93c5fd" }}
      >
        {svgIcon ?? <span className="text-base">{icon}</span>}
      </span>
      {label}
    </Link>
  );
}

export function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const settingsIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const sidebar = (
    <aside className="w-56 shrink-0 flex flex-col border-r border-gray-100 bg-white h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}
          >
            A
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">ALTAFOTO</p>
            <p className="text-xs leading-tight text-blue-600">Admin Panel</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:text-gray-700"
          onClick={close}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-b border-gray-100 mx-3 my-3 rounded-xl bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{ background: "#1a3a6b" }}
          >
            {userEmail?.[0]?.toUpperCase()}
          </div>
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        <p className="text-xs font-semibold px-3 py-2 text-gray-400 tracking-wide">NAVEGACIÓN</p>
        <NavItem href="/admin" label="Dashboard" icon="▦" onNavigate={close} />
        <NavItem href="/admin/colecciones" label="Eventos" icon="◫" onNavigate={close} />
        <NavItem href="/admin/ventas" label="Ventas" icon="◈" onNavigate={close} />
        <NavItem href="/admin/configuracion" label="Configuración" svgIcon={settingsIcon} onNavigate={close} />
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <Link
          href="/"
          target="_blank"
          onClick={close}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-700 transition-colors mb-1"
        >
          <span>↗</span> Ver sitio público
        </Link>
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <span>→</span> Cerrar sesión
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex text-gray-900" style={{ background: "#f8fafc" }}>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:fixed lg:inset-y-0">
        {sidebar}
      </div>

      {/* ── Mobile: backdrop + slide-in drawer ────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={close}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-30 flex flex-col lg:hidden transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 224 }}
      >
        {sidebar}
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-56">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}
            >
              A
            </div>
            <span className="font-bold text-gray-900 text-sm">ALTAFOTO</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
