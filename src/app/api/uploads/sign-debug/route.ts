/**
 * Diagnostic-only route per Supabase support recommendation.
 * No Prisma, no auth, just createSignedUploadUrl + structured logs.
 * If this also times out: issue is project/platform-side.
 * If this works: Prisma/runtime interaction in /api/uploads/sign is the trigger.
 *
 * Usage:
 *   curl -X POST https://yourdomain.com/api/uploads/sign-debug \
 *     -H "Content-Type: application/json" \
 *     -d '{"path":"debug-test/test.jpg"}'
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "~/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 503 });
  }

  const body = await request.json() as { path?: string };
  const path = body.path ?? `debug-test/${Date.now()}.jpg`;

  console.log(`[sign-debug ${reqId}] start path=${path}`);

  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const t1 = Date.now();
    const { data, error } = await supabaseAdmin.storage.from("photos").createSignedUploadUrl(path);
    const elapsed = Date.now() - t1;

    if (error) {
      console.error(`[sign-debug ${reqId}] error elapsed=${elapsed}ms message="${error.message}" total=${Date.now() - t0}ms`);
      return NextResponse.json({
        ok: false,
        reqId,
        elapsedMs: elapsed,
        totalMs: Date.now() - t0,
        error: error.message,
      }, { status: 500 });
    }

    console.log(`[sign-debug ${reqId}] success elapsed=${elapsed}ms total=${Date.now() - t0}ms`);
    return NextResponse.json({
      ok: true,
      reqId,
      elapsedMs: elapsed,
      totalMs: Date.now() - t0,
      signedUrl: data.signedUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sign-debug ${reqId}] exception total=${Date.now() - t0}ms message="${message}"`);
    return NextResponse.json({
      ok: false,
      reqId,
      totalMs: Date.now() - t0,
      error: message,
    }, { status: 500 });
  }
}
