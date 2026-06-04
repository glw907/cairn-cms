# Core (`@glw907/cairn-cms`)

The root export is the engine: the adapter and schema contract a site declares, the markdown render
pipeline, the composed runtime, the content and manifest projections, and the auth and GitHub App
primitives. A site imports it at `src/lib/cairn.config.ts` and in its admin and delivery code.

```ts
import { defineAdapter, defineFields, createRenderer } from '@glw907/cairn-cms';
import type { CairnAdapter, ComponentDef } from '@glw907/cairn-cms';
```

The `.` entry carries 174 names. The page groups them in three tiers. **Stable API** is the
deliberate public surface, each primary entry point with a worked snippet. **Low-level** lists the
internal helpers a site rarely calls. **Types** is a table of the public type aliases and
interfaces. The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate
checks every name here against them.

---

## Stable API

### Adapter and schema

A site's adapter is the one seam the engine consumes. It declares the content concepts, the render,
and the GitHub backend.

#### `defineAdapter`

```ts
declare function defineAdapter<const A extends CairnAdapter>(adapter: A): A;
```

Declare a site's adapter while preserving each concept's concrete schema type for typed reads. The
return value is the adapter itself, narrowed.

```ts
// examples/showcase/src/lib/cairn.config.ts
export const cairn = defineAdapter({
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
      ]),
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  render: (md, opts) => renderMarkdown(md, opts),
  registry,
  icons,
});
```

#### `defineFields`

```ts
declare function defineFields<const F extends readonly FrontmatterField[]>(
  fields: F,
  options?: DefineFieldsOptions<F>,
): ConceptSchema<F>;
```

Declare a concept's fields once. The single declaration is the source of truth for the editor form,
the validator, and the inferred frontmatter type. `options.refine` runs after the per-field rules
pass, for cross-field and body-dependent checks; it returns field-keyed errors to merge or nothing,
and never transforms the data. See the `defineAdapter` snippet above for `defineFields` in use.

#### `defineRegistry`

```ts
declare function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry;
```

Build a component registry from a site's component definitions. The render pipeline (the directive
stamp plus the rehype dispatch) and the editor palette both read it.

```ts
const registry = defineRegistry({ components: [callout, alert] });
```

#### `normalizeConcepts`

```ts
declare function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
  urlPolicy?: Record<string, ConceptUrlPolicy | undefined>,
  routing?: Readonly<Record<string, RoutingRule>>,
): ConceptDescriptor[];
```

Normalize an adapter's declared concepts into uniform descriptors (seam 1). The URL policy comes
from the YAML site-config, keyed by concept id, and each value defaults when the YAML omits it.
`composeRuntime` calls it, so a site rarely calls it directly.

```ts
const descriptors = normalizeConcepts(cairn.content, urlPolicyFrom(siteConfig));
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

#### `CONCEPT_ROUTING`

```ts
declare const CONCEPT_ROUTING: Readonly<Record<string, RoutingRule>>;
```

The concept-fixed routing table, keyed by concept id (spec section 7.2). Posts are dated feed
entries; pages are plain navigable structure. It is not adapter config, and production passes it as
the default `routing` to `normalizeConcepts`.

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
  renderMarkdown: (content: string, opts?: { resolve?: LinkResolve }) => Promise<string>;
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
// examples/showcase/src/routes/admin/(app)/+layout.server.ts
const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }), {
  mintToken: async () => 'dev-token',
});
export const load = routes.layoutLoad;
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

#### `urlPolicyFrom`

```ts
declare function urlPolicyFrom(config: SiteConfig): Record<string, ConceptUrlPolicy>;
```

The per-concept URL policy from a parsed config, or an empty policy when the `content` key is
absent.

```ts
const policy = urlPolicyFrom(siteConfig);
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

#### `permalink`

```ts
declare function permalink(
  descriptor: ConceptDescriptor,
  entry: { id: string; slug: string; date?: string },
): string;
```

Resolve an entry's canonical path from its concept's permalink pattern. Throws when the pattern uses
a date token and the entry has no valid date, so a misconfiguration fails at build.

```ts
const path = permalink(descriptor, { id: '2026-01-01-hello', slug: 'hello', date: '2026-01-01' });
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

The content index projects raw markdown into the query surfaces lists, feeds, and the sitemap read.
The manifest is the committed, build-verified link graph. The showcase imports the index builders
through the `/delivery` barrel; the same symbols re-export here, so a non-route module can import
them from `.`.

#### `createContentIndex`

```ts
declare function createContentIndex<F = Record<string, unknown>>(
  files: RawFile[],
  descriptor: ConceptDescriptor,
): ContentIndex<F>;
```

Build one concept's index from its raw files and normalized descriptor.

```ts
const posts = createContentIndex(files, descriptor);
const recent = posts.all().slice(0, 10);
```

#### `createSiteIndex`

```ts
declare function createSiteIndex(
  concepts: ConceptIndex[],
  opts?: { validate?: boolean },
): SiteIndex;
```

Union per-concept indexes into a site-level resolver. Throws on a duplicate permalink and, unless
`validate` is `false`, on a non-draft entry whose frontmatter fails its validator, so malformed
content fails the build.

```ts
const site = createSiteIndex([{ descriptor, index: posts }]);
const entry = site.byPermalink('/2026/hello');
```

#### `createSiteIndexes`

```ts
declare function createSiteIndexes<const A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
  opts?: { validate?: boolean },
): SiteIndexes<A>;
```

Build typed per-concept indexes and a site resolver from one adapter. Pass the per-concept raw globs
keyed by concept id. The showcase uses this as its content read-model.

```ts
// examples/showcase/src/lib/content.ts
const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });
```

#### `fromGlob`

```ts
declare function fromGlob(record: Record<string, string>): RawFile[];
```

Map a Vite eager `?raw` glob record (`{ path: raw }`) to `RawFile[]`.

```ts
const files = fromGlob(import.meta.glob('/src/content/posts/*.md', { eager: true, query: '?raw', import: 'default' }));
```

#### Manifest parse, serialize, verify, and diff

```ts
declare function parseManifest(raw: string): Manifest;
declare function serializeManifest(manifest: Manifest): string;
declare function emptyManifest(): Manifest;
declare function verifyManifest(built: Manifest, committedRaw: string): void;
declare function diffManifests(built: Manifest, committed: Manifest): ManifestDiff;
declare function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest;
declare function removeEntry(manifest: Manifest, concept: string, id: string): Manifest;
declare function inboundLinks(manifest: Manifest, concept: string, id: string): InboundLink[];
```

`parseManifest` reads a committed manifest, throwing on a malformed or wrong-version file.
`serializeManifest` writes the canonical, sorted, deduped form that diffs cleanly. `emptyManifest`
is the starting point when no file exists. `verifyManifest` throws when the committed manifest drifts
from the corpus, so a raw-git edit fails the build loudly. `diffManifests` reports the drift.
`upsertEntry` and `removeEntry` are the save and delete patches. `inboundLinks` lists every entry
that links at a target, for the delete guard.

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

These mint the GitHub App token, build and send the magic-link email, and commit a file. The error
classes are defined in the package so `instanceof` is reliable across the peer boundary.

#### `appJwt`

```ts
declare function appJwt(appId: string, privateKeyPem: string): Promise<string>;
```

Mint a GitHub App JWT (RS256), valid about nine minutes, with `iat` backdated for clock skew.

```ts
const jwt = await appJwt(appId, pem);
```

#### `appCredentials`

```ts
declare function appCredentials(
  backend: Pick<BackendConfig, 'appId' | 'installationId'>,
  env: GithubKeyEnv,
): AppCredentials;
```

Assemble the `AppCredentials` the signer needs from the adapter's backend and the Worker's
private-key secret. Throws when the secret is unset.

```ts
const creds = appCredentials(cairn.backend, platform.env);
```

#### `installationToken`

```ts
declare function installationToken(creds: AppCredentials): Promise<string>;
```

Exchange the App JWT for a short-lived installation access token.

```ts
const token = await installationToken(creds);
```

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

#### `commitFile`

```ts
declare function commitFile(
  repo: RepoRef,
  path: string,
  content: string,
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string>;
```

Commit `content` to `path` on the configured branch through the contents API. The author is the
editor; the committer is omitted, so GitHub attributes the commit to the App. Returns the commit
sha, and a stale-sha 409 becomes a `CommitConflictError`. The caller must confine `path` to a
concept directory and derive `author` from the verified session.

```ts
const sha = await commitFile(repo, path, fileText, { message, author }, token);
```

#### Error classes

```ts
declare class CommitConflictError extends Error {
  readonly path: string;
  constructor(path: string);
}
declare class SiteConfigError extends Error {}
declare class NavValidationError extends Error {}
```

`CommitConflictError` signals a lost SHA race on a commit, so the save fails safe. `SiteConfigError`
is thrown by `parseSiteConfig` on a malformed root. `NavValidationError` is thrown by
`validateNavTree` on an invalid tree. `MAX_NAV_NODES` is the total node cap the validator enforces.

```ts
declare const MAX_NAV_NODES: 200;
```

### Delivery builders and responders

The read-model also re-exports the feed, sitemap, robots, SEO, and pagination builders, plus the
response helpers that wrap them. The public site usually imports these from `/delivery`; the same
symbols re-export here.

```ts
declare function deriveExcerpt(body: string, opts?: { description?: string; maxChars?: number }): string;
declare function wordCount(body: string): number;
declare function paginate<T>(items: T[], page: number, perPage: number): Page<T>;
declare function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string;
declare function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string;
declare function buildSitemap(urls: SitemapUrl[]): string;
declare function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string;
declare function buildSeoMeta(input: SeoInput): SeoMeta;
declare function readSeoFields(frontmatter: Record<string, unknown>): SeoFields;
declare function resolveImageUrl(image: string, origin: string): string | undefined;
declare function rssResponse(channel: FeedChannel, items: FeedItem[]): Response;
declare function jsonFeedResponse(channel: FeedChannel, items: FeedItem[]): Response;
declare function sitemapResponse(urls: SitemapUrl[]): Response;
declare function robotsResponse(opts: { sitemapUrl: string; disallow?: string[] }): Response;
declare function createPublicRoutes(/* deps */): { /* route loaders */ };
```

`deriveExcerpt` and `wordCount` derive a summary and a count from a body. `paginate` slices a list
into a page. `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, and `buildRobots` build the feed,
sitemap, and robots documents; the matching `*Response` helpers wrap each in a `Response` with the
right headers. `buildSeoMeta` builds the head data, `readSeoFields` reads the SEO fields off
normalized frontmatter, and `resolveImageUrl` resolves an image path to an absolute URL.
`createPublicRoutes` builds the public catch-all route loaders, which the delivery reference page
documents in full.

```ts
return jsonFeedResponse(channel, items);
```

#### `frontmatterFromForm` and `dateInputValue`

```ts
declare function frontmatterFromForm(fields: FrontmatterField[], form: FormData): Record<string, unknown>;
declare function dateInputValue(value: unknown): string;
declare function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string;
```

`frontmatterFromForm` decodes submitted form data into raw frontmatter, one rule per field type.
`dateInputValue` coerces a frontmatter date to the `YYYY-MM-DD` an `<input type="date">` wants.
`requireOrigin` returns the site's public origin from config, never a request header, so a forged
Host header cannot redirect a magic link.

```ts
const raw = frontmatterFromForm(descriptor.fields, formData);
```

---

## Low-level

These are internal helpers leaked through `export *`. They are not part of the supported surface and
a site should not depend on them. They are listed for completeness only.

- `signingSelfTest` deploy-time self-test for the App signer, exercising the key import and sign with no network call.
- `fileSha` the current blob sha for a repo path, or null when the file does not exist.
- `contentsUrl` the contents-API URL for a repo path, pinned to the branch.
- `treeUrl` the recursive Git Trees API URL for the configured branch.
- `readRaw` fetch a file's raw markdown, or null when it does not exist.
- `markdownFilesIn` the markdown files directly in a directory from a parsed tree, newest id first.
- `listMarkdown` list a concept directory's markdown files through the Git Trees API.
- `strProp` read a string hast property off an element.
- `markFirstList` tag the first `<ul>` among children with `ec-grid` and strip its whitespace text nodes.
- `isElement` a hast type guard for an element node.
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
| `ConceptConfig` | `interface ConceptConfig<S>` | Per-site configuration for one content concept: dir, label, schema, summaryFields. |
| `ConceptDescriptor` | `interface ConceptDescriptor` | The engine-internal, uniform view of one concept after normalization. |
| `ConceptUrlPolicy` | `interface ConceptUrlPolicy` | A concept's permalink pattern and date-prefix granularity, set in the YAML config. |
| `RoutingRule` | `interface RoutingRule` | Concept-fixed routing: routable, dated, inFeeds. |
| `BackendConfig` | `interface BackendConfig` | The GitHub App backend a site reads from and commits to. |
| `SenderConfig` | `interface SenderConfig` | Magic-link sender identity for Cloudflare Email Sending. |
| `NavMenuConfig` | `interface NavMenuConfig` | A git-committed YAML menu the nav editor manages. |
| `AssetConfig` | `interface AssetConfig` | Reserved asset slot (seam 4), typed and unused in the rebuild. |
| `CairnExtension` | `interface CairnExtension` | A future build-time extension that folds in like the adapter. |
| `CairnRuntime` | `interface CairnRuntime` | The composed runtime the engine serves from (seam 2 output). |
| `ComposeInput` | `interface ComposeInput` | The input to `composeRuntime`: adapter, siteConfig, extensions. |
| `AdminPanel` | `interface AdminPanel` | A site-defined admin screen contributed by an extension (Mode 2). |
| `FieldTypeDef` | `interface FieldTypeDef` | A custom frontmatter field type contributed by an extension (Mode 2). |
| `FrontmatterField` | `type FrontmatterField` | The discriminated union the per-concept frontmatter form is generated from. |
| `FieldType` | `type FieldType` | A component attribute or item field input type: text, select, icon, boolean. |
| `TextField` | `interface TextField` | A single-line text field with length and pattern rules. |
| `TextareaField` | `interface TextareaField` | A multi-line text field with rows, length, and pattern rules. |
| `DateField` | `interface DateField` | A `YYYY-MM-DD` date field with min and max. |
| `BooleanField` | `interface BooleanField` | A checkbox field; absent means false. |
| `TagsField` | `interface TagsField` | A closed-vocabulary tag set rendered as checkboxes. |
| `FreeTagsField` | `interface FreeTagsField` | Free-form tags edited as one comma-separated input. |
| `ValidationResult` | `type ValidationResult` | A validator's verdict: normalized data, or field-keyed errors. |
| `ConceptSchema` | `interface ConceptSchema<F>` | A concept's schema: fields, validator, and Standard Schema conformance. |
| `DefineFieldsOptions` | `interface DefineFieldsOptions<F>` | Options for `defineFields`, carrying the `refine` cross-field check. |
| `Infer` | `type Infer<S>` | Extract the inferred frontmatter type from a `ConceptSchema`. |
| `InferFields` | `type InferFields<F>` | The normalized frontmatter type inferred from a field tuple. |
| `StandardInput` | `interface StandardInput` | The validate input the adapter takes: raw frontmatter and the body. |
| `StandardSchemaV1` | `interface StandardSchemaV1<I, O>` | A local copy of the Standard Schema v1 interface, for ecosystem interop. |
| `DatePrefix` | `type DatePrefix` | Filename date-prefix granularity for a dated concept: year, month, day. |
| `CairnRef` | `interface CairnRef` | A resolved reference to a content entry by its concept and permanent id. |
| `LinkResolve` | `type LinkResolve` | Resolve a `CairnRef` to its live permalink, or undefined when missing. |
| `Manifest` | `interface Manifest` | The whole corpus as one committed file, with a version guard. |
| `ManifestEntry` | `interface ManifestEntry` | One entry's projection: identity, routing, draft flag, outbound edges. |
| `ManifestDiff` | `interface ManifestDiff` | The drift between a built and a committed manifest: added, removed, changed. |
| `ManifestEntryDiff` | `interface ManifestEntryDiff` | A changed entry and the fields that differ between manifests. |
| `LinkTarget` | `interface LinkTarget` | The minimal entry view the preview resolver and picker read. |
| `InboundLink` | `interface InboundLink` | One inbound linker: enough to name it and link to its edit page. |
| `ComponentDef` | `interface ComponentDef` | A site component: how it inserts (editor) and how it renders (rehype). |
| `ComponentRegistry` | `interface ComponentRegistry` | The single source the render pipeline and the editor palette both read. |
| `ComponentValues` | `interface ComponentValues` | Guided-form values for one component: attribute and slot values. |
| `ComponentValidation` | `type ComponentValidation` | A validation verdict: ok, or field-keyed error messages. |
| `ComponentInsert` | `type ComponentInsert` | The outcome of preparing a form for insertion: markdown, or field errors. |
| `AttributeField` | `interface AttributeField` | One `{key="value"}` attribute on a directive, or one repeatable item field. |
| `SlotKind` | `type SlotKind` | A component slot kind: markdown, inline, repeatable. |
| `SlotDef` | `interface SlotDef` | One named content region of a component. |
| `IconSet` | `type IconSet` | A glyph name to SVG path-data map the site owns. |
| `MakeIcon` | `type MakeIcon` | A site's icon factory: turn a stamped name and role into a hast element. |
| `RendererOptions` | `interface RendererOptions` | The render pipeline's stagger, sanitize, and anchor controls. |
| `ReferenceOptions` | `interface ReferenceOptions` | The title and summary for `generateComponentReference`. |
| `SiteConfig` | `interface SiteConfig` | The shape of the YAML site-config file. |
| `NavNode` | `interface NavNode` | One navigation node: label, optional url, optional children. |
| `RawFile` | `interface RawFile` | A raw content file before parsing: the path and the markdown text. |
| `ContentSummary` | `interface ContentSummary` | The cheap, plain-data view of one entry, for lists, feeds, and the sitemap. |
| `ContentEntry` | `interface ContentEntry<F>` | The detail view: a summary plus the frontmatter and the body. |
| `ContentIndex` | `interface ContentIndex<F>` | The per-concept query surface: all, byId, byTag, allTags, adjacent. |
| `ContentProblem` | `interface ContentProblem` | One entry's validation failure recorded at build for the gate. |
| `ConceptIndex` | `interface ConceptIndex` | One concept's descriptor paired with its built index. |
| `SiteIndex` | `interface SiteIndex` | The cross-concept query surface a catch-all route and the sitemap read. |
| `SiteIndexes` | `type SiteIndexes<A>` | The typed per-concept indexes plus the cross-concept `site` resolver. |
| `SiteGlobs` | `type SiteGlobs<A>` | A per-concept raw glob record keyed by concept id, from `import.meta.glob`. |
| `Page` | `interface Page<T>` | A page of items plus its navigation state. |
| `FeedChannel` | `interface FeedChannel` | Feed channel metadata; URLs are absolute. |
| `FeedItem` | `interface FeedItem` | One feed entry; `contentHtml` carries the rendered body. |
| `SitemapUrl` | `interface SitemapUrl` | One sitemap URL, with an optional `lastmod` date. |
| `SeoInput` | `interface SeoInput` | The inputs for the head; all URLs are absolute. |
| `SeoMeta` | `interface SeoMeta` | Plain-data head: a title, meta tags, link tags, and one JSON-LD object. |
| `SeoFields` | `interface SeoFields` | The head fields a concept can carry in frontmatter. |
| `Role` | `type Role` | An editor's role: owner or editor. |
| `Editor` | `interface Editor` | The session shape the whole admin reads: email, displayName, role. |
| `AuthEnv` | `interface AuthEnv` | Worker bindings and vars the auth layer reads. |
| `AuthBranding` | `interface AuthBranding` | Per-site identity for the magic-link email. |
| `MagicLinkMessage` | `interface MagicLinkMessage` | The message a built magic-link email carries. |
| `SendMagicLink` | `type SendMagicLink` | The injected send; production uses `cloudflareSend`. |
| `RepoRef` | `interface RepoRef` | Repo coordinates pinned to a branch: owner, repo, branch. |
| `RepoFile` | `interface RepoFile` | A markdown file in a concept directory: id, name, path. |
| `CommitAuthor` | `interface CommitAuthor` | A commit author: the signed-in editor's name and email. |
| `AppCredentials` | `interface AppCredentials` | What the App signer needs: app id, installation, and the base64 PEM. |
| `GithubKeyEnv` | `interface GithubKeyEnv` | The Worker secret holding the GitHub App private key. |
| `PublicRoutesDeps` | `interface PublicRoutesDeps` | The deps `createPublicRoutes` takes; see the delivery page. |
| `ListData` | `interface ListData` | The list route's load data; see the delivery page. |
| `TagData` | `interface TagData` | The tag route's load data; see the delivery page. |
| `TagIndexData` | `interface TagIndexData` | The tag-index route's load data; see the delivery page. |
| `EntryData` | `interface EntryData` | The entry route's load data; see the delivery page. |
