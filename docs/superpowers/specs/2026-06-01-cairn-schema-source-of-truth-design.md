# Schema Source of Truth for Concept Frontmatter: Design

> **Status:** Design, approved in brainstorming 2026-06-01. Promotes the "typed reads" item
> of the engine backlog's Pass 2 into a foundational initiative, run before the site
> migrations. Supersedes the typed-reads framing in
> `2026-06-01-cairn-engine-backlog-and-slot-render-design.md`; the residual delivery items
> from that Pass 2 become a small follow-up.

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

This is the schema-library pattern (Zod, Valibot) adapted to one constraint those libraries do
not meet. cairn's field descriptors are plain serializable data on purpose, because they cross
the server-to-client boundary to drive the editor form. A schema-library object does not
serialize across that boundary, and it carries no UI metadata (which field is a closed-vocabulary
`tags` versus a `freetags`, which is a `textarea`), so adopting one would force a separate UI
declaration and lose the single-source win. cairn owns a small primitive shaped to its own field
union instead.

## The schema primitive

A builder, `defineFields`, declares a concept's fields once. Each field carries its UI metadata
and its validation rules in the same object:

```ts
const posts = defineFields([
  { name: 'title',       type: 'text',     label: 'Title',       required: true },
  { name: 'date',        type: 'date',     label: 'Date',        required: true },
  { name: 'description', type: 'textarea', label: 'Description'                  },
  { name: 'tags',        type: 'tags',     label: 'Tags',        options: ['trip-report', 'gear', 'news'] },
  { name: 'image',       type: 'text',     label: 'Social image'                 },
  { name: 'draft',       type: 'boolean',  label: 'Draft'                        },
])
```

`defineFields` uses a `const` type parameter, so it captures the literal field types without the
site writing `as const`. It returns one `ConceptSchema` object with three faces:

- **`.fields`**: plain `FrontmatterField[]`, with any functions stripped. This matches today's
  shape exactly, so the editor form code that crosses the server-to-client boundary is unchanged.
- **`.validate(frontmatter, body)`**: generated from the field rules. It checks required, coerces
  per type (a `date` to a `YYYY-MM-DD` string, `tags` to members of the closed vocabulary, a
  `boolean` to a real boolean, a `freetags` input split from its comma form), returns field-keyed
  errors for the form, and on success returns the normalized `data`. An optional
  `refine(data, body)` hook carries cross-field and body-dependent rules, and its errors merge
  with the per-field errors.
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

**Runtime unit tests** cover the `.fields` projection (plain serializable data, `refine` stripped);
the generated `.validate` (required, per-type coercion, vocabulary rejection, the freetags split,
field-keyed errors, normalized `data`); the `refine` error merge; the `normalizeConcepts` unpack; a
normalized read through `byId`; drafts skipping the build gate; the aggregator throwing one combined
report on invalid non-drafts; the `validate: false` opt-out; and the SEO head reading image, robots,
and author with relative-image resolution.

**The showcase build is the end-to-end gate**, as in the slot-render pass. The showcase migrates to
`defineFields` and `defineAdapter`, and the production prerender proves the whole path, including a
per-entry og:image in the head.

## Decomposition

Three plans, sized by distinct verification surface, isolating the high-blast-radius change. Per
the just-in-time practice, only the spec is written now; Plan 1 follows after the spec is approved,
and plans 2 and 3 are written after each prior one lands.

1. **The schema primitive.** `defineFields`, `ConceptSchema`, the generated validator (absorbing
   `validateFields`), `refine`, and `Infer`. Fully additive, zero blast radius, no contract or site
   change. It de-risks the type machinery in isolation and lands first, because nothing else can
   build on it until it is proven.
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
