import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "~/server/auth";

export default async function CollaboratorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login?callbackUrl=/colaborador");

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Top bar — simplified compared to AdminShell; collaborators only see their events */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/colaborador" className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.png" alt="ALTAFOTO" width={100} height={40} className="h-7 w-auto" priority />
            <span className="text-xs text-blue-600 font-semibold whitespace-nowrap hidden sm:inline">Colaborador</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-500 min-w-0">
            <span className="hidden sm:inline truncate">{session.user.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
            >
              Cerrar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
