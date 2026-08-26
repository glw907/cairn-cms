# Fresh-context verification: log-vocabulary (44 items)

Verifier had no hand in the original ranking. Every claim below was checked against the emit site,
not against the ranking's prose. Five verdicts do not stand.

## Headline corrections

1. **The "free context" premise behind three reshapes is false.** `/admin/auth/logout` matches
   `isPublicAdminPath` (`guard.ts:19-20`: `pathname.startsWith('/admin/auth/')`), so the guard's
   `event.locals.cairnEditor = ...` at `guard.ts:160` sits inside `if (!isPublicAdminPath(pathname))`
   and **never runs for logout**. `logoutAction` reads the cookie itself (`auth-routes.ts:222-226`)
   and has no editor in scope. Ranks 2 and 32 both assert the email is already resolved there. It is
   not.
2. **Ranks 2 and 7 are the same record shape adjudicated oppositely.** `deleteSession` is
   `DELETE FROM session WHERE id = ?` (`auth/store.ts:113-115`); `destroyChannelSession` is
   `DELETE FROM cairn_channel_session WHERE token_hash = ?1` (`auth-channel/store.ts:334-336`). Both
   are blind deletes of a row that carries the subject (`session.email` in `migrations/0000_auth.sql:18`;
   `cairn_channel_session.subject`). Rank 7's stated defense, "deriving an id would cost an extra D1
   read", is wrong: D1/SQLite supports `DELETE ... RETURNING`, one statement, one round trip. Evenness
   is a stated property of this audit, so the two must land the same way.
3. **F1 is undercounted, not overstated.** `commit.succeeded` has 11 emit sites and **7**, not 5, pass
   a pseudo-concept: `nav-routes.ts:146`, `content-routes-settings.ts:304` and `:441`, and
   `content-routes-media.ts:637`, `:745`, `:838`, `:1042`. Two more pseudo-concept `commitFields`
   objects feed only the failure path (`media.ts:1229`, `:1384`). Aside:
   `content-routes-dictionary.ts:123` builds a `{concept: 'dictionary', id: additions[0]}` object that
   is never used — a dead variable, and one that would have put an author's word in an `id` field.
4. **F6's uniqueness claim is wrong.** `publish.address_collision` is also a bare noun phrase, neither
   a past-tense verb phrase nor a state adjective. Two names diverge from the ratified header, not one.

---

## Per item

### Rank 1 — auth.channel.delivery_inline — reshape → **KEEP**
The ranking reads the doc row ("the unit-test and edge-case runtime path") and concludes production
never reaches it. The code says the opposite at the emit site, `factory.ts:721-726`:

> // No platform at all: the unit-test/no-adapter runtime. Await inline rather than orphan
> // the promise, and log so a real deployment missing its platform binding is loud.

`resolveWaitUntil` (`factory.ts:114-120`) checks `platform.ctx` then legacy `platform.context`; a site
whose adapter or platform proxy is not wired (a `vite dev` run without it, a mis-adaptered deploy)
takes the inline branch in earnest. That is an anonymous-consumer misconfiguration, and it is exactly
what the warn level is for. The proposed fold also destroys the property: `auth.channel.requested`
fires at `info` on **every** request (`factory.ts:705`), so `inline: true` becomes a field filter on a
high-volume record instead of an alertable-by-existence warn. The ranking praises that same property
in `turnstile.verify_failed` and then removes it here.

### Rank 2 — auth.session.destroyed — reshape — **STANDS** (premise corrected)
`auth-routes.ts:229` emits with no argument; the doc row's field list is literally `none`; the twin
`auth.session.created` carries `email` (`:197`). A record that names no subject cannot answer any
question an operator brings to it, which is a genuine shape defect. But the reshape's mechanism is
wrong: logout is a public admin path, so `locals.cairnEditor` is absent. The free form is
`DELETE FROM session WHERE id = ? RETURNING email` in `deleteSession`, same statement, same round trip.

### Rank 3 — auth.channel.session.created — keep — **STANDS**
`factory.ts:870`, `{correlationId}`, immediately after the awaited `createChannelSession` at `:869`.
The funnel argument is concrete: a session-write fault leaves `auth.channel.confirmed` (`:855`) with
no `session.created` after it.

### Rank 4 — auth.session.created — keep — **STANDS**
`auth-routes.ts:193` and `:197` are separated by exactly one awaited D1 write (`createSession`, `:196`),
so the pair really does isolate a session-row fault from a token fault. The any-site case is not
hypothetical.

### Rank 5 — dictionary.added — reshape — **STANDS**
`content-routes-dictionary.ts:126` and `:135` both ship `words: additions`. `additions`
(`:117`) is built from the author's flagged tokens. `log-events.md:98` tells operators the
`dictionary.*` records "never carry document content". The code falsifies the doc; one of the two must
move. Note `dictionary.add_conflict` (`:141`) carries the same payload and inherits the same fix.

### Rank 6 — commit.reverted — keep — **STANDS**
`content-routes-core.ts:2186` carries `ref` and `branchSha`; no other event does.

### Rank 7 — auth.channel.session.destroyed — keep → **RESHAPE**
The confirm branch (`factory.ts:864`) carries `correlationId` because the subject is in scope; the
logout branch (`:903`) carries nothing at all. The keep rests on "deriving an id would cost an extra
D1 read", which `DELETE ... RETURNING subject` refutes — `destroyChannelSession` already returns void
from a single statement, and the salted-hash derivation is local. This is the same defect as rank 2,
in the same audit, on the same kind of blind delete. Reshape both or keep both; the ranking cannot
split them.

### Rank 8 — preview.token.revoked — keep — **STANDS**
`content-routes-core.ts:2066` carries `count`; `count: 0` is the answer to the stated question.

### Rank 9 — media.alt_propagated — keep — **STANDS**
`content-routes-media.ts:1392`: `overwrite` and `written` both present, exactly as the case needs.

### Rank 10 — admin.action.audited — keep — **STANDS**
`admin-action.ts:182` logs `{...full}` — the whole record including `detail` — and `sink_threw`
(`:190-197`) deliberately omits `detail` with the reasoning in the comment. The untruncated-original
property the keep rests on is real.

### Rank 11 — auth.token.confirmed — keep — **STANDS**
See rank 4; same verified pair.

### Rank 12 — media.bulk_deleted — keep — **STANDS**
`content-routes-media.ts:858` carries `deleted` and `skipped`.

### Rank 14 — tidy.succeeded — reshape — **STANDS**
`content-routes-tidy.ts:258` passes `usage: message.usage` through verbatim. That object is the
`@anthropic-ai/sdk` `Usage` type, an optional peer, and it carries more than the two numbers the doc
names (cache and server-tool counters ride along). A stable-contract record should not re-export a
vendor shape the engine neither controls nor documents.

### Rank 18 — media.deleted — keep — **STANDS**
`content-routes-media.ts:751`, `{editor, hash}`.

### Rank 19 — media.replaced — keep — **STANDS**
`content-routes-media.ts:1237`, `{oldHash, newHash, affected}`.

### Rank 20 — editor.removed — keep — **STANDS**
`editors-routes.ts:130`, `{owner, target}`. Generic shape, no site-specific naming.

### Rank 24 — media.orphans_reconciled — keep — **STANDS**
`media/reconcile.ts:85-88`, `{orphaned, missing}` from the R2-vs-manifest compare.

### Rank 26 — media.replace_blocked — keep — **STANDS**
`content-routes-media.ts:1215` fires on the typed-slug confirm gate, distinct from the reference
refusal at `media.delete_blocked`.

### Rank 28 — commit.succeeded — reshape — **STANDS** (7 of 11, not 5)
See headline 3. The defect is worse than charged: 7 of 11 emit sites pass a pseudo-concept, and
`src/lib/content/concepts.ts:28` reserves only `FRAGMENTS_CONCEPT_ID`, so `media`/`nav`/`settings`/
`vocabulary` are all names a site may legally declare.

### Rank 29 — entry.published — reshape → **KEEP**
F5 is an aesthetic preference, not a measured divergence. The grammar `events.ts:5-7` ratifies is
`area[.subject].verb_phrase` plus snake_case reason values; it says nothing about outcome pairs
sharing an area. The current split is coherent on its own terms: `entry.*` records what happened to
the entry (`published`, `discarded`), `publish.*` records what went wrong with the publish machinery
(`publish.failed`, `publish.address_collision`). Renaming breaks a public-observable contract, orphans
`entry.discarded` as a lone member of its area, and buys an operator a one-name-shorter query the doc
table already answers.

### Rank 30 — taxonomy.unmarked_field — reshape — **STANDS** (with a second instance)
The name is a bare noun phrase against the header at `events.ts:5-7`. But so is
`publish.address_collision`. Any rename lands both, or the header is what should change.

### Rank 32 — auth.session.destroy_failed — reshape → **KEEP**
The reshape's premise fails twice. First, no `cairnEditor` on a public admin path (headline 1).
Second, the throw comes from the DELETE itself (`auth-routes.ts:230-232`), so `RETURNING` yields
nothing — obtaining the email would mean an extra SELECT on **every** logout to enrich a rare failure
record, and the session id may never be logged. The any-site case is also thin: a per-row D1 delete
fault scoped to one editor is not a real failure mode; a D1 fault is store-level, and `error` is the
diagnostic that names it.

### Rank 35 — content.field_behavior_failed — reshape — **STANDS** (mechanism wrong)
`fieldset.ts:450` logs a bare `field` name, and the ambiguity across concepts is real. The
reshapeNote's mechanism is not: `fieldset(record, options)` (`:407-410`) has no concept — a fieldset is
a standalone object a site may share across concepts, and `FieldsetOptions` (`:39-43`) carries only
`refine` and `behavior`. Worse, one call path has no concept at all:
`render/component-validate.ts:19` calls `schema.validate(...)` for a component's attributes. The fix
is a fieldset-level owner label or a third argument to `validate`, covering the component path.

### Rank 36 — include.missing — reshape — **STANDS**
`resolve-include.ts:127` (`{fragment: ''}`) and `:133` (`{fragment: id}`) are two different authoring
faults under one name, separated by an empty string. Neither names the containing entry. The
threading claim checks out: the resolver already arrives via `file.data[FRAGMENT_RESOLVE]` (`:121`).

### Rank 42 — media.resolver_absent — reshape — **STANDS**
`delivery/public-routes.ts:193` emits `{enabled: true}`, and `log-events.md:45` documents the field as
"(always `true`)". A field with one possible value is dead payload in a contract.

### Rank 44 — preview.cleanup_failed — reshape — **STANDS**
`content-routes-core.ts:507` puts `String(err)` in `reason`, against the header's "Every `reason`/`scope`
value a record carries is snake_case". This is the clearest measured divergence in the subsystem, and
the doc row propagates it.

### Rank 45 / 46 — admin.action.session_absent, admin.action.csrf_rejected — keep — **STAND**
`csrf_rejected` verified at `admin-action.ts:171` with the defense-in-depth comment above it. Both
serve a route mounted outside the guard's coverage, which is a developer mistake any consumer can make.

### Rank 38 / 39 / 40 / 41 / 48 / 49 / 50 / 51 / 52 / 53 / 55 / 56 / 57 / 58 — keep — **STAND**
Every one verified at its emit site: `factory.ts:825` (locked), `:802` (escalated), `:429`
(rate_limited), `:422` (rate_limit_absent), `:435` (rate_limit_failed), `:618` (ceiling_exceeded),
`:845`/`:855` (confirmed, both levels), `:705` and the other outcome branches (requested), `:711`
(send_failed); `section-action.ts:213`/`:232`/`:240` (the admin.action rate-limit trio);
`admin-action.ts:190` (sink_threw) and `:227` (unaudited). Each names a condition the wire answer
deliberately hides or degrades past, which is the burden a keep has to carry here.

### Rank 47 — media.resolve_missing — reshape → **KEEP**
The reshape calls the record "diagnostically incomplete" without the referencing entry. It is not.
The `hash` is the asset's stable identity, and a site's content lives in its own git repo, so a
one-command search for the hash names every referencing page; the engine itself already computes
referencing-entry counts from the same kind of scan (`foundIn` on `media.delete_blocked` /
`media.replace_blocked`). Against that, `resolve-media.ts:100` sits inside a closure over the manifest
with no entry in scope, so the field costs a change to the render seam a site's own `render(md)` calls.
Migration cost is not the argument — the argument is that the record already answers its question.

### Rank 62 / 65 / 66 / 67 — keep — **STAND**
`auth.access.denied`: four sites, one shape — `guard.ts:217`, `:254`, `section-action.ts:199`,
`content-routes-media.ts:508`, all `{email, role, target}`. `turnstile.verify_failed`: seven sites,
`cloudflare/turnstile.ts:97-166`, each with its own conditional field. `audit.sink.write_failed`:
`audit-sink.ts:122`. `admin.action.misconfigured`: `section-action.ts:206`, and the
`access_map_not_attached` signal is only available because of the deliberate `access ?? {}` at
`guard.ts:165`.

### Rank 69 — commit.failed — reshape — **STANDS**
`commit-log.ts:16-26` is the shared helper; `commit.failed` and `publish.failed` take the same
`{concept, id, editor}` shape, and the pseudo-concept `commitFields` objects flow into it. Any fix to
rank 28 lands here in the same change, as charged.
