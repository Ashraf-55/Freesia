import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireStaff("products.view");
  const { locale, dict } = await getDictionary();
  const pp = dict.adminProductsPage;

  const products = await prisma.product.findMany({
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{pp.title}</h1>
        <Link href="/admin/products/new" className="btn-press rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
          {pp.newProduct}
        </Link>
      </div>

      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{pp.product}</th>
              <th className="p-3 text-start">{pp.category}</th>
              <th className="p-3 text-start">{pp.price}</th>
              <th className="p-3 text-start">{pp.stock}</th>
              <th className="p-3 text-start">{pp.status}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                <td className="flex items-center gap-3 p-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-blush-50 media-frame">
                    {p.images[0] && <Image src={`/images/${p.images[0].filename}`} alt={p.name} fill sizes="40px" className="object-contain p-0.5" />}
                  </div>
                  <span className="font-medium text-ink-900">{p.name}</span>
                </td>
                <td className="p-3 text-ink-700">{locale === "ar" ? p.category.nameAr : p.category.nameEn}</td>
                <td className="p-3 text-ink-700">{Number(p.price)} {dict.common.currency}</td>
                <td className="p-3 text-ink-700">{p.stockQty}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <Link href={`/admin/products/${p.id}`} className="text-coral-600 hover:underline">
                    {pp.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
