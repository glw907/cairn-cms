<!--
@component
The Insert control and its modal. The picker lists each actionable component with its description and
intended use. A component with a schema opens the guided ComponentForm; a template-only component
inserts directly; a component with neither is not listed. Built on a native <dialog> for focus
trapping and Escape, following the dropdown's a11y conventions used elsewhere in the admin.
-->
<script lang="ts">
  import type { ComponentRegistry, ComponentDef } from '../render/registry.js';
  import type { IconSet } from '../render/glyph.js';
  import ComponentForm from './ComponentForm.svelte';

  interface Props {
    /** The site's component registry. */
    registry?: ComponentRegistry;
    /** Insert markdown at the editor cursor. */
    insert: (text: string) => void;
    /** The site's icon set, for icon fields. */
    icons?: IconSet;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
  }

  let { registry, insert, icons, disabled = false }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let picked = $state<ComponentDef | null>(null);

  function hasSchema(def: ComponentDef): boolean {
    return (def.attributes?.length ?? 0) > 0 || (def.slots?.length ?? 0) > 0;
  }
  function actionable(def: ComponentDef): boolean {
    return hasSchema(def) || Boolean(def.insertTemplate);
  }

  const defs = $derived((registry?.defs ?? []).filter(actionable));

  function open() {
    picked = null;
    dialog?.showModal();
  }
  function close() {
    picked = null;
    dialog?.close();
  }
  function choose(def: ComponentDef) {
    if (hasSchema(def)) {
      picked = def;
    } else {
      insert(def.insertTemplate ?? '');
      close();
    }
  }
  function onInsert(markdown: string) {
    insert(markdown);
    close();
  }
</script>

{#if defs.length > 0}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Insert block" {disabled} onclick={open}>Insert block</button>

  <dialog class="modal" aria-labelledby="cairn-insert-dialog-title" bind:this={dialog} onclose={() => (picked = null)}>
    <div class="modal-box">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="cairn-insert-dialog-title" class="text-base font-semibold">Insert component</h2>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
      </div>

      {#if picked}
        {#key picked}
          <ComponentForm def={picked} {icons} {onInsert} onBack={() => (picked = null)} />
        {/key}
      {:else}
        <ul class="menu w-full">
          {#each defs as def (def.name)}
            <li>
              <button type="button" onclick={() => choose(def)}>
                <span class="flex flex-col items-start">
                  <span class="font-medium">{def.label}</span>
                  {#if def.description}<span class="text-xs text-[var(--color-muted)]">{def.description}</span>{/if}
                  {#if def.use}<span class="text-xs text-[var(--color-muted)]">{def.use}</span>{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <form method="dialog" class="modal-backdrop">
      <button tabindex="-1" aria-label="Close">close</button>
    </form>
  </dialog>
{/if}
