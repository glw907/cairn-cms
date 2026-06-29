# cairn developer extensibility (redesign): design and rationale

Status: design draft, 2026-06-28. Source of truth for the implementation plans that follow. This is the
lean re-derivation of developer extensibility, charter-first, after the principle-adherence review
(complete, merged, `main` at `0.76.0`). It lands in the breaking pre-1.0 window, before adoption, ahead
of a stable 1.0.

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
silently breaks the customization. cairn provides thin seams, not features.

cairn stays owner/editor only. It never models a member, customer, or other domain actor. The
developer's domain (the aksailingclub `people`/`assignments`/`waitlist` tables, say) lives on the
developer's own D1 binding, in the developer's own routes, separate from cairn's content backend. The
content stays markdown-in-git.

## Charter premise check (runs before correctness)

The premise check is "is this cairn's job, and is it the leanest form?" Each seam below passes it:

- **Admin extension** is cairn's job (it owns the admin frame) and takes the leanest form: cairn *is* a
  SvelteKit app, so a custom screen is just a more-specific SvelteKit route. cairn adds no dispatcher,
  no component registry, no runtime indirection. It exposes only the chrome, a data-only nav entry, and
  the identity contract.
- **Identity hand-off** reuses the existing owner/editor session with zero new runtime surface. It does
  not introduce a principal, scopes, tiers, or any non-editor actor. Auth stays scoped to gating the
  admin.
- **Enforced boundary** is the charter's own promise ("a narrow, versioned, enforced public surface")
  made real by gates instead of prose. It adds enforcement, not surface.

What this resists: re-growing an identity/permissions platform; a component-dispatcher cairn does not
need as the host framework; speculative "a developer might want" surface. "Out of scope" remains a
correct answer.

## The shape in one picture

A developer adds an admin screen by writing a normal, more-specific SvelteKit route under `/admin/`.
cairn mounts its admin at the catch-all `/admin/[...path]`, and SvelteKit routes a concrete
`/admin/members` to the developer's route, never to the catch-all. The global auth `handle` already
covers all of `/admin/**`, so the route sits behind the editor login with `locals.editor` populated,
for free. cairn supplies the chrome, the nav entry, and the typed identity contract, and nothing else.

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
  `+layout.server.ts`. Carries: the resolved `editor` (or null), a `public` flag, the `nav` model
  (concepts + Media + Settings + owner-gated Editors + any custom entries), branding, `navLabel`,
  `canManageEditors`, and the `csrfToken` (see Seam 2). It is the data the chrome needs and nothing
  view-specific.
- **View data** (the existing per-view payloads: `list | edit | editors | nav | media | settings |
  help`, plus the public `login | confirm`), still returned by `admin.load` and rendered by
  `CairnAdmin`, now refactored to render **bare** inside the shell (its internal `AdminLayout` wrapping
  is removed).

The theme `data-theme` attribute stays on a bare wrapper inside `CairnAdminShell`, never on a styled
element, per `admin-design-system.md`.

### Public-view handling (no login trap)

The shared layout runs for every `/admin/**` request, including the unauthenticated `/admin/login` and
`/admin/auth/*`. `shellLoad` returns `public: true` for those paths (mirroring the guard's
`isPublicAdminPath`), and `CairnAdminShell` renders its children bare (no sidebar, no header) when
`public` is set or `editor` is null. An unauthenticated visitor reaches login without the layout
redirecting or trapping them. The guard remains the authority that redirects non-public admin paths to
login; the shell only chooses chrome-or-bare.

### Nav registration (data-only)

The adapter/runtime config gains an optional `adminNav` field:

```ts
adminNav?: Array<{ label: string; icon: string; href: string; ownerOnly?: boolean }>;
```

It is data only: `icon` is a name resolved against the icon set the consumer already passes to the
shell, `href` is the custom route, `ownerOnly` gates visibility to owners (mirroring the Editors entry).
`shellLoad` merges these entries into the sidebar model and the command palette. cairn validates that a
custom `href` does not collide with a reserved segment or a concept route, and surfaces a clear config
error if it does. No component is registered and no runtime dispatch occurs; the entry is a link to the
developer's own route.

## Seam 2 — read the owner/editor identity

No new runtime surface. A custom route under `/admin/*` inherits the guard, so:

- `locals.editor` is populated by the guard before the custom load runs. cairn ships this as a
  documented, publicly-typed contract: the `Editor`/`Role` types are already exported, and the
  `App.Locals.editor?: Editor | null` augmentation ships via the `./ambient` types so a consumer that
  references them gets the field typed automatically. (Plan verifies `./ambient` is the right home for
  the augmentation.)
- `requireSession(event)` and `requireOwner(event)` (already exported from `/sveltekit`) work directly
  in a custom `+page.server.ts` load. The developer never touches the session cookie or the raw D1
  binding.

The developer's custom screen reads its own data from its own D1 binding (for example
`event.platform.env.OPS_DB`), entirely separate from cairn's content backend. The standing rule holds:
cairn's backend interface never grows a `query()` method.

### CSRF for custom actions (discovered during design)

The guard applies a double-submit CSRF check to unsafe form requests on `/admin/**`, so a custom POST
action that omits the token will be rejected. To make custom actions work out of the box:

- `shellLoad` surfaces the `csrfToken` in shell data.
- cairn documents the hidden-field pattern for a custom form
  (`<input type="hidden" name="<csrf-field>" value={shell.csrfToken}>`), and the plan evaluates a tiny
  `CsrfField` helper component. The exact field name is taken from the guard implementation, not
  guessed.

This is a contract detail, not a new auth mechanism: the developer reuses cairn's existing CSRF
protection rather than rolling their own.

### Forward compatibility (deferred, non-breaking)

A non-`/admin` `resolveEditor(event)` helper (read the session cookie, resolve the editor on any route)
is deliberately not shipped now: it would widen auth past the admin boundary for a case that is not yet
concrete. It stays a purely additive future export (a thin wrapper over the internal `resolveSession`
and cookie-name helpers, which remain internal), so deferring it paints the design into no corner.

## Seam 3 — enforced public boundary and upgrade

Subpaths stay organized by kind. The only genuinely new exports land in their natural homes:
`CairnAdminShell` → `/components`; the `shellLoad` accessor and `AdminShellData`/`adminNav` types →
`/sveltekit`. No subpath rename, no curated re-export layer. The boundary is drawn by enforcement, not
by a name:

1. **Public-surface snapshot gate.** A new `check:surface` script emits a golden API snapshot per
   exported subpath (the same `.d.ts`-walking machinery `check:reference` already uses) and fails loud
   when the surface drifts from the committed snapshot. A surface change must be acknowledged by
   regenerating the snapshot, which is the deliberate disclosure moment. This is the enforcement the
   field handles worst (Sanity's peer-error wall, Decap's silent inference); cairn fails at build time
   instead.
2. **attw `internal-resolution-error` un-muted.** Remove `internal-resolution-error` from the
   `check:package` `--ignore-rules` list, and fix the leaks so no public type references a
   non-exported internal module. This is the high-blast-radius mechanical work and is isolated to
   Plan 2.
3. **Extension-API vs Scaffold-API stability tier.** Each export is labeled in its reference page as
   *Extension API* (hand-author against this; promised hardest, for example `CairnAdminShell`,
   `requireSession`, `requireOwner`, `Editor`, `Role`, `adminNav`) or *Scaffold API* (generated by
   `create-cairn-site`; stable but not hand-edited, for example `createCairnAdmin`, `createAuthGuard`,
   the per-surface route factories). `check:reference` already requires every export to be documented,
   so the tier label rides along.
4. **Upgrade.** `cairn-doctor` gains a mount-shape check that validates the four-file `/admin` mount is
   present and wired, so a consumer that is behind gets an actionable message instead of a silent
   break. The shared-layout addition ships with an honest CHANGELOG "Consumers must" note (breaking,
   acceptable in the pre-1.0 window).

## The showcase proof

`examples/showcase` gains one minimal custom `/admin` screen backed by its own D1 table (a small
"Signups" list with a create action): a concrete `/admin/signups` route reading `locals.editor`,
rendering inside `CairnAdminShell`, registering an `adminNav` entry, and reading and writing its own D1
binding through a CSRF-protected action. It exercises the whole seam (route + shell + nav + identity +
custom D1 + CSRF action) with minimal showcase bloat, and the e2e suite gains one spec for it. The
showcase stays a lean library-proving harness; it does not port aksailingclub domain complexity.

The aksailingclub ops dashboard (members, assets, waitlist, on its own D1 binding) is the concreteness
check the seam is designed against, not the showcase scope.

## Sequencing (one spec, two plans)

The high-blast-radius mechanical enforcement is isolated from the capability work:

- **Plan 1 — capability.** Extract `CairnAdminShell` from `AdminLayout`; add the shared-layout mount;
  split `AdminData` into shell data + view data and refactor `CairnAdmin` to render bare; add `adminNav`
  registration and merge it in `shellLoad`; ship the `locals.editor` typed contract; surface
  `csrfToken` and document/component the custom-action CSRF pattern; reference docs for the new exports;
  the showcase Signups proof and its e2e spec.
- **Plan 2 — enforcement.** The `check:surface` snapshot gate; un-mute attw `internal-resolution-error`
  and fix the leaks; the Extension-API/Scaffold-API tier labels; the `cairn-doctor` mount-shape check;
  the upgrade disclosure.

Each plan clears the full gate (targeted test + `npm run check` 0/0 + `npm test` + the doc gates) and a
reviewer fan-out at its review gate. The release is one minor bump covering both plans, cut after Plan 2
so the enforced boundary is in place when the new surface ships.

## Diagnostic-question coverage

The four redesign questions from the extending-developer lens, each answered:

1. **Extend the admin skeleton** — yes, via a concrete SvelteKit route + `CairnAdminShell` +
   `adminNav`, without forking the catch-all or editing the `CairnAdmin` view switch.
2. **Read the owner/editor identity** — yes, via the guard-populated `locals.editor` and the exported
   `requireSession`/`requireOwner`, with no cookie or raw-D1 handling, scoped to `/admin/*`.
3. **Depend on an enforced public boundary** — yes, via the `check:surface` snapshot gate, the attw
   un-mute, and the stability tiers; the boundary is enforced, not merely documented.
4. **Upgrade smoothly** — the `cairn-doctor` mount-shape check plus loud build-time surface/type gates
   replace silent breakage with actionable failure.

## Out of scope

- Any principal, scope, trust-tier, member, or non-editor actor in the engine.
- A component dispatcher or runtime registry for admin screens.
- A `query()` method on the content backend, or any cairn ownership of the developer's domain data.
- A general non-`/admin` session helper (deferred, additive).
- Porting aksailingclub domain logic into the engine or the showcase.

## Open questions for the plans

- The exact home of the `App.Locals.editor` augmentation (`./ambient` vs a documented manual
  augmentation); verify against how consumers currently pick up cairn ambient types.
- Whether `CsrfField` is worth a component or stays a documented hidden input; decide from the guard's
  field-name contract.
- The snapshot-gate file format and location (reuse `reference-coverage.mjs` machinery vs a dedicated
  emitter).
