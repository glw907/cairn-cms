<!-- @component The 404 page, styled after AstroPaper's own `src/pages/404.astro` (MIT): a plain
     apology and a link home. -->
<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} | AstroPaper</title>
</svelte:head>

<div class="py-2xl text-center">
  <h1 class="text-step-5 font-bold">{page.status}</h1>
  <p class="mt-s text-muted">
    {page.status === 404 ? "The page you're looking for doesn't exist." : (page.error?.message ?? 'Something went wrong.')}
  </p>
  <a href="/" class="mt-m inline-block text-primary underline decoration-dashed underline-offset-4">Go back home</a>
</div>
