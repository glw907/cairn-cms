# The single R4 closure re-derivation: the retires pass's input

Written 2026-08-30 by foundations B, Task 2. The initiative design (`2026-08-27-audit-remediation-
initiative-design.md`, §3) refers to this document by the placeholder name
`2026-08-27-r4-rederivation.md`; this file carries this pass's own date and is the one the retires
pass actually reads. Derivation input is `docs/internal/api-surface.md` as merged through
foundations B Task 1 (`e743f624`): 411 exported names across 18 subpaths, `/sveltekit` publishing
193 of them (both figures re-measured directly against the file, not carried from memory).

**Method.** No closure-derivation tooling exists under `scripts/`; two machine inputs the audit
did not have are starting points, not a substitute for the derivation: `check-surface.mjs`'s
rendered per-subpath shapes (`docs/internal/api-surface.md`) and the 120-entry
`scripts/checks/check-surface-reexports.json`. Everything below was derived by hand, cross-checked
with short Python scripts run in the session scratchpad
(`/tmp/claude-1000/.../scratchpad/*.py`, not committed: they only ever read
`docs/internal/engine-rulings.md`, the `2026-08-26-any-site-audit/` corpus, and
`docs/internal/api-surface.md`, and wrote nothing back). Where a script's output is load-bearing
for a claim below, the claim also states what it mechanically checked, so a reader can redo it by
hand.

## 1. Re-testing the C2_READDED keeps and the three closure leaks

`src/tests/unit/root-barrel-prune.test.ts:89-112`'s `C2_READDED` list (22 names: the fifteen field
arms, `BehaviorTable`, `FieldBehavior`, `DatePrefix`, `ManifestEntry`, `ReferenceEdge`, `SlotDef`,
`RoutingRule`) still passes (`npx vitest run src/tests/unit/root-barrel-prune.test.ts`, 6/6
green), and every one of the 22 is still ledgered `keep` under `audit-adapter-*`. The carried
caveat at `2026-08-26-any-site-audit.md:93-97` is re-tested, not re-argued: reading
`verify-adapter-concept-model.md`'s "Corrections that do not flip a verdict" item 2 (its own
lines 181-186) against the merged `api-surface.md` confirms all three closure leaks are still
live:

- `NavIcon`: exported only from `/sveltekit` (`api-surface.md:588`), while root (`.`) exports
  `NavLayoutEntry` (`:78`) whose `icon` member names it. A root-only consumer holding
  `NavLayoutEntry` gets the expanded literal union, not the type name.
- `EngineScreenId`: same shape, via root's `NavLayoutEngineRef` (`:77`) and `/sveltekit`'s
  `EngineScreenId` (`:540`).
- `SlotKind`: exported from **no** subpath. Root's `SlotDef` (`:108`) and `/sveltekit`'s `SlotDef`
  (`:644`) both render `kind` as the expanded literal union; nothing exports the name.

None of the three leaks is a duplicate-publication defect, so `check:surface`'s canonical-home
rule cannot see them (it fires on an unrecorded duplicate, not a missing publication); this is a
live instance of the move-set record's inheritance note 4, R-0's second direction ("an export the
engine could use and does not is a shape defect"), still unowned by any gate or slice. It is out
of scope for this record: none of the three is an exported name carrying a retire verdict, so none
of them is a candidate for list (b) or list (c) below. Naming it here so the gap stays visible
rather than silently re-closed by the C2_READDED re-test passing.

## 2. Reconciliation: the ledger against the record

The ledger carries 535 `any-site audit` entries (533 with the ordinary `(verdict, date, any-site
audit)` suffix plus two with a semicolon-annotated supersession: `audit-sveltekit-
medialibraryentry` at `:1360` and `audit-admin-statuschiptone` at `:2322`). Totals: 384 keep / 57
reshape / 94 retire, exact against the plan's stated figures. Eleven buckets by slug prefix; nine
reproduce their family's rank-plus-verify tally exactly. The two that do not, and the ONE item
each (not a 94-slug hunt):

**`audit-sveltekit-*` (130 entries, matching `rank-route-factories.md`'s 130 ranks one-for-one).**
The pre-verification tally there is 65 keep / 17 reshape / 48 retire (the "48" `coherence-
v2.md:496` cites). Applying `verify-route-factories.md`'s 13 overturns in full (rank 47
`InboundLink` retire-to-keep; rank 62 `PublishActionLink` keep-to-retire; rank 38 `UploadResult`
reshape-to-retire; ranks 66/69/72/78 `AuthRoutes`/`EditorRoutes`/`NavRoutes`/`CairnAdminRoutes`
reshape-to-keep; rank 99 `SlotDef` reshape-to-keep; rank 101 `EmailAttachment` reshape-to-keep;
ranks 82/83/84 the nav resolver/validator reshape-to-retire; rank 108 `AdminActionOptions`
reshape-to-retire) yields 71 keep / 6 reshape / 53 retire, exactly the record's figure. The
ledger's actual 72/6/52 differs by one item: `MediaLibraryEntry` (rank 35), which
`verify-route-factories.md`'s "Ranks 34-37, 39-46" section upholds as retire ("does appear in a
documented public prop... but that prop sits in the explicitly-Unstable wiring table... not a
contract"), but whose ledger entry (`:1360`) is annotated "supersedes the audit's retire" on later
evidence: the move-set record's R4 re-export table (`2026-08-29-foundations-a-move-set.md:242`)
shows `EditData` and `MediaLibraryData` name it on `/sveltekit`, so it survives as a recorded
re-export from its `/admin-toolkit` home. This supersession is already executed and ledgered; it
is not a new proposal.

**`audit-admin-*` (59 entries, matching `rank-admin-shell-toolkit.md`'s 59 items one-for-one).**
The pre-verification tally is 40 keep / 5 reshape / 14 retire.
`verify-admin-shell-toolkit.md` contains two verification passes over the same 59 items (a first,
ending in its own "Summary: 37 of 40 verdicts stand. Three do not: `SelectInput`, `TextInput`,
`SelectInputOption` move from keep to retire", and a second, headed "(38 items)", which
reconsiders and keeps `SelectInputOption`/`SelectInput` on a narrower basis while softening
`TextInput` to reshape, then separately flips `itemNoun` keep-to-retire). The ledger encodes the
FIRST pass's harsher verdict for the three field-tier items (`SelectInputOption`, `SelectInput`,
`TextInput` are all `retire` in the ledger, not the second pass's keep/keep/reshape) plus the
second pass's `itemNoun` flip: four keep-to-retire flips, none touching reshape, giving 36 keep /
5 reshape / 18 retire, exactly the record's figure. The ledger's actual 35/5/19 differs by one
item: `StatusChipTone`, which both of `verify-admin-shell-toolkit.md`'s passes agree is a keep
("34-37... KEEP stands", `:373-379`), but whose ledger entry (`:2322`) is annotated "superseded by
the 2026-08-24 owner probe" on later, out-of-corpus evidence (the illegible-dot finding that also
drives `StatusChip`'s own reshape at rank 50, `CHANGELOG.md:157-159`). Also already executed and
ledgered, not a new proposal.

**Both reconciliation items are pre-existing ledger annotations verified against the corpus, not
new work this task performs.** Neither changes the 535/384/57/94 totals; each explains one of the
two per-bucket deltas the plan's finalization anticipated.

## 3. The three lists

### List (a): retires already consumed — EMPTY, both halves

`npm run check:surface` on the merged tree exits 0 with "surface matches the committed snapshot,"
confirming nothing has executed since Task 1 landed. Per FINALIZATION NOTE 2, foundations A's
Task 2 moved keeps only (its own move rule: "RETIRES die in place"), and this pass's Task 1 closes
`audit-sveltekit-contentroutes` alone (`createCairnAdmin`'s rendered return still names every
janitorial type after the narrowing, per its own ledger entry's `Shape:` line at
`engine-rulings.md:1643`, which this record references rather than restates). Zero contributors on
either half; an empty list matches the diff trivially.

### List (b): retires requiring manual execution — 63 items

**Composer-blocking test (bullet 5).** Each of ranks 1-13/17-22/38 (20 names:
`OrphanByteRow`, `BrokenRefRow`, `BulkDeleteSkip`, `RepointPlacement`, `AltPlacement`,
`BranchRef`, `MediaOrphanScanResult`, `MediaOrphanPurgeResult`, `MediaAltPreviewEntry`,
`MediaAltPreviewPlan`, `MediaReplacePreviewEntry`, `MediaReplacePreviewPlan`,
`MediaBulkDeleteResult`, `MediaAltPropagateFailure`, `MediaBulkFailure`, `MediaUpdateFailure`,
`MediaReplaceFailure`, `MediaDeleteRefusal`, `MediaUploadFailure`, `UploadResult`) was tested
against `createCairnAdmin`'s rendered return (`api-surface.md:519`; the parallel, currently
identical `CairnAdminRoutes` type alias sits at `:498`). All 20 are still named there, directly,
one level down, or (for `AltPlacement` and `RepointPlacement`) two levels down through a
directly-named result type's own declared shape (`MediaOrphanScanResult` names
`OrphanByteRow`/`BrokenRefRow`; `MediaAltPreviewPlan` names `MediaAltPreviewEntry` and
`BranchRef`; `MediaAltPreviewEntry` itself names `AltPlacement`; `MediaReplacePreviewPlan` names
`MediaReplacePreviewEntry`, which names `RepointPlacement`; `MediaBulkDeleteResult` names
`BulkDeleteSkip`), because the composer keeps driving the wide internal shape Task 1 left
untouched. See "List (c)" immediately below for the full per-item accounting; all 20 route there.

Extending the identical mechanical test — scoped, precisely as Tier 1 below states its own scope,
to `createCairnAdmin`'s `actions` record rather than the whole of `:519` (a literal-name search of
the `actions` record's text, then a fixed-point search over each hit's own declared shape, repeated
until no further retire-verdicted names appear) — to the full 94 finds 11 more names with the same
property, bringing the `actions`-scoped composer-blocked total to 31, not the plan's "roughly 21."
Closing that fixed point took about three rounds, since the deepest chain nests two levels
(`MediaAltPreviewPlan` -> `MediaAltPreviewEntry` -> `AltPlacement`; "List (c)" Tier 1 below spells
out the full chain).

**This 31-item figure is deliberately narrower than the whole of `:519`.** Running the identical
fixed point over `:519`'s FULL text, `load: Promise<AdminData>` and `shellLoad` included rather
than `actions` alone, closes in four rounds at **48** retire-verdicted names, not 31: the 17 extras
all arrive through the `load` half, via `AdminData` (`api-surface.md:478`), not through `actions`.
Section 5 below (F-1) names all 17, plus 2 more the `:519` fixed point cannot reach by any scope
(they are named inside a different keep entirely), and the open question they raise. "List (c)"
below carries the full 31-item accounting used by this record, and section 4 carries the reasoning
for treating the 31 as an honest extension of bullet 5's own test rather than a new proposal.

**List (b) is therefore 94 − 0 (list a) − 31 (list c, IN-94 half) = 63 items.** Mechanically
generated (ledger `retire` entries minus the 31 in section 3's list (c)), by family:

| Family | Count |
|---|---|
| `audit-adapter` | 2 |
| `audit-admin` | 19 |
| `audit-auth` | 5 |
| `audit-cli` | 3 |
| `audit-delivery` | 6 |
| `audit-render` | 4 |
| `audit-repro` | 3 |
| `audit-sveltekit` | 21 |
| **Total** | **63** |

| Name | Ledger slug | Ledger anchor |
|---|---|---|
| `roleHome` | `audit-adapter-rolehome` | `:415` |
| `StandardSchemaV1` | `audit-adapter-standardschemav1` | `:268` |
| `ageFromBirthdate` | `audit-admin-agefrombirthdate` | `:2076` |
| `AppliedFilterPill` | `audit-admin-appliedfilterpill` | `:2125` |
| `computeAppliedFilters` | `audit-admin-computeappliedfilters` | `:2118` |
| `computeCountLine` | `audit-admin-computecountline` | `:2111` |
| `computeItemRange` | `audit-admin-computeitemrange` | `:2132` |
| `computePageWindow` | `audit-admin-computepagewindow` | `:2146` |
| `FieldRow` | `audit-admin-fieldrow` | `:2104` |
| `formatMoney` | `audit-admin-formatmoney` | `:2083` |
| `FormatMoneyOptions` | `audit-admin-formatmoneyoptions` | `:2090` |
| `formatPhone` | `audit-admin-formatphone` | `:2062` |
| `FormatPhoneOptions` | `audit-admin-formatphoneoptions` | `:2069` |
| `itemNoun` | `audit-admin-itemnoun` | `:2362` |
| `ItemRange` | `audit-admin-itemrange` | `:2139` |
| `PageWindowItem` | `audit-admin-pagewindowitem` | `:2153` |
| `SelectInput` | `audit-admin-selectinput` | `:2226` |
| `SelectInputOption` | `audit-admin-selectinputoption` | `:2219` |
| `STATUS_CHIP_DOT_CLASS` | `audit-admin-status-chip-dot-class` | `:2097` |
| `StatusChipTone` | `audit-admin-statuschiptone` | `:2322` |
| `TextInput` | `audit-admin-textinput` | `:2233` |
| `CHANNEL_SCHEMA_VERSION` | `audit-auth-channel-schema-version` | `:2512` |
| `devDelivery` | `audit-auth-devdelivery` | `:2520` |
| `generateCsrfToken` | `audit-auth-generatecsrftoken` | `:2496` |
| `generateSessionId` | `audit-auth-generatesessionid` | `:2504` |
| `insertOwnerIfEmpty` | `audit-auth-insertownerifempty` | `:2527` |
| `check:dogfood tripwire proposed into cairn-audit (coherence C13 / R-8)` | `audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c` | `:3803` |
| `skill.admin-screens check and cairn-doctor --fix` | `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix` | `:3817` |
| `unlistedRoutes proposed as a cairn-audit rendered rule` | `audit-cli-unlistedroutes-proposed-as-a-cairn-audit-rendered-rule` | `:3810` |
| `AI_CRAWLERS` | `audit-delivery-ai-crawlers` | `:2775` |
| `AI_CRAWLERS_REVIEWED` | `audit-delivery-ai-crawlers-reviewed` | `:2761` |
| `AiCrawler` | `audit-delivery-aicrawler` | `:2768` |
| `feedView` | `audit-delivery-feedview` | `:2783` |
| `PublicRoutes` | `audit-delivery-publicroutes` | `:2797` |
| `unlistedRoutes` | `audit-delivery-unlistedroutes` | `:2790` |
| `cardShell` | `audit-render-cardshell` | `:3106` |
| `headRow` | `audit-render-headrow` | `:3120` |
| `iconSpan` | `audit-render-iconspan` | `:3113` |
| `isElement` | `audit-render-iselement` | `:3127` |
| `ReproFenceValidation` | `audit-repro-reprofencevalidation` | `:3188` |
| `ReproInstance` | `audit-repro-reproinstance` | `:3181` |
| `stories` | `audit-repro-stories` | `:3165` |
| `AdminActionOptions` | `audit-sveltekit-adminactionoptions` | `:1887` |
| `AdvisoryAction` | `audit-sveltekit-advisoryaction` | `:1432` |
| `AdvisoryNotice` | `audit-sveltekit-advisorynotice` | `:1439` |
| `ConfirmData` | `audit-sveltekit-confirmdata` | `:1468` |
| `EditorsData` | `audit-sveltekit-editorsdata` | `:1482` |
| `EntrySummary` | `audit-sveltekit-entrysummary` | `:1425` |
| `FragmentTarget` | `audit-sveltekit-fragmenttarget` | `:1353` |
| `GettingStarted` | `audit-sveltekit-gettingstarted` | `:1404` |
| `HistoryEntry` | `audit-sveltekit-historyentry` | `:1418` |
| `LinkTarget` | `audit-sveltekit-linktarget` | `:1454` |
| `LoginData` | `audit-sveltekit-logindata` | `:1475` |
| `MarkdownReferenceRow` | `audit-sveltekit-markdownreferencerow` | `:1411` |
| `MediaUsageInfo` | `audit-sveltekit-mediausageinfo` | `:1375` |
| `NavConcept` | `audit-sveltekit-navconcept` | `:1397` |
| `NavPageOption` | `audit-sveltekit-navpageoption` | `:1390` |
| `PublishActionLink` | `audit-sveltekit-publishactionlink` | `:1552` |
| `ResolvedPreview` | `audit-sveltekit-resolvedpreview` | `:1461` |
| `resolveNavLayout` | `audit-sveltekit-resolvenavlayout` | `:1706` |
| `ResolveNavLayoutOptions` | `audit-sveltekit-resolvenavlayoutoptions` | `:1698` |
| `TidyKeyProbeResult` | `audit-sveltekit-tidykeyproberesult` | `:1217` |
| `validateNavLayout` | `audit-sveltekit-validatenavlayout` | `:1714` |

Three of these (the `audit-cli-*` rows above) are process/tooling proposals the CLI-surface audit
ledgered as `retire` (decline the proposal), not exported names; "closing" them is a ledger-closing
act, not a deletion. Flagging so the retires pass does not go looking for a symbol.

**The two inherited cautions apply to every row above.** First (inheritance note 2): a green
`check:surface` proves record membership, not justification — appending a re-export record for a
name the narrowed closure no longer needs would launder it green, so the retires pass removes the
now-unjustified duplicate rather than recording it. Second (inheritance note 3): the 122-name
multi-subpath count did not move in foundations A (only publications-per-name fell: 5-way 5 to 0,
4-way 44 to 34, 3-way 10 to 12, 2-way 63 to 76, re-verified unchanged on the merged tree), so
executing every row above and leaving `check:surface` green does not by itself satisfy
`coherence-v2.md:134-135`'s literal R-1 ask (fail on any two-barrel name); the gate is
fail-unless-recorded, and a name can be recorded and duplicated forever without a code change to
challenge it.

**Re-evaluating foundations A's recorded R4 re-exports against the narrowed closure
(inheritance notes 2-3).** The move-set record's 120-row table and `scripts/checks/check-surface-
reexports.json` agree exactly (both machine and reader copy): 120 total, 64 on `/sveltekit`.
Cross-checked directly against the JSON: exactly one of the 64 names `createContentRoutes` in its
`reason` field (`CairnRuntime`, home `.`, `"R4 closure: createContentRoutes, previewLoad,
createMediaRoute name it on this subpath"`), and `CairnRuntime` survives regardless of the
narrowing since `previewLoad` and `createMediaRoute` also name it. Zero name `createCairnAdmin` or
`CairnAdminRoutes`. **The narrowing strikes at most zero re-export records.** (The move-set
record's own prose at `:12-13` says "Sixty-two"; its table and the JSON both say 64. This record
uses 64, per the plan's finalization; the prose in the move-set record is left unrepaired, since
this task does not otherwise write to that file, and is noted here per the plan's own fallback.)

### List (c): verdict changes

**IN-94 half (31 items, participates in the partition arithmetic).**

*Tier 1 — directly composer-blocked by `createCairnAdmin`'s own `actions` record (25 items).*
The table below is the literal-token half: each row's blocking action names its listed type
directly in `api-surface.md:519`. The other Tier 1 members arrive one level down, through one of
these directly-named types' own declared shape (counted after the table):

| Blocking action (in `createCairnAdmin`'s return, `:519`) | Names it blocks |
|---|---|
| `mediaOrphanScan: Promise<MediaOrphanScanResult \| ActionFailure<MediaBulkFailure> \| ...>` | `MediaOrphanScanResult`, `MediaBulkFailure` |
| `mediaOrphanPurge: Promise<MediaOrphanPurgeResult \| ActionFailure<MediaBulkFailure> \| ...>` | `MediaOrphanPurgeResult` |
| `mediaBulkDelete: Promise<MediaBulkDeleteResult \| ActionFailure<MediaBulkFailure> \| ...>` | `MediaBulkDeleteResult` |
| `mediaAltPreview: Promise<MediaAltPreviewPlan \| ActionFailure<MediaAltPropagateFailure> \| ...>` | `MediaAltPreviewPlan`, `MediaAltPropagateFailure` |
| `mediaAltPropagate: Promise<ActionFailure<MediaAltPropagateFailure> \| ...>` | (dup of above) |
| `mediaReplacePreview: Promise<MediaReplacePreviewPlan \| ActionFailure<MediaReplaceFailure> \| ...>` | `MediaReplacePreviewPlan`, `MediaReplaceFailure` |
| `mediaReplace: Promise<ActionFailure<MediaReplaceFailure> \| ...>` | (dup of above) |
| `mediaUpdate: Promise<ActionFailure<MediaUpdateFailure> \| ...>` | `MediaUpdateFailure` |
| `mediaDelete: Promise<ActionFailure<MediaDeleteRefusal> \| ...>` | `MediaDeleteRefusal` |
| `upload` / `mediaUpload` / `mediaLibraryUpload: Promise<ActionFailure<MediaUploadFailure> \| UploadResult \| ...>` | `MediaUploadFailure`, `UploadResult` |
| `dictionaryAdd: Promise<ActionFailure<DictionaryAddFailure> \| DictionaryAddResult \| ...>` | `DictionaryAddResult` |
| `tidy: Promise<ActionFailure<TidyFailure> \| TidyResult \| ...>` | `TidyResult` |
| `save: Promise<ActionFailure<NavSaveFailure> \| ...>` | `NavSaveFailure` |
| `settingsSave: Promise<ActionFailure<SettingsSaveFailure> \| ...>` | `SettingsSaveFailure` |
| `vocabularySave: Promise<ActionFailure<VocabularySaveFailure> \| ...>` | `VocabularySaveFailure` |

The last three rows are not media-janitorial and are not arms of `ContentFormFailure` (see Tier 2
below): `save`, `settingsSave`, and `vocabularySave` each wrap their own, unrelated failure type
directly in `createCairnAdmin`'s return, so `NavSaveFailure`, `SettingsSaveFailure`, and
`VocabularySaveFailure` carry the same direct-token signature as the janitorial items, not the
`ContentFormFailure`-reshape signature an earlier draft of this record mistakenly attributed to
them.

That is 15 action entries covering 17 directly-named types: `MediaOrphanScanResult`,
`MediaOrphanPurgeResult`, `MediaBulkDeleteResult`, `MediaAltPreviewPlan`,
`MediaAltPropagateFailure`, `MediaReplacePreviewPlan`, `MediaReplaceFailure`,
`MediaUpdateFailure`, `MediaDeleteRefusal`, `MediaUploadFailure`, `UploadResult`,
`DictionaryAddResult`, `TidyResult`, `MediaBulkFailure`, `NavSaveFailure`, `SettingsSaveFailure`,
`VocabularySaveFailure`. Five of these seventeen — `MediaDeleteRefusal`, `MediaUpdateFailure`,
`MediaReplaceFailure`, `MediaAltPropagateFailure`, `MediaBulkFailure` — are also literal arms of
`ContentFormFailure`'s own declaration (`content-routes.ts:97-99`: `Partial<SaveFailure &
DeleteRefusal & RenameFailure & CreateFailure & PreviewMintFailure & MediaDeleteRefusal &
MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure &
TidyFailure>`), so a `ContentFormFailure` reshape that narrows those five has to rework that
declaration too, not only `createCairnAdmin`'s action union; both blockers apply to these five at
once.

Plus one level of transitive membership through the four directly-named plan/result types that are
themselves composite (`MediaOrphanScanResult.orphanedBytes: OrphanByteRow[]`,
`.brokenRefs: BrokenRefRow[]`; `MediaAltPreviewPlan.entries: MediaAltPreviewEntry[]`,
`.branchDelta: BranchRef[]`; `MediaReplacePreviewPlan.entries: MediaReplacePreviewEntry[]`,
`.branchDelta: BranchRef[]`; `MediaBulkDeleteResult.skipped: BulkDeleteSkip[]`), and one further
level through `MediaAltPreviewEntry.placements: AltPlacement[]` and
`MediaReplacePreviewEntry.placements: RepointPlacement[]`: `OrphanByteRow`, `BrokenRefRow`,
`MediaAltPreviewEntry`, `BranchRef`, `AltPlacement`, `MediaReplacePreviewEntry`,
`RepointPlacement`, `BulkDeleteSkip` — 8 more names. 17 + 8 = 25. (`DictionaryAddResult` and
`TidyResult`, ranks 14 and 16, sit outside the plan's literal "ranks 1-13/17-22/38" scope but
carry the identical direct-name property; ranks 1-13, 17-22, and 38 total 20 of these, matching
the plan's bullet exactly. `NavSaveFailure`, `SettingsSaveFailure`, and `VocabularySaveFailure`
also sit outside the plan's literal ranks but carry the same direct-name property, which is why
this revision folds them into Tier 1 rather than Tier 2.)

*Tier 2 — the five core content-action failures actually spread into `ContentFormFailure`'s
declaration, plus `UsageEntry` (6 items, a different, already-known dependency, not a new
createCairnAdmin-narrowing question).* `ContentFormFailure` (`audit-sveltekit-contentformfailure`,
ranked 31, an OPEN reshape the conventions pass owns per this pass's Task 1 finalization note) is
the eleven-way `Partial<SaveFailure & DeleteRefusal & RenameFailure & CreateFailure &
PreviewMintFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure &
MediaAltPropagateFailure & MediaBulkFailure & TidyFailure>` (`content-routes.ts:97-99`: five core
arms, five media arms already counted in Tier 1 above, one tidy arm). The five core arms —
`SaveFailure`, `DeleteRefusal`, `RenameFailure`, `CreateFailure`, `PreviewMintFailure` — are each
also directly named in `createCairnAdmin`'s own action union (`publish`, `delete`, `rename`,
`create`, `previewMint` each wrap one in `ActionFailure<...>` at `:519`), but the fix for any of
them is not "narrow `createCairnAdmin`": these five stay on the composer as core, non-janitorial
actions, so the only way to retire one is to land the `ContentFormFailure` reshape first, a
dependency the ledger already records independently. `ContentFormFailure`'s own rendered shape
also carries `usage?: UsageEntry[]` directly (`api-surface.md:512`), which makes `UsageEntry` the
sixth Tier 2 name — not, as an earlier draft of this record claimed, a name pulled in through
`DeleteRefusal.inboundLinks`. `DeleteRefusal`'s rendered shape is `{ error: string; inboundLinks:
InboundLink[]; inboundKind?: "link" | "include"; id: string }` (`api-surface.md:529`) and carries
no `usage` field at all (`InboundLink` is itself a ledgered keep, not a retire-verdicted name, so
that path leads nowhere further for this accounting). The `{ error; hash; usage: UsageEntry[];
foundIn }` shape belongs to `MediaDeleteRefusal` (`:570`) and `MediaReplaceFailure` (`:577`), both
already Tier 1, and to `BrokenRefRow` (`:495`) and `BulkDeleteSkip` (`:496`), also already Tier 1
via the transitive membership above. Tier 2, in full: `CreateFailure`, `DeleteRefusal`,
`PreviewMintFailure`, `RenameFailure`, `SaveFailure`, `UsageEntry`.

25 (Tier 1) + 6 (Tier 2) = **31**, the IN-94 half of list (c).

**One sentence each, diffed against foundations A's move set:** none of the 31 appears in the
move-set record's "Moved names (18)" table or "Unmoved by verdict" section (all 31 are
`/sveltekit`-only names foundations A's canonical-home rule never touched, since that rule
targets multi-subpath duplication and none of these 31 publishes from a second subpath), so this
finding carries zero churn against foundations A's executed work.

**OUT-OF-94 half (1 item, recorded and ratified separately, outside the partition arithmetic).**
`DEFAULT_ROLES` (`audit-adapter-default-roles`, ledger `:276`, currently a **keep**) becomes a
retire only inside the conventions pass's coupled `defineAccess` pair, per the initiative design
§3's own naming of it as an exclusion from the retires pass's scope. It is not one of the current
94 retires, so it does not enter the sum below; it is named here, matching the plan's own
parenthetical, so a reader does not wonder why it is absent from lists (a)/(b)/(c)'s IN-94 half.

## 4. The composer-blocking finding as a deviation from the plan's literal scope

The plan's bullet 5 names ranks 1-13/17-22/38 (20 items) and estimates "roughly 21" composer-
blocked. Testing exactly that scope confirms all 20 blocked (Tier 1 above, minus
`DictionaryAddResult`/`TidyResult`). Running the same mechanical test — scoped to
`createCairnAdmin`'s `actions` record, matching Tier 1's own stated scope, NOT the whole of
`:519` (search the `actions` record's text for a literal name match, then follow the nesting
through each hit's own declared shape to a fixed point, about three rounds since the deepest chain
runs two levels deep) — against the full 94 finds 25 Tier-1 items and 6 further Tier-2 items
coupled to the separately-tracked `ContentFormFailure` reshape — 31 total, not "roughly 21." This
record uses the full 31 for list (c)'s IN-94 half rather than the plan's literal 20, because: (a)
the partition arithmetic still closes exactly (0 + 63 + 31 = 94); (b) the plan's own reasoning for
the test ("the retires pass needs the per-item blocker or it will attempt deletions that break the
R4 closure") argues for completeness over literalism; and (c) every addition is independently
mechanically verified, not a judgment call. Reported as a deviation, per this task's instructions,
rather than silently substituted.

**Correction to the severity claim above.** "Break the R4 closure" does not mean "break the
build," and this record's own reasoning at the previous paragraph's clause (b) overstated it: it
originally read that under-reporting here "has a real cost (broken builds)." Checked directly:
`createCairnAdmin`'s own rendering already names `DictionaryAddFailure` and `TidyFailure` (arms of
the `dictionaryAdd`/`tidy` actions' `ActionFailure<...>` at `:519`), and NEITHER is exported from
any subpath — `grep -c "DictionaryAddFailure\|TidyFailure" docs/internal/api-surface.md` finds
only the three uses inside other types' rendered bodies, no `- \`DictionaryAddFailure\`:` or
`- \`TidyFailure\`:` declaration of its own — yet `npm run check:surface` is green today. A
retire-verdicted name living unexported inside a rendered keep shape is the `NavIcon`/
`EngineScreenId`/`SlotKind` class of defect from section 1: a closure leak `check:surface`'s
duplicate-publication rule cannot see, not a compile failure. The corrected claim: under-reporting
here manufactures more closure leaks of a kind the record already flags as unowned, which is a
real cost, just not the one originally stated. F-1 below (section 5) is the concrete instance.

## 5. F-1: nineteen of list (b)'s rows are named inside keep-verdicted rendered shapes

Confirmed by the pass-end engine-triage review of this record. Section 4's own method, run
faithfully over the WHOLE of `createCairnAdmin`'s rendered return at `:519` rather than the
`actions` record alone, finds 17 more retire-verdicted names reachable through the `load` half
(`load: (event) => Promise<AdminData>`, `api-surface.md:478`) — none of them Tier 1 or Tier 2
above, all 17 currently sitting in list (b) as "ready for direct execution." Broadening the test
once more, from "reachable from `createCairnAdmin`'s own rendering" to "named inside ANY
keep-verdicted export's rendered public shape" (the same test C2_READDED and the section 1 closure
leaks apply, just run against list (b) instead of the root barrel), finds 2 more: `AdminActionOptions`
and `ReproInstance`, neither reachable from `:519` by any fixed point, since one is a parameter type
of an unrelated keep (`adminAction`) and the other is named by a keep in the render/reproductions
family (`ReproStory`) with no relationship to the admin composer at all. 17 + 2 = **19**.

| Name | Ledger anchor | Named inside (keep-verdicted export) |
|---|---|---|
| `AdminActionOptions` | `:1887` | `adminAction` (`api-surface.md:472`, **parameter position** — the hardest case: a consumer calling `adminAction` cannot name its own deps type once this retires) |
| `AdvisoryNotice` | `:1439` | `EditData` (`:531`) |
| `AdvisoryAction` | `:1432` | `AdvisoryNotice` (`:481`), transitively |
| `LinkTarget` | `:1454` | `EditData` (`:531`) |
| `FragmentTarget` | `:1353` | `EditData` (`:531`) |
| `PublishActionLink` | `:1552` | `EditData` (`:531`) |
| `ResolvedPreview` | `:1461` | `EditData` (`:531`) |
| `LoginData` | `:1475` | `AdminData` (`:478`), `AuthRoutes` (`:488`), `createAuthRoutes` (`:518`) |
| `ConfirmData` | `:1468` | `AdminData` (`:478`), `AuthRoutes` (`:488`), `createAuthRoutes` (`:518`) |
| `EditorsData` | `:1482` | `AdminData` (`:478`), `EditorRoutes` (`:533`), `createEditorRoutes` (`:522`) |
| `EntrySummary` | `:1425` | `ListData` (`:561`) |
| `GettingStarted` | `:1404` | `HelpData` (`:552`) |
| `MarkdownReferenceRow` | `:1411` | `HelpData` (`:552`) |
| `HistoryEntry` | `:1418` | `HistoryData` (`:553`) |
| `MediaUsageInfo` | `:1375` | `MediaLibraryData` (`:572`) |
| `NavConcept` | `:1397` | `AdminShellData` (`:479`), `ReproStory` (`:456`) |
| `NavPageOption` | `:1390` | `NavLoadData` (`:593`) |
| `TidyKeyProbeResult` | `:1217` | `SettingsData` (`:642`) |
| `ReproInstance` | `:3181` | `ReproStory` (`:456`) |

Verified directly against `docs/internal/api-surface.md` line-for-line: every "named inside"
citation above is a literal member of the cited keep's own rendered declaration (spot-checked all
19; e.g. `EditData` at `:531` literally carries `linkTargets: LinkTarget[]`,
`fragmentTargets: FragmentTarget[] | null`, `publishActions: PublishActionLink[]`,
`preview: ResolvedPreview | null`, and `advisories: AdvisoryNotice[]`, five of the nineteen in one
export alone).

**The coupling to this pass's own overturns.** `LoginData`, `ConfirmData`, and `EditorsData`'s
keep-parents include `AuthRoutes` and `EditorRoutes` — and those two are keep ONLY because
`verify-route-factories.md`'s ranks 66/69 overturns (reshape-to-keep, applied faithfully in
section 2's reconciliation and Tier 1's own accounting above) restored them from the ranking's
original reshape verdict. Had those two overturns not stood, `AuthRoutes`/`EditorRoutes` would be
open reshapes rather than settled keeps, and three of these nineteen blockers would not exist in
their current form. This is not a reason to re-litigate ranks 66/69 (settled, per this record's
own instruction not to re-propose settled overturns) — it is the mechanism, named plainly, by
which a settled overturn in one family manufactures a fresh closure question in another.

**Nothing above changes list (b)/list (c) membership, the tier structure, or the partition
arithmetic.** The 63/31 split stands; these 19 names remain in list (b) as this record's tables
already show them. Section 7 (the ratification gate) carries the open question this finding
raises, for Geoff to rule on.

## 6. Partition acceptance

| Component | Count |
|---|---|
| List (a) | 0 |
| List (b) | 63 |
| List (c), IN-94 half | 31 |
| **Sum** | **94** |

Exact. `DEFAULT_ROLES` (list (c), OUT-OF-94 half) sits outside this sum, as the plan specifies.
List (a) matches the `check:surface` diff (green, so an empty list matches trivially).

## 7. The ratification gate

List (c) (31 IN-94 items, all a same-verdict execution-order finding rather than a keep/retire
flip this pass proposes, plus the 1 OUT-OF-94 `DEFAULT_ROLES` naming) goes to Geoff at the
pass-end checkpoint, before the retires pass plan is authored. The charter adjudicates; the ledger
records. Unlike the reconciliation items in section 2 (already executed and ledgered), nothing in
list (c) has been executed; it is the retires pass's dependency map, not a set of already-decided
verdicts.

**The open question F-1 raises (section 5), presented neutrally; this record does not choose.**
The 19 rows carry a genuine retire verdict, undisturbed, and each already sits somewhere a name
inside a keep's rendered shape stops it from being independently nameable once retired — the same
defect class section 1 flags as unowned for `NavIcon`/`EngineScreenId`/`SlotKind`, corrected in
scope by section 4 to a closure leak, not a build break. Two paths, argued for Geoff, not chosen
here:

- **(A) Move the 19 into list (c) as a Tier 3, each with its per-row blocker.** List (b) becomes 44
  items, list (c) becomes 50 (31 + 19), and the retires pass treats these exactly like Tiers 1-2:
  blocked pending further work. Their blockers, though, are not an internal composer shape the
  retires pass could plausibly narrow itself — `EditData`, `AdminData`, `ListData`, `HistoryData`,
  `HelpData`, `MediaLibraryData`, `NavLoadData`, `SettingsData`, `AdminShellData`, `AuthRoutes`,
  `EditorRoutes`, `ReproStory`, and `adminAction` are all hand-declared public contracts a site can
  hold directly (`AdminData` alone is the whole stock admin's page-data union), not an unexported
  internal type a narrowing split like Task 1's `createContentRoutesInternal` can peel away from.
  `coherence-v2.md:507-511`'s "narrow the declared surface, then let the closure follow" prescription,
  which licensed Task 1's `ContentRoutes` narrowing and this record's Tier 1/Tier 2 accounting, does
  not reach these: there is no narrower public type to declare in `EditData`'s place that a
  hand-mounting site could still use.
- **(B) Keep the 19 in list (b), with an explicit written sanction accepting nineteen new
  closure leaks of the `NavIcon` class.** The audit's own retire rationales for several of the
  nineteen arguably already intend this reading: `rank-route-factories.md:395` (rank 44) says
  `EntrySummary`'s helper-function scenario "is satisfied by `ListData['entries'][number]`";
  `verify-route-factories.md:103-104` (rank 62, the verifier's own keep-to-retire overturn) says
  `PublishActionLink` is only the resolved form, "read off `EditData.publishActions`";
  `rank-route-factories.md:385` (rank 43) says `HistoryEntry`'s anonymous consumer is "none by
  name; reached as `data.entries[i]`" — each already accepts that the retired name survives only
  as an unnamed structural member of a wider keep, which is precisely what a closure leak is.
  Retiring under this reading is consistent with the audit's own stated intent for these three
  (though not argued here for all nineteen); it leaves the leak-count where section 1 already
  carries an unresolved one (R-0's second direction, inheritance note 4), rather than opening a
  fourth.

This record takes no position between them. The charter adjudicates; Geoff rules at this
checkpoint, before the retires pass plan is authored.

### RULED (Geoff, 2026-08-30, at the foundations B pass-end checkpoint): hybrid

Neither (A) nor (B) whole. The split follows the position of the leak, which is where the
consumer cost actually differs:

- **The 18 return-position rows stay in list (b), sanctioned.** Each survives retirement as an
  unnamed structural member of its keep parent, read via indexed access
  (`ListData['entries'][number]`, `EditData['publishActions'][number]`, and so on), which is
  the reading the audit's own rationales state for ranks 43, 44, and 62 (quoted under (B)
  above). The sanction is explicit and per-name: the 18 are every F-1 row in section 5's table
  EXCEPT `AdminActionOptions`. The retires pass deletes them with the rest of list (b) and
  records each as an accepted `NavIcon`-class closure leak in its own move record.
- **`AdminActionOptions` moves to list (c) as Tier 3, one row.** It is the sole
  argument-position leak: a consumer passes a value of this type INTO `adminAction`
  (`api-surface.md:472`), and constructing a value of an un-nameable type is materially worse
  ergonomics than reading one (`Parameters<typeof adminAction>` gymnastics against a declared
  contract). Blocker: `adminAction`'s own declared signature names it; it retires only if a
  later ruling reshapes that signature or overturns the verdict. List (b) is therefore **62**,
  list (c) IN-94 is **32** (Tier 1: 25, Tier 2: 6, Tier 3: 1), and the partition in section 6
  reads 0 + 62 + 32 = 94, still exact.
- **The sanction arrives with an owner.** Accepting 18 new leaks quadruples the class
  (5 today, 23 after), so the ruling couples it to a gate rider, routed to the internals pass
  alongside the three leaks section 1 already flags as unowned: a `check:surface` rider that
  derives the leak set (a retire-or-absent name inside a rendered public shape) and fails on
  any UNRECORDED leak, the same fail-unless-recorded form the canonical-home rule uses. Until
  that rider lands, the retires pass's move record is the manual ledger of the 18.

Section 6's table is superseded by the figures above; it is left as written because it
records what this document stated at ratification time, and the retires pass plans against
this ruled section.

### ADDENDUM RULINGS (Geoff, 2026-08-30, after the adversarial pre-dispatch review of the retires plan)

Two engine-triage lenses (claims and mechanics) reviewed the retires pass plan against this
record, the ledger, and the tree. Four of their findings changed ratified counts or needed a
ruling; Geoff ruled each, and this addendum supersedes the RULED subsection's arithmetic
(0 + 62 + 32) the same way that subsection superseded section 6.

- **List (a) is 2, not 0.** `STATUS_CHIP_DOT_CLASS` (ledger `:2097`) and `StatusChipTone`
  (`:2322`) were retired and ledger-closed by the toolkit-seams pass; both are absent from
  `api-surface.md` and from `src/` (verified mechanically). Section 3's "EMPTY, both halves"
  derivation trusted a green `check:surface` diff, which is structurally blind to a retire
  executed before the snapshot existed; that method caveat is worth carrying to any later
  closure derivation.
- **`ReproFenceValidation` moves to list (c) Tier 2 (reshape-blocked).** It is named in the
  return of `validateReproFence` (`api-surface.md:467`), an open reshape (ledger `:3203`), so
  deleting it now manufactures an unrecorded leak this record's own F-1 test missed by
  construction (the test scanned keep-verdicted shapes only). It retires with or after that
  reshape in the conventions pass. Tier 2 is therefore 7.
- **The render trio (`cardShell` `:3106`, `headRow` `:3120`, `iconSpan` `:3113`) defers to
  the chassis pass as list (c) Tier 4 (chassis-coupled).** All three are value-imported by
  the showcase theme/chassis and the baked `templates/waymark` twins and taught as
  `docs/extend/configure-rendering.md`'s worked example; deleting them requires the chassis
  re-homing, `emit:template` re-bake, and guide rewrite in one change, which is slice 6's
  designed scope. (`isElement`, the fourth `audit-render` row, has no consumer-tree imports
  and live internal consumers; it executes in the retires pass under the keep-module-export
  disposition.)
- **`ReproInstance` stays sanctioned.** It appears only as a callback parameter
  (`ReproStory`'s `pose` hook, `api-surface.md:456`), which the return-position rationale
  does not literally cover, but a consumer only ever RECEIVES one (inference covers the
  inline callback; `Parameters<NonNullable<ReproStory['pose']>>[1]` covers the extracted
  helper), so the `AdminActionOptions` construction-ergonomics rationale does not transfer.

**Arithmetic as executed: 2 (list a) + 56 (list b: 38 unsanctioned + 18 sanctioned) + 36
(list c: Tier 1 25, Tier 2 7, Tier 3 1, Tier 4 3) = 94.** The standing-leak expectation
under the scoped predicate (retire-verdicted, absent from every export list, named in a
surviving rendered shape) is 20 after the pass: the 18 sanctioned plus `DictionaryAddFailure`
and `TidyFailure`; `NavIcon`/`EngineScreenId`/`SlotKind` are the expansion class, outside
that predicate and owned by the internals pass. The retires pass plan
(`docs/superpowers/plans/2026-08-30-retires-pass.md`) carries the full fold-in of both
reviews' findings.
