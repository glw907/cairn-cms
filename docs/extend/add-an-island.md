# Add an island

A markdown component on a cairn site renders on the server as the static markup its `build()` function returns, and with no `hydrate` declaration it adds no client JavaScript to the public page. Declaring `hydrate` makes the component an island. The render pipeline wraps the `build()` output in an island boundary that carries the directive name and a JSON payload of the component's props. In the browser, a live Svelte component registered under the same name mounts over that boundary. The `build()` output stays on the page as the fallback. It is the first paint before the mount and the only content a reader without JavaScript sees.

The task is to make one such component interactive on the public site while its fallback still serves readers without JavaScript. On a site built by hand, the adapter starts with no `rendering.islands` member, so every piece of the wiring is new. A scaffolded site already registers a `banner` island, and its tree already carries the registry module, the adapter's `rendering.islands` member, the root load's `hasIslands` flag, and the root layout's `hydrateIslands` call. Adding a second island there takes the live component, one registry entry beside `banner`, and the `hydrate` declaration. On a hand-built site, you write the live component, register the island, wire the root layout, and then verify the island on the public page.

The steps assume familiarity with Svelte components and runes, SvelteKit layouts and server load functions, `afterNavigate`, dynamic imports, and the site's adapter module. They also assume a markdown component the site already declares with `defineComponent`. [Write a markdown component](write-a-markdown-component.md) covers declaring the component, its attributes, and the `build()` function whose output becomes the fallback. The [islands reference](../reference/islands.md) covers the runtime's full contract and the boundary markup.

## Before you begin

The steps assume that the following are in place:

- A markdown component declared with `defineComponent`, in the registry the adapter passes as `rendering.components`. Its `build()` output becomes the island's fallback. [Write a markdown component](write-a-markdown-component.md) describes the declaration.
- An entry whose body uses the component's directive, for checking the island on its public page.

A scaffolded site already carries the registry module `src/theme/islands/registry.ts`, the adapter's `rendering.islands`, the root load's `hasIslands`, and the root layout's `hydrateIslands` call. On a scaffolded site, follow these steps instead:

1. In `src/theme/islands/`, write the live component, as [Write the live component](#write-the-live-component) describes.
2. In `src/theme/islands/registry.ts`, import the live component and add its entry beside `banner`.
3. In the component's declaration, set `hydrate` to `true` or `'visible'`.
4. Verify the island, as [Verify the island on the public page](#verify-the-island-on-the-public-page) describes.

On a hand-built site, start with the live component.

## Write the live component

The live component is an ordinary Svelte component. The runtime mounts it with Svelte's `mount()`, passing the directive's declared attributes as its props.

To write the live component, follow these steps:

1. In a directory for the site's islands, such as `src/lib/islands/`, create the component file, such as `Converter.svelte`. A scaffolded site keeps its island files in `src/theme/islands/`.
2. In the component's script, declare a prop with a default value for each attribute the directive declares.

   A `number` attribute arrives as a JSON number and a `boolean` attribute as a JSON boolean. Any other attribute arrives as the literal string the author wrote. When the entry leaves an attribute unset, the component receives no prop for it, and the prop's default applies. The icon attribute is the exception. When the author leaves it unset or blank and the directive's `role` maps to a default glyph key, it arrives as that key.

3. In the component's markup, render each prop as text.

The following component is typed from a `converter` directive's `from`, `to`, and `rate` attributes, and it renders each prop as text:

```svelte
<!-- src/lib/islands/Converter.svelte -->
<script lang="ts">
  interface Props {
    from?: string;
    to?: string;
    rate?: number;
  }

  let { from = '', to = '', rate = 1 }: Props = $props();
  let amount = $state(1);
</script>

<p>
  <input type="number" bind:value={amount} aria-label={`Amount in ${from}`} />
  {from} = {amount * rate} {to}
</p>
```

> **Caution:** Never route a prop into `{@html}`, an `href` or `src`, or an inline `style`. An author writes each attribute value, and the runtime passes the parsed values to the component unchanged, with no sanitizing or URL filtering. A component that routes a prop into one of those sinks owns the injection risk. [Props are untrusted](../reference/islands.md#props-are-untrusted) states the full contract.

Two runtime behaviors bear on how the live component renders. The mount clears the fallback and mounts the component into the same element, so a first render whose size differs from the fallback shifts the layout. The scaffold's `banner` fallback renders the same markup and message as its live component, and the two share CSS classes. Its swap on mount doesn't shift the layout. The runtime moves no focus. When the fallback holds a focusable control, restoring focus after the mount is the live component's job.

Next, register the live component under its directive name.

## Register the island

A site registers each island under its directive name in a registry module that imports the live components. The adapter and the root layout both import that module. Because the root layout imports the registry and not the adapter module, the layout adds no adapter code to the public pages' client bundle.

To register the island, follow these steps:

1. In a registry module, such as `src/lib/islands/registry.ts`, export an [`IslandRegistry`](../reference/islands.md#islandregistry) that maps the directive name to the live component. The examples name the export `siteIslands`.

   The following registry maps `converter` to the live component:

   ```ts
   // src/lib/islands/registry.ts
   import type { IslandRegistry } from '@glw907/cairn-cms/islands';
   import Converter from './Converter.svelte';

   export const siteIslands: IslandRegistry = { converter: Converter };
   ```

   On a scaffolded site, in `src/theme/islands/registry.ts`, import the live component and add its entry beside `banner` instead.

2. On a hand-built site, in the adapter module, pass `siteIslands` as `rendering.islands` beside `rendering.render` and `rendering.components`. A scaffolded site's adapter module, `src/theme/cairn.config.ts`, passes it already.

   The following excerpt shows the adapter module's `rendering` group with `islands` added:

   <!-- snippet-check-skip: an excerpt of the adapter module -->
   ```ts
   // The adapter module (excerpt)
   import { siteIslands } from '#lib/islands/registry.js';

   export const cairn = defineAdapter({
     // content, backend, and email stay as they are
     rendering: {
       render,
       components,
       islands: siteIslands,
     },
   });
   ```

3. In the `converter` component's `defineComponent` declaration, set `hydrate` to `true` or `'visible'`.

   With `true`, the island mounts when the layout's call runs, on first load and after each client navigation. With `'visible'`, the mount waits until the island's boundary enters the viewport, and an island that a reader never scrolls to never mounts. The following excerpt sets `hydrate` on the `converter` declaration:

   <!-- snippet-check-skip: an excerpt of a component declaration -->
   ```ts
   export const converter = defineComponent({
     name: 'converter',
     // label, description, attributes, and build stay as declared
     hydrate: true,
   });
   ```

Setting `hydrate` to `false`, or leaving it out, keeps the component static. The declaration's type is `boolean | 'visible'`.

`defineAdapter` checks the `hydrate` declarations in `rendering.components` against `rendering.islands` when the adapter is declared, and it throws on a mismatch in either direction. Each mismatch throws one of the following errors, with the directive's name in place of `<name>`:

```text
cairn: component '<name>' declares hydrate but rendering.islands has no entry for it.
cairn: rendering.islands has '<name>' but no component declares hydrate for it.
```

The engine reads `rendering.islands` for this check alone, and the runtime mounts from the map the layout passes. When the layout and the adapter import the same `siteIslands` export, the check covers the map that mounts. The [`rendering.islands`](../reference/core.md#renderingislands-adapter-member) entry documents the member and its check.

Next, wire the root layout that mounts the island.

## Wire the root layout

A scaffolded site's root load already returns `hasIslands`, and its root layout already calls `hydrateIslands`. On a scaffolded site, go to [Verify the island on the public page](#verify-the-island-on-the-public-page).

The root layout calls `hydrateIslands` from an `afterNavigate` callback, so the call runs after each navigation, once the new DOM is in place.

To wire the root layout, follow these steps:

1. In `src/routes/+layout.server.ts`, add `hasIslands` to the object the root `load` returns, computed from the registry module.

   The following load returns `hasIslands` from the registry's entry count:

   ```ts
   // src/routes/+layout.server.ts
   import type { LayoutServerLoad } from './$types';
   import { siteIslands } from '#lib/islands/registry.js';

   export const load: LayoutServerLoad = () => {
     return { hasIslands: Object.keys(siteIslands).length > 0 };
   };
   ```

   SvelteKit never ships a `+layout.server.ts` module, or what it imports, to the client. The layout's script receives the boolean and not the registry.

2. In `src/routes/+layout.svelte`, add an `afterNavigate` callback that returns at once when `data.hasIslands` is false.
3. In the same callback, dynamically import `hydrateIslands` from `@glw907/cairn-cms/islands` and `siteIslands` from the registry module.

   > **Caution:** The root layout imports the registry module, never the adapter module. A client import of the adapter module ships everything it imports to each public page. On a scaffolded site, that includes the engine's renderer, the icon set, and the committed media manifest.

4. In the same callback, after the imports resolve, call `hydrateIslands(siteIslands)`.

The following root layout makes the gated call:

<!-- snippet-check-skip: dynamically imports the site's registry module, which only the site declares -->
```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  afterNavigate(async () => {
    if (!data.hasIslands) return;
    const [{ hydrateIslands }, { siteIslands }] = await Promise.all([
      import('@glw907/cairn-cms/islands'),
      import('#lib/islands/registry.js'),
    ]);
    hydrateIslands(siteIslands);
  });
</script>

{@render children()}
```

With `hasIslands` false, the callback returns before either import, and a site with no registered island never requests the runtime or the registry module. On each call, `hydrateIslands` unmounts the islands its previous call mounted, then scans its optional `root` argument, which defaults to `document`. An island that fails keeps its fallback while the others mount. The [`hydrateIslands`](../reference/islands.md#hydrateislands) entry and [Error isolation](../reference/islands.md#error-isolation) state the full behavior.

With the layout in place, check the island where readers see it.

## Verify the island on the public page

The checks run on the public page, not in the editor preview, because the edit page's preview frame is sandboxed and runs no scripts. The preview always shows the fallback, never the mounted component, as [The editor preview shows the fallback](../reference/islands.md#the-editor-preview-shows-the-fallback) states.

To verify the island, follow these steps:

1. In the project directory, build the site with `npm run build`.
2. In the project directory, serve the build with `npm run preview`, or deploy the site.
3. In the browser, open the public page of an entry that uses the directive.
4. In the element inspector, find the boundary: a `<div>` whose `data-cairn-island` is the directive name, with a `data-cairn-props` JSON payload.

   A `'visible'` island's boundary also carries `data-cairn-hydrate="visible"`.

5. If the island is `'visible'`, scroll to it on the page.
6. On the page, confirm that the live component responds where the fallback was.
7. In the browser settings, turn off JavaScript.
8. In the browser, reload the page.
9. On the page, confirm that the fallback shows inside the boundary.

If a step fails, find what the page shows in the following list, in order, and apply its fix:

1. The page shows the component's markup with no `data-cairn-island` boundary.

   The declaration sets no `hydrate`, or sets it to `false`, so the component renders as static markup. Set `hydrate: true` or `hydrate: 'visible'` on the declaration, then build again.

2. The boundary is present, the fallback stays, and the browser never requests the islands runtime.

   The root load returned a false `hasIslands`, and the layout's callback returned before its imports. Or the root layout has no `afterNavigate` callback that calls `hydrateIslands`. Work through the following checks in order:

   1. Check that `src/routes/+layout.server.ts` computes `hasIslands` from the registry module that holds the entry.
   2. Check that the root layout makes the call, as [Wire the root layout](#wire-the-root-layout) shows.

3. The islands runtime loads, and the fallback stays.

   A `'visible'` island's boundary hasn't entered the viewport yet. Or the layout's map has no entry under the directive name, the props payload failed to parse, or the component threw on mount. Work through the following checks in order:

   1. If the island is `'visible'`, scroll it into view.
   2. Check that the layout imports the same `siteIslands` export as the adapter.
   3. Check that the boundary's `data-cairn-props` parses as JSON.
   4. Check that the component mounts without throwing.

   The runtime catches a parse failure and a mount error, and it logs neither.

## See also

The following pages and reference entries cover what this page leaves out:

- [Write a markdown component](write-a-markdown-component.md) covers declaring the component, its attributes, and its `build()` fallback.
- [Islands](../reference/islands.md) documents the runtime, the boundary markup, and the props contract.
- [`rendering.islands`](../reference/core.md#renderingislands-adapter-member) documents the adapter member and its check.
- [Hydrate and the island boundary](../reference/admin.md#hydrate-and-the-island-boundary) documents `hydrate` on the component's declaration.
- [Scaffolded site files](scaffolded-site-files.md) shows where the scaffold's island files sit.
