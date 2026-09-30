// The light/dark toggle's one config: the two daisyUI theme names and the cookie that remembers a
// visitor's choice. `SiteHeader.svelte` imports it, so renaming a theme here reaches the toggle.
//
// Two touchpoints cannot import it and must change by hand with it:
//   1. `app.html`'s inline script, which reads the cookie before first paint. Its regex names the
//      cookie and both themes on purpose: after a rename, a returning visitor's stale cookie fails
//      the regex and the page falls back to the system scheme, where a regex that accepted any name
//      would pin that visitor to the default block for up to a year.
//   2. The two `@plugin "daisyui/theme"` blocks in `theme.css`, whose `name:` values are the
//      strings `data-theme` selects.
// `theme-names.test.ts` fails when either touchpoint drifts from this file.
import type { ThemeToggleConfig } from '$chassis/theme-toggle.js';

/** The two explicit theme choices; `theme.css` defines both as named daisyUI themes. */
export type Theme = 'cairn' | 'cairn-dark';

/** This theme's own names and cookie, fed to the chassis toggle mechanism. */
export const themeConfig: ThemeToggleConfig<Theme> = {
  light: 'cairn',
  dark: 'cairn-dark',
  cookieName: 'cairn-site-theme',
};
