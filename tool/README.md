# cairn

`cairn` is a monitoring CLI for a cairn-cms production site: read-only health checks, log
queries, and a scheduled tripwire that exits non-zero when something needs attention. Version 1.0
is the complete single-site operator CLI. Version 2.0 adds a terminal HUD and multi-site
management; neither ships here.

## Install

Two paths, both put a `cairn` binary on your `PATH`.

**`go install`**, if you have a Go toolchain:

```sh
go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
```

**A release binary**, if you don't. Download the archive for your platform from the
[releases page](https://github.com/glw907/cairn-cms/releases), matching your OS and architecture
(`linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`), and put the
`cairn` binary on your `PATH`.

`cairn` makes no update check and never contacts a release feed on its own. Checking for a new
version is something you do, on your own schedule, the same way you'd check any other CLI.

## Credentials

`cairn` needs three values to reach a site's Cloudflare zone and its GitHub repository:
`CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`. It resolves each one
from the environment first, then the OS keyring (`cairn auth set` writes to the keyring).
[`docs/credentials.md`](docs/credentials.md) covers scopes, storage, and the platform-specific
detail for Linux, macOS, and Windows.

## The site registry, and where it lives

`cairn` keeps a small local registry: one record per site you've adopted (`cairn adopt`), holding
the site's Worker name, its zone, and its GitHub repository. `cairn` resolves the registry's
directory in one order, first match wins, paths never merged:

1. `CAIRN_STATE_DIR`, if set.
2. The Node CLI's legacy `~/.config/cairn/sites` directory, if it already exists on disk.
3. `os.UserConfigDir()` plus `cairn/sites` (the platform's own config directory), otherwise.

The legacy directory outranks the platform config directory deliberately: on a platform where the
two diverge (macOS, or Linux with `XDG_CONFIG_HOME` set), it's where the Node CLI
(`create-cairn-site`) still writes, so an operator's existing records stay readable until they
choose to move. Removing the legacy directory is how you migrate to the platform config path;
`cairn` never migrates it for you.

## Exit codes

Every command ends in one of four codes, the Monitoring Plugins convention (the Nagios lineage
Icinga, Sensu, and most alerting tools already read):

| Code | Word | Meaning |
| --- | --- | --- |
| 0 | `OK` | Every check passed. |
| 1 | `WARNING` | A fault worth reporting that nobody is woken for. |
| 2 | `CRITICAL` | A fault the operator is paged for. |
| 3 | `UNKNOWN` | The run could not observe the site. |

[`docs/reference/exit-codes.md`](docs/reference/exit-codes.md) is the full contract: the
precedence rule across many checks and many sites, what changes a code, and the timeout
arithmetic you size a scheduler's cap against.

## Running it unattended

[`docs/tripwire.md`](docs/tripwire.md) covers running `cairn health` on a schedule, so a
non-zero exit pages someone: a cron line, a systemd timer and service unit, a launchd plist, and
a Windows scheduled task.

## For an agent

`cairn help agents` prints the tool's whole contract for a program: the exit codes, the
`--json` payload shape, and what never appears on stdout. It's in the binary itself, so it reads
the same on a machine that holds no copy of this repository.

## License

MIT.
