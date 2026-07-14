import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isCollaboratorPath = pathname.startsWith("/colaborador");

  if (!isAdminPath && !isCollaboratorPath) return NextResponse.next();

  const isSecure = request.url.startsWith("https");
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName,
  });

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token as { role?: string }).role;

  // /admin/* is admin-only. A collaborator hitting it gets bounced to their
  // dashboard. Tokens WITHOUT a role are legacy sessions issued before the
  // roles migration — those belong to admins (all pre-existing users were
  // promoted to ADMIN), so let them through; tRPC adminProcedure re-validates
  // against the DB anyway.
  if (isAdminPath && role !== undefined && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/colaborador", request.url));
  }

  // /colaborador/* is fine for any authenticated user (admin or collaborator).

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/colaborador/:path*"],
};
