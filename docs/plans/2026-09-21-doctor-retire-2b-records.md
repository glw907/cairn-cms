# retire-2b: the records pass (the window, the ledger, the unblock line)

> **For agentic workers:** four tasks in two segments. Tasks 1 through 3 run as the per-task chain
> (`cairn-implementer` on `sonnet`, then `diff-reviewer` on `claude-opus-5`, then the task's gate
> inside the chain). Task 4, the close, is authored by one fold agent with one independent
> `diff-reviewer` read. Tasks 2 and 3 are independent of each other and `pass-execute.js` may take
> them in parallel.
>
> **This pass changes no engine code.** Every task writes prose or a record. **No task launches a
> browser, and the lane claim is verified per task below** rather than asserted for the pass. The
> one exception is named where it falls: the close's post-merge re-gate runs `npm test`, which
> launches headless Chromium, so that one gate is heavy lane.
>
> **Line numbers in this plan are stale by construction.** retire-2a lands between this plan's
> writing and this pass's branch point, and 2a's Task 2 rewrote the facts container while its Task 6
> rewrote eleven docs pages. **Every `file:line` citation here is a starting point: re-find the site
> by content, never by line.**

**Date:** 2026-09-21.

**Spec:** [`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`](../specs/2026-09-21-doctor-retirement-design.md),
the "retire-2: the engine pass" section's `## Unreleased`, Ledger, and Close subsections, plus the
records half of the "Pre-task and retire-2" acceptance bullets. The removal half is
[`2026-09-21-doctor-retire-2-engine.md`](2026-09-21-doctor-retire-2-engine.md) (retire-2a), and its
merge is this pass's branch point. **"retire-2's close" in the spec means THIS pass's close**: it is
the only writer of "the `0.97.0` cut is unblocked".

**Inputs:** retire-2a's implementer reports (what the removal actually did, which the changelog
entry describes), and
[`docs/internal/record/2026-09-21-doctor-retirement-inventory.md`](../../internal/record/2026-09-21-doctor-retirement-inventory.md).

---

## Pre-flight findings

Verified against the tree. Findings marked **EXTENDS** or **CONTRADICTS** change what a task must
do.

1. **EXTENDS: eight of the twenty amended `audit-cli-*` slugs sit inside
   `check-rulings-format.mjs`'s `ORIGINAL_TRUNCATED_SLUGS` exit ratchet**, which requires a real
   `- **Shape:**` line for any slug that has left the allowlist (`findExitRatchetProblems`, around
   `:209`; the population is declared at `:36`). Counted, not estimated. The eight:
   `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix`,
   `audit-cli-edge-https-forced-and-edge-hsts`, `audit-cli-admin-mount-shape-check`,
   `audit-cli-config-tidy-key-check-and-its-active-anthropic-probe`,
   `audit-cli-no-help-on-any-of-the-five-commands`, `audit-cli-config-csrf-disable-check`,
   `audit-cli-config-site-config-check`, `audit-cli-config-dependency-floors-check`. The allowlist
   (`check-rulings-format-allowlist.json`) holds exactly one slug, which is none of these, so none
   is excused. **An amendment that deletes, empties, or reflows a `Shape:` line goes red.**

2. **EXTENDS: two more one-line amendments the spec does not name**, both found by grep and both
   citing something the removal invalidates:
   - The entry whose prose cites **`check-probe.ts:49`** (around `docs/internal/engine-rulings.md:459`),
     a file 2a deleted. The claim it supports is about the probe's cookie-name derivation and is now
     history; the citation needs one line saying the file is gone with the doctor.
   - The entry whose `Reopens on:` reads "an evidenced same-origin flow where a compliant browser
     sends `Origin: null` that **the doctor's `config.no-referrer-blanket` check** cannot catch"
     (around `:601-603`). That check **survives, under `cairn doctor`**, so the reopening condition
     is still live and only its actor's name is wrong.

3. **EXTENDS: `audit-delivery-ai-crawlers` is doctor-touching and the spec's table misses it.** Its
   `Verdict:` and `Reopens on:` both cite `doctor/check-posture.ts` as an internal consumer of
   `AI_CRAWLERS`, and its sibling `CONTENT_SIGNAL` in `src/lib/delivery/robots.ts` is named in the
   same verdict. 2a's Task 4 ruled on whether `CONTENT_SIGNAL` keeps its `export`; this entry gets a
   **progress note** recording what that ruling was. Its verdict (`retire`, executed) does not
   change, and its `Shape:` line is not touched.

4. **EXTENDS: `CHANGELOG.md`'s doctor references need `cairn[- ]doctor`, not `cairn-doctor`.** The
   migration `0004` entry writes **`npx cairn doctor`**, with a space, so a hyphen-only grep misses
   the single most important entry in the reconciliation. Verified: ten matches in the `##
   Unreleased` window for `cairn[- ]doctor`.

5. **EXTENDS: the `cairn-doctor --fix` entry (around `:1181`) belongs on the disposition list.** It
   is inside the `## Unreleased` window and records a ledger `retire` of a proposed `--fix` mode
   against a command that is leaving. The spec's list of seven entries omits it.

6. **CONTRADICTS: migration `0004`'s replacement command does not prove what the old one did.** The
   entry currently says `npx cairn doctor`'s `auth.store` check fails when the `nonce_hash` column
   is absent. The replacement is
   `npx wrangler d1 migrations list <AUTH_DB> --remote`, and it is **valid only after** the
   migrations copy step the same `Consumers must:` line already names
   (`cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/`), since the
   command reads the local migrations directory against D1's ledger. It also **reads D1's migrations
   ledger, not the column**: a site that hand-ran the SQL sees `0004` reported unapplied, and
   re-applying it errors with a duplicate-column failure. **The entry must say so**, or it replaces
   a working check with a trap.

7. **EXTENDS: `docs/internal/record/2026-09-21-site-upgrade-brief.md` carries four doctor
   mentions** and is an internal record no published-arm gate reaches, so nothing in 2a corrected
   it. It belongs in a task's Files with its own criterion, not only in a coverage table.

8. **EXTENDS: cairn-pub is a fifth consumer, and it breaks twice.** Its hardcoded
   `/docs/reference/doctor` link (`src/routes/(site)/docs/+page.svelte:67` in that repo) breaks at
   its pin bump, and its `docs/STATUS.md` scripts the doctor in gate prose. **This pass never edits
   another repo**; ROADMAP files **both**, not just the link.

9. **EXTENDS: the "Consumers must:" survey reaches four wrangler configs, three adapter comments,
   one installed skill copy, and one build step.** Each carries a verb, not just a mention:
   `account_id` **stays** in ecxc-ski, 907-life, and aksailingclub-org's `wrangler.toml` and
   xcathletes-org's `wrangler.jsonc`; only the **comment** that justifies it by the doctor's D1
   check is reworded. The three adapter comments likewise. Every site runs `npx cairn-manifest`
   once and commits `src/content/.cairn/site-facts.json`, because an absent file only warns while a
   stale one fails the build. aksailingclub-org runs `cairn-guidance install` to refresh installed
   skill copies still naming `cairn-doctor --fix`.

---

## Header

| Field | Value |
| --- | --- |
| **Goal** | The record catches up with the removal: the `## Unreleased` window stops describing a doctor that gains features, the ledger carries one entry per ruled item and a disposition for every affected `audit-cli-*` entry, ROADMAP carries what was deferred, and `docs/STATUS.md` gains the one line saying the `0.97.0` cut is unblocked. |
| **Spec** | `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, the "retire-2" section's `## Unreleased`, Ledger, and Close subsections. |
| **Preconditions (all four, verified by the conductor before branching)** | (1) **retire-2a is merged to `main`** with CI green on the merge SHA; (2) `git ls-tree origin/main src/lib/doctor` prints nothing; (3) the `tool/v1.1.0` tag and its GitHub release exist on origin, and `origin/main` descends from the tagged commit (`git merge-base --is-ancestor tool/v1.1.0^{commit} origin/main`); (4) draft docs pass A is merged, so `docs/reference/cli-cairn-doctor.md` exists. |
| **Branch and worktree** | Branch `doctor-records`, cut off **retire-2a's merge commit on `origin/main`**. Worktree `.claude/worktrees/doctor-records`. **No `npm install` in `examples/showcase` is needed**: no task in this pass builds or renders the showcase. |
| **Token ceiling** | **1.0M**. The 80 percent decision point is **800K**, checked at each segment boundary, the only place a decision can land. Sized as the prose remainder of the undivided retire-2, whose 3.2M a reviewer judged to carry no slack; 2a takes 2.6M, so the split adds 400K of headroom rather than dividing a number that had none. |
| **Checkpoint interval** | Two tasks, plus a STATUS-shaped write at every segment boundary. |
| **Execution mode** | Four tasks. The plan marks Tasks 2 and 3 independent, which is the opt-in for `~/.claude/workflows/pass-execute.js`'s parallel mode. Per-task chain: `cairn-implementer` (`model: sonnet`), then `diff-reviewer` (`model: claude-opus-5`), then the task's gate **inside the chain**. One re-dispatch on a `fix` verdict; a second `fix` is the conductor's decision. Task 4 is the fold agent, not an implementer. |
| **Parallelism** | **Tasks 2 and 3 are independent**: `CHANGELOG.md` against `docs/internal/engine-rulings.md` plus `ROADMAP.md`, disjoint files, disjoint gates (`check:version` against `check:rulings-format`), and neither reads the other's output. Task 1 is serialized before them only because it settles what the removal's record says; Task 4 is serialized after all three. |
| **Segments** | Two, each ending on a gate-green commit. **A:** 1, 2, 3. **B:** 4. Three tasks in Segment A is inside the three-to-four cap, and no task here is irreversible before the merge. |
| **Merge** | By PR into `main`. Before the PR, `git merge origin/main` into `doctor-records` and re-gate; `docs/STATUS.md` is the expected conflict. |

### The gate, and the lane claim proven per task

Gates run through `cairn-run-gate '<command string>'`. **On exit 75, re-issue the same command
unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints before
the next dispatch.

**The lane is read from `cairn-run-gate`'s OWN environment, not from the quoted command string.**
Write a light gate as `CAIRN_GATE_LANE=light cairn-run-gate '<string>'`, with the assignment
**outside** the quotes. An assignment inside the string sets it for the inner shell only, and the
gate takes the heavy lock anyway.

**What makes a gate heavy is `npm test`**, which runs the vitest `component` project with
`browser.enabled` and a headless Chromium instance. The lane claim per task:

| Task | Gate contains `npm test`? | Lane |
| --- | --- | --- |
| 1, facts and arm index | No. `check:facts`, `check:docs`, `check:arm-indexes`, `check:vale` are node or Vale processes. | **light** |
| 2, the changelog window | No. `check:version`, `check:docs`, `check:symbols`, `check:vale`. | **light** |
| 3, the ledger and ROADMAP | No. `check:rulings-format`, `check:docs`, `check:vale`. | **light** |
| 4, the close, pre-merge | No. The same three light gates over the close's own files. | **light** |
| 4, the close, **post-merge re-gate** | **Yes.** The full list includes `npm test`. | **heavy** |

**That last row is the pass's one heavy gate, and it is unavoidable**: the merge from `main` pulls
in whatever else landed, and a records pass that skipped the full list would be trusting CI alone on
a merge it authored. It runs once, at Task 4, under the heavy lock.

**One full gate at a time**, this pass's and any other session's: the runner is cgroup-capped at 8G.
The light lane takes its own lock and a 3G cap, so Tasks 1 through 3 never queue behind another
session's browser gate.

**The full gate list for the post-merge re-gate** is retire-2a's list plus the two gates this pass's
files answer to: `check:version` (the changelog window) and `check:rulings-format` (the ledger).
`check:cairn` and `format:check` do **not** exist at the repo root and are written
`npm --prefix examples/showcase run <name>`.

**Sequencing, mandatory.** `npm test`, `check:custom-surface`, and `check:consumers` all repackage
`dist`, so they run strictly sequentially, never concurrently with each other.

### The conductor's rules

- **The conductor never reads a source file, a diff, a test log, or a gate transcript during
  execution.** It consumes each implementer's report and each `diff-reviewer` verdict.
- **Before each dispatch, the live-executor sweep.** `git -C <path> status --porcelain` is empty for
  every entry `git worktree list` reports except `doctor-records` itself; `pgrep -f
  .claude/worktrees/doctor-records` returns nothing.
- **One executor per worktree.** No docs pass and no site pass shares `doctor-records`.

### Releases

**This pass does not cut `0.97.0` and does not bump a version.** It finalizes the `CHANGELOG.md`
entry under `## Unreleased`, leaves `package.json`'s `version` untouched, runs no `npm version`, no
`gh release create`, and no publish. The cut is a later, separate act that **this pass's close
unblocks**.

### Halts

Stop, write STATUS, and ask one combined question on any of these.

- **`check:rulings-format` red on the exit ratchet.** A `missing-shape` problem means an amendment
  removed a `Shape:` line the ratchet requires. That is a correctness failure, not a formatting
  nit.
- Any red gate that a single fix round does not clear. A second `fix` verdict is the conductor's
  decision.
- Another session holding `main` that has not acknowledged the handoff before the STATUS write.
- The 80 percent ceiling flag tripping at a segment boundary.

### Pass-end reviewer fan-out

**None of the four domain reviewers runs.** The pass changes no code: no `.svelte`, no `.ts` under
`src/lib`, no Worker code, no auth or CSRF surface, no markup, no class, no token. A Svelte,
DaisyUI/a11y, Workers, or auth-security lens over a changelog entry and a ledger has no finding
available to it. **`code-simplifier` does not run either**, for the same reason: there is no changed
code to refine. The quality gate here is the per-task `diff-reviewer` and the prose gates
(`check:vale`, `check:docs`, `check:rulings-format`, `check:version`).

The one judgment worth an independent read is **whether the close's STATUS line is true**, and that
is Task 4's own `diff-reviewer` read against the criteria in its block.

---

## Task table

| Task | Runs as | Segment | Independent of | Contended resource when serialized |
| --- | --- | --- | --- | --- |
| 1, facts additions and the arm-index re-sourcing | implementer chain, light | A | nothing | `docs/internal/facts/**`, which 2a's Task 2 repaired; this task adds to the repaired file |
| 2, the `## Unreleased` window | implementer chain, light | A | **3** | `CHANGELOG.md` only |
| 3, the ledger and ROADMAP | implementer chain, light | A | **2** | `docs/internal/engine-rulings.md` and `ROADMAP.md` only |
| 4, the close | fold agent, then one `diff-reviewer` | B | nothing | `docs/STATUS.md` on `main`, possibly held by another session |

---

## Task 1: facts additions and the arm-index re-sourcing

**Runs as:** `cairn-implementer` chain, `model: sonnet`. **Light lane** (no `npm test`).

**Files.** `docs/internal/facts/admin.md`, `docs/internal/facts/extend.md`,
`docs/internal/facts/reference.md`, `docs/internal/record/2026-09-21-site-upgrade-brief.md`.
**Re-find every bullet by content: 2a's Task 2 rewrote all three container files and 2a's Task 6
rewrote the pages they point at.**

**Deliverable count: 3** (the additions, the arm-index re-sourcing, the upgrade brief). Under four.

**Outcome.** The facts container records what the retirement changed, every arm-index bullet
resolves against the pages as 2a left them, and the site upgrade brief no longer tells a site
operator to run a command that does not exist.

**Constraints.**

- **This task ADDS; 2a's Task 2 already repaired.** It does not re-litigate a bullet 2a deleted or
  re-sourced. If it finds a surviving `src/lib/doctor` pointer, that is a 2a escape and it reports
  it as such before fixing it.
- **The additions the spec names**: bullets in `admin.md`, `extend.md`, and `reference.md` recording
  the removal (the bin and the directory), the replaced verification steps 2a's Task 6 wrote, and
  `site-facts.json` as new engine surface. **The `site-facts.json` bullet may already exist from the
  pre-task**; the task checks and does not duplicate it.
- **The arm-index bullets are re-sourced, not deleted.** `reference.md`'s bullets assert that
  `docs/reference/README.md` names `doctor.md` among the admin-serving pages and among the
  subpath-less pages, and both **counts** changed when 2a deleted the page and its three mentions.
  The bullets are re-sourced to the new line ranges and the new counts, each verified by reading the
  file.
- **The format is the container's own** (`docs/internal/facts/README.md`): one claim, a `Source:`
  resolving to `path:line`, exactly one status tag, tag last. A bullet whose truth this task cannot
  establish gets a `[candidate: ...]` tag, never a `[verified]` it did not earn.
- **A restated bullet's `Source:` points at engine-side committed source**
  (`src/lib/diagnostics/conditions.ts`, the pre-task's generated mirror, or the spec), **not into
  `tool/internal/doctor/`**, which would couple an engine gate to another module's file layout. If
  one genuinely must, the task uses it and **records the coupling in its report**, naming the bullet
  and why no engine-side source carries the claim.
- **The site upgrade brief is corrected, not deleted** (pre-flight finding 7). Its four doctor
  mentions currently instruct a reader to run `npx cairn-doctor --from ... --repo ...` against a bin
  target `./dist/doctor/bin.js` that no longer ships. Each is rewritten to `cairn doctor` with the
  install pointer, or removed if the surrounding step no longer applies. It is an internal record,
  so no published-arm gate reaches it: **this criterion is the only thing that catches it.**

**Acceptance criteria.**

- `grep -rn 'src/lib/doctor\|cairn-doctor' docs/internal/facts/` returns nothing, and the report
  states whether anything was found (a 2a escape) or the files were already clean.
- **The upgrade brief is clean**: `grep -n 'cairn-doctor\|dist/doctor' docs/internal/record/2026-09-21-site-upgrade-brief.md`
  returns nothing, and the report quotes each of the four rewritten or removed passages.
- `npm run check:facts` green. Command:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts && npm run check:docs && npm run check:arm-indexes && npm run check:vale'`.
- **The added bullets are listed by name with their `Source:` pointers**, and the report states for
  each that the pointer resolves; `check:facts` re-resolves them mechanically on the same run.
- The arm-index bullets carry the **new** counts, and the report gives the old and new number for
  each, taken from reading `docs/reference/README.md`.
- No bullet gained a `[verified]` tag without a pointer the task resolved by reading the file.

**Implementer's report shape.** Files touched; the added bullets with their pointers; the
arm-index bullets with old and new counts; the four upgrade-brief passages quoted before and after;
any bullet that had to point into `tool/`, with the coupling stated; the gate result; decisions the
plan did not cover; anything it could not do.

---

## Task 2: the `## Unreleased` window

**Runs as:** `cairn-implementer` chain, `model: sonnet`. **Light lane** (no `npm test`).
**Independent of Task 3.**

**Files.** `CHANGELOG.md` only, inside the `## Unreleased` window (from `## Unreleased` down to, and
excluding, `## 0.96.0`).

**Line numbers below are a starting point. Re-find every entry by content**, and use
**`grep -n 'cairn[- ]doctor' CHANGELOG.md`**, never a hyphen-only grep: the migration `0004` entry
writes `npx cairn doctor` with a space (pre-flight finding 4).

**Deliverable count: 2** (the reconciliations, the removal entry). Under four.

**Outcome.** The `0.97.0` notes do not say the doctor both gains features and leaves. One removal
entry carries the whole story and its `Consumers must:` line.

**Constraints.**

- **The disposition list, nine entries, each re-found by content:**
  - **Migration `0004`'s `Consumers must:`** (around `:2251`), which tells operators to run the
    `auth.store` check before deploy. Rewritten per the next constraint.
  - **The four-status vocabulary and exit code 3** (around `:1401` through `:1427`, including its
    own `Consumers must:` line), **the probe changes** (around `:2169` and `:2326`): all fold into
    the removal entry as superseded.
  - **The `cairn-doctor --fix` entry** (around `:1181`, pre-flight finding 5), which records a
    ledger `retire` of a proposed `--fix` mode: folded as superseded, since the command it would
    have modified is gone.
  - **Two actor rewords** (around `:185` and `:251`) to `cairn doctor`.
  - **The site-config path entry** (around `:332-337`), repointed to the scaffolder's path file,
    since the engine's copy left with the directory in 2a.
  - **The transcript claim** (around `:509-517`) that transcript `03` stays, which is now false.
    Note that `01` and `01d` also did **not** change, contrary to what an earlier reading assumed;
    the corrected claim is that `02` and `03` left and one new `cairn doctor` capture arrived.
- **Migration `0004`'s replacement is written with its two caveats, or not at all**
  (pre-flight finding 6). The replacement command is
  `npx wrangler d1 migrations list <AUTH_DB> --remote`, and the entry must state:
  - it is valid **only after** the copy step the same line already names
    (`cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/`), because the
    command compares the local migrations directory against D1's ledger;
  - it reads **D1's migrations ledger, not the `nonce_hash` column**, so a site that hand-ran the
    SQL sees `0004` reported unapplied, and re-applying it fails with a duplicate-column error.

  **The criterion quotes the rewritten line**, so the caveats are provable rather than assumed.
- **The removal entry's `Consumers must:` list**, verbatim in substance: install `cairn`; replace
  `npx cairn-doctor` with `cairn doctor`; test for a nonzero exit; build once on `0.97.0` so
  `site-facts.json` exists; expect no App probe, no tidy-key check, no login probe, no D1 checks,
  and no send re-run.
- **The entry states what the survey found** (pre-flight finding 9), with the verb each consumer
  owes: no site scripts the doctor; **`account_id` STAYS** in the four wrangler configs
  (ecxc-ski, 907-life, aksailingclub-org `wrangler.toml`; xcathletes-org `wrangler.jsonc`) and only
  the comment justifying it by the doctor's D1 check is reworded, as are three adapter comments;
  every site runs `npx cairn-manifest` once and commits `src/content/.cairn/site-facts.json`,
  because an absent file only warns while a stale one fails the build; aksailingclub-org runs
  `cairn-guidance install` to refresh installed skill copies still naming `cairn-doctor --fix`;
  site plan history is left alone.
- **cairn-pub is named as a fifth consumer** with both of its breakages (pre-flight finding 8): a
  hardcoded `/docs/reference/doctor` link that breaks at its pin bump, and a `docs/STATUS.md` that
  scripts the doctor in gate prose. **This pass never edits another repo**; Task 3 files both to
  ROADMAP.
- **No version is set and no heading moves.** `check:version` enforces the `release-size` marker
  against the window, and the number is set at the cut, not here.
- **A fold, not a deletion.** A superseded entry's substance survives inside the removal entry; the
  window must still let a reader reconstruct what happened across the whole `0.96.0`-to-`0.97.0`
  span.
- **The past-version entries below `## 0.96.0` are not touched.** Their links to
  `docs/reference/doctor.md` are what 2a's `LEGACY_PATH_MAP` entry exists to keep green, and editing
  them would falsify a shipped record and break the map's third invariant.

**Acceptance criteria.**

- `npm run check:version` green. Command:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:version && npm run check:docs && npm run check:symbols && npm run check:vale'`.
- **Every surviving in-window doctor mention is accounted for**:
  `awk '/^## 0\.96\.0/{exit} {print NR": "$0}' CHANGELOG.md | grep 'cairn[- ]doctor'` returns only
  lines inside the removal entry, each naming the retired command as history, and the report
  enumerates them.
- **The rewritten `0004` line is quoted verbatim in the report** and carries both caveats: the
  copy-step ordering, and the ledger-not-column reading with its duplicate-column consequence.
- The removal entry carries a `Consumers must:` line with all five clauses.
- The entry names cairn-pub with **both** breakages.
- No entry in the window still asserts that the doctor gains a feature at `0.97.0`.
- `git diff --stat package.json` is empty, and
  `git diff --stat -- docs/internal/engine-rulings.md ROADMAP.md` is empty (Task 3 owns both).
- The diff touches no line below `## 0.96.0`:
  `git diff -U0 -- CHANGELOG.md` shows no hunk starting past that heading's line.

**Implementer's report shape.** Files touched; one line per reconciled entry with its line as
re-found by content and its disposition; the rewritten `0004` line verbatim; the removal entry's
`Consumers must:` list verbatim; the gate result; decisions the plan did not cover; anything it
could not do.

---

## Task 3: the ledger and ROADMAP

**Runs as:** `cairn-implementer` chain, `model: sonnet`. **Light lane** (no `npm test`).
**Independent of Task 2.**

**Files.** `docs/internal/engine-rulings.md`, `ROADMAP.md`. **`scripts/checks/check-rulings-format.mjs`
is NOT edited** (see the constraint below).

**Deliverable count: 3** (the nine new entries, the twenty-three amendments, the ROADMAP lines).
Under four by count; **large by volume, so size the dispatch accordingly.**

**Outcome.** Every ruled item of the spec has its entry, every affected `audit-cli-*` entry is
closed, amended, or given a progress note **by name**, and `ROADMAP.md` carries what this pass
deferred and drops what it shipped.

**Constraints.**

- **The format is the ledger's own** (`engine-rulings.md:8-22`): a heading plus labeled lines, with
  `Verdict:`, `Reopens on:`, `Record:`, and, **on every reshape and retire entry, a `Shape:` line of
  its own**, never a parenthetical folded into `Reopens on:`. `check:rulings-format` gates it.
- **The exit ratchet, the constraint that governs every amendment** (pre-flight finding 1). Eight of
  the amended slugs are in `ORIGINAL_TRUNCATED_SLUGS` and are not on the allowlist, so each must
  carry a real `- **Shape:**` line. **No amendment deletes, empties, or reflows a `Shape:` line.**
  A superseded shape **keeps its text** and gains **one sentence** saying it will not be executed
  and why. Rewriting the shape to describe the new reality loses the record of what was once
  planned, which is the file's point.
- **`scripts/checks/check-rulings-format.mjs` is left untouched.** Its `ORIGINAL_TRUNCATED_SLUGS` is
  a fixed historical population, not a list this pass curates, and its allowlist gains no entry: an
  allowlist addition would excuse exactly the check this constraint exists to satisfy.
- **Nine new entries**, one per ruled item: the retirement; `github.app` dropped (substitute: the
  `github.unreachable` runtime event; gap: a never-published site); `config.tidy-key` dropped
  (ground: it false-fails a correctly deployed site whose key is a Worker secret the CLI cannot
  see); the login-envelope probe dropped; the workers.dev exposure arm deferred; the send re-run
  deferred; the three D1 reads deferred; the `config.site-config` narrowing; `site-facts.json` as
  new engine surface.
- **Every `Reopens on:` is falsifiable, naming an observation, not a mood.** Specifically:
  - **Each drop** (`github.app`, `config.tidy-key`, the login-envelope probe) reopens on **a
    recorded incident where the substitute signal arrived only at the first publish, the first
    tidy, or the first sign-in** — that is, the check's absence cost a real operator real time,
    written down.
  - **Each deferral** (the three D1 reads, the send re-run, the workers.dev exposure arm) reopens
    when **the tool gains the credentialed read filed beside the agent-permission check**, which is
    where the write-credential question is ruled. Not "when we get around to it".
- **Twenty-three amendments by name**, the spec's twenty plus pre-flight findings 2 and 3:
  - The twenty `audit-cli-*` entries, each with its disposition. Two need care:
    **`audit-cli-config-tidy-key-check-and-its-active-anthropic-probe`** is an **open** reshape with
    a live `Shape:` line describing work that will now never be done. It is **closed**, its `Shape:`
    text is kept and gains the one explanatory sentence, and its `Reopens on:` says what would
    reopen **the check itself**, not the reshape. And
    **`audit-cli-cairn-media-seed-bucket-and-the-wrangler-r2-buckets-resoluti`** cites
    `bin.ts:12 imports readR2Buckets from ../doctor/wrangler-config.js` in **both** its `Verdict:`
    and its `Any-site case:` lines; both are corrected to the `src/lib/media-seed/` path 2a's Task 3
    created. The verdict stays `keep`; only the evidence's path was wrong.
  - **The entry citing `check-probe.ts:49`** (around `:459`) gains one line saying the file left
    with the doctor and the claim is history.
  - **The entry reopening on "the doctor's `config.no-referrer-blanket` check"** (around `:601-603`)
    gains one line: the check **survives under `cairn doctor`**, so the reopening condition stands
    and only the actor's name changed.
  - **`audit-delivery-ai-crawlers`** gains a **progress note** recording 2a's `CONTENT_SIGNAL`
    export ruling, since its evidence cites `doctor/check-posture.ts` as a consumer of
    `CONTENT_SIGNAL` and `AI_CRAWLERS` in `src/lib/delivery/robots.ts`. Its verdict and `Shape:`
    line do not change.
- **`ROADMAP.md` lines**, in the tier where each bites: the three D1 reads, the send-test re-run,
  and the workers.dev exposure arm, filed **beside the agent-permission check**; the two unraised
  registry entries (`config.tidy-key-missing`, `admin.login-probe-failed`) filed for the docs
  rebuild; and **cairn-pub's two breakages** (the hardcoded `/docs/reference/doctor` link and the
  `docs/STATUS.md` gate prose that scripts the doctor), filed to cairn-pub.
- **ROADMAP is a pass dimension.** Any item this initiative **shipped** is removed from the live
  tiers, not merely marked. A roadmap that still lists shipped work is not done.
- **No entry is deleted from the ledger.** An entry is closed, amended, or annotated; the record of
  what was once ruled is the point of the file.

**Acceptance criteria.**

- `npm run check:rulings-format` green, **including the exit ratchet**. Command:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:rulings-format && npm run check:docs && npm run check:vale'`.
- **The `Shape:` count did not fall.** Record `grep -c '^- \*\*Shape:\*\*' docs/internal/engine-rulings.md`
  at the **segment-start SHA** and again at HEAD; the second number is not lower than the first.
  Command: `git show <segment-start-sha>:docs/internal/engine-rulings.md | grep -c '^- \*\*Shape:\*\*'`
  against `grep -c '^- \*\*Shape:\*\*' docs/internal/engine-rulings.md`. **Never `HEAD~`**: this
  task may land as more than one commit, and `HEAD~` would compare against the task's own midpoint.
- **`check-rulings-format.mjs` is untouched**: `git diff --stat <segment-start-sha> --
  scripts/checks/check-rulings-format.mjs` is empty, as is the same command against
  `scripts/checks/check-rulings-format-allowlist.json`.
- **Every slug is asserted by name, in a loop, not counted.** Command:
  ```
  for s in <the nine new slugs> <the twenty-three amended slugs>; do
    grep -q "^## $s" docs/internal/engine-rulings.md || echo "MISSING: $s"
  done
  ```
  It prints nothing. A `grep -c 'audit-cli-'` count is **not** an acceptable substitute: it passes
  when the right number of wrong slugs are present.
- **Each new entry's `Reopens on:` names an observation.** The report quotes all nine, and each
  either names a recorded incident at first publish / first tidy / first sign-in, or names the
  credentialed read filed beside the agent-permission check.
- `grep -n 'doctor/wrangler-config' docs/internal/engine-rulings.md` returns nothing.
- `ROADMAP.md` carries the seven filed items (three D1 reads as one or three lines, the send re-run,
  the workers.dev arm, the two unraised registry entries, cairn-pub's two breakages) and lists
  nothing this initiative shipped. The report enumerates both sides.

**Implementer's report shape.** Files touched; the nine new slugs with their `Reopens on:` lines
verbatim; the twenty-three amended slugs with one line of disposition each; the `Shape:` counts at
segment start and at HEAD; the ROADMAP lines with their tiers and anything removed; the gate result;
decisions the plan did not cover; anything it could not do.

---

## Task 4: the close

**Runs as:** **one fold agent**, which commits its own draft and then folds, followed by **one
independent `diff-reviewer` read (`model: claude-opus-5`) over the fold's diff**. Not an implementer
dispatch. The conductor reads the reviewer's verdict, not the diff.

**Files.** `docs/HISTORY.md`, `ROADMAP.md`, `docs/STATUS.md`, this plan file (the post-mortem),
`docs/internal/docs-friction-log.md`.

**It migrates nothing else.** No arm rewrite, no backlog reorganization beyond this initiative's own
items. A STATUS-to-HISTORY migration of unrelated history is a close-out chore only if this repo's
STATUS still carries history at this point; if it does, it is done here, and if it does not, nothing
is invented.

**Order.**

1. **Friction-log triage** on `docs/internal/docs-friction-log.md`, complete-or-move: fixed and
   deleted, promoted to the `ROADMAP.md` tier where it bites, or deleted as no longer true after
   verifying against the code.
2. **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate caught,
   and **what a later pass would be wrong to rediscover from scratch**. That last clause carries
   this pass's real lessons: that the ledger's exit ratchet makes a `Shape:` line load-bearing so an
   amendment adds a sentence rather than rewriting one; that the migration `0004` replacement reads
   D1's ledger rather than the column and needs both caveats stated; and that splitting the pass,
   not the tasks, is what brought the undivided nine back under the guideline.
3. **`ROADMAP.md`** reconciled: this initiative's shipped items removed from the live tiers, Task 3's
   filed items confirmed present.
4. **`git merge origin/main`** into `doctor-records`. `docs/STATUS.md` is the expected conflict.
5. **Re-gate after the merge with the FULL gate list**, sequentially where the sequencing rule
   applies. **This is the pass's one heavy-lane gate**, because the list contains `npm test`. Then
   open the PR and merge it on green CI.
6. **Message whichever session holds `main`** before the STATUS write. Confirm who holds it rather
   than assuming. Two conductors never both write STATUS on one branch.
7. **The STATUS line, written last and written once.** `docs/STATUS.md` gains, under its immediate
   next action, the single line **"the `0.97.0` cut is unblocked"**, naming **the `tool/v1.1.0`
   tag**, **retire-2a's merge SHA**, and **this pass's merge SHA**. Both SHAs, because the cut's own
   precondition reads both halves: the removal on `main`, and the record that describes it. **This
   close is the only writer of that line**; 2a's close said only that the doctor is removed and the
   records pass is pending, and B2's close said only that the tool's 1.0 is merged, tagged, and
   released. The line **replaces** 2a's "records pass pending" line rather than sitting beside it.
8. **The post-mortem** appended to this plan file, with both budget scores: tokens against the 1.0M
   ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).
   **Score the split itself**: whether 2a plus 2b came in under the undivided 3.2M, which is the
   evidence the sizing rule earns or loses.

**Acceptance criteria.**

- The PR is merged and CI on `main` is fully green on the exact merge SHA. Command:
  `gh run list --commit "$(git rev-parse origin/main)" --json workflowName,conclusion,status`. An
  absent run counts as red.
- `docs/STATUS.md` is at or under 60 lines, present tense, and carries the unblock line exactly
  once. Commands: `wc -l docs/STATUS.md`; `grep -c '0.97.0 cut is unblocked' docs/STATUS.md`
  returns 1.
- **The superseded 2a line is gone**: `grep -c 'records pass pending' docs/STATUS.md` returns 0.
- The unblock line names the tag and **both** merge SHAs, and all three resolve:
  `git rev-parse tool/v1.1.0`, and `git cat-file -t <sha>` for each SHA.
- **The cut's own two preconditions hold on `main`**: `git ls-tree origin/main src/lib/doctor`
  prints nothing, and `node -p "Object.keys(require('./package.json').bin)"` at `origin/main` shows
  no `cairn-doctor`.
- **The record matches the removal**: the removal entry's `Consumers must:` line is present in
  `CHANGELOG.md` on `main` under `## Unreleased`, and `npm run check:rulings-format` is green on
  `main`.
- `docs/HISTORY.md` has this pass's entry, newest first, carrying the rediscovery clause.
- The friction log's triage is complete-or-move, with every entry either gone or promoted.
- The `diff-reviewer` read over the fold's diff returns accept.
- `git diff --stat package.json` shows no `version` change, and `git tag --points-at HEAD` is empty.

**Halt:** a red gate after the merge; a merge conflict in anything other than `docs/STATUS.md`,
`docs/HISTORY.md`, or `ROADMAP.md`; or another session holding `main` that has not acknowledged the
handoff.

---

## Sizing

**Four tasks in two segments, well inside the eight-task guideline**, because this pass is the
second half of a split rather than a pass that grew. The undivided retire-2 ran nine tasks at a
3.2M ceiling a reviewer judged to have no slack; splitting at the removal boundary put six plus a
close in 2a at 2.6M and four here at 1.0M.

**Why the split lands here and not elsewhere.** 2a ends on a commit where every gate is green and
the doctor is gone from source, scaffolder, and published docs. What `main` lacks at that moment is
the record, and the record is the cut's precondition: the cut reads the `Consumers must:` line and
the STATUS line, both of which live in this pass. **That is also why 2b is not optional and not
deferrable**: leaving `main` with the doctor removed and a changelog window that describes it as
present is the exact incoherence Task 2 exists to fix.

**No task here is flagged.** The largest by volume is Task 3, at three deliverables spanning
thirty-two ledger entries plus ROADMAP; it is sized by volume in its own block, and its criteria
assert every slug by name rather than by count, which is what makes a high-volume prose task
provable.

---

## Spec coverage

Every retire-2 requirement this half carries, mapped to its task. **Requirements marked "2a" are
carried by [`2026-09-21-doctor-retire-2-engine.md`](2026-09-21-doctor-retire-2-engine.md); between
the two plans every retire-2 spec requirement maps to exactly one task.**

| Spec requirement (retire-2 section) | Task |
| --- | --- |
| Facts bullets in `admin.md`, `extend.md`, `reference.md` (the additions) | 1 |
| The arm-index bullets re-sourced after the page deletion (pre-flight; not in the spec) | 1 |
| The site upgrade brief's four mentions corrected | 1 |
| The `## Unreleased` reconciliation, the named entries plus `cairn-doctor --fix` | 2 |
| Migration `0004`'s `Consumers must:` rewritten to `wrangler d1 migrations list`, with its two caveats | 2 |
| The removal entry's `Consumers must:` list: install `cairn`, replace the command, test for nonzero exit, build once, expect no App probe / tidy-key check / login probe / D1 checks / send re-run | 2 |
| The entry states the survey: no site scripts the doctor; four wrangler configs keep `account_id` with reworded comments; three adapter comments; one `cairn-guidance install`; site plan history left alone | 2 |
| cairn-pub's hardcoded `/docs/reference/doctor` link filed (and its `docs/STATUS.md` gate prose) | 2 (named), 3 (filed) |
| Ledger: one entry per ruled item, with `Reopens on:` and a `Shape:` line where the verdict requires it | 3 |
| Each affected `audit-cli-*` entry closed, amended, or noted **by name**, including the open tidy-key reshape and the media-seed import-path entry | 3 |
| `check:rulings-format` joins the gate list | 3 (and the close's full list) |
| ROADMAP: the deferred checks beside the agent-permission check, the two unraised registry entries, the cairn-pub items | 3 |
| Close: HISTORY, ROADMAP, then the STATUS unblock line naming the tag and the merge SHAs, after messaging whichever session holds `main` | 4 |
| The removal, the scaffolder, the published docs, the gates, the facts repair | 2a |

| Spec acceptance bullet ("Pre-task and retire-2") | Task |
| --- | --- |
| `check:tool-conditions` goes red on a hand-edited mirror | pre-task (precondition) |
| A build with a changed adapter and a stale `site-facts.json` fails | pre-task (precondition) |
| The removal predicate grep is empty | 2a |
| The built `cairn-media-seed` bin reads R2 buckets | 2a |
| Every gate in the list is green | 4 (the post-merge full-list run) |
| The ledger entries pass `check:rulings-format` | 3 |
| The facts bullets exist | 1 |
| The `Consumers must:` line exists | 2 |
| The ROADMAP entries exist | 3 |
| No published-arm page instructs a reader to run a command or flag that does not exist | 2a |
| STATUS carries the unblock line, written once, by retire-2's close | 4 |

---

## Post-mortem

Written at pass end by the fold agent. Both budget scores: tokens against the 1.0M ceiling
(`/cost`), and attended time as two counts (planning misses, execution sittings). Add the split's
own score: 2a's spend plus this pass's, against the undivided pass's 3.2M ceiling. Record the
numbers even when they look bad; the trend is the signal.

Written by the fold agent at the close (2026-09-22).

**Token budget.** Subagent spend through Segment A is about 2.2M if each reported figure is
incremental, or about 1.2M if a resumed agent's figure is cumulative; the reports cannot tell the
two apart. Either reading tripped the 800K flag at the Segment A boundary. Geoff raised the
ceiling to about 3.1M there and added the ROADMAP sweep to the close. The close's own fold and
its `diff-reviewer` read land on top, and the conductor adds that figure after the merge. Against
the original 1.0M ceiling, Segment A alone ran 120 to 220 percent.

**The split's score.** retire-2a finished at about 3.2M against its 2.6M ceiling (its
post-mortem). 2a plus 2b through Segment A is therefore about 4.4M to 5.4M before the close,
against the undivided pass's 3.2M: 138 to 169 percent. **The split did not come in under the
undivided ceiling.** It earned its task-count case (nine tasks became seven plus four, each under
the eight-task guideline, and each half ended on a gate-green commit), but it lost on tokens. The
undivided 3.2M, judged to carry no slack, was an underestimate, and splitting added a second close
and a second pre-flight rather than saving either. The sizing rule's evidence here: splitting a
pass does not shrink its token cost, and a split's two ceilings should sum to more than the
undivided figure, not re-divide it.

**Attended time.** Zero planning misses, two execution sittings.

- Execution sitting 1: two status questions Geoff asked mid-pass, answered in one pull-in.
- Execution sitting 2: one combined budget question at the Segment A boundary, which Geoff
  answered by raising the ceiling to about 3.1M and adding the ROADMAP sweep.
- No planning miss surfaced as an ambiguity after approval. One plan defect a pre-flight would
  have caught: the zero-hit grep criteria in Tasks 1 and 2 conflicted with the plan's own removal
  and reword requirements, since a record that must name the retired command as history cannot
  also grep clean for it. The implementers and reviewers read the criteria as "returns only these
  lines", which is how such a criterion should be written.

**Conductor decisions.**

- Task 2 ran a third round after a second `fix` verdict, on the conductor's call. One of the four
  findings in the rounds was the reviewer's own round-one error; the third round checked the
  carry-over claim against history at `8d042158^`.
- Task 1's scope extension to `docs/extend/migration-notes.md` was accepted.
- The plan's reviewer model string `claude-opus-5` is invalid for the Agent tool, which accepts
  `opus`; the conductor dispatched with `opus`.

**What was built.** The `## Unreleased` window carries one removal entry with its `Consumers
must:` line; the ledger has its retirement entries and amendments by name, with the `Shape:` count
rising from 87 to 91; the facts container records the removal. ROADMAP no longer names the retired
npm doctor as the actor of any proposal. `docs/STATUS.md` reads present tense at 56 lines, with
the checkpoint moved to `docs/HISTORY.md`.

**What the close did beyond the plan's list.**

- The carried polish reached two more tool contract pages (`cli-cairn-json-output.md`,
  `cli-cairn-exit-codes.md`) that named 1.0.1 as current, the same defect as the one the reviewer
  flagged on `cli-cairn-doctor.md`.
- The ROADMAP reconciliation removed the shipped `check:tool-heuristics` sub-bullet and found that
  no CI workflow runs that gate, filed to Next.
- The `tool/v1.1.0` release detail, which lived only in STATUS, moved to its own HISTORY entry.

**Blockers.** None at the fold. The post-merge re-gate result is recorded in the fold's report to
the conductor, and the unblock line is the conductor's to write after the merge.
