<!--
@component
The schema-driven fill form for one component, the left column of the configure step. It holds the
working ComponentValues, seeded from previewValues(def) (the emptyValues base with any declared
preview sample overlaid), and renders attribute fields and the title/body and other slots. Required
fields carry an asterisk and aria-required, and Insert disables while any required field is empty.
Submit serializes and validates through buildComponentInsert and calls onInsert with the markdown.
This is not a nested HTML form; Insert calls a callback. The dialog owns the header (the Insert >
group breadcrumb and the Back control) and, in the two-pane case, the preview pane; this component
binds out its live `values` and `incomplete` so the dialog can render that preview.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { previewValues, type ComponentDef, type ComponentValues } from '../render/registry.js';
  import { buildComponentInsert } from '../render/component-insert.js';
  import type { IconSet } from '../render/glyph.js';
  import IconPicker from './IconPicker.svelte';

  interface Props {
    def: ComponentDef;
    icons?: IconSet;
    /** Called with the serialized markdown when the form validates. */
    onInsert: (markdown: string) => void;
    /** The live working values, bound out so a host (the dialog) can render a preview from them. */
    values?: ComponentValues;
    /** True while a required attribute or slot is still empty, bound out so the host's preview can
     *  show the incomplete state and the host can mirror the disabled Insert. */
    incomplete?: boolean;
    /** Seed the working values from these instead of the schema's preview sample. The dialog passes
     *  it in edit mode to re-open a placed component into its own values; the catalog insert path
     *  leaves it unset and keeps the previewValues seed. */
    initial?: ComponentValues;
    /** The submit button's label. The dialog passes 'Update' in edit mode; the insert path keeps
     *  the default. */
    submitLabel?: string;
  }

  let {
    def,
    icons,
    onInsert,
    values = $bindable(),
    incomplete = $bindable(),
    initial,
    submitLabel = 'Insert',
  }: Props = $props();

  // Working values, seeded once from `initial` in edit mode, otherwise from the schema and any
  // declared preview sample. $state makes the nested records deeply reactive. untrack marks the
  // seed as a deliberate one-time read, not a reactive miss. previewValues falls back to
  // emptyValues when no preview.
  let working = $state(untrack(() => initial ?? previewValues(def)));
  // Mirror the working values out to the bindable prop so the dialog's preview reads them live.
  $effect(() => {
    values = working;
  });

  const attributes = $derived(Object.entries(def.attributes ?? {}));
  const flatSlots = $derived((def.slots ?? []).filter((s) => s.kind !== 'repeatable'));
  const repeatableSlots = $derived((def.slots ?? []).filter((s) => s.kind === 'repeatable'));

  // The live $state proxy array for a repeatable slot, so push/splice stay reactive.
  function slotItems(name: string): string[] {
    const v = working.slots[name];
    return Array.isArray(v) ? v : [];
  }

  // Stable per-item ids run parallel to each repeatable slot's value array, so the {#each} keys by
  // identity instead of index. A mid-list removal then drops the right DOM node and the focused
  // item follows the data. Ids come from a monotonic module-local counter, never Math.random or
  // Date.now. The value arrays in working.slots stay the canonical string lists serializeComponent
  // reads, so the emitted markdown is unchanged. The preview seed can fill a repeatable slot, so
  // each seeded item needs a parallel id from the start.
  let nextId = 0;
  const itemIds = $state<Record<string, number[]>>(
    untrack(() =>
      Object.fromEntries(
        (def.slots ?? [])
          .filter((s) => s.kind === 'repeatable')
          .map((s) => {
            const seeded = working.slots[s.name];
            const count = Array.isArray(seeded) ? seeded.length : 0;
            return [s.name, Array.from({ length: count }, () => nextId++)];
          }),
      ),
    ),
  );

  // previewValues and the itemIds seed both cover every repeatable slot, so this read always hits.
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

  // The row label for a repeatable item: the slot's itemLabel over the item's values and index,
  // falling back to `${label} ${i + 1}` when it returns nothing. v1 repeatable items hold a single
  // string under the first item field's key, so the item record passed to itemLabel carries it.
  function rowLabel(slot: (typeof repeatableSlots)[number], value: string, index: number): string {
    const fallback = `${slot.label} ${index + 1}`;
    if (!slot.itemLabel) return fallback;
    const key = Object.keys(slot.itemFields ?? {})[0] ?? 'text';
    const derived = slot.itemLabel({ [key]: value }, index);
    return derived && derived.trim() ? derived : fallback;
  }

  // Typed accessors over the unions so explicit value targets stay sound.
  function asString(key: string): string {
    const v = working.attributes[key];
    return typeof v === 'string' ? v : '';
  }
  function asBool(key: string): boolean {
    return working.attributes[key] === true;
  }
  function slotString(name: string): string {
    const v = working.slots[name];
    return typeof v === 'string' ? v : '';
  }

  // The HTML input type for the text-fallback arm. ComponentForm has no dedicated number/date arm
  // the way FieldInput does, so it folds those scalar types into the one fallback input; everything
  // else renders a plain text box.
  function inputType(type: string): string {
    switch (type) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      case 'url':
        return 'url';
      case 'email':
        return 'email';
      default:
        return 'text';
    }
  }

  // A required attribute is unmet only for a text/select/icon field left empty; a boolean is always
  // met (its false is a real choice). A required slot is unmet when its string is empty or its
  // repeatable list has no non-empty item. This drives the asterisk-marked fields, the disabled
  // Insert, and (through the bound `incomplete`) the dialog's incomplete preview state.
  const incompleteState = $derived.by(() => {
    for (const [name, field] of attributes) {
      if (!field.required || field.type === 'boolean') continue;
      if (asString(name) === '') return true;
    }
    for (const slot of def.slots ?? []) {
      if (!slot.required) continue;
      const v = working.slots[slot.name];
      const filled = Array.isArray(v) ? v.some((i) => i !== '') : typeof v === 'string' && v !== '';
      if (!filled) return true;
    }
    return false;
  });
  $effect(() => {
    incomplete = incompleteState;
  });

  // Field-keyed validation errors from the last submit (pattern, validate, select-domain), keyed by
  // attribute key or slot name.
  let submitErrors = $state<Record<string, string>>({});

  // Fields the editor has touched, so a required-empty error shows after interaction rather than on
  // a fresh open. Keyed by attribute key or slot name.
  let touched = $state<Record<string, boolean>>({});
  function markTouched(key: string): void {
    touched[key] = true;
  }

  // The visible field errors. Only the required-empty message ("{label} is required.") shows live,
  // for a touched-and-empty required field; pattern and validate errors surface on submit. Both are
  // merged here, the submit errors last so a pattern or validate message wins. Insert stays disabled
  // while incompleteState holds, so a required-empty field never serializes; this surfaces the why
  // next to the field meanwhile.
  const errors = $derived.by(() => {
    const out: Record<string, string> = {};
    for (const [name, field] of attributes) {
      if (field.required && field.type !== 'boolean' && touched[name] && asString(name) === '') {
        out[name] = `${field.label} is required.`;
      }
    }
    for (const slot of def.slots ?? []) {
      if (!slot.required) continue;
      const v = working.slots[slot.name];
      const filled = Array.isArray(v) ? v.some((i) => i !== '') : typeof v === 'string' && v !== '';
      if (touched[slot.name] && !filled) out[slot.name] = `${slot.label} is required.`;
    }
    return { ...out, ...submitErrors };
  });

  // The form container. Once it is bound, focus its first focusable control so the editor types
  // straight into the form. The effect tracks formEl so it runs when the node lands; the focus call
  // is untracked so a later value change does not steal focus back to the first field.
  let formEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (!formEl) return;
    untrack(() => formEl!.querySelector<HTMLElement>('input, select, textarea')?.focus());
  });

  // Serialize and validate through the pure helper. On success clear errors and emit the markdown;
  // on failure keep the field-keyed errors so each field can show its message and insert nothing.
  async function submit() {
    const result = await buildComponentInsert(def, working);
    if (result.ok) {
      submitErrors = {};
      onInsert(result.markdown);
    } else {
      submitErrors = result.errors;
    }
  }
</script>

<div class="flex flex-col gap-3" bind:this={formEl}>
  {#each attributes as [name, field] (name)}
    {#if field.type === 'boolean'}
      <label class="label cursor-pointer justify-start gap-2">
        <input
          class="checkbox checkbox-sm"
          type="checkbox"
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `err-${name}` : undefined}
          checked={asBool(name)}
          onchange={(e) => (working.attributes[name] = e.currentTarget.checked)}
        />
        <span class="text-sm">{field.label}</span>
      </label>
    {:else if field.type === 'select'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}{#if field.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</span>
        <select
          class="select"
          aria-required={field.required ? 'true' : undefined}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `err-${name}` : undefined}
          value={asString(name)}
          onchange={(e) => {
            working.attributes[name] = e.currentTarget.value;
            markTouched(name);
          }}
          onblur={() => markTouched(name)}
        >
          {#if !field.required}<option value="">—</option>{/if}
          {#each field.options ?? [] as opt (opt)}<option value={opt}>{opt}</option>{/each}
        </select>
      </label>
    {:else if field.type === 'icon' && icons}
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}{#if field.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</span>
        <IconPicker
          {icons}
          label={field.label}
          value={asString(name)}
          required={field.required ?? false}
          onChange={(glyph) => (working.attributes[name] = glyph)}
        />
      </div>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}{#if field.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</span>
        <input
          class="input"
          type={inputType(field.type)}
          aria-required={field.required ? 'true' : undefined}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `err-${name}` : undefined}
          value={asString(name)}
          oninput={(e) => {
            working.attributes[name] = e.currentTarget.value;
            markTouched(name);
          }}
          onblur={() => markTouched(name)}
        />
      </label>
    {/if}
    {#if errors[name]}<span id={`err-${name}`} role="alert" class="text-error text-xs">{errors[name]}</span>{/if}
  {/each}

  {#each flatSlots as slot (slot.name)}
    {#if slot.kind === 'markdown'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}{#if slot.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</span>
        <textarea
          class="textarea"
          aria-required={slot.required ? 'true' : undefined}
          aria-invalid={Boolean(errors[slot.name])}
          aria-describedby={errors[slot.name] ? `err-${slot.name}` : undefined}
          rows={3}
          value={slotString(slot.name)}
          oninput={(e) => {
            working.slots[slot.name] = e.currentTarget.value;
            markTouched(slot.name);
          }}
          onblur={() => markTouched(slot.name)}
        ></textarea>
      </label>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}{#if slot.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</span>
        <input
          class="input"
          aria-required={slot.required ? 'true' : undefined}
          aria-invalid={Boolean(errors[slot.name])}
          aria-describedby={errors[slot.name] ? `err-${slot.name}` : undefined}
          value={slotString(slot.name)}
          oninput={(e) => {
            working.slots[slot.name] = e.currentTarget.value;
            markTouched(slot.name);
          }}
          onblur={() => markTouched(slot.name)}
        />
      </label>
    {/if}
    {#if errors[slot.name]}<span id={`err-${slot.name}`} role="alert" class="text-error text-xs">{errors[slot.name]}</span>{/if}
  {/each}

  {#each repeatableSlots as slot (slot.name)}
    {@const items = slotItems(slot.name)}
    {@const ids = slotIds(slot.name)}
    <fieldset class="rounded-box border border-[var(--cairn-card-border)] flex flex-col gap-2 p-2">
      <legend class="text-sm font-medium">{slot.label}{#if slot.required}<span data-testid="cairn-pk-req" class="text-error" aria-hidden="true">*</span>{/if}</legend>
      <!-- Keyed by the parallel stable id so a mid-list removal drops the right node and focus follows the data; the value still binds to the canonical items[i] string the serializer reads. The visible row tag derives from itemLabel, falling back to the indexed label. -->
      {#each ids as id, i (id)}
        {@const label = rowLabel(slot, items[i] ?? '', i)}
        <div class="flex items-center gap-2">
          <span class="flex-none text-xs text-muted">{label}</span>
          <input
            class="input input-sm flex-1"
            aria-label={`${slot.label} ${i + 1}`}
            bind:value={items[i]}
          />
          <button type="button" class="btn btn-ghost btn-sm" aria-label={`Remove item ${i + 1}`} onclick={() => removeItem(slot.name, i)}>✕</button>
        </div>
      {/each}
      <button type="button" class="btn btn-sm self-start" onclick={() => addItem(slot.name)}>Add item</button>
      {#if errors[slot.name]}<span id={`err-${slot.name}`} role="alert" class="text-error text-xs">{errors[slot.name]}</span>{/if}
    </fieldset>
  {/each}

  <button type="button" class="btn btn-primary btn-sm mt-2 self-start" disabled={incompleteState} onclick={submit}>{submitLabel}</button>
</div>
