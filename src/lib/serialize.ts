import type { Prisma } from "@prisma/client";

/**
 * Prisma's Decimal type can't be passed from Server Components to Client
 * Components (it's a class instance, not a plain object). Use this on any
 * product (or array of products) fetched via Prisma before passing it down
 * to a "use client" component such as ProductCard.
 */
export function serializeProduct<
  T extends { price: Prisma.Decimal | number; discountPrice: Prisma.Decimal | number | null }
>(product: T): Omit<T, "price" | "discountPrice"> & { price: number; discountPrice: number | null } {
  return {
    ...product,
    price: Number(product.price),
    discountPrice: product.discountPrice !== null ? Number(product.discountPrice) : null,
  };
}

export function serializeProducts<
  T extends { price: Prisma.Decimal | number; discountPrice: Prisma.Decimal | number | null }
>(products: T[]) {
  return products.map(serializeProduct);
}
