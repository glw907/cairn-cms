<!-- @component A page of the posts index, styled after AstroPaper's own `Card.astro` list markup
     (MIT): a title link, a date line, and a description per entry, with the AstroPaper-style
     Pagination controls (Previous/Next, styled after `Pagination.astro`) below. -->
<script lang="ts">
  import type { ContentSummary } from '@glw907/cairn-cms/delivery';
  import Datetime from './Datetime.svelte';

  interface Props {
    posts: ContentSummary[];
    page: number;
    totalPages: number;
  }
  let { posts, page, totalPages }: Props = $props();

  function hrefFor(n: number): string {
    return n === 1 ? '/posts' : `/posts/${n}`;
  }
</script>

<ul class="m-0 list-none p-0">
  {#each posts as post (post.id)}
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

{#if totalPages > 1}
  <nav class="mt-l flex items-center justify-center gap-m" aria-label="Pagination">
    {#if page > 1}
      <a href={hrefFor(page - 1)} class="inline-flex items-center gap-1 hover:text-primary">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Prev
      </a>
    {:else}
      <span class="inline-flex items-center gap-1 text-muted opacity-50">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Prev
      </span>
    {/if}
    <span class="font-medium">{page} / {totalPages}</span>
    {#if page < totalPages}
      <a href={hrefFor(page + 1)} class="inline-flex items-center gap-1 hover:text-primary">
        Next
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
    {:else}
      <span class="inline-flex items-center gap-1 text-muted opacity-50">
        Next
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    {/if}
  </nav>
{/if}
