# cairn

`cairn` is a monitoring CLI for a cairn-cms production site. It runs read-only health checks,
queries logs, and runs a scheduled tripwire that exits non-zero when something needs attention.
Version 1.0 is the complete single-site operator CLI. A terminal HUD is planned for a later 1.x
release, and `cairn health` already checks every site it knows.

## Install

Both paths put a `cairn` binary on your `PATH`.

**`go install`**, if you have a Go toolchain:

```sh
go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
```

**A release binary**, if you don't. Download the archive for your platform from the
[releases page](https://github.com/glw907/cairn-cms/releases), matching your OS and architecture
(`linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`), and put the
`cairn` binary on your `PATH`.

`cairn` makes no update check and never contacts a release feed on its own. Check the releases
page when you want a newer version.

## Credentials

`cairn` needs three values to reach a site's Cloudflare zone and its GitHub repository:
`CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`. It resolves each one
from the environment first, then the OS keyring (`cairn auth set` writes to the keyring).
[The credentials reference](docs/credentials.md) covers scopes, storage, and the platform-specific
detail for Linux, macOS, and Windows.

## The site registry, and where it lives

`cairn` keeps a small local registry: one record per site you've adopted (`cairn adopt`), holding
the site's Worker name, its zone, and its GitHub repository. `cairn` resolves the registry's
directory in one order, first match wins, paths never merged:

1. `CAIRN_STATE_DIR`, if set.
2. The Node CLI's legacy `~/.config/cairn/sites` directory, if it already exists on disk.
3. `os.UserConfigDir()` plus `cairn/sites` (the platform's own config directory), otherwise.

The legacy directory outranks the platform config directory deliberately. On a platform where the
two diverge (macOS, or Linux with `XDG_CONFIG_HOME` set), it's where the Node CLI
(`create-cairn-site`) still writes. An operator's existing records stay readable there until they
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

[The exit-code contract](docs/reference/exit-codes.md) states the precedence rule across many
checks and many sites, what changes a code, and the timeout arithmetic you size a scheduler's cap
against.

## Running it unattended

[Running cairn on a schedule](docs/tripwire.md) covers a cron line, a systemd timer and service
unit, a launchd plist, and a Windows scheduled task, so a non-zero exit pages someone.

## For an agent

`cairn help agents` prints the tool's whole contract for a program: the exit codes, the
`--json` payload shape, and what never appears on stdout. It's in the binary itself, so it reads
the same on a machine that holds no copy of this repository.

## License

MIT.
