/**
 * Replaces seeded placeholder photos with real picsum.photos URLs.
 * Run: npx dotenv-cli -e .env -- npx tsx src/scripts/seed-photos.ts
 */
import { db } from "~/server/db";

const PHOTO_SIZES = [
  { w: 1200, h: 800 },
  { w: 800, h: 1200 },
  { w: 1200, h: 900 },
];

async function main() {
  const collection = await db.collection.findUnique({
    where: { slug: "maraton-rosario-2024" },
    include: { folders: true },
  });

  if (!collection) {
    console.error("Collection 'maraton-rosario-2024' not found. Run seed-demo first.");
    process.exit(1);
  }

  let totalPhotos = 0;

  for (const folder of collection.folders) {
    // Delete existing photos
    await db.photo.deleteMany({ where: { folderId: folder.id } });

    // Seed 10 photos per folder with real picsum URLs
    const photoCount = 10;
    const seed = parseInt(folder.number, 10);

    for (let j = 0; j < photoCount; j++) {
      const size = PHOTO_SIZES[j % PHOTO_SIZES.length]!;
      // Deterministic seed per folder+photo so URLs are stable
      const picsumSeed = seed * 100 + j;
      const url = `https://picsum.photos/seed/${picsumSeed}/${size.w}/${size.h}`;

      await db.photo.create({
        data: {
          folderId: folder.id,
          storageKey: url,              // direct URL — handled in getDownloadInfo/getPreview
          filename: `foto-${folder.number}-${String(j + 1).padStart(3, "0")}.jpg`,
          width: size.w,
          height: size.h,
          order: j,
        },
      });
      totalPhotos++;
    }

    console.log(`  Folder #${folder.number}: ${photoCount} photos seeded`);
  }

  console.log(`\nDone. ${totalPhotos} photos total across ${collection.folders.length} folders.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
