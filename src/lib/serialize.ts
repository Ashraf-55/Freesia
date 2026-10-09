import type { Prisma } from "@prisma/client";

type Decimalish = Prisma.Decimal | number;

type PriceFields = {
  price: Decimalish;
  startingPrice: Decimalish | null;
};

/**
 * Prisma's Decimal type can't be passed from Server Components to Client
 * Components (it's a class instance, not a plain object). Use this on any
 * product (or array of products) fetched via Prisma before passing it down
 * to a "use client" component such as ProductCard.
 */
export function serializeProduct<T extends PriceFields>(
  product: T
): Omit<T, keyof PriceFields> & {
  price: number;
  startingPrice: number | null;
} {
  return {
    ...product,
    price: Number(product.price),
    startingPrice: product.startingPrice !== null ? Number(product.startingPrice) : null,
  };
}

export function serializeProducts<T extends PriceFields>(products: T[]) {
  return products.map(serializeProduct);
}
