import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { executeStockTransfer } from "@/lib/inventory";

const schema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  if (!hasPermission(user.role, user.permissions, "inventory.transfer")) {
    return NextResponse.json({ error: "ليس لديك صلاحية تحويل المخزون." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { fromWarehouseId, toWarehouseId, items, notes } = parsed.data;

  const [fromWarehouse, toWarehouse] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
  ]);
  if (!fromWarehouse || !toWarehouse) {
    return NextResponse.json({ error: "أحد المخازن غير موجود." }, { status: 404 });
  }

  // An employee (if ever granted inventory.transfer) can only move stock
  // out of their own branch's warehouse — never an arbitrary one.
  if (user.role === "employee" && fromWarehouse.branchId !== user.branchId) {
    return NextResponse.json({ error: "لا يمكنك التحويل من مخزن خارج فرعك." }, { status: 403 });
  }

  try {
    const transfer = await executeStockTransfer({
      fromWarehouseId,
      toWarehouseId,
      items,
      branchId: fromWarehouse.branchId ?? toWarehouse.branchId ?? null,
      createdById: user.id,
      notes,
    });
    return NextResponse.json({ id: transfer.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر إتمام التحويل، حاول مرة أخرى.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
