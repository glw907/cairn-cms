---
page: Add a custom admin screen
type: task guide
track: ""
exemplar: extenders/sanity-custom-tool
---

# Add a custom admin screen

:::reader
**Who reads it.** 1. **Developer with non-content data.** Site needs to manage something that is not markdown
   (signups, members, events, a directory) and wants it in `/admin` beside the editors' screens.
   Arrives from the extend README ("Extend the admin"), Architecture's seams table row "Custom
   admin routes", or a search ("cairn custom admin page"). Knows SvelteKit routes, loads, actions.
   Lacks: that cairn deliberately leaves the site's domain to the developer (so no built-in
   "collections"), that `/admin` is ordinary SvelteKit routing under the shell, and which parts the
   route location gives for free versus which the site must add.
2. **Developer reading the scaffold's `signups/` screen.** Opened `src/routes/admin/signups/` in a
   scaffolded site (or `examples/showcase`) and wants to know what it is, change it, or copy it.
   Lacks: that it is the worked example of this seam, and why each call in it (`requireAccess`,
   `createSectionAction`, `ctx.audit`) is there.
3. **Wrong-place readers.** (a) Has another kind of markdown content: needs a concept, not a
   screen. This is the decision reader 1 may be weighing, so the routing sentence sits right after
   the model, not buried. (b) Wants to change who reaches a screen: Restrict admin access. (c) Wants
   it in the sidebar: Arrange the admin sidebar.

**Background.** - The boundary: cairn owns markdown content and the admin frame; a site's own data and domain are
  the developer's, served by a thin seam (`f:bhyvqg`, `f:nguseg`). The custom screen is that seam
  in the admin. Architecture opens on the same boundary, so word it fresh, do not recycle.
- SvelteKit: the screen is just a route; SvelteKit's precedence puts it ahead of the engine's
  `[...path]` catch-all, and the admin layout renders it in `CairnAdminShell` (`f:03zj56`,
  `f:9xthnq`).
- Cloudflare: the data lives in a D1 database the site binds; the scaffold provisions `APP_DB` for
  developer use beside the engine's `AUTH_DB` (`f:gcuj1j`, `f:onqm6k`).
- Why the four duties exist (the "why" the old intro never gave): location gives the shell and the
  subtree sign-in guard, but the guard decides no per-route authorization (`f:2sd4if`), so the
  access check is the screen's; an entry's history comes from git, and a screen's D1 writes are
  outside it, so the audit trail is their record (`f:hcydfe`, `f:pgy0mr`, `f:wnvqlz`);
  `cairn-audit` scans `src/routes/admin` with the engine's rules (`f:326755`).
- Do not claim the engine's screens write audit records (`f:2tqkv9` rejected).

**Place in the doc set.** Only page in "Extend the admin". Upstream: Architecture (seams), Add cairn / scaffold (the shape it
assumes). Siblings it routes to: Define an adapter and schema, Restrict admin access, Arrange the
admin sidebar; See also holds Security model, cairn-audit, media.

**What the page does for them.** The introduction frames the page from above before the contract sentence. cairn owns markdown
content and the admin frame and leaves a site's other data and domain logic to the developer,
served through a thin seam; in the admin that seam is the custom admin screen, a route under
`src/routes/admin/` that renders inside `CairnAdminShell`, can adopt the packaged admin
toolkit, and sits behind the same `/admin` sign-in guard as the engine's screens. Two readers
arrive: a developer whose site keeps data outside its markdown content (rows in a D1 database
the site binds) and wants a screen for it beside the editors' screens, and a developer reading
the example site's signups screen at `examples/showcase/src/routes/admin/signups/` who wants to
know what each call in it is for. The introduction says why the four duties exist: the route's
location gives the shell and the guard, the guard gates the subtree and decides nothing per
route, an entry's history comes from git while a screen's database writes do not, and
`cairn-audit` holds the screen to the engine's rules. Then the one-line contract: the steps
build a screen that renders inside the admin shell, enforces the site's access map on its
reads and writes, records each write in the audit trail, and passes `cairn-audit`. It names the
signups screen as the worked example and says a scaffolded site does not ship it. It says the
dialog-form, row-detail, and animation sections apply only to a screen with that feature. It
routes a reader with another kind of markdown content to a concept instead (Define an adapter
and schema), right after the model, since that is the decision the first reader may be
weighing. :fact[bhyvqg] :fact[9xthnq] :fact[2sd4if] :fact[hcydfe] :fact[326755] :fact[onqm6k]

**What they already know.** A Svelte-fluent developer: SvelteKit routes, `load` functions, form actions, `enhance`, and
server hooks (`handle` and `sequence`); Svelte 5 snippets and runes; Cloudflare D1 bindings in
`wrangler.jsonc`. The page explains none of these and links the vendor docs where a step
depends on a vendor detail.

**What it leaves to other pages.** Each out-of-scope subject names its page, subject first: declaring the access map and changing
who reaches a screen (Restrict admin access); adding the screen to the sidebar (Arrange the
admin sidebar); why an access map is not a whitelist (Security model); configuring the audit
for the whole site, including rendered runs, suppressions, and allowlists (Run cairn-audit on
your site); and the media upload protocol (Configure media). The first two are named
sentences in the introduction; the remaining three are folded into one sentence that defers to
See also. The audit norms' former values are not covered anywhere on the page.

**How the introduction runs.** - P1, the model: boundary statement (statement, not imperative) -> the custom screen is the admin's
  seam for it, as a SvelteKit route in the shell behind the guard -> what it is for, D1 data via
  `APP_DB`. Then the concept-versus-screen routing sentence.
- P2, why the duties: the route gives shell + guard; the guard does not authorize per route; git
  does not see D1 writes; `cairn-audit` holds the screen to the engine's rules. Then the contract
  sentence (the anatomy's one-liner, now inside the framing): the steps add a screen that renders
  in the shell, enforces the access map on reads and writes, audits each write, passes
  `cairn-audit`.
- P3, the readers' entry and bounds: the worked example is the scaffold's `signups/` (reader 2
  learns this page explains the file they opened), optional sections, prior knowledge.
- P4: remaining wrong-place routes (access map, sidebar, See also), unchanged.

:::

## Before you begin

- The steps assume a scaffolded site, an access-map rule for the screen's route, a D1 database bound for the screen's data, and a D1 database prepared for the audit trail.
- The admin is also a toolkit: a developer's own route under `/admin` renders as a child of `CairnAdminShell` like the engine's own screens, can adopt the packaged admin-toolkit components, and sits behind the same `/admin` sign-in guard, since every `/admin` path except the login page and the auth endpoints is gated. :fact[9xthnq]
- The showcase's `signups/` is a custom admin screen beside the catch-all, not shipped in the scaffold: its load calls `requireAccess` and reads the `signups` table through `env.APP_DB` from `cloudflare:workers`, failing closed with a 500 when the binding is absent, and its form actions, `create` and `remove`, are `createSectionAction` wrappers, with `ownerOnly: true` on the destructive `remove` alone; the table exists only after `migrations-app/0000_signups.sql` is applied to `APP_DB`. :fact[onqm6k]
- A bulleted list of four preconditions, each with a link to what produces it: a site that `create-cairn-site` scaffolded (or a hand-built site brought to the same shape); an access-map rule for the screen's route, declared on the adapter; a D1 database bound for the screen's data, with its own migrations directory; a D1 database prepared for the audit trail.
- The scaffold's adapter declares no `access` member and takes the zero-config owner/editor floor, and it holds no `src/access.ts`. The showcase's adapter declares `access = defineAccess(undefined, { '/admin/signups': ['owner'], '/admin/theme-kit': ['owner'] })`, a route rule set that admits only owners to the custom signups screen at `/admin/signups`, whose load gate and form actions both resolve against it. :fact[3z1uxv]
- See [restrict-admin-access.md](restrict-admin-access.md).
- The scaffold's `wrangler.jsonc` declares four bindings and one variable: `ASSETS` (the static-assets binding, on the `assets` block), `AUTH_DB` (D1, auth store), `EMAIL` (Email Sending), `MEDIA_BUCKET` (R2), and the `PUBLIC_ORIGIN` var. It declares no second database: the showcase's `APP_DB`, which backs its `signups/` example screen, and its `MEMBER_DB` members fixture sit in marked exclude blocks and are not part of the scaffold. :fact[n7t4bn]
- The showcase's `migrations-app/` holds `0000_signups.sql`, the `signups` table (`id`, `name`, `email`) behind the custom `/admin/signups` screen, in its own directory because `wrangler d1 migrations apply` walks one directory per database and a directory shared with `migrations/` would apply each schema to both; the showcase's `wrangler.jsonc` points `APP_DB`'s `migrations_dir` at it. The scaffold ships neither the directory nor the binding. :fact[nv0ok0]
- See [https://developers.cloudflare.com/d1/worker-api/](https://developers.cloudflare.com/d1/worker-api/).
- See [../reference/sveltekit.md#created1auditsink](../reference/sveltekit.md#created1auditsink).
- See [add-cairn-to-a-sveltekit-app.md](add-cairn-to-a-sveltekit-app.md).
- The single-mount admin is two pairs of files: `src/routes/admin/+layout.server.ts` (exports the shell load) with `+layout.svelte` (renders `CairnAdminShell`), and the `src/routes/admin/[...path]/` catch-all with its `+page.server.ts` and `+page.svelte`; beside them sits `src/routes/admin/+error.svelte`, the admin's own error page. :fact[b8rkq9]
- A plain-text tree of `src/` holding `hooks.server.ts`, `admin.css`, and `routes/admin/` with `+layout.server.ts`, `+layout.svelte`, and `[...path]/` (its `+page.server.ts` and `+page.svelte`), plus one directory the steps add, `signups/` with `+page.server.ts` and `+page.svelte`, marked as the new screen (the example site's name for it). Nothing else.
- The first step creates that directory.

## Place the route

- A route directory under `src/routes/admin/` is the whole registration: SvelteKit resolves it ahead of the engine's `[...path]` catch-all, and the shared admin layout renders it inside `CairnAdminShell`.
- A custom route under `src/routes/admin/` wins over the `[...path]` catch-all automatically because SvelteKit resolves the more specific route first. :fact[03zj56]
- Every `/admin/**` route, the catch-all view page and any custom route a site adds under `src/routes/admin/`, renders as `CairnAdminShell`'s children through the shared layout, so a custom screen gets the shell chrome (nav, user, theme) with no wrapper code and no registration. :fact[brfitv]
1. In `src/routes/admin/`, create a directory named for the screen.
2. In that directory, create `+page.server.ts` for the load and the actions, and `+page.svelte` for the markup.
- The admin shell's favicon and sidebar brand mark are fixed to the cairn glyph and wordmark, and the only site identity it shows is `siteName` from the site config (in the page title and the topbar), with no adapter option or shell prop to replace either. :fact[qz4gj2]
- If the root layout renders visible chrome around `/admin` (header, footer, width cap), the admin shell cannot fill the viewport; a dev-only ancestor-chain check (`detectChromeWrap`) catches the width-cap case only, an ancestor between the admin root and `<body>` whose computed `max-width` is not `none`, `100%`, or `100vw`, and logs one console error pointing at the route-structure doc (a header or footer beside the admin appears only as context inside that message), but only in dev and it never throws or changes rendering. :fact[g7zuji]

:::row
**Symptom.** The admin shell does not fill the viewport, and in dev the console shows one error about a width cap on an ancestor of the admin root.
**Cause.** Fires on any visit to `/admin` when the site's root layout wraps every route, the admin included, in a header, footer, or width cap.
**Fix.** See [../reference/admin-routes.md#the-root-layout-must-be-chrome-free](../reference/admin-routes.md#the-root-layout-must-be-chrome-free).
:::

- See [arrange-the-admin-sidebar.md](arrange-the-admin-sidebar.md).
- Listing the screen in the sidebar is a separate task; the route now needs its access check.

## Gate it

- The screen enforces the site's access map itself, with `requireAccess` in its `load` and an access-checking wrapper around every action, because the auth guard admits a session to the `/admin` subtree and decides nothing per route.
- `createAuthGuard({ runtime })` gates the whole `/admin` subtree before any load runs, but does not decide per-route authorization; that is `requireAccess`/`createSectionAction`'s job. :fact[2sd4if]
- The engine's own screens, their write actions, and the sidebar read the adapter's `access` member through the composed runtime, and `requireAccess` and `createSectionAction` read the same map from `event.locals.cairnAccess`, which the guard (and the dev backend's handle) set to `runtime.access ?? {}`; the adapter's `access` member is the one declaration every reader sees. Earlier versions took the guard's map as its own `access` option, so a map passed only to the hook handles, as the scaffold's `src/hooks.server.ts` did, gated the site's own routes and left every engine screen open to any editor-capability session until the adapter carried the map too; that split cannot arise now. :fact[cvzb8z]
- `requireAccess` in `load` and `createSectionAction` in every action share one fail-closed predicate: a session the access map does not admit is refused on both the read and the write. :fact[10ojk8]
- A role or session with no rule declared for a route's path gets a 403 from the access map, owner included, since `hasAccessRule` carries no owner exemption. :fact[3lbdl6]
- See [../reference/sveltekit.md#createsectionaction](../reference/sveltekit.md#createsectionaction).
- `createSectionAction` is the guarded action factory a site's admin section would otherwise hand-roll: SvelteKit dispatches a matched form action directly and never re-runs an ancestor layout's `load`, so a section's POST cannot rely on its page's authorization check, and a hand-rolled action that skips the access-map check and the audit call admits any signed-in session to the write and records nothing. :fact[chsstm]
1. In the screen's `+page.server.ts`, call `requireAccess` in `load` before it reads anything. A procedure of one step, written as a single bulleted item.
- The showcase's `signups/` is a custom admin screen beside the catch-all, not shipped in the scaffold: its load calls `requireAccess` and reads the `signups` table through `env.APP_DB` from `cloudflare:workers`, failing closed with a 500 when the binding is absent, and its form actions, `create` and `remove`, are `createSectionAction` wrappers, with `ownerOnly: true` on the destructive `remove` alone; the table exists only after `migrations-app/0000_signups.sql` is applied to `APP_DB`. :fact[onqm6k]
- The example site's `load` and its `requireAppDb` helper with the imports they use, minus the logger call and the comments, so the snippet shows `requireAccess(event)` before the read and the 500 on an absent binding.
- A route nested under an already-gated `/admin` page inherits the auth guard (covers the whole subtree) but never inherits a page's own `requireAccess` rule, which is scoped to that page's route id only; a detail endpoint needs its own `requireAccess` call and its own access-map entry. :fact[lmtfkt]
- See [#load-row-detail-on-demand](#load-row-detail-on-demand).
- An action gets its access check from a wrapper, which the next section chooses.

## Choose the action wrapper

- A screen whose actions write through a database binding wraps them in `createSectionAction`, and a screen with no binding uses `createAdminAction` with its `access` option set.
- `createSectionAction` requires a `resolveDb` binding resolver; a site that wants only the CSRF-plus-audit contract with no database binding stays on `createAdminAction` itself. :fact[hroqbu]
1. In the screen's server file, import the wrapper that matches whether its actions write through a binding. A procedure of one step, written as a single bulleted item.
- A table comparing the two wrappers, introduced by a complete sentence, with four rows: when each checks the access map (every call; only when the `access` option is set), how each refuses a session (returns `fail(403)`; throws `error(403, ...)`), whether it needs a binding (yes, through `resolveDb`; no), and how a refusal is recorded (audited and logged as `auth.access.refused`, for both). :fact[xbjxit] :fact[hroqbu]
- `createSectionAction` runs `authorizeAdminTarget` on every call and refuses with `fail(403)`, while `createAdminAction` runs it only when the call sets the `access` option and refuses by throwing `error(403, ...)`, so with the option omitted it authorizes nothing; either way the refusal is audited and logged as `auth.access.refused`, and by default both carry the same message, `You do not have access to this action.`, which names no gate; `createSectionAction` takes a `deniedMessage` option that replaces its 403 copy, while `createAdminAction`'s is fixed. :fact[xbjxit]
- The signups screen writes through `APP_DB`, so the rest of the page uses `createSectionAction`. :fact[onqm6k]
- See [../reference/sveltekit.md#createadminaction](../reference/sveltekit.md#createadminaction).
- The next section builds the wrapper and wraps each action.

## Wrap the actions

- One `createSectionAction` call builds the section's wrapper, and each form action passes its handler and its audited `action` and `entity` to that wrapper.
- `createSectionAction<Env, Db>({ resolveDb })` builds a reusable per-section action wrapper; `resolveDb` reads the site's own binding off the Worker env the engine hands it, which the engine takes from `cloudflare:workers`. :fact[3j02dk]
- `createSectionAction<Env, Db>`'s `Env` is a type parameter the site supplies for its own platform bindings; the engine ships no `Env` type for them, and `resolveDb` receives `Env | undefined`. The showcase's signups screen passes the generated `Env` from `worker-configuration.d.ts`. :fact[esp93u]
1. In the screen's server file, build one wrapper with `createSectionAction`, passing a `resolveDb` that reads the section's binding.

:::row
**Symptom.** A binding read off the `resolveDb` parameter fails to typecheck, because `Env` resolved to `unknown`.
**Cause.** 
**Fix.** `createSectionAction<Env, Db>` does not infer `Env` from an unannotated `resolveDb` parameter, so a site annotates that parameter or passes explicit type arguments; otherwise `Env` becomes `unknown` and binding reads off `env` stop typechecking. :fact[pmmtdv]
:::

1. In the exported form actions, wrap each handler in that wrapper, passing its `action` and `entity`.
2. On the destructive action, add `ownerOnly: true` to the options.
- The example site's `sectionAction` declaration and its `actions` export (`create` and `remove`), minus the comments, continuing the same file as the load snippet.
- The showcase's signups screen is the worked custom admin screen: its `load` calls `requireAccess`, and each form action is a `createSectionAction` wrapper whose handler receives `{ form, ctx }`, writes through `ctx.db`, calls `ctx.audit` with a `detail` or an `entityId`, and passes `{ action, entity }` as its second argument, with `ownerOnly: true` added on the destructive `remove`. :fact[pyt58u]
- `createSectionAction` also runs the audit and authentication work `createAdminAction` does underneath it (editor identity, CSRF, one form read); a section built on `createSectionAction` never calls `createAdminAction` directly. :fact[lblh3u]
- The `ctx.audit` a `createSectionAction` handler receives seeds the record's `action` and `entity` from the wrapper's options unless the handler's own `ctx.audit` call passes either, so an audit row names the wrapper's `action` and `entity` by default. :fact[6vy0ka]
- See [#resolve-a-missing-audit-record](#resolve-a-missing-audit-record).
- A `ctx.audit` call persists nothing until the site wires an audit sink.

## Wire the audit sink

- A `ctx.audit` call persists a record only when `hooks.server.ts` sets an audit sink on `event.locals.cairnAuditSink`, composed with the auth guard through `sequence`.
- `ctx.audit()` needs an audit sink of type `AdminActionAuditSink` wired via `event.locals.cairnAuditSink`, set in `hooks.server.ts` from a bound D1 database (typically via `createD1AuditSink`). :fact[68h31z]
- `hooks.server.ts` holds exactly one `handle` export; several `Handle` functions compose through `sequence()`, which runs them in order. :fact[rurhey]
- Handles composed with `sequence` run their code before `resolve` in order, ahead of the route, so a handle that only sets a `locals` field the route reads, such as the audit-sink wiring, needs nothing an earlier handle sets and works placed after `createAuthGuard`. :fact[6quvqm]
- The scaffold's hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if` whose test reads the build-time `__CAIRN_DEV_BUILD__` define directly and then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`, and exports the result as `handle`; both handles take the composed `runtime` the hooks import from `#chassis/cairn.server.js` (`createAuthGuard({ runtime })` and `devBackendHandle({ runtime })`), where earlier versions took optional `roles` and `access` options and a bare `createAuthGuard()` was valid. The opt-in reads the Worker env first and falls back to `process.env`, since `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. :fact[f21bcz]
- A site declares its access map once, as the adapter's `access` member; `composeRuntime` carries it onto the runtime, and `createAuthGuard({ runtime })` attaches `runtime.access ?? {}` to `locals.cairnAccess` on every admin path where it signs an editor in, so there is no second copy to pass to the guard. Earlier versions took the map as a separate `access` option on the guard, and the same `access` value had to be passed to both it and the adapter's `access` member. :fact[iwf4nu]
1. In `hooks.server.ts`, add a handle that sets `event.locals.cairnAuditSink` to a `createD1AuditSink` over the audit database.
2. In the same file, compose that handle after `createAuthGuard({ runtime })` through `sequence` in the production branch.
- An excerpt of `src/hooks.server.ts`: the `wireAuditSink` handle from the `createD1AuditSink` entry's example (the `building` guard, `env.AUDIT_DB`, and the exported `waitUntil`), and the production branch's assignment `handle = sequence(createAuthGuard({ runtime }), wireAuditSink)`. It imports `runtime` from `#chassis/cairn.server.js` and imports no access map. Marked as an excerpt, since no file in the repository wires the sink.
- A site's own code that reads the Worker env at module or hook scope (an audit-sink hook calling `createD1AuditSink(env.AUDIT_DB, waitUntil)` from `hooks.server.ts`) guards the read with `building` from `$app/env`, SvelteKit 3's module (`$app/environment` survives only as a deprecated alias), because every `cloudflare:workers` `env` read throws while the build prerenders; the guard is `if (!building && env.AUDIT_DB)`. The engine's own paths ask the same question through `isBuilding()`, which a site does not call. :fact[i8pbhc]
- Inside a request, a site passes `createD1AuditSink` the `waitUntil` that `cloudflare:workers` exports and binds nothing, while a caller holding an `ExecutionContext` (a Cron `scheduled` handler) binds it first (`ctx.waitUntil.bind(ctx)`), because the unbound method typechecks and then throws 'Illegal invocation' in workerd; the sink catches that, logs `audit.sink.write_failed` with reason `wait_until_failed`, and the insert runs unprotected, so the row can be lost. :fact[ph6kjg]
- The `createD1AuditSink` sink is fail-open: it returns before the insert settles, so a persist failure never fails the action being audited; a rejected write logs rather than disappearing. :fact[ff3l1u]
- `createSectionAction` audits every refusal its own checks make, not only a successful action, so an unrated action fills an audit table cheaply without a `rateLimit` option; the one exception among its own checks is the rate-limit-exceeded refusal, which returns `fail(429)` with no `ctx.audit` call since back-pressure is not a domain-state change. The session and CSRF refusals `createAdminAction` makes underneath it redirect or throw before any audit call, so they leave no audit record. :fact[da6d2z]
- See [../reference/sveltekit.md#createsectionaction](../reference/sveltekit.md#createsectionaction).
- The server side is complete; the screen's markup comes next.

## Compose the screen from the toolkit

- The screen's markup composes the admin toolkit's primitives, the same set the engine's own screens compose, in place of a hand-rolled table, list, or field.
- The admin-toolkit is the general-purpose primitive set a site's own `/admin` screen composes instead of hand-rolling a bespoke list, table, or field, and cairn's own admin screens compose it too: `ManageEditors` builds from its `PageHeader` and `AdminTable`. :fact[5t1i7o]
1. In the screen's `+page.svelte`, import the primitives it needs from `@glw907/cairn-cms/admin-toolkit`.
2. In each form that posts to one of the screen's actions, mount a `CsrfField` from `@glw907/cairn-cms/admin`.
- Each form that posts to a custom `/admin/` screen's action mounts `CsrfField` from `@glw907/cairn-cms/admin`, since the guard refuses every unsafe admin form POST whose `csrf` double-submit field is missing or wrong with a 403, logged as `guard.refused` with `reason: csrf`; inside the authed shell the field takes no `token` prop, because it falls back to the token `CairnAdminShell` provides through context. The showcase's signups screen mounts a bare `CsrfField` in both its `create` form and its `remove` form. :fact[fers77]
- A lead-in that marks the switch: a smaller screen shows the toolkit alone, an Events list that composes three primitives with the table inside a card. It is an aside, never a second screen to build.
- Each admin-toolkit primitive has one job: `PageHeader` the eyebrow, title, and meta band; `AdminTable` the table chrome around caller-written header and row markup; `ListToolbar` the search and filter band; `ToolbarDisclosure` a trigger that opens a floating panel; `Pagination` page navigation; `StatusChip` a status chip; `EmptyState` the centered empty state; `FieldLabel` a control's label wrapper; `ExpandableRow` a summary row with an expand-in-place panel; `MediaPicker` a picker over the committed media library. :fact[clyg9r]
- The Events screen: `PageHeader`, `AdminTable` with `header` and `children` snippets, and a `StatusChip` per row, with the table wrapped in a `div` carrying `overflow-hidden card-shell card-shadow`. Word for word with the story file, which must stay in lockstep.
- The reproduction of the Events screen rendered inside the admin shell, below the shell's topbar: the page header with its eyebrow, title, and count, and each row's status as a chip. A `repro` fence directly after the snippet.
- `AdminTable` sets its own horizontal scroll; a wrapping `<div>` should carry `overflow-hidden card-shell card-shadow` but not `overflow-x-auto`. :fact[8x0qpa]
- The admin-toolkit's charter is general-purpose primitives only; a component rendering one of cairn's own content concepts (a `ConceptList` row, an `EditPage` field) does not belong there. :fact[mfa5vi]
- A primitive graduates into the admin toolkit from a consumer site's own screens once it has a second real consumer; `ExpandableRow` graduated on that trigger. :fact[asujoi]
- The engine's packaged admin sheet is compiled from cairn's own admin sources and never scans a site's markup, and each toolkit primitive ships its classes, compiled into that sheet, and its own scoped styles with the package, so a later release still renders the primitive under a site's route with no change on the site's side. :fact[7m5o61]
- See [../reference/admin-toolkit.md](../reference/admin-toolkit.md).
- See [../reference/admin.md](../reference/admin.md).
- Two no-claim link sentences close the section: the admin toolkit reference lists every export with its props, the props that change a primitive's behavior included, and the admin components reference lists the engine's components a screen can mount beside the toolkit, with each one's props.

## Style the screen

- The screen's utility classes compile only through the site admin sheet, `src/admin.css`, which a scaffolded site already builds, and the admin's design reaches the screen through stock daisyUI classes.
- The scaffold's site admin sheet, `src/admin.css`, imports Tailwind's theme and its utilities with `source(none)` (automatic source detection off), scans `./routes/admin` and `./lib/admin` through `@source`, and then imports `@glw907/cairn-cms/admin-sources.css`; the `build:admin-css` script compiles it with the Tailwind CLI to `.cairn/admin.css`, which `src/routes/admin/+layout.svelte` imports, so a custom screen's own utility classes compile only when its file sits under one of the scanned roots. :fact[vkfd7b]
- The scaffold's `predev`, `prebuild`, and `precheck` scripts compile `src/admin.css` to `.cairn/admin.css`, inside the root `.cairn/` directory the scaffold's `.gitignore` ignores whole (`/.cairn/`), so a Workers Builds `npm run build` needs no separate admin-stylesheet step. :fact[666eg6]
- The compiled admin stylesheet scans only the engine's own admin components and `src/lib/admin-toolkit/` (automatic source detection is off), so every toolkit primitive's classes ship pre-compiled in it and a site's own route markup never feeds that build. :fact[zpi2ux]
- See [../reference/cairn-audit.md#configuration](../reference/cairn-audit.md#configuration).
1. Under `src/routes/admin` or `src/lib/admin`, keep every file that holds the screen's markup.
- The admin is built in DaisyUI and Tailwind, the idiom a developer's own screens extend it in. Key phrase: "built with DaisyUI + Tailwind". :fact[k6aopn]
- Every daisyUI component and utility class except calendar compiles into the admin sheet, generated at build time from the installed daisyUI package, so a custom admin screen can use any daisyUI class without a safelist entry. :fact[9rxw92]
1. In the screen's markup, give each rounded corner `rounded-selector`, `rounded-field`, or `rounded-box`, never a fixed Tailwind radius such as `rounded-lg`.
- A fixed Tailwind radius (`rounded-lg`, `rounded-xl`) still compiles in the admin sheet but does not follow the corner ladder; markup that should follow it writes `rounded-selector`, `rounded-field`, or `rounded-box`. :fact[2babfl]
- A custom admin screen's plain daisyUI classes render cairn's corner ladder, since both admin themes set daisyUI's radius tokens: `--radius-selector` 0.25rem for chips and small markers, `--radius-field` 0.375rem for controls, `--radius-box` 0.5rem for cards and dialogs. :fact[9oa6sk]
- `StatusChip` renders a chip on `--radius-selector` (0.25rem in the admin themes), not a fully rounded pill, because daisyUI's `badge` reads that token. :fact[bwn0uo]
- `cairn-audit`'s ratified norms moved with the corner ladder and the size step: the `button-ghost`, `button-primary`, `input-text`, and `select` radius bands are 6px (were 10px), `card` is 8px (was 16px), `status-chip` is 4px (was 8px), and the control height bands grew with `--size-field` 0.28125rem. :fact[39sn8c]
- A bare `btn` with no color, style, selected, or disabled form renders as a hairline button (a quiet `base-content` edge on the base fill), set in the `cairn-idiom` sublayer. :fact[gc0hx3]
- A `btn` in any of five selected forms, `.btn-active`, `aria-pressed="true"`, `aria-checked="true"`, a non-empty non-false `aria-current`, or `:checked`, renders as the selected segment (a neutral wash, a hairline, weight 600); `btn-link`, color variants, `btn-outline`, and `btn-dash` keep their own look. :fact[5stbq2]
- The packaged admin sheet defines `cairn-text-warning` (color `--cairn-warning-ink`) and `cairn-text-success` (color `--color-positive-ink`), each with a light-theme literal fallback; the bracketed `text-[var(--cairn-warning-ink)]` and `text-[var(--color-positive-ink)]` forms are not compiled into that sheet. :fact[q4jyat]
- Two recipes follow for a screen with a dialog form or expanding rows.

## Build the dialog form

- When a screen collects input in a native `<dialog>` submitted with `enhance`, the form survives every result only when its callback handles each of the four result types; a screen with no dialog skips this section.
- A form inside a native `<dialog>` submitted with `enhance` survives every result when its callback shows a `'failure'` message in the dialog and then calls `update()`, which for a same-page failure only updates `form` and the page status; reports an `'error'` in the dialog without calling `update()`; closes the dialog before awaiting `update()` on `'success'`, so it never sits open through `refreshAll()`; and hands `'redirect'` to `update()`. Such a callback can leave `reset` unset, since `reset` applies only on `'success'`, when the dialog is closing anyway. :fact[jra92k]
- SvelteKit's `enhance` hands its callback the server's action result as one of four types (`'success'`, `'failure'`, `'redirect'`, `'error'`); the default `update()` resets the form and runs `refreshAll()` on `'success'` only, then calls `applyAction` for a same-page result, or always for `'redirect'` and `'error'`. :fact[xgy3iu]
- See [https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-Customizing-use:enhance](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-Customizing-use:enhance).
1. In the screen's markup, add a `<dialog class="modal">` whose `aria-labelledby` points at the dialog's heading.
- An element with the `dialog` role must have an accessible name; `aria-labelledby` pointing at the dialog's own heading supplies one that does not depend on its body text. :fact[tskfz1]
1. In the handler of the button that opens the dialog, call `showModal()`.
- A native `<dialog>` opened with `showModal()` closes on Escape without script; a `<form method="dialog">` closes it on submit but is its own form element, and nested `<form>` elements are invalid HTML. :fact[ho6dxa]
1. Inside the dialog, add the action form with `enhance` applied, as a separate form element and never inside a `<form method="dialog">`.
2. In the `enhance` callback, handle each of the four result types, and never call `update()` on `'error'`.
- In the dialog-form recipe, `enhance`'s `'error'` result must skip `update()`, because `update()` calls `applyAction(result)`, which renders the nearest `+error` page for an `'error'` result and would destroy the dialog. :fact[9fwsz5]
1. In the form, mount an empty `role="alert"` paragraph for the failure message.
- A live region (`role="alert"`, `role="status"`) announces content changes made after it is in the DOM, so a region inserted already holding its text is announced unreliably and should be mounted empty first; `role="status"` is implicitly polite and `role="alert"` implicitly assertive. :fact[tkqoia]
1. On the input, point `aria-describedby` at the alert paragraph.
2. On the same input, set `aria-invalid="true"` while its value is the failed one.
3. On the submit button, set `disabled` while the request is pending.
- In a dialog form's failure wiring, Tailwind's `sr-only` hides the empty, always-mounted `role="alert"` paragraph visually while keeping it in the accessibility tree; the input's `aria-describedby` names that paragraph as its description and `aria-invalid="true"` marks the failed value, so the error is read with its field when focus moves to the input; and a submit button disabled while the request is pending cannot fire the action a second time. :fact[5vn194]
- An illustrative create dialog that posts to the signups screen's `?/create` action: a `SubmitFunction` callback with the four branches, a pending flag, `<CsrfField />`, the name and email inputs with the `aria-describedby` and `aria-invalid` wiring, the empty `role="alert"` paragraph, and the pending-disabled submit. The example site's own file holds the remove confirm dialog, which has no input, so this snippet is written for the page on that file's imports and patterns, and the lead-in frames it as illustrative.
- The second recipe loads detail for rows that expand.

## Load row detail on demand

- When a screen's rows expand to show detail, the screen fetches each row's detail as its panel opens and caches it per row; a screen with no expanding rows skips this section.
- A page's `load` runs each time a reader navigates to the page, so a list load that also fetches every row's detail pays for all of them on every visit; fetching a row's detail when its panel opens, and caching it per row, costs only the rows a reader opens. :fact[uy7vyc]
- A SvelteKit `load` that returns an unawaited promise streams it, but the promise starts running when `load` creates it, so streaming defers when the result reaches the page and not whether the work runs. :fact[b5mcea]
1. Under the screen's directory, add the detail endpoint as a nested route that returns one row's detail as JSON.
2. In that route's server file, call `requireAccess`.
- A route nested under an already-gated `/admin` page inherits the auth guard (covers the whole subtree) but never inherits a page's own `requireAccess` rule, which is scoped to that page's route id only; a detail endpoint needs its own `requireAccess` call and its own access-map entry. :fact[lmtfkt]
1. In the site's access map, add an entry for the nested route, as Restrict admin access describes.
- See [restrict-admin-access.md](restrict-admin-access.md).
1. In the screen's markup, render each row as an `ExpandableRow` inside the `AdminTable`.
- See [../reference/admin-toolkit.md#expandablerow](../reference/admin-toolkit.md#expandablerow).
- `ExpandableRow` renders the caller's summary cells plus one trailing trigger cell of its own, and the panel row's single `<td>` spans the `colspan` the caller passes, which must count that trigger cell; the panel snippet receives the row's `datum`. :fact[vao0dd]
- `ExpandableRow`'s trailing trigger cell has no visible column heading, so the caller's `header` snippet matches it with a `<th scope="col">` whose text sits in an `sr-only` span, the pattern the showcase's signups table uses for its actions column. :fact[n2bhjw]
- `ExpandableRow` ignores a row click whose target sits inside an element carrying `data-cairn-inert-cell`, so an interactive summary cell wraps its content in that attribute instead of calling `stopPropagation()`; the trigger button needs no attribute. :fact[pswc3n]
1. In the same file, write an open handler for the rows.
2. On each `ExpandableRow`, connect the open handler as the `ExpandableRow` entry's example shows. The step names no prop.
3. In the open handler, return the cached detail when the row already has one.
4. Otherwise, in the same handler, call `fetch` for the row's detail inside a `try` block.
- `fetch` resolves on an HTTP error status and rejects only on a network failure, and `Response.json()` rejects on a body that is not JSON, such as an HTML page, so a lazy-detail fetch checks `response.ok` and parses inside one `try`, caching a row's detail only after both succeed and leaving a failed row retryable. :fact[od9mww]
1. Inside the `try` block, check `response.ok`.
2. In the same block, parse the body with `Response.json()`.
3. In the same block, cache the detail only after the status check and the parse both succeed.
4. In the row's panel snippet, render the cached detail.
- An illustrative open handler covering the cache-hit, fetch, status, parse, and cache steps: a `SvelteMap` keyed by row id, and an async function that returns the cached detail, or fetches the detail URL passed in, checks `response.ok`, parses JSON, caches, and returns `undefined` on any failure. It names no `ExpandableRow` prop; the entry's own example shows the wiring. Framed as illustrative in its lead-in.
- A screen that animates any of this meets the admin's motion rules next.

## Animate the screen

- When a screen animates, `cairn-audit` holds its motion to the same rules as the engine's screens, so each transition names its duration and easing with the admin's motion tokens; a screen with no motion skips this section.
1. In the screen's markup or scoped `<style>` block, write each duration and easing as a `var()` of a motion token, such as `var(--cairn-dur-base)`. A procedure of one step, written as a single bulleted item.
- Both admin theme roots, `[data-theme='cairn-admin']` and `[data-theme='cairn-admin-dark']`, declare the same eight motion custom properties: durations `--cairn-dur-instant` 70ms, `--cairn-dur-quick` 110ms, `--cairn-dur-base` 150ms, `--cairn-dur-shift` 240ms, `--cairn-dur-settle` 400ms, and curves `--cairn-ease-standard` `cubic-bezier(0.2, 0, 0.38, 0.9)`, `--cairn-ease-entrance` `cubic-bezier(0, 0, 0.38, 0.9)`, `--cairn-ease-exit` `cubic-bezier(0.2, 0, 1, 0.9)`. The design system treats the set as closed (five durations, three curves), and `motion-vocabulary` accepts only these eight names in `var()` form. :fact[017qss]
- Both theme roots repoint Tailwind's `--default-transition-duration` at `var(--cairn-dur-base)` and `--default-transition-timing-function` at `var(--cairn-ease-standard)` in an unlayered rule, so a `transition-*` utility with no `duration-*` or `ease-*` sibling animates on the base duration and the standard curve. `motion-vocabulary` treats such a declaration as riding those defaults and reports, once per run, when the built sheet's two roots do not carry both repoints. :fact[018sgk]
- The admin's blanket `@media (prefers-reduced-motion: reduce)` rule over both theme roots and every descendant sets `animation-duration` and `transition-duration` to `0.01ms !important`, zeroes both delays, and sets `animation-iteration-count: 1`. The design system permits a paint transition (`opacity`, color properties, `box-shadow`, `outline-*`) to opt back in by restating the transition inside the same guard with `!important`, and keeps transform, `grid-template-rows`, and frame-offset motion at the floor with no opt-back-in; cairn's own admin restates none. :fact[2p5otw]
- `motion-property` (error tier, `adminOnly`) allows a `transition` or `transition-property` to name only thirteen properties: `opacity`, `color`, `background-color`, `border-color`, `box-shadow`, `outline-color`, `outline-width`, `outline-offset`, `rotate`, `translate`, `scale`, `transform`, and `grid-template-rows`. It fails a named layout property (`width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `font-size`, and every `margin-*` and `padding-*` longhand) with a layout-hazard message, fails any other unlisted name as outside the language, and fails one declaration that names more than three properties. `display` and `overlay` pass only in an entry that also carries `allow-discrete`. `transition: all` and `none` are not reported here, since `motion-band` owns `all`. :fact[09g8ev]
- `motion-vocabulary` (error tier, `adminOnly`) fails a literal duration (any `ms` or `s` value in `transition`, `transition-duration`, `animation`, or `animation-duration` not written as a `--cairn-dur-*` `var()`) and a literal easing keyword or `cubic-bezier(` (not a `--cairn-ease-*` `var()`), in hand-authored CSS and in the compiled class join. Its duration message names the nearest of the five duration tokens by millisecond distance and the authoring form (`var(...)` in CSS, `duration-(...)` in a class); its easing message always points at `--cairn-ease-standard`. An `infinite` animation skips the duration check and must use the literal `linear`. It records a note and no finding for the reduced-motion floor (`0.01ms` inside `prefers-reduced-motion: reduce`), a shorthand carrying `allow-discrete`, a `var()` in the shorthand's property slot, and a `calc()` over a foreign variable. :fact[0aa9tp]
- `motion-hover-gate` (error tier, `adminOnly`) fails a hand-authored `:hover` selector outside `@media (hover: hover)` when that rule, or the base rule the selector matches in the same file with `:hover` removed, declares a transition or animation; it also fails a `:focus-visible` alternative that declares motion from inside the hover guard. A pair split into a guarded `:hover` rule and an unguarded `:focus-visible` rule passes, and a Tailwind `hover:` utility is out of scope because it compiles to the guard already. The fix message says to wrap the block in the hover media query and to split a `:hover` and `:focus-visible` or `:focus-within` pair first, because a keyboard user on a touch device still needs the focus motion. Unit tests pin the split pair, the focus alternative left inside the guard, and the utility exemption. :fact[0mbj5n]
- The audit's `static.adminScope` defaults to `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit`; a site whose admin screens live elsewhere names their roots under that key so the three static motion rules resolve over them. :fact[t767qb]
- `static.cssFiles` names standalone CSS files, none by default, that the CSS-family static rules read beside every component's scoped `<style>` block. `token-colors`, `motion-band`, and `reduced-motion` read every named file, while the three `adminOnly` motion rules read a named file only when it lies under an admin root, so a theme file outside `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit`, and any configured `static.adminScope` is not checked by them even when named. :fact[22odbz]
- See [../reference/cairn-audit.md#configuration](../reference/cairn-audit.md#configuration).
- See [../reference/cairn-audit.md#the-static-rules](../reference/cairn-audit.md#the-static-rules).
- See [../reference/cairn-audit.md#what-the-motion-rules-dont-cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover).
- For what each rule checks, the static rules table is the reference; the exemptions and the frame-offset allowance sit under its coverage limits.

## Verify the screen

- The screen passes when it renders inside the shell, its `load` refuses a session the map does not admit, it leaves an audit row for each write, and it clears the error tier of `cairn-audit`.
- A lead-in before the checks: the browser and audit-row checks run against a site served through the auth guard, either a default build served by `npm run build` and then `npm run preview` (which runs `wrangler dev`) or the deployed site, never under `npm run dev`. Under `npm run dev`, the hooks module takes the dev-backend branch, which mints an owner session on every `/admin` request and wires no audit sink, so the refusal check and the audit-row check cannot pass there. :fact[f21bcz] :fact[dqjkci] :fact[xluud1] :fact[vh5aw8]
- The scaffold's hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if` whose test reads the build-time `__CAIRN_DEV_BUILD__` define directly and then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`, and exports the result as `handle`; both handles take the composed `runtime` the hooks import from `#chassis/cairn.server.js` (`createAuthGuard({ runtime })` and `devBackendHandle({ runtime })`), where earlier versions took optional `roles` and `access` options and a bare `createAuthGuard()` was valid. The opt-in reads the Worker env first and falls back to `process.env`, since `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. :fact[f21bcz]
- The dev backend, `devBackendHandle({ runtime })` from `@glw907/cairn-cms-dev`, installs an in-memory GitHub Backend, a fake `AUTH_DB`, and a fake media bucket for `/admin`, `/media`, and `/preview` requests and mints an owner editor on `/admin`, so no email loop runs; its state lives for the server process, so a save or publish never leaves the machine. :fact[dqjkci]
- `vite.config.ts` wires the `cairnManifest` plugin, which verifies the committed content manifest on build, and the plugin's own `config` hook defines `__CAIRN_DEV_BUILD__`, which the dev backend gates on: `true` under `vite dev` and under a `VITE_CAIRN_E2E=1` build, `false` in a default build, and a define the site already set wins. The scaffold's `vite.config.ts` carries no define of its own. :fact[xluud1]
- A rendered `cairn-audit` run never starts a server: it reads `BASE_URL`, default `http://localhost:4173`, and fails naming that URL when nothing answers there. The scaffold's `preview` script (`wrangler dev`) serves on port 4173 (`wrangler.jsonc`'s `dev.port`), so a scaffolded site's rendered run needs no `BASE_URL` once `npm run build` and `npm run preview` are running in another shell. Every configured page renders under both the light and the dark theme. :fact[vh5aw8]
1. In a browser signed in as an owner, open the screen under `/admin`. Observable result: the screen renders as the children of `CairnAdminShell`, with the shell's nav, user, and theme.

:::row
**Symptom.** The owner gets a 403 on the screen.
**Cause.** The access map has no rule for the route, which refuses every session, owner included.
**Fix.** See [restrict-admin-access.md](restrict-admin-access.md).
:::

- A role or session with no rule declared for a route's path gets a 403 from the access map, owner included, since `hasAccessRule` carries no owner exemption. :fact[3lbdl6]
1. In a second browser, signed in as a second editor whose role the screen's rule does not name, open the screen. Say where that account comes from: an owner adds it through the Add editor form on `/admin/editors`, choosing such a role in its Role select (for the signups rule, `editor`), as Restrict admin access describes under Assign the roles. Observable result: `requireAccess` refuses the session with a 403.
- On `/admin/editors`, every role option in both the roster row's select and the Add editor form's Role select is labeled by `roleOptionLabel`: the bare role name when the name equals its capability, otherwise the name followed by its capability in parentheses, so a role `webmaster` declared with editor capability reads `webmaster (editor)`. :fact[2dgbff]
- See [restrict-admin-access.md#assign-the-roles](restrict-admin-access.md#assign-the-roles).
1. In a browser signed in as an owner, submit one of the screen's actions.

:::row
**Symptom.** The submit returns a 403, and the logs carry `guard.refused` with `reason: csrf`.
**Cause.** The form that posted has no `CsrfField`.
**Fix.** In each form that posts to one of the screen's actions, mount a `CsrfField` from `@glw907/cairn-cms/admin`.
:::

1. In the audit database, query the `audit_log` table for its newest row. Observable result: one row for the action, whose `action` and `entity` match the wrapper's options.

:::row
**Symptom.** No row arrives for the action.
**Cause.** The request ran under `npm run dev`, whose dev-backend branch wires no sink; or a handler skipped `ctx.audit`; or no handle set the sink; or the sink's insert failed.
**Fix.** In the terminal that serves the site, check that the request ran under a default build served by `npm run preview` or on the deployed site, not under `npm run dev`, whose dev-backend branch replaces the guard and wires no sink. The checks run in order and form a numbered list.
:::

- `audit_log` (`0002_audit.sql`) holds one row per audited admin action (`actor`/`action`/`entity`/`entity_id`/`detail`), timestamped in ISO 8601 at millisecond resolution, written only by a site that wires `createD1AuditSink`. :fact[wnvqlz]
- The `ctx.audit` a `createSectionAction` handler receives seeds the record's `action` and `entity` from the wrapper's options unless the handler's own `ctx.audit` call passes either, so an audit row names the wrapper's `action` and `entity` by default. :fact[6vy0ka]
1. In the site directory, run `npm run check:cairn`.
- The scaffold's `check:cairn` script (`npm run build:admin-css && cairn-audit`) runs the whole static registry, so it now also runs the three public-scope rules; their findings print under the report as advisories and never change the exit code (`exitCodeFor` returns 1 only for an unsuppressed error-tier finding), and a missing `daisyui` or `tailwindcss` peer fails the run with a message that names the peer and `npm install --save-dev <peer>`. :fact[mrv24k]

:::row
**Symptom.** The command exits 1 and the report lists an unsuppressed error-tier finding.
**Cause.** 
**Fix.** In the report, fix each unsuppressed error-tier finding.
:::

1. In the report, fix each unsuppressed error-tier finding.
- `cairn-audit` exits 1 only when a report holds an unsuppressed error-tier finding, so an advisory finding prints without changing the exit code; a bare run reads the static registry, and `--rendered` drives a browser against an already-running server instead. :fact[1md5oj]
1. In the site directory, run the script again until no error-tier finding remains.
- A custom admin screen and the engine's own admin screens are audited by the same static rule objects: the default scan scope names `src/routes/admin` beside the engine's `src/lib/admin` and `src/lib/admin-toolkit`, the packaged `cairn-audit` bin runs one registry with one motion ruleset, and the scaffold's `check:cairn` script runs it. :fact[326755]
- See [../reference/cairn-audit.md#tiers-and-exit-codes](../reference/cairn-audit.md#tiers-and-exit-codes).
- See [run-cairn-audit-on-your-site.md](run-cairn-audit-on-your-site.md).
- See [../reference/cairn-audit.md#the-rules](../reference/cairn-audit.md#the-rules).
- A rendered run for the custom screen is set up on Run cairn-audit on your site; a missing audit row is traced next.

## Resolve a missing audit record

- A missing audit record means the request ran under the dev backend, a handler skipped `ctx.audit`, no handle set the sink, or the sink's insert failed.
- When a `createAdminAction`-wrapped handler returns without calling `ctx.audit`, the wrapper throws `UnauditedActionError` (a 500) in dev; in production it logs `admin.action.unaudited` at error instead of throwing, because an unaudited state change is a defect but "should not 500 a live site". A handler that returns an `ActionFailure` (SvelteKit's `fail()`) is exempt from the check: a rejected request mutated nothing, so it owes no audit. The exemption assumes the handler rejects before mutating; a handler that writes and then returns `fail()` still has to emit, since nothing rolls its writes back. :fact[07efts]
1. In the terminal that serves the site, check that the request ran under a default build served by `npm run preview` or on the deployed site, not under `npm run dev`, whose dev-backend branch replaces the guard and wires no sink. The checks run in order and form a numbered list.
- The scaffold's hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if` whose test reads the build-time `__CAIRN_DEV_BUILD__` define directly and then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`, and exports the result as `handle`; both handles take the composed `runtime` the hooks import from `#chassis/cairn.server.js` (`createAuthGuard({ runtime })` and `devBackendHandle({ runtime })`), where earlier versions took optional `roles` and `access` options and a bare `createAuthGuard()` was valid. The opt-in reads the Worker env first and falls back to `process.env`, since `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. :fact[f21bcz]
1. In the action's handler, check that every successful path calls `ctx.audit` before it returns.
2. In `hooks.server.ts`, check that a handle sets `event.locals.cairnAuditSink` and that `sequence` composes it into the exported `handle`.
3. In Workers Logs, look for `audit.sink.write_failed`, whose reason `wait_until_failed` names an unbound `waitUntil`.
- Inside a request, a site passes `createD1AuditSink` the `waitUntil` that `cloudflare:workers` exports and binds nothing, while a caller holding an `ExecutionContext` (a Cron `scheduled` handler) binds it first (`ctx.waitUntil.bind(ctx)`), because the unbound method typechecks and then throws 'Illegal invocation' in workerd; the sink catches that, logs `audit.sink.write_failed` with reason `wait_until_failed`, and the insert runs unprotected, so the row can be lost. :fact[ph6kjg]
- See [debug-your-site.md](debug-your-site.md).
- See [../reference/log-events.md](../reference/log-events.md).
- Debug your site maps `admin.action.unaudited` to its cause, and the log events reference lists both events' fields and the `audit.sink.write_failed` reasons.

## See also

- The following pages cover the tasks and reasoning around a custom screen.
- A bulleted list, one complete sentence per page, naming what each page does; the recovery link from the previous section is not repeated.
- See [restrict-admin-access.md](restrict-admin-access.md).
- See [arrange-the-admin-sidebar.md](arrange-the-admin-sidebar.md).
- See [run-cairn-audit-on-your-site.md](run-cairn-audit-on-your-site.md).
- See [security-model.md](security-model.md).
- See [configure-media.md](configure-media.md).
- See [define-an-adapter-and-schema.md](define-an-adapter-and-schema.md).
- See [../reference/admin-toolkit.md](../reference/admin-toolkit.md).
