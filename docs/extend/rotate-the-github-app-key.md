# Rotate the GitHub App key

A GitHub App's private key never expires, so the key a cairn site signs with stays in service until its developer replaces it. The Worker holds that key as `GITHUB_APP_PRIVATE_KEY_B64` and signs with it whenever it needs an installation token, the short-lived credential that every save and publish commits with. GitHub names one occasion for replacing the key, a copy that may have been exposed, and an organization may also replace it on a schedule it sets. The replacement happens on GitHub, which holds the App's keys, and in Cloudflare, where `wrangler secret put` deploys the new key to the Worker at once. The App ID and installation ID in the adapter stay as they are, so no source file changes and no build runs.

An App can hold several private keys at once, and a new key does not invalidate the old one. The overlap allows an order with no gap, in which the new key is generated beside the old one, pushed to the Worker, and confirmed before the old key is deleted. In that order, a developer who can edit the site's GitHub App and deploy its Worker replaces the App's private key without a publishing outage, proves the new key before the old one goes, and recovers if the new key fails. Until the deletion, the old key still works, so a failed new key can be rolled back to it. After the deletion, GitHub restores nothing, and the recovery from a failed key is a third key.

Proving the new key takes at least 55 minutes, because the Worker caches each installation token that long, and a publish inside that window can run on a token the old key minted. For a key that may have been exposed, that window is the cost of avoiding an outage, since GitHub accepts the old key until it is deleted. GitHub's plan for a compromised key runs in the same order, generating a new key and switching the App to it before deleting the old one. The rollback needs a copy of the old key. A site that `create-cairn-site` created kept none outside the Worker, so on such a site a failed new key is recovered with a third key. If the new key already fails, [Recover from a failed key](#recover-from-a-failed-key) is the place to start.

This page assumes a terminal on your platform and familiarity with Wrangler's secret commands and with querying Workers Logs. Registering the App the first time belongs to [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app) in the hand-built tutorial, or to the setup command for a scaffolded site. Why the key lives only as a Worker secret, and what the App's token can write, belong to [The GitHub App's reach](security-model.md#the-github-apps-reach) in the security model.

## Before you begin

The rotation needs the following site, access, signals, and file:

- A deployed site whose Worker holds the App's key as `GITHUB_APP_PRIVATE_KEY_B64`, from the setup command or from [Store the App's credentials](add-cairn-to-a-sveltekit-app.md#store-the-apps-credentials).
- A GitHub account that can edit the App's settings, which hold its private keys, as GitHub's [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) describes.
- Wrangler signed in through `npx wrangler login` to the Cloudflare account that holds the site's Worker, and a terminal in the site's directory.
- A sign-in to the admin as an editor who can publish, since the verification publishes an entry and queries the logs an admin visit writes.
- Workers Logs active through `observability.enabled` set to `true` in `wrangler.jsonc`, which the scaffold sets and [Add the Email Sending binding and name the origin](add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin) adds.
- A `/healthz` route at the site root, which the scaffold ships and the [`loadHealth`](../reference/sveltekit.md#loadhealth) entry shows for a hand-built site.
- The current key's PEM file, if you have it, for the rollback. A scaffolded site keeps no copy outside the Worker, so recovery there takes a third key.

The setup command creates the App and deploys the site in one run. It also writes its runner's owner row and opens a sign-in link to the admin. On a hand-built site, [Verify the production site](add-cairn-to-a-sveltekit-app.md#verify-the-production-site) shows the sign-in.

## Generate a new key

Generating a new key changes nothing until the Worker starts using it, because the key joins the App beside the old one. To generate the key, follow this step:

- On the App's settings page on GitHub, generate a private key and download its PEM file, as [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) describes.

The old key stays in place, since an App with one key needs the new key before the old one can be deleted. The old key also keeps the site publishing until [Delete the old key](#delete-the-old-key).

> **Warning:** GitHub keeps only the public portion of a key, so the downloaded file is the only copy of the new private key.

## Push the new key to the Worker

The Worker reads `GITHUB_APP_PRIVATE_KEY_B64` as the PEM file encoded in base64 on one line. Each command in this section produces that line and pipes it to `wrangler secret put`. To push the key, follow this step:

- In the site's directory, run the command for your platform from the following list, replacing the path with the location of the new PEM file:

  - On Linux or macOS, the Node form produces the same encoding that the setup command writes:

    ```bash
    node -e "process.stdout.write(require('fs').readFileSync('path/to/new-key.pem').toString('base64'))" | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
    ```

  - On Linux, GNU `base64` prints one line because `-w 0` turns off its default wrapping:

    ```bash
    base64 -w 0 path/to/new-key.pem | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
    ```

  - On Windows, PowerShell's `[Convert]::ToBase64String` returns base64 with no line breaks:

    ```powershell
    [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\new-key.pem')) | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
    ```

Saving that value with `Out-File` first writes the file as UTF-16LE under Windows PowerShell 5.1, at two bytes per character, while PowerShell 7 writes `utf8NoBOM`. The PowerShell form therefore pipes the value straight to Wrangler and writes no file.

`wrangler secret put` creates a new version of the Worker and deploys it immediately, without a build. A site on gradual deployments uses `wrangler versions secret put` instead, as Cloudflare's [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) page describes. The rest of this page assumes `wrangler secret put`.

The adapter's `createGithubApp` call keeps the same App ID and installation ID, which are not secrets. Local `wrangler dev` reads secrets from `.dev.vars`, never from the deployed secret, so a key kept there for development needs the same replacement.

## Verify the new key

The `/healthz` check proves at once that the new key signs, and a publish after the token cache expires proves that GitHub accepts it.

The publish waits because the Worker caches each installation token per isolate for 55 minutes and mints a new one only on a miss. A warm isolate keeps a token minted with the old key until its entry expires, and a cold isolate mints from the current secret. A publish in the first 55 minutes after the push can therefore succeed without the new key reaching GitHub. The old key keeps working throughout, so the wait delays the proof without interrupting publishing.

To confirm the new key, follow these steps:

1. In a terminal, request the deployed site's `/healthz` route:

   ```bash
   curl https://<your-site>/healthz
   ```

   The expected response is the following:

   ```json
   {"ok":true,"checks":{"githubAppSigning":{"ok":true}}}
   ```

   The route answers with status 200 even when the check fails, so read the `ok` field. A response with `ok: true` proves that the secret decodes, imports, and signs. The check makes no network call, so `ok: true` never proves that GitHub accepts the key. If the response carries `ok: false`, go to [Recover from a failed key](#recover-from-a-failed-key).

2. Wait 55 minutes from the push, so that any token minted with the old key has expired from the cache.

3. In the deployed admin, open an entry.

   Opening the admin also runs the shell read that the Workers Logs query checks.

4. In the editor, change a line that you are ready to publish, since the next step publishes it.

   Publish saves first, so no separate save step follows.

5. In the editor, publish the edit.

   The note reads "Published. The live site is rebuilding." That completed publish from the deployed Worker confirms the new key. If the publish does not complete, go to [Recover from a failed key](#recover-from-a-failed-key).

6. In [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), query records whose `event` field is `github.unreachable`, over the time since the push.

   No `scope: 'shell'` record after the admin visit means that the shell read used a token the new key minted and GitHub accepted. An empty result proves this only with observability on, since without it Workers Logs records nothing.

The `commit.failed` and `publish.failed` events come only from the commit step, so neither is the query for a key that GitHub refuses. The `github.unreachable` row in the [log events](../reference/log-events.md) reference lists the event's other two scopes.

## Delete the old key

The old key is deleted on GitHub once every check passes, and GitHub offers no restore for a deleted key. To delete the key, follow this step:

- On the App's settings page on GitHub, delete the old private key, as [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) describes.

From here on, a failure of the new key is recovered with a third key, as [Generate a third key](#generate-a-third-key) describes.

## Recover from a failed key

A rollback needs the old key still on GitHub and its PEM file at hand. Without both, a third key recovers from the failure whether or not the old key remains on GitHub.

Once the cached tokens expire, a failed key ends each attempt to open or publish an entry on an error page with status 500. The signals from [Verify the new key](#verify-the-new-key) name the failure behind that page. To read them, follow these steps:

1. If `/healthz` reports the detail `GITHUB_APP_PRIVATE_KEY_B64 is not configured`, the Worker holds no key.

   The missing key also throws cairn's `github.app-unreachable` error on first token use, which the shell logs as a `github.unreachable` record. In the site's directory, run the push from [Push the new key to the Worker](#push-the-new-key-to-the-worker) again.

2. If `/healthz` reports `key import or sign failed` or `malformed JWT`, the secret is not a usable private key.

   Check that the path names the new PEM file and that no `Out-File` step intervened under Windows PowerShell 5.1, and then push again.

3. If `/healthz` reports `ok: true` but a `github.unreachable` record with `scope: 'shell'` carries `Error: GitHub installation token failed: <status>`, GitHub refused the signed JWT.

   The error page from opening or publishing an entry comes from that refusal. Roll back as [Roll back to the old key](#roll-back-to-the-old-key) describes, or generate a key as [Generate a third key](#generate-a-third-key) describes.

After the 55-minute wait, a publish that fails while `/healthz` reports `ok: true` and no shell record appears is not a key failure. [Debug your site](debug-your-site.md#read-the-structured-logs) covers reading the logs.

### Roll back to the old key

Until the old key is deleted, pushing its base64 with the same command restores signing with it immediately. To roll back, follow this step:

- In the site's directory, run the push command for your platform from [Push the new key to the Worker](#push-the-new-key-to-the-worker) with the old key's PEM file.

The push deploys at once, so the site publishes on the old key while the new key is diagnosed separately. To finish the rotation, delete the failed key on GitHub and start again at [Generate a new key](#generate-a-new-key). Without the old key's file, [Generate a third key](#generate-a-third-key) applies.

### Generate a third key

A third key replaces a failed key after the deletion, or before it when no copy of the old key's PEM file exists. To replace the failed key, follow these steps:

1. Generate another key, as [Generate a new key](#generate-a-new-key) describes.
2. Push it, as [Push the new key to the Worker](#push-the-new-key-to-the-worker) describes.
3. Run the checks in [Verify the new key](#verify-the-new-key).
4. On the App's settings page on GitHub, delete the key that failed.
5. If the old key is still on the App, delete it as [Delete the old key](#delete-the-old-key) describes.

## See also

The following pages cover related tasks, concepts, and references:

- [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app), the App's first registration in the hand-built tutorial
- [The GitHub App's reach](security-model.md#the-github-apps-reach), what the key and its installation token can write
- [`loadHealth`](../reference/sveltekit.md#loadhealth), the signing self-test behind `/healthz`
- [Log events](../reference/log-events.md), whose `github.unreachable` row lists the event's scopes
- [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps), GitHub's page on generating and deleting an App's keys
- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), Cloudflare's page on Worker secrets and gradual deployments
