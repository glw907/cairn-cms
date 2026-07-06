<!-- @component
The gallery-theme port's single-entry reader: one route serves all three of a page's possible
shapes (see cairn.config.ts and $theme/albums.js). A leaf album gets the justified photo grid and
lightbox; an interior node gets the same gallery-card grid the home page uses, over its children;
a plain page (About, Imprint) gets its own prose body. An album (leaf or interior) also gets a
one-step-back link, this port's own addition over the upstream's own header, which always returns
to home regardless of depth (see SiteHeader.svelte). -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import PageHeading from '$theme/components/PageHeading.svelte';
  import GalleryGrid from '$theme/components/GalleryGrid.svelte';
  import JustifiedGrid from '$theme/components/JustifiedGrid.svelte';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />

{#if data.view === 'photo-grid' || data.view === 'gallery-listing'}
  <a href={data.back.href} class="site-wide mb-s inline-flex items-center gap-1 text-step--1 text-muted hover:text-base-content">
    &laquo; {data.back.label}
  </a>
{/if}

{#if data.view === 'photo-grid'}
  <PageHeading title={data.entry.title} description={data.entry.frontmatter.description as string | undefined} />
  <JustifiedGrid photos={data.photos} />
{:else if data.view === 'gallery-listing'}
  <PageHeading title={data.entry.title} description={data.entry.frontmatter.description as string | undefined} />
  <GalleryGrid albums={data.cards} />
{:else}
  <PageHeading title={data.entry.title} />
  <article class="site-narrow prose">
    {@html data.html}
  </article>
{/if}
