# SvelteKit (`@glw907/cairn-cms/sveltekit`)

This subpath is chartered, not split: everything a SvelteKit site wires into its routes,
factories, wrappers, guards, and the data types they exchange. The canonical wiring is the single
mount: `createCairnAdmin` serves every admin view through one `load` and one `actions` record,
which a site's catch-all `/admin/[...path]` route re-exports, plus the `Handle` that guards
`/admin` from `hooks.server.ts`. The two files and the composer behind them are in
[the canonical admin mount](./admin-routes.md). The per-surface factories the facade wraps
(`createAuthRoutes`, `createContentRoutes`, and friends) stay public as the advanced seam for a
site that mounts routes by hand. An admin Svelte component belongs on
[`/components`](./components.md) instead, even though a site also wires it into a route: this
subpath is server logic only, never a `.svelte` file.

```ts
import { createAuthGuard, createCairnAdmin, healthLoad } from '@glw907/cairn-cms/sveltekit';
import type { AdminData, AdminShellData, ListData, EditData } from '@glw907/cairn-cms/sveltekit';
```

The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate checks every
name here against them.

---

## The event shape

Stability tier: Extension API.

```ts
import type { Editor, AccessMap, Backend } from '@glw907/cairn-cms';
import type { CairnEnv, CookieJar, PlatformContext, AdminActionAuditSink } from '@glw907/cairn-cms/sveltekit';

interface CairnEvent<Env = CairnEnv> {
  url: URL;
  request: Request;
  params: Record<string, string>;
  route: { id: string | null };
  cookies: CookieJar;
  setHeaders(headers: Record<string, string>): void;
  locals: {
    cairnEditor?: Editor | null;
    cairnBackend?: Backend;
    cairnAuditSink?: AdminActionAuditSink;
    cairnAccess?: AccessMap;
  };
  platform?: PlatformContext<Env>;
}
```

Every load, action, and guard helper on this subpath reads one structural event shape,
`CairnEvent<Env = CairnEnv>`. A real SvelteKit `RequestEvent` or `ServerLoadEvent` carries every
member here and more, and the engine never imports a site's generated `App.*` ambient types, so
any kit server event satisfies it with zero casts. `params` and `route` end the anti-idiom of
reading route identity out of a form body: a real kit event always carries both, and a seam like
[`createSectionAction`](#createsectionaction)'s `SectionActionOptions.target` derives from
`event.route.id`. `route.id` is nullable because kit's own is: [`createAuthGuard`](#createauthguard)'s
`Handle` genuinely runs for an unmatched request (a 404, a static asset), where kit reports
`null`; a matched `load` or form action always sees a real route id. `cookies` and `setHeaders`
are always present on a real kit server event.

`locals` carries four optional keys, each sharing the flat `cairn` prefix so a grep for one name
finds every engine read in any repo: `cairnEditor` (the session
[`createAuthGuard`](#createauthguard) resolved), `cairnBackend` (a dev or test double for the
content store; a production request leaves it absent and the real GitHub provider connects),
`cairnAuditSink` (a site's optional [`AdminActionAuditSink`](#adminactionauditsink), wired through
`adminAction`'s audit contract), and `cairnAccess` (the site's declared [access
map](./core.md#access-map), attached by the guard alongside `cairnEditor`).

`Env` defaults to [`CairnEnv`](#cairnenv): a compile-only fixture proves every factory on this
page assigns clean into a site's own generated route event, under a realistic compliant
`App.Platform['env']` (`CairnPlatformBindings & CairnMediaBindings` plus a site binding), with
zero casts. A factory whose own binding needs are wider instantiates `CairnEvent<Env>` with its
own unconstrained, defaulted type parameter instead ([`createSectionAction`](#createsectionaction)
is the one example on this page).

## Single-mount admin (recommended)

The facade and its two guard helpers: the one path most sites wire.

### `createAuthGuard`

Stability tier: Scaffold API.

```ts
declare function createAuthGuard(opts?: AuthGuardOptions): ({ event, resolve }: HandleInput) => Promise<Response>;
```

Build the SvelteKit `Handle` that gates every `/admin/**` path and hardens the admin response
headers. Wire it in `hooks.server.ts`. A site with its own hook keeps it by sequencing the guard
last, so the site hook sees every request and the guard owns admin gating.

`opts.roles` is the site's declared [role vocabulary](./core.md#roles) (`defineRoles`, a [core](./core.md)
export); omitted, the guard resolves every session against the implicit owner/editor pair, so a
zero-config site sees no behavior change. The guard resolves capability once per request and
attaches it to `locals.cairnEditor.capability`, so every downstream load and action reads it with
no re-derivation.

`opts.access` is the site's declared [access map](./core.md#access-map) (`defineAccess`, a
[core](./core.md) export). Omitted, the engine's own screens and a site's own
[`requireAccess`](#requireaccess) calls read differently. The engine's own screens (gated through
`requireEngineAccess`'s `canReach` check) stay open to any editor-capability session, so a
zero-config site sees no behavior change there. A `requireAccess` call on a site's own route reads
the opposite way: with no map at all, it has no opinion on any target and refuses every session,
owner included; see [`requireAccess`](#requireaccess) below for the reasoning. The guard attaches
the map internally to `locals.cairnAccess`, alongside `locals.cairnEditor`, so `requireAccess`
needs no extra argument.

`opts.includeSubDomains` controls the `includeSubDomains` directive on the
`Strict-Transport-Security` header the guard attaches to each admin response it returns. `max-age`
is always sent there; the admin surface is the one place the engine has standing to insist on
HTTPS. The guard's rejection pages and its login redirect send no `Strict-Transport-Security` at
all, since neither receives this option and a weaker header would replace a pinned policy rather
than restate it.
Omitted or `false`, the header carries only `max-age`, so a zero-config site sees no behavior
change and does not pin any sibling subdomain to HTTPS. Set it to `true` to pin the whole domain,
a decision that belongs to whoever owns it.

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from './lib/cairn.config.js';
import { theme } from './theme-handle.js';

export const handle = sequence(theme, createAuthGuard({ roles }));
```

### `createCairnAdmin`

```ts
declare function createCairnAdmin(runtime: CairnRuntime, deps?: CairnAdminOptions): {
  load: (event: CairnEvent) => Promise<AdminData>;
  actions: Record<string, (event: CairnEvent) => Promise<unknown>>;
  shellLoad: (event: CairnEvent) => Promise<{ shell: AdminShellData }>;
};
```

`createCairnAdmin` exports its return type by name as [`CairnAdminRoutes`](#types).

The single-mount admin facade. It instantiates the auth, content, editor, and nav route
factories over the composed runtime and serves every admin view through one `load`, so a site
mounts the whole admin with a single catch-all route instead of a tree of per-route files. The
load parses `event.url.pathname` internally and dispatches: an unrecognized path is a 404, the
public login and confirm views return bare page data, and every authed view returns its own `page`
data. `/admin`'s landing is role-aware: a role with a declared `home` (see [Roles](./core.md#roles))
redirects there; absent a `home`, an owner- or editor-capability role lands on the first concept's
list as before, and a none-capability role lands on the calm `'welcome'` view. The nav view is a
404 unless the runtime's `navMenu` is set, composed from the adapter's
[`nav` member](./core.md#nav-adapter-editor-member).

`shellLoad` is the shared `/admin/+layout.server.ts` load. It returns the lean shell payload that
[`CairnAdminShell`](./components.md#cairnadminshell) renders: the streamed pending count for an authed
path, and a bare payload that returns early for the public login and auth paths. The chrome loads
once for the whole `/admin/**` subtree rather than per view. Stability tier: Extension API, a
versioned seam a site's own `/admin/` route depends on.

`deps.auth.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass no deps. The
showcase reads through a fake GitHub backend in development, which rides `event.locals.cairnBackend` from a
fenced dev handle rather than through a dep.

`actions` covers the full admin action vocabulary. Each named action parses the pathname the
same way the load does, throws a 404 when the parsed view does not support it, synthesizes the
params the wrapped action reads, and delegates:

| Action | Valid views | Delegates to |
| --- | --- | --- |
| `request` | login | the magic-link request |
| `confirm` | confirm | the token confirm |
| `logout` | any parsed view | the session logout |
| `create` | list | the entry create |
| `save` | edit, nav | the entry save, or the nav save (404 without a `navMenu`) |
| `settingsSave` | settings | the tidy settings commit |
| `vocabularySave` | vocabulary | the tag-vocabulary commit, with the cross-branch delete gate failing closed |
| `upload` | edit | the entry-scoped media ingest, staged for the next save |
| `publish` | edit | the entry publish |
| `discard` | edit | the pending-edit discard |
| `rename` | edit | the entry rename |
| `dictionaryAdd` | edit | the personal-dictionary add |
| `tidy` | edit | the language-model tidy copy-edit |
| `delete` | edit, list | the entry delete (id from the path, or from the form body on a list) |
| `revert` | history | the entry revert-as-draft, from a listed prior publish |
| `mediaDelete` | media | the committed asset's safe delete |
| `mediaUpdate` | media | the committed asset's metadata edit (display name, slug, default alt) |
| `mediaUpload` | media | the media-scoped ingest, the same upload the edit view's `upload` runs |
| `mediaLibraryUpload` | media | the Library-direct upload, committed in the same step |
| `mediaReplacePreview` | media | the replace-in-place preview (plans the rewrite, commits nothing) |
| `mediaReplace` | media | the replace-in-place apply, one atomic commit |
| `mediaAltPreview` | media | the alt-fill preview (plans the propagation, commits nothing) |
| `mediaAltPropagate` | media | the alt-fill apply, one atomic commit |
| `mediaBulkDelete` | media | the multi-select bulk delete, skip-and-report |
| `mediaOrphanScan` | media | the on-demand orphan scan |
| `mediaOrphanPurge` | media | the irreversible orphan byte purge |
| `publishAll` | index, list, edit, history, editors, nav, media, settings, vocabulary, help (every authed view) | the site-wide publish |
| `editorAdd`, `editorRemove`, `editorSetRole` | editors | the owner-gated editor management |

The table above summarizes each view's actions in one line; the Media Library's own vocabulary
carries more detail worth stating once. `mediaDeleteAction` safe-deletes a committed asset: it
rechecks usage against a fresh server-side index at delete time, refuses an in-use asset
(`MediaDeleteRefusal`) unless the form carries the typed-slug override, then commits the
`media.json` row removal before deleting the R2 object so a mid-failure leaves a benign orphan
rather than a broken delivery. `mediaUpdateAction` edits an asset's display name, slug, and default
alt in one row commit with no reference rewrite (the resolver keys on the hash), refusing a bad
slug with `MediaUpdateFailure`. `mediaLibraryUploadAction` is `uploadAction`'s Library-direct
sibling: like `uploadAction`, it is a raw-body JSON endpoint that stores the uploaded bytes in R2
and derives the `UploadResult`'s fields server-side, but it also commits the derived `media.json`
row to the default branch in the same step, so an author can add an asset from the Media Library
without an entry to ride. Both derive every committed field server-side and trust no client-posted
record; a re-upload of identical bytes is an idempotent no-op.

The replace-in-place pair swaps one asset for another across the published corpus.
`mediaReplacePreviewAction` is a display-only fetch endpoint (the upload's `X-Cairn-CSRF` header
transport): it plans the rewrite of every entry that references the old asset and returns a
`MediaReplacePreviewPlan` (the affected entries with their per-reference diff, the affected count,
and a report-only cross-branch delta), committing nothing. `mediaReplaceAction` re-derives that
plan from a fresh read, gates every replace behind a typed-slug confirm (`MediaReplaceFailure` on a
wrong or missing confirm), and rewrites every referencing entry plus the new `media.json` row in
one commit; it performs no R2 write, since the new bytes are already stored and the old asset's row
is kept. Both fail closed on an unverifiable usage read.

The alt-propagation pair pushes an asset's default alt across the same corpus.
`mediaAltPreviewAction` plans the fill over that header transport and returns a
`MediaAltPreviewPlan` that sorts each placement into a will-fill bucket (an empty alt), a
customized bucket (a hand-written alt kept unless the editor opts in), or a decorative-hero bucket
(left alone). `mediaAltPropagateAction` re-derives the plan from a fresh read, fills the empty alts
(and the customized ones when the `overwrite` opt-in is set), and commits only the entries it
changes in one commit. It never writes `media.json`, never gates on a typed slug, and never touches
a decorative hero.

The destructive trio (`mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction`)
clears assets and stored bytes in bulk, registered above as `mediaBulkDelete`, `mediaOrphanScan`,
and `mediaOrphanPurge`. `mediaBulkDeleteAction` is the single safe-delete gate applied per item over
a selection: it builds one strict cross-branch usage index for the whole batch, deletes the assets
nothing references, and skips any still in use, reporting them in the returned
`MediaBulkDeleteResult` (its `deleted`, `skipped`, and `failed` arrays) rather than force-deleting.
The row removals land as one commit before the R2 objects are deleted, so a bulk delete is
reversible from git history, the same delete-order the single safe-delete uses.
`mediaOrphanScanAction` runs a storage reconcile plus a strict usage read and returns the
`MediaOrphanScanResult` projection: `orphanedBytes` (stored keys with no manifest row and no
reference anywhere across `main` and every open branch) and the broken-reference rows (manifest
hashes whose bytes are gone). A branch-only upload's bytes are excluded from `orphanedBytes`, since
the branch that uploaded them references them. `mediaOrphanPurgeAction` is the one irreversible
media action: it deletes the raw R2 bytes, which carry no git history, so it gates on a
typed-count confirm (the number of files). At action time it re-derives the orphan set fresh and
re-checks the strict usage index, so a key that gained a manifest row or a new branch reference
since the scan is skipped, never purged; the `MediaOrphanPurgeResult` reports `purged`,
`skippedClaimed`, and `failed`. All three fail closed: an unverifiable cross-branch usage read
refuses the whole batch (503) and commits nothing.

All ten of these media actions (`mediaDeleteAction`, `mediaUpdateAction`,
`mediaLibraryUploadAction`, `mediaReplacePreviewAction`, `mediaReplaceAction`,
`mediaAltPreviewAction`, `mediaAltPropagateAction`, `mediaBulkDeleteAction`,
`mediaOrphanScanAction`, `mediaOrphanPurgeAction`) are internal `createContentRoutesInternal`
members, reachable through no package subpath. `createContentRoutes` doesn't return them, and
`createCairnAdmin` is the only public seam that mounts them.

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '$lib/cairn.server.js';
export const prerender = false;
export const load = admin.load;
export const actions = admin.actions;
```

The matching `+page.svelte` mounts [`CairnAdmin`](./components.md#cairnadmin) against the
discriminated `AdminData` the load returns.

### `requireSession`

Stability tier: Extension API.

```ts
declare function requireSession(event: CairnEvent<CairnEnv>): Editor;
```

Return the session the guard already resolved, or throw a redirect to `/admin/login`. Call it at the
top of a protected `load` or action that needs the signed-in editor. Its parameter is
[`CairnEvent`](#the-event-shape), so any real kit event that carries the guard's editor satisfies it.

```ts
import { requireSession } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireSession(event);
  return { displayName: editor.displayName };
};
```

### `requireOwner`

```ts
declare function requireOwner(event: CairnEvent<CairnEnv>): Editor;
```

Return a signed-in owner, or throw a 403 for an editor. Guards the management surface, such as the
editor list, where only an owner may act. Its parameter is the same
[`CairnEvent`](#the-event-shape) `requireSession` takes, so a custom `/admin/` route's standard
load event satisfies it: a hand-built admin screen gates itself with one call.
Stability tier: Extension API.

```ts
import { requireOwner } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  requireOwner(event);
  return { canManage: true };
};
```

### `requireEditor`

Stability tier: Extension API.

```ts
declare function requireEditor(event: CairnEvent<CairnEnv>): Editor;
```

Return a signed-in owner- or editor-capability session, or throw a 403 for `none`. The engine's
own content routes and every admin-mutation surface call this instead of `requireSession`, the
switch that makes `none` capability real.

**The none contract, a documented guarantee:** a none-capability session still authenticates and
carries a populated, typed `locals.cairnEditor`; it passes through the
[`CairnAdminShell`](./components.md#cairnadminshell) custom-route seam untouched. Only the
engine's own content and roster surfaces refuse it with `requireEditor`/`requireOwner`. A
site-mounted admin route gates itself: nothing about `none` blocks the route from resolving, so a
custom route that wants a `none`-capability role to reach it (an instructor's own class roster,
say) needs no extra wiring, and one that wants to refuse it calls `requireEditor`, `requireOwner`,
or its own capability check on `event.locals.cairnEditor.capability`.

```ts
import { requireEditor } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireEditor(event);
  return { displayName: editor.displayName };
};
```

### `requireAccess`

Stability tier: Extension API.

```ts
declare function requireAccess(event: CairnEvent<CairnEnv>, target?: string): Editor;
```

The one-line authorization story for a site's own custom route: the session the guard already
resolved, checked against the site's declared [access map](./core.md#access-map) (attached to
`locals.cairnAccess` by [`createAuthGuard`](#createauthguard)), or a 403. `target` defaults to
`event.route.id`, never `event.url.pathname`: on a catch-all route the request path is
attacker-chosen while the route id is not, the same reasoning
[`createSectionAction`](#createsectionaction)'s `SectionActionOptions.target` follows, so a
route's load and its own POST action agree on what they are checking. The derived default drops
route-group segments (`/admin/(app)/roster` reads as `/admin/roster`), so a map stays keyed by
URL shape, and resolves a parameterized route id verbatim (`/admin/posts/[id]`), so a map keyed by
its prefix still matches; a declared `target` is used exactly as given, never normalized. So the
common call, `const editor = requireAccess(event);`, is still the whole authorization story for a
route that opts into the map. Every denial, mapped or unmatched, emits `auth.access.denied` (see
[log events](./log-events.md)) with the editor's email, role, and the resolved (normalized)
target.

The unmatched case, the map has no rule at all for `target`, refuses every session with a 403,
owner included: the helper's contract is "this route opted into the map and the map has no
opinion on it," a misconfiguration made loud rather than an access decision, so `canReach`'s
owner bypass doesn't apply here. A route that wants the zero-config any-editor behavior shouldn't
call this helper for that path; call `requireSession` or `requireEditor` instead.
[`canReach`](./core.md#canreach-hasaccessrule) is also exported directly, for conditional UI
inside a page.

```ts
// src/routes/admin/club/money/+page.server.ts
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireAccess(event); // denies every role the map does not name for this path
  return { displayName: editor.displayName };
};
```

### Refusal channels

The admin action surface refuses a request through one of three developer-facing shapes,
depending on which helper does the refusing and whether the refusal can answer the very request
that raised it.

`requireOwner`, `requireEditor`, and `requireAccess` all perform authorization: a signed-in session
either carries the required role or capability, or the call throws. `requireSession` and
`adminAction` perform authentication only, establishing who the caller is without deciding what
they may reach: `requireSession` throws only for a session that was never resolved at all, and
`adminAction`'s own checks (identity plus CSRF) let a `none`-capability editor's session pass
through unchanged and reach the wrapped handler. All five throw
SvelteKit's own `error()` (a 403) or `redirect()` (a 303 to `/admin/login`), whether called
directly inside a hand-rolled load or action, or underneath `adminAction`'s wrapper. SvelteKit
recognizes both as its native thrown shapes and renders the correct status through the nearest
`+error.svelte`, or follows the redirect, with no site code required to translate either one, and
no `handleError` mapping to write.

`fail()` is the default for every refusal that answers the request that raised it, and it is
carried by a precise `ActionFailure<T>` typed to the failing screen's own shape (`SaveFailure`,
`DeleteRefusal`, `CreateFailure`, `NavSaveFailure`, and the rest documented against
[`createContentRoutes`](#createcontentroutes) below), never a bare `ActionFailure<unknown>`. Every
built-in content, media, settings, vocabulary, and nav action's own validation and commit-conflict
refusal answers this way, and so does
[`createSectionAction`](#createsectionaction)'s own authorization, rate-limit, and
database-binding branches. The result renders as inline form state on the page that submitted it:
the editor's unsaved input survives in the returned payload, and nothing navigates away. A site's
own custom action should reach for the same shape, through `createSectionAction` or a hand-rolled
`fail(...)`, rather than a throw, for a refusal its own route can answer in place.

This split from the two throwing helpers above is deliberate, not an inconsistency to converge.
`fail(...)` is the shape for the 403 and 500 branches specifically so the editor's unsaved input
survives on screen rather than navigating away to an error page; the read side is closed instead,
by requiring `requireAccess` in the section's own `load`, so reads and writes share one
fail-closed predicate.

A site that defines its own `handleError` for some other reason should know it **replaces**
SvelteKit's own default hook (a `console.error` of every server error) rather than layering on top
of it. Log first, unconditionally, or the site loses all default server-error logging silently:

```ts
import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error }) => {
  console.error(error);
};
```

Nothing in this reference requires a site to define one.

A small, closed set of refusals can't answer in place, because the request that surfaces them
didn't originate on the page the refusal concerns: an expired or already-consumed sign-in link
(the confirm page bounces to the login page), and publish-all's outcome (posted from the topbar
on any screen, so it always lands on the first concept list the session can reach rather than
where it was raised). Publish-all carries three possible codes: two validated outcomes
(`nothing_to_publish`, `publish_conflict`) and one unexpected-fault code (`publish_failed`), so an
unexpected commit failure stays on this redirect channel rather than escaping to `viewAction`'s
own generic `fail()`, which the `/admin` landing's own redirect would silently discard before it
could render. The `/admin` landing relay itself forwards an arriving code on to the route it
redirects to. These three sites, and only these three, carry a bounded internal code on `?error=`,
resolved server-side against a small closed vocabulary and rendered as fixed engine copy. An
unrecognized value resolves to nothing, so a crafted query string carries no meaning past the
resolver, and no site code ever writes or reads a code directly. The login and confirm pages, and
`listLoad`'s own publish-all outcome banner, treat the resolved value as a boolean flag: a fixed,
engine-authored sentence shows or doesn't, never the query value itself.

One further channel exists inside the engine and is never written by a site directly:
[`createAuthGuard`](#createauthguard) itself refuses at the `Handle`, before any route's own load
or action runs, returning a raw, branded `Response` for a CSRF, origin, HTTPS, missing-binding, or
dev-backend-in-production failure (the last, a 503, refuses when `CAIRN_DEV_BACKEND` is set in a
deployed runtime, so a build that leaked its dev fixture fails loud rather than serving it). This
channel is why `adminAction`'s own CSRF check is defense-in-depth: the guard's pre-routing refusal
already covers every unsafe POST under `/admin/**` whose content type is one of the three a
browser can send cross-origin with no CORS preflight (`application/x-www-form-urlencoded`,
`multipart/form-data`, `text/plain`), not literally every unsafe POST; a JSON POST is not
screened by this check. That is not a gap in practice: those three are exactly the content types
a browser can forge cross-origin without a preflight the site never answers, and SvelteKit itself
rejects a non-form-content-type action POST with a 415 before the action ever runs. It does mean
this section is not license to hand-roll a JSON admin endpoint under the same protection. So
`adminAction`'s own check is rarely the one that actually fires.

### `adminAction`

Stability tier: Extension API.

```ts
declare function adminAction<T>(
  handler: (args: { event: CairnEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
  deps?: AdminActionOptions,
): (event: CairnEvent) => Promise<T>;
```

Wrap a custom admin action's handler: the admin-scoped server helper a site's own `/admin/` form
action calls for the engine's editor and audit contract.
`createAuthGuard` already verifies the double-submit CSRF token on every unsafe POST under
`/admin/**`, custom routes included, before any route's own action runs, so `adminAction`'s own CSRF
check is defense-in-depth, not the sole gate; its real job is resolving the signed-in editor as a
typed `ctx.editor` and requiring an audit emit for a mutating action, a hook the engine has no other
seam for.

`adminAction` authenticates and verifies CSRF; it performs no authorization of its own. A
`none`-capability editor's session still passes both checks and reaches the wrapped handler
unchanged. Add [`requireAccess`](#requireaccess) inside the handler, or build the action on
[`createSectionAction`](#createsectionaction), for a capability check.

In order, fail-closed at every step: (1) `event.locals.cairnEditor` must be populated, else a redirect
to `/admin/login`, matching [`requireSession`](#requiresession) exactly (a lapsed session needs the
login page, not an error page); (2) a valid `X-Cairn-CSRF` header clears this step outright, the
same witness [`createAuthGuard`](#createauthguard) checks first; only with no valid header must the
posted `csrf` field match the CSRF cookie, constant-time, else SvelteKit's own `error(403, ...)`,
rendered through the nearest `+error.svelte` (a fetch-based custom action that sets the header and
posts `FormData` with no `csrf` field still passes this step); (3) the handler runs once, reading
`event.request.formData()` exactly once so the handler never
re-reads an already-consumed body; (4) a handler that returns normally (its request succeeded) must
call `ctx.audit` at least once. A successful mutating action that emits zero audit records throws
`UnauditedActionError(500, ...)` in dev (`esm-env`'s `DEV`, overridable through `deps.isDev` for a
test) and logs `admin.action.unaudited` in production, since an unaudited state change is a defect
here but should never 500 a live site. A handler that returns SvelteKit's `fail()` (an
`ActionFailure`, detected with `@sveltejs/kit`'s own `isActionFailure`) is exempt from the required-audit
check: a rejected request mutated nothing, so it owes no audit, and a validation reject never needs
a spurious `ctx.audit` call just to satisfy the wrapper. The exemption assumes the handler rejects
before mutating; a handler that writes and then returns `fail()` must still emit its own audit,
since nothing rolls its writes back and the wrapper can't see them. Every emit logs `admin.action.audited` (see
[log events](./log-events.md)) and, when the site sets one, forwards the record to
`event.locals.cairnAuditSink`.

Both preceding authentication branches throw one of SvelteKit's own recognized shapes (see [Refusal
channels](#refusal-channels)): the missing-editor redirect and the CSRF `error(403, ...)` carry
their status to the browser directly, and neither needs a site `handleError` mapping. Only the
dev-only required-audit check throws [`UnauditedActionError`](#types), which SvelteKit doesn't
recognize as one of its own thrown shapes; it fires only under `esm-env`'s `DEV`, so it's a
build-time author signal, never a production response, and it too needs no `handleError` mapping.
A site building on [`createSectionAction`](#createsectionaction) inherits `adminAction`'s two
authentication branches with the same no-mapping guarantee; only that factory's own authorization,
rate-limit, and binding branches return `fail(...)` instead.

[`AdminActionAuditSink`](#adminactionauditsink) is deliberately synchronous and fire-and-forget: it
returns `void`, and `ctx.audit` never reads or awaits that return value. The engine holds the
seam's fail-open promise at its own call site, not merely by the sink's own discipline, and it
holds it against both failure shapes: a sink that throws synchronously, and a sink that returns a
rejecting promise. The rejecting case is reachable in practice, not theoretical: the seam's
`(record) => void` type admits an async function through void-return bivariance, the same pressure
that writes a sink following the `waitUntil` advice in [add a custom admin
screen](../extend/add-a-custom-admin-screen.md#wire-the-auditsink). `ctx.audit` catches the
synchronous throw directly and attaches a fire-and-forget rejection handler to a promise-returning
result, so the handler's own result still returns exactly as if the sink had succeeded either way,
and the failure logs `admin.action.sink_threw` (see [log events](./log-events.md)) rather
than disappearing. The catch rethrows SvelteKit's own `redirect()`/`error()` untouched instead of
logging them: both are plain classes, not `Error` instances, so a sink built on one of those
control-flow primitives (a hand-rolled auth check inside a sink, say) is never swallowed into a
log line the site never sees. This is a distinct event from `createD1AuditSink`'s own
`audit.sink.write_failed`: that one covers the packaged sink's internal persist failure, which the
packaged sink already catches before it can reach the engine's call site, while
`admin.action.sink_threw` covers any sink, hand-rolled or otherwise, that throws or rejects
at the point `ctx.audit` invokes it.

```ts
// src/routes/admin/club/events/[id]/+page.server.ts
import { adminAction } from '@glw907/cairn-cms/sveltekit';
import { db } from '$lib/club/db.js';

export const actions = {
  approve: adminAction(async ({ form, ctx }) => {
    const id = String(form.get('id'));
    await db.signups.approve(id);
    ctx.audit({ action: 'approve', entity: 'signup', entityId: id });
    return { ok: true };
  }),
};
```

### `createD1AuditSink`

Stability tier: Extension API.

```ts
declare function createD1AuditSink(
  db: D1Database,
  waitUntil: ((promise: Promise<unknown>) => void) | undefined,
): AdminActionAuditSink;
```

The packaged implementation of the [`AdminActionAuditSink`](#adminactionauditsink) seam:
persists every audit record `adminAction` and `createSectionAction` emit into one `audit_log`
table, opt-in the same way the auth migrations are.

Calling it directly, with a record your own site code composes rather than one `ctx.audit`
produced, is supported: the sink has no admin-specific behavior, only a generic
`{ actor, action, entity, entityId?, detail? }` shape bound into the columns of the same name. A
domain event, a roster change, a season rollover, anything append-only worth a durable trail,
persists the same way an admin action's audit does. `actor` is the acting identity for that row
and need not be a cairn editor; namespace your action names (`roster.add`, not a bare `add`) so a
domain row stays distinguishable from an admin-action row in the shared table. The fail-open,
truncation, and `waitUntil` promises documented below apply to a direct call exactly as they do to
one `adminAction` makes.

A direct call logs nothing on the way in. `admin.action.audited` is `adminAction`'s own record of a
`ctx.audit` emit, so a row your site code writes leaves no log line unless the insert fails, which
logs `audit.sink.write_failed` the same as any other. Log the event yourself if you want the trail
in Workers Logs as well as the table.

`db` can be any D1 binding, not only `AUTH_DB`. A separate database, `your-site-audit` in the
example below, keeps audit writes from contending with session and token lookups, since D1
serializes writes per database, and the `hooks.server.ts` example below binds a dedicated
`AUDIT_DB` rather than reusing `AUTH_DB`.

`wrangler d1 migrations apply` reads a database's migrations from that `d1_databases` entry's own
`migrations_dir`, `./migrations` by default. Give the audit database its own `migrations_dir`,
distinct from the auth database's: every entry that leaves `migrations_dir` unset resolves to that
same default directory, so copying `0002_audit.sql` next to the auth migrations and applying it to
the audit database applies the auth migrations there too.

```jsonc
"d1_databases": [
  {
    "binding": "AUTH_DB",
    "database_name": "your-site-auth",
    "database_id": "<the id wrangler d1 create printed>"
  },
  {
    "binding": "AUDIT_DB",
    "database_name": "your-site-audit",
    "database_id": "<the id wrangler d1 create printed>",
    "migrations_dir": "migrations/audit"
  }
]
```

```bash
mkdir -p migrations/audit
cp node_modules/@glw907/cairn-cms/migrations/0002_audit.sql migrations/audit/
npx wrangler d1 migrations apply your-site-audit --local
npx wrangler d1 migrations apply your-site-audit --remote
```

`0002` is only the number the package ships it under. Only the ordering relative to any other
file already in `migrations/audit/` is load-bearing, not the filename. The table is append-only
and this package prunes nothing, so a site that expects real traffic should retire old rows
itself, on a schedule (a
[Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/)) or by
hand:

```bash
npx wrangler d1 execute your-site-audit --remote --command "DELETE FROM audit_log WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')"
```

The comparison has to use the same `strftime` expression the column's own default uses, not
`datetime('now', ...)`: SQLite compares `TEXT` columns byte for byte, and an ISO string's `T`
(`0x54`) sorts after a space (`0x20`) at the same position, so comparing against a
`datetime('now', ...)` value would silently stop pruning the oldest rows at the boundary day.

A screen reading the table back right after a write can miss the row that caused it: the insert
may still be in flight behind `waitUntil` when the response renders, and D1's own read
replication can serve a replica that has not received the write yet. A screen that must show its
own just-made row needs
[first-primary bookmark routing](https://developers.cloudflare.com/d1/best-practices/read-replication/#bookmarks),
not a plain read.

The table carries `id`, `actor`, `action`, `entity`, `entity_id`, `detail`, and a `created_at` the
database populates as an ISO 8601 UTC string (`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`), a column
read by a human in a query, not by the engine.
[`formatTimestamp`](./admin-toolkit.md#formattimestamp) doesn't apply to this column: it expects
the space-separated `"YYYY-MM-DD HH:MM:SS"` shape SQLite's `datetime('now')` produces, and swaps
in the `T` and `Z` itself. This column's value already carries both, so render it directly;
`new Date(createdAt)` already reads it correctly as UTC.

`createD1AuditSink` requires `waitUntil` and takes `undefined` explicitly, not optionally: an
optional parameter would make the shortest call the one that silently drops the insert when the
isolate tears down before it settles, so omitting it (typically when no `event.platform.ctx` is
reachable) has to be a decision the caller makes on purpose, with the drop risk understood.

The sink is fail-open, the same convention as [a hand-rolled one](../extend/add-a-custom-admin-screen.md#wire-the-auditsink):
it returns synchronously, before the insert settles, so a persist failure never fails the audited
action, and a rejected insert logs `audit.sink.write_failed` (see [log events](./log-events.md))
carrying the whole truncated record plus the error, since the audited action already completed and
this is the only remaining trace of that row. Every bound field truncates to a documented maximum
before binding, so an oversized `detail` (the one field a handler composes freely) cannot suppress
its own audit row by failing the insert: `actor` to 320 characters, `action` to 100, `entity` to
100, `entityId` to 200, `detail` to 500.

**A site wiring this sink should also configure [`createSectionAction`](#createsectionaction)'s
`rateLimit`.** `createSectionAction` audits every refusal, not only a successful action, and its
check order runs authorization before any database-binding resolution, so a session the access map
refuses still produces an audit row before the section's own binding is ever read. Persisting that
trail with no rate limit configured lets a refused caller cheaply fill the table.

<!-- snippet-check-skip: reads App.Platform (env, ctx.waitUntil), which only the site's own app.d.ts declares -->
```ts
// src/hooks.server.ts
import { createD1AuditSink } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

const wireAuditSink: Handle = ({ event, resolve }) => {
  const db = event.platform?.env.AUDIT_DB;
  const ctx = event.platform?.ctx;
  // The bind is required: an unbound `ctx.waitUntil` throws "Illegal invocation" in workerd.
  const waitUntil = ctx ? ctx.waitUntil.bind(ctx) : undefined;
  if (db) event.locals.cairnAuditSink = createD1AuditSink(db, waitUntil);
  return resolve(event);
};

export const handle = wireAuditSink;
```

### `createSectionAction`

Stability tier: Extension API.

```ts
declare function createSectionAction<Env, Db>(
  config: SectionActionConfig<Env, Db>,
): <T>(
  handler: (args: { event: CairnEvent<Env>; form: FormData; ctx: SectionActionContext<Db> }) => Promise<T>,
  opts: SectionActionOptions,
) => (event: CairnEvent<Env>) => Promise<T | ActionFailure<{ error: string }>>;
```

Build a whole section's guarded action wrapper in one call, the enforcement every site-built
admin section otherwise hand-rolls: SvelteKit dispatches a matched action directly, with no
ancestor layout `load` run first, so a page's own guard never runs before a POST to one of its
actions. `createSectionAction` composes [`adminAction`](#adminaction) (editor identity, CSRF,
the single form read, the audit contract) with the same access-map check
[`requireAccess`](#requireaccess) runs, an optional rate limit, and the section's own database
binding, so a section's own actions need no hand-rolled precondition.

The config is site-fixed, called once per section: `config.resolveDb` reads the section's own
binding off the platform env, and `config.rateLimit`, when set, names the binding and the
per-call key. `resolveDb`'s shape, `(env: Env | undefined) => Db | undefined`, is deliberate and
stays ratified unchanged: the engine can't conjure an absent platform, so an honest `undefined`
parameter beats a callback that hides absence, and the fail-closed authorization and
degrade-to-open rate limit split (the check order below) is the ratified reading of that absence.

The returned wrapper takes the call-site's own
`opts: { action, entity, target?, ownerOnly?, deniedMessage? }`. `action` and `entity` are
declared once, here, and serve two purposes: every denial audits under them by default, and a
handler's own `ctx.audit` call (a [`SectionActionAudit`](#types)) also defaults `action`/`entity`
from them, so the common handler names only what `opts` doesn't already say
(`ctx.audit({ entityId })`). A handler can still override either field, for a call that
genuinely touches more than one entity.

`target` defaults to `event.route.id`, never `event.url.pathname`. A route serving more than one
section, or any route with a rest parameter, must declare `target` explicitly, since SvelteKit
dispatches actions by `?/name` while the access map matches routes, and on a catch-all route the
path is attacker-chosen while the route id isn't. A matched form action never actually sees a
null `route.id`; only an unmatched request does, a case a dispatched action can't reach. The
fallback for a null id is a fixed constant that matches no real access-map key, never
`event.url.pathname`: falling back to the path would reintroduce exactly the attacker-chosen
value this derivation removes, in precisely the confusing case a null id represents.

**On a parameterized or catch-all route, `event.route.id` is the bracket form
(`/admin/posts/[id]`), never the concrete path a request carries (`/admin/posts/hello-world`).**
An access map that keys a dynamic route by its concrete path stops matching. A static route's id
and path are the same string, so a site with no parameterized or catch-all admin route sees no
change. `ownerOnly` requires owner capability on top of the map check, never instead of it.

Route groups are the one place a route id and its URL differ on every site, so the derived target
drops them: a route id of `/admin/(app)/roster` resolves to the target `/admin/roster`, and
`/admin/(app)/club/(section)/events/[id]` to `/admin/club/events/[id]`. **Key the access map by
the URL shape, group segments left out, however deep the route sits in groups.** This applies to
the derived default only. `createSectionAction` matches a `target` you declare verbatim, so a
declared target carrying a group segment needs a map key in that exact form.

`Env` does not infer from `resolveDb`'s parameter alone; annotate it, as the snippet below
does, or pass explicit type arguments, else it collapses to `{}` and every downstream binding
read stops typechecking usefully.

Check order, refusals returned as SvelteKit `fail(...)`, fail-closed at every step but the rate
limit, which deliberately degrades to open. Authorization runs before the database-binding
check: a session the access map refuses learns nothing about whether the section's own database
is deployed:

1. `adminAction` resolves the editor, verifies CSRF, and reads the form once. Its own authentication
   guards throw SvelteKit's own `redirect()`/`error()`, not a `fail()`, and need no site
   `handleError` mapping; only this factory's own branches below render as form failures.
2. The rate limit, when configured: an unresolved binding logs `admin.action.rate_limit_absent`
   and degrades to open (never blocks); a `key()` or `limit()` call that throws logs
   `admin.action.rate_limit_failed` and degrades to open the same way, so a forgotten
   `[[ratelimits]]` block reads distinctly from a transient binding error rather than either one
   being a silent bypass. A present binding over its limit logs `admin.action.rate_limited` and
   returns `fail(429)`. This branch calls no `ctx.audit`: a limiter denial is back-pressure, not
   a domain-state change.
3. `event.locals.cairnAccess` absent audits `'rejected: access map not attached'`, logs
   `admin.action.misconfigured`, and returns `fail(500)`: the guard never ran on this route.
   Only [`createAuthGuard`](#createauthguard) may write `locals.cairnEditor` and `locals.cairnAccess`,
   and it must be the last handle in the sequence to set them. This check runs before
   authorization out of necessity (a route cannot authorize against a map that was never
   attached) and leaks nothing per-editor: it is identical for every session.
4. `hasAccessRule` false audits `'rejected: no access rule'` and returns `fail(403)`, mirroring
   `requireAccess` exactly, owner included: **a section path must carry an access-map rule**, or
   every call through it refuses. The section's layout `load` must call `requireAccess` too, so
   reads and writes gate on the same fail-closed predicate and a denied POST's page render
   exposes nothing the load would already have refused.
5. `canReach` false, or `opts.ownerOnly` set against a non-owner session, audits
   `'rejected: role not admitted'` / `'rejected: not owner'` and returns `fail(403)`.
6. `config.resolveDb` returning `null` or `undefined` audits `'rejected: database not bound'`,
   logs `admin.action.misconfigured`, and returns `fail(500)`: a deployment misconfiguration, not
   a denial. This runs last, so a refused session's attempt always audits as a denial, never as a
   config fault that leaks a deployment detail.
7. The handler runs once with `ctx: { ...ctx, db }`, `db` narrowed to `NonNullable<Db>` and
   `ctx.audit` seeded to default `action`/`entity` from `opts` (a handler may still override
   either field).

The three 403 branches share one default message and the two 500 branches another
(`deniedMessage` overrides the 403 copy only), so a session learns no deployment or gating
detail from the response; the branch identity lives in the audit `detail` and the structured
log. All three 403 branches also emit the guard's own `auth.access.denied` (see [log
events](./log-events.md)), so a site alerting on load denials covers POST denials with the same
query, and both 500 branches emit `admin.action.misconfigured`. A denial's own audit record
carries no `entityId` (the refused write never named one); a handler's own `ctx.audit` call
should, when its entity has one. `createSectionAction` never guards a POST that reaches the
section through SvelteKit remote functions, only a form action's own POST: a remote function
call never dispatches through `Actions` at all, and it also bypasses the admin guard's own CSRF
check (that check runs on `Actions` dispatch too), so a site that adds a remote function under
`/admin` owns that verification itself, with no seam here to lean on.

The rate-limit `key` must carry an actor-scoped, normalized component (the editor's email,
lowercased), never the bare request path alone, and one binding backs one shared budget across
every action that reads it, not a budget per action; the limiter runs after `adminAction`'s own
form read, so it never bounds the cost of parsing the request body.

`Env` is your site's `App.Platform['env']` in a real route; the example below names the section's
own binding shape (`SectionEnv`) standalone, so the resolver's annotation is explicit either way:

```ts
// src/routes/admin/club/events/[id]/+page.server.ts
import { createSectionAction, type RateLimitLike } from '@glw907/cairn-cms/sveltekit';
import type { D1Database } from '@cloudflare/workers-types';

interface SectionEnv {
  SECTION_DB: D1Database;
  SECTION_RATE_LIMIT?: RateLimitLike;
}

const sectionAction = createSectionAction<SectionEnv, D1Database>({
  resolveDb: (env: SectionEnv | undefined) => env?.SECTION_DB,
  rateLimit: {
    resolve: (env: SectionEnv | undefined) => env?.SECTION_RATE_LIMIT,
    key: (ctx) => `section-action:${ctx.editor.email}`,
  },
});

export const actions = {
  approve: sectionAction(async ({ form, ctx }) => {
    const id = String(form.get('id'));
    await ctx.db.prepare('update event set approved = 1 where id = ?').bind(id).run();
    ctx.audit({ entityId: id }); // action/entity default to 'approve'/'event' below
    return { ok: true };
  }, { action: 'approve', entity: 'event' }),
};
```

## Per-route factories (advanced)

The four factories below are the advanced per-route seam. `createCairnAdmin` wraps them, so a
site on the single mount never calls them directly; a site that mounts routes by hand wires each
one against its own route files. The view components post named actions (`?/request`,
`?/confirm`, `?/save`, and the rest of the vocabulary above), so a hand-mounted route must
register each handler under that name; a `default` action does not receive a named post.

### `createAuthRoutes`

Stability tier: Unstable API.

```ts
type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };

declare function createAuthRoutes(config: AuthRoutesConfig): {
  loginLoad: (event: CairnEvent<CairnEnv>) => LoginData;
  requestAction: (event: CairnEvent<CairnEnv>) => Promise<RequestResult>;
  confirmLoad: (event: CairnEvent<CairnEnv>) => ConfirmData;
  confirmAction: (event: CairnEvent<CairnEnv>) => Promise<never>;
  logoutAction: (event: CairnEvent<CairnEnv>) => Promise<never>;
};
```

`createAuthRoutes` exports its return type by name as [`AuthRoutes`](#types).

Build the magic-link login flow. `loginLoad` and `requestAction` back the sign-in view at
`/admin/login`, `confirmLoad` and `confirmAction` back the magic-link landing at
`/admin/auth/confirm`, and `logoutAction` clears the session; the admin shell posts it as the
named `?/logout` action on the current URL. The `config.branding` sets the site name and sender
shown in the email; pass a custom `config.send` to override the default Cloudflare sender.

`requestAction` awaits the send, so its `RequestResult` (exported since 0.38.0) reflects the
outcome. The `sent` status covers both a successful send and a non-allow-listed address (the two
return identical results, so the response never reveals membership). A `send_error` means the email
could not be sent; `throttled` means the same address requested a link inside the cooldown window.
`sent` mirrors the old boolean, so a site rendering against `form.sent` keeps working.

`config.bootstrapOwner` names the address and display name that seeds the first owner row without
a manual `wrangler d1 execute` insert. On a request whose normalized email matches it, when the
`editor` table is still empty, `requestAction` inserts the owner atomically (a single
`INSERT ... WHERE NOT EXISTS` statement) before the normal magic-link flow proceeds, and logs
`editor.bootstrapped`. Once any row exists the config grants nothing, and a non-matching email on
an empty table behaves exactly as an unknown email. The hand-run `wrangler d1 execute` insert (the
[configure auth and D1 guide](../extend/add-cairn-to-a-sveltekit-app.md)) still works and stays documented
as the fallback for a site that prefers it.

```ts
// src/routes/admin/login/+page.server.ts (per-route mounting)
import { createAuthRoutes } from '@glw907/cairn-cms/sveltekit';

const auth = createAuthRoutes({ branding: { siteName: 'My Site', from: 'cms@example.com' } });

export const load = auth.loginLoad;
export const actions = { request: auth.requestAction };
```

### `createEditorRoutes`

Stability tier: Unstable API.

```ts
declare function createEditorRoutes(opts?: EditorRoutesOptions): {
  editorsLoad: (event: CairnEvent<CairnEnv>) => Promise<EditorsData>;
  editorAddAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  editorRemoveAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  editorSetRoleAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
};
```

`createEditorRoutes` exports its return type by name as [`EditorRoutes`](#types).

Build the loads and actions for the editor-management view at `/admin/editors`. `editorsLoad` lists
the editors, names the current user, and returns `vocabulary`, the declared roles with their
resolved capability, which [`ManageEditors`](./components.md#manageeditors) renders. The three
actions add an editor, remove one, and change a role, each validating the posted role against the
vocabulary (rejecting an unknown one as a form error, no more silent coercion to `'editor'`) and
returning a typed `ActionFailure` on a guard or validation error. `opts.roles` is the same
declared vocabulary [`createAuthGuard`](#createauthguard) takes; omitted, both resolve against the
default owner/editor pair.

```ts
// src/routes/admin/(app)/editors/+page.server.ts (per-route mounting)
import { createEditorRoutes } from '@glw907/cairn-cms/sveltekit';
import { roles } from '$lib/cairn.config.js';

const editors = createEditorRoutes({ roles });

export const load = editors.editorsLoad;
export const actions = {
  editorAdd: editors.editorAddAction,
  editorRemove: editors.editorRemoveAction,
  editorSetRole: editors.editorSetRoleAction,
};
```

### `createContentRoutes`

Stability tier: Unstable API.

```ts
declare function createContentRoutes(runtime: CairnRuntime, deps?: ContentRoutesOptions): ContentRoutes;

type ContentRoutes = {
  shellLoad: (event: CairnEvent<CairnEnv>) => Promise<{ shell: AdminShellData }>;
  helpLoad: (event: CairnEvent<CairnEnv>) => Promise<HelpData>;
  indexLoad: (event: CairnEvent<CairnEnv>) => { view: "welcome"; page: WelcomeData };
  listLoad: (event: CairnEvent<CairnEnv>) => Promise<ListData>;
  mediaLibraryLoad: (event: CairnEvent<CairnEnv>) => Promise<MediaLibraryData>;
  settingsLoad: (event: CairnEvent<CairnEnv>) => Promise<SettingsData>;
  settingsSaveAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<SettingsSaveFailure>>;
  vocabularyLoad: (event: CairnEvent<CairnEnv>) => Promise<VocabularyLoadData>;
  vocabularySaveAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<VocabularySaveFailure>>;
  createAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<CreateFailure>>;
  editLoad: (event: CairnEvent<CairnEnv>) => Promise<EditData>;
  historyLoad: (event: CairnEvent<CairnEnv>) => Promise<HistoryData>;
  saveAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<SaveFailure>>;
  publishAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<SaveFailure>>;
  publishAllAction: (event: CairnEvent<CairnEnv>) => Promise<never>;
  discardAction: (event: CairnEvent<CairnEnv>) => Promise<never>;
  deleteAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<DeleteRefusal>>;
  listDeleteAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<DeleteRefusal>>;
  renameAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<RenameFailure>>;
  previewMintAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<PreviewMintFailure> | { url: string; expiresAt: number }>;
  previewRevokeAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<PreviewMintFailure> | { count: number }>;
  revertAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<RevertFailure>>;
  uploadAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<MediaUploadFailure> | UploadResult>;
  dictionaryAddAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<DictionaryAddFailure> | DictionaryAddResult>;
  tidyAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<TidyFailure> | TidyResult>;
};
```

The core of the admin surface. It takes the composed runtime and returns the loads and actions for
the authed admin shell, the concept list, and the entry editor, exported by name as
[`ContentRoutes`](#types). `shellLoad` backs the shared admin
shell (the `/admin/+layout` load wires it through `createCairnAdmin`'s `shellLoad`): it returns the
lean `{ shell: AdminShellData }` chrome payload, bare for a public path and the streamed authed nav
otherwise. Its caller awaits it: `shellLoad` arranges and gates the whole sidebar up front, a
declared `navLayout` or, absent one, today's default arrangement synthesized through the same
resolver, then applies the site's
`deps.navFilter`, if configured, to the arranged `items` alone (see [the navLayout
seam](#the-navlayout-seam) and `ContentRoutesOptions` below). `listLoad` with the `create`, `delete` (`listDeleteAction`), and `publishAll`
actions back a concept's list view, and `editLoad` with the `save`, `publish`, `discard`,
`delete`, and `rename` actions back the entry editor. `uploadAction` ingests an image for a
media-enabled site: a raw-body JSON endpoint that stores the bytes in R2, returns a `UploadResult`
(the `media:` reference and the server-owned record), and commits nothing until the entry is saved.
`mediaLibraryLoad` backs the admin Media Library view: it unions `media.json` from the default
branch with every open `cairn/*` branch (so a not-yet-published asset shows, with the default
branch winning a same-hash tie), projects each row through the shared `mediaLibraryEntry` helper,
and attaches a per-hash where-used overlay (`MediaLibraryData`). The Media Library's own janitorial
and edit actions (the Library-direct upload, per-asset delete and update, replace-in-place, alt
propagation, and bulk delete/orphan scan/purge) are not members of this public return; they reach
the browser only through [`createCairnAdmin`](#createcairnadmin), documented there with the rest of
the admin action vocabulary.

A save holds the edit on the entry's pending branch (`cairn/<concept>/<id>`) and does not touch
the default branch, so the live site stays as it was. `publishAction` publishes what the author
sees: it validates and holds the posted form exactly like a save (the same fail shapes on a
validation or link-guard refusal), then copies that markdown to the default branch, with its
manifest row upserted, in one commit. The pending branch is deleted only when its head still
matches the commit the action just made; a concurrent save moved it, so the entry stays pending
instead of losing the newer edit. `publishAllAction` publishes the saved branch content of every
pending entry across concepts in one atomic commit, with the same guarded per-branch delete; the
admin topbar posts it as the named `?/publishAll` action from any admin page. `discardAction`
deletes the pending branch, returning to the edit page for a published entry (`?discarded=1`) or
to the list for an entry that never published. `renameAction` refuses with a 409 while a pending
branch exists, and a delete cascades to the pending branch after its own commit lands.

`historyLoad` and `revertAction` back the `history` view: a version is a publish, reachable from
the edit screen for any entry that has published or carries an open draft. `historyLoad` reads the
default branch's commit log for the entry's file through `Backend.listCommits`, bounded to the most
recent 25 publishes, plus a synthetic top row for an open draft when one exists. The list shows
every commit that touched the file, including changes made outside cairn (a direct edit, a
repo-wide migration), rendering whichever author name and date git recorded rather than assuming a
cairn editor. The label the screen renders is "recent versions," never a completeness claim: the
commits API's path filter doesn't follow a rename, so a renamed entry's history restarts at the
rename, and `HistoryData.truncated` only ever flags the 25-row bound, never a rename boundary the
route can't see. A deleted entry answers a 404 exactly as `editLoad` does. Undelete is out of scope
(see [ROADMAP.md](../../ROADMAP.md)), and a developer who needs a removed entry's content reads it
straight from git. `revertAction` starts a fresh draft from an old publish: it re-validates the
posted `ref` against a fresh `listCommits` read, full-sha exact membership, so `ref_unknown` always
means the target fell outside that same 25-row window, either because it named a commit history
never listed or because the window moved between page render and submit. The 25-row bound therefore
composes with that membership check into one deliberate consequence: revert reaches only the last
25 publishes through the UI, and git is the developer's escape hatch for anything older. A stale
`head`, the default branch moved since the history page rendered, refuses `history_stale`, and a
pending branch already blocking the entry refuses `draft_exists` with the blocking draft's
own editor and start date, from either `revertAction`'s own pre-check or `Backend.createBranch`'s
authoritative `BranchExistsError` under a race. None of the three refusals commits anything; every
one stays on the page as an `ActionFailure<RevertFailure>`. A successful revert commits the old
markdown onto the pending branch (`expectedHead` pinned to the sha the branch was just created at,
so a save that lands in the narrow window right after still answers a conflict rather than being
silently overwritten), logs `commit.reverted` alongside the ordinary `commit.succeeded` (see [log
events](./log-events.md)), and redirects to the edit screen exactly like a save, carrying a
schema-drift advisory when the old version predates a since-retired field or vocabulary tag: revert
warns on drift, it never refuses on it, so an old version is never permanently unrevertable.

`previewMintAction` and `previewRevokeAction` back the edit screen's share affordance (spec part 3,
"Public preview for a non-editor"): minting hands an editor's own read on a draft to anyone holding
the returned URL, so both call `requireEntryFromParams` as their first statement, the same
entry-scoped authorization `saveAction` and `publishAction` carry, not merely the view gate.
`previewMintAction` refuses with `fail(400)` when the entry carries no pending draft (there is
nothing to share yet); on success it returns `{ url, expiresAt }` directly, no redirect, so the
share panel can show and copy the link in place, sets `cache-control: no-store` on its own
response (the one admin payload that carries a bearer credential), and logs
`preview.token.minted`. The minted `url` is built from `PUBLIC_ORIGIN`
([`requireOrigin`](#createauthroutes)), never the request's own host. `previewRevokeAction` deletes
every outstanding link for the entry in one call, returning `{ count }`; it is idempotent, since
revoking with nothing minted still succeeds with a count of zero. Both actions answer the same
`ActionFailure<PreviewMintFailure>` when `AUTH_DB` is missing the `preview_tokens` table
(`migrations/0003_preview.sql` not yet applied), naming the migration to apply rather than
surfacing a raw D1 error, since the engine ships the share affordance to every upgraded site's edit
screen regardless of adoption. `renameAction`, `deleteAction`/`listDeleteAction`, and
`discardAction` each clear a never-published entry's outstanding preview rows as part of their own
cascade, closing an id-reuse collision where a stale link could later resolve to a different
entry's draft; publishing deliberately leaves the rows in place, since [`previewLoad`](#previewload)
needs them to answer a stale link with "this preview has ended" rather than a bare 404. See [Public
preview](#public-preview) below for the site-mounted page these actions feed, and [Share a draft
preview](../extend/share-a-draft-preview.md) for the adopter's full walkthrough.

`settingsLoad` and `settingsSaveAction` back the tidy settings screen. `settingsLoad` actively probes a
present key with a zero-token Anthropic call and reports `keyStatus` (`'missing'` / `'invalid'` /
`'valid'` / `'unknown'`) alongside the presence-only `keyConfigured`, so a revoked key closes the
`enabled` gate distinctly from a never-configured one; the probe result also feeds the same
key-health cache `editLoad`'s Tidy control reads, so a confirmed-invalid key hides that control on
the next edit load without a separate check. The same deadline that bounds a tidy call also bounds
the probe, so a hung Anthropic connection resolves to `'unknown'` rather than stalling the load
on the SDK's own multi-minute timeout. The key-health cache holds the probe's verdict for the
same ten-minute window as its mark, so a run of settings navigations spends at most one live
round trip. `vocabularyLoad` and
`vocabularySaveAction` back the tag-vocabulary screen at `/admin/vocabulary`. `vocabularyLoad` returns the
`VocabularyLoadData` the screen renders: the committed `{ value, label }` vocabulary in config order
(`vocabulary`), each value's cross-branch in-use count (`usage`, keyed by value over the default
branch unioned with every open `cairn/*` branch), and the in-use-but-unlisted tags with their counts
(`unlisted`, the seed candidates). The usage overlay is best-effort: a failed read degrades `usage` to
`{}` and `unlisted` to `[]` while the committed `vocabulary` stays visible, since the strict gate lives
on the save, not the load. `vocabularySaveAction` validates the posted vocabulary JSON, gates a delete on
that strict cross-branch usage (an in-use value cannot be removed, failing closed), then
read-modify-commits the `vocabulary` key into the same committed `src/lib/site.config.yaml` the tidy
settings write, head-guarded and bouncing a stale-head conflict back to the screen.

The editor copy-edit adds two more actions, both fetch-style on the upload transport. `dictionaryAddAction`
commits an editor's personal-dictionary additions, and `tidyAction` runs the language-model tidy.
Neither is a form submit; both follow the [admin fetch action](#writing-an-admin-fetch-action) contract
below. Their request shapes and `fail` payloads:

- **`dictionaryAddAction`.** A `text/plain` POST carrying JSON `{ word }` or `{ words: string[] }`, the
  CSRF token in `X-Cairn-CSRF`. It validates CSRF first, then the session, validates each word against
  the one-line dictionary grammar (no whitespace or control bytes, length-bounded, batch-capped),
  reads `src/content/.cairn/dictionary.txt` from the default branch, inserts the new words in sorted
  order if absent (idempotent), and commits through the GitHub App pipeline. The commit is SHA-guarded:
  a stale-SHA conflict re-reads at the new head, re-merges the same additions, and retries once. Success
  returns `DictionaryAddResult` (`{ words }`, the merged canonical list, so the client drops the
  now-committed words from its pending set). A refusal returns `DictionaryAddFailure` (`{ error }`):
  `fail(403)` on a failed CSRF check, `fail(400)` on a body with no valid word, `fail(409)` when a
  second commit conflict gives up (the client keeps the words pending and re-attempts on the next save,
  so a word is never silently dropped).
- **`tidyAction`.** A `text/plain` POST carrying JSON `{ text, scope }`, the CSRF token in
  `X-Cairn-CSRF`. It validates CSRF first, then the session, refuses before any model call if tidy is
  disabled or the key is missing, bounds the body, and only then builds the prompt and calls the model
  under its own deadline. It commits nothing. Success returns `TidyResult`
  (`{ corrected, model, tokens }`, the corrected markdown plus the model id and token counts; the diff is
  computed on the client) and marks the shared key-health cache healthy. A refusal returns `TidyFailure`
  (`{ error }`): `fail(403)` on a failed CSRF check, `fail(503)` when tidy is disabled, the API key is
  missing, or Anthropic rejects the key outright (a 401 or 403; this branch is not retryable, marks the
  key unhealthy in the shared cache, and reads "Tidy isn't available right now" rather than the generic
  retry copy), `fail(413)` for an over-long body (tidy a selection instead), `fail(502)` for a deadline
  overrun, a different abort, a model error, or an empty result (all retryable), `fail(422)` for a model
  refusal, `fail(400)` for a malformed body. The `TidyResult`, `TidyFailure`, `DictionaryAddResult`, and
  `DictionaryAddFailure` shapes are admin-internal: the editor host reads them by `type`/`status` off the
  deserialized envelope, so they are not exported on the `sveltekit` subpath and carry no Types row.

Every action failure carries `error: string` as its one-line summary, alongside the payload that
names what refused: a blocked save or publish returns `SaveFailure` (the broken links and the
edited body), a refused delete returns `DeleteRefusal` (the inbound linkers and the entry id),
a refused rename returns `RenameFailure`, and a refused create returns `CreateFailure` (the same
bare summary as `RenameFailure`, for a bad slug, a missing date, or an address collision). The
media actions add two more: a refused media delete returns `MediaDeleteRefusal` (the asset hash,
the where-used rows, and the count) and a refused media metadata edit returns
`MediaUpdateFailure` (the asset hash, when known). A refused replace returns `MediaReplaceFailure`
(the same shape as the delete refusal) and a refused alt-propagation returns
`MediaAltPropagateFailure` (the asset hash, when known). A page component types its `form` prop
with `ContentFormFailure`, the optional merge of all eight.

```ts
// src/routes/admin/(app)/[concept]/+page.server.ts (per-route mounting)
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = routes.listLoad;
export const actions = { create: routes.createAction, delete: routes.listDeleteAction, publishAll: routes.publishAllAction };
```

### Writing an admin fetch action

`uploadAction` and its Library-direct sibling `mediaLibraryUploadAction` are the admin actions a client
drives with `fetch` rather than a form submit, and the transport has two SvelteKit constraints that
govern any fetch-style admin action or a client that calls one of these. A SvelteKit form action rejects any POST whose content type is not
form-encoded with a 415 before the action body runs, so the upload client posts `text/plain`, the one
form content type that carries raw bytes. CSRF rides an `X-Cairn-CSRF` header that the admin guard
clears before its body-cloning form-field check, since reading the body twice would consume the stream.
A form action's result is always a 200 JSON envelope (`{ type, status, data }`), so a `fail(413)` from
the action is not an HTTP 413: the client reads the envelope and branches on `data`, not on the
response status. Build a new fetch-style admin action against this contract from the start. The upload
client in `examples/showcase` is the working reference.

## Media delivery

### `createMediaRoute`

Stability tier: Scaffold API.

```ts
declare function createMediaRoute(runtime: CairnRuntime): RequestHandler;
```

The media delivery route, a SvelteKit `RequestHandler` a media-enabled site mounts at
`/media/[...path]`. It streams content-addressed bytes from the site's R2 bucket, validating the
hash and extension before any R2 read and deriving the object key from the validated values alone.
Every served response carries the load-bearing security headers (`X-Content-Type-Options: nosniff`,
`Content-Disposition: inline`, a `default-src 'none'; sandbox` CSP, and a one-year immutable cache),
which are the XSS control for the served bytes since the route sits outside `/admin`. It forwards
`If-None-Match` and `Range` for 304 and 206 responses, short-circuits the Cloudflare Images
self-loop, returns 503 on a missing bucket binding, and 404 responses a media-off site or a bad path. Pass
it the composed runtime directly; the factory reads `runtime.resolvedAssets` itself, matching every
other route factory's convention.

```ts
// src/routes/media/[...path]/+server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const GET = createMediaRoute(composeRuntime({ adapter: cairn, siteConfig }));
```

## Public preview

An editor can hand a draft to someone who isn't an editor (spec part 3, "Public preview for a
non-editor"): the edit screen's share affordance, the preceding
[`previewMintAction`](#createcontentroutes) section, mints an opaque token for the entry's pending
draft, and a site-mounted, never-prerendered
page renders it through the site's own public composition, so the preview is a real page in the
site's own app rather than an approximated shell. See [Share a draft
preview](../extend/share-a-draft-preview.md) for the full adopter walkthrough, including the
`preview_tokens` migration, the mount, and the lifecycle.

**Disambiguation: two unrelated `preview` seams share a word.** [`CairnRuntime.preview`](#types)
(`PreviewConfig`) is the site's stylesheets and container classes for the *admin editor's own*
preview pane, resolved per entry as [`EditData.preview`](#types) (`ResolvedPreview`); it never
leaves the admin and carries no token. The family on this page is a different subsystem: a
credentialed, unauthenticated read on one draft for whoever holds a minted URL. The two never
interact; they only happen to be named the same thing.

### `previewLoad`

Stability tier: Scaffold API.

```ts
declare function previewLoad(runtime: CairnRuntime, config: PublicRoutesConfig, event: CairnEvent<CairnEnv>): Promise<PreviewData>;
```

Serve a minted preview link. Mount it at `/preview/[token]`, **inside the same layout group as
your entry pages**, so the stylesheets and chrome on that layout chain apply to the preview the
same way they apply to a public entry; mounting outside the group reproduces the unstyled page the
engine's earlier, rejected preview shape was rejected for. `config` is the site's own
[`PublicRoutesConfig`](./delivery.md#publicroutesconfig), the literal object already passed to
[`createPublicRoutes`](./delivery.md#createpublicroutes): `previewLoad` renders through
[`composeEntryData`](./delivery.md#composeentrydata), the same composition `entryLoad` runs, so a
preview and its eventual public page can't structurally drift.

The verification chain runs in this order, cheapest first, and stops at the first failure: the
token's own shape (`^[A-Za-z0-9_-]{43}$`, `generateToken`'s exact form; a malformed token is a 404
with no D1 read and no log, so spray traffic costs nothing), the `AUTH_DB` binding, the row lookup
by hash, the row's expiry, the row's stored concept and id against the live `runtime.concepts`,
and finally the branch read, whose own miss is the branch-gone signal (there's no separate
existence pre-check). Every refusal throws an identical `error(404)` with the same plain body;
only the `preview.rejected` log (see [Log events](./log-events.md)) carries which of the seven
reasons applied, and it never carries the token itself. A missing `AUTH_DB` binding answers
`error(503)` instead, after the same log, since a load can't return a bare `Response`.

Two outcomes reach a rendered page. While the entry's pending branch still exists, the draft
renders with `preview.state: 'draft'`. Once the branch is gone (a publish or a discard both delete
it), and the entry's file exists on the default branch, the ended page renders with
`preview.state: 'published'` and `preview.published.permalink` set: "this preview has ended,"
linking the live version, never a claim that the draft itself went live (a discarded *edit* of an
already-live entry reaches this same state, and that claim would be false for it). A gone branch
with nothing published (a discarded, never-published entry) answers the uniform 404 instead,
reason `branch_gone`.

`previewLoad` sets its own response headers (`x-robots-tag: noindex, nofollow`,
`cache-control: private, no-store`, `referrer-policy: no-referrer`,
`x-content-type-options: nosniff`, `x-frame-options: DENY`) as its first statement, on every path
including both refusal classes: `/preview` sits outside `/admin`, so the admin guard's own header
layer never reaches it. It reads no cookie, sets none, and never touches
`locals.cairnEditor`/`locals.cairnAccess`; the token alone is the credential. It throws a
descriptive build-time error when `building` (`$app/environment`, read through a dynamic import at
call time rather than a module-scope import, so importing any other `/sveltekit` barrel export
never pulls in this virtual module) is true, so a site that lets this route prerender gets a red
build naming the fix (`export const prerender = false;`) instead of a token-bearing static asset.

The returned `seo` never carries `canonical`, `og:url`, or `jsonLd.url`: a preview render is
already `noindex`ed, but a self-referential `canonical`/`og:url` pointing at a URL that is not yet
live (or, for the ended page, already superseded) would still invite a crawler to consolidate the
preview onto it, and an unfurler that ignores `noindex` reads these fields directly regardless.
This is about the page's own advertised identity, not the token, which lives only in the route
path and never appears on the page.

```ts
// src/routes/(site)/preview/[token]/+page.server.ts
import type { PageServerLoad } from './$types';
import { previewLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';
import { publicRoutesConfig } from '$lib/public-routes.js';

// REQUIRED: a preview link is a bearer credential. Prerendering this route would bake a token
// into a static asset every build ships.
export const prerender = false;

export const load: PageServerLoad = (event) => previewLoad(runtime, publicRoutesConfig, event);
```

```svelte
<!-- src/routes/(site)/preview/[token]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PreviewBanner } from '@glw907/cairn-cms/components';
  import ArticleView from '$lib/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
<ArticleView {data} preview />
```

### `mintPreviewToken`

Stability tier: Unstable API.

```ts
declare function mintPreviewToken(db: D1Database, config: PreviewTokenConfig, record: { concept: string; entryId: string; editor: string }): Promise<{ token: string; expiresAt: number }>;
```

Mint a preview token: generate a fresh 256-bit token, store only its hash (`hashToken`,
`/auth-crypto`) in `AUTH_DB` alongside the entry it shares and the minting editor, and return the
plaintext once, since it's never stored and can't be recovered later. The documented path to this
function is [`previewMintAction`](#createcontentroutes), which carries the entry-scoped
authorization a preview mint needs (converting one editor's read into an unauthenticated public
read is an authority-delegation act); `mintPreviewToken` itself performs no authorization or
draft-existence check, so a caller that reaches it directly, to build a custom mint action, owns
both. `config.ttlMs` defaults to seven days and must be finite, positive, and between one minute
and thirty days; an out-of-range value throws a `PreviewTokenConfig:`-prefixed error before any
token is generated.

## Navigation routes

### `createNavRoutes`

Stability tier: Unstable API.

```ts
declare function createNavRoutes(runtime: CairnRuntime): {
  navLoad: (event: CairnEvent<CairnEnv>) => Promise<NavLoadData>;
  navSaveAction: (event: CairnEvent<CairnEnv>) => Promise<ActionFailure<NavSaveFailure>>;
};
```

`createNavRoutes` exports its return type by name as [`NavRoutes`](#types).

Build the load and save for the navigation editor at `/admin/nav`. `navLoad` reads the current menu
tree and the page options for the URL picker, and `navSaveAction` commits an edited tree to the
git-committed site-config file. Like the content routes, a handler resolves its backend from
`event.locals.cairnBackend`, falling back to the runtime's connected backend. A production caller
passes no second argument. The `NavTree` component posts the named `?/save` action, so a
hand-mounted route registers `navSaveAction` under `save`.

```ts
// src/routes/admin/(app)/nav/+page.server.ts (per-route mounting)
import { composeRuntime } from '@glw907/cairn-cms';
import { createNavRoutes } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

const nav = createNavRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = nav.navLoad;
export const actions = { save: nav.navSaveAction };
```

The public read-model loaders live at [`@glw907/cairn-cms/delivery`](./delivery.md), where the
matching `CairnHead` component sits. See [the delivery reference](./delivery.md) for the worked
catch-all route.

## Health check

### `healthLoad`

Stability tier: Scaffold API.

```ts
declare function healthLoad(event: CairnEvent<CairnEnv>, runtime: CairnRuntime): Promise<HealthData>;
```

Run the GitHub App signing self-test against the configured App id and the Worker's key secret.
Mount it at the site root, outside `/admin`, so the auth guard does not gate the deploy health
check. The event comes first, the runtime second. On a site that prerenders by default, set
`prerender = false` so the check runs at request time rather than freezing a build-time failure.

```ts
// src/routes/healthz/+server.ts
import { json } from '@sveltejs/kit';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';

export const prerender = false;

export const GET = async (event) => json(await healthLoad(event, runtime));
```

---

## The navLayout seam

A site arranges its whole admin sidebar as one ordered, declarative tree, mixing the engine's own
screens with its own `/admin/` route entries. Declared as `navLayout` on the adapter's `editor`
group, it's an ordered tree of three node kinds, all data-only, validated when the runtime composes:
an engine reference places one of cairn's own screens (each declared concept plus the fixed utility
screens); a site entry is a labeled, iconed link to one of the site's own `/admin/` routes, with an
added `roles` gate; a section groups a mix of both under one label, one level deep. A bad icon, a
colliding href, an unknown screen, or an unresolvable role fails the build rather than rendering a
broken or silently wrong sidebar. Absent `navLayout`, the sidebar renders today's default
arrangement, resolved through the same internal resolver, so the two paths can never drift.
Stability tier: Extension API.

An engine screen the tree never references still renders, in a trailing group after a divider (the
shell's foot slot), in engine order; `hidden: true` on an engine reference removes the door on
purpose (the route itself stays live, since nav placement is never authorization). This is the
answer for a site that wants to add just one link beside the built-in screens: declare `navLayout`
with that one entry, and every engine screen the declaration omits lands in the trailing fallback
group automatically, with no need to enumerate the rest of the sidebar. Every engine door and every
site entry's href is additionally gated by the site's declared [access
map](./core.md#access-map), when one is declared: see [Restrict admin access by
role](../extend/restrict-admin-access.md) for the map, and [Organize your admin
nav](../extend/organize-your-admin-nav.md) for the worked guidance on grouping, collapse defaults,
icon overrides, and the omission-fallback and `hidden` semantics in practice.

### `NavLayoutEntry`

Stability tier: Extension API.

```ts
interface NavLayoutEntry {
  label: string;
  icon: NavIcon;
  href: string;
  ownerOnly?: boolean;
  roles?: string[];
}
```

A site's own nav entry inside a `navLayout` tree. `label` names the link, `icon` is a name from the
bundled allowlist (see [`NavIcon`](#navicon)), and `href` points at the site's own `/admin/` route.
The href must not collide with a built-in admin view; a collision throws at startup with the
conflicting view named. `ownerOnly` hides the link from a session that does not resolve to owner
capability, regardless of its role name; the flag is cosmetic, so the route itself must still gate
server-side. `roles`, absent, renders for every role; a declared list renders the entry only when
the signed-in editor's `role` is in it, matched against the open role names the adapter declares
(see [the declared role vocabulary](./core.md#roles)).

### `NavIcon`

Stability tier: Extension API.

```ts
type NavIcon =
  | 'anchor'
  | 'banknote'
  | 'bell'
  | 'calendar'
  | 'clipboard-list'
  | 'file-pen'
  | 'files'
  | 'graduation-cap'
  | 'image'
  | 'inbox'
  | 'key-round'
  | 'life-buoy'
  | 'list'
  | 'list-ordered'
  | 'mail'
  | 'megaphone'
  | 'menu'
  | 'package'
  | 'puzzle'
  | 'send'
  | 'settings'
  | 'shield-check'
  | 'table'
  | 'tags'
  | 'users'
  | 'users-round'
  | 'wrench';
```

The bundled Lucide icon names a `NavLayoutEntry` may use, or a `navLayout` engine reference's
[`icon`](#navlayoutengineref) override. An icon outside this allowlist throws when the runtime
composes.

### `ResolvedNavEntry`

Stability tier: Extension API.

```ts
interface ResolvedNavEntry {
  label: string;
  iconName: NavIcon;
  href: string;
  ownerOnly: boolean;
}
```

The validated shape the shell renders, produced from a `NavLayoutEntry`: the icon name resolved and
`ownerOnly` defaulted to false. The authed shell payload carries the capability-filtered set of these.

An engine screen the tree never references still renders, in a trailing group after a divider (the
shell's foot slot), in engine order; `hidden: true` on an engine reference removes the door on
purpose (the route itself stays live, since nav placement is never authorization). Every engine
door and every site entry's href is additionally gated by the site's declared [access
map](./core.md#access-map), when one is declared: see [Restrict admin access by
role](../extend/restrict-admin-access.md) for the map, and [Organize your admin
nav](../extend/organize-your-admin-nav.md) for the worked guidance on grouping, collapse defaults,
icon overrides, and the omission-fallback and `hidden` semantics in practice.

### `EngineScreenId`

Stability tier: Extension API.

```ts
type EngineScreenId =
  | 'media' | 'vocabulary' | 'nav' | 'settings' | 'editors' | 'help'
  | (string & {});
```

One of the engine's own fixed admin screens, or a site's own declared concept id. The six literals
autocomplete in an editor while a dynamic concept id, not knowable at the type level, stays
assignable; the engine validates a declared layout against a site's declared concepts and screens
at construction.

### `NavLayoutEngineRef`

Stability tier: Extension API.

```ts
interface NavLayoutEngineRef {
  screen: EngineScreenId;
  label?: string;
  hidden?: boolean;
  icon?: NavIcon;
}
```

A `navLayout` node that places one of the engine's own screens: a concept's list/edit pair, or one
of the fixed utility screens (`media`, `vocabulary`, `nav`, `settings`, `editors`, `help`). `label`
relabels the door without touching its engine-owned icon or href (`{ screen: 'settings', label:
'Site settings' }`). `hidden` removes it deliberately, a plain `boolean` so a computed flag is as
valid as the literal `true`. `nav` is a valid reference only when the adapter configures a nav menu.
`icon`, one of the bundled [`NavIcon`](#navicon) names, overrides the engine-owned glyph for that
door, since two dated concepts otherwise share one newspaper icon. An unknown name throws the same
allowlist error a site entry's own icon does.

### `NavLayoutSection`

Stability tier: Extension API.

```ts
interface NavLayoutSection {
  label: string;
  children: (NavLayoutEntry | NavLayoutEngineRef)[];
  roles?: string[];
  collapsed?: boolean;
}
```

One named group inside a `navLayout` tree, holding a mix of site entries and engine references, no
nesting. `roles` gates every child in the section at once, composing with each child's own gates
(an engine reference inside a `roles`-gated section still obeys the engine's own capability rule; a
section's `roles` never widens what a child would otherwise show).

`collapsed` (default `false`, today's behavior) is the group's starting state for a visitor with
no persisted nav-collapse cookie. The existing `cairn-admin-nav-collapsed` cookie stores the full
collapsed set once any header is toggled, and wins entirely once present, in both directions: a
group added after a visitor's cookie already exists renders open, since the cookie is
authoritative from then on. SSR seeding already prevents a collapse flash on load; the declared
default rides the same path.

### `NavLayout`

Stability tier: Extension API.

```ts
type NavLayout = (NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection)[];
```

A site's whole declared sidebar: engine references, its own entries, and sections, in declaration
order. The adapter's `editor.navLayout` field takes this shape.

### `ResolvedEngineNavEntry`

Stability tier: Extension API.

```ts
interface ResolvedEngineNavEntry {
  screen: EngineScreenId;
  label: string;
  href: string;
  dated?: boolean;
  iconName?: NavIcon;
}
```

One resolved engine nav entry: the fixed screen id, its label (the engine default or a site
relabel), and its engine-owned href. The shell maps `screen` to its fixed icon client-side, unless
`iconName` is present: it carries a declared [`NavLayoutEngineRef.icon`](#navlayoutengineref)
override, which the shell prefers over its own default. `dated` is present only when the entry is
a content concept, so the shell can pick the concept's kind icon (a dated, posts-like concept
from an undated, page-like one) instead of every concept sharing one document icon.

### `ResolvedLayoutChild`

Stability tier: Extension API.

```ts
type ResolvedLayoutChild = ResolvedNavEntry | ResolvedEngineNavEntry;
```

One resolved leaf in a `navLayout` tree: a site's own entry, or one of the engine's own screens.
Discriminate with `'screen' in item`.

### `ResolvedLayoutSection`

Stability tier: Extension API.

```ts
interface ResolvedLayoutSection {
  label: string;
  children: ResolvedLayoutChild[];
  collapsed?: boolean;
}
```

One resolved named group in a `navLayout` tree, its children already filtered and non-empty (a
section that filters down to nothing disappears rather than rendering an empty header). `collapsed`
carries the declared [`NavLayoutSection.collapsed`](#navlayoutsection) default; absent means open,
today's behavior. The shell reads this only to seed a session with no nav-collapse cookie; a
present cookie's own set wins regardless of this value.

### `ResolvedLayoutNode`

Stability tier: Extension API.

```ts
type ResolvedLayoutNode = ResolvedLayoutChild | ResolvedLayoutSection;
```

One resolved top-level `navLayout` node: a loose child, or a section of them. This is the shape
`navFilter` receives and returns (see [`ContentRoutesOptions`](#contentroutesoptions)).

### `ResolvedNavLayout`

Stability tier: Extension API.

```ts
interface ResolvedNavLayout {
  items: ResolvedLayoutNode[];
  fallback: ResolvedLayoutChild[];
}
```

The whole resolved sidebar for one request: the arranged, filtered scroll-area tree in declaration
order (`items`), plus the trailing group of engine screens the tree never referenced (`fallback`,
rendered in the shell's foot slot, engine order, empty once every screen was referenced).
`AdminShellData`'s authed arm carries this as `nav`.

---

## The attention seam

A site surfaces its own pending-work counts as quiet pill badges on the sidebar, the shell's
answer to "what needs my attention right now": an unreviewed signup queue, an unread message
inbox, whatever a site's own domain tracks. The engine renders the pills; the site computes what
counts. Stability tier: Unstable API for the `attention` dep itself (grouped with the other
`ContentRoutesOptions` members), Extension API for the `AttentionItem` shape it returns.

### `AttentionItem`

Stability tier: Extension API.

```ts
interface AttentionItem {
  href: string;
  count: number;
  label?: string;
}
```

One pending-work badge a site's `attention` dep contributes for one nav entry. `href` names the
admin route whose nav entry carries the pill, the same href a resolved nav entry or engine door
already carries; it is also the pill's click-through target. `count` is the pending actionable
count; a zero or negative `count` is dropped rather than rendering a "0" pill. `label` is the
accessible noun for the count ("pending requests"), joined into the entry's accessible name
("Asset requests, 3 pending requests"); it defaults to `'pending items'`.

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the attention function -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';
import { db } from './club/db.js';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
});

export async function attention({ editor }) {
  const pending = await db.assetRequests.countPendingFor(editor.role);
  return [{ href: '/admin/club/assets', count: pending, label: 'pending requests' }];
}
```

Wire the preceding function onto [`ContentRoutesOptions.attention`](#contentroutesoptions) (or
[`CairnAdminOptions.attention`](#cairnadminoptions) on the single-mount facade), passed as a dep
where `cairn.server.ts` composes the runtime, not declared on the adapter beside `attention`'s own
`cairn.config.ts`:

<!-- snippet-check-skip: elides composeRuntime's other real inputs (shown in full in core.md's worked example) to focus on wiring the attention dep -->
```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';
import { attention } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime, { attention });
```

The dep is awaited exactly once per request, after nav resolution and `navFilter` have both
already run: the site computes items per session from its own domain queues, and the engine drops
anything the session cannot act on before any rendering or summing. An item is dropped when its `count` is
non-positive, when its `href` matches no visible nav entry (an engine door or a site entry, in
the resolved-and-filtered set), or when it duplicates an earlier item's `href` (first wins,
silently), so a count can never leak to a role that cannot see its nav entry (counts are
information; a leaked one is a disclosure).

The engine awaits this callback on every admin load, including every client-side navigation
between admin screens, never once per session, so it must stay fast. A slow query here makes the
admin shell slow for every screen a signed-in editor opens. A dep that throws fails the whole
shell load, by contract: the engine never swallows the error for you. A site that wants graceful
degradation on a transient failure, a flaky query or an unreachable queue, catches the error
inside its own callback and returns an empty array rather than letting it propagate. Absent `attention`,
the shell payload serializes an empty record and renders exactly as before this seam existed.

[`CairnAdminShell`](./components.md#cairnadminshell) renders the surviving items: a quiet count
pill on the matching visible nav entry, capped at `99+`; a collapsed section's header shows the
sum of its visible children's counts, computed from the same live items as the leaf pills, and
disappears once the section opens (the item pills remain); the count lives in the entry link's
accessible name, never on the pill span itself, which is `aria-hidden`. That is the rendering
contract in full. See [Organize your admin nav](../extend/organize-your-admin-nav.md) for the
layout these counts attach to.

---

## The publish-actions seam

A site declares next-step links for the publish-success moment, the `navLayout` site-entry grammar
applied after a publish. A `publishActions` entry on the adapter's `editor` group is plain data, validated
when the runtime composes: a blank field or an unknown concept fails the build instead of silently
rendering a broken link after a publish. `editLoad` resolves the validated config for the one
entry that just went live. It drops any entry a `concepts` list excludes, then substitutes
`{concept}` and `{id}` into every surviving `href` with that entry's identity. The edit page
renders the result as quiet links beside the publish-success strip, never inside a callback: no
function crosses the publish redirect, only a template string resolved server-side.

Stability tier: Extension API.

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the editor.publishActions member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  editor: {
    publishActions: [
      { label: 'Announce', href: '/admin/club/announce?post={id}', concepts: ['posts'] },
    ],
  },
});
```

Resolved, the `Announce` link renders beside the confirmation strip with `{id}` already substituted
for the published entry. Omitting `concepts` follows every concept's publish. Naming one
or more concept ids restricts it, the same shape a `NavLayoutEntry`'s `ownerOnly` narrows a sidebar
entry.

### `PublishActionEntry`

Stability tier: Extension API.

```ts
interface PublishActionEntry {
  label: string;
  href: string;
  concepts?: string[];
}
```

One developer-declared publish-success link. `href` is a template string. Resolving it substitutes
`{concept}` and `{id}` with the published entry's identity. `concepts`, when set, restricts the
link to those concept ids. A name outside the site's real concepts throws when the runtime
composes.

### `PublishActionsConfig`

Stability tier: Extension API.

```ts
type PublishActionsConfig = PublishActionEntry[];
```

A site's raw `publishActions` config, in declaration order. The adapter's `editor.publishActions`
field takes this shape.

---

## Types

These are the route-data and config shapes the factories produce and consume. A `+page.svelte`
imports the matching `*Data` type to type its `data` prop.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| <a id="authroutesconfig"></a>`AuthRoutesConfig` | Unstable API | `interface AuthRoutesConfig { branding: AuthBranding; send?: SendMagicLink; bootstrapOwner?: { email: string; displayName: string } }` | The config `createAuthRoutes` takes: the email branding, an optional custom sender, and the optional [config-declared bootstrap owner](#createauthroutes). |
| `AuthRoutes` | Unstable API | `type AuthRoutes` | What `createAuthRoutes` returns: the magic-link login, confirm, and logout handlers, shown expanded in [`createAuthRoutes`](#createauthroutes). |
| `RequestResult` | Unstable API | `type RequestResult = { status: 'sent'; sent: true } \| { status: 'send_error'; sent: false } \| { status: 'throttled'; sent: false }` | The magic-link request outcome `requestAction` resolves: a successful or membership-hiding send, a send error, or a cooldown throttle. A site reads `form.status` (or the legacy `form.sent` boolean) off this. |
| `AdminActionAudit` | Extension API | `interface AdminActionAudit { action: string; entity: string; entityId?: string \| number; detail?: string }` | One audit-log record an `adminAction`-wrapped handler emits through `ctx.audit`: the imperative verb, the domain entity, its id when the action names one, and a compact detail (never a secret, a token, or a full record). |
| `AdminActionAuditRecord` | Extension API | `type AdminActionAuditRecord = AdminActionAudit & { actor: string }` | What a site's `auditSink` receives: the `AdminActionAudit` record plus `actor`, the acting identity. `adminAction` and `createSectionAction` populate it with the verified editor's email; a direct `createD1AuditSink` call names its own actor, which need not be a cairn editor. |
| <a id="adminactionauditsink"></a>`AdminActionAuditSink` | Extension API | `type AdminActionAuditSink = (record: AdminActionAuditRecord) => void` | A site-supplied sink for `adminAction`'s audit records, wired through `event.locals.cairnAuditSink`. Optional; every emit logs `admin.action.audited` regardless. |
| <a id="ratelimitlike"></a>`RateLimitLike` | Extension API | `interface RateLimitLike { limit(options: { key: string }): Promise<{ success: boolean }> }` | The structural slice of a Workers `RateLimit` binding [`createSectionAction`](#createsectionaction) calls; any conforming limiter serves, so the surface takes no dependency on `@cloudflare/workers-types`. |
| <a id="sectionactionconfig"></a>`SectionActionConfig` | Extension API | `interface SectionActionConfig<Env, Db> { resolveDb: (env: Env \| undefined) => Db \| undefined; rateLimit?: { resolve: (env: Env \| undefined) => RateLimitLike \| undefined; key: (ctx: AdminActionContext) => string; message?: string } }` | Site-fixed configuration for one [`createSectionAction`](#createsectionaction) factory, called once per section: the DB binding resolver (`undefined` fails the action closed with a 500) and the optional rate limit, degrade-to-open. |
| <a id="sectionactionoptions"></a>`SectionActionOptions` | Extension API | `interface SectionActionOptions { action: string; entity: string; target?: string; ownerOnly?: boolean; deniedMessage?: string }` | Per-call-site options for one [`createSectionAction`](#createsectionaction)-wrapped handler: the audit verbs, declared once and reused on every denial and as `ctx.audit`'s own default, the optional authorization `target` override (defaults to `event.route.id`, never `event.url.pathname`), the `ownerOnly` stack, and an override for the shared 403 copy. |
| <a id="sectionactionaudit"></a>`SectionActionAudit` | Extension API | `interface SectionActionAudit { action?: string; entity?: string; entityId?: string \| number; detail?: string }` | One audit record a [`createSectionAction`](#createsectionaction)-wrapped handler emits through `ctx.audit`: `action` and `entity` default from the call site's own `SectionActionOptions` when omitted, and either can still be overridden for a call that touches more than one entity. |
| <a id="sectionactioncontext"></a>`SectionActionContext` | Extension API | `type SectionActionContext<Db> = Omit<AdminActionContext, 'audit'> & { audit: (record: SectionActionAudit) => void; db: NonNullable<Db> }` | What a [`createSectionAction`](#createsectionaction)-wrapped handler receives: `adminAction`'s own context, with `audit` replaced by the defaulting [`SectionActionAudit`](#types) form, plus the resolved, non-nullable database binding, so no handler re-resolves it. |
| `AdminActionContext` | Extension API | `interface AdminActionContext { editor: Editor; audit: (record: AdminActionAudit) => void }` | What a wrapped handler receives: the verified editor and the bound `audit` emitter. |
| `AdminActionOptions` | Extension API | `interface AdminActionOptions { isDev?: boolean }` | Injectable dependencies for `adminAction`. `isDev` overrides the build-time dev flag (`esm-env`'s `DEV`) so a test can drive both branches of the required-audit path; every real caller takes the default. |
| `UnauditedActionError` | Extension API | `class UnauditedActionError extends Error { status: number }` | Thrown by `adminAction` for exactly one meaning: a required-audit violation caught in dev (`esm-env`'s `DEV`), a build-time author signal, never a production refusal. `adminAction`'s own authentication refusals (a missing editor, a CSRF mismatch) throw SvelteKit's own `redirect()`/`error()` instead (see [Refusal channels](#refusal-channels)), so this class carries no production status a site needs to map through `handleError`. |
| `UploadResult` | Unstable API | `interface UploadResult { reference: string; record: MediaEntry; reused: boolean; mismatch: boolean }` | What `uploadAction` returns on a successful image upload: the `media:` reference the editor inserts, the server-owned manifest record, whether an identical asset was reused, and whether a same-name mismatch was found. |
| `AdminShellData` | Extension API | `type AdminShellData = { public: true; siteName } \| { public: false; siteName; user: { displayName; email; role: string; capability: Capability }; concepts: NavConcept[]; nav: ResolvedNavLayout; pathname; theme; collapsedNav: string[] \| null; csrf; pendingEntries: Promise<{ concept; id }[] \| null>; attention: Record<string, { count: number; label: string }>; mediaBase: string }` | The shared admin shell's payload, produced by `shellLoad` and rendered by [`CairnAdminShell`](./components.md#cairnadminshell). A discriminated union: a public (login/auth) path carries only the site name and renders bare; an authed path carries the full admin payload, the site identity, the signed-in editor (`user.role` is the open, site-declared role name, `user.capability` its resolved [`Capability`](./core.md#capability)), the one resolved sidebar `nav` ([`ResolvedNavLayout`](#resolvednavlayout), see [the navLayout seam](#the-navlayout-seam)), the active path, the CSRF token, and streams `pendingEntries` as a deferred promise so the shell never blocks on GitHub. `collapsedNav` is `null` when no nav-collapse cookie exists yet (the shell then seeds from each section's declared `collapsed: true` default) or the decoded cookie set, which wins entirely, even over a declared default, once present. `attention` carries the site's per-session pending-work counts (see [the attention seam](#the-attention-seam)), keyed by the visible nav href they decorate, empty when the site configures no `attention` dep. `mediaBase` is the resolved delivery base (the site's own `assets.publicBase`, or `/media`) that `CairnAdminShell` hands every descendant media surface through context, so a non-default base reaches admin thumbnails too. For a none-capability session, `concepts` is empty and `nav` carries no engine screen anywhere, in `items` or `fallback`; a site's own `navLayout` entries still render, since `CairnAdminShell` renders exactly what `nav` resolved for that session. |
| `ListData` | Extension API | `interface ListData { conceptId; label; singular; dated; routable: boolean; entries: EntrySummary[]; error: string \| null; formError: string \| null; publishedAll: number \| null }` | The concept list view's data, including a degraded-listing error, a create-form bounce error, and the publish-all flash count from `?publishedAll=`. `singular` is the create-affordance noun ("New post"), from the descriptor (defaulted to `label`). `routable` mirrors the concept's `routing.routable`, so the create form asks a non-routable concept (Fragments) for a name rather than an address. |
| `EditData` | Extension API | `interface EditData { conceptId; id; label; singular; fields; frontmatter; body; title; isNew; saved; renamed; error; slug; linkTargets; fragmentTargets: { id; title; body }[] \| null; routable: boolean; mediaTargets: Record<string, { slug; ext; contentType }>; mediaLibrary: Record<string, { hash; slug; ext; contentType; displayName; alt; width; height; bytes }>; inboundLinks; pending; published; publishedFlash; publishActions: PublishActionLink[]; discardedFlash; preview: ResolvedPreview \| null; advisories: AdvisoryNotice[]; orphanTags: string[] }` | The entry editor's data: form-ready frontmatter, the body, the link targets, the media targets (the minimal resolver input keyed by content hash, empty when media is off or the read fails), the media library (the picker's full human layer keyed by the same content hash, projected from the same committed-manifest read, with the `hash` duplicated into each value for `Object.values` iteration, and degrading to empty on the same path as `mediaTargets`), the inbound links for the delete guard, the publish state (`pending` means the body came from the entry's branch; `published` means the file exists on the default branch), the site's [publish-actions](#the-publish-actions-seam) resolved for this entry (`publishActions`, rendered only alongside `publishedFlash`), the adapter's `preview` knob resolved for this entry's concept (its `byConcept` override applied; null when the site sets none, which leaves the frame unstyled behind a hint), and the non-blocking server-built `advisories` (today the cross-branch address collision, empty when there is none). `singular` is the delete refusal's noun ("This post could not be deleted."), from the descriptor (defaulted to `label`), mirroring `ListData.singular`. `fragmentTargets` carries the published fragments this entry can include, for the fragment picker and the preview's include resolution, each a minimal `{ id; title; body }` projection; null when nothing here can include one, which covers both a site that declares no `fragments` concept and an entry that is itself a fragment (a fragment can't include a fragment), and empty when fragments are includable but none are published yet. `routable` mirrors the entry's concept `routing.routable`, so the Address fieldset shows a bare name instead of a URL for a non-routable concept (Fragments). `orphanTags` carries the entry's prior tags absent from the configured vocabulary, for the closed taxonomy picker's own-tag flag, and stays empty when the site configures no vocabulary, the concept has no taxonomy field, or every prior tag is already in the vocabulary. |
| `HistoryData` | Extension API | `interface HistoryData { entries: HistoryEntry[]; draft: { editor: string; startedAt: string } \| null; truncated: boolean; head: string \| null }` | `historyLoad`'s data for the `history` view: the most recent 25 publishes newest first (`entries`), a synthetic top row for an open draft (`draft`, null when there is none), `truncated` when the backend's `limit + 1` probe found more publishes than the 25-row bound holds (an entry with exactly 25 stays `false`), and `head`, the default branch's head sha at load time, carried by the revert form as its staleness comparand. |
| `MediaLibraryData` | Extension API | `interface MediaLibraryData { assets: MediaLibraryEntry[]; usage: Record<string, MediaUsageInfo>; error: string \| null }` | The Media Library view's data: the assets unioned across the default branch and open `cairn/*` branches, the per-hash usage overlay (an asset with no key renders as "no references found"), and the degraded-load error. |
| `HelpData` | Extension API | `interface HelpData { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact? }` | The Help home view's data: the getting-started progress derived from the committed manifest and the open pending branches (degrading to 0 of 3 when GitHub is unreachable), the markdown reference (the component curates by group), and the runtime's support contact, composed to cairn's hosted help when the adapter sets none, and left empty when the adapter sets it to an explicit empty string. |
| `SettingsData` | Extension API | `interface SettingsData { enabled: boolean; tidyEnabled: boolean; keyConfigured: boolean; keyStatus: TidyKeyProbeResult \| 'missing'; model: string; modelLabel: string; conventions: TidyConventions; saved: boolean; error: string \| null }` | The tidy settings view's data: the truthful two-tier gate (`enabled` is true only when tidy is on, the key is present, and the active probe has not confirmed it invalid), the developer-tier facts (`tidyEnabled`, `keyConfigured`, `keyStatus`, `model`, `modelLabel`), the editor-tier `conventions` the save writes back, and the status flags. |
| `VocabularyLoadData` | Extension API | `interface VocabularyLoadData { vocabulary: VocabularyEntry[]; usage: Record<string, number>; unlisted: { value: string; count: number }[]; error: string \| null }` | The tag-vocabulary view's data: the committed vocabulary in config order, a per-value cross-branch usage count, and the in-use-but-unlisted seed candidates. The usage overlay is best-effort and degrades to empty on a read failure, keeping the committed vocabulary visible. |
| `SettingsSaveFailure` | Unstable API | `interface SettingsSaveFailure { error: string }` | A refused tidy settings save (an invalid conventions payload, a malformed committed config, or the config's head moved since the editor opened the page): just the one-line summary. |
| `VocabularySaveFailure` | Unstable API | `interface VocabularySaveFailure { error: string }` | A refused tag-vocabulary save (an invalid vocabulary payload, a malformed committed config, a removed value still in use, or the config's head moved since the editor opened the page): just the one-line summary. |
| <a id="contentroutesoptions"></a>`ContentRoutesOptions` | Unstable API | `interface ContentRoutesOptions { tidy?: { client?: (opts: { apiKey: string }) => TidyClient; timeoutMs?: number }; navFilter?: (items: ResolvedLayoutNode[], ctx: { editor: Editor; event: CairnEvent }) => ResolvedLayoutNode[] \| Promise<ResolvedLayoutNode[]>; attention?: (ctx: { editor: Editor; event: CairnEvent }) => AttentionItem[] \| Promise<AttentionItem[]>; preview?: PreviewTokenConfig }` | Injectable dependencies for `createContentRoutes`, grouped into the one bag the tidy action reads (`tidy.client` so a test's tidy action calls a stubbed model, `tidy.timeoutMs` to assert the deadline path), plus `navFilter`, a per-request filter over the site's whole arranged sidebar. `shellLoad` calls it, when configured, on every request, after every built-in gate (engine capability, `ownerOnly`, declarative `roles`) has already applied: `navFilter` receives the resolved `navLayout`'s top-level `items`, sections and loose entries, engine references included, and the signed-in editor, and returns the items to render. `fallback`, the trailing group of engine screens the layout never referenced, never passes through this seam, since it's engine-only and already gated; a site hides one of its own doors with `hidden: true` inside its own `navLayout` instead. A site whose own gating lives outside cairn (a role stored in its own D1, say) uses this to hide a section or an item from an editor who fails that check, rather than teasing a link the route then refuses. The engine awaits an async filter fresh every request and never caches its result; absent `navFilter`, the shell renders exactly the arranged, gated tree. `attention` is the site's per-session pending-work seam (see [the attention seam](#the-attention-seam)): awaited exactly once per request, after nav resolution and `navFilter` have both already run, and never cached by the engine. `preview` is the TTL [`previewMintAction`](#createcontentroutes) mints against, absent resolving to [`PreviewTokenConfig`](#types)'s own seven-day default. |
| `ContentRoutes` | Unstable API | `type ContentRoutes` | What `createContentRoutes` returns: the load and action vocabulary a site can mount by hand, shown expanded in [`createContentRoutes`](#createcontentroutes). The engine's Media Library janitorial actions (bulk delete, orphan scan and purge, replace, alt propagation, per-asset delete and update, and the Library-direct upload) are not members: they reach the browser only through [`createCairnAdmin`](#createcairnadmin). |
| <a id="previewtokenconfig"></a>`PreviewTokenConfig` | Unstable API | `interface PreviewTokenConfig { ttlMs?: number }` | A site's preview-token configuration for [`mintPreviewToken`](#mintpreviewtoken): how long a minted share link stays valid. `ttlMs` defaults to seven days (long enough to survive a weekend review) and must be finite, positive, and between one minute and thirty days inclusive; an out-of-range value throws a `PreviewTokenConfig:`-prefixed error at mint time. |
| <a id="previewdata"></a>`PreviewData` | Extension API | `interface PreviewData extends EntryData { preview: { state: 'draft' \| 'published'; expiresAt: string; published: { permalink: string } \| null } }` | [`previewLoad`](#previewload)'s data: a public entry page's own [`EntryData`](./delivery.md#entrydata), the exact shape `entryLoad` returns, plus `preview`, the metadata [`PreviewBanner`](./components.md#previewbanner) (or a site's own banner) reads. `preview.state` is `'draft'` while the shared branch is still open and `'published'` once it's gone; `preview.published` names the live permalink only in the `'published'` state, when the entry's file exists on the default branch, and is `null` otherwise (a discarded, never-published entry's branch-gone case never reaches this shape at all, since it answers a 404 instead). A compile-time assertion in the engine's own test suite proves this type adds no key beyond `preview`, so a future `EntryData` field breaks the engine's own build rather than a consuming site's. |
| `SaveFailure` | Unstable API | `interface SaveFailure { error: string; brokenLinks: string[]; body: string }` | A blocked save or publish: the one-line summary, the cairn tokens that resolve to no entry, and the author's edited markdown for reseeding the editor. |
| `DeleteRefusal` | Unstable API | `interface DeleteRefusal { error: string; inboundLinks: InboundLink[]; inboundKind?: 'link' \| 'include'; id: string }` | A refused delete: the one-line summary, the entries that still link to (or include) the refused one, and its id so a list marks the right row. `inboundKind` names which gate refused, `'include'` for a blocked fragment delete and `'link'` (the default when absent) otherwise, so the refusal copy names the real blocker. |
| `RenameFailure` | Unstable API | `interface RenameFailure { error: string }` | A refused rename (bad slug, collision, or pending edits): just the one-line summary. |
| `CreateFailure` | Unstable API | `interface CreateFailure { error: string }` | A refused create (bad slug, missing date, or an address collision): just the one-line summary. |
| `RevertFailure` | Unstable API | `type RevertFailure = { reason: 'draft_exists'; draftEditor: string; draftStartedAt: string } \| { reason: 'ref_unknown' } \| { reason: 'history_stale' }` | A refused revert (`ActionFailure<RevertFailure>`), fail-closed with no force path: `draft_exists` (`fail(409, ...)`, the blocking draft's own editor and start date) when a pending branch already exists for the entry, from `revertAction`'s own pre-check or `Backend.createBranch`'s typed `BranchExistsError` under a race; `ref_unknown` (`fail(404, ...)`) when the posted ref isn't a member of a fresh `listCommits` read, the 25-row window's own boundary; `history_stale` (`fail(409, ...)`) when the default branch moved since the history page rendered. There is no fourth reason for invalid old content: a retired field or vocabulary tag in the reverted version rides forward as an advisory on the edit screen instead, and never refuses the revert. |
| `PreviewMintFailure` | Unstable API | `interface PreviewMintFailure { error: string }` | A refused `previewMintAction` or `previewRevokeAction`: `fail(400)` from a mint whose entry carries no pending draft to share, or `fail(500)` from either action when `AUTH_DB` is missing the `preview_tokens` table (`migrations/0003_preview.sql` not yet applied), an actionable message naming the fix. Both actions answer the missing-table case with this same shape, since the engine ships the share affordance to every upgraded site's edit screen regardless of adoption. |
| `MediaDeleteRefusal` | Unstable API | `interface MediaDeleteRefusal { error: string; hash: string; usage: UsageEntry[]; foundIn: number }` | A refused media delete: the one-line summary, the asset's content hash, the where-used rows (published first, then by branch) the in-use face lists, and the distinct-entry count. `usage` is empty and `foundIn` is zero for an uncommitted asset or a media-off refusal. |
| `MediaUpdateFailure` | Unstable API | `interface MediaUpdateFailure { error: string; hash?: string }` | A refused media metadata edit (an asset not committed on the default branch, an invalid slug, or a manifest conflict): the one-line summary, and the edited asset's hash when known, so the Library re-opens the right slide-over. |
| `MediaReplaceFailure` | Unstable API | `interface MediaReplaceFailure { error: string; hash: string; usage: UsageEntry[]; foundIn: number }` | A refused media replace: the one-line summary, the asset's content hash, the where-used rows, and the distinct-entry count. Mirrors `MediaDeleteRefusal`: a fresh usage read found the asset still in use without the typed-slug override (409), or usage could not be verified or the bucket is unbound (503). |
| `MediaAltPropagateFailure` | Unstable API | `interface MediaAltPropagateFailure { error: string; hash?: string }` | A refused media alt-propagation: the one-line summary, and the asset's hash when known (absent from the alt-preview fetch action's own pre-hash failures), so the apply form's Library re-opens the right slide-over. Usage could not be verified across main and every open branch (503), or the bucket is unbound. Alt fill has no typed-slug gate. |
| `MediaBulkFailure` | Unstable API | `interface MediaBulkFailure { error: string }` | A refused media bulk delete or orphan purge: just the one-line summary. The whole batch failed closed because cross-branch usage could not be verified (503), or media is off / the bucket is unbound. Per-item outcomes ride the returned summary, not this fail. |
| `MediaUploadFailure` | Unstable API | `interface MediaUploadFailure { error: string }` | A refused upload: one of the pre-store gates (session, media-off, missing bucket, oversized or disallowed content) or the Library-direct commit's own conflict bounce. Just the one-line summary; a refusal here never stores bytes or commits a row. |
| `ContentFormFailure` | Unstable API | `type ContentFormFailure = Partial<SaveFailure & DeleteRefusal & RenameFailure & CreateFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure>` | The shape a route's single `form` export presents to a view component: whichever content action last failed, every field optional, `error` always set on a failure. The media refusals merge in too, so the Media Library's one `form` prop carries a `?/mediaDelete`, `?/mediaUpdate`, `?/mediaReplace`, or `?/mediaAltPropagate` refusal. |
| `EditorRoutesOptions` | Unstable API | `interface EditorRoutesOptions { roles?: RolesDeclaration }` | Configuration for `createEditorRoutes`: the site's declared role vocabulary; omitted, the routes validate and resolve against the implicit owner/editor pair. |
| `EditorRoutes` | Unstable API | `type EditorRoutes` | What `createEditorRoutes` returns: the owner-gated editor-management load and actions, shown expanded in [`createEditorRoutes`](#createeditorroutes). |
| `NavLoadData` | Extension API | `interface NavLoadData { menu: { name; label; maxDepth }; tree: NavNode[]; pages: NavPageOption[]; saved; error: string \| null }` | The nav editor's load data: the menu meta, the current tree, the page options, and the status flags. |
| `NavSaveFailure` | Unstable API | `interface NavSaveFailure { error: string }` | A refused nav save (an invalid posted tree, or the config's head moved since the editor opened the page): just the one-line summary. |
| `NavRoutes` | Unstable API | `type NavRoutes` | What `createNavRoutes` returns: the nav editor's load and save functions, shown expanded in [`createNavRoutes`](#createnavroutes). |
| <a id="cairnadminoptions"></a>`CairnAdminOptions` | Extension API | `interface CairnAdminOptions { auth?: Partial<AuthRoutesConfig>; tidy?: ContentRoutesOptions['tidy']; navFilter?: ContentRoutesOptions['navFilter']; attention?: ContentRoutesOptions['attention']; preview?: ContentRoutesOptions['preview'] }` | Injectable dependencies for `createCairnAdmin`, grouped into the bags a site actually overrides. `auth` is [`AuthRoutesConfig`](#authroutesconfig) made fully optional, so it references that shape once instead of re-declaring it; `auth.branding` defaults from the runtime's `siteName` and `sender` when omitted, `auth.send` is the same seam the underlying auth factory takes, and `auth.bootstrapOwner` is the [config-declared bootstrap owner](#createauthroutes). `tidy`, `navFilter`, `attention`, and `preview` all forward verbatim to the wrapped content routes: `tidy` is what the tidy action reads, `navFilter` is the per-request arranged-nav filter `shellLoad` calls, `attention` is the per-session pending-work seam (see `ContentRoutesOptions` below and [the attention seam](#the-attention-seam)), and `preview` is the preview-link lifetime `previewMint` mints against, so a site built on this single-mount facade reaches the same seams a site calling `createContentRoutes` directly gets. `roles` and `access`, the declared role vocabulary and access map, are not deps here: they live on the adapter (`CairnAdapter.roles`, `CairnAdapter.access`) and reach `createCairnAdmin` through the composed `runtime.roles`/`runtime.access` instead. Each handler resolves its content backend from `event.locals.cairnBackend`, so a dev or test backend rides locals rather than a dep. |
| `CairnAdminRoutes` | Extension API | `type CairnAdminRoutes` | What `createCairnAdmin` returns: the one `load`, the full `actions` vocabulary, and `shellLoad`, shown expanded in [`createCairnAdmin`](#createcairnadmin). |
| `AdminData` | Extension API | `type AdminData = { view: 'login' \| 'confirm' \| 'list' \| 'edit' \| 'history' \| 'editors' \| 'nav' \| 'media' \| 'settings' \| 'vocabulary' \| 'help' \| 'welcome'; page }` | One admin view's data, discriminated on `view` for the admin page component's switch. Each member carries only its view's own `page` (`ListData`, `EditData`, `HistoryData` for the `history` view, `MediaLibraryData`, `NavLoadData`, `VocabularyLoadData` for the `vocabulary` view, `WelcomeData` for the `welcome` view, the auth page data, or the editor list); the shared chrome rides the separate shell load (`AdminShellData`), not this per-view load. |
| `WelcomeData` | Extension API | `interface WelcomeData { displayName: string; siteName: string }` | The `'welcome'` view's data: the calm, minimal admin-root landing a none-capability role with no declared `home` gets. [`CairnAdmin`](./components.md#cairnadmin) switches it to a bare internal view inside the shell, so any site-granted nav stays visible. |
| `HealthData` | Extension API | `interface HealthData { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail? } } }` | The `/healthz` payload: the overall status and the signing self-test result. |
| `CookieJar` | Extension API | `interface CookieJar { get; set; delete }` | The cookie accessor the auth helpers use, matching SvelteKit's `cookies`. |
| `HandleInput` | Extension API | `interface HandleInput { event: CairnEvent; resolve(event): Promise<Response> \| Response }` | The argument the `createAuthGuard` handle receives, matching SvelteKit's `Handle` input; `event` is [`CairnEvent`](#the-event-shape). |
| `AuthGuardOptions` | Scaffold API | `interface AuthGuardOptions { roles?: RolesDeclaration; access?: AccessMap; includeSubDomains?: boolean }` | Configuration for `createAuthGuard`: the site's declared role vocabulary and access map, and whether the admin `Strict-Transport-Security` header pins sibling subdomains; each omitted defaulting to today's zero-config behavior (see [`createAuthGuard`](#createauthguard)). |
| <a id="platformcontext"></a>`PlatformContext` | Extension API | `interface PlatformContext<Env> { env?: Env }` | The Cloudflare platform wrapper an event carries. The engine reads only `env`; a site's own `App.Platform` type is free to carry other members (`ctx`, and so on) alongside it, since a real SvelteKit `RequestEvent` has more than this structural subset and still satisfies it. |
| <a id="cairnenv"></a>`CairnEnv` | Extension API | `interface CairnEnv { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string \| boolean; EMAIL?: EmailSender; GITHUB_APP_PRIVATE_KEY_B64?: string }` | The Worker bindings and vars the whole engine reads, all optional: the D1 session store, the canonical confirmation-link origin, the `CAIRN_DEV_BACKEND` tripwire flag the guard reads, the Email Sending binding, and the GitHub App's private-key secret. One shape serves every factory that needs platform bindings, rather than a per-layer split; every member is optional, since a test or a partial handler builds one piece at a time. A site's `app.d.ts` names {@link CairnPlatformBindings} instead, a recommended convenience preset that makes the members every site needs compile-checked (not a requirement: see that type's own row). |
| `EmailSender` | Extension API | `interface EmailSender { send(message: MagicLinkMessage): Promise<unknown> }` | The email-sending seam `CairnEnv['EMAIL']` and `CairnPlatformBindings['EMAIL']` both reference. `Promise<unknown>`, not `Promise<void>`, so a Cloudflare Email Sending binding's `SendEmail.send` (`Promise<EmailSendResult>`) satisfies it structurally with no cast. |
| <a id="cairnplatformbindings"></a>`CairnPlatformBindings` | Extension API | `interface CairnPlatformBindings { AUTH_DB: D1Database; EMAIL: EmailSender; PUBLIC_ORIGIN: string; GITHUB_APP_PRIVATE_KEY_B64: string; ANTHROPIC_API_KEY?: string }` | The Cloudflare bindings and vars every cairn site's Worker needs. Every member but `ANTHROPIC_API_KEY` is required (not optional), so a binding a site forgets to wire fails `app.d.ts` at compile time rather than surfacing as a runtime `config.bindings-missing` error. **A recommended convenience preset, not a requirement:** every route factory's env parameter is `CairnEnv`, structurally satisfied by a bare `wrangler types`-generated env too (`EmailSender.send` returns `Promise<unknown>`, which structurally accepts `@cloudflare/workers-types`' wider `Promise<EmailSendResult>`), so intersecting this type exists to catch a forgotten binding at compile time, not to unblock a route factory assignment. `ANTHROPIC_API_KEY` stays optional since only the opt-in tidy action reads it. The GitHub App's id and installation id aren't runtime bindings: the adapter passes them as compile-time config to `githubApp({ appId, installationId })`, and only the private key names a Worker secret this type carries. `/sveltekit` is the canonical home for this and the other binding-shaped types; intersect it into `App.Platform.env` (`/ambient` augments only `App.Locals`, never `App.Platform`, since a second `Platform` declaration would collide with a site's own through interface merging): `env: CairnPlatformBindings & { /* the site's own bindings */ }`. A media-enabled site also intersects `CairnMediaBindings`. |
| <a id="cairnmediabindings"></a>`CairnMediaBindings` | Extension API | `interface CairnMediaBindings { MEDIA_BUCKET: R2Bucket }` | The R2 binding a media-enabled site adds to its `Platform.env` intersection, split from `CairnPlatformBindings` since it exists only when the adapter's [`media` member](./core.md#media-adapter-member) turns media on: `env: CairnPlatformBindings & CairnMediaBindings & { /* the site's own bindings */ }`. `MEDIA_BUCKET` is the conventional binding name this preset assumes; a site whose adapter names a different `bucketBinding` declares that name in its own env intersection instead of this preset. |
| `TidyClient` | Unstable API | `interface TidyClient` | The Anthropic Messages API surface the tidy action calls; a test injects a stub through `ContentRoutesOptions.tidy.client`. |
| `TidyResult` | Unstable API | `interface TidyResult { corrected: string; model: string; tokens: { input_tokens: number; output_tokens: number } }` | The successful tidy outcome: the corrected markdown, the model that produced it, and the token usage. The diff is computed client-side; the server commits nothing. |
| `DictionaryAddResult` | Unstable API | `interface DictionaryAddResult { words: string[] }` | The personal-dictionary add outcome: the merged, canonical sorted word list after the add landed. |
| `MediaBulkDeleteResult` | Unstable API | `interface MediaBulkDeleteResult { deleted: string[]; skipped: BulkDeleteSkip[]; failed: { hash: string; error: string }[] }` | The bulk-delete outcome: the deleted hashes, the skipped rows from the partition, and any per-object R2 delete failure. |
| `MediaOrphanPurgeResult` | Unstable API | `interface MediaOrphanPurgeResult { purged: string[]; skippedClaimed: string[]; failed: { key: string; error: string }[] }` | The orphan-purge outcome: the purged R2 keys, the keys skipped because their hash was claimed since the scan, and any per-object delete failure. |
| `MediaReplacePreviewEntry` | Unstable API | `interface MediaReplacePreviewEntry` | One entry `MediaReplacePreviewPlan.entries` rewrites, enriched with its display title, permalink, and per-reference placement diff. |
| `MediaReplacePreviewPlan` | Unstable API | `interface MediaReplacePreviewPlan { affectedCount: number; entries: MediaReplacePreviewEntry[]; branchDelta: BranchRef[] }` | The replace-preview plan: the affected main entries, the distinct affected count, and the report-only cross-branch delta. Display-only; the apply re-derives its own plan. |
| `MediaAltPreviewPlan` | Unstable API | `interface MediaAltPreviewPlan { entries: MediaAltPreviewEntry[]; branchDelta: BranchRef[]; counts: { willFill: number; customized: number; decorativeSkipped: number } }` | The alt-propagation preview plan: every entry that references the asset, the cross-branch delta, and the placement counts by bucket. |
| `MediaAltPreviewEntry` | Unstable API | `interface MediaAltPreviewEntry` | One entry `MediaAltPreviewPlan.entries` reports, enriched with its display title, permalink, and per-reference placement bucket (will-fill, customized, or decorative-skipped). |
| `MediaLibraryEntry` | Extension API | `interface MediaLibraryEntry { hash: string; slug: string; ext: string; contentType: string; displayName: string; alt: string; width: number \| null; height: number \| null; bytes: number; createdAt: string }` | A re-export of [`MediaLibraryEntry`](./admin-toolkit.md#medialibraryentry): one stored asset in the picker's projected library, keyed elsewhere by the 16-hex content hash. `/admin-toolkit` is its canonical home, beside `MediaPicker`, the component whose prop signature names it; this subpath re-exports the same type so a route-factory importer can name a member of the data it already holds. |
| `UsageEntry` | Unstable API | `interface UsageEntry` | One entry that references an asset, in the shape the where-used screen links and groups by. |
| `MediaOrphanScanResult` | Unstable API | `interface MediaOrphanScanResult { orphanedBytes: OrphanByteRow[]; brokenRefs: BrokenRefRow[] }` | The orphan-scan surface model: the two row sets the Library's scan view renders. |
| `OrphanByteRow` | Unstable API | `interface OrphanByteRow { key: string; hash: string }` | A purgeable orphan: a stored R2 key with no manifest row, plus the 16-hex hash parsed from it. |
| `BrokenRefRow` | Unstable API | `interface BrokenRefRow { hash: string; slug: string; usage: UsageEntry[] }` | A broken reference: a manifest row whose bytes are gone. Read-only; the screen shows where it is used so an operator can re-ingest. |
| `RepointPlacement` | Unstable API | `interface RepointPlacement` | One repointed reference in a replace preview: which surface it lived on, the old token as written, and the new token. |
| `AltPlacement` | Unstable API | `interface AltPlacement` | One placement of the target hash in an alt-fill preview: which surface it lives on, its bucket, the existing alt, and the alt after the transform. |
| `BranchRef` | Unstable API | `interface BranchRef` | One open edit branch that also references the asset, with the entries on it. Report-only; an apply rewrites main, never a branch. |
| `BulkDeleteSkip` | Unstable API | `interface BulkDeleteSkip` | One selected hash a bulk delete does not delete, with why and (for the where-used case) its usage rows. |
| `AccessMap` | Extension API | `type AccessMap = Record<string, string[]>` | A site's whole access declaration: a target to the role names admitted to it. See [`AccessMap`](./core.md#access-map). |
| `Backend` | Extension API | `interface Backend` | The live, connected content store the engine resolves per request. See [`Backend`](./core.md#stable-api). |
| `BackendProvider` | Extension API | `interface BackendProvider` | The adapter's `backend` value: carries the `kind` and default `branch`, and `connect(env)`s to a live `Backend`. |
| `CairnRuntime` | Extension API | `interface CairnRuntime` | The composed runtime the engine serves from; every factory here takes one as its first argument. |
| `NamedField` | Extension API | `type NamedField = FieldDescriptor & { name: string }` | A field descriptor with its frontmatter key re-attached as `name`, the normalized shape `ConceptDescriptor.fields` and `EditData.fields` carry. |
| `Capability` | Extension API | `type Capability = 'owner' \| 'editor' \| 'none'` | The three levels the engine understands. See [`Capability`](./core.md#capability). |
| `RolesDeclaration` | Extension API | `type RolesDeclaration = Record<string, RoleDeclaration>` | A site's whole role vocabulary. See [`RolesDeclaration`](./core.md#roles). |
| `RoleDeclaration` | Extension API | `type RoleDeclaration = Capability \| { capability: Capability; home?: string }` | One role's mapping in a `defineRoles` vocabulary. See [`RoleDeclaration`](./core.md#roles). |
| `MediaEntry` | Extension API | `interface MediaEntry` | One stored asset's row: its content hash, its human layer, and its byte and pixel facts. See [`MediaEntry`](./media.md#types). |
| `InboundLink` | Unstable API | `interface InboundLink` | One inbound linker: enough to name it and link to its edit page in the delete guard. |
| `NavNode` | Extension API | `interface NavNode { label: string; url?: string; children?: NavNode[] }` | One navigation node: label, optional url, optional children. See [`NavNode`](./core.md#stable-api). |
| `VocabularyEntry` | Extension API | `interface VocabularyEntry { value: string; label: string }` | One editor-owned tag: a frozen slug `value` and an editable display `label`. See [`VocabularyEntry`](./core.md#stable-api). |
| `TidyConventions` | Extension API | `interface TidyConventions` | The corrected convention set the tidy prompt builder consumes. See [`TidyConventions`](./core.md#types). |
| `RepoFile` | Extension API | `interface RepoFile { id: string; name: string; path: string }` | A markdown file in a concept directory: id, name, path. |
| `CommitAuthor` | Extension API | `interface CommitAuthor { name: string; email: string }` | A commit author: the signed-in editor's name and email. |
| `FileChange` | Extension API | `interface FileChange { path: string; content: string \| null }` | One path change in a commit: write `content`, or delete the path when `content` is null. |
| `ComponentRegistry` | Extension API | `interface ComponentRegistry` | The single source the render pipeline and the editor palette both read. See [`ComponentRegistry`](./core.md#render). |
| `ComponentDef` | Extension API | `interface ComponentDef` | A site component: how it inserts (editor) and how it renders (rehype). See [`ComponentDef`](./core.md#render). |
| `ComponentContext` | Extension API | `interface ComponentContext` | The structured input a component's `build` receives. See [`ComponentContext`](./core.md#types). |
| `IconSet` | Extension API | `type IconSet = Record<string, string>` | A glyph name to SVG path-data map the site owns. |
| `VariantSpec` | Extension API | `interface VariantSpec` | A single image variant: the resize and format directives Cloudflare Images applies. See [`VariantSpec`](./media.md#types). |
| `FragmentResolve` | Extension API | `type FragmentResolve = (id: string) => string \| undefined` | Resolve a fragment id to its raw markdown body, for the `::include` directive. |
| `LinkResolve` | Extension API | `type LinkResolve = (ref: CairnRef) => string \| undefined` | Resolve a `CairnRef` to its live permalink. |
| `MediaResolve` | Extension API | `type MediaResolve = (ref: MediaRef) => string \| undefined` | Resolve a `media:` reference to its live delivery URL. |
| `CairnRef` | Extension API | `interface CairnRef { concept: string; id: string }` | A resolved reference to a content entry by its concept and permanent id. |
| `MediaRef` | Extension API | `interface MediaRef { slug: string \| null; hash: string }` | A resolved reference to a media asset by its content-hash prefix, with an optional display slug. |
| `EmailAttachment` | Extension API | `interface EmailAttachment` | A file or inline attachment for the Email Sending API. |
| `EmailRecipient` | Extension API | `type EmailRecipient = string \| { email: string; name?: string }` | A `cc`/`bcc` recipient for the Email Sending API: a bare address, or an address with a display name. |
| `ConceptDescriptor` | Extension API | `interface ConceptDescriptor` | The engine-internal, uniform view of one concept after normalization. See [`ConceptDescriptor`](./core.md#stable-api). |
| `SenderConfig` | Extension API | `interface SenderConfig { from: string; replyTo?: string }` | Magic-link sender identity for Cloudflare Email Sending. |
| `NavMenuConfig` | Extension API | `interface NavMenuConfig` | A git-committed YAML menu the nav editor manages. |
| `AssetConfig` | Extension API | `interface AssetConfig` | A site's media configuration. See [`AssetConfig`](./media.md#types). |
| `PreviewConfig` | Extension API | `interface PreviewConfig` | The live site's stylesheets and container classes for the edit page's preview frame. |
| `RoutingRule` | Extension API | `interface RoutingRule { routable: boolean; dated: boolean; inFeeds: boolean }` | Concept-fixed routing for a normalized concept. |
| `ValidationResult` | Extension API | `type ValidationResult` | A validator's verdict: normalized data, or field-keyed `errors` plus the additive located `issues`. |
| `ValidationIssue` | Extension API | `interface ValidationIssue` | One validation failure located by a `path` and its message. |
| `FieldDescriptor` | Extension API | `type FieldDescriptor` | The plain-data descriptor union the form, validator, and inference all read. See [Field types](./core.md#field-types). |
| `Fieldset` | Extension API | `interface Fieldset<R>` | The schema a `fieldset` call returns, carrying the descriptors, the behavior table, the validator, and the Standard Schema property. |
| `TextField` | Extension API | `interface TextField` | A single-line text input. One of `FieldDescriptor`'s fifteen arms; see [Field types](./core.md#field-types). |
| `TextareaField` | Extension API | `interface TextareaField` | A multi-line text input. |
| `NumberField` | Extension API | `interface NumberField` | A numeric input. |
| `SelectField` | Extension API | `interface SelectField` | A single-choice input over a closed option list. |
| `MultiselectField` | Extension API | `interface MultiselectField` | A multiple-choice input. |
| `UrlField` | Extension API | `interface UrlField` | A URL input whose format the validator enforces. |
| `EmailField` | Extension API | `interface EmailField` | An email-address input whose format the validator enforces. |
| `DateField` | Extension API | `interface DateField` | A calendar-date input. |
| `DatetimeField` | Extension API | `interface DatetimeField` | A date-and-time input. |
| `BooleanField` | Extension API | `interface BooleanField` | A checkbox; absent means false. |
| `IconField` | Extension API | `interface IconField` | A glyph chosen from the adapter's icon set. |
| `ImageField` | Extension API | `interface ImageField` | A hero image whose stored value is the nested `ImageValue` object. |
| `ObjectField` | Extension API | `interface ObjectField` | A group of leaf fields, stored as a nested object. |
| `ReferenceField` | Extension API | `interface ReferenceField` | A single edge to one entry of a named concept, stored as that target's permanent id. |
| `ArrayField` | Extension API | `interface ArrayField` | A repeatable field whose stored value is a list of its item's values. |
| `BehaviorTable` | Extension API | `type BehaviorTable = Record<string, FieldBehavior>` | The behavior table co-bundled with a fieldset, keyed by field name. |
| `FieldBehavior` | Extension API | `interface FieldBehavior` | Function-valued behavior a field descriptor cannot carry as plain data: a cross-field `validate` and an array row's `itemLabel` deriver. |
| `SlotDef` | Extension API | `interface SlotDef` | One named content region of a component. |
| `CookieSetOptions` | Extension API | `interface CookieSetOptions { path: string; httpOnly?; secure?; sameSite?; maxAge? }` | The options `CookieJar.set` takes: standard cookie attributes, `path` required. |
| `TidyConfig` | Extension API | `interface TidyConfig { enabled?; model?; conventions? }` | The tidy block on the site config. See [`TidyConfig`](./core.md#types). |
| <a id="editor"></a>`Editor` | Extension API | `interface Editor` | The signed-in admin identity the whole admin reads. See [`Editor`](./core.md#editor). |
| `AuthBranding` | Extension API | `interface AuthBranding { siteName: string; from: string; replyTo?: string }` | Per-site identity for the magic-link email; `AuthRoutesConfig.branding` takes this shape. |
| `MagicLinkMessage` | Extension API | `interface MagicLinkMessage` | The message a built magic-link email carries. See [`MagicLinkMessage`](./core.md#stable-api). |
| `SendMagicLink` | Extension API | `type SendMagicLink = (env: CairnEnv, message: MagicLinkMessage) => Promise<void>` | The injected send a custom `SendMagicLink` implements; `AuthRoutesConfig.send` takes this shape. |
