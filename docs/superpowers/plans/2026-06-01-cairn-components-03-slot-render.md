# cairn Component Completion (Pass 1): Slot Render Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the component named-slot render path end to end so a registered component's `:::title`/`:::body`/repeatable slots actually render, and change `ComponentDef.build` to receive structured slots instead of a raw hast node.

**Architecture:** The render pipeline stamps a registered component's nested slot directives (and its title label and attributes) at the remark stage so they survive to hast, partitions the stamped hast children into named slots at the rehype dispatch stage, and hands `build()` a `ComponentContext` (`attributes`, `slot(name)`, `items(name)`, `node`). The showcase `callout` component is the in-engine proving ground and the render-agreement gate. Folded hardening on the same surface rides along: the `glyph` unknown-icon guard, the `validateComponent` single-parse, the `splitHead` heading-sniffing retirement, and the Plan 2 form repeatable-id and a11y fixes.

**Tech Stack:** TypeScript, unified (remark/rehype), mdast-util-directive, hast/hastscript, Svelte 5 (runes), vitest (projects `unit` node, `component` playwright).

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`. Parent component design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. Commit locally; the version bump (Task 9) lands in this plan, but publishing is a separate release step after the pass.
- Test-first (TDD): write the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`; it must exit 0, not merely show green assertions).
- Targeted test commands use the project flag, e.g. `npx vitest run --project unit src/tests/unit/<file>.test.ts` or `--project component src/tests/component/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.

## Reference values (verified against the live tree)

- `src/lib/render/registry.ts` defines `FieldType` (`'text' | 'select' | 'icon' | 'boolean'`), `AttributeField` (`key, label, type, required?, default?, options?, help?`), `SlotKind` (`'markdown' | 'inline' | 'repeatable'`), `SlotDef` (`name, label, kind, required?, help?, itemFields?`), `ComponentDef` (`name, label, description, insertTemplate?, build, defaultIconByRole?, use?, attributes?, slots?`), `ComponentRegistry`, `defineRegistry`, `ComponentValues` (`{ attributes: Record<string,string|boolean>; slots: Record<string,string|string[]> }`), and `emptyValues`. `ComponentDef.build` is currently `(node: Element) => Element`.
- `src/lib/render/remark-directives.ts` exports `remarkDirectiveStamp(registry)`. It visits `containerDirective` nodes, and for a registered name stamps `data.hName = 'div'` and `data.hProperties = { dataPrimitive, dataIcon?, dataRole? }`. It does NOT stamp other attributes, nested slot directives, or the title label. Text/leaf directives are restored to literal prose.
- `src/lib/render/rehype-dispatch.ts` exports `rehypeDispatch(registry, stagger?)`, `isElement`, `strProp`, `iconSpan`, `splitHead`, `cardShell`, `markFirstList`, `MakeIcon`. `transformNode` calls `def.build(node)` at line 77. `splitHead(node, makeIcon?)` finds the first `<h2>` child and is the heading-sniffing helper to retire.
- `src/lib/render/component-grammar.ts` exports `serializeComponent(def, values)`, `parseComponent(markdown, def)`, `parseRawAttributeKeys(markdown, def)`. `serializeComponent` writes the title as `[label]`, the body as unmarked content, each nested slot (any slot not named `title` or `body`) as `:::<name> ... :::`, and a repeatable slot's items as a `- item` markdown list inside the slot.
- `src/lib/render/component-validate.ts` exports `validateComponent`. It currently parses the markdown twice (once via `parseComponent`/`parseRawAttributeKeys`).
- `src/lib/render/pipeline.ts` exports `createRenderer(registry, options?)`. It wires `[remarkDirective, [remarkDirectiveStamp, registry]]` and `[rehypeRaw, [rehypeDispatch, registry, options.stagger], rehypeSlug]`.
- `examples/showcase/src/lib/cairn.config.ts` defines `callout: ComponentDef` with `build: (node) => node`, attributes `tone` (select: note|warning, required) and `icon` (icon), and slots `title` (inline, required), `body` (markdown), `points` (repeatable, `itemFields: [{ key: 'text', label: 'Item', type: 'text' }]`). It builds `registry = defineRegistry({ components: [callout] })` and exposes `icons` (snowflake, leaf) on the adapter.
- The `glyph` helper lives in `src/lib/render/`. Find it with `grep -rn "function glyph\|d=\|d:" src/lib/render/*.ts`; it maps an icon name to an SVG `path` `d`. The carried bug: an unknown icon serializes `d="undefined"`.
- Plan 2 form: `src/lib/components/ComponentForm.svelte` renders schema fields and a repeatable add-and-remove list, keyed by index. `IconPicker.svelte` is an `aria-pressed` toggle group.

---

## Task 1: Stamp attributes, the title label, and nested slots at remark

**Files:**
- Modify: `src/lib/render/remark-directives.ts`
- Test: `src/tests/unit/render-slot-stamp.test.ts`

`remarkDirectiveStamp` stamps only `dataPrimitive`/`dataIcon`/`dataRole` on the component node. For the partitioner (Task 2) to build `ComponentContext`, every declared attribute must reach hast, the title `[label]` paragraph must be marked, and each nested slot directive must be stamped so it is not dropped. Do all three inside the existing `containerDirective` visit for a registered component.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/render-slot-stamp.test.ts
import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';
import type { Root } from 'mdast';

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'd',
  build: (ctx) => ctx.node,
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

function stamp(md: string): Root {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(md) as Root;
  remarkDirectiveStamp(registry)(tree);
  return tree;
}

function hProps(node: unknown): Record<string, unknown> {
  return ((node as { data?: { hProperties?: Record<string, unknown> } }).data?.hProperties) ?? {};
}

describe('remark slot stamping', () => {
  const md = '::::callout[Heads up]{tone="warning" icon="snowflake"}\nBody line.\n\n:::points\n- One\n- Two\n:::\n::::';

  it('stamps every declared attribute onto the component node', () => {
    const tree = stamp(md);
    let props: Record<string, unknown> = {};
    visit(tree, 'containerDirective', (n) => {
      if ((n as { name: string }).name === 'callout') props = hProps(n);
    });
    expect(props.dataPrimitive).toBe('callout');
    expect(props.dataAttrTone).toBe('warning');
    expect(props.dataAttrIcon).toBe('snowflake');
  });

  it('marks the title label paragraph and the nested slot directive', () => {
    const tree = stamp(md);
    const slots: string[] = [];
    visit(tree, (n) => {
      const p = hProps(n);
      if (typeof p.dataSlot === 'string') slots.push(p.dataSlot);
    });
    expect(slots).toContain('title');
    expect(slots).toContain('points');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-slot-stamp.test.ts`
Expected: FAIL. The current stamp does not set `dataAttrTone`/`dataAttrIcon` or any `dataSlot`. (The `build: (ctx) => ctx.node` line will also not type-check yet; that is fine, the targeted vitest run still executes. The signature lands in Task 2.)

- [ ] **Step 3: Extend the stamp**

In `src/lib/render/remark-directives.ts`, the `remarkDirectiveStamp` visit for a known container currently builds `properties` with `dataPrimitive`/`dataIcon`/`dataRole`. Add the full attribute set, then a pass over the component's children to mark the title label and the nested slot directives. Replace the body of the `if (!known.has(node.name)) return;` visit (the block that sets `properties`, `data.hName`, `data.hProperties`) with:

```ts
      const def = registry.get(node.name);
      const attrs = node.attributes ?? {};
      const role = attrs.role || undefined;
      let icon = attrs.icon || undefined;
      if (!icon && role) icon = registry.defaultIcon(node.name, role);

      const properties: Record<string, string> = { dataPrimitive: node.name };
      if (icon) properties.dataIcon = icon;
      if (role) properties.dataRole = role;
      // Carry every declared attribute to hast so the dispatch partitioner can build the
      // component context. data-attr-<key> survives to the element; build() consumes it and
      // returns a fresh element, so the marker never reaches the published DOM.
      for (const field of def?.attributes ?? []) {
        const raw = attrs[field.key];
        if (raw != null) properties[`dataAttr${capitalize(field.key)}`] = raw;
      }

      const data = node.data ?? (node.data = {});
      data.hName = 'div';
      data.hProperties = properties;

      // Mark the title label paragraph and the nested slot directives so they survive to hast
      // and the partitioner can find them. A slot named in the component schema (other than the
      // default body) is a nested container directive; the title is the directive [label].
      const slotNames = new Set((def?.slots ?? []).map((s) => s.name));
      for (const child of node.children) {
        if (isDirectiveLabel(child) && slotNames.has('title')) {
          markSlot(child, 'title');
        } else if (
          (child as { type?: string }).type === 'containerDirective' &&
          slotNames.has((child as { name: string }).name)
        ) {
          markSlot(child, (child as { name: string }).name);
        }
      }
```

Add these helpers near the top of the file (after the imports):

```ts
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// mdast-util-directive carries the `[label]` as a paragraph whose `data.directiveLabel` is set.
function isDirectiveLabel(node: unknown): boolean {
  return Boolean((node as { data?: { directiveLabel?: boolean } }).data?.directiveLabel);
}

// Stamp data-slot on a child so the rehype dispatch partitioner can route it. For a nested
// container directive we also set hName so it renders as a <div> wrapper rather than being
// dropped as an unknown directive.
function markSlot(node: unknown, name: string): void {
  const n = node as { type?: string; data?: { hName?: string; hProperties?: Record<string, string> } };
  const data = n.data ?? (n.data = {});
  if (n.type === 'containerDirective') data.hName = 'div';
  data.hProperties = { ...(data.hProperties ?? {}), dataSlot: name };
}
```

Make `registry` available where the helpers need it. The visit already closes over `registry` (the stamp's parameter), so `registry.get` works inside the visit. `markSlot`/`isDirectiveLabel`/`capitalize` are pure and need no registry.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/render-slot-stamp.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Confirm the existing stamp test still passes**

Run: `npx vitest run --project unit src/tests/unit/render-remark-directives.test.ts`
Expected: PASS. The added properties are additive; the existing assertions on `dataPrimitive`/`dataIcon`/`dataRole` and the literal-prose restoration are unchanged. If a snapshot there now carries the extra `dataAttr*`/`dataSlot` keys, update the snapshot only if the new keys are correct for the fixture.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0). The `build: (ctx) => ctx.node` change in the new test file may surface a type error until Task 2 lands the signature; if `npm run check` flags only the new test's `build` line, temporarily type that test's `build` as `build: (node) => node as never` is NOT allowed. Instead, land Task 1 and Task 2 together before the first gate if the signature coupling blocks the check. (Recommended: implement Task 1 and Task 2 back to back, then run the full gate once and commit each task's files separately.)

```bash
git add src/lib/render/remark-directives.ts src/tests/unit/render-slot-stamp.test.ts
git commit -m "feat(render): stamp component attributes, title, and nested slots

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Partition slots at dispatch and change build to build(ctx)

**Files:**
- Modify: `src/lib/render/registry.ts` (the `ComponentDef.build` signature and the new `ComponentContext` type)
- Modify: `src/lib/render/rehype-dispatch.ts` (partition and call `build(ctx)`)
- Modify: `examples/showcase/src/lib/cairn.config.ts` (the `callout` build reads slots)
- Test: `src/tests/unit/render-slot-render.test.ts`

This is the breaking change. Define `ComponentContext`, change `build` to take it, partition the stamped hast children into slots, and prove the whole path through the showcase `callout`.

- [ ] **Step 1: Write the failing render-agreement test**

```ts
// src/tests/unit/render-slot-render.test.ts
import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { serializeComponent } from '../../lib/render/component-grammar.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'd',
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone)}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
      h('ul', { className: ['callout-points'] }, ctx.items('points').map((item: ElementContent[]) => h('li', item))),
    ]),
};
const registry = defineRegistry({ components: [callout] });

describe('slot render path', () => {
  it('renders title, body, and repeatable items from the serialized component', async () => {
    const md = serializeComponent(callout, {
      attributes: { tone: 'warning' },
      slots: { title: 'Heads up', body: 'Be careful here.', points: ['First', 'Second'] },
    });
    const { renderMarkdown } = createRenderer(registry);
    const html = await renderMarkdown(md);
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('class="callout-title">Heads up');
    expect(html).toContain('Be careful here.');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<li>Second</li>');
    // The intermediate slot markers must not leak into the output.
    expect(html).not.toContain('data-slot');
    expect(html).not.toContain('data-attr');
  });
});
```

(`createRenderer` returns `{ renderMarkdown }` per `pipeline.ts`; confirm the exact returned key name and `await` shape against the file and match it.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-slot-render.test.ts`
Expected: FAIL. `ctx.slot`/`ctx.items` do not exist and `build` still takes a node, so the dispatch passes a raw node and the assertions fail (or the type does not compile).

- [ ] **Step 3: Add `ComponentContext` and change the `build` signature**

In `src/lib/render/registry.ts`, add the import and the context type, and change `ComponentDef.build`. After the `import type { Element } from 'hast';` line, change it to:

```ts
import type { Element, ElementContent } from 'hast';
```

Add the context type above `ComponentDef`:

```ts
/** The structured input a component's `build` receives. The engine stamps the component's
 *  attributes and partitions its slots from the rendered hast, so `build` arranges hast and
 *  never walks the tree. `slot(name)` returns a slot's rendered children (title, body, or any
 *  named slot); `items(name)` returns a repeatable slot's items, one child list per item. */
export interface ComponentContext {
  /** Declared attribute values, keyed by attribute key. Booleans are real booleans. */
  attributes: Record<string, string | boolean>;
  /** A named slot's rendered children. Returns `[]` for an absent or empty slot. */
  slot(name: string): ElementContent[];
  /** A repeatable slot's items, each item its own list of rendered children. `[]` when absent. */
  items(name: string): ElementContent[][];
  /** The stamped component element, for an escape hatch. Most builds never need it. */
  node: Element;
}
```

Change the `build` field in `ComponentDef`:

```ts
  /** Build the final hast element from the component context (attributes plus partitioned
   *  slots). The engine stamps the entrance-stagger ordinal (`data-rise`) on the top-level
   *  result, so a build fn stays free of any motion concern. */
  build: (ctx: ComponentContext) => Element;
```

- [ ] **Step 4: Partition and call `build(ctx)` in the dispatch**

In `src/lib/render/rehype-dispatch.ts`, import the new types and the registry's `AttributeField`, then replace `transformNode` to build the context. Add to the imports at the top:

```ts
import type { ComponentContext, ComponentDef } from './registry.js';
```

Replace `transformNode` (the function that currently does `return def ? def.build(node) : node;`) with:

```ts
// Read a stamped attribute back into its typed value. Booleans arrive as the strings
// 'true'/'false'; everything else is the literal string the author wrote.
function readAttributes(node: Element, def: ComponentDef): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const field of def.attributes ?? []) {
    const value = strProp(node, `dataAttr${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`);
    if (value == null) continue;
    out[field.key] = field.type === 'boolean' ? value === 'true' : value;
  }
  return out;
}

// Split a component's stamped children into named slots and the default body. A child marked
// data-slot="title"/<name> routes to that slot; an unmarked child is body. A repeatable slot
// wraps a <ul>, so its items are that list's <li> children, one child-list per item.
function partitionSlots(node: Element): { slot(name: string): ElementContent[]; items(name: string): ElementContent[][] } {
  const named = new Map<string, ElementContent[]>();
  const body: ElementContent[] = [];
  for (const child of node.children as ElementContent[]) {
    const slotName = isElement(child) ? strProp(child, 'dataSlot') : undefined;
    if (slotName === 'title') named.set('title', stripSlotMarker(child));
    else if (slotName) named.set(slotName, [child]);
    else body.push(child);
  }
  return {
    slot(name: string): ElementContent[] {
      if (name === 'body') return body;
      const wrap = named.get(name);
      if (!wrap) return [];
      // For title we stored the label's own children; for a markdown/inline named slot the
      // wrapper <div> holds the rendered children.
      return name === 'title' ? wrap : (wrap[0] && isElement(wrap[0]) ? (wrap[0].children as ElementContent[]) : wrap);
    },
    items(name: string): ElementContent[][] {
      const wrap = named.get(name);
      const div = wrap?.[0];
      if (!div || !isElement(div)) return [];
      const ul = (div.children as ElementContent[]).find((c) => isElement(c) && c.tagName === 'ul');
      if (!ul || !isElement(ul)) return [];
      return (ul.children as ElementContent[])
        .filter((li) => isElement(li) && li.tagName === 'li')
        .map((li) => (li as Element).children as ElementContent[]);
    },
  };
}

// The title label paragraph carries data-slot="title"; build() wants its inline children, not
// the marked paragraph. Return the paragraph's children.
function stripSlotMarker(child: ElementContent): ElementContent[] {
  return isElement(child) ? (child.children as ElementContent[]) : [child];
}

function transformNode(node: Element, registry: ComponentRegistry): Element {
  node.children = transformChildren(node.children as ElementContent[], registry);
  const name = strProp(node, 'dataPrimitive');
  const def = name ? registry.get(name) : undefined;
  if (!def) return node;
  const parts = partitionSlots(node);
  const ctx: ComponentContext = {
    attributes: readAttributes(node, def),
    slot: parts.slot,
    items: parts.items,
    node,
  };
  return def.build(ctx);
}
```

Add the `ElementContent` and `Element` imports if not already present (the file already imports `Root, Element, ElementContent` from `hast`). Confirm `strProp` returns `string | undefined` (it does).

- [ ] **Step 5: Migrate the showcase `callout` build to `build(ctx)`**

In `examples/showcase/src/lib/cairn.config.ts`, the `callout` must import `h` from `hastscript` and read slots. Add at the top with the other imports:

```ts
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
```

Replace `build: (node) => node,` with:

```ts
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone ?? 'note')}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
      h('ul', { className: ['callout-points'] }, ctx.items('points').map((item: ElementContent[]) => h('li', item))),
    ]),
```

- [ ] **Step 6: Run the render-agreement test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/render-slot-render.test.ts`
Expected: PASS.

- [ ] **Step 7: Fix the other affected render tests**

Run: `npx vitest run --project unit src/tests/unit/render-rehype-dispatch.test.ts src/tests/unit/render-pipeline.test.ts src/tests/unit/render-pipeline-snapshot.test.ts src/tests/unit/render-registry.test.ts`
Expected: any test that defines a `ComponentDef` with `build: (node) => ...` now fails to type-check or behaves differently. Update each such `build` to the `build(ctx)` shape. For a component with no slots whose old build returned the node unchanged, the new build is `build: (ctx) => ctx.node`. For one that wrapped children, read `ctx.slot('body')` for the unmarked content. Update snapshot files only where the new output is correct (the partition should not change a slotless component's output; if a snapshot changes for a slotless component, investigate before updating).

- [ ] **Step 8: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/registry.ts src/lib/render/rehype-dispatch.ts examples/showcase/src/lib/cairn.config.ts src/tests/unit/render-slot-render.test.ts
git commit -m "feat(render): partition slots and pass build a component context

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Add any render test files you had to update in Step 7 to the same commit.

---

## Task 3: Guard the glyph unknown-icon path

**Files:**
- Modify: the file defining `glyph` under `src/lib/render/` (find it first)
- Test: `src/tests/unit/render-glyph-guard.test.ts`

The carried bug: `glyph` serializes `d="undefined"` for an icon name not in the site's set. Return nothing (or omit the `path`) for an unknown icon instead.

- [ ] **Step 1: Locate `glyph`**

Run: `grep -rn "function glyph\|const glyph\|glyph(" src/lib/render/*.ts | grep -v test`
Read the function. It takes an icon name and an icon set (or the registry's icon map) and returns a hast `<svg>`/`<path>`. Note the exact signature and the file path before writing the test.

- [ ] **Step 2: Write the failing test**

Match the real `glyph` signature from Step 1. The test asserts an unknown icon does not produce `d="undefined"`. Template (adjust the import path and call shape to the real signature):

```ts
// src/tests/unit/render-glyph-guard.test.ts
import { describe, it, expect } from 'vitest';
import { glyph } from '../../lib/render/<REAL_FILE>.js';

const icons = { snowflake: 'M1 1L2 2' };

describe('glyph unknown-icon guard', () => {
  it('does not emit a path with d="undefined" for an unknown icon', () => {
    const out = glyph('missing', icons);
    const json = JSON.stringify(out);
    expect(json).not.toContain('undefined');
  });

  it('emits the path for a known icon', () => {
    const out = glyph('snowflake', icons);
    expect(JSON.stringify(out)).toContain('M1 1L2 2');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-glyph-guard.test.ts`
Expected: the first test FAILS (the output contains `"undefined"`).

- [ ] **Step 4: Add the guard**

In the `glyph` function, look up the icon path before building the element. If the path is missing, return an empty/omitted path (return an `<svg>` with no `<path>`, or return `undefined` and have the caller skip it, matching how `glyph`'s result is consumed). Choose the form that matches the real call sites you saw in Step 1 so no caller dereferences a missing return. Show the minimal guard inline in the function, for example:

```ts
  const d = icons[name];
  if (d == null) return h('svg', { /* same attrs */ }, []); // unknown icon: no path
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/render-glyph-guard.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/<REAL_FILE>.ts src/tests/unit/render-glyph-guard.test.ts
git commit -m "fix(render): omit the glyph path for an unknown icon

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Collapse the validateComponent double-parse

**Files:**
- Modify: `src/lib/render/component-validate.ts`
- Modify (maybe): `src/lib/render/component-grammar.ts` (export a single-parse seam if needed)
- Test: `src/tests/unit/component-validate.test.ts` (existing; add one behavior-preserving case if helpful)

`validateComponent` parses the markdown twice (once through `parseComponent` for values, once through `parseRawAttributeKeys` for raw keys). Parse once and derive both.

- [ ] **Step 1: Read `validateComponent` and the two grammar helpers**

Read `src/lib/render/component-validate.ts` and `parseComponent`/`parseRawAttributeKeys` in `component-grammar.ts`. Confirm both helpers run `unified().use(remarkParse).use(remarkDirective).parse(markdown)` independently. The refactor parses once and passes the parsed root (or a combined result) to both derivations.

- [ ] **Step 2: Run the existing validate test as the baseline**

Run: `npx vitest run --project unit src/tests/unit/component-validate.test.ts`
Expected: PASS. This is the behavior the refactor must preserve; it is the regression guard.

- [ ] **Step 3: Refactor to a single parse**

The cleanest seam: add an internal helper in `component-grammar.ts`, e.g. `parseComponentRoot(markdown)` returning the parsed `Root`, and have `parseComponent` and `parseRawAttributeKeys` accept either a markdown string or a pre-parsed root, or export a combined `parseComponentWithRawKeys(markdown, def)` that returns `{ values, rawKeys }` from one parse. Wire `validateComponent` to the single-parse path. Keep `parseComponent` and `parseRawAttributeKeys` public signatures unchanged for back-compat (the barrel exports them); only their internals share the one parse, or `validateComponent` calls the new combined helper. Show the exact new helper and the changed `validateComponent` body in your implementation.

- [ ] **Step 4: Run the validate test to verify it still passes**

Run: `npx vitest run --project unit src/tests/unit/component-validate.test.ts`
Expected: PASS, unchanged behavior.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/component-validate.ts src/lib/render/component-grammar.ts src/tests/unit/component-validate.test.ts
git commit -m "refactor(render): parse the component once in validateComponent

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Retire the splitHead heading-sniffing helper

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts` (remove `splitHead`)
- Modify: `src/lib/render/index.ts` (drop the `splitHead` re-export if present)
- Test: `src/tests/unit/render-exports.test.ts` (assert it is gone)

`build(ctx)` reads named slots, so no engine component sniffs headings. `splitHead` (and its missing-`<h2>` crash) has no engine caller after Task 2. Remove it. ecnordic still has its own copy on the published version and migrates off it in the later site-pass, so removing the engine export is part of this breaking change.

- [ ] **Step 1: Confirm no engine caller remains**

Run: `grep -rn "splitHead" src/ examples/ | grep -v node_modules`
Expected: after Task 2, only the definition in `rehype-dispatch.ts`, a possible re-export in `index.ts`, and possibly a test reference. If any non-test `src/` file still calls `splitHead`, that component was not migrated in Task 2; migrate it first.

- [ ] **Step 2: Write/adjust the export test**

In `src/tests/unit/render-exports.test.ts` (read it first to match its style), assert `splitHead` is no longer exported. Add:

```ts
  it('no longer exports the retired splitHead helper', async () => {
    const mod = await import('../../lib/render/index.js');
    expect('splitHead' in mod).toBe(false);
  });
```

If `render-exports.test.ts` enumerates expected exports against a list, remove `splitHead` from that list instead, so the test reflects the new surface.

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-exports.test.ts`
Expected: FAIL (splitHead is still exported).

- [ ] **Step 4: Remove `splitHead`**

Delete the `splitHead` function from `rehype-dispatch.ts` and its re-export from `index.ts` (if present). Keep `cardShell` and `markFirstList` (generic hast helpers, not heading-sniffing) unless Step 1 showed they too have no caller; if they are now unused engine exports, leave them, since they are not part of this task's scope. Only `splitHead` is retired here.

- [ ] **Step 5: Run the export test and the dispatch test**

Run: `npx vitest run --project unit src/tests/unit/render-exports.test.ts src/tests/unit/render-rehype-dispatch.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/rehype-dispatch.ts src/lib/render/index.ts src/tests/unit/render-exports.test.ts
git commit -m "refactor(render): retire the splitHead heading-sniffing helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Give repeatable form items a stable identity

**Files:**
- Modify: `src/lib/components/ComponentForm.svelte`
- Test: `src/tests/component/ComponentForm.test.ts` (existing; add a mid-list-removal case)

Plan 2 keyed the repeatable add-and-remove list by index, so removing a middle item reuses DOM nodes by position and the focused item identity does not follow the data. Give each item a stable id and key the `{#each}` by it.

- [ ] **Step 1: Read the form's repeatable list**

Read `src/lib/components/ComponentForm.svelte`. Find the repeatable slot's `{#each}` (keyed by index today, e.g. `{#each items as item, i (i)}` or unkeyed). Note how items are added and removed (the `$state` array) and how each input binds.

- [ ] **Step 2: Write the failing test**

In `src/tests/component/ComponentForm.test.ts` (match the existing render idiom; it uses `vitest-browser-svelte`), add a test that fills three repeatable items, removes the middle one, and asserts the remaining two retain their values in order. Template (adjust the component props and the field selectors to the real form):

```ts
  it('keeps repeatable item values in order after a mid-list removal', async () => {
    // render the form for a def with a repeatable slot, add three items "a"/"b"/"c",
    // remove the middle, and assert the remaining inputs read "a" then "c".
    // Use the existing helpers in this file for rendering and querying the repeatable inputs.
  });
```

Write the body concretely using the file's existing query helpers and the showcase-style def already used in this test file. Assert the two remaining inputs are "a" and "c" in that order.

- [ ] **Step 3: Run it to verify it fails (or is flaky by position)**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: the new case FAILS or shows the stale-by-position behavior (the removed-middle case leaves "a"/"b" or mismatched values), demonstrating the index-key bug.

- [ ] **Step 4: Add a stable per-item id**

Change the repeatable items from bare strings keyed by index to `$state` records `{ id: string; value: string }` (or add a parallel id list), keyed in the `{#each}` by `item.id`. Generate the id with a module-local counter (not `Math.random`/`Date.now`, which are unavailable in some contexts and overkill): a `let nextId = 0;` incremented per add. Keep the serialized output identical: the form still emits the list of string values to `serializeComponent`. Update the add/remove handlers and the value binding to the new record shape. Show the exact `{#each ... (item.id)}` and the handlers in your implementation.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts`
Expected: PASS, including the existing cases (the emitted values are unchanged).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentForm.svelte src/tests/component/ComponentForm.test.ts
git commit -m "fix(admin): give repeatable form items a stable identity

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Component form a11y polish

**Files:**
- Modify: `src/lib/components/ComponentForm.svelte`
- Modify: `src/lib/components/IconPicker.svelte`
- Test: `src/tests/component/ComponentForm.test.ts`, `src/tests/component/IconPicker.test.ts` (if present)

Three a11y fixes from the Plan 2 review: drop the redundant `aria-label` on flat fields that already have a visible `<label>`, give each repeatable item input an indexed accessible name instead of a generic one, and move `IconPicker` from an `aria-pressed` toggle group to radiogroup semantics.

- [ ] **Step 1: Read both components and any existing IconPicker test**

Read `ComponentForm.svelte` (the flat-field label/aria-label pairing and the repeatable item input labeling) and `IconPicker.svelte` (the `aria-pressed` buttons). Find or note the absence of `src/tests/component/IconPicker.test.ts`.

- [ ] **Step 2: Write the failing tests**

Add to `ComponentForm.test.ts`: a flat field's input is labeled by its visible `<label>` and carries no redundant `aria-label`; a repeatable item input's accessible name includes its 1-based index (for example "Item 2"). For `IconPicker`, add or extend a test asserting the group has `role="radiogroup"` and each choice is `role="radio"` with `aria-checked` reflecting selection. Write each assertion concretely against the rendered DOM using the file's query idiom.

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts src/tests/component/IconPicker.test.ts`
Expected: FAIL on the new assertions.

- [ ] **Step 4: Apply the fixes**

In `ComponentForm.svelte`: remove the `aria-label` attribute from a flat field whose `<label for>`/`id` pairing already names it; for the repeatable item input, set its accessible name to include the 1-based index (an `aria-label={`${slot.label} ${i + 1}`}` on the item input, or a visually-hidden `<label>` per item). In `IconPicker.svelte`: change the container to `role="radiogroup"` with an `aria-label`, each option button to `role="radio"` with `aria-checked={selected === key}` and roving `tabindex`, and arrow-key handling if the existing toggle relied on Tab. Keep the visible appearance and the selection behavior unchanged. Show the exact markup changes in your implementation.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/ComponentForm.test.ts src/tests/component/IconPicker.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/ComponentForm.svelte src/lib/components/IconPicker.svelte src/tests/component/ComponentForm.test.ts src/tests/component/IconPicker.test.ts
git commit -m "fix(admin): component form and icon picker accessibility

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update the showcase content and docs to exercise a slotted component

**Files:**
- Modify or create: a showcase post under `examples/showcase/src/content/posts/` that uses the `:::callout` component with a title, body, and points
- Modify: `docs/creating-a-cairn-site.md` (the component section: document `build(ctx)`, `ctx.slot`, `ctx.items`)

Prove the path renders in the real showcase build, and document the new `build(ctx)` contract so the ecnordic migration and the scaffolder template follow it.

- [ ] **Step 1: Add a callout to a showcase post**

Append a `:::callout` block (title via `[label]`, a body line, and a `:::points` list of two items) to an existing showcase post, or add a new post. Use the exact grammar `serializeComponent` emits (4 colons on the outer fence because there is a nested slot). Verify by building: `npm run package && npm --prefix examples/showcase run build`. The build must succeed and the prerendered post HTML must contain the `callout` markup. Confirm with a grep over `examples/showcase/.svelte-kit/output/prerendered` for `class="callout`.

- [ ] **Step 2: Document `build(ctx)` in the integration guide**

In `docs/creating-a-cairn-site.md`'s component section, update the `ComponentDef` description so `build` is `build(ctx)`: `ctx.attributes`, `ctx.slot(name)` for the title/body/named slots, `ctx.items(name)` for a repeatable slot, and `ctx.node` for the escape hatch. Add a short worked example mirroring the showcase `callout`. Keep prose plain (the `prose-guard` write hook gates `docs/**`: no em dashes, no banned filler). Run `prose-guard docs/creating-a-cairn-site.md` and confirm no violations.

- [ ] **Step 3: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add examples/showcase/src/content docs/creating-a-cairn-site.md
git commit -m "docs(components): document build(ctx) and prove it in the showcase

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Version bump

**Files:**
- Modify: `package.json` (the `version` field)
- Modify: `package-lock.json` (the two `version` fields)

`ComponentDef.build` changed signature, a breaking change to the package surface. Bump the minor (0.x semver treats a minor as the breaking step during active dev). The current version is `0.11.0`, so this is `0.12.0`.

- [ ] **Step 1: Bump the version surgically**

Edit `package.json` `"version": "0.11.0"` to `"0.12.0"`. Edit `package-lock.json`'s top-level `"version"` (line ~3) and the `packages[""]."version"` (line ~9) from `0.11.0` to `0.12.0`. Do NOT run `npm install` from inside the workspace member (it drifts the root lock); the surgical edit avoids that.

- [ ] **Step 2: Validate the package shape**

Run: `npm run check:package`
Expected: green, all conditions resolve, attw all-green.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(release): 0.12.0

ComponentDef.build changes from build(node) to build(ctx) with structured
slots, a breaking change to the component surface. Adds the named-slot
render path, the glyph unknown-icon guard, the validateComponent single
parse, the splitHead retirement, and the component-form a11y and
repeatable-identity fixes.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Live /admin guided-insert smoke

**Files:** none (verification only)

The one unverified Plan 2 surface, now meaningful because the inserted slot markup renders. Run the live `/admin` smoke against a real Worker per the cairn admin smoke doc.

- [ ] **Step 1: Start the showcase admin against a real Worker**

Follow `cairn-cms/docs/` admin smoke doc. Start `wrangler dev` (or the showcase's dev server with the Worker), mint a session by inserting a D1 session row directly (no email loop), and open `/admin`.

- [ ] **Step 2: Exercise the guided insert**

Open a post in the editor, open the component insert dialog, pick the `callout`, fill the title, body, and two points, and insert. Confirm the directive markup lands at the cursor in the CodeMirror source and the preview renders the callout with its title, body, and points.

- [ ] **Step 3: Record the result**

Record the smoke result (pass/fail, with what was observed) as the pass evidence in the post-mortem. This is a manual step and is not committed as code. If it surfaces a defect, log it and address it before the pass closes.

---

## Self-review notes

- **Spec coverage.** The slot render path is Tasks 1 (stamp), 2 (partition + `build(ctx)`). The folded hardening: `glyph` guard (Task 3), `validateComponent` single-parse (Task 4), `splitHead` retirement (Task 5), form repeatable identity (Task 6), form a11y (Task 7). The render-agreement gate is Task 2's test plus the showcase build in Task 8. The live `/admin` smoke is Task 10. The version bump for the breaking `build` change is Task 9. Typed reads, delivery/SEO, and auth hardening are out of scope (Passes 2 and 3).
- **Ordering and green builds.** Tasks 1 and 2 are coupled (the stamp writes what the partitioner reads, and the `build(ctx)` signature lands in Task 2). Implement them back to back and run the first full gate after Task 2, committing each task's files separately. Tasks 3 through 7 are independent of each other and of the render-path tasks. Task 8 (showcase content + docs) follows the render path. Task 9 (version) and Task 10 (smoke) come last.
- **Type consistency.** `ComponentContext` is `{ attributes: Record<string,string|boolean>; slot(name): ElementContent[]; items(name): ElementContent[][]; node: Element }`. `ComponentDef.build` is `(ctx: ComponentContext) => Element`. The dispatch's `readAttributes` reads `dataAttr<Key>` written by the stamp's `dataAttr${capitalize(key)}`; the casing must match (both capitalize the first letter only). The stamp writes `dataSlot` and the partitioner reads `strProp(child, 'dataSlot')`.
- **Breaking change.** Every `ComponentDef` in the engine, the showcase, and the tests moves from `build: (node) => ...` to `build: (ctx) => ...`. Task 2 Step 7 sweeps the engine test defs; Task 2 Step 5 migrates the showcase. ecnordic is a separate repo and migrates in its own later site-pass.
- **Marker hygiene.** `data-attr-*` and `data-slot` are intermediate markers consumed by `build()`, which returns a fresh element, so they must not appear in the published HTML. Task 2's render-agreement test asserts neither marker leaks.

---

## Post-mortem (executed 2026-06-01)

Executed subagent-driven on `main`, one `cairn-implementer` per task, each clearing the full gate before its commit. Eleven commits landed: `2bca500..d0c3e0a` (nine task commits, one simplifier pass, one review-gate hardening commit). The tree is clean and the tip gate is green.

### What was built

The named-slot render path now works end to end. `remarkDirectiveStamp` stamps a registered component's declared attributes (`data-attr-<key>`), marks its `[label]` paragraph as the title slot, and stamps each nested slot directive so they survive to hast (Task 1, `2bca500`). The rehype dispatch partitions those stamped children into named slots and hands `build` a `ComponentContext` (`attributes`, `slot(name)`, `items(name)`, `node`), replacing the old `build(node)` signature (Task 2, `a115580`). The showcase `callout` proves the path, and the production build prerenders it.

The folded hardening all landed: the `glyph` unknown-icon guard (Task 3, `d060474`), the `validateComponent` single-parse seam (Task 4, `101be71`), the `splitHead` retirement (Task 5, `a15be5f`), the repeatable-form stable identity (Task 6, `053bf99`), and the form a11y polish (Task 7, `20a2481`). The showcase content and `build(ctx)` docs landed in Task 8 (`7bf1264`), and the version bumped to `0.12.0` in Task 9 (`978783d`).

### Verified with evidence

- Final gate at the tip: `npm run check` reports 742 files, 0 errors, 0 warnings. `npm test` reports 91 test files, 410 tests, exit 0.
- Render-agreement: the Task 2 unit test renders a serialized `callout` to `<aside class="callout callout-warning">` with the title, body, and two `<li>` points, and asserts no `data-slot` or `data-attr` marker leaks.
- Showcase production build (Task 8): `npm --prefix examples/showcase run build` succeeds, and the prerendered `pages/posts/callout.html` carries the correct `<aside class="callout callout-warning">` markup with title, body, and points. This is the strongest automated proof the slot path renders in a real build.
- `npm run check:package` is all-green for `0.12.0` (attw green across every export entry).

### Decisions locked in during execution

- **`glyph` symptom corrected.** The plan described the carried bug as `glyph` serializing `d="undefined"`. That string never reproduces in this toolchain, because `hastscript` drops an `undefined` property and `hast-util-to-html` renders a dead empty `<path>` instead. The real defect was the dead empty `<path>` for an unknown icon. The test was retargeted at that observable behavior (an unknown icon yields zero path children), watched fail, then fixed by returning the bare `<svg>` shell with no path child.
- **Repeatable identity via a parallel id list.** The repeatable form items keep `values.slots[name]` as a raw `string[]`, with a parallel per-slot `itemIds` array supplying the `{#each}` key. This leaves `serializeComponent`, `emptyValues`, and the `bind:value` path untouched, so the emitted value shape is identical. The identity test asserts DOM-node identity after a mid-list removal, since the plan's value-read assertion alone does not catch the index-key bug (`bind:value` re-drives the inputs after a splice).
- **Showcase `render` was a placeholder.** Task 8 found the showcase `render` was a line-wrapper that never ran the engine, so the prerendered grep was impossible without wiring `render` to `createRenderer(registry).renderMarkdown`. That wiring is on the showcase config, not the engine surface, so it does not widen the breaking change. Prior showcase prerender gates were therefore not exercising the engine renderer, a gap this pass closed.
- **Simplifier extracted `dataAttrProp`.** The stamp-write and dispatch-read sides built the `data-attr-<Key>` marker name twice with the same capitalize logic. The simplifier moved the derivation into one exported `dataAttrProp(key)` in `registry.ts`, so the casing contract is a single source of truth.

### Review gate

A simplifier pass plus two read-only reviewers ran at the gate: `svelte-reviewer` and `daisyui-a11y-reviewer`, both Opus. The `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply, since the pass touched no Worker, D1, auth, session, or cookie code. Both reviewers converged on one Important finding: the `IconPicker` roving-tabindex pattern was half-implemented, updating `aria-checked` and `tabindex` on arrow keys without moving DOM focus to the newly selected radio. That cluster was folded in test-first (`d0c3e0a`): focus now follows selection (`tick()` then focus the live `[tabindex="0"]` node), the arrow origin derives from the tab stop rather than the bound value (fixing an off-by-one from an unselected required group), and the group label threads from the field rather than a hardcoded `"Icon"`.

### Carried follow-ups

- **Live `/admin` guided-insert smoke (Task 10) is unrun.** It needs a human clicking through the insert dialog in a browser against a real Worker, which the automated layer cannot drive. The render path is proven by the showcase production build, and the form-to-editor flow by the browser component tests, so this is a fast-follow rather than a blocker. It is best run during the ecnordic component migration, against that site's real Worker.
- **Showcase callout is a minimal reference.** The `tone` and `icon` attributes reach `build(ctx)` but render no visible styling (the showcase ships no `.callout` CSS, and the icon attribute is not rendered into the markup). This is fine for a reference example that proves the slot path. A richer showcase callout that renders the icon and tone styling is optional polish.
- **Showcase render ignores a per-call `stagger` option.** The adapter contract is `render(md, opts?)`, but the showcase wires one `createRenderer` with stagger off and ignores `opts`. Harmless for the showcase, a latent trap for a site that copies the config and expects `render(md, { stagger: true })`. The cleaner fix is a per-call `stagger` argument on `renderMarkdown`, deferred as out of scope.
- **`partitionSlots` body slot relies on the stamp marking every schema slot.** `slot('body')` returns every unmarked top-level child, so a future slot kind the stamp loop misses would leak into body. Not a defect under the current kinds.
