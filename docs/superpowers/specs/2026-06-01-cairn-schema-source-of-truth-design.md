# Schema Source of Truth for Concept Frontmatter: Design

> **Status:** Design, approved in brainstorming 2026-06-01. Promotes the "typed reads" item
> of the engine backlog's Pass 2 into a foundational initiative, run before the site
> migrations. Supersedes the typed-reads framing in
> `2026-06-01-cairn-engine-backlog-and-slot-render-design.md`; the residual delivery items
> from that Pass 2 become a small follow-up.
>
> Pressure-tested 2026-06-01 against comparable systems (Keystatic, TinaCMS, Astro Content
> Collections, Velite, Contentlayer, Nuxt Content, Sanity, Payload, Decap). The review confirmed
> the core unification and the no-codegen inference choice, and drove four revisions folded in
> below: the anti-Zod rationale is corrected, declarative per-field validation rules are added,
> the validator conforms to the Standard Schema interface, and the load-bearing invariants are
> written down.

## Why this exists

The backlog design scoped Pass 2 as delivery and SEO hardening, with "typed reads" listed as
one item among several. Pulling on that item exposed a deeper question about the adapter
contract, and the decision is to address it now as its own initiative.

The adapter contract is the public API every site and the future scaffolder template pins
against. It has two consumers today, both ours, both unmigrated. The scaffolder will bake the
contract into the template it ships. So the window to change the contract cheaply is open now
and closes once the scaffolder ships and outside adoption begins. The priority for this phase is
the best long-term architecture, and migration cost is explicitly not a constraint.

Most of the adapter contract is already settled or deliberately deferred. The component side
froze in the slot-render pass. The `render` rename is already done on the engine side, leaving
only a site catch-up. The reserved seams (`CairnExtension`, `AdminPanel`, `FieldTypeDef`,
`AssetConfig`) are typed loose on purpose, because their final shape is set by features that are
not built yet, so freezing them now would bake a guess into the contract. The one piece that is
real, exercised by both sites, fully understood, and unsettled is the concept frontmatter
system: the `fields` array and the hand-written `validate` function. That is the target.

## The problem with the current shape

A concept declares its frontmatter twice. The `fields` array describes the editor form, and a
separate `validate` function checks and (in principle) normalizes the submitted frontmatter.
Three things follow from the split:

- The static type of an entry's frontmatter is hand-written or absent. Reads cast raw
  frontmatter to `Record<string, unknown>` or to a site-declared interface that can drift from
  the fields.
- The validator's normalized output is discarded. `createContentIndex` never runs `validate`,
  and the build-time `validateAll` checks `result.ok` and throws `result.data` away. A validator
  that trims or defaults a field passes the build, yet the read serves the raw frontmatter.
- The form descriptors and the validator can disagree, because nothing ties them to one source.

## The principle

One per-concept declaration is the single source of truth. It yields three faces: a serializable
field projection for the editor form, a validator that produces normalized data with field-keyed
errors, and a static type inferred from the declaration. The three cannot drift, because they
come from one place.

This is the schema-library pattern (Zod, Valibot) adapted to cairn's editor constraint. The field
descriptors are plain serializable data on purpose, because they cross the server-to-client
boundary to drive the editor form. A validation library can reach a form. Nuxt Content drives a
live editor from a Zod schema by serializing it to JSON Schema and attaching UI metadata through
an `.editor()` extension, and Valibot schemas are plain introspectable objects with first-class
metadata. cairn still owns its primitive, for three reasons that survive that fact:

- JSON Schema is a lossy wire format. It cannot express cairn's richer editor field types, such as
  the component-slot picker and the `cairn:<concept>/<id>` internal-link token, without escaping
  into vendor extensions.
- A metadata side-channel stapled onto a validator splits the declaration into two layers. cairn's
  one field descriptor carrying type, label, options, and rules is single-homed and reads cleaner.
- Owning a small primitive avoids tracking a validator's major-version inference churn, which fits
  the lean-core stance.

Conforming to the Standard Schema interface (see below) recovers the ecosystem interop without
taking on the dependency.

## The schema primitive

A builder, `defineFields`, declares a concept's fields once. Each field carries its UI metadata
and its validation rules in the same object:

```ts
const posts = defineFields([
  { name: 'title',       type: 'text',     label: 'Title',       required: true, max: 120 },
  { name: 'date',        type: 'date',     label: 'Date',        required: true },
  { name: 'description', type: 'textarea', label: 'Description',  max: 280 },
  { name: 'slug',        type: 'text',     label: 'Slug',        pattern: '^[a-z0-9-]+$' },
  { name: 'tags',        type: 'tags',     label: 'Tags',        options: ['trip-report', 'gear', 'news'] },
  { name: 'image',       type: 'text',     label: 'Social image' },
  { name: 'draft',       type: 'boolean',  label: 'Draft' },
])
```

The per-field rules beyond `required` are declarative and plain data, so they cross the boundary
and serve both inline form hints and server validation: `min` and `max` (string length or numeric
and date bounds), `length` (an exact-or-bounded length), and `pattern` (a regex). `pattern` is
stored as its string source rather than a `RegExp`, so the projection stays plain JSON and the
validator compiles it. Async validation is out of scope, since cairn validates at commit time
under low concurrency, and an async rule would not serialize.

`defineFields` uses a `const` type parameter, so it captures the literal field types without the
site writing `as const`. It returns one `ConceptSchema` object with three faces:

- **`.fields`**: plain `FrontmatterField[]`, with any functions stripped. This matches today's
  shape exactly, so the editor form code that crosses the server-to-client boundary is unchanged.
- **`.validate(frontmatter, body)`**: generated from the field rules. It checks required and the
  declarative per-field rules (`min`, `max`, `length`, `pattern`), coerces per type (a `date` to a
  `YYYY-MM-DD` string, `tags` to members of the closed vocabulary, a `boolean` to a real boolean, a
  `freetags` input split from its comma form), returns field-keyed errors for the form, and on
  success returns the normalized `data`. The coercion is a normalize-on-write step: it canonicalizes
  what an author typed (a loosely-formatted date, untrimmed tags) before the commit. That is
  distinct from read-derivation: computed values such as `excerpt`, `wordCount`, `slug`, and
  `permalink` stay in the content index, so the schema never becomes a second home for derived data.
  An optional `refine(data, body)` hook carries cross-field and body-dependent rules, and its errors
  merge with the per-field errors.
- **The inferred type**: `Infer<typeof posts>` walks the field tuple and maps each field to a TS
  type, respecting `required`. text, textarea, and date map to `string`; boolean to `boolean`;
  `tags` to an array of the option union (`('trip-report' | 'gear' | 'news')[]`); freetags to
  `string[]`; an optional field becomes optional in the type.

The existing engine helper `validateFields` becomes the internal engine of the generated
validator, so it stops being a function a site calls and turns into an implementation detail.

### `refine` is validation-only in v1

`refine` checks, it does not transform. It cannot rewrite or add fields, and the inferred type is
a clean function of the field list alone. This is a layering choice, not only a scope choice.
cairn already derives its computed and delivery-facing fields (`excerpt`, `wordCount`, `slug`,
`permalink`) in the content index, by design, because those are delivery concerns rather than
authored values. A transforming `refine` would give computed data two homes, the schema and the
index, and force a reader to know which layer owns which derived field. Validation-only `refine`
keeps a clean split: the schema validates and normalizes per field, and the index derives
everything computed. Neither site has a cross-field default or a computed authored field today.

If a real transform need appears later, the clean addition is a separate `derive` step rather
than overloading `refine`. That is additive and non-breaking, so deferring it now closes no door.

### Standard Schema conformance

The `ConceptSchema` exposes a `~standard` property implementing the Standard Schema interface
(`version: 1`, `vendor: 'cairn'`), the spec the Zod, Valibot, and ArkType authors share. This is a
thin adapter over the native validator with no runtime dependency, roughly twenty lines. The native
`.validate(frontmatter, body)` and its field-keyed `{ ok, data | errors }` result stay the primary
API, because the editor form wants errors keyed by field rather than the Standard Schema flat
`issues` array with a `path`. The `~standard.validate` wrapper takes a single `{ frontmatter, body }`
argument (Standard Schema is single-argument), maps a success to `{ value: data }`, and maps a
failure to `{ issues: [{ message, path: [field] }] }`.

The payoff is interop without coupling. cairn's validator becomes a drop-in anywhere the ecosystem
accepts a Standard Schema (form libraries, routers, future tooling), and the same interface is the
clean future seam for a site that wants to supply its own Zod or Valibot validator for a field's
custom logic, with cairn still owning the UI projection. cairn takes no validation-library
dependency to get either.

## The adapter contract changes

**`ConceptConfig` drops `fields` and `validate` for a single `schema` member**, and becomes
generic over its schema so the concrete per-concept type survives:

```ts
// before
interface ConceptConfig {
  dir: string;
  label?: string;
  fields: FrontmatterField[];
  validate(fm: Record<string, unknown>, body: string): ValidationResult;
}
// after
interface ConceptConfig<S extends ConceptSchema = ConceptSchema> {
  dir: string;
  label?: string;
  schema: S;
}
```

There is no back-compat union. One member, one source of truth.

**The engine-internal `ConceptDescriptor` stays the same.** It keeps exposing `fields` and
`validate`. `normalizeConcepts`, already the one place that turns `adapter.content` into
descriptors, unpacks the schema: `descriptor.fields = schema.fields` and
`descriptor.validate = schema.validate`. Every downstream consumer (the form generator, the admin
save path, the build-time validator) reads the descriptor and never learns the schema exists. The
blast radius is the site config plus `normalizeConcepts`, not the whole engine.

**`defineAdapter` preserves inference.** A plain `const adapter: CairnAdapter = {…}` annotation
would widen the schema types away and break inference. The contract grows a `defineAdapter(...)`
helper with a `const` type parameter, and a site declares its adapter through it. That is one more
contract touch in the migration, and it is the teaching point a site has to learn.

`defineFields`, `ConceptSchema`, `Infer`, and `defineAdapter` are re-exported from the main entry,
so a site imports them as one set of symbols.

## Full-auto typed reads

The delivery side gets a typed view that maps over `adapter.content`, while the admin side keeps
consuming the flat erased `ConceptDescriptor[]` exactly as today. Two consumers, two views, both
derived from one typed config, so the admin's uniform concept handling is untouched:

```ts
// engine
function createSiteIndexes<A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: ...): {
  [K in keyof A['content']]: ContentIndex<Infer<A['content'][K]['schema']>>
}

// site delivery: content.ts
const cairn = createSiteIndexes(adapter, siteConfig, globs)
cairn.posts.byId(id).frontmatter   // typed and normalized, no third argument, no interface
cairn.pages.all()
```

`createSiteIndexes` is built on the per-concept `createContentIndex<F>`, which stays as the
low-level primitive and the escape hatch. Full-auto is a typed convenience over the primitive,
not a replacement.

The cost is named and accepted: `ConceptConfig` becomes generic, sites declare through
`defineAdapter`, and the engine owns one mapped-type helper whose return type maps over
`keyof content` with optional-key handling. The one place this trades against the maintainability
goal is error legibility, because a mapped-type error reads worse than a plain one when a site's
config is slightly wrong. The trade is worth it in the pre-adoption window.

## The read path

**Validate once, serve normalized data.** `createContentIndex` runs the concept's `validate` once
per entry at build, and on success stores `result.data` as `entry.frontmatter`, typed as F. A
validator that trims or defaults a field now takes effect on read, closing the "validate is a
gate, not a transform" gap. The primitive records each entry's verdict rather than throwing, since
a query surface should not explode on construction. The site-level aggregator (`createSiteIndexes`)
collects problems across every concept and throws one combined report, which preserves today's
aggregated build failure. Validation runs once per entry instead of twice, and `validate: false`
stays the opt-out.

**Skip drafts at the build gate.** A draft never ships, because `createSiteIndex` builds its path
map from `all()`, which excludes drafts, so a draft is not prerendered, not in the sitemap, and not
resolvable. The aggregator validates only non-drafts, so a half-finished draft does not fail the
build. The admin save path validates when an author flips `draft: false` and commits, which is the
moment content enters the published set.

**The date gotcha dissolves.** The build-validation trap where an unquoted YAML `date` arrives as a
JS `Date` goes away, because the generated validator owns date coercion. A `date` field normalizes
to a `YYYY-MM-DD` string inside `validate`, so a site never writes a hand-rolled date check that
trips on the `Date` shape.

## The SEO head consumer

The per-entry SEO head wiring rides this initiative as the consumer that proves typed reads pay off
end to end. `buildSeoMeta` already accepts `image`, `robots`, and `author`. `entryLoad` reads them
from the typed frontmatter and resolves a relative image to absolute via the origin, omitting each
tag when its field is absent. A site declares `image`, `robots`, and `author` as optional schema
fields, so the editor form surfaces them and the reads are typed.

## Load-bearing invariants

These properties are why the no-codegen choice is safe, so they are part of the contract, not
incidental. The competitive review showed that the systems which codegen do so to escape one of
these constraints, and the systems that infer at runtime (Keystatic) hold them.

- **Frontmatter is flat scalar fields only.** text, textarea, date, boolean, tags, freetags, and
  the additive `reference` kind below. Structured and nested content is the component-slot system's
  domain, not frontmatter. A flat record keeps the YAML header diff-friendly and human-editable,
  keeps the editor form simple for a non-technical author, and keeps the type a clean record.
- **Runtime inference is contingent on that flatness.** `Infer` is a single-level, non-recursive
  mapped type over the field tuple. Sanity and Payload codegen partly because deep nesting and query
  strings defeat runtime inference; cairn has neither, so inference stays legible and fast. A future
  feature that adds nesting or unions to frontmatter must reconsider codegen rather than silently
  degrade the inference, so it is a deliberate trigger, not a default.
- **The inference is guarded.** The build pins `moduleResolution` to `nodenext` or `bundler` to
  avoid the duplicate-declaration slowdown, and a type-level smoke test (`expectTypeOf` over a known
  schema plus one deliberate mismatch) gates CI, so an inference regression fails the build instead
  of surfacing as an inscrutable editor error.
- **The field-kind union stays open for additive growth.** A `reference`/`relation` kind (cairn's
  `cairn:<concept>/<id>` internal-link token is a typed pointer by another name) can slot in later
  without reshaping existing fields or the wire format. The kind is reserved as a design
  consideration here, not specified now, since its shape follows the internal-link feature when that
  is built.

## Scope

In scope: the schema primitive, the contract cutover, full-auto typed reads, validate-once
normalized reads with skip-drafts, and the per-entry SEO head consumer.

Out of scope, as a separate small follow-up pass: the feed and excerpt robustness guards (feed
autodiscovery links attached to undated Pages, the feed date formatter throwing on a malformed
date, the dateless-sort and excerpt whitespace assumptions, the impossible-date permalink parse).
These are independent of the contract.

Deferred by design: a transforming `derive` step, and full migration of the two sites onto the new
contract (each site's own migration pass).

## Testing

**Type-level tests are first-class acceptance criteria.** This initiative is type-machinery-heavy,
and a green runtime test will not catch an inference regression. `expectTypeOf` assertions gate the
work: `Infer<typeof schema>` maps each field type correctly with required versus optional and the
`tags` option-union array; `createSiteIndexes(adapter).posts.byId(id).frontmatter` is the inferred
type; optional concepts resolve; and an adapter declared through `defineAdapter` keeps its concrete
schema types.

**Runtime unit tests** cover the `.fields` projection (plain serializable data, `refine` stripped,
`pattern` as a string source); the generated `.validate` (required, the `min`/`max`/`length`/
`pattern` rules, per-type coercion, vocabulary rejection, the freetags split, field-keyed errors,
normalized `data`); the normalize-on-write coercion (a loosely-formatted date canonicalized, tags
trimmed); the `refine` error merge; the `~standard` adapter mapping a success to `{ value }` and a
failure to `{ issues: [{ message, path }] }`; the `normalizeConcepts` unpack; a normalized read
through `byId`; drafts skipping the build gate; the aggregator throwing one combined report on
invalid non-drafts; the `validate: false` opt-out; and the SEO head reading image, robots, and
author with relative-image resolution.

**The showcase build is the end-to-end gate**, as in the slot-render pass. The showcase migrates to
`defineFields` and `defineAdapter`, and the production prerender proves the whole path, including a
per-entry og:image in the head.

## Decomposition

Three plans, sized by distinct verification surface, isolating the high-blast-radius change. Per
the just-in-time practice, only the spec is written now; Plan 1 follows after the spec is approved,
and plans 2 and 3 are written after each prior one lands.

1. **The schema primitive.** `defineFields`, `ConceptSchema`, the generated validator (absorbing
   `validateFields`) with the declarative per-field rules (`min`, `max`, `length`, `pattern`) and
   the `refine` hook, `Infer`, and the `~standard` Standard Schema property. Fully additive, zero
   blast radius, no contract or site change. It de-risks the type machinery in isolation and lands
   first, because nothing else can build on it until it is proven.
2. **The contract cutover plus the read path.** `ConceptConfig` becomes `{ schema }` and generic,
   `defineAdapter`, the `normalizeConcepts` unpack, the `createSiteIndexes` full-auto helper,
   validate-once normalized reads, and skip-drafts. The showcase migrates in the same plan, because
   the breaking change leaves an uncompilable intermediate state otherwise, so the cutover is
   atomic. This is the high-blast-radius pass, kept together on purpose.
3. **The SEO head consumer.** The per-entry image, robots, and author wiring and the schema fields
   that feed it. Small, and the visible proof typed reads pay off. It could ride as the tail of
   plan 2 if that one stays light, but it is penciled as its own plan so the cutover stays focused.

## Relationship to the engine backlog

This initiative replaces the typed-reads item of the backlog design's Pass 2 and absorbs the
per-entry SEO head wiring. The remaining Pass 2 items (the feed and excerpt robustness guards)
become the small follow-up pass named under Scope. Pass 3 (auth hardening) is unchanged and follows.
The site migrations follow the contract cutover, each as its own site-pass, onto the settled
contract.
