# cairn-cms Pass L2: nav editing UI (write side)

**Date:** 2026-05-28
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Design:** `docs/superpowers/specs/2026-05-27-pass-l-yaml-site-config-design.md` (the L2 half)
**Status:** plan for execution. Pass L (read side + config migration) is done and committed locally.

## Goal

Give a non-technical owner an `/admin/nav` editor that commits the site-config YAML through the
existing GitHub-App pipeline. This is the write side of the YAML site-config design; the read side
shipped in Pass L. No D1 nav table: nav lives in `site.config.yaml`, edited as a tree and committed
like content.

## Decisions carried in (from the brainstorm, 2026-05-28)

- NavTree keeps its current native-HTML5 drag and `<datalist>` page-picker. Keyboard-accessible
  drag-reorder and a real combobox are logged as a backlog item, not built here (a headless lib such
  as Bits UI is the future escape hatch; no styled component library, which would fight the
  self-contained admin theme).
- Verification ends with the full `docs/admin-smoke-test.md` mint-session smoke on both sites.

## Work

### Engine (`@glw907/cairn-cms`)

1. **`src/lib/nav.ts`.** Drop the D1 store (`readNavTree`, `writeNavTree`, `loadNav`, `NavEnv`,
   `READ_DEPTH_CAP`, the `D1Database` import) and rewrite the file header (it no longer stores in
   D1). Add `setMenu(raw, name, tree): string`: parse the existing YAML, replace only `menus[name]`,
   re-serialize, and preserve every other top-level key (`siteName`, other menus, `settings`, ...).
   Comment loss on rewrite is accepted; data-key preservation is mandatory. Keep `NavNode`,
   `MAX_NAV_NODES`, `validateNavTree`, `NavValidationError`, `SiteConfig`, `parseSiteConfig`,
   `extractMenu`, `SiteConfigError` unchanged.

2. **`src/lib/adapter.ts`.** Replace `NavMenuConfig` with the L2 shape:
   `{ configPath: string; menuName: string; label: string; maxDepth?: number }`. Change
   `navMenus?: NavMenuConfig[]` to `navMenu?: NavMenuConfig` (single object). Update the comments
   (the menu is read from and committed to the YAML file, not D1).

3. **`src/lib/sveltekit/index.ts`.**
   - Imports: drop `readNavTree`/`writeNavTree`; keep `validateNavTree`, `NavNode`; add
     `extractMenu`, `setMenu`. Remove `AUTH_DB` from `AdminEnv` (only the nav D1 store used it).
   - `adminLayoutLoad`: map the single `adapter.navMenu` to the existing `navMenus: {name,label}[]`
     shape (`navMenu ? [{ name: menuName, label }] : []`) so `AdminLayout.svelte` and its tests stay
     unchanged.
   - `navLoad`: read `adapter.navMenu`; `readRaw(adapter.backend, configPath, token)`; if the file is
     missing, tree is `[]`; else `extractMenu(parseSiteConfig(raw), menuName, maxDepth)` wrapped so a
     parse/validate failure degrades to `[]` (the editor still loads). Keep the `navPageOptions`
     picker and the `{ menu, tree, pages, saved, error }` return shape (menu `name` carries
     `menuName`).
   - `navSave`: `requireCapability('nav:manage')`; validate the submitted tree against `maxDepth`;
     `readRaw` the current file (404 is fatal here: cannot edit a file that is not committed);
     `setMenu`; `commitFile(adapter.backend, configPath, next, { message, author: editor }, token)`;
     carry the 409 `CommitConflictError` fail-safe (bounce back with the reload message). A validate
     failure redirects with `?error=`.

4. **Tests + migration.**
   - `src/tests/nav.test.ts`: remove the `nav D1 store` describe, the `d1`/`freshDb` shims, and the
     `better-sqlite3` import. Keep the `validateNavTree` suite. Add a `setMenu` suite: replaces only
     the target menu, preserves `siteName`/`settings`/other menus, round-trips a nested tree.
   - `src/tests/sveltekit.test.ts`: rewrite the `navLoad`/`navSave` specs to the YAML path. Stub
     `readRaw`/`commitFile` (the file already mocks `../github` patterns; follow them) instead of the
     D1 shim. `navAdapter` gains the `navMenu` object. Keep the capability-gate and 404-when-no-menu
     specs. The `adminLayoutLoad nav surface` specs keep asserting `navMenus: [{name,label}]`.
   - Delete `migrations/0001_nav_menu.sql`.

### Sites (ecnordic-ski + 907-life, byte-identical route shims)

5. **`src/lib/cairn.config.ts`** (each): add
   `navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 }`.

6. **`src/routes/admin/nav/+page.server.ts`** (each, identical):
   ```ts
   import type { PageServerLoad, Actions } from './$types';
   import { navLoad, navSave } from '@glw907/cairn-cms/sveltekit';
   import { cairn } from '$lib/cairn.config';

   export const load: PageServerLoad = (event) => navLoad(event, cairn);
   export const actions: Actions = { save: (event) => navSave(event, cairn) };
   ```

7. **`src/routes/admin/nav/+page.svelte`** (each, identical): a one-line `NavTree` shim around
   `data`, matching the other route `.svelte` shims.

## Gate

- Engine: `npm run package` clean (`setMenu` emitted to `dist`); vitest green.
- Both sites: `svelte-check` 0/0; Cloudflare `npm run build`.
- Live: `docs/admin-smoke-test.md` on both sites with a minted owner session: load `/admin/nav`, POST
  a save, confirm the YAML commits to `main` via the GitHub-App path (author = editor, committer =
  bot). The in-browser drag and the final Firefox commit click stay the standing user step.

## Out of scope (future-additive, per the spec)

Multiple managed menus in the UI; editors for non-nav config (identity/email/footer/settings);
rename-safe page references; comment-preserving YAML rewrites; keyboard-accessible DnD + combobox.

## Close-out

code-simplifier over the changed engine + site files; update `PLAN.md` progress log (Pass L2 done,
risk register if touched); log the nav-a11y backlog item; commit per-repo (engine + both sites), do
not push. Ship folds into the next cairn-cms minor with both sites repointed (the Pass P pattern),
not in this pass.
