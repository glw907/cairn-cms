<!-- @component The home page: the site title and dek, the category cross-index pills, the
     featured album's hero card, and the grid of every other top-level album. Matches the
     upstream demo's own home template (nicokaiser/hugo-theme-gallery, MIT). -->
<script lang="ts">
  import type { PageData } from './$types';
  import PageHeading from '$theme/components/PageHeading.svelte';
  import CategoryPills from '$theme/components/CategoryPills.svelte';
  import FeaturedCard from '$theme/components/FeaturedCard.svelte';
  import GalleryGrid from '$theme/components/GalleryGrid.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Gallery</title>
  <meta name="description" content="An example site for the gallery-theme port. Photos from Unsplash." />
</svelte:head>

<PageHeading title="Gallery" description="An example site for the gallery-theme port. Photos from Unsplash." />

<CategoryPills tags={data.tags} />

{#if data.featured}
  <FeaturedCard album={data.featured} />
{/if}

<GalleryGrid albums={data.grid} />
