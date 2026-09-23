import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import ProductForm from "@/components/admin/product-form";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("products.edit");
  const { id } = await params;
  const { dict, locale } = await getDictionary();
  const pp = dict.adminProductsPage;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  // Spec §25: the admin should be able to see, from the product itself,
  // where its stock is and its recent movement history — without having
  // to already know which warehouse to pick on /admin/inventory.
  const [stockRows, movements] = await Promise.all([
    prisma.inventory.findMany({
      where: { productId: id, warehouse: user.role === "employee" ? { branchId: user.branchId ?? "__none__" } : undefined },
      include: { warehouse: true },
      orderBy: { warehouse: { name: "asc" } },
    }),
    prisma.inventoryMovement.findMany({
      where: { productId: id, warehouse: user.role === "employee" ? { branchId: user.branchId ?? "__none__" } : undefined },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { warehouse: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{dict.adminProductsPage.editTitle(product.name)}</h1>
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          nameEn: product.nameEn,
          slug: product.slug,
          description: product.description ?? "",
          descriptionEn: product.descriptionEn ?? "",
          categoryId: product.categoryId,
          price: Number(product.price),
          discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
          stockQty: product.stockQty,
          status: product.status,
          badge: product.badge ?? "",
          isFeatured: product.isFeatured,
          isBestseller: product.isBestseller,
          isNew: product.isNew,
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold text-ink-900">{pp.stockByWarehouse}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <thead className="bg-blush-50 text-ink-700">
                <tr>
                  <th className="p-3 text-start">{pp.warehouse}</th>
                  <th className="p-3 text-start">{pp.quantity}</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((r) => (
                  <tr key={r.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{r.warehouse.name}</td>
                    <td className={`p-3 font-medium ${r.quantity <= 3 ? "text-[var(--error)]" : "text-ink-700"}`}>{r.quantity}</td>
                  </tr>
                ))}
                {stockRows.length === 0 && (
                  <tr><td colSpan={2} className="p-6 text-center text-sm text-ink-500">{pp.noWarehouseStock}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {pp.manageFromInventory}{" "}
            <Link href="/admin/inventory" className="text-coral-600 hover:underline">/admin/inventory</Link>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-ink-900">{pp.recentMovements}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <thead className="bg-blush-50 text-ink-700">
                <tr>
                  <th className="p-3 text-start">{pp.warehouse}</th>
                  <th className="p-3 text-start">{pp.quantity}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">
                      {m.warehouse.name}
                      <span className="ms-2 text-xs text-ink-500">
                        {m.movementType} · {m.createdAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                      </span>
                    </td>
                    <td className={`p-3 font-medium ${m.quantityChange >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={2} className="p-6 text-center text-sm text-ink-500">{pp.noMovements}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </section>
      </div>
    </div>
  );
}
