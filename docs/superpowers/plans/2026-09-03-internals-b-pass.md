# Internals-B Pass Implementation Plan (audit remediation, slice 6: the four monolith splits)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute.js`. Steps use checkbox syntax for tracking.
> Round-1 three-lens review folded 2026-09-03 (grounding, security, hygiene-and-sizing);
> the fold notes below each carry their lens finding where the reasoning matters.

**Goal:** split the four ratified monoliths (`EditPage.svelte`, `CairnMediaLibrary.svelte`,
`content-routes-core.ts`, `audit/rendered.ts`) into focused units behind unchanged public
surfaces, absorbing the riders that live on the same lines: the `FieldInput`
`ownership_invalid_mutation` fix, the `EditorApi` single-holder refactor and revocation
contract, and the media-seed containment (read AND write paths — the review found the
write path open).

**Architecture:** every split preserves the existing import surface. `content-routes-core`
becomes six sibling modules behind the unchanged `content-routes.ts` composition root;
`audit/rendered.ts` becomes a directory whose old path stays the barrel so 17 rule files and
23 test files keep their imports; the two Svelte monoliths extract child components and
`.svelte.ts` modules that stay OUT of the components barrel. In Chain D the holder collapse
lands BEFORE the holder-consuming extractions (Tasks 12-13; Task 10's two units touch no
holder), so those units are born consuming the single `editor` grant and owning their own
entry-key resets (review fold: this removes planned rework and splits the largest task). The one deliberate seam change is `registerEditor` delivering
`null` on editor destroy, identity-guarded, free while the window is unpublished.

**Tech stack:** Svelte 5 runes, SvelteKit 2, TypeScript, vitest, the repo's gate estate.

**Spec:** `docs/internal/record/2026-09-02-internals-b-planning-inputs/docket.md` (ratified
defaults and routed-at-close) plus the recon and review evidence in this plan's anchors,
verified against `main` @ `ed586ee0`/`1d42a5d6` on 2026-09-03.

**Token ceiling:** 8M (15 tasks; re-rated at the round-1 fold from 7.5M/13 after the two
task splits). **Checkpoint interval:** every four tasks (checkpoints at 4, 8, 12).
**Execution:** workflow mode; the five chains below are mutually independent; tasks within
a chain are sequential. **Worktree:** `.claude/worktrees/internals-b` off `main`,
from-scratch showcase `npm ci` before trusting any e2e.

## Ruled drops and deferrals (recorded here so no task re-derives them)

- **Docket item 3 (confirm's destroy-then-create as one `db.batch()`) is DROPPED.** The
  "attach if cheaper" premise is falsified: `destroyChannelSession`'s
  `DELETE ... RETURNING` + `.first()` shape is not batchable as written, no call site in
  the codebase reads a per-statement result back out of a `db.batch()` (`auth-channel/
  store.ts:410` is the only session batch and is fire-and-forget), and batching would erase
  the deliberate fresh-clock liveness read documented at `factory.ts:1037-1040`.
  `auth/store.ts:290-303` already records a precedent for deliberately keeping a statement
  outside a batch. Atomicity buys nothing: a failure between the statements leaves no
  orphan. Reopen trigger: a real consistency defect traced to the gap.
- **The `session.expires_at` index asymmetry is DOCUMENTED, not migrated.** A migration is
  a hand-applied consumer action (`docs/extend/upgrade-cairn.md:31-36`) for a per-login
  scan over an editor-roster-sized table already measured negligible. Task 14 states the
  asymmetry at the sweep site. Reopen trigger: editor rosters stop being small.
- **Docket item 4 (OfficeList/AdminTable double scroll container) DEFERS to polish**, the
  second branch ratified default 6 explicitly permits. Precision for polish (round-2
  triage): `audit-admin-officelist` is a CLOSED reshape row (`engine-rulings.md:2660-2666`,
  executed by 4b, `Reopens on: closed`), so an outright retire there is a NEW proposal
  against a closed row, not a reopen. `viewport-overflow.ts:18-24`'s special case is built
  around the pair; unwinding it before that ruling is churn either way.
- **Docket item 12 (custom-screen read-seam boundary) was DROPPED as unfoundable at the
  2026-09-02 sitting** (ratified outcome 1). Listed here because this section is where a
  future reader looks for the pass's drops; the docket carries the reopen trigger (a
  consumer building a custom admin screen asks for an engine content-read seam).

## Global constraints

- **No public-surface change** except the `registerEditor` null-delivery contract (Task 11)
  and its `EditorApi` doc updates. `npm run check:surface` stays green with an UNCHANGED
  snapshot on every task; Task 11 regenerates only if the snapshot actually moves (the
  surface file records structural types by name without module homes, so it may not).
- **New files stay out of the components barrel** (the barrel-prune tests assert a fixed
  name list against `dist/components/index.d.ts`; internal children are imports only).
- Every new module carries the sibling-idiom header; TSDoc at the repo bar; no em dashes
  in comments.
- **Moves are verbatim wherever behavior is not named as changing**, with one systematic
  exception the diff-reviewer applies everywhere: a closure-scoped `runtime` reference
  becomes `ctx.runtime` where the target module's idiom requires it, and that substitution
  is the ONLY tolerated body change in a move step.
- **Authorization order is pinned, not assumed** (security lens): every task moving a
  load or action carries an explicit guard-preamble acceptance criterion; a reviewer
  rejects a move that reorders, merges, or "tidies" a guard.
- Behavior-changing steps are test-first; pure moves rely on existing suites plus the
  targeted runs each task names.
- Full gate per task via the implementer chain; at pass end the six CI-only gates BY NAME:
  `check:comments`, `check:reference:signatures`, `check:surface`, `check:snippets`,
  `check:transcripts`, `check:symbols`.
- Anchors verified against `ed586ee0` (`1d42a5d6` differs only by the plan docs); if
  `main` has advanced at dispatch, reconcile anchors first.

---

## Chain A: content-routes-core → six siblings (Tasks 1-4, sequential)

### Task 1: Extract `content-routes-shared.ts`, `content-routes-shell.ts`, `content-routes-list.ts`

**Files:**
- Create: `src/lib/sveltekit/content-routes-shared.ts`, `content-routes-shell.ts`,
  `content-routes-list.ts`
- Modify: `content-routes-core.ts` (remove moved spans), `content-routes.ts` (composition
  :54-97 gains `createShellActions`/`createListActions`; type re-export block repoints),
  `src/lib/sveltekit/preview.ts:274` (its private `isMissingTableError` duplicate collapses
  onto the shared export after verifying the two implementations are textually identical)
- Test: existing suites (pure moves)

**Interfaces:**
- Produces: `content-routes-shared.ts` exporting `conceptOf`, `requireEntryFromParams`,
  `isMissingTableError`, `clearPreviewTokens`, `manifestRow` (moved verbatim from core
  :421-574) plus `pendingEntryOf(runtime, ...)` lifted from closure scope (:591-596) to
  take `runtime` as its first parameter; its FOUR closure call sites (:645, :744, :871,
  :1617) updated. `ContentFormFailure` moves here (single home).
- Produces: `createShellActions(ctx)` → `{ shellLoad, helpLoad, indexLoad }` (:610-707,
  :735-755, :778-793) with `collectVisibleHrefs` (:716-728), `withRefusalCode` (:763-768);
  types `AdminShellData`, `HelpData`, `WelcomeData`, internal `NavConcept` move with it.
- Produces: `createListActions(ctx)` → `{ listLoad }` (:854-899) with `summarize`
  (:799-818), `pendingRow` (:825-827), `crawlEntries` (:833-844); types `EntrySummary`,
  `ListData`.
- **Name-collision note (security lens):** `content-routes-media.ts:1350` has a local
  `const manifestRow`; the shared export must not be imported there without renaming one.
  Record the collision in the shared module's doc comment.

- [x] **Step 1:** create `content-routes-shared.ts`; parameterize `pendingEntryOf`; update
  the four call sites. **The `clearPreviewTokens` containment comment moves and is
  REWRITTEN** (security lens): the current text (:1843-1847) claims file scope as the
  containment ("only from inside this shared core"); the true invariant after the split is
  "both delete paths route through `deleteEntry`, the sole delete-path caller" — write
  that, since a lie here gets 'corrected' wrong by internals-C's header sweep.
- [x] **Step 2:** create the shell and list modules per the multi-action idiom (destructure
  `const { runtime } = ctx;`); wire the composition root; repoint the type re-exports;
  collapse preview.ts's predicate duplicate.
- [x] **Step 3:** targeted suites (`content-routes-*`, `env-genericity`,
  `retires-task2-sanctioned-leak-replacements`, `content-routes-hand-mount`), full gate,
  `check:surface` unchanged. Commit.

**Acceptance criteria:** moved bodies verbatim except `pendingEntryOf`'s parameterization
and the sanctioned `runtime`→`ctx.runtime` substitutions; every existing importer compiles
unchanged; `shellLoad`/`helpLoad`/`indexLoad`/`listLoad` guard preambles byte-identical;
exactly one `isMissingTableError` definition remains in `src/lib`.

### Task 2: Extract `content-routes-preview.ts`

**Files:**
- Create: `src/lib/sveltekit/content-routes-preview.ts`
- Modify: `content-routes-core.ts`, `content-routes.ts`

**Interfaces:**
- Produces: `createPreviewActions(ctx)` → `{ previewMintAction, previewRevokeAction }`
  (:2066-2108, :2122-2147) with `missingPreviewTableFailure` (:570-574) as a local helper;
  internal type `PreviewMintFailure` moves.

- [x] **Step 1:** create the module per the small-module idiom (fully-qualified `ctx.*`);
  move both actions; wire the composition root.
- [x] **Step 2:** targeted preview suites, full gate, surface unchanged. Commit.

**Acceptance criteria (security lens, replacing the impossible "byte-identical"):** bodies
identical modulo `runtime` → `ctx.runtime`; **authorization order unchanged** — the mint
path still runs `previewMint`'s internal authorization before anything else and the origin
requirement at the site the comments at :2071-2077/:2126-2128 describe; the
`unknown-concept` (404), `invalid-id` (400), and `no-draft` (400) refusal shapes and
status codes unchanged; `previewRevokeAction` still routes through `preview.ts`'s
standalone `previewRevoke`.

### Task 3: `content-routes-entry.ts` — the load/save/publish family

**Files:**
- Create: `src/lib/sveltekit/content-routes-entry.ts`
- Modify: `content-routes-core.ts`, `content-routes.ts`,
  `src/lib/components/FragmentPicker.svelte:13` (repoints its `FragmentTarget` type import
  at the new sibling), `src/tests/component/FragmentPicker.test.ts:4`,
  `src/tests/unit/env-genericity.test.ts:21`,
  `src/tests/unit/retires-task2-sanctioned-leak-replacements.test.ts:13`,
  `src/tests/unit/content-routes-hand-mount.test.ts:23`,
  `src/lib/reproductions/{fixtures.ts:21,index.ts:15,ReproContext.svelte:57,stories/support.ts:8}`

**Interfaces:**
- Produces: `createEntryActions(ctx)` opening with `{ createAction, editLoad, historyLoad,
  saveAction, publishAction, publishAllAction }` (:902-948, :951-1178, :1223-1253,
  :1495-1505, :1515-1591, :1604-1701) plus helpers `commitEditorName` (:1192-1194),
  `draftFromBranchHead` (:1205-1215), `saveRefusal` (:1302-1304), `saveToBranch`
  (:1314-1489, ctx-coupled), and the entry-only Tier-A helpers (`resolvePreview`,
  `invalidIdMessage`, `retiredContentAdvisory`, `commaListParam`,
  `BUILTIN_FRONTMATTER_KEYS`). Type `FragmentTarget` moves here; **it is deliberately NOT
  re-exported through `content-routes.ts`** — the retires ruling
  (`engine-rulings.md:1749`) dropped that re-export by design, so `FragmentPicker.svelte`
  and its test repoint at `./content-routes-entry.js` directly. Types `EditData`,
  `HistoryData` move; the reproductions/test type importers repoint per name.
- Consumes: everything `content-routes-shared.ts` exports.

- [x] **Step 1:** create the module (destructured `runtime`); move the six actions and the
  helpers; repoint the type importers whose names moved in this half.
- [x] **Step 2:** targeted suites (`content-routes-edit`, `content-routes-preview`
  integration, `FragmentPicker`), full gate, surface unchanged. Commit.

**Acceptance criteria:** guard preambles byte-identical per action — `createAction`,
`editLoad`, `historyLoad` keep their inline `requireEditor` → `conceptOf` →
`requireEngineAccess` → `isValidId` shapes (:903-911, :952-956, :1224-1228); `saveAction`
and `publishAction` keep `requireEntryFromParams` (:1496, :1516); **`publishAllAction`
keeps its per-entry `canReach` (:1605, :1618) and gains no single `requireEngineAccess`**;
no re-export of `FragmentTarget` appears in `content-routes.ts`.

### Task 4: The mutation family and the death of `content-routes-core.ts`

**Files:**
- Modify: `content-routes-entry.ts` (gains the mutation family), `content-routes.ts`
- Delete: `content-routes-core.ts`
- Modify: `src/lib/reproductions/stories/publish.ts:17` (repoints `DeleteRefusal`),
  `src/tests/unit/check-editor-quotes.test.ts:131` (generalize the hardcoded core path to
  glob every `content-routes-*.ts` sibling), `vitest.config.ts:113` (the one live config
  reference)

**Interfaces:**
- Produces: `createEntryActions` completes with `{ discardAction, deleteAction,
  listDeleteAction, renameAction, revertAction }` (:1707-1724, :1852-1855, :1858-1866,
  :1874-2051, :2182-2273) plus `deleteEntry` (:1733-1849), `draftExistsFailure`
  (:2158-2165), `revertSchemaDrift` (:464-475). Type `DeleteRefusal` moves here and, per
  the same retires ruling, is NOT re-exported through `content-routes.ts`;
  `stories/publish.ts` repoints directly.

- [x] **Step 1:** move the five actions and helpers; delete core.ts; repoint the remaining
  importers; generalize the editor-quotes test path list. Append a one-line annotation to
  the two ledger rows whose FACTS the delete falsifies (`engine-rulings.md:725` "still
  calls it internally", `:1749` "stays in `content-routes-core.ts`"): the module became
  `content-routes-entry.ts` at internals-B — annotate, never rewrite the rows.
- [x] **Step 2:** full content-routes suite plus `check:editor-quotes`, `check:docs`, full
  gate, surface unchanged. Commit.

**Acceptance criteria:** guard preambles byte-identical — `discardAction`, `deleteAction`,
`renameAction`, `revertAction` keep `requireEntryFromParams` (:1708, :1853, :1875, :2183);
**`listDeleteAction` continues to read its entry id from the FORM BODY, not
`event.params`** (:1858-1866; the docstring at :519-521 warns exactly against absorbing it
into `requireEntryFromParams` — an implementer must not "tidy" it); both delete paths
still route through `deleteEntry`, the sole delete-path caller of `clearPreviewTokens`;
no file named `content-routes-core.ts` remains; **stale-name criterion scoped to live
references only** (grounding lens): `src/lib`, `src/tests`, `vitest.config.ts`,
`ROADMAP.md` — CHANGELOG history, closed ledger rows, and `docs/internal/record/` keep
their historical mentions untouched.

---

## Chain B: audit/rendered.ts → directory (Tasks 5-6, sequential)

### Task 5: `audit/rendered/` — types, findings, identity

**Files:**
- Create: `src/lib/audit/rendered/types.ts`, `findings.ts`, `identity.ts`
- Modify: `src/lib/audit/rendered.ts` (re-exports the moved names)

**Interfaces:**
- Produces: `types.ts` holding every interface — including `PageIdentity` (:370),
  `RenderedDeps` (:615), and `CairnAuditPageHelpers` (:786), which are EXTRACTED FROM
  WITHIN ranges later tasks move (grounding lens: they sit inside the identity/bootstrap/
  page-surface spans; pull them into types.ts here and leave the logic behind).
  `findings.ts` holds the finding-builders (:211-353, :453-466), the five rule-id consts,
  `SURFACED_UNREACHED_STATES`, `positionless`, `resolveRenderedFindings` (:491-530).
  `identity.ts` holds `capturePageIdentity`, `identitiesMatch`, `waitForHydrationSettle`,
  `captureSsrIdentity` (:363-448); arrows run types ← findings ← identity only.
- **Preserved contract:** `rendered.ts` re-exports every moved name — types AND the three
  value imports rules use (`ensurePageHelpers`, `resolveColors`, **and `applyState`**,
  which `panel-width.test.ts` imports) — so all **17** rule files and **23** test files
  compile with zero import changes; `color.ts:13`'s type-only `RenderedFinding` import
  unchanged.

- [x] **Step 1:** create the three modules; move verbatim; re-export from `rendered.ts`.
- [x] **Step 2:** run the three resolver-sensitive suites (`advisory-refutations`,
  `gate-refutations`, `rulings.border-contrast`) plus `audit/rendered.test.ts`; full gate.
  Commit.

**Acceptance criteria:** zero changes under `src/lib/audit/rules/` and `src/tests/`; the
`color.ts` type cycle unchanged in direction.

### Task 6: `bootstrap.ts`, `page-surface.ts`, and the orchestrator remainder

**Files:**
- Create: `src/lib/audit/rendered/bootstrap.ts`, `page-surface.ts`
- Modify: `src/lib/audit/rendered.ts`
- Test: a new unit case for the redaction fix below

**Interfaces:**
- Produces: `bootstrap.ts` (:532-620 logic) and `page-surface.ts` (:626-916 logic, the
  menu-open/row-expanded state machinery included), with `rendered.ts` shrinking to
  `runRendered` + `redirectTrapRefusal` + the barrel re-exports.
- **One deliberate behavior fix rides the move (security lens):** `resolveExtraCookies`
  (:572-594) currently interpolates a malformed `CAIRN_AUDIT_COOKIES` entry — cookie VALUE
  included — into its thrown error, so a session value lands in a CI log. During the move
  the message redacts per branch (round-2 triage: the shapes differ): the `eq === -1`
  branch (:579) has no name to report, so it reports the entry's POSITION only; the
  `name === ''` branch (:584) reports position only, never the value. Test-first, one
  case per branch.

- [x] **Step 1:** write the failing redaction test (a malformed entry's value must not
  appear in the thrown message).
- [x] **Step 2:** create both modules (the redaction landing in `bootstrap.ts`); shrink
  `rendered.ts`; M1 headers on both new modules naming the page-evaluate discipline where
  it applies.
- [x] **Step 3:** `panel-width.test.ts`, the norms-bands browser suite, full gate. Commit.

**Acceptance criteria:** `rendered.ts` ≤ 450 lines including re-exports (grounding lens
measured ~384 expected; the old "~300" was wrong); every rule and test file untouched
except the new redaction test; no cookie value reachable in any thrown message from the
cookie parser.

---

## Chain C: CairnMediaLibrary dialog extractions (Tasks 7-9, sequential)

### Task 7: The Escape scope switch, then orphan tools and bulk-delete out

**Files:**
- Create: `src/lib/components/MediaOrphanTools.svelte`, `MediaBulkDeleteDialog.svelte`,
  `media-library-helpers.ts`
- Modify: `CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts`

**Interfaces:**
- Produces (Step 1, BEFORE any extraction — grounding lens: Tasks as previously ordered
  broke `onWindowKeydown`'s six named dialog refs two tasks before fixing them):
  `onWindowKeydown` (:288-290) drops the named refs for a query **scoped to the
  component's own root element** (`rootEl.querySelector('dialog[open]')` off a
  `bind:this` container ref), NOT `document`-wide (security lens: a document query lets
  the admin shell's palette dialog suppress the library's Escape-to-close). All six
  library dialogs live inside the component subtree, so scoped matching preserves today's
  semantics exactly, including after extraction. **The resulting intra-component scope
  split is deliberate and gets a comment** (round-2 triage): `libraryDropBusy` (:623-627)
  stays DOCUMENT-scoped because drag-drop should stand down for ANY open dialog, the
  palette included, while Escape must never be stolen by a foreign dialog — one question,
  two correct scopes, stated where both live so the internals-C comment sweep reads a
  true rationale.
- Produces: `MediaOrphanTools.svelte` (script :1158-1332 — the cluster ends at :1332, not
  :1339; `brokenWhereUsed` stays in the shell — markup :2812-3105), self-contained,
  own-`getContext` csrf, exposing `open()`; `MediaBulkDeleteDialog.svelte` (script
  :1040-1157, markup :2581-2803) taking `hashes`, `assets`, the `usageCount` helper
  import, and `onfinished` wired to `clearSelection`. `media-library-helpers.ts` holds
  the pure fact helpers (:145-156, :836-848) taking `data` explicitly. The shell's `csrf`
  `getContext` hoists from :333 to the script top.

- [x] **Step 1:** write the failing Escape test (an open dialog rendered by a child
  component must still claim Escape; the named-ref implementation cannot see it); land
  the scoped-query switch; green.
- [x] **Step 2:** hoist helpers and csrf; extract orphan tools; suite green.
- [x] **Step 3:** extract bulk-delete with its prop/callback contract; full gate. Commit.

**Acceptance criteria:** Escape and selection-clear behavior identical to HEAD for every
dialog, open or closed, before and after extraction (the scoped query is the mechanism);
dialog markups byte-identical in their new homes; the shell declares no orphan/bulk state.

### Task 8: Replace and alt-fill dialogs out

**Files:**
- Create: `src/lib/components/MediaReplaceDialog.svelte`, `MediaAltFillDialog.svelte`
- Modify: `CairnMediaLibrary.svelte`; component tests

**Interfaces:**
- Produces: each dialog takes the pinned `asset` at open, re-fetches `csrf`, owns its
  preview/apply cycle (replace: script :327-560, markup :2053-2301; alt-fill: script
  :715-835 minus hoisted helpers, markup :2310-2572); each exposes `open(asset)`/`close()`
  and `onapplied`.

- [x] **Step 1:** extract replace; suite green. **Step 2:** extract alt-fill; full gate;
  commit.

**Acceptance criteria:** the slide-over triggers (:1937, :1947) open both; pinned-asset
semantics unchanged; markup byte-identical.

### Task 9: Upload dialog and drag-drop wiring

**Files:**
- Create: `src/lib/components/MediaUploadDialog.svelte`
- Modify: `CairnMediaLibrary.svelte`; component tests

**Interfaces:**
- Produces: the upload dialog (script :561-714, dialog markup :3113-3158, the hidden
  `<input>` currently at :1438 in the shell's top-level template) exporting
  `onPageDragover`/`onPageDrop` for the shell's `<svelte:window>` (stays in the shell
  beside `onWindowKeydown`) and `openUpload()` for the three trigger sites.

- [x] **Step 1:** extract; wire the triggers and window handlers; component suite; full
  gate. Commit.

**Acceptance criteria:** all three trigger sites open it; drag-drop still stands down
while any dialog is open (`libraryDropBusy` :623 unchanged); shell script under 700 lines
(a hard number; the recon's cluster arithmetic supports it).

---

## Chain D: EditPage — collapse first, then extractions (Tasks 10-13, sequential)

### Task 10: ShareLinkPanel and the editor-preference module

**Files:**
- Create: `src/lib/components/ShareLinkPanel.svelte`, `editor-preferences.svelte.ts`
- Modify: `EditPage.svelte`
- Test: `edit-page-preview-share.test.ts`, `editor-pref-isolation.test.ts`

**Interfaces:**
- Produces: `ShareLinkPanel.svelte` owning script **:1118-1238** (grounding lens:
  :1240-1246 is `pickAction`, which closes over the shell's `actionsMenu` ref and STAYS)
  plus its markup block, taking `conceptId`, `entryId`, `csrf`, `previewMint`.
  **The panel mounts inside `{#key entryKey}`** (security lens: the minted preview URL is
  a bearer credential whose scoping today rests on the entry-key remount; the mount
  placement preserves it structurally until Task 11's per-unit resets), and
  `edit-page-preview-share.test.ts:230`'s entry-hop clearing assertions are UNCHANGED —
  harness edits only.
- Produces: `editor-preferences.svelte.ts` owning the storage-backed toggle STATE from
  :401-537. **`setZen`'s DOM choreography stays in the shell** (grounding lens: the
  `.cm-editor` containment read at :502 must precede the `zen` flip, then `flushSync()`,
  then the `.cm-content` focus at :510 — and `check:cm-internals`, a CI-only gate with a
  file-enumerated allowlist, fails any new components file mentioning `.cm-`; keeping the
  choreography in `EditPage.svelte`, already allowlisted, avoids both hazards). The module
  exposes state and setters; the shell's `setZen` consumes them and keeps the DOM reads.
- The broken-links cluster (:1248-1262) stays in the shell UNCHANGED — the prior plan's
  `setBody` unification step is dropped (grounding lens: `removeBrokenLink` at :1259 is
  already the only `body` writer outside init and the reset; the figure cluster writes
  through `replaceRange`, so there was no second direct writer to unify).

- [x] **Step 1:** extract the share panel inside the key block; share suite green with
  assertions unchanged. **Step 2:** extract the preference state module; pref-isolation
  suite green; full gate. Commit.

**Acceptance criteria:** share/revoke flows identical; the entry-hop clearing test passes
with its original assertions; zen focus still lands in CodeMirror content; no `.cm-`
string appears in any new file; `check:cm-internals` (run by name — it is in neither
`npm run check` nor `npm test`) passes.

### Task 11: The holder collapse and the identity-guarded revocation seam

**Files:**
- Modify: `EditPage.svelte`, `MarkdownEditor.svelte`, `docs/reference/components.md`,
  `CHANGELOG.md`; `docs/internal/api-surface.md` only if the snapshot moves
- Test: component suites capturing the grant; a new failing test first

**Interfaces:**
- **Produces (seam change, unpublished window):**
  `registerEditor?: (api: EditorApi | null) => void`. `MarkdownEditor` delivers the api on
  mount (:2303-2317 receiving side) and delivers `null` from `onDestroy` — the real
  destroy path is **:967-970** (grounding lens; the previously cited :959-962 is inside
  the grant object literal). **The revocation is identity-guarded** (security lens): the
  host nulls its holder only when the revoked api IS the one it currently holds (reference
  compare), so an out-of-order destroy-after-mount under `{#key}` cannot clobber a live
  grant; and the null delivery is a no-op when no grant was delivered (SSR teardown).
- EditPage replaces the 13 `$state.raw` holders (:545-560, :564-566, :745-750), the reset
  block (:1378-1390), and the fan-out callback with one
  `let editor = $state.raw<EditorApi | null>(null)`. **Every consumer rewrite follows this
  13-row default table (security lens — the `getSelectionRange` row is the one that
  silently corrupts a tidied body if missed):**

  | member | current default | rewritten expression |
  |---|---|---|
  | `insert` | no-op | `editor?.insert(...)` |
  | `replaceRange` | no-op | `editor?.replaceRange(...)` |
  | `selectRange` | no-op | `editor?.selectRange(...)` |
  | `insertLink` | no-op | `editor?.insertLink(...)` |
  | `getSelection` | `() => ''` | `editor?.getSelection() ?? ''` |
  | `getSelectionRange` | `() => null` | `editor?.getSelectionRange() ?? null` |
  | `format` | no-op | `editor?.format(...)` |
  | `tidyApi` | `null` | `editor?.tidy ?? null` |
  | `undoEditor` | no-op | `editor?.undo()` |
  | `caretCoords` | `null`-ish holder | `editor?.caretCoords ?? null` |
  | `focus` | no-op | `editor?.focus()` |
  | `placeholders` | `null` | `editor?.imagePlaceholders ?? null` |
  | `insertImageFn` | no-op | `editor?.insertImage(...)` |

  (`?? null` on `getSelectionRange` is mandatory: bare `editor?.getSelectionRange()`
  yields `undefined`, `if (range)` at :621 treats it as absent, and tidy falls into the
  fuzzy `body.indexOf` mapping the range seam exists to avoid — corrections then land on
  an earlier identical passage and publish.)
- The shell's entry-key reset shrinks to `editor = null` plus shell-owned slots; the
  extracted units from Tasks 10/12/13 own their `entryKey`-scoped resets as they are born.
- **Reset completeness becomes enforced, and one measured defect is fixed here** (round-2
  triage; source `int-coherence.md:230-231`): EditPage carries ~78 `$state` declarations
  and the reset covers a fraction by hand; **`uploadedRecords` (:784) is missing from the
  reset today, so a same-route link hop carries entry A's media records into entry B's
  save payload** (:1524, :1548, :2337). Fix test-first (entry-hop test asserting the save
  payload carries no prior entry's records), add `uploadedRecords` to the reset, and land
  a source-enumeration unit test that parses `EditPage.svelte`'s `$state`/`$state.raw`
  declarations and fails when any name is neither in the reset nor in an explicit
  commented exempt list — so the distributed-reset design cannot silently drop state.

- [x] **Step 1:** write the failing revocation test: navigating the entry key revokes the
  captured grant (nulled) before the new mount registers, AND a stale revocation (an old
  api reference delivered after a newer grant) does NOT clobber the newer grant.
- [x] **Step 2:** land null delivery + identity guard in `MarkdownEditor`; land the single
  holder and the 13 consumer rewrites per the table; migrate the reset; green — including
  the internals pass's existing stale-view regression test and the tidy selection-mapping
  suite (which pins the `?? null` row).
- [x] **Step 3:** update `components.md`'s contract (delivery on mount, identity-guarded
  null on destroy), extend the unpublished CHANGELOG entry in place, run
  `check:reference:signatures`; regenerate the surface snapshot only if `check:surface`
  reports drift. Full gate. Commit.

**Acceptance criteria:** exactly one holder; the 13-row table realized verbatim (the
diff-reviewer checks each row); revocation identity-guarded and SSR-safe; docs and
signatures gates green.

### Task 12: TidyController and FigureEditor out (consuming `editor`)

**Files:**
- Create: `src/lib/components/tidy-controller.svelte.ts`, `figure-editor.svelte.ts`
- Modify: `EditPage.svelte`
- Test: tidy-review and figure component suites

**Interfaces:**
- Produces: `tidy-controller.svelte.ts` owning :562-737's logic, taking **a getter**
  `getEditor: () => EditorApi | null` (grounding lens: `$state.raw` values passed by value
  into a `.svelte.ts` module lose reactivity; getters are the load-bearing form), exposing
  `tidyMode`/`tidyBusy`; the shell derives `insertDisabled` from `mode` plus the exported
  `tidyMode`. `figure-editor.svelte.ts` owning :839-1029's logic with getters for
  `caretComponent`/`mediaAtCaret` (written by the shell from the `MarkdownEditor`
  callbacks at :2318-2319) and writes through `editor?.replaceRange`/`selectRange`.
  Each module owns its `entryKey`-scoped reset at birth.

- [x] **Step 1:** extract tidy with the getter seam; tidy suites green (including the
  selection-mapping cases). **Step 2:** extract figure editing; figure/caret suites green;
  entry-switch suite extended to assert both modules' state resets on entry hop; full
  gate. Commit.

**Acceptance criteria:** `insertDisabled` truth-table unchanged; tidy undo/applied flows
identical; figure writes byte-identical on fixtures; the extended entry-switch test
covers both new resets.

### Task 13: DetailsPanel owns the hero refs; the `registerHeroField` fix

**Files:**
- Create: `src/lib/components/DetailsPanel.svelte`
- Modify: `EditPage.svelte`, `FieldInput.svelte`, `ObjectGroupField.svelte`,
  `RepeatableField.svelte`
- Test: `edit-page-v2-fields.test.ts`, `reference-field.test.ts`, a new failing test first

**Interfaces:**
- Produces: `DetailsPanel.svelte` owning the Details fieldset markup (~:2531-2620), the
  `<FieldInput>` loop, and local ownership of **`heroFieldRefs` ONLY** (round-2 triage
  blocking find: the previously claimed `heroNeedsAlt`/`uploadedRecords` ownership serves
  one of at least four cross-boundary consumers). The full seam, per consumer:
  - `heroFieldRefs` moves into the panel (truly local once Step 2's callback lands);
    `focusHeroAlt(name)` is the one exposure, serving the needs-alt jump (:1309).
  - `heroNeedsAlt` STAYS a shell `$state`: the shell's `heroRows` derived (:1279) feeds
    the needs-alt notice from it; the panel forwards FieldInput's existing
    `onheroneedsalt` callback up unchanged.
  - `uploadedRecords` STAYS a shell `$state`: it has TWO writers — the fields tree and
    the media slide-over's `onuploaded` at :2762, outside the panel — and three shell
    consumers (:1524, :1548, the hidden form input :2337). The panel forwards
    `onuploaded` up, exactly as FieldInput already reports it.
- **The ratified callback fix, realized precisely (grounding lens: `bind:this` cannot
  simply be "deleted"):** `FieldInput` keeps a LOCAL `bind:this` on `MediaHeroField`
  (:274) and adds an effect calling `registerHeroField(name, ref)` on mount/change and
  `registerHeroField(name, null)` on teardown; the `heroFieldRefs` PROP is removed from
  all three components' interfaces (`FieldInput.svelte:50,74,291,293`,
  `ObjectGroupField.svelte:41,59,91`, `RepeatableField.svelte:56,74,273,288`), each
  forwarding the callback as they forward `onuploaded`/`onheroneedsalt`. The
  benign-warning comment (:271-272) is deleted with the mutation it excused.

- [x] **Step 1:** failing test — mounting the fields tree with an image field logs no
  `ownership_invalid_mutation` warning (it currently does).
- [x] **Step 2:** land the callback and prop removal through the three components; green.
- [x] **Step 3:** extract `DetailsPanel` owning the ref map with its own entry-key reset;
  wire `focusHeroAlt` and the two forwarded callbacks; full gate. Commit.

**Acceptance criteria:** zero ownership warnings across the component suite; needs-alt
jump focuses the right input; the `heroFieldRefs` name exists in exactly one file;
`heroNeedsAlt` and `uploadedRecords` remain shell-owned with their consumers unchanged
(the save payload and the hidden `media` input verified by the existing suites plus Task
11's entry-hop test).

---

## Chain E: standalone riders

### Task 14: Media-seed containment (read AND write), the WATCH discharges, the asymmetry statement

**Files:**
- Modify: `src/lib/media-seed/bin.ts:22-26,67-77`, `src/lib/media-seed/run.ts:61-62`,
  `src/lib/media-seed/assemble.ts:74-81`, `src/lib/auth/store.ts:202-203`,
  `migrations/0000_auth.sql:23-24`, `src/lib/audit/rules/static/list-role.ts` (~:60, a
  `// WATCH:` comment), `scripts/checks/check-surface-leaks.mjs:242-244` (one word)
- Test: beside media-seed's existing coverage, failing tests first

**Interfaces:** none new.

- [x] **Step 1 (the security lens's blocking find — the WRITE path):** failing test: a
  manifest row with `hash: "../../evil"` (or a hostile `ext`) must be refused BEFORE any
  byte is written. Fix by validating first — apply `HASH_RE`/`R2_EXT_RE` (the `r2Key`
  rules, `media/naming.ts:113-119`) in `normalizeManifest` so a hostile row never reaches
  the write, AND give `writeTempFile` (`bin.ts:22-26`) the same
  resolved-path-stays-under-base assert as defense in depth. The current order (write at
  `run.ts:61`, validate at :62) is the defect.
- [x] **Step 2 (the read path):** failing test, then the three-line containment assert on
  `readFileUnderCwd` (`bin.ts:70-77`), matching `doctor/bin.ts:58-71`'s shape with
  media-seed's OWN error prefix (contract-identical, not byte-identical — the doctor's
  message names `cairn-doctor`); delete the discharged `// WATCH:` (:67-69).
- [x] **Step 3:** add the `// WATCH:` on `static/list-role.ts`'s `lastCompound` (~:60)
  recording the two tokenizer gaps (newline/tab combinators; escaped brackets outside
  quotes) and their trigger (a real selector exercising either shape) — the routed item
  the previous draft dropped (hygiene lens). Correct `check-surface-leaks.mjs:242-244`'s
  routing pointer from "internals-B" to "internals-C" (that is where the modeling task
  landed). Add the accepted-asymmetry statement at the auth sweep site and schema (why no
  `expires_at` index: roster-sized table, negligible scan, migrations are hand-applied
  consumer actions; reopen: rosters stop being small). Full gate; commit.

**Acceptance criteria:** the traversal tests fail on HEAD's behavior and pass after; no
write occurs for a refused manifest row; both `readFileUnderCwd` closures
contract-identical with distinct prefixes; no discharged WATCH remains and the lastCompound
WATCH exists; the leak-gate pointer names internals-C.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; reviewer fan-out — `svelte-reviewer` (Chains C, D),
`daisyui-a11y-reviewer` (the four extracted dialogs, the Escape scoping),
`cloudflare-workers-reviewer` (Chain A), `web-auth-security-reviewer` (Chain A, Chain B's
cookie-parser redaction, Chain D's seam, Task 14 — mandatory), the standing
cleanliness-and-beauty review; fix rounds per the chain discipline; the six CI-only gates
BY NAME (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`, `check:transcripts`, `check:symbols`) **plus `check:cm-internals`** (CI-only,
outside both `npm run check` and `npm test`); from-scratch consumer proof (the showcase
exercises EditPage and the media library end-to-end); whole-log friction triage;
STATUS/HISTORY/ROADMAP (the monolith line: four split; `content-routes-media.ts` at
**1,447** lines recorded as the remaining tracked monolith); post-mortem here; both
budgets scored.

## What this pass hands forward

- **internals-C (next, same approval sitting):** the coherence slice; the
  `ctx.logCommitFailed` call-style note joins its header sweep (preserve `:1672`'s
  `'publish.failed'` argument — verified safe to unify, `commit-log.ts:33`).
- **Chassis:** the showcase exemplar half of audit finding 8; the render trio re-homing.
- **Polish:** the OfficeList ruling + scroll rider; `formatTimestamp` widening; the
  command palette live region.
- **Release:** the window holds; ONE cut after polish.

## Post-mortem

**What was built.** Chain A retired `content-routes-core.ts` (2,294 lines) into five siblings,
`content-routes-shared.ts`, `content-routes-shell.ts`, `content-routes-list.ts`,
`content-routes-preview.ts`, and `content-routes-entry.ts` (which also absorbed the
delete/rename/revert mutation family), with `content-routes.ts` staying the unchanged
composition root. Chain B split `audit/rendered.ts` (1,124 lines) into a directory,
shrinking the barrel to 289 lines over `audit/rendered/{types,findings,identity,bootstrap,
page-surface}.ts`. Chain C pulled five dialogs out of `CairnMediaLibrary.svelte` (3,169 to
1,261 lines): `MediaOrphanTools`, `MediaBulkDeleteDialog`, `MediaReplaceDialog`,
`MediaAltFillDialog`, `MediaUploadDialog`, plus a shared `media-library-helpers.ts`. Chain D
collapsed `EditPage.svelte`'s 13 `EditorApi` holders onto one identity-guarded `editor` grant
and extracted `ShareLinkPanel.svelte`, `DetailsPanel.svelte`, `editor-preferences.svelte.ts`,
`tidy-controller.svelte.ts`, and `figure-editor.svelte.ts` (2,952 to 2,575 lines), and fixed
`FieldInput`'s `ownership_invalid_mutation` warning by replacing its `bind:this` prop with a
`registerHeroField` callback. Chain E hardened `cairn-media-seed`'s read and write
containment (symlink resolution, pre-fetch hash/ext/slug validation), discharged the routed
`// WATCH:` comments, and recorded the accepted `session.expires_at` index asymmetry.

**What was verified.** Every chain task cleared its own gate through the
implementer/diff-reviewer/gate chain before its commit. At pass end, on the settled tree
(`c8551988`): `npm run check` (0/0), `npm test` (374 files / 4,927 tests in the unit and
integration projects, 78 files / 1,354 tests in the component project, exit 0), and every
CI-only gate green by name (`check:comments`, `check:reference`, `check:reference:signatures`,
`check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`, `check:cm-internals`,
`check:docs`, `check:package`, `check:editor-quotes`). The `svelte-reviewer` fan-out
also ran a from-scratch `npm run package` plus an `examples/showcase` production build
(confirmed proving this worktree's engine, not a stale symlinked one) and a compiler probe
settling the `registerEditor` memoization question ahead of the identity-guard finding
below. The five-reviewer fan-out (`svelte-reviewer`, `daisyui-a11y-reviewer`,
`cloudflare-workers-reviewer`, `web-auth-security-reviewer`, the standing
cleanliness-and-beauty lens) found no blocking architectural defect, and their fix-now
findings folded into three parallel fixer commits (`ee446bd3` media-dialog a11y, `eb26bf1c`
media-seed hardening and comment corrections, `c8551988` the EditPage-family findings). A
fresh-context `diff-reviewer` (Opus) then read all three fixer commits against their source
findings and accepted every one, confirming no em dash landed on any added line and that
each fixer stayed inside its assigned file list.

**Decisions locked in**, recorded here since none had a natural home elsewhere in the plan:
`eb26bf1c` exported `realDeps` from `media-seed/bin.ts` (an internal barrel, no package
subpath reaches it) so the symlink-escape test can drive it, and added an exported,
not-re-exported `stripControlChars` to `assemble.ts`. `c8551988` moved
`tidy-controller.svelte.ts`'s `controller?.abort(); controller = null;` to after the
`$state` resets, so the reset-coverage fence encloses only `$state` names (behavior
unchanged inside the synchronous `untrack`); chose `COPIED_RESET_MS = 2000` for the
share-URL copy confirmation; and reveals the details panel with a bare
`flushSync(() => (detailsOpen = true))` rather than `openDetails()`, so the panel's
close-button focus does not fight the alt-field focus the needs-alt jump delivers.

**What went wrong.** Two of the three parallel fixer dispatches ran `git stash` inside the
one shared worktree and transiently clobbered each other's uncommitted work; both were
caught and recovered before commit, but the near-miss is the reason a later pass-end split
across multiple writers must give each its own worktree, never a shared one. Separately, the
third fixer's own session died at exit 137 mid-ritual (a CLI update landed under it) after
its targeted suites had already passed 368/368 and `npm run check` had already read 0/0; the
conductor verified the warm tree was the fixer's completed work, ran the two lint-family
gates that had not yet run (`check:comments`, `check:cm-internals`) green, and committed the
tree as `c8551988` rather than re-dispatching work already proven done.

**Budgets scored.** Ceiling: 8M tokens. Spend: not captured before the session that ran
Chain D's fixer and the final gate sweep was killed by the CLI update; no figure is
recorded, and the gap is itself a process defect for the next pass to close: checkpoint
token spend at every fixer dispatch, not just the four-task interval. Human
interaction points: two. The combined plan-approval question on 2026-09-03 evening (which
also carried the overnight git authorization for both internals-B and internals-C), and the
resume instruction that restarted the session after the CLI-update kill. Zero questions
during chain execution or the review fold itself.
