<!-- @component
A single-open accordion of question/answer pairs, styled after `src/pages/faq.astro` and
`FaqSticky.astro` (oxygenna-themes/foxi-astro-theme, MIT). Expressed with DaisyUI's own
`collapse`/`collapse-plus` component (a native `<details>`/`<summary>` pair, so it needs no
script and works with JS disabled), no chassis edit and no new primitive.
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

<div class="flex flex-col gap-2xs">
  {#each items as item, index (item.question)}
    <div class="collapse-plus collapse rounded-box border border-card-border bg-base-100">
      <input type="radio" name="faq-accordion-{items[0]?.question}" checked={index === openIndex} />
      <div class="collapse-title text-step-0 font-semibold text-base-content">{item.question}</div>
      <div class="collapse-content text-step--1 text-muted">
        <p class="m-0">{item.reply}</p>
      </div>
    </div>
  {/each}
</div>
