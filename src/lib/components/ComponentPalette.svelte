<script lang="ts">
  // The insert-component palette (R10). Reads the site's component registry (R10a) and inserts a
  // scaffolded directive snippet at the cursor via the `insert` callback. DaisyUI dropdown so it
  // matches the Warm Stone admin theme. Shown only when the site supplies a non-empty registry; a
  // plain-markdown site (e.g. 907.life) passes no registry and this renders nothing.
  import type { ComponentRegistry } from '../render';

  let { registry, insert }: { registry?: ComponentRegistry; insert: (template: string) => void } =
    $props();

  const defs = $derived(registry?.defs ?? []);
</script>

{#if defs.length > 0}
  <div class="dropdown">
    <button type="button" tabindex="0" class="btn btn-sm btn-ghost">Insert ▾</button>
    <ul
      tabindex="0"
      class="dropdown-content menu z-10 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-2 shadow"
    >
      {#each defs as def (def.name)}
        <li>
          <button
            type="button"
            class="flex flex-col items-start gap-0.5"
            onclick={() => insert(def.insertTemplate)}
          >
            <span class="font-medium">{def.label}</span>
            <span class="text-xs opacity-60">{def.description}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
