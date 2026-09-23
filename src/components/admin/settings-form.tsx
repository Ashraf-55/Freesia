"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export default function SettingsForm({
  initial,
  warehouses,
}: {
  initial: { formspreeEndpoint: string; formspreeEnabled: boolean; onlineFulfillmentWarehouseId: string };
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const s = dict.settingsPage;
  const [endpoint, setEndpoint] = useState(initial.formspreeEndpoint);
  const [enabled, setEnabled] = useState(initial.formspreeEnabled);
  const [fulfillmentWarehouseId, setFulfillmentWarehouseId] = useState(initial.onlineFulfillmentWarehouseId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formspreeEndpoint: endpoint,
        formspreeEnabled: enabled,
        onlineFulfillmentWarehouseId: fulfillmentWarehouseId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(s.genericError);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[var(--radius-md)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <div>
        <h2 className="mb-1 font-bold text-ink-900">{s.formspreeTitle}</h2>
        <p className="text-sm text-ink-500">{s.formspreeHint}</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{s.formspreeEndpoint}</label>
        <input
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://formspree.io/f/xxxxxxx"
          dir="ltr"
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 text-start transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {s.formspreeEnabledLabel}
      </label>

      <div className="border-t border-ink-100 pt-5">
        <h2 className="mb-1 font-bold text-ink-900">{s.fulfillmentTitle}</h2>
        <p className="mb-3 text-sm text-ink-500">{s.fulfillmentHint}</p>
        <select
          value={fulfillmentWarehouseId}
          onChange={(e) => setFulfillmentWarehouseId(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        >
          <option value="">{s.fulfillmentNone}</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {warehouses.length === 0 && <p className="mt-2 text-xs text-[var(--error)]">{s.fulfillmentNoWarehouses}</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
      >
        {saving ? s.saving : saved ? s.saved : s.save}
      </button>
    </form>
  );
}
