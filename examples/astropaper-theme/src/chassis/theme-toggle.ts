// The chassis's light/dark theme-toggle mechanism: read the live `data-theme` (or the system
// scheme, with no explicit choice yet), flip it, and persist the choice to a cookie so it
// survives a reload. The mechanism knows nothing about which two DaisyUI theme names a theme
// declares; every call site passes its own ThemeToggleConfig, so a differently-named theme (or a
// second theme entirely) reuses this module unchanged. Every function here assumes it runs in the
// browser (guard with `$app/environment`'s `browser` at the call site); none of it is SSR-safe.

/** A theme's own light/dark DaisyUI theme names and the cookie that persists the visitor's choice. */
export interface ThemeToggleConfig<T extends string> {
  /** The DaisyUI theme name applied in light mode. */
  light: T;
  /** The DaisyUI theme name applied in dark mode. */
  dark: T;
  /** The cookie name the choice persists to (path `/`, a year, `samesite=lax`). */
  cookieName: string;
}

/**
 * Resolves which of a theme's two names should be showing right now: `<html>`'s live
 * `data-theme` if an explicit choice (the visitor's toggle, or the head script reading the
 * persistence cookie) already set one, otherwise the current system scheme.
 */
export function resolveTheme<T extends string>(config: ThemeToggleConfig<T>): T {
  const attr = document.documentElement.getAttribute('data-theme');
  // Equality narrowing against a generic parameter does not narrow `attr`'s type to `T`; the
  // check above already proves it, so the cast just states what the runtime check guarantees.
  if (attr === config.light || attr === config.dark) return attr as T;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? config.dark : config.light;
}

/** Applies `theme` to `<html>` and writes it to the persistence cookie. */
export function applyTheme<T extends string>(config: ThemeToggleConfig<T>, theme: T): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.cookie = `${config.cookieName}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/** Flips `current` to the other of the config's two names, applies it, and returns the new value. */
export function toggleTheme<T extends string>(config: ThemeToggleConfig<T>, current: T): T {
  const next = current === config.dark ? config.light : config.dark;
  applyTheme(config, next);
  return next;
}
