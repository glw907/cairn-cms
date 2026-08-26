# Whole-surface coherence read — v2 (cli-surface re-merge)

Repo: `/home/glw907/Projects/cairn-cms` @ `main`, 2026-08-26. Inputs: all eleven `rank-*.md` files
(~540 audited items across 18 export subpaths, four `bin` commands, the `create-cairn-site`
scaffolder, and the 74-event log vocabulary), `second-vantage.md`, `agent-standard.txt`. Claims
about the code below were re-verified against the tree rather than taken from the rankings.

The standing goal being judged: **the engine stays clean, even, beautiful, and broadly useful.**
Membership and shape are per-item tests and the eleven rankings did them. Evenness and coherence are
properties of the whole surface, and that is the only altitude at which the findings below are
visible. Nothing here re-argues a membership verdict.

---

## What the cli-surface re-merge changed

v1 read ten subsystems. `rank-cli-surface.md` (50 items) has since landed and it is the only
subsystem in the audit that is **healthier than the export surface**, which changes four findings
and adds three.

| v1 finding | Status after re-merge |
|---|---|
| C1 canonical home | **Stands as written.** No CLI evidence bears on it. |
| C2 parameter bags | **Amended.** One of nine rows (`cairnManifest` / `CairnManifestOptions`) is out of population: it is a Vite plugin factory on an interop surface and follows Vite's convention correctly. Eight rows stand. |
| C3 factory-return derivation | **Stands, and generalizes.** The CLI surface supplies two new instances of the same derive-vs-hand-copy split, one good and one live-broken. |
| C5 bare-noun names | **Amended twice.** `cairnManifest` is withdrawn from the rename list (host convention). `unlistedRoutes` is now a straight retire, not a move. |
| C7 failure-name family | **Stands as written.** No CLI evidence bears on it. |
| C9 granularity | **Amended.** The CLI has the uniform, registry-enforced granularity C9 asks for and could not find. |
| C10 R4 closure | **Re-tested, stands unchanged.** The CLI publishes commands, not closure leaves; nothing contradicts it. |
| C11 subpath axes | **Amended.** `/vite` verified as the dependency axis correctly applied, so it is not a third axis. The packaged-files registry gate is named as a third, well-run mechanism. |
| C12 visibility splits | **Amended.** The CLI's registry gate is the enforced form of C12's ask. |
| C13 dogfood tripwire | **Amended substantially.** `cairn-audit` is declined as the home; `scripts/checks/check-dogfood.mjs` is correct. The finding narrows to the export surface, and the CLI becomes its positive model. |
| C14 site vocabulary in engine code | **Amended.** The audit surface supplies the method C14 asked for as an open question. |
| `unlistedRoutes` disposition | **Settled: retire outright.** The `cairn-audit` relocation is declined on four independent grounds. |
| — | **New C16**: three public-observable identifier vocabularies, three grammars, no ruling. |
| — | **New C17**: one ratified anti-silent-green doctrine, two enforcement postures. |
| — | **New C18**: the most-adopted bin is the one that breaks the bin conventions. |

---

## Verdict up front

**cairn does not yet read as one designed engine. It reads as five well-designed subsystems, three
mechanically generated ones, and one CLI arm that is better than all of them, published through a
subpath map built on two incompatible axes.**

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

The re-merge adds a fourth authority worth naming, because it is the one that works: **on the CLI
arm, the governing rule is "call the engine's own code, never a copy of it,"** and the cli-surface
ranking found it applied five times without exception (F4). Every item that follows it ranked 23 or
higher out of 50. That rule is not written down anywhere. It should be, because it is the single
highest-yield coherence rule the audit found, and it is the one the export surface most needs.

Seven findings are structural. Eleven are cosmetic. The four flagged collisions are **all drift**,
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

Nothing in the CLI surface bears on this: the four bins publish no types.

---

# Structural findings

## C1 — One type, four importable names, no canonical-home rule

*(Unchanged by the re-merge.)*

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

## C2 — Eight sibling factories, four different parameter-bag conventions, against the engine's own ratified rule

*(Amended: one of nine rows withdrawn on cli-surface evidence.)*

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
| ~~`cairnManifest`~~ | ~~`CairnManifestOptions`~~ | ~~`opts`~~ — **withdrawn, see below** |

Four combinations for one job. The two violations that matter most are `createCairnAdmin` and
`createContentRoutes` — the recommended mount path and the factory carrying cairn's core content
job. And the retired `*Deps` concept survives as the parameter identifier on three of them, so a
developer reading `createCairnAdmin(runtime, deps)` in the reference meets a vocabulary the engine
retired.

No per-item ranking could reach this. Each ranking saw one or two bags and judged them
individually: `CairnAdminOptions` earned a keep on `"Injectable dependencies, grouped into the two
cohesive bags a site actually overrides"` — a fine sentence about a wrongly-suffixed type.

**Amendment — `cairnManifest` is out of population.** `/vite` publishes exactly two names
(verified: `src/lib/vite/index.ts:7-8` exports `cairnManifest` and `CairnManifestOptions` and
nothing else). `cairnManifest` is a **Vite plugin factory**, not an R1 factory: R1's population is
`define*` / `compose*` / `create*` / `build*`, and this is none of them. Vite's own ecosystem names
a plugin factory as a bare noun taking an `*Options` bag (`svelte(opts)`, `tailwindcss(opts)`), and
cairn matching that is correct interop, not drift. Renaming it to `CairnManifestConfig` would make
cairn the only plugin in a consumer's `vite.config.ts` spelled differently from its neighbours.

**The general clause the amendment implies is worth ratifying alongside the rename**, because it
recurs: **on an interop surface, the host ecosystem's convention wins over cairn's internal
grammar, and the barrel says so in one line.** Without that clause, a later reshape pass reads R1
literally and "fixes" a correct name.

**Recommendation.** Apply R1 as written to the eight in-population rows: rename `CairnAdminOptions`
→ `CairnAdminConfig`, `ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` →
`EditorRoutesConfig`; rename every `deps` parameter to `config`. Leave `/vite` alone and record why
in its barrel. Churn is free before beta and this is exactly the class of change the pre-beta window
exists for. Add the rule to `check:surface` if the suffix can be derived from position; otherwise it
rides the docs gate.

## C3 — Two derivations for "name a factory's return", and the hand-written half can drift

*(Stands, and generalizes on cli-surface evidence.)*

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

**The re-merge shows this is not a type-system finding. It is the engine-wide split between
deriving a fact from its source and hand-keeping a copy of it**, and the CLI supplies both a model
instance and a live-broken one:

- **Derived, correct.** `config.dependency-floors` reads the peer ranges *from the installed
  `@glw907/cairn-cms/package.json`*, so *"the floors are declared once"* and the check cannot
  disagree with `package.json`, `supported-toolchain.md`, or npm's install-time warning, on any
  version, ever. `config.public-origin` calls `requireOrigin`; `config.site-config` calls
  `parseSiteConfig`; `cairn-manifest` evaluates the plugin's own virtual module, so *"agreement is
  achieved by being the same code."*
- **Copied, and broken today.** Verified in the tree:
  `src/lib/doctor/checks-local.ts:138` hard-codes
  `SITE_CONFIG_PATHS = ['site.config.yaml', 'src/lib/site.config.yaml', 'src/site.config.yaml']`,
  while `packages/create-cairn-site/template/src/theme/site.config.yaml` and
  `examples/showcase/src/theme/site.config.yaml` are the paths the engine's own scaffolder and its
  own showcase actually use. **The engine's checker does not know where the engine's scaffolder puts
  the file**, so `config.site-config` skips rather than passes on every scaffolded site, and a skip
  never changes the exit code.

That is the same defect as `CairnAdminRoutes`, one layer out: a fact with a single source of truth,
copied by hand into a second place that then rots silently.

**Recommendation.** One derivation for all seven factory returns. `ReturnType<typeof f>` is the
drift-proof choice and is already used by the two largest. Where a narrower public view is wanted
(which is exactly `ContentRoutes`' case — see C10), declare the narrow type deliberately and have
the factory's signature return it, rather than hand-mirroring a wide one. Then apply the general
rule: **a fact with one source is read from that source, never copied** — which fixes
`SITE_CONFIG_PATHS` by deriving it from the same constant the template bake uses, and gives the
`check:dogfood` tripwire (C13) a sibling worth writing.

## C4 — Outside factory verbs there is no naming rule, and three triplets prove it

*(Unchanged by the re-merge.)*

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

*(Amended twice: one name withdrawn, one disposition settled.)*

A developer reading a cairn import list cannot tell a function from a value by its name.

Functions named as nouns: `siteDescriptors(adapter, config)`, `unlistedRoutes(ids, paths)`,
`newlyPublishedEntries(before, after)`, `feedView(...)`, `sitemapView(...)`, `mediaToken(ref)`,
`jsonLdScript(data)`, `glyph(name, icons)`, `iconSpan(el)`, `cardShell(classes, body)`,
`headRow(title, icon, level)`, `itemNoun(n, label)`, `strAttr(ctx, key)`, `roleHome(...)`,
`ownerLevelRoles(...)`, `fieldset(...)`.

Exported values named the same way: `manifest` and `stories` (`/reproductions`), `fields`,
`AI_CRAWLERS`, `DEFAULT_ROLES`.

Each one reads fine alone — that is precisely why no ranking charged it. `feedView` reads as "the
feed view"; `siteDescriptors` reads as "the site's descriptors." Together they make the surface
unreadable at a glance, and they interact badly with C1: a name imported from four barrels that
also does not say whether it is callable is the worst case.

**Amendment 1 — `cairnManifest` is withdrawn from the list.** It is a Vite plugin factory, and a
bare-noun plugin factory is Vite's own convention (C2's amendment). The clause below must be scoped
so a later pass does not rename it.

**Amendment 2 — the clause does not reach bin names.** `cairn-doctor`, `cairn-audit`,
`cairn-manifest`, `cairn-media-seed` are all nouns, and that is correct: `npm audit`, `npm doctor`,
and `brew doctor` are the ratified shape of that surface. An exported-function rule that leaks onto
command names would produce `cairn-check` and `cairn-diagnose`, which is worse.

**Amendment 3 — `unlistedRoutes` is a straight retire.** v1 folded its rename into "its move to
`cairn-audit`." That move is now declined on four grounds (see the disposition section below), so
the export retires and nothing is renamed.

**Recommendation.** Not a mass rename — several of these are retiring anyway (`cardShell`,
`iconSpan`, `headRow`, `strAttr`, `feedView`'s reshape, `unlistedRoutes` outright). Fold the naming
fix into the reshapes already ordered, and add a clause to R1: **an exported function's name begins
with a verb; an exported value's does not; a bin name and a host-ecosystem plugin factory are out of
scope.** The survivors needing a rename are then a short list: `siteDescriptors` →
`describeSite`/`buildSiteDescriptors`, `newlyPublishedEntries` → `diffNewlyPublished`, `mediaToken`
→ `formatMediaToken` (pairing it with `parseMediaToken`, which the media ranking already argues must
stay a matched codec), `jsonLdScript` → `renderJsonLdScript`, `itemNoun` → `pluralizeItem`.

`mediaToken`/`parseMediaToken` is the sharpest instance: a codec whose two halves are named on
different systems, with the media ranking keeping the encoder specifically on the argument that
"shipping a decoder without its encoder leaves the public codec half-open." The pair is kept for
symmetry it does not have in its names.

## C6 — The engine knows how to shape an outcome and does it in one subsystem only

*(Unchanged by the re-merge.)*

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

The CLI surface is the counter-model here too, and it is worth naming because it settles what
"enough outcomes" looks like in practice: `cairn-doctor` publishes a three-value result
(`PASS`/`FAIL`/`SKIP`, `report.ts:8-12`) and a three-value exit contract (0/1/2) rather than a
boolean, and the cli ranking's F3 finding is that even three is one short (see C17).

**Recommendation.** Ratify the outcome idiom the way `Plan`/`Result` was ratified: **an operation
with more than two distinguishable outcomes returns a discriminated result, never a boolean.**
Then the `/cloudflare` rate-limit reshape, the two `/auth-store` owner-guard warts, and the
`ContentFormFailure` flattening are one change with one rule behind them instead of four
negotiations. `verifyTurnstile` is the honest exception to argue: fail-closed boolean is defensible
for a security predicate, and that exception should be *stated* rather than left to look like the
same defect.

## C17 — One ratified anti-silent-green doctrine, two enforcement postures *(new)*

cairn has a stated, repeatedly quoted doctrine: *"the silent green this engine exists to rule
out."* It is enforced in one CLI and not in its sibling, and neither ranking could see the pair.

**`cairn-audit` ratified the answer.** The rendered harness *"fails rather than reporting clean on
every shape of silent green: no rules registered, no pages configured, `BASE_URL` not answering,
Playwright absent, or any configured page rendering outside 2xx."* Five refusal conditions, all at
exit 2, with the tier defined as *"the run couldn't start or couldn't finish"* and explicitly
*"never a design verdict."* The static side follows the same rule: a `static.scope` path you wrote
that does not exist fails the run, because *"a typo that quietly narrows the audit to nothing is the
silent green this engine exists to rule out."*

**`cairn-doctor` did not.** A skip never changes the exit code, and the cli ranking's F3 names four
checks where a skip means *"I could not look"* rather than *"not applicable"*:

| Check | What the skip actually means |
|---|---|
| `config.csrf-disable` | The most security-load-bearing config contract cairn has went unchecked. Fires on **every bare `sv create` site**, which writes no `svelte.config.js` at all. |
| `config.site-config` | Fires on **every scaffolded site** (C3: `SITE_CONFIG_PATHS` never lists `src/theme/`). |
| `config.dependency-floors` | Fires on every pnpm or yarn project; the check that would catch a miscompiling `svelte 5.56.1` does not run. |
| `auth.role-wiring` | Goes quiet on exactly the site most likely to have gotten the wiring wrong (a renamed hook, a variable argument). |
| `admin.mount-shape` | Has **no failing state at all** — a documentation link wearing a check costume. |

Two of these produce a green CI run on a site the engine itself scaffolded.

**One correction to a filed claim, verified.** The ROADMAP says *"A skip is not visually distinct
from a pass in the doctor's own report."* That is false: `report.ts:8-12` renders distinct
`PASS`/`FAIL`/`SKIP` tags and the summary counts all three separately. The live defect is narrower
and worse — the tag is distinct and the **exit code is not**, so CI is green and nobody reads the
text.

**Why this is structural rather than a doctor bug.** The fix is not an invention. `cairn-audit`
already ratified exit 2 for "a report I cannot stand behind," and the doctor needs the same code
path for "a check I could not run." One ruling, applied to the second tool, fixes five items and
closes two silent greens on cairn's own scaffold output.

**Recommendation.** Ratify the doctrine once, across both CLIs: **a run that could not perform a
check does not exit 0.** Split the doctor's `SKIP` into `SKIP` (not applicable, exit unchanged) and
`INFO`/`UNCHECKED` (could not look, contributes to a non-zero exit or at minimum to a distinct
summary count). The ROADMAP already names half of it — *"make 'could not find a file to check' a
result distinct from 'checked and passed'"* — but stops short of the exit code, which is the half
that matters.

---

# Cosmetic findings

## C7 — Ten exported names for `{ error: string }`, and three suffixes for one concept

*(Unchanged by the re-merge.)*

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

*(Unchanged by the re-merge.)*

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

*(Amended: the CLI supplies the model this finding asks for.)*

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

**Amendment — the CLI already runs the rule this finding wants, and enforces it.** Twenty-three
audit rules and nineteen doctor checks are each one module of consistent size, each reached through
a registry, and the registry membership is a *gate*: `check-package-files.mjs:172-178` walks
`rules/static/index.ts` and `rules/rendered/index.ts` and fails on any module a registry cannot
reach, with the worked example named in its own comment — *"`vertical-metrics` is the worked example:
nothing named it in a registry, and it shipped anyway at 66.6 KB of dist."* That is the unit a
consumer meets (one rule, one finding, one line of report) driving the unit the engine ships, with a
gate holding the line. It is exactly the inverse of the export surface's history-driven granularity,
and it is the existence proof that the rule below is enforceable rather than aspirational.

**Recommendation.** State the rule — **an internal split for testability is not a reason to export;
export granularity follows the unit a consumer calls** — and apply it to the four `compute*` helpers
(already ordered for retirement) and to `MarkdownEditor`'s wiring props (a reshape a 2026-07-01
audit already reached and only half-applied). The `/render` half resolves through its own retires.

## C10 — The R4 closure is the largest single force on the surface, and the two buckets it dominates reached opposite dispositions

*(Re-tested against cli-surface; stands unchanged.)*

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

**Re-test note.** The CLI subsystem publishes no exported types, so no cli-surface evidence bears on
the closure. The one adjacent datum reinforces rather than contradicts: `/vite`, the only subpath
belonging to the CLI arm, publishes **two** names (`cairnManifest`, `CairnManifestOptions`) and no
closure leaves, because its public signature names nothing wider. A narrow declared surface produces
a narrow closure — which is precisely the recommendation below.

**Recommendation.** Sequence it explicitly: narrow `ContentRoutes` first (C3's "declare the narrow
return deliberately"), then let the closure re-derive. Do not repeal R4 — the adapter bucket's
evenness argument is correct, and repealing it re-opens the leak.

## C11 — The subpath map is built on two incompatible axes

*(Amended: `/vite` verified as the dependency axis, and a third governing mechanism named.)*

Eighteen code subpaths (verified against `package.json` `exports`, plus `./package.json` itself),
split by two different principles:

- **Dependency-graph axis (good, and consistently reasoned):** `/delivery` vs `/delivery/data` vs
  `/delivery/head` (node-safe vs kit vs Svelte); `/reproductions` vs `/reproductions/manifest`
  (node-safe manifest vs Svelte stories, with two tests holding the line); `/media` (no kit, no
  workers-types); `/islands` (client runtime); `/ambient` (empty at runtime); **`/vite`** (a build
  plugin that must never resolve into a Worker — verified: it publishes only the plugin factory and
  its bag).
- **Audience axis:** `/components` vs `/admin-toolkit` vs `/render` — all Svelte-or-hast, all admin
  or authoring, split by who the reader is.

Both axes are defensible. Having both means a developer cannot predict which subpath holds a name,
and the surface produces exactly the anomalies the rankings flagged one at a time: `glyph` on `.`
while its five hast siblings are on `/render`; `UploadResult` on `/sveltekit` while `MediaEntry` in
its own body is on `/media`; `createMediaRoute` on `/sveltekit` rather than `/media` (this one *is*
reasoned — it reads `platform.env`, which is the dependency axis correctly applied).

**Amendment 1 — a third mechanism exists, it is well run, and it is reachability-based.** The
packaged-files gate (`check-package-files.mjs`) governs *what ships in the tarball at all*, is
enforced, and is reasoned from reachability rather than from audience. It is the mechanism that
caught `vertical-metrics` shipping 66.6 KB of unreferenced dist. This matters for the
recommendation: cairn already has an enforced, reachability-based rule for one membership question,
so ratifying the dependency-graph axis for the other is consistent with how the repo already thinks,
not a new philosophy.

**Amendment 2 — one directory-naming instance of the same category confusion.** Three of the four
bins live in a directory named for the job (`doctor/bin.ts`, `audit/bin.ts`, `media-seed/bin.ts`).
The fourth, `cairn-manifest`, lives at `src/lib/vite/bin.ts` — named for the *host it plugs into*
rather than the job it does, which is why the bin ranking had to explain twice where it lives. The
subpath `/vite` is correct on the dependency axis; the bin's home inside it is the audience/host axis
leaking one level down. Cosmetic, and worth fixing only if that directory is touched anyway.

There is also a live consequence of the audience axis: the `/render` ranking retires four of that
subpath's five value exports and reshapes the fifth onto `ComponentContext`, leaving `/render`
publishing two types that are already published from `.` and `/delivery`. **After its own ordered
retires, `/render` has no reason to exist as a subpath** — and under C1 its two survivors get a
canonical home elsewhere.

**Recommendation.** Ratify the dependency-graph axis as the *only* reason to split a subpath, and
treat audience as a docs-arm concern (which cairn already does well — four audience tracks under
`docs/`). Then: fold `/render` into `.` or `/delivery` after its retires; re-home `UploadResult` to
`/media`; and record `glyph`'s placement as a deliberate exception or move it. Eighteen subpaths is
a lot for an engine whose charter word is "lean," and the audience-axis three are where the
redundancy is.

## C12 — Within-module visibility splits with no stated rule

*(Amended: the CLI has the enforced version.)*

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

**Amendment — the CLI arm answers this question with a gate rather than a comment.** The
apparatus/product boundary in `cairn-audit` is exactly a visibility split — *"Two things stay
engine-side, both apparatus for producing the manifest the CLI ships rather than part of the audit a
consumer runs: the norms generator … and the probe scripts"* — and it is held by
`check-package-files.mjs:170-178` rather than by a sentence. Where the split is machine-detectable,
that is strictly better than the comment requirement below, and the two should be understood as one
rule with two enforcement strengths.

**Recommendation.** Each barrel already carries a membership comment; require that an internal
sibling of a public export gets one sentence naming why. Cheap, and it converts an invisible
inconsistency into a reviewable claim. Where the boundary is reachability-shaped, gate it the way
the audit apparatus is gated.

## C13 — Exports the engine itself declined to use — and the one arm that never does

*(Amended substantially: the home changes, the scope narrows, and a positive model is named.)*

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

**Amendment 1 — the finding is about the export surface, not the engine.** The CLI arm does the
opposite, consistently, and the cli ranking's F4 measured it: `config.public-origin` calls
`requireOrigin` (*"the same rule the Worker applies"*, so CLI and runtime cannot drift);
`config.site-config` calls `parseSiteConfig`; `config.dependency-floors` reads the installed
engine's own peer ranges; `cairn-manifest` evaluates the plugin's own virtual module; and
`cairn-media-seed` imports `readR2Buckets` **from `../doctor/wrangler-config.js`** so two commands
share one parser. Every one of those items ranked 23 or higher of 50, and the ranking's own
conclusion is that this *"is why the CLI surface is in better health than the export surface."*
That is the rule C13 wants, already proven inside this repo, and it should be quoted from the CLI
rather than invented.

**Amendment 2 — `cairn-audit` is the wrong home for the tripwire, and the decline is well argued.**
Three independent reasons, all verified:

1. **Subject.** `cairn-audit` is the design-language audit; its own reference page says *"All 23
   registered rules audit the `/admin` surface."* Counting call sites of a TypeScript export is
   neither design nor `/admin`.
2. **Audience.** *"`cairn-audit` ships whole, as consumer product."* A dogfood rule measures **the
   engine's own** discipline, so shipping it puts a permanently-inert rule in every consumer's
   registry and report.
3. **The registry gate forbids it.** `check-package-files.mjs:172-178` fails on any rule module a
   registry cannot reach, so a dogfood rule must register, and registering ships it.

**Correct home, verified: `scripts/checks/check-dogfood.mjs`.** That directory already holds 24
sibling scripts including `check-surface.mjs`, `check-symbols.mjs`, `check-consumers.mjs`, and
`check-package-files.mjs`. It is where every engine-hygiene tripwire in this repo lives, it runs on
every push, and it reaches no consumer. The workstation watch-item rule asks for a tripwire, not for
a particular tool, so it is satisfied identically.

**Recommendation.** Ratify the rule in the CLI's words — **a fact with one source is read from that
source, and an export the engine could use and does not is a shape defect until argued otherwise**
— and write `scripts/checks/check-dogfood.mjs` to detect the mechanical half: a public export with
zero `src/lib` call sites outside its own module and zero showcase call sites. Expect an allowlist:
some exports are legitimately consumer-only, and the allowlist entry is where the "argued otherwise"
gets written down. Pair it with the `SITE_CONFIG_PATHS` fix from C3, which is the same defect on the
CLI side and the one place the CLI arm broke its own rule.

## C14 — A consuming site's conventions cross into engine code in three subsystems

*(Amended: the audit surface supplies the method.)*

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

**Amendment — v1 left this as an open review question; the audit arm has already answered it, four
times, in a stateable form.** The method is *name the structure, never the class or the credential*:

- `weight-budget`: *"Each shape is named by an HTML tag or the ARIA role that means the same thing,
  **never by a class**, so a rewritten component stays covered."*
- `one-filled-action`: *"'Filled' means the accent, read from the live computed background, so the
  sanctioned ink fills are exempt **by construction rather than by name**."*
- The page-identity guard reads only `<title>`, `<main>`, and `[role="main"]`, *"**none of them
  cairn-only markup**,"* so a consumer's custom route measures as well as cairn's own.
- `cairn-media-seed --header` is the transplant case done right: one family site needed Cloudflare
  Access headers, and the engine shipped a **generic repeatable header flag** rather than
  `--cf-access-id`/`--cf-access-secret`. Basic auth, a bearer token, and a UA allowlist are the same
  flag. The cli ranking calls it *"the item on the whole surface that best models what constraint 3
  asks for."*

**Recommendation.** All three violations are already ordered as retires or reshapes per item. The
whole-surface addition is now a rule rather than a question: **a signature names a structure (a tag,
a role, a computed property, a general form), never a class name, a storage shape, or a credential
from one site.** Ask *"whose vocabulary is in this signature?"* at every graduation, and answer it
with the four worked examples above, since all three violations passed a per-item review that did
not ask it.

## C15 — Small evenness residue in the log vocabulary

*(Unchanged by the re-merge.)*

Not exported, but the event names are a public-observable contract and the same standard applies.
The log ranking found the contract in genuinely good health (74/74 names diff clean against the
docs, no dead vocabulary) with four cosmetic evenness defects worth folding into any one pass:
`include.*` interleaved into the middle of the `media.*` block in both the union and the reference
table; the publish pair straddling two areas (`entry.published` / `publish.failed`) where every
other outcome pair shares one; `taxonomy.unmarked_field` the only name in 74 that is neither a
past-tense verb phrase nor a state adjective; and `preview.cleanup_failed` putting a stringified
throw in the `reason` slot the grammar reserves for a snake_case enum, where five sibling events
correctly use `error`.

## C16 — Three public-observable identifier vocabularies, three grammars, no ruling *(new)*

The engine mints machine-readable identifiers a consumer greps, filters, and pastes into a bug
report. There are three vocabularies, they are each internally even, and no rule says what a fourth
would look like. Measured against the tree:

| Vocabulary | Count | Grammar | Example |
|---|---|---|---|
| Log events | 74 | dot-namespaced, variable depth, `snake_case` leaf, past-tense verb phrase | `auth.channel.session.created`, `admin.action.rate_limit_absent` |
| Doctor condition ids | 19 | dot-namespaced, exactly two segments, `kebab-case` leaf, **negative state** | `config.bindings-missing`, `edge.hsts-off` |
| Audit rule ids | 23 | bare `kebab-case`, **no namespace** | `touch-targets`, `chip-ground-collision` |
| Audit harness failure ids | 4 | bare `kebab-case` with `rendered-` **as a prefix standing in for a namespace** | `rendered-allowlist-stale` |

Three separators for one job, and the fourth row shows the cost: the audit arm needed a namespace,
had no grammar for one, and faked it with a prefix — inside the same report as the 23 bare ids.

**Two smaller instances inside the vocabularies.**

- The doctor's check ids name the **subject** (`config.tidy-key`, `edge.hsts`, `auth.store`) while
  its condition ids name the **failed state** (`config.bindings-missing`, `edge.hsts-off`). That
  pairing is deliberate, even across all 19, and good; it should be protected, not flattened.
- The audit's 23 rule ids mix both systems with no rule: eighteen name the subject measured
  (`type-scale`, `weight-budget`, `focus-renders`), five name the defect
  (`chip-ground-collision`, `no-uncompiled-class`, `stock-default-hazards`,
  `container-inset-asymmetry`, `viewport-overflow`). A reader cannot tell from an id whether a
  finding means "this measurement failed" or "this bad thing is present."
- **One identifier does two jobs.** `config.tidy-key` carries `conditionId: 'config.bindings-missing'`
  (`checks-local.ts:216-225`), deliberately and with a stated reason — *"so the readiness count
  holds (the same pattern configMediaBucket uses)"*. The reason is real, and the consequence is that
  a tidy-key failure prints remediation written for a missing wrangler binding. The condition id is
  being asked to be both "why did this fail" and "what does this count toward," and those are two
  fields.

**Why this is cosmetic rather than structural.** Each vocabulary is internally consistent, and the
three genuinely differ in kind: an ESLint-style rule id is conventionally bare kebab, a log event is
conventionally dotted. The defect is the **absence of a ruling**, not the current state, and it
bites when the fourth vocabulary arrives — which it will, since all four have grown within the last
three passes.

**Recommendation.** Ratify one clause before the 1.0 freeze: **a public-observable identifier is
dot-namespaced by area; the leaf's case follows its vocabulary's existing convention; a prefix is
never a substitute for a namespace.** Apply it to the four `rendered-*` harness ids (they are
already namespaced in spirit) and leave the 23 rule ids alone unless the audit gains a second rule
family. Separately, give the readiness count its own field so a check can carry the right
remediation without borrowing another check's condition.

## C18 — The most-adopted bin is the one that breaks the bin conventions *(new)*

Four bins, three of which ratified a set of shared behaviours. The fourth breaks two of them, and it
is the only one with universal adoption: **`cairn-manifest` is wired in 5 of 5 family sites**, all as
`"cairn:manifest": "cairn-manifest"`. `cairn-doctor` is wired as a script in **zero**.

| Convention | doctor | audit | media-seed | **manifest** |
|---|---|---|---|---|
| `process.exitCode`, never `process.exit` | yes | yes | yes | **no** |
| Rejects unknown argv with a usage line | yes | yes | yes | **no — reads no argv at all** |
| `--help` | **no** | **no** | **no** | **no** |

Verified: `src/lib/vite/bin.ts` calls `process.exit(1)` in its catch, against the rule stated
verbatim in the other three (`doctor/bin.ts:6`, `audit/bin.ts:6-7`) — *"The codes go through
`process.exitCode`, never `process.exit`, so a piped stdout flushes the whole report before the
process ends."* In a CI job that pipes output, the one command every site runs can truncate its
error message, leaving a consumer with a red build and no reason.

And `--help` is absent from all five commands (`create-cairn-site` included), where four of them
answer it with `unknown argument --help` at **exit 2** — the code reserved for *"the run couldn't
start"* — and `cairn-manifest` silently ignores it. This is the purest engine-owned defect on the
CLI surface: a consumer cannot add `--help` to a bin the engine ships, and it is the single most
likely first keystroke after seeing `cairn-doctor` scroll past in an install log.

**Recommendation.** Three small edits, one pass: `process.exitCode` in `vite/bin.ts`; argv parsing
on `cairn-manifest` that accepts `--help` and rejects everything else, matching its siblings;
`--help` on all five commands printing the existing `USAGE` constant at exit 0.

---

# What is coherent, and should be protected

An honest read has to say what holds, because these are the parts a reshape pass could damage. The
re-merge adds five entries, all from the CLI arm.

1. **The `Load`/`Action` suffix rule** — universally applied, no exceptions found across ~30
   route-factory members.
2. **`Plan` for preview payloads, `Result` for applied outcomes** — ratified as "already
   practiced," and it still is.
3. **The three resolver seams** (`LinkResolve`, `FragmentResolve`, `MediaResolve`) — one shape, one
   two-mode failure contract stated once (*undefined is a preview miss, a throw is the build
   backstop*), applied identically to all three. The most even thing on the export surface and the
   model C6 should generalize.
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
   `/reproductions/manifest`, `/media`, `/ambient`, `/vite`. Each reasoned in the barrel, each held
   by a test.
8. **`/components`' membership rule** — stated, exact, with its single exception (`PreviewBanner`)
   documented as an exception. The one barrel whose contents can be predicted from its rule.
9. **The CLI's read-from-the-source discipline** *(new)* — five instances, no exceptions:
   `requireOrigin`, `parseSiteConfig`, the installed engine's peer ranges, the plugin's own virtual
   module, and `readR2Buckets` shared between two bins. This is the single highest-yield coherence
   rule in the repo and it is currently unwritten. **Write it down before anything else.**
10. **The suppression directive contract** *(new)* — a required reason, a dead directive reporting
    as its own error, and neither of those errors being suppressable, mirrored exactly in the
    rendered allowlist's stale/dead/unprobeable triple. *"A gate any rule could quiet in one line is
    worth no more than the runs it passes."* The most even sub-surface in the whole audit, and it
    caps self-exemption at advisory tier, which is the honest answer to who audits the auditor.
11. **The doctor's check-id / condition-id pairing** *(new)* — subject in the check name, failed
    state in the condition name, even across all 19. C16's ruling must not flatten this.
12. **The audit's two-tier discipline** *(new)* — *"an advisory-tier finding reports and can never
    change the exit code, because each advisory rule measures a compositional question a
    legitimately novel component can answer differently on purpose."* That sentence is what makes a
    design audit safe to ship to a consumer whose admin looks nothing like cairn's.
13. **The norms manifest's relationship storage** *(new)* — *"a palette-dependent property as a
    relationship, never as a resolved value … a site that re-tunes the palette therefore invalidates
    nothing."* Very few measured artifacts survive a consumer re-theming; this one does by
    construction.

---

# Reshape verdicts where coherence, not membership, is the failure

Ordered by what unblocks what.

**R-0. Write down the read-from-the-source rule (C13, C3).** *A fact with one source is read from
that source, never copied; an export the engine could use and does not is a shape defect until
argued otherwise.* This is zero-cost, it is already proven five times on the CLI arm, and it is the
premise of R-8 and of half of C3. Do it first because it costs a paragraph.

**R-1. Canonical-home rule (C1).** Ratify one declaring subpath per type; other barrels document
where to import from. Enforce in `check:surface`. **Do first among the code changes** — it changes
the published subpath of every surviving item, so any later reshape done before it gets touched
twice. Resolves all four flagged collisions and ~40 unflagged siblings.

**R-2. Narrow `ContentRoutes`, then re-derive the R4 closure (C10, C3).** Declare the
consumer-facing route bundle deliberately and keep the media-janitorial actions on an internal
shape the engine's own components already import directly. This is the single change that lets
~30 `/sveltekit` leaves retire, and it settles the closure conflict between the two largest
buckets without repealing the rule.

**R-3. Apply R1's parameter-bag clause as written, to eight rows (C2).** `CairnAdminOptions` →
`CairnAdminConfig`, `ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` →
`EditorRoutesConfig`; every `deps` parameter → `config`. **Leave `/vite` alone** and record the
interop carve-out in its barrel. One idiom for factory returns while in the same files (C3).

**R-4. Extend R1 past factory verbs (C4, C5).** One verb per job for the verify/validate/check and
parse/read/extract triplets; a clause that an exported function's name begins with a verb, scoped to
exclude bin names and host-ecosystem plugin factories. Fold the renames into reshapes already
ordered rather than running a separate rename pass.

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

**R-8. Write `scripts/checks/check-dogfood.mjs` (C13), and fix `SITE_CONFIG_PATHS` beside it (C3).**
Not a `cairn-audit` rule — that tool's subject is the admin design language, its audience is the
consumer, and its registry gate means anything registered ships. The tripwire flags a public export
with no engine or showcase call site, with an allowlist whose entries carry the "argued otherwise."
Derive `SITE_CONFIG_PATHS` from the constant the template bake uses, so the checker and the
scaffolder cannot disagree again.

**R-9. Ratify one anti-silent-green enforcement posture across both CLIs (C17).** A run that could
not perform a check does not exit 0. `cairn-audit` already ruled this (five refusal conditions, exit
2, *"never a design verdict"*); the doctor needs the same path. Splits `SKIP` into "not applicable"
and "could not look," and fixes five checks at once — two of which currently produce a green run on
a site cairn's own scaffolder built.

**R-10. Barrel-comment requirement for an internal sibling of a public export (C12), and the
identifier-grammar clause (C16).** Both are cheap rulings that stop new incoherence rather than
clearing existing stock. Where the boundary is reachability-shaped, gate it the way the audit
apparatus is gated rather than commenting it.

**R-11. The three CLI evenness edits (C18).** `process.exitCode` in `vite/bin.ts`; argv parsing on
`cairn-manifest`; `--help` on all five commands at exit 0. Small, and they land on the one command
every consumer runs.

---

# One closing observation

The strongest predictor of an item's coherence in this audit is not its subsystem, its age, or its
consumer count. It is **which authority named it.**

- Named by the R1 grammar → even, and the rankings barely mention it.
- Named by a measured, twice-written hand-roll (`/cloudflare`, `/auth-crypto`, `createD1AuditSink`,
  `PageHeader`, `EmptyState`, `turnstile.verify_failed`) → clean membership, clean shape, and the
  second-vantage read found the requirement's shape does not show.
- **Named by reading the engine's own source rather than copying it** (`config.public-origin`,
  `config.site-config`, `config.dependency-floors`, `cairn-manifest`, `cairn-media-seed`) → the top
  of the CLI ranking, without exception, and the reason that subsystem is healthier than the export
  surface.
- Named by a filed division of labor (`/auth-store`, `publishedAt`/`newlyPublishedEntries`,
  `createAuthChannel`) → correct about the sentence filed, silent one step outside it, and the
  first real consumer wrote a WeakMap, a table scan, or a manifest reader around the boundary.
- Named by the R4 closure or an internal testability split → the retire pile, almost in its
  entirety.

The log-vocabulary ranking reached the same conclusion in its own domain and put it best: *"the
events written to a spec are better shaped than the events written to a call site."* The cli-surface
ranking reached it independently and sharpened it into a mechanism: *"the engine calling its own code
is the strongest predictor of a good verdict here."* Those are the same finding, and the second one
is actionable in a way the first is not.

The coherence fix is therefore not mainly a rename campaign. It is three things, in order:
**write down the read-from-the-source rule the CLI already follows**, **finish the R1 grammar so it
covers the population it currently leaves ungoverned**, and **scope R4 to a deliberately narrowed
input**. All three are one pass's work while churn is still free, and all three stop producing new
incoherence rather than only clearing the existing stock.

One caution for that pass, earned by the re-merge: **two of v1's recommendations were wrong in the
same direction** — `cairnManifest`/`CairnManifestOptions` and the `cairn-audit` dogfood home both
came from applying a cairn-internal rule to a surface that legitimately answers to something else
(Vite's plugin convention; the consumer-product boundary). A reshape pass driven by R1 needs the
carve-out clause written before the renames, not after.
