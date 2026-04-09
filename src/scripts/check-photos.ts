import { db } from "~/server/db";

const count = await db.photo.count();
const sample = await db.photo.findFirst();
console.log("Total photos:", count);
console.log("Sample storageKey:", sample?.storageKey);
await db.$disconnect();
