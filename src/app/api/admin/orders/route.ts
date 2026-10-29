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

  // ---- Status transitions (inventory safety) -------------------------
  // `cancelled` and `delivered` are terminal:
  //   * cancelled -> anything else would let the order be re-confirmed
  //     after its stock was already given back, and cancelled again
  //     (a second restore of the same sale).
  //   * delivered -> cancelled/other would hand stock back for goods the
  //     customer already received. A real after-delivery return is NOT a
  //     cancellation and needs its own return flow.
  // Setting the same status again is a harmless no-op.
  const target = parsed.data.status;
  if (target === order.status) return NextResponse.json({ ok: true, unchanged: true });
  if (order.status === "cancelled") {
    return NextResponse.json(
      { error: "الطلب ملغي بالفعل وتم إرجاع مخزونه، لا يمكن تغيير حالته. أنشئ طلبًا جديدًا إذا لزم." },
      { status: 409 }
    );
  }
  if (order.status === "delivered") {
    return NextResponse.json(
      { error: "الطلب تم تسليمه ولا يمكن إلغاؤه أو تغيير حالته. إرجاع طلب مُسلَّم يتم كمرتجع وليس كإلغاء." },
      { status: 409 }
    );
  }

  try {
    if (target === "cancelled") {
      // Cancelling must give the stock back exactly once — to the real
      // warehouse it was taken from if one was used, otherwise to the
      // legacy stockQty.
      const outcome = await prisma.$transaction(async (tx) => {
        // Atomic compare-and-set on the status we just validated: if a
        // concurrent request already cancelled/delivered this order,
        // count is 0 and we neither update nor restore anything.
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: { notIn: ["cancelled", "delivered"] } },
          data: { status: "cancelled" },
        });
        if (claimed.count === 0) return "conflict" as const;

        const [saleMovements, restoreMovements] = await Promise.all([
          tx.inventoryMovement.findMany({ where: { referenceId: order.id, movementType: "online_sale" } }),
          tx.inventoryMovement.findMany({ where: { referenceId: order.id, movementType: "cancelled_order_restore" } }),
        ]);

        if (saleMovements.length > 0) {
          // Idempotent: restore each sale line at most once, even if a
          // restore movement already exists for it.
          const restoredKeys = new Set(restoreMovements.map((m) => `${m.productId}:${m.warehouseId}`));
          for (const m of saleMovements) {
            if (restoredKeys.has(`${m.productId}:${m.warehouseId}`)) continue;
            await recordMovement(tx, {
              productId: m.productId,
              warehouseId: m.warehouseId,
              quantityChange: -m.quantityChange, // negative on sale, so this is positive
              movementType: "cancelled_order_restore",
              referenceId: order.id,
              userId: user.id,
              notes: `Restore for cancelled order #${order.id}`,
            });
          }
        } else if (restoreMovements.length === 0) {
          // Legacy order (no warehouse movement): stock was taken from
          // Product.stockQty at checkout. Reaching this branch happens
          // at most once because `cancelled` is terminal (see above).
          for (const item of order.items) {
            if (!item.productId) continue;
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQty: { increment: item.qty } },
            });
          }
        }
        return "cancelled" as const;
      });

      if (outcome === "conflict") {
        return NextResponse.json({ error: "تغيّرت حالة الطلب أثناء التنفيذ، حدّث الصفحة وحاول مرة أخرى." }, { status: 409 });
      }
    } else {
      // Non-cancel transition: guarded so it can never overwrite a
      // concurrent cancel/deliver.
      const res = await prisma.order.updateMany({
        where: { id: order.id, status: { notIn: ["cancelled", "delivered"] } },
        data: { status: target },
      });
      if (res.count === 0) {
        return NextResponse.json({ error: "تغيّرت حالة الطلب أثناء التنفيذ، حدّث الصفحة وحاول مرة أخرى." }, { status: 409 });
      }
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

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  // Stock is deducted when an order is placed. Deleting an order whose
  // stock is still "spent" would make that stock vanish with no audit
  // trail. So only a CANCELLED order (whose stock was already restored
  // through the cancel flow) can be deleted. Pending/confirmed orders must
  // be cancelled first; delivered orders are real sales and are kept.
  // InventoryMovement rows are never touched — they keep referencing the
  // order id as the audit trail.
  if (order.status !== "cancelled") {
    const [sales, restores] = await Promise.all([
      prisma.inventoryMovement.count({ where: { referenceId: id, movementType: "online_sale" } }),
      prisma.inventoryMovement.count({ where: { referenceId: id, movementType: "cancelled_order_restore" } }),
    ]);
    const message =
      order.status === "delivered"
        ? "لا يمكن حذف طلب تم تسليمه لأن مخزونه خُصم كبيع فعلي. احتفظ به كسجل مبيعات."
        : sales > restores
          ? "لا يمكن حذف طلب تم خصم مخزونه. ألغِ الطلب أولًا ليُرجَع المخزون بسجل واضح ثم احذفه."
          : "لا يمكن حذف هذا الطلب قبل إلغائه، فقد تم خصم مخزونه عند إنشائه. ألغِ الطلب أولًا ثم احذفه.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  try {
    await prisma.order.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "تعذر حذف الطلب، حاول مرة أخرى." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
