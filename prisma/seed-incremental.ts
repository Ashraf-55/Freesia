/**
 * Freesia — incremental (non-destructive) catalog update
 * -------------------------------------------------------
 * Unlike prisma/seed.ts (which WIPES and rebuilds the whole catalog —
 * never run that against a live store), this script only ADDS what's
 * missing, driven by prisma/new-arrivals-2026-09.json:
 *   - 2 new categories: بلورات (Crystal Domes), علب تقديم (Presentation Boxes)
 *   - 38 new products (16 mugs top-up + 14 crystal domes + 8 presentation boxes)
 *
 * Safe to re-run any number of times: every category/product is looked
 * up by its slug first, and skipped if it already exists. Nothing is
 * ever deleted or overwritten here.
 *
 * IMPORTANT: none of these 38 products had a real price supplied by
 * the client — only photos. They're created with `status: "draft"`
 * and a placeholder price so they never show up for sale by mistake.
 * Go to Admin → Products, open each one, set the real "today price"
 * range, then switch status to Active.
 *
 * Usage:  npx tsx prisma/seed-incremental.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type NewArrivalsData = {
  categories: { slug: string; nameEn: string; nameAr: string; description: string; sortOrder: number }[];
  products: {
    slug: string;
    categorySlug: string;
    name: string;
    nameEn: string | null;
    description: string;
    price: number;
    image: string;
    status: "active" | "draft" | "archived";
    isFeatured: boolean;
    isBestseller: boolean;
    isNew: boolean;
    badge: string | null;
    stockQty: number;
  }[];
};

async function main() {
  const dataPath = path.join(__dirname, "new-arrivals-2026-09.json");
  const data: NewArrivalsData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  let categoriesCreated = 0;
  let categoriesSkipped = 0;
  for (const c of data.categories) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (existing) {
      categoriesSkipped++;
      continue;
    }
    await prisma.category.create({
      data: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        description: c.description,
        sortOrder: c.sortOrder,
        bannerImage: `${c.slug}/${data.products.find((p) => p.categorySlug === c.slug)?.image.split("/")[1] ?? ""}`,
      },
    });
    categoriesCreated++;
  }

  const catBySlug = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  let productsCreated = 0;
  let productsSkipped = 0;
  for (const p of data.products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      productsSkipped++;
      continue;
    }
    const categoryId = catBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`Skipping ${p.slug}: category ${p.categorySlug} not found`);
      continue;
    }
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        nameEn: p.nameEn ?? undefined,
        description: p.description,
        categoryId,
        price: p.price,
        badge: p.badge ?? undefined,
        isFeatured: p.isFeatured,
        isBestseller: p.isBestseller,
        isNew: p.isNew,
        stockQty: p.stockQty,
        status: p.status,
      },
    });
    await prisma.productImage.create({
      data: { productId: product.id, filename: p.image, sortOrder: 0 },
    });
    productsCreated++;
  }

  console.log(`Categories: ${categoriesCreated} created, ${categoriesSkipped} already existed.`);
  console.log(`Products:   ${productsCreated} created, ${productsSkipped} already existed.`);
  if (productsCreated > 0) {
    console.log(`\n${productsCreated} new products were created as DRAFT with placeholder prices.`);
    console.log("Review real pricing in Admin → Products before switching them to Active.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
