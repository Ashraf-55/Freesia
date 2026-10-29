import type { Locale } from "./dictionaries";

export type { Locale, Dictionary } from "./dictionaries";

export const locales: Locale[] = ["ar", "en"];
export const defaultLocale: Locale = "ar";
export const LOCALE_COOKIE = "freesia_locale";

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function dateLocaleFor(locale: Locale): string {
  return locale === "ar" ? "ar-EG" : "en-US";
}
