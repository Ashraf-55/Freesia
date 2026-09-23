import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { recordMovement, InsufficientStockError } from "@/lib/inventory";

const schema = z.object({
  branchId: z.string(),
  warehouseId: z.string(),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1) })).min(1),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "card", "instapay", "vodafone_cash", "other"]),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Completes a POS sale — spec §11.
 * Everything (stock check + deduction, PosSale + items, invoice number)
 * happens inside one DB transaction: either the whole sale goes through
 * or nothing is written and nothing is deducted.
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  if (!hasPermission(user.role, user.permissions, "pos.sell")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إتمام عملية البيع." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const { branchId, warehouseId, items, discount, paymentMethod, customerName, customerPhone, notes } = parsed.data;

  const customerNote = [customerName, customerPhone].filter(Boolean).join(" — ");
  const combinedNotes = [customerNote, notes].filter(Boolean).join(" | ") || null;

  if (discount > 0 && !hasPermission(user.role, user.permissions, "pos.discount")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إضافة خصم." }, { status: 403 });
  }

  // An employee can only ever sell against their own branch — never
  // trust branchId/warehouseId coming from the client alone (spec §12).
  if (user.role === "employee" && user.branchId !== branchId) {
    return NextResponse.json({ error: "لا يمكنك البيع من فرع آخر." }, { status: 403 });
  }

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse || warehouse.status !== "active" || warehouse.branchId !== branchId) {
    return NextResponse.json({ error: "المخزن غير صالح لهذا الفرع." }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.status !== "active") {
    return NextResponse.json({ error: "الفرع غير موجود أو معطل." }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || product.status !== "active") {
      return NextResponse.json({ error: "أحد المنتجات لم يعد متاحًا." }, { status: 409 });
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const product = productById.get(item.productId)!;
    return sum + Number(product.discountPrice ?? product.price) * item.qty;
  }, 0);
  const total = Math.max(0, subtotal - discount);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.posSale.create({
        data: {
          branchId,
          warehouseId,
          cashierId: user.id,
          subtotal,
          discount,
          total,
          paymentMethod,
          notes: combinedNotes,
          items: {
            create: items.map((item) => {
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
        include: { items: true },
      });

      // Real stock check + deduction, atomic with the sale itself — if
      // any line is short, the whole sale (and the invoice) rolls back.
      for (const item of items) {
        await recordMovement(tx, {
          productId: item.productId,
          warehouseId,
          quantityChange: -item.qty,
          movementType: "pos_sale",
          referenceId: createdSale.id,
          branchId,
          userId: user.id,
          notes: `POS sale #${createdSale.id}`,
        });
      }

      return createdSale;
    });

    return NextResponse.json({ saleId: sale.id, subtotal, discount, total });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: "الكمية المطلوبة من أحد المنتجات غير متاحة بالكامل." }, { status: 409 });
    }
    return NextResponse.json({ error: "تعذر إتمام عملية البيع، حاول مرة أخرى." }, { status: 500 });
  }
}
