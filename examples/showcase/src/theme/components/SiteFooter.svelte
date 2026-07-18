<!-- @component
The showcase's public site footer: an owned, copy-in chrome component on the token layer. It sits on
`base-200` over a top hairline and carries the wordmark, a footer nav, and a fine-print line. The
wordmark is the same plain, glyph-free type lockup the header uses; cairn ships no logo mark on the
public chrome by default. Every colour and size reads a DaisyUI role utility or a cairn token, never
a literal. The inner content caps at `--container-measure`, matching the header and the article/home
reading column, so the footer's left edge lines up with the body copy above it. A site owner edits
this file; the look re-skins from `theme.css`.
-->
<script lang="ts">
  /** A footer-nav entry: the visible label and the path it links to. */
  type NavItem = { label: string; href: string };

  /** The footer's nav targets. A scaffolded site owner edits this list. */
  const nav: NavItem[] = [
    { label: 'Writing', href: '/' },
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
      class="brand-link inline-flex min-h-11 items-center text-muted no-underline"
    >
      <span
        class="font-display text-step-1 font-semibold tracking-tight"
        >Waymark</span
      >
    </a>

    <nav
      class="site-nav flex flex-wrap items-center gap-s text-step--1"
      aria-label="Footer"
    >
      {#each nav as item (item.href)}
        <a
          href={item.href}
          class="inline-flex min-h-11 items-center px-xs text-muted no-underline hover:text-base-content"
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
    border-radius: var(--cairn-focus-ring-radius);
    transition: color 0.15s;
  }
  .site-nav a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  /* The brand link gets the same hover-and-transition idiom as the sibling nav links. */
  .brand-link {
    transition: color 0.15s;
  }
  .brand-link:hover {
    color: var(--color-base-content);
  }
  @media (prefers-reduced-motion: reduce) {
    .site-nav a,
    .brand-link {
      transition: none;
    }
  }
</style>
