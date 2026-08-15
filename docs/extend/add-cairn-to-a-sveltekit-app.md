# Add cairn to a SvelteKit app

**Contract:** wire cairn's credentials and bindings into a SvelteKit app you already have, so its
GitHub App, backend, and auth store exist before you write a line of adapter config.

**Precondition:** a SvelteKit app already building against `@sveltejs/adapter-cloudflare` and
deploying with `wrangler deploy`. If you're starting from nothing, [Build a site by
hand](./build-a-site-by-hand.md) covers this same setup inline, in the order a from-scratch
build actually needs it; this page exists so that walkthrough, and any other page reaching this
credential milestone, links here instead of repeating it.

Three things need creating: the GitHub App, the D1 auth database, and the bindings that connect
your Worker to both. Do them in this order; each one produces a value the next step needs.

## Create the GitHub App

cairn commits through a GitHub App, never a personal access token: the commit author is always
the signed-in editor, and the App's own identity is the committer of record
(`cairn-cms[bot]`). The App you create here is a credential your site owns, not cairn's.
[GitHub's own guide to registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
is the authority on the form itself; the exact fields cairn needs from it:

- **Webhook**: clear **Active**. cairn never receives a webhook from this App.
- **Repository permissions → Contents**: **Read and write**. This is the one permission the
  commit pipeline needs: reading entries, opening a branch, committing a save, and merging a
  publish are all file operations against this permission.
- Leave every other permission at **No access**.
- **Where can this GitHub App be installed?**: **Only on this account**, unless you have a
  specific reason to allow others.

Everything else on the form, the App's name, its homepage URL, is cosmetic and never reaches an
editor.

On the App's settings page, note the **App ID**, near the top. Scroll to **Private keys** and
click **Generate a private key**; your browser downloads a `.pem` file. Save it somewhere outside
your repository; it's a credential, not a file to commit.

## Install the App on your content repository

Still on the App's settings page, go to **Install App**, choose the account that owns your
content repository, and select the specific repository (or all repositories, if you'd rather).
GitHub redirects to an installation settings URL of the form
`https://github.com/settings/installations/<installation_id>`; the trailing number is the
**Installation ID**. Note it alongside the App ID.

The **Contents: Read and write** permission from the previous step is repository-wide: GitHub's
installation token can write to any path in whatever repository you install the App on, and
cairn's confinement to its declared content directories is enforced by the engine's own code, not
by GitHub. If you're installing on a repository that already holds other things, code, other
teams' content, that confinement is doing more work than it would on a repository dedicated to
this site's content. GitHub also never lets an App's permissions be reduced after installation, so
this is a call worth making once, deliberately, rather than adjusting later.

## Encode the private key

The Worker secret is the PEM's contents, base64-encoded onto a single line (the engine decodes it
with `atob()` before signing, so a multi-line encoding won't parse):

```bash
# macOS / Linux
base64 -w0 your-key.pem
```

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-key.pem"))
```

Copy the output; you'll paste it into a Worker secret in a moment, never into a file your repo
tracks.

## Provision the auth database

cairn's sign-in store is self-owned: a D1 database holding the editor allowlist, sessions, and
single-use magic-link tokens, separate from whatever database your own app logic might already
use.

```bash
npx wrangler d1 create my-site-auth
```

This prints a `database_id`. Add a `d1_databases` entry to `wrangler.jsonc`, and copy the
package's auth migration into your own `migrations/` directory:

```jsonc
"d1_databases": [
  {
    "binding": "AUTH_DB",
    "database_name": "my-site-auth",
    "database_id": "<the id wrangler d1 create printed>",
    "migrations_dir": "migrations"
  }
]
```

```bash
mkdir -p migrations
cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
npx wrangler d1 migrations apply my-site-auth --local
npx wrangler d1 migrations apply my-site-auth --remote
```

`0000_auth.sql` is the one every site needs: it creates the `editor`, `magic_token`, and
`session` tables. Three more migrations ship in the same directory, each opt-in, and each
applies the same way, in order, whenever you adopt the feature it backs: `0001_roles.sql` if you
declare a role vocabulary beyond the default owner/editor pair
([Restrict admin access by role](./restrict-admin-access.md)), `0002_audit.sql` if you wire an
audit sink, and `0003_preview.sql` if you use [Share a draft
preview](./share-a-draft-preview.md).

## Wire the bindings

Three pieces complete the connection: the D1 binding you just added, an Email Sending binding
for magic links, and the private key as a Worker secret. Add the email binding and your site's
public origin to `wrangler.jsonc`:

```jsonc
{
  // ...compatibility_date, main, assets, d1_databases from above...
  "send_email": [{ "name": "EMAIL" }],
  "vars": {
    "PUBLIC_ORIGIN": "https://your-site.example.com"
  }
}
```

Set the private key as a secret, never a config value:

```bash
npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
```

Paste the base64 string from the encoding step when prompted.

The App ID and Installation ID are **not** secrets; the engine treats them as plain identity,
never as credentials to sign with. Pass them directly into `githubApp(...)` in
`cairn.config.ts` alongside your repo's owner and name:

```ts
import { githubApp } from '@glw907/cairn-cms';

const backend = githubApp({
  owner: 'your-github-username',
  repo: 'your-repo',
  branch: 'main',
  appId: '123456',
  installationId: '78901234',
});
```

[The core reference](../reference/core.md#githubapp) documents `githubApp`'s full shape, and
[Cloudflare](../reference/cloudflare.md) and [`CairnEnv`](../reference/ambient.md) document the
binding surface this page just wired.

## Verify

The `github.app` check reads its credentials from the local shell environment, not from the
Worker secret you just pushed, so export the same three values before running it:

```bash
export GITHUB_APP_ID=123456
export GITHUB_APP_INSTALLATION_ID=78901234
export GITHUB_APP_PRIVATE_KEY_B64="$(base64 -w0 your-key.pem)"
npx cairn-doctor --from cms@your-domain.example --repo your-github-username/your-repo
```

Without all three set, the check reports a skip rather than a result, which is not the same as a
pass. The doctor's `github.app` check walks the exact chain a save walks: the key parses and
signs, an installation token mints, and the repository answers a read. Its `config.bindings`
check confirms `AUTH_DB` and `EMAIL` are both wired. [Is it working?](../admin/is-it-working.md)
reads every condition the doctor can report, in plain terms.

**You know it worked when:** both `github.app` and `config.bindings` report a pass, not a skip.
