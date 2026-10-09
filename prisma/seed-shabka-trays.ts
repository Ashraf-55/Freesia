/**
 * Freesia — «صينية شبكة» trays (engagement-trays category)
 * --------------------------------------------------------------------------
 * Makes ALL 14 trays (engagement-trays-1 … -14) look like this:
 *   name  «صينية شبكة»   price 450 + startingPrice 450  →  «يبدأ من 450 ج.م»
 * The 450 is a real price, so they are added to the cart / bought as usual.
 * Also renames the category wording «الخطوبة» → «الشبكة» (only while the old
 * wording is still there).
 *
 * Re-runnable: trays 4–14 are created if missing (photos
 * engagement_trays_04…14.jpg); trays 1–14 get name/price/description set.
 * Stock, images, slugs, orders and every other product are never touched.
 *
 * Usage:  npx tsx prisma/seed-shabka-trays.ts
 */
import { prisma } from "../src/lib/prisma";

const LAST = 14;
const PRICE = 450;
const DESCRIPTION = "سعر الصينية يبدأ من 450 ج.م ويختلف حسب الشكل.";

async function main() {
  const category = await prisma.category.findUnique({ where: { slug: "engagement-trays" } });
  if (!category) throw new Error("Category engagement-trays not found");

  if (category.nameAr.includes("الخطوبة")) {
    await prisma.category.update({
      where: { id: category.id },
      data: { nameAr: "صواني الشبكة", description: "صواني شبكة فاخرة لتنسيقات الأفراح والمناسبات." },
    });
  }

  let created = 0;
  let updated = 0;
  for (let n = 1; n <= LAST; n++) {
    const slug = `engagement-trays-${n}`;
    const existing = await prisma.product.findUnique({ where: { slug } });
    const fields = { name: "صينية شبكة", description: DESCRIPTION, price: PRICE, startingPrice: PRICE };
    if (existing) {
      await prisma.product.update({ where: { slug }, data: fields });
      updated++;
    } else if (n >= 4) {
      await prisma.product.create({
        data: {
          slug,
          ...fields,
          categoryId: category.id,
          stockQty: 10,
          status: "active",
          images: {
            create: [{ filename: `engagement-trays/engagement_trays_${String(n).padStart(2, "0")}.jpg`, sortOrder: 0 }],
          },
        },
      });
      created++;
    }
  }
  console.log(`Shabka trays: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
