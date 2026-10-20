# Theme identity pass B: contract and criteria review

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at `4365ac34`.
**Lens:** contract and criteria. The question for each promise is whether it is testable, whether
its criterion names a fixture, and whether the criterion could pass vacuously.
**Reviewer:** Opus 5.5, high effort, read-only on the spec. Evidence comes from the repo at
`main` and, read-only, pass A's completeness test in its worktree.

**Verdict:** chain 1 inherits the parent spec's G2 criteria, which already name fixtures and failure
reasons. This review finds nothing to add there. Chain 2's contract is sound as design, but its
proof section is written almost entirely as positive checks. Several of those checks pass when the
thing under test is inert, mis-scoped, or invisible to the instrument. None of the findings reopens
a design decision. Each fold is a sentence or a named fixture in the spec, not new scope.

Counts: 0 blocker, 6 major, 6 minor, 0 owner forks.

## Major

### 1. The three new rules have no failing fixtures, so an inert rule passes the proof

- **Location:** spec lines 114–141 (the guard) and 162–166 (the fixture theme).
- **Defect:** the only acceptance criterion attached to `public-literals`, `theme-conformance`, and
  `theme-contrast` is that "the three audit rules must pass" on the fixture theme (line 164). A
  rule that never fires satisfies this. The parent spec's G2 section requires that "Fixtures prove
  each finding" for its rules. This spec states no such requirement for chain 2. The hole that
  `theme-conformance` claims to close (line 130, a theme that omits `--radius-box`) is never
  demonstrated to be closed.
- **Fold:** add one sentence under Proof: each rule ships with failing fixtures, and each fixture
  must raise exactly the named finding. At minimum:
  - `public-literals` flags a `#hex` in a component `<style>`, an `oklch(` in a `style=`
    attribute, `text-[14px]`, and `bg-[#abc]`. It also flags ecxc's `--color-header` pattern: a
    custom-property literal in a component, outside `src/theme`.
  - `public-literals` passes a custom-property literal in `src/theme/*.css`, `text-sm`,
    `bg-red-500`, and a `0.88em` size, so the boundary is pinned from both sides.
  - `theme-conformance` flags a theme block that omits `--radius-box`, and a `var(--typo-token)`
    in a component.
  - `theme-contrast` flags a hand-set ink below AA, and a derived ink that clears AA in the light
    block but fails in the dark block. The second fixture proves that the resolver evaluates
    `color-mix` per scheme and does not resolve once globally.

### 2. Moving contrast into an advisory rule demotes an existing failing CI gate

- **Location:** lines 133–141 and 176–177.
- **Defect:** `npm run check:public-tokens` runs today in `.github/workflows/design.yml:38` and
  exits nonzero on any literal or AA failure. That covers the showcase and the `examples/cairn-theme`
  overlay merge (`CAIRN_THEME_CSS`). The spec moves both checks into audit rules at advisory tier,
  and advisory "reports and never gates" (`src/lib/audit/types.ts:11`). It also lets
  `check-public-tokens.mjs` retire. `check:public-tokens` is absent from the "Gates that stay
  green" list. If the plan follows the text, an AA regression in Waymark stops failing cairn's own
  CI, as does a literal in the showcase or an overlay retone below AA. `test:reskin` covers only
  the hue-rotated copy, not the overlay.
- **Fold:** state that advisory tier governs only a consumer's exit code. Over cairn's own tree,
  the showcase, and the overlay, the three public rules must fail CI from day one. Either
  `check:public-tokens` calls the audit's public rules and exits nonzero on any finding, or the
  audit gains a strict mode that the repo gate uses. Add the overlay-merge contrast case to the
  things that must survive the reduction. Add `check:public-tokens` (or its successor) to the
  "Gates that stay green" list.

### 3. "Baselines must not change" cannot see most token drift

- **Location:** lines 160–161.
- **Defect:** the claim is that every default reproduces today's value and that Waymark does not
  move. The instrument named is the `site-visual` baseline set, which has four blind spots:
  - `playwright.config.ts:14` sets `maxDiffPixels: 120`.
  - Playwright's default per-pixel `threshold` of 0.2 ignores small color shifts entirely.
  - The baselines are CI-canonical. `durable-gotchas.md` lets a local gate pass while failing on
    exactly the home and archive2 files of the last regeneration, so a real shift on those
    surfaces is masked locally.
  - No baseline captures a focus or hover state, so the three `--cairn-focus-ring-*` defaults are
    invisible to it.

  A mis-ported default (a slightly different `--color-card-border` mix, or a focus-ring offset)
  can pass this criterion.
- **Fold:** add a computed-token equivalence test, the same form as pass A's build assertion (the
  `equiv.mjs` pattern). Before the move, record `getComputedStyle(documentElement)` for every
  `theme-tokens.css` key and every daisyUI key. Record them under Waymark light and dark, on the
  built showcase. After the move, assert string equality. Keep the baselines as the secondary
  check. A diff in the computed values is then the finding, and the check runs identically
  locally and on CI.

### 4. `check:reference` cannot gate a CSS subpath, so the reference page and the seam promise are unguarded

- **Location:** lines 88–89 and 145–148.
- **Defect:** `scripts/checks/reference-coverage.mjs` enumerates exports from built `.d.ts`
  files through the TypeScript compiler API (lines 2–3 and 530–546). A CSS subpath has no
  `.d.ts`. `./admin-sources.css` is likewise absent from its table. "`check:reference` gates it"
  therefore passes whatever the page says. The seam promise has the same gap. Line 88 says that
  renaming or removing a `theme-tokens.css` key is a disclosed contract change, but no check
  notices a removal. `check:surface` covers TypeScript exports only.
- **Fold:** add a key-sync test. It parses every custom property declared in `theme-tokens.css`
  and asserts that each one appears on `docs/reference/theme-tokens.md` with its default, and
  that the page names no key the file lacks. Pin the key set in a snapshot that fails on any
  removal or rename. That makes the snapshot update the explicit disclosure event, the way
  `check:surface` works for TypeScript. Either extend `reference-coverage.mjs` with a CSS arm or
  write a standalone unit test. The spec should name which one.

### 5. The public scope can match nothing over cairn's own tree, and probe 2's "zero findings" can be vacuous

- **Location:** lines 116–119, 154–156, and 170–171.
- **Defect:** cairn's own tree has no `src/theme` and no `src/routes`. Its `src/lib/components` is
  the admin component directory, including `cairn-admin.css` and its literal palette. The
  "engine's public component directories" (line 118) are unnamed, and today the only candidate is
  `src/lib/delivery/CairnHead.svelte`. This leaves two failure modes:
  - The default roots scan the admin tree and flood with false positives. The plan will then
    narrow the roots until they match almost nothing.
  - The engine roots match no files, and "`public-literals` over cairn's own tree enforces it"
    (line 156) holds by vacuity.

  The existing static scope throws when it matches no files (`src/lib/audit/run.ts`, `runStatic`),
  but the spec does not require the same of the new scope. Probe 2 has a related gap. An agent
  that puts its theme or component outside the default roots, such as `src/lib/theme` or
  `src/styles`, gets zero findings because nothing was scanned.
- **Fold:**
  - Name the engine directories that the public scope covers in cairn's tree, and exclude the
    admin directories explicitly.
  - Require the public scope to fail with an actionable error when its roots match no files, the
    same behavior as `static.scope`.
  - Make probe 2's criterion "zero findings, with a scanned-file count that includes every file
    the probe created or edited."

### 6. "Builds and renders under the fixture theme" and probe 3's "renders correctly" have no observable

- **Location:** lines 162–166 and 172–174.
- **Defect:** a showcase build succeeds even when the fixture theme is not wired in, for example
  when Waymark's `theme.css` is still the one imported. "Render" names no assertion, so this
  criterion cannot fail in the case it exists to catch. Probe 3's "must render correctly under
  Waymark and under the fixture theme" names no judge and no reference. `test:reskin` is a pure
  Node script today (`scripts/lab/reskin-fixture.mjs`), so the spec also leaves open where the
  build and render happen.
- **Fold:**
  - For the fixture: after the build, assert on a rendered page that the fixture actually took
    effect. Examples are a computed `--radius-box` of `0`, the fixture's display face in
    `font-family`, a derived ink equal to its `color-mix` result, and the custom token read by
    the element that uses it.
  - For probe 3: the component renders in the showcase under both themes. The public scope
    reports zero findings on its directory, with a nonzero scanned-file count. Its computed color
    and radius differ between the two themes and equal each theme's tokens, which proves the
    component reads the contract rather than a constant.
  - Name the harness, whether `test:reskin` grows a build step or a separate e2e.

## Minor

### 7. The guidance-table test names the wrong resolution set and can pass on zero rows

- **Location:** lines 149–153.
- **Defect:** "every token its table names exists in `theme-tokens.css`." The table's own jobs
  include body ink (`--color-base-content`) and the card edge. Body ink is a daisyUI key, which
  `theme-tokens.css` never defines. The test as written therefore fails on a correct table, or
  the plan quietly carves daisyUI keys out. A table parser that matches no rows also passes.
- **Fold:** "exists in `theme-tokens.css` or in daisyUI's theme key list," reusing the set that
  `theme-conformance` reads. Also assert that the parsed row count equals the eight named jobs.

### 8. `theme-conformance` can pass with no theme blocks or an empty key list

- **Location:** lines 60–64 and 128–132.
- **Defect:** "each named daisyUI theme block defines every daisyUI theme variable" passes when the
  rule finds zero blocks. That happens when a theme defines its themes as `[data-theme=x]` rules,
  or when the theme file sits outside the roots. The rule also passes when the key list read from
  `daisyui/theme/object` is empty or fails to load in a consumer. The resolution half is worse
  here. If daisyUI's keys seed the "defined" set, the way `DAISYUI_GENERATED_ROLES` does today in
  `check-public-tokens.mjs`, then a theme that omits `--radius-box` resolves as defined by
  daisyUI. That is the exact hole the rule claims to close.
- **Fold:**
  - Fail loudly when the key list is empty or lacks `--color-base-100` and `--radius-box`.
  - Raise a finding when the chassis sets `themes: false` and the scope contains zero
    `@plugin "daisyui/theme"` blocks.
  - Seed resolution with daisyUI's keys only for blocks that conformance has already verified,
    never unconditionally.

### 9. The resolution set omits Tailwind's own theme variables

- **Location:** lines 128–130.
- **Defect:** line 125 permits Tailwind's utilities as tokens a designer may choose. Their
  variables (`var(--color-red-500)`, `var(--spacing)`, `--tw-*`) resolve to none of the three
  sources the rule names, which are the theme, `theme-tokens.css`, and daisyUI. The rule then
  either flags legitimate use or gains a prefix carve-out broad enough to make it vacuous.
- **Fold:** add Tailwind's default theme keys to the resolution set, read from
  `tailwindcss/theme.css` so the list tracks upgrades, the way daisyUI's list does. Add a fixture
  in each direction: `var(--color-red-500)` passes and `var(--color-red-550)` fails.

### 10. Derived inks are declared on `:root` only, the N measurement has no standing check, and the contrast resolver's model is unstated

- **Location:** lines 91–103.
- **Defect:** the inks are declared on `:root`, so `var()` resolves them against `:root`'s roles.
  A nested `data-theme` region, which daisyUI supports, inherits the outer scheme's already
  computed ink. Static `theme-contrast` evaluates per block and cannot see this. N is "picked by
  measurement" against Waymark, but Waymark overrides all four inks. After the pass, nothing
  re-measures the derived defaults that a new theme actually gets. The fixture theme hand-sets
  one status, so that status's derived default is never exercised.
- **Fold:**
  - Declare the derived defaults on `:root, [data-theme]` so that they recompute under a nested
    theme.
  - Add a standing `test:reskin` case: Waymark with its four ink overrides stripped must pass
    `theme-contrast` in both schemes. That case is the permanent check on N.
  - State how the resolver maps a theme's ink overrides to each block, whether through `:root`,
    a dark media root, or `[data-theme]`. The dark-first fixture then proves that mapping.

### 11. "Every default reproduces today's value" is false for the inks, and the migration line hides it

- **Location:** lines 93–94, 160, and 183–185.
- **Defect:** today's ink defaults are `var(--color-<status>)` (`chassis/tokens.css`). The new
  defaults are `color-mix` values. Waymark overrides the inks, so its render is unaffected. A
  consumer whose stale copy never overrode an ink changes color at the import swap. So does any
  default that drifted since that consumer copied the file. The migration note calls this a
  "one-line swap." Separately, daisyUI's key list includes `color-scheme` (`daisyui/theme/object`,
  29 keys), which the contract list on lines 60–62 omits. The "minimal set" guidance built from
  that list could therefore leave it out.
- **Fold:** reword line 160 to "every default except the four inks reproduces today's value."
  Have the `Consumers must:` line and the migration note name the ink change and tell a site to
  compare its old copy's values before the swap. Add `color-scheme` to the contract list and to
  the minimal conforming set.

### 12. The `public-literals` boundary is underspecified, and a probe fix is never re-verified

- **Location:** lines 121–127 and 175.
- **Defect:** the existing `COLOR_LITERAL` regex matches only hex, `rgb`, `hsl`, and `oklch`. It
  misses named colors, `lab(`, `lch(`, `oklab(`, `hwb(`, `color(display-p3 …)`, and SVG
  `fill`/`stroke` attributes. The spec does not say which of these the rule covers. The exemption
  is hard-coded to `src/theme/**/*.css`, while the roots are configurable. A site that relocates
  its theme gets its token file flagged, with no documented override. The `paletteFiles`
  precedent in `config.ts` is the existing idiom for this. Separately, line 175 lands a guidance
  fix after a probe fails, but never re-runs the probe, so the fix is unverified.
- **Fold:** enumerate the covered literal syntaxes in the rule's fixtures. Make the exemption
  follow a configurable theme-file list that defaults to `src/theme/**/*.css`. Re-run a failed
  probe with a fresh agent after the fix, once. A second failure escalates.

## Checked and sound

- Chain 1's criteria, by reference to the parent G2 section, name fixtures and failure reasons,
  including the sync test's one-copy-edited failure.
- The daisyUI key list does track upgrades. Pass A's `admin-theme-completeness.test.ts` reads
  `daisyui/theme/object` and diffs in both directions, so reusing it is sound, given the
  non-empty guard in finding 8.
- The `@theme` utility-generation proof is deferred to the plan with a named fallback. Any
  failure is loud, because missing utilities would break the showcase render wholesale, so a
  vacuous pass is unlikely.
