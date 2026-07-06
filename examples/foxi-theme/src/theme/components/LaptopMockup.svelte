<!-- @component
A laptop-framed variant of `AppMockup`: the same abstract dashboard illustration set inside a
screen bezel and a flat keyboard deck, styled after the laptop device shot on the FAQ page's
pricing-value band (`src/components/blocks/basic/TextImage.astro`, oxygenna-themes/foxi-astro-theme,
MIT). Drawn entirely from the chassis's own semantic tokens, the same as `AppMockup` itself.
-->
<script lang="ts">
  import AppMockup from '$theme/components/AppMockup.svelte';

  interface Props {
    variant?: 'calendar' | 'chat' | 'chart' | 'stats' | 'kanban';
    class?: string;
  }
  let { variant = 'calendar', class: className = '' }: Props = $props();
</script>

<div class="w-full {className}">
  <div class="rounded-t-2xl border-[10px] border-b-0 border-base-300 bg-base-300 shadow-2xl">
    <AppMockup {variant} class="aspect-[16/10] rounded-t-md" />
  </div>
  <div class="relative h-4 rounded-b-2xl bg-base-300 shadow-2xl">
    <div class="absolute left-1/2 top-0 h-1.5 w-20 -translate-x-1/2 rounded-b-md bg-base-content/20"></div>
  </div>
</div>
