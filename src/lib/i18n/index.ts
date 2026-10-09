import { cookies } from "next/headers";
import { dictionaries, dictionaryFor, type Locale } from "./dictionaries";
import { locales, defaultLocale, LOCALE_COOKIE, dirFor, dateLocaleFor } from "./shared";

export type { Locale, Dictionary } from "./dictionaries";
export { locales, defaultLocale, LOCALE_COOKIE, dirFor, dateLocaleFor, dictionaryFor };

/** Server-side: read the active locale from the request cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "en" || value === "ar" ? value : defaultLocale;
}

/** Server-side: get the full dictionary for the active locale. */
export async function getDictionary() {
  const locale = await getLocale();
  return { locale, dict: dictionaries[locale] };
}
