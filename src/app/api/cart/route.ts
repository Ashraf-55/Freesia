import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cartScope, ownsCartItem } from "@/lib/cart";
import { getStorefrontAvailableQuantity } from "@/lib/inventory";

/**
 * Cart API — spec §16-24.
 *  - Every write re-validates real stock server-side (never trusts the
 *    frontend's idea of what's available).
 *  - PATCH/DELETE verify the current session/user actually owns the row
 *    before touching it — an itemId alone is never enough (spec §21).
 *  - Every branch returns a clear JSON error instead of ever leaving the
 *    request to fail silently or throw a raw 500 with no body.
 */

export async function GET() {
  try {
    const { userId, sessionId } = await cartScope();
    const items = await prisma.cartItem.findMany({
      where: userId ? { userId } : { sessionId, userId: null },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل السلة، حاول مرة أخرى." }, { status: 500 });
  }
}

const addSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).default(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const { productId, qty } = parsed.data;

  try {
    const { userId, sessionId } = await cartScope();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "active") {
      return NextResponse.json({ error: "المنتج غير متاح." }, { status: 404 });
    }

    const existing = await prisma.cartItem.findFirst({
      where: userId ? { userId, productId } : { sessionId, userId: null, productId },
    });

    const requestedQty = (existing?.qty ?? 0) + qty;
    const available = await getStorefrontAvailableQuantity(productId);
    if (requestedQty > available) {
      return NextResponse.json(
        {
          error:
            available > 0
              ? `الكمية المتاحة من هذا المنتج ${available} فقط.`
              : "هذا المنتج غير متوفر في المخزون حاليًا.",
          available,
        },
        { status: 409 }
      );
    }

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: requestedQty } });
    } else {
      await prisma.cartItem.create({
        data: { sessionId, userId: userId ?? undefined, productId, qty },
      });
    }

    const items = await prisma.cartItem.findMany({
      where: userId ? { userId } : { sessionId, userId: null },
    });
    return NextResponse.json({ ok: true, cartCount: items.reduce((n, i) => n + i.qty, 0) });
  } catch {
    return NextResponse.json({ error: "تعذر إضافة المنتج للسلة، حاول مرة أخرى." }, { status: 500 });
  }
}

const updateSchema = z.object({
  itemId: z.string(),
  qty: z.number().int().min(0),
});

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const { itemId, qty } = parsed.data;

  try {
    const scope = await cartScope();
    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || !ownsCartItem(item, scope)) {
      // Ownership check (spec §21): never let a caller mutate a cart row
      // just because they know its id.
      return NextResponse.json({ error: "هذا العنصر غير موجود في سلتك." }, { status: 404 });
    }

    if (qty === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return NextResponse.json({ ok: true });
    }

    const available = await getStorefrontAvailableQuantity(item.productId);
    if (qty > available) {
      return NextResponse.json(
        {
          error:
            available > 0
              ? `الكمية المتاحة من هذا المنتج ${available} فقط.`
              : "هذا المنتج غير متوفر في المخزون حاليًا.",
          available,
        },
        { status: 409 }
      );
    }

    await prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذر تحديث السلة، حاول مرة أخرى." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId مطلوب." }, { status: 400 });

  try {
    const scope = await cartScope();
    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || !ownsCartItem(item, scope)) {
      return NextResponse.json({ error: "هذا العنصر غير موجود في سلتك." }, { status: 404 });
    }
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذر حذف المنتج من السلة، حاول مرة أخرى." }, { status: 500 });
  }
}
