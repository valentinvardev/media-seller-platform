import { db } from "~/server/db";

async function main() {
  // Create demo collection
  const collection = await db.collection.upsert({
    where: { slug: "maraton-rosario-2024" },
    update: {},
    create: {
      title: "Maratón Rosario 2024",
      description: "Fotos oficiales de la 42ª edición del Maratón Internacional de Rosario. Encontrá tu carpeta por número de dorsal.",
      slug: "maraton-rosario-2024",
      isPublished: true,
    },
  });

  console.log(`Collection: ${collection.title}`);

  // Create demo folders with placeholder photos
  const dorsales = ["42", "107", "256", "1001", "333", "88", "512", "77", "999", "204"];
  const prices = [3500, 3500, 4000, 3500, 4000, 3500, 3500, 4000, 3500, 4000];

  for (let i = 0; i < dorsales.length; i++) {
    const number = dorsales[i]!;
    const price = prices[i]!;

    const folder = await db.folder.upsert({
      where: { collectionId_number: { collectionId: collection.id, number } },
      update: {},
      create: {
        collectionId: collection.id,
        number,
        price,
        isPublished: true,
      },
    });

    // Add placeholder photos (using public placeholder image service)
    const existingPhotos = await db.photo.count({ where: { folderId: folder.id } });
    if (existingPhotos === 0) {
      const photoCount = 8 + Math.floor(Math.random() * 8);
      for (let j = 0; j < photoCount; j++) {
        await db.photo.create({
          data: {
            folderId: folder.id,
            storageKey: `demo/${collection.id}/${folder.id}/photo-${j + 1}.jpg`,
            filename: `foto-${number}-${String(j + 1).padStart(3, "0")}.jpg`,
            width: 1920,
            height: 1280,
            order: j,
          },
        });
      }
      console.log(`  Folder #${number}: ${photoCount} photos`);
    } else {
      console.log(`  Folder #${number}: already has photos, skipped`);
    }
  }

  console.log("\nDemo data seeded successfully!");
  console.log("Visit: http://localhost:3000/colecciones/maraton-rosario-2024");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
