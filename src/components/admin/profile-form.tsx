"use client";

import { useState } from "react";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export default function ProfileForm({ initial }: { initial: { name: string; email: string; roleLabel: string } }) {
  const { dict } = useClientDictionary();
  const p = dict.adminProfilePage;

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, currentPassword, newPassword: newPassword || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? p.genericError);
        return;
      }

      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(p.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5 rounded-[var(--radius-md)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{p.roleLabel}</label>
        <p className="text-sm text-ink-500">{initial.roleLabel}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{p.name}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{p.email}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{p.newPassword}</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-500">{p.newPasswordHint}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">{p.currentPassword}</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
      >
        {saving ? p.saving : saved ? p.saved : p.save}
      </button>
    </form>
  );
}
