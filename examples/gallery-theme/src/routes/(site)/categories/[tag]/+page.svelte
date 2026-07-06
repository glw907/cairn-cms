<!-- @component A category cross-index page: every leaf album tagged with this category, in the
     same card grid the home page uses. -->
<script lang="ts">
  import type { PageData } from './$types';
  import PageHeading from '$theme/components/PageHeading.svelte';
  import GalleryGrid from '$theme/components/GalleryGrid.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.tag} - Gallery</title>
</svelte:head>

<PageHeading title={data.tag} />
<GalleryGrid albums={data.cards} />
