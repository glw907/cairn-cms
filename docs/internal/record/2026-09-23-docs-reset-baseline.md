# Docs reset baseline: pass A's scripter-visible defects

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

## Baseline run

Pending: written after the baseline batch.
