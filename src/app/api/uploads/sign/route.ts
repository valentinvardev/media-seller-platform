import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { createUploadUrl, isS3Configured } from "~/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 no configurado. Falta AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY en .env." },
      { status: 503 },
    );
  }

  const body = await request.json() as { path?: string; contentType?: string };
  if (!body.path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Reject traversal/absolute keys outright for everyone.
  if (body.path.includes("..") || body.path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Admins can sign any key. Collaborators may only upload under the prefix of
  // a collection they're a member of ("<collectionId>/<filename>") — otherwise
  // any invited photographer could overwrite arbitrary S3 objects via raw PUT.
  if (session.user.role !== "ADMIN") {
    const collectionId = body.path.split("/")[0];
    if (!collectionId) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const member = await db.collectionMember.findUnique({
      where: { userId_collectionId: { userId: session.user.id, collectionId } },
    });
    if (!member) {
      return NextResponse.json({ error: "No sos parte de este evento" }, { status: 403 });
    }
  }

  const contentType = body.contentType ?? "application/octet-stream";

  try {
    const { signedUrl, path } = await createUploadUrl(body.path, contentType, 300);
    console.log(`[uploads/sign ${reqId}] success elapsed=${Date.now() - t0}ms path=${path}`);
    // Compat shape: previous Supabase response also had `signedUrl` and `path`.
    // `token` is kept for backwards compatibility with any caller that read it.
    return NextResponse.json({ signedUrl, path, token: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(`[uploads/sign ${reqId}] FAILURE total=${Date.now() - t0}ms message="${message}"`);
    return NextResponse.json({ error: message, reqId }, { status: 500 });
  }
}
