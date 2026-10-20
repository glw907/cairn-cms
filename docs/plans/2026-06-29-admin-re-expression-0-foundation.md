# Admin re-expression Phase 0: foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is **Phase 0** of the initiative specified in `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md`. Read the spec first; this plan implements only its "Phase 0: foundation" and the verification deliverables, scoped to what the vocabulary pilot needs plus the durable gate. The later sweep phases (2–6) and the template track get their own just-in-time plans.
>
> **This plan was adversarially reviewed (code-correctness and executability lenses) before publication, and the findings are folded in.** The "review corrections" note at the end records what changed and why, so the trail survives.

**Goal:** Build the foundation the de-customization sweep stands on: a committed Tier-1/2/3 ledger, a frozen semantic role-layer interface, Tier 2 walled into one labeled home, the `check:custom-surface` ratchet gate (seeded, per-tree), and the per-phase visual baseline harness — then adversarially review the result.

**Architecture:** The admin self-styles via a scoped sheet compiled by `scripts/build-admin-css.mjs` from `scripts/admin-css.input.css` (which imports `src/lib/components/cairn-admin.css`). Phase 0 reorganizes that sheet (no behavior change), adds named role utilities through Tailwind 4 `@utility`, and adds CI scripts that model the existing `check-public-tokens.mjs` (whose exported dual-gamut WCAG contrast core this plan reuses). Phase 0 retires the retired-token references only on the pilot-adjacent surfaces (enough to exercise the new utility); the bulk retirement across the other components distributes through the sweep phases, tracked by the gate's ratcheting retired-token budget.

**Tech Stack:** DaisyUI 5.6.6, Tailwind 4.3.2, Svelte 5 runes, lightningcss, postcss-prefix-selector, Vitest 4 (projects: `unit`, `component`, `integration`), standalone Playwright in `examples/showcase/e2e/`, culori (already a devDependency).

## Global Constraints

Copied verbatim from the spec; every task implicitly includes these.

- **The five de-customization rules.** (1) Theme values stay in the theme. (2) A named role, a themed value — never `text-[var(--color-muted)]`, never a bare `/60`. (3) A native primitive replaces a hand-rolled one only where 5.6 provably ships one (`status`, `floating-label`, `tab`; not segmented, not card-selectable). (4) Essential custom is walled and documented, load-bearing rules pinned by exact selector. (5) The theme anchors the look; component drift is caught by the screenshot baseline, not waved through.
- **Embed-anywhere (hard floor).** The compiled `dist/components/cairn-admin.css` must stay standalone: scoped under `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`, no global Preflight leakage, `@font-face` appended post-compile. The structural invariants in `src/tests/unit/admin-css-build.test.ts` may never be weakened; only present-class lists may shrink.
- **CodeMirror untouched (hard floor).** The `MarkdownEditor` `EditorView.theme` and the `--cairn-directive-*` / `--cairn-focus-dim-*` / `--cairn-code-chip` / `--cairn-tidy-*` tokens are out of scope.
- **Tier 2 is the floor, not a target.** The a11y ink families, the editor system, the embed-anywhere infrastructure, the two unlayered rules (`.menu` focus, `.cairn-btn-guarded`), the `.btn-primary` lift, the elevation pair, and (pending the ratio table) `--color-muted`/`--color-subtle` all stay. The gate guards them by exact name.
- **Per-task gate.** Targeted test green, then `npm run check` reports 0 errors / 0 warnings, then `npm test` exits 0. Before the phase is called done: `npm run check:comments`, `npm run check:prose`, the new `npm run check:custom-surface`, and a from-scratch showcase e2e.
- **Worktree hazard.** The worktree root `node_modules` is a symlink to the main checkout's shared store; `examples/showcase/node_modules` is its own real dir. Run `npm run package` before `npm test` (the dist sheet must be rebuilt). Do not delete the root `node_modules` symlink.
- **Commit discipline.** Commit specific files, not `git add -A`. Run the `code-simplifier` subagent over changed code before each code commit (docs-only commits are exempt; "too small" is not a valid skip). Imperative mood; `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `docs/internal/design/2026-06-29-custom-surface-ledger.md` | The committed Tier-1/2/3 classification, call-site census, a11y/selector inventories, resolved investigations | 1 |
| `scripts/admin-css.input.css` | Gains the `@utility` role-layer definitions | 2 |
| `src/lib/components/cairn-admin.css` | Reorganized: Tier 2 walled into one labeled section; role vars adjusted | 2, 3 |
| `src/tests/unit/role-layer-contrast.test.ts` | Locks the role-layer AA floors and the muted/subtle ordering | 2 |
| `src/tests/unit/admin-css-build.test.ts` | Hardened: forbids invariant weakening; pins the two unlayered rules | 3 |
| `scripts/check-custom-surface.mjs` | The ratchet gate: enumerable signals, per-tree budgets, frozen allowlist | 4 |
| `scripts/custom-surface-budget.json` | The seeded budgets and the by-name Tier-2 allowlist | 4 |
| `src/tests/unit/check-custom-surface.test.ts` | Tests the gate's pure functions | 4 |
| `examples/showcase/e2e/admin-visual.spec.ts` | The per-phase Playwright screenshot baseline over the live-components bar | 5 |
| `package.json` | `check:custom-surface` script wired into the gate | 4 |

---

## Task 1: The custom-surface audit ledger and resolved investigations

**Files:**
- Create: `docs/internal/design/2026-06-29-custom-surface-ledger.md`
- Read (no edit): `src/lib/components/cairn-admin.css`, `scripts/admin-css.input.css`, `scripts/build-admin-css.mjs`

**Interfaces:**
- Produces: the canonical token inventory and tier assignment every later task references. The exact Tier-2 token names listed here seed Task 4's allowlist; the call-site census seeds Task 4's retired-token budget; the presence-only a11y test list and the selector-coupled test list seed the later sweep phases.

This task is an analysis artifact, so its "test" is a coverage assertion. It carries no code, so it commits without the `code-simplifier` step.

- [ ] **Step 1: Enumerate the custom surface.** Run these and capture the output into a scratch file:

```bash
cd /home/glw907/Projects/cairn-cms/.claude/worktrees/extensibility-plan-1
# Every custom property DEFINED in the admin sheet:
grep -oE '^\s*--[a-z0-9-]+:' src/lib/components/cairn-admin.css | sed 's/[: ]//g' | sort -u
# Call-site census for the high-volume tokens (admin tree):
for t in color-muted color-subtle cairn-card-border cairn-shadow cairn-warning-ink color-positive-ink cairn-error-ink cairn-error-tint cairn-error-border; do
  printf '%s\t%s\n' "$t" "$(grep -roE "var\(--$t\)|--$t\b|\[var\(--$t\)\]" src/lib/components --include=*.svelte --include=*.css --include=*.ts | wc -l)"
done
# The exact retired-token reference count (the gate's retired-token seed) and the files holding them:
grep -rlE 'text-\[var\(--color-(muted|subtle)\)\]' src/lib/components --include=*.svelte
grep -rcE 'text-\[var\(--color-(muted|subtle)\)\]' src/lib/components --include=*.svelte | awk -F: '{s+=$2} END {print "total occurrences:", s}'
```

- [ ] **Step 2: Investigate theme-as-plugin empirically.** The showcase already authors its theme via `@plugin "daisyui/theme"` (see `examples/showcase/src/lib/theme.css`, parsed by `scripts/check-public-tokens.mjs`). Test whether the admin can do the same and still compile self-contained: in a scratch copy, convert the `[data-theme='cairn-admin']` block to a `@plugin "daisyui/theme" { name: "cairn-admin"; ... }` block in `admin-css.input.css`, run `node scripts/build-admin-css.mjs`, and confirm the output still carries the scoped `[data-theme='cairn-admin']` selectors and passes `admin-css-build.test.ts`. The likely finding: `@plugin` compiles fine (it is proven in the showcase) but strips the load-bearing contrast comments that co-locate with the raw block (Rule 4), so the raw block stays unless the comments are moved to the walled Tier-2 home in Task 3. Record the result and recommendation in the ledger. Do not change the shipped sheet in this task; this is a recorded finding only.

- [ ] **Step 3: Confirm the `.btn-primary` / `--depth` finding.** Verify in `node_modules/daisyui/components/button.css` that `--depth` is consumed globally and that the native depth shadow has no hover-growth state, confirming the bespoke lift (`cairn-admin.css` `.btn-primary:not(:disabled)`) cannot fold onto it. Record as resolved: the lift stays Tier 2.

- [ ] **Step 4: Inventory the verification gaps.** List, with file and line:
  - The presence-only a11y tests (start from `src/tests/component/MediaPicker.test.ts` — the `live.length >= 2` assertion — and grep `src/tests/component/` for `toBeGreaterThanOrEqual` / `.length` on `[aria-live]` / `role="status"` queries).
  - The component-test selectors coupled to fold-target classes (grep `src/tests/component/` for `.alert`, `.badge`, `.bg-warning`, and other DaisyUI utility-class `querySelector` literals).

- [ ] **Step 5: Write the ledger.** Create `docs/internal/design/2026-06-29-custom-surface-ledger.md` with: a Tier-1 list (the DaisyUI theme vars), a Tier-2 list (every essential token by exact name, with its locked contrast floor and reason: ink / editor / embed-anywhere / unlayered-rule / lift / elevation / muted-subtle-pending), a Tier-3 list (the retired token references and any redundant override), the call-site census table, the two verification-gap inventories, a "Resolved investigations" section (theme-as-plugin, `--depth`), and the **retired-token seed** (the total occurrence count from Step 1, which Task 4 seeds the gate budget at and the sweep ratchets to zero).

- [ ] **Step 6: Coverage check.** Confirm every defined token is mentioned in the ledger (the tier assignment itself is verified in the Task 6 review, not by this grep):

```bash
comm -23 \
  <(grep -oE '^\s*--[a-z0-9-]+:' src/lib/components/cairn-admin.css | sed 's/[: ]//g' | sort -u) \
  <(grep -oE -- '--[a-z0-9-]+' docs/internal/design/2026-06-29-custom-surface-ledger.md | sort -u)
```

Expected: no output (every defined token is mentioned in the ledger).

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
- Modify: the **pilot-adjacent** `.svelte` files only (the live-components-bar surface and `CairnTidySettings.svelte`, the pilot's twin) — retire their arbitrary-token references to the new utility, enough to exercise it

**Interfaces:**
- Consumes: the ledger's muted/subtle classification and retired-token seed (Task 1).
- Produces: the **frozen role-layer interface** — the utility class names `text-muted` and `text-subtle`, which the vocabulary pilot (Phase 1) consumes. Once this task lands, these names do not change.
- Reuses: `dualGamutRatio` exported from `scripts/check-public-tokens.mjs`.

The outcome is measured, not assumed: measure first, then either fold to an opacity utility or keep a guaranteed-value utility. Both branches end with a named `text-muted`/`text-subtle` utility. The bulk retirement across the other ~20 components is NOT done here; it distributes across the sweep phases, tracked by the gate's retired-token budget (Task 4). Phase 0 retires only the pilot-adjacent surfaces so the utility compiles and the pilot has a proven pattern.

- [ ] **Step 1: Write the measurement-and-lock test (failing).** It composites `base-content` at a candidate alpha over each surface **in oklab** (matching Tailwind's `color-mix(in oklab, var(--color-base-content) NN%, transparent)`, which the admin actually paints) and measures dual-gamut AA, then asserts the muted/subtle ordering.

```ts
// src/tests/unit/role-layer-contrast.test.ts
import { describe, it, expect } from 'vitest';
import { parse, converter, interpolate } from 'culori';
import { dualGamutRatio } from '../../../scripts/check-public-tokens.mjs';

const toRgb = converter('rgb');

// The Warm Stone surfaces and ink, read from cairn-admin.css (the test's fixed truth; if these values
// change in the sheet, update this deliberately).
const SURFACES = {
  light: { base100: 'oklch(99% 0.004 75)', base200: 'oklch(96.5% 0.006 75)', content: 'oklch(26% 0.014 75)' },
  dark: { base100: 'oklch(24% 0.01 75)', base200: 'oklch(15.5% 0.009 75)', content: 'oklch(93% 0.006 75)' },
};

/** base-content at `alpha` over a surface, matching Tailwind's color-mix(in oklab, …, transparent),
 * then alpha-composited over the surface, returned as an `rgb(...)` string for dualGamutRatio. */
function compositeOver(fg: string, bg: string, alpha: number): string {
  const mixed = interpolate([fg, 'transparent'], 'oklab')(1 - alpha);
  const a = mixed.alpha ?? 1;
  const m = toRgb(mixed)!;
  const b = toRgb(parse(bg)!)!;
  const ch = (c: 'r' | 'g' | 'b') => (m[c] * a + b[c] * (1 - a)) * 255;
  return `rgb(${ch('r')} ${ch('g')} ${ch('b')})`;
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

// LOCK: fill ALPHA_MUTED and ALPHA_SUBTLE from the table in Step 3 (fold branch), or convert to the
// guaranteed-value branch per Step 3.
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

Expected: the `prints the role-layer ratio table` test passes and logs the table; the LOCK tests FAIL (alphas are 0, so `roleFloor(…, 0)` is ~1.0 and `0 > 0` is false).

- [ ] **Step 3: Decide the branch and set the alphas.** Read the table.
  - **Fold branch (an alpha pair clears 4.5 on both surfaces in both themes with `ALPHA_SUBTLE > ALPHA_MUTED`):** set the two constants to the chosen fractions (e.g. `0.62` / `0.74`). The role utilities will be opacity-based.
  - **Guaranteed-value branch (no single alpha clears both surfaces in both themes):** keep `--color-muted`/`--color-subtle` as Tier-2 vars, and replace the four floor `it()` blocks with `it.skip` carrying a comment citing the ratio table, keeping the ordering assertion expressed on the vars' measured `dualGamutRatio`. Record the branch in the ledger.

- [ ] **Step 4: Define the role utilities.** In `scripts/admin-css.input.css`, after the `@import "../src/lib/components/cairn-admin.css";` line, add the branch chosen in Step 3 (keep one `color:` line per utility, delete the other):

```css
/* The named secondary-text roles. Rule 2: a component writes `text-muted`/`text-subtle`, never an
   arbitrary `[var(--color-muted)]` token. NOTE: a Tailwind `@utility` is tree-shaken — the rule only
   compiles into the sheet when the class appears in scanned markup (@source globs the components), so
   the rebuild in Step 6 must follow the Step 5 retirement, and Step 6 asserts the rule is present. */
@utility text-muted {
  /* FOLD: */ color: color-mix(in oklab, var(--color-base-content) 62%, transparent);
  /* GUARANTEED: color: var(--color-muted); */
}
@utility text-subtle {
  /* FOLD: */ color: color-mix(in oklab, var(--color-base-content) 74%, transparent);
  /* GUARANTEED: color: var(--color-subtle); */
}
```

- [ ] **Step 5: Retire the pilot-adjacent references only.** Replace `text-[var(--color-muted)]` with `text-muted` and `text-[var(--color-subtle)]` with `text-subtle` in **only** the live-components-bar surface and `src/lib/components/CairnTidySettings.svelte` (the pilot's twin). Leave the other components for their sweep phase; the gate's retired-token budget (Task 4) tracks the remainder down to zero.

- [ ] **Step 6: Rebuild, assert the utility compiled, and lock.**

```bash
npm run package
grep -q 'text-muted' dist/components/cairn-admin.css && grep -q 'text-subtle' dist/components/cairn-admin.css && echo "ROLE UTILITIES PRESENT"
npm run test:unit -- role-layer-contrast
```

Expected: `ROLE UTILITIES PRESENT` (the classes survived tree-shaking because Step 5 put them in markup); the LOCK assertions pass (fold) or skip with the recorded reason (guaranteed); the ordering assertion passes.

- [ ] **Step 7: Full gate.**

```bash
npm run check && npm test
```

- [ ] **Step 8: Simplify and commit.** Run the `code-simplifier` subagent over the changed files, apply refinements, then:

```bash
git add scripts/admin-css.input.css src/lib/components/cairn-admin.css src/tests/unit/role-layer-contrast.test.ts src/lib/components/CairnTidySettings.svelte
git commit -m "feat(admin): named role-layer utilities, contrast-locked; retire pilot-adjacent tokens"
```

---

## Task 3: Wall Tier 2 into one labeled home

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (reorganize; no value changes)
- Modify: `src/tests/unit/admin-css-build.test.ts` (harden: forbid invariant weakening; pin the two unlayered rules)

**Interfaces:**
- Consumes: the ledger's Tier-2 list (Task 1).
- Produces: a single labeled Tier-2 section the sweep and the gate (Task 4) treat as the floor.

This is a pure reorganization (move declarations, change no value). The compiled sheet's *cascade* must be unchanged. Note: the build pipeline preserves source declaration order, so the compiled bytes will differ after a reorder; the proof of no-behavior-change is cascade-equivalence (the same set of declarations) plus the structural invariants, not a byte diff.

- [ ] **Step 1: Capture the current compiled output as the baseline.**

```bash
npm run package
cp dist/components/cairn-admin.css /tmp/cairn-admin-before.css
```

- [ ] **Step 2: Reorganize the source sheet.** In `src/lib/components/cairn-admin.css`, group all Tier-2 essential custom under one delimited section with a header comment, in this order, each token keeping its existing locked-contrast comment co-located:
  - a `/* ===== TIER 2: ESSENTIAL CUSTOM (the documented floor) ===== */` banner with a one-paragraph statement of why this section exists and the rule that it may only shrink with a ledger update;
  - the a11y ink families (`--cairn-warning-ink`, `--color-positive-ink`, `--cairn-error-*`, the tidy tints);
  - the editor system tokens (`--cairn-directive-*`, `--cairn-focus-dim-*`, `--cairn-code-chip`);
  - the elevation pair (`--cairn-shadow`, `--cairn-card-border`);
  - the muted/subtle vars (if the guaranteed-value branch was taken in Task 2);
  - a `/* ----- Load-bearing rules (break these and the admin renders wrong) ----- */` sub-banner over the embed-anywhere resets, the `@layer components` block, and the two unlayered rules, each annotated with the exact selector the gate pins and the bug it prevents.

  The theme-variable blocks (Tier 1) stay where they are. **Important:** keep each var declaration inside the same theme-root block (`[data-theme='cairn-admin']` light, `[data-theme='cairn-admin-dark']` dark) it lives in today — moving a declaration across a selector boundary changes the cascade. Reorder *within* a block only, or move whole comment-plus-declaration runs that already sit in the same block.

- [ ] **Step 3: Prove cascade-equivalence (not byte-identity).**

```bash
npm run package
# The compiled bytes WILL differ (the pipeline preserves source order); the cascade must not. A
# position-independent comparison of the declaration set proves no rule was added, dropped, or moved
# across a selector:
diff <(sort /tmp/cairn-admin-before.css) <(sort dist/components/cairn-admin.css) && echo "CASCADE-EQUIVALENT"
```

Expected: `CASCADE-EQUIVALENT`. If the sorted diff is non-empty, a declaration changed value or moved across a selector boundary — fix it. The structural invariants in Step 4 plus the existing `admin-css-build.test.ts` assertions are the behavioral proof.

- [ ] **Step 4: Harden the build test.** In `src/tests/unit/admin-css-build.test.ts`, add a block comment stating the non-negotiable rule, and add an `it()` **inside the existing `describe` block, after the `beforeAll`** that builds the sheet, referencing that suite's compiled string variable (it is `css`, populated in `beforeAll`):

```ts
// INVARIANT DISCIPLINE (do not weaken). The assertions in this suite guard the embed-anywhere and
// cascade-layer contracts. As the sheet shrinks, a present-class LIST may lose an entry, but no
// invariant assertion may be removed or relaxed. Dropping a `not.toMatch` re-opens a real shipped bug
// (the drawer display:block, the auth-page centering). check:custom-surface guards the same rules
// structurally; this test guards the compiled output.
it('keeps the two load-bearing unlayered rules by exact selector', () => {
  expect(css).toContain('.menu li');           // the unlayered :focus-visible focus ring
  expect(css).toContain('.cairn-btn-guarded'); // the unlayered pointer-events restore
});
```

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
- Create: `src/tests/unit/check-custom-surface.test.ts`, `src/tests/fixtures/retired-token/Bad.svelte`
- Modify: `package.json` (add the `check:custom-surface` script)

**Interfaces:**
- Consumes: the ledger's Tier-2 allowlist by exact name and the retired-token seed (Task 1); the walled sheet (Task 3).
- Produces: `npm run check:custom-surface`. Exported pure functions: `pinnedUnlayeredRules(css): string[]`, `componentsLayerSelectorCount(css): number`, `retiredTokenHits(dir): {file,line,text}[]`, `evaluate(tree, budget): {pass, failures}`.

Model the structure on `scripts/check-public-tokens.mjs` (exported pure functions plus a `main()` guarded by the direct-invocation check, scanning per-tree, reporting `file:line`). Importing a `.mjs` script from the `unit` vitest project is the established pattern (eight existing unit tests do it).

- [ ] **Step 1: Write the gate's unit tests (failing).** The `@layer components` fixture is multi-line so its block closes on its own line:

```ts
// src/tests/unit/check-custom-surface.test.ts
import { describe, it, expect } from 'vitest';
import { pinnedUnlayeredRules, retiredTokenHits } from '../../../scripts/check-custom-surface.mjs';

describe('pinnedUnlayeredRules', () => {
  it('finds exactly the two sanctioned unlayered rules', () => {
    const css = `
@layer components {
  :where([data-theme='cairn-admin']) a { color: inherit; }
}
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
    const hits = retiredTokenHits('src/tests/fixtures/retired-token');
    expect(hits.length).toBeGreaterThan(0);
  });
});
```

Create `src/tests/fixtures/retired-token/Bad.svelte` with one line containing `class="text-[var(--color-muted)]"`.

- [ ] **Step 2: Run to confirm failure.**

```bash
npm run test:unit -- check-custom-surface
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the gate.** Write `scripts/check-custom-surface.mjs`. The `@layer components` block is isolated by **brace matching**, not a newline-anchored regex (robust to one-line or multi-line, and to nesting):

```js
// cairn-cms: the custom-surface ratchet gate. Holds the admin and showcase trees to their de-customized
// floor on enumerable signals (not line counts, which are gameable and would flag sanctioned patterns):
//   (1) the unlayered-rule set, pinned by exact selector — neither deletable nor extendable without an
//       allowlist change; (2) a cap on @layer components rule selectors per tree; (3) a retired-token
//       budget (retired muted/subtle bracket references in markup) that ratchets to zero across the
//       sweep. Budgets and the by-name Tier-2 allowlist live in scripts/custom-surface-budget.json,
//       seeded at current values. Wired as `npm run check:custom-surface`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The body of the first `@layer components { … }` block by brace matching, or '' if absent. */
function componentsLayerBody(css) {
  const start = css.indexOf('@layer components');
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return '';
}

/** The css with its `@layer components { … }` block removed (brace-matched). */
function stripComponentsLayer(css) {
  const body = componentsLayerBody(css);
  if (!body) return css;
  const start = css.indexOf('@layer components');
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(0, start) + css.slice(i + 1);
  }
  return css;
}

/** The unlayered scoped rules (a `:where([data-theme…])` rule NOT inside @layer components), by selector. */
export function pinnedUnlayeredRules(css) {
  const out = [];
  for (const m of stripComponentsLayer(css).matchAll(/(:where\(\[data-theme=[^{]*?)\s*\{/g)) {
    out.push(m[1].trim());
  }
  return out;
}

/** Count of scoped rule selectors inside @layer components. */
export function componentsLayerSelectorCount(css) {
  return [...componentsLayerBody(css).matchAll(/:where\(\[data-theme=[^{]*?\{/g)].length;
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

/** Evaluate one tree against its budget. Returns { pass, failures: string[] }. */
export function evaluate(tree, budget) {
  const failures = [];
  if (tree.adminCss) {
    const css = readFileSync(resolve(ROOT, tree.adminCss), 'utf8');
    const unlayered = pinnedUnlayeredRules(css);
    const allow = budget.unlayeredAllowlist;
    if (unlayered.length !== allow.length)
      failures.push(`unlayered rules: found ${unlayered.length}, allowlist has ${allow.length}`);
    for (const sel of unlayered)
      if (!allow.some((e) => sel.includes(e))) failures.push(`unsanctioned unlayered rule: ${sel}`);
    const layerCount = componentsLayerSelectorCount(css);
    if (layerCount > budget.componentsLayerCap)
      failures.push(`@layer components selectors: ${layerCount} > cap ${budget.componentsLayerCap}`);
  }
  let retired = 0;
  for (const dir of tree.markupDirs) retired += retiredTokenHits(dir).length;
  if (retired > budget.retiredTokenBudget)
    failures.push(`retired tokens: ${retired} > budget ${budget.retiredTokenBudget}`);
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

- [ ] **Step 4: Seed the budget at current measured values.** Read the live counts, then write `scripts/custom-surface-budget.json` with those exact numbers (seed at current, so the gate passes on day one):

```bash
node --input-type=module -e "
import { componentsLayerSelectorCount, retiredTokenHits } from './scripts/check-custom-surface.mjs';
import { readFileSync } from 'node:fs';
const css = readFileSync('src/lib/components/cairn-admin.css','utf8');
console.log('componentsLayerCap =', componentsLayerSelectorCount(css));
console.log('admin retiredTokenBudget =', retiredTokenHits('src/lib/components').length);
console.log('showcase retiredTokenBudget =', retiredTokenHits('examples/showcase/src').length);
"
```

Write the file with those measured numbers (example shape; substitute the printed values):

```json
{
  "trees": {
    "admin": {
      "adminCss": "src/lib/components/cairn-admin.css",
      "markupDirs": ["src/lib/components"],
      "budget": {
        "unlayeredAllowlist": [".menu li", ".cairn-btn-guarded"],
        "componentsLayerCap": 14,
        "retiredTokenBudget": 0
      }
    },
    "showcase": {
      "adminCss": null,
      "markupDirs": ["examples/showcase/src"],
      "budget": { "unlayeredAllowlist": [], "componentsLayerCap": 0, "retiredTokenBudget": 0 }
    }
  }
}
```

Set `componentsLayerCap` and each `retiredTokenBudget` to the measured values from the command (the admin `retiredTokenBudget` is the post-Task-2 remainder, since Task 2 retired the pilot-adjacent files). Record in the ledger that each sweep phase lowers the admin `componentsLayerCap` and `retiredTokenBudget` to its post-sweep count, reaching zero retired tokens when the sweep completes.

- [ ] **Step 5: Wire the script.** In `package.json` scripts, add:

```json
"check:custom-surface": "npm run package && node scripts/check-custom-surface.mjs"
```

- [ ] **Step 6: Run the gate's tests, then the gate, then plant a violation.**

```bash
npm run test:unit -- check-custom-surface
npm run check:custom-surface          # expect PASS for both trees (seeded at current)
# Prove it bites: temporarily lower the admin retiredTokenBudget by 1 in the JSON, re-run, expect FAIL,
# then restore.
```

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
- Create: `examples/showcase/e2e/admin-visual.spec.ts` (the showcase Playwright `testDir` is `e2e`)
- Read: `examples/showcase/playwright.config.ts`, an existing spec (e.g. `examples/showcase/e2e/golden-path.spec.ts`) for the no-auth `/admin` path, and `src/lib/components/CairnAdminShell.svelte` for the theme-cookie name

**Interfaces:**
- Produces: `toHaveScreenshot` baselines over the live-components bar, run per sweep phase; the committed baseline update is the record of intended drift. The later sweep plans reference this spec.

The component tests import the variables-only partial and cannot see DaisyUI-component visual regressions, so this Playwright baseline against the built showcase is the only automated visual net during the sweep. The showcase dev backend (`CAIRN_DEV_BACKEND=1`, set by the e2e webServer) mints an owner editor, so `/admin/posts` renders the authed shell with no login step, exactly as `golden-path.spec.ts` does.

- [ ] **Step 1: Confirm the harness.** Verify `examples/showcase/playwright.config.ts` sets `testDir: 'e2e'` and that an existing spec reaches the admin via a bare `page.goto('/admin')` with no sign-in. Confirm the theme cookie name the SSR shell reads in `CairnAdminShell.svelte` (it writes `cairn-admin-theme` via `writeAdminCookie`); use that exact name below.

- [ ] **Step 2: Write the screenshot spec.** The theme is resolved at SSR from the cookie (the client `matchMedia` check runs once in `onMount` only when no cookie is set), so the dark shot must set the cookie and emulate **before** navigating, or both shots capture light:

```ts
// examples/showcase/e2e/admin-visual.spec.ts
import { test, expect } from '@playwright/test';

const ORIGIN = 'http://localhost:4173'; // the showcase preview origin from playwright.config webServer

// The per-phase visual baseline. A sweep phase that intentionally shifts a surface updates the
// committed snapshot in the same commit; that update is the reviewed record of intended drift.
test('admin office shell — light', async ({ page, context }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: ORIGIN }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-light.png', { fullPage: true });
});

test('admin office shell — dark', async ({ page, context }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: ORIGIN }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-dark.png', { fullPage: true });
});
```

Confirm the `ORIGIN` and cookie name against the config and the shell before running; adjust if the preview port differs.

- [ ] **Step 3: Generate the baseline.**

```bash
npm run package
cd examples/showcase && CI=1 npx playwright test admin-visual --update-snapshots ; cd ../..
```

Expected: baseline PNGs written under `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` (Playwright appends a platform suffix, e.g. `admin-office-light-chromium-linux.png`; commit the files as generated, and ensure CI runs the same platform).

- [ ] **Step 4: Confirm the dark baseline is actually dark, and the baseline is stable.**

```bash
cd examples/showcase && CI=1 npx playwright test admin-visual ; cd ../..
```

Expected: PASS. Then open `admin-office-dark-*.png` and confirm it shows the dark theme (a dark surface), not light — if it is light, the cookie name or origin is wrong; fix and regenerate.

- [ ] **Step 5: Simplify and commit.** Run the `code-simplifier` subagent over the new spec (a small `.spec.ts` is still code; "too small" is not a skip), then:

```bash
git add examples/showcase/e2e/admin-visual.spec.ts examples/showcase/e2e/admin-visual.spec.ts-snapshots
git commit -m "test(showcase): per-phase admin visual baseline over the live-components bar"
```

---

## Task 6: Adversarial review of the Phase 0 foundation

**Files:** none (review + triage; fixes land as follow-up commits to the relevant task's files).

This is the review gate the spec requires before Phase 0 is called done and before the pilot starts. (The plan itself was already adversarially reviewed before publication; this task reviews the built result.)

- [ ] **Step 1: Confirm the gate is green end to end.**

```bash
npm run check && npm test && npm run check:comments && npm run check:prose && npm run check:custom-surface
cd examples/showcase && CI=1 npm run test:e2e ; cd ../..
```

Expected: all pass.

- [ ] **Step 2: Dispatch the adversarial review.** Fan out fresh (not fork) read-only reviewers in parallel, on distinct lenses, against the Phase 0 deliverables (the ledger, the role layer, the walled sheet, the gate, the visual baseline):
  - **Gate-integrity lens:** is `check:custom-surface` deterministic and ungameable across the three signals? Plant a bespoke override and a new unlayered rule and confirm each fails. Is the seed honest (passes on current, fails on a planted violation)?
  - **Embed-anywhere lens:** did the Task 3 reorganization keep the compiled sheet cascade-equivalent and the invariants intact? Re-run the sorted diff and the build test.
  - **Role-layer lens:** is the frozen interface (`text-muted`/`text-subtle`) correct, and is the fold-vs-guaranteed decision faithful to the measured oklab table? Does any retired-reference component now render the wrong tone?
  - **a11y/contract lens:** did retiring the pilot-adjacent tokens or walling Tier 2 disturb any focus, live-region, or roving-tabindex contract? Spot-check the changed components.
- [ ] **Step 3: Triage in the main loop.** Separate real findings from noise; fold survivors as follow-up commits to the owning task's files. Re-run the full gate after each fix.
- [ ] **Step 4: Freeze the role interface.** Once the review is clean, record in the ledger that the role-layer interface is frozen: the pilot (Phase 1) may consume `text-muted`/`text-subtle` and the walled Tier 2, and no later investigation reshapes them.
- [ ] **Step 5: Commit the review record.**

```bash
git add docs/internal/design/2026-06-29-custom-surface-ledger.md
git commit -m "docs(design): record Phase 0 adversarial review and freeze the role interface"
```

---

## Self-review

**Spec coverage.** Phase 0 deliverables map to tasks: the Tier-1/2/3 ledger → Task 1; the frozen role-layer interface + oklab ratio table → Task 2; Tier 2 walled into one labeled home + load-bearing invariant list → Task 3; `check:custom-surface` seeded per-tree as a hard exit criterion → Task 4; the per-phase visual baseline → Task 5; the resolved investigations → Task 1 Steps 2–3; the structural-invariant hardening → Task 3 Step 4; the presence-only a11y and selector-coupled inventories → Task 1 Step 4; the adversarial review → Task 6. The bulk token retirement (the ~20 non-pilot components) and the scheduled upgrade watcher are intentionally deferred to the sweep and the final docs phase, per the scoped-Phase-0 decision.

**Placeholder scan.** The two role-layer alphas are measured-then-filled (Task 2 Steps 2–3, an explicit measure-and-lock); the budget numbers are read from the live sheet by the Step 4 command; the build-test variable is the suite's existing `css`. No "TBD"/"handle edge cases"/"similar to Task N" remain.

**Type consistency.** The gate's exported names (`pinnedUnlayeredRules`, `retiredTokenHits`, `componentsLayerSelectorCount`, `evaluate`) match across Task 4's interface block, its test (Step 1), and its implementation (Step 3). `dualGamutRatio` is the real export from `check-public-tokens.mjs`. The role utility names `text-muted`/`text-subtle` are consistent across Tasks 2, 4, and 6. The budget JSON keys (`unlayeredAllowlist`, `componentsLayerCap`, `retiredTokenBudget`, `markupDirs`, `adminCss`) match the `evaluate` reads.

## Review corrections (folded from the pre-publication adversarial review)

- **Task 2 contrast math** now composites in oklab (Tailwind's `color-mix(in oklab, …, transparent)` space), not straight sRGB; the sRGB version diverged ~0.9 and would have rejected an AA-valid alpha.
- **Task 2 scope** retires only the pilot-adjacent files; the 282-occurrence bulk retirement distributes across the sweep, tracked by the gate's ratcheting `retiredTokenBudget`. A tree-shaking note and a post-rebuild "utility present" assertion were added (a `@utility` only compiles when its class is in scanned markup).
- **Task 3** replaced the false byte-identical diff with a sorted cascade-equivalence check (the pipeline preserves source order), constrained reorganization to stay within a theme-root block, and fixed the build-test snippet to use the suite's `css` inside the `describe`.
- **Task 4** made the `@layer components` isolation brace-matched (robust to one-line blocks), fixed the unit fixture to a multi-line layer block, seeded `componentsLayerCap`/`retiredTokenBudget` from a measurement command (not a contradictory `0`), and added a plant-a-violation step.
- **Task 5** moved the spec to `examples/showcase/e2e/` (the real Playwright `testDir`), fixed the dark screenshot to set the `cairn-admin-theme` cookie and emulate before navigating (the SSR theme resolves from the cookie, so the original captured light twice), corrected the no-auth `/admin` access note, flagged the platform snapshot suffix, and added the code-simplifier step.
