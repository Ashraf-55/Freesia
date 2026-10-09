"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

type Warehouse = { id: string; name: string };
type ProductOption = { id: string; name: string };
type Line = { productId: string; quantity: number };

export default function TransferForm({ warehouses, products }: { warehouses: Warehouse[]; products: ProductOption[] }) {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const tp = dict.adminTransfersPage;

  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: products[0]?.id ?? "", quantity: 1 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (fromWarehouseId === toWarehouseId) {
      setError(tp.sameWarehouseError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          toWarehouseId,
          items: lines.filter((l) => l.productId && l.quantity > 0),
          notes: notes || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? tp.genericError);
        return;
      }
      setSuccess(true);
      setLines([{ productId: products[0]?.id ?? "", quantity: 1 }]);
      setNotes("");
      router.refresh();
    } catch {
      setError(tp.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</p>}
      {success && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-[var(--success)]">{tp.success}</p>}

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">{tp.from}</label>
          <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className="rounded border border-ink-300 px-3 py-1.5 text-sm transition-colors focus:border-coral-500 focus:outline-none">
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">{tp.to}</label>
          <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="rounded border border-ink-300 px-3 py-1.5 text-sm transition-colors focus:border-coral-500 focus:outline-none">
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={line.productId}
              onChange={(e) => updateLine(idx, { productId: e.target.value })}
              className="flex-1 rounded border border-ink-300 px-3 py-1.5 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
              className="w-24 rounded border border-ink-300 px-2 py-1.5 text-sm"
            />
            {lines.length > 1 && (
              <button type="button" onClick={() => removeLine(idx)} className="btn-press text-xs text-[var(--error)] transition-colors hover:underline">
                {tp.removeLine}
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addLine} className="btn-press text-sm font-medium text-coral-600 transition-colors hover:underline">
          + {tp.addLine}
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-ink-500">{tp.notes}</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border border-ink-300 px-3 py-1.5 text-sm transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-press rounded-full bg-coral-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-50"
      >
        {submitting ? tp.creating : tp.createTransfer}
      </button>
    </form>
  );
}
