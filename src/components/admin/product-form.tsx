"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export type ProductFormValues = {
  id?: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  description: string;
  descriptionEn?: string | null;
  categoryId: string;
  price: number;
  // Optional, informational-only "starting from" price, available on
  // EVERY product in every category. Empty = the product simply shows its
  // normal price. Never used for cart/checkout maths.
  startingPrice: number | null;
  stockQty: number;
  status: "active" | "draft" | "archived";
  badge: string;
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
};

export default function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; slug: string; nameAr: string; nameEn: string }[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const { locale, dict } = useClientDictionary();
  const f = dict.productForm;
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<ProductFormValues>(
    initial ?? {
      name: "",
      nameEn: "",
      slug: "",
      description: "",
      descriptionEn: "",
      categoryId: categories[0]?.id ?? "",
      price: 0,
      startingPrice: null,
      stockQty: 10,
      status: "active",
      badge: "",
      isFeatured: false,
      isBestseller: false,
      isNew: false,
    }
  );
  function onCategoryChange(categoryId: string) {
    // Starting price is allowed in every category, so it is kept as-is.
    setValues((v) => ({ ...v, categoryId }));
  }

  const [imageFilename, setImageFilename] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setUploadError(data.error ?? f.genericError);
      return;
    }
    setImageFilename(data.filename);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...values,
      badge: values.badge || null,
      // optional: blank / 0 / invalid -> no starting price (null)
      startingPrice: values.startingPrice && values.startingPrice > 0 ? values.startingPrice : null,
      imageFilename: imageFilename || undefined,
    };

    const res = await fetch("/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...payload, id: initial!.id } : payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? f.genericError);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm(f.deleteConfirm)) return;
    await fetch(`/api/admin/products?id=${initial.id}`, { method: "DELETE" });
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.name}</label>
          <input
            required
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.nameEn}</label>
          <input
            value={values.nameEn ?? ""}
            onChange={(e) => setValues({ ...values, nameEn: e.target.value })}
            placeholder={f.nameEnPlaceholder}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{f.slug}</label>
        <input
          required
          value={values.slug}
          onChange={(e) => setValues({ ...values, slug: e.target.value })}
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.description}</label>
          <textarea
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            rows={3}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.descriptionEn}</label>
          <textarea
            value={values.descriptionEn ?? ""}
            onChange={(e) => setValues({ ...values, descriptionEn: e.target.value })}
            rows={3}
            placeholder={f.descriptionEnPlaceholder}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.category}</label>
          <select
            value={values.categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{locale === "ar" ? c.nameAr : c.nameEn}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.status}</label>
          <select
            value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value as ProductFormValues["status"] })}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          >
            <option value="active">{f.statusActive}</option>
            <option value="draft">{f.statusDraft}</option>
            <option value="archived">{f.statusArchived}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.price}</label>
          <input
            type="number"
            required
            min={0}
            value={values.price}
            onChange={(e) => setValues({ ...values, price: Number(e.target.value) })}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{f.stockQty}</label>
          <input
            type="number"
            required
            value={values.stockQty}
            onChange={(e) => setValues({ ...values, stockQty: Number(e.target.value) })}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-blush-50/60 p-4">
        <label className="mb-1 block text-sm font-medium text-ink-700">{f.startingPrice}</label>
        <p className="mb-2 text-xs text-ink-500">{f.startingPriceHint}</p>
        <input
          type="number"
          min={0}
          value={values.startingPrice ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            setValues({ ...values, startingPrice: e.target.value && n > 0 ? n : null });
          }}
          className="w-full max-w-xs rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{f.badge}</label>
        <input
          value={values.badge}
          onChange={(e) => setValues({ ...values, badge: e.target.value })}
          placeholder={f.badgePlaceholder}
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{f.imageFilename}</label>
        <div className="flex items-center gap-4">
          {imageFilename && (
            <div className="media-frame relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ring-1 ring-blush-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- instant local preview, no next/image optimization needed for a small admin thumbnail */}
              <img src={`/images/${imageFilename}`} alt="" className="h-full w-full object-contain p-1" />
            </div>
          )}
          <label className="cursor-pointer rounded-full border border-coral-500 px-4 py-2 text-sm font-semibold text-coral-600 hover:bg-blush-50">
            {uploading ? f.uploading : f.uploadImage}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFileSelected} disabled={uploading} className="hidden" />
          </label>
        </div>
        {uploadError && <p className="mt-1 text-xs text-[var(--error)]">{uploadError}</p>}
        {imageFilename && <p className="mt-1 text-xs text-ink-400">{imageFilename}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-ink-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={values.isNew} onChange={(e) => setValues({ ...values, isNew: e.target.checked })} />
          {f.isNew}
        </label>
        {/* Featured / Bestseller are no longer manual toggles — the
            homepage computes them automatically from real sales in the
            last 30 days (top-seller-per-category, and top 8 overall).
            See src/lib/sales-rankings.ts. */}
        <p className="text-xs text-ink-400">{f.autoRankingNote}</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
        >
          {loading ? f.saving : isEdit ? f.saveChanges : f.addProduct}
        </button>
        {isEdit && (
          <button type="button" onClick={onDelete} className="btn-press text-sm text-[var(--error)] transition-colors hover:underline">
            {f.deleteProduct}
          </button>
        )}
      </div>
    </form>
  );
}
