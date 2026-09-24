# Docs reset baseline: pass A's scripter-visible defects

This record is docs reset pass 1's failure record: the scope decision for Tasks 5 to 10. The
baseline yielded 13 usable reader runs. The scripter readers found 4 of pass A's 19 known defects
in at least one usable run: 1 of 10 in the tuning half and 3 of 9 in the held-out half. Across the
other classes, the readers surfaced 6 verified docs failures and 4 more verified page defects they
reported only as rule candidates. No stall in a usable run was docs-caused. Exact-line rot is
25.4% (16 of 63 anchored pointers), 14 of the 16 in `src/`. Reader reliability is the largest
open risk: 5 final-attempt runs failed verification, 4 of them Sonnet 5 runs, and 6 of their 8
unverified quotes were one line off. The verdicts: Tasks 5, 6, 7, and 10 build, 6 with its
reverse mode deferred and 10 scoped; Task 8 builds the drafter and defers the audience-profile
skill to pass 2a; Task 9 builds 7 of 12 chain changes (the spec's 11 plus bounded auto-continue) and defers 5.

## Ground truth: pass A's scripter-visible defects

This record lists every page defect that pass A's fixes closed on the three `cairn` CLI contract
pages after the scripter test read them. The ground truth comes from the fixing diffs, never from a
reader run. Each fix in `cca525b5` and `a66d3c98` was matched to the Task 9 verifier's report and
to the pass-end catches, using the pass A session transcripts and the scratch files under the
session's `scratchpad/scripter/` (`guesses.md`, `parse.py`, `parse.fixed.py`, `wrap.sh`). The
count is 19 defects, not the 14 the spec cites. The 14 is the verifier's ranked list of closing
sentences, and that list merges or omits five distinct defects (see "Why the count is 19").

### The tested versions

The scripter read the pages as they stood after `29a03eff`:

- `docs/reference/cli-cairn-json-output.md@29a03eff`. The page changed at `3bfaac37` and again
  at `29a03eff` (the version line and the `sites` payload's `errors` presence), both before the
  scripter ran, so `29a03eff` is the tested version.
- `docs/reference/cli-cairn-doctor.md@3453668f`.
- `docs/reference/cli-cairn-exit-codes.md@29a03eff`.

Task 8's commits (`40ade507`, `74e41f7e`, `86b67cc7`, `17b83eea`, `3aced2fc`) did not touch the
three pages. Three later commits changed them before pass A closed: `cca525b5` (the one redraft),
`a66d3c98` (the pass-end catches), and `51d0e8f7` (the close, a line rewrap and backticks on the
doctor page's version line, excluded as prose only).

### Sources

- **V**: one of the verifier's 15 guess findings, numbered as in the scripter's `guesses.md`.
- **V+**: the verifier's report outside the 15. The report carried a parser failure against a
  golden, one schema-vs-page finding, one wrapper-vs-spine finding, and an editorial note.
- **L**: one of the three catches from the last page read after the re-run.

No defect was found only in the diffs. Every fixed claim traces to a verifier or last-read item.

### Defects

| Id | Page and line (tested version) | What was wrong | Fixed in | Source |
| --- | --- | --- | --- | --- |
| D01 | `cli-cairn-json-output.md@29a03eff:17` | The page never said a payload's `verdict` and `exitCode` always agree, so a parser could not assert one from the other. | `cca525b5` | V (guess 2) |
| D02 | `cli-cairn-json-output.md@29a03eff:43` | The page never said each payload is one compact line; the examples are pretty-printed, so a reader could not tell a single payload from an NDJSON stream. | `cca525b5` | V (guess 29) |
| D03 | `cli-cairn-json-output.md@29a03eff:89` | The page never said a check reads `held` only while its hold is unexpired and reads `fail` once `hold.expired` is true. | `cca525b5` | V (guess 19) |
| D04 | `cli-cairn-json-output.md@29a03eff:96` | The page never said where `errorCount` and `errorCountTruncated` live. The check object is `additionalProperties: false`, so they can sit only inside the open `fields` object, and no schema names them. | `cca525b5` | V (guess 36) and V+ (schema-vs-page) |
| D05 | `cli-cairn-json-output.md@29a03eff:98` | "The `errors` check carries `errorCount` always" was false: the `health-healthy.json` golden has a passing `errors` check with no `fields`. The parser failed on it. | `cca525b5` | V+ (parser run, golden) |
| D06 | `cli-cairn-json-output.md@29a03eff:100` | The page named `topEvents` without its placement or shape. It is a key inside `observed`, which the page never said. | `cca525b5` | V (guess 11) and V+ (schema-vs-page) |
| D07 | `cli-cairn-json-output.md@29a03eff:103` | The page did not say every held check is named in `acknowledged`, so membership could not be asserted. | `cca525b5` | V (guess 15) |
| D08 | `cli-cairn-json-output.md@29a03eff:103` | The page gave the sort keys for `checks` and `acknowledged` without the collation, which is byte-wise, not locale-aware. | `cca525b5` | V (guess 26) |
| D09 | `cli-cairn-json-output.md@29a03eff:143` | `degraded` was named with no meaning. It is true when any check has `reason.cred-missing`, which writes the wire state `skip`. The redraft skipped the verifier's own sentence, which said `unknown`. | `a66d3c98` | V (guess 13) and L (the `degraded` sentence) |
| D10 | `cli-cairn-json-output.md@29a03eff:269` | "`worstFirst` lists the sites by verdict" was false: `worstFirst` ranks by the severity class of each site's worst unacknowledged failure. | `a66d3c98` | L (`worstFirst`) |
| D11 | `cli-cairn-json-output.md@29a03eff:269` | The page left the tie order in `worstFirst` unstated. Sites whose worst failures share a class keep the registry's order. The redraft's attempt ("within one verdict band") was itself false and was replaced. | `a66d3c98` | V (guess 27) |
| D12 | `cli-cairn-json-output.md@29a03eff:364` | The page never mapped an `authCheck` row's wire state to its exit contribution, and never said an unset credential or a site-scoped row on a run without a site reads `skip`. | `cca525b5` | V (guess 3) |
| D13 | `cli-cairn-json-output.md@29a03eff:380` | "The resolved, symlink-free directory" reads as an absolute path. `dir` is symlink-resolved only: a relative argument stays relative, and a bare run writes `.`. | `cca525b5` | V (guess 37) |
| D14 | `cli-cairn-json-output.md@29a03eff:390` | "A doctor check's `fix` carries only `summary` and `url`" reads as both required. The schema requires `summary` only, and `url` is present only when the condition has a docs anchor. | `cca525b5` | V+ (editorial note on guess 5) |
| D15 | `cli-cairn-json-output.md@29a03eff:493` | The condition-id vocabulary was frozen at 1.0 but neither listed nor located. The fix names the engine's `conditions.ts` registry and the CLI's embedded `conditions.json`. | `cca525b5` | V (guess 23) |
| D16 | `cli-cairn-doctor.md@3453668f:106` | The payload carries no severity field, and the page never said so or how to fold a `fail`: by the severity column, keyed on `checkId`. | `cca525b5` | V (guess 1) |
| D17 | `cli-cairn-doctor.md@3453668f:117` | "Read the `--json` payload to tell them apart" named no discriminator for the three exit-3 cases. The fix says a usage error writes no payload, a non-site writes an empty `checks` array, and any other exit 3 is the `UNCHECKED` case. | `cca525b5`, tidied in `a66d3c98` | V (guess 31) |
| D18 | `cli-cairn-exit-codes.md@29a03eff:93` | "Empty stdout under `--json` means the invocation was wrong" was incomplete: a run that ends before any payload and a tool fault give the same exit 3 and empty stdout. | `cca525b5`, refined in `a66d3c98` | V+ (wrapper-vs-spine) |
| D19 | `cli-cairn-exit-codes.md@29a03eff:98` | The page never said `--quiet`, `--timeout`, `--color`, `--theme`, and `--width` are root flags every command accepts, so a wrapper could not know `cairn auth check` takes `--quiet`. | `cca525b5` | V (guess 32) |

### Excluded items

| Item | Where | Reason |
| --- | --- | --- |
| The re-run's one parser failure | `scratchpad/scripter/parse.py:357` against `health-healthy.json` | The parser's own retired assumption. Its guard `state == "pass" or "errorCount" in holder` encoded the page claim D05 removed. With the guard fixed (`parse.fixed.py`), all 14 goldens pass. Not a page defect; the page defect it came from is D05. |
| The duplicated exit-3 paragraph | `cli-cairn-doctor.md@cca525b5:124` | L (the duplicate). The redraft introduced it and it was absent from the tested page. It restated the preceding paragraph without contradicting it, so it misled no scripter. |
| "A cancelled run" as a cause of empty stdout | `cli-cairn-exit-codes.md@cca525b5:96` | The redraft introduced it: a cancelled `--json` sweep still writes its settled lines. It is part of D18's fix history, not a defect in the tested page. |
| "Within one verdict band `worstFirst` keeps the run's own sweep order" | `cli-cairn-json-output.md@cca525b5:278` | The redraft introduced it as the verifier's own false closing sentence for D11. The tested page's defects are D10 and D11. |
| The doctor page's version line | `cli-cairn-doctor.md@a66d3c98:3` | `51d0e8f7` rewrapped it and added backticks. Prose only; no claim changed. |
| `Snapshot.Dir`'s doc comment | `tool/internal/doctor/snapshot.go` | A Go comment, not a page. `a66d3c98` fixed it beside the pages. |

### Why the count is 19

The spec says the scripter "found 14 page defects". That 14 is the length of the verifier's
ranked list of closing sentences: ten on the JSON output page, two on the doctor page, two on the
exit-codes page. That list covered the 15 guess findings, the schema-vs-page finding, and the
wrapper-vs-spine finding, but merged or omitted five distinct defects. This record counts them
separately:

- D04 and D06 split the ranked list's first item. `errorCount`'s placement and `topEvents`'s
  placement are separate facts a parser asserts separately.
- D07 and D08 split the ranked list's eighth item, which covered guesses 15 and 26 in one
  sentence. Membership in `acknowledged` and sort collation are separate facts.
- D05 is the parser's golden failure, which the report stated but did not rank. The redraft fixed
  the page claim.
- D14 is the verifier's editorial note on guess 5, which the report did not rank and the redraft
  fixed.
- D10 is a last-read catch. The verifier's guess 27 asked only about tie order (D11); the sort key
  itself was misstated.

The last-read `degraded` catch is D09, the same defect as guess 13. HISTORY's "15 findings" is the
15 guess findings; the redraft closed 13 of them and left guesses 13 and 27, which `a66d3c98`
closed. The count stands at 19.

### The tuning and held-out split

**Scope rule.** A defect is in scope when it was present in the tested version of its page and a
person writing a wrapper and parser from that page alone would be broken or misled by it. All 19
rows (D01 to D19) meet the rule. This includes the V+ items and D10, the one last-read catch
present in the tested page. The excluded items are out of scope.

**Procedure.** For each id in scope, compute the SHA-256 of the seed string `docs-reset-baseline`
concatenated with the id, with no separator and no trailing newline. Order the ids by the hex
digest, ascending. The first ten (the ceiling of 19 halved) are the tuning half; the other nine
are the held-out half.

```sh
for i in $(seq -w 1 19); do
  id="D$i"
  printf '%s %s\n' "$(printf '%s' "docs-reset-baseline$id" | sha256sum | cut -d' ' -f1)" "$id"
done | sort
```

The digests, first 16 hex characters, in order:

| Rank | Digest prefix | Id | Half |
| --- | --- | --- | --- |
| 1 | `018751878b4a0452` | D11 | Tuning |
| 2 | `03d3a81d357f5ede` | D05 | Tuning |
| 3 | `15c71d07c62f78f7` | D14 | Tuning |
| 4 | `2cffa4cc947b0d0f` | D02 | Tuning |
| 5 | `521fbace213c9089` | D15 | Tuning |
| 6 | `5b6f38a5b79c3c00` | D04 | Tuning |
| 7 | `6c9f2d39d282f7fd` | D19 | Tuning |
| 8 | `6e7530eebe8bc299` | D13 | Tuning |
| 9 | `882983d1581ec091` | D07 | Tuning |
| 10 | `88431200866730fd` | D17 | Tuning |
| 11 | `a351fe3b8d98239e` | D18 | Held out |
| 12 | `a84085dd72b2553d` | D09 | Held out |
| 13 | `ae979721ece8ae23` | D16 | Held out |
| 14 | `bba2e689b235d797` | D06 | Held out |
| 15 | `bfca78544c56795c` | D10 | Held out |
| 16 | `c263912eb8a8728d` | D03 | Held out |
| 17 | `ce704c65ab047c61` | D12 | Held out |
| 18 | `f1468215feb98b42` | D08 | Held out |
| 19 | `ffd28439c1d86756` | D01 | Held out |

- **Tuning (10):** D02, D04, D05, D07, D11, D13, D14, D15, D17, D19.
- **Held out (9):** D01, D03, D06, D08, D09, D10, D12, D16, D18.

## Baseline run: what ran and which runs count

The batch file is `scripts/docs-readers/batches/baseline.json`: six jobs, each run three times,
twice on `claude-opus-5-5` and once on `claude-sonnet-5`, at concurrency 4. Two batches produced
the evidence, each with a `report.json`, a `report.reverified.json`, and per-run transcripts:

- **Original:** `~/.cache/docs-readers/results/baseline-20260923/`, 18 runs, `stopReason:
  complete`, 741,958 counted tokens and 7,693,613 cache-read.
- **Rerun:** `~/.cache/docs-readers/results/baseline-rerun-20260923/`, 15 runs (the nine
  designer, extender, and core-developer runs, plus evaluator-2 and -3, operator-2 and -3, and
  scripter-2 and -3), `stopReason: complete`, 462,057 counted and 3,609,978 cache-read.

This record takes `report.reverified.json` as the verified status. A run counts as docs evidence
only when its final attempt verified.

**The original designer, extender, and core-developer runs are invalid as docs evidence.** A
harness bug left every `node_modules/.bin` link pointing at an absolute path on the preparation
host, so no tool resolved inside the container. Each run's first stall records it, for example
designer-3: "`npm run build` fails at the prebuild step because node_modules/.bin/vite and
node_modules/.bin/tailwindcss are symlinks with absolute targets pointing at the original
preparation machine's path". The bug is fixed, and those nine runs measured nothing about the
docs. This record excludes them.

### Usable runs

| Job | Class | Usable runs (batch, run, model) | Outcome |
| --- | --- | --- | --- |
| evaluator (`docs/why-cairn.md`) | docs-only | original-1 Opus; rerun-2 Opus | done, done |
| operator (`docs/admin/is-it-working.md`) | docs-and-binary | original-1 Opus; rerun-2 Opus; rerun-3 Sonnet | done, done, done |
| designer (`docs/extend/design-your-site.md`) | docs-and-site | rerun-1 Opus; rerun-2 Opus; rerun-3 Sonnet | done, stalled, done |
| extender (`docs/extend/add-a-custom-admin-screen.md`) | docs-and-site | rerun-1 Opus | done |
| core developer (`CONTRIBUTING.md`) | repository | rerun-1 Opus; rerun-2 Opus | stalled, stalled |
| scripter (pass A's three contract pages) | repository | original-1 Opus; rerun-2 Opus | done, done |

That is 13 usable runs, and the files agree with the list the conductor handed over. Original
operator-2 also verified, but rerun-2 is its final attempt, so rerun-2 is the one counted. The
unusable final attempts are evaluator-3, extender-2, extender-3, core-developer-3, and scripter-3
(see "Reader reliability").

**Conductor ruling on "every report verified".** Task 4's acceptance asks that every report
verify. The five final attempts above were each rerun once and are still unverified. Under the
pinned rerun-once rule, they are excluded from docs evidence. This is a recorded deviation from
the acceptance bullet's letter.

**Operator condition.** The condition was natural, not planted. `cairn doctor` on the scratch
checkout fails `config.bindings-missing`, since the scratch site has no `send_email` binding, and
`docs/admin/is-it-working.md` covers it. All three usable operator runs named that condition and
the page's "Ask a developer" fix at `is-it-working.md:224`.

**Evaluator rerun-2 is a genuine evaluation, not a thin answer.** It counted 3,954 tokens against
about 50,000 for its siblings. Its transcript
(`baseline-rerun-20260923/transcripts/evaluator-2.jsonl`) shows the same path as original
evaluator-1: one `Glob`, full `Read`s of all eight pages in the docs set, then the structured
report, over 11 turns. It wrote 3,948 output tokens, 949 of them thinking, and returned 12
verified quotes spread over all eight pages. The low count comes from caching. The result event
reports 54,694 cache-read input tokens and zero cache creation. The prompt and pages were
byte-identical to the original batch's evaluator runs, which had written one-hour cache entries.
The plan's counting rule excludes cache reads, so the run counted almost nothing. Task 11's cost
estimate should not take this figure as a per-run cost.

## Site-round evidence

None exists. Task 4's pre-flight confirmed that no site round has produced an extender
source-read log or per-page reports, so this record folds in no site-round evidence.

## Pass A's documented failures

These come from the pass A plan's segment 2 boundary and post-mortem
(`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`) and from this record's ground truth.

- **P1, joined neighbour entries.** "The fact read finds sentences the drafter composed by
  joining neighbouring manifest entries." A fact read caught them after drafting; no gate did.
- **P2, the false version line.** The plan's brief told every drafter to say the pages describe
  1.0.1, the current release. `cairn doctor` is absent from 1.0.1, so the claim was false on all
  three pages, and "caught by a fact read rather than by the plan."
- **P3, Sonnet drafts needing a third round.** Sonnet drafted (plan line 29: "Sonnet implements
  and drafts at `medium` effort"). The chain escalated all three pages after two rounds, and a
  directed third round followed. "The register editor's bar rises on each read." The chain spent
  2.64M tokens across 24 agents, and a contract page cost about 900K against the 300K assumed.
- **P4, three accepting reads missed 19 defects.** The register editor, the profile grade, and
  the fact read accepted the three pages. The scripter then found the 19 defects in the ground
  truth above ("an adversarial reader that consumes only the artifact catches what a reader
  holding the source cannot").
- **P5, the redraft dropped and introduced claims.** Redraft `cca525b5` took 15 of the
  verifier's 16 closing sentences. It skipped the verifier's own `degraded` sentence (D09), and
  its fix for D11 was itself false. It also introduced a duplicated exit-3 paragraph and the false
  "a cancelled run" cause (both listed under "Excluded items"). `a66d3c98` closed these after a
  later read.

## Scripter detection against the ground truth

The two usable scripter runs are original-1 and rerun-2, both `claude-opus-5-5`. The Sonnet run
failed verification in both attempts and is not docs evidence. A defect counts as found only
when the report names its specific subject, in a stall, an `assumed[]` entry, a check, or the
report's other text (`ruleCandidates[]`).

| Id | Half | original-1 | rerun-2 | Where the report names it |
| --- | --- | --- | --- | --- |
| D01 | Held out | found | found | orig-1 `ruleCandidates[9]` ("whether `verdict` always maps one-to-one to `exitCode`"); rerun-2 `assumed[9]` ("no page states they must agree") and `ruleCandidates[9]` |
| D02 | Tuning | found | found | orig-1 `assumed[2]` ("may be pretty-printed or one line") and `ruleCandidates[8]`; rerun-2 `assumed[2]` and `ruleCandidates[5]` |
| D03 | Held out | found | not found | orig-1 `ruleCandidates[13]` ("what `state` an expired-hold check carries") |
| D04 | Tuning | not found | not found | |
| D05 | Tuning | not found | not found | |
| D06 | Held out | not found | not found | |
| D07 | Tuning | not found | not found | |
| D08 | Held out | not found | not found | |
| D09 | Held out | not found | not found | |
| D10 | Held out | not found | not found | |
| D11 | Tuning | not found | not found | |
| D12 | Held out | not found | not found | Near miss: orig-1 `ruleCandidates[2]` names the `authCheck` row's `reason` and `reason.cred-missing`, not the row's state or its exit contribution. |
| D13 | Tuning | not found | not found | |
| D14 | Tuning | not found | not found | Near miss: rerun-2 `ruleCandidates[7]` names `fix` presence on a fail, not `url`'s optionality. |
| D15 | Tuning | not found | not found | Near miss: both runs name the 32 reason codes' enumeration, not the condition-id vocabulary. |
| D16 | Held out | not found | not found | |
| D17 | Tuning | not found | not found | Near miss: both runs quote `cli-cairn-doctor.md:119` but name D18's subject, not the three exit-3 cases. |
| D18 | Held out | found | found | orig-1 `assumed[3]` ("whether cancelled runs or tool faults write a payload") and `ruleCandidates[4]`; rerun-2 `assumed[6]` and `ruleCandidates[4]` |
| D19 | Tuning | not found | not found | |

Totals:

| Half | Found in any usable run | Found in both usable runs |
| --- | --- | --- |
| Tuning (10) | 1 (D02) | 1 (D02) |
| Held out (9) | 3 (D01, D03, D18) | 2 (D01, D18) |
| All (19) | 4 | 3 |

The held-out results are reported as measured. Nothing later tunes on them.

**The job could not reach the parser-run class.** The scripter job wrote its wrapper and parser
without running them, since the repository class cannot run arbitrary scripts. Both usable runs
stalled on exactly that: orig-1 reported "the Bash call was denied because no one could approve it
in this session, so the code is unexecuted." Pass A found D05 by running its parser against the
shipped goldens, and the page's JSON examples were the nearest substitute this job had.

**Findings outside the ground truth.** Both runs reported items the ground truth does not list.
This record does not adjudicate them, and they are not scored. Recurring in both runs: the
version framing ("the pages describe 1.1.0 while stating 1.0.1 is current"; true when drafted,
since `tool/v1.1.0` shipped after the pages, and corrected at `HEAD`); stderr under `--json`
(`cli-cairn-json-output.md:13` says it "carries diagnostics", `:310` says it "is silent");
`additionalProperties: false` against optional fields added within schema version 1 (`:337`);
`held` in the doctor schema's state enum; and `exitCode` optional in the single-site schema
against the prose at `:25`. Recurring in one run: doctor's skip-to-OK rule against the general
skip-to-`UNKNOWN` rule, seven against nine health checks, and `tier: "none"` on credential checks.

## Stalls in usable runs

Every stall in a usable run, quoted from its report and classified. None is docs-caused. One
harness-caused stall carries a verified docs omission inside it (F4 below), and another carries
a second (F6).

| Run | Stall (quoted, shortened) | Cause |
| --- | --- | --- |
| evaluator orig-1 | "Many linked pages (own-your-domain.md, invite-editors.md, upgrade-cairn.md, ...) are not present in the working directory" | Harness: the batch's docs set |
| evaluator rerun-2 | "Could not read linked pages (admin/own-your-domain.md, ...); they are not in the working directory" | Harness: the batch's docs set |
| operator orig-1 | "First Bash call (ls + cairn doctor + echo of exit code) was auto-denied for needing approval" | Harness: allowlist refuses compound commands |
| operator rerun-2 | "First attempt (`ls -la && cairn doctor; echo \"exit=$?\"`) was denied for needing approval" | Harness: allowlist |
| operator rerun-3 | "Running `npx cairn doctor` was auto-denied (no approval surface for npx)" | Harness: allowlist |
| designer rerun-1 | "A combined sed+build Bash command was denied for approval" | Harness: allowlist |
| designer rerun-2 | "Running `npm run build` to confirm the edit was denied: the command needed approval (it used shell expansion to capture the exit code)" | Harness: allowlist; the run's only stall and the reason its outcome is `stalled` |
| extender rerun-1 | "A Bash command that ran mkdir and used heredoc redirection after a `cd` was denied" | Harness: allowlist |
| core-dev rerun-1 [0], rerun-2 [0] | "`npm install` (CONTRIBUTING.md:12): skipped because a fresh install isn't possible here" | Harness: install happens at preparation by design |
| core-dev rerun-1 [1], rerun-2 [1] | "`npm test` ... failed: ... (a) the Playwright chromium headless shell isn't installed ...; (b) `scripts/docs-readers/` is missing ...; (c) the directory isn't a git repository ...; (d) docs-links.test.ts found 971 broken links; (e) reference-coverage.test.ts timed out" | Harness: the image has no browser, and the export drops `scripts/docs-readers/`, `.git`, and the linked internal docs. Contains docs omission F4. |
| core-dev rerun-1 [2], rerun-2 [2] | "The component project never ran ... the permission layer denied it"; "Rerunning the failing vitest files directly ... was denied by the permission layer" | Harness: allowlist, after the `&&` chain stopped |
| core-dev rerun-1 [3], rerun-2 [3] | "`npm run check` ... finished with 75 errors across 13 files ... Every error is in src/tests/unit/docs-readers-*.test.ts" | Harness: the export drops `scripts/docs-readers/`. Rerun-2 also attributes errors to showcase and waymark dependencies, and its transcript confirms the showcase part. Contains docs omission F6. |
| core-dev rerun-1 [4], rerun-2 [4] | "`npm --version` was denied by the permission layer"; "Could not inspect package.json scripts/engines via node -e (permission denied)" | Harness: allowlist |
| scripter orig-1, rerun-2 | "Could not run a test of the parser ... the code is unexecuted" | Harness: the repository class cannot run scripts |
| scripter rerun-2 [1] | "Could not check which cairn version is installed" | Harness: no binary in the repository class |

## Docs failures

Under the plan's rule, only docs-caused stalls and verified `assumed[]` entries are failures of
the docs. Each one below was checked against the page at `HEAD`.

| Id | Page:line | Failure | Evidence (report, run, quoted text) |
| --- | --- | --- | --- |
| F1 | `docs/admin/is-it-working.md:67`, `:102` against `:33` | The page says each report line carries a title "like `Wrangler bindings`", and its jump list uses that title. The page's own sample, a real transcript, prints `Wrangler bindings are missing`. | Rerun, operator-2, `assumed[0]`: "I took the doctor report title 'Wrangler bindings are missing' to be the jump-list entry 'Wrangler bindings'. The docs list short titles, but the real report prints the full condition phrase." |
| F2 | `docs/extend/design-your-site.md:31-33` | The re-skin recipe says to rotate `--color-primary`'s hue and says nothing about `--color-primary-content`. The two Opus runs took opposite readings of the same gap. | Rerun, designer-1, `assumed[1]`: "Rotated the hue of --color-primary-content too"; rerun, designer-2, `assumed[1]`: "Left --color-primary-content unchanged ... I'm not sure whether its hue should also rotate to match." |
| F3 | `docs/extend/restrict-admin-access.md:21`, `:51` | The guide places the access map at `src/lib/cairn.access.ts`. The scaffolded site keeps it at `src/access.ts` (`templates/waymark/src/hooks.server.ts:5`). | Rerun, extender-1, `assumed[3]`: "I should add the rule to the site's existing src/access.ts, not create the src/lib/cairn.access.ts the guide's example uses." |
| F4 | `CONTRIBUTING.md:10-14` | The setup steps never name the Playwright browser install that `npm test` needs. CI installs it explicitly (`.github/workflows/norms.yml:49`). | Rerun, core-developer-1, `stalls[1]`: "(a) the Playwright chromium headless shell isn't installed (~24 files; install is impossible here)"; rerun, core-developer-2, `stalls[1]`: "Most failed because the Playwright chromium_headless_shell-1243 browser is not installed". |
| F6 | `CONTRIBUTING.md:10-14`, `:18` | The setup steps never say that `npm run check` loads `examples/showcase/svelte.config.js`, so the showcase must be installed first. The guide mentions a showcase install only for viewing a change. CI installs it (`.github/workflows/norms.yml:45`, `npm ci --prefix examples/showcase`). Verified from the transcript. | Rerun, core-developer-2, `stalls[3]`: "npm run check exited 1 with 75 errors in 13 files: showcase/waymark configs could not load (@sveltejs/adapter-cloudflare, @tailwindcss/vite not installed in those sub-projects)". The transcript (`baseline-rerun-20260923/transcripts/core-developer-2.jsonl`) shows `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@sveltejs/adapter-cloudflare' imported from /reader/job/examples/showcase/svelte.config.js`. |
| F5 | The evaluator docs set (`docs/why-cairn.md`, `docs/admin/before-you-start.md`, and the rest) | No page in the set states the current published version. | Original, evaluator-1, `assumed[2]`: "the docs never state the current published version." |

### Verified defects reported only as rule candidates

These are real page defects, checked at `HEAD`, that readers reported in `ruleCandidates[]`
rather than as a stall or an assumption. They fall outside the plan's failure definition, so the
record lists them apart. Several verdicts below still cite them as evidence.

| Id | Page:line | Defect | Evidence |
| --- | --- | --- | --- |
| R1 | `docs/why-cairn.md:41` against `docs/admin/before-you-start.md:52-53` | The owner-voice claim of "a free tier that actually stays free for a small site's real traffic" contradicts "Workers Paid plan, $5 a month ... from your first deploy". | Original evaluator-1 and rerun evaluator-2, `ruleCandidates[0]` in both. |
| R2 | `docs/extend/migration-notes.md:429` | The 0.96.0 section still carries the release-process placeholder "The release step sets the version number at the cut and renames this section to match it." | Original evaluator-1 and rerun evaluator-2, `ruleCandidates[4]` in both. |
| R3 | `docs/extend/sign-in-through-your-organization.md:345-346` | "`createGithubApp(...)` is the one provider cairn ships ...; none ships with cairn today." The container states it correctly at `docs/internal/facts/extend.md:401` ("the one provider cairn ships today, and none ships besides it"). One commit (`74e0df1e`) wrote both clauses, so this is a drafting join, not a later edit. | Rerun evaluator-2, `ruleCandidates[3]`. |
| R4 | `docs/admin/is-it-working.md:74` against `:42` | The page says the sample carries one skip, `Guard role wiring`. The sample prints `Guard is missing the declared role vocabulary`. | Original operator-1, `ruleCandidates[2]`; rerun operator-2, `ruleCandidates[1]`. |

**Reader claims not counted,** with the reason:

- The operator's reason "needs engine 0.97.0 or later, and one build": `cli-cairn-doctor.md:91-93`
  explains it, and `is-it-working.md:23` links there.
- A site that omits `EMAIL` on purpose: the scratch site dropped the binding, and the page's fix is
  right for any site that signs editors in.
- The designer's AA contrast check: `design-your-site.md:41-47` says how to check it.
- The extender's read-only screen gate: `add-a-custom-admin-screen.md:77` covers it by implication.
- The rest are the job's own choices, such as a hue, a route path, or what "clean" means for a
  build.

## Exact-line rot

`scripts/docs-readers/rot.ts` measures what share of the container's anchored `Source:` pointers
name tokens that do not sit on the cited line itself at `HEAD`. **16 of 63 anchored pointers
(25.4%) are off their cited line.** Fourteen of the 16 cite files under `src/`, two cite
`package.json`, and none cite `tool/`. `check-facts.mjs`'s ten-line window passes all 16, which is
why the gate reads zero rot. The measure covers only the 63 pointers that carry an anchor, not
every pointer in the 810-fact container.

## Reader reliability

Unverified runs are not docs evidence. They are evidence about the reader instrument.

**Runs lost.** Across both batches, 11 of 33 runs failed verification. Among the 18 final
attempts, 5 failed: evaluator-3, extender-2, extender-3, core-developer-3, and scripter-3. Four
of the six Sonnet 5 final attempts failed (only operator-3 and designer-3 verified), against one
of the twelve Opus 5.5 final attempts (extender-2).

**The citation habit.** The runs carry 18 unverified quotes:

| Kind | Final attempts | Superseded original attempts | Total |
| --- | --- | --- | --- |
| Real text, cited one line off | 6 | 8 | 14 |
| Real text, cited two lines off | 0 | 1 (scripter-3, `cli-cairn-json-output.md:46`, text at `:44`) | 1 |
| Real text, cited seven lines off | 0 | 1 (scripter-3, `cli-cairn-doctor.md:108`, text at `:101`) | 1 |
| Paraphrase presented as a quote | 1 (evaluator-3, `add-a-second-audience.md:12`: "with `none` capability and its own `home`", where the page reads "mapped to `none` capability with its own `home`") | 0 | 1 |
| Wrong file | 1 (scripter-3 cites `cli-cairn-doctor.md:387`, a 134-line file; the text sits at `cli-cairn-json-output.md:391`) | 0 | 1 |

Of the 14 one-line misses, 12 cite the line after the text's first line, and 2 cite the line
before it. The job text already asks for the line "the way your Read tool shows them." One
possible explanation is that a reader takes the number printed after the text, which is the next
line's prefix. This record has not tested that.

Two further verification problems are not quote text. Original operator-3 read
`cli-cairn-doctor.md` and quoted nothing from it. Rerun extender-3 quoted `sveltekit.md:376`
correctly, and it read that page through a Bash `grep` on an absolute path. The verifier's
`shellPagesRead` does count such a read, but its command split at
`scripts/docs-readers/lib/transcript.ts:298` breaks on `[;|\n]` and cuts at the `\|` inside the
quoted grep pattern, so the page never reached `pagesRead[]`. The second problem is a verifier
gap, not a reader failure. The fix is a quote-aware command split, which goes to Task 10's lane.

**The decision this forces for Task 11.** Task 11's bar is catching each defect in at least two
of three runs. With the Sonnet run lost in four of six jobs, that bar becomes "both Opus runs" for
those jobs. There are two ways forward, and this record does not choose between them:

- Keep strict line verification and accept the lost runs. The bar then rests on fewer runs, or
  lost runs repeat until three verify.
- Change the report contract, for example: cite the line the Read tool printed beside the quote's
  first words; accept a quote within one line of its citation; or let the verifier locate a
  verbatim quote and report the line itself.

A one-line tolerance would recover two of the five failed final attempts (extender-2 and
core-developer-3). A third, extender-3, also needs the pages-read fix. The paraphrase and the
wrong-file citation fail under any line tolerance.

**Allowlist friction.** Ten of the 13 usable runs recorded at least one permission denial. Seven
of those were compound or shell-expansion commands, one was `npx`, and two were the scripter's
attempts to run its own code. Designer rerun-2 stalled on this alone. Task 2's ledger already
records that the allowlist refuses compound commands. Task 11's jobs need to name bare commands,
or the allowlist needs to accept these read-only forms.

## Verdicts

The plan's rule: a component with no recorded failure behind it is deferred. The failure ids
refer to this record: P1 to P5 (pass A), D01 to D19 (the ground truth), F1 to F5 (docs failures),
and R1 to R4 (verified rule-candidate defects).

### Tasks 5 to 10

| Task | Verdict | The failure behind it, or the reason to defer |
| --- | --- | --- |
| 5, fact ids | Build | Task 6's sentence-level provenance needs a stable key per bullet. Its failures are P1, P2, and R3: R3 is a published sentence that contradicts its own container bullet, with no id tying the two together. |
| 6, provenance, briefs, extractor | Build | P1 (joined sentences caught only by a late fact read), P2 (a false version line, the extractor's version class), and R3 (a joined contradiction on a published page). |
| 6, owner-tier key phrases | Build | R1: an owner-voice claim in `why-cairn.md:41` contradicts a pricing fact, and both usable evaluator runs flagged it. |
| 6, tag citability (candidate, excluded, and `[docs-drift]` fail; `[external]` and `[vendor-figure]` pass) | Build | Part of `check:provenance`, and Task 7 depends on it. The failures are the same as the row above. |
| 6, reverse mode (`--cited-by`) | Defer | The baseline's stale pages drifted from code, not from a fact. F1 and R4 are stale prose in `docs/admin/is-it-working.md`, left by `28eeacc2` in the same commit that rewrote its transcript. F3 is `restrict-admin-access.md` from `55bf8184`, which predates `templates/waymark/src/access.ts` from `5ef225b9`. No container bullet names those titles or paths, and no brief existed, so a mode listing the pages whose briefs cite an edited fact would have caught none of them. Task 10's title check catches F1 and R4. Task 5 still pins the id-unchanged half of Review focus item 5. File in ROADMAP, with the trigger: the first committed brief whose cited fact is later edited, or pass 2b's first drafted page. |
| 6, symbol-anchored sources for `src/` | Build | Rot is 25.4%, above the 10% threshold, and 14 of the 16 off-line pointers are in `src/`. |
| 6, the Go resolver for `tool/` | Defer (file) | No off-line pointer cites `tool/`. The plan files it either way. |
| 7, candidate triage | Build | The baseline shows current pages carrying wrong claims (R1 to R4, F1, F3) on top of pass A's 19 (P4). A bullet whose only source is such a page inherits an unchecked claim, and 134 bullets are in that state. Hand-off: `docs/internal/facts/extend.md:104` (tagged `[external]`) says "everything through Milestone 4 runs on Cloudflare's free tier", which contradicts `before-you-start.md:52`. Triage should check it for a `[docs-drift]` tag. |
| 8, the drafter agent and the v2 default `drafterType` | Build | P3 (Sonnet drafts escalated on all three pages and needed a third round) and P1 (the `sentences` list the agent writes). The agent's other four prompt rules (answer first, named tells, no padding, plain instructions) are the spec's method with no recorded failure behind them. They ride along as lines in the same file, and pass 2a's trial judges them. |
| 8, the audience-profile skill and profile template | Defer to pass 2a | Pass A's drafter already received its profile verbatim in the draft prompt, and P1 to P3 happened anyway. P1 is a sourcing failure, which the `sentences` list and `check:provenance` answer. Pass 2a defines the profile-file format together with the profiles. Spec pass 2a items 1 and 5 need a one-line amendment to say so (pass 2a defines the format with the profiles; folds go to the profile files and the drafter agent), and the conductor records it. Task 9's v2 chain passes the profile and any exemplars in the drafter's dispatch prompt, at no build cost. The agent ships without the `skills:` preload until then. |
| 9, the revised page chain | Build, partly | Per change, in the next table. |
| 10, docs-as-tests | Build, scoped | F1 and R4: the operator page's prose names report titles that `cairn doctor` never prints, and the page's own real transcript contradicts that prose. The scope is in "Harness scope" below. |

### Chain changes (spec pass 1 item 6)

The spec's item 6 lists 11 changes. The table adds a twelfth, bounded auto-continue of two, which
comes from the spec's "Evidence the method follows" section and from Task 9.

| Change | Verdict | The failure behind it, or the reason to defer |
| --- | --- | --- |
| The drafter writes the brief's `sentences` list, and `check:provenance` runs in the page gate | Build | P1, P2, R3. |
| The register editor receives Vale and `tellgrader` output | Build | P3: "the register editor's bar rises on each read." Deterministic findings give each read a fixed floor to filter, so the editor does not rediscover it. This is the thinnest-supported build, and pass 2a's trial may drop it. |
| The register editor receives an omission checklist | Build | 14 of the 19 ground-truth defects are omissions (D01 to D04, D06 to D09, D11, D12, D15 to D17, D19). F2, F4, F5, and F6 are omissions too. |
| The register editor reports every finding | Defer | No recorded case of the register editor withholding a finding. In pass A's chain, the setup-colon triad first appeared in the round-1 redraft. The round-2 editor reported it (`cli-cairn-exit-codes.md:43-47`, `blocking: false`, with a rewrite). The conductor's round-3 prompt applied only blocking findings, so the triad was dropped and caught again in the third read. `docs/HISTORY.md:207-208` is therefore a finding reported and not applied, the applied-findings class, which builds. It is not a withheld finding. "The bar rises on each read" is a conductor gloss with no withheld case behind it. |
| A separate Opus 5.5 filter drops only findings that contradict the register or the brief | Defer | No recorded finding contradicted the register or the brief. P2's false version line came from the brief itself. The filter exists to prune the every-finding report, which is deferred. |
| An applied-findings check after each redraft | Build | P5: the redraft skipped a sentence the verifier wrote (D09), wrote a false fix (D11), and introduced a duplicate paragraph and a false cause. |
| The profile grader removed | Build | P4: the profile grade was one of the three reads that accepted pages carrying 19 defects. P3: its round cost. |
| The reader stage in its place, run by the reader runner between a draft-gates-reads stage and a redraft stage | Build | P4, plus this baseline: readers found F1 to F3 and R1 to R4 on pages the plan's Task 4 treats as having passed today's chain. |
| Source material wrapped as content | Defer | No recorded case of a drafter following an instruction inside source material. P2's instruction came from the brief, which is an instruction by design. |
| A text-only turn end treated as a report | Defer | No recorded case in pass A's chain or in this baseline. |
| Bounded auto-continue of two | Defer | No recorded stalled chain agent. Pass A's chain escalated; it did not stall. |
| The two-round cap holds, and a third round escalates | Build (keep) | P3: the third round cost about 900K a page against the 300K assumed. |

Every existing gate stays unchanged, as the spec requires.

### Harness scope (spec pass 1 item 7)

**Build, scoped to the failures.** The Doc Detective spike stays: it is the time-boxed step that
settles build or adopt, which item 7 requires either way. The harness then covers item 7's minimum
on the operator pages (every page under `docs/admin/` with a shell procedure or `--json` output,
run literally in the docs-and-binary container, with state-changing commands dry-run). It adds one
enumeration check, the one F1 and R4 need. Each jump-list title on a `docs/admin/` page is checked
against the `title` of its paired condition id in `tool/internal/spine/conditions.json`, over
every `docs/admin/` page that names titles. Pairing each title with its condition id keeps
`cairn health` entries, and conditions no command checks, from failing falsely.

Two failures fall outside that scope, and this record files them rather than building for them.
F4 and F6 are literal procedure failures on `CONTRIBUTING.md`, a core-developer page, and running
it needs a browser and the installed showcase in the repository image. D05, D10, D13, D14, and D18 are prose claims about `--json`
output on the three `cli-cairn-*` reference pages. Pass A caught D05 only by running a parser
against the goldens, and a literal run of a page's output block does not test such claims.

### The facts-container carry-forward

Task 2's ledger records that `check:facts` fails inside a repository-class export, because three
bullets cite `docs/internal/record/` paths the export excludes:
`docs/internal/facts/front-door.md:26`, `:50`, and `:108`. The core-developer job avoided the problem by not using `check:facts` as its
done signal. Task 11's repository-class jobs will need it. **Task 5 owns the fix**, since it
already changes `check-facts.mjs` and its tests. Its acceptance gains one bullet: `check:facts`
is green inside a repository-class export. The conductor pins the method in the dispatch:
re-source the three bullets to code (the triage work Task 7 does), or teach `check:facts` the
export's exclusion list.
