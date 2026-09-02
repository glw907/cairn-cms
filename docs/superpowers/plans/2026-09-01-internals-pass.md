# Internals Pass Implementation Plan—DRAFT (pre-4b-merge, round-1 folded)

> **DRAFT STATUS:** authored 2026-09-01 while the conformance pass (4b) executes; round-1
> adversarial review (engine-triage + `web-auth-security-reviewer` + the
> cleanliness-and-beauty lens) ran PRE-MERGE at Geoff's direction, reading committed
> worktree state `189bf2d7`, and its findings are folded into this revision (dispositions
> in "Review folds" at the end). **Before dispatch this plan must:** (1) reconcile line
> anchors against 4b's MERGED surface (anchors below are against `189bf2d7` where the
> review corrected them, `ea45e182` elsewhere; treat as symbolic wherever 4b touched the
> file); (2) absorb anything 4b's post-mortem routes here beyond what the fold already
> carried; (3) pass round 2, an `engine-triage` verification of this folded revision.
> This block is the canonical statement of the pre-dispatch gates; other sections point
> here rather than restating them. Round 2 ran 2026-09-01 and its seven fixes are
> applied (see "Review folds (round 2)"). Items (1) and (2) ran 2026-09-02 against
> merged `main` at `a5352f0b`: the 4b post-mortem routes nothing beyond what the fold
> already carried, and the anchor sweep confirmed every anchor except four corrections
> applied inline (Task 5: `sveltekit.md:1917`; Task 6: the vacuous block at `:1031`
> and the STATUS `:272` note overtaken; Task 8: the diagnostic-message defects' real
> site is `list-role.ts`, not `sheet.ts:544`). All pre-dispatch gates are discharged.

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js` with `parallel: false` (shared CHANGELOG, ledger,
> and check-script files). Steps use checkbox (`- [ ]`) syntax. Thirteen tasks.

**Goal.** Four workstreams:

1. **Standing gates the audit initiative owes:** the self-use gate (Task 1), the F-1
   leak rider (Task 2), the `staleNames` per-subpath rescope (Task 3), the quote-drift
   tripwire and vale reconciliation (Task 4).
2. **Routed internal reshapes:** the MarkdownEditor seam collapse (Task 7), the two
   audit-rule measurement re-groundings (Task 8).
3. **The ruled design questions:** the indexed-access convention (Task 5), the
   CAIRN_DEV_BACKEND refusal (Task 9), the access-semantics two-posture model (Task 10),
   the SITE_CONFIG_PATH boundary (Task 11).
4. **Residue and record honesty:** the six stale headers and the vacuous assertion
   (Task 6), the `previewRevoke` export half (Task 12), the destroyed-record liveness
   condition and the `formatTimestamp` contract (Task 13).

Mostly consumer-invisible, riding outside the `Consumers must:` window except where a
task states otherwise (Tasks 7 and 10 state otherwise; Task 12 is a non-breaking new
export and Task 13 extends 4b's unpublished entry in place, so neither adds a
`Consumers must:` line).

**Architecture:** This is the audit-remediation internals slice. The ratified sequence is
internals → internals-B (monoliths and coherence) → chassis → polish, with ONE release
cut after polish. Compiled evidence:
`docs/internal/record/2026-09-01-internals-planning-inputs/docket.md`—every item
verified against `main` at compile time (the 4b staleness lesson applied), sources cited
per item. **Scope cut (RATIFIED):** this pass carries STATUS's routed list plus the
4a/4b hand-forwards (docket items 1-15) plus two small review-inbound tasks (12 and 13,
added at the round-1 fold; the growth is stated plainly: +2 tasks, both small, both
public-surface evenness items that must precede the release cut). ROADMAP's larger
"internals half" (docket item 16) is NOT absorbed—Task 11 re-files it as the follow-on
slice "internals-B: monoliths and coherence."

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate plus
the CI-derived gate list.

**Spec:** the docket above; verdicts close in `docs/internal/engine-rulings.md`.

**Worktree:** `.claude/worktrees/internals`, branched from `main` AFTER 4b merges.
From-scratch `npm ci` in `examples/showcase` before trusting any e2e.

**Token ceiling:** 6.5M (re-rated at the round-1 fold from 5M: four new gate scripts
with failing-first proofs and CI wiring, a 13-prop collapse across a 2,600-line
component, a ~52-entry reasoned allowlist, a ~27-site docs retrofit, and the two added
tasks). **Checkpoint interval:** every four tasks (checkpoints at 4, 8, 12).

## The rulings (RULED—Geoff, 2026-09-01 sitting, mid-4b)

All six decisions below are SETTLED; the text under each label is the rationale record,
not an open question. Geoff ratified the four contested calls explicitly (the scope cut
to internals-B, documented divergence on access semantics, the `registerEditor(api)`
shape, the first-request tripwire) and let the three stated defaults stand unobjected
(the indexed-access parenthetical convention, the engine-owned site-config-path
constant, the items-3+10 merge). Remaining pre-dispatch gates: see the DRAFT block.

1. **MarkdownEditor collapse shape (docket item 9; three sources, three shapes).**
   RULED: the int-rank/int-verify shape—collapse the `register*` callback props into
   one `registerEditor?: (api: EditorApi) => void`; express the stable/unstable split as
   `interface Props extends StableEditorProps, EditPageWiringProps`; document the three
   orphan props. The ledger row's differing "~20 props into a non-exported internal
   object" text is RECONCILED to the executed shape in the same task. *Settled at the
   round-1 fold:* the two already-object props fold IN as `api.tidy` and
   `api.imagePlaceholders`; the full member grammar is enumerated in Task 7 (no
   implementer evenness call remains).
2. **Engine-wide access semantics (docket item 14; highest stakes).** RULED:
   **documented divergence, no blanket harden.** `canReach`'s permissive unmapped-target
   reading stays the engine-route posture (a blanket harden is a lockout-class breaking
   change across every route action—the 4a adminAction lesson);
   `authorizeAdminTarget`'s fail-closed posture stays the contract for site-authored
   POSTs (`adminAction`, `section-action`, and 4b's `previewMint` parity note). The task
   DOCUMENTS the two-posture model instead of changing behavior. *Fold note:* the doc
   must not frame the permissive read as mere nav semantics—it currently gates real
   mutations; Task 10 carries the mandatory content. A non-throwing startup warning on
   unmapped screens rides inside the no-blanket-harden constraint.
3. **Indexed-access reference convention (docket item 7).** RULED: an inline
   parenthetical beside the printing shape's member row—the expression exactly as a
   consumer types it—plus one "Reading indexed-access forms" note in
   `docs/reference/README.md`, and a check clause requiring the parenthetical wherever a
   rendered shape prints a member with no own export row. *Settled at the fold:* the
   indexed-access form is canonical; the "or equivalently" `Awaited<ReturnType<…>>`
   alternate is removed wherever the retrofit touches it.
4. **CAIRN_DEV_BACKEND refusal (docket item 8).** RULED: a first-request factory
   tripwire, with the transport-body form documented as the override; fallback (also
   sanctioned) is documenting today's transport-body pattern as the contract.
   **LETTER AMENDED at the round-1 fold (security findings S-1/S-2; Geoff confirms at
   plan approval):** `CAIRN_DEV_BACKEND='1'` is the dev transport's ENABLE contract (the
   showcase capture transport refuses WITHOUT it), so "refuse when set" would break the
   engine's own exemplar. The executed predicate is *refuse when the flag is set AND the
   request is non-local* (the guard's `isLocalHost` deployment witness); only the env
   observation is cached (isolate-stable), the host half evaluates per request. This
   executes the ruling's intent—the flag must never be live in a deployed environment—with a buildable sense.
5. **SITE_CONFIG_PATHS package boundary (docket item 11).** RULED: the convention is
   engine-owned; one canonical source both the doctor and `create-cairn-site`'s bake
   read. *Amended at the fold (security S-8, triage #15):* the DEFAULT shape is the
   sanctioned fallback—a generated data file both packages read as data—and the
   cross-package read must clear the path-containment requirements in Task 11 before it
   can be chosen instead. The bake never `import()`s engine code.
6. **The items-3+10 merge (docket decision 5).** RULED: one task discharges both the
   dogfood-tripwire routing and R-0's second direction's standing gate (no instance work
   remains; all four C13 instances closed or closing in 4b). *Renamed at the fold:* the
   gate ships as **`check:self-use`** (a subject name beside its siblings; "dogfood"
   named a practice, collided with `check:consumers`, and carried a retired proposal's
   label—the ledger row keeps the dogfood framing as prose).

## Global Constraints

Carried from the 4a/4b plans (same initiative); every task inherits them.

- Test-first; full gate = `npm run check` 0/0 + `npm test` exit 0 + the CI-derived gate
  list re-derived from `.github/workflows/` before the first commit.
- `check:surface -- --update` on any exported-type change; regenerated snapshot committed
  in the same task.
- Every public-API change updates its reference page in the same task; every task adds
  its `CHANGELOG.md` line under `## Unreleased`; every breaking entry's
  `Consumers must:` names the concrete recovery (zero-usage evidence goes to the ledger,
  never the public line). Most of this pass is consumer-invisible: a task states
  explicitly when it is NOT.
- A task executing a verdict closes (or progress-notes) its ledger entry in the same
  task; a new standing rule gets its own ledger row with reopen conditions. A CLOSED
  ledger row is never re-closed or amended to carry new work—the new work gets its own
  row cross-referencing the closed one.
- Drift-hunt scope for any removed or renamed name: `docs/`, `src/` comments,
  `examples/`, `packages/`, `templates/` (generated—edit the showcase and re-emit),
  `skills/`.
- Line anchors: see the DRAFT block (reconciled at 4b close; symbolic where 4b touched
  the file).
- New check scripts follow the sibling `scripts/checks/*.mjs` conventions in their
  MECHANISM half only: fail-loud output, allowlist-with-reasons where applicable, wired
  into `package.json` and `.github/workflows/test.yml` in the same task (a gate CI does
  not run is not a gate). Do NOT copy the siblings' pass-provenance header register
  (pass names, task numbers, plan paths)—that history is the ledger row's job, and
  internals-B's comment-register purge does not reach `scripts/`.
- **Tie-break rule for gate homes:** prefer extending an existing gate over minting a
  new top-level `check:*` name. `package.json` already carries ~30; each new name is
  surface a reader meets. This plan's resolved calls: the props gate extends
  `check:reference` (Task 7); the indexed-access clause extends `reference-coverage.mjs`
  (Task 5); the F-1 rider is one script riding the `check:surface` entry (Task 2); the
  self-use gate and the quote gate are the only two new names (Tasks 1, 4).
- Cleanliness and beauty are a pass dimension (standing since 4b): a new gate's output
  reads like the siblings'; documentation carries no verdict-provenance scar tissue
  (epistemics live in the ledger). On every doc line a task touches, provenance moves to
  the ledger and behavior stays on the page.

---

### Task 1: `check:self-use`—the standing gate for R-0's second direction

**Files:**
- Create: `scripts/checks/check-self-use.mjs` + its allowlist JSON; wire into
  `package.json` scripts and `.github/workflows/test.yml`
- Modify: `docs/internal/engine-rulings.md` (a NEW standing row for the gate, with
  reopen conditions, cross-referencing the two CLOSED rows—`audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c` (a retire,
  `Reopens on: closed`; building the gate in `scripts/checks/` is a new home for the
  retired proposal's underlying rule, recorded as such, never a re-close) and
  `read-from-the-source-rule` (whose own text forbids reopening for downstream
  instances)—both rows stay untouched), `CHANGELOG.md` (internal; no consumer action)

**Interfaces:**
- Produces: a repo gate failing on any public export with zero `src/lib` call sites
  outside its own module AND zero showcase call sites, with an allowlist-with-reasons
  for legitimately consumer-only exports.

- [ ] **Step 1:** Derive the export inventory the same way `check:surface` does (reuse
  `buildSurfaceModel()`, do not re-parse); compute in-engine and showcase call sites per
  export. STATIC PARSING ONLY—the script never `import()`s showcase or consumer
  modules (a gate that evaluates a consumer config is arbitrary code execution in CI).
- [ ] **Step 2:** Author the allowlist. It is a ~52-entry judgment artifact, so it is
  seeded, not re-authored: for each zero-caller export, READ THE REASON FROM ITS LEDGER
  KEEP ROW (most already carry an anonymous-consumer argument) and cite the row; only an
  export with no ledger reason gets fresh prose. Named seeds the review pre-verified:
  `removeOwnerIfNotLast`, `demoteOwnerIfNotLast`, `OwnerGuardOutcome` (the anti-lockout
  primitives for sites managing rosters outside `ManageEditors`—the engine's own
  routes deliberately use the wider helpers). `presetUrl` and `BUILT_IN_PRESETS` are
  allowlisted WITH the deferral reason (zero production callers post-variants-retire;
  pruning is a surface change deferred to the friction-log routing—the next
  surface-ruling sitting or internals-B; this gate does not force that ruling).
- [ ] **Step 3:** The gate's failure message states the remedy ORDER: allowlist with
  reason first, showcase call site second, deletion never as the gate's own suggestion.
  Exports under `src/lib/auth*` and `src/lib/sveltekit/{guard,csrf,admin-action,section-action}.ts`
  are ALLOWLIST-ONLY: the gate refuses the showcase-call-site remedy for them (a
  security seam must not be dischargeable by minting a demonstrative auth call in the
  copy-paste exemplar four production sites learn from).
- [ ] **Step 4:** Failing-first proof: a temporarily-delisted known consumer-only export
  must fail the gate; then the real run is green. Wire into CI.
- [ ] **Step 5:** Ledger (the new row; note the discharge of the dogfood-tripwire
  routing AND R-0's second direction, and that all four C13 instances closed in 4b);
  CHANGELOG; commit.

**Acceptance criteria:** the gate runs in CI under the name `check:self-use`; every
allowlist entry carries a reason (ledger-cited where a row exists); the auth-path
allowlist-only rule is enforced by the script, with a test; the two closed ledger rows
are byte-untouched and the new row cross-references both; no public export sits
unlisted with zero callers.

---

### Task 2: The F-1 leak-class rider on `check:surface`

**Files:**
- Create: `scripts/checks/check-surface-leaks.mjs` (one script; invoked from the
  existing `check:surface` package entry so no new top-level gate name appears) + the
  recorded-leak registry JSON (fail-unless-recorded)
- Modify: `package.json` (the `check:surface` entry chains the rider),
  `docs/internal/engine-rulings.md`, `CHANGELOG.md` (internal)
- Spec: `docs/internal/record/2026-08-30-retires-move-record.md` in full—it is the
  brief; its three stated limits are design inputs, and its §"re-decide the split"
  instruction is Step 3 below

**Interfaces:**
- Produces: a permanent rider failing on any UNRECORDED leak—a retire-verdicted OR
  ABSENT name still named inside a surviving rendered public shape—over a DERIVED
  recorded set with a two-kind reason grammar.

- [ ] **Step 0 (derive, do not assume):** re-derive the full leak set on the current
  surface before writing the registry. The count is a MEASURED OUTPUT, not a target: the
  move record's 18 predate 4b, whose Tier 1 retires added at least eight more
  (`UsageEntry`, `MediaUploadFailure`, `VocabularySaveFailure`, `SettingsSaveFailure`,
  `NavSaveFailure`, `DictionaryAddResult`, `TidyResult`, `UploadResult`, each
  retire-verdicted and still rendered inside a surviving shape at `189bf2d7`), and the
  widened predicate (Step 2) adds the never-verdicted names. ~26 is the expected order;
  the derivation decides.
- [ ] **Step 1 (two models, stated join):** the rider needs BOTH derivations, because
  the two known proof cases live in different models. Against the TYPE CHECKER:
  `AdvisoryAction` (invisible in the rendered markdown because the renderer expands one
  hop; the move record's compile-only fixture is the model). Against the RENDERER
  (`buildSurfaceModel()`): `NavIcon`/`EngineScreenId` ("named on one subpath, expanded
  on another" is a property of the printer, not the type graph; `SlotKind` is the
  absent-everywhere control). The recorded registry is the UNION, keyed by
  (name, subpath), each entry tagged with which model surfaced it.
- [ ] **Step 2 (predicate):** F-1's own "retire-or-absent" wording, plus the
  per-subpath clause.
- [ ] **Step 3 (the un-verdicted split, ruled not inherited):** the move record
  explicitly hands this pass the decision it declined to make: `DictionaryAddFailure` /
  `TidyFailure` versus `RemoveIndex` / `ValueOf` / `StandardResult` were treated
  differently by accident of discovery order. Either fold all five into one
  standing-unverdicted class or state the rule that separates them; record the ruling in
  the rider's ledger row.
- [ ] **Step 4 (registry grammar):** every recorded entry carries exactly one of two
  reason kinds: `sanctioned-by:` (a ledger slug or move-record row—the 18, plus every
  4b row whose close carries leak-sanction wording; the seed reads from BOTH sources) or
  `standing-unverdicted:` (a one-line reason per Step 3's ruling). A leak with neither
  available is a stop-and-rule, never an auto-add.
- [ ] **Step 5:** Failing-first proof against a synthetic unrecorded leak; wire into the
  `check:surface` chain.
- [ ] **Step 6:** Ledger (the rider's own standing row with reopen conditions AND a
  stated-limits paragraph: Svelte component props are outside the surface model
  entirely—Task 7's props gate is the answer, cross-referenced; structural leaks
  through anonymous inline shapes; runtime-vs-declared divergence; reachability through
  doc prose and `@link`; `dist`-on-disk deep imports outside the `exports` map. The
  rider is a name-keyed guard, not a completeness claim); CHANGELOG; commit.

**Acceptance criteria:** every leak the two-model derivation finds is recorded and every
recorded entry carries one of the two reason kinds with its citation; the
`AdvisoryAction` two-hop case and the `NavIcon` per-subpath case are covered by tests;
an unrecorded synthetic leak fails CI; the un-verdicted split is ruled in the ledger;
the count in the registry matches the derivation's output (no hard-coded 18).

---

### Task 3: `staleNames` per-subpath rescope

**Files:**
- Modify: `scripts/checks/reference-coverage.mjs` (`globalKnownNames()` at `:328-336`,
  `checkOne()` at `:343-362`) + a per-page narrative-context allowlist (the
  fail-unless-recorded idiom), `docs/internal/engine-rulings.md` (inheritance note
  discharged), `CHANGELOG.md` (internal)

- [ ] **Step 1:** Scope the known-names pool per subpath so a page listing a name its
  own subpath does not export fails, WITHOUT breaking either existing guarantee: (a) the
  renamed/removed-name lock the module header states, and (b) the deliberate
  narrative-context case the same header documents—`core.md`'s "Component-author
  helpers" block legitimately declares `cardShell`/`headRow`/`iconSpan` (which live on
  `/render`) beside the root export `glyph`. The render trio is F-1 list (c) Tier 4,
  deferred to the CHASSIS pass, so this task cannot fix it by re-homing: it gets a
  per-page allowlist entry with that reason, and the allowlist is the general mechanism
  for any sibling case the rescope surfaces.
- [ ] **Step 2:** Failing-first proof: the historical case (a `delivery-data.md` row
  naming a name only other subpaths export) must fail under the rescope; the full
  reference tree then runs green (fix real drift in this task; record legitimate
  narrative context in the allowlist with reasons).
- [ ] **Step 3:** Gate, ledger note, CHANGELOG; commit.

**Acceptance criteria:** a reference page cannot list a name its own subpath does not
export unless the allowlist records it with a reason; the renamed/removed lock still
holds; the render-trio block is allowlisted, not broken; the reference tree is green.

---

### Task 4: Docs-truth tripwires (quote-drift) and the vale reconciliation

**Files:**
- Create: `scripts/checks/check-editor-quotes.mjs`; wire into `package.json` + CI
- Modify: `docs/admin/README.md` + `docs/extend/README.md` (the 16 genuine spaced
  em-dash violations), `.vale.ini` or the check's own header (the arbiter record),
  `docs/internal/docs-friction-log.md` (complete-or-move: the quote-drift entry
  leaves), the REPO's `CLAUDE.md` (`:319-321`: the authoring section claims `.vale.ini`
  scopes Google to `reference`/`guides`/`explanation`/`tutorial` sections that do not
  exist; one line. The repo-root `CLAUDE.md` sits outside the standard drift-hunt
  scope, which is why nothing else catches it), `CHANGELOG.md` (internal)

- [ ] **Step 1 (quote-drift):** extract the bolded quoted sentences from
  `docs/editors/when-something-goes-wrong.md` and match each against the shipped
  component strings (`LoginPage.svelte` et al.); fail on a stranded quote.
  Failing-first proof via a temporary copy edit.
- [ ] **Step 2 (vale, split disposition—the review corrected the premise):** the
  local-vs-CI divergence is 16 `Google.EmDash` findings plus ONE `Microsoft.Quotes`,
  across two arm indexes and one editors CONTENT page (not three arm indexes). The 16
  em-dash findings are GENUINE violations of the vendored rule (spaced em dashes in two
  published arm indexes; 3.15.1 has the false negative, 3.19.0 is right, and the repo's
  own declared standard is Google unspaced): FIX THEM. The one `Microsoft.Quotes`
  finding is the opposite case (the punctuation is correctly inside the quotes; 3.19.0
  is wrong there): EXEMPT it with that reason. Then record CI-as-arbiter explicitly and
  make the divergence self-explaining (the pinned-version caveat printed when the local
  binary differs, or the local pin—whichever, the repo alone must answer "why do local
  and CI disagree and which governs").
- [ ] **Step 3:** Gates, friction-log move, the CLAUDE.md one-liner, CHANGELOG; commit.

**Acceptance criteria:** a stranded editors-page quote fails CI; the two arm indexes run
clean under BOTH vale versions; the quotes exemption carries its reason; a fresh session
can tell from the repo alone why local vale may disagree with CI and which one governs.

---

### Task 5: The indexed-access reference convention (retrofit; corpus derived, not counted)

**Depends on:** Task 2 (the rider's derivation IS this task's corpus source—the
plan order already sequences them; this line states the reason).

**Files:**
- Modify: `docs/reference/README.md` (the "Reading indexed-access forms" note),
  `docs/reference/sveltekit.md` and `docs/reference/reproductions.md` (the retrofit
  sites; `core.md` has none and is dropped from this list),
  `scripts/checks/reference-coverage.mjs` (the parenthetical-required clause—an
  extension of the existing gate, not a new script), `docs/internal/engine-rulings.md`,
  `CHANGELOG.md` (docs; no consumer action)

- [ ] **Step 1:** Land the convention per ruling 3: the inline parenthetical carrying
  the exact consumer-typed expression, the one README note, the check clause. The ruled
  form is canonical and single: where a page currently offers an "or equivalently"
  `Awaited<ReturnType<…>>` alternate, the retrofit REMOVES the alternate.
- [ ] **Step 2:** Retrofit every site the Task 2 derivation surfaces as
  rendered-but-unimportable (~27 at `189bf2d7`, including the eight 4b names; the exact
  list is the rider's output, enumerated at dispatch, never a hard-coded count). Two
  rules: a name ABSENT from the reference tree is NOT retrofitted (never introduce a
  retired name to hang a parenthetical on—that is a surface regression dressed as
  compliance); and `sveltekit.md:1917`'s `usage?: UsageEntry[]` row GAINS the
  `NonNullable<ContentFormFailure['usage']>[number]` parenthetical (the 4b ledger close
  promised it; the expression exists today only in the ledger and a test, so this is an
  add, not a verify).
- [ ] **Step 3 (scar-tissue sweep, same lines):** on every line the retrofit touches,
  provenance moves to the ledger and behavior stays on the page. The standing instance
  the review found: `reproductions.md:95` carries "since the retires pass unexported it,
  a sanctioned `NavIcon`-class leak"—the pass/taxonomy half goes to the ledger; the
  `Parameters<…>[1]` expression (already the convention's target form) stays.
- [ ] **Step 4:** Gates (`check:reference`, `check:docs`), ledger (the provisional
  -pending note in 4b's close resolves), CHANGELOG; commit.

**Acceptance criteria:** every rendered shape printing an un-importable member carries
the convention's form, enforced by the check; no doc line touched by the retrofit
carries verdict provenance; no retired name was introduced anywhere; the alternate form
is gone from touched pages; the README note exists.

---

### Task 6: Mechanical residue—the stale headers and the vacuous assertion

**Files:**
- Modify: `src/lib/sveltekit/content-routes-{core,media,settings,context,tidy,dictionary}.ts`
  (the six "built once by `createContentRoutes`" module headers → the precise
  `createContentRoutesInternal` caller, wording authored per file, not one paste; the
  stale TSDoc in `content-routes-context.ts` now sits at `:331`—`:272` is a blank
  line post-4b, and the interface TSDoc at `:277` is already correct), plus the two
  stale sites OUTSIDE the six files the review found:
  `src/lib/components/CairnMediaLibrary.svelte:32` and `src/lib/sveltekit/nav-routes.ts:2`;
  `src/tests/component/reproductions-stories.test.ts` (the vacuous
  `it('has a matching manifest entry', ...)` block, at `:1031` on merged `main`; its
  stranded defensive chain at `:1037`)
- (The draft's note about a stale `:272` anchor in `docs/STATUS.md` is overtaken: the
  4b-close STATUS rewrite already removed it.)

- [ ] **Step 1:** Rewrite the six headers (each states the actual caller and why the
  public name is a thin wrapper—comment-standard conformant, no em dashes in
  comments) and fix the two outside sites. 4b made the files internally inconsistent
  (their member docs already name `createContentRoutesInternal` correctly), which is
  the proof the headers are drift, not intent.
- [ ] **Step 2:** Delete the vacuous per-story assertion. The correct reason (the
  review corrected the draft's): `registeredStories` is derived FROM `manifest`, so
  `entry` is defined by construction and the assertion cannot fail; the aggregate test
  at `:209-215` was written to replace the block and guards the reverse direction over
  a different population. In the same edit, tighten the now-vacuous defensive chain the
  deletion strands (`entry?.markerKeys ?? []` guards a value the construction
  guarantees).
- [ ] **Step 3:** Gate; commit. (No CHANGELOG—comments and a test-internal deletion.)

**Acceptance criteria:** grep across the drift-hunt scope finds NO comment naming
`createContentRoutes` as the context builder (not only the six module headers—the
widened scope covers the two outside sites); the per-story block and its stranded
optional chain are gone; `check:comments` green.

---

### Task 7: The MarkdownEditor seam collapse (per ruling 1, member grammar settled)

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (the 13 `register*` props—eleven
  callbacks plus the two object props—collapse to
  `registerEditor?: (api: EditorApi) => void`), `src/lib/components/EditPage.svelte`
  (the wiring side), `docs/reference/components.md` (the stable/unstable split expressed
  in types; the three orphan props—`fragmentTitles`, `onDiagnosticsCounts`,
  `registry`—documented; one sentence on the uniform grant: every `registerEditor`
  caller now receives the full buffer-scoped surface, where the old shape handed each
  caller only the callbacks it wired), `docs/internal/engine-rulings.md`
  (`audit-admin-markdowneditor` closes with its text reconciled to the executed shape;
  `mediainsertpopover-export` and `mediaherofield-export`—both of whose reopen
  conditions name THIS collapse—close or progress-note in the same task),
  `CHANGELOG.md`
- Extend: `check:reference` with the props-vs-reference clause (each exported
  component's `Props` keys diffed against its reference page; per the tie-break rule
  this extends the existing gate, no new `check:component-props` script)

**Interfaces:**
- Produces: `EditorApi` with this member grammar (settled here, not at execution):
  the two object props fold in as `api.tidy` and `api.imagePlaceholders`; the eleven
  callbacks become verb members dropping the `register` stems—`api.insert`,
  `api.insertLink`, `api.getSelection`, `api.caretCoords`, `api.focusEditor`,
  `api.undo`, `api.format`, `api.replaceRange`, `api.selectRange`, `api.insertImage`
  (from `registerInsertImage`), and `api.getSelectionRange` (from
  `registerGetSelectionRange`), completing the eleven. Plus the `Props` interface
  extending the stable/wiring split, and the props gate.

- [ ] **Step 1:** Author `EditorApi` from the callbacks' signatures per the grammar
  above; failing component tests first (the editor still registers every capability
  through the one prop; EditPage still drives it).
- [ ] **Step 2:** Collapse; express the split in types. `spellcheckTest` (the
  test-only `Worker`-factory prop) is PINNED documented-unstable: it does not join
  `StableEditorProps`, and the props gate records it as documented-unstable so it
  cannot quietly become stable surface. Document the three orphans.
- [ ] **Step 3:** Land the props gate; failing-first proof (an undocumented prop fails).
- [ ] **Step 4:** Docs, surface regen, CHANGELOG—**this one rides IN the
  `Consumers must:` window** (public component props change): the line names the
  `registerEditor` migration; usage evidence to the ledger, and the ledger's reconciled
  shape text stays in the ledger (it does not appear on `components.md`). All three
  ledger rows handled. Commit.

**Acceptance criteria:** `interface Props` carries no bare `register*` callback;
`EditorApi`'s members match the grammar settled above; every exported component's props
match its reference page under the new gate, with `spellcheckTest` recorded
documented-unstable; EditPage's wiring compiles through `EditorApi`; all three named
ledger rows are closed or progress-noted.

---

### Task 8: Audit-rule measurement re-groundings (`list-role`, `panel-width`)

**Files:**
- Modify: `src/lib/audit/rules/static/list-role.ts` (+ its rendered-mode counterpart if
  the fix lands there), `src/lib/audit/rules/rendered/panel-width.ts` (the documented
  gap at `:78-95`, with the `resolveColors` paint-not-parse precedent at `:92-93`),
  `src/lib/audit/rules/static/list-role.ts` also hosts the two adjacent
  diagnostic-message defects the docket filed against a stale `sheet.ts:544` anchor
  (the message build at `:120-128`; the cause-lookup helpers at `:33-66` mis-attribute
  among shared-selector declarations and drop an at-rule's own condition),
  `docs/reference/cairn-audit.md`, `CHANGELOG.md` (audit output change; no consumer
  action)
- Spec sources: the internals docket and the harvest-detection post-mortem. (The two
  friction-log entries were already cleared at the 4b close with their routing recorded;
  there is NO friction-log move step in this task.)

- [ ] **Step 1 (`list-role`):** re-ground on the item's actual computed `display` in
  rendered mode (the nine engine lists in the gap are the fixture corpus); evaluate the
  `role="listitem"` per-item addition against ARIA's owned-elements rule; both themes.
- [ ] **Step 2 (`panel-width`):** painted text-width measurement for the closed-select
  case; fixture proves a clipped select label now flags.
- [ ] **Step 3 (diagnostic messages):** fix the two message defects at their real site
  in `list-role.ts` (the docket's `sheet.ts:544` anchor was stale); fixtures per defect.
- [ ] **Step 4:** Docs, CHANGELOG; commit.

**Acceptance criteria:** a class-less `<li>` under `.menu` registers as re-grounded; a
clipped closed select flags; the two message defects have regression fixtures; the nine
engine lists' audit results are read and dispositioned (fixed or advisory-explained).

---

### Task 9: The CAIRN_DEV_BACKEND refusal (per ruling 4 as letter-amended)

**Files:**
- Modify: `src/lib/auth-channel/factory.ts` (the tripwire; also the salt-fault
  diagnostic below), `src/lib/sveltekit/guard.ts` (the existing refusal's home—its
  message and `isLocalHost` witness are REUSED, not duplicated), a NEW internal module
  `src/lib/auth-channel/dev-flag.ts` exporting the flag name, the message text, and the
  locality predicate, which `guard.ts` and `factory.ts` both import (a divergent second
  wording would violate the `read-from-the-source-rule` this pass's own Task 1
  enforces). The two refusals deliberately diverge on WITNESS, not wording: the guard
  fires on flag-set-alone with a 503 because it mounts only in production builds (the
  dev branch replaces it entirely), while the factory fires on set-AND-non-local with a
  throw because one factory instance serves both dev and prod—same message, different
  witnesses, and each states why where it fires. Also: `src/lib/log/events.ts`
  + `docs/reference/log-events.md` (the new `auth.channel.salt_unavailable` record),
  `docs/reference/` auth-channel page, `docs/internal/engine-rulings.md`
  (`audit-auth-devdelivery`'s Shape-field question resolves), `CHANGELOG.md`
- Non-regression gate: the showcase members e2e suite (its capture transport REQUIRES
  `CAIRN_DEV_BACKEND='1'` locally—the suite proves the amended sense breaks nothing).

Context the implementer needs: `CAIRN_DEV_BACKEND` appears NOWHERE in
`src/lib/auth-channel/` today, and `createAuthChannel` is generic over a site-defined
`Env`, so the env read is a structural probe on a generic; every per-request entry point
can see `event`/`ctx`.

- [ ] **Step 1 (discriminator gate):** verify the two discriminants are readable at the
  factory's per-request entry points: the env flag (isolate-stable; cache this
  observation) and the request locality (`event.url.hostname` through the shared
  `isLocalHost`; NOT cacheable—one Worker isolate serves `*.workers.dev` and custom
  domains interchangeably, so a cached host verdict would pin a permissive answer from a
  warm-up request onto production traffic; the host half evaluates per request, a string
  comparison). If either discriminant proves unreadable, route to the sanctioned
  FALLBACK: document today's transport-body pattern in the `/auth-channel` reference as
  the contract, with three mandatory statements—(a) the refusal must be the
  transport's FIRST statement, before any print, store, or network call; (b) a
  transport-body throw is not a channel-level refusal: `requestAction` still answers
  `{ sent: true }`; (c) `auth.channel.requested`'s `delivered` outcome is emitted BEFORE
  the transport runs and does not mean delivered.
- [ ] **Step 2 (the tripwire, primary path):** refuse when the flag is set AND the
  request is non-local. Failing-first tests: flag set + non-local request refuses at the
  entry point; flag set + localhost is untouched (the dev flow runs); flag absent
  changes nothing. The refusal is a hard throw matching the guard's form (a tripwire,
  not an outcome union). The tripwire's COVERAGE BOUNDARY is stated honestly in
  `docs/extend/security-model.md`: it catches the flag live in a deployed runtime; it
  cannot see a dev-shaped transport deployed with the flag unset (the transport is an
  opaque site function; that residual is the documented-pattern contract's job), and the
  dev-branch bundles that replace the guard entirely sit outside it (the e2e workflow's
  `wrangler deploy --dry-run` grep for `devBackendHandle` is the artifact-level answer;
  note it beside the boundary statement).
- [ ] **Step 3 (salt-fault diagnostic, folded from 4b's reviews):** the teardown
  helper's silent `catch { return; }` gains a record: `auth.channel.salt_unavailable`,
  level `warn`, fields `{ path: 'logout' | 'revoke', error: <scrubbed> }`, NO
  `correlationId` (none is derivable without the salt, and any identity substitute
  would have to be the raw subject, which the channel's no-roster-identity posture
  forbids). No retry budget, no cache invalidation (success-only salt caching is the
  correct posture; a fault-triggered retry would hand an attacker who can induce D1
  pressure a lever). Reference row + union + a test asserting the record fires on a
  forced salt fault and logout still completes.
- [ ] **Step 4:** Reference pages, ledger resolution with the reasoning (including the
  letter amendment's), CHANGELOG (behavior change on the opt-in subpath; `Consumers
  must:` only if a documented transport pattern changes). Commit.

**Acceptance criteria:** the discriminator gate ran and its outcome is recorded;
whichever branch executed, the contract is asserted (tests on the tripwire branch; the
three statements on the fallback branch); the sense is refuse-on-set-AND-non-local with
the env half cached and the host half per-request; the showcase members e2e is green;
the salt-fault record exists with its reference row; the security-model page states the
coverage boundary.

---

### Task 10: The access-semantics ruling (document the two-posture model)

**Files:**
- Modify: `docs/extend/security-model.md` (the ONE home—a published extend-arm page,
  so the docs register and Vale floor apply; no `docs/internal/` security doc exists and
  none is created), `docs/extend/restrict-admin-access.md` (the cross-link),
  `docs/internal/engine-rulings.md` (a standing ruling row with reopen conditions and
  the call-site map as evidence), `src/lib/auth/access.ts` (home of `canReach`,
  `:152`), `src/lib/sveltekit/guard.ts` / `admin-action.ts` / `section-action.ts`
  (doc-comments naming which posture each helper carries and why—no behavior change),
  `src/lib/sveltekit/admin-nav.ts` (`validateAccessComposition` gains the startup
  warning), `src/lib/log/events.ts` + `docs/reference/log-events.md` (the warning's
  record), `CHANGELOG.md`—**this task rides IN the `Consumers must:` window**:
  `Consumers must: audit your access map for coverage` (a site that believed its map was
  a whitelist has an action to take; this is not a docs-only entry).

- [ ] **Step 1 (the model, with the review's four mandatory points):** write the
  two-posture model into `security-model.md`: (1) **"An access map is not a
  whitelist"**—a declared map narrows only the targets it names; every unnamed engine
  screen and concept stays open to every editor-capability session, NAMING the screens
  (`media`, `nav`, `settings`, `vocabulary`) and the site-wide publish path explicitly,
  and naming the mutations `canReach` gates today (the permissive read is not mere nav
  semantics); (2) the RECOVERY recipe—whitelist semantics require a rule for every
  concept id and all four fixed screens, with the exhaustive-map snippet given; (3) the
  `ownerOnly` stacking cross-link from `restrict-admin-access.md`; (4) the fail-closed
  `authorizeAdminTarget` contract for site-authored POSTs. Contract prose only: the
  call-site map and verdict history go to the ledger row, exclusively.
- [ ] **Step 2 (doc-comments):** the four helpers—`canReach`
  (`src/lib/auth/access.ts:152`), `requireEngineAccess` (`src/lib/sveltekit/guard.ts`),
  `adminAction` (`src/lib/sveltekit/admin-action.ts`), and the section-action helper
  (`src/lib/sveltekit/section-action.ts`)—each carry a one-sentence posture doc-comment
  naming the posture and its reason (this is the checkable form of the old criterion).
- [ ] **Step 3 (the startup warning—inside the no-blanket-harden constraint):**
  `validateAccessComposition` already holds `ctx.conceptIds` and `ACCESS_FIXED_SCREENS`;
  add a NON-THROWING warn-level record enumerating every screen and concept the declared
  map leaves unmapped (event named per the vocabulary grammar, e.g.
  `config.access_unmapped`; reference row in the same task). It breaks nothing, cannot
  lock anyone out, and converts the posture from documentation into a signal.
- [ ] **Step 4:** Ledger row with the DETECTABLE reopen condition (a consumer declares
  an access map covering some but not all engine screens—the warning surfaces exactly
  this—or a consumer asks for the hardened floor; the old "real-world exploit
  evidence" condition is unfalsifiable and is replaced). Gates (`check:vale`,
  `check:docs` now that a published page changes), CHANGELOG with the `Consumers must:`
  line; commit.

**Acceptance criteria:** `security-model.md` carries all four content points with no
verdict provenance; each of the four helpers enumerated in Step 2 has its one-sentence
posture doc-comment;
the unmapped-screen warning fires in a test with a partial map and is silent with an
exhaustive one; the ledger row carries the detectable reopen condition; the CHANGELOG
entry carries the audit-your-map `Consumers must:` line; no route behavior changed.

---

### Task 11: SITE_CONFIG_PATH derivation and the internals-B re-file

**Files:**
- Modify: `src/lib/doctor/checks-local.ts:150-158` (the WATCH comment and hand-written
  array), `src/lib/doctor/bin.ts` (`readFileUnderCwd` gains the three-line containment
  assert—`resolve` does not contain, so assert the resolved path stays under the base—REGARDLESS of which direction Step 1 lands),
  `packages/create-cairn-site/src/substitute.mjs` (reads the shared source), the
  transcript fixture (`packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt`
  regenerates if the message changes), `src/lib/media-seed/bin.ts` (a `// WATCH:`
  comment only, on its byte-identical uncontained `readFileUnderCwd` twin at `:67`,
  routing that file's own containment assert to internals-B—this task does not change
  media-seed behavior), `docs/internal/engine-rulings.md`
  (`audit-cli-config-site-config-check`'s open half closes; PLUS the owed
  `isUniqueViolation` defer row—toolkit-seams deferred that `/cloudflare` helper at
  review with reopen triggers and promised a ledger record that was never written; the
  4b triage promoted the item to ROADMAP's Next tier; write the dated defer row here,
  citing the toolkit-seams plan's review round and the ROADMAP line), `ROADMAP.md` (the
  internals-B re-file, below), `CHANGELOG.md` (internal)

**Shape (settled at the fold—the draft specified a list and a path at once):** TWO
names. `SITE_CONFIG_PATH` is the canonical single relative path (what the bake writes:
`src/theme/site.config.yaml`); the doctor's four-entry candidate array stays
doctor-local, composed as the canonical path plus its three legacy candidates (older
production sites), reading the canonical entry from the shared source. The three legacy
paths never become engine contract.

- [ ] **Step 1 (boundary verification, with the default stated):** the DEFAULT is
  ruling 5's sanctioned fallback: a generated data file (JSON) committed in-repo that
  BOTH the doctor and the bake read as DATA—the bake never `import()`s engine code
  into its process (a compromised or buggy engine install must not execute in the
  scaffolder). The cross-package read may be chosen instead ONLY if it reads a data
  file from the installed package (`dist/…/site-config-path.json`) and clears the same
  validation. Either way, BOTH consumers validate before use: relative, no leading `/`,
  no `..` segment, no NUL, and resolved-containment under the target directory. If the
  constant becomes a PUBLIC export, the full pricing applies (canonical home, reference
  row, `check:surface -- --update`); the data-file default avoids that surface, which
  is a point in its favor.
- [ ] **Step 2:** The WATCH comment deletes; ledger half closes; fixture regenerates if
  touched; failing-first proof (a synthetic path divergence between doctor and bake is
  impossible by construction or fails a test; a traversal-shaped value fails
  validation).
- [ ] **Step 3 (the internals-B re-file, corrected):** ROADMAP's "internals half" block
  re-files as the named follow-on slice "internals-B: monoliths and coherence" carrying
  **FOUR monoliths** (`EditPage`, `CairnMediaLibrary`, `content-routes-core`,
  `audit/rendered.ts`)—`MarkdownEditor` is STRUCK from the list because Task 7 lands
  it, and ROADMAP's "33-prop" figure reconciles to the shipped shape in the same edit—plus the exhaustiveness idiom, the coherence thirteen, the newcomer internals map,
  and the read-seam boundary decision. Two ordering sentences the re-file must carry:
  a hand-authored per-file header survives a later split (each split file re-derives
  its own; Task 6's `content-routes-core` header is not wasted work), and Task 7's
  collapse precedes internals-B's `EditPage` split (internals-B inherits the collapsed
  wiring; it does not re-derive it). This pass's completed items leave the Now-tier
  block.
- [ ] **Step 4:** Gates, CHANGELOG; commit.

**Acceptance criteria:** one source of truth for the site-config path, read as data by
both consumers, provable; both consumers validate and contain the value; the
`readFileUnderCwd` containment assert exists regardless of direction; ROADMAP's Now
tier reflects reality (four monoliths, orderings stated, nothing silently dropped); the
`isUniqueViolation` defer row exists.

---

### Task 12: The `previewRevoke` export half (review inbound; public-surface evenness)

**Files:**
- Modify: `src/lib/sveltekit/preview.ts` (the new exported function), the `/sveltekit`
  barrel, `src/lib/sveltekit/content-routes-core.ts` (`previewRevokeAction` re-routes
  through the export so the two stay one implementation),
  `docs/reference/sveltekit.md` (the row beside `previewMint`/`previewLoad`),
  `docs/reference/log-events.md` (the revoke record's row states it fires from both the
  route and the exported function), `docs/internal/api-surface.md` (regen),
  `CHANGELOG.md` (new export; non-breaking; the entry notes it completes the pair
  `previewMint` opened)

Why now: 4b exported `previewMint` and its reference prose invites a site's own mint
workflow; revocation exists only as the engine's route action over the internal
`deletePreviewTokens` (`src/lib/auth/preview-store.ts:86`, returns a count). A site
that can mint a public bearer credential and cannot revoke it is an evenness defect on
the PUBLIC surface, so it lands before the release cut, not in polish. The
`log-events.md` mint/revoke pair currently reads as matched while naming two unmatched
things; this task makes the pair true.

- [ ] **Step 1:** Author `previewRevoke` mirroring `previewMint`'s argument shape and
  authorization sequence (editor, concept access, id validation—auth outcome reaches
  the caller first, the 4b lesson), over `deletePreviewTokens`; the revoke log record
  emits from INSIDE the function (one chokepoint, same as the mint's 4b fix); failing
  tests first, including the denied-session ordering test.
- [ ] **Step 2:** Re-route the route action through the export; reference row,
  log-events row, surface regen, CHANGELOG; drift-hunt the doc sentence that invited
  site mint workflows so it now names the full pair. Commit.

**Acceptance criteria:** a site that mints through `previewMint` can revoke through
`previewRevoke` on the same subpath; both the route action and the export share one
implementation and one log chokepoint; the reference pair reads even; surface snapshot
regenerated.

---

### Task 13: Record honesty—destroyed-row liveness and the `formatTimestamp` contract (review inbound)

**Files:**
- Modify: `src/lib/auth/store.ts` (`deleteSession`), `src/lib/auth-channel/store.ts`
  (`destroyChannelSession`), their call sites (`auth-routes.ts`, `auth-channel/factory.ts`),
  `packages/cairn-cms-dev/src/fake-auth-db.ts` (the RETURNING handler's row shape),
  `docs/reference/log-events.md` (both destroyed-record rows), `src/lib/admin-toolkit/format.ts`
  (`formatTimestamp`), tests beside each, `CHANGELOG.md` (extends 4b's unpublished
  log-evenness entry in place—the window is unreleased—so the destroyed-record
  condition reads once and correctly)

- [ ] **Step 1 (liveness):** the destroy statements RETURN `expires_at` alongside the
  identity (`RETURNING email, expires_at` / `RETURNING subject, expires_at`); the
  deletes stay UNCONDITIONAL (a teardown that also garbage-collects an expired row is
  strictly safer than a predicated one—ruled at the 4b fold, security direction);
  callers emit the destroyed record only when the returned `expires_at` is in the
  future. The event's meaning becomes stable for a site building alerting on it: "a
  live session ended." Reference rows updated; the dev fake-db handler returns the new
  row shape; tests cover the expired-row-no-emit case on both subsystems.
- [ ] **Step 2 (`formatTimestamp`):** return the input unchanged unless it matches the
  SQLite shape OR a zone-carrying ISO pattern (`Z` or a `±hh:mm` offset). The current
  fall-through to `new Date(input)` parses zone-less near-ISO shapes in the RUNTIME's
  local zone, so a Worker's SSR and a browser's hydration render different text—which
  the function's own TSDoc claims cannot happen. The TSDoc claim becomes true; unit
  tests pin the near-ISO shapes.
- [ ] **Step 3:** Gates, CHANGELOG; commit.

**Acceptance criteria:** no destroyed record fires for an expired row, asserted on both
subsystems; the deletes remain unconditional; the reference rows state the live-session
condition; `formatTimestamp` renders identically for SSR and hydration on every input
shape it accepts, and passes unrecognized shapes through unchanged; the TSDoc is true.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier; reviewer fan-out—`svelte-reviewer` (Task 7), `daisyui-a11y-reviewer`
(Task 8's list-role ARIA call), `web-auth-security-reviewer` (Tasks 9, 10, 12, 13),
`cloudflare-workers-reviewer` (Task 13 moves session SQL again—unconditional), plus
the standing cleanliness-and-beauty review; fix rounds; `engine-triage` on anything
filed; the six CI-only gates by name; from-scratch consumer proof; the whole-log
friction triage (standing since 4b); STATUS/HISTORY/ROADMAP; post-mortem here; both
budgets scored.

## What this pass hands forward

- **internals-B (re-filed by Task 11):** the FOUR remaining monolith splits (the
  `EditPage` split absorbs ROADMAP's `FieldInput` `ownership_invalid_mutation` fix, so
  those lines are touched once, and inherits Task 7's collapsed wiring), the
  exhaustiveness idiom, the coherence thirteen, the newcomer internals map, the
  read-seam boundary decision, PLUS two 4b-review items routed at the fold: confirm's
  destroy-then-create pair as one `db.batch()` (low stakes; attach to any task opening
  `factory.ts` if cheaper), and the OfficeList/AdminTable double scroll-container
  ownership question.
- **Chassis:** unchanged (the render trio re-homing—Task 3 allowlists their
  narrative-context block until then; the showcase hand-mount against generated
  `./$types`).
- **Polish (final slice before the cut):** the full-surface cleanliness-and-beauty
  sweep, PLUS the items routed there at the fold: the OfficeList outright-retire
  question (RULING-FIRST—its closed row `audit-admin-officelist` reopens on no
  current evidence, so the polish slice's whole-surface read raises it as a fresh
  ruling before any task; it is also still taught in the extend arm, so a retire is a
  `Consumers must:` event), the `CHROMA_DISTINCT_FLOOR` polarity naming, the repo-wide
  `throw error()` sweep, the shared `data-theme` test-harness helper, and the
  release-gate promotion of the e2e workflow's `devBackendHandle` dry-run grep (S-4).
- **Release:** the window still holds; ONE cut after the polish slice.

## Review folds (round 1, 2026-09-01, run pre-merge at Geoff's direction)

Round 1 ran BEFORE the 4b merge, at Geoff's direction, against committed conformance
worktree state `189bf2d7`; anchors reconcile once more at dispatch (see the DRAFT
block). Three lenses: cleanliness-and-beauty (B), `web-auth-security-reviewer` (S),
`engine-triage` (T). Every finding and its disposition:

- **B-1 / S-6 / T-1..T-4 (Task 2's arithmetic, sources, models, and dropped
  instruction):** FOLDED—full rewrite: derived count, two-source seed (move record +
  ledger leak-sanction rows), two-model derivation with stated join, the un-verdicted
  split ruled in its own step, two-kind reason grammar, measured acceptance criterion,
  stated-limits paragraph.
- **B-2 / T-11 (Task 1 amending closed ledger rows):** FOLDED—new row only; both
  closed rows byte-untouched; the "closes" claims removed.
- **B-3 (internals-B re-filed with five monoliths while Task 7 lands one):** FOLDED—four monoliths; MarkdownEditor struck; the two ordering sentences added (Task 11 and
  hands-forward).
- **B-4 / T-9 (Task 5's phantom count and the introduce-a-name hazard):** FOLDED—corpus derived from Task 2's rider output; `reproductions.md` added, `core.md`
  dropped; absent-name-is-never-retrofitted stated; the `UsageEntry` step corrected
  from verify to add.
- **B-5 (Task 5 stands on an existing provenance leak):** FOLDED—the scar-tissue
  step; `reproductions.md:95`'s pass/taxonomy clause moves to the ledger. The same
  preemption is stated in Tasks 2, 7, and 10 and in the global constraints.
- **B-6 (`check:dogfood` naming):** FOLDED—renamed `check:self-use` (conductor pick);
  ruling 6 annotated.
- **B-7 (EditorApi member grammar and the 11-vs-13 count):** FOLDED—grammar settled
  in-plan (`api.tidy`/`api.imagePlaceholders`; verb members); one number (13, of which
  two object props); the two additional ledger rows (`mediainsertpopover-export`,
  `mediaherofield-export`) added to Task 7's files.
- **B-8 / T-14 (Task 10's home is published, not internal, and twice-ambiguous):**
  FOLDED—`docs/extend/security-model.md` named as the ONE home; vale/docs gates
  added; the dead "if Geoff rules harden" branch deleted; the uncheckable criterion
  restated per T-15.
- **B-9 (Task 9's refusal home not in the file list):** FOLDED—`guard.ts` added; one
  shared message/predicate constant; the refusal's throw form specified.
- **B-10 (SITE_CONFIG_PATHS list-vs-path and unpriced export):** FOLDED—two-name
  shape; data-file default; pricing stated (with S-8's containment requirements).
- **B-11 (Task 6's wrong deletion reason and stranded optional chain):** FOLDED—corrected reason; the chain tightened in the same step.
- **B-12 (five unresolved ORs):** FOLDED—all five resolved; the tie-break rule added
  to the global constraints.
- **B-13 (PROPOSED labels under a RATIFIED banner):** FOLDED—relabeled RULED
  throughout, rationale retained.
- **B-14 (the triple-stated pre-dispatch gate; the four-inventory Goal sentence):**
  FOLDED—the DRAFT block is canonical, other statements reduced to pointers; the Goal
  split into its four workstreams.
- **B-15 (scripts-header register seeding a fresh process register):** FOLDED—the
  mechanism-half-only guidance added to the global constraints.
- **S-1 (Task 9 unbuildable as ruled: the flag is the dev transport's ENABLE
  signal):** FOLDED—**ratified-ruling LETTER AMENDMENT, flagged for Geoff's
  confirmation at the plan-approval gate:** refuse when set AND non-local. Ruling 4
  annotated; the showcase members e2e added as the non-regression gate.
- **S-2 (the cached first-request check is unsound for request-derived input):**
  FOLDED—env half cached, host half per-request; the reasoning recorded in Task 9.
- **S-3 (the fallback documents a refusal the factory swallows; ordering
  unenforced):** FOLDED—the fallback branch carries the three mandatory contract
  statements.
- **S-4 (the guard tripwire's structural coverage hole):** FOLDED—the coverage
  boundary is stated in `security-model.md` in Task 9 Step 2, with the
  artifact-level grep noted. The release-gate promotion of that grep is NOTED for the
  polish slice, not taken here.
- **S-5 (Task 10: the permissive read gates real mutations; map-is-not-a-whitelist):**
  FOLDED—the four mandatory content points; the `Consumers must:` line; the
  non-throwing startup warning as a step; the detectable reopen condition.
- **S-7 (what the F-1 rider still cannot catch):** FOLDED—Task 2's stated-limits
  paragraph, with the component-props limit cross-referenced to Task 7's gate.
- **S-8 (SITE_CONFIG_PATH path-traversal class):** FOLDED—data-not-code read;
  validation at both consumers; the `readFileUnderCwd` containment assert
  unconditional.
- **S-9 (self-use gate points deletion pressure at anti-lockout primitives):** FOLDED—allowlist-first remedy order; auth-path exports allowlist-only; the three named seeds;
  static parsing only.
- **S-10 (EditorApi trust boundary clean; uniform over-grant + `spellcheckTest`):**
  FOLDED—the over-grant sentence owed to `components.md`; `spellcheckTest` pinned
  documented-unstable in the props gate.
- **S-11 (Task 1's row already closed):** FOLDED with B-2/T-11.
- **S-HF-1 (salt-fault diagnostic direction):** FOLDED—Task 9 Step 3 carries the
  exact shape (warn, path + scrubbed error, no correlationId, no retry budget).
- **S-HF-2 (expired-row direction: unconditional deletes, honesty in the record):**
  FOLDED—Task 13 Step 1 (RETURNING `expires_at`; emit only for live rows).
- **T-5 (Task 3 breaks the documented narrative-context guarantee):** FOLDED—the
  per-page allowlist with reasons; the render trio allowlisted until chassis; anchors
  corrected.
- **T-6 (Task 9's failing-first test guarded the mirror of the hazard; the
  discriminator is unobservable):** FOLDED—Step 1 is the discriminator gate with the
  fallback route; the structural-probe context stated.
- **T-7 (vale: 16+1, genuine violations, wrong disposition):** FOLDED—Task 4's split
  disposition (fix the 16, exempt the 1 with reason, record the arbiter); premise text
  corrected; the CLAUDE.md `.vale.ini` description drift added to the task.
- **T-8 (Task 6 anchor drift; two more stale sites; narrow criterion):** FOLDED—all
  corrections taken; criterion widened to the drift-hunt scope; STATUS's stale anchor
  noted for the STATUS update.
- **T-10 (Task 8's friction-log step targets deleted entries):** FOLDED—step dropped;
  sources restated (docket + harvest-detection post-mortem).
- **T-12 (inbound routing):** FOLDED as ruled—(a) `previewRevoke` IN as Task 12;
  (d) salt-fault event IN Task 9; (e) `formatTimestamp` IN Task 13; (b) confirm
  `batch()` → internals-B; (c) expired-row predicate resolved by S-HF-2's direction in
  Task 13 (no predicate; record-side fix); (f) OfficeList retire → polish,
  ruling-first (its closed row reopens on no current evidence).
- **T-13 (`isUniqueViolation` ledger debt):** FOLDED—the defer row rides Task 11.
- **4b routing, `CHROMA_DISTINCT_FLOOR` polarity naming:** FOLDED—polish hands-forward.
- **4b routing, repo-wide `throw error()` sweep:** FOLDED—polish hands-forward.
- **4b routing, shared `data-theme` test-harness helper:** FOLDED—polish hands-forward.
- **4b routing, OfficeList/AdminTable scroll-container ownership:** FOLDED—internals-B
  hands-forward.
- **T-15 (hygiene: ceiling thin; Task 10 criterion uncheckable; workflow mode sound;
  Task 7 count consistent; CLAUDE.md vale drift):** FOLDED—ceiling 6.5M with the
  growth stated; criterion restated; the rest recorded as verified. The `.vale.ini`
  drift rides Task 4.
- **T-NOTE (no pending consultation briefs):** recorded; nothing preempts this plan.

Declined or deferred, with reasons: S-4's release-gate grep promotion (polish; this
pass does not own the release workflow); B-4's implied option of hand-maintaining a
site list in the plan (the corpus derives from Task 2's output instead, so it cannot go
stale twice).

## Review folds (round 2, 2026-09-01)

Round 2 (`engine-triage` verification of the folded revision) returned fix with seven
mechanical items, all applied: **F-1** Task 10 adds `src/lib/auth/access.ts` and
`src/lib/sveltekit/section-action.ts` to its files and enumerates the four helpers once
in Step 2, with the criteria referencing the enumeration. **F-2** Task 4's `.vale.ini`
description drift repointed to the REPO's `CLAUDE.md:319-321` (the repo-root file sits
outside the standard drift-hunt scope, which is why nothing else catches it). **F-3**
Task 7's member grammar completes the eleven (`api.insertImage`,
`api.getSelectionRange`), making ruling 1's "no implementer evenness call remains" and
B-7's disposition true. **F-4** the polish hands-forward gains S-4's release-gate grep
promotion, and the four 4b routings previously asserted-but-unrecorded gained fold
entries. **F-5** the window sentence corrected: Tasks 7 and 10 state otherwise; Tasks
12 and 13 add no `Consumers must:` line. **F-6** the shared refusal constant homed at
`src/lib/auth-channel/dev-flag.ts`, with the guard/factory witness divergence and its
reason stated. **F-7** six spaced-em-dash rewrap artifacts fixed. Plus the verifier's
observation: Task 11 adds a `// WATCH:` on the byte-identical uncontained
`readFileUnderCwd` twin at `src/lib/media-seed/bin.ts:67`, routing that file's own
containment assert to internals-B.
