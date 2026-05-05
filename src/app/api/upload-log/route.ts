import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const body = await request.json() as {
      collectionId?: string;
      filename?: string;
      fileSize?: number;
      attempt?: number;
      phase?: string;
      status?: number | string;
      detail?: string;
      finalStatus?: "done" | "error";
      errorMsg?: string;
    };
    const tag = body.finalStatus === "error" ? "[upload-error]" : "[upload-attempt]";
    console.error(
      `${tag} collection=${body.collectionId ?? "?"} file="${body.filename ?? "?"}" size=${body.fileSize ?? "?"} ` +
      `attempt=${body.attempt ?? "?"} phase=${body.phase ?? "?"} status=${body.status ?? "?"} ` +
      `${body.errorMsg ? `errorMsg="${body.errorMsg}" ` : ""}detail="${(body.detail ?? "").slice(0, 300)}"`
    );
  } catch (err) {
    console.error("[upload-log] failed to parse body:", err);
  }
  return NextResponse.json({ ok: true });
}
