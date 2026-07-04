# Set up the GitHub App

Every commit cairn makes travels through one GitHub App, the thing your adapter names in
`backend: githubApp({ owner, repo, branch, appId, installationId })`. You create the App on
GitHub, install it on your content repository, and give your Worker its private key. After that,
saving an entry in `/admin` writes a real GitHub commit. The commit's author is the signed-in
editor; the committer is the App.

## Before you begin

- A GitHub repository to hold the site's content, the one your adapter's `owner` and `repo`
  name.
- Owner access on the account or organization that owns that repository. Creating and installing a
  GitHub App both require it.
- An adapter that already declares a `backend`, even with placeholder values. [Define an adapter
  and schema](./define-an-adapter-and-schema.md) builds one from nothing if you don't have it yet.
- A Cloudflare Worker to hold the private key as a secret. You don't need to deploy it yet.

## Create the app

1. Go to **Settings > Developer settings > GitHub Apps > New GitHub App**.
2. Give it a name. Every commit the App makes shows this name with a `[bot]` suffix as the
   committer, so pick one an editor would recognize in a commit log, not a placeholder.
3. Under **Repository permissions**, set **Contents** to **Read and write**. The commit path reads
   files, lists branches, and writes commits, and nothing else it does needs a broader grant.
4. Under **Webhook**, clear the **Active** checkbox. Cairn never receives a webhook call, so
   leaving it active only gives GitHub an endpoint to retry against.

<!-- SCREENSHOT: the New GitHub App form scrolled to Repository permissions, with Contents set to
Read and write and every other permission left at No access -->

## Generate the private key

Every install needs a key the App signs its requests with.

1. On the App's own settings page, scroll to **Private keys** and choose **Generate a private
   key**.
2. GitHub downloads a `.pem` file. Its first line reads `-----BEGIN RSA PRIVATE KEY-----`, which
   names the format: PKCS#1. Keep this file out of git; you'll convert it to the one string your
   Worker needs in [Store the private key](#store-the-private-key), below.

<!-- SCREENSHOT: the Private keys section of the App's settings page, showing the Generate a
private key button and a previously generated key's fingerprint -->

## Install the app on your repo

1. From the App's settings page, choose **Install App**.
2. Pick the account or organization that owns your content repository, and scope the install to
   that one repository rather than every repository on the account.
3. After installing, open the installation's settings page and read the number at the end of its
   URL. That's the installation ID; your adapter's `installationId` takes it as a string.

<!-- SCREENSHOT: the installation's settings page with its URL bar visible, the trailing
installation ID circled -->

## Configure the identity in your adapter

Two of the App's identifiers aren't secrets at all. `appId` is the number on the App's own
settings page, and `installationId` is the one you just read off the installation's URL. Both are
compile-time config, not runtime bindings, because the adapter builds its backend at module scope,
before a request and its bindings exist:

```ts
import { githubApp } from '@glw907/cairn-cms';

const backend = githubApp({
  owner: 'your-org',
  repo: 'your-site',
  branch: 'main',
  appId: '123456',
  installationId: '987654',
});
```

The private key is the one member of this identity that never appears in source. It lives as a
Worker secret, read at request time to mint a short-lived installation token.

## Store the private key

The Worker needs the `.pem` from earlier as one base64 string on a single line:

```sh
base64 -w0 your-key.pem
```

Push the result to the Worker as `GITHUB_APP_PRIVATE_KEY_B64`:

```sh
npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
```

That's the only GitHub App value the Worker's bindings carry. `appId` and `installationId` stay in
your adapter's source, not `platform.env`. The [`CairnPlatformBindings`
type](../reference/sveltekit.md#cairnplatformbindings) names this secret alongside the site's
other required bindings, so a forgotten one fails `app.d.ts` at compile time instead of surfacing
as a runtime error.

You'll notice a format mismatch. GitHub issued the key as PKCS#1, and Web Crypto's
`importKey('pkcs8', ...)` only takes PKCS#8. The engine converts the key in process before every
sign, so you store the PKCS#1 PEM's base64 exactly as downloaded, and never handle the conversion
yourself.

## Verify

`cairn-doctor` runs the same steps a save runs. It parses and signs with the key, exchanges the
signature for an installation token, and uses that token to read your repository.

```sh
npx cairn-doctor --repo your-org/your-site
```

Run it with `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64` in the
environment. A missing one skips the check rather than failing it, and the skip names what's
still absent. The [doctor reference](../reference/doctor.md#the-checks) documents every stage of
this check and what a failure at each stage means.

A green doctor run proves the credentials work. It doesn't prove that an editor's save reaches
GitHub the way you expect, so check that too. Sign in to `/admin`, edit an entry, and save. Open
the resulting commit on GitHub. It carries two identities. GitHub shows the signed-in editor as
the author, by name and email, and the App, with `[bot]` appended, as the committer. The engine
sends the editor as the commit's author and omits the committer entirely, so GitHub attributes the
commit to whichever identity signed the request, the App.

## What's next

[GitHub App private-key rotation](./rotate-the-github-app-key.md) covers rotating this key without
a save-path outage. The [security model](../explanation/security-model.md) explains why the App
holds write access at all and what a save is and isn't allowed to do with it. And the [core
reference](../reference/core.md#githubapp) documents `githubApp`'s full signature alongside the
rest of the adapter's construction surface.
