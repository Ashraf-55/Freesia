import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import ProductForm from "@/components/admin/product-form";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireStaff("products.add");
  const { dict } = await getDictionary();
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{dict.adminProductsPage.newProductTitle}</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
