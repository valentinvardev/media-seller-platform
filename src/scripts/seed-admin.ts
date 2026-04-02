import bcrypt from "bcryptjs";
import { db } from "~/server/db";
import { env } from "~/env";

async function main() {
  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await db.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: { passwordHash: hash },
    create: {
      email: env.ADMIN_EMAIL,
      name: "Admin",
      passwordHash: hash,
    },
  });
  console.log(`Admin user seeded: ${env.ADMIN_EMAIL}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
