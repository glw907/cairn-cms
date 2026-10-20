# Starter-Template Track, Phase 2: Template Chrome — Implementation Plan

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer` (Sonnet),
> test-first; the main loop reviews each diff and clears the full gate (including the `site-visual`
> baseline and `check:custom-surface`) before the next task. Steps use checkbox (`- [ ]`) syntax.

> **⚑ KEY DECISION — CONFIRMED (Geoff, 2026-06-30).** This plan folds the showcase's design-scale tokens
> out of `:root` and into Tailwind 4 `@theme`, **renaming** them to Tailwind's utility namespaces
> (`--cairn-step-1` → `--text-step-1`, `--cairn-space-m` → `--spacing-m`, `--cairn-muted` → `--color-muted`,
> …) so the named utilities generate. This changes the template's documented re-skin surface, so the recipe
> at the top of `theme.css` is rewritten to the new names (Task 6) and stays a documented edit surface.
> Geoff confirmed the idiomatic rename over keeping `--cairn-*` names. Do not relitigate.

**Goal:** Re-express the showcase starter template's chrome and route markup in native DaisyUI 5.6 /
Tailwind 4: move the design-scale tokens into `@theme` so named utilities generate, fold the arbitrary-value
bracket utilities onto those names, fix the bespoke `site.css` remainder (the island-converter and the
`--cairn-rule` dead token), and ratchet the showcase `check:custom-surface` retired-token budget from 20
toward its floor.

**Architecture:** Tailwind 4 `@theme` emits each token as a `:root` custom property **and** powers a named
utility. So a token that keeps its name (the `--font-*` faces) needs no CSS-consumer change when it moves
to `@theme`; only a renamed token (required where the utility namespace differs from `--cairn-*`) cascades
to its CSS consumers (`theme.css`, `prose.css`, `site.css`), the markup, and the styleguide token-demo
data. The `site-visual` baseline (Phase 1) is the zero-pixel guard: the renames resolve to identical values,
so the fold is pixel-neutral, and any intended drift is a reviewed baseline update.

**Tech Stack:** Tailwind 4 `@theme`, DaisyUI 5.6 utilities (`rounded-field`), Svelte 5 markup, the
`check:custom-surface` gate (showcase tree, per-tree pattern), Playwright `toHaveScreenshot`.

## Global Constraints

- **The showcase keeps its own DaisyUI theme (Tier 1).** No Warm Stone, no redesign. The two
  `@plugin "daisyui/theme"` blocks are untouched.
- **Pixel-neutral by intent.** Each rename resolves to the same value, so the fold changes no pixel. The
  `site-visual` baseline (home + styleguide, light + dark) must stay byte-identical; any genuine drift is a
  reviewed, committed baseline update with a one-line note (the spec's Rule 5).
- **Tier 2 is not folded.** `prose.css` (the reading surface), the `.cairn-place-*` figure contract, the
  inks, the elevation and CTA pairs, and the `.cairn-tok-*`/`pre.shiki` code binding stay. They are
  CSS-consumed (not markup brackets); their tokens that get renamed update their `var()` references in
  place but keep their tier.
- **The retired-token budget only ratchets down.** Each task lowers the showcase `retiredTokenBudget` in
  `scripts/custom-surface-budget.json` to its post-fold count; never raise it. The admin tree stays at 0,
  its pattern unchanged.
- **Full gate per task:** `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (both
  trees PASS), and `cd examples/showcase && npx playwright test site-visual` (4/4, byte-identical unless a
  reviewed baseline update is recorded). Run `check:custom-surface` (which repackages and scans docs/scripts)
  at pass-end. The new markup changes bring `svelte-reviewer` and `daisyui-a11y-reviewer` into scope.
- **Doc hygiene:** write bare `var(--token)` forms in any doc/comment, never an arbitrary-value bracket
  string (`tailwind-scans-docs-bad-candidate`).
- **Date:** 2026-06-30 (adjust at execution). **Branch/worktree:** continue on `starter-template-1` in the
  `extensibility-plan-1` worktree, or a fresh `starter-template-2` worktree off `main` after Phase 1 merges.

## The `@theme` mapping (the committed scheme)

| Current `:root` token | `@theme` token | Generated utility | CSS-consumer cascade |
| --- | --- | --- | --- |
| `--cairn-step-N` (N = -1..5) | `--text-step-N` | `text-step-N` | theme.css, prose.css, site.css, styleguide data |
| `--cairn-space-X` (X = 3xs..2xl) | `--spacing-X` | `gap-X`, `px-X`, `py-X`, `mt-X`, `mb-X`, `pt-X`, … | theme.css, prose.css, site.css |
| `--font-display` / `-body` / `-mono` | `--font-display` / `-body` / `-mono` (same names) | `font-display` / `font-body` / `font-mono` | none (name kept; `var()` still resolves) |
| `--cairn-tracking-tight` / `-eyebrow` | `--tracking-tight` / `-eyebrow` | `tracking-tight` / `tracking-eyebrow` | theme.css, prose.css (`tracking-tight` overrides the default — intended) |
| `--cairn-leading-tight` / `-snug` / `-body` | `--leading-tight` / `-snug` / `-body` | `leading-tight` / `-snug` / `-body` | theme.css, prose.css (overrides defaults — intended) |
| `--cairn-measure` / `-wide` | `--container-measure` / `--container-measure-wide` | `max-w-measure` / `max-w-measure-wide` | theme.css, prose.css, site.css |
| `--cairn-muted` | `--color-muted` | `text-muted`, `border-muted`, `bg-muted` | theme.css (code ramp), prose.css, site.css (the admin parallel) |
| `--cairn-card-border` | `--color-card-border` | `border-card-border` | theme.css, prose.css (kept as the elevation hairline; the one markup ref folds) |
| `--radius-field` (DaisyUI) | unchanged | `rounded-field` (DaisyUI 5 utility) | none |

Tokens that **stay** as `:root`/CSS (Tier 2, not markup-bracketed, no utility needed): `--flow-space`, the
inks `--cairn-success/warning/error/info-ink`, `--cairn-shadow`, the CTA pair `--cairn-cta-*`, and the code
ramp `--cairn-code-*`. `--color-muted` is the one ink that gets a utility (it is markup-bracketed and is the
direct showcase analog of the admin's `text-muted`).

**Collision check (verify in Task 1):** `--color-muted` and `--color-card-border` are new color roles
(DaisyUI does not define them); the showcase admin sheet (`cairn-admin.css`) defines its own `--color-muted`
but scoped under `[data-theme='cairn-admin']` and linked only on the `/admin` layout, while the public
`@theme` emits at `:root` and is linked only on the `(site)` layout, so they do not collide at runtime.
Overriding the default `tracking-tight` / `leading-*` / `font-mono` utilities is intended (the template's own
values); confirm no other showcase surface depends on Tailwind's default values for those utilities.

---

## Task 1: Prove the `@theme` mechanism — move the faces (`--font-*`)

The lowest-risk cluster (the faces already carry Tailwind-namespace names), so it proves the mechanism
before the renaming clusters.

**Files:**
- Modify: `examples/showcase/src/lib/theme.css` (add a `@theme {}` block; move `--font-display/body/mono` into it from `:root`)
- Modify: `examples/showcase/src/lib/components/SiteHeader.svelte`, `SiteFooter.svelte`, `routes/(site)/+layout.svelte`, `routes/(site)/+page.svelte`, `routes/(site)/styleguide/+page.svelte` (fold `font-[family-name:var(--font-display)]` → `font-display`, etc.)
- Test: `examples/showcase/e2e/site-visual.spec.ts` (the existing baseline is the guard; no new test file)

- [ ] **Step 1: Add the `@theme` block and move the faces.** In `theme.css`, add a `@theme {}` block (after
  the `@plugin "daisyui/theme"` blocks, before the `:root` cairn-authored layer) and move the three
  `--font-*` declarations into it. Remove them from `:root` (the `@theme` block re-emits them at `:root`, so
  every existing `var(--font-display)` in prose.css/theme.css keeps resolving unchanged). Add a comment that
  `@theme` here generates the `font-*` utilities and still emits the `:root` vars.

```css
@theme {
  /* The editorial faces. In @theme so Tailwind generates `font-display`/`font-body`/`font-mono`; the
     vars are still emitted at :root, so prose.css's `var(--font-display)` keeps resolving. */
  --font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
  --font-body: 'Source Sans 3 Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Source Code Pro Variable', ui-monospace, 'SF Mono', Menlo, monospace;
}
```

- [ ] **Step 2: Confirm the utility generates (red→green via the build).** Build and grep the emitted CSS:

Run: `cd examples/showcase && VITE_CAIRN_E2E=1 npm run build && grep -rl 'font-display' .svelte-kit/output 2>/dev/null | head`
Expected (after Step 3 adds a use): a `.font-display { font-family: var(--font-display) }` rule compiles.
Before the markup uses it, Tailwind tree-shakes it out, so this confirms after Step 3.

- [ ] **Step 3: Fold the markup.** In the five files, replace every `font-[family-name:var(--font-display)]`
  with `font-display` (and `-body`/`-mono` likewise). Leave all other classes on the element untouched.

- [ ] **Step 4: Verify zero pixel against the baseline.**

Run: `cd examples/showcase && npx playwright test site-visual`
Expected: 4 passed, byte-identical (the faces resolve to the same value, so no pixel changes). If a diff
appears, investigate; do not update the baseline unless the drift is understood and intended.

- [ ] **Step 5: Ratchet the budget and confirm the gate.** Re-measure the showcase retired-token count and
  lower `scripts/custom-surface-budget.json` `showcase.budget.retiredTokenBudget` to it.

Run: `grep -rcE '\[[^]]*var\(--[^]]*\]|style="[^"]*var\(--' --include=*.svelte examples/showcase/src | grep -v ':0$' | awk -F: '{s+=$2} END {print s}'`
Then set the budget to that number and run `npm run check:custom-surface` (both trees PASS).

- [ ] **Step 6: Full gate + commit.** `npm run check` (0/0), `npm test` (exit 0).

```bash
git add examples/showcase/src/lib/theme.css examples/showcase/src/lib/components/SiteHeader.svelte \
  examples/showcase/src/lib/components/SiteFooter.svelte "examples/showcase/src/routes/(site)/+layout.svelte" \
  "examples/showcase/src/routes/(site)/+page.svelte" "examples/showcase/src/routes/(site)/styleguide/+page.svelte" \
  scripts/custom-surface-budget.json
git commit -m "feat(showcase): faces to @theme; fold font-* utilities (template chrome, budget N)"
```

---

## Task 2: The type and space scales (`--cairn-step-*`, `--cairn-space-*`)

The two highest-volume scales. They rename (`--cairn-step-N` → `--text-step-N`, `--cairn-space-X` →
`--spacing-X`), so the cascade reaches every CSS consumer.

**Files:**
- Modify: `theme.css` (move + rename the scale tokens into `@theme`; update the re-skin recipe's token
  names in the banner), `prose.css`, `site.css` (update `var(--cairn-step-*)`/`var(--cairn-space-*)` →
  `var(--text-step-*)`/`var(--spacing-*)`), the five markup files (fold the brackets), and
  `routes/(site)/styleguide/+page.svelte` (the type-scale demo data, `step.token` values)

- [ ] **Step 1: Move + rename into `@theme`.** Move the `--cairn-step-*` and `--cairn-space-*` blocks from
  `:root` into the `@theme {}` block, renaming `--cairn-step-N` → `--text-step-N` and `--cairn-space-X` →
  `--spacing-X`. Keep the clamp values byte-identical. Update the banner re-skin recipe (steps 5 and the
  fourteen-role headline) to name the new tokens.
- [ ] **Step 2: Update the CSS consumers.** In `theme.css` (the code ramp reads none of these; check),
  `prose.css`, and `site.css`, replace every `var(--cairn-step-N)` → `var(--text-step-N)` and
  `var(--cairn-space-X)` → `var(--spacing-X)`. (Do this with care; `--cairn-space-2xs` → `--spacing-2xs`,
  etc.)
- [ ] **Step 3: Fold the markup.** In the five files, replace `text-[length:var(--cairn-step-N)]` →
  `text-step-N`, and the spacing brackets (`gap-[var(--cairn-space-m)]` → `gap-m`,
  `px-[var(--cairn-space-m)]` → `px-m`, `py-[var(--cairn-space-xs)]` → `py-xs`, `mb-[var(--cairn-space-s)]` →
  `mb-s`, `pt-[var(--cairn-space-l)]` → `pt-l`, `pb-[var(--cairn-space-xl)]` → `pb-xl`,
  `mt-[var(--cairn-space-2xl)]` → `mt-2xl`).
- [ ] **Step 4: Update the styleguide type-scale demo data.** The styleguide lists the scale via
  `{ token: '--cairn-step-1', … }`; update those to `--text-step-1`, etc. The swatch render uses dynamic
  `var({step.token})`, which stays sanctioned.
- [ ] **Step 5: Verify zero pixel, ratchet, gate, commit** (same as Task 1 Steps 4–6).

---

## Task 3: Tracking, leading, measure, and the color roles

Renames `--cairn-tracking-*` → `--tracking-*`, `--cairn-leading-*` → `--leading-*`, `--cairn-measure*` →
`--container-measure*`, `--cairn-muted` → `--color-muted`, `--cairn-card-border` → `--color-card-border`.

**Files:** `theme.css` (move + rename into `@theme`; the code ramp `--cairn-code-comment`/`-punct` read
`--cairn-muted` → update to `var(--color-muted)`), `prose.css`, `site.css`, the five markup files, the
styleguide data.

- [ ] **Step 1: Move + rename into `@theme`.** Move and rename the tracking, leading, measure, muted, and
  card-border tokens. `--cairn-measure` → `--container-measure`, `--cairn-measure-wide` →
  `--container-measure-wide`. Keep values byte-identical. Confirm the collision check from the mapping
  section (`--color-muted` scoping vs the admin sheet; the overridden `tracking-tight`/`leading-*`).
- [ ] **Step 2: Update CSS consumers.** In `theme.css` (the code ramp: `--cairn-code-comment: var(--cairn-muted)` → `var(--color-muted)`, same for `-punct`), `prose.css` (the `var(--cairn-muted)`, `var(--cairn-tracking-tight)`, `var(--cairn-leading-*)`, `var(--cairn-measure)`, `var(--cairn-card-border)` refs), and `site.css` (`var(--cairn-muted)`, `var(--cairn-measure*)`, `var(--cairn-card-border)`).
- [ ] **Step 3: Fold the markup.** `tracking-[var(--cairn-tracking-tight)]` → `tracking-tight`,
  `leading-[var(--cairn-leading-snug)]` → `leading-snug`, `max-w-[var(--cairn-measure-wide)]` →
  `max-w-measure-wide`, `text-[color:var(--cairn-muted)]` → `text-muted`,
  `border-[color:var(--cairn-card-border)]` → `border-card-border`.
- [ ] **Step 4: Update the styleguide data** (the ink/measure demo token names).
- [ ] **Step 5: Verify zero pixel, ratchet, gate, commit.**

---

## Task 4: The radius bracket and the budget floor

- [ ] **Step 1: Fold the radius.** `rounded-[var(--radius-field)]` → `rounded-field` (DaisyUI 5 utility;
  confirm it emits in the showcase build). Sweep any remaining literal-one-off brackets that have a sensible
  named utility; leave genuine one-offs (e.g. a logo's `h-[1.55rem]`) — they wrap no `var(--…)` so the gate
  does not count them.
- [ ] **Step 2: Re-measure and set the floor.** The showcase `retiredTokenBudget` should now reach its
  floor (0 if every `var(--…)` bracket folded; otherwise the residual count, recorded with a one-line note
  in the ledger explaining each survivor). Set the budget to the measured floor.
- [ ] **Step 3: Verify zero pixel, gate, commit.**

---

## Task 5: The island-converter and the `--cairn-rule` bug (`site.css`)

- [ ] **Step 1: Fix the dead token.** Replace `border: 1px solid var(--cairn-rule, #b8b0a4)` with the
  intended theme token. `#b8b0a4` is a warm stone gray; the closest theme token is `var(--color-base-300)`
  (the light `-300` step). This changes the rendered hairline from a fixed hex to the theme value, so it is
  a **deliberate, reviewed pixel change** on the island-converter demo only.
- [ ] **Step 2: Fold the demo's magic numbers** where a token fits (`gap: 0.25rem` and the `1.125rem`
  font-size to the space/type scales if they map cleanly; leave genuinely demo-specific values). Keep the
  no-JS fallback styling operable.
- [ ] **Step 3: Update the island-converter visual.** The island demo renders on the styleguide, so the
  `styleguide-{light,dark}` baseline shifts by the hairline color. Regenerate and **review** the two
  styleguide snapshots; the diff should be only the converter's input border. Record the intended drift in
  the commit and the ledger.
- [ ] **Step 4: Gate, commit.**

---

## Task 6: The styleguide route, the re-skin recipe, and the ledger

- [ ] **Step 1: Fold the styleguide's own bespoke chrome** (`.sg-*` classes) onto Tailwind/DaisyUI
  primitives where one provably exists; keep the dynamic `var({token})` swatch styles (sanctioned). The
  styleguide stays the design-reference surface.
- [ ] **Step 2: Rewrite the re-skin recipe** at the top of `theme.css` to document the new `@theme` token
  names, so a site owner editing the template sees the idiomatic names. Note that the faces, the scales, the
  measure, and the muted/card-border roles now also drive named utilities.
- [ ] **Step 3: Update the showcase ledger** (`docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`):
  move the folded items from Tier 3 to "folded" with the post-fold budget, record any sanctioned residual,
  and record the island-converter fix.
- [ ] **Step 4: Gate, commit.**

---

## Pass-end ritual

- [ ] **Simplify** (`code-simplifier:code-simplifier`) over the changed markup and CSS.
- [ ] **Gate:** `npm run check` 0/0, `npm test` exit 0, `npm run check:custom-surface` (both trees; showcase
  at its new floor), `check:comments` OK, `check:docs` OK, the showcase `site-visual` + `styleguide` +
  `islands` e2e (force `CI=1` for a from-scratch consumer build).
- [ ] **Review gate:** `svelte-reviewer` and `daisyui-a11y-reviewer` over the markup diff (now in scope —
  this phase changes component and route markup). Consider an adversarial review Workflow for the fold.
- [ ] **Docs:** the re-skin recipe and the ledger are updated in-task. No public-API export changes, so
  `check:reference` is unaffected. No `CHANGELOG` entry unless the re-skin token rename is judged a
  consumer-facing change to the template (the template is copied, not imported, so likely an upgrade-guide
  note, not a `Consumers must` line).
- [ ] **Post-mortem + STATUS + memory:** append the Phase-2 post-mortem; point STATUS at the docs phase;
  refresh the `cairn-admin-design-modernization` memory. Hold unpublished (showcase template, not imported).
- [ ] **Commit + merge** to `main` and push only when Geoff asks.

## Self-review notes

- **Spec coverage:** the spec's "Template chrome" (SiteHeader, SiteFooter, the (site) layouts/pages, the
  styleguide, folding the site.css/theme.css remainder onto Tailwind 4 / DaisyUI 5.6) maps to Tasks 1–6.
- **Pixel discipline:** Tasks 1–4 are pixel-neutral (renames to identical values, guarded by the baseline);
  Task 5 is a deliberate, reviewed pixel change (the `--cairn-rule` fix) recorded in the baseline.
- **The gate ratchets, never loosens:** each task lowers the showcase budget; the admin tree is untouched.
- **Open fork:** the re-skin-token rename (the flagged decision) is settled to "rename, idiomatic" in this
  plan; if Geoff prefers keeping `--cairn-*` names, Tasks 2–3 and the recipe change, but the structure holds.

---

## Post-mortem (2026-06-30)

**Phase 2 (template chrome) is complete.** The showcase design-scale tokens now live in Tailwind 4
`@theme`, the chrome and route markup use the generated named utilities, and the showcase
`check:custom-surface` `retiredTokenBudget` reached **0** (the floor — every `var(--…)` arbitrary-value
bracket folded). Geoff opted into a workflow; the fold ran as a six-task sequential `cairn-implementer`
chain (shared files, strict in-order ratchet) plus a parallel review.

**The ratchet (commit, budget after, baseline):**
- **Task 1** (`1194680`, 20→19): the faces (`--font-*`) to `@theme`; `font-[family-name:…]` → `font-display`/`-body`. Byte-identical.
- **Task 2** (`49a9fd7`, 19→16): the type/space scales renamed (`--cairn-step-N` → `--text-step-N`, `--cairn-space-X` → `--spacing-X`) and moved to `@theme`; markup → `text-step-N`/`gap-m`/`px-m`/… Byte-identical.
- **Task 3** (`06d6f2c`, 16→1): tracking/leading/measure + the color roles renamed (`--cairn-muted` → `--color-muted`, `--cairn-card-border` → `--color-card-border`, `--cairn-measure*` → `--container-measure*`); markup → `tracking-tight`/`leading-snug`/`max-w-measure-wide`/`text-muted`/`border-card-border`. Two styleguide snapshots updated (the ink swatch **label text** `cairn-muted` → `color-muted`, ~0.01 ratio); home byte-identical.
- **Task 4** (`fcc4c79`, 1→0): `rounded-[var(--radius-field)]` → `rounded-field` (DaisyUI utility); budget at the floor. Byte-identical.
- **Task 5** (`8e66486`, 0): the `--cairn-rule` dead token → `var(--color-base-300)`; the island-converter is now Tier 2 (owned, theme-tokened). One styleguide snapshot updated (the dark hairline only).
- **Task 6** (`a1ceb8b`, 0): folded the one pixel-neutral styleguide chrome class (`.sg-row` → `flex flex-wrap items-center gap-s`); rewrote the `theme.css` re-skin recipe to the `@theme` names; updated the ledger (Tier 3 → folded record, Phase-2 sign-off).

**Two forced/deliberate deviations (reviewed, sound):**
- **Task 3 edited `scripts/check-public-tokens.mjs`** (not in the plan). The dual-gamut AA contrast gate
  hard-references the muted ink by name, so the rename required teaching it the token's new home: a
  `themeBlock()` parser was added and the light ink source now concatenates `@theme` with `:root` (the
  light `--color-muted` moved into `@theme`; the dark value stays in the dark media root). The **4.5:1 AA
  threshold and the token value are unchanged** — the gate reads the same ink from a new location, not
  weakened. Verified: `check:public-tokens` PASS (30 pairs AA in sRGB and P3, token-resolution PASS).
- **The styleguide snapshots drifted by design** (3 updates total): the ink-swatch label text reflecting
  the renamed token (Task 3, both schemes) and the dark island-converter hairline (Task 5, dark only). The
  two **site-home snapshots stayed byte-identical through every task**, which is the proof the token fold
  itself is pixel-neutral; the styleguide is the design-reference surface, so it correctly reflects the new
  token names and the fixed hairline.

**Verification (cumulative, main-loop):** `check` 0/0 (1245), `npm test` exit 0 (2871),
`check:custom-surface` PASS both trees (admin 0, showcase 0), `check:public-tokens` PASS (30 pairs AA),
`check:comments` OK, `check:docs` OK; showcase e2e **12 passed under `CI=1`** with a fresh build
(`site-visual` + `styleguide` axe + `islands`), the consumer-build proof. No leftover `var(--cairn-*)` for
any renamed token. Review gate clean: `svelte-reviewer` and `daisyui-a11y-reviewer` both returned zero
findings.

**Decisions locked:** the `@theme` mapping (the plan's table) is the showcase's idiomatic token home; the
re-skin recipe documents the new names; `--color-muted`/`--color-card-border` live in `@theme` (so
`text-muted`/`border-card-border` generate) but keep their Tier-2 role; the island-converter is Tier 2
(theme-tokened). The showcase tree is at its terminal floor — the gate now blocks any new bracketed/inline
`var(--…)` in showcase markup.

**Held unpublished** (the showcase template is copied, not imported; no public API or behavior change, no
`CHANGELOG` entry). **Next:** the docs phase (the final phase of the admin idiomatic re-expression
initiative) — publish the role vocabulary as the versioned seam in `admin-design-system.md`, document the
template's owned design and idiomatic chrome the same way, add the upgrade-rehearsal procedure, and wire the
scheduled DaisyUI/Tailwind-major watcher.
