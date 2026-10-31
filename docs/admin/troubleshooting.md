# Troubleshoot a live site

A cairn site writes a log record for every event that matters, and each symptom below names the event to look for. This page is for the owner of a live site who sees it do something wrong when no `cairn doctor` check names the problem. Each section gives what you see, what it means, and the log event that confirms the cause. A cause you can fix yourself comes with the fix. A cause that needs code changed says so and points a developer to [Debug your site](../extend/debug-your-site.md).

Two other pages cover problems at other moments:

- If a `cairn doctor` check named a problem, read [Check that your site works](./is-it-working.md).
- If a setup step failed or stopped before the site went live, read [Recover a setup that stopped](./setup-recovery.md).

## Read your site's logs

Logging has to be on before any section below can help.

1. Run `cairn doctor` and look at the Workers Logs line.
2. If the line fails, follow [Turn on observability](./is-it-working.md#turn-on-observability).

Once logging is on, the site writes one structured record for each meaningful event. Each record carries an event name, a level, a timestamp, and fields that belong to that event.

You can read the records in either of two places:

- The Workers Logs tab for your Worker in the Cloudflare dashboard.
- From the site's folder, `npx wrangler tail`, which streams records live while you reproduce the problem.

Filter by the event name that a section below gives you. [The log events reference](../reference/log-events.md) lists every event and its fields. A record carries the signed-in editor's email address when one is involved. A record never carries a sign-in token or a session id. Because it can carry an email address, check a record before you paste it anywhere public.

## Nobody can sign in, or one person can't

**What you see:** the sign-in page never sends a link, or the link never arrives.

**What it means:** most causes are covered by a check, so start there and read the logs second. Work through these in order:

1. Run the check for the sending domain: [Onboard the sending domain](./is-it-working.md#onboard-the-sending-domain).
2. Check the sign-in database: [Provision the auth store](./is-it-working.md#provision-the-auth-store).
3. If only one person is affected, confirm their address is on the list on the **Editors** screen. [Invite editors](./invite-editors.md) shows the screen.

The ordinary "check your inbox" message is the same whether or not the address is on the list, so it can't tell you which case you're in. Two other messages can. `You requested a link recently. Check your inbox, or wait a minute and try again.` and `We’re having trouble sending sign-in links right now. Please contact the site owner.` both appear only for an address that is on the list. If a person quotes either one, the list isn't the problem. Move on to the sending domain and the sign-in database.

A third message points somewhere else. `This browser has no pending sign-in` means the browser that opened the link isn't the browser that asked for it. That happens when someone asks on a laptop and opens the mail on a phone, or when a mail app opens links in its own viewer. The same message also appears when a link has already been used. In every case the fix is the same: request a new link and open it in the browser that asked.

An owner who is locked out can get a fresh link from the computer that created the site, as [Sign in again](./create-your-site.md#sign-in-again) describes. Without that computer, a developer can add a recovery link directly in the `AUTH_DB` database. [The security model](../extend/security-model.md#limits-of-the-browser-binding) explains why a row seeded that way confirms from any browser.

**The log events:** `auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`, and `auth.link.refused`.

## A form is refused the moment someone uses it

**What you see:** signing in, saving, or publishing fails at once with a refusal.

**What it means:** the admin guard rejected the request before it reached the screen, almost always because of how the site is reached and not because of the content. Work through these in order:

1. [Force HTTPS at the edge](./is-it-working.md#force-https-at-the-edge).
2. [Admin CSRF token rejected](./is-it-working.md#admin-csrf-token-rejected).
3. [Scope a site-wide no-referrer policy](./is-it-working.md#scope-a-site-wide-no-referrer-policy), if forms outside the admin fail.

If every admin page, the sign-in page included, shows the same branded error, the database binding is missing. [Deploy the Worker with its bindings](./is-it-working.md#deploy-the-worker-with-its-bindings) covers that fix.

**The log event:** `guard.refused`. Its `reason` field names the case: `https`, `csrf`, `identity`, or `bindings`.

## A save or publish reports a conflict, or fails

**What you see:** an editor's save or publish is refused, sometimes with the word conflict.

**What it means:** a conflict means the entry changed on GitHub after the editor opened it, most often because two people edited it at once. Nothing is broken. The editor reviews the current version and saves again. A failure that names no conflict more often points at the GitHub App, so check [Install the GitHub App](./is-it-working.md#install-the-github-app). If publishing works and saves still fail, a developer has to look. [Debug your site](../extend/debug-your-site.md) is where they start.

The **Publish site** button appears only when something is waiting to publish. Its absence usually means nothing is pending, or that you're inside an entry, where the button never shows. If an editor has saved work that hasn't gone live and the button is still missing from the main screen, the site couldn't read GitHub to count what is pending, and it hid the button rather than guess. Check the App the same way.

**The log events:** `commit.failed` for an ordinary save and `publish.failed` for a publish. Their `reason` field is `conflict` in the ordinary case. Otherwise their `error` field carries what GitHub said. A `github.unreachable` record with `scope: 'shell'` is the case where the missing button means something is wrong.

## Someone signs in and every screen refuses them

**What you see:** a person signs in successfully, then every screen they open refuses them.

**What it means:** their role isn't one the site declares, so it resolves to no access at all. [Provision the auth store](./is-it-working.md#provision-the-auth-store) covers the fix.

**The log event:** `auth.role.unknown`.

## An image won't upload

**What you see:** adding an image in the editor or the media library fails.

**What it means:** the `reason` field on the log event names the cause. The values `too_large` and `unsupported_type` mean what they say, and the fix is a different file. The value `session_expired` means sign in again. Any other value points at the site's configuration, not the file, and needs a developer: `media_disabled`, `binding_missing`, `length_required`, `csrf`, `access_denied`, or `hash_collision`. [Debug your site](../extend/debug-your-site.md) is where they start.

**The log event:** `media.upload_failed`.

## The admin shows an error strip instead of the screen

**What you see:** the admin shows a short error message in place of the screen you opened, not a raw crash.

**What it means:** cairn caught an unexpected error from a custom screen or action. This needs a developer, because something in the site's code threw. The record names what failed and where.

**The log event:** `admin.action.failed`, whose `error` field carries the failure's message. Hand it to whoever built the screen, or see [Debug your site](../extend/debug-your-site.md).

## The admin sidebar shows no attention badges

**What you see:** a badge that used to flag entries needing attention is gone.

**What it means:** the site's attention check threw an error, so cairn renders no badges rather than fail the screen. This needs a developer.

**The log event:** `admin.attention_failed`.

## See also

- [Check that your site works](./is-it-working.md) explains each `cairn doctor` result.
- [Debug your site](../extend/debug-your-site.md) is where a developer starts on a cause that needs code.
- [The log events reference](../reference/log-events.md) lists every event and its fields.
