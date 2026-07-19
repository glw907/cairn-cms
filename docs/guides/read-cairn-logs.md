# Read cairn's logs

Every operationally meaningful action, from a sign-in to a rejected upload, writes one JSON
record through `console.log`, `console.warn`, or `console.error`.
[Log events](../reference/log-events.md) is the full vocabulary those records draw from. Reading
them in production takes one setting. `observability.enabled` must already be `true` in your
`wrangler.jsonc`. The [Deploy to Cloudflare](./deploy-to-cloudflare.md#turn-on-observability)
step covers turning it on. Without it the records still fire, but Workers Logs keeps none of them.

## What's in a record

Every record carries the same three-field envelope, plus whatever fields that event defines:

```json
{
  "level": "warn",
  "event": "commit.failed",
  "timestamp": "2026-07-03T14:02:11.401Z",
  "concept": "posts",
  "id": "2026-07-01-summer-picnic",
  "editor": "jamie@ourclub.org",
  "reason": "conflict",
  "branch": "cairn/posts/2026-07-01-summer-picnic"
}
```

Because each record is a JSON object, Workers Logs indexes `event`, `editor`, `reason`, and every
other key as its own field. You query a field directly instead of text-searching a message string.
Filter on `event`. `level`, one of `info`, `warn`, or `error`, tells you its severity.

The records never carry a magic-link token or a session ID, only an editor's email address for
attribution. A record is safe to read, copy, and paste into a bug report or a chat message.

## Filter by event or by editor

Open your Worker's **Logs** view in the Cloudflare dashboard (**Workers & Pages** > your Worker >
**Logs**) to search the persisted history, kept for up to seven days. Its search bar takes field
queries directly against the keys cairn writes:

| To find | Query |
|---|---|
| Every failed commit | `event = "commit.failed"` |
| One editor's activity | `editor = "jamie@ourclub.org"` |
| A CSRF-rejected admin request | `event = "guard.rejected" AND reason = "csrf"` |
| Warnings and errors only | `level != "info"` |

Cloudflare's own request metadata sits alongside cairn's fields under a `$metadata.` prefix
(`$metadata.trigger`, `$metadata.service`), if you need to correlate a log record with the request
that produced it.

## Tail it live during a deploy

`wrangler dev` already prints your records straight to the terminal you're running it in, so
tailing only matters for a deployed Worker. From your site's project directory:

```bash
npx wrangler tail --format pretty --search commit.failed
```

`--search` matches the raw text of each record, so it casts a coarser net than the dashboard's field
queries. Use it to watch one event name scroll by while you reproduce a bug. Tailing streams
live. It keeps nothing, so the records disappear once the session ends. The dashboard's **Live**
tab gives you the same stream in the browser.

## Match a symptom to its event

| Symptom | Event to look for | What it tells you |
|---|---|---|
| An editor can't sign in | `auth.link.send_failed` or `guard.rejected` | A send failure's `conditionId`, or the guard's `reason` |
| A save does nothing | `commit.failed` | `reason: "conflict"` is a stale edit; an `error` field is GitHub's own refusal |
| Publishing doesn't deploy | `publish.failed` | Same shape as `commit.failed` |
| An upload, replace, or delete doesn't go through | `media.upload_failed`, `media.replace_blocked`, `media.delete_blocked` | `media.upload_failed`'s `reason` names the cause; `*_blocked` means cairn refused a still-referenced or unconfirmed operation, with `foundIn` counting the blocking entries |

[Troubleshooting](./troubleshooting.md) walks each of these from symptom to fix.

## See also

- [Log events](../reference/log-events.md) for the complete event vocabulary and every field's
  meaning.
- [Troubleshooting](./troubleshooting.md) for symptom-first fixes built on these same events.
- [Deploy to Cloudflare](./deploy-to-cloudflare.md#turn-on-observability) for turning
  observability on in the first place.
