/**
 * Freesia — Cart Service
 * ----------------------
 * Shared logic used by /api/cart, /api/cart/merge, /api/checkout, and the
 * login/register flows, so ownership rules and merge behavior live in
 * exactly one place instead of being re-implemented per route.
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId, getSessionId } from "@/lib/session";
import { getStorefrontAvailableQuantity } from "@/lib/inventory";

/**
 * Resolves who the current cart belongs to. Always returns a sessionId
 * (creating the guest cookie if missing) even for logged-in users, since
 * some callers still need it for the pre-login → post-login merge window.
 */
export async function cartScope() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const sessionId = userId ? ((await getSessionId()) ?? (await getOrCreateSessionId())) : await getOrCreateSessionId();
  return { userId, sessionId };
}

/** True if the given cart row belongs to the current user/session. */
export function ownsCartItem(
  item: { userId: string | null; sessionId: string },
  scope: { userId: string | null; sessionId: string }
) {
  if (scope.userId) return item.userId === scope.userId;
  return item.userId === null && item.sessionId === scope.sessionId;
}

/**
 * Merges a guest cart (identified by its session cookie) into the now
 * signed-in user's cart. Called right after login/register succeeds.
 * Safe to call with no guest items (no-op) and safe to call twice
 * (second call just finds nothing left to merge).
 *
 * Rules (spec §19-20):
 *  - same product in both carts → quantities are summed
 *  - never exceeds real available stock — clamped, never silently lost
 *  - nothing is ever deleted without being accounted for in the merge
 */
export async function mergeGuestCartIntoUser(guestSessionId: string | null, userId: string) {
  if (!guestSessionId) return;

  const guestItems = await prisma.cartItem.findMany({
    where: { sessionId: guestSessionId, userId: null },
  });
  if (guestItems.length === 0) return;

  const userItems = await prisma.cartItem.findMany({ where: { userId } });
  const userItemByProduct = new Map(userItems.map((i) => [i.productId, i]));

  await prisma.$transaction(async (tx) => {
    for (const guestItem of guestItems) {
      const available = await getStorefrontAvailableQuantity(guestItem.productId, tx);
      const existing = userItemByProduct.get(guestItem.productId);

      if (existing) {
        const combined = existing.qty + guestItem.qty;
        const cappedQty = Math.min(combined, available);
        if (cappedQty <= 0) {
          await tx.cartItem.delete({ where: { id: existing.id } });
        } else {
          await tx.cartItem.update({ where: { id: existing.id }, data: { qty: cappedQty } });
        }
        await tx.cartItem.delete({ where: { id: guestItem.id } });
      } else {
        const cappedQty = Math.min(guestItem.qty, available);
        if (cappedQty <= 0) {
          await tx.cartItem.delete({ where: { id: guestItem.id } });
        } else {
          await tx.cartItem.update({
            where: { id: guestItem.id },
            data: { userId, qty: cappedQty },
          });
        }
      }
    }
  });
}
