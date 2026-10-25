---
page: Write a markdown component
type: task guide
---

# Write a markdown component

:::reader
**Who reads it.** A Svelte-fluent developer building an organization's site on cairn who needs a block the site's markdown doesn't have yet. They write a custom public component beside the ones the site already declares, such as the nine a scaffolded site ships in `src/theme/markdown-components.ts`. :fact[qnf469]

**Why they arrive:**
- They want authors to insert a structured block, with fields and regions to fill, from the editor's picker, and to see it rendered in the site's markup. :fact[htxey1] :fact[rfeaa5]
- They are adding an island. An island starts as a component declared with `hydrate`, so they need the declaration first. :fact[4hd2vg]
- A component misbehaves: a directive prints as literal text, a component is missing from the picker, or the preview fails to render, and they want the cause. :fact[fqdknx] :fact[rfeaa5] :fact[3pzda1]

**What they already know.** TypeScript, and building a hast element with hastscript's `h()`. They know their adapter file, and their site already has a render function built with `createRenderer`: a scaffolded site ships one, and a hand-built site wrote one in the add-cairn tutorial. :fact[u4cfvv] :fact[q07rd5]

**Background.** Every entry becomes HTML through the adapter's `rendering.render`, and the edit page's preview and every public page call that same function. :fact[3l7f56]
The preview calls it in the editor's browser and the public route calls it from a server `load`, so a component's code runs in both places. :fact[vo5v7n]
An author writes a custom public component in the markdown as a container directive, and the component's `build` function turns that directive into markup. The render pipeline reads one registry of components through `createRenderer`, and the editor's picker reads the same registry through the admin page. :fact[htxey1] :fact[uqytbb] :fact[rrvh33]

**What the page does for them.** The introduction opens on that model and names the task: declare a component and its slots, write its `build`, shape its picker entry, register it, and check that the preview and the site's public pages render it alike. The body follows one running example, an `event` component with a date, a place, a details body, and an agenda list, which no scaffolded component duplicates.

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
- See [Scaffolded site files](scaffolded-site-files.md#srctheme) for that module and its nine components.

## Declare the component

*Give the reader the declaration's required members and the attributes an author sets, with the grammar rule that decides how a component is written.*

- `defineComponent` declares one container directive. It requires a `name`, a `label`, a `description`, and a `build` function. Its optional members include `attributes`, `slots`, `behavior`, and `hydrate`. :fact[htxey1]
- A component is always a container directive: an author writes `:::name[Title]{attrs}` and closes it with `:::`. A leaf `::name` or text `:name` form renders as its literal source text. :fact[fqdknx]
- The names `figure` and `include` belong to the engine's render steps. A component can't take either. :fact[cgwyp6]
- On a hand-built site, the file can be any module that the adapter imports.
- To declare the component, follow these steps:
1. In `src/theme/markdown-components.ts`, import `defineComponent` and `fields` from `@glw907/cairn-cms`, and `h` from `hastscript`. :fact[htxey1] :fact[2dsv35] :fact[qnf469]
2. In the same file, export a `defineComponent` call with the `name`, `label`, and `description`. :fact[htxey1]
3. In the call, add an `attributes` object that maps each attribute name to one `fields.*` descriptor. :fact[cxhx8w]
4. In the call, add a `build` stub that returns an empty `section` element. :fact[htxey1]

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
  build: () => h('section', { className: ['event'] }),
});
```

- An attribute takes a field type that serializes to one attribute string. The ten such types are `text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and `icon`. :fact[cxhx8w]
- Declaring an attribute of any other type, such as `multiselect` or `image`, throws when the module loads. The message includes `a directive attribute must be a single-value scalar`. :fact[cxhx8w]
- The insert form validates attributes with a fieldset, the same validator a concept's fields use. A cross-field rule goes in the component's `behavior` member, keyed by attribute name. :fact[zh8wdb] :fact[4iuce8]
- The render validates no attribute value. A hand-typed `date="banana"` still reaches `build` as the string `banana`. A `build` has to handle a value the form would refuse. :fact[4iuce8]
- A component with an attribute of type `icon` can also set `defaultIconByRole`, which maps a value of the directive's `role` attribute to a glyph key. When an author leaves the component's first attribute of type `icon` empty, the glyph key mapped to the directive's `role` fills that attribute. The map overrides the engine's default glyph for each role it names, and a role that neither names leaves the attribute empty. :fact[c7ruij]
- See [`defineComponent`](../reference/core.md#definecomponent) for every member, and [Fields](../reference/core.md#fields) for what each field type renders in the form.
- Setting `hydrate` makes the component an island. See [Add an island](add-an-island.md). :fact[4hd2vg]

## Declare the slots

*Show the reader how to declare the regions an author fills, with the members that shape each one in the insert form.*

- A slot's name sets its place in the directive. `title` is the bracketed label, `body` is the unmarked content, and any other name is a named region. :fact[0aatf6]
- Each slot is an object with the following members:
- `name` and `label`: the slot's key and the label the insert form shows. :fact[cefzv5]
- `kind`: `'inline'`, `'markdown'`, or `'repeatable'`. :fact[cefzv5]
- `required`: whether the insert form requires the slot. A required slot shows an asterisk, and **Insert** stays unavailable until it is filled. A touched, empty slot shows `<label> is required.` :fact[w7c3i6]
- `itemFields`, for a repeatable slot: the item's field. The insert form reads only the first declared field's key. Each item is one string under that key, or under `text` without `itemFields`. :fact[t4px7i]
- `itemLabel(item, index)`, for a repeatable slot: a function that names each row in the insert form. When it returns nothing or blank text, the row reads as the slot label plus the row number. :fact[bnqj5z] :fact[t4px7i]
- The render never reads `required`, so a hand-typed directive without the slot still renders. :fact[w7c3i6]
- In the `event` declaration, add a `slots` array with a required inline `title`, a markdown `body`, and a repeatable `agenda`. The `agenda` slot's `itemLabel` returns the item's text. :fact[cefzv5]
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
- The context builds no markup, so a `build` makes its markup with hastscript's `h()`. :fact[2dsv35]
- To draw an icon, it can call the engine's [`renderGlyph`](../reference/core.md#component-author-helpers). That function returns an `svg` element from the site's icon set, and it draws each path with `fill=currentColor` and no stroke. A path therefore needs filled shape data. A stroke-only path renders invisible unless the site's CSS adds a stroke. :fact[xbdb74]
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

- A `build` follows these rules:
- It can't `await`. Data a component needs is fetched outside the render. It reaches `build` through the directive's attributes or slots, or through a module-scope value that `build` closes over. :fact[s6n9zw]
- It can't depend on a server-only module, because the preview runs it in the editor's browser. :fact[vo5v7n]
- It needs no entrance-motion code. The engine stamps `data-rise` on each top-level component's result, carrying the component's index in document order. A site's CSS can map that index to an entrance delay. :fact[cefzv5]
- When the site's DaisyUI plugin config leaves a component enabled, DaisyUI generates CSS for that component's class names, such as `card-body`, found in scanned source. :fact[34wt4f]
- A component class that reuses one of those names takes DaisyUI's styling, so a component's inner classes need names that match none of them. The example's `event-*` classes follow that rule. :fact[34wt4f]
- A `build` that throws makes the whole render throw. :fact[3pzda1]
- See [`ComponentContext`](../reference/render.md#types).

## Shape the picker entry

*Show the reader the optional members that decide how the component appears in the editor's picker.*

- The editor's picker lists a component that declares an attribute, a slot, or an `insertTemplate`, unless the component sets `hidden`. :fact[rfeaa5]
- The following optional members shape its row:
- `icon`: a glyph key from the site's icon set, shown beside the label. :fact[c7ruij]
- `group`: the heading the row sits under. Groups appear in the order first declared. Ungrouped components form one group with no heading, placed where the first ungrouped component is declared. :fact[c7ruij] :fact[rfeaa5]
- `use`: one line on when to use the component. :fact[c7ruij]
- `hidden`: a flag that leaves the component out of the picker. The render still builds a hidden component whose directive an author types by hand. :fact[c7ruij]
- `preview`: a sample of attribute and slot values. When the admin page passes [`CairnAdmin`](../reference/admin.md#cairnadmin) a `render`, declaring it opens the insert form in two panes, with a live preview beside the form. :fact[c7ruij] :fact[rfeaa5]
- `insertTemplate`: the markdown inserted at the cursor when a component with no attributes and no slots is chosen. A component with either opens the insert form. :fact[rfeaa5]
- In the `event` declaration, add the picker members its row needs. :fact[c7ruij]
- Code: the members `event` adds, a group, a glyph from the scaffold's icon set, a use line, and a preview sample.

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

*Get the component into the registry that the render pipeline and the editor's picker read.*

- `defineRegistry({ components })` builds the registry. The render pipeline reads it through `createRenderer`, and the picker reads the `registry` prop the admin page passes to `CairnAdmin`. :fact[uqytbb] :fact[rrvh33]
- On a scaffolded site, the adapter builds its registry and renderer from the module's `components` list, and the admin page reads that registry. :fact[qnf469] :fact[u4cfvv] :fact[rrvh33]
- Registering the component there takes one step: at the end of `src/theme/markdown-components.ts`, add `event` to the `components` list. :fact[qnf469] :fact[u4cfvv]
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
- `defineRegistry` also throws for a component that sets a non-empty `defaultIconByRole` but declares no `icon` attribute. :fact[c7ruij]
- See [`defineRegistry`](../reference/core.md#defineregistry).

## Component authoring grammar

*Show the reader the markdown the component's insert form writes and the HTML `createRenderer` produces from it, before they check it in the editor.*

- The insert form writes a component with named slots inside a four-colon outer fence, and each filled named slot becomes a nested `:::name` container. :fact[co54dg] :fact[0aatf6]
- Code: the `event` directive as the insert form writes it: the title as the label, the details unmarked, and the agenda items as bullets.

```markdown
::::event[Annual meeting]{date="2026-11-04" place="Library annex"}
The board presents the annual report.

:::agenda
- Welcome
- Annual report
:::
::::
```

- Code: the HTML `createRenderer` produces for that directive, with the `data-rise` stamp the engine adds to `build`'s result.

```html
<section class="event" data-rise="0"><p class="event-name">Annual meeting</p><p class="event-when">2026-11-04, Library annex</p><div class="event-details"><p>The board presents the annual report.</p></div><ol class="event-agenda"><li>Welcome</li><li>Annual report</li></ol></section>
```

- The grammar follows these further rules:
- A repeatable slot's items are bullet lines inside its container. :fact[co54dg]
- The render drops a bracketed label when the component declares no `title` slot. :fact[co54dg]
- A component with no named slots takes a three-colon fence. :fact[co54dg]
- The engine's `:::figure` and `::include` directives aren't components. :fact[cgwyp6]
- A leaf or text form of any component name stays literal. :fact[fqdknx]

## Verify the component

*Walk the reader through checking the component from the picker to the site's public render, on the dev server.*

- A working component inserts from the picker, renders in the edit page's preview, and renders with the same classes on the site's public pages. :fact[rfeaa5] :fact[3l7f56] :fact[6c3amx]
- The check runs on the dev server under the dev backend, which holds each save in memory. Its last steps open a share link to the saved draft. :fact[dqjkci]
- The link's route renders the draft through the config the public entry pages use, so the check needs no publish and no deploy. :fact[6c3amx] :fact[dqjkci]
- A scaffolded site's `npm run dev` sets `CAIRN_DEV_BACKEND` to `1`, which turns the dev backend on. :fact[f21bcz]
- A hand-built site sets the variable by hand, and its share link also needs the preview route that [Share a draft preview](share-a-draft-preview.md#mount-the-preview-route) mounts. It needs a `PUBLIC_ORIGIN` var as well, because a mint with no `PUBLIC_ORIGIN` throws. :fact[dqnblw] :fact[6c3amx] :fact[sp2org]
- To verify the component, follow these steps:
1. In a terminal at the project root, start the dev server with the dev backend on: on a scaffolded site, run `npm run dev`; on a hand-built site, run `npm run dev` with `CAIRN_DEV_BACKEND` set to `1`, in the form [Verify the dev sign-in](add-cairn-to-a-sveltekit-app.md#verify-the-dev-sign-in) gives for your shell. :fact[f21bcz] :fact[dqnblw]
2. In the admin, open an entry. :fact[megde2] :fact[qwbmyj]
3. On the **Write** tab, select **Insert block**. :fact[megde2] :fact[qwbmyj]
4. In the picker, choose **Event** under the **Events** heading. :fact[rfeaa5]
5. In the insert form, check the fields, which open filled with the component's `preview` sample. :fact[c7ruij]
6. Select **Insert**. **Insert** stays unavailable while a required slot is empty. :fact[w7c3i6]
7. In the editor, check that the inserted markdown matches the directive in [Component authoring grammar](#component-authoring-grammar). :fact[co54dg]
8. Select the **Preview** tab. :fact[kv9hap] :fact[my6ci3]
9. In the preview, check that the component renders with its `event` classes. :fact[kv9hap] :fact[my6ci3]
10. On the edit page, select **Save**. :fact[76m2vf]
11. In the **Details** slide-over, in the **Share preview** group, select **Share preview link**. The group shows a link whose path is `/preview/<token>`; [Share a draft preview](share-a-draft-preview.md) covers the link and its lifetime. :fact[sp1mbt] :fact[76m2vf]
12. In a browser, open the link's `/preview/<token>` path on the dev server's address. The link names the site's configured origin, which can differ from the dev server's address. :fact[76m2vf] :fact[sp2org]
13. On the preview page, check that the component's element carries the classes that the edit page's preview showed. :fact[6c3amx] :fact[3l7f56]
- Stopping the dev server discards the saved edit and its link. :fact[dqjkci]

## Diagnose a failed check

*Map each failed check to its cause and fix, in the order the verification reaches them.*

- Each failed check traces to the component's declaration, the adapter's or admin page's wiring, or the markdown an author wrote, including a code fence's language. :fact[cxhx8w] :fact[rrvh33] :fact[fqdknx] :fact[dni13r]
- When a check fails, work through the following symptoms in order:
1. The site fails to load with an error that names the component. The message reports a bad attribute type, a reserved name, a `defaultIconByRole` without an `icon` attribute, or a `hydrate` component and a `rendering.islands` entry that don't match. For that pairing, see [Add an island](add-an-island.md). Fix the member the message names. :fact[cxhx8w] :fact[cgwyp6] :fact[c7ruij] :fact[mv684d]
2. The editor shows no **Insert block** button: the admin page passes `CairnAdmin` no `registry`, or the registry holds no component the picker lists. Pass it as [Register the component](#register-the-component) shows, or apply the fix in the next item. :fact[rrvh33] :fact[megde2]
3. The component is missing from the picker: it declares no attribute, no slot, and no `insertTemplate`, or it sets `hidden`. Declare one of the three, or remove `hidden`. :fact[rfeaa5]
4. The preview shows `The preview could not render this content.` The render threw, for example because `build` threw on a value it didn't expect. Make `build` handle any value an author can type, including one the insert form would refuse. :fact[3pzda1] :fact[4iuce8]
5. The directive prints as literal text: it was written as a leaf `::name` or text `:name` form. Rewrite it as a `:::name` container. :fact[fqdknx]
6. The component's content renders without its markup: no component in the registry `createRenderer` received has that name. Register it, or fix the directive's name. :fact[a2ltun]
7. A code block shows no token colors: its fence names no language, or one outside the highlighter's preloaded set (a `mermaid` fence passes through untouched). The highlighter renders that block as plain text. Name a preloaded language or its alias: `js`, `ts`, `jsx`, `tsx`, `svelte`, `html`, `css`, `json`, `bash`, `markdown`, `python`, `yaml`, or `sql`. :fact[dni13r]
8. The share link answers an error page. [Diagnose a refused link](share-a-draft-preview.md#diagnose-a-refused-link) maps the logged reason to a fix.
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
