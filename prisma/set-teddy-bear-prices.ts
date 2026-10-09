/**
 * Freesia — sets the teddy-bear prices (200–400 ج.م) on an EXISTING database.
 * Safe & re-runnable: it only touches the 15 teddy-bears-3…17 products and ONLY
 * while their price is still 0 — a price you already set by hand is never changed.
 *
 * Usage:  npx tsx prisma/set-teddy-bear-prices.ts
 */
import { prisma } from "../src/lib/prisma";

const PRICES: Record<number, number> = {
  3: 250, 4: 250, 5: 400, 6: 300, 7: 350, 8: 350, 9: 200, 10: 250,
  11: 250, 12: 350, 13: 250, 14: 300, 15: 300, 16: 300, 17: 400,
};

async function main() {
  let updated = 0;
  for (const [n, price] of Object.entries(PRICES)) {
    const res = await prisma.product.updateMany({
      where: { slug: `teddy-bears-${n}`, price: 0 },
      data: { price },
    });
    updated += res.count;
  }
  console.log(`Teddy bears: ${updated} prices set (${15 - updated} already had a price).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
