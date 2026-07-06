<!-- @component
The responsive album-card grid: `auto-fit`, not a breakpoint-stepped column count. The number of
tracks is however many fit a card at least 16rem wide, but any track with no album placed in it
(this port's own small demo has as few as three top-level albums) collapses to zero width, and
the tracks that do hold a card split its space instead. That is what lets the grid fill the same
width the featured card above it does at every viewport, including 2560, this port's own "beat
the original at 2560" move: the upstream's own live demo caps at 3 columns and leaves the rest of
an ultrawide viewport empty (see this theme's README), while this grid grows the cards themselves
to use the extra width instead of adding a column with nothing to put in it.
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';
  import GalleryCard from './GalleryCard.svelte';

  interface Props {
    albums: AlbumCard[];
  }

  let { albums }: Props = $props();
</script>

<div class="site-wide grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-l sm:gap-y-xl">
  {#each albums as album (album.id)}
    <GalleryCard {album} />
  {/each}
</div>
