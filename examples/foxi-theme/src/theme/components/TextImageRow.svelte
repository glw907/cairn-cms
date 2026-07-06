<!-- @component
An alternating text-and-image row, styled after `src/components/blocks/basic/TextImage.astro`
and `HightlightRows.astro` (oxygenna-themes/foxi-astro-theme, MIT): a heading with a colored
keyword, a paragraph, and an `AppMockup` illustration, flipping sides per instance. The upstream
source pins its highlight rows with a scroll-linked sticky effect; this port renders each row as
a plain stacked section (a licensed structural simplification, since a scroll-jacked animation is
not part of the static, at-rest design the family responsive standard measures).
-->
<script lang="ts">
  import AppMockup from '$theme/components/AppMockup.svelte';

  interface Props {
    title: string;
    /** The one word in `title` drawn in the primary color, matching the upstream `<strong>`. */
    highlight: string;
    text: string;
    imagePosition?: 'left' | 'right';
    image?: 'calendar' | 'chat' | 'chart' | 'stats' | 'kanban';
  }
  let { title, highlight, text, imagePosition = 'right', image = 'chart' }: Props = $props();

  const parts = $derived(title.split(highlight));
</script>

<div class="grid grid-cols-1 items-center gap-l lg:grid-cols-2">
  <AppMockup variant={image} class="cairn-card aspect-[4/3] {imagePosition === 'right' ? 'lg:order-2' : ''}" />
  <div>
    <h2 class="mb-2xs text-step-3 font-bold text-base-content">
      {parts[0]}<strong class="text-primary">{highlight}</strong>{parts[1]}
    </h2>
    <p class="m-0 text-step-1 text-muted">{text}</p>
  </div>
</div>
