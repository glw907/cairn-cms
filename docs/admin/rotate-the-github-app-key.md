# Rotate the GitHub App key

Your site commits every save and publish through a GitHub App, and the App signs each request with a private key. The key never expires, so the one your site uses stays in service until you replace it. Rotate it when the key may have been exposed, when someone who held it leaves, or on a schedule you set. This page shows how to replace the key on a site that [`create-cairn-site`](./create-your-site.md) set up.

An App can hold several private keys at once, and a new key doesn't cancel the old one. That overlap lets you generate the new key beside the old one, push it to your site, and confirm it works before you delete the old key. Your site keeps publishing throughout.

Proving the new key takes at least 55 minutes. Your site reuses each short-lived token it gets from GitHub for 55 minutes, so a publish inside that window can still run on a token the old key made. If the key may have been exposed, the old key stays valid until you delete it, so delete it as soon as the checks pass.

## Before you begin

You need the following:

- A deployed site, set up by `create-cairn-site`, whose Worker (the part of your site that runs on Cloudflare) holds the key as `GITHUB_APP_PRIVATE_KEY_B64`.
- A GitHub account that can edit the App's settings. GitHub's [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) describes the settings page.
- Wrangler, Cloudflare's command-line tool, signed in through `npx wrangler login` to the Cloudflare account that holds the site's Worker, and a terminal in the site's folder.
- A sign-in to the admin as an owner. The check in the verify steps publishes an entry.
- Workers Logs turned on, so you can read your site's records. [Turn on observability](./is-it-working.md#turn-on-observability) shows how.
- If your site uses gradual deployments, use `wrangler versions secret put` in place of `wrangler secret put`, as Cloudflare's [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) page describes. The rest of this page assumes `wrangler secret put`, which puts a new version of your Worker live at once, with no build.

## Generate a new key

> **Warning:** GitHub keeps only the public portion of a key, so the downloaded file is the only copy of the new private key.

Generating a new key changes nothing on your site. GitHub won't delete an App's only key, so the old key can go only after the new one exists.

- On the App's settings page on GitHub, generate a private key and download its PEM file.

## Push the new key to the Worker

Your site reads `GITHUB_APP_PRIVATE_KEY_B64` as the PEM file encoded in base64 on one line. Each command below makes that line and sends it to Wrangler.

1. In the site's folder, run the command for your platform, replacing the path with the location of the new PEM file.

   On Linux or macOS, this form gives the same encoding the setup command writes:

   ```bash
   node -e "process.stdout.write(require('fs').readFileSync('path/to/new-key.pem').toString('base64'))" | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

   Alternatively, on Linux with GNU `base64`, `-w 0` turns off its default line wrapping:

   ```bash
   base64 -w 0 path/to/new-key.pem | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

   On Windows, this PowerShell form sends the value straight to Wrangler and writes no file. Don't save the value to a file with `Out-File` first: Windows PowerShell 5.1 writes it as UTF-16LE, which your site can't read.

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\new-key.pem')) | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

The App ID and installation ID stay the same, and neither is a secret.

## Verify the new key

The site's `/healthz` page proves at once that the new key signs, and a publish after the 55 minutes proves that GitHub accepts it.

1. In a terminal, request the deployed site's `/healthz` page:

   On Windows PowerShell 5.1, run `curl.exe` instead of `curl`. In 5.1, `curl` is an alias for `Invoke-WebRequest`, which stops with an error on a 503 response. `curl.exe` prints the response body for any status.

   ```bash
   curl https://<your-site>/healthz
   ```

   The expected response is the following:

   ```json
   {"ok":true,"checks":{"githubAppSigning":{"ok":true,"fingerprint":"SHA256:<digest>"}}}
   ```

   The `fingerprint` is the `SHA256:` fingerprint of the key's public half. Compare it with the fingerprint GitHub lists for the new key on the App's settings page.

   Your site answers with status 503 when the check fails, so read the `ok` field either way. A response with `ok: true` proves that the secret decodes, imports, and signs. It doesn't prove that GitHub accepts the key. To test that as well, request `/healthz?live=1`. That request gets one installation token from GitHub and reports the result under `githubAppToken`. If the response carries `ok: false`, go to [Recover from a failed key](#recover-from-a-failed-key).

2. Wait 55 minutes from the push, so that any token the old key made has expired.

3. In the deployed admin, open an entry.

   Opening the admin also makes the site read from GitHub, which the log query in step 6 checks.

4. In the editor, change a line. The next step publishes the change.

5. In the editor, publish the edit. Publishing saves the edit first.

   The note reads "Published. The live site is rebuilding." A completed publish confirms the new key. If the publish doesn't complete, go to [Recover from a failed key](#recover-from-a-failed-key). If the entry changed on GitHub after you opened it, the editor refuses the publish and shows "Your edits are saved. Publish again." That refusal isn't a key failure, and [Troubleshoot a live site](./troubleshooting.md#a-save-or-publish-reports-a-conflict-or-fails) covers it.

6. In [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), query records whose `event` field is `github.unreachable`, over the time since the push.

   No record with `scope: 'shell'` after your admin visit means that the read used a token the new key made and GitHub accepted.

The `commit.failed` and `publish.failed` events come only from actions that commit, such as a save or a publish, so neither is the query for a key that GitHub refuses.

## Delete the old key

Delete the old key on GitHub once every check passes. GitHub can't restore a deleted key. After you delete the old key, recover from a failed new key with a third key: see [Generate a third key](#generate-a-third-key).

- On the App's settings page on GitHub, delete the old private key.

## Recover from a failed key

A rollback needs the old key still on GitHub and its PEM file at hand. Without both, a third key recovers from the failure.

Once the cached tokens expire, a failed key ends each attempt to open or publish an entry on an error page. The signals from [Verify the new key](#verify-the-new-key) name the failure behind that page.

1. If `/healthz` reports the detail `GITHUB_APP_PRIVATE_KEY_B64 is not configured`, your site holds no key.

   The missing key also shows as a `github.unreachable` record in Workers Logs. In the site's folder, run the push from [Push the new key to the Worker](#push-the-new-key-to-the-worker) again.

2. If `/healthz` reports `key import or sign failed` or `malformed JWT`, the secret isn't a usable private key.

   Check that the path names the new PEM file and that no `Out-File` step intervened under Windows PowerShell 5.1, and then push again.

3. If `/healthz?live=1` reports the detail `key_refused`, or `/healthz` reports `ok: true` but a `github.unreachable` record with `scope: 'shell'` carries `InstallationTokenError: GitHub installation token failed: 401`, GitHub refused the signed request.

   Status 401 is the one status that blames the key. The error page comes from that refusal. Roll back as [Roll back to the old key](#roll-back-to-the-old-key) describes, or generate a key as [Generate a third key](#generate-a-third-key) describes.

4. If `/healthz?live=1` reports the detail `installation_not_found`, `installation_suspended`, `token_request_refused`, or `unreachable`, or a `github.unreachable` record carries any status other than 401, the key isn't at fault. Don't replace it.

   For the first three details, GitHub accepted the key and refused the request for a token. A 404 or a 403 can mean the installation or a stale `repo`, and a 422 can mean the repository. An `unreachable` detail or a 5xx status can instead be a GitHub outage, so check [GitHub's status page](https://www.githubstatus.com) first. If GitHub is up, check three things:

   - The `repo` in your site's `createGithubApp` call matches the repository's current name on GitHub.
   - The App's installation includes that repository. On [GitHub's installations page](https://github.com/settings/installations), open the App and check the repository access.
   - The App holds Contents read and write permission. Check the permissions on the App's settings page.

   A plain `/healthz` stays `ok: true` in this case, because that check never requests a token.

5. If `/healthz` answers 503 with the detail `health check failed`, the check itself hit an error.

   The page doesn't show the error. In Workers Logs, query records whose `event` field is `health.failed`. Its `error` field holds the message.

After the 55-minute wait, a publish that fails while `/healthz` reports `ok: true` and no shell record appears isn't a key failure. [Troubleshoot a live site](./troubleshooting.md#a-save-or-publish-reports-a-conflict-or-fails) covers that case.

### Roll back to the old key

Until you delete the old key, you can push it back with the same command. The push takes effect at once. Requests switch to the old key as cached tokens expire, within 55 minutes.

1. In the site's folder, run the push command for your platform from [Push the new key to the Worker](#push-the-new-key-to-the-worker) with the old key's PEM file.
2. After your site is publishing again, delete the failed key on the App's settings page on GitHub.
3. Start the rotation again at [Generate a new key](#generate-a-new-key).

### Generate a third key

A third key replaces a failed key after the deletion, or before it when no copy of the old key's PEM file exists.

1. Generate another key, as [Generate a new key](#generate-a-new-key) describes.
2. Push it, as [Push the new key to the Worker](#push-the-new-key-to-the-worker) describes.
3. Run the checks in [Verify the new key](#verify-the-new-key).
4. On the App's settings page on GitHub, delete the key that failed.
5. If the old key is still on the App, delete it as [Delete the old key](#delete-the-old-key) describes.

## See also

- [Check that your site works](./is-it-working.md#install-the-github-app), for the `cairn doctor` check that points here.
- [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps), GitHub's page on generating and deleting an App's keys.
- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), Cloudflare's page on Worker secrets and gradual deployments.
