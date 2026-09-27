# Theme identity pass B: the admin agent path and one public theme

**Status:** draft, folded (2026-09-27). Geoff approved the brainstorm's design in conversation. The
nine-lens review then ran, and its fold changed parts of that design. Every change is listed in the
fold record, and each change that needs Geoff's word is under Owner rulings. This document awaits
Geoff's read and his answers to R1 through R5.

**Extends:** [`2026-09-26-theme-identity-design.md`](2026-09-26-theme-identity-design.md). Its
"G2: easy for agents" section and the "Pass B, the agent path" bullet under Delivery define chain 1
below. This spec adds nothing to that scope and restates it only by reference; where the two
disagree, the earlier spec governs chain 1. The fold changes no meaning in the parent, so no erratum
is owed.

**Folds in:** the ROADMAP "One public theme" initiative (Geoff, 2026-09-27), which sequences
before draft documentation resumes.

**Evidence:** the brainstorm's harvest of the five production sites' theme files and its Waymark
chassis inventory. Neither report was committed, so this spec now rests only on the claims the
review reproduced: every site's copied `src/chassis/tokens.css` lacks the focus-ring set and
`--cairn-caption-tracking`, and `prose.css` reads the three radii and `--border` with no fallback.
The review record is nine files, `docs/superpowers/research/2026-09-27-theme-pass-b-review-*.md`,
plus the [ecosystem survey](../research/2026-09-27-theme-ecosystem-survey.md) and the
[fold record](../research/2026-09-27-theme-pass-b-fold.md).

## Goals

Geoff's intent, from the brainstorm:

- Every production site will be rebuilt starting from the Waymark theme, as a test of whether it
  can be re-skinned to each site's personality. The public theme is therefore the surface a
  designer works in four times over, not a one-off.
- "cairn should be able to include a non-Waymark theme." The contract must be theme-independent.
  This initiative makes a second theme possible and proves it; shipping one is later work.
- "A cairn implementer [should] be able to add a new component to the library and have it easily
  access the theme values." The library means both the engine's public components and the chassis
  component set (R4).
- "Our system [must not] box in a designer who wants a very different look-and-feel," and it must
  be "something a theoretical theme designer would be happy to work with."
- The system should be "clean, simple, logical, and flexible," following idiom without
  over-engineering. Geoff delegates the design-system shape to Claude.

## The governing principle

**The contract is a floor, never a ceiling.** It names what a theme must provide for cairn's own
parts to render. It never limits what a theme may add, replace, or skip. A theme may define any
tokens of its own, may replace or drop the chassis `prose.css` and `composition.css`, and may
restyle anything through the ordinary cascade. The guard polices literals, never vocabulary: it
checks that a value comes from a token, never which token, and never where a token is defined.

## Chain 1: the admin agent path

Unchanged from the theme identity spec: the `radius-scale` rule and the retired-patch arms on
`stock-default-hazards`, both advisory; the recipe field beside `RATIFIED_NORMS` as the one source
for the guidance tables, and `cairn-audit norms <role>` printing each recipe line; the shipped
guidance (`skills/cairn-admin-screens/SKILL.md` with a new exemplar built from the fixture screen,
`skills/cairn-extend/references/daisyui-first.md`, `claude/agents/cairn-extension-reviewer.md`);
the sync test between the guidance tables, the recipe source, and the fixture route; and the
admin agent-build probe. It depends on pass A's final class vocabulary and fixture screen.

## Chain 2: one public theme

### The contract

The public theme contract has three parts, and nothing else:

1. **daisyUI's theme variables:** `color-scheme`, the 20 color roles, `--radius-selector`,
   `--radius-field`, `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, and
   `--noise`. The key list is read from `daisyui/theme/object`, a declared daisyUI export and the
   source pass A's completeness test uses, so it tracks daisyUI upgrades. Nothing in cairn defaults
   these keys. daisyUI does, when a theme block extends a built-in theme by name.
2. **One engine-shipped public stylesheet, `@glw907/cairn-cms/public.css`,** beside the existing
   `./admin-sources.css`. It holds four things:
   - cairn's roles, declared in `@layer theme` on `:root, [data-theme]`: the four status inks,
     `--cairn-shadow`, the focus-ring set, the code ramp, and `--flow-space`;
   - two utility-bearing colors in `@theme`, `--color-muted` and `--color-card-border`;
   - `@layer components` rules for the engine-emitted classes whose styling carries no design
     choice: the `pre.shiki` and `.cairn-tok-*` binding, `cairn-focus-ring`, and the structural
     `.table-scroll` rule that makes the engine's scroll region work;
   - one `@source` line over the engine's public component directory, `src/lib/public/` (shipped
     as `dist/public/`), copying the `admin-sources.css` pattern.
3. **The classes the engine emits into public markup,** named in the registry on
   `docs/reference/render.md`. The registry gains `pre.shiki`, `.cairn-tok-*`, `cairn-place-*`, and
   `table-scroll`, and each entry says whether the engine sheet styles the class or a theme must.
   A theme that replaces `prose.css` reads this list to learn what its sheet must cover.

**Naming.** daisyUI's names for daisyUI's keys. A cairn key goes in `@theme` under Tailwind's
namespace when a utility should read it, as `text-muted` reads `--color-muted`. Every other cairn
key is a `--cairn-*` role. `--flow-space` is the one unprefixed role, grandfathered because every
site's prose reads it. There are no aliases.

**Admission.** A key enters `public.css` only when an engine or chassis file reads it. Waymark's
own keys stay in Waymark's `theme.css` as theme tokens: the CTA set and `--cairn-caption-tracking`,
whose only readers are Waymark's styleguide and `SiteHeader`. The engine never redefines a Tailwind
stock key such as `--leading-tight` or `--font-mono`.

**Why the design scale stays in the chassis.** The faces, `--text-step-*`, `--spacing-*`,
`--leading-*`, `--tracking-*`, and the two measures stay in the chassis `tokens.css` as site-owned
`@theme` defaults. Three findings point the same way. Five of the eight `--spacing-*` names shadow
Tailwind's container sizes (`max-w-2xl` compiles to the 4rem space step, not 42rem), and shipping
them from the engine would make that trap permanent contract. Four scale keys redefine Tailwind stock
keys, which is the site's choice to make, never the engine's. And every theme retunes its scale
anyway, while the stale-copy evidence is entirely `:root` roles. Keeping the scale site-owned keeps
the engine contract small and removes the `@theme`-pruning risk for the scale. The cost is that an
engine public component cannot rely on a scale key; it sizes type and space from its context (`em`,
`inherit`) or from daisyUI's `--size-field` and `--size-selector`. A chassis or site component reads
the scale freely, since the chassis defines it. The chassis README's collision note is corrected to
all five shadowed names.

The chassis `tokens.css` therefore keeps: the Tailwind import, the daisyUI plugin activation, the
`public.css` import, the `prose.css` and `composition.css` imports, `@source not "./.claude"`, and
the design scale. The roles, the code-block binding, and the focus-ring utility leave it.

**Why the roles sit in a layer.** `@layer theme` is the lowest layer Tailwind declares
(`@layer theme, base, components, utilities`). An override therefore wins wherever a theme writes it:
unlayered in `:root`, or in its `@plugin "daisyui/theme"` block, which daisyUI emits in
`@layer base`. The `[data-theme]` selector makes a derived role recompute under a nested theme; a
role declared on `:root` alone inherits the root scheme's already-computed value (measured in
Chromium). daisyUI emits a theme block's custom properties on both its dark-preference selector and
`[data-theme="<name>"]`, so a theme puts each per-scheme value in that scheme's block and needs no
hand-synced dark triple. One limit applies. A comma-separated value such as `--cairn-shadow` does
not survive daisyUI's option parser, so it stays in `:root`. The two `@theme` colors follow
`@theme`'s own rule, where the later declaration wins, and the chassis imports `public.css` before
the theme's own blocks. They also resolve at
`:root` and do not recompute under a nested theme; the reference page states this, and a theme that
nests sets them in the nested block. `@theme static` was rejected for the pruning problem, because
a theme's ordinary `@theme` redeclaration drops the static flag.

**Why the defaults move into the engine.** The charter says public output stays design-agnostic,
and three rulings moved public-side pieces out of the engine and into the chassis
(`copy-to-clipboard-control`, `site-today-export`, and the `audit-render-*` re-homings). This move
is consistent with them. The defaults are the value half of a contract the engine already owns: the
classes it emits, and the tokens those classes and the chassis read. The stale-copy evidence meets
`site-today-export`'s own reopen condition, "evidence an export fixes the discoverability failure
better than the chassis copy does". All five sites' copies froze and missed keys added since, and
an engine component that reads a newer key fails silently on an older site. Shipping a package's
design defaults in the package is the daisyUI and Tailwind idiom. The pass records a new ruling in
`docs/internal/engine-rulings.md` (the proposed text is in the fold record).

**What stays copied, on purpose.** `prose.css` and `composition.css` are the design itself, so
they stay copy-on-create, the Drupal Starterkit and shadcn choice. The cost is stated: the four
rebuilt sites do not receive upstream prose fixes automatically. Those fixes reach a site through
the migration notes.

**Engine public components.** An engine public component may assume `public.css` and daisyUI's
theme variables. It lives in `src/lib/public/`, where the `@source` line makes its markup a scanned
source on every consumer, so its Tailwind utilities compile and the `@theme` keys it reads are
emitted. It uses no daisyUI component class, since a site's plugin config may exclude that
component. `PreviewBanner` migrates to this posture as a named task. It moves into
`src/lib/public/` with its `./components` export unchanged, reads contract tokens, and drops its
literal palettes and its color-scheme media blocks. Its four `--cairn-preview-*` properties stay
as named overrides whose fallbacks are tokens, so a site's existing override still wins.

**The seam promise.** `public.css` and the emitted-class registry are public surface. Renaming or
removing a key or an emitted class is a disclosed contract change. Adding a key with a default is
not breaking. Changing a default's value is a disclosed change with a changelog line; a site that
needs a value to stay fixed sets the key itself.

### Status inks derive by default

Each ink's default is `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-content))`,
one formula for both schemes, declared in the layered `:root, [data-theme]` block. Mixing toward the
ink darkens in light mode and lightens in dark mode. daisyUI derives its own soft and hover states
the same way. Relative color syntax (`oklch(from …)`) would be tighter, but it is Baseline only
since September 2024, and nothing in the repo uses it.

Derivation is the default, not the guarantee. The plan picks each `N` by measurement across
daisyUI's 35 stock themes, Waymark with its ink overrides stripped, and the fixture theme. It
measures on all three grounds an ink paints on: `base-100`, `base-200` (the code ramp), and the
callout tint. The review's sweep shows no single `N` passes every stock theme without greying the
ink, so the plan maximizes the pass count while keeping usable chroma. `theme-contrast` is the
guarantee. `--color-muted` gets the same treatment, since today's translucent default fails AA on
Waymark light and on 15 stock themes. The default shadow mixes `black`, since a
`base-content` mix glows pale in a dark scheme.

A theme can still hand-set an ink. Waymark keeps its hand-tuned inks, muted, and shadow as
overrides, and moves its per-scheme values into its daisyUI blocks, so the Waymark render does not
change. Every other default reproduces today's value. The re-skin recipe's step 6 in Waymark's
`theme.css` header changes from "retune the ink with the fill" to "the ink follows the fill;
override it only to hand-tune."

### The guard

`cairn-audit` gains a **public scope**, a sibling of the admin static scope.

- **Roots.** The default roots are `src/theme`, `src/chassis`, and `src/routes`, with
  `src/routes/admin` excluded through a new `exclude` list. `src/lib/components` stays in the
  admin scope by default; a site that keeps public components there moves the root by config.
- **One scope per file.** The admin static scope skips any file the public scope claims, so no
  file answers to two grammars and `token-colors` never double-fires with `public-literals`. A test
  asserts that the two default root sets are disjoint.
- **No silent empty scope.** The scope fails with an actionable error when its roots match no
  files, as `static.scope` does today.
- **Cairn's own tree.** The showcase's `cairn-audit.config.json` adds the engine's
  `src/lib/public/` to the public roots. The admin component directory is never a public root.

Three rules run in it:

- **`public-literals`** flags a color literal or an absolute font size in a CSS declaration, a
  `style=` attribute (including the static parts of a mixed value), a Svelte `style:` directive,
  or a Tailwind arbitrary value (`text-[#abc]`, `text-[14px]`). It shares one detection core with
  `token-colors`, extended with the chromatic and wide-gamut forms (`hsl`, `hwb`, `lab`, `lch`,
  `oklab`, `oklch`, `color()`) and named colors. An absolute font size is `px`, `pt`, or `rem`;
  `em`, `%`, and a `var()` or `calc()` over tokens pass. `transparent`, `currentColor`, and the
  CSS-wide keywords are not literals. A custom-property definition is legal anywhere under a theme
  root, including a component's `<style>` block. The theme roots default to `src/theme` and are
  configurable in the same path-list shape as `static.paletteFiles`. The root element's
  `font-size` is exempt, since it defines `rem` for the page (Waymark's `site.css` clamp). Tailwind's
  own utilities (`text-sm`, `bg-red-500`) are not flagged; they are tokens a designer may choose.
- **`theme-conformance`** checks completeness and resolution. Each named daisyUI theme block must
  define every daisyUI key, except a block named after a built-in theme, which daisyUI completes by
  merging. The message says whether an omission sits in the default block (a runtime hole) or a
  secondary one, which the default block's `:where(:root)` still covers. The rule fails loudly
  when the key list is empty or lacks `--color-base-100` and `--radius-box`, and raises a finding
  when the scope holds no theme block. A `var(--x)` with no fallback must resolve to one of these:
  - the site's real import chain, where `public.css` counts only if that chain imports it;
  - Tailwind's theme variables, read from `tailwindcss/theme.css`, or the `--tw-` namespace;
  - the daisyUI keys of a block the rule already found complete;
  - any custom property declared in the scanned tree, in CSS, `<style>`, `style=`, or `style:`.

  A `var()` with a fallback and a non-literal name are skipped. Parsing goes through `sheet.ts`,
  never a regex over raw text. Two migration findings turn the `Consumers must:` line into a
  tripwire: "the public stylesheet does not import `public.css`" and "a chassis file redeclares an
  engine default". Today's check misses a key omitted from one block only; this rule catches it.
- **`theme-contrast`** is the existing dual-gamut AA check, moved from the repo-only
  `scripts/checks/check-public-tokens.mjs` into the audit. Its resolver is new code with a stated
  bound. It follows `var()` chains to a literal and evaluates the one `color-mix` form (two
  operands in `oklab` or `oklch`, one percentage) with culori's `interpolate`, whose result matched
  Chromium's computed `color-mix` to every printed digit. It then alpha-composites the result over
  the ground. Any other form yields an "unmeasured" finding, never a pass or a crash. Schemes come
  from the daisyUI theme blocks, not hard-coded names: each named block resolves as
  `html[data-theme="<name>"]` would. The `prefersdark` block also takes the
  `@media (prefers-color-scheme: dark) :root:not([data-theme])` rules. Sources load in the site's
  import order, with `public.css` read from the installed package. The pairs are every text-bearing
  role with its `-content`, plus each ink and muted on `base-100`, `base-200`, and the callout
  tint. Static resolution is sound here because it resolves token to token within theme files, with
  no layout and no computed style. The rendered checks (`check:interactive-contrast`, the showcase
  e2e) stay the ground truth, and the reference page states the coverage limits.

**Tiers.** For a consumer, the three rules report at the tier R2 settles. Over cairn's own tree
they fail CI from day one. `check:public-tokens` becomes a repo script that runs the audit's public
scope through its programmatic run over the showcase and the `examples/cairn-theme` overlay, and
exits nonzero on any finding. `check-public-tokens.mjs` retires, and `test:reskin` imports the
contrast core from `src/lib/audit`. There is one implementation of each check.

**Dependencies.** The shipped audit gains three runtime imports, each a dependency decision this
pass records under the dependency policy:
- culori moves to `dependencies`, being small, dependency-free, and already the repo's color
  library, and its bumps go through `dependency-upgrade` from then on;
- `daisyui` becomes an optional peer dependency;
- so does `tailwindcss`.

When either peer cannot be resolved, the audit fails with a named message. An `npm pack` install
smoke test runs `dist/audit/bin.js` in an empty directory, with the peers present and absent.

### Where the guidance lives

- **`docs/reference/public-css.md`**, the reference page for the new subpath. It carries the whole
  contract: daisyUI's variables, every `public.css` key with its default, the rules the sheet
  ships, the layer and nesting behavior with its limit, ink derivation, and the coverage limits of
  `theme-contrast`. It links the emitted-class registry and opens with the governing principle.
- **A new shipped skill, `cairn-site`,** replaces the planned `public-theme.md`. It covers the
  public side only, since the admin is always the same. Its shape follows the official daisyUI
  skill: a router `SKILL.md` within the packaged skill budget, pointing at reference pages. It
  defers to the official daisyUI skill for component classes. It has two halves:
  - A **theming section**, the contract as a designer uses it. It gives the job-to-token table,
    including an eyebrow row of `uppercase tracking-eyebrow`, and one placement rule: a per-scheme
    value goes in that scheme's daisyUI block. It names the fast path, extending a built-in daisyUI
    theme by name or starting from daisyUI's theme generator, beside the full-control path. It also
    lists the two sanctioned escapes from `public-literals` (a one-line `@theme` token, or a
    reasoned suppression), the theme-name touchpoints (the fixture keeps `cairn` and `cairn-dark`),
    and what a replacement `prose.css` must cover.
  - A **catalogue** of about 25 short pages for cairn's public pieces: each directive's rendered
    markup, the islands, `CairnHead`, `PreviewBanner`, the chassis composition primitives, and the
    prose elements. The component recipe names both paths. A chassis or site component is a
    `defineComponent` plus rules in `prose.css` or a component `<style>`. An engine component is
    markup in `src/lib/public/` plus rules in `public.css`. Both read contract tokens.

  A **coverage gate** asserts three things. Every directive (the showcase registry plus the engine
  built-ins), every island, and every composition primitive has a page. Every class a snippet uses
  exists in the showcase's compiled public stylesheet or the emitted-class registry. Every token a
  snippet or the table names resolves under `theme-conformance`'s resolution set. A parser that
  matches nothing fails. `skills/cairn-extend/SKILL.md` gains one routing line to `cairn-site`.
- **`cairn-implementer`'s definition** gains one line: a public component under `src/lib/public/`
  carries no literal, uses no daisyUI component class, and follows `cairn-site`'s recipe. The
  definition lives in the dotfiles repo (`~/.dotfiles/claude/.claude/agents/cairn-implementer.md`),
  outside the pass's diff. The close's conductor makes that edit and commits it in the dotfiles repo,
  verified by `claude-tooling-sync verify`, and the pass report quotes the line. `public-literals`
  over `src/lib/public/` enforces it.

## Proof

- **The Waymark render does not move, proven by computed values.** Before the move, a
  computed-token equivalence test (the `equiv.mjs` form from pass A) records
  `getComputedStyle(documentElement)` for every `public.css` key, every chassis scale key, and
  every daisyUI key. It records them on the built showcase under Waymark light and dark, plus the
  computed outline of a focused `cairn-focus-ring` element. After the move, the test asserts string
  equality. The `site-visual` baselines stay as the secondary check.
- **The public surface is snapshotted.** A standalone unit test parses `public.css`'s keys and
  rules. It asserts that the reference page lists each key with its default and names nothing the
  file lacks. It asserts that every class the sheet styles is in the render registry, and that every
  key has a reader in `src/lib` or the chassis. It pins the key set in a snapshot, so a rename or
  removal fails until the snapshot update discloses it. `check:reference` cannot see a CSS subpath,
  which is why this test exists.
- **Every rule has failing fixtures, each raising exactly the named finding:**
  - `public-literals` flags a `#hex` in a `<style>`, an `oklch(` in `style=`, `text-[14px]`,
    `bg-[#abc]`, a `style:color` directive, and a literal custom property outside a theme root. It
    passes a custom property in a theme component's `<style>`, `text-sm`, `bg-red-500`, `0.88em`,
    and the root `font-size` clamp.
  - `theme-conformance` flags a block missing `--radius-box`, a key missing from one block only,
    a `var(--typo-token)`, `var(--color-red-550)`, and a stylesheet that skips `public.css`. It
    passes a partial block named `nord`, `var(--color-red-500)`, and a route-local token.
  - `theme-contrast` flags a hand-set ink below AA, a derived ink that passes light and fails
    dark, an ink failing on the callout tint only, and an unmeasurable expression.
- **A second theme as a standing fixture, built and rendered.** `test:reskin` gains a theme file
  deliberately unlike Waymark: system-stack faces with no font assets, a square corner ladder, a
  dark-first palette, derived inks on all but one status, one custom token, per-scheme values in
  its daisyUI blocks, and a nested `data-theme` region. The three rules must pass on it. A new
  harness, `npm run test:theme-fixture`, copies the showcase to a temporary directory, swaps in the
  fixture, and runs `vite build`. It then loads home, one article, and the styleguide in
  Playwright. It asserts that the fixture took effect: computed `--radius-box` is `0`, the fixture
  face is in `font-family`, a derived ink equals its `color-mix` result, the custom token reaches
  its element, and the nested region's ink recomputes. A second arm builds the Waymark template
  against the working engine. It asserts that a key read only by an engine component under
  `src/lib/public/` reaches the compiled CSS. The harness runs in CI's design workflow, and locally
  when fast enough. `test:reskin` also gains a standing case: Waymark with its four ink overrides
  stripped must pass `theme-contrast` in both schemes. The hue-rotation case stays.
- **Three acceptance probes at the pass close,** each a fresh Sonnet agent given only the shipped
  guidance and a one-line brief:
  1. An admin screen, as the theme identity spec defines it.
  2. A minimal new theme on the chassis, with its own chrome and one custom public component. It
     passes with zero public-scope findings, a scanned-file count that includes every file the probe
     created or edited, and a clean `test:theme-fixture` build under it.
  3. A throwaway engine public component in `src/lib/public/`, written by a `cairn-implementer`. It
     passes with zero public-scope findings on its directory and a nonzero scanned count. In the
     harness's template arm, its computed color and radius must differ between Waymark and the
     fixture theme and equal each theme's tokens. The main loop also reads one screenshot per theme.
     The branch is discarded.

  A probe failure names the guidance gap. The fix lands before the close, and a fresh agent re-runs
  the probe once. A second failure escalates.
- **Gates that stay green:** `npm run check`, `npm test`, `check:reference`, `check:facts`,
  `check:template`, `check:package` (with the skill budget), `check:rulings-format`,
  `check:public-tokens` (the successor script), `test:reskin`, `test:theme-fixture`, the `npm pack`
  smoke test, `norms:check`, and the showcase e2e.

## Documentation and records

- **Facts** in `docs/internal/facts/` for each public behavior: the `public.css` subpath, the
  one-scope-per-file rule, derived inks and the changed muted and shadow defaults, the three rules,
  the `PreviewBanner` migration, and the `cairn-site` skill.
- **Reference pages:** `docs/reference/public-css.md` (new), `render.md`'s registry,
  `components.md` for `PreviewBanner`, and `cairn-audit.md` for both chains' rules and the public
  scope's config keys.
- **Frozen narrative pages, fixed under the freeze rule** (each deficiency fixed on the page, with a
  facts bullet): `docs/extend/design-your-site.md`, whose "every design-scale key … carries a
  generic default", ink-retune warning, and dependency sentence the pass makes wrong.
- **Internal docs:** `docs/internal/public-design-system.md` changes its fill-and-ink rule to "the
  ink follows the fill; hand-tune only by override". The chassis README updates the `tokens.css`
  row, "The token system" paragraph, and the namespace rule. It corrects the spacing-collision count
  to five and the sentence calling directive classes engine-fixed.
- **The charter:** `docs/internal/what-cairn-is-and-is-not.md` amends its "all 28 registered rules
  audit the `/admin` surface" line to name the public scope. The pass records the new
  `engine-rulings.md` entry.
- **`CHANGELOG.md`** under `## Unreleased`, with one `Consumers must:` line: "move any key your
  copied `src/chassis/tokens.css` adds beyond the template's into your theme, then replace the
  copied roles, code-block binding, and focus-ring utility with `@import
  "@glw907/cairn-cms/public.css"`; compare your copy's ink, muted, and shadow values first, since
  those defaults changed." `PreviewBanner`'s migration makes the import required, not optional.
- **`docs/extend/migration-notes.md`** carries the swap, the changed defaults, a `paletteFiles`
  entry that names the old copy, and the two optional peers.
- **ROADMAP** marks "One public theme" done and removes it from the live tiers.
- **The template:** `npm run emit:template` re-emits Waymark's `theme.css`, the chassis
  `tokens.css`, and the chassis README to `templates/waymark`.

## Delivery

**One pass, theme identity pass B, run as two parallel chains** through `pass-execute-chains`, with
the implementer, `diff-reviewer`, and gate chain inside each. The close's probes need both chains
finished. R5 asks whether chain 2 should instead start as its own pass.

- **Chain 1** is the admin agent path, about five tasks.
- **Chain 2** is about eleven tasks, in dependency order:
  1. The equivalence test recorded on today's tree, then `public.css`, its `@source` directory,
     the moved rules, the chassis import, and the key-set snapshot test.
  2. Ink and muted derivation by measurement, the shadow default, the stripped-overrides case, and
     Waymark's per-scheme values moved into its daisyUI blocks with its header's step 6.
  3. `PreviewBanner`'s migration into `src/lib/public/`.
  4. The `sheet.ts` fix, the first audit task: comments no longer fuse into declaration names or
     values, with a regression test over `theme.css`. Every later rule depends on it.
  5. The public scope (roots, `exclude`, one scope per file, the empty-scope error) and
     `public-literals` on the shared core, with `markup.ts` exposing mixed `style=` parts and
     `style:` directives.
  6. `theme-conformance`.
  7. `theme-contrast`, the three dependency decisions, the `npm pack` smoke test, and the
     `check:public-tokens` successor.
  8. The fixture theme and `test:theme-fixture`.
  9. The reference page, the render registry, and the `components.md` entry.
  10. The `cairn-site` skill, its coverage gate, and the `cairn-extend` routing line.
  11. The chassis README, `public-design-system.md`, `design-your-site.md`, and the template re-emit.
- **Shared files.** Both chains add lines to `src/lib/audit/rules/static/index.ts`,
  `src/lib/audit/types.ts`, `src/lib/audit/config.ts`, and `skills/cairn-extend/SKILL.md`, so the
  chain merge expects those overlaps. The close reconciles the skill budget.
- **The close** runs the three probes and makes every other edit to a shared file:
  `docs/reference/cairn-audit.md`, the facts, the changelog, the migration notes, the charter line,
  the rulings entry, the ROADMAP, and the dotfiles `cairn-implementer` line.

Segment boundaries fall every three or four tasks per chain. **The named split point:** if spend
reaches 80% of the ceiling, chain 1 closes alone as pass B and chain 2 becomes pass C with its own
close. Both halves are self-contained.

**Sequencing.** This spec and its review touch nothing in pass A's worktree. Plan authorship waits
for pass A's segment D, since chain 1 needs A's final vocabulary and fixture. Execution waits for
pass A to merge: chain 1's rules would flag cairn's unswept tree, and chain 2 edits the starter
`theme.css` that pass A's task 11 changes. Draft documentation resumes after the public theme
contract merges (pass B, or pass C under the split), and the designer's theme guide is drafted
against this contract.

**Release.** The template on `main` would import a subpath no published version exports, and the
Deploy button and the setup command read `templates/waymark` from `main`. R1 settles the ordering.

## Review

The spec ran through `spec-plan-review` on 2026-09-27 with nine lenses: contract and criteria,
mechanics, upgrade and failure risk, consistency, idiom, ease of theming, ease of adding a themed
component, right-sized engineering, and theme ecosystems. The mechanics, risk, idiom, theming, and
component lenses verified their claims by compiling against the installed Tailwind 4.3.3 and daisyUI
5.7, and by measuring in Chromium. One fold agent dispositioned every finding in
[the fold record](../research/2026-09-27-theme-pass-b-fold.md): folded, refused with a reason, or
raised as an owner ruling.

## Owner rulings

Each is a yes or no. The recommendation comes first.

- **R1. Cut the release at pass B's merge?** Recommend yes: cut pass A and pass B together as
  `0.98.0` when pass B merges. This is release trigger 1, since the template is a consumer that
  needs the subpath now. Yes builds the cut into the close. No holds pass B's merge until the next
  cut, and the template keeps its copied defaults until then.
- **R2. Public-literals advisory for good, the other two promoted?** Recommend yes:
  `public-literals` stays advisory on consumers permanently, since it polices a developer's own
  markup. `theme-conformance` and `theme-contrast` are promoted to error at the next minor, because
  they protect cairn's own parts. That promotion also waits for each production site's advisory
  count to reach zero, by fixes or reasoned suppressions. No promotes all three as first drafted,
  and the charter line then says the audit gates a site's public design.
- **R3. Fold the `cairn-site` skill into pass B?** Recommend yes, adding about one task to chain 2.
  No keeps the planned single `public-theme.md` reference page under `cairn-extend`.
- **R4. Does "the library" mean both the engine and the chassis component set?** Recommend yes:
  probe 3 exercises the engine path, `cairn-site`'s recipe covers both, and `PreviewBanner`
  migrates. No narrows the recipe to one path and drops the other from the probes.
- **R5. Keep one pass with two chains?** Recommend yes. Chain 2 grew from about seven tasks to about
  eleven in the fold. The chains are parallel, both wait on pass A's merge, and the named split
  remains the budget guard. No plans chain 2 as pass C from the start, with its own close and probes.

## Open for the plan

Execution calls, not design calls:

- Each status's derivation percentage and muted's form, set by measurement.
- The fixture harness's temp-copy mechanism and its local-versus-CI split.
- The equivalence test's key list, which is exactly `public.css`, the chassis scale, and daisyUI's
  keys at capture time.
- The exact config key names for the public roots, `exclude`, and the theme roots.
- The `cairn-site` catalogue's page list, within the coverage gate's sources.
