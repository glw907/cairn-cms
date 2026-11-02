# cleanup design note

Run sheet pass 8. The sheet's section and `design-audit/design.md` hold the approved design; this note
records what the fresh reads changed and the calls the plan builds on. Reads: `2026-11-02-cleanup-sweep.md`
and `2026-11-02-cleanup-state-read.md` beside this file, both at `9ea74f78a`.

## Outcome

`main` is ready for the release's first candidate. The history files are reset with one rebuild line,
the scaffold reads as a site's and not the engine's, the Cleanup round's backlog is closed or re-placed,
the measured lists are ready for the release sitting, and the flake family has a traced cause or a sharper
record. No bump, no publish.

## What the reads changed

| Sheet or design says | Read says | Call |
| --- | --- | --- |
| Run "`check-version` ... follow the reset" | None needs code. `consumers-must-baseline.json` and `github-slug-contract.test.ts` do. `## 0.98.0` and both `## Unreleased` headings must stay | T17 |
| 38 `Consumers must:` lines | 124 actionable, plus p2-p4's | The reset replaces them with one rebuild line |
| R9 removes "up to 2,000 lines of past-pass detail" | `Now`, `Next`, `Later` are 214 bullets, mostly open filed items, with no done marks | Per-bullet read, 2,000 is a ceiling and not a target (T14) |
| Ergonomics 8 pins `cairn doctor` at a tool tag | No usable tag: `tool/v1.1.0` fails a rebuilt site, and `tool/v2.0.0` can't resolve | Done-gate line now; the workflow step is filed for after the tag (T9) |
| Pass 9 step 17 tags `tool/v2.0.0` | `tool/go.mod:1` has no `/v2`. Go: "Starting with major version 2, module paths must have a major version suffix like `/v2`" (go.dev/ref/mod). `go install ...@latest` stays on v1 | New find, so it lands here under the sheet's cutoff (T15) |
| `/styleguide` leaves production | An exclude also removes it from `npm run dev`, needs a nav strip, and breaks `theme-fixture`'s template arm | T7 takes all three |
| `--yes` "a doc names the manual path" | Also a code change: `chapter3.mjs:938-943` still consents | T7. Its file is on the `auth-data` map |
| R8: "e2e shard work" | One shard exists, so #208's "every retry was in shard 1" carries no signal | T10 removes the matrix; the backlog text is corrected |
| Sheet's class: `ordinary` plus `runner` | T5, T7, and T15 touch `auth-data` paths | `auth-data` by item: security read and live smoke at close, three-lens plan review |

## The flake family

The palette retries, the `container-fields` retries, and the `media-library` detail slide-over retries
fail the same way: a first click after `goto` opens nothing, and the expected dialog or region is
`element(s) not found` at 5 seconds. Run logs 41449836491, 41448301695, 41446423318, and 41451230576 show
it. `container-fields.spec.ts:174` is a bare click that `tool-fixes`' `openCreateDialog` swap missed. T11
tests the pre-hydration cause directly rather than sampling for it.

## Calls for `cairn-cms-9b`

Each is reversible and stated in the plan's "Stops". The plan is built on the recommended reading.

1. The path is calibrated (S1).
2. #248: reuse `throttled`, keep the oracle, add the binding (S2).
3. #247: hash ids and delete the prior row, accept the other two (S3).
4. #246 waits on #245's proof at the real install (S4).
5. #211 needs a key in a session's environment, so it moves after the release (S5).

## Out of scope

The R6 retirements, any gate removal, the five held majors, and anything in pass 9. `check:symbols` on
Unreleased prose (#249) moves after the release: it is in neither the sheet nor the launch list, and the
reset removes the text it would tune against. Extras go to `BACKLOG.md`.

## End-to-end check

CI green on the head, `check:close` green, `npm run emit:template` with no diff, the whole-branch review
folded, the security read and live smoke passed, and `create-site.yml` proves a scaffold builds with no
`/styleguide` and no engine narration.
