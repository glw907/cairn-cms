# Write a markdown component

Every entry on a cairn site becomes HTML through the adapter's `rendering.render`, and the edit page's preview and every public page call that same function. The preview calls it in the editor's browser and the public entry route calls it from a server `load`, so a component's code runs in both places. An author writes a custom public component in the markdown as a container directive, and the component's `build` function turns that directive into markup. The render pipeline reads one registry of components through `createRenderer`, and the editor's picker reads the same registry through the admin page.

A new custom public component sits beside the ones a site already declares, such as the nine that a scaffolded site ships in `markdown-components.ts` under `src/theme/`. Writing one means declaring it and its slots, writing its `build` function, shaping its entry in the picker, registering it, and checking that the preview and the published page render it alike. The running example is an `event` component with a date, a place, a details body, and an agenda list.

The page serves a developer who wants authors to insert a structured block from the editor's picker, with fields and regions to fill, and to see it in the site's markup. It also serves a developer adding an island. An island starts as a component declared with `hydrate`, and its declaration is written here first. For a component that misbehaves, [Diagnose a failed check](#diagnose-a-failed-check) maps each symptom to its cause, from a directive printed as literal text to a preview that fails to render.

The page assumes you know TypeScript and can build a hast element with hastscript's `h()`. It also assumes an adapter file whose render function is built with `createRenderer`: a scaffolded site ships one, and the [add-cairn tutorial](add-cairn-to-a-sveltekit-app.md) writes one by hand.

This page leaves the following topics to the pages that cover them:

- Building the render function, in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) and the [`createRenderer`](../reference/core.md#createrenderer) entry.
- Adding a remark plugin and setting the renderer options, in the [`createRenderer`](../reference/core.md#createrenderer) entry. A scaffolded site already passes the smartypants plugin to its one `createRenderer` call.
- The classes the built-in render steps emit for code, tables, and figures, in [Emitted classes](../reference/render.md#emitted-classes).
- What the sanitize floor and the sink guard protect, in [Render safety](security-model.md#render-safety).
- Hydrating a component in the browser, in [Add an island](add-an-island.md).
- Styling the rendered output, in [Style rendered markdown](theme-your-public-site.md#style-rendered-markdown).
- Fragments and `::include`, in [Reuse content across entries](reuse-content-across-entries.md).
- The media resolver and missing assets, in [Configure media](configure-media.md).

## Before you begin

Before you write a component, make sure your site has the following:

- An adapter file whose `rendering.render` calls a renderer built with `createRenderer`. The adapter is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the add-cairn tutorial's site. The tutorial writes its adapter in [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter), and the [`createRenderer`](../reference/core.md#createrenderer) entry documents the renderer.
- The `hastscript` package, to build the markup a component returns. For its `h()` API, see [hastscript](https://github.com/syntax-tree/hastscript). The scaffold lists it as a dependency. On a hand-built site, install it with the following command:

  ```sh
  npm install hastscript
  ```

- A module that holds the components. A scaffolded site keeps them in `markdown-components.ts` under `src/theme/`, and the adapter builds its registry from that module's `components` list. [Scaffolded site files](scaffolded-site-files.md#srctheme) describes that module and its nine components.

## Declare the component

`defineComponent` declares one container directive. It requires a `name`, a `label`, a `description`, and a `build` function. Its optional members include `attributes`, `slots`, `behavior`, and `hydrate`.

An author always writes a component as a container directive, opening it with `:::name[Title]{attrs}` and closing it with `:::`. A leaf `::name` or text `:name` form renders as its literal source text. The names `figure` and `include` belong to the engine's render steps, and a component can't take either.

On a hand-built site, the file can be any module that the adapter imports.

To declare the component, follow these steps:

1. In `markdown-components.ts`, import `defineComponent` and `fields` from `@glw907/cairn-cms`, and `h` from `hastscript`.
2. In the same file, export a `defineComponent` call with the `name`, `label`, and `description`.
3. In the call, add an `attributes` object that maps each attribute name to one `fields.*` descriptor.
4. In the call, add a `build` stub that returns an empty `section` element.

The following declaration gives `event` a required `date` attribute, an optional `place` attribute, and a `build` stub that [Write the build function](#write-the-build-function) completes:

```ts
// src/theme/markdown-components.ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

export const event = defineComponent({
  name: 'event',
  label: 'Event',
  description: 'A dated event with its place and agenda.',
  attributes: {
    date: fields.date({ label: 'Date', required: true }),
    place: fields.text({ label: 'Place' }),
  },
  // slots: added in "Declare the slots"
  build: () => h('section', { className: ['event'] }),
});
```

An attribute takes a field type that serializes to one attribute string. The ten such types are `text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and `icon`. Declaring an attribute of any other type, such as `multiselect` or `image`, throws when the module loads. The message includes `a directive attribute must be a single-value scalar`.

Before the insert form inserts a component, it validates the attributes with the same fieldset validator that a concept's fields use. A cross-field rule goes in the component's `behavior` member, keyed by attribute name. The render validates no attribute value, and a hand-typed `date` of `banana` still reaches `build` as that string. A `build` has to handle a value the form would refuse.

A component with an attribute of type `icon` can also set `defaultIconByRole`, which maps a value of the directive's `role` attribute to a glyph key. When an author leaves the `icon` attribute empty, the glyph key for the directive's `role` fills it. The map overrides the engine's default glyph for each role it names.

The [`defineComponent`](../reference/core.md#definecomponent) entry lists every member. The [Fields](../reference/core.md#fields) table states what each field type renders in the form. Setting `hydrate` makes the component an island, and [Add an island](add-an-island.md) covers the rest.

## Declare the slots

A slot's name sets its place in the directive. A slot named `title` is the bracketed label, a slot named `body` is the unmarked content, and any other name is a named region.

Each slot is an object with the following members:

- `name` and `label`: the slot's key and the label the insert form shows.
- `kind`: `'inline'`, `'markdown'`, or `'repeatable'`.
- `required`: whether the insert form requires the slot. A required slot shows an asterisk, and **Insert** stays unavailable until the slot is filled. A touched, empty slot shows `<label> is required.`
- `itemFields`: for a repeatable slot, the item's field. The insert form reads only the first declared field's key. Each item is one string under that key, or under `text` when `itemFields` is absent.
- `itemLabel(item, index)`: for a repeatable slot, a function that names each row in the insert form. When it returns nothing or blank text, the row reads as the slot label plus the row number.

The render never reads `required`, so a hand-typed directive without the slot still renders.

- In the `event` declaration, add a `slots` array with a required inline `title`, a markdown `body`, and a repeatable `agenda`. The `agenda` slot's `itemLabel` returns the item's text:

  <!-- snippet-check-skip: a fragment of the event declaration -->
  ```ts
  // src/theme/markdown-components.ts (inside the event declaration)
  slots: [
    { name: 'title', label: 'Event name', kind: 'inline', required: true },
    { name: 'body', label: 'Details', kind: 'markdown' },
    {
      name: 'agenda',
      label: 'Agenda',
      kind: 'repeatable',
      itemFields: { text: fields.text({ label: 'Item' }) },
      itemLabel: (item) => String(item.text ?? ''),
    },
  ],
  ```

## Write the build function

`build` runs once for each occurrence of the directive. It receives a context and synchronously returns one hast `Element`.

The context carries the following members:

- `attributes`: the declared attribute values, keyed by name, with a `boolean` as `true` or `false`.
- `slot(name)`: a slot's rendered children, or an empty array when the slot is absent.
- `items(name)`: a repeatable slot's items, one child list per item.
- `attr(key)`: a declared attribute's string value, or `undefined` for a boolean or absent attribute.
- `node`: the stamped component element.

The context builds no markup, so a `build` makes its markup with hastscript's `h()`. To draw an icon, it can call the engine's [`renderGlyph`](../reference/core.md#component-author-helpers). That function returns an `svg` element from the site's icon set. Each path in that set holds filled shape data, because a stroke-only path renders invisible.

- In the `event` declaration, replace the `build` stub with a function that arranges the slots and attributes in one element:

  <!-- snippet-check-skip: a fragment of the event declaration -->
  ```ts
  // src/theme/markdown-components.ts (inside the event declaration)
  build: (ctx) =>
    h('section', { className: ['event'] }, [
      h('p', { className: ['event-name'] }, ctx.slot('title')),
      h('p', { className: ['event-when'] }, [
        ctx.attr('date') ?? '',
        ctx.attr('place') ? `, ${ctx.attr('place')}` : '',
      ]),
      h('div', { className: ['event-details'] }, ctx.slot('body')),
      h('ol', { className: ['event-agenda'] }, ctx.items('agenda').map((item) => h('li', item))),
    ]),
  ```

A `build` follows these rules:

- It can't `await`. Data a component needs is fetched outside the render and reaches `build` through `attributes`.
- It can't depend on a server-only module, because the preview runs it in the editor's browser.
- It needs no entrance-motion code. The engine stamps `data-rise` on each top-level component's result, carrying the component's index in document order. A site's CSS can map that index to an entrance delay.

When the site's DaisyUI plugin config leaves a component enabled, DaisyUI generates CSS for that component's class names, such as `card-body`, found in scanned source. A component class that reuses one of those names takes DaisyUI's styling, so a component's inner classes need names that match none of them. The example's `event-*` classes follow that rule.

A `build` that throws makes the whole render throw. The [`ComponentContext`](../reference/render.md#types) entry documents the context's types.

## Shape the picker entry

The editor's picker lists a component that declares an attribute, a slot, or an `insertTemplate`, unless the component sets `hidden`.

The following optional members shape the component's row:

- `icon`: a glyph key from the site's icon set, shown beside the label.
- `group`: the heading the row sits under. Groups appear in the order first declared. Ungrouped components form one group with no heading, placed where the first ungrouped component is declared.
- `use`: one line on when to use the component.
- `hidden`: a flag that leaves the component out of the picker. The render still builds a hidden component whose directive an author types by hand.
- `preview`: a sample of attribute and slot values. When the admin page passes [`CairnAdmin`](../reference/admin.md#cairnadmin) a `render`, declaring `preview` opens the insert form in two panes, with a live preview beside the form.
- `insertTemplate`: the markdown inserted at the cursor when an author chooses a component with no attributes and no slots. A component with either opens the insert form.

The `event` row sits under an **Events** heading, with a glyph, a use line, and a preview sample.

- In the `event` declaration, add the picker members:

  <!-- snippet-check-skip: a fragment of the event declaration -->
  ```ts
  // src/theme/markdown-components.ts (inside the event declaration)
  group: 'Events',
  icon: 'flag',
  use: 'Announce a meeting, a workshop, or a talk.',
  preview: {
    attributes: { date: '2026-11-04', place: 'Library annex' },
    slots: {
      title: 'Annual meeting',
      body: 'The board presents the annual report.',
      agenda: ['Welcome', 'Annual report'],
    },
  },
  ```

## Register the component

`defineRegistry({ components })` builds the registry. The render pipeline reads it through `createRenderer`, and the picker reads the `registry` prop that the admin page passes to `CairnAdmin`.

On a scaffolded site, the adapter builds its registry and renderer from the module's `components` list, and the admin page reads that registry. Registering the component takes one step:

- At the end of `markdown-components.ts`, add `event` to the `components` list.

On a hand-built site, follow these steps:

1. In the adapter file, build the registry with `defineRegistry({ components: [event] })`.
2. In the same file, pass the registry as the first argument of the `createRenderer` call.
3. In the adapter's `rendering` group, set `components` to the registry.
4. In `src/routes/admin/[...path]/+page.svelte`, pass `registry={cairn.rendering.components}` to `CairnAdmin`.

The scaffold's admin page passes the registry to `CairnAdmin` beside the render function:

<!-- snippet-check-skip: an excerpt of the admin page's markup, with its script elided -->
```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<CairnAdmin
  {data}
  {form}
  render={cairn.rendering.render}
  registry={cairn.rendering.components}
  icons={cairn.rendering.icons}
/>
```

An admin page that passes no `registry` shows no **Insert block** button. `defineRegistry` throws for a component named `figure` or `include`. Its message says to remove the component if the built-in covers its use, or to rename it. `defineRegistry` also throws for a component that sets a non-empty `defaultIconByRole` but declares no attribute of type `icon`. The [`defineRegistry`](../reference/core.md#defineregistry) entry documents the registry.

## Component authoring grammar

The insert form writes a component with named slots inside a four-colon outer fence, and each filled named slot becomes a nested `:::name` container.

The insert form writes the `event` directive with the title as the label, the details unmarked, and the agenda items as bullets:

```markdown
::::event[Annual meeting]{date="2026-11-04" place="Library annex"}
The board presents the annual report.

:::agenda
- Welcome
- Annual report
:::
::::
```

`createRenderer` turns that directive into the following HTML, including the `data-rise` stamp that the engine adds to the result of `build`:

```html
<section class="event" data-rise="0"><p class="event-name">Annual meeting</p><p class="event-when">2026-11-04, Library annex</p><div class="event-details"><p>The board presents the annual report.</p></div><ol class="event-agenda"><li>Welcome</li><li>Annual report</li></ol></section>
```

The grammar follows these further rules:

- A repeatable slot's items are bullet lines inside its container.
- The render drops a bracketed label when the component declares no `title` slot.
- A component with no named slots takes a three-colon fence.
- The engine's `:::figure` and `::include` directives aren't components.
- A leaf or text form of any component name stays literal.

## Verify the component

A working component inserts from the picker, renders in the edit page's preview, and carries the same classes on the published page. On the dev server, the admin runs on the dev backend, and a publish there never leaves the machine. The published-page check therefore runs on the deployed site, after the component's code deploys.

To verify the component, follow these steps:

1. In a terminal at the project root, start the dev server.
2. In the admin, open an entry.
3. On the **Write** tab, select **Insert block**.
4. In the picker, under the **Events** heading, choose **Event**.
5. In the insert form, fill the required fields.
6. In the insert form, select **Insert**. **Insert** stays unavailable while a required slot is empty.
7. In the editor, check that the inserted markdown matches the directive in [Component authoring grammar](#component-authoring-grammar).
8. In the toolbar, select the **Preview** tab.
9. In the preview, check that the component renders with its `event` classes.
10. From the site repository, deploy the component's code.
11. In the deployed site's admin, insert the component into an entry.
12. In the deployed site's admin, publish the entry.
13. After the site deploys, on the public page, check that the component's element carries the classes the preview showed.

## Diagnose a failed check

Each failed check traces to the component's declaration, the admin page's wiring, or the markdown an author wrote, including a code fence's language.

When a check fails, work through the following symptoms in order:

1. The site fails to load with an error that names the component. A bad attribute type, a reserved name, and a `defaultIconByRole` without an `icon` attribute each throw that error. So does a `hydrate` component without a matching `rendering.islands` entry, or an entry without its component. For that pairing, see [Add an island](add-an-island.md). Fix the member the error names.
2. The editor shows no **Insert block** button. Either the admin page passes `CairnAdmin` no `registry`, or the registry holds no component the picker lists. Pass the registry as [Register the component](#register-the-component) shows, or apply the fix in the next item.
3. The component is missing from the picker. It declares no attribute, no slot, and no `insertTemplate`, or it sets `hidden`. Declare one of the three, or remove `hidden`.
4. The preview shows `The preview could not render this content.` The render threw, for example because `build` threw on a value it didn't expect. Make `build` handle any value an author can type, including one the insert form would refuse.
5. The directive prints as literal text. It was written in the leaf `::name` or text `:name` form. Rewrite it as a `:::name` container.
6. The component's content renders without its markup. No component in the registry that `createRenderer` received has the directive's name. Register the component, or correct the directive's name.
7. A code block shows no token colors. Its fence names no language, or a language outside the highlighter's preloaded set, and the highlighter renders it as plain text. A `mermaid` fence passes through untouched. Name a preloaded language or its alias: `js`, `ts`, `jsx`, `tsx`, `svelte`, `html`, `css`, `json`, `bash`, `markdown`, `python`, `yaml`, or `sql`.

For a failure this list doesn't cover, see [Read the structured logs](debug-your-site.md#read-the-structured-logs).

## See also

The following pages document the renderer and the tasks beside this one:

- [`createRenderer`](../reference/core.md#createrenderer): the render function, remark plugins, and the renderer options.
- [Emitted classes](../reference/render.md#emitted-classes): the classes the built-in render steps emit.
- [Render safety](security-model.md#render-safety): what the sanitize floor and the sink guard protect.
- [Add an island](add-an-island.md): hydrating a component in the browser.
- [Style rendered markdown](theme-your-public-site.md#style-rendered-markdown): styling the rendered output.
- [Reuse content across entries](reuse-content-across-entries.md): fragments and `::include`.
- [Configure media](configure-media.md): the media resolver and missing assets.
- [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md): the hand-built site, its adapter, and its render function.
