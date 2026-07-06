<!-- @component
The responsive album-card grid: fixed columns through standard desktop, `auto-fit` only past the
family's own ultrawide extreme. `.site-wide` caps this grid's own container at 80rem regardless
of viewport, so from `lg` (1024px) up through 1440px `.gallery-grid` (site.css) holds the
upstream's own exact `repeat(3, minmax(0,1fr))` (the upstream's own `.galleries` grid): a page
with fewer than three albums leaves the remaining track empty rather than growing the cards to
fill it, matching the reference at 1024 and 1440 (see this theme's README). Only past 1920px does
the grid switch to `auto-fit`: any track with no album placed in it (this port's own small demo
has as few as three top-level albums) collapses to zero width, and the tracks that do hold a card
split its space instead, which is this port's own "beat the original at 2560" move (the
upstream's own live demo still caps at 3 columns and leaves the rest of an ultrawide viewport
empty at that width).
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';
  import GalleryCard from './GalleryCard.svelte';

  interface Props {
    albums: AlbumCard[];
  }

  let { albums }: Props = $props();
</script>

<div class="site-wide gallery-grid grid grid-cols-1 gap-l sm:grid-cols-2 sm:gap-y-xl">
  {#each albums as album (album.id)}
    <GalleryCard {album} />
  {/each}
</div>
