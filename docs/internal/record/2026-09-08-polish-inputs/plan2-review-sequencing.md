# Plan two, adversarial review: sequencing and blast radius

One lens, read-only. Target: `docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` (revision 1,
authored against `main` at `d565ab77`; `main` is at `4888b720` as this review runs). Inputs read:
the plan in full, `docs/STATUS.md`, `ROADMAP.md`, `docs/superpowers/specs/2026-09-08-polish-passes-design.md`,
`git status --short`, `git log --oneline -15`, `git worktree list`, `package.json`,
`.github/workflows/test.yml`, and the two live worktrees' diffs against `main`.

**Verdict: FIX before dispatch.** The architecture is sound and the contended-resource discipline is
better than most plans in this repo. Six findings are load-bearing: two invert the order of work
this plan itself argues for, two are factually wrong about the repository's gate wiring, one is an
unrecorded cross-chain mutation that can invalidate the harvest after it merges, and one is a
preflight that stops four chains on a dependency only one of them has. Findings 1, 2, 3, 4 and 6
change task content, not just prose.

---

## Ranked findings

### 1. R1's amendment arrives after the passes it redirects have already run. (blocking)

The plan's hard precondition is that polish-C merges before the harvest branches (`Ruled inputs`,
`Global constraints`, P1 step 2, H1 step 1). The polish spec's own sequencing block is explicit:

> Polish-D branches after polish-B merges and its substrate commit lands. Polish-C branches after
> A, B, and D have merged.

So the true ordering is A, B, D, C, then plan two. But task R1, the *last* task of plan two,
writes an amendment whose three clauses are:

1. Polish-B **splits**, its prose findings D1 through D30 deferred to plan three rather than run
   as edits.
2. Polish-D **splits**, its task 1 (`docs/why-cairn.md`) becoming plan three's first page, "since
   authoring it now repeats the exact failure the standard exists to stop."
3. Polish-C precedes the harvest.

Clauses 1 and 2 are instructions to passes that, by clause 3's own ordering, have already finished
by the time R1 runs. If polish-B and polish-D execute as the spec writes them, polish-B will have
folded its thirty prose findings into the pages as edits and polish-D will have authored the front
door — which is precisely the outcome the amendment exists to prevent, and which also silently
falsifies H11's premise ("the two current front-door pages are the pages whose rejection produced
this initiative"). The plan is asking a records task to retroactively re-sequence its own
prerequisites.

The `Ruled inputs` block half-notices this: "B-code (its tasks 2, 8, 9 and the `check:reference`
change in task 5) merges before this plan branches" presumes the split is already decided. Nothing
in the plan decides it.

**Fix:** move the polish-spec amendment out of R1 and make it a precondition of the whole
initiative, landing on `main` **before polish-B's plan is authored**, not after plan two ends.
Either (a) commit the amendment now as a standalone docs commit, or (b) make it P1's step 0 with
the pass stopping if the amendment is absent from the spec — the same treatment plan one and
polish-C get. Leave in R1 only the ROADMAP absorption, which genuinely depends on the harvest
existing. Restate P1's acceptance criteria to verify the amendment's three clauses were *honored*
by the merged polish passes (why-cairn.md unauthored, D1-D30 unapplied), not merely present.

### 2. `npm run check` is not a composite. Two tasks' acceptance criteria assert something false about this repo. (blocking)

`package.json` line 74: `"check": "svelte-check --tsconfig ./tsconfig.json"`. There is no
aggregate gate script. CI enumerates the individual checks as ~30 sequential `run:` lines in one
job in `.github/workflows/test.yml`.

Consequences the plan does not carry:

- G1-7's Files list says "`package.json` (`"lint:markdown"`, the `check` composite)" and G2-8's
  first acceptance criterion says "`npm run check` runs `check:provenance`, `check:prose-read`,
  `check:ledger`, and `check:vale-fixtures`". Implemented literally, that folds seventy-six pages
  of docs gating into the TypeScript type-check script. An implementer will either do that or
  invent a composite the repo has deliberately never had.
- Every G1 and G2 task's stated gate, `npm run check && npm test`, therefore runs svelte-check plus
  vitest and **none of the new scripts, `check:docs`, or `check:vale`**. The per-task gate is
  weaker than the plan believes throughout both gate chains. The unit tests under `src/tests/unit/`
  do run, so the scripts are covered; their wiring is not.

**Fix:** replace "the `check` composite" with "`.github/workflows/test.yml`'s check job, one
readable `run:` step per script" in G1-7 and G2-8, and restate each G1/G2 task gate as
`npm run check && npm test && npm run <the task's own script>` naming the script explicitly. The
pass-end ritual already lists the gates by name and is correct; the task gates are not.

### 3. G1-7's markdownlint sweep mutates the pages chain H has already harvested. (blocking)

G1-7 step 1: "add markdownlint with its stock rules; disable only what conflicts, each with a
reason comment; **clear or scope every existing violation**." Stock markdownlint over 76 published
pages will move lines. The ledger schema (H1) records a `line` per entry and a `read`-tier `source`
as `file:line` plus a sha; G2-6's `check:ledger` **re-resolves every `read`-tier `file:line`
against the working tree** and fails on a path that is gone. So the sequence "H merges, G1 merges,
markdownlint reflows the corpus" turns `check:ledger` red on `main` and silently invalidates the
artifact the whole pass exists to produce.

The Reconciliation table does not list this. It lists file *co-writes*; this is a chain writing
files another chain *reads by line number*, which is the more dangerous shape and is entirely
absent from the analysis.

**Fix, cheapest first:** scope markdownlint to `docs/internal/**` plus the demonstration page only
in this pass, with the published corpus added by plan three's track plans as each track is rebuilt
(this is exactly what `docs-standard-scope.json` is for, and it makes G1-7 a bounded task rather
than an unbounded one). If the owner wants the corpus clean now, the sweep must land **before P1**,
as part of polish-B, never after the harvest. Additionally: H1 should record line numbers as
advisory and `check:ledger` should re-resolve by *anchor and claim string* rather than by line, so
an ordinary reflow does not falsify the ledger. That change also protects plan three, where every
page moves.

### 4. The owner's uncommitted working-tree set collides with every chain, not only G2-7. (blocking)

`git status --short` today: modified `package.json` and `.github/workflows/test.yml` (one inserted
line each: the `check:figures` script and its CI step), plus untracked `scripts/figures/`,
`docs/internal/site-figures.{md,svg}`, `docs/extend/assets/`, and the front-door proposal.

The plan handles this in one place: the `Global constraints` bullet and G2-7's **blocked-on-owner**
marker, with the claim "no other task in this plan reads those paths." Three problems:

- **Reading is not the risk; writing the same two files is.** `package.json` is modified by H2,
  H13, G1-4, G1-6, G1-7, G2-2, G2-3, G2-5, G2-6 and G2-8; `test.yml` by G1-7, G2-2 and G2-8. If the
  owner's commit lands mid-pass, every worktree branched before it conflicts on both files. The
  test.yml job is a single flat list of `run:` steps, so the conflict is adjacent-line, not
  "positional and trivial".
- **`docs/extend` is in `package.json`'s `files` array.** Anything committed under
  `docs/extend/assets/` is a published path. H4's criterion is "the table covers every published
  markdown file ... the count is stated in the file's first line and matches a `find` over the
  published paths at the recorded sha"; P1 records that count. A substrate commit after P1 changes
  the count and adds pages with no type assignment and no ledger.
- **H8's criterion is unsatisfiable without the substrate.** "`docs/extend/architecture.md`'s
  figure, its alt text, its caption, and its text alternative are recorded as keep-class entries" —
  the anatomy figure lands only with the substrate commit (or with polish-D task 2). H8 sits in
  chain H, which is supposed to be indifferent to those paths.

**Fix:** move the substrate commit from "before G2-7" to "before P1", and make it a P1 step-2
verification with the same stop-the-pass treatment polish-C gets. Then delete the "no other task
reads those paths" sentence, add `package.json` and `.github/workflows/test.yml` to P1's Files list
so the pass owns a known-good baseline, and correct the Reconciliation table's writer lists (see
finding 7).

### 5. P1 stops four chains on a dependency only one of them has, and stops the pass on a soft dependency. (fix)

Two separate mis-sizings in one task.

**Polish-C.** The stated reason is that polish-C's ten renames "invalidate ledger entries in exactly
the class the ledger exists to guarantee." True of chain H. Not true of chain C (an external prose
corpus), chain G1 (a brief parser, twelve templates, a verb lexicon, markdownlint), or most of G2
(the vendored plain-language PDF, the Vale rules and their fixture runner, `check:prose-read`).
Only G2-4's fact matcher and G2-6's `check:ledger` touch renamed symbols, and both work against
fixtures. Yet P1 stops the whole pass, *and* H1 re-verifies and stops the chain — a belt-and-braces
gate whose belt is three sizes too big. If polish-C slips, the plan as written idles C, G1 and G2
for the whole slip, which given polish-C's 7M ceiling is the largest pass in the polish sequence.

**Plan one.** P1 stops the pass if the tellgrader docs-register profile, the Vale hook's
path-grading change, or the two changed skills are missing. But G2-8's own criterion says "the tell
scanner is invoked in report mode ... and **its absence never fails a build**", and D2 runs it in
report mode. Nothing in this plan's acceptance criteria mechanically consumes the Vale hook (an
on-save editor convenience) or the two skills. The plan hard-stops on a dependency it then declares
non-blocking.

**Fix:** demote both. P1 records what is present and what is not; a missing polish-C blocks **chain
H only** (H1 already has that gate — keep it, drop P1's); a missing plan-one output is recorded as a
degradation with the affected criteria named (D2's tell-scanner step becomes "skipped, recorded"),
never a pass stop. Keep exactly one true pass-stop: the working-tree substrate of finding 4, which
genuinely breaks the page count every chain derives from.

### 6. Chain H is the critical path, is thirteen serial tasks, and was not split when the other three were. (fix)

Tasks run sequentially inside a chain. H carries 4.0M of an 8.8M ceiling across 13 serial tasks
while C carries 0.6M across 5; D cannot start until H merges. The corpus today is admin 9, editors
8, extend 31, reference 25, front door 3 (76 published pages, not the 75 H12's note cites). So H5
harvests 9 pages in one task and H6 harvests 8, while **H7 and H8 carry roughly fifteen pages
each** and H9/H10 roughly twelve each, at "Deliverables: 1" apiece. A fifteen-page harvest with
per-page claim extraction, an anchor map, six keep classes and verbatim block entries is not one
deliverable, and it will not survive one Sonnet context.

The checkpoint interval compounds it: "four tasks per chain" puts checkpoints at H4, H8 and H12,
so the two most expensive tasks in the pass sit inside one interval with no STATUS write between
them.

**Fix:** split H at its natural file boundary once H1 through H3 have landed. Chain H keeps admin,
editors and the front door (`admin-facts.md`, `editors-facts.md`, `front-door-facts.md`, three
files, three tasks); a new chain H2 takes extend and reference (`extend-facts.md`,
`reference-facts.md`, its own files, four tasks). They contend on nothing — the existing H7/H8 and
H9/H10 append-ordering note already proves the files are chain-private. H12 joins both. Independently,
split H7/H8 into three tasks and H9/H10 into three, capping a harvest task at roughly ten pages,
and drop the checkpoint interval to three tasks in the harvest chains.

### 7. The Reconciliation table understates the contended set by a wide margin. (fix)

Measured against the tasks' own Files lists:

| File | Table says | Actually written by |
|---|---|---|
| `package.json` | G1-7, G2-8 | H2, H13, G1-4, G1-6, G1-7, G2-2, G2-3, G2-5, G2-6, G2-7, G2-8 — **and chain H is not listed as a writer at all** |
| `.github/workflows/test.yml` | G1-7, G2-8 | G1-7, G2-2, G2-8 (G2-2 wires `check:vale-fixtures`), plus the owner's uncommitted step |
| `docs/internal/record/docs-rebuild/` | P, H, D, R | P, H, D, R **and G2** (G2-5 creates `receipts.md`, G2-8 creates `link-rot-routine.md` there) |
| `docs/STATUS.md` | "R2 only; no contention" | R2, plus the conductor's checkpoint writes on `main` while four worktrees are live |
| `ROADMAP.md`, `CHANGELOG.md` | R1, R2 | R2 only; R1's Files list names neither CHANGELOG nor HISTORY |

`scripts/checks/docs-standard-scope.json` deserves its own note: G1-4 **creates** it and G2-3/G2-5
also list it under Modify. Across two worktrees that is an add/add conflict at the second merge, not
the "second chain adds its own keys" the table describes. Git will not merge two independently
created files.

**Fix:** correct the table from the tasks' Files lists, and have **P1 create both shared files as
stubs** on `main` before any chain branches: an empty-but-valid `docs-standard-scope.json` and a
`docs-rebuild/README.md` index (P1 already creates the latter). A stub converts every add/add into
an ordinary line merge.

### 8. Half-landed states: `main` stays releasable, but CI does not stay green. (fix)

Nothing this pass produces ships. `package.json`'s `files` array covers `dist`, `migrations`,
`skills`, `CHANGELOG.md` and the four doc arms; every artifact here lands under `docs/internal/`,
`scripts/checks/`, `.vale/`, or `docs/internal/templates/`, and G1-1 explicitly proves no
`*.brief.yml` reaches the tarball. `check:version` is untouched by design. So the repo rule holds
in the narrow sense at every chain merge.

Two exceptions and one gap:

- **D1 rewrites a published page.** `docs/extend/add-a-custom-admin-screen.md` ships in the tarball
  and cairn.pub renders it from its installed engine version. R2's criterion says the CHANGELOG
  entry carries "no `Consumers must:` line, since no public surface changed" — a rebuilt page with
  a changed anchor set is a change cairn.pub's navigation sees at the next pin bump. The plan
  correctly notes the cairn.pub consultation is owed "before plan three's first track merges", but
  this pass rebuilds a published page, so it is owed **here**.
- **Gates merge before their inputs exist.** If G1 or G2 merges before D, `check:anatomy` demands a
  brief for every in-scope page and `check:prose-read` "fails a published page in scope that has no
  row" while `receipts.md` has zero rows until D3. The only defence is
  `docs-standard-scope.json` starting with all 76 pages excluded — which the plan never says, and
  which collides with G1-4's self-check that every exclusion names the plan-three track plan that
  removes it. State it: the scope file ships fully excluded, with four named track plans covering
  all 76 rows, and D1 removes exactly one exclusion.
- **`check:fact-coverage` is wired into `package.json` (H2) and into no CI step.** G2-8's CI
  criterion names provenance, prose-read, ledger and vale-fixtures. A gate that runs nowhere is the
  weakest form of watch item, which this repo's own `CLAUDE.md` names as the failure mode. Add it
  to G2-8, or to H13.

### 9. The pass has no named cut point, and the two ceilings disagree. (fix)

Thirty-eight tasks across six chains at 8.8M. The header says 8.8M; the pass-end ritual says
"tokens against the 9.0M ceiling". Fix the number in one place.

More importantly, `Pass sizing is the orchestrator's job` requires the cut to be named before it is
needed, and this plan names none. The cut is clean and it is at the harvest:

- **Plan 2a, the toolset proven on one page (~5.0M):** P, C (5 tasks), G1 (7), G2 (8), H1, H2, H3,
  D (3). Everything D needs from H is H3's single-page harvest, which the plan already sequences
  first precisely so the schema breaks early. 2a ends with every gate wired, the corpus approved,
  the twelve templates fixed, and `demonstration-cost.md` measured.
- **Plan 2b, the full harvest (~3.8M):** H4 through H13 (split per finding 6) plus R. It runs
  against merged tools, a schema H3 already corrected, and a *measured* per-page cost rather than
  an estimated one — which is the same argument the plan makes for sizing plan three from D3.

Carry-forwards across the cut: R1's amendment moves to the front of the initiative anyway (finding
1), the ROADMAP absorption goes with 2b's R, and 2a writes its own short STATUS and CHANGELOG
entry. The 80-percent rule then bites inside 2a, where the four chains are genuinely parallel,
rather than inside a serial harvest where the only lever left is stopping.

### 10. The ROADMAP overrule does not answer the reason it overrules. (fix)

`ROADMAP.md` line 68 states the claims-verification audit "Runs AFTER `beta.1` **so its inputs
exist** (stranger issues, the friction log, Topo's docs-effectiveness signal)". R1's criterion
records the overrule's reason as "polish-C's renames invalidate ledger entries wholesale, so the
harvest runs with this plan rather than after `beta.1`."

That is an argument for running the harvest *after polish-C*. It is not an argument against
*waiting for beta.1*, and it does not engage the stated reason at all: the ratified sequencing was
about inputs (real users' confusions) that this harvest still will not have. The overrule may well
be right — a ledger built now and maintained by `check:ledger` is a better base than a sweep run
once — but the recorded reason has to be the one that answers.

R1 handles the rest of the row correctly: absorbed, the five ledger files named, the blocking-gate
status restated rather than dropped. Two additions: say plainly that the harvest absorbs the
*extract-and-verify* half and plan three absorbs the *fold* half, since "absorbed by this harvest"
overstates what merges here; and file the overrule as a row in
`docs/internal/engine-rulings.md` as well, since R1 already runs `check:rulings-format` and the
ledger is where this repo records rulings that reverse ratified positions.

### 11. In-flight worktrees: no direct conflict, but the anchor baseline is already stale. (note)

`git worktree list` shows `chassis-b` (c4c396ad), `identity-seam` (4aa5a95e), and
`experiment-screen` (a05fb6d3, never merges). Both live branches merge long before this plan
branches (polish-A and polish-B branch after identity-seam and chassis-B2; polish-C after A, B and
D; plan two after C), so there is no concurrency to manage. The overlap is in *content*, and it is
substantial:

- **identity-seam** already touches ten published pages this plan harvests — `docs/why-cairn.md`,
  `docs/admin/is-it-working.md`, `docs/extend/{README,migration-notes,security-model,sign-in-through-your-organization}.md`,
  `docs/reference/{README,ambient,components,doctor,log-events,sveltekit}.md` — plus
  `docs/internal/api-surface.md` (H9's input), `docs/internal/engine-rulings.md`,
  `docs/internal/docs-friction-log.md` (R2's input), `ROADMAP.md`, `CHANGELOG.md` and
  `docs/STATUS.md`.
- **chassis-b** touches no published doc arm; its overlap is `examples/showcase/**` and
  `docs/internal/public-design-system.md`. No contention with this plan.

The plan's header carries one sentence about this: "Anchors and line counts verified against `main`
at `d565ab77`; re-verify at dispatch." That is too weak for what sits in between. Between `d565ab77`
and P1 the queue is chassis-A (resumed from its Task 2 escalation), chassis-B1, chassis-B2,
identity-seam, then polish-A (7M), polish-B (4M), polish-D (2.5M) and polish-C (7M) — on the order
of thirty million tokens of merged work, most of it touching the corpus this plan harvests by line
number. Meanwhile the plan hard-codes derived facts: nine admin pages, eight editors pages, the
`docs-sweep.md` D-numbers assigned per task (H5 takes D1, D2, D5, D6, D10, D26, D27; H7 takes D3,
D4, D7, D8, D9, D13, D14; and so on).

Those counts are correct today — admin 9, editors 8, extend 31, reference 25, 76 published pages —
which is exactly why they will read as verified when they are not.

**Fix:** make re-derivation a P1 acceptance criterion rather than a header note. P1 re-derives every
per-track page count, re-resolves every `docs-sweep.md` finding number cited in H5 through H11
against merged `main`, and records which findings polish-B already applied as edits (finding 1's
amendment should have prevented that, but P1 verifies rather than assumes). A finding that no longer
resolves is reported, not silently dropped by the harvest task that inherited it.

### 12. Smaller corrections. (note)

- **R2 acceptance criterion:** "`docs/STATUS.md` is present tense only, at most 60 lines, and its
  next action is **authoring plan two**." It should read plan three. (STATUS is 109 lines today, so
  the 60-line cap means moving history to `HISTORY.md`, which R2's next criterion covers.)
- **H12's note** says "the front-door failure generalized to **75 pages**". The published set is 76
  by the plan's own derivation (four arms plus `docs/README.md`, `docs/why-cairn.md`, root
  `README.md`).
- **"H and C consume no gate slot, since neither runs a build"** (Architecture) is contradicted by
  H2 and H13, whose stated gate is `npm run check && npm test`. Either those two take a slot, or
  their gate is narrowed to their own unit test plus `check:fact-coverage`.
- **CI job length:** `test.yml` is one sequential job of about thirty `run:` steps. G1-7 and G2-8
  add markdownlint, `check:anatomy`, `check:headings`, `check:provenance`, `check:prose-read`,
  `check:ledger` and `check:vale-fixtures` to it. Worth one sentence on whether the docs gates
  become their own job, since they share nothing with the build steps and would then run in
  parallel with them.
- **Plan one has no plan document** anywhere reachable from this repo. P1 verifies three named
  artifacts, which is testable, but the pass is gated on work that is not yet specified. Name where
  plan one's own record will live so P1's step 1 has something to cite.

---

## What the plan gets right

Worth recording, since a fix list reads as a verdict on the whole.

- The Reconciliation block exists at all, names the conductor as the reconciler rather than a task,
  and fixes a rebase order (G1, G2, D, R). Most plans in this repo discover contention at the second
  merge.
- H3, harvesting the demonstration page before eleven more tasks build on the schema, is the right
  shape and its note ("an implementer that finds nothing to correct says so explicitly") closes the
  usual silent-pass hole.
- G2-6 tolerating a missing ledger file so it is green before chain H merges is exactly the
  half-landed-state reasoning finding 8 wants applied to `check:anatomy` and `check:prose-read` too.
- The two owner checkpoints (H12, C5) are batched and stated as single sittings, and D3 correctly
  refuses to assert the owner's approval in its own artifact.
- Keeping `package.json`'s version untouched, and stating it as a constraint, keeps the release
  discipline the repo's `CLAUDE.md` sets.
