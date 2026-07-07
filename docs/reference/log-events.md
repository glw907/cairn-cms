# Reference: log events

cairn emits structured diagnostic events through `console`, which Cloudflare Workers Logs ingests
and indexes when a site sets `observability.enabled = true`. Each record carries an envelope
(`level`, `event`, `timestamp`) plus the event-specific fields listed below. The `event` name is a
stable contract, so renaming one is a breaking change. Records carry an editor's email for
attribution but never a magic-link token, a session ID, or a magic-link's contents (see
[the security model](../explanation/security-model.md) for the redaction stance). To query these
in production, see the [read cairn's logs guide](../guides/read-cairn-logs.md).

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
| `content.field_behavior_error` | warn | A field's co-bundled `behavior.validate()` throws during save-time validation; the save keeps the field valid rather than breaking. | `field`, `error` |
| `taxonomy.unmarked_field` | warn | A concept marks no `taxonomy: true` field yet declares a multiselect named `tags`, `freetags`, or `categories`, so the tag index reads empty. Fires once per index build. | `concept`, `field` |
| `entry.published` | info | A pending entry's edits land on the default branch. | `concept`, `id`, `editor`, `batch` |
| `entry.discarded` | info | A pending branch is deleted: a discard, or the delete of a never-published entry. | `concept`, `id`, `editor` |
| `publish.failed` | warn or error | A publish commit fails, with the `commit.failed` shape. | `concept`, `id`, `editor`, `reason` or `error` |
| `publish.address_collision` | warn | A publish proceeds while another entry already resolves to the same address (last-write-wins, now visible). | `editor`, `address`, `displacedConcept`, `displacedId` |
| `github.unreachable` | warn | The admin layout's pending-entries read fails because GitHub does not answer. | `scope` (`layout`), `error` |
| `guard.rejected` | warn or error | The admin guard refuses a request before `resolve()`. `error` with `reason: "bindings"` when any admin request, the public login and auth paths included, finds no `AUTH_DB` binding, or `reason: "dev_backend_in_prod"` (a 503) when `CAIRN_DEV_BACKEND` is set in a deployed runtime; `warn` otherwise. | `reason` (`csrf`, `origin`, `https`, `bindings`, or `dev_backend_in_prod`), `path`, `conditionId` on `bindings` |
| `media.uploaded` | info | New bytes are stored to R2 and the manifest row is written. | `editor`, `hash`, `bytes`, `ext` |
| `media.upload_failed` | warn | cairn refuses an upload: media turned off, an invalid or oversize length, CSRF, an expired session, an unsupported type, a short-hash collision, or a missing storage binding. | `editor`, `reason` |
| `media.delivery_failed` | warn | The delivery route cannot serve the bytes because the Worker has no media bucket bound. | `reason`, `binding` |
| `media.orphan_reconcile` | info | The reconcile read finishes, comparing stored R2 keys against the manifest hashes. | `orphaned`, `missing` |
| `media.resolve_missing` | warn | A `media:` reference resolves against the manifest and finds no entry for its hash. | `hash` |
| `media.resolver_absent` | warn | A public route factory is built with media configured on but no `resolveMedia` wired, so public images would render as bare `media:` tokens. Fires once at construction. | `enabled` (always `true`) |
| `media.deleted` | info | An asset's bytes and manifest row are removed. | `editor`, `hash` |
| `media.delete_blocked` | warn | A delete is refused because the asset is still referenced. | `editor`, `hash`, `foundIn` (the count of referencing entries) |
| `media.replaced` | info | A replace-in-place rewrites every referencing entry to the new asset and adds its manifest row. | `editor`, `oldHash`, `newHash`, `affected` (the count of rewritten entries) |
| `media.replace_blocked` | warn | A replace is refused because the typed-slug confirm was missing or wrong. | `editor`, `hash`, `foundIn` (the count of referencing entries) |
| `media.alt_propagated` | info | An alt-propagation fills the asset's default alt into its empty placements (and customized ones on the opt-in) across the referencing entries. | `editor`, `hash`, `overwrite`, `written` (the count of rewritten entries) |
| `media.bulk_deleted` | info | A bulk delete commits, removing the manifest rows of the unreferenced assets in the batch. | `editor`, `deleted` (the count removed), `skipped` (the count still in use and left alone) |
| `media.orphans_purged` | info | The orphan purge runs, deleting stored R2 bytes that no manifest row and no reference points at. | `editor`, `purged` (the count of byte objects removed) |
| `editor.added` | info | An owner adds an editor to the D1 allowlist. | `owner` (the acting owner), `target` (the added editor), `role` |
| `editor.removed` | info | An owner removes an editor from the D1 allowlist. | `owner` (the acting owner), `target` (the removed editor) |
| `editor.role_changed` | info | An owner changes an editor's role. | `owner` (the acting owner), `target` (the changed editor), `role` (the new role) |
| `dictionary.added` | info | A personal-dictionary add commits the new words to the committed dictionary file. | `editor`, `words` (the added words), `retried` (true when the commit landed on the post-conflict retry) |
| `dictionary.add_conflict` | warn | A personal-dictionary add hits a second commit conflict and gives up; the client keeps the words pending and re-attempts on the next save. | `editor`, `words` |
| `tidy.done` | info | A tidy copy-edit returns a corrected document. Carries no content and no key. | `editor`, `model`, `usage` (the token counts) |
| `tidy.error` | warn | A tidy call fails: a deadline overrun, a client abort, or a model error. Maps to a retryable fail(502). Carries no content and no key. | `editor`, `model`, `aborted` |
| `tidy.refused` | warn | The model refuses to edit the text. Maps to fail(422); the author's text is untouched. | `editor`, `model` |
| `tidy.empty` | warn | The model returns no text. Maps to fail(502). | `editor`, `model` |
| `admin.action.audited` | info | A custom admin action wrapped in `adminAction` calls `ctx.audit`. | `editor`, `action`, `entity`, `entityId`, `detail` |
| `admin.action.unaudited` | error | A custom admin action wrapped in `adminAction` returns normally (not SvelteKit's `fail()`, which mutated nothing and is exempt) having called `ctx.audit` zero times, in production (dev throws instead). | `editor`, `path` |

A few fields recur across families and are worth knowing up front. `branch` (`cairn/<concept>/<id>`)
appears on `commit.succeeded`, `commit.failed`, and `publish.failed` only on the save path. Deletes,
renames, and nav saves commit to the default branch and omit it. `entry.published`'s `batch` field is
`true` for a publish-all and `false` for a single publish, and a failed publish-all logs one
`publish.failed` per entry, so the log names everything that didn't go live. Across the `media.*`
family, `hash` is the asset's content hash and its stable identity from upload through delete. The
`dictionary.*` and `tidy.*` records never carry document content or an API key, only the editor, the
model, and the outcome.

The `email` on `auth.link.requested` is the raw submitted address, logged before the allow-list
check: cairn lowercases it, trims it, and caps it at 320 characters. Because the endpoint has no
authentication, treat a flood of distinct addresses as a signal to rate-limit at the edge. Every
other event's `email` fires only for an allow-listed editor.
