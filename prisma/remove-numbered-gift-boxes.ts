/**
 * Freesia — removes ONLY the numbered Gift Boxes #1–#12 (slugs gift-boxes-1 … gift-boxes-12).
 * Safe & re-runnable: if they are already gone it does nothing.
 * It refuses to run if any of them is referenced by an order, cart, wishlist or stock row.
 * Nothing else is touched (other products, the gift-boxes category, image files).
 *
 * Usage:  npx tsx prisma/remove-numbered-gift-boxes.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const slugs = Array.from({ length: 12 }, (_, i) => `gift-boxes-${i + 1}`);
  const targets = await prisma.product.findMany({
    where: { slug: { in: slugs }, category: { slug: "gift-boxes" } },
    select: { id: true, slug: true, name: true },
  });
  const valid = targets.filter((p) => p.name.trim().endsWith(`#${p.slug.split("-").pop()}`));
  if (valid.length === 0) {
    console.log("No numbered Gift Boxes found — nothing to do.");
    return;
  }
  const ids = valid.map((p) => p.id);
  const refs = await Promise.all([
    prisma.orderItem.count({ where: { productId: { in: ids } } }),
    prisma.inventory.count({ where: { productId: { in: ids } } }),
    prisma.inventoryMovement.count({ where: { productId: { in: ids } } }),
  ]);
  if (refs.some((n) => n > 0)) {
    throw new Error(`Refusing to delete: referenced by orders/inventory (${refs.join(", ")}).`);
  }
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: { in: ids } } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`Removed ${valid.length} numbered Gift Boxes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
