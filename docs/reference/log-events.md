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
| `auth.link.send_failed` | error | The confirmation email send rejects. | `email`, `error` |
| `auth.token.confirmed` | info | A valid token is consumed at `POST /admin/auth/confirm`. | `email` |
| `auth.session.created` | info | A session row is created after a confirm. | `email` |
| `auth.session.destroyed` | info | A session is deleted at logout. | none |
| `commit.succeeded` | info | A content or nav commit lands on the branch. | `concept`, `id`, `editor` |
| `commit.failed` | warn or error | A commit fails. `warn` with `reason: "conflict"` on a 409, `error` with `error` otherwise. | `concept`, `id`, `editor`, `reason` or `error` |
| `guard.rejected` | warn | The admin guard refuses a request before `resolve()`. | `reason` (`csrf`, `origin`, or `https`), `path` |
