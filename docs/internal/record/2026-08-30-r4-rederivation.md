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
identical `CairnAdminRoutes` type alias sits at `:498`). All 20 are still named there, directly or
one level down through a directly-named result type's own declared shape (`MediaOrphanScanResult`
names `OrphanByteRow`/`BrokenRefRow`; `MediaAltPreviewPlan` names `MediaAltPreviewEntry` and
`BranchRef`, which itself names `AltPlacement`; `MediaReplacePreviewPlan` names
`MediaReplacePreviewEntry`, which names `RepointPlacement`; `MediaBulkDeleteResult` names
`BulkDeleteSkip`), because the composer keeps driving the wide internal shape Task 1 left
untouched. See "List (c)" immediately below for the full per-item accounting; all 20 route there.

Extending the identical mechanical test (a literal-name search of `api-surface.md:519`, then a
fixed-point search over each hit's own declared shape, repeated until no further retire-verdicted
names appear) to the full 94 finds 11 more names with the same property, bringing the
composer/reshape-blocked total to 31, not the plan's "roughly 21." Closing the fixed point took
about three rounds, since the deepest chain nests two levels (`MediaAltPreviewPlan` ->
`MediaAltPreviewEntry` -> `AltPlacement`; "List (c)" Tier 1 below spells out the full chain).
"List (c)" below carries the full list and section 4 carries the reasoning for treating this as an
honest extension of bullet 5's own test rather than a new proposal.

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
`DictionaryAddResult`/`TidyResult`). Running the same mechanical test (search
`api-surface.md:519` for a literal name match, then follow the nesting through each hit's own
declared shape to a fixed point, about three rounds since the deepest chain runs two levels deep)
against the full 94 finds 25 Tier-1 items and 6 further Tier-2 items coupled to the
separately-tracked `ContentFormFailure` reshape — 31 total, not "roughly 21." This record
uses the full 31 for list (c)'s IN-94 half rather than the plan's literal 20, because: (a) the
partition arithmetic still closes exactly (0 + 63 + 31 = 94); (b) the plan's own reasoning for the
test ("the retires pass needs the per-item blocker or it will attempt deletions that break the R4
closure") argues for completeness over literalism, since under-reporting here has a real cost
(broken builds); and (c) every addition is independently mechanically verified, not a judgment
call. Reported as a deviation, per this task's instructions, rather than silently substituted.

## 5. Partition acceptance

| Component | Count |
|---|---|
| List (a) | 0 |
| List (b) | 63 |
| List (c), IN-94 half | 31 |
| **Sum** | **94** |

Exact. `DEFAULT_ROLES` (list (c), OUT-OF-94 half) sits outside this sum, as the plan specifies.
List (a) matches the `check:surface` diff (green, so an empty list matches trivially).

## 6. The ratification gate

List (c) (31 IN-94 items, all a same-verdict execution-order finding rather than a keep/retire
flip this pass proposes, plus the 1 OUT-OF-94 `DEFAULT_ROLES` naming) goes to Geoff at the
pass-end checkpoint, before the retires pass plan is authored. The charter adjudicates; the ledger
records. Unlike the reconciliation items in section 2 (already executed and ledgered), nothing in
list (c) has been executed; it is the retires pass's dependency map, not a set of already-decided
verdicts.
