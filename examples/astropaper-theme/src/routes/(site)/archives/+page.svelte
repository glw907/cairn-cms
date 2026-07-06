<!-- @component The archives page, styled after `src/pages/archives/index.astro` (MIT): a
     breadcrumb, a title and subtitle, then every post grouped by year and month, newest first,
     each group carrying its own entry count. -->
<script lang="ts">
  import type { PageData } from './$types';
  import Datetime from '$theme/components/Datetime.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Archives | AstroPaper</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-step--1 text-muted">
  <a href="/" class="hover:text-primary">Home</a> &raquo; Archives
</nav>
<h1 class="text-step-4 font-bold">Archives</h1>
<p class="italic text-muted">All the articles I've archived.</p>

{#each data.years as year (year.year)}
  <h2 class="mt-l text-step-3 font-bold">
    {year.year} <sup class="text-step--1 text-muted">{year.count}</sup>
  </h2>
  {#each year.months as month (month.month)}
    <div class="mt-m grid grid-cols-[8rem_1fr] gap-s">
      <h3 class="font-bold">
        {month.month} <sup class="text-step--1 font-normal text-muted">{month.count}</sup>
      </h3>
      <ul class="m-0 list-none p-0">
        {#each month.posts as post (post.id)}
          <li class="mb-m">
            <a href={post.permalink} class="font-medium text-primary decoration-dashed underline-offset-4 hover:underline">
              {post.title}
            </a>
            <Datetime date={post.date} modDate={post.fields.modDate as string | undefined} />
            {#if post.fields.description}
              <p class="m-0">{post.fields.description}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
{/each}
