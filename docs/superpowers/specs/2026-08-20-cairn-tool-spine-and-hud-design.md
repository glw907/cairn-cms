# The `cairn` tool, sub-project 1: chapter spine and health HUD

**Status: approved design, 2026-08-20.** Third sitting on the Go successor tool, run with
Geoff through `superpowers:brainstorming`. It closes the open questions the pre-design
(`2026-08-13-go-successor-tool-design.md`) left for "the real design sitting" and scopes the
first of three sub-projects. The pre-design's nine decisions stand unless amended here. The
implementation plan follows from this spec through `superpowers:writing-plans`.

## Decisions this sitting settled

1. **Three sub-projects, ordered for development efficiency.** Provisioning and upgrades
   will be the most-used features, so the order front-loads the structure they sit on.
   Sub-project 1 (this spec) ports the chapter spine and ships a read-only health HUD with
   adopt-to-watch. Sub-project 2 adds the chapter act steps (provisioning), the credential
   UX, adopt-to-manage, infrastructure-side and auth-store settings including user
   management, the `go:embed` template bake, and distribution. Sub-project 3 adds
   upgrades over the machine-readable changelog contract (ROADMAP P9), ordered rollout,
   rollback, and repo-held settings. Each gets its own spec and plan.
2. **Chapter spine first.** The Node CLI's chapter vocabulary (chapters, hops, steps,
   parks, and each chapter's confirm step) is ported as Go types in sub-project 1. Health
   is defined as running every chapter's confirm step against a site record. Provisioning
   later adds act steps to a spine that already exists and is already tested against the
   shared fixture corpus. The alternatives, standalone health probes with the spine ported
   later, or a full provisioning port first, were declined: the first re-derives the
   confirm steps and drifts, the second blocks on a release for the template bake.
3. **Component architecture: poplar's shape, with a tripwire.** Per-feature packages each
   own a `tea.Model`, export typed messages upward, and the root routes them. Crush's
   centralized model (`github.com/charmbracelet/crush`, `internal/ui/AGENTS.md`) was
   weighed and declined on efficiency: poplar's `uicore`, theme, golden harness, analyzer
   gate, and `elm-conventions` transplant as-is, and this tool's UI is modest. The
   tripwire, recorded in the ADR: a message relayed through more than one intermediate
   model is the signal to revisit.
4. **Design language and input model: poplar's, by adoption.** The tool is
   native-terminal in poplar's design language, carried as code (`internal/theme`:
   palette with contrast and degradation tests, glyphs, spacing, type roles, borders).
   This answers the pre-design's Warm Stone question: the web admin's identity does not
   cross to the terminal. The input model is poplar's ADR-0012, modifier-free single
   keys, no chords or leader sequences, no kitty enhancements, Esc as leave-field, footer
   hints and `?` help for discoverability. A command palette can arrive later as one more
   single-key verb if the verb count outgrows the footer.
5. **Credential model: split by scope, not by site.** The watch half runs on two
   machine-level read credentials from the environment. Per-site provisioning secrets stay
   in the site's record and load lazily, only when a verb that mutates that site runs. The
   tool never writes or mints a machine credential.
6. **Administrative operations are replicated, not absorbed.** User management and site
   settings will be offered in the tool as a second front over the same contracts the web
   admin uses. This amends the pre-design's decision 3: content operations stay in the web
   admin; administrative operations may be replicated in the tool. Site settings means all
   three kinds, infrastructure-side (REST), repo-held (commit and push), and auth-store
   (D1), sequenced into sub-projects 2 and 3 as named in decision 1.

## Repo home and gates

The tool lives at `tool/` in this repo with its own `go.mod` (module
`github.com/glw907/cairn-cms/tool`), `cmd/cairn/main.go`, and `internal/` for everything
else. `tool/` is outside the npm `files` list, which `check:package` enforces, and outside
`npm test`. It carries its own Makefile whose `check` target runs tidy-check, fmt-check,
vet, lint, the analyzers, `vale-comments`, unit tests, and golden tests. A workflow
`tool.yml`, path-filtered to `tool/**`, runs `make check` on a Linux, macOS, and Windows
matrix from the first commit; the pre-design's Platforms section makes the matrix the
requirement's only acceptable form. Release tags take the prefix `tool/v`, separate from
the engine's `v`. Extraction to its own repository stays available through
`git filter-repo` on the triggers the pre-design names.

Two ADRs land with the first commit, under `tool/docs/adr/`. `0001-component-architecture`
records decision 3 with the tripwire. `0002-design-language-and-input` records decision 4
by reference to poplar's design-language artifact and ADR-0012. A cairn fork of
`elm-conventions` is written after ADR-0001 lands, per the setup brief
(`docs/superpowers/2026-08-18-tui-skills-setup-brief.md`), carrying poplar's lipgloss v2
rule unchanged.

## Layers

Five packages under `tool/internal/`, dependencies pointing strictly downward:
`ui` depends on `health` and `store`; `health` on `spine`; `spine` on `providers` and
`store`; `providers` and `store` on nothing internal.

### `store`

Reads and writes site records. The directory resolves per platform: `~/.config/cairn/sites`
on Linux and macOS, `%APPDATA%\cairn\sites` on Windows, with `CAIRN_STATE_DIR` overriding
everywhere. On Windows the store also reads the POSIX path when it exists, because a
machine that ran the Node CLI has records there. Files stay `0600` JSON with the same bytes
the Node CLI writes, so the two tools interoperate during the succession.

Records carry `schemaVersion`. The Node CLI writes no version field today, so a record
without one is version 0; the store upgrades it to version 1 on first write, never on read.
Version 1 adds `schemaVersion` and `adopted` and changes nothing else. The record type
carries every field the Node CLI can write, including the secret-bearing ones, so records
round-trip; nothing in sub-project 1 dereferences a secret.

Secret fields are typed `store.Secret`, a distinct string type whose `String()` returns a
redaction marker. The analyzer gate flags any `fmt` or logging call that receives one.

### `spine`

The chapter vocabulary as Go types. `Chapter` is one of github, cloudflare, domain, email,
builds. `Step` is an exhaustive enum of the step strings the Node CLI writes (`scaffolded`,
`live`, `builds-live`, `hostname-records-absent`, `hostname-resolver-lagging`,
`email-sender-propagating`, and the rest, enumerated from the source at port time, never
from memory). `Park` carries a park state with its re-entry. Each chapter exposes
`Confirm(ctx, record, clients) Outcome`, its confirm step ported from the Node source.
`Outcome` is one of ok, failing, or unknown, and unknown always carries a reason; there is
no way to express ok without the check having run. Act steps are declared as interfaces in
sub-project 1 and implemented in sub-project 2.

The spine also declares the site-actions seam. An `Action` has a name, the credential tier
it needs (machine read, site manage, or repo write), `Plan(record)` returning what it would
change, and `Apply`. The TUI renders any Action through one confirm dialog that shows the
plan, and the cobra tree registers each as a subcommand with `--dry-run` mapped to `Plan`.
Sub-project 1 ships the interface with `adopt` as its only implementation, so the seam is
exercised once before anything destructive uses it.

### `providers`

Thin REST clients for GitHub, Cloudflare, and the npm registry, plus a credential-free
`probe` client for DNS lookups and HTTPS GETs. Each client takes its credential as a
parameter; none reads the environment. The error vocabulary ports from the Node
`catalogue` modules, which already map API bodies to named outcomes. A 403 on an
under-scoped credential maps to unknown, never to failing. Every call has a timeout.

### `health`

Runs the spine's confirm steps over a record and returns a `Report`. Pure over its inputs,
so the same function backs `cairn health --json` and the HUD. The first cut is seven checks,
each declaring the credential it needs:

| Check | Question | Credential |
|---|---|---|
| Serving | HTTPS GET of the apex returns 200 with cairn's public-output header | none |
| Sign-in door | `/admin` responds and renders the magic-link form | none |
| DNS | apex and `www` resolve to Cloudflare | none |
| Deploy wiring | the Worker exists and Workers Builds is connected with push-to-deploy on | Cloudflare read |
| Drift | the repo's `main` head vs the Worker's last successful build commit | both reads |
| Engine version | the site's `@glw907/cairn-cms` range on `main` vs the latest published | GitHub read, public npm |
| Email | the sending domain is verified for the zone | Cloudflare read |

Deploy wiring is the check that would have flagged 907-life's month-long push-to-deploy
outage. Drift catches a silently failed build. Engine version is the row the upgrade verb
later acts on. Left out on purpose: D1 reachability and auth-store contents (the sign-in
door covers the visible symptom and the D1 query scope is a sub-project 2 credential),
certificate expiry (Cloudflare manages it), and anything content-shaped.

### `ui`

Poplar's shape. `app.go` is the root; feature packages `sites/` (the table), `detail/`, and
`adopt/` each carry `model.go`, `msgs.go`, `keys.go`, `cmds.go`, and golden tests. `uicore`
and `theme` transplant from poplar. All I/O runs in a `tea.Cmd`. Refresh is a ticker Cmd
(default 60 seconds, configurable) that calls `health`; there is no goroutine polling
outside a Cmd. Checks run per site with bounded concurrency, and a slow check cannot block a
row's render, because the row shows its last report with its age until the new one lands.

### `cmd/cairn`

A cobra tree. Bare `cairn` launches the TUI when stdout is a TTY and `CI` is unset, and
prints help otherwise, reusing T4d's interactive gate. Sub-project 1's subcommand twins are
`cairn sites`, `cairn health [site] [--json]`, and `cairn adopt`. Every TUI action has a
subcommand, or it cannot be scripted, scheduled, or run over ssh.

## Adopt and the HUD

Adopt-to-watch is discovery with confirmation. `cairn adopt` lists the account's Workers
with the Cloudflare read token, and for each Worker that Builds reports as connected to a
repository it proposes a candidate: Worker name, repository, zone (from the Worker's custom
domains), account id. The operator picks the cairn sites; the tool writes a record per pick
at step `live` with `adopted: true` and no secrets. A Worker with no Builds connection is
still adoptable by naming its repository, because that is the outage case the deploy-wiring
check exists to flag. Adopt is idempotent: a rerun skips recorded sites and offers only new
candidates. Adopt-to-manage (per-site secrets, rotation, and the write-once GitHub App
claim the pre-design asks to verify) is sub-project 2.

The v1 view cut is two views and one dialog. The sites table is the launch screen: one row
per site with name, domain, engine version against latest, last deploy age, and a status
cell per check group (serve, deploy, DNS, email). Each cell is a glyph paired with a word, so
a row reads without color; unknown has its own glyph and never renders as ok. A row's worst
check sets its sort rank, so a sick site rises. The detail view (Enter) lists every check
with its outcome, reason, the credential it used or lacked, and the last run time; `r`
reruns that site and `R` reruns all. The adopt dialog (`a`) hosts discovery. Footer hints
and `?` help come from the chassis.

Width degradation is designed at three breakpoints, each with a golden. At 160 columns every
column shows. At 120 the deploy-age and engine columns abbreviate. At 80 the status groups
collapse to a single worst-of glyph and the domain truncates from the left.

## Credentials, safety, and the tripwire

Two machine-level read credentials, read from the environment, never written by the tool.
`CAIRN_CF_READ_TOKEN` is a Cloudflare token scoped to Workers Scripts read, Workers Builds
read, Zone read, DNS read, and Email Sending read on the one account. `CAIRN_GH_READ_TOKEN`
is a fine-grained GitHub token with metadata and contents read on the site repositories.
Both are minted once, stored in the workstation age store per the standing secrets rule,
and arrive through `~/.local/secrets`. The tool's doctor view names a missing credential and
the checks it disables. The tool never prompts for a paste and never offers to create a
token; the credential UX belongs to sub-project 2 and must not leak into the read path.

Secrets cannot reach a screen or a log. The `store.Secret` redaction and analyzer rule
cover the code path. Goldens of the detail view regenerate from a record fixture that
carries sentinel secret values, so a leak fails a test.

Logging follows the engine's convention: JSON records through one chokepoint, an `event`
vocabulary documented on the tool's reference page, safe to paste. `CAIRN_LOG` selects the
level.

The tripwire is the subcommand. `cairn health --json` exits 0 when every check on every
site is ok, 1 when any is failing, and 2 when any is unknown, and prints the report. A
scheduled routine runs it and alerts on non-zero; the TUI is what the operator opens when it
fires. This covers the nobody-was-looking outage case without adding a daemon.

## Testing and parity

Unit tests cover `store` (version 0 read, version 1 write, platform path resolution,
`CAIRN_STATE_DIR`, the Windows dual-path read, `0600` preserved), `spine` (every step string
round-trips; every confirm step against recorded fixtures), `providers` (every catalogued
error body maps to its named outcome), and `health` (a report over a known fixture set yields
the expected outcomes, including every unknown reason).

Fixtures are the shared corpus. The Node CLI's tests run against language-neutral JSON
bodies captured from real services with provenance. The Go tests read the same files from
`packages/create-cairn-site/src/**/fixtures` by relative path, never copies. A confirm step
whose outcome differs between the two engines fails the Go test; that is the parity contract
as a test, and the reason the tool lives in this repo.

Fakes refuse what the real service refuses. Provider fakes are built from the catalogued
refusals, so an under-scoped token, a Builds connection with no repository, and a zone off
the account all produce their real bodies.

Goldens are the UI gate. `teatest` drives the table, detail, and adopt views at 80, 120, and
160 columns, plus the empty state, the all-unknown state (no tokens), and one sick site, with
line endings normalized so the Windows leg compares fairly. A check strips ANSI from each
golden and asserts every state word survives, which enforces never-color-alone.

Every gate is falsified before it is trusted: the plan's first task for each gate breaks the
code deliberately, confirms the gate fails, and restores it.

Comment prose runs through Vale's `glw907` overlay via `vale-comments`, wired as the setup
brief's Task 4 describes, on the Go side and never through `npm run check:vale`.

## Inputs for sub-project 2, recorded now

- **User management needs one home for the rules.** Both fronts read and write the same
  `AUTH_DB`, so the allowlist table shape and the owner/editor semantics must live in one
  module the web admin already uses, consumable by the Go tool over D1's REST query
  endpoint. Whether that module exists in a consumable form is a precondition to verify at
  sub-project 2's design, not a claim.
- **Scratch-token hygiene.** Every `create-cairn-site` run mints a token named
  `cairn create-cairn-site`, so the dashboard pile regrows. The provisioning port names
  tokens per site and revokes them on teardown.
- **The write-once GitHub App secret claim** stays unverified until adopt-to-manage.
- **Distribution** (brew, a Windows channel, the npm shim) rides with sub-project 2; a
  read-only HUD only the owner runs needs no channel.

## Out of scope for sub-project 1

Any write to a site or its infrastructure. Per-site secrets. Provisioning. Upgrades.
Distribution beyond `go build`. A web surface. The Node CLI's retirement criteria, which
belong to sub-project 2 once parity has something to measure.

## Start condition

Nothing blocks it. T4d is closed, `0.95.0` is published, and the spine ports from the Node
source as it stands on `main`. The first session invokes `go-conventions` and
`bubbletea-design`, executes the setup brief's Tasks 1, 2, and 4 as the plan's opening
tasks, and writes the two ADRs before any feature code.
