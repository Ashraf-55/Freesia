import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getSessionId } from "@/lib/session";
import { DELIVERY_FEE } from "@/lib/constants";
import { InsufficientStockError, getOnlineFulfillmentWarehouseId, recordMovement } from "@/lib/inventory";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().min(5),
  notes: z.string().optional(),
});

/**
 * Checkout — spec §23-24.
 * Never trusts price/stock coming from the client. Re-reads the cart and
 * products from the database, re-computes totals, re-checks real stock,
 * and — if the admin has configured an Online Fulfillment Location —
 * deducts it there through `recordMovement` (so it's audited exactly
 * like a POS sale or a transfer). Everything happens inside one DB
 * transaction: either the whole order + stock deduction succeeds, or
 * nothing is written and the cart is left untouched.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "من فضلك أكمل جميع بيانات التوصيل." }, { status: 400 });
  }

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const sessionId = await getSessionId();

    const cartItems = await prisma.cartItem.findMany({
      where: userId ? { userId } : { sessionId: sessionId ?? "__none__", userId: null },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "السلة فاضية." }, { status: 400 });
    }

    // Re-read every product fresh — never trust anything the client sent
    // about price or availability.
    const freshProducts = await prisma.product.findMany({
      where: { id: { in: cartItems.map((i) => i.productId) } },
    });
    const productById = new Map(freshProducts.map((p) => [p.id, p]));

    for (const item of cartItems) {
      const product = productById.get(item.productId);
      if (!product || product.status !== "active") {
        return NextResponse.json(
          { error: `المنتج "${item.product.name}" لم يعد متاحًا، من فضلك حدّث السلة.` },
          { status: 409 }
        );
      }
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const product = productById.get(item.productId)!;
      return sum + Number(product.discountPrice ?? product.price) * item.qty;
    }, 0);
    const total = subtotal + DELIVERY_FEE;
    const { name, email, phone, address, notes } = parsed.data;

    const fulfillmentWarehouseId = await getOnlineFulfillmentWarehouseId();

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: userId ?? undefined,
          customerName: name,
          email,
          phone,
          address,
          notes,
          subtotal,
          deliveryFee: DELIVERY_FEE,
          total,
          status: "pending",
          items: {
            create: cartItems.map((item) => {
              const product = productById.get(item.productId)!;
              return {
                productId: item.productId,
                nameSnapshot: product.name,
                priceSnapshot: product.discountPrice ?? product.price,
                qty: item.qty,
              };
            }),
          },
        },
      });

      // Real stock check + deduction happens here, inside the same
      // transaction as order creation, so two simultaneous checkouts for
      // the last unit cannot both succeed (spec §24 — no overselling).
      // If any line is short, `recordMovement` throws and the whole
      // transaction — order included — rolls back.
      if (fulfillmentWarehouseId) {
        for (const item of cartItems) {
          await recordMovement(tx, {
            productId: item.productId,
            warehouseId: fulfillmentWarehouseId,
            quantityChange: -item.qty,
            movementType: "online_sale",
            referenceId: createdOrder.id,
            userId,
            notes: `Online order #${createdOrder.id}`,
          });
        }
      } else {
        // No fulfillment warehouse configured yet — fall back to the
        // legacy single-number stock, but still enforce it strictly and
        // atomically instead of trusting the client.
        for (const item of cartItems) {
          const product = productById.get(item.productId)!;
          if (item.qty > product.stockQty) {
            throw new InsufficientStockError(item.productId, "legacy", item.qty, product.stockQty);
          }
        }
        for (const item of cartItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { decrement: item.qty } },
          });
        }
      }

      if (userId) {
        await tx.cartItem.deleteMany({ where: { userId } });
      } else {
        await tx.cartItem.deleteMany({ where: { sessionId: sessionId ?? "__none__", userId: null } });
      }

      return createdOrder;
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "الكمية المطلوبة من أحد المنتجات لم تعد متاحة بالكامل، من فضلك حدّث السلة." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "تعذر إتمام الطلب، حاول مرة أخرى." }, { status: 500 });
  }
}
