import { nl, type Dictionary } from "./nl";

/**
 * Minimal i18n layer. Dutch is the only shipped locale (§1) but everything
 * is keyed through `dict` and `t()` so an English dictionary can be added
 * without touching components.
 */
const locales = { nl } as const;
export type Locale = keyof typeof locales;

export const defaultLocale: Locale = "nl";

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return locales[locale] ?? nl;
}

/** The active dictionary. Swap here when multi-locale routing lands. */
export const dict = getDictionary(defaultLocale);

/** Interpolate {placeholders} in a string template. */
export function t(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}
