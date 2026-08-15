# Troubleshooting

The site does the wrong thing; find the fix, or find out who can.

- A `cairn-doctor` check named a problem by name: [Is it working?](./is-it-working.md) covers it.
- A setup step failed, parked, or got interrupted before your site went live:
  [Setup recovery](./setup-recovery.md).
- The site is live and doing something wrong, with no doctor check naming it: this page covers
  it, below.

## Reading your site's logs

Every row below names a log event you can look for. First, confirm logging is actually on: run
`npx cairn-doctor` and check the `config.observability-off` row (see
[Turn on observability](./is-it-working.md#turn-on-observability) if it's off). Once it's on,
your site writes one structured record per meaningful thing that happens, each carrying an event
name, a level, a timestamp, and a handful of fields specific to that event.

Two ways to read them: the Workers Logs tab for your Worker in the Cloudflare dashboard, or, from
your site's directory, `npx wrangler tail` for a live stream while you reproduce the problem.
Filter either one by the event name a row below points you at. The full list of events and their
fields is [the log events reference](../reference/log-events.md). Every record carries the
signed-in editor's email when one is involved, and never a sign-in token or a session id, so a
log line is always safe to read, and safe to paste somewhere else if you need help.

## Nobody can sign in, or a specific person can't

**What you see:** the sign-in page never sends a link, or sends one that never arrives.

**What it means:** this is almost always covered by the doctor, not something to chase in the
logs first. Run `npx cairn-doctor` and start with
[Provision the auth store](./is-it-working.md#provision-the-auth-store) and
[Onboard the sending domain](./is-it-working.md#onboard-the-sending-domain). If it's one specific
person and everyone else is fine, confirm their email is actually on your roster at
[Invite your editors](./invite-editors.md); the sign-in page never reveals whether an address is
allow-listed, so a stranger can't tell those two cases apart, and neither can you from the page
itself.

**The log events:** `auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`.

## A form gets refused right when someone tries to use it

**What you see:** signing in, saving, or publishing fails immediately with a refusal rather than
doing anything.

**What it means:** cairn's admin guard rejected the request before it ever reached the screen
behind it, almost always because of how the site is reached rather than anything wrong with the
content. This is covered end to end by the doctor's edge and configuration checks: start with
[Force HTTPS at the edge](./is-it-working.md#force-https-at-the-edge),
[Admin CSRF token rejected](./is-it-working.md#admin-csrf-token-rejected), and
[Non-admin origin rejected](./is-it-working.md#non-admin-origin-rejected).

**The log event:** `guard.rejected`, whose `reason` field names which of those three it was.

## A save or publish reports a conflict, or just fails

**What you see:** an editor's save or publish is refused, sometimes naming a conflict.

**What it means:** a conflict means the entry changed on GitHub since the editor opened it, most
often two people editing the same entry at once; there's nothing broken, and the fix is simply to
review the current version and save again. A failure with no conflict named more often points at
the GitHub App itself; check [Install the GitHub App](./is-it-working.md#install-the-github-app).
If the doctor reports the App healthy and saves still fail, this needs a developer; see
[Debug your site](../extend/debug-your-site.md).

**The log event:** `commit.failed`, whose `reason` field is `conflict` on the ordinary case, or
whose `error` field names what GitHub actually said otherwise.

## Someone can sign in, but every screen refuses them

**What you see:** a person signs in successfully, then can't do anything at all: every screen
they try refuses them.

**What it means:** their account's role isn't one your site actually declares, so it resolves to
no access rather than to owner or editor. See
[Provision the auth store](./is-it-working.md#provision-the-auth-store), which covers exactly
this.

**The log event:** `auth.role.unknown`.

## An image won't upload

**What you see:** adding an image in the editor, or through the media library, fails.

**What it means:** the `reason` field on the log event names it directly: `too_large` and
`unsupported_type` mean exactly what they say, and the fix is a different file. `session_expired`
means sign in again. `media_disabled`, `binding_missing`, and anything else in that field point
at your site's own configuration, not the file; that needs a developer, and
[Debug your site](../extend/debug-your-site.md) is where they'd start.

**The log event:** `media.upload_failed`.

## The admin shows an error strip instead of the screen you expected

**What you see:** instead of the screen you were on, the admin shows a calm failure message
rather than a raw crash.

**What it means:** cairn caught an unexpected error from a custom screen or action rather than
letting the failure reach you raw. This always needs a developer to actually fix, since it means
something in the site's own code threw; the log record names exactly what failed and where.

**The log event:** `admin.action.failed`, whose `error` field carries the failure's message.
Hand this to whoever built the screen, or see [Debug your site](../extend/debug-your-site.md).
