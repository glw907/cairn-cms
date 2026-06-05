# Set up the GitHub App

Goal: register and install a GitHub App so an editor's save in `/admin` commits to `main` as `cairn-cms[bot]`.

## Prerequisites

- A GitHub repository that holds the site's content (the markdown the editor will commit to).
- Owner access on the account or organization that owns the repo, since creating and installing an App needs it.
- The site's Cloudflare Worker, which holds the App credentials as secrets. See [Deploy to Cloudflare](./deploy-to-cloudflare.md).

This guide assumes you already have a running cairn site. If you are building one for the first time, start from the tutorial, then come back here.

## Steps

1. **Create the App.** Go to Settings, then Developer settings, then GitHub Apps, then New GitHub App. Give it a name (the bot identity an editor's commits show as is the App name with a `[bot]` suffix, for example `cairn-cms[bot]`). Under Repository permissions, grant **Contents: Read and write**. That is the only permission the commit path needs. A webhook is not required, so clear the Active checkbox under Webhook.

2. **Generate and download the private key.** On the App's settings page, under Private keys, choose Generate a private key. GitHub downloads a `.pem` file in **PKCS#1** form (its first line reads `-----BEGIN RSA PRIVATE KEY-----`). Keep this file out of git.

3. **Install the App on the content repo.** From the App's settings, choose Install App, pick the account that owns the content repo, and scope the install to that repo. After installing, open the installation's settings page; the installation ID is the trailing number in its URL. Record it.

4. **Store the three credentials the Worker needs.** The commit path reads three Worker secrets:
   - `GITHUB_APP_ID`: the App ID shown on the App's settings page.
   - `GITHUB_APP_INSTALLATION_ID`: the installation ID from step 3.
   - `GITHUB_APP_PRIVATE_KEY_B64`: the base64 of the `.pem`, on a single line (`base64 -w0 your-key.pem`).

   The Worker decodes the base64 with `atob()` in process before it signs, so the secret stays a single line. For key encoding, rotation, and the brittle conversion step, follow [GitHub App private-key rotation](../github-app-key-rotation.md) rather than hand-rolling it here.

The Worker converts the key from PKCS#1 to PKCS#8 in process, because Web Crypto's `importKey('pkcs8', ...)` accepts only PKCS#8 and GitHub issues PKCS#1. That conversion lives in the signer; you store the key as the base64 of the PKCS#1 PEM and the engine handles the rest.

## Verify

A save needs the editor auth in place first, so configure that before this check. See [Configure auth and D1](./configure-auth-and-d1.md).

With auth working, sign in to `/admin`, edit a page, and save. Open the resulting commit on GitHub. The **author** is the signed-in editor (their name and email), and the **committer** is `cairn-cms[bot]`. That split is the engine's design: `commitFile` sends the editor as the commit author and omits the committer, so GitHub attributes the commit to the App.

## See also

- [Core reference](../reference/core.md#appjwt) for `appJwt`, [`installationToken`](../reference/core.md#installationtoken), and [`commitFile`](../reference/core.md#commitfile), the helpers that mint the token and write the commit.
- [The security model](../explanation/security-model.md#commit-trust) for why the App holds the write capability and how the save path constrains it.
- [GitHub App private-key rotation](../github-app-key-rotation.md) for rotating the key and the `/admin/healthz` check that confirms the live key still signs.
