import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProductCard from "@/components/product-card";
import StaggerGrid from "@/components/stagger-grid";
import { serializeProduct } from "@/lib/serialize";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.wishlistPage.title };
}

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/wishlist");

  const { dict } = await getDictionary();

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-ink-900">{dict.wishlistPage.title}</h1>
      {items.length === 0 ? (
        <p className="text-center text-ink-500">{dict.wishlistPage.empty}</p>
      ) : (
        <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item, i) => (
            <div key={item.productId} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 60}ms` }}>
              <ProductCard product={serializeProduct(item.product)} />
            </div>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
