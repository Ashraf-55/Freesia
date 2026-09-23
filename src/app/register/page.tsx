"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export default function RegisterPage() {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const a = dict.auth;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      phone: form.get("phone"),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? a.registerGenericError);
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      portal: "customer",
      redirect: false,
    });
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="animate-fade-up mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold text-ink-900">{a.registerTitle}</h1>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{error}</p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.name}</label>
          <input
            name="name"
            required
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.email}</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.phone}</label>
          <input
            name="phone"
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.password}</label>
          <input
            type="password"
            name="password"
            minLength={8}
            required
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full rounded-full bg-coral-500 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
        >
          {loading ? a.registerButtonLoading : a.registerButton}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-700">
        {a.haveAccount} <Link href="/login" className="font-semibold text-coral-600">{dict.nav.login}</Link>
      </p>
    </div>
  );
}
