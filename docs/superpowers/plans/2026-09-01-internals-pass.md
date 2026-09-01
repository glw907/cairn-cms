# Internals Pass Implementation Plan — DRAFT (pre-4b-merge)

> **DRAFT STATUS:** authored 2026-09-01 while the conformance pass (4b) executes. Line
> anchors are against `main` at `ea45e182` (pre-4b). **Before dispatch this plan must:**
> (1) reconcile anchors and discharged items against 4b's merged surface — 4b touches
> `content-routes-{context,core}.ts`, `preview.ts`, and ships the provisional
> indexed-access line Task 5 here retrofits, and 4b's Tasks 3/8 discharge two of R-0's
> C13 instances; (2) absorb anything 4b's post-mortem routes here; (3) pass the standing
> two-round adversarial review (round 1: `engine-triage` + `web-auth-security-reviewer`
> for Tasks 9-10's auth surface + the cleanliness-and-beauty lens; fold; round 2:
> `engine-triage` verification) — run AFTER 4b merges so the review reads the real
> surface. Geoff's rulings on the six decisions are RATIFIED (header below); only (1)
> and (3) remain before dispatch.

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js` with `parallel: false` (shared CHANGELOG, ledger,
> and check-script files). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the standing gates the audit initiative owes (the F-1 leak rider, the
dogfood tripwire, the per-subpath staleNames rescope, the quote-drift tripwire), execute
the routed internal reshapes (the MarkdownEditor seam collapse, the two audit-rule
measurement re-groundings), settle the four filed design questions (indexed-access
convention, CAIRN_DEV_BACKEND, SITE_CONFIG_PATHS boundary, access semantics), and clear
the mechanical residue (headers, vacuous assertion, vale) — mostly consumer-invisible,
riding outside the `Consumers must:` window except where stated.

**Architecture:** This is the audit-remediation internals slice (after 4b; chassis
follows; ONE release cut after chassis). Compiled evidence:
`docs/internal/record/2026-09-01-internals-planning-inputs/docket.md` — every item
verified against `main` at compile time (the 4b staleness lesson applied), sources cited
per item. **Scope cut (proposed, Geoff ratifies):** this pass carries STATUS's routed
list plus the 4a/4b hand-forwards (docket items 1-15). ROADMAP's larger "internals half"
(docket item 16: the five monolith files, the `FieldDescriptor` exhaustiveness idiom, the
coherence thirteen, the newcomer internals map, the read-seam boundary decision) is NOT
absorbed — each is plausibly its own multi-task slice, and bundling them is the
accretion-by-adjacency failure mode. Task 11 re-files that block in ROADMAP as its own
named follow-on slice ("internals-B: monoliths and coherence").

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate plus
the CI-derived gate list.

**Spec:** the docket above; verdicts close in `docs/internal/engine-rulings.md`.

**Worktree:** `.claude/worktrees/internals`, branched from `main` AFTER 4b merges.
From-scratch `npm ci` in `examples/showcase` before trusting any e2e.

**Token ceiling (provisional):** 5M (gate-building plus one large component reshape;
lighter than 4b's surface work). **Checkpoint interval:** every four tasks.

## The rulings (RATIFIED — Geoff, 2026-09-01 sitting, mid-4b)

All six decisions below are SETTLED. Geoff ratified the four contested calls explicitly
(the scope cut to internals-B, documented divergence on access semantics, the
`registerEditor(api)` shape, the first-request tripwire) and let the three stated
defaults stand unobjected (the indexed-access parenthetical convention, the engine-owned
`SITE_CONFIG_PATHS` constant, the items-3+10 merge). The proposals below are retained as
the rationale record; they are no longer open questions. The remaining pre-dispatch
gates are only the 4b-merge anchor reconciliation and the two-round adversarial review.

1. **MarkdownEditor collapse shape (docket item 9; three sources, three shapes).**
   PROPOSED: the int-rank/int-verify shape — collapse the ELEVEN remaining `register*`
   callback props into one `registerEditor?: (api: EditorApi) => void` (the two
   already-object props `registerTidy`/`registerImagePlaceholders` fold INTO `EditorApi`
   or stay, implementer's evenness call, stated in the task); express the stable/unstable
   split as `interface Props extends StableEditorProps, EditPageWiringProps`; document
   the three orphan props. The ledger row's differing "~20 props into a non-exported
   internal object" text is RECONCILED to the executed shape in the same task. Rationale:
   int-verify is the verified record; ROADMAP's shorthand agrees with it.
2. **Engine-wide access semantics (docket item 14; highest stakes).** PROPOSED:
   **documented divergence, no blanket harden.** `canReach`'s permissive unmapped-target
   reading stays the engine-route posture (it is nav semantics behind the admin guard,
   and a blanket harden is a lockout-class breaking change across every route action —
   the 4a adminAction lesson); `authorizeAdminTarget`'s fail-closed posture stays the
   contract for site-authored POSTs (`adminAction`, `section-action`, and 4b's
   `previewMint` parity note). The task DOCUMENTS the two-posture model (security-model
   doc + ledger ruling with reopen conditions) instead of changing behavior.
3. **Indexed-access reference convention (docket item 7).** PROPOSED: an inline
   parenthetical beside the printing shape's member row — the expression exactly as a
   consumer types it — plus one "Reading indexed-access forms" note in
   `docs/reference/README.md`, and a `check:reference` clause requiring the parenthetical
   wherever a rendered shape prints a member with no own export row. 4b's
   `NonNullable<ContentFormFailure['usage']>[number]` line is verified against the
   convention and amended only if it diverges.
4. **CAIRN_DEV_BACKEND refusal (docket item 8).** PROPOSED: a first-request factory
   tripwire — `createAuthChannel` cannot see `env` at construction, but every per-request
   entry point can; the factory performs the refusal check once at first request
   observation (cached), which moves the guard from "every hand-rolled transport must
   remember it" to "the factory enforces it," with the transport-body form documented as
   the override. If the first-request shape proves incoherent against the factory's
   internals, the fallback is documenting today's transport-body pattern in the
   `/auth-channel` reference as the contract, and closing the question as ruled-lean.
5. **SITE_CONFIG_PATHS package boundary (docket item 11).** PROPOSED: the convention is
   engine-owned, so the ENGINE exports the canonical relative path (an internal-constants
   module or a doctor-adjacent export) and `create-cairn-site`'s bake reads it from the
   engine package (the template already installs the engine, so the dependency direction
   exists at bake time). The task opens with a package-graph verification step; if the
   bake cannot cheaply read the engine's constant, fallback is a shared generated file
   both read, committed in-repo.
6. **The items-3+10 merge (docket decision 5).** PROPOSED: one task — `check:dogfood`
   discharges both the dogfood-tripwire routing and R-0's second direction's standing
   gate (no instance work remains; all four C13 instances closed or closing in 4b).

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
  task; a new standing rule gets its own ledger row with reopen conditions.
- Drift-hunt scope for any removed or renamed name: `docs/`, `src/` comments,
  `examples/`, `packages/`, `templates/` (generated — edit the showcase and re-emit),
  `skills/`.
- Line anchors are pre-pass anchors against `main` at `ea45e182` AND MUST BE RECONCILED
  AT 4B CLOSE before dispatch; treat as symbolic wherever 4b touched the file.
- New check scripts follow the sibling `scripts/checks/*.mjs` conventions (fail-loud,
  allowlist-with-reasons where applicable, wired into `package.json` and
  `.github/workflows/test.yml` in the same task — a gate that CI does not run is not a
  gate).
- Cleanliness and beauty are a pass dimension (standing since 4b): a new gate's output
  reads like the siblings'; documentation carries no verdict-provenance scar tissue
  (epistemics live in the ledger).

---

### Task 1: `check:dogfood` — the standing gate for R-0's second direction

**Files:**
- Create: `scripts/checks/check-dogfood.mjs`; wire into `package.json` scripts and
  `.github/workflows/test.yml`
- Modify: `docs/internal/engine-rulings.md` (the `read-from-the-source-rule` row gains
  the enforcement close; the `audit-cli-check-dogfood-*` row — READ ITS FULL TEXT FIRST,
  the docket did not re-quote it — closes), `CHANGELOG.md` (internal; no consumer action)

**Interfaces:**
- Produces: a repo gate failing on any public export with zero `src/lib` call sites
  outside its own module AND zero showcase call sites, with an allowlist-with-reasons for
  legitimately consumer-only exports (the canonical-home record's fail-unless-recorded
  pattern is the model).

- [ ] **Step 1:** Derive the export inventory the same way `check:surface` does (reuse
  its model-building, do not re-parse); compute in-engine and showcase call sites per
  export.
- [ ] **Step 2:** Author the allowlist seeded from the current true positives (every
  entry carries a reason naming the anonymous-consumer ground, mirroring the ledger's
  keep verdicts); the gate fails on any UNLISTED zero-caller export.
- [ ] **Step 3:** Failing-first proof: a fixture or a temporarily-delisted known
  consumer-only export must fail the gate; then the real run is green. Wire into CI.
- [ ] **Step 4:** Ledger closes (this discharges the dogfood-tripwire routing AND R-0's
  second direction's standing-gate half; note all four C13 instances already closed or
  closing in 4b); CHANGELOG; commit.

**Acceptance criteria:** the gate runs in CI; every allowlist entry has a reason; the
`read-from-the-source-rule` ledger row records the enforcement mechanism; no public
export sits unlisted with zero callers.

---

### Task 2: The F-1 leak-class `check:surface` rider

**Files:**
- Modify: `scripts/checks/check-surface.mjs` (or a sibling rider script it invokes),
  `scripts/checks/` recorded-leak registry (new, fail-unless-recorded),
  `docs/internal/engine-rulings.md`, `CHANGELOG.md` (internal)
- Spec: `docs/internal/record/2026-08-30-retires-move-record.md` in full — it is the
  brief, and its three stated limits are the design

**Interfaces:**
- Produces: a permanent rider failing on any UNRECORDED leak — a retire-verdicted OR
  ABSENT name still named inside a surviving rendered public shape — with the 18
  sanctioned leaks seeded as the recorded set.

- [ ] **Step 1:** Derive the leak set against the TYPESCRIPT TYPE CHECKER, not the
  rendered markdown (`buildSurfaceModel()` expands one hop; `AdvisoryAction` is the
  proof case the derivation must find — the move record's compile-only fixture is the
  model).
- [ ] **Step 2:** Widen the predicate to F-1's own "retire-or-absent" wording (the move
  record's narrowing put `NavIcon`/`EngineScreenId` and five never-verdicted names
  outside its count); add the per-subpath clause ("named on one subpath, expanded on
  another" — `NavIcon`/`EngineScreenId` are the proof cases; `SlotKind` the
  absent-everywhere control).
- [ ] **Step 3:** Seed the recorded set from the move record's 18 rows (each entry
  carries its sanction citation); failing-first proof against a synthetic unrecorded
  leak; wire into CI (rides `check:surface` or its own script — match sibling
  conventions).
- [ ] **Step 4:** Ledger (the rider's own standing row with reopen conditions; the 18
  sanctioned-leak rows each gain the "rider now guards this" close of their owed-rider
  clause); CHANGELOG; commit.

**Acceptance criteria:** the rider finds all 18 recorded leaks and zero unrecorded ones
on the current surface; the `AdvisoryAction` two-hop case and the `NavIcon` per-subpath
case are covered by tests; an unrecorded synthetic leak fails CI.

---

### Task 3: `staleNames` per-subpath rescope

**Files:**
- Modify: `scripts/checks/reference-coverage.mjs` (`globalKnownNames()` at `:328-336`,
  `checkOne()` at `:342-361`), `docs/internal/engine-rulings.md` (inheritance note
  discharged), `CHANGELOG.md` (internal)

- [ ] **Step 1:** Scope the known-names pool per subpath so a page listing a name its
  own subpath does not export fails, WITHOUT breaking the existing renamed/removed-name
  guarantee the module's header states (the docket confirms the current design is
  deliberate for that narrower purpose — both guarantees must survive).
- [ ] **Step 2:** Failing-first proof: the historical case (a `delivery-data.md` row
  naming a name only other subpaths export) must fail under the rescope; the full
  reference tree then runs green (fix any real drift the rescope surfaces, in this task).
- [ ] **Step 3:** Gate, ledger note, CHANGELOG; commit.

**Acceptance criteria:** a reference page cannot list a name its own subpath does not
export; the renamed/removed lock still holds; the reference tree is green.

---

### Task 4: Docs-truth tripwires (quote-drift) and the vale reconciliation

**Files:**
- Create: `scripts/checks/check-editor-quotes.mjs` (name per sibling conventions); wire
  into `package.json` + CI
- Modify: `docs/internal/docs-friction-log.md` (complete-or-move: the quote-drift entry
  leaves), `.github/workflows/test.yml` or docs (vale half), `CHANGELOG.md` (internal)

- [ ] **Step 1 (quote-drift):** extract the bolded quoted sentences from
  `docs/editors/when-something-goes-wrong.md` and match each against the shipped
  component strings (`LoginPage.svelte` et al.); fail on a stranded quote.
  Failing-first proof via a temporary copy edit.
- [ ] **Step 2 (vale):** reconcile local-vs-CI vale: pin the local vale to CI's 3.15.1
  (document the pin in CLAUDE.md's authoring section or the check's own header) OR
  record CI-as-arbiter explicitly and make `check:vale` print the pinned-version caveat
  when the local binary differs. The 17 local-only `Google.EmDash` findings are
  version drift, not prose regressions — do NOT edit the three docs to appease 3.19.0.
- [ ] **Step 3:** Gates, friction-log move, CHANGELOG; commit.

**Acceptance criteria:** a stranded editors-page quote fails CI; a fresh session can
tell from the repo alone why local vale may disagree with CI and which one governs.

---

### Task 5: The indexed-access reference convention (retrofit, 19 sites)

**Files:**
- Modify: `docs/reference/README.md` (the "Reading indexed-access forms" note),
  `docs/reference/sveltekit.md` / `core.md` (the 18 retired-name sites + 4b's
  `UsageEntry` line), `scripts/checks/reference-coverage.mjs` or `check-reference`'s
  rule set (the parenthetical-required clause), `docs/internal/engine-rulings.md`,
  `CHANGELOG.md` (docs; no consumer action)

- [ ] **Step 1:** Land the convention per the approved ruling (header decision 3): the
  inline parenthetical carrying the exact consumer-typed expression, the one README
  note, the check clause.
- [ ] **Step 2:** Retrofit all 18 move-record sites; verify 4b's
  `NonNullable<ContentFormFailure['usage']>[number]` line conforms (amend only on
  divergence); the provisional-pending note in 4b's ledger close resolves.
- [ ] **Step 3:** Gates (`check:reference`, `check:docs`), ledger, CHANGELOG; commit.

**Acceptance criteria:** every rendered shape printing an un-importable member carries
the convention's form, enforced by the check; the README note exists; 4b's line is
convention-conformant.

---

### Task 6: Mechanical residue — the six headers and the vacuous assertion

**Files:**
- Modify: `src/lib/sveltekit/content-routes-{core,media,settings,context,tidy,dictionary}.ts`
  (the six "built once by `createContentRoutes`" headers → the precise
  `createContentRoutesInternal` caller, wording authored per file, not one paste;
  `content-routes-context.ts:272`'s TSDoc foremost), `src/tests/component/reproductions-stories.test.ts`
  (delete the vacuous `it('has a matching manifest entry', ...)` block at `:969` — the
  aggregate test at `:206-210` carries the real guarantee)

- [ ] **Step 1:** Rewrite the six headers (each states the actual caller and why the
  public name is a thin wrapper — six sentences, comment-standard conformant, no
  em-dashes in comments).
- [ ] **Step 2:** Delete the vacuous per-story assertion; the suite stays green and the
  aggregate guarantee is untouched.
- [ ] **Step 3:** Gate; commit. (No CHANGELOG — comments and a test-internal deletion.)

**Acceptance criteria:** no module header names `createContentRoutes` as the context
builder; the per-story block is gone; `check:comments` green.

---

### Task 7: The MarkdownEditor seam collapse (per the approved shape)

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (the 13 `register*` props →
  `registerEditor(api: EditorApi)` per header decision 1), `src/lib/components/EditPage.svelte`
  (the wiring side), `docs/reference/components.md` (the stable/unstable split expressed
  in types; the three orphan props — `fragmentTitles`, `onDiagnosticsCounts`,
  `registry` — documented), `docs/internal/engine-rulings.md`
  (`audit-admin-markdowneditor` closes with its text reconciled to the executed shape),
  `CHANGELOG.md`
- Create or extend: the props-vs-reference gate (remediation clause c —
  `check:component-props` or a `check:reference` extension diffing each exported
  component's `Props` keys against its reference page)

**Interfaces:**
- Produces: `EditorApi` (the collapsed imperative surface), the `Props` interface
  extending the stable/wiring split, and the props gate.

- [ ] **Step 1:** Author `EditorApi` from the eleven callbacks' signatures; failing
  component tests first (the editor still registers every capability through the one
  prop; EditPage still drives it).
- [ ] **Step 2:** Collapse; express the split in types; document the three orphans.
- [ ] **Step 3:** Land the props gate; failing-first proof (an undocumented prop fails).
- [ ] **Step 4:** Docs, surface regen, CHANGELOG — **this one rides IN the
  `Consumers must:` window** (public component props change): the line names the
  `registerEditor` migration; usage evidence to the ledger. Ledger closes with the
  reconciled text. Commit.

**Acceptance criteria:** `interface Props` carries no bare `register*` callback beyond
the approved shape; every exported component's props match its reference page under the
new gate; EditPage's wiring compiles through `EditorApi`; the ledger row's shape text
matches what shipped.

---

### Task 8: Audit-rule measurement re-groundings (`list-role`, `panel-width`)

**Files:**
- Modify: `src/lib/audit/rules/static/list-role.ts` (+ its rendered-mode counterpart if
  the fix lands there), `src/lib/audit/rules/rendered/panel-width.ts` (the documented
  gap at `:82-92`), `src/lib/audit/sheet.ts:544` (the two adjacent diagnostic-message
  defects from the same friction-log entry: cause-string mis-attribution on shared
  selectors; dropped at-rule condition), `docs/reference/cairn-audit.md`, the friction
  log (both entries complete-or-move), `CHANGELOG.md` (audit output change; no consumer
  action)

- [ ] **Step 1 (`list-role`):** re-ground on the item's actual computed `display` in
  rendered mode (the nine engine lists in the gap are the fixture corpus); evaluate the
  `role="listitem"` per-item addition against ARIA's owned-elements rule; both themes.
- [ ] **Step 2 (`panel-width`):** painted text-width measurement for the closed-select
  case (the `resolveColors` paint-not-parse precedent the rule's own comment names);
  fixture proves a clipped select label now flags.
- [ ] **Step 3 (`sheet.ts:544`):** fix the two diagnostic-message defects; fixtures per
  defect.
- [ ] **Step 4:** Docs, friction-log moves, CHANGELOG; commit.

**Acceptance criteria:** a class-less `<li>` under `.menu` registers as re-grounded; a
clipped closed select flags; the two message defects have regression fixtures; the nine
engine lists' audit results are read and dispositioned (fixed or advisory-explained).

---

### Task 9: The CAIRN_DEV_BACKEND refusal (per the approved ruling)

**Files:**
- Modify: `src/lib/auth-channel/factory.ts` (the first-request tripwire per header
  decision 4, or the documented-pattern fallback), `docs/reference/` auth-channel page,
  `docs/internal/engine-rulings.md` (the design question in `audit-auth-devdelivery`'s
  Shape field resolves), `CHANGELOG.md`

- [ ] **Step 1:** Execute the approved ruling; failing-first test (a dev-flagged env
  reaching a production-shaped transport refuses at first request; absent flag changes
  nothing; the cached check adds no per-request cost after first observation).
- [ ] **Step 2:** Reference page documents the contract; ledger resolves the question
  with the reasoning; CHANGELOG (behavior change on the opt-in subpath; `Consumers
  must:` only if a documented transport pattern changes). Commit.

**Acceptance criteria:** the refusal no longer depends on every hand-rolled transport
remembering it (or, on fallback, the reference states the transport-body contract and
the ledger closes the question as ruled-lean); the security posture is asserted in tests.

---

### Task 10: The access-semantics ruling (document the two-posture model)

**Files:**
- Modify: `docs/internal/` security-model doc (grep for the canonical home; create the
  section if absent), `docs/internal/engine-rulings.md` (a standing ruling row with
  reopen conditions), `src/lib/sveltekit/guard.ts` / `admin-action.ts` (doc-comments
  naming which posture each helper carries and why — no behavior change under the
  proposed ruling), `CHANGELOG.md` (docs; no consumer action)

- [ ] **Step 1:** Write the two-posture model per header decision 2: engine routes keep
  `canReach` nav-semantics (behind the admin guard); site-authored POST helpers carry
  the fail-closed `authorizeAdminTarget` contract; the map of every call site (the
  docket's item-14 verification) lands in the ruling as the evidence.
- [ ] **Step 2:** Doc-comments on the four helpers state their posture in one sentence
  each; the ledger row carries the reopen condition (evidence of a real-world
  unmapped-target exploit behind an editor session, or a consumer asking for the
  hardened floor).
- [ ] **Step 3:** Gates, CHANGELOG; commit.

**Acceptance criteria:** a reader of either helper knows its posture and the reason
without leaving the file; the 4b-filed question is closed in the ledger; no route
behavior changed (or, if Geoff rules harden instead, this task is re-authored before
dispatch — it must not be improvised at execution).

---

### Task 11: SITE_CONFIG_PATHS derivation and the internals-B re-file

**Files:**
- Modify: `src/lib/doctor/checks-local.ts:150-158` (the WATCH comment and hand-written
  array resolve per header decision 5), `packages/create-cairn-site/src/substitute.mjs`
  (reads the engine-owned constant), the transcript fixture
  (`packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt` regenerates
  if the message changes), `docs/internal/engine-rulings.md`
  (`audit-cli-config-site-config-check`'s open half closes), `ROADMAP.md` (the
  "internals half" block re-files as the named follow-on slice "internals-B: monoliths
  and coherence" — five monoliths, exhaustiveness idiom, coherence thirteen, internals
  map, read-seam decision — with this pass's items struck from the Now-tier block),
  `CHANGELOG.md` (internal)

- [ ] **Step 1:** Package-graph verification first (the boundary question); execute the
  approved direction; the checker and the bake read one source; failing-first proof (a
  synthetic path divergence is impossible by construction or fails a test).
- [ ] **Step 2:** The WATCH comment deletes; ledger half closes; fixture regenerates if
  touched.
- [ ] **Step 3:** ROADMAP re-file (the internals-B slice named, scoped, and pointed at
  its evidence records; this pass's completed items leave the Now-tier block).
- [ ] **Step 4:** Gates, CHANGELOG; commit.

**Acceptance criteria:** one source of truth for the site-config path, provable;
ROADMAP's Now tier reflects reality (this pass's items done, internals-B filed, nothing
silently dropped).

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier; reviewer fan-out — `svelte-reviewer` (Task 7), `daisyui-a11y-reviewer`
(Task 8's list-role ARIA call), `web-auth-security-reviewer` (Tasks 9-10),
`cloudflare-workers-reviewer` if any D1 surface moved, plus the standing
cleanliness-and-beauty review; fix rounds; `engine-triage` on anything filed; the six
CI-only gates by name; from-scratch consumer proof; STATUS/HISTORY/ROADMAP; post-mortem
here; both budgets scored.

## What this pass hands forward

- **internals-B (new slice, filed by Task 11):** the five monolith splits, the
  exhaustiveness idiom, the coherence thirteen, the newcomer internals map, the
  read-seam boundary decision.
- **Chassis:** unchanged (the render trio re-homing; the showcase hand-mount against
  generated `./$types`).
- **Release:** the window still holds; ONE cut after chassis.

## Review folds

(Populated by the two-round adversarial review after 4b merges and anchors reconcile.)
