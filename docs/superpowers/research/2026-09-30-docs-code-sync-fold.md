# Docs-code sync spec: fold record

**Target:** `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` (229 lines before, 278
after). **Reviews folded:** contract (CC), mechanics (MF), integrity (DI), consistency (CO), in
`docs/superpowers/research/2026-09-30-docs-code-sync-review-*.md`. **Base:** `254d7860`.

Every finding was checked against the tree before its disposition. Verified by this fold: the
runner's `frictionFiled` route and drafter log write (`docs-page-chain.js:149,606-610`), the
three-in-flight pool (`:213`), `publishActions` and `summaryFields` already in
`docs/reference/*.md`, `check-surface.mjs` rendering flat strings with no member paths
(`:94-120`), the docs gate's step list (`scripts/checks/docs-gate.mjs`, which already runs the
`dist`-reading `check:reference`), the sweep counts (sweep record `:37-47`), the plan's shares
(2a plan `:99-112`), the parent's 80 percent rule (`:181-182`), the fact grammar's single-tag
shape (`facts/README.md`), the outline's page fields (no path field), and the current Rust RFC
template (fetched 2026-09-30: "Guide-level explanation", no "How do we teach this?").

## Settled, not forked

**Mechanism 2 (fact staleness) is deferred.** All four lenses (CC-3, MF-1, DI1, CO-1) showed its
four named facts were wrong when filed and their cited code unchanged since, so a stamp would have
certified them green. S2's guard condition 2 fails, and the guard's own rule defers a failing
mechanism. It moves to the deferred table with the trigger "a later code change makes a verified
fact wrong," detected by a fact read, a release-sweep verifier, or a site round. The mechanism-only
findings are retired by the deferral; the review records stay as the design's starting inputs if
the trigger fires. The release sweep is renumbered mechanism 2.

## Dispositions

| Id | Disposition | Where, or why |
| --- | --- | --- |
| CC-1, MF-2 | Folded | Mechanism 1 gates a committed map (fact, exclusion, or pending per path); the reference-entry escape and all text matching are dropped. Source: typescript-eslint `docs.test.mts` named allowlist. Measured defect: at `86fd134c^` every named option was already in the reference arm, and leaf-name matching covers 178 of 180 `CairnAdapter` paths (MF-2). |
| CC-2 | Folded | Paths keyed by declaring type, recursion stops at a listed named type, counts recorded at creation, removed-path and empty-reason rows fail. |
| CC-3, MF-1, DI1, CO-1 | Settled | Mechanism 2 deferred (above); the Brief's drift claim removed. |
| CC-4, MF-4, DI2 | Retired | Line-pointer hashing; mechanism 2 deferred. |
| CC-5 | Retired | Staleness report states; mechanism 2 deferred. |
| CC-6, DI5 | Retired | Stamp provenance; mechanism 2 deferred. |
| CC-7, MF-8, DI7 | Folded | S7 rides the existing route: page inputs and the fact read get the drafter's `frictionFiled` and direct log write; the register editor does not report; the runner copies `frictionFiled` into the page record; the close's fold agent reconciles and verifies, never the conductor; a zero-entry pilot is read as a prompt failure. Refused parts: a new required `designFriction` field (parallel route) and DI7's runner-written record file (the workflow runtime has no filesystem, and the direct log write already persists entries). |
| CC-8, CO-5 | Owner fork | Ruling 1. |
| CC-9 | Folded | The carrier is the parent's stage flow, as an owed erratum; acceptance names it. |
| CC-10 | Folded | Acceptance: pilot depends on the mechanism tasks, R10 keep-or-cut marks, one guard verdict per mechanism. S6 goes to ruling 2. |
| CC-11, CO-9 | Folded | The "one exception" and the fact note are deleted; the fact records the code's behavior, including a defect's consequence. |
| MF-3 | Folded | "Option-bearing" defined (input types from `defineAdapter`, the `define*` helpers, route-factory configs; outputs, descriptors, registries, component props excluded); the walker stated as new, with the measured 7,497 / 2,269 / 1,379 counts; page routing by a `pending <slug>` row instead of a new outline field. |
| MF-5 | Folded | Window from the `api-surface.md` diff, the scaffold diff, and the changelog lines, one module per context; tag glob `v[0-9]*`; "the release sweep covers the rest" removed and the unre-verified population named. Cost cap goes to ruling 1. |
| MF-6, MF-7, MF-10 | Retired | Stamp race, container-wide stale failure, hash traversal; mechanism 2 deferred. MF-10's early-stop lesson is kept as an acceptance note for the walker. |
| MF-9 | Folded | Wording says the walker reuses the export enumeration and adds a member walk; the budget prices it as one real `engine-logic` task. |
| DI3, DI4, DI6, DI10, DI11 | Retired | Mechanism 2 deferred. |
| DI8 | Folded, narrowed | Exclusions are reasoned rows, and pending is a shrink-only baseline in Betterer's form (committed results file, fails when worse). Refused: DI8's gate comparison against `main`'s copy, new machinery with no verified source and a CI fetch cost; the diff-reviewer, which reads every diff already, holds the no-new-pending rule. |
| DI9 | Folded | No generated list is committed; the gate walks and compares against the map directly, so nothing goes stale. |
| DI12 | Folded | The window starts at the last tag whose sweep HISTORY records, so a skipped sweep rolls forward. |
| CO-2 | Folded, and owner fork | Arithmetic corrected (remaining non-page shares are 3.0M; projection 16.9M planned, 19.0M at pass A's rate, before this review's cost); the 4.9M spent figure flagged unsourced. The ceiling question is ruling 2. |
| CO-3 | Folded | "Amends the parent" section; owed errata below; the initiative consequence (up to about 10M across stages 3 to 5) routed to the pilot checkpoint's existing ceiling question. |
| CO-4 | Folded | After an arm merges, a gap files as a fact naming its rebuilt page, fixed under "Edits after the chain" before the version is set; no page home becomes a friction entry. |
| CO-6 | Folded | "Found as gaps or defects"; a 2a task files DAD-1, EXB-4, EXB-5 as friction entries; the close reads `engine-rulings.md` and runs the premise test before promoting. |
| CO-7 | Retired | Mechanism 2 deferred. |
| CO-8 | Folded | The Rust citation now quotes the current template's "Guide-level explanation" with its URL; Amazon and Stripe dropped (not in the record, not verified). |
| CO-10 | Folded | Close outcomes reworded: routed to an engine pass, promoted, or deleted. |
| CO-11 | Folded | The gate joins `docs-gate.mjs`. |
| CO-12 | Folded | The lock simplification leaves the close's `code-simplifier`; any change is a separate dotfiles change with a `diff-reviewer` read. |
| CO-13 | Folded | Brief counts corrected (140 raw, 167 records, 148 verified gaps); the majors sentence sourced to the 2a plan's 27 of 74. |

**Counts:** 46 findings. Folded 25, retired by the deferral 15, settled 4 (one convergent
defect), owner fork 2 (CC-8 and CO-5, ruling 1). CO-2 is counted as folded; its ceiling question
is ruling 2.

## Rulings for Geoff (as written in the spec)

1. Should the release sweep run only on capability releases (trigger 2), capped at 1M per cut,
   never blocking the cut on its yield? Recommended yes.
2. Should stage 2a's ceiling rise to 21M, flagged at 16.8M, at this spec's approval? Recommended
   yes.

## Owed errata (not applied here)

- **Parent spec** (`2026-09-26-draft-docs-approach-design.md`): the Brief's "No new check is
  built" and "The budget goes to pages"; the stage flow step 1 opens with the planning-phase
  sweep; the Budget's per-stage "about 1M for planning" against a sweep measured near 4.4M;
  stage 2's page count if Geoff keeps the two sweep pages.
- **Prior-art record** (`2026-09-30-docs-code-sync-prior-art.md:38-41`): it reads the sweep's
  corrected facts as resolved-but-stale drift; they were wrong when filed. It also lacks the two
  sources the spec now cites outside its methods table: the Rust RFC template's "Guide-level
  explanation" (https://github.com/rust-lang/rfcs/blob/master/0000-template.md) and Betterer
  (https://phenomnomnominal.github.io/betterer/docs/introduction), both fetched 2026-09-30.
- **2a plan** (untracked in the worktree, not touched): its task list, Global constraints, and
  ceiling follow this spec and ruling 2 once Geoff rules.

## Unresolved

- The 4.9M spent and the 4.4M sweep cost are conductor estimates with no source in any record;
  the plan's counting rule must source them before ruling 2's numbers are final.
- The mechanisms' 1.2M is an estimate after removing mechanism 2 and growing the walker; the
  pilot checkpoint re-derives it.

## Measures

- **New-mechanism findings folded:** 2. CC-1/MF-2's committed map (typescript-eslint
  `docs.test.mts`; measured: every named option passed the drafted gate at `86fd134c^`, 178 of
  180 leaf matches). DI8's shrink-only pending baseline, narrowed to Betterer's form with
  enforcement by the existing diff-reviewer (measured: the drafted "may only shrink" had no check,
  and any string satisfied its reason rule).
- **New-mechanism findings refused:** DI8's `main` comparison, DI7's runner-written record file,
  CC-7's new required `designFriction` field; plus every mechanism-2 fold retired by the
  deferral (CC-4, CC-5, CC-6, MF-4, MF-6, MF-7, DI2 to DI6, DI10, DI11, CO-7).
- **Lines:** 229 before, 278 after (+21 percent, under the 25 percent warning line; the growth is
  the definitions MF-3 and CC-2 asked for, the parent errata list, and the two rulings).
- **Budget:** mechanisms 1.5M to about 1.2M; projection 16.5M / 18.7M corrected to 16.9M / 19.0M.
  Ceiling unchanged pending ruling 2 (proposed 21M, flag 16.8M).

## Second fold

**Input:** `docs/superpowers/research/2026-09-30-docs-code-sync-fold-verification.md` (FV-1 to
FV-11) and Geoff's rulings of 2026-09-30, recorded in the spec as S8 (release sweep) and S9
(ceiling 24M, flag 19.2M). **Base:** `16aa249e`. **Scope:** majors folded in full; minors folded
only where the fix is a wording or number correction; the rest owed. The spec's "Rulings for
Geoff" section is removed; its two questions are now S8 and S9 in the owner-rulings table, and
S6 is marked superseded by S9.

| Id | Disposition | Where, or why |
| --- | --- | --- |
| FV-1 | Folded | Budget rewritten as one table from measured spend: 5.20M subagents, 0.13M verification, 1.5M conductor (estimated), 1.2M mechanisms, 7.75M (9.9M at pass A's rate) pilot and task 5, 3.0M other shares. Projected 18.78M planned, 20.93M at pass A's rate, against S9's 24M and 19.2M flag (planned is 78 percent of the ceiling). |
| FV-2 | Folded | Sweep cost now "about 3.3M (measured)"; the parent-erratum bullet reads 3.3M and "up to about 7M more" for stages 3 to 5; the unsourced 4.9M and 4.4M figures are gone. |
| FV-3 | Folded | Filing: after an arm merges, a gap files as a fact naming its page and the page fix follows in the next pass; the cut never waits (S8). Mechanism 2 states S8's cadence, cap, unswept-module report, and trigger-1 fast path. CC-8(a)'s retire rule restored: two consecutive capability releases with zero verified gaps move the sweep to on-demand, run when a site round finds a gap in a surface changed since the last sweep. |
| FV-4 | Folded | The ratchet moves into the gate: a committed pending-count constant, failing when the count exceeds it, lowered in the same diff as a disposal (Betterer's committed results file). The gate's unmapped-path message names the two ways out, including an `exclude` whose reason the diff-reviewer accepts. "In the plan's Global constraints" dropped from Acceptance. |
| FV-5 | Folded | The gate fails a `pending` row whose slug names no page in a committed outline; Acceptance names the fixture. |
| FV-6 | Folded | Prior-art record gains an addendum with both sources, fetched and quoted verbatim 2026-09-30 (Rust RFC template; Betterer results-file and introduction pages). Guard condition 1 now names the addendum; mechanism 1 cites both Betterer pages. No Acceptance line is needed, since the addendum has landed. |
| FV-7 | Folded (wording) | "No new agent runs"; the two schemas that gain `frictionFiled` are named, the shared read schema is stated, the runner copies the field only from page inputs, the drafter, and the fact read, and the concurrent-write guard is named. |
| FV-8 | Folded (wording) | The release sweep's failure now cites the sweep's own ids: the 25 `SCF` scaffold findings and the 15 `CLN` post-harvest changelog findings. The old examples were not sweep finds: the themed 404 fact `f:ofex2m` predates the sweep (commit `0747fc7e`), and the migrations trap was SCF-18, already covered by `f:jtl15v`. |
| FV-9 | Folded (wording) | Brief counts rewritten per the sweep record: 148 verified gap claims (131 filed after dedupe) and 12 defects; 4 facts corrected; 2 pages added. |
| FV-10 | Owed | Not a wording fix. With FV-4's constant, a retag to `[candidate]` must rewrite the row to `pending <slug>` and raise the constant by one in the same edit, or the gate reddens every in-flight page. The 2a plan's gate task settles the rule and its fixture. |
| FV-11 | Owed | Not a wording fix. The 2a plan records map rows per pilot page at creation, and the pilot checkpoint reports the disposal cost apart from the page rate. Amended 2026-09-30 (2a plan fold, PC-1 and PR-5): the disposal cost is no longer read apart from the page rate; the checkpoint reports rows received and disposed beside each page's total. |

**Counts:** 11 findings. Folded 9 (5 majors, 4 minors), owed 2 (FV-10, FV-11). New mechanism
added: 1, the committed pending-count constant (source: Betterer's results file; measured
defect: FV-4, the reviewer-only rule reached 2a's reviewers and no later engine pass).

**Lines:** 278 before, 292 after (+5 percent).

**Unresolved:**

- The conductor's 1.5M is an estimate; the plan's counting rule replaces it with `/cost`. The
  plan review and this second fold are not in the Budget table.
- The caller's expected totals were about 18.7M and 20.8M; the table sums to 18.78M and 20.93M
  because it includes the 0.13M verification line. Both sit on the same side of the flag.
- The first fold's Measures claimed DI8's pending rule measured and closed; it was reviewer-only
  and is closed now by FV-4's constant.
