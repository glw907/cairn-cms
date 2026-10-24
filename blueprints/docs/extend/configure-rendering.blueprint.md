---
page: Configure rendering
type: task guide
---

# Configure rendering

:::reader
**Who reads it.** A Svelte-fluent developer building an organization's site on cairn who needs a block the site's markdown doesn't have yet. They write a custom public component beside the ones the site already declares, such as the nine a scaffolded site ships in `src/theme/markdown-components.ts`. :fact[qnf469]

**Why they arrive:**
- They want authors to insert a structured block, with fields and regions to fill, from the editor's picker, and to see it rendered in the site's markup. :fact[htxey1] :fact[rfeaa5]
- They are adding an island. An island starts as a component declared with `hydrate`, so they need the declaration first. :fact[4hd2vg]
- A component misbehaves: a directive prints as literal text, a component is missing from the picker, or the preview refuses to render, and they want the cause. :fact[fqdknx] :fact[rfeaa5] :fact[3pzda1]

**What they already know.** TypeScript, and building a hast element with hastscript's `h()`. They know their adapter file, and their site already has a render function built with `createRenderer`: a scaffolded site ships one, and a hand-built site wrote one in the add-cairn tutorial. :fact[u4cfvv] :fact[q07rd5]

**Background.** Every entry becomes HTML through the adapter's `rendering.render`, and the edit page's preview and every public page call that same function. :fact[3l7f56]
The preview calls it in the editor's browser and the public route calls it from a server `load`, so a component's code runs in both places. :fact[vo5v7n]
A component is a container directive in the markdown that the site's `build` function turns into markup. One registry of components feeds the render pipeline through `createRenderer` and the editor's picker through the admin page. :fact[htxey1] :fact[uqytbb] :fact[rrvh33]

**What the page does for them.** The introduction opens on that model and names the task: declare a component, write its `build`, shape its picker entry, register it, and check that the preview and the published page render it alike. The body follows one running example, an `event` component with a date, a place, a details body, and an agenda list, which no scaffolded component duplicates.

**What it leaves to other pages:**
- Building the render function: the add-cairn tutorial and the `createRenderer` reference entry.
- Adding a remark plugin and setting the renderer options: the `createRenderer` reference entry. A scaffolded site already passes the smartypants plugin to its one `createRenderer` call. :fact[dat0dd]
- The classes the built-in render steps emit for code, tables, and figures: the render reference's emitted classes.
- What the sanitize floor and the sink guard protect: Render safety, in the security model.
- Hydrating a component in the browser: Add an island.
- Styling the rendered output: Style rendered markdown, in Theme your public site.
- Fragments and `::include`: Reuse content across entries.
- The media resolver and missing assets: Configure media.
:::

:::constraints
- Every code block names its file in a first-line comment. The running example lives in `src/theme/markdown-components.ts` on a scaffolded site; on a hand-built site it goes in any module the adapter imports.
- Every HTML output block is the output of running its input through `createRenderer` with the page's registry, trimmed only with an ellipsis comment, never retyped.
- Give no debounce figure for the preview.
- Never say `insertTemplate` seeds the guided form, `required` stops a directive from rendering, `itemFields` gives an item more than one field, or describe `SlotDef.help`.
- Never offer a scaffolded component as an example of the DaisyUI class-name rule.
- Hydration, styling, fragments, the media resolver, the render function, remark plugins, and the renderer options stay one linked sentence each, never a step.
- Use "custom public component" for what a site declares; never "site component" or "custom component".
- In task sections, keep each sentence under 26 words. Avoid the intensifier "own", runs of comma-hinged tails, and the em dash.
:::

## Before you begin

*Name what the site must have before the first declaration.*

- Before you write a component, make sure your site has the following:
- An adapter file whose `rendering.render` calls a renderer built with `createRenderer`. The adapter is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the add-cairn tutorial's site. :fact[q07rd5] :fact[u4cfvv]
- See [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter) and [`createRenderer`](../reference/core.md#createrenderer).
- The `hastscript` package, to build the markup a component returns. The scaffold lists it as a dependency; a hand-built site installs it with `npm install hastscript`. :fact[2dsv35]
- See [hastscript](https://github.com/syntax-tree/hastscript).
- A module that holds the components. A scaffolded site keeps them in `src/theme/markdown-components.ts`, and the adapter builds its registry from that module's `components` list. :fact[qnf469] :fact[u4cfvv]

## Declare the component

*Give the reader the declaration's required members and the attributes an author sets, with the grammar rule that decides how a component is written.*

- `defineComponent` declares one container directive. It requires a `name`, a `label`, a `description`, and a `build` function. Its optional members include `attributes`, `slots`, `behavior`, and `hydrate`. :fact[htxey1]
- A component is always a container directive: an author writes `:::name[Title]{attrs}` and closes it with `:::`. A leaf `::name` or text `:name` form renders as its literal source text. :fact[fqdknx]
- The names `figure` and `include` belong to the engine's render steps. A component can't take either. :fact[cgwyp6]
- To declare the component, follow these steps:
1. In `src/theme/markdown-components.ts`, import `defineComponent` and `fields` from `@glw907/cairn-cms`, and `h` from `hastscript`. :fact[2dsv35] :fact[qnf469]
2. In the same file, export a `defineComponent` call with the `name`, `label`, and `description`. :fact[htxey1]
3. In the call, add an `attributes` object that maps each attribute name to one `fields.*` descriptor. :fact[cxhx8w]
4. In the call, add a `build` stub that returns an empty `section`. :fact[htxey1]

- Code: the `event` declaration with its two attributes, a required `date` and an optional `place`, and a `build` stub that the build section completes.

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
  build: (ctx) => h('section', { className: ['event'] }),
});
```

- An attribute takes a field type that serializes to one attribute string. The ten such types are `text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and `icon`. :fact[cxhx8w]
- Any other type, such as `multiselect` or `image`, throws when the module loads. The message includes `a directive attribute must be a single-value scalar`. :fact[cxhx8w]
- The insert form validates attributes with a fieldset, the same validator a concept's fields use. A cross-field rule goes in the component's `behavior` member, keyed by attribute name. :fact[zh8wdb] :fact[4iuce8]
- The render validates no attribute value. A hand-typed `date="banana"` still reaches `build` as the string `banana`. A `build` has to handle a value the form would refuse. :fact[4iuce8]
- `defaultIconByRole` maps a value of the directive's `role` attribute to a glyph key. It overrides the engine's default glyph for each role it names. :fact[c7ruij]
- See [`defineComponent`](../reference/core.md#definecomponent) for every member, and [Fields](../reference/core.md#fields) for what each field type renders in the form.
- Setting `hydrate` makes the component an island. See [Add an island](add-an-island.md). :fact[4hd2vg]

## Declare the slots

*Show the reader how to declare the regions an author fills, with the members that shape each one in the insert form.*

- A slot's name sets its place in the directive. `title` is the bracketed label, `body` is the unmarked content, and any other name is a named region. :fact[0aatf6]
- Each slot is an object with the following members:
- `name` and `label`: the slot's key and the label the insert form shows. :fact[cefzv5]
- `kind`: `'inline'`, `'markdown'`, or `'repeatable'`. :fact[cefzv5]
- `required`: whether the insert form requires the slot. A required slot shows an asterisk, and **Insert** stays disabled until it is filled. A touched, empty slot shows `<label> is required.` :fact[w7c3i6]
- `itemFields`, for a repeatable slot: the item's field. The insert form reads only the first declared field's key. Each item is one string under that key, or under `text` without `itemFields`. :fact[t4px7i]
- `itemLabel(item, index)`, for a repeatable slot: a function that names each row in the insert form. When it returns nothing or blank text, the row reads as the slot label plus the row number. :fact[bnqj5z] :fact[t4px7i]
- The render never reads `required`, so a hand-typed directive without the slot still renders. :fact[w7c3i6]
- In the `event` declaration, add the `slots` array. :fact[cefzv5]
- Code: the `slots` array for `event`: a required inline `title`, a markdown `body`, and a repeatable `agenda` whose `itemLabel` returns the item's text.

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

*Give the reader the context `build` receives and the rules its output must follow, then the running example's `build`.*

- `build` runs once for each occurrence of the directive. It receives a context and synchronously returns one hast `Element`. :fact[s6n9zw]
- The context carries the following members:
- `attributes`: the declared attribute values, keyed by name, with a `boolean` as `true` or `false`. :fact[2dsv35] :fact[4iuce8]
- `slot(name)`: a slot's rendered children, or an empty array when the slot is absent. :fact[cefzv5]
- `items(name)`: a repeatable slot's items, one child list per item. :fact[cefzv5]
- `attr(key)`: a declared attribute's string value, `undefined` for a boolean or absent one. :fact[2dsv35]
- `node`: the stamped component element. :fact[2dsv35]
- The engine ships no hast-building helper beyond the context. A `build` makes its markup with hastscript's `h()`. :fact[2dsv35]
- In the `event` declaration, replace the `build` stub with the function that arranges the slots and attributes. :fact[2dsv35]
- Code: the `event` `build`, a `section` holding the name, the date and place, the details, and an ordered agenda list, with classes prefixed `event`.

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

- `build` can't `await`. Data a component needs is fetched outside the render and passed in through `attributes`. :fact[s6n9zw]
- `build` runs in the editor's browser for the preview and on the server for the public page. It can't depend on a server-only module. :fact[vo5v7n]
- On each top-level component's result, the engine stamps `data-rise`, the component's index in document order. A `build` needs no entrance-motion code. :fact[cefzv5]
- DaisyUI generates CSS for any of its component class names, such as `card-body`, that it finds in scanned source. A component's inner classes need names that match none of them. :fact[34wt4f]
- A `build` that throws makes the whole render throw. :fact[3pzda1]
- See [`ComponentContext`](../reference/render.md#types).

## Shape the picker entry

*Show the reader the optional members that decide how the component appears in the editor's picker.*

- The editor's picker lists a component that declares an attribute, a slot, or an `insertTemplate`. A `hidden` component stays out of the top-level picker. :fact[rfeaa5]
- The following optional members shape its row:
- `icon`: a glyph key from the site's icon set, shown beside the label. :fact[c7ruij]
- `group`: the heading the row sits under. Groups appear in the order first declared, and ungrouped components lead with no heading. :fact[c7ruij] :fact[rfeaa5]
- `use`: one line on when to reach for the component. :fact[c7ruij]
- `hidden`: a flag that leaves the component out of the top-level picker. :fact[c7ruij]
- `preview`: a sample of attribute and slot values. Declaring it opens the insert form in two panes, with a live preview beside the form. :fact[c7ruij] :fact[rfeaa5]
- `insertTemplate`: the markdown inserted at the cursor when a component with no attributes and no slots is chosen. A component with either opens the insert form. :fact[rfeaa5]
- In the `event` declaration, add the picker members its row needs. :fact[c7ruij]
- Code: the members `event` adds, a group, a glyph from the scaffold's icon set, a use line, and a preview sample.

```ts
// src/theme/markdown-components.ts (inside the event declaration)
group: 'Events',
icon: 'flag',
use: 'Announce a meeting, a race, or a workshop.',
preview: {
  attributes: { date: '2026-11-04', place: 'Library annex' },
  slots: {
    title: 'Annual meeting',
    body: 'Members vote on the new bylaws.',
    agenda: ['Welcome', 'Bylaws vote'],
  },
},
```

## Register the component

*Get the component into the registry that the render pipeline and the editor's picker read.*

- `defineRegistry({ components })` builds the registry. The render pipeline reads it through `createRenderer`, and the picker reads the `registry` prop the admin page passes to `CairnAdmin`. :fact[uqytbb] :fact[rrvh33]
- On a scaffolded site, add `event` to the `components` list at the end of `src/theme/markdown-components.ts`. The adapter's registry, renderer, and admin page already read that list. :fact[qnf469] :fact[u4cfvv] :fact[rrvh33]
- On a hand-built site, follow these steps:
1. In the adapter file, build the registry with `defineRegistry({ components: [event] })`. :fact[uqytbb]
2. In the same file, pass the registry as the first argument of the `createRenderer` call. :fact[uqytbb]
3. In the adapter's `rendering` group, set `components` to the registry. :fact[u4cfvv] :fact[mv684d]
4. In `src/routes/admin/[...path]/+page.svelte`, pass `registry={cairn.rendering.components}` to `CairnAdmin`. :fact[rrvh33]
- Code: the `CairnAdmin` element of the scaffold's admin page, `templates/waymark/src/routes/admin/[...path]/+page.svelte` in the engine repository, which passes the registry beside `render` and `icons`. :fact[rrvh33]

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

- An admin page that passes no `registry` shows no **Insert block** button. :fact[rrvh33] :fact[megde2]
- `defineRegistry` throws for a component named `figure` or `include`. The message says to remove the component if the built-in covers its use, or to rename it. :fact[cgwyp6]
- It also throws for a component that sets a non-empty `defaultIconByRole` but declares no `icon` attribute. :fact[c7ruij]
- See [`defineRegistry`](../reference/core.md#defineregistry).

## Component authoring grammar

*Show the reader the markdown the component's insert form writes and the HTML `createRenderer` produces from it, before they check it in the editor.*

- The insert form writes a component with named slots inside a four-colon outer fence. Each named slot is a nested `:::name` container. :fact[co54dg] :fact[0aatf6]
- Code: the `event` directive as the insert form writes it: the title as the label, the details unmarked, and the agenda items as bullets.

```markdown
::::event[Annual meeting]{date="2026-11-04" place="Library annex"}
Members vote on the new bylaws.

:::agenda
- Welcome
- Bylaws vote
:::
::::
```

- Code: the HTML `createRenderer` produces for that directive, with the `data-rise` stamp the engine adds to `build`'s result.

```html
<section class="event" data-rise="0"><p class="event-name">Annual meeting</p><p class="event-when">2026-11-04, Library annex</p><div class="event-details"><p>Members vote on the new bylaws.</p></div><ol class="event-agenda"><li>Welcome</li><li>Bylaws vote</li></ol></section>
```

- A repeatable slot's items are bullet lines inside its container. :fact[co54dg]
- A bracketed label is dropped when the component declares no `title` slot. :fact[co54dg]
- A component with no named slots takes a three-colon fence. :fact[co54dg]
- `:::figure` and `::include` are the engine's directives, not components, and a leaf or text form of any component name stays literal. :fact[fqdknx] :fact[cgwyp6]

## Verify the component

*Walk the reader through checking the component from the picker to the published page.*

- To verify the component, follow these steps:
1. In a terminal at the project root, start the dev server.
2. In the admin, open an entry. :fact[megde2] :fact[qwbmyj]
3. On the **Write** tab, select **Insert block**. :fact[megde2] :fact[qwbmyj]
4. In the picker, choose **Event** under the **Events** heading. :fact[rfeaa5]
5. In the form, fill the required fields. :fact[w7c3i6]
6. Select **Insert**. **Insert** stays disabled while a required slot is empty. :fact[w7c3i6]
7. In the editor, check that the inserted markdown matches the directive in [Component authoring grammar](#component-authoring-grammar). :fact[co54dg]
8. Select the **Preview** tab. :fact[kv9hap] :fact[my6ci3]
9. In the preview, check that the component renders with its `event` classes. :fact[kv9hap] :fact[my6ci3]
10. Publish the entry. :fact[3l7f56]
11. After the site deploys, on the public page, check that the component's element carries the classes the preview showed. :fact[3l7f56]

## Diagnose a failed check

*Map each failed check to its cause and fix, in the order the verification reaches them.*

- When a check fails, work through the following causes in order:
1. The site fails to load with an error that names the component. The message reports a bad attribute type, a reserved name, or a `defaultIconByRole` without an `icon` attribute. Fix the member the message names. :fact[cxhx8w] :fact[cgwyp6] :fact[c7ruij]
2. The editor shows no **Insert block** button: the admin page passes `CairnAdmin` no `registry`. Pass it as [Register the component](#register-the-component) shows. :fact[rrvh33] :fact[megde2]
3. The component is missing from the picker: it declares no attribute, no slot, and no `insertTemplate`, or it sets `hidden`. :fact[rfeaa5]
4. The preview shows `The preview could not render this content.` The render threw, often because `build` threw on an input it didn't expect. :fact[3pzda1]
5. The directive prints as literal text: it was written as a leaf `::name` or text `:name` form. Rewrite it as a `:::name` container. :fact[fqdknx]
6. The component's content renders without its markup: no component in the registry `createRenderer` received has that name. Register it, or fix the directive's name. :fact[a2ltun]
7. A code block shows no token colors: its fence names a language outside the highlighter's preloaded set. The highlighter renders that block as plain text. :fact[dni13r]
- See [Read the structured logs](debug-your-site.md#read-the-structured-logs) for a failure this list doesn't cover.

## See also

*Link the pages that cover what this page leaves out.*

- See [`createRenderer`](../reference/core.md#createrenderer).
- See [Emitted classes](../reference/render.md#emitted-classes).
- See [Render safety](security-model.md#render-safety).
- See [Add an island](add-an-island.md).
- See [Style rendered markdown](theme-your-public-site.md#style-rendered-markdown).
- See [Reuse content across entries](reuse-content-across-entries.md).
- See [Configure media](configure-media.md).
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
