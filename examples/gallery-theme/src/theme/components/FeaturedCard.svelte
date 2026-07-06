<!-- @component
The home page's large hero card: the one page flagged `featured` in its frontmatter, styled
after the upstream demo's own `.featured-card` (a square crop on mobile, 16:9 on desktop, a
bottom-anchored gradient caption). The upstream draws this photo as a CSS `background-image`
with no `alt` at all; this port uses a real `<img>` with the photo's own alt text underneath the
gradient overlay, a real accessibility improvement licensed differences allow.

The outer `.site-wide` div carries the shared max-width, margin, and gutter; the inner `<a>` is
the card itself, the positioned ancestor its absolutely positioned photo and caption fill. Doing
it in two elements, rather than putting `.site-wide` directly on the card, keeps the photo's
edges flush with the gutter's content edge, the same edge the album grid's own cards sit at. An
absolutely positioned `inset-0` child fills its containing block's padding box regardless of that
box's own padding, so putting `.site-wide` (which carries `padding-inline`) directly on the card
would cancel the gutter for this one element, misaligning it against every other `.site-wide`
gutter-respecting element by exactly that padding.
-->
<script lang="ts">
  import type { AlbumCard } from '$theme/albums.js';

  interface Props {
    album: AlbumCard;
  }

  let { album }: Props = $props();
</script>

<div class="site-wide mb-l sm:mb-xl">
  <a
    href={album.href}
    class="group relative block aspect-square overflow-hidden rounded-box shadow-[var(--cairn-shadow)] sm:aspect-video"
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
</div>
