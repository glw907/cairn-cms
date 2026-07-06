<!-- @component The blog tags index, styled after `src/pages/blog/tags/index.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a centered "Tags" header over the same filter-pill
     row and full post grid every blog listing shares. -->
<script lang="ts">
  import type { PageData } from './$types';
  import BlogCard from '$theme/components/BlogCard.svelte';
  import TagPills from '$theme/components/TagPills.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Tags | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">Tags</h1>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section">
    <TagPills tags={data.tags} active="" />

    <div class="grid grid-cols-1 gap-m sm:grid-cols-2 lg:grid-cols-3">
      {#each data.posts as post (post.id)}
        <BlogCard
          href={post.permalink}
          title={post.title}
          author={post.fields.author as string | undefined}
          date={post.date}
          excerpt={post.fields.description as string | undefined}
          tags={post.tags ?? []}
        />
      {/each}
    </div>
  </div>
</div>
