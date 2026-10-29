"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/set-locale";
import type { Locale } from "@/lib/i18n/shared";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocale(next, pathname ?? "/");
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center overflow-hidden rounded-full border border-ink-300 text-xs font-semibold"
      role="group"
      aria-label="Language / اللغة"
    >
      <button
        type="button"
        onClick={() => switchTo("ar")}
        disabled={isPending}
        aria-pressed={locale === "ar"}
        className={`btn-press px-2.5 py-1 transition-all duration-300 ${
          locale === "ar" ? "bg-coral-500 text-white" : "text-ink-500 hover:text-coral-600"
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={isPending}
        aria-pressed={locale === "en"}
        className={`btn-press px-2.5 py-1 transition-all duration-300 ${
          locale === "en" ? "bg-coral-500 text-white" : "text-ink-500 hover:text-coral-600"
        }`}
      >
        EN
      </button>
    </div>
  );
}
