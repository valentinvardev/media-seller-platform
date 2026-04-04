import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getAdminClient } from "~/lib/supabase/admin";
import { WATERMARK_KEY } from "~/lib/watermark";

/** GET — returns a signed URL for the current watermark, or null */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ url: null });

  const { data } = await client.storage.from("photos").createSignedUrl(WATERMARK_KEY, 3600);
  return NextResponse.json({ url: data?.signedUrl ?? null });
}

/** POST — uploads a new watermark PNG; body is FormData with field "file" */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage
    .from("photos")
    .upload(WATERMARK_KEY, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** DELETE — removes the current watermark */
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  await client.storage.from("photos").remove([WATERMARK_KEY]);
  return NextResponse.json({ ok: true });
}
