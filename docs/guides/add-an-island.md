# Add an island

cairn's render pipeline runs on the server, so a directive component renders to static HTML: a
callout or an alert never needs client code. Some content wants to be interactive, though, and
cairn's seam for that is the `hydrate` flag on
[`defineComponent`](../reference/core.md#definecomponent) paired with a matching entry on your
adapter's [`rendering.islands`](../reference/core.md#renderingislands-adapter-member). This guide
wires one up end to end, using the showcase's own `converter` directive throughout, a live
two-way unit converter you can run yourself:
[`cairn.config.ts`](../../examples/showcase/src/lib/cairn.config.ts) declares it and
[`Converter.svelte`](../../examples/showcase/src/lib/islands/Converter.svelte) is the component
that mounts over it. This guide assumes you already have a directive component rendering through
your registry. [Configure rendering](./configure-rendering.md) builds one from nothing.

## Declare the directive as an island

Start from an ordinary component definition and add `hydrate: true`. The attributes stay exactly
as declared: they're what the live component receives as props, so keep them scalar and give the
`build` a fallback that states the same content the live component starts with.

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

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
      h('p', [`1 ${ctx.attributes.from} = ${ctx.attributes.rate} ${ctx.attributes.to}`]),
    ]),
});
```

With `hydrate` set, the render pipeline wraps this `build()` output in an island boundary rather
than emitting it as-is: a `<div>` carrying the directive name and the attributes, serialized to
JSON, as inert `data-*` attributes. `rate`'s declared type is `number`, so it round-trips as a
real JSON number. Every other attribute stays the literal string the author wrote. The
[islands reference](../reference/islands.md#the-island-boundary) documents the boundary's exact
shape.

## Build the live component

The live component is a plain Svelte component. Its props are the directive's attributes, so name
them the same way and give each a default, since an inserted directive might not set every
attribute yet:

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
  const converted = $derived(Number.isFinite(amount) ? Math.round(amount * rate * 1000) / 1000 : 0);
</script>

<div class="island-converter">
  <input type="number" aria-label={from ? `Amount in ${from}` : 'Amount'} bind:value={amount} />
  <span aria-hidden="true">{from}</span>
  <span aria-hidden="true">=</span>
  <output aria-live="polite">{converted} {to}</output>
</div>
```

`converted` is a `$derived` value rather than an `$effect`. An effect that wrote `amount` back from
a prop could loop, whereas a derived value only ever computes from its inputs.

The props arriving here are author-controlled and untrusted. They're an editor's own directive
attributes, escaped by the pipeline and parsed on the client, but never validated against your
component's expectations beyond their declared type. Bind every one of them to text, the way
`from` and `to` land as plain interpolated strings in the preceding component. Never route a prop into
`{@html}`, an `href` or `src` that could carry a `javascript:` scheme, or an inline `style`. The
engine only guarantees the prop arrives as escaped data. Where it goes next is up to your
component, so keep it out of those sinks. The [props section of the islands
reference](../reference/islands.md#props-are-untrusted) covers the full trust boundary.

## Register it on `rendering.islands`

Key the live component by the directive's name, the type-safe join between the two declarations:

```ts
import type { IslandRegistry } from '@glw907/cairn-cms/islands';
import Converter from '$lib/islands/Converter.svelte';

const islands: IslandRegistry = { converter: Converter };
```

`defineAdapter` checks this join in both directions at module load, the same moment
`defineConcept` checks your concepts' permalinks: a `hydrate` component with no `islands` entry,
or an `islands` entry with no `hydrate` component, fails to load. You catch the mistake in your
editor or dev server instead of shipping a directive that never becomes interactive.

## Mount the runtime in your root layout

One call, in your root layout, mounts every island on the page after every navigation:

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

The empty-registry check keeps the dynamic import out of a site's bundle entirely until it
registers a first island, so a static site never ships the runtime. `hydrateIslands` tears down
the previous mount before creating the new one. Call it from `afterNavigate`, not a one-time
`onMount`, so each client-side navigation gets exactly one instance per boundary.

## Choose eager or deferred mounting

`hydrate: true` mounts eagerly, on first load and after every navigation. `hydrate: 'visible'`
defers the same mount to the moment the island's boundary first scrolls into view, then stops
watching it. Reach for `'visible'` on an island that sits low on a long page, so a reader who
never scrolls that far never pays for the mount at all. A converter near the top of a post, the
one built here, is exactly the eager case: it's likely to be visible already, so there's nothing
to gain by deferring it.

## Keep the fallback the real first paint

For a `'visible'` island, or any reader without JavaScript, the `build()` output is the only
content that ever renders, so treat it as the page's first paint, not a placeholder. Make it state
the same thing the live component starts with, at close to
the same size. A fallback that's shorter or narrower than the mounted component shifts the layout
the moment the runtime replaces it. Style it with classes rather than an inline `style` attribute.
The render pipeline's sink guard strips inline styles and event handlers from directive output, so
a fallback that depends on one silently loses it.

## Verify the live island on the deployed page

The admin's edit-page preview renders only the `build()` fallback: its frame runs with
`sandbox=""`, so no script executes and the island runtime never mounts there. This is expected.
Check a live island the way any reader actually encounters it,
on the deployed page (or a local `vite dev` / `wrangler dev` run of it), never in the preview.

## Related reference

The [islands reference](../reference/islands.md) documents `hydrateIslands`, the `IslandRegistry`
type, and the full island boundary contract. [`hydrate` on the components
reference](../reference/components.md#hydrate-and-the-island-boundary) and [`rendering.islands` on
the core reference](../reference/core.md#renderingislands-adapter-member) cover the two
declarations this guide joined. [Configure rendering](./configure-rendering.md) and [Define an
adapter and schema](./define-an-adapter-and-schema.md) cover the registry and the adapter this
guide assumed were already in place.
