# cairn-cms Pass L: canonical YAML site-config + nav management design

**Date:** 2026-05-27
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Status:** design approved in brainstorm; spec for review before the implementation plan.
**Supersedes:** `2026-05-27-pass-l-nav-tree-design.md` (the D1/edge-SSR storage and consumption
design). The capability layer, the `NavNode` model, tree validation, and the `NavTree.svelte`
editor from that spec are kept; only the storage and public-read layers change.

## Purpose

Make a git-committed YAML file the canonical home for every site's author-editable, build-time
configuration: site identity, navigation menus, email sender, footer text, and tunable settings. The
file is read at build time, so the public sites stay prerendered and Pagefind search keeps working.
Navigation also gets an editor in `/admin` that commits the file through cairn's existing GitHub-App
pipeline, so a non-technical owner can manage the header without a developer. Today the same values
are scattered across each site's `config.ts` constants, `cairn.config.ts`, and hard-coded component
markup; consolidating them removes real duplication and gives the project one place to read and
(eventually) edit site config.

## Background

### Why the pivot from D1

The first Pass L design stored nav in D1 and read it from the public layout at request time on
Workers (edge SSR). Mid-execution that approach was rejected: flipping the public sites to edge SSR
conflicts with prerendering and breaks Pagefind, which indexes prerendered HTML, and it would force
edge-cache infrastructure plus a search re-architecture to claw back what prerendering already
gives. Site config is just another build input. Storing it in git and editing it through cairn's
existing GitHub-App commit-then-deploy pipeline (the same commit-as-publish flow content uses) keeps
prerendering and Pagefind intact, needs no edge-SSR/edge-cache/D1 table, and versions config in git.
The end-user experience is identical, so the call is about the more maintainable long-term
architecture. **Auth stays on D1.** This revises the earlier "D1 for all admin storage" and
"edge-SSR consumption" decisions for the static-config category only.

### What exists today (inventory)

Both sites hard-code site config across several files, with values duplicated and kept in sync by
hand. The full inventory (per site, with file paths and values) lives in the conversation that
produced this spec; the summary:

- **Identity** lives in each `src/lib/config.ts` as `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`,
  `SITE_AUTHOR`, `SITE_LOCALE` (plus ecnordic's homepage `WELCOME_BLURB`).
- **Navigation** is hard-coded: ecnordic's `Nav.svelte` holds a six-item `navLinks` array; 907's has
  three literal `<a>` tags. Neither has submenus.
- **Email sender** (`noreply@…`) is declared three times per site (`cairn.config.ts` for magic-link,
  plus the contact handler, plus a sender display name), kept in sync manually.
- **Footer** credit is a hard-coded literal (ecnordic: `East Community Nordic`; 907 uses the title).
- **Settings:** `FEED_MAX_ITEMS = 20`, `HOMEPAGE_FEATURED_COUNT = 1`; ecnordic also has the
  controlled `POST_TAGS` vocabulary (907 uses free-form tags).
- `siteName` is read by the admin shell from `cairn.config.ts` today.

So this work defines the config model from scratch; there is nothing to migrate beyond copying the
current values into the file verbatim, which seeds it with no user-visible change.

### Work already committed (local, not pushed) and its disposition

The D1-era Pass L work landed in local commits on `cairn-cms` `main`. The pivot reworks it in place:

- **Kept, storage-agnostic, all green (114 vitest at the time):** the capability matrix
  (`src/lib/auth/capabilities.ts` + barrel), the `NavNode` type plus `validateNavTree` in
  `src/lib/nav.ts`, page-create gating plus `canCreate`, the AdminLayout nav entry plus
  `adminLayoutLoad` navMenus/canManageNav, and `src/lib/components/NavTree.svelte`.
- **Reworked:** the D1 store in `nav.ts` (`readNavTree`/`writeNavTree`/`loadNav`) is replaced by
  YAML parse/extract helpers; the adapter `navMenus[]` array becomes a single `navMenu` config
  object; `navLoad`/`navSave` in `sveltekit/index.ts` read and commit the YAML file instead of D1.
- **Dropped:** `migrations/0001_nav_menu.sql`; no D1 table is needed.

The dropped and reworked commits are local-only, so they are reworked in place with no revert
needed. ecnordic's D1-wiring/prerender-flip commit was already reset back to a clean build; 907 was
untouched.

## Locked decisions feeding this pass

- **Content and config stay in git.** Only runtime admin state (auth) lives in D1. Site structure
  and config live in a git-committed YAML file read at build time. See PLAN.md and memory
  `cairn-yaml-site-config-architecture`.
- **Commit-as-publish for config.** Nav edits commit through the existing GitHub-App `commitFile`
  path (author = editor, committer = `cairn-cms[bot]`) and go live on the next build. A change is not
  instant; acceptable because site config changes rarely, and it matches content-edit latency.
- **Engine-fat, site-thin.** The engine owns the YAML parse, extraction, validation, the read and
  commit server functions, and the editor component. Each site owns the file (its location and
  contents) and renders config with its own markup.
- **F2 byte-identical invariant.** The two sites' `admin/` route shims stay byte-identical; only
  each site's `cairn.config.ts`, its `site.config.yaml`, and its own rendering differ.
- **Capabilities over role names.** Management surfaces gate on capability statements, not role-name
  checks. Already built; carried unchanged.
- **Pass size follows execution efficacy** (memory `cairn-pass-size-by-efficacy`). This design spans
  two distinct verification surfaces, so it splits into two implementation passes (below).

## Design

### The site-config file

Each site holds one config file at `src/lib/site.config.yaml`, beside its `cairn.config.ts`. It is
the canonical home for all author-editable site config. Shape: a settings object at the root, a
`menus` map keyed by menu name, and a `settings` block for tunables.

```yaml
siteName: EC Nordic
description: "<verbatim from SITE_DESCRIPTION>"
author: EC Nordic
url: https://ecnordic.ski
locale: en-US

menus:
  primary:
    - { label: About, url: /about }
    - { label: Training, url: /training }
    - { label: Volunteers, url: /volunteers }
    - { label: CrewLAB, url: /crewlab }
    - { label: Resources, url: /resources }
    - { label: Contact, url: /contact }

email:
  sender: noreply@ecnordic.ski
  senderName: ECN Nordic Contact

footer:
  copyrightName: East Community Nordic

homepage:
  welcomeBlurb: "<verbatim from WELCOME_BLURB>"

settings:
  feedMaxItems: 20
  homepageFeaturedCount: 1
  postTags: [training, racing, results, events, camp, announcements]
```

907's file is the same shape with its own identity values, three nav items (Archives, About,
Contact-as-anchor at `/about#contact`), no `homepage.welcomeBlurb`, and no `settings.postTags` (it
uses free-form tags). All values are copied verbatim from each site's current `config.ts` and
`cairn.config.ts`, including punctuation, so the migration changes nothing user-visible.

Design notes on the shape:

- **`menus:` map keyed by name** (Hugo's `menus.main`/`menus.footer` convention, the most-copied
  pattern in the field). Ship only `primary` now; a footer menu is a later additive key with no
  file-format migration. Each menu value is a `NavNode[]`.
- **Inline `children:` for nesting**, not Hugo-style flat lists with `parent`/`identifier`
  back-references. Back-refs have a silent-orphan failure mode (a typo'd `parent` quietly promotes
  the child to root); inline nesting cannot fail that way and is what the admin UI serializes.
- **Array position is order.** No `weight`/`order` integers. The admin UI rewrites the whole tree on
  a drag, so explicit ordering integers would only add the renumber-the-block juggling the research
  flagged as the main pitfall to avoid.
- **`label` + optional `url`.** Omitting `url` marks a label-only grouping header (a dropdown
  parent), an unambiguous signal with no extra flag.
- **`settings:` block** keeps tunables out of the root namespace; the root stays identity plus
  `menus` plus `settings`.
- **Per-item `params:` is deliberately deferred.** Hugo's `params` map (for `target`/`rel`/`icon`)
  is the standard escape hatch, but adding an optional `params?` to a node later is purely additive
  (old files simply lack it, no migration), so deferring it does not box us in.

```ts
export interface NavNode {
  label: string;        // display text, required
  url?: string;         // omitted/empty means a label-only grouping header
  children?: NavNode[]; // omitted means a leaf
}
```

Order is array position. Max depth defaults to 2 (a parent plus one level of children), configurable
per menu via the adapter.

### What lives where (the code/data/secret line)

| Category | Home | Why |
|---|---|---|
| Identity, menus, email sender, footer text, homepage blurb, settings | `site.config.yaml` | Author-editable data, build-safe, read at build time |
| `backend` (owner/repo/branch), `collections`/fields/`validate`, `preview` plugins, `registry` | `cairn.config.ts` | Code and deployment topology, not data |
| Theme names (`ecn`/`silk`, light/dark) | `app.html` (unchanged) | Run in a pre-hydration inline script and are coupled to compiled DaisyUI CSS, so they are not safely author-editable |
| Turnstile site key | env / dev wiring (unchanged) | Cloudflare-account wiring, not author config (907 already reads it from env) |
| `CONTACT_EMAIL` (delivery address), `AUTH_SECRET`, app private key | Worker secrets (unchanged) | Secrets; a public-repo delivery address also invites spam |

The nav logo markup (each site's styled `EC`/`Nordic` or `907`/`.life` spans) stays in `Nav.svelte`;
it is presentation, not config.

### Engine surface (`@glw907/cairn-cms`)

**`src/lib/nav.ts` (reworked).** Keeps `NavNode`, `validateNavTree`, `NavValidationError`, and
`MAX_NAV_NODES` unchanged. Adds the config read layer and replaces the D1 store:

- `interface SiteConfig` typing the file (`siteName`, optional `description`/`author`/`url`/`locale`,
  `menus?: Record<string, unknown>`, `email?`, `footer?`, `homepage?`, `settings?`). Kept permissive
  so unknown keys are ignored (forward-compatible).
- `parseSiteConfig(raw: string): SiteConfig` parses the YAML text into the typed object, tolerant of
  missing optional keys.
- `extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[]` pulls one menu's
  nodes and runs `validateNavTree`, returning `[]` when the menu is absent. The public read path's
  normalization step.
- `setMenu(raw: string, name: string, tree: NavNode[]): string` (Pass L2) parses the existing file,
  replaces only the named menu's nodes, and re-serializes, preserving every other top-level key
  (`siteName`, other menus, settings). Comment preservation is not required (Geoff accepted comment
  loss on tool rewrite); top-level key and data preservation is mandatory, so editing nav never
  drops other config.

The `yaml` package (eemeli/yaml) is added as a runtime dependency; gray-matter's bundled js-yaml does
not expose a clean standalone round-trip. The door stays open to comment-preserving rewrites later
via `yaml`'s Document API, with no dependency change.

**`sveltekit/index.ts` (reworked `navLoad`/`navSave`, Pass L2).** Both keep the `nav:manage`
capability check and the existing return and redirect shapes. `navLoad` reads the config file
through the existing contents-API `readRaw`, calls `extractMenu`, and returns
`{ menu, tree, pages, saved, error }`. `navSave` validates the submitted tree against the menu's
`maxDepth`, reads the current file via `readRaw`, applies `setMenu`, and commits via `commitFile`
(author = editor, committer = bot; the existing 409 `CommitConflictError` fail-safe carries over).
Validation failures redirect back with `?error=`.

**Adapter contract change (Pass L2).** The `navMenus?: NavMenuConfig[]` array becomes a single
optional object:

```ts
navMenu?: {
  configPath: string;   // repo-relative path, e.g. 'src/lib/site.config.yaml'
  menuName: string;     // key within `menus`, e.g. 'primary'
  label: string;        // admin sidebar label, e.g. 'Navigation'
  maxDepth?: number;    // editor nesting cap; defaults to 2
};
```

A site opts in by declaring `navMenu`; with none, the "Navigation" admin entry does not appear (the
same opt-in pattern as the empty component registry hiding the insert palette).

**Capabilities and `NavTree.svelte` (unchanged, already built).** `nav:manage` gates the nav
surface; `page:create` gates page creation; `owner` holds all, `editor` holds the content subset.
`NavTree.svelte` renders the tree, an add-item form (label plus URL with a page-picker dropdown),
per-node edit and delete, and two-axis drag (vertical reorder, horizontal indent/outdent capped at
`maxDepth`) on native HTML5 drag events.

### Public read at build time

Each site reads the config statically:

```ts
import raw from '$lib/site.config.yaml?raw';
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';

export const config = parseSiteConfig(raw);
const nav = extractMenu(config, 'primary', 2);
```

The `?raw` import is resolved at build time and inlined, so the layout stays prerendered. The site
passes the parsed config to its own components (identity into `<svelte:head>`/feeds, the menu tree
into `Nav.svelte`), replacing the hard-coded constants and `navLinks`. The engine owns parse and
validate; the site owns the import location and the rendering.

### The config migration (Pass L)

Both sites' `config.ts` `SITE_*` constants and other migrated values are repointed to read from the
parsed config object, and `cairn.config.ts` derives `siteName`/`sender` from the same object. This
collapses the duplications the inventory found (the sender declared three times; `siteName`
redeclared). The simplest shape: `config.ts` imports the parsed `SiteConfig` and re-exports the
named constants from it (`export const SITE_TITLE = config.siteName`), so every existing consumer
(feeds, meta, homepage, contact, tag vocabulary) keeps working unchanged. The migration is verified
by characterization: feeds, meta, the homepage, and the rendered nav are byte-identical before and
after on both sites.

## Implementation phasing (efficacy-driven split)

This design spans two distinct verification surfaces, so it ships as two passes (see memory
`cairn-pass-size-by-efficacy`). One design (this spec) covers both; each pass gets its own plan.

**Pass L: canonical site-config, read side + full migration.**
- Engine: `SiteConfig`, `parseSiteConfig`, `extractMenu`, the `yaml` dep; drop the D1 store from
  `nav.ts`. Package tests for parse/extract and the carried-over validation tests.
- Both sites: create `src/lib/site.config.yaml` (values verbatim); repoint `config.ts` constants and
  `cairn.config.ts` (`siteName`/`sender`) to read from it; replace `Nav.svelte`'s hard-coded links
  with the `?raw` import plus `extractMenu`.
- **Gate (no behavior change):** package `svelte-package` + vitest; both `svelte-check` 0/0;
  Cloudflare `npm run build`; characterization byte-identical on feeds, meta, homepage, and rendered
  nav (the layout stays prerendered). No `/admin` change.

**Pass L2: nav editing UI, write side.**
- Engine: `setMenu`; rework `navLoad`/`navSave` to read-and-commit the YAML; the `navMenu` adapter
  field; capability gating on the nav surface and page-create (already built, rewired).
- Both sites: the byte-identical `admin/nav/+page.{server.ts,svelte}` route shim; the AdminLayout
  "Navigation" entry (built); `NavTree.svelte` (built).
- **Gate (behavior change):** package tests for `setMenu` and the commit path; both `svelte-check`
  0/0 and builds; the live admin smoke (mint a better-auth owner session, load `/admin/nav`, confirm
  the editor renders and a save commits the updated YAML through the GitHub-App path). The in-browser
  drag and the final commit-to-`main` round-trip are the standing Firefox user step.

L is independently shippable: the file is canonical and read everywhere even before an editor exists
(config is edited in git until L2). Both fold into cairn-cms minor releases on the Pass P pattern.

## What this design does NOT do (scope cuts, all future-additive)

- **Multiple menus in the UI.** The `menus` map allows more; only `primary` is managed (L2). A
  footer menu is a later key plus a second `navMenu`.
- **Editors for non-nav config.** Identity, email, footer, and settings are read from the file but
  have no admin editor yet; each gets one in a later pass as the surface is built. Only nav is
  editable in `/admin` after L2.
- **Live page references.** Nav items store a URL string, not a rename-safe reference; a broken-link
  check is a cheaper future safety net.
- **Comment-preserving rewrites.** `setMenu` preserves data keys, not YAML comments; the `yaml`
  Document API is the future upgrade.
- **Per-item nav extras** (`params`: classes, target, description, icons) and theme/Turnstile/secret
  migration, per the table above.

## Testing

- **Engine.** `parseSiteConfig` (well-formed, missing optional keys, malformed YAML), `extractMenu`
  (present menu, absent menu returns `[]`, validation rejection of bad nodes), and (L2) `setMenu`
  (replaces only the target menu, preserves `siteName`/settings/other menus, round-trips a nested
  tree). Tree-validation and capability tests carry over unchanged. `svelte-package` emits the
  reworked module and `NavTree.svelte`.
- **Both sites.** `svelte-check` 0/0; Cloudflare `npm run build` (the `?raw` import resolves; the
  layout stays prerendered). Pass L adds characterization that feeds, meta, homepage, and rendered
  nav are byte-identical pre/post migration. Pass L2 adds the live admin smoke (a nav edit commits
  the YAML and round-trips).

## Verification (per the initiative's per-pass bar)

Per pass: package `svelte-package` plus vitest; both sites `svelte-check` 0/0 plus Cloudflare build;
Pass L characterization byte-identical; Pass L2 live `wrangler dev` admin smoke on both sites with a
minted owner session plus Firefox confirmation. Release each as a cairn-cms minor with both-site
repoint (the Pass P pattern). No per-site D1 migration; the config file ships in each site's repo.
