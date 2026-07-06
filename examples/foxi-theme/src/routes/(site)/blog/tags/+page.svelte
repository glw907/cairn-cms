<!-- @component The blog tags index: every tag, linking to its filtered listing. -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Tags | Foxi</title>
</svelte:head>

<div class="site-wide py-2xl">
  <h1 class="mb-m text-step-4 font-bold text-base-content">Tags</h1>
  <ul class="m-0 flex flex-wrap gap-s p-0">
    {#each data.tags as tag (tag)}
      <li>
        <a href={`/blog/tags/${tag}`} class="inline-flex rounded-field bg-base-200 px-4 py-2 text-step--1 font-medium text-base-content no-underline hover:bg-base-300">
          {tag}
        </a>
      </li>
    {/each}
  </ul>
</div>
