<!-- @component
A single album card: a leaf album (a photo count) or an interior node (a photo-and-album count),
styled after the upstream demo's own `.card` (a 3:2 cropped cover photo, rounded-2xl, a title and
count below). Shared by the home grid, a gallery-listing page's children, and a category
cross-index page: every one of those is the same card over a different `AlbumCard[]`.
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';

  interface Props {
    album: AlbumCard;
  }

  let { album }: Props = $props();
</script>

<a href={album.href} title={album.title} class="group flex flex-col gap-xs no-underline">
  <figure
    class="aspect-[3/2] w-full overflow-hidden rounded-box shadow-[var(--cairn-shadow)]"
    style:background-color={album.cover?.color}
  >
    {#if album.cover}
      <img
        src={album.cover.src}
        alt={album.cover.alt}
        width={album.cover.width}
        height={album.cover.height}
        loading="lazy"
        class="h-full w-full object-cover transition-opacity group-hover:opacity-90"
      />
    {/if}
  </figure>
  <div class="flex flex-col gap-1">
    <h2 class="text-step-2 font-semibold text-base-content">{album.title}</h2>
    <p class="text-step--1 text-muted">
      {#if album.albumCount !== undefined}
        {album.photoCount} photo{album.photoCount === 1 ? '' : 's'} in {album.albumCount} album{album.albumCount === 1
          ? ''
          : 's'}
      {:else}
        {album.photoCount} photo{album.photoCount === 1 ? '' : 's'}
      {/if}
    </p>
  </div>
</a>
