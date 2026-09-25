# Docs reset pass 2a plan review: fold record

**Target:** `docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` at `9f112c92`, revised in
place. **Reviews:** `2026-09-25-docs-reset-2a-plan-review-contract.md` (C), `-mechanics.md` (M),
`-risk.md` (R). **Fold:** `claude-opus-5-5`, under the conductor's rulings R-a to R-i, which the
plan's header records with their reasons. Each finding was checked against source at `2eb96b74`
and the workstation before it was folded.

**Counts:** 54 items (C 18, M 13, R 20, plus R's three unnumbered notes). 51 folded, 3 owner
forks (F1 and F2 in the plan's "Owner decisions at approval"), 0 refused whole. Six sub-parts are
refused, each with its reason below. The items share 36 roots, and each root is folded once.

**Cost effect:** 11.8M to 12.65M (+0.85M), above the 12M flag and under the 15M ceiling. F2 puts
the flag to Geoff at approval.

## Verification notes

These were checked by the fold, beyond the reviewers' own probes.

- The `docs-reset-1b` worktree exists at `598230b8`. Its `tuning/round1/reader-report.json` is
  byte-identical to `main`'s, and `tuning/round1/score.json`'s `notes` is `[]`. The pass 1b merge
  commit is `1e4a7c31`.
- `uupd.timer` is `OnCalendar=04:00`, `RandomizedDelaySec=15m`, `Persistent=true`, with its next run
  2026-09-26 04:14. `uupd config-dump` shows `brew` enabled, and `/etc/uupd/config.json` disables
  only `distrobox`. `~/.dotfiles/bluefin/etc/` has no `uupd` entry, so the module route would be a
  new `/etc` file. Stopping the timer is runtime-only, which is why F1 picks it.
- The manifest has six `##` sections. A backticked-slug match on top-level entry lines only
  (`- ` at column 0), per section, resolves exactly 67 of the 68 capture directories with no
  extras. The 68th is the method source `mozilla-kb-writing-guide/`, named only in the Editors
  opening line. One entry names two captures (Substack). The forms `Local copy:` and
  `Local paths:` exist beside the forms the reviewers listed.
- Round 1's absent lists come from `batches/round1.json`'s job entries (tuning record, "Round 1"),
  not `tuning/round0/absent-lists.json` (R M2 named the latter).
- `readerReport` already returns `undefined` for a transcript that predates `diverged[]`, so
  requiring the new fields extends an existing contract.
- The Wilson interval at z = 1.96 reproduces 0.505 to 0.898 (12 of 16) and 0.444 to 0.858 (11 of 16).
- `~/.dotfiles/secrets/registry.md` still says that the scratch token is deleted at pass 2a's close.
- The editor pages are not served on cairn.pub (every `/docs/editors/*` path returns 404). The
  repository is public, so the human-read sheet links the page on GitHub.

## Dispositions

| Root | IDs | Disposition | Where |
| --- | --- | --- | --- |
| Key traces are absolute; rescore and pilot join fail on a path mismatch | C M1, M M1, R M3 | Folded (R-a). **Sub-refused:** R M3's alternative of comparing repository-relative traces, because it is a third concern in a two-deliverable task and loosens the only guard that a judge ruled the scored report. | Header R-a; Task 0 step 2; Task 4 regression and rehearsal; Task 5 steps 3 and 5; Global constraints (no committed worktree paths); Task 11 HISTORY line |
| Report substitution (reverify, resume) changes the scored path | M M1 (point 4) | Folded | R-a; Task 5 acceptance, verifier branch |
| Committed judge fixture embeds a worktree path | M M1 (last bullet) | Folded | Global constraints; Task 3 live check |
| `DISABLE_AUTOUPDATER` does not hold a Homebrew CLI | M M2, R M1 | **Owner fork F1** (recommended: pause `uupd.timer`), with R-h folded: the setting is dropped, the check is corrected, and the version is checked before every batch. **Sub-refused:** M M2's option to keep the dotfiles line as belt-and-braces, because it holds nothing on this host. R M1's step of redoing the smoke run on a drift, because the smoke fixture pins the report shape and the shape does not depend on the CLI version; a re-pin suffices. | Owner decisions F1; R-h (erratum E2); Task 2 step 2; Task 5 steps 2, 4, and 7; Unattended execution |
| CLI release comes before scoring reruns | C m8, M m2, R m5 | Folded | Task 5 step 7 (after scoring checks and the audit settle) |
| Exemplar resolver keys on a `Root:` line three sections lack | C M2, M M3 | Folded (R-e): a heading table, every slug form, top-level entry lines only, and a fixture cut from the real manifest | Task 6 "Exemplar-id resolution" and acceptance; Pre-flight "Exemplar manifest" |
| The precision split has no per-item field data | C M3 | Folded: `PrecisionItem.field`, `PrecisionRunRecord.newFieldItemCount`, and both files named | Task 4 Interfaces and Files |
| `plantTallies` on-map filter and `runsCaught` type | C M4, R m13 | Folded: on-map only, 8 entries. **Sub-refused:** C M4's `runsCaught: number`. The conductor ruled `boolean[]`, the existing type and the spec's named shape. The truthiness trap is closed by the stated `some(Boolean)` rule and a `[false, false]` test. | Task 4 Interfaces and acceptance |
| Rehearsal passes vacuously; no literal command; may overwrite `score.json` | C M5, R m2 | Folded: a literal command, asserted totals, `notes: []`, synthetic keyed catch side, output to the scratchpad, and a `git diff` check on round paths | Task 4 Interfaces ("The pilot scoring command") and acceptance; Task 5 step 5 cites it |
| Commands run from `main`; the smoke fallback hides an old-code run | M M4, R m4, R note (cd) | Folded (R-b). **Sub-refused:** R m4's check that the transcript's prompt carries the new request lines, because the request and the schema ship from the same file, so the required keys on the raw report prove the new code ran. | Header R-b; Task 2 steps 2 and 3 and acceptance; Task 5 opening; Task 3 live check |
| Harness filter, absent lists, and packet location unpinned | C m9, M m3, M m4, R M2 | Folded (R-c). **Corrected:** R M2 named `tuning/round0/absent-lists.json`, but round 1's source is the batch job entries, which the pilot batch files copy. | Header R-c; Task 5 steps 1, 3, and 5; Task 3 live check |
| No audit of judge rulings | R M4 | Folded (R-d) | Task 5 step 6 |
| "The field that carried each catch" has no source | C m3, R m12 | Folded: a reported, unscored annotation from step 6's auditor, which maps the item id cited in the reason through the key, or reports "unmapped". Task 4's case is restated as a loader test. | Task 5 steps 6 and 8; Task 4 acceptance |
| Human-read sheets reach Geoff too late | R M5 | Folded: written in this fold, sent with the plan approval. A late read routes to pass 2b. | `2026-09-25-docs-reset-2a-human-reads.md`; Task 0 step 5; Tasks 8, 10, 11 |
| Site-round evidence does not exist | R M6 | Folded (R-g) | Header R-g; Task 7 steps 1 and 2; Task 10 acceptance |
| Plants file contradicts the spec | C m1, M m1, R m1 | Folded (R-f): sanctioned as erratum E1, which the close files against the spec | Header R-f; spec line under "Spec"; Task 11 |
| No Wilson computation | C m2 | Folded: exported `wilsonInterval` plus an output field, tested against the spec's figures | Task 4 Interfaces and acceptance |
| Verifier-check trigger cannot tell new-field problems apart | C m4, R note (who reports cause) | Folded: prefixes `wrong quote ` and `missing quote `; step 3's agent returns problems grouped by prefix | Task 1 Interfaces; Task 5 step 3 and acceptance |
| "Fails schema validation" has no in-repo validator; old transcripts | C m5 | Folded: stated as `readerReport` returning `undefined` plus `REPORT_SCHEMA.required`. `reverify.ts` over a pre-2a transcript reports no report, which is accepted on record. | Task 1 Outcome, Interfaces, acceptance; Pre-flight |
| Verifier fixtures' deciding states unnamed | C m6 | Folded: a single-line quote cited two lines early; a page in `docsSet` with no Grep hit | Task 1 acceptance |
| `--control-ids` states unnamed | C m7 | Folded: absent, empty, duplicate, not in the reports, non-control, and unlisted control, one test each | Task 4 Interfaces and acceptance |
| Task 6 schema test loose; rejected ids still resolve | C m10, M m7 | Folded: keys read from the schema file; cases for an extra key, missing frontmatter, broken YAML, a method source, and a rejected id; Task 9's verdict line form feeds the resolver | Task 6; Task 9 acceptance |
| What "verifies" means for the smoke fixture | C m11 | Folded: the recorded `verified.ok`; synthetic entries named in the Ledger and the test comment | Task 2 step 3 and acceptance |
| The six profile ids unpinned | C m12 | Folded: `evaluator`, `editor`, `site-operator`, `site-designer`, `admin-extender`, `core-developer` | Task 6 Interfaces; Task 7 step 3 |
| `perRun` and live-check shapes unstated | C m13 | Folded | Task 4 Interfaces; Task 3 live check (`batches/pilot-2a-live-adjudicator.json`) |
| Registry still dates the token deletion to 2a | M m5 | Folded | Task 0 step 4 and Files |
| Render test filename unpinned | M m6, R m9 | Folded: `src/tests/unit/docs-audiences-render.test.ts` | Task 6 Outcome |
| Exemplar corpus read too large for one lens | M m8, R m11 | Folded: three lenses by audience, reading `page.md` and `meta.json` only | Task 9 |
| Cost lines at the floor; verifier-fix chain unpriced | M m9 | Folded: lines re-examined, total 12.65M, conditional chains priced | Cost lines; Budget |
| Echo risk in new prompt lines | R m3 | Folded | Global constraints (Bans); Task 1 and Task 3 reviewers |
| Task 0 hard-codes 2.1.282 | R m6 | Folded | Task 0 acceptance |
| One-executor check fires on known dotfiles changes | R m7 | Folded: the known baseline named; only files this pass commits stop a task | Branches |
| STATUS grows by a line per checkpoint | R m8 | Folded: one live line, replaced, naming the Ledger's worktree path | Checkpoints |
| Review lenses' inputs and tools unnamed | R m10 | Folded | Task 8 step 1 |
| The flag sitting is near certain | R m14 | **Owner fork F2** (recommended: continue past the flag unless a single task overruns its line by more than half) | Owner decisions F2; R-i |
| Credential precondition for the operator batch | R note | Folded as a name-only check of `CAIRN_SCRATCH_CF_TOKEN` beside `/healthz`. `cairn auth check` is not adopted, because the fold did not verify that command. | Task 5 step 1; Review focus 4 |
