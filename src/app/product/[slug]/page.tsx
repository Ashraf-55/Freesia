import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AddToCartButton from "@/components/add-to-cart-button";
import WishlistButton from "@/components/wishlist-button";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return {};

  const name = locale === "en" && product.nameEn ? product.nameEn : product.name;
  const description = (locale === "en" && product.descriptionEn ? product.descriptionEn : product.description)
    ?? undefined;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      images: product.images[0] ? [`/images/${product.images[0].filename}`] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale, dict } = await getDictionary();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  if (!product || product.status === "archived") notFound();

  const session = await auth();
  let inWishlist = false;
  if (session?.user) {
    const wl = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: session.user.id, productId: product.id } },
    });
    inWishlist = !!wl;
  }

  const inStock = product.stockQty > 0;
  const categoryName = locale === "ar" ? product.category.nameAr : product.category.nameEn;
  const displayName = locale === "en" && product.nameEn ? product.nameEn : product.name;
  const displayDescription = locale === "en" && product.descriptionEn ? product.descriptionEn : product.description;
  const p = dict.productPage;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="grid gap-12 md:grid-cols-2">
        <div className="animate-fade-up space-y-3">
          {/* Contain — the whole product photo stays visible, never
              cropped, whatever its real aspect ratio is. */}
          <div className="media-frame group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-blush-100 shadow-[var(--shadow-soft)]">
            {product.images[0] && (
              <Image
                src={`/images/${product.images[0].filename}`}
                alt={displayName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                priority
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((img) => (
                <div key={img.id} className="media-frame relative aspect-square overflow-hidden rounded-[var(--radius-sm)] ring-1 ring-blush-100 transition-shadow hover:ring-coral-300">
                  <Image src={`/images/${img.filename}`} alt={displayName} fill sizes="25vw" className="object-contain p-2 transition-transform duration-300 hover:scale-110" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <p className="section-eyebrow text-xs uppercase">{categoryName}</p>
          <h1 className="display-heading mt-2 text-3xl text-ink-900 md:text-4xl">{displayName}</h1>

          <div className="mt-5 flex items-center gap-3">
            {product.discountPrice ? (
              <>
                <span className="text-3xl font-bold text-coral-600">{Number(product.discountPrice)} {dict.common.currency}</span>
                <span className="text-lg text-ink-300 line-through">{Number(product.price)} {dict.common.currency}</span>
              </>
            ) : (
              <span className="text-3xl font-bold text-ink-900">{Number(product.price)} {dict.common.currency}</span>
            )}
          </div>

          <p className="mt-3 text-sm">
            {inStock ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-[var(--success)]">{p.inStock(product.stockQty)}</span>
            ) : (
              <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-[var(--error)]">{p.outOfStock}</span>
            )}
          </p>

          {displayDescription && (
            <>
              <div className="gold-divider mt-6" />
              <p className="mt-4 leading-relaxed text-ink-700">{displayDescription}</p>
            </>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1">
              {inStock ? (
                <AddToCartButton productId={product.id} />
              ) : (
                <button disabled className="w-full rounded-full bg-ink-300 py-3 font-semibold text-white">
                  {p.unavailable}
                </button>
              )}
            </div>
            <WishlistButton productId={product.id} initialActive={inWishlist} />
          </div>
        </div>
      </div>
    </div>
  );
}
