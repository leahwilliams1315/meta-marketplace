import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

async function main() {
  // find all users that don't have a slug yet
  const users = await prisma.user.findMany({
    where: { slug: { equals: null } },
  });

  for (const user of users) {
    // Ideally, you might use a name or email prefix if available
    // For now, let's assume you might have a name field, otherwise use email or a generic fallback
    const base = "user";
    let initialSlug = slugify(base, { lower: true });
    // Append a part of the id to help guarantee uniqueness
    initialSlug += `-${user.id.substring(0, 5)}`;

    let slugToUse = initialSlug;
    let count = 1;
    // Check for slug uniqueness, if slug already exists, add a counter
    while (true) {
      const existingUser = await prisma.user.findUnique({
        where: { slug: slugToUse },
      });
      if (!existingUser) break;
      slugToUse = `${initialSlug}-${count}`;
      count++;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { slug: slugToUse },
    });

    console.log(`Updated user ${user.id} with slug ${slugToUse}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
