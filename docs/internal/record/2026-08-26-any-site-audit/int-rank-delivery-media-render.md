# Internals audit — delivery / media / render / islands / reproductions

Scope: `src/lib/delivery/` (20 files), `src/lib/media/` (15), `src/lib/render/` (18), `src/lib/islands/` (2),
`src/lib/reproductions/` (13). ~7,700 lines, all read; the load-bearing modules read in full.
Audited against `docs/internal/code-idioms.md`, the TSDoc standard (CLAUDE.md "Authoring"), and the
three-part bar (idiomatic Svelte 5 / SvelteKit 2; inviting to a new developer; easy for an agent to extend).

## State of the area

This is the strongest-written part of the engine I have seen. `delivery/` is close to exemplary:
every module carries its `// cairn-cms:` orientation header, the barrel split (`index` / `data` /
`head`) is enforced by its own boundary test and explained at the top of each file, the pure
projections (`views.ts`, `feeds.ts`, `sitemap.ts`, `manifest.ts`) are genuinely pure and separately
testable, and the comments record *why* (the `resolveImageUrl` `media:`-token trap, the `all()`
routable gate, the `SKIP`-without-index note in `table-scroll.ts`) rather than paraphrasing the code.
`media/` is nearly as good, with real seam discipline (`MediaStore`, `DeliveryBucket`,
`ReconcileBucket` each a narrow local interface with the workers-types reasoning written down) and a
clean pure-core / IO-glue split. Test coverage is one file per module, ~50 files for this area alone.
Svelte 5 rune usage is correct throughout: `$derived` for computation, `$props()` destructured once,
no `$effect`-for-derivation anywhere, no legacy stores, snippets used properly in `CustomScreen.svelte`.

The weaknesses cluster in `render/`, which reads as the oldest and least-swept subtree, and in the
seams between subsystems. `render/` is where the M1 module-header convention broke down (10 of 18
files open on a bare `import`), where the same job is done two ways (two directive-node typings, two
rehype-plugin signatures), where the public component-authoring toolkit is a barrel pointing into the
internal dispatcher's file, and where a first consumer site's `ec-` class prefix is still baked into
the engine's public rendered output and public reference docs. Across the area a second theme
recurs: a type or a parameter that lies and is then worked around at the call site rather than fixed
at its source — the dead `SiteConfig` threaded through three public functions, `MediaEntry.alt`
typed `string` but coerced where it is read, `ReproStory.component` too narrow so all 25 stories
launder through `as unknown as`, and a five-function `async` chain in `component-grammar.ts` that
never awaits anything and has already grown a `.then()` stale-guard at its call site. None of these
is a correctness bug; all of them are exactly the kind of thing a pre-beta engine should burn churn
on, because most are frozen public surface at 1.0.

**Grade: B+.** Best-in-repo prose and module discipline in `delivery/` and `media/`; `render/` and
the reproductions seam carry the debt, and four items are public surface that 1.0 would freeze.

---

## 1. The engine's public rendered output and authoring toolkit carry a consumer site's `ec-` class prefix — REFACTOR

The render toolkit stamps `ec-glyph`, `ec-icon`, `ec-icon-secondary`, `ec-head`, and `ec-grid` onto
markup every cairn site ships. `ec` is ecxc.ski's initials; nothing in the engine says so, and
nothing defines what it stands for.

`src/lib/render/glyph.ts:17`:

```ts
    { className: ['ec-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
```

`src/lib/render/rehype-dispatch.ts:29-31, 52, 62`:

```ts
export function iconSpan(glyphEl: Element, role?: string): Element {
  const className = role === 'secondary' ? ['ec-icon', 'ec-icon-secondary'] : ['ec-icon'];
  return h('span', { className }, [glyphEl]);
...
  return h('div', { className: ['ec-head'] }, children);
...
    ul.properties = { ...ul.properties, className: ['ec-grid'] };
```

This directly contradicts the class contract the engine writes down two files away, in
`src/lib/render/highlight.ts:15-17`:

> THE .cairn-tok-* CLASS CONTRACT: the engine owns the token class names (below); the site owns the
> colors. This mirrors the engine's .cairn-place-* figure-placement contract

Every other engine-emitted class in the area obeys that: `cairn-broken-link`, `cairn-broken-media`,
`cairn-place-*`, `cairn-include-missing`, `cairn-fragment-boundary`, `cairn-tok-*`,
`data-cairn-island`. `N5` even fixes the admin's element ids to `cairn-<component>-<element>`.
The `ec-` family is the one hold-out, and it is not internal: it is published to consumers in
`docs/reference/render.md:20` ("wraps a built glyph element in an `ec-icon` span"), and it has
already leaked back into three admin components which re-declare `.ec-glyph` locally with an
apologetic comment (`IconPicker.svelte:101`, `ComponentInsertDialog.svelte:478`,
`MediaPicker.svelte:267`: "ec-glyph is the public render pipeline's own class").

A developer styling a cairn site has to write `.ec-head` with no way to learn what `ec` means. At
1.0 this freezes.

**Remediation.** Rename the family to `cairn-glyph` / `cairn-icon` / `cairn-icon-secondary` /
`cairn-head` / `cairn-grid` across `glyph.ts`, `rehype-dispatch.ts`, the three admin components, the
tests, `docs/reference/render.md`, and the showcase theme. One `Consumers must:` changelog line
naming the five class renames. Churn is free until beta; this is the last cheap moment.

---

## 2. A dead `SiteConfig` parameter is threaded through three public delivery functions — REFACTOR

`src/lib/delivery/site-descriptors.ts:8-16`:

```ts
/**
 * Per-concept descriptors for a site, from its adapter content. The `siteConfig` parameter is retained
 *  for API stability and the menus and site name it still carries; the URL policy now lives on each
 *  concept, so it is not read here.
 */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  void siteConfig;
  return normalizeConcepts(adapter.content);
}
```

The dead parameter is not contained. `createSiteIndexes` and `buildSiteManifest` both take a
`config: SiteConfig` whose *only* use is forwarding it here:

`src/lib/delivery/site-indexes.ts:37-43`:

```ts
export function createSiteIndexes<const A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
  opts: { validate?: boolean } = {},
): SiteIndexes<A> {
  const descriptors = siteDescriptors(adapter, config);
```

`src/lib/delivery/manifest.ts:18-21` is the same shape. All three are public API;
`docs/reference/delivery-data.md:546` publishes the signature verbatim, and the showcase chassis
constructs one to satisfy it (`examples/showcase/src/chassis/entry-data.ts:11`).

The cost is comprehension, not cycles. A new developer reading `createSiteIndexes(adapter,
siteConfig, globs)` reasonably concludes that site config participates in index building or URL
policy; it does not, and the code that would tell them so is two modules away behind a `void`. An
agent asked to change URL policy would start in `site-config.ts` and find nothing. "Retained for API
stability" is exactly the argument the standing ruling refuses pre-beta.

**Remediation.** Drop the parameter from all three signatures (`siteDescriptors(adapter)`,
`createSiteIndexes(adapter, globs, opts?)`, `buildSiteManifest(adapter, globs)`), update the three
engine call sites, the showcase chassis, `docs/reference/delivery-data.md`, and the tests. One
`Consumers must:` line. If any future need for site config is real, it comes back as an options
object per F4.

---

## 3. Five exported functions are `async` with nothing to await, and a call site pays for it — REFACTOR

`component-grammar.ts` → `component-validate.ts` → `component-insert.ts` is an entirely synchronous
chain declared async end to end. `unified().parse()` is synchronous; nothing in any of these
functions performs I/O.

`src/lib/render/component-grammar.ts:147-149`:

```ts
export async function parseComponent(markdown: string, def: ComponentDef): Promise<ComponentValues> {
  return valuesFromRoot(findComponentRoot(markdown, def), def);
}
```

`src/lib/render/component-grammar.ts:210-216`:

```ts
export async function parseComponentWithRawKeys(
  markdown: string,
  def: ComponentDef,
): Promise<{ values: ComponentValues; rawKeys: string[] }> {
  const root = findComponentRoot(markdown, def);
  return { values: valuesFromRoot(root, def), rawKeys: rawKeysFromRoot(root) };
}
```

`componentRoundTripSafety` (`:180`), `validateComponent` (`component-validate.ts:14`) and
`buildComponentInsert` (`component-insert.ts:15`) inherit it. The only `await`s anywhere in the chain
await each other.

The fake asynchrony is not free. `EditPage.svelte:893, 912` builds a stale-guard around what is a
pure function call:

```
  // Resolve editability when the caret-component changes, async-safe. componentRoundTripSafety is
...
    void componentRoundTripSafety(current.markdown, def)
      .then(...)
```

That is also an `A1` violation (`no .then chains`) forced by a signature that had no reason to be a
promise. Any agent adding a validation rule here will keep the async, and any reader will assume the
parse touches the network or the filesystem.

**Remediation.** Make all five synchronous. Update the five call sites (`ComponentForm.svelte:213`,
`EditPage.svelte:912, 963`, and the render tests); `EditPage`'s stale-guard `.then` chain collapses
into a direct assignment, removing the `A1` violation with it.

---

## 4. Two ways to type a directive node, two ways to type a rehype plugin, in one directory — REFACTOR

`render/` does the same two jobs two ways, and the good exemplar for each sits beside the bad one.

**Directive nodes.** `remark-figure.ts:10, 78` uses the real ecosystem types:

```ts
import type { ContainerDirective } from 'mdast-util-directive';
...
    visit(tree, 'containerDirective', (node: ContainerDirective) => {
```

`component-grammar.ts:68-78, 93-98` hand-rolls a parallel structural interface and casts to it
throughout:

```ts
// A minimal structural view of a mdast containerDirective node (mdast-util-directive shape).
interface DirectiveNode {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
...
function isContainer(node: RootContent): node is RootContent & DirectiveNode {
  return (node as DirectiveNode).type === 'containerDirective';
}
```

with a further eight ad-hoc casts (`(c as { type: string }).type`, `(li as { children?: RootContent[] })`,
`readLabel`'s three-field inline type at `:236-240`). `remark-directives.ts` imports the correct
types at `:2` and then does not use them in its helpers, casting `node: unknown` instead
(`:7-8`, `:14-15`, `:95-98`), and `remark-figure.ts:22-23` records the duplication as a convention:
"this mirrors the local cast idiom in remark-directives.ts."

**Plugin signatures.** `collect-headings.ts:37` and `table-scroll.ts:49` and `remark-figure.ts:77`
type the tree properly (`(tree: Root, file: VFile)`). `resolve-links.ts:20-23` and
`resolve-media.ts:189-192` do not:

```ts
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[CAIRN_RESOLVE] as LinkResolve | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'link', (node: ResolvableNode) => {
```

`Parameters<typeof visit>[0]` is a cast written to defeat a type, in a file whose sibling shows the
type is satisfiable. This is the clearest framework-fighting in the area: the ecosystem ships the
types, the repo declines them, and an agent adding a sixth plugin has two contradictory templates.

**Remediation.** Codify one shape in `code-idioms.md` and converge: import `Root`/`ContainerDirective`/
`LeafDirective`/`TextDirective` from `mdast`/`mdast-util-directive`, delete the local `DirectiveNode`
interface and the `unknown`+`Parameters<typeof visit>[0]` casts, and keep the one genuinely necessary
cast (`resolve-include.ts:78`'s `hName`-only node) with its existing comment.

---

## 5. The public component-authoring toolkit lives inside the internal dispatcher's file — REFACTOR

`src/lib/render/authoring.ts` is the whole `@glw907/cairn-cms/render` authoring entry, and it is a
one-line re-export into a file named for something else:

```ts
export { iconSpan, cardShell, headRow, isElement, strAttr } from './rehype-dispatch.js';
```

Those five functions are the extension API a site calls from inside `build(ctx)`. In
`rehype-dispatch.ts` they sit at `:6-68`, interleaved with the internal machinery a site must never
touch: `transformChildren` (`:73`), `readAttributes` (`:83`), `partitionSlots` (`:102`),
`serializeIslandProps` (`:142`), `islandBoundary` (`:158`), `transformNode` (`:172`). The file has no
`// cairn-cms:` header saying it is two things.

For a newcomer, "where do the hast builders live" has an unguessable answer. For an agent asked to
add a sixth authoring helper, the correct destination is a file whose name says "rehype dispatch",
and its diff lands next to the island-boundary serializer. The public/internal line here is carried
only by which names `authoring.ts` happens to re-export.

**Remediation.** Move `isElement`, `strAttr`, `iconSpan`, `cardShell`, `headRow`, `markFirstList`
into `src/lib/render/hast-builders.ts` with its own M1 header naming the public/internal split, and
re-point `authoring.ts`, `rehype-dispatch.ts`, `glyph.ts`, and the tests. `rehype-dispatch.ts` keeps
`strProp` and the transformer.

---

## 6. Ten of eighteen `render/` modules have no M1 module header, and no gate enforces one — REFACTOR

`docs/internal/code-idioms.md:68-71` (M1): "Every module opens with a `// cairn-cms: <one-paragraph
orientation>` header naming its job and the non-obvious rationale ... The stragglers ... converge."

`delivery/` converged (20 of 20 compliant). `media/` converged (14 of 15; `delivery-bucket.ts` opens
with a good header that just lacks the prefix). `render/` did not:

```
src/lib/render/pipeline.ts          |  import { unified, type PluggableList } from 'unified';
src/lib/render/rehype-dispatch.ts   |  import type { Root, Element, ElementContent } from 'hast';
src/lib/render/sanitize-schema.ts   |  import { defaultSchema, type Schema } from 'hast-util-sanitize';
src/lib/render/component-grammar.ts |  import { unified } from 'unified';
src/lib/render/remark-directives.ts |  import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
src/lib/render/table-scroll.ts      |  import { visit, SKIP } from 'unist-util-visit';
src/lib/render/component-insert.ts  |  import { serializeComponent } from './component-grammar.js';
src/lib/render/component-validate.ts|  import { parseComponentWithRawKeys } from './component-grammar.js';
src/lib/render/component-reference.ts| import { serializeComponent } from './component-grammar.js';
src/lib/render/glyph.ts             |  import { s } from 'hastscript';
```

`pipeline.ts` is the worst instance: it is the entry point to the entire render subsystem, it
composes twelve plugins in a load-bearing order, and it opens with an import list. The ordering
rationale is present but scattered across inline comments at `:95`, `:104`, `:116`, `:128`, `:131`
that a reader only finds by reading the function body.

Repo-wide the number is 127 of 274, so this is not a `render/`-only failure — but `render/` is the
one subtree in this area that has not converged, and the reason it never will on its own is that
`check:comments` (`scripts/checks/check-comments.sh`) runs ESLint for TSDoc and the em-dash ban and
checks nothing about module headers. There is no gate, so M1 is prose in a doc.

**Remediation.** Add the ten headers, `pipeline.ts` first (its header should carry the plugin-order
contract now buried inline). Then add `scripts/checks/check-module-headers.mjs` asserting that every
`src/lib/**/*.ts` opens with `// cairn-cms`, with an explicit allowlist for any deliberate exception,
and wire it into the gate list — the repo already runs ~25 such checks, and per CLAUDE.md a watch
item that is machine-detectable belongs in a gate, not a doc.

---

## 7. `ReproStory.component` is typed too narrowly, so all 25 stories launder through `as unknown as` — REFACTOR

`src/lib/reproductions/index.ts:43`:

```ts
  component: Component<Record<string, unknown>>;
```

No real admin component has that prop signature, so every single registration double-casts.
`src/lib/reproductions/stories/auth.ts:14-17`:

```ts
const login: ReproStory = {
  id: 'auth/login',
  component: LoginPage as unknown as Component<Record<string, unknown>>,
  host: 'bare',
```

25 occurrences across the five story modules (editor 8, media 7, publish 4, site 4, auth 2). The
paired `props: Record<string, unknown>` is equally untyped, so nothing anywhere checks that a story's
fixture prop bag matches the component it mounts — the exact defect a reproduction seam exists to
catch is invisible to the compiler.

This is the area's sharpest agent-extensibility problem: the shape an agent copies to add story 26
is a cast that turns off type-checking, and it is already normalized 25 times.

**Remediation.** Give the seam a `defineStory` factory in the repo's own F1 idiom —
`defineStory<P>(story: { component: Component<P>; props: P; ... }): ReproStory` — which infers `P`
from the component and type-checks `props` against it at declaration, then erases to the existing
`ReproStory` for the registry array. All 25 casts delete; a mismatched fixture becomes a
`check`-time error.

---

## 8. `MediaEntry.alt` is typed `string` but is not one, and the fix lives at the read site — REFACTOR

`src/lib/media/manifest.ts:13-19` declares `alt: string`, and `:36-39` returns any object at all as a
valid manifest:

```ts
export function parseMediaManifest(json: unknown): MediaManifest {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as MediaManifest;
}
```

The consequence is worked around three modules later, in `src/lib/media/library-entry.ts:62`:

```ts
    alt: (entry.alt as string | null | undefined) ?? '',
```

documented at `:47-53` as deliberate ("a hand-edited or older-schema `media.json` can carry a null or
missing `alt` even though `MediaEntry` types it as `string`"). The reasoning for putting the coercion
at the sole construction site is sound; leaving the declared type false is not. Every other reader of
`MediaEntry.alt` — and there is no gate stopping a fourth one — trusts a `string` that the parse
boundary never established, and the next reader has no cast to warn them.

`V3` already names this file's sibling function (`validateMediaEntry`) as the exemplar for
"untrusted data is re-validated exactly where it crosses the trust boundary". `parseMediaManifest`
crosses the same boundary and validates nothing.

**Remediation.** Normalize at the parse boundary: have `parseMediaManifest` coerce each row's `alt`
to `''` when absent or non-string (reusing `validateMediaEntry`'s field checks, or a narrow
`normalizeMediaRow`), then delete the cast in `library-entry.ts:62` and keep its comment as a note on
where the normalization now lives.

---

## 9. A public doc comment describes a template syntax cairn does not have — NOTE

`src/lib/render/component-grammar.ts:36-38`:

```ts
/**
 * Render a parsed component node back to its `{% name %}` directive source, the inverse of {@link parseComponent}.
 */
export function serializeComponent(def: ComponentDef, values: ComponentValues): string {
```

cairn's component grammar is `:::name[label]{key="value"}`. `{% ... %}` is Liquid/Jekyll syntax and
appears exactly once in the entire repository: this comment. The function's own body four lines below
builds the colon fence (`const fence = COLON.repeat(...)`).

Under the TSDoc standard a comment states the contract; this one states a false one, and it sits on
the function an agent reads first when asked to change the serialization format. A wrong comment is
worse than the missing headers in finding 6, which is why it is called separately.

**Remediation.** Rewrite as: "Serialize a component's form values to its `:::name[label]{attrs}`
directive source, the inverse of {@link parseComponent}." While there, note that the escape rules for
`&`/`"` (`:17-21`) and `[`/`]` (`:43-45`) are what make the round trip lossless.

---

## 10. `reproductions/index.ts` is a public subpath barrel carrying resident logic — NOTE

`docs/internal/code-idioms.md:74-75` (M2): "Barrels exist only at public subpath entries and stay
re-export-only; `doctor/index.ts` moves its resident logic out to honor this."

`src/lib/reproductions/index.ts` is the `@glw907/cairn-cms/reproductions` entry and holds the
`ReproStory` interface (`:35-96`, ~60 lines of contract), the registry array (`:102-108`), and a
lookup function (`:116-120`):

```ts
export function getStory(id: string): ReproStory {
  const story = stories.find((entry) => entry.id === id);
  if (!story) throw new Error(`No reproduction story registered for id "${id}"`);
```

The node-safe half (`manifest.ts`) is a separate module by design and honors the split; the Svelte
half collapsed the barrel and the logic into one file. This also creates a circular-looking shape
every story module participates in: `stories/*.ts` imports `ReproStory` from `../index.js` while
`index.ts` imports each `*Stories` array back from `stories/*.ts`.

That error message is also the area's one unprefixed `Error` (E1 wants `cairn: `); everything else
in `reproductions/` uses `cairn reproductions: ` (`stories/support.ts:44`, `stories/media.ts:37`,
`stories/publish.ts`), and the rest of the area uses `cairn: ` — three spellings for one convention.

**Remediation.** Move `ReproStory`, `ReproInstance`, `stories`, and `getStory` into
`reproductions/registry.ts`; leave `index.ts` re-export-only (mirroring `delivery/index.ts`). Have
the story modules import `ReproStory` from `registry.js` directly. Settle the prefix on `cairn: `
everywhere, and record the decision in the E1 bullet.

---

## 11. `publicPath` takes five positional arguments, three of them adjacent strings — NOTE

`src/lib/media/naming.ts:129-135`:

```ts
export function publicPath(
  slug: string | null,
  shortHash: string,
  ext: string,
  urlForm: 'slug' | 'opaque',
  publicBase = '/media',
): string {
```

`F4`: "New internal functions taking more than two logical inputs take one options object." This is
internal (not on the `/media` barrel) and takes five. Two of the three call sites pass the same five
values in the same order, one passes four:

- `resolve-media.ts:103`  `publicPath(entry.slug, entry.hash, entry.ext, resolved.urlForm, resolved.publicBase)`
- `resolve-media.ts:121`  identical
- `resolve-media.ts:146`  `publicPath(entry.slug, ref.hash, entry.ext, 'slug')`

`slug`, `shortHash`, and `ext` are adjacent, all string-typed, and a transposition compiles and
produces a plausible-looking wrong URL. The duplicated four-argument call at `:103`/`:121` inside one
factory is a second small tell.

**Remediation.** `publicPath({ slug, hash, ext, urlForm, publicBase })`, and in
`buildMediaResolver` hoist the two identical calls into one local
`const deliveryPath = (entry: MediaEntry) => publicPath({...})`.

---

## 12. The content index builds a Map for permalinks and a linear scan for ids — NOTE

`src/lib/delivery/content-index.ts:153`:

```ts
    byId: (id) => entries.find((entry) => entry.id === id),
```

`site-resolver.ts:74` builds `byPath` as a `Map`, then resolves through the linear `byId`
(`:96-99`):

```ts
    byPermalink(path) {
      const hit = byPath.get(normalizePath(path));
      return hit ? hit.index.byId(hit.id) : undefined;
    },
```

Every prerendered page is one `byPermalink`, so the prerender is O(N²) in entries per concept, and
`markdownEntries` (`public-routes.ts:219-226`) walks every entry calling `byPermalink` again for the
noindex check, doubling it. `resolveReferences` (`site-resolver.ts:173`) also calls `byId` once per
reference edge.

At a few hundred entries this is invisible; the point is consistency rather than milliseconds — the
same module reaches for a Map for one lookup and a scan for the other, so a reader cannot tell which
is the intended idiom.

**Remediation.** Build `const byIdMap = new Map(entries.map((e) => [e.id, e]))` alongside `sorted` in
`createContentIndex` and have `byId` read it. Two lines.

---

## 13. Three reproduction marker anchors are utility-class chains — NOTE

`src/lib/reproductions/stories/site.ts:29, 33`:

```ts
    { n: 2, key: 'tag-list', anchor: 'div.overflow-hidden.card-shell.card-shadow' },
...
    { n: 4, key: 'not-on-list', anchor: 'div.rounded-box.border-dashed' },
```

and `stories/media.ts:172` (`anchor: 'header p'`). The other eleven anchors in the seam are exactly
right — `#cairn-vocab-new-label`, `button[aria-label="Remove Gear"]`,
`[role="tablist"][aria-label="Editor view"]` — matching `N5`'s id convention and `T5`'s
role/label-first preference.

A Tailwind class chain is not a contract. Reordering `card-shell card-shadow`, swapping
`overflow-hidden` for `overflow-clip`, or restyling the empty-state box silently unhooks a numbered
callout that a cairn-pub docs page still numbers in prose. `check:visuals` and
`reproductions-marker-crop.test.ts` will catch a dropped anchor, but the failure will point at the
reproduction rather than at the component edit that caused it.

**Remediation.** Give those three elements ids in the `cairn-<component>-<element>` form
(`#cairn-vocab-tag-list`, `#cairn-vocab-not-on-list`, `#cairn-media-count`) in
`VocabularyAdmin.svelte` and `CairnMediaLibrary.svelte`, and anchor on those.

---

## 14. `MediaResolve` lives in `render/` while everything it names lives in `media/` — NOTE

`src/lib/render/resolve-media.ts:78` declares the type; `src/lib/media/index.ts:17` re-exports it
across the boundary as part of the public `/media` surface:

```ts
export { buildMediaResolver, type MediaResolve } from '../render/resolve-media.js';
```

`buildMediaResolver` reads `MediaManifest` (`media/manifest.ts`), `ResolvedAssetConfig`
(`media/config.ts`), `MediaRef` (`media/reference.ts`), and calls `publicPath` (`media/naming.ts`)
and `presetUrl` (`media/transform-url.ts`) — it is a media function that happens to live beside the
remark plugin that consumes it. `delivery/data.ts:58-59` then imports the pair from two directories:

```ts
export type { MediaResolve } from '../render/resolve-media.js';
export type { MediaRef } from '../media/reference.js';
```

A developer looking for the media resolver under `media/` finds a re-export line pointing elsewhere;
an agent asked to change resolution has to discover that half the media pipeline is in `render/`.

**Remediation.** Split `resolve-media.ts`: `MediaResolve`, `MediaImageDetail`, `buildMediaResolver`,
and `manifestMediaResolver` move to `media/resolve.ts`; `render/resolve-media.ts` keeps only the
remark plugin, the `MEDIA_RESOLVE` key, and the hProperties helpers, importing the type from
`media/`. The `/media` barrel then re-exports its own module.

---

## 15. `ReproContext.svelte` is a mount wrapper carrying an event firewall and a 49-line component block — NOTE

`src/lib/reproductions/ReproContext.svelte` is 379 lines, of which roughly 250 are comment. The
`@component` block alone runs `:1-50` and covers inertness, the HTML inert algorithm's modal-dialog
exemption, capture-phase registration order, cross-frame focus behavior in three browser engines, and
which seven stories lost their focus ring.

The prose is excellent and every paragraph is load-bearing — this is not a padding problem. It is a
module-boundary problem: three separable things share one file. The containment firewall (`:119-183`)
is a self-contained browser-behavior concern with no Svelte in it beyond `onDestroy`; the shell
fixture payload assembly with its `untrack` reasoning is a second (`:191-274`); the actual mount
wrapper is a third and is about twenty lines.

```
  if (BROWSER) {
    const containFocus = (event: FocusEvent) => {
...
    const firewalled = ['keydown', 'pointerdown', 'dragover', 'drop', 'beforeunload'] as const;
```

A newcomer asked "what does ReproContext do" must read an essay before reaching `<div
data-cairn-picture inert>`. The comment mass is itself the signal that the file is doing more than
one job.

**Remediation.** Extract `installReproContainment(): () => void` into
`reproductions/containment.ts` (the focus listener, the five capture listeners, the cancel set, and
the ~60 lines of rationale that go with them) and `definedOnly` into a small shared helper. The
component keeps the mount wrapper, the theme routing, the one-story invariant effect, and a shortened
`@component` block that points at the extracted module for the containment contract. The existing
`reproductions-containment.test.ts` then tests a function rather than a mount.
