"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientDictionary } from "@/lib/i18n/use-locale";

type Branch = { id: string; name: string };
type Warehouse = { id: string; name: string; branchId: string | null };
type StockProduct = {
  id: string;
  name: string;
  nameEn: string | null;
  price: string;
  discountPrice: string | null;
  available: number;
};
type CartLine = { productId: string; name: string; price: number; qty: number; available: number };

const PAYMENT_METHODS = ["cash", "card", "instapay", "vodafone_cash", "other"] as const;

export default function PosTerminal({
  branches,
  warehouses,
  canDiscount,
  canSell,
}: {
  branches: Branch[];
  warehouses: Warehouse[];
  canDiscount: boolean;
  canSell: boolean;
}) {
  const { locale, dict } = useClientDictionary();
  const p = dict.posPage;

  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const warehousesForBranch = useMemo(() => warehouses.filter((w) => w.branchId === branchId), [warehouses, branchId]);
  const [warehouseId, setWarehouseId] = useState(warehousesForBranch[0]?.id ?? "");

  useEffect(() => {
    // Branch changed → reset to the first warehouse that belongs to it.
    setWarehouseId(warehousesForBranch[0]?.id ?? "");
  }, [branchId, warehousesForBranch]);

  const [products, setProducts] = useState<StockProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!warehouseId) {
      setProducts(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    fetch(`/api/admin/pos/stock?warehouseId=${warehouseId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? p.genericError);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setProducts(data.products);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? p.genericError);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ saleId: string; total: number } | null>(null);

  const filteredProducts = (products ?? []).filter((prod) => {
    const label = locale === "en" && prod.nameEn ? prod.nameEn : prod.name;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  function addToCart(prod: StockProduct) {
    setError(null);
    const price = Number(prod.discountPrice ?? prod.price);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === prod.id);
      const nextQty = (existing?.qty ?? 0) + 1;
      if (nextQty > prod.available) {
        setError(p.exceedsStock(prod.available));
        return prev;
      }
      if (existing) {
        return prev.map((l) => (l.productId === prod.id ? { ...l, qty: nextQty } : l));
      }
      const label = locale === "en" && prod.nameEn ? prod.nameEn : prod.name;
      return [...prev, { productId: prod.id, name: label, price, qty: 1, available: prod.available }];
    });
  }

  function setQty(productId: string, qty: number) {
    setError(null);
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => {
        if (l.productId !== productId) return l;
        if (qty > l.available) {
          setError(p.exceedsStock(l.available));
          return l;
        }
        return { ...l, qty };
      });
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - (canDiscount ? discount : 0));

  async function completeSale() {
    if (cart.length === 0 || !branchId || !warehouseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          warehouseId,
          items: cart.map((l) => ({ productId: l.productId, qty: l.qty })),
          discount: canDiscount ? discount : 0,
          paymentMethod,
          notes: notes || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? p.genericError);
        return;
      }
      setSuccess({ saleId: data.saleId, total: data.total });
      setCart([]);
      setDiscount(0);
      setNotes("");
      // Refresh stock for the current warehouse so the grid reflects the sale.
      const stockRes = await fetch(`/api/admin/pos/stock?warehouseId=${warehouseId}`);
      if (stockRes.ok) setProducts((await stockRes.json()).products);
    } catch {
      setError(p.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="animate-scale-in rounded-[var(--radius-md)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="animate-pop-badge mb-2 text-xl font-bold text-[var(--success)]">{p.saleCompleted}</p>
        <p className="mb-1 text-sm text-ink-500">
          {p.invoiceNumber}: <span dir="ltr">{success.saleId}</span>
        </p>
        <p className="mb-6 text-lg font-semibold text-ink-900">
          {success.total} {dict.common.currency}
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
        >
          {p.newSale}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-2 text-sm transition-colors focus:border-coral-500 focus:outline-none"
          >
            {branches.length === 0 && <option value="">{p.chooseBranch}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-2 text-sm transition-colors focus:border-coral-500 focus:outline-none"
          >
            {warehousesForBranch.length === 0 && <option value="">{p.chooseWarehouse}</option>}
            {warehousesForBranch.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.search}
            className="flex-1 min-w-[160px] rounded-[var(--radius-sm)] border border-ink-300 px-3 py-2 text-sm transition-colors focus:border-coral-500 focus:outline-none"
          />
        </div>

        {warehousesForBranch.length === 0 && (
          <p className="rounded-[var(--radius-md)] bg-white p-4 text-sm text-ink-500 shadow-[var(--shadow-soft)]">
            {p.noWarehouseForBranch}
          </p>
        )}

        {loadError && <p className="mb-3 text-sm text-[var(--error)]">{loadError}</p>}

        {warehousesForBranch.length > 0 && (
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <thead className="bg-blush-50 text-ink-700">
                <tr>
                  <th className="p-3 text-start">{p.product}</th>
                  <th className="p-3 text-start">{p.price}</th>
                  <th className="p-3 text-start">{p.stock}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const label = locale === "en" && prod.nameEn ? prod.nameEn : prod.name;
                  const price = Number(prod.discountPrice ?? prod.price);
                  return (
                    <tr key={prod.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                      <td className="p-3 font-medium text-ink-900">{label}</td>
                      <td className="p-3 text-ink-700">
                        {price} {dict.common.currency}
                      </td>
                      <td className="p-3 text-ink-700">{prod.available}</td>
                      <td className="p-3 text-end">
                        <button
                          disabled={prod.available <= 0}
                          onClick={() => addToCart(prod)}
                          className="btn-press rounded-full bg-coral-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 disabled:opacity-40"
                        >
                          {prod.available <= 0 ? p.outOfStock : p.addToSale}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            {products !== null && filteredProducts.length === 0 && (
              <p className="p-6 text-center text-sm text-ink-500">—</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 font-bold text-ink-900">{p.cart}</h2>

        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-[var(--error)]">{error}</p>}

        {cart.length === 0 ? (
          <p className="text-sm text-ink-500">{p.emptyCart}</p>
        ) : (
          <div className="space-y-3">
            {cart.map((line) => (
              <div key={line.productId} className="animate-fade-up flex items-center gap-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium text-ink-900">{line.name}</div>
                  <div className="text-xs text-ink-500">
                    {line.price} {dict.common.currency}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={line.available}
                  value={line.qty}
                  onChange={(e) => setQty(line.productId, Number(e.target.value))}
                  className="w-16 rounded border border-ink-300 px-2 py-1 text-center text-sm transition-colors focus:border-coral-500 focus:outline-none"
                />
                <button onClick={() => removeLine(line.productId)} className="btn-press text-xs text-[var(--error)] transition-colors hover:underline">
                  {p.remove}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          {canDiscount && (
            <div>
              <label className="mb-1 block text-xs text-ink-500">{p.discount}</label>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded border border-ink-300 px-2 py-1.5 text-sm transition-colors focus:border-coral-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-ink-500">{p.paymentMethod}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
              className="w-full rounded border border-ink-300 px-2 py-1.5 text-sm transition-colors focus:border-coral-500 focus:outline-none"
            >
              <option value="cash">{p.paymentCash}</option>
              <option value="card">{p.paymentCard}</option>
              <option value="instapay">{p.paymentInstapay}</option>
              <option value="vodafone_cash">{p.paymentVodafoneCash}</option>
              <option value="other">{p.paymentOther}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{p.notes}</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-ink-300 px-2 py-1.5 text-sm transition-colors focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-ink-700">
            <span>{p.subtotal}</span>
            <span>
              {subtotal} {dict.common.currency}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold text-ink-900">
            <span>{p.total}</span>
            <span>
              {total} {dict.common.currency}
            </span>
          </div>

          <button
            disabled={!canSell || submitting || cart.length === 0}
            onClick={completeSale}
            className="btn-press w-full rounded-full bg-coral-500 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-50"
          >
            {submitting ? p.completing : p.completeSale}
          </button>
        </div>
      </div>
    </div>
  );
}
