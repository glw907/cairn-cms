<!-- @component A single tag's posts, styled after `src/pages/tags/[tag]/[...page].astro` (MIT). -->
<script lang="ts">
  import type { PageData } from './$types';
  import Datetime from '$theme/components/Datetime.svelte';

  let { data }: { data: PageData } = $props();

  /** The tag capitalized for display, matching AstroPaper's own "Tag: Blog" title device; the
   *  slug itself (used in the breadcrumb and every link) stays lowercase. */
  const tagLabel = $derived(data.tag.charAt(0).toUpperCase() + data.tag.slice(1));
</script>

<svelte:head>
  <title>#{data.tag} | AstroPaper</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-step--1 text-muted">
  <a href="/" class="hover:text-primary">Home</a> &raquo; <a href="/tags" class="hover:text-primary">Tags</a> &raquo; {data.tag}
</nav>
<h1 class="text-step-4 font-bold">Tag: {tagLabel}</h1>
<p class="italic text-muted">All the articles with the tag "{tagLabel}".</p>

<ul class="m-0 mt-m list-none p-0">
  {#each data.posts as post (post.id)}
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
