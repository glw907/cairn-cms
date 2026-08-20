# The `cairn` tool, sub-project 1: chapter spine, health HUD, and logs

**Status: approved design, 2026-08-20, revised the same day after a five-vantage adversarial
review and a 24-agent verify pass.** Third sitting on the Go successor tool, run with Geoff
through `superpowers:brainstorming`. It closes five of the ten open questions the pre-design
(`2026-08-13-go-successor-tool-design.md`) left for "the real design sitting" and re-homes the
other five into sub-projects 2 and 3. The pre-design's nine decisions stand unless amended
here. The implementation plan follows from this spec through `superpowers:writing-plans`.

Decisions tagged `(Geoff)` were his rulings in the sitting; the rest are the sitting's
synthesis and are re-openable on evidence.

## Decisions this sitting settled

1. **Three sub-projects, ordered for development efficiency (Geoff, 2026-08-20).**
   Provisioning and upgrades will be the most-used features, so the order front-loads the
   structure they sit on. Sub-project 1 (this spec) ports the chapter spine and ships a
   read-only health HUD with adopt-to-watch and a read-only log view. Sub-project 2 adds the
   chapter act steps (provisioning), the credential UX, adopt-to-manage, infrastructure-side
   and auth-store settings including user management, the `go:embed` template bake, and
   distribution. Sub-project 3 adds upgrades over the machine-readable changelog contract
   (ROADMAP P9), ordered rollout, upgrade rollback, deploy rollback as its own item, and
   repo-held settings. Each gets its own spec and plan.
2. **Chapter spine first (Geoff, 2026-08-20), with the premise corrected.** The Node CLI's
   chapter vocabulary (chapters, the 18 step strings, park codes, terminal and resumable
   classifications) is ported as Go types in sub-project 1, and health is defined as a set of
   read-side checks over a site record. The review established that the Node source holds
   only two separable read-side confirms (`confirmHostname`, `checkDelegation`); the rest of
   the confirm logic is interleaved with prompts and acts inside each chapter's private
   `runStep` closures. So the checks are two ports plus new read-side code derived from the
   Node API seam and the captured response bodies, and sub-project 1 is correspondingly
   larger than "port the spine" implied. The alternatives (standalone probes with the spine
   later, or a full provisioning port first) stay declined for the reasons the first draft
   gave.
3. **Component architecture: poplar's actual shape (Geoff, 2026-08-20, re-put after the
   review corrected the description).** One `ui` package. A root `App` model owns the
   screen stack, the global chrome (status line, footer, banners), and the refresh
   generation. Each surface implements a `Screen` interface that embeds `tea.Model` and
   returns a `ScreenEntry`; screens register in a package-level registry at init, and the
   registry is the single source of interaction truth from which the footer hints and `?`
   help derive. This is poplar's ADR-0011 as built, not the per-feature-package shape the
   first draft called "poplar's shape", and it is closer to Crush's centralized model than
   the first draft claimed. The tripwire that can actually fire: poplar's `screenregistry`
   analyzer ported, plus a bound on the root model's field count recorded in the ADR.
4. **Design language and input model: poplar's, by adoption (Geoff, 2026-08-20).** The tool
   is native-terminal in poplar's design language, carried as code (`internal/theme`:
   palette with contrast and degradation tests, ANSI-16 and no-color profiles, glyphs,
   spacing, type roles, borders). This answers the pre-design's Warm Stone question: the web
   admin's identity does not cross to the terminal. The theme ports with additions named
   below (a status glyph set and an unknown role), since poplar's theme carries error, warn,
   and success roles but no ok/failing/unknown glyphs. The input model is poplar's ADR-0012,
   modifier-free single keys, no chords or leader sequences, no kitty enhancements, Esc as
   leave-field, footer hints and `?` help for discoverability.
5. **Credential model: split by scope, not by site (Geoff, 2026-08-20).** The watch half runs
   on two machine-level read credentials plus an account id, all from the environment. Per-site
   provisioning secrets stay in the site's record, are never decoded by sub-project 1, and load
   lazily in later sub-projects only when a verb that mutates that site runs. The tool never
   writes or mints a machine credential.
6. **The tool is an operator cockpit, and says so (Geoff, 2026-08-20).** Pre-design decision 3
   read "site console, not just a setup wizard, and not an operator cockpit. Content and admin
   operations stay in the web admin." The second half is amended and the headline reversed:
   content operations stay in the web admin; administrative operations (user management, site
   settings of all three kinds, provisioning, upgrades) are replicated in the tool as a second
   front over the same contracts the web admin uses. The tool is an owner-side product
   distinct from the engine's public surface, and `docs/internal/what-cairn-is-and-is-not.md`
   names it as such so the charter's "little else" boundary is read as governing the engine a
   consumer inherits, not the operator's own console.
7. **A read-only log view ships in sub-project 1 (Geoff, 2026-08-20).** The admin's whole
   crisis method is "map the symptom to its log event" (`docs/admin/troubleshooting.md`), so a
   HUD that shows a red row and then hands the operator to the Cloudflare dashboard fails at
   the moment it matters. The view is read-only over the Workers Observability telemetry query
   API, which costs one more read permission and widens sub-project 1 by roughly a quarter.

## Repo home and gates

The tool lives at `tool/` in this repo with its own `go.mod` (module
`github.com/glw907/cairn-cms/tool`), `cmd/cairn/main.go`, and `internal/` for everything
else. `tool/` is excluded from the npm tarball by the `files` allowlist in `package.json`; the
review found `check:package` asserts nothing about top-level paths, so the plan adds an
assertion to `scripts/checks/check-package-files.mjs` that no packed path begins with `tool/`.
`tool/` is outside `npm test`.

The tool carries its own Makefile whose `check` target runs tidy-check, fmt-check, vet, lint,
the analyzers, `vale-comments`, unit tests, and the gallery sweep. A workflow `tool.yml`,
path-filtered to `tool/**` with `defaults.run.shell: bash`, runs `make check` on a Linux,
macOS, and Windows matrix from the first commit; the pre-design's Platforms section makes the
matrix the requirement's only acceptable form. Two facts the review surfaced about the
existing CI: none of the five Node workflows is path-filtered, so a tool-only PR still pays
the full Node suite (the plan adds `paths-ignore: ['tool/**']` to them in the same pass), and
`main` has no branch protection today while ROADMAP's go-public pass adds it, so that pass
must make `tool.yml`'s legs required only through a skipped-run-succeeds pattern or a
tool-only PR can never merge. Release tags take the prefix `tool/v`. Extraction to its own
repository stays available through `git filter-repo` on the triggers the pre-design names;
the fixture-corpus resolver below has to survive that day.

Two ADRs land with the first commit, under `tool/docs/adr/`. `0001-component-architecture`
records decision 3 with the registry analyzer and field bound as the tripwire.
`0002-design-language-and-input` records decision 4 by reference to poplar's design-language
artifact and ADR-0012. A cairn fork of `elm-conventions` is written after ADR-0001 lands, per
the setup brief (`docs/superpowers/2026-08-18-tui-skills-setup-brief.md`), carrying poplar's
lipgloss v2 rule unchanged and re-deriving its scope section, which still names poplar
packages that no longer exist.

## Layers

Eight packages under `tool/internal/`, dependencies pointing strictly downward, with
`cmd/cairn` as the top layer above all of them:

- `cmd/cairn` depends on `ui`, `health`, `logs`, `store`.
- `ui` depends on `health`, `logs`, `store`, `record`, `theme`.
- `health` and `logs` depend on `spine`, `providers`, `record`.
- `spine` depends on `providers`, `record`.
- `store` depends on `record`.
- `providers`, `record`, and `theme` depend on nothing internal.

### `record`

The site record type and nothing else, so `store` (persistence) and `spine` (checks) share
it without `providers` fakes dragging in the path resolver. The type carries the fields the
Node CLI writes and sub-project 1 reads (`name`, `step`, `domain`, the GitHub and Cloudflare
sub-objects' non-secret identifiers, `schemaVersion`, `adopted`). Every other key, including
every secret-bearing one (`cloudflare.apiToken`, `github.clientSecret`, `github.webhookSecret`,
`github.pem` when present), round-trips as an opaque `map[string]json.RawMessage` tail that is
re-emitted byte for byte. Plaintext secrets never enter a typed field in sub-project 1, which
is stronger than a redacting type: there is nothing to leak. Version 1 also reserves a
`secretRefs` object (`{"github.clientSecret": "keyring://cairn/<siteId>/clientSecret"}`) so a
later keychain migration is an additive change, with the stated compatibility boundary that
Node-CLI interop is guaranteed only for records whose secrets are literals. The site id is
validated against the Node CLI's `SITE_ID_SHAPE` on every read and write. `domain` is
validated as a bare LDH DNS name: no scheme, userinfo, port, path, or query, no IP literal,
and a resolution result in a private or loopback range is rejected.

### `store`

Reads and writes records. The directory is `os.UserHomeDir()` plus `.config/cairn/sites` on
Linux and macOS, exactly what `state.mjs` does, and explicitly not `os.UserConfigDir`, which
diverges on darwin (`~/Library/Application Support`) and honors `XDG_CONFIG_HOME` on Linux,
which the Node CLI ignores. On Windows the directory is `%APPDATA%\cairn\sites`, and the store
also reads the POSIX path when it exists. `CAIRN_STATE_DIR` overrides everywhere. Precedence
is `CAIRN_STATE_DIR`, then the platform path, then the POSIX legacy path; first match wins,
paths are never merged, and the store logs which it used.

Records carry `schemaVersion`. A record without one is version 0 and is upgraded to version 1
on first write, never on read. Writes go temp-in-same-dir plus rename, opened with
`O_NOFOLLOW`, and the store refuses a state directory that is a symlink or not owned by the
effective user. On POSIX the store refuses to load a record that is group- or world-readable,
or whose directory is group- or world-writable, and never silently repairs. On Windows mode
bits are meaningless, so the store checks the owner SID and the absence of a non-owner ACE
through `golang.org/x/sys/windows`, and the Windows test leg asserts that behavior rather than
skipping. Output uses `SetEscapeHTML(false)`, two-space indent, and a trailing newline so a
record the Go tool rewrites stays readable to the Node CLI.

### `spine`

The chapter vocabulary as Go types. `Chapter` is one of github, cloudflare, domain, email,
builds. `Step` is an exhaustive enum of the 18 strings the Node CLI writes to `step`:
`scaffolded`, `app-created`, `awaiting-org-approval`, `repo-created`, `pushed`, `deployed`,
`live`, `zone-created`, `records-carried`, `delegated`, `domain-live`, `paid-plan-declined`,
`email-onboarded`, `email-live`, `builds-live`, `builds-connect-declined`,
`builds-connected`, `config-reconciled`. `step` is a single scalar shared across chapters, so
health never derives from it; it is shown in the detail view as lifecycle position only.
`ParkCode` is the separate vocabulary the hold loop and park pages use
(`hostname-records-absent`, `hostname-resolver-lagging`, `email-sender-propagating`, and the
rest), never written to `step`. `TERMINAL_STEPS`, `CHAPTER3_TERMINAL_STEPS`, and
`CHAPTER3_RESUMABLE_STEPS` port as the classification rather than a hand-derived order.

`Check` is the read-side unit: `Check(ctx, record, clients) Outcome`, where `Outcome` is ok,
failing, or unknown, unknown always carries a catalogued reason code, and there is no way to
express ok without the check having run. Two checks port directly (`confirmHostname`'s marker
pair and `checkDelegation`'s four-state delegation verdict); the rest are new code against
the captured bodies. The Node kinds (`wait`, `act`, `ask-someone`, `declined`) map to
`Outcome` by an explicit table in the spine: `wait` is unknown with a park reason, `act` and
`ask-someone` are failing with their code, `declined` is ok with a note. Each check also
declares the `cairn-doctor` condition id it corresponds to
(`src/lib/diagnostics/conditions.ts`), and a test asserts every declared id exists, so the
HUD, the doctor, and `docs/admin/is-it-working.md` share one vocabulary and the detail view's
remedy link is mechanical.

Act steps are declared as interfaces in sub-project 1 and implemented in sub-project 2.
`adopt` is a plain function in sub-project 1. The site-actions seam (`Plan`, `Apply`,
credential tiers, the shared confirm dialog) is designed in sub-project 2, where provisioning's
multi-hop, park-and-resume, browser-trip constraints are visible; a seam validated only
against `adopt` would be validated against nothing.

### `providers`

REST clients for GitHub, Cloudflare, the Cloudflare observability query endpoint, and the
npm registry, plus a credential-free `probe` client for DNS lookups and HTTPS GETs. Each
credentialed client takes its credential as a constructor parameter, sets it on the request
(never in a `RoundTripper`), pins its host to a compile-time constant and asserts
`req.URL.Host` against it before every send, and sets `CheckRedirect` to refuse all redirects.
No environment variable overrides a provider base URL in a release build; the test seam is an
injected `RoundTripper` or an `httptest` server. The `probe` client is a distinct type with no
credential field, follows the site's own redirects (it carries nothing), sends a stable
`User-Agent: cairn-tool/<version>` so a site can filter it from its own logs, and only ever
GETs. Every call has a timeout. The error classification ports from the Cloudflare API seam
(`api.mjs` `throwMapped`, `throwIfTokenInvalid`, `buildsError`, which read the v4 envelope's
status and `errors[0].code`) and from the GitHub and email feature modules where the
classification lives; the catalogue modules contribute copy and kind, keyed by code. A 401 and
a 403 both map to unknown with distinct reasons (revoked versus under-scoped), and the tool
calls `/user/tokens/verify` once per refresh cycle so the status line can tell them apart,
since the 403 body alone cannot.

### `health`

Runs the spine's checks over a record and returns a `Report` with a `schemaVersion`, a
per-check `checkedAt`, and the outcomes. Pure over its inputs, so the same function backs
`cairn health --json` and the HUD. The first cut:

| Check | Question | Credential | Doctor condition |
|---|---|---|---|
| Serving | `/` answers 200 and `/admin` answers 303 to `/admin/login` (the ported marker pair; a bare 200 is not ours) | none | `edge.*` |
| Delegation | the zone's nameservers are active at Cloudflare (ported `checkDelegation`) | Cloudflare read | `edge.*` |
| HTTPS forced | the zone redirects HTTP to HTTPS and carries HSTS | Cloudflare read | `edge.https-not-forced` |
| Deploy | the Worker exists, Builds is connected with push-to-deploy on, and the last build's state is ok, failed, or building, with its trigger commit | Cloudflare read | new |
| Behind | `main`'s head is not the last successful build's commit (a state of the Deploy cell, not a separate check) | both reads | new |
| Publish path | observable signals of the GitHub App working: the newest `cairn-cms[bot]` commit's age versus the newest `cairn/*` branch's age, and no `cairn/*` branch older than a threshold with no later bot commit | GitHub read | `github.app-unreachable` |
| Engine | the site's `@glw907/cairn-cms` range on `main` versus the latest published, rendered as releases behind and flagged when the gap carries a `Consumers must:` | GitHub read, public npm | new |
| Email | effective state, credential-free: `_dmarc` resolves and is not `p=none`, the Email Sending SPF include and DKIM selectors are present; plus the zone's sender readiness from Cloudflare | none, then Cloudflare read | `email.*` |
| Errors | count of error-level log records in the last 24 hours | Cloudflare observability read | new |

The Email check is the one the review proved necessary: two of the four production sites
carry `p=none` DMARC policies today, and the first draft's "sending domain verified" would
have called them ok. The Publish-path check is observable-only in sub-project 1 because the
real test (mint an installation token and read the repo) needs the App private key, which by
design lives only in each Worker; adopt-to-manage in sub-project 2 decides whether that key
ever comes back to the workstation. Left out on purpose: D1 reachability and auth-store
contents (the D1 query endpoint executes arbitrary SQL, so it is a write-capable scope and
belongs to sub-project 2), certificate expiry (Cloudflare manages it), plan and build-minute
usage (billing is an unscopable account permission, and both failure modes already surface
through Serving and Deploy), and anything content-shaped.

### `logs`

A read-only query over `POST /accounts/{id}/workers/observability/telemetry/query`, filtered
by Worker and by the engine's `event` field, with `--since` and `--event` selectors. The
`Errors` check above is the same query aggregated. `cairn logs [site] [--event] [--since]
[--json]` is the subcommand twin. Observability must be on for the site
(`config.observability-off` in the doctor vocabulary); when it is off, the view says so and
links the remedy rather than showing nothing.

### `ui`

Poplar's shape per decision 3. `app.go` owns the root model, the screen stack, the status
line, the footer, and the refresh generation. Screens: `sites` (the table), `detail`, `logs`,
and the `adopt` dialog, each registered with its verbs. `theme` ports from poplar with a
`HealthGlyphs` token set (ok, failing, unknown, running) at both tiers, ASCII `+ ! ? ~`, and a
`RoleUnknown`; poplar's `Selected: "X"` and the `! / !` collision are not reused for status.
The pure `Render(RenderInput) Frame` seam is the testing surface.

Refresh is a generation-counted sweep. A tick message carrying `gen` makes `Update` increment
the generation and return one sweep `Cmd` whose closure owns an `errgroup` with a concurrency
limit (the semaphore is `Cmd`-local, so no package-level state), plus the next tick. Reports
arrive per site as `reportMsg{gen, site, report}` and `Update` drops any message whose `gen`
is stale, poplar's own pattern. Per-check timeouts sum below the interval, the next tick is
scheduled on sweep completion rather than free-running, and a manual `R` bumps the generation
the same way. The row shows its last report with its age until a new one lands, and a report
for a record `adopt` has since rewritten is dropped by site id.

### `cmd/cairn`

A cobra tree. Bare `cairn` launches the TUI when stdout is a TTY and `CI` is unset, and
prints help otherwise, the same predicate as the Node hold loop's
`!yes && isTTY && !CI` minus the `yes` term. Sub-project 1's subcommands are `cairn sites
[--json]`, `cairn health [site] [--json] [--expect-sites N]`, `cairn logs`, `cairn adopt
--list` (candidates as JSON) and `cairn adopt --worker <name> [--repo <slug>]` for the
non-interactive path. Every TUI action has a subcommand, or it cannot be scripted, scheduled,
or run over ssh.

## Adopt and the HUD

Adopt-to-watch is discovery with confirmation. `cairn adopt` lists the account's Workers
with the Cloudflare read token, and for each Worker that Builds reports as connected to a
repository it proposes a candidate: Worker name, repository, zone (from the Worker's custom
domains), account id. The operator picks the cairn sites; the tool writes a record per pick at
step `live` with `adopted: true` and no secrets. A Worker with no Builds connection is still
adoptable by naming its repository, because that is the outage case the Deploy check exists to
flag. Adopt is idempotent. The account listing returns every Worker on the account, cairn or
not, so the candidate list is a pick list, never written wholesale, and the `--list` output is
marked not safe to paste. Adopt-to-manage (per-site secrets, rotation, and the write-once
GitHub App claim the pre-design asks to verify) is sub-project 2.

The v1 view cut is three screens and one dialog. The **sites table** is the launch screen.
Rows render in record order with name as the deterministic tiebreak and never re-order as
reports land; the first draft's worst-first sort was struck because an async ticker would move
rows under the cursor and make the goldens depend on arrival order. Columns at 120: name,
deploy cell (`<glyph> <state> <age> <sha>`), last `main` commit subject and age, engine
releases-behind, four status cells (serve, publish, DNS, email) each a glyph plus a word,
pending draft count (`cairn/*` branches), and the 24-hour error count. Above the table one
summary line: `4 sites · 1 failing · 1 unknown · updated 12s ago · next 48s · cf ok · gh ok`.
The status line is where a missing credential is named (`no CAIRN_GH_READ_TOKEN: behind,
engine, publish, drafts disabled`) and where an offline state shows (`OFFLINE · showing
results from 4m ago`, with the board dimmed and keeping last-good values instead of 28
unknowns); one connectivity probe per tick gates the fan-out. There is no separate doctor
view.

The **detail view** (Enter) leads with a one-line verdict and a "do this next" line carrying
the worst failing check's condition id and its `is-it-working.md` anchor, then failing and
unknown checks expanded with reason and the credential used or lacked, ok checks folded to one
line, then the last three builds with state, sha, subject, and age (and a failed build's log
tail plus dashboard link, matching what the Node CLI already prints at a park), then pending
draft branches with age, then lifecycle position (`step`) and the record's last write. `r`
reruns that site, `R` reruns all, `l` opens the log view for the site.

The **log view** shows the query above newest-first, filterable by event, with the record's
fields rendered and nothing invented.

Width degradation at three breakpoints, each with goldens. At 160 every column shows. At 120
the commit subject truncates and the deploy cell drops the sha. At 80 the domain and commit
columns drop, the four status groups render glyph-only in fixed order under an abbreviated
header (`SRV PUB DNS EML`), and deploy age and the engine behind-count stay. Glyph-only
satisfies never-color-alone because ok, failing, and unknown are distinct glyphs rather than
one glyph in three colors, and the golden assertion that every state word survives is scoped
to the widths that carry words.

## Credentials, safety, and the tripwire

Three machine-level values, read from the environment, never written by the tool.
`CAIRN_CF_ACCOUNT_ID` pins every Cloudflare request path to one account; the tool never
enumerates accounts, which keeps a token mis-scoped to "all accounts" harmless.
`CAIRN_CF_READ_TOKEN` is a Cloudflare token with read permissions for Workers Scripts, Workers
Builds, Workers Observability, Zone, DNS, and Email Sending, scoped to the account and to all
zones of that account (the email, DNS, and HTTPS checks are zone-scoped). The review measured
that Workers Builds and Observability are separate permission groups absent from the estate's
existing admin token, that the only Builds template key ever confirmed is `workers_ci` at edit
level, and that Cloudflare renders an unknown template key as an empty control with no error.
So the plan's first credential task mints the token in the dashboard, records the exact
permission-group names and resource scoping in `~/.claude/docs/cloudflare-estate-inventory.md`,
and probes every endpoint the checks use; if no read-level Builds group exists, the Deploy
check's Builds half is dropped rather than holding an edit token in a watch tool.
`CAIRN_GH_READ_TOKEN` is a fine-grained GitHub token with no repositories selected by default
(three of the four site repos are public, and the token buys rate-limit headroom, not access),
with Contents and Metadata read added per repository only for a private site repo such as
`cairn-pub`; it has the shortest tolerable expiry, and the status line shows the expiry date
GitHub returns on every response.

All three arrive through the workstation age store. The tool reads them as a guarded type from
startup, never as a bare string, scrubs every known credential value from every emitted string
as the last step of the log and error chokepoint (the Node CLI's `redactToken` rule, applied to
the final message), never passes them to a child process, and never accepts one on argv. The
operator-facing docs state the hygiene: set them in the secrets file, never with `export` at a
prompt.

A check whose credential is absent or under-scoped returns unknown with that reason. Sub-project
1 decodes no per-site secret at all (see `record`). A byte-level test marshals a
sentinel-bearing record fixture through every output path (`--json`, the log chokepoint, the
gallery, error strings, the store write) and greps for the sentinel.

`cairn health --json` and `cairn sites --json` carry `schemaVersion`, site name, public domain,
check id, outcome, catalogued reason code, and `checkedAt`. Account ids, zone ids, build
UUIDs, local paths, and repository names appear only under `--verbose`, which prints a
not-safe-to-paste warning. Log records follow the engine's convention: JSON through one
chokepoint, an `event` vocabulary on the tool's reference page, never a token.

The tripwire is the subcommand, with the alert predicate separated from the honesty predicate.
Exit 0: every check on every site is ok, or unknown only because a credential the operator has
not configured is absent (the report carries `degraded: true` and the reasons). Exit 1: any
check failing, with precedence over unknown. Exit 2: any check unknown for a reason other than
a missing credential (a 403 mid-run, a timeout, a revoked token), or the site set is empty, or
any record failed to parse, or `--expect-sites N` does not match. Exit 4: tool error, never
reused for a check outcome. A scheduled routine sources the secrets file itself (the
interactive shell's sourcing does not reach cron), runs the command, and alerts on non-zero.

## Testing and parity

The shared corpus is created, not assumed. The captured response bodies live today inline in
`packages/create-cairn-site/test/fake-cloudflare.mjs` and `test/fake-github.mjs` with
provenance comments; the first draft's `src/**/fixtures` JSON does not exist. The plan's first
corpus task extracts every body into `packages/create-cairn-site/fixtures/<provider>/**/*.json`
with its provenance header, rewires both Node fakes to load from there, and proves the Node
suite still passes. Go tests resolve the corpus through one root-anchored resolver (walk up to
the repository root), never a raw `../../..`, and the resolver's failure message names the
extraction trigger so the day the tool leaves this repo the corpus moves with it deliberately.

Unit tests cover `record` (validation of id and domain, opaque-tail round trip, `secretRefs`),
`store` (version 0 read, version 1 write, path resolution on all three platforms with
`CAIRN_STATE_DIR` and the Windows dual-path read, `XDG_CONFIG_HOME` ignored, the POSIX
permission refusal, the Windows ACL check, symlink refusal), `spine` (every step string
round-trips; the kind-to-outcome table; every condition id exists), `providers` (every
catalogued code maps to its outcome; host pinning; redirect refusal), `health` (a report over a
known fixture set yields the expected outcomes, including every unknown reason and the
degraded flag), and `cmd` (exit codes against an empty state dir, a garbage record, a missing
token, and a failing site).

Fakes refuse what the real service refuses. Provider fakes are built from the catalogued
refusals, so an under-scoped token, a Builds connection with no repository, and a zone off the
account all produce their real bodies.

Goldens are the UI gate, through poplar's harness rather than `teatest`, which poplar evaluated
and rejected. The pure `Render(RenderInput) Frame` seam runs no program and does no I/O; a
table test sweeps fixture × profile × size into committed plain-text renders under
`testdata/gallery`, named `<fixture>-<w>x<h>-<profile>.txt`; the ordinary `go test` fails on
drift or an orphan file, and `make gallery` accepts a deliberate change. The sweep covers the
table, detail, log, and adopt screens at 80, 120, and 160 columns and two heights, under the
truecolor, ANSI-16, and no-color profiles, for the empty state, the all-unknown state, the
degraded state (one token missing), the offline state, and one sick site, with line endings
normalized. A check strips ANSI and asserts every state word survives at the widths that carry
words. Keystroke-flow tests, if any, are a separate small suite, never the golden engine.

Every gate is falsified before it is trusted: the plan's first task for each gate breaks the
code deliberately, confirms the gate fails, and restores it. Comment prose runs through Vale's
`glw907` overlay via `vale-comments` on the Go side, per the setup brief's Task 4.

## Relationship to `cairn-doctor`

The pre-design retires the doctor into this binary. The HUD absorbs the doctor conditions its
checks declare (the table above), declines the ones that need a per-site credential until
sub-project 2 (`auth.store-unreachable`, `auth.unknown-role`, `config.bindings-missing`), and
sub-project 2's design carries the check-by-check ledger that decides when `npx cairn-doctor`
can retire. The condition-id test is what keeps the three vocabularies (doctor, HUD, admin
docs) from drifting in the meantime.

## Inputs for sub-project 2, recorded now

- **User management, in two slices.** First a cross-site roster read (every editor across every
  site with role and last sign-in), then per-site writes. Both ride sub-project 2's D1
  credential, since the query endpoint is write-capable SQL. The writes additionally wait on
  verifying that the allowlist shape and owner/editor semantics exist as one module the web
  admin already uses, consumable by the tool.
- **The GitHub App key question.** The real publish-path check mints an installation token,
  which needs the App private key that by design lives only in each Worker. Adopt-to-manage
  decides whether a key ever returns to the workstation; until then the HUD's Publish check is
  observable-only.
- **Scratch-token hygiene.** Every `create-cairn-site` run mints a token named
  `cairn create-cairn-site`, so the dashboard pile regrows. Provisioning names tokens per site
  and revokes them on teardown.
- **The write-once GitHub App secret claim** stays unverified until adopt-to-manage.
- **Distribution** (brew, a Windows channel, the npm shim) rides with sub-project 2.
- **The web surface.** Whether T4d's button door is absorbed or stays a sibling is re-filed to
  sub-project 2, which is the first sub-project that could absorb it.

## Inputs for sub-project 3, recorded now

Deploy rollback (pin the Worker to its previously live version) is its own item beside
upgrade rollback (revert the engine range and push), not merged into it. Its design owes one
decision: under push-to-deploy a version pin is not durable, since `main` still holds the bad
commit and the Behind state lights up, so rollback either always pairs a git revert or is
offered as a stated-temporary pin.

## Out of scope for sub-project 1

Any write to a site or its infrastructure. Decoding any per-site secret. Provisioning.
Upgrades. Deploy rollback. The site-actions seam. Distribution beyond `go build`. A web
surface. The Node CLI's retirement criteria, which belong to sub-project 2 once parity has
something to measure.

## Start condition

Nothing blocks it. T4d is closed, `0.95.0` is published, and the spine ports from the Node
source as it stands on `main`. The first session invokes `go-conventions` and
`bubbletea-design`, re-reads poplar's current `internal/ui` and `internal/theme` before
writing ADR-0001, executes the setup brief's Tasks 1, 2, and 4 as the plan's opening tasks,
mints and probes the read token before any check is written, and extracts the fixture corpus
before any `spine` code.
