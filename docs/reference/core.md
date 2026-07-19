# Core (`@glw907/cairn-cms`)

The root export is the engine. It carries the adapter and schema contract a site declares, the
markdown render pipeline, the composed runtime, the content and manifest projections, and the auth
and GitHub App primitives. A site imports it at `src/lib/cairn.config.ts` and in its admin and
delivery code.

```ts
import { defineAdapter, defineConcept, fieldset, fields, createRenderer } from '@glw907/cairn-cms';
import type { CairnAdapter, ComponentDef } from '@glw907/cairn-cms';
```

The `.` entry carries the public construction surface: the adapter and schema constructors, the read
helpers a site calls on its own routes, and the types that name their signatures. **Stable API** is
the deliberate public surface, each primary entry point with a worked snippet. **Types** is a table
of the public type aliases and interfaces. The TypeScript types in `src/lib` are the source of
truth, and the export-coverage gate checks every name here against them.

The public delivery read surface lives at [`/delivery`](./delivery.md) and
[`/delivery/data`](./delivery-data.md); the root no longer re-exports it.

---

## Stable API

### Adapter and schema

A site's adapter is the one seam the engine consumes. It declares the content concepts, the render,
and the GitHub backend.

#### `defineAdapter`

Stability tier: Extension API.

```ts
declare function defineAdapter<const A extends CairnAdapter>(adapter: A): A;
```

Declare a site's adapter while preserving each concept's concrete fieldset type for typed reads. The
return value is the adapter itself, narrowed. The adapter has six groups: `content`, `backend`,
`email`, `rendering`, `media`, and `editor`.

```ts
// examples/showcase/src/theme/cairn.config.ts
import { defineAdapter, defineConcept, fieldset, fields, githubApp, createRenderer } from '@glw907/cairn-cms';
import { registry, icons } from './components.js';

const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
  },
  backend: githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@showcase.test' },
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
    components: registry,
    icons,
  },
});
```

#### `githubApp`

Stability tier: Extension API.

```ts
declare function githubApp(config: {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  installationId: string;
}): GithubAppProvider;
```

The default backend: a GitHub App over a repo branch, and the value the adapter's `backend` field
takes. It carries the App's non-secret identity, the `owner`, `repo`, `appId`, and `installationId`.
The private key stays the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`, which the engine reads at request
time and never from the adapter source. The engine resolves one live `Backend` per request from the
provider, so a different store such as GitLab, Gitea, or plain git can supply its own provider later
without the engine changing. The backend covers read, commit, and branch operations over files. It's
deliberately not a query interface, so content querying stays build-time over the committed manifest.

#### `defineConcept`

Stability tier: Extension API.

```ts
declare function defineConcept<const C extends ConceptConfig>(concept: C): C;
```

Declare one concept while preserving its fieldset type for typed reads, the concept-level companion
to `defineAdapter`. It also validates the concept's URL policy at declaration, so a bad `permalink`,
`datePrefix`, or `routing` throws at module load rather than defaulting or resolving silently. A
concept declares its routing with `routing` (the `'feed'`, `'page'`, or `'embedded'` shorthand only)
and its URL policy with `permalink` and `datePrefix`; an omitted `routing` is `'page'`. When the
resolved permalink uses a date token (`:year`, `:month`, or `:day`), the concept must declare a
field named `date` of type `date`; `defineConcept` and `normalizeConcepts` both throw at
declaration on a missing or wrong-typed one, and both normalize the declared field to
`required: true`, since the permalink can't resolve without it. An omitted `singular` falls back to
`label` with no warning, so a plural `label` like `'Posts'` reads "New Posts" on the create
affordances until you declare `singular: 'post'`. Declare `singular` on every concept.

The concept key `fragments` reserves reusable content: declare it to include one entry's body
inside another with [the `::include` directive](./authoring-syntax.md#include-a-fragment). It
must use `routing: 'embedded'`, and `normalizeConcepts` throws otherwise. The include directive
resolves against a non-routable concept, and an embedded entry publishing its own live page would
make the same content reachable two ways.

<!-- snippet-check-skip: illustrates one concept's url-policy fields inside the adapter's content object opened above -->
```ts
posts: defineConcept({
  dir: 'src/content/posts',
  routing: 'feed',
  permalink: '/:year/:month/:slug',
  datePrefix: 'month',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
  }),
}),
```

#### `supportContact` (adapter `editor` member)

A free-form string the in-admin help points a stuck editor to: an email address, a URL, or a name and
instruction. Unset, `composeRuntime` defaults it to `https://cairn.pub/help`, cairn's own hosted editor
help. A site that sets its own value overrides that default, and a site that sets an explicit empty
string gets the prior self-serve state back: the Help home renders no hand-off. Optional.

<!-- snippet-check-skip: illustrates one adapter editor member's value in isolation -->
```ts
supportContact: 'help@example.org',
```

#### `preview` (adapter `editor` member)

```ts
interface PreviewConfig {
  stylesheets: string[];
  bodyClass?: string;
  containerClass?: string;
  byConcept?: Record<string, { bodyClass?: string; containerClass?: string }>;
}
```

How the edit page's preview frame reproduces the live site's content styling. Chrome isolation
means the admin deliberately never loads the site's CSS, so a design-accurate preview needs the
site to name its compiled stylesheets here; without the knob the preview renders unstyled markup.
`composeRuntime` passes the value through to the runtime untouched.

`stylesheets` holds absolute or root-relative URLs linked inside the preview document. A Vite
`?url` import of the site's CSS entry resolves the hashed asset URL at build time. `bodyClass`
applies theme or typography root classes to the preview document's body, and `containerClass`
wraps the rendered content in the site's content container (a prose or measure class); when
omitted, the content renders bare. The frame's srcdoc pins a white body background by default,
deliberately overridable, so a site whose ground is not white should state its body background in
one of the named stylesheets.

`byConcept` overrides `bodyClass` and `containerClass` per concept, keyed by concept id, for a
site whose concepts wrap content differently (a blog whose posts render inside a post module while
its pages use a static-page wrapper). An entry's preview resolves the override for its concept
over the top-level values, key by key: a missing override key keeps the top-level value, and only
a string replaces it. Stylesheets are always shared. `editLoad` ships the already-resolved flat
shape, so the map itself never reaches the client.

<!-- snippet-check-skip: illustrates the preview member's shape in isolation; the worked example below shows it in full context -->
```ts
preview: {
  stylesheets: [siteCssUrl],
  bodyClass: 'static-page',
  containerClass: 'page-measure',
  byConcept: {
    posts: { bodyClass: 'post-body', containerClass: 'post-module' },
  },
},
```

The named sheet must be referenced only through `?url`, with the site layout linking the resolved
URL from a `<svelte:head>`. A layout that also imports the same file statically folds it into the
layout's CSS chunk, and that chunk's basename differs between the client and server builds, so the
URL the server-rendered edit page hands the frame names a file the client build never serves.

Even done right, the `?url` import in the layout and the one in the adapter resolve through the
client and the server build pipelines separately, so two hashed copies of the same sheet ship: the
page links the client copy, the preview frame links the server copy. That is by design, not a
defect: the build legitimately ships both copies.

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in the first worked example above) to focus on the editor.preview member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';
import appCssUrl from './app.css?url';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  editor: {
    preview: {
      stylesheets: [appCssUrl],
      bodyClass: 'bg-base-100',
      containerClass: 'prose mx-auto',
    },
  },
});
```

```svelte
<!-- src/routes/(site)/+layout.svelte: the same URL, linked instead of statically imported -->
<script lang="ts">
  import appCssUrl from '$lib/app.css?url';
</script>

<svelte:head>
  <link rel="stylesheet" href={appCssUrl} />
</svelte:head>
```

#### `media` (adapter member)

```ts
interface AssetConfig {
  bucketBinding: string;
  publicBase?: string;
  urlForm?: 'slug' | 'opaque';
  maxUploadBytes?: number;
  allowedTypes?: string[];
  variants?: Record<string, VariantSpec>;
  transformations?: boolean;
}

interface VariantSpec {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'face' | string;
  format?: 'auto' | 'webp' | 'avif' | string;
}
```

A site turns on R2-backed media by declaring `media`; omitting it leaves media off. `bucketBinding`
names the R2 bucket bound to the Worker and is the one required field. `publicBase` is the delivery
base path (default `/media`), and `urlForm` chooses whether the public URL carries the slug
(`/media/<slug>.<hash>.<ext>`, the default) or stays opaque (`/media/<aa>/<hash>.<ext>`).
`maxUploadBytes` (default 25 MB) and `allowedTypes` (default the common web image types) bound an
upload. `variants` are named Cloudflare Images presets, merged over the built-in `thumb`, `inline`,
`card`, and `hero` presets, so a same-named entry overrides a built-in.

`transformations` (default `false`) declares whether Cloudflare Image Transformations are enabled
for the zone. This is a per-zone setting that the dashboard or API turns on, not something a Worker
can flip. While it is off, the media resolver serves the bare full-size delivery path and ignores
any preset, so a fresh zone gets correct full-size thumbnails rather than dead `/cdn-cgi/image`
URLs. Flip it to `true` only after enabling Transformations on the zone.

Content references a stored asset by a logical handle, `media:<slug>.<hash>` (or the bare
`media:<hash>`), the same shape as the `cairn:` link scheme. The hash is the content identity and the
slug is cosmetic, so a rename never breaks a reference. At render, the handle rewrites to a delivery
URL, and a variant becomes a `/cdn-cgi/image/<options>/...` transform over that path. See the
[media storage explanation](../explanation/media-storage.md) for the full model. This grew from a
reserved seam, so it is additive: a site that declares no `media` is unchanged, and the author-facing
upload surface lands in a later phase on this substrate.

#### `defineRegistry`

Stability tier: Extension API.

```ts
declare function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry;
```

Build a component registry from a site's component definitions. The render pipeline (the directive
stamp plus the rehype dispatch) and the editor palette both read it.

```ts
import { defineRegistry } from '@glw907/cairn-cms';
import { callout, alert } from './components.js';

const registry = defineRegistry({ components: [callout, alert] });
```

#### `defineComponent`

Stability tier: Extension API.

```ts
declare function defineComponent<const D extends ComponentDef>(def: D): D & { attributeSchema: Fieldset };
```

Declare one component while building its attribute validator from the `fields.*` descriptors, the
component-level companion to `defineConcept`. A directive attribute is one flat string, so the
attributes are a `fields.*` record of scalar leaves: `text`, `textarea`, `number`, `select`, `url`,
`email`, `date`, `datetime`, `boolean`, and `icon`. An `object`, `array`, `reference`, or `image`
attribute throws at declaration. It validates at declaration like `defineConcept`, so a bad type or a
malformed pattern fails at module load rather than at first insert. The built `attributeSchema` is a
`Fieldset`, the engine's own component-grammar validator runs it, so a component attribute and a
concept field validate through identical code. A cross-field attribute rule lives in the co-bundled
`behavior` table, keyed by attribute name.

A component opts into client hydration with `hydrate?: boolean | 'visible'`. With it set, the render
pipeline wraps the component's `build()` output in an island boundary, and the live Svelte component the
site registers under the same name on [`rendering.islands`](#renderingislands-adapter-member) mounts
over that fallback in the browser. `true` mounts eagerly on first load and after every client-side
navigation; `'visible'` defers to first intersection. The `build()` output is the no-JS fallback, so
keep it class-driven and high-fidelity. Absent leaves the component static and server-only. The
[`/islands`](./islands.md) reference carries the runtime, the boundary contract, and the props trust
boundary.

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

const callout = defineComponent({
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  build: (ctx) =>
    h('aside', { className: ['callout'] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
    ]),
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
});
```

### Fields

The field vocabulary. A concept declares its fields with the `fields` constructor namespace, then
bundles them into a `fieldset`. The fieldset is the single source of truth for the editor form, the
validator, and the inferred frontmatter type, and the descriptors it carries are plain data.

#### `fields`

Stability tier: Extension API.

`fields` is the constructor namespace, one function per field type. The leaf constructors are `text`,
`textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`,
`image`, and `reference`. The container constructors are `object` (a labeled group of leaves) and
`array` (a repeatable list over one item). Each one takes the field's options and returns a plain-data
descriptor; a `select` or `multiselect` preserves its literal option list so the inferred type
narrows to that union. A closed `multiselect` (an `options` list) renders as checkboxes; a
`creatable: true` multiselect renders as an open tag input and accepts an optional `placeholder`.
`fields.icon` declares a glyph chosen from the adapter's icon set, and its stored value is the glyph's
name string.

A concept's tag field, the top-level multiselect it marks `taxonomy: true`, becomes a closed
vocabulary-sourced picker once the site configures a tag vocabulary (the `vocabulary` key in
`site.config.yaml`, read onto `CairnRuntime.vocabulary` through `extractVocabulary`). On save and on
edit, the engine sources the field's options from the vocabulary, so the editor picks from the
configured tags rather than typing free-form values, and a save of a value that is neither in the
vocabulary nor already on the entry is rejected. A value already on an entry that the vocabulary does
not list, an orphan, the engine preserves rather than silently dropping. It renders as a checked,
removable option flagged "not in your tag list." This enforcement is opt-in. A site that configures no `vocabulary`
leaves the taxonomy field the open creatable multiselect it is by default, and the build-time
tags-as-data read on `ContentSummary.tags` is identical either way; enforcement is a save-and-edit
concern, not a build one. The vocabulary supplies the field's options, so declare the taxonomy field
as an open creatable multiselect with no literal `options` of its own. A field that pre-declares its
own `options` enforces those at validation, which is a different, fixed-list shape, not the
vocabulary-sourced one.

`fields.object({ fields })` groups leaf fields under one frontmatter key, storing a nested object. Its
`label` is optional, because an `object` inside an `array` is labeled by the array. `fields.array(item,
options?)` declares a repeatable list: the `item` is any leaf (a scalar, an `image`, or a `reference`)
or a flat `object` of leaves. An `array` of references renders the reference picker; an `array` of any
other item renders the repeatable-row editor with add, remove, and reorder. The optional
`itemLabel` names a row from one leaf field key.

```ts
import { fieldset, fields } from '@glw907/cairn-cms';

const set = fieldset({
  // a repeatable group of flat rows; the array labels the group, the object carries no label
  faq: fields.array(
    fields.object({ fields: { question: fields.text({ label: 'Question', required: true }), answer: fields.textarea({ label: 'Answer' }) } }),
    { label: 'FAQ', itemLabel: 'question' },
  ),
  // a repeatable list of a single leaf
  gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
  // a labeled group under one key
  meta: fields.object({ label: 'Meta', fields: { note: fields.text({ label: 'Note' }) } }),
});
```

Containers nest one level only. An `object` holds leaves, never another container. An `array` holds a
leaf or a flat `object`, never another `array` and never an `object` of objects. A `reference` inside
an `object` and an `seo` image inside any container are not supported yet, and a deeper nesting, a
nested reference, or a nested `seo` image throws at the `fieldset()` call. No field key may contain a
dot, top-level or nested, because the editor addresses a nested value by a dotted path. See
[Structured fields](../guides/structured-fields.md) and [The one-level nesting
cap](../explanation/content-model.md) for the why and the escape hatch.

Every constructor also accepts an optional `help`: one author-facing sentence the editor renders under
the field in the Details panel, associated with the input through `aria-describedby`. It is not a
validation rule. The `date` field shows a built-in publish-clarity default when its `help` is unset,
so the date never reads as if it schedules publishing; a field `help` replaces that default, and the
date hint cannot be suppressed entirely.

```ts
import { fieldset, fields } from '@glw907/cairn-cms';

const set = fieldset({
  title: fields.text({ label: 'Title', required: true }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
});
```

#### `fieldset`

Stability tier: Extension API.

```ts
declare function fieldset<const R extends Record<string, FieldDescriptor>>(
  record: R,
  options?: FieldsetOptions,
): Fieldset<R>;
```

Build a fieldset from a key-to-descriptor record. The returned schema carries the descriptors as
plain data for the editor form, a server-derived validator that coerces each value to its type and
returns field-keyed errors or normalized data, and a Standard Schema conformance property whose
issues map each error to a single-segment path. The validator enforces each descriptor's declared
constraints: a `text` or `textarea` field's `min`, `max`, `length`, and
`pattern`, and a `date` field's `min` and `max`. A malformed `pattern` throws at the `fieldset()`
call, not on a later save. The validator reads a parsed value as well as a form string, so a numeric
`number`, a `Date` on a `datetime` field, and a lone scalar on a `multiselect` all normalize.
`options.refine` runs after the per-field rules pass, for cross-field and body-dependent checks.

The validator recurses one level into an `object` and an `array`, so a clean nested value normalizes
and a nested failure reports. On failure the result carries the flat `errors` map keyed by the
top-level field, plus an additive `issues` array of `ValidationIssue`, each located by a
multi-segment path (a row index, a leaf sub-key) so the form routes a nested error to its input.

#### Field types

Stability tier: Extension API.

- `FieldDescriptor` is the plain-data descriptor union the form, validator, and inference all read.
- `Fieldset` is the schema a `fieldset` call returns, carrying the descriptors, the behavior table,
  the validator, and the Standard Schema property.
- `InferFieldset` extracts the normalized frontmatter type from a `Fieldset`, where a descriptor
  declared `required: true` is a required key.
- `FieldsetOptions` carries the `refine` cross-field check and the `behavior` table.

### Render

The render pipeline turns markdown into HTML, dispatching registered components and resolving
`cairn:` links.

#### `createRenderer`

Stability tier: Extension API.

```ts
declare function createRenderer(
  registry?: ComponentRegistry,
  options?: RendererOptions,
): {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
  renderMarkdown: (content: string, opts?: ResolveOptions) => Promise<string>;
  renderDocument: (content: string, opts?: ResolveOptions) => Promise<{ html: string; headings: DocHeading[] }>;
};
```

Compose a site's render pipeline from its component registry: directive syntax, then stamped
markers, then registry-built hast. It returns `renderMarkdown` plus the fully composed remark and
rehype plugin arrays, so the admin editor preview reuses the exact same set. `RendererOptions`
carries the sanitize and anchor controls, the table-scroll default, and a
`remarkPlugins`/`rehypePlugins` seam for a site's own plugins.

`renderDocument` takes the same options as `renderMarkdown` and additionally returns `headings`: a
`DocHeading[]` collected from the final rehype tree, after `rehypeSlug` stamps ids and after any
`RendererOptions.rehypePlugins` a site supplied have run, so a site rewrite of a heading's id is
the id collected. Headings come back in document order, one entry per h1-h6, with `text` flattened
to plain content (inline code, emphasis, and links reduce to their text). A page that needs a
table of contents or a heading anchor list calls `renderDocument` instead of `renderMarkdown`.

```ts
import { createRenderer } from '@glw907/cairn-cms';
import { registry } from './components.js';

const { renderDocument } = createRenderer(registry);
const { html, headings } = await renderDocument('# Title\n\n## Section');
// headings: [{ id: 'title', text: 'Title', depth: 1 }, { id: 'section', text: 'Section', depth: 2 }]
```

```ts
// examples/showcase/src/theme/cairn.config.ts
import { createRenderer } from '@glw907/cairn-cms';
import { registry } from './components.js';

const { renderMarkdown } = createRenderer(registry);
// the adapter's render delegates to it:
// render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
```

`RendererOptions.tableScroll` (default `true`) wraps every rendered table in a labeled,
keyboard-reachable `role="region"` div, so a narrow viewport scrolls the wrapper instead of
squeezing the table's columns while the table itself keeps its role in the accessibility tree. Set
it to `false` for a site that supplies its own table wrapping.

`RendererOptions.remarkPlugins` and `RendererOptions.rehypePlugins` add a site's own [unified](https://unifiedjs.com)
plugins to the pipeline. A remark plugin runs after cairn's own markdown-stage steps (directive
stamping, `cairn:` link resolution, figures, `media:` resolution) and before the conversion to
hast. A rehype plugin runs after cairn's own hast-stage steps (dispatch, the sanitize floor, heading
slugs, highlighting, anchor hardening, the sink guard, the default table-scroll wrap) and before
stringification. A site's own post-render transform composes here over the hast tree directly,
instead of re-parsing `renderMarkdown`'s returned HTML string:

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/** Defer every image's load until it nears the viewport. */
function rehypeLazyImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') (node.properties ??= {}).loading = 'lazy';
    });
  };
}

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
  rehypePlugins: [rehypeLazyImages],
});
```

#### `SiteRender`

```ts
type SiteRender = (input: {
  body: string;
  concept?: string;
  frontmatter?: Record<string, unknown>;
  resolve?: LinkResolve;
  resolveMedia?: MediaResolve;
  resolveFragment?: FragmentResolve;
}) => Promise<string>;
```

The type of the adapter's `rendering.render` member: the one renderer the editor preview and every
public page call. It takes a single object and returns a `Promise<string>`. `body` is the markdown
to render. `resolve` rewrites `cairn:` links to live permalinks; the build passes a
site-resolver-backed resolver and the preview passes a manifest-backed one. `resolveMedia` resolves
`media:` references the same way. `resolveFragment` resolves an `::include` directive's fragment id
to its raw markdown body, the same way; a custom renderer need not read it unless it wants to vary
fragment resolution. `concept` and `frontmatter` carry the entry's context, so a custom renderer can
vary its output per concept or per frontmatter field. Both are optional: an entry render supplies
them, and the standalone component-insert preview omits them.

#### `rendering.islands` (adapter member)

```ts
{ islands?: IslandRegistry }
```

The live Svelte components for hydrated directives, keyed by directive name, declared beside `render`
in the adapter's `rendering` group. Every component whose [`hydrate`](#definecomponent) is set needs an
entry here, and every entry needs a matching `hydrate` component; `defineAdapter` fails closed at
declaration on either mismatch, naming the offending directive. An absent registry keeps the site
static, and the client runtime is never imported. The runtime that consumes it lives at the
[`/islands`](./islands.md) subpath; that page carries the boundary contract and the props trust
boundary.

<!-- snippet-check-skip: illustrates the rendering member's islands key inside the adapter's rendering object opened above -->
```ts
rendering: {
  render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
  components: registry,
  islands: { converter: Converter },
},
```

#### `parseMarkdown`

Stability tier: Extension API.

```ts
declare function parseMarkdown(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
};
```

Parse a markdown file into its frontmatter and body. The write side, reassembling a file for
committing, is the engine's own save-path concern, not a construction-time call a site makes.

```ts
import { parseMarkdown } from '@glw907/cairn-cms';

declare const fileText: string;

const { frontmatter, body } = parseMarkdown(fileText);
```

#### Component-author helpers

Stability tier: Extension API.

These build hast inside a component's `build` function, so a site arranges markup without walking the
tree. The showcase `alert` component composes them.

```ts
declare function glyph(name: string, icons: IconSet): Element;
declare function iconSpan(glyphEl: Element, role?: string): Element;
declare function cardShell(classes: string[], body: ElementContent[]): Element;
declare function headRow(title: ElementContent[], icon?: Element): Element;
```

`glyph` builds an inline SVG glyph from the site's icon set. `iconSpan` wraps a glyph in an
`ec-icon` span. `cardShell` builds a `<section>` wrapper with a card body. `headRow` builds a
title-plus-optional-icon head row.

<!-- snippet-check-skip: illustrates the alert component's build function, a continuation of the unshown defineComponent call that wraps it -->
```ts
// examples/showcase/src/theme/cairn.config.ts
const makeIcon = (name, role) => iconSpan(glyph(name, icons), role);
build: (ctx) =>
  cardShell(['alert'], [
    headRow(ctx.slot('title'), makeIcon('leaf')),
    h('div', { className: ['alert-body'] }, ctx.slot('body')),
  ]),
```

### Runtime and config

The runtime folds an adapter and its site-config into the shape the admin and delivery paths read.

#### `composeRuntime`

Stability tier: Scaffold API.

```ts
declare function composeRuntime({ adapter, siteConfig }: ComposeInput): CairnRuntime;
```

Fold an adapter and its site-config into the composed runtime (seam 2). The per-concept URL policy
is derived from the site-config, the same source delivery uses, so the runtime and delivery
permalinks cannot diverge.

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

#### `parseSiteConfig`

Stability tier: Extension API.

```ts
declare function parseSiteConfig(raw: string): SiteConfig;
```

Parse the YAML site-config text into a typed object. Throws `SiteConfigError` on a malformed root,
and enforces the config boundary between site.config.yaml and `cairn.config.ts`: every top-level key
must be one the engine reads from the YAML (`siteName`, `description`, `author`, `locale`, `menus`,
`spellcheck`, `tidy`, `vocabulary`). A key that belongs on the adapter instead (`content`, `backend`,
`email`, `rendering`, `media`, `editor`) throws a message naming `cairn.config.ts` as its correct
home; any other unrecognized key throws listing the known keys.

```ts
// examples/showcase/src/theme/cairn.config.ts
import { parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';
export const siteConfig = parseSiteConfig(siteYaml);
```

#### `extractMenu`

Stability tier: Extension API.

```ts
declare function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[];
```

Extract one named menu from a parsed config and validate it. Returns `[]` when the menu is absent.

```ts
import { extractMenu } from '@glw907/cairn-cms';
import { siteConfig } from './cairn.config.js';

const primary = extractMenu(siteConfig, 'primary', 2);
```

#### `extractVocabulary`

Stability tier: Extension API.

```ts
declare function extractVocabulary(config: SiteConfig): VocabularyEntry[];
```

Read the editor-owned tag vocabulary from a parsed config and validate it. Returns `[]` when the
`vocabulary` key is absent, so a site that configures no vocabulary stays on the open creatable
taxonomy field. `composeRuntime` calls this to set `CairnRuntime.vocabulary`, the snapshot the save
and edit paths read.

```ts
import { extractVocabulary } from '@glw907/cairn-cms';
import { siteConfig } from './cairn.config.js';

const vocabulary = extractVocabulary(siteConfig);
```

### Content and manifest

The manifest is the committed, build-verified link graph. The content index that projects raw
markdown into the query surfaces lives at [`/delivery`](./delivery.md). The write and diff side of
the manifest is the engine's own save path, so only its serialize and verify operations stay public,
for a build script or a custom regenerate tool to call.

Each manifest entry also records which fragment ids its body includes, an inclusion edge alongside
the outbound link and reference edges the same entry already carries. The delete guard reads it to
refuse deleting a fragment a published entry still includes, the same way it refuses deleting a
linked entry. This edge carries no build-time integrity check of its own: the fragment resolver
throws on a dangling `::include` when the build renders the entry, which is the same backstop a
dangling `cairn:` link relies on.

#### Manifest serialize and verify

Stability tier: Extension API.

```ts
declare function serializeManifest(manifest: Manifest): string;
declare function verifyManifest(built: Manifest, committedRaw: string): void;
declare function verifyReferences(manifest: Manifest): void;
```

`serializeManifest` writes the canonical, sorted, deduped form that diffs cleanly. The `cairnManifest`
Vite plugin uses it in write mode. `verifyManifest` throws when the committed manifest drifts from the
corpus, so a raw-git edit fails the build loudly. `verifyReferences` throws when any frontmatter
reference edge points at a missing target, naming the source entry, the field, and the missing target.
References have no prerender backstop, so this build gate is their only integrity authority.

```ts
import { verifyManifest, type Manifest } from '@glw907/cairn-cms';

declare const built: Manifest;
declare const committedRaw: string;

verifyManifest(built, committedRaw); // throws on drift
```

### Auth and GitHub App

Sending the magic-link email and minting the GitHub App token are the engine's own save and login
paths, not construction-time calls a site makes. The error classes stay public so a custom route can
catch them: they are defined in the package, so `instanceof` is reliable across the peer boundary.

#### Error classes

Stability tier: Extension API.

```ts
declare class CommitConflictError extends Error {
  readonly path: string;
  constructor(path: string);
}
declare class SiteConfigError extends Error {
  readonly conditionId: string;
}
```

`CommitConflictError` signals a lost SHA race on a commit, so the save fails safe. `SiteConfigError`
is thrown by `parseSiteConfig` on a malformed root, and its `conditionId` (always
`config.site-config-invalid`) names the registered diagnostic condition the fault maps to.

### Roles

The engine hard-codes three capability levels, `owner`, `editor`, and `none`, but not the role
names a site's people carry. `defineRoles` maps a site's own role names onto those three levels; a
site that declares no `roles` gets the implicit `{ owner: 'owner', editor: 'editor' }` pair, so a
zero-config site sees no change here.

#### `defineRoles`

Stability tier: Extension API.

```ts
declare function defineRoles<const R extends RolesDeclaration>(roles: R): R;
declare const DEFAULT_ROLES: { owner: 'owner'; editor: 'editor' };
```

Declare a site's role vocabulary on the adapter's `roles` member, the const-generic companion to
`defineAdapter` and `defineConcept`: it const-captures the literal role names for the typed
read-side below, and validates at construction, so a misdeclared vocabulary fails at build. It
throws on an empty record, an empty role name, a malformed declaration, a `home` that is not an
absolute `/admin`-prefixed path, a missing `owner` key, or an `owner` mapped to anything but owner
capability; `owner` is the one reserved name, since the last-owner guard and the bootstrap owner
both anchor on it. Every other name is free, and a common name like `editor` may be omitted, or
declared like any other name.

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in the first worked example above) to focus on the roles member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
  instructor: { capability: 'none', home: '/admin/classes' },
});

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  roles,
});
```

#### `resolveCapability`, `roleHome`, `ownerLevelRoles`

Stability tier: Extension API.

```ts
declare function resolveCapability(roles: RolesDeclaration | undefined, role: string): Capability;
declare function roleHome(roles: RolesDeclaration | undefined, role: string): string | undefined;
declare function ownerLevelRoles(roles: RolesDeclaration | undefined): string[];
```

The engine calls these to resolve `locals.editor.capability` and the `/admin` landing at the guard
and the routes; a custom admin route reads the same helpers to gate itself against a vocabulary
without re-deriving the mapping. `resolveCapability` returns the mapped capability, treating an
`undefined` vocabulary as `DEFAULT_ROLES`, and returns `'none'` for a role name absent from the
vocabulary, so a pruned config or a hand-edited row fails closed rather than locking the person out
of sign-in. `roleHome` returns the declared `home`, or `undefined` when the role declares none or
is unknown. `ownerLevelRoles` lists every name mapped to owner capability, the set the last-owner
guard counts across instead of the literal `'owner'` string.

#### The typed read-side: `CairnRolesRegister`

A site augments this empty registry interface once to narrow the public `Role` type to its own
declared names everywhere the engine and the site's own routes read `locals.editor.role`,
including custom admin routes. Unaugmented, `Role` stays exactly `'owner' | 'editor'`, today's type.

```ts
// src/app.d.ts
import { roles } from './lib/cairn.config.js';

declare module '@glw907/cairn-cms' {
  interface CairnRolesRegister {
    roles: typeof roles;
  }
}
```

---

## Types

The public type aliases and interfaces. Each carries a signature and a one-line meaning. The
function signatures above reference these.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `CairnAdapter` | Extension API | `interface CairnAdapter` | The one seam the engine consumes, declared at `src/lib/cairn.config.ts`. |
| `ConceptConfig` | Extension API | `interface ConceptConfig<S>` | Per-site configuration for one content concept: dir, label, singular, fields, routing, permalink, datePrefix, summaryFields. The optional `singular` names the create affordances ("New post") and defaults to `label`; `routing`/`permalink`/`datePrefix` set the concept's URL policy. |
| `ConceptDescriptor` | Extension API | `interface ConceptDescriptor` | The engine-internal, uniform view of one concept after normalization, including the resolved `singular` (defaulted to `label`). |
| `ConceptUrlPolicy` | Extension API | `interface ConceptUrlPolicy` | A concept's permalink pattern and date-prefix granularity, declared per concept via `defineConcept`. |
| `Backend` | Extension API | `interface Backend` | The live, connected content store the engine resolves per request: read, commit, and branch operations over files, never a query. |
| `BackendProvider` | Extension API | `interface BackendProvider` | The adapter's `backend` value: carries the `kind` and default `branch`, and `connect(env)`s to a live `Backend`. |
| `GithubAppProvider` | Extension API | `interface GithubAppProvider` | What `githubApp(...)` returns: a `BackendProvider` plus the GitHub App's non-secret identity (`owner`, `repo`, `appId`, `installationId`). |
| `BackendEnv` | Extension API | `interface BackendEnv` | The Worker secret carrier `connect` reads, holding `GITHUB_APP_PRIVATE_KEY_B64`. |
| `FileChange` | Extension API | `interface FileChange` | One path change in a commit: write `content`, or delete the path when `content` is null. |
| `SenderConfig` | Extension API | `interface SenderConfig` | Magic-link sender identity for Cloudflare Email Sending. |
| `NavMenuConfig` | Extension API | `interface NavMenuConfig` | A git-committed YAML menu the nav editor manages. |
| `PreviewConfig` | Extension API | `interface PreviewConfig` | The live site's stylesheets and container classes for the edit page's preview frame, with optional per-concept wrapper overrides. |
| `AssetConfig` | Extension API | `interface AssetConfig` | A site's media configuration: the R2 bucket binding, the delivery base and URL form, the upload limits, and the named Cloudflare Images variant presets. Omitting it leaves media off. See the `assets` adapter member above. |
| `CairnRuntime` | Extension API | `interface CairnRuntime` | The composed runtime the engine serves from. |
| `ComposeInput` | Extension API | `interface ComposeInput` | The input to `composeRuntime`: adapter, siteConfig. |
| `NamedField` | Extension API | `type NamedField` | A field descriptor with its frontmatter key re-attached as `name`, the normalized shape `ConceptDescriptor.fields` carries. |
| `ImageValue` | Extension API | `interface ImageValue` | The stored value of an `image` field: a `media:` src, an alt, and an optional caption. |
| `ValidationResult` | Extension API | `type ValidationResult` | A validator's verdict: normalized data, or field-keyed `errors` plus the additive located `issues`. |
| `ValidationIssue` | Extension API | `interface ValidationIssue` | One validation failure located by a `path` (a top-level key, then a row index and/or a leaf sub-key) and its message. |
| `StandardInput` | Extension API | `interface StandardInput` | The validate input the adapter takes: raw frontmatter and the body. |
| `StandardSchemaV1` | Extension API | `interface StandardSchemaV1<I, O>` | A local copy of the Standard Schema v1 interface, for ecosystem interop. |
| `CairnRef` | Extension API | `interface CairnRef` | A resolved reference to a content entry by its concept and permanent id. |
| `LinkResolve` | Extension API | `type LinkResolve` | Resolve a `CairnRef` to its live permalink, or undefined when missing. |
| `FragmentResolve` | Extension API | `type FragmentResolve = (id: string) => string \| undefined` | Resolve a fragment id to its raw markdown body, for the `::include` directive. `undefined` is a preview miss; a resolver that throws is the build backstop. |
| `Manifest` | Extension API | `interface Manifest` | The whole corpus as one committed file, with a version guard. |
| `ComponentDef` | Extension API | `interface ComponentDef` | A site component: how it inserts (editor) and how it renders (rehype). Its `attributes` are a `fields.*` record of scalar leaves, with any cross-field rule in the co-bundled `behavior` table; `defineComponent` builds the `attributeSchema` from them. The optional `icon` and `group` place its picker row, `hidden` keeps it off the top-level picker, `preview` is a sample that seeds the guided form and opts the configure step into the two-pane live preview, and `hydrate` opts the directive into a client [island](./islands.md). |
| `ComponentRegistry` | Extension API | `interface ComponentRegistry` | The single source the render pipeline and the editor palette both read. |
| `IconSet` | Extension API | `type IconSet` | A glyph name to SVG path-data map the site owns. |
| `MakeIcon` | Extension API | `type MakeIcon` | A site's icon factory: turn a stamped name and role into a hast element. |
| `SiteRender` | Extension API | `type SiteRender` | The site's one renderer seam: an entry-aware `render({ body, concept?, frontmatter?, resolve?, resolveMedia?, resolveFragment? }): Promise<string>` the editor preview and every public page call. |
| `RendererOptions` | Extension API | `interface RendererOptions` | The render pipeline's sanitize, anchor, table-scroll, and plugin-seam controls. |
| `DocHeading` | Extension API | `interface DocHeading` | One heading `renderDocument` collected from a rendered page: `id`, flattened `text`, and `depth` (1-6), in document order. |
| `SiteConfig` | Extension API | `interface SiteConfig` | The shape of the YAML site-config file. |
| `NavNode` | Extension API | `interface NavNode` | One navigation node: label, optional url, optional children. |
| `VocabularyEntry` | Extension API | `interface VocabularyEntry` | One editor-owned tag: a frozen slug `value` (the stored frontmatter token and filter key) and an editable display `label`. The `vocabulary` site-config key is a list of these. |
| <a id="capability"></a>`Capability` | Extension API | `type Capability` | The three levels the engine understands: `'owner'` (manages the roster), `'editor'` (edits content), `'none'` (an authenticated identity with no engine content access). |
| `RoleDeclaration` | Extension API | `type RoleDeclaration` | One role's mapping in a `defineRoles` vocabulary: a bare `Capability`, or `{ capability: Capability; home?: string }` naming the `/admin` route that role lands on. |
| `RolesDeclaration` | Extension API | `type RolesDeclaration` | A site's whole role vocabulary: role name to `RoleDeclaration`, the shape `defineRoles` validates and returns. |
| <a id="cairnrolesregister"></a>`CairnRolesRegister` | Extension API | `interface CairnRolesRegister {}` | The empty registry interface a site augments to narrow `Role` to its own declared role names (see the preceding [Roles](#roles) section). |
| <a id="role"></a>`Role` | Extension API | `type Role` | The role names `locals.editor.role` carries: registry-derived from `CairnRolesRegister`, defaulting to `'owner' \| 'editor'` when a site declares no vocabulary. |
| <a id="editor"></a>`Editor` | Extension API | `interface Editor` | The signed-in admin identity the whole admin reads: email, displayName, role, and its resolved `capability`. `locals.editor` carries it for every `/admin/**` route (a custom route reads it directly or through `requireSession`/`requireOwner`/`requireEditor`), and the ambient declaration that types `locals.editor` ships from the [`./ambient`](./ambient.md) subpath. Email is always trimmed and lowercased, an invariant held at every write and lookup path (the `auth.role-vocabulary` and `auth.email-normalization` [doctor checks](./doctor.md) flag a drift). |
| `AuthEnv` | Extension API | `interface AuthEnv` | Worker bindings and vars the auth layer reads. |
| `EmailRecipient` | Extension API | `type EmailRecipient = string \| { email: string; name?: string }` | A `cc`/`bcc` recipient for the Email Sending API: a bare address, or an address with a display name. |
| `EmailAttachment` | Extension API | `interface EmailAttachment` | A file or inline attachment for the Email Sending API. |
| `AuthBranding` | Extension API | `interface AuthBranding` | Per-site identity for the magic-link email. |
| `MagicLinkMessage` | Extension API | `interface MagicLinkMessage` | The message a built magic-link email carries: the five required fields, plus optional `cc`, `bcc`, `replyTo`, and `attachments` widening the Email Sending API surface, live-verified 2026-07-07. `replyTo` takes a single address only; the platform rejects an array there. |
| `SendMagicLink` | Extension API | `type SendMagicLink` | The injected send a custom `SendMagicLink` implements; production sends through Cloudflare Email Sending. |
| `RepoFile` | Extension API | `interface RepoFile` | A markdown file in a concept directory: id, name, path. |
| `CommitAuthor` | Extension API | `interface CommitAuthor` | A commit author: the signed-in editor's name and email. |
