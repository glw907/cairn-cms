<!-- @component A single tag's filtered post listing, styled after `src/pages/blog/tags/[tag].astro`
     (oxygenna-themes/foxi-astro-theme, MIT): the same page header and filter-pill row every blog
     listing shares, scoped to this tag's posts. -->
<script lang="ts">
  import type { PageData } from './$types';
  import BlogCard from '$theme/components/BlogCard.svelte';
  import TagPills from '$theme/components/TagPills.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.tag} | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <nav aria-label="Breadcrumb" class="mb-s text-step--1 text-muted">
      <a href="/blog/tags" class="hover:text-primary">Tags</a> &raquo; {data.tag}
    </nav>
    <h1 class="cairn-hero-title">Foxi posts about <strong class="text-primary">{data.tag}</strong></h1>
    <p class="cairn-hero-lead mx-auto">Stay informed, stay productive with all the latest from Foxi.</p>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section">
    <TagPills tags={data.tags} active={data.tag} />

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
