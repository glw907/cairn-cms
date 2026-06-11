# Single-mount admin and the site-seam consolidation (0.50.0, opening the 0.50.x series)

**Status: in progress (started 2026-06-11).**

## Why

The 2026-06-11 foundation review (run before the next feature round) found the engine internals
strong and the consumer seam weak. A site restates the admin route table in ~18 shim files whose
actions couple to engine components by bare strings (`formaction="?/publish"`), so an
action-adding release forces every site to hand-edit shims, and a missed key compiles clean and
fails only in an editor's hands. The 0.39 window was the proof. With two consumer sites and an
explicit owner decision to accept breaking changes for better future DX (Geoff, 2026-06-11), this
pass replaces the per-route shim contract with a single-mount admin and batches the review's
other breaking fixes into the same window.

The review also confirmed three pieces of completion debt this pass closes: the diagnostics
condition registry is adopted at only two of its intended runtime sites, `listLoad` does the N+1
GitHub crawl the manifest exists to prevent, and the `fail()` payload vocabulary is fragmented
across the route files.

## The shape

A site mounts the whole admin with one catch-all route pair:

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '$lib/cairn.server';
export const load = admin.load;
export const actions = admin.actions;
export const prerender = false;
```

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script>
  import { CairnAdmin } from '@glw907/cairn-cms/components';
  import { cairn } from '$lib/cairn.config';
  let { data, form } = $props();
</script>
<CairnAdmin {data} {form} render={cairn.render} registry={cairn.registry} icons={cairn.icons} />
```

Engine side, a new `createCairnAdmin(runtime, deps)` factory wraps the existing route factories
(which all survive as the documented advanced surface). Its `load` parses the admin path from
`event.url.pathname` (never the rest param, so an encoded segment cannot confuse the split),
dispatches to the existing loads, and returns a discriminated `AdminData`:
`{ view, layout?, page }`. Its `actions` is one static record covering the full vocabulary;
each action validates that the parsed path supports it (a `save` posted to a list URL is a 404).
A new `CairnAdmin.svelte` switches the existing view components on `data.view` and wraps the
authed views in `AdminLayout`.

Locked decisions:

- **Path parsing from `event.url.pathname`.** Ids cannot contain slashes (`isValidId`), so the
  segment split is unambiguous; unknown shapes 404.
- **Views:** `index` (redirect to the first concept), `login`, `confirm`, `list`, `edit`,
  `editors`, `nav`. Logout is action-only.
- **Action names:** `request`, `confirm`, `logout`, `create`, `save`, `publish`, `discard`,
  `delete`, `rename`, `publishAll`, `addEditor`, `removeEditor`, `setRole`. `save` branches by
  path (edit save vs nav save); `delete` branches by path (edit param id vs list form id).
- **`AdminLayout` posts `?/logout` and `?/publishAll`** as named actions on the current URL,
  retiring the absolute `/admin/auth/logout` target and the `concepts[0]` list-route coupling.
- **The guard, CSRF, cookies, and redirect semantics do not change.** The dispatcher is a facade
  over the tested route functions.
- **The old factories stay public** (`createContentRoutes` and friends) as the advanced seam;
  the docs teach single-mount as the one canonical wiring.
- **healthz stays a site-root `+server.ts`**, outside `/admin`, unchanged.
- **Work lands on `main` atop the unpublished 0.41.0**; the window publishes together
  (the 0.39/0.40 precedent). Site retrofits wait for 0.50.0 and cross in one step.

## Tasks

Each task ends on the full gate: targeted tests green, `npm run check` 0/0, `npm test` exit 0.

1. **Admin path parser.** `src/lib/sveltekit/admin-dispatch.ts`: a pure
   `parseAdminPath(pathname, concepts)` returning the view union or null. Unit tests cover every
   view, trailing slashes, unknown concepts, invalid ids, and encoded segments.
2. **`createCairnAdmin` load.** `src/lib/sveltekit/cairn-admin.ts`: the factory instantiating
   the four route factories; `load` dispatches and composes `AdminData` (layout data included for
   authed views; login/confirm stay bare). Branding defaults from `runtime.siteName`;
   `send` and `mintToken` pass through as deps. Tests against the existing fetch/send doubles.
3. **`createCairnAdmin` actions.** The static record with per-action path validation and the
   `save`/`delete` branching. Logout becomes a named action (move the handler logic; keep
   `createAuthRoutes.logoutAction` working). Tests per action, including the path-mismatch 404s.
4. **`CairnAdmin.svelte`.** The view switcher; `AdminLayout` form-target changes (`?/logout`,
   `?/publishAll`); export from the components barrel. Component tests: each view renders, the
   layout wrap appears only for authed views, logout and publish-all forms post named actions.
5. **Showcase conversion.** Replace the nine shim files with the two-file mount plus a
   `$lib/cairn.server.ts` composer (one `composeRuntime` call site). The showcase gains the
   login, editors, and nav views it never mounted. Golden-path E2E stays green (URLs unchanged).
6. **Diagnostics completion.** `requireDb`, `requireOrigin`, `appCredentials`, and the EMAIL
   binding check throw `CairnError` with their registered conditionIds; the guard renders a
   condition response for a missing `AUTH_DB` instead of the silent login redirect;
   `SiteConfigError` carries `config.site-config-invalid`. The doctor and checklist already pin
   these ids, so the registry stays frozen.
7. **Manifest-first `listLoad`.** Published rows read from main's manifest (one call) instead of
   one `readRaw` per entry; branch reads remain only for pending rows; a missing manifest falls
   back to the crawl. The list-shape tests pin row parity with the old path.
8. **`fail()` vocabulary plus `mintToken` widening.** Every action failure carries `error: string`
   (structured extras like `brokenLinks`/`inboundLinks` keep their keys beside it;
   `renameError` becomes `error`); the components read the unified shape. `mintToken` accepts
   `string | Promise<string>`.
9. **Layering and dedupe batch.** `rewriteCairnLink` moves to `content/links.ts` (components
   import it from there); `sveltekit/public-routes.ts` moves into `delivery/` and the upward
   re-export disappears; the stale `render/index.ts` barrel is deleted; `escapeXml`,
   `escapeHtml`, and `isConflict` each get one home; the delivery boundary test adds
   `@sveltejs/kit` to the forbidden imports for the data graph.
10. **Delivery rename and trim.** `createSiteIndex` becomes `createSiteResolver`
    (file `site-resolver.ts`); `buildLinkResolver` moves beside it; `paginate` is deleted
    (zero consumers); reference pages follow (`check:reference` enforces).
11. **Ambient types and event unification.** A new `@glw907/cairn-cms/ambient` subpath ships the
    `App.Locals.editor` augmentation; `ContentEvent` and `RequestContext` unify on one structural
    event type.
12. **Docs arm.** `admin-routes.md` rewritten around the single mount; reference pages for
    `createCairnAdmin`, `AdminData`, and `CairnAdmin`; the tutorial's milestone 8 rebuilt on the
    two-file mount (this also retires its stale pre-0.39 shims and the wrong
    `default: nav.navSave` example, which the live sites contradict); the upgrade guide gains the
    0.50.0 entry with the full `Consumers must:` migration; CHANGELOG.
13. **Pass end.** Simplifier over the changed code; `svelte-reviewer` and
    `web-auth-security-reviewer` (guard and auth surfaces moved); fold-ins; bump to 0.50.0;
    STATUS and memory.

## Out of scope

The public delivery endpoints (feeds, sitemap, robots) keep their three-line shims; the
tabs-versus-spaces drift in `doctor/`/`diagnostics/` waits for an editorconfig touch; the
`content/pending.ts` placement stays; the gates-and-tooling pass keeps its remaining list
(E2E in CI, the admin DOM check, the dist-spawn test, the manifest-bin cwd fix).

## Post-mortem

(at pass end)
