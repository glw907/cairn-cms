<!-- @component
A leaf album's photo grid: the media-stress capability test (theme-ports-1-3, port 3). Every
photo's aspect ratio (from the sibling `width`/`height` frontmatter leaves; see cairn.config.ts's
own note on why they sit beside the image field) packs into justified rows client-side
(`$theme/justified-layout.js`, reverse-engineered from the upstream demo's own bundle), and every
photo opens a PhotoSwipe v5 lightbox (MIT, a real npm dependency, not a hand-rolled viewer) on
click: swipe/arrow-key navigation, pinch zoom, and a caption built from each photo's own alt text.
PhotoSwipe is loaded only in the browser (dynamic import inside onMount), never during
prerendering.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import 'photoswipe/style.css';
  import type { Photo } from '$theme/albums.js';
  import { layoutJustified, targetRowHeightFor } from '$theme/justified-layout.js';

  interface Props {
    photos: Photo[];
  }

  let { photos }: Props = $props();

  const SPACING = 8;
  const HEIGHT_TOLERANCE = 0.35;

  let containerEl: HTMLDivElement | undefined = $state();
  let containerWidth = $state(0);

  const layout = $derived(
    containerWidth > 0
      ? layoutJustified(
          photos.map((photo) => photo.width / photo.height),
          {
            containerWidth,
            targetRowHeight: targetRowHeightFor(containerWidth),
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
      const { default: PhotoSwipeLightbox } = await import('photoswipe/lightbox');
      if (disposed || !containerEl) return;
      lightbox = new PhotoSwipeLightbox({
        gallery: containerEl,
        children: 'a',
        pswpModule: () => import('photoswipe'),
      });
      // The documented PhotoSwipe v5 caption recipe: a root-level UI element that reads the
      // active slide's originating DOM anchor back off `data.element` and shows its
      // `data-caption` attribute (this component's own photo alt text).
      lightbox.on('uiRegister', () => {
        lightbox?.pswp?.ui?.registerElement({
          name: 'caption',
          order: 9,
          isButton: false,
          appendTo: 'root',
          onInit: (el, pswp) => {
            // Inline styles, not a scoped <style> block: PhotoSwipe mounts this element into its
            // own portal outside this component's DOM tree, so Svelte's scope attribute never
            // reaches it.
            el.style.position = 'absolute';
            el.style.left = '0';
            el.style.right = '0';
            el.style.bottom = '0';
            el.style.padding = '0.75rem 1rem';
            el.style.background = 'linear-gradient(to top, rgb(0 0 0 / 70%), transparent)';
            el.style.color = '#fff';
            el.style.fontSize = '0.9rem';
            el.style.textAlign = 'center';
            pswp.on('change', () => {
              const active = pswp.currSlide?.data.element as HTMLElement | undefined;
              el.textContent = active?.dataset.caption ?? '';
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
      data-caption={photo.caption ?? photo.alt}
      target="_blank"
      rel="noreferrer"
      class="absolute cursor-zoom-in overflow-hidden rounded-box"
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
    </a>
  {/each}
</div>

<p class="site-narrow mt-s text-step--1 text-muted">
  {photos.length} photo{photos.length === 1 ? '' : 's'}
</p>
