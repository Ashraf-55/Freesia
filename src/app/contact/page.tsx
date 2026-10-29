import { getDictionary } from "@/lib/i18n";
import { getFormspreeConfig } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getStaticProduct } from "@/lib/static-catalog";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.contactPage.title };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { endpoint, enabled } = await getFormspreeConfig();
  const { dict, locale } = await getDictionary();
  // Coming from a product page ("order this product"): pre-fill the message so the
  // product details travel with the customer instead of getting lost.
  const { product: productSlug } = await searchParams;
  const dbProduct = productSlug
    ? await prisma.product.findUnique({ where: { slug: productSlug }, select: { slug: true, name: true, nameEn: true, price: true, startingPrice: true } })
    : null;
  // Code-defined (static) products are not in the DB: fall back to the static catalog.
  const staticProduct = productSlug && !dbProduct ? getStaticProduct(productSlug) : undefined;
  const product = dbProduct ?? (staticProduct
    ? { slug: staticProduct.slug, name: staticProduct.name, nameEn: staticProduct.nameEn, price: staticProduct.price ?? 0, startingPrice: staticProduct.startingPrice }
    : null);
  let prefill = "";
  if (product) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const url = host ? `${proto}://${host}/product/${product.slug}` : `/product/${product.slug}`;
    const name = locale === "ar" ? product.name : product.nameEn || product.name;
    const cur = dict.common.currency;
    // price on request -> mention "starting from X" if there is one, otherwise no price at all
    const priceText =
      Number(product.price) > 0
        ? `${Number(product.price)} ${cur}`
        : product.startingPrice != null
          ? `${dict.productCard.startingFrom} ${Number(product.startingPrice)} ${cur}`
          : "";
    prefill = dict.productPage.orderMessage(name, priceText, url);
  }
  const c = dict.contactPage;
  const a = dict.auth;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-ink-900">{c.title}</h1>
      <p className="mb-6 text-center text-sm text-ink-500">{c.subtitle}</p>

      <div className="mb-8 rounded-[var(--radius-md)] bg-blush-50 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-ink-900">
          {c.complaintsLabel}: <span dir="ltr">{c.complaintsNumber}</span>
        </p>
        <p className="mt-1 text-xs text-ink-500">{c.complaintsNote}</p>
      </div>

      {enabled ? (
        <form action={endpoint} method="POST" className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.name}</label>
            <input name="name" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.email}</label>
            <input type="email" name="email" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.phone}</label>
            <input name="phone" className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.message}</label>
            <textarea name="message" rows={5} required defaultValue={prefill} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <button type="submit" className="btn-press w-full rounded-full bg-coral-500 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {c.send}
          </button>
        </form>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-blush-50 p-6 text-center text-sm text-ink-700">
          <p>{c.disabledTitle}</p>
          <p className="mt-2 text-ink-500">
            {c.disabledBody}{" "}
            <code className="rounded bg-white px-1.5 py-0.5">FREESIA_FORMSPREE_ENDPOINT</code> — README.md
          </p>
        </div>
      )}
    </div>
  );
}
