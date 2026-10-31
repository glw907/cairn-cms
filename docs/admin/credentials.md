# Credentials and the site registry

`cairn` needs three values to reach a site's Cloudflare zone and its GitHub
repository, and a place on disk to keep the sites it has adopted. Neither
store is a product cairn ships: an operator's environment and OS
keyring hold the credentials, and a directory on the operator's machine
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

### Piping a value with no terminal at all

`cairn auth set <name>` also reads from stdin when the echo-off prompt has
no terminal to read from, which is what a script or a scheduled setup step
needs:

```sh
printf %s "$v" | cairn auth set CAIRN_GH_READ_TOKEN
```

A trailing `\r\n` is stripped the same as a bare `\n`, so a value piped
from a Windows shell or a PowerShell pipeline arrives clean. A value typed
at an interactive prompt can still reach shell history; a value in a
pipeline can still reach a process listing on some platforms. Neither
risk is eliminated by either form; a file the shell reads on login, as
the earlier sections describe, keeps a credential out of both.

## Where the keyring stores it

- macOS: Keychain.
- Windows: Credential Manager.
- Linux: the Secret Service over D-Bus. This needs a running keyring
  daemon (most desktop sessions provide one) and an unlocked collection. A
  read against a bus with no daemon, or with no session keyring, is treated
  as an absent value, the same as an operator who has only set the
  environment variables.

`cairn` names no operator's secret store, such as a password manager's
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
3. Otherwise, the platform's configuration directory plus
   `cairn/sites`: `%AppData%\cairn\sites` on Windows,
   `~/Library/Application Support/cairn/sites` on macOS, and
   `$XDG_CONFIG_HOME/cairn/sites` (or `~/.config/cairn/sites` when
   `XDG_CONFIG_HOME` is unset) on Linux.

## Token scopes

`cairn auth check` confirms the permissions below against your two
tokens: every account-scoped permission with credentials alone, and every
zone-scoped or repository-scoped permission against one registered site
with `cairn auth check <site>`. The nine labels below are cairn's
single source (`tool/cmd/cairn/permissions.go`); a permission added to one
without the other fails the tool's test suite.

### Cloudflare

`CAIRN_CF_READ_TOKEN` is a Cloudflare API token carrying read permission in
seven dashboard-named groups, scoped to the account `CAIRN_CF_ACCOUNT_ID`
pins plus all zones of that account:

- Workers Scripts
- Workers Builds Configuration
- Workers Observability
- Zone
- Zone Settings
- DNS
- Email Sending

Zone Settings is easy to omit: Workers Scripts and Zone alone read a zone's
worker and domain state, but the HTTPS-forced check's endpoints
(`zones/{id}/settings/always_use_https` and
`zones/{id}/settings/security_header`) answer 403 without it. A token minted
with the first six groups only fails that one check forever, silently,
since a 403 there reports UNKNOWN rather than a scope error.

### GitHub

`CAIRN_GH_READ_TOKEN` is a fine-grained personal access token with Contents
and Metadata read, at the shortest expiry the operator can live with. Mint
it over all repositories the account owns rather than a hand-picked list.
Adopting a second site then needs no new token, and `cairn` reads only
the repositories its registry names. It also reads `glw907/cairn-cms` for
the Engine check's changelog. That repository is public, so a token
confined to your own repositories still reaches it. A narrower scope
fails silently: a check that cannot read a repository returns UNKNOWN on
403 forever and never CRITICAL, so nothing calls the gap out.

**A probe over a public repository cannot confirm Contents.** GitHub serves
a public repository's contents with no token at all, so a pass from
`cairn auth check <site>` against a public repository proves only that the
token is not actively rejected, not that its Contents permission is doing
any work. A real confirmation needs a site whose repository is private.

A private repository the token cannot see answers 404, not 403, on every
GitHub REST route this tool calls (commits, contents, and the repos
route). `cairn auth check` and every 1.0 check that reads a repository
classify a 404 as `not-found`, never `forbidden`; an operator who sees
`not-found` on a repository they expect the token to reach should
re-check the token's repository list before assuming the repository
itself moved.

### Confirming one site's scope

`cairn auth check <site>` reads that site's record from the registry
and probes Zone Settings, DNS, and Email Sending against its zone, and
Contents against its repository, all read-only; no site's zone id or
repository is compiled into the binary. With no site named, those four
rows report `skip`, each naming `cairn auth check <site>` as the way to
confirm them.

## Workers Logs retention

Workers Logs keeps records for a window that depends on your Cloudflare plan, and the Cloudflare
API returns no retention value to read. `cairn logs --since` clamps its window to 7 days. A plan
with a different retention window returns events up to that window, so read your own boundary
from the dashboard.

## Token verification and expiry

`cairn` verifies a Cloudflare token against the user token endpoint, `user/tokens/verify`. A
GitHub token carries the expiry you chose when you minted it. `cairn health` reports a token that
is close to expiring, and the fix is to mint a new token and run `cairn auth set` again.

