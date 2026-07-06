<!-- @component
A plain outline icon, drawn from this theme's own small line-icon set (`$theme/icons.js`), styled
after the pink line icons on `src/components/ui/Feature.astro` (oxygenna-themes/foxi-astro-theme,
MIT). One `<svg>` per name, not a sprite: this theme's icon count is small enough that a sprite
would add a build step for no real gain.
-->
<script lang="ts">
  import { ICONS, DEFAULT_ICON } from '$theme/icons.js';

  interface Props {
    name: string;
    class?: string;
  }
  let { name, class: className = 'h-5 w-5' }: Props = $props();

  const d = $derived(ICONS[name] ?? DEFAULT_ICON);
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
  <path d={d} stroke-linecap="round" stroke-linejoin="round" />
</svg>
