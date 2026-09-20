# Credentials and the site registry

`cairn` needs three values to reach a site's Cloudflare zone and its GitHub
repository, and a place on disk to keep the sites it has adopted. Neither
store is a product cairn ships: an operator's own environment and OS
keyring hold the credentials, and a directory on the operator's own machine
holds the registry.

## The three variables

- `CAIRN_CF_ACCOUNT_ID`: the Cloudflare account id the site's zone lives
  under.
- `CAIRN_CF_READ_TOKEN`: a read-scoped Cloudflare API token.
- `CAIRN_GH_READ_TOKEN`: a read-scoped GitHub token.

`cairn auth set <name>` and `cairn auth list` operate on exactly these
three names.

## Resolution order: environment first, then keyring

`cairn` resolves each variable by trying the environment first, then the OS
keyring. Environment first is what keeps a scheduled run, a container, or a
CI job working with no keyring at all: none of those has a session keyring,
and none needs one if the three variables are already exported. An operator
who prefers not to keep a value in a shell profile stores it in the keyring
instead, with `cairn auth set`.

## Linux and macOS

Export the three variables from a shell profile, or from a secrets file the
shell sources on login. A value typed at an interactive prompt lands in
shell history; prefer a file the shell reads rather than a command typed
directly at the prompt.

```sh
export CAIRN_CF_ACCOUNT_ID="..."
export CAIRN_CF_READ_TOKEN="..."
export CAIRN_GH_READ_TOKEN="..."
```

## Windows

Set the three as user environment variables, either through the System
settings pane (Settings > System > About > Advanced system settings >
Environment Variables) or from a shell with `setx`:

```powershell
setx CAIRN_CF_ACCOUNT_ID "..."
setx CAIRN_CF_READ_TOKEN "..."
setx CAIRN_GH_READ_TOKEN "..."
```

`setx` takes effect in new shells only, not the one that ran it.

## Every platform: `cairn auth set`

`cairn auth set <name>` is the alternative that keeps a value out of any
file the operator manages. It prompts for the value with echo off and
writes it to the OS keyring; it never reads a value from a flag or from an
argument, so the value never appears in shell history or in a process
listing.

```sh
cairn auth set CAIRN_GH_READ_TOKEN
```

`cairn auth list` reports which provider answers each of the three
variables, environment, keyring, or neither, and never prints a value.

## Where the keyring stores it

- macOS: Keychain.
- Windows: Credential Manager.
- Linux: the Secret Service over D-Bus. This needs a running keyring
  daemon (most desktop sessions provide one) and an unlocked collection. A
  read against a bus with no daemon, or with no session keyring, is treated
  as an absent value, the same as an operator who has only set the
  environment variables.

`cairn` names no operator's own secret store, such as a password manager's
CLI or a cloud secrets service, as a source; the environment and the OS
keyring are the two providers 1.0 ships.

## Where `cairn` stores the site registry

`cairn adopt` writes one JSON record per site under a directory `cairn`
resolves in this order:

1. `CAIRN_STATE_DIR`, when set.
2. The directory the Node `create-cairn-site` CLI already writes to,
   `~/.config/cairn/sites`, when it exists on disk. This directory outranks
   the platform default deliberately, so an operator's existing records are
   never silently unread on a platform where the two differ.
3. Otherwise, the platform's own configuration directory plus
   `cairn/sites`: `%AppData%\cairn\sites` on Windows,
   `~/Library/Application Support/cairn/sites` on macOS, and
   `$XDG_CONFIG_HOME/cairn/sites` (or `~/.config/cairn/sites` when
   `XDG_CONFIG_HOME` is unset) on Linux.

## Token scopes

The permission groups each token needs, and the repositories a GitHub
token must reach, are recorded here once the credential mint-and-probe
task measures them.
