# Polish inputs: the exports-as-a-family sweep

Read-only sweep dispatched 2026-09-08 during polish planning (Opus, fresh context), against `main` at `f3f24b9f`. Findings are inputs to the polish spec; rulings on the breaking items are recorded in the spec, not here.

---

# Family read of the cairn-cms export surface

Read at `main` = `f3f24b9f` (the brief said `951a3204`; that commit is not on `main` here — findings are against `f3f24b9f`). Sources: `docs/internal/api-surface.md` (18 subpaths), `package.json` exports, every `src/lib/**/index.ts` barrel, all 25 `docs/reference/*.md`, `src/lib/log/events.ts`, and the ratified conventions block in `docs/internal/engine-rulings.md:130–300`. No files edited, no build or test run.

The single most important context: **a conventions pass already ratified most of the naming rules a family read would otherwise propose** (`convention-parameter-bags`, `convention-verb-rules`, `convention-bare-noun-functions`, `convention-outcome-idiom`, `convention-failure-suffix`, `convention-contract-first-returns`, `convention-identifier-grammar`, all accept/closed, 2026-08-30). So the findings below are split into *residuals of ratified rulings that never landed* (ledger-closing work, the pass's stated aim) and *unruled drift*. I do not re-argue any ruled item; where I touch one I cite the row.

---

## 1. Ranked findings

### Non-breaking, and they close a ratified ruling

**F1. `Refusal` and `Skip` survive as type-name suffixes, three of them.** `src/lib/sveltekit/content-routes-entry.ts:222` (`DeleteRefusal`), `src/lib/sveltekit/content-routes-media.ts:88` (`MediaDeleteRefusal`), `src/lib/media/bulk-delete-plan.ts:15` (`BulkDeleteSkip`).
Breaks: `convention-failure-suffix` (ruled accept/closed; its own closure text names `DeleteRefusal` as a Task 4/Task 5 execution target). The ledger says closed; the code says otherwise.
Cost: **additive/non-breaking** — none of the three reaches a package subpath (verified against `api-surface.md`).
Fix: rename to `DeleteFailure` / `MediaDeleteFailure` / `BulkDeleteSkipped`-as-a-field; update the ~7 internal `src/lib/components/*` importers listed in F4.

**F2. `/sveltekit`'s barrel states an invariant it violates twice.** `src/lib/sveltekit/index.ts:104` — *"Every remaining type a factory or wrapper's own signature names is re-exported here so a site importing only from this subpath can still name the value it holds."* `previewLoad` (`src/lib/sveltekit/preview.ts:431`) names `PublicRoutesConfig` in its second parameter, and `PreviewData` (`preview.ts:221`) `extends EntryData`; neither type is on `/sveltekit` (`api-surface.md` `/sveltekit` block).
Breaks: the barrel's own closure rule, which every other barrel (`.`, `/delivery`, `/delivery/data`) states and honors.
Cost: **additive**.
Fix: either R4-re-export both from `/delivery` with the usual per-name reason comment, or amend the barrel sentence to name the two documented cross-subpath exceptions (`docs/reference/sveltekit.md:1310` already cross-links them, so the doc is fine either way).

**F3. The manifest codec is split across two subpaths and uses two verbs for one pair.** `serializeManifest`/`verifyManifest`/`verifyReferences` on `.` (`src/lib/index.ts:94`); `parseManifest` on `/delivery/data` (`src/lib/delivery/data.ts:72`). All four come from the same module, `src/lib/content/manifest.ts`.
Breaks: `convention-verb-rules` (ruled) — *"`parse*` reserved for string-to-structure codecs (paired with `format*`)"*. The pair here is `parse`/`serialize`, and the two halves do not share a home. Every other codec in the engine gets this right: `parseMediaToken`/`formatMediaToken`, both on `/media`.
Cost: re-homing `parseManifest` onto `.` is **additive** (a second publisher, recorded as R4). Renaming `serializeManifest` → `formatManifest` is **breaking**.
Fix: publish `parseManifest` on `.` beside its siblings now; carry the `serialize`→`format` rename into whatever release next takes a `Consumers must:` line.

**F4. A public JSDoc points at a deliberately-internal symbol.** `src/lib/delivery/site-indexes.ts:33` — `createSiteIndexes`'s doc block reads *"`validate: false` opts out of the build gate, exactly as on `createSiteResolver`."* `createSiteResolver` was demoted internal (rulings `audit-delivery-*`, `engine-rulings.md:3868,3882`), so a consumer reading the shipped `.d.ts` is sent to a name they cannot import.
Cost: **non-breaking**, one sentence.
Fix: replace the cross-reference with the behavior it describes.

**F5. Six public JSDoc one-liners are name paraphrases (`jsdoc/informative-docs` tell).** `src/lib/delivery/responses.ts:9` (`rssResponse` → "An RSS 2.0 feed response."), `:16` (`jsonFeedResponse`), `:23` (`sitemapResponse`), `src/lib/delivery/feeds.ts:7` (`FeedChannel` → "Feed channel metadata."), `:100` (`buildJsonFeed` → "Build a JSON Feed 1.1 document."), `src/lib/sveltekit/content-routes-list.ts:34` (`ListData` → "The concept list view's data.").
Breaks: the family standard visible three lines away in the same file — `robotsResponse` (`responses.ts:30`) and `markdownResponse` (`:38`) both document the contract instead of restating the name. Three of five sibling response helpers are paraphrases and two are not.
Cost: **non-breaking**.
Fix: state what each helper fixes that a site otherwise gets wrong — the `Content-Type`, the charset, and that no cache header is set.

**F6. Two sibling public types, one fully documented and one not.** `src/lib/delivery/public-routes.ts:54` (`EntryData`, seven members, zero per-member docs) sits directly above `:116` (`EntryDataOverrides`, three members, each documented). Same split at `src/lib/media/manifest.ts:13` (`MediaEntry`, twelve undocumented members) against `src/lib/media/library-entry.ts:22` (`MediaLibraryEntry`, ten members, all documented) — and those two are near-identical projections of the same asset published on two different subpaths.
Cost: **non-breaking**.
Fix: document `EntryData` and `MediaEntry` members; on `MediaEntry` say what it carries that `MediaLibraryEntry` drops (`sha256`, `originalFilename`) and why a site would reach for each.

**F7. The reference-page section grammar is inconsistent for the same kind of subpath.** Eight export-keyed pages close with a `## Types` table (`core`, `sveltekit`, `delivery-data`, `admin-toolkit`, `auth-channel`, `auth-store`, `cloudflare`, `media`, `render`); five export-keyed pages carry type exports and no `## Types` section (`components.md`, `delivery.md`, `islands.md`, `reproductions.md`, `vite.md`). `delivery.md` documents `PublicRoutesConfig`, `EntryData`, `EntryDataOverrides` as `###` sections while its own sibling `delivery-data.md` puts every type in the table.
Cost: **non-breaking**.
Fix: one shape for export-keyed pages — functions as `###`, types in a trailing `## Types` table — and let `check:reference` assert the section exists wherever the subpath has type exports.

**F8. A published doc claim is false.** `docs/reference/sveltekit.md:1221` — *"all folded into the single `ContentFormFailure` shape every content action's `fail()` returns."* `revertAction` returns `ActionFailure<RevertFailure>` (`src/lib/sveltekit/types.ts:160`), and `vocabularySaveAction`, `tidyAction`, `dictionaryAddAction` each return their own failure shape (the page itself documents the last three at `:1180`, `:1211`).
Cost: **non-breaking**.
Fix: "every *entry and media* content action"; name `RevertFailure` as the fourth exception beside the three already listed.

**F9. `/delivery/head` is an export subpath with no index entry.** `package.json` exports `./delivery/head`; `docs/reference/README.md`'s "One page per package export subpath" list has bullets for the other seventeen and none for this one. It is documented inside `delivery.md:210`, which is a defensible choice, but the README's "Pages that document no subpath" section enumerates its own exceptions and does not cover the inverse case.
Cost: **non-breaking**.
Fix: one clause on the `/delivery` bullet naming `/delivery/head` as folded in, the same way the `/reproductions` bullet already names `/reproductions/manifest`.

**F10. The `/render` subpath does not hold the renderer.** `src/lib/render/authoring.ts` exports exactly one type, `ComponentContext`, which is also on `.` and `/sveltekit`. `createRenderer`, `Renderer`, `RendererOptions`, `DocHeading`, `ResolveOptions`, `parseMarkdown` all live on `.` (`src/lib/index.ts:107,110`).
Breaks: subpath-name-predicts-content, honored by every other subpath (`/media` holds the media surface, `/islands` holds `hydrateIslands`).
Cost: renaming or retiring the subpath is **breaking**; the file's own header comment already explains the history and the charter reasoning.
Fix (cheapest): leave the export map alone, retitle `docs/reference/render.md` and its README bullet to say plainly that this subpath is the one type a component `build()` names, and that the render *pipeline* is on `.`. Retiring `/render` in favor of `.` is a `Consumers must:` item to batch, not to take here.

### Unruled family drift, non-breaking to fix

**F11. Five words for "we said no" in the log vocabulary.** `src/lib/log/events.ts` — `refused` (`:10` `auth.link.refused`, `:60` `tidy.refused`), `rejected` (`:30` `preview.rejected`, `:34` `guard.rejected`, `:65` `admin.action.csrf_rejected`), `denied` (`:55` `auth.access.denied`), `blocked` (`:44` `media.delete_blocked`, `:48` `media.replace_blocked`), and `failed` used for refusals as well as faults. The file header (`:5`) fixes the *grammar* (`area[.subject].verb_phrase`) and says nothing about the verb *vocabulary*, so each area picked its own.
Cost: **breaking** for a subscriber switching on the string, but nothing in the tree or the showcase does — the union is the only consumer surface, and `docs/reference/log-events.md` already documents all 80.
Fix: pick two verbs (`refused` for a policy decision, `failed` for a fault), rename the four outliers, and add the verb table to the `events.ts` header so the next area cannot re-fork it.

**F12. The publish operation splits its success and its failures across two log areas.** `events.ts:25` `entry.published` and `:26` `entry.discarded` against `:31` `publish.failed` and `:32` `publish.address_collided`. A subscriber filtering `publish.*` sees only failures. Every other operation keeps one area (`commit.succeeded`/`failed`/`reverted` at `:18–20`; `tidy.succeeded`/`failed`/`refused`/`empty` at `:58–61`).
Cost: **breaking** as above, same low real exposure.
Fix: one area, `entry.*` or `publish.*`, for all four.

**F13. Three more one-off terms in the same union.** `:24` `taxonomy.field_unmarked` is the only use of the area `taxonomy` (nothing on the public surface carries that word; the sibling event is `:23` `content.field_behavior_failed`). `:71` `admin.action.sink_threw` and `:73` `audit.sink.write_failed` are the same audit sink under two areas with two verbs, and `threw` appears once in 80 events. `:83` `auth.channel.session.created` is the only four-segment name, against a header that declares three.
Cost: **breaking** as above.
Fix: fold `taxonomy` into `content`; pick one area and one verb for the sink; either widen the declared grammar or flatten the four-segment name.

**F14. Two of thirteen load-data types carry `Load` in the name.** `src/lib/sveltekit/nav-routes.ts:25` (`NavLoadData`) and `src/lib/sveltekit/content-routes-settings.ts:86` (`VocabularyLoadData`), against `AdminShellData`, `ListData`, `EditData`, `HelpData`, `WelcomeData`, `SettingsData`, `MediaLibraryData`, `HistoryData`, `HealthData`, `PreviewData`, `AdminData` — all return types of `*Load` functions, none of which say so.
Cost: **breaking** (both are public on `/sveltekit`; `VocabularyLoadData` carries a `keep` ruling, `audit-sveltekit-vocabularyloaddata`, on its existence, not its name).
Fix: `NavData` / `VocabularyData`, batched with the other renames below.

**F15. `createMediaRoute` breaks the route-factory family three ways.** `src/lib/sveltekit/media-route.ts:78` — singular `Route` where six siblings are plural `*Routes`; no `MediaRouteConfig` where every sibling has one; and it returns a bare kit `RequestHandler` where siblings return a named `*Routes` object.
The return type is **exempt** — `convention-interop-carve-out` (ruled) names `createMediaRoute`'s `RequestHandler` explicitly. The name and the missing config bag are not covered by that ruling.
Cost: **breaking** to rename.
Fix: leave it; add one sentence to `src/lib/sveltekit/index.ts:25` recording that this factory is singular because it mounts one kit handler, so the next reader does not file it again. That is the `convention-internal-sibling-comment` shape applied to a public asymmetry.

### Breaking, ranked by how much a consumer feels it

**F16. Route factories come in three arities.** `createAuthRoutes(config)` (`src/lib/sveltekit/auth-routes.ts:145`), `createEditorRoutes(config = {})` (`editors-routes.ts:50`), `createPublicRoutes(config)` (`src/lib/delivery/public-routes.ts:194`) take one bag; `createContentRoutes(runtime, config = {})` (`content-routes.ts:165`) and `createCairnAdmin(runtime, config = {})` (`cairn-admin.ts:412`) take two; `createNavRoutes(runtime)` (`nav-routes.ts:42`) and `createMediaRoute(runtime)` take one positional runtime and no bag. `convention-parameter-bags` (ruled) fixed the bag *name* across four rows and left the arity alone.
Cost: **breaking**, and it is the drift a developer hits first, on their second route file.
Fix: one shape — `(runtime, config = {})` — with the runtime-free factories keeping `runtime` optional inside the bag. This is the largest single `Consumers must:` line on this list, so it should go in the release that already carries a break, not alone.

**F17. Three factory-level bags are named `Options`, not `Config`.** `src/lib/sveltekit/guard.ts:73` (`AuthGuardOptions`, parameter `opts`), `src/lib/render/pipeline.ts:93` (`RendererOptions`), `src/lib/content/fieldset.ts:423` (`FieldsetOptions`) — against fifteen `*Config` bags. The distinction `createSectionAction` draws is the right one and is worth stating: `SectionActionConfig` (`section-action.ts:36`) is factory-level, `SectionActionOptions` (`:49`) is per-call, and the seven other `*Options` types on the surface are all per-call. `convention-parameter-bags` scoped its population to four `*Config` rows and did not reach these three. `RendererOptions` and `FieldsetOptions` carry `keep` rulings (`audit-adapter-rendereroptions`, `audit-adapter-fieldsetoptions`) on their *existence*, not their names. `CairnManifestOptions` is exempt under `convention-interop-carve-out`.
Cost: **breaking**.
Fix: rename the three; write the factory-`Config` / per-call-`Options` split into the parameter-bags ruling's own row as an amendment, so it stops being folklore readable only from `section-action.ts`.

**F18. Three discriminated results ignore the ratified `outcome` grammar.** `src/lib/sveltekit/auth-routes.ts:50` (`RequestResult` discriminates on `status`, with snake_case values `send_error`), `src/lib/auth-channel/factory.ts:242` (`ChannelRequestResult` = `{sent:true} | {error:…}`) and `:247` (`ChannelConfirmResult` = `{ok:true} | {error:…}` — two adjacent sibling types in one file using two different success keys), `src/lib/sveltekit/types.ts:160` (`RevertFailure` discriminates on `reason`). Against six types that get it right: `RateLimitOutcome`, `DeleteEditorOutcome`, `SetEditorRoleOutcome`, `OwnerGuardOutcome`, `PreviewMintOutcome`, `PreviewRevokeOutcome`, all `{ outcome: … }`.
`convention-outcome-idiom` (ruled) scopes the grammar to *"every discriminated result this pass introduces"*, so these four predate it rather than violate it. Reading them into scope is a scope decision for the plan, not a re-argument of the ruling.
Cost: **breaking** on all four, and `ChannelRequestResult`/`ChannelConfirmResult` are the newest public surface on the list.
Fix: `{ outcome: 'sent' | 'invalid' | … }`, and rename `*Result` → `*Outcome` to match the six. If the plan declines the four, amend the ruling's row to say so, so the next family read does not re-file it.

**F19. `EditorRow` is the surface's only `Row`, and it duplicates `Editor` minus one field.** `src/lib/auth/store.ts:45` (`{email, displayName, role}`) against `src/lib/auth/types.ts:13` `Editor` (`{email, displayName, role, capability}`). Two public types for one concept on two subpaths (`/auth-store` and `.`+`/sveltekit`), distinguished only by whether the capability has been resolved yet.
Cost: **breaking**.
Fix: `export type EditorRow = Omit<Editor, 'capability'>` under a name in the family's own vocabulary (`UnresolvedEditor`, or fold it and let `capability` be optional). The `Omit` form alone is worth doing even if the name stays, so the two cannot drift.

**F20. Seven public functions are noun-first.** `src/lib/auth/crypto.ts:48` (`cookieName`), `src/lib/github/backend.ts:162` (`githubApp`), `src/lib/sveltekit/admin-action.ts:206` (`adminAction`), `src/lib/sveltekit/preview.ts:128,197,431` (`previewMint`, `previewRevoke`, `previewLoad`), `src/lib/sveltekit/health.ts:28` (`healthLoad`).
Breaks: `convention-bare-noun-functions` (ruled accept/closed) — *"An exported function's name begins with a verb."* The ruling's executed population was four names (`renderGlyph`, `defineFieldset`, `resolveOwnerLevelRoles`, `renderJsonLdScript`); these seven were never in it. `cairnManifest` is exempt (the ruling excludes host-ecosystem plugin factories).
Cost: **breaking**, seven names, low individual value.
Fix: the honest options are rename-all in one `Consumers must:` line, or amend the ruling's row to record the seven as a grandfathered set with the reason. Choosing silently is what leaves a ledger open; ranked last because neither option is urgent.

**F21. Two one-off verbs on the public surface.** `src/lib/content/excerpt.ts:46` (`deriveExcerpt`) and `src/lib/delivery/manifest.ts:56` (`diffNewlyPublished`) — `derive` and `diff` each appear exactly once, against `convention-verb-rules`'s six-verb vocabulary (`verify`/`validate`/`read`/`parse`/`build`/`create`), where both are pure-data derivations and so belong to `build*`.
Cost: **breaking**, trivial, and both are on `/delivery`+`/delivery/data`.
Fix: `buildExcerpt`, `buildNewlyPublished` — or record the two as accepted vocabulary extensions on the ruling's row. Bundle with F3's `serializeManifest` rename since they land on the same subpath.

---

## 2. Checked and found consistent

Say the family read covered these; none needs pass work.

- **The canonical-home rule holds.** Every duplicated name across the 18 subpaths carries an R4 re-export comment naming its home and the signature that forces it (`src/lib/index.ts:117,135,139,143`; `sveltekit/index.ts:71,95,109`; `delivery/index.ts:16`; `delivery/data.ts:8`). Spot-checked `RateLimitLike` across four subpaths — one declaration (`src/lib/cloudflare/rate-limit.ts:13`), three recorded re-exports.
- **The `/delivery` ÷ `/delivery/data` cut is exactly what the barrels claim.** `/delivery` = `/delivery/data` plus nine names, all of which are the route loaders and their closure (`composeEntryData`, `createPublicRoutes`, `EntryData`, `EntryDataOverrides`, `PublicRoutes`, `PublicRoutesConfig`, `SiteRender`, `MediaResolve`, `MediaRef`). No leakage in the other direction.
- **The log vocabulary has no dead or undocumented events.** All 80 members of `CairnLogEvent` are emitted somewhere in `src/lib` and all 80 appear in `docs/reference/log-events.md`.
- **The `outcome` grammar is uniform where it is used.** Six `*Outcome` types, one discriminant key, kebab-case values throughout.
- **The `*Config` bag convention holds for the four rows `convention-parameter-bags` named**, and the factory/per-call `Config`/`Options` split holds for all seven per-call `*Options` types.
- **Every public factory declares a named return type** (`convention-contract-first-returns`): `AuthRoutes`, `EditorRoutes`, `ContentRoutes`, `NavRoutes`, `PublicRoutes`, `CairnAdminRoutes`, `AuthChannel`, `SectionAction`, `SiteIndexes`, `SiteResolver`, plus the two kit types under the interop carve-out. No `ReturnType<typeof f>` on the surface.
- **No export contradicts its reference page's stability tier or internal/public claim.** The deliberately-unexported types (`EntrySummary`, `DictionaryAddResult`/`Failure`, `TidyResult`/`Failure`, `VocabularySaveFailure`) each carry the indexed-access parenthetical `docs/reference/README.md:62` requires (`sveltekit.md:1180`, `:1211–1218`, `:1957`) — this is the one place the docs are doing more work than the gate requires, and it is right.
- **`createLinkResolver`/`createFragmentResolver` are constructible.** Their `SiteResolver` parameter is reachable as `createSiteIndexes(...).site` even though `createSiteResolver` is internal, so the demotion left no dead public function. (The doc reference to it is F4; the reachability is fine.)
- **`/media`'s codec pair is symmetric**: `parseMediaToken`/`formatMediaToken`, both on one subpath, conforming to `convention-verb-rules`. It is the model F3 should follow.

---

## 3. Monolith split assessment

**Both splits are mechanical. Neither changes public behavior.** Verdict: take them.

Shared structure: each file is one exported factory over a single `ContentRoutesContext` (`content-routes-media.ts:401`, `content-routes-entry.ts:424`), each destructures only `const { runtime } = ctx`, and each returns a flat object of `(event) => …` closures that `content-routes.ts:59` merges into the composition root. There is no shared mutable closure state — the sub-factory pattern is already proven eight times over in the sibling domain files (`-shell`, `-list`, `-preview`, `-tidy`, `-settings`, `-dictionary`, `-context`, `-shared`).

**`content-routes-entry.ts` (1630 lines) → four clusters, zero cross-cluster calls:**

| Seam | Lines | Members | Private helpers that move with it |
|---|---|---|---|
| read | 424–750 | `createAction`, `editLoad`, `historyLoad` | `resolvePreview`, `revertSchemaDrift`, `retiredContentAdvisory`, `draftFromBranchHead`, `commitEditorName`, `HISTORY_LIMIT`, `EditData`, `FragmentTarget` |
| write | 751–1169 | `saveAction`, `publishAction`, `publishAllAction`, `discardAction` | `saveToBranch` (called only at `:934`, `:954`), `saveRefusal` |
| destructive | 1170–1311 | `deleteAction`, `listDeleteAction`, `renameAction` | `deleteEntry` (called only at `:1292`, `:1303`), `DeleteRefusal` |
| revert | 1500–1616 | `revertAction` | `draftExistsFailure` (called only at `:1560`, `:1566`, `:1592`) |

Every shared helper is used by exactly one cluster. The only genuinely shared item is `BUILTIN_FRONTMATTER_KEYS` (`:279`), which goes to `content-routes-shared.ts` or stays in a two-line `-entry-shared.ts`.

**`content-routes-media.ts` (1447 lines) → four clusters, one intra-cluster shared helper:**

| Seam | Lines | Members |
|---|---|---|
| library read | 412–496 | `mediaLibraryLoad` (+ `MediaLibraryData`, `MediaUsageInfo`, `originRank`, `branchKey`, `distinctEntryCount`) |
| ingest | 497–694 | `uploadAction`, `mediaLibraryUploadAction`, sharing `ingestAndStore` (called only at `:631`, `:645`) |
| delete + orphans | 695–1039 | `mediaDeleteAction`, `mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction` |
| metadata rewrite | 1040–1431 | `mediaUpdateAction`, `mediaReplacePreviewAction`, `mediaReplaceAction`, `mediaAltPreviewAction`, `mediaAltPropagateAction` |

Module-level primitives (`MEDIA_SLUG_RE`, `MEDIA_HASH_RE`, the four `MAX_*` bounds, `safeDecode`, `basename`, `sanitizeField`, `clampDimension`, `replacementToken`, `resolveMediaBucket`, and the three message constants at `:370–378`) go to a `content-routes-media-shared.ts`.

**Three things the split must preserve; all three are already gated:**

1. **Key order of the merged return object.** `content-routes.ts:117` states that the public key order "mirrors the historical single-factory shape … which `check:surface` pins as the public contract." Splitting `createEntryActions` into three or four sub-factories reshuffles nothing if `content-routes.ts` keeps its existing literal key order in the merge. `check:surface` fails the pass if it does not.
2. **Type re-export paths.** `content-routes.ts:30–48` re-exports `EditData`, `MediaLibraryData`, `MediaLibraryEntry` and friends from the two monoliths by name. Those `export type {…} from './content-routes-entry.js'` lines just change their source module. The `/sveltekit` barrel imports from `content-routes.js`, never from the domain files, so nothing on the surface moves.
3. **Seven engine-internal direct importers.** `src/lib/components/MediaAltFillDialog.svelte:19`, `FragmentPicker.svelte:13`, `media-library-helpers.ts:8`, `MediaOrphanTools.svelte:20`, `media-upload-outcome.ts:13`, `MediaReplaceDialog.svelte:25`, and `src/lib/reproductions/stories/support.ts:8` import types from the two monoliths by path. All are inside `src/lib`, so a split updates seven import lines — no consumer sees it. (Worth noting separately: these are `/components` files reaching into `/sveltekit`'s internals, which the `/sveltekit` barrel comment at `index.ts:1` says is server logic only. Not a public break; an architecture note for whoever next touches the components boundary.)

Recommended granularity: **four files from `-entry`, four from `-media`, plus one `-media-shared`**, giving a ~200–420-line ceiling per file that matches the existing sibling domain files. Splitting to fewer than three per monolith leaves a >600-line file and buys little.
