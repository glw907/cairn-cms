<!-- @component The 404 page, styled after Foxi's own `src/pages/404.astro` (MIT): a large
     numeral, a plain apology, and a link home. -->
<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} | Foxi</title>
</svelte:head>

<div class="site-wide py-2xl text-center">
  <h1 class="text-step-5 font-bold text-base-content">{page.status}</h1>
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
