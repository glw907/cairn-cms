<!-- @component
A vertical version-history timeline, styled after `src/pages/changelog.astro`'s `Feed.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a dated left column, a dot-and-rail divider, and each
entry's title, screenshot, and body in the right column.
-->
<script lang="ts">
  import type { ChangelogEntry } from '$theme/types.js';
  import AppMockup from '$theme/components/AppMockup.svelte';

  interface Props {
    entries: ChangelogEntry[];
  }
  let { entries }: Props = $props();
</script>

<ol class="m-0 flex list-none flex-col gap-l p-0">
  {#each entries as entry (entry.date)}
    <li class="grid grid-cols-[auto_1fr] items-start gap-m sm:grid-cols-[8rem_auto_1fr]">
      <p class="col-start-2 row-start-1 m-0 hidden text-step--1 font-medium text-primary sm:col-start-1 sm:block">{entry.date}</p>
      <span class="relative col-start-1 row-start-1 flex justify-center self-stretch sm:col-start-2" aria-hidden="true">
        <span class="absolute top-1 h-3 w-3 rounded-full bg-primary"></span>
        <span class="h-full w-px bg-card-border"></span>
      </span>
      <div class="col-start-2 row-start-1 sm:col-start-3">
        <p class="m-0 mb-2xs text-step--1 font-medium text-primary sm:hidden">{entry.date}</p>
        <h3 class="mb-2xs text-step-1 font-bold text-primary">{entry.title}</h3>
        {#if entry.image}
          <AppMockup variant={entry.image} class="mb-2xs aspect-video w-full max-w-md rounded-box border border-card-border" />
        {/if}
        <p class="m-0 text-step--1 text-muted">{entry.text}</p>
        {#if entry.items}
          <ul class="mt-2xs flex list-disc flex-col gap-1 pl-m text-step--1 text-muted marker:text-primary">
            {#each entry.items as item (item)}
              <li>{item}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </li>
  {/each}
</ol>
