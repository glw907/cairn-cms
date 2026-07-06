<!-- @component
A row of "reason to contact us" cards, styled after
`src/components/blocks/contact/ContactCards.astro` (oxygenna-themes/foxi-astro-theme, MIT):
a distinct icon per reason, a title, and a short line, in the chassis's `.cairn-card` recipe.
-->
<script lang="ts">
  import type { ContactReason } from '$theme/types.js';
  import Icon from '$theme/components/Icon.svelte';

  interface Props {
    reasons: ContactReason[];
  }
  let { reasons }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-m sm:grid-cols-2 lg:grid-cols-4">
  {#each reasons as reason (reason.title)}
    <div class="cairn-card text-center">
      <span class="mx-auto mb-2xs inline-flex h-10 w-10 items-center justify-center rounded-field bg-secondary text-primary">
        <Icon name={reason.icon} class="h-5 w-5" />
      </span>
      <h3 class="mb-2xs text-step-0 font-semibold text-base-content">{reason.title}</h3>
      <p class="m-0 text-step--1 text-muted">{reason.text}</p>
    </div>
  {/each}
</div>
