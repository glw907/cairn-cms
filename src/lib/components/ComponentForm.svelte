<!--
@component
The schema-driven fill form for one component. It holds the working ComponentValues, seeded from
emptyValues(def), and renders attribute fields and the title/body and other non-repeatable slots.
Submit (Task 6) serializes and validates through buildComponentInsert and calls onInsert with the
markdown. Back returns to the picker. This is not a nested HTML form; Insert calls a callback.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { emptyValues, type ComponentDef } from '../render/registry.js';
  import { buildComponentInsert } from '../render/component-insert.js';
  import type { IconSet } from '../render/glyph.js';
  import IconPicker from './IconPicker.svelte';

  interface Props {
    def: ComponentDef;
    icons?: IconSet;
    /** Called with the serialized markdown when the form validates. */
    onInsert: (markdown: string) => void;
    /** Return to the picker. */
    onBack: () => void;
  }

  let { def, icons, onInsert, onBack }: Props = $props();

  // Working values, seeded once from the schema. $state makes the nested records deeply reactive.
  // untrack marks the seed as a deliberate one-time read of the initial def, not a reactive miss.
  let values = $state(untrack(() => emptyValues(def)));

  const attributes = $derived(def.attributes ?? []);
  // Non-repeatable slots render here; the repeatable list is handled separately.
  const flatSlots = $derived((def.slots ?? []).filter((s) => s.kind !== 'repeatable'));
  const repeatableSlots = $derived((def.slots ?? []).filter((s) => s.kind === 'repeatable'));

  // The live $state proxy array for a repeatable slot, so push/splice stay reactive.
  function slotItems(name: string): string[] {
    const v = values.slots[name];
    return Array.isArray(v) ? v : [];
  }

  // Stable per-item ids run parallel to each repeatable slot's value array, so the {#each} keys by
  // identity instead of index. A mid-list removal then drops the right DOM node and the focused
  // item follows the data. Ids come from a monotonic module-local counter, never Math.random or
  // Date.now. The value arrays in values.slots stay the canonical string lists serializeComponent
  // reads, so the emitted markdown is unchanged. emptyValues seeds every repeatable slot to [], so
  // the id lists start empty and stay in lockstep with the values through addItem/removeItem.
  let nextId = 0;
  const itemIds = $state<Record<string, number[]>>(
    untrack(() => Object.fromEntries((def.slots ?? []).filter((s) => s.kind === 'repeatable').map((s) => [s.name, []]))),
  );

  // emptyValues and the itemIds seed both cover every repeatable slot, so this read always hits.
  function slotIds(name: string): number[] {
    return itemIds[name] ?? [];
  }

  function addItem(name: string): void {
    slotItems(name).push('');
    slotIds(name).push(nextId++);
  }

  function removeItem(name: string, index: number): void {
    slotItems(name).splice(index, 1);
    slotIds(name).splice(index, 1);
  }

  // Typed accessors over the unions so explicit value targets stay sound.
  function asString(key: string): string {
    const v = values.attributes[key];
    return typeof v === 'string' ? v : '';
  }
  function asBool(key: string): boolean {
    return values.attributes[key] === true;
  }
  function slotString(name: string): string {
    const v = values.slots[name];
    return typeof v === 'string' ? v : '';
  }

  // Field-keyed validation errors from the last submit, keyed by attribute key or slot name.
  let errors = $state<Record<string, string>>({});

  // Serialize and validate through the pure helper. On success clear errors and emit the markdown;
  // on failure keep the field-keyed errors so each field can show its message and insert nothing.
  async function submit() {
    const result = await buildComponentInsert(def, values);
    if (result.ok) {
      errors = {};
      onInsert(result.markdown);
    } else {
      errors = result.errors;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold">{def.label}</h3>
    <button type="button" class="btn btn-ghost btn-xs" onclick={onBack}>Back</button>
  </div>

  {#each attributes as field (field.key)}
    {#if field.type === 'boolean'}
      <label class="label cursor-pointer justify-start gap-2">
        <input
          class="checkbox checkbox-sm"
          type="checkbox"
          aria-invalid={Boolean(errors[field.key])}
          aria-describedby={errors[field.key] ? `err-${field.key}` : undefined}
          checked={asBool(field.key)}
          onchange={(e) => (values.attributes[field.key] = e.currentTarget.checked)}
        />
        <span class="text-sm">{field.label}</span>
      </label>
    {:else if field.type === 'select'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <select
          class="select"
          aria-invalid={Boolean(errors[field.key])}
          aria-describedby={errors[field.key] ? `err-${field.key}` : undefined}
          value={asString(field.key)}
          onchange={(e) => (values.attributes[field.key] = e.currentTarget.value)}
        >
          {#if !field.required}<option value="">—</option>{/if}
          {#each field.options ?? [] as opt (opt)}<option value={opt}>{opt}</option>{/each}
        </select>
      </label>
    {:else if field.type === 'icon' && icons}
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <IconPicker
          {icons}
          label={field.label}
          value={asString(field.key)}
          required={field.required ?? false}
          onChange={(name) => (values.attributes[field.key] = name)}
        />
      </div>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <input
          class="input"
          aria-invalid={Boolean(errors[field.key])}
          aria-describedby={errors[field.key] ? `err-${field.key}` : undefined}
          value={asString(field.key)}
          oninput={(e) => (values.attributes[field.key] = e.currentTarget.value)}
        />
      </label>
    {/if}
    {#if errors[field.key]}<span id={`err-${field.key}`} role="alert" class="text-error text-xs">{errors[field.key]}</span>{/if}
  {/each}

  {#each flatSlots as slot (slot.name)}
    {#if slot.kind === 'markdown'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}</span>
        <textarea
          class="textarea"
          aria-invalid={Boolean(errors[slot.name])}
          aria-describedby={errors[slot.name] ? `err-${slot.name}` : undefined}
          rows={3}
          value={slotString(slot.name)}
          oninput={(e) => (values.slots[slot.name] = e.currentTarget.value)}
        ></textarea>
      </label>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}</span>
        <input
          class="input"
          aria-invalid={Boolean(errors[slot.name])}
          aria-describedby={errors[slot.name] ? `err-${slot.name}` : undefined}
          value={slotString(slot.name)}
          oninput={(e) => (values.slots[slot.name] = e.currentTarget.value)}
        />
      </label>
    {/if}
    {#if errors[slot.name]}<span id={`err-${slot.name}`} role="alert" class="text-error text-xs">{errors[slot.name]}</span>{/if}
  {/each}

  {#each repeatableSlots as slot (slot.name)}
    {@const items = slotItems(slot.name)}
    {@const ids = slotIds(slot.name)}
    <fieldset class="rounded-box border border-[var(--cairn-card-border)] flex flex-col gap-2 p-2">
      <legend class="text-sm font-medium">{slot.label}</legend>
      <!-- Keyed by the parallel stable id so a mid-list removal drops the right node and focus follows the data; the value still binds to the canonical items[i] string the serializer reads. -->
      {#each ids as id, i (id)}
        <div class="flex items-center gap-2">
          <input class="input input-sm flex-1" aria-label={`${slot.label} ${i + 1}`} bind:value={items[i]} />
          <button type="button" class="btn btn-ghost btn-sm" aria-label={`Remove item ${i + 1}`} onclick={() => removeItem(slot.name, i)}>✕</button>
        </div>
      {/each}
      <button type="button" class="btn btn-sm self-start" onclick={() => addItem(slot.name)}>Add item</button>
      {#if errors[slot.name]}<span id={`err-${slot.name}`} role="alert" class="text-error text-xs">{errors[slot.name]}</span>{/if}
    </fieldset>
  {/each}

  <button type="button" class="btn btn-primary btn-sm mt-2" onclick={submit}>Insert</button>
</div>
