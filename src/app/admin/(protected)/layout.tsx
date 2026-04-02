import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen flex text-white" style={{ background: "#080810" }}>
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r" style={{ background: "#0a0a14", borderColor: "#1e1e35" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1e1e35" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              F
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">FotoDeporte</p>
              <p className="text-xs leading-tight" style={{ color: "#f59e0b" }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-b mx-3 my-3 rounded-xl" style={{ background: "#0f0f1a", borderColor: "#1e1e35" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#f59e0b20", color: "#fbbf24" }}>
              {session.user?.email?.[0]?.toUpperCase()}
            </div>
            <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          <p className="text-xs font-medium px-3 py-2" style={{ color: "#3a3a55" }}>NAVEGACIÓN</p>
          <NavItem href="/admin" icon="▦" label="Dashboard" />
          <NavItem href="/admin/colecciones" icon="◫" label="Colecciones" />
          <NavItem href="/admin/ventas" icon="◈" label="Ventas" />
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "#1e1e35" }}>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors mb-1"
          >
            <span>↗</span> Ver sitio público
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 transition-colors"
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

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-all hover:bg-white/5 group"
    >
      <span className="text-base w-5 text-center" style={{ color: "#f59e0b80" }}>{icon}</span>
      {label}
    </Link>
  );
}
