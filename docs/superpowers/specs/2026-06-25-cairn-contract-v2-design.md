# Cairn site contract v2: design and rationale

Status: design draft, 2026-06-25. Source of truth for the implementation plan, and the basis for
the developer-facing explanation and reference pages this contract ships with. Written to the Google
developer documentation style.

This is a breaking redesign of the site contract: the `CairnAdapter`, the per-concept field schema,
the render seam, and the backend. It assumes no obligation to existing sites; consumers migrate. The
implementation is phased (see "Migration and phasing") so the highest-value pieces land first.

## Who this serves

Three audiences shape every decision here.

- **Non-technical editors** who want a premium markdown experience. They never see the contract, only
  its output: a faithful live preview and rich, good-looking content.
- **SvelteKit developers** who value excellent design and accept a full Cloudflare dependency. They
  write the adapter, so the contract is theirs to read and live in.
- **Technically thoughtful small businesses, non-profits, and projects** that need a website. They own
  the result and want it to look great, load fast, cost little, and stay maintainable.

A useful selection effect runs through these: a developer who wants to build a richly interactive web
app reaches for Astro or Next, not an opinionated markdown content management system (CMS) on
Cloudflare. The people who choose cairn choose it for premium, static, version-controlled content. The
contract leans into that rather than fighting it.

## Design principles, and where they come from

The contract is opinionated, and each opinion traces to how a comparable tool succeeded or failed.
The comparison set is Astro Content Collections, Keystatic, Decap, Sveltia, TinaCMS, Sanity, Payload,
Statamic, and Contentlayer/Velite.

- **Content stays plain markdown in git, as one source of truth.** Sanity's most-cited reason for
  leaving is "two sources of truth, zero unified history": no pull-request review, no rollback, no
  diff beside the code. cairn makes all of that the default.
- **No runtime database, ever.** TinaCMS's typed, queryable backend forces a Data Layer (MongoDB),
  which its own co-founder concedes "detracts from the simplicity of a static site." Payload requires
  a database outright. cairn queries content at build time over a committed manifest, and the backend
  seam is deliberately not a query layer, so a database never sneaks in.
- **No migrations, and no schema-change data loss.** Payload's scariest failure mode is a developer
  renaming a field and silently wiping production data, because there the schema is the database. In
  markdown-in-git a renamed field is a versioned string change. cairn is immune to that class, with one
  bounded exception that this contract makes safe: a reference field's target concept (see "References").
- **The field schema is a form specification, not just a validator.** cairn generates the editor form
  for a non-technical author, so a field must carry form metadata and stay introspectable. This is why
  Astro can use raw Zod (it only validates, it renders no editor) and cairn cannot.
- **Serialized data and bundled behavior are separate.** A field descriptor is plain serializable data
  that `load` ships to the editor form. Anything that is a function (a cross-field validator, a row
  label, a computed value) lives in the bundle, keyed by field name, and never crosses `load`. This one
  rule governs the field system, the directive components, and the computed fields below.
- **Defend minimalism on author ergonomics, never on "rich is overkill."** No source across Payload,
  Statamic, or Contentlayer wanted fewer field types; Payload's `blocks` and Statamic's Bard are their
  most-praised features, and the creator of Astro Content Collections names Contentlayer's inability to
  type a field as a URL or email as the flexibility gap that motivated a successor (dub.co). The risk of
  a small vocabulary is whether the few types match how authors think, not that authors want more.
- **A bounded surface is a maintenance asset.** Decap's exodus is over neglect (unpatched
  vulnerabilities, stale dependencies, no roadmap), not missing features. A smaller contract is easier
  for a small team to keep alive and secure.
- **Own the small-site ceiling.** Statamic proves flat-file read and index degrades into the
  hundreds-to-low-thousands of entries, and its vendor's own escape hatch is "switch to a database."
  cairn's read path stays sub-linear per page and the contract doesn't imply unbounded scale.

## The field system

A concept declares its fields as a record keyed by frontmatter key, where each value is a `fields.*`
constructor that returns a plain-data descriptor:

```ts
const post = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  fields: {
    title:   fields.text({ label: 'Title', required: true, max: 120 }),
    date:    fields.date({ label: 'Date', required: true, default: 'today' }),
    summary: fields.textarea({ label: 'Summary', max: 200,
                              help: 'Shown on cards and as the social description.' }),
    status:  fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
    topics:  fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
    hero:    fields.image({ label: 'Hero', seo: true }),
    author:  fields.reference({ concept: 'pages', label: 'Author' }),
    related: fields.array(fields.reference({ concept: 'posts' }), { label: 'Related posts' }),
  },
  computed: {
    readingTime: (entry) => Math.ceil(wordCount(entry.body) / 200),
  },
})
```

The primitive set is the scalars `text`, `textarea`, `number`, `select`, `multiselect`, `url`,
`email`, `date`, `datetime`, `boolean`, and `image`; the containers `object` and `array`; and
`reference`. That closes the table-stakes gap (a site no longer abuses `text` with a regular
expression for a number or an enum) and the structured-content gap in one vocabulary.

Why a primitive library rather than the previous closed union: the union was a bespoke,
domain-specific language (DSL) that was closed to extension. A composable set resolves several problems
at once. The closed union opens to extensible primitives, composition becomes natural, and the two
parallel field systems collapse into one (the directive registry declares its component attributes with
the same `fields.*` set; see "The render seam").

Decisions worth stating:

- **Data versus behavior.** Each constructor returns a plain serializable descriptor (label, help,
  options, constraints) that `load` ships to the form. A field's function-valued behavior, such as a
  cross-field validator or an array row's `itemLabel` derivation, lives in a co-bundled behavior table
  keyed by field name, resident in the app bundle and never in the `load` payload. The editor form reads
  the descriptors from `load` and looks up behavior from the bundle, the way the directive registry
  already pairs serialized attributes with bundled functions. This is the rule that lets one `fields.*`
  vocabulary serve both concept fields and component attributes without losing the cross-field validator
  that the component attributes carry today.
- **Validation is server-derived, and exposes Standard Schema.** The concept's validator derives from
  the descriptors on the server. A save-time validation error names the file and field the author can
  fix, never framework internals, which is the difference between Astro's praised and criticized error
  messages. The concept exposes Standard Schema at its boundary for ecosystem interop, and the derived
  validator emits multi-segment Standard Schema paths for nested errors (for example `['faq', 0,
  'question']`) so the form can route an error to the right nested input.
- **`image` is a rich leaf that composes, not a special case removed.** `image` stays a first-class
  leaf carrying the content-addressed `media:` reference, the upload and library picker, the `seo` flag,
  and the stored value `{ src, alt, caption?, decorative? }` (where `decorative` is the deliberate
  accessibility affordance of an intentional empty alt). What changes is that it composes inside `object`
  and `array` like any other leaf, so a hero is `fields.image({ seo: true })` and a gallery is
  `fields.array(fields.image())`. It is no longer hardcoded as the one structured field, but it is still
  the richest leaf.
- **`multiselect` replaces `tags` and `freetags`, with an explicit taxonomy marker.** A closed
  vocabulary uses `options`; an open one uses `creatable: true`. Because a multiselect can now have any
  name, the field that feeds the tag index, the tag pages, and the syndication-feed categories is the
  one marked `taxonomy: true`, at most one per concept (mirroring the single-`seo`-image rule). Without
  the marker the delivery layer would no longer know which field is the site's taxonomy.
- **`default` fills the form at render time.** The author sees the prefilled value and can clear it, and
  an empty save still omits the key, so the minimal-frontmatter invariant holds. A sentinel like
  `default: 'today'` resolves to a concrete value at render, not a literal stored string.
- **Computed fields are server-only and live outside `fields`.** A computed field is a function, so it
  sits in a distinct `computed` member, not in the serialized `fields` record. It derives from one
  entry's own frontmatter and body at index and build time, appears on the read model, and never ships
  to the editor form. Computed fields that would need to be queryable or that depend on a referenced
  asset are out, because that is exactly where Payload's and Velite's computed fields leak.
- **Identity stays filename-based.** There's no `slug` field; id, slug, and date derive from the
  filename through the existing identity unit.

## References

References are the contract's sharpest advantage, because the whole flat-file and typed-content
category fails to ship them cleanly. Keystatic stores a slug that, in its own docs' words, "will be
broken" when the slug changes. Decap's `relation` is its most bug-ridden widget. Astro's `reference()`
breaks non-deterministically (issue #12680). Contentlayer never shipped relationships and Velite's
maintainer refused them as out of scope. The two tools with real referential integrity, Sanity and
TinaCMS, buy it with a runtime database.

cairn already has the foundation the others lack: the `cairn:<concept>/<id>` content graph keys an edge
to a permanent id, repoints inbound body links on rename, and tracks backlinks, all at build time with
no database. v2 extends that graph to cover a frontmatter reference field.

A field declares its target concept, so the stored value is the target's permanent id, readable in the
file:

```ts
author:  fields.reference({ concept: 'pages' }),          // single
related: fields.array(fields.reference({ concept: 'posts' })),  // many
```
```yaml
author: jane-doe
related: [trail-conditions-update, season-pass-2026]
```

Cardinality is composition, not a flag: a single reference is `reference()`, many is
`array(reference())`. Each reference targets one concept, matching Keystatic; polymorphic references
are out, because they complicate the picker for a rare need.

The editor is a searchable picker over the target concept's entries, a generalization of the
body-link picker that already exists. This is also where the editor-versus-developer ergonomic line
sits: references point at things that genuinely are separate entities (an author, a series), and the
picker only offers entries that already exist. Content that belongs to the entry stays inline through
`object` and `array`, so an author never has to "create an entity first" for entry-owned content, which
is the friction Payload users report (#4991).

At delivery a reference resolves to the target's identity, meaning its permalink plus its summary, so a
template renders a linked author name with no extra read.

**The id is unique only within a concept.** The id grammar is identical across concepts, so
`2026-summary` can legitimately exist as both a post and a page. The field's `concept` is therefore
load-bearing: it supplies the half of the address the stored id omits. One consequence to plan for:
changing a reference field's `concept` reinterprets every stored id against a different concept, so it
is a content-affecting migration, and build-time validation treats a concept change as a re-resolution
that surfaces any newly dangling id. The manifest stores the resolved concept alongside the id for
frontmatter edges, so this drift is detectable rather than silent. This is the one bounded case behind
the "no schema-change data loss" principle, and the contract makes it loud instead of silent.

The integrity model is the part no flat-file competitor matches without a database. Each behavior below
is real engine work, not a free reuse of the body-link code:

- **One graph, built from two new components.** Frontmatter edges join the body-link graph through a
  schema-driven extractor that reads each `reference` and `array(reference)` field, pairs the stored id
  with the descriptor's `concept`, and merges those edges into the manifest. Today the manifest's edges
  come only from the body. The output is one merged edge set powering backlinks, rename, and delete; the
  inputs are a new extractor and a new rewriter, described next.
- **Rename-safe, including across open branches.** A frontmatter reference is a YAML scalar or array,
  not a markdown link, so rename uses a new YAML-value rewriter rather than the body-link span rewriter.
  The shipped rename repoints only inbound edges on `main`, so v2 adds a cross-branch inbound-edge index
  (the content-edge analog of the media usage index, fail-closed) and, at rename, either repoints
  inbound edges on open `cairn/*` branches or refuses the rename until those branches publish or
  discard, symmetric with the existing pending-edits guard. Without this, an entry that references the
  renamed target from an open branch would keep a stale edge.
- **Delete refuses when an entry is still referenced.** Deleting a referenced entry is refused with a
  message naming the referencing entries, extended from the shipped main-only refusal to span open
  branches through the same cross-branch index. Refusing (rather than warning and allowing) keeps the
  build from breaking later, and it still beats Keystatic's silent slug break.
- **Dangling fails the build, deterministically.** A reference to a missing id fails the build with a
  reproducible, file-and-field-named error. That's the direct answer to Astro `reference()`'s
  intermittent failures.
- **Editing stays forgiving.** A reference whose target is mid-flight on another branch warns rather
  than blocks at save time, matching cairn's existing collision-warns-and-allows posture. Strict at the
  deploy gate, forgiving while authoring.

The backlink payoff ("what links here," a series index) falls out of the merged graph for free.

## The `object` and `array` primitives

These containers let the field set compose, and one rule governs the design: nesting is where field
contracts go to die. Every one of Decap's worst, longest-lived bugs lives at a composition boundary,
and Sveltia's headline fixes are all the nested editor. So nesting is capped at one level.

An `object` holds leaf fields (scalars, `image`, and references). An `array` holds a leaf or a flat
`object`. The deepest shape is therefore `array(object({ ...leaves }))`, a repeatable list of flat
rows. There's no array inside an object inside an array.

```ts
contacts: fields.array(fields.object({ fields: {
  name:  fields.text({ required: true }),
  email: fields.email(),
}}), { label: 'Contacts', itemLabel: 'name' }),
faq: fields.array(fields.object({ fields: {
  question: fields.text({ required: true }),
  answer:   fields.textarea({ required: true }),
}}), { label: 'FAQ', itemLabel: 'question' }),
```

One level covers what cairn actually needs (an FAQ list, a contact list, a gallery), and when a site
reaches for deeper structure, that's the signal to model it as its own concept and a `reference` (the
better data model, and the same editor-versus-entity line). The editor surface stays one known,
testable pattern: `object` renders as a labeled group, `array` as a repeatable list with add, remove,
reorder, and an `itemLabel` for the row summary. Validation and inference recurse exactly one level, so
the inferred types and the diagnostics stay tractable.

**The social-card image under nesting.** The `seo` flag selects the one image that feeds `og:image`,
and that selection stays a concept-level concern. So `seo: true` is allowed only on an image leaf at the
top level or directly inside a top-level `object` (never inside an `array`, which would declare one
social card per row). The at-most-one-`seo`-image check recurses that one level, and the social-image
path resolves to the top-level key or the `object.key` it sits under.

## The concept model

v2 opens the implementation without opening the product. Today `content` is a closed `{ posts, pages }`
and a routing table hardcodes their behavior, even though the engine already iterates concepts
generically. v2 makes `content` an open record where each concept declares its own routing and URL
policy, and ships posts and pages as the documented defaults:

```ts
const post = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  singular: 'Post',
  routing: 'feed',                 // routable, dated, in feeds and the sitemap
  permalink: '/blog/:year/:slug',
  datePrefix: 'day',
  fields: { /* see above */ },
})

// in the adapter
content: { posts: post, pages: page, events: event },
```

The curation lives in the documentation and the scaffolder's defaults, not in a hardcoded type. A
developer can declare a third concept with its own routing, while posts and pages stay the blessed
shapes. This is the calibration the evidence supports: the "overkill for small sites" verdict was
always about backend weight, never about a developer being allowed to name a concept.

Routing is declared, not keyed by a magic id. A named shape covers the cases legibly: `'feed'` (dated,
in feeds), `'page'` (routable, static), and `'embedded'` (not routable, the future Fragments concept),
with an object form `{ routable, dated, inFeeds }` as the escape hatch. Fragments stops being a special
future case and becomes `routing: 'embedded'`.

URL policy comes home. `permalink` and `datePrefix` move from the YAML site-config into `defineConcept`,
beside `dir`. That removes the cross-file split and the runtime consistency check that papered over it.
Permalink structure is a developer decision like `dir`, set in code; the YAML keeps only what the admin
edits at runtime.

## The adapter

The previous adapter was one flat object with about twenty keys spanning nine concerns, with internal
path plumbing sitting beside `siteName`. v2 namespaces it into six subsystem groups:

```ts
export const adapter = defineAdapter({
  content: { posts, pages },                            // concepts
  backend: githubApp({ owner, repo, branch }),          // see "The backend seam"
  email:   { from, replyTo },                           // magic-link sender
  rendering: {
    render,                                              // the one renderer
    components,                                          // directive vocabulary, feeds render + palette
    icons,
    islands,                                             // client components for hydrated directives
  },
  media:   { bucketBinding: 'MEDIA_BUCKET', variants },  // R2 and Image variants
  editor:  {
    preview,                                             // preview-frame styling
    nav,                                                 // which YAML menu the nav editor manages
    supportContact,
  },
})
```

The grouping is one level deep on purpose, so the adapter stays quick to write and read; deeper nesting
would be tidier on paper and more annoying in practice. `rendering` holds the renderer, its component
vocabulary, and the island components together because they're one subsystem. `editor` gathers the
admin-experience knobs that were loose at the top level.

The internal path knobs (`manifestPath`, `mediaManifestPath`, `dictionaryPath`) leave the public
surface; they default by convention and return, if a real need appears, as a single `paths` group
rather than three top-level keys.

The adapter-versus-YAML boundary gets a clean rule. The adapter is the developer's structural contract.
Descriptive site metadata (`siteName`, `description`, `author`, `locale`) lives in the YAML site-config,
which retires the current `siteName` duplication. Code declares structure and behavior; YAML holds
metadata and the things the admin edits at runtime (nav contents, spellcheck, tidy).

**The origin stays a single runtime value, not a YAML field.** The site's canonical origin is
`PUBLIC_ORIGIN`, the Worker variable `requireOrigin` validates (a valid URL, https in production) and
that the magic-link flow reads, deliberately config-only so a forged `Host` header cannot redirect a
login link. The build's prerendered absolute URLs (canonical, `og:url`, feeds, sitemap) read that same
value, so there's one origin source rather than the two the codebase has today. The YAML does not carry
a `url`; folding it in would manufacture a third origin and lose the runtime validation that protects
the magic link.

> Note for review: the grouping and the metadata-to-YAML boundary are pragmatic judgment calls, not
> evidence-derived. They're the right place for an adversarial second look.

## The render seam

The renderer is entry-aware and returns a string, with opt-in islands layered on top.

The input carries the entry plus the resolvers the renderer needs:

```ts
render({ concept, frontmatter, body, resolve, resolveMedia }): Promise<string>
```

`resolve` rewrites `cairn:<concept>/<id>` links and resolved references to live permalinks, and
`resolveMedia` resolves `media:` references; the build passes site-resolver-backed implementations and
the editor preview passes manifest-backed ones, the split the References section depends on. These are
not optional context: v2 makes resolution more load-bearing, because frontmatter references now resolve
to a permalink and summary at delivery. The entrance-stagger ordinal moves into the pipeline (the
directive stamp already owns the `data-rise` attribute), so the old `stagger` flag goes away. Page chrome
(the title, the hero, the byline) stays the site's Svelte route, because for a design-led audience the
chrome is a Svelte template the site owns, not output from a string renderer. The preview iframe previews
the rendered content, the editor draws the hero and title from the frontmatter field values itself, and
`PreviewConfig` stays because the chrome-isolated iframe still needs the site's stylesheets.

The return type is a string, `Promise<string>` (the previous `string | Promise<string>` union is gone).
Two surfaces consume that string directly: the preview iframe's `srcdoc`, and the `contentHtml` of the
syndication feeds (RSS and Atom). The `og:description` and the JSON-LD structured data are built from
frontmatter strings, not from rendered body HTML, so they don't depend on this choice. The string return
is the right call for the two real consumers plus simplicity: returning a Svelte component would force a
separate string path back for the preview and feeds, complicate the preview, and grow the maintained
surface, all for in-content interactivity that this audience rarely needs. Astro's praised `<Content />`
component serves a general app framework; cairn serves premium static markdown.

### Islands

Islands are the opt-in interactivity layer, and they don't change the string return. A directive opts
into hydration, render emits a boundary wrapping a static fallback, and a small client runtime mounts
the site's component over it.

The authoring API is the existing directive constructor with one new flag. `defineComponent` supersedes
the previous `ComponentDef` object literal and keeps its fields (`label`, `description`, `attributes`,
`slots`, `preview`); `attributes` are declared with the same `fields.*` primitives a concept uses, which
is what makes the one-vocabulary claim concrete, and `hydrate: true` marks the directive as an island.
`build(ctx)` returns the HTML AST (hast) that the rehype render step emits:

```ts
const poll = defineComponent({
  name: 'poll',
  label: 'Poll',
  description: 'A reader poll.',
  hydrate: true,
  attributes: {
    question: fields.text({ label: 'Question', required: true }),
  },
  build: (ctx) => /* static, no-JS fallback hast, rendered from ctx.attributes */,
})

// the adapter registers the client component for each island, by directive name
rendering: { render, components, icons, islands: { poll: PollIsland } }
```

Render emits, for a `hydrate` directive, a boundary wrapping the static fallback:

```html
<div data-cairn-island="poll" data-cairn-props='{"question":"Best trail?"}'>
  <!-- build()'s static fallback: visible at first paint and for no-JS -->
</div>
```

The data flow:

- **Build and SSR** (server-side rendering) run `build()` and emit the string with island boundaries
  and their fallbacks. The render seam is still `Promise<string>`, unchanged.
- **The client** mounts each island. `hydrateIslands(adapter.rendering.islands)` finds each boundary,
  reads its props, clears the static fallback, and mounts the site's Svelte component fresh with Svelte's
  `mount()`. This is mount-and-replace, not hydration: the component re-renders entirely from its props,
  and the `build()` fallback is the first-paint and no-JS representation, not data passed into the
  component. v1 islands are therefore attribute-driven (the props are the directive's declared
  attributes); enhancing rich slot content in place is a later, larger design.

Properties and their costs, stated plainly:

- **Progressive enhancement.** `build()` is the meaningful no-JS fallback, so a reader without
  JavaScript and a screen reader get real content. The cost is that an author writes both the `build()`
  fallback and the component.
- **Props are author-controlled and untrusted.** An island's props are the directive's attribute values,
  written by an editor and carried in `data-cairn-props`. The transport is escaped, but the engine does
  not sanitize the payload, so an island component must treat every prop as untrusted: never pass one to
  `{@html}` or into a sink. To bound this, v1 island props are the field's declared `fields.*` scalar
  attributes, validated like any other field, not arbitrary JSON.
- **The preview shows the static fallback, not the live island.** The editor preview iframe runs with
  scripting disabled (`sandbox=""`), so `hydrateIslands` cannot run there, and every island previews as
  its `build()` fallback. Interactivity is verified on the deployed page. This makes `build()` fallback
  quality a documented requirement, because the fallback is what the editor sees. An interactive,
  origin-isolated preview frame is out of scope for v2.
- **Zero cost when unused, by construction.** The island runtime is a separate client entry point on its
  own export subpath. A site with islands imports it dynamically, gated on a non-empty registry
  (`if (Object.keys(islands).length) import(...)`), or lets the scaffolder wire that call only when
  islands are used; a site with no islands never imports it. The runtime must also clear the two
  packaging traps this repo documents: the Vite 8 dist-`.svelte` transpile step, and the dev-fence rule
  that a single static import can ship a whole subsystem.

No git-markdown CMS offers opt-in, progressively enhanced islands in content on Cloudflare. Decap and
Keystatic render static; Astro has islands but isn't a CMS.

## The backend seam

The backend is an interface, so a different store can sit behind it. Today the backend is a
GitHub-App-specific config blob, and a separate dev package exists only because there's no interface to
slot a local store behind.

```ts
interface Backend {
  readFile(path: string, ref: string): Promise<RepoFile | null>;
  readTree(dir: string, ref: string): Promise<RepoFile[]>;
  listBranches(prefix: string): Promise<string[]>;
  commit(branch: string, changes: FileChange[], author: CommitAuthor, message: string): Promise<CommitResult>;
  createBranch(name: string, from: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  publish(fromBranch: string, toBranch: string): Promise<void>;
}

backend: githubApp({ owner, repo, branch, appId, installationId }),
```

`githubApp(...)` is the default and the only implementation a production site needs; GitLab, Gitea, or
plain git become additional implementations later without touching the engine. The local-filesystem dev
backend becomes a conforming implementation, which gives it a clean shape, and it stays behind the
dev-gated dynamic-import fence, because it bypasses the auth and commit pipeline and must never ship to
production. The interface tidies the shape; it does not relax the fail-closed gating.

The appId-is-config-not-secret trap closes: `githubApp(...)` carries only the non-secret identifiers,
and the private key is read from the Worker secret at runtime, never in the adapter source.

The guardrail, stated as a constraint: `Backend` is read, commit, and branch operations over files. It
is deliberately not a query interface. Querying content stays build-time over the manifest. That line
is the direct lesson from TinaCMS, whose queryable backend forced a runtime database. cairn's backend
never grows a `query()` method, so a database never sneaks in behind the seam.

Media is unchanged: it stays in R2 through the `media` group, a separate store from the content git
backend.

## What v2 deliberately doesn't do

The boundaries are as deliberate as the features, and the evidence draws them.

- **No runtime database or query layer.** Cross-entry search, sort, and filter at scale is what forced
  Tina's Data Layer and is the dominant structural complaint about Payload. Querying stays build-time
  over the committed manifest.
- **No structured-JSON rich text.** Portable Text is the loudest content-model complaint against
  Sanity. Markdown stays the source of truth; the directive registry is the answer for inline
  components.
- **No open-ended collections.** The fixed-concept stance is validated for the audience. v2 opens the
  implementation, not the product.
- **No speculative i18n.** Localization was Sveltia's whole reason to exist, but it's a full initiative
  spanning the content model, routing, the editor, and delivery. Build it when a real cairn site needs
  it, not before.

## Migration and phasing

This is a breaking v2, and consumers migrate. The phasing reflects a deliberate sequencing decision
against the current roadmap in `docs/STATUS.md`: contract-v2 phases 1 and 2 land **before** the
scaffolder's Part B3 bakes site templates, so the pre-B3 engine and developer-experience slot (0.66.0)
and B3 slip until the contract stabilizes, and the showcase template is the first consumer to migrate.
The alternative, letting B3 bake the v1 field shape and re-baking the template after v2, is the rework
the phasing exists to avoid. Confirmed 2026-06-25 as the accepted sequencing: it reorders committed
scaffolder work, and the pre-B3 slot and B3 resume once the contract stabilizes.

1. **References and the table-stakes scalars**, plus `default`, the taxonomy marker, and field
   composition. Highest payoff, and the picker UI built here is reused by the object and array editor.
   References also need the schema-driven frontmatter-edge extractor, the YAML-value rewriter, and the
   cross-branch inbound-edge index, so this phase is larger than a field addition.
2. **The `object` and `array` primitives, the adapter restructure, and the field-system unification.**
   The field bench is already open from phase 1, and the data-versus-behavior split lands here.
3. **The backend seam.** Independent of the field work, so it can run in parallel.
4. **The render seam and islands.** Last, because the island client runtime is the newest surface and
   carries the packaging and trust-boundary work above.

## Lessons cited

The rationale above draws on recurring, sourced sentiment about each comparable tool. The load-bearing
ones: Astro's schema-composition complaint and `reference()` non-determinism (#12680); Keystatic's
slug-based relationship that breaks on rename (its own docs); Decap's `relation` bugs and project
stagnation; Sveltia's existence as a Decap nesting-and-i18n fix; TinaCMS's Data Layer admission and
pricing pushback (#3372); Sanity's Portable Text and two-sources-of-truth defections; Payload's
field-rename data loss and the editors-think-like-developers reference friction (#4991); Statamic's
flat-file performance wall and Eloquent escape hatch; and Contentlayer's abandonment from neglect,
separate from the missing URL and email field type that the creator of Astro Content Collections names
as his reason for building a successor. The full per-tool digests live in the adversarial review at
`docs/internal/2026-06-25-site-contract-adversarial-review.md`.
