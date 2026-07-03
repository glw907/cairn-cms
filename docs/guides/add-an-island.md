# Add an island

An island is a directive component that renders a static fallback on the server and mounts a live Svelte
component over it in the browser. The fallback is real content for a no-JS reader and the page's first
paint; the live component adds interactivity on top. This guide walks you through declaring a hydrate
component, writing its live component, registering it, and wiring the client runtime. The worked example
is an expiring-announcement banner: it shows until a date passes, then renders nothing.

Islands are opt-in and additive. A site that registers none is unchanged and never ships the runtime.

## Prerequisites

- A running cairn site with an adapter and a component registry (see [Configure
  rendering](./configure-rendering.md)).
- A `+layout.svelte` at the site root where you can run code after navigation.

## Declare the hydrate component

A hydrate component is an ordinary [`defineComponent`](../reference/core.md#definecomponent) with
`hydrate: true`. Its `build()` output becomes the no-JS fallback, so make it class-driven (the render
pipeline's sink guard strips inline `style`) and high-fidelity: state the same content the live component
starts with, at the same size, so the swap on mount does not shift the layout.

The banner is attribute-only, so its fallback states the announcement and the live component adds the
interactivity: re-checking `expires` on its own once it hydrates, rather than trusting the server's
snapshot.

```ts
// src/lib/cairn.config.ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { strAttr } from '@glw907/cairn-cms/render';
import { h } from 'hastscript';
import { isBannerExpired } from './islands/banner-expiry.js';

const banner = defineComponent({
  name: 'banner',
  label: 'Announcement banner',
  description: 'A time-boxed announcement that removes itself once its expiry date passes.',
  hydrate: true,
  insertTemplate: ':::banner{message="Announcement text" expires="2026-12-31"}\n:::',
  attributes: {
    message: fields.text({ label: 'Announcement', required: true }),
    expires: fields.date({ label: 'Expires', required: true }),
  },
  build: (ctx) => {
    const message = strAttr(ctx, 'message') ?? '';
    const expires = strAttr(ctx, 'expires');
    if (isBannerExpired(expires)) return h('div', { hidden: true }, []);
    return h('div', { className: ['banner'] }, [h('p', [message])]);
  },
});
```

The directive's declared scalar attributes become the live component's props. A `number` field arrives
as a JSON number and a `boolean` field as a JSON boolean; every other field stays a string. Use
`'visible'` instead of `true` to defer the mount until the boundary scrolls into view.

## Write the live component

The live component is a plain Svelte 5 component. Its props are the directive's scalar attributes. Two
rules keep an island safe and stable:

- Derive computed values with `$derived`, never `$effect`. An `$effect` reactivity loop hangs the mount.
- Treat every prop as untrusted. The props are author-controlled, so bind them to text only, and never
  route one into a sink: `{@html}`, an `href` or `src` that could carry a `javascript:` scheme, or an
  inline `style`.

The banner's `Banner.svelte` shares its expiry check (`isBannerExpired`) with `build()`, so the two agree
on "expired" without any shared state: each evaluates it fresh, at its own render or hydration moment,
which is what lets a banner that expires between the build and the visit hide itself at hydration rather
than trusting a now-stale server render.

```svelte
<!-- src/lib/islands/Banner.svelte -->
<script lang="ts">
  import { isBannerExpired } from './banner-expiry.js';

  let { message = '', expires }: { message?: string; expires?: string } = $props();
  const expired = $derived(isBannerExpired(expires));
</script>

{#if !expired}
  <div class="banner" data-testid="banner-live">
    <p>{message}</p>
  </div>
{/if}
```

## Register the island

Add the live component to the adapter's `rendering.islands`, keyed by the directive name. `defineAdapter`
checks the registration at declaration: a `hydrate` component with no island entry, or an island entry
with no `hydrate` component, fails the build and names the offending directive. So the registration and
the `hydrate` flag stay in step.

```ts
// src/lib/cairn.config.ts
import Banner from '$lib/islands/Banner.svelte';

export const cairn = defineAdapter({
  // ...content, backend, email...
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
    components: registry, // the registry that includes `banner`
    islands: { banner: Banner },
  },
});
```

## Wire the client runtime

Call [`hydrateIslands`](../reference/islands.md#hydrateislands) from the site's root layout on
`afterNavigate`. It runs on first load and after every client-side navigation, and it tears down the
previous pass first, so it never stacks a duplicate instance. Import the runtime dynamically and gate it
on a non-empty registry, so a static site never ships the island client code.

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

## Use it

An author inserts the directive from the editor's block palette, or types it in markdown:

```md
:::banner{message="The trailhead lot closes for paving through Friday." expires="2026-08-01"}
:::
```

The page renders the fallback (the announcement) on the server, and the live banner mounts over it in
the browser, re-checking `expires` on its own. The edit page's preview shows the fallback, never the live
island, because the preview frame is sandboxed: verify the live behavior on the deployed page.

## See also

- [Islands reference](../reference/islands.md): the runtime, the boundary DOM contract, and the props trust boundary.
- [`hydrate` on the components reference](../reference/components.md#hydrate-and-the-island-boundary): the directive-side field.
- [`rendering.islands` on the core reference](../reference/core.md#renderingislands-adapter-member): the adapter registration.
