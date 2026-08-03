# Upgrade cairn

To upgrade cairn you bump the version range, read the `Consumers must:` steps for the versions
you cross, and run your own gates. The [CHANGELOG](../../CHANGELOG.md) records those steps per
version; a version with no `Consumers must:` list is a drop-in bump.

## Upgrade

1. **Bump the version range.**

   ```sh
   npm install @glw907/cairn-cms@^0.79.0
   ```

2. **Read every `Consumers must:` list between your old version and the new one** in the
   [CHANGELOG](../../CHANGELOG.md). Each breaking release states its own list, so a run from
   `0.76.0` to `0.78.2` means reading `0.78.0`'s and `0.78.2`'s lists in order. A version
   with no `Consumers must:` list changed nothing you need to act on.
3. **Apply each listed change** to your adapter, your routes, or your `wrangler.jsonc`, as that
   version's list names.
4. **Run `npx cairn-doctor`** against your site. It catches a binding, a config key, or a
   dependency floor the new version now expects that your site hasn't caught up to yet. See the
   [`cairn-doctor` reference](../reference/doctor.md) for what it checks.
5. **Run your own site's build and test gate** before you deploy. cairn's gates only exercise
   the package. They can't reach your adapter, your `render`, or your routes.

## Adopt the admin type grammar

When you cross `0.91.0`, the release that ships the admin grammar tokens, cross straight to
`0.91.1`. `0.91.0` alone dropped nineteen utility classes from the shipped admin sheet, the
named type steps among them, so custom admin markup riding any of them rendered unstyled;
`0.91.1` restores the full set, and on it your custom admin screens render as they did on
`0.90.1`.
`npx cairn-audit`'s static `type-scale` rule starts reporting named Tailwind steps
(`text-sm`, `text-xs`, bracketed sizes) in your admin markup, and most of those reports
are a mechanical rename with zero visual change. On the first consumer admin measured, 265
of 298 findings were pure renames.

1. **Run `npx cairn-audit`** over your site. Each `type-scale` finding names the class you
   wrote and the size it resolves to: `class "text-sm" sets font-size to "0.875rem", which
   resolves to no --cairn-type-* token`.
2. **Match that size to a grammar role** in
   [Admin grammar tokens](../reference/admin-grammar-tokens.md) and rename the class to
   the role's utility. `0.875rem` is `--cairn-type-body`, so `text-sm` body copy becomes
   `type-body`. A role renders at the same size and leading the named step did, so the
   screen doesn't move. The grammar utilities are safelisted into cairn's shipped admin
   sheet, so the renamed class resolves with no Tailwind configuration change on your
   side.
3. **Move an off-scale size onto a role.** Where no role carries the size a finding
   reports, the text is off the scale. Decide what it is (body, meta, label) and move it
   onto that role, or keep it deliberately and add a
   [counted suppression directive](../reference/cairn-audit.md) with its reason. The
   skill's derivation ladder covers the case where none of the roles fits.
4. **Re-run the audit.** The static gate reports zero `type-scale` findings when the
   adoption is complete.

## How cairn versions

cairn is `0.x`, and until it reaches `1.0`, the number tracks scale. A minor version means a new
subsystem or public surface; everything else is a patch, whether or not it breaks you. Whether a
version breaks your site is stated in its `Consumers must:` list, not signaled by the version
number. Check the exact number that's free to publish next with `npm view
@glw907/cairn-cms versions --json` rather than assuming the next one in sequence.

That scheme lasts only through `0.x`. At `1.0`, cairn moves to compatibility SemVer: a major
version signals a breaking change, and the number finally carries the compatibility promise the
`Consumers must:` line carries now. The beta that precedes `1.0` publishes under an npm `beta`
dist-tag as `1.0.0-beta.1`, iterating `-beta.N` and still carrying a `Consumers must:` line on
any bump that breaks something, until the `1.0.0` cut. `npm install @glw907/cairn-cms` keeps
resolving to the latest `0.x` release until then.

## When something breaks anyway

Only the latest published minor gets fixes. There's no backport branch, so check `npm view
@glw907/cairn-cms version` before assuming a bug is still open. If it's open, file a GitHub
issue against [`glw907/cairn-cms`](https://github.com/glw907/cairn-cms/issues) with the version,
what you expected, and what happened. Attach the structured log record if the failure logged
one. cairn's runtime emits one for every commit, auth, and guard failure: [Log
events](../reference/log-events.md) names each event and its fields, and [Read cairn's
logs](./read-cairn-logs.md) covers querying them on a deployed Worker.

## Unreleased: a cloudflare export, a packaged audit sink, and a breaking convergence of the event, locals, role, and nav seams

A new server-only export subpath, `@glw907/cairn-cms/cloudflare`, publishes the
Cloudflare-native platform primitives two sites already copy by hand: `verifyTurnstile`, the
Turnstile siteverify fetch, fail-closed on every failure mode; and `checkRateLimit` and
`checkRateLimitKeys`, the Workers `RateLimit` binding wrapper, degrade-to-open on an absent
binding. Reach for it when you build your own Turnstile-guarded form or your own rate-limited
endpoint, so you reuse the same primitives instead of copying them by hand. `RateLimitLike`
moves to this subpath as its one declaration in the source tree; if you imported it from
`@glw907/cairn-cms/sveltekit`, that import keeps working unchanged. See
[Cloudflare](../reference/cloudflare.md).

A new factory on `@glw907/cairn-cms/sveltekit`, `createD1AuditSink(db, waitUntil)`, is the first
packaged implementation of the `AdminActionAuditSink` seam: apply the bundled
`migrations/0002_audit.sql` and wire the factory to persist every `ctx.audit` record into one
`audit_log` table, instead of hand-rolling your own sink module. It's opt-in, fail-open, and
truncates every bound field to a documented maximum. See
[`createD1AuditSink`](../reference/sveltekit.md#created1auditsink).

Consumers must: nothing. Both additions are additive, and the `RateLimitLike` re-export keeps its
existing shape and location on `/sveltekit`.

A review pass across the whole seam contract settled a handful of long-standing questions, none
of which changed an exported type or a route contract. It found that a bare `wrangler
types`-generated `Env`, with no [`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings)
intersection, failed to compile `export const actions = admin.actions` (and every other route
factory assignment), because `@cloudflare/workers-types`' `SendEmail.send` returns
`Promise<EmailSendResult>` while cairn's own `EMAIL.send` declared `Promise<void>`. **This
incompatibility dissolved in the C2 breaking-window pass** (see that section below): cairn's
`EmailSender.send` now returns `Promise<unknown>`, which structurally accepts the wider Cloudflare
return type, so `CairnPlatformBindings` stays a recommended convenience preset rather than a
requirement. If your `app.d.ts` already follows [Deploy to
Cloudflare](./deploy-to-cloudflare.md#wire-the-guard), nothing changes for you either way.

`adminAction`'s audit sink now holds its advertised fail-open promise at the engine's own call
site: a hand-rolled `event.locals.cairnAuditSink` that throws, or one that rejects asynchronously, no
longer fails the action it audited, and the failure logs the new `admin.action.sink_threw`
event instead of disappearing.

The package now declares `"engines": { "node": ">=22" }`, and a new reference page, [Supported
toolchain](../reference/supported-toolchain.md), states the versions cairn promises against and
proves against, for `@sveltejs/kit`, `svelte`, `vite`, `typescript`, `node`, and TypeScript module
resolution.

`adminAction`'s two refusals, a missing signed-in editor (authentication) and a CSRF mismatch, now
throw SvelteKit's own `redirect()` and `error(403, ...)` instead of the dev-only error class, the
same framework-native shapes `requireOwner`, `requireEditor`, and `requireAccess` throw for their
own authorization checks (`requireSession` throws the same redirect for its own authentication
check). `adminAction` itself still performs no authorization: a
`none`-capability editor's session passes both of its checks and reaches your handler unchanged;
add [`requireAccess`](../reference/sveltekit.md#requireaccess) inside the handler, or build on
[`createSectionAction`](../reference/sveltekit.md#createsectionaction), for a capability check.
If your `hooks.server.ts` defines a `handleError` only to map the old `AdminActionError` into a
legible response for these two refusals, remove that mapping: it does nothing useful now, and a
site relying on the old `500` these refusals produced for alerting now sees a `303` (the redirect)
and a `403` (the SvelteKit-native error) instead. Both now navigate away from the submitting page
(the redirect to `/admin/login`, the 403 to the nearest error boundary), discarding any unsaved
form input, where the old `500` left the page itself intact and recoverable with Back. The class
itself renames to [`UnauditedActionError`](../reference/sveltekit.md#types): after this refusal
channel convergence it means exactly one thing, the dev-only unaudited-action defect signal, a
build-time check that never reaches a production response, and the new name states that plainly.
See [Refusal
channels](../reference/sveltekit.md#refusal-channels).

Consumers must: be on Node 22 or later for your build toolchain (already the tutorial's stated
requirement, now a declared one too); replace any imported `AdminActionError` with
`UnauditedActionError`; and remove any `handleError` mapping of that class for `adminAction`'s two
authentication refusals (they need no mapping anymore). Nothing else in this window changes an
exported type, a route contract, or a behavior you'd observe without hitting one of those two: a
throwing or rejecting audit sink previously failed the action it audited and now does not.

`AuthEnv` and `BackendEnv` collapse into one all-optional `CairnEnv` (`AUTH_DB`, `PUBLIC_ORIGIN`,
`CAIRN_DEV_BACKEND`, `EMAIL`, `GITHUB_APP_PRIVATE_KEY_B64`), exported from both the root barrel
and `/sveltekit`. `EmailSender` is named once (`{ send(message): Promise<unknown> }`) and
referenced from both `CairnEnv` and `CairnPlatformBindings`; the widened `Promise<unknown>`
return dissolves the `SendEmail.send` incompatibility above, so `CairnPlatformBindings` demotes
from a requirement back to a recommended convenience preset. `PlatformContext` narrows to
`{ env?: Env }` (the engine never read `ctx`/`context`) and is now exported from `/sveltekit`. See
[SvelteKit](../reference/sveltekit.md#cairnenv).

Consumers must: replace any imported `AuthEnv`/`BackendEnv` with `CairnEnv` on the same subpath,
and drop any reliance on `PlatformContext.ctx`/`.context` (the engine never read either).

`EventBase`, `RequestContext`, the content routes' `ContentEvent`, the admin facade's
`AdminEvent`, and `adminAction`'s own `AdminActionEvent` collapse into one `CairnEvent<Env =
CairnEnv>`. It adds `params` and `route: { id: string | null }` (ending the anti-idiom of reading route
identity out of a form body, and giving `SectionActionOptions.target` an honest derivation), and
makes `cookies` and `setHeaders` unconditionally required, since a real SvelteKit event always
carries all four. The entry below renames `locals`'s key names. `requireSession`, `requireOwner`,
`requireEditor`, and `requireAccess` now take `CairnEvent` in place of their old minimal inline
shapes. See [the event shape](../reference/sveltekit.md#the-event-shape).

Consumers must: replace any imported `EventBase`, `RequestContext`, `ContentEvent`, `AdminEvent`,
or `AdminActionEvent` with `CairnEvent` on the same subpath; a hand-built event fixture (a test, a
script) now needs `params` and `route` alongside the fields it already carried.

`locals`'s four keys take the flat `cairn` prefix: `editor` becomes `cairnEditor`, `backend`
becomes `cairnBackend`, and `auditSink` becomes `cairnAuditSink` (`cairnAccess` already carried
the prefix and is unchanged). A flat key costs a site one optional hop
(`event.locals.cairnEditor`) instead of a nested `locals.cairn.editor`, and a grep for
`cairnEditor` now finds every engine read of the field in any repo. There is no alias and no
fallback read of the old names: the rename applies everywhere at once. See [the ambient types
reference](../reference/ambient.md) for the full four-key shape and [the event
shape](../reference/sveltekit.md#the-event-shape) for `CairnEvent['locals']`.

Consumers must: rename every `event.locals.editor`, `event.locals.backend`, and
`event.locals.auditSink` read or write in your own `hooks.server.ts` and any custom admin route to
`event.locals.cairnEditor`, `event.locals.cairnBackend`, and `event.locals.cairnAuditSink`; a
custom `App.Locals` augmentation that duplicates the old field names (rather than importing
`@glw907/cairn-cms/ambient`) needs the same rename.

Every role-*name* position (`Editor.role`, `EditorRow.role`, `insertEditor`'s and
`setEditorRole`'s `role` parameters, `AccessMap`'s values, and a `navLayout` entry's or
section's `roles`) widens from the implicit `'owner' | 'editor'` union to a plain `string` (or
`string[]`): role names are open, since you name your own vocabulary with `defineRoles`, and the
old literal union stopped being true the moment you declared a role like `webmaster`.
`Capability` (`'owner' | 'editor' | 'none'`) is unchanged. The `Role` type is removed from the
root barrel and `/auth-store`, along with the `CairnRolesRegister` registry interface it existed
solely to narrow. See [Roles](../reference/core.md#roles) and [Auth
store](../reference/auth-store.md).

Consumers must: replace any imported `Role` type with `string`; if your `app.d.ts` augments
`interface CairnRolesRegister { roles: typeof roles }`, remove that block, since it no longer
narrows anything; drop any cast you added to force a custom role name past the old `Role` union
(an `AccessMap` value, a `navLayout` entry's `roles`, or an `Editor`/`EditorRow` fixture).

The route-factory members and the admin facade's `actions` keys now follow one grammar: a member
that is a SvelteKit `load` ends in `Load`, a member that is a form action ends in `Action`, and a
facade `actions` key is its member name minus the `Action` suffix. Twelve route-factory members
rename: `createContentRoutes`'s `settingsSave` to `settingsSaveAction`, `vocabularySave` to
`vocabularySaveAction`, `shellPayload` to `shellLoad`, `indexRedirect` to `indexLoad`,
`addDictionaryWordAction` to `dictionaryAddAction`, `mediaPurgeOrphansAction` to
`mediaOrphanPurgeAction`, `mediaReplaceApplyAction` to `mediaReplaceAction`, and
`mediaAltApplyAction` to `mediaAltPropagateAction`; `createNavRoutes`'s `navSave` to
`navSaveAction`; and `createEditorRoutes`'s `addEditorAction`, `removeEditorAction`, and
`setRoleAction` to `editorAddAction`, `editorRemoveAction`, and `editorSetRoleAction`. Seven
facade `actions` keys on `createCairnAdmin` rename to match: `saveSettings` to `settingsSave`,
`saveVocabulary` to `vocabularySave`, `addDictionaryWord` to `dictionaryAdd`, `addEditor` to
`editorAdd`, `removeEditor` to `editorRemove`, `setRole` to `editorSetRole`, and `mediaPurge` to
`mediaOrphanPurge`. See [SvelteKit](../reference/sveltekit.md#createcontentroutes) and
[admin routes](../reference/admin-routes.md#the-actions-vocabulary).

Consumers must: rename every renamed route-factory member in your own `+page.server.ts` files if
you mount routes per-surface rather than through the single-mount `createCairnAdmin` facade (the
facade itself needs no source change). If your own markup, a form's `action="?/oldName"` or a
programmatic `fetch('/admin/...?/oldName')` call, posts to a renamed facade action by name,
change the posted `?/` action string to the new name (for example `?/saveSettings` to
`?/settingsSave`, `?/addEditor` to `?/editorAdd`, `?/mediaPurge` to `?/mediaOrphanPurge`); a
mismatched name fails at runtime as a 404 on submit, not at compile time, since the action name is
a string literal.

Every injectable-dependency bag renames from `*Deps` to `*Config` (the factory's primary bag) or
`*Options` (a secondary or per-call bag), the parameter-bag half of the same grammar: `CairnAdminDeps`
to `CairnAdminOptions`, `ContentRoutesDeps` to `ContentRoutesOptions`, `AdminActionDeps` to
`AdminActionOptions`, and `PublicRoutesDeps` to `PublicRoutesConfig` (`createPublicRoutes`'s only
bag, so it takes the primary-bag name). `createAuthGuard`'s and `createEditorRoutes`'s previously
anonymous inline option bags are now named and exported too, as `AuthGuardOptions` and
`EditorRoutesOptions`; a site typing its own wrapper around either factory can now name the
parameter instead of writing the shape out. `CairnAdminOptions.auth` also stops re-declaring
`AuthRoutesConfig`'s shape inline and references it directly (`Partial<AuthRoutesConfig>`), so the
two stay in lockstep. Every `create*` factory's return type is named and exported too:
`CairnAdminRoutes`, `ContentRoutes`, `AuthRoutes`, `EditorRoutes`, `NavRoutes`, `PublicRoutes`, and
`Renderer`, so a site can name a variable or a wrapper function's return type instead of writing the
returned shape out by hand. `makeMediaResolver` renames to `buildMediaResolver`, matching the
four-verb grammar (`build` derives pure data from an already-resolved config; `make` is retired).
The media orphan-scan result type renames from `OrphanScan` to `MediaOrphanScanResult`, and the
custom-nav icon-name type from `AdminNavIcon` to `NavIcon`. `NavLayoutEngineRef.hidden` widens from
the literal `hidden?: true` to `hidden?: boolean`, so a computed flag (a feature switch, a role
check) is as valid as the literal; the runtime already treated a falsy `hidden` as visible. The
`MakeIcon` re-export is removed from `@glw907/cairn-cms/render` (the type stays internal; it named a
site's icon factory signature with zero real callers). `ConceptUrlPolicy` is removed from the root
barrel (it stays internal, used by `defineConcept`); a site never constructed one directly, since
`defineConcept`'s own `permalink`/`datePrefix` config builds it. See
[SvelteKit](../reference/sveltekit.md).

Consumers must: replace any imported `CairnAdminDeps`, `ContentRoutesDeps`, `AdminActionDeps`, or
`PublicRoutesDeps` with its renamed `*Options`/`*Config` counterpart; replace `makeMediaResolver`
with `buildMediaResolver`; replace any imported `OrphanScan` with `MediaOrphanScanResult` and
`AdminNavIcon` with `NavIcon`; and drop any imported `MakeIcon` or `ConceptUrlPolicy` (or inline
their shape, since both stay usable as unexported internals only through their owning modules'
public factories).

`adminNav` retires entirely. `navLayout` is now the one nav seam: `CairnAdapter.editor.adminNav`,
`CairnRuntime.adminNav`, `AdminNavConfig`, `AdminNavSection`, `normalizeAdminNav`,
`filterNavByRole`, `ResolvedNavItem`, and `ResolvedNavSection` are removed, and
`ResolveNavLayoutOptions.adminNav` and `validateNavLayout`'s `hasAdminNav` ctx member go with them.
`AdminNavEntry`'s members (`label`, `icon`, `href`, `ownerOnly?`) fold into `NavLayoutEntry`, which
stops extending it and stands self-contained. The behavioral objection that kept `adminNav` alive,
that it was additive (declare one link) where `navLayout` replaced the whole sidebar, is answered
by `navLayout`'s own fallback: an engine screen a declared layout never references still lands in
the trailing fallback group, so adding one link is still a one-entry declaration. See [the
navLayout seam](../reference/sveltekit.md#the-navlayout-seam) and [Organize your admin
nav](./organize-your-admin-nav.md#omission-falls-back-hiding-is-explicit).

Consumers must: replace `editor.adminNav` on the adapter with `editor.navLayout`; a flat `adminNav`
entry becomes a top-level `NavLayoutEntry` in the `navLayout` array, unchanged in shape (`{ label,
icon, href, ownerOnly? }`), and an `adminNav` section becomes a `NavLayoutSection` (`{ label,
children }`) the same way. A site whose whole reason for `adminNav` was adding one extra link
declares that single entry in `navLayout` and nothing else: every one of cairn's own screens the
declaration omits still renders, in the same trailing fallback group the zero-config sidebar
already uses for Help. Replace any imported `AdminNavEntry`, `AdminNavSection`, `AdminNavConfig`,
`ResolvedNavSection`, or `ResolvedNavItem` type with `NavLayoutEntry`, `NavLayoutSection`,
`NavLayout`, `ResolvedLayoutSection`, or `ResolvedLayoutNode` respectively.

`@glw907/cairn-cms/admin-fields` merges into `@glw907/cairn-cms/admin-toolkit` and is removed:
two subpaths stating one charter ("primitives for a site building its own admin screens") is one
subpath. The merged toolkit's form components rename to resolve a name collision with the root
barrel's field *descriptor* arms (elsewhere in this window, `TextField`/`SelectField` become
importable at the root as content field descriptors): `TextField` becomes `TextInput`,
`SelectField` becomes `SelectInput`, and `SelectFieldOption` becomes `SelectInputOption`.
`FieldLabel` is unchanged. `OfficeList` also moves from `/components` to `/admin-toolkit`, beside
`PageHeader`, its own later generalization; both stay, since they cover different shapes, a header
primitive versus a full list-screen scaffold. `/components` also completes its per-view seam:
`VocabularyAdmin` and `WelcomeView` join the barrel, so a site on the advanced per-route mounting
can now mount every view `CairnAdmin` renders internally. See [The admin
toolkit](../reference/admin-toolkit.md#fields) and
[Components](../reference/components.md#vocabularyadmin).

Consumers must: replace any `@glw907/cairn-cms/admin-fields` import with
`@glw907/cairn-cms/admin-toolkit`; rename `TextField` to `TextInput`, `SelectField` to
`SelectInput`, and `SelectFieldOption` to `SelectInputOption`; replace
`@glw907/cairn-cms/components`'s `OfficeList` import with `@glw907/cairn-cms/admin-toolkit`.

The export rule adopted as standing doctrine: every type named in a public signature is exported
from a subpath you already import, so you can always name a value a route factory or the adapter
contract hands you instead of writing your own structural duplicate (the trap an AI coding agent
especially falls into). Roughly ninety previously unreachable types become named, documented
exports this window, closed under their own structural bodies: the field-descriptor union's
fifteen arms (`TextField`, `SelectField`, `ArrayField`, and the rest, mentioned above) from the
root barrel; the facade and action result and plan types (`TidyResult`, `DictionaryAddResult`,
`MediaBulkDeleteResult`, `MediaOrphanPurgeResult`, `MediaOrphanScanResult`,
`MediaReplacePreviewPlan`, `MediaAltPreviewPlan`) and their supporting shapes (`TidyClient`,
`TidyConfig`, `TidyConventions`, `TidyKeyProbeResult`, `FragmentTarget`, `LinkTarget`,
`InboundLink`, `UsageEntry`, `ReferenceEdge`, `MarkdownReferenceRow`, `MediaLibraryEntry`,
`ResolvedPreview`, `CookieSetOptions`, `GettingStarted`, `ResolveOptions`) from `/sveltekit` and,
where a root signature names it, the root barrel too. Three recurring anonymous inline
load-payload shapes are named and exported from `/sveltekit`: `LoginData`, `ConfirmData`, and
`EditorsData`, replacing the anonymous object literals the admin facade's `AdminData` union used
to inline for its `'login'`, `'confirm'`, and `'editors'` views. See
[Core](../reference/core.md#types), [SvelteKit](../reference/sveltekit.md#types), and [Delivery
data](../reference/delivery-data.md#types).

Consumers must: nothing. Every addition is a new named export; nothing already imported changed
shape or name.

`createSectionAction`'s `SectionActionOptions.target` now defaults to `event.route.id`, never
`event.url.pathname`: on a catch-all route the request path is attacker-chosen while the route id
isn't. `resolveDb`'s shape stays ratified unchanged (`(env: Env | undefined) => Db | undefined`);
the engine can't conjure an absent platform. A wrapped handler's `ctx.audit` call now also
defaults `action`/`entity` from the call site's own `SectionActionOptions`, so the common call
names only `entityId`/`detail` (`ctx.audit({ entityId })`); a handler that touches more than one
entity in one call can still override either verb. See
[`createSectionAction`](../reference/sveltekit.md#createsectionaction).

**Consumers must:** for any `createSectionAction`-guarded parameterized or catch-all route,
rekey the site's access map from the concrete request path to the bracket-form route id
(`/admin/posts/[id]`, never `/admin/posts/hello-world`); a map still keyed by the concrete path
stops matching, and the section fails closed, refusing every session including owner, with no
thrown error to surface the mistake. A static route's id and path are the same string, so a site
with no parameterized or catch-all section behind `createSectionAction` needs no change. Route
groups need no change either: the derived target drops group segments, so `/admin/(app)/roster`
keeps matching a map keyed `/admin/roster`.

The log-event vocabulary settles on one grammar (`area[.subject].verb_phrase`, a past-tense verb
phrase for an occurrence or a state adjective for a detected condition) and every `reason`/`scope`
value goes snake_case. Six events rename to fit: `admin.audit.sink_failed` to
`audit.sink.write_failed` (the packaged D1 sink's own persist failure, engine infrastructure, not
the action layer); `admin.action.audit_sink_failed` to `admin.action.sink_threw` (a site-supplied
sink throwing at the engine's call site); `tidy.done` to `tidy.succeeded` and `tidy.error` to
`tidy.failed` (matching the `commit.*` pattern); `media.orphan_reconcile` to
`media.orphans_reconciled` (matching `media.orphans_purged`); and `content.field_behavior_error`
to `content.field_behavior_failed`. `guard.rejected`'s `reason: 'csrf'` and
`admin.action.csrf_rejected` stay distinct on purpose: different layers, the pre-resolve guard
versus the action wrapper's own defense in depth. The media upload `reason` family goes
snake_case (`media_disabled`, `length_required`, `too_large`, `session_expired`, `access_denied`,
`unsupported_type`, `binding_missing`, `hash_collision`), reaching the upload popover's own
failure-card mapping in the same change. `github.unreachable`'s `scope` values become `shell`,
`help`, and `publish_advisories` (the documented `layout` scope never fired). `config.invalid`
gains a `scope` (`nav`, `settings`, or `vocabulary`) so its three emit sites and four call paths
stop sharing one indistinguishable log line. See [Log events](../reference/log-events.md).

**Consumers must:** update any Workers Logs saved query, alert, or dashboard filter that names
`admin.audit.sink_failed`, `admin.action.audit_sink_failed`, `tidy.done`, `tidy.error`,
`media.orphan_reconcile`, or `content.field_behavior_error` to the new name, and any filter on a
kebab-case media upload `reason` (`media-disabled`, `length-required`, `too-large`,
`session-expired`, `access-denied`, `unsupported-type`, `binding-missing`, `hash-collision`) or on
`github.unreachable`'s `scope: 'layout'` (which never fired) to the corrected snake_case value.
Nothing breaks at compile time, since these are runtime log values, not exported types.

`/admin-toolkit`'s formatters settle on one nullish rule: every display formatter, `formatMoney`,
`formatCivilDate`, `formatTimestamp`, and `formatPhone`, accepts a nullish input and takes a
`fallback?: string` option defaulting to `''`, so you never have to remember which formatter
tolerates a missing value and which throws. `formatMoney`, `formatTimestamp`, and `formatPhone`
widen their first parameter to accept `null`/`undefined` and gain the `fallback` option
(`formatPhone` gains its first options parameter, `FormatPhoneOptions`); `formatCivilDate` already
accepted a nullish date, and keeps that shape, but its `fallback` default drops from the
opinionated `'Not yet'` to `''`. `ageFromBirthdate` doesn't change: it returns `number | null`,
not a display string, and stays outside this rule on its own documented grounds. See [Admin
toolkit](../reference/admin-toolkit.md#formatts).

**Consumers must:** if you call `formatCivilDate` and relied on its old `'Not yet'` default for a
missing date, pass `{ fallback: 'Not yet' }` explicitly; otherwise that cell now renders an empty
string. This is a silent visual change, not a compile error, since `formatCivilDate`'s date
parameter was already nullable. Calls to `formatMoney`, `formatTimestamp`, or `formatPhone` with a
value that's statically `number`/`string` (never nullish) need no change.

## 0.93.0: an auth-store export, an auth-crypto export, a section-action factory, a first-publish stamp, and a CodeMirror dependency bump (non-breaking)

A new server-only export subpath, `@glw907/cairn-cms/auth-store`, re-exports the D1
editor-provisioning functions the engine's own `editors-routes` already uses: `listEditors`,
`insertEditor`, `deleteEditor`, `setEditorRole`, `removeOwnerIfNotLast`, `insertOwnerIfEmpty`,
and `demoteOwnerIfNotLast`, plus the `EditorRow` and `Role` types. Reach for it when you need to
provision or manage editors from your own server code, a setup script, or a migration, outside
the `ManageEditors` screen. See [Auth store](../reference/auth-store.md).

A second new server-only export subpath, `@glw907/cairn-cms/auth-crypto`, re-exports the token
and session-id generators, the token hash, the constant-time compare, and a new `__Host-`
cookie-naming primitive: `generateToken`, `generateSessionId`, `generateCsrfToken`,
`hashToken`, `tokensMatch`, and `cookieName`. Reach for it when you build your own login flow
for a second audience, member magic-link sessions, offer tokens, an OTP flow, so you reuse the
same cryptography the engine's own login proves in production instead of copying it by hand.
See [Auth crypto](../reference/auth-crypto.md).

The content manifest gains `ManifestEntry.publishedAt`, an ISO 8601 UTC stamp a publish action
writes once, at the commit that first lands an entry non-draft, and never overwrites or clears
afterward. An entry already non-draft and unstamped before this release stays unstamped forever,
unless you take it back to Hidden and publish it again, which stamps it as though it were newly
published; only a future transition into published stamps otherwise. A new pure helper,
`newlyPublishedEntries(before, after)` on `@glw907/cairn-cms/delivery/data`, diffs two manifests
down to the entries that just carried that transition and are still currently live, so you can
detect a first publish and fan out your own notification with no engine networking or scheduling
involved. The same subpath also re-exports `Manifest` and `parseManifest`, so you can name and
validate the manifest you fetch to build the `before`/`after` pair. See [Announce on
publish](./announce-on-publish.md).

A third new export on `@glw907/cairn-cms/sveltekit`, `createSectionAction`, packages the
form-action guard every site-built admin section otherwise hand-rolls: SvelteKit dispatches a
matched action directly, with no ancestor layout `load` run first, so a section's own POST needs
its own check. The factory composes `adminAction`'s editor resolution, CSRF, and audit contract
with an optional rate limit (degrade-to-open) and the same access-map check `requireAccess` runs,
then hands your handler its resolved database binding; authorization runs before that binding
check, so a refused session never learns whether the binding is deployed. `AdminActionEvent`
becomes generic over your platform env, defaulting to `CairnEnv` (named `AuthEnv` before the C2
breaking-window pass) so no existing call site changes, and `App.Locals` gains the `cairnAccess`
map the guard already attaches. See
[SvelteKit](../reference/sveltekit.md#createsectionaction).

The `@codemirror/*` editor dependencies moved to their latest 6.x releases within cairn's existing
version ranges (`@codemirror/state` 6.6.0 to 6.7.1, `@codemirror/view` 6.43.0 to 6.43.7, plus patch
bumps to `autocomplete`, `commands`, `language`, and `lang-markdown`). Lockfile-only.

Consumers must: nothing. All four new seams are additive, and the `publishedAt` stamp only
ever appears on a publish that happens after the upgrade.

## 0.92.0: a UA reset layer, a tightened `one-filled-action`, an exported stacked field register, and a skill-exemplar compile gate

The packaged admin sheet now ships a `base` cascade layer, so a bare form control, `dialog`,
`fieldset`/`legend`, or daisyUI's own `.list` container renders the admin's own face instead of
the browser's UA default: a bare `<textarea>` no longer falls back to the browser's monospace
font and resizes vertically only, a native `<dialog class="modal">`, the shape every cairn
dialog renders, loses Chrome's UA border frame, and daisyUI's `.list` loses its 40px
bullet-marker gutter. The dialog rule is scoped to `dialog:where(.modal)`, so a bare `<dialog>`
in your own custom admin route keeps its UA border rather than losing its only visual boundary.
Cascade layers merge by name across stylesheets, so cairn's `base` layer merges with a `base`
layer your own Tailwind build declares. Your import order decides which rule wins within that
merged layer.

The `cairn-admin-screens` skill's own reference docs are now checked against the built admin
sheet: every class token a worked example teaches has to actually compile. `form-anatomy.md`'s
two-column form-grid recipe and `exemplar-detail.md`'s divided-list row rhythm both needed a
small labeled addition to the shipped sheet's compatibility safelist so the taught recipes
render as written.

`cairn-audit`'s rendered `one-filled-action` rule now partitions a screen only at `nav`, `aside`,
and the topmost open `dialog` layer. `header`, `footer`, and `main` no longer partition it, so a
filled action in a page header and a filled action in a card beneath it now count as one surface.
The same change raises the dark theme's `.btn-active` selected-state fill to a visible lightness
step off a plain `.btn`, since the ruling pushes a segmented control's selected state onto
`btn-active` rather than `btn-primary`.

**Consumers must:** treat a screen with a filled header action and a filled card action beneath
it as a finding, and demote the non-primary fill to `btn-ghost` or `btn-outline`. Never loosen
the rule to pass a screen instead.

`FieldLabel`, `SelectField`, and `TextField` (`@glw907/cairn-cms/admin-fields`) gain a
`register: 'inline' | 'stacked'` prop. `'stacked'` puts the label on its own line preceding the
control and fills the control to its container, so a field composed inside a multi-column form
grid renders with no extra markup. **`'stacked'` is now the default**, replacing the prior
label-beside-control layout: `inline` stays available for a genuinely control-adjacent
composition, but it is now an explicit choice rather than the default. See
[The admin toolkit](../reference/admin-toolkit.md#fields) (this content's current home; the
`admin-fields` subpath these components shipped on at the time merged into `/admin-toolkit` in a
later release, see that section above).

**Consumers must:** pass `register="inline"` on any `FieldLabel`, `TextField`, or `SelectField`
call whose label-beside-control layout should survive the upgrade. Every other call renders the
new stacked default. Nothing else here requires action.

## 0.91.1: the admin sheet classes `0.91.0` dropped come back (non-breaking)

`0.91.0` dropped nineteen utility classes from the shipped admin sheet when cairn's own tree
stopped using them: the named type steps (`text-sm`, `text-xs`, `text-lg`, `text-base`,
`text-2xl`, `text-3xl`), `gap-6`, `tracking-tight`, `badge-ghost`, and ten bracketed arbitrary
sizes. Custom admin markup riding any of them rendered unstyled on `0.91.0`, with no build error
to point at it. This release restores the full set through a labeled compatibility safelist, and
the shipped sheet's class inventory is now a tested contract: a class can leave the sheet only as
a deliberate act carried in the changelog.

Consumers must: nothing, coming from `0.90.1` or earlier; the sheet again carries every class it
did there. Coming from `0.91.0`, upgrade and your custom admin screens style again with no markup
change on your side.

## 0.91.0: the `cairn-audit` design gate, and the type scale closes (non-breaking)

A new bin, `cairn-audit`, audits an admin surface against cairn's design language. Static mode
parses your components and the built admin stylesheet. Rendered mode drives Chromium against a
running admin and measures what it actually paints. Six rendered rules gate and five report only.
Run `npx cairn-audit` on your own admin routes, or skip it entirely: nothing in the engine calls
it, and rendered mode takes a Playwright dependency only when you run it. See [The `cairn-audit`
CLI](../reference/cairn-audit.md).

The grammar token inventory grows to eighteen custom properties. Every type role now carries a
paired `--cairn-type-<role>--leading` token, and a seventh role, `type-heading`, unifies the
admin's two heading recipes. A `leading-*` utility still composes over a role. See [Admin grammar
tokens](../reference/admin-grammar-tokens.md).

`npx cairn-audit norms <role>` answers from a manifest of the admin's measured norms, so you can
read a control height, a padding ratio, or a border treatment instead of inferring one from a
screenshot.

Consumers must: expect the header stack on any screen mounting `PageHeader` to render tighter, a
shorter title-to-meta gap, and its `meta` line one step smaller. No prop, type, or route contract
changed. If your own screens use the admin grammar tokens, nothing you wrote moves. The new
leading tokens match the sizes the roles already rendered at.

## 0.90.1: ListToolbar select sizing and menu-facet disclosure/a11y (non-breaking)

`ListToolbar`'s `'select'` facets now size to their own content instead of daisyUI's fixed
320px clamp, and share the `'menu'` facet's border treatment so the two read as one control
family. Both dropdown disclosures (a `'menu'` facet's option list and the overflow panel) now
show only when `dropdown-open` is present, so `aria-expanded` always matches what is visible,
and the menu options carry `role="menuitemradio"` with `aria-checked` plus a roving-tabindex
keyboard model.

Consumers must: nothing. Every change is inside `ListToolbar`'s own markup and styling.

## 0.90.0: ExpandableRow graduates, a menu filter facet, formatPhone (non-breaking)

`ExpandableRow` joins the `admin-toolkit` subpath (its second consumer, carrying three
zebra/hover/panel-depth fixes from the graduation), `ListToolbar` gains a `display: 'menu'`
filter variant, and `formatPhone` joins the toolkit's formatters. `ListToolbar`'s controls row
also recomposes to a wrapped flex row and `StatusChip`'s border demotes to a 35% currentColor
hairline; `OfficeList`'s header stack and mobile action sizing get two proven fixes; cairn's own
`ConceptList` create-button label now reads through the shared `itemNoun` grammar.

Consumers must: nothing. `ExpandableRow` and `formatPhone` are new, additive exports; the
`'menu'` display value widens an existing string union; every other change is a visual
refinement inside cairn's own admin-toolkit and built-in admin screens.

## 0.89.1: grammatical number on toolkit count lines (non-breaking)

`itemNoun` and `ItemLabel` join the admin-toolkit formatters, and `Pagination`'s and
`ListToolbar`'s `itemLabel` prop now also accepts an `{ one, many }` pair, so a count of
exactly 1 reads its singular form while every other count reads the plural. A plain-string
`itemLabel` renders exactly as before.

Consumers must: nothing. The widening is additive.

## 0.89.0: the admin toolkit, and the header idiom converges (non-breaking)

A new public subpath, `@glw907/cairn-cms/admin-toolkit`, packages the general-purpose admin
components and formatters aksailingclub-org's own admin build proved first: `PageHeader`,
`ListToolbar`, `AdminTable`, `StatusChip`, `Pagination`, `EmptyState`, and the
`formatMoney`/`formatCivilDate`/`formatTimestamp`/`ageFromBirthdate` formatters. Build your own
`/admin/` screen on it instead of hand-rolling a bespoke parallel; see [the admin-toolkit
reference](../reference/admin-toolkit.md).

cairn's own built-in admin screens now build on that toolkit too. `ConceptList`,
`CairnMediaLibrary`, `ManageEditors`, `VocabularyAdmin`, `CairnTidySettings`, `NavTree`, and
`HelpHome` all render their page header through the toolkit's `PageHeader`, converging five ad
hoc header markups into one visible idiom, and `ConceptList` and `CairnMediaLibrary` converge
their search, filter, count, table, and pager markup the same way.

Consumers must: nothing. The new subpath is additive, and the header convergence touches only
cairn's own built-in admin screens; you may notice their rhythm settle to one shape, but no prop
or route contract changed.

## 0.88.3: a blessed daisyUI safelist for the admin (non-breaking)

The admin CSS build now compiles a curated blessed set of daisyUI 5 classes no shipped cairn admin
component references yet: `stats`/`stat-*`, `table-zebra`/`table-xs`, `toast` with its placement
modifiers, the `indicator`/`status`/`join` placement and orientation modifiers, and
`badge-soft`/`badge-outline`/`badge-dash`. A site-authored admin screen can now use this vocabulary
directly; previously an unreferenced daisy class silently compiled to nothing.

Consumers must: nothing. This changes only the compiled `cairn-admin.css` output, adding classes,
never removing or restyling any that already shipped.

## 0.88.2: the template's nav wiring and docs fixes (non-breaking)

A template-and-docs window. The showcase's public header now renders `menus.primary` from
`site.config.yaml` through a root layout server load, so `/admin/nav` edits reach the rendered
site, and the tutorial teaches the same server-load shape instead of importing the config module
in a client script.

Consumers must: nothing. An existing site keeps its own chrome; the new wiring lands in newly
scaffolded or copied sites. If your site copied the showcase's header, consider adopting the same
pattern so your editors' nav changes take effect.

## 0.88.1: mermaid passthrough and real dev-backend fixtures (non-breaking)

A mermaid fence now leaves the build-time highlighter untouched with its `language-mermaid`
class intact, so a site's client-side mermaid renderer can key on the class without a marker
plugin. The `@glw907/cairn-cms-dev` seed also grew: two published fragments and real decodable
thumbnail PNGs, so the fragment picker and the Media Library both work under `vite dev`.

Consumers must: nothing. If your site added a marker plugin to recover mermaid fences, you can
delete it after this upgrade.

## 0.88.0: the access map, collapse defaults, icon overrides, attention badges (non-breaking)

A site can now declare `defineAccess(roles, map)`, one per-role map over cairn's own admin screens
and its own `/admin` routes, enforced at the route through `requireAccess` and the engine's own
gates, and read by the sidebar resolver for visibility, so the two can never say two different
things: see [Restrict admin access by role](./restrict-admin-access.md). `NavLayoutSection` gains
a declared `collapsed` starting state, `NavLayoutEngineRef` gains an `icon` override, the bundled
icon allowlist widens from nine names to twenty-seven, and a new `attention` dependency renders
per-session pending-work pills on the sidebar: see [Organize your admin
nav](./organize-your-admin-nav.md).

Consumers must: nothing. Every addition here is additive, off by default, and a site that declares
none of it sees no behavior change.

## 0.87.4: docs in the tarball, renderDocument, a help default (non-breaking)

A drop-in bump. `createRenderer` gains `renderDocument`, which also returns the page's
heading list for tables of contents; the published docs tree now ships inside the npm
tarball; and the admin's Get Help hand-off gains a default destination, cairn's hosted
editor help at `cairn.pub/help`. One behavior note: a site that never set
`editor.supportContact` now shows that hosted-help link instead of the self-serve empty
state. Keep it, set your own contact, or set an explicit empty string to restore the
prior no-link state.

## 0.87.3: the docs-register sweep (non-breaking)

A drop-in bump with no code changes. Every published docs page now conforms to the banked
register standard: two factual errors in the arm indexes corrected, marketing phrasing and
internal plan citations removed, and the editor-facing guides keep git vocabulary out. No
consumer action.

## 0.87.2: honest image dimensions and srcset (non-breaking)

A drop-in bump. Rendered managed images now carry their intrinsic `width`/`height` when the
media manifest records them, and gain an honest `srcset`/`sizes` pair when the site's
`AssetConfig` declares `transformations: true`. No consumer action; a site that post-processes
rendered `<img>` HTML should expect the new attributes. The rest of the window is gate work
inside the repo (`check:invisible-craft` coverage, two live numeric probes).

## 0.87.1: the admin polish window (non-breaking at runtime)

This polish pass: about thirty look-preserving refinements across the admin, the include line
rendered as an atomic chip naming its fragment, the folded-container chip, a preview-only boundary
cue on spliced fragment content, the publish blast-radius line, and a behavior fix. The login and
confirm pages now honor the theme cookie, so a dark-mode editor no longer gets a light login card.
No consumer action at runtime. The one type-level note:
`AdminShellData`'s public variant now carries a required `theme` member. The engine produces
that value itself, so only a site constructing the public variant by hand in TypeScript
needs to add it; neither production site does.

## 0.87.0: fragments, and the embedded-routing promise enforced

A site can now declare the reserved `fragments` concept and reuse one piece of markdown across
entries with the editor's "Include a fragment" picker. See [Reuse content across
entries](./reuse-content-across-entries.md). Opting in is additive. One thing to check before
bumping: a concept declared `routing: 'embedded'` is now genuinely non-routable, so its entries
stop resolving through `byPermalink`, prerendering through `entries()`, and appearing in
`site.all()`. If an embedded concept's entries should have public URLs, declare
`routing: 'page'` instead. If they only ever served as references or includes, you have nothing
to change, and cairn stops serving the stray URLs.

## 0.86.0: `navLayout`, the whole-sidebar seam, and the widened `navFilter`

Sites now declare `navLayout` on the adapter's `editor` group to arrange the whole admin sidebar
as one tree, mixing cairn's own screens with their own; see [Organize your admin
nav](./organize-your-admin-nav.md). It's mutually exclusive with `adminNav`, and a site that
declares neither sees no change: the sidebar renders today's default arrangement through the same
resolver.

Consumers must: nothing, for a site that declares neither `navLayout` nor a custom `navFilter`. Two
narrower changes apply if you do:

- **`AdminShellData`'s authed arm reshapes**: `customNav`, `canManageEditors` (as a nav signal),
  and `navLabel` collapse into one `nav: ResolvedNavLayout` field. Update any code that reads
  `AdminShellData`'s fields directly (no known consumer does) to the new shape.
- **A declared `navFilter` widens**: it now receives the resolved sidebar's arranged top-level
  nodes (`ResolvedLayoutNode[]`, cairn's own screens included when you declare `navLayout`), not
  just your own custom `adminNav` entries, and returns the same shape. Widen the parameter and
  return type from `ResolvedNavItem[]` to `ResolvedLayoutNode[]`; a filter that only reads an
  item's `.label` needs no other change.

Desk routes (the entry editor) also persist the sidebar at `xl` and up instead of receding it at
every width; no action needed, this changes only what renders wider than 1280px.

## 0.85.0: site-declared role vocabulary and capability levels (non-breaking)

Sites now declare their own role vocabulary instead of the two names `'owner'` and `'editor'` the
engine used to hard-code. `defineRoles` on the adapter's new `roles` member maps each of your own
role names onto one of the engine's three fixed capability levels, `owner`, `editor`, or `none` (an
authenticated identity with no engine content access); a role can also declare a `home`, the
`/admin` route it lands on. A site that declares no `roles` gets the implicit `{ owner: 'owner',
editor: 'editor' }` pair, so this release changes nothing you'd notice.

Consumers must: nothing, for an existing site. To open a larger vocabulary, declare `roles` on your
adapter with `defineRoles`, apply the `0001_roles.sql` migration the engine ships in the package
once you introduce a role name outside `owner`/`editor` (see [Configure auth and
D1](./configure-auth-and-d1.md#provision-the-d1-database) for copying it out of `node_modules`),
and augment `CairnRolesRegister` in
your `app.d.ts` if you want `locals.editor.role` narrowed to your declared names. See [the roles
reference](../reference/core.md#roles) for the full contract and [Give a role its own admin
area](./give-a-role-its-own-admin-area.md) for the worked walkthrough.

## 0.84.3: the editor lifecycle rounded out (non-breaking)

Four editor changes, no consumer action. The Publish button now shows on every entry,
resting dimmed with "Nothing new to publish" until a typed edit, a saved draft, or a new
entry gives it something to take live (it used to appear only after a save). A new
entry opens with the title typed in the create dialog and its badge reads New instead of
Published. The spellchecker knows the standard English contractions and accepts curly
apostrophes from pasted prose.

Consumers must: nothing.

## 0.84.2: the admin hang after login fixed (non-breaking)

On roughly 0.77 and later, a cold Worker isolate could wedge the whole admin for 55 minutes:
the first admin request after login canceled an in-flight GitHub token mint, and the token
cache kept serving that dead promise to every later request. 0.84.2 caches only a successfully
minted token. If editors report the browser waiting forever right after a magic-link login,
this is that bug; upgrade and redeploy.

Consumers must: nothing.

## 0.84.1: the local-dev media fix completed (non-breaking)

0.84.0's local-dev claim shipped incomplete: a second serialization site
(`writeHttpMetadata` on the returned object) still failed every `/media` read under
`vite dev`. 0.84.1 completes it, verified end-to-end on a consumer checkout, and
`cairn-media-seed` now stores each object's `Content-Type`. Upgrade straight to 0.84.1.
The `devMediaFallback` deletion note below applies as of this version.

Consumers must: nothing. Re-run `npx cairn-media-seed` after upgrading if you seeded with
0.84.0, so the stored objects gain their content types.

## 0.84.0: `cairn-media-seed` and a media route that works under `vite dev` (non-breaking)

A new bin, `cairn-media-seed`, seeds wrangler's local R2 simulator with every media-library
object from a deployed site, so local design iteration sees real images. The media delivery
route now derives plain `onlyIf` and `range` options instead of passing a `Headers` instance,
which fixes the 500 every `/media` read hit under a consumer's `vite dev`. See [the reference
page](../reference/cli-cairn-media-seed.md) and [the local design-iteration
guide](./iterate-your-design-locally.md).

Consumers must: nothing. A site that carried a dev-only `/media` fallback middleware for the
`vite dev` bug can delete it after the bump; the route works locally without it.

## 0.83.0: a `publishActions` config renders next-step links on the publish-success moment (non-breaking)

A site declares next-step links for the publish-success moment through a new `publishActions`
entry on the adapter's `editor` group, the `adminNav` grammar applied after a publish: a plain
`{label, href}` list, `href` a template string substituted with the published entry's concept and
id, optionally filtered to specific concepts. The engine validates each entry when the runtime
composes, so a blank field or an unknown concept fails the build rather than rendering a broken
link. See [the publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam).

Consumers must: nothing. `publishActions` is opt-in; a site that declares none renders the
publish-success moment exactly as it renders today.

## 0.82.1

No consumer action. Behavior notes for upgraders: the admin shell's desktop sidebar is now
`position: fixed` (no more scroll drift, and it stays open when navigating to deep custom-nav
routes like `/admin/club/events`); `adminAction` no longer requires an audit emit from a handler
that returns SvelteKit's `fail()` before mutating (a handler that writes and then rejects must
still emit); the `/ambient` augmentation now types `App.Locals.auditSink`.

## 0.82.0

No consumer action required. The release adds the admin extension surface for sites that
build their own `/admin/` screens: the `admin-fields` subpath (`SelectField`, `TextField`,
`FieldLabel`), the `OfficeList` shell in `components`, the `adminAction` wrapper and the
per-request `navFilter` dependency in `sveltekit` (also reachable through `CairnAdminDeps`),
and one-level `adminNav` sections. All additive; existing sites build unchanged.

## 0.81.0

No consumer action required. The release adds the renderer's `remarkPlugins`/`rehypePlugins`
seam, default-on table scrolling (`tableScroll: false` opts out), sitemap `extraRoutes`,
`CairnHead`'s `titleTemplate`, and the chassis/theme example structure with three ported
example themes. All additive; existing sites build unchanged.


