import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).optional().or(z.literal("")),
});

/**
 * Lets any signed-in admin/employee change their OWN name, email, and
 * password. This is the self-service replacement for hand-editing the
 * seeded demo admin via a one-off script: the seeded account's email
 * and password are just ordinary database values like any other user's
 * — this endpoint is the supported way to change them, protected by
 * requiring the current password (so a hijacked browser session alone
 * isn't enough to lock the real owner out).
 */
export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  }
  const { name, email, currentPassword, newPassword } = parsed.data;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });

  const validPassword = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "كلمة المرور الحالية غلط." }, { status: 403 });
  }

  if (email !== dbUser.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني ده مستخدم بالفعل." }, { status: 409 });
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10) } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذر حفظ التغييرات، حاول مرة أخرى." }, { status: 500 });
  }
}
