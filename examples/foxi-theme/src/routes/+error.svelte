<!-- @component The site's ROOT error page, outside the `(site)` route group. Every route in this
     port prerenders, so SvelteKit strips the `[...path]` catch-all from the runtime-routable
     manifest entirely: a request to an unmatched path matches no route at all, meaning the
     `(site)` group's own layout never runs and its own `(site)/+error.svelte` never mounts. Only
     a root-level `+error.svelte` renders for that case, through the Worker's built-in default-404
     SSR (see wrangler.jsonc's `assets.not_found_handling` comment). The root has no shared
     layout of its own, so this page rebuilds the `(site)` chrome directly: both stylesheets, the
     NavigationBar, and the SiteFooter, styled after Foxi's own `src/pages/404.astro`
     (oxygenna-themes/foxi-astro-theme, MIT). -->
<script lang="ts">
  import { page } from '$app/state';
  import themeCss from '$theme/theme.css?url';
  import siteCss from '$theme/site.css?url';
  import NavigationBar from '$theme/components/NavigationBar.svelte';
  import SiteFooter from '$theme/components/SiteFooter.svelte';
  import NotFoundIllustration from '$theme/components/NotFoundIllustration.svelte';
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
  <title>{page.status} | Foxi</title>
</svelte:head>

<div class="cairn-site-shell bg-base-100 font-body text-base-content">
  <NavigationBar />

  <main id="main" class="cairn-site-main">
    <div class="site-wide py-2xl text-center">
      <NotFoundIllustration />
      {#if page.status === 404}
        <p class="mt-m text-step-3 font-extrabold uppercase tracking-wide text-base-content">Page not found</p>
      {:else}
        <h1 class="mt-m text-step-5 font-bold text-base-content">{page.status}</h1>
      {/if}
      <p class="mt-s text-muted">
        {page.status === 404 ? "The page you're looking for doesn't exist." : (page.error?.message ?? 'Something went wrong.')}
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
