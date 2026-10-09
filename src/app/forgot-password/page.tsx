"use client";

import { useState } from "react";
import Link from "next/link";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export default function ForgotPasswordPage() {
  const { dict } = useClientDictionary();
  const a = dict.auth;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // The API always answers 200 with a generic message regardless of
      // whether the account exists (no user enumeration) — a non-200
      // here means a real request/validation problem, not "not found".
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? a.resetGenericError);
        return;
      }
      setDone(true);
    } catch {
      setError(a.resetGenericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-2xl font-bold text-ink-900">{a.forgotPasswordTitle}</h1>
      <p className="mb-6 text-center text-sm text-ink-500">{a.forgotPasswordSubtitle}</p>

      {done ? (
        <div className="rounded-[var(--radius-md)] bg-green-50 px-4 py-4 text-center text-sm text-[var(--success)]">
          {a.forgotPasswordSuccess}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-[var(--error)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full rounded-full bg-coral-500 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
          >
            {loading ? a.sending : a.sendResetLink}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-700">
        <Link href="/login" className="font-semibold text-coral-600">
          {a.backToLogin}
        </Link>
      </p>
    </div>
  );
}
