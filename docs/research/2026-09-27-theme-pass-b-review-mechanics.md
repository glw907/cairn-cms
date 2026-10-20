# Theme identity pass B review: mechanics and feasibility

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` (main, `4365ac34`).
**Lens:** does every mechanism behave as stated? Each claim was checked empirically against the
installed toolchain (Tailwind 4.3.3, daisyUI 5.7.44, culori 4.0.2, Chromium via Playwright). Scratch
scripts: `/tmp/claude-1000/-var-home-glw907-Projects-cairn-cms/45069231-c4a9-4525-8b03-929b05217141/scratchpad/review-mechanics/`
(`inks.mjs`, `stock.mjs`, `sweep.mjs`, `muted.mjs`, `muted2.mjs`, `nested.mjs`, `tw/`).

## Verdict

The load-bearing mechanism, a package-exported `@theme`, works. Four mechanisms do not behave as
the spec states: the public scope roots, the comment-tolerant parse the new rules assume, the
`theme-contrast` resolver, and the ink-percentage method. Each needs a fold before a plan is
written. None of them threatens the design, and each fold is a specification change, not a
redesign.

## What was verified sound

- **`@theme` from a package export generates utilities (priority check 1).** I built a fake package
  with `exports: { "./theme-tokens.css": … }` holding an `@theme` block and a `:root` block, then
  imported it from a chassis-shaped `tokens.css`. Both `@tailwindcss/cli` (the showcase's
  installed copy; the repo root has none) and `@tailwindcss/vite` generated `text-step-3`, `gap-m`,
  `px-m`, `tracking-eyebrow`, `max-w-measure`, `text-muted`, and `font-display`. A later theme
  `@theme` override won (`--text-step-3: 2rem`). The theme's `:root` ink override landed after the
  package default. Import order against `@import "tailwindcss"` does not matter, because Tailwind's
  own keys are `@theme default`: the engine's `--tracking-tight`, `--leading-tight`, and
  `--font-mono` won in both orders. The plan's "`@theme` utility-generation proof" is already done;
  no fallback is needed.
- **daisyUI's theme object exists (priority check 4).** `daisyui/theme/object` is a declared
  package export (`"./theme/object": {"types": …, "default": "./theme/object.js"}`). It maps 35
  themes, all with one identical key set: `color-scheme`, the 20 color roles, `--radius-selector`,
  `--radius-field`, `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, and
  `--noise`. Pass A's completeness test imports it the same way
  (`.claude/worktrees/theme-identity-a/src/tests/unit/admin-theme-completeness.test.ts:9`). A
  consumer must filter out `color-scheme`, which is not a custom property.
- **culori can do the color-mix math.** `interpolate([base-content, info], 'oklab')(0.5)` returned
  `oklab(0.4 -0.02867882 -0.04095760)`, matching Chromium's computed
  `color-mix(in oklab, …)` to every printed digit.
- **Arbitrary-value detection needs no compiled public sheet.** `markup.ts` records class tokens
  verbatim, brackets included (`ClassToken.value`, "including any variant prefix or bracketed
  value"), so `text-[#abc]` and `text-[14px]` are readable from token text through `utilityBase`.
- **`sheet.ts` exposes enough structure for a scheme model.** It returns each
  `@plugin "daisyui/theme"` block as a rule whose declarations include `name` and `default`, and it
  records `@media (prefers-color-scheme: dark)` in `conditions`. This holds once finding 2 is fixed.

## Findings, ranked by consequence

### 1. Major: the default public roots are wrong on both trees and double-fire with `token-colors`

**Location:** spec lines 116-119.

**Defect.** Three problems share one cause:

- On cairn's own tree, `src/lib/components` is the admin: 93 entries, including
  `cairn-admin.css`, `CairnAdminShell.svelte`, and `EditPage.svelte`. The engine has no public
  component directory; the only non-admin `.svelte` under `src/lib` is
  `src/lib/delivery/CairnHead.svelte`. The spec's phrase "the engine's public component
  directories" therefore names nothing, and the default root sends `public-literals` and
  `theme-conformance` over admin code. That code carries `text-[1.375rem]`
  (`ConfirmPage.svelte:48`, `CairnAdminShell.svelte:1045`, `LoginPage.svelte:81`),
  `text-[1.125rem]` and `text-[1.875rem]` (`EditPage.svelte:1858,1861`),
  `style="min-height:2.5rem"` (`NavTree.svelte:153`), literal `font-size: 0.75rem`
  (`HelpHome.svelte:405`), and 84 `oklch(` literals in `cairn-admin.css`. Its `var()` reads resolve
  to admin grammar tokens, which `theme-tokens.css` does not define.
- `src/chassis` is not a default root. It holds `prose.css` and `composition.css`, both of which
  `check-public-tokens.mjs` scans today (its `scannedFiles`). Retiring that script into the audit
  therefore drops coverage of the reading surface. It also takes `theme-conformance`'s own
  motivating case (spec line 131, "`prose.css` reads `--radius-box` …") out of scope.
- On a consumer, `src/lib/components` is already in `DEFAULT_STATIC_SCOPE` (`src/lib/audit/config.ts:15-19`).
  The comment at `config.ts:27-31` calls it "where a consuming site keeps its shared public
  components." `token-colors` (error tier, not `adminOnly`) already runs there, so a hex, rgb,
  named, or achromatic literal in a public component raises both `token-colors` (error) and
  `public-literals` (advisory). `type-scale` does not double-fire in practice, because it resolves
  through the admin sheet, which never compiles a public `text-[…]`. The same file does still draw
  `no-uncompiled-class` errors.

`parseScope` also takes roots only (`run.ts`), so "`src/routes` minus `src/routes/admin`" needs an
exclude mechanism that does not exist yet.

**Proposed fold.**

- Set the default public roots to `src/theme`, `src/chassis`, `src/routes` excluding
  `src/routes/admin`, and `src/lib/components`.
- On cairn's own tree, name the roots in a root `cairn-audit.config.json`: the showcase's
  `src/theme`, `src/chassis`, and `src/routes/(site)`, plus a named engine public directory, which
  probe 3's throwaway component also needs as a home.
- Rule that a file belongs to one scope. The non-`adminOnly` admin-family rules skip any file the
  public scope claims, the same way `adminOnly` rules already narrow.
- Add `exclude` to the scope config.

### 2. Major: `sheet.ts` fuses a preceding comment into the property name, and the new rules key on property names

**Location:** spec lines 121-136, the three rules, against `src/lib/audit/sheet.ts`.

**Evidence.** I ran `parseSheet` over the source files:

```
theme.css      23 declarations with a comment fused into the property name
tokens.css      7
prose.css       3
cairn-admin.css 5
```

One example, the dark `:root:not([data-theme])` block, yields the property
`'/* On-surface inks (dark) lift with the surface, … */\n    --color-muted'`. The parser was built
for compiled sheets, which carry no comments. The pass B rules read authored source, which does.

**Consequences.**

- `public-literals` exempts "a custom-property value in a theme CSS file." A fused name no longer
  starts with `--`, so `--color-base-100: oklch(98.4% 0 0)` (preceded by a comment in `theme.css`)
  would be flagged.
- `theme-conformance` would report keys such as `--radius-selector` as missing.
- `theme-contrast` would fail to find `--color-muted` in the dark block.

The same defect already hides any `transition` or `background-color` preceded by a comment from
the existing admin rules.

**Proposed fold.** Make the first audit task of chain 2 a `sheet.ts` fix: strip comments from
declaration names and values, with a regression test over `theme.css`. Every later rule depends on
it.

### 3. Major: `theme-contrast` cannot resolve through culori as stated, and the resolver's scheme model is unspecified

**Location:** spec lines 133-136.

**Evidence.**

- `parse('color-mix(in oklab, …)')`, `parse('var(--color-info)')`, and
  `parse('oklch(from red l c h)')` all return `undefined` in culori 4.0.2. Only the arithmetic is
  available (see "What was verified sound").
- culori is a `devDependency` (`package.json`). It is not a runtime dependency, and it is absent
  from all five consumer sites' `node_modules`. The audit ships in the package (`dist/audit/`) and
  runs in consumers.
- The audit's own `color.ts` header records the opposite design choice: "The fix is to stop parsing
  color syntax at all … `resolveColors` in rendered.ts hands the string to the browser's own
  canvas."
- The current parser hard-codes the theme names (`daisyThemeBlock(css, 'cairn')` and
  `'cairn-dark'`), light inks on the first `:root`, and dark inks under
  `@media (prefers-color-scheme: dark)`. The spec's own fixture is "a dark-first palette," which is
  exactly the shape that breaks those assumptions.
- The default `--color-muted` is translucent (`color-mix(… 60%, transparent)`), so contrast needs
  alpha compositing over the ground. The current code parses only opaque `oklch(`.

**Proposed fold.** State three things in the spec:

1. The resolver is new code: `var()` substitution from a token map, plus `color-mix` evaluated with
   culori's `interpolate(…, 'oklab')`, then alpha-composited over the ground.
2. The scheme model: for each named daisyUI theme block, resolve tokens as the cascade would for
   `html[data-theme="<name>"]`. The `prefersdark` theme additionally takes the
   `@media (prefers-color-scheme: dark) :root:not([data-theme])` block. Sources are ordered as the
   site's import order, with the engine defaults loaded from
   `node_modules/@glw907/cairn-cms/dist/theme-tokens.css`, mirroring `DEFAULT_SHEET_CANDIDATES`.
3. culori becomes a runtime dependency. This is a new dependency and goes through the dependency
   policy.

The alternative is to evaluate in the browser, as `color.ts` does. It avoids the dependency but
needs a built site. I recommend the static resolver, because a re-skin is checked before any build.

### 4. Major: choosing each ink's N "by measurement on Waymark" measures the wrong population and the wrong ground

**Location:** spec lines 97-98.

**Evidence** (dual-gamut minimum ratio, the existing `dualGamutRatio`):

- Waymark overrides all four inks, so Waymark never renders the default. Its fills are also already
  pinned near AA. Feasible N on Waymark `base-100` is 0-100 for info and success, 0-99 for error,
  and 0-56 for warning, with dark mode passing at any N. The measurement therefore constrains
  almost nothing.
- Measured across daisyUI's 35 stock themes, the N a Waymark measurement would allow fails widely:

  | status  | N=30 fails (base-100) | N=50 fails | N=70 fails | chroma kept at N=30 |
  |---------|-----------------------|------------|------------|---------------------|
  | info    | 1/35                  | 4/35       | 14/35      | 40%                 |
  | success | 1/35                  | 4/35       | 13/35      | 40%                 |
  | warning | 1/35                  | 6/35       | 19/35      | 35%                 |
  | error   | 0/35                  | 4/35       | 10/35      | 37%                 |

  Passing all 35 needs N ≤ 14 for info and success, and those inks are close to grey. The outlier is
  `valentine`.
- Inks are painted on more than `base-100`. The code ramp (`--cairn-code-string`, `-function`, and
  `-number` read the inks) sits on `--cairn-code-bg: var(--color-base-200)`. Callout and alert
  titles sit on tinted grounds (`prose.css:470-493`, for example
  `color-mix(in oklab, var(--color-info) 10%, var(--color-base-100))`). On Waymark light, info at
  N=100 measures 4.55 on `base-100`, 4.29 on `base-200`, and 4.01 on its callout ground. A
  `base-100`-only measurement passes an ink that fails where it renders.

**Proposed fold.**

- Measure N across a population: Waymark with its ink overrides removed, the fixture theme, and the
  35 stock themes.
- Measure on all three grounds.
- Expect roughly N = 30-40, with about 35-45% of the fill's chroma kept.
- State that a fixed-percentage default is best-effort and `theme-contrast` is the guarantee.
- Add the `base-200` and callout-ground pairs to `theme-contrast`, since today's gate checks only
  `base-100`.

### 5. Major: the fixture's "must build and render" proof has no mechanism

**Location:** spec lines 162-166.

**Defect.** `test:reskin` (`scripts/lab/reskin-fixture.mjs`) is a Node text check. It rotates a hue
in a copied `theme.css` and runs the contrast and resolution functions. It never builds or renders.
"The showcase must build and render under it with no chassis edit" is the stated permanent guard on
the governing principle, yet no harness exists and no pass criterion is named.

**Proposed fold.** Specify the harness and its assertions:

- Swap the fixture into a temp copy of the showcase, or through a Vite alias.
- Run `vite build`.
- Load home, one article, and the styleguide in Playwright.
- Assert no custom property used by a painted element computes to its initial value, and assert the
  public scope reports zero findings.
- Count it as its own chain 2 task.

### 6. Minor: the default `--color-muted` fails AA on Waymark light and on 15 of 35 stock themes

**Location:** spec line 70 ("Every key carries a working default").

**Evidence.** Composited over the ground, the default `color-mix(… base-content 60%, transparent)`
measures:

- Waymark light: 4.22 on `base-100` and 4.13 on `base-200`. Waymark overrides it, so no render
  change.
- It fails on `base-100` in silk, luxury, aqua, valentine, emerald, caramellatte, dim, coffee,
  nord, synthwave, fantasy, cupcake, sunset, retro, and winter.

An opaque `color-mix(in oklab, base-content M%, base-100)` fails 9 of 37 at M=70% and 2 of 37 at
M=80%.

**Fold.** Give muted the same derivation-and-measurement treatment as the inks, or soften the
wording to "legible default, gated by `theme-contrast`." A new theme leaning on defaults otherwise
fails its first `theme-contrast` run on muted text.

### 7. Minor: `public-literals` flags Waymark's own `site.css`

**Location:** spec lines 121-124.

**Evidence.** `examples/showcase/src/theme/site.css:44` is
`html { font-size: clamp(1rem, 0.7631rem + 0.2631vw, 1.125rem); }`. That is an absolute font size
outside a custom property. `check-public-tokens.mjs` carries a named exemption for exactly this
declaration (`EXEMPT_DECLARATIONS`). Probe 2 ("zero findings") fails for any theme started from
Waymark.

**Fold.** Carry a reasoned suppression directive in `site.css`, or state the exemption in the
rule.

### 8. Minor: `markup.ts` exposes only fully static `style=` values

**Location:** spec line 121, against `src/lib/audit/markup.ts:51-58` and `literalValue`.

**Defect.** `ElementAttribute.value` is present only when the value is a single static `Text` part.
`style="color: {c}; background: #fff"` reads as absent. Svelte `style:color="#fff"` directives are
not recorded at all: `attributesOf` handles only `Attribute` and `ClassDirective`.

**Fold.** Expose the static text parts of mixed attribute values, and record `StyleDirective`
nodes. It is a small substrate task inside the `public-literals` task.

### 9. Minor: `theme-conformance`'s resolution sources are incomplete

**Location:** spec lines 129-130.

**Evidence.** A simulation over the showcase public scope, with definitions taken from `theme.css`,
`chassis/tokens.css`, and the daisyUI keys, leaves these danglers:

- `--tag-filter-radius`, a component-local definition in `routes/(site)/+page.svelte:274`.
- `--site-figure-max-height`, `--site-banner-radius`, and `--site-banner-border-width`, which are
  the theme's own tokens in `site.css`.
- Dynamic `var({s.token})` in the styleguide.
- Prefix mentions inside comments and strings (`--text-step-`, `--color-`).

**Fold.**

- Count as "defined" every custom-property declaration in the public scope and the chassis, plus
  the engine defaults, the daisyUI keys, and `tailwindcss/theme.css`'s keys.
- Skip non-literal names.
- Parse through `sheet.ts` (after finding 2), never a regex over raw text.

### 10. Minor: the completeness check and its rationale need three corrections

**Location:** spec lines 128-132.

- **Built-in names.** daisyUI merges a built-in theme's tokens when a block's `name` matches one
  (`node_modules/daisyui/theme/index.js`: `if (allThemes[name]) { themeTokens = {...builtinTheme, ...customThemeTokens} }`).
  A block named `dracula` with no keys is complete at runtime and must not be flagged.
- **Inaccurate rationale.** The rationale on lines 131-132 is inaccurate. With the four keys
  removed from `theme.css`, today's `checkTokenResolution` does report `--border`,
  `--radius-selector`, `--radius-box`, and `--radius-field` as dangling. What it misses is a
  one-block omission: with the keys removed from `cairn-dark` only, it returns `[]`.
- **Per-block strictness.** At runtime the default theme's `:where(:root)` selector supplies any key
  a secondary block omits, so the real hole is an omission from the default block. Strict
  per-block checking is fine at advisory tier, but the message should say which case it is.

**Fold.** Correct the rationale and handle built-in names.

### 11. Minor: a derived ink declared on `:root` goes stale under a nested `data-theme`

**Location:** spec lines 93-95 ("one formula for both schemes").

**Evidence** (Chromium): a `.x { color: var(--ink) }` inside `<div data-theme="d">`, with `--ink`
declared on `:root` only, computes to `oklab(0.4 …)`, the light ink on a dark ground. Redeclared at
the themed element, it computes to `oklab(0.81 …)`. Custom properties inherit their computed value
with `var()` already substituted.

**Fold.** Declare the derived defaults on `:root, [data-theme]`. It costs one selector. Waymark is
unaffected, since it themes `<html>`.

### 12. Minor: the `daisyui` runtime import is undeclared

**Location:** spec line 62, for the audit's use.

**Defect.** `daisyui` is an engine `devDependency`. The shipped audit's import would resolve from
the consumer's own `node_modules`. All five sites and the template declare `daisyui`, so it works
today, but nothing states the requirement.

**Fold.** Declare it as a peer dependency (optional is acceptable), or fail with a named message
when it cannot be resolved.

### 13. Minor: the chains share more audit files than the registry

**Location:** spec line 201.

**Defect.** Chain 2's public scope touches `config.ts`, `run.ts`, `types.ts`, and (per finding 2)
`sheet.ts`. Chain 1 touches the rules directory, `norms.ts`, and `bin.ts` (for `norms <role>`). The
overlap is probably only `rules/static/index.ts` and `types.ts`.

**Fold.** Name those two files in the plan so the chain merge is expected.

## Owner forks

None. Every finding above is a method or architecture call under the workstation rule. The one
decision with a dependency cost is finding 3: culori as a runtime dependency versus browser
evaluation. I recommend culori, because it is small, dependency-free, and already the repo's color
library.
