<!--
@component
A labeled group of leaf fields, the editor arm for an `object` container. It renders each leaf one
level down through `FieldInput`, prefixing the leaf's form name with this group's name
(`${name}.${leafKey}`) so the nested decode in `frontmatter.ts` reads each value back into the right
sub-key. The group's value slice (the object, defaulting to `{}`) is passed straight through as the
leaf dispatcher's `frontmatter`, so a leaf reads `frontmatter[leafKey]` unchanged.

The legend uses the object's optional `label`; when the schema omits it (an object inside an array is
labeled by the array, so it carries no label of its own), a humanized field key stands in. The group
matches the Details fieldset/legend recipe so it reads as one of the panel's grouped sections.
-->
<script lang="ts">
  import FieldInput from './FieldInput.svelte';
  import type { NamedField } from '../content/types.js';
  import type { ObjectField } from '../content/fields.js';
  import type { LinkTarget } from '../content/manifest.js';
  import type { MediaEntry } from '../media/manifest.js';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { IconSet } from '../render/glyph.js';
  import type MediaHeroField from './MediaHeroField.svelte';

  interface Props {
    /** The object descriptor to render; its `fields` are the leaves this group holds. */
    field: NamedField & ObjectField;
    /** The form name prefix for this group; each leaf renders at `${name}.${leafKey}`. */
    name: string;
    /** The object value slice this group reads from, keyed by leaf sub-key. */
    frontmatter: Record<string, unknown>;
    /** The site link targets the reference arm offers (threaded through to each leaf). */
    targets: LinkTarget[];
    /** Mark the edit form dirty; threaded to each leaf's media or reference arm. */
    markFieldsDirty: () => void;
    /** The merged committed-plus-uploaded media library, keyed by content hash. */
    mediaLibrary: Record<string, MediaLibraryEntry>;
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** The host's hero-field refs, keyed by the prefixed `name` so two groups do not collide. */
    heroFieldRefs: Record<string, MediaHeroField>;
    /** Called with the server-owned record on a successful upload, so the host merges it. */
    onuploaded: (record: MediaEntry) => void;
    /** Called when a hero's needs-alt status changes, keyed by the prefixed `name`. */
    onheroneedsalt: (name: string, needsAlt: boolean) => void;
    /** The site's icon set, forwarded to each leaf's icon arm. */
    icons?: IconSet;
  }

  let {
    field,
    name,
    frontmatter,
    targets,
    markFieldsDirty,
    mediaLibrary,
    conceptId,
    id,
    heroFieldRefs,
    onuploaded,
    onheroneedsalt,
    icons,
  }: Props = $props();

  // Turn a field key into a sentence-case legend when the object carries no label of its own:
  // 'social_card' -> 'Social card', 'ogImage' -> 'Og image'. The label, when set, wins.
  function humanize(key: string): string {
    const words = key
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  const legend = $derived(field.label ?? humanize(field.name));
  const leaves = $derived(Object.entries(field.fields));
</script>

<fieldset class="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
  <legend class="text-sm font-medium">{legend}</legend>
  {#each leaves as [leafKey, leaf] (leafKey)}
    <FieldInput
      field={{ ...leaf, name: leafKey }}
      name={`${name}.${leafKey}`}
      {frontmatter}
      {targets}
      {markFieldsDirty}
      {mediaLibrary}
      {conceptId}
      {id}
      {heroFieldRefs}
      {onuploaded}
      {onheroneedsalt}
      {icons}
    />
  {/each}
</fieldset>
