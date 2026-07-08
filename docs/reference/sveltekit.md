# SvelteKit (`@glw907/cairn-cms/sveltekit`)

This subpath holds the server side of the admin. The canonical wiring is the single mount:
`createCairnAdmin` serves every admin view through one `load` and one `actions` record, which a
site's catch-all `/admin/[...path]` route re-exports, plus the `Handle` that guards `/admin` from
`hooks.server.ts`. The two files and the composer behind them are in
[the canonical admin mount](./admin-routes.md). The per-surface factories the facade wraps
(`createAuthRoutes`, `createContentRoutes`, and friends) stay public as the advanced seam for a
site that mounts routes by hand.

```ts
import { createAuthGuard, createCairnAdmin, healthLoad } from '@glw907/cairn-cms/sveltekit';
import type { AdminData, AdminShellData, ListData, EditData } from '@glw907/cairn-cms/sveltekit';
```

The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate checks every
name here against them.

---

## Single-mount admin (recommended)

The facade and its two guard helpers: the one path most sites wire.

### `createAuthGuard`

Stability tier: Scaffold API.

```ts
declare function createAuthGuard(): ({ event, resolve }: HandleInput) => Promise<Response>;
```

Build the SvelteKit `Handle` that gates every `/admin/**` path and hardens the admin response
headers. Wire it in `hooks.server.ts`. A site with its own hook keeps it by sequencing the guard
last, so the site hook sees every request and the guard owns admin gating.

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { theme } from './theme-handle.js';

export const handle = sequence(theme, createAuthGuard());
```

### `createCairnAdmin`

```ts
declare function createCairnAdmin(runtime: CairnRuntime, deps?: CairnAdminDeps): {
  load: (event: AdminEvent) => Promise<AdminData>;
  actions: Record<string, (event: AdminEvent) => Promise<unknown>>;
  shellLoad: (event: AdminEvent) => Promise<{ shell: AdminShellData }>;
};
```

The single-mount admin facade. It instantiates the auth, content, editor, and nav route
factories over the composed runtime and serves every admin view through one `load`, so a site
mounts the whole admin with a single catch-all route instead of a tree of per-route files. The
load parses `event.url.pathname` internally and dispatches: an unrecognized path is a 404,
`/admin` redirects to the first concept's list, the public login and confirm views return bare
page data, and every authed view returns its own `page` data. The nav view is a 404 unless the
runtime configures a `navMenu`.

`shellLoad` is the shared `/admin/+layout.server.ts` load. It returns the lean shell payload that
[`CairnAdminShell`](./components.md#cairnadminshell) renders: the streamed pending count for an authed
path, and a bare payload that returns early for the public login and auth paths. The chrome loads
once for the whole `/admin/**` subtree rather than per view. Stability tier: Extension API, a
versioned seam a site's own `/admin/` route depends on.

`deps.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass no deps. The
showcase reads through a fake GitHub backend in development, which rides `event.locals.backend` from a
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
| `publish` | edit | the entry publish |
| `discard` | edit | the pending-edit discard |
| `rename` | edit | the entry rename |
| `delete` | edit, list | the entry delete (id from the path, or from the form body on a list) |
| `publishAll` | list, edit, editors, nav | the site-wide publish |
| `addEditor`, `removeEditor`, `setRole` | editors | the owner-gated editor management |

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
declare function requireSession(event: { locals: { editor?: Editor | null } }): Editor;
```

Return the session the guard already resolved, or throw a redirect to `/admin/login`. Call it at the
top of a protected `load` or action when you need the signed-in editor. Its parameter is structural
and asks only for `locals`, so any event shape that carries the guard's editor satisfies it.

```ts
import { requireSession } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireSession(event);
  return { displayName: editor.displayName };
};
```

### `requireOwner`

```ts
declare function requireOwner(event: { locals: { editor?: Editor | null } }): Editor;
```

Return a signed-in owner, or throw a 403 for an editor. Guards the management surface, such as the
editor list, where only an owner may act. Its parameter is the same minimal structural shape
`requireSession` asks for (just `locals.editor`), so a custom `/admin/` route's standard load event
satisfies it: a hand-built admin screen gates itself with one call and needs no engine event type.
Stability tier: Extension API.

```ts
import { requireOwner } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  requireOwner(event);
  return { canManage: true };
};
```

### `adminAction`

Stability tier: Extension API.

```ts
declare function adminAction<T>(
  handler: (args: { event: AdminActionEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
  deps?: AdminActionDeps,
): (event: AdminActionEvent) => Promise<T>;
```

Wrap a custom admin action's handler (Part C item 3 of the phase-2 design suite): the admin-scoped
server helper a site's own `/admin/` form action calls for the engine's editor and audit contract.
`createAuthGuard` already verifies the double-submit CSRF token on every unsafe POST under
`/admin/**`, custom routes included, before any route's own action runs, so `adminAction`'s own CSRF
check is defense-in-depth, not the sole gate; its real job is resolving the signed-in editor as a
typed `ctx.editor` and requiring an audit emit for a mutating action, a hook the engine has no other
seam for.

In order, fail-closed at every step: (1) `event.locals.editor` must be populated, else a 403 (the
handler never runs); (2) the CSRF cookie and the posted `csrf` field must match, constant-time, else
a 403; (3) the handler runs once, reading `event.request.formData()` exactly once so the handler
never re-reads an already-consumed body; (4) a handler that returns normally (its request succeeded)
must call `ctx.audit` at least once. A successful mutating action that emits zero audit records
throws `AdminActionError(500, ...)` in dev (`esm-env`'s `DEV`, overridable through `deps.isDev` for a
test) and logs `admin.action.unaudited` in production, since an unaudited state change is a defect
here but should never 500 a live site. A handler that returns SvelteKit's `fail()` (an
`ActionFailure`, detected with `@sveltejs/kit`'s own `isActionFailure`) is exempt from the required-audit
check: a rejected request mutated nothing, so it owes no audit, and a validation reject never needs
a spurious `ctx.audit` call just to satisfy the wrapper. The exemption assumes the handler rejects
before mutating; a handler that writes and then returns `fail()` must still emit its own audit,
since nothing rolls its writes back and the wrapper can't see them. Every emit logs `admin.action.audited` (see
[log events](./log-events.md)) and, when the site sets one, forwards the record to
`event.locals.auditSink`.

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
  loginLoad: (event: RequestContext) => { siteName: string; error: string | null; csrf: string };
  requestAction: (event: RequestContext) => Promise<RequestResult>;
  confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null; csrf: string };
  confirmAction: (event: RequestContext) => Promise<never>;
  logoutAction: (event: RequestContext) => Promise<never>;
};
```

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
declare function createEditorRoutes(): {
  editorsLoad: (event: RequestContext) => Promise<{ editors: Editor[]; self: string }>;
  addEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  removeEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  setRoleAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
};
```

Build the loads and actions for the editor-management view at `/admin/editors`. `editorsLoad` lists
the editors and names the current user. The three actions add an editor, remove one, and change a
role, each returning a typed `ActionFailure` on a guard or validation error.

```ts
// src/routes/admin/(app)/editors/+page.server.ts (per-route mounting)
import { createEditorRoutes } from '@glw907/cairn-cms/sveltekit';

const editors = createEditorRoutes();

export const load = editors.editorsLoad;
export const actions = {
  addEditor: editors.addEditorAction,
  removeEditor: editors.removeEditorAction,
  setRole: editors.setRoleAction,
};
```

### `createContentRoutes`

Stability tier: Unstable API.

```ts
declare function createContentRoutes(runtime: CairnRuntime, deps?: ContentRoutesDeps): {
  shellPayload: (event: ContentEvent) => Promise<{ shell: AdminShellData }>;
  helpLoad: (event: ContentEvent) => Promise<HelpData>;
  indexRedirect: () => never;
  listLoad: (event: ContentEvent) => Promise<ListData>;
  mediaLibraryLoad: (event: ContentEvent) => Promise<MediaLibraryData>;
  settingsLoad: (event: ContentEvent) => SettingsData;
  settingsSave: (event: ContentEvent) => Promise<never>;
  vocabularyLoad: (event: ContentEvent) => Promise<VocabularyLoadData>;
  vocabularySave: (event: ContentEvent) => Promise<never>;
  createAction: (event: ContentEvent) => Promise<never>;
  editLoad: (event: ContentEvent) => Promise<EditData>;
  saveAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  publishAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  publishAllAction: (event: ContentEvent) => Promise<never>;
  discardAction: (event: ContentEvent) => Promise<never>;
  deleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  listDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  renameAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  uploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>;
  mediaLibraryUploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>;
  mediaDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  mediaBulkDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaBulkDeleteResult>;
  mediaOrphanScanAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | OrphanScan>;
  mediaPurgeOrphansAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaOrphanPurgeResult>;
  mediaUpdateAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  mediaReplacePreviewAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaReplacePreviewPlan>;
  mediaReplaceApplyAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  mediaAltPreviewAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaAltPreviewPlan>;
  mediaAltApplyAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  addDictionaryWordAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | DictionaryAddResult>;
  tidyAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | TidyResult>;
};
```

The core of the admin surface. It takes the composed runtime and returns the loads and actions for
the authed admin shell, the concept list, and the entry editor. `shellPayload` backs the shared admin
shell (the `/admin/+layout` load wires it through `createCairnAdmin`'s `shellLoad`): it returns the
lean `{ shell: AdminShellData }` chrome payload, bare for a public path and the streamed authed nav
otherwise. Its caller awaits it: `shellPayload` resolves `customNav` up front, applying the
engine's own role filter first, then the site's `deps.navFilter`, if configured, over that
already-filtered result (see `ContentRoutesDeps` below). `listLoad` with the `create`, `delete` (`listDeleteAction`), and `publishAll`
actions back a concept's list view, and `editLoad` with the `save`, `publish`, `discard`,
`delete`, and `rename` actions back the entry editor. `uploadAction` ingests an image for a
media-enabled site: a raw-body JSON endpoint that stores the bytes in R2, returns a `UploadResult`
(the `media:` reference and the server-owned record), and commits nothing until the entry is saved.
`mediaLibraryUploadAction` is its Library-direct sibling: it shares that store-and-derive body, then commits
the derived `media.json` row to the default branch in the same step, so an author can add an asset from
the Media Library without an entry to ride. Both derive every committed field server-side and trust no
client-posted record; a re-upload of identical bytes is an idempotent no-op.
`mediaLibraryLoad` backs the admin Media Library view: it unions `media.json` from the default
branch with every open `cairn/*` branch (so a not-yet-published asset shows, with the default
branch winning a same-hash tie), projects each row through the shared `mediaLibraryEntry` helper,
and attaches a per-hash where-used overlay (`MediaLibraryData`). `mediaDeleteAction` safe-deletes a
committed asset: it rechecks usage against a fresh server-side index at delete time, refuses an
in-use asset (`MediaDeleteRefusal`) unless the form carries the typed-slug override, then commits
the `media.json` row removal before deleting the R2 object so a mid-failure leaves a benign orphan
rather than a broken delivery. `mediaUpdateAction` edits an asset's display name, slug, and default
alt in one row commit with no reference rewrite (the resolver keys on the hash), refusing a bad slug
with `MediaUpdateFailure`. The replace-in-place pair swaps one asset for another across the published
corpus. `mediaReplacePreviewAction` is a display-only fetch endpoint (the upload's `X-Cairn-CSRF` header
transport): it plans the rewrite of every entry that references the old asset and returns a
`MediaReplacePreviewPlan` (the affected entries with their per-reference diff, the affected count, and
a report-only cross-branch delta), committing nothing. `mediaReplaceApplyAction` re-derives that plan from a
fresh read, gates every replace behind a typed-slug confirm (`MediaReplaceFailure` on a wrong or
missing confirm), and rewrites every referencing entry plus the new `media.json` row in one commit;
it performs no R2 write, since the new bytes are already stored and the old asset's row is kept. Both
fail closed on an unverifiable usage read. The alt-propagation pair pushes an asset's default alt
across the same corpus. `mediaAltPreviewAction` plans the fill over that header transport and returns a
`MediaAltPreviewPlan` that sorts each placement into a will-fill bucket (an empty alt), a customized
bucket (a hand-written alt kept unless the editor opts in), or a decorative-hero bucket (left alone).
`mediaAltApplyAction` re-derives the plan from a fresh read, fills the empty alts (and the customized ones
when the `overwrite` opt-in is set), and commits only the entries it changes in one commit. It never
writes `media.json`, never gates on a typed slug, and never touches a decorative hero. The destructive
trio (`mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaPurgeOrphansAction`) clears assets and stored bytes in
bulk. `mediaBulkDeleteAction` is the single safe-delete gate applied per item over a selection: it builds
one strict cross-branch usage index for the whole batch, deletes the assets nothing references, and
skips any still in use, reporting them in the returned `MediaBulkDeleteResult` (its `deleted`,
`skipped`, and `failed` arrays) rather than force-deleting. The row removals land as one commit before
the R2 objects are deleted, so a bulk delete is reversible from git history, the same delete-order the
single safe-delete uses. `mediaOrphanScanAction` runs a storage reconcile plus a strict usage read and
returns the `OrphanScan` projection: `orphanedBytes` (stored keys with no manifest row and no
reference anywhere across `main` and every open branch) and the broken-reference rows (manifest hashes
whose bytes are gone). A branch-only upload's bytes are excluded from `orphanedBytes`, since the branch
that uploaded them references them. `mediaPurgeOrphansAction` is the one irreversible media action: it
deletes the raw R2 bytes, which carry no git history, so it gates on a typed-count confirm (the number
of files). At action time it re-derives the orphan set fresh and re-checks the strict usage index, so
a key that gained a manifest row or a new branch reference since the scan is skipped, never purged; the
`MediaOrphanPurgeResult` reports `purged`, `skippedClaimed`, and `failed`. All three fail closed: an
unverifiable cross-branch usage read refuses the whole batch (503) and commits nothing. The
single-mount composer registers the trio under `mediaBulkDelete`, `mediaOrphanScan`, and `mediaPurge`
(the purge action's shorter composer name), each gated to the media view, so the Media Library posts
`?/mediaBulkDelete`, `?/mediaOrphanScan`, and `?/mediaPurge`. The showcase runs in dev without a real
key because its fake GitHub backend rides `event.locals.backend` from a fenced dev handle, so no GitHub
App token mint runs.

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

`settingsLoad` and `settingsSave` back the tidy settings screen, and `vocabularyLoad` and
`vocabularySave` back the tag-vocabulary screen at `/admin/vocabulary`. `vocabularyLoad` returns the
`VocabularyLoadData` the screen renders: the committed `{ value, label }` vocabulary in config order
(`vocabulary`), each value's cross-branch in-use count (`usage`, keyed by value over the default
branch unioned with every open `cairn/*` branch), and the in-use-but-unlisted tags with their counts
(`unlisted`, the seed candidates). The usage overlay is best-effort: a failed read degrades `usage` to
`{}` and `unlisted` to `[]` while the committed `vocabulary` stays visible, since the strict gate lives
on the save, not the load. `vocabularySave` validates the posted vocabulary JSON, gates a delete on
that strict cross-branch usage (an in-use value cannot be removed, failing closed), then
read-modify-commits the `vocabulary` key into the same committed `src/lib/site.config.yaml` the tidy
settings write, head-guarded and bouncing a stale-head conflict back to the screen.

The editor copy-edit adds two more actions, both fetch-style on the upload transport. `addDictionaryWordAction`
commits an editor's personal-dictionary additions, and `tidyAction` runs the language-model tidy.
Neither is a form submit; both follow the [admin fetch action](#writing-an-admin-fetch-action) contract
below. Their request shapes and `fail` payloads:

- **`addDictionaryWordAction`.** A `text/plain` POST carrying JSON `{ word }` or `{ words: string[] }`, the
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
  (`{ corrected, model, usage }`, the corrected markdown plus the model id and token counts; the diff is
  computed on the client). A refusal returns `TidyFailure` (`{ error }`): `fail(403)` on a failed CSRF
  check, `fail(503)` when tidy is disabled or the API key is missing, `fail(413)` for an over-long body
  (tidy a selection instead), `fail(502)` for a deadline overrun, a client abort, a model error, or an
  empty result (all retryable), `fail(422)` for a model refusal, `fail(400)` for a malformed body. The
  `TidyResult`, `TidyFailure`, `DictionaryAddResult`, and `DictionaryAddFailure` shapes are
  admin-internal: the editor host reads them by `type`/`status` off the deserialized envelope, so they
  are not exported on the `sveltekit` subpath and carry no Types row.

Every action failure carries `error: string` as its one-line summary, alongside the payload that
names what refused: a blocked save or publish returns `SaveFailure` (the broken links and the
edited body), a refused delete returns `DeleteRefusal` (the inbound linkers and the entry id),
and a refused rename returns `RenameFailure`. The media actions add two more: a refused media
delete returns `MediaDeleteRefusal` (the asset hash, the where-used rows, and the count) and a
refused media metadata edit returns `MediaUpdateFailure`. A refused replace returns
`MediaReplaceFailure` (the same shape as the delete refusal) and a refused alt-propagation returns
`MediaAltPropagateFailure` (the bare summary). A page component types its `form` prop with
`ContentFormFailure`, the optional merge of all seven.

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
drives with `fetch` rather than a form submit, and the transport has two SvelteKit constraints worth
knowing before you write another fetch-style action or a client that calls one of these. A SvelteKit form action rejects any POST whose content type is not
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

## Navigation routes

### `createNavRoutes`

Stability tier: Unstable API.

```ts
declare function createNavRoutes(runtime: CairnRuntime): {
  navLoad: (event: ContentEvent) => Promise<NavLoadData>;
  navSave: (event: ContentEvent) => Promise<never>;
};
```

Build the load and save for the navigation editor at `/admin/nav`. `navLoad` reads the current menu
tree and the page options for the URL picker, and `navSave` commits an edited tree to the
git-committed site-config file. Like the content routes, a handler resolves its backend from
`event.locals.backend`, falling back to the runtime's connected backend. A production caller
passes no second argument. The `NavTree` component posts the named `?/save` action, so a
hand-mounted route registers `navSave` under `save`.

```ts
// src/routes/admin/(app)/nav/+page.server.ts (per-route mounting)
import { composeRuntime } from '@glw907/cairn-cms';
import { createNavRoutes } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

const nav = createNavRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = nav.navLoad;
export const actions = { save: nav.navSave };
```

The public read-model loaders live at [`@glw907/cairn-cms/delivery`](./delivery.md), where the
matching `CairnHead` component sits. See [the delivery reference](./delivery.md) for the worked
catch-all route.

## Health check

### `healthLoad`

Stability tier: Scaffold API.

```ts
declare function healthLoad(
  event: { platform?: { env?: BackendEnv } },
  runtime: CairnRuntime,
): Promise<HealthData>;
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

## The custom admin-nav seam

A site adds a sidebar link to one of its own `/admin/` routes by declaring an `adminNav` entry in its
adapter. The entries are plain data, validated when the runtime composes, so a bad icon or a colliding
href fails the build rather than rendering a broken or shadowing link. `adminNav` is a mix of flat
entries and one level of grouping: a plain `AdminNavEntry` folds into the built-in Core section
beside the content concepts, and an `AdminNavSection` (a label plus its own flat `children`) renders
as its own collapsible sidebar group, the way Part B's Club section joins Content/Media/Settings.
Stability tier: Extension API.

### `AdminNavEntry`

Stability tier: Extension API.

```ts
interface AdminNavEntry {
  label: string;
  icon: AdminNavIcon;
  href: string;
  ownerOnly?: boolean;
}
```

One developer-declared sidebar entry. `label` names the link, `icon` is a name from the bundled
allowlist (see [`AdminNavIcon`](#adminnavicon)), and `href` points at the site's own `/admin/` route.
The href must not collide with a built-in admin view; a collision throws at startup with the
conflicting view named. Set `ownerOnly` to hide the link from a non-owner. The flag is cosmetic, so the
route itself must still gate server-side.

### `AdminNavIcon`

Stability tier: Extension API.

```ts
type AdminNavIcon =
  | 'anchor'
  | 'calendar'
  | 'clipboard-list'
  | 'list'
  | 'users'
  | 'package'
  | 'inbox'
  | 'table'
  | 'wrench';
```

The bundled Lucide icon names an `AdminNavEntry` may use. An icon outside this allowlist throws when
the runtime composes.

### `ResolvedNavEntry`

Stability tier: Extension API.

```ts
interface ResolvedNavEntry {
  label: string;
  iconName: AdminNavIcon;
  href: string;
  ownerOnly: boolean;
}
```

The validated shape the shell renders, produced from an `AdminNavEntry`: the icon name resolved and
`ownerOnly` defaulted to false. The authed shell payload carries the role-filtered set of these.

### `AdminNavSection`

Stability tier: Extension API.

```ts
interface AdminNavSection {
  label: string;
  children: AdminNavEntry[];
}
```

One level of grouping: a named group of the developer's own flat entries, rendered as its own
collapsible sidebar group beside the built-in Core section. A section holds only flat entries, so
grouping stays exactly one level deep.

### `AdminNavConfig`

Stability tier: Extension API.

```ts
type AdminNavConfig = (AdminNavEntry | AdminNavSection)[];
```

A site's raw `adminNav` config: a mix of flat entries and sections, in declaration order. The
adapter's `editor.adminNav` field takes this shape.

### `ResolvedNavSection`

Stability tier: Extension API.

```ts
interface ResolvedNavSection {
  label: string;
  children: ResolvedNavEntry[];
}
```

The validated shape of an `AdminNavSection`, its children each resolved the same way a flat entry
is.

### `ResolvedNavItem`

Stability tier: Extension API.

```ts
type ResolvedNavItem = ResolvedNavEntry | ResolvedNavSection;
```

One resolved `adminNav` item: a flat entry, or a one-level section of them. `AdminShellData.customNav`
carries an array of these, and the shell renders a section as its own named sidebar group and folds a
flat entry into Core. Discriminate with `'children' in item`.

---

## The publish-actions seam

A site declares next-step links for the publish-success moment, the `adminNav` grammar applied
after a publish. A `publishActions` entry on the adapter's `editor` group is plain data, validated
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

A member who publishes a post now finds an *Announce* link waiting beside the confirmation strip,
already carrying that post's id. Omitting `concepts` follows every concept's publish. Naming one
or more concept ids restricts it, the same shape `adminNav`'s `ownerOnly` narrows a sidebar entry.

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

### `PublishActionLink`

Stability tier: Extension API.

```ts
interface PublishActionLink {
  label: string;
  href: string;
}
```

One resolved publish-success link, its href already templated for the published entry.
`EditData.publishActions` carries an array of these, filtered to the entry's concept. The edit
page renders them only alongside `EditData.publishedFlash`.

---

## Types

These are the route-data and config shapes the factories produce and consume. A `+page.svelte`
imports the matching `*Data` type to type its `data` prop.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `AuthRoutesConfig` | Unstable API | `interface AuthRoutesConfig { branding: AuthBranding; send?: SendMagicLink }` | The config `createAuthRoutes` takes: the email branding and an optional custom sender. |
| `RequestResult` | Unstable API | `type RequestResult = { status: 'sent'; sent: true } \| { status: 'send_error'; sent: false } \| { status: 'throttled'; sent: false }` | The magic-link request outcome `requestAction` resolves: a successful or membership-hiding send, a send error, or a cooldown throttle. A site reads `form.status` (or the legacy `form.sent` boolean) off this. |
| `AdminActionAudit` | Extension API | `interface AdminActionAudit { action: string; entity: string; entityId?: string \| number; detail?: string }` | One audit-log record an `adminAction`-wrapped handler emits through `ctx.audit`: the imperative verb, the domain entity, its id when the action names one, and a compact detail (never a secret, a token, or a full record). |
| `AdminActionAuditRecord` | Extension API | `type AdminActionAuditRecord = AdminActionAudit & { editor: string }` | What a site's `auditSink` receives: the `AdminActionAudit` record plus the acting editor's email. |
| <a id="adminactionauditsink"></a>`AdminActionAuditSink` | Extension API | `type AdminActionAuditSink = (record: AdminActionAuditRecord) => void` | A site-supplied sink for `adminAction`'s audit records, wired through `event.locals.auditSink`. Optional; every emit logs `admin.action.audited` regardless. |
| `AdminActionEvent` | Extension API | `interface AdminActionEvent { url: URL; request: Request; cookies: CookieJar; locals: { editor?: Editor \| null; auditSink?: AdminActionAuditSink } }` | The minimal event shape `adminAction` reads: enough to verify CSRF, resolve the editor, and reach the site's optional audit sink. A real SvelteKit `RequestEvent` satisfies it. |
| `AdminActionContext` | Extension API | `interface AdminActionContext { editor: Editor; audit: (record: AdminActionAudit) => void }` | What a wrapped handler receives: the verified editor and the bound `audit` emitter. |
| `AdminActionDeps` | Extension API | `interface AdminActionDeps { isDev?: boolean }` | Injectable dependencies for `adminAction`. `isDev` overrides the build-time dev flag (`esm-env`'s `DEV`) so a test can drive both branches of the required-audit path; every real caller takes the default. |
| `AdminActionError` | Extension API | `class AdminActionError extends Error { status: number }` | Thrown by `adminAction` on a failed guard (403) or a required-audit violation in dev (500). A site's error boundary reads `status` to render the right response. |
| `UploadResult` | Unstable API | `interface UploadResult { reference: string; record: MediaEntry; reused: boolean; mismatch: boolean }` | What `uploadAction` returns on a successful image upload: the `media:` reference the editor inserts, the server-owned manifest record, whether an identical asset was reused, and whether a same-name mismatch was found. |
| `AdminShellData` | Extension API | `type AdminShellData = { public: true; siteName } \| { public: false; siteName; user: { displayName; email; role }; concepts: NavConcept[]; customNav: ResolvedNavItem[]; pathname; canManageEditors; navLabel: string \| null; theme; collapsedNav; csrf; pendingEntries: Promise<{ concept; id }[] \| null> }` | The shared admin shell's payload, produced by `shellPayload` and rendered by [`CairnAdminShell`](./components.md#cairnadminshell). A discriminated union: a public (login/auth) path carries only the site name and renders bare; an authed path carries the full admin payload, the site identity, the signed-in editor, the nav, the active path, the CSRF token, and the pending entries, adds the developer's role-filtered `customNav`, and streams `pendingEntries` as a deferred promise so the shell never blocks on GitHub. |
| `NavConcept` | Extension API | `interface NavConcept { id: string; label: string }` | A sidebar concept entry, just enough to render the nav without shipping validators to the client. |
| `EntrySummary` | Extension API | `interface EntrySummary { id: string; title: string; date: string \| null; draft: boolean; status: 'published' \| 'edited' \| 'new'; summary: string \| null }` | One row in a concept's list view. `status` derives from the ref set: live as-is, live with held edits, or pending-branch only. `summary` is the row's one-line excerpt (the manifest's indexed summary for a published row, the branch frontmatter or body excerpt for a pending one, null when neither yields text). |
| `ListData` | Extension API | `interface ListData { conceptId; label; singular; dated; entries: EntrySummary[]; error: string \| null; formError: string \| null; publishedAll: number \| null }` | The concept list view's data, including a degraded-listing error, a create-form bounce error, and the publish-all flash count from `?publishedAll=`. `singular` is the create-affordance noun ("New post"), from the descriptor (defaulted to `label`). |
| `EditData` | Extension API | `interface EditData { conceptId; id; label; fields; frontmatter; body; title; isNew; saved; renamed; error; slug; linkTargets; mediaTargets: Record<string, { slug; ext; contentType }>; mediaLibrary: Record<string, { hash; slug; ext; contentType; displayName; alt; width; height; bytes }>; inboundLinks; pending; published; publishedFlash; publishActions: PublishActionLink[]; discardedFlash; preview: ResolvedPreview \| null; advisories: AdvisoryNotice[] }` | The entry editor's data: form-ready frontmatter, the body, the link targets, the media targets (the minimal resolver input keyed by content hash, empty when media is off or the read fails), the media library (the picker's full human layer keyed by the same content hash, projected from the same committed-manifest read, with the `hash` duplicated into each value for `Object.values` iteration, and degrading to empty on the same path as `mediaTargets`), the inbound links for the delete guard, the publish state (`pending` means the body came from the entry's branch; `published` means the file exists on the default branch), the site's [publish-actions](#the-publish-actions-seam) resolved for this entry (`publishActions`, rendered only alongside `publishedFlash`), the adapter's `preview` knob resolved for this entry's concept (its `byConcept` override applied; null when the site sets none, which leaves the frame unstyled behind a hint), and the non-blocking server-built `advisories` (today the cross-branch address collision, empty when there is none). |
| `AdvisoryNotice` | Extension API | `interface AdvisoryNotice { kind: string; severity: 'warn'; message: string; count?: number; actions?: AdvisoryAction[] }` | A non-blocking editor advisory carried on `EditData.advisories`, serializable so it rides the SSR boundary (data only, no callback). `kind` names the notice (`'address-collision'` today), `severity` is always `'warn'` (warn-and-allow, never a gate), `count` is an aggregating notice's running total, and `actions` are the offered links. |
| `AdvisoryAction` | Extension API | `interface AdvisoryAction { label: string; href?: string }` | One action an advisory offers: a button or link label and an optional `href` link target. |
| `MediaUsageInfo` | Extension API | `interface MediaUsageInfo { count: number; entries: UsageEntry[] }` | One asset's where-used overlay: the distinct-entry count (by concept and id) and every row (published and edit-branch origins), kept separate from `MediaLibraryEntry` so the picker projection stays decoupled. |
| `MediaLibraryData` | Extension API | `interface MediaLibraryData { assets: MediaLibraryEntry[]; usage: Record<string, MediaUsageInfo>; error: string \| null }` | The Media Library view's data: the assets unioned across the default branch and open `cairn/*` branches, the per-hash usage overlay (an asset with no key renders as "no references found"), and the degraded-load error. |
| `HelpData` | Extension API | `interface HelpData { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact? }` | The Help home view's data: the getting-started progress derived from the committed manifest and the open pending branches (degrading to 0 of 3 when GitHub is unreachable), the markdown reference (the component curates by group), and the runtime's optional support contact. |
| `ContentEvent` | Unstable API | `interface ContentEvent { url: URL; params; request: Request; locals: { editor? }; platform? }` | The structural event the content routes read; a real SvelteKit `RequestEvent` satisfies it. |
| <a id="contentroutesdeps"></a>`ContentRoutesDeps` | Unstable API | `interface ContentRoutesDeps { tidy?: { client?: (opts: { apiKey: string }) => TidyClient; timeoutMs?: number }; navFilter?: (items: ResolvedNavItem[], ctx: { editor: Editor; event: ContentEvent }) => ResolvedNavItem[] \| Promise<ResolvedNavItem[]> }` | Injectable dependencies for `createContentRoutes`, grouped into the one bag the tidy action reads (`tidy.client` so a test's tidy action calls a stubbed model, `tidy.timeoutMs` to assert the deadline path), plus `navFilter`, a per-request filter over the site's custom `adminNav` entries. `shellPayload` calls it, when configured, on every request, after its own role filter has already dropped any `ownerOnly` entry the signed-in editor cannot see: `navFilter` receives only the custom items (never the built-in concepts, Library, Tags, or Settings entries, which never pass through this seam) and the signed-in editor, and returns the items to render. A site whose own gating lives outside cairn (a role stored in its own D1, say) uses this to hide a section from an editor who fails that check, rather than teasing a link the route then refuses. The engine awaits an async filter fresh every request and never caches its result; absent `navFilter`, the shell renders exactly the role-filtered set. |
| `SaveFailure` | Unstable API | `interface SaveFailure { error: string; brokenLinks: string[]; body: string }` | A blocked save or publish: the one-line summary, the cairn tokens that resolve to no entry, and the author's edited markdown for reseeding the editor. |
| `DeleteRefusal` | Unstable API | `interface DeleteRefusal { error: string; inboundLinks: InboundLink[]; id: string }` | A refused delete: the one-line summary, the entries that still link to the refused one, and its id so a list marks the right row. |
| `RenameFailure` | Unstable API | `interface RenameFailure { error: string }` | A refused rename (bad slug, collision, or pending edits): just the one-line summary. |
| `MediaDeleteRefusal` | Unstable API | `interface MediaDeleteRefusal { error: string; hash: string; usage: UsageEntry[]; foundIn: number }` | A refused media delete: the one-line summary, the asset's content hash, the where-used rows (published first, then by branch) the in-use face lists, and the distinct-entry count. `usage` is empty and `foundIn` is zero for an uncommitted asset or a media-off refusal. |
| `MediaUpdateFailure` | Unstable API | `interface MediaUpdateFailure { error: string }` | A refused media metadata edit (an asset not committed on the default branch, or an invalid slug): just the one-line summary. |
| `MediaReplaceFailure` | Unstable API | `interface MediaReplaceFailure { error: string; hash: string; usage: UsageEntry[]; foundIn: number }` | A refused media replace: the one-line summary, the asset's content hash, the where-used rows, and the distinct-entry count. Mirrors `MediaDeleteRefusal`: a fresh usage read found the asset still in use without the typed-slug override (409), or usage could not be verified or the bucket is unbound (503). |
| `MediaAltPropagateFailure` | Unstable API | `interface MediaAltPropagateFailure { error: string }` | A refused media alt-propagation: just the one-line summary. Usage could not be verified across main and every open branch (503), or the bucket is unbound. Alt fill has no typed-slug gate. |
| `MediaBulkFailure` | Unstable API | `interface MediaBulkFailure { error: string }` | A refused media bulk delete or orphan purge: just the one-line summary. The whole batch failed closed because cross-branch usage could not be verified (503), or media is off / the bucket is unbound. Per-item outcomes ride the returned summary, not this fail. |
| `ContentFormFailure` | Unstable API | `type ContentFormFailure = Partial<SaveFailure & DeleteRefusal & RenameFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure>` | The shape a route's single `form` export presents to a view component: whichever content action last failed, every field optional, `error` always set on a failure. The media refusals merge in too, so the Media Library's one `form` prop carries a `?/mediaDelete`, `?/mediaUpdate`, `?/mediaReplace`, or `?/mediaAltPropagate` refusal. |
| `NavPageOption` | Extension API | `interface NavPageOption { label: string; url: string }` | One page option for the nav editor's URL picker datalist. |
| `NavLoadData` | Extension API | `interface NavLoadData { menu: { name; label; maxDepth }; tree: NavNode[]; pages: NavPageOption[]; saved; error: string \| null }` | The nav editor's load data: the menu meta, the current tree, the page options, and the status flags. |
| <a id="cairnadmindeps"></a>`CairnAdminDeps` | Extension API | `interface CairnAdminDeps { auth?: { branding?: AuthBranding; send?: SendMagicLink }; tidy?: ContentRoutesDeps['tidy']; navFilter?: ContentRoutesDeps['navFilter'] }` | Injectable dependencies for `createCairnAdmin`, grouped into the bags a site actually overrides. `auth.branding` defaults from the runtime's `siteName` and `sender`; `auth.send` is the same seam the underlying auth factory takes. `tidy` and `navFilter` both forward verbatim to the wrapped content routes: `tidy` is what the tidy action reads, and `navFilter` is the per-request custom-adminNav filter `shellPayload` calls (see `ContentRoutesDeps` below), so a site built on this single-mount facade reaches the same seam a site calling `createContentRoutes` directly gets. Each handler resolves its content backend from `event.locals.backend`, so a dev or test backend rides locals rather than a dep. |
| `AdminData` | Extension API | `type AdminData = { view: 'login' \| 'confirm' \| 'list' \| 'edit' \| 'editors' \| 'nav' \| 'media' \| 'settings' \| 'vocabulary' \| 'help'; page }` | One admin view's data, discriminated on `view` for the admin page component's switch. Each member carries only its view's own `page` (`ListData`, `EditData`, `MediaLibraryData`, `NavLoadData`, `VocabularyLoadData` for the `vocabulary` view, the auth page data, or the editor list); the shared chrome rides the separate shell load (`AdminShellData`), not this per-view load. |
| `HealthData` | Extension API | `interface HealthData { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail? } } }` | The `/healthz` payload: the overall status and the signing self-test result. |
| `RequestContext` | Extension API | `interface RequestContext { url; request; cookies: CookieJar; locals; platform?; setHeaders }` | The structural request the auth helpers read; a real SvelteKit `RequestEvent` satisfies it. |
| `CookieJar` | Extension API | `interface CookieJar { get; set; delete }` | The cookie accessor the auth helpers use, matching SvelteKit's `cookies`. |
| `HandleInput` | Extension API | `interface HandleInput { event: RequestContext; resolve(event): Promise<Response> \| Response }` | The argument the `createAuthGuard` handle receives, matching SvelteKit's `Handle` input. |
| `BackendEnv` | Extension API | `interface BackendEnv { GITHUB_APP_PRIVATE_KEY_B64?: string }` | The Worker secret carrier the backend provider's `connect` reads to mint the GitHub App token; it also types the `healthLoad` event env. |
| `AuthEnv` | Extension API | `interface AuthEnv { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; EMAIL?: { send(message): Promise<void> }; CAIRN_DEV_BACKEND?: string \| boolean }` | The Cloudflare env shape the auth and email bindings live on: the D1 session store, the canonical confirmation-link origin, the Email Sending binding, and the `CAIRN_DEV_BACKEND` tripwire flag the guard reads. Every member is optional, since a test or a partial handler builds one piece at a time; a site's `app.d.ts` names {@link CairnPlatformBindings} instead, which requires them. The `EMAIL.send` message shape mirrors `MagicLinkMessage`: the five required fields, plus optional `cc`, `bcc`, a single-address `replyTo`, and `attachments`, widening the Email Sending API surface, live-verified 2026-07-07. |
| <a id="cairnplatformbindings"></a>`CairnPlatformBindings` | Extension API | `interface CairnPlatformBindings { AUTH_DB: D1Database; EMAIL: NonNullable<AuthEnv['EMAIL']>; PUBLIC_ORIGIN: string; GITHUB_APP_PRIVATE_KEY_B64: string; ANTHROPIC_API_KEY?: string }` | The Cloudflare bindings and vars every cairn site's Worker needs. Every member but `ANTHROPIC_API_KEY` is required (not optional), so a forgotten binding fails `app.d.ts` at compile time instead of surfacing as a runtime `config.bindings-missing` error; `ANTHROPIC_API_KEY` stays optional since only the opt-in tidy action reads it. The GitHub App's id and installation id aren't runtime bindings: the adapter passes them as compile-time config to `githubApp({ appId, installationId })`, and only the private key names a Worker secret this type carries. `/sveltekit` is the canonical home for this and the other binding-shaped types; intersect it into `App.Platform.env` (`/ambient` augments only `App.Locals`, never `App.Platform`, since a second `Platform` declaration would collide with a site's own through interface merging): `env: CairnPlatformBindings & { /* the site's own bindings */ }`. A media-enabled site also intersects `CairnMediaBindings`. |
| <a id="cairnmediabindings"></a>`CairnMediaBindings` | Extension API | `interface CairnMediaBindings { MEDIA_BUCKET: R2Bucket }` | The R2 binding a media-enabled site adds to its `Platform.env` intersection, split from `CairnPlatformBindings` since `MEDIA_BUCKET` exists only when the adapter's `assets` block turns media on: `env: CairnPlatformBindings & CairnMediaBindings & { /* the site's own bindings */ }`. |
