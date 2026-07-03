<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Set up the GitHub App

Goal: register and install a GitHub App so an editor's saves and publishes in `/admin` commit to the repo as `cairn-cms[bot]`.

## Prerequisites

- A GitHub repository holding the site's content (the markdown the editor will commit to).
- Owner access on the account or organization that owns the repo (creating and installing an App needs it).
- The site's Cloudflare Worker, which holds the App's private key as a secret. See [Deploy to Cloudflare](./deploy-to-cloudflare.md).

This guide assumes you already have a running cairn site. If you are building one for the first time, start from the tutorial, then come back here.

## Steps

1. **Create the App.** Go to Settings, then Developer settings, then GitHub Apps, then New GitHub App. Pick the name with the commit history in mind, because an editor's commits show the App name with a `[bot]` suffix as the bot identity (for example `cairn-cms[bot]`). Under Repository permissions, grant **Contents: Read and write**; the commit path needs nothing else. A webhook is not required, so clear the Active checkbox under Webhook.

2. **Generate and download the private key.** On the App's settings page, under Private keys, choose Generate a private key. GitHub hands you a `.pem` file in **PKCS#1** form (its first line reads `-----BEGIN RSA PRIVATE KEY-----`). Keep this file out of git.

3. **Install the App on the content repo.** From the App's settings, choose Install App, pick the account that owns the content repo, and scope the install to that repo. After installing, open the installation's settings page and look at its URL; the trailing number is the installation ID. Record it.

4. **Record the three credentials the site needs.** Only one of them is a Worker secret:
   - `GITHUB_APP_ID`: the App ID shown on the App's settings page. Not a secret; pass it as the `appId` your adapter hands to `githubApp({ appId, installationId, ... })` in source.
   - `GITHUB_APP_INSTALLATION_ID`: the installation ID from step 3. Also not a secret; pass it as `installationId` alongside `appId`.
   - `GITHUB_APP_PRIVATE_KEY_B64`: the base64 of the `.pem`, on a single line (`base64 -w0 your-key.pem`). This one is the Worker secret: `npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.

   The App ID and installation ID stay out of `platform.env` because the adapter builds the backend at module scope, before a request and its `platform.env` exist. Only the private key is a runtime binding. The Worker decodes the private key's base64 with `atob()` in process before it signs, which is why the secret stays a single line. For key encoding, rotation, and the brittle conversion step, follow [GitHub App private-key rotation](./rotate-the-github-app-key.md) rather than hand-rolling it here.

You may notice the format mismatch in step 4. GitHub issues the key in PKCS#1, and Web Crypto's `importKey('pkcs8', ...)` accepts only PKCS#8, so the Worker converts the key in process. That conversion lives in the signer. You store the key as the base64 of the PKCS#1 PEM, and the engine handles the rest.

## Verify

A save needs the editor auth in place first, so configure that before this check. See [Configure auth and D1](./configure-auth-and-d1.md).

With auth working, sign in to `/admin`, edit a page, and save. Open the resulting commit on GitHub and look at the two identities on it. The **author** is the signed-in editor (their name and email), and the **committer** is `cairn-cms[bot]`. That split is the engine's design: `commitFile` sends the editor as the commit author and omits the committer, so GitHub attributes the commit to the App.

## See also

- [Core reference](../reference/core.md#auth-and-github-app) for the public auth surface. The JWT signing, the token mint, and the commit helper are internal to the engine, which wires them behind the content routes.
- [The security model](../explanation/security-model.md#commit-trust) for why the App holds the write capability and how the save path constrains it.
- [GitHub App private-key rotation](./rotate-the-github-app-key.md) for rotating the key and the `/admin/healthz` check that confirms the live key still signs.
