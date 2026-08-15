# Add an island

**Contract:** hydrate one interactive Svelte component inside otherwise-static rendered content.

**Precondition:** [Configure rendering](./configure-rendering.md), for the component-registration
mechanics an island builds on.

Every component you register renders to static hast by default: real markup, no client
JavaScript. An island is the opt-in exception, a component whose static output is a fallback,
mounted over by a live Svelte component once JavaScript runs in the browser. cairn ships no
framework abstraction here; the runtime mounts with Svelte's own `mount()`/`unmount()` directly,
since cairn is Svelte-only by design.

## Declare the directive as hydrating

Add `hydrate: true` to the component definition:

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

const converter = defineComponent({
  name: 'converter',
  label: 'Unit converter',
  description: 'A live mi-to-km converter; shows a static conversion with no JavaScript.',
  hydrate: true,
  build: (ctx) => h('p', {}, `${ctx.attributes.from ?? ''} converts to about ${ctx.attributes.to ?? ''}`),
  attributes: {
    from: fields.text({ label: 'From' }),
    to: fields.text({ label: 'To' }),
  },
});
```

`build()` still runs; its output becomes the fallback, the content every reader sees before the
runtime mounts, and the only content a reader without JavaScript ever sees. Write it as real
content, not a placeholder: the same size and shape as the mounted component's initial state, so
the swap doesn't shift the layout.

`hydrate: true` mounts eagerly, on first load and after every client-side navigation.
`hydrate: 'visible'` defers to first intersection instead, for a component far enough down the
page that mounting it immediately would be wasted work.

## Build the live component

```svelte
<!-- src/theme/islands/Converter.svelte -->
<script lang="ts">
  interface Props {
    from?: string;
    to?: string;
  }
  let { from = '', to = '' }: Props = $props();
</script>

<p>{from} converts to about {to}</p>
```

Props arrive exactly as the directive's declared scalar attributes: a `number` field parses to a
JSON number, a `boolean` field to a JSON boolean, and every other field stays the literal string
the author typed. **Every prop is untrusted.** The pipeline HTML-attribute-escapes them on emit
and the client `JSON.parse`s them in a `try`/`catch`, which is safe against breakout only because
the value never enters a script context; an island author still has to bind a prop to text only
and never route one into `{@html}`, an `href`/`src` that could carry a `javascript:` scheme, or
an inline `style`. The engine guarantees the prop arrives as escaped data, nothing more.

## Register it

Register the live component under the same directive name on the adapter's `rendering.islands`,
beside `render`:

<!-- snippet-check-skip: illustrates the rendering member's islands key inside the adapter's rendering object opened above -->
```ts
import Converter from '../theme/islands/Converter.svelte';

rendering: {
  render: /* ... */,
  components: registry,
  islands: { converter: Converter },
},
```

`defineAdapter` fails closed at declaration if a `hydrate` component has no matching islands
entry, or vice versa, naming the mismatched directive.

## Mount the runtime

One call, from your root layout, after every navigation:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { cairn } from '$lib/cairn.config.js';

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

The empty-registry guard keeps the dynamic import out of a static site's bundle entirely, so a
site with no islands ships none of this code. `hydrateIslands` tears down the previous pass
before mounting again, so navigating back to a page with an island mounts one instance, never a
stack of duplicates. One bad island (an unregistered directive name, a prop that fails to parse,
a component that throws on mount) is isolated: the static fallback stays in place for that one
boundary, and every other island on the page still mounts.

## Where you can't see it

The edit page's preview frame is sandboxed and never runs scripts, so it always shows the static
fallback, never the mounted component. Verify a live island on the deployed page (or `npm run
preview`), not in the admin.

**You know it worked when:** the page shows the static fallback on first paint with JavaScript
disabled, and the live component replaces it, with no layout shift, once JavaScript runs.
