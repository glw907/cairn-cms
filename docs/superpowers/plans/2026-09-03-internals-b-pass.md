# Internals-B Pass Implementation Plan (audit remediation, slice 6: the four monolith splits)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute.js`. Steps use checkbox syntax for tracking.

**Goal:** split the four ratified monoliths (`EditPage.svelte`, `CairnMediaLibrary.svelte`,
`content-routes-core.ts`, `audit/rendered.ts`) into focused units behind unchanged public
surfaces, absorbing the riders that live on the same lines: the `FieldInput`
`ownership_invalid_mutation` fix, the `EditorApi` single-holder refactor and revocation
contract, and the media-seed containment assert.

**Architecture:** every split preserves the existing import surface. `content-routes-core`
becomes five sibling modules behind the unchanged `content-routes.ts` composition root;
`audit/rendered.ts` becomes a directory whose old path stays the barrel so 16 rule files and
20 test files keep their imports; the two Svelte monoliths extract child components and
`.svelte.ts` modules that stay OUT of the components barrel (internal children, not new
public surface). The one deliberate seam change is `registerEditor` delivering `null` on
editor destroy, free while the window is unpublished.

**Tech stack:** Svelte 5 runes, SvelteKit 2, TypeScript, vitest (unit/integration/component),
the repo's gate estate.

**Spec:** `docs/internal/record/2026-09-02-internals-b-planning-inputs/docket.md` (the
ratified defaults and the routed-at-close section) plus the recon evidence in this plan's
task anchors, all verified against `main` @ `ed586ee0` on 2026-09-03.

**Token ceiling:** 7.5M. **Checkpoint interval:** every four tasks (checkpoints at 4, 8, 12).
**Execution:** workflow mode; the five chains marked below are mutually independent.
**Worktree:** `.claude/worktrees/internals-b` off `main`, from-scratch showcase `npm ci`
before trusting any e2e.

## Ruled drops and deferrals (recorded here so no task re-derives them)

- **Docket item 3 (confirm's destroy-then-create as one `db.batch()`) is DROPPED.**
  Recon falsified the "attach if cheaper" premise: `destroyChannelSession`'s
  `DELETE ... RETURNING` + `.first()` shape is not batchable as written, no call site in
  the codebase reads a per-statement result back out of a `db.batch()`, and batching would
  erase the deliberate fresh-clock liveness read the internals pass documented at
  `factory.ts:1037-1040`. Atomicity buys nothing here: a failure between the two statements
  leaves no orphan (the old row is already gone; confirm re-runs mint fresh). The pass-end
  records close the docket item with this rationale.
- **The `session.expires_at` index asymmetry is DOCUMENTED, not migrated.** A new migration
  is a hand-applied consumer action (`docs/extend/upgrade-cairn.md:31-36`), and the sweep it
  would speed (`auth/store.ts:203`, run per login) scans an editor-roster-sized table the
  Workers review already measured as negligible. Task 13 states the accepted asymmetry at
  the sweep site; the channel schema indexes because member counts can be large.
- **Docket item 4 (OfficeList/AdminTable double scroll container) DEFERS to polish**, riding
  the OfficeList outright-retire ruling (ratified default 6: no internals-B effort on a
  component polish may retire). `viewport-overflow.ts:18-24`'s special case is built around
  the pair; unwinding it before the retire ruling would be churn either way that ruling goes.

## Global constraints

- **No public-surface change** except the `registerEditor` null-delivery contract (Task 12)
  and its `EditorApi` doc updates. `npm run check:surface` stays green with an UNCHANGED
  snapshot on every task except Task 12 (which regenerates and commits it).
- **New files stay out of the components barrel.** `components-barrel.test.ts` and the
  barrel-prune tests assert membership; extracted children are internal imports only.
- Every new module carries the sibling-idiom header (one line naming the concern, then the
  shared-context boilerplate for `content-routes-*`; M1-style headers elsewhere), TSDoc
  comments at the repo bar, no em dashes in comments.
- Splits move code verbatim wherever behavior is not named as changing: a moved function's
  body is byte-identical unless a task step says otherwise. The diff-reviewer holds each
  task to that.
- Behavior-changing steps are test-first; pure moves rely on the existing suites staying
  green plus the targeted no-regression runs each task names.
- Full gate per task (`npm run check` 0/0, `npm test` exit 0) via the implementer chain;
  the six CI-only gates by name at pass end.
- Anchors below were verified against `ed586ee0`; if `main` has advanced at dispatch,
  reconcile anchors first (the internals pass's own pre-dispatch step).

---

## Chain A: content-routes-core → five siblings (Tasks 1-3, sequential within the chain)

### Task 1: Extract `content-routes-shared.ts`, `content-routes-shell.ts`, `content-routes-list.ts`

**Files:**
- Create: `src/lib/sveltekit/content-routes-shared.ts`, `src/lib/sveltekit/content-routes-shell.ts`,
  `src/lib/sveltekit/content-routes-list.ts`
- Modify: `src/lib/sveltekit/content-routes-core.ts` (remove moved spans),
  `src/lib/sveltekit/content-routes.ts` (composition root :54-97 gains
  `createShellActions(ctx)` / `createListActions(ctx)`; type re-export block :36-43 repoints)
- Test: existing suites; no new test files (pure moves)

**Interfaces:**
- Produces: `content-routes-shared.ts` exporting `conceptOf`, `requireEntryFromParams`,
  `isMissingTableError`, `clearPreviewTokens`, `manifestRow` (moved verbatim from core
  :421-574 Tier A) plus `pendingEntryOf(runtime, ...)` lifted from closure scope (:591-596)
  to a module-level helper taking `runtime` as its first parameter, exactly as `conceptOf`
  already does. `ContentFormFailure` moves here (single home; core re-imports until Task 3
  deletes it).
- Produces: `createShellActions(ctx)` returning `{ shellLoad, helpLoad, indexLoad }`
  (core :610-707, :735-755, :778-793) with local pure helpers `collectVisibleHrefs`
  (:716-728) and `withRefusalCode` (:763-768); types `AdminShellData`, `HelpData`,
  `WelcomeData`, internal `NavConcept` move with it.
- Produces: `createListActions(ctx)` returning `{ listLoad }` (:854-899) with local helpers
  `summarize` (:799-818), `pendingRow` (:825-827), `crawlEntries` (:833-844); types
  `EntrySummary`, `ListData` move with it.

- [ ] **Step 1:** create `content-routes-shared.ts` with the six helpers plus
  `ContentFormFailure`, each moved verbatim; `pendingEntryOf` gains the `runtime` parameter
  and its three closure call sites in core are updated to pass it.
- [ ] **Step 2:** create the shell and list modules per the sibling idiom (multi-action
  modules destructure `const { runtime } = ctx;`, per the codebase's own rule of thumb);
  wire both into `createContentRoutesInternal`; repoint the type re-exports so every
  existing `import type ... from './content-routes-core.js'` consumer resolves unchanged
  through `content-routes.ts`.
- [ ] **Step 3:** run the targeted suites (`content-routes-*.test.ts`, `env-genericity`,
  `retires-task2-sanctioned-leak-replacements`, `content-routes-hand-mount`), then the full
  gate. `npm run check:surface` must be unchanged.
- [ ] **Step 4:** commit.

**Acceptance criteria:** core.ts no longer contains the moved spans; the four type-only test
importers and the reproductions fixtures compile unchanged; the public `ContentRoutes` type
is untouched; all moved bodies byte-identical except `pendingEntryOf`'s parameterization.

### Task 2: Extract `content-routes-preview.ts`

**Files:**
- Create: `src/lib/sveltekit/content-routes-preview.ts`
- Modify: `content-routes-core.ts`, `content-routes.ts` (composition + type re-exports)

**Interfaces:**
- Produces: `createPreviewActions(ctx)` returning `{ previewMintAction, previewRevokeAction }`
  (core :2066-2108, :2122-2147) with `missingPreviewTableFailure` (:570-574) moved in as a
  local helper (its only two consumers live here); internal type `PreviewMintFailure` moves.
- Consumes: `isMissingTableError` from `content-routes-shared.ts` (Task 1).

- [ ] **Step 1:** create the module per the small-module idiom (fully-qualified `ctx.*`, no
  destructure — the two-action rule the siblings already follow); move both actions
  verbatim; wire the composition root.
- [ ] **Step 2:** targeted preview suites (`content-routes-preview.test.ts` and the
  preview-store integration tests), full gate, surface unchanged. Commit.

**Acceptance criteria:** both actions byte-identical; `previewRevokeAction` still routes
through `preview.ts`'s standalone `previewRevoke` (the Task-12-of-internals shape); the
route-level 404/400 refusals unchanged.

### Task 3: `content-routes-entry.ts` and the death of `content-routes-core.ts`

**Files:**
- Create: `src/lib/sveltekit/content-routes-entry.ts`
- Delete: `src/lib/sveltekit/content-routes-core.ts`
- Modify: `content-routes.ts`, `src/tests/unit/check-editor-quotes.test.ts:131` (the
  source-text scan hardcodes the core path; generalize it to glob every
  `content-routes-*.ts` sibling so the scanned strings follow the code)

**Interfaces:**
- Produces: `createEntryActions(ctx)` returning the eleven lifecycle exports (`createAction`,
  `editLoad`, `historyLoad`, `saveAction`, `publishAction`, `publishAllAction`,
  `discardAction`, `deleteAction`, `listDeleteAction`, `renameAction`, `revertAction`; core
  :902-2273) with local helpers `commitEditorName`, `draftFromBranchHead`, `saveRefusal`,
  `saveToBranch`, `deleteEntry`, `draftExistsFailure` and the entry-only Tier-A helpers
  (`resolvePreview`, `invalidIdMessage`, `revertSchemaDrift`, `retiredContentAdvisory`,
  `commaListParam`, `BUILTIN_FRONTMATTER_KEYS`) moved in.
- Consumes: everything `content-routes-shared.ts` exports.

- [ ] **Step 1:** create the module (destructured `runtime`, per the multi-action rule);
  move the eleven actions and helpers verbatim; note and do NOT "fix" the pre-existing
  `ctx.logCommitFailed` vs bare `logCommitFailed` call-style inconsistency
  (:1672 vs :2249) — record it for the internals-C header sweep instead.
- [ ] **Step 2:** delete core.ts; repoint `content-routes.ts`'s remaining imports and type
  re-exports; generalize the editor-quotes test's path list.
- [ ] **Step 3:** full targeted content-routes suite plus `check:editor-quotes`, full gate,
  surface unchanged. Commit.

**Acceptance criteria:** no file named `content-routes-core.ts` remains; every doc or comment
naming it is updated (grep the tree); `content-routes.ts` is the only composition change;
all 17 original exports reachable exactly as before.

---

## Chain B: audit/rendered.ts → directory (Tasks 4-5, sequential within the chain)

### Task 4: `audit/rendered/` — types, findings, identity

**Files:**
- Create: `src/lib/audit/rendered/types.ts`, `src/lib/audit/rendered/findings.ts`,
  `src/lib/audit/rendered/identity.ts`
- Modify: `src/lib/audit/rendered.ts` (re-export the moved names; keep everything else)

**Interfaces:**
- Produces: `types.ts` holding every interface (`RenderedPage`, `RenderedContext`,
  `RenderedBrowser`, `PlaywrightModule`, `RenderedRuleContext`, `RenderedFinding`,
  `RenderedRule`, `ResolvedRenderedFinding`, `RenderedPageVisit`, `InteractionState`,
  `Theme`, `PageIdentity`, `RenderedDeps`, `CairnAuditPageHelpers`) — no logic.
  `findings.ts` holding the finding-builders (rendered.ts :211-353, :453-466), the five
  rule-id consts, `SURFACED_UNREACHED_STATES`, `positionless`, and `resolveRenderedFindings`
  (:491-530). `identity.ts` holding `capturePageIdentity`, `identitiesMatch`,
  `waitForHydrationSettle`, `captureSsrIdentity` (:363-448); it imports `positionless` and
  `pageIdentityMismatchFinding` stays in `findings.ts` (the arrows run types ← findings ←
  identity, never backward).
- **Preserved contract:** `rendered.ts` re-exports every moved name, so `color.ts:13`'s
  type-only import of `RenderedFinding`, all 16 rule files, and all 20 test files compile
  with zero import changes.

- [ ] **Step 1:** create the three modules, move verbatim, re-export from `rendered.ts`.
- [ ] **Step 2:** run the three resolver-sensitive suites the recon named
  (`advisory-refutations`, `gate-refutations`, `rulings.border-contrast`) plus
  `audit/rendered.test.ts`, then the full gate. Commit.

**Acceptance criteria:** zero changes under `src/lib/audit/rules/` and `src/tests/`; the
type-only cycle with `color.ts` unchanged in direction.

### Task 5: `bootstrap.ts`, `page-surface.ts`, and the orchestrator remainder

**Files:**
- Create: `src/lib/audit/rendered/bootstrap.ts`, `src/lib/audit/rendered/page-surface.ts`
- Modify: `src/lib/audit/rendered.ts` (now: `runRendered` + `redirectTrapRefusal` + the
  barrel re-exports, nothing else)

**Interfaces:**
- Produces: `bootstrap.ts` (`defaultIsReachable`, `resolveBaseUrl`, `resolveExtraCookies`,
  `defaultLoadPlaywright`, `loadPlaywrightModule`, `DEFAULT_BASE_URL`; :532-620) and
  `page-surface.ts` (`neededStates`, `applyState` with the menu-open/row-expanded
  machinery, `resolveColors`, `resolveColorsInPage`, `probeSelectors`,
  `installPageHelpers`, `ensurePageHelpers`; :626-916). Rules keep importing
  `ensurePageHelpers`/`resolveColors` as values from `../../rendered.js` via the barrel.
- Consumes: Task 4's modules.

- [ ] **Step 1:** create both modules, move verbatim; `rendered.ts` shrinks to the
  orchestrator plus re-exports; give each new module its M1 header naming the "runs via
  `page.evaluate`, self-contained by source" discipline where it applies.
- [ ] **Step 2:** run `panel-width.test.ts` (the one test importing `applyState` directly)
  plus the norms-bands browser suite, full gate. Commit.

**Acceptance criteria:** `rendered.ts` is under ~300 lines; every rule and test file
untouched; `npm run test:component` unaffected.

---

## Chain C: CairnMediaLibrary dialog extractions (Tasks 6-8, sequential within the chain)

### Task 6: Orphan tools and bulk-delete dialogs out; helpers hoisted

**Files:**
- Create: `src/lib/components/MediaOrphanTools.svelte`,
  `src/lib/components/MediaBulkDeleteDialog.svelte`,
  `src/lib/components/media-library-helpers.ts`
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (mounting paths only where selectors
  changed; assertions unchanged)

**Interfaces:**
- Produces: `MediaOrphanTools.svelte` owning the orphan scan/purge cluster (script
  :1158-1339, markup :2812-3105) — fully self-contained per recon; it re-fetches `csrf` via
  its own `getContext` and exposes `open()`; the trigger button stays in the shell toolbar.
  `MediaBulkDeleteDialog.svelte` owning script :1040-1157 + markup :2581-2803, receiving
  `hashes: string[]` (pinned at open), `assets`, a `usageCount(hash)` helper import, and an
  `onfinished: () => void` callback the shell wires to `clearSelection`.
  `media-library-helpers.ts` holding the pure fact helpers (`usageCount`, `needsAlt`,
  `usageEntries`-family; script :145-156, :836-848) as plain exported functions taking
  `data` explicitly.
- Also in this task: hoist the `csrf` `getContext` call from :333 to the top of the shell's
  script (it serves seven flows and lands in children by their own `getContext`).

- [ ] **Step 1:** hoist helpers and `csrf`; extract the orphan component (the zero-coupling
  cut first); component suite green.
- [ ] **Step 2:** extract the bulk-delete dialog with its prop/callback contract; verify the
  sticky action bar still opens it and `clearSelection` fires on finish; full gate. Commit.

**Acceptance criteria:** both dialog markups byte-identical inside their new homes (ARIA
contracts and danger-register comments travel intact); the shell no longer declares any
orphan/bulk state; `CairnMediaLibrary.test.ts` passes with at most selector-path edits.

### Task 7: Replace and alt-fill dialogs out

**Files:**
- Create: `src/lib/components/MediaReplaceDialog.svelte`,
  `src/lib/components/MediaAltFillDialog.svelte`
- Modify: `CairnMediaLibrary.svelte`; component tests as above

**Interfaces:**
- Produces: each dialog receives the pinned `asset` (the shell passes `selected` at open),
  re-fetches `csrf`, and owns its full preview/apply cycle (replace: script :327-560, markup
  :2053-2301; alt-fill: script :715-836 minus the hoisted where-used helpers, markup
  :2310-2572); each exposes `open(asset)`/`close()` and an `onapplied` callback for the
  shell's `invalidateAll` path.

- [ ] **Step 1:** extract replace; suite green. **Step 2:** extract alt-fill; full gate;
  commit.

**Acceptance criteria:** the slide-over's trigger buttons (:1937/:1947) still open both;
pinned-asset semantics unchanged (opening pins, closing clears); markup byte-identical.

### Task 8: Upload dialog, drag-drop wiring, and the Escape-handling switch

**Files:**
- Create: `src/lib/components/MediaUploadDialog.svelte`
- Modify: `CairnMediaLibrary.svelte`; component tests

**Interfaces:**
- Produces: the upload dialog (script :561-715, markup :3113-3158 plus the hidden input)
  exporting `onPageDragover`/`onPageDrop` handlers for the shell's `<svelte:window>` (which
  stays in the shell beside `onWindowKeydown`) and an `openUpload()` the three trigger sites
  (header snippet, empty state, toolbar) call.
- **Behavior change (test-first):** `onWindowKeydown` (:288) stops reading `.open` off six
  named dialog refs and instead uses `document.querySelector('dialog[open]')`, the idiom
  `libraryDropBusy` (:623) already uses — extracted children no longer expose refs.

- [ ] **Step 1:** write the failing test for Escape handling with an extracted dialog open
  (the named-ref path cannot see it); implement the querySelector switch; green.
- [ ] **Step 2:** extract the upload dialog and wire the three triggers and the window
  handlers; full gate. Commit.

**Acceptance criteria:** Escape claimed by any open dialog exactly as before; drag-drop
suppressed while any dialog is open; the shell's `<svelte:window>` line owns both handler
sets; shell script is now under ~700 lines.

---

## Chain D: EditPage extractions, the holder collapse, and the FieldInput fix (Tasks 9-12, sequential within the chain)

### Task 9: ShareLinkPanel, broken-links banner, editor-preference module

**Files:**
- Create: `src/lib/components/ShareLinkPanel.svelte`,
  `src/lib/components/editor-preferences.svelte.ts`
- Modify: `src/lib/components/EditPage.svelte`
- Test: `edit-page-preview-share.test.ts`, `editor-pref-isolation.test.ts` (paths/harness
  only; assertions unchanged)

**Interfaces:**
- Produces: `ShareLinkPanel.svelte` owning script :1118-1246 and its markup block, taking
  `conceptId`, `entryId`, `csrf`, `previewMint` — the recon's cleanest cut, zero holder
  coupling. `editor-preferences.svelte.ts` owning the localStorage-backed toggles
  (:401-537) as a rune module; `setZen`'s DOM reach into `editorCard` becomes a
  `focusEditorSurface: () => void` callback the shell passes in (the shell keeps
  `editorCard`).
- The broken-links cluster (:1248-1262) stays in the shell this task but its direct
  `body = next` write is promoted onto a single `setBody(next: string)` shell function that
  the figure cluster's holder path and this cluster both route through (one write path, so
  the entry-key reset and tidy's reads never race a second idiom).

- [ ] **Step 1:** extract the share panel; share suite green. **Step 2:** extract the
  preferences module with the callback seam; pref-isolation suite green. **Step 3:**
  introduce `setBody` and route both writers through it; full gate. Commit.

**Acceptance criteria:** share/revoke flows behave identically (counts, errors, copied
state); zen focus still lands in the CodeMirror content; exactly one code path assigns
`body` outside the reset.

### Task 10: TidyController and FigureEditor out

**Files:**
- Create: `src/lib/components/tidy-controller.svelte.ts`,
  `src/lib/components/figure-editor.svelte.ts`
- Modify: `EditPage.svelte`
- Test: tidy-review and figure-related component suites

**Interfaces:**
- Produces: `tidy-controller.svelte.ts` owning :562-737 (runTidy/cancel/close/applied/undo,
  the three status-dialog effects) plus the tidy dialog markup staying in the shell template
  but driven by the controller's exported state. The controller exposes `tidyMode` and
  `tidyBusy`; the shell's `insertDisabled` derives from `mode` plus the controller's
  exported `tidyMode` (resolving the recon's straddle). It consumes the `editor` grant's
  tidy members via the holder the shell passes (post-Task-12 this becomes `editor.tidy`
  etc.; this task takes the four current holders as parameters).
  `figure-editor.svelte.ts` owning :839-1029 with `caretComponent`/`mediaAtCaret` passed in
  as `$state` the shell still writes from the `MarkdownEditor` callbacks (:2318-2319), and
  writes routed through `setBody`/the range holders.

- [ ] **Step 1:** extract tidy; tidy suites green. **Step 2:** extract figure editing;
  figure/caret suites green; full gate. Commit.

**Acceptance criteria:** `insertDisabled` truth-table unchanged (preview mode or tidy mode
disables); tidy undo and applied-body flows identical; figure apply/unwrap writes produce
byte-identical bodies on the existing fixtures.

### Task 11: DetailsPanel owns the hero refs; the `registerHeroField` fix

**Files:**
- Create: `src/lib/components/DetailsPanel.svelte`
- Modify: `EditPage.svelte`, `src/lib/components/FieldInput.svelte`,
  `src/lib/components/ObjectGroupField.svelte`, `src/lib/components/RepeatableField.svelte`
- Test: `edit-page-v2-fields.test.ts`, `reference-field.test.ts`, plus a new failing test
  first for the warning

**Interfaces:**
- Produces: `DetailsPanel.svelte` owning the Details fieldset markup (~:2531-2620), the
  `<FieldInput>` loop, and LOCAL ownership of `heroFieldRefs`/`heroNeedsAlt`/
  `uploadedRecords`; it exposes `focusHeroAlt(name: string)` for the needs-alt notice's
  jump action (EditPage :1309 currently reaches into the ref map directly).
- **The ratified FieldInput fix, callback shape** (docket default 2; recon recommendation):
  `FieldInput` gains `registerHeroField: (name: string, ref: MediaHeroField | null) => void`
  beside its existing `onuploaded`/`onheroneedsalt` callbacks; the
  `bind:this={heroFieldRefs[name]}` write at `FieldInput.svelte:274` and its
  benign-warning comment (:271-272) are deleted; `ObjectGroupField`/`RepeatableField`
  forward the callback exactly as they forward the existing two.

- [ ] **Step 1:** write the failing test asserting no `ownership_invalid_mutation` warning
  is logged when mounting the fields tree with an image field (the current code warns).
- [ ] **Step 2:** land the callback through the three field components; green.
- [ ] **Step 3:** extract `DetailsPanel` owning the map; wire `focusHeroAlt`; the
  needs-alt notice and `markFieldsDirty` paths verified; full gate. Commit.

**Acceptance criteria:** zero Svelte ownership warnings across the component suite; the
needs-alt jump still focuses the right hero alt input; `heroFieldRefs` is declared in
exactly one file.

### Task 12: One `editor` holder, per-unit resets, and the revocation contract

**Files:**
- Modify: `EditPage.svelte`, `src/lib/components/MarkdownEditor.svelte`,
  `docs/reference/components.md`, `CHANGELOG.md`, `docs/internal/api-surface.md`
  (regenerated), `src/tests/component/` suites that capture the grant
- Test: a new failing test first for null delivery

**Interfaces:**
- **Produces (seam change, unpublished window):** `registerEditor?: (api: EditorApi | null) => void`.
  `MarkdownEditor` delivers the api on mount as today and delivers `null` from its destroy
  path (:959-962), closing the svelte-review W1 stale-grant window at the source.
- EditPage replaces the 13 `$state.raw` holders (:545-560, :564-566, :745-750), the reset
  block (:1378-1390), and the fan-out callback (:2303-2317) with one
  `let editor = $state.raw<EditorApi | null>(null)`; every consumer site reads
  `editor?.member` (tidy :619-627/:693/:734, figure :1025-1028, notices :1304, shortcuts
  :1576-1595, the `editorApi` derived :763-768 collapses away). The Task 10/11 extractions
  take `editor` (or a getter) instead of individual holders.
- The monolithic entry-key reset (:1348-1392) shrinks to shell-owned state only
  (`editor = null` plus the shell's own slots); each extracted unit from Tasks 9-11 owns an
  `$effect.pre` keyed on the same `entryKey` for its own state, so reset responsibility
  lives with the state it resets.

- [ ] **Step 1:** write the failing test: destroy the editor (navigate the entry key) and
  assert the grant is revoked (the captured api reference is nulled) before the new mount
  registers.
- [ ] **Step 2:** land null delivery in `MarkdownEditor`; land the single holder and
  consumer rewrites in EditPage; migrate the per-unit resets; green.
- [ ] **Step 3:** update `components.md`'s `EditorApi`/`registerEditor` contract (delivery
  on mount, null on destroy), CHANGELOG (extend the unpublished `registerEditor` entry in
  place — the window is unreleased, one entry), regenerate the surface snapshot
  (`npm run check:surface -- --update`), run `check:reference:signatures`; full gate. Commit.

**Acceptance criteria:** exactly one holder; no consumer touches a stale view between
remount and re-registration (the internals-pass regression test still passes and the new
revocation test pins the null); the reference page and TSDoc state the null contract; the
13-holder comment vocabulary is gone from the tree.

---

## Chain E: standalone riders

### Task 13: media-seed containment; the `expires_at` asymmetry statement

**Files:**
- Modify: `src/lib/media-seed/bin.ts:67-77`, `src/lib/auth/store.ts` (comment at the sweep,
  :203), `migrations/0000_auth.sql` (comment beside the index block, :24)
- Test: `src/tests/unit/` beside media-seed's existing coverage

**Interfaces:** none produced; mechanical.

- [ ] **Step 1:** write the failing test: `media-seed`'s `readFileUnderCwd` refuses a path
  that resolves outside cwd (mirror the doctor's existing test shape).
- [ ] **Step 2:** land the same three-line resolved-path-stays-under-base assert
  `doctor/bin.ts:58-71` carries; delete the `// WATCH:` comment (:67-69) it discharges.
- [ ] **Step 3:** add the accepted-asymmetry statement at the auth sweep site and schema
  (why `session.expires_at` carries no index while the channel schema's does: roster-sized
  table, per-login scan measured negligible, an index migration is a hand-applied consumer
  action not worth the cost; reopen trigger: editor rosters stop being small). Full gate;
  commit.

**Acceptance criteria:** the two `readFileUnderCwd` closures are behavior-identical; no
`WATCH` comment remains for either discharged item; the asymmetry rationale is greppable at
both sites.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; reviewer fan-out — `svelte-reviewer` (Chains C and D:
the extractions, the reset migration, the null contract), `daisyui-a11y-reviewer` (the four
extracted dialogs' ARIA contracts and the Escape switch), `cloudflare-workers-reviewer`
(Chain A: the routes moves), `web-auth-security-reviewer` (Chain A moves touching
auth-adjacent load/actions plus Task 13), plus the standing cleanliness-and-beauty review;
fix rounds per the chain discipline; the six CI-only gates by name; from-scratch consumer
proof (the showcase exercises EditPage and the media library end-to-end — this is the real
gate on the two Svelte splits); whole-log friction triage; STATUS/HISTORY/ROADMAP (ROADMAP's
monolith line updates: four split, `content-routes-media.ts` at 1,414 lines becomes the
recorded remaining monolith with its own line); post-mortem here; both budgets scored.

## What this pass hands forward

- **internals-C (next):** the coherence slice per the ratified split — its plan is authored
  and rides the same approval sitting as this one. The Task 3 note (the
  `ctx.logCommitFailed` call-style inconsistency) joins its lying-headers sweep inputs.
- **Chassis:** the showcase exemplar-tier half of the audit's finding 8 (the custom-screen
  shape); the render trio re-homing (standing).
- **Polish:** the OfficeList retire ruling and, riding it, the scroll-container item
  (deferred above); `formatTimestamp` accept-set widening; the command palette live region
  (standing).
- **Release:** the window still holds; ONE cut after polish.
