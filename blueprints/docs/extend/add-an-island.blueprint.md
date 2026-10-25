---
page: Add an island
type: task guide
exemplar: extenders/payload-custom-components
---

# Add an island

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn, who wants one markdown component to respond in the browser. The page serves two such developers. On a hand-built site, the adapter starts with no `rendering.islands`. A scaffolded site already registers a `banner` island and carries the registry module, adapter member, root load, and layout call around it. :fact[thjrvl] :fact[mcxxpp]

**Why they arrive:**
- A markdown component on a public page renders as static markup, and they want it to respond to the reader. :fact[4hd2vg]
- Their scaffolded site has a `banner` island, and they want to add a second island beside it. :fact[mcxxpp]

**What they already know.** Svelte 5 components and runes, SvelteKit layouts and server load functions, `afterNavigate`, dynamic imports, and the site's adapter module. They have declared the component with `defineComponent`. The page doesn't explain them.

**Background.** An island is a markdown component declared with `hydrate`. The pipeline wraps the component's `build()` output in an island boundary that carries the directive name and a JSON payload of its props. A live Svelte component registered under that name mounts over the boundary in the browser. :fact[4hd2vg]
The `build()` output stays as the fallback. It is the first paint before the mount, and the content a reader without JavaScript sees. :fact[1uk9sw]
A component with no `hydrate` renders as static server markup and adds no client JavaScript. :fact[4hd2vg] :fact[awr88d]

**What the page does for them.** The introduction opens on that model, then names the task: make one component interactive while its fallback still serves readers without JavaScript. :fact[4hd2vg] :fact[1uk9sw]
It tells the scaffolded-site reader that the tree already carries the registry module, the adapter member, the root load, and the layout call. That reader writes the live component, imports it in the registry beside `banner`, and sets `hydrate` on the declaration. :fact[mcxxpp]
The steps write the live component, register the island, wire the root layout on a hand-built site, and verify the island on the public page.

**What it leaves to other pages, each named in the introduction:**
- Write a markdown component covers declaring the component, its attributes, and the `build()` function whose output becomes the fallback.
- The islands reference covers the runtime's full contract and the boundary markup.
:::

:::constraints
- Name the adapter module by its role. Give `src/theme/cairn.config.ts` as where a scaffolded site keeps it, and give no path for a hand-built site's adapter module. :fact[mcxxpp]
- Give `src/lib/islands/` and the `#lib/*` import as an example location for a hand-built site's island files, never as a path the engine requires. :fact[pgeeq3]
- Say `hydrate` takes `true` or `'visible'`. Never present "eager" as a value of `hydrate`. :fact[awr88d]
- Never show a root layout that imports the adapter module on the client. :fact[zrcuyf]
- State the props rule as the reader's obligation. The runtime passes props to the component unchanged, and the page never says the engine sanitizes them. :fact[8356mn]
- Keep the runtime's teardown, scan, and error isolation to one line in "Wire the root layout" and its links to the islands reference.
:::

## Before you begin

*Name what the steps assume, and send a scaffolded-site reader down the short path.*

- The steps assume the following:
- A markdown component declared with `defineComponent`, in the registry the adapter passes as `rendering.components`. Its `build()` output becomes the island's fallback. :fact[mv684d] :fact[1uk9sw]
- See [Write a markdown component](write-a-markdown-component.md).
- An entry whose body uses the component's directive, for checking the island on its public page.

- A scaffolded site already carries the registry module `src/theme/islands/registry.ts`, the adapter's `rendering.islands`, the root load's `hasIslands`, and the root layout's `hydrateIslands` call. :fact[mcxxpp]
- On a scaffolded site, follow these steps instead: :fact[mcxxpp]
1. In `src/theme/islands/`, write the live component, as [Write the live component](#write-the-live-component) describes. :fact[mcxxpp]
2. In `src/theme/islands/registry.ts`, import the live component and add its entry beside `banner`. :fact[mcxxpp]
3. In the component's declaration, set `hydrate` to `true` or `'visible'`. :fact[nm3bbo] :fact[awr88d]
4. Verify the island, as [Verify the island on the public page](#verify-the-island-on-the-public-page) describes.

## Write the live component

*Walk the reader through the Svelte component the browser mounts, typed from the directive's attributes, and the rule for its untrusted props.*

- The live component is an ordinary Svelte component. The runtime mounts it with Svelte's `mount()`, passing the directive's declared attributes as its props. :fact[bwaj5c] :fact[hje4zb]
- To write the live component, follow these steps:
1. In the site's islands directory, create the component file, such as `src/lib/islands/Converter.svelte`. A scaffolded site keeps its island files in `src/theme/islands/`. :fact[mcxxpp]
2. In the component's script, declare a prop with a default value for each attribute the directive declares. :fact[hje4zb] :fact[n3pod3]
- A `number` attribute arrives as a JSON number and a `boolean` attribute as a JSON boolean. Any other attribute arrives as the literal string the author wrote. :fact[hje4zb]
- When the entry leaves an attribute unset, the component receives no prop for it, and the prop's default applies. :fact[n3pod3]
3. In the component's markup, render each prop as text. :fact[8356mn]
- Code: `src/lib/islands/Converter.svelte`, a live component typed from a `converter` directive's `from`, `to`, and `rate` attributes, with each prop rendered as text. :fact[hje4zb] :fact[n3pod3] :source[/templates/waymark/src/theme/islands/Banner.svelte]

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

- A caution notice says not to route a prop into `{@html}`, an `href` or `src`, or an inline `style`. An author writes each attribute value, and the runtime passes the parsed values to the component unchanged, with no sanitizing or URL filtering. :fact[8356mn] :fact[hje4zb]
- See [Props are untrusted](../reference/islands.md#props-are-untrusted).
- The mount also shapes how the live component renders.
- The mount clears the fallback and mounts the component into the same element. A first render whose size differs from the fallback shifts the layout. :fact[9zxml1]
- The scaffold's `banner` fallback renders the same markup and message as its live component, and the two share CSS classes. Its swap doesn't shift the layout. :fact[9zxml1]
- The runtime moves no focus. When the fallback holds a focusable control, restoring focus after the mount is the live component's job. :fact[s080jg]

## Register the island

*Walk the reader through the registry entry, the adapter member, and the `hydrate` declaration, then the check `defineAdapter` runs across them.*

- A site registers each island under its directive name in a registry module that imports the live components. The adapter and the root layout both import that module. Keeping it separate from the adapter module keeps the adapter off the client. :fact[thjrvl] :fact[ni5lm7] :fact[zrcuyf]
- To register the island, follow these steps:
1. In a registry module, such as `src/lib/islands/registry.ts`, export an `IslandRegistry` that maps the directive name to the live component. The examples name the export `siteIslands`. :fact[thjrvl] :fact[mcxxpp]
- On a scaffolded site, in `src/theme/islands/registry.ts`, import the live component and add its entry beside `banner` instead. :fact[mcxxpp]
- Code: `src/lib/islands/registry.ts`, mapping `converter` to the live component. :fact[thjrvl] :source[/templates/waymark/src/theme/islands/registry.ts]

```ts
// src/lib/islands/registry.ts
import type { IslandRegistry } from '@glw907/cairn-cms/islands';
import Converter from './Converter.svelte';

export const siteIslands: IslandRegistry = { converter: Converter };
```

2. On a hand-built site, in the adapter module, pass `siteIslands` as `rendering.islands` beside `rendering.render` and `rendering.components`. A scaffolded site's adapter passes it already. :fact[thjrvl] :fact[mcxxpp]
- Code: an excerpt of the adapter module's `rendering` group with `islands` added, framed as an excerpt. :fact[thjrvl] :source[/templates/waymark/src/theme/cairn.config.ts]

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

3. In the component's `defineComponent` declaration, set `hydrate` to `true` or `'visible'`. :fact[nm3bbo] :fact[awr88d]
- With `true`, the island mounts when the layout's call runs, on first load and after each client navigation. With `'visible'`, the mount waits until the island's boundary enters the viewport. :fact[awr88d] :fact[mynt0l]
- Code: an excerpt of the `converter` declaration with `hydrate` set, framed as an excerpt. :fact[nm3bbo] :source[/templates/waymark/src/theme/markdown-components.ts]

<!-- snippet-check-skip: an excerpt of a component declaration -->
```ts
export const converter = defineComponent({
  name: 'converter',
  // label, description, attributes, and build stay as declared
  hydrate: true,
});
```

- A `'visible'` island mounts the first time its boundary enters the viewport. A `'visible'` island that a reader never scrolls to never mounts. :fact[mynt0l]
- `hydrate` is typed `boolean | 'visible'`. Setting it to `false`, or leaving it out, keeps the component static. :fact[awr88d]
- `defineAdapter` checks the `hydrate` declarations against `rendering.islands` when the adapter is declared. It throws on a mismatch in either direction. :fact[mv684d]
- Code: the error each mismatch throws, with the directive's name in place of `<name>`. :fact[bb4ah3]

```text
cairn: component '<name>' declares hydrate but rendering.islands has no entry for it.
cairn: rendering.islands has '<name>' but no component declares hydrate for it.
```

- The engine reads `rendering.islands` for this check alone, and the runtime mounts from the map the layout passes. When the layout and the adapter import the same `siteIslands` export, the check covers the map that mounts. :fact[ni5lm7]
- See [`rendering.islands`](../reference/core.md#renderingislands-adapter-member).

## Wire the root layout

*Walk the hand-built-site reader through the gated root load and the `afterNavigate` call, and name the client import that would ship the adapter module to each public page.*

- A scaffolded site's root load already returns `hasIslands`, and its root layout already calls `hydrateIslands`. On a scaffolded site, go to [Verify the island on the public page](#verify-the-island-on-the-public-page). :fact[mcxxpp]
- The root layout calls `hydrateIslands` from an `afterNavigate` callback. The call runs after each navigation, once the new DOM is in place. :fact[drsabs]
- To wire the root layout, follow these steps:
1. In `src/routes/+layout.server.ts`, add `hasIslands` to the object the root `load` returns, computed from the registry module. :fact[mcxxpp] :fact[java15]
- Code: `src/routes/+layout.server.ts`, returning `hasIslands` from the registry's entry count. :fact[mcxxpp] :source[/templates/waymark/src/routes/+layout.server.ts]

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { siteIslands } from '#lib/islands/registry.js';

export const load: LayoutServerLoad = () => {
  return { hasIslands: Object.keys(siteIslands).length > 0 };
};
```

- SvelteKit never ships a `+layout.server.ts` module, or what it imports, to the client. The layout's script receives the boolean and not the registry. :fact[java15]
2. In `src/routes/+layout.svelte`, add an `afterNavigate` callback that returns at once when `data.hasIslands` is false. :fact[shvf6h]
3. In the same callback, dynamically import `hydrateIslands` from `@glw907/cairn-cms/islands` and `siteIslands` from the registry module. :fact[mcxxpp]
- A caution notice says that the root layout imports the registry module, never the adapter module. :fact[zrcuyf]
- A client import of the adapter module ships everything it imports to each public page. On a scaffolded site, that includes the engine renderer, the icon set, and the committed media manifest. :fact[zrcuyf]
4. After the imports resolve, call `hydrateIslands(siteIslands)`. :fact[drsabs]
- Code: `src/routes/+layout.svelte` with the gated callback, following the scaffold's root layout. :fact[mcxxpp] :fact[shvf6h] :source[/templates/waymark/src/routes/+layout.svelte]

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

- With `hasIslands` false, the callback returns before either import. A site with no registered island never requests the runtime or the registry module. :fact[shvf6h]
- On each call, `hydrateIslands` unmounts the islands its previous call mounted, then scans its optional `root` argument, which defaults to `document`. An island that fails keeps its fallback while the others mount. :fact[rmlwca] :fact[bh6css] :fact[urw3z7]
- See [`hydrateIslands`](../reference/islands.md#hydrateislands).
- See [Error isolation](../reference/islands.md#error-isolation).

## Verify the island on the public page

*Have the reader check the island on the built public page and match a failed check to its cause.*

- The edit page's preview frame is sandboxed and runs no scripts. It shows the fallback, never the mounted component. :fact[8o2gbl]
- To verify the island, follow these steps:
1. In the project directory, build the site with `npm run build`. :fact[8o2gbl]
2. Serve the build with `npm run preview`, or deploy the site. :fact[8o2gbl]
3. In the browser, open the public page of an entry that uses the directive.
4. In the element inspector, find the boundary: a `<div>` whose `data-cairn-island` is the directive name, with a `data-cairn-props` JSON payload. :fact[4kmm3i]
- A `'visible'` island's boundary also carries `data-cairn-hydrate="visible"`. :fact[4kmm3i]
5. If the island is `'visible'`, scroll to it on the page. :fact[mynt0l]
6. On the page, confirm that the live component responds where the fallback was. :fact[mynt0l]
7. In the browser settings, turn off JavaScript. :fact[1uk9sw]
8. Reload the page. The fallback shows inside the boundary. :fact[1uk9sw]

- The following list matches each failed check to its cause and fix.

:::row
**Symptom.** The page shows the component's markup with no `data-cairn-island` boundary.
**Cause.** The declaration sets no `hydrate`, or sets it to `false`, so the component renders as static markup. :fact[awr88d]
**Fix.** Set `hydrate: true` or `hydrate: 'visible'` on the declaration, then build again. :fact[nm3bbo]
:::

:::row
**Symptom.** The boundary is present, the fallback stays, and the browser never requests the islands runtime.
**Cause.** The root load returned a false `hasIslands`, and the layout's callback returned before its imports. Or the root layout has no `afterNavigate` callback that calls `hydrateIslands`. :fact[shvf6h] :fact[drsabs]
**Fix.** Check that `src/routes/+layout.server.ts` computes `hasIslands` from the registry module that holds the entry. Then check that the root layout makes the call, as [Wire the root layout](#wire-the-root-layout) shows. :fact[mcxxpp] :fact[drsabs]
:::

:::row
**Symptom.** The islands runtime loads, and the fallback stays.
**Cause.** A `'visible'` island's boundary hasn't entered the viewport yet. Otherwise, the layout's map has no entry under the directive name, the props payload failed to parse, or the component threw on mount. :fact[mynt0l] :fact[urw3z7]
**Fix.** Scroll a `'visible'` island into view. Otherwise, check that the layout imports the same `siteIslands` export as the adapter. If it does, check that the boundary's `data-cairn-props` parses as JSON and that the component mounts without throwing. The runtime catches both failures and logs nothing. :fact[mynt0l] :fact[ni5lm7] :fact[urw3z7]
:::

## See also

*Point the reader to the reference entries and pages around islands.*

- The following pages and reference entries cover what this page leaves out:
- Write a markdown component covers declaring the component, its attributes, and its `build()` fallback.
- See [Write a markdown component](write-a-markdown-component.md).
- The islands reference documents the runtime, the boundary markup, and the props contract.
- See [Islands](../reference/islands.md).
- The `rendering.islands` entry documents the adapter member and its check.
- See [`rendering.islands`](../reference/core.md#renderingislands-adapter-member).
- The `hydrate` entry documents the member on the component's declaration.
- See [Hydrate and the island boundary](../reference/admin.md#hydrate-and-the-island-boundary).
- Scaffolded site files shows where the scaffold's island files sit.
- See [Scaffolded site files](scaffolded-site-files.md).
