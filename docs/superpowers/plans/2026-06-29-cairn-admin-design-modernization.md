# Admin design-system modernization: the live-components bar + DaisyUI 5.6 adoption

> **For agentic workers:** a foundation pass that emerged mid tag-management Plan 3 (2026-06-29). It
> precedes finishing that plan: the vocabulary screen (tag-management Plan 3, Tasks 2-5) should be built
> on the modern, 5.6-current foundation. Execute task-by-task via `cairn-implementer` (Sonnet), main loop
> reviewing each diff and clearing the gate, except the design-judgment parts (which surfaces adopt which
> 5.6 feature), which are main-loop work verified against the live components with screenshots.

**Goal:** Make the admin design system idiomatic and current. The polish bar becomes the live components
(not a hand-maintained static twin), and the admin + starter template adopt DaisyUI 5.6 where it
genuinely serves an existing job. Leanness governs: the marquee new components do not fit cairn and are
declined on purpose.

## Status and pivot (2026-06-29)

The plan below was written before a reframe; read this first.

- **Task A — DONE** (`815d343`): the live-components bar + the idiomatic mockup tooling.
- **Task B — DONE** (`8e0bda1`): bumped to DaisyUI 5.6.6 / Tailwind 4.3.2 (root + showcase + lockfiles),
  recompiled, full gate green (check 0/0, `npm test` 2838, showcase e2e 44), no test changes needed.
- **Task C — RESOLVED, adoption declined** (`c25a72c`): 5.6's `.btn[aria-disabled]` sets
  `pointer-events: none`, which costs a tooltip rather than helping, so there is no beneficial
  `aria-disabled` adoption for cairn. The one button it affected (the editor's guarded Figure button) was
  defended with a `cairn-btn-guarded` marker + an unlayered override so its tooltip survives the bump.
- **Tasks D/E — SUPERSEDED by the pivot below.** Do not execute the incremental card-selectable /
  floating-label adoption as written.

**The pivot (Geoff, 2026-06-29):** after the 5.6 bump, split the effort and likely **start the admin UI
fresh** rather than patch incrementally. The vision: the cairn admin should be a **restrained DaisyUI
showcase** — an idiomatic, current DaisyUI 5.6 layout, kept within the cairn sensibility (the Warm Stone
restraint, the quiet polish). This is a major effort and its own initiative; it needs a **fresh-context
brainstorm** to scope (what "fresh" means: a full component rebuild vs. a fresh shell/layout keeping logic;
how the Warm Stone design system is re-expressed in idiomatic 5.6; sequencing vs. the held tag-management
Plan 3, whose vocabulary screen should be built in the new idiom). The next session opens that brainstorm
with a clean slate. The tag-management Plan 3 UI (Tasks 2-5) is PAUSED behind this direction.

## Why this exists (the decisions, so they survive a context loss)

Geoff steered this in conversation on 2026-06-29 while Plan 3 was starting:

1. **Mockups must be idiomatic.** A mockup is authored in the same DaisyUI/Tailwind utility classes the
   component carries, never hand-rolled CSS against the tokens, so the Svelte port is a transcription and
   nothing drifts. The mockup-css build (`npm run design:mockup-css`) compiles a preview sheet by scanning
   the design HTML as an extra Tailwind `@source`. **(Done in Task A.)**
2. **The polish bar is the live components.** A static HTML gold standard drifts (the 2026-06-12 one went
   stale), so the bar is now the real admin rendered on the showcase, the most-recent version by
   construction. The old gold standard is demoted in place (kept only so historical links resolve).
   **(Done in Task A.)**
3. **DaisyUI 5.6 is adopted where it fits, and only there.** Geoff's scope call (via a scoped question):
   - **In:** the bump itself (the rewritten button/card/modal/menu/select/input internals polish the admin
     for free on recompile); 5.6's native `[aria-disabled]` button styling for the admin's guarded
     controls; card selectable states on the Media Library tiles / settings cards; responsive floating
     labels on the auth + starter-template forms.
   - **Out, on purpose (charter leanness):** OTP (cairn is magic-link, no codes), Megamenu (the admin nav
     is six lean items), Aura glow (the Warm Stone system is deliberately restrained). Adopting these in
     the admin would be adding a feature the core job does not need.
   - **Aura, template-only and later.** The admin never uses Aura; it stays polished, professional, and
     restrained. Aura is a future starter-template idea: a strong CTA (Aura glow) vs a gentle CTA (no
     Aura) for a developer to choose. Tracked in `ROADMAP.md` (Considering), not built in this pass.

## Tech stack

DaisyUI 5.6.6, Tailwind 4.3.2, Svelte 5 runes, the Warm Stone admin design system
(`docs/internal/admin-design-system.md`), Vitest (component tests in chromium), the showcase Playwright
e2e for the consumer build. Gate per task: targeted test, then `npm run check` 0/0, then `npm test` exit 0;
`npm run check:comments` and the showcase e2e before the pass is called done.

---

## Task A: Mockup tooling + the live-components bar (DONE)

Shipped before this doc was written; recorded here for the trail.

- `scripts/build-admin-css.mjs`: `buildAdminCss` takes an optional `{ extraSources }` so a caller widens
  the Tailwind `@source` scan without editing the shipped input. Default (no-arg) output is byte-identical
  (pinned by `admin-css-build.test.ts`).
- `scripts/build-mockup-css.mjs` + the `design:mockup-css` npm script: compiles a preview sheet for the
  design HTML and copies the fonts beside it.
- `docs/internal/design/README.md`: rewritten. The bar is the live components (with the capture recipe);
  mockups explore new screens in utility classes, grounded in the closest live component.
- `docs/internal/admin-design-system.md`: the bar is the live components, not the static file.
- `docs/internal/design/2026-06-12-editor-shell-gold-standard.html`: demoted in place with a superseded
  banner (link-safe).

Verified: `buildAdminCss()` unit test green; the mockup-css build compiles a class only the mockup uses
(`.w-32`) into the sheet; `check:docs` OK (91 files).

---

## Task B: Bump to DaisyUI 5.6.6 / Tailwind 4.3.2 and verify no regression

**Files:** `package.json` + `package-lock.json` (root), `examples/showcase/package.json` +
`examples/showcase/package-lock.json`. Pin `daisyui@5.6.6`, `tailwindcss@4.3.2`,
`@tailwindcss/postcss@4.3.2` (root), `@tailwindcss/vite@4.3.2` (showcase). Regenerate both lockfiles in the
same commit (the root CI runs strict `npm ci`; a graph-changing edit must carry its lockfile).

**Steps:**
- [ ] Update the four dep specifiers; `npm install` at the root and in `examples/showcase` to regenerate
      the lockfiles.
- [ ] `npm run package` (recompile the admin sheet on 5.6) then the full gate: `npm run check` 0/0,
      `npm test` exit 0, `npm run check:comments`.
- [ ] **Regression check:** screenshot the key admin states (office list, edit page, a settings screen,
      the media library, the auth login) before and after the bump and diff them. The button rewrite
      claims no breaking visual change; confirm the scoped `.btn-primary` lift and the bare-button reset
      (`cairn-admin.css`) still hold, and the `admin-css-build.test.ts` font/scoping pins still pass.
- [ ] From-scratch showcase build + e2e (`rm -rf examples/showcase/{node_modules,package-lock.json}` then
      install + `CI=1 npm --prefix examples/showcase run test:e2e`) so the 5.6 toolchain is proven on a
      consumer build, not only the library's own tests.
- [ ] Commit the four dep files together.

## Task C: Adopt 5.6 native `[aria-disabled]` button styling for guarded controls

5.6 styles `[aria-disabled="true"]` buttons, which is exactly the pattern the admin uses where a guarded
control must keep its tooltip (native `disabled` kills `pointer-events` and the title). Replace the
hand-rolled disabled styling with the native treatment where it now applies.

**Files:** `src/lib/components/MediaFigureControl.svelte` (the figure button's `aria-disabled` +
`opacity`/`cursor` utilities), and any other admin control using the same hand-rolled idiom (grep
`aria-disabled` under `src/lib/components`). The new vocabulary delete (tag-management Plan 3 Task 3)
inherits this idiom, so it lands already on the 5.6 treatment.

**Steps:**
- [ ] Grep the guarded-button idiom; for each, drop the hand-rolled disabled utilities that 5.6 now
      supplies, keeping the `aria-disabled` semantics and the tooltip.
- [ ] Component tests stay green; visually confirm the disabled state on the showcase against the live
      component. Gate.

## Task D: Card selectable states + responsive floating labels

The design-judgment task. Adopt only where it genuinely improves the existing surface; verify each against
the live component with a screenshot, and run `daisyui-a11y-reviewer`.

**Candidates:**
- **Card selectable** (`aria-checked`, nested checkbox/radio focus, checked outline): the Media Library
  grid tiles (`CairnMediaLibrary.svelte`, the roving listbox tiles) and the settings cards
  (`CairnTidySettings.svelte`). Adopt only if the 5.6 card-selectable styling matches or betters the
  bespoke a11y-tuned treatment already there; do not regress the roving-tabindex / `aria-selected` model.
- **Responsive floating labels:** the auth login (`LoginPage.svelte`) and the starter-template forms
  (showcase). Adopt where a floating label reads better than the current labeled input, honoring the
  DaisyUI-v5 form-class rules (no `form-control`/`label-text`).

**Steps:**
- [ ] For each candidate, read the live component, decide adopt/skip with a one-line reason, and where
      adopting, port to the 5.6 idiom.
- [ ] Component tests + screenshots; `daisyui-a11y-reviewer` + `svelte-reviewer` at the gate. Gate.

## Task E: Docs, reviewers, and the pass-end ritual

- [ ] Update `docs/internal/admin-design-system.md` for any new idiom adopted (the `[aria-disabled]`
      button note, card-selectable, floating labels), so the recipes match what ships.
- [ ] `CHANGELOG.md` + `docs/guides/upgrade-cairn.md`: the DaisyUI 5.6 bump (note it is non-breaking for a
      consumer; the admin sheet ships compiled) and any visible admin change.
- [ ] Reviewer fan-out (`daisyui-a11y-reviewer`, `svelte-reviewer`); fold findings.
- [ ] STATUS + memory: record the pass, point the immediate-next-action at resuming tag-management Plan 3
      (Tasks 2-5) on this foundation. Post-mortem appended here.

---

## Then: resume tag-management Plan 3

The vocabulary screen (tag-management Plan 3) builds on this. Task 2 (the mockup) is grounded on the live
`CairnTidySettings` (its near-twin), authored in utility classes via the mockup-css build; Task 3's delete
control lands on the 5.6 `[aria-disabled]` treatment from Task C.
