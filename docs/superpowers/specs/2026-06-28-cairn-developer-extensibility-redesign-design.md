# cairn developer extensibility (redesign): design and rationale

Status: design draft, 2026-06-28. Source of truth for the implementation plans that follow. This is the
lean re-derivation of developer extensibility, charter-first, after the principle-adherence review
(complete, merged, `main` at `0.76.0`). It lands in the breaking pre-1.0 window, before adoption, ahead
of a stable 1.0.

This draft is hardened: it incorporates a five-lens adversarial review (charter, DX, SvelteKit
correctness, boundary/packaging, completeness) with every finding verified against the code for
technical reality and charter-admissibility (44 findings, 39 confirmed, 0 charter violations). The
corrections are folded inline; the appendix "How this spec was hardened" records the load-bearing ones.

**This supersedes the earlier extensibility design**
(`2026-06-28-cairn-developer-extensibility-design.md`), which grew an identity/permissions substrate (a
`Principal` model, scopes, trust tiers, an `authorize` callback, member login) into the engine and was
reverted. That spec is kept only as a cautionary record. Read the charter before this doc: the
`## What cairn is` block in `CLAUDE.md` and `docs/internal/what-cairn-is-and-is-not.md`. The redesign
inputs are in `docs/internal/extending-developer-lens.md`; the competitive research is in
`docs/internal/2026-06-28-extensibility-competitive-research.md`.

## Purpose

Let a developer launch a content-managed site fast on cairn, then build their own functionality on top:
custom admin screens in the cairn shell, backed by the developer's own data, reading the logged-in
owner/editor identity, and depending on a narrow, *enforced* public boundary so an engine update never
silently breaks the customization. cairn provides thin seams, not features, and is an easy,
non-restrictive starting point: low-friction to start and to extend.

cairn stays owner/editor only. It never models a member, customer, or other domain actor. The
developer's domain (the aksailingclub `people`/`assignments`/`waitlist` tables, say) lives on the
developer's own D1 binding, in the developer's own routes, separate from cairn's content backend. The
content stays markdown-in-git.

## Charter premise check (runs before correctness)

The premise check is "is this cairn's job, and is it the leanest form?" Each seam below passes it; the
adversarial review confirmed 0 charter violations across 44 findings:

- **Admin extension** is cairn's job (it owns the admin frame) and takes the leanest form: cairn *is* a
  SvelteKit app, so a custom screen is just a more-specific SvelteKit route. cairn adds no dispatcher,
  no component registry, no runtime indirection. It exposes only the chrome, a data-only nav entry, and
  the identity contract. The DX steer (cairn must be an easy, non-restrictive starting point) is weighed
  first-class here, but "non-restrictive" means low-friction, not "accommodate every universe"; a DX
  request that re-grows scope is creep, not DX.
- **Identity hand-off** reuses the existing owner/editor session with zero new runtime surface. It does
  not introduce a principal, scopes, tiers, or any non-editor actor. Auth stays scoped to gating the
  admin.
- **Enforced boundary** is the charter's own promise ("a narrow, versioned, enforced public surface")
  made real by gates instead of prose. It adds enforcement, not surface.

What this resists: re-growing an identity/permissions platform; a component-dispatcher cairn does not
need as the host framework; speculative "a developer might want" surface. "Out of scope" remains a
correct answer (see "Out of scope").

## The shape in one picture

A developer adds an admin screen by writing a normal, more-specific SvelteKit route under `/admin/`.
cairn mounts its admin at the catch-all `/admin/[...path]`, and SvelteKit routes a concrete
`/admin/members` to the developer's route, never to the catch-all (verified). The global auth `handle`
covers all of `/admin/**` and runs before the route's load, so the route sits behind the editor login
with `locals.editor` populated, for free (verified). cairn supplies the chrome, the nav entry, and the
typed identity contract, and nothing else.

```
src/routes/admin/
  +layout.server.ts      # export const load = admin.shellLoad   (NEW mount file)
  +layout.svelte         # <CairnAdminShell shell={data.shell}>{@render children()}</CairnAdminShell>
  [...path]/             # cairn's own views, rendered BARE inside the shell (existing mount, refactored)
    +page.server.ts      # export const load = admin.load; export const actions = admin.actions
    +page.svelte         # <CairnAdmin {data} {form} ... />   (no internal layout now)
  members/               # the developer's custom screen (concrete route wins over the catch-all)
    +page.server.ts      # reads locals.editor + the developer's own D1 binding
    +page.svelte         # content only; chrome comes from the shared +layout
```

## Seam 1 — extend the admin skeleton

### Shared shell

cairn's chrome (sidebar, header, theme wrapper, command palette) moves out of the internal
`AdminLayout.svelte` into an exported `CairnAdminShell` component, mounted once by the consumer in
`/admin/+layout.svelte`. Both cairn's own views and the developer's custom screens render inside it, so
a custom screen is visually native with no per-page wrapping.

This requires splitting today's single `AdminData` discriminated union into two:

- **Shell data** (`AdminShellData`), returned by a new `admin.shellLoad` wired to the `/admin`
  `+layout.server.ts`. Carries only what the chrome needs: the resolved `editor` (or null), a `public`
  flag, the `nav` model (concepts + Media + Settings + owner-gated Editors + custom entries), branding,
  `navLabel`, and `canManageEditors`. It does **not** carry view-specific data.
- **View data** (the existing per-view payloads: `list | edit | editors | nav | media | settings |
  help`, plus the public `login | confirm`), still returned by `admin.load` and rendered by
  `CairnAdmin`, now refactored to render **bare** inside the shell (its internal `AdminLayout` wrapping
  is removed).

`shellLoad` must stay lean: it must not trigger the GitHub `listBranches` round-trip (today reachable
from the layout's publish controls), because the layout runs on *every* admin page including custom
developer routes and the public login page. Branch/publish state is view-specific and stays in
`admin.load`. The plan confirms the split keeps no view-only data in shell data and no chrome-only data
in view data. This is a real internal-architecture change with a non-trivial blast radius (the
`AdminData` union, the load switch, `CairnAdmin`, and `AdminLayout` all move); Plan 1 sizes it
explicitly.

The theme `data-theme` attribute stays on a bare wrapper inside `CairnAdminShell`, never on a styled
element, per `admin-design-system.md`.

### Global chrome actions must target absolute paths (load-bearing)

The chrome today renders route-relative form actions: `action="?/logout"` and `action="?/publishAll"`
(`AdminLayout.svelte`). Inside a shared shell these post to the *current* route, so on a developer's
concrete `/admin/members` route they would POST `/admin/members?/logout`, which has no such action and
404s. So the shell's global actions must target a **stable absolute admin action path** served by the
catch-all mount, independent of the current route, and the catch-all's `viewAction` allow-lists must
permit those global actions at that path. The plan picks the exact endpoint (an existing catch-all view
whose `viewAction` admits the action, or a small dedicated action route) and verifies a global action
fires correctly from a custom route. Any future global chrome control inherits this rule.

### Public-view handling (no login trap)

The shared layout runs for every `/admin/**` request, including the unauthenticated `/admin/login` and
`/admin/auth/*`. `shellLoad` returns `public: true` for those paths, and `CairnAdminShell` renders its
children bare (no sidebar, no header) when `public` is set or `editor` is null. An unauthenticated
visitor reaches login without the layout redirecting or trapping them. The guard remains the authority
that redirects non-public admin paths to login; the shell only chooses chrome-or-bare.

The public-path classification has one source of truth: `shellLoad` reuses the guard's
`isPublicAdminPath` rather than re-deriving the rule (the guard exports it, or both import a shared
predicate). A mirrored second copy is exactly the silent-divergence hazard the boundary work exists to
prevent. This move also changes the public auth pages from page-rendered-bare to layout-wrapped-bare, a
real load-order change; Plan 1 adds explicit tests that login and confirm still render and submit under
the shared layout.

### Nav registration (data-only)

The adapter/runtime config gains an optional `adminNav` field:

```ts
adminNav?: Array<{ label: string; icon: AdminNavIcon; href: string; ownerOnly?: boolean }>;
```

It is data only. `shellLoad` merges these entries into the sidebar model, the command palette, and the
breadcrumb source (today all three derive from the hardcoded `coreItems`; custom entries must reach all
three, not just the sidebar). No component is registered and no runtime dispatch occurs; the entry is a
link to the developer's own route.

Three details the review corrected:

- **Icon contract.** The chrome nav uses Lucide Svelte *components* (`NavItem.icon: Component`), a
  different system from the consumer-passed render `IconSet` (a `Record<string,string>` of 256-viewBox
  SVG path-data for content rendering). So `adminNav.icon` is **not** a render-IconSet name. It is a
  typed name (`AdminNavIcon`) resolved against a small fixed allowlist of Lucide icons cairn already
  bundles for the chrome, with a documented fallback glyph for an unknown name. A developer may not pass
  an arbitrary Svelte component (that re-opens the component-registry seam the charter forbids). The
  plan defines the accepted-names union and the fallback.
- **Collision validation reuses the dispatcher's authority.** A custom `href` must not collide with a
  reserved segment or a concept route. Validation reuses `admin-dispatch`'s `RESERVED_SEGMENTS` (the
  single source of truth), not a second hardcoded list, and also accounts for SvelteKit route shadowing
  (a concrete custom route silently shadowing a cairn view). The collision is surfaced as a
  `cairn-doctor` check and a clear config-build error, not discovered late at runtime.
- **`ownerOnly` is cosmetic; the route must still gate.** `ownerOnly` hides the sidebar link from
  non-owners, nothing more. The docs state plainly that the custom route itself must enforce access with
  `requireOwner` server-side; the nav flag is not access control. This footgun warning ships with the
  nav-registration reference.

## Seam 2 — read the owner/editor identity

No new runtime surface. A custom route under `/admin/*` inherits the guard, so:

- `locals.editor` is populated by the guard before the custom load runs. This already ships as a typed
  contract: the `App.Locals.editor?: Editor | null` augmentation is published from the existing
  `@glw907/cairn-cms/ambient` subpath, and the showcase already imports it. No new work here beyond
  documenting it as the sanctioned identity contract. (`Editor` and `Role` are exported from the **root**
  `.` subpath, not `/sveltekit`; the docs cite the correct import.)
- `requireSession(event)` works directly in a custom `+page.server.ts` load: it takes the minimal
  structural `{ locals: { editor } }`, so a standard server load satisfies it.
- `requireOwner` today demands the full `RequestContext` (cookies, `setHeaders`, `platform.env:
  AuthEnv`), which a developer's own load (with their own binding) cannot satisfy without a type
  mismatch, even though the function only reads `editor.role`. Plan 1 narrows `requireOwner` to the same
  minimal `{ locals: { editor } }` structural param as `requireSession`. This is a small,
  DX-improving, backward-compatible signature widening (every current caller still satisfies it).

The developer's custom screen reads its own data from its own D1 binding (for example
`event.platform.env.OPS_DB`), entirely separate from cairn's content backend. The standing rule holds:
cairn's backend interface never grows a `query()` method. The developer types their own binding the way
the showcase already types cairn's: by adding it to the `App.Platform.env` block in their `app.d.ts`
(the established pattern, documented in the guide).

### CSRF for custom actions (reuse what ships)

The guard applies a double-submit CSRF check to unsafe form requests on `/admin/**` (the submitted
field name is `csrf`, verified), so a custom POST action that omits the token is rejected. cairn already
ships the machinery: an exported `CsrfField` component (`@glw907/cairn-cms/components`) and a
`csrf-context` provider. The work is **not** to reinvent it but to ensure the context the field reads is
provided by the shared shell, so a custom route's `<form>` can drop in `<CsrfField />` and have it
resolve the token. The guide documents the one-line pattern; the reference points at the existing
component. No raw `csrfToken` needs surfacing in shell data if the context provider moves into the shell;
the plan confirms which (context provider vs explicit token) is the leaner wiring.

### Custom-screen styling, interactivity, and client ownership

A custom screen renders inside the shell, so it sits within the admin's scoped Tailwind/DaisyUI styling
context; the guide shows how a custom screen uses the admin design tokens and utilities (and the
`data-theme` wrapper it inherits) rather than re-importing a stylesheet. The shell owns the global
keyboard surface (Cmd+K command palette, Cmd+B sidebar toggle) and the theme; the docs state which
shortcuts are reserved so a custom screen does not collide, and show that client interactivity in a
custom screen rides the developer's own client code or the existing `./islands` runtime, not a new
admin-client seam.

### Forward compatibility (deferred, non-breaking)

A non-`/admin` `resolveEditor(event)` helper (read the session cookie, resolve the editor on any route)
is deliberately not shipped now: it would widen auth past the admin boundary for a case that is not yet
concrete. It stays a purely additive future export (a thin wrapper over the internal `resolveSession`
and cookie-name helpers, which remain internal), so deferring it paints the design into no corner. This
leaves diagnostic question 2 ("put their own routes behind the session") answered for the `/admin` case
and explicitly deferred for the non-`/admin` case; the deferral is recorded, not hidden.

## Seam 3 — enforced public boundary and upgrade

Subpaths stay organized by kind. The only genuinely new exports land in their natural homes:
`CairnAdminShell` → `/components`; the `shellLoad` accessor and `AdminShellData`/`adminNav`/`AdminNavIcon`
types → `/sveltekit`. No subpath rename, no curated re-export layer. The boundary is drawn by
enforcement, not by a name. The review corrected the enforcement plan substantially:

1. **Public-surface snapshot gate (`check:surface`).** A new emitter walks each exported subpath's
   built `.d.ts` and writes a committed golden API snapshot; the gate fails loud when the surface drifts,
   and a deliberate regenerate is the disclosure moment. This is **not** a reuse of
   `reference-coverage.mjs` (that machinery checks that documented exports exist; it does not snapshot a
   type-level API surface). It is a new, focused emitter; the plan picks the snapshot format and
   location. This targets the axis the field handles worst (Sanity's peer-error wall, Decap's silent
   inference): cairn fails at build time instead.
2. **Do not un-mute attw `internal-resolution-error`.** The review verified that the rule's failures are
   not internal-type leaks: they are 23 `InternalResolutionError`s on `.svelte`/`.css` re-export
   specifiers (for example `./CairnAdmin.svelte`) that attw's resolver cannot follow to their existing
   `.svelte.d.ts` without the Svelte language plugin. This is a structural `svelte-package`-vs-`attw`
   limitation, not a defect a developer can tidy, and un-muting produces a permanent red no
   internal-reference fix clears. The rule stays muted. If catching *genuine* internal `.ts` type-leaks
   is wanted later (some public prop types do import internal modules), that needs a different mechanism
   (a `.d.ts` import-graph lint that allowlists `.svelte`/`.css`/declared-public modules and flags
   undeclared internal `.ts` imports), and it must be sized as its own piece before any commitment. It is
   **out of scope** for this initiative, filed as a follow-up.
3. **Extension-API vs Scaffold-API tier, gated not just labeled.** Each export is labeled in its
   reference page as *Extension API* (hand-author against this; promised hardest, for example
   `CairnAdminShell`, `requireSession`, `requireOwner`, `CsrfField`, `Editor`, `Role`, `adminNav`) or
   *Scaffold API* (generated by `create-cairn-site`; stable but not hand-edited, for example
   `createCairnAdmin`, `createAuthGuard`, the per-surface route factories). To make the tier more than a
   doc label, `check:reference` is extended to assert every export carries a tier marker, so an
   untagged new export fails the gate. The tier is documented and gated; it does not physically
   partition the subpaths.
4. **Upgrade.** `cairn-doctor` gains a best-effort mount-shape check that detects whether the four-file
   `/admin` mount is present and wired and emits an actionable message; the spec is honest that this is a
   text/structure heuristic, not a guarantee. The shared-layout addition ships with a CHANGELOG
   "Consumers must" note. The change is breaking, which 0.x caret ranges isolate per minor, so it ships
   as one minor bump; the plan adds a clear breaking-in-0.x signal in the release notes rather than
   relying on prose alone.

## Charter reconciliation (the `./extend` name)

The charter (`what-cairn-is-and-is-not.md`) names the boundary "`./extend`", a single versioned export
subpath. This design deliberately does not create that subpath, because the developer-facing surface is
small and already organizes cleanly by kind (`/components`, `/sveltekit`, root), and a curated re-export
layer would split related helpers (a component off `/components`, `requireSession` away from
`createAuthGuard`) for no enforcement gain. The enforcement the charter actually wants (narrow,
versioned, *enforced*) is delivered by `check:surface` + the gated stability tiers across the existing
subpaths. The charter doc is updated in this initiative to describe the boundary as "an enforced,
versioned public surface" rather than hardcoding the `./extend` subpath name, so the canonical charter
and this design agree.

## The showcase proof

`examples/showcase` gains one minimal custom `/admin` screen backed by its own D1 table (a small
"Signups" list with a create action): a concrete `/admin/signups` route reading `locals.editor`,
rendering inside `CairnAdminShell`, registering an `adminNav` entry, reading and writing its own D1
binding through a `CsrfField`-protected action, and demonstrating the absolute-path global action and a
`requireOwner`-gated destructive action. It exercises the whole seam (route + shell + nav + identity +
custom D1 + CSRF action + owner gate) with minimal showcase bloat, and the e2e suite gains one spec for
it. The showcase stays a lean library-proving harness; it does not port aksailingclub domain complexity.

The aksailingclub ops dashboard (members, assets, waitlist, on its own D1 binding) is the concreteness
check the seam is designed against, not the showcase scope.

## Sequencing (one spec, two plans)

The high-blast-radius mechanical work is isolated from the capability work:

- **Plan 1 — capability.** Extract `CairnAdminShell` from `AdminLayout`; add the shared-layout mount;
  split `AdminData` into shell data + view data (lean `shellLoad`, no `listBranches`) and refactor
  `CairnAdmin` to render bare; the absolute-path global-action fix; public-path single-source-of-truth +
  the layout-wrap load-order tests; `adminNav` registration (typed icon allowlist, reserved-segment
  collision check, palette + breadcrumb merge, `ownerOnly` + the gating-footgun docs); narrow
  `requireOwner`'s signature; the CSRF-context-in-shell wiring; document the identity contract,
  platform.env binding pattern, styling, and reserved shortcuts; the showcase Signups proof and its e2e
  spec; the reference pages for the new exports.
- **Plan 2 — enforcement.** The `check:surface` snapshot gate; the `check:reference` tier-marker
  assertion + the Extension/Scaffold labels across the reference pages; the `cairn-doctor` mount-shape
  check; the upgrade disclosure and the breaking-in-0.x release signal.

Each plan clears the full gate (targeted test + `npm run check` 0/0 + `npm test` + the doc gates) and a
reviewer fan-out at its review gate. The release is one minor bump covering both plans, cut after Plan 2
so the enforced boundary is in place when the new surface ships.

## Diagnostic-question coverage

The four redesign questions from the extending-developer lens, each answered:

1. **Extend the admin skeleton** — yes, via a concrete SvelteKit route + `CairnAdminShell` +
   `adminNav`, without forking the catch-all or editing the `CairnAdmin` view switch.
2. **Read the owner/editor identity** — yes, via the guard-populated `locals.editor` (the `./ambient`
   contract) and the exported `requireSession`/`requireOwner`, with no cookie or raw-D1 handling, scoped
   to `/admin/*`. The non-`/admin` case is explicitly deferred (additive, non-breaking).
3. **Depend on an enforced public boundary** — yes, via the `check:surface` snapshot gate and the gated
   stability tiers; the boundary is enforced, not merely documented.
4. **Upgrade smoothly** — the `cairn-doctor` mount-shape heuristic plus the loud build-time surface gate
   replace silent breakage with actionable failure; the one breaking change (the shared-layout mount)
   ships with an explicit consumer note.

## Out of scope

- Any principal, scope, trust-tier, member, or non-editor actor in the engine.
- A component dispatcher or runtime registry for admin screens, or an arbitrary-Svelte-component nav
  icon.
- A `query()` method on the content backend, or any cairn ownership of the developer's domain data.
- A general non-`/admin` session helper (deferred, additive).
- Un-muting attw `internal-resolution-error` / a `.d.ts` internal-import-graph lint (filed as a separate,
  separately-sized follow-up; the muted rule is a `svelte-package` limitation, not a defect).
- Custom site settings, custom frontmatter field types (the removed `FieldTypeDef` seam is not
  re-added), i18n — the developer's domain or correctly out of cairn's job.
- Porting aksailingclub domain logic into the engine or the showcase.

## Open questions for the plans

- The exact absolute endpoint the shell's global actions (logout, publishAll) post to, and its
  `viewAction` allow-listing.
- The `check:surface` snapshot format and location.
- Whether the CSRF wiring is "context provider in the shell" alone or also a surfaced token; decide from
  the leaner result.
- The exact `AdminNavIcon` accepted-names union and fallback glyph.

## Appendix: how this spec was hardened

A five-lens adversarial workflow (charter, DX, SvelteKit correctness, boundary/packaging, completeness)
produced 44 findings, each verified against the code for technical reality and charter-admissibility:
39 confirmed, 3 uncertain, 0 charter violations. The load-bearing corrections folded above:

- The `adminNav.icon` contract pointed at the wrong icon system (render `IconSet` vs the chrome's Lucide
  components); replaced with a typed Lucide-name allowlist.
- Un-muting attw `internal-resolution-error` is unfixable (a `svelte-package` resolver limitation, not a
  leak); dropped from scope, replaced by the `check:surface` snapshot gate, with a `.d.ts` import-graph
  lint filed as a separate follow-up.
- `check:surface` is a new type-level emitter, not a reuse of `reference-coverage.mjs`.
- Shell-rendered global actions (`logout`, `publishAll`) use route-relative actions that 404 on a custom
  route; they must target an absolute catch-all action path.
- `shellLoad` must not run `listBranches` on every admin page (including custom routes and login).
- `requireOwner` over-demanded `RequestContext`; narrowed to the minimal `{ locals: { editor } }`.
- `Editor`/`Role` export from the root subpath, not `/sveltekit`; `CsrfField` and the `App.Locals.editor`
  ambient augmentation already ship and are already consumed (the spec's open questions on them were
  moot).
- The public-path predicate and the reserved-segment set each have one source of truth; `shellLoad` and
  the `adminNav` collision check reuse them rather than mirroring.
- `ownerOnly` nav visibility is cosmetic; the route must still gate with `requireOwner` (documented
  footgun).
- Custom entries must reach the command palette and breadcrumbs, not only the sidebar.
- The charter's `./extend` name is reconciled: the boundary is enforced across kind-based subpaths, and
  the charter doc is updated to match.
