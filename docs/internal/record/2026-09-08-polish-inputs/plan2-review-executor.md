# Plan two adversarial review: execution under the chain

Lens: EXECUTION UNDER THE CHAIN. The plan is read as the Sonnet `cairn-implementer` would read it
cold, with zero conversation context, inside a dedicated worktree, driven by
`~/.claude/workflows/pass-execute-chains.js`. Read-only review; no file in the plan's scope was
edited. Target: `docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` (revision 1). Repository
state read at `main` `d565ab77` plus the owner's uncommitted figures working tree.

Everything below is a defect in the plan as an executable artifact, not a disagreement with the
design. Where the design is right and only the dispatch is unbuildable, the fix is a dispatch fix.

## 1. What the executor actually is

Two facts govern the whole review, and the plan is written as if neither held.

**The implementer's toolbelt is `Read, Write, Edit, Bash, Grep, Glob`.** It has no `WebFetch`, no
`WebSearch`, no `Agent`, no `Skill`. Its Bash runs sandboxed. It cannot fetch a URL, dispatch a
subagent, invoke a skill, or ask the owner anything.

**`pass-execute-chains.js` takes ONE global `args.gate` string for the entire run.** Read
`runChain`/`implementPrompt`: `a.gate` is interpolated into every implementer prompt and every
diff-reviewer prompt, for every task in every chain. There is no per-task gate field, no per-chain
gate field, and no gate-slot scheduler. The plan specifies a different gate on nearly every task
and asserts a two-concurrent-gate machine ceiling. The workflow cannot express either.

## 2. Cold simulation, first three tasks per chain

### Chain P, Task P1 (main loop, not a chain)

Runs in the main loop, so tool limits do not bite. Two real gaps.

The published-page count is defined twice and incompatibly. P1 says "a `find` over
`package.json`'s `files` array plus the root `README.md`". That array is `dist`, `migrations`,
`migrations-channel`, `skills`, `CHANGELOG.md`, `docs/README.md`, `docs/why-cairn.md`,
`docs/reference`, `docs/admin`, `docs/editors`, `docs/extend`. A literal find yields `CHANGELOG.md`
and eight `.md` files under `skills/`, which are shipped markdown by that definition. H4's criteria
instead say "the four track directories, `docs/README.md`, `docs/why-cairn.md`, and the root
`README.md`". Measured today: admin 9, editors 8, extend 31 tracked (33 `.md` including the
untracked `docs/extend/assets/`), reference 25, front door 3. A cold P1 will produce a number that
H4 then contradicts, and H4's "the count matches a `find`" criterion fails against P1's own record.

`docs/extend/assets/` is untracked working-tree state today and contains `.md` files. P1's find, and
H4/H7/H8's enumerations, will either include them (if the owner commits before the move) or not (if
after). The plan says "no other task in this plan reads those paths"; that is false for any task
that enumerates `docs/extend/`.

### Chain H, H1 → H2 → H3

**H1** is buildable cold. It is a document task with a fully spelled schema. One flaw: it requires
recording "the `main` sha polish-C merged at" and every later `read`-tier source to cite that sha or
later. Inside a worktree the implementer will read `git rev-parse HEAD` of its own branch, not
`main`; nothing tells it which. Minor, but it poisons `check:ledger`'s re-resolution criterion.

**H2** builds `check-fact-coverage.mjs`. The task assumes a token taxonomy it does not define
operationally. "Bare numerals outside code fences" over `docs/reference/` matches thousands of
tokens; "repository-relative file paths" matches every inline `src/lib/...`; "exported symbol
names matched against `docs/internal/api-surface.md`" matches on every reference page. The gate's
pass condition is that the token appear as a substring of some entry's `claim` or `source`. A cold
implementer will write the most literal extractor it can, then H5 through H11 inherit a gate whose
exit-0 condition is unbounded work. This is the pass's single largest execution risk: H5's gate is
`check:fact-coverage --track admin` exiting 0 over nine pages, and there is no calibration step, no
sample run, and no ceiling on entries per page anywhere in the plan.

H2 also modifies `package.json`. The Reconciliation table lists `package.json` writers as G1-7 and
G2-8 only. H2 and H13 both write it, and so does the owner's uncommitted figures change.

**H3** harvests the demonstration page (2,649 words) and is the one H task sized correctly. Its gate
is `npm run check:fact-coverage -- --track extend` "scoped to the one page", but H2's stated CLI is
`--track <track>` with no page scoping flag. The scoped run the plan asks for does not exist unless
H2 invents a flag the plan never names. A cold H3 will either run the whole track (failing, since
30 pages are unharvested) or add a flag and diverge from H2's documented interface.

### Chain C, C1 → C2 → C3

**C1 fails its own gate.** It deletes the three `corpus-sample-*.md` files under
`docs/internal/record/2026-09-08-polish-inputs/`. `scripts/checks/docs-links.mjs` walks all of
`docs/` except `superpowers/`, so `docs/internal/record/**` is link-checked, and six sibling records
link to those files: `proposal-review-rev4.md`, `rev5`, `rev6`, `docs-standard-proposal.md`,
`docs-standard-proposal-fresh.md`, `docs-spec-review-conformance.md`. C1's gate is
`npm run check:docs`. It will fail on the first run, and the fix (editing six historical records) is
not in C1's Files list.

**C2 and C3 are undispatchable.** Both require fetching external candidates, reading licenses, and
excerpting third-party prose. The implementer has no fetch tool and a sandboxed shell. A cold agent
told to "fetch each candidate; determine its license" will either fabricate excerpts and licenses,
which is the worst possible outcome for an artifact whose whole purpose is provenance, or return
`couldNotDo` and stall the chain. C3's Mozilla note ("blocks automated reads") shows the plan knows
fetching is involved and still routes it to an agent that cannot fetch.

**C5 stops for the owner.** The workflow has no human gate. The implementer will fill the `approved`
column with something, or block the chain.

### Chain G1, G1-1 → G1-2 → G1-3

**G1-1** is the best-specified task in the plan; a cold agent can build it. Two frictions: its gate
`npm run check && npm test` plus the `check:package` criterion means running `svelte-package` in a
worktree that must first have a full `npm install` (see section 4), and the `.brief.yml` parser has
no stated YAML dependency decision (`yaml` is already a dependency, used by `check-visuals.mjs`, but
nothing says to use it rather than hand-rolling).

**G1-2 and G1-3** require "the spec's page-level section orders" verbatim. The spec exists and is
large. The task text names no section anchors, so the implementer must scan the whole spec to find
twelve section orders. That is a discoverable path, not a blocker, but it is the difference between
a 40k-token task and a 150k-token one.

### Chain G2, G2-1 → G2-2 → G2-3

**G2-1 is undispatchable.** It vendors
`docs/internal/reference-captures/federal-plain-language-guidelines-2011.pdf`. No fetch tool, no
network. A cold agent will write the provenance note and commit a placeholder or nothing.

**G2-2 cannot verify its own criterion.** It must prove fixtures fire "on the CI-pinned binary,
3.15.1". `.vale.ini`'s own header records that this workstation's Homebrew `vale` drifts ahead
(3.19.0 observed) and that the two versions disagree on the same source. The implementer cannot
install 3.15.1 (no network). It will run local vale, see findings CI will not produce, and report a
gate result that means something different from what the criterion asks. The plan gives it no
instruction for that mismatch even though `.vale.ini` documents the trap eight lines from the top.

**G2-3 cannot do what it is told.** Its criterion: "The sentence splitter is imported from
`measure-prose.mjs`; a `grep` for a second splitting regex returns nothing."
`scripts/checks/measure-prose.mjs` is a top-level CLI script with no exports: it reads `process.argv`
at module scope and calls `process.exit(2)` when no file argument is present. Importing it from
`check-provenance.mjs` executes it and exits the process. Making the splitter importable requires
refactoring `measure-prose.mjs` into an exported function plus a CLI guard, and `measure-prose.mjs`
is not in G2-3's Files list at all. A cold implementer hits this in minute five and either
reimplements the regex (failing the criterion) or edits a file the task does not authorize.

## 3. Cross-chain edges the plan does not declare

The plan states there is exactly one cross-chain edge besides the join: H1's schema into G2-6. There
are at least four.

| Edge | Where | Consequence |
|---|---|---|
| H1 `ledger-schema.md` → G2-6 | declared | G2's worktree cannot see it until H merges and G2 rebases. No task or step performs that rebase. "The task waits" is not a thing an implementer in a sequential chain can do. |
| H2 `check-fact-coverage.mjs` → G2-4 | **undeclared** | G2-4 must import the token classes from a file chain H owns. It does not exist in G2's worktree. G2-4 will duplicate the extractor, then fail its own "defined once" grep criterion after the merge. |
| G1-7's `check` composite → G2-8 | **undeclared** | G2-8 says "the `check` composite gains the G2 scripts". There is no `check` composite: `package.json`'s `check` is `svelte-check --tsconfig ./tsconfig.json`. G1-7 creates the composite. If G2 merges first, or G2-8 runs before G1-7 merges, G2-8 must invent it. |
| G1-1 `brief.mjs` → G2-3 | declared in Depends-on, unbuildable | G2-3 depends on G1-1's parser, which lives in G1's worktree. Same invisibility as the others. |

The `check` composite point deserves emphasis because the plan leans on it repeatedly ("G1 and G2
tasks run the full `npm run check && npm test`", "`npm run check` runs `check:provenance`,
`check:prose-read`, ..."). Today that command runs a TypeScript check and nothing else. Every
"full gate" claim in this plan is weaker than the author believes, and the one task that changes it
is the sixth of seven in G1.

## 4. What fails in a worktree, and what four of them cost

**Four worktrees means four `npm install` runs.** A fresh worktree has no `node_modules`. The root
package has a `prepare` script that runs `npm run package` (svelte-package + admin CSS build +
the dist `.svelte` transpile), so every install also builds `dist/`. Nothing in the plan's preflight
creates the worktrees or installs them; `pass-execute-chains.js` takes `chain.repo` as given.

**The two-gate ceiling is unenforceable.** The plan asserts H and C "consume no gate slot, since
neither runs a build". With one global `args.gate`, every task in H and C runs whatever gate string
the conductor passed. If that string is `npm run check && npm test`, chain H runs the full suite
thirteen times, including the `component` project, which drives real Chromium under an 8G systemd
scope (`scripts/test/contained.mjs`). Four such runs concurrently is the OOM the wrapper exists to
contain, four times over.

**Port 4173 is not the contended resource here.** 4173 is the showcase Playwright preview
(`examples/showcase/playwright.config.ts`). No task in this plan runs the showcase e2e, and
`npm test` is unit + unit-dist-spawn + integration + component only. The port conflict the identity
plan worried about does not arise. The showcase `node_modules` symlink trap is likewise inert for
this pass, for the same reason: nothing here proves the engine through the showcase. Say so in the
plan so no implementer burns tokens reinstalling the showcase defensively.

**The Vite 8 dist-`.svelte` gotcha is inert** for this pass (no `src/lib` component changes), but it
rides along in every `prepare` on every worktree install, so it is four times the build cost, not a
correctness risk.

**`.github/workflows/test.yml` and `package.json` are dirty on `main` right now** with the owner's
figures work. G1-7 and G2-8 both edit both files. That is a three-way contention (G1, G2, owner),
and the Reconciliation table models only two-way, "positional" merges. A `check` composite line and
a CI step block are single lines two chains both rewrite; that is a conflict, not an append.

## 5. Which tasks exceed one context window

Measured word counts, `main` today:

| Task | Corpus it must read | Words | Verdict |
|---|---|---|---|
| H10 reference, part two | 13 pages including `sveltekit.md` (20,865 w) | 51,403 | **Overflows.** ~70k tokens of source reading, before the ledger it writes, before every re-read the fact-coverage close loop forces. |
| H9 reference, part one | 12 pages | 33,875 | **Overflows** once the ledger and the close loop are counted. |
| H8 extend, part two | ~14 pages including `architecture.md` | ~22,700 | At the edge; overflows with the close loop. |
| H7 extend, part one | ~15 pages | 17,771 | At the edge. |
| H5 admin | 9 pages | 11,448 | Fits, barely. |
| H6 editors | 8 pages | 6,767 | Fits. |
| H11 front door | 3 pages | 1,965 | Fits. |

`sveltekit.md` alone is 20,865 words. A reference page is the densest possible source for "one entry
per checkable proposition": every export, signature, default, and tier note qualifies. H10 is asked
to harvest that page plus twelve others, hold the schema, hold seven docs-sweep findings, and drive
a gate to exit 0, in one dispatch marked **Deliverables: 1**.

## 6. Same file, two chains

Beyond the declared table:

- `package.json`: H2, H13, G1-7, G2-8, and the owner's uncommitted change. Table lists two.
- `scripts/checks/docs-standard-scope.json`: G1-4, G1-6, G2-3, G2-5, G2-8. Correctly listed, but the
  file's semantics are self-contradictory (section 7, defect 9), so the two chains will build
  different shapes and the "second chain adds its own keys" reconciliation will not compose.
- `docs/internal/record/docs-rebuild/README.md`: P1, H1, H4, R2, and every chain's index row. The
  table calls the rows positional. Four chains appending rows to one table in four worktrees is a
  conflict on every merge after the first, positional or not.
- `docs/extend/add-a-custom-admin-screen.md`: H3 reads it, D1 rebuilds it. Not a write conflict, but
  D1's "no sentence in the page appears in the old page" is checked against a page H3 harvested at a
  different sha.

## 7. Verdict: the ten defects, ranked

**1. The workflow takes one gate for the whole run; the plan specifies twenty-nine different ones.**
`pass-execute-chains.js` has a single `args.gate`. Fix: give the plan one gate string per chain and
run four separate workflow invocations, or add a per-task `gate` field to the workflow and pass
`t.gate ?? a.gate` into both prompts. The second is a ten-line change and is worth making before
dispatch.

**2. Chains C and G2-1 require network fetches the implementer cannot make.** C2, C3, and G2-1
fetch external corpus candidates and a PDF. Fix: the conductor performs every fetch in the main loop
before chain C dispatches, commits the raw captures under `docs/internal/corpus/raw/` with their
license notes, and each C task then works from committed local files. G2-1's PDF is a conductor
pre-extraction, not a task step.

**3. `measure-prose.mjs` has no exports, and G2-3 must import from it.** Fix: add a task G2-0 (or
extend G1-1) that refactors `measure-prose.mjs` into `export function splitSentences()` plus a
`import.meta.main`-style CLI guard, with a unit test proving the CLI still behaves, and put the file
in that task's Files list. Cheap, and it unblocks the one shared-definition criterion the standard
rests on.

**4. `check:fact-coverage`'s exit-0 condition is unbounded and uncalibrated.** Every H task's gate
is "the extractor finds no uncovered token", over corpora up to 51k words. Fix: H2 ships a
`--report` mode and the conductor runs it over one admin page and one reference page before H5
dispatches, recording the token count per page in `preflight.md`. If a reference page yields 400+
tokens, the granularity rule or the token classes change before eleven tasks build on them.

**5. H9 and H10 exceed one context window.** Fix: split the reference harvest by page-count budget
rather than by halves. `sveltekit.md` is its own task. Target roughly 12,000 source words per
harvest task, which makes reference four tasks, not two, and extend three, not two. That is four
added tasks; it is cheaper than four blown dispatches.

**6. Three undeclared cross-chain edges (H2→G2-4, G1-7→G2-8, G1-1→G2-3), and no rebase step for the
declared one.** Fix: name a merge order in the header (H first, then G1, then G2), add an explicit
"rebase this worktree on merged `main`" step as step 0 of G2-3, G2-4, G2-6, and G2-8, and state that
the conductor performs the merge between them. Alternatively move `brief.mjs` and
`check-fact-coverage.mjs` into the preflight so both spines start from shared ground.

**7. Three tasks stop for the owner inside a chain the workflow cannot pause (H12, C5, D3), and two
tasks require dispatching subagents the implementer cannot dispatch (D2 steps 2 and 3).** Fix: mark
H12, C5, D2, and D3 as conductor tasks, executed in the main loop, and say so in the header beside
"P runs in the main loop". The chains then end at H11, C4, D1.

**8. C1 breaks six inbound links and fails its own `check:docs` gate.** Fix: C1's Files list gains
the six polish-inputs records, and its step 1 repoints their links to `docs/internal/corpus/` before
the deletion. Or keep the originals and have C1 copy rather than move, recording the originals as
superseded.

**9. `docs-standard-scope.json` is specified as an allowlist and as an exclusion list in the same
sentence.** G1-4: "the path allowlist, with the plan-three track plan that removes each exclusion
named". Five tasks write this file across two chains. Fix: pick one. State the exact JSON shape in
the Ruled inputs block, with a two-key example, the way H1's ledger columns are fixed.

**10. `npm run check` is not a composite today, and the plan's every "full gate" claim assumes it
is.** Fix: state the current value of `check` in the Ruled inputs, and move the composite's creation
into the preflight (P1 or a new P2) so both G chains inherit it and neither has to author it.
Attach the same treatment to the three-way `package.json` and `test.yml` contention: the owner's
figures commit lands before any chain branches, not just before G2-7.

## 8. Pre-extractions the conductor must do before any dispatch

1. Commit the owner's figures working tree (`package.json`, `.github/workflows/test.yml`,
   `scripts/figures/`, `docs/internal/site-figures.*`, `docs/extend/assets/` with the two writer
   `.md` files moved to `docs/internal/figures/`). Not just before G2-7: before P1, because it
   changes `package.json` and the extend enumeration.
2. Create the four worktrees and run `npm install` in each, confirming `dist/` built. Record which
   worktree is which branch, and pass `chain.repo`/`chain.branch` accordingly.
3. Decide and record the published-page definition, with the count, in `preflight.md`. Name whether
   `CHANGELOG.md` and `skills/*.md` are in or out.
4. Fetch and commit: the plain-language PDF, and every corpus candidate with its license, under a
   raw capture directory. Chain C then reads local files only.
5. Resolve `check`: create the composite in the preflight, or state that G1-7 owns it and G2-8 waits.
6. Record `main`'s sha, and state explicitly that every `read`-tier citation cites that sha, not a
   worktree HEAD.
7. Extract, into the plan or a companion file the chains read: the spec's twelve section orders
   (G1-2, G1-3), the spec's brief field table (G1-1), the docs-sweep finding ids per track (H5 to
   H11 each name a subset; give each task the finding text, not the ids).
8. Confirm the local `vale --version` and record the disposition: either install 3.15.1 or route
   G2-2's fixture verification to CI and mark the local run advisory.
9. Calibrate `check:fact-coverage` on two sample pages before H5 dispatches (defect 4).
10. Rewrite the Reconciliation table to include H2, H13, and the owner as `package.json` writers, and
    `docs/internal/record/docs-rebuild/README.md` as a four-way write.
11. Fix the ceiling inconsistency: the header says 8.8M, the pass-end ritual says 9.0M.

## 9. What is right

The plan is unusually strong on interface fixing: H1's column set, G1-1's eight field names, the id
regex, and the four tiers are stated once and spelled the same everywhere. The must-fire fixture
rule is exactly the right discipline for a gate estate. H3-before-the-rest, breaking the schema on a
real page before eleven tasks build on it, is the best sequencing decision in the document. None of
the ten defects above touch the design; every one is a dispatch fix.
