<!-- @component A later page of the posts index; see `../+page.svelte` for page 1. -->
<script lang="ts">
  import type { PageData } from './$types';
  import PostList from '$theme/components/PostList.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Posts, page {data.page} | AstroPaper</title>
</svelte:head>

<h1 class="text-step-4 font-bold">Posts</h1>
<p class="text-muted">All the posts I've written.</p>

<PostList posts={data.posts} page={data.page} totalPages={data.totalPages} />
