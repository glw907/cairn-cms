# Adversarial review: the cairn site contract

Date: 2026-06-25. Pre-pass research, written before the next engine pass. Throwaway working
artifact, not polished docs.

Scope: the public *site contract* — everything a consumer site must supply or implement to use
cairn. That is the `CairnAdapter` at `src/lib/cairn.config.ts`, the per-concept `defineFields`
schema, the `render` seam, the directive `ComponentRegistry`, and the YAML site-config that carries
URL policy. The review ignores backward compatibility on purpose; the question is what the contract
*should* be, not what the two existing sites can absorb.

It is grounded two ways: the shape of the comparable contracts (Astro Content Collections and
Content Layer, Keystatic, Decap, Sveltia, TinaCMS, Sanity, Payload, Statamic, Contentlayer/Velite),
and what those tools' users actually say about them — praise and complaints pulled from GitHub
issues and discussions, HN threads, migration write-ups, and review aggregators. Sentiment sources
are cited inline by their identifying tag (issue number, author, or thread). The full per-tool
digests live in the session research notes.

## The headline

cairn is already ahead of the alternatives on the things that make people *leave* them, and behind
on two: a thin scalar field vocabulary, and the lack of a cross-entry reference field. The second is
not really a gap — it is the single biggest opportunity in the contract, because the entire
flat-file and typed-content category fails to ship clean cross-document references, and cairn already
has the mechanism that would solve it.

The evidence for that claim, across the category:

- Keystatic's `relationship` stores a bare slug string and, in its own docs' words, the reference
  "will be broken" when the slug changes.
- Decap's `relation` is its single most bug-ridden widget, with composition and performance issues
  open for years (#1670, #3739).
- Astro's `reference()` breaks non-deterministically after the v5 migration (#12680, unresolved).
- Contentlayer never shipped relationships; Velite's maintainer **deliberately refused** them as
  out of scope ("Velite will not interfere [with] how users use the data", velite #134).
- The two tools with real referential integrity, Sanity and TinaCMS, buy it with a runtime database;
  Tina's own co-founder concedes the Data Layer "detracts from the simplicity of a static site."

cairn's `cairn:<concept>/<id>` token already keys an internal link to the target's permanent
filename id, survives a slug, date, or permalink change, and rewrites every inbound token on rename
(`src/lib/content/links.ts`, `rewriteCairnLink`; `inboundLinks` in `manifest.ts`). That is
rename-safe, integrity-preserving, build-time, **database-free** references — the exact thing the
whole category fails to ship — confined today to prose body links. Lifting it into a frontmatter
field type is the move that makes cairn best-in-class rather than merely at parity.

## What cairn already gets right, and the competitive moat

This section answers "where is cairn at least as good, if not better." Each point is anchored to a
concrete reason users abandon a competitor.

- **Content is plain markdown in git — one source of truth.** Sanity's most-cited defection reason
  is "two sources of truth, zero unified history" (Gupta's migrate-to-MDX post): no PR review, no
  rollback, no diff alongside code, plus lock-in dread. cairn makes all of that the default. Beats
  Sanity and Payload outright.
- **No runtime database, no SaaS, no per-seat pricing.** Tina's Data Layer (MongoDB) is a conceded
  tax on simplicity, and Tina Cloud's per-project-and-per-user pricing is called "not defendable"
  for small sites (tinacms #3372). Payload is "only limited to MongoDB" (Capterra). cairn is
  build-time on Cloudflare, no seats. Decisive for the non-profit and small-business audience.
- **No migrations, and no schema-change data loss.** Payload's scariest single report is a developer
  renaming a field and silently wiping production data, because there the schema *is* the database;
  the migration treadmill is its standing operational cost (payload HN; monstar-lab). In a
  markdown-in-git CMS a renamed frontmatter field is a versioned string change — reviewable,
  recoverable, no migration. cairn is structurally immune to an entire failure class. Worth claiming
  explicitly.
- **Magic-link authoring — editors never need a GitHub account.** Every git-CMS competitor makes the
  author authenticate to the git host (Decap OAuth or git-gateway, Keystatic GitHub login or Cloud,
  Sveltia GitHub/GitLab OAuth) or adopt a cloud SaaS. cairn's editors log in by email; the GitHub
  App commits on their behalf with bot-committer and author attribution. "You need a GitHub account
  to edit the website" is a real adoption blocker at a non-profit, and cairn is the only tool in the
  class that removes it. This is the most underrated advantage.
- **A concurrent-writer story the closest analogue lacks.** Statamic is also flat-file, and its users
  *deliberately stop tracking content in git* to escape merge conflicts between production edits and
  local work (mandrasch on dev.to; statamic/ideas #526), because it commits-on-save into one
  writer's assumption. cairn's per-entry `cairn/<concept>/<id>` branch plus deliberate Publish is the
  structural answer Statamic never built. Foreground it.
- **Markdown-first writing surface, not structured-JSON rich text.** The loudest Sanity content-model
  complaint is Portable Text as a "JSON monstrosity" with serializer battles; people revert to
  markdown for code blocks and speed. cairn edits raw markdown, with a directive layer (`:::card`)
  for the inline-component need that usually pushes people toward Portable Text. Right side of the
  tradeoff.
- **A bounded contract is a maintenance moat.** Decap's exodus is over neglect — unpatched XSS, stale
  deps, no roadmap (decap #6503) — not missing features. For a solo-maintained project, a small
  surface (fixed concepts, one renderer seam, design-agnostic) is a credibility asset, as long as
  cairn stays disciplined about what it adds.
- **One renderer for preview and public.** When it works, the preview is byte-accurate to production,
  which Astro and Keystatic previews are not. (The styling half leaks; see finding 5.)

Other instincts the evidence validates: one body per entry is a *stated invariant* rather than
Keystatic's surprising "one content field below the frontmatter" edge and its sidecar-file
workaround (keystatic #361); the per-entry-branch editorial flow is lighter than Decap's global
editorial workflow that users disable "after 15 minutes" and that breaks past ~29 drafts (decap
#3169); and computing excerpt and word count from the body at build (`deriveExcerpt`, `wordCount` in
`excerpt.ts`) is exactly the loved 80% of computed fields.

## The findings, calibrated by what users actually complain about

### 1. No cross-entry reference field — the biggest opportunity

Covered in the headline. cairn has no frontmatter reference type, so it can't model a post's author,
a page's parent for breadcrumbs, a series, related posts, or a category that is itself an entry. The
resolver, rename-rewrite, and backlink machinery already exist and are exported (`parseCairnToken`,
`manifestLinkResolver`, `inboundLinks`). The missing piece is the field type and its editor picker.
This is the lead recommendation, treated in full under high-effort opportunities.

One design note from the evidence: Payload's clearest ergonomic complaint is that an
array-of-relationships for reused items forces "editors to think like developers" — you must create
the entity before you can reference it (payload #4991). The lesson is to reserve references for
things that genuinely *are* separate entities (authors, series), and keep inline structures (the
object and array primitive below) for content that belongs to the entry. cairn's inline directive
components are already on the good side of this fork.

### 2. A thin scalar vocabulary — and the calibration matters

cairn ships seven field kinds (text, textarea, date, boolean, tags, freetags, image), two of which
are tag variants. The everyday gaps: `number`, single `select` (an enum/status; `tags` is multi
only), `url`/`email`, and `datetime`. Today a site abuses `text` plus a regex.

The calibration is important, because I initially mis-stated it. The "overkill for small sites"
verdict in the wild is about **backend weight** (a database, GROQ, SaaS, migrations) and
**structured-JSON rich text** (Portable Text), *not* about field-type count. No source across Payload,
Statamic, or Contentlayer argued for *fewer* field types; Payload's `blocks` and Statamic's
Bard/Replicator are their single most-praised features. The sharpest evidence: Content Collections
exists as a tool because its creator was "frustrated by the lack of flexibility in Contentlayer's
schema definition (e.g. you can't define an `email` or `url` type for a given field)" (dub.co). A
schema that can't express field semantics is a named reason a successor tool got built.

So cairn should defend its minimalism on **author-ergonomics** grounds, never on "rich fields are
overkill" — the evidence won't support the latter. Shipping `number`, `select`, `url`, and
`datetime` is closing a real gap, not drifting toward Sanity. Adding a scalar is cheap: one union
variant plus one arm each in `frontmatterFromForm` (a `switch`, `frontmatter.ts:14`) and
`validateFields` (a `switch`, `validate.ts:29`), plus one inference arm in `FieldValue`
(`schema.ts:35`). The `select` UI control already exists in the registry's `AttributeField`.

### 3. No schema composition across concepts

Astro's single most-recurring contract complaint was that `defineCollection` accepted only a raw
shape, so collections could not share a base schema and authors copied `title`/`author`/`date` into
each one (astro roadmap #415, multi-voice). cairn has the same flat-per-concept shape: `defineFields`
takes one array, with no `extends`/`omit`/shared-base mechanism, so Posts and Pages can't share
`title`/`seo`/`image`. cairn is closer to fixing it than Astro was, because `ConceptSchema.fields` is
plain data — a site can already write `defineFields([...baseFields, ...postFields])`. It needs a
small helper and a docs page, not new machinery.

### 4. No defaults or transforms; computed fields only internally

`FieldBase` has no `default`. A new post can't pre-fill `draft: true`, today's date, or a default
category. Astro users specifically praise `.default()` for absorbing messy hand-written frontmatter,
and Decap, Sanity, and Payload all have it. Cheap for cairn: the registry's `emptyValues` already
seeds component-attribute defaults — port the pattern to `FrontmatterField`.

`refine` is validation-only and explicitly never transforms. So normalization beyond trimming
(lowercasing a tag, deriving a slug) and computed fields (reading time) have nowhere to live in the
schema. The evidence sets a clean guardrail: computed fields are loved when they are pure functions
of one entry's own frontmatter and body (slug, date, url, excerpt, reading time) and leak when they
need to be queryable/sortable (Payload's virtual-field tradeoff), depend on a referenced binary
asset (velite #98), or reshape the whole object. cairn already does the loved case internally; expose
a site-declarable computed field bounded to pure-per-entry, and refuse the leaky cases.

### 5. `render(md)` is the wrong shape: frontmatter-blind, string-only, dual-runtime-fragile

`render(md, opts?) => string | Promise<string>` is billed as the one renderer the preview and every
public page call. Four problems:

- **Frontmatter-blind.** It receives only the body, so it can't render anything frontmatter-driven (a
  layout choice, a hero, a byline, a draft banner), and the preview can never be WYSIWYG for those
  parts. Astro's `render(entry)` hands back both the content component and the typed `entry.data`;
  developers prefer that shape.
- **String in, HTML string out.** Returning an HTML string forces `{@html}` on the consumer and bars
  component-based rendering. In a SvelteKit library the natural seam is a component or snippet.
  Astro's open sore is the same one in miniature — plain markdown can't remap elements to your own
  components without remark/rehype, the "markdown-vs-MDX cliff" (astro roadmap #769).
- **`string | Promise<string>`.** Every caller handles both arms.
- **Preview fidelity leaks.** The site reconstructs the renderer on server and in preview with
  different `resolve`/`resolveMedia`, and `PreviewConfig` (stylesheets, bodyClass, containerClass,
  byConcept) proves "one renderer" did not deliver preview fidelity — the styling half is a separate
  manual contract. Tina's lesson lands here: its biggest complaint isn't the type-safety, it's the
  wiring tax (`useTina`, preview routes, `tinaField` helpers). Instrumentation is where these tools
  lose people.

### 6. Two parallel, inconsistent field systems

`FrontmatterField` (`content/types.ts`) and the registry's `AttributeField` (`render/registry.ts`)
are two field-definition languages that overlap but diverge. Same concept, different vocabularies,
different validation idioms — and the secondary one is the more capable: `AttributeField` has
`select`, per-field defaults, and a cross-field function validator the primary content schema lacks.
A site author learns "declare a typed input with a label and constraints" twice. One primitive set
should serve both.

### 7. `image` is the only structured field, and it's hardcoded

The `image` field is the lone nested-object field, and its shape `{src, alt, caption?, decorative?}`
plus the single-SEO-image rule is hardcoded across the types, the validator, and the inference (the
source comment lists the four places a structured field must touch). That's the cost of having no
general object/array primitive: every future structured need (a CTA, an author, a gallery) repeats
the same four-place hardcoding. Keystatic, Sanity, and Payload express image as
`object({src: image(), alt: text()})` from the same primitives that build everything else.

### 8. GitHub-App-only backend, no storage seam

`BackendConfig` is GitHub-App-specific and there is no backend interface. The separate
`@glw907/cairn-cms-dev` package exists to work around exactly this — a package built to provide a dev
backend is evidence the contract should have carried a backend seam from the start. `appId` also
sits in `backend` like repo config, the documented appId-is-config-not-secret trap. A `Backend`
interface with a GitHub-App default would fold the dev package back in and open other hosts. The
guardrail from the evidence: keep the seam git/file, never a query layer that pulls in a runtime
database (Tina's conceded trap).

### 9. The adapter is a god-object

`CairnAdapter` carries roughly nine concerns in one flat 20-key object, with internal path knobs
(`manifestPath`, `mediaManifestPath`, `dictionaryPath`) leaking to the top level beside `siteName`.
The no-backward-compat license makes namespacing it nearly free while the field system is already on
the bench.

### 10. URL policy is split from the concept it owns

A concept's `fields`, `dir`, and `label` live in the adapter; its `permalink` and `datePrefix` live
in the YAML site-config, cross-checked by a runtime throw in `normalizeConcepts`. One concept's
definition is split across two files in two languages, papered over by a consistency guard. Astro,
Keystatic, and Decap keep routing with the collection. Co-locate it.

### 11. The concept model is hardcoded — but the curated stance is correct

`content: { posts?, pages? }` enumerates two keys, and `CONCEPT_ROUTING` hardcodes their routing.
The engine internals are already concept-generic (`normalizeConcepts` iterates `Object.entries`,
with a `DEFAULT_ROUTING` fallback), so only the adapter *type* and the routing table are closed.

The calibration: the evidence validates the curated, fixed-concept *product* stance for this
audience — "overkill" is the verbatim verdict on the open-ended tools, and one developer migrated
*to* Sanity and reverted to markdown. So this is not a push toward open-ended collections. It is
narrowly that the *implementation* hardcodes the concept set more than necessary. Make `content` an
open record where each `ConceptConfig` declares its own routing semantics, ship posts and pages as
documented defaults, and a developer can add a third curated concept (events, projects) without
editing the engine. Removing an unforced limit, not chasing a market cairn shouldn't serve.

### Sharp edges

- `summaryFields` is a stringly `string[]` cross-checked by a runtime throw; the `Infer` machinery
  exists, so type it `(keyof Infer<S>)[]` and the typo fails at compile time.
- The validation error model is one string per field, first-rule-wins. The praised case in the wild
  is "file X, field Y, wrong type"; the criticized case is an error that blames the schema for a
  usage mistake three files away (astro `ContentSchemaContainsSlugError`). cairn's save-time error
  should always name the file and field the author can fix.
- `icons` is one flat `IconSet` shared by the admin picker and the renderer, coupling the editor
  affordance to the render glyphs.
- `AdminPanel` and `FieldTypeDef` are reserved-but-dead extension seams typed `unknown`; they
  advertise capability the contract doesn't have.

## What to deliberately not do

The evidence draws boundaries as clearly as it draws gaps.

- **Don't reintroduce a runtime database or a query layer.** Cross-entry search/sort/filter at scale
  is what forced Tina's Data Layer and is the dominant structural complaint about Payload. cairn's
  build-time manifest over committed files is the differentiator. Any reference or query feature
  stays build-time.
- **Don't adopt structured-JSON rich text.** Portable Text is the loudest content-model complaint
  against Sanity. Keep markdown as the source of truth; the directive registry is the right answer
  for inline components.
- **Don't open to unbounded collections.** The fixed-concept stance is validated for the audience.
  Open the *implementation* (finding 11), not the product.
- **Own the small-site ceiling instead of implying unbounded scale.** Statamic is the empirical proof
  that flat-file read/index degrades into the hundreds-to-low-thousands of entries, and its vendor's
  own escape hatch is "switch to a database" (eloquent-driver; the SPIEGEL post). cairn is on the
  right side (fixed concepts, build-time index), but the read path must stay sub-linear per page —
  watch the usage index that unions every open `cairn/*` branch, which is the same shape of O(N) work
  that bit Decap's editorial workflow at ~29 drafts.
- **Gate i18n on real demand.** It was Sveltia's whole reason to exist and cairn has no seat for it,
  but it's a full initiative (content model, routing, editor, delivery), not fruit. Build it when a
  real cairn site needs it.

## Low-hanging fruit: developer-requested and cheap for cairn

Tier 1, genuinely small and high-frequency:

- **Single `select` / enum** (status, category). The most routine modeling request; the closed-vocab
  validation pattern (`tags`) and the `<select>` control (registry) both already exist.
- **`number`.** One variant. Replaces `text`-plus-regex for price, rating, order, capacity.
- **Field `default`.** Astro users praise it; the registry's `emptyValues` already does it for
  attributes. Big author quality-of-life.
- **Typed `summaryFields`** as `(keyof Infer<S>)[]`. Pure-type win, removes a runtime throw.
- **Composable base fields across concepts.** Nearly free — fields are plain arrays; a site can
  already spread them. Needs a helper and docs. Closes Astro's #1 complaint.

Tier 2, cheap-ish and high value:

- **`datetime`** for a post with a publish time. Extend the careful existing date handling.
- **`url`/`email`** as format-validated fields (or a `format` on `text`).
- **Computed/derived fields**, bounded to pure functions of one entry (reading time is the canonical
  ask). Extends the existing excerpt/word-count derivation.
- **Pass the frontmatter to `render`.** A bounded change (three call sites) that fixes preview
  fidelity for frontmatter-driven rendering.

## High-effort, high-impact opportunities

Truly impactful is the bar. These cluster into a coherent Contract v2 and are interdependent, which
argues for one designed pass over scattered changes.

1. **Frontmatter `reference` field on the id-stable graph — the flagship.** Highest available impact:
   it makes cairn better than the whole category, which fails to ship clean references (Keystatic
   slug-break, Decap bugs, Astro non-determinism, Velite's deliberate punt, Sanity/Tina need a DB).
   The resolver, rename-rewrite, and backlink halves are done. The cost concentrates in the editor
   picker UI, de-risked because the body-link picker already exists and can be generalized. Unlocks
   author, hierarchy/breadcrumbs, series, related, and "what links here." Low risk, medium-high cost,
   category-defining payoff.

2. **A composable `object` + `array` primitive, bounded to one level.** Lets `image` be built from
   primitives instead of hardcoded, unifies the two field systems, and unlocks the structured content
   sites ask for (FAQ lists, author lists, galleries, CTAs). The research warning is sharp: nesting is
   where field contracts go to die — every one of Decap's worst, longest-lived bugs lives at a
   composition boundary, and Sveltia's headline fixes are the nested editor (reorder, duplicate,
   collapse, variable types). The cost is the nested editing surface, not the data type. Two things
   de-risk it for cairn: the directive registry already has `repeatable` slots with `itemFields` and
   reorder, and scoping to one level keeps cairn out of the Decap trap while still subsuming `image`.
   The evidence also says no one wants *fewer* field types, so this is justified — the discipline is
   editor ergonomics.

3. **Entry-aware render, split into a cheap half and an expensive half.** The cheap half (pass
   frontmatter) is Tier-2 fruit. The expensive half — return a Svelte component/snippet instead of an
   HTML string — matches Astro's most-praised seam, removes `{@html}`, lets directives render to real
   components, and closes the element-remapping cliff. High cost (the whole render arm and every call
   site) and the only move that risks cairn's "one HTML-string renderer, design-agnostic" identity.
   Treat it as its own designed brainstorm with the simplicity constraint explicit.

4. **A `Backend` interface with a GitHub-App default.** Medium-high impact, low risk: folds the
   `@glw907/cairn-cms-dev` package back into the core (local dev without round-tripping GitHub), opens
   other hosts, and cleans the god-object. The commit pipeline is already isolated in `github/`. Keep
   it git/file, never a query layer.

5. **Adapter restructure — bundle, don't headline.** Namespace the god-object, co-locate URL policy,
   and unify the two field systems into one vocabulary. Coherence, not impact on its own; nearly free
   while the field system is already open for moves 1 and 2, and freed further by the no-backcompat
   license.

What doesn't clear the bar: opening the concept model (do it as a small cleanup inside the
restructure, not a flagship), and i18n (gate on real demand).

## Recommended shape: Contract v2

One initiative, sequenced so each step de-risks the next. References first — highest payoff, and the
picker UI built here is the control the object/array editor reuses. Then the bounded object/array
primitive plus the adapter and field-system unification, since the field bench is already open; the
Tier-1 scalars and `default` ride along here for almost no marginal cost. The backend seam is
independent and can run in parallel. The render-as-component question is its own designed brainstorm,
held separate because of the simplicity risk.

The throughline: cairn invented a narrow field DSL when the ecosystem converged on a composable
primitive set (Keystatic) or a Standard Schema/Zod validator. It even adopted Standard Schema at the
boundary, as a veneer over the hand-rolled validator rather than the authoring model. Contract v2 is
the chance to make the authoring model match the boundary it already claims to speak.
