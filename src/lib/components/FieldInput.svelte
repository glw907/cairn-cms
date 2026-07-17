<!--
@component
The leaf-field dispatcher for the edit page's Details panel. It renders one leaf field (a scalar,
an image, or a reference) as the matching input, picked by `field.type`.

It is name-prefixable so a container row can reuse it one level down. The `name` prop is the form
input name: it defaults to `field.name` at the top level, and a container caller passes a prefixed
path (`${parent}.${index}` for an array element, `${parent}.${leafKey}` for an object leaf) so the
nested decode in `frontmatter.ts` reads the value back from the right slot. Each arm reads its value
from `frontmatter[field.name]`, so a nested caller passes the row or object slice as `frontmatter`
and the leaf key as `field.name`, leaving the reads unchanged.

An `object` field renders a labeled `ObjectGroupField`, and a non-reference `array` renders a
`RepeatableField`; both recurse one level back through this dispatcher for their leaves, which the
one-level nesting cap (the declaration guard) bounds so the recursion terminates. An
`array(reference)` stays on `ReferenceField`.
-->
<script lang="ts">
  import MediaHeroField from './MediaHeroField.svelte';
  import ReferenceField from './ReferenceField.svelte';
  import ObjectGroupField from './ObjectGroupField.svelte';
  import RepeatableField from './RepeatableField.svelte';
  import IconPicker from './IconPicker.svelte';
  import { isClosedMultiselect } from '../content/frontmatter.js';
  import type { ImageValue, NamedField } from '../content/types.js';
  import type { TextareaField, NumberField, SelectField, MultiselectField } from '../content/fields.js';
  import type { IconSet } from '../render/glyph.js';
  import type { LinkTarget } from '../content/manifest.js';
  import type { MediaEntry } from '../media/manifest.js';
  import type { MediaLibraryEntry } from '../media/library-entry.js';

  interface Props {
    /** The leaf field to render; its `name` is the frontmatter key the arm reads its value from. */
    field: NamedField;
    /** The form input name. Defaults to `field.name`; a container caller passes a prefixed path. */
    name?: string;
    /** The frontmatter slice this field reads from, keyed by `field.name`. */
    frontmatter: Record<string, unknown>;
    /** The site link targets the reference arm offers. */
    targets: LinkTarget[];
    /** Mark the edit form dirty; the image arm wires it to the hero field's commit. */
    markFieldsDirty: () => void;
    /** The merged committed-plus-uploaded media library, keyed by content hash. */
    mediaLibrary: Record<string, MediaLibraryEntry>;
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** The host's hero-field refs, keyed by the prefixed `name` so two rows do not collide. */
    heroFieldRefs: Record<string, MediaHeroField>;
    /** Called with the server-owned record on a successful upload, so the host merges it. */
    onuploaded: (record: MediaEntry) => void;
    /** Called when a hero's needs-alt status changes, keyed by the prefixed `name`. */
    onheroneedsalt: (name: string, needsAlt: boolean) => void;
    /** The site's icon set, threaded to the icon arm's picker. Absent when the site ships none. */
    icons?: IconSet;
    /**
     * The closed taxonomy picker's orphan values: prior tags no longer in the site vocabulary, which
     *  this arm renders checked, removable, and flagged "not in your tag list". Absent for every
     *  other field, and absent on the container recursion (only the top-level taxonomy field gets it).
     */
    orphanTags?: string[];
  }

  let {
    field,
    name = field.name,
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
    orphanTags,
  }: Props = $props();

  function str(v: unknown): string {
    return v == null ? '' : String(v);
  }

  // Turn the form name into a safe id token. A container caller passes a dotted path
  // (`${parent}.${index}`, `${parent}.${leafKey}`), and a dot survives fine in the id attribute
  // itself but this keeps the id free of anything but letters, digits, underscore, and hyphen.
  function hintId(rawName: string): string {
    return rawName.replace(/[^A-Za-z0-9_-]+/g, '-');
  }
  const hintBase = $derived(hintId(name));

  // The closed taxonomy picker's checkboxes, for the required group's honest validity signal.
  let multiselectFieldset = $state<HTMLFieldSetElement | null>(null);
  const closedMultiselectRequired = $derived(
    field.type === 'multiselect' && isClosedMultiselect(field)
      ? ((field as NamedField & MultiselectField).required ?? false)
      : false,
  );

  // Native `required` on every checkbox in a closed multiselect would lie ("check every box").
  // This sets a custom validity message on the group's first checkbox by hand instead, so the
  // browser's own invalid report (and EditPage's capture-phase reveal) fires exactly like every
  // other required arm. It runs on every group change, not just a check, so unchecking the only
  // checked box re-arms the message instead of leaving a valid group that has none checked.
  function updateMultiselectValidity(): void {
    if (!multiselectFieldset) return;
    const boxes = Array.from(multiselectFieldset.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    const first = boxes[0];
    if (!first) return;
    if (!closedMultiselectRequired) {
      first.setCustomValidity('');
      return;
    }
    const anyChecked = boxes.some((box) => box.checked);
    first.setCustomValidity(anyChecked ? '' : 'Choose at least one.');
  }

  // Set the initial validity once the fieldset mounts, so a required group with nothing checked
  // is already invalid before the author touches it, not only after a first change.
  $effect(() => {
    if (multiselectFieldset) updateMultiselectValidity();
  });

  // The HTML input type for a plain single-line text input arm (url, email, datetime, and the text
  // fallback). datetime maps to the datetime-local control; everything else carries no type attribute
  // so the browser defaults to a text input.
  function inputType(fieldType: string): 'url' | 'email' | 'datetime-local' | undefined {
    switch (fieldType) {
      case 'url':
        return 'url';
      case 'email':
        return 'email';
      case 'datetime':
        return 'datetime-local';
      default:
        return undefined;
    }
  }

  // The built-in hint a date field carries when its adapter sets no description. The control reads as
  // if it might schedule publishing, so this reassures the editor that the date is metadata and that
  // publishing is the separate, deliberate step. A field-level description overrides it.
  const DATE_PUBLISH_HINT = 'Sets the date for this post. Publishing is a separate step you choose.';
</script>

{#snippet fieldHint(hintName: string, text: string)}
  <p id={`${hintName}-hint`} class="fld-hint mt-1 text-sm text-muted">
    {text}
  </p>
{/snippet}

{#if field.type === 'textarea'}
  {@const f = field as NamedField & TextareaField}
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{f.label}</span>
    <textarea class="textarea textarea-sm" {name} aria-label={f.label} aria-describedby={f.help ? `${hintBase}-hint` : undefined} rows={f.rows ?? 3} required={f.required}>{str(frontmatter[f.name])}</textarea>
    {#if f.help}
      {@render fieldHint(hintBase, f.help)}
    {/if}
  </label>
{:else if field.type === 'number'}
  {@const f = field as NamedField & NumberField}
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{f.label}</span>
    <input
      class="input input-sm"
      type="number"
      {name}
      aria-label={f.label}
      aria-describedby={f.help ? `${hintBase}-hint` : undefined}
      min={f.min}
      max={f.max}
      step={f.integer ? 1 : undefined}
      value={str(frontmatter[f.name])}
      required={f.required}
    />
    {#if f.help}
      {@render fieldHint(hintBase, f.help)}
    {/if}
  </label>
{:else if field.type === 'select'}
  {@const f = field as NamedField & SelectField}
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{f.label}</span>
    <select class="select select-sm" {name} aria-label={f.label} aria-describedby={f.help ? `${hintBase}-hint` : undefined} required={f.required}>
      <!-- A leading empty option submits '' (the key is dropped on save); a required select
           leaves it unselected so an unset value fails the required check with a clear message. -->
      <option value="">&mdash; none &mdash;</option>
      {#each f.options as option (option)}
        <option value={option} selected={str(frontmatter[f.name]) === option}>{option}</option>
      {/each}
    </select>
    {#if f.help}
      {@render fieldHint(hintBase, f.help)}
    {/if}
  </label>
{:else if field.type === 'date'}
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{field.label}</span>
    <!-- A date field always carries a hint: the adapter's help when set, else the
         built-in publish-clarity default. So aria-describedby always points at the paragraph. -->
    <input class="input input-sm" type="date" {name} aria-label={field.label} aria-describedby={`${hintBase}-hint`} value={str(frontmatter[field.name])} required={field.required} />
    {@render fieldHint(hintBase, field.help || DATE_PUBLISH_HINT)}
  </label>
{:else if field.type === 'boolean'}
  <div class="flex flex-col gap-1">
    <label class="label cursor-pointer justify-start gap-2">
      <input class="checkbox checkbox-sm" type="checkbox" {name} aria-label={field.label} aria-describedby={field.help ? `${hintBase}-hint` : undefined} checked={frontmatter[field.name] === true} />
      <span class="text-sm">{field.label}</span>
    </label>
    {#if field.help}
      {@render fieldHint(hintBase, field.help)}
    {/if}
  </div>
{:else if field.type === 'multiselect' && isClosedMultiselect(field)}
  {@const f = field as NamedField & MultiselectField & { options: readonly string[] }}
  {@const selected = (frontmatter[f.name] ?? []) as string[]}
  <fieldset
    bind:this={multiselectFieldset}
    class="fieldset"
    aria-describedby={f.help ? `${hintBase}-hint` : undefined}
    onchange={updateMultiselectValidity}
  >
    <legend class="fieldset-legend">{f.label}</legend>
    {#if f.help}
      {@render fieldHint(hintBase, f.help)}
    {/if}
    <div class="flex flex-wrap gap-2">
      {#each f.options as option (option)}
        {@const orphan = orphanTags?.includes(option) ?? false}
        <label class="label cursor-pointer justify-start gap-2">
          <input
            class="checkbox checkbox-sm"
            type="checkbox"
            {name}
            value={option}
            checked={selected.includes(option)}
          />
          <span class="text-sm">{option}</span>
          {#if orphan}
            <!-- A non-blocking flag, never a block: the orphan stays a checked, removable option so
                 an untouched save preserves it and unchecking it drops it. Warning ink, not the fill
                 tone, so the small label clears the contrast floor on the light surface. -->
            <span class="text-xs text-[var(--cairn-warning-ink)]">not in your tag list</span>
          {/if}
        </label>
      {/each}
    </div>
  </fieldset>
{:else if field.type === 'multiselect'}
  {@const f = field as NamedField & MultiselectField}
  {@const tagValue = ((frontmatter[f.name] ?? []) as string[]).join(', ')}
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{f.label}</span>
    <input
      class="input input-sm"
      {name}
      aria-label={f.label}
      aria-describedby={f.help ? `${hintBase}-hint` : undefined}
      placeholder={f.placeholder ?? (f.help ? undefined : 'Separate values with commas')}
      value={tagValue}
      required={f.required}
    />
    {#if f.help}
      {@render fieldHint(hintBase, f.help)}
    {/if}
  </label>
{:else if field.type === 'image'}
  {@const heroValue = frontmatter[field.name] as ImageValue | undefined}
  <!-- The binding_property_non_reactive warning this logs is benign: the parent owns the $state
       proxy and mutates it by reference, and the hero-alt focus flow reads the same prefixed key. -->
  <MediaHeroField
    bind:this={heroFieldRefs[name]}
    field={{ name, label: field.label }}
    value={heroValue}
    decorative={heroValue?.decorative ?? false}
    lead={field.type === 'image' && field.seo === true}
    mediaLibrary={mediaLibrary}
    conceptId={conceptId}
    id={id}
    onuploaded={onuploaded}
    ondirty={markFieldsDirty}
    onneedsaltchange={(n) => onheroneedsalt(name, n)}
  />
{:else if field.type === 'reference'}
  <ReferenceField {field} value={(frontmatter[field.name] ?? '') as string} {targets} ondirty={markFieldsDirty} />
{:else if field.type === 'array' && field.item.type === 'reference'}
  <ReferenceField {field} value={(frontmatter[field.name] ?? []) as string[]} {targets} ondirty={markFieldsDirty} />
{:else if field.type === 'object'}
  <ObjectGroupField {field} {name} frontmatter={(frontmatter[field.name] ?? {}) as Record<string, unknown>} {markFieldsDirty} {mediaLibrary} {conceptId} {id} {heroFieldRefs} {targets} {onuploaded} {onheroneedsalt} {icons} />
{:else if field.type === 'array' && field.item.type !== 'reference'}
  <RepeatableField {field} {name} rows={(frontmatter[field.name] ?? []) as unknown[]} {markFieldsDirty} {mediaLibrary} {conceptId} {id} {heroFieldRefs} {targets} {onuploaded} {onheroneedsalt} {icons} />
{:else if field.type === 'icon' && icons}
  <div class="flex flex-col gap-1">
    <span class="text-sm font-medium">{field.label}</span>
    <IconPicker
      {icons}
      label={field.label}
      describedby={field.help ? `${hintBase}-hint` : undefined}
      value={typeof frontmatter[field.name] === 'string' ? (frontmatter[field.name] as string) : ''}
      required={field.required ?? false}
      onChange={(glyph) => {
        frontmatter[field.name] = glyph;
        markFieldsDirty();
      }}
    />
    {#if field.help}
      {@render fieldHint(hintBase, field.help)}
    {/if}
  </div>
{:else}
  <!-- The plain single-line text input arm: url, email, datetime, and the text fallback. They share
       one shape and differ only in the input type inputType() resolves. -->
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">{field.label}</span>
    <input class="input input-sm" type={inputType(field.type)} {name} aria-label={field.label} aria-describedby={field.help ? `${hintBase}-hint` : undefined} value={str(frontmatter[field.name])} required={field.required} />
    {#if field.help}
      {@render fieldHint(hintBase, field.help)}
    {/if}
  </label>
{/if}
