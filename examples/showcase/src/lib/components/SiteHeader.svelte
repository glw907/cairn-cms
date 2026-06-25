<!-- @component
The showcase's public site header: an owned, copy-in chrome component on the token layer. A sticky
band over a translucent `base-100` with a hairline bottom, carrying the cairn brand mark plus
wordmark on the left and the primary nav on the right. Every colour and size reads a DaisyUI role
utility or a cairn token (`--font-display`, `--cairn-*`), never a literal. The current route's nav
link gets `aria-current="page"` and the accent colour. A site owner edits this file to re-shape the
chrome; the look re-skins from `theme.css` with no edit here.
-->
<script lang="ts">
  import { page } from '$app/state';

  /** A primary-nav entry: the visible label and the path it links to. */
  type NavItem = { label: string; href: string };

  /** The showcase's real nav targets. A scaffolded site owner edits this list. */
  const nav: NavItem[] = [
    { label: 'Writing', href: '/' },
    { label: 'Calendar', href: '/calendar' },
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
</script>

<header class="site-header sticky top-0 z-20 border-b border-[color:var(--cairn-card-border)]">
  <div
    class="mx-auto flex max-w-[var(--cairn-measure-wide)] items-center justify-between gap-[var(--cairn-space-m)] px-[var(--cairn-space-m)] py-[var(--cairn-space-xs)]"
  >
    <a
      href="/"
      class="inline-flex items-center gap-[0.55rem] text-base-content no-underline"
    >
      <!-- The cairn brand mark: four stacked stones, in the brand accent. Decorative; the wordmark
           beside it carries the name. -->
      <svg
        class="h-[1.55rem] w-[1.55rem] text-primary"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <ellipse cx="12" cy="20.5" rx="8" ry="2.4" />
        <ellipse cx="11.4" cy="14.8" rx="6" ry="2.3" />
        <ellipse cx="12.4" cy="9.6" rx="4.3" ry="2.1" />
        <ellipse cx="11.9" cy="4.8" rx="2.6" ry="1.9" />
      </svg>
      <span
        class="font-[family-name:var(--font-display)] text-[length:var(--cairn-step-1)] font-semibold tracking-[var(--cairn-tracking-tight)]"
        >Cairn Showcase</span
      >
    </a>

    <nav
      class="site-nav flex items-center gap-[var(--cairn-space-s)] text-[length:var(--cairn-step--1)]"
      aria-label="Primary"
    >
      {#each nav as item (item.href)}
        {@const current = isCurrent(item.href)}
        <a
          href={item.href}
          aria-current={current ? 'page' : undefined}
          class="px-[0.1rem] py-[0.3rem] no-underline {current
            ? 'font-semibold text-primary'
            : 'font-medium text-[color:var(--cairn-muted)] hover:text-base-content'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
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
    letter-spacing: 0.01em;
    border-radius: 2px;
    transition: color 0.15s;
  }
  .site-nav a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .site-nav a {
      transition: none;
    }
  }
</style>
