<!--
@component
The two-column shortcut grid, the shared body of both discoverability sheets (ShortcutsDialog and
the Markdown help dialog). Each row pairs a label with its chord, read from the single
editor-shortcuts source. The host wraps it with its own heading and any closing line.
-->
<script lang="ts">
  import { editorShortcuts } from './editor-shortcuts.js';
</script>

<div class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
  {#each editorShortcuts as row (row.label)}
    <div class="flex items-baseline justify-between gap-4">
      <span>{row.label}</span>
      <span class="font-mono text-[0.75rem] text-muted">{row.keys}</span>
    </div>
  {/each}
</div>
