import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen flex text-gray-900" style={{ background: "#f8fafc" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-gray-100 bg-white">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 text-white"
              style={{ background: "linear-gradient(135deg, #1a3a6b, #2563eb)" }}
            >
              F
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">FotoDeporte</p>
              <p className="text-xs leading-tight text-blue-600">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-3 py-3 border-b border-gray-100 mx-3 my-3 rounded-xl bg-gray-50">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
              style={{ background: "#1a3a6b" }}
            >
              {session.user?.email?.[0]?.toUpperCase()}
            </div>
            <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
          <p className="text-xs font-semibold px-3 py-2 text-gray-400 tracking-wide">NAVEGACIÓN</p>
          <NavItem href="/admin" label="Dashboard" icon="▦" />
          <NavItem href="/admin/colecciones" label="Eventos" icon="◫" />
          <NavItem href="/admin/ventas" label="Ventas" icon="◈" />
          <NavItem href="/admin/configuracion" label="Configuración" svgIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } />
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            href="/"
            target="_blank"
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

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function NavItem({ href, label, icon, svgIcon }: { href: string; label: string; icon?: string; svgIcon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-900 transition-all hover:bg-blue-50 group"
    >
      <span className="w-5 flex items-center justify-center flex-shrink-0 text-blue-400 group-hover:text-blue-600">
        {svgIcon ?? <span className="text-base">{icon}</span>}
      </span>
      {label}
    </Link>
  );
}
