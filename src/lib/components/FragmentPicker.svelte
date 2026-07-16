<!--
@component
The "Include a fragment" control. It wraps EntryPicker, the shared search + target list, and turns
the chosen target into the exact `::include{fragment="<id>"}` directive text through the editor's
generic insertAtCursor seam. EntryPicker owns the list and search; this component owns the
directive-text meaning and the trigger. Each FragmentTarget projects into the LinkTarget shape
EntryPicker expects: the permalink is empty because a fragment is included, never linked to, and
draft is false because draft carries no meaning on a non-routable concept, which has no page to
withhold. A null fragmentTargets (nothing here can include one) hides the trigger and mounts no
dialog at all.
-->
<script lang="ts">
  import type { FragmentTarget } from '../sveltekit/content-routes-core.js';
  import type { LinkTarget } from '../content/manifest.js';
  import { FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
  import EntryPicker from './EntryPicker.svelte';

  interface Props {
    /** The site's published fragments, from `EditData.fragmentTargets`. Null hides the trigger and
     *  the dialog, and covers both a site with no fragments concept and a fragment's own edit
     *  screen; an empty array shows the honest empty state. */
    fragmentTargets: FragmentTarget[] | null;
    /** Insert the directive text at the editor cursor (the generic insertAtCursor seam). */
    insert: (text: string) => void;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
    /** Render the built-in Include a fragment trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { fragmentTargets, insert, disabled = false, trigger = true }: Props = $props();

  const targets: LinkTarget[] = $derived(
    (fragmentTargets ?? []).map((f) => ({
      concept: FRAGMENTS_CONCEPT_ID,
      id: f.id,
      title: f.title,
      permalink: '',
      draft: false,
    })),
  );

  // The headless picker; this component drives it so it can carry the disabled trigger and the
  // include-directive meaning, while EntryPicker stays ignorant of both.
  let picker = $state<{ open: () => void } | null>(null);

  /** Open the picker programmatically, for a host that drives it without the trigger. */
  export function open() {
    picker?.open();
  }
  function choose(target: LinkTarget) {
    insert(`::include{fragment="${target.id}"}`);
  }
</script>

{#if fragmentTargets !== null}
  {#if trigger}
    <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Include a fragment" {disabled} onclick={open}>
      Include a fragment
    </button>
  {/if}

  <EntryPicker
    bind:this={picker}
    {targets}
    {choose}
    trigger={false}
    heading="Include a fragment"
    searchLabel="Search fragments"
    emptyText="No fragments published yet. Publish a fragment first to include it here."
  />
{/if}
