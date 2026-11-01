# Give cairn its credentials

The `cairn` CLI checks a live site's Cloudflare zone and its GitHub repository, so it needs read access to both. This page shows how to create the two tokens, store them, and confirm that they reach what the CLI reads. Do this before you run `cairn health` or `cairn auth check`, and again when a token is close to expiring.

## Before you begin

You need the following:

- The `cairn` CLI, installed as [Check that your site works](./is-it-working.md#run-the-check) describes.
- A Cloudflare account where you can create API tokens, and that account's ID.
- A GitHub account that owns your site's repository.
- A site registered with `cairn adopt`, for the per-site checks.

## Create the tokens

`cairn` reads three values: `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`.

1. In the Cloudflare dashboard, create an API token with the permissions in [Cloudflare](#cloudflare).
2. On GitHub, create a fine-grained personal access token with the permissions in [GitHub](#github).
3. Note your Cloudflare account ID.

## Token scopes

`cairn auth check` confirms these permissions against your two tokens. Zone Settings, DNS, Email Sending, and GitHub's Contents are checked against one registered site with `cairn auth check <site>`, and the rest need only the credentials.

### Cloudflare

Create `CAIRN_CF_READ_TOKEN` as an API token scoped to the account that `CAIRN_CF_ACCOUNT_ID` names and to all zones in that account. Give it read permission in the following seven groups, named as the dashboard names them:

- Workers Scripts
- Workers Builds Configuration
- Workers Observability
- Zone
- Zone Settings
- DNS
- Email Sending

Without Zone Settings, the check that your site forces HTTPS can't read the setting. It reports UNKNOWN on every run rather than an error, so a missing scope is easy to miss.

### GitHub

Create `CAIRN_GH_READ_TOKEN` as a fine-grained personal access token with Contents and Metadata read, with the shortest expiration date that suits your schedule. Choose all repositories your account owns, not a hand-picked list. Adopting a second site then needs no new token, and `cairn` reads only the repositories the sites you adopted name. It also reads the public `glw907/cairn-cms` repository for the changelog check, which a token limited to your account's repositories still reaches. A narrower token fails silently: a check that cannot read a repository reports UNKNOWN and never CRITICAL.

## Store the tokens

Use one of two ways. `cairn` reads the environment first, so a scheduled job or a container works without a keyring.

### Store the tokens in environment variables

On Linux and macOS, export the three values from a file your shell reads on login. A file keeps a value out of your shell history, and a value typed at a prompt can land there.

```sh
export CAIRN_CF_ACCOUNT_ID="..."
export CAIRN_CF_READ_TOKEN="..."
export CAIRN_GH_READ_TOKEN="..."
```

On Windows, set them as user environment variables in Settings, which keeps the values out of your shell history. From a shell, use `setx`:

```powershell
setx CAIRN_CF_ACCOUNT_ID "..."
setx CAIRN_CF_READ_TOKEN "..."
setx CAIRN_GH_READ_TOKEN "..."
```

Replace each `...` with the value for that name. `setx` takes effect in new shells only, not the one that ran it.

### Store the tokens in the keyring

`cairn auth set` keeps a value out of every file you manage. It stores the value in Keychain on macOS, Credential Manager on Windows, or the Secret Service on Linux, which needs a running keyring daemon that most desktop sessions provide.

1. Run `cairn auth set` for one name, and enter the value when it asks. It asks with echo off.

   ```sh
   cairn auth set CAIRN_GH_READ_TOKEN
   ```

2. Repeat for the other two names.

With no terminal, such as in a script, pipe the value in. In this command, `$v` holds the token value.

```sh
printf %s "$v" | cairn auth set CAIRN_GH_READ_TOKEN
```

## Confirm that the tokens work

1. Run `cairn auth list`. It reports whether the environment, the keyring, or neither answers for each of the three names, and never prints a value.
2. Run `cairn auth check` to confirm the account-scoped permissions.
3. Run `cairn auth check <site>` with the name of a site you registered, to confirm Zone Settings, DNS, Email Sending, and Contents. Without a site name, those four rows report `skip`.

A GitHub token over a public repository can't prove its Contents permission, because GitHub serves a public repository to anyone. A real confirmation needs a site whose repository is private. A private repository that the token can't see returns `not-found`, not `forbidden`. If a repository you expect the token to reach reports `not-found`, check the token's repository list first.

## Replace a token before it expires

`cairn health` reports a token that is close to expiring.

1. Create a new token with the same permissions.
2. Store the new value where you stored the old one: update the environment variable, or run `cairn auth set` for that name again.
3. Run `cairn auth check` to confirm the new token.

A GitHub token expires on the date you set when you created it. `cairn` checks a Cloudflare token against Cloudflare's token verification endpoint.

## See also

- [Check that your site works](./is-it-working.md), for the doctor checks these tokens feed.
- [Rotate the GitHub App key](./rotate-the-github-app-key.md), for the key your site signs its commits with.
