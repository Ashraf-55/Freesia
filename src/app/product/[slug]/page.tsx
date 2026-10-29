import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import AddToCartButton from "@/components/add-to-cart-button";
import WishlistButton from "@/components/wishlist-button";
import { getDictionary } from "@/lib/i18n";
import { getStorefrontAvailableQuantity } from "@/lib/inventory";
import { getStaticProduct, getStaticCategory } from "@/lib/static-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) {
    const sp = getStaticProduct(slug);
    if (!sp) return {};
    const spName = locale === "en" ? sp.nameEn : sp.name;
    return { title: spName, openGraph: { title: spName, images: [`/images/${sp.image}`] } };
  }

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

  if (!product) {
    // Code-defined (static) product — no DB row, no cart/wishlist; ordered via Contact.
    const sp = getStaticProduct(slug);
    if (!sp) notFound();
    const spCategory = (await prisma.category.findUnique({ where: { slug: sp.categorySlug } })) ?? getStaticCategory(sp.categorySlug);
    const spCategoryName = spCategory ? (locale === "ar" ? spCategory.nameAr : spCategory.nameEn) : "";
    const spName = locale === "en" ? sp.nameEn : sp.name;
    const sd = dict.productPage;
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="animate-fade-up">
            <div className="media-frame group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-blush-100 shadow-[var(--shadow-soft)]">
              <Image
                src={`/images/${sp.image}`}
                alt={spName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                priority
              />
            </div>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <p className="section-eyebrow text-xs uppercase">{spCategoryName}</p>
            <h1 className="display-heading mt-2 text-3xl text-ink-900 md:text-4xl">{spName}</h1>
            {sp.price != null && (
              <>
                {sp.startingPrice != null && (
                  <p className="mt-4 text-sm text-ink-400">
                    {dict.productCard.startingFrom} {sp.startingPrice} {dict.common.currency}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-3xl font-bold text-ink-900">
                    {sp.price} {dict.common.currency}
                  </span>
                </div>
              </>
            )}
            {sp.price == null && <p className="mt-4 text-xl font-bold text-ink-900">{sd.priceOnRequest}</p>}
            {sp.price != null && (
              <div className="mt-8">
                <AddToCartButton productId={`static:${sp.slug}`} />
              </div>
            )}
            <Link
              href={`/contact?product=${encodeURIComponent(sp.slug)}`}
              className={`btn-press ${sp.price != null ? "mt-3" : "mt-8"} block w-full rounded-full border border-coral-500 py-3 text-center font-semibold text-coral-600 transition-all duration-300 hover:bg-blush-50`}
            >
              {sd.orderViaContact}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (product.status === "archived") notFound();

  const session = await auth();
  let inWishlist = false;
  if (session?.user) {
    const wl = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: session.user.id, productId: product.id } },
    });
    inWishlist = !!wl;
  }

  // Same source the Cart API / checkout use: the Online Fulfillment
  // Warehouse's Inventory.availableQuantity when one is set, otherwise
  // the legacy Product.stockQty fallback.
  const availableQty = await getStorefrontAvailableQuantity(product.id);
  const inStock = availableQty > 0;
  // No real price set yet -> "price on request": ordered through Contact Us instead of the cart.
  const onRequest = Number(product.price) <= 0;
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

          {product.startingPrice != null && !onRequest && Number(product.startingPrice) !== Number(product.price) && (
            <p className="mt-4 text-sm text-ink-400">
              {dict.productCard.startingFrom} {Number(product.startingPrice)} {dict.common.currency}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl font-bold text-ink-900">
              {onRequest
                ? product.startingPrice != null
                  ? `${dict.productCard.startingFrom} ${Number(product.startingPrice)} ${dict.common.currency}`
                  : p.priceOnRequest
                : product.startingPrice != null && Number(product.startingPrice) === Number(product.price)
                  ? `${dict.productCard.startingFrom} ${Number(product.price)} ${dict.common.currency}`
                  : `${Number(product.price)} ${dict.common.currency}`}
            </span>
          </div>

          <p className="mt-3 text-sm">
            {inStock ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-[var(--success)]">{p.inStock(availableQty)}</span>
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
              {onRequest ? null : inStock ? (
                <AddToCartButton productId={product.id} />
              ) : (
                <button disabled className="w-full rounded-full bg-ink-300 py-3 font-semibold text-white">
                  {p.unavailable}
                </button>
              )}
            </div>
            <WishlistButton productId={product.id} initialActive={inWishlist} />
          </div>
          <Link
            href={`/contact?product=${encodeURIComponent(product.slug)}`}
            className="btn-press mt-3 block w-full rounded-full border border-coral-500 py-3 text-center font-semibold text-coral-600 transition-all duration-300 hover:bg-blush-50"
          >
            {p.orderViaContact}
          </Link>
        </div>
      </div>
    </div>
  );
}
