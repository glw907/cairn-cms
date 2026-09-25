# Docs reset pass 2a plan review: mechanics and feasibility lens

**Target:** `docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` at `9f112c92`, against the
spec `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md`. **Lens:** does every
mechanism the plan relies on behave as stated. Each claim below was checked against source or by
a probe, run read-only from the main checkout (probe outputs are in the reviewer's scratchpad).

**Counts:** 0 blocker, 4 major, 9 minor.

## Major

### M1. A judge key joins only when its report path matches the scored path exactly

**Where:** plan:127-128 (Review focus 2), :306-313 (Task 4 acceptance), :329-341 (Task 5 steps 3
and 5), :351-356 (Task 5 preconditions and the verifier branch).

**Defect.** `buildCatchPacket` and `buildAdjudicatorPacket` write `key.report.path` exactly as
the caller gives it (`judge-packets.ts:717`). The scorer then keeps a join only when
`resolve(key.path) === readerJob.reportPath && key.runId === ... && key.attempt === ...`
(`lib/score-assemble.ts:232`). Round 1's committed keys record
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-1b/scripts/docs-readers/tuning/round1/reader-report.json`.

Probe: one `score.ts dev` rescore of round 1's committed inputs, run twice.

- With `--report` set to the main checkout's copy (byte-identical), it returns `ok: true` with
  24 notes. The notes read "traces to report ... but the indexed job's own source is ..." and "no
  catch-judge key and rulings joined". `onMapPlantRunRecall` comes out 0 of 8 against the committed
  1 of 8, and the scripter's 7 false findings come out 0. `byJob` does not match.
- With `--report` set to the 1b worktree path, it matches `score.json` field for field
  (`byJob`, `onMapRecall`, `onMapPlantRunRecall`), with no notes.

This has four consequences.

1. Task 4's round 1 rescore acceptance fails from the `docs-reset-2a` worktree as written. As a
   unit test it holds only on this machine while the 1b worktree exists.
2. Task 4's rehearsal passes on `ok: true`, and `ok` stays true when every join fails. The
   rehearsal can pass with nothing joined.
3. In Task 5, keys built from the cache `report.json` but scored against the `tuning/pilot-2a`
   copy, or the reverse, join nothing. Plant-run totals, per-job plant counts, and the control-run
   list all still pass. Only the "no note names a missing judge job" precondition catches it. Its
   prescribed remedy, rerunning the judge job, does not fix a path mismatch, so the pass pays for
   judge reruns that cannot help.
4. The verifier branch (plan:354-356) scores `report.reverified.json`, which `reverify.ts` writes
   beside the original. That is a new path and a new file hash, so every key must be rebuilt
   against it before scoring.

**Fold.**

- Task 5: every packet is built from the same absolute path the scoring command passes as
  `--report` (the worktree's `tuning/pilot-2a/<job>/reader-report.json`, copied first).
- Add a validity precondition: `score.json` `notes` is empty. Any trace note is fixed by rebuilding
  keys against the scored path, never by rerunning the judge.
- Task 4: the round 1 rescore either runs once with `--report` set to the 1b worktree path, as a
  recorded acceptance command rather than a unit test, or copies the keys to a temporary directory
  with `report.path` rewritten to the scored path.
- Rehearsal acceptance: `ok: true`, `notes: []`, and the expected nonzero `caught` and
  `pooledPrecision` counts.
- Any report substitution (reverify, a resumed batch) rebuilds its keys.
- Committed test fixtures (`fixtures/pilot-2a-judge/`) have their key paths rewritten at test time
  and never embed a worktree's absolute path.

### M2. `DISABLE_AUTOUPDATER` does not hold this host's CLI

**Where:** plan:166-167, :197-200, :209, :252, :324-326, :335-336, :495.

**Defect.** `which claude` resolves to
`/var/home/linuxbrew/.linuxbrew/Caskroom/claude-code@latest/2.1.282/claude`, a Homebrew cask. The
Claude Code setup docs (https://code.claude.com/docs/en/setup) say two things that apply:

- "Homebrew installations do not auto-update. Run `brew upgrade claude-code` or
  `brew upgrade claude-code@latest`..."
- "`DISABLE_AUTOUPDATER` only stops the background check."

So the setting holds nothing here. On this machine the update path is `uupd`: `uupd.timer` fires
daily (next run 2026-09-26 04:14 AKDT), and `uupd config-dump` shows the `brew` module with
`"disable": false`. `init-baseline.json`'s 2.1.282 note records that the host "drifted from 2.1.281
to 2.1.282 mid-pass" in pass 1b, and the dotfiles hold `4265aea` landed after that drift.

Task 0's acceptance "a new shell shows `DISABLE_AUTOUPDATER=1`" is also wrong. A settings.json `env`
entry reaches Claude Code processes, never a fresh terminal shell, and a running session does not
pick it up.

**Consequence.** An overnight `uupd` run between the smoke run and the last judge batch changes the
CLI version. The next batch then builds a new image and fails init as infrastructure. The plan
names this as a stop condition (plan:494-495), but the plan checks the version only at Task 2 and
Task 5 step 1, not before each of the seven runner batches.

**Fold.**

- Replace the hold with one that acts on Homebrew. Either suspend `uupd`'s brew module for the
  pass window (`/etc/uupd/config.json`, which the workstation rule routes through
  `~/.dotfiles/bluefin/etc/`), or stop `uupd.timer` (`sudo -A systemctl stop uupd.timer`, restarted
  at release). **OWNER FORK** on which, since both touch system update policy, not only dotfiles.
- Keep the dotfiles line only if Geoff wants it as belt-and-braces.
- Add `claude --version` in the pinned set as a precondition of every runner batch (smoke, five
  readers, two judge batches, and Task 3's live check).
- Fix Task 0's acceptance to check `uupd` state and `claude --version`.

### M3. The exemplar-id resolution rule misses three of six manifest sections

**Where:** plan:177-179 (pre-flight), :380-383 (Task 6 interface).

**Defect.** The rule resolves an id when the manifest holds a backticked `` `<slug>/` `` "inside
the section whose `Root:` line names `<dir>`". Only three of the six `##` sections carry a `Root:`
line: Editors (:22), Operators (:100), and Core (:290). The other three name their store
differently:

| Section | Where it names the store |
| --- | --- |
| Designers | "Captures live under ..." (:163) |
| Extenders | "Base path: ..." (:220) |
| Evaluators | "Local root: ..." (:359) |

A third slug form also exists that the pre-flight does not list: `` `designers/shopify-create-theme/` ``
and `` `core/rust-analyzer-architecture/` ``. The Designers section has no bare `` `<slug>/` ``
at all.

Probe: a bare-slug scan per `##` section. Editors, Operators, Extenders, and Evaluators match
their directories. Designers matches 0 of 8. Core matches 2 of 11, and both are false positives
(`templates/` and `tool/` from prose).

**Consequence.** As pinned, Task 7's schema test fails on every designer, extender, and evaluator
exemplar id. The alternative is that the implementer invents a rule mid-task, which is a planning
miss.

**Fold.** Pin the rule as follows. The section is the `## <Heading>`, mapped by lowercase heading
to `<dir>` (Editors to `editors`, and so on). An id resolves when the section holds
`` `<slug>/` `` or `` `<dir>/<slug>/` ``. Task 7's local capture-directory check stays the guard
against prose false positives. Add fixture-manifest cases for both slug forms and for a section
with no `Root:` line.

### M4. Runner commands carry no `cd <worktree>`, and the smoke fallback hides a wrong-prompt run

**Where:** plan:253 (Task 2 step 2), :256-257 (Task 2 step 3), :327-341 (Task 5 steps 2 to 5).

**Defect.** The plan pins `cd <worktree> &&` on gate calls only (plan:88-89). The runner, packet,
and scorer commands are written relative (`npx tsx scripts/docs-readers/run.ts ...`), and the
conductor's session runs from the main checkout. Run from `main`, the smoke batch uses the old
`REPORT_REQUEST` and `REPORT_SCHEMA`, with no `wrong`/`missing`, and verifies cleanly. Task 2 step 3
then says: "If the run filed no `wrong[]` or `missing[]` entry, it adds one of each". That turns an
old-code run into a fixture with synthetic entries, and the fixture is the cross-stage pin for
Tasks 3 and 4. The same applies to Task 5, where scoring from `main` refuses `pilot-2a-*` batch
names (`lib/score-integrity.ts:16`), and to Task 3's live check.

**Fold.**

- Every runner, `judge-packets.ts`, `reverify.ts`, and `score.ts` command in Tasks 2, 3, and 5
  starts with `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a &&`.
- Task 2 acceptance: every job in the smoke `report.json` carries `wrong` and `missing` keys.
  Arrays that are present but empty prove the new schema ran, since the new schema requires them.
- The synthetic-entry fallback applies only once that check passes.

## Minor

- **m1 (plan:21-22 against :339-341).** The spec's Scoring names
  `--plants scripts/docs-readers/fixtures/dev-plants.json`. The plan substitutes
  `tuning/pilot-2a/plants.json`, and the plan's own rule says "where this plan and the spec
  disagree, the spec wins; stop and report". The substitution is correct: `loadPlants` throws on
  P01 and P02 (`score.ts:202-209`, confirmed; the evaluator is not indexed). Record it as a
  sanctioned amendment, citing Review focus 1, so an executor following the precedence rule does
  not stop at Task 5.
- **m2 (plan:335-342).** The CLI release (step 4) comes before scoring (step 5), and a failed
  scoring precondition reruns a reader or judge job. That rerun would run unheld. Move the release
  to after the step 5 preconditions pass.
- **m3 (plan:331-333).** The packet `--out` location is unpinned. The runner requires `key.json`
  beside the packet (`run.ts` `checkJudgeKeyIntegrity`, `expectedItemsFromKey`), and an
  adjudicator packet holds a full exported `tree/`. Pin the packets under
  `~/.cache/docs-readers/packets/pilot-2a/{catch,adjudicator}/<id>/`, with keys copied to
  `tuning/pilot-2a/*-keys/<id>-key.json`, as round 1 did, so no packet tree lands in the repo.
- **m4 (plan:331-333).** Round 1 ran `harness-filter.ts` before adjudication
  (`tuning/round1/harness-filter-log.json`). The pilot's step 3 does not name it. Name the step, or
  record that it is skipped, so the precision bar's round 1 baseline of 7 compares like with like.
  The spec says the filter tolerates an item without `blockedBy`.
- **m5 (plan:197-200).** CR7's errata also need `~/.dotfiles/secrets/registry.md` updated. Its
  `CAIRN_SCRATCH_CF_TOKEN` entry says the token is "Deleted at docs reset pass 2a's close with the
  scratch site's teardown". Add that line to Task 0's dotfiles commit.
- **m6 (plan:373, :394, :418).** The render test's filename is unpinned. The gate filter
  `src/tests/unit/docs-audiences` runs it only if the name starts `docs-audiences-`. Pin
  `src/tests/unit/docs-audiences-render.test.ts`. Vitest exits 1 when a filter matches no file, so
  a mismatch fails loudly, but only after a gate round.
- **m7 (plan:441-446).** After Task 9 a rejected capture still "resolves", since the entry stays
  and gains a `Verdict: rejected` line. The schema-test rerun cannot catch a profile that cites a
  rejected exemplar. Add "an id whose entry carries `Verdict: rejected` fails" to Task 9's fold
  acceptance, or to the resolver.
- **m8 (plan:439-440, :516).** The 68 captures hold about 868 KB of `page.md` (about 220k tokens).
  One cold lens reading every page whole will not fit one context without compaction. Pin the read
  (for example, `meta.json` plus the structure the manifest entry cites, with the page opened only
  to check a claim), or split the lens by directory. The 0.7M row holds only under a pinned read.
- **m9 (plan:505-520).** The cost lines are plausible but sit at the floor.
  - Tasks 2 and 5 at 1.2M: 16 reader runs at 1b's measured 35k is 0.56M before reruns, and about
    eight agent dispatches (batch writers, sha check, packet builder, copier, scorer, the Opus
    record author, `diff-reviewer`) at 25k to 60k startup each, plus work. That projects about
    1.4M to 1.6M.
  - Task 4 at 1.0M is 1b's floor (0.96M), yet it carries the round 1 rescore, the five-report
    rehearsal with keys and rulings, and the catch fixture. 1b's scorer task cost 3.0M.
  - Neither breaks the ceiling on its own, and the plan already says the 12M flag is likely. The
    conditional verifier-fix chain (plan:354-356) is unpriced. Name it against the range.

## Verified as stated

- **The chain gate.** It ran green at `main` under `CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G
  CAIRN_GATE_MEMORY_HIGH=5G` (`gate exit: 0`, svelte-check 0 errors).
  - `cairn-run-gate`'s header confirms that per-call `CAIRN_GATE_MEMORY_*` values override the
    lane caps.
  - The filter `src/tests/unit/docs-readers` matches all 37 runner tests in the `unit` project,
    which includes `src/tests/unit/**`.
  - The 6G light cap beside another session's 8G heavy gate is about 14G of this machine's 15G.
    Keep the lane's gate from running while a runner batch is running.
- **The execution-mode claim.** Both workflows run `gate-tier.mjs`, and `SCRIPTS_GATE` ends in
  `npm test` (`gate-tier.mjs:51`). A `gateTier` pin makes the implementer run `TIER_GATES[pin]`,
  not the task's string (`pass-execute.js:188-193`, `gate-tier.mjs:138-143`). The only prefix is
  `CAIRN_GATE_LANE=light` (`:191`). "Neither can run" holds.
- **Batches.** `parseBatch` accepts `<job>-planted-2`, the same `prepared` on two jobs, and
  explicit judge ids. Each run copies its prepared tree into its own directory
  (`podman.ts:440-445`). Ids stay unique within each batch. `parseReaderJobId` reads index 2.
- **Planted pages.** All eight planted-page sha256 values in round 1's catch keys match the cached
  trees today.
- **The scratch site.** `GET /healthz` returns `{"ok":true,"checks":{"githubAppSigning":{"ok":true}}}`.
  `CAIRN_SCRATCH_CF_TOKEN` is present in `~/.local/secrets` (checked by name only).
- **The init baseline.** It records skills and plugins only, so it does not depend on the report
  schema. 2.1.280 to 2.1.282 are pinned.
- **Pre-flight line references.** `runner.ts:94`, `:128`, `:731-734`; `transcript.ts:705`, `:739`,
  `:786`; `verify.ts:192`; `class-schema.ts:68-69`; `score-assemble.ts:418`;
  `score-integrity.ts:16`; `score.ts:202-209`. All are accurate. The `judge-packets.ts` spans are
  within about seven lines, which Task 0 re-checks.
- **The lane merge.** Task 6's files (the schema, `scripts/docs-audiences/`, `eslint.config.js`
  `COMMENT_GLOBS`, `scripts/checks/check-comments.sh`, and its test) are disjoint from every file
  Tasks 1 to 5 name, so the segment 2 merge is clean. Two things are confirmed absent today:
  `scripts/docs-audiences/` is outside both lint lists, and `docs/internal/**` is outside the
  package's `files`.
- **Tooling.** `awake`, `claude-tooling-sync`, and the dotfiles drafter agent file exist.
  `session-ledger.ts` takes `--session` and `--since` as the plan uses them.
