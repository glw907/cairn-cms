<!-- @component
The showcase's public site header: an owned, copy-in chrome component on the token layer. A sticky
band over a translucent `base-100` with a hairline bottom, carrying the site's wordmark on the left
and the primary nav plus the theme toggle on the right. The wordmark is a plain, glyph-free type
lockup (font-display, semibold, tracking-tight); cairn ships no logo mark on the public chrome by
default, so a theme that wants a brand glyph adds its own at the theme layer (the cairn theme
re-adds identity there). Every colour and size reads a DaisyUI role utility or a cairn token
(`--font-display`, `--cairn-*`), never a literal. The current route's nav link gets
`aria-current="page"` and the accent colour. The inner content caps at `--container-measure`, the
same width as the article and home reading column (`.site-main`), so the wordmark's left edge lines
up with the body copy below it rather than centering independently at a wider measure. A site owner
edits this file to re-shape the chrome; the look re-skins from `theme.css` with no edit here.

The theme toggle sets `data-theme` on `<html>` between `cairn` (light) and `cairn-dark`, and
persists the choice to a `cairn-site-theme` cookie (path `/`, a year) so it survives a reload; the
inline script in `app.html` reads that same cookie before first paint, so a returning visitor's
choice never flashes the system default first. With no stored choice, `data-theme` stays unset and
`theme.css`'s own `prefers-color-scheme` block follows the OS setting, live, with no JS at all: the
first-ever visit is system-driven, and the toggle is a standing override from then on, never a
tri-state "back to system" control. `theme` here reads `<html>`'s live attribute at component
construction, guarded by `$app/environment`'s `browser` so the SSR pass (which cannot see `document`)
never runs the browser branch; that read lands after the head script has already set the attribute,
so the button's icon matches the painted page with no separate correction step.

The layout is no-JS-first responsive, pure CSS, with a deliberate two-row lockup below the `md`
breakpoint (~48rem) rather than an unplanned wrap. The wordmark carries `white-space: nowrap` so it
can only wrap the row, not its letters. Below `md`, the nav and the theme toggle change places: the
toggle's `order` pulls it up beside the wordmark on row one (a `justify-between` pair), while the nav
(`w-full`) drops to its own row two, left-aligned. The wrapping div around the nav and toggle is
`display: contents` at that width, so its two children rejoin the header's own flex flow and the
`order` utilities can freely interleave them with the wordmark; at `md` and up the div becomes a real
flex box again (`md:flex`) and `order-none` restores source order (nav, then toggle), which is the
original single-row composition: wordmark left, nav and toggle grouped tight on the right. Nav links
keep a 44px-class touch target at every width, so the two-row lockup stays tappable, not just visible.

The primary nav reads as a tracked eyebrow at every width, not only on the phone lockup: uppercase,
`text-step--2` (a size under the caption step), `font-medium` at rest and `font-semibold` plus
`text-primary` on the current item, with the letter-spacing itself in `--cairn-caption-tracking`
(scoped to `.site-nav a` below), the header's own tracking value, narrower than the wider
`--tracking-eyebrow` label device used elsewhere on the site.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import {
    resolveTheme,
    toggleThemeWithTransition,
    type ThemeToggleConfig,
  } from '$chassis/theme-toggle.js';

  /** A primary-nav entry: the visible label and the path it links to. */
  type NavItem = { label: string; href: string };

  /** The showcase's real nav targets. A scaffolded site owner edits this list. */
  const nav: NavItem[] = [
    { label: 'Writing', href: '/' },
    { label: 'Styleguide', href: '/styleguide' },
    { label: 'Admin', href: '/admin' },
  ];

  /**
   * Whether a nav item points at the page being viewed. The home link matches only the exact root;
   * a deeper link matches its own path or anything nested under it, so an article page still lights
   * its section.
   */
  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  /** The two explicit theme choices; `theme.css` defines both as named DaisyUI themes. */
  type Theme = 'cairn' | 'cairn-dark';

  /** This theme's own names and cookie, fed to the chassis toggle mechanism below. */
  const themeConfig: ThemeToggleConfig<Theme> = { light: 'cairn', dark: 'cairn-dark', cookieName: 'cairn-site-theme' };

  // The icon is correct on first paint even before any explicit choice exists (resolveTheme reads
  // `<html>`'s live data-theme, set by the head script, or falls back to the system scheme). Never
  // called during SSR (`browser` guards every call site), so `document`/`window` are always safe.
  let theme = $state<Theme>(browser ? resolveTheme(themeConfig) : 'cairn');

  /**
   * Flips the explicit theme via the chassis mechanism, which also persists the choice and gates
   * a short cross-fade behind a temporary class (instant under prefers-reduced-motion).
   */
  function toggleTheme() {
    theme = toggleThemeWithTransition(themeConfig, theme);
  }
</script>

<header class="site-header sticky top-0 z-20 border-b border-card-border">
  <div
    class="mx-auto flex max-w-measure flex-wrap items-center justify-between gap-x-m gap-y-2xs px-m py-xs"
  >
    <a
      href="/"
      class="brand-link inline-flex min-h-11 items-center text-base-content no-underline"
    >
      <!-- Nowrap keeps the name on one line at any width; the header's own flex-wrap (above) is what
           makes the row give way, dropping the nav below rather than squeezing the wordmark's letters. -->
      <span
        class="whitespace-nowrap font-display text-step-1 font-semibold tracking-tight"
        >Waymark</span
      >
    </a>

    <!-- Below md this group is `contents`: it disappears from the box model, so the nav and the
         toggle rejoin the outer row's own flex flow as flat siblings of the wordmark, where `order`
         puts the toggle on row one beside the wordmark and the full-width nav on row two beneath it.
         At md and up the group becomes a real flex box again, and `order-none` restores the source
         order (nav, then toggle) as one unit, which is the original single-row composition: wordmark
         left, nav and toggle grouped tight on the right. -->
    <div class="contents md:flex md:flex-wrap md:items-center md:gap-s">
      <nav
        class="site-nav order-2 flex w-full flex-wrap items-center gap-s uppercase text-step--2 md:order-none md:w-auto"
        aria-label="Primary"
      >
        {#each nav as item (item.href)}
          {@const current = isCurrent(item.href)}
          <a
            href={item.href}
            aria-current={current ? 'page' : undefined}
            class="inline-flex min-h-11 items-center px-xs no-underline {current
              ? 'font-semibold text-primary'
              : 'font-medium text-muted hover:text-base-content'}"
          >
            {item.label}
          </a>
        {/each}
      </nav>

      <button
        type="button"
        onclick={toggleTheme}
        aria-label={theme === 'cairn-dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        class="theme-toggle order-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-field text-muted hover:text-base-content md:order-none"
      >
        {#if theme === 'cairn-dark'}
          <!-- Sun: shown while dark is active, click to switch to light. -->
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42"
            />
          </svg>
        {:else}
          <!-- Moon: shown while light is active, click to switch to dark. -->
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.4 14.9A8.5 8.5 0 1 1 9.6 4.1a7 7 0 0 0 10.8 10.8z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  /* The translucent band and the consistent focus ring read tokens that an inline utility cannot
     express cleanly (a color-mix background, a backdrop filter). Scoped to this component and gated
     behind reduced-motion where it animates. */
  .site-header {
    background: color-mix(in oklab, var(--color-base-100) 88%, transparent);
    backdrop-filter: saturate(1.4) blur(8px);
  }
  .site-nav a {
    letter-spacing: var(--cairn-caption-tracking);
    border-radius: var(--cairn-focus-ring-radius);
    transition: color 0.15s;
  }
  .site-nav a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .theme-toggle {
    transition: color 0.15s;
  }
  .theme-toggle:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  /* The brand link gets the same hover-and-transition idiom as the sibling nav links, so the
     wordmark reads as tappable rather than inert chrome. */
  .brand-link {
    transition: color 0.15s;
  }
  .brand-link:hover {
    color: var(--color-primary);
  }
  @media (prefers-reduced-motion: reduce) {
    .site-nav a,
    .theme-toggle,
    .brand-link {
      transition: none;
    }
  }
</style>
