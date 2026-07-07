import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

/**
 * Returns the current user's role. Used by the login page to decide where
 * to redirect after a successful sign-in (admin dashboard vs collaborator
 * dashboard). No sensitive data — just the role string.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ role: null }, { status: 401 });
  return NextResponse.json({ role: session.user.role });
}
