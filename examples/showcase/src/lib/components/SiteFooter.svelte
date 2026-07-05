<!-- @component
The showcase's public site footer: an owned, copy-in chrome component on the token layer. It sits on
`base-200` over a top hairline and carries the brand mark, a footer nav, and a fine-print line. Every
colour and size reads a DaisyUI role utility or a cairn token, never a literal. The inner content caps
at `--container-measure`, matching the header and the article/home reading column, so the footer's
left edge lines up with the body copy above it. A site owner edits this file; the look re-skins from
`theme.css`.
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
  class="site-footer mt-2xl border-t border-base-300 bg-base-200"
>
  <div
    class="mx-auto flex max-w-measure flex-wrap items-center justify-between gap-m px-m py-xl"
  >
    <a
      href="/"
      class="inline-flex items-center gap-[0.55rem] text-muted no-underline"
    >
      <svg
        class="h-[1.4rem] w-[1.4rem] text-muted"
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
        class="font-display text-step-1 font-semibold tracking-tight"
        >Cairn Showcase</span
      >
    </a>

    <nav
      class="site-nav flex flex-wrap items-center gap-s text-step--1"
      aria-label="Footer"
    >
      {#each nav as item (item.href)}
        <a
          href={item.href}
          class="inline-flex min-h-11 items-center text-muted no-underline hover:text-base-content"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <p
      class="w-full border-t border-card-border pt-s text-step--1 text-muted"
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
