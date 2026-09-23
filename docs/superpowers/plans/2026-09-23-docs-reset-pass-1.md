# Docs reset pass 1: the writing system

> **For agentic workers:** eleven tasks in four segments. Every task except 4, 10, and 11 runs as the
> per-task chain: `cairn-implementer` (`sonnet`, `medium`) implements, `diff-reviewer`
> (`claude-opus-5-5`) reads the diff against the task's acceptance criteria, and the task's gate
> runs inside the chain through `cairn-run-gate`. Tasks 4 and 10 (the baseline run and validation)
> are conductor-run measurements, dispatched as named in each. Task 11, the close, is authored by one fold agent with
> one independent `diff-reviewer` read. Tasks name `opus` where the logic is novel and
> correctness-critical. The conductor is thin: it reads reports, never diffs, pages, or logs.
>
> **Plan author:** `claude-opus-5-5` at `high` (Geoff, 2026-09-23, the first plan under that
> rule). The close records this plan's planning misses.

**Date:** 2026-09-23.

**Goal:** A validated writing system for the docs reset: confined reader agents that attempt real
jobs, stable fact ids with sentence-level provenance, a drafter that always receives its profile
and exemplars, a page chain that tests pages with readers, and a docs-as-tests floor, each built
only where the baseline run shows a failure it fixes.

**Spec:** [`docs/superpowers/specs/2026-09-23-docs-reset-design.md`](../specs/2026-09-23-docs-reset-design.md),
"Pass 1: the writing system", rulings 9, 10, and 13, "Evidence the method follows", and
"Relation to existing designs". Executors read the spec's pass 1 section before their task. Where
this plan and the spec disagree, stop and report.

**Token ceiling:** 6M, flag at 4.8M. Reader runs report their own usage outside the Workflow
counter; the runner's ledger totals them into this ceiling. **Checkpoint interval:** at each
segment boundary: after Task 3, Task 6, Task 10, and at the close.

**Segments:** 1 to 3 (the reader instrument), 4 to 6 (the baseline and the fact layer), 7 to 10
(the drafter, the chain, docs-as-tests, validation), 11 (close). Every boundary sits on a commit
the gate proved green. Task 4's failure record is the one decision point: it may drop or defer
parts of Tasks 8 and 9, recorded in the ledger, with no owner question.

**Branches:** cairn-cms `docs-reset-system` off `main` after the `docs-reset` branch (spec, this
plan, the `CLAUDE.md` model line) merges, in `.claude/worktrees/docs-reset-system`. Workstation
artifacts land as a dotfiles commit series. One executor per worktree; check `pgrep -f` and
`git status` before starting.

**Models:** implementers `sonnet` at `medium`; `diff-reviewer`, every reader, and every review
read on `claude-opus-5-5`; readers also on `claude-sonnet-5` where a task says so. `opus` upshifts
are named per task. A hedged verdict on a correctness-critical point goes to one `fable` dispatch.

## Pre-flight findings (2026-09-23, from the plan author's reads)

1. `tool/v1.1.0` is tagged and released (2026-09-22T16:35:40Z). The revision-2 reviewer's "tag
   pending" claim was wrong.
2. `podman` (`/usr/bin/podman`) and `bwrap` (`/usr/bin/bwrap`) are installed.
3. The facts container holds 845 bullets across five files (`admin.md` 94, `editors.md` 87,
   `extend.md` 344, `front-door.md` 46, `reference.md` 274). `check-facts.mjs` has a unit test at
   `src/tests/unit/check-facts.test.ts` and fixtures under `scripts/checks/fixtures/facts/`.
4. `docs-page-chain.js` is 274 lines at `~/.dotfiles/claude/.claude/workflows/`; its
   `drafterModel` default is already `claude-opus-5-5`.
5. Workstation agents, skills, and workflows follow `~/.claude/docs/claude-tooling.md`: agents and
   skills are their own manifests under `~/.dotfiles/claude/.claude/`, and every addition gets a
   governing `CLAUDE.md` line and `claude-tooling-sync verify`.
6. The headless reader flags were probed on Claude Code 2.1.280 with `ANTHROPIC_API_KEY` unset
   (spec ruling 9): file-tool confinement, Bash scoping, no instruction files, plan login.

## Global constraints

- Pass 1 changes no published page (`docs/admin/`, `docs/editors/`, `docs/extend/`,
  `docs/reference/`, `docs/why-cairn.md`, `README.md`), no `package.json` version, and nothing in
  the npm tarball's `files` list.
- Readers authenticate with the owner's plan login; no task sets or reads `ANTHROPIC_API_KEY` for a
  reader.
- No reader, test, or fixture touches a production site, the production repositories, or the
  owner's keyring. The scratch site is the only live target.
- Every reader job is phrased as a real task, never as a test.
- Reader directories live under a neutral path that never names the project
  (`$XDG_CACHE_HOME/docs-readers/<run-id>/`).
- Captured exemplars live at `~/.local/share/cairn/exemplars/`, never in the repository.
- Code comments follow TSDoc (`npm run check:comments`); Go is untouched.
- Every gate runs through `cairn-run-gate`; a gate that launches no browser sets
  `CAIRN_GATE_LANE=light`.

## Review focus

1. **A reader escaping its container:** a job whose natural path leads outside the directory (a
   build script, a `node_modules` read, an absolute path in a page). Expected: refused, and the
   report shows the refusal rather than a silent success. Pinned in Task 1's escape suite.
2. **A clean report from a reader that read nothing:** Expected: the runner fails it for lacking a
   verifiable quote. Pinned in Task 1.
3. **Plan credentials expiring or refreshing mid-batch:** Expected: the runner detects an auth
   failure, stops the batch, and reports it; it never reports the jobs as stalled. Pinned in Task 1.
4. **Two worktrees filing facts at once:** Expected: ids never collide, and `check:facts` rejects a
   duplicate. Pinned in Task 5.
5. **A fact edited after a page cites it:** Expected: the id is unchanged and the reverse mode lists
   the citing page. Pinned in Task 6.

---

### Task 1: The reader runner and the container

**Files:** Create `scripts/docs-readers/` (the runner, its class declarations, a `Containerfile`),
`src/tests/unit/docs-readers-*.test.ts`. Model: `opus` (novel, correctness-critical confinement).

**Outcome.** A Node script, run by the conductor in the background, takes a batch file of reader
jobs (class, job text, arrival state, docs set, reader model) and runs each reader in a podman
container built from the `Containerfile`: Node plus the Claude Code CLI pinned to the host's
version. Each container mounts only the job's prepared directory and a per-run writable copy of
the plan credentials, runs with `env -i` plus the class's declared variables, and has no D-Bus
socket or keyring. Inside, the reader is the headless process of spec ruling 9. The runner parses
the `stream-json` output, checks the init event against the class declaration, verifies each
report's `path:line` quotes against the prepared directory, scans the transcript for fetches of
cairn's package or repository, totals reported usage into a ledger file, and tears the container
and directory down. Batches run in parallel up to a declared limit.

**Report shape (produced for Tasks 4, 8, and 10):** one JSON object per job: `outcome`
(`done`, `stalled`, `refused`), `stalls[]`, `assumed[]` (terms or steps the reader inferred),
`quotes[]` (`path`, `line`, `text`), `checks[]` (deterministic check results, if any),
`ruleCandidates[]`, `usage`, `verified` (the runner's quote and init checks).

**Acceptance.**
- The escape suite, run live against a docs-only and a repository-class reader: a file-tool read of
  a known host path fails; `cat` of it through Bash fails; an `npm` script that reads it fails;
  a `WebFetch` and a `WebSearch` call are refused. Each refusal appears in the report.
- The init event of every run shows no `CLAUDE.md`, skill, hook, installed plugin, or MCP server,
  and the tool list equals the class declaration; a mismatch fails the run.
- A report with no quote, or a quote not found at its `path:line`, is marked unverified and fails.
- An auth failure stops the batch with an auth error, not a stall.
- Unit tests cover batch parsing, the quote verifier, the init check, and the ledger total.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`, plus the live escape suite's transcript in the report.

### Task 2: The four reader classes

**Files:** the class declarations under `scripts/docs-readers/`, a class-preparation module, tests.

**Outcome.** The four classes of the spec's pass 1 item 2, each a declaration of contents, tools,
Bash allowlist, and environment. Preparation builds the directory: the docs set for every class;
for docs-and-site, a scaffolded site with the engine installed from a packed tarball of the
worktree, with the installed package's `docs/`, `claude/`, and `skills/` directories removed and
`npm install` done before the reader starts; for repository, a clean checkout at a named commit.
The docs-and-binary class is declared here and wired in Task 3.

**Acceptance.**
- A docs-and-site reader can run the job's named `npm run` scripts and cannot read
  `node_modules/@glw907/cairn-cms/docs` (absent) or any path outside its directory.
- A repository reader can run `npm run check:facts` and cannot reach the host checkout.
- Before pass 2a's profiles exist, each class supplies one neutral sentence describing its reader.
- Gate: light lane, the class tests plus one live run per class of a trivial job.

### Task 3: The scratch site and the operator class

**Files:** `scripts/docs-readers/` operator wiring; `~/.dotfiles/secrets/registry.md` and the age
store for the new tokens; a record at `docs/internal/record/2026-09-23-scratch-site.md`.

**Outcome.** The scratch site of spec ruling 10 exists: repository `glw907/cairn-scratch-b`, Worker
`cairn-scratch-b`, and its D1, created by API and scaffolded by the setup command. Cloudflare
tokens scoped to that Worker and D1 alone are minted by API and stored through `secret-set.sh`
with registry rows. A GitHub fine-grained token scoped to the one repository is minted by API if
the account allows it; otherwise the conductor asks the owner for one short sitting and receives
it through `secret-receive`. The docs-and-binary class installs `cairn` `tool/v1.1.0` from its
release archive, verified against `SHA256SUMS`, sets a reader-local `CAIRN_STATE_DIR`, and
allowlists only `sites list`, `health`, `logs` (scratch site), `doctor` (the reader's own
directory), `auth list`, and `auth check`. The record states the teardown for pass 2a's close.

**Acceptance.**
- An operator reader runs `cairn health` against the scratch site and gets a result; `cairn auth set`
  and any production site name are refused.
- The tokens reach no other Worker, D1, or repository (checked by one denied call each).
- The registry rows and `sync.sh --verify` are green.
- Gate: light lane, the operator class tests and one live operator run.

**Checkpoint 1** (after Task 3): write the ledger at the foot of this plan (task states, decisions,
spend including the runner's ledger, next task).

### Task 4: The baseline run

**Conductor-run.** Dispatch one `sonnet` agent to write the batch file and the rot-measure script,
then run the runner in the background; one `claude-opus-5-5` agent writes the failure record from
the reports.

**Outcome.** Readers attempt real jobs on today's pages, each job run three times, twice on
`claude-opus-5-5` and once on `claude-sonnet-5`: an operator job on `docs/admin/is-it-working.md`
(for example, a scratch-site condition to diagnose and act on); a designer job on
`docs/extend/design-your-site.md`; an extender job on `docs/extend/add-a-custom-admin-screen.md`; a
core-developer job on `CONTRIBUTING.md`; and the scripter job (write a wrapper and parser) on pass
A's three contract pages at commits `3bfaac37`, `3453668f`, and `29a03eff`, whose 14 page defects
are known from the pass A plan's task 9 record. A script measures line-window rot: the share of
container `Source:` pointers whose quoted anchor no longer sits within `check-facts.mjs`'s window
of the cited line at `HEAD`. The failure record, `docs/internal/record/2026-09-23-docs-reset-baseline.md`,
lists each failure with its evidence, how many of pass A's 14 the scripter readers found, the rot
share, and for each part of Tasks 8 and 9 whether a failure justifies it (build), or none does
(defer, with the reason).

**Acceptance.** Every report verified by the runner; the record names a build-or-defer verdict for
each chain change in the spec's pass 1 item 6 and for the harness scope of item 7. Tasks 5, 6, and
7 are structural (provenance and the profile design need them) and are built regardless.

### Task 5: Fact ids

**Files:** `scripts/checks/check-facts.mjs`, `docs/internal/facts/README.md`, the five container
files, `src/tests/unit/check-facts.test.ts`, fixtures; the agent definitions that file facts
(`cairn-implementer`, `site-implementer`, and any other the conductor's grep of
`~/.dotfiles/claude/.claude/agents/` finds naming `docs/internal/facts`).

**Outcome.** Every bullet carries an opaque id, minted once and never derived from content, in a
form that is not a bracket and that the bullet grammar accepts; the facts README defines it and how
to mint one. `check:facts` fails a bullet without an id and a duplicate id anywhere in the
container. A one-time script adds ids to all 845 bullets without changing any other byte. Every
agent definition that files facts states the id rule.

**Acceptance.**
- Two ids minted in separate worktrees at the same moment do not collide (a test mints many in
  parallel processes and checks uniqueness).
- Editing a bullet's text leaves its id unchanged (a test and the README say so).
- The migration diff changes only id insertions (`git diff --word-diff` shows nothing else).
- Gate: light lane, `npx vitest run --project unit src/tests/unit/check-facts.test.ts && npm run check:facts`.

### Task 6: Provenance, briefs, and the reverse mode

**Files:** a new `scripts/checks/check-provenance.mjs` and its `package.json` script,
`docs/internal/briefs/` (with a README), `check-facts.mjs`'s reverse mode, tests, the candidate
dispositions. Model: `opus` for the extractor.

**Outcome.** `check:provenance` is built to the docs-standard spec (lines 569-586): a page's brief
at `docs/internal/briefs/<track>/<page>.json` carries a `sentences` list, each sentence with a fact
id or `no-claim`; the check fails an unclassified sentence, an id that does not resolve, and a
machine-extractable fact (numerals, versions, paths, commands, flags, export and config names, and
owner-tier claims) that no cited bullet contains. The owner tier is the bullets sourced to an owner
brief. A cited id whose bullet is `[candidate]` or marked excluded fails. `check:facts --cited-by
<id>` lists the pages whose briefs cite it. The 134 `[candidate]` bullets sourced only to an old
page are each traced to code (retagged with the new source), rejected (deleted, listed in a record),
or marked excluded; `[docs-drift]` bullets are listed for resolution before any page cites them. If
Task 4's rot share exceeds ten percent, symbol-anchored sources are built for `src/` (TypeScript
compiler) in this task and filed for `tool/`; otherwise both are filed in ROADMAP.

**Acceptance.**
- Fixtures cover each failure mode above and a passing brief.
- A fact edited after citation keeps its id and appears in `--cited-by` for its page.
- The candidate disposition record lists all 134 with a verdict and a source for each retained one.
- Gate: light lane, the provenance and facts tests plus `npm run check:facts`.

**Checkpoint 2** (after Task 6): the ledger, as at checkpoint 1.

### Task 7: The drafter agent and the audience-profile skill

**Files (dotfiles):** `claude/.claude/agents/cairn-docs-drafter.md`,
`claude/.claude/skills/audience-profile/SKILL.md` and its profile-file template, the governing
`CLAUDE.md` line; `claude-tooling-sync verify`.

**Outcome.** The drafter agent of the spec's pass 1 item 5 (tools Read, Write, Edit, Grep, Glob,
Bash; `model: claude-opus-5-5`; preloads the skill through `skills:`). The skill defines the
profile-file format (one-sentence persona, vocabulary contract, knowledge and tool ceiling, arrival
states, success criterion, exemplar list with the local paths under
`~/.local/share/cairn/exemplars/`) and how a brief hands a profile and exemplars to the drafter
(exemplars in `<example>` tags, source material wrapped as content). The agent's prompt carries the
Opus 5.5 rules from the spec's evidence section: the first sentence of each section states its
answer, the named tells to avoid, a no-padding line, the `sentences` list written with the page, and
plain instructions without emphasis capitals.

**Acceptance.** A fresh headless session's transcript shows the agent resolving to
`claude-opus-5-5` with the skill preloaded; `claude-tooling-sync verify` is green; a test profile
file validates against the template.

### Task 8: The revised page chain and the register editor

**Files (dotfiles):** `claude/.claude/workflows/docs-page-chain.js`,
`claude/.claude/agents/cairn-register-editor.md`; the protocol for splitting the chain around the
reader stage, documented in the workflow header. Scope per Task 4's record.

**Outcome.** The changes of the spec's pass 1 item 6 that Task 4 marked build: `cairn-docs-drafter`
as the default `drafterType`; `check:provenance` in the page gate; the register editor fed Vale and
`tellgrader` output and an omission checklist, reporting every finding; a separate filter read; an
applied-findings read after each redraft; the profile grader removed; the chain split into a
draft-and-read stage and a redraft stage with the reader runner between them, run by the conductor;
source material wrapped as content; a text-only turn end treated as a report; bounded auto-continue
of two; the two-round cap. Every existing gate stays.

**Acceptance.** A dry run of the chain on one scratch page (a copy of a current page on a scratch
branch that never merges) completes both stages, with the runner's reports passed into the redraft
stage, and the applied-findings read returning a verdict per finding.

### Task 9: Docs-as-tests

**Files:** a spike record at `docs/internal/record/2026-09-23-doc-detective-spike.md`; the harness
under `scripts/docs-readers/` or the adopted tool's config; tests. Scope per Task 4's record.

**Outcome.** A time-boxed Doc Detective spike against two current operator pages records a
build-or-adopt decision with evidence. Either way, every shell procedure and `--json` output on an
operator page runs literally in the docs-and-binary container under ruling 10's tiers and is checked
in code, with state-changing commands checked as dry runs against `cairn`'s command tree.

**Acceptance.** The harness runs `docs/admin/is-it-working.md`'s procedures against the scratch site
and reports each step's result; a deliberately broken command in a fixture page fails.

### Task 10: Validation

**Conductor-run,** as Task 4.

**Outcome.** A planted-defect set: copies of Task 4's baseline pages, each carrying a removed step,
an undefined term, a wrong flag, and a stale path, with their locations recorded in
`docs/internal/record/2026-09-23-docs-reset-planted-defects.md` (outside every docs arm and the
tarball). Each reader class runs its jobs on its planted pages three times (twice Opus 5.5, once
Sonnet 5) and again on the baseline's real failures. The planted set becomes a standing regression
batch the runner can replay.

**Acceptance.** Every reader class catches every planted defect in at least two of three runs and
the baseline's real failures; the scripter readers find at least 12 of pass A's 14. **Failure
rule:** a class that cannot reach this after one fix round stops the pass; the conductor writes
STATUS and reports to the owner rather than closing.

**Checkpoint 3** (after Task 10): the ledger, as at checkpoint 1.

### Task 11: Close

One fold agent, one independent `diff-reviewer` read.

**Outcome.** The branch's PR carries: a `docs/HISTORY.md` entry (what landed, what the gate caught,
what a later pass would be wrong to rediscover, this plan's planning misses and both budgets); a
post-mortem at the foot of this plan; the docs-friction log and ROADMAP updated for deferred items
(Task 4's defers, Task 6's filed anchors); no `CHANGELOG.md` entry unless a published surface
changed (none should); the facts and briefs READMEs current. After merge, `docs/STATUS.md` on
`main` names pass 2a as the next action with its resume prompt: a fresh `claude-opus-5-5` session,
where Opus 5.5 at `high` authors the pass 2a plan from the spec. The dotfiles series is committed and
`claude-tooling-sync verify` is green. The full gate runs once, heavy lane:
`cairn-run-gate 'npm run check && npm test'`.

**Acceptance.** The PR merges on green CI; STATUS on `main` names pass 2a; the scratch site stands
for pass 2a with its teardown recorded.

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
