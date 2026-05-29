<!--
@component
The insert-component palette: a dropdown listing the site's registered directive components
(seam 3). Picking one inserts its template at the cursor through the editor's insert callback.
Renders nothing when the site configures no registry.
-->
<script lang="ts">
  import type { ComponentRegistry } from '../render/registry.js';

  interface Props {
    /** The site's component registry; the palette derives its catalog from it. */
    registry?: ComponentRegistry;
    /** Insert a template at the editor's cursor. */
    insert: (template: string) => void;
  }

  let { registry, insert }: Props = $props();

  const defs = $derived(registry?.defs ?? []);
</script>

{#if defs.length > 0}
  <div class="dropdown">
    <button type="button" class="btn btn-sm btn-ghost" tabindex="0">Insert</button>
    <ul class="dropdown-content menu rounded-box border border-base-300 bg-base-100 z-10 w-56 shadow">
      {#each defs as def (def.name)}
        <li>
          <button type="button" onclick={() => insert(def.insertTemplate)}>
            <span class="flex flex-col items-start">
              <span class="font-medium">{def.label}</span>
              <span class="text-xs opacity-60">{def.description}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
