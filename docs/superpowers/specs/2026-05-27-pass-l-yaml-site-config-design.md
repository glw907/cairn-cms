# cairn-cms Pass L: git-committed YAML site-config + nav management design

**Date:** 2026-05-27
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Status:** design approved in brainstorm; spec for review before the implementation plan.
**Supersedes:** `2026-05-27-pass-l-nav-tree-design.md` (the D1/edge-SSR storage and consumption
design). The capability layer, the `NavNode` model, tree validation, and the `NavTree.svelte`
editor from that spec are kept; only the storage and public-read layers change.

## Purpose

Give non-technical editors a UI to manage each site's navigation menu (the ordered, nestable list
of links in the header) from `/admin`, instead of a developer hand-editing a `navLinks` array in
`Nav.svelte`. The nav is stored in a **git-committed YAML site-config file** read at build time, so
the public sites stay prerendered and Pagefind search keeps working. The same file becomes the
canonical home for all site config (`siteName`, menus, future settings), Hugo-style.

## Background

### Why the pivot from D1

The first Pass L design stored nav in D1 and read it from the public layout at request time on
Workers (edge SSR). Mid-execution that approach was rejected: flipping the public sites to edge SSR
conflicts with prerendering and breaks Pagefind, which indexes prerendered HTML, and it would force
edge-cache infrastructure plus a search re-architecture to claw back what prerendering already
gives. Nav is just another build input. Storing it in git and editing it through cairn's existing
GitHub-App commit-then-deploy pipeline (the same commit-as-publish flow content uses) keeps
prerendering and Pagefind intact, needs no edge-SSR/edge-cache/D1 table, and versions config in
git. The end-user experience is identical, so the call is about the more maintainable long-term
architecture. **Auth stays on D1.** This revises the earlier "D1 for all admin storage" and
"edge-SSR consumption" decisions for the static-config category only.

### What exists today

Both consumer sites hard-code their header nav inside a Svelte component, with no data file,
hierarchy, ordering metadata, or link between the nav and the `pages` collection:

- **ecnordic-ski:** `src/lib/components/Nav.svelte` holds a six-item `navLinks` array (About,
  Training, Volunteers, CrewLAB, Resources, Contact), iterated for desktop and mobile.
- **907-life:** `src/lib/components/Nav.svelte` has three literal `<a>` tags (Archives, About,
  Contact-as-anchor), no array.

Nav targets are a mix of content pages (`/about`), SvelteKit routes (`/contact`, `/archives`), and
anchors (`/about#contact`). Neither site has submenus. So Pass L defines the nav data model from
scratch; there is nothing to migrate beyond the current flat link lists, which seed the new file.

### Work already committed (local, not pushed) and its disposition

The D1-era Pass L work landed in local commits on `cairn-cms` `main`. The pivot reworks it in place:

- **Kept, storage-agnostic, all green (114 vitest at the time):** the capability matrix
  (`src/lib/auth/capabilities.ts` + barrel), the `NavNode` type plus `validateNavTree` in
  `src/lib/nav.ts`, page-create gating plus `canCreate`, the AdminLayout nav entry plus
  `adminLayoutLoad` navMenus/canManageNav, and `src/lib/components/NavTree.svelte`.
- **Reworked:** the D1 store in `nav.ts` (`readNavTree`/`writeNavTree`/`loadNav`) is replaced by
  YAML parse/extract/validate helpers; the adapter `navMenus[]` array becomes a single `navMenu`
  config object; `navLoad`/`navSave` in `sveltekit/index.ts` read and commit the YAML file instead
  of D1.
- **Dropped:** `migrations/0001_nav_menu.sql`; no D1 table is needed.

The dropped and reworked commits are local-only, so they are reworked in place with no revert
needed. ecnordic's D1-wiring/prerender-flip commit was already reset back to a clean build; 907 was
untouched.

## Locked decisions feeding this pass

- **Content and config stay in git.** Only runtime admin state (auth) lives in D1. Site structure
  and config (nav now, `siteName`, future settings) live in a git-committed YAML file read at build
  time. See PLAN.md and memory `cairn-yaml-site-config-architecture`.
- **Commit-as-publish for config.** Nav edits commit through the existing GitHub-App `commitFile`
  path (author = editor, committer = `cairn-cms[bot]`) and go live on the next build. A nav change
  is not instant; acceptable because the header changes rarely, and it matches content-edit latency.
- **Engine-fat, site-thin.** The engine owns the YAML parse, extraction, validation, the read and
  commit server functions, and the editor component. Each site owns the file (its location and
  contents) and renders the tree with its own header markup.
- **F2 byte-identical invariant.** The two sites' `admin/` route shims stay byte-identical; only
  each site's `cairn.config.ts`, its `site.config.yaml`, and its own `Nav.svelte` rendering differ.
- **Capabilities over role names.** Gate management surfaces on capability statements, not on
  role-name checks, so the two-tier model can grow finer capabilities (and a future role)
  additively. Already built; carried unchanged.

## Design

### The site-config file

Each site holds one config file at `src/lib/site.config.yaml`, beside its `cairn.config.ts`. It is
the canonical home for all site config. Shape: a settings object at the root with a `menus` map
keyed by menu name.

```yaml
siteName: EC Nordic
menus:
  primary:
    - label: About
      url: /about
    - label: Training
      url: /training
    - label: Resources
      children:
        - label: Volunteers
          url: /volunteers
        - label: CrewLAB
          url: /crewlab
```

`src/lib/site.config.yaml` sits next to the adapter, is importable by the public build with the
`$lib` alias, and the commit path addresses it by its repo-relative path string. The `menus` map
honors the "multiple named menus in the data model, ship only the primary header this pass"
decision: a footer menu (both sites have footer icon links) is a later additive key, no file-format
migration. Each menu's value is a `NavNode[]` (the existing type).

```ts
export interface NavNode {
  label: string;        // display text, required
  url?: string;         // omitted/empty means a label-only grouping header (e.g. a dropdown parent)
  children?: NavNode[]; // omitted means a leaf
}
```

Order is array position. Max depth defaults to 2 (a parent plus one level of children), configurable
per menu via the adapter.

### Engine surface (`@glw907/cairn-cms`)

**`src/lib/nav.ts` (reworked).** Keeps `NavNode`, `validateNavTree`, `NavValidationError`, and
`MAX_NAV_NODES` unchanged. Replaces the D1 store functions with YAML helpers:

- `parseSiteConfig(raw: string): SiteConfig` parses the YAML text into a plain object
  (`{ siteName?: string; menus?: Record<string, unknown> }`), tolerant of a missing `menus` key.
- `extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[]` pulls one menu's
  nodes and runs `validateNavTree`, returning `[]` when the menu is absent. This is the public read
  path's normalization step.
- `setMenu(raw: string, name: string, tree: NavNode[]): string` parses the existing file, replaces
  only the named menu's nodes, and re-serializes, preserving every other top-level key
  (`siteName`, other menus, future settings). It uses the `yaml` package's parse and stringify.
  Comment preservation is not required (Geoff accepted comment loss on tool rewrite); top-level
  key and data preservation is mandatory, so editing the nav never drops `siteName`.

The `yaml` package (eemeli/yaml) is added as a runtime dependency; gray-matter's bundled js-yaml
does not expose a clean standalone round-trip. The door stays open to comment-preserving rewrites
later via `yaml`'s Document API, without a dependency change.

**`sveltekit/index.ts` (reworked `navLoad`/`navSave`).** Both keep the `nav:manage` capability
check and the existing return and redirect shapes:

- `navLoad` reads the config file through the existing contents-API `readRaw`, calls `extractMenu`,
  and returns `{ menu, tree, pages, saved, error }` exactly as before. The page-picker options still
  come from the page-kind collection through the existing `listMarkdown` read path. A missing or
  unreadable file degrades to an empty tree rather than erroring.
- `navSave` validates the submitted tree against the menu's `maxDepth` (unchanged), reads the
  current file via `readRaw`, applies `setMenu`, and commits the result via `commitFile`. The
  GitHub-App attribution (author = editor, committer = bot) and the existing 409 `CommitConflictError`
  fail-safe carry over from the content commit path. Validation failures redirect back with
  `?error=`, matching the content-save handling.

**Adapter contract change.** The `navMenus?: NavMenuConfig[]` array becomes a single optional
object:

```ts
navMenu?: {
  configPath: string;   // repo-relative path, e.g. 'src/lib/site.config.yaml'
  menuName: string;     // key within `menus`, e.g. 'primary'
  label: string;        // admin sidebar label, e.g. 'Navigation'
  maxDepth?: number;    // editor nesting cap; defaults to 2
};
```

A site opts in by declaring `navMenu`. With no `navMenu`, the "Navigation" admin entry does not
appear (the same opt-in pattern as the empty component registry hiding the insert palette). One
managed menu per site this pass; the field name stays singular to match.

**Capabilities (unchanged, already built).** `nav:manage` gates the nav surface; `page:create`
gates page creation. `owner` holds all statements; `editor` holds the content subset
(`story:create`, `story:edit`, `page:edit`) and is denied `nav:manage` and `page:create`. The nav
load and save check `nav:manage` server-side; the load exposes the viewer's capabilities so the UI
hides gated affordances.

**`NavTree.svelte` (unchanged, already built).** Renders the tree, an add-item form (label plus URL
with a "pick a page" dropdown sourced from the page collection), per-node edit and delete, and
two-axis drag (vertical reorder, horizontal indent/outdent capped at `maxDepth`) on native HTML5
drag events with no heavy dependency. It edits a local copy and posts the whole tree on save.

### Public read at build time

Each site's nav rendering reads the config statically:

```ts
import raw from '$lib/site.config.yaml?raw';
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';

const nav = extractMenu(parseSiteConfig(raw), 'primary', 2);
```

The `?raw` import is resolved at build time and inlined, so the layout stays prerendered. The site
passes the resulting `NavNode[]` to its own `Nav.svelte`, which renders it with the site's existing
header markup and styles, replacing the hardcoded `navLinks`. The engine owns parse and validate;
the site owns the import location and the rendering. No `load` function, no server, no edge read.

### Per-site work

- **Config file:** add `src/lib/site.config.yaml`, seeded from the current hardcoded links (six for
  ecnordic, three for 907), plus `siteName`.
- **Adapter:** add the `navMenu` object to each `cairn.config.ts`
  (`{ configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 }`).
- **Consumption:** replace each `Nav.svelte` hardcoded `navLinks` with the `?raw` import plus the
  engine parse, rendering the returned tree. This is the meaningful site change; it stays
  prerendered, so no `prerender` flip.
- **Route shim (byte-identical across both sites):** `src/routes/admin/nav/+page.server.ts` (load to
  `navLoad`, `save` action to `navSave`) and `+page.svelte` (renders `<NavTree>`). The AdminLayout
  "Navigation" entry (already built) shows only when the viewer holds `nav:manage`.
- **No migration, no seed script.** The file is committed with seed content directly; there is no D1
  table and no one-time import step.

## What this pass does NOT do (scope cuts, all future-additive)

- **Multiple menus in the UI.** The `menus` map allows more, but only the primary header is managed
  this pass. A footer menu is a later additive key plus a second `navMenu` (or an array again, if
  more than one is ever managed at once).
- **Live page references.** Items store a URL string, not a rename-safe reference. A broken-link
  check is a cheaper future safety net if renames become a problem.
- **Comment-preserving rewrites.** `setMenu` preserves data keys but not YAML comments; the `yaml`
  Document API is the future upgrade if comments become valuable.
- **Per-item extras** (CSS classes, link target, description, icons). The lean node is label plus
  url plus children.
- **Other site settings.** `siteName` already lives in the file conceptually; wiring more settings
  through it (and an admin surface for them) is a later pass. This pass establishes the file and the
  nav surface.

## Testing

- **Engine.** `parseSiteConfig` (well-formed, missing `menus`, malformed YAML), `extractMenu`
  (present menu, absent menu returns `[]`, validation rejection of bad nodes), and `setMenu`
  (replaces only the target menu, preserves `siteName` and other menus, round-trips a nested tree).
  Tree validation cases (empty-label rejection, depth-cap enforcement, cycle/size guards) carry over
  unchanged. Capability gating: an editor is denied `nav:manage` and `page:create` while allowed the
  content statements; an owner is allowed all. `svelte-package` emits the reworked module and
  `NavTree.svelte`.
- **Both sites.** `svelte-check` 0/0; Cloudflare `npm run build` (the `?raw` import resolves and the
  layout stays prerendered); the live admin smoke (mint a better-auth owner session, load
  `/admin/nav`, confirm the tree editor renders, confirm a save commits the updated YAML through the
  GitHub-App path). The in-browser drag interaction and the final commit-to-`main` round-trip are the
  standing Firefox user step, as in prior passes.

## Verification (per the initiative's per-pass bar)

Package `svelte-package` plus vitest; both sites `svelte-check` 0/0 plus Cloudflare build; live
`wrangler dev` admin smoke on both sites with a minted owner session; visual confirmation in
Firefox. Release as a cairn-cms minor with both-site repoint (the Pass P pattern). No per-site D1
migration this time; the config file ships in each site's repo.
