<!-- @component
The AstroPaper port's public site header: an owned, copy-in chrome component on the token
layer, styled after AstroPaper's own `src/components/Header.astro` (satnaing/astro-paper, MIT).
A plain hairline band: a bold monospace wordmark on the left, and on the right a primary nav
(Posts, Tags, About), an Archives link, a Search link, and the light/dark toggle. Below the `sm`
breakpoint the nav collapses behind a menu button, matching the original's own JS-driven
disclosure; this port re-expresses that disclosure with a `$state` boolean rather than a
`querySelector` script, the idiomatic Svelte 5 seam. Every color and size reads a DaisyUI role
utility or a cairn token (`--font-display`, `--color-*`), never a literal, so the whole header
re-skins from `theme.css` with no edit here.

The theme toggle uses the same chassis mechanism the cairn theme's own header demonstrates
(`$chassis/theme-toggle.js`), configured with this port's own theme names and cookie.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { resolveTheme, toggleTheme as chassisToggleTheme, type ThemeToggleConfig } from '$chassis/theme-toggle.js';

  /** The two explicit theme choices; `theme.css` defines both as named DaisyUI themes. */
  type Theme = 'astropaper' | 'astropaper-dark';

  const themeConfig: ThemeToggleConfig<Theme> = {
    light: 'astropaper',
    dark: 'astropaper-dark',
    cookieName: 'astropaper-site-theme',
  };

  let theme = $state<Theme>(browser ? resolveTheme(themeConfig) : 'astropaper');

  function toggleTheme() {
    theme = chassisToggleTheme(themeConfig, theme);
  }

  /** A primary-nav entry: the visible label and the path it links to. */
  type NavItem = { label: string; href: string };
  const nav: NavItem[] = [
    { label: 'Posts', href: '/posts' },
    { label: 'Tags', href: '/tags' },
    { label: 'About', href: '/about' },
  ];

  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    return path === href || path.startsWith(`${href}/`);
  }

  /** The mobile menu's open state, an idiomatic Svelte 5 rune replacing the original's own
   *  `querySelector` menu-button script. */
  let menuOpen = $state(false);
</script>

<header class="site-header bg-base-100">
  <div class="mx-auto flex max-w-measure flex-wrap items-center justify-between gap-s border-b border-card-border px-m py-s sm:py-m">
    <a href="/" class="text-step-1 font-bold text-base-content no-underline sm:text-step-2">
      AstroPaper
    </a>

    <button
      type="button"
      class="focus-outline inline-flex h-11 w-11 items-center justify-center text-base-content sm:hidden"
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={menuOpen}
      aria-controls="nav-menu"
      onclick={() => (menuOpen = !menuOpen)}
    >
      {#if menuOpen}
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" stroke-linecap="round" />
        </svg>
      {:else}
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
        </svg>
      {/if}
    </button>

    <nav
      id="nav-menu"
      class="site-nav w-full flex-col items-center gap-s text-step--1 sm:flex sm:w-auto sm:flex-row sm:gap-m {menuOpen
        ? 'flex'
        : 'hidden'}"
      aria-label="Primary"
    >
      {#each nav as item (item.href)}
        {@const current = isCurrent(item.href)}
        <a
          href={item.href}
          aria-current={current ? 'page' : undefined}
          class="inline-flex min-h-11 items-center font-medium no-underline {current
            ? 'underline decoration-wavy decoration-2 underline-offset-8'
            : 'text-base-content hover:text-primary'}"
        >
          {item.label}
        </a>
      {/each}

      <a
        href="/archives"
        aria-current={isCurrent('/archives') ? 'page' : undefined}
        aria-label="Archives"
        title="Archives"
        class="focus-outline inline-flex h-11 w-11 items-center justify-center text-base-content hover:text-primary {isCurrent(
          '/archives',
        )
          ? 'text-primary'
          : ''}"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 4h16v4H4z" stroke-linejoin="round" />
          <path d="M5 8v12h14V8M10 12h4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="sr-only">Archives</span>
      </a>

      <a
        href="/search"
        aria-current={isCurrent('/search') ? 'page' : undefined}
        aria-label="Search"
        title="Search"
        class="focus-outline inline-flex h-11 w-11 items-center justify-center text-base-content hover:text-primary {isCurrent(
          '/search',
        )
          ? 'text-primary'
          : ''}"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4.35-4.35" stroke-linecap="round" />
        </svg>
        <span class="sr-only">Search</span>
      </a>

      <button
        type="button"
        onclick={toggleTheme}
        aria-label={theme === 'astropaper-dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        class="focus-outline inline-flex h-11 w-11 items-center justify-center text-base-content hover:text-primary"
      >
        {#if theme === 'astropaper-dark'}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42" />
          </svg>
        {:else}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.4 14.9A8.5 8.5 0 1 1 9.6 4.1a7 7 0 0 0 10.8 10.8z" />
          </svg>
        {/if}
      </button>
    </nav>
  </div>
</header>

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
