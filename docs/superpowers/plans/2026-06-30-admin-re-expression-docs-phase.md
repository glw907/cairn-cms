# Admin Idiomatic Re-Expression — Docs Phase — Implementation Plan

> **For agentic workers:** The drafting runs as a workflow (two sequential doc agents + a parallel
> prose/accuracy review); the main loop verifies the doc gates, wires the scheduled watcher, and
> finalizes. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the admin idiomatic re-expression initiative by making the documentation match the
de-customized reality: publish the developer-facing role vocabulary as a versioned seam, correct the stale
design-system doc, document the starter template's design, add a DaisyUI/Tailwind upgrade-rehearsal
runbook, and wire a scheduled watcher that pings when an upstream major publishes.

**Architecture:** Two homes. `docs/internal/admin-design-system.md` (agent- and maintainer-facing,
Vale-exempt) is the canonical design-system reference and carries the vocabulary seam, the template design
notes, and the maintainer upgrade-rehearsal runbook. The published guide
`docs/guides/add-a-custom-admin-screen.md` (Google-styled, Vale-governed) gains a short, discoverable
"admin design vocabulary" section that links to the canonical reference, so an external developer finds the
seam in the published docs. The scheduled watcher is a `schedule`-skill routine, not a doc.

**Tech Stack:** Markdown, the doc gates (`check:docs`, `check:reference`), Vale (Google package on the
published arms via the `vale-hook`), the `prose-voice-reviewer` subagent, the `schedule` skill.

## Global Constraints

- **The docs must match the current code, not the pre-sweep state.** The admin retired
  `text-[var(--color-muted)]` / `text-[var(--color-subtle)]` to the named `text-muted` / `text-subtle`
  utilities (budget 0), and the showcase moved its design-scale tokens into Tailwind 4 `@theme` (budget 0).
  Every token, utility, and recipe a doc names must exist in the code today; verify by grep, do not copy the
  old doc forward. `admin-design-system.md`'s current "Tokens (Warm Stone)" section is stale (it still
  prescribes the retired bracket form) and is itself a doc-scan pollution source.
- **Audience standards.** The published guide follows the Google Developer Documentation Style Guide (Vale's
  Google package governs `docs/guides/**`); draft it clean and fold any error-tier Vale finding.
  `admin-design-system.md` is internal (Vale-exempt) but still follows the authoring charter (plain voice,
  varied sentences, the AI-writing tells out). Write no arbitrary-value bracket string (`text-[var(--…)]`)
  in any doc: the admin CSS build's Tailwind scan compiles it into the shipped sheet, and a bad candidate
  breaks the build (`tailwind-scans-docs-bad-candidate`). Name the utility (`text-muted`) or the bare token
  (`var(--color-muted)`), never the bracket wrapper.
- **No code or behavior change.** This is a docs-and-tooling pass. The only non-doc action is creating the
  scheduled watcher.
- **Gates:** `npm run check:docs` (links/anchors), `npm run check:reference` (no undocumented export — this
  pass adds no export, so it stays green), and the `vale-hook` advisory floor on the published guide. Hold
  unpublished (docs-only; no package change).
- **Date:** 2026-06-30. **Branch/worktree:** continue on `starter-template-1` in the `extensibility-plan-1`
  worktree.

## File structure

- Modify: `docs/internal/admin-design-system.md` — correct the stale tokens/recipes; add three sections
  (the vocabulary seam, the starter-template design, the upgrade-rehearsal runbook).
- Modify: `docs/guides/add-a-custom-admin-screen.md` — add a discoverable "the admin design vocabulary"
  section linking to the canonical reference.
- Create (main loop): a `schedule` routine watching for a DaisyUI or Tailwind major.
- Update: `docs/STATUS.md`, `ROADMAP.md`, the `cairn-admin-design-modernization` memory (main loop, pass-end).

---

## Task 1: Rewrite `admin-design-system.md` to the de-customized reality (workflow, Agent 1)

**Executor:** workflow `cairn-implementer` (reads the current admin + showcase code for accuracy).

- [ ] **Step 1: Correct the stale token and recipe forms.** Read the current admin code
  (`src/lib/components/cairn-admin.css`, `scripts/admin-css.input.css`, and a sample of the components) and
  the showcase (`examples/showcase/src/lib/theme.css`). In `admin-design-system.md`:
  - The "Tokens (Warm Stone)" section: replace "Reference them as `text-[var(--color-muted)]` /
    `text-[var(--color-subtle)]`" with the named utilities `text-muted` / `text-subtle` (the frozen role
    interface defined in `admin-css.input.css`). Verify every other reference form in the section against the
    current admin markup: keep the ones the admin still uses (the sweep folded only muted/subtle, so
    `font-[family-name:var(--font-display)]`, `tracking-[…]`, and the AA-ink brackets like
    `text-[var(--cairn-warning-ink)]` may still be current — confirm by grep and correct only what changed).
  - The "Component recipes" and "Type" recipes: verify each against the current markup and fix any drift.
- [ ] **Step 2: Add "The developer-facing vocabulary (the versioned seam)."** A new top-level section
  marking the stable contract an extending developer builds on: the Warm Stone theme tokens, the
  `text-muted` / `text-subtle` role utilities, and the documented component recipes. State that it is
  versioned (a breaking change to it is a major-version event), and carry the "cairn's frame, not your API"
  split: the a11y inks, the elevation pair, the embed-anywhere infrastructure, the editor (CodeMirror)
  system, and the two unlayered workarounds are cairn's internal frame, not the developer contract. Point to
  the ledger (`docs/internal/design/2026-06-29-custom-surface-ledger.md`) and the `check:custom-surface`
  gate that holds the line.
- [ ] **Step 3: Add "The starter template's design."** Document the showcase template's design language: its
  own DaisyUI theme (Tier 1, not Warm Stone), its design-scale tokens now in Tailwind 4 `@theme` (so
  `text-step-*`, the spacing utilities, `font-display`, `tracking-*`, `leading-*`, `max-w-measure*`,
  `text-muted`, `border-card-border` generate), the owned Tier 2 (the `prose.css` reading surface, the
  `.cairn-place-*` figure contract, the inks, the code binding), and the re-skin recipe at the top of
  `theme.css`. Point to the showcase ledger
  (`docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`).
- [ ] **Step 4: Add "Rehearsing a DaisyUI or Tailwind upgrade."** A maintainer runbook: bump the dependency,
  recompile the admin sheet (`npm run package`), run the visual baselines
  (`examples/showcase` `CI=1 npx playwright test admin-visual site-visual`), run the vocabulary and contrast
  gates (`npm run check:custom-surface` both trees, `npm run check:public-tokens`), confirm the role
  utilities still resolve (`text-muted` / `text-subtle` compiled; the `admin-css-build` test), read the
  screenshot diff, and update the committed baselines as the reviewed record of intended drift. Note the
  scheduled watcher (Task 3) is what triggers this.
- [ ] **Step 5: Verify no arbitrary-value bracket string was introduced** (grep the file for a
  `prefix-[…var(--…)…]` shape; write bare tokens/utilities), run `npm run check:docs`, and commit.

## Task 2: Add the discoverable vocabulary section to the published guide (workflow, Agent 2, after Agent 1)

**Executor:** workflow `cairn-implementer` (sequential after Task 1, so it mirrors the settled vocabulary).

- [ ] **Step 1:** In `docs/guides/add-a-custom-admin-screen.md`, add a section (near "What the shell
  reserves") titled "The admin design vocabulary": the developer builds their custom screen in the same
  DaisyUI + Tailwind idiom as the admin, using the Warm Stone theme tokens and the `text-muted` /
  `text-subtle` role utilities, so it matches the chrome and survives a framework bump. Keep it short and
  link to `../internal/admin-design-system.md` as the canonical reference. Follow the Google style guide.
- [ ] **Step 2:** Run `npx vale docs/guides/add-a-custom-admin-screen.md` and fold any error-tier finding;
  run `npm run check:docs`; commit.

## Task 3: Wire the scheduled DaisyUI/Tailwind-major watcher (main loop)

**Executor:** main loop (a side-effecting `schedule`-skill action, not a doc).

- [ ] **Step 1:** Via the `schedule` skill, create a routine (a scheduled cloud agent) that checks whether a
  new DaisyUI or Tailwind **major** has published (e.g. `npm view daisyui version` / `npm view tailwindcss
  version` against the current majors, 5.x and 4.x) and pings only when the major increments, pointing at
  the "Rehearsing a DaisyUI or Tailwind upgrade" runbook. Not an always-on CI canary. Record the routine id
  in STATUS and the memory.

## Pass-end ritual (main loop)

- [ ] **Doc gates:** `npm run check:docs` (links/anchors), `npm run check:reference` (no undocumented
  export; unchanged), and the `vale-hook` floor on the published guide.
- [ ] **Review:** the workflow's `prose-voice-reviewer` (register/tells) and the accuracy check (every
  token/utility/recipe named exists in the code); fold findings in the main loop.
- [ ] **Docs bookkeeping:** update `docs/STATUS.md` (the initiative is complete; next is the batched release
  decision), mark the docs phase and the initiative done in `ROADMAP.md`, and refresh the
  `cairn-admin-design-modernization` memory. Append the post-mortem here.
- [ ] **No release, no CHANGELOG entry** (docs and tooling only). Merge to `main` when Geoff asks.

## Self-review notes

- **Spec coverage:** the spec's "Final phase: docs" (rewrite `admin-design-system.md`, document the
  template's design, add the upgrade-rehearsal procedure, wire the watcher, update STATUS and memory) maps to
  Tasks 1 (rewrite + template + runbook), 2 (published discoverability), 3 (watcher), and the pass-end.
- **The stale-doc correction is the load-bearing fix:** the current `admin-design-system.md` prescribes the
  retired bracket form; leaving it would keep misdirecting developers and keep polluting the shipped sheet.
- **Placement:** the canonical seam is in `admin-design-system.md` (per the spec) with a published on-ramp in
  the guide, so both the maintainer and the external developer reach it.
