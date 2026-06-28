# Contract v2 Phase 4b: Islands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in, progressively-enhanced interactivity to directive components: a `hydrate` directive emits a static fallback wrapped in an island boundary, and a small Svelte-only client runtime on a new `./islands` subpath mounts the site's live component over it.

**Architecture:** Additive on the settled `Promise<string>` render seam (4a). The engine emits the boundary in `rehypeDispatch` when a component declares `hydrate`; the boundary wraps `build()`'s no-JS fallback and carries the component's scalar attributes as JSON props. The site registers a live Svelte component per island name on `adapter.rendering.islands` and calls `hydrateIslands(islands)` from a root layout on `afterNavigate`. The runtime is Svelte-only (mounts with Svelte's own `mount()`/`unmount()`), with no framework-agnostic indirection.

**Tech Stack:** TypeScript, Svelte 5 (`mount`/`unmount`), unified/rehype (hast), Vitest (node unit + chromium browser component), Playwright e2e, `svelte-package`.

## Global Constraints

- **Svelte-only, Cloudflare-only.** cairn is deliberately opinionated. The island runtime mounts Svelte components with Svelte's `mount()`/`unmount()` directly. Do not add a framework-agnostic abstraction, a renderer interface, or any indirection to accommodate a non-Svelte universe.
- **Additive, non-breaking within 4b.** The render seam stays `render(...): Promise<string>` unchanged. `hydrate` and `rendering.islands` are optional; a site with no islands is byte-identical to today and never imports the runtime.
- **Class-driven fallbacks.** `build()`'s fallback hast passes through `rehypeSinkGuard` (strips inline `style` and `on*`), so every fallback must be class-driven, never inline-styled.
- **Props are untrusted, scalar-only.** Props are the directive's declared `fields.*` scalar attributes, `JSON.stringify`-ed into `data-cairn-props`, HTML-attribute-escaped on emit by `rehypeStringify`, and `JSON.parse`-d in a try/catch on the client. Safe against breakout only because the value never enters a script context. An island component must treat every prop as untrusted (never `{@html}` a prop).
- **No `$effect` in island components.** A browser component test mounting a component with an `$effect` reactivity loop hangs unbounded (engine-hardening lesson). Island components derive computed values with `$derived`, never `$effect`. Keep browser test runs monitored.
- **Version floor:** svelte `^5.56.3`, `@sveltejs/kit ^2.12` (unchanged). This phase ships within the held v2 window (0.69.0–0.75.0); the rollup release is deferred until the whole v2 series lands, per Geoff. Bump the held version per `check:version` (minor → 0.76.0).
- **Gate before done:** the targeted test for the task, then `npm run check` (svelte-check 0/0), then `npm test` (exit 0). The full pass-end gate (`check:comments`, the four doc gates, `check:reference`, `check:package`, `check:version`, reviewer fan-out, from-scratch consumer build + e2e) runs at pass close.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/render/registry.ts` (modify) | Add `hydrate?: boolean \| 'visible'` to `ComponentDef`. |
| `src/lib/render/rehype-dispatch.ts` (modify) | Emit the island boundary wrapping `build()` output when `def.hydrate`; serialize typed props. |
| `src/lib/islands/types.ts` (create) | `IslandRegistry` type (runtime-free, type-only Svelte import). |
| `src/lib/islands/index.ts` (create) | `hydrateIslands(islands, root?)` client runtime + reusable scan-and-mount core. The `./islands` subpath. |
| `src/lib/content/types.ts` (modify) | Add `islands?: IslandRegistry` to the `rendering` group. |
| `src/lib/content/adapter.ts` (modify) | `assertIslandsConsistent(rendering)`: every `hydrate` component has an island, every island has a `hydrate` component. |
| `package.json` (modify) | Add the `./islands` export subpath (types + default, no `svelte` condition; mirrors `./vite`). |
| `examples/showcase/src/lib/islands/Converter.svelte` (create) | The flagship live island component. |
| `examples/showcase/src/lib/cairn.config.ts` (modify) | The `converter` `defineComponent` (hydrate, class-driven fallback) + `rendering.islands`. |
| `examples/showcase/src/routes/+layout.svelte` (modify) | Call `hydrateIslands` on `afterNavigate`, dynamically importing `./islands` gated on a non-empty registry. |
| `examples/showcase/src/routes/(site)/styleguide/+page.server.ts` (modify) | Add a `:::converter` directive to the styleguide sample so a stable prerendered route renders the island. |
| `examples/showcase/e2e/islands.spec.ts` (create) | Fallback-without-JS, live-mount-with-JS, and post-navigation re-mount. |
| `src/tests/component/islands/Echo.svelte` (create) | Browser-test fixture component. |
| `src/tests/unit/render-rehype-dispatch.test.ts` (modify) | Boundary emission unit tests. |
| `src/tests/unit/content-adapter-islands.test.ts` (create) | Consistency-assertion unit tests. |
| `src/tests/component/islands-hydrate.test.ts` (create) | Runtime browser tests. |
| `docs/reference/islands.md` (create) | Reference page for the `./islands` subpath. |
| `docs/reference/components.md` + `docs/reference/core.md` (modify) | Document `hydrate` and `rendering.islands`. |
| `docs/guides/add-an-island.md` (create) | Task how-to. |
| `CHANGELOG.md` (modify) | The 4b entry. |

---

## Task 1: The `hydrate` field and boundary emission

The engine half: a `hydrate` component's build output is wrapped in an island boundary carrying its typed scalar props. Nested and top-level directives both get the boundary (the wrap happens in `transformNode`, the universal build site); the existing top-level `data-rise` ordinal lands on the wrapper, which is fine.

**Files:**
- Modify: `src/lib/render/registry.ts` (the `ComponentDef` interface, near line 50–105)
- Modify: `src/lib/render/rehype-dispatch.ts` (`transformNode`, near line 138; add `islandBoundary` + `serializeIslandProps` helpers)
- Test: `src/tests/unit/render-rehype-dispatch.test.ts`

**Interfaces:**
- Produces: `ComponentDef.hydrate?: boolean | 'visible'`. The boundary DOM contract: `<div data-cairn-island="<name>" data-cairn-props='<json>' [data-cairn-hydrate="visible"]>…fallback…</div>`. `data-cairn-props` is `JSON.stringify` of the component's declared attributes, with `number` fields coerced to JSON numbers and `boolean` fields to JSON booleans; all other fields stay strings.

- [ ] **Step 1: Add the `hydrate` field to `ComponentDef`.**

In `src/lib/render/registry.ts`, inside the `ComponentDef` interface (after the `build` field, near line 64), add:

```ts
  /**
   * Opt this directive into client hydration (phase 4b islands). `true` mounts the island eagerly on
   *  first load and after client-side navigation; `'visible'` defers the mount to first intersection.
   *  The engine wraps {@link ComponentDef.build}'s output in an island boundary, and the site registers
   *  the live Svelte component under the same name on `rendering.islands`. Absent leaves the directive a
   *  static, server-only component.
   */
  hydrate?: boolean | 'visible';
```

- [ ] **Step 2: Write the failing boundary test.**

In `src/tests/unit/render-rehype-dispatch.test.ts`, add a registry with a hydrate component and the assertions. Append inside the top-level `describe`:

```ts
  const islandReg = defineRegistry({
    components: [
      {
        name: 'converter',
        label: '',
        description: '',
        hydrate: true,
        attributes: {
          from: { type: 'text', label: 'From' } as never,
          rate: { type: 'number', label: 'Rate' } as never,
        },
        build: () => h('p', { className: ['fallback'] }, ['1 mi = 1.609 km']),
      },
      {
        name: 'tabs',
        label: '',
        description: '',
        hydrate: 'visible',
        attributes: { active: { type: 'text', label: 'Active' } as never },
        build: () => h('div', { className: ['fallback'] }, ['tab']),
      },
    ],
  });

  it('wraps a hydrate component build output in an island boundary with typed props', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'converter', dataAttrFrom: 'mi', dataAttrRate: '1.609' }, [])],
    } as Root;
    rehypeDispatch(islandReg)(tree);
    const boundary = tree.children[0] as Element;
    expect(boundary.tagName).toBe('div');
    expect(boundary.properties?.dataCairnIsland).toBe('converter');
    // number field coerced to a JSON number; text field stays a string
    expect(JSON.parse(boundary.properties?.dataCairnProps as string)).toEqual({ from: 'mi', rate: 1.609 });
    // the build() output is the boundary's only child (the no-JS fallback)
    const fallback = (boundary.children as Element[])[0];
    expect(fallback.properties?.className).toContain('fallback');
    // top-level entrance ordinal lands on the wrapper
    expect(boundary.properties?.dataRise).toBe('0');
    // an eager island carries no visible marker
    expect(boundary.properties?.dataCairnHydrate).toBeUndefined();
  });

  it("marks a 'visible' island with data-cairn-hydrate", () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'tabs', dataAttrActive: 'one' }, [])],
    } as Root;
    rehypeDispatch(islandReg)(tree);
    const boundary = tree.children[0] as Element;
    expect(boundary.properties?.dataCairnHydrate).toBe('visible');
  });

  it('leaves a non-hydrate component unwrapped', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['Title']), h('p', ['Body'])])],
    } as Root;
    rehypeDispatch(reg)(tree); // `reg` is the existing top-of-file card registry
    expect((tree.children[0] as Element).properties?.dataCairnIsland).toBeUndefined();
  });
```

- [ ] **Step 3: Run the test to verify it fails.**

Run: `npx vitest run src/tests/unit/render-rehype-dispatch.test.ts --project unit`
Expected: FAIL (boundary not emitted; `dataCairnIsland` undefined).

- [ ] **Step 4: Implement the boundary emission.**

In `src/lib/render/rehype-dispatch.ts`, import the `FieldDescriptor`-bearing `ComponentDef` (already imported) and add two helpers above `transformNode`:

```ts
// Serialize a hydrate component's declared attributes into the island prop payload. A `number` field is
// coerced from its stamped string to a JSON number here; a `boolean` already arrived as a real boolean
// from readAttributes (which coerces 'true'/'false' upstream), and every other field stays the literal
// string the author wrote. The result is JSON.stringify-ed into data-cairn-props and parsed on the client.
function serializeIslandProps(
  def: ComponentDef,
  attributes: Record<string, string | boolean>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const type = def.attributes?.[key]?.type;
    out[key] = type === 'number' && typeof value === 'string' ? Number(value) : value;
  }
  return out;
}

// Wrap a hydrate component's static fallback in its island boundary. The boundary carries the directive
// name and the JSON prop payload; a 'visible' island also carries data-cairn-hydrate="visible". The
// boundary attributes are inert data-* and survive both the sanitize floor (this runs after it) and the
// sink guard (which strips only style/on*). The fallback is build()'s no-JS, first-paint representation.
function islandBoundary(
  name: string,
  def: ComponentDef,
  attributes: Record<string, string | boolean>,
  fallback: Element,
): Element {
  const properties: Record<string, string> = {
    dataCairnIsland: name,
    dataCairnProps: JSON.stringify(serializeIslandProps(def, attributes)),
  };
  if (def.hydrate === 'visible') properties.dataCairnHydrate = 'visible';
  return { type: 'element', tagName: 'div', properties, children: [fallback] };
}
```

Then change the tail of `transformNode` (the `return def.build(ctx);` line) to:

```ts
  const built = def.build(ctx);
  return def.hydrate ? islandBoundary(name!, def, ctx.attributes, built) : built;
```

(`name` is non-null here: `transformNode` returns early when `def` is undefined, and `def` only exists when `name` matched.)

- [ ] **Step 5: Run the test to verify it passes.**

Run: `npx vitest run src/tests/unit/render-rehype-dispatch.test.ts --project unit`
Expected: PASS (all three new cases plus the existing ones).

- [ ] **Step 6: Add a full-pipeline assertion for an empty-body, attribute-only hydrate directive.**

The dispatch test above hand-builds the stamped node. Add one test that drives the real `createRenderer` over the directive *source*, so the empty-body, attribute-only container directive is proven to parse → stamp → dispatch → stringify into a boundary (the converter is the first slotless, empty-body directive; do not let the e2e be the first to exercise it). Append to `src/tests/unit/render-pipeline.test.ts` (it already imports `createRenderer`; mirror its existing `:::box` case):

```ts
it('emits an island boundary for an empty-body attribute-only hydrate directive', async () => {
  const registry = defineRegistry({
    components: [
      {
        name: 'converter',
        label: '',
        description: '',
        hydrate: true,
        attributes: { from: { type: 'text', label: 'From' } as never, rate: { type: 'number', label: 'Rate' } as never },
        build: () => h('p', { className: ['fallback'] }, ['1 mi = 1.609 km']),
      },
    ],
  });
  const { renderMarkdown } = createRenderer(registry);
  const html = await renderMarkdown(':::converter{from="mi" rate="1.609"}\n:::');
  expect(html).toContain('data-cairn-island="converter"');
  expect(html).toContain('class="fallback"');
  // the number field is a JSON number in the escaped prop payload
  expect(html).toMatch(/data-cairn-props="[^"]*&quot;rate&quot;:1\.609/);
});
```

(Confirm the existing imports in that file cover `defineRegistry` and `h`; add them if absent. The exact escaped-quote form of `data-cairn-props` depends on `rehypeStringify`; if the regex misses, assert `html.includes('data-cairn-island="converter"')` plus a decode of the attribute, but keep the number-coercion assertion.)

- [ ] **Step 7: Run the broader render suite to confirm no regression.**

Run: `npx vitest run src/tests/unit/render-pipeline-snapshot.test.ts src/tests/unit/render-sink-guard.test.ts src/tests/unit/render-pipeline.test.ts --project unit`
Expected: PASS (no existing component sets `hydrate`, so existing output is unchanged; the new pipeline case passes).

- [ ] **Step 8: Commit.**

```bash
git add src/lib/render/registry.ts src/lib/render/rehype-dispatch.ts src/tests/unit/render-rehype-dispatch.test.ts src/tests/unit/render-pipeline.test.ts
git commit -m "feat(render): emit island boundary for hydrate components"
```

---

## Task 2: The `islands` adapter field and consistency assertion

The adapter half: `rendering.islands` registers the live components, and `defineAdapter` fails closed when a `hydrate` component has no island or an island has no `hydrate` component. The `IslandRegistry` type lives in a runtime-free module so `content/types.ts` can import it without pulling Svelte's `mount` into the server graph.

**Files:**
- Create: `src/lib/islands/types.ts`
- Modify: `src/lib/content/types.ts` (the `rendering` block, near line 211–222)
- Modify: `src/lib/content/adapter.ts`
- Test: `src/tests/unit/content-adapter-islands.test.ts`

**Interfaces:**
- Consumes: `ComponentDef.hydrate` (Task 1), `ComponentRegistry.defs` (existing, `ComponentDef[]`).
- Produces: `IslandRegistry = Record<string, Component<Record<string, unknown>>>`; `CairnAdapter['rendering'].islands?: IslandRegistry`; `defineAdapter` throws on an inconsistent island registry.

- [ ] **Step 1: Create the `IslandRegistry` type.**

Create `src/lib/islands/types.ts`:

```ts
// cairn-cms islands (@glw907/cairn-cms/islands): the type contract shared by the adapter and the client
// runtime. Kept in its own runtime-free module so the adapter types can import it without pulling
// Svelte's mount() into the server graph.
import type { Component } from 'svelte';

/**
 * A site's island components, keyed by directive name. Each value is the live Svelte component
 *  {@link hydrateIslands} mounts over the matching `hydrate` directive's static fallback. The props a
 *  component receives are the directive's declared scalar attributes (see the island boundary contract).
 */
export type IslandRegistry = Record<string, Component<Record<string, unknown>>>;
```

- [ ] **Step 2: Add the `islands` field to the adapter `rendering` group.**

In `src/lib/content/types.ts`, add the import near the other render-subsystem imports (near line 10):

```ts
import type { IslandRegistry } from '../islands/types.js';
```

Then inside the `rendering` block (after `icons?: IconSet;`, near line 221), add:

```ts
    /**
     * The live Svelte components for hydrated directives, keyed by directive name (phase 4b islands).
     *  Every component whose {@link ComponentDef.hydrate} is set needs an entry here, and every entry
     *  needs a matching `hydrate` component; `defineAdapter` checks both. Absent leaves the site
     *  static, and the island client runtime is never imported.
     */
    islands?: IslandRegistry;
```

- [ ] **Step 3: Write the failing assertion test.**

Create `src/tests/unit/content-adapter-islands.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { CairnAdapter } from '../../lib/content/types.js';

// A minimal valid adapter the tests extend, with the render subsystem the island check reads.
function baseRendering(components: ReturnType<typeof defineRegistry>) {
  return {
    render: async ({ body }: { body: string }) => body,
    components,
  };
}

const liveStub = (() => null) as never; // a stand-in Svelte component for the registry value

function adapterWith(rendering: CairnAdapter['rendering']): CairnAdapter {
  return {
    content: {},
    backend: {} as never,
    email: {} as never,
    rendering,
  };
}

describe('defineAdapter island consistency', () => {
  it('throws when a hydrate component has no island entry', () => {
    const components = defineRegistry({
      components: [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith(baseRendering(components)))).toThrow(/poll/);
  });

  it('throws when an island entry has no hydrate component', () => {
    const components = defineRegistry({ components: [] });
    expect(() => defineAdapter(adapterWith({ ...baseRendering(components), islands: { ghost: liveStub } }))).toThrow(/ghost/);
  });

  it('accepts a matched hydrate component and island', () => {
    const components = defineRegistry({
      components: [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith({ ...baseRendering(components), islands: { poll: liveStub } }))).not.toThrow();
  });

  it('accepts a static-only adapter with no islands', () => {
    const components = defineRegistry({
      components: [{ name: 'card', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith(baseRendering(components)))).not.toThrow();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails.**

Run: `npx vitest run src/tests/unit/content-adapter-islands.test.ts --project unit`
Expected: FAIL (`defineAdapter` does not throw; it is a passthrough).

- [ ] **Step 5: Implement the assertion in `defineAdapter`.**

Replace `src/lib/content/adapter.ts` body with:

```ts
// cairn-cms: the adapter-authoring helper. A plain `const adapter: CairnAdapter = {...}` annotation
// widens each concept's schema type away and breaks typed reads. defineAdapter captures the adapter
// through a `const` type parameter, so each concept's concrete ConceptSchema<F> survives for the
// full-auto typed reads in createSiteIndexes, while still checking the adapter against the contract.
import type { CairnAdapter } from './types.js';

// Fail closed on an inconsistent island registry: a hydrate component with no live component, or a
// registered island with no hydrate component. Either is a wiring mistake the site author should see at
// build time, not a silent forever-fallback. Read-only over the rendering group; imports no runtime.
function assertIslandsConsistent(rendering: CairnAdapter['rendering']): void {
  const islands = rendering.islands ?? {};
  const hydrated = new Set(
    (rendering.components?.defs ?? []).filter((d) => d.hydrate).map((d) => d.name),
  );
  for (const name of hydrated) {
    if (!(name in islands)) {
      throw new Error(`cairn: component '${name}' declares hydrate but rendering.islands has no entry for it.`);
    }
  }
  for (const name of Object.keys(islands)) {
    if (!hydrated.has(name)) {
      throw new Error(`cairn: rendering.islands has '${name}' but no component declares hydrate for it.`);
    }
  }
}

/** Declare a site's adapter while preserving each concept's concrete schema type for typed reads. */
export function defineAdapter<const A extends CairnAdapter>(adapter: A): A {
  assertIslandsConsistent(adapter.rendering);
  return adapter;
}
```

- [ ] **Step 6: Run the test to verify it passes.**

Run: `npx vitest run src/tests/unit/content-adapter-islands.test.ts --project unit`
Expected: PASS (all four cases).

- [ ] **Step 7: Run `npm run check` to confirm the types resolve.**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/islands/types.ts src/lib/content/types.ts src/lib/content/adapter.ts src/tests/unit/content-adapter-islands.test.ts
git commit -m "feat(adapter): register islands and assert hydrate/island consistency"
```

---

## Task 3: The `./islands` client runtime

The Svelte-only client runtime: scan the DOM for boundaries, mount each registered component over its fallback, and manage the lifecycle across client-side navigation. The runtime is deliberately content-specific (it hardcodes the `[data-cairn-island]` selector and a module-level instance registry); a future develop-the-dashboard extension seam would reuse this *pattern* (parse props, clear, `mount()`), not import a shared function. Do not generalize it now: keep it focused, and do not let the future-seam idea drive a premature abstraction the Global Constraints forbid.

**Files:**
- Create: `src/lib/islands/index.ts`
- Create: `src/tests/component/islands/Echo.svelte` (browser-test fixture)
- Create: `src/tests/component/islands-hydrate.test.ts`
- Modify: `package.json` (exports)

**Interfaces:**
- Consumes: `IslandRegistry` (Task 2); the boundary DOM contract (Task 1).
- Produces: `hydrateIslands(islands: IslandRegistry, root?: ParentNode): void`. Mounts every eager island and observes every `'visible'` island; tears down the previous pass (unmount live instances, disconnect pending observers) before re-running, so it is safe to call on every navigation.

- [ ] **Step 1: Write the runtime.**

Create `src/lib/islands/index.ts`:

```ts
// cairn-cms islands (@glw907/cairn-cms/islands): the client runtime that mounts a site's live Svelte
// components over the static fallbacks the render pipeline emits. cairn is Svelte-only by design, so this
// mounts with Svelte's own mount()/unmount() directly, with no framework abstraction. A site imports this
// dynamically, gated on a non-empty registry, so a static site never ships it (zero cost when unused).
import { mount, unmount, type Component } from 'svelte';
import type { IslandRegistry } from './types.js';

export type { IslandRegistry } from './types.js';

// One mounted island: the boundary node, the Svelte instance, and the fallback children we cleared, kept
// so navigation can unmount cleanly. Module-level because a layout calls hydrateIslands once per navigation
// and the previous pass must be torn down before the next.
interface Mounted {
  instance: Record<string, unknown>;
}

let mounted: Mounted[] = [];
let observers: IntersectionObserver[] = [];

// Tear down the previous pass: unmount live instances and disconnect observers that never fired. Svelte's
// unmount returns a promise (outro); we do not await it, the DOM node is discarded on navigation anyway.
function teardown(): void {
  for (const o of observers) o.disconnect();
  observers = [];
  for (const m of mounted) {
    try {
      void unmount(m.instance);
    } catch {
      // a component that throws on teardown must not block the rest
    }
  }
  mounted = [];
}

// Mount one island over its boundary: parse props (try/catch — a malformed payload leaves the fallback),
// clear the fallback, mount, and on a mount failure restore the fallback so the reader still sees content.
function mountIsland(node: Element, Comp: Component<Record<string, unknown>>): void {
  let props: Record<string, unknown>;
  try {
    props = JSON.parse(node.getAttribute('data-cairn-props') ?? '{}') as Record<string, unknown>;
  } catch {
    return;
  }
  const fallback = [...node.childNodes];
  node.replaceChildren();
  try {
    const instance = mount(Comp, { target: node as HTMLElement, props });
    mounted.push({ instance });
  } catch {
    node.replaceChildren(...fallback);
  }
}

// Defer a 'visible' island to first intersection, then mount once and stop observing.
function observeIsland(node: Element, Comp: Component<Record<string, unknown>>): void {
  const observer = new IntersectionObserver((entries, self) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        self.disconnect();
        mountIsland(node, Comp);
      }
    }
  });
  observer.observe(node);
  observers.push(observer);
}

/**
 * Mount each island in `root` (default `document`) over its server-rendered fallback. Call it on every
 *  client-side navigation: it tears down the previous pass first, so it is idempotent and leak-free. An
 *  eager island (`hydrate: true`) mounts at once; a `'visible'` island mounts on first intersection. An
 *  unknown directive name, a malformed prop payload, or a component that throws leaves the static fallback
 *  in place, so one bad island never breaks the page.
 */
export function hydrateIslands(islands: IslandRegistry, root: ParentNode = document): void {
  teardown();
  for (const node of root.querySelectorAll('[data-cairn-island]')) {
    const name = node.getAttribute('data-cairn-island');
    const Comp = name ? islands[name] : undefined;
    if (!Comp) continue;
    if (node.getAttribute('data-cairn-hydrate') === 'visible') observeIsland(node, Comp);
    else mountIsland(node, Comp);
  }
}
```

- [ ] **Step 2: Create the browser-test fixture component.**

Create `src/tests/component/islands/Echo.svelte`:

```svelte
<script lang="ts">
  let { label = '' }: { label?: string } = $props();
</script>

<span data-testid="echo">{label}</span>
```

- [ ] **Step 3: Write the failing runtime test.**

Create `src/tests/component/islands-hydrate.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrateIslands } from '../../lib/islands/index.js';
import Echo from './islands/Echo.svelte';

// Build one island boundary in the document and return it. The fallback is a <span> so we can assert it is
// replaced by the mounted component.
function boundary(props: Record<string, unknown>, opts: { name?: string; visible?: boolean } = {}): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-cairn-island', opts.name ?? 'echo');
  el.setAttribute('data-cairn-props', JSON.stringify(props));
  if (opts.visible) el.setAttribute('data-cairn-hydrate', 'visible');
  el.innerHTML = '<span data-testid="fallback">fallback</span>';
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hydrateIslands', () => {
  it('mounts an eager island over its fallback', () => {
    boundary({ label: 'hello' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')).toBeNull();
    expect(document.querySelector('[data-testid="echo"]')?.textContent).toBe('hello');
  });

  it('leaves the fallback for an unknown island name', () => {
    boundary({ label: 'x' }, { name: 'mystery' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')?.textContent).toBe('fallback');
  });

  it('leaves the fallback when props are malformed', () => {
    const el = boundary({});
    el.setAttribute('data-cairn-props', '{not json');
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')?.textContent).toBe('fallback');
  });

  it("defers a 'visible' island until intersection", () => {
    // Capture the IntersectionObserver callback so the test controls when intersection fires.
    let trigger: (() => void) | undefined;
    const Real = window.IntersectionObserver;
    class FakeObserver {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(node: Element) {
        trigger = () => this.cb([{ isIntersecting: true, target: node } as IntersectionObserverEntry], this as never);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
    }
    window.IntersectionObserver = FakeObserver as never;
    try {
      boundary({ label: 'later' }, { visible: true });
      hydrateIslands({ echo: Echo });
      // not mounted yet
      expect(document.querySelector('[data-testid="echo"]')).toBeNull();
      trigger?.();
      expect(document.querySelector('[data-testid="echo"]')?.textContent).toBe('later');
    } finally {
      window.IntersectionObserver = Real;
    }
  });

  it('unmounts the previous pass before re-running (navigation)', () => {
    boundary({ label: 'first' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelectorAll('[data-testid="echo"]').length).toBe(1);
    // a second pass over the same DOM must not stack a second instance
    hydrateIslands({ echo: Echo });
    expect(document.querySelectorAll('[data-testid="echo"]').length).toBe(1);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails, then passes.**

Run: `npx vitest run src/tests/component/islands-hydrate.test.ts --project component`
Expected: after Step 1–3 the file compiles and the suite PASSES. If it fails first on a missing import, that is the expected red; the runtime from Step 1 turns it green. Keep this browser run monitored (a component test can hang on an `$effect` loop; `Echo` has none).

- [ ] **Step 5: Add the `./islands` export subpath.**

In `package.json`, add after the `./components/spellcheck-assets/...` entries (and before `./render`), mirroring the pure-TS `./vite` subpath (types + default, no `svelte` condition):

```json
    "./islands": {
      "types": "./dist/islands/index.d.ts",
      "default": "./dist/islands/index.js"
    },
```

- [ ] **Step 6: Verify packaging resolves the new subpath.**

Run: `npm run check:package`
Expected: PASS. If publint flags the missing `svelte` condition, it is advisory for a pure-TS subpath; only act if it errors. If attw reports an export problem, add the `svelte` condition pointing at the same `dist/islands/index.js` and re-run (the carry-forward says gate this empirically).

- [ ] **Step 7: Commit.**

```bash
git add src/lib/islands/index.ts src/tests/component/islands src/tests/component/islands-hydrate.test.ts package.json
git commit -m "feat(islands): add the ./islands client runtime"
```

---

## Task 4: The showcase converter island and layout wiring

Prove the whole path end to end in the showcase: a `hydrate` component with a class-driven fallback, a live Svelte component, the adapter registration, and the gated runtime wiring on a stable prerendered route.

**Files:**
- Create: `examples/showcase/src/lib/islands/Converter.svelte`
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Modify: `examples/showcase/src/routes/+layout.svelte`
- Modify: `examples/showcase/src/routes/(site)/styleguide/+page.server.ts`

**Interfaces:**
- Consumes: `hydrateIslands` (Task 3), `defineComponent`/`fields` (existing), the `:::` directive grammar (existing), `afterNavigate` from `$app/navigation`.
- Produces: a rendered `:::converter` island at `/styleguide` whose fallback reads `1 <from> = <rate> <to>` and whose live component is an interactive two-way converter.

- [ ] **Step 1: Write the live component.**

Create `examples/showcase/src/lib/islands/Converter.svelte`:

```svelte
<!--
@component
Showcase island: a live two-way unit converter mounted over its static fallback by the cairn islands
runtime. Props are the `:::converter` directive's scalar attributes; the engine coerces the `rate` number
field, so it arrives as a number. Uses `$derived` for the converted value (never `$effect`), so it cannot
loop. Every prop is author-controlled and untrusted, so they only ever reach text bindings, never `{@html}`.
-->
<script lang="ts">
  let { from = '', to = '', rate = 1 }: { from?: string; to?: string; rate?: number } = $props();
  let amount = $state(1);
  const converted = $derived(Math.round(amount * rate * 1000) / 1000);
</script>

<div class="island-converter" data-testid="converter-live">
  <label>
    {from}
    <input type="number" bind:value={amount} data-testid="converter-input" />
  </label>
  <span class="equals">=</span>
  <output data-testid="converter-output">{converted} {to}</output>
</div>
```

- [ ] **Step 2: Declare the `converter` component and register the island.**

In `examples/showcase/src/lib/cairn.config.ts`:

Add the import near the top (with the other `$lib` imports):

```ts
import Converter from '$lib/islands/Converter.svelte';
```

Add the component definition near the other `defineComponent` calls (before `const registry = defineRegistry(...)`):

```ts
// A hydrate (island) component: attribute-only, so its static fallback states the conversion and the live
// component (Converter.svelte) adds the interactive input. The fallback is class-driven (no inline style),
// because rehypeSinkGuard strips style/on* from build() output.
const converter = defineComponent({
  name: 'converter',
  label: 'Unit converter',
  description: 'A live two-way unit converter.',
  hydrate: true,
  insertTemplate: ':::converter{from="mi" to="km" rate="1.609"}\n:::',
  attributes: {
    from: fields.text({ label: 'From unit', required: true }),
    to: fields.text({ label: 'To unit', required: true }),
    rate: fields.number({ label: 'Rate', required: true }),
  },
  build: (ctx) =>
    h('div', { className: ['island-converter-fallback'] }, [
      h('p', [`1 ${strAttr(ctx, 'from') ?? ''} = ${strAttr(ctx, 'rate') ?? ''} ${strAttr(ctx, 'to') ?? ''}`]),
    ]),
});
```

Ensure `h` and `strAttr` are imported. `strAttr` comes from `@glw907/cairn-cms/render`; `h` from `hastscript`. Add to the existing import block if absent:

```ts
import { h } from 'hastscript';
import { strAttr } from '@glw907/cairn-cms/render';
```

Add `converter` to the registry:

```ts
const registry = defineRegistry({ components: [callout, alert, converter] });
```

Register the island in the `rendering` group (after `components: registry,` / `icons,`):

```ts
    islands: { converter: Converter },
```

- [ ] **Step 3: Wire the runtime in the root layout.**

Replace `examples/showcase/src/routes/+layout.svelte` with:

```svelte
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { cairn } from '$lib/cairn.config';

  let { children } = $props();

  // Mount content islands after every navigation (first load and SPA navigations both fire afterNavigate).
  // The runtime is imported dynamically and only when the site registers at least one island, so a static
  // site never ships the island client code (zero cost when unused).
  afterNavigate(async () => {
    const islands = cairn.rendering.islands;
    if (!islands || Object.keys(islands).length === 0) return;
    const { hydrateIslands } = await import('@glw907/cairn-cms/islands');
    hydrateIslands(islands);
  });
</script>

{@render children()}
```

- [ ] **Step 4: Render the island on the styleguide route.**

In `examples/showcase/src/routes/(site)/styleguide/+page.server.ts`, find the inline markdown sample string and append a converter section to it (keep the existing content; add at the end of the sample). Use a top-level three-colon container directive with an empty body (the converter is attribute-only and reads no slots):

```md

## Islands

:::converter{from="mi" to="km" rate="1.609"}
:::
```

Three colons is correct at the top level (it matches the `:::box` form the engine test `src/tests/unit/render-pipeline.test.ts` already exercises). Do not use a four-colon fence; that depth is only for nesting a directive inside another directive, which the converter never does. Task 1's added pipeline assertion (below) and Task 4 Step 6's prerender grep both exercise this empty-body, attribute-only directive through the full parse, so the e2e is not the first thing to hit it.

- [ ] **Step 4b: Confirm the styleguide is reachable by an in-app link (for the SPA-navigation e2e).**

The re-mount e2e (Task 5) needs a real client-side navigation to `/styleguide`, which requires an in-app `<a>` link the test can click. Check the site chrome nav (the `(site)` layout's header/nav component) for a `/styleguide` link:

Run: `grep -rn 'styleguide' examples/showcase/src/routes examples/showcase/src/lib --include=*.svelte`
Expected: a `<a href="/styleguide">` in the site nav. If absent, add one to the `(site)` header nav component so the styleguide is reachable in-app (a one-line `<a>`); the e2e clicks it rather than `goto`-ing.

- [ ] **Step 5: Build the library and the showcase to confirm the wiring compiles.**

Run: `npm run package && npm --prefix examples/showcase run build`
Expected: both succeed. The styleguide prerenders with the `data-cairn-island="converter"` boundary and its fallback in the HTML.

- [ ] **Step 6: Confirm the boundary is in the prerendered output.**

Run: `grep -r 'data-cairn-island="converter"' examples/showcase/.svelte-kit/output/prerendered 2>/dev/null || grep -rl 'data-cairn-island' examples/showcase/build 2>/dev/null`
Expected: at least one match (the prerendered styleguide page).

- [ ] **Step 7: Commit.**

```bash
git add examples/showcase/src/lib/islands/Converter.svelte examples/showcase/src/lib/cairn.config.ts examples/showcase/src/routes/+layout.svelte "examples/showcase/src/routes/(site)/styleguide/+page.server.ts"
git commit -m "feat(showcase): add the converter island and wire the runtime"
```

---

## Task 5: The island e2e

Pin the three properties that matter on a real page: the fallback is real content without JavaScript, the live island mounts and is interactive with JavaScript, and it re-mounts after a client-side navigation.

**Files:**
- Create: `examples/showcase/e2e/islands.spec.ts`

**Interfaces:**
- Consumes: the `/styleguide` route rendering the converter (Task 4); the `data-testid`s on `Converter.svelte` (`converter-live`, `converter-input`, `converter-output`).

- [ ] **Step 1: Write the e2e spec.**

Create `examples/showcase/e2e/islands.spec.ts`. Mirror the structure of an existing spec (e.g. `examples/showcase/e2e/golden-path.spec.ts`) for the import and config:

```ts
import { test, expect } from '@playwright/test';

test.describe('content islands', () => {
  test('renders the static fallback without JavaScript', async ({ browser }) => {
    // A no-JS context: the island boundary must still carry real content (the build() fallback).
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/styleguide');
    await expect(page.locator('.island-converter-fallback')).toContainText('1 mi = 1.609 km');
    // The live component never mounts without JS.
    await expect(page.getByTestId('converter-live')).toHaveCount(0);
    await context.close();
  });

  test('mounts the live island and converts interactively', async ({ page }) => {
    await page.goto('/styleguide');
    const live = page.getByTestId('converter-live');
    await expect(live).toBeVisible();
    // the fallback was replaced
    await expect(page.locator('.island-converter-fallback')).toHaveCount(0);
    await page.getByTestId('converter-input').fill('10');
    await expect(page.getByTestId('converter-output')).toContainText('16.09 km');
  });

  test('re-mounts after a client-side navigation', async ({ page }) => {
    // This must be a real in-app (SPA) navigation, not page.goto (a hard load tears down the whole JS
    // context and never exercises hydrateIslands' teardown/re-run path, which is the property under test).
    await page.goto('/');
    await page.getByRole('link', { name: 'Styleguide' }).click();
    await expect(page.getByTestId('converter-live')).toBeVisible();
    // navigate away and back, in-app both ways, so afterNavigate fires a second time over a fresh DOM
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Styleguide' }).click();
    // exactly one live island, not a stacked duplicate from the second hydrate pass (the teardown works)
    await expect(page.getByTestId('converter-live')).toHaveCount(1);
    await page.getByTestId('converter-input').fill('2');
    await expect(page.getByTestId('converter-output')).toContainText('3.218 km');
  });
});
```

Match the link names/roles to the showcase's actual site nav (confirmed in Task 4 Step 4b). `golden-path.spec.ts:12-16` is the in-app navigation idiom to mirror: land with `goto`, then `locator(...).click()`. If the site nav has no "Home" link, navigate back with a different in-app link and adjust; the invariant is that both hops are client-side clicks, never `goto`.

- [ ] **Step 2: Run the e2e.**

Run: `npm --prefix examples/showcase run test:e2e -- islands` (or the repo's e2e command; check `examples/showcase/package.json` scripts — likely `test:e2e` running `playwright test`).
Expected: 3 passing tests. The e2e harness builds the library and the showcase first per the existing config.

- [ ] **Step 3: Run the full e2e suite to confirm no regression.**

Run: `npm --prefix examples/showcase run test:e2e`
Expected: the existing 39 tests plus the 3 new ones pass.

- [ ] **Step 4: Commit.**

```bash
git add examples/showcase/e2e/islands.spec.ts
git commit -m "test(showcase): e2e the converter island fallback, mount, and re-mount"
```

---

## Task 6: Documentation

Islands are a public-API change, so they are not done until the reference matches. Add the `./islands` reference page, document `hydrate` and `rendering.islands` on their existing pages, add a guide, and record the changelog entry.

**Files:**
- Create: `docs/reference/islands.md`
- Modify: `docs/reference/components.md` (the `hydrate` field on `ComponentDef`/`defineComponent`)
- Modify: `docs/reference/core.md` (the `rendering.islands` adapter field, beside the render seam)
- Create: `docs/guides/add-an-island.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write the `./islands` reference page.**

Create `docs/reference/islands.md` following the Google developer-docs style and the shape of the other reference pages (read `docs/reference/vite.md` and `docs/reference/render.md` for the house pattern). Document: the subpath `@glw907/cairn-cms/islands`; `hydrateIslands(islands, root?)` with its parameters, its idempotent-per-navigation contract, and the eager-vs-`'visible'` behavior; the `IslandRegistry` type; the island boundary DOM contract (`data-cairn-island`, `data-cairn-props`, `data-cairn-hydrate`); the props trust boundary (scalar attributes, escaped JSON, untrusted on the client); and the mount-and-replace cost (the fallback is first paint, a visible swap and possible layout shift make fallback fidelity load-bearing). State that the preview shows the fallback (the iframe is `sandbox=""`), so islands are verified on the deployed page.

- [ ] **Step 2: Document `hydrate` on the components reference page.**

In `docs/reference/components.md`, add `hydrate?: boolean | 'visible'` to the `ComponentDef`/`defineComponent` field documentation: what it does, that `true` is eager and `'visible'` defers to intersection, that the `build()` output becomes the no-JS fallback (so it must be class-driven and high-fidelity), and that the live component is registered on `rendering.islands` under the same name. Cross-link `docs/reference/islands.md`.

- [ ] **Step 3: Document `rendering.islands` on the core reference page.**

In `docs/reference/core.md` (which documents the adapter and the render seam), add `rendering.islands?: IslandRegistry` beside the render-seam documentation: the keyed-by-directive-name contract, that `defineAdapter` fails closed on a `hydrate`/island mismatch, and that an absent registry keeps the site static and never imports the runtime. Cross-link `docs/reference/islands.md`.

- [ ] **Step 4: Write the guide.**

Create `docs/guides/add-an-island.md` (Google style, task how-to, mirror an existing guide's shape): the end-to-end recipe — declare a `hydrate` component with a class-driven `build()` fallback, write the live Svelte component (scalar props, `$derived` not `$effect`, treat props as untrusted), register it on `rendering.islands`, and call `hydrateIslands` from a root layout on `afterNavigate` gated on a non-empty registry. Use the converter as the worked example.

- [ ] **Step 5: Add the changelog entry.**

In `CHANGELOG.md`, under the held/unreleased v2 window, add an entry for islands: the `hydrate` field on `ComponentDef`, the `rendering.islands` adapter field, the `./islands` subpath and `hydrateIslands`, the boundary contract, and the consumer note (a site adds islands by registering components and wiring `hydrateIslands`; no change is required of a static site).

- [ ] **Step 6: Run the documentation gates.**

Run: `npm run check:reference && npm run check:package`
Expected: PASS. `check:reference` confirms every new export (`hydrateIslands`, `IslandRegistry`) is documented; fix any gap it names.

- [ ] **Step 7: Commit.**

```bash
git add docs/reference/islands.md docs/reference/components.md docs/reference/core.md docs/guides/add-an-island.md CHANGELOG.md
git commit -m "docs(islands): reference, guide, and changelog for phase 4b"
```

---

## Pass-end ritual (after Task 6, run via cairn-pass)

- [ ] `code-simplifier` over the changed engine and runtime code; apply refinements, re-run the gate.
- [ ] Bump the held version per `check:version` (minor → 0.76.0); sync the showcase `package-lock.json` to the new `file:../..` version (the 4a lesson: a library version bump drifts the showcase lockfile, failing CI `npm ci`).
- [ ] Full gate: `npm run check` (0/0), `npm test` (exit 0), `npm run check:comments`, the four doc gates, `check:reference`, `check:package`, `check:version`.
- [ ] Reviewer fan-out (parallel): `svelte-reviewer` (the Converter component and the layout wiring), `daisyui-a11y-reviewer` (the island markup and fallback), `web-auth-security-reviewer` (the prop trust boundary: `data-cairn-props` escaping and `JSON.parse`), `cloudflare-workers-reviewer` (the dynamic-import gating and SSR safety). Fold findings.
- [ ] From-scratch consumer build (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`) plus the full Playwright e2e, both green.
- [ ] Update `docs/STATUS.md`: phase 4b done, the whole Contract v2 series complete, the held window 0.69.0–0.76.0 ready for the one rollup release (Geoff's call on cutting it). Remove islands from `ROADMAP.md` live tiers. Append the post-mortem to this plan.
- [ ] Merge `contract-v2-islands` to `main` and push. Do not cut the release until Geoff confirms the rollup.

---

## Self-review

**Spec coverage** (against the design spec's Islands section, as amended): `hydrate?: boolean | 'visible'` — Task 1. Boundary emission with fallback — Task 1. Typed scalar props in `data-cairn-props` — Task 1. `rendering.islands` registry — Task 2. Consistency assertion — Task 2 (an addition the spec implies via "doctor/build warns"; implemented as a build-time throw). `./islands` subpath + `hydrateIslands` + mount-and-replace + `mount()`/`unmount()` — Task 3. Navigation lifecycle (`afterNavigate`, teardown) — Task 3 + Task 4. Error isolation (try/catch on parse and mount) — Task 3. `'visible'` IntersectionObserver — Task 3. Zero-cost-when-unused gating — Task 4. Class-driven fallback through the sink guard — Task 4 (`build()` uses `className`, no inline style). Converter flagship — Task 4. Preview-shows-fallback — documented in Task 6 (no code: the preview already renders the string, and `sandbox=""` blocks the runtime). Reusable mount primitive for the future dashboard seam — Task 3 (the internal `mountIsland`/scan structure). e2e — Task 5. Docs — Task 6.

**Placeholder scan:** none. Every code step carries the actual code. The two soft spots flagged inline for the implementer to confirm against the live code (the directive fence depth on the styleguide, and whether `page.goto` exercises the SPA path) are verification instructions with a concrete fallback, not missing content.

**Type consistency:** `IslandRegistry = Record<string, Component<Record<string, unknown>>>` is defined once (Task 2, `src/lib/islands/types.ts`), imported by `content/types.ts` (Task 2) and re-exported by `islands/index.ts` (Task 3). `hydrateIslands(islands: IslandRegistry, root?: ParentNode)` is consistent between Task 3 (definition) and Task 4 (call). The boundary attribute names `data-cairn-island` / `data-cairn-props` / `data-cairn-hydrate` are consistent across Task 1 (emit), Task 3 (read), and Task 5 (assert). `serializeIslandProps`'s number coercion (Task 1) matches the Converter's `rate: number` prop (Task 4).

---

## Post-mortem (2026-06-28)

**Shipped as `0.9.0`** (the renumbered Contract v2 rollup), merged to `main`. The held window
(`0.69.0`–`0.76.0`, never published) was renumbered and consolidated into one published `0.9.0` release, the
first of the pre-1.0 `0.9.x` line. Last published was `0.68.0`, so the public crosses the whole v2 contract
in one jump; the eight held CHANGELOG entries collapsed into one `0.9.0` entry preserving every "Consumers
must" step.

**Built.** The islands layer exactly to plan: `hydrate?: boolean | 'visible'` on `ComponentDef`, the island
boundary emitted in `rehypeDispatch` (typed scalar props in `data-cairn-props`, the `data-cairn-hydrate`
marker for `'visible'`), `rendering.islands` with a fail-closed `assertIslandsConsistent` in `defineAdapter`,
and the Svelte-only `hydrateIslands` runtime on a new `./islands` subpath (mount-and-replace, per-island
error isolation, idempotent teardown across navigation). The showcase ships the converter flagship, wired
through `afterNavigate` gated on a non-empty registry, rendered on `/styleguide`.

**Verified (evidence).** `npm run check` 1211 files 0/0; `npm test` 2724 passed (257 files), exit 0;
`check:comments`, `check:reference` (islands documented), `check:package` (the `./islands` subpath resolves
on all four conditions, no `svelte` condition needed), `check:version` OK (minor → `0.9.0`); the
from-scratch consumer build (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install,
build) plus the 42-test Playwright e2e (3 new island tests: no-JS fallback, live mount, in-app re-mount).
`code-simplifier` (one refinement, the single-field wrapper) and a four-lens reviewer fan-out (Svelte,
auth/trust, a11y, plus the plan's adversarial pass) all folded.

**Execution.** A `Workflow` ran the six plan tasks as sequential `cairn-implementer` dispatches plus a
full-gate verify phase; the main loop then verified the gate independently, ran `code-simplifier` and the
reviewer fan-out, folded the findings, and handled the renumber and release. The implementers correctly
resolved the plan's inline "confirm against live code" notes (added the missing `/styleguide` nav link,
adapted the e2e back-hop to the actual "Writing" link and a primary-nav scope, switched `append` to
`appendChild` under NodeNext).

**Durable lessons.**
1. The adversarial-review-folded plan held up under workflow execution: the two MAJOR fixes (in-app SPA
   navigation in the re-mount e2e, the three-colon empty-body fence plus a pipeline assertion) were exactly
   the spots an unmonitored implementer would otherwise have gotten subtly wrong.
2. A reviewer fan-out with no blockers still earns its keep: the a11y review turned the converter into a
   real exemplar (stable input `aria-label`, a cleared-input `NaN` guard, an explicit `aria-live` output),
   which matters because the showcase is the scaffolder template. `unmount(instance, { outro: false })` makes
   teardown deterministic, and the prop-sink contract moved from a component comment to first-class doc
   placement.
3. Chase a warning to ground before attributing it: the `derived_inert` console warning surfaced during this
   pass but the Svelte reviewer pinned it to pre-existing `CairnMediaLibrary` test teardown, not islands.
4. The held-window-renumber is clean when the window was never published: the public sees `0.68.0 → 0.9.0`,
   the granular per-phase history stays in STATUS and the post-mortems, and `check:version` computes the jump
   as a single marked minor.
