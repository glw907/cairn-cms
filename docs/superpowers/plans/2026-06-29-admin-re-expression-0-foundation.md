# Admin re-expression Phase 0: foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is **Phase 0** of the initiative specified in `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md`. Read the spec first; this plan implements only its "Phase 0: foundation" and the verification deliverables, scoped to what the vocabulary pilot needs plus the durable gate. The later sweep phases (2–6) and the template track get their own just-in-time plans.

**Goal:** Build the foundation the de-customization sweep stands on: a committed Tier-1/2/3 ledger, a frozen semantic role-layer interface, Tier 2 walled into one labeled home, the `check:custom-surface` ratchet gate (seeded, per-tree), and the per-phase visual baseline harness — then adversarially review the result.

**Architecture:** The admin self-styles via a scoped sheet compiled by `scripts/build-admin-css.mjs` from `scripts/admin-css.input.css` (which imports `src/lib/components/cairn-admin.css`). Phase 0 reorganizes that sheet (no behavior change), adds named role utilities through Tailwind 4 `@utility`, and adds CI scripts that model the existing `check-public-tokens.mjs` (whose exported dual-gamut WCAG contrast core this plan reuses). No `.svelte` component is re-expressed in Phase 0 except where a step migrates a retired token reference.

**Tech Stack:** DaisyUI 5.6.6, Tailwind 4.3.2, Svelte 5 runes, lightningcss, postcss-prefix-selector, Vitest 4 (projects: `unit`, `component`, `integration`), `@vitest/browser` + Playwright, culori (already a devDependency).

## Global Constraints

Copied verbatim from the spec; every task implicitly includes these.

- **The five de-customization rules.** (1) Theme values stay in the theme. (2) A named role, a themed value — never `text-[var(--color-muted)]`, never a bare `/60`. (3) A native primitive replaces a hand-rolled one only where 5.6 provably ships one (`status`, `floating-label`, `tab`; not segmented, not card-selectable). (4) Essential custom is walled and documented, load-bearing rules pinned by exact selector. (5) The theme anchors the look; component drift is caught by the screenshot baseline, not waved through.
- **Embed-anywhere (hard floor).** The compiled `dist/components/cairn-admin.css` must stay standalone: scoped under `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`, no global Preflight leakage, `@font-face` appended post-compile. The structural invariants in `src/tests/unit/admin-css-build.test.ts` may never be weakened; only present-class lists may shrink.
- **CodeMirror untouched (hard floor).** The `MarkdownEditor` `EditorView.theme` (directive rails, fold gutter, syntax highlight, media decorations) and the `--cairn-directive-*` / `--cairn-focus-dim-*` / `--cairn-code-chip` / `--cairn-tidy-*` tokens are out of scope.
- **Tier 2 is the floor, not a target.** The a11y ink families, the editor system, the embed-anywhere infrastructure, the two unlayered rules (`.menu` focus, `.cairn-btn-guarded`), the `.btn-primary` lift, the elevation pair, and (pending the ratio table) `--color-muted`/`--color-subtle` all stay. The gate guards them by exact name.
- **Per-task gate.** Targeted test green, then `npm run check` reports 0 errors / 0 warnings, then `npm test` exits 0. Before the phase is called done: `npm run check:comments`, `npm run check:prose`, the new `npm run check:custom-surface`, and a from-scratch showcase e2e.
- **Worktree hazard.** The worktree root `node_modules` is a symlink to the main checkout's shared store; `examples/showcase/node_modules` is its own real dir. Run `npm run package` before `npm test` (the dist sheet must be rebuilt). Do not delete the root `node_modules` symlink.
- **Commit discipline.** Commit specific files, not `git add -A`. Run the `code-simplifier` subagent over changed code before each code commit (docs-only commits are exempt). Imperative mood; `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `docs/internal/design/2026-06-29-custom-surface-ledger.md` | The committed Tier-1/2/3 classification, call-site census, a11y/selector inventories, and resolved investigations | 1 |
| `scripts/admin-css.input.css` | Gains the `@utility` role-layer definitions | 2 |
| `src/lib/components/cairn-admin.css` | Reorganized: Tier 2 walled into one labeled section; role vars adjusted | 2, 3 |
| `src/tests/unit/role-layer-contrast.test.ts` | Locks the role-layer AA floors and the muted/subtle ordering | 2 |
| `src/tests/unit/admin-css-build.test.ts` | Hardened: a comment forbidding invariant weakening; the Tier-2 wall assertions | 3 |
| `scripts/check-custom-surface.mjs` | The ratchet gate: enumerable signals, per-tree budgets, frozen allowlist | 4 |
| `scripts/custom-surface-budget.json` | The seeded budgets and the by-name Tier-2 allowlist | 4 |
| `src/tests/unit/check-custom-surface.test.ts` | Tests the gate's pure functions | 4 |
| `examples/showcase/tests/e2e/admin-visual.spec.ts` | The per-phase Playwright screenshot baseline over the live-components bar | 5 |
| `package.json` | `check:custom-surface` script wired into the gate | 4 |

---

## Task 1: The custom-surface audit ledger and resolved investigations

**Files:**
- Create: `docs/internal/design/2026-06-29-custom-surface-ledger.md`
- Read (no edit): `src/lib/components/cairn-admin.css`, `scripts/admin-css.input.css`, `scripts/build-admin-css.mjs`

**Interfaces:**
- Produces: the canonical token inventory and tier assignment every later task references. The exact Tier-2 token names listed here seed Task 4's allowlist. The presence-only a11y test list and the selector-coupled test list seed the later sweep phases.

This task is an analysis artifact, so its "test" is a coverage assertion: every custom token and every rule in `cairn-admin.css` appears in the ledger exactly once with a tier. It carries no code, so it commits without the `code-simplifier` step.

- [ ] **Step 1: Enumerate the custom surface.** Run these and capture the output into a scratch file:

```bash
cd /home/glw907/Projects/cairn-cms/.claude/worktrees/extensibility-plan-1
# Every custom property DEFINED in the admin sheet:
grep -oE '^\s*--[a-z0-9-]+:' src/lib/components/cairn-admin.css | sed 's/[: ]//g' | sort -u
# Call-site census for the high-volume tokens (admin tree):
for t in color-muted color-subtle cairn-card-border cairn-shadow cairn-warning-ink color-positive-ink cairn-error-ink cairn-error-tint cairn-error-border; do
  printf '%s\t%s\n' "$t" "$(grep -roE "var\(--$t\)|--$t\b|\[var\(--$t\)\]" src/lib/components --include=*.svelte --include=*.css --include=*.ts | wc -l)"
done
# Every @layer components rule selector and every unlayered rule:
grep -nE '^\s*:where\(\[data-theme' src/lib/components/cairn-admin.css
# Arbitrary-token references in markup (the retirement targets):
grep -rnE 'text-\[var\(--color-(muted|subtle)\)\]' src/lib/components --include=*.svelte
```

- [ ] **Step 2: Investigate theme-as-plugin empirically.** The showcase already authors its theme via `@plugin "daisyui/theme"` (see `examples/showcase/src/lib/theme.css`, parsed by `scripts/check-public-tokens.mjs`). Test whether the admin can do the same and still compile self-contained: in a scratch copy, convert the `[data-theme='cairn-admin']` block to a `@plugin "daisyui/theme" { name: "cairn-admin"; ... }` block in `admin-css.input.css`, run `node scripts/build-admin-css.mjs`, and confirm the output still carries the scoped `[data-theme='cairn-admin']` selectors and passes `admin-css-build.test.ts`. Record the result and the recommendation in the ledger. Weigh it against the load-bearing contrast comments that currently co-locate with the raw block (Rule 4): if `@plugin` strips them, the comments must move to the walled Tier-2 home (Task 3) or the raw block stays. Do not change the shipped sheet in this task; this is a recorded finding only.

- [ ] **Step 3: Confirm the `.btn-primary` / `--depth` finding.** Verify in `node_modules/daisyui/components/button.css` that `--depth` is consumed globally and that the native depth shadow has no hover-growth state, confirming the bespoke lift (`cairn-admin.css` `.btn-primary:not(:disabled)`) cannot fold onto it. Record as resolved: the lift stays Tier 2.

- [ ] **Step 4: Inventory the verification gaps.** List, with file and line:
  - The presence-only a11y tests (start from `src/tests/component/MediaPicker.test.ts` — the `live.length >= 2` assertion — and grep for `toBeGreaterThanOrEqual` / `.length` on `[aria-live]` / `role="status"` queries across `src/tests/component/`).
  - The component-test selectors coupled to fold-target classes (grep `src/tests/component/` for `.alert`, `.badge`, `.bg-warning`, and other DaisyUI utility-class `querySelector` literals).

- [ ] **Step 5: Write the ledger.** Create `docs/internal/design/2026-06-29-custom-surface-ledger.md` with: a Tier-1 list (the DaisyUI theme vars), a Tier-2 list (every essential token by exact name, with its locked contrast floor and its reason: ink / editor / embed-anywhere / unlayered-rule / lift / elevation / muted-subtle-pending), a Tier-3 list (the retired token references and any redundant override), the call-site census table, the two verification-gap inventories, and a "Resolved investigations" section (theme-as-plugin decision, the `--depth` finding). This is the input to Task 4's allowlist and the later sweep phases.

- [ ] **Step 6: Coverage check.** Confirm every token from Step 1's definition list appears in the ledger exactly once:

```bash
comm -23 \
  <(grep -oE '^\s*--[a-z0-9-]+:' src/lib/components/cairn-admin.css | sed 's/[: ]//g' | sort -u) \
  <(grep -oE -- '--[a-z0-9-]+' docs/internal/design/2026-06-29-custom-surface-ledger.md | sort -u)
```

Expected: no output (every defined token is classified in the ledger).

- [ ] **Step 7: Commit.**

```bash
git add docs/internal/design/2026-06-29-custom-surface-ledger.md
git commit -m "docs(design): custom-surface Tier-1/2/3 ledger and resolved investigations"
```

---

## Task 2: The semantic role layer and its contrast lock

**Files:**
- Modify: `scripts/admin-css.input.css` (add the `@utility` role definitions)
- Modify: `src/lib/components/cairn-admin.css` (only if a role folds to opacity: drop the now-unused var; otherwise unchanged)
- Create: `src/tests/unit/role-layer-contrast.test.ts`
- Modify: the `.svelte` files that reference `text-[var(--color-muted)]` / `text-[var(--color-subtle)]` (retire the arbitrary-token reference to the new utility)

**Interfaces:**
- Consumes: the ledger's muted/subtle classification and call-site census (Task 1).
- Produces: the **frozen role-layer interface** — the utility class names `text-muted` and `text-subtle`, which the vocabulary pilot (Phase 1) consumes. Once this task lands, these names do not change.
- Reuses: `dualGamutRatio` exported from `scripts/check-public-tokens.mjs`.

The outcome is measured, not assumed: measure first, then either fold to an opacity utility or keep a guaranteed-value utility. Both branches end with a named `text-muted`/`text-subtle` utility and the arbitrary-token reference retired, satisfying Rule 2.

- [ ] **Step 1: Write the measurement-and-lock test (failing).** It composites `base-content` at a candidate alpha over each surface and measures dual-gamut AA, and asserts the muted/subtle ordering. Fill the two alpha constants in Step 3 after reading the printed table.

```ts
// src/tests/unit/role-layer-contrast.test.ts
import { describe, it, expect } from 'vitest';
import { parse, converter } from 'culori';
import { dualGamutRatio } from '../../../scripts/check-public-tokens.mjs';

const toRgb = converter('rgb');

// The Warm Stone surfaces and ink, read from cairn-admin.css (kept here as the test's fixed truth;
// if these change in the sheet, this test must be updated deliberately).
const SURFACES = {
  light: { base100: 'oklch(99% 0.004 75)', base200: 'oklch(96.5% 0.006 75)', content: 'oklch(26% 0.014 75)' },
  dark: { base100: 'oklch(24% 0.01 75)', base200: 'oklch(15.5% 0.009 75)', content: 'oklch(93% 0.006 75)' },
};

/** Composite a foreground oklch at `alpha` over a background oklch, in straight sRGB, as an `rgb(...)` string. */
function compositeOver(fg: string, bg: string, alpha: number): string {
  const f = toRgb(parse(fg)!);
  const b = toRgb(parse(bg)!);
  const mix = (c: 'r' | 'g' | 'b') => f[c] * alpha + b[c] * (1 - alpha);
  return `rgb(${mix('r') * 255} ${mix('g') * 255} ${mix('b') * 255})`;
}

/** The minimum dual-gamut ratio of base-content at `alpha` over base-100 and base-200, in one theme. */
function roleFloor(theme: 'light' | 'dark', alpha: number): number {
  const s = SURFACES[theme];
  const r1 = dualGamutRatio(compositeOver(s.content, s.base100, alpha), s.base100);
  const r2 = dualGamutRatio(compositeOver(s.content, s.base200, alpha), s.base200);
  return Math.min(r1.srgb, r1.p3, r2.srgb, r2.p3);
}

// MEASUREMENT: print the table so the implementer can choose alphas. Not an assertion.
it('prints the role-layer ratio table', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (let a = 50; a <= 100; a += 5) {
      // eslint-disable-next-line no-console
      console.log(theme, `${a}%`, roleFloor(theme, a / 100).toFixed(2));
    }
  }
  expect(true).toBe(true);
});

// LOCK: fill ALPHA_MUTED and ALPHA_SUBTLE from the table in Step 3. Both must clear AA on both
// surfaces in both themes, and subtle must be the stronger (higher alpha) role.
const ALPHA_MUTED = 0; // TODO Step 3
const ALPHA_SUBTLE = 0; // TODO Step 3

describe('role-layer AA floors', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`muted clears AA on both surfaces (${theme})`, () => {
      expect(roleFloor(theme, ALPHA_MUTED)).toBeGreaterThanOrEqual(4.5);
    });
    it(`subtle clears AA on both surfaces (${theme})`, () => {
      expect(roleFloor(theme, ALPHA_SUBTLE)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('subtle is the stronger role', () => {
    expect(ALPHA_SUBTLE).toBeGreaterThan(ALPHA_MUTED);
  });
});
```

- [ ] **Step 2: Run the measurement.** 

```bash
npm run test:unit -- role-layer-contrast
```

Expected: the `prints the role-layer ratio table` test passes and logs the table; the LOCK tests FAIL (alphas are 0).

- [ ] **Step 3: Decide the branch and set the alphas.** Read the table.
  - **Fold branch (if an alpha pair clears 4.5 on both surfaces in both themes with `ALPHA_SUBTLE > ALPHA_MUTED`):** set the two constants to the chosen percentages (e.g. `0.60` / `0.72`). The role utilities will be opacity-based.
  - **Guaranteed-value branch (if no single alpha clears both surfaces in both themes — the spec's expected outcome):** keep `--color-muted` / `--color-subtle` as Tier-2 vars, and set the LOCK constants to a sentinel the test skips (replace the four floor assertions with `it.skip` and a comment citing the ratio table), keeping only the ordering assertion expressed on the vars' measured contrast. Record the branch taken in the ledger.

- [ ] **Step 4: Define the role utilities.** In `scripts/admin-css.input.css`, after the `@import "../src/lib/components/cairn-admin.css";` line, add:

```css
/* The named secondary-text roles. Rule 2: a component writes `text-muted`/`text-subtle`, never an
   arbitrary `[var(--color-muted)]` token. Fold branch: opacity over base-content at the locked alpha.
   Guaranteed-value branch: the role maps to the Tier-2 var, which holds the AA floor the opacity step
   could not. The role names are the frozen interface the pilot consumes. */
@utility text-muted {
  /* FOLD: color: color-mix(in oklab, var(--color-base-content) <ALPHA_MUTED>%, transparent); */
  /* GUARANTEED: */ color: var(--color-muted);
}
@utility text-subtle {
  /* FOLD: color: color-mix(in oklab, var(--color-base-content) <ALPHA_SUBTLE>%, transparent); */
  /* GUARANTEED: */ color: var(--color-subtle);
}
```

Keep exactly one branch per utility (delete the other comment line), matching Step 3.

- [ ] **Step 5: Retire the arbitrary-token references.** For each `.svelte` hit from Task 1 Step 1, replace `text-[var(--color-muted)]` with `text-muted` and `text-[var(--color-subtle)]` with `text-subtle`. (These are the only changes to `.svelte` files in Phase 0.)

- [ ] **Step 6: Rebuild and lock.**

```bash
npm run package            # recompile the admin sheet with the new @utility classes
npm run test:unit -- role-layer-contrast
```

Expected: the LOCK assertions pass (fold branch) or skip with the recorded reason (guaranteed branch); the ordering assertion passes.

- [ ] **Step 7: Full gate.**

```bash
npm run check && npm test
```

Expected: `check` 0/0; `npm test` exits 0 (the retired-reference components keep their tests green).

- [ ] **Step 8: Simplify and commit.** Run the `code-simplifier` subagent over the changed files, apply refinements, then:

```bash
git add scripts/admin-css.input.css src/lib/components/cairn-admin.css src/tests/unit/role-layer-contrast.test.ts src/lib/components/*.svelte
git commit -m "feat(admin): named role-layer utilities, contrast-locked, arbitrary tokens retired"
```

---

## Task 3: Wall Tier 2 into one labeled home

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (reorganize; no value changes)
- Modify: `src/tests/unit/admin-css-build.test.ts` (harden: forbid invariant weakening; assert the wall)

**Interfaces:**
- Consumes: the ledger's Tier-2 list (Task 1).
- Produces: a single labeled Tier-2 section the sweep and the gate (Task 4) treat as the floor.

This is a pure reorganization: the compiled `dist/components/cairn-admin.css` must stay functionally identical (the existing build invariants are the proof). Move, do not rewrite.

- [ ] **Step 1: Capture the current compiled output as the baseline.**

```bash
npm run package
cp dist/components/cairn-admin.css /tmp/cairn-admin-before.css
```

- [ ] **Step 2: Reorganize the source sheet.** In `src/lib/components/cairn-admin.css`, group all Tier-2 essential custom under one clearly delimited section with a header comment, in this order, each token keeping its existing locked-contrast comment co-located:
  - a `/* ===== TIER 2: ESSENTIAL CUSTOM (the documented floor) ===== */` banner with a one-paragraph statement of why this section exists and the rule that it may only shrink with a ledger update;
  - the a11y ink families (`--cairn-warning-ink`, `--color-positive-ink`, `--cairn-error-*`, the tidy tints);
  - the editor system tokens (`--cairn-directive-*`, `--cairn-focus-dim-*`, `--cairn-code-chip`);
  - the elevation pair (`--cairn-shadow`, `--cairn-card-border`);
  - the muted/subtle vars (if the guaranteed-value branch was taken in Task 2);
  - a `/* ----- Load-bearing rules (break these and the admin renders wrong) ----- */` sub-banner over the embed-anywhere resets, the `@layer components` block, and the two unlayered rules, each annotated with the exact selector the gate pins and the bug it prevents.
  
  The theme-variable blocks (Tier 1) stay where they are. Do not change any value; move declarations only.

- [ ] **Step 3: Prove the compiled output is unchanged.**

```bash
npm run package
diff /tmp/cairn-admin-before.css dist/components/cairn-admin.css && echo "IDENTICAL"
```

Expected: `IDENTICAL` (reorganizing the source must not change the compiled bytes, since order within a declaration block does not affect the cascade for distinct properties; if a real diff appears, a declaration moved across a selector boundary — fix it).

- [ ] **Step 4: Harden the build test.** In `src/tests/unit/admin-css-build.test.ts`, add at the top a block comment stating the non-negotiable rule, and add an assertion that the two unlayered rules are present by exact selector:

```ts
// INVARIANT DISCIPLINE (do not weaken). The assertions below guard the embed-anywhere and
// cascade-layer contracts. As the sheet shrinks, a present-class LIST may lose an entry, but no
// invariant assertion may be removed or relaxed. Dropping `not.toMatch` here re-opens a real shipped
// bug (the drawer display:block, the auth-page centering). check:custom-surface guards the same rules
// structurally; this test guards the compiled output.
it('keeps the two load-bearing unlayered rules by exact selector', () => {
  const css = buildOutput; // the compiled string this suite already builds
  expect(css).toContain('.menu li');           // the unlayered :focus-visible focus ring
  expect(css).toContain('.cairn-btn-guarded'); // the unlayered pointer-events restore
});
```

(Use the suite's existing compiled-output variable name in place of `buildOutput`.)

- [ ] **Step 5: Run the build test and the full gate.**

```bash
npm run test:unit -- admin-css-build
npm run check && npm test
```

Expected: all green.

- [ ] **Step 6: Simplify and commit.**

```bash
git add src/lib/components/cairn-admin.css src/tests/unit/admin-css-build.test.ts
git commit -m "refactor(admin): wall Tier-2 essential custom into one labeled section"
```

---

## Task 4: The `check:custom-surface` ratchet gate

**Files:**
- Create: `scripts/check-custom-surface.mjs`
- Create: `scripts/custom-surface-budget.json`
- Create: `src/tests/unit/check-custom-surface.test.ts`
- Modify: `package.json` (add the `check:custom-surface` script)

**Interfaces:**
- Consumes: the ledger's Tier-2 allowlist by exact name (Task 1), the walled sheet (Task 3).
- Produces: `npm run check:custom-surface`, the durable line-holder. Exported pure functions: `pinnedUnlayeredRules(css): string[]`, `componentsLayerSelectorCount(css): number`, `retiredTokenHits(dir): {file,line,text}[]`, `evaluate(budget): {pass, failures}`.

Model the structure on `scripts/check-public-tokens.mjs`: exported pure functions plus a `main()` runner guarded by the direct-invocation check, scanning per-tree, reporting `file:line`.

- [ ] **Step 1: Write the gate's unit tests (failing).**

```ts
// src/tests/unit/check-custom-surface.test.ts
import { describe, it, expect } from 'vitest';
import { pinnedUnlayeredRules, retiredTokenHits } from '../../../scripts/check-custom-surface.mjs';

describe('pinnedUnlayeredRules', () => {
  it('finds exactly the two sanctioned unlayered rules', () => {
    const css = `
      @layer components { :where([data-theme='cairn-admin']) a { color: inherit; } }
      :where([data-theme='cairn-admin']) .menu li > a:focus-visible { outline: 2px solid; }
      :where([data-theme='cairn-admin']) .btn.cairn-btn-guarded[aria-disabled='true'] { pointer-events: auto; }
    `;
    const rules = pinnedUnlayeredRules(css);
    expect(rules).toHaveLength(2);
    expect(rules.join(' ')).toContain('.menu');
    expect(rules.join(' ')).toContain('.cairn-btn-guarded');
  });
});

describe('retiredTokenHits', () => {
  it('flags an arbitrary muted/subtle token reference in markup', () => {
    // Point at a fixture dir containing one .svelte with `text-[var(--color-muted)]`.
    const hits = retiredTokenHits('src/tests/fixtures/retired-token');
    expect(hits.length).toBeGreaterThan(0);
  });
});
```

Create the fixture: `src/tests/fixtures/retired-token/Bad.svelte` containing a line with `class="text-[var(--color-muted)]"`.

- [ ] **Step 2: Run to confirm failure.**

```bash
npm run test:unit -- check-custom-surface
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the gate.** Write `scripts/check-custom-surface.mjs`:

```js
// cairn-cms: the custom-surface ratchet gate. Holds the admin and showcase trees to their de-customized
// floor on enumerable signals (not line counts, which are gameable and would flag sanctioned patterns):
//   (1) the unlayered-rule set, pinned by exact selector — neither deletable nor extendable without an
//       allowlist change; (2) a cap on @layer components rule selectors per tree; (3) zero arbitrary
//       retired-token references (text-[var(--color-muted|subtle)]) in markup. Budgets and the by-name
//       Tier-2 allowlist live in scripts/custom-surface-budget.json, seeded at current values and
//       lowered by each sweep phase. Wired as `npm run check:custom-surface`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The unlayered rules (a scoped rule NOT inside `@layer components`) in an admin sheet, by selector. */
export function pinnedUnlayeredRules(css) {
  // Strip @layer components blocks, then collect remaining scoped rule selectors.
  const withoutLayer = css.replace(/@layer\s+components\s*\{[\s\S]*?\n\}/g, '');
  const out = [];
  for (const m of withoutLayer.matchAll(/(:where\(\[data-theme=[^{]*?)\s*\{/g)) {
    out.push(m[1].trim());
  }
  return out;
}

/** Files under a dir matching an extension predicate, recursively. */
function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(name)) out.push(full);
  }
  return out;
}

/** Arbitrary retired-token references in `.svelte` markup under a dir. */
export function retiredTokenHits(dir) {
  const pat = /text-\[var\(--color-(?:muted|subtle)\)\]/;
  const hits = [];
  for (const file of walk(resolve(ROOT, dir), (n) => n.endsWith('.svelte'))) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (pat.test(line)) hits.push({ file: relative(ROOT, file), line: i + 1, text: line.trim() });
    });
  }
  return hits;
}

/** Count of @layer components rule selectors in an admin sheet. */
export function componentsLayerSelectorCount(css) {
  const m = css.match(/@layer\s+components\s*\{([\s\S]*?)\n\}/);
  if (!m) return 0;
  return [...m[1].matchAll(/:where\(\[data-theme=[^{]*?\{/g)].length;
}

/** Evaluate one tree against its budget. Returns { pass, failures: string[] }. */
export function evaluate(tree, budget) {
  const failures = [];
  if (tree.adminCss) {
    const css = readFileSync(resolve(ROOT, tree.adminCss), 'utf8');
    const unlayered = pinnedUnlayeredRules(css);
    const expected = budget.unlayeredAllowlist;
    if (unlayered.length !== expected.length)
      failures.push(`unlayered rules: found ${unlayered.length}, allowlist has ${expected.length}`);
    for (const sel of unlayered)
      if (!expected.some((e) => sel.includes(e)))
        failures.push(`unsanctioned unlayered rule: ${sel}`);
    const layerCount = componentsLayerSelectorCount(css);
    if (layerCount > budget.componentsLayerCap)
      failures.push(`@layer components selectors: ${layerCount} > cap ${budget.componentsLayerCap}`);
  }
  for (const dir of tree.markupDirs) {
    const hits = retiredTokenHits(dir);
    for (const h of hits) failures.push(`retired token: ${h.file}:${h.line}  ${h.text}`);
  }
  return { pass: failures.length === 0, failures };
}

function main() {
  const budget = JSON.parse(readFileSync(resolve(ROOT, 'scripts/custom-surface-budget.json'), 'utf8'));
  let failed = false;
  for (const [name, tree] of Object.entries(budget.trees)) {
    const { pass, failures } = evaluate(tree, tree.budget);
    if (pass) {
      console.log(`custom-surface [${name}]: PASS`);
    } else {
      console.error(`custom-surface [${name}]: FAIL`);
      for (const f of failures) console.error(`  ${f}`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 4: Seed the budget at current measured values.** Create `scripts/custom-surface-budget.json`, filling `componentsLayerCap` and `unlayeredAllowlist` from the live sheet (run the gate's functions once to read them) and the showcase tree from the ledger:

```json
{
  "trees": {
    "admin": {
      "adminCss": "src/lib/components/cairn-admin.css",
      "markupDirs": ["src/lib/components"],
      "budget": {
        "unlayeredAllowlist": [".menu li", ".cairn-btn-guarded"],
        "componentsLayerCap": 0
      }
    },
    "showcase": {
      "adminCss": null,
      "markupDirs": ["examples/showcase/src"],
      "budget": { "unlayeredAllowlist": [], "componentsLayerCap": 0 }
    }
  }
}
```

Set `componentsLayerCap` to the value `componentsLayerSelectorCount` returns for the current sheet (seed at current, so the gate passes on day one). Record in the ledger that each sweep phase lowers this cap to its post-sweep count.

- [ ] **Step 5: Wire the script.** In `package.json` scripts, add:

```json
"check:custom-surface": "npm run package && node scripts/check-custom-surface.mjs"
```

- [ ] **Step 6: Run the gate's tests and the gate itself.**

```bash
npm run test:unit -- check-custom-surface
npm run check:custom-surface
```

Expected: tests pass; the gate prints `PASS` for both trees (it is seeded at current).

- [ ] **Step 7: Full gate.**

```bash
npm run check && npm test
```

- [ ] **Step 8: Simplify and commit.**

```bash
git add scripts/check-custom-surface.mjs scripts/custom-surface-budget.json src/tests/unit/check-custom-surface.test.ts src/tests/fixtures/retired-token/Bad.svelte package.json
git commit -m "feat(ci): check:custom-surface ratchet gate, seeded per-tree"
```

---

## Task 5: The per-phase visual baseline harness

**Files:**
- Create: `examples/showcase/tests/e2e/admin-visual.spec.ts`
- Read: the showcase Playwright config (`examples/showcase/playwright.config.*`) and the live-components-bar route (the admin shell the showcase mounts at `/admin/posts`, per the design system)

**Interfaces:**
- Produces: `toHaveScreenshot` baselines over the live-components bar, run per sweep phase; the committed baseline update is the record of intended drift. The later sweep plans reference this spec.

The component tests import the variables-only partial and cannot see DaisyUI-component visual regressions, so this Playwright baseline against the built showcase is the only automated visual net during the sweep.

- [ ] **Step 1: Confirm the showcase e2e harness.** Inspect `examples/showcase` for its Playwright setup (`test:e2e` runs `CI=1 npm --prefix examples/showcase run test:e2e`). Identify the route that renders the authed admin shell (the live-components bar). If a dedicated bar route does not exist, use `/admin/posts` (the design system states the showcase mounts the authed shell there).

- [ ] **Step 2: Write the screenshot spec.**

```ts
// examples/showcase/tests/e2e/admin-visual.spec.ts
import { test, expect } from '@playwright/test';

// The per-phase visual baseline. A sweep phase that intentionally shifts a surface updates the
// committed snapshot in the same commit; that update is the reviewed record of intended drift.
test('admin office shell — light', async ({ page }) => {
  await page.goto('/admin/posts');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page).toHaveScreenshot('admin-office-light.png', { fullPage: true });
});

test('admin office shell — dark', async ({ page }) => {
  await page.goto('/admin/posts');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page).toHaveScreenshot('admin-office-dark.png', { fullPage: true });
});
```

(If the showcase admin needs an authenticated session for `/admin/posts`, reuse the existing e2e's auth/setup fixture — check how the current showcase e2e signs in, and mirror it.)

- [ ] **Step 3: Generate and commit the baseline.**

```bash
npm run package
cd examples/showcase && CI=1 npx playwright test admin-visual --update-snapshots ; cd ../..
```

Expected: baseline PNGs written under the showcase test snapshots dir.

- [ ] **Step 4: Re-run to confirm the baseline is stable (no diff on a second run).**

```bash
cd examples/showcase && CI=1 npx playwright test admin-visual ; cd ../..
```

Expected: PASS (the baseline matches itself).

- [ ] **Step 5: Commit.**

```bash
git add examples/showcase/tests/e2e/admin-visual.spec.ts examples/showcase/tests/e2e/admin-visual.spec.ts-snapshots
git commit -m "test(showcase): per-phase admin visual baseline over the live-components bar"
```

---

## Task 6: Adversarial review of the Phase 0 foundation

**Files:** none (review + triage; any fixes land as follow-up commits to the relevant task's files).

This is the review gate the spec requires before Phase 0 is called done and before the pilot starts. It mirrors the spec's own four-lens review.

- [ ] **Step 1: Confirm the gate is green end to end.**

```bash
npm run check && npm test && npm run check:comments && npm run check:prose && npm run check:custom-surface
cd examples/showcase && CI=1 npm run test:e2e ; cd ../..
```

Expected: all pass.

- [ ] **Step 2: Dispatch the adversarial review.** Fan out fresh (not fork) reviewers in parallel, each read-only, on distinct lenses, against the Phase 0 deliverables (the ledger, the role layer, the walled sheet, the gate, the visual baseline):
  - **Gate-integrity lens:** is `check:custom-surface` deterministic and ungameable? Can a new bespoke override slip past the three signals? Is the seed honest (does it actually pass on current and fail on a planted violation)? Plant a violation and confirm it fails.
  - **Embed-anywhere lens:** does the Task 3 reorganization keep the compiled sheet standalone and the invariants intact? Did any declaration move across a selector boundary? Re-run the build diff.
  - **Role-layer lens:** is the frozen interface (`text-muted`/`text-subtle`) correct, and is the fold-vs-guaranteed decision faithful to the measured table? Does any retired-reference component now render the wrong tone?
  - **a11y/contract lens:** did retiring the tokens or walling Tier 2 disturb any focus, live-region, or roving-tabindex contract? Spot-check the components that changed.
- [ ] **Step 3: Triage in the main loop.** Collect the findings, separate real from noise, and fold the survivors as follow-up commits to the owning task's files. Re-run the full gate after each fix.
- [ ] **Step 4: Freeze the role interface.** Once the review is clean, record in the ledger that the role-layer interface is frozen: the pilot (Phase 1) may consume `text-muted`/`text-subtle` and the walled Tier 2, and no later investigation reshapes them.
- [ ] **Step 5: Commit the review record.**

```bash
git add docs/internal/design/2026-06-29-custom-surface-ledger.md
git commit -m "docs(design): record Phase 0 adversarial review and freeze the role interface"
```

---

## Self-review

**Spec coverage.** Phase 0 deliverables in the spec map to tasks: the Tier-1/2/3 ledger → Task 1; the frozen role-layer interface + ratio table → Task 2; Tier 2 walled into one labeled home + load-bearing invariant list → Task 3; `check:custom-surface` seeded per-tree as a hard exit criterion → Task 4; the per-phase visual baseline (a verification deliverable) → Task 5; the resolved investigations (theme-as-plugin, `.btn-primary`/`--depth`) → Task 1 Steps 2–3; the structural-invariant hardening → Task 3 Step 4; the presence-only a11y and selector-coupled inventories → Task 1 Step 4; the adversarial review → Task 6. The scheduled upgrade watcher and the broad audit beyond the pilot's primitives are deferred to the final docs phase and the sweep, per the spec's scoped-Phase-0 decision, so they are intentionally absent here.

**Placeholder scan.** The two role-layer alphas are intentionally measured-then-filled (Task 2 Steps 2–3 make this an explicit measure-and-lock, not a placeholder); the `componentsLayerCap` seed is read from the live sheet (Task 4 Step 4); the compiled-output variable name in Task 3 Step 4 is the suite's existing one. No "TBD"/"handle edge cases"/"similar to Task N" remain.

**Type consistency.** The gate's exported names (`pinnedUnlayeredRules`, `retiredTokenHits`, `componentsLayerSelectorCount`, `evaluate`) match between Task 4's interface block, its test (Step 1), and its implementation (Step 3). `dualGamutRatio` is the real export from `check-public-tokens.mjs`. The role utility names `text-muted`/`text-subtle` are consistent across Tasks 2, 4, and 6.
