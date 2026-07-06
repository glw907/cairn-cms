<!-- @component The hugo-theme-gallery port's public chrome: an owned, token-driven header, main,
     and footer in a (site) route group. This port mounts no /admin, so the group wraps every
     route. Both stylesheets link by their ?url-resolved URL, the chassis pattern that also lets
     an editor preview frame link the same asset in a site that keeps an admin. Every template
     picks its own width (site-narrow, site-wide, or gallery-wide) rather than main itself, since
     a prose page, a card grid, and the justified photo grid each want a different measure. -->
<script lang="ts">
  import themeCss from '$theme/theme.css?url';
  import siteCss from '$theme/site.css?url';
  import SiteHeader from '$theme/components/SiteHeader.svelte';
  import SiteFooter from '$theme/components/SiteFooter.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
</svelte:head>

<div class="cairn-site-shell bg-base-100 font-body text-base-content">
  <a href="#main" class="absolute top-[-3rem] left-s z-50 bg-base-100 px-3 py-2 text-primary focus:top-4">
    Skip to content
  </a>

  <SiteHeader />

  <main id="main" tabindex="-1" class="cairn-site-main">
    {@render children()}
  </main>

  <SiteFooter />
</div>

<style>
  main:focus {
    outline: none;
  }
</style>
