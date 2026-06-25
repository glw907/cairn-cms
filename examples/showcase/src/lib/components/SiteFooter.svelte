<!-- @component
The showcase's public site footer: an owned, copy-in chrome component on the token layer. It sits on
`base-200` over a top hairline and carries the brand mark, a footer nav, and a fine-print line. Every
colour and size reads a DaisyUI role utility or a cairn token, never a literal. A site owner edits
this file; the look re-skins from `theme.css`.
-->
<script lang="ts">
  /** A footer-nav entry: the visible label and the path it links to. */
  type NavItem = { label: string; href: string };

  /** The footer's nav targets. A scaffolded site owner edits this list. */
  const nav: NavItem[] = [
    { label: 'Writing', href: '/' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Admin', href: '/admin' },
    { label: 'Feed', href: '/feed.xml' },
  ];
</script>

<footer
  class="site-footer mt-[var(--cairn-space-2xl)] border-t border-base-300 bg-base-200"
>
  <div
    class="mx-auto flex max-w-[var(--cairn-measure-wide)] flex-wrap items-center justify-between gap-[var(--cairn-space-m)] px-[var(--cairn-space-m)] py-[var(--cairn-space-xl)]"
  >
    <a
      href="/"
      class="inline-flex items-center gap-[0.55rem] text-[color:var(--cairn-muted)] no-underline"
    >
      <svg
        class="h-[1.4rem] w-[1.4rem] text-[color:var(--cairn-muted)]"
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
      class="site-nav flex gap-[var(--cairn-space-s)] text-[length:var(--cairn-step--1)]"
      aria-label="Footer"
    >
      {#each nav as item (item.href)}
        <a
          href={item.href}
          class="text-[color:var(--cairn-muted)] no-underline hover:text-base-content"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <p
      class="w-full border-t border-[color:var(--cairn-card-border)] pt-[var(--cairn-space-s)] text-[length:var(--cairn-step--1)] text-[color:var(--cairn-muted)]"
    >
      Built with cairn. A self-contained SvelteKit site that consumes the package and proves it.
    </p>
  </div>
</footer>

<style>
  /* A consistent focus ring on the footer links, the same language as the header. */
  .site-nav a {
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
