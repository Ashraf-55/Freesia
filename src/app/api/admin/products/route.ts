import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { isLegacyStockLocked } from "@/lib/inventory";

async function staffOr403(permission: Parameters<typeof hasPermission>[2]) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return { ok: false as const, res: NextResponse.json({ error: "غير مصرح." }, { status: 401 }) };
  }
  if (!hasPermission(user.role, user.permissions, permission)) {
    return { ok: false as const, res: NextResponse.json({ error: "ليس لديك صلاحية." }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

// Turn the two Prisma failures an admin can realistically trigger from the
// form (duplicate slug / unknown category) into a readable JSON message —
// otherwise the route throws, the client gets an empty 500 and the form
// just sits on "saving…".
function prismaErrorCode(e: unknown) {
  return typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
}
function prismaErrorStatus(e: unknown) {
  const code = prismaErrorCode(e);
  return code === "P2002" ? 409 : code === "P2003" || code === "P2025" ? 400 : 500;
}
function prismaErrorBody(e: unknown) {
  const code = prismaErrorCode(e);
  if (code === "P2002") return { error: "الرابط (slug) مستخدم لمنتج آخر، اختر رابطًا مختلفًا." };
  if (code === "P2003") return { error: "القسم المختار غير موجود." };
  if (code === "P2025") return { error: "المنتج غير موجود." };
  return { error: "تعذر حفظ المنتج، حاول مرة أخرى." };
}

const productObjectSchema = z.object({
  name: z.string().min(2),
  nameEn: z.string().nullable().optional(),
  slug: z.string().min(2),
  description: z.string().optional(),
  descriptionEn: z.string().nullable().optional(),
  categoryId: z.string(),
  // Fixed price — what Cart/Checkout/POS/Reports snapshot from.
  // 0 = no fixed price ("price on request": gift boxes, money bouquets).
  price: z.number().min(0),
  // Optional "starting from" price — informational only, never used
  // for Cart/Checkout math. Available on every product in every
  // category; omitted / null simply means "no starting price".
  startingPrice: z.number().positive().nullable().optional(),
  stockQty: z.number().int().min(0),
  status: z.enum(["active", "draft", "archived"]),
  badge: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  imageFilename: z.string().optional(),
});

const productSchema = productObjectSchema;

export async function POST(req: Request) {
  const gate = await staffOr403("products.add");
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { imageFilename, stockQty, ...data } = parsed.data;
  try {
    // Once an Online Fulfillment Warehouse exists, real stock lives in
    // Inventory/InventoryMovement only. A new product therefore starts at
    // 0 legacy stock and gets real stock via the Inventory page.
    const locked = await isLegacyStockLocked();
    const product = await prisma.product.create({
      data: {
        ...data,
        stockQty: locked ? 0 : stockQty,
        startingPrice: data.startingPrice ?? undefined,
        badge: data.badge ?? undefined,
        images: imageFilename ? { create: [{ filename: imageFilename, sortOrder: 0 }] } : undefined,
      },
    });

    return NextResponse.json({ id: product.id });
  } catch (e) {
    return NextResponse.json(prismaErrorBody(e), { status: prismaErrorStatus(e) });
  }
}

const updateSchema = productObjectSchema.extend({ id: z.string() });

export async function PATCH(req: Request) {
  const gate = await staffOr403("products.edit");
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { id, imageFilename, stockQty, ...data } = parsed.data;
  try {
    // While an Online Fulfillment Warehouse is configured, the legacy
    // `stockQty` sent by the form is ignored (left untouched) so this
    // endpoint can never silently diverge from Inventory.
    const locked = await isLegacyStockLocked();
    await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(locked ? {} : { stockQty }),
        startingPrice: data.startingPrice ?? null,
        badge: data.badge ?? null,
      },
    });

    if (imageFilename) {
      // The storefront always shows the image with the lowest sortOrder.
      // Push the existing ones down one slot so the image just uploaded
      // becomes the primary one (instead of tying with the old image at 0
      // and leaving the card/product page on the old photo).
      await prisma.$transaction([
        prisma.productImage.updateMany({ where: { productId: id }, data: { sortOrder: { increment: 1 } } }),
        prisma.productImage.create({ data: { productId: id, filename: imageFilename, sortOrder: 0 } }),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(prismaErrorBody(e), { status: prismaErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  const gate = await staffOr403("products.delete");
  if (!gate.ok) return gate.res;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  await prisma.product.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
