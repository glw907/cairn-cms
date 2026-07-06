<!-- @component
The hugo-theme-gallery port's public header, styled after the upstream demo's own `<header>` +
slide-down `<menu>` (nicokaiser/hugo-theme-gallery, MIT). The upstream never expands to an inline
desktop nav at any width: navigation always lives behind the hamburger disclosure, a deliberate
minimal identity trait this port keeps rather than "fixing" into a wider breakpoint. The left
slot is the "Gallery" wordmark on the home page and a plain back arrow (always to home, matching
the upstream exactly) everywhere else. The light/dark toggle is this port's own addition: the
upstream hardcodes one dark theme; the mechanism is the family's usual chassis seam
(`$chassis/theme-toggle.js`), so it costs nothing to offer.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { resolveTheme, toggleTheme as chassisToggleTheme, type ThemeToggleConfig } from '$chassis/theme-toggle.js';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import XIcon from '@lucide/svelte/icons/x';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import SunIcon from '@lucide/svelte/icons/sun';
  import MoonIcon from '@lucide/svelte/icons/moon';

  type Theme = 'gallery' | 'gallery-light';

  const themeConfig: ThemeToggleConfig<Theme> = {
    light: 'gallery-light',
    dark: 'gallery',
    cookieName: 'gallery-site-theme',
  };

  let theme = $state<Theme>(browser ? resolveTheme(themeConfig) : 'gallery');

  function toggleTheme() {
    theme = chassisToggleTheme(themeConfig, theme);
  }

  /** The upstream's own top-level nav, hardcoded (like the AstroPaper and Foxi ports before it):
   *  a small, fixed content tree does not need a data-driven nav builder. */
  const nav = [
    { label: 'Home', href: '/' },
    { label: 'Animals', href: '/animals' },
    { label: 'Fashion & Beauty', href: '/fashion-beauty' },
    { label: 'Nature', href: '/nature' },
    { label: 'About', href: '/about' },
  ];

  const isHome = $derived(page.url.pathname === '/');
  let menuOpen = $state(false);
</script>

<header class="flex min-h-16 w-full items-center justify-between p-2xs sm:mb-l">
  {#if isHome}
    <a href="/" class="inline-flex h-12 items-center text-step-2 font-semibold text-base-content no-underline">
      Gallery
    </a>
  {:else}
    <a
      href="/"
      aria-label="Home"
      title="Home"
      class="focus-outline inline-flex h-12 w-12 items-center justify-center rounded-selector text-base-content"
    >
      <ArrowLeftIcon class="h-6 w-6" aria-hidden="true" />
    </a>
  {/if}

  <div class="inline-flex items-center gap-1">
    <button
      type="button"
      onclick={toggleTheme}
      aria-label={theme === 'gallery' ? 'Switch to light mode' : 'Switch to dark mode'}
      class="focus-outline inline-flex h-12 w-12 items-center justify-center rounded-selector text-base-content"
    >
      {#if theme === 'gallery'}
        <SunIcon class="h-5 w-5" aria-hidden="true" />
      {:else}
        <MoonIcon class="h-5 w-5" aria-hidden="true" />
      {/if}
    </button>
    <button
      type="button"
      id="menu-toggle"
      aria-expanded={menuOpen}
      aria-controls="site-menu"
      title="Menu"
      onclick={() => (menuOpen = !menuOpen)}
      class="focus-outline inline-flex h-12 w-12 items-center justify-center rounded-selector text-base-content"
    >
      {#if menuOpen}
        <XIcon class="h-6 w-6" aria-hidden="true" />
      {:else}
        <MenuIcon class="h-6 w-6" aria-hidden="true" />
      {/if}
      <span class="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
    </button>
  </div>
</header>

{#if menuOpen}
  <menu id="site-menu" class="site-narrow mb-xl list-none p-0 text-center text-step-2 font-semibold select-none">
    {#each nav as item (item.href)}
      <li>
        <a
          href={item.href}
          aria-current={page.url.pathname === item.href ? 'page' : undefined}
          onclick={() => (menuOpen = false)}
          class="inline-block py-2xs no-underline {page.url.pathname === item.href
            ? 'text-base-content'
            : 'text-muted hover:text-base-content'}"
        >
          {item.label}
        </a>
      </li>
    {/each}
  </menu>
{/if}

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
