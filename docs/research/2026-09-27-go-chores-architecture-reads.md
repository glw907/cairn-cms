# Go tool architecture chores: the close's architecture reads

Ten `go-architecture-reader` reads, run at the close of the Go tool architecture chores pass
(`docs/superpowers/plans/2026-09-27-go-tool-architecture-chores.md`), one per package whose
non-test source the pass touched. Each reader ran read-only, with no plan in context, grading the
whole package on five axes (exported surface against grepped callers, duplication, file split,
test-only seams, comment density against a named stdlib package). A finding therefore mostly
predates this pass: the reader grades the package as it stands, not the pass's diff. Nine of ten
verdicts are "sound with nits"; `cmd/cairn` is "needs work". Structural findings are condensed,
keeping every location and recommended fix; nits are condensed to one line each, in the reader's
own order. ROADMAP points here rather than restating any of it.

## `tool/internal/render/fixtures` — sound with nits (2 structural, 6 nits)

### Structural

1. **Duplication, `fixtures.go:145,201,250,284,307,326` and `:235,271,287,303`.** The
   current-engine row is written out six times, and the version-behind row repeats the same shape
   with the installed version stated twice. Fix: a pair of builders, `engineCurrent()
   health.CheckResult` and `engineBehind(installed, detail string) health.CheckResult`, and have
   `fillDefault`'s `engine` case call `engineCurrent`.
2. **Duplication, `fixtures.go:208-220` (Offline) and `:176-188` (AllUnknown) hand-list all nine
   check ids**, exactly the parallel list `nineCheckIDs` (`:89-91`) says the package avoids.
   Derive `Offline` from `nineCheckIDs`; drive `AllUnknown` through `fillNine` with a
   credential-skip default.

### Nits

- Exported surface: `Empty` (`:170`) and `Degraded` (`:192`) have no caller outside the declaring
  file, reached only through `All`. Unexport, or leave as named corpus entry points.
- Comment density in range (0.31 against `net/http/httptest`'s 0.56 and `testing/fstest`'s 0.15).
- `:158-161`: `report`'s comment argues against reading `health.Run`'s `activeAckIDs`, an
  alternative nobody wrote; one clause is enough.
- `:103-108` and `:124-129`: `fillNine`'s and `fillDefault`'s docs repeat the same creds/email/
  errors reasoning; keep it in one.
- `:5-7`: "the corpus both halves of the render work share" narrates process; the pointer to
  render-reference carries the reason, the "both halves" clause does not.
- Naming: `skipCondition` (`:46-51`) always pins `ReasonNotObservable` but reads as a general skip;
  take the reason as a parameter, or name it `notObservable`.

### Best passages

- `:20-24`: `Now` is a fixed instant in AKDT, not UTC, so a golden proves the render carries the
  zone offset from the value rather than reading it from the machine.
- `:92`: `nineCheckIDs` derives from `health.All` rather than restating it; `Offline` and
  `AllUnknown` should follow the same instinct.
- `:130-135` with `fixtures_test.go:33-52`: `fillDefault` fills an omitted creds row with a
  credential-missing skip, never a pass, because no real run can produce a passing creds row
  beside blocked email and errors rows; the corpus is held to what the producer can emit.

## `tool/internal/exe` — sound with nits (1 structural, 3 nits)

A 34-line, single-file package (`exe.go`) that removes the Windows `.exe`-suffix bug from the two
places that build and run the real `cairn` binary. `Build` takes the module root explicitly, sets
`cmd.Dir`, and wraps `go build`'s combined output into its error. Two outside callers:
`cmd/mangen/main.go:380` and `cmd/cairn/usage_test.go:35`. Comment density 0.41 against
`internal/testenv`'s 0.44 (on par).

### Structural

1. **Exported surface, `exe.go:17`.** `Path` is exported but a module-wide grep finds no caller
   outside `exe.go` (only `Build` at `:27`), and the package has no tests. Unexport as
   `path(dir, stem string) string`, or fold the GOOS check into `Build`.

### Nits

- `:1-7`: the package doc's last sentence narrates CI history ("both went red on the Windows CI
  leg... until this was one function"); that belongs in the commit message.
- `:26`: `Build` always builds `./cmd/cairn` under a fixed `"cairn"` stem, but the doc reads as a
  general tool; name the function `BuildCairn` or say so in the doc.
- `:24-25`: the parenthetical on `moduleRoot` repeats what the parameter name already says; trim
  to "moduleRoot is the tool module's root directory."

### Best passages

- `:28-31`: the error wraps `err` with `%w` and includes `CombinedOutput`'s bytes, so a remote CI
  failure shows the compiler's own diagnostics.
- `:26-29`: `Build` takes `moduleRoot` from the caller rather than working it out itself, since
  each caller already knows its own root.
- "Only two passages show judgment, not three; everything else is a direct translation of the
  requirement."

## `tool/internal/store` — sound with nits (4 structural, 9 nits)

A small registry package: every read re-lstats the directory and file, every write is atomic, and
each platform has its own permission split. Comment density 0.34 against `os/user`'s 0.23 (modest
excess, mostly rationale on `Open`, `Dir`, and the Windows helpers). No Decision 2/5 seams-table
export lives here.

### Structural

1. **Exported surface, `store.go:20,24`.** `ErrUnsafePerms` and `ErrMalformed` have no
   `errors.Is` caller outside the package. Unexport as `errUnsafePerms`/`errMalformed`.
2. **Test-only seam, `paths.go:295`.** `Dir(env func(string) string, config func() (string,
   error), home string)` has one production caller (`cmd/cairn/registry.go:18`), which always
   passes the same three values; the parameters exist only for `paths_test.go`'s table. Idiomatic
   form: package-level swappable vars (`getenv`, `userConfigDir`, `userHomeDir`) and a
   no-argument `Dir() (string, Source, error)`.
3. **Duplication, `perm_linux.go`/`perm_darwin.go` are byte-identical 59-line files**, forced by the
   house ban on build tags. The idiomatic form is one `perm_unix.go` under `//go:build unix`,
   which also fixes the BSD build (`openNoFollow` and the `check*` functions are undefined there
   today). A repo-rule finding more than a package finding.
4. **Duplication within `perm_windows.go:128-133` and `:162-174`.** `checkSafePerm` reads the owner
   SID once through `checkOwner`, then `checkOwnerOnlyDACL` reads the same security descriptor
   again. Make `checkOwnerOnlyDACL` the implementation; read owner and DACL once.

### Nits

- `perm_linux.go:336`: `checkNotReparsePoint` wraps its error, and both `Load` and `Open` wrap
  again, so the message reads `store: store: store: unsafe permissions`. Return the bare
  sentinel from the helpers and let the exported call site prefix once (also `perm_windows.go:91,102`).
- `store.go:106`: `List` calls `s.Load` per entry, and `Load` re-runs `checkPath(s.dir)` that
  `List` already ran; an N+1 lstat, minor in practice.
- `store.go:232`: `fsyncDir` branches on `runtime.GOOS` even though the package already splits by
  GOOS file; move the Windows tolerance into `perm_windows.go`.
- `paths.go:1`: the package doc sits on the lesser file; move to `store.go` or a `doc.go`.
- `paths.go:253-263`: `SourceEnv`/`SourceLegacyPOSIX` have no outside reference; noted for
  completeness, not a defect (constants of an exported enum).
- `perm_linux.go:9-15`: the build-tag-ban paragraph repeats in both platform copies; one line
  ("kept byte-identical with `perm_darwin.go`; see `internal/hygiene`") suffices.
- `perm_windows.go:86-88`: the closing sentence explains a string by contrast with another
  function's message; drop it or fold with the error-prefix fix.
- `store.go:44-48`: `Open`'s doc explains the absent-registry choice via specific CLI commands;
  "a directory that does not exist is an empty registry; Save creates it" is the whole contract.
- `store_test.go:15-16`: cites "the 2.0 seam test named in the ADR's seams table," a process
  citation in a test comment.

### Best passages

- `store.go:169-219`: `Save` uses a named `err` result with one deferred unwind, fsyncs the file,
  closes explicitly to check the close error, renames, then fsyncs the directory: the full
  durable-write sequence with the error path in one place.
- `store.go:80-118` with `:120-134`: `List` returns `([]Entry, []error)` so one malformed record
  degrades the listing rather than failing it; `checkPath` re-verifies the directory on every
  operation against a later junction swap (TOCTOU).
- `perm_windows.go:156-198`: `checkOwnerOnlyDACL` treats a nil DACL as unsafe, walks only
  `ACCESS_ALLOWED` ACEs, and exempts SYSTEM/Administrators as NTFS's analogue of POSIX root.

## `tool/internal/spine` — sound with nits (5 structural, 8 nits)

The tool's shared read-side vocabulary. Every closed vocabulary sits in a const block with a
backing list, proven complete by an AST test; `ReasonCodes` is derived, not retyped. Comment
density 0.46 against `go/token`'s 0.41; the excess sits in `exit.go` (0.67), `outcome.go` (0.65),
and `catalogue.go` (0.64), mostly legitimate rationale, with a trimmable part of spec/test/other-
package citations.

### Structural

1. **Exported surface, `exit.go:155`.** Every production caller of `ExitCode` passes `0` as its
   `expectSites` parameter; the branch at `:163` is live only in tests. Drop the parameter to
   `func ExitCode(sites []SiteVerdicts, listErrs []error) Verdict`. Five single-site callers reduce
   to `SiteVerdicts.Verdict`.
2. **Test-only seams, `step.go:33-79`.** `parseStep`, `terminalSteps`, `chapter3TerminalSteps`,
   and `chapter3ResumableSteps` are referenced only by `step_test.go`, whose own test restates each
   function body as its expectation. Delete the four functions and the test; the Node-parity scan
   can read the const block through the existing `constNamesOfType` helper.
3. **Exported surface, `code.go:63` and `condition.go:78`.** `Codes()` and `Conditions()` have no
   non-test caller anywhere in the module, only `internal/health/fixes_test.go`. Neither is on the
   plan's kept-seam list. Idiomatic form: an `export_test.go` in `spine`, or record both in the
   seams table as a decision.
4. **File split.** `condition.go`/`conditions.go` differ by one letter but hold different concerns
   (the const block, and the embedded JSON text mirror); rename one. `catalogue.go` is one
   function built from `exit.go`'s `Verdict.String`/`StateWord`; move it there. `outcome.go` mixes
   `State`, the `ReasonCode` family, and `Outcome`/`OutcomeField`; a `reason.go` split would match
   `park.go`'s and `code.go`'s pattern.
5. **Duplication, `exit.go:113-128` (`CheckVerdict.Verdict`) and `:189-204` (`StateWord`)** run the
   same three-way switch. A `func (c CheckVerdict) Word() string` next to `Verdict` would unify
   both classifications over one input.

### Nits

- `exit.go:57-59`: `ErrExpectSites`'s doc says `ExitCode` is the only place the sentinel becomes a
  verdict, but `health_sweep.go:44` reuses it for an empty registry too.
- `conditions.go:16,22`: `ConditionText.ID` and `LogEvent` have no reader outside spine's own
  tests; doctor reads only `Title`, `Severity`, `Why`, `Remediation`, `DocsAnchor`.
- `step.go:33`: the comment cites `step_test.go`, a test file, as its reason to exist.
- `catalogue.go:3-11`: cites `cmd/copylist` and copy-standard section 2.9, process context; one
  line plus the no-retyping sentence carries the reason.
- `code.go:5-11` and `condition.go:12-15`: both cite the design spec's file path and health table;
  keep the vocabulary-collision reason, drop the spec citation.
- `code.go:18-20`: the `Code` const block's doc cites `health/fixes.go` by filename, which goes
  stale on a rename.
- `kind.go:18-19` and `condition.go:76-77`: "2.0 seam kept on purpose" is a process note; the
  seams table is its record (and `Conditions` is not on that table).
- `outcome.go:26-28`: `parkCodes`'s doc restates what `ReasonCodes`'s own doc (`:95-98`) already
  says.

### Best passages

- `exit.go:133-139`: `SiteVerdicts.Verdict` folds an empty slice to UNKNOWN, never OK, with the
  reason: an empty fold would print a false green for a site nothing measured.
- `exit.go:38-43` with `:65-66`: `Verdict.Severity` deliberately departs from the numeric exit-code
  order, with the operator-facing reason a known fault must not be masked by a transport unknown.
- `outcome.go:95-108` with `park.go:29` and `vocabulary_test.go:30-35`: `ReasonCodes` builds the
  published vocabulary from its three source sets, proven complete by parsing the file's own AST.

## `tool/internal/providers` — sound with nits (7 structural, 15 nits)

### Structural

1. **Exported surface, `corpus.go:23,68`.** `RepoRoot` and `Corpus` have no non-test caller
   anywhere in the module (29 and 4 references, all `_test.go`, across ten packages), so
   production `providers` ships a fixture loader importing `os` and `runtime`. Idiomatic form: a
   test-support package in the shape of `net/http/httptest`, e.g. `internal/corpustest`.
2. **Exported surface, `missing.go:6`.** `Missing` is referenced only by `cmd/cairn`
   (`env.go`, `probe_token.go`) and has nothing to do with an HTTP provider. Move into `cmd/cairn`
   as unexported `missing struct{ Var string }` and delete `missing.go`.
3. **Exported surface, `errors.go:84`.** `ProviderError.HTTPStatus` has no production caller;
   callers use only `ClassifiedReason`. Drop it from the interface and its three one-line
   implementations.
4. **Exported surface, `github.go:54,87-91`.** `GitHubError.Message` is decoded from every failing
   body but read nowhere. Delete the field and its `json.Unmarshal`. `GitHubError`/`NPMError`
   survive only as `ProviderError`'s dynamic types.
5. **Duplication, `cloudflare.go:126-134,191-204`** each rebuild the timeout/`NewRequestWithContext`
   /send sequence `transport.go:78` (`rawGet`) already owns, and as a result Cloudflare requests
   carry no `User-Agent`, contradicting the package's own "every request" contract. One
   `(c *client) send(...)` helper should serve all three clients.
6. **Duplication, `transport.go:67,78`, `github.go:75`, `npm.go:57`.** `getWith` exists only so
   `rawGet` can loop over a header map; fold into one `(c *client) get(ctx, path, accept string)`.
7. **Test-only seams, `probe.go:29,60,64-66`.** `AuthorityLookup` and `NewProbeWithAuthority` have
   no production caller (`deps.go:104` uses `NewProbe`), only health's tests; the nil-authority
   default is unreachable in production. At minimum delete the nil branch.

### Nits

- Comment density 0.42 against `net/smtp`'s 0.36, in range; the excess is in content.
- `cloudflare.go:15-18`, `github.go:16-18`, `npm.go:11-13` restate the same base-URL-override
  rebuttal three times.
- `cloudflare.go:37-38`: "carries no Message field" argues against a field nobody wrote.
- `cloudflare.go:85-95`: an eleven-line paragraph on an unexported helper citing `api.mjs`.
- `cloudflare.go:318-322,435-439`: provenance citations describing process, not contract.
- `errors.go:185-190`: an incident anecdote belongs in HISTORY, not the comment.
- `errors.go:94-107`: restates the 403/400 rules plus a history note; keep the disambiguation
  reason only.
- `cred.go:51-54`, `errors.go:13-15`: doc comments name test functions, which go stale on rename.
- `corpus.go:17-22`: "this file imports no testing package" narrates implementation.
- `transport.go:3-6,9-10`: rationale citing the Node client by filename.
- `npm.go:19-20,91-95`: "2.0's engine detail view" names a future consumer unnecessarily.
- `github.go:229-232`: `userAgent` is a transport concern that belongs in `transport.go`.
- `probe.go:120-147`: four `Lookup` wrappers repeat the same timeout/cancel pair.
- `errors_test.go:93-113`: a text scan of `errors.go` for identifier substrings tests file layout.
- `cloudflare.go:231-234`: the first-error-code extraction could be a two-line helper.

### Best passages

- `cloudflare.go:174-187`: `morePages` orders its clauses from strongest to weakest proof, so the
  empty-page clause alone guarantees termination even if every count lies.
- `transport.go:116-127`: `doWithRetry` declines to sleep when `Retry-After` exceeds the request's
  remaining deadline, spending no budget on a wait that would only end in a timeout.
- `errors.go:43-73`: `reasonNames` is one array indexed by the `Reason` constants, so
  `spine.ReasonCodes` is derived rather than retyped.

## `tool/cmd/mangen` — sound with nits (4 structural, 8 nits)

A `package main` that rebuilds a cobra tree from the real `cairn` binary's `--help` output, so man
pages cannot drift. Exported surface has nothing to grade (package main). Comment density 0.328
against `cmd/gofmt`'s 0.298 (close to stdlib; excess is tone, not volume — "own" appears 35 times).

### Structural

1. **Duplication, `main.go:215,303-305`.** `build` fills both a `map[string]node` and a
   `*[]string` order that must agree by hand; return one ordered slice instead.
2. **Duplication, `main.go:305,269`.** `rootShort` is passed into `build` and then `buildTree`
   overwrites `cmd.Short = rootShort` anyway; keep one of the two.
3. **Duplication, `main.go:206-209`.** `useTail` rebuilds "cairn or the last path element," which
   is `node.name()` restated; make it a method.
4. **Test-only seam, `main.go:391-400`.** `moduleRoot` guesses the root from
   `filepath.Base(wd) == "mangen"`, a heuristic that exists only because tests and `make man` run
   from different directories. `go env GOMOD` would remove it (needs a matching change to
   `internal/exe.Build`'s hardcoded `./cmd/cairn`).

### Nits

- `main.go:342`: deferred `_ = f.Close()` on a just-written file loses a close-time write error.
- `main.go:1-12`: the package doc cites `cmd/copylist`'s workaround as lineage; keep the why, drop
  the history.
- `main.go:29-32`: names `TestRootShortMatchesMessagesSource` by name, which rots on rename.
- File-wide: "own" appears 35 times as a verbal tic.
- `main.go:131,228`: `append(append([]string{}, path...), x)` written twice; `slices.Concat` says
  it once.
- `main.go:114`: the trailing field comment on `use` is the struct's longest line.
- File split: at 400 lines, one file is acceptable (as `cmd/gofmt`); split into `harvest.go`,
  `tree.go`, `main.go` if it grows.
- `main_test.go:39,80`: two tests each compile `cairn` and run the full harvest; a
  `sync.OnceValues` build would halve the cost.

### Best passages

- `main.go:43-45`: the flag regexp captures pflag's type placeholder rather than discarding it,
  because it is the only statement of a flag's type the harvest gets.
- `main.go:271-277`: `RunE` is left off topics on purpose, so cobra's own classification matches
  the real binary's shape.
- `main.go:47-52`: `angleEscaper` runs over every harvested field, not just fields known to
  contain `<site>`, because cobra/doc's Markdown pass silently drops unescaped angle brackets.

## `tool/cmd/copylist` — sound with nits (2 structural, 8 nits)

A single-file generator (`main.go`, 184 lines) that builds the copy golden from the `Catalogue`
functions plus an AST parse of `cmd/cairn/messages.go` (a program cannot import it, since it is
`package main`). Package main, so exported-surface and test-only-seam axes find nothing. Comment
density 0.33 against `cmd/gofmt`'s 0.30 (in range; excess is in design-doc citations).

### Structural

1. **Duplication across packages, `cmd/cairn/messages_test.go:117` re-implements
   `cairnCatalogue`** (`main.go:84`) nearly line for line, and the copies have already drifted: the
   test copy reads only a bare `*ast.BasicLit`, silently skipping a `+`-folded const and swallowing
   `Unquote` errors, so a folded message const reaches the golden but escapes the test's checks.
   Idiomatic form: one implementation in a small `internal/constcat` package both call.
2. **Error flow, `main.go:60-70`.** `catalogues()` panics on a path-resolution or parse failure, an
   ordinary expected error, landing a stack trace on stderr as noise. Idiomatic form:
   `catalogues() ([]packageCatalogue, error)` and `render() (string, error)`, with `main` printing
   and exiting on error — still failing loud, through the error channel stdlib's own cmd tools use.

### Nits

- `main.go:48`: `fmt.Errorf` with no verbs; use `errors.New`.
- `main.go:122-153`: `foldStringConst` sends `*ast.UnaryExpr` and `*ast.Ident` to
  `errNonLiteralConstValue`, so a negative int or `iota` const would stop the generator; either
  handle them or narrow the doc.
- `main.go:1-11`: the package doc cites copy-standard.md section 4.3 twice and argues against a
  shell-script alternative nobody wrote.
- `main.go:31-36`: `errNonLiteralConstValue`'s doc restates `foldStringConst`'s doc.
- `main.go:164-166`: "the single function main and this file's own test both call" narrates an
  arrangement the code already shows.
- `main_test.go:133-169`: `TestNoCmdCairnFileImportsCopylist` asserts what the compiler already
  forbids, and duplicates `internal/providers/corpus_importer_test.go`.
- `main_test.go:21,116,139`: the `runtime.Caller(0)` preamble appears three times plus once more
  in `main.go:46`; one `toolDir()` helper would serve all four.
- `main_test.go:110-131`: `TestCheckDoesNotDependOnCopyReview` is a Makefile policy test that
  would sit better in `internal/hygiene`.

### Best passages

- `main.go:144-150`: `foldStringConst` separates three cases (non-string fold skipped, string fold
  folded, mixed fold an error), failing closed exactly where a string could drop out of the golden.
- `main.go:167-180`: `render` is the one function both `main` and the golden test call, so the
  drift check compares a fresh run against the committed file through one code path.
- `main.go:158-162`: `sortedUnique` clones before sorting, so it never reorders a caller's slice,
  and uses `slices.Compact` instead of a hand-rolled map.

## `tool/internal/render` — sound with nits (9 structural, 10 nits)

A pure renderer with a real purity seam: one impure file, a test that enforces the seam, and
golden frames. Comment density 0.44 against `encoding/json`'s 0.48 (`text/tabwriter` reads 0.67),
so the problem is where comments sit, not their volume. No Decision 2/5 seams-table export is
treated as a defect; every other export has a grepped caller outside the package except the
`Verdict` alias.

### Structural

1. **Duplication, `palette.go:67,89`, `width.go:93`, `layout.go:299`, `body_single.go:81`,
   `body_many.go:567`.** `forTier` already bakes the ASCII tier into `t.widths`, but every
   glyph-drawing method still takes `ascii bool` threaded in by hand — two sources of truth for
   one tier. Have `forTier` also pick the glyph tier and drop the `ascii` parameter.
2. **Duplication/build, `profile_linux.go:6` and `profile_darwin.go:6`** are the same function,
   with no other GOOS defined (`GOOS=freebsd go build` fails: `undefined: enableVirtualTerminal`).
   One `profile_other.go` under `//go:build !windows` fixes both.
3. **Duplication, `json.go:463,472,488`.** `authCheckPermission` and `AuthCheckPermission` are the
   same struct with and without JSON tags, converted by hand; put tags on the exported type and
   marshal it directly, as `SiteListEntry` and `AdoptCandidate` already do.
4. **Duplication, `json.go:321`, `body_many.go:609`, `body_plain.go:724`** each spell out
   "`health.FixFor`, else `FixForReason` for a check that could not run." One `fixFor` helper in
   `layout.go` should serve all three.
5. **Duplication, `body_plain.go:157,168`** exist only to copy `blockedGroup`
   (`body_many.go:594`) into a type with two fewer fields; range over `groupBlockedFixes` directly.
6. **Exported surface, `json.go:38`.** `DoctorSchemaVersion`'s only caller is
   `internal/doctor/json.go:90`; the constant belongs next to doctor's own marshaller.
7. **Exported surface/duplication, `width.go:20`.** `Width80` is never read inside render; its
   only caller is `cmd/cairn/root.go:143`, and the value `80` is declared again as `render.go:57`
   `defaultWidth`. Export one `DefaultWidth = 80` both files use.
8. **Test-only seams, `palette.go:59`, `glyph.go:79`, `status.go:19-20`, `width.go:16`.**
   `groundHex`, `ambiguousRunes`, `providerKeyring`/`providerEnvironment`, and `widthFloor` are
   production declarations with no production reader (`widthFloor`'s own doc contradicts
   `content()`'s actual clamp at 1). Move each into the test that reads it, or make the behavior
   match the doc.
9. **File split, `body_single.go`.** Carries helpers every body shares (`clampFrame`,
   `firstReport`, `checkDetail`, `glyphs`); `rule` (`width.go:93`) is a glyph primitive, not width
   arithmetic. Move shared helpers to `layout.go` and glyph primitives to `glyph.go`.

### Nits

- `render.go:27`: the exported alias `Verdict = spine.Verdict` has no caller outside the package.
- `status.go:132`: `remainingDays` wraps `remaining(max(d,0))`, but `remaining` already clamps
  negative `d` to 0; the wrapper is a synonym.
- `body_many.go:759`: `hangingAtNoOrphan` has one caller and differs from `hangingAt` only in
  which wrap it calls; inline it.
- `width.go:93`: `rule` hand-rolls a byte loop; `strings.Repeat(g, n)` says the same thing.
- `body_many.go:672`: `compareBool` could be `cmp.Compare(boolInt(a), boolInt(b))`.
- `status.go:116`, `body_many.go:166-167,172-174`: cite copy-standard section numbers rather than
  stating the reason.
- `glyph.go:36,43`, `json.go:184`: dated process history ("chosen 2026-09-20") the code points and
  measurements file already carry.
- `status.go:13`: cites "iteration-2-brief.md ruling 8," a planning document.
- Six sites say "`RenderInput.ASCII`, which profile.go's detector alone fills" five times; say it
  once, on the field.
- `purity_test.go`, `glyph_test.go:61-66`, `width_test.go:11`: re-assert literal constant values
  instead of checking behavior.

### Best passages

- `rank.go:55`: `unclassedClass` puts an unrecognized check id above version drift and below the
  CRITICAL floor, a policy choice for the unknown case.
- `width.go:35`: `widthTable` is a value the Theme carries rather than a package-level setting,
  naming `x/ansi`'s init-time global as the counter-example, so two tiers can compose in one
  process.
- `body_many.go:572`: `mergeCoveredIDs` merges two sites' blocked groups by intersection, not
  union, so the merged fix line never claims a check for a site whose group did not cover it.

## `tool/internal/health` — sound with nits (11 structural, 16 nits)

The tool's pure health sweep: a `Check` interface, a literal `All` slice of nine checks, and
`Run`. Comment density 0.49 against `go/doc`'s 0.31 (`net/http/httptest` reads 0.56); the excess
sits in `outcome.go` and `report.go` (0.96 each), mostly rebuttals and dated process history, not
the exported doc comments.

### Structural

1. **Exported surface, `report.go:11-47`, `health.go:47-52,85-86`.** `Report`/`CheckResult` carry
   json tags, `SchemaVersion`, and `Tier.MarshalJSON`, but nothing in production marshals a
   `health.Report`; `render` builds its own `sitePayload`. Drop the wire contract, keep `Tier.String`.
2. **Test-only seam, `check_serving.go:149`.** `diagnoseUnreachable`'s `budget` parameter has one
   production caller, always `providers.RequestTimeout`; only the test passes another value.
   Idiomatic form: a swappable package var.
3. **Test-only seam, `check_serving.go:40`.** `probeServing` takes both `r` and `domain`; the
   separate parameter exists only for tests. Read `r.Domain` directly.
4. **Exported surface, `options.go:29`.** `Options.Validate` has no caller outside its package;
   unexport as `validate`.
5. **Exported surface, `fixes.go:22`.** `ActorProviderConsole` is used by no fix row and no
   caller, only a test allow-list; delete it and correct the "four Actor values" doc.
6. **Duplication, `severity.go:16-33`.** `failSeverity` is a hand-kept table that must agree with
   `All` and every check's `ID()`; declare the severity on the check itself instead.
7. **Duplication, `messages.go:22-285,351-391`.** About thirty `detailXxx` functions take no
   arguments and return a fixed string, restated again in `Catalogue`. Const values would collapse
   the pair; keep functions only for parameterized lines.
8. **Duplication, `check_engine.go:199-201`, `check_publish.go:99-101`, `check_deploy.go:223-224`.**
   The same `spine.Outcome{...ReasonRepoNotRecorded...}` literal built three times; add
   `repoNotRecordedOutcome()` to `outcome.go`.
9. **Duplication, `check_delegation.go:41-50,63-70`.** The `ZoneByName` call, its error, and the
   nil-zone Unknown appear twice in one `Run`; fold into one helper.
10. **Duplication, `check_creds.go:143-145`.** `credentialLine` falls back to printing the raw
    reason token into operator-facing `Detail`, bypassing `ReasonPhrase`'s own no-raw-code
    contract; call `ReasonPhrase` instead.
11. **File split, `check_deploy.go:153-166`, `check_delegation.go:82-94`.** `hasRepo`,
    `DefaultBranch`, and `assignedNameServers` are record-reading helpers shared across checks but
    live inside single-check files; move to a shared file.

### Nits

- `cmd/cairn/health.go:233-234` restates `health`'s tier logic; a `Tier.NeedsCF()` method would
  serve both.
- `fixes.go:212-222`: `fixForCondition`/`fixForCode` each wrap a single map lookup unnecessarily.
- `messages.go:397-398`: `Catalogue` sorts and compacts while `FixLines` leaves order to its
  caller, yet `cmd/copylist` sorts both anyway.
- `messages.go:148-157`: a doc comment is attached to the wrong declaration (the const block
  instead of the function).
- `check_errors.go:14-16`: the doc says the check warns at the threshold; `Run` actually reports
  OK up to and including it.
- `check_errors.go:31-34`: cites a test name as rationale.
- `check_errors.go:18-22`, `messages.go:217-222`: dated incident history belongs in HISTORY.
- `fixes.go:28-30,82-86`: cite the process that produced the code ("re-homed from the mockups'...",
  "verified 2026-09-20").
- `health.go:47-49`: the `MarshalJSON` doc rebuts an alternative nobody wrote (resolved by the
  structural finding above).
- `report.go:55-58`: `nonVerboseFields`'s doc argues against a regex filter nobody proposed.
- `outcome.go:11-22`: a three-paragraph comment on a four-line unexported helper.
- `check_deploy.go:76-77`: the `BuildID` comment is garbled and needs rewriting.
- `check_publish.go:46`: the `publishDetail.outcome` doc omits that the method also takes reason
  and code.
- `check_publish.go:94-97`, `check_https.go:50-54`: rationale reads as a rebuttal; shorten to the
  one reason.
- `ack.go`/`health.go:181-207`: `applyAck` and `activeAckIDs` live in `health.go` while `Ack` and
  `Acks.find` live in `ack.go`; move the two helpers to keep the concern in one file.
- `health.go:20-22`: `TierNone` has no outside caller, fine as an enum member.

### Best passages

- `health.go:146-179`: `settle` gates on context and tier and routes through `recoverRun`, which
  turns a panic into Unknown/not-run and records only `%T`, keeping a secret-bearing panic value
  out of a rendered report.
- `check_deploy.go:215-221`: the failed-build verdict is decided before the GitHub `HeadSHA` read,
  so an unrelated outage cannot change a failed-build verdict's stability.
- `outcome.go:30-57` with `report.go:86-97`: visibility and provenance are set on each field where
  the check produces it, and `ForRender` is the one filter every output path runs through.

## `tool/cmd/cairn` — needs work (13 structural, 13 nits)

A carefully reasoned command package whose hard mechanisms are right (panic scrubbing, fair-share
sweep budgets, terminal restore on cancel, the single quiet rule). Comment density 0.382 (0.327
excluding `messages.go`) against `cmd/go/internal/modcmd`'s 0.141 and `cmd/gofmt`'s 0.298. No
callerless finding against the seams-table exports in `spine`, `render`, or `health`.

### Structural

1. **`main.go:76-79,149`, `doctor.go:78`, `health.go:117`, `health_sweep.go:192`, `sites.go:100`.**
   A verdict run ends the process two ways: most commands call `d.exit` and `main.go` wraps that
   in the output flush, but `auth check` returns `codedExit(verdict)` and lets `runTree` decide.
   Keep `codedExit`; delete the other path, removing the `deps.exit` field and the flush-inside-
   exit closure.
2. **`deps.go:29-41,133-137`.** Four fields (`keyring`, `keyringWriter`, `keyringDeleter`,
   `keyringStatus`) all hold the same `secrets.Keyring` in production; nil guards exist only
   because tests leave them unset. Collapse to one field of a local interface.
3. **`deps.go:55-59,147-149`.** `stdin` is a second seam for what `readPassword` already injects;
   drop the field, close over `os.Stdin` in `newDeps`.
4. **`deps.go:69-72` with `health.go:245`.** `d.checks` is always `health.All` in production, yet
   `runStatus` reads `health.All` directly for `Disables`, so a run over injected checks could
   report disabled checks it never ran. Pick one source (a package-level swappable var). This
   pass's Task 12 rejected a package-level swappable `var allChecks` for `deps.checks`: Decision 8
   calls that mutable global state that would break `t.Parallel`, against `deps`'s own documented
   design, so the seam stayed a field rather than becoming this reader's suggested var.
5. **`registry.go:28-32` with `deps.go:46-50`.** `defaultRegistrySource` is an identity wrapper
   that duplicates `registryDirAndSource`; `deps` carries two parallel functions that must agree
   by hand. Keep one field.
6. **`probe_token.go:107-114` duplicates `deps.go:99-117`.** `auth check` rebuilds Cloudflare/
   GitHub clients that `buildClients` already builds; call `buildClients` instead.
7. **`adopt.go:72-81,176-186`.** `discoverCandidates` and `runAdopt` open with the same five
   steps; extract one `discover(ctx, d)` helper.
8. **`probe_cloudflare.go:14-53`, `probe_github.go:16-31` restate `permissions.go:34-44`**: two
   string switches keyed on the table's own `Label` values, with nil defaults that crash if a
   label drifts. Put the probe function in the row itself.
9. **`health.go:100-105`/`health_sweep.go:105-110`, the render-loop trio, and the `cairn:`
   listErrs loop** each duplicate one construction across two or three files; extract one helper
   each (`healthOptions`, `writeFrame`, the listErrs loop).
10. **`sites.go:112,155`** restate `quietSuppressesFrame` (`health.go:159`) inline instead of
    calling it, defeating its own "stated once" doc.
11. **`messages.go:618-659`.** `noCredentialsError`, `networkDownError`, `rateLimitedError`, and
    `crashedCheckError` have no production caller, only a test; delete the four constructors,
    keep the template constants `cmd/copylist` reads.
12. **`env.go:117-145`.** `nonSecretVar`'s `name()`/`value()` and `credential()` are the same
    lookup loop restated; replace with one `lookup(name string) resolution`.
13. **File split.** The auth-check concern spreads across `permissions.go`, `probe_cloudflare.go`,
    `probe_github.go`, and `probe_token.go` (still named after the retired probe-token command);
    merge into `auth_check.go`. `health_json.go:1-3` and `health_sweep.go:1-3` say they were split
    to satisfy `TestNoCommandFileExceedsItsBound`; the sweep split does read as a real concern
    (single site versus fleet), so keep it but state the concern as the reason, not the line-bound
    test. `writeJSONPayload` (`deps.go:79-84`) is an output helper misplaced inside the dependency
    struct's file.

### Nits

- `health_json.go:1-4`, `health_sweep.go:1-4`, `messages.go:1-27`: file-header comments sit
  directly above `package main` with no blank line, so `go doc` concatenates all three.
- `env.go:102-115`: `noColorValue`/`termValue`/`publicOriginValue` are getters on same-package
  fields; read the fields directly.
- `env.go:182`, `auth.go:224`, `probe_token.go:212`: magic strings ("not set", "unreachable")
  written in one place and compared in another, outside the messages table.
- `messages.go:375-378`: `adoptListRouteOnlyNotice` returns a const unchanged; use the const
  directly.
- `messages.go:680`: `translateError` uses a bare type assertion instead of `errors.AsType`.
- `permissions.go:25-29`: `permission`'s fields are exported with no encoding/reflection consumer;
  lowercase them.
- `probe_cloudflare.go:59`: `observabilityProbeQuery` reads `time.Now` directly, bypassing the
  package's own `d.now` clock seam.
- `ack.go:174-177`, `env.go:189-190`: comments attached to no declaration, pointing at
  `messages.go` functions.
- Process citations carrying no needed reason: `messages.go:361-363,371-372,382-383` and about 25
  "New to this table" tags; history notes (`root.go:32-34`, `health_sweep.go:218-219`,
  `messages.go:678`); rebuttals of alternatives nobody wrote (`main.go:28-30`, `root.go:182-184`,
  `env.go:15-16`, `deps.go:20-22`). Most of the density excess sits here.
- `root.go:63-66,78-86`: three to four lines of rationale per `rootFlags` field restate what
  `PersistentPreRunE` and `renderInput` already show.
- `probe_token_test.go:219-225`: a test passes an exit closure that gets overwritten by
  `runCheck`'s result, so the fake cannot fail.
- `probe_token_test.go:541-552`: `TestCheckDepsRefusesUnusedKeyring` tests the test's own fixture
  builder, not the package.
- `auth_test.go:366`: asserts a wiring line that exists only to serve the stdin seam.

### Best passages

- `main.go:92-118` (`runTree`): the recover exists because a default panic writes to real
  `os.Stderr` and skips the scrubber; the crash line names the panic value's type, never its
  value, since a credential-carrying frame could hold a token.
- `health_sweep.go:238-245` (`siteBudget`): each site gets the envelope's remaining time divided
  by the sites still to run, recomputed after every site and capped per site, in four lines.
- `auth.go:29-56` (`restoreOnCancel`): `stopped` is read under a mutex rather than racing
  `ctx.Done()` against `done` in one select, since a random pick between two ready cases could
  restore a terminal the command has already finished with.
