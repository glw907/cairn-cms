<!-- @component
This site's public footer: an owned, copy-in chrome component on the token layer. It sits on
`base-200` over a top hairline and carries the wordmark, a footer nav, and a fine-print line. The
wordmark is the same plain, glyph-free type lockup the header uses; cairn ships no logo mark on the
public chrome by default. Every colour and size reads a DaisyUI role utility or a cairn token, never
a literal. The inner content caps at `--container-measure`, matching the header and the article/home
reading column, so the footer's left edge lines up with the body copy above it. A site owner edits
this file; the look re-skins from `theme.css`.

The wordmark text is `page.data.siteName`, the same root layout server load's reading `SiteHeader`
uses; this component never imports `siteConfig` itself. `page.data.siteName` is optional in
`App.PageData`, so the brand link falls back to an `aria-label` of "Home" the same way `SiteHeader`
does.

The nav links come from `page.data.footerNav`, the site's `menus.footer` (`site.config.yaml`),
resolved by the root layout server load. `/admin/nav` edits only `menus.primary`, so a site owner
who wants to change the footer edits `site.config.yaml` directly.
-->
<script lang="ts">
  import { page } from '$app/state';
  import type { NavNode } from '@glw907/cairn-cms';
  import { isAdminHref } from './admin-link.js';

  /* The root layout server load resolves menus.footer into NavNode[] and hands it down through
     page.data. This footer renders only top-level entries with a url, flat.

     A link into `/admin` (decided by the shared `isAdminHref` predicate, also used by
     `SiteHeader`) renders `rel="external"`, the one attribute SvelteKit's prerender crawler
     actually honours to skip queuing a link (`@sveltejs/kit`'s crawler tests `rel` against
     `/\bexternal\b/i`); the target answers every crawl-time request with an error by design, so
     this keeps the link itself in the footer and clickable for a reader while the build never
     queues it. There is no `data-sveltekit-prerender` link option: SvelteKit's `data-sveltekit-*`
     attributes are `preload-data`, `preload-code`, `reload`, `replacestate`, `keepfocus`, and
     `noscroll`, none of which touch whether the crawler reaches a route. The route-level control
     for whether a reached route is written to disk is `export const prerender` (`/admin`'s own
     `+page.server.ts` sets it to `false`); `rel="external"` is what keeps the crawler from
     reaching the route at all. HTML defines `rel="external"` to mean "not part of the same site,"
     which `/admin` technically is not, so this is a deliberate build-tool hint rather than a
     literal claim: it is the only attribute the crawler honours, and it also opts the link out of
     SvelteKit's client-side router, which is correct for a full navigation into the admin surface
     anyway. */
  const nav = $derived(
    (page.data.footerNav ?? []).filter(
      (item): item is NavNode & { url: string } => item.url !== undefined,
    ),
  );

  // See SiteHeader's identical guard: only unset when the root load throws before this mounts.
  const siteName = $derived(page.data.siteName ?? '');
</script>

<footer class="site-footer border-t border-base-300 bg-base-200">
  <div class="mx-auto flex max-w-measure flex-wrap items-center justify-between gap-m px-m py-xl">
    <a
      href="/"
      class="brand-link inline-flex min-h-11 items-center text-muted no-underline"
      aria-label={siteName || 'Home'}
    >
      <span class="font-display text-step-1 font-semibold tracking-tight">{siteName}</span>
    </a>

    <nav class="site-nav flex flex-wrap items-center gap-s text-step--1" aria-label="Footer">
      {#each nav as item (item.url)}
        <a
          href={item.url}
          rel={isAdminHref(item.url) ? 'external' : undefined}
          class="inline-flex min-h-11 items-center px-xs text-muted no-underline hover:text-base-content"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <p class="w-full border-t border-card-border pt-s text-step--1 text-muted">
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
    outline: var(--cairn-focus-ring-outline);
    outline-offset: var(--cairn-focus-ring-offset);
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
