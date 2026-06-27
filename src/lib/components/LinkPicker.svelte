<!--
@component
The "Link to page" control. It wraps EntryPicker, the shared search + concept-grouped target list, and
turns the chosen target into an inline cairn: internal link through the editor's registerInsertLink
seam. EntryPicker owns the list and search; this component owns the cairn-token meaning and the trigger.
The plain-URL link is the toolbar's Web link dialog; this is for an internal target.
-->
<script lang="ts">
  import type { LinkTarget } from '../content/manifest.js';
  import { formatCairnToken } from '../content/links.js';
  import EntryPicker from './EntryPicker.svelte';

  interface Props {
    /** The site's link targets, from the committed manifest (editLoad ships them). */
    linkTargets: LinkTarget[];
    /** Insert an inline cairn link at the editor cursor. */
    insert: (href: string, title: string) => void;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
    /** Render the built-in Link to page trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { linkTargets, insert, disabled = false, trigger = true }: Props = $props();

  // The headless picker; this component drives it so it can carry the disabled trigger and the
  // cairn-token meaning, while EntryPicker stays ignorant of both.
  let picker = $state<{ open: () => void } | null>(null);

  /** Open the picker programmatically, for a host that drives it without the trigger. */
  export function open() {
    picker?.open();
  }
  function choose(target: LinkTarget) {
    insert(formatCairnToken(target), target.title);
  }
</script>

{#if trigger}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Link to page" {disabled} onclick={open}>
    Link to page
  </button>
{/if}

<EntryPicker bind:this={picker} targets={linkTargets} {choose} trigger={false} />
