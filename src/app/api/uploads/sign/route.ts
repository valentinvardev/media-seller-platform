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

  // Retry up to 4 times on transient Supabase Storage failures
  // (Gateway Timeout, DB timeout, pooler exhaustion).
  let lastMessage = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabaseAdmin.storage
      .from("photos")
      .createSignedUploadUrl(body.path);

    if (!error && data) {
      if (attempt > 0) console.info(`[uploads/sign] succeeded after ${attempt + 1} attempts path=${body.path}`);
      return NextResponse.json(data);
    }

    lastMessage = error?.message ?? "unknown";
    const retryable = /timeout|timed out|gateway|503|504|connection|ECONNRESET|fetch failed/i.test(lastMessage);
    console.error(`[uploads/sign] attempt=${attempt + 1} path=${body.path} message=${lastMessage}${retryable ? " (retrying)" : ""}`);

    if (!retryable || attempt === 3) break;
    await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt) + Math.random() * 400));
  }

  return NextResponse.json({ error: lastMessage }, { status: 500 });
}
