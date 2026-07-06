<!-- @component
A vertical version-history timeline, styled after `src/pages/changelog.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a dated dot-and-line rail on the left, each entry's
title and body on the right. Plain Tailwind (a border-left rail plus an absolutely positioned
dot per entry); the sidebar-layout chassis primitive does not fit here since the rail scales with
the entry list rather than being a fixed-width aside.
-->
<script lang="ts">
  import type { ChangelogEntry } from '$theme/types.js';

  interface Props {
    entries: ChangelogEntry[];
  }
  let { entries }: Props = $props();
</script>

<ol class="m-0 flex list-none flex-col gap-l border-l-2 border-card-border p-0 pl-m">
  {#each entries as entry (entry.date)}
    <li class="relative">
      <span class="absolute -left-[calc(1.5rem+3px)] top-1 h-3 w-3 rounded-full bg-primary"></span>
      <p class="m-0 mb-2xs text-step--1 font-medium text-primary">{entry.date}</p>
      <h3 class="mb-2xs text-step-1 font-bold text-base-content">{entry.title}</h3>
      <p class="m-0 text-step--1 text-muted">{entry.text}</p>
      {#if entry.items}
        <ul class="mt-2xs flex list-disc flex-col gap-1 pl-m text-step--1 text-muted marker:text-primary">
          {#each entry.items as item (item)}
            <li>{item}</li>
          {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ol>
