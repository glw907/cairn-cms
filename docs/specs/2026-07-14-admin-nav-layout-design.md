# Admin nav layout: the site-declared sidebar (design)

Ratified in brainstorm 2026-07-14 (same session as the extensible-roles close). Grounding
inputs: the nav-organization research
(`docs/internal/2026-07-14-admin-nav-organization-research.md`), ASC's real declaration
(`aksailingclub-org/src/theme/cairn.config.ts`, the 11-item Club section and its
`filterClubNav`), and the shipped 0.85.0 roles model. Geoff's framing: the question is not
which grouping principle the engine picks, but whether the site contract lets the developer
arrange the whole sidebar, mixing engine and site screens — plus starting guidance so each
developer does not make a random mess.

## 1. The problem

The sidebar groups by provenance: the engine's screens in one fixed core group, the site's
custom sections after. The engine controls order, grouping, and labels of its own items; the
site cannot put its primary section first, sink Settings, or resolve a label collision (ASC
has engine "Settings" and a club settings screen in the same sidebar). At ASC's scale — one
Club section with eleven screens, more coming, three roles seeing three different subsets —
the provenance shape stops serving the people who use it. Research: at engine scale (six
items) the current shape costs nothing; the cost appears exactly when a site grows several
heterogeneous custom screens.

## 2. The contract: `navLayout`

The adapter gains one optional member, `navLayout`, an ordered tree that IS the sidebar when
declared. Undeclared, today's sidebar renders unchanged (bit-for-bit; the existing visual
baselines must not move).

Node forms, all data-only:

- **Engine reference:** `{ screen: <EngineScreenId>, label?: string, hidden?: true }`.
  `EngineScreenId` is each declared concept's id plus `'media' | 'vocabulary' | 'nav' |
  'settings' | 'editors' | 'help'`. `label` relabels the item (ASC: `{ screen: 'settings',
  label: 'Site settings' }`); the icon stays engine-owned. `hidden: true` removes the nav
  door deliberately (the route stays live; this is nav, not authorization).
- **Site entry:** today's `AdminNavEntry` shape, unchanged.
- **Section:** `{ label, children: (entry | engine reference)[], roles?: Role[] }` — the
  existing `AdminNavSection` widened to admit engine references as children. No nested
  sections (as today).
- **Declarative role visibility:** entries and sections gain `roles?: Role[]`, typed against
  the site's declared vocabulary (the Register-narrowed `Role`). The item renders only when
  `locals.editor.role` is in the list. This replaces the common imperative case: ASC's whole
  `filterClubNav` becomes `roles: ['owner', 'club-admin']` on the Club section. The
  per-request `navFilter` dep stays for genuinely dynamic grants (per-class instructors).

Semantics:

- **Omission falls back; hiding is explicit.** Engine screens the tree never references
  render as a trailing group after a divider, in today's engine order. So an engine update
  that ships a new screen surfaces on layout-declaring sites instead of vanishing, and the
  greppable `hidden: true` is the only way a door disappears on purpose.
- **Filter composition, in order:** resolve the layout → engine capability filter (a none
  session sees no engine screens wherever they were placed) → `ownerOnly` → the declarative
  `roles` filter → the site's `navFilter`. Placement never widens access; every existing
  gate applies to the arranged tree.
- **Hidden, never greyed.** Cairn's truthful-visibility principle holds: an item the person
  cannot use is absent. The field shape leaves room for a future additive
  `visibility: 'disabled'` value if a real consumer makes the case (ruled OUT for this
  window, Geoff 2026-07-14); a site wanting "see it, can't touch it" grants the screen to
  the role and limits actions inside it (ASC's club-settings pattern).
- **Fixed chrome stays fixed.** The account foot (identity, sign-out, theme) and the
  command palette are not layout nodes; the palette reflects the arranged, filtered tree.

Validation at construction, `defineRoles`-style throws: unknown screen id; duplicate engine
reference; `'nav'` referenced with no `navMenu` configured; nested section; empty section;
empty relabel; a `roles` name outside the declared vocabulary.

## 3. One rendering path

The shell payload carries one resolved, arranged, filtered nav tree, produced server-side
for every site — the undeclared case resolves the default layout through the same code. The
`AdminShellData` fields that today split the nav (`concepts`, `customNav`, `canManageEditors`
as a nav signal, `navLabel`) collapse into the resolved tree; `CairnAdminShell` renders the
tree and drops its hard-coded item list (the residue that caused the 0.85.0 none-nav leak —
this design removes that class of bug). This reshapes the exported `AdminShellData` type:
the changelog carries a `Consumers must:` note for any consumer reading the payload type
directly, though no known consumer does.

## 4. Guidance: cairn ships the opinion, not just the mechanism

- **The engine default stays as-is.** Six items in one group needs no headers; regrouping it
  would repaint every existing admin in a release that otherwise changes nothing for them.
- **A new guide, "Organize your admin nav,"** carries the principles (from the research):
  organize by what your editors do, not where code lives; the primary audience's section
  leads; routine screens before configuration; settings and roster sink to a trailing
  group; relabel colliding names; roughly seven items is the threshold for adding a section
  header. The worked example is ASC-shaped: Club first (role-gated), Content second, a
  trailing Site group (Library, Tags, relabeled Site settings, Editors).
- **Validation enforces structure; the guide shapes taste.** No aesthetic linting.

## 5. Rider: desk routes persist the sidebar at full desktop width

Today desk routes (the edit page) render with the sidebar receded at every width — a
deliberate desk-chrome decision this design revises on grounded research (2026-07-14).
The evidence: every content-management comparable persists nav through editing (Payload's
sidebar is "open by default"; Sanity's panes, Craft's CP nav, Contentful's entry sidebar,
Notion's sidebar all stand), and NN/g's zen-mode writeup argues hidden-by-default chrome
taxes infrequent, non-technical users hardest — exactly cairn's editors. The one
counterexample, WordPress's fullscreen-by-default editor (5.4, shipped over its
accessibility team's formal objection), hides site-wide chrome around a single-column
editor, a different reference class. The counter-argument that survives is width economics:
the edit page's two panes are the layout most starved for horizontal room.

The rule, matching that evidence: desk routes persist the sidebar at `xl` (1280px and up),
recede it behind the drawer toggle in the tablet band (`lg` to `xl`, 1024 to 1279px), and
keep the overlay drawer below `lg` as today. Office routes are unchanged (persistent at
`lg` and up). Zen mode stays the deliberate full-focus escape. Consequences owned by the
pass: the edit-page visual baselines regenerate, the width-matrix check covers the desk
route at 1440 (sidebar present) and 768 (receded), and
`docs/internal/admin-design-system.md`'s desk-chrome section is rewritten to match (the
recede is currently stated there as a load-bearing rule).

## 6. Out of scope (ruled)

Greyed/disabled nav items (future additive value at most). Per-role layout trees (one tree
plus the existing filters covers every ASC persona). Editor-side nav personalization
(Statamic-style preferences — this is a site contract, not a user setting). Settings-screen
composition (arrange-and-relabel is the ruled fix for the duplicate-settings confusion).
Widening the nine-icon allowlist (ASC's declaration comments show real saturation; filed as
its own candidate, not folded in here).

## 7. Testing shape

Unit: layout resolution (arrangement, relabel, omission fallback, hidden, every validation
throw). Component: the shell renders an arranged tree; zero-config parity is pinned by the
existing suite and the unchanged visual baselines; the none-session case re-pins the 0.85.0
tests against the new single path. Integration: `roles` visibility composed with capability
filtering and `navFilter` on a driven request. The showcase gains a small declared layout so
the e2e exercises the seam end to end.

## 8. Versioning and sequencing

A new public surface: a minor, `0.86.0` at the cut. ASC is the first consumer and its
session wants roles + layout in one bump, so the cut likely follows the pass immediately.
The pass runs the standard cairn-pass shape on a worktree off `main`.
