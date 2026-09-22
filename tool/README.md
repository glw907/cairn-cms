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

This needs Go 1.26 or newer. A `go install` build carries no commit, so `cairn --version` prints
`none` where a release binary prints a short SHA. Go stamps no VCS revision into a
`module@version` install, so that is the build's own shape and not a fault.

**A release archive**, if you don't. Download the one for your platform from the
[releases page](https://github.com/glw907/cairn-cms/releases):

| Platform | Archive |
| --- | --- |
| Linux, x86-64 | `cairn_<version>_linux_amd64.tar.gz` |
| Linux, ARM64 | `cairn_<version>_linux_arm64.tar.gz` |
| macOS, Intel | `cairn_<version>_darwin_amd64.tar.gz` |
| macOS, Apple silicon | `cairn_<version>_darwin_arm64.tar.gz` |
| Windows, x86-64 | `cairn_<version>_windows_amd64.zip` |
| Windows, ARM64 | `cairn_<version>_windows_arm64.zip` |

Each archive holds the `cairn` binary and a `man` directory with a page for every command. Put
the binary on your `PATH`, and copy `man/*.1` into a directory on your `MANPATH` to read
`man cairn`.

`cairn` makes no update check and never contacts a release feed on its own. Check the releases
page when you want a newer version.

### Verify what you downloaded

The release page carries a `SHA256SUMS` file covering all six archives. Download it beside your
archive and check the file arrived intact:

| Platform | Command |
| --- | --- |
| Linux | `sha256sum -c --ignore-missing SHA256SUMS` |
| macOS | `shasum -a 256 -c --ignore-missing SHA256SUMS` |
| Windows | `Get-FileHash cairn_<version>_windows_amd64.zip -Algorithm SHA256` |

`Get-FileHash` prints the hash rather than checking it, so compare its output with the matching
line in `SHA256SUMS` yourself.

A checksum published on the same page as the file it covers proves integrity, not authenticity:
whoever could replace an archive there could replace the checksum beside it. The build provenance
attestation is what binds an archive to the workflow and the commit that built it. Verify it with
the [GitHub CLI](https://cli.github.com):

```sh
gh attestation verify cairn_<version>_linux_amd64.tar.gz --repo glw907/cairn-cms
```

It passes only for an archive GitHub Actions built from a commit in this repository.

A published `tool/vX.Y.Z` tag is permanent: the Go module proxy caches it, so it is never moved
or deleted. A broken release is corrected by a `retract` directive for that version in the next
version's `go.mod` and a new patch tag, never by deleting the tag.

## Credentials

`cairn` needs three values to reach a site's Cloudflare zone and its GitHub repository:
`CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`. It resolves each one
from the environment first, then the OS keyring (`cairn auth set` writes to the keyring).
[The credentials reference](docs/credentials.md) covers scopes, storage, and the platform-specific
detail for Linux, macOS, and Windows. `cairn auth check` confirms the permissions this tool itself
needs against your own two tokens, either with credentials alone or, naming one registered site
(`cairn auth check <site>`), against that site's own zone and repository too.

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

## Output

`cairn` renders for a dark terminal. Pass `--theme light` to render for a light one. The flag
detects nothing and reads no environment variable, and it is independent of colour: `--color` and
`NO_COLOR` decide whether `cairn` paints at all, `--theme` decides which palette it paints from.

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
