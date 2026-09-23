import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

// NOTE: this writes straight to the local /public/images/uploads folder,
// which needs a persistent, writable filesystem — works great for
// `npm run dev` and traditional Node servers (VPS/Docker), but NOT on
// read-only serverless platforms (e.g. Vercel's default runtime). If you
// deploy there, swap the writeFile call for an object-storage upload
// (S3/R2/Vercel Blob) and return that URL instead.

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function safeExt(mime: string) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[mime] ?? "jpg";
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  // Reuses the products permission set — uploading is part of adding/editing a product.
  if (!hasPermission(user.role, user.permissions, "products.add") && !hasPermission(user.role, user.permissions, "products.edit")) {
    return NextResponse.json({ error: "ليس لديك صلاحية." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم اختيار ملف." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "الصيغة غير مدعومة (jpg, png, webp, avif فقط)." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "الحجم أكبر من 5MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt(file.type)}`;
  const dir = path.join(process.cwd(), "public", "images", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json({ filename: `uploads/${filename}` });
}
