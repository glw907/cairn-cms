# Markdown components and islands

A component is a container directive (`:::name[Title]{attr="v"}` ... `:::`) whose `build()` returns
one hast element. The same `build()` runs on the server for public pages and in the editor's
browser for the preview. An island is a component declared with `hydrate`: the engine wraps the
`build()` output in a boundary, and a live Svelte component mounts over it in the browser. The
`build()` output stays as the first paint and the only content a reader without JavaScript sees.

Contents:

- [Declare and register](#declare-and-register)
- [Write a build that cannot throw](#write-a-build-that-cannot-throw)
- [Picker and authoring grammar](#picker-and-authoring-grammar)
- [Make it an island](#make-it-an-island)
- [Diagnose](#diagnose)

## Declare and register

On a scaffold, components live in `src/theme/markdown-components.ts` and the adapter builds the
registry from its exported `components` list. Adding one takes two edits there: the
`defineComponent` call and an entry in `components`. A hand-built site passes
`defineRegistry({ components })` to `createRenderer` as `components`, sets `rendering.components`, and passes
`registry={cairn.rendering.components}` to `CairnAdmin` (no registry, no **Insert block** button).

- `name`, `label`, `description`, `build` are required. `figure` and `include` are reserved.
- `attributes` map to single-value field types only (`text`, `textarea`, `number`, `select`, `url`,
  `email`, `date`, `datetime`, `boolean`, `icon`); others throw at load.
- `slots`: `title` is the bracketed label, `body` the unmarked content, any other name a nested
  `:::name` region. `kind` is `inline`, `markdown`, or `repeatable`. `required` affects only the
  insert form.
- `build` is synchronous, imports nothing server-only (it runs in the editor's browser), and needs no
  entrance motion (`data-rise` is stamped for you). Avoid class names daisyUI generates (`card-body`).

## Write a build that cannot throw

The insert form validates attributes, but the render validates nothing: a hand-typed
`date="banana"`, an empty attribute, or a missing one reaches `build` as is. A `build` that throws
fails the whole render: the preview shows `The preview could not render this content.` and a public
page fails its build or answers 500. Handle every value an author can type.

```ts
// src/theme/markdown-components.ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

export const countdown = defineComponent({
  name: 'countdown',
  label: 'Countdown',
  description: 'Days left until a date, counting down live.',
  attributes: {
    label: fields.text({ label: 'Label', required: true }),
    date: fields.date({ label: 'Date', required: true }),
  },
  hydrate: 'visible',
  build: (ctx) => {
    // Any string or none can arrive here; the fallback reads with JavaScript off and never throws.
    // It computes nothing from the clock, since a prerendered count would go stale.
    const label = ctx.attr('label') ?? '';
    const date = ctx.attr('date') ?? '';
    return h('p', { className: ['countdown'] }, [h('strong', label), date ? ` ${date}` : '']);
  },
});

export const components = [countdown];
```

`ctx.attr(key)` returns the string or `undefined`; `ctx.attributes` carries typed values;
`ctx.slot(name)` and `ctx.items(name)` return rendered children (empty when absent). A cross-field
attribute rule for the insert form goes in the component's `behavior` member.

## Picker and authoring grammar

The picker lists a component that declares an attribute, a slot, or an `insertTemplate`, unless
`hidden`. `group`, `icon`, `use`, and `preview` (sample values, which open a live preview pane) shape
its row. The insert form writes a component with named slots inside a four-colon fence, each named
slot a nested `:::name`, a repeatable slot's items as bullets. A leaf `::name` or text `:name` stays
literal text; only `::include` is a leaf directive.

## Make it an island

A scaffold already has the registry (`src/theme/islands/registry.ts`), the adapter's
`rendering.islands`, the root load's `hasIslands`, and the root layout's `hydrateIslands` call. Add
three things and leave the layout, root load, and adapter alone:

1. The live component in `src/theme/islands/`:

   ```svelte
   <!-- src/theme/islands/Countdown.svelte -->
   <script lang="ts">
     interface Props {
       label?: string;
       date?: string;
     }

     let { label = '', date = '' }: Props = $props();
     let now = $state(Date.now());

     $effect(() => {
       const timer = setInterval(() => (now = Date.now()), 60_000);
       return () => clearInterval(timer); // islands unmount on every navigation
     });

     let days = $derived.by(() => {
       const time = Date.parse(date);
       return Number.isNaN(time) ? null : Math.ceil((time - now) / 86_400_000);
     });
   </script>

   <p class="countdown"><strong>{label}</strong> {date}{#if days !== null} ({days} days){/if}</p>
   ```

   Props arrive as the author wrote them: a `number` attribute as a number, a `boolean` as a
   boolean, everything else a string, and an unset attribute not at all (the default applies). They
   are untrusted: render them only as text. Never route one into `{@html}`, `href`, `src`, or an
   inline `style`, and never emit a `<script>` from `build`. Parse dates defensively. Clean up timers
   in the `$effect` return. Match the fallback's markup and size to avoid a layout shift; the
   runtime moves no focus.
2. One registry entry under the directive name, beside the existing ones:
   `export const siteIslands: IslandRegistry = { banner: Banner, countdown: Countdown };`
   (`IslandRegistry` from `@glw907/cairn-cms/islands`).
3. `hydrate: true` (mount on load and after each navigation) or `'visible'` (on first
   intersection) on the declaration.

`defineAdapter` throws if a `hydrate` component has no `rendering.islands` entry, or an entry has no
`hydrate` component.

Hand-built site: also pass the registry as `rendering.islands`, return
`{ hasIslands: Object.keys(siteIslands).length > 0 }` from the root `+layout.server.ts`, and in the
root `+layout.svelte` call `hydrateIslands(siteIslands)` from `afterNavigate`, returning before both
dynamic imports when `data.hasIslands` is false (so a site with no islands never requests the
runtime or registry):

<!-- snippet-check-skip: the dynamic import names the site's registry module, which only the site declares -->
```svelte
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import type { Snippet } from 'svelte';
  let { data, children }: { data: { hasIslands: boolean }; children: Snippet } = $props();

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

Keep the registry in its own module and import it, never the adapter module, on the client: the
adapter carries the renderer, icons, and media manifest into every public page.

## Diagnose

Check islands on the built public page (`npm run build`, then `npm run preview`); the editor preview
is sandboxed and always shows the fallback. The prerendered HTML carries
`data-cairn-island="<name>"` and `data-cairn-props` JSON (`data-cairn-hydrate="visible"` for a
visible island).

| Symptom | Cause |
|---|---|
| Error naming the component at load | Bad attribute type, reserved name, `defaultIconByRole` without an `icon` attribute, or the hydrate/islands pairing |
| No **Insert block** button | `CairnAdmin` gets no `registry`, or no listable component |
| Missing from the picker | No attribute, slot, or `insertTemplate`, or `hidden` |
| `The preview could not render this content.` | `build` threw on an unexpected value |
| Directive prints as text | Leaf or text form; use `:::name` |
| Content renders without markup | Not in the registry `createRenderer` received, or a name mismatch |
| No boundary in the HTML | `hydrate` unset |
| Boundary, fallback stays, runtime never loads | `hasIslands` false or no `afterNavigate` call |
| Runtime loads, fallback stays | Not scrolled to (visible), registry key mismatch, bad props JSON, or the component threw on mount (all silent) |
