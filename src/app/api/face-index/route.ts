import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runFaceIndex } from "~/lib/photo-processing";

/**
 * POST /api/face-index  { photoId, collectionId }
 *
 * Admin-facing endpoint. Uses shared runFaceIndex() logic.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, collectionId } = (await req.json()) as {
    photoId?: string;
    collectionId?: string;
  };
  if (!photoId || !collectionId) {
    return NextResponse.json({ error: "photoId and collectionId required" }, { status: 400 });
  }

  await runFaceIndex(photoId, collectionId);
  return NextResponse.json({ indexed: true });
}
