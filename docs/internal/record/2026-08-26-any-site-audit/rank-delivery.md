# Delivery subsystem — any-site audit ranking

Subsystem: `/delivery`, `/delivery/head`, `/delivery/data`.
Items: 49 (deduped across subpaths, from `bucket-delivery.json`).
Source: `src/lib/delivery/`. References: `docs/reference/delivery.md`, `docs/reference/delivery-data.md`.
Repo state: `main` at HEAD, 2026-08-26.

## Collisions

**No item in this bucket carries `"collision": true`.** Every one of the 49 names is unique across
the audited subpaths; `/delivery` re-exports `/delivery/data` wholesale (`src/lib/delivery/index.ts:8`,
`export * from './data.js';`), so the shared names are the same symbol, not a differing signature.
`/delivery/head` contributes exactly one name, `CairnHead`. Nothing here needs a collision note.

## How the standard was applied to a data API

The written gate names UI-shaped conditions (engine-owned CSS, an unexported component, a
component's internal event contract). Translated to a delivery/data surface without loosening it:

- **Arm A — the site cannot legally reach the surface.** The export projects engine-owned internal
  structure: the normalized `ConceptDescriptor`, permalink and identity policy, validate-once
  frontmatter, the `cairn:` link token grammar, the `::include` fragment grammar, the `media:` token
  grammar, the manifest schema and its `publishedAt` stamping rules. A site cannot reproduce these
  without importing engine internals it has no legal import path to (the delivery barrel's own
  charter and `delivery-entry-boundary.test.ts` police that path).
- **Arm B — a ratified, measured grammar has diverged.** A published external spec the engine has
  already committed to emitting on the site's behalf: RSS 2.0, JSON Feed 1.1, sitemaps.org,
  robots.txt plus Cloudflare's Content-Signal policy, OpenGraph/Twitter cards, schema.org JSON-LD,
  SvelteKit route-id grammar.
- **Fails the gate** when the hand-roll is small, domain-shaped, or a discoverability problem an
  export would not fix.

Usage across the six family consumers (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org,
cairn-pub, examples/showcase) is cited throughout as **evidence toward generality, never as the
test**. Zero adoption across six independent wirings of the same feature is treated as measured
evidence that a shape is wrong; high adoption is treated as corroboration only.

**No consumer outside the family exists.** `@glw907/cairn-cms` is published to public npm, but
nothing in the repo, the briefs, or the harvest docs records an external installer, and the ROADMAP
states the first stranger walks the path only after `1.0.0-beta.1` (`ROADMAP.md:995`, "Waiting until
after `1.0.0-beta.1` means the first stranger to install cairn is the first person to walk the real
path"). Every provenance below is therefore family or engine-internal.

**Prior art on this surface.** A surface-pruning audit already ran on `/delivery` on 2026-07-01
(`54541401 refactor(surface)!: prune /delivery, /media, and /vite to their proven surfaces`), which
removed `createSiteResolver`, `ConceptIndex`, `createContentIndex`, `RawFile`, `fromGlob`,
`wordCount`, and `permalink`. Its bar was *proven* ("grep across the showcase and both production
sites found zero real imports"), which is the family-recurrence bar, not the anonymous-consumer bar.
The survivors were never tested against this standard. That is what follows.

---

# Rank 1 — `AI_CRAWLERS_REVIEWED`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `"2026-08-05"`

**Provenance.** Engine-internal, from Geoff's own ask, with no site requirement and no built
consumer. The research doc opens: *"Research input for ROADMAP's P8, the site AI-posture config.
Commissioned when Geoff asked for `llms.txt` support and then restated the goal as the outcome
rather than the file"* (`docs/internal/record/2026-08-03-ai-crawler-posture-research.md:3`). Shipped
in the same commit as the table (`f68ca468 Let a site state an AI posture, and emit what it
implies`). Zero importers across all six family consumers.

**Anonymous-consumer case.** A bare `YYYY-MM-DD` string literal whose entire meaning is *"the
engine's own data may be stale."* There is no action an anonymous consumer can take on it. It
cannot refresh the table, cannot override it, and cannot pass a newer one in. The only expressible
behavior is to distrust a table the engine already applies for them inside `buildRobots`. An export
that exists to warn the caller about the engine's maintenance cadence is a maintenance disclosure,
not an API.

**Verdict: retire.** It fails both arms. There is no external grammar here (a review date is not
part of the Content-Signal policy) and nothing about it is unreachable — a site that wants a
verified crawler list can read the seven first-party citation URLs the docs already print. Against
it: a diligent site might gate its own posture on table freshness. That argument dies on inspection,
because `buildRobots` reads `AI_CRAWLERS` unconditionally regardless of what the site decides about
the date, so the gate cannot be enforced from the consumer side. Churn is free until beta, so the
migration cost of removing a string literal nobody imports is not a factor.

---

# Rank 2 — `AiCrawler`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ token; operator; category: "training"; citation; note? }`

**Provenance.** Same commit and same origin as rank 1 (`f68ca468`, 2026-08-05). Its only reason to
exist is to type `AI_CRAWLERS`: `export const AI_CRAWLERS: readonly AiCrawler[]`
(`src/lib/delivery/ai-crawlers.ts:38`). Zero importers outside the engine's own test file.

**Anonymous-consumer case.** Parasitic on rank 3. A consumer can only name this type if it is
holding the table, and holding the table is the case that fails at rank 3. There is no second
producer of `AiCrawler` values — nothing in the engine accepts one as an argument, so a site cannot
even construct one and hand it back.

**Verdict: retire.** With `AI_CRAWLERS` retired this type has no inhabitant a consumer can obtain.
Arguing the other way: if the table were kept, the closure rule stated in `src/lib/delivery/data.ts:8`
("the export-rule sweep makes each importable from this subpath directly") would require this type
to stay. That is exactly why it is ranked adjacent to the table and shares its verdict, rather than
being judged on its own thin merits.

---

# Rank 3 — `AI_CRAWLERS`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `readonly AiCrawler[]`

**Provenance.** Engine-internal (`f68ca468`, 2026-08-05), from the same commissioned research. No
site brief asked for it; the ASC and xcathletes consumer briefs are silent on crawlers. The CHANGELOG
records that it shipped ahead of every consumer: *"`aiPosture` is optional and unset on every site
today, so this window's robots.txt output is byte-identical to before for all four"*
(`CHANGELOG.md:1010`). Zero importers across all six consumers today, even now that xcathletes-org
declares `aiPosture: 'decline'` — that site sets the adapter field and lets `robotsResponse` apply
the table, which is the intended path.

**Anonymous-consumer case.** The engine already consumes this table on the site's behalf:
`for (const crawler of AI_CRAWLERS) lines.push('', 'User-agent: ' + crawler.token, 'Disallow: /')`
(`src/lib/delivery/robots.ts:42`). To import it, an anonymous consumer must be building its own
robots.txt instead of calling `buildRobots`/`robotsResponse`, at which point it is reimplementing the
feature the export belongs to. The residual case — "render an operator-by-operator transparency page
citing what we decline" — is real but is site content, not content management, and it is served by
the seven citation URLs already printed in `docs/reference/delivery-data.md#ai_crawlers`.

**The decisive evenness evidence.** The sibling constant in the same subsystem, with the same two
in-engine consumers, is deliberately **not** public. `CONTENT_SIGNAL` is documented as *"Internal, and
deliberately the one definition"* (`src/lib/delivery/robots.ts:21`) and is reached by the doctor via a
relative import (`src/lib/doctor/check-posture.ts:16`). `AI_CRAWLERS` is reached by that same file, one
line above, the same way (`check-posture.ts:15`) — and yet it is on the public barrel. Two constants,
one module, one consumer set, opposite visibility. That asymmetry is unjustified by anything in the
code or docs, and evenness is a property the standard explicitly protects.

**Verdict: retire (the public export; the module stays).** Against retiring: this is a curated,
first-party-cited, dated registry that no individual site would maintain, and that is genuine
engine value. But the value is delivered by `buildRobots` applying it, not by a consumer reading it,
and a curated third-party token registry sits outside the charter's line — *"cairn owns its core job,
managing markdown content and the editor/admin frame, and little else."* Demote it to internal
alongside `CONTENT_SIGNAL`, exactly as the 2026-07-01 prune demoted `fromGlob` and `wordCount`.

---

# Rank 4 — `feedView`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(site, descriptors, origin) => FeedItem[]`

**Provenance.** Engine-internal, from the taxonomy/tag-delivery design (`11236daf Add engine feed and
sitemap views with taxonomy categories`). Survived the 2026-07-01 prune explicitly: *"feedView and
sitemapView stay"* (`54541401`).

**Anonymous-consumer case, measured and failed.** **Zero of six** family consumers import it, and all
six ship both an RSS and a JSON feed. Every one of them instead hand-writes the same `feed.ts` module
mapping its own posts index into `FeedItem` — the file header is copied verbatim across repos: *"the
one place that maps ecxc.ski's posts index into cairn-cms/delivery's FeedItem"* (ecxc-ski), the same
sentence in 907-life, aksailingclub-org, xcathletes-org, cairn-pub, and the showcase. Six independent
wirings of exactly the feature this export serves, six rejections. That is not a discoverability
problem: `sitemapView`, its sibling in the same module and the same doc section, was adopted by two
of them.

**Why it was rejected is written in its own source.** *"omits `contentHtml`, since a full-content feed
needs a per-item render and link-resolver pass this pure view does not carry. A site wanting full
content maps render itself"* (`src/lib/delivery/views.ts:17`). Every real feed wants full content, so
every site takes the escape hatch. The membership is right — feed eligibility comes from
`descriptor.routing.inFeeds`, engine-owned routing a site cannot derive (Arm A) — but the form makes
the engine's one contribution (the `inFeeds` filter plus taxonomy tags) unreachable without also
accepting the summary-only projection nobody wants.

**Verdict: reshape.** Right membership, wrong form. The right form separates the engine's actual
value from the projection: either accept an optional async per-item enricher
(`feedView(site, descriptors, origin, { render })`) so a full-content feed is one call, or return the
`inFeeds`-filtered `ContentSummary[]` and let the site map, which is what all six already do by hand
minus the routing filter they currently re-derive. Do not transplant any one site's `feed.ts`; the
re-derived form is the filter plus a hook, not a site's mapping.

---

# Rank 5 — `unlistedRoutes`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(routeIds: string[], listedPaths: string[]) => string[]`

**Provenance.** Family-originated from one site's hand-list. `278035eb feat(delivery): give sitemapView
bespoke routes and an unlisted-route check` (2026-07-05), harvested as *"Sitemap extra-routes — LANDED
(`278035e`) … 907.life migrated its hand-list onto both (`9b89745`); ecxc-ski's migration is CANDIDATE"*
(`docs/internal/pre-beta-harvest.md:407`). **One** importer today, 907-life, the requesting site.

**Anonymous-consumer case.** Real in the abstract: any site with bespoke non-concept pages risks a page
directory that never joined the sitemap. And the function does encode a ratified grammar the site would
get wrong — SvelteKit route groups contribute no URL segment, and dynamic ids must never be flagged
(`src/lib/delivery/sitemap.ts:31-41`). That is Arm B, narrowly.

**But the shape is wrong, and the doc proves it.** The reference page's own example spends fifteen lines
on consumer boilerplate around a one-line call: glob `+page.svelte`, strip the prefix, strip the suffix,
call twice, throw — plus a four-line comment warning that parentheses are a glob metacharacter
(`docs/reference/delivery-data.md:170-190`). Every adopter copies all of it. The engine exported the
cheap half (an array diff) and left the site the expensive half (deriving route ids correctly). Worse,
this is not delivery output at all: it is a build-time conformance check a site wires into its own test
suite, and the workstation rule is explicit that *"the mechanically detectable half belongs in
`cairn-audit`, never a consuming site's own probe script."*

**Verdict: reshape.** Right membership, wrong altitude and wrong form. Move the check into `cairn-audit`
or `cairn-doctor`, where it needs no per-site boilerplate and cannot be forgotten (the repo's own watch-item
rule: "converting a watch into a failing test is the gold standard"). If it stays a library function, it
should take the glob record (`Record<string, unknown>` from `import.meta.glob`) and the listed paths, and
do the id derivation itself, so the fifteen lines collapse to one.

---

# Rank 6 — `PublicRoutes`

**surfacedAt:** `/delivery` · signature `{ entryLoad; entries; markdownEntries; markdownLoad }`

**Provenance.** Engine-internal convention. Declared as `export type PublicRoutes = ReturnType<typeof
createPublicRoutes>` (`src/lib/delivery/public-routes.ts:253`), and the reference records the convention
plainly: *"`createPublicRoutes` exports its return type by name as `PublicRoutes`"*
(`docs/reference/delivery.md`). **Zero** importers across all six consumers.

**Anonymous-consumer case.** A site that builds the routes object in a shared chassis module and
annotates the export needs the name. That is a real situation but a thin one: TypeScript infers the type
at every call site, and all six consumers demonstrate that inference suffices — including
`examples/showcase/src/chassis/public-routes.ts`, which imports `PublicRoutesConfig` from this same
barrel and does not need `PublicRoutes`.

**Verdict: keep.** It survives on the surface-evenness property rather than on its own case: a factory
in this codebase names its return type, and removing it here alone would make `/delivery` the odd barrel
out. That is an honest reason but a weak one, and this keep is recorded as resting on the absence of an
objection rather than on a concrete anonymous-consumer scenario.

---

# Rank 7 — `EntryDataOverrides`

**surfacedAt:** `/delivery` · signature `{ resolveLink?; resolveFragment?; resolveMedia? }`

**Provenance.** Engine-internal, shaped by an engine caller. `b1170c17 Extract composeEntryData and
manifestFragmentResolver (task 3a)`, then `65737bf5 Add previewLoad, the public preview page's server
load`. Its own doc names its only caller: *"`previewLoad` (task 3b) is the first caller to pass these"*
(`src/lib/delivery/public-routes.ts:112`). **Zero** importers across all six consumers.

**Anonymous-consumer case.** A site that resolves an entry through its own lookup and needs the identical
composition with substituted resolvers — a staging preview, a per-branch render, a scheduled-publish
peek. Concrete enough to state, but the only realized instance is the engine's own `previewLoad`, which
imports it relatively and does not need the public name.

**Verdict: keep.** It is the closure type of `composeEntryData`, which is public and has a built consumer
(xcathletes-org, 2 files), so retiring it would leave a public parameter unnameable — the exact defect the
export-rule sweep exists to prevent (`src/lib/delivery/data.ts:8`). Against: an export whose sole caller
is the engine is a smell, and if `composeEntryData` were ever demoted this type should go with it. This
keep rests on the absence of an objection, not on a demonstrated anonymous need.

---

# Rank 8 — `ContentProblem`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ id: string; draft: boolean; errors: Record<string,string> }`

**Provenance.** Engine-internal, from the original content index (`352450c6 feat(delivery): add the
concept-generic content index`). Documented as *"One entry's validation failure, recorded at build for the
site aggregator's gate"* (`src/lib/delivery/content-index.ts:63`). **Zero** importers across all six.

**Anonymous-consumer case.** A site building a content-health page reads `index.problems()` and needs the
type to hold the result. Real, but nearly dead in practice: `createSiteResolver` already throws on any
non-draft problem before a site can look (`src/lib/delivery/site-resolver.ts:68-73`), so the only reachable
inhabitants are draft-only failures, and zero of six sites have wanted them.

**Verdict: keep.** `problems()` is a member of `ContentIndex`, which is squarely kept, so its return type
must be nameable. Argued the other way: this is the weakest link in a strong chain, and if `problems()`
itself were ever demoted to internal this would follow. Keep rests on the absence of an objection.

---

# Rank 9 — `jsonLdScript`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(data: Record<string, unknown>) => string`

**Provenance.** Engine-internal, shipped with the head component it serves (`b94a91d9 feat(delivery): add
jsonLdScript and the CairnHead component`). **Zero** importers across all six — `CairnHead` calls it
internally (`CairnHead.svelte:14`).

**Anonymous-consumer case.** A site that owns its own `<svelte:head>` instead of mounting `CairnHead`, and
must serialize `SeoMeta.jsonLd` — engine-produced data — into an inline script without a breakout. The
hand-roll looks small (`JSON.stringify` plus five replaces) and that is precisely why it fails safely:
**the engine itself got it wrong once**, and the fix commit is on record (`6b004007 fix(delivery): escape
U+2028 and U+2029 in jsonLdScript`). A site copying the obvious three-character escape ships the same bug.

**Verdict: keep.** Arm B, narrowly: it is a correctness floor for an external format the engine already
commits to emitting, with measured evidence the naive form is wrong. Against: it is a generic XSS-safety
utility, not cairn-shaped, and nothing about it needs the content model. It stays low in the ranking for
that reason, but the recorded defect makes the "small hand-roll" objection fail on its own terms.

---

# Rank 10 — `markdownResponse`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(opts: { body: string }) => Response`

**Provenance.** Engine-internal, from the raw-markdown twin (`6616e072 Serve a raw-markdown twin of every
routable entry`, 2026-08-05). The commit's own framing: *"The twin serves the entry's stored body
unrendered, which is the one place cairn's architecture is a real advantage: an HTML-first CMS has to
reconstruct markdown it threw away."* Two importers: the showcase and xcathletes-org.

**Anonymous-consumer case.** Any site wiring the `.md` twin route needs `text/markdown; charset=utf-8` on
the response, and the module states why the engine owns that detail: *"The content type is the one detail
every site otherwise copies and occasionally gets wrong"* (`src/lib/delivery/responses.ts:3`).

**Verdict: keep.** It is the thinnest member of a coherent five-responder family (rss / json / sitemap /
robots / markdown) and evenness argues for the set, not for picking members off. Against: it is the only
responder that wraps no builder at all — three lines with no engine knowledge in them beyond a MIME
string — and it is genuinely the weakest of the five. It stays because the family reads as one thing and
because the twin is a route a site will otherwise mis-serve as `text/plain`.

---

# Rank 11 — `SeoFields`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ description?; image?; robots?; author? }`

**Provenance.** Engine-internal (`60e2d0ce feat(delivery): add the SEO fields reader and image resolver`,
2026-06-01). **Zero** importers; `readSeoFields`'s return type.

**Anonymous-consumer case.** A site annotating a helper that passes SEO fields around after calling
`readSeoFields`. cairn-pub calls the function (1 file) and does not name the type.

**Verdict: keep.** Closure type of a kept function, and the four keys are the engine's own declared SEO
vocabulary, not an arbitrary bag. Recorded as resting on the absence of an objection: no consumer has
needed the name.

---

# Rank 12 — `buildSitemap`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(urls: SitemapUrl[]) => string`

**Provenance.** Engine-internal, original delivery surface (`19e73eee feat(delivery): add sitemap and
robots builders`, 2026-05-30). **Zero** direct importers — all six sites reach it through
`sitemapResponse`.

**Anonymous-consumer case.** A plain-Node build step writing `sitemap.xml` to disk rather than serving it
from a route — which is exactly the case `/delivery/data` exists for (*"a plain-Node tool such as the
manifest bin or the Vite plugin can import the builders"*, `docs/reference/delivery-data.md:5`). The
sitemaps.org grammar is ratified (Arm B), and the shared escape is a real correctness floor: *"The
strongest of the two copies it replaced (the old sitemap copy skipped quotes)"* (`src/lib/delivery/xml.ts:2`).

**Verdict: keep.** Weakest of the four builders — a `<urlset>` of `<loc>`/`<lastmod>` is the least
subtle document in the family, and zero sites have wanted it unwrapped. It survives on the node-safe
generation case and on the builder/responder symmetry, and its low rank records that the case is thin.

---

# Rank 13 — `resolveImageUrl`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(image: string, origin: string) => string | undefined`

**Provenance.** Engine-internal (`60e2d0ce`, 2026-06-01). One importer: aksailingclub-org.

**Anonymous-consumer case.** A site building an `og:image` from an author-supplied frontmatter path. The
naive form (`new URL(image, origin).href`) is wrong in a cairn-specific way, and the guard says so:
*"`media:photo.<hash>` is a valid URL scheme, so `new URL(...).href` returns the token verbatim and it
would otherwise ship as the og:image"* (`src/lib/delivery/seo-fields.ts:46`). That is Arm A — the failure
mode exists only because cairn's own `media:` token grammar exists, so a site cannot know to guard against
it.

**Verdict: keep.** Small, but the small part is the part cairn made necessary. Against: the whole function
is eight lines and one consumer uses it; if the `media:` guard ever moved into the media subsystem's own
resolver, this would have no reason to be public.

---

# Rank 14 — `readSeoFields`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(frontmatter: Record<string, unknown>) => SeoFields`

**Provenance.** Engine-internal (`60e2d0ce`, 2026-06-01). One importer: cairn-pub. The engine uses it in
three places inside `createPublicRoutes` (`public-routes.ts:141, 210, 242`).

**Anonymous-consumer case.** A site rendering a page the catch-all loader does not serve (a tag index, a
bespoke landing page) that must read the same SEO frontmatter keys the engine reads, so the two surfaces
agree. Arm A: the contract it depends on is engine-owned — *"The field must be declared in the concept's
schema to survive the validate-once read; an undeclared key is not on the normalized frontmatter"*
(`src/lib/delivery/seo-fields.ts:24`). A site reading raw frontmatter instead would silently disagree
with every entry page.

**Verdict: keep.** The trim-and-coerce body is trivial; the *key vocabulary* and the validate-once
coupling are not, and agreeing with the engine is the whole point. Against: a site could equally read
`data.seo` from the loader and never touch frontmatter, which is what five of six do.

---

# Rank 15 — `parseManifest`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(raw: string) => Manifest`

**Provenance.** Engine-internal, from the manifest work (`85da890b feat(content): the manifest types and
the row builder`), re-exported onto this subpath by `84fe1927 Export Manifest and parseManifest from
./delivery/data` — i.e. added specifically to close `newlyPublishedEntries`'s input door. **Zero**
importers.

**Anonymous-consumer case.** A consumer fetching a deployed `manifest.json` and feeding it to
`newlyPublishedEntries` needs the version guard and entry-shape validation, which are engine-owned schema
(Arm A). The docs state the intent: *"Use it to validate a manifest your own code fetches … instead of
casting the fetched JSON yourself"* (`docs/reference/delivery-data.md`).

**The friction worth recording.** The one consumer with exactly that use case did the thing the export
exists to prevent: `const priorManifest = JSON.parse(prior.manifest) as Manifest`
(`xcathletes-org/src/lib/server/broadcast/sweep.ts:144`), in the same file that imports
`newlyPublishedEntries` two lines apart from where `parseManifest` would sit.

**Verdict: keep.** The membership is right and the schema is unreachable otherwise. But the cast above is
evidence the door is in the wrong place, and the honest follow-up is not to retire this — it is for
`newlyPublishedEntries` to accept raw text and validate at its own boundary, so a consumer cannot cast
past it. Recorded here rather than turned into a second reshape verdict, because the fix belongs to rank 28.

---

# Rank 16 — `deriveExcerpt`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(body: string, opts?: { description?; maxChars? }) => string`

**Provenance.** Engine-internal, original delivery surface (`553f3028 feat(delivery): add excerpt and
word-count derivation`, then exported by `f71059b2`). Three importers, all aksailingclub-org — one of
which reaches `/delivery/data` directly.

**Anonymous-consumer case.** A site deriving an excerpt for text the read model does not summarize — a
custom card over a body fragment, a search result, a truncated reference blurb — that must match the
excerpt the engine put in `ContentSummary.excerpt` for every other surface. Reproducing the engine's exact
rule (description-first, strip, cut at a word boundary near 200, ellipsis) by eye guarantees a visible
mismatch between two cards on the same page. Arm A by consistency: the rule is engine policy, not a
general-purpose truncation.

**Verdict: keep.** Against: `ContentSummary.excerpt` and `ResolvedReference.summary` already carry the
derived value for every entry the engine knows about, so the case only arises for text outside the corpus —
which is narrow, and one site's worth of evidence. Note that its sibling from the same commit, `wordCount`,
was demoted in the 2026-07-01 prune while this stayed; the split is defensible (`wordCount` is arithmetic,
this is policy) but worth naming.

---

# Rank 17 — `SeoInput`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ title; description; canonicalUrl; siteName; type?; published?; modified?; feeds?; image?; imageAlt?; robots?; author? }`

**Provenance.** Engine-internal, original SEO builder (`4ec525b4 feat(delivery): add the SEO head builder`,
2026-05-30). **Zero** named importers, but `buildSeoMeta` has 12 importing files across two repos, all
constructing this shape inline.

**Anonymous-consumer case.** A site with a helper that assembles head inputs for several bespoke page types
and returns or accepts them before calling `buildSeoMeta` — aksailingclub-org's twelve call sites are
precisely that pattern, built inline only because the object never crosses a function boundary today.

**Verdict: keep.** Parameter type of a well-adopted public function; retiring it would leave the argument
unnameable. Against: twelve real call sites and none needed the name, which is a fair reading that the
inline literal is enough.

---

# Rank 18 — `FeedChannel`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ title; description; siteUrl; feedUrl; language?; author? }`

**Provenance.** Engine-internal, original feed builders (`f71059b2 feat(delivery): export the public delivery
surface`, 2026-05-30). **Zero** named importers; every site constructs the channel inline at its
`rssResponse`/`jsonFeedResponse` call.

**Anonymous-consumer case.** A site sharing one channel definition between its RSS and JSON Feed routes —
which every family site effectively does through a `chassis/feed.ts` module — wants the name on that shared
constant. Its members are RSS 2.0 and JSON Feed 1.1 channel metadata (Arm B), not cairn invention.

**Verdict: keep.** Closure type of two well-adopted functions. Against: identical to rank 17 — real
pattern, zero realized need for the name, so the case is inferred rather than demonstrated.

---

# Rank 19 — `buildJsonFeed`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(channel: FeedChannel, items: FeedItem[]) => string`

**Provenance.** Engine-internal, original surface (`f71059b2`, 2026-05-30). **Zero** direct importers; all
six sites go through `jsonFeedResponse`.

**Anonymous-consumer case.** A plain-Node generator writing `feed.json` to disk, or a site embedding the feed
document in something other than a `Response`. The engine holds the JSON Feed 1.1 details a site gets wrong:
the version URI, `date_published`/`date_modified` as ISO-8601 UTC instants, and the
`content_html`-else-`content_text` fallback (`src/lib/delivery/feeds.ts:104-122`). Arm B.

**Verdict: keep.** Against: the builder/responder pair doubles the surface — eight exports for four
documents — and no consumer has ever wanted the unwrapped half. The doubling is recorded as an evenness
observation at the end of this file rather than as four retire verdicts, because the node-safe half is the
stated charter of `/delivery/data` and honoring it selectively would be worse than honoring it evenly.

---

# Rank 20 — `buildRssFeed`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(channel: FeedChannel, items: FeedItem[]) => string`

**Provenance.** Same commit and same posture as rank 19. **Zero** direct importers.

**Anonymous-consumer case.** Same node-safe generation case, with a stronger correctness floor than the JSON
twin: RFC-822 dates in UTC, the `atom:link rel="self"` channel element, one `<category>` per taxonomy tag,
and the CDATA hazard the engine handles explicitly — *"CDATA cannot contain `]]>`, so split that one sequence
rather than escape the body"* (`src/lib/delivery/feeds.ts:73`, with `cdataSafe` at line 29). A site
hand-writing RSS ships a feed that breaks on the first post containing `]]>` in a code block.

**Verdict: keep.** Ranked above `buildJsonFeed` because the XML document has strictly more ways to be wrong
and the engine has already absorbed them. Same doubling caveat.

---

# Rank 21 — `SiteGlobs`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ [K in keyof A["content"]]?: Record<string, string> }`

**Provenance.** Engine-internal, from the typed-reads pass (`9b121511 feat(delivery): full-auto typed reads
with createSiteIndexes`). **Zero** importers by name, but the shape is constructed at every
`createSiteIndexes` call — 12 files across all six consumers — and generated programmatically by the
engine's own Vite plugin (`src/lib/vite/internal.ts:76`).

**Anonymous-consumer case.** A site whose chassis builds the glob record in one module and passes it to both
`createSiteIndexes` and `buildSiteManifest` needs to annotate that value; without the name it is
`Record<string, Record<string, string>>` and loses the adapter's concept-key checking, which is the entire
point of the typed pass.

**Verdict: keep.** Generic parameter type of two kept functions, and the mapped-key typing is engine-owned
(Arm A). Against: nobody has named it yet, so the case is structural rather than demonstrated.

---

# Rank 22 — `buildRobots`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(opts: { sitemapUrl; disallow?; posture? }) => string`

**Provenance.** Engine-internal, original surface (`19e73eee`, 2026-05-30), materially extended by the
AI-posture pass (`f68ca468`, 2026-08-05). **Zero** direct importers; all six reach it via `robotsResponse`,
and xcathletes-org exercises the posture arm by declaring `aiPosture: 'decline'`
(`xcathletes-org/src/theme/cairn.config.ts:566`).

**Anonymous-consumer case.** Any site needs a robots.txt pointing at its sitemap, and the posture arm encodes
a ratified external grammar with real subtlety: *"directive `Content-Signal`, keys
`search`/`ai-input`/`ai-train`, values `yes`/`no`, pairs separated by a comma and a space. An absent key is
no expressed preference"* (`src/lib/delivery/robots.ts:5`), plus the deliberate restraint that a declining
site does not also withhold its search presence. Arm B squarely.

**Verdict: keep.** Ranked above the feed and sitemap builders because it carries policy a site would get
wrong in a way that costs it traffic, and because it has a live consumer through its wrapper. Note that
keeping this is fully compatible with retiring `AI_CRAWLERS`: the table stays internal and this function
keeps applying it, which is how every consumer already uses it.

---

# Rank 23 — `buildSiteManifest`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `<A extends CairnAdapter>(adapter, config, globs) => Manifest`

**Provenance.** Engine-internal (`1a3854b0 feat(delivery): the corpus manifest builder and the build
resolver`). **Zero** importers written by a human in any consumer — but it is load-bearing for the engine's
own plugin in a way a relative import cannot serve.

**Anonymous-consumer case, and it is not the obvious one.** The `cairnManifest` Vite plugin emits a virtual
module that runs *inside the consumer's own Vite resolution*, and that generated source imports this symbol
through the public package specifier:

```
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
```
(`src/lib/vite/internal.ts:72`, inside the template string; called at line 79)

The generated module cannot use a relative path into the engine, so the public export is the mechanism, not
a convenience. Every cairn site that runs the manifest plugin depends on this name existing, whether or not
its authors ever type it. The secondary human case — a plain-Node tool building the manifest outside Vite —
is real but unrealized.

**Verdict: keep.** Against: an export whose justification is "the engine's own generated code needs the
specifier" is a mechanism leak, and a cleaner shape would give the plugin a dedicated internal entry rather
than putting a build-time function on the site-facing data barrel. That is a legitimate future reshape; it is
not raised to a verdict here because the export is genuinely required today and removing it breaks every
consumer's build.

---

# Rank 24 — `composeEntryData`

**surfacedAt:** `/delivery` · signature `(config, entry, overrides?) => Promise<EntryData>`

**Provenance.** Engine-internal, extracted so preview and public could not drift (`b1170c17 Extract
composeEntryData and manifestFragmentResolver (task 3a)`). Two importing files, xcathletes-org. Marked
*"Stability tier: Unstable API"* in the reference.

**Anonymous-consumer case.** A site that resolves an entry by something other than its permalink — a
staging preview, a scheduled-publish peek, an editor-facing render — and needs byte-identical composition
with the public page. Everything it composes is engine-owned: the SEO unify rule (a resolved hero wins over
the string `image` field and the site default, `public-routes.ts:143`), the article-vs-website type
decision, the adjacent pair, and the hero derivation off the `media:` token. Arm A: a site
re-implementing this produces a preview that structurally disagrees with the page it previews.

**Verdict: keep.** Against: it is the one function here whose stated first caller is the engine itself, and
its "Unstable API" tier is an accurate admission that the shape is not settled. It earns its rank on a
concrete realized consumer and on the drift it prevents.

---

# Rank 25 — `SeoMeta`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ title; meta[]; links[]; jsonLd }`

**Provenance.** Engine-internal, original SEO builder (`4ec525b4`, 2026-05-30). No named imports in
consumers, but it is the prop type of the most-used component in the bucket: `CairnHead` takes
`seo: SeoMeta` (`CairnHead.svelte:29`) and 21 files across all six consumers mount it.

**Anonymous-consumer case.** A site whose chassis has a helper returning head data for bespoke pages, or one
mounting `CairnHead` from a typed prop it received — aksailingclub-org and cairn-pub both call `buildSeoMeta`
and thread the result through their own components. The shape is deliberately plain data so the site owns
rendering (*"Returns plain data so the template renders it inside `<svelte:head>`"*,
`src/lib/delivery/seo.ts:1`), which only works if the type is nameable.

**Verdict: keep.** The contract between two public surfaces (`buildSeoMeta`, `CairnHead`) and a site's own
templates. Removing it would make the plain-data design unusable by the sites it was designed for.

---

# Rank 26 — `SiteIndexes`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ [K in keyof A["content"]]: ContentIndex<…> } & { readonly site: SiteResolver }`

**Provenance.** Engine-internal (`9b121511`, the typed-reads pass). **Zero** named importers, but it is the
return of `createSiteIndexes`, which is imported by 12 files across all six consumers.

**Anonymous-consumer case.** Every family site keeps its indexes in a `chassis/content.ts` module and
re-exports them; a site that wants that module's export annotated, or that passes the whole index bundle into
a helper, needs the name. The mapped type carries the adapter's inferred frontmatter types through — the
entire value of the typed pass (`site-indexes.ts:25-29`).

**Verdict: keep.** Against: inference has been sufficient for six sites, and the type is unwritable by hand
anyway, so it is a name for something the compiler produces. It ranks here rather than lower because the
`site` key's reservation is a real engine rule a site must know about (`createSiteIndexes` throws on a concept
literally named `site`, `site-indexes.ts:48`).

---

# Rank 27 — `sitemapView`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(site, descriptors, origin, extraRoutes?) => SitemapUrl[]`

**Provenance.** Engine-internal (`11236daf`), extended by the 907.life harvest (`278035eb`, the `extraRoutes`
argument). Two adopters: 907-life and aksailingclub-org (4 files). Its migration status is tracked:
*"ecxc-ski's migration is CANDIDATE: its `main` hand-builds `sitemap.xml` directly"*
(`docs/internal/pre-beta-harvest.md:410`).

**Anonymous-consumer case.** A site's sitemap must list exactly the routable concepts and no others. That
membership is engine-owned — `descriptor.routing.routable` — and getting it wrong hands crawlers 404s, the
failure the resolver guards against in the same words: *"listing an entry that refuses to resolve hands a
crawler a 404"* (`src/lib/delivery/site-resolver.ts:30`). Arm A.

**Verdict: keep.** The instructive contrast with rank 4: same module, same authors, same commit lineage —
`sitemapView` was adopted twice and `feedView` zero times, because a sitemap wants exactly the summary-only
projection a feed does not. That asymmetry is the evidence that `feedView`'s form is wrong and this one's is
right, not that pure views are wrong in general.

---

# Rank 28 — `newlyPublishedEntries`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(before: Manifest | null, after: Manifest) => ManifestEntry[]`

**Provenance.** **Family-originated from a filed requirement, and it shipped ahead of its consumer.**
`1c709fdd feat(delivery): add newlyPublishedEntries manifest-diff helper` (2026-08-01), from the xcathletes
consumer brief. The harvest doc names the gap outright: *"`publishedAt` + `newlyPublishedEntries` (0.93.0):
the consuming trigger is xcathletes pass 3 (announce-on-first-publish). The consumer-owned half of the
division of labor … is unbuilt and undesigned"* (`docs/internal/engine-harvest-candidates.md:67`). That is
now closed: xcathletes-org's `src/lib/server/broadcast/sweep.ts` uses it live (line 145).

**Anonymous-consumer case.** Any site wanting to announce a post when it first goes live — an email digest,
a webhook, a social post. "First publish" is not derivable from the corpus: it depends on the `publishedAt`
stamp the engine writes once at the publish commit, on `upsertEntry`'s preservation rules, and on the
concept+id identity key. The doc block spells out why a naive stamp check is wrong: *"a drafted entry CAN
carry a stamp forward … so the draft check below is what actually excludes a currently unpublished entry
rather than the stamp check alone"* (`src/lib/delivery/manifest.ts:44`). Arm A, unambiguously — a site
cannot reproduce this without the stamping semantics.

**Verdict: keep.** The purity is right too: no clock, no network, the consumer fans out. Against: the
provenance is a filed family requirement rather than a discovered anonymous need, and the input door leaks —
its one real consumer casts `JSON.parse(...) as Manifest` rather than using `parseManifest`
(`sweep.ts:144`). The right follow-up is to let this function accept raw text and validate at its own
boundary, which would retire the leak without retiring rank 15. Membership is not in doubt.

---

# Rank 29 — `buildFragmentResolver`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(site: SiteResolver) => FragmentResolve`

**Provenance.** Engine-internal, from the fragments/include work (`34c71d37 feat(delivery): the build-time
fragment resolver and public wiring`, 2026-07-15). Two importers: aksailingclub-org and cairn-pub.

**Anonymous-consumer case.** Any site using `::include` must resolve a fragment id to raw markdown at build,
and the resolution depends on two engine-owned facts a site cannot see: the reserved fragments concept id
(`FRAGMENTS_CONCEPT_ID`, `site-resolver.ts:207`) and the build-versus-preview split, where a build must throw
and a preview must mark (*"A miss … throws, so a dangling `::include` fails the prerender the same way a
dangling `cairn:` link does. The preview uses a manifest-backed resolver"*, `site-resolver.ts:200`). Arm A.

**Verdict: keep.** Fewer adopters than its `buildLinkResolver` sibling only because fewer sites use
fragments; the case is identical in kind. Against: a site not using fragments still resolves the symbol,
which is a bundling cost of the barrel, not of the export.

---

# Rank 30 — `ResolvedReference`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ id; concept; title; permalink; summary? }`

**Provenance.** Engine-internal (`464c1477 feat(delivery): resolve references to their target identity at the
site-resolver layer`, 2026-06-26), proven in the showcase the same week (`6846151e`). Six importing files
across three consumers (showcase, cairn-pub, xcathletes-org).

**Anonymous-consumer case.** A site rendering an author card, a related-entry list, or a linked series needs
to hold the resolved edge in a typed component prop — which is exactly what the showcase's
`ArticleView.svelte:19` does. The shape is engine policy: it reuses the target's own summary fields *"so a
linked author card reads the same title and permalink the target's own page does"* (`site-resolver.ts:124`).

**Verdict: keep.** Return type of a well-adopted function, crossing a component boundary in three
independent sites — the strongest demonstrated need of any type in this bucket below the read model itself.

---

# Rank 31 — `resolveReferences`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(site, descriptor, frontmatter) => Record<string, ResolvedReference | ResolvedReference[]>`

**Provenance.** Engine-internal (`464c1477`, 2026-06-26). Survived the 2026-07-01 prune. Three importers
across three consumers.

**Anonymous-consumer case.** Arm A at its clearest, stated in the source: *"only the cross-concept resolver
reaches a different concept's entries: a posts entry's `author` edge targets a pages entry, which the posts
index alone cannot read"* (`site-resolver.ts:151`). A site cannot resolve a typed reference field from its
own concept index, full stop. It also encodes the drop-rather-than-throw rule for a mid-flight target,
which depends on the build's `verifyReferences` gate existing — knowledge no site has.

**Verdict: keep.** Against: it takes a `ConceptDescriptor`, forcing every caller to also import
`siteDescriptors` and find the right descriptor by hand — the showcase, cairn-pub, and xcathletes-org all
import the pair together. That is a genuine ergonomic wart worth a future signature that takes the entry's
concept id instead. Membership is not in question, so it is recorded here rather than raised to a reshape.

---

# Rank 32 — `SitemapUrl`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ loc: string; lastmod?: string }`

**Provenance.** Engine-internal, original surface (`19e73eee`, 2026-05-30). Five importing files across five
of the six consumers — the most-imported type in the sitemap family.

**Anonymous-consumer case.** Every site that hand-assembles any part of its sitemap (ecxc-ski, xcathletes-org,
cairn-pub, and the showcase all do) declares an array of these before passing it to `sitemapResponse`. It is
the argument type of a function all six call.

**Verdict: keep.** Two fields, no cleverness — but it is the contract between the site's own route list and
the engine's serializer, demonstrably named in five repos.

---

# Rank 33 — `jsonFeedResponse`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(channel, items) => Response`

**Provenance.** Engine-internal, original surface (`f71059b2`, 2026-05-30). Imported by **all six**
consumers, one route each.

**Anonymous-consumer case.** A site's `feed.json/+server.ts` is a single call. The engine holds the JSON Feed
1.1 document and the `application/feed+json; charset=utf-8` content type — the detail the module says sites
otherwise get wrong (`responses.ts:3`). Arm B.

**Verdict: keep.** Universal adoption across six independent wirings. Against: it is a three-line wrapper,
and if the builder/responder doubling were ever collapsed, the choice of which half survives should be made
once for all five, not per member.

---

# Rank 34 — `sitemapResponse`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(urls: SitemapUrl[]) => Response`

**Provenance.** Same commit lineage as rank 33. Imported by **all six** consumers.

**Anonymous-consumer case.** Identical in kind: `sitemap.xml/+server.ts` is one call, and
`application/xml; charset=utf-8` is the detail a site gets wrong. Slightly stronger than rank 33 because the
XML content type has a common wrong answer (`text/xml`) that some crawlers treat differently.

**Verdict: keep.** Same reasoning and same caveat as rank 33.

---

# Rank 35 — `robotsResponse`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(opts: { sitemapUrl; disallow?; posture? }) => Response`

**Provenance.** Same lineage, extended by the AI-posture pass (`f68ca468`). Imported by **all six**
consumers, and it is the path by which xcathletes-org's declared `aiPosture: 'decline'` reaches the wire.

**Anonymous-consumer case.** Same one-call route, plus it is the *only* public path to the posture behavior
that any consumer actually uses. `text/plain; charset=utf-8` on robots.txt is not optional for some crawlers.

**Verdict: keep.** Ranked above its sitemap and JSON siblings because it carries the posture arm and because
a wrong robots.txt content type is the one failure in this family with a search-visibility cost.

---

# Rank 36 — `rssResponse`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(channel, items) => Response`

**Provenance.** Same lineage. Imported by **all six** consumers.

**Anonymous-consumer case.** Strongest of the five responders: it wraps the document with the most ways to be
wrong (rank 20's RFC-822, CDATA, and escaping floors) behind
`application/rss+xml; charset=utf-8`, which readers are strict about. A site's `feed.xml/+server.ts` reduces
to one call over its own item list.

**Verdict: keep.** Universal adoption, a ratified grammar, and a correctness floor underneath it.

---

# Rank 37 — `buildSeoMeta`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(input: SeoInput) => SeoMeta`

**Provenance.** Engine-internal, original surface (`4ec525b4`, 2026-05-30). Twelve importing files across
aksailingclub-org and cairn-pub — the sites with the most bespoke, non-catch-all pages.

**Anonymous-consumer case.** Any site with pages the catch-all loader does not serve (a tag index, an events
list, a docs front door) must emit the same OpenGraph, Twitter-card, canonical, feed-autodiscovery, and
schema.org head those entry pages get, or its social previews disagree page to page. Arm B: the tag
vocabulary is ratified elsewhere and the engine has already committed to a particular correct subset —
including the `summary_large_image`-vs-`summary` switch keyed on whether an image exists
(`src/lib/delivery/seo.ts:42`) and the article-only `article:*` gating (line 55).

**Verdict: keep.** Twelve real call sites in two independent sites, doing exactly the thing the export
exists for. The self-imposed scope line is also right and worth preserving: *"It covers the universal,
mechanical tags; og:image art and richer JSON-LD types stay a template or plugin concern"* (`seo.ts:2`) —
that is the charter's leanness applied inside a single function.

---

# Rank 38 — `siteDescriptors`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(adapter: CairnAdapter, siteConfig: SiteConfig) => ConceptDescriptor[]`

**Provenance.** Engine-internal, an early convenience (`d09765b0 feat(delivery): add the siteDescriptors
one-liner`). Six importing files across **five** consumers (907-life, aksailingclub-org, xcathletes-org,
cairn-pub, showcase).

**Anonymous-consumer case.** Three public functions take `ConceptDescriptor[]` — `sitemapView`, `feedView`,
`resolveReferences` — and this is the only legal way to obtain one. Normalization is engine-owned:
*"this delegates to the shared normalizeConcepts so the pairing is one path, not tribal knowledge"*
(`src/lib/delivery/site-descriptors.ts:2`). A site hand-building descriptors would diverge from what the
admin runtime uses, which is the exact drift this exists to prevent. Arm A.

**Verdict: keep.** Strong adoption and a hard requirement of three other kept exports. Against, and it
should be fixed: the `siteConfig` parameter is dead — `void siteConfig; return normalizeConcepts(adapter.content);`
(`site-descriptors.ts:14`), retained *"for API stability"*. Under the standing ruling that migration cost
never discounts a verdict and churn is free until beta, that parameter should be dropped rather than
preserved. Membership is right; the vestigial argument is a small shape defect to clear at the next
breaking window.

---

# Rank 39 — `CairnHead`

**surfacedAt:** `/delivery/head` · signature `Component<$$ComponentProps, {}, "">`

**Provenance.** Engine-internal at birth (`b94a91d9 feat(delivery): add jsonLdScript and the CairnHead
component`), then **reshaped by a measured family divergence**: `86f4f83a feat(delivery): give CairnHead an
optional title-suffix template` — *"Every owned site hand-builds its own title-suffix convention at each
CairnHead call site with no shared affordance for it."* Twenty-one importing files across **all six**
consumers.

**Anonymous-consumer case.** Every cairn site has a `<head>`, and this is the one place the engine's
plain-data `SeoMeta` becomes markup. The parts that are not trivial: the `name`-vs-`property` branch per
meta tag, the escaped JSON-LD injection (rank 9's recorded U+2028 defect), the `title={false}` escape so a
site can own `<title>`, and the `markdownUrl` alternate link that must be omitted for an entry with no
twin. The title-suffix convention arrived through Arm B's spirit — a grammar every site had already
diverged into, measured and then absorbed.

**Verdict: keep.** Against: the component is thirty lines of template and a site could write it, and the
`titleTemplate` API forces an awkward no-op at one call site
(`aksailingclub-org/src/routes/(site)/+page.svelte:97`, `titleTemplate={(title) => title}` used purely to
suppress the suffix). That is a small shape wart — a `titleSuffix?: string` would read better than a
callback for the 90% case — but the membership is beyond doubt: it is the single component on this whole
subsystem, deliberately isolated onto `/delivery/head` so the data half stays node-safe (`head.ts:1`), and
all six consumers mount it.

---

# Rank 40 — `FeedItem`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ title; url; date?; updated?; summary; contentHtml?; tags? }`

**Provenance.** Engine-internal, original surface (`f71059b2`, 2026-05-30). **Twelve importing files across
all six consumers** — the most widely imported type in this bucket after `ContentSummary`.

**Anonymous-consumer case.** It is the target shape of the one module every family site writes by hand:
*"the one place that maps [the site's] posts index into cairn-cms/delivery's FeedItem shape, shared by the
RSS and JSON Feed routes"* — the same sentence in six repos. Whatever the verdict on `feedView`, this type is
the contract that lets a site's own mapping feed both serializers, and it is the reason the `feedView`
rejection was survivable rather than fatal.

**Verdict: keep.** The clearest demonstrated need of any type here: six independent sites, none prompted by
the others' code, all naming it. Its `contentHtml` field is also the seam that makes a full-content feed
possible at all.

---

# Rank 41 — `PublicRoutesConfig`

**surfacedAt:** `/delivery` · signature `{ site; render; origin; siteName; description; feeds?; defaultImage?; resolveMedia?; assetsEnabled? }`

**Provenance.** Engine-internal, from the dated-slug design (`public-routes.ts:21`). Six importing files
across three consumers (aksailingclub-org, xcathletes-org, showcase), each in a chassis module that builds
the config once and shares it.

**Anonymous-consumer case.** `composeEntryData(config, …)` takes it by name, so any site using the
composition path must name it. More commonly, a site factors the config into `chassis/public-routes.ts`
(the showcase's own file, line 7) so the catch-all route, the markdown twin route, and any preview path
share one definition — three routes, one config, one annotation.

**Verdict: keep.** Parameter type of two public functions with realized consumers. Against: `assetsEnabled`
is a diagnostic-only field that changes no behavior (*"It does not change resolution; `resolveMedia` alone
still gates the hero projection"*, `public-routes.ts:47`) and is undocumented on the reference page's
interface block — a small documentation drift worth closing, not a membership problem.

---

# Rank 42 — `EntryData`

**surfacedAt:** `/delivery` · signature `{ concept; entry; html; canonicalUrl; seo; newer?; older?; heroImage? }`

**Provenance.** Engine-internal, the catch-all loader's payload (`public-routes.ts:53`). Seven importing
files across aksailingclub-org, xcathletes-org, and the showcase — every one of them a `.svelte` component
typing the data it received.

**Anonymous-consumer case.** The catch-all route returns this and the page component renders it; typing that
prop is unavoidable. Its fields are all engine-derived and none reproducible site-side: the rendered html
(through the site's own renderer but with the engine's link, fragment, and media resolvers wired), the
composed SEO, the adjacent pair from the concept's own ordering, and the hero projection off the `media:`
token with the canonical token deliberately left intact (*"`entry.frontmatter.image.src` stays the `media:`
token"*, `public-routes.ts:66`). Arm A.

**Verdict: keep.** The payload contract of the single most-used export in the subsystem. Nothing about it
is optional.

---

# Rank 43 — `buildLinkResolver`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `(site: SiteResolver) => LinkResolve`

**Provenance.** Engine-internal, from the dated-slug design (`site-resolver.ts:5`). **Nine importing files
across all six consumers.**

**Anonymous-consumer case.** Arm A with no wiggle room: `cairn:<concept>/<id>` is a grammar cairn invented,
and resolving it requires the cross-concept union plus the routability rule — *"A ref whose target concept
is non-routable (a fragment) is treated as a miss too: a fragment is included, never linked, and its gated
permalink would 404"* (`site-resolver.ts:188`). The throw-on-miss behavior is also load-bearing: it is the
build backstop that turns a dangling link into a failed prerender instead of a broken production page. A
site cannot approximate this; it would either ship dead links or fail on fragments.

**Verdict: keep.** Universal adoption, an engine-invented grammar, and a build-integrity guarantee behind
it. One of the two or three least arguable items in the bucket.

---

# Rank 44 — `ContentIndex`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ all; byId; byTag; allTags; adjacent; problems }`

**Provenance.** Engine-internal, the original per-concept index (`352450c6`). Ten importing files across
aksailingclub-org and xcathletes-org — the two sites with the most bespoke content surfaces.

**Anonymous-consumer case.** Any site passing one concept's index into a helper (an archive builder, a tag
page, a related-posts function) names this type. Its members encode engine policy a site cannot re-derive:
`all()`'s draft filtering and per-concept ordering (dated newest-first, undated by title,
`content-index.ts:140`), `byTag`'s reliance on the taxonomy-marked field rather than a `tags` convention,
and `adjacent`'s neighbor rule. Arm A.

**Verdict: keep.** Ten real call sites, and it is the element type of `SiteIndexes`. Against: `problems()`
is near-dead (rank 8), which is the one member that could be trimmed at a breaking window.

---

# Rank 45 — `ContentEntry`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `ContentSummary & { frontmatter: F; body: string }`

**Provenance.** Engine-internal (`352450c6`), made generic deliberately ahead of the typed-reads pass:
*"Generic now so that change does not break this signature"* (`content-index.ts:57`). Seven importing files
across aksailingclub-org and xcathletes-org.

**Anonymous-consumer case.** `SiteResolver.byPermalink` returns it, `composeEntryData` takes it, and
`EntryData.entry` carries it, so any site touching the detail view names it. The `frontmatter` it carries is
the validator's normalized output, not raw YAML — a distinction the index enforces (*"A failure is also
excluded from the typed read, so every readable entry's frontmatter is the validator's normalized output"*,
`content-index.ts:110`) and a site cannot reproduce without the validator.

**Verdict: keep.** Load-bearing across three public functions and two consumers' component trees.

---

# Rank 46 — `SiteResolver`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ byPermalink; adjacent; entries; concept; all; routable }`

**Provenance.** Engine-internal, the dated-slug design's centerpiece (`site-resolver.ts:1`). One named import
(cairn-pub) but structurally universal: it is `PublicRoutesConfig.site`, the argument to `buildLinkResolver`,
`buildFragmentResolver`, `feedView`, and `sitemapView`, and the `site` key of every `SiteIndexes` all six
consumers build.

**Anonymous-consumer case.** Arm A at the top of its range. The permalink union, the duplicate-permalink
build failure (`site-resolver.ts:87`), and the routable gate applied consistently to `byPermalink`,
`entries()`, and `all()` are engine policy with a stated safety rationale: *"a non-routable concept's entries
here would advertise permalinks that byPermalink refuses and the build never prerenders, handing crawlers a
list of 404s"* (line 111). No site can construct this — `createSiteResolver` was deliberately demoted to
internal in the 2026-07-01 prune, so `createSiteIndexes` is the only door.

**Verdict: keep.** The type every other kept export in this subsystem funnels through. Its low direct-import
count reflects that sites receive it rather than declare it, which is the correct shape.

---

# Rank 47 — `ContentSummary`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `{ concept; id; slug; permalink; title; date?; updated?; tags; excerpt; wordCount; draft; fields }`

**Provenance.** Engine-internal, the original read model (`352450c6`). **Twenty-one importing files across all
six consumers** — the most-imported name in the bucket.

**Anonymous-consumer case.** Every list, card, archive, tag page, and feed mapping in every cairn site holds
one of these. Its fields are engine derivations no site can restate: the permalink from the concept's URL
policy, the excerpt from the engine's own rule, the `wordCount`, the `draft` flag, and the normalized `tags`
whose semantics are explicitly *not* `frontmatter.tags` — *"It differs on purpose from the validated
`frontmatter.tags`, which the validator omits when empty … Read `tags` here for a list; read
`frontmatter.tags` only when you need the validated, possibly-absent value"* (`content-index.ts:35`). A site
reading frontmatter directly gets a different answer. Arm A.

**Verdict: keep.** The single most-demonstrated export in this bucket. The `fields` escape hatch, keyed off
`summaryFields` and held in a separate record so a nominated key cannot collide with a typed one
(`content-index.ts:45`), is also exactly the "leanest seam over a general feature" the charter asks for.

---

# Rank 48 — `createSiteIndexes`

**surfacedAt:** `/delivery`, `/delivery/data` · signature `<const A extends CairnAdapter>(adapter, config, globs, opts?) => SiteIndexes<A>`

**Provenance.** Engine-internal (`9b121511 feat(delivery): full-auto typed reads with createSiteIndexes`),
hardened after real misuse (`2e73fe6c feat(delivery): guard a missing or reserved-key glob at build`).
**Twelve importing files across all six consumers** — every cairn site calls it exactly once.

**Anonymous-consumer case.** It is the only legal door from a site's markdown files to a queryable, typed
corpus. Everything behind it is unreachable by design: `createContentIndex`, `createSiteResolver`,
`fromGlob`, and `RawFile` were all demoted to internal in the 2026-07-01 prune. It also carries the one
constraint Vite imposes that the engine cannot work around, stated honestly rather than hidden:
*"Vite needs the literal glob at the call site, so the engine cannot glob on the site's behalf"*
(`site-indexes.ts:33`). Arm A absolutely.

**Verdict: keep.** Universal, unavoidable, and correctly shaped — including the two build-time guards that
turn a silent empty concept and a reserved `site` key into clear errors (`site-indexes.ts:48-58`), each of
which was a real failure someone hit.

---

# Rank 49 — `createPublicRoutes`

**surfacedAt:** `/delivery` · signature `(deps: PublicRoutesConfig) => { entryLoad; entries; markdownEntries; markdownLoad }`

**Provenance.** Engine-internal, the dated-slug design (`public-routes.ts:1`), extended by the markdown twin
(`6616e072`, 2026-08-05). **Twenty-six importing files across all six consumers** — the most-imported symbol
in the bucket, and the reason `/delivery` exists as a subpath separate from `/delivery/data`.

**Anonymous-consumer case.** A cairn site's public pages are one catch-all route, and this is that route.
It composes permalink resolution, prerender enumeration, the full SEO head, the hero projection, the
adjacent pair, and the raw-markdown twin — every one of which is engine-owned. The twin arm additionally
carries a security property a site would not think to enforce: the `noindex` refusal is duplicated in both
the enumerator and the loader deliberately, *"so the loader and the enumerator agree whether or not the
site's route is prerendered"* (`docs/reference/delivery.md`), and the whole surface reads only through the
injected resolver so *"no cairn/* branch content can reach the route"* (`6616e072`). A site hand-rolling
this ships either a disclosure bug or a set of 404s.

**Verdict: keep.** The strongest anonymous-consumer case in the subsystem by every measure: universal
adoption, engine-owned composition end to end, and a documented failure mode for the hand-roll that is a
security defect rather than a cosmetic one.

---

# Surface-level observations (evenness and coherence)

These are properties of the whole bucket, not per-item verdicts.

1. **The builder/responder doubling.** Four documents (RSS, JSON Feed, sitemap, robots) ship as eight
   exports, plus `markdownResponse` with no builder — nine exports for five documents. **Zero** of six
   consumers has ever imported an unwrapped builder. The doubling is defensible under `/delivery/data`'s
   node-safe charter (a plain-Node generator writes a file, it does not build a `Response`), and it is
   internally even *except* for `markdownResponse`, the one responder with no builder twin. If the family is
   ever collapsed, collapse it once for all five; picking members off individually would make the surface
   less even, not more.

2. **`AI_CRAWLERS` public, `CONTENT_SIGNAL` internal.** Same module, same two in-engine consumers, adjacent
   imports in `src/lib/doctor/check-posture.ts:15-16`, opposite visibility. Nothing justifies the split.
   Ranks 1-3 resolve it toward the internal side, matching the sibling.

3. **`feedView` rejected six times, `sitemapView` adopted twice.** The same module, the same shape of
   function. The difference is that a sitemap genuinely wants summary-only projection and a feed does not.
   This is the bucket's clearest instance of the standard's third constraint — accepted functionality must be
   re-derived in the form easiest for any site, not shipped in the form that happened to be convenient.

4. **Two vestigial parameters.** `siteDescriptors`'s `siteConfig` is explicitly dead (`void siteConfig;`) and
   retained "for API stability"; `PublicRoutesConfig.assetsEnabled` changes no behavior and is absent from
   the reference page's interface block. Both are cheap to clear while churn is free, and the standing ruling
   says stability is not a reason to keep a wrong shape before beta.

5. **The `resolveReferences` / `siteDescriptors` pairing.** Three consumers import the two together because
   `resolveReferences` takes a `ConceptDescriptor` the caller must find by hand. A signature taking the
   concept id would let two of those imports become one.

6. **Provenance summary.** Nothing in this bucket has a consumer outside the family. Four items are
   family-originated in the strict sense used here (a filed requirement or a named site's hand-roll drove
   them): `newlyPublishedEntries` and `unlistedRoutes` from filed site work, `AI_CRAWLERS` /
   `AI_CRAWLERS_REVIEWED` / `AiCrawler` from a commissioned research doc with no site requirement at all, and
   `CairnHead`'s `titleTemplate` reshape from a measured four-site divergence. The remainder are
   engine-internal, born with the delivery design.
