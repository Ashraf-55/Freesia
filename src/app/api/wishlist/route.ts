import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ items: [] });
  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
  });
  return NextResponse.json({ items });
}

const schema = z.object({ productId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "لازم تسجّل دخول." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: session.user.id, productId: parsed.data.productId } },
    update: {},
    create: { userId: session.user.id, productId: parsed.data.productId },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "لازم تسجّل دخول." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId مطلوب." }, { status: 400 });

  await prisma.wishlistItem
    .delete({ where: { userId_productId: { userId: session.user.id, productId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
