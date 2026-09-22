# Changelog

## 1.0.0

The complete single-site operator CLI.

### Added

- **The site registry** (`internal/store`): one JSON record per adopted site, resolved from
  `CAIRN_STATE_DIR`, the Node CLI's legacy directory, or the platform config directory, first
  match wins. `cairn adopt` and `cairn adopt list` populate it from the Workers on a Cloudflare
  account; `cairn sites list` (aliased by bare `cairn sites`) reads it back.
- **Nine read-only health checks** (`internal/health`): `creds`, `serving`, `delegation`,
  `https-forced`, `email`, `deploy`, `publish-path`, `engine`, and `errors`, each a pure function
  over a site record and a set of provider clients. `cairn health <site>` runs them against one
  site; bare `cairn health` sweeps every site the registry holds.
- **The credential providers** (`internal/providers`, `internal/secrets`): Cloudflare, GitHub,
  npm registry, and DNS clients, and a keyring-backed credential store `cairn auth set`,
  `cairn auth list`, and `cairn auth unset` operate on. Each of the three credential variables
  (`CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, `CAIRN_GH_READ_TOKEN`) resolves from the
  environment first, then the keyring.
- **Log queries** (`internal/logs`): `cairn logs <site>` reads and classifies a site's Cloudflare
  Workers Logs entries, filtered by event name and lookback window.
- **The exit-code contract** (`internal/spine`): every command ends in one of four codes, the
  Monitoring Plugins convention (`OK`, `WARNING`, `CRITICAL`, `UNKNOWN`), combined across many
  checks and many sites by CRITICAL, then UNKNOWN, then WARNING, then OK, never numeric order.
  See `docs/reference/exit-codes.md`.
- **The terminal render and its `--json` contract** (`internal/render`): a single-site body, a
  many-sites summary strip and fix list, a log body, and a status line, each rendered at three
  colour tiers and two glyph tiers, with an ASCII-safe fallback. Every reporting command's
  `--json` output is schema-published under `docs/reference/`; see `docs/reference/json-output.md`.
- **Acknowledgements**: `--ack` and `--ack-file` let an operator suppress a known, time-boxed
  failure on one check without silencing the whole site.
- **`cairn help agents`**: the tool's whole contract for a program, printed from the binary
  itself so it reads the same on a machine that holds no copy of this repository.
- **A man page** for every non-hidden command (`make install` installs it beside the binary).
- **`cairn auth check [<site>]`**: confirms the nine credential permissions this tool itself
  needs, either from credentials alone or, naming one registered site, against that site's own
  zone and repository too (`docs/credentials.md`'s "Token scopes"). Named with no site, the four
  zone-scoped and repository-scoped rows read `skip`, so the run exits WARNING even on a perfect
  token. `cairn auth probe` is now its hidden alias.
- **`--theme dark|light`**: a root flag choosing the ground the palette is read against,
  defaulting to `dark`. It detects nothing and reads no environment variable, and it is
  independent of colour: `--color` and `NO_COLOR` decide whether cairn paints at all.
- **A fifth check-result word, `unknown`**: a check result now reads `pass`, `fail`, `held`,
  `skip`, or `unknown`. `skip` means only a check that was not attempted, by configuration, such
  as one needing a credential the operator has not set; `unknown` means a check that was
  attempted and observed nothing, such as a timeout, a transport failure, or a rate limit. Both
  carry a `reason`, and the exit-code arithmetic is unchanged: a cred-missing `skip` contributes
  `WARNING` and every `unknown` contributes `UNKNOWN`. `cairn-health.schema.json`'s `state` enum
  carries the word, with no `schemaVersion` increment: no consumer exists before the tag.
- **`--quiet` prints the whole body on a non-OK run**, rather than the failing rows alone. It
  still writes nothing at all when the run is OK, which is what keeps a cron-driven green run
  silent, and it never changes an exit code. The rule keys on the run's own verdict on every
  path, a terminal or a pipe and one site or many, so a bare `cairn health --quiet` under cron,
  systemd, launchd, or Task Scheduler is silent on a green run.
- **`cairn adopt --domain <domain>`**: adopts a Worker that serves a site through a Workers
  Route. cairn provisions Workers Custom Domains and never Workers Routes, so discovery reads the
  Custom Domains route alone and cannot build a record for a route-served Worker. `cairn adopt
  list` names those Workers in their own group and says how to adopt one; the JSON payload
  carries the split as a new optional `adoptable` field, added within `schemaVersion` 1.

### Fixed before the tag

A live run against a real Cloudflare account on 2026-09-21 found two defects every fake-backed
test had missed. Both are fixed, and every provider route the tool reads now has a response
recorded from a live call in the fixture corpus with a test that decodes it.

- **Pagination read one field Cloudflare does not always send.** The page walk stopped when
  `result_info.total_pages` was absent, which it is on three of the six list routes the tool
  reads. `GET /accounts/{id}/workers/domains` reports `per_page` and `total_count` instead, at one
  domain per page, so Worker discovery saw one of an account's seven custom domains and
  `cairn adopt` refused every site but that one with `record: domain is empty`. The walk now reads
  whichever fields arrived and stops on the first empty page regardless.
- **The Workers Logs query body no longer matched the live API.** Each filter must declare a
  `type`; without it the endpoint answers HTTP 400. `cairn logs` failed on every site and the
  `errors` check reported every site's observability as turned off, because a 400 classified as
  `unknown` and the log path read `unknown` as a missing dataset. The query now carries the
  `type`, the decoder reads the response's real shape (`result.events` is an object, and each
  event carries the Worker's record under `source`), an HTTP 400 carries its own
  `reason.api.request-rejected` with a detail naming cairn as the faulty party, and the
  missing-dataset reading is narrowed to a 404. Live evidence: a Worker with observability unset
  answers 200 with zero events, so no status distinguishes that condition.
- **The `errors` check counted the wrong thing.** It counted every error-level line a Worker
  logged, which on a public site is mostly the site's own `console.error` output for crawler
  404s. A live run read `1000 errors in 24h` for a healthy site, a number that was the query's own
  limit and held no cairn record at all. The check now counts the records cairn's engine writes
  through `src/lib/log`, recognized by the `event` key of their envelope and asked for in the
  query itself, so a site's own logging cannot move the count. A count that still fills the page
  limit reads `at least 1000 errors in 24h` rather than passing a floor off as a total, and
  `--json` carries `errorCountTruncated` beside `errorCount` when it does.
- **An adopted record now carries its zone id**, which discovery read off the Custom Domains
  route and then dropped. Without it the `https-forced` and `email` checks report unobservable on
  every adopted site.
- **A first run with no registry directory** lists nothing instead of failing with a raw
  "no such file or directory". An absent registry is an empty registry; `cairn adopt` creates the
  directory when it writes.
- **`cairn <unknown-command>`** now prints the two-line usage error the contract states, naming
  where to read the commands.
- **The `deploy` check's cred-missing skip** carries a detail, so the plain body no longer prints
  the bare code `reason.cred-missing`.
- **`cairn-health.schema.json`** requires `reason` on a `skip` or an `unknown`, which
  `json-output.md` already promised, through a JSON Schema 2020-12 `if`/`then`. No
  `schemaVersion` increment.

A second live run on 2026-09-21 found that no healthy site could ever read `OK`: every one of the
owner's five carried three or four rows that were the tool's own gaps rather than facts about the
site, so a scheduled run would have exited 3 forever.

- **`delegation` read `unknown` on every adopted site.** It compares the domain's nameservers
  against the pair recorded under `cloudflare.nameServers`, a key `cairn adopt` never wrote, so no
  site the Go tool adopted could carry one. Adoption records the pair from the zone listing it
  already reads, and the check falls back to the zone itself for a record written before that,
  which is the same fact from its own authority.
- **`deploy` skipped for a credential the run had.** `Clients.HaveBuilds` was set nowhere, so the
  check never called Workers Builds on any site and told the operator to run `cairn auth set` with
  both tokens set and all nine permissions passing. The check calls the triggers route and lets
  the API answer.
- **A Worker with no Workers Builds trigger is a `skip`, not a `fail`.** Deploying from a CI job
  or a local `wrangler deploy` is a choice, not a broken pipeline, and the check has nothing it
  could have read either way. It contributes `WARNING`, and its fix line names the connection
  rather than a credential.
- **`publish-path` reported the ordinary quiet state as unobservable.** A repository with no open
  `cairn/*` branch has nothing waiting on an editor, which is where a site spends most of its
  life. It passes and says so; `unknown` is now for a repository the run could not read.
- **A record naming no repository says so.** Discovery learns a repository from a Builds trigger
  alone, so a site deployed any other way is adopted without one, and `deploy`, `publish-path`,
  and `engine` each asked GitHub for `/repos//` and reported the 404 as the site's own fault. All
  three now skip with `reason.repo-not-recorded` and a fix naming `cairn adopt --repo`.
- **`serving` told an operator a hostname does not answer when it answers.** A host whose home
  page returns 200 and whose `/admin` is another site's now reads "the hostname answers, but
  /admin is not cairn's sign-in page" under its own code; the older line keeps the case it is
  true of.
- **`cairn adopt list` defaulted `--json` to true**, so the bare command printed a wall of JSON in
  a terminal. It defaults off, like every other `--json` in the tool.
- **A bare `cairn sites list` on an empty registry exited 3.** Listing no sites is a complete
  answer to which sites are registered, so it exits `0`; only `--expect-sites` makes the count a
  claim, and `cairn health` still refuses an empty registry.
- **`cairn adopt --worker X --domain Y`** clears the discovered zone when `Y` sits outside every
  zone on the account, rather than leaving another zone's id on the record for the zone-scoped
  checks to read as this site's.
- **The fleet table clipped its last column at a narrow width.** At `--width 60` the "engine"
  heading printed as "e" over a version cut to one character. The two leading columns always
  draw; each one after them draws only if it fits whole.

### Not in 1.0

The bubbletea terminal HUD, the concurrent multi-site sweep, and multi-site management beyond
adopting and listing are 2.0's. See `docs/adr/0001-the-spine-is-the-product.md`.
