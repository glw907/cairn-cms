<!-- @component
The Foxi port's public site header, styled after `src/components/ui/NavigationBar.astro`
(oxygenna-themes/foxi-astro-theme, MIT). A wordmark on the left, a primary nav with a
"Resources" disclosure (Blog, Changelog, FAQ, Terms) in the middle, and a CTA button plus a
light/dark toggle on the right. Below `lg` the nav collapses behind a menu button, an idiomatic
Svelte 5 `$state` disclosure replacing the original's own script. Every color reads a DaisyUI
role utility or a cairn token, never a literal, so the whole header re-skins from `theme.css`
with no edit here.

The theme toggle uses the chassis mechanism (`$chassis/theme-toggle.js`), configured with this
port's own theme names and cookie.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { resolveTheme, toggleTheme as chassisToggleTheme, type ThemeToggleConfig } from '$chassis/theme-toggle.js';

  /** The two explicit theme choices; `theme.css` defines both as named DaisyUI themes. */
  type Theme = 'foxi' | 'foxi-dark';

  const themeConfig: ThemeToggleConfig<Theme> = {
    light: 'foxi',
    dark: 'foxi-dark',
    cookieName: 'foxi-site-theme',
  };

  let theme = $state<Theme>(browser ? resolveTheme(themeConfig) : 'foxi');

  function toggleTheme() {
    theme = chassisToggleTheme(themeConfig, theme);
  }

  /** A primary-nav entry: the visible label, the path it links to, and an optional dropdown of
   *  sub-links (Foxi's own "Resources" menu). */
  type NavSubItem = { label: string; href: string };
  type NavItem = { label: string; href: string; submenu?: NavSubItem[] };
  const nav: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Features', href: '/features' },
    {
      label: 'Resources',
      href: '#',
      submenu: [
        { label: 'Blog', href: '/blog' },
        { label: 'Changelog', href: '/changelog' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Terms', href: '/terms' },
      ],
    },
    { label: 'Contact', href: '/contact' },
  ];

  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    return path === href || (href !== '/' && path.startsWith(`${href}/`));
  }

  /** The mobile menu's open state. */
  let menuOpen = $state(false);
</script>

<header class="sticky top-0 z-40 border-b border-card-border bg-base-100/95 backdrop-blur">
  <div class="site-wide flex items-center justify-between gap-s py-s">
    <a href="/" class="inline-flex items-center gap-2 font-display text-step-2 font-bold text-base-content no-underline">
      <svg class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M12 2c1.7 2 3 3.7 3 5.7 0 1-.4 1.8-1 2.5 1.8.7 3 2.5 3 4.6 0 3-2.6 5.2-5 6.7v.5h-2 v-.5c-2.4-1.5-5-3.7-5-6.7 0-2.1 1.2-3.9 3-4.6-.6-.7-1-1.5-1-2.5C6 5.7 7.3 4 9 2c.3 1 .8 2 1.5 2.7C11 4 11.5 3 12 2Z"
        />
      </svg>
      Foxi.
    </a>

    <nav class="hidden items-center gap-l text-step--1 font-medium lg:flex" aria-label="Primary">
      {#each nav as item (item.label)}
        {#if item.submenu}
          <div class="dropdown">
            <button
              type="button"
              class="focus-outline inline-flex items-center gap-1 text-base-content hover:text-primary"
              aria-haspopup="true"
            >
              {item.label}
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <ul class="dropdown-content menu z-50 mt-3 w-40 rounded-box border border-card-border bg-base-100 p-2 shadow-lg">
              {#each item.submenu as sub (sub.href)}
                <li>
                  <a href={sub.href} class={isCurrent(sub.href) ? 'text-primary' : 'text-base-content'}>{sub.label}</a>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <a
            href={item.href}
            aria-current={isCurrent(item.href) ? 'page' : undefined}
            class="no-underline {isCurrent(item.href) ? 'text-primary' : 'text-base-content hover:text-primary'}"
          >
            {item.label}
          </a>
        {/if}
      {/each}
    </nav>

    <div class="flex items-center gap-xs">
      <a
        href="/pricing"
        class="hidden h-10 items-center justify-center rounded-field bg-primary px-5 text-step--1 font-bold text-primary-content no-underline hover:opacity-90 sm:inline-flex"
      >
        Try it now
      </a>

      <button
        type="button"
        onclick={toggleTheme}
        aria-label={theme === 'foxi-dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        class="focus-outline inline-flex h-10 w-10 items-center justify-center text-base-content hover:text-primary"
      >
        {#if theme === 'foxi-dark'}
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

      <button
        type="button"
        class="focus-outline inline-flex h-10 w-10 items-center justify-center text-base-content lg:hidden"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-menu"
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
    </div>
  </div>

  {#if menuOpen}
    <nav id="mobile-nav-menu" class="border-t border-card-border px-m py-s lg:hidden" aria-label="Primary, mobile">
      <ul class="flex flex-col gap-2xs text-step-0">
        {#each nav as item (item.label)}
          {#if item.submenu}
            <li class="pt-2xs font-semibold text-base-content">{item.label}</li>
            {#each item.submenu as sub (sub.href)}
              <li><a href={sub.href} class="block py-1 pl-m text-base-content hover:text-primary">{sub.label}</a></li>
            {/each}
          {:else}
            <li><a href={item.href} class="block py-1 text-base-content hover:text-primary">{item.label}</a></li>
          {/if}
        {/each}
      </ul>
    </nav>
  {/if}
</header>

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
