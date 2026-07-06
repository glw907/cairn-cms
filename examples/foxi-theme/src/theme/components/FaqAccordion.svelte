<!-- @component
An accordion of question/answer pairs, styled after `src/components/ui/Accordion.astro`
(oxygenna-themes/foxi-astro-theme, MIT): every item is its own native `<details>`/`<summary>`
(so it needs no script and works with JS disabled, and any number of items can be open at once,
matching the upstream), joined into one bordered, divided list rather than separate rounded
cards. The disclosure marker is a plain "+" that rotates into a "x" on open, the upstream's own
`Accordion.astro` treatment, not the "-" a collapse-style minus icon would read as.
-->
<script lang="ts">
  import type { FaqItem } from '$theme/types.js';

  interface Props {
    items: FaqItem[];
    /** Which item (by index) starts open; the upstream data marks the first item per category
     *  `open: true`. */
    openIndex?: number;
  }
  let { items, openIndex = 0 }: Props = $props();
</script>

<div class="divide-y divide-card-border rounded-box border border-card-border bg-base-100">
  {#each items as item, index (item.question)}
    <details open={index === openIndex} class="group">
      <summary class="flex list-none items-center justify-between gap-m px-m py-s text-step-0 font-semibold text-base-content [&::-webkit-details-marker]:hidden">
        {item.question}
        <svg class="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </summary>
      <p class="m-0 bg-base-200/50 px-m pb-s text-step--1 text-muted">{item.reply}</p>
    </details>
  {/each}
</div>
