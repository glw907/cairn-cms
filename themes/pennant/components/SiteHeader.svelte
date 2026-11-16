<!-- @component
This site's public header: a bar in the club's color 1 (`--color-neutral`, with
`--color-neutral-content` on it) over a rule in color 2. It carries the crest and the site name on
the left, up to five primary nav links, a Join button, and the color-mode toggle. Every color reads
a role custom property, never a literal, and every text and ground pair it paints is one the theme's
contrast audit measures: `--color-neutral-content` on `--color-neutral` for the bar, its links, its
focus ring, and the menu, and `--color-secondary-content` on `--color-secondary` for the Join
button. The inner row caps at `--container-measure-wide`, the home body's width.

The site name is `page.data.siteName`, the root layout server load's one composed reading of
`siteConfig.siteName`; this component never imports `siteConfig` itself. `page.data.siteName` is
optional in `App.PageData` (a root load that throws before setting it still type-checks), so the
brand link falls back to an `aria-label` of "Home" rather than shipping with no accessible name.
The crest's initials come from the same name.

The nav links come from `page.data.nav`, the site's `menus.primary` (`site.config.yaml`), and only
the first five top-level links with a url render. The Join button is the first link of
`page.data.actions`, the site's `menus.actions`; with no such menu, no button renders. The current
route's link gets `aria-current="page"` and an underline. A link into `/admin` renders
`rel="external"` (the shared `isAdminHref` predicate, also used by `SiteFooter`) so SvelteKit's
prerender crawler skips a target that answers every crawl-time request with a 400 by design.

Under 760px the links fold into a native `<details>` menu that opens with no script, and the site
name wraps rather than overflowing at 320px. The menu closes on each navigation because it is
keyed on the path.

The color-mode toggle sets `data-theme` on `<html>` between `pennant` and `pennant-dark` and
persists the choice to a `cairn-site-theme` cookie (path `/`, a year); the inline script in
`app.html` reads that cookie before first paint so a returning visitor's choice never flashes the
system default. With no stored choice, the page renders in the site's default mode, or, where the
site sets none, follows the OS setting live through the `prefers-color-scheme` block in
`tokens/tokens.css`, with no JS: the toggle is a standing override from the first explicit choice
on, never a tri-state control.

The bar scrolls with the page rather than sticking: a long name or five links fold it to two rows
on a narrow desktop, and a sticky bar that tall would cover a jumped-to heading.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/env';
  import { resolveTheme, toggleThemeWithTransition } from '#chassis/theme-toggle.js';
  import type { NavNode } from '@glw907/cairn-cms';
  import Crest from './Crest.svelte';
  import { isAdminHref } from './admin-link.js';
  import { themeConfig, type Theme } from '../theme-names.js';

  type NavLink = NavNode & { url: string };

  const hasUrl = (item: NavNode): item is NavLink => item.url !== undefined;

  const nav = $derived((page.data.nav ?? []).filter(hasUrl).slice(0, 5));

  // `actions` is not a member of the template's `App.PageData`, so it reads as `any`; the root
  // layout server load returns it from `readMenu`, which yields NavNode[].
  const join = $derived(((page.data.actions ?? []) as NavNode[]).filter(hasUrl)[0]);

  const siteName = $derived(page.data.siteName ?? '');

  /**
   * Whether a nav item points at the page being viewed. The home link matches only the exact root;
   * a deeper link matches its path or anything nested under it, so an article page still lights
   * its section.
   */
  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  // The icon is correct on first paint even before any explicit choice exists (resolveTheme reads
  // `<html>`'s live data-theme, set by the head script, or the scheme the root renders in). Never
  // called during SSR (`browser` guards every call site), so `document`/`window` are always safe.
  let theme = $state<Theme>(browser ? resolveTheme(themeConfig) : themeConfig.light);

  /**
   * Flips the explicit theme via the chassis mechanism, which also persists the choice and gates
   * a short cross-fade behind a temporary class (instant under prefers-reduced-motion).
   */
  function toggleTheme() {
    theme = toggleThemeWithTransition(themeConfig, theme);
  }
</script>

{#snippet links(list: NavLink[])}
  {#each list as item (item.url)}
    <a
      href={item.url}
      aria-current={isCurrent(item.url) ? 'page' : undefined}
      rel={isAdminHref(item.url) ? 'external' : undefined}>{item.label}</a
    >
  {/each}
{/snippet}

<header class="site-header">
  <div class="row" class:two-rows={nav.length > 0 || join !== undefined}>
    <a href="/" class="brand" aria-label={siteName || 'Home'}>
      <Crest {siteName} />
      <span class="name">{siteName}</span>
    </a>

    <div class="tools">
      {#if nav.length > 0}
        <nav class="links" aria-label="Primary">
          {@render links(nav)}
        </nav>

        {#key page.url.pathname}
          <details class="menu">
            <summary>Menu</summary>
            <nav class="menu-panel" aria-label="Primary">
              {@render links(nav)}
            </nav>
          </details>
        {/key}
      {/if}

      {#if join}
        <a
          href={join.url}
          class="join"
          rel={isAdminHref(join.url) ? 'external' : undefined}>{join.label}</a
        >
      {/if}

      <button
        type="button"
        onclick={toggleTheme}
        aria-label={theme === themeConfig.dark ? 'Switch to light mode' : 'Switch to dark mode'}
        class="toggle"
      >
        {#if theme === themeConfig.dark}
          <!-- Sun: shown while dark is active, click to switch to light. -->
          <svg
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
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.4 14.9A8.5 8.5 0 1 1 9.6 4.1a7 7 0 0 0 10.8 10.8z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .site-header {
    position: relative;
    z-index: 20;
    background: var(--color-neutral);
    color: var(--color-neutral-content);
    border-bottom: 5px solid var(--color-secondary);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
    max-width: var(--container-measure-wide);
    margin-inline: auto;
    padding: 0.75rem 1.75rem;
  }

  /* The links, the Join button, and the toggle wrap as one group, so a row too narrow for all of
     them drops the whole group to a second line, right-aligned, rather than stranding one piece. */
  .tools {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    margin-right: auto;
    color: inherit;
    text-decoration: none;
    font-size: var(--text-step-2);
  }
  .name {
    min-width: 0;
    overflow-wrap: break-word;
    font-family: var(--font-brand);
    font-weight: 800;
    font-size: var(--text-step-3);
    line-height: 1;
    letter-spacing: var(--tracking-display);
    text-transform: uppercase;
  }

  /* Every link, the summary, the Join button, and the toggle paint the bar's own text color, and
     each marks hover and the current page with an underline rather than a tinted ground, so the
     bar never paints a pair the contrast audit does not measure. */
  .links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
  }
  .links a,
  .menu-panel a,
  .menu summary,
  .join {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-0);
    line-height: 1.5;
    padding: 6px 12px;
    border-radius: var(--radius-field);
    color: inherit;
    text-decoration: none;
    text-underline-offset: 5px;
    text-decoration-thickness: 2px;
  }
  .links a:hover,
  .menu-panel a:hover,
  .join:hover,
  .site-header [aria-current='page'] {
    text-decoration-line: underline;
  }

  .join {
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
    padding-inline: 16px;
    background: var(--color-secondary);
    color: var(--color-secondary-content);
    border: 2px solid color-mix(in oklab, var(--color-neutral-content) 70%, transparent);
  }

  .toggle {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 2.75rem;
    height: 2.75rem;
    border: 2px solid transparent;
    border-radius: var(--radius-field);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .toggle svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .menu {
    display: none;
  }
  .menu summary {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    cursor: pointer;
    list-style: none;
    border: 1px solid color-mix(in oklab, var(--color-neutral-content) 40%, transparent);
  }
  .menu summary::-webkit-details-marker {
    display: none;
  }
  .menu[open] summary {
    border-color: currentColor;
  }
  /* The open menu drops below the bar, over the page, on the bar's own ground. It is placed against
     the header (the positioned ancestor) so it spans the full width whatever the row wraps to. */
  .menu-panel {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1.125rem 1rem;
    background: var(--color-neutral);
    color: var(--color-neutral-content);
    border-top: 1px solid color-mix(in oklab, var(--color-neutral-content) 40%, transparent);
    border-bottom: 5px solid var(--color-secondary);
  }
  .menu-panel a {
    padding-block: 10px;
  }

  /* The chassis focus ring paints `--color-primary`, which is measured only on the base grounds;
     on the bar the ring is the bar's own text color. */
  .site-header :is(a, summary, button):focus-visible {
    outline: 2px solid var(--color-neutral-content);
    outline-offset: 2px;
  }

  @media (max-width: 759.98px) {
    .row {
      row-gap: 0;
      padding-inline: 1.125rem;
    }
    .brand {
      flex: 1 1 0;
    }
    .name {
      font-size: var(--text-step-2);
    }
    .tools {
      display: contents;
    }
    .links {
      display: none;
    }
    .menu {
      display: block;
      order: 2;
    }
    .join {
      order: 3;
    }
    /* The toggle stays on the first row beside the name; the menu and the Join button take the
       second, so a long name and a long Join label never compete for one line. The full-width
       pseudo-element is the line break between the rows, and its height is their gap. */
    .toggle {
      order: 1;
    }
    .menu {
      flex: none;
    }
    .join {
      flex: 0 1 auto;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .two-rows::after {
      content: '';
      order: 1;
      flex-basis: 100%;
      height: 0.75rem;
    }
  }
</style>
