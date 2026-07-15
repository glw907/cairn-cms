# Admin Reorganization Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repo the executor is `cairn-implementer` per task, per `cairn-pass`.

**Goal:** Ship the flat zero-config sidebar default and the evidence-grounded guide upgrade per the
ratified spec (`docs/superpowers/specs/2026-07-14-admin-reorganization-design.md`), plus one audit
rider: zen recedes the sidebar.

**Architecture:** A synthesis-only change in `resolveNavLayout` (the default arrangement emits loose
top-level nodes instead of one `Core` section; the renderer already handles loose nodes), a
one-condition chrome change in `CairnAdminShell` (the zen flag also drops the persistent-sidebar
classes), and a docs window (guide, design-system record, components reference, changelog).

**Tech Stack:** Svelte 5 runes, SvelteKit 2, vitest (unit + browser component), Playwright e2e on
`examples/showcase`.

## Global Constraints

- Worktree `admin-reorg` off `main`; one executor at a time (verify none live before dispatch).
- Test-first per task; full gate per task: targeted test, then `npm run check` (0 errors, 0
  warnings) and `npm test` (exit 0).
- No `package.json` version bump; the window accumulates under `## Unreleased` (patch-sized: a
  behavior change, no new public surface).
- Comments follow TSDoc via the ts-/svelte-conventions skills; no em dash in comments
  (linter-enforced). Guide prose follows the Google developer-docs standard (Vale-checked).
- The showcase's DECLARED `navLayout` is untouched; no showcase admin visual baseline should change.
  The zero-config contract pins at unit + component level (the nav-layout pass's ruling, which this
  pass moves deliberately).

## Plan-locked calls (Geoff's cheap veto at plan review)

1. **Zen recedes the sidebar at every width** (audit finding 6). The charter's anchor argues a
   full-focus escape drops everything; zen is an explicit, reversible editor choice, so the
   hidden-nav evidence against default-hidden chrome does not apply. The breadcrumb exit returns
   when zen exits; the zen chip's Exit control and save state remain the never-vanish pair.
2. **Audit finding 4's sidebar-simplification slices (the foot stack, the active-state triple
   signal, icon dedup) route to the design-refinement arc, not this pass.** Each is a taste call
   (foot, active state) or infeasible as a mechanical rider (concepts share one default glyph by
   design; the engine cannot know which concept is "Pages"). ROADMAP's reorganization entry is
   corrected accordingly in Task 6.
3. **The same-label `Core` collision re-pins to its new meaning.** With no synthesized `Core`
   group, a site section literally named "Core" no longer collides; the guard test keeps the
   no-throw contract with the new expected shape (one declared section, loose defaults beside it).

---

### Task 1: The flat default synthesis

**Files:**
- Modify: `src/lib/sveltekit/admin-nav.ts:521-554` (`resolveDefaultLayout` and its doc comment)
- Test: `src/tests/unit/nav-layout-resolve.test.ts` (default-synthesis fixtures, ~line 107)
- Test: `src/tests/unit/cairn-admin-shell-load.test.ts:96` (shell load finds `Core`)
- Test: `src/tests/unit/content-routes-layout.test.ts:135,395,403` (`Core`-shaped fixtures in the
  navFilter/layout tests)
- Test: `src/tests/unit/content-routes-list.test.ts:110` (`collapsedNav` cookie carrying `Core`)

**Interfaces:**
- Consumes: the existing `ResolvedNavLayout` shape (`items: ResolvedLayoutNode[]`, `fallback`).
- Produces: `resolveDefaultLayout` emits the same children as today (concepts, legacy flat
  `adminNav` entries, then `media`, `vocabulary`, `nav`, `settings`, `editors`, each still gated by
  `engineVisible`) as LOOSE top-level nodes in `items`, followed by legacy `adminNav` sections in
  declaration order. `help` still resolves into `fallback`. No `Core` section object exists
  anywhere in the default synthesis.

**Requirements:**
- Item order is exactly today's order minus the section wrapper; the empty-`Core` special case
  disappears with the wrapper (a none-capability session simply contributes no loose engine nodes).
- Rewrite the `resolveDefaultLayout` doc comment: it currently narrates the `Core` wrapper and
  "reproduces today's render exactly"; it must now state the flat default and its evidence base in
  one or two sentences (the spec's §1: section headers below the mid-teens carry a measured
  category-decision cost with nothing to pay it back).
- The `cairn-admin-nav-collapsed` cookie's `Core` key goes inert with no code change; the
  content-routes-list test re-pins to whatever the fixture's remaining declared-section labels are.

**Steps:**

- [x] **Step 1:** Re-pin the default-synthesis unit fixtures in `nav-layout-resolve.test.ts` to the
  flat shape (loose engine/legacy-flat nodes, then legacy sections; no `Core`). Add one new case if
  none exists: a none-capability session with one site entry yields that entry as a loose node, no
  section. Run `npx vitest run src/tests/unit/nav-layout-resolve.test.ts`; expect the re-pinned
  cases to FAIL against the current synthesis.
- [x] **Step 2:** Change `resolveDefaultLayout` to emit the loose shape; update its doc comment.
  Run the same file; expect PASS.
- [x] **Step 3:** Re-pin the three sibling unit files (`cairn-admin-shell-load`,
  `content-routes-layout`, `content-routes-list`) to the flat shape. Run each; expect PASS.
- [x] **Step 4:** `npm run check` (0/0) and `npm test` (exit 0).
- [x] **Step 5:** Commit: `feat(admin-nav): flat zero-config sidebar default (drop the Core section)`.

### Task 2: Component parity re-pins

**Files:**
- Test: `src/tests/component/CairnAdminShell.test.ts` (the `Core` assertions at ~124, ~411, the
  custom-section-beside-Core test at ~479, the same-label collision test at ~491, the zero-config
  parity test at ~529, the none-session tests at ~607-644)

**Interfaces:**
- Consumes: Task 1's flat `ResolvedNavLayout`.
- Produces: the re-pinned zero-config component contract (the bit-for-bit render pin the spec
  moves on purpose).

**Requirements:**
- The zero-config parity test (~529) re-pins: loose items render as a plain list, `details`
  section count drops to zero for a section-free default, Help stays in the divider-set foot.
- The none-session test (~607) re-pins from "no empty Core header" to "no engine doors and no
  section chrome at all"; the site-entry none-session test (~622) re-pins the entry as a loose
  node.
- The same-label collision test (~491) re-pins per plan-locked call 3.
- The custom-section test (~479) re-pins: the declared section renders as the ONLY collapsible
  group, beside loose defaults.

**Steps:**

- [x] **Step 1:** Re-pin the assertions. Run
  `npx vitest run src/tests/component/CairnAdminShell.test.ts`; expect PASS against Task 1's
  synthesis (these tests re-pin, they do not drive new engine behavior).
- [x] **Step 2:** `npm run check` and `npm test`; expect 0/0 and exit 0.
- [x] **Step 3:** Commit: `test(admin-shell): re-pin the zero-config parity contract to the flat default`.

### Task 3: Zen recedes the sidebar (audit rider, plan-locked call 1)

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte:359-367` (the `lg:drawer-open` /
  `xl:drawer-open` and `lg:ml-56` / `xl:ml-56` class conditions gain `&& !topbar.zen`), plus the
  drawer-toggle visibility at ~383 if it would dangle, and the recede comment at ~346-350.
- Test: `src/tests/component/CairnAdminShell.test.ts` (desk harness,
  `_CairnAdminShellDeskHarness.svelte` if the zen flag needs plumbing there)
- Test: `examples/showcase/e2e/golden-path.spec.ts:300-330` (the zen round trip gains a sidebar
  assertion)

**Interfaces:**
- Consumes: the existing `topbar.zen` holder flag (`TopbarHolder`, registered by `EditPage`).
- Produces: under zen, no persistent-sidebar class is active at any width; on zen exit the
  route-kind breakpoint classes return unchanged.

**Requirements:**
- Zen already drops the whole topbar through `{#if !topbar.zen}`; the sidebar joins it. The
  overlay drawer (checkbox + Cmd/Ctrl+B) must still work under zen so an editor is never trapped;
  Escape's exit order (details panel, then zen) is unchanged.
- The zen chip stays the never-vanish pair (save state, Exit). No baseline regenerates (no zen
  visual baseline exists); the e2e round trip is the behavioral pin.
- The design-system doc's zen recipe line ("a footer toggle fades the chrome to leave the
  manuscript alone") updates in Task 5, not here.

**Steps:**

- [x] **Step 1:** Add the component test: with the desk harness in zen, the wrapper carries
  neither `lg:drawer-open` nor `xl:drawer-open` (and neither `ml-56` class); exiting zen restores
  the desk pair. Run it; expect FAIL.
- [x] **Step 2:** Apply the class-condition change; run the component file; expect PASS.
- [x] **Step 3:** Extend the e2e zen round trip: after entering zen at the desktop project width,
  assert the persistent sidebar is gone (the drawer-side element hidden or the drawer-open class
  absent); after Escape, assert it returns. Run the golden-path spec locally in CI mode; expect
  PASS.
- [x] **Step 4:** `npm run check` and `npm test`; 0/0 and exit 0.
- [x] **Step 5:** Commit: `feat(admin-shell): zen recedes the persistent sidebar (audit finding 6)`.

### Task 4: The guide upgrade

**Files:**
- Modify: `docs/guides/organize-your-admin-nav.md`

**Interfaces:**
- Consumes: the spec §3 content list; the research docs
  (`docs/internal/2026-07-14-admin-nav-organization-research.md`, `-evidence-research.md`,
  `-comparables-refresh.md`) as the evidence trail.
- Produces: the shipped guide carrying the seven §3 rulings.

**Requirements (each is a §3 bullet, verbatim scope):**
- Nouns, not verbs, stated as a ruling with its grounding.
- Flat until it hurts: no section headers below roughly 8-10 items, stated honestly as
  practitioner convergence plus the measured decision cost, not a studied number.
- Group by editor workflow when you do group.
- Content first; settings, roster, and help sink last.
- Stable arrangement: one tree plus `roles` filters; never rearrange per role beyond subtraction.
- Don't over-hide: `hidden: true` retires a door; the palette is an escape valve, never a
  substitute for visible nav (the hidden-nav study earns one sentence).
- Scale tiers: default scale (≤ ~8 items) flat; one real domain section leads and engine screens
  trail; ASC scale (15+, several roles) gets the full arrangement treatment.
- The guide's zero-config description updates to the flat default. External citations sparing
  (Google style); the internal research docs hold the trail.

**Steps:**

- [x] **Step 1:** Write the upgraded guide. Run `npm run check:docs` and `npm run check:snippets`;
  expect OK.
- [x] **Step 2:** Vale clean on the guide (the vale-hook surfaces findings on save; resolve them).
- [x] **Step 3:** Commit: `docs(guides): evidence-grounded organize-your-admin-nav upgrade`.

### Task 5: The docs window (design-system record, reference, changelog)

**Files:**
- Modify: `docs/internal/admin-design-system.md` (the nav/collapsible-group recipes and the zen
  recipe line)
- Modify: `docs/reference/components.md` (or wherever `check:reference` maps `CairnAdminShell`'s
  nav rendering; verify with `npm run check:reference` before editing)
- Modify: `CHANGELOG.md` (a fresh `## Unreleased` above `## 0.86.0`)

**Requirements:**
- The design-system doc records the flat default and its evidence base in the nav recipe (the
  collapsible group becomes the site-declared-sections recipe), and the zen recipe line adds "and
  the persistent sidebar" to what recedes.
- The components reference's shell/nav section describes the flat zero-config render.
- Changelog: one `### Changed` behavior entry (flat default, evidence one-liner, no new surface),
  one caveat line (a `navFilter` matching the literal `Core` section label sees loose items
  instead; no known consumer does), and one zen line (zen now recedes the sidebar too). No
  `Consumers must:` lines.

**Steps:**

- [x] **Step 1:** Apply the three edits. Run `npm run check:docs`, `npm run check:reference`,
  `npm run check:reference:signatures`; expect OK.
- [x] **Step 2:** Commit: `docs(admin): record the flat default and the zen recede in the design system, reference, changelog`.

### Task 6: Showcase-layout review and ROADMAP close

**Files:**
- Review (modify only if contradicted): `examples/showcase`'s adapter `navLayout` declaration
  (locate via `grep -rn "navLayout" examples/showcase/src`)
- Modify: `ROADMAP.md` (the Next reorganization entry closes; the finding-4 rider line corrects to
  ARC routing per plan-locked call 2)

**Requirements:**
- Judge the showcase's declared layout against the final guide tiers (spec §4): it is the
  exemplar, so it must practice the guide's advice. Keep it unless it contradicts a tier; record
  the verdict in the task's commit message either way. If it changes, the admin visual baselines
  regenerate on CI (self-committing regen) and get render-read at close; if not, assert no
  baseline drift.
- ROADMAP: delete the reorganization entry from Next (shipped history lives in STATUS and the
  post-mortem); correct the audit-rider sentence on the way out.

**Steps:**

- [x] **Step 1:** Review the showcase layout against the guide tiers; apply or record no-change.
- [x] **Step 2:** Update ROADMAP.
- [x] **Step 3:** `npm run check` and `npm test`; 0/0 and exit 0. Commit:
  `docs(roadmap): close the admin reorganization entry (verdict on the showcase exemplar in-message)`.

### Task 7: Close ritual (cairn-pass)

**Steps:**

- [ ] **Step 1:** Dispatch the `code-simplifier` agent over the pass's diff; review and apply.
- [ ] **Step 2:** The full gate by name, each bare exit code read: `npm run check` (0 errors, 0
  warnings), `npm test` (exit 0), `check:surface`, `check:reference`, `check:reference:signatures`,
  `check:docs`, `check:snippets`, `check:package`, `check:consumers`, `check:prose`,
  `check:comments`.
- [ ] **Step 3:** Consumer proof: the showcase builds (`npm run package`, then the showcase build)
  and the CI e2e runs green on the branch; confirm the baseline-regen job reports no changes
  (unless Task 6 changed the exemplar, in which case render-read the regenerated PNGs in the main
  loop before merge).
- [ ] **Step 4:** Reviewer gate: fan out `svelte-reviewer` and `daisyui-a11y-reviewer` over the
  diff (no auth or Workers surface changed; add `web-auth-security-reviewer` only if the diff
  grew one). Triage findings in the main loop; fold real ones.
- [ ] **Step 5:** Post-mortem into this plan file; STATUS's next-action entry rolls to the
  PAPERCUTS pass; merge `admin-reorg` to `main` (no version bump, window holds under
  `## Unreleased`); prune the worktree.

## Self-review

Spec coverage: §2 flat default → Tasks 1-2 (synthesis + both re-pin tiers, cookie inertness,
consequence bullets); §2 changelog caveat → Task 5; §3 guide → Task 4 (all seven bullets); §4
showcase review + design-system + reference riders → Tasks 5-6; §5 out-of-scope honored (no
verb relabeling, no per-role trees, no auto-grouping, no greyed items, no collapsed-by-default,
no ASC arrangement); §6 testing shape → unit (T1), component (T2), visual resolved as
no-baseline-drift with the T6 conditional (the suite has no zero-config visual baseline; the
component parity test is that pin, consistent with the nav-layout pass's ruling); §7 sequencing
honored (after 0.86.0, patch-sized, numbered at a future cut). Audit riders: finding 6 → Task 3;
finding 4 → routed to the ARC (plan-locked call 2). Types: `ResolvedNavLayout`/`ResolvedLayoutNode`
names match `admin-nav.ts` as surveyed.
