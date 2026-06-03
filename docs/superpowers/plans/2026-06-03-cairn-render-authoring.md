# Render and component authoring (DX pass P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close five render and component-authoring findings from the ecnordic migration DX backlog (items 7, 8, 9, 11, 15): collapse the dead `dataIcon` marker onto the declared icon attribute, ship a shared `headRow` head helper, make the anchor `rel` policy configurable, drop an unclaimed directive label, and state the declared-attribute contract in the docs.

**Architecture:** Five focused changes in the render module (`rehype-dispatch.ts`, `remark-directives.ts`, `sanitize-schema.ts`, `pipeline.ts`) plus docs. The unifying correction is item 9: the stamper routes the resolved icon (author value or `defaultIconByRole` default) into the declared `type: 'icon'` attribute and stops writing the vestigial `dataIcon` marker, which nothing reads. That correction lets the new `headRow` helper read a correct icon from `ctx.attributes`. The showcase proves items 7 and 9 through a real build.

**Tech Stack:** TypeScript, hast/hastscript, unified/remark/rehype, Svelte 5, Vitest (node `unit` project, no Svelte plugin), `@glw907/cairn-cms` package export map, `publint` + `attw` via `check:package`.

**Spec:** `docs/superpowers/specs/2026-06-03-cairn-render-authoring-design.md`

**Conventions:** Test-first, one behavior per test. The full gate before "done": the targeted test, then `npm run check` (svelte-check 0 errors / 0 warnings), then `npm test` (must EXIT 0). Commit specific files, imperative mood, co-author footer `Co-Authored-By: Claude <noreply@anthropic.com>` (this is the repo convention). For docs, draft in the repo's prose voice (no em dashes, one idea per sentence, no "not X but Y" frames) so `prose-guard` passes on the first try.

---

## File map

- `src/lib/render/rehype-dispatch.ts`: add the pure `headRow` helper beside `cardShell`/`iconSpan` (Task 1); update the `strProp` doc comment that names `dataIcon` (Task 2).
- `src/lib/index.ts`: export `headRow` beside `cardShell`/`iconSpan` (Task 1).
- `src/lib/render/remark-directives.ts`: route the resolved icon into the declared `type: 'icon'` attribute and drop the `dataIcon` write (Task 2); drop an unclaimed directive label when the component has no `title` slot (Task 4).
- `src/lib/render/sanitize-schema.ts`: drop `dataIcon` from `FIXED_MARKERS` (Task 2); parameterize `rehypeAnchorRel(rel)` (Task 3).
- `src/lib/render/pipeline.ts`: add the `anchorRel` option to `RendererOptions` and thread it (Task 3).
- `examples/showcase/src/lib/cairn.config.ts` and a showcase post: an `alert` component using `headRow` + `defaultIconByRole`, proving items 7 and 9 (Task 6).
- `docs/creating-a-cairn-site.md` and `CHANGELOG.md`: the authoring rules and the `0.24.0` entry (Task 5).
- `package.json` (version): bump to `0.24.0`, then the full gate including a green showcase build (Task 7).

**Task models:** Task 2 and Task 6 are judgment-heavy (a byte-identical snapshot-fixture migration; integration wiring with a build gate), so dispatch them with `model: opus`. Tasks 1, 3, 4, 5, 7 are mechanical; the `cairn-implementer` Sonnet default fits.

---

## Task 1: Add the `headRow` head helper

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts` (add `headRow` after `cardShell`, near line 29)
- Modify: `src/lib/index.ts` (export `headRow`, near line 95)
- Test: `src/tests/unit/render-rehype-dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/tests/unit/render-rehype-dispatch.test.ts`. Import `headRow` from `../../lib/render/rehype-dispatch.js` (extend the file's existing import from that module). The file already imports from `hastscript` and `hast`; reuse `h` and the `Element` type, matching the existing import lines.

```ts
describe('headRow', () => {
  it('builds an ec-head with an h2.card-title and no icon when none is given', () => {
    const row = headRow([{ type: 'text', value: 'Hello' }]);
    expect(row.tagName).toBe('div');
    expect(row.properties?.className).toEqual(['ec-head']);
    expect(row.children).toHaveLength(1);
    const heading = row.children[0] as Element;
    expect(heading.tagName).toBe('h2');
    expect(heading.properties?.className).toEqual(['card-title']);
    expect((heading.children[0] as { value: string }).value).toBe('Hello');
  });

  it('places a pre-built icon before the heading when given', () => {
    const icon = h('span', { className: ['ec-icon'] }, []);
    const row = headRow([{ type: 'text', value: 'Hi' }], icon);
    expect(row.children).toHaveLength(2);
    const first = row.children[0] as Element;
    expect(first.tagName).toBe('span');
    expect(first.properties?.className).toEqual(['ec-icon']);
    expect((row.children[1] as Element).tagName).toBe('h2');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-rehype-dispatch.test.ts -t "headRow"`
Expected: FAIL. `headRow` is not exported.

- [ ] **Step 3: Add the helper**

In `src/lib/render/rehype-dispatch.ts`, add this exported function right after `cardShell` (after line 29):

```ts
/** Card head row: `<div class="ec-head">[icon]<h2 class="card-title">{title}</h2></div>`.
 *  Pass the title's inline children and an optional pre-built icon element, the way `cardShell`
 *  takes already-built body content. This factors the icon-plus-heading head that a titled
 *  component build would otherwise rebuild by hand (the shape the removed `splitHead` produced). */
export function headRow(title: ElementContent[], icon?: Element): Element {
  const children: ElementContent[] = [];
  if (icon) children.push(icon);
  children.push(h('h2', { className: ['card-title'] }, title));
  return h('div', { className: ['ec-head'] }, children);
}
```

- [ ] **Step 4: Export `headRow` from the package**

In `src/lib/index.ts`, add `headRow,` to the export block from `./render/rehype-dispatch.js` (the block at lines 89-96), beside `cardShell`:

```ts
export {
  rehypeDispatch,
  isElement,
  strProp,
  iconSpan,
  cardShell,
  headRow,
  markFirstList,
} from './render/rehype-dispatch.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/render-rehype-dispatch.test.ts -t "headRow"`
Expected: PASS (both cases).

- [ ] **Step 6: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0, and `npm run check:package` exits 0 (a public export was added). Then:

```bash
git add src/lib/render/rehype-dispatch.ts src/lib/index.ts src/tests/unit/render-rehype-dispatch.test.ts
git commit -m "Add the headRow component head helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Route the role-default icon through the declared attribute (drop `dataIcon`)

**Dispatch with `model: opus`.** This migrates the byte-identical snapshot fixture and updates two test files.

**Files:**
- Modify: `src/lib/render/remark-directives.ts` (the stamp body, lines 60-74)
- Modify: `src/lib/render/sanitize-schema.ts` (`FIXED_MARKERS`, line 8)
- Modify: `src/lib/render/rehype-dispatch.ts` (the `strProp` doc comment, lines 9-11)
- Test: `src/tests/unit/render-remark-directives.test.ts` (update the icon fixtures and assertions)
- Test: `src/tests/unit/render-pipeline-snapshot.test.ts` (migrate `fixtureHead` off `dataIcon`)

The bug: the stamper resolves the icon (author `icon=` value, falling back to `defaultIconByRole`) and writes it to the fixed `dataIcon` marker, which no current build reads. The declared `dataAttr<key>` path that builds read through `ctx.attributes` carries only the author's literal value, so a role default never reaches a build. The fix folds the resolved icon into the declared `type: 'icon'` attribute and removes the dead `dataIcon` write.

- [ ] **Step 1: Update the stamp-test fixtures and assertions (the failing test)**

In `src/tests/unit/render-remark-directives.test.ts`, give the `card` and `alert` fixture components a declared `icon` attribute, so a build (and these assertions) can read the icon through the declared path. Change the `reg` definition (lines 11-22) so each component carries:

```ts
      attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
```

For `card`, add it beside its existing fields; for `alert`, add it beside `defaultIconByRole`. The two components become:

```ts
const reg = defineRegistry({
  components: [
    {
      name: 'card',
      label: '',
      description: '',
      insertTemplate: '',
      build: (ctx) => ctx.node,
      attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
    },
    {
      name: 'alert',
      label: '',
      description: '',
      insertTemplate: '',
      build: (ctx) => ctx.node,
      defaultIconByRole: { caution: 'warning' },
      attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
    },
  ],
});
```

Then change the two icon assertions from the fixed marker to the declared path. At line 39 change `data-icon="flag"` to `data-attr-icon="flag"`, and at line 44 change `data-icon="warning"` to `data-attr-icon="warning"`:

```ts
  it('stamps a known container directive with data-primitive/icon/role', async () => {
    const html = await run(':::card{icon=flag role=secondary}\n## H\n:::');
    expect(html).toContain('data-primitive="card"');
    expect(html).toContain('data-attr-icon="flag"');
    expect(html).toContain('data-role="secondary"');
  });
  it('applies the role default icon for alert', async () => {
    const html = await run(':::alert{role=caution}\n## H\n:::');
    expect(html).toContain('data-attr-icon="warning"');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/render-remark-directives.test.ts -t "remarkDirectiveStamp"`
Expected: FAIL on the alert role-default case. The author-icon case already stamps `data-attr-icon="flag"` from the declared-attribute loop, but the role default is not yet folded into the declared path, so `data-attr-icon="warning"` is absent.

- [ ] **Step 3: Fold the resolved icon into the declared attribute and drop `dataIcon`**

In `src/lib/render/remark-directives.ts`, replace the whole resolution and property-building block (lines 59-74, from `const def = registry.get(node.name);` through the closing brace of the `for` loop) with this. It finds the declared `type: 'icon'` field, reads the author value from that field's key, applies the role default, and stamps the resolved value into that field's `dataAttr<key>` when the author gave none. The separate `dataIcon` write is gone:

```ts
      const def = registry.get(node.name);
      const attrs = node.attributes ?? {};
      const role = attrs.role || undefined;
      const iconField = def?.attributes?.find((field) => field.type === 'icon');
      const iconKey = iconField?.key ?? 'icon';
      let icon = attrs[iconKey] || undefined;
      if (!icon && role) icon = registry.defaultIcon(node.name, role);

      const properties: Record<string, string> = { dataPrimitive: node.name };
      if (role) properties.dataRole = role;
      // Carry every declared attribute to hast so the dispatch partitioner can build the
      // component context. For the icon attribute, fall back to the resolved icon (author value
      // or the defaultIconByRole default) so a role default reaches the build through the one
      // declared path. data-attr-<key> survives to the element; build() consumes it and returns a
      // fresh element, so the marker never reaches the published DOM.
      for (const field of def?.attributes ?? []) {
        const raw = field === iconField ? (attrs[field.key] ?? icon) : attrs[field.key];
        if (raw != null) properties[dataAttrProp(field.key)] = raw;
      }
```

Leave the rest of the function (the `data.hName`/`hProperties` assignment and the slot-marking loop) unchanged.

- [ ] **Step 4: Drop `dataIcon` from the sanitize markers and the doc comment**

In `src/lib/render/sanitize-schema.ts`, remove `'dataIcon'` from `FIXED_MARKERS` (line 8):

```ts
const FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataRole', 'dataRise'];
```

In `src/lib/render/rehype-dispatch.ts`, update the `strProp` doc comment (lines 9-11) so it no longer names the removed marker:

```ts
// hast Properties values are PropertyValue (string | number | boolean | array | null).
// Directive markers (dataPrimitive/dataRole/dataAttr<Key>) are always stamped as strings;
// this reads them back with that guarantee instead of casting at each call site.
```

- [ ] **Step 5: Migrate the snapshot fixture off `dataIcon`**

In `src/tests/unit/render-pipeline-snapshot.test.ts`, the local `fixtureHead` reads `strProp(node, 'dataIcon')`, which is now gone. Migrate it to read the icon from the declared attribute path and build the head with the new `headRow` helper. This also dogfoods `headRow` in the engine suite. The output must stay byte-identical to the committed snapshot.

First extend the import from `rehype-dispatch.js` (lines 7-14) to bring in `headRow`, and import the `ComponentContext` type from the registry:

```ts
import {
  cardShell,
  headRow,
  markFirstList,
  iconSpan,
  isElement,
  strProp,
  type MakeIcon,
} from '../../lib/render/rehype-dispatch.js';
import { defineRegistry, type ComponentContext } from '../../lib/render/registry.js';
```

(The file already imports `defineRegistry` from the registry; merge `ComponentContext` into that existing import line rather than adding a duplicate import.)

Replace `fixtureHead` (lines 24-36) with a version that takes `ctx`, reads `ctx.attributes.icon`, and uses `headRow`:

```ts
// Local fixture helper: pull the <h2> out as the head's title and build the .ec-head row with
// an optional icon read from the declared attribute path. Mirrors what a real site build does
// with headRow now that the engine ships it.
function fixtureHead(ctx: ComponentContext, icon: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = ctx.node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  const rest = children.filter((_, j) => j !== i);
  const iconName = typeof ctx.attributes.icon === 'string' ? ctx.attributes.icon : undefined;
  const role = strProp(ctx.node, 'dataRole');
  const iconEl = iconName ? icon(iconName, role) : undefined;
  return { head: headRow(h2.children as ElementContent[], iconEl), rest };
}
```

Update the two build call sites to pass `ctx` instead of `ctx.node` (lines 46 and 58): `const { head, rest } = fixtureHead(ctx, makeIcon);`. Give the fixture `card` and `grid` components a declared `icon` attribute so `ctx.attributes.icon` is populated, by adding to each component def:

```ts
      attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
```

The `strProp` import stays in use (for `dataRole`).

- [ ] **Step 6: Run the targeted tests and confirm the snapshot is byte-identical**

Run: `npx vitest run --project unit src/tests/unit/render-remark-directives.test.ts src/tests/unit/render-pipeline-snapshot.test.ts`
Expected: PASS, with NO snapshot update. Do not pass `-u`. The snapshot must match the committed one byte for byte, proving `headRow` reproduces the prior hand-rolled head exactly. If the snapshot fails to match, `headRow`'s output diverged from the old `fixtureHead`; reconcile the helper rather than updating the snapshot.

- [ ] **Step 7: Full gate, then commit**

Confirm `npm run check` 0/0, `npm test` exits 0, and `npm run check:package` exits 0. Search the suite for any other `dataIcon` reader before committing: `grep -rn "dataIcon" src/` should return nothing. Then:

```bash
git add src/lib/render/remark-directives.ts src/lib/render/sanitize-schema.ts src/lib/render/rehype-dispatch.ts src/tests/unit/render-remark-directives.test.ts src/tests/unit/render-pipeline-snapshot.test.ts
git commit -m "Route the role-default icon through the declared attribute

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Make the anchor `rel` policy a `createRenderer` option

**Files:**
- Modify: `src/lib/render/sanitize-schema.ts` (`rehypeAnchorRel`, lines 58-66)
- Modify: `src/lib/render/pipeline.ts` (`RendererOptions` and the rehype chain)
- Test: `src/tests/unit/render-sanitize.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two cases to `src/tests/unit/render-sanitize.test.ts`, after the existing `rel="noopener noreferrer"` case (line 48). They reuse the file's `createRenderer`/`defineRegistry` imports and the `<a target="_blank">` fixture shape:

```ts
  it('applies a custom anchorRel value', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { anchorRel: 'nofollow' });
    const html = await r.renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).toContain('rel="nofollow"');
  });

  it('omits rel when anchorRel is false', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { anchorRel: false });
    const html = await r.renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).not.toContain('rel=');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/render-sanitize.test.ts -t "anchorRel"`
Expected: FAIL. `anchorRel` is not a known option, so the custom value is ignored (the default `noopener noreferrer` is injected) and `false` does not disable injection.

- [ ] **Step 3: Parameterize `rehypeAnchorRel`**

In `src/lib/render/sanitize-schema.ts`, change `rehypeAnchorRel` (lines 58-66) to take the `rel` value:

```ts
/**
 * Force a `rel` value on every target="_blank" anchor, to prevent reverse-tabnabbing.
 * hast-util-sanitize runs no per-node hook, so this small transform carries the behavior the old
 * DOMPurify preview pass enforced, now on the delivered output as well. The value is the renderer's
 * `anchorRel` option (default `noopener noreferrer`); a site can override it or disable it entirely.
 */
export function rehypeAnchorRel(rel: string) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties?.target === '_blank') {
        node.properties.rel = rel;
      }
    });
  };
}
```

- [ ] **Step 4: Add the option and thread it**

In `src/lib/render/pipeline.ts`, add the `anchorRel` member to `RendererOptions` (after `unsafeDisableSanitize`, line 32):

```ts
  /** The `rel` value forced on every `target="_blank"` anchor, applied last so it also covers
   *  component-built anchors. Defaults to `'noopener noreferrer'`. Set a different string to change
   *  it, or `false` to disable the injection (a site that owns its own anchor hardening). */
  anchorRel?: string | false;
```

Then change the rehype chain assembly (lines 46-52) so the parameterized plugin is added only when `anchorRel` is not `false`:

```ts
  const rel = options.anchorRel ?? 'noopener noreferrer';
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    ...floor,
    [rehypeDispatch, registry, options.stagger],
    rehypeSlug,
  ];
  if (rel !== false) rehypePlugins.push([rehypeAnchorRel, rel]);
```

The `?? 'noopener noreferrer'` keeps the default when `anchorRel` is undefined; `false` flows through (it is neither null nor undefined) and skips the push.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/render-sanitize.test.ts`
Expected: PASS, including the existing default `rel="noopener noreferrer"` case (unchanged behavior) and the two new cases.

- [ ] **Step 6: Full gate, then commit**

Confirm `npm run check` 0/0, `npm test` exits 0, and `npm run check:package` exits 0 (a public type changed). Then:

```bash
git add src/lib/render/sanitize-schema.ts src/lib/render/pipeline.ts src/tests/unit/render-sanitize.test.ts
git commit -m "Make the anchor rel policy a createRenderer option

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Drop an unclaimed directive label

**Files:**
- Modify: `src/lib/render/remark-directives.ts` (the slot-marking loop, lines 83-93)
- Test: `src/tests/unit/render-remark-directives.test.ts`

A component without a `title` slot leaves a `[...]` label paragraph unclaimed, so it renders as a stray `<p>`. The `card` fixture in this test file declares no slots, so it is the title-less case.

- [ ] **Step 1: Write the failing tests**

Add these cases to the `remarkDirectiveStamp` describe block in `src/tests/unit/render-remark-directives.test.ts`:

```ts
  it('drops an empty label on a title-less component', async () => {
    const html = await run(':::card[]{icon=flag}\nbody\n:::');
    expect(html).not.toContain('<p></p>');
  });
  it('drops a non-empty unclaimed label on a title-less component', async () => {
    const html = await run(':::card[Stray]\nbody\n:::');
    expect(html).not.toContain('Stray');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/render-remark-directives.test.ts -t "label on a title-less"`
Expected: FAIL. The unclaimed label paragraph renders (an empty `<p></p>` or `<p>Stray</p>`), since `card` has no `title` slot to claim it.

- [ ] **Step 3: Drop the unclaimed label**

In `src/lib/render/remark-directives.ts`, after the slot-marking `for` loop (the loop ending at line 93), filter out any directive-label child the component could not claim:

```ts
      // A directive [label] that the component has no `title` slot to claim would otherwise fall
      // through as body content and render as a stray paragraph. Drop it.
      if (!slotNames.has('title')) {
        node.children = node.children.filter((child) => !isDirectiveLabel(child)) as typeof node.children;
      }
```

Place this immediately after the `for (const child of node.children) { ... }` loop and before the `visit` callback returns. The `data.directiveLabel` flag that `isDirectiveLabel` reads targets only the directive label, so a genuine first body paragraph is never removed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/render-remark-directives.test.ts`
Expected: PASS (the two new cases plus every prior case in the file, including the icon and role cases from Task 2).

- [ ] **Step 5: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0. Then:

```bash
git add src/lib/render/remark-directives.ts src/tests/unit/render-remark-directives.test.ts
git commit -m "Drop an unclaimed directive label on a title-less component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Document the authoring rules and the changelog

**Files:**
- Modify: `docs/creating-a-cairn-site.md`
- Modify: `CHANGELOG.md` (repo root)
- Test: none (docs only)

- [ ] **Step 1: Add the render and component-authoring notes to the site guide**

Open `docs/creating-a-cairn-site.md` and find the section covering components, the render registry, or `createRenderer` (search for `defineRegistry`, `createRenderer`, `ComponentDef`, or "component"). Add this prose in the repo's voice (no em dashes, one idea per sentence, no "not X but Y" frames), placed where component authoring is explained:

```markdown
A component build reads only the attributes the component declares. Reading `ctx.attributes.x` for an
attribute the component never declared returns `undefined`, with no error. Declare every attribute a
build reads.

A component that sets `defaultIconByRole` must also declare a `type: 'icon'` attribute. The engine
resolves the icon from the author's value, falling back to the role default, and delivers it to the
build through that declared attribute, so `defineFields` plus `defaultIconByRole` is the single source.
A component with a role default but no icon attribute has no declared slot to carry the value, so the
default does not reach the build.

The `headRow(title, icon?)` helper builds the icon-plus-heading head a titled component shows. Pass the
title's slot children and an optional icon element, the way `cardShell` takes already-built body
content.

`createRenderer` forces `rel="noopener noreferrer"` on every `target="_blank"` anchor. Set the
`anchorRel` option to a different value to change it, or to `false` to disable the injection when a site
owns its own anchor hardening.

A component with no `title` slot must omit the `[]` label from its `insertTemplate`. The engine drops an
unclaimed label, so a stray `:::panel[]{...}` no longer leaves an empty paragraph, and a clean template
keeps the inserted markdown tidy.
```

- [ ] **Step 2: Add the changelog entry**

Open `CHANGELOG.md` at the repo root. Add a `0.24.0` entry above the `0.23.0` entry, matching the file's existing Keep-a-Changelog format:

```markdown
## 0.24.0

### Added
- `headRow(title, icon?)` builds the icon-plus-heading component head, exported beside `cardShell` and
  `iconSpan`.
- A `createRenderer` `anchorRel` option sets the `rel` value forced on `target="_blank"` anchors
  (default `'noopener noreferrer'`), or disables the injection when set to `false`.

### Changed
- A component's `defaultIconByRole` default now reaches the build through the declared `type: 'icon'`
  attribute (`ctx.attributes`), so a role default no longer needs a hardcoded fallback in the build. A
  component using `defaultIconByRole` must declare a `type: 'icon'` attribute.
- The engine drops an unclaimed directive `[label]` when a component has no `title` slot, so a stray
  `[]` no longer renders an empty paragraph.

### Removed
- The internal `data-icon` marker, which no build read. The resolved icon now travels on the declared
  attribute path.
```

- [ ] **Step 3: Verify the docs pass the prose guard**

Run: `prose-guard docs/creating-a-cairn-site.md && prose-guard CHANGELOG.md`
Expected: no blocking tells (em dashes, banned phrases/openers, structural patterns). An advisory anaphora or burstiness note in a file's pre-existing body does not gate; do not chase it. If a blocking tell trips on text you added, rewrite that sentence for human cadence.

- [ ] **Step 4: Commit**

```bash
git add docs/creating-a-cairn-site.md CHANGELOG.md
git commit -m "Document the icon, headRow, anchorRel, and label authoring rules

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Prove items 7 and 9 through the showcase

**Dispatch with `model: opus`.** This wires a new component and verifies the production build.

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (add an `alert` component)
- Modify: `examples/showcase/src/content/posts/2026-01-15-hello.md` (use the alert)
- Test: the showcase production build

- [ ] **Step 1: Add the `alert` component to the showcase registry**

In `examples/showcase/src/lib/cairn.config.ts`, extend the package import (line 3) to bring in the render helpers, and add a `glyph`/`ElementContent` import as needed. The file already imports `h` from `hastscript` and the `ElementContent` type from `hast`. Change line 3 to:

```ts
import { createRenderer, defineRegistry, defineFields, defineAdapter, cardShell, headRow, iconSpan, glyph } from '@glw907/cairn-cms';
```

After the `callout` definition and before `const registry = defineRegistry(...)`, add a `makeIcon` factory and the `alert` component. The `alert` uses `headRow` (item 7) and `defaultIconByRole` (item 9), and declares a `type: 'icon'` attribute so the role default reaches its build:

```ts
const makeIcon = (name: string, role?: string) => iconSpan(glyph(name, icons), role);

const alert: ComponentDef = {
  name: 'alert',
  label: 'Alert',
  description: 'A bordered note whose icon defaults from its role.',
  use: 'Flag a caution in the flow of a post.',
  defaultIconByRole: { caution: 'leaf' },
  build: (ctx) => {
    const name = typeof ctx.attributes.icon === 'string' ? ctx.attributes.icon : undefined;
    const role = typeof ctx.attributes.role === 'string' ? ctx.attributes.role : undefined;
    const icon = name ? makeIcon(name, role) : undefined;
    return cardShell(['alert', `alert-${role ?? 'note'}`], [
      headRow(ctx.slot('title'), icon),
      h('div', { className: ['alert-body'] }, ctx.slot('body')),
    ]);
  },
  attributes: [
    { key: 'role', label: 'Role', type: 'select', options: ['note', 'caution'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
};
```

Add `alert` to the registry component list: `const registry = defineRegistry({ components: [callout, alert] });`.

- [ ] **Step 2: Use the alert in a showcase post**

In `examples/showcase/src/content/posts/2026-01-15-hello.md`, add an alert with a role and no explicit icon, so the role default is what reaches the build. Append to the post body:

```markdown

:::alert{role=caution}
[Heads up]

This note proves the role default reaches the build.
:::
```

- [ ] **Step 3: Build the package and the showcase, and confirm the proof**

```bash
npm run package
cd examples/showcase && npm run build
grep -c 'class="summary"' .svelte-kit/output/prerendered/pages/index.html
ALERT=.svelte-kit/output/prerendered/pages/posts/hello.html
grep -o 'class="ec-head"' "$ALERT" | wc -l
grep -o 'class="ec-icon"' "$ALERT" | wc -l
cd ../..
```

Expected: both builds exit 0. The home `grep -c` still finds the post summaries (the post count is unchanged, since the alert was added to an existing post, not a new one). The hello post output contains `class="ec-head"` at least once (proving `headRow` rendered) and `class="ec-icon"` at least once (proving the `caution` role default `leaf` glyph reached the build through the declared attribute, item 9). If the prerendered post path differs, locate it with `find .svelte-kit/output/prerendered -name '*hello*'` and grep that file. If `ec-icon` is absent, the role default did not reach the build; recheck Task 2.

- [ ] **Step 4: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/content/posts/2026-01-15-hello.md
git commit -m "Wire a showcase alert proving headRow and the role-default icon

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Bump the version and run the full gate

**Files:**
- Modify: `package.json` (repo root, the `version` field)
- Test: the full gate plus a green showcase build

- [ ] **Step 1: Bump the version**

In the repo-root `package.json`, set:

```json
  "version": "0.24.0",
```

(It is currently `0.23.0`.)

- [ ] **Step 2: Run the full gate**

Run:
```bash
npm run check && npm test && npm run check:package
```
Expected: `npm run check` reports 0 errors and 0 warnings; `npm test` EXITS 0 across the unit, integration, and component projects; `check:package` exits 0. A passing assertion count is not enough; the `npm test` process must EXIT 0. If it reports all tests passing but exits non-zero, find the unhandled rejection before continuing.

- [ ] **Step 3: Confirm the showcase still builds green**

```bash
npm run package
cd examples/showcase && npm run build
cd ../..
```
Expected: both builds exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Bump version to 0.24.0

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Done criteria

- `headRow(title, icon?)` is exported and builds the `<div class="ec-head">[icon]<h2 class="card-title">{title}</h2></div>` shape.
- A `defaultIconByRole` role default reaches a build through the declared `type: 'icon'` attribute (`ctx.attributes`); the `dataIcon` marker is gone, and `grep -rn "dataIcon" src/` returns nothing.
- `createRenderer`'s `anchorRel` option sets a custom `rel` or disables the injection with `false`; the default preserves `noopener noreferrer`.
- The engine drops an unclaimed directive label on a title-less component, so a stray `[]` renders no empty paragraph.
- The site guide states the declared-attribute contract, the icon-attribute requirement, the `headRow` helper, the `anchorRel` option, and the no-`[]` template rule; the changelog records the `0.24.0` changes.
- The showcase production build is green, and the hello post renders `ec-head` and the `caution` role-default glyph.
- Version is `0.24.0`. The full gate is green (`npm run check` 0/0, `npm test` exit 0, `npm run check:package` exit 0), and the render-pipeline snapshot stayed byte-identical (no `-u`).

## Follow-ups (record in the post-mortem, do not do in this pass)

- A build-validation warning for a non-empty unclaimed label (this pass drops it silently).
- A configurable heading level on `headRow` (it is `<h2>` for now).
- `parseFeedDate` in `delivery/feeds.ts` is looser than `isCalendarDate` (carried from P2).

## Pass-end review gate (run after Task 7, before reporting done)

- `code-simplifier:code-simplifier` over the changed engine code.
- `svelte-reviewer` does not apply (no Svelte component logic changed; the editor form and preview are untouched).
- `daisyui-a11y-reviewer` does not apply (no markup or theme change in a Svelte component; the engine emits hast, covered by the render tests).
- `cloudflare-workers-reviewer` and `web-auth-security-reviewer` do not apply (no Worker, auth, session, cookie, or D1 code).
- A high-effort `/code-review` over the branch diff, with attention to the icon resolution edge cases (a component with no icon field, an author value plus a role, multiple `type: 'icon'` fields) and the snapshot fixture migration.
- Live `/admin` smoke does not apply (no `/admin` surface changed; the showcase runs `adapter-node`).
- Fold findings in, then update the plan post-mortem and `docs/STATUS.md` per the `cairn-pass` consolidation ritual.

---

## Post-mortem (executed 2026-06-03)

P3 executed subagent-driven on `main`, one `cairn-implementer` per task, Sonnet for the
mechanical tasks and Opus for the two judgment-heavy ones (Task 2's byte-identical snapshot
migration and Task 6's showcase build gate). Seven task commits `4a9cf55..7afb031`, then one
review-gate fold-in `c6ecdbc`. Local only, not pushed, not published. The minor bumps to
`0.24.0`.

### What was built

- **Task 1 (`4a9cf55`):** `headRow(title, icon?)` in `rehype-dispatch.ts`, exported from the
  package beside `cardShell`/`iconSpan`. It builds
  `<div class="ec-head">[icon]<h2 class="card-title">{title}</h2></div>`.
- **Task 2 (`6a76e14`, Opus):** the directive stamper now finds the declared `type: 'icon'`
  field, resolves the icon (author value, falling back to `defaultIconByRole`), and folds it into
  that field's `data-attr-<key>`. The dead `dataIcon` marker write is gone, dropped from
  `FIXED_MARKERS`, and the `strProp` doc comment no longer names it. `grep -rn "dataIcon" src/`
  is empty. The snapshot fixture migrated onto `ctx.attributes.icon` plus `headRow` and stayed
  byte-identical (no `-u`).
- **Task 3 (`06484e4`):** `rehypeAnchorRel(rel)` is parameterized, and `RendererOptions.anchorRel`
  (`string | false`) threads it. The default keeps `noopener noreferrer`; a string overrides; `false`
  skips the push.
- **Task 4 (`8684392`):** the stamper drops an unclaimed directive `[label]` when the component
  declares no `title` slot, so a stray `[]` no longer renders an empty paragraph. `isDirectiveLabel`
  matches only the mdast `directiveLabel`, so a genuine first body paragraph is never removed.
- **Task 5 (`715ae2c`, docs):** the authoring rules in `creating-a-cairn-site.md` (declare every
  attribute a build reads, the icon-attribute requirement, `headRow`, `anchorRel`, the no-`[]`
  template rule) and the `0.24.0` changelog entry.
- **Task 6 (`eda99e7`, Opus):** a showcase `alert` component using `headRow` + `defaultIconByRole`
  and a post that uses it with a role and no explicit icon. The production build proves items 7 and
  9: the hello post renders `class="ec-head"` once and `class="ec-icon"` once, with the `caution`
  role default `leaf` glyph reaching the build through the declared attribute.
- **Task 7 (`7afb031`):** the `0.24.0` bump and the full gate.

### Verification (evidence)

Gate at the fold-in tip (`c6ecdbc`), run first-hand: `npm run check` 779 files 0/0, `npm test`
110 files / 638 tests exit 0, `npm run check:package` exit 0. The render-pipeline snapshot stayed
byte-identical across the pass (no `-u`). The showcase production build exits 0; the home still
lists its post summaries and the hello post carries `ec-head` and the role-default `ec-icon` glyph.

### Review gate

The simplifier found nothing to change (the icon double-read looked load-bearing in isolation, so
it left it). `svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`,
`web-auth-security-reviewer`, and the live `/admin` smoke did not apply. A high-effort seven-angle
`/code-review` found one actionable defect, folded in as `c6ecdbc`: the icon-attribute branch wrote
`attrs[field.key] ?? icon`, so a blank `icon=""` was kept and defeated the resolved role default,
while a missing `icon` resolved it. The fix writes the already-resolved `icon` directly (it coerces
a blank value through the same empty-is-absent rule as the up-front read), so blank and missing
behave alike. That also collapsed the confusing double-read the simplification angle had flagged.
A regression test (`falls back to the role default when the author icon is blank`) locks it, and the
snapshot stayed byte-identical.

### Carried follow-ups (recorded, not done this pass)

- A component declaring `defaultIconByRole` with no `type: 'icon'` attribute drops the default
  silently. This is the documented contract (the settled item-8 decision was documentation, not a
  runtime warning), so it stays as-is. A `defineRegistry` guard that throws at config load is a
  possible future hardening that would not contradict that decision (a build is developer code).
- Multiple `type: 'icon'` fields on one component: the resolved default flows to the first declared
  icon field only (`find` picks the first). Acceptable as first-icon-field-wins; record as a known
  limitation if a component ever needs two.
- The icon-field `find` runs per directive node on every render. It could hoist to a
  `registry.iconField(name)` lookup beside `defaultIcon(name, role)`. Micro-cost (attribute lists are
  tiny), low priority.
- The unclaimed-label drop is a second pass over `node.children`, separate from the slot-marking
  loop. Folding the drop into that loop would express the claimed/unclaimed policy once. Defensible
  as-is; cosmetic.
- The `typeof ctx.attributes.x === 'string' ? x : undefined` narrowing recurs in every string-reading
  build, including the showcase (scaffolder seed). A small `strAttr(ctx, key)` context helper would
  remove the copy-paste from every future site. Good candidate for P4 (scaffolder) or a later DX touch.
- The three plan-listed follow-ups stand: a build-validation warning for a non-empty unclaimed label
  (dropped silently now), a configurable heading level on `headRow` (`<h2>` for now), and
  `parseFeedDate` being looser than `isCalendarDate` (carried from P2).
