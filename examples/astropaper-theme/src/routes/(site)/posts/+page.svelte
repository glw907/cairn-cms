<!-- @component The posts index (page 1), styled after `src/pages/posts/[...page].astro` (MIT). -->
<script lang="ts">
  import type { PageData } from './$types';
  import PostList from '$theme/components/PostList.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Posts | AstroPaper</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-step--1 text-muted">
  <a href="/" class="hover:text-primary">Home</a> &raquo; Posts (Page {data.page})
</nav>
<h1 class="text-step-4 font-bold">Posts</h1>
<p class="text-muted">All the posts I've written.</p>

<PostList posts={data.posts} page={data.page} totalPages={data.totalPages} />
