# Starter-Template Track, Phase 1: Template Foundation — Implementation Plan

> **For agentic workers:** Execute task-by-task. Task 1 is a `cairn-implementer` dispatch (Sonnet),
> test-first; Tasks 2–4 are main-loop work (audit synthesis, comment-only annotation, and
> environment-sensitive baseline generation). The main loop reviews each diff and clears the full gate
> before the next task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Lay the foundation for re-expressing the `examples/showcase` starter template in native
DaisyUI 5.6 / Tailwind 4: audit its custom surface into a Tier-1/2/3 ledger, wall and document its
owned design as the template's Tier 2, and extend `check:custom-surface` to the showcase tree with its
own seeded retired-token budget. Zero pixel change; the markup fold is Phase 2 (template chrome).

**Architecture:** The showcase mirrors the admin's three-tier model with two charter differences (the
spec's "## The starter template"): Tier 1 is the showcase's *own* DaisyUI theme (not Warm Stone), and
Tier 2 includes the content/brand design the site legitimately owns (`prose.css`, the `.cairn-place-*`
figure contract, the brand styling, the on-surface inks, the code-highlight binding). The gate gains a
per-tree retired-token pattern: the admin keeps its `var(--color-muted|subtle)` pattern verbatim (stays
at 0), and the showcase counts any arbitrary-value bracket utility or inline `style=` wrapping a literal
`var(--…)` custom property in markup, seeded at the measured current count so it passes day one.

**Tech Stack:** Node ESM gate script (`scripts/check-custom-surface.mjs`), Vitest (unit), the budget
JSON (`scripts/custom-surface-budget.json`), Playwright `toHaveScreenshot` (the showcase e2e), Markdown
docs.

## Global Constraints

- **Zero pixel change this phase.** Phase 1 audits, walls, and gates. It does not migrate markup, fold a
  token home, or fix a Tier-3 bug. The committed visual baseline (Task 4) is the byte-identical record of
  the pre-fold state. Any CSS edit is comment-only.
- **The showcase keeps its own DaisyUI theme (Tier 1), not Warm Stone.** No redesign; the public output
  stays design-agnostic by charter.
- **The admin's retired-token signal is unchanged.** The admin tree must stay at `retiredTokenBudget: 0`
  with the existing `var(--color-muted|subtle)` pattern, byte-for-byte, so this phase cannot regress the
  completed admin sweep.
- **The gate is per-tree and seeded at current measured values.** It passes on day one and blocks nothing
  (the spec's "not a CI footgun" rule). The showcase budget ratchets in Phase 2, not here.
- **Full gate per task:** `npm run check` (svelte-check 0/0), `npm test` (exit 0), and
  `npm run check:custom-surface` PASS for **both** trees. Run `check:custom-surface` (which prepends
  `npm run package`, scanning docs) at pass-end, never only the bare `node scripts/check-custom-surface.mjs`
  (the `tailwind-scans-docs-bad-candidate` gotcha).
- **Date:** 2026-06-30. **Branch/worktree:** `starter-template-1` in the `extensibility-plan-1` worktree
  (off `main` at `14e52b1`; this worktree's root `node_modules` is real, not the shared symlink).

---

## File structure

- `scripts/check-custom-surface.mjs` — modify `retiredTokenHits` to take a per-tree pattern; `evaluate`
  passes `tree.retiredTokenPattern`. The admin default is unchanged behavior.
- `scripts/custom-surface-budget.json` — add `retiredTokenPattern` to each tree; seed the showcase
  `retiredTokenBudget`.
- `src/tests/unit/check-custom-surface.test.ts` — extend with the per-tree-pattern tests.
- `src/tests/fixtures/retired-token-showcase/Bad.svelte` — new fixture proving the showcase pattern
  catches bracket + inline `var(--…)` and excludes the dynamic `var({…})` form.
- `docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md` — the audit artifact (new).
- `examples/showcase/src/lib/theme.css`, `site.css`, `prose.css` — comment-only Tier markers + the
  frame-vs-owned split + ledger cross-reference.
- `examples/showcase/e2e/site-visual.spec.ts` (new) + its `-snapshots/` — the zero-pixel baseline.

---

## Task 1: Per-tree retired-token pattern; seed the showcase budget

**Executor:** `cairn-implementer` (Sonnet), test-first.

**Files:**
- Modify: `scripts/check-custom-surface.mjs` (the `retiredTokenHits` and `evaluate` functions)
- Modify: `scripts/custom-surface-budget.json`
- Test: `src/tests/unit/check-custom-surface.test.ts`
- Create: `src/tests/fixtures/retired-token-showcase/Bad.svelte`

**Interfaces:**
- Consumes: the existing exports `retiredTokenHits(dir)`, `evaluate(tree, budget)`.
- Produces: `retiredTokenHits(dir, patternSource?)` — `patternSource` is an optional regex-source string;
  when omitted it defaults to the admin `var(--color-muted|subtle)` pattern (current behavior). `evaluate`
  reads `tree.retiredTokenPattern` and forwards it. The budget JSON gains a `retiredTokenPattern` string on
  each tree.

- [ ] **Step 1: Write the new fixture.**

Create `src/tests/fixtures/retired-token-showcase/Bad.svelte`:

```svelte
<!-- Fixture for the showcase retired-token pattern. Two lines match (a bracket utility wrapping a
     var(--…) token, and an inline style with a literal var(--…)); the dynamic var({…}) form is the
     styleguide's sanctioned swatch and must NOT match. -->
<p class="text-[length:var(--cairn-step-1)] text-[color:var(--cairn-muted)]">scale and ink</p>
<p style="color: var(--cairn-muted)">inline ink</p>
<div class="sg-chip" style="background: var({token})"></div>
```

- [ ] **Step 2: Write the failing tests.**

Append to `src/tests/unit/check-custom-surface.test.ts`:

```ts
describe('retiredTokenHits — per-tree pattern', () => {
	// The showcase signal: any arbitrary-value bracket utility or inline style wrapping a literal
	// var(--…). Mirrors the admin pattern's two branches, generalized off muted/subtle to any token.
	const showcasePattern = '\\[[^\\][]*var\\(--[^\\][]*\\]|style="[^"]*var\\(--';

	it('flags bracket and inline var(--…) refs but not the dynamic var({…}) swatch', () => {
		const hits = retiredTokenHits('src/tests/fixtures/retired-token-showcase', showcasePattern);
		expect(hits.length).toBe(2);
	});

	it('the default (admin) pattern ignores the showcase tokens', () => {
		const hits = retiredTokenHits('src/tests/fixtures/retired-token-showcase');
		expect(hits.length).toBe(0);
	});
});

describe('evaluate — showcase-shaped tree', () => {
	const showcasePattern = '\\[[^\\][]*var\\(--[^\\][]*\\]|style="[^"]*var\\(--';
	const tree = {
		adminCss: null,
		markupDirs: ['src/tests/fixtures/retired-token-showcase'],
		retiredTokenPattern: showcasePattern,
	};

	it('passes at or above the count and skips the admin-only signals when adminCss is null', () => {
		const { pass } = evaluate(tree, {
			unlayeredAllowlist: [],
			componentsLayerCap: 0,
			retiredTokenBudget: 2,
		});
		expect(pass).toBe(true);
	});

	it('fails below the count', () => {
		const { pass, failures } = evaluate(tree, {
			unlayeredAllowlist: [],
			componentsLayerCap: 0,
			retiredTokenBudget: 1,
		});
		expect(pass).toBe(false);
		expect(failures.join(' ')).toContain('retired tokens');
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail.**

Run: `npm run test:unit -- check-custom-surface`
Expected: the new tests FAIL (`retiredTokenHits` ignores the second arg; `evaluate` ignores
`tree.retiredTokenPattern`), the existing tests still PASS.

- [ ] **Step 4: Implement the per-tree pattern.**

In `scripts/check-custom-surface.mjs`, replace the `retiredTokenHits` body's hardcoded `pat` and add the
default constant. The default's source string must equal the current pattern exactly so the admin tree is
unchanged:

```js
// The admin retired-token pattern (muted/subtle only): the default when a tree names no pattern, so the
// admin tree's signal is unchanged. A tree may override it (the showcase generalizes off muted/subtle to
// any var(--…) token; see scripts/custom-surface-budget.json).
const DEFAULT_RETIRED_TOKEN_PATTERN =
	'\\[[^\\][]*var\\(--color-(?:muted|subtle)\\)[^\\][]*\\]|style="[^"]*var\\(--color-(?:muted|subtle)\\)';
```

Change the signature and `pat`:

```js
export function retiredTokenHits(dir, patternSource = DEFAULT_RETIRED_TOKEN_PATTERN) {
	const pat = new RegExp(patternSource);
	/** @type {{ file: string, line: number, text: string }[]} */
	const hits = [];
	// …unchanged walk/readFile/split loop…
}
```

Update the JSDoc above `retiredTokenHits` to document the `patternSource` parameter (the contract: a
regex-source string anchored on the bracket or the inline-style attribute; the default is the admin
pattern). Update `evaluate` to forward the tree's pattern:

```js
for (const dir of tree.markupDirs) retired += retiredTokenHits(dir, tree.retiredTokenPattern).length;
```

Update the `evaluate` JSDoc `@param` for `tree` to include the optional `retiredTokenPattern`. Update the
file's top banner comment so the retired-token bullet reads "per-tree" (the admin counts
`var(--color-muted|subtle)`; the showcase counts any bracketed/inline `var(--…)`).

- [ ] **Step 5: Run the tests to verify they pass.**

Run: `npm run test:unit -- check-custom-surface`
Expected: PASS (the new and the existing tests).

- [ ] **Step 6: Measure the showcase seed, then update the budget JSON.**

Measure the current count under the showcase pattern (do not trust this plan's number; confirm it):

Run: `grep -rcE '\[[^]]*var\(--[^]]*\]|style="[^"]*var\(--' --include=*.svelte examples/showcase/src | grep -v ':0$' | awk -F: '{s+=$2} END {print s}'`
Expected: `20` (4 files: `SiteHeader`, `SiteFooter`, `(site)/+layout`, `(site)/+page`). If the count
differs, use the measured value as the seed.

Edit `scripts/custom-surface-budget.json`. Add `retiredTokenPattern` to the admin tree (the exact default
source) and to the showcase tree (the generalized source), and set the showcase `retiredTokenBudget` to
the measured count:

```json
{
  "trees": {
    "admin": {
      "adminCss": "src/lib/components/cairn-admin.css",
      "markupDirs": ["src/lib/components"],
      "retiredTokenPattern": "\\[[^\\][]*var\\(--color-(?:muted|subtle)\\)[^\\][]*\\]|style=\"[^\"]*var\\(--color-(?:muted|subtle)\\)",
      "budget": {
        "unlayeredAllowlist": [ /* …unchanged… */ ],
        "componentsLayerCap": 14,
        "retiredTokenBudget": 0
      }
    },
    "showcase": {
      "adminCss": null,
      "markupDirs": ["examples/showcase/src"],
      "retiredTokenPattern": "\\[[^\\][]*var\\(--[^\\][]*\\]|style=\"[^\"]*var\\(--",
      "budget": { "unlayeredAllowlist": [], "componentsLayerCap": 0, "retiredTokenBudget": 20 }
    }
  }
}
```

Leave the admin `unlayeredAllowlist` exactly as it is. The showcase keeps `adminCss: null`
(no `[data-theme]`-scoped sheet to scan), so `evaluate` skips the unlayered and `@layer` signals for it
and only the retired-token budget applies; its `@layer components` owned design (prose.css, the code
binding) is Tier 2 and is not capped.

- [ ] **Step 7: Run the real gate to verify both trees pass.**

Run: `npm run check:custom-surface`
Expected: `custom-surface [admin]: PASS` and `custom-surface [showcase]: PASS`.

- [ ] **Step 8: Clear the full gate and commit.**

Run: `npm run check` (0/0) and `npm test` (exit 0).

```bash
git add scripts/check-custom-surface.mjs scripts/custom-surface-budget.json \
  src/tests/unit/check-custom-surface.test.ts src/tests/fixtures/retired-token-showcase/Bad.svelte
git commit -m "feat(gate): per-tree retired-token pattern; seed the showcase custom-surface budget"
```

---

## Task 2: The showcase Tier-1/2/3 ledger (the audit artifact)

**Executor:** main loop (the audit is judgment-bearing synthesis).

**Files:**
- Create: `docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`

- [ ] **Step 1: Write the ledger**, mirroring the admin ledger
  (`docs/internal/design/2026-06-29-custom-surface-ledger.md`) in structure, with the showcase's two
  charter differences. Sections:
  - **How to read the tiers** — the same five rules, with the two showcase differences (Tier 1 is the
    template's own theme; Tier 2 includes owned content/brand design).
  - **Tier 1: the showcase DaisyUI theme** — theme.css's two `@plugin "daisyui/theme"` blocks
    (`cairn` / `cairn-dark`): the role/geometry tokens, kept verbatim. Note it is the showcase's own
    palette, not the admin's Warm Stone.
  - **Tier 2: owned design (the documented floor)** — list with each entry's reason: `prose.css` (the
    hand-authored reading surface, the signature deliverable, every rule `@layer components` scoped to
    `.prose`); the `.cairn-place-center/wide/full` figure contract + `.site-main` measure (site.css); the
    on-surface inks (`--cairn-muted`, `--cairn-success-ink`, `--cairn-warning-ink`, `--cairn-error-ink`,
    `--cairn-info-ink`) — the a11y-ink pattern (a fill is too light as small text; the inks track the fill
    hues for the re-skin recipe step 6), with their light/dark `prefers-color-scheme` definitions; the
    elevation pair (`--cairn-card-border`, `--cairn-shadow`); the CTA panel pair (`--cairn-cta-*`); the
    code-highlight binding (`pre.shiki` + the `.cairn-tok-*` rules binding the engine-owned class contract
    to the `--cairn-code-*` ramp). State that these carry the re-skin recipe at the top of theme.css and
    that `check:public-tokens` already proves the theme clears AA in sRGB and P3.
  - **The internal frame vs the owned design (the audience split)** — mark which Tier-2 is "cairn's frame"
    (the engine-owned `.cairn-tok-*`/`.cairn-place-*` class contracts the site styles but does not name)
    versus the developer's own design to restyle (the palette, the prose surface, the brand). Mirrors the
    admin ledger's "your API vs cairn's frame" split.
  - **Tier 3: the Phase-2 fold target** — the arbitrary-value bracket utilities and inline `var(--…)`
    styles in the chrome/route markup (SiteHeader, SiteFooter, `(site)/+layout`, `(site)/+page`: 20 lines)
    that a Tailwind 4 `@theme` named utility will replace; the design-scale token *home* (the
    `--cairn-step-*` type scale, the `--cairn-space-*` space scale, the `--font-*` faces, the
    `--cairn-tracking-*`/`--cairn-leading-*`/`--cairn-measure*` values move from `:root` to Tailwind 4
    `@theme` so the utilities generate — the scale *values* are owned design that stays, only the home and
    the markup references change); the island-converter's bespoke demo CSS in site.css, including the
    `--cairn-rule` bug (site.css:113, `border: 1px solid var(--cairn-rule, #b8b0a4)` — `--cairn-rule` is
    never defined, so it always renders the hardcoded `#b8b0a4` fallback). Mark each as Phase-2 work; do
    not fix here.
  - **Call-site census** — the 20 retired-token lines across the 4 chrome/route files; the per-token
    breakdown (`--cairn-step-*`, `--cairn-space-*`, `--font-*`, `--cairn-tracking-*`, `--cairn-muted`,
    `--cairn-measure*`, `--cairn-leading-*`, `--radius-field`).
  - **The check:custom-surface gate (showcase tree)** — the per-tree pattern (any bracketed/inline
    `var(--…)`), the seed (the measured count), why the styleguide's dynamic `style="…var({token})…"`
    swatches are sanctioned (they render the design-reference tool, the template's analog of the admin's
    live-components bar, and do not match the `var(--` pattern), and the `sanctionedTokens` escape hatch
    (empty now; Phase 2 adds any AA-ink-in-markup with a charter note, mirroring the admin's ink
    sanctioning).
  - **Phase 1 sign-off** — Tier-1 theme frozen verbatim; Tier-2 owned design walled and documented; the
    gate extended and seeded; the visual baseline committed as the zero-pixel floor. Record that Phase 1
    made no pixel change.

- [ ] **Step 2: Run the doc link gate.**

Run: `npm run check:docs`
Expected: PASS (no dead relative link or stale anchor).

- [ ] **Step 3: Commit.**

```bash
git add docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md
git commit -m "docs(design): the showcase custom-surface ledger (Tier 1/2/3)"
```

---

## Task 3: Tier markers in the showcase CSS (comment-only, zero pixel)

**Executor:** main loop (small, precise; comment-only).

**Files:**
- Modify: `examples/showcase/src/lib/theme.css`, `examples/showcase/src/lib/site.css`,
  `examples/showcase/src/lib/prose.css` (header comments only)

- [ ] **Step 1: Annotate each file's banner with its tier(s) and a ledger cross-reference.** Comment-only.
  - `theme.css`: mark the two `@plugin "daisyui/theme"` blocks **Tier 1 (the showcase theme, kept
    verbatim)**; mark the `:root` cairn-authored token layer as **mixed**: the inks/elevation/CTA are
    **Tier 2 (owned, the documented floor)**, the type/space/face/tracking/leading/measure scale is the
    **Tier-3 fold target (moves to Tailwind 4 `@theme` in Phase 2)**; mark the `.cairn-tok-*`/`pre.shiki`
    `@layer components` block **Tier 2 (the engine owns the class contract; the site colors it)**.
  - `site.css`: mark the `.site-main` measure and the `.cairn-place-*` figure contract **Tier 2 (the
    figure-placement contract cairn defines and the site styles)**; mark the island-converter block
    **Tier 3 (Phase-2 fold; the `--cairn-rule` token is undefined and falls back to a hardcoded hex —
    fixed in Phase 2)**.
  - `prose.css`: mark the whole sheet **Tier 2 (the owned reading surface; not foldable to
    `@tailwindcss/typography`)**.
  - Each banner gets one line pointing at `docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`.

- [ ] **Step 2: Verify zero pixel.** CSS comments are stripped at build, so the compiled output is
  unchanged. Confirm the package + showcase build still succeed.

Run: `npm run package`
Expected: success (the dist rebuilds; comment-only CSS edits do not change emitted CSS).

- [ ] **Step 3: Commit.**

```bash
git add examples/showcase/src/lib/theme.css examples/showcase/src/lib/site.css examples/showcase/src/lib/prose.css
git commit -m "docs(showcase): mark the template CSS tiers and the frame-vs-owned split"
```

---

## Task 4: The showcase visual baseline (the zero-pixel Phase-2 floor)

**Executor:** main loop (environment-sensitive snapshot generation + commit).

**Files:**
- Create: `examples/showcase/e2e/site-visual.spec.ts`
- Create: `examples/showcase/e2e/site-visual.spec.ts-snapshots/` (the committed `-linux.png` baselines)

- [ ] **Step 1: Write the spec**, mirroring `examples/showcase/e2e/admin-visual.spec.ts` but for the
  public `(site)` surface. The site theme is selected by `prefers-color-scheme` only (no cookie), so
  `page.emulateMedia({ colorScheme })` is the lever (the same as `styleguide.spec.ts`). Baseline the home
  (chrome: SiteHeader + SiteFooter via the `(site)` layout, the masthead, the CTA) and the styleguide (the
  full design surface: tokens, type scale, the reading surface, the component set), light and dark:

```ts
import { test, expect } from '@playwright/test';

// The starter-template visual baseline (the Phase-2 zero-pixel floor). The public (site) surface selects
// its theme by prefers-color-scheme, not a cookie, so emulateMedia is the lever. A template-track phase
// that intentionally shifts a surface updates the committed snapshot in the same commit, the reviewed
// record of intended drift. The home exercises the chrome (SiteHeader/SiteFooter via the (site) layout)
// and the masthead/CTA; the styleguide is the template's analog of the admin's live-components bar.
test('site home — light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await expect(page).toHaveScreenshot('site-home-light.png', { fullPage: true });
});

test('site home — dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page).toHaveScreenshot('site-home-dark.png', { fullPage: true });
});

test('styleguide — light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/styleguide');
	await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
	await expect(page).toHaveScreenshot('styleguide-light.png', { fullPage: true });
});

test('styleguide — dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/styleguide');
	await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
	await expect(page).toHaveScreenshot('styleguide-dark.png', { fullPage: true });
});
```

- [ ] **Step 2: Build the dist the showcase consumes.**

Run: `npm run package`
Expected: success (the showcase's `file:../..` dep reads the dist).

- [ ] **Step 3: Generate the baselines** (Playwright browsers must be installed; if not, run
  `npx --prefix examples/showcase playwright install chromium` first).

Run: `cd examples/showcase && npx playwright test site-visual --update-snapshots`
Expected: 4 snapshots written under `e2e/site-visual.spec.ts-snapshots/` with the `-linux` platform
suffix (`site-home-light-linux.png`, …). Geoff's machine and CI are both Linux, so the local baselines
match CI.

- [ ] **Step 4: Re-run to confirm the baseline is stable.**

Run: `cd examples/showcase && npx playwright test site-visual`
Expected: 4 passed (the freshly written baselines compare clean).

- [ ] **Step 5: Commit.**

```bash
git add examples/showcase/e2e/site-visual.spec.ts examples/showcase/e2e/site-visual.spec.ts-snapshots
git commit -m "test(e2e): baseline the showcase site home and styleguide (the Phase-2 zero-pixel floor)"
```

---

## Pass-end ritual (after Task 4)

- [ ] **Simplify:** dispatch `code-simplifier:code-simplifier` over the changed code (the gate script and
  the new spec). Likely a no-op given the small surface.
- [ ] **Gate:** `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (PASS both
  trees), `npm run check:comments` (OK), `npm run check:docs` (OK). Prove the consumer build via the
  showcase e2e (force `CI=1` or a from-scratch build, per `cairn-pass`).
- [ ] **Review gate:** fan out `svelte-reviewer` and `daisyui-a11y-reviewer` over the new e2e spec and any
  diff; the gate script is a Node script (no Worker/auth surface), so a read + `code-simplifier` covers it.
  Consider a small adversarial review Workflow if warranted.
- [ ] **Docs:** this phase adds no public-API export, so `check:reference` is unaffected. The ledger and
  the CSS Tier markers are the doc deliverable. No `CHANGELOG` entry (no consumer-facing change; admin and
  showcase internals only). Update `ROADMAP.md` if it lists the template track.
- [ ] **Post-mortem + STATUS + memory:** append the Phase-1 post-mortem to this plan; update
  `docs/STATUS.md` (the immediate-next-action becomes the Phase-2 template-chrome plan); refresh the
  `cairn-admin-design-modernization` memory. Hold unpublished (no release; admin + showcase internals a
  consumer never imports).
- [ ] **Commit + merge** to `main` (fast-forward) and push only when Geoff asks, per the hold-and-batch
  cadence.

## Self-review notes

- **Spec coverage:** the three spec deliverables for "Template foundation" map to Tasks 2 (ledger), 3
  (wall/document Tier 2), and 1 (extend `check:custom-surface` with a seeded budget); Task 4 adds the
  per-phase visual baseline the spec's verification section requires.
- **No fold this phase:** the spec sequences the markup fold and the `site.css`/`theme.css` remainder onto
  Tailwind 4 / DaisyUI 5.6 into "Template chrome" (Phase 2). Phase 1 records those as Tier 3 and changes
  no pixel.
- **Type consistency:** `retiredTokenHits(dir, patternSource?)`, `tree.retiredTokenPattern`, and the JSON
  `retiredTokenPattern` key are used consistently across Task 1.
