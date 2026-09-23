import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function adminOnly() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "غير مصرح." }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

const settingsSchema = z.object({
  formspreeEndpoint: z.string().url().or(z.literal("")).nullable().optional(),
  formspreeEnabled: z.boolean().optional(),
  onlineFulfillmentWarehouseId: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });

  const { formspreeEndpoint, formspreeEnabled, onlineFulfillmentWarehouseId } = parsed.data;

  if (onlineFulfillmentWarehouseId) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: onlineFulfillmentWarehouseId } });
    if (!warehouse) {
      return NextResponse.json({ error: "المخزن المحدد غير موجود." }, { status: 400 });
    }
  }

  await prisma.storeSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      formspreeEndpoint: formspreeEndpoint || null,
      formspreeEnabled: formspreeEnabled ?? false,
      onlineFulfillmentWarehouseId: onlineFulfillmentWarehouseId || null,
    },
    update: {
      ...(formspreeEndpoint !== undefined ? { formspreeEndpoint: formspreeEndpoint || null } : {}),
      ...(formspreeEnabled !== undefined ? { formspreeEnabled } : {}),
      ...(onlineFulfillmentWarehouseId !== undefined
        ? { onlineFulfillmentWarehouseId: onlineFulfillmentWarehouseId || null }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
