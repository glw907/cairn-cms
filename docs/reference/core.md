# Core (`@glw907/cairn-cms`)

The root export is the engine. It carries the adapter and schema contract your site declares, the
markdown render pipeline, the composed runtime, the content and manifest projections, and the auth
and GitHub App primitives. You import it at `src/lib/cairn.config.ts` and in your admin and
delivery code.

```ts
import { defineAdapter, defineConcept, fieldset, fields, createRenderer } from '@glw907/cairn-cms';
import type { CairnAdapter, ComponentDef } from '@glw907/cairn-cms';
```

The `.` entry carries 118 names, so this page groups them in three tiers. **Stable API** is the
deliberate public surface, each primary entry point with a worked snippet. **Low-level** lists the
internal helpers a site rarely calls. **Types** is a table of the public type aliases and
interfaces. The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate
checks every name here against them.

The public delivery read surface lives at [`/delivery`](./delivery.md) and
[`/delivery/data`](./delivery-data.md); the root no longer re-exports it.

---

## Stable API

### Adapter and schema

A site's adapter is the one seam the engine consumes. It declares the content concepts, the render,
and the GitHub backend.

#### `defineAdapter`

```ts
declare function defineAdapter<const A extends CairnAdapter>(adapter: A): A;
```

Declare a site's adapter while preserving each concept's concrete fieldset type for typed reads. The
return value is the adapter itself, narrowed. The adapter has six groups: `content`, `backend`,
`email`, `rendering`, `media`, and `editor`.

```ts
// examples/showcase/src/lib/cairn.config.ts
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
    render: (md, opts) => renderMarkdown(md, opts),
    components: registry,
    icons,
  },
});
```

#### `githubApp`

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

```ts
declare function defineConcept<const C extends ConceptConfig>(concept: C): C;
```

Declare one concept while preserving its fieldset type for typed reads, the concept-level companion
to `defineAdapter`. It also validates the concept's URL policy at declaration, so a bad `permalink` or
`datePrefix` throws at module load rather than at a defaulted render. A concept declares its routing
with `routing` (the `'feed'`, `'page'`, or `'embedded'` shorthand, or an explicit `RoutingRule`) and
its URL policy with `permalink` and `datePrefix`; an omitted `routing` is `'page'`.

```ts
posts: defineConcept({
  dir: 'src/content/posts',
  routing: 'feed',
  permalink: '/:year/:month/:slug',
  datePrefix: 'month',
  fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
}),
```

#### `supportContact` (adapter `editor` member)

A free-form string the in-admin help points a stuck editor to: an email address, a URL, or a name and
instruction. `composeRuntime` passes it to the runtime untouched, and the help renders the hand-off
only when it is set, so an unset contact yields no dead button. Optional.

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

type ResolvedPreview = Omit<PreviewConfig, 'byConcept'>;
```

How the edit page's preview frame reproduces the live site's content styling. Chrome isolation
means the admin deliberately never loads the site's CSS, so a design-accurate preview needs the
site to name its compiled stylesheets here; without the knob the preview renders unstyled markup.
`composeRuntime` passes the value through to the runtime untouched.

`stylesheets` holds absolute or root-relative URLs linked inside the preview document. A Vite
`?url` import of the site's CSS entry resolves the hashed asset URL at build time. `bodyClass`
applies theme or typography root classes to the preview document's body, and `containerClass`
wraps the rendered content in the site's content container (a prose or measure class); when
omitted, the content renders bare. One default worth knowing: the frame's srcdoc pins a white body
background, deliberately overridable, so a site whose ground is not white should state its body
background in one of the named stylesheets.

`byConcept` overrides `bodyClass` and `containerClass` per concept, keyed by concept id, for a
site whose concepts wrap content differently (a blog whose posts render inside a post module while
its pages use a static-page wrapper). An entry's preview resolves the override for its concept
over the top-level values, key by key: a missing override key keeps the top-level value, and only
a string replaces it. Stylesheets are always shared. `editLoad` ships the already-resolved flat
shape, `ResolvedPreview`, so the map itself never reaches the client.

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
page links the client copy, the preview frame links the server copy. That is by design, not a defect,
so do not be alarmed to find both in the build output.

```ts
// src/lib/cairn.config.ts
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

```ts
declare function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry;
```

Build a component registry from a site's component definitions. The render pipeline (the directive
stamp plus the rehype dispatch) and the editor palette both read it.

```ts
const registry = defineRegistry({ components: [callout, alert] });
```

#### `defineComponent`

```ts
declare function defineComponent<const D extends ComponentDef>(def: D): D & { attributeSchema: Fieldset };
```

Declare one component while building its attribute validator from the `fields.*` descriptors, the
component-level companion to `defineConcept`. A directive attribute is one flat string, so the
attributes are a `fields.*` record of scalar leaves: `text`, `textarea`, `number`, `select`, `url`,
`email`, `date`, `datetime`, `boolean`, and `icon`. An `object`, `array`, `reference`, or `image`
attribute throws at declaration. It validates at declaration like `defineConcept`, so a bad type or a
malformed pattern fails at module load rather than at first insert. The built `attributeSchema` is the
`Fieldset` that `validateComponent` runs, so a component attribute and a concept field validate through
identical code. A cross-field attribute rule lives in the co-bundled `behavior` table, keyed by
attribute name.

```ts
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

#### `normalizeConcepts`

```ts
declare function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
): ConceptDescriptor[];
```

Normalize an adapter's declared concepts into uniform descriptors (seam 1). Each concept declares its
own routing and URL policy (`routing`, `permalink`, `datePrefix`), and each defaults when the concept
omits it. `composeRuntime` calls it, so a site rarely calls it directly.

```ts
const descriptors = normalizeConcepts(cairn.content);
```

#### `findConcept`

```ts
declare function findConcept(
  concepts: ConceptDescriptor[],
  id: string,
): ConceptDescriptor | undefined;
```

Look up a normalized concept by id, or `undefined` when the site does not enable it.

```ts
const posts = findConcept(runtime.concepts, 'posts');
```

### Fields

The field vocabulary. A concept declares its fields with the `fields` constructor namespace, then
bundles them into a `fieldset`. The fieldset is the single source of truth for the editor form, the
validator, and the inferred frontmatter type, and the descriptors it carries are plain data.

#### `fields`

`fields` is the constructor namespace, one function per field type. The leaf constructors are `text`,
`textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`,
`image`, and `reference`. The container constructors are `object` (a labeled group of leaves) and
`array` (a repeatable list over one item). Each one takes the field's options and returns a plain-data
descriptor; a `select` or `multiselect` preserves its literal option list so the inferred type
narrows to that union. A closed `multiselect` (an `options` list) renders as checkboxes; a
`creatable: true` multiselect renders as an open tag input and accepts an optional `placeholder`.
`fields.icon` declares a glyph chosen from the adapter's icon set, and its stored value is the glyph's
name string.

`fields.object({ fields })` groups leaf fields under one frontmatter key, storing a nested object. Its
`label` is optional, because an `object` inside an `array` is labeled by the array. `fields.array(item,
options?)` declares a repeatable list: the `item` is any leaf (a scalar, an `image`, or a `reference`)
or a flat `object` of leaves. An `array` of references renders the reference picker; an `array` of any
other item renders the repeatable-row editor with add, remove, and reorder. The optional
`itemLabel` names a row from one leaf field key.

```ts
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
cap](../explanation/structured-fields.md) for the why and the escape hatch.

Every constructor also accepts an optional `help`: one author-facing sentence the editor renders under
the field in the Details panel, associated with the input through `aria-describedby`. It is not a
validation rule. The `date` field shows a built-in publish-clarity default when its `help` is unset,
so the date never reads as if it schedules publishing; a field `help` replaces that default, and the
date hint cannot be suppressed entirely.

```ts
const set = fieldset({
  title: fields.text({ label: 'Title', required: true }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
});
```

#### `fieldset`

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

#### `initialValues`

```ts
declare function initialValues(fieldset: Fieldset, now?: Date): Record<string, unknown>;
```

Resolve each descriptor's `default` to a form-initial value, so a fresh entry opens prefilled. The
`'today'` sentinel on a date field resolves through `now` to its `YYYY-MM-DD` form; an empty-string
or `false` default is omitted, so an untouched field commits no key. With no `now`, a `'today'`
default is omitted rather than read off a real clock, keeping the call deterministic and
Workers-safe.

#### Field types

`FieldDescriptor` is the plain-data descriptor union the form, validator, and inference all read.
`Fieldset` is the schema a `fieldset` call returns, carrying the descriptors, the behavior table,
the validator, and the Standard Schema property. `InferFieldset` extracts the normalized
frontmatter type from a `Fieldset`, where a descriptor declared `required: true` is a required key.
`FieldsetOptions` carries the `refine` cross-field check and the `behavior` table. `BehaviorTable`
is the per-field function-valued behavior co-bundled with a fieldset, keyed by field name and empty
for a behavior-free fieldset. `FieldBehavior` is one field's entry in that table: an optional
`validate` that runs cross-field after per-field coercion (returning an error string or `null`) and
an optional `itemLabel` that derives an array row's label.

### Render

The render pipeline turns markdown into HTML, dispatching registered components and resolving
`cairn:` links.

#### `createRenderer`

```ts
declare function createRenderer(
  registry?: ComponentRegistry,
  options?: RendererOptions,
): {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
  renderMarkdown: (content: string, opts?: { resolve?: LinkResolve; resolveMedia?: MediaResolve }) => Promise<string>;
};
```

Compose a site's render pipeline from its component registry: directive syntax, then stamped
markers, then registry-built hast. It returns `renderMarkdown` plus the remark and rehype plugin
arrays, so the admin editor preview reuses the exact same set. `RendererOptions` carries the
sanitize and anchor controls.

```ts
// examples/showcase/src/lib/cairn.config.ts
const { renderMarkdown } = createRenderer(registry);
// the adapter's render delegates to it:
render: (md, opts) => renderMarkdown(md, opts),
```

#### `parseMarkdown`

```ts
declare function parseMarkdown(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
};
```

Parse a markdown file into its frontmatter and body, the read-side inverse of `serializeMarkdown`.

```ts
const { frontmatter, body } = parseMarkdown(fileText);
```

#### `serializeMarkdown`

```ts
declare function serializeMarkdown(frontmatter: object, body: string): string;
```

Reassemble a markdown file from frontmatter and body for committing.

```ts
const fileText = serializeMarkdown({ title: 'Hello' }, '# Hello\n');
```

#### Component-author helpers

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

```ts
// examples/showcase/src/lib/cairn.config.ts
const makeIcon = (name, role) => iconSpan(glyph(name, icons), role);
build: (ctx) =>
  cardShell(['alert'], [
    headRow(ctx.slot('title'), makeIcon('leaf')),
    h('div', { className: ['alert-body'] }, ctx.slot('body')),
  ]),
```

#### Component grammar and insertion

```ts
declare function serializeComponent(def: ComponentDef, values: ComponentValues): string;
declare function parseComponent(markdown: string, def: ComponentDef): Promise<ComponentValues>;
declare function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation>;
declare function buildComponentInsert(def: ComponentDef, values: ComponentValues): Promise<ComponentInsert>;
declare function emptyValues(def: ComponentDef): ComponentValues;
declare function generateComponentReference(registry: ComponentRegistry, opts: ReferenceOptions): string;
```

`serializeComponent` and `parseComponent` round-trip a component between guided-form values and the
canonical directive markdown. `validateComponent` returns a verdict for a serialized directive.
`buildComponentInsert` serializes and validates a form's values, returning the markdown to insert or
the field errors. `emptyValues` seeds a blank form from a component's schema. `generateComponent
Reference` builds a self-contained markdown reference for a registry, the llms-full shape.

```ts
const insert = await buildComponentInsert(def, values);
if (insert.ok) editor.insert(insert.markdown);
```

### Runtime and config

The runtime folds an adapter and its site-config into the shape the admin and delivery paths read.

#### `composeRuntime`

```ts
declare function composeRuntime({ adapter, siteConfig, extensions }: ComposeInput): CairnRuntime;
```

Fold an adapter and any extensions into the composed runtime (seam 2). The per-concept URL policy
is derived from the site-config, the same source delivery uses, so the runtime and delivery
permalinks cannot diverge.

```ts
// src/lib/cairn.server.ts
export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

#### `parseSiteConfig`

```ts
declare function parseSiteConfig(raw: string): SiteConfig;
```

Parse the YAML site-config text into a typed object. Throws `SiteConfigError` on a malformed root.

```ts
// examples/showcase/src/lib/cairn.config.ts
import siteYaml from './site.config.yaml?raw';
export const siteConfig = parseSiteConfig(siteYaml);
```

#### `extractMenu`

```ts
declare function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[];
```

Extract one named menu from a parsed config and validate it. Returns `[]` when the menu is absent.

```ts
const primary = extractMenu(siteConfig, 'primary', 2);
```

#### `setMenu`

```ts
declare function setMenu(raw: string, name: string, tree: NavNode[]): string;
```

Replace one named menu in the YAML text and reserialize, preserving every other top-level key. The
nav editor's save path calls it.

```ts
const updated = setMenu(yamlText, 'primary', tree);
```

#### `validateNavTree`

```ts
declare function validateNavTree(value: unknown, maxDepth: number): NavNode[];
```

Validate and normalize an untrusted value into a `NavNode[]`: arrays only, non-empty labels, depth
within `maxDepth`, a bounded node count, and only the known keys. Throws `NavValidationError` on any
violation.

```ts
const tree = validateNavTree(submitted, 2);
```

#### Id helpers

```ts
declare function composeDatedId(date: string, slug: string, datePrefix: DatePrefix): string;
declare function idFromFilename(filename: string): string;
declare function filenameFromId(id: string): string;
declare function slugFromId(id: string, datePrefix: DatePrefix | null): string;
declare function isValidId(id: string): boolean;
declare function slugify(title: string): string;
```

`composeDatedId` builds a dated entry's id from a date, a slug, and the concept's granularity.
`idFromFilename` and `filenameFromId` convert between a basename and an id. `slugFromId` strips the
leading date prefix to yield the URL slug, or returns the id verbatim for a non-dated concept.
`isValidId` checks a filename-stem id. `slugify` lowercases a title into a filename-safe stem.

```ts
const id = composeDatedId('2026-01-01', slugify('Hello World'), 'day'); // 2026-01-01-hello-world
```

### Content and manifest

The manifest is the committed, build-verified link graph. The content index that projects raw
markdown into the query surfaces lives at [`/delivery`](./delivery.md); the manifest helpers and the
`cairn:` link helpers stay on the root because the engine and the admin both read them.

#### Manifest parse, serialize, verify, and diff

```ts
declare function parseManifest(raw: string): Manifest;
declare function serializeManifest(manifest: Manifest): string;
declare function emptyManifest(): Manifest;
declare function verifyManifest(built: Manifest, committedRaw: string): void;
declare function verifyReferences(manifest: Manifest): void;
declare function diffManifests(built: Manifest, committed: Manifest): ManifestDiff;
declare function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest;
declare function removeEntry(manifest: Manifest, concept: string, id: string): Manifest;
declare function inboundLinks(manifest: Manifest, concept: string, id: string): InboundLink[];
```

`parseManifest` reads a committed manifest, throwing on a malformed or wrong-version file.
`serializeManifest` writes the canonical, sorted, deduped form that diffs cleanly. `emptyManifest`
is the starting point when no file exists. `verifyManifest` throws when the committed manifest drifts
from the corpus, so a raw-git edit fails the build loudly. `verifyReferences` throws when any
frontmatter reference edge points at a missing target, naming the source entry, the field, and the
missing target; references have no prerender backstop, so this build gate is their only integrity
authority. `diffManifests` reports the drift. `upsertEntry` and `removeEntry` are the save and delete
patches. `inboundLinks` lists every entry that links at a target, for the delete guard.

```ts
verifyManifest(built, committedRaw); // throws on drift
const next = upsertEntry(manifest, entry);
```

#### `cairn:` link helpers

```ts
declare function parseCairnToken(href: string): CairnRef | null;
declare function formatCairnToken(ref: CairnRef): string;
declare function extractCairnLinks(body: string): CairnRef[];
declare function escapeLinkText(text: string): string;
```

`parseCairnToken` parses a `cairn:<concept>/<id>` href, or `null` for any other href.
`formatCairnToken` is its inverse, the form the editor link picker writes. `extractCairnLinks`
returns the cairn links a body points at, in first-occurrence order, deduped. `escapeLinkText`
escapes the characters that would break a markdown link's display text.

```ts
const ref = parseCairnToken('cairn:posts/2026-01-01-hello'); // { concept: 'posts', id: '...' }
```

### Auth and GitHub App

These build and send the magic-link email and commit a file. The GitHub App token mint moved off the
root; a route mints through the `/sveltekit` content routes. The error classes are defined in the
package so `instanceof` is reliable across the peer boundary.

#### `buildMagicLinkMessage`

```ts
declare function buildMagicLinkMessage(input: {
  to: string;
  branding: AuthBranding;
  link: string;
}): MagicLinkMessage;
```

Build the confirmation email. The link is the only action and the copy stays plain.

```ts
const message = buildMagicLinkMessage({ to, branding, link });
```

#### `cloudflareSend`

```ts
declare const cloudflareSend: SendMagicLink;
```

The production send: Cloudflare Email Sending through the `EMAIL` binding. Tests pass a sink instead.

```ts
await cloudflareSend(env, message);
```

#### Error classes

```ts
declare class CommitConflictError extends Error {
  readonly path: string;
  constructor(path: string);
}
declare class SiteConfigError extends Error {
  readonly conditionId: 'config.site-config-invalid';
}
declare class NavValidationError extends Error {}
```

`CommitConflictError` signals a lost SHA race on a commit, so the save fails safe. `SiteConfigError`
is thrown by `parseSiteConfig` on a malformed root, and its `conditionId` names the registered
diagnostic condition the fault maps to. `NavValidationError` is thrown by `validateNavTree` on an
invalid tree. `MAX_NAV_NODES` is the total node cap the validator enforces.

```ts
declare const MAX_NAV_NODES: 200;
```

### Admin form helpers

The admin form path decodes submitted frontmatter, coerces a date for the date input, and reads the
public origin from config. The feed, sitemap, robots, SEO, and pagination builders live at
[`/delivery`](./delivery.md), with the response helpers that wrap them.

#### `frontmatterFromForm` and `dateInputValue`

```ts
declare function frontmatterFromForm(fields: NamedField[], form: FormData): Record<string, unknown>;
declare function dateInputValue(value: unknown): string;
declare function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string;
```

`frontmatterFromForm` decodes submitted form data into raw frontmatter, one rule per field type.
`dateInputValue` coerces a frontmatter date to the `YYYY-MM-DD` an `<input type="date">` wants.
`requireOrigin` returns the site's public origin from config, never a request header, so a forged
Host header cannot redirect a magic link. Its throw carries a `conditionId` of
`config.public-origin-invalid`, the registered diagnostic condition, for all three faults: the
variable is unset, fails to parse as a URL, or uses http on a non-local host.

```ts
const raw = frontmatterFromForm(descriptor.fields, formData);
```

---

## Low-level

These are internal helpers leaked through `export *`. They are not part of the supported surface,
so don't depend on them; the list is here for completeness.

- `rehypeDispatch` the rehype transformer that dispatches each stamped element through its registry `build`.
- `remarkDirectiveStamp` the remark transformer that stamps a recognized directive for dispatch.
- `manifestEntryFromFile` build one manifest entry from a content file.
- `manifestLinkResolver` a `LinkResolve` backed by manifest targets, for the admin preview.

---

## Types

The public type aliases and interfaces. Each carries a signature and a one-line meaning. The
function signatures above reference these.

| Name | Signature | Meaning |
| --- | --- | --- |
| `CairnAdapter` | `interface CairnAdapter` | The one seam the engine consumes, declared at `src/lib/cairn.config.ts`. |
| `ConceptConfig` | `interface ConceptConfig<S>` | Per-site configuration for one content concept: dir, label, singular, fields, routing, permalink, datePrefix, summaryFields. The optional `singular` names the create affordances ("New post") and defaults to `label`; `routing`/`permalink`/`datePrefix` set the concept's URL policy. |
| `ConceptDescriptor` | `interface ConceptDescriptor` | The engine-internal, uniform view of one concept after normalization, including the resolved `singular` (defaulted to `label`). |
| `ConceptUrlPolicy` | `interface ConceptUrlPolicy` | A concept's permalink pattern and date-prefix granularity, declared per concept via `defineConcept`. |
| `RoutingRule` | `interface RoutingRule` | Concept-fixed routing: routable, dated, inFeeds. |
| `Backend` | `interface Backend` | The live, connected content store the engine resolves per request: read, commit, and branch operations over files, never a query. |
| `BackendProvider` | `interface BackendProvider` | The adapter's `backend` value: carries the `kind` and default `branch`, and `connect(env)`s to a live `Backend`. |
| `GithubAppProvider` | `interface GithubAppProvider` | What `githubApp(...)` returns: a `BackendProvider` plus the GitHub App's non-secret identity (`owner`, `repo`, `appId`, `installationId`). |
| `BackendEnv` | `interface BackendEnv` | The Worker secret carrier `connect` reads, holding `GITHUB_APP_PRIVATE_KEY_B64`. |
| `FileChange` | `interface FileChange` | One path change in a commit: write `content`, or delete the path when `content` is null. |
| `SenderConfig` | `interface SenderConfig` | Magic-link sender identity for Cloudflare Email Sending. |
| `NavMenuConfig` | `interface NavMenuConfig` | A git-committed YAML menu the nav editor manages. |
| `PreviewConfig` | `interface PreviewConfig` | The live site's stylesheets and container classes for the edit page's preview frame, with optional per-concept wrapper overrides. |
| `ResolvedPreview` | `type ResolvedPreview = Omit<PreviewConfig, 'byConcept'>` | The flat per-entry preview shape `editLoad` ships: the top-level values with the entry's concept override applied. |
| `AssetConfig` | `interface AssetConfig` | A site's media configuration: the R2 bucket binding, the delivery base and URL form, the upload limits, and the named Cloudflare Images variant presets. Omitting it leaves media off. See the `assets` adapter member above. |
| `CairnExtension` | `interface CairnExtension` | A future build-time extension that folds in like the adapter. |
| `CairnRuntime` | `interface CairnRuntime` | The composed runtime the engine serves from (seam 2 output). |
| `ComposeInput` | `interface ComposeInput` | The input to `composeRuntime`: adapter, siteConfig, extensions. |
| `AdminPanel` | `interface AdminPanel` | A site-defined admin screen contributed by an extension (Mode 2). |
| `FieldTypeDef` | `interface FieldTypeDef` | A custom frontmatter field type contributed by an extension (Mode 2). |
| `NamedField` | `type NamedField` | A field descriptor with its frontmatter key re-attached as `name`, the normalized shape `ConceptDescriptor.fields` carries. |
| `TextField` | `interface TextField` | A single-line text field with length and pattern rules. |
| `TextareaField` | `interface TextareaField` | A multi-line text field with rows, length, and pattern rules. |
| `NumberField` | `interface NumberField` | A numeric field with `min`, `max`, and an `integer` flag. |
| `SelectField` | `interface SelectField` | A single-choice field over a closed `options` list. |
| `MultiselectField` | `interface MultiselectField` | A multi-choice field: a closed `options` list renders checkboxes; `creatable: true` opens a tag input with an optional `placeholder`. |
| `UrlField` | `interface UrlField` | A URL field validated for a well-formed absolute URL. |
| `EmailField` | `interface EmailField` | An email field validated for a well-formed address. |
| `DateField` | `interface DateField` | A `YYYY-MM-DD` date field with min and max. |
| `DatetimeField` | `interface DatetimeField` | A naive-local `YYYY-MM-DDTHH:mm` minute-precision datetime field. |
| `BooleanField` | `interface BooleanField` | A checkbox field; absent means false. |
| `IconField` | `interface IconField` | A glyph chosen from the adapter's icon set; the stored value is the glyph's name. |
| `ImageField` | `interface ImageField` | A hero image set in frontmatter, with an optional `seo` flag for the social card. |
| `ObjectField` | `interface ObjectField` | A group of leaf fields stored as a nested object; the `label` is optional, since an array labels a row group. Holds only leaves, one level deep. |
| `ReferenceField` | `interface ReferenceField` | A single typed edge to one entry of a named `concept`, stored as that target's permanent id. |
| `ArrayField` | `interface ArrayField` | A repeatable field over one `item` descriptor: any leaf (scalar, `image`, `reference`) or a flat `object` of leaves. |
| `ImageValue` | `interface ImageValue` | The stored value of an `image` field: a `media:` src, an alt, and an optional caption. |
| `ValidationResult` | `type ValidationResult` | A validator's verdict: normalized data, or field-keyed `errors` plus the additive located `issues`. |
| `ValidationIssue` | `interface ValidationIssue` | One validation failure located by a `path` (a top-level key, then a row index and/or a leaf sub-key) and its message. |
| `StandardInput` | `interface StandardInput` | The validate input the adapter takes: raw frontmatter and the body. |
| `StandardSchemaV1` | `interface StandardSchemaV1<I, O>` | A local copy of the Standard Schema v1 interface, for ecosystem interop. |
| `DatePrefix` | `type DatePrefix` | Filename date-prefix granularity for a dated concept: year, month, day. |
| `CairnRef` | `interface CairnRef` | A resolved reference to a content entry by its concept and permanent id. |
| `LinkResolve` | `type LinkResolve` | Resolve a `CairnRef` to its live permalink, or undefined when missing. |
| `Manifest` | `interface Manifest` | The whole corpus as one committed file, with a version guard. |
| `ManifestEntry` | `interface ManifestEntry` | One entry's projection: identity, routing, draft flag, the `summary` excerpt, and outbound edges. |
| `ManifestDiff` | `interface ManifestDiff` | The drift between a built and a committed manifest: added, removed, changed. |
| `ManifestEntryDiff` | `interface ManifestEntryDiff` | A changed entry and the fields that differ between manifests. |
| `LinkTarget` | `interface LinkTarget` | The minimal entry view the preview resolver and picker read. |
| `InboundLink` | `interface InboundLink` | One inbound linker: enough to name it and link to its edit page. |
| `ReferenceEdge` | `interface ReferenceEdge` | One typed frontmatter reference edge: the field, the target concept, and the target id. |
| `InboundReference` | `interface InboundReference` | One inbound referencer: its identity plus the distinct fields through which it references the target. |
| `ResolvedReference` | `interface ResolvedReference` | A reference edge resolved to its target's identity (id, concept, title, permalink, optional summary), for a route to render a linked target. |
| `ComponentDef` | `interface ComponentDef` | A site component: how it inserts (editor) and how it renders (rehype). Its `attributes` are a `fields.*` record of scalar leaves, with any cross-field rule in the co-bundled `behavior` table; `defineComponent` builds the `attributeSchema` from them. The optional `icon` and `group` place its picker row, `hidden` keeps it off the top-level picker, and `preview` is a sample that seeds the guided form and opts the configure step into the two-pane live preview. |
| `ComponentRegistry` | `interface ComponentRegistry` | The single source the render pipeline and the editor palette both read. |
| `ComponentValues` | `interface ComponentValues` | Guided-form values for one component: attribute and slot values. |
| `ComponentValidation` | `type ComponentValidation` | A validation verdict: ok, or field-keyed error messages. |
| `ComponentInsert` | `type ComponentInsert` | The outcome of preparing a form for insertion: markdown, or field errors. |
| `SlotKind` | `type SlotKind` | A component slot kind: markdown, inline, repeatable. |
| `SlotDef` | `interface SlotDef` | One named content region of a component. A repeatable slot's `itemFields` are a `fields.*` record of leaf descriptors (v1 uses the first), and the optional `itemLabel` derives a row's label from its item values and index, falling back to the indexed label. |
| `IconSet` | `type IconSet` | A glyph name to SVG path-data map the site owns. |
| `MakeIcon` | `type MakeIcon` | A site's icon factory: turn a stamped name and role into a hast element. |
| `RendererOptions` | `interface RendererOptions` | The render pipeline's stagger, sanitize, and anchor controls. |
| `ReferenceOptions` | `interface ReferenceOptions` | The title and summary for `generateComponentReference`. |
| `SiteConfig` | `interface SiteConfig` | The shape of the YAML site-config file. |
| `NavNode` | `interface NavNode` | One navigation node: label, optional url, optional children. |
| `Role` | `type Role` | An editor's role: owner or editor. |
| `Editor` | `interface Editor` | The session shape the whole admin reads: email, displayName, role. |
| `AuthEnv` | `interface AuthEnv` | Worker bindings and vars the auth layer reads. |
| `AuthBranding` | `interface AuthBranding` | Per-site identity for the magic-link email. |
| `MagicLinkMessage` | `interface MagicLinkMessage` | The message a built magic-link email carries. |
| `SendMagicLink` | `type SendMagicLink` | The injected send; production uses `cloudflareSend`. |
| `RepoFile` | `interface RepoFile` | A markdown file in a concept directory: id, name, path. |
| `CommitAuthor` | `interface CommitAuthor` | A commit author: the signed-in editor's name and email. |
