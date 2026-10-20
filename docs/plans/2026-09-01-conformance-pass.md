# Conformance Pass (4b) Implementation Plan

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js` with **`parallel: false` — every task writes
> `CHANGELOG.md`, most regenerate `docs/internal/api-surface.md`, and several close entries in
> one ledger file; execution is strictly sequential.** Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Execute the cross-surface conformance sweep the conventions pass unblocked: the 25
Tier 1 media-janitorial retires plus the `UsageEntry` retire, the routed reshapes, the ten
remaining log-event evenness fixes, the two audit registry-rule repairs, the five
`rendered.*` identifier renames, and the `variants` evidence sweep, all against 4a's merged
surface, batched into the standing `Consumers must:` window.

**Architecture:** This is audit-remediation slice 4b (initiative design
`docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`; routing list in
`docs/superpowers/plans/2026-08-30-conventions-pass.md`, "What this pass unblocks and hands
to 4b"). Every item executes a pre-existing, verify-confirmed audit verdict or a ruling from
Geoff's 2026-08-31 sitting; where rank and verify disagree, **the verify record wins** (the
stated conductor default, unobjected). The compiled evidence is the banked docket and usage
map at `docs/internal/record/2026-09-01-4b-planning-inputs/`; the sweep found **zero consumer
usage for all 25 Tier 1 symbols and 7 of the routed symbols**, so most retires carry no
consumer-breakage risk. One docket entry proved stale against `main` (StatusChip's
dot/register half already landed in the toolkit-seams pass); Task 10 is re-authored to the
ledger's actual open remainder, and the review-folds section records the staleness. This plan
absorbed a three-lens round-1 adversarial review (engine-triage, `web-auth-security-reviewer`,
and an Opus cleanliness-and-beauty reviewer); the findings and dispositions are in the
review-folds section at the end, and round 2 verifies the folded revision.

**Cleanliness and beauty are a pass dimension (Geoff, 2026-09-01).** Every reshape leaves
the surface MORE elegant — fewer concepts, even grammar, names that read well beside their
siblings — not merely legal; the visual tasks carry stated design intent per
`docs/internal/admin-design-system.md`, never mechanical compliance alone; doc updates leave
no scar tissue (no notes explaining absences, no exception clauses that read as clutter in a
year — provenance and triage epistemics live in the ledger, not on reference pages).

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate
(`npm run check` 0/0, `npm test` exit 0, plus the CI-derived gate list).

**Spec:** `docs/internal/record/2026-09-01-4b-planning-inputs/docket.md` (per-item shapes,
rank/verify citations, and the sitting's rulings) with
`docs/internal/record/2026-09-01-4b-planning-inputs/usage-map.md` (consumer evidence);
verdicts close in `docs/internal/engine-rulings.md`.

**Worktree:** `.claude/worktrees/conformance`, branched from `main` (4a merged at
`bc960fec`, so `main` carries the ruled conventions this pass builds against). After creating
it, run a from-scratch `npm ci` in `examples/showcase` before trusting any e2e (the worktree
showcase symlink gotcha, `CLAUDE.md`).

**Token ceiling:** 6M for the WHOLE pass (chains plus ritual; sized between the retires
pass's 4.6M actual, which this pass's Task 1 resembles, and 4a's 6.9M actual, which was
heavier per task than anything here). **Checkpoint interval:** every four tasks (STATUS
written at each checkpoint, at any split, and before any question).

## The sitting's rulings (Geoff, 2026-08-31; restated from the docket per its own instruction)

1. **`UsageEntry`: RETIRE.** The export drops; the shape stays as a module-internal named
   type (the docket's "inline at its one remaining use site" premise is false at HEAD — the
   type has eight-plus in-engine namers — so the module-internal branch is the executed
   form; see review fold ET-F-2). The consumer recovery is indexing off the carrier:
   `NonNullable<ContentFormFailure['usage']>[number]`.
2. **`PublishActionsConfig`: WIDEN to both aliases.** `ResolvedPublishAction` rides;
   verify-adapter-concept-model finding 9 is the authorization. (`ResolvedPublishAction` is
   source-internal — published from no barrel — so its retire is an alias deletion with no
   surface row and no `Consumers must:` line; see fold ET-F-4.)
3. **`rendered-*` harness ids: SETTLED AT PLAN AUTHORING.** Fresh derivation from
   coherence-v2 C16 plus `src/lib/audit/rendered.ts` (five constants, not C16's four); the
   exact rename set is in Task 13 below; no code runs on an unsettled list.
4. **Unused `variants` field: 4B, EVIDENCE-FIRST.** A config-key sweep across consumer
   configs first; retire if nothing sets it, keep-and-document if something does (Task 14).
   (The field is unused, not inert: the merge loop and `presetUrl` lookup are live wiring —
   see fold BR-N-4.)

Conductor defaults stated at the sitting and unobjected: **`UploadResult` executes the
VERIFIED retire** (the verify-wins rule; the ranked reshape-and-relocate to `/media` is
overturned by `verify-route-factories.md:126`), and **the `normalizeAssets` task is written
off the verify-corrected shape** (the rank note's `runtime.resolvedAssets` alternative is
circular-import-blocked; the propagation vector is the scaffold template, not the sites).

## Global Constraints

Carried from the 4a plan (same initiative, same window); every task inherits them.

- Test-first. The full gate is `npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived
  gate list re-derived from `.github/workflows/` before the first commit, never from memory.
- `check:surface -- --update` on any exported-type change, regenerated snapshot committed in
  the same task.
- Every public-API change updates its reference page in the same task; re-verify page lists
  with grep before editing.
- Every task adds its `CHANGELOG.md` line under `## Unreleased`, with a `Consumers must:`
  line where consumer action is needed. Renames batch into the window; no version bump, no
  publish. **The window must stay self-consistent: a task that re-introduces or re-shapes a
  name an earlier unpublished entry retired or instructed against AMENDS that earlier entry
  in the same task.**
- **Every breaking entry's `Consumers must:` line names the concrete recovery** (the
  replacement expression, the renamed import, the new call form), even when the sweep found
  zero usage — the package is public npm and the sweep is evidence about this estate only.
  Zero-usage evidence and staleness caveats live in the ledger entry, never in the public
  compatibility line (fold BR-F-7).
- A task executing a verdict closes (or progress-notes) its `docs/internal/engine-rulings.md`
  entry in the same task, with the one-line seam-fit report on accepts. A partially executed
  entry gets a progress note in the same task, always.
- Drift-hunt scope for every removed or renamed name: `docs/`, `src/` (comments),
  `examples/`, `packages/`, `templates/` (verification only, next bullet), and `skills/`
  (ships in the tarball). The reference-coverage gate does not catch a stale inbound link;
  grep for the old name AND its reference anchor.
- **`templates/waymark` is a GENERATED artifact and is never hand-edited** (the showcase is
  the single source; `scripts/build/emit-template.mjs`, wired as `npm run emit-template`).
  A task whose changes reach the template edits `examples/showcase`, regenerates, and commits
  the regenerated tree. `check:template` and `check:consumers` are both part of every task's
  gate.
- **"Retire" means removal from the public surface** (export rows drop from every barrel and
  the export map), not deletion of engine-internal code: a type still consumed in-process
  goes internal in the module that needs it, per the retires-pass precedent.
- **Line anchors in this plan are pre-pass anchors against `main` at `bc960fec`.** Tasks
  editing a file an earlier task already touched treat anchors as symbolic (the named
  construct, not the line); only a file this pass touches once may be navigated by line.
- The changes are type-level and name-level only where stated; behavior changes are called
  out explicitly per task and nowhere else.
- **The consumer usage map is the ratification evidence.** Where a task's item has live
  consumer usage (`normalizeAssets` all five repos, `strAttr` four, `OfficeList` one,
  `MediaEntry` ASC tests), the task states the surviving contract explicitly and its
  acceptance criteria hold that contract fixed; no keep-to-retire flip without Geoff (none
  of the 25 Tier 1 items is a flip; `UploadResult`'s rank/verify divergence is resolved by
  the stated conductor default).

---

### Task 1: The Tier 1 retires (25) and the `UsageEntry` retire

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`, `src/lib/sveltekit/content-routes-media.ts`,
  `src/lib/sveltekit/index.ts` (export rows), `src/lib/media/orphan-scan.ts`,
  `src/lib/media/bulk-delete-plan.ts`, `src/lib/media/usage.ts`,
  `src/lib/components/media-upload-outcome.ts` (internalized `UploadResult` import path),
  the root barrel `src/lib/index.ts`, `package.json` export map only if a subpath empties
  (not expected)
- Modify: `src/tests/unit/sveltekit-barrel-prune.test.ts` — its `KEPT` list names six of
  this task's retires (`MediaDeleteRefusal`, `MediaUpdateFailure`, `MediaReplaceFailure`,
  `MediaAltPropagateFailure`, `MediaBulkFailure`, `UploadResult` at `:43-49` — follow the
  SIX NAMES, not the line range: `ContentFormFailure` at `:48` sits inside it and is a KEEP,
  the carrier of the `UsageEntry` recovery expression; fold R2-N-3) and the suite
  asserts they still resolve from `/sveltekit`; the list must shrink in the same commit as
  the rows or the gate fails (fold ET-F-1)
- Modify: `docs/internal/api-surface.md` (regenerated), the reference pages that list the 26
  names (grep-derive; expect `docs/reference/sveltekit.md`, `docs/reference/media.md`,
  `docs/reference/delivery-data.md`), `CHANGELOG.md`, `docs/internal/engine-rulings.md`
- Test: the existing suites must stay green; add or update the compile-only fixture proving
  every replacement expression the CHANGELOG names (retires-pass precedent)

**Interfaces:**
- Produces: a public surface without the 25 Tier 1 names or `UsageEntry`; the usage-entry
  shape survives as a NON-EXPORTED named type in its defining module (`src/lib/media/usage.ts`
  or beside `ContentFormFailure`, wherever the type checker needs it — it has in-engine
  namers in `content-routes-media.ts:57`, `orphan-scan.ts:35`, `bulk-delete-plan.ts:18`,
  `content-routes-core.ts:409`, and `CairnMediaLibrary.svelte`, so inlining into one site is
  not viable); Task 2 relies on `UploadResult` being gone from `/sveltekit` when it drops
  `MediaEntry`'s re-export there.

- [ ] **Step 1:** Re-verify the 25-name list against `docs/internal/record/2026-09-01-4b-planning-inputs/docket.md`
  §1 and grep each name's current export rows. `UploadResult` executes the **verified flat
  retire** (docket §1's overturn flag): its export rows drop everywhere; the type moves
  internal beside its one in-process consumer chain
  (`src/lib/components/media-upload-outcome.ts` imports it from
  `../sveltekit/content-routes.js`; keep a non-exported type or an internal module path, no
  behavior change).
- [ ] **Step 2:** Execute the 25 retires in up to three family-batched commits
  (media-janitorial plan/result types; failure/result types; the remainder), removing export
  rows from every publishing barrel and shrinking the barrel-prune `KEPT` list in the same
  commits. Engine-internal consumers keep the shapes as internal types.
- [ ] **Step 3:** Execute the `UsageEntry` retire per sitting ruling 1 as restated above:
  every export row drops; the shape stays one non-exported named type; in-engine consumers
  repoint. The reference page's recovery line is
  `NonNullable<ContentFormFailure['usage']>[number]`; the ledger entry notes the rendering
  of that indexed-access form is provisional pending the internals pass's reference-page
  convention (fold BR-N-5).
- [ ] **Step 4:** Drift-hunt all 26 names across the full scope (including `skills/` and
  `packages/`); repoint or rewrite every hit. Run `check:surface -- --update` and commit the
  regenerated snapshot; update the reference pages; verify with `check:reference`,
  `check:reference:signatures`, `check:docs`, `check:snippets`.
- [ ] **Step 5:** CHANGELOG entries: one line for the Tier 1 batch (breaking; the
  `Consumers must:` line names the recovery per removed family — the surviving internal
  behavior and the nearest public shape, per the `CHANGELOG.md:322-335` precedent) and one
  for `UsageEntry` (`Consumers must: index the element type off the carrier —
  NonNullable<ContentFormFailure['usage']>[number]`). The zero-usage evidence and the
  907-life `^0.84.4` staleness caveat go in the ledger closes, not the CHANGELOG. Close the
  26 ledger entries with seam-fit lines; note the `UploadResult` verify-wins resolution in
  its entry.
- [ ] **Step 6:** Full gate; commit.

**Acceptance criteria:** surface diff shows exactly the 26 names' rows removed, 0 added,
0 modified beyond any type reference the internalization rewrites; `media-upload-outcome.ts`
compiles against the internal shape; the barrel-prune suite's `KEPT` list carries none of
the 26; every gate in the CI-derived list green; ledger partition arithmetic still
reconciles (the docket's tiers).

---

### Task 2: Publication prunes and alias retires

**Files:**
- Modify: `src/lib/index.ts` (the `AuthBranding` root row at `:27`; the
  `PublishActionsConfig` row at `:143`), `src/lib/sveltekit/index.ts:111-113` (the
  `AuthBranding` comment and row), `src/lib/delivery/data.ts:53-56` (the parked
  `PublishActionsConfig` re-export row on `/delivery/data` — its own comment and
  `scripts/checks/check-surface-reexports.json:250-256` both say its removal belongs to this
  reshape — **and the SIBLING row at `:245-250`, `PublishActionEntry` on `/delivery/data`,
  whose recorded reason says "Both leave this subpath when that reshape lands": this task
  drops that re-export too, a second breaking change with its own `Consumers must:` line
  (import `PublishActionEntry` from its canonical home instead); no gate catches the row's
  reason going stale if the export survives, so the drop is the recorded intent executed,
  not optional** (fold R2-F-1), `src/lib/sveltekit/publish-actions.ts:23,29` (both aliases;
  `normalizePublishActions` at `:47-48` takes `PublishActionsConfig` and returns
  `ResolvedPublishAction[]` at `:50`, `resolvePublishActions` at `:75-76` takes
  `ResolvedPublishAction[]` — retype all three positions to `PublishActionEntry[]`;
  fold R2-N-2),
  `src/lib/content/types.ts:427` (`CairnRuntime.publishActions`), the `/sveltekit` barrel
  row re-exporting `MediaEntry`, and `scripts/checks/check-surface-reexports.json` (the
  `AuthBranding` and `PublishActionsConfig` rows)
- Modify: `docs/internal/api-surface.md` (regenerated), affected reference pages
  (grep-derive: `core.md`, `sveltekit.md`, `media.md`, `delivery-data.md:622`,
  publish-actions sections), `CHANGELOG.md`, `docs/internal/engine-rulings.md`

**Interfaces:**
- Consumes: Task 1's surface (`UploadResult` gone — `verify-route-factories.md:137` calls
  the `MediaEntry` re-export drop "cleaner once rank 38 retires").
- Produces: `AuthBranding` published from `/sveltekit` only; `MediaEntry` published from
  `/media` only; `PublishActionEntry[]` typed directly wherever the aliases stood.

- [ ] **Step 1:** `AuthBranding`: keep the type in `src/lib/email.ts`; the `/sveltekit`
  barrel becomes its only publication (its `AuthRoutesConfig.branding` member is the one
  public signature naming it). **The move flips the recorded homes:** today the canonical
  home is `.` and the RECORDED R4 re-export is the `/sveltekit` row
  (`check-surface-reexports.json:370-375`, `"home": "."`; fold ET-N-5) — so the root row
  drops, `/sveltekit` becomes the home, the re-export record row deletes, and the
  now-settled comment at `sveltekit/index.ts:111-112` ("stays put until that reshape
  settles its home") rewrites to state the settled home (folds ET-N-5, SEC-N-9).
- [ ] **Step 2:** `MediaEntry`: drop the `/sveltekit` re-export row; `/media` remains the
  single home. ASC's usage imports from `/media` (usage map §3) and is untouched.
- [ ] **Step 3:** Retire both aliases (sitting ruling 2). `PublishActionsConfig` is public
  (root, `/delivery/data`): its rows drop everywhere and the adapter member plus
  `normalizePublishActions` retype to `PublishActionEntry[]`. `ResolvedPublishAction` is
  published from NO barrel (its only use is the module-local `ContentRoutesContext`): its
  retire is a source-level alias deletion — no surface row, no reference-page row, no
  `Consumers must:` line (fold ET-F-4); `resolvePublishActions`' parameter retypes in the
  same edit.
- [ ] **Step 4:** Drift-hunt the retired/moved names full-scope; surface regen; reference
  pages; CHANGELOG (breaking, `Consumers must:` per PUBLIC name — `AuthBranding` moves its
  import to `@glw907/cairn-cms/sveltekit`; `PublishActionsConfig`'s recovery is
  `PublishActionEntry[]`; `PublishActionEntry` on `/delivery/data` moves its import to the
  canonical home); ledger closes (the `AuthBranding` entry notes the ASC comment
  mention is decorative, per verify).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** `AuthBranding` and `MediaEntry` each publish from exactly one
subpath; neither alias name appears anywhere in `src/`; the re-export record carries no
stale rows; `check:consumers` and `check:dev-package` green (the dev package imports from
`/sveltekit` and only those gates reach it).

---

### Task 3: CairnHistory's two owed reshapes (`lastSavedAt`, `formatTimestamp`)

**Files:**
- Modify: `src/lib/sveltekit/types.ts` — BOTH shapes: `HistoryData.draft.startedAt`
  (field at `:138`; fold R2-F-4) and `RevertFailure`'s `draft_exists` member `draftStartedAt` (field at
  `:176`), plus both adjacent "the field keeps its name for API stability" compensating
  comments (fold ET-B-3: these are two different types; the docket's phrasing collapsed
  them)
- Modify: `src/lib/components/CairnHistory.svelte` (`:33` declared form type, `:48-54`
  `formatVersionDate`), `src/lib/admin-toolkit/format.ts` (`formatTimestamp` at `:68`)
- Modify: regenerated surface, reference pages (`sveltekit.md` for both types,
  `admin-toolkit.md` for `formatTimestamp`), `CHANGELOG.md`, ledger
- Test: unit coverage for the re-derived `formatTimestamp` input domain; the component tests
  that exercise `CairnHistory`'s version list

**Interfaces:**
- Produces: `HistoryData.draft` as `{ editor, lastSavedAt }` (the container already says
  "draft", so the bare name is right there); `RevertFailure`'s `draft_exists` variant as
  `{ reason, draftEditor, draftLastSavedAt }` (the qualifier matches its sibling
  `draftEditor` — an unqualified `lastSavedAt` beside `draftEditor` would unbalance the
  pair; fold BR-F-6); `formatTimestamp(input)` accepting any `Date`-parseable timestamp
  (ISO with offset included), `FormatTimestampOptions` unchanged.

- [ ] **Step 1:** Rename both fields per the Produces block and delete both compensating
  comments (verified verbatim by the audit, adjacent to the two fields). Update
  `CairnHistory.svelte`'s usage sites.
- [ ] **Step 2:** Re-derive `formatTimestamp` (`format.ts:68`) to accept any
  `Date`-parseable timestamp instead of the SQLite-shaped
  `sqliteDatetime.replace(' ','T')+'Z'` bake-in, preserving backward acceptance of the
  SQLite shape (D1 rows keep flowing through it) and the deliberate `timeZone` zone-pin
  behavior (the SSR/hydration mechanic the verify note confirms is real). Write the failing
  tests first: SQLite shape, ISO-with-offset, ISO-UTC, nullish input.
- [ ] **Step 3:** Delete `CairnHistory.svelte:48-54`'s hand-rolled `formatVersionDate` and
  route it through the reshaped `formatTimestamp`, proving the widened input domain on
  cairn's own screen.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG. **`HistoryData` is a ratified KEEP with a
  recorded any-site case of a site writing the name, and the usage map never swept
  `HistoryData` or `startedAt`** (fold ET-B-3) — so its `Consumers must:` line carries the
  real rename instruction (`draft.startedAt` is now `draft.lastSavedAt`), not a zero-usage
  claim; `RevertFailure`'s line names `draftStartedAt` → `draftLastSavedAt`. The sweep-gap
  note goes in the ledger closes.
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** neither `startedAt` on `HistoryData.draft` nor `draftStartedAt` on
`RevertFailure` survives, and both compensating comments are deleted (fold BR-F-6's
two-shape restatement); `formatVersionDate` is gone; `formatTimestamp` tests cover both
input shapes plus nullish; the zone-pin behavior is asserted, not just preserved.

---

### Task 4: `TidyClient` narrowed to an engine-owned interface (rides: log rank 14)

**Files:**
- Modify: `src/lib/sveltekit/content-routes-context.ts:32-67` (the transcribed SDK wire
  shape), the tidy action path that emits `tidy.succeeded`, the SDK adapter call site
- Modify: regenerated surface, `docs/reference/` page documenting `TidyClient`,
  `docs/reference/log-events.md` (`tidy.succeeded`'s usage row), `CHANGELOG.md`, ledger
- Test: the tidy action's unit/integration coverage re-pointed at the narrow interface; a
  fake client implementing it

**Interfaces:**
- Produces: `TidyClient` as a narrow engine-owned contract — take a prompt and a system
  string, return corrected text plus a coarse engine-owned token record — with the Anthropic
  SDK adapter kept internal. The contract KEEPS the two load-bearing members the wire shape
  carries today (fold ET-F-6): the optional model-listing probe (`models?.list`, which
  `probeTidyKey`'s zero-token key-health check degrades to `'unknown'` without) and the
  cancellation option (`options?: { signal }`, paired with `tidyTimeoutMs` so the request
  actually cancels when the deadline fires) — both re-expressed in engine-owned terms, not
  SDK shapes. `tidy.succeeded` emits the coarse record under a `tokens: { input, output }`
  field (not `usage` — avoids colliding with the repo's other `usage` sense in the same
  window; fold BR-N-3).

- [ ] **Step 1:** Author the narrow interface in place of the transcribed wire shape
  (`max_tokens`, `output_config.effort`, `stop_reason`, `usage.input_tokens` all leave the
  public contract; a vendor field rename stops being a cairn break). The engine wraps: the
  injectable-fake property survives, per the verify note.
- [ ] **Step 2:** Move the SDK-specific mapping into an internal adapter; the engine's tidy
  path consumes only the narrow contract, including the probe and cancellation paths.
- [ ] **Step 3:** Log rank 14: `tidy.succeeded` carries `tokens: { input, output }`; update
  the reference table row in the same edit.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG (breaking for any site that hand-built a
  `TidyClient`; `Consumers must:` states the new contract shape — prompt and system in,
  corrected text plus `tokens` out, probe and signal optional; zero-usage evidence to the
  ledger), ledger closes (rank 33 and log rank 14 both).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** no `@anthropic-ai/sdk` type reaches the public surface; the fake
client in tests implements the narrow interface only; `probeTidyKey` still distinguishes a
healthy key from `'unknown'`; the tidy timeout still aborts the request; `tidy.succeeded`'s
documented fields match the emitted record.

---

### Task 5: The preview mint made safe (rename: `previewMint`)

**Files:**
- Modify: `src/lib/sveltekit/preview.ts` (the exported `mintPreviewToken` at `:88-92` and
  its header), `src/lib/sveltekit/index.ts` (the export row), the engine's own
  `previewMintAction` sequence in `src/lib/sveltekit/content-routes-core.ts:2050-2090`
  (extracted or reused, not duplicated)
- Modify: regenerated surface, `docs/reference/sveltekit.md:1379` (the header-obligation
  wording it quotes), `CHANGELOG.md`, ledger (`engine-rulings.md:2158`)
- Test: authorization coverage — refused editor, authorized editor, absent draft — with the
  ordering assertion below

**Interfaces:**
- Produces: **`previewMint(runtime, config, event, { concept, entryId })`** (renamed from
  `mintPreviewToken` in the same breaking window — it joins `previewLoad` as the
  `/sveltekit` preview pair, resolving against `previewLoad(runtime, config, event)`'s
  existing parameter shape plus the explicit target, with `db` reached the way
  `previewLoad` reaches it; the noun-first form matches the route-factory family; folds
  BR-F-8, R2-B-1). The contract:
  - The editor derives from the event via `requireEditor` (the guard-resolved session), so
    it cannot be synthesized by a caller (fold SEC-F-1); the caller passes NO editor.
  - **Attribution and revocation key from that same resolved editor**: the stored row's
    `editor` column is `editor.email` off the session read (whose normalization the
    `editor`-table select guarantees), so the editor-removal revocation cascade
    (`DELETE FROM preview_tokens WHERE editor = ?`) always matches; `record` drops its
    free-string `editor` member entirely (folds SEC-B-2, BR-F-8).
  - **Authorization runs FIRST and short-circuits**: the concept-scoped access check plus id
    shape-validation, the SAME sequence the engine's own `previewMintAction` runs —
    **EXTRACTED, never called as `requireEntryFromParams`** (that helper derives its target
    from ROUTE PARAMS, so calling it would authorize the route's params while minting for
    the argument's entry, and 404 on any non-`/admin/[concept]/[id]` route — the ledger's
    own any-site caller; fold R2-B-1). The extracted form, explicitly:
    `requireEditor(event)` → `findConcept(runtime.concepts, concept)` →
    `requireEngineAccess(runtime.access, editor, concept)` → `isValidId(entryId)` → the
    backend draft check. The access map comes from `runtime.access` (what
    `previewMintAction` uses — the parity the SEC-B-3 disposition rests on), not
    `locals.cairnAccess`. The no-draft outcome is only ever computed for an authorized
    editor, so the refusal never becomes an entry-existence oracle (fold SEC-F-2).
    "Concept-scoped plus id-validated" is the accurate phrasing — the engine has no
    per-entry grant (fold SEC-N-7).
  - **Draft existence is checked** via the backend (`branchHead(pendingBranch(...))`, the
    check `previewMintAction` performs), closing BOTH halves of the header obligation the
    task deletes; a mint on an entry with no pending branch refuses rather than minting a
    token that `previewLoad` would resolve down the ended-page path into a token-gated read
    of a default-branch entry (fold SEC-F-3).
  - The refusal is a discriminated result on the 4a `outcome` grammar, no
    throw-for-control-flow; the happy arm carries `{ token, expiresAt }` as today.
  - **Token hygiene is UNCHANGED and stated**: CSPRNG 256-bit generation, hash-at-rest
    (plaintext never stored), the 1-minute-to-30-day TTL clamp, and the entry scope are all
    byte-identical to `main` (fold SEC-F-3).

  Design note for round 2 (fold SEC-B-3, disposition): the security round proposed
  `authorizeAdminTarget`'s fail-closed no-rule posture instead of `canReach`'s
  nav-semantics. This plan deliberately reuses the ENGINE'S OWN mint sequence: both paths
  sit behind an editor session, and a helper stricter than the engine's own
  `previewMintAction` protects nothing while the engine route keeps the permissive reading —
  a stricter floor is an engine-wide access-semantics question and is routed to the
  internals pass as a filed question, not decided asymmetrically here. The ledger close
  records this.

- [ ] **Step 1:** Write the failing tests first: refused editor (concept unreachable under a
  declared access map), authorized editor, absent draft — plus the ordering assertion that
  an unauthorized editor gets the SAME refusal outcome whether or not the draft exists.
- [ ] **Step 2:** Implement the contract above; delete the header obligation and the
  matching wording in the reference page and the ledger quote; rename the export and
  repoint `previewMintAction` if it shares the helper.
- [ ] **Step 3:** Docs, surface regen, CHANGELOG (breaking: rename, full call-form change,
  AND return-shape change — the old signature was `mintPreviewToken(db, config, record)`
  returning a bare `{ token, expiresAt }` promise that threw on config errors;
  `Consumers must:` names the rename, the new `(runtime, config, event, target)` form with
  the dropped `db` parameter and dropped `record.editor` member, the precondition that the
  caller runs where the admin guard has resolved `locals.cairnEditor` (the sole editor
  source now), and the `outcome` discriminant the caller narrows on; folds ET-F-7,
  SEC-N-6, R2-F-5), ledger closes.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** no call path mints a preview token without the concept-scoped
check and the draft-existence check; the stored `editor` value always equals the resolved
session editor's email (assert in a test that a mint under editor A never stores any other
attribution); authorization-before-existence ordering asserted; generation, hashing, TTL
clamp, and scope byte-identical to `main`; the exported parameter list is exactly
`(runtime, config, event, { concept, entryId })` (fold R2-B-1: Produces and contract must
not ship disagreeing); grep for `mintPreviewToken` returns only CHANGELOG/history hits.

---

### Task 6: `fixtureMediaBase` becomes a `ReproContext` prop

**Files:**
- Modify: `src/lib/reproductions/manifest.ts:313` (the exported constant),
  `src/lib/reproductions/ReproContext.svelte` — BOTH use sites: the `setContext` at `:214`
  (key `MEDIA_BASE_CONTEXT_KEY`; **do not touch the adjacent `CSRF_CONTEXT_KEY` setContext
  at `:215`** — auth surface, out of scope; fold SEC-F-6) and the shell-hosted path at
  `:261` (`mediaBase: fixtureMediaBase` feeding `CairnAdminShell`'s own media-base shadow;
  import at `:59`; fold ET-F-5)
- Modify: regenerated surface, `package.json` export map only if the constant was the
  subpath's last value export (verify), `docs/reference/reproductions.md`, `CHANGELOG.md`,
  ledger
- Test: a mounting fixture passing a non-default base and asserting composed fixture URLs on
  BOTH paths (plain stories and shell-hosted stories)

**Interfaces:**
- Produces: `ReproContext` with an optional `mediaBase` prop defaulting internally to
  `'/repro-assets'`, threaded to both the story context and the shell-hosted path; the
  exported constant is gone.

- [ ] **Step 1:** Add the prop; both use sites read it; the internal default preserves
  current behavior for every existing mount. Fixture URLs are composed at render time from
  context plus slug/hash/ext (verify-confirmed), so the prop threads cleanly; the failing
  test mounts with a `paths.base`-shaped value and asserts the composed URL on both paths.
- [ ] **Step 2:** Retire the exported constant (export rows and, if present, its export-map
  entry); drift-hunt.
- [ ] **Step 3:** Docs, surface regen, CHANGELOG (`Consumers must: pass mediaBase to
  ReproContext instead of importing the constant`; zero-usage evidence to the ledger),
  ledger closes. File the adjacent `fixtureCsrf` fixed-constant residual (SEC-N-11, fixture
  scope only, predates this pass) to `docs/internal/docs-friction-log.md` — noted, not
  acted on.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** a site deployed under a SvelteKit `paths.base` can comply by
passing one prop, on plain AND shell-hosted stories; default mounts render byte-identically;
the CSRF context line is untouched in the diff.

---

### Task 7: `strAttr` moves onto the context as `ctx.attr()`

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts:14` (the standalone function) and the single
  `ComponentContext` construction site in the same file, `src/lib/render/registry.ts:38-47`
  (the `ComponentContext` interface gains the method), `src/lib/render/authoring.ts:8`
  (`strAttr`'s own `/render` export row — note `strAttr` is NOT exported from the root;
  `src/lib/index.ts:106` says so explicitly; fold ET-B-2)
- Modify: `scripts/checks/check-surface-reexports.json:347-352` — the `/render`
  `ComponentContext` re-export row's recorded reason is "R4 closure: `strAttr` names it on
  this subpath", which this retire invalidates. **The row is KEPT with its justification
  REWRITTEN** (four consumer repos import `ComponentContext` from `/render`, and the method
  migration makes the type MORE necessary there, since sites type their builder parameters
  with it): new reason cites the consumer-builder parameter typing. Deleting the row fails
  `check:surface` (the publication becomes an unrecorded duplicate); a stale REASON fails
  no gate — the checker never inspects that field — so the rewrite is held by this task's
  acceptance criteria and the diff review, not a gate (folds ET-B-2, R2-F-2). The stale
  in-source twin of the same justification, the comment at `authoring.ts:9-10` ("because
  `strAttr`'s own parameter names it"), rewrites in the same edit (fold R2-N-1).
- Modify: `examples/showcase/src/theme/cairn.config.ts` (its `strAttr` calls), regenerated
  `templates/waymark` via `npm run emit-template`, every `skills/` and `docs/` page teaching
  the standalone form, regenerated surface, `docs/reference/` render page, `CHANGELOG.md`,
  ledger
- Test: the existing component-builder coverage re-pointed at `ctx.attr()`; a type-level
  assertion that `ComponentContext` carries the method beside `slot`/`items`

**Interfaces:**
- Produces: **`ComponentContext.attr(key: string): string | undefined`** — `attr` not `str`
  (fold BR-F-5): its siblings `slot(name)` and `items(name)` name what they return, and a
  method named for its return type restates the signature; `ctx.attr('title')` beside
  `ctx.slot('body')` and `ctx.items('rows')` is the even grammar, and it keeps the noun
  `strAttr` at least carried. Same semantics as today's `strAttr(ctx, key)`. The standalone
  export is gone from `/render`; `ComponentContext` stays exported there.

- [ ] **Step 1:** Add the method at the one construction site (no family site constructs a
  `ComponentContext` directly — verify-confirmed — so the addition breaks no site code).
  Precedent: `registry.iconField(name)` from the same spec pass, cited in the verify record.
- [ ] **Step 2:** Retire the standalone export row (`authoring.ts:8`) and rewrite the
  `ComponentContext` re-export record's reason per the Files note. `cardShell`, `headRow`,
  `iconSpan` are chassis-routed and explicitly NOT in this pass's scope — leave them and
  their rows untouched.
- [ ] **Step 3:** Migrate the showcase's own calls, re-emit the template, migrate every
  teaching doc and skill page; drift-hunt the name full-scope.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG (breaking with live consumers:
  `Consumers must: replace strAttr(ctx, key) with ctx.attr(key)` — four repos, 7 to 16 call
  sites each, all the two-argument form per the usage map, so the rewrite is mechanical);
  ledger closes (noting the deeper `FieldDescriptor`-typed fix is recorded as
  blocked-by-design today, per verify, and not attempted).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** `strAttr` appears nowhere in `src/`, `docs/`, `skills/`,
`examples/`, or the regenerated template; `ComponentContext` still resolves from `/render`
and its re-export record row carries the rewritten justification; the nullable-string
return contract is unchanged (the usage map's `??` fallback idioms keep compiling at
consumers).

---

### Task 8: `normalizeAssets` — one hoisted media block (verify-corrected shape)

**Files:**
- Modify: `examples/showcase/src/theme/cairn.config.ts:360-370,457` (the duplicated media
  literal), regenerated `templates/waymark`, the `docs/` pages documenting the config form
  (grep `normalizeAssets` across `docs/extend/` and `docs/reference/media.md`)
- Modify: `CHANGELOG.md`, ledger. **No engine code change; the exported signature is
  untouched** (all five consumer repos call it load-bearing at config init, usage map §1)
- Test: `check:template`, `check:consumers`, `check:snippets` prove the corrected form; the
  showcase build is the executable proof

**Interfaces:**
- Produces: the documented and scaffolded call form where a single hoisted media block feeds
  both `normalizeAssets(...)` and the adapter's `media:` member, eliminating the split-brain
  double normalization every family site currently seeds from the scaffold.

- [ ] **Step 1:** In the showcase config, hoist one `const media = { bucketBinding:
  'MEDIA_BUCKET' }` (or the equivalent single source), used by both the
  `normalizeAssets(media)` call (`:368`) and the adapter's `media:` member (`:457`). Do NOT
  attempt the `runtime.resolvedAssets` form: it is circular-import-blocked (the runtime
  composer imports `cairn.config.ts`; the rank note's alternative is wrong on this point —
  the stated conductor default).
- [ ] **Step 2:** Re-emit the template; update every doc teaching the duplicated form.
- [ ] **Step 3:** CHANGELOG (behavior-neutral doc/scaffold change; the entry states no
  consumer action is required and points existing sites at the hoisted form as the
  recommended de-duplication). Ledger closes (rank-media item 4) with the verify's two
  corrections recorded AND the note that the verify record's cited path
  (`packages/create-cairn-site/template/...`) does not exist in-tree — the showcase-then-emit
  route supersedes it, since `create-cairn-site` bakes `templates/waymark` at prepack
  (fold ET-N-4).
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** the string `bucketBinding` appears exactly once in the showcase
config; the emitted template matches; `normalizeAssets`' signature and return type are
byte-identical to `main`.

---

### Task 9: `OfficeList` collapses onto `PageHeader` — with the rhythm ruled, honestly

**Files:**
- Modify: `src/lib/admin-toolkit/PageHeader.svelte` (gains the action-slot `self-start`
  wrap), `src/lib/admin-toolkit/OfficeList.svelte` (collapses to a thin card-frame
  composing `PageHeader`; the `WATCH` comment at `:14-15` deletes — this task IS the visual
  gate it was waiting for), `ROADMAP.md` (the parked spacing-convergence entry at
  `:1427-1434` closes; folds ET-B-4, BR-F-2)
- Modify: `docs/reference/admin-toolkit.md`, `docs/internal/admin-design-system.md` (the
  office recipe's rhythm line), `CHANGELOG.md`, ledger; regenerated surface (the prop
  rename below is a type change)
- Test: component coverage asserting the rendered header band is `PageHeader`'s and the
  action alignment survives; the showcase visual suite with a read before/after render pair
  banked as pass evidence

**Interfaces:**
- Produces: one office-header implementation with a STATED design intent (fold BR-F-2):
  - The merged band adopts `PageHeader`'s rhythm — `mb-10` header offset, `gap-0.5` inner
    stack, `text-wrap: balance` — as the toolkit's ONE office-header rhythm, per the design
    system's F3 proximity-grouping scale ("the header stands apart as the page's one loose
    element"); `OfficeList`'s card keeps its tighter card-proximity so the header reads as
    the page's one loose element.
  - The second line converges on `PageHeader`'s `meta` role and `type-meta` size:
    **`OfficeList`'s `subtitle` prop RENAMES to `meta`** — one name for one concept across
    the toolkit, paid once inside a window that is already breaking; a forwarding `subtitle`
    alias is NOT kept (a permanent two-names-one-line seam is the opposite of what a
    collapse is for).
  - `eyebrow`, `title`, `action`, `children` are unchanged.

- [ ] **Step 1:** Port the `self-start` action wrap (`OfficeList.svelte:52`) into
  `PageHeader` FIRST — the fixes are asymmetric and a naive collapse regresses the
  alignment fix (the verify record's required addition). Failing visual/DOM assertion
  first.
- [ ] **Step 2:** Collapse `OfficeList`'s duplicate band to a composition of `PageHeader`
  with the rhythm and `meta` convergence above; the card frame is what remains locally.
  Delete the `WATCH` comment; close the ROADMAP entry (the ledger's own Shape line requires
  exactly this closure).
- [ ] **Step 3:** Render the showcase office screens before and after; bank the pair as
  pass evidence; the main loop reads them (the one-check rule) before the task is accepted.
- [ ] **Step 4:** Docs (reference page, design-system recipe), CHANGELOG — **honest**: this
  is a visible rhythm and type-size change on every screen built on `OfficeList` plus a
  prop rename; `Consumers must: rename OfficeList's subtitle prop to meta; expect the
  office header to adopt PageHeader's rhythm (mb-10, meta line at type-meta)`. The ROADMAP
  entry had parked this as breaking-visual; the routing list and the verified verdict
  supersede the parking, and the ledger close records that supersession (fold ET-B-4).
- [ ] **Step 5:** Full gate including the showcase visual suite; commit.

**Acceptance criteria:** one eyebrow/title/meta/action implementation in the repo; the
`self-start` alignment asserted in `PageHeader`'s own coverage; `subtitle` gone from the
toolkit's props; the WATCH comment and the ROADMAP entry both gone; the before/after pair
banked and read.

---

### Task 10: `StatusChip` — the badge-tier half (re-authored; the docket entry was stale)

**The docket's StatusChip item described the dot/register half, which ALREADY LANDED in the
toolkit-seams pass** (ledger `audit-admin-statuschip`, progress note: the 6px dot is gone,
`tone` and `StatusChipTone` retired, `register` — `'quiet' | 'warning' | 'outline'` —
carries color, measured second-generation against cairn's themes; `CHANGELOG.md:304-312`
records it in this same unpublished window). Executing the docket literally would resurrect
a retired API and violate the window's self-consistency constraint (folds ET-B-1, BR-F-1).
What the ledger holds OPEN is the **badge-tier half**: `badge badge-error`/`badge-success`
compile into the packaged sheet today only as an incidental side effect of the safelist
blessing that preserved the de facto public API — the deliberate badge-tier recipe named in
the verdict was never built.

**Files:**
- Modify: `src/lib/admin-toolkit/StatusChip.svelte` only if the ruling below touches it
  (expected: no), `src/lib/cairn-admin.css` / `admin-css-safelist.ts` (the badge-tier
  treatment), `docs/internal/admin-design-system.md` (the chip recipe gains the badge-tier
  ruling), `docs/reference/admin-toolkit.md`
- Modify: `CHANGELOG.md`, ledger (`audit-admin-statuschip` closes; the stale docket item is
  recorded in the same entry)
- Test: a rendered check against the PACKAGED admin sheet (the same check class the original
  bug needed), asserting each supported badge class compiles and each badge tone clears the
  register set's measured legibility floor on both packaged themes

**Interfaces:**
- Produces: a deliberate, documented badge-tier ruling: which DaisyUI `badge-*` classes the
  packaged admin sheet supports, each one measured for legibility against cairn's two
  themes (re-measured, never copied from ASC), with the design system stating when a
  consumer reaches for `badge badge-success` versus `StatusChip register=...`. The
  incidental safelist compilation becomes deliberate: the safelist entries carry the ruling
  as their reason, or the unsupportable classes leave the safelist with the recipe naming
  the `StatusChip` replacement. `StatusChip`'s own props and registers are UNTOUCHED.

- [ ] **Step 1:** Enumerate the badge classes the safelist currently blesses; render each
  against both packaged themes; measure (the register-tuning test's method,
  `status-chip-register-tuning.test.ts`, is the precedent).
- [ ] **Step 2:** Rule per class: legible → documented as supported with the measurement;
  illegible → retune the token mapping in the admin sheet (never ASC's values) or remove
  from the safelist with the recipe naming the `StatusChip` replacement. The design-system
  chip recipe carries the when-to-use line.
- [ ] **Step 3:** Docs, CHANGELOG (behavior change to the packaged sheet if any class
  retunes or leaves; `Consumers must:` names any removed class's replacement), ledger:
  `audit-admin-statuschip` CLOSES (both halves now executed or ruled), recording the docket
  staleness so the partition arithmetic reconciles.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** the rendered packaged-sheet check covers every supported badge
class on both themes with measurements recorded; `StatusChip.svelte`'s props, registers,
and tuning are byte-identical to `main`; the ledger entry is closed, not progress-noted.

---

### Task 11: Log-event evenness — the remaining ten

**Files:**
- Modify: `src/lib/log/events.ts` (the union and its grammar comment's examples if touched),
  the emit sites: `src/lib/sveltekit/auth-routes.ts` (session destroy),
  `src/lib/auth/store.ts` (`deleteSession`), `src/lib/auth-channel/store.ts`
  (`destroyChannelSession`) and `src/lib/auth-channel/factory.ts` (its THREE call sites:
  orphan-cleanup `:923`, logout `:961`, verify-refused revocation `:1005`; fold SEC-F-5),
  `src/lib/sveltekit/content-routes-dictionary.ts`, `src/lib/sveltekit/commit-log.ts:16-26`
  (shared helper), `src/lib/content/fieldset.ts` and `src/lib/render/component-validate.ts`
  (rank 35), `src/lib/render/resolve-include.ts` (rank 36),
  `src/lib/sveltekit/content-routes-core.ts` (`preview.cleanup_failed` emit at `:559` and
  its leak-safety comment at `:547-549`, which carries to the new field name; fold SEC-F-8),
  the `media.resolver_absent` emit site (grep), and
  `packages/cairn-cms-dev/src/fake-auth-db.ts` (add the
  `DELETE FROM session WHERE id = ? RETURNING email` handler — the fixture is maintained
  statement-by-statement against the store and has no handler for this statement today;
  channel-db already supports RETURNING; fold SEC-N-4)
- Modify: `docs/reference/log-events.md` (every touched row, including the logout rows at
  `:24` and `:89` gaining the actual-deletion condition), `CHANGELOG.md`, ledger
- Test: each fix lands with an assertion on the emitted record's fields (the log tests
  pattern already in the suites)

**Interfaces:**
- Consumes: rank 14 already landed in Task 4.
- Produces: the ten remaining docket §4 fixes with these plan-settled shapes:

- [ ] **Step 1 (ranks 2 and 7 — same statement shape, DIFFERENT identity currencies):**
  `deleteSession` and `destroyChannelSession` gain `RETURNING` (return type moves
  `Promise<void>` → `Promise<string | null>`; all call sites update).
  - **Sveltekit half:** `auth.session.destroyed` carries the returned `email` (that
    subsystem logs raw email everywhere by sanctioned convention).
  - **Channel half — NEVER the raw subject** (fold SEC-B-1: the channel subsystem's
    spec-level posture is that no record carries a roster identity; a raw subject would
    retroactively de-anonymize every `correlationId`-keyed channel record via the
    orphan-cleanup join). Instead the logout emit derives the SAME pseudonym the request
    flow used: `(await deriveIdentity(salt, subject, '')).slice(0, 16)` — `deriveIdentity`
    uses only the subject when non-null, so the reconstructed `correlationId` matches, and
    the evenness verdict is satisfied in the subsystem's own currency.
  - **No-row branch (fold SEC-F-4):** no returned row → NO event (the emit was previously
    unconditional; `RETURNING` finally makes the reference row's "a row was actually
    destroyed" claim enforceable). Both reference rows state the condition.
  - **Third call site (fold SEC-F-5):** the verify-refused revocation at `factory.ts:1005`
    — a roster hook actively revoking a live session, silent today — GAINS the
    `auth.channel.session.destroyed` emit with the correlationId derived from
    `resolved.subject`. The orphan-cleanup site at `:923` **keeps its EXISTING
    `correlationId` field exactly as documented today** (`log-events.md:89`) and merely
    declines to ADD a second, subject-derived identity from the returned row — the
    destroyed row belongs to the incoming cookie's session, which need not be the subject
    just confirmed, and pairing the old session's identity with the new flow's
    correlationId would silently link two identities in one record. No documented field is
    removed anywhere in this step (fold R2-B-2). The reference row documents all three emit
    conditions.
  - **Salt-fault branch (fold R2-N-5):** logout must never fail on a salt fault —
    `resolveSalt` caches only success, and the request path fails closed by design, but
    logout is not a place to strand a user. If the salt read throws at the logout emit,
    skip the record (the same shape as the no-row branch) and let the logout complete.
- [ ] **Step 2 (rank 5):** `dictionary.added` (and `dictionary.add_conflict`, which
  inherits) stops shipping the flagged tokens verbatim: the record carries a word count.
  This is contract-consistency, not confidentiality (the same words go into the public
  commit message and the committed file; fold SEC-N-1) — the CHANGELOG entry says
  "conforms the record to the documented dictionary.* content contract", not "privacy fix".
  The reference row notes the client retains the pending words, so a recurring conflict is
  still traceable. Also DELETE the dead `commitFields` variable at
  `content-routes-dictionary.ts:125` — a fifth pseudo-concept (`'dictionary'`) landmine
  whose `id` would be the first added word if ever wired (fold SEC-N-2); note it in the
  ledger.
- [ ] **Step 3 (ranks 28 and 69, one change):** `commit.succeeded`/`commit.failed` stop
  overloading `concept` with the four pseudo-concepts (`nav`, `settings`, `vocabulary`,
  `media`) that collide with a site's declared concept names (7 of 11 emit sites affected,
  verify-counted). Shape (fold BR-F-3): `concept` remains only on entry-scoped commits; the
  four non-entry surfaces move to the vocabulary's EXISTING axis for this —
  **`scope: 'nav' | 'settings' | 'vocabulary' | 'media'`** — a superset of `config.invalid`'s
  three `scope` values, so a site's log filter reads one field on both events. NOT a new
  `surface` field (that word means public-API surface everywhere else in this repo). Both
  events share the `commit-log.ts` helper, so one change lands both.
- [ ] **Step 4 (rank 30, both instances):** the two bare-noun names rename to the ratified
  grammar: `taxonomy.unmarked_field` → `taxonomy.field_unmarked` (state adjective) and
  `publish.address_collision` → `publish.address_collided` (past-tense verb). Any rename
  lands both — the verify record forbids splitting them.
- [ ] **Step 5 (rank 35):** `content.field_behavior_failed`'s bare `field` gains an owner
  label threaded as an argument through `validate` (the fieldset has no concept, and the
  component-attribute path at `component-validate.ts:19` has no concept at all — the
  verify-corrected mechanism). The label is a SCHEMA identifier (the owning fieldset or
  component name), never a value — the event already carries a site-controlled `error`
  message; do not widen what it ships (fold SEC-N-8).
- [ ] **Step 6 (rank 36):** `include.missing` disambiguates its two authoring faults with
  **`reason: 'empty_fragment' | 'not_found'`** — snake_case, per the grammar line in
  `events.ts:6-7` that rules every record `reason`/`scope` value; the kebab discriminants
  elsewhere in the repo are type-level, not log records (fold BR-F-4) — and names the
  containing entry. The existing `fragment` field is author-typed document content and
  unbounded: LENGTH-CAP it (keep the first 160 characters, note the truncation in the
  reference row) rather than dropping the genuinely diagnostic value (fold SEC-F-7).
- [ ] **Step 7 (ranks 42 and 44):** `media.resolver_absent` drops the dead `{enabled:
  true}` field (one possible value); `preview.cleanup_failed` moves the stringified throw
  from `reason` (reserved for snake_case enums) to `error`, matching its five siblings —
  and the leak-safety comment at `content-routes-core.ts:547-549` (whose reasoning still
  holds: the delete is keyed by concept and id, no token in scope) carries to the new field
  name rather than being dropped (fold SEC-F-8).
- [ ] **Step 8:** Reference table rows for every touched event; CHANGELOG (behavior
  changes; `Consumers must:` names the two event renames, the `concept`→`scope` move, and
  the no-row logout condition for any site's log filters or alerting); ledger closes all
  eleven §4 entries (rank 14 noted as landed in Task 4).
- [ ] **Step 9:** Full gate; commit.

**Acceptance criteria:** the events union, every emit site, and the reference table agree;
no channel record carries a raw subject (assert on the emitted record in the channel
tests); no event fires on a no-row delete; no record ships flagged dictionary tokens; no
pseudo-concept reaches `concept`; the dev fake-db handles the new statement; grep for the
two old event names returns only CHANGELOG/history hits.

---

### Task 12: Audit registry-rule repairs (`chip-ground-collision`, `form-font-parity`)

**Files:**
- Modify: the rule implementations under `src/lib/audit/` (grep the rule ids;
  `rules/rendered/index.ts:11-13` carries `form-font-parity`'s provisional registration),
  `docs/reference/cairn-audit.md`
- Modify: `CHANGELOG.md`, ledger, `ROADMAP.md` (the filed chroma repair leaves the roadmap
  when it lands)
- Test: rule unit fixtures for the repaired formula and the closed exemption net (both
  false-positive corpora are documented in the rank/verify records; encode the named cases)

**Interfaces:**
- Produces: a `chip-ground-collision` whose contrast formula can see hue, and a
  `form-font-parity` whose exemption net covers the three named false-positive classes.

- [ ] **Step 1 (`chip-ground-collision`, primary path):** land the filed chroma-aware
  repair (ROADMAP: "a distance formula that can see hue, plus a recalibrated floor" — the
  formula has no chroma term and produced 24 false errors of 40 on its first real consumer,
  a measured 60% false-positive rate). **Current tier, stated (fold R2-F-3): the rule is
  ALREADY advisory** — demoted out of the error tier in design-infrastructure Pass 3
  (`rules/rendered/index.ts:8-11`), so the error-tier harm the docket cites is already
  remedied and the docket's hold-out-of-the-registry fallback is now strictly worse than
  the shipping state (it would trade an advisory signal for none — the same staleness
  class as Task 10's docket entry). Encode the ASC false-positive cases as fixtures that
  must pass under the repaired formula. **Fallback** (only if the recalibration cannot be
  validated inside this task): NO change — the rule stays advisory as shipped and the
  ROADMAP repair line stays filed. **The measured-error-rate discriminator
  (what separates this rule from the two kept geometry heuristics) is stated in the LEDGER
  entry, not on the reference page** — a reference reader needs the rule's behavior, tier,
  and known false-positive classes, not verdict provenance that reads as an exception
  clause in a year (fold BR-F-9).
- [ ] **Step 2 (`form-font-parity`):** close the exemption net before any error-tier
  promotion: variant-prefixed forms (`md:font-mono`), the `font-serif`/`font-sans`
  families, and Tailwind 4's `font-(family-name:--x)` shorthand. The report copy states a
  finding may be an exemption miss (operational guidance to a finding's reader — that line
  stays in the report, correctly). The rule stays advisory in this pass; promotion is a
  later, separately evidenced act.
- [ ] **Step 3:** Docs, CHANGELOG (behavior change to audit output; no consumer action —
  entry says so), ledger closes both §5 entries (with the discriminator statement);
  ROADMAP updates if the chroma repair landed.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** the ASC false-positive corpus passes under the repaired formula (or
the fallback took NO change — the rule still advisory as shipped, the ROADMAP line still
filed, the discriminator recorded in the ledger either way); the three exemption classes
have fixtures; no rule was promoted to error tier in
this pass; the reference page carries behavior and tier only.

---

### Task 13: The `rendered.*` identifier renames (five, plan-settled)

**Files:**
- Modify: `src/lib/audit/rendered.ts:188-192` (the five constants and every use),
  `docs/reference/cairn-audit.md` (the ids it names)
- Modify: `CHANGELOG.md`, ledger — including an AMENDMENT to the ratified
  `convention-identifier-grammar` entry (`engine-rulings.md:266-275`), whose closure text
  routes "the FOUR `rendered-*` harness failure ids" to 4b: the amendment records the
  four-to-five correction under sitting ruling 3 (fold ET-N-2)
- Test: the harness suites assert the new ids; grep proves the old ids gone

**Interfaces:**
- Produces: the five harness failure ids conforming to the 4a-ratified identifier-grammar
  clause (dot-namespaced by area; the leaf keeps the vocabulary's kebab-case; a prefix is
  never a substitute for a namespace). The settled set (sitting ruling 3):

  | Old | New |
  |---|---|
  | `rendered-allowlist-stale` | `rendered.allowlist-stale` |
  | `rendered-allowlist-unprobeable` | `rendered.allowlist-unprobeable` |
  | `rendered-allowlist-dead` | `rendered.allowlist-dead` |
  | `rendered-page-identity-mismatch` | `rendered.page-identity-mismatch` |
  | `rendered-state-unreachable` | `rendered.state-unreachable` |

  Two considered-and-declined refinements, recorded so the next reader does not re-file
  them (folds BR-N-1, BR-N-2): the `page-identity-mismatch` noun leaf stays (the audit-id
  vocabulary carries defect nouns — `chip-ground-collision` — and C16 counsels restraint
  beyond the namespace fix), and the `allowlist-` sub-prefix stays (`rendered` is the area;
  the clause namespaces by area). Both go in the ledger close.

- [ ] **Step 1:** A consumer allowlist CAN name these ids — `RenderedAllowlistEntry.rule`
  (`src/lib/audit/config.ts:64`) is a consumer-written rule id, and all five constants are
  emitted as `ruleId` on findings — so the **migration line is the expected outcome, not
  the exception** (fold ET-F-9): `Consumers must: update any cairn-audit.config.json
  allowlist rule values from rendered-* to rendered.*`.
- [ ] **Step 2:** Rename all five constants and every reference; update the reference page;
  drift-hunt the old ids across `docs/` and `skills/`.
- [ ] **Step 3:** CHANGELOG (behavior change to report output plus the allowlist migration
  line), ledger closes (the docket §6 open item resolves with this table; the
  `convention-identifier-grammar` amendment lands).
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** grep for `rendered-` as an id prefix in `src/` returns nothing;
the 23 bare-kebab rule ids are untouched; the audit report renders the new ids; the
grammar-convention ledger entry carries the five-id amendment.

---

### Task 14: The `variants` evidence sweep (ruling 4, evidence-first)

**Files:**
- Read (sweep): the five consumer repos' cairn configs and any `media:`/`variants` keys —
  `~/Projects/ecxc-ski`, `~/Projects/907-life`, `~/Projects/aksailingclub-org`,
  `~/Projects/xcathletes-org`, `~/Projects/cairn-pub` — plus
  `examples/showcase/src/theme/cairn.config.ts`, `templates/waymark`, and `docs/`
- Modify (branch-dependent): `src/lib/media/config.ts` (the `AssetConfig.variants` member,
  its per-variant validation loop at `:116` and the merge at `:127`
  (`{ ...BUILT_IN_PRESETS, ...(assets.variants ?? {}) }`; fold R2-N-4) — the field is
  unused, not inert; `presetUrl` looks up from
  the merged map — and, riding only on retire, the `VariantSpec` export), regenerated
  surface (**`ResolvedAssetConfig.variants` prints inline in `CairnRuntime` on the public
  surface**, `api-surface.md:19,466`, so the snapshot changes beyond the media page; fold
  ET-F-10), `docs/reference/media.md`, `CHANGELOG.md`, ledger

**Interfaces:**
- Produces: either a surface without `AssetConfig.variants` (retire branch) or a documented
  keep with the evidence recorded (keep branch). Both branches record the sweep evidence
  verbatim in the ledger.

- [ ] **Step 1:** Sweep every consumer config (and the showcase, template, and docs
  examples) for a set `variants` key on the media/asset config. The engine's own built-in
  presets (`thumb`, `inline`, `card`, `hero`) are not consumer usage; the question is
  whether any site MERGES a custom preset.
- [ ] **Step 2 (retire branch — nothing sets it):** drop the `variants` member from
  `AssetConfig` and `ResolvedAssetConfig`, delete the merge loop, keep the built-in presets
  as the whole preset vocabulary. This closes `presetUrl`'s only extension point, so the
  `Consumers must:` line names the surviving recourse — build a custom transform URL
  through `transformUrl` directly — not just "delete the `variants:` key" (fold BR-N-4).
  **The ledger work names its entries** (fold ET-F-10): the retire AMENDS
  `audit-adapter-assetconfig` (a ratified keep whose member this removes — the amendment
  records sitting ruling 4 as the authorization, not a silent overturn), closes
  `audit-adapter-variantspec` (`VariantSpec` rides only if the member goes — its keep
  rested on the member naming it), and re-tests `audit-media-resolvedassetconfig` in the
  same breath per that entry's own caveat. Task 14 has no rank/verify record of its own;
  sitting ruling 4 IS the authorization and the entries say so.
- [ ] **Step 3 (keep branch — something sets it):** no code change; the reference page
  gains the worked custom-preset example the field currently lacks, and the ledger records
  the keeping evidence (which site, which preset) in the same three entries.
- [ ] **Step 4:** Surface regen (retire branch; expect the `CairnRuntime` inline-shape
  rows to move), docs, ledger closes with the evidence either way.
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** the ledger entries quote the sweep evidence (repo, file, hit or
no-hit) so the branch taken is auditable; on retire, `presetUrl`'s built-in presets still
work, the transformations path's tests are green, and the recourse line names
`transformUrl`; no keep-to-retire flip beyond the ruling's own pre-authorization.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the changed code; domain reviewer fan-out — `svelte-reviewer`,
`daisyui-a11y-reviewer` MANDATORY for Tasks 9-10, `web-auth-security-reviewer` for Tasks 5
and 11's landed diffs, **`cloudflare-workers-reviewer` UNCONDITIONAL** (Task 11 moves
session SQL on two subsystems with certainty; a conductor who never reads diffs cannot
evaluate a conditional; fold SEC-N-3) — plus a fresh-context **cleanliness-and-beauty
review** (Opus, the same lens as round 1: surface elegance of the landed exports, the
before/after renders for Tasks 9-10 read against the design system, scar-tissue hunt over
the touched reference pages). Fix rounds; the mid-pass mechanic check (`engine-triage` on
anything filed); STATUS/HISTORY/ROADMAP updates; post-mortem appended here; both budgets
scored. ROADMAP hygiene owed by this pass: the chroma repair line clears if Task 12 lands
it; the spacing-convergence entry closes in Task 9; the 4b items leave the Now tier;
anything discovered routes to internals or chassis, never into this pass.

## What this pass hands forward

- **Internals pass:** unchanged from the STATUS routing list (the F-1 leak-class
  `check:surface` rider, `staleNames` per-subpath rescope, R-0's second direction, the six
  stale `content-routes-*` header wordings, `list-role` re-grounding, `panel-width`
  follow-up, the reference-page indexed-access convention — which Task 1's recovery line
  depends on, noted in its ledger close — the factory `CAIRN_DEV_BACKEND` refusal design
  question, plus 4a's quote-drift tripwire and vale reconciliation). NEW from this plan's
  review: the engine-wide access-semantics question (should a POST-relied concept check
  keep `canReach`'s permissive unmapped-target reading, or harden to the
  `authorizeAdminTarget` posture engine-wide — Task 5's design note; fold SEC-B-3).
- **Chassis pass:** the render trio re-homing (`cardShell`/`headRow`/`iconSpan` — explicitly
  untouched by Task 7), and the carried showcase hand-mounted `+page.server.ts` against
  generated `./$types`.
- **Release:** the window still holds; ONE cut after the chassis slice per the initiative
  design.

## Review folds (round 1, 2026-09-01)

Three reviewers ran against the plan as committed at `2ae181cd`: `engine-triage` (ET),
`web-auth-security-reviewer` (SEC), and an Opus cleanliness-and-beauty reviewer (BR) —
the third lens added by Geoff mid-review ("a cleanliness and beauty lens as well"), now a
standing pass dimension (header) and a pass-end reviewer.

**Engine-triage** (4 blockers, 10 fixes, 5 notes): B-1 → Task 10 re-authored to the
badge-tier half (the dot/register half landed in toolkit-seams; the docket was stale);
B-2 → Task 7 keeps `ComponentContext` on `/render` and rewrites the re-export record's
reason (its recorded justification named `strAttr`); the root-export claim corrected;
B-3 → Task 3 restated as two shapes on two types (`HistoryData.draft` + `RevertFailure`),
with the honest `Consumers must:` (the sweep never covered `HistoryData`); B-4 → Task 9
rules the parked `mb-6`/`mb-10` rhythm question explicitly and closes the ROADMAP entry
and WATCH comment its ledger Shape line requires. F-1 → the barrel-prune `KEPT` list in
Task 1's files; F-2 → `UsageEntry` goes module-internal (the inline branch is not viable;
eight-plus namers); F-3 → Task 2 gains the `/delivery/data` row, `CairnRuntime.publishActions`,
and the corrected function names; F-4 → `ResolvedPublishAction` recognized as
source-internal, no `Consumers must:`; F-5 → Task 6 threads both use sites (`:214`, `:261`);
F-6 → `TidyClient` keeps `models?.list` and `options.signal`; F-7 → Task 5's CHANGELOG
names the return-shape break; F-8 → four anchors corrected (`rendered.ts:188-192`,
`format.ts:68`, `types.ts:136/:176`, `ReproContext.svelte:214`); F-9 → Task 13's
`Consumers must:` allowlist migration is the expected outcome; F-10 → Task 14 names its
three ledger entries and the `CairnRuntime` surface effect. N-1 (arithmetic reconciles) —
no change; N-2 → the `convention-identifier-grammar` four-to-five amendment; N-3
(rename grammar verified) — no change; N-4 → Task 8's ledger close records the dead
verify-record path; N-5 → Task 2's home-flip described correctly.

**Security** (3 blockers, 8 fixes, 11 notes): B-1 → Task 11's channel half emits the
reconstructed `correlationId`, never the raw subject; B-2 → Task 5's attribution derives
from the resolved editor, `record.editor` dropped; B-3 → Task 5 names its sequence; the
plan reuses the engine's own mint sequence for parity and routes the engine-wide
fail-closed question to internals (disposition recorded in Task 5's design note — round 2
should test this reasoning). F-1 → editor derives from the event via `requireEditor`
(unforgeable), "safe by construction" claim scoped accordingly; F-2 → authorization-first
ordering, oracle-free refusal; F-3 → draft-existence via backend closes the header's
second obligation; token hygiene stated as unchanged; F-4 → no-row → no event, both
reference rows fixed; F-5 → all three `destroyChannelSession` call sites handled (logout
gains the pseudonym, verify-refused revocation gains the emit, orphan-cleanup omits the
identity); F-6 → Task 6's anchor fixed to `:214`, CSRF line fenced; F-7 → `include.missing`'s
`fragment` length-capped at 160; F-8 → the leak-safety comment carries to `error`, files
added. N-1 → the dictionary entry framed as contract-consistency; N-2 → dead `commitFields`
deleted; N-3 → workers reviewer unconditional; N-4 → dev fake-db handler added; N-6 →
`Consumers must:` names the discriminant; N-7 → "concept-scoped" wording; N-8 → owner
label is a schema identifier; N-9 → the settled-home comment rewrite (with ET-N-5); N-5,
N-10 → no change (verification notes); N-11 → `fixtureCsrf` residual filed to the friction
log in Task 6.

**Cleanliness and beauty** (9 fixes, 5 notes): F-1 → with ET-B-1, Task 10 re-authored;
F-2 → Task 9's stated design intent (PageHeader rhythm, `subtitle`→`meta` at `type-meta`,
honest changelog, before/after renders, ROADMAP + WATCH closure); F-3 → `scope`, not
`surface`; F-4 → `empty_fragment`/`not_found` snake_case; F-5 → `ctx.attr()`, not
`ctx.str()`; F-6 → the two-shape `lastSavedAt`/`draftLastSavedAt` naming; F-7 → every
breaking entry names its recovery, evidence to the ledger; F-8 → `previewMint` rename +
single editor source (with SEC-B-2); F-9 → the discriminator statement lives in the
ledger, not the reference page. N-1/N-2 → considered-and-declined refinements recorded in
Task 13's ledger close; N-3 → `tokens: { input, output }`; N-4 → "unused, not inert" +
the `transformUrl` recourse; N-5 → the `UsageEntry` shape picked in-plan (module-internal)
with the provisional-rendering ledger note.

**Round 2** (engine-triage, focused verification of the folded revision at `759a6bba`):
verified EVERY round-1 disposition clean — including Task 10's badge-tier re-authoring
against the ledger's progress note, the channel `correlationId` reconstruction (the
`deriveIdentity` `s:` branch makes `deriveIdentity(salt, subject, '')` byte-identical to
the request flow's derivation), Task 5's authorization-first ordering against the real
`previewMintAction`, the SEC-B-3 parity reasoning (ruled sound: a stricter exported helper
protects nothing while the engine's own `?/previewMint` keeps the permissive reading), and
Task 9's supersession (the 2026-08-26 ratified verdict postdates the 2026-07-20 ROADMAP
parking — supersession by later authority, not conductor override). It returned two
blockers and five fixes, all folded in this final revision: R2-B-1 → Task 5's sequence
stated in extracted form with the pinned `(runtime, config, event, target)` signature
(calling `requireEntryFromParams` would authorize route params, not the argument's entry);
R2-B-2 → the orphan-cleanup emit keeps its existing documented `correlationId` and merely
declines a second identity; R2-F-1 → the sibling `PublishActionEntry` `/delivery/data` row
drops per its own recorded intent, with its `Consumers must:`; R2-F-2 → the stale-reason
enforcement claim corrected (review holds it, no gate does); R2-F-3 → Task 12 re-derived
against the rule's ACTUAL advisory tier (the docket's hold-out fallback was the Task 10
staleness class again; the fallback is now no-change); R2-F-4 → the `types.ts:138` anchor;
R2-F-5 → Task 5's `Consumers must:` completed (call-form, dropped `db`, guard
precondition). Notes: R2-N-1 → the `authoring.ts:9-10` comment named; R2-N-2 →
`normalizePublishActions`' return type; R2-N-3 → follow-the-names on the barrel-prune
range; R2-N-4 → validation loop `:116`, merge `:127`; R2-N-5 → the logout salt-fault
branch (skip the record, never fail logout).

## Post-mortem (2026-09-02)

**Built and merged:** all fourteen tasks, PR #46, merge `12330d71`, CI fully green. The
worktree chain ran tasks 1-10 in the original session's workflow; a laptop power loss
killed it mid-Task 11, and the resumed session salvaged the warm tree (the Opus
implementer audited every step of the partial attempt against the acceptance criteria and
kept all of it, adding three proofs it lacked) and ran 11-14 through per-task Agent
chains. Two fix rounds inside the chain (Task 2 in the crashed session, Task 12's
conductor-ruled chroma scoping, Task 14's evidence-granularity round); the ritual added
the punch-list round, the simplifier, the five-lens fan-out, a 25-item review fix round,
and four verification micro-fixes.

**Verified with evidence:** `npm run check` 0/0 (1781 files), `npm test` exit 0 (6075
tests), every CI-only gate run by name locally and green on the PR, including the
from-scratch consumer e2e. The Task 9/10 visual work carries banked renders
(`docs/internal/record/2026-09-01-4b-task9-evidence/`) read by the a11y and beauty
reviewers; the badge-tier numbers were independently re-measured by the a11y lens and
reproduced exactly.

**Decisions locked in-pass:** the ratified 1.5 contrast floor stays untouched (the plan's
fallback logic; the floor-recalibration half re-filed with a measured-evidence requirement
and a failing-test tripwire on the residual); the `outcome`-discriminant grammar is
kebab-case at the type level (an implementer refused a conductor ruling to the contrary
with evidence, upheld on review); the expired-row DELETEs stay predicate-free with the
claims softened to "names no row" (the record-liveness fix routes to internals Task 13);
`badge-soft` is a documented boundary-less exemption, label-carries-state.

**Plan corrections for the next author:** the plan named a nonexistent `transformUrl` as
Task 14's recourse (the accurate recourse is the raw `/cdn-cgi/image/` form; verified and
substituted); the docket's StatusChip entry was stale against `main` (caught at
plan-authoring, Task 10 re-authored); Task 12's ASC corpus lacked in-repo pixel data, so
representative fixtures plus honest scoping was the executable shape.

**Blockers:** none carried. Hand-forwards are recorded in STATUS's routing lists and the
internals plan (folded pre-merge at Geoff's direction, twice-reviewed, awaiting the
approval gate).

**Budgets:** ceiling 6M. The crashed session's exact ledger is lost; its checkpoints show
tasks 1-10 inside pace. The resumed session spent ~3.3M attributable to 4b (chains for
11-14, the ritual, five reviews, fix rounds, close). Best estimate: at or slightly over
ceiling, the overrun in crash recovery plus the five-lens ritual, not the chains.
Interaction points: zero blocking questions; five Geoff-initiated mid-pass directives, all
folded without rework.
