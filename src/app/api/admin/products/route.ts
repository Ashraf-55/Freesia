import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

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

const productSchema = z.object({
  name: z.string().min(2),
  nameEn: z.string().nullable().optional(),
  slug: z.string().min(2),
  description: z.string().optional(),
  descriptionEn: z.string().nullable().optional(),
  categoryId: z.string(),
  price: z.number().positive(),
  discountPrice: z.number().positive().nullable().optional(),
  stockQty: z.number().int().min(0),
  status: z.enum(["active", "draft", "archived"]),
  badge: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  imageFilename: z.string().optional(),
});

export async function POST(req: Request) {
  const gate = await staffOr403("products.add");
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { imageFilename, ...data } = parsed.data;
  const product = await prisma.product.create({
    data: {
      ...data,
      discountPrice: data.discountPrice ?? undefined,
      badge: data.badge ?? undefined,
      images: imageFilename ? { create: [{ filename: imageFilename, sortOrder: 0 }] } : undefined,
    },
  });

  return NextResponse.json({ id: product.id });
}

const updateSchema = productSchema.extend({ id: z.string() });

export async function PATCH(req: Request) {
  const gate = await staffOr403("products.edit");
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { id, imageFilename, ...data } = parsed.data;
  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      discountPrice: data.discountPrice ?? null,
      badge: data.badge ?? null,
    },
  });

  if (imageFilename) {
    await prisma.productImage.create({ data: { productId: id, filename: imageFilename, sortOrder: 0 } });
  }

  return NextResponse.json({ ok: true });
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
