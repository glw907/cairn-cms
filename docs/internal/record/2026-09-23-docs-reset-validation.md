# Docs reset pass 1: validation scores (Task 11)

All four reader classes fail Task 11's acceptance. **docs-only** (the evaluator) catches both of
its plants but misses the baseline's F5 on its control pages and reports 9 false positives.
**docs-and-binary** (the operator) catches F1 and R4 on its control pages but misses 2 of its 3
plants and reports 4 false positives. **docs-and-site** (the designer and the extender) catches
F2 but misses F3, misses 4 of its 6 plants, and reports 12 false positives. **repository** (the
core developer and the scripter) catches F4 and F6 and 4 of its 6 plants, but catches only 1 of
the 9 held-out defects and reports 23 false positives. The regression batch replays: both batch
files parse, and every prepared directory exists. Every miss traces to verified Opus 5.5 runs that
did not name the defect. The five unverified Sonnet 5 runs decide no item. P06 is the one failing
item with a single Opus catch beside an unverified Sonnet run, and that Sonnet report does not
name the defect either. Under the plan's failure rule,
each failing class gets one fix round, tuned on the tuning half of pass A's 14 only. A class that
still fails after that round stops the pass.

## Evidence and scoring rules

- **Runs.** `~/.cache/docs-readers/results/validation-20260924/report.json` (39 runs) and
  `validation-rerun-20260924/report.json` (8 reruns). A rerun replaces its original. Runs 1 and 2
  are `claude-opus-5-5`, and run 3 is `claude-sonnet-5`. A run is evidence only when its final
  attempt has `verified.ok` true. Five final attempts are unverified: evaluator-control-3,
  designer-planted-3, designer-control-3, scripter-planted-3, and scripter-heldout-3. They count as
  not catching, and their findings are not counted as false positives.
- **Caught** (ruling 5). The defect's specific subject appears in a stall, an `assumed[]` entry, a
  check, or a `ruleCandidates[]` entry. Each catch is confirmed here against the plant record
  (`2026-09-23-docs-reset-planted-defects.md`) or the baseline record
  (`2026-09-23-docs-reset-baseline.md`). No run filled `checks[]`.
- **Finding** (for ruling 6). A finding is any item in those four fields that claims a page is
  wrong, contradictory, or silent on something the reader needed. Harness reports (a denied
  command, a missing binary, a file outside the job's set) and task-interpretation choices (a hue,
  a route name, a language) are not findings. This reading is symmetric with ruling 5: the report
  text a catch may come from is also the text a false positive may come from. Findings are
  counted once per run per subject, so an `assumed[]` entry and a rule candidate on the same
  subject in one run count once.
- **Real defect.** A finding is a real defect when the page states something false or
  self-contradictory against the code, or when it omits a fact the reader's task needs that no
  published docs page supplies. A finding is a false positive when the page or another published
  page already answers it, when the claim is wrong, when the fact asked for does not exist (a
  release calendar, a vendor figure the vendor does not publish), or when the gap is an artifact
  of the harness (a file or directory the export drops).
- **Which baseline failures apply to which job.** The baseline record places them this way:
  evaluator (docs set): F5, R1, R2, and R3. Operator (`docs/admin/is-it-working.md`): F1 and R4.
  Designer (`docs/extend/design-your-site.md`): F2. Extender: F3, on
  `docs/extend/restrict-admin-access.md`. The baseline's extender surfaced F3 there, and every
  extender run in this batch read that page. Core developer (`CONTRIBUTING.md`): F4 and F6.
  Scripter: none; its bar is the held-out ground truth. Every one of these still holds at
  `b2756399`, and the control pages are byte-identical to that commit.
- **The one Opus read.** This scoring read ruled every evaluator, operator, designer, extender,
  and core-developer finding. A separate `claude-opus-5-5` agent ruled the 48 scripter-control
  lines against the pages, the schemas, and `tool/`, and this read reviewed its rulings. Neither
  read saw a reader prompt or a job text.

## Bar 1: planted defects

Pass means caught in at least 2 of 3 runs.

| Plant | Job | Subject | Runs that caught it | Result |
| --- | --- | --- | --- | --- |
| P01 | evaluator | "hold ref" undefined (`why-cairn.md:22`) | 1 (`assumed[1]`, rc 5), 2 (`assumed[1]`, rc 2) | Pass |
| P02 | evaluator | Editors sign in with a GitHub account (`why-cairn.md:19-20`) | 1 (`assumed[0]`, rc 0), 2 (stall 0, `assumed[0]`, rc 0) | Pass |
| P03 | operator | `cairn doctor --dir .` (`is-it-working.md:16`) | 1 (`assumed[0]`, rc 3), 2 rerun (rc 1) | Pass |
| P04 | operator | `dist/migrations/0004_login_nonce.sql` (`:375`) | none | Fail |
| P05 | operator | Remedy omits `AUTH_DB` (`:224`) | 1 (rc 5) | Fail |
| P06 | designer | `/style-guide` route (`design-your-site.md:45,52,60,125`) | 2 (rc 3) | Fail |
| P07 | designer | `$lib/chassis` alias (`:17`) | none | Fail |
| P08 | designer | Delete `feed.ts` alone (`:116-117`) | none | Fail |
| P09 | extender | `src/club/section.ts` path (`add-a-custom-admin-screen.md:38`) | 1 (rc 3), 2 (rc 2) | Pass |
| P10 | extender | `createAuditSink` export (`:140,146,153`) | none | Fail |
| P11 | extender | Removed access-map rule step (`:79`) | 1 (rc 0), 2 (rc 0) | Pass |
| P12 | core-developer | `npm run lint:comments` (`CONTRIBUTING.md:101`) | none | Fail |
| P13 | core-developer | `vitest.workspace.ts` (`:98`) | 1 (rc 3), 2 (rc 3) | Pass |
| P14 | core-developer | Removed `npm run package` step for the showcase (`:20`) | none | Fail |
| P15 | scripter | `actor` has three values, no `registrar` | 1 (`assumed[2]`, rc 2), 2 (`assumed[5]`, rc 2) | Pass |
| P16 | scripter | Info check keyed on `info`, not `note` | 1 (`assumed[1]`, rc 1), 2 (`assumed[4]`, rc 0) | Pass |
| P17 | scripter | Empty registry exits 0 | 1 (rc 0), 2 (stall 1, rc 3) | Pass |

9 of 17 pass. Notes on the calls:

- **P03** is caught as an inconsistency, not as a failure. Both Opus runs ran plain `cairn doctor`
  and named `--dir .` as a form the page should drop. Neither ran it or said it fails.
- **P05.** Operator-planted-3's rule candidate names `AUTH_DB` only to say that doctor's own fix
  line should stop naming both bindings. That concerns the tool's output, not the page's remedy,
  so it is not a catch.
- **P06.** Designer-planted-3 (unverified) repeats `/style-guide` without flagging it.
- **P14.** Core-developer-planted-2's rc 5 asks how to rebuild `dist/` without `npm install`. That
  is the harness's install constraint, not the showcase step the plant removed.
- **Miss causes.** Every failing plant was missed by at least one verified Opus run. P04, P07,
  P08, P10, P12, and P14 were missed by both Opus runs. P05 and P06 were caught by one Opus run
  and missed by the other. The Sonnet run was verified and missed on P04, P05, P10, P12, and P14,
  and unverified on P06, P07, and P08. Going by the reports, the missed plants sit off the path
  each run took. Examples: the operator runs worked the bindings condition and never reached the
  nonce-migration section (P04); the designer runs re-skinned and never subtracted a chassis piece
  (P08); and the extender runs built read-only screens with no action or audit sink (P10).

## Bar 2: held-out defects

These are the scripter-heldout runs on pass A's tested page versions, scored under the baseline
record's rule. Heldout-3 is unverified.

| Defect | Subject | heldout-1 | heldout-2 | Result |
| --- | --- | --- | --- | --- |
| D01 | `verdict` and `exitCode` always agree | not found | not found | Fail |
| D03 | Expired hold reads `fail`, not `held` | not found | not found | Fail |
| D06 | `topEvents` sits inside `observed` | not found | not found | Fail |
| D08 | Sort collation is byte-wise | not found | not found | Fail |
| D09 | `degraded` meaning | not found | not found | Fail |
| D10 | `worstFirst` ranks by severity class, not verdict | not found | not found | Fail |
| D12 | `authCheck` row state to exit contribution | not found | not found | Fail |
| D16 | Doctor payload has no severity field | not found | not found | Fail |
| D18 | Empty stdout also from a cancelled run or tool fault | found (stall 1, rc 1) | found (`assumed[5]`, rc 3) | Pass |

1 of 9 pass. The baseline found D01, D03, and D18 in at least one usable run. This batch finds
D18 only. Near misses, not counted:

- **D01.** heldout-1 `assumed[2]` pairs the payload's `exitCode` with the process exit code, not
  with `verdict`.
- **D08.** heldout-1 rc 3 names check ordering (table order against `checkId`), not collation.
- **D12.** heldout-1 rc 5 names the `authCheck` row's `reason`, as the baseline's near miss did,
  not the row's state or its exit contribution.
- **D16.** heldout-1 rc 10 and heldout-2 rc 1 name the exit-3 precedence fold with a
  warning-severity FAIL, not the missing severity field.

Both Opus runs found tuning-half D02 (single payload on one line or several), which this bar does
not score.

## Bar 3: baseline failures on control pages

Pass means reported in at least 2 of 3 control runs.

| Failure | Job and page | Runs that reported it | Result |
| --- | --- | --- | --- |
| F5 | evaluator docs set: no current published version | none | Fail |
| R1 | evaluator, `why-cairn.md:41` | 1 (rc 1), 2 (rc 0) | Pass |
| R2 | evaluator, `migration-notes.md:429` | 1 (rc 5), 2 (rc 8) | Pass |
| R3 | evaluator, `sign-in-through-your-organization.md:345-346` | 1 (rc 4), 2 (rc 7) | Pass |
| F1 | operator, `is-it-working.md:67,102` against `:33` | 1 (`assumed[0]`, rc 1), 2 (rc 0) | Pass |
| R4 | operator, `is-it-working.md:74` against `:42` | 1 (rc 1), 2 (rc 2) | Pass |
| F2 | designer, `design-your-site.md:31-33` | 1 (`assumed[2]`, rc 0), 2 (`assumed[1]`, rc 0) | Pass |
| F3 | extender, `restrict-admin-access.md:21,51` | none | Fail |
| F4 | core-developer, `CONTRIBUTING.md:10-14` | 1 (stall 1, rc 0), 2 (stall 1, rc 0), 3 (stall 1, rc 0) | Pass |
| F6 | core-developer, `CONTRIBUTING.md:10-14,18` | 1 (stall 3, rc 2), 2 (stall 3, rc 3), 3 (stall 4, rc 2) | Pass |

Evaluator-control-3 is unverified and did not name F5 either. Operator-control-1 rc 1 reaches R4
through the jump list's `Guard role wiring` entry (`:126`): it asks for the printed title "Guard
is missing the declared role vocabulary", which is R4's subject. All three extender control runs
read `restrict-admin-access.md` and wrote their rule into the scaffold's `src/access.ts`, but none
reported the guide's `src/lib/cairn.access.ts`. Extender-planted-2 did report it (rc 0), on a
planted run. Even if F3 were excluded as off the extender's page, docs-and-site would still fail
bars 1 and 4.

## Bar 4: false positives

The cap is no class above 3 across its control runs. Only verified runs count.

| Class | Jobs (verified control runs) | False positives | Result |
| --- | --- | --- | --- |
| docs-only | evaluator (1, 2) | 9 | Fail |
| docs-and-binary | operator (1, 2, 3) | 4 | Fail |
| docs-and-site | designer (1, 2), extender (1, 2, 3) | 12 | Fail |
| repository | core-developer (1, 2, 3), scripter (1, 2, 3) | 23 | Fail |

### evaluator (docs-only)

| Run and item | Finding | Ruling | Evidence |
| --- | --- | --- | --- |
| 1 rc 2; 2 rc 4 | Say what happens when two editors edit one entry | False positive (2) | Answered at `docs/admin/troubleshooting.md:82-88` and `docs/editors/when-something-goes-wrong.md:41`; outside the job's docs set, not missing from the docs |
| 1 `assumed[2]`, rc 3; 2 `assumed[4]`, rc 3 | State a release cadence and upgrade effort | False positive (2) | cairn has no release calendar: releases are cut when warranted. `why-cairn.md:58-61` and `docs/admin/what-to-run-and-when.md:17-28` give the qualitative answer (the `Consumers must:` signal) |
| 2 rc 2 | Resolve whether the custom-domain certificate is billed | False positive | `before-you-start.md:75-78` states the vendor leaves it unconfirmed and where it would show up; no fact exists to add |
| 2 `assumed[3]`, rc 5 | State the publish-to-live time | False positive | `docs/editors/publish-and-history.md:23-24`: "The live site is rebuilding," which usually takes a moment |
| 2 rc 6 | Flag in `why-cairn.md` that organization sign-in is Unstable API | False positive | `why-cairn.md:19-21` is true as written. The linked page states the tier at `sign-in-through-your-organization.md:312-315`, and `why-cairn.md:58-61` states the pre-1.0 seam caveat |
| 2 rc 9 | Explain "a later 1.x release of the cairn CLI" in a pre-1.0 project | False positive | The CLI carries its own release line, stated at `docs/reference/cli-cairn-doctor.md:3` ("`cairn` 1.1.0, the current release") |
| 2 rc 10 | "Leaving is just cloning" covers content only | False positive | `before-you-start.md:44-46` is about ownership, and the repository holds the site's code as well as its content. `why-cairn.md:49-54` states the lock-in to cairn and Cloudflare |

Confirmed real, not counted: Cloudflare Email Sending carries no price anywhere in the docs
(1 `assumed[1]`, rc 0; 2 `assumed[2]`, rc 1). A second editor requires it
(`before-you-start.md:83-84`), yet "What it costs" (`:48-79`) omits it, and
`why-cairn.md:87` calls that section the complete cost picture.

### operator (docs-and-binary)

| Run and item | Finding | Ruling | Evidence |
| --- | --- | --- | --- |
| 1 rc 3 | The bindings fix should say `EMAIL` is not enough on `workers.dev` | False positive | The sending domain is its own condition and section, `email.sender-not-onboarded` (`is-it-working.md:98-101`). Declaring the binding clears `config.bindings-missing` |
| 1 rc 4 | Say whether a site without email on purpose can accept the FAIL | False positive | `is-it-working.md:220-222` states why both bindings are required for sign-in. Consistent with the baseline's own non-counting of this claim |
| 2 rc 3 | Say which binding is missing and that only it needs adding | False positive | `:220-221` says "`EMAIL`, ... `AUTH_DB`, or both", and the remedy at `:224-225` is correct for either case |
| 3 rc 0 | The reference should note `npx cairn` may be blocked in sandboxes | False positive | Harness: the run's own allowlist denied `npx` (stall 0). No page defect |

Confirmed real, not counted:

- **The send-email shape.** 1 stall 0 and rc 0: `is-it-working.md:226-227` sends the reader to
  `wire-the-delivery-surface.md` and `reference/cloudflare.md` for the binding "shape", and
  neither page mentions `send_email` or `EMAIL`. Operator-planted-2 hit the same gap.
- **The UNCHECKED reason.** 1 `assumed[1]`, rc 2 and 2 rc 1: the page never explains the reason
  "needs engine 0.97.0 or later, and one build". `tool/internal/doctor/facts.go:19` prints it for
  three checks whenever `src/content/.cairn/site-facts.json` is absent, that is, on any site not
  yet built. `is-it-working.md:13-17` gives no build step before `cairn doctor`, and `:48-57`
  explains `UNCHECKED` only for the symlink case. `cli-cairn-doctor.md:91-93` states the trigger
  in developer terms. The baseline listed this claim as "not counted"; this read overrules that
  for the operator's page, since its reader runs no code. Ruled a false positive instead, the
  class would carry 6.

### designer and extender (docs-and-site)

| Run and item | Finding | Ruling | Evidence |
| --- | --- | --- | --- |
| designer 1 rc 0 (first clause) | State that the dark `--color-primary` rotates too | False positive | `design-your-site.md:31-32`: "about fourteen values, light and dark". The rest of rc 0 is F2 |
| designer 1 `assumed[4]`, rc 1, rc 2 | No local way to check AA contrast; the build does not check it | False positive | `:44-48` says neither gate ships, and gives the check: by eye against `/styleguide` with a browser contrast checker, or copy the scripts in |
| designer 1 `assumed[3]`, rc 3 | List the benign build warnings | False positive | The page makes no claim about `npm run build` output. The warnings are the environment's (proxy, `checkOrigin` deprecation) |
| designer 2 `assumed[3]`, rc 1 | Same contrast subject | False positive | As above, `:44-48` |
| designer 2 rc 2 | Same build-warnings subject | False positive | As above |
| extender 1 rc 0; 2 rc 1 | How to express a members audience with no role vocabulary | False positive (2) | `restrict-admin-access.md:12-16` (the implicit `owner`/`editor` pair under `undefined`) and `:86-89` (`requireSession`/`requireEditor`) |
| extender 1 rc 1; 2 rc 0; 3 rc 0 | State that a read-only screen needs only `requireAccess` | False positive (3) | `add-a-custom-admin-screen.md:77-79` ties `createSectionAction` to "every action". The reference states it outright (`docs/reference/sveltekit.md`, the `requireAccess` entry, cited by extender-3). All three runs reached the right answer |
| extender 1 rc 2; 2 rc 2 | The untyped `load = (event) =>` snippet needs `PageServerLoad` for `svelte-check` | False positive (2) | Tested: the page's exact shape at `add-a-custom-admin-screen.md:59-62`, dropped into the prepared control site (`strict: true`), gives `svelte-check`: 0 errors, 0 warnings. SvelteKit types it automatically. Neither run observed an error; both wrote the annotation from the start |

Confirmed real, not counted: designer 2 rc 3. The scaffold's own theme files cite cairn-repository
internal documents that a scaffolded site does not contain:
`templates/waymark/src/theme/theme.css:6,67-68,201`, `site.css:18,34`, and
`src/chassis/prose.css:40` point at `docs/internal/public-design-system.md` and
`docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`.

### core-developer and scripter (repository)

Core developer, 9 false positives:

| Run and item | Finding | Ruling | Evidence |
| --- | --- | --- | --- |
| 1 rc 3; 2 rc 1; 3 stall 3, rc 2 | State that tests need a git checkout | False positive (3) | Harness: the repository export drops `.git`. A contributor works in a clone |
| 1 rc 4; 2 rc 4; 3 stall 2, rc 1 | Explain the missing `scripts/docs-readers/` | False positive (3) | Harness: the directory is tracked in the repository (`git check-ignore` negative) and dropped by the export |
| 1 rc 5 | Say whether the `docs-links` failures are expected | False positive | Harness: the export drops the internal docs the links target (baseline, stall row for core-dev) |
| 1 rc 1 | State the run time and the `&&` chain in `npm test` | False positive | `CONTRIBUTING.md:13` states what `npm test` runs. The chain (`package.json:79`) is ordinary shell semantics, and a unit failure is already a failed suite |
| 2 rc 2 | Same `&&` chain subject | False positive | As above |

Scripter, 14 false positives. The separate Opus read's groups, counted once per run:

| Runs | Group | Ruling | Evidence |
| --- | --- | --- | --- |
| 1 (`assumed[0]`, rc 6) | Where `--json` goes on the command line | False positive | Every form and example places it after the subcommand. It is a local cobra flag (`tool/cmd/cairn/doctor.go:42`) |
| 1 (rc 2), 2 (rc 4) | `held` in the doctor schema's state enum | False positive (2) | The schema is a superset. The prose (`cli-cairn-json-output.md:402-403`, `cli-cairn-doctor.md:107`) states runtime behavior (`tool/internal/doctor/json.go:18-23`), and a parser loses nothing by accepting it |
| 1 (rc 5) | `authCheck` `reason`: display text or code | False positive | `cli-cairn-json-output.md:376-377` says display text. The code agrees (`tool/internal/render/json.go:478`) |
| 1 (rc 8) | Does a doctor `fail` always carry `fix` | False positive | `cli-cairn-doctor.md:109`. The code sets it for every fail (`tool/internal/doctor/json.go:109-112,143-148`) |
| 1 (rc 10) | Several summaries or blank lines in a stream | False positive | `cli-cairn-json-output.md:47-49`: each `site` line is followed by one `summary` line, in NDJSON |
| 2 (`assumed[1]`, rc 5) | Single-site `exitCode` against a truncated stream | False positive | `cli-cairn-json-output.md:25-26`. Always set (`tool/internal/render/json.go:220-221`) |
| 2 (`assumed[4]`, rc 6) | Timeout, signal kill, codes outside 0 to 3 | False positive | `cli-cairn-exit-codes.md:79-80,95-97`. A signal exit is outside the tool's control |
| 2 (rc 7) | `--help` and `--version` with `--json` | False positive | `cli-cairn-exit-codes.md:105`. They are not payload commands (`cli-cairn-json-output.md:6-7`) |
| 2 (rc 9) | The freeze list includes doctor ids added in 1.1 | False positive | `cli-cairn-json-output.md:498-499`: adding an id is a minor event |
| 3 (`assumed[0]`, rc 1) | Trailing newline after the compact line | False positive | "One compact line" and NDJSON (`:42`, `:47`). The code writes `%s\n` (`doctor.go:105`, `sites.go:153`) |
| 3 (`assumed[1]`, rc 2) | Output encoding | False positive | RFC 8259 section 8.1 fixes JSON interchange as UTF-8. stderr is not parsed |
| 3 (rc 0) | Is a doctor check's `condition` required | False positive | The general table (`cli-cairn-json-output.md:80`) and the doctor statement (`cli-cairn-doctor.md:95`) agree. Always set (`tool/internal/doctor/json.go:107,133-138`) |
| 3 (rc 3) | Spawn failure against usage error against tool fault | False positive | A spawn failure is the caller's own error, never a cairn exit 3. The pages give the rest (`cli-cairn-exit-codes.md:79-80,95-97`) |

Confirmed real on the scripter's HEAD pages, not counted (runs 1 and 2; run 3 had none):

- **Empty stdout.** `cli-cairn-doctor.md:121-122` says a usage error is "the one case" that writes
  no payload. A tool fault also writes none (`tool/cmd/cairn/main.go:92-96`).
- **stderr under `--json`.** `cli-cairn-json-output.md:320` ("stderr is silent", unscoped)
  contradicts `:13`.
- **Schema evolution.** `additionalProperties: false` in every schema sits against fields added
  within version 1 (`:346-348`), and no page says readers must tolerate unknown keys.
- **The exit-codes page's could-not-run rule** omits doctor's `skip` to OK exception
  (`cli-cairn-exit-codes.md:44,52-53` against `tool/internal/doctor/status.go:62-70`).
- **`sites list` `errors`** carries an `--expect-sites` mismatch (`tool/cmd/cairn/sites.go:74-76`)
  that its definition (`cli-cairn-json-output.md:300-302`) does not cover.
- **"Seven checks"** (`cli-cairn-doctor.md:10-11`) omits `creds` and `engine`.
- **Doctor exit 3.** "Only non-passing results are UNCHECKED" (`cli-cairn-doctor.md:118`)
  contradicts the precedence fold its own example shows (`cli-cairn-json-output.md:413-439`).

### Where the false positives come from

Of the 48 false positives, 35 come only from `ruleCandidates[]`: wishes for more text on facts
another page states, or on facts that do not exist. Harness artifacts account for 8: the core
developer's missing `.git`, `scripts/docs-readers/`, and internal-docs targets, plus the
operator's `npx` denial. The two groupings overlap. Counted over stalls and `assumed[]` alone, which is not the
pre-registered reading, the classes would carry 3 (docs-only), 0 (docs-and-binary), 4
(docs-and-site), and 6 (repository).

## Bar 5: the regression batch

`parseBatch` (`scripts/docs-readers/lib/batch.ts`) parses both batch files against `loadClasses()`:

- **`batches/validation.json`**: 39 jobs. docs-only 6, docs-and-binary 6, docs-and-site 12,
  repository 15, covering all six jobs as planted and control plus three scripter held-out runs.
- **`batches/validation-rerun.json`**: 8 jobs.

All twelve prepared directories exist under `~/.cache/docs-readers/prepared/validation/`
(`<job>-planted` and `<job>-control` for each of the six jobs). The planted copies exist under
`~/.cache/docs-readers/planted/<job>/`, and the held-out pages sit under
`prepared/baseline/scripter-contract-pages`. The control pages match `b2756399` byte for byte.
**Pass.**

## Verdict per class

| Class | Bar 1 plants | Bar 2 held-out | Bar 3 baseline failures | Bar 4 false positives | Bar 5 | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| docs-only | Pass (2 of 2) | n/a | Fail (F5) | Fail (9) | Pass | Fail |
| docs-and-binary | Fail (P04, P05) | n/a | Pass | Fail (4) | Pass | Fail |
| docs-and-site | Fail (P06, P07, P08, P10) | n/a | Fail (F3) | Fail (12) | Pass | Fail |
| repository | Fail (P12, P14) | Fail (8 of 9) | Pass | Fail (23) | Pass | Fail |

## Reader reliability

| Model | Final attempts | Verified | First attempts verified |
| --- | --- | --- | --- |
| `claude-opus-5-5` | 26 | 26 | 24 of 26 (operator-planted-2 and operator-control-1 verified on rerun) |
| `claude-sonnet-5` | 13 | 8 | 7 of 13 (extender-planted-3 verified on rerun) |

The pre-registered one-line tolerance took Opus from 11 of 12 final attempts verified in the
baseline to 26 of 26. Sonnet went from 2 of 6 to 8 of 13. The five unverified Sonnet finals fail
on:

- a quote whose text is not in the file (designer-planted-3);
- a quote cited eight lines off (evaluator-control-3);
- pages read with no verified quote (designer-planted-3, designer-control-3, scripter-heldout-3);
- a degenerate report (scripter-planted-3's rerun has empty findings and one placeholder quote,
  `a.md:1` "hello").

No bar depends on a Sonnet run: every failing item also lacks two Opus catches. Counted tokens
were 1,402,994 for the batch and 347,062 for the rerun, 1,750,056 in all.
