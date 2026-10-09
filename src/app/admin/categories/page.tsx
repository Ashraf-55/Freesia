import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Admin-only category manager.
 *  - add a brand-new category (name AR/EN, optional slug / order / description / banner)
 *  - rename existing categories and edit their order / description / banner
 * What it deliberately does NOT do: change a slug after creation (it is the public
 * URL, /category/<slug>, and what the seed matches on) or delete a category.
 * Products always stay attached to their category, so nothing else is affected.
 */

const BASE = "/admin/categories";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, same limit as product images

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function slugify(nameEn: string) {
  const s = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || `category-${Date.now().toString(36)}`;
}

/** Saves an optional banner into public/images/uploads (same place product images go). */
async function saveBanner(file: FormDataEntryValue | null): Promise<{ ok: boolean; filename: string | null }> {
  if (!file || !(file instanceof File) || file.size === 0) return { ok: true, filename: null };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext || file.size > MAX_BYTES) return { ok: false, filename: null };
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "images", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { ok: true, filename: `uploads/${filename}` };
}

/** Module-level on purpose: Server Actions can't capture functions from the component scope. */
async function assertAdmin() {
  const actor = await requireStaff();
  if (actor.role !== "admin") redirect("/admin");
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin");
  const { msg } = await searchParams;
  const { locale } = await getDictionary();
  const ar = locale === "ar";

  const L = ar
    ? {
        title: "الأقسام",
        intro: "أضف قسمًا جديدًا أو عدّل أسماء الأقسام الحالية. المنتجات بتفضل في أقسامها ومفيش حاجة بتتأثر.",
        addTitle: "إضافة قسم جديد",
        nameAr: "الاسم بالعربي",
        nameEn: "الاسم بالإنجليزي",
        slug: "الرابط (slug)",
        slugHint: "اختياري، حروف إنجليزية صغيرة وأرقام وشرطة. لو فاضي بيتعمل من الاسم الإنجليزي. مايتغيرش بعد الإنشاء.",
        order: "الترتيب",
        orderHint: "رقم أصغر = أول. القائمة العلوية بتعرض أول 5 أقسام بالترتيب (غير دباديب وشنط هدايا).",
        description: "وصف (اختياري)",
        banner: "صورة القسم (اختياري)",
        bannerHint: "jpg / png / webp / avif حتى 5MB",
        add: "إضافة القسم",
        save: "حفظ",
        products: "منتج",
        view: "عرض في المتجر",
        replaceBanner: "تغيير الصورة",
        current: "الأقسام الحالية",
        messages: {
          created: ["تم إضافة القسم.", true],
          updated: ["تم حفظ التعديلات.", true],
          invalid_name: ["الاسم العربي والإنجليزي مطلوبين (حرفين على الأقل، وحتى 60 حرف).", false],
          invalid_slug: ["الرابط غير صالح: حروف إنجليزية صغيرة وأرقام وشرطة فقط.", false],
          slug_taken: ["الرابط ده مستخدم في قسم تاني، اختار رابط مختلف.", false],
          bad_image: ["الصورة غير صالحة (jpg / png / webp / avif حتى 5MB).", false],
          not_found: ["القسم غير موجود.", false],
        } as Record<string, [string, boolean]>,
      }
    : {
        title: "Categories",
        intro: "Add a new category or rename existing ones. Products stay in their categories — nothing else is affected.",
        addTitle: "Add a new category",
        nameAr: "Arabic name",
        nameEn: "English name",
        slug: "URL slug",
        slugHint: "Optional: lowercase English letters, numbers and dashes. Built from the English name if empty. Can't change later.",
        order: "Order",
        orderHint: "Smaller = first. The top menu shows the first 5 categories by order (plus Teddy Bears and Gift Bags).",
        description: "Description (optional)",
        banner: "Category image (optional)",
        bannerHint: "jpg / png / webp / avif up to 5MB",
        add: "Add category",
        save: "Save",
        products: "products",
        view: "View in store",
        replaceBanner: "Replace image",
        current: "Current categories",
        messages: {
          created: ["Category added.", true],
          updated: ["Changes saved.", true],
          invalid_name: ["Arabic and English names are required (2–60 characters).", false],
          invalid_slug: ["Invalid slug: lowercase English letters, numbers and dashes only.", false],
          slug_taken: ["That slug is already used by another category.", false],
          bad_image: ["Invalid image (jpg / png / webp / avif, up to 5MB).", false],
          not_found: ["Category not found.", false],
        } as Record<string, [string, boolean]>,
      };

  async function createCategory(formData: FormData) {
    "use server";
    await assertAdmin();
    const nameAr = text(formData, "nameAr");
    const nameEn = text(formData, "nameEn");
    if (nameAr.length < 2 || nameEn.length < 2 || nameAr.length > 60 || nameEn.length > 60) {
      redirect(`${BASE}?msg=invalid_name`);
    }
    const slug = (text(formData, "slug").toLowerCase() || slugify(nameEn)).slice(0, 60);
    if (!SLUG_RE.test(slug)) redirect(`${BASE}?msg=invalid_slug`);
    if (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
      redirect(`${BASE}?msg=slug_taken`);
    }
    const banner = await saveBanner(formData.get("banner"));
    if (!banner.ok) redirect(`${BASE}?msg=bad_image`);

    let sortOrder = Number.parseInt(text(formData, "sortOrder"), 10);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
      sortOrder = (last._max.sortOrder ?? -1) + 1; // goes to the end
    }
    const description = text(formData, "description").slice(0, 300);

    let failed = false;
    try {
      await prisma.category.create({
        data: { slug, nameAr, nameEn, sortOrder, description: description || null, bannerImage: banner.filename },
      });
    } catch {
      failed = true; // e.g. two admins created the same slug at the same moment
    }
    if (failed) redirect(`${BASE}?msg=slug_taken`);
    revalidatePath("/", "layout");
    redirect(`${BASE}?msg=created`);
  }

  async function updateCategory(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = text(formData, "id");
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) redirect(`${BASE}?msg=not_found`);

    const nameAr = text(formData, "nameAr");
    const nameEn = text(formData, "nameEn");
    if (nameAr.length < 2 || nameEn.length < 2 || nameAr.length > 60 || nameEn.length > 60) {
      redirect(`${BASE}?msg=invalid_name`);
    }
    const banner = await saveBanner(formData.get("banner"));
    if (!banner.ok) redirect(`${BASE}?msg=bad_image`);

    const parsedOrder = Number.parseInt(text(formData, "sortOrder"), 10);
    const sortOrder = Number.isInteger(parsedOrder) && parsedOrder >= 0 ? parsedOrder : existing.sortOrder;
    const description = text(formData, "description").slice(0, 300);

    // slug is intentionally NOT updated: it is the public URL and the key the seed matches on.
    await prisma.category.update({
      where: { id },
      data: {
        nameAr,
        nameEn,
        sortOrder,
        description: description || null,
        ...(banner.filename ? { bannerImage: banner.filename } : {}),
      },
    });
    revalidatePath("/", "layout");
    redirect(`${BASE}?msg=updated`);
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const flash = msg ? L.messages[msg] : undefined;
  const input = "w-full rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-ink-900">{L.title}</h1>
      <p className="mb-6 text-sm text-ink-500">{L.intro}</p>

      {flash && (
        <p
          className={`mb-6 rounded-[var(--radius-md)] px-4 py-3 text-sm ${
            flash[1] ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {flash[0]}
        </p>
      )}

      <form action={createCategory} className="mb-8 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 font-semibold text-ink-900">{L.addTitle}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">{L.nameAr}</label>
            <input name="nameAr" required minLength={2} maxLength={60} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{L.nameEn}</label>
            <input name="nameEn" required minLength={2} maxLength={60} dir="ltr" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{L.slug}</label>
            <input name="slug" maxLength={60} dir="ltr" placeholder="wrapping-bags" className={input} />
            <p className="mt-1 text-xs text-ink-400">{L.slugHint}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{L.order}</label>
            <input name="sortOrder" type="number" min={0} className={input} />
            <p className="mt-1 text-xs text-ink-400">{L.orderHint}</p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-ink-500">{L.description}</label>
            <input name="description" maxLength={300} className={input} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-ink-500">{L.banner}</label>
            <input name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
            <p className="mt-1 text-xs text-ink-400">{L.bannerHint}</p>
          </div>
        </div>
        <button
          type="submit"
          className="btn-press mt-4 rounded-full bg-coral-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
        >
          {L.add}
        </button>
      </form>

      <h2 className="mb-3 font-semibold text-ink-900">{L.current}</h2>
      <div className="space-y-3">
        {categories.map((c) => (
          <form
            key={c.id}
            action={updateCategory}
            className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]"
          >
            <input type="hidden" name="id" value={c.id} />
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-ink-500">{L.nameAr}</label>
                <input name="nameAr" defaultValue={c.nameAr} required minLength={2} maxLength={60} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">{L.nameEn}</label>
                <input name="nameEn" defaultValue={c.nameEn} required minLength={2} maxLength={60} dir="ltr" className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">{L.order}</label>
                <input name="sortOrder" type="number" min={0} defaultValue={c.sortOrder} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">{L.slug}</label>
                <p dir="ltr" className="py-1.5 text-sm text-ink-500">{c.slug}</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-ink-500">{L.description}</label>
                <input name="description" defaultValue={c.description ?? ""} maxLength={300} className={input} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-ink-500">{L.replaceBanner}</label>
                <input name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 font-semibold text-white transition-colors hover:bg-coral-600">
                {L.save}
              </button>
              <span className="text-ink-500">
                {c._count.products} {L.products}
              </span>
              <Link href={`/category/${c.slug}`} className="text-coral-600 hover:underline">
                {L.view}
              </Link>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
