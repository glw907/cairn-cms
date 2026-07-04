# Troubleshooting

cairn writes a structured log record for every operationally meaningful event, and each symptom
below maps to one. When an editor reports something that doesn't explain itself, find the matching
section: it names the event to search in Workers Logs and what its fields mean, which turns a
report like "saving doesn't work" into a specific query. This assumes
`observability.enabled` is already on; [Deploy to Cloudflare](./deploy-to-cloudflare.md#turn-on-observability)
covers that one setting, and without it the records still fire but nothing keeps them.
[Read cairn's logs](./read-cairn-logs.md) covers searching by event, and
[Log events](../reference/log-events.md) is the full vocabulary this page draws its diagnoses from.

## An editor can't sign in

A sign-in fails in one of two places: the admin guard rejects the request before any sign-in code
runs at all, or the request gets through and the magic-link send itself fails.

| What you see | Event | What it means |
|---|---|---|
| Every admin path serves the same branded error page, login screen included | `guard.rejected`, `reason: "bindings"` | The Worker deployed with no `AUTH_DB` binding. See [Admin returns a 500 on a missing binding](#admin-returns-a-500-on-a-missing-binding). |
| The sign-in form posts and comes back with a 403 | `guard.rejected`, `reason: "csrf"` or `"origin"` | A stale tab or blocked cookies (`csrf`), or a POST that arrived from somewhere other than the site (`origin`). [Hand cairn the CSRF authority](./cloudflare-readiness.md#wire-cairns-csrf-guard) covers both. |
| The site answers over plain `http://` and login never completes | `guard.rejected`, `reason: "https"` | The zone isn't forcing HTTPS. [Force HTTPS at the edge](./cloudflare-readiness.md#force-https-at-the-edge). |
| The editor sees "We're having trouble sending sign-in links right now" | `auth.link.send_failed` | The send itself failed. The `conditionId` field names the cause; see [Email isn't arriving](#email-isnt-arriving). |

That last message is the one visible sign of a send failure, and it's deliberately generic: cairn
never puts the domain or the error code in front of the editor, only in the log.
A non-editor submitting the form gets the ordinary "check your inbox" response regardless of
whether the send would have failed, since that path never reaches a real send at all—the
distinct `send_error` message only ever reaches someone on the allowlist.

## A save does nothing

A save commits the entry to its own holding branch, `cairn/<concept>/<id>`, and only two things
make that commit fail.

| What you see | Event | Meaning | Fix |
|---|---|---|---|
| The page reloads with "This file changed since you opened it. Reload and reapply your edits." | `commit.failed`, `reason: "conflict"` | Someone else committed to the same entry's branch first. This is expected last-writer-wins behavior, not a bug. | Reload the entry and reapply your edits. |
| The save fails with no specific message | `commit.failed`, `error` field set | GitHub itself refused the commit: a revoked App installation, a bad credential, or a repository the App can no longer reach. | Read the `error` field, then work through [Install the GitHub App](./cloudflare-readiness.md#install-the-github-app). |

Both records carry the `concept`, `id`, `editor`, and `branch` fields, so a report about one entry
resolves to a single query keyed on its `id`, instead of a scan of every failure in the window.

## Publishing doesn't deploy

A publish happens in two stages, and "it didn't deploy" can point at either. cairn's stage copies
the entry to `main` in one commit alongside the content manifest. The other stage is your site's
own, whatever runs when `main` moves—usually a GitHub Actions workflow or your host's git
integration—and cairn's log vocabulary doesn't reach it.

| What you see | Event | Meaning |
|---|---|---|
| The page reloads with "Your edits are saved. Reload and publish again." | `publish.failed`, `reason: "conflict"` | The branch moved between your save and your publish. Publish re-saves first, so nothing is lost; reload and publish again. |
| The publish fails with no specific message | `publish.failed`, `error` field set | GitHub refused the commit to `main`, the same fault class as a failed save. |
| The Publish site button is missing from the topbar | `github.unreachable` | The admin can't read which entries are pending at all, usually a revoked installation or a GitHub outage. This isn't a publish that failed; it's the shell degrading rather than showing a count it can't know. |

A related record, `publish.address_collision`, is a warning rather than a failure: it fires when a
publish lands at an address another entry already resolves to (last-write-wins, now visible), so
seeing it in the log doesn't mean anything is broken.

If none of the above fired and `entry.published` is in the log, cairn's half worked: the commit
landed on `main`. Whatever runs after that is outside cairn's log vocabulary entirely, because it
belongs to your deploy pipeline, which cairn doesn't observe. Check that pipeline's own build logs;
`entry.published` proves the input it needed was there.

## Admin returns a 500 on a missing binding

`config.bindings-missing` covers several different bindings, and only one of them is caught before
it can crash a request. `AUTH_DB` is checked at the top of the admin guard, ahead of every other
admin route, so a Worker deployed without it serves a branded page instead of a bare stack trace
(`guard.rejected`, `reason: "bindings"`). That page still answers with a 500, because the fault is
real and nothing under `/admin` can work without it, but it names the missing binding and points at
the fix, and it fires on every admin path, the login screen included, so an editor never even
reaches a form that could never have succeeded.

`PUBLIC_ORIGIN` isn't gated the same way. A missing or invalid value throws the moment the sign-in
form posts, straight out of the request handler, with no branded page and no log record, just your
framework's own generic error screen. Run `cairn-doctor` before your first deploy: its
`config.public-origin` check catches exactly this, before an editor ever meets the crash. A missing
`EMAIL` binding or a broken GitHub App credential, by contrast, are already caught and logged; they
show up as `auth.link.send_failed` (see [Email isn't arriving](#email-isnt-arriving)) or
`commit.failed` and `publish.failed` (see the two sections above); the failure is logged, not silent.

## Email isn't arriving

An editor submitting the sign-in form sees the same "check your inbox" response whether the
address is a real editor or not, so a delivery failure never shows up in the response. Only the log
does: `auth.link.send_failed` fires either way, and its `code` and `conditionId` fields tell the
failure classes apart.

| `code` | `conditionId` | Meaning | Fix |
|---|---|---|---|
| `E_SENDER_NOT_VERIFIED`, or a bare "not a verified address" error with no code | `email.sender-not-onboarded` | Your `from` domain has no enabled Cloudflare Email Sending subdomain. | `wrangler email sending enable <domain>`, matching the domain your `from` address lives on, then redeploy. |
| Anything else | `email.send-failed` | A delivery error, a misconfigured `EMAIL` binding, or a custom sender that threw. | Read the `error` field; it names the underlying failure. |

`E_SENDER_NOT_VERIFIED` means two different things depending on which Cloudflare feature threw it,
and only one of them is cairn's problem. Email Sending throws it when the *sender* domain isn't
onboarded, the case above. Email Routing, a separate Cloudflare feature that forwards mail to an
address you've verified in advance, throws the identical string for an unverified *destination*.
cairn only ever uses Sending for magic links, never Routing, so a search that lands you on
Routing's docs or its destination-address settings is the wrong feature: verifying a destination
there fixes nothing here. The fix is always onboarding the *sending* domain, covered in
[Onboard the sending domain](./cloudflare-readiness.md#onboard-the-sending-domain).

## Run the doctor

Every condition above has a name in cairn's diagnostics registry, and `cairn-doctor` checks most of
them ahead of a deploy:

```bash
npx cairn-doctor --from editor@your-site.com --repo you/your-site
```

Run it whenever a symptom above doesn't resolve cleanly from the log alone, and as a matter of
course right after a deploy. Two checks want an explicit opt-in, since both cost something real:
`--send-test <address>` sends one live email, and `--probe [url]` drives a real, side-effect-free
sign-in attempt against the deployed site. [The `cairn-doctor` reference](../reference/doctor.md)
has every flag and every check it runs; [Cloudflare readiness](./cloudflare-readiness.md) walks the
same conditions by hand, one section per fix.
