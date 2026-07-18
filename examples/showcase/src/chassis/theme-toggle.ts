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

/**
 * The class `theme.css` transitions its color-bearing chrome rules under. Applied to `<html>` only
 * for the duration of one flip (below), never left on, so a scheme change from the OS or from first
 * paint never animates, only an explicit toggle click does.
 */
const FLIP_TRANSITION_CLASS = 'theme-flip-transition';

/**
 * How long (ms) the transition class stays applied before a safety-net removal, a little past
 * theme.css's own ~200ms cross-fade so a `transitionend` race never clears it early.
 */
const FLIP_TRANSITION_TIMEOUT_MS = 300;

/**
 * Flips `current` the same way {@link toggleTheme} does, wrapped in a short color cross-fade: a
 * transition class lands on `<html>` just before the theme attribute changes and lifts again on the
 * root's `transitionend` (with a timeout fallback, in case no matched property actually transitions
 * on a given page). Instant, no class at all, under `prefers-reduced-motion`.
 */
export function toggleThemeWithTransition<T extends string>(config: ThemeToggleConfig<T>, current: T): T {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return toggleTheme(config, current);
  }
  const root = document.documentElement;
  const clear = () => root.classList.remove(FLIP_TRANSITION_CLASS);
  root.addEventListener('transitionend', clear, { once: true });
  setTimeout(clear, FLIP_TRANSITION_TIMEOUT_MS);
  root.classList.add(FLIP_TRANSITION_CLASS);
  return toggleTheme(config, current);
}
