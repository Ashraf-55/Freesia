"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

export default function ResetPasswordForm() {
  const { dict } = useClientDictionary();
  const a = dict.auth;
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(a.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(a.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
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

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 text-center">
        <p className="rounded-[var(--radius-md)] bg-red-50 px-4 py-4 text-sm text-[var(--error)]">{a.missingToken}</p>
        <Link href="/forgot-password" className="mt-6 font-semibold text-coral-600">
          {a.forgotPasswordLink}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 text-center">
        <div className="rounded-[var(--radius-md)] bg-green-50 px-4 py-4 text-sm text-[var(--success)]">
          {a.resetPasswordSuccess}
        </div>
        <Link
          href="/login"
          className="mt-6 rounded-full bg-coral-500 py-2.5 font-semibold text-white hover:bg-coral-600"
        >
          {a.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-2xl font-bold text-ink-900">{a.resetPasswordTitle}</h1>
      <p className="mb-6 text-center text-sm text-ink-500">{a.resetPasswordSubtitle}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.newPassword}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 pe-16 focus:border-coral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 end-3 text-xs font-medium text-ink-500 hover:text-coral-600"
            >
              {showPassword ? a.hidePassword : a.showPassword}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.confirmNewPassword}</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-[var(--error)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full rounded-full bg-coral-500 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
        >
          {loading ? a.resettingPassword : a.resetPasswordButton}
        </button>
      </form>
    </div>
  );
}
