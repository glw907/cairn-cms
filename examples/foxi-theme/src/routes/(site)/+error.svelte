<!-- @component The 404 page, styled after Foxi's own `src/pages/404.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): the magnifying-glass illustration over a bold
     "page not found" wordmark, a plain apology, and a link home. -->
<script lang="ts">
  import { page } from '$app/state';
  import NotFoundIllustration from '$theme/components/NotFoundIllustration.svelte';
</script>

<svelte:head>
  <title>{page.status} | Foxi</title>
</svelte:head>

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
