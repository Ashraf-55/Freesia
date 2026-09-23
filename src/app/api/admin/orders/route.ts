import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { recordMovement } from "@/lib/inventory";

const statusSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  if (!hasPermission(user.role, user.permissions, "orders.update")) {
    return NextResponse.json({ error: "ليس لديك صلاحية." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: parsed.data.id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  try {
    // Cancelling for the first time must give the stock back — from the
    // real warehouse it was deducted from if one was used, or the
    // legacy stockQty otherwise. Never re-restores an already-cancelled
    // order (idempotent — only fires on the pending→cancelled edge).
    if (parsed.data.status === "cancelled" && order.status !== "cancelled") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: "cancelled" } });

        const onlineMovements = await tx.inventoryMovement.findMany({
          where: { referenceId: order.id, movementType: "online_sale" },
        });

        if (onlineMovements.length > 0) {
          for (const m of onlineMovements) {
            await recordMovement(tx, {
              productId: m.productId,
              warehouseId: m.warehouseId,
              quantityChange: -m.quantityChange, // was negative on sale, so this is positive
              movementType: "cancelled_order_restore",
              referenceId: order.id,
              userId: user.id,
              notes: `Restore for cancelled order #${order.id}`,
            });
          }
        } else {
          for (const item of order.items) {
            if (!item.productId) continue;
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQty: { increment: item.qty } },
            });
          }
        }
      });
    } else {
      await prisma.order.update({ where: { id: order.id }, data: { status: parsed.data.status } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذر تحديث حالة الطلب، حاول مرة أخرى." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  if (!hasPermission(user.role, user.permissions, "orders.delete")) {
    return NextResponse.json({ error: "ليس لديك صلاحية." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  await prisma.order.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
