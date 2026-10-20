# cairn-cms Pass L: navigation-tree management design

**Date:** 2026-05-27
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Status:** design approved in brainstorm; spec for review before the implementation plan.

## Purpose

Give non-technical editors a UI to manage each site's navigation menu (the ordered, nestable list
of links in the header) from `/admin`, instead of a developer hand-editing a `navLinks` array in
`Nav.svelte`. This is also the first **D1-backed site-structure surface** in the admin, so it is
designed as a reusable pattern that the later R8 collection-CRUD round and future site settings can
follow, not as a one-off.

## Background

### What exists today

Both consumer sites hard-code their header nav inside a Svelte component, with no data file,
hierarchy, ordering metadata, or link between the nav and the `pages` collection:

- **ecnordic-ski:** `src/lib/components/Nav.svelte` holds a six-item `navLinks` array (About,
  Training, Volunteers, CrewLAB, Resources, Contact), iterated for desktop + mobile.
- **907-life:** `src/lib/components/Nav.svelte` has three literal `<a>` tags (Archives, About,
  Contact-as-anchor), no array.

Nav targets are a mix of content pages (`/about`), SvelteKit routes (`/contact`, `/archives`), and
anchors (`/about#contact`). Neither site has submenus. So Pass L defines the nav data model from
scratch; there is nothing to migrate beyond the current flat link lists.

### How other CMSes do this (research synthesis)

- **Git CMSes** (Sveltia, Decap, Keystatic, Tina) have no dedicated nav UI. They model nav as a
  singleton data file edited through a generic list-of-objects field; order is array position,
  nesting is an inline `children` array.
- **Mature CMSes** (WordPress, Statamic, Strapi) converge on two-axis drag (vertical reorder plus
  horizontal indent to nest), three item types (internal page reference, free URL, structural
  label), an internal page picker, multiple named menus, and a configurable max depth. Ghost is the
  deliberate minimalist (flat list, label plus URL, no nesting).

cairn takes the high-value, lean subset: a nestable tree, drag to reorder and indent, a free-URL
item with a page-picker assist, label-only parent items, and a data model that allows multiple
named menus while shipping only the primary header this pass.

## Locked decisions feeding this pass

- **D1 for all admin storage** (committed 2026-05-27). D1 is the source of truth for admin-managed
  structure/config; only content stays markdown-in-git. Nav is the first instance. See PLAN.md.
- **Edge SSR consumption.** Public sites read admin-managed state from D1 at request time on
  Cloudflare Workers, rather than baking it into prerendered static HTML.
- **Engine-fat, site-thin.** The engine owns the storage, CRUD, validation, and the editor
  component; it returns nav as data. Each site renders the tree with its own header markup.
- **F2 byte-identical invariant.** The two sites' `admin/` route shims stay byte-identical; only
  each site's `cairn.config.ts` and its own `Nav.svelte` rendering differ.
- **Capabilities over role names.** Gate management surfaces on better-auth access-control
  statements, not on role-name checks, so the two-tier model can grow finer capabilities (and a
  future role) additively. Refines the R2 two-tier locked decision without adding a role.

## Design

### Storage shape

One row per named menu in each site's existing `AUTH_DB` (one D1 binding; a cairn-owned migration
sits alongside the better-auth tables). The tree is stored as JSON in a single column:

```sql
CREATE TABLE nav_menu (
  name       TEXT PRIMARY KEY,   -- e.g. 'primary', 'footer'
  tree_json  TEXT NOT NULL,      -- serialized NavNode[]
  updated_at INTEGER NOT NULL    -- epoch ms
);
```

A nav is small and is always edited as a whole, so a JSON tree per menu gives atomic writes and a
one-row read, and matches how the editor works (the client rebuilds the whole tree on a drag and
writes it back). Normalized `nav_item` rows would add per-row position juggling on every reorder and
buy queryability the nav does not need. The `name` primary key means multiple menus are free in the
data model; this pass manages the **primary header** menu on both sites.

Each tree node:

```ts
export interface NavNode {
  label: string;        // display text, required
  url?: string;         // omitted/empty means a label-only grouping header (e.g. a dropdown parent)
  children?: NavNode[]; // omitted means a leaf
}
```

Order is array position. Max depth defaults to 2 (a parent plus one level of children),
configurable per menu via the adapter.

### Adapter contract addition

One small, optional field on `CairnAdapter`:

```ts
navMenus?: { name: string; label: string; maxDepth?: number }[];
```

A site opts in by declaring the menus it wants managed. With no `navMenus`, the "Navigation" nav
item does not appear in the admin (the same opt-in pattern as the empty component registry hiding
the insert palette). The page-picker reuses `adapter.collections`: the page-kind collection's
entries are listed through the existing `listMarkdown` read path, and picking one fills a URL
string into the node. No reference-resolution layer; a stored URL string covers pages, routes,
anchors, and external links uniformly.

### Engine surface (`@glw907/cairn-cms`)

- **New nav module** with server functions for the admin: `navLoad(env, name)` and
  `navSave(env, name, tree, maxDepth)`. `navSave` validates the tree before writing: every node has
  a non-empty `label`, depth does not exceed the menu's `maxDepth`, and the structure is a finite
  tree (no cycles, bounded size). Invalid input is rejected with a typed error the route surfaces as
  a form error, consistent with the existing save-conflict handling.
- **`loadNav(env, name): Promise<NavNode[]>`** for the public site. Returns the tree as data;
  returns an empty array if the menu row is absent, so a site renders an empty nav rather than
  erroring. The engine stays presentation-agnostic and never emits header markup.
- **Capability statements** added to the access-control config (`story:create`, `story:edit`,
  `page:edit`, `page:create`, `nav:manage`, `user:manage`), with `owner` granted all and `editor`
  granted the content subset. The nav and create server fns check the relevant statement and throw
  the existing typed authz error when denied; the load fns expose the viewer's capabilities so the
  UI can hide gated affordances.
- **`NavTree.svelte`** editor component, styled with DaisyUI primitives (`menu`, `card`, `btn`,
  `input`, `select`, `join`) under the Warm Stone admin theme. It renders the tree, an add-item
  form (label plus URL with a "pick a page" dropdown sourced from the page collection), per-node
  edit and delete, and two-axis drag: vertical drag reorders within a level, horizontal drag indents
  a node under its previous sibling (and outdents), capped at `maxDepth`. Drag behavior uses native
  HTML5 drag-and-drop events; no heavy DnD dependency. The component edits a local copy of the tree
  and posts the whole tree to `navSave` on save, matching the storage shape.

### Per-site work (byte-identical shims)

- **Route shim:** `src/routes/admin/nav/+page.server.ts` (load to `navLoad`, `save` action to
  `navSave`) and `+page.svelte` (renders `<NavTree>`). Byte-identical across both sites.
- **Nav entry** added to `AdminLayout`, shown only when the viewer holds `nav:manage` (owner today),
  the same data-driven role-gating the Editors entry already uses. The nav route load + actions
  enforce `nav:manage` server-side.
- **Page-create gating.** The collection-list "new entry" affordance and the `createEntry` action
  check `page:create` for `kind: 'page'` collections (hidden and blocked for editors); story
  creation and all editing stay open. This is the same capability layer the nav surface uses.
- **Migration plus seed:** the `nav_menu` migration is added to each site's `AUTH_DB`; a one-time
  seed script imports each site's current hardcoded `navLinks` into the `primary` menu row (the
  pattern the Pass AUTH allowlist migration established).
- **Consumption (the significant site change):** each site's root layout reads the nav from D1 at
  request time via `loadNav` and passes the tree to its own `Nav.svelte`, which renders it with the
  site's existing header markup and styles. This replaces the hardcoded `navLinks` and de-prerenders
  the root layout (the layout, and therefore pages, render on request on Workers). Because the nav
  changes rarely, the follow-up optimization is to cache the rendered output at the edge (Cache API)
  and bust it on nav save; that caching work is named here but is not a blocker for this pass.

### Access and roles (capability statements, not a third role)

The two-tier `owner`/`editor` model stays; this pass refines what an `editor` can do and gates on
**capability statements** in the better-auth access-control layer (already in use) rather than on
role names. Creating a page and changing the nav are *structural* acts (a new page is a new section,
usually paired with a nav change), so they share an elevated tier. Editing a page's content and
running the story feed are everyday content work.

Capabilities:

| Capability      | editor | owner |
|-----------------|:------:|:-----:|
| `story:create`  |   ✓    |   ✓   |
| `story:edit`    |   ✓    |   ✓   |
| `page:edit`     |   ✓    |   ✓   |
| `page:create`   |        |   ✓   |
| `nav:manage`    |        |   ✓   |
| `user:manage`   |        |   ✓   |

`owner` holds all statements (unchanged from today). `editor` gains the explicit content statements
and is denied `page:create` and `nav:manage`. Gating on capabilities, not role names, keeps the door
open: a future `manager` role that gets structure capabilities without `user:manage` becomes a
statement bundle, no rewrite and no schema change.

This grows the pass's scope coherently beyond nav: the same capability layer also gates **page
creation**. The "new entry" affordance and the create action for `kind: 'page'` collections check
`page:create` (hidden and blocked for editors); story creation and all editing stay open. On
ecnordic this restricts creating new pages while leaving posts unaffected; 907 has only a story
collection, so its editors are unaffected.

## What this pass does NOT do (scope cuts, all future-additive)

- **Multiple menus in the UI.** The data model is keyed by menu name, but only the primary header is
  managed this pass. A footer menu (both sites have footer icon links) is a later additive entry.
- **Live page references.** Items store a URL string, not a rename-safe reference. A "this nav link
  points nowhere" broken-link check is a cheaper future safety net if renames become a problem.
- **Edge-cache-and-bust optimization.** Named above; built later. This pass ships correct runtime
  reads first.
- **Per-item extras** (CSS classes, link target, description, icons). Out of scope; the lean node is
  label plus url plus children.

## Testing

- **Engine.** Tree validation (empty-label rejection, depth-cap enforcement, malformed JSON,
  cycle/size guards) and CRUD over in-memory SQLite, following the Pass AUTH integration-test
  pattern. `loadNav` returns an empty array for a missing menu. Capability gating: an editor is
  denied `nav:manage` and `page:create` while allowed `story:create`/`story:edit`/`page:edit`; an
  owner is allowed all. `svelte-package` emits the new module and `NavTree.svelte`.
- **Both sites.** `svelte-check` 0/0; Cloudflare `npm run build`; the live admin smoke (mint a
  better-auth session, load `/admin/nav`, confirm the tree editor renders and a save round-trips to
  D1; confirm the public layout renders the nav read from D1). The in-browser drag interaction is the
  standing Firefox user step, as in prior passes.

## Verification (per the initiative's per-pass bar)

Package `svelte-package` plus vitest; both sites `svelte-check` 0/0 plus Cloudflare build; live
`wrangler dev` smoke on both sites with a minted editor session; visual confirmation in Firefox.
Release as a cairn-cms minor with both-site repoint plus per-site D1 migration (the Pass P pattern).
