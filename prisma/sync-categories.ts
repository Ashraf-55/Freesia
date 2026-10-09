/**
 * Freesia — non-destructive category sync
 * ----------------------------------------
 * Makes the `categories` table match prisma/categories-snapshot.json
 * WITHOUT touching products, images, carts, orders or users:
 *   - a category whose slug doesn't exist yet is created (this is how
 *     "شنط هدايا" / gift-bags gets added to an existing database)
 *   - a category that already exists only gets its sort_order updated
 *     (names, descriptions and banner images are never overwritten)
 *
 * Safe to re-run any number of times. Unlike prisma/seed.ts it never
 * wipes anything, so it is fine to run against a live store.
 *
 * Usage:  npx tsx prisma/sync-categories.ts
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

type CategorySnapshot = {
  slug: string;
  name_en: string;
  name_ar: string;
  description: string | null;
  banner_image: string | null;
  sort_order: number;
};

async function main() {
  const snapshot: CategorySnapshot[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "categories-snapshot.json"), "utf-8")
  );

  let created = 0;
  let reordered = 0;
  for (const c of snapshot) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (!existing) {
      await prisma.category.create({
        data: {
          slug: c.slug,
          nameEn: c.name_en,
          nameAr: c.name_ar,
          description: c.description,
          bannerImage: c.banner_image,
          sortOrder: c.sort_order,
        },
      });
      created++;
    } else if (existing.sortOrder !== c.sort_order) {
      await prisma.category.update({ where: { slug: c.slug }, data: { sortOrder: c.sort_order } });
      reordered++;
    }
  }

  console.log(`Categories: ${created} created, ${reordered} re-ordered, ${snapshot.length - created - reordered} unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
