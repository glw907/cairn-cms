<!-- @component
A leaf album's photo grid: the media-stress capability test (theme-ports-1-3, port 3). Every
photo's aspect ratio (from the sibling `width`/`height` frontmatter leaves; see cairn.config.ts's
own note on why they sit beside the image field) packs into justified rows client-side
(`$theme/justified-layout.js`, a thin wrapper over the real `justified-layout` package), full-bleed
edge-to-edge with square corners, matching the upstream's own leaf-album template exactly (its
compiled CSS zeroes this one section's side padding; see site.css). Every photo opens a PhotoSwipe
v5 lightbox (MIT) on click: swipe/arrow-key navigation, pinch zoom, a download button, and a
caption that PhotoSwipe's own dynamic-caption plugin (MIT, by the PhotoSwipe author) positions
beside or below the fitted image depending on available space, exactly the recipe the upstream's
own compiled bundle uses. PhotoSwipe and its plugin are loaded only in the browser (dynamic import
inside onMount), never during prerendering.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import 'photoswipe/style.css';
  import 'photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css';
  import type { Photo } from '$theme/albums.js';
  import { layoutJustified, TARGET_ROW_HEIGHT, SPACING, HEIGHT_TOLERANCE } from '$theme/justified-layout.js';

  interface Props {
    photos: Photo[];
  }

  let { photos }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state();
  let containerWidth = $state(0);

  const layout = $derived(
    containerWidth > 0
      ? layoutJustified(
          photos.map((photo) => photo.width / photo.height),
          {
            containerWidth,
            targetRowHeight: TARGET_ROW_HEIGHT,
            spacing: SPACING,
            heightTolerance: HEIGHT_TOLERANCE,
          },
        )
      : { boxes: [], height: 0 },
  );

  onMount(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) containerWidth = entry.contentRect.width;
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });

  onMount(() => {
    let disposed = false;
    let lightbox: import('photoswipe/lightbox').default | undefined;
    void (async () => {
      const [{ default: PhotoSwipeLightbox }, { default: PhotoSwipeDynamicCaption }] = await Promise.all([
        import('photoswipe/lightbox'),
        import('photoswipe-dynamic-caption-plugin'),
      ]);
      if (disposed || !containerEl) return;
      lightbox = new PhotoSwipeLightbox({
        gallery: containerEl,
        children: 'a',
        pswpModule: () => import('photoswipe'),
      });
      // The upstream's own dynamic-caption plugin, at its own default options (confirmed against
      // its compiled bundle): positions the caption beside the image when there's more
      // horizontal space, below it otherwise, and pins it to the bottom below the mobile
      // breakpoint. It reads a `.pswp-caption-content` element inside the clicked anchor.
      new PhotoSwipeDynamicCaption(lightbox, {});
      // The upstream's own documented download-button recipe (photoswipe.com's own "adding UI
      // elements" cookbook): a real toolbar button, not a caption add-on.
      lightbox.on('uiRegister', () => {
        lightbox?.pswp?.ui?.registerElement({
          name: 'download-button',
          order: 8,
          isButton: true,
          tagName: 'a',
          html: {
            isCustomSVG: true,
            inner:
              '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
            outlineID: 'pswp__icn-download',
          },
          onInit: (el, pswp) => {
            el.setAttribute('download', '');
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener');
            el.setAttribute('title', 'Download');
            pswp.on('change', () => {
              el.setAttribute('href', pswp.currSlide?.data.src ?? '');
            });
          },
        });
      });
      lightbox.init();
    })();
    return () => {
      disposed = true;
      lightbox?.destroy();
    };
  });
</script>

<div bind:this={containerEl} class="gallery-wide relative" style:height="{layout.height}px">
  {#each layout.boxes as box (box.index)}
    {@const photo = photos[box.index]}
    <a
      href={photo.src}
      data-pswp-width={photo.width}
      data-pswp-height={photo.height}
      target="_blank"
      rel="noreferrer"
      class="absolute cursor-zoom-in overflow-hidden"
      style:left="{box.left}px"
      style:top="{box.top}px"
      style:width="{box.width}px"
      style:height="{box.height}px"
      style:background-color={photo.color}
    >
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <span class="pswp-caption-content sr-only">{photo.caption ?? photo.alt}</span>
    </a>
  {/each}
</div>
