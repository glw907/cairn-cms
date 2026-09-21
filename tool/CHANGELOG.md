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
- **`cairn auth check`**: confirms the nine credential permissions this tool itself needs, either
  from credentials alone or, naming one registered site, against that site's own zone and
  repository too (`docs/credentials.md`'s "Token scopes"). `cairn auth probe` is now its hidden
  alias.
- **`--theme dark|light`**: a root flag choosing the ground the palette is read against,
  defaulting to `dark`. It detects nothing and reads no environment variable, and it is
  independent of colour: `--color` and `NO_COLOR` decide whether cairn paints at all.
- **A fifth check-result word, `unknown`**: a check that was attempted and observed nothing (a
  timeout, a transport failure, a rate limit) reads `unknown`, and `skip` now means only a check
  that was not attempted, by configuration. Both still carry a `reason`, and the exit-code
  arithmetic is unchanged: a cred-missing `skip` contributes `WARNING` and every `unknown`
  contributes `UNKNOWN`. `cairn-health.schema.json`'s `state` enum carries the word, with no
  `schemaVersion` increment: no consumer exists before the tag.
- **`--quiet` prints the whole body on a non-OK run**, rather than the failing rows alone. It
  still writes nothing at all when the run is OK, which is what keeps a cron-driven green run
  silent, and it never changes an exit code.

### Not in 1.0

The bubbletea terminal HUD, the concurrent multi-site sweep, and multi-site management beyond
adopting and listing are 2.0's. See `docs/adr/0001-the-spine-is-the-product.md`.
