# Component Grammar and Schema (Plan 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the engine foundation for the site UI component registry: the per-component schema (typed attributes and named slots), the three grammar machines (`serializeComponent`, `parseComponent`, `validateComponent`) over one canonical directive grammar, and `generateComponentReference` for the AI/author reference file.

**Architecture:** This is pure, framework-agnostic engine code in the node `unit` test project, no Svelte and no admin UI. It extends `ComponentDef` in `src/lib/render/registry.ts` with optional `use`, `attributes`, and `slots`, so existing registries keep compiling. The grammar machines live in new modules under `src/lib/render/` and operate on plain strings and mdast nodes, parsing through the existing `remark` plus `remark-directive` stack so they unit-test without a browser. The hand-written `build()` render path is untouched in this plan; Plan 2 adds the admin form and Plan 3 migrates the sites.

**Tech Stack:** TypeScript (NodeNext), `unified`/`remark-parse`/`remark-directive` (already dependencies), `mdast`/`mdast-util-directive` types, Vitest node `unit` project.

---

## Design reference

Full design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`. This plan implements the model (attributes + named slots + render) and the three machines, scoped to flat components plus repeatable slots whose items hold a single inline field. Multi-field repeatable items (a grid item with its own icon and title sub-fields) are explicitly deferred to a follow-on; this plan ships the list-of-entries shape ecnordic's `grid` actually renders.

## Canonical serialization rules (locked, shared by every task)

These rules are the contract that `serializeComponent`, `parseComponent`, and `validateComponent` all honor. Read them before Task 2.

- **Name and attributes.** A component opens with `:::name`. For each field in `def.attributes`, in order, emit `key="value"` inside one `{...}` block when the value is present (a non-empty string, or a boolean `true` emitted as `key="true"`). Escape `"` in string values as `\"`. Omit empty strings and `false` booleans. Result: `:::name{icon="snowflake" featured="true"}`.
- **Title shorthand.** If `def.slots` has a slot named `title` and its value is non-empty, emit it as the directive label `[value]` placed after the name and before the attribute block: `:::cta[Book your lesson]{icon="snowflake"}`.
- **Default body.** If `def.slots` has a slot named `body` and its value is non-empty, emit it as the unmarked content on the line after the opening fence.
- **Named slots.** Every slot other than `title` and `body` (in `def.slots` order) is a nested directive `:::slotname` … `:::`. A `repeatable` slot's nested directive contains a markdown bullet list, one `- item` per value.
- **Fence length.** When the component has at least one nested slot (any slot other than `title`/`body`), the OUTER fence uses four colons (`::::name`) and nested slots use three (`:::slotname`), which is how `remark-directive` nests one level. With no nested slots, the outer fence uses three colons.
- **Spacing.** One blank line between the opening fence and the first content, and one blank line between adjacent slot blocks. The closing fence is the colon run alone on its own line.

Worked example for a `cta` with a `title` slot, a `body` slot, and a repeatable `actions` slot:

```
::::cta[Book your winter lesson]{icon="snowflake"}
Group and private lessons all season long.

:::actions
- Beginner-friendly
- Equipment included
:::
::::
```

## File structure

- Modify `src/lib/render/registry.ts`: add `FieldType`, `AttributeField`, `SlotKind`, `SlotDef`; extend `ComponentDef` with optional `use`, `attributes`, `slots`; export an `emptyValues` helper.
- Create `src/lib/render/component-grammar.ts`: `serializeComponent`, `parseComponent`, and the shared `ComponentValues` type.
- Create `src/lib/render/component-validate.ts`: `validateComponent`.
- Create `src/lib/render/component-reference.ts`: `generateComponentReference`.
- Modify `src/lib/index.ts`: export the new types and functions.
- Create `src/tests/unit/component-schema.test.ts`, `component-grammar.test.ts`, `component-validate.test.ts`, `component-reference.test.ts`.

---

## Task 1: Schema types and the emptyValues helper

**Files:**
- Modify: `src/lib/render/registry.ts`
- Test: `src/tests/unit/component-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-schema.test.ts
import { describe, it, expect } from 'vitest';
import { emptyValues, type ComponentDef } from '../../lib/render/registry.js';

const cta: ComponentDef = {
  name: 'cta',
  label: 'Call to action',
  description: 'A highlighted action block.',
  use: 'Use to push the reader toward one next step.',
  build: (node) => node,
  attributes: [
    { key: 'icon', label: 'Icon', type: 'icon' },
    { key: 'featured', label: 'Featured', type: 'boolean', default: false },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'actions', label: 'Actions', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
};

describe('emptyValues', () => {
  it('seeds attribute defaults and empty slot values from the schema', () => {
    expect(emptyValues(cta)).toEqual({
      attributes: { icon: '', featured: false },
      slots: { title: '', body: '', actions: [] },
    });
  });

  it('returns empty maps for a component with no attributes or slots', () => {
    const bare: ComponentDef = { name: 'rule', label: 'Rule', description: 'A divider.', use: 'Separate sections.', build: (n) => n };
    expect(emptyValues(bare)).toEqual({ attributes: {}, slots: {} });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-schema.test.ts`
Expected: FAIL, `emptyValues` is not exported and the `use`/`attributes`/`slots` properties are not on `ComponentDef`.

- [ ] **Step 3: Add the types and helper**

In `src/lib/render/registry.ts`, add these exported types above `ComponentDef`:

```ts
/** The input types a component attribute or repeatable item field can take. */
export type FieldType = 'text' | 'select' | 'icon' | 'boolean';

/** One `{key="value"}` attribute on a component directive, or one field of a repeatable item. */
export interface AttributeField {
  /** The attribute name as it appears in the directive, e.g. `icon`. */
  key: string;
  /** The form label. */
  label: string;
  type: FieldType;
  required?: boolean;
  /** Initial value; a string for text/select/icon, a boolean for boolean. */
  default?: string | boolean;
  /** Allowed values for `type: 'select'`. */
  options?: string[];
  /** Helper text shown under the field. */
  help?: string;
}

export type SlotKind = 'markdown' | 'inline' | 'repeatable';

/** One named content region of a component. The slots named `title` and `body` are special: `title`
 *  serializes to the directive `[label]` and `body` to the unmarked content (see the canonical grammar). */
export interface SlotDef {
  name: string;
  label: string;
  kind: SlotKind;
  required?: boolean;
  help?: string;
  /** For `kind: 'repeatable'`: the fields composing each list item (v1 uses the first field). */
  itemFields?: AttributeField[];
}
```

Extend the existing `ComponentDef` interface with three optional members (keep every existing member):

```ts
  /** One line on when to reach for this component; feeds the picker and the reference file. */
  use?: string;
  /** The `{key="value"}` attributes this component accepts. */
  attributes?: AttributeField[];
  /** The named content regions this component accepts. */
  slots?: SlotDef[];
```

Add the helper and its value type at the end of the file:

```ts
/** Guided-form values for one component: attribute values keyed by attribute key, slot values keyed
 *  by slot name (a string, or a string list for a repeatable slot). */
export interface ComponentValues {
  attributes: Record<string, string | boolean>;
  slots: Record<string, string | string[]>;
}

/** Seed an empty {@link ComponentValues} from a component's schema: attribute defaults (or '' / false)
 *  and empty slot values ([] for repeatable, '' otherwise). */
export function emptyValues(def: ComponentDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const field of def.attributes ?? []) {
    attributes[field.key] = field.default ?? (field.type === 'boolean' ? false : '');
  }
  const slots: Record<string, string | string[]> = {};
  for (const slot of def.slots ?? []) {
    slots[slot.name] = slot.kind === 'repeatable' ? [] : '';
  }
  return { attributes, slots };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/registry.ts src/tests/unit/component-schema.test.ts
git commit -m "feat(components): add the component attribute and slot schema"
```

---

## Task 2: serializeComponent for attributes, title, and body

**Files:**
- Create: `src/lib/render/component-grammar.ts`
- Test: `src/tests/unit/component-grammar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-grammar.test.ts
import { describe, it, expect } from 'vitest';
import { serializeComponent } from '../../lib/render/component-grammar.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };

const card: ComponentDef = {
  ...base, name: 'card', label: 'Card',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('serializeComponent flat', () => {
  it('emits a title label, an attribute block, and the unmarked body', () => {
    const md = serializeComponent(card, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Lessons', body: 'All season long.' },
    });
    expect(md).toBe(':::card[Lessons]{icon="snowflake"}\nAll season long.\n:::');
  });

  it('omits an empty attribute and an empty title', () => {
    const md = serializeComponent(card, { attributes: { icon: '' }, slots: { title: '', body: 'Body only.' } });
    expect(md).toBe(':::card\nBody only.\n:::');
  });

  it('escapes a double quote in an attribute value', () => {
    const md = serializeComponent(card, { attributes: { icon: 'a"b' }, slots: { title: '', body: 'x' } });
    expect(md).toBe(':::card{icon="a\\"b"}\nx\n:::');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: FAIL, cannot resolve `component-grammar.js`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/render/component-grammar.ts
import type { ComponentDef, ComponentValues, SlotDef } from './registry.js';

const COLON = ':';

function attrBlock(def: ComponentDef, values: ComponentValues): string {
  const parts: string[] = [];
  for (const field of def.attributes ?? []) {
    const v = values.attributes[field.key];
    if (field.type === 'boolean') {
      if (v === true) parts.push(`${field.key}="true"`);
    } else if (typeof v === 'string' && v !== '') {
      parts.push(`${field.key}="${v.replace(/"/g, '\\"')}"`);
    }
  }
  return parts.length ? `{${parts.join(' ')}}` : '';
}

function slotByName(def: ComponentDef, name: string): SlotDef | undefined {
  return (def.slots ?? []).find((s) => s.name === name);
}

function nestedSlots(def: ComponentDef): SlotDef[] {
  return (def.slots ?? []).filter((s) => s.name !== 'title' && s.name !== 'body');
}

export function serializeComponent(def: ComponentDef, values: ComponentValues): string {
  const fence = COLON.repeat(nestedSlots(def).length > 0 ? 4 : 3);

  const title = slotByName(def, 'title') ? (values.slots.title as string) ?? '' : '';
  const label = title ? `[${title}]` : '';

  const open = `${fence}${def.name}${label}${attrBlock(def, values)}`;

  const lines: string[] = [open];
  const body = slotByName(def, 'body') ? (values.slots.body as string) ?? '' : '';
  if (body) lines.push(body);

  lines.push(fence);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/component-grammar.ts src/tests/unit/component-grammar.test.ts
git commit -m "feat(components): serialize attributes, title, and body to a directive"
```

---

## Task 3: serializeComponent for named slots and repeatable lists

**Files:**
- Modify: `src/lib/render/component-grammar.ts`
- Modify: `src/tests/unit/component-grammar.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/tests/unit/component-grammar.test.ts`:

```ts
const cta: ComponentDef = {
  ...base, name: 'cta', label: 'CTA',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'actions', label: 'Actions', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
} as ComponentDef;

describe('serializeComponent nested slots', () => {
  it('uses a four-colon outer fence and nests a repeatable slot as a markdown list', () => {
    const md = serializeComponent(cta, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Book a lesson', body: 'All season long.', actions: ['Beginner-friendly', 'Gear included'] },
    });
    expect(md).toBe(
      '::::cta[Book a lesson]{icon="snowflake"}\n' +
        'All season long.\n\n' +
        ':::actions\n- Beginner-friendly\n- Gear included\n:::\n' +
        '::::',
    );
  });

  it('omits an empty repeatable slot but still nests when another slot is present', () => {
    const passage: ComponentDef = {
      ...base, name: 'passage', label: 'Passage',
      slots: [
        { name: 'body', label: 'Body', kind: 'markdown' },
        { name: 'aside', label: 'Aside', kind: 'markdown' },
      ],
    } as ComponentDef;
    const md = serializeComponent(passage, { attributes: {}, slots: { body: 'Main.', aside: 'Note.' } });
    expect(md).toBe('::::passage\nMain.\n\n:::aside\nNote.\n:::\n::::');
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: FAIL, nested slots are not yet serialized.

- [ ] **Step 3: Extend the implementation**

In `src/lib/render/component-grammar.ts`, replace the body-and-close portion of `serializeComponent` (everything after the `lines` array is created) so it emits nested slots:

```ts
  const lines: string[] = [open];
  const body = slotByName(def, 'body') ? (values.slots.body as string) ?? '' : '';
  if (body) lines.push(body);

  for (const slot of nestedSlots(def)) {
    const raw = values.slots[slot.name];
    const content =
      slot.kind === 'repeatable'
        ? ((raw as string[] | undefined) ?? []).filter((i) => i !== '').map((i) => `- ${i}`).join('\n')
        : ((raw as string | undefined) ?? '');
    if (!content) continue;
    if (lines.length > 1) lines.push(''); // blank line before this block
    lines.push(`${COLON.repeat(3)}${slot.name}`, content, COLON.repeat(3));
  }

  lines.push(fence);
  return lines.join('\n');
```

- [ ] **Step 4: Run to verify all grammar tests pass**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/component-grammar.ts src/tests/unit/component-grammar.test.ts
git commit -m "feat(components): serialize named slots and repeatable lists"
```

---

## Task 4: parseComponent reads a directive back into values

**Files:**
- Modify: `src/lib/render/component-grammar.ts`
- Modify: `src/tests/unit/component-grammar.test.ts`

This reads a serialized directive back into `ComponentValues`, proving the grammar is reversible (the seam Plan 2+ uses for round-trip editing). It parses with the project's existing `remark` stack.

- [ ] **Step 1: Add the failing round-trip tests**

Append to `src/tests/unit/component-grammar.test.ts`:

```ts
import { parseComponent } from '../../lib/render/component-grammar.js';

describe('parseComponent round-trips serializeComponent', () => {
  const cases: { def: ComponentDef; values: Parameters<typeof serializeComponent>[1] }[] = [
    { def: card, values: { attributes: { icon: 'snowflake' }, slots: { title: 'Lessons', body: 'All season.' } } },
    { def: card, values: { attributes: { icon: '' }, slots: { title: '', body: 'Body only.' } } },
    { def: cta, values: { attributes: { icon: 'snowflake' }, slots: { title: 'Book', body: 'Soon.', actions: ['One', 'Two'] } } },
  ];
  for (const [i, c] of cases.entries()) {
    it(`recovers values for case ${i}`, async () => {
      const md = serializeComponent(c.def, c.values);
      await expect(parseComponent(md, c.def)).resolves.toEqual(c.values);
    });
  }
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: FAIL, `parseComponent` is not exported.

- [ ] **Step 3: Implement parseComponent**

Add to `src/lib/render/component-grammar.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkStringify from 'remark-stringify';
import type { Root, RootContent } from 'mdast';

// A minimal structural view of a mdast containerDirective node (mdast-util-directive shape).
interface DirectiveNode {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  attributes?: Record<string, string | null> | null;
  children: RootContent[];
}

function isContainer(node: RootContent): node is RootContent & DirectiveNode {
  return (node as DirectiveNode).type === 'containerDirective';
}

const toMd = unified().use(remarkStringify);

/** Render mdast children back to trimmed markdown text. */
function childrenToText(children: RootContent[]): string {
  const root: Root = { type: 'root', children };
  return String(toMd.stringify(root)).trim();
}

export async function parseComponent(markdown: string, def: ComponentDef): Promise<ComponentValues> {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(markdown) as Root;
  const root = tree.children.find((c): c is RootContent & DirectiveNode => isContainer(c) && (c as DirectiveNode).name === def.name);
  const values = emptyComponentValues(def);
  if (!root) return values;

  for (const field of def.attributes ?? []) {
    const raw = root.attributes?.[field.key];
    if (field.type === 'boolean') values.attributes[field.key] = raw === 'true';
    else if (typeof raw === 'string') values.attributes[field.key] = raw;
  }

  const titleSlot = (def.slots ?? []).find((s) => s.name === 'title');
  const bodySlot = (def.slots ?? []).find((s) => s.name === 'body');
  const nested = (def.slots ?? []).filter((s) => s.name !== 'title' && s.name !== 'body');
  const nestedNames = new Set(nested.map((s) => s.name));

  const directChildren = root.children.filter(
    (c) => !(isContainer(c) && nestedNames.has((c as DirectiveNode).name)) && !isDirectiveLabel(c),
  );
  const nestedChildren = root.children.filter((c): c is RootContent & DirectiveNode => isContainer(c) && nestedNames.has((c as DirectiveNode).name));

  if (titleSlot) values.slots.title = readLabel(root) ?? '';
  if (bodySlot) values.slots.body = childrenToText(directChildren);

  for (const slot of nested) {
    const node = nestedChildren.find((c) => c.name === slot.name);
    if (!node) continue;
    if (slot.kind === 'repeatable') values.slots[slot.name] = readListItems(node.children);
    else values.slots[slot.name] = childrenToText(node.children);
  }

  return values;
}

function emptyComponentValues(def: ComponentDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const f of def.attributes ?? []) attributes[f.key] = f.type === 'boolean' ? false : '';
  const slots: Record<string, string | string[]> = {};
  for (const s of def.slots ?? []) slots[s.name] = s.kind === 'repeatable' ? [] : '';
  return { attributes, slots };
}

// mdast-util-directive carries the `[label]` as a paragraph whose first child has `data.directiveLabel`.
function isDirectiveLabel(node: RootContent): boolean {
  return Boolean((node as { data?: { directiveLabel?: boolean } }).data?.directiveLabel);
}

function readLabel(root: DirectiveNode): string | undefined {
  for (const child of root.children) {
    const p = child as { type: string; data?: { directiveLabel?: boolean }; children?: { value?: string }[] };
    if (p.type === 'paragraph' && p.data?.directiveLabel) return (p.children ?? []).map((c) => c.value ?? '').join('');
  }
  return undefined;
}

function readListItems(children: RootContent[]): string[] {
  const list = children.find((c) => (c as { type: string }).type === 'list') as { children?: RootContent[] } | undefined;
  if (!list?.children) return [];
  return list.children.map((li) => childrenToText((li as { children?: RootContent[] }).children ?? []));
}
```

> Note for the implementer: `remark-directive` represents the `[label]` either as `node.attributes` plus a labeled paragraph or as a leading paragraph flagged `data.directiveLabel`, depending on version. The test is the contract: make the round-trip cases pass. If the installed `remark-directive` exposes the label differently, read it from wherever the parsed tree actually carries it (inspect the tree in a scratch test), and keep `serializeComponent` unchanged. Do not weaken a test to force green.

- [ ] **Step 4: Run to verify the round-trip passes**

Run: `npx vitest run --project unit src/tests/unit/component-grammar.test.ts`
Expected: PASS (8 tests). If a case fails on label or whitespace, inspect the parsed mdast tree and adjust the reader (not the serializer or the test expectations).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/component-grammar.ts src/tests/unit/component-grammar.test.ts
git commit -m "feat(components): parse a directive back into component values"
```

---

## Task 5: validateComponent checks a directive against its schema

**Files:**
- Create: `src/lib/render/component-validate.ts`
- Test: `src/tests/unit/component-validate.test.ts`

`validateComponent` runs at save and at build. It takes the serialized markdown of one component plus its `def` and returns a field-keyed verdict.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateComponent } from '../../lib/render/component-validate.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };
const alert: ComponentDef = {
  ...base, name: 'alert', label: 'Alert',
  attributes: [{ key: 'role', label: 'Role', type: 'select', required: true, options: ['info', 'warning'] }],
  slots: [{ name: 'body', label: 'Body', kind: 'markdown', required: true }],
} as ComponentDef;

describe('validateComponent', () => {
  it('accepts a well-formed directive', async () => {
    await expect(validateComponent(':::alert{role="warning"}\nWatch out.\n:::', alert)).resolves.toEqual({ ok: true });
  });

  it('rejects a value outside the select options', async () => {
    const r = await validateComponent(':::alert{role="danger"}\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toMatch(/info, warning/);
  });

  it('rejects a missing required attribute', async () => {
    const r = await validateComponent(':::alert\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toMatch(/required/i);
  });

  it('rejects an unknown attribute', async () => {
    const r = await validateComponent(':::alert{role="info" bogus="1"}\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bogus).toMatch(/unknown/i);
  });

  it('rejects a missing required slot', async () => {
    const r = await validateComponent(':::alert{role="info"}\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.body).toMatch(/required/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-validate.test.ts`
Expected: FAIL, cannot resolve `component-validate.js`.

- [ ] **Step 3: Implement validateComponent**

```ts
// src/lib/render/component-validate.ts
import { parseComponent } from './component-grammar.js';
import type { ComponentDef } from './registry.js';

/** A validation verdict: ok, or field-keyed error messages. */
export type ComponentValidation = { ok: true } | { ok: false; errors: Record<string, string> };

export async function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation> {
  const values = await parseComponent(markdown, def);
  const errors: Record<string, string> = {};
  const declared = new Set((def.attributes ?? []).map((f) => f.key));

  for (const field of def.attributes ?? []) {
    const v = values.attributes[field.key];
    const filled = field.type === 'boolean' ? true : typeof v === 'string' && v !== '';
    if (field.required && !filled) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.type === 'select' && typeof v === 'string' && v !== '' && !(field.options ?? []).includes(v)) {
      errors[field.key] = `${field.label} must be one of: ${(field.options ?? []).join(', ')}.`;
    }
  }

  for (const key of rawAttributeKeys(markdown)) {
    if (!declared.has(key)) errors[key] = `Unknown attribute "${key}".`;
  }

  for (const slot of def.slots ?? []) {
    if (!slot.required) continue;
    const v = values.slots[slot.name];
    const filled = Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v !== '';
    if (!filled) errors[slot.name] = `${slot.label} is required.`;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

/** Pull attribute keys straight from the opening fence's `{...}` so unknown keys are caught even
 *  though the schema-driven parse drops them. */
function rawAttributeKeys(markdown: string): string[] {
  const m = markdown.match(/^:+[a-zA-Z0-9_-]+(?:\[[^\]]*\])?\{([^}]*)\}/m);
  if (!m) return [];
  return [...m[1].matchAll(/([a-zA-Z0-9_-]+)=/g)].map((x) => x[1]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-validate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/component-validate.ts src/tests/unit/component-validate.test.ts
git commit -m "feat(components): validate a directive against its schema"
```

---

## Task 6: generateComponentReference for the reference file

**Files:**
- Create: `src/lib/render/component-reference.ts`
- Test: `src/tests/unit/component-reference.test.ts`

Produces one self-contained markdown document in the `llms-full.txt` shape: an H1 name, a blockquote summary, then a section per component with its description, intended use, the canonical directive syntax, and an example.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-reference.test.ts
import { describe, it, expect } from 'vitest';
import { generateComponentReference } from '../../lib/render/component-reference.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const card: ComponentDef = {
  ...base, name: 'card', label: 'Card', description: 'A bordered content block.', use: 'Group related copy with a heading.',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline' }, { name: 'body', label: 'Body', kind: 'markdown' }],
} as ComponentDef;

describe('generateComponentReference', () => {
  const doc = generateComponentReference(defineRegistry({ components: [card] }), {
    title: 'EC Nordic components',
    summary: 'The UI building blocks available in markdown content.',
  });

  it('opens with the llms.txt-style H1 and blockquote header', () => {
    expect(doc.startsWith('# EC Nordic components\n\n> The UI building blocks available in markdown content.\n')).toBe(true);
  });

  it('documents each component with label, name, description, and use', () => {
    expect(doc).toContain('## Card (`:::card`)');
    expect(doc).toContain('A bordered content block.');
    expect(doc).toContain('**When to use:** Group related copy with a heading.');
  });

  it('shows a fenced directive example for the component', () => {
    expect(doc).toMatch(/```[\s\S]*:::card\[Title\]\{icon="…"\}[\s\S]*```/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-reference.test.ts`
Expected: FAIL, cannot resolve `component-reference.js`.

- [ ] **Step 3: Implement generateComponentReference**

```ts
// src/lib/render/component-reference.ts
import { serializeComponent } from './component-grammar.js';
import { emptyValues, type ComponentDef, type ComponentRegistry, type ComponentValues } from './registry.js';

export interface ReferenceOptions {
  /** The H1 title of the reference document. */
  title: string;
  /** The one-line blockquote summary under the title. */
  summary: string;
}

/** Build a self-contained markdown reference (the llms-full.txt shape) for a component registry, for
 *  authors and for pointing an LLM at one curated file. */
export function generateComponentReference(registry: ComponentRegistry, opts: ReferenceOptions): string {
  const sections = registry.defs.map((def) => componentSection(def));
  return `# ${opts.title}\n\n> ${opts.summary}\n\n${sections.join('\n\n')}\n`;
}

function componentSection(def: ComponentDef): string {
  const lines = [`## ${def.label} (\`:::${def.name}\`)`, '', def.description ?? ''];
  if (def.use) lines.push('', `**When to use:** ${def.use}`);
  lines.push('', '```', serializeComponent(def, exampleValues(def)), '```');
  return lines.join('\n');
}

/** Seed example values that show every declared field: an ellipsis for strings, one sample list item. */
function exampleValues(def: ComponentDef): ComponentValues {
  const values = emptyValues(def);
  for (const field of def.attributes ?? []) {
    if (field.type === 'boolean') values.attributes[field.key] = false;
    else values.attributes[field.key] = field.options?.[0] ?? '…';
  }
  for (const slot of def.slots ?? []) {
    if (slot.kind === 'repeatable') values.slots[slot.name] = ['…'];
    else if (slot.name === 'title') values.slots[slot.name] = 'Title';
    else values.slots[slot.name] = '…';
  }
  return values;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-reference.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/component-reference.ts src/tests/unit/component-reference.test.ts
git commit -m "feat(components): generate the llms-full component reference"
```

---

## Task 7: Export the new surface from the engine entry

**Files:**
- Modify: `src/lib/index.ts`
- Test: `src/tests/unit/component-exports.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/component-exports.test.ts
import { describe, it, expect } from 'vitest';
import * as cairn from '../../lib/index.js';

describe('component grammar exports', () => {
  it('exposes the schema helper, the three grammar machines, and the reference generator', () => {
    for (const name of ['emptyValues', 'serializeComponent', 'parseComponent', 'validateComponent', 'generateComponentReference']) {
      expect(typeof (cairn as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/component-exports.test.ts`
Expected: FAIL, the new functions are not re-exported.

- [ ] **Step 3: Add the exports**

In `src/lib/index.ts`, in the render-engine export group, add:

```ts
export {
  emptyValues,
  type FieldType,
  type AttributeField,
  type SlotKind,
  type SlotDef,
  type ComponentValues,
} from './render/registry.js';
export { serializeComponent, parseComponent } from './render/component-grammar.js';
export { validateComponent, type ComponentValidation } from './render/component-validate.js';
export { generateComponentReference, type ReferenceOptions } from './render/component-reference.js';
```

If `registry.js` is already partially re-exported in `index.ts`, add only the new names to the existing export rather than duplicating the line.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/component-exports.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts src/tests/unit/component-exports.test.ts
git commit -m "feat(components): export the schema and grammar surface"
```

---

## Task 8: Full gate

**Files:** none (verification only)

- [ ] **Step 1: Type check**

Run: `npm run check`
Expected: the svelte-check scan over `src/` reports 0 errors, 0 warnings. (Per repo gotcha, the command may exit non-zero only on the showcase `svelte.config.js` adapter-node import; the scan itself must be 0/0.)

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: every project green, exit 0. The new unit files (`component-schema`, `component-grammar`, `component-validate`, `component-reference`, `component-exports`) are included.

- [ ] **Step 3: Confirm no render-path regression**

Run: `grep -rn "insertTemplate" src/lib`
Expected: still present and unchanged. This plan adds the schema alongside the existing `ComponentDef`; it does not remove `insertTemplate` or touch `build()`, `createRenderer`, or the dispatch. Those changes belong to Plans 2 and 3.

---

## Self-review notes

- **Spec coverage:** the schema model (attributes + named slots + description/use) is Task 1; the canonical grammar and `serializeComponent` are Tasks 2 and 3; `parseComponent` (the round-trip seam for later editing) is Task 4; `validateComponent` (save + build) is Task 5; `generateComponentReference` (llms-full shape) is Task 6; the export surface is Task 7. The admin form and the per-site migration are out of scope by design (Plans 2 and 3).
- **Deferred from the spec, by intent:** repeatable slots serialize single-field list items in this plan. Multi-field repeatable items (a grid item with its own sub-fields) are a follow-on, noted at the top. `build()` still reads the old heading convention until Plan 3 refactors each site to read slots.
- **Type consistency:** `ComponentValues` (Task 1) is the input to `serializeComponent` and the output of `parseComponent` (Tasks 2 to 4) and the basis of `validateComponent` (Task 5) and the reference examples (Task 6). `FieldType`, `AttributeField`, `SlotDef`, and `SlotKind` are defined once in Task 1 and consumed unchanged everywhere after.
- **Parser caveat:** Task 4 flags that `remark-directive` may carry the `[label]` differently across versions; the round-trip tests are the contract, and the implementer reads the real parsed tree rather than weakening a test.

---

## Post-mortem (executed 2026-05-31, subagent-driven on `main`)

**Status:** complete and green on `main` (not pushed). Ran directly on `main` per STATUS's
pre-baked authorization (additive engine-only, and a cairn-cms `main` push deploys no site).
One `cairn-implementer` per task, verified each commit before dispatching the next.

### What was built

Tasks 1 through 7 landed verbatim against the plan: the `ComponentDef` schema extension
(`FieldType`, `AttributeField`, `SlotKind`, `SlotDef`, optional `use`/`attributes`/`slots`,
`ComponentValues`, `emptyValues`), the three grammar machines (`serializeComponent`,
`parseComponent`, `validateComponent`) over the locked directive grammar,
`generateComponentReference`, and the public exports. All pure node `unit` code, no Svelte
and no admin UI. `build()`, `createRenderer`, the render dispatch, and `insertTemplate`
usage were left untouched.

### Decisions and corrections locked in during execution

- **`insertTemplate` became optional.** Task 1's tests declare `ComponentDef` values without
  `insertTemplate`, so the member moved from required to optional. This is backward compatible
  (existing registries that supply it still compile) and matches the design direction, where the
  schema supersedes the static scaffold. The one consumer, `ComponentPalette.svelte`, gained a
  one-line guard so a templateless def inserts nothing rather than `undefined`.
- **`remark-stringify` was an undeclared dependency.** `parseComponent` imports it, but it was
  resolving only as a hoisted transitive dependency of the npm workspace root. Added it to
  `dependencies` (`^11.0.0`) and relocked the committed standalone `package-lock.json` (the
  documented temp-move-root dance), so a standalone `npm ci` resolves it. `check:package` green.
- **The draft's escaping premise was wrong, caught against the real toolchain.** The plan
  prescribed backslash escaping for attribute quotes. The installed `mdast-util-directive` does
  not honor `\"` at all (it treats a literal `"` as the value terminator and decodes HTML
  entities). The Task 9 fold-in switched to entity encoding (`&` then `"`), which actually
  round-trips. The original Task 2 "escapes a double quote" assertion documented output that
  never round-tripped; it was corrected to the entity form and proven with new round-trip tests.

### Review gate and the Task 9 fold-in

A `svelte-reviewer` pass and a general correctness review ran in parallel. The svelte pass
confirmed the palette guard is correct; its one substantive finding (a templateless def renders
as a no-op listbox option) is unreachable today because every shipped registry supplies
`insertTemplate`, so it is carried to Plan 2, where schema-only defs first appear and the
filter-versus-guided-form choice belongs.

The correctness review found real robustness gaps in the new grammar, folded in test-first as
Task 9 (a sixth implementer dispatch on Opus):
- Attribute values now entity-encode `&` and `"` so a quote no longer breaks the parse.
- Title labels escape `[` and `]` so a bracket in a title no longer loses the whole component.
- `validateComponent` reads unknown-attribute keys from the parsed directive node, not a regex
  over the source. This fixed a false rejection of a valid value containing `=` (a URL) and a
  missed unknown attribute after a value containing `}`.
- The repeatable-slot cast is guarded with `Array.isArray`.
- `remark-stringify` is pinned to `bullet: '-'` so a markdown body list does not drift to `*`.

A `code-simplifier` pass over the Tasks 1 to 7 code reused `slotByName`/`nestedSlots` inside
`parseComponent` and documented the deliberate `emptyComponentValues` twin.

### Verified

- `npm run check`: scan 0 errors, 0 warnings over `src/` (717 files). The non-zero process exit
  is the documented showcase `adapter-node` config import, not a `src/` problem.
- `npm test`: 74 files, 360 tests, exit 0. A single `MarkdownEditor` component test flaked once
  on a cold-browser start under full-suite load and passed on the immediate re-run and in
  isolation; unrelated to this pass.
- `npm run check:package`: green. `grep insertTemplate src/lib`: present, render path untouched.

### Carried follow-ups

- **Palette (Plan 2):** decide whether a schema-only def (no `insertTemplate`) is filtered out of
  the insert palette or routed into the guided form. The current click guard makes it a safe
  no-op in the interim.
- **Grammar (latent, low likelihood for the planned sites):** an attribute value containing a
  literal newline is still not supported (single-line form fields make this unreachable in
  practice). `validateComponent` parses the markdown twice (once in `parseComponent`, once in
  `parseRawAttributeKeys`); fine since validation is not hot.
- **Deferred by design:** multi-field repeatable items (a grid item with its own sub-fields).
  `build()` keeps reading the old heading convention until Plan 3 refactors each site to read
  slots.
