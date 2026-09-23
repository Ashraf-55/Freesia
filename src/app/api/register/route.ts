import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { mergeGuestCartIntoUser } from "@/lib/cart";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل." }, { status: 409 });
  }

  // Capture the guest cart's session id before creating the account so
  // the merge below has something to merge from (spec §19).
  const guestSessionId = await getSessionId();

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "customer", phone },
  });

  await mergeGuestCartIntoUser(guestSessionId, user.id);

  return NextResponse.json({ ok: true });
}
