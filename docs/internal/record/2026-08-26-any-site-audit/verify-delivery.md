# Fresh-context verification — delivery bucket (/delivery, /delivery/head, /delivery/data)

Verifier did not produce the ranking. Ten items tested against the two-arm gate, the anonymous-consumer
bar, the shape constraint, and the standing rulings (migration cost never discounts; evenness is a
property, not a third gate arm). Evidence re-derived from the code and the six family consumers, not
taken from the ranking's citations.

**Result: 7 verdicts stand, 3 do not.** Overturned: `feedView` (reshape → retire), `unlistedRoutes`
(reshape → retire), `PublicRoutes` (keep → retire).

---

## Rank 1 — `AI_CRAWLERS_REVIEWED` — retire — STANDS

Re-derived: the only references anywhere are `data.ts:74` (the export), `ai-crawlers.ts:89` (the
declaration), its own unit test, the CHANGELOG, and the reference page. `check-posture.ts` does **not**
read it. Zero consumers.

Tested the other way: could a site display "our AI policy was last reviewed on X"? It would be
misleading — the date belongs to cairn's table, not the site's policy, and a site pinned to an older
engine range would print a date that has already moved on `main`. Nothing else is expressible. Neither
arm is even arguable: a maintenance date is not part of the Content-Signal policy and the table it
qualifies is applied unconditionally inside `buildRobots` (`robots.ts:41-43`), so a consumer-side
freshness gate cannot change what ships.

## Rank 2 — `AiCrawler` — retire — STANDS

Verified parasitic: `grep` finds no engine function that accepts an `AiCrawler`; the only declaration
site is `AI_CRAWLERS: readonly AiCrawler[]` (`ai-crawlers.ts:38`). With the table internal, the type has
no obtainable inhabitant. Correctly ranked adjacent to rank 3 and correctly sharing its fate rather than
being judged on its own thinness.

## Rank 3 — `AI_CRAWLERS` — retire — STANDS

The evenness evidence checks out exactly as claimed: `check-posture.ts:15-16` imports `AI_CRAWLERS` and
`CONTENT_SIGNAL` on adjacent lines, both by relative path, and only the first is on the public barrel.
`CONTENT_SIGNAL`'s own doc says "Internal, and deliberately the one definition" (`robots.ts:17-21`).

Tested the other way, and this is the trio's one real counter-argument: a site that declares
`aiPosture: 'decline'` and wants to publish an operator-by-operator transparency page cannot state what
its own robots.txt emits without either importing the table or parsing its own served file, and hardcoding
seven tokens would drift from the engine at the next table update — an honesty failure the module's header
comment explicitly exists to prevent. That is a genuine anonymous case. It loses on two counts: it is site
content rather than content management (the charter's line), and zero of six consumers has built it
including the one site that declares `decline` (`xcathletes-org/src/theme/cairn.config.ts`). Demote to
internal beside `CONTENT_SIGNAL`; `buildRobots` keeps applying it, so nothing observable changes.

## Rank 4 — `feedView` — reshape — **DOES NOT STAND → retire**

The ranking's non-keep half is right and its reasoning about the six rejections is verified (all six
`chassis/feed.ts` modules hand-map with `contentHtml`; the header sentence is near-verbatim across repos,
and showcase/xcathletes are byte-identical copies). But its stated membership ground — "feed eligibility
comes from `descriptor.routing.inFeeds`, engine-owned routing a site cannot derive (Arm A)" — is false on
two independent counts:

1. **The site declares it.** `ConceptConfig.routing?: 'feed' | 'page' | 'embedded'`
   (`content/types.ts:86`) is written by the site in its own adapter, and `siteDescriptors` (public) plus
   `ConceptDescriptor.routing.inFeeds` (public, `types.ts:325`) hand the normalized flag back. The filter is
   `siteDescriptors(adapter, config).filter((d) => d.routing.inFeeds)` — legally reachable, one line.
2. **The one site that could have used it proves the premise wrong.** aksailingclub-org declares
   `routing: 'feed'` on both `posts` and `bulletins`, and its comment says why: *"`routing: 'feed'` gives
   each entry a real page and the default `/bulletins/:slug` permalink"* (`cairn.config.ts:272`). It wanted
   the dated-routable half, not feed membership — and its `chassis/feed.ts` maps posts only. A reshaped
   `feedView` with an enricher would put bulletins into ASC's RSS, which ASC deliberately does not want.
   `routing: 'feed'` bundles three things, so `inFeeds` is not a reliable statement of feed membership; the
   membership decision is editorial and site-owned.

The remaining engine content is nil: `ContentSummary` already carries permalink, excerpt and normalized
`tags`, and the `hasTaxonomy` guard (`views.ts:26,35`) is redundant with `summary.tags.length` because
`content-index.ts:129` sets `tags: []` when no field is marked taxonomy. Both gate arms fail and the
hand-roll is ten lines every site has already written. Retire; `FeedItem` (rank 40) stays and is what makes
the retirement costless.

The sitemapView contrast the ranking draws still holds and is unaffected: `routable` is not overloaded the
way `'feed'` is.

## Rank 5 — `unlistedRoutes` — reshape — **DOES NOT STAND → retire**

Verified: one adopter (`907-life/src/tests/content/sitemap.test.ts`), which copies the glob-and-strip
boilerplate the reference page prints, plus the four-line warning that parentheses are a glob
metacharacter. The ranking's own two strongest sentences ("the engine exported the cheap half"; "this is
not delivery output at all") argue for removal, not for a new form.

Applying the gate strictly: **Arm A fails** — both arguments are the site's own strings, and both rules the
function encodes are SvelteKit's published grammar, not cairn's (`sitemap.ts:31-41` is two regexes). Nothing
in the signature touches the content model, a descriptor, or the resolver. **Arm B fails** — the engine
ships no other route-id parsing, so no ratified grammar has diverged from what it emits. The failure clause
then applies on all three of its limbs: the hand-roll is small, the bespoke-route inventory is domain-shaped,
and the stated value ("cannot be forgotten") is a discoverability problem.

Tested the other way: cairn's own `sitemapView(extraRoutes)` created the hand-list this guards, which is a
real self-consistency argument of the kind that carries `resolveImageUrl` (rank 13). It fails because the
hand-list is not cairn-induced — any sitemap generator needs the site's bespoke routes — and because
`extraRoutes` is optional sugar. Relocating the check into `cairn-audit`'s rendered rules is feasible (that
tool does fetch a base URL) but is a new tool feature that must clear the gate on its own merits, not a
reshape of a passing export.

## Rank 6 — `PublicRoutes` — keep — **DOES NOT STAND → retire**

The discriminator the ranking missed. The repo's ratified export rule is *"every type named in a public
signature is exported from a subpath the consumer already imports"* (R4 doctrine,
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md:206`, cited in `data.ts:8`). Checked every
occurrence: `PublicRoutes` is named in **no** signature. `createPublicRoutes` returns an inferred object
literal (`public-routes.ts:246`) and the alias is appended afterwards (line 253). The rule does not reach it.

That separates it cleanly from ranks 7, 8 and 11, which the rule does reach (verified below). And the
consumer's escape is one line without an engine export: `createPublicRoutes` is public, so a site writes
`ReturnType<typeof createPublicRoutes>` itself. The stated anySiteCase — "a chassis module builds the
routes object and annotates its export" — is falsified by the three sites that have exactly that module
(`aksailingclub-org/src/chassis/public-routes.ts:26`, xcathletes, showcase): none annotates, and a `const`
export needs no annotation. A scenario no consumer hits, solvable in one line, is a failed keep burden.

Evenness caveat, recorded rather than used as a gate arm: six sibling aliases exist
(`ContentRoutes`, `NavRoutes`, `CairnAdminRoutes`, `AuthRoutes`, `EditorRoutes`, `Renderer`), and **zero**
are named by any consumer either. The convention is real but entirely unexercised. Apply the same test to
all seven in their own buckets; do not preserve this one on the strength of six others that would fail the
same way.

## Rank 7 — `EntryDataOverrides` — keep — STANDS

Verified against the export rule: it is named in a public signature, `composeEntryData(config, entry,
overrides?: EntryDataOverrides)` (`public-routes.ts:135`), and `composeEntryData` has two real consumer
files (`xcathletes-org/src/routes/team/agreement/+page.server.ts:34`,
`src/routes/(site)/plans/[slug]/+page.server.ts`). A public parameter type that cannot be named is the
defect R4 exists to prevent, so the keep rests on a ratified rule, not on absence of objection. Neither
consumer passes overrides today; that is a weakness of the parameter, not of the name. If
`composeEntryData` is ever demoted, this follows it.

## Rank 8 — `ContentProblem` — keep — STANDS

Same rule, same footing: named in `ContentIndex.problems(): ContentProblem[]` (`content-index.ts:78`), and
`ContentIndex` is imported by ten consumer files. Verified the near-dead claim —
`createSiteResolver` throws on any non-draft validation failure before a site can read
(`site-resolver.ts:67-72`) — so the reachable inhabitants are draft-only. Narrow, but the type is a member
of a squarely-kept interface's signature. Retiring it would leave a public method's return unnameable while
the method stays. The honest follow-up, if any, is to `problems()` itself.

## Rank 11 — `SeoFields` — keep — STANDS

Named in the public return annotation `readSeoFields(frontmatter): SeoFields` (`seo-fields.ts:27`), and
`readSeoFields` has a live consumer (`cairn-pub/src/routes/(site)/+page.server.ts:68`). The four keys are
the engine's declared SEO vocabulary and the reader is coupled to the validate-once normalized frontmatter
(`seo-fields.ts:24`), so agreement with the engine is the point. Export rule reached; keep stands on the
rule rather than on a demonstrated naming need.

## Rank 28 — `newlyPublishedEntries` — keep — STANDS

The bucket's highest-risk keep by provenance (family-originated, xcathletes brief, shipped ahead of its
consumer) and it survives.

Read the implementation (`manifest.ts:55-64`). The body is six lines, so the "small hand-roll" objection is
the one to test, and it fails on the documented trap: `upsertEntry` preserves a prior `publishedAt` through
an ordinary save including one that flips `draft` back to `true`, so the naive diff (`publishedAt && !prior`)
announces a re-published draft. The comment states this precisely (`manifest.ts:44`): *"a drafted entry CAN
carry a stamp forward … so the draft check below is what actually excludes a currently unpublished entry."*
The failure mode exists only because cairn's own stamping rules exist — the same structure that carries
`resolveImageUrl`. Arm A holds.

Anonymous case is concrete and generic, not family-shaped: announce-on-first-publish (digest, webhook,
social) is a normal want for any markdown CMS, and cairn ships no other mechanism. Shape is right: pure, no
clock, no network, the consumer fans out — the leanest seam over a general feature. Live at
`xcathletes-org/src/lib/server/broadcast/sweep.ts:145`.

Tested the shape objection: the input door leaks (`sweep.ts:144` casts `JSON.parse(prior.manifest) as
Manifest` two lines from where `parseManifest` would sit). Verified, but it does not convert this into a
reshape. `Manifest | null` is the correct signature for a pure diff; demanding raw text would force a caller
that already holds a parsed manifest to re-serialize. The leak is a discoverability problem, which the
standard says an export change does not fix.

---

# Second independent verification pass (fresh context, 2026-08-26)

A prior verification already occupied this file. This pass was run cold: every verdict below was
formed from the ranking, the engine source, and the six consumer checkouts **before** the section
above was read. Recording the convergence and, more usefully, the three places this pass produced
evidence the first pass did not.

**Result: identical to the first pass — 7 stand, 3 do not.** `feedView` reshape → retire,
`unlistedRoutes` reshape → retire, `PublicRoutes` keep → retire.

## Independently re-measured

Single grep across `907-life/src`, `aksailingclub-org/src`, `ecxc-ski/src`, `xcathletes-org/src`,
`cairn-pub/src`, `examples/showcase/src`: zero importers for `AI_CRAWLERS`, `AI_CRAWLERS_REVIEWED`,
`AiCrawler`, `feedView`, `PublicRoutes`, `EntryDataOverrides`, `ContentProblem`, `SeoFields`,
`parseManifest`; one for `unlistedRoutes` (907-life); one for `newlyPublishedEntries` (xcathletes).
Every count in the ranking reproduced.

## New evidence this pass adds

**1. `feedView`'s `hasTaxonomy` guard is dead code.** `views.ts:26` computes
`resolveTaxonomyField(descriptor.fields) !== null` and line 35 gates on
`hasTaxonomy && summary.tags.length`. But `content-index.ts:129` already sets
`tags: taxonomyField ? asTags(...) : []`, so a concept with no taxonomy field always has
`tags: []` and the guard can never change the outcome. That matters to the verdict: the guard was
the only line in `feedView` reaching an engine-internal helper (`resolveTaxonomyField` is exported
from no barrel), so with it shown redundant, **nothing** in `feedView` is unreachable by a
consumer. This independently closes Arm A before the `routing: 'feed'` overload argument is even
needed. Retire confirmed by a second route.

**2. `ContentProblem` is more reachable than either the ranking or the first pass states.** Both
say only draft failures are reachable because `createSiteResolver` throws on non-draft problems.
True by default — but `createSiteIndexes` forwards its `opts` straight through
(`site-indexes.ts:63`, `createSiteResolver(conceptIndexes, opts)`), and `createSiteResolver` skips
the throw entirely on `validate: false` (`site-resolver.ts:67`). That option is public and
documented on the factory (*"`validate: false` opts out of the build gate"*, `site-indexes.ts:33`).
A site that opts out sees every problem, not only draft ones. The keep stands either way, but it
stands on a live surface rather than a near-dead one, and the "if `problems()` were ever demoted"
follow-up should be recorded as weaker than written.

**3. The `routing: 'feed'` overload, verified at the source.** `ROUTING_SHORTHANDS.feed` is
`{ routable: true, dated: true, inFeeds: true }` (`content/concepts.ts:17`) and `routing` is a
site-written adapter field (`content/types.ts:86`). aksailingclub-org takes `'feed'` on `bulletins`
for the dated-permalink half by its own written reasoning (`cairn.config.ts:272`) and then maps
posts only in `chassis/feed.ts:10`. So `inFeeds` is not merely site-reachable, it is site-*declared*
and not a trustworthy statement of feed membership: a reshaped `feedView` would push ASC's bulletins
into its RSS. Confirms the first pass's finding from the engine side as well as the consumer side.

## Where this pass first disagreed with itself, and what resolved it

I initially argued `feedView` should be **kept in reshaped form** on a coherence ground the first
pass does not raise: `descriptor.routing.inFeeds` has exactly one reader in the entire engine —
`views.ts:23`. Grep of `src/lib` finds no other consumer beyond the shorthand table, the type
declaration, and a test fixture. Retiring `feedView` therefore leaves cairn declaring a routing flag
in its public content model that no engine code acts on, which is a real evenness cost.

That argument loses to finding 3. A flag whose one honoring path would produce output at least one
of six sites actively does not want is not a flag worth preserving a failing export for. The correct
follow-up belongs to the adapter/concept-model bucket, not here: either split the `'feed'` shorthand
so feed membership is stated separately from dated routing, or drop `inFeeds` as an unused field.
Filed as a cross-bucket note, not as a reason to keep `feedView`.

## `unlistedRoutes`: why reshape cannot rescue it

Reshape presupposes membership. Testing the ranking's own proposed reshaped form — take the
`import.meta.glob` record and derive route ids internally — it still parses SvelteKit route ids
against SvelteKit's published grammar (`sitemap.ts:31-41` is two regexes), still touches no
descriptor, resolver, or content-model type, and still emits no delivery document. Both arms fail in
the reshaped form exactly as in the current one. You cannot reshape past a failed membership test,
so the verdict is retire. The `cairn-audit` relocation the ranking suggests is a new tool feature
that must clear the gate on its own merits.

Confirmed the boilerplate claim by direct comparison: `907-life/src/tests/content/sitemap.test.ts:40-52`
reproduces `docs/reference/delivery-data.md:170-190` almost verbatim, glob-metacharacter warning
included. One adopter, one copy, 100% duplication.

## `PublicRoutes`: the evenness save tested and rejected

My cold reading reached `keep` on evenness, then broke it. Two checks did it:

- **The export rule does not reach it.** R4 doctrine is *"every type named in a public signature is
  exported from a subpath the consumer already imports"*
  (`docs/superpowers/plans/2026-08-02-c2-breaking-window.md:206`). `createPublicRoutes` returns an
  inferred object literal (`public-routes.ts:246`); the alias is appended at line 253 and is named
  in no signature. Ranks 7, 8 and 11 *are* reached by the rule; this one is not. The set is not
  uniform in the way the keep assumed.
- **The stated scenario is falsified by the site that lives it.**
  `aksailingclub-org/src/chassis/public-routes.ts` is precisely "a chassis module that builds the
  routes object and annotates its export": it annotates `publicRoutesConfig: PublicRoutesConfig`
  (line 11) and leaves `export const routes = createPublicRoutes(publicRoutesConfig)` (line 26)
  un-annotated, because a `const` export needs no annotation. Same in xcathletes and the showcase.
  And no consumer names any of the six sibling aliases either — the only sibling import found across
  all six repos is `ContentRoutesOptions`, a *parameter* type the export rule does cover
  (`xcathletes-org/src/chassis/cairn.server.ts:6`).

A one-line exact re-derivation (`ReturnType<typeof createPublicRoutes>`, available because the
factory is public) plus a scenario no consumer hits is a failed keep burden. Retire, with the same
caveat the first pass records: judge all seven aliases by one test in their own buckets rather than
preserving this one on the strength of six that would fail identically.

## The four surviving keeps, and what actually carries each

None of the four rests on a demonstrated anonymous-consumer naming need. Three rest on the ratified
export rule, which is a legitimate whole-surface basis but makes them *derived* verdicts:

| item | named in public signature | parent |
| --- | --- | --- |
| `EntryDataOverrides` | `composeEntryData(config, entry, overrides?)` (`public-routes.ts:279`) | `composeEntryData`, 2 consumer files, both passing no overrides |
| `ContentProblem` | `ContentIndex.problems(): ContentProblem[]` (`content-index.ts:78`) | `ContentIndex`, 10 consumer files |
| `SeoFields` | `readSeoFields(frontmatter): SeoFields` (`seo-fields.ts:27`) | `readSeoFields`, 1 consumer file |

These three should be re-judged only when their parents are, never independently; recording them as
three separate keeps overstates the surface's support by two.

`newlyPublishedEntries` is the one keep here with an independent case, and it is the bucket's
highest-risk verdict by provenance (family-originated from the xcathletes brief, shipped ahead of
its consumer). Tested hardest, and it survives — but the ranking's "Not derivable" is overstated and
should be corrected in the record. The *code* is six lines over inputs that are entirely public
(`Manifest`, `ManifestEntry`, `publishedAt`, `draft`, all on `/delivery/data` via `data.ts:84`). What
is unreachable is the *write-side semantics*: `stampFirstPublish` and `upsertEntry`
(`content/manifest.ts:433, 412`) are called only from `sveltekit/content-routes-core.ts:1467, 1593`
and are exported from no subpath. A hand-rolled stamp-only predicate is wrong today (a re-drafted
entry carries its stamp forward) and any hand-roll breaks silently whenever the engine changes
stamping. Reader shipped beside writer is the right Arm A statement, and announce-on-first-publish
is a generic want for any markdown CMS, not a family shape.

The input-door leak reproduced exactly: `xcathletes-org/src/lib/server/broadcast/sweep.ts:144` casts
`JSON.parse(prior.manifest) as Manifest` one line above the call at 145, with `parseManifest` unused
in all six consumers. Agreeing with the first pass that this does not convert the verdict: a caller
that already holds a parsed manifest should not have to re-serialize for a raw-text signature.
