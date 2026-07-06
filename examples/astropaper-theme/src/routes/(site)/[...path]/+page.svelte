<!-- @component The AstroPaper port's single-entry reader, styled after
     `src/pages/posts/[...slug]/index.astro` (MIT). Renders any routable concept (a post or a
     page); a post additionally carries the published/updated date line and its tag list. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import Datetime from '$theme/components/Datetime.svelte';

  let { data }: { data: PageData } = $props();

  const isPost = $derived(data.concept === 'posts');
  const tags = $derived((data.entry.frontmatter.tags as string[] | undefined) ?? []);
</script>

<CairnHead seo={data.seo} />

<article class="prose">
  <a href={isPost ? '/posts' : '/'} class="not-prose mb-s inline-flex items-center gap-1 text-step--1 text-muted hover:text-primary">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    Back
  </a>

  <h1>{data.entry.title}</h1>

  {#if isPost}
    <Datetime date={data.entry.frontmatter.date as string | undefined} modDate={data.entry.frontmatter.modDate as string | undefined} />
  {/if}

  {@html data.html}

  {#if tags.length > 0}
    <ul class="not-prose m-0 mt-l flex list-none flex-wrap gap-s p-0">
      {#each tags as tag (tag)}
        <li>
          <a href={`/tags/${tag}`} class="inline-flex items-center gap-0.5 border-b-2 border-dashed border-base-content text-step--1 hover:border-primary hover:text-primary">
            #{tag}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</article>
