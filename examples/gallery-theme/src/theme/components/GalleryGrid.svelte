<!-- @component
The responsive album-card grid: 1 column on mobile, 2 from the upstream's own `sm` breakpoint, 3
from `lg` (matching the upstream's own `.galleries` grid exactly), and a fourth column past the
family's `2xl` breakpoint. That fourth column is this port's own "beat the original at 2560"
move: the upstream's own live demo caps at 3 columns and leaves the rest of an ultrawide viewport
empty (see this theme's README), while this grid puts the extra width to use.
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';
  import GalleryCard from './GalleryCard.svelte';

  interface Props {
    albums: AlbumCard[];
  }

  let { albums }: Props = $props();
</script>

<div class="site-wide grid grid-cols-1 gap-l sm:grid-cols-2 sm:gap-y-xl lg:grid-cols-3 2xl:grid-cols-4">
  {#each albums as album (album.id)}
    <GalleryCard {album} />
  {/each}
</div>
