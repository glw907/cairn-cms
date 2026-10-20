# `cairn` tool sub-project 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Per this repo's conventions, dispatch each task to
> `cairn-implementer` (Sonnet), review the diff, and confirm the gate before the next dispatch.
> Invoke `go-conventions` before any Go file and `bubbletea-design` before any `ui` task.

**Goal:** A Go binary `cairn` that adopts the four production sites into a local registry,
runs read-only health checks over them, renders a bubbletea HUD with a log view, and exposes
every action as a subcommand with a scheduled-routine tripwire.

**Architecture:** `tool/` is a separate Go module in this repo. Eight internal packages in a
strict downward order (`ui` → `health`/`logs` → `spine` → `providers`/`record`/`store`/`theme`),
a cobra tree on top. Checks are pure functions over a site record and injected clients; the
TUI is poplar's shape (one `ui` package, root model, screen registry, pure render seam); all
goldens render through the seam with no running program.

**Tech Stack:** Go 1.26, `charm.land/bubbletea/v2 v2.0.9`, `charm.land/lipgloss/v2 v2.0.6`,
`charm.land/bubbles/v2 v2.1.1`, `github.com/spf13/cobra`, `golang.org/x/sync/errgroup`,
`golang.org/x/sys/windows`, `golang.org/x/tools` (analyzers), golangci-lint, Vale with the
vendored `glw907` overlay. Node 22 for the fixture-extraction task only.

**Spec:** `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`. Executors
read the spec section named in each task; this plan argues from it and does not restate it.

## Global constraints

- The module is `github.com/glw907/cairn-cms/tool`, rooted at `tool/`, Go 1.26, with its own
  `go.mod`, Makefile, and workflow. Nothing under `tool/` is reachable from `npm test` or the
  npm tarball.
- Every gate is falsified before it is trusted: the task that adds a gate breaks the code
  deliberately, shows the gate failing, restores it, and records both runs in the task report.
- No shell-out to an installed CLI (`wrangler`, `npm`, `gh`) anywhere in `tool/`. REST only.
- Credentials are never bare `string`s past startup, never on argv, never in a child
  environment, never in a log or error string (the chokepoint scrubs known values last).
- Sub-project 1 decodes no per-site secret. Unknown record keys round-trip as an opaque tail.
- Every check returns `Outcome` (ok, failing, unknown-with-reason); there is no ok without
  having run. 401 and 403 are unknown with distinct reasons, never failing.
- Status is never color alone: every state is a distinct glyph plus, where width allows, a word.
- Comment prose: Go Doc Comments via `go-conventions`; no em dash in comments (Vale gate).
- The Step enum is exactly the 18 strings the Node CLI writes (spec, `spine`); park codes are a
  separate type.
- Windows, macOS, and Linux are all CI legs from the first commit, with `defaults.run.shell: bash`.
- Commit messages: imperative mood, specific files, the standard co-author footer.

## Pass structure

This sub-project is three passes with a named cut point after each; a pass ends with the
`cairn-pass` ritual, not a release. A task that splits during execution is the signal to
re-check the pass boundary, not to keep going.

- **Pass A, foundation (Tasks 1–11):** repo wiring, gates, ADRs, the fixture corpus, `record`,
  `store`, `providers`, `spine` vocabulary, and the credential mint-and-probe. Ends with a
  module whose `make check` is green on three platforms and whose fakes serve the real bodies.
- **Pass B, checks and CLI (Tasks 12–21):** the nine checks, `health`, `logs`, `adopt`, the
  cobra tree, and the tripwire exit codes. Ends with `cairn health --json` true against the
  four production sites from a scheduled routine.
- **Pass C, the HUD (Tasks 22–29):** `theme` port, render seam and gallery, the root model and
  registry, the four screens, the generation-counted refresh. Ends with the TUI live and its
  gallery committed.

---

## Pass A: foundation

### Task 1: Module, Makefile, CI matrix, and the tarball guard

**Files:**
- Create: `tool/go.mod`, `tool/cmd/cairn/main.go` (prints version, exits 0), `tool/Makefile`,
  `tool/.golangci.yml`, `tool/scripts/vale-comments.sh`, `tool/.vale.ini`
- Create: `.github/workflows/tool.yml`
- Modify: `.github/workflows/test.yml`, `e2e.yml`, `design.yml`, `scaffold.yml`,
  `create-site.yml` (add `paths-ignore: ['tool/**']` on both `push` and `pull_request`)
- Modify: `scripts/checks/check-package-files.mjs` (new assertion), `package.json` (nothing
  in `files` changes; the assertion proves that)
- Modify: `.vale.ini` at the repo root only if the root config would otherwise lint `tool/`;
  otherwise leave it

**Interfaces:**
- Produces: `make -C tool check` as the single gate (`tidy-check fmt-check vet lint
  vale-comments test`; `analyzers` and `gallery` are added by later tasks), and the
  `tool.yml` matrix `os: [ubuntu-latest, macos-latest, windows-latest]`.

**Acceptance:**
- `make -C tool check` passes locally with an empty `main`.
- `tool.yml` triggers on `push` and `pull_request` with `paths: ['tool/**',
  '.github/workflows/tool.yml']`, sets `defaults.run.shell: bash`, installs Go from
  `tool/go.mod` and Vale 3.x, and runs `make -C tool check` on all three legs. A draft PR
  touching only `tool/` shows three green `tool` legs and no Node workflow runs.
- `check-package-files.mjs` fails if any packed path begins with `tool/`; falsify by
  temporarily adding `"tool"` to `files`, run `npm run check:package`, confirm the failure
  message names the path, revert.
- `tool/.vale.ini` has `[formats] go = md` and `[*.go] BasedOnStyles = glw907`; the overlay is
  installed by `~/.dotfiles/scripts/glw907-vendor.sh ~/Projects/cairn-cms --sync` and committed
  under `.vale/styles/glw907`. Falsify by adding a comment with an em dash, run `make -C tool
  vale-comments`, confirm exit 1, remove it.
- The root `npm run check:vale` output is byte-identical before and after (the docs gate must
  not change).
- Commit.

### Task 2: CLAUDE.md wiring and the two ADRs

**Files:**
- Modify: `CLAUDE.md` (two to three lines in the existing tooling section: `bubbletea-design`
  mandatory for TUI layout work, the cairn `elm-conventions` fork mandatory for `tool/internal/ui`
  once it exists, `tui-design:tui-design` optional; `go-conventions` is already global)
- Create: `tool/docs/adr/0001-component-architecture.md`,
  `tool/docs/adr/0002-design-language-and-input.md`
- Modify: `docs/superpowers/2026-08-18-tui-skills-setup-brief.md` (mark Tasks 1, 2, 4 done with
  the commit)

**Acceptance:**
- ADR-0001 states the decision (one `ui` package, root `App`, `Screen` embeds `tea.Model` and
  returns `ScreenEntry`, package-level registry at init as the single source of interaction
  truth), the alternatives (per-feature packages; Crush's plain-struct sub-components), the
  reasons from spec decision 3, and the tripwire: the `screenregistry` analyzer must pass and
  `App` carries at most 12 fields, checked by a test in Task 24. It records that poplar's
  `internal/ui` was re-read at `~/Projects/poplar` on the date of writing and names the commit.
- ADR-0002 adopts poplar's design language and ADR-0012 by reference, lists the additions
  (`HealthGlyphs` ok/failing/unknown/running with ASCII `+ ! ? ~`, `RoleUnknown`), and states
  never-color-alone as a gate (Task 23).
- `CLAUDE.md` grows by no more than four lines.
- Commit (docs only, no simplifier).

### Task 3: Fork `elm-conventions` for cairn

**Files:**
- Create: `.claude/skills/cairn-elm-conventions/SKILL.md` (project-scoped in this repo)

**Acceptance:**
- Derived from `~/.claude/skills/elm-conventions/SKILL.md` (or poplar's copy) with the scope
  section rewritten for `tool/internal/ui` and poplar-only helpers removed; Rule 10 (lipgloss v2
  box math and styled strings) carried verbatim; the registry-as-architecture exception to the
  no-package-state rule stated explicitly, matching ADR-0001; the generation-counter pattern
  for async messages named as the staleness rule.
- No reference to a poplar package that does not exist (`grep -n "internal/mail\|uicore"` is
  empty).
- Commit (docs only).

### Task 4: Extract the fixture corpus from the Node fakes

**Files:**
- Create: `packages/create-cairn-site/fixtures/cloudflare/**/*.json`,
  `packages/create-cairn-site/fixtures/github/**/*.json`,
  `packages/create-cairn-site/fixtures/README.md`
- Modify: `packages/create-cairn-site/test/fake-cloudflare.mjs`,
  `packages/create-cairn-site/test/fake-github.mjs` (load bodies from the corpus; the fake
  devices documented in their headers, randomized nameservers and `failNext`, stay in code)

**Interfaces:**
- Produces: one JSON file per captured body, named `<endpoint-slug>.<variant>.json`, each a
  top-level object `{ "provenance": { "captured": "YYYY-MM-DD", "source": "<doc path>",
  "status": <int> }, "body": { ... } }`. Go tests (Task 7 onward) read only `body` and `status`.

**Acceptance:**
- Every literal response body currently inline in either fake is in the corpus; a grep of the
  two fakes for `"success":` returns zero hits outside the loader.
- The provenance header is copied from the fake's doc comment for that body, never invented;
  a body whose provenance the fake marks as unobserved keeps that note in `provenance.note`.
- `npm test -w packages/create-cairn-site` passes unchanged; the transcript fixtures under
  `test/fixtures/transcripts` are untouched.
- `fixtures/README.md` states the language-neutral rule from the pre-design and that the Go
  tool reads these files by path; it names the extraction trigger (the tool leaving this repo
  moves the corpus with it).
- Commit (this task runs `code-simplifier` over the two fakes).

### Task 5: `record` package

**Files:**
- Create: `tool/internal/record/record.go`, `record_test.go`, `validate.go`,
  `validate_test.go`, `testdata/` (three records: a Node-written version 0 with secrets, a
  version 1 adopted record, a malformed one)

**Interfaces:**
- Produces: `type Record struct` with typed fields `Name`, `Step spine-free string`, `Domain`,
  `SchemaVersion int`, `Adopted bool`, `GitHub RecordGitHub` (`Repo`, `InstallationID`
  identifiers only), `Cloudflare RecordCloudflare` (`AccountID`, `ZoneID`, `WorkerName`),
  `SecretRefs map[string]string`, and `Extra map[string]json.RawMessage` for every other key;
  `func Parse([]byte) (Record, error)`; `func (r Record) Marshal() ([]byte, error)` emitting
  two-space indent, no HTML escaping, trailing newline, typed keys first then `Extra` in
  insertion order; `func ValidateSiteID(string) error` (the Node `SITE_ID_SHAPE`:
  `^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$`); `func ValidateDomain(string) error` (bare LDH name,
  no scheme/userinfo/port/path/query, no IP literal, no underscore).

**Acceptance:**
- Round trip: `Parse` then `Marshal` of the version 0 fixture reproduces every key and value,
  including `github.clientSecret` and `cloudflare.apiToken`, byte-equal after normalizing
  whitespace; the typed struct has no field for any secret.
- A sentinel test: a fixture with `clientSecret: "SENTINEL-7f3a"` passes through `Parse`,
  `fmt.Sprintf("%+v")`, `%#v`, and `Marshal`; only `Marshal` output contains the sentinel, and
  that is asserted as the one permitted path.
- `ValidateDomain` rejects `907.life@evil.com`, `evil.com#`, `localhost:8787`,
  `169.254.169.254`, `_dmarc.907.life`, and accepts `907.life`, `www.ecxc.ski`.
- Commit.

### Task 6: `store` package

**Files:**
- Create: `tool/internal/store/store.go`, `paths.go`, `paths_test.go`, `perm_posix.go`,
  `perm_windows.go`, `store_test.go`

**Interfaces:**
- Consumes: `record.Record`, `record.Parse`, `record.Marshal`, `record.ValidateSiteID`.
- Produces: `func Dir(env func(string) string, goos string, home string) (string, Source)`
  with `Source` one of `SourceEnv`, `SourcePlatform`, `SourceLegacyPOSIX`; `type Store struct`;
  `func Open(dir string) (*Store, error)` (refuses a symlinked or non-owner directory);
  `func (s *Store) List() ([]record.Record, error)`; `func (s *Store) Load(id string)
  (record.Record, error)`; `func (s *Store) Save(id string, r record.Record) error`
  (temp-in-dir plus rename, `O_NOFOLLOW`, sets version 1 when absent); `var ErrUnsafePerms`,
  `var ErrMalformed` carrying the id.

**Acceptance:**
- `Dir` returns `$CAIRN_STATE_DIR` when set; else `~/.config/cairn/sites` on `linux` and
  `darwin` regardless of `XDG_CONFIG_HOME`; else `%APPDATA%\cairn\sites` on `windows`, falling
  back to the POSIX path when the platform path does not exist and the POSIX one does. A test
  table covers all three GOOS values with and without each variable. `os.UserConfigDir` does
  not appear in the package (grep asserted in a test).
- POSIX: `Load` returns `ErrUnsafePerms` for a `0644` record or a `0775` directory and never
  chmods. Windows leg: `Load` returns `ErrUnsafePerms` when a non-owner ACE is present
  (test constructs one with `x/sys/windows`); the mode-bit assertions are skipped there with
  a stated reason, and the ACL test is not skipped anywhere.
- A version 0 record loads with `SchemaVersion == 0`; `Save` writes `schemaVersion: 1` and
  preserves `Extra` byte-for-byte; a second `Load` sees 1.
- `List` skips and reports a malformed record by id rather than failing the whole list; the
  report is what Task 20's exit code 2 reads.
- Commit.

### Task 7: `providers`: transport policy and the Cloudflare client

**Files:**
- Create: `tool/internal/providers/transport.go`, `transport_test.go`, `cred.go`,
  `cloudflare.go`, `cloudflare_test.go`, `corpus.go` (the root-anchored fixture resolver),
  `corpus_test.go`, `errors.go`

**Interfaces:**
- Produces: `type Credential struct{ v string }` with `func NewCredential(string)
  Credential`, `func (Credential) String() string` returning `"<redacted>"`,
  `GoString`, `MarshalJSON`, `MarshalText` all redacting, and `func (Credential) apply(*http.Request)`
  unexported; `func newClient(host string, cred Credential) *client` whose `Do` asserts
  `req.URL.Host == host`, sets the header per request, and uses `CheckRedirect` returning
  `http.ErrUseLastResponse`; `type Cloudflare struct` with `func NewCloudflare(accountID
  string, cred Credential, rt http.RoundTripper) *Cloudflare` (the `RoundTripper` is the only
  test seam; there is no base-URL variable); methods `VerifyToken(ctx)`, `ListWorkers(ctx)`,
  `WorkerDomains(ctx)`, `BuildsConnections(ctx)`, `BuildsLatest(ctx, workerName)`,
  `ZoneByName(ctx, name)`, `ZoneSettings(ctx, zoneID)` (https-redirect, hsts),
  `EmailSendingSubdomains(ctx, zoneID)`, `ObservabilityQuery(ctx, q)`; `type APIError struct{
  Status int; Code int; Reason Reason }` with `Reason` an enum (`ReasonUnauthorized`,
  `ReasonForbidden`, `ReasonNotFound`, `ReasonBuildsNotConnected`, `ReasonBuildsRepoNotSelected`,
  `ReasonBuildsAppNotAuthorized`, `ReasonSenderNotConfigured`, `ReasonRateLimited`,
  `ReasonUnknown`) mapped from the v4 envelope the way `api.mjs` `throwMapped` and
  `buildsError` do (codes 10000, 8000007, 8000012, and the email refusal body);
  `func Corpus(t testing.TB, provider, name string) (status int, body []byte)` resolving
  `packages/create-cairn-site/fixtures/<provider>/<name>.json` by walking up to the directory
  containing `package.json` with `"name": "@glw907/cairn-cms"`.

**Acceptance:**
- Redirect test: an `httptest` server that 302s to a second server; the client returns the 302
  without following and the second server records zero requests.
- Host-pin test: a request built for `evil.api.cloudflare.com` is refused before send.
- Every `Reason` has a corpus-backed test mapping a real body to it; the 403 `code 10000` body
  maps to `ReasonForbidden` and a 401 to `ReasonUnauthorized`.
- `Credential` leak test: `fmt.Sprintf("%v %+v %#v %s", c, c, c, c)` and `json.Marshal(c)`
  contain no plaintext.
- `Corpus` failure message names the extraction trigger from the spec when the repo root is
  not found.
- Commit.

### Task 8: `providers`: GitHub, npm, and probe clients

**Files:**
- Create: `tool/internal/providers/github.go`, `github_test.go`, `npm.go`, `npm_test.go`,
  `probe.go`, `probe_test.go`

**Interfaces:**
- Produces: `type GitHub struct`, `func NewGitHub(cred Credential, rt http.RoundTripper)
  *GitHub` (a zero `Credential` means unauthenticated), methods `HeadSHA(ctx, repo, branch)`,
  `FileAtRef(ctx, repo, path, ref)`, `Branches(ctx, repo, prefix)` returning name plus last
  commit date and author login, `LatestBotCommit(ctx, repo, login)`, `TokenExpiry(ctx)`
  reading the `github-authentication-token-expiration` header; `type NPM struct` with
  `Latest(ctx, pkg)` and `Versions(ctx, pkg)`; `type Probe struct` with `func NewProbe(rt
  http.RoundTripper, resolver Resolver) *Probe` (no credential field exists on the type),
  `Get(ctx, url)` following redirects with `User-Agent: cairn-tool/<version>`,
  `GetNoFollow(ctx, url)`, `LookupTXT(ctx, name)`, `LookupNS(ctx, name)`, `LookupA(ctx, name)`;
  `Resolver` is an interface over `net.Resolver` so tests inject answers.

**Acceptance:**
- GitHub reason mapping has corpus-backed tests for 401, 403, 404, and 200 on `commits/main`
  and `contents/package.json`.
- `Probe` is asserted by a reflection test to have no field of type `Credential` and to send
  no `Authorization` header.
- `Probe.Get` to an `httptest` 302 chain follows it; `GetNoFollow` returns the 303 itself with
  its `Location`.
- Commit.

### Task 9: `spine` vocabulary

**Files:**
- Create: `tool/internal/spine/step.go`, `step_test.go`, `park.go`, `park_test.go`,
  `outcome.go`, `outcome_test.go`, `condition.go`, `condition_test.go`

**Interfaces:**
- Produces: `type Step string` with the 18 constants and `func ParseStep(string) (Step,
  error)`; `var TerminalSteps`, `Chapter3TerminalSteps`, `Chapter3ResumableSteps` ported
  from `chapter2.mjs:84`, `chapter3.mjs:70`, `chapter3.mjs:82`; `type ParkCode string` with
  the codes the hold loop and park pages use; `type State int` (`OK`, `Failing`, `Unknown`);
  `type Outcome struct{ State State; Reason ReasonCode; Detail string }` where a non-Unknown
  state with a non-empty `Reason` is rejected by `func (Outcome) Validate() error` and
  `Unknown` with an empty `Reason` likewise; `type ReasonCode string` with the catalogued set
  (`reason.cred-missing`, `reason.cred-forbidden`, `reason.cred-revoked`, `reason.timeout`,
  `reason.offline`, `reason.not-run`, `reason.park.<ParkCode>`, `reason.api.<Reason>`);
  `func FromKind(kind Kind, code string) Outcome` implementing the spec table (`wait` →
  Unknown with a park reason; `act`, `ask-someone` → Failing; `declined` → OK with detail);
  `type Condition string` and `var Conditions = []Condition{...}` copied from
  `src/lib/diagnostics/conditions.ts`.

**Acceptance:**
- A test reads `packages/create-cairn-site/src` at test time, greps `step: '` literals, and
  asserts the set equals the 18 constants (so a Node-side addition fails this test).
- A test reads `src/lib/diagnostics/conditions.ts` and asserts every `Condition` constant
  exists there.
- `Outcome{State: OK}` with a reason fails `Validate`; `Outcome{State: Unknown}` without one
  fails.
- Commit.

### Task 10: Credential mint-and-probe (Geoff's task, with a runnable probe)

**Files:**
- Create: `tool/cmd/cairn/probe_token.go` (hidden subcommand `cairn probe-token`), and
  `tool/docs/credentials.md`
- Modify: `~/.claude/docs/cloudflare-estate-inventory.md` (the read token's permission-group
  names and ids, resource scoping, and the probe results, values-free)

**Acceptance:**
- `cairn probe-token` reads `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, `CAIRN_GH_READ_TOKEN`
  and, for each endpoint the nine checks use, prints endpoint, HTTP status, and `Reason`, never
  a value. It exits 1 if any required endpoint is not 200.
- Geoff mints the Cloudflare token in the dashboard with read permissions for Workers
  Scripts, Workers Builds, Workers Observability, Zone, DNS, and Email Sending, account-scoped
  plus all zones of the account, and a fine-grained GitHub token with no repositories selected
  plus `cairn-pub` with Contents and Metadata read, shortest acceptable expiry; both stored via
  `secret-set.sh` per the workstation rule.
- The probe run against the minted token is recorded in `tool/docs/credentials.md` (which
  endpoints answered) and the inventory doc (which permission groups exist under which names).
  If no read-level Builds group exists, the task report says so and Task 15's Builds half is
  marked dropped in the plan before Pass B starts.
- Commit (docs and the probe command).

### Task 11: Pass A close

- Run `make -C tool check` on a clean clone in CI (all three legs green), run `code-simplifier`
  over `tool/`, run the `cairn-pass` end ritual: STATUS entry, CHANGELOG line under
  `## Unreleased` noting the `fixtures/` move in `create-cairn-site`, setup brief marked done,
  ROADMAP untouched. No release.

---

## Pass B: checks and the CLI

### Task 12: `health` skeleton and the check contract

**Files:**
- Create: `tool/internal/health/health.go`, `report.go`, `report_test.go`, `clients.go`,
  `health_test.go`

**Interfaces:**
- Consumes: `spine.Outcome`, `spine.Condition`, `record.Record`, the `providers` types.
- Produces: `type Clients struct{ CF *providers.Cloudflare; GH *providers.GitHub; NPM
  *providers.NPM; Probe *providers.Probe; HaveCF, HaveGH bool }`; `type Check interface{
  ID() string; Condition() spine.Condition; Needs() Tier; Run(ctx, record.Record, Clients)
  spine.Outcome }` with `Tier` one of `TierNone`, `TierCF`, `TierGH`, `TierBoth`; `type
  Report struct{ SchemaVersion int; Site string; Domain string; Checks []CheckResult;
  Degraded bool }`; `type CheckResult struct{ ID string; Condition spine.Condition; Outcome
  spine.Outcome; CheckedAt time.Time; Tier Tier }`; `func Run(ctx, r record.Record, c Clients,
  checks []Check, now func() time.Time) Report`; `var All []Check` appended by Tasks 13–18.

**Acceptance:**
- `Run` skips a check whose tier's client is absent, recording Unknown with
  `reason.cred-missing` and setting `Degraded`, and never calls `Run` on it.
- A panicking check is recovered into Unknown with `reason.not-run` and the panic logged.
- Report JSON omits account and zone ids unless a `Verbose` flag is set on the marshal call.
- Commit.

### Task 13: Serving and Delegation checks (the two ports)

**Files:**
- Create: `tool/internal/health/check_serving.go`, `check_serving_test.go`,
  `check_delegation.go`, `check_delegation_test.go`

**Acceptance:**
- Serving ports `confirmHostname` exactly: `GET https://<domain>/` must be 200 and `GET
  https://<domain>/admin` with no redirect-follow must be 303 with `Location` ending
  `/admin/login`; any other pair is Failing with the ported outcome vocabulary
  (`hostname-not-serving`, `certificate-pending` on a TLS error), and a DNS diagnosis that
  distinguishes `hostname-records-absent` from `hostname-resolver-lagging` the way
  `hostname.mjs:148-160` does. Tests cover all five outcomes with an `httptest` server and an
  injected resolver; a bare 200 on `/admin` is Failing.
- Delegation ports `checkDelegation`'s four states (`pending`, `wrong-nameservers`,
  `propagating`, `active`) from `zone.mjs:193`, mapping `active` → OK, `propagating` and
  `pending` → Unknown with a park reason, `wrong-nameservers` → Failing.
- Both are credential-tiered correctly (`TierNone`, `TierCF`).
- Commit.

### Task 14: HTTPS-forced and Email checks

**Files:**
- Create: `tool/internal/health/check_https.go`, `check_https_test.go`, `check_email.go`,
  `check_email_test.go`

**Acceptance:**
- HTTPS-forced reads the zone's `always_use_https` and HSTS settings; either off is Failing
  with condition `edge.https-not-forced` or `edge.hsts-off`.
- Email runs two halves in order. Credential-free: `_dmarc.<domain>` TXT must exist and its
  `p=` must not be `none` (Failing, detail quotes the policy); the SPF TXT on the sending
  subdomain must include Cloudflare's Email Sending include; the DKIM selector TXTs must
  resolve. Then, with a Cloudflare client, the zone's sending subdomain must be verified. The
  test suite includes the live shapes: a `p=none` record (as 907.life and aksailingclub.org
  carry today) is Failing; a `p=reject` one passes.
- Commit.

### Task 15: Deploy check with Builds state and the Behind state

**Files:**
- Create: `tool/internal/health/check_deploy.go`, `check_deploy_test.go`

**Interfaces:**
- Produces: `type DeployDetail struct{ WorkerExists, BuildsConnected, PushToDeploy bool;
  LastBuild BuildState; LastBuildSHA, MainSHA string; LastBuildAt time.Time; Behind bool }`
  carried in `Outcome.Detail` as JSON for the row and detail view; `BuildState` one of
  `BuildOK`, `BuildFailed`, `BuildRunning`, `BuildNone`.

**Acceptance:**
- Worker absent → Failing. Builds not connected → Failing with
  `reason.api.builds-not-connected` (the 907-life outage shape, tested with the corpus body).
  Last build failed → Failing with the build id in detail. Running → Unknown with
  `reason.park.builds-running`. OK and `MainSHA == LastBuildSHA` → OK; OK but differing →
  OK with `Behind: true` (the spec: Behind is a state of this cell, not a separate check).
- If Task 10 found no read-level Builds group, the Builds half is compiled out behind a build
  tag and the check degrades to worker-exists plus Behind, with the spec and this task's report
  saying so.
- Commit.

### Task 16: Publish-path and Engine checks

**Files:**
- Create: `tool/internal/health/check_publish.go`, `check_publish_test.go`,
  `check_engine.go`, `check_engine_test.go`

**Acceptance:**
- Publish-path: list `cairn/` branches and the newest `cairn-cms[bot]` commit on `main`.
  Failing when any `cairn/*` branch is older than 14 days with no later bot commit; Unknown
  with `reason.not-observable` when there are no branches and no bot commits at all (nothing
  to infer from); OK otherwise. Detail carries the branch count and ages for the drafts cell.
- Engine: parse the site's `package.json` on `main`, read the `@glw907/cairn-cms` range,
  compare to `npm view` latest; detail carries releases-behind and whether any skipped
  version's changelog section has a `Consumers must:` line (read from this repo's
  `CHANGELOG.md` via GitHub, same token). Behind by ≥ 1 with a `Consumers must:` → Failing;
  behind without → OK with detail; current → OK.
- Commit.

### Task 17: `logs` package and the Errors check

**Files:**
- Create: `tool/internal/logs/logs.go`, `logs_test.go`, `tool/internal/health/check_errors.go`,
  `check_errors_test.go`

**Interfaces:**
- Produces: `type Query struct{ Worker string; Since time.Duration; Event string; Limit int
  }`; `type Entry struct{ At time.Time; Level string; Event string; Fields
  map[string]json.RawMessage }`; `func Fetch(ctx, cf *providers.Cloudflare, q Query)
  ([]Entry, error)`; `func CountErrors(ctx, cf, worker, since) (int, error)`; a sentinel
  error `ErrObservabilityOff` mapped from the API's response when the Worker has no
  observability dataset.

**Acceptance:**
- `Fetch` builds the telemetry query body with a filter on the JSON `event` key when set and
  on `level` when counting; corpus-backed tests use a body captured in Task 10's probe (add it
  to the corpus with provenance in this task).
- Errors check: count of `level: error` records in 24 h; 0 → OK; > 0 → Failing with the
  count and the top three event names in detail; `ErrObservabilityOff` → Unknown with
  condition `config.observability-off`.
- Commit.

### Task 18: `adopt`

**Files:**
- Create: `tool/internal/spine/adopt.go`, `adopt_test.go`

**Interfaces:**
- Produces: `type Candidate struct{ Worker, Repo, Zone, AccountID string; Connected bool }`;
  `func Discover(ctx, cf *providers.Cloudflare, gh *providers.GitHub, accountID string)
  ([]Candidate, error)`; `func Adopt(st *store.Store, c Candidate, name string)
  (record.Record, error)` writing step `live`, `adopted: true`, no secrets, a fresh id via
  the Node shape; `func AlreadyAdopted(st *store.Store, c Candidate) bool` by worker name.

**Acceptance:**
- `Discover` lists every Worker on the account and marks `Connected` from Builds; it never
  writes. `Adopt` is refused for a candidate whose domain fails `record.ValidateDomain`.
- Idempotence: adopting the same candidate twice yields one record.
- Commit.

### Task 19: The cobra tree and the TTY gate

**Files:**
- Create: `tool/cmd/cairn/root.go`, `sites.go`, `health.go`, `logs.go`, `adopt.go`, `env.go`,
  `tty_test.go`, `env_test.go`

**Interfaces:**
- Produces: `func shouldLaunchTUI(isTTY bool, env func(string) string) bool` = `isTTY &&
  env("CI") == ""`; `func loadEnv(env func(string) string) (Env, []Missing)` returning the
  three values as `providers.Credential` plus the account id and a list of which are absent
  (never their values); subcommands `sites [--json]`, `health [site] [--json]
  [--expect-sites N] [--verbose]`, `logs <site> [--event] [--since] [--json]`, `adopt
  [--list] [--worker NAME [--repo SLUG]]`, hidden `probe-token`.

**Acceptance:**
- Bare `cairn` with a non-TTY stdout prints help and exits 0; with `CI=1` likewise (tests
  inject both).
- `adopt --list` prints candidates as JSON with a leading stderr line "not safe to paste".
- `adopt --worker X` with no TTY adopts without a prompt; interactive adopt is Task 27.
- No command reads an environment variable except through `loadEnv`; a test greps the
  package for `os.Getenv` and allows only `env.go`.
- Commit.

### Task 20: Tripwire exit codes and the scrubbing chokepoint

**Files:**
- Create: `tool/internal/logx/logx.go`, `logx_test.go` (JSON logger with `event` vocabulary
  and final-message scrub), `tool/cmd/cairn/exit.go`, `exit_test.go`
- Create: `tool/docs/reference/log-events.md`, `tool/docs/reference/exit-codes.md`

**Interfaces:**
- Produces: `func ExitCode(reports []health.Report, listErrs []error, expectSites int) int`
  with the spec contract: 0 all OK or Unknown only by `reason.cred-missing` (`degraded`); 1
  any Failing (precedence over Unknown); 2 any Unknown for another reason, an empty site set,
  any malformed record, or an `expectSites` mismatch; 4 reserved for tool error, set only by
  `main` on an error return; `logx.New(w io.Writer, scrub []providers.Credential)` whose
  every write runs the scrub last.

**Acceptance:**
- A table test covers each exit code including precedence (Failing plus Unknown → 1) and the
  empty-state-dir case → 2.
- Scrub test: a log line whose message embeds a credential's plaintext is emitted with
  `<redacted>` in its place.
- The sentinel byte-level test from the spec: a record fixture with sentinel secrets goes
  through `sites --json`, `health --json`, the logger, an error wrap, and `store.Save`; the
  sentinel appears only in the store file.
- `exit-codes.md` documents the routine contract, including that the routine must `source
  ~/.local/secrets` itself.
- Commit.

### Task 21: Pass B close

- Against the four production sites: set the three env values, run `cairn adopt --list`,
  adopt the four, run `cairn health --json`, and paste the (non-verbose) output into the
  pass report; it should show the two `p=none` sites Failing on Email and everything else
  honest. Run `code-simplifier`, `cairn-pass` end ritual. No release.

---

## Pass C: the HUD

### Task 22: `theme` port with the status additions

**Files:**
- Create: `tool/internal/theme/` (port of poplar's `palette.go`, `glyph.go`, `theme.go`,
  `spacing.go`, `typerole.go`, `border.go`, their tests; not `calendar.go`), plus
  `health_glyphs.go`, `health_glyphs_test.go`

**Acceptance:**
- `HealthGlyphs` has `OK`, `Failing`, `Unknown`, `Running` at the Unicode and ASCII tiers
  (ASCII `+ ! ? ~`); poplar's width-parity test covers them; `RoleUnknown` resolves in both
  palettes and both ANSI-16 slot maps with a contrast-class entry.
- No status rendering reuses `Selected`, `Flagged`, or `ErrorGutter`.
- Commit.

### Task 23: Render seam and gallery harness

**Files:**
- Create: `tool/internal/ui/render.go`, `gallery_test.go`, `testdata/gallery/.gitkeep`,
  `fixtures/` (report fixtures: empty, all-unknown, degraded, offline, one-sick, healthy)
- Modify: `tool/Makefile` (`gallery` target; `check` depends on `test` which includes the
  sweep)

**Interfaces:**
- Produces: `type RenderInput struct{ Screen ScreenID; Width, Height int; Profile
  theme.Profile; IsDark bool; Reports []health.Report; Status StatusState; Now time.Time }`;
  `type Frame struct{ Lines []string }`; `func Render(in RenderInput) Frame` with no I/O and
  no `tea.Program`; the sweep writes `<fixture>-<w>x<h>-<profile>.txt`.

**Acceptance:**
- Sizes 80, 120, 160 by heights 24 and 40; profiles truecolor, ANSI-16, no-color; the six
  fixtures; all four screens: every combination has a committed file, `go test` fails on
  drift and on an orphan file, `make -C tool gallery` regenerates. Line endings normalized to
  `\n` before compare.
- Never-color-alone gate: a test strips ANSI from each no-color render and asserts every
  state word (`ok`, `failing`, `unknown`) that appears in the truecolor render at the same
  size also appears here, scoped to widths ≥ 120. Falsify by rendering a state as color-only
  once and confirming the failure.
- Commit.

### Task 24: Root model, registry, status line, and the field bound

**Files:**
- Create: `tool/internal/ui/app.go`, `registry.go`, `statusline.go`, `footer.go`, `keys.go`,
  `app_test.go`, `registry_test.go`
- Create: `tool/tools/go.mod`, `tool/tools/analyzers/screenregistry/` (ported from poplar),
  `tool/tools/analyzers/cairncheck/main.go`; Makefile `analyzers` target

**Interfaces:**
- Produces: `type Screen interface{ tea.Model; Entry() ScreenEntry }`; `type ScreenEntry
  struct{ ID ScreenID; Title string; Keys help.KeyMap; FooterPriority []string }`; `func
  Register[S Screen](ScreenEntry)`; `type App struct` (root: stack, status, gen, reports,
  env); `func NewApp(Deps) App`; `type StatusState struct{ UpdatedAt, NextAt time.Time;
  Offline bool; Missing []Missing; CFOK, GHOK bool; GHExpiry time.Time }`.

**Acceptance:**
- A test asserts `reflect.TypeOf(App{}).NumField() <= 12` (the ADR bound).
- `make -C tool analyzers` runs `screenregistry` over `./...` and fails when a `Screen` is
  declared but not registered (falsify).
- Footer hints and `?` help derive from the registry; a test asserts every registered key
  appears in `?` help and no footer hint names an unregistered key.
- Status line renders the degraded banner (`no CAIRN_GH_READ_TOKEN: behind, engine, publish,
  drafts disabled`) and the offline banner from `StatusState`.
- Commit.

### Task 25: Sites table screen

**Files:**
- Create: `tool/internal/ui/sites.go`, `sites_test.go`, `columns.go`, `columns_test.go`

**Acceptance:**
- Rows in record order, name tiebreak; never re-sorted by a report. Columns per the spec at
  160, 120, and 80, with the 80 layout dropping DOMAIN and the commit column and rendering
  glyph-only status cells under `SRV PUB DNS EML`. Deploy cell renders `<glyph> <state>
  <age> <sha>` and drops the sha at 120.
- Summary line above the table from `StatusState` and the reports.
- Keys: Enter (detail), `a` (adopt), `l` (logs), `r`, `R`, `?`, `q`; all single keys, all
  registered.
- Gallery regenerated and committed; the one-sick fixture shows the gutter marker on the sick
  row only.
- Commit.

### Task 26: Detail and log screens

**Files:**
- Create: `tool/internal/ui/detail.go`, `detail_test.go`, `logview.go`, `logview_test.go`,
  `remedy.go`, `remedy_test.go`

**Acceptance:**
- Detail leads with a verdict line and a "do this next" line carrying the worst failing
  check's condition id and its `docs/admin/is-it-working.md` anchor (`remedy.go` maps
  condition → anchor, tested against the doc's actual headings), then failing and unknown
  checks expanded, ok folded to one line, last three builds, draft branches with age, then
  `step` and the record's last write time.
- Log screen renders `logs.Entry` rows newest-first, `e` cycles an event filter, `s` cycles
  `--since`, and the `ErrObservabilityOff` state shows the remedy line instead of an empty
  list.
- Gallery regenerated and committed.
- Commit.

### Task 27: Adopt dialog

**Files:**
- Create: `tool/internal/ui/adopt.go`, `adopt_test.go`

**Acceptance:**
- `a` opens a pick list from `spine.Discover`, Space toggles, Enter adopts the picked set
  through `spine.Adopt`, Esc leaves; already-adopted candidates are shown but unselectable.
  The dialog never shows account or zone ids.
- Gallery regenerated.
- Commit.

### Task 28: Generation-counted refresh

**Files:**
- Create: `tool/internal/ui/refresh.go`, `refresh_test.go`
- Modify: `tool/internal/ui/app.go` (wire the tick and the messages)

**Interfaces:**
- Produces: `type tickMsg struct{ gen uint64 }`; `type reportMsg struct{ gen uint64; site
  string; report health.Report }`; `type sweepDoneMsg struct{ gen uint64 }`; `func
  sweepCmd(gen uint64, sites []record.Record, clients health.Clients, limit int) tea.Cmd`
  whose closure owns an `errgroup` with `SetLimit(limit)` and a per-check timeout; one
  connectivity probe gates the fan-out and yields `offlineMsg{gen}` instead.

**Acceptance:**
- A stale `reportMsg` (gen < current) is dropped; a test sends one and asserts no state
  change. `R` bumps the generation. The next tick is scheduled from `sweepDoneMsg`, never
  free-running; a test asserts only one sweep is in flight. Per-check timeout times the check
  count is asserted below the interval.
- No package-level mutable state in `ui` except the registry (analyzer-enforced).
- Commit.

### Task 29: Pass C close and the sub-project report

- Launch `cairn` against the four sites at 80, 120, and 160 columns in a real terminal; the
  main loop reads the full-screen captures (the one-check rule). Run `code-simplifier`, the
  reviewer fan-out (`svelte-reviewer` is not relevant; use `web-auth-security-reviewer` and
  `cloudflare-workers-reviewer` plus a fresh-context Go reviewer), and the `cairn-pass` end
  ritual. Record both budgets. Write the sub-project 2 handoff line in STATUS pointing at the
  spec's "Inputs for sub-project 2". No release; the tool's first tag is a sub-project 2
  decision with distribution.

---

## Self-review

Spec coverage: repo home and gates (1), ADRs and conventions (2, 3), corpus (4), `record` (5),
`store` (6), `providers` (7, 8), `spine` (9, 18), credentials (10, 19, 20), `health` and every
check in the table (12–17), `logs` (17, 26), adopt (18, 27), `cmd` and exit codes (19, 20),
`theme` (22), render seam and gallery (23), architecture and tripwire (24), screens (25–27),
refresh (28), doctor relationship (9's condition test, 26's remedy map), pass closes (11, 21,
29). The `check:package` assertion and `paths-ignore` are in Task 1. The spec's "relationship
to cairn-doctor" ledger is owed by sub-project 2 and is not a task here.

Type consistency: `providers.Credential` is the only credential type and is consumed by
Tasks 7, 8, 19, 20; `spine.Outcome`/`ReasonCode`/`Condition` are consumed by 12–17 and 26;
`health.Report`/`Clients`/`Tier` by 19, 20, 23, 28; `record.Record` by 6, 18, 28;
`StatusState` by 23, 24, 25.

Pass sizing: Pass B carries ten tasks with nine checks; if Tasks 13–17 split during
execution, the cut point is after Task 17 (checks complete, CLI not yet), and the remainder
becomes Pass B2.
