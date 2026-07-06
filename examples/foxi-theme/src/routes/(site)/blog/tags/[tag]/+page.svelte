<!-- @component A single tag's filtered post listing. -->
<script lang="ts">
  import type { PageData } from './$types';
  import BlogCard from '$theme/components/BlogCard.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.tag} | Foxi</title>
</svelte:head>

<div class="site-wide py-2xl">
  <nav aria-label="Breadcrumb" class="mb-s text-step--1 text-muted">
    <a href="/blog/tags" class="hover:text-primary">Tags</a> &raquo; {data.tag}
  </nav>
  <h1 class="mb-m text-step-4 font-bold text-base-content">Posts tagged &ldquo;{data.tag}&rdquo;</h1>

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
