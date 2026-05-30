# Cairn rebuild Plan 08: site cutover (design)

Status: approved design, pre-plan. Authored 2026-05-29.

This design covers the cutover that repoints both consumer sites (907-life and
ecnordic-ski) from the old pre-rebuild `@glw907/cairn-cms` API onto the rebuilt
engine. It supplements the functional spec at
`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`, which holds the
locked architecture. The numbered plan derived from this design lands at
`docs/superpowers/plans/2026-05-29-cairn-rebuild-08-cutover.md`.

## Why this is more than a version bump

The rebuilt engine changed shape, not just names. Four shifts drive the work:

- Route handlers moved from free functions called `(event, cairn)` to factories
  (`createContentRoutes`, `createAuthRoutes`, `createEditorRoutes`, `createNavRoutes`)
  that close over a composed runtime.
- Auth moved from better-auth on Drizzle to self-owned magic-link on D1 with opaque
  session rows. The `/auth` subpath is gone; the guard and the auth routes live under
  `/sveltekit`.
- The adapter contract changed from `collections[]` to `content: { posts?, pages? }`,
  from `preview` plugin arrays to a `renderPreview(md)` function, and `validate` now
  returns a `ValidationResult` rather than throwing.
- The standalone `admin/save/+server.ts` endpoint folded into the edit page's save
  action.

The showcase example exercises the content routes and healthz, but it gates auth
behind a fake session injector. So the two sites are the first real consumers to wire
the live magic-link auth, the editor-management surface, and the nav editor against
the rebuilt engine.

## Goal

Both sites run on the published `0.6.0-rc.0` engine in production, with the new admin
surface, self-owned auth, and a public-render sanitize floor. The `rebuild` branch
merges to `cairn-cms` `main` once both sites prove the RC live.

## Prerequisites (Phase 0)

The owner publishes `0.6.0-rc.0` to npm under the `rc` dist-tag before any site work
begins. This is owner action and blocks the rest of the plan. As of this writing npm
shows `latest` at `0.5.1` and no `rc` tag.

Each site then pins `@glw907/cairn-cms@0.6.0-rc.0` (an exact pin, not a range) and
reinstalls so the dependency resolves the registry tarball. The `~/Projects/cairn` npm
workspace symlinks the live `main` checkout into each site's `node_modules`, so the
install step has to resolve the published RC instead of that symlink for the duration
of the cutover.

## Sequencing

907-life cuts over first as the canary. It carries the simpler render path (plain
markdown, no directive pipeline), so it proves the auth, adapter, and route mechanics
with a smaller blast radius. ecnordic-ski follows once 907-life is verified live. The
`rebuild` to `main` merge comes last, after both sites run the RC in production.

The two sites consume the engine from npm, so the merge is independent of the site
deploys. Holding it until both sites validate the RC keeps `main` from advancing on an
engine version that has not proven itself against real content.

## Old to new API surface map

The whole `/admin` tree and `hooks.server.ts` get rewritten on both sites. Imports
resolve from three entry points only: the root, `/sveltekit`, and `/components`.

| Old | New |
| --- | --- |
| `hooks: createAuth + loadSession` | `export const handle = createAuthGuard()` |
| `adminLayoutLoad(e, cairn)` | `createContentRoutes(composeRuntime(cairn)).layoutLoad` |
| `adminIndexRedirect(cairn)` | `routes.indexRedirect` |
| `admin/[collection]` `collectionListLoad` / `createEntry` | `admin/[concept]` `routes.listLoad` + `actions.create = routes.createAction` |
| `admin/save/+server.ts` `saveCommit` | deleted; folded into `actions.save = routes.saveAction` |
| `admin/edit/[type]/[id]` `editLoad` | `admin/edit/[concept]/[id]` `routes.editLoad` + `actions.save` |
| `admin/admins` `adminsLoad` / `addAdmin` / `removeAdmin` / `setAdminRole` (`/auth`) | `admin/editors` `createEditorRoutes()` → `editorsLoad` + add / remove / setRole actions |
| `admin/nav` `navLoad` / `navSave` | `createNavRoutes(runtime)` → `navLoad` + `actions.save` |
| `admin/login` (data from layout) | `+page.server.ts`: `load = createAuthRoutes({ branding, send? }).loginLoad`, `actions.default = requestAction` |
| `admin/auth/confirm` `confirmSignIn` | `load = confirmLoad`, `actions.default = confirmAction` |
| `admin/auth/logout` `signOut` | `POST = logoutAction` |
| `admin/healthz` `healthLoad(e)` | `healthLoad(event, runtime)`, event first |

`AdminLayout` hardcodes the sidebar hrefs `/admin/<conceptId>`, `/admin/nav`, and
`/admin/editors`, so the route directory names follow those paths. The runtime comes
from `composeRuntime(cairn)`; the real site shims call the route factories with no
`mintToken` dep, which defaults to the live GitHub App signer.

## Adapter rewrite (`cairn.config.ts`)

Both adapters move to the new `CairnAdapter` shape:

- `collections: [...]` becomes `content: { posts: {...}, pages: {...} }`. 907-life
  declares `posts` only; ecnordic declares `posts` and `pages`.
- `preview: { remarkPlugins, rehypePlugins }` becomes `renderPreview: (md) => string`.
  907-life supplies a plain markdown render. ecnordic supplies its directive render so
  the editor preview matches the public output.
- `sender` as a string becomes `sender: { from }`.
- `backend` gains `appId` and `installationId` alongside `owner`, `repo`, and `branch`.
- Each concept's `validate` returns `{ ok: true, data }` or `{ ok: false, errors }`.
  The sites' `validatePostFrontmatter` and `validatePageFrontmatter` get rewritten from
  throw-on-error to that result shape.

907-life keeps the `freetags` field type for its tags. ecnordic keeps the controlled
`tags` field. `navMenu` keeps its `configPath` / `menuName` / `label` / `maxDepth`
shape on both.

## Auth backend migration (D1)

Each site's `AUTH_DB` holds better-auth Drizzle tables today. The rebuilt schema is
three tables from `migrations/0000_auth.sql`: `editor` (the allowlist), `magic_token`,
and `session`. The new table names do not collide with the better-auth tables, so
applying the migration is additive and safe on a live database.

Seeding carries the current allowlist forward. The plan reads the live editor rows
through the Cloudflare MCP `d1_database_query`, then inserts matching `editor` rows
(email, display name, role), with geoff as `owner`. No current editor loses access.
Sessions do not carry over; every editor re-authenticates through a fresh magic link,
which is acceptable for a cutover.

The old better-auth tables and the legacy `AUTH_KV` namespace stay in place through the
canary as rollback grace. Dropping them is a later cleanup, out of scope for this pass.

## wrangler and env changes (per site)

- Remove the better-auth vars `AUTH_SECRET` and `BETTER_AUTH_URL`.
- Repoint or remove the Drizzle `migrations_dir`; the cutover applies the cairn auth
  migration directly.
- Set `PUBLIC_ORIGIN` to the site's origin. The new auth derives the magic-link origin
  from config and never from a request header, so a forged Host cannot redirect a link.
- Keep `AUTH_DB`, the `EMAIL` send binding, and the GitHub App secrets
  (`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`).
- `app.d.ts` `Locals` changes from `{ auth, user }` to `{ editor: Editor | null }`.

## Sanitize floor

The public render is each site's own request-time pipeline, separate from the editor
preview that the Plan 07 DOMPurify floor already covers. The threat is an authored
`<script>` or a dangerous URL reaching `{@html}` on the public site through a
compromised or malicious editor account. Both pipelines pass raw HTML through today.

907-life renders through `remark-html` at its default, which does not strip raw HTML.
Adding a `rehype-sanitize` step with the default schema closes the hole with no
authored content lost, since 907-life content carries no intentional raw HTML.

ecnordic is the hard case. Its CTA directive injects `<a class="download-link">`
through `rehype-raw` passthrough, and the directive pipeline emits a wide element and
class surface (card, grid, alert, cta, split, panel, passage, plus glyph `svg`/`path`).
A default sanitize schema would strip the download links and the directive classes. The
floor there is a `rehype-sanitize` step as the final rehype plugin, with a custom schema
that allowlists the engine's directive output and the download-link anchor. Both sites'
characterization snapshots change as a result, and the plan regenerates them under
review rather than treating the diff as a regression.

This is the highest-risk task in the pass. The allowlist has to be wide enough to keep
every legitimate directive rendering and narrow enough to drop scripts and event-handler
attributes.

## Final admin route tree (both sites)

```
admin/+layout.server.ts        load = routes.layoutLoad
admin/+layout.svelte           AdminLayout
admin/+page.server.ts          load = routes.indexRedirect
admin/[concept]/+page.server.ts   load = routes.listLoad; actions.create = routes.createAction
admin/[concept]/+page.svelte      ConceptList
admin/edit/[concept]/[id]/+page.server.ts  load = routes.editLoad; actions.save = routes.saveAction
admin/edit/[concept]/[id]/+page.svelte     EditPage
admin/editors/+page.server.ts  createEditorRoutes(): load = editorsLoad; actions add/remove/setRole
admin/editors/+page.svelte     ManageEditors
admin/nav/+page.server.ts      createNavRoutes(runtime): load = navLoad; actions.save = navSave
admin/nav/+page.svelte         NavTree
admin/login/+page.server.ts    load = auth.loginLoad; actions.default = auth.requestAction
admin/login/+page.svelte       LoginPage
admin/auth/confirm/+page.server.ts  load = auth.confirmLoad; actions.default = auth.confirmAction
admin/auth/confirm/+page.svelte     ConfirmPage
admin/auth/logout/+server.ts   POST = auth.logoutAction
admin/healthz/+server.ts       GET → json(healthLoad(event, runtime))
hooks.server.ts                export const handle = createAuthGuard()
```

The old `admin/[collection]`, `admin/save`, and `admin/admins` directories are removed.

## Verification per site

- `npm run check` clean (0 errors, 0 warnings) and the full test suite exits 0.
- `wrangler deploy --dry-run` as a build guard before the real deploy.
- After deploy, `GET /admin/healthz` returns `ok: true`, which proves the GitHub App
  signer against the real PKCS#1 key in production.
- Live `/admin` smoke, including `/admin/nav`. A session is minted by inserting a
  `session` row directly through the Cloudflare MCP; the magic-link click stays a manual
  browser step.

## Merge strategy

`git merge --no-ff rebuild` into `cairn-cms` `main`, preserving the rebuild's per-task
history and post-mortems under one merge commit. The merge happens after both sites run
the RC in production.

## Risks

- The sites wire `createAuthRoutes` / `createEditorRoutes` / `createNavRoutes` end to
  end for the first time. The factories carry unit tests, so the failure surface is the
  route wiring and the form contracts, which the live smoke covers.
- The ecnordic sanitize allowlist is the most error-prone change. A too-narrow schema
  breaks rendering silently; a too-wide one defeats the floor.
- The D1 seed depends on the live better-auth row shape. The plan inspects the actual
  rows before writing the seed rather than assuming a column layout.

## Out of scope

- Dropping the dormant better-auth tables and `AUTH_KV`.
- The Plan 06 carried follow-ups beyond what the cutover forces (theme contrast audit,
  reduced-motion gating, the `__Host-` cookie prefix, the shared tree-fetch refactor).
- Promoting `0.6.0-rc.0` to a stable `0.6.0` release.
</content>
</invoke>
