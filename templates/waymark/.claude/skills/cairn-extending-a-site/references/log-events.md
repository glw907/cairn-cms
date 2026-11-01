# Log events

Every engine record is one JSON line: the envelope `level`, `event`, `timestamp`, then the fields
below. An event name is a stable contract (a rename is a breaking change), so key queries and alerts
on it. No record carries a sign-in token, a session id, or a link's contents. Records carry an
editor's email; `audit.sink.write_failed`'s `actor` is whatever identity the caller passed.
`references/debug.md` is the procedure that reads this table.

Contents:

- [Auth and sessions](#auth-and-sessions)
- [Commits, publish, and content](#commits-publish-and-content)
- [Config](#config)
- [Preview](#preview)
- [Guard](#guard)
- [Media and includes](#media-and-includes)
- [Roster and roles](#roster-and-roles)
- [Dictionary and tidy](#dictionary-and-tidy)
- [Custom admin actions and audit](#custom-admin-actions-and-audit)
- [Auth channel](#auth-channel)
- [Health, GitHub, Turnstile](#health-github-turnstile)
- [Refusals that leave no cairn record](#refusals-that-leave-no-cairn-record)

## Auth and sessions

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `auth.link.requested` | info | `email` | `POST /admin/login?/request` ran. `email` is the raw submitted address (lowercased, trimmed, 320 cap), logged before the allowlist check, so a flood of distinct addresses is a request flood. |
| `auth.token.minted` | info | `email`, `expiresAt` | Token issued for an allowlisted editor. |
| `auth.token.rebound` | info | `email` | A cooldown-throttled request carried a different pending-login nonce, so the token now answers the newer browser. One is normal; a run for one address means something keeps requesting links. |
| `auth.link.refused` | warn | `reason` (`no_pending_cookie`) | A confirm with no pending-login cookie failed to consume (token bound to another browser, expired, unknown, or used). |
| `auth.link.send_failed` | error | `email`, `error`, `code`, `conditionId` | The sign-in email send rejected. |
| `auth.token.confirmed` | info | `email` | Token consumed at `/admin/auth/confirm`. |
| `auth.session.created` | info | `email` | Session row created after a confirm. |
| `auth.session.destroyed` | info | `email` | Logout deleted a row that was still live. A stale or expired cookie leaves no record, so this undercounts sign-outs. |
| `auth.session.destroy_failed` | error | `error` | Logout's row delete failed (D1). The cookie is already cleared. |
| `auth.identity.unknown` | warn | `email`, `path` | Identity mode: the gate proved an email that matches no roster row. Fix the roster row to carry this exact address. |
| `auth.role.unknown` | warn | `email`, `role` | Session role is outside the declared vocabulary; it authenticates at `none`. Add the role to `defineRoles`. |
| `auth.access.refused` | warn | `email`, `role`, `target`, `reason` | The access map denied a request. `no_rule`: no key for the target. `shadowed`: a dynamic segment hides the rule behind a deeper key (declare `target`). `role`: the rule omits the role, the `editors` floor, `none` capability, or `ownerOnly`. |

## Commits, publish, and content

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `commit.succeeded` | info | `concept` (entry) or `scope` (nav, settings, vocabulary, media), `id`, `editor`, `branch` on a save | A commit landed. Never both `concept` and `scope`. |
| `commit.failed` | warn or error | as above, plus `reason` or `error` | `warn` + `reason: conflict` is a 409: a stale-edit collision, the engine working, not a fault. `error` + `error` is a GitHub failure. |
| `commit.reverted` | info | `concept`, `id`, `editor`, `ref`, `branchSha` | `revertAction` committed an earlier publish onto the pending branch (alongside `commit.succeeded`). |
| `entry.published` | info | `concept`, `id`, `editor`, `batch` | Edits landed on the default branch. `batch` is true for publish-all. |
| `entry.discarded` | info | `concept`, `id`, `editor` | A pending branch was deleted. |
| `publish.failed` | warn or error | `concept`, `id`, `editor`, `reason` or `error` | Same shape as `commit.failed`. A failed publish-all logs one per entry. |
| `publish.address_collided` | warn | `editor`, `address`, `heldByConcept`, `heldById` | A publish was refused because a live entry already holds the address. Nothing committed to `main`. |
| `content.field_behavior_failed` | warn | `field`, `owner`, `error` | A `behavior.validate` threw; the field counted as valid and the save went through. `owner` is the concept id or directive name. Fix the validator. |
| `content.field_unmarked` | warn | `concept`, `field` | A multiselect named `tags`, `freetags`, or `categories` and no `taxonomy: true` field, so the tag index is empty. Mark the field. |
| `content.field_undeclared` | warn | `concept`, `keys` | Manifest build found frontmatter keys the concept does not declare. Validation drops them; a save or publish keeps them in the file. |
| `content.entry_invalid` | warn | `scope`, `concept`, `id` (index) or `path` (manifest), `draft`, `errors` | `scope: index`: `createSiteIndexes` ran with `validate: false` and dropped the entry. `scope: manifest`: the manifest skipped it (drafts too), so the admin list omits it. |

## Config

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `config.invalid` | error | `scope` (`nav`, `settings`, `vocabulary`), `conditionId`, `error` | Committed site config failed to parse or validate. The nav and vocabulary loads fall back to empty; the settings and vocabulary saves answer `fail(500)` with generic copy. `error` holds the parser message. |
| `config.access_unmapped` | warn | `unmapped` | The access map keys at least one screen and leaves the listed concepts or fixed screens (`media`, `vocabulary`, `nav`, `settings`) without a rule. Fires once per isolate at cold start: widen the query window. Route keys never count. |

## Preview

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `preview.token.minted` | info | `concept`, `id`, `editor`, `expiresAt` | A link was minted (built-in action or `mintPreview`). Never the token. |
| `preview.token.revoked` | info | `concept`, `id`, `editor`, `count` | All links for an entry were revoked. |
| `preview.cleanup_failed` | warn | `concept`, `id`, `error` | Best-effort link clear after delete, discard, or rename hit a D1 error. A missing binding or table is silent. |
| `preview.refused` | warn | `reason`; `concept`, `id` on `row_invalid`, `draft_invalid`, `branch_gone`; `binding` on `bindings_missing` | Checked in order: `bindings_missing` (no `AUTH_DB`, answers 503), `table_missing` (apply `0003_preview.sql`), `unknown` (no row: revoked, deleted, renamed, never-published discard), `expired`, `row_invalid` (stored concept or id no longer valid), `draft_invalid` (draft fails validation), `branch_gone` (branch and published file both gone). Every other answer is an identical 404. |

## Guard

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `guard.refused` | warn or error | `reason`, `path`; `conditionId` on `bindings`, `identity`; `detail`, `witness`, `hasSession` on `csrf`; `detail`, `error` on `identity` | `reason`: `bindings` (error: no `AUTH_DB`, any admin path), `dev_backend_in_prod` (error, 503: `CAIRN_DEV_BACKEND` set in a deployed runtime), `https`, `csrf`, `identity`. On `csrf`, `witness` is `header` if an `X-Cairn-CSRF` header arrived at all (empty counts), else `field`; `detail` is `no-cookie`, `no-witness`, `mismatch`, or `unparseable-body`. On `identity`, `detail` is the resolver's reason (`missing`, `invalid`, `expired`, `no_email` at warn; `audience`, `issuer`, `keys` at error) or `error` when the resolver threw, with the message in `error` (300 cap). |

## Media and includes

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `media.uploaded` | info | `editor`, `hash`, `bytes`, `contentType`, `reused` | Bytes stored to R2 or matched. The manifest row lands later with the save or Library commit. |
| `media.upload_failed` | warn | `editor`, `reason` | `media_disabled`, `length_required`, `too_large` (over `maxUploadBytes`), `csrf`, `session_expired`, `access_denied`, `unsupported_type` (sniffed type not allowed or markup), `binding_missing`, `hash_collision`. |
| `media.delivery_failed` | warn | `reason` (`binding_missing`), `binding` | The serve route has no bucket bound. |
| `media.orphans_reconciled` | info | `orphaned`, `missing` | Reconcile read finished. |
| `media.resolve_missing` | warn | `hash` | A `media:` reference has no manifest row; renders as a broken image. |
| `media.resolver_absent` | warn | none | A public route factory built with `assetsEnabled` and no `resolveMedia`. Once at construction. |
| `media.deleted` | info | `editor`, `hash` | Bytes and row removed. |
| `media.delete_refused` | warn | `editor`, `hash`, `foundIn` | Asset still referenced. |
| `media.replaced` | info | `editor`, `oldHash`, `newHash`, `affected` | Replace-in-place rewrote referencing entries. |
| `media.replace_refused` | warn | `editor`, `hash`, `foundIn` | Typed-slug confirm missing or wrong. |
| `media.alt_propagated` | info | `editor`, `hash`, `overwrite`, `written` | Default alt filled into placements. |
| `media.bulk_deleted` | info | `editor`, `deleted`, `skipped` | Bulk delete committed; in-use assets skipped. |
| `media.orphans_purged` | info | `editor`, `purged` | Unreferenced R2 bytes deleted. |
| `include.missing` | warn | `reason`, `fragment` (160 cap), `entry` (`<concept>/<id>`, absent with a site resolver) | `empty_fragment`: no `fragment` attribute (the build passes, the notice ships). `not_found`: a non-build resolver missed the id. |
| `include.read_failed` | warn | `fragment`, `error` | The editor load could not read a fragment body (transport, not absence). |

## Roster and roles

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `editor.added` | info | `owner`, `target`, `role`, `capability` | Owner added an editor. |
| `editor.removed` | info | `owner`, `target` | Owner removed an editor. |
| `editor.role_changed` | info | `owner`, `target`, `role`, `capability` | Owner changed a role. |
| `editor.bootstrapped` | info | `email` | The `bootstrapOwner` request inserted the first owner row. |

## Dictionary and tidy

These never carry document content or an API key.

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `dictionary.added` | info | `editor`, `wordCount`, `retried` | Dictionary add committed. |
| `dictionary.add_conflict` | warn | `editor`, `wordCount` | Second conflict; the client retries on the next save. |
| `tidy.succeeded` | info | `editor`, `model`, `tokens` | Tidy returned a corrected document. |
| `tidy.failed` | warn | `editor`, `model`, `reason` | Non-retryable, 503: `auth` (key rejected 401/403, marks the key unhealthy), `sdk_missing` (install `@anthropic-ai/sdk`), `invalid_request` (400, usually a bad `tidy.model`). Retryable, 502: `timeout` (deadline fired; raise `timeoutMs`), `abort`, `model` (rate limit, overload, server, network). |
| `tidy.refused` | warn | `editor`, `model` | Model refused the text (422). |
| `tidy.empty` | warn | `editor`, `model` | Model returned nothing (502, retryable). |

## Custom admin actions and audit

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `admin.action.session_absent` | warn | `path` | A `createAdminAction` route found no editor and redirected to login. Behind the guard this means the route sits outside `/admin/**` or a hook cleared the editor. |
| `admin.action.csrf_refused` | warn | `path`, `editor`, `detail`, `witness` | The wrapper's CSRF check failed (same values as `guard.refused`). First trace under `devBackendHandle`, which runs no CSRF check. Mount `CsrfField` in the form. |
| `admin.action.misconfigured` | error | `path`, `reason` | `createSectionAction` answered `fail(500)`. `db_not_bound`: `resolveDb` returned null or undefined. `access_map_not_attached`: a non-engine hook set `locals.cairnEditor` without `locals.cairnAccess`. |
| `admin.action.unaudited` | error | `editor`, `path` | A `createAdminAction` handler returned without `ctx.audit` (production; dev throws). |
| `admin.action.audited` | info | `actor`, `action`, `entity`, `entityId`, `detail` | `ctx.audit` was called. |
| `admin.action.failed` | error | `action`, `concept`, `id`, `editor`, `error`, `conditionId` | An engine action threw unexpectedly. `conditionId: auth.store-roles-unmigrated` means `AUTH_DB` lacks `0001_roles.sql`. |
| `admin.action.rate_limit_absent` | warn | `path`, `action`, `entity` | Rate limit configured but its binding resolved to nothing; degrades to open. |
| `admin.action.rate_limit_failed` | warn | `path`, `action`, `entity`, `error` | Binding present but `key()` or `limit()` threw; degrades to open. |
| `admin.action.rate_limited` | warn | `path`, `action`, `entity`, `editor` | Over limit, `fail(429)`: the limit working. |
| `admin.attention_failed` | warn | `error` | The site's `attention` function threw; the shell shows no badges. |
| `audit.sink.call_failed` | error | `path`, `action`, `entity`, `entityId`, `editor`, `error` | The site's `locals.cairnAuditSink` threw or rejected. The action stands; fix the sink. |
| `audit.sink.write_failed` | error | `reason`, `actor`, `action`, `entity`, `entityId`, `detail`, `error` | `createD1AuditSink` failed to persist: `coercion_failed`, `prepare_failed`, `insert_rejected`, `wait_until_failed`. The only surviving copy of the row. |

## Auth channel

`correlationId` is a pseudonym (first 16 hex of the salted identity hash), never the subject.

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `auth.channel.requested` | info or warn | `correlationId` (absent on `challenge_failed`), `outcome` | `outcome`: `delivered`, `unknown` (contact not on the roster `lookup` reads), `cooldown`, `challenge_failed`, `suppressed`, `lookup_failed` (warn: `lookup` threw). |
| `auth.channel.send_failed` | error | `correlationId`, `error` | `deliver` threw; the pending row is deleted and the charge refunded. |
| `auth.channel.send_cleanup_failed` | error | `correlationId`, `error` | The cleanup after a failed `deliver` also threw. |
| `auth.channel.confirmed` | info or error | `correlationId`, `outcome` (`empty_subject_fault` on error) | Code consumed. Error branch: the stored subject is an empty string (roster data fault). |
| `auth.channel.locked` | warn | `correlationId` | Per-code attempt cap exceeded. |
| `auth.channel.escalated` | warn | `correlationId` | Failure threshold exceeded and the challenge also failed; answers `challenge-required`. |
| `auth.channel.ceiling_exceeded` | error | `correlationId` | Identity send ceiling exceeded; delivery still proceeds. |
| `auth.channel.session.created` | info | `correlationId` | Session minted. |
| `auth.channel.session.destroyed` | info | `correlationId` | Live row destroyed by logout, confirm's orphan cleanup, or a `verify`-refused revocation. |
| `auth.channel.salt_unavailable` | warn | `path` (`logout` or `revoke`), `error` | Teardown finished but the pseudonym could not be derived, so the destroyed record was skipped. |
| `auth.channel.rate_limited` | warn | `action`, `correlationId` | Over the optional limit; answers `throttled`. |
| `auth.channel.rate_limit_absent` | warn | `action`, `correlationId` | Limit binding resolved to nothing; degrades to open. |
| `auth.channel.rate_limit_failed` | warn | `action`, `correlationId`, `error` | `key()` or `limit()` threw; degrades to open. |

## Health, GitHub, Turnstile

| Event | Level | Fields | Meaning |
|---|---|---|---|
| `github.unreachable` | warn | `scope` (`shell`, `help`, `publish_advisories`, `health`), `error` (not on `health`), `reason` (`health` only) | A best-effort GitHub read failed and the screen degraded. On `health`: `key_refused` (401), `installation_not_found` (404), `installation_suspended` (403), `unreachable`. |
| `health.failed` | error | `error` | `loadHealth` threw; the route answers 503 while this keeps the message. |
| `turnstile.verify_failed` | warn | `reason`; `tokenLength`, `error`, `status`, `codes`, `expected`/`actual` per reason | `missing_secret` (blank secret, checked first), `invalid_input` (no or bad token), `request_failed`, `bad_status`, `unparseable`, `rejected` (non-routine error code: rotated or wrong secret), `hostname_mismatch`, `action_mismatch`. A routine bot rejection logs nothing. |

## Refusals that leave no cairn record

SvelteKit's origin check refuses a form-typed or untyped `POST`/`PUT`/`PATCH`/`DELETE` whose `Origin`
is absent, `null`, or foreign with a plain 403 `Cross-site POST form submissions are forbidden`,
before any hook runs (not under `vite dev`). Only the Workers Logs invocation record shows it. Usual
causes: a tab loaded before a `Referrer-Policy` change, a `no-referrer` meta after
`%sveltekit.head%`, or a proxy origin mismatch (set `paths.origin`). A branded
`auth.csrf-token-invalid` page is a token failure instead, logged as `guard.refused` `reason: csrf`.
