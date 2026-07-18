<!-- @component The site's ROOT error page, a sibling of the `(site)` route group rather than a
     file inside it. Every route under `(site)` prerenders (`export const prerender = true` on
     every leaf), so SvelteKit strips the group's own `[...path]` catch-all from the
     runtime-routable manifest entirely: a request for an unmatched path matches no route at all,
     the `(site)` group's layout never runs, and its own `(site)/+error.svelte` (if it had one)
     never mounts. Only a root-level `+error.svelte` renders for that case, through the Worker's
     built-in default-404 SSR (see `wrangler.jsonc`'s `assets.not_found_handling` comment). The
     root has no shared layout of its own, so this page rebuilds the `(site)` chrome directly:
     both stylesheets, `SiteHeader`, and `SiteFooter`, the same components and token classes the
     `(site)` layout uses. See `src/chassis/README.md`'s "The themed-404 pattern" for the full
     mechanism and why. -->
<script lang="ts">
  import { page } from '$app/state';
  import themeCss from '$theme/theme.css?url';
  import siteCss from '$theme/site.css?url';
  import SiteHeader from '$theme/components/SiteHeader.svelte';
  import SiteFooter from '$theme/components/SiteFooter.svelte';
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
  <title>{page.status} | Cairn Showcase</title>
</svelte:head>

<div class="site-shell flex min-h-screen flex-col bg-base-100 font-body text-base-content">
  <SiteHeader />

  <main id="main" class="site-main flex-1">
    <div class="mx-auto max-w-measure px-m py-2xl text-center">
      <h1 class="text-step-5 font-bold text-base-content">{page.status}</h1>
      <p class="mt-s text-step-1 text-muted">
        {page.status === 404
          ? 'This page doesn’t exist. It may have moved, or the link took a wrong turn.'
          : (page.error?.message ?? 'Something went wrong.')}
      </p>
      <a
        href="/"
        class="mt-m inline-flex h-11 items-center justify-center rounded-field bg-primary px-5 text-step--1 font-bold text-primary-content no-underline hover:opacity-90"
      >
        Return to homepage
      </a>
    </div>
  </main>

  <SiteFooter />
</div>
