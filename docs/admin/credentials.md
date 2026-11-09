# Give cairn its credentials

Two kinds of credential belong to a cairn site, and this page covers both. Setup, `cairn new`, holds a few credentials on your computer while it runs, and it deletes them when the site goes live. The `cairn` CLI holds two read-only tokens of its own, which it uses to check a live site's Cloudflare zone and its GitHub repository. This page is for the person who ran setup or who runs health checks. It shows what setup holds and when it deletes each part, how to remove what a stopped run left behind, and how to create, store, and confirm the two tokens. It leaves the stops themselves to [Recover a setup that stopped](./setup-recovery.md).

## What setup holds

Setup stores its credentials in your computer's keyring: Keychain on macOS, Credential Manager on Windows, or the Secret Service on Linux. Each entry is stored under the service `cairn`, with a name that begins `setup/` and carries the run's id. A run writes four entries.

| Entry | What it is |
| --- | --- |
| `setup/<run id>/cloudflare-access` | The access token of the approval you gave Cloudflare in the first browser step. |
| `setup/<run id>/cloudflare-refresh` | The refresh token of the same approval, which gets a new access token. |
| `setup/<run id>/app-key` | The private key of the GitHub App that setup created for your site. |
| `setup/<run id>/app-client-secret` | The GitHub App's client secret. |

Setup lists each name in the run's record before it writes the entry, so every entry a run made can be found and removed. Setup never saves a GitHub token to disk. The installation token that pushes your site lasts up to an hour, and the token behind your own GitHub approval lasts up to 8 hours.

Two more credentials end up with the site, and setup doesn't delete them, because the site needs them to work:

- A Cloudflare token named `cairn-deploy-<run id>`, with no expiry, which lets GitHub Actions deploy your site. Setup stores it as the repository secret `CLOUDFLARE_API_TOKEN`, where only workflows in the repository can read it.
- The GitHub App's private key, which setup stores in your Worker as the secret `GITHUB_APP_PRIVATE_KEY_B64`. [Rotate the GitHub App key](./rotate-the-github-app-key.md) replaces it.

## When setup deletes each part

Setup deletes each of the following at a fixed moment:

- **The all-repositories GitHub installation.** The third browser step installs the App on all your repositories so that setup can create the new one. Setup deletes that installation right after it creates the repository. The fourth step installs the App on the new repository only, and setup reads that installation back to confirm it covers only that repository. A stop in either step, and every resumed run, deletes any installation the read-back hasn't confirmed.
- **The Cloudflare approval.** When your site is live and you're signed in, setup revokes both Cloudflare tokens. If Cloudflare refuses to revoke the refresh token, the last screen says so. In that case, go to your Cloudflare profile, open **Access Management** and then **Connected Applications**, and revoke cairn.
- **The four keyring entries.** Setup deletes all four right after it revokes the approval. A GitHub App that setup can't use is dropped earlier: setup deletes that App's two entries and tells you the address where you delete the App.

Nothing is kept for a second site. Each site gets a GitHub App and a run of its own.

## What a stopped run keeps

A run that stops before the end leaves its credentials in place, so that the next run can continue. It keeps the keyring entries it had written so far, the GitHub App if it created one, and the repository if it created one. A stop before the first browser approval keeps nothing. The entries stay in your keyring until the run finishes or you remove them. [Recover a setup that stopped](./setup-recovery.md) says how to continue a stopped run.

## Remove what an unfinished run holds

Choose **Start a new site** to leave a stopped run behind without deleting it. Remove its parts when you don't plan to continue it. Do this once for each run you abandon.

1. List the unfinished runs. This command reads setup's records only, so it needs no network and no keyring:

   ```
   cairn new status
   ```

   Each run is one row with its id and the step where it stopped, marked `unfinished`. Under an unfinished run, status lists the keyring entries it holds by name, its GitHub App, and its repository. A run marked `finished` is a live site, and status lists nothing under it.

2. Delete each keyring entry the run lists, using the entry's full name. On macOS, run `security delete-generic-password -s cairn -a "<entry name>"`. On Linux, run `secret-tool clear service cairn username "<entry name>"`. On Windows, run `cmdkey /delete:"cairn:<entry name>"`.
3. Delete the GitHub App at `https://github.com/settings/apps/<app name>`, using the App name that status lists.
4. If the run created a repository, delete it on GitHub, in the repository's **Settings**. Skip this step to keep the site's files.
5. Delete the run's record, which is the file `<id>.json` in the `cairn/sites` folder of your user configuration folder. Delete it last, because it is the only list of the run's keyring entries.

Status doesn't list the Cloudflare resources a run made, such as the database, the storage bucket, and the Worker, or the Cloudflare token named `cairn-deploy-<run id>`. The stop that ended the run names the ones it created, and you delete them in the Cloudflare dashboard.

## Verify that the run is gone

Run `cairn new status` again. It no longer lists the run you removed.

## Before you create the tokens

You need the following:

- The `cairn` CLI, installed as [Check that your site works](./is-it-working.md#run-the-check) describes.
- A Cloudflare account where you can create API tokens, and that account's ID.
- A GitHub account that owns your site's repository.
- A site in cairn's registry, for the per-site checks. A site that `cairn new` made is there already, and `cairn adopt` registers any other.

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
- [Recover a setup that stopped](./setup-recovery.md), for what each stop of `cairn new` keeps and what to do next.
