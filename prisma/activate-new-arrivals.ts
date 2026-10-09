/**
 * Freesia — activate the new-arrivals draft products
 * ----------------------------------------------------
 * The 38 products added from prisma/new-arrivals-2026-09.json (mugs
 * top-up + crystal domes + presentation boxes) were created as
 * `status: "draft"` because no real pricing was supplied — only
 * photos. That's why their category pages showed no products: the
 * storefront only ever queries `status: "active"`.
 *
 * This script does ONE thing: flips those products (and only those —
 * matched by slug, exactly the same list as new-arrivals-2026-09.json)
 * from draft to active, with their existing placeholder prices, so
 * the photos show up right away. Go fix the real names/prices for
 * each one afterwards in Admin → Products whenever you're ready —
 * nothing here forces you to do that first.
 *
 * Safe to re-run: only touches products whose slug is in the list
 * below and whose status is currently "draft". Doesn't touch price,
 * name, images, or any other product/category/order data.
 *
 * Usage:  npx tsx prisma/activate-new-arrivals.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, "new-arrivals-2026-09.json");
  const data: { products: { slug: string }[] } = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const slugs = data.products.map((p) => p.slug);

  const result = await prisma.product.updateMany({
    where: { slug: { in: slugs }, status: "draft" },
    data: { status: "active" },
  });

  console.log(`Activated ${result.count} product(s).`);
  if (result.count === 0) {
    console.log("Nothing to do — they were already active (or don't exist yet on this DB).");
  } else {
    console.log("Their photos will now show up on the crystal-domes / presentation-boxes / mugs category pages.");
    console.log("Prices and names are still placeholders — edit them in Admin → Products whenever you're ready.");
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
