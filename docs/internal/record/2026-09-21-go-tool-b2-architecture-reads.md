# B2 merge: architecture reads, one per touched package (2026-09-21 evening)

The Go tool's Pass B2 close-out architecture read, one verdict per touched package, filed by
Claude Fable 5.1 as retire-1's opening inputs.

Findings file to the next pass (the doctor retirement, retire-1) or ROADMAP; nothing fixed at the
close. The fold agent copies each package's verdict line into HISTORY and the findings into the
plan's post-mortem.

## internal/exe: sound with nits
- exe.go:1-6 package comment narrates the CI incident and names callers; state the platform rule
  in one or two sentences (model: os/exec/lp_windows.go).

## cmd/copylist: sound with nits
- main.go:1-11 header quotes the spec near-verbatim; one pointer line to copy-standard.md 4.3.
- main.go:56-60 panic rationale stated twice; keep one.

## internal/logx: exemplary
- Minor: logx_test.go:126-160 walks the whole module to assert only logx and providers/cred.go
  call Reveal(); a module-wide invariant belongs at the repo/lint level (the hygiene package),
  not one leaf package's test.

## cmd/mangen: sound with nits
- Duplication: main.go:373-388 buildCairn duplicates cmd/cairn/usage_test.go:26-44 builtBinary
  statement for statement; one shared helper (in internal/exe: BuildCairn(dir) (bin, err)),
  with usage_test.go's OnceValues caching layered on it.
- Idiom: main.go:393-402 moduleRoot detects cwd by basename; cmd/copylist uses runtime.Caller(0),
  which is the form to keep.

## internal/adopt: exemplary
- Duplication: cmd/cairn/adopt.go:74-79 and :178-184 repeat the buildClients / HaveCF / loadEnv /
  Discover preamble; runAdopt should reach candidates through the shared helper.
- Note: adopt.go:252-282 slugify and newSiteID's empty-stem error are identity for a Workers
  script id; the 2.0 adopt dialog is the named caller that varies the name. Keep.
- adopt.go:65-66 first sentence restates the `if`; keep the reason sentence only.

## internal/secrets: sound with nits
- keyring.go:59-83, 85-101, 116-131 restate the deadline-miss and ErrNotFound distinction three
  times; one canonical explanation on read, pointers elsewhere.
- Get/Status/Delete each re-run the same errors.Is switch; revisit only if a fourth appears.

## internal/spine: sound with nits
- exit.go:180 CombineState has no caller; check_creds.go:115 open-codes its body. Call it or
  delete it.
- exit.go:191 ExitCodeFor has no production caller; unexport or drop.
- park.go:47 ParkCodes's one caller is same-package; unexport.
- park_test.go:16 and condition_test.go:16 retype the code lists; condition_test's has ALREADY
  DRIFTED (missing ReasonRepoNotRecorded). Read the package's backing lists.
- exit.go:180,202: StateWord and CombineState are State vocabulary; move to outcome.go.
- outcome.go:95 "eight fixed constants" is nine (also flagged by the last review).

## internal/logs: sound with nits
- TEST SEAM (the one that let the live 400 through): logs_test.go:26 fixtureRoundTripper
  discards the request, so no test observes the query body Fetch sends; logs_test.go:183
  restates the filters by hand. Capture the sent body in the fixture and assert from it.
- logs.go:38-53 json tags on Field and Entry with no marshaler (render builds its own); drop them.
- logs.go:76 RetentionClamp has no external caller; cited by doc comments; file as a decision.
- logs.go at 348 lines carries four concerns; the --since grammar (88-123) wants since.go.

## internal/hygiene: sound with nits
- buildtags_test.go:17-29 and identicalfiles_test.go:23-36 reimplement the root walk that
  severity_test.go's moduleRoot(t) already provides; a helpers_test.go for the shared helpers.

## cmd/cairn: sound with nits
- Duplication: the JSON-write tail (marshal, err check, Fprintf) is copied six times
  (health_json.go:18,36,54, adopt.go:125, sites.go:149, logs.go:113); one writeJSON helper.
- Duplication: permissions.go:34's nine labels are restated as switch cases in
  probe_cloudflare.go:14 and probe_github.go:16; put the probe func on the table row.
- Duplication: adopt.go:72-82 and :178-187 (same as the adopt package's finding).
- Test-only seam: deps.go:71 checks is set only by a test; stdlib form is a package var a test
  swaps. deps.go:46-49 registryDir and registrySource can only disagree in a test; one field.
- Dead surface: messages.go:574,582,598,609 four error constructors with only test callers.
- File split: probe_token.go holds `auth check`; rename to auth_check.go and fold the two probe
  files in once the probe sits on the table. health_json.go and health_sweep.go open by citing
  the 300-line bound test rather than a concern.
- Comment register: about thirty "new to this table, reviewed at the 1.0 editorial gate" notes
  in messages.go and Task-name citations in root.go:37, env.go:41, deps.go:61; process context,
  not a reason the code carries.

## internal/render/fixtures: sound with nits
- Duplication: fixtures.go:142-153 report() recomputes Degraded and Acknowledged by hand, the
  derivation health.Run does at health.go:127-135; a rule change desyncs fixtures silently.
- Duplication: fixtures.go:91 nineCheckIDs is a hand copy of health.All's ids; derive it.
- Comment density on unexported helpers (fillNine, fillDefault, the scenario constructors).

## internal/health: sound with nits
- Exported surface: severity.go:31 FailSeverityOf, check_deploy.go:157 HasRepo, fixes.go:215
  FixForCondition have no caller outside the package; unexport. fixes.go:221 FixForCode's only
  outside reference is a render test.
- Duplication: messages.go:356 Catalogue hand-enumerates about 35 functions that messages_test.go
  lists again; a missed one silently drops from copy-list. Read by AST as cmd/copylist does.
- Duplication: check_deploy.go:122, check_publish.go:48, check_engine.go:74 are one outcome
  builder three times; one package function.
- Duplication: check_delegation.go:41-51 and 63-71 repeat ZoneByName and its two failure arms.
- File split: HasRepo, DefaultBranch, assignedNameServers are record readers homed in whichever
  check needed them first; one record_fields.go.
- Comment: fixes.go:30,57,85 cite the plan, the task, and the editorial gate.

## internal/store: sound with nits
- Exported surface: discover.go:10,23 Site and Discover have NO caller anywhere (the plan said
  auth probe would read through Discover; probe_token.go calls st.Load directly, root.go's
  completion calls st.List). Not in the seams table: an unwired deliverable. Wire or delete.
- Duplication: perm_linux.go and perm_darwin.go are byte-identical; one perm_unix.go with
  `//go:build linux || darwin`. NOTE the hygiene package forbids build tags module-wide
  (TestNoBuildTags) and asserts the GOOS pair's byte-identity instead, so this is a deliberate
  ruling, not a defect; record it as such in the file header rather than re-filing it.
- Minor: ErrUnsafePerms and ErrMalformed are inspected only by the package's own tests.

## internal/render: sound with nits
- Exported surface: about 25 names have no outside caller and no seams-table row (Sanitize, Role
  and its eight constants, Verdict, WidthFloor/WidthCap, the six *SchemaVersion constants, most
  Theme methods); only Theme.Wrap has one (root.go:144). Unexport the rest.
- Test-only seam: render.go:84 RenderInput.Height has no reader; the h024 golden is byte-identical
  to its base and cannot fail. Drop the field until a viewport reads it.
- Test-only data in production files: palette.go:59 groundHex, glyph.go:79 ambiguousRunes.
- Duplication: body_single.go:100 mark and :128 wordRole are parallel switches over the same four
  predicates; one classify(c).
- File split: render.go:159 renderStatus belongs in status.go; body_many.go (761 lines) holds the
  strip, the fallback table, and the fleet fix list; the fix list from :441 is its own file.
- Comments: about 25 plan citations; render.go:12 is stale (names two bodies of four).

## internal/providers: sound with nits
- Exported surface: github.go:140 RepoOwnership has no caller and its doc names one that does not
  exist. Delete or unexport.
- Test-only seam: corpus.go RepoRoot and Corpus have zero non-test callers, guarded by a 78-line
  AST walk; move to tool/internal/corpus imported only by tests, and `go list -deps` proves it.
- probe.go:52,60 NewProbe and NewProbeWithAuthority are one constructor (nil means default).
- Duplication: errors.go:17,42,62 three parallel lists of the ten Reason values; one indexed
  names array or stringer.
- Duplication: six identical ClassifiedReason/HTTPStatus bodies across the three error types;
  embed one failure struct.
- File split: missing.go's one-field struct about credential variables belongs beside
  secrets.Provider.

## Simplifier review: (pending at the time of writing; the fold reads its verdict from the ledger)

## Tally
Fifteen packages: exemplary 2 (logx, adopt); sound with nits 13; none escalated. Themes across
packages: hand-kept parallel lists (spine codes, health Catalogue, providers Reasons, fixtures'
nine ids, mangen's build helper) and plan citations in comments. The two findings with teeth: the
drifted list in spine's condition_test.go, and logs' fixture that never sees the request body.
