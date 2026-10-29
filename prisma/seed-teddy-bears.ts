/**
 * Freesia — adds the new teddy-bear / plush photos (دباديب).
 * ----------------------------------------------------------
 * Non-destructive and safe to re-run: a product whose slug already exists
 * is skipped, nothing existing is changed or deleted.
 *
 * Each product has a fixed price (200–400 ج.م) in the PRODUCTS list below, so
 * it is sold through the normal cart ("+ إضافة سريعة") like every other product.
 * (A product whose price is 0 would instead show «السعر عند التواصل».) Change a
 * price any time from Admin → Products.
 *
 * Usage:  npx tsx prisma/seed-teddy-bears.ts
 */
import { prisma } from "../src/lib/prisma";

// Each entry = one product; `images` are file numbers (teddy_bears_NN.jpg),
// the first one is the main photo shown on the card.
const PRODUCTS: { slug: string; name: string; price: number; images: number[] }[] = [
  { slug: "teddy-bears-3", name: "دمية محشوة زرقاء واقفة", price: 250, images: [3] },
  { slug: "teddy-bears-4", name: "دمية فيل رمادي محشوة", price: 250, images: [4] },
  { slug: "teddy-bears-5", name: "دبدوب وردي كبير", price: 400, images: [5, 6] },
  { slug: "teddy-bears-6", name: "دمية زرقاء بعروسة خضراء", price: 300, images: [7, 8, 9] },
  { slug: "teddy-bears-7", name: "دبدوب تخرج بني", price: 350, images: [10] },
  { slug: "teddy-bears-8", name: "دبدوب تخرج أبيض", price: 350, images: [11] },
  { slug: "teddy-bears-9", name: "دميتان صغيرتان بنفسجي وأزرق", price: 200, images: [12] },
  { slug: "teddy-bears-10", name: "دمية راكون بالبلوط", price: 250, images: [13] },
  { slug: "teddy-bears-11", name: "دمية بنفسجية محشوة", price: 250, images: [14] },
  { slug: "teddy-bears-12", name: "دمية ثعلب تخرج", price: 350, images: [15] },
  { slug: "teddy-bears-13", name: "دمية زرقاء فاتحة", price: 250, images: [16] },
  { slug: "teddy-bears-14", name: "حقيبة جزرة بأرنب", price: 300, images: [21, 17, 22] },
  { slug: "teddy-bears-15", name: "دمية ثعلب بعيون كبيرة", price: 300, images: [18] },
  { slug: "teddy-bears-16", name: "دبدوب وردي بني", price: 300, images: [19] },
  { slug: "teddy-bears-17", name: "دبدوب تخرج بني بوشاح أخضر", price: 400, images: [20] },
];

async function main() {
  const category = await prisma.category.findUnique({ where: { slug: "teddy-bears" } });
  if (!category) throw new Error("Category teddy-bears not found");

  let created = 0;
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) continue;
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        categoryId: category.id,
        price: p.price,
        stockQty: 10,
        status: "active",
        images: {
          create: p.images.map((n, i) => ({
            filename: `teddy-bears/teddy_bears_${String(n).padStart(2, "0")}.jpg`,
            sortOrder: i,
          })),
        },
      },
    });
    created++;
  }
  console.log(`Teddy bears: ${created} created, ${PRODUCTS.length - created} already existed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
