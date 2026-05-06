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
  // Up to 3 server-side attempts with backoff. Supabase Storage's internal
  // DB is currently throttled; we want to give it every chance to succeed
  // before the client gets back an error.
  let lastMessage = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await Promise.race([
      supabaseAdmin.storage.from("photos").createSignedUploadUrl(body.path),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "Supabase Storage timeout (15s)" } }), 15_000),
      ),
    ]);

    if (!error && data) {
      if (attempt > 0) console.info(`[uploads/sign] succeeded after ${attempt + 1} attempts path=${body.path}`);
      return NextResponse.json(data);
    }

    lastMessage = error?.message ?? "unknown";
    console.error(`[uploads/sign] attempt=${attempt + 1} path=${body.path} message=${lastMessage}`);
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }

  return NextResponse.json({ error: lastMessage }, { status: 500 });
}
