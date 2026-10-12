# Add an island

A markdown component on a cairn site's public page renders as markup only. SvelteKit server-renders
each page by default and then hydrates it in the browser, but an entry's body reaches the page as the
HTML string the site's `render` function returns. The public routes produce that string on the
server, at build when the route is prerendered and per request otherwise. A markdown component inside
the body is the static markup its `build()` returns, with no client JavaScript. Declaring `hydrate` on
the component changes that default: the pipeline wraps the same `build()` output in an island
boundary that carries the directive name and a JSON payload of the component's props, and a live
Svelte component registered under that name mounts over it in the browser. The `build()` output stays
as the fallback, shown before JavaScript runs and the only content a reader without JavaScript sees.
An island gives one component behavior in the browser while the entry body around it stays static.

A developer reaches for an island to make a declared component respond in the browser, or to run
client script, which the render strips from an entry body by default. A scaffolded site keeps its
adapter at `src/theme/cairn.config.ts` and already ships the island wiring around its `banner`
island. Adding an island there takes a new component, one registry entry, and the `hydrate`
declaration. A hand-built site, such as the one the
[add-cairn tutorial](add-cairn-to-a-sveltekit-app.md) builds, keeps its adapter at
`src/lib/cairn.config.ts`. Because `rendering.islands` is optional on the adapter, that site starts
without the wiring. On that site you write the live component, register it under its directive name,
mount it from the root layout, and check the result on the public page.

The steps assume familiarity with Svelte runes, SvelteKit layouts, server load functions,
`afterNavigate`, and dynamic imports. Declaring the component, its attributes, and the
`build()` output that becomes its fallback belongs to [Configure rendering](configure-rendering.md),
and a component that only renders markup needs that page alone. A widget in a route or layout the
site writes in Svelte needs no island, because SvelteKit already hydrates those pages.

## Before you begin

An island starts from a markdown component your site already declares, an entry that uses it, and the
adapter file of the site you are changing. Each of the following must be in place before the first
step:

- A markdown component in the component registry the adapter passes as `rendering.components`.
  [Configure rendering](configure-rendering.md) declares one, and its `build()` output becomes the
  fallback.
- An entry whose body uses the component's directive, written as
  [Configure rendering](configure-rendering.md) describes. This page's example uses a `converter`
  directive.
- The adapter module at `src/theme/cairn.config.ts` on a scaffolded site, or at
  `src/lib/cairn.config.ts` on the add-cairn tutorial's site.
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter)
  creates the tutorial's adapter.

On a scaffolded site, the registry module `src/theme/islands/registry.ts`, the adapter's
`rendering.islands`, the root load's `hasIslands`, and the root layout's `hydrateIslands` call already
exist. On that site, write the live component, add its entry to the existing registry, and set
`hydrate` on its declaration. Then go to
[Verify the island on the public page](#verify-the-island-on-the-public-page).

Start with the live component, the piece the browser mounts.

## Write the live component

The live component is an ordinary Svelte component that the runtime mounts with Svelte's `mount()`,
and its props are the directive's declared attributes. The runtime puts no framework abstraction
between Svelte and the component.

- In `src/lib/islands/`, or `src/theme/islands/` on a scaffolded site, create `Converter.svelte` with
  its props typed from the directive's attributes:

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

A `number` attribute arrives as a JSON number and a `boolean` attribute as a JSON boolean. Every
other attribute arrives as the literal string the author wrote.

> **Caution:** Every prop is written by an author and untrusted. The pipeline escapes it into an attribute and the runtime parses it inside a `try`/`catch`, which is safe only because the value never enters a script context. The runtime passes the parsed values to the component unchanged, with no sanitizing or URL filtering. A component that routes a prop into `{@html}`, an `href` or `src`, or an inline `style` owns that injection risk. Bind props to text only. [Props are untrusted](../reference/islands.md#props-are-untrusted) states the full contract.

The mount clears the fallback and mounts the component into the same element, so a first render whose
size differs from the fallback shifts the layout. The `banner` island avoids the shift because its
fallback states the same message its live component shows. The runtime moves no focus either. When
the fallback holds a focusable control, the component restores focus itself.

Next, register the component under its directive name.

## Register the island

An island registers on the adapter's `rendering.islands` under its directive name, and the
component's declaration sets `hydrate` to say when it mounts.

To register the island, follow these steps:

1. On the tutorial's site, create `src/lib/islands/registry.ts` and export an `IslandRegistry`
   named `siteIslands` that maps `converter` to the component:

   ```ts
   // src/lib/islands/registry.ts
   import type { IslandRegistry } from '@glw907/cairn-cms/islands';
   import Converter from './Converter.svelte';

   export const siteIslands: IslandRegistry = { converter: Converter };
   ```

   On a scaffolded site, add the `converter` entry beside `banner` in the existing
   `src/theme/islands/registry.ts` instead. The engine reads `rendering.islands` only to check it,
   and the runtime mounts from whatever map the layout passes. The adapter and the layout therefore
   import this one `siteIslands` export.

2. On the tutorial's site, in `src/lib/cairn.config.ts`, pass `siteIslands` as `rendering.islands`
   beside `rendering.render`:

   <!-- snippet-check-skip: elides the adapter's required content, backend, and email groups and the renderer setup -->
   ```ts
   // src/lib/cairn.config.ts
   import { defineAdapter } from '@glw907/cairn-cms';
   import { siteIslands } from '#lib/islands/registry.js';

   export const cairn = defineAdapter({
     // content, backend, and email stay as the tutorial wrote them, and renderMarkdown is the tutorial's
     rendering: {
       render: ({ body, resolve, resolveMedia, resolveFragment }) =>
         renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
       islands: siteIslands,
     },
   });
   ```

   A scaffolded site's adapter passes it already.

3. In the component's `defineComponent` declaration, add `hydrate: true` to mount on first load and
   every client navigation, or `hydrate: 'visible'` to defer the mount.

   A `'visible'` island mounts once, the first time its boundary meets the viewport, so an island a
   reader never scrolls to never mounts. An island the reader sees on first load suits `true`.

`defineAdapter` checks the declarations against the registry when the adapter is declared, and it
fails closed on a mismatch in either direction. Each of its two errors names the directive:

```text
cairn: component '<name>' declares hydrate but rendering.islands has no entry for it.
cairn: rendering.islands has '<name>' but no component declares hydrate for it.
```

After all three steps, the check passes. The
[`rendering.islands`](../reference/core.md#renderingislands-adapter-member) entry describes the member
and its check.

The registered island still needs the root layout that mounts it.

## Hydrate islands after navigation

The root layout mounts islands by calling `hydrateIslands` from `afterNavigate`, behind a
`hasIslands` flag, so a site without islands loads no runtime. On a scaffolded site, the root layout
already makes this call, so go to
[Verify the island on the public page](#verify-the-island-on-the-public-page).

On the tutorial's site, `sv create` already wrote the root layout at the top of `src/routes/`. The
new root load goes beside it:

```text
field-notes/
└── src/
    └── routes/
        ├── admin/
        ├── +layout.server.ts   (new)
        └── +layout.svelte
```

To wire the root layout, follow these steps:

1. Create `src/routes/+layout.server.ts` and return `hasIslands` computed from the registry module:

   ```ts
   // src/routes/+layout.server.ts
   import type { LayoutServerLoad } from './$types';
   import { siteIslands } from '#lib/islands/registry.js';

   export const load: LayoutServerLoad = () => {
     return { hasIslands: Object.keys(siteIslands).length > 0 };
   };
   ```

2. In the `src/routes/+layout.svelte` that `sv create` wrote, call `hydrateIslands(siteIslands)`
   from `afterNavigate` when the `hasIslands` flag is set:

   <!-- snippet-check-skip: dynamically imports the site's registry module, which only the site declares -->
   ```svelte
   <!-- src/routes/+layout.svelte -->
   <script lang="ts">
     import { afterNavigate } from '$app/navigation';
     import favicon from '#lib/assets/favicon.svg';
     import type { LayoutProps } from './$types';

     let { data, children }: LayoutProps = $props();

     afterNavigate(async () => {
       if (!data.hasIslands) return;
       const [{ hydrateIslands }, { siteIslands }] = await Promise.all([
         import('@glw907/cairn-cms/islands'),
         import('#lib/islands/registry.js'),
       ]);
       hydrateIslands(siteIslands);
     });
   </script>

   <svelte:head>
     <link rel="icon" href={favicon} />
   </svelte:head>

   {@render children()}
   ```

The flag and the dynamic imports keep the runtime out of a site whose registry is empty. Both the load
and the layout read the lean registry module, never the adapter. Importing the adapter in the layout
would ship the adapter's renderer, icon set, and media manifest to every public page.

`hydrateIslands` runs after each client navigation, once the new DOM is in place, and it tears down
the previous pass first. Returning to a page therefore mounts one instance of each island, never a
duplicate. Teardown is synchronous on navigation: the runtime unmounts with `outro: false`. A
narrower element passed as the second argument, `root`, limits the scan to that region, and `root`
defaults to `document`. The [`hydrateIslands`](../reference/islands.md#hydrateislands) entry states
the function's contract.

With the layout in place, check the island where your readers see it.

## Verify the island on the public page

Check the island under `npm run preview` or on the deployed site, because the edit page's sandboxed
preview frame always shows the fallback.

To verify the island, follow these steps:

1. In the project directory, build the site and serve it with `npm run preview`, or deploy it.
2. In the browser, open the public page of the entry from [Before you begin](#before-you-begin) that
   uses the `converter` directive.
3. In the browser's element inspector, find the boundary: a `<div>` with
   `data-cairn-island="converter"` and a `data-cairn-props` JSON payload. A `'visible'` island also
   carries `data-cairn-hydrate="visible"`.
4. On the page, scroll to the island if it is `'visible'`, and confirm that the converter responds
   to input where the fallback was.
5. With JavaScript turned off in the browser, reload the page: the fallback shows inside the boundary.

If a check fails, [Diagnose a failed check](#diagnose-a-failed-check) traces it to its cause.

## Diagnose a failed check

Each failed check traces to one piece of the chain, from the adapter's island check and the `hydrate`
declaration to the layout and the component's mount. One bad island keeps its fallback, and every
other island still mounts. That holds whether its name is missing from the map, its props fail to
parse, or its component throws on mount. A throwing mount puts back the fallback it cleared.
[Error isolation](../reference/islands.md#error-isolation) lists the isolated cases.

Work through the following checks in order:

1. The adapter throws one of the two errors from [Register the island](#register-the-island) when it
   is declared. For the first error, add the registry entry. For the second, check that the
   declaration sets `hydrate` and that the component sits in the registry the adapter passes as
   `rendering.components`.
2. The page shows the component's markup with no `data-cairn-island` boundary. The declaration lacks
   `hydrate`, so the component renders as static server markup.
3. The boundary is there and a `'visible'` island keeps its fallback. The island mounts only when its
   boundary first meets the viewport, so scroll to it.
4. The boundary is there, the fallback stays, and the islands runtime never loads. The root load
   returned a false `hasIslands`, and the layout returned before its imports. Check that
   `src/routes/+layout.server.ts` reads the registry module.
5. The runtime loads and the fallback stays. The map the layout passes lacks the directive name.
   Check that the layout and the adapter import the same `siteIslands` export.
6. The name is in the map and the fallback stays. The component threw on mount, and the runtime put
   the fallback back. The fix is in the component.

## See also

The following pages cover the pieces this page links to:

- [Configure rendering](configure-rendering.md) declares the component, its attributes, and its
  `build()` fallback.
- [Islands](../reference/islands.md) documents the runtime, the boundary contract, and the props
  trust boundary.
- [`rendering.islands`](../reference/core.md#renderingislands-adapter-member) documents the adapter
  member and its consistency check.
- [Hydrate and the island boundary](../reference/admin.md#hydrate-and-the-island-boundary) documents
  `hydrate` on the component's declaration.
- [Scaffolded site files](scaffolded-site-files.md) shows where the scaffold's island files sit.
