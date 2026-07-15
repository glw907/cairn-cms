# Admin Nav Layout (`navLayout`) Implementation Plan

> **For agentic workers:** execute task-by-task via `cairn-implementer` dispatches (serial,
> test-first, full gate per task) per the `cairn-pass` skill. Steps use checkbox (`- [ ]`)
> syntax for tracking. Tasks specify outcomes, interfaces, and acceptance criteria; the
> implementer chooses the code.

**Goal:** Ship the site-declared sidebar: an optional `navLayout` adapter member that arranges
the whole admin nav (engine and site screens mixed), one resolved-tree rendering path, the
organize-your-admin-nav guide, and the desk-route sidebar rider.

**Spec:** `docs/superpowers/specs/2026-07-14-admin-nav-layout-design.md` (ratified 2026-07-14).
Read it before any task. This plan binds its decisions; where the plan locks a call the spec
left open, the lock is marked **[plan-locked]**.

**Architecture:** A `navLayout` tree on `adapter.editor` validates at construction
(`defineRoles`-style throws) and resolves server-side into one arranged, filtered, serializable
nav payload for every site — the undeclared case synthesizes today's default arrangement through
the same resolver. `CairnAdminShell` renders the resolved tree and drops its hard-coded item
list. Desk routes gain a persistent sidebar at `xl`.

**Tech stack:** Svelte 5 runes, SvelteKit 2, DaisyUI 5 + Tailwind 4, Vitest (unit /
integration-in-workerd / browser component projects), Playwright e2e in `examples/showcase`.

## Global constraints

- Worktree `nav-layout` off `main`; `npm run package` before the first `npm test` (dist-dependent suites).
- Test-first per task; gate per task: targeted test green, `npm run check` 0 errors/0 warnings, `npm test` exit 0.
- TSDoc comments per `ts-conventions` / `svelte-conventions`; no em dash in comments (`check:comments`).
- No version bump, no publish in this pass; changelog under `## Unreleased`. The 0.86.0 cut is a separate `cairn-release` act after the close ritual.
- Undeclared `navLayout` must render today's sidebar bit-for-bit (the office visual baselines for a zero-config site must not move; the showcase declares a layout in T6 and its baselines regenerate deliberately there).
- Nav visibility is never authorization: every route's own guard is unchanged by this pass.

## Locked design calls (spec §2 plus plan locks)

1. **Node forms** (spec): engine ref `{ screen, label?, hidden?: true }`; site entry = today's
   `AdminNavEntry`; section `{ label, children, roles? }` admitting both child kinds; `roles?: Role[]`
   on site entries and sections. **[plan-locked]** `roles` does NOT go on engine refs; an engine ref
   inside a `roles`-gated section inherits the section's gate (covers ASC's case).
2. **[plan-locked]** `adminNav` and `navLayout` are mutually exclusive: declaring both throws at
   construction ("declare custom screens inside navLayout"). No silent precedence.
3. **Engine screen ids**: each declared concept's id plus `'media' | 'vocabulary' | 'nav' |
   'settings' | 'editors' | 'help'`. Type as the six-literal union `| (string & {})` so the fixed
   ids autocomplete while concept ids (dynamic) stay assignable; construction validation is the
   real gate.
4. **Engine defaults** (label, href, per-screen visibility gate):
   | screen | label | href | extra gate |
   |---|---|---|---|
   | `<concept.id>` | `concept.label` | `/admin/<id>` | — |
   | `media` | `Library` | `/admin/media` | — |
   | `vocabulary` | `Tags` | `/admin/vocabulary` | — |
   | `nav` | `runtime.navMenu.label` | `/admin/nav` | only when `navMenu` configured |
   | `settings` | `Settings` | `/admin/settings` | — |
   | `editors` | `Editors` | `/admin/editors` | `capability === 'owner'` |
   | `help` | `Help` | `/admin/help` | — |

   Every engine screen additionally requires `capability !== 'none'` (the 0.85.0 rule, now
   enforced in the resolver, not the component).
5. **Omission falls back; hiding is explicit** (spec): engine screens the declared tree never
   references land in `fallback`, in engine order (concepts by declaration order, then media,
   vocabulary, nav, settings, editors, help). `hidden: true` counts as referenced and renders
   nowhere. **[plan-locked]** The fallback group renders in today's Help foot slot (the
   `flex-none border-t` band between the scroll area and the account foot) — which makes the
   default layout's Help placement literally "the one unreferenced engine screen": exact parity
   falls out of the omission rule instead of a special case.
6. **Default synthesis** (undeclared `navLayout`, same resolver): one section labeled `Core`
   holding concepts → legacy `adminNav` flat entries → media → vocabulary → nav (when configured)
   → settings → editors, then each legacy `adminNav` section in declaration order; `help` is
   deliberately unreferenced, so it resolves to `fallback`. This reproduces today's render
   exactly, including the `Core` header and collapse keys.
7. **Filter composition, in order** (spec): resolve arrangement → engine capability gates (row 4)
   → `ownerOnly` on site entries → declarative `roles` (editor's role must be in the list) →
   the site's `navFilter`. A section emptied by filtering disappears (today's rule). One
   deliberate none-session delta: an empty `Core` header no longer renders for a none session
   (empty sections disappear uniformly); the re-pinned 0.85.0 tests assert the new render.
8. **Serialization**: resolved engine node `{ screen, label, href }` (the shell maps `screen` to
   its fixed Lucide icon client-side); resolved site node = today's `ResolvedNavEntry`
   (`iconName` maps through `ADMIN_NAV_ICONS`). Discriminate on the `screen` key.
9. **`navFilter` widens**: it now receives the arranged top-level nodes (sections and loose
   entries, engine nodes included) and returns the same array shape; `fallback` does not pass
   through it (engine-only, already gated; a site hides an engine door with `hidden: true`).
   ASC's label-based `filterClubNav` keeps working verbatim. Changelog carries the type note.
10. **Palette reflects the tree**: the command palette lists every visible item in the resolved
    layout (sections' children now included — today they are absent; deliberate, changelog-noted),
    plus its existing view-site and theme-toggle commands.
11. **Fixed chrome stays fixed** (spec): the account foot and the palette trigger are not layout
    nodes. Collapse state stays keyed by section label via the `cairn-admin-nav-collapsed` cookie.
12. **Desk rider** (spec §5): desk routes persist the sidebar at `xl` (1280px+), recede it behind
    the toggle in the `lg`–`xl` band, keep the overlay drawer below `lg`. Office routes unchanged
    (persistent at `lg`+). Zen mode unchanged.

## Validation throws (construction, `defineRoles`-style messages)

Unknown screen id; duplicate engine reference (hidden counts); `'nav'` referenced with no
`navMenu` configured; nested section; empty section (`children: []`); empty relabel
(`label: ''` or whitespace); a `roles` name outside the declared vocabulary; `adminNav` and
`navLayout` both declared. Site entries inside the tree keep the existing `adminNav` entry
validation (nine-icon allowlist, built-in href collision).

## File structure

- `src/lib/sveltekit/admin-nav.ts` — grows the `NavLayout` node types, `EngineScreenId`,
  validation, and the resolver (or split a sibling `admin-nav-layout.ts` if it crowds; the
  existing types and `normalizeAdminNav` stay for the legacy path and default synthesis).
- `src/lib/sveltekit/content-routes-core.ts` — `AdminShellData` reshape; `shellPayload` produces
  the resolved layout; `navFilter` application moves onto the arranged tree.
- `src/lib/components/CairnAdminShell.svelte` — renders the resolved tree; desk-rider classes.
- `src/lib/components/admin-nav-icons.ts` — gains the engine-screen icon map.
- `src/lib/components/cairn-admin.css` — the `xl:drawer-open` companion to the pinned
  `position: fixed` rule.
- Adapter types (wherever `editor.adminNav` is declared today; grep `adminNav` under
  `src/lib`) — gains `navLayout?: NavLayout`.
- Tests: `src/tests/unit/admin-nav.test.ts` (+ a new layout-resolution unit file),
  `src/tests/unit/cairn-admin-shell-load.test.ts`, `src/tests/integration/` (driven-request
  composition), `src/tests/component/CairnAdminShell.test.ts` + desk harness,
  `examples/showcase/e2e/` (arranged sidebar; width matrix).
- Docs: `docs/guides/organize-your-admin-nav.md` (new), `docs/reference/sveltekit.md`,
  `docs/reference/components.md`, `docs/guides/add-a-custom-admin-screen.md`,
  `docs/guides/give-a-role-its-own-admin-area.md`, `docs/guides/upgrade-cairn.md`,
  `docs/internal/admin-design-system.md`, `docs/internal/api-surface.md` (regen), `CHANGELOG.md`,
  `ROADMAP.md`.

---

### Task 1: `navLayout` types and construction validation

**Files:** `src/lib/sveltekit/admin-nav.ts` (or sibling), the adapter `editor` type, exports
wired through the package's public subpath (follow where `AdminNavEntry`/`AdminNavSection`
export today); test `src/tests/unit/admin-nav.test.ts` or a new
`src/tests/unit/nav-layout-validate.test.ts`.

**Interfaces (produces):**

```ts
export type EngineScreenId =
  | 'media' | 'vocabulary' | 'nav' | 'settings' | 'editors' | 'help'
  | (string & {});
export interface NavLayoutEngineRef { screen: EngineScreenId; label?: string; hidden?: true }
export interface NavLayoutEntry extends AdminNavEntry { roles?: Role[] }
export interface NavLayoutSection {
  label: string;
  children: (NavLayoutEntry | NavLayoutEngineRef)[];
  roles?: Role[];
}
export type NavLayout = (NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection)[];
export function validateNavLayout(layout: NavLayout, ctx: {
  conceptIds: string[];
  navMenuConfigured: boolean;
  roleNames: string[];        // Object.keys of the resolved vocabulary (DEFAULT_ROLES fallback)
  hasAdminNav: boolean;       // for the mutual-exclusivity throw
}): void;
```

The adapter's `editor` block gains `navLayout?: NavLayout`. `validateNavLayout` wires in beside
the existing `normalizeAdminNav` call site (grep for it; it runs during runtime/routes
construction) so a bad declaration throws at boot, not at request time.

**Requirements / acceptance:**

- Every throw in the "Validation throws" list above, each with a message naming the offending
  value in the `defineRoles` style (`navLayout: ...`), and each with a unit test.
- Site entries inside the tree reuse the existing entry validation (icon allowlist, href
  collision) — one test each proving the reuse.
- A valid tree (engine refs incl. a relabel and a `hidden`, a section with `roles`, a loose site
  entry) validates without throwing.
- `roles` names validate against the resolved vocabulary; with no `defineRoles`, against
  `DEFAULT_ROLES` (`owner`/`editor`).

**Steps:**

- [x] Write failing unit tests for every validation throw plus the valid-tree case
- [x] Implement types + `validateNavLayout`; wire the construction-time call and the adapter type
- [x] Full gate (`npm run check`, `npm test`), commit

### Task 2: layout resolution and filter composition

**Files:** same module as T1; test `src/tests/unit/nav-layout-resolve.test.ts` (new).

**Interfaces (produces, consumed by T3/T4):**

```ts
export interface ResolvedEngineNavEntry { screen: EngineScreenId; label: string; href: string }
export type ResolvedLayoutChild = ResolvedNavEntry | ResolvedEngineNavEntry;
export interface ResolvedLayoutSection { label: string; children: ResolvedLayoutChild[] }
export type ResolvedLayoutNode = ResolvedLayoutChild | ResolvedLayoutSection;
export interface ResolvedNavLayout {
  items: ResolvedLayoutNode[];      // the arranged scroll-area tree, in order
  fallback: ResolvedLayoutChild[];  // unreferenced engine screens, foot slot, engine order
}
export function resolveNavLayout(opts: {
  layout: NavLayout | undefined;
  adminNav: ResolvedNavItem[];               // normalized legacy entries, for default synthesis
  concepts: { id: string; label: string }[];
  navMenuLabel: string | null;
  capability: Capability;
  role: string;
}): ResolvedNavLayout;
```

(Internal split between a static arrange step and a per-request filter step is the implementer's
choice; the exported contract is the one function above.)

**Requirements / acceptance (each a test):**

- **Arrangement**: a declared tree renders in declared order, mixing engine refs, site entries,
  and sections; loose top-level nodes keep their position between sections.
- **Relabel**: `{ screen: 'settings', label: 'Site settings' }` yields that label; icon/href stay
  engine-owned (asserted via `screen`/`href`).
- **Omission fallback**: engine screens never referenced land in `fallback` in engine order
  (locked call 5); a fully-referencing tree yields `fallback: []`.
- **Hidden**: `hidden: true` removes the door and does NOT reappear in `fallback`.
- **Default synthesis**: `layout: undefined` reproduces locked call 6 exactly — assert the full
  resolved shape for a fixture with two concepts, one legacy flat entry, one legacy section,
  navMenu configured, owner capability: `items` = [`Core` section with the exact order] +
  the legacy section; `fallback` = [help].
- **Capability gates**: `none` capability strips every engine screen (wherever placed, incl.
  `fallback`) but keeps site entries; `editor` capability strips `editors`; `nav` absent from the
  default when `navMenuLabel` is null.
- **`ownerOnly`** on a site entry inside the tree: dropped for non-owner capability.
- **`roles`**: an entry with `roles: ['club-admin']` renders only when `role === 'club-admin'`
  (capability irrelevant); a section's `roles` gates all children; both compose with the
  capability gates (never widen: an engine ref in a roles-granted section still obeys row-4 gates).
- **Empty sections disappear** after filtering.

**Steps:**

- [x] Write the failing resolution tests (the full matrix above)
- [x] Implement `resolveNavLayout`
- [x] Full gate, commit

### Task 3: one payload path (`shellPayload` + `AdminShellData` reshape)

**Files:** `src/lib/sveltekit/content-routes-core.ts` (types ~62-91, `shellPayload` ~335-392);
`ContentRoutesDeps`/`CairnAdminDeps` `navFilter` types; tests
`src/tests/unit/cairn-admin-shell-load.test.ts`, new integration test under
`src/tests/integration/`; snapshot `docs/internal/api-surface.md`.

**Interfaces (produces, consumed by T4):**

```ts
// AdminShellData authed arm:
{
  public: false;
  siteName: string;
  user: { displayName: string; email: string; role: Role; capability: Capability };
  concepts: NavConcept[];      // STAYS: desk-route detection + pending-publish grouping
  nav: ResolvedNavLayout;      // REPLACES customNav, navLabel, canManageEditors-as-nav-signal
  pathname: string;
  theme: 'cairn-admin' | 'cairn-admin-dark';
  collapsedNav: string[];
  csrf: string;
  pendingEntries: Promise<{ concept: string; id: string }[] | null>;
}
// navFilter widens:
navFilter?: (items: ResolvedLayoutNode[], ctx: { editor: Editor; event: ContentEvent })
  => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>;
```

**Requirements / acceptance:**

- `shellPayload` calls `resolveNavLayout` (one path for declared and undeclared), then applies
  `deps.navFilter` (when configured) to `nav.items` only — after every built-in filter, per
  locked call 7. Await async filters fresh per request (today's rule).
- `customNav` and `navLabel` leave the payload. `canManageEditors` leaves IF grepping
  `src/lib` + `examples` finds no non-nav consumer; if one exists, it stays with a TSDoc note
  saying it is no longer a nav signal. `concepts` stays (its consumers are `isDeskRoute` and
  publish grouping, not nav arrangement).
- The none-session unit tests (0.85.0) re-pin against the new payload: a none session's `nav`
  carries no engine node anywhere (items or fallback); site-granted entries survive.
- **Integration test** (workerd, driven request, spec §7): an adapter with `defineRoles`
  (a `club-admin` editor-capability role), a `navLayout` whose section carries
  `roles: ['owner', 'club-admin']`, and a `navFilter` that drops a marker section — assert the
  composed result for an owner, a `club-admin`, a plain editor, and a none session.
- `npm run check:surface -- --update` regenerates `docs/internal/api-surface.md`; the diff shows
  exactly the intended reshape; commit it with the task.

**Steps:**

- [x] Re-pin the shell-load unit tests to the new payload shape (failing first)
- [x] Write the failing integration composition test
- [x] Reshape the types, `shellPayload`, and the `navFilter` seam
- [x] Regenerate the surface snapshot; full gate; commit

### Task 4: `CairnAdminShell` renders the resolved tree

**Files:** `src/lib/components/CairnAdminShell.svelte`,
`src/lib/components/admin-nav-icons.ts`; tests `src/tests/component/CairnAdminShell.test.ts`.

**Interfaces (consumes):** `data.nav: ResolvedNavLayout` from T3. **Produces:** an
`ENGINE_NAV_ICONS: Record<string, Component>` map in `admin-nav-icons.ts` (concept ids fall to
the FileText icon; media/vocabulary/nav/settings/editors/help to today's exact icons).

**Requirements / acceptance:**

- The hard-coded `coreItems` list and the standalone Help-foot block are deleted (the 0.85.0
  bug-class removal). The scroll area renders `nav.items` in order: a section node through the
  existing `navSection` snippet (collapse cookie keyed by label, unchanged); consecutive loose
  nodes batch into a plain `menu` list between sections. The foot band renders `nav.fallback`
  (same styling as today's Help foot; absent when empty).
- Icon resolution: `screen` nodes map through `ENGINE_NAV_ICONS`; site nodes through
  `ADMIN_NAV_ICONS` with the existing fallback.
- The palette derives from the resolved layout per locked call 10 (all visible items incl.
  section children and fallback), keeping view-site and theme-toggle.
- Component tests: (a) **zero-config parity** — an undeclared-layout payload renders exactly
  today's structure: `Core` header, item order concepts → custom flat → Library → Tags → nav →
  Settings → Editors, custom sections after, Help alone in the foot band (assert labels, hrefs,
  order, and the foot placement); (b) an arranged payload (sections first, relabeled Settings,
  a fallback group) renders in declared order with the divider foot; (c) none-session: no engine
  door anywhere, no empty `Core` header (the deliberate delta, locked call 7); (d) palette
  includes a section child.
- Office visual behavior is untouched (no class changes on the office path in this task).

**Steps:**

- [x] Write the failing component tests (parity, arranged, none, palette)
- [x] Rework the shell markup and palette derivation
- [x] Full gate, commit

### Task 5: desk routes persist the sidebar at `xl`

**Files:** `src/lib/components/CairnAdminShell.svelte` (drawer/margin classes, ~line 320-323),
`src/lib/components/cairn-admin.css` (~444-459), `docs/internal/admin-design-system.md`
(desk-chrome section, ~64-88); tests `src/tests/component/CairnAdminShell.test.ts` (+ desk
harness), `examples/showcase/e2e/` width matrix + visual baselines.

**Requirements / acceptance:**

- Office routes: unchanged (`lg:drawer-open` + `lg:ml-56`). Desk routes: `xl:drawer-open` +
  `xl:ml-56` (persist at 1280px+, receded toggle in the `lg`–`xl` band, overlay drawer below
  `lg`). Zen mode unchanged.
- **Verify the locked build assumption at first touch**: confirm the `xl:` variant of DaisyUI's
  `drawer-open` actually generates under Tailwind 4 in this build (grep the built CSS or render a
  probe). If it does not, replicate the behavior with an explicit rule in `cairn-admin.css` and
  record the finding in the task commit message.
- The pinned unlayered `position: fixed` rule gains an `xl\:drawer-open` companion (same
  `:where([data-theme...])` shape, same comment discipline) so the desk sidebar doesn't scroll-bleed.
- The drawer toggle button hides on desk routes at `xl`+ the same way it hides on office routes
  at `lg`+ (no dangling hamburger beside a persistent sidebar).
- Component tests assert the class wiring per route kind (extend the desk harness).
- Width-matrix e2e: the desk route (edit page) gains 1440 (sidebar present) and 768 (receded)
  coverage; edit-page visual baselines regenerate via the self-committing CI regen and get
  render-read at the close ritual (step recorded in the post-mortem).
- `docs/internal/admin-design-system.md`'s desk-chrome section is rewritten: the recede rule is
  now band-scoped (`lg`–`xl`), the persist-at-`xl` rule and its evidence base (spec §5) stated,
  zen mode still the full-focus escape. Keep the doc's voice and load-bearing-rules format.

**Steps:**

- [x] Verify the `xl:drawer-open` assumption; write the failing component tests
- [x] Implement classes + CSS companion; update the design-system doc
- [x] Add width-matrix coverage; full gate (baselines regenerate on CI); commit

### Task 6: showcase declares a layout; e2e proves the seam

**Files:** `examples/showcase/src/theme/cairn.config.ts` (editor block, ~417-431);
`examples/showcase/e2e/` (new or extended spec); showcase visual baselines (CI regen).

**Requirements / acceptance:**

- The showcase declares a small, meaningful `navLayout` exercising the seam's visible devices,
  e.g.: a `Content` section (posts, pages, the Signups entry), a trailing `Site` section (media,
  vocabulary, `{ screen: 'settings', label: 'Site settings' }`, editors); `help` left
  unreferenced (fallback foot). Keep it tasteful per the guide's own principles — it doubles as
  the template's exemplar.
- e2e asserts the arranged sidebar (section headers, order, the relabel, the fallback Help) —
  a real end-to-end proof the engine consumed the declaration (guards against a
  silently-ignored `navLayout`).
- Showcase admin visual baselines regenerate deliberately (CI self-committing regen); the
  render-read happens at the close ritual. **Note:** this is the plan's resolution of the spec's
  §2 unchanged-baselines line vs its §7 showcase-layout line — zero-config parity is pinned at
  unit (T2) and component (T4) level instead, where "bit-for-bit" is markup-exact.
- The showcase build and full e2e stay green (`npm --prefix examples/showcase run test:e2e`
  locally; the authoritative from-scratch run is CI at the close).

**Steps:**

- [x] Declare the layout; write the failing e2e assertions
- [x] Run the showcase e2e; regenerate baselines
- [x] Full gate, commit

### Task 7: docs window

**Files:** `docs/guides/organize-your-admin-nav.md` (new), `docs/reference/sveltekit.md`,
`docs/reference/components.md`, `docs/guides/add-a-custom-admin-screen.md`,
`docs/guides/give-a-role-its-own-admin-area.md`, `docs/guides/README.md`,
`docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, `ROADMAP.md`,
`docs/internal/docs-friction-log.md`.

**Requirements / acceptance:**

- **The new guide** (Google style, Vale-clean): the spec §4 principles — organize by what your
  editors do, not where code lives; the primary audience's section leads; routine screens before
  configuration; settings and roster sink to a trailing group; relabel colliding names; ~seven
  items is the section-header threshold. Worked example ASC-shaped: Club first
  (`roles: ['owner', 'club-admin']`), Content second, trailing Site group (Library, Tags,
  relabeled Site settings, Editors). Show the omission-fallback and `hidden: true` semantics and
  say plainly that nav is not authorization.
- **Reference**: `sveltekit.md` — the `AdminShellData` row rewritten to the T3 shape; the
  `navFilter` rows (`ContentRoutesDeps`, `CairnAdminDeps`) rewritten for the widened input; new
  rows/anchors for `NavLayout` node types, `ResolvedNavLayout`, `EngineScreenId`, and
  `resolveNavLayout`/`validateNavLayout` as exported. `components.md` — `CairnAdminShell`'s
  sidebar contract updated (resolved tree, fallback foot, desk `xl` persist).
- **Drift hunt**: `grep -rn` `docs/` + `README.md` for `customNav`, `navLabel`,
  `canManageEditors` (if removed) and every stale claim that engine nav is fixed or that
  `navFilter` sees only custom items (e.g. `sveltekit.md:384` and the `ContentRoutesDeps` prose);
  repoint every hit. Cross-link the new guide from `add-a-custom-admin-screen.md` and
  `give-a-role-its-own-admin-area.md`.
- **CHANGELOG** (`## Unreleased`): the `navLayout` seam, the one-path shell payload, the desk
  rider, palette-includes-section-children. `Consumers must:` lines for (a) the `AdminShellData`
  reshape (any consumer reading the payload type), (b) the widened `navFilter` input type.
  Matching entry in `upgrade-cairn.md`.
- **ROADMAP prune**: the "Editor-first admin nav organization" Next entry (line ~171) is shipped
  by this pass — remove it (point shipped history at STATUS/post-mortem). File the spec §6
  nine-icon-allowlist candidate as its own entry if not already present.
- Friction log: one entry per finding the writing surfaces.
- Gates: `check:reference`, `check:reference:signatures`, `check:docs`, `check:package`,
  `check:snippets` all green.

**Steps:**

- [ ] Draft the guide + reference updates; run the drift hunt
- [ ] CHANGELOG + upgrade guide + ROADMAP prune + friction log
- [ ] All doc gates green; commit

### Task 8: close ritual (main loop, not dispatched)

Per `cairn-pass`: code-simplifier over the pass delta; `npm run check` 0/0 + `npm test` exit 0 +
`check:comments` + all four doc gates + `check:surface` by name; from-scratch consumer build or
CI e2e; reviewer fan-out (svelte-reviewer, daisyui-a11y-reviewer, web-auth-security-reviewer for
the capability-filter composition); live admin smoke (touches `/admin`); render-read of every
regenerated baseline; post-mortem appended here; STATUS updated on `main`; merge. The 0.86.0 cut
follows via `cairn-release` (verify the number free at cut time).

## Self-review notes

- Spec coverage: §2 contract → T1/T2; §3 one path → T3/T4; §4 guidance → T7; §5 rider → T5; §6
  out-of-scope honored (no disabled state, no per-role trees, no allowlist widening — filed in
  T7's ROADMAP step); §7 testing shape → T2 (unit), T3 (integration), T4 (component), T6 (e2e);
  §8 versioning → global constraints + T8.
- The §2 bit-for-bit baselines line vs §7 showcase layout collision is resolved in T6 (flagged
  to Geoff at plan review).
- Type names are consistent across tasks (`NavLayout`, `ResolvedNavLayout`,
  `ResolvedLayoutNode`, `ResolvedEngineNavEntry`, `resolveNavLayout`, `validateNavLayout`).
