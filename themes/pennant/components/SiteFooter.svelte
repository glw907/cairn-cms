<!-- @component
This site's public footer: one line on the club's color 1 (`--color-neutral`, with
`--color-neutral-content` on it), the same ground as the header, so the page opens and closes in
the club's color. The left holds the year and the site name, the right the footer menu as
underlined links. Every color reads a role custom property, never a literal, and every text and
ground pair it paints, the focus ring included, is `--color-neutral-content` on `--color-neutral`,
a pair the theme's contrast audit measures. The inner row caps at `--container-measure-wide`, the
header's width.

The site name is `page.data.siteName`, the same root layout server load's reading `SiteHeader`
uses; this component never imports `siteConfig` itself. With no name, the line shows only the
year.

The links come from `page.data.footerNav`, the site's `menus.footer` (`site.config.yaml`), resolved
by the root layout server load; only top-level links with a url render. `/admin/nav` edits only
`menus.primary`, so a site owner who wants to change the footer edits `site.config.yaml` directly.
-->
<script lang="ts">
  import { page } from '$app/state';
  import type { NavNode } from '@glw907/cairn-cms';
  import { isAdminHref } from './admin-link.js';

  /* A link into `/admin` (decided by the shared `isAdminHref` predicate, also used by
     `SiteHeader`) renders `rel="external"`, the one attribute SvelteKit's prerender crawler
     honours to skip queuing a link (`@sveltejs/kit`'s crawler tests `rel` against
     `/\bexternal\b/i`); the target answers every crawl-time request with an error by design, so
     this keeps the link in the footer and clickable for a reader while the build never queues it.
     It also opts the link out of SvelteKit's client-side router, which is correct for a full
     navigation into the admin surface anyway. */
  const nav = $derived(
    (page.data.footerNav ?? []).filter(
      (item): item is NavNode & { url: string } => item.url !== undefined,
    ),
  );

  const siteName = $derived(page.data.siteName ?? '');

  // A prerendered page carries the year it was built in; the next build moves it.
  const year = new Date().getFullYear();
</script>

<footer class="site-footer">
  <div class="row">
    <span>&copy; {year} {siteName}</span>
    {#if nav.length > 0}
      <nav aria-label="Footer">
        {#each nav as item (item.url)}
          <a href={item.url} rel={isAdminHref(item.url) ? 'external' : undefined}>{item.label}</a>
        {/each}
      </nav>
    {/if}
  </div>
</footer>

<style>
  .site-footer {
    background: var(--color-neutral);
    color: var(--color-neutral-content);
    padding-block: 26px;
    font-size: var(--text-step--1);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px 28px;
    max-width: var(--container-measure-wide);
    margin-inline: auto;
    padding-inline: 1.75rem;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
  }
  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
    border-radius: 2px;
  }
  a:hover {
    text-decoration-thickness: 2px;
  }
  /* The chassis focus ring paints `--color-primary`, which is measured only on the base grounds;
     on this ground the ring is the footer's own text color. */
  a:focus-visible {
    outline: 2px solid var(--color-neutral-content);
    outline-offset: 2px;
  }
  @media (max-width: 759.98px) {
    .row {
      padding-inline: 1.125rem;
    }
  }
</style>
