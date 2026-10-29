/**
 * Freesia — non-destructive sync of the code catalog into the database
 * ---------------------------------------------------------------------
 * Source of truth for the product list: src/lib/static-catalog.ts.
 * This script makes the dashboard (Products / Categories / Inventory / POS /
 * Reports) see those products:
 *   - creates the categories that don't exist yet (بوكيهات فلوس, ميني بوكيه)
 *   - sets a banner on a category only if it has none (gift-bags)
 *   - creates every product whose slug is missing, with its image
 *   - NEVER overwrites a product/category that already exists, so edits made
 *     later from the dashboard (name, price, stock, status, images) are kept
 *   - NEVER deletes anything, never touches users / carts / orders
 *   - products without a fixed price (gift boxes, money bouquets) are stored
 *     with price 0 = "price on request" (the storefront's existing convention)
 *
 * Safe to re-run any number of times.
 * Usage:  npm run db:sync-static
 */
import { prisma } from "../src/lib/prisma";
import { STATIC_CATEGORIES, STATIC_PRODUCTS, getStaticBanner } from "../src/lib/static-catalog";

async function main() {
  let catCreated = 0;
  for (const c of STATIC_CATEGORIES) {
    const exists = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (!exists) {
      await prisma.category.create({
        data: {
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          description: c.description,
          bannerImage: c.bannerImage,
          sortOrder: c.sortOrder,
        },
      });
      catCreated++;
    }
  }

  // Categories that exist in the DB but have no banner (gift-bags): give them one.
  const bare = await prisma.category.findMany({ where: { bannerImage: null } });
  let bannersSet = 0;
  for (const c of bare) {
    const banner = getStaticBanner(c.slug);
    if (banner) {
      await prisma.category.update({ where: { id: c.id }, data: { bannerImage: banner } });
      bannersSet++;
    }
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;
  const missingCategory: string[] = [];
  for (const p of STATIC_PRODUCTS) {
    const categoryId = catIdBySlug.get(p.categorySlug);
    if (!categoryId) {
      missingCategory.push(`${p.slug} (${p.categorySlug})`);
      continue;
    }
    const exists = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        nameEn: p.nameEn,
        categoryId,
        price: p.price ?? 0,
        startingPrice: p.startingPrice,
        status: "active",
        images: { create: [{ filename: p.image, sortOrder: 0 }] },
      },
    });
    created++;
  }

  console.log(`Categories created: ${catCreated}, banners set: ${bannersSet}`);
  console.log(`Products created: ${created}, already existed (left untouched): ${skipped}`);
  if (missingCategory.length) console.log("Skipped (category missing in DB):", missingCategory.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
