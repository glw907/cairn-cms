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
worker and domain state, but the HTTPS-forced check's own endpoints
(`zones/{id}/settings/always_use_https` and
`zones/{id}/settings/security_header`) answer 403 without it. A token minted
with the first six groups only fails that one check forever, silently,
since a 403 there reports UNKNOWN rather than a scope error.

### GitHub

`CAIRN_GH_READ_TOKEN` is a fine-grained personal access token with Contents
and Metadata read on the repository of every site in the operator's
registry, plus `glw907/cairn-cms` for the Engine check's own changelog read,
at the shortest expiry the operator can live with. A narrower scope is a
silent failure: a check that cannot read a repository returns UNKNOWN on
403 forever, never CRITICAL, so nothing calls the gap out.

**A probe over public repositories cannot confirm this scope.** GitHub
serves a public repository's contents and commits with no token at all, so
a 200 from `cairn auth probe` on a public repository proves only that the
token is not actively rejected, not that its Contents permission is doing
any work. `auth probe` reports each probed repository's visibility (the
repos endpoint's own `private` field, read from its own `repos` check for
that repository) and prints a warning on stderr when every probed
repository came back public, since that run has confirmed nothing about
the token's own scope.
An operator whose registry names at least one private repository gets a
real confirmation the first time `auth probe` reaches it.

A private repository the token cannot see answers 404, not 403, on every
GitHub REST route this tool calls (commits, contents, and the repos
route). `auth probe` and every 1.0 check that reads a repository classify
a 404 as `not-found`, never `forbidden`; an operator who sees `not-found`
on a repository they expect the token to reach should re-check the
token's repository list before assuming the repository itself moved.

### The repository scope is discovered, never hardcoded

`cairn auth probe` reads the operator's registry, then verifies a
contents read against every repository the registry names plus
`glw907/cairn-cms`; no repository list is compiled into the binary. It
prints one line per repository with the status and reason, and exits
non-zero if any of them is not 200.

## The credential mint-and-probe run (2026-09-19/20)

Geoff minted both tokens for his own five repositories
(`glw907/ecxc-ski`, `glw907/907-life`, `glw907/aksailingclub-org`,
`glw907/xcathletes-org`, and `glw907/cairn-cms`) and stored the values
through the workstation age store, per his own deployment's rules (not
this product's storage path). `cairn auth probe` reached the following
endpoints against the live tokens, with `xcathletes-org` private and the
other four public:

| Endpoint | Status | Reason | Top-level keys |
|---|---|---|---|
| `user/tokens/verify` | 200 | ok | `errors`, `messages`, `result`, `success` (`result`: `id`, `status`) |
| `accounts/{id}/workers/scripts` | 200 | ok | `errors`, `messages`, `result`, `success` |
| `accounts/{id}/workers/domains` | 200 | ok | `errors`, `messages`, `result`, `result_info`, `success` |
| `accounts/{id}/workers/observability/telemetry/query` | 200 | ok | `errors`, `messages`, `result`, `success` (`result`: `events`, `run`, `statistics`) |
| `commits/main` (each of the four site repositories) | 200 | ok | `author`, `comments_url`, `commit`, `committer`, `files`, `html_url`, `node_id`, `parents`, `sha`, `stats`, `url` |
| `contents/package.json` (each of the four site repositories) | 200 | ok | `_links`, `content`, `download_url`, `encoding`, `git_url`, `html_url`, `name`, `path`, `sha`, `size`, `type`, `url` |
| `contents/CHANGELOG.md` (`glw907/cairn-cms`) | 200 | ok | same key set as `contents/package.json` |
| `repos` (each of the five repositories) | 200 | ok | the full GitHub repository object, including `private` and `visibility` |

`auth probe` prints these key sets itself, by names only, through a
recording `http.RoundTripper` that reads each 200 response body once,
records its top-level key names (and, for the Cloudflare v4 envelope, the
`result` field's own key names, since the envelope's own four keys carry
none of its shape), and hands the provider an identical fresh body; no
response body is written to a file or to this document. Every probed
repository line also reports public or private (`aksailingclub-org`,
`ecxc-ski`, `907-life`, and `cairn-cms` public; `xcathletes-org` private),
which is why this run's GitHub scope counts as confirmed rather than
merely not-rejected.

The zone-scoped Zone Settings endpoints
(`zones/{id}/settings/always_use_https`,
`zones/{id}/settings/security_header`) were verified separately, by a
direct API call against one of the operator's own zones rather than
through `auth probe`: 1.0 has no `adopt` yet (Task 18), so no registry
record before this pass carries a zone id `auth probe` could target
generically. Both answered 403 before the Zone Settings group was added
to the token and 200 after, which is the evidence behind the seven-group
scope above.

**A read-level Builds group exists.** `builds/tokens`,
`builds/workers/{tag}/builds`, and `builds/workers/{tag}/triggers` all
answered 200 under Workers Builds Configuration, so Task 15's Builds half
does not degrade for this token.

**Token verification used the user path, not the account path.**
`accounts/{id}/tokens/verify` answered Cloudflare's generic error 1000 for
this user-owned token; `user/tokens/verify` answered `active`. `cairn`'s
Cloudflare client calls the user path for this reason.

### Workers Logs retention

`cairn auth probe`'s Observability query answered 200 for a one-hour
window anywhere in the trailing 7 days, and 0 events (with no error) for
the same one-hour window 8 or more days back, measured by narrowing the
boundary directly: every window fully inside 7 days returned events, and
every window at 8 days or older returned none, with no error from the API
in either case, so the boundary is observed from the data rather than
stated by Cloudflare. **This is the account plan's own retention window,
not a fixed cairn constant.** Task 17 clamps `logs --since` to **7 days**,
the last value this run confirmed still returns events; an operator on a
different Cloudflare plan reads their own boundary the same way, since the
API returns no retention value directly.

### GitHub token expiry

The GitHub token minted for this verification run carries a 30-day
expiry.
