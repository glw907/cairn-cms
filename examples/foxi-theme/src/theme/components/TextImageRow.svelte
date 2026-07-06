<!-- @component
An alternating text-and-image row, styled after `src/components/blocks/basic/TextImage.astro`
and `HightlightRows.astro` (oxygenna-themes/foxi-astro-theme, MIT): a heading with a colored
keyword, a paragraph, and a placeholder illustration panel, flipping sides per instance. The
upstream source pins its highlight rows with a scroll-linked sticky effect; this port renders
each row as a plain stacked section (a licensed structural simplification, since a scroll-jacked
animation is not part of the static, at-rest design the family responsive standard measures).
-->
<script lang="ts">
  interface Props {
    title: string;
    /** The one word in `title` drawn in the primary color, matching the upstream `<strong>`. */
    highlight: string;
    text: string;
    imagePosition?: 'left' | 'right';
  }
  let { title, highlight, text, imagePosition = 'right' }: Props = $props();

  const parts = $derived(title.split(highlight));
</script>

<div class="grid grid-cols-1 items-center gap-l lg:grid-cols-2">
  <div class="cairn-card flex aspect-[4/3] items-center justify-center bg-base-200 {imagePosition === 'right' ? 'lg:order-2' : ''}">
    <svg class="h-16 w-16 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 15l4-4 4 3 4-5 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
  <div>
    <h2 class="mb-2xs text-step-3 font-bold text-base-content">
      {parts[0]}<strong class="text-primary">{highlight}</strong>{parts[1]}
    </h2>
    <p class="m-0 text-step-1 text-muted">{text}</p>
  </div>
</div>
