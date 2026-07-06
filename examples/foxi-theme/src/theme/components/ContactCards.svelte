<!-- @component
A row of "reason to contact us" cards, styled after
`src/components/blocks/contact/ContactCards.astro` (oxygenna-themes/foxi-astro-theme, MIT):
an icon, a title, and a short line, in the chassis's `.cairn-card` recipe.
-->
<script lang="ts">
  import type { ContactReason } from '$theme/types.js';

  interface Props {
    reasons: ContactReason[];
  }
  let { reasons }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-m sm:grid-cols-2 lg:grid-cols-4">
  {#each reasons as reason (reason.title)}
    <div class="cairn-card text-center">
      <span class="mx-auto mb-2xs inline-flex h-10 w-10 items-center justify-center rounded-field bg-secondary text-primary">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 4h16v12H4Zm0 0 8 7 8-7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <h3 class="mb-2xs text-step-0 font-semibold text-base-content">{reason.title}</h3>
      <p class="m-0 text-step--1 text-muted">{reason.text}</p>
    </div>
  {/each}
</div>
