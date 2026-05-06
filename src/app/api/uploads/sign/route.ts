import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no configurada. Agregala en .env para habilitar uploads." },
      { status: 503 },
    );
  }

  const body = await request.json() as { path?: string };
  if (!body.path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Single quick retry on transient Supabase failure — keep total response
  // time short so the browser doesn't time out. The client retries the
  // whole request up to 5 times with longer backoff if needed.
  // Single attempt with a generous 12s ceiling — Supabase Storage can be slow
  // under load, but if it hasn't answered in 12s we let the client retry the
  // whole request. No server-side retry: that just doubles the wait when
  // Supabase is consistently slow.
  const { data, error } = await Promise.race([
    supabaseAdmin.storage.from("photos").createSignedUploadUrl(body.path),
    new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "Supabase Storage timeout (12s)" } }), 12_000),
    ),
  ]);

  if (!error && data) return NextResponse.json(data);

  const message = error?.message ?? "unknown";
  console.error(`[uploads/sign] path=${body.path} message=${message}`);
  return NextResponse.json({ error: message }, { status: 500 });
}
