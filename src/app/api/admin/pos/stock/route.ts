import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Products + real stock at one warehouse, for the POS product grid.
 * An employee can only ever see stock for a warehouse that belongs to
 * their own assigned branch (spec §12 — "يبيع من مخزون الفرع الخاص به
 * فقط"). Admins can query any warehouse.
 */
export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  if (!hasPermission(user.role, user.permissions, "pos.access")) {
    return NextResponse.json({ error: "ليس لديك صلاحية الدخول لنقطة البيع." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  if (!warehouseId) return NextResponse.json({ error: "warehouseId مطلوب." }, { status: 400 });

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse || warehouse.status !== "active") {
    return NextResponse.json({ error: "المخزن غير موجود أو معطل." }, { status: 404 });
  }

  if (user.role === "employee" && (!user.branchId || warehouse.branchId !== user.branchId)) {
    return NextResponse.json({ error: "لا يمكنك البيع من مخزن خارج فرعك." }, { status: 403 });
  }

  const [products, inventoryRows] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active" },
      select: { id: true, name: true, nameEn: true, price: true, discountPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventory.findMany({ where: { warehouseId } }),
  ]);
  const qtyByProduct = new Map(inventoryRows.map((r) => [r.productId, r.availableQuantity]));

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      price: p.price,
      discountPrice: p.discountPrice,
      available: qtyByProduct.get(p.id) ?? 0,
    })),
  });
}
