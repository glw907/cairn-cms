# Islands (`@glw907/cairn-cms/islands`)

This subpath holds the client runtime for content islands: the seam that mounts a site's live Svelte
components over the static fallbacks the render pipeline emits. cairn is Svelte-only by design, so the
runtime mounts with Svelte's own `mount()` and `unmount()` directly, with no framework abstraction. A
site imports it dynamically and only when it registers at least one island, so a static site never
ships the runtime.

```ts
import { hydrateIslands } from '@glw907/cairn-cms/islands';
import type { IslandRegistry } from '@glw907/cairn-cms/islands';
```

Islands are opt-in. A directive component declares
[`hydrate`](./components.md#hydrate-and-the-island-boundary), the site registers the matching live
component on [`rendering.islands`](./core.md#renderingislands-adapter-member), and a root layout calls
`hydrateIslands` after every navigation. The TypeScript types in `src/lib/islands` are the source of
truth, and the export-coverage gate checks every name here against them.

---

## `hydrateIslands`

```ts
declare function hydrateIslands(islands: IslandRegistry, root?: ParentNode): void;
```

Mount each island in `root` over its server-rendered fallback. Call it from a root layout on
`afterNavigate`, so it runs on first load and after every client-side navigation:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { cairn } from '$lib/cairn.config';

  let { children } = $props();

  afterNavigate(async () => {
    const islands = cairn.rendering.islands;
    if (!islands || Object.keys(islands).length === 0) return;
    const { hydrateIslands } = await import('@glw907/cairn-cms/islands');
    hydrateIslands(islands);
  });
</script>

{@render children()}
```

The gate on a non-empty registry keeps the dynamic import out of a static site's bundle, so a site
with no islands ships none of this code.

`hydrateIslands` is idempotent across navigation. It tears down the previous pass before it runs,
unmounting live instances and disconnecting any pending observers, so a second call over the same DOM
mounts one instance per boundary rather than stacking duplicates. That teardown is why the call belongs
on `afterNavigate` rather than a one-time `onMount`.

`root` defaults to `document`. Pass a narrower `ParentNode` to scope the scan to one region.

### Eager and `'visible'` mounting

Each island carries the mounting mode the component declared with `hydrate`:

- A `hydrate: true` (eager) island mounts at once, in the call.
- A `hydrate: 'visible'` island defers to first intersection: `hydrateIslands` observes its boundary
  with an `IntersectionObserver` and mounts the component the first time the boundary scrolls into
  view, then stops observing.

### Error isolation

One bad island never breaks the page. `hydrateIslands` leaves the static fallback in place when a
boundary names a directive the registry has no entry for, when the prop payload fails to parse, or when
the component throws on mount. Each of those is caught and isolated, so the reader keeps the
server-rendered content and the other islands still mount.

---

## `IslandRegistry`

```ts
type IslandRegistry = Record<string, Component<Record<string, unknown>>>;
```

A site's island components, keyed by directive name. Each value is the live Svelte component
`hydrateIslands` mounts over the matching `hydrate` directive's static fallback. This is the type of the
adapter's [`rendering.islands`](./core.md#renderingislands-adapter-member) member, and the argument
`hydrateIslands` takes. The props a component receives are the directive's declared scalar attributes,
described in the boundary contract below.

---

## The island boundary

The render pipeline wraps a `hydrate` component's `build()` output in an island boundary, a single
`<div>` carrying inert `data-*` attributes:

```html
<div data-cairn-island="converter" data-cairn-props='{"from":"mi","to":"km","rate":1.609}'>
  <div class="island-converter-fallback"><p>1 mi = 1.609 km</p></div>
</div>
```

- `data-cairn-island` is the directive name. `hydrateIslands` looks it up in the registry to find the
  live component.
- `data-cairn-props` is the directive's declared scalar attributes, `JSON.stringify`-ed. A `number`
  field becomes a JSON number and a `boolean` field a JSON boolean; every other field stays the literal
  string the author wrote.
- `data-cairn-hydrate="visible"` is present only on a `'visible'` island, and marks it for deferred,
  intersection-driven mounting.

The boundary's only child is the component's `build()` output, the no-JS fallback. The boundary
attributes are inert, so they survive both the sanitize floor and the sink guard the pipeline runs over
`build()` output.

### Props are untrusted

The props in `data-cairn-props` are author-controlled and untrusted. They are
HTML-attribute-escaped on emit by the pipeline's stringify step and `JSON.parse`-d in a try/catch on
the client, which is safe against breakout only because the value never enters a script context. An
island component must treat every prop as untrusted: bind props to text only, and never pass a prop to
`{@html}`.

### The fallback is first paint

The fallback the boundary wraps is the page's first paint, and it stays the only content until the
runtime mounts (which, for a `'visible'` island, is not until the boundary scrolls into view, and never
at all without JavaScript). The mount replaces the fallback with the live component, so a fallback whose
size differs from the mounted component shifts the layout on mount. Make the fallback high-fidelity:
state the same content the live component starts with, at the same size, so the swap is invisible and
the no-JS reader sees real content rather than a placeholder.

### The editor preview shows the fallback

The edit page's preview frame is sandboxed (`sandbox=""`), so its scripts never run and the island
runtime never mounts there. The preview shows the static fallback, the same thing a no-JS reader sees.
Verify a live island on the deployed page, not in the preview.

---

## See also

- [`hydrate` on the components reference](./components.md#hydrate-and-the-island-boundary): the directive-side declaration.
- [`rendering.islands` on the core reference](./core.md#renderingislands-adapter-member): the adapter registration and the consistency check.
- [Add an island](../guides/add-an-island.md): the end-to-end recipe.
