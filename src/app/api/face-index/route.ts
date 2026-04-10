import { type NextRequest, NextResponse } from "next/server";
import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
} from "@aws-sdk/client-rekognition";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

/**
 * POST /api/face-index  { photoId, collectionId }
 *
 * Downloads the photo from Supabase and indexes all faces in it
 * into a Rekognition collection named "foto-{collectionId}".
 * ExternalImageId = photoId so SearchFacesByImage returns photoIds directly.
 */

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function rekognitionCollectionId(collectionId: string) {
  // Rekognition collection IDs: alphanumeric, underscore, hyphen, dot (max 255)
  return `foto-${collectionId.replace(/[^a-zA-Z0-9_.\-]/g, "-")}`;
}

async function ensureCollection(collId: string) {
  try {
    await rekognition.send(new CreateCollectionCommand({ CollectionId: collId }));
  } catch (err: unknown) {
    // ResourceAlreadyExistsException is fine — collection already created
    if ((err as { name?: string }).name !== "ResourceAlreadyExistsException") throw err;
  }
}

export async function POST(req: NextRequest) {
  const { photoId, collectionId } = (await req.json()) as {
    photoId?: string;
    collectionId?: string;
  };

  if (!photoId || !collectionId) {
    return NextResponse.json({ error: "photoId and collectionId required" }, { status: 400 });
  }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client not available" }, { status: 500 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("photos")
    .download(photo.storageKey);

  if (downloadError || !fileData) {
    console.error("Supabase download error:", downloadError);
    return NextResponse.json({ error: "Failed to download photo" }, { status: 500 });
  }

  const imageBytes = new Uint8Array(await fileData.arrayBuffer());
  const rekCollectionId = rekognitionCollectionId(collectionId);

  try {
    await ensureCollection(rekCollectionId);

    const result = await rekognition.send(new IndexFacesCommand({
      CollectionId: rekCollectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: photoId,
      DetectionAttributes: [],
      MaxFaces: 10, // index up to 10 faces per photo
    }));

    const faceCount = result.FaceRecords?.length ?? 0;
    console.log(`[face-index] photoId=${photoId} indexed ${faceCount} faces`);
    return NextResponse.json({ indexed: true, faceCount });
  } catch (err) {
    console.error("[face-index] error:", err);
    return NextResponse.json({ error: "IndexFaces failed", detail: String(err) }, { status: 500 });
  }
}
