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

### Not in 1.0

The bubbletea terminal HUD, the concurrent multi-site sweep, and multi-site management beyond
adopting and listing are 2.0's. See `docs/adr/0001-the-spine-is-the-product.md`.
