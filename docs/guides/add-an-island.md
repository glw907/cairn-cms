# Add an island

cairn's render pipeline runs on the server, so a directive component renders to static HTML: a
callout or an alert never needs client code. Some content wants to be interactive, though, and
cairn's seam for that is the `hydrate` flag on
[`defineComponent`](../reference/core.md#definecomponent) paired with a matching entry on your
adapter's [`rendering.islands`](../reference/core.md#renderingislands-adapter-member). This guide
wires one up end to end, using the showcase's own `banner` directive throughout, a time-boxed
announcement that renders until its `expires` date passes and checks that date again, independently,
at hydration:
[`cairn.config.ts`](../../examples/showcase/src/theme/cairn.config.ts) declares it and
[`Banner.svelte`](../../examples/showcase/src/theme/islands/Banner.svelte) is the live component
that mounts over it. This guide assumes you already have a directive component rendering through
your registry. [Configure rendering](./configure-rendering.md) builds one from nothing.

## Declare the directive as an island

Start from an ordinary component definition and add `hydrate: true`. The attributes stay exactly
as declared: they're what the live component receives as props, so keep them scalar and give the
`build` a fallback that states the same content the live component starts with.

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { strAttr } from '@glw907/cairn-cms/render';
import { h } from 'hastscript';
import { isBannerExpired } from './banner-expiry.js';

const banner = defineComponent({
  name: 'banner',
  label: 'Announcement banner',
  description: 'A time-boxed announcement that removes itself once its expiry date passes.',
  hydrate: true,
  insertTemplate: ':::banner{message="Announcement text" expires="2026-12-31"}\n:::',
  attributes: {
    message: fields.text({ label: 'Announcement', required: true }),
    expires: fields.date({
      label: 'Expires',
      required: true,
      help: 'The banner shows through the end of this date, then renders nothing.',
    }),
  },
  build: (ctx) => {
    const message = strAttr(ctx, 'message') ?? '';
    const expires = strAttr(ctx, 'expires');
    if (isBannerExpired(expires)) return h('div', { hidden: true, className: ['banner-expired'] }, []);
    return h('div', { className: ['banner'], role: 'status' }, [
      h('p', { className: ['banner-message'] }, [message]),
    ]);
  },
});
```

`isBannerExpired` is a small helper the showcase shares between `build()` and the live component
(`examples/showcase/src/theme/islands/banner-expiry.ts`), so the server and the client agree on what
"expired" means without sharing any state across that boundary: each evaluates the same rule fresh, at
its own render or hydration moment.

With `hydrate` set, the render pipeline wraps this `build()` output in an island boundary rather
than emitting it as-is: a `<div>` carrying the directive name and the attributes, serialized to
JSON, as inert `data-*` attributes. `message` and `expires` are both string-shaped fields, so both
stay the literal string the author wrote. A `number` or `boolean`-typed attribute would round-trip
as a real JSON value instead. The
[islands reference](../reference/islands.md#the-island-boundary) documents the boundary's exact
shape.

## Build the live component

The live component is a plain Svelte component. Its props are the directive's attributes, so name
them the same way and give each a default, since an inserted directive might not set every
attribute yet:

```svelte
<!-- src/lib/islands/Banner.svelte -->
<script lang="ts">
  import { isBannerExpired } from './banner-expiry.js';

  interface Props {
    message?: string;
    expires?: string;
  }

  let { message = '', expires }: Props = $props();
  const expired = $derived(isBannerExpired(expires));
</script>

{#if !expired}
  <div class="banner" role="status">
    <p class="banner-message">{message}</p>
  </div>
{/if}
```

`expired` is a `$derived` value rather than an `$effect`, so the check runs once, lazily, on first
read, with no interval timer. A banner doesn't need to vanish partway through a visit, only stay
correct across a fresh mount: a statically built or long-cached page can outlive its `expires` date,
so the client re-checks it independently rather than trusting whatever the server decided at build
time.

The props arriving here are author-controlled and untrusted. They're an editor's own directive
attributes, escaped by the pipeline and parsed on the client, but never validated against your
component's expectations beyond their declared type. Bind every one of them to text, the way
`message` lands as a plain interpolated string in the preceding component. Never route a prop into
`{@html}`, an `href` or `src` that could carry a `javascript:` scheme, or an inline `style`. The
engine only guarantees the prop arrives as escaped data. Where it goes next is up to your
component, so keep it out of those sinks. The [props section of the islands
reference](../reference/islands.md#props-are-untrusted) covers the full trust boundary.

## Register it on `rendering.islands`

Key the live component by the directive's name, the type-safe join between the two declarations:

```ts
import type { IslandRegistry } from '@glw907/cairn-cms/islands';
import Banner from '$lib/islands/Banner.svelte';

const islands: IslandRegistry = { banner: Banner };
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
never scrolls that far never pays for the mount at all. A banner near the top of a page, the
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
