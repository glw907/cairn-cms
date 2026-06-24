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
| `config.invalid` | error | The nav editor's load reads a site config that does not parse or validate, and degrades to an empty tree. | `conditionId`, `error` |
| `entry.published` | info | A pending entry's edits land on the default branch. | `concept`, `id`, `editor`, `batch` |
| `entry.discarded` | info | A pending branch is deleted: a discard, or the delete of a never-published entry. | `concept`, `id`, `editor` |
| `publish.failed` | warn or error | A publish commit fails, with the `commit.failed` shape. | `concept`, `id`, `editor`, `reason` or `error` |
| `publish.address_collision` | warn | A publish proceeds while another entry already resolves to the same address (last-write-wins, now visible). | `editor`, `address`, `displacedConcept`, `displacedId` |
| `github.unreachable` | warn | The admin layout's pending-entries read fails because GitHub does not answer. | `scope` (`layout`), `error` |
| `guard.rejected` | warn or error | The admin guard refuses a request before `resolve()`. `error` with `reason: "bindings"` when any admin request, the public login and auth paths included, finds no `AUTH_DB` binding; `warn` otherwise. | `reason` (`csrf`, `origin`, `https`, or `bindings`), `path`, `conditionId` on `bindings` |
| `media.uploaded` | info | New bytes are stored to R2 and the manifest row is written. | `editor`, `hash`, `bytes`, `ext` |
| `media.upload_failed` | warn or error | An upload fails: oversize, the wrong type, a network error, or a missing binding. | `editor`, `reason`, `code` (optional) |
| `media.delivery_failed` | warn | The delivery route cannot serve the bytes because the Worker has no media bucket bound. | `reason`, `binding` |
| `media.orphan_reconcile` | info | The reconcile read finishes, comparing stored R2 keys against the manifest hashes. | `orphaned`, `missing` |
| `media.resolve_missing` | warn | A `media:` reference resolves against the manifest and finds no entry for its hash. | `hash` |
| `media.deleted` | info | An asset's bytes and manifest row are removed. | `editor`, `hash` |
| `media.delete_blocked` | warn | A delete is refused because the asset is still referenced. | `editor`, `hash`, `foundIn` (the count of referencing entries) |
| `media.replaced` | info | A replace-in-place rewrites every referencing entry to the new asset and adds its manifest row. | `editor`, `oldHash`, `newHash`, `affected` (the count of rewritten entries) |
| `media.replace_blocked` | warn | A replace is refused because the typed-slug confirm was missing or wrong. | `editor`, `hash`, `foundIn` (the count of referencing entries) |
| `media.alt_propagated` | info | An alt-propagation fills the asset's default alt into its empty placements (and customized ones on the opt-in) across the referencing entries. | `editor`, `hash`, `overwrite`, `written` (the count of rewritten entries) |
| `media.bulk_deleted` | info | A bulk delete commits, removing the manifest rows of the unreferenced assets in the batch. | `editor`, `deleted` (the count removed), `skipped` (the count still in use and left alone) |
| `media.orphans_purged` | info | The orphan purge runs, deleting stored R2 bytes that no manifest row and no reference points at. | `editor`, `purged` (the count of byte objects removed) |
| `dictionary.added` | info | A personal-dictionary add commits the new words to the committed dictionary file. | `editor`, `words` (the added words), `retried` (true when the commit landed on the post-conflict retry) |
| `dictionary.add_conflict` | warn | A personal-dictionary add hits a second commit conflict and gives up; the client keeps the words pending and re-attempts on the next save. | `editor`, `words` |
| `tidy.done` | info | A tidy copy-edit returns a corrected document. Carries no content and no key. | `editor`, `model`, `usage` (the token counts) |
| `tidy.error` | warn | A tidy call fails: a deadline overrun, a client abort, or a model error. Maps to a retryable fail(502). Carries no content and no key. | `editor`, `model`, `aborted` |
| `tidy.refused` | warn | The model refuses to edit the text. Maps to fail(422); the author's text is untouched. | `editor`, `model` |
| `tidy.empty` | warn | The model returns no text. Maps to fail(502). | `editor`, `model` |

Saves land on the entry's pending branch, so `commit.succeeded` and `commit.failed` carry a
`branch` field (`cairn/<concept>/<id>`) on the save path. Deletes, renames, and nav saves commit to
the default branch and omit the field, which is how a held save and a direct commit are told apart
in a query. On `entry.published`, `batch` is `true` when the entry shipped through a publish-all
and `false` for a single publish. A failed publish-all logs one `publish.failed` record per entry
in the batch, so the log names everything that did not go live.

`config.invalid` fires when the nav editor opens against a `site.config.yaml` that fails to parse
or fails the menu validation. The page still opens with an empty tree so the editor is not locked
out, which makes this record the only sign of the fault; its `conditionId` is always
`config.site-config-invalid`, and `error` carries the parse or validation message. On
`guard.rejected` with `reason: "bindings"`, the Worker deployed without an `AUTH_DB` binding, so
the guard serves the branded condition page on every admin path, the login page included, instead
of a sign-in flow that could never succeed; the `conditionId` field is `config.bindings-missing`.

`github.unreachable` fires when the admin layout cannot read the pending-entries state, usually a
revoked installation, a bad credential, or a GitHub outage. The shell degrades rather than fails:
pages still render, and the topbar's Publish site button hides instead of showing a count it
cannot know. A missing publish button with this record in the log means GitHub needs attention,
and the `error` field carries the failure to act on.

On `auth.link.send_failed`, `code` is the Cloudflare binding error code (`E_SENDER_NOT_VERIFIED`
and the rest of the `E_*` set; absent when a custom sender throws a plain `Error`), and
`conditionId` is the mapped diagnostic condition, `email.sender-not-onboarded` for the
not-verified code and `email.send-failed` for everything else.

The `media.*` family covers the asset pipeline. An upload that lands logs `media.uploaded` with
the content `hash`, the stored byte count, and the file `ext`. A rejected upload logs
`media.upload_failed`, where `reason` names the cause and `code` carries the Cloudflare error code
when one is present. The delivery route logs `media.delivery_failed` when it cannot serve the bytes
because the Worker has no media bucket bound: `reason` is `binding-missing`, `binding` names the
expected bucket binding, and the route drains a 503. The reconcile read logs
`media.orphan_reconcile` once it has compared the stored R2 keys against the manifest hashes; its two
counts, `orphaned` and `missing`, size each orphan direction, and it carries no key list or byte
count. A `media:` reference that resolves to no manifest entry logs `media.resolve_missing` with the
unresolved `hash`, which is how a broken reference surfaces in a build or a preview. A delete logs
`media.deleted` once the bytes and the manifest row are gone. When the asset is still referenced, the
delete is refused and logs `media.delete_blocked` instead, with `foundIn` set to how many entries
still point at it. A replace-in-place logs `media.replaced` once the commit lands, naming the
`oldHash`, the `newHash`, and the `affected` count of rewritten entries. A replace that arrives
without the typed-slug confirm is refused and logs `media.replace_blocked`, with `foundIn` set to the
referencing-entry count. An alt-propagation logs `media.alt_propagated` with the `hash`, the
`overwrite` opt-in flag, and the `written` count of entries it rewrote. A bulk delete logs
`media.bulk_deleted` once the commit lands, with `deleted` set to how many unreferenced assets it
removed and `skipped` set to how many it left alone because they were still in use. An orphan purge
logs `media.orphans_purged` with `purged` set to how many stored byte objects it deleted; this is the
one media record that names an irreversible action, since the purged bytes have no git history. The
`hash` is the asset's content hash, which is its stable identity across these records.

The `dictionary.*` and `tidy.*` families cover the editor copy-edit. A personal-dictionary add that
commits logs `dictionary.added` with the added `words`, plus `retried: true` when the commit landed on
the post-conflict retry. A second commit conflict gives up and logs `dictionary.add_conflict`; the
client keeps the words pending and re-attempts on the next save, so the word is never lost. Tidy logs
exactly one record per call. A call that returns a corrected document logs `tidy.done` with the `model`
and the token `usage`. A deadline overrun, a client abort, or a model error logs `tidy.error` (with
`aborted` set when the deadline or the client aborted the request), mapped to a retryable fail(502).
When the model refuses, the record is `tidy.refused`, mapped to fail(422) with the author's text
untouched, and an empty model result logs `tidy.empty`, mapped to fail(502). None of these records carries the document content
or the API key; they carry the editor, the model, and the outcome.

The `email` on `auth.link.requested` is the raw submitted address, logged before the allowlist
check, so it is unvalidated request input. cairn lowercases it, trims it, and caps the logged value
at 320 characters (the RFC 5321 maximum). Every other event that carries an `email` fires only for an
allow-listed editor, so its address is a known one. The request endpoint itself is unauthenticated, so
a flood of distinct addresses inflates log volume; rate-limit it at the edge if that matters for your
site.
