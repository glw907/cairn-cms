<!-- @component The search page, styled after `src/pages/search.astro` (MIT). AstroPaper's own
     implementation indexes every post with Pagefind at build time; this port keeps the same
     template with a plain client-side substring filter over the already-loaded post index, a
     simpler search seam a small site's post count does not need a search-index dependency for. -->
<script lang="ts">
  import type { PageData } from './$types';
  import Datetime from '$theme/components/Datetime.svelte';

  let { data }: { data: PageData } = $props();

  let query = $state('');

  const results = $derived(
    query.trim() === ''
      ? []
      : data.posts.filter((post) => {
          const haystack = `${post.title} ${post.fields.description ?? ''}`.toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        }),
  );
</script>

<svelte:head>
  <title>Search | AstroPaper</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-step--1 text-muted">
  <a href="/" class="hover:text-primary">Home</a> &raquo; Search
</nav>
<h1 class="text-step-4 font-bold">Search</h1>
<p class="italic text-muted">Search any article ...</p>

<label class="relative mt-m block">
  <span class="sr-only">Search for posts</span>
  <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4.35-4.35" stroke-linecap="round" />
  </svg>
  <input
    type="text"
    bind:value={query}
    placeholder="Search"
    class="w-full border border-card-border bg-base-100 py-2 pl-10 pr-3 text-base-content"
  />
</label>

{#if query.trim() !== ''}
  <p class="mt-s text-step--1 text-muted">Found {results.length} {results.length === 1 ? 'result' : 'results'} for '{query}'</p>
  <ul class="m-0 mt-m list-none p-0">
    {#each results as post (post.id)}
      <li class="my-m">
        <a href={post.permalink} class="text-step-1 font-medium text-primary decoration-dashed underline-offset-4 hover:underline">
          {post.title}
        </a>
        <Datetime date={post.date} modDate={post.fields.modDate as string | undefined} />
        {#if post.fields.description}
          <p class="m-0">{post.fields.description}</p>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
