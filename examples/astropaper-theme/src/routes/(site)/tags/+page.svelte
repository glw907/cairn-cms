<!-- @component The tags index, styled after `src/pages/tags/index.astro` (MIT): a breadcrumb, a
     title and subtitle, then every tag as a hash-prefixed dashed-underline link. -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Tags | AstroPaper</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-step--1 text-muted">
  <a href="/" class="hover:text-primary">Home</a> &raquo; Tags
</nav>
<h1 class="text-step-4 font-bold">Tags</h1>
<p class="italic text-muted">All the tags used in posts.</p>

<ul class="m-0 mt-m flex list-none flex-wrap gap-m p-0">
  {#each data.tags as tag (tag)}
    <li>
      <a href={`/tags/${tag}`} class="inline-flex items-center gap-0.5 border-b-2 border-dashed border-base-content text-step-1 hover:border-primary hover:text-primary">
        #{tag}
      </a>
    </li>
  {/each}
</ul>
