import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";

// Force Node runtime — Edge + Prisma/Supabase SDK can be unstable.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

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

  // Up to 3 attempts with backoff. 30s timeout per attempt — long enough to
  // ride out Supabase latency spikes without prematurely aborting (per support
  // recommendation that 12s was masking transient spikes).
  let lastMessage = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    const tStart = Date.now();
    const { data, error } = await Promise.race([
      supabaseAdmin.storage.from("photos").createSignedUploadUrl(body.path),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "Supabase Storage timeout (30s)" } }), 30_000),
      ),
    ]);
    const elapsed = Date.now() - tStart;

    if (!error && data) {
      console.log(`[uploads/sign ${reqId}] success attempt=${attempt + 1} elapsed=${elapsed}ms total=${Date.now() - t0}ms path=${body.path}`);
      return NextResponse.json(data);
    }

    lastMessage = error?.message ?? "unknown";
    console.error(`[uploads/sign ${reqId}] attempt=${attempt + 1} elapsed=${elapsed}ms path=${body.path} message="${lastMessage}"`);
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }

  console.error(`[uploads/sign ${reqId}] FINAL FAILURE total=${Date.now() - t0}ms path=${body.path} message="${lastMessage}"`);
  return NextResponse.json({ error: lastMessage, reqId }, { status: 500 });
}
