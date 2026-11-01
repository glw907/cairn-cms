# Give cairn its credentials

The `cairn` command checks a live site's Cloudflare zone and its GitHub repository, so it needs read access to both. This page shows how to create the two tokens, store them, and confirm that they reach what the command reads. Do this before you run `cairn health` or `cairn auth check`, and again when a token is close to expiring.

You need your Cloudflare account id, a Cloudflare account where you can create API tokens, and a GitHub account that owns the site's repository. The `cairn` command is installed, as [Check that your site works](./is-it-working.md#run-the-check) describes.

## Create the tokens

`cairn` reads three values.

- `CAIRN_CF_ACCOUNT_ID` is the id of the Cloudflare account that holds the site's zone.
- `CAIRN_CF_READ_TOKEN` is a read-only Cloudflare API token.
- `CAIRN_GH_READ_TOKEN` is a read-only GitHub token.

Both tokens grant read access only. The next section lists the permissions each one needs.

## Token scopes

`cairn auth check` confirms these permissions against your two tokens. Every account-scoped permission needs only the credentials, and every zone-scoped or repository-scoped permission is checked against one registered site with `cairn auth check <site>`.

### Cloudflare

Create `CAIRN_CF_READ_TOKEN` as an API token with read permission in the seven dashboard-named groups below, scoped to the account `CAIRN_CF_ACCOUNT_ID` names and all zones of that account:

- Workers Scripts
- Workers Builds Configuration
- Workers Observability
- Zone
- Zone Settings
- DNS
- Email Sending

Zone Settings is the group people most often leave out. Without it, the check that your site forces HTTPS fails every time, and a missing scope doesn't show as an error, because that check reports UNKNOWN instead.

### GitHub

Create `CAIRN_GH_READ_TOKEN` as a fine-grained personal access token with Contents and Metadata read, at the shortest expiry you can live with. Choose all repositories your account owns, not a hand-picked list. Adopting a second site then needs no new token, and `cairn` reads only the repositories the sites you adopted name. It also reads the public `glw907/cairn-cms` repository for the changelog check, which a token limited to your own repositories still reaches. A narrower token fails silently: a check that cannot read a repository reports UNKNOWN and never CRITICAL.

## Store the tokens

Use one of two ways. The environment is read first, so a scheduled job or a container works with no keyring at all.

**Environment variables.** On Linux and macOS, export the three values from a file your shell reads on login:

```sh
export CAIRN_CF_ACCOUNT_ID="..."
export CAIRN_CF_READ_TOKEN="..."
export CAIRN_GH_READ_TOKEN="..."
```

On Windows, set them as user environment variables in Settings, or from a shell:

```powershell
setx CAIRN_CF_ACCOUNT_ID "..."
setx CAIRN_CF_READ_TOKEN "..."
setx CAIRN_GH_READ_TOKEN "..."
```

`setx` takes effect in new shells only, not the one that ran it. A value typed at a prompt can land in your shell history, so prefer a file your shell reads over a command typed at the prompt.

**The operating system's keyring.** `cairn auth set` keeps a value out of every file you manage. It asks for the value with echo off and stores it in Keychain on macOS, Credential Manager on Windows, or the Secret Service on Linux, which needs a running keyring daemon that most desktop sessions provide.

```sh
cairn auth set CAIRN_GH_READ_TOKEN
```

Run it once for each of the three names. With no terminal at all, such as in a script, pipe the value in:

```sh
printf %s "$v" | cairn auth set CAIRN_GH_READ_TOKEN
```

## Confirm that the tokens work

1. Run `cairn auth list`. It reports whether the environment, the keyring, or neither answers for each of the three names, and never prints a value.
2. Run `cairn auth check` to confirm the account-scoped permissions.
3. Run `cairn auth check <site>` with the name of a site you adopted, to confirm the zone permissions and the repository permissions. Without a site name, those rows report `skip`.

A GitHub token over a public repository can't prove its Contents permission, because GitHub serves a public repository to anyone. A real confirmation needs a site whose repository is private. A private repository the token can't see answers not-found, not forbidden, so when you see `not-found` for a repository you expect the token to reach, check the token's repository list first.

## Replace a token before it expires

`cairn health` reports a token that is close to expiring.

1. Create a new token with the same permissions.
2. Run `cairn auth set` for that name again.

A GitHub token expires when you said it would. `cairn` checks a Cloudflare token against Cloudflare's token verification endpoint.

`cairn logs --since` reads at most 7 days of Workers Logs. A Cloudflare plan with a different retention window returns events up to that window, and the dashboard shows your own boundary.
