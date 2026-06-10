# Reference: log events

cairn emits structured diagnostic events through `console`, which Cloudflare Workers Logs ingests
and indexes when a site sets `observability.enabled = true`. Each record carries an envelope
(`level`, `event`, `timestamp`) plus event-specific fields. The `event` name is a stable contract:
renaming one is a breaking change. To read these in production, see the
[read cairn's logs guide](../guides/read-cairn-logs.md).

The records carry an editor's email for attribution. They never carry a magic-link token, a session
id, or a magic-link's contents. See [the security model](../explanation/security-model.md) for the
redaction stance.

| Event | Level | Fires when | Fields |
|---|---|---|---|
| `auth.link.requested` | info | A magic-link request reaches `POST /admin/auth/request`. | `email` |
| `auth.token.minted` | info | A token is issued for an allow-listed editor. | `email`, `expiresAt` |
| `auth.link.send_failed` | error | The confirmation email send rejects. | `email`, `error`, `code`, `conditionId` |
| `auth.token.confirmed` | info | A valid token is consumed at `POST /admin/auth/confirm`. | `email` |
| `auth.session.created` | info | A session row is created after a confirm. | `email` |
| `auth.session.destroyed` | info | A session is deleted at logout. | none |
| `commit.succeeded` | info | A content or nav commit lands. | `concept`, `id`, `editor`, `branch` on a save |
| `commit.failed` | warn or error | A commit fails. `warn` with `reason: "conflict"` on a 409, `error` with `error` otherwise. | `concept`, `id`, `editor`, `reason` or `error`, `branch` on a save |
| `entry.published` | info | A pending entry's edits land on the default branch. | `concept`, `id`, `editor`, `batch` |
| `entry.discarded` | info | A pending branch is deleted: a discard, or the delete of a never-published entry. | `concept`, `id`, `editor` |
| `publish.failed` | warn or error | A publish commit fails, with the `commit.failed` shape. | `concept`, `id`, `editor`, `reason` or `error` |
| `guard.rejected` | warn | The admin guard refuses a request before `resolve()`. | `reason` (`csrf`, `origin`, or `https`), `path` |

Saves land on the entry's pending branch, so `commit.succeeded` and `commit.failed` carry a
`branch` field (`cairn/<concept>/<id>`) on the save path. Deletes, renames, and nav saves commit to
the default branch and omit the field, which is how a held save and a direct commit are told apart
in a query. On `entry.published`, `batch` is `true` when the entry shipped through a publish-all
and `false` for a single publish. A failed publish-all logs one `publish.failed` record per entry
in the batch, so the log names everything that did not go live.

On `auth.link.send_failed`, `code` is the Cloudflare binding error code (`E_SENDER_NOT_VERIFIED`
and the rest of the `E_*` set; absent when a custom sender throws a plain `Error`), and
`conditionId` is the mapped diagnostic condition, `email.sender-not-onboarded` for the
not-verified code and `email.send-failed` for everything else.

The `email` on `auth.link.requested` is the raw submitted address, logged before the allowlist
check, so it is unvalidated request input. cairn lowercases it, trims it, and caps the logged value
at 320 characters (the RFC 5321 maximum). Every other event that carries an `email` fires only for an
allow-listed editor, so its address is a known one. The request endpoint itself is unauthenticated, so
a flood of distinct addresses inflates log volume; rate-limit it at the edge if that matters for your
site.
