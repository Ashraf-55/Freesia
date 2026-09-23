import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/password-reset";

const schema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات غير صحيحة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json(
      { error: "الرابط غير صالح أو منتهي الصلاحية. من فضلك اطلب رابطًا جديدًا." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
