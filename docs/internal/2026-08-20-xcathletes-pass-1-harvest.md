# xcathletes pass 1: consumer harvest

The xcathletes team platform (`~/Projects/xcathletes-org`, xcathletes.org) built its
foundation pass against cairn 0.95.0 on 2026-08-20: a fresh scaffold from the Waymark
template, the admin mount with a custom concept and role vocabulary, custom admin
screens under `/admin/team`, a second-audience OTP login on `auth-channel`, and the
audit sink. It is the second system after the ASC site to extend the admin interface,
and this is what it hit.

Nine findings, in the order a new consumer meets them. The full text with code
citations is `xcathletes-org/docs/harvest-findings-pass-1.md`.

## The two that cost real time

**The owner guards silently no-op on a non-owner row.** `removeOwnerIfNotLast` and
`demoteOwnerIfNotLast` read as guarded versions of `deleteEditor` and `setEditorRole`.
They are not: each returns without acting when the named row is not owner-capability.
A coach-deprovisioning fix called the guarded version unconditionally, on the
reasoning that it was the safe default, and the result would have been that no coach
was ever deprovisioned while every last-owner test still passed. Either make them act
as general guarded deletes, refusing only the genuine last-owner case, or return a
discriminated result so a caller can tell "refused, last owner" from "did nothing,
not an owner". At minimum the reference should say plainly that they act only on
owner rows.

**A freshly scaffolded site with no content cannot build.** Emptying `src/content/`
so a new site carries only its own placeholder fails `npm run build`. Three
prerenderable routes correctly enumerate zero targets against an empty corpus
(`/(site)/archive/[page]`, `/(site)/[...path]`, `/(site)/[...path=md]`), and
SvelteKit's crawl-completeness check cannot tell "correctly empty" from
"misconfigured". The template already carries a hand-written `handleUnseenRoutes`
exemption for the archive route alone, which is the tell: this was hit once and
patched at the instance rather than the class. A scaffolded site's first build is the
one most likely to have no content, so this is the worst possible moment for it.
Shipping the exemption covering all three engine-owned routes in the template's
`svelte.config.js` is a one-line fix.

## Contract and API shape

**`AuthChannelConfig`'s `lookup` and `verify` receive no env.** `resolveDb` takes env;
`lookup(contact)` and `verify(subject)` take only the value being resolved. The
showcase exemplar gets away with it because its roster is a static `Map`. Any consumer
whose roster lives in D1 must close over a database, which means building the channel
per request and caching it in a `WeakMap` keyed on the binding object. Giving `lookup`
and `verify` the same `DeliverContext` shape `deliver` already gets would remove that
dance entirely.

**`createSectionAction`'s wrapped `event.platform` is narrower than a real event.**
It types as `PlatformContext<Env>` with no `ctx`/`context`, so a section action
reaching for `waitUntil` needs a cast, and `add-a-custom-admin-screen.md`'s own
example carries a `snippet-check-skip` hiding exactly this. The deeper issue is that
the example wires an audit sink per action. Wiring `locals.cairnAuditSink` once in
`hooks.server.ts` removes the need for any cast, because there `event` is a real
`RequestEvent`, and it gets every engine-owned action audited too rather than only the
site's own. The example would serve consumers better showing the hook-level wiring,
with the per-action sink as the exception for a section auditing to a different
database.

**No single-choice field can source the committed site vocabulary.**
`fields.multiselect` takes `taxonomy: true` and grows from `/admin/vocabulary` with no
code edit. `fields.select` takes only a literal `options` array. A field that is
genuinely single-choice and genuinely growable has no shape, so a site picks between a
closed set needing a developer to widen and an open text field accepting typos. This
platform's `plans.team` keys public per-team URLs, so it took the closed list.
`SelectField` carrying the same `taxonomy?: boolean` would close it; the vocabulary
plumbing already exists.

**`/sveltekit`'s single barrel drags `$app/environment` into an unrelated import.**
Importing only `createD1AuditSink` still evaluates `preview.js`'s top-level
`$app/environment` import. Fixing it under plain vitest needs two things together,
`vi.mock('$app/environment', ...)` AND `test.server.deps.inline: ['@glw907/cairn-cms']`.
The mock alone silently fails, because Vitest externalizes `node_modules` by default
and bypasses the pipeline the mock hooks into. Worth a note in the testing docs at
least; a finer-grained export would be better.

## Smaller, and one for the engine to reproduce

**Every error thrown from an `/admin/**` load renders the right page at the wrong HTTP
status**, 200 rather than 403/404/500, reproduced against the engine's own
`/admin/posts/[nonexistent-id]` and confirmed not reproducible outside `/admin`
(`/archive/999` correctly 404s). Not diagnosed to root cause. It would make `/admin`
error monitoring by status code silently useless, so it is worth an engine-side look.

**`create-cairn-site` is unpublished**, so scaffolding is `cp -r templates/waymark/.`
plus a manual adaptation. That worked fine and the tree is in good shape. The finding
is that the 0.95.0 changelog and the template README both describe a path a consumer
cannot take, which costs a reader a registry round trip to discover. Either publish
the tool or mark the scaffolding sentence pending the way the Deploy-button notice
already is.

## What worked without friction, worth knowing

`defineRoles`, `bootstrapOwner`, `defineAccess`, `navLayout`, `routing: 'embedded'`,
the admin-toolkit components, and `createD1AuditSink` all behaved exactly as
documented on the first read. The 0.93.0 auth-store export closed the seam the
2026-08-01 consumer brief filed, and the add-coach-provisions-editor flow needed no
fallback. `createAuthChannel` replaced an entire planned task: what the plan scoped as
hand-rolled OTP, sessions, and transport became one configuration file plus a
transport function, and it is the single largest thing the engine saved this consumer.

One accepted deviation worth the engine knowing about: requirements asked for a
six-digit sign-in code and the channel clamps `codeLength` to 8-10. The platform took
eight. The clamp is defensible and documented; this is a note, not a request.
