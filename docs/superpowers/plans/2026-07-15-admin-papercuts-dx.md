# Admin Papercuts + DX Pass Implementation Plan

> **For agentic workers:** Execute per the `cairn-pass` skill: one `cairn-implementer` dispatch
> per task, test-first, full gate per task; the main loop reviews each diff. Task 9 is the one
> exception (a single end-to-end `model: opus` dispatch on its own worktree). Checkboxes track
> completion.

**Goal:** Clear the mechanical PAPERCUTS bucket from the 2026-07-15 admin UX audit plus the ASC
initiative-5 DX items, with no design rulings — composition redesign belongs to the
design-refinement arc, not this pass.

**Architecture:** Two independent clusters. The UI cluster (Tasks 1–8) runs serially on the
`admin-papercuts` worktree (the tasks share `EditPage.svelte` and `CairnAdminShell.svelte`),
Fable-conducted with per-diff review and render reads. The DX cluster (Task 9) runs in parallel
as one Opus dispatch on its own `papercuts-dx` worktree (disjoint files: packaging, doctor,
guides), reviewed once at its merge boundary and merged into the pass branch before close.

**Tech Stack:** Svelte 5 runes, DaisyUI 5 / Tailwind 4, Vitest browser component tests
(Playwright chromium), the cairn doctor check idiom.

## Global Constraints

- Read `docs/internal/admin-design-system.md` before touching any admin component or
  `cairn-admin.css`; `data-theme` goes on a bare wrapper, scoped overrides in `@layer components`.
- Scope boundary: mechanical fixes only. Anything that turns into a design ruling (a new
  composition idea, a color-system change) stops and gets flagged, not built — the ARC owns those.
- Gate per task: the task's targeted tests green, `npm run check` 0 errors 0 warnings,
  `npm test` exit 0. Component screenshot baselines a task invalidates are regenerated in that
  task and named in its report.
- No task edits `CHANGELOG.md`, `ROADMAP.md`, or `docs/STATUS.md` — the close ritual (Task 10)
  writes those once. (Task 9 excepted for guides under `docs/guides/` only.)
- No version bump, no publish; the pass holds unpublished under `## Unreleased`.
- Editor-facing copy follows the calibrated voice: professional, restrained, slightly academic.
  All new or changed strings are reviewed by the conductor at the diff.
- Comments follow TSDoc + the em-dash ban (`npm run check:comments` covers `src/lib`).
- DaisyUI 5 idiom (no removed v4 form classes); Svelte 5 runes only.

---

### Task 1: Desk-band collisions at 320/390 (audit finding 2)

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (desk snippet, ~1311–1454)
- Modify (if needed): `src/lib/components/cairn-admin.css`
- Test: `src/tests/component/EditPage.test.ts`

Two confirmed rendering defects at phone widths, post-hydration: the theme toggle overlaps the
Save/Publish buttons (astride Publish at 320, crowding Save at 390), and a small square glyph
renders over the word "Published" in the status badge ("Publ□hed") at every phone width — the
save-state indicator (~1326–1333) is the first suspect for the glyph.

- [ ] Reproduce first: a browser component test at 320 and 390 viewports asserting, via bounding
  boxes, that no two desk-band controls overlap and the status badge text is unobstructed. It
  must fail on the current code (capturing the defect), or the task stops and reports what the
  live DOM actually shows.
- [ ] Fix by composing the band for narrow widths, not shrinking it: non-primary controls (the
  theme toggle at minimum) may fold into the existing More-actions menu below a width cutoff;
  Save and Publish stay directly visible at every width. No control may clip or overlap at
  320/390/768.
- [ ] Regenerate affected `EditPage` screenshot baselines; list them in the report.

**Acceptance:** the new bounding-box test green at 320/390/768; full gate; the conductor
render-reads the regenerated baselines.

### Task 2: Editor footer overflow at 320/390 (audit finding 1, mechanical slice)

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (footer, ~1835–1927)
- Test: `src/tests/component/EditPage.test.ts`

At 320/390 the footer truncates "Markup" to "Marku", wraps "Focus mode" to two lines, clips
"Typewriter" (dropped entirely at 320), and pushes the Markdown help link off-frame.

- [ ] Failing test first: at 320 and 390, every rendered footer control is fully visible (no
  mid-word truncation, no clipped toggle) and the Markdown help link is present and clickable.
- [ ] Fix by deliberate narrow composition: define what the footer shows at phone widths (wrap
  into intentional rows, or collapse lower-value toggles behind a single overflow control) rather
  than letting flex squeeze it. The Markdown help link must stay reachable at 320 — it is the
  affordance an icon-confused phone writer needs. Renaming footer jargon is Task 7, not here.
- [ ] Regenerate affected baselines; list them.

**Acceptance:** new tests green at 320/390; full gate; conductor render-read.

### Task 3: Office composition at the extremes (audit finding 8)

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Modify: `src/lib/components/cairn-admin.css` (or the shell content wrapper in
  `CairnAdminShell.svelte` if a shared office container is the cleaner seam)
- Test: `src/tests/component/ConceptList.test.ts`

- [ ] Wide: cap the office content column. The desk already caps its manuscript (~49rem); office
  screens are denser, so cap the office content area at a readable width (suggest `max-w-5xl`,
  centered; the conductor ratifies the value at diff review against a 2560 render). The cap must
  apply to all office screens (posts, media, editors, settings, help), so prefer the shared
  container over per-screen edits.
- [ ] Narrow (320): recompose the list row — the title column gets the freed width (today it
  starves at 7–10 characters while status and delete keep desktop width); compact the status
  pill; keep the delete column at its `w-12`. Fix the topbar search collapse (today an icon plus
  a stray "S") and keep the "Pending edits" filter chip on one line inside its segmented group.
- [ ] Tests: component tests at 320 and 2560 pinning the cap, the one-line chip, and a
  title-column minimum share; regenerate affected baselines.

**Acceptance:** tests green; full gate; conductor render-reads 320 and 2560 renders.

### Task 4: Palette inset and focus style at 390 (audit finding 8, palette slice)

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte` (palette dialog, ~477–527)
- Test: `src/tests/component/CairnAdminShell.test.ts`

The palette at 390 sits flush against the viewport top (`self-start` with only `sm:mt-[12vh]`)
and its input shows a heavy black UA outline instead of the admin's focus language.

- [ ] Give the palette a top inset below `sm` (a modest margin consistent with the design
  system's spacing scale) and replace the input's UA focus outline with the admin focus
  treatment (the design system's focus-ring recipe), keeping a visible focus indicator.
- [ ] Test: palette renders with the inset at a 390 viewport; the input carries the admin focus
  class, not a bare UA default. Regenerate affected baselines.

**Acceptance:** tests green; full gate; conductor render-read at 390.

### Task 5: Guarded-control visibility and the media-tile glyph label (audit findings 7, 10)

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (the guarded-button rules), and
  `src/lib/components/EditPage.svelte` (~1718–1739) if the fix needs markup
- Modify: `src/lib/components/CairnMediaLibrary.svelte` (the green-check tile glyph)
- Test: `src/tests/component/EditPage.test.ts`, plus the media component test file if one covers
  tiles

- [ ] The guarded Figure control renders so faint it reads as a rendering gap. Raise the guarded
  resting treatment so it reads as a deliberately disabled control (visibly present, clearly
  non-interactive, tooltip preserved via the existing `.cairn-btn-guarded` seam) — an emphasis
  correction within the current design language, not a new treatment.
- [ ] The unlabeled green check on media tiles violates the design system's own glyph-plus-label
  rule. Determine what the check means from the code, then pair the glyph with a short text
  label (or an accessible equivalent that is also visible, per the rule).
- [ ] Tests pin both: the guarded control's visibility state and the labeled tile glyph.
  Regenerate affected baselines.

**Acceptance:** tests green; full gate; conductor render-read (both themes for the guarded
control).

### Task 6: Dark Published pill and the mechanical polish tail (audit finding 10)

**Files:**
- Modify: `src/lib/components/cairn-admin.css` and/or badge classes in
  `src/lib/components/EditPage.svelte` (~937–940) and `src/lib/components/ConceptList.svelte`
  (~386–388)
- Modify: `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/ManageEditors.svelte`
  (Add-editor row), zen/palette hint sites in `EditPage.svelte` / `CairnAdminShell.svelte`
- Test: the corresponding component test files

The cherry-picked mechanical items, one dispatch:

- [ ] The dark-mode Published pill (`badge-ghost`) nearly vanishes; fix its dark contrast at the
  token level so it clears contrast floors in both themes (the one badge without a dark
  counterpart).
- [ ] Date column: no two-line wrap for any month name (May fits, June wraps today — pin
  no-wrap or width).
- [ ] Media card title: truncation must not depend on badge width (today only the "Needs alt"
  card truncates).
- [ ] Add-editor button: align its height with its row inputs.
- [ ] Touch devices: hide the zen "Esc" hint and the ⌘K palette hint where they are meaningless
  (pointer/hover media query, not UA sniffing).
- [ ] Zen's manuscript shows a visible violet frame in the no-chrome mode: suppress the resting
  frame in zen, keeping a `:focus-visible` indicator.
- [ ] Tests where a behavior is pinnable (badge contrast via class/token assertions, hint
  visibility via media-query class); baselines regenerated and listed.

**Acceptance:** full gate; conductor render-reads dark posts list and zen. The "HIGHER RISK"
pill's tone is copy, not styling — it rides Task 7.

### Task 7: Voice sweep and the showcase `singular` (audit finding 9 + finding 7's footer wording)

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (1711; footer labels "Markup", "0 issues"),
  `src/lib/components/CairnTidySettings.svelte` (364, 435, 507, 534–535, 544; the "HIGHER RISK"
  pill copy), `src/lib/components/CairnMediaLibrary.svelte` (1570 "No refs"),
  `src/lib/components/HelpHome.svelte` (102–103, 273, and the page headings)
- Modify: `examples/showcase/src/theme/cairn.config.ts` (posts concept, ~347–390)
- Modify: `docs/reference/` page for `defineConcept` (the `singular` note below)
- Test: existing component tests whose string assertions the sweep breaks

- [ ] Rewrite the flagged strings into the calibrated register (professional, restrained,
  slightly academic; no product personification, no developer vocabulary reaching editors).
  The known list: "before it lands" (×2), "Saving commits your choices to the site config",
  "the key rides in an Anthropic Worker secret", the "No refs" badge (spell it out or align
  with the "No references found" filter on the same screen), "Find your way around" / "get your
  bearings", "Stuck on something?", "Not here yet" / "held back for now", "cairn leaves your
  style alone", the footer's "Markup" and "0 issues" labels, the "HIGHER RISK" pill copy, and
  the HelpHome headings in the same chatty register. Propose replacements; the conductor
  reviews every string at the diff.
- [ ] Declare `singular` on the showcase posts concept so "New Posts" resolves to "New post"
  (`ConceptList.svelte:190` already reads `data.singular ?? data.label`). Ruled here so the
  implementer does not weigh it: the engine does NOT warn on a missing `singular` (leanness;
  the fallback is documented behavior) — instead the `defineConcept` reference page gets one
  sentence noting the fallback and recommending the declaration.
- [ ] Update any component tests asserting the old strings; no baseline should change except
  where a string renders in a screenshot (list those).

**Acceptance:** full gate; conductor signs off on every replacement string.

### Task 8: Drawer APG-dialog treatment (deferred from the reorganization pass)

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte` (drawer state ~160–197, drawer markup
  ~391, 561–562)
- Test: `src/tests/component/CairnAdminShell.test.ts`

The reorganization pass shipped the minimal focus contract (restore on close) and deliberately
deferred the full APG modal-dialog treatment to this pass.

- [ ] Test-first, the APG contract: while the drawer is open, Tab and Shift+Tab cycle within it
  (focus trap); the page behind is inert to pointer, keyboard, and assistive tech (`inert` on
  the sibling content, or aria-hidden plus the trap if `inert` conflicts with the DaisyUI drawer
  structure); Escape closes the drawer independently — it must not also trigger any other
  Escape handler (palette, zen, dialogs) and vice versa; focus restore on close stays.
- [ ] Implement against the existing checkbox-based DaisyUI drawer without breaking the
  lg+/xl persistent-sidebar modes (the treatment applies only when the drawer is an overlay);
  `role="dialog"` + `aria-modal` on the overlay panel.
- [ ] Keep the existing Ctrl+B / hamburger flows and their tests green.

**Acceptance:** the new APG tests green plus the full gate; this task is the
`daisyui-a11y-reviewer`'s named focus at the close-ritual review gate.

### Task 9: DX cluster (single Opus dispatch, own worktree `papercuts-dx` off main)

**Files:**
- Modify: `package.json` (`files`, ~127–130), the `check:package` assertion path
- Modify: `docs/guides/configure-auth-and-d1.md`, `docs/guides/upgrade-cairn.md`,
  `docs/guides/give-a-role-its-own-admin-area.md`, `docs/guides/deploy-to-cloudflare.md`,
  `docs/guides/cloudflare-readiness.md` (whichever the apply-path rewrite touches)
- Create/Modify: `src/lib/doctor/checks-cloudflare.ts` or `checks-local.ts` (new check),
  `src/lib/doctor/types.ts` untouched; the doctor conditions registry entry
- Test: the doctor test files beside the existing `auth.role-vocabulary` check's tests

Three items, one dispatch, reviewed once at the merge boundary:

- [ ] **Ship migrations.** Add `"migrations"` to the `files` array so `0000_auth.sql` and
  `0001_roles.sql` ship in the package; extend the pack gate so a missing migrations directory
  fails `check:package` (publint/attw don't check file sets — add a small assertion in the
  script chain). Rewrite the apply-path docs for registry consumers, who have no repo checkout:
  the migrations live at `node_modules/@glw907/cairn-cms/migrations/`; give the copy-or-point
  step before `npx wrangler d1 migrations apply` and apply it consistently across the five
  guide sites found (configure-auth-and-d1 82–83, deploy-to-cloudflare 199,
  cloudflare-readiness 135, give-a-role-its-own-admin-area 33, upgrade-cairn 86).
- [ ] **Roles double-wiring doctor check.** First verify the real failure semantics in code —
  the ASC harvest claims a missed `createAuthGuard({ roles })` wiring makes "every row resolve
  owner", but `resolveCapability` (`src/lib/auth/roles.ts:82–88`) reads as resolving an
  undeclared role to `'none'` against the guard's `DEFAULT_ROLES` fallback
  (`src/lib/sveltekit/guard.ts:46–47, 126`). Ground the check in whichever is true. Then add a
  doctor check in the existing idiom (`pass`/`fail`/`skip`, stable id, conditions-registry
  entry, e.g. `auth.role-wiring`) that detects the divergence the existing
  `auth.role-vocabulary` check misses: roles declared to the adapter (or present on editor
  rows) that the running guard's vocabulary does not carry. Tests beside the existing doctor
  tests. Do NOT implement single-source wiring — write a short recommendation (seam shape,
  cost, whether it is worth a breaking change) into the task report for the pass post-mortem.
- [ ] **Session-recipe doc corrections.** Verify every doc claim about the session contract
  against code truth (`src/lib/auth/crypto.ts:5–15` for the `__Host-cairn_session` name;
  `migrations/0000_auth.sql` + `src/lib/auth/store.ts` for epoch-millisecond timestamps), then
  grep ALL of `docs/` for cookie-name and `expires_at` claims and correct only what diverges.
  `configure-auth-and-d1.md:190–192` already states the cookie correctly, so the ASC-reported
  gap may live in a different page (the bring-your-own-auth / session-reading recipe) — find
  the page they actually read.
- [ ] Gate: full suite, `npm run check` 0/0, `check:package`, and all four doc gates
  (`check:reference`, `check:reference:signatures`, `check:docs`, `check:package`); run
  `check:surface` and report whether the doctor addition moved the surface (expected: no —
  doctor checks are internal; if it did, regenerate deliberately and say so).

**Acceptance:** conductor reviews the branch diff once, then merges `papercuts-dx` into the
pass branch before Task 10.

### Task 10: Close ritual (per `cairn-pass`, conductor-driven)

- [ ] Merge the reviewed `papercuts-dx` branch into `admin-papercuts`; resolve nothing silently.
- [ ] `code-simplifier:code-simplifier` over the pass's changed code.
- [ ] Gates by name: `npm run check` 0/0, `npm test` exit 0, `check:comments`, the four doc
  gates, `check:surface`, consumer build proof (push branch for CI e2e, or from-scratch showcase
  build).
- [ ] Review fan-out: `svelte-reviewer` + `daisyui-a11y-reviewer` (named focus: Task 8's dialog
  contract, Task 5's guarded visibility, Task 6's badge contrast). `web-auth-security-reviewer`
  only if Task 9's doctor work touched auth semantics (expected: no — it reads, never mutates).
- [ ] Live admin smoke (the pass touches `/admin`): per `docs/internal/admin-smoke-test.md`,
  plus live repro verification at 320/390 that the Task 1/2/3 defects are gone (the audit's
  "verify by live repro" instruction).
- [ ] Docs dimension: `docs/internal/admin-design-system.md` gains what changed (the narrow
  desk-band composition, the footer composition, the guarded-control emphasis, the palette
  focus recipe); CHANGELOG `## Unreleased` entry written once (expected: no `Consumers must:`
  lines — everything additive or internal; the migrations shipping is additive packaging);
  upgrade-guide entry only if a behavior change warrants it; friction-log entries for anything
  the writing surfaced.
- [ ] ROADMAP: remove the phase-1 entry (this pass); leave phase 2, the ARC, and the KIT
  entries standing.
- [ ] Post-mortem appended to this plan file (including Task 9's single-source-wiring
  recommendation); STATUS.md updated on `main` at the merge; hold unpublished, no version bump.
- [ ] Merge `admin-papercuts` to `main` per repo conventions; prune the worktrees.
