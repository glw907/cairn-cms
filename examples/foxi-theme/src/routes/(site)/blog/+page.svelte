<!-- @component The blog index, styled after `src/pages/blog/index.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a page header, a tag-filter pill row, and a card
     grid of every post. -->
<script lang="ts">
  import type { PageData } from './$types';
  import BlogCard from '$theme/components/BlogCard.svelte';
  import TagPills from '$theme/components/TagPills.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Blog | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">
      The <strong class="text-primary">Foxi</strong> Blog. Tips, Updates & Stories
    </h1>
    <p class="cairn-hero-lead mx-auto">Stay informed, stay productive. All the latest from the world of Foxi.</p>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section">
    <TagPills tags={data.tags} />

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
