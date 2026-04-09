import { NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * POST /api/face-search
 * Body: { imageBase64: string, collectionId: string }
 *
 * Calls the Modal face-recognition endpoint and returns matching folder IDs.
 * Falls back gracefully if Modal is not configured.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as { imageBase64?: string; collectionId?: string };
    const { imageBase64, collectionId } = body;

    if (!imageBase64 || !collectionId) {
      return NextResponse.json({ error: "Missing imageBase64 or collectionId" }, { status: 400 });
    }

    // Verify collection exists
    const collection = await db.collection.findFirst({
      where: { id: collectionId, isPublished: true },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Call Modal face-search endpoint if configured
    const modalUrl = process.env.MODAL_FACE_SEARCH_URL;
    if (!modalUrl) {
      // Feature not yet wired to Modal — return empty list gracefully
      return NextResponse.json({ folderIds: [] });
    }

    const modalRes = await fetch(modalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, collectionId }),
    });

    if (!modalRes.ok) {
      console.error("Modal face-search error", await modalRes.text());
      return NextResponse.json({ folderIds: [] });
    }

    const result = await modalRes.json() as { folderIds?: string[] };
    return NextResponse.json({ folderIds: result.folderIds ?? [] });
  } catch (err) {
    console.error("face-search route error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
