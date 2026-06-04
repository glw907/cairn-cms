# Cairn Rebuild: Functional Spec and Test Plan

> **Status (2026-06-04):** the current architecture statement for adopters is the explanation arm
> under `docs/explanation/` (architecture, data-tiers, security-model, content-model). This spec is
> the locked rebuild design record and carries known drift: it predates the Carta-to-CodeMirror
> editor swap (0.9.0) and the `renderPreview`-to-`render` adapter rename. Read it as design history,
> not as the current surface.

**Status:** Draft for review, 2026-05-28 (amended same day: scaffolding and templates promoted to
in-scope; DaisyUI-component-first rule; packaging and commenting quality gates).
**Supersedes:** the layered direction-changes in `docs/PLAN.md`, `docs/ARCHITECTURE.md`, and the
2026-05-26/-28 spec drafts, for the purpose of a clean rebuild. The locked decisions below are
canonical where they conflict with older documents.

## 1. Why this document exists

cairn changed direction several times during its first build. The result works in production on
both sites, but the design carries accumulated layers: collections became fixed concepts, KV auth
became better-auth and now reverts again, "theme" was retired, and several specs contradict each
other. This document consolidates the intended behavior into one canonical spec, so the rebuild
has a single source of truth to test against and build from.

The goal is a cleaner implementation on a stronger foundation. The rebuild keeps cairn's behavior
where it is decided, modernizes the whole dependency stack to May 2026, and gets the internal seams
right so the deferred features attach without a rewrite. A test suite written first turns that
behavior into an acceptance contract, which is what lets the implementation be replaced freely.

A second goal carries equal weight. Standing up a new Cairn site must be as easy as possible: a site
author picks one of several templates and is editing content within minutes. The architecture is
shaped around scaffolding and a clean template contract from the start, not as an afterthought.

## 2. What cairn is

cairn-cms is an embedded, magic-link, GitHub-committing CMS for SvelteKit sites on Cloudflare
Workers. Non-technical authors log in by email with no GitHub account and no password, edit raw
markdown in a Carta editor with a design-accurate live preview, and saving commits to `main` through
a GitHub App. The commit author is the editor and the committer is `cairn-cms[bot]`, and that commit
triggers the site's existing CI, which redeploys. Content stays markdown in git as the sole source
of truth. The stack is intentionally opinionated around Cloudflare, SvelteKit, DaisyUI, Tailwind, and
GitHub.

Two live consumers prove the abstraction: ecnordic.ski (DaisyUI plus a directive render pipeline)
and 907.life (ET Book plus plain `remark-html`).

## 3. Scope

### In the target

The spec covers everything that runs in production today plus the locked-but-partly-built design.
Each item is a testable behavior:

- **Auth.** Magic-link login, the POST-confirm flow, two-tier owner/editor roles, manage-editors
  with anti-lockout, the `/admin/**` guard, config-derived origin.
- **Content model.** The fixed concepts Posts and Pages via the `content: {}` contract,
  filename-based ids, per-concept frontmatter.
- **Read and list.** Git Trees API listing, contents API for single-file reads, the 1 MB body cap.
- **Edit and commit.** Carta behind the `MarkdownEditor` seam, per-concept differentiated editing,
  frontmatter forms from field config, the live preview, server-side validation before commit,
  `commitFile` with editor-as-author, the 409 fail-safe.
- **Render engine.** `createRenderer` plus the directive-stamp and rehype-dispatch pipeline in the
  engine; the site component registry as the single declaration.
- **Admin UI.** The Warm Stone neutral self-contained theme, the drawer-and-navbar shell,
  concepts-first nav, per-concept list views, the Carta formatting toolbar, the preview toggle,
  accessible interactive widgets.
- **Nav editing.** The YAML site-config menu editor.
- **Distribution.** The `@glw907/cairn-cms` package with its three subpath exports, the source-to-dist
  publish swap, peer dependencies, the bundle and startup guards, `/admin/healthz`.
- **Scaffolding and templates.** A `create-cairn-site` scaffolder, the template contract, and two
  reference templates borrowed from the two existing site designs with placeholder content. Standing up
  a new site from a template is a critical goal, so this is first-class, not deferred.

### Deferred behind seams

Named in the spec and reserved by the seams, not built in the rebuild: Fragments and the `:::include`
directive; the `CairnExtension` (R13) contract; media and uploads (R7); the asset and icon pickers
(R9); the component palette UI (R10); the deploy-status signal and revert-last-change affordance (the
unbuilt half of M1); scheduled publish; revision and rollback. The templates beyond the first two, and
the experimental `sv add cairn` community add-on, are fast-follow rather than rebuild scope.

## 4. Locked stack and versions (May 2026)

Pin the current stable release of each dependency at rebuild start. The versions below are the floor.

| Dependency | Target | Notes |
|---|---|---|
| `svelte` | 5.55.x | Runes-native. `$derived` for computed values; `$effect` only as an escape hatch. |
| `@sveltejs/kit` | 2.61.x | Classic `load`/actions. Do not enable remote functions (still experimental). |
| `@sveltejs/adapter-cloudflare` | 7.2.x | Workers Static Assets model. The `-workers` adapter is deprecated. |
| `vite` | 8.0.x | Rolldown-powered. |
| `typescript` | 6.0.x | Strict mode on by default. |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.x | CSS-first config. No `tailwind.config.js`; tokens live in `app.css`. |
| `daisyui` | 5.5.x | CSS-only. v5 requires every `-content` color to be declared explicitly. |
| `bits-ui` | 2.x | Headless a11y primitives, peer dependency, used only where behavior demands it. |
| `svelte-sortable-list` | 2.x | Keyboard-accessible drag-reorder for the nav editor. |
| `carta-md` | 4.11.x | Svelte 5 native, behind the `MarkdownEditor` seam. Peer dependency. |
| `vitest` | 4.1.x | Test runner. |
| `@cloudflare/vitest-pool-workers` | 0.16.x | The `cloudflareTest()` plugin plus `applyD1Migrations`. |
| `vitest-browser-svelte` | 2.1.x | Component tests in a real browser via the Playwright provider. |
| `@playwright/test` | 1.60.x | Full-flow E2E. |

Decisions the 2026 research validated:

- **Reject SvelteKit remote functions.** They remain experimental with breaking changes through early
  2026. The classic `load` and form-action pattern is the production path.
- **Keep the bespoke Web-Crypto GitHub-App signing**, not octokit. octokit is heavy, and the Workers
  bundle ceiling is a hard constraint.
- **Keep Carta** behind the `MarkdownEditor` seam. No mainstream Svelte markdown editor displaced it in
  2026, and a rich-document editor would corrupt directive markdown.
- **Configuration conventions:** `wrangler.jsonc` over `wrangler.toml`; `compatibility_date` set near the
  build date with `nodejs_compat` (which auto-enables v2 behavior at dates from 2026-03-17); `$app/state`
  over `$app/stores`; `$state` plus context for shared state, never module-level stores on the server.
- **DaisyUI components are the default for every admin surface.** DaisyUI v5 covers the admin: Fieldset,
  Label, and Validator for forms, plus Table, List, Modal, Alert, Menu, Tabs, Toast, Pagination, and
  Breadcrumbs. Bits UI is the documented exception, spot-used for a searchable combobox and a command
  palette; a date picker, if needed, uses Cally with DaisyUI v5's calendar styling. No styled component
  library (shadcn-svelte, Skeleton, Flowbite) enters the package, since each brings a competing visual
  layer and weight that fight the neutral theme.
- **First-class packaging is a gate.** `publint` and `@arethetypeswrong/cli` run in CI against the
  published shape, validating the exports map and type resolution across all three subpaths for both the
  source-dev and `dist`-publish halves of the swap.

## 5. Architecture

For where each kind of state lives (the git-versus-D1 placement rule and its worked precedents),
see `docs/data-architecture.md`, the canonical home for that decision.

### Layers

| Layer | Identity | Distribution |
|---|---|---|
| Engine | `@glw907/cairn-cms` | Live semver npm dependency. Fixes propagate on bump. |
| Site template | Scaffold (a set, in scope) | `create-cairn-site` copies one into a new repo, which the owner then diverges. Not a runtime theme. |
| Extension | `CairnExtension` | Code-defined, composed at build time. Deferred, seam reserved. |
| Cairn site | SvelteKit app | Composes the engine plus bespoke design. ecnordic and 907 are Cairn sites. |

The hard rule is engine-fat, site-thin. Everything security-critical or fix-prone lives in the live
engine. Copied site code holds presentation only: the component registry data, icons, CSS, the
adapter, and thin route shims.

### Package exports

The package exposes three subpaths:

- `.` for the engine entry (auth, github, render, content, the adapter type).
- `/sveltekit` for the server logic that route shims call (`load` and action functions).
- `/components` for the admin Svelte components.

The `publishConfig` swap points the exports at source in the workspace for zero-config local dev across
the symlinked workspace, and at `dist` on publish, which `svelte-package` builds at `prepublishOnly`.
`@sveltejs/kit`, `carta-md`, and `bits-ui` are peer dependencies, never dependencies. A CI check asserts
one resolved `@sveltejs/kit` so thrown `redirect`/`error` keep class identity across the package boundary.

### SvelteKit routing

SvelteKit's filesystem routing forces route files to live in each site's `src/routes/admin/**`. Those
files are thin shims: each imports a `load` or action function from `@glw907/cairn-cms/sveltekit` and a
component from `@glw907/cairn-cms/components`. Each shim is byte-identical across sites except for the
adapter import.

### Scaffolding and the template contract

Standing up a site is the critical ease-of-use goal, so the engine carries the machinery and a template
carries only design. The `sv` CLI cannot do this on its own: `sv create` has no custom-template support,
and third-party `sv add` add-ons are still experimental. cairn ships its own `create-cairn-site`
scaffolder instead.

Running `npm create @glw907/cairn-site` prompts for a template, copies it into a new directory, and runs
the one-time provisioning that is the real friction. That provisioning creates the D1 database, applies
migrations, writes `.dev.vars` and the `wrangler secret` checklist, sets `PUBLIC_ORIGIN`, and seeds the
first owner editor.

A **template contract** keeps the set uniform. Every template carries the same machinery and differs only
in design: the `cairn.config.ts` adapter, the DaisyUI theme and fonts, the component registry, and
`renderPreview`. The admin route shims, the binding and secret names, and the provisioning hooks are
identical across templates and generated, never hand-written. Engine-fat/site-thin is what keeps a
template thin enough to copy and diverge. The first two templates borrow the ecnordic design (DaisyUI plus
directives) and the 907 design (typographic essays) with placeholder content, and the contract makes the
third through fifth cheap to add. A `sv add cairn` add-on for layering cairn onto an existing SvelteKit app
is a fast-follow, held until that add-on API leaves experimental.

## 6. The load-bearing seams

These interfaces carry the foundation. The spec defines each precisely, and the suite locks each with a
contract test, so a deferred feature either fits the seam or fails the test loudly.

1. **Content-concept normalization.** The adapter declares concepts as `content: { posts?, pages? }`.
   Internally the engine normalizes each declared concept to a uniform descriptor (id, label, directory,
   routing rule, frontmatter fields, validator). A third concept, Fragments, must attach by adding one
   key and one descriptor, with no reshape of the contract or the normalizer.
2. **Composition aggregation.** The engine folds the adapter into its runtime through a single
   aggregation point. A future `CairnExtension` folds in the same way and contributes the same kinds of
   things: nav entries, route logic, concepts, components, field types, and save hooks. The aggregation
   API is shaped now so the extension contract is additive later.
3. **Component registry.** Each directive component is declared once, carrying its name, label,
   description, insert template, and builder. The renderer and the future component palette both derive
   from this one declaration, so the parser, the render dispatch, and the editor stay in sync without a
   parallel list.
4. **Asset and media config slot.** The adapter carries a typed, reserved slot for asset roots and the
   public URL base. It is unused in the rebuild. R7 and R9 later add a binding and a picker that read this
   slot, with no change to the contract shape.
5. **`MarkdownEditor` interface.** A thin seam over the editor exposing value access, change
   subscription, and cursor insertion. Carta implements it. Swapping to a bare CodeMirror editor stays a
   one-file change.

## 7. Functional behavior

### 7.1 Auth

Auth is self-owned on D1. There is no better-auth, no Kysely, and no ORM. The engine talks to D1 through
prepared statements and ships hand-written migration SQL that each site applies with
`wrangler d1 migrations apply`. The single D1 binding is `AUTH_DB`.

**Schema.** Three tables:

- `editor`: `email` (primary key), `display_name`, `role` (`owner` or `editor`), `created_at`. This is
  both the allowlist and the identity store.
- `magic_token`: `token_hash` (primary key, the SHA-256 of the issued token), `email`, `expires_at`,
  `created_at`.
- `session`: `id` (primary key, a random 256-bit value), `email`, `expires_at`, `created_at`.

**Request a link.** `POST /admin/auth/request` takes an email. The handler looks the email up in
`editor`. When it matches, the handler deletes any prior tokens for that email, generates a random token,
stores its SHA-256 with a 10-minute `expires_at`, and emails a confirmation link through Cloudflare Email
Sending (`env.EMAIL.send`). The response is identical whether or not the email was on the allowlist, so
the endpoint does not leak membership.

**Confirm.** The link points at `GET /admin/auth/confirm?token=...`, which renders a page with a single
"Confirm sign-in" button and consumes nothing. The page sets `Referrer-Policy: no-referrer`. Clicking the
button submits `POST /admin/auth/confirm` carrying the token. The handler hashes the token and runs one
atomic statement, `DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email`. A
returned row means the token was valid, unexpired, and is now consumed, so the link is single-use by
construction on strongly-consistent D1. The handler then creates a session row, sets the session cookie
(`httpOnly`, `Secure`, `SameSite=Lax`), and redirects to `/admin`. An email scanner that GETs the link
consumes nothing, because only the POST verifies.

**Guard.** `hooks.server.ts` guards `/admin/**`, excluding the login and auth endpoints. It reads the
session cookie, looks up the session row, and resolves the editor row by the session's email. A valid
session populates `locals.editor` with the email, display name, and role. The role is read from the
editor row on every request, so a role change or removal takes effect immediately. A missing or expired
session redirects to `/admin/login`. Logout deletes the session row and clears the cookie.

**Roles and anti-lockout.** Two roles, `owner` and `editor`. Editors edit content. Owners also manage
editors, behind a `requireOwner` gate on the management surface. An owner cannot remove or demote the last
remaining owner.

**Origin.** The confirmation link's origin comes from `PUBLIC_ORIGIN` in config, never from request
headers.

### 7.2 Content model

cairn ships a fixed, curated set of content concepts. There is no generic collections array and no runtime
collection creation. A site never has two of the same concept.

- **Pages** are navigable with a plain slug. Frontmatter is minimal (a title). Pages are site structure.
- **Posts** have a dated slug, appear in feeds and the sitemap, and carry tags, a draft flag, and a date.

The adapter declares which concepts a site enables through `content: { posts?, pages? }`. Each value
holds the per-site variables for that concept: its directory, its frontmatter fields, its validator, and an
optional label. Concept-fixed behavior such as routability is not in config. There is no `kind`
discriminator; concept identity drives differentiated editing directly. Ids are filename-based, so no slug
codec is needed. Fragments is a future third key on the same object.

### 7.3 Read and list

A single-file read uses the GitHub contents API through an install token. Listing a concept's directory
uses the **Git Trees API**, not the contents API, because the contents API silently truncates a directory
at 1,000 entries. Content larger than 1 MB returns null from the contents API; the spec documents this cap,
and sharding a concept by year or month is deferred until a directory approaches it.

### 7.4 Edit and commit

The editor opens a file, the contents API returns its current text and blob SHA, and the editor loads with
both. Carta edits the raw markdown behind the `MarkdownEditor` seam. The live preview renders through the
adapter's `renderPreview`, which is the same pipeline the site uses, so the preview is design-accurate.

Editing is differentiated by concept. A post form carries the richer frontmatter (date, tags, description,
draft toggle) above the editor; a page form carries the minimal frontmatter. The frontmatter form is
generated from the concept's field config, a discriminated union over field types (`text`, `date`,
`textarea`, `boolean`, `tags`).

Saving runs the concept's validator on the server before any commit. Invalid input bounces back to the form
with an error and never reaches git. A valid save calls `commitFile`, which mints a short-lived GitHub App
install token (an RS256 JWT signed in-Worker with Web Crypto, converting the stored PKCS#1 key to PKCS#8),
reads the current blob SHA, and PUTs the new content. The commit sets the author to the editor and omits the
committer, so GitHub records the committer as `cairn-cms[bot]`. When anything commits between the read and
the PUT, GitHub returns 409; `commitFile` catches it and throws `CommitConflictError`, and the save surfaces
"this file changed since you opened it; reload and reapply." The save fails safe and does not attempt a merge.

### 7.5 Render engine and component registry

Generic render machinery lives in the engine: a `createRenderer` factory, a remark directive-stamp plugin
parameterized by the site's component names, a rehype dispatcher, and the shared structural helpers. Its
pipeline runs `remarkParse`, gfm, `remark-directive`, the stamp plugin, `remark-rehype` with
`allowDangerousHtml`, `rehype-raw`, the dispatcher, `rehype-slug`, and stringify.

Each site owns its component registry, one declaration per directive component holding the name, label,
description, insert template, and builder. The renderer derives its dispatch from that registry, and a
future component palette derives its catalog from the same declaration.

### 7.6 Admin UI

The admin chrome is neutral and self-contained, identical on every site except for `siteName`. It is a
tool, not a marketing surface.

- **Theme.** "Warm Stone" is a named DaisyUI v5 theme: warm-gray neutrals, a violet accent, light only,
  a system-ui font stack. The `AdminLayout` root sets `data-theme="cairn-admin"` and a `font-family`, and
  the theme declares the full v5 token set (every `-color-*` including the `-content` colors, plus the
  `--radius-*`, `--size-*`, `--border`, `--depth`, and `--noise` tokens). Because every token is declared,
  nothing bleeds in from the host site's theme or fonts.
- **Shell.** A DaisyUI `drawer lg:drawer-open` plus `navbar`, with the sidebar always open at the `lg`
  breakpoint and collapsible below. The nav is data-driven and role-gated; owners see the manage-editors
  entry, editors do not.
- **Concepts-first nav.** Each enabled concept is a first-class sidebar entry. Selecting one opens that
  concept's list view at `/admin/<concept>`, showing each entry's title and key metadata with a "new entry"
  action. The IA reserves room for a future top-level Media entry.
- **Editing surface.** The differentiated editor from 7.4, with Carta's standard formatting toolbar (bold,
  italic, heading, link, list, quote, code) so authors are not assumed to know markdown, and a toggle that
  shows or hides the site-preview pane, persisted per user.
- **Accessible widgets.** DaisyUI carries the styled chrome with no JavaScript. Where a widget needs real
  keyboard semantics, the component uses a **Bits UI** primitive dressed in DaisyUI classes: the dialog, the
  dropdown menu, and the page-picker combobox. The nav editor's drag-to-reorder uses **svelte-sortable-list**
  for keyboard operation.

### 7.7 Nav editing

A site's navigation lives in a git-committed YAML site-config file (`siteName`, the menus, and future
settings), read at build time so the site keeps compiling. Authors edit it through the same commit
pipeline as content. `navLoad` reads the config file through the contents API and parses the named menu,
degrading to an empty tree when the file is missing or unparsable so the editor still loads. The `NavTree`
component edits the menu. `navSave` validates the submitted tree, mints an install token, reads the current
file, applies `setMenu` (which parses the YAML into a document, replaces only the one menu, and reserializes
while preserving every other top-level key), and commits through `commitFile` with the same author and
committer attribution and the same 409 fail-safe. YAML comments are not preserved on rewrite; data keys are.

### 7.8 Distribution and operational guards

The package publishes under `@glw907/cairn-cms` with the three subpaths and the source-to-dist swap, through
a Trusted-Publishing OIDC GitHub workflow with no stored npm token. During active development the version
stays in the 0.5.x range, and the package publishes before any site that imports new exports is pushed, so CI
`npm ci` can resolve it.

Operational guards hold the Workers constraints:

- A test asserts that no server-side module imports `carta-md`, so Carta and Shiki stay client-only and off
  the Worker.
- Each site's CI runs `wrangler deploy --dry-run` as a bundle and startup-size guard.
- `/admin/healthz` signs a dummy JWT through the same signing path, so a broken PKCS#1-to-PKCS#8 conversion is
  caught early. A key-rotation procedure is documented.
- Heavy objects are constructed inside request handlers, never at module scope, to respect the 1-second
  startup CPU limit.

## 8. The adapter contract

The adapter lives at each site's `src/lib/cairn.config.ts`. It is the single seam the engine consumes.

```ts
interface CairnAdapter {
  siteName: string;

  // Which content concepts this site enables. A future `fragments?` key
  // attaches here without reshaping the contract (seam 1).
  content: {
    posts?: ConceptConfig;
    pages?: ConceptConfig;
  };

  // GitHub App backend for reads and commits.
  backend: {
    owner: string;
    repo: string;
    branch: string;       // commit target, e.g. "main"
    appId: string;
    installationId: string;
  };

  // Magic-link sender identity for Cloudflare Email Sending.
  sender: { from: string; replyTo?: string };

  // Design-accurate preview: the same render pipeline the site uses.
  renderPreview(md: string): string | Promise<string>;

  // Directive component registry; renderer and future palette derive from it (seam 3).
  registry?: ComponentRegistry;

  // The git-committed YAML menu this site's nav editor manages.
  navMenu?: {
    configPath: string;   // e.g. "src/lib/site.config.yaml"
    menuName: string;     // e.g. "primary"
    label: string;
    maxDepth?: number;
  };

  // Reserved, typed, unused in the rebuild. R7/R9 read this without a contract change (seam 4).
  assets?: {
    roots: string[];      // e.g. ["static/images"]
    publicBase: string;   // e.g. "/images"
  };
}

interface ConceptConfig {
  dir: string;                          // content directory, e.g. "src/content/posts"
  label?: string;                       // sidebar label; defaults from the concept name
  fields: FrontmatterField[];           // drives the per-concept frontmatter form
  validate(frontmatter: unknown, body: string): ValidationResult;
}

type FrontmatterField =
  | { type: 'text'; name: string; label: string; required?: boolean }
  | { type: 'textarea'; name: string; label: string; required?: boolean }
  | { type: 'date'; name: string; label: string; required?: boolean }
  | { type: 'boolean'; name: string; label: string }
  | { type: 'tags'; name: string; label: string }        // closed vocabulary (ecnordic)
  | { type: 'freetags'; name: string; label: string };   // free-form tags (907)
```

## 9. Test suite design

The suite is the acceptance contract for the rebuild. It runs deterministically in CI with no live
credentials. cairn's three external side-effects are faked: the GitHub commit runs against an in-memory
contents-and-commit double, the email send lands in a sink, and the deploy is out of scope for automation.

**Unit (vitest, the bulk).** Pure logic with no I/O: the GitHub App JWT signing and the PKCS#1-to-PKCS#8
conversion, the `commitFile` request body shape and its 409 path against the double, frontmatter validation,
filename-based id handling, the YAML `setMenu` round-trip and its top-level-key preservation, and the render
pipeline against characterization snapshots ported from the current suite to prove byte-identical output.

**Integration (vitest plus `@cloudflare/vitest-pool-workers`).** Real auth against a real local D1. The
`cloudflareTest()` plugin runs the code in workerd, and `applyD1Migrations` applies the committed migration
SQL in setup. These tests drive the real `load` and action functions: request a link, GET the confirm page and
confirm it consumes nothing, POST to verify, assert single-use enforcement on a second POST, assert the guard
redirects an anonymous request and admits a valid session, assert role gating and the anti-lockout rule. The
GitHub side runs against the in-memory double; email lands in the sink.

**Component (`vitest-browser-svelte`).** The admin components in a real browser via the Playwright provider,
which handles Svelte 5 fine-grained reactivity that jsdom gets wrong. Coverage: the differentiated post and
page forms render the right fields, the preview toggle shows and hides the pane, the nav tree reorders by
keyboard, and the Bits UI dialog and combobox carry their ARIA roles and keyboard behavior.

**End-to-end (Playwright, one golden path).** A logged-in editor opens a post, edits it, sees the live
preview update, saves, and the commit reaches the GitHub double with the editor as author and `cairn-cms[bot]`
as committer. This exercises the real components against the fakes.

**Contract tests.** One per seam from section 6. Each asserts the seam's shape and composition rule, so a
later feature that violates a seam fails here rather than in production.

**Manual smoke (unchanged).** The real GitHub commit and real email round-trip stays the documented Firefox
gate, run with a minted session per `docs/admin-smoke-test.md`. It is not automated into CI.

## 10. Acceptance scenarios (the functional test)

These scenarios define "done." Each maps to a test layer. They are the behavioral contract the rebuild must
satisfy.

**Auth**

1. An allow-listed editor requests a link, receives one in the email sink, GETs the confirm page (no session
   yet), POSTs the confirmation, and lands authenticated at `/admin`.
2. A non-allow-listed email requests a link and gets the same response as an allow-listed one, and no link is
   sent.
3. A confirmation token works exactly once; replaying it fails.
4. An expired token (past its 10-minute TTL) fails.
5. A GET of the confirm link consumes nothing; only the POST verifies.
6. An anonymous request to `/admin` redirects to `/admin/login`. A valid session reaches `/admin`.
7. An owner sees the manage-editors entry; an editor does not, and a direct request to the management surface
   as an editor is rejected.
8. Removing or demoting the last owner is refused.
9. Demoting an editor takes effect on that editor's next request without re-login.

**Content and editing**

10. `/admin` lists the enabled concepts. Selecting Posts lists post entries with title and metadata; selecting
    Pages lists page entries.
11. Opening a post shows the rich frontmatter form; opening a page shows the minimal one.
12. The live preview renders directive markdown through the site's own pipeline, matching the published output.
13. Saving invalid frontmatter returns to the form with an error and writes nothing to git.
14. Saving a valid edit commits to the target branch with the editor as author and `cairn-cms[bot]` as
    committer, and a clean diff.
15. When the file changed since it was opened, the save reports the conflict and does not overwrite.

**Nav**

16. The nav editor loads the named menu from the YAML config; a missing or unparsable file degrades to an empty
    tree without erroring.
17. Saving the menu commits only the one menu's changes and preserves every other top-level key in the file.
18. The nav tree reorders by keyboard.

**Distribution and guards**

19. No server-side module imports `carta-md`.
20. `wrangler deploy --dry-run` stays under the bundle and startup limits on both sites.
21. `/admin/healthz` signs a dummy JWT successfully.

**Scaffolding**

22. `npm create @glw907/cairn-site` lists the available templates and scaffolds the chosen one into a new
    directory.
23. A freshly scaffolded site passes `svelte-check` and `vite build` with no edits beyond the provisioning
    values.
24. The scaffolded admin route shims match the template contract exactly; only the adapter and design layer
    differ between templates.
25. `publint` and `@arethetypeswrong/cli` pass on the published package across all three subpaths.

## 11. Rebuild approach

The rebuild follows topology A: fresh internals, the two live sites as real consumers.

1. Write this spec and have it reviewed (this document).
2. Stand up a git worktree off `cairn-cms` `main`, so the live branch is untouched.
3. Build the test suite first, red against the old or empty internals. The suite is the acceptance contract.
4. Rebuild the engine internals green against the suite, seams first.
5. Migrate each site's adapter to the `content: {}` contract. Gate on both sites' `svelte-check`, both builds,
   and the manual smoke.
6. Repoint and cut over only when everything is green.
7. Build the `create-cairn-site` scaffolder and the first two templates against the finished adapter and
   template contracts, then verify a scaffolded site builds and reaches `/admin`.

Steps 1 through the suite design are this brainstorm's output. The implementation, steps 2 through 7, is the
next request and gets its own plans. Each subsystem is one plan, built and tested before the next is written.

## 12. Code quality: commenting and packaging

The rebuild targets first-class, idiomatic SvelteKit and DaisyUI code with top-notch comments and packaging,
on current dependencies. Comments follow the stack's conventions and the project's writing voice (plain,
varied, no AI-writing tells), and `prose-guard` gates documentation prose.

- Svelte components carry a top-of-file `<!-- @component -->` doc comment describing purpose and usage, and
  JSDoc on each member of the `Props` interface so editor hover shows per-prop docs.
- TypeScript modules use TSDoc on exported functions and types, documenting parameters, return values, thrown
  errors, and non-obvious invariants.
- The adapter contract and the template contract are documented exhaustively, since they are the public API a
  site author reads when building or customizing a template.
- Comments explain why, not what. They earn their place; routine code stays uncommented.
- Packaging is first-class and gated. `svelte-package` builds `dist`, and `publint` plus
  `@arethetypeswrong/cli` verify the exports map and type resolution for both halves of the `publishConfig`
  swap across all three subpaths.

## 13. Risks carried into the rebuild

- **Cloudflare Email Sending is the sole auth channel and is a beta product.** Wrap sends with explicit errors
  and an audit log, and keep Resend as a coded fallback.
- **cairn has a single-author bus factor.** Accepted strategically; the `MarkdownEditor` seam and the lean,
  owned auth reduce the surface that a second maintainer would need to learn.
- **Self-owned auth is owned security.** The surface is small and the threat model is modest (allowlist-gated,
  no public signup), but cookie, CSRF, and session hygiene are now the project's responsibility. The contract
  and integration tests cover the known failure modes.
- **GitHub API caps** (1,000-entry listing, 1 MB body) are handled by the Trees API and documented; sharding
  waits for a real trigger.
```
