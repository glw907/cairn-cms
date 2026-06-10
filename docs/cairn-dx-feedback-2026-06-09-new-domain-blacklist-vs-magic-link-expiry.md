# DX feedback: a magic link can report sent and still never arrive

Date: 2026-06-09. Found on ecxc.ski (cairn `^0.37.1`), debugging a magic link that the engine
sent successfully but the editor never received. Root cause, confirmed in the Email Sending
activity log: the recipient's provider (Fastmail) rejected every delivery attempt at the SMTP
DATA stage with `451 4.7.1 Data command rejected: ecxc.ski is blacklisted`
(`errorCause: blacklist_domain_fastmail`). The domain was registered days earlier, so this is
new-domain zero-reputation blocklisting; the 451 is transient and ages out as the domain does.
A control send from the same pipe to a Gmail inbox delivered in under a minute.

## What happened

The send side was fully healthy. The Worker logged `auth.link.requested` and
`auth.token.minted` with no `auth.link.send_failed`, the `ecxc.ski` sending subdomain reported
`ready` with SPF, DKIM, and DMARC live and aligned, and the Email Sending suppression lists
were empty before and after the sends. A cross-provider control test from the same pipe landed
in a Gmail inbox within a minute with `spf=pass` and two `dkim=pass` results. Sends to the
editor's Fastmail address produced nothing: not in the inbox, not in spam, no bounce, no
suppression entry.

A note on a tempting wrong turn: a manual SMTP probe of Fastmail's MX from a residential IP
got `451 4.7.1 Temporary deferral`, which looks like greylisting evidence. It isn't. Fastmail
documents that it greylists only hosts that look like dialup/DSL or lack valid reverse DNS,
so the deferral was a reaction to the probe's own origin, not to Cloudflare's sending pool.

The authoritative per-message record is the Email Sending activity log (dashboard, or the
`emailSendingAdaptive` GraphQL dataset), which carries per-event `status`, `errorCause`, and
`errorDetail` including the recipient server's SMTP response. Reading it needs zone
Analytics:Read, which the site's deploy token did not have.

## Why this matters for cairn

1. **`sent` is not `delivered`, and the Worker cannot see the difference.** The planned Pass 2
   statuses (`sent`/`send_error`/`throttled`) all report the binding handoff. Everything past
   the handoff (deferral, recipient-side filtering, silent discard) is invisible to the engine
   while every operator-visible signal says "working". Worth a line in the Pass 2 spec's
   known-limits section.
2. **The ten-minute expiry assumes prompt delivery.** Any delivery delay (deferral, retry
   backoff) can hand the editor a structurally dead link. Twenty to thirty minutes would
   cover common retry windows without materially weakening a single-use token held in a
   mailbox the editor controls.
3. **The diagnostics docs should name the activity log.** The Pass 3 readiness checklist and
   the deploy guide's email section should point a stuck operator at the Email Sending
   activity log (and the Analytics:Read token permission it needs) as the next step after
   the Worker-side events, since it is the only place the recipient server's actual SMTP
   verdict appears.

## Verification trail

- Tail: `auth.link.requested` + `auth.token.minted`, no `send_failed`, no exceptions.
- `GET /zones/{ecxc}/email/sending/subdomains/{id}/dns/status` → `ready`, records live.
- Account and zone `email/sending/suppression` → empty, before and five minutes after a test.
- Direct `POST /accounts/{id}/email/sending/send` to the same address → accepted, message id
  minted, no bounce, never seen by the recipient.
- Same send to a Google Workspace inbox → INBOX in under a minute, auth passing.
- GraphQL `emailSendingAdaptive` per-message log (needs zone Analytics:Read on the token):
  three `deliveryFailed` events to the Fastmail address, each
  `451 4.7.1 <DATA>: Data command rejected: ecxc.ski is blacklisted`, no final event yet
  (the sender keeps retrying); the Gmail control shows `delivered`.
