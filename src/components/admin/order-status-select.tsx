"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

const STATUS_KEYS = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"] as const;

export default function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const [loading, setLoading] = useState(false);

  async function onChange(status: string) {
    setLoading(true);
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={currentStatus}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none"
    >
      {STATUS_KEYS.map((key) => (
        <option key={key} value={key}>{dict.orderStatus[key]}</option>
      ))}
    </select>
  );
}
