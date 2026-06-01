# Admin Guided-Insert Form (Plan 2 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin guided-insert form: a modal that lists a site's registered components, renders a schema-driven fill form on pick, validates with the engine, and inserts the directive markdown at the editor cursor.

**Architecture:** Admin UI plus thin engine wiring over the Plan 1 grammar. The pure `buildComponentInsert(def, values)` serializes a form's `ComponentValues` and runs `validateComponent`, returning markdown or field errors. `ComponentForm.svelte` renders one component's schema (attribute and slot fields, an icon picker, a repeatable add-and-remove list). The modal `ComponentInsertDialog.svelte` owns the Insert trigger and a native `<dialog>`, holding the picker then the form, and routes a schema-bearing def to the form while a template-only def inserts directly. The site's `IconSet` threads through the adapter to feed the icon picker.

**Tech Stack:** Svelte 5 runes, DaisyUI 5, the engine's `serializeComponent`/`validateComponent`/`emptyValues` (Plan 1), `vitest-browser-svelte` (Playwright chromium) for component tests, the node `unit` project for the pure helper.

**Design reference:** `docs/superpowers/specs/2026-05-31-cairn-components-02-form-design.md`, refining the parent initiative spec `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.

---

## File structure

- Create `src/lib/render/component-insert.ts`: `buildComponentInsert`, the pure serialize-then-validate step. Exported from `src/lib/index.ts`.
- Create `src/lib/components/IconPicker.svelte`: the visual icon choice over a site `IconSet`.
- Create `src/lib/components/ComponentForm.svelte`: the schema-driven fill form for one component.
- Create `src/lib/components/ComponentInsertDialog.svelte`: the Insert trigger and modal (picker then form).
- Modify `src/lib/content/types.ts`: add optional `icons?: IconSet` to `CairnAdapter` and `CairnRuntime`.
- Modify `src/lib/content/compose.ts`: carry `icons` through `composeRuntime`.
- Modify `src/lib/components/EditPage.svelte`: add an `icons` prop and use `ComponentInsertDialog` in place of `ComponentPalette`.
- Modify `src/lib/components/index.ts`: export `ComponentInsertDialog`, `ComponentForm`, `IconPicker`; remove the `ComponentPalette` export.
- Delete `src/lib/components/ComponentPalette.svelte` and `src/tests/component/ComponentPalette.test.ts` (folded into the dialog).
- Modify `examples/showcase/src/lib/cairn.config.ts`: add a fully-schema'd component registry and an `IconSet`.
- Modify the showcase edit route `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte`: pass `registry` and `icons` to `EditPage`.
- Tests: `src/tests/unit/component-insert.test.ts`, `src/tests/component/IconPicker.test.ts`, `src/tests/component/ComponentForm.test.ts`, `src/tests/component/ComponentInsertDialog.test.ts`.

## Conventions for every task

- Test-first. Write the failing test, run it red, then the minimal code to green.
- Run the targeted test, then before each commit confirm `npm run check` (the svelte-check scan over `src/` reads 0 errors, 0 warnings; the command may exit non-zero only on the documented showcase `@sveltejs/adapter-node` import, the scan itself must be 0/0) and `npm test` (every project, exit 0).
- A `string | boolean` union sits on `ComponentValues.attributes[key]`. Where a `bind:value`/`bind:checked` to that union trips svelte-check, narrow it with a small typed local accessor (a `$derived` getter plus a setter, or per-field-type rendering). The test is the contract; do not loosen a type to `any` to dodge the union.
- The dialog inputs are not a nested HTML form. `EditPage`'s header sits outside its `<form>`, so the dialog lives outside it; the Insert action computes markdown and calls the `insert` callback rather than posting. Keep the Insert control `type="button"`.
- Commit message footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.

---

## Task 1: Thread the site IconSet through the adapter

**Files:**
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/compose.ts`
- Test: `src/tests/unit/compose-icons.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/compose-icons.test.ts
import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const base: CairnAdapter = {
  siteName: 'Demo',
  content: { posts: { label: 'Post', fields: [] } },
  backend: { kind: 'github', owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '1', privateKey: 'k' },
  sender: { kind: 'console' },
  render: (md) => md,
};

describe('composeRuntime icons', () => {
  it('carries the site IconSet onto the runtime', () => {
    const icons = { snowflake: 'M1 1h2', leaf: 'M3 3h4' };
    const runtime = composeRuntime({ ...base, icons });
    expect(runtime.icons).toEqual(icons);
  });

  it('leaves icons undefined when the adapter omits it', () => {
    const runtime = composeRuntime(base);
    expect(runtime.icons).toBeUndefined();
  });
});
```

> Note: match `backend`/`sender` to the real `BackendConfig`/`SenderConfig` shapes in `src/lib/content/types.ts`. Read those types and adjust the `base` fixture so it type-checks; keep the test's two assertions unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/compose-icons.test.ts`
Expected: FAIL, `icons` is not on the runtime (and not on `CairnAdapter`).

- [ ] **Step 3: Add `icons` to the types**

In `src/lib/content/types.ts`, add to `CairnAdapter` (next to `registry?`):

```ts
  /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
  icons?: IconSet;
```

Add the same member to `CairnRuntime`. Import the type at the top of the file if it is not already imported:

```ts
import type { IconSet } from '../render/glyph.js';
```

- [ ] **Step 4: Carry `icons` through composeRuntime**

In `src/lib/content/compose.ts`, in the object `composeRuntime` returns, copy the field through alongside `registry`:

```ts
    icons: adapter.icons,
```

(Use the adapter parameter's actual name in that file; read the function first.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/compose-icons.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/types.ts src/lib/content/compose.ts src/tests/unit/compose-icons.test.ts
git commit -m "feat(components): thread the site IconSet through the adapter

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: buildComponentInsert (pure serialize-then-validate)

**Files:**
- Create: `src/lib/render/component-insert.ts`
- Modify: `src/lib/index.ts`
- Test: `src/tests/unit/component-insert.test.ts`

This is the one place the form turns `ComponentValues` into markdown. It serializes, then validates the serialized markdown with `validateComponent`, returning the markdown on success or the field-keyed errors on failure. The form stays free of validation rules.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-insert.test.ts
import { describe, it, expect } from 'vitest';
import { buildComponentInsert } from '../../lib/render/component-insert.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };
const callout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }, { name: 'body', label: 'Body', kind: 'markdown' }],
} as ComponentDef;

describe('buildComponentInsert', () => {
  it('returns serialized markdown when the values are valid', async () => {
    const r = await buildComponentInsert(callout, { attributes: { tone: 'note' }, slots: { title: 'Heads up', body: 'Read this.' } });
    expect(r).toEqual({ ok: true, markdown: ':::callout[Heads up]{tone="note"}\nRead this.\n:::' });
  });

  it('returns field errors when a required field is empty', async () => {
    const r = await buildComponentInsert(callout, { attributes: { tone: '' }, slots: { title: '', body: 'x' } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.tone).toMatch(/required/i);
      expect(r.errors.title).toMatch(/required/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-insert.test.ts`
Expected: FAIL, cannot resolve `component-insert.js`.

- [ ] **Step 3: Implement buildComponentInsert**

```ts
// src/lib/render/component-insert.ts
import { serializeComponent } from './component-grammar.js';
import { validateComponent } from './component-validate.js';
import type { ComponentDef, ComponentValues } from './registry.js';

/** The outcome of preparing a guided-form component for insertion: the markdown to insert, or the
 *  field-keyed errors to show on the form. */
export type ComponentInsert = { ok: true; markdown: string } | { ok: false; errors: Record<string, string> };

/** Serialize a component's form values, then validate the result against its schema. Returns the
 *  markdown to insert at the cursor, or the field errors keyed by attribute key or slot name. */
export async function buildComponentInsert(def: ComponentDef, values: ComponentValues): Promise<ComponentInsert> {
  const markdown = serializeComponent(def, values);
  const verdict = await validateComponent(markdown, def);
  return verdict.ok ? { ok: true, markdown } : { ok: false, errors: verdict.errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-insert.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Export it**

In `src/lib/index.ts`, in the render-engine export group (after the `component-validate.js` export), add:

```ts
export { buildComponentInsert, type ComponentInsert } from './render/component-insert.js';
```

- [ ] **Step 6: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/component-insert.ts src/lib/index.ts src/tests/unit/component-insert.test.ts
git commit -m "feat(components): add buildComponentInsert (serialize then validate)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: IconPicker.svelte

**Files:**
- Create: `src/lib/components/IconPicker.svelte`
- Test: `src/tests/component/IconPicker.test.ts`

A visual choice over a site `IconSet`. Each icon is a toggle button showing the glyph and its name. The selected button carries `aria-pressed="true"`. When `required` is false, a None button clears the selection.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/IconPicker.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import IconPicker from '../../lib/components/IconPicker.svelte';

const icons = { snowflake: 'M10 10h20', leaf: 'M5 5h30' };

describe('IconPicker', () => {
  it('renders a button per icon and calls onChange with the picked name', async () => {
    const onChange = vi.fn();
    const screen = render(IconPicker, { icons, value: '', required: true, onChange });
    await screen.getByRole('button', { name: /snowflake/i }).click();
    expect(onChange).toHaveBeenCalledWith('snowflake');
  });

  it('marks the selected icon with aria-pressed', async () => {
    const screen = render(IconPicker, { icons, value: 'leaf', required: true, onChange: () => {} });
    await expect.element(screen.getByRole('button', { name: /leaf/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers a None choice only when not required', async () => {
    const onChange = vi.fn();
    const screen = render(IconPicker, { icons, value: 'leaf', required: false, onChange });
    await screen.getByRole('button', { name: /none/i }).click();
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('omits the None choice when required', async () => {
    const screen = render(IconPicker, { icons, value: 'leaf', required: true, onChange: () => {} });
    await expect.element(screen.getByRole('button', { name: /^none$/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/IconPicker.test.ts`
Expected: FAIL, cannot resolve `IconPicker.svelte`.

- [ ] **Step 3: Implement IconPicker.svelte**

```svelte
<!--
@component
A visual icon choice over the site's IconSet. Each glyph is a toggle button; the selected one carries
aria-pressed. When the field is optional, a None button clears the value. The glyph renders inline from
the IconSet path data, matching the renderer's 256-unit viewBox.
-->
<script lang="ts">
  import type { IconSet } from '../render/glyph.js';

  interface Props {
    /** The site's glyph name to SVG path-data map. */
    icons: IconSet;
    /** The currently selected glyph name, or '' for none. */
    value: string;
    /** When false, a None choice is offered. */
    required: boolean;
    /** Called with the new glyph name (or '' for none). */
    onChange: (name: string) => void;
  }

  let { icons, value, required, onChange }: Props = $props();

  const names = $derived(Object.keys(icons));
</script>

<div class="flex flex-wrap gap-2" role="group" aria-label="Icon">
  {#if !required}
    <button
      type="button"
      class="btn btn-sm"
      class:btn-primary={value === ''}
      aria-pressed={value === ''}
      onclick={() => onChange('')}
    >None</button>
  {/if}
  {#each names as name (name)}
    <button
      type="button"
      class="btn btn-sm gap-1"
      class:btn-primary={value === name}
      aria-pressed={value === name}
      aria-label={name}
      onclick={() => onChange(name)}
    >
      <svg class="ec-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="16" height="16">
        <path d={icons[name]} />
      </svg>
      <span class="text-xs">{name}</span>
    </button>
  {/each}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/IconPicker.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/IconPicker.svelte src/tests/component/IconPicker.test.ts
git commit -m "feat(components): add the IconPicker for the guided form

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: ComponentForm.svelte, attributes and inline/markdown slots

**Files:**
- Create: `src/lib/components/ComponentForm.svelte`
- Test: `src/tests/component/ComponentForm.test.ts`

The form for one component. It seeds its working `ComponentValues` from `emptyValues(def)` and renders attribute fields (text, select, boolean, icon) and the non-repeatable slots (`inline` as an input, `markdown` as a textarea). The repeatable list (Task 5), submit, and error display (Task 6) come next. This task renders the fields and the Insert and Back controls without wiring submit yet.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/ComponentForm.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentForm from '../../lib/components/ComponentForm.svelte';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };
const callout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout',
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'pinned', label: 'Pinned', type: 'boolean' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('ComponentForm fields', () => {
  it('renders a labeled field for each attribute and non-repeatable slot', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('checkbox', { name: /pinned/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /body/i })).toBeInTheDocument();
  });

  it('lists the select options from the schema', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    expect(screen.container.querySelectorAll('select[aria-label="Tone"] option').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = (await import('vitest')).vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack } as never);
    await screen.getByRole('button', { name: /back/i }).click();
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: FAIL, cannot resolve `ComponentForm.svelte`.

- [ ] **Step 3: Implement ComponentForm.svelte (fields only)**

```svelte
<!--
@component
The schema-driven fill form for one component. It holds the working ComponentValues, seeded from
emptyValues(def), and renders attribute fields and the title/body and other non-repeatable slots.
Submit (Task 6) serializes and validates through buildComponentInsert and calls onInsert with the
markdown. Back returns to the picker. This is not a nested HTML form; Insert calls a callback.
-->
<script lang="ts">
  import { emptyValues, type ComponentDef } from '../render/registry.js';
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
  let values = $state(emptyValues(def));

  const attributes = $derived(def.attributes ?? []);
  // Non-repeatable slots render here; the repeatable list is handled separately.
  const flatSlots = $derived((def.slots ?? []).filter((s) => s.kind !== 'repeatable'));

  // Typed accessor over the string | boolean union so bind targets stay sound.
  function asString(key: string): string {
    const v = values.attributes[key];
    return typeof v === 'string' ? v : '';
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
        <input class="checkbox checkbox-sm" type="checkbox" aria-label={field.label} bind:checked={values.attributes[field.key] as boolean} />
        <span class="text-sm">{field.label}</span>
      </label>
    {:else if field.type === 'select'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <select class="select" aria-label={field.label} value={asString(field.key)} onchange={(e) => (values.attributes[field.key] = e.currentTarget.value)}>
          {#if !field.required}<option value="">—</option>{/if}
          {#each field.options ?? [] as opt (opt)}<option value={opt}>{opt}</option>{/each}
        </select>
      </label>
    {:else if field.type === 'icon' && icons}
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <IconPicker {icons} value={asString(field.key)} required={field.required ?? false} onChange={(name) => (values.attributes[field.key] = name)} />
      </div>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{field.label}</span>
        <input class="input" aria-label={field.label} value={asString(field.key)} oninput={(e) => (values.attributes[field.key] = e.currentTarget.value)} />
      </label>
    {/if}
  {/each}

  {#each flatSlots as slot (slot.name)}
    {#if slot.kind === 'markdown'}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}</span>
        <textarea class="textarea" aria-label={slot.label} rows={3} bind:value={values.slots[slot.name] as string}></textarea>
      </label>
    {:else}
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{slot.label}</span>
        <input class="input" aria-label={slot.label} bind:value={values.slots[slot.name] as string} />
      </label>
    {/if}
  {/each}

  <button type="button" class="btn btn-primary btn-sm mt-2" onclick={() => onInsert('')}>Insert</button>
</div>
```

> Note: `onInsert('')` is a placeholder wired for real in Task 6. If svelte-check rejects the `as boolean`/`as string` bind casts on the union, replace that bind with an explicit `checked={...}`/`value={...}` plus an `onchange`/`oninput` handler as the select and text fields above already do. Keep the test's roles and labels unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentForm.svelte src/tests/component/ComponentForm.test.ts
git commit -m "feat(components): render component attribute and slot fields

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: ComponentForm.svelte, the repeatable add-and-remove list

**Files:**
- Modify: `src/lib/components/ComponentForm.svelte`
- Modify: `src/tests/component/ComponentForm.test.ts`

A repeatable slot renders as a list of single-line item inputs, each with a Remove control, plus an Add item button. The values bind to the slot's `string[]`.

- [ ] **Step 1: Add the failing test**

Append to `src/tests/component/ComponentForm.test.ts`:

```ts
const grid: ComponentDef = {
  ...base, name: 'grid', label: 'Grid',
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
} as ComponentDef;

describe('ComponentForm repeatable slot', () => {
  it('adds and removes items in a repeatable slot', async () => {
    const screen = render(ComponentForm, { def: grid, onInsert: () => {}, onBack: () => {} } as never);
    await screen.getByRole('button', { name: /add item/i }).click();
    await screen.getByRole('button', { name: /add item/i }).click();
    expect(screen.container.querySelectorAll('input[aria-label="Points item"]').length).toBe(2);
    await screen.getByRole('button', { name: /remove item 1/i }).click();
    expect(screen.container.querySelectorAll('input[aria-label="Points item"]').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: FAIL, no repeatable list rendered yet.

- [ ] **Step 3: Add the repeatable list**

In `ComponentForm.svelte`, add a derived for repeatable slots near `flatSlots`:

```ts
  const repeatableSlots = $derived((def.slots ?? []).filter((s) => s.kind === 'repeatable'));
```

Add this block after the `flatSlots` `{#each}` and before the Insert button. The item array lives at `values.slots[slot.name]` as a `string[]`:

```svelte
  {#each repeatableSlots as slot (slot.name)}
    {@const items = values.slots[slot.name] as string[]}
    <fieldset class="rounded-box border border-base-300 flex flex-col gap-2 p-2">
      <legend class="text-sm font-medium">{slot.label}</legend>
      {#each items as _, i (i)}
        <div class="flex items-center gap-2">
          <input class="input input-sm flex-1" aria-label={`${slot.label} item`} bind:value={items[i]} />
          <button type="button" class="btn btn-ghost btn-xs" aria-label={`Remove item ${i + 1}`} onclick={() => items.splice(i, 1)}>✕</button>
        </div>
      {/each}
      <button type="button" class="btn btn-sm self-start" onclick={() => items.push('')}>Add item</button>
    </fieldset>
  {/each}
```

> Note: `items` is the live `$state` proxy array, so `push`/`splice` are reactive. If svelte-check flags `items` as possibly not an array under the `string | string[]` union, narrow with a typed local (e.g. `const items = $derived(Array.isArray(values.slots[slot.name]) ? (values.slots[slot.name] as string[]) : [])`) and mutate through `values.slots[slot.name]`. Keep the test's labels unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: PASS (4 describes green).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentForm.svelte src/tests/component/ComponentForm.test.ts
git commit -m "feat(components): add the repeatable slot add-and-remove list

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: ComponentForm.svelte, submit, validate, and inline errors

**Files:**
- Modify: `src/lib/components/ComponentForm.svelte`
- Modify: `src/tests/component/ComponentForm.test.ts`

Insert now runs `buildComponentInsert`. On success it calls `onInsert(markdown)`. On failure it stores the field errors and renders them under the matching fields, and inserts nothing.

- [ ] **Step 1: Add the failing tests**

Append to `src/tests/component/ComponentForm.test.ts`:

```ts
import { vi } from 'vitest';

describe('ComponentForm submit', () => {
  it('inserts serialized markdown when valid', async () => {
    const onInsert = vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert, onBack: () => {} } as never);
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('note');
    await screen.getByRole('textbox', { name: /title/i }).fill('Heads up');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(onInsert).toHaveBeenCalledWith(':::callout[Heads up]{tone="note"}\n:::');
  });

  it('shows inline errors and does not insert when required fields are empty', async () => {
    const onInsert = vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert, onBack: () => {} } as never);
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(onInsert).not.toHaveBeenCalled();
    await expect.element(screen.getByText(/tone is required/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/title is required/i)).toBeInTheDocument();
  });
});
```

> Note: the valid-case expectation has no body, so the serialized markdown is `:::callout[Heads up]{tone="note"}\n:::` with no body line. Confirm against the Plan 1 serializer; if the empty body changes spacing, match the real output rather than weakening the assertion.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: FAIL, Insert does not validate or surface errors yet.

- [ ] **Step 3: Wire submit and errors**

In `ComponentForm.svelte`, import the helper and add error state:

```ts
  import { buildComponentInsert } from '../render/component-insert.js';
```

```ts
  let errors = $state<Record<string, string>>({});

  async function submit() {
    const result = await buildComponentInsert(def, values);
    if (result.ok) {
      errors = {};
      onInsert(result.markdown);
    } else {
      errors = result.errors;
    }
  }
```

Change the Insert button to call `submit`:

```svelte
  <button type="button" class="btn btn-primary btn-sm mt-2" onclick={submit}>Insert</button>
```

Render the error under each field. Add this directly under each attribute field's input and each slot field's input, keyed by the field's key or slot name:

```svelte
  {#if errors[field.key]}<span class="text-error text-xs">{errors[field.key]}</span>{/if}
```

and for slots:

```svelte
  {#if errors[slot.name]}<span class="text-error text-xs">{errors[slot.name]}</span>{/if}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentForm.svelte src/tests/component/ComponentForm.test.ts
git commit -m "feat(components): validate on submit and show inline field errors

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: ComponentInsertDialog.svelte, the picker and the dual path

**Files:**
- Create: `src/lib/components/ComponentInsertDialog.svelte`
- Test: `src/tests/component/ComponentInsertDialog.test.ts`

The Insert trigger and a native `<dialog>` modal. The picker lists every actionable component by label with its description and intended use. A def with a schema (any `attributes` or `slots`) routes to `ComponentForm`. A def with only `insertTemplate` inserts directly and closes. A def with neither is omitted. Insert from the form writes the markdown through the `insert` callback and closes.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/ComponentInsertDialog.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentInsertDialog from '../../lib/components/ComponentInsertDialog.svelte';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const schemaDef: ComponentDef = {
  ...base, name: 'callout', label: 'Callout', description: 'A highlighted note.', use: 'Call out one idea.',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
} as ComponentDef;
const templateDef: ComponentDef = {
  ...base, name: 'rule', label: 'Rule', description: 'A divider.', insertTemplate: ':::rule\n:::',
} as ComponentDef;
const inertDef: ComponentDef = { ...base, name: 'inert', label: 'Inert', description: 'Nothing.' } as ComponentDef;

const registry = defineRegistry({ components: [schemaDef, templateDef, inertDef] });
const icons = { snowflake: 'M1 1h2' };

describe('ComponentInsertDialog', () => {
  it('lists actionable components with descriptions and omits inert ones', async () => {
    const screen = render(ComponentInsertDialog, { registry, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await expect.element(screen.getByText(/a highlighted note/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/call out one idea/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/^inert$/i)).not.toBeInTheDocument();
  });

  it('inserts a template-only def directly', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await screen.getByRole('button', { name: /rule/i }).click();
    expect(insert).toHaveBeenCalledWith(':::rule\n:::');
  });

  it('routes a schema def to the form and inserts the built markdown', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('warning');
    await screen.getByRole('textbox', { name: /title/i }).fill('Careful');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(insert).toHaveBeenCalledWith(':::callout[Careful]{tone="warning"}\n:::');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/ComponentInsertDialog.test.ts`
Expected: FAIL, cannot resolve `ComponentInsertDialog.svelte`.

- [ ] **Step 3: Implement ComponentInsertDialog.svelte**

```svelte
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
  }

  let { registry, insert, icons }: Props = $props();

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
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" onclick={open}>Insert</button>

  <dialog class="modal" bind:this={dialog} onclose={() => (picked = null)}>
    <div class="modal-box">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-semibold">Insert component</h2>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
      </div>

      {#if picked}
        <ComponentForm def={picked} {icons} {onInsert} onBack={() => (picked = null)} />
      {:else}
        <ul class="menu w-full" role="listbox" aria-label="Components">
          {#each defs as def (def.name)}
            <li role="option" aria-selected={false}>
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
      <button aria-label="Close">close</button>
    </form>
  </dialog>
{/if}
```

> Note: the `<form method="dialog" class="modal-backdrop">` is the DaisyUI click-outside-to-close backdrop and is a real `method="dialog"` form scoped to the `<dialog>`, not a nested page form. It is valid because a `<dialog>` establishes its own context. Keep the Insert trigger and all in-dialog buttons `type="button"` except that backdrop close.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentInsertDialog.test.ts`
Expected: PASS (3 tests). If `showModal` content is not queryable in the browser harness, assert against the dialog's open state and its rendered content; do not weaken the dual-path assertions.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentInsertDialog.svelte src/tests/component/ComponentInsertDialog.test.ts
git commit -m "feat(components): add the guided-insert dialog with the dual path

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Wire the dialog into EditPage and the components barrel

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/lib/components/index.ts`
- Delete: `src/lib/components/ComponentPalette.svelte`, `src/tests/component/ComponentPalette.test.ts`
- Test: `src/tests/component/EditPage-insert.test.ts`

`EditPage` gains an `icons` prop and uses `ComponentInsertDialog` in the header. The old `ComponentPalette` and its test are removed; the dialog's template-only path covers the case the palette handled.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/EditPage-insert.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const callout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout', description: 'A note.', use: 'Call out an idea.',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
} as ComponentDef;
const registry = defineRegistry({ components: [callout] });

const data = {
  conceptId: 'posts', id: 'hello', label: 'Post', fields: [], frontmatter: {}, body: 'Start.',
  title: 'Hello', isNew: false, saved: false, error: null, siteName: 'Demo',
};

describe('EditPage guided insert', () => {
  it('exposes the Insert dialog driven by the registry', async () => {
    const screen = render(EditPage, { data, registry, icons: { snow: 'M1 1h2' } } as never);
    await expect.element(screen.getByRole('button', { name: /insert/i })).toBeInTheDocument();
    await screen.getByRole('button', { name: /insert/i }).click();
    await expect.element(screen.getByText(/call out an idea/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/EditPage-insert.test.ts`
Expected: FAIL, `EditPage` does not yet render `ComponentInsertDialog` (and may not accept `icons`).

- [ ] **Step 3: Update EditPage**

In `src/lib/components/EditPage.svelte`:

Replace the `ComponentPalette` import with:

```ts
  import ComponentInsertDialog from './ComponentInsertDialog.svelte';
```

Add `IconSet` to the imports and an `icons` prop:

```ts
  import type { IconSet } from '../render/glyph.js';
```

Add to the `Props` interface:

```ts
    /** The site's icon set, for the guided form's icon fields. */
    icons?: IconSet;
```

Add `icons` to the destructured props: `let { data, registry, render, icons }: Props = $props();`

Replace the header usage `<ComponentPalette {registry} {insert} />` with:

```svelte
    <ComponentInsertDialog {registry} {insert} {icons} />
```

- [ ] **Step 4: Update the barrel and remove ComponentPalette**

In `src/lib/components/index.ts`, remove the `ComponentPalette` line and add:

```ts
export { default as ComponentInsertDialog } from './ComponentInsertDialog.svelte';
export { default as ComponentForm } from './ComponentForm.svelte';
export { default as IconPicker } from './IconPicker.svelte';
```

Delete the files:

```bash
git rm src/lib/components/ComponentPalette.svelte src/tests/component/ComponentPalette.test.ts
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run --project component src/tests/component/EditPage-insert.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (scan 0/0) and `npm test` (exit 0, and the ComponentPalette test is gone), then:

```bash
git add src/lib/components/EditPage.svelte src/lib/components/index.ts src/tests/component/EditPage-insert.test.ts
git commit -m "feat(components): use the guided-insert dialog in EditPage

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Showcase example component and route wiring

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte`

A fully-schema'd component plus a small IconSet in the showcase, so the form has something real to drive and the demo works end to end. This is the worked example; the per-site migration of the reference sites is Plan 3.

- [ ] **Step 1: Add a registry and icons to the showcase config**

In `examples/showcase/src/lib/cairn.config.ts`, import the registry builder and add a component. Read the file first to match its import style and the `CairnAdapter` object it exports.

```ts
import { defineRegistry, type ComponentDef, type IconSet } from '@glw907/cairn-cms';

const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
  leaf: 'M48 208c0-88 72-160 160-160 0 88-72 160-160 160Z',
};

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  use: 'Draw the reader to one important idea.',
  build: (node) => node,
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
};

const registry = defineRegistry({ components: [callout] });
```

Add `registry` and `icons` to the exported `cairn` adapter object:

```ts
  registry,
  icons,
```

- [ ] **Step 2: Pass registry and icons to EditPage**

In `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte`, extend the `EditPage` usage. It currently reads:

```svelte
<EditPage data={{ ...data, siteName: cairn.siteName }} render={cairn.render} />
```

Change it to:

```svelte
<EditPage data={{ ...data, siteName: cairn.siteName }} render={cairn.render} registry={cairn.registry} icons={cairn.icons} />
```

- [ ] **Step 3: Verify the showcase builds and type-checks**

Run: `cd examples/showcase && npm install && npm run build` (install once if not already), then back at the repo root run `npm run check`.
Expected: the showcase build succeeds and the svelte-check scan over `src/` stays 0/0. (Installing the showcase deps also clears the documented `adapter-node` config-load stderr from `npm run check`.)

- [ ] **Step 4: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts "examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte"
git commit -m "feat(showcase): add a schema'd callout component and icon set

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Full gate and verification

**Files:** none (verification only)

- [ ] **Step 1: Type check**

Run: `npm run check`
Expected: the svelte-check scan over `src/` reports 0 errors, 0 warnings.

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: every project green, exit 0. The new component files (`IconPicker`, `ComponentForm`, `ComponentInsertDialog`, `EditPage-insert`) and the unit files (`component-insert`, `compose-icons`) are included; the removed `ComponentPalette` test is gone. If the browser component project flakes once on a cold start under full-suite load, re-run it; it must end green.

- [ ] **Step 3: Confirm the engine render path is untouched**

Run: `grep -rn "insertTemplate" src/lib/render/registry.ts`
Expected: `insertTemplate` is still optional and `build` is unchanged. This plan adds UI and a serialize-then-validate helper; it does not touch `build()`, `createRenderer`, or the rehype dispatch. Those belong to Plan 3.

- [ ] **Step 4: Confirm the package surface**

Run: `npm run check:package`
Expected: green. The new `buildComponentInsert`/`ComponentInsert` are exported from the main entry; the new Svelte components from the `./components` subpath.

---

## Self-review notes

- **Spec coverage:** the modal that folds in the palette is Task 7 plus Task 8; the schema-driven fields are Tasks 4 to 6; the icon picker with optional None is Task 3 wired in Task 4; the IconSet plumbing is Task 1; the serialize-then-validate-then-insert flow is Task 2 (pure) consumed in Task 6; the dual-path transition that resolves the Plan 1 no-op-def finding is Task 7; the showcase example is Task 9. Server-side body validation and round-trip editing are deferred by design, not implemented here.
- **Type consistency:** `ComponentInsert` (Task 2) is the contract between `buildComponentInsert` and `ComponentForm`'s submit (Task 6). `ComponentValues` from Plan 1 is the form's working state, seeded by `emptyValues`. `IconSet` is defined once in `glyph.ts` and flows adapter to runtime (Task 1) to `EditPage` (Task 8) to `ComponentForm` (Task 4) to `IconPicker` (Task 3). The dialog's `hasSchema`/`actionable` predicates (Task 7) are the single definition of which defs are listed.
- **The union caveat:** `ComponentValues.attributes` is `string | boolean` and `slots` is `string | string[]`. Tasks 4 and 5 flag that a `bind:` to those unions may need a typed local accessor to satisfy svelte-check. The tests are the contract; narrow the type, do not cast to `any`.
- **Not a nested form:** the dialog sits outside `EditPage`'s `<form>` and inserts through the `insert` callback, so there is no nested HTML form. The only in-dialog form is the DaisyUI `method="dialog"` backdrop, valid within a `<dialog>`.

---

## Post-mortem (executed 2026-05-31)

All ten tasks landed on `main` via `subagent-driven-development`, one `cairn-implementer` per task (Sonnet), each verified by its commit before the next dispatched. A review gate then ran the simplifier plus two Opus reviewers, and the findings were folded in test-first as a single hardening commit. The pass ran directly on `main` per STATUS authorization, since a cairn-cms push does not deploy a site.

**Commits:** `a3b38a3..008fc33` (nine feature commits, one review-gate hardening commit). Task commits in order: `a3b38a3` (IconSet through the adapter), `d6449cf` (`buildComponentInsert`), `e7c0755` (`IconPicker`), `81739cb` (form fields), `604f549` (repeatable list), `0ca4da0` (submit and inline errors), `d885664` (`ComponentInsertDialog` dual path), `6616398` (wired into `EditPage`, `ComponentPalette` removed), `f58120e` (showcase example). Hardening: `008fc33`.

**What was built.** The guided-insert flow now runs end to end. `buildComponentInsert(def, values)` is the one pure place form values become markdown: it serializes, then validates, returning the markdown or field-keyed errors. `ComponentForm.svelte` renders a component's schema (attribute fields by type, inline and markdown slots, a repeatable add-and-remove list) and surfaces validation errors inline. `ComponentInsertDialog.svelte` is the Insert trigger and a native `<dialog>` whose picker lists actionable defs and routes a schema-bearing def to the form, a template-only def straight to insertion, and omits a def with neither. `IconPicker.svelte` is the visual icon choice over the site `IconSet`, which now threads from the adapter through `composeRuntime` to `EditPage` to the form. `ComponentPalette` is gone, replaced by the dialog's dual path, which closes the Plan 1 no-op-def finding.

**Verified (evidence).** `npm run check`: svelte-check scan 0 errors, 0 warnings over 725 files. `npm test`: exit 0, 79 files, 375 tests, including the new browser-layer component tests and the two node unit tests. `npm run check:package`: green; `buildComponentInsert`/`ComponentInsert` export from the main entry and the three new components from `./components`. The render path is untouched: `insertTemplate` stays optional and `build()` is unchanged, confirmed by grep. The showcase builds with the schema'd callout and the icon set, which also clears the documented `adapter-node` config stderr.

**Decisions locked in during execution.**
- The `string | boolean` and `string | string[]` unions on `ComponentValues` are narrowed with typed local accessors (`asString`, `asBool`, `slotString`, `slotItems`) plus value-and-handler bindings, not `bind:... as ...` casts and never `any`. `slotItems` returns the live `$state` proxy so `push`/`splice` on the repeatable list persist.
- `ComponentForm` seeds its working values once with `$state(untrack(() => emptyValues(def)))`. The dialog wraps it in `{#key picked}`, so a new pick always mounts a fresh form and the seed cannot go stale. This makes the re-seed invariant structural rather than a cross-component assumption.
- The Insert trigger carries `aria-label="Insert component"` so it does not collide with the form's "Insert" submit under the test's `/^insert$/i` query.
- The picker is a plain list of buttons, not a `listbox` of `option`s, because each row fires an action. Validation errors render as `role="alert"` spans tied to their controls with `aria-invalid` and `aria-describedby`, matching the admin's existing status-message pattern. The `ec-glyph` class on the picker glyph is kept because the renderer's `glyph()` emits the same class, so admin and rendered markup stay aligned.

**Carried follow-ups (deferred by design or low impact).**
- The live interactive `/admin` smoke against a real Worker (open the dialog, fill the form, insert into the editor) is the one unverified surface. The browser-layer component tests cover the dialog, form, and picker behavior, and this pass does not touch the auth or save flow, so the live smoke is a fast-follow consistent with the editor-swap precedent.
- Repeatable items are bare strings keyed by index, so a removal mid-list reuses DOM nodes by position. The value bindings stay correct; node focus identity does not follow an item. A stable per-item id is the fix once multi-field repeatable items arrive (still deferred by design).
- The flat fields carry both a wrapping `<label>` and a redundant `aria-label`; the `aria-label` could be dropped to rely on the visible label. The per-item input label is generic (`<slot> item`) rather than indexed. The `IconPicker` is an `aria-pressed` toggle group that behaves as single-select and could move to radiogroup semantics. All three are minor and left for a later a11y polish.
- Body-level validation and round-trip editing of an existing directive stay out of scope (Plan 3 territory and beyond).
