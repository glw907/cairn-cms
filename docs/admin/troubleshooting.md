# Troubleshoot a live site

A cairn site writes a log record for every event that matters, and each symptom below names the event to look for. This page is for the owner of a live site made by `cairn new` who sees it do something wrong when no `cairn doctor` check names the problem. Each section gives what you see, what it means, and the log event that confirms the cause. A cause you can fix yourself comes with the fix. A cause that needs code changed says so and points a developer to the [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md).

Two other pages cover problems at other moments:

- If a `cairn doctor` check named a problem, read [Check that your site works](./is-it-working.md).
- If `cairn new` stopped before the site went live, read [Recover a setup that stopped](./setup-recovery.md).

## Read your site's logs

Logging has to be on before any section below can help.

1. Run `cairn doctor` and look at the Workers Logs line.
2. If the line fails, follow [Turn on observability](./is-it-working.md#turn-on-observability).

Once logging is on, the site writes one structured record for each meaningful event. Each record carries an event name, a level, a timestamp, and fields that belong to that event.

You can read the records in either of two places:

- The Workers Logs tab for your Worker in the Cloudflare dashboard.
- From the site's folder, `npx wrangler tail`, which streams records live while you reproduce the problem.

Filter by the event name that a section below gives you. The [log events table](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/log-events.md) lists every event and its fields. A record carries the signed-in editor's email address when one is involved. A record never carries a sign-in token or a session id. Because it can carry an email address, check a record before you paste it anywhere public.

## Nobody can sign in, or one person can't

**What you see:** the sign-in page never sends a link, or the link never arrives.

**What it means:** most causes are covered by a check, so start there and read the logs second. Work through these in order:

1. Run the check for the sending domain: [Onboard the sending domain](./is-it-working.md#onboard-the-sending-domain).
2. Check the sign-in database: [Provision the auth store](./is-it-working.md#provision-the-auth-store).
3. If only one person is affected, confirm their address is on the list on the **Editors** screen. [Invite editors](./invite-editors.md) shows the screen.

The ordinary "check your inbox" message is the same whether or not the address is on the list, so it can't tell you which case you're in. Two other messages can. `You requested a link recently. Check your inbox, or wait a minute and try again.` and `We’re having trouble sending sign-in links right now. Please contact the site owner.` appear for an address that is on the list. The first one also appears for any address when the site limits how often links can be requested and the limit stops the request, so on such a site it doesn't prove the address is listed. If a person quotes the second one, the list isn't the problem. Move on to the sending domain and the sign-in database.

A third message points somewhere else. `That sign-in link didn’t work` covers every failed link: one that expired, one that was already used, and one opened in a different browser from the one that asked. The page words them the same because one fix works for all of them. The browser mismatch happens when someone asks on a laptop and opens the mail on a phone, or when a mail app opens links in its own viewer. The fix is to request a new link and open it in the browser that asked. The logs don't separate an expired link from a used one.

The logs stop at Cloudflare's acceptance. A link that Cloudflare accepted and then dropped or filtered looks like a success: an `auth.link.sent` record, which carries the ID Cloudflare returned, and no `auth.link.send_failed` after it. The site has no signal past that point. If a person reports no link and the logs show one sent, ask them to check spam, and check the sending domain as the preceding list says.

An owner who is locked out requests a new link on the site's sign-in page, as [Sign in again](./create-your-site.md#sign-in-again) describes. If the email never arrives, a developer can sign you in from the sign-in database. The [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md) says how.

**The log events:** `auth.link.requested`, `auth.token.minted`, `auth.link.sent`, `auth.link.send_failed`, and `auth.link.refused`.

## A form is refused the moment someone uses it

**What you see:** signing in, saving, or publishing fails at once with a refusal.

**What it means:** the site refused the request before it reached the screen, usually because the site is reached over plain HTTP or through a proxy. Work through these in order:

1. [Force HTTPS at the edge](./is-it-working.md#force-https-at-the-edge).
2. [Admin CSRF token rejected](./is-it-working.md#admin-csrf-token-rejected).
3. [Scope a site-wide no-referrer policy](./is-it-working.md#scope-a-site-wide-no-referrer-policy), if forms outside the admin fail.

If every admin page, the sign-in page included, shows the same branded error, the database binding is missing. [Deploy the Worker with its bindings](./is-it-working.md#deploy-the-worker-with-its-bindings) covers that fix.

**The log event:** `guard.refused`. Its `reason` field names the case: `https`, `csrf`, `identity`, `bindings`, or `dev_backend_in_prod`. A `dev_backend_in_prod` refusal means the development stand-in is switched on in a deployed site, and a developer has to turn it off.

## A save or publish reports a conflict, or fails

**What you see:** an editor's save or publish is refused, sometimes with the word conflict.

**What it means:** a conflict means the entry changed on GitHub after the editor opened it, most often because two people edited it at once. Nothing is broken. The editor reviews the current version and saves again. A failure that names no conflict more often points at the GitHub App, so check [Install the GitHub App](./is-it-working.md#install-the-github-app). If publishing works and saves still fail, a developer has to look. The [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md) is where they start.

The **Publish all** button appears only when something is waiting to publish. Its absence usually means nothing is pending, or that you're inside an entry, where the button never shows. If an editor has saved work that hasn't gone live and the button is still missing from the main screen, the site couldn't read GitHub to count what is pending. It hid the button rather than guess. Check the App the same way.

**The log events:** `commit.failed` for an ordinary save and `publish.failed` for a publish. Their `reason` field is `conflict` in the ordinary case. Otherwise their `error` field carries what GitHub said. A `github.unreachable` record from the admin screens is the case where the missing button means something is wrong.

## A publish succeeds and the live site doesn't change

**What you see:** an editor publishes, the admin confirms it, and the public site still shows the old content after several minutes.

**What it means:** publishing commits to your GitHub repository, and a GitHub Actions job deploys each push. The commit worked, and the deploy didn't run or didn't finish. The site's logs don't record deploys, so this symptom has no log event. Work through these in order:

1. Open the **Actions** tab of your repository on GitHub and look at the newest run. A failed run shows its failing step in the log. GitHub's notification settings decide who is emailed about a failed run, and the admin doesn't show deploy status.
2. If the newest run is missing, check whether the repository has used up its free Actions minutes. [Deploys](./deploys.md#know-the-free-deploy-allowance) gives the allowance.
3. If you've installed the `cairn` CLI and stored its tokens ([Give cairn its credentials](./credentials.md)), run `cairn health <site>`. For a site made by `cairn new`, the deploy check reads the latest deployment of your Worker. It fails when the Worker has never deployed, and otherwise it reports when the latest deployment was made. It doesn't compare that deployment with your newest commit, so a recent time doesn't prove that the latest publish went live.

A run that fails on a build error in the site's code needs a developer.

## Someone signs in and every screen refuses them

**What you see:** a person signs in successfully, then every screen they open refuses them.

**What it means:** their role isn't one the site declares, so it resolves to no access at all. [Provision the auth store](./is-it-working.md#provision-the-auth-store) covers the fix.

**The log event:** `auth.role.unknown`.

## An image won't upload

**What you see:** adding an image in the editor or the media library fails.

**What it means:** the `reason` field on the log event names the cause. The values `too_large` and `unsupported_type` mean what they say, and the fix is a different file. The value `session_expired` means sign in again. Any other value points at the site's configuration, not the file, and needs a developer: `media_disabled`, `binding_missing`, `length_required`, `csrf`, `access_denied`, or `hash_collision`. The [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md) is where they start.

**The log event:** `media.upload_failed`.

## The admin shows an error strip instead of the screen

**What you see:** the admin shows a short error message in place of the screen you opened, not a raw crash.

**What it means:** cairn caught an unexpected error from one of its admin actions, such as a save or a publish. This needs a developer to look. The record names what failed.

**The log event:** `admin.action.failed`, whose `error` field carries the failure's message. Hand it to a developer, along with the [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md).

## The admin sidebar shows no attention badges

**What you see:** a badge that used to flag entries needing attention is gone.

**What it means:** the site's attention check threw an error, so cairn renders no badges rather than fail the screen. This needs a developer.

**The log event:** `admin.attention_failed`.

## See also

- [Check that your site works](./is-it-working.md) explains each `cairn doctor` result.
- The [debug guide](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/debug.md) is where a developer starts on a cause that needs code.
- The [log events table](https://github.com/glw907/cairn-cms/blob/main/skills/cairn-extending-a-site/references/log-events.md) lists every event and its fields.
