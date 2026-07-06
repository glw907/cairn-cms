<!-- @component
The home page's large hero card: the one page flagged `featured` in its frontmatter, styled
after the upstream demo's own `.featured-card` (a square crop on mobile, 16:9 on desktop, a
bottom-anchored gradient caption). The upstream draws this photo as a CSS `background-image`
with no `alt` at all; this port uses a real `<img>` with the photo's own alt text underneath the
gradient overlay, a real accessibility improvement licensed differences allow.
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';

  interface Props {
    album: AlbumCard;
  }

  let { album }: Props = $props();
</script>

<a
  href={album.href}
  class="site-wide group relative mb-l block aspect-square overflow-hidden rounded-box shadow-[var(--cairn-shadow)] sm:mb-xl sm:aspect-video"
  style:background-color={album.cover?.color}
>
  {#if album.cover}
    <img
      src={album.cover.src}
      alt={album.cover.alt}
      width={album.cover.width}
      height={album.cover.height}
      loading="lazy"
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  {/if}
  <div class="absolute inset-0 flex flex-col justify-end gap-1 bg-linear-to-t from-black/80 from-10% to-transparent to-50% p-m text-white">
    <h2 class="text-step-3 font-semibold">{album.title}</h2>
    <p class="text-step--1">{album.photoCount} photo{album.photoCount === 1 ? '' : 's'}</p>
  </div>
</a>
