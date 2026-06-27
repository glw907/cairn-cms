<!--
@component
The reference field editor arm. A single `reference` renders a combobox-style button showing the
current target's resolved title (looked up in the site's link targets), opening EntryPicker scoped to
the field's concept; on pick it sets the value and emits one hidden input the decoder reads. A many
`array(reference)` renders a removable chip list, each chip showing the target's resolved title, plus
an EntryPicker that marks the already-held ids and adds another; it emits one hidden input per selected
id, so frontmatterFromForm's getAll reads them all. EntryPicker owns the search and grouped list; this
component owns the cardinality, the chips, and the hidden inputs the form submits.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { LinkTarget } from '../content/manifest.js';
  import type { ReferenceField } from '../content/fields.js';
  import type { NamedField } from '../content/types.js';
  import EntryPicker from './EntryPicker.svelte';

  interface Props {
    /** The reference or array(reference) descriptor this arm renders. */
    field: NamedField;
    /** The current value: one id for a single reference, a list of ids for an array. */
    value: string | string[];
    /** The site's link targets, from the committed manifest (editLoad ships them). */
    targets: LinkTarget[];
    /** Called when the committed ids change (a pick, an add, or a remove), so the host sets
     *  fieldsDirty. The hidden-input writes do not fire the form's oninput, so the field signals
     *  dirty explicitly, the same way MediaHeroField does. */
    ondirty?: () => void;
  }

  let { field, value, targets, ondirty }: Props = $props();

  // The descriptor's concept, read from the single reference or the array's reference item, so the
  // picker scopes to the right concept and a chip resolves its title within that concept's targets.
  // Narrow on field.type so the access needs no cast; the array item is always a reference here
  // (fieldset's checkArrayItems enforces it at declaration), so the one cast names that guarantee.
  const concept = $derived.by(() => {
    if (field.type === 'array') return (field.item as ReferenceField).concept;
    if (field.type === 'reference') return field.concept;
    return '';
  });

  // The single reference's current id, seeded once from the prop and owned thereafter (untrack marks
  // the read a deliberate one-time seed, not a reactive dependency). Updated on pick.
  let singleId = $state(untrack(() => (typeof value === 'string' ? value : '')));
  // The array's current ids, seeded once from the prop and updated as chips are added and removed.
  let ids = $state<string[]>(untrack(() => (Array.isArray(value) ? [...value] : [])));

  // The headless picker; this component drives it so it can carry the concept filter and the held ids.
  let picker = $state<{ open: () => void } | null>(null);

  /** Resolve an id to its target title within this field's concept, falling back to the bare id. */
  function titleFor(id: string): string {
    return targets.find((t) => t.concept === concept && t.id === id)?.title ?? id;
  }

  function chooseSingle(target: LinkTarget) {
    singleId = target.id;
    ondirty?.();
  }
  function chooseMany(target: LinkTarget) {
    if (!ids.includes(target.id)) {
      ids = [...ids, target.id];
      ondirty?.();
    }
  }
  function remove(id: string) {
    ids = ids.filter((x) => x !== id);
    ondirty?.();
  }
</script>

{#if field.type === 'array'}
  <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
    <legend class="text-sm font-medium">{field.label}</legend>
    {#if ids.length}
      <ul class="flex flex-wrap gap-2">
        {#each ids as id (id)}
          <li class="badge badge-ghost gap-1">
            <span>{titleFor(id)}</span>
            <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label={`Remove ${titleFor(id)}`} onclick={() => remove(id)}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <input type="hidden" name={field.name} value={id} />
          </li>
        {/each}
      </ul>
    {/if}
    <div>
      <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label={`Add ${field.label}`} onclick={() => picker?.open()}>
        Add {field.label}
      </button>
    </div>
  </fieldset>
  <EntryPicker
    bind:this={picker}
    {targets}
    choose={chooseMany}
    conceptFilter={concept}
    selectedIds={ids}
    trigger={false}
    heading={`Choose ${field.label}`}
    searchLabel={`Search ${concept}`}
    emptyText={`No ${concept} to choose.`}
  />
{:else}
  <div class="flex flex-col gap-1">
    <span class="text-sm font-medium">{field.label}</span>
    <button type="button" class="btn btn-sm btn-ghost justify-start" aria-haspopup="dialog" aria-label={field.label} onclick={() => picker?.open()}>
      {#if singleId}{titleFor(singleId)}{:else}<span class="text-[var(--color-muted)]">Choose {field.label}</span>{/if}
    </button>
    {#if singleId}
      <input type="hidden" name={field.name} value={singleId} />
    {/if}
  </div>
  <EntryPicker
    bind:this={picker}
    {targets}
    choose={chooseSingle}
    conceptFilter={concept}
    trigger={false}
    heading={`Choose ${field.label}`}
    searchLabel={`Search ${concept}`}
    emptyText={`No ${concept} to choose.`}
  />
{/if}
