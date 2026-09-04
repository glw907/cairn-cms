<!--
@component
The Details group inside the edit page's slide-over: the fieldset that walks `data.fields`
(minus the title and draft fields, which the host renders elsewhere) through `FieldInput`,
one leaf per field.

It owns the hero-field ref map (`heroFieldRefs`), keyed by each image field's prefixed
`name`, LOCALLY: the leaf dispatcher tree reports a ref in through `registerHeroField`
rather than mutating a shared object the way a drilled-down `bind:this` target used to (the
`ownership_invalid_mutation` fix). `focusHeroAlt` is the one thing this ref map serves
outward, for the host's needs-alt notice row.

The host mounts this panel inside its `{#key entryKey}` block (the same as `ShareLinkPanel`),
so an entry hop destroys and recreates the instance; that remount, not an explicit reset, is
what keeps one entry's hero refs from surviving onto another entry's panel.

`heroNeedsAlt` and `uploadedRecords` stay host-owned: `onheroneedsalt` and `onuploaded` are
forwarded straight through, unchanged from `FieldInput`'s own callback shape, since both have
consumers beyond this panel (the host's needs-alt notice derived, the media slide-over's own
upload path, and the save form's hidden `media` input).
-->
<script lang="ts">
  import FieldInput from './FieldInput.svelte';
  import type MediaHeroField from './MediaHeroField.svelte';
  import type { NamedField } from '../content/types.js';
  import type { LinkTarget } from '../content/manifest.js';
  import type { MediaEntry } from '../media/manifest.js';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { IconSet } from '../render/glyph.js';

  interface Props {
    /** The Details group's fields: `data.fields` minus the title and draft fields. */
    fields: NamedField[];
    /** The entry's frontmatter, keyed by field name. */
    frontmatter: Record<string, unknown>;
    /** The site link targets the reference arm offers. */
    targets: LinkTarget[];
    /** Mark the edit form dirty; threaded to each field's media or reference arm. */
    markFieldsDirty: () => void;
    /** The merged committed-plus-uploaded media library, keyed by content hash. */
    mediaLibrary: Record<string, MediaLibraryEntry>;
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** Called with the server-owned record on a successful upload, so the host merges it. */
    onuploaded: (record: MediaEntry) => void;
    /** Called when a hero's needs-alt status changes, keyed by the prefixed field name. */
    onheroneedsalt: (name: string, needsAlt: boolean) => void;
    /** The site's icon set, threaded to the icon arm's picker. Absent when the site ships none. */
    icons?: IconSet;
    /** The closed taxonomy picker's orphan values, threaded to the top-level taxonomy field. */
    orphanTags?: string[];
  }

  let { fields, frontmatter, targets, markFieldsDirty, mediaLibrary, conceptId, id, onuploaded, onheroneedsalt, icons, orphanTags }: Props =
    $props();

  // The rendered hero fields' refs, for the needs-alt notice's "Add alt text" action (focusHeroAlt
  // below). Local to this component: each FieldInput image arm reports its own ref in through
  // registerHeroField rather than mutating this map by reference, so Svelte never sees a prop
  // mutated outside its owner.
  let heroFieldRefs: Record<string, MediaHeroField> = {};

  // Identity-guarded: FieldInput's teardown passes the exact instance it registered as `owned`,
  // so a deregistering row deletes the map entry only when the map still holds that same
  // instance. Two RepeatableField rows can swap index-derived names within one render pass (a
  // deletion or reorder), and without this guard the outgoing row's teardown (running after the
  // incoming row's registration under the same key) would drop the surviving row's live ref.
  function registerHeroField(name: string, ref: MediaHeroField | null, owned?: MediaHeroField | null): void {
    if (ref) heroFieldRefs[name] = ref;
    else if (!owned || heroFieldRefs[name] === owned) delete heroFieldRefs[name];
  }

  /** The needs-alt remediation jump for a frontmatter hero: focuses the named field's own alt
   *  input. The host's needs-alt notice row calls this by field name. */
  export function focusHeroAlt(name: string): void {
    heroFieldRefs[name]?.focusAlt();
  }
</script>

{#if fields.length}
  <fieldset class="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
    <!-- The slide-over's own header already shows the "Details" eyebrow, so this group's legend
         stays for the screen-reader grouping but hides visually, the way the mockup carries it once. -->
    <legend class="sr-only">Details</legend>
    {#each fields as field (field.name)}
      <FieldInput
        {field}
        {frontmatter}
        {targets}
        {markFieldsDirty}
        {mediaLibrary}
        {conceptId}
        {id}
        {registerHeroField}
        {onuploaded}
        {onheroneedsalt}
        {icons}
        {orphanTags}
      />
    {/each}
  </fieldset>
{/if}
