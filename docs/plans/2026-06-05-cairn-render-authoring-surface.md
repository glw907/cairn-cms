# Render-authoring surface Implementation Plan (DX-completeness pass A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (one `cairn-implementer` per task) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run on `main` directly (same as the engine-hardening series: an internal surface change gated by check/test, no worktree).

**Goal:** carve a public `@glw907/cairn-cms/render` authoring subpath holding the component-authoring toolkit, add the render-authoring ergonomics the P3 pass carried forward, and drop `rehypeDispatch` from the public surface.

**Architecture:** the authoring helpers (`iconSpan`, `cardShell`, `headRow`, `isElement`, plus a new `strAttr`) move behind a curated `src/lib/render/authoring.ts` entry exposed as `./render`, and leave the root barrel. The ergonomics land in their source modules: `strAttr` and a configurable `headRow` level in `render/rehype-dispatch.ts`, and a `registry.iconField(name)` hoist plus a `defineRegistry` icon guard in `render/registry.ts`. No behavior changes for valid input; the render-pipeline snapshot stays byte-identical.

**Tech Stack:** TypeScript, hast/hastscript, vitest, the svelte-check and package gates (`npm run check`, `npm test`, `npm run check:reference`, `npm run check:package`).

**Design spec:** `docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md`.

---

## Conventions for this plan

**The gate per task.** The code tasks clear the full gate: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0. The docs task clears `npm run check:package` plus `prose-guard --hook` on the changed prose.

**Test-first.** Each code task writes the failing test, confirms it fails for the right reason, then makes it pass. Do not weaken a test to pass.

**Snapshot byte-identical.** The ergonomics are additive or behavior-preserving, and `headRow` keeps its default heading level, so `src/tests/unit/render-pipeline-snapshot.test.ts` stays byte-identical across the pass. Never run it with `-u`. A snapshot change means something shifted; investigate.

**`npm test` must exit 0.** A passing assertion count is not enough; an unhandled rejection can leave tests green while the process exits 1. Treat a non-zero exit as failure.

**Prose.** Changelog and doc prose follow the writing-voice standard (no em dashes, one idea per sentence, no banned openers). `prose-guard --hook <file>` gates the changed `.md` files (exit 0 = clean). Advisory sweep tells are non-blocking.

**Models.** Task 3 (the registry hoist and the icon guard), Task 4 (the new `/render` entry and packaging), and Task 5 (the root-barrel removal, the high-blast-radius relocation) carry the judgment, so dispatch them `model: opus`. Tasks 1, 2, 6, and 7 fit the Sonnet default.

---

## Task 1: The `strAttr` authoring helper

**Model:** Sonnet (a small pure helper).

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts`
- Modify: `src/tests/unit/render-rehype-dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/render-rehype-dispatch.test.ts` (it already imports from `../../lib/render/rehype-dispatch.js`; add `strAttr` to that import, and add `h` from `hastscript` if not present):

```ts
import { strAttr } from '../../lib/render/rehype-dispatch.js';
import type { ComponentContext } from '../../lib/render/registry.js';

function ctxWith(attributes: Record<string, string | boolean>): ComponentContext {
  return { attributes, slot: () => [], items: () => [], node: { type: 'element', tagName: 'div', properties: {}, children: [] } };
}

describe('strAttr', () => {
  it('returns a string attribute value', () => {
    expect(strAttr(ctxWith({ icon: 'leaf' }), 'icon')).toBe('leaf');
  });
  it('returns undefined for a boolean attribute', () => {
    expect(strAttr(ctxWith({ wide: true }), 'wide')).toBeUndefined();
  });
  it('returns undefined for an absent attribute', () => {
    expect(strAttr(ctxWith({}), 'icon')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- src/tests/unit/render-rehype-dispatch.test.ts`
Expected: FAIL, `strAttr` is not exported yet.

- [ ] **Step 3: Implement `strAttr`**

In `src/lib/render/rehype-dispatch.ts`, add after `isElement` (the file already imports `ComponentContext` as a type from `./registry.js`):

```ts
/** Read a declared string attribute off the component context, returning undefined for a boolean or
 *  absent value. Replaces the `typeof ctx.attributes[key] === 'string'` narrowing a build repeats. */
export function strAttr(ctx: ComponentContext, key: string): string | undefined {
  const value = ctx.attributes[key];
  return typeof value === 'string' ? value : undefined;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/tests/unit/render-rehype-dispatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green. `strAttr` is not on any public barrel yet (Task 4 adds it to `/render`), so the reference and package gates are unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/lib/render/rehype-dispatch.ts src/tests/unit/render-rehype-dispatch.test.ts
git commit -m "$(cat <<'EOF'
Add strAttr: read a string attribute off the component context

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Commit only those two files. Do not touch the untracked `.claude/` directory.

---

## Task 2: A configurable `headRow` heading level

**Model:** Sonnet (one optional parameter, default preserves behavior).

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts`
- Modify: `src/tests/unit/render-rehype-dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/render-rehype-dispatch.test.ts` (add `headRow` to the `rehype-dispatch.js` import and `h` from `hastscript` if not already imported):

```ts
import { headRow } from '../../lib/render/rehype-dispatch.js';
import { h } from 'hastscript';

describe('headRow heading level', () => {
  it('defaults to an h2', () => {
    const row = headRow([{ type: 'text', value: 'Title' }]);
    const heading = row.children.find((c) => c.type === 'element');
    expect((heading as { tagName: string }).tagName).toBe('h2');
  });
  it('uses the given level', () => {
    const row = headRow([{ type: 'text', value: 'Title' }], undefined, 3);
    const heading = row.children.find((c) => c.type === 'element');
    expect((heading as { tagName: string }).tagName).toBe('h3');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- src/tests/unit/render-rehype-dispatch.test.ts`
Expected: FAIL on the `h3` case (the signature takes no level yet; the call with `3` is a type error or the tag stays `h2`).

- [ ] **Step 3: Add the `level` parameter**

In `src/lib/render/rehype-dispatch.ts`, change `headRow` to take an optional level defaulting to `2`:

```ts
/** Card head row: `<div class="ec-head">[icon]<hN class="card-title">{title}</hN></div>`.
 *  Pass the title's inline children, an optional pre-built icon element, and an optional heading
 *  level (default 2). This factors the icon-plus-heading head that a titled component build would
 *  otherwise rebuild by hand (the shape the removed `splitHead` produced). */
export function headRow(title: ElementContent[], icon?: Element, level: number = 2): Element {
  const children: ElementContent[] = [];
  if (icon) children.push(icon);
  children.push(h(`h${level}`, { className: ['card-title'] }, title));
  return h('div', { className: ['ec-head'] }, children);
}
```

- [ ] **Step 4: Run the test, then confirm the snapshot is byte-identical**

```bash
npm test -- src/tests/unit/render-rehype-dispatch.test.ts
npm test -- src/tests/unit/render-pipeline-snapshot.test.ts
```

Expected: the unit test PASSES, and the snapshot PASSES byte-identical (the default level keeps `h2`). Do not run with `-u`.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/render/rehype-dispatch.ts src/tests/unit/render-rehype-dispatch.test.ts
git commit -m "$(cat <<'EOF'
Add a configurable headRow heading level, default h2

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The `registry.iconField` hoist and the `defineRegistry` icon guard

**Model:** Opus (registry behavior plus the guard edges; the icon-field lookup feeds the directive stamp).

**Files:**
- Modify: `src/lib/render/registry.ts`
- Modify: `src/lib/render/remark-directives.ts`
- Modify: `src/tests/unit/render-registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/unit/render-registry.test.ts` (it already imports `defineRegistry`; confirm the import and add what the cases need):

```ts
describe('registry.iconField', () => {
  it('returns the first declared icon field (first-wins)', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'a', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: [
            { key: 'one', label: 'One', type: 'icon' },
            { key: 'two', label: 'Two', type: 'icon' },
          ],
        },
      ],
    });
    expect(reg.iconField('a')?.key).toBe('one');
  });
  it('returns undefined when no attribute is an icon field', () => {
    const reg = defineRegistry({
      components: [
        { name: 'b', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }), attributes: [{ key: 'x', label: 'X', type: 'text' }] },
      ],
    });
    expect(reg.iconField('b')).toBeUndefined();
  });
});

describe('defineRegistry icon guard', () => {
  it('throws when a component sets defaultIconByRole but declares no icon attribute', () => {
    expect(() =>
      defineRegistry({
        components: [
          { name: 'c', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }), defaultIconByRole: { caution: 'leaf' }, attributes: [{ key: 'role', label: 'Role', type: 'select', options: ['caution'] }] },
        ],
      }),
    ).toThrow('cairn: component "c" sets defaultIconByRole but declares no type:\'icon\' attribute');
  });
  it('accepts a component that declares both defaultIconByRole and an icon attribute', () => {
    expect(() =>
      defineRegistry({
        components: [
          { name: 'd', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }), defaultIconByRole: { caution: 'leaf' }, attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }] },
        ],
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- src/tests/unit/render-registry.test.ts`
Expected: the `iconField` cases FAIL (no such method) and the guard `throws` case FAILS (no guard yet). The both-declared case passes already.

- [ ] **Step 3: Add `iconField` to the registry and the guard to `defineRegistry`**

In `src/lib/render/registry.ts`, add `iconField` to the `ComponentRegistry` interface (after `defaultIcon`):

```ts
  defaultIcon(name: string, role?: string): string | undefined;
  /** The component's first `type:'icon'` attribute, or undefined when it declares none. */
  iconField(name: string): AttributeField | undefined;
```

Then rewrite `defineRegistry` to add the guard and the method:

```ts
export function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry {
  for (const c of components) {
    if (c.defaultIconByRole && Object.keys(c.defaultIconByRole).length > 0) {
      const hasIconField = c.attributes?.some((field) => field.type === 'icon') ?? false;
      if (!hasIconField) {
        throw new Error(
          `cairn: component "${c.name}" sets defaultIconByRole but declares no type:'icon' attribute, so the default icon can never render`,
        );
      }
    }
  }
  const byName = new Map(components.map((c) => [c.name, c]));
  return {
    defs: components,
    names: components.map((c) => c.name),
    get: (name) => byName.get(name),
    defaultIcon: (name, role) => (role ? byName.get(name)?.defaultIconByRole?.[role] : undefined),
    iconField: (name) => byName.get(name)?.attributes?.find((field) => field.type === 'icon'),
  };
}
```

- [ ] **Step 4: Route the directive stamp through `registry.iconField`**

In `src/lib/render/remark-directives.ts`, replace the inline find (currently `const iconField = def?.attributes?.find((field) => field.type === 'icon');`) with the registry method:

```ts
      const iconField = registry.iconField(node.name);
```

The rest of the block (`iconKey`, the `icon` resolution, the attribute loop) is unchanged. `def` is still used below for the attribute loop, so leave its lookup in place.

- [ ] **Step 5: Run the tests, then confirm the snapshot is byte-identical**

```bash
npm test -- src/tests/unit/render-registry.test.ts
npm test -- src/tests/unit/render-pipeline-snapshot.test.ts
```

Expected: the registry tests PASS, and the snapshot PASSES byte-identical (the hoist is behavior-preserving, first-wins matches the old `.find`). Do not run with `-u`.

- [ ] **Step 6: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green. The showcase `alert` (Task 6) declares both `defaultIconByRole` and an icon attribute, so the guard does not affect it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/render/registry.ts src/lib/render/remark-directives.ts src/tests/unit/render-registry.test.ts
git commit -m "$(cat <<'EOF'
Hoist iconField onto the registry and guard a default-icon-without-field

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create the `/render` authoring subpath (additive)

**Model:** Opus (the public surface carve and the packaging correctness).

**Files:**
- Create: `src/lib/render/authoring.ts`
- Create: `docs/reference/render.md`
- Modify: `package.json`
- Modify: `scripts/reference-coverage.mjs`
- Modify: `docs/reference/README.md`

This task adds the new subpath while the symbols still live on the root barrel too. Task 5 removes them from root.

- [ ] **Step 1: Create the curated entry**

Create `src/lib/render/authoring.ts`:

```ts
// cairn-cms: the component-authoring toolkit (@glw907/cairn-cms/render). A site authoring components
// through build(ctx) reaches for these hast builders and the string-attribute reader. Curated on
// purpose: the internal hast helpers (strProp, markFirstList, dataAttrProp) stay internal, and
// rehypeDispatch is deliberately omitted (createRenderer is the one public render pipeline).
export { iconSpan, cardShell, headRow, isElement, strAttr } from './rehype-dispatch.js';
export type { MakeIcon } from './rehype-dispatch.js';
export type { ComponentContext } from './registry.js';
```

- [ ] **Step 2: Add the `./render` export to `package.json`**

In `package.json` `exports`, add a `./render` entry mirroring the other subpaths (place it after `./components`):

```json
    "./render": {
      "types": "./dist/render/authoring.d.ts",
      "svelte": "./dist/render/authoring.js",
      "default": "./dist/render/authoring.js"
    },
```

- [ ] **Step 3: Add the reference page**

Create `docs/reference/render.md`. The coverage gate requires a whole-word mention of every exported name (`iconSpan`, `cardShell`, `headRow`, `isElement`, `strAttr`, `MakeIcon`, `ComponentContext`):

```markdown
# Render authoring (`@glw907/cairn-cms/render`)

The component-authoring toolkit a site reaches for inside a component's `build(ctx)`. These helpers
build hast and read the component context; the render pipeline itself stays behind `createRenderer`
(on the package root), which is the one public, safe-by-default render path.

```ts
import { cardShell, headRow, iconSpan, strAttr } from '@glw907/cairn-cms/render';
```

## Hast builders

- `cardShell(classes, body)` wraps body content in a `<section><div class="card-body">` shell.
- `headRow(title, icon?, level?)` builds the icon-plus-heading head row; the heading level defaults to 2.
- `iconSpan(glyphEl, role?)` wraps a built glyph element in an `ec-icon` span.

## Context and tree helpers

- `strAttr(ctx, key)` reads a declared string attribute off the component context, returning
  `undefined` for a boolean or absent value.
- `isElement(node)` narrows a hast node to an `Element`.

## Types

- `ComponentContext` is the structured input a `build` receives (attributes, slots, the stamped node).
- `MakeIcon` is a site's icon factory signature, `(name, role?) => Element`.
```

- [ ] **Step 4: Register the subpath in the coverage gate and the index**

In `scripts/reference-coverage.mjs`, add to the `CONFIG` array (after the `/components` line):

```js
  { subpath: '/render', dts: 'dist/render/authoring.d.ts', page: 'docs/reference/render.md' },
```

In `docs/reference/README.md`, add an index line after the Components line:

```markdown
- [Render authoring (`/render`)](./render.md): the component-authoring toolkit for a component `build()`.
```

- [ ] **Step 5: Run the reference and package gates**

```bash
npm run check:reference
npm run check:package
```

Expected: both exit 0. `check:reference` builds `dist` (so `dist/render/authoring.d.ts` exists), enumerates the `/render` exports, and finds each named on `render.md`. `check:package` validates the new `./render` stanza resolves.

- [ ] **Step 6: Run the full gate**

```bash
npm run check
npm test
```

Expected: green. The symbols are still on root too at this point, so nothing else changed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/render/authoring.ts docs/reference/render.md package.json scripts/reference-coverage.mjs docs/reference/README.md
git commit -m "$(cat <<'EOF'
Add the /render authoring subpath

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Drop the relocated helpers from the root barrel

**Model:** Opus (the high-blast-radius public-surface removal, including `rehypeDispatch`).

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/tests/unit/render-exports.test.ts`

- [ ] **Step 1: Rewrite the root-surface test for the new shape**

Replace the body of `src/tests/unit/render-exports.test.ts` with the assertions for the relocated surface. The render-authoring helpers leave root, `rehypeDispatch` leaves the public surface entirely, and the helpers appear on `/render`:

```ts
import { describe, it, expect } from 'vitest';
import { createRenderer, defineRegistry, glyph, remarkDirectiveStamp } from '../../lib/index.js';
import * as engine from '../../lib/index.js';
import * as authoring from '../../lib/render/authoring.js';

describe('engine entry render surface', () => {
  it('keeps the core render entry points on the root barrel', () => {
    for (const fn of [createRenderer, defineRegistry, glyph, remarkDirectiveStamp]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('no longer exports the authoring helpers from the root entry', () => {
    for (const name of ['iconSpan', 'cardShell', 'headRow', 'rehypeDispatch']) {
      expect(name in engine).toBe(false);
    }
  });

  it('still hides the internal hast helpers from the root entry', () => {
    for (const name of ['isElement', 'strProp', 'markFirstList']) {
      expect(name in engine).toBe(false);
    }
  });

  it('exposes the authoring toolkit from /render', () => {
    for (const fn of [authoring.iconSpan, authoring.cardShell, authoring.headRow, authoring.isElement, authoring.strAttr]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('omits rehypeDispatch from /render but keeps it reachable from its module', async () => {
    expect('rehypeDispatch' in authoring).toBe(false);
    const dispatch = await import('../../lib/render/rehype-dispatch.js');
    expect(typeof dispatch.rehypeDispatch).toBe('function');
  });

  it('the root createRenderer composes a working pipeline', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi')).toContain('<h1');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- src/tests/unit/render-exports.test.ts`
Expected: FAIL. The "no longer exports the authoring helpers" case fails because they are still on root.

- [ ] **Step 3: Remove the relocated exports from the root barrel**

In `src/lib/index.ts`, delete the two render-authoring export lines (currently the `rehypeDispatch, iconSpan, cardShell, headRow` re-export and the `MakeIcon` type re-export), and add a comment recording the deliberate omissions:

```ts
export { remarkDirectiveStamp } from './render/remark-directives.js';
// The component-authoring helpers (iconSpan, cardShell, headRow, isElement, strAttr) live on the
// @glw907/cairn-cms/render subpath, not the root barrel. rehypeDispatch is deliberately not public:
// createRenderer is the one public render pipeline, so the safe plugin ordering is the only public
// path. See docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md.
export { createRenderer } from './render/pipeline.js';
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/tests/unit/render-exports.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green. `core.md` keeps a now-extra mention of the relocated names, which the coverage gate allows (it flags missing names, never extra). `npm run check` must report 0 errors, confirming no internal code imported the relocated helpers from the root barrel.

- [ ] **Step 6: Commit**

```bash
git add src/lib/index.ts src/tests/unit/render-exports.test.ts
git commit -m "$(cat <<'EOF'
Drop the authoring helpers and rehypeDispatch from the root barrel

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Migrate the showcase to `/render` and prove `strAttr`

**Model:** Sonnet (a mechanical consumer migration with a real build as the proof).

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts`

- [ ] **Step 1: Build the package so the showcase resolves `/render`**

Run: `npm run package`
Expected: exit 0, `dist/render/authoring.js` and `.d.ts` present. The showcase consumes the package through its relative path, so it resolves `@glw907/cairn-cms/render` against the built `dist`.

- [ ] **Step 2: Move the authoring imports and adopt `strAttr`**

In `examples/showcase/src/lib/cairn.config.ts`, split the import so the authoring helpers come from `/render`. Change the line that imports `cardShell, headRow, iconSpan` from `@glw907/cairn-cms` so those three (and `strAttr`) import from the subpath, and leave the rest on the root import:

```ts
import { createRenderer, defineRegistry, defineFields, defineAdapter, glyph, parseSiteConfig } from '@glw907/cairn-cms';
import { cardShell, headRow, iconSpan, strAttr } from '@glw907/cairn-cms/render';
```

Then use `strAttr` in the `alert` build to replace the hand-rolled narrowing:

```ts
  build: (ctx) => {
    const name = strAttr(ctx, 'icon');
    const role = strAttr(ctx, 'role');
    const icon = name ? makeIcon(name, role) : undefined;
    return cardShell(['alert', `alert-${role ?? 'note'}`], [
      headRow(ctx.slot('title'), icon),
      h('div', { className: ['alert-body'] }, ctx.slot('body')),
    ]);
  },
```

- [ ] **Step 3: Run the showcase check and build**

```bash
cd examples/showcase && npm run check && npm run build && cd ../..
```

Expected: the showcase `check` reports 0 errors in `src/`, and `build` exits 0. The prerendered output still renders the `alert` with its head and role-default icon. (The root `npm run check` does not cover the showcase, so this carries its own check and build, per the DX-A pattern.)

- [ ] **Step 4: Run the library gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts
git commit -m "$(cat <<'EOF'
Migrate the showcase to /render and adopt strAttr

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Documentation, changelog, and version bump

**Model:** Sonnet (mechanical doc and version changes).

**Files:**
- Modify: `docs/upgrading.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Add the upgrading line**

Read `docs/upgrading.md` to match its format, then add a line for this rename under the appropriate version heading: the render-authoring helpers (`iconSpan`, `cardShell`, `headRow`, `isElement`, `strAttr`) now import from `@glw907/cairn-cms/render`, and `rehypeDispatch` is no longer exported (use `createRenderer`).

- [ ] **Step 2: Add the changelog entry**

Read the top of `CHANGELOG.md` to match its house style, then add a `0.30.0` entry above the current latest. It carries a `Consumers must:` line because the render-authoring imports moved. Adapt the formatting to the file:

```markdown
## 0.30.0

Carved a `@glw907/cairn-cms/render` authoring subpath for the component-authoring toolkit. `iconSpan`,
`cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr` now live there, so the root
barrel stays lean and a component `build()` imports its helpers from one obvious place. Added
`strAttr(ctx, key)` (a string-attribute reader), a configurable `headRow` heading level (default 2), a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute. Dropped `rehypeDispatch` from the public surface;
`createRenderer` is the one public render pipeline.

Consumers must: import `iconSpan`, `cardShell`, `headRow`, `isElement`, and `strAttr` from
`@glw907/cairn-cms/render` instead of the package root, and replace any direct `rehypeDispatch` use with
`createRenderer`.
```

- [ ] **Step 3: Bump the version**

In `package.json`, bump the minor. This pass runs after the engine-hardening series shipped `0.29.0`, so change `"version": "0.29.0"` to `"version": "0.30.0"`. Verify the current value first; if it is not `0.29.0` (for example the series has not published yet), bump to the next minor above the current value instead and note it.

- [ ] **Step 4: Verify and commit**

```bash
prose-guard --hook docs/upgrading.md
prose-guard --hook CHANGELOG.md
npm run check:package
```

Expected: both `prose-guard --hook` calls exit 0, `check:package` exits 0.

```bash
git add docs/upgrading.md CHANGELOG.md package.json
git commit -m "$(cat <<'EOF'
Bump 0.30.0 and document the /render authoring subpath

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task ordering

Sequence: **1, 2, 3, 4, 5, 6, 7.** Tasks 1 through 3 add the ergonomics in their source modules (so `strAttr` exists before the `/render` entry re-exports it, and `headRow` has its final signature). Task 4 adds the `/render` subpath additively. Task 5 removes the relocated helpers from root and drops `rehypeDispatch`. Task 6 migrates the showcase and proves `strAttr` through a real build. Task 7 records the rename in the docs, the changelog, and the version. All seven run on `main`.

## Phase-end ritual

After all tasks commit, before declaring the pass done:

- [ ] `npm run check` 0/0, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0 on `main`.
- [ ] The render-pipeline snapshot stayed byte-identical across the pass (no `-u`).
- [ ] The showcase `check` and `build` exit 0 (Task 6).
- [ ] `CHANGELOG.md` carries the `0.30.0` entry with its `Consumers must:` line, `docs/upgrading.md` carries the rename, and `package.json` reads `0.30.0` (or the reconciled next minor).
- [ ] Run the code-simplifier over the changed `src/lib/render` files before the final review (per the repo git convention).
- [ ] Review gate: a high-effort `/code-review` with attention to the curated export set and the `defineRegistry` guard edges. `svelte-reviewer` applies only if a `.svelte` file changed (none does here); the Worker, auth, and a11y reviewers and the live `/admin` smoke do not apply.
- [ ] Append the post-mortem to this plan and update `docs/STATUS.md`: render-authoring surface (DX sweep pass A) landed as `0.30.0`; the next DX-sweep step is Pass B (tooling and CI robustness), then Pass C, then the gallery, then P4.
- [ ] Refresh the `cairn-dx-pass-sequence` memory (pass A landed, the `/render` carve shipped) and note the `/render` subpath in the surface record.

## Self-review notes (already applied)

- Every spec move maps to a task: `strAttr` (Task 1), the configurable `headRow` level (Task 2), the `registry.iconField` hoist plus the `defineRegistry` guard plus first-wins (Task 3), the `/render` curated entry with packaging and the reference page (Task 4), the root-barrel removal and the `rehypeDispatch` drop (Task 5), the showcase migration (Task 6), and the docs, changelog, and version (Task 7).
- Type and name consistency across tasks: `strAttr(ctx, key)` is defined in Task 1, re-exported by `authoring.ts` in Task 4, and consumed in the showcase in Task 6; `headRow(title, icon?, level?)` is defined in Task 2 and documented in Task 4; `iconField(name)` is added to the `ComponentRegistry` interface and `defineRegistry` in Task 3 and named on `render.md` is not required (it stays on the root registry surface, not `/render`).
- The `/render` entry is additive in Task 4 and the root removal is Task 5, so the gate is green at every commit (the symbols resolve from at least one path throughout).
- `rehypeDispatch` stays importable from its module for the pipeline and the tests; only the public barrel re-export is removed, and the omission carries a recorded comment plus the spec reasoning.
- The snapshot stays byte-identical because the ergonomics are additive or behavior-preserving and `headRow` keeps its default level; the plan checks the snapshot explicitly in Tasks 2 and 3.
- The version step accounts for the forward dependency on the engine-hardening series shipping `0.29.0`, with a reconciliation note if the baseline differs.

---

## Post-mortem (landed 2026-06-06 on `main`, `0.30.0`, unpublished)

DX-sweep Pass A executed as written, subagent-driven, one `cairn-implementer` per task on `main` directly
(no worktree). Tasks 3, 4, 5 ran on Opus (the registry guard, the public surface carve, the high-blast
root-barrel removal); Tasks 1, 2, 6, 7 on Sonnet. Seven task commits `e219335..48b83d8`, a simplifier
commit `7ee7c7b`, and a review fold-in `c69079e`.

**What shipped.** A public `@glw907/cairn-cms/render` authoring subpath (`src/lib/render/authoring.ts`)
holds `iconSpan`, `cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr(ctx, key)`, with a
reference page (`docs/reference/render.md`) wired into the coverage gate. `headRow` gained an optional
heading level (default 2). The registry gained `iconField(name)` (first-wins, matching the old inline
`.find`), and `defineRegistry` now throws when a component sets `defaultIconByRole` with no `type:'icon'`
attribute. The directive stamp routes its icon lookup through `registry.iconField`. The root barrel dropped
the five authoring helpers and `rehypeDispatch` (createRenderer is the one public render pipeline). The
showcase migrated to `/render` and adopted `strAttr` in its `alert` build. The minor bumps `0.30.0` with a
`Consumers must:` line.

**Gate evidence at the tip.** Engine gate at `7ee7c7b` (the last source commit), run first-hand: `npm run
check` 793 files 0/0, `npm test` 118 files / 720 tests exit 0, `check:reference` and `check:package` exit 0.
The render-pipeline snapshot stayed byte-identical across the pass (every snapshot run was without `-u`; the
ergonomics are additive or behavior-preserving and `headRow` keeps its default level). The showcase carried
its own gate (Task 6): `check` 0 errors in `src/` and a production build exit 0, the `alert` rendering
byte-identical (`class="alert alert-caution"`, the `ec-head` row, the role-default leaf glyph). Docs gates at
the fold-in tip `c69079e`: `check:docs`, `check:reference`, `check:package` all exit 0, prose-guard clean on
both changed docs. The showcase `check` reports the known node_modules + `vite.config.ts` symlink-dev
artifact (a second physical SvelteKit toolchain), no error in showcase `src/`; the production build is the
acceptance proof.

**Simplifier.** Factored the duplicated "first `type:'icon'` attribute" find in `registry.ts` onto one
private `findIconField(def)` helper used by both the construction guard and the `iconField` method
(`7ee7c7b`). The other four changed regions were already clean.

**Review gate (high-effort `/code-review`, 3 finder angles).** The packaging trace was clean end to end (the
`./render` stanza matches its siblings, the build emits `dist/render/authoring.{js,d.ts}`, every re-export
name resolves, the reference page covers every export, the showcase imports are tight). The line-by-line and
removed-behavior angles confirmed `strAttr` matches the old `typeof === 'string'` narrowing, `iconField`
first-wins matches the old `.find`, the `field === iconField` identity comparison in `remark-directives.ts`
still holds (same `def` instance via `byName`), no internal importer broke (grep of `src/` and
`examples/showcase/src/`), and no test assertion lost real coverage (the `cardShell`/`iconSpan` positive
checks moved to the `/render` barrel test). One finding folded in as `c69079e`: the `defineRegistry` icon
guard was filed under "additive (non-breaking)" in the upgrade guide, but it converts a previously silent
no-op into a hard throw at construction (a component with `defaultIconByRole` and no icon attribute never
rendered its default icon before, since the default only stamps through an icon attribute). The fold-in moved
it out of the non-breaking heading and states the conditional consumer action in both the changelog and the
upgrade guide. The Worker, auth, a11y, and Svelte reviewers and the live `/admin` smoke did not apply (no
such surface changed).

**Carry-forwards.** (1) `headRow(title, icon?, level)` takes `level` as a plain `number` with no
range validation, so an explicit `headRow(title, icon, 0)` or `7` emits an invalid `<h0>`/`<h7>` (the
`level: number = 2` default fires only for `undefined`, not for an explicit `0`). No current caller passes
anything but the default, so this is a latent robustness gap on a developer-facing authoring helper rather
than an active bug; clamp or validate to 1..6 in a future render touch if a caller ever computes the level.
(2) The `defineRegistry` icon guard enforces that an icon field exists, not that every role in
`defaultIconByRole` is a reachable `role` option, so a default keyed to a role no author can select still
never renders; the guard's message is accurate for the no-field case it does catch. (3) The guard iterates
every entry in `components` while `byName` is last-wins, so on a duplicate component name the guard can throw
on a shadowed def the engine would never dispatch; duplicate names are already an authoring error.
