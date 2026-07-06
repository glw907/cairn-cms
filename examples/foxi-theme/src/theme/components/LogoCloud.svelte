<!-- @component
A "trusted by" logo row, styled after `src/components/blocks/socialproof/Basic.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a caption over a row of muted wordmarks. Plain Tailwind
flex-wrap, no chassis primitive needed for a device this small.
-->
<script lang="ts">
  interface Props {
    count: string;
    logos: string[];
  }
  let { count, logos }: Props = $props();
</script>

<div class="text-center">
  <p class="mb-s text-step--1 text-muted">Trusted by <strong class="text-base-content">{count}</strong> businesses</p>
  <ul class="m-0 flex flex-wrap items-center justify-center gap-l p-0" aria-label="Customer logos">
    {#each logos as logo (logo)}
      <li class="text-step-1 font-semibold text-muted/70">{logo}</li>
    {/each}
  </ul>
</div>
