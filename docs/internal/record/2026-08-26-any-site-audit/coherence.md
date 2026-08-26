# Whole-surface coherence read

Repo: `/home/glw907/Projects/cairn-cms` @ `main`, 2026-08-26. Inputs: all ten `rank-*.md` files
(~490 audited items across 18 export subpaths, plus the 74-event log vocabulary),
`second-vantage.md`, `agent-standard.txt`. Claims about the code below were re-verified against
the tree rather than taken from the rankings.

The standing goal being judged: **the engine stays clean, even, beautiful, and broadly useful.**
Membership and shape are per-item tests and the ten rankings did them. Evenness and coherence are
properties of the whole surface, and that is the only altitude at which the findings below are
visible. Nothing here re-argues a membership verdict.

---

## Verdict up front

**cairn does not yet read as one designed engine. It reads as five well-designed subsystems and
three mechanically generated ones, published through a subpath map built on two incompatible
axes.**

The good news is unusually good, and it should be said first because it constrains the fix. cairn
has a **written, ratified naming grammar** — the C2 breaking-window R1 ruling
(`docs/superpowers/plans/2026-08-02-c2-breaking-window.md:110-129`) — covering factory verbs,
parameter bags, factory returns, `Load`/`Action` suffixes, and `Plan`/`Result` suffixes. Most
engines this size have no such document. Two of its clauses are honored almost perfectly
(`Load`/`Action`; `Plan`/`Result`). Two are not honored at all.

So the coherence problem is not that cairn lacks taste. It is that **the surface has three
authorities and they disagree**: the ratified R1 grammar, the R4 export-closure doctrine, and
per-subsystem local convention. Where R1 governs, the surface is even. Where R4 governs, the
surface is mechanical and over-large. Where neither governs — every non-factory function name,
every failure type, every result shape, every canonical home — each subsystem answered on its own,
and the answers do not match.

Six findings are structural. Eight are cosmetic. The four flagged collisions are **all drift**,
and all four are the same drift.

---

## The four flagged collisions, adjudicated

`EmailAttachment`, `NavLayoutEngineRef`, `NavLayoutEntry`, `SlotDef` each ship "two differing
signatures across subpaths." Two independent auditors reached the same conclusion and I confirm
it: **there is exactly one declaration of each**, and the differing signature is the extractor
expanding aliases to different depths, or rendering a union's members in a different order, at
different barrels.

| Name | Sole declaration | Published from | Deliberate layering? |
|---|---|---|---|
| `EmailAttachment` | `src/lib/auth/types.ts:31` | `.`, `/sveltekit` | **No — drift** |
| `NavLayoutEntry` | `src/lib/sveltekit/admin-nav.ts:53` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | **No — drift** |
| `NavLayoutEngineRef` | `src/lib/sveltekit/admin-nav.ts:116` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | **No — drift** |
| `SlotDef` | `src/lib/render/registry.ts:17` | `.`, `/delivery`, `/delivery/data`, `/render`, `/sveltekit` | **No — drift** |

Deliberate layering would look like a narrow public type at one subpath and a wider engine-facing
type at another, with the relationship documented. Nothing like that exists here. What exists is
one type re-exported from wherever the R4 closure walked into it, barrel by barrel, with no rule
naming which subpath owns it.

**The four flags are not four defects. They are the four cases where an audit tool happened to
notice a property that ~40 other types share.** `VariantSpec`, `MediaRef`, `MediaResolve`, and
`ComponentContext` are each published from **five** subpaths; the fifteen `FieldDescriptor` arms,
`BehaviorTable`, `FieldBehavior`, `TidyConfig`, `TidyConventions`, `RoutingRule`, `DatePrefix`,
`ValidationIssue`, `ValidationResult`, `NavLayout`, `NavLayoutSection`, `ComponentDef`,
`ComponentRegistry` and more are each published from four. The collision flags are the visible tip
of finding **C1**.

---

# Structural findings

## C1 — One type, four importable names, no canonical-home rule

**What no per-export argument can see.** Every ranking judged multi-publication as a per-item
"placement wart" and declined to charge it: `AuthBranding` (reshape: root duplicate),
`SlotDef`/`MediaEntry`/`EmailAttachment` (reshape: "publish it once"), `glyph`'s split placement
("the surface currently teaches a rule it does not follow"), `UploadResult` at `/sveltekit` while
its own body's `MediaEntry` lives at `/media`. Five auditors each found one instance and each
correctly declined to make it that item's problem.

At the whole-surface altitude it is one problem with roughly forty instances. A developer holding
`NavLayoutEntry` has four import statements available and no way to learn which is intended; the
reference pages do not say, because there is nothing to say. Worse, the type's rendered signature
differs by barrel, so two files in one repo importing the same type from two subpaths can produce
diffs that look like a version skew.

The engine has a precedent for the fix and quotes it in one place only —
`ResolvedReference`, "the root re-export is a straight duplicate … keep it exported only from
`/delivery`, its resolver's home." That is a rule wearing a single item's clothes.

**Why it happened.** The R4 export-rule closure ("every type named in a public signature is
exported from a subpath the consumer already imports") was executed independently per barrel.
Every barrel that names a type closes over it, so a type named in four barrels' signatures is
published four times. The rule is right; its scoping unit is wrong.

**Recommendation.** Ratify a canonical-home rule as an R1-tier clause: **every type has exactly
one declaring subpath; other barrels that need it document where to import it from rather than
re-export it.** Then re-run the closure against that rule. Enforce it in `check:surface` — a name
appearing in two barrels' export lists fails the gate. The four collision flags then resolve as a
side effect, and so do the ~40 unflagged siblings. Do this before the retire/reshape work, not
after: it changes which subpath each surviving item is published from, so doing it second means
touching every reshaped item twice.

## C2 — Nine sibling factories, four different parameter-bag conventions, against the engine's own ratified rule

R1 ratified: *"`*Config` is the factory's primary bag; `*Options` is a secondary or per-call bag;
`*Deps` is retired. Every exported factory's bag has a name."* Measured against the tree:

| Factory | Bag type name | Parameter identifier |
|---|---|---|
| `createAuthChannel` | `AuthChannelConfig` | `config` |
| `createAuthRoutes` | `AuthRoutesConfig` | `config` |
| `createSectionAction` | `SectionActionConfig` | `config` |
| `createPublicRoutes` | `PublicRoutesConfig` | **`deps`** |
| `createCairnAdmin` | **`CairnAdminOptions`** | **`deps`** |
| `createContentRoutes` | **`ContentRoutesOptions`** | **`deps`** |
| `createEditorRoutes` | **`EditorRoutesOptions`** | `opts` |
| `createAuthGuard` | `AuthGuardOptions` (secondary — correct) | `opts` |
| `cairnManifest` | **`CairnManifestOptions`** (sole bag) | `opts` |

Four combinations for one job. The two violations that matter most are `createCairnAdmin` and
`createContentRoutes` — the recommended mount path and the factory carrying cairn's core content
job. And the retired `*Deps` concept survives as the parameter identifier on three of them, so a
developer reading `createCairnAdmin(runtime, deps)` in the reference meets a vocabulary the engine
retired.

No per-item ranking could reach this. Each ranking saw one or two bags and judged them
individually: `CairnAdminOptions` earned a keep on `"Injectable dependencies, grouped into the two
cohesive bags a site actually overrides"` — a fine sentence about a wrongly-suffixed type.

**Recommendation.** Apply R1 as written: rename `CairnAdminOptions` → `CairnAdminConfig`,
`ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` → `EditorRoutesConfig`,
`CairnManifestOptions` → `CairnManifestConfig`; rename every `deps` parameter to `config`. Churn is
free before beta and this is exactly the class of change the pre-beta window exists for. Add the
rule to `check:surface` if the suffix can be derived from position; otherwise it rides the docs
gate.

## C3 — Two derivations for "name a factory's return", and the hand-written half can drift

R1 ratified *"Every `create*` factory's return type is named and exported."* The outcome is
honored everywhere. The **mechanism** was never ruled on, and the surface split:

- `ReturnType<typeof …>`: `ContentRoutes`, `PublicRoutes`
- hand-maintained interface duplicating the factory's actual return: `AuthRoutes`, `EditorRoutes`,
  `NavRoutes`, `CairnAdminRoutes`, `AuthChannel`

The route-factories ranking reached this per item four times (ranks 66, 69, 72, 78), each time
concluding "pick one idiom for all four factory returns and apply it to all four" — which is a
whole-surface recommendation four items were each too small to carry. `CairnAdminRoutes` is the
one that matters: it is the recommended path's type, and it is hand-maintained, so it can silently
disagree with what `createCairnAdmin` actually returns.

**Recommendation.** One derivation for all seven. `ReturnType<typeof f>` is the drift-proof choice
and is already used by the two largest. Where a narrower public view is wanted (which is exactly
`ContentRoutes`' case — see C10), declare the narrow type deliberately and have the factory's
signature return it, rather than hand-mirroring a wide one.

## C4 — Outside factory verbs there is no naming rule, and three triplets prove it

R1's four-verb system governs `define*` / `compose*` / `create*` / `build*`. That population is
about twenty exports. The **ungoverned** population — every reader, checker, resolver, and
transform on the public surface — is larger, and three separate jobs each carry three verbs:

**"Check a thing and complain":** `verifyManifest`, `verifyReferences`, `verifyTurnstile` ·
`validateNavLayout`, `validateReproFence` · `checkRateLimit`, `checkRateLimitKeys`. Three verbs,
no stated distinction, and the return shapes disagree too: `verify*` throws, `validateNavLayout`
returns `void` and throws, `validateReproFence` returns `{ issues: string[] }`, `check*` returns
`Promise<boolean>`.

**"Read a serialized artifact into a typed shape":** `parseSiteConfig`, `parseManifest`,
`parseMarkdown`, `parseMediaToken` · `readSeoFields`, `readCommittedManifest` · `extractMenu`,
`extractVocabulary`. All eight read one committed artifact and hand back typed data.
`extractMenu`/`extractVocabulary` and `readSeoFields` are the same operation on different files.

**"Turn a declaration into a live function":** `buildMediaResolver`, `buildLinkResolver`,
`buildFragmentResolver` sit under `build*`, which R1 defines as *"derives pure data"* — but a
resolver is a live handler, which R1 assigns to `create*`. Meanwhile `buildRssFeed`,
`buildSitemap`, `buildRobots`, `buildSeoMeta`, `buildJsonFeed`, `buildSiteManifest` genuinely do
derive pure data. `build*` is carrying two jobs.

The C2 pass renamed `makeMediaResolver` → `buildMediaResolver` to enforce the four-verb rule, and
a real consumer's migration is on record feeling that rename. That cost was paid to move one name
into a verb whose definition it does not satisfy.

**Recommendation.** Extend R1 past factory verbs before the freeze. Minimum: one verb per job for
the three triplets (I would take `verify*` for engine-owned integrity checks that throw,
`validate*` for checks that return issues, and retire `check*` in favor of the outcome reshape in
C6; `read*` for reading a committed artifact, retiring `extract*` and reserving `parse*` for a
string-to-structure codec). Then decide whether `build*` covers function factories or whether
those three resolvers belong under `create*`.

## C5 — Roughly fifteen public functions are named as bare nouns, and two exported constants are named the same way

A developer reading a cairn import list cannot tell a function from a value by its name.

Functions named as nouns: `siteDescriptors(adapter, config)`, `unlistedRoutes(ids, paths)`,
`newlyPublishedEntries(before, after)`, `feedView(...)`, `sitemapView(...)`, `mediaToken(ref)`,
`jsonLdScript(data)`, `cairnManifest(opts)`, `glyph(name, icons)`, `iconSpan(el)`,
`cardShell(classes, body)`, `headRow(title, icon, level)`, `itemNoun(n, label)`, `strAttr(ctx, key)`,
`roleHome(...)`, `ownerLevelRoles(...)`, `fieldset(...)`.

Exported values named the same way: `manifest` and `stories` (`/reproductions`), `fields`,
`AI_CRAWLERS`, `DEFAULT_ROLES`.

Each one reads fine alone — that is precisely why no ranking charged it. `feedView` reads as "the
feed view"; `siteDescriptors` reads as "the site's descriptors." Together they make the surface
unreadable at a glance, and they interact badly with C1: a name imported from four barrels that
also does not say whether it is callable is the worst case.

**Recommendation.** Not a mass rename — several of these are retiring anyway (`cardShell`,
`iconSpan`, `headRow`, `strAttr`, `feedView`'s reshape, `unlistedRoutes`' move to `cairn-audit`).
Fold the naming fix into the reshapes already ordered, and add a clause to R1: **an exported
function's name begins with a verb; an exported value's does not.** The survivors needing a rename
are then a short list: `siteDescriptors` → `describeSite`/`buildSiteDescriptors`,
`newlyPublishedEntries` → `diffNewlyPublished`, `mediaToken` → `formatMediaToken` (pairing it with
`parseMediaToken`, which the media ranking already argues must stay a matched codec),
`jsonLdScript` → `renderJsonLdScript`, `itemNoun` → `pluralizeItem`.

`mediaToken`/`parseMediaToken` is the sharpest instance: a codec whose two halves are named on
different systems, with the media ranking keeping the encoder specifically on the argument that
"shipping a decoder without its encoder leaves the public codec half-open." The pair is kept for
symmetry it does not have in its names.

## C6 — The engine knows how to shape an outcome and does it in one subsystem only

Five idioms for "what happened" coexist:

1. **Discriminated union** — `ChannelRequestResult`, `ChannelConfirmResult`, `ValidationResult`,
   `RequestResult`, `RevertFailure`.
2. **Bare boolean that erases a distinction** — `checkRateLimit`, `checkRateLimitKeys`,
   `verifyTurnstile`, `insertOwnerIfEmpty`, `removeOwnerIfNotLast`, `demoteOwnerIfNotLast`.
3. **`Partial<>` over an intersection** — `ContentFormFailure`.
4. **Throw** — `validateNavLayout`, `getStory`, `defineAccess`, `defineRoles`, `fieldset`.
5. **`null` / `undefined` sentinel** — `parseMediaToken`, `computeItemRange`, `resolveImageUrl`,
   and the ratified `LinkResolve`/`FragmentResolve`/`MediaResolve` two-mode contract.

Group 5's resolver convention is *good* and deliberate: "`undefined` is a preview miss; a resolver
that throws is the build backstop," stated once and applied to all three resolvers. Group 1 is
good. **Group 2 is the finding**, and the evidence is that the engine's own code refuses it twice:

- `createSectionAction` reimplements `checkRateLimit` rather than calling it, with the comment
  *"Mirrors checkRateLimit's own `result?.success === true` test"* — because the boolean collapses
  "binding absent" and "allowed" into one `true`, and the engine needed the third branch to emit
  `admin.action.rate_limit_absent`.
- `demoteOwnerIfNotLast` and `removeOwnerIfNotLast` return a boolean conflating "last owner" and
  "no match", and the reference page's answer is prose: *read the roster with `listEditors` first.*

Two rankings reached this independently and both called it a per-item reshape. It is one shape
decision applied inconsistently across three subsystems.

**Recommendation.** Ratify the outcome idiom the way `Plan`/`Result` was ratified: **an operation
with more than two distinguishable outcomes returns a discriminated result, never a boolean.**
Then the `/cloudflare` rate-limit reshape, the two `/auth-store` owner-guard warts, and the
`ContentFormFailure` flattening are one change with one rule behind them instead of four
negotiations. `verifyTurnstile` is the honest exception to argue: fail-closed boolean is defensible
for a security predicate, and that exception should be *stated* rather than left to look like the
same defect.

---

# Cosmetic findings

## C7 — Ten exported names for `{ error: string }`, and three suffixes for one concept

`/sveltekit` publishes `RenameFailure`, `CreateFailure`, `PreviewMintFailure`, `NavSaveFailure`,
`SettingsSaveFailure`, `VocabularySaveFailure`, `MediaUploadFailure`, `MediaUpdateFailure`,
`MediaReplaceFailure`, `MediaBulkFailure` — ten distinct public names whose bodies are identical.
Beside them sit `DeleteRefusal`, `MediaDeleteRefusal` (`Refusal`) and `BulkDeleteSkip` (`Skip`),
with no rule distinguishing a failure from a refusal from a skip. And `RevertFailure` carries the
same suffix while being a `reason` union rather than an error string.

R1 ratified `Plan` and `Result` suffixes and stopped there. The failure half of the same vocabulary
got no ruling and grew ten names by closure.

Most of these retire under the route-factories ranking. The cosmetic residue worth fixing is the
rule: **ratify `Failure` for the whole family, retire `Refusal` and `Skip`,** so the surviving
`ContentFormFailure` reshape lands on a named convention.

## C8 — `/auth-channel` re-derives none of the engine's established idioms

The auth-family ranking made this a membership-and-shape verdict on `createAuthChannel`. At the
whole-surface altitude it is a coherence finding independent of whether that factory survives,
because four of its divergences would persist through any reshape:

1. **A second auth grammar.** Editor login: magic-link, `AUTH_DB`, `cairn_session` cookies.
   Channel: code-OTP, its own binding, `cairn_channel_*` tables, its own cookie namespace. Neither
   derived from the other.
2. **A second way to ship a schema.** `AUTH_DB` gets packaged `.sql` migration files in the
   tarball (`package.json` `files` includes `"migrations"`). The channel gets
   `CHANNEL_SCHEMA_SQL`, a DDL template literal a site pastes into a file it writes. One library,
   two mechanisms for the same job, and the packaged one demonstrably works.
3. **A fourth request-event shape.** `AuthChannelEvent` sits beside `RequestEvent` and
   `CairnEvent` — and `CairnEvent`'s own doc comment says it *"replaces the five separately-declared
   event shapes cairn carried before the C2 breaking-window pass … three names for one shape was
   the original defect, and a fourth only compounded it."* A fourth then shipped, with its own
   header conceding a real kit `RequestEvent` satisfies it structurally.
4. **An internal asymmetry inside its own return.** `AuthChannel.revokeSessions` takes a raw
   `D1Database` while every other member takes an event and resolves the binding through
   `resolveDb`.

**Recommendation.** Whatever verdict the factory takes, fold (2) and (3) regardless: ship the
channel schema as a packaged migration directory beside `migrations/`, and name `CairnEvent` (or
SvelteKit's `RequestEvent`) in the callback signatures instead of publishing a parallel shape.

## C9 — Granularity tracks how the code was refactored, not what a consumer needs

Read across buckets, export size correlates with the engine's internal refactoring history rather
than with any consumer-facing unit:

- `/admin-toolkit` publishes `computeCountLine`, `computeAppliedFilters`, `computeItemRange`,
  `computePageWindow` — four pure helpers whose commits state the reason for the split outright:
  *"so the unit project can test them without a Svelte plugin."* All four have zero consumers. A
  fifth sibling in the same module, `computeFacetLabel`, was not exported, for no stated reason.
- The same barrel pair publishes `CairnMediaLibrary` (3,159 lines) and `MarkdownEditor` with ~20
  uncollapsed `EditPage` wiring props as single exports.
- `/render` publishes five markup micro-helpers (one of which, `isElement`, has a one-line body)
  while `/delivery` publishes `createPublicRoutes`, one function composing permalink resolution,
  prerender enumeration, SEO, hero projection, adjacency, and the markdown twin.
- `/auth-crypto` publishes three names for one function body (`generateToken`, `generateSessionId`,
  `generateCsrfToken`) while `/auth-channel` publishes a 965-line login subsystem as one factory.

The rule the surface currently follows is: *a testability split becomes a public name; a feature
cohesion does not.* Neither is a consumer-facing decision.

**Recommendation.** State the inverse as the rule — **an internal split for testability is not a
reason to export; export granularity follows the unit a consumer calls** — and apply it to the four
`compute*` helpers (already ordered for retirement) and to `MarkdownEditor`'s wiring props (a
reshape a 2026-07-01 audit already reached and only half-applied). The `/render` half resolves
through its own retires.

## C10 — The R4 closure is the largest single force on the surface, and the two buckets it dominates reached opposite dispositions

Route-factories: 48 retires, "almost entirely the R4 closure of the media-janitorial and per-action
failure vocabulary," with the summary observation *"The R4 nameability ruling is over-applied … it
was executed against `ReturnType<typeof createContentRoutes>`, a type that includes actions no site
drives."*

Adapter-concept-model: the C2_READDED block — twenty-two names each argued down on evidence in July
and restored by the same rule — is **kept in full**, explicitly on evenness grounds: *"Pulling
`TextField` while keeping `SelectField` … reintroduces exactly the leak the gate now forbids."*
Exactly one of the twenty-two (`ManifestEntry`) has since acquired a real importer.

Two auditors, one doctrine, opposite dispositions. Both are right locally, and the whole-surface
reading reconciles them: **the closure should follow a deliberately narrowed public type, not a
mechanically derived one.** `FieldDescriptor` is a union a consumer genuinely writes, so closing
over its arms is correct and all fifteen stay. `ContentRoutes` is `ReturnType<typeof
createContentRoutes>` including thirty action keys no site drives, so closing over it is wrong and
~30 leaves fall out when it narrows. The rule survives; its input changes.

**Recommendation.** Sequence it explicitly: narrow `ContentRoutes` first (C3's "declare the narrow
return deliberately"), then let the closure re-derive. Do not repeal R4 — the adapter bucket's
evenness argument is correct, and repealing it re-opens the leak.

## C11 — The subpath map is built on two incompatible axes

Eighteen export subpaths, split by two different principles:

- **Dependency-graph axis (good, and consistently reasoned):** `/delivery` vs `/delivery/data` vs
  `/delivery/head` (node-safe vs kit vs Svelte); `/reproductions` vs `/reproductions/manifest`
  (node-safe manifest vs Svelte stories, with two tests holding the line); `/media` (no kit, no
  workers-types); `/islands` (client runtime); `/ambient` (empty at runtime).
- **Audience axis:** `/components` vs `/admin-toolkit` vs `/render` — all Svelte-or-hast, all admin
  or authoring, split by who the reader is.

Both axes are defensible. Having both means a developer cannot predict which subpath holds a name,
and the surface produces exactly the anomalies the rankings flagged one at a time: `glyph` on `.`
while its five hast siblings are on `/render`; `UploadResult` on `/sveltekit` while `MediaEntry` in
its own body is on `/media`; `createMediaRoute` on `/sveltekit` rather than `/media` (this one *is*
reasoned — it reads `platform.env`, which is the dependency axis correctly applied).

There is also a live consequence: the `/render` ranking retires four of that subpath's five value
exports and reshapes the fifth onto `ComponentContext`, leaving `/render` publishing two types that
are already published from `.` and `/delivery`. **After its own ordered retires, `/render` has no
reason to exist as a subpath** — and under C1 its two survivors get a canonical home elsewhere.

**Recommendation.** Ratify the dependency-graph axis as the *only* reason to split a subpath, and
treat audience as a docs-arm concern (which cairn already does well — four audience tracks under
`docs/`). Then: fold `/render` into `.` or `/delivery` after its retires; re-home `UploadResult` to
`/media`; and record `glyph`'s placement as a deliberate exception or move it. Eighteen subpaths is
a lot for an engine whose charter word is "lean," and the audience-axis three are where the
redundancy is.

## C12 — Within-module visibility splits with no stated rule

Three instances, found by three different auditors, all in the same shape: two symbols in one
module, one public and one not, no rule.

- `AI_CRAWLERS` is public; `CONTENT_SIGNAL`, same module, same two in-engine consumers, adjacent
  imports at `src/lib/doctor/check-posture.ts:15-16`, is documented as *"Internal, and deliberately
  the one definition."* Nothing justifies the split.
- Four of five pure helpers in `list-toolbar.ts`/`pagination-window.ts` are public;
  `computeFacetLabel` is not.
- `cookieName` is public while `sessionCookieName`/`csrfCookieName` are internal — and this one **is
  reasoned**, with the barrel stating why (*"colliding with them is the two-stores blur the
  `cairn_` namespace reservation warns against"*). It is the model the other two should follow.

**Recommendation.** Each barrel already carries a membership comment; require that an internal
sibling of a public export gets one sentence naming why. Cheap, and it converts an invisible
inconsistency into a reviewable claim.

## C13 — Four exports the engine itself declined to use

A repeating, mechanically detectable shape that no single ranking could name as a class:

| Export | The engine's own code | Evidence |
|---|---|---|
| `checkRateLimit` | `createSectionAction` reimplements it | *"Mirrors checkRateLimit's own `result?.success === true` test"* |
| `formatTimestamp` | `CairnHistory` hand-rolls `formatVersionDate` | *"keeps the time rather than routing through the admin toolkit's civil-date-only formatter"* |
| `normalizeAssets` | engine normalizes once at compose; docs teach a second normalize from a re-typed literal | six of six family sites copied the duplicate |
| `feedView` | zero engine screens, zero of six sites | six independent `feed.ts` hand-rolls with a byte-identical header sentence |

In every case the engine had the need, had the export, and wrote around it. The toolkit's own
founding spec already named the principle — *"The engine becomes the toolkit's second consumer,
which is the shakedown the wave-by-graduation ruling wants before a contract publishes"* — and five
`/admin-toolkit` items shipped without it.

**Recommendation.** Make it a gate, not a habit: **an export the engine could use and does not is a
shape defect until argued otherwise.** The mechanical half is detectable — a public export with
zero `src/lib` call sites outside its own module and zero showcase call sites — and belongs in
`cairn-audit` or a `check:dogfood` script, per the workstation rule that a watch item promotes to a
tripwire whenever its trigger is machine-detectable.

## C14 — A consuming site's conventions cross into engine code in three subsystems

The charter's constraint 3 (re-derive, never transplant) is violated the same way in three places
that share no code:

- `/render`: `cardShell`, `iconSpan`, `headRow` bake `ec-icon`, `ec-head` (one family site's CSS
  prefix) and DaisyUI's `card-body`/`card-title` into engine-emitted markup, while the engine ships
  no CSS for any of them.
- `/reproductions`: `validateReproFence` hardcodes an English `Reproduction` alt-text prefix and a
  150-character ceiling from cairn-pub's own prose register; `fixtureMediaBase` hardcodes a
  consumer's route segment as a root-absolute URL with no prop to override it.
- `/admin-toolkit`: `formatTimestamp`'s parameter is `sqliteDatetime` — one site's storage shape in
  the signature — and `formatPhone`/`formatMoney`/`ageFromBirthdate` carry that site's domain
  outright.

**Recommendation.** All three are already ordered as retires or reshapes per item. The
whole-surface addition is a review question rather than a gate: **"whose vocabulary is in this
signature?"** asked at every graduation, since all three passed a per-item review that did not ask
it.

## C15 — Small evenness residue in the log vocabulary

Not exported, but the event names are a public-observable contract and the same standard applies.
The log ranking found the contract in genuinely good health (74/74 names diff clean against the
docs, no dead vocabulary) with four cosmetic evenness defects worth folding into any one pass:
`include.*` interleaved into the middle of the `media.*` block in both the union and the reference
table; the publish pair straddling two areas (`entry.published` / `publish.failed`) where every
other outcome pair shares one; `taxonomy.unmarked_field` the only name in 74 that is neither a
past-tense verb phrase nor a state adjective; and `preview.cleanup_failed` putting a stringified
throw in the `reason` slot the grammar reserves for a snake_case enum, where five sibling events
correctly use `error`.

---

# What is coherent, and should be protected

An honest read has to say what holds, because these are the parts a reshape pass could damage.

1. **The `Load`/`Action` suffix rule** — universally applied, no exceptions found across ~30
   route-factory members.
2. **`Plan` for preview payloads, `Result` for applied outcomes** — ratified as "already
   practiced," and it still is.
3. **The three resolver seams** (`LinkResolve`, `FragmentResolve`, `MediaResolve`) — one shape, one
   two-mode failure contract stated once (*undefined is a preview miss, a throw is the build
   backstop*), applied identically to all three. This is the single most even thing on the surface
   and it is the model C6 should generalize.
4. **The four error classes** (`SiteConfigError`, `BranchExistsError`, `CommitConflictError`,
   `UnauditedActionError`) — one suffix, one mechanism, one stated reason (`instanceof` across the
   peer boundary).
5. **Stability tiers**, present on 19 of 25 reference pages and, per the route-factories
   cross-check, closely tracking the audit's own verdicts. A real asset going into the 1.0 freeze.
6. **The structural-typing posture** — `CairnEvent`, `CookieJar`, `PlatformContext`,
   `RateLimitLike`, `EmailSender`'s `Promise<unknown>`: the engine consistently accepts a
   structural subset so a site never casts and the engine never imports a site's generated
   ambients. Applied evenly across `/sveltekit` and `/cloudflare`.
7. **The dependency-graph subpath splits** — `/delivery/data`, `/delivery/head`,
   `/reproductions/manifest`, `/media`, `/ambient`. Each reasoned in the barrel, each held by a
   test.
8. **`/components`' membership rule** — stated, exact, with its single exception (`PreviewBanner`)
   documented as an exception. The one barrel whose contents can be predicted from its rule.

---

# Reshape verdicts where coherence, not membership, is the failure

Ordered by what unblocks what.

**R-1. Canonical-home rule (C1).** Ratify one declaring subpath per type; other barrels document
where to import from. Enforce in `check:surface`. **Do first** — it changes the published subpath
of every surviving item, so any later reshape done before it gets touched twice. Resolves all four
flagged collisions and ~40 unflagged siblings.

**R-2. Narrow `ContentRoutes`, then re-derive the R4 closure (C10, C3).** Declare the
consumer-facing route bundle deliberately and keep the media-janitorial actions on an internal
shape the engine's own components already import directly. This is the single change that lets
~30 `/sveltekit` leaves retire, and it settles the closure conflict between the two largest
buckets without repealing the rule.

**R-3. Apply R1's parameter-bag clause as written (C2).** `CairnAdminOptions` →
`CairnAdminConfig`, `ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` →
`EditorRoutesConfig`, `CairnManifestOptions` → `CairnManifestConfig`; every `deps` parameter →
`config`. One idiom for factory returns while in the same files (C3).

**R-4. Extend R1 past factory verbs (C4, C5).** One verb per job for the
verify/validate/check and parse/read/extract triplets; a clause that an exported function's name
begins with a verb. Fold the renames into reshapes already ordered rather than running a separate
rename pass.

**R-5. Ratify the outcome idiom (C6).** More than two distinguishable outcomes returns a
discriminated result, never a boolean. Collapses the `/cloudflare` rate-limit pair, the two
`/auth-store` owner guards, and `ContentFormFailure` into one rule with three applications.
State `verifyTurnstile`'s fail-closed boolean as the deliberate exception.

**R-6. Fold `/auth-channel` onto the engine's existing idioms (C8).** Independent of the factory's
own verdict: packaged migration directory instead of `CHANNEL_SCHEMA_SQL`; `CairnEvent` (or kit's
`RequestEvent`) instead of `AuthChannelEvent`; `revokeSessions` taking the same event its siblings
take.

**R-7. Retire `/render` as a subpath after its ordered retires (C11).** Re-home `ComponentContext`
and `SlotDef` per R-1; move `strAttr` onto the context as `ctx.str()`; re-home `UploadResult` to
`/media`.

**R-8. Convert two coherence rules into gates (C13, C12).** A `check:dogfood` script flagging a
public export with no engine or showcase call site; a barrel-comment requirement for an internal
sibling of a public export. Both are machine-detectable triggers, which the repo's own watch-item
rule says must become tripwires rather than prose.

---

# One closing observation

The strongest predictor of an item's coherence in this audit is not its subsystem, its age, or its
consumer count. It is **which authority named it.**

- Named by the R1 grammar → even, and the rankings barely mention it.
- Named by a measured, twice-written hand-roll (`/cloudflare`, `/auth-crypto`, `createD1AuditSink`,
  `PageHeader`, `EmptyState`, `turnstile.verify_failed`) → clean membership, clean shape, and the
  second-vantage read found the requirement's shape does not show.
- Named by a filed division of labor (`/auth-store`, `publishedAt`/`newlyPublishedEntries`,
  `createAuthChannel`) → correct about the sentence filed, silent one step outside it, and the
  first real consumer wrote a WeakMap, a table scan, or a manifest reader around the boundary.
- Named by the R4 closure or an internal testability split → the retire pile, almost in its
  entirety.

The log-vocabulary ranking reached the same conclusion in its own domain and put it best: *"the
events written to a spec are better shaped than the events written to a call site."* That holds for
the whole surface. The coherence fix is therefore not mainly a rename campaign — it is **finishing
the R1 grammar so it covers the population it currently leaves ungoverned**, and scoping R4 to a
deliberately narrowed input. Both are one pass's work while churn is still free, and both stop
producing new incoherence rather than only clearing the existing stock.
