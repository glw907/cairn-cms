# Pass 4 `lean`: the health and logs debt

Initiative: cairn-setup
Round: tui-language
Pass: 4 lean

This pass clears debt items H1 to H10 in `tool/internal/health`, `tool/internal/logs`, and the
two files that spell the `"nameServers"` key, `tool/internal/record/record.go` and
`tool/internal/adopt/adopt.go`. Only H8 changes what anyone reads: it removes the dead actor name
`provider-console` from `cairn help agents`. Every other item leaves every byte of output alone.
The design is `~/Projects/initiatives/cairn-setup/specs/2026-11-13-tui-language-design.md`,
approved through design packet `20261113-224909-04cfc7`. The debt read is
`~/Projects/initiatives/cairn-setup/research/tool-debt-read-2026-11-13.md`, lines 119 to 140.
Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/tui-language-4`, branch
`tui-language-4`, cut from `tui-language-3` at `2f43ca391` (pass 3's PR-ready head, PR #249,
review accept). Class `ordinary`. Planned path 75 minutes against the design's 80: T1 (15),
then the longest pair, T2b (30), then T3 (30). The tasks sum to 120.

The pull request targets `main`. Until #247 and #249 merge, its diff carries pass 2's and pass
3's commits too, so the fast lane and every `git diff` in this plan use `$BASE`, never `main`.
`$BASE` is `2f43ca391`. If #249's head moves before this pass closes, merge
`origin/tui-language-3` into the branch, set `BASE=$(git merge-base HEAD origin/tui-language-3)`,
and rerun the gate and every acceptance check against the new `$BASE`, so a later pass-3 commit
is never counted as this pass's.

Every command in this plan runs from the worktree root unless it says `(from tool/)`.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a permission
rule.

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 70 rows; the log starts 2026-11-01 and runs to
  2026-11-15, so nothing older was seen). Classes and row counts: Self-Modification 10,
  unexplained classifier 10, Interfere With Workloads 9, Classifier unavailable 7, Destructive or
  Unwanted Actions 5, Merge Without Review 3, Auto-Mode Bypass 3, Irreversible Local Destruction
  2, Git Destructive 2, Create Public Surface 2, Unverifiable Deletion Scope 2, Sensitive-Source
  Provenance 2, Security Weaken 2, Undermining Oversight 2, and one each of Production Deploy,
  Secret-Store Writes, DNS/Domain/Cert, Bot Check Circumvention, Code from External, Shared
  Scratch Sweep, Safety Bypass Flag, Out-of-Place Publication, and PII Data Handling. The pass
  writes only repo files under `tool/` and `CHANGELOG.md`, no `.github/` or `.claude/` path, no
  setting, and no credential.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), folded under "Plan review
  fold". The class needs none; the round asks for one.
- Evidence: the mechanism table below. Every row is a probe run at `2f43ca391` on 2026-11-15 or
  a quoted source line. `git diff --stat 2f43ca391...origin/main -- tool` prints nothing after a
  fetch (`origin/main` at `5d675973f`), so the merge of `origin/main` before review moves no file
  this plan cites.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Interfere With Workloads, Destructive (2026-11-15: `pkill` of a fast lane; a kill-and-poll loop over `cairn` processes) | Never stop a process. A busy port 49152 is waited out with the read-only probe below. A hung command runs under `timeout`. |
| Self-Modification | No edit to any settings file, hook, or stow package. A refused step is never routed around by changing a setting. |
| Irreversible Local Destruction, Git Destructive (`git reset --hard`) | Never. A bad commit is reverted with a new commit. |
| Code from External (`go run ...@latest`) | Tools come from the Makefile and `go.mod` only. This pass adds no module. |
| Safety Bypass Flag (`--no-verify`) | Never. A failing hook is a defect to fix. |
| Shared Scratch Sweep | Scratch goes under `$CLAUDE_JOB_DIR/tmp/<task>`, never a glob delete over `/tmp`. |
| Create Public Surface | One draft PR against `main` on this branch. No release, tag, gist, or repo. |
| Merge Without Review (`gh pr merge`) | The executor never merges. The conductor lands the pass or holds it for the round's close packet. |
| Auto-Mode Bypass (`gh workflow run`) | CI runs from the push. Never trigger a workflow by hand. |
| Classifier unavailable | Retry the same call once after a pause. |

A step refused twice is left undone, flagged in its task report, and counted on `Calls:`, per the
round's standing answer 2.

### Port 49152

`make -C tool check` binds `127.0.0.1:49152` in the loopback tests, and a live `cairn new`
proving run holds the same port. Before every `make -C tool check` and every `go test ./...`,
run these two read-only probes:

```sh
ss -Hltn 'sport = :49152'
pgrep -ax cairn
```

Free means `ss` prints nothing and `pgrep` exits 1 (both true at planning, 2026-11-15). Any line
means a proving run is live: wait with a `Monitor` until-loop on the `ss` probe, and never stop
the holder.

## Mechanism table

| Mechanism | Evidence at `2f43ca391` |
| --- | --- |
| A check id missing from `failSeverity` already reports critical | `failSeverityOf` returns `failSeverity[id]` (`severity.go:31-33`), and `spine.FailSeverity`'s zero value is `CriticalFailure` (`spine/exit.go:65-74`). The map's eight critical rows are the zero value written out. |
| The severity tests | `severity_test.go`: `TestFailSeverityCoversExactlyTheCheckSet`, `TestEngineIsTheOnlyWarningFailure`, `TestFailSeverityOfAnUnknownCheckIsCritical`, `TestAHeldFailureWarnsAndALapsedHoldTakesItsOwnSeverity`. |
| The fixed-literal message functions | 27 zero-argument `func detailX() string` in `health/messages.go`, called from every `check_*.go`, six `check_*_test.go` files (delegation, email, errors, https, publish, serving), `outcome.go`, and `Catalogue` (`messages.go:357-398`). Every body is a literal or a constant concatenation, and none is used as a function value. The parameterized renderers at `messages.go:95,163,183,191,203,210,247,255,274` stay functions. |
| The copy list reads health at run time | `cmd/copylist/main.go:74`: `sortedUnique(append(health.Catalogue(), health.FixLines()...))`. The output is sorted and deduplicated, so a constant in place of a function leaves `testdata/copy.golden.md` byte-identical. |
| `cmd/cairn` restates `needsClient` | `cmd/cairn/health.go:211-212`: `t == health.TierCF \|\| t == health.TierBoth` and the GH twin, in `runStatus`. `needsClient` is `health.go:88-100`, a switch with `default: true`. `cmd/cairn/health.go` is 269 lines against the 280 bound. |
| The `"nameServers"` key, twice | Read in `assignedNameServers` (`check_delegation.go:82-94`, called at `:33` and from `diagnoseUnreachable`, `check_serving.go:152`); written in `setNameServers` (`adopt.go:205-214`, called at `:191`). `record.Cloudflare` (`record.go:81-93`) carries the key in `Extra []ExtraField`. |
| The zone lookup, twice | `delegationCheck.Run`: `c.CF.ZoneByName` at `check_delegation.go:41-50` and again at `:62-71`, each returning the same `detailDelegationNoZone` outcome on a nil zone. A record that carries its pair makes no `ZoneByName` call when the live nameservers don't match: `:55-60` returns first, and `check_delegation_test.go:110-111` says so. No test counts the calls. |
| `Options.Validate` has no outside caller | Called at `health.go:117` and `options_test.go:27` only. |
| `logs.RetentionClamp` has no outside caller | Declared `logs.go:76` (doc 70-75); used at `logs.go:122` (`clampSince`) and in doc comments at `logs.go:24` (the exported `Query.Since` field), `:289`, `:322`; tested at `logs_test.go:551-555`. |
| `verboseField` is test-only | Declared `outcome.go:30`; called at `report_test.go:130,169,196` only. Named in comments at `outcome.go:13,52`, `check_errors.go:33`, `report.go:56`, `report_test.go:217`. |
| The serving seams | `probeServing(ctx, probe, r, domain)` is called once, with `r.Domain` (`check_serving.go:33`). `diagnoseUnreachable(ctx, probe, r, domain, budget)` is called once, with `r.Domain` and `providers.RequestTimeout` (15 s, `providers/transport.go:25`) at `:55`. Tests pass `record.Record{}` with a server address as `domain` (`check_serving_test.go:66,81,100,118,129,143`); `TestDiagnoseUnreachableSweepSharesOneDeadline` passes a 100 ms budget over three blocking nameservers. |
| No table produces `ActorProviderConsole` | `fixes.go:22` declares it. `fixesByCondition`, `fixesByCode`, and `fixesByReason` (`fixes.go:59-200`) name only `ActorOperator`, `ActorDeveloper`, and `ActorRegistrar`. |
| Where `provider-console` is spelled | `grep -rn 'provider-console\|ActorProviderConsole'` over `*.go *.json *.mjs *.ts *.md`, `docs/internal` left out: 13 hits. `fixes.go:20,22`, `fixes_test.go:413`, `cmd/cairn/messages.go:270`, `cmd/cairn/help_contract_test.go:76`, `testdata/copy.golden.md:330`: this pass. `schema/cairn-health.schema.json:75`, `ROADMAP.md:1687`: left, filed (Decision 3). `tool/docs/design/reviews/agent-usability.md:125,192,417,483,554`: left, a dated review record. No hit in `docs/admin`, `docs/editors`, `skills/`, or any `cmd/cairn/testdata/help/*.golden`. |
| No test reads the schema's actor enum | `grep -rln 'cairn-health.schema'` finds `render/json_schema_test.go` and `src/tests/unit/gate-tier.test.ts`; neither names `actor` or compares an enum with the Go set. `json_schema_test.go:284` only checks a value is inside an enum, so a superset enum still validates every payload. |
| The help text H8 edits | `cmd/cairn/messages.go:270` is one hard-wrapped line: "an operator's fix. actor is operator, developer, provider-console, or registrar." `help_agents_test.go:89` pins "actor is operator" and "carries a\ncommand" (line 272), which the one-line edit keeps. |
| H9's three nits | `buildState.String` (`check_deploy.go:47-59`) has `case buildNone: return "none"` beside the same fallthrough. `fixForCondition` and `fixForCode` (`fixes.go:211-221`) are one-line map reads called only from `FixFor` (`:228,231`). `Events` (`logs/events.go:91-95`) is `make` plus `copy`. |
| The retired Node files are gone | `find packages/create-cairn-site -name 'chapter*.mjs' -o -name zone.mjs -o -name hostname.mjs -o -name records.mjs` finds nothing; the package holds `bin.mjs`, a launcher for `cairn new`. |
| Exports today, with an outside non-test reader | `go doc -short` and a selector grep (table under item 3). No outside selector: `health.Actor`, `ActorDeveloper`, `ActorProviderConsole`, `ActorRegistrar`, `TierNone`; `logs.Field`, `logs.Records`, `logs.RetentionClamp`. |

## Scope

The pass row is `tool/internal/health/**`, `tool/internal/logs/**`, `tool/internal/adopt/adopt.go`,
`tool/internal/record/**`, `tool/cmd/cairn/{health,messages}.go`, and `CHANGELOG.md`.

Out-of-row paths this pass writes:

- `tool/testdata/copy.golden.md`, regenerated by `make -C tool copy-list`. Acceptance item 1
  names it.
- `tool/cmd/cairn/help_contract_test.go`, one token (Decision 2).
- `tool/internal/adopt/adopt_test.go` and `tool/internal/record/record_test.go`, only if a test
  there names `setNameServers` or needs a case for the accessor.

The pass touches none of `tool/internal/setup/{loopback,signin,runner}*`, `tool/internal/secrets/**`,
or `tool/internal/providers/**`; a task that needs one parks the pass, because that would change
the class to `auth-data`. It touches no `.github/**` path and no file under any `testdata`
directory except `tool/testdata/copy.golden.md`. `MIGRATION-NOTES.md` is not in the row
(Decision 4).

## Decisions made at planning

1. `[advisor]` `Call:` Acceptance item 3's check, amended. Read strictly, as pass 1's
   `TestEveryExportHasACaller` reads it (an exported name selected by a non-test file outside the
   package), item 3 fails on the members of two closed sets (`ActorDeveloper`, `ActorRegistrar`,
   `TierNone`) and on two types read only through a returned value (`logs.Field` through
   `Entry.Fields`, `logs.Records` through `FetchRecords`). H3's own prescription, `Tier.UsesCF` and
   `UsesGH`, then strands `TierCF`, `TierGH`, and `TierBoth` too. Meeting the strict reading
   needs `internal/render` and `cmd/cairn` test files outside the row and unexports enum members
   that render and the JSON payload carry. The amended check: a type counts as called when a
   non-test file outside its package reads a value of it, and a member of a closed set counts
   when a non-test file in its package also produces it. It fails today on exactly
   `logs.RetentionClamp` and `health.ActorProviderConsole`, which H6 and H8 remove, so it still
   fails for the reason the pass fixes. Passed over: the strict reading, with the out-of-row test
   edits. Reversing it unexports eight names and edits render's and `cmd/cairn`'s tests.
2. `[advisor]` `Call:` `[file-list]` `cmd/cairn/help_contract_test.go:76` lists
   `provider-console` among the words `cairn help agents` must carry, so H8 cannot land without
   dropping that token. The row omits the test that pins the row's own help text; the design
   names the help change. Passed over: park H8. Reversing it restores one word in
   `fixes.go`, `messages.go`, and this test.
3. `[advisor]` `schema/cairn-health.schema.json:75` keeps `provider-console` in the actor enum.
   The design puts `--json` changes out of scope, the file is outside the row, and a superset enum
   still validates every payload this tool writes. One `standards:log-issue` filing names it and
   `ROADMAP.md:1687`, whose "Later" entry on this debt the pass closes. Standing answer 6.
4. `[advisor]` `MIGRATION-NOTES.md` stays untouched: it is outside the row and nobody upgrading
   has a step to take. Pass 2's changelog entry and `MIGRATION-NOTES.md:90` both say pipe output is
   unchanged "apart from one sentence in `cairn --help`"; H8 makes `cairn help agents` a second
   such change. The pass's `CHANGELOG.md` entry says so, and the PR lists the notes sentence as
   now incomplete for the round's close to reconcile.
5. `[advisor]` H7's seams: `probeServing` and `diagnoseUnreachable` drop their `domain`
   parameter and read `r.Domain`; their tests set `record.Record{Domain: ...}`. `diagnoseUnreachable`
   keeps `budget`. The shared-deadline property (one ceiling for the whole sweep, never one per
   nameserver) is visible only through a short budget: a deadline on the parent context would
   pass that test even with per-nameserver budgets, and the production value is 15 s. The
   architecture reader is told the budget parameter is kept and why. Passed over: drop `budget`
   and bind the test to `providers.RequestTimeout`. Method call.
6. `[advisor]` H4's accessor is a method pair on `record.Cloudflare`: `NameServers() []string`
   (nil on a missing or undecodable key, as `assignedNameServers` does today) and
   `SetNameServers([]string)`, which replaces the key's entry when one exists and appends one
   otherwise, so `Marshal`'s key order is unchanged for every record today's code writes.
   The setter encodes with `json.Marshal`, as `setNameServers` does today, never the package's
   `rawOf` (`marshal.go:105-114`): the two differ on `<`, `>`, and `&`, which no hostname
   carries, but `json.Marshal` is the byte-identical choice. `json.Marshal` of a `[]string`
   cannot fail, so the setter returns nothing and `adopt.go`'s unreachable "encode nameservers"
   error goes, with its `encoding/json` import. The key is one unexported const in `record`. The
   rule that writes nothing for an empty pair stays in `adopt.go`, with its comment. Both methods
   have a caller outside `record`. Byte-neutrality holds by `marshal.go:39-97`: adopt builds a
   record with nil order, so the typed fields print first and Extra after, and a replace in place
   keeps a parsed record's observed position. Adopt (`adopt.go:191`) is the only writer of the
   key. Method call; the design names "a typed accessor on `record.Cloudflare`".
7. `[advisor]` H10 reaches past item 2's grep. The reader gets H10's text and will flag a retired
   Node name with no `.mjs`: `checkDelegation`, `confirmHostname`, `runChapter3`, "the Node CLI",
   "ported from", and "ports" used as "re-implements". Each comment keeps the fact it carries and
   loses the citation. Dated comments keep the measurement and lose the date
   (`logs.go:60,83,128,148,329`, `check_errors.go:20`, `messages.go:225`). `check_email.go:15`
   matches on the date inside its URL: the link goes and "captured live on an onboarded zone"
   stays. `check_engine.go:34` cites a live script, `scripts/checks/check-consumers-must.mjs`;
   it becomes "`npm run check:consumers-must`", which names the same reader without the filename.
   `messages.go:276` is code: `expiry.Format("2006-01-02")` becomes `expiry.Format(time.DateOnly)`,
   the same layout string. "The Node CLI" in `record/` and `adopt.go` comments states the
   record's on-disk origin, outside H10's two packages: the pass leaves it and files it.
8. `[advisor]` No screenshot round. The pass changes no terminal paint: every render, specimen,
   and help golden under `testdata` stays byte-identical, which item 1 checks, and H8's change
   is to plain help text that a pipe golden carries. `standards:tui-visual-verify` governs a claim
   about painted output, and this pass makes none. Method call.
9. `[advisor]` H1 shrinks `failSeverity` to the one row that departs from the zero value,
   `"engine": spine.WarningFailure`. The creds paragraph stays, reworded to say why creds is
   absent from the table (it takes the critical default on purpose). `TestFailSeverityCoversExactlyTheCheckSet`
   becomes a test that every key in `failSeverity` is an id in `All`, so a renamed check cannot
   leave a stale row. `TestEngineIsTheOnlyWarningFailure` ranges over the map today
   (`severity_test.go:32`), which would pass vacuously after the shrink, so it is rewritten to
   walk `All` through `failSeverityOf`. The doc comment at `severity.go:5-7`, which says the test
   asserts full coverage, is reworded to the new test. Method call.

No `[advisor]` line in #247 or #249 is built on here. Pass 3's `requireCF` helper and its
regenerated copy golden are this branch's starting state; H3 edits `cmd/cairn/health.go:211-212`,
which pass 3 left as it found it.

## Standing answers

The twelve in `round-run.md` hold, with the round's seven:

1. A pass may run to twice its path minutes while each retry fixes a traced cause: 160 minutes on
   the design's 80. The plan's path is 75, which leaves 85.
2. (Pass 1 only.)
3. A pipe golden changes. Fix the code.
4. (Settled by pass 1.)
5. A string the copy catalogue lacks. Draft it to `copy-standard.md`, run `cairn-register-editor`,
   and list it in the PR. This pass adds no string.
6. A debt item turns out to change output, or to need a file outside its pass. Leave it, file it
   through `standards:log-issue`, and list it in the PR.
7. The busy check exits 1. Nothing launches.

## Tasks

Every task goes to a `cairn-implementer` in its own worktree off `tui-language-4`, Sonnet at
`medium`. After each accepted task, run `npm run lane:fast -- --range "$BASE"..HEAD`, and,
after the port probes, `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Once the
branch is pushed, each accepted task's report names the CI verdict on its head, or says CI has
not run on it. Skills:
`standards:go-conventions` for every file under `tool/`, `standards:golang-spf13-cobra` for
`tool/cmd/cairn`. No task touches Bubble Tea code, so `standards:elm-conventions` loads only if
one turns out to.

Line numbers are at `2f43ca391`; each task re-reads its sites first. Run order: T1, then T2a,
T2b, and T2c together as pairs, then T3. The split keeps every file in one task of a step.

### T1. H2: message constants (15 min)

- Each of the 27 zero-argument `detailX() string` functions in `health/messages.go` becomes an
  unexported `const detailX = "..."` with its doc comment, and every call site drops the `()`
  (`check_*.go`, `outcome.go`, `check_*_test.go`, `Catalogue`). The nine parameterized renderers
  stay functions.
- `Catalogue` keeps its signature and its order, listing the constants beside the `tmpl*`
  constants already there.
- Run `make -C tool copy-list` and confirm `git diff --exit-code -- tool/testdata/copy.golden.md`.

Accept: `make -C tool check` passes; `grep -cE '^func detail[A-Za-z]+\(\) string' tool/internal/health/messages.go`
prints 0; the copy golden is unchanged.

### T2a. H1, H3, and H6: severity, tiers, and the two unexports (20 min)

Owns `severity.go`, `severity_test.go`, `health.go`, `health_test.go`, `options.go`,
`options_test.go`, `logs/**`, and `cmd/cairn/health.go`.

- H1, by Decision 9.
- H3: `func (t Tier) UsesCF() bool` (true for `TierCF` and `TierBoth`) and `UsesGH`, each with a
  one-line doc comment. `needsClient` becomes `(!tier.UsesCF() || c.HaveCF) && (!tier.UsesGH() || c.HaveGH)`,
  which keeps `default: true` for `TierNone` and an unknown tier. `runStatus`'s two closures
  (`cmd/cairn/health.go:211-212`) become the method expressions `health.Tier.UsesCF` and
  `health.Tier.UsesGH`, which match the field type `func(health.Tier) bool` at `:209`.
- H6: `Options.Validate` becomes `validate`; `RetentionClamp` becomes `retentionClamp`. The
  exported `Query.Since` doc (`logs.go:24`) says "clamped to the seven-day retention window" in
  place of the constant's name; the other doc mentions follow the rename. Test names and comments
  that say `Options.Validate` or `RetentionClamp` follow too. One mention is outside the row,
  `tool/internal/render/fixtures/fixtures_test.go:14`: leave it and file it.
- H9's `logs/events.go` nit: `Events` returns `slices.Clone(eventVocabulary)`, with the `slices`
  import.
- H10 in `logs.go`: Decision 7's dated comments at `:60,83,128,148,329`.

Accept (from `tool/`): `make check` passes; `go doc ./internal/logs` lists no `RetentionClamp`;
`go doc ./internal/health Options` lists no `Validate`; `go doc ./internal/health Tier` lists
`UsesCF` and `UsesGH`.

### T2b. H4, H5, and H7: the accessor, the zone read, and the seams (30 min)

Owns `record/**`, `adopt/adopt.go`, `adopt/adopt_test.go`, `check_delegation.go`,
`check_delegation_test.go`, `check_serving.go`, `check_serving_test.go`, `outcome.go`,
`report.go`, `report_test.go`, and `check_errors.go`.

- H4, by Decision 6. `assignedNameServers` goes; its two callers read `r.Cloudflare.NameServers()`.
  `setNameServers` goes; `adopt.go:191` calls `r.Cloudflare.SetNameServers` when the pair is
  non-empty. No `record/testdata` fixture and no adopt test carries the key today, so nothing
  yet proves what adopt writes. Before changing the code, capture today's bytes at `$BASE`
  (`json.Marshal` plus the append path) for two records: one built with nil order, as adopt
  builds it, and one parsed from JSON that already carries `nameServers` (replace in place). New
  `record_test.go` cases run each through `SetNameServers` and `Marshal` and compare with those
  bytes held as inline literals; `NameServers` reads each back after `Parse`. No testdata file
  is added.
- H5: one function reads the zone and settles the nil-zone outcome, and both sites in
  `delegationCheck.Run` use it. The call count stays what it is today: at most one `ZoneByName`
  call, and none when a recorded pair doesn't match the live nameservers. A
  `check_delegation_test.go` case with a counting round-tripper asserts zero calls on the
  mismatch path and one call each on the match path and the no-pair path.
- H7: delete `verboseField`; the three test calls build their field with a test-file helper or a
  `spine.OutcomeField` literal; the comments at `outcome.go:13,52`, `check_errors.go:33`,
  `report.go:56`, and `report_test.go:217` name `verboseObservedField` or the `Verbose` flag
  instead. The seams follow Decision 5.
- H10 in these files: `check_delegation.go:26,78-79,97,112-113,117`,
  `check_serving.go:14-15,36,58,81,130`, `check_errors.go:20`, by Decision 7.

Accept: `make -C tool check` passes; `git diff --exit-code "$BASE" -- tool/internal/record/testdata`
passes; `grep -rn '"nameServers"' tool/internal --include='*.go' | grep -v _test.go` prints one line,
the const in `record/`.

### T2c. H8, H9, and the rest of H10 (25 min)

Owns `fixes.go`, `fixes_test.go`, `check_deploy.go`, `check_email.go`, `check_engine.go`,
`check_https.go`, `check_publish.go`, `health/messages.go`, `cmd/cairn/messages.go`,
`cmd/cairn/help_contract_test.go`, `tool/testdata/copy.golden.md`, and `CHANGELOG.md`.

- H8: delete `ActorProviderConsole` and its comment, and make "The four Actor values" say three.
  `fixes_test.go:413` drops it from the valid set, and `TestFixLineActorIsOneOfTheFour` with its
  "one of the four declared values" (`:410,416`) says three. `cmd/cairn/messages.go:270` becomes "an
  operator's fix. actor is operator, developer, or registrar." with no other line rewrapped.
  `help_contract_test.go:76` drops the token (Decision 2). Run `make -C tool copy-list`; the
  golden diff is that one line.
- H9: drop `case buildNone` from `buildState.String`; inline `fixForCondition` and `fixForCode`
  into `FixFor`.
- H10: `fixes.go:28-30` loses "re-homed here from the mockups' remedy.go sketch";
  `check_deploy.go:24,126`, `check_email.go:15,20-21,85`, `check_engine.go:34`,
  `check_https.go:39`, `check_publish.go:52`, `health/messages.go:225,276`, by Decision 7.
- `CHANGELOG.md` under `## Unreleased`, after pass 3's entry: one bullet saying `cairn help agents`
  no longer lists `provider-console` as a fix actor, since no check ever named it, and that apart
  from that line the round's pipe output is still unchanged. `Consumers must: nothing.`
- File through `standards:log-issue`, with a `Placement` line: the schema enum and `ROADMAP.md:1687`
  (Decision 3), and the "Node CLI" comments in `record/` and `adopt.go` (Decision 7).

Accept: `make -C tool check` and `make -C tool check-copy` pass; `git diff --numstat "$BASE" -- tool/testdata/copy.golden.md`
prints `1	1`.

### T3. Acceptance, the reader, and close (30 min, with T3's reads in parallel)

1. Merge the three pairs; rerun `make -C tool copy-list` once and confirm the golden diff is still
   the one line.
2. Run every acceptance check below and record each output in the PR.
3. Dispatch four fresh `standards:go-architecture-reader`s in one message, one per package
   (`internal/health`, `internal/logs`, `internal/record`, `internal/adopt`), each handed the
   debt read's text for H1 to H11 (lines 119 to 140), the "Debt items" table below, and
   Decision 5's reason for keeping `budget`. Each reports whether any item is still open in its
   package. H10 and item 2 cover non-test files only: the 25 test-file hits of item 2's grep are
   out of scope, and a reader that flags one has it filed. A finding outside H1 to H10 is filed,
   not fixed.
4. Fold an open item once, by a `cairn-implementer`, and rerun only the reader whose package it
   touched. A second open verdict on one item is a stop for the advisor, never a third round.
5. Close as below.

## Acceptance

Every pass:

E1. `make -C tool check` passes, the tool's CI passes on Linux, macOS, and Windows
(`.github/workflows/tool.yml`). A pty test that skips on an OS counts only where it ran: the PR
shows its `-v` line from the Linux job.
- Task: all. Check: the gate's last line; `ci-green <sha> --pr <n> --wait` exit 0. This pass adds
  no pty test; the PR quotes the Linux job's `-v` lines for the existing `reporte2e` pty tests.

E2. A fresh `standards:go-architecture-reader`, handed the text of the pass's debt items, reports
none of them still open in the packages the pass cleaned.
- Task: T3. Check: the four readers' verdicts in the PR. H11 is marked left by the design, and a
  reader checks it for its reason, not a fix.

Pass 4, `lean`, verbatim:

1. No changed file under any `testdata` directory except the help and copy-list goldens, whose
   diff is the one removed actor name, and that name appears in neither golden.
   - Task: T2c. Check: `git diff --numstat "$BASE"..HEAD -- '*testdata*'` prints exactly one
     line, `1	1	tool/testdata/copy.golden.md`, and
     `grep -c provider-console tool/testdata/copy.golden.md tool/cmd/cairn/testdata/help/*.golden`
     prints 0 for every file. The help goldens carry `cairn --help`, which holds no actor name, so
     they do not change.
2. `grep -rnE '\.mjs|Task [0-9]|20[0-9]{2}-[0-9]{2}-[0-9]{2}' tool/internal/health tool/internal/logs --include='*.go'`,
   test files left out, prints nothing.
   - Task: T2a, T2b, T2c. Check: the command piped through `grep -v '_test.go:'`, empty. At
     planning it printed 19 lines, every one listed under Decision 7.
3. `go doc ./internal/health` and `go doc ./internal/logs` list no exported name without a caller
   in a non-test file outside its package.
   - Amended check (Decision 1, `Call:`): a type counts as called when a non-test file outside
     its package reads a value of it, and a member of a closed set counts when a non-test file in
     its package also produces it. The PR carries the `go doc -short` listing of each package and,
     for every name, the one `file:line` that meets the rule. At planning the rule failed on
     exactly `logs.RetentionClamp` and `health.ActorProviderConsole`.
   - Task: T2a, T2c. Check, from `tool/`: list the names with `go doc -short ./internal/health`,
     `go doc -short ./internal/logs`, and, since `-short` folds a const group into its first
     member, `go doc ./internal/health Actor` and `go doc ./internal/health Tier`. For each name
     `$N` in package `$P`, find an outside selector with comment lines dropped:

     ```sh
     grep -rnw --include='*.go' --exclude='*_test.go' "$P\.$N" cmd internal \
       | grep -v "^internal/$P/" | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//'
     ```

     A name with no hit meets the rule only through a read of its type's outside value use (a
     type) or a producing line in its own package (a closed-set member), cited by hand.

The rule's cite table at planning, before the pass:

| Name | Cite meeting the rule |
| --- | --- |
| `health.Ack`, `Acks` | `cmd/cairn/ack.go:41`, `:54` |
| `health.Actor` | read outside as `Fix.Actor`: `internal/render/layout.go:238`, `render/json.go:326` |
| `ActorOperator` | `internal/render/json.go:329` |
| `ActorDeveloper`, `ActorRegistrar` | produced in `fixes.go` (for example `:77`, `:117`); type read outside |
| `ActorProviderConsole` | none: fails, removed by H8 |
| `health.All`, `Check` | `cmd/cairn/health.go:223`, `deps.go:80` |
| `Catalogue`, `FixLines` | `cmd/copylist/main.go:74` |
| `CheckResult`, `Clients`, `Report`, `Run`, `Options` | `cmd/cairn/report_terminal.go:167`, `health.go:202`, `health_json.go:16`, `health.go:102`, `health_sweep.go:251` |
| `DefaultBranch`, `ReasonPhrase`, `Verdicts` | `cmd/cairn/auth_check.go:168`, `auth_check_terminal.go:102`, `health_sweep.go:112` |
| `FieldEngineInstalledVersion`, `FieldGitHubTokenExpiry` | `internal/render/body_many.go:384`, `cmd/cairn/health.go:243` |
| `Fix`, `FixFor`, `FixForReason` | `internal/render/layout.go:216`, `render/json.go:316`, `:318` |
| `Tier` | `cmd/cairn/health.go:209`; after H3, `check.Needs()` at `:224` |
| `TierNone`, `TierCF`, `TierGH`, `TierBoth` | produced by each check's `Needs` (for example `check_serving.go:29`, `check_delegation.go:24`, `check_deploy.go:136`); type read outside |
| `logs.Entry`, `Events`, `Fetch`, `ParseSince`, `Query` | `cmd/cairn/logs.go:111`, `:56`, `:96`, `cmd/cairn/health.go:264`, `logs.go:96` |
| `logs.ErrObservabilityOff`, `FetchRecords` | `internal/health/check_errors.go:87`, `:85` |
| `logs.Field` | read outside through `Entry.Fields`: `cmd/cairn/logs.go:154` |
| `logs.Records` | read outside through `FetchRecords`'s result: `internal/health/check_errors.go:99` (`records.Truncated`) |
| `logs.RetentionClamp` | none: fails, unexported by H6 |

## Debt items, verified at `2f43ca391`

| Id | Site now | Disposition |
| --- | --- | --- |
| H1 | `severity.go:16-26` | T2a, Decision 9 |
| H2 | `messages.go` 27 functions, `Catalogue` `:357-398` | T1 |
| H3 | `cmd/cairn/health.go:211-212` (`[stale-fact]` the read says 233-234), `health.go:88-100` | T2a |
| H4 | `check_delegation.go:82-94`, `adopt.go:205-214` | T2b, Decision 6 |
| H5 | `check_delegation.go:41-50,62-71` | T2b |
| H6 | `options.go:29`, `logs.go:76` (`[stale-fact]` the read says 171) | T2a |
| H7 | `outcome.go:30`, `check_serving.go:40,149` | T2b, Decision 5 keeps `budget` |
| H8 | `fixes.go:22`, `cmd/cairn/messages.go:270` (`[stale-fact]` the read says 240) | T2c, Decisions 2 and 3 |
| H9 | `check_deploy.go:49`, `fixes.go:211-221`, `logs/events.go:92` | T2a (`events.go`), T2c |
| H10 | 19 grep lines plus the Node names under Decision 7; `logs.go` lines `[stale-fact]` (the read's 155-162, 178, 223, 243 are 60, 83, 128, 148, 329 now) | T2a, T2b, T2c |
| H11 | `health/messages.go` error templates | Left, by the design |

## Close

1. Merge `origin/main` into the branch.
2. Dispatch `standards:diff-reviewer` (whole-branch, from `$BASE`) and fold its findings first.
   After the last fold, rerun the gate, `npm run check:docs-gate`, and the acceptance checks. A
   Low finding from a delta read is folded once, checked by your own diff read and CI, or filed;
   it never starts another review round.
3. The PR body opens with a paragraph per `~/.claude/docs/voice/written-for-people.md`, then the
   four lines `Round:`, `Pass:`, `Review:`, `Calls:`, what landed, the copy-golden diff, the
   out-of-row file list, `## Decisions` (each `[advisor]` line here and every one the executor
   adds), `## Calls for Geoff` (each `Call:` line), `## Planning misses`, the score,
   `## Acceptance` with each item's evidence, and the filed issues with their numbers.
4. STATUS for the conductor. Mark the PR ready with its `Review:` and `Calls:` lines.

## Planning misses

- `[check]` Item 3's check cannot be met as pass 1 read "caller" without leaving the row, and
  H3's prescription strands three more names under that reading (Decision 1). The design's
  acceptance run should have run the selector grep once.
- `[file-list]` The row omits `cmd/cairn/help_contract_test.go`, which pins the help line H8
  changes (Decision 2).
- `[stale-fact]` The debt read's line numbers for H3, H6, H8, and H10's `logs.go` sites had
  drifted.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`): approve after folds, fourteen findings,
all folded.

- Major: H5's call count was false (a recorded pair that doesn't match makes no `ZoneByName`
  call). T2b now keeps today's count and adds a counting test.
- Major: item 3 named a grep the plan never showed, and five cites landed on comments. The
  command is written out with comment lines dropped, the per-type `go doc` calls are named, and
  the five cites are corrected (each checked by grep).
- Major: H4's proof named a fixture that doesn't exist. T2b captures today's bytes inline for a
  built and a parsed record and adds no testdata file.
- Major: the path was the task sum. It is now the critical path, 75, as pass 3 counted it, and
  the `[estimate]` planning miss is dropped.
- Minor: Decision 9's test claim, item 2's count (19), `check_serving.go:14-15`, the `$BASE`
  rule after a pass-3 merge with `--numstat`, Decision 6's encoder and const, the hit counts,
  `fixes_test.go:410,416`, the `slices` import, "method expression", the out-of-row
  `fixtures_test.go:14` mention (filed), a dropped vacuous testdata path, working directories,
  CI verdicts in task reports, and the close order with its delta-review floor.

## Rulings

Geoff answered the close packet `20261115-180213-6f0b69` on 2026-11-15. One ruling changes this PR: **Call, `provider-console` in the schema: remove it now.** Remove `provider-console` from the actor enum in `tool/schema/cairn-health.schema.json` and write the disclosure the version policy asks for into `CHANGELOG.md` under `## Unreleased` (a `Consumers must:` line, naming the schema change) and `MIGRATION-NOTES.md`. Close #514 and cite it. Everything else in the PR stands, including the filed H2 items (#515). Pass 3 is being changed first (palette, the `auth set` newline, two light shots, C7 and C11); conductor-cairn-cms tells you when `origin/tui-language-3` has its fix commits, and you then merge it in before you start.
