<!-- @component
This site's public header: an owned, copy-in chrome component on the token layer. A sticky
band over a translucent `base-100` with a hairline bottom, carrying the site's wordmark on the left
and the primary nav plus the theme toggle on the right. Every colour and size reads a DaisyUI role
utility or a cairn token (`--font-display`, `--cairn-*`), never a literal, and the inner content caps
at `--container-measure` so the wordmark's left edge lines up with the article column below it.

The wordmark text is `page.data.siteName`, the root layout server load's one composed reading of
`siteConfig.siteName`; this component never imports `siteConfig` itself. `page.data.siteName` is
optional in `App.PageData` (a root load that throws before setting it still type-checks), so the
brand link falls back to an `aria-label` of "Home" rather than shipping with no accessible name.

The nav links come from `page.data.nav`, the site's `menus.primary` (`site.config.yaml`), resolved
by the root layout server load and edited from `/admin/nav`; a site owner edits this file to
re-shape the chrome itself, and the look re-skins from `theme.css` with no edit here. The current
route's nav link gets `aria-current="page"` and the accent colour; the `/admin` entry renders
`rel="external"` (the shared `isAdminHref` predicate, also used by `SiteFooter`) so SvelteKit's
prerender crawler skips a target that answers every crawl-time request with a 400 by design.

The theme toggle sets `data-theme` on `<html>` between `cairn` and `cairn-dark` and persists the
choice to a `cairn-site-theme` cookie (path `/`, a year); the inline script in `app.html` reads that
cookie before first paint so a returning visitor's choice never flashes the system default. With no
stored choice, `theme.css`'s own `prefers-color-scheme` block follows the OS setting live, with no
JS: the toggle is a standing override from the first explicit choice on, never a tri-state control.

The layout is no-JS-first responsive, with a deliberate two-row lockup below the `md` breakpoint
rather than an unplanned wrap; see the markup comment above the nav/toggle group for the mechanism.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import {
    resolveTheme,
    toggleThemeWithTransition,
    type ThemeToggleConfig,
  } from '$chassis/theme-toggle.js';
  import type { NavNode } from '@glw907/cairn-cms';
  import { isAdminHref } from './admin-link.js';

  // The root layout server load resolves menus.primary into NavNode[] and hands it down through
  // page.data (both mounts of this component, the (site) layout and the root +error.svelte, sit
  // under that same root load). A node with no url is a label-only grouping header; this header
  // renders only top-level entries with a url, flat.
  const nav = $derived(
    (page.data.nav ?? []).filter(
      (item): item is NavNode & { url: string } => item.url !== undefined,
    ),
  );

  // page.data.siteName is only ever unset when the root load itself throws before reaching this
  // component (the root +error.svelte mount); 'Home' keeps the brand link's accessible name from
  // going empty in that case, without inventing a site title.
  const siteName = $derived(page.data.siteName ?? '');

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
  const themeConfig: ThemeToggleConfig<Theme> = {
    light: 'cairn',
    dark: 'cairn-dark',
    cookieName: 'cairn-site-theme',
  };

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
      aria-label={siteName || 'Home'}
    >
      <!-- Nowrap keeps the name on one line at any width; the header's own flex-wrap (above) is what
           makes the row give way, dropping the nav below rather than squeezing the wordmark's letters. -->
      <span class="whitespace-nowrap font-display text-step-1 font-semibold tracking-tight"
        >{siteName}</span
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
        {#each nav as item (item.url)}
          {@const current = isCurrent(item.url)}
          <a
            href={item.url}
            aria-current={current ? 'page' : undefined}
            rel={isAdminHref(item.url) ? 'external' : undefined}
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
        class="theme-toggle cairn-focus-ring order-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-field text-muted hover:text-base-content md:order-none"
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
    outline: var(--cairn-focus-ring-outline);
    outline-offset: var(--cairn-focus-ring-offset);
  }
  .theme-toggle {
    transition: color 0.15s;
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
