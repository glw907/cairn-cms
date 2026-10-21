---
page: Troubleshoot your site
type: symptom row
track: admin
exemplar: operators/github-pages-troubleshoot-domains
---

# Troubleshoot your site

:::reader
**Who reads it.** A technical non-developer who runs a cairn site, either one they set up with `create-cairn-site` or one they inherited. They work in a terminal, the Cloudflare dashboard, and the admin, they have the `cairn` command installed, and they write no code. :fact[kk03ic]

**Why they arrive:**
- An editor reports that signing in, saving, publishing, or adding an image went wrong.
- The admin shows an error page in place of a screen.
- `cairn health` reported a failing check, such as its `errors` check. :fact[wbnj9p]
- A known failing check keeps paging them, and they want to hold it.

**What the page does for them.** It shows where to look first, then matches each symptom to its cause and to one next step, classed as wait, act, or ask a developer. Each row names the log record that confirms it.

**What it leaves to other pages:**
- Symptoms whose fix is a change to the site's code, which belong to Debug your site.
- The full table of log events with every field, which lives in the log events reference.
- Setting up a site for the first time, which belongs to the admin track's setup pages (not yet published).
:::

## Where to look first

*Get the reader to the site's records and its health check before the rows. Every row names a record to find. Say what an empty result means.*

- Cloudflare Workers is where your site runs, and the site's log records appear in Workers Logs, in the Cloudflare dashboard. :fact[gzs6b8]
- See [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).
- To watch records arrive while you reproduce a problem, run `npx wrangler tail`. :fact[gzs6b8]
- See [`wrangler tail`](https://developers.cloudflare.com/workers/wrangler/commands/#tail).
- From your terminal, `cairn logs <site>` reads the same records for one site. `--event` narrows them to one event name, and `--since` sets how far back to look, 24 hours unless you name another window. :fact[efxu16] :fact[q9ylqa]
- `cairn health` runs nine checks against one site, or against every site it knows when you name none. :fact[wbnj9p]
- Its `errors` check counts only cairn's own error records, never every error line the site logs, and when the query reaches its limit the count reads "at least" a number. :fact[1x1hpl]
- The `errors` check passes at up to 5 such records over the last 24 hours and fails above that; `--error-threshold` and `--since` change those two numbers. :fact[vg5zt8]
- When the `errors` check fails, read that window's records with `cairn logs` and find each record's event in the rows below. :fact[vg5zt8] :fact[efxu16]
- Each row names the event that confirms it, and the log events reference lists every event with its fields.
- See [Log events](../reference/log-events.md).

:::row
**Symptom.** `cairn logs` shows no records, Workers Logs is empty, and the `errors` check passes, while the site misbehaves.
**Cause.** The site's Cloudflare settings file, `wrangler.jsonc`, does not set `observability.enabled` to `true`. With the setting off, the site's records go nowhere, and the log query answers with zero records rather than an error. An empty log and a passing `errors` check therefore prove nothing about it. A site created with `create-cairn-site` has the setting on unless someone removed it. When it is off, `cairn doctor` flags it in its `config.observability` check as "Workers Logs has no sink", and its `--json` report names the condition `config.observability-off`. :fact[txgoyy] :fact[q9ylqa] :fact[pb4md7] :fact[l3cxgc]
**Fix.** Ask a developer: they set `observability.enabled` to `true` in `wrangler.jsonc` and deploy the site again, which puts the new version live on Cloudflare. Then reproduce the problem and read the records again. :fact[txgoyy]
:::

- See [Debug your site: find the records](../extend/debug-your-site.md#find-the-records).

## Sign-in problems

*Match what an editor sees on the sign-in pages to its cause. Tell a browser mix-up apart from a missing roster entry and from a retry that came too soon.*

- An editor signs in with a link that cairn emails to them. The link lasts ten minutes and works only in the browser that asked for it. :fact[fhshue] :fact[71luk5]
- Each request logs `auth.link.requested`, and a link issued to an address on the roster logs `auth.token.minted`. :fact[4tmw56]

:::row
**Symptom.** The editor opens the link and sees "This browser has no pending sign-in." with the advice to request a new link and open it in this browser. The log holds `auth.link.refused` with `reason: no_pending_cookie`.
**Cause.** The link was opened in a different browser from the one that requested it, or this browser's cookies were cleared since the request. Either way, this browser holds no pending sign-in.
**Fix.** Act: request a new link in the browser the editor will use, and open the link in that same browser. :fact[71luk5] :fact[4tmw56]
:::

:::row
**Symptom.** The editor taps the link inside a mail app and sees "This browser has no pending sign-in."
**Cause.** The mail app opened the link in its own built-in browser, which keeps its cookies apart from the browser that requested the link. Apple's in-app Safari view is one such browser.
**Fix.** Act: request a new link, then open it in the browser that requested it rather than inside the mail app. :fact[ivpv77] :fact[71luk5]
:::

:::row
**Symptom.** The page says "Check your email", but no link arrives, even in the spam folder. The log holds `auth.link.requested` for the address, with no `auth.token.minted` after it.
**Cause.** The address is not on the site's roster of editors, or it differs from the one the owner added. For an address that is not on the roster, the page answers "Check your email" exactly as it does for a sent link, so that message never reveals who is on the roster. cairn sends no link to an address that is not on it.
**Fix.** Act: an owner checks the roster on the **Editors** screen, at `/admin/editors`, and adds the address the editor uses, or the editor requests a link with the address already listed. :fact[9cznzz] :fact[vympj2] :fact[4tmw56] :fact[852srf]
:::

:::row
**Symptom.** The page says "You requested a link recently. Check your inbox, or wait a minute and try again."
**Cause.** The editor asked again within one minute of the last link. No new email is sent, and the link already in the inbox now opens in the browser that just asked. This message appears only for an address on the roster, so the address is right.
**Fix.** Wait: open the link already in the inbox in this browser, or wait a minute and request a new one. :fact[9cznzz] :fact[fhshue] :fact[vympj2]
:::

## Save and publish problems

*Match each refusal an editor meets while saving or publishing, and a missing **Publish site** button, to a next step.*

- A save stores an entry's edits on GitHub without changing the live site, and publishing puts them live. :fact[hi9nim]

:::row
**Symptom.** A save answers "This file changed since you opened it. Re-read the draft and save again." The log holds `commit.failed` with `reason: conflict`.
**Cause.** Another change reached GitHub while the save was being written. cairn treats this as an expected outcome, not a fault, and the editor's text stays on the screen.
**Fix.** Act: re-read the draft, then save again. :fact[y4nzgp] :fact[bijnzl]
:::

:::row
**Symptom.** Publishing an entry answers "Your edits are saved. Publish again.", or the **Publish site** button answers "The site changed while publishing. Reload and try again." The log holds `publish.failed` with `reason: conflict`, one record for each entry in a site-wide publish.
**Cause.** Another change reached GitHub while the publish was being written. The saved edits are kept, so nothing is lost.
**Fix.** Act: publish again, reloading the page first after a site-wide publish. :fact[y4nzgp] :fact[lmh555]
:::

:::row
**Symptom.** The top bar has no **Publish site** button.
**Cause.** The button appears, with a count, only while at least one entry has saved edits that are not yet published, and it counts only the entries the editor's role can reach.
**Fix.** No fix is needed: the button returns, with its count, once an entry the editor can reach has unpublished edits. :fact[hi9nim]
:::

:::row
**Symptom.** The **Publish site** button is missing while an entry is open for editing.
**Cause.** An open entry's own controls take over the top bar, and the site-wide button steps aside.
**Fix.** Act: go to any other admin screen, such as the entry's list, and the button shows again while edits wait to publish. :fact[iqlr1w] :fact[hi9nim]
:::

:::row
**Symptom.** The **Publish site** button is missing although entries have unpublished edits, and the log holds `github.unreachable` with `scope: shell`.
**Cause.** The admin could not read GitHub to list what is waiting, so it hides the button rather than show a wrong count. The admin logs this record for any failure to list what is waiting, a passing network failure included. A failure that lasts is the condition `github.app-unreachable`: the site's GitHub App key does not parse, the App cannot authenticate or get its installation token, or your repository refuses a read, and saves and publishes then cannot commit either.
**Fix.** Act: reload the admin. If the button is still missing and the record repeats, ask a developer: they check the site's GitHub App key secret and its App and installation ids against the App's settings, and confirm the App is installed on your repository, which is where your content lives on GitHub. :fact[hi9nim] :fact[lg0umh]
:::

## Image upload problems

*Match each upload message to its reason. Separate the messages the editor can act on from the ones that need a developer.*

- A failed upload shows a message on the image's card, and an upload the site's upload route refused logs `media.upload_failed` with a `reason` that names the refusal. :fact[szcxsx] :fact[1wimos]

:::row
**Symptom.** The card reads "This image is too large to add, even after shrinking it."
**Cause.** The image is larger than the site accepts. When the upload reached the site, the log holds `media.upload_failed` with `reason: too_large`.
**Fix.** Act: save a smaller copy of the image, at a lower resolution, and upload that copy. :fact[szcxsx] :fact[zhpap6]
:::

:::row
**Symptom.** The card reads "This image format is not supported. Try a JPEG, PNG, WebP, or GIF."
**Cause.** The file is a type the browser cannot decode or the site does not store. When the upload reached the site, the log holds `media.upload_failed` with `reason: unsupported_type`.
**Fix.** Act: save the image in one of the formats the message names, and upload it again. :fact[szcxsx] :fact[zhpap6]
:::

:::row
**Symptom.** The card says the session has expired and asks the editor to sign in again.
**Cause.** The editor's sign-in session ended before the upload.
**Fix.** Act: sign in again, then repeat the upload. :fact[szcxsx] :fact[zhpap6]
:::

:::row
**Symptom.** The card reads "The upload could not be completed. Please try again.", and the log holds `media.upload_failed` with `reason: media_disabled` or `reason: binding_missing`.
**Cause.** For `media_disabled`, the site has media turned off. For `binding_missing`, the site has no storage bucket under the name it is set up to use.
**Fix.** Ask a developer: the site's media setup needs a change. :fact[szcxsx] :fact[zhpap6] :fact[qpzlft]
:::

:::row
**Symptom.** The card reads "The upload could not be completed. Please try again.", and the log holds `media.upload_failed` with `reason: access_denied`, beside `auth.access.refused` with `target: media`.
**Cause.** The site's access rules do not admit the editor's role to the media library.
**Fix.** Ask a developer to admit the role to the media library, or to confirm that the role should not reach it. :fact[szcxsx] :fact[zhpap6] :fact[qpzlft]
:::

:::row
**Symptom.** The card reads "The upload could not be completed. Please try again.", and the log holds `media.upload_failed` with `reason` set to `csrf`, `length_required`, or `hash_collision`.
**Cause.** These refusals carry nothing the editor can change.
**Fix.** Act: try the upload once more, as the message says. If the same reason returns, ask a developer and pass on the log record. :fact[szcxsx] :fact[zhpap6] :fact[1wimos]
:::

## Admin error pages

*Match each page the site shows in place of an admin screen to its cause. Tell a browser problem apart from a setup fault.*

- cairn refuses some admin requests before they reach a screen, and each refusal logs `guard.refused` with a `reason` that names the check: `dev_backend_in_prod`, `https`, `bindings`, `csrf`, or `identity`. :fact[05q9zk]

:::row
**Symptom.** Every admin page, the sign-in page included, shows "Site setup required" with the heading "Wrangler bindings are missing". The log holds `guard.refused` at error level with `reason: bindings`.
**Cause.** The site is running without its sign-in database, `AUTH_DB` in `wrangler.jsonc`. Without it, no one can sign in.
**Fix.** Ask a developer: they declare the sign-in bindings, `EMAIL` and `AUTH_DB`, in `wrangler.jsonc` and deploy the site again. `cairn doctor` checks for both. :fact[ck1any] :fact[kpczhs]
:::

:::row
**Symptom.** An admin page shows "This admin needs a secure connection" with an **Open over HTTPS** button. The log holds `guard.refused` with `reason: https`.
**Cause.** The admin was opened over plain http, and sign-in works only over https. Cloudflare's Always Use HTTPS setting is off for your domain's zone, the container in your Cloudflare account that holds the domain's settings.
**Fix.** Act: select **Open over HTTPS** to continue. Then, in the Cloudflare dashboard, turn on Always Use HTTPS for the zone under **SSL/TLS** > **Edge Certificates**, and keep HSTS on. `cairn health` reports this setting in its `https-forced` check. :fact[78tm6n] :fact[ow237a] :fact[2fkoo3]
:::

:::row
**Symptom.** After a sign-in or another admin form, the page shows "Let's try that again" and says the sign-in form could not be verified. The log holds `guard.refused` with `reason: csrf`.
**Cause.** The form's security token was missing or stale, usually because the page stayed open across a browser restart or cookies are blocked for the site.
**Fix.** Act: allow cookies for the site, open the sign-in page fresh, and request a new link. :fact[krfdmb] :fact[ot3zkq]
:::

:::row
**Symptom.** The admin answers with the plain text "cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND." The log holds `guard.refused` at error level with `reason: dev_backend_in_prod`.
**Cause.** A development setting, `CAIRN_DEV_BACKEND`, is set on the deployed site.
**Fix.** Ask a developer to unset `CAIRN_DEV_BACKEND` on the deployed site, as the message says. :fact[1i3v4p]
:::

:::row
**Symptom.** On a site that signs editors in through an organization's own sign-in gate, the admin shows "This admin needs" followed by the gate's name. The log holds `guard.refused` with `reason: identity`.
**Cause.** The gate refused the request, or failed while confirming who the editor is, so cairn could not start a session. A site that signs in with emailed links never shows this page.
**Fix.** Act: sign in through the gate again. If it still fails, ask a developer to check the gate's configuration. :fact[yl9c68] :fact[6xsj29]
:::

## Role and owner access problems

*Match an editor who signs in to nothing, and an owner who cannot sign in at all, to an owner's or a developer's next step.*

:::row
**Symptom.** An editor signs in, but each content screen answers "Editor access required". The log holds `auth.role.unknown` with the editor's email and role.
**Cause.** The editor's role is one the site no longer declares, because the site's list of roles was pruned or the roster entry was edited by hand. Such a role still signs in, with no access, and no access rule can admit it.
**Fix.** Act: an owner opens the **Editors** screen and sets the editor to a role the site declares. To keep the old role instead, ask a developer to add it back to the roles the site declares. :fact[4bazhe] :fact[vdcqgx] :fact[zefmyj] :fact[852srf]
:::

:::row
**Symptom.** The site's only owner cannot sign in, because no sign-in link reaches them, and no other owner exists to help.
**Cause.** The **Editors** screen refuses to remove or demote the last owner, and the roster always keeps one. That owner still needs a sign-in link to get in.
**Fix.** Act: on the computer that set up the site, run `npx create-cairn-site --dir <folder> --sign-in`, naming the site's folder. It writes a fresh sign-in link into the site's database, with no email, and opens the sign-in page with it. The link lasts ten minutes, and running the command again writes a new one. Add `--owner-email <address>` to use a different address that is already on the roster. :fact[xrw24b] :fact[852srf]
:::

:::row
**Symptom.** The site's only owner cannot sign in, and the computer that set up the site, with its saved setup record, is not available.
**Cause.** The `--sign-in` recovery reads the setup record saved on the computer that ran setup, so it cannot run anywhere else.
**Fix.** Ask a developer: they can write a one-time sign-in row into the site's database by hand, which any browser can confirm until it expires. :fact[xrw24b] :fact[o2i3cu]
:::

## Health check holds

*Show the reader how to stop a known failing check from paging them. Warn that a hold covers that check on every site.*

- `cairn health --ack <check-id>=<YYYY-MM-DD>` holds a known failing check until that date. :fact[wj1i7e]
- A held failure reads `held` and still counts as WARNING, never OK, and once the date passes the check returns to its own severity. :fact[wj1i7e]
- Holds can also live in a file: `acknowledgements.json` in the registry directory by default, or a file you name with `--ack-file`. :fact[q4skmn]

:::row
**Symptom.** A real failure on one site does not page, and its check reads `held`.
**Cause.** A hold matches on the check's id alone, so it covers that check on every site in a sweep. Holding `email` for one site silences email failures on all of them.
**Fix.** Act: hold a check only while its known failure lasts, and remove the hold as soon as that failure is fixed. :fact[xlgk4i]
:::

## See also

*Point the reader to the pages behind these rows and to the pages that cover what this one leaves out.*

- See [Debug your site](../extend/debug-your-site.md).
- See [Log events](../reference/log-events.md).
- See [The `cairn doctor` command](../reference/cli-cairn-doctor.md).
- See [The `cairn` CLI's exit codes](../reference/cli-cairn-exit-codes.md).
