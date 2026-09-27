# Theme identity passes B and C: the admin agent path and one public theme

**Status:** draft, folded five times (2026-09-27). Geoff ruled on the release path and the rule
tiers on 2026-09-27, and both rulings are now decisions in the body. Every change is listed in the
[fold record](../research/2026-09-27-theme-pass-b-fold.md). This document awaits Geoff's read.

**Extends:** [`2026-09-26-theme-identity-design.md`](2026-09-26-theme-identity-design.md). Its
"G2: easy for agents" section and the "Pass B, the agent path" bullet under Delivery define pass
B's agent path below. This spec restates that scope only by reference. Where the two disagree, the
earlier spec governs the agent path.

**Folds in:** the ROADMAP "One public theme" initiative (Geoff, 2026-09-27), which sequences
before draft documentation resumes.

**Evidence:** every site's copied `src/chassis/tokens.css` lacks the focus-ring set, and
`prose.css` reads the three radii and `--border` with no fallback. The review record is the nine
`2026-09-27-theme-pass-b-review-*.md` files, the
[ecosystem survey](../research/2026-09-27-theme-ecosystem-survey.md), and the
[designer friction log](../research/2026-09-27-theme-designer-friction-log.md).

## Goals

Geoff's intent, from the brainstorm:

- Every production site will be rebuilt starting from the Waymark theme, as a test of whether it
  can be re-skinned to each site's personality. The public theme is therefore the surface a
  designer works in four times over, not a one-off.
- "cairn should be able to include a non-Waymark theme." The contract must be theme-independent.
  This initiative makes a second theme possible and proves it; shipping one is later work.
- "A cairn implementer [should] be able to add a new component to the library and have it easily
  access the theme values." The library means both built-in public components and custom public
  components (confirmed by Geoff, 2026-09-27).
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

## Names

These names are decided. cairn has two surfaces, the admin and the public site. A component is
built-in (cairn ships it) or custom (a site writes it). The noun is "component" on both surfaces,
the editor's and the stack's word, and the surface adjective tells them apart: "built-in public
component", "custom admin component". "Site" means the developer's whole project, and "custom admin
screen" stays the name for a whole admin route.

| | Built-in (cairn ships it) | Custom (a site writes it) |
|---|---|---|
| **Admin component** | Lives in `src/lib/admin/`, exported at `@glw907/cairn-cms/admin`, beside `cairn-admin.css`. Rulebook: `docs/internal/admin-design-system.md`. Audit scope: the admin static scope. Guidance: the admin design system and `cairn-implementer`. | Lives under the site's `src/routes/admin` or `src/lib/admin/`, built on `@glw907/cairn-cms/admin-toolkit`. Rulebook: the ratified norms, DaisyUI-first. Audit scope: the admin static scope. Guidance: `cairn-admin-screens`, `cairn-extend`'s `daisyui-first.md`, and `cairn-extension-reviewer`. |
| **Public component** | Lives in `src/lib/public/`, exported at `@glw907/cairn-cms/public`, styled by `cairn-public.css`. Rulebook: the public theme contract, with no literal and no daisyUI component class. Audit scope: the public scope, rooted at the engine's `src/lib/public/` by the showcase config. Guidance: `cairn-public`'s built-in recipe and the `cairn-implementer` line. | Lives under the site's `src/chassis`, `src/theme`, `src/routes`, or `src/lib/components`, as a `defineComponent` plus rules in `prose.css` or a component `<style>`. Rulebook: the public theme contract. Audit scope: the public scope's default roots. Guidance: `cairn-public`'s custom recipe. |

`@glw907/cairn-cms/admin` exports only admin components. `@glw907/cairn-cms/public` exports every
built-in public component that renders styled markup; `CairnHead` stays at `./delivery/head`. The
stylesheet subpath is `@glw907/cairn-cms/cairn-public.css`. `src/lib/admin-toolkit` and its
`./admin-toolkit` export keep their names. Pass B's first task writes these names into the Names
section of `docs/internal/docs-register.md`, with Vale enforcement through the `Cairn.Names` and
`Cairn.NamesRetired` rules.

## Pass B: the rename and the admin agent path

### The rename, first and alone

The engine's admin folder `src/lib/components/` becomes `src/lib/admin/`, and `cairn-admin.css`
moves with it. The export `@glw907/cairn-cms/components` becomes `@glw907/cairn-cms/admin`. This
is a breaking change with no compatibility alias. Geoff: "It's not too much cost, since I'm about
to rebuild each site."

The same task gives the one built-in public component its own home. `PreviewBanner` moves from the
admin folder to `src/lib/public/`, whose new barrel is exported as `@glw907/cairn-cms/public`.
`./admin` then carries no public component. The template's and the showcase's preview routes
import `PreviewBanner` from `./public` in this task. `PreviewBanner` keeps its current styling
until pass C.

The task updates every path reference and adds `docs/reference/public.md`, the page
`check:reference` requires for the new subpath.

**The audit scopes.** The admin static scope's default roots become `src/routes/admin`,
`src/lib/admin`, and `src/lib/admin-toolkit`. `src/lib/components` leaves the admin defaults. A
site that keeps custom admin components in `src/lib/components` moves them to `src/lib/admin`, or
names that root under the admin scope in its `cairn-audit.config.json`. A root a site names
explicitly for one scope is removed from the other scope's defaults, so the site's choice survives
pass C making `src/lib/components` a default public root. `DEFAULT_ADMIN_SCOPE`, the roots the
three `adminOnly` motion rules resolve over, gains `src/lib/admin` only if those rules already pass
on the engine's admin components; otherwise the gap is filed in `ROADMAP.md`.

**Consumers must.** Pass B's changelog entry carries one `Consumers must:` line with three parts:
import admin components from `@glw907/cairn-cms/admin` instead of `./components`; import
`PreviewBanner` from `@glw907/cairn-cms/public`; and move any custom admin components out of
`src/lib/components` into `src/lib/admin`, or name that root under the admin scope in
`cairn-audit.config.json`. The migration note says the same, plus the named-root rule and, if
`DEFAULT_ADMIN_SCOPE` gains the root, the motion rules.

**Acceptance.** The full gate is green, including `check:reference` with the new
`docs/reference/public.md`. `package.json` exports `./public`, and the showcase and template
preview routes import `PreviewBanner` from it. `git grep -n PreviewBanner -- src/lib/admin` prints
nothing. This grep also prints nothing at pass B's close:

```sh
git grep -nE "lib/components|dist/components|cairn-cms/components|['\"]\.?/components['\"]" -- \
  ':!docs/internal/history' ':!docs/internal/record' ':!docs/internal/design' ':!docs/superpowers' \
  ':!docs/HISTORY.md' ':!CHANGELOG.md' ':!docs/extend/migration-notes.md' \
  ':!docs/internal/engine-rulings.md'
```

The excluded files are records, and they keep the old paths: the per-version migration notes
(pass B's own note must name `./components`), the rulings' Record fields, and the changelog. The
grep is pass B's acceptance, not a standing gate. Pass C's public scope names `src/lib/components`
as a default root on purpose, so the string returns in `src/lib/audit/config.ts`.

### The admin agent path

Unchanged from the theme identity spec, which defines it: the advisory `radius-scale` rule and
retired-patch arms, the recipe source beside `RATIFIED_NORMS` with `cairn-audit norms <role>`, the
shipped guidance with a new exemplar, the sync test, and the admin agent-build probe. It depends
on pass A's final class vocabulary and fixture screen.

## Pass C: one public theme

### The contract

The contract has three parts, and nothing else:

1. **daisyUI's theme variables:** `color-scheme`, the 20 color roles, `--radius-selector`,
   `--radius-field`, `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, and
   `--noise`. The key list is read from `daisyui/theme/object`, a declared daisyUI export and the
   source pass A's completeness test uses, so it tracks daisyUI upgrades. Nothing in cairn defaults
   these keys. daisyUI does, when a theme block extends a built-in theme by name.
2. **One engine-shipped public stylesheet, `src/lib/public/cairn-public.css`,** exported as
   `@glw907/cairn-cms/cairn-public.css` beside the existing `./admin-sources.css`. The name pairs
   with `cairn-admin.css`, and the prefix keeps it from colliding with a site's own files. It holds
   four things:
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

**Admission.** A key enters `cairn-public.css` only when an engine or chassis file reads it and the
key carries no site-owned design choice. The design scale and the two heading keys are site-owned
design choices, so they stay in the chassis. Waymark's own keys stay in Waymark's `theme.css` as
theme tokens: the CTA set and `--cairn-caption-tracking`, whose only readers are Waymark's
styleguide and `SiteHeader`. The engine never redefines a Tailwind stock key such as
`--leading-tight` or `--font-mono`.

**The design scale stays in the chassis.** The faces, `--text-step-*`, `--spacing-*`,
`--leading-*`, `--tracking-*`, and the two measures stay in the chassis `tokens.css` as site-owned
`@theme` defaults. Five of the eight `--spacing-*` names shadow Tailwind's container sizes, and
shipping them from the engine would make that trap permanent contract (the full argument is in the
fold record). The cost is that a built-in public component cannot rely on a scale key. It sizes
type and space from its context (`em`, `inherit`) or from daisyUI's `--size-field` and
`--size-selector`. A custom public component reads the scale freely, since the chassis defines it.
The chassis README's collision note is corrected to all five shadowed names.

The chassis `tokens.css` therefore keeps: the Tailwind import, the daisyUI plugin activation, the
`cairn-public.css` import, the `prose.css` and `composition.css` imports, `@source not "./.claude"`,
the design scale, `--font-weight-heading`, and `--cairn-heading-case`. The engine roles, the
code-block binding, and the focus-ring utility leave it.

**The roles sit in `@layer theme`.** It is the lowest layer Tailwind declares, so an override wins
wherever a theme writes it: unlayered in `:root`, or in its `@plugin "daisyui/theme"` block. The
`[data-theme]` selector makes a derived role recompute under a nested theme. A theme puts each
per-scheme value in that scheme's daisyUI block and needs no hand-synced dark triple. Two limits
apply. A comma-separated value such as `--cairn-shadow` does not survive daisyUI's option parser,
so it stays in `:root`. The two `@theme` colors resolve at `:root` and do not recompute under a
nested theme, so a theme that nests sets them in the nested block; the reference page states this.
The chassis imports `cairn-public.css` before the theme's own blocks, so a theme's later `@theme`
declaration wins. The mechanism proofs are in the fold record.

**The defaults move into the engine.** The defaults are the value half of a contract the engine
already owns: the classes it emits, and the tokens those classes and the chassis read. All five
sites' copies froze and missed keys added since, which meets `site-today-export`'s own reopen
condition. The pass records a new `public-css-export` ruling in `docs/internal/engine-rulings.md`,
with the proposed text in the fold record.

**What stays copied, on purpose.** `prose.css` and `composition.css` are the design itself, so
they stay copy-on-create, the Drupal Starterkit and shadcn choice. The cost is stated: the four
rebuilt sites do not receive upstream prose fixes automatically. Those fixes reach a site through
the migration notes.

**Built-in public components.** A built-in public component may assume `cairn-public.css` and
daisyUI's theme variables. It lives in `src/lib/public/`, where the `@source` line makes its markup
a scanned source on every consumer, so its Tailwind utilities compile and the `@theme` keys it
reads are emitted. It uses no daisyUI component class, since a site's plugin config may exclude
that component. `PreviewBanner` migrates to this posture as a named task: it reads contract tokens
and drops its literal palettes and its color-scheme media blocks. Its five `--cairn-preview-*`
properties stay as named overrides whose fallbacks are tokens, so a site's existing override still
wins.

**The seam promise.** `cairn-public.css` and the emitted-class registry are public surface.
Renaming or removing a key or an emitted class is a disclosed contract change. Adding a key with a
default is not breaking. Changing a default's value is a disclosed change with a changelog line; a
site that needs a value to stay fixed sets the key itself.

### Status inks derive by default

Each ink's default is `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-content))`,
one formula for both schemes, declared in the layered `:root, [data-theme]` block. Mixing toward the
ink darkens in light mode and lightens in dark mode, as daisyUI derives its own soft and hover
states.

Derivation is the default, not the guarantee. The plan picks each `N` by measurement across
daisyUI's 35 stock themes, Waymark with its ink overrides stripped, and the fixture theme, on all
three grounds an ink paints on: `base-100`, `base-200`, and the callout tint. No single `N` passes
every stock theme without greying the ink, so the plan maximizes the pass count while keeping
usable chroma. `theme-contrast` is the guarantee. `--color-muted` gets the same treatment, since
today's translucent default fails AA on Waymark light and on 15 stock themes. The default shadow
mixes `black`, since a `base-content` mix glows pale in a dark scheme.

A theme can still hand-set an ink. Waymark keeps its hand-tuned inks, muted, and shadow as
overrides, and moves its per-scheme values into its daisyUI blocks, so the Waymark render does not
change. Every other default reproduces today's value. The re-skin recipe's step 6 in Waymark's
`theme.css` header changes from "retune the ink with the fill" to "the ink follows the fill;
override it only to hand-tune."

### Levers and template fixes from the designer walkthrough

Pass C closes each gap the designer walkthrough found (friction log IDs in parentheses). Paths are
the showcase's, which the template receives through `emit:template`. Each outcome has a check that
fails if it regresses. The unit and e2e checks land with their task; the harness checks land in
task 10, which creates `test:theme-fixture`.

- **The theme toggle follows the applied theme (F3).** With no `data-theme` on `<html>`, the
  toggle resolves the scheme from the root's computed `color-scheme`, not the OS media query. A
  dark-first theme then needs no edit to `app.html`, and Waymark behaves as today. **Check
  (harness):** under a light OS with no cookie, the fixture's toggle offers light mode, and its
  first click changes the root's computed `color-scheme`.
- **The theme names live in one place (F2, F3).** The toggle's two names move into one exported
  config under `src/theme`, which `SiteHeader` imports. The config's doc comment and
  `cairn-public`'s theming section name the two touchpoints that cannot import it: the inline
  script in `app.html` and the daisyUI block names. **Check (unit):** the config's names match the
  daisyUI block names in `theme.css` and the names `app.html`'s regex accepts.
- **Heading weight and heading case are levers (F4).** Two site-owned keys sit in the chassis
  `tokens.css`: `--font-weight-heading` (default `600`, in `@theme`, generating `font-heading`)
  and `--cairn-heading-case` (default `none`, a `--cairn-*` role, since `text-transform` has no
  Tailwind namespace). A `--font-<name>` face claims the `font-<name>` utility first, so the name
  avoids Waymark's `display` face. `prose.css`'s heading rules and the chrome's titles read the
  keys in place of a literal `600` or `font-semibold`; eyebrows keep `uppercase tracking-eyebrow`.
  Waymark's defaults reproduce today's weight and case. **Check (harness):** the fixture sets `800` and `uppercase`, and the harness asserts the
  computed `font-weight` and `text-transform` of a prose `h2`, the home page's lead title, and a
  styleguide section heading.
- **The editor preview's ground reads the theme (F7).** The preview document's reset in
  `src/lib/admin/preview-doc.ts` paints `var(--color-base-100, #fff)` in place of a pinned white.
  The fix sits in the engine, so it reaches every site, stale chassis copies included. **Check
  (e2e):** under Waymark dark, the preview frame's `body` background equals the page's computed
  `--color-base-100`.
- **The skip link hides by an idiom independent of the scale (F6).** The template's skip link
  hides with an idiom that reads no scale key, such as `sr-only focus:not-sr-only`. **Check
  (harness):** under the fixture's tight scale, the skip link is visually hidden until focused and
  fully visible once focused.
- **Every rounded element reads a radius token (F5).** The template's focus-ring corners read
  `var(--cairn-focus-ring-radius)`. Three full-round or fixed shapes stay as commented exceptions,
  since each is a shape, not a step on the corner ladder: the tag filter's pill, the video facade's
  round button, and `prose.css`'s list-marker diamond. The tag pill reads
  `var(--tag-filter-radius, 999px)` with no scoped declaration, so a theme's root value reaches it.
  **Check (unit):** a sweep of the template's and chassis's CSS and `<style>` blocks finds no
  `border-radius` literal outside the named exceptions and `0`. **Check (harness):** the fixture
  sets `--tag-filter-radius: 0`, and the harness asserts the computed corner of a tag pill and of a
  focused entry link.
- **The styleguide renders every registered component (F8).** The styleguide's kit renders one
  sample per registry entry from its `preview`, serialized through the Insert dialog's grammar. An
  entry with no `preview` is listed by name as lacking one. The root barrel gains one small export
  that returns a component's preview as directive markdown, and `cairn-public`'s coverage gate
  walks the registry through it. The styleguide stops claiming it follows the system light or dark
  setting. **Check (unit):** a throwaway registry entry's sample appears in the styleguide's
  rendered output with no edit to the route.
- **The template's comments cite only what a site has (F17).** Each `docs/internal/` path and
  "Verdict" citation in the emitted sources becomes a one-line reason or a public docs link.
  **Check:** `check:template` fails on an emitted file containing `docs/internal/` or `Verdict`
  followed by a number, proven by a fixture file carrying each string.

### The guard

`cairn-audit` gains a **public scope**, a sibling of the admin static scope.

- **Roots.** The default roots are `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`,
  and `src/lib/components`, with `src/routes/admin` excluded through a new `exclude` list. On a
  consumer, `src/lib/components` is where a site keeps shared public components. A missing default
  root is skipped, as the admin scope skips one today. `src/lib/admin` stays in the admin scope. A
  site names any other root by config, and a root named for the admin scope leaves the public
  defaults.
- **One scope per file.** The admin static scope skips any file the public scope claims, so no
  file answers to two grammars and `token-colors` never double-fires with `public-literals`. A test
  asserts that the two default root sets are disjoint, and that a root named for one scope leaves
  the other's defaults.
- **No silent empty scope.** The scope fails with an actionable error only when every root
  together matches no files.
- **Cairn's own tree.** The audit runs from the showcase, whose `cairn-audit.config.json` adds the
  engine's `src/lib/public/` to the public roots. The engine's `src/lib/admin/` is never a public
  root.

Three rules run in it:

- **`public-literals`** flags a color literal or an absolute font size in a CSS declaration, a
  `style=` attribute (including the static parts of a mixed value), a Svelte `style:` directive,
  or a Tailwind arbitrary value (`text-[#abc]`, `text-[14px]`). It shares one detection core with
  `token-colors`, extended with the chromatic and wide-gamut forms and named colors. An absolute
  font size is `px`, `pt`, or `rem`; `em`, `%`, and a `var()` or `calc()` over tokens pass.
  `transparent`, `currentColor`, and the CSS-wide keywords are not literals. A custom-property
  definition is legal anywhere under a theme root, including a component's `<style>` block. The
  theme roots default to `src/theme` and the chassis `tokens.css`, which defines the scale, and
  are configurable in the same path-list shape as `static.paletteFiles`. The root element's
  `font-size` is exempt, since it defines `rem` for the page. Tailwind's own utilities
  (`text-sm`, `bg-red-500`) are not flagged; they are tokens a designer may choose.
- **`theme-conformance`** checks completeness and resolution. Each named daisyUI theme block must
  define every daisyUI key, except a block named after a built-in theme, which daisyUI completes by
  merging. The message says whether an omission sits in the default block (a runtime hole) or a
  secondary one. The rule fails loudly when the key list is empty or lacks `--color-base-100` and
  `--radius-box`, and raises a finding when the scope holds no theme block. A `var(--x)` with no
  fallback must resolve to one of these:
  - the site's real import chain, where `cairn-public.css` counts only if that chain imports it;
  - Tailwind's theme variables, read from `tailwindcss/theme.css`, or the `--tw-` namespace;
  - the daisyUI keys of a block the rule already found complete;
  - any custom property declared in the scanned tree, in CSS, `<style>`, `style=`, or `style:`.

  A `var()` with a fallback and a non-literal name are skipped. Parsing goes through `sheet.ts`,
  never a regex over raw text. Three more findings: "the public stylesheet does not import
  `cairn-public.css`" and "a chassis file redeclares an engine default", which turn the
  `Consumers must:` line into a tripwire, and a `--font-<name>` face declared beside a
  `--font-weight-<name>` weight, which guards the heading lever.
- **`theme-contrast`** is the existing dual-gamut AA check, moved from the repo-only
  `scripts/checks/check-public-tokens.mjs` into the audit. Its resolver is new code with a stated
  bound: it follows `var()` chains to a literal and evaluates one `color-mix` form (two operands in
  `oklab` or `oklch`, one percentage), then alpha-composites over the ground. Any other form yields
  an "unmeasured" finding, never a pass or a crash. Schemes come from the daisyUI theme blocks,
  not hard-coded names, and sources load in the site's import order with `cairn-public.css` read
  from the installed package. The pairs are every text-bearing role with its `-content`, plus each
  ink and muted on `base-100`, `base-200`, and the callout tint. The rendered checks
  (`check:interactive-contrast`, the showcase e2e) stay the ground truth, and the reference page
  states the coverage limits.

**Tiers (Geoff, 2026-09-27).** For a consumer, `public-literals` stays advisory permanently, since
it polices a developer's own markup. `theme-conformance` and `theme-contrast` report advisory and
promote to error at the first minor cut after every production site reports zero advisory
findings from them, by fixes or reasoned suppressions. Pass C's close files that trigger as a
`ROADMAP.md` "Toward 1.0" entry, and adds one step to the user-scoped `cairn-release` checklist: run
the audit's public scope over each production site at every cut and record the counts. That step
detects the trigger. Over
cairn's own tree all three rules fail CI from day one. `check:public-tokens` becomes a repo script
that runs the audit's public scope over the showcase and the `examples/cairn-theme` overlay and
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
  contract: daisyUI's variables, every `cairn-public.css` key with its default, the rules the sheet
  ships, the layer and nesting behavior with its limits, ink derivation, and the coverage limits of
  `theme-contrast`. It links the emitted-class registry and opens with the governing principle.
- **A new shipped skill, `cairn-public`** (confirmed by Geoff, 2026-09-27), for the public side
  only. Like the official daisyUI skill, to which it defers for component classes, it is a router
  `SKILL.md` within the packaged skill budget, pointing at reference pages. It has two halves:
  - A **theming section**, the contract as a designer uses it. It gives the job-to-token table,
    with rows for eyebrows, headings, the default scheme (the `default: true` block sets the
    first-visit scheme, and the toggle follows it), and rules (`base-300` is the rule and border
    color, never a text ground). Its placement rule: a per-scheme value goes in that scheme's
    daisyUI block. It names the fast path (extend a built-in daisyUI theme, or start from daisyUI's
    theme generator) beside the full-control path. It lists the two sanctioned escapes from
    `public-literals` (a one-line `@theme` token, or a reasoned suppression), the theme-name
    touchpoints, and what a replacement `prose.css` must cover.
  - A **catalogue** of about 25 short pages for cairn's public pieces: each directive's rendered
    markup, the islands, `CairnHead`, `PreviewBanner`, the chassis composition primitives, and the
    prose elements. The component recipe names both paths. A custom public component is a
    `defineComponent` plus rules in `prose.css` or a component `<style>`. A built-in public
    component is markup in `src/lib/public/` plus rules in `cairn-public.css`. Both read contract
    tokens.

  A **coverage gate** asserts three things. Every directive (the showcase registry plus the engine
  built-ins), every island, and every composition primitive has a page; the gate walks the registry
  through the styleguide's export. Every class a snippet uses exists in the showcase's compiled
  public stylesheet or the emitted-class registry. Every token a snippet or the table names
  resolves under `theme-conformance`'s resolution set. A parser that matches nothing fails.
  `skills/cairn-extend/SKILL.md` gains one routing line to `cairn-public`.
- **`cairn-implementer`'s definition** gains one line: a built-in public component under
  `src/lib/public/` carries no literal, uses no daisyUI component class, and follows
  `cairn-public`'s recipe. The definition lives in the dotfiles repo, so pass C's close makes that
  edit. `public-literals` over `src/lib/public/` enforces it.

## Proof

- **The Waymark render does not move, proven by computed values.** Before the move, a
  computed-token equivalence test (the `equiv.mjs` form from pass A) records
  `getComputedStyle(documentElement)` for every `cairn-public.css` key, every chassis scale key, and
  every daisyUI key, on the built showcase under Waymark light and dark, plus a focused
  `cairn-focus-ring` element's outline. After the move, it asserts string equality. The
  `site-visual` baselines stay as the secondary check.
- **The public surface is snapshotted.** A standalone unit test parses `cairn-public.css`'s keys and
  rules. It asserts that the reference page lists each key with its default and names nothing the
  file lacks. It asserts that every class the sheet styles is in the render registry, and that every
  key has a reader in `src/lib` or the chassis. It pins the key set in a snapshot, so a rename or
  removal fails until the snapshot update discloses it.
- **Every rule has failing fixtures, each raising exactly the named finding:**
  - `public-literals` flags a `#hex` in a `<style>`, an `oklch(` in `style=`, `text-[14px]`,
    `bg-[#abc]`, a `style:color` directive, and a literal custom property outside a theme root. It
    passes a custom property in a theme component's `<style>`, the chassis scale's `rem` steps,
    `text-sm`, `bg-red-500`, `0.88em`, and the root `font-size` clamp.
  - `theme-conformance` flags a block missing `--radius-box`, a key missing from one block only,
    a `var(--typo-token)`, `var(--color-red-550)`, a stylesheet that skips `cairn-public.css`, and a
    `--font-heading` face beside `--font-weight-heading`. It passes a partial block named `nord`,
    `var(--color-red-500)`, and a route-local token.
  - `theme-contrast` flags a hand-set ink below AA, a derived ink that passes light and fails
    dark, an ink failing on the callout tint only, and an unmeasurable expression.
- **A second theme as a standing fixture, built and rendered.** `test:reskin` gains a theme file
  deliberately unlike Waymark: system-stack faces, a square corner ladder, a dark-first palette,
  derived inks on all but one status, one custom token, per-scheme values in its daisyUI blocks, a
  nested `data-theme` region, and the walkthrough's lever values. The three rules must pass on it.
  A new harness, `npm run test:theme-fixture`, builds a copy of the showcase with the fixture
  swapped in and loads home, one article, and the styleguide in Playwright. It asserts that
  computed `--radius-box` is `0`, the fixture face is in `font-family`, a derived ink equals its
  `color-mix` result, the custom token reaches its element, and the nested region's ink
  recomputes, plus the walkthrough's harness checks. A second arm builds the template against the
  working engine under both Waymark and the fixture theme, and asserts that a key read only by a
  built-in public component reaches the compiled CSS. The harness runs in CI's design workflow.
  `test:reskin` also gains a standing case: Waymark with its four ink overrides stripped passes
  `theme-contrast` in both schemes, and the hue-rotation case stays.
- **Three acceptance probes,** each a fresh Sonnet agent given only the shipped guidance and a
  one-line brief. Probe 1 runs at pass B's close. Probes 2 and 3 run at pass C's close. A probe
  failure names a guidance gap, fixed before that pass's close.
  1. An admin screen, as the theme identity spec defines it.
  2. A minimal new theme on the chassis, with its own chrome and one custom public component. It
     passes with zero public-scope findings, a scanned-file count that includes every file the probe
     created or edited, and a clean `test:theme-fixture` build under it.
  3. A throwaway built-in public component in `src/lib/public/`, written by a `cairn-implementer`. It
     passes with zero public-scope findings on its directory and a nonzero scanned count. In the
     harness's template arm, its computed color and radius differ between Waymark and the fixture
     theme and equal each theme's tokens. The main loop also reads one screenshot per theme. The
     branch is discarded.
- **Gates that stay green** through both passes, each from the task that adds it: `npm run check`,
  `npm test`, `check:reference`, `check:facts`, `check:template`, `check:package` (with the skill
  budget), `check:rulings-format`, `check:public-tokens` (the successor script), `test:reskin`,
  `test:theme-fixture`, the `npm pack` smoke test, `norms:check`, and the showcase e2e.

## Documentation and records

Each pass's close makes that pass's shared-file edits.

**Pass B's close:** `docs/reference/cairn-audit.md` for pass B's rules and the admin scope's new
defaults; the facts for the rename, the `./public` subpath, and the new rules; the changelog entry
with pass B's `Consumers must:` line; and the migration notes for the rename, `PreviewBanner`'s new
subpath, and the scope defaults, including the named-root rule.

**Pass C's tasks and close:**

- Facts in `docs/internal/facts/` for each public behavior this section and the walkthrough
  name, including the three rules' tiers and the new root export.
- Reference pages: `docs/reference/public-css.md` (new), `render.md`'s registry,
  `public.md` for `PreviewBanner`'s styling and its override properties, `cairn-audit.md` for
  pass C's rules and the public scope's config keys, and `core.md` for the new root export.
- Frozen narrative pages, fixed under the freeze rule (each deficiency fixed on the page, with a
  facts bullet): `docs/extend/design-your-site.md`, whose "every design-scale key … carries a
  generic default", ink-retune warning, and dependency sentence the pass makes wrong.
- Internal docs: `docs/internal/public-design-system.md` changes its fill-and-ink rule to "the
  ink follows the fill; hand-tune only by override". The chassis README updates the `tokens.css`
  row with the two heading keys, "The token system" paragraph, and the namespace rule. It corrects
  the spacing-collision count to five and the sentence calling directive classes engine-fixed.
- The charter: `docs/internal/what-cairn-is-and-is-not.md` amends its "all 28 registered rules
  audit the `/admin` surface" line to name the public scope and its advisory tier on consumers.
  The pass records the `public-css-export` entry in `engine-rulings.md`.
- `CHANGELOG.md` under `## Unreleased`, with one `Consumers must:` line: "move any key your
  copied `src/chassis/tokens.css` adds beyond the template's into your theme, then replace the
  copied roles, code-block binding, and focus-ring utility with `@import
  "@glw907/cairn-cms/cairn-public.css"`; compare your copy's ink, muted, and shadow values first,
  since those defaults changed." `PreviewBanner`'s migration makes the import required, not
  optional.
- `docs/extend/migration-notes.md` carries the swap, the changed defaults, a `paletteFiles`
  entry that names the old copy, the two optional peers, and the public scope's default roots with
  the named-root rule.
- ROADMAP marks "One public theme" done and removes it from the live tiers, and gains the
  "Toward 1.0" promotion entry for the two theme rules.
- The template: `npm run emit:template` re-emits Waymark's `theme.css`, the chassis
  `tokens.css`, and the chassis README to `templates/waymark`.
- The dotfiles: the `cairn-implementer` line and the `cairn-release` audit-count step, verified
  by `claude-tooling-sync verify`.

## Delivery

Two passes, run in sequence. Each runs its tasks through `pass-execute`, with the implementer,
`diff-reviewer`, and gate chain per task. Segment boundaries fall every three or four tasks within
each pass.

**Pass B, about six tasks.** Task 1 is the rename and `./public`, run alone and committed green
before task 2 starts. Tasks 2 onward are the parent spec's agent path: `radius-scale` and the
retired-patch arms, the recipe source and `cairn-audit norms`, the shipped guidance and exemplar,
and the sync test. Pass B's close runs probe 1, reconciles the skill budget, and makes pass B's
shared-file edits. The branch stays unmerged.

**Pass C, about thirteen tasks,** in dependency order:

1. The equivalence test on today's tree, then `cairn-public.css` and the key-set snapshot test.
2. Ink and muted derivation, the shadow default, and Waymark's per-scheme move.
3. `PreviewBanner`'s token styling and the editor preview's themed ground.
4. The heading levers, the toggle's scheme resolution, and the theme-name config.
5. The template sweep: radius literals, the skip link, the styleguide and its root export, and the
   comment scrub.
6. The `sheet.ts` fix, so comments no longer fuse into declarations; every later rule depends on it.
7. The public scope and `public-literals`.
8. `theme-conformance`.
9. `theme-contrast`, the dependency decisions, the `npm pack` smoke test, and `check:public-tokens`.
10. The fixture theme and `test:theme-fixture`, with the walkthrough's harness checks.
11. The reference pages and the render registry.
12. The `cairn-public` skill, its coverage gate, and the `cairn-extend` routing line.
13. The chassis README, `public-design-system.md`, `design-your-site.md`, and the template re-emit.

Pass C's close runs probes 2 and 3, reconciles the skill budget, and makes pass C's shared-file
edits. It then merges `main` into the branch again, merges passes B and C to `main` together, and
cuts the release in the same close.

**Sequencing and release (Geoff, 2026-09-27: the single-cut path).** Both plans are authored
together after pass A's segment D lands, for one approval sitting. Pass A merges to `main` as
planned, carrying theme values only. Pass B starts after pass A merges, since pass A edits the
files the rename moves and B's rules would flag cairn's unswept tree. Pass B finishes on its branch
and stays unmerged. Before pass C starts, pass B's branch merges `main` in, and pass C branches
from it.

Passes B and C change what the template imports, and the template goes live from `main` on merge.
The two passes therefore merge together, and one release follows the merge in the same close,
under the repo's first release trigger. The proposed number is `0.98.0`, carrying passes A, B, and
C. It was free on 2026-09-27, and the cut verifies it again with
`npm view @glw907/cairn-cms versions --json`. One release carries every `Consumers must:` line
(pass A's is nothing), so a site crosses one list. A short window remains: the template's engine
range resolves to `0.97.x` from the merge until the cut's `emit:template` re-emits it. Draft
documentation resumes after the release.

## Open for the plan

Execution calls, not design calls:

- Each status's derivation percentage and muted's form, set by measurement.
- The fixture harness's temp-copy mechanism and its local-versus-CI split.
- The equivalence test's key list, which is exactly `cairn-public.css`, the chassis scale, and
  daisyUI's keys at capture time.
- The exact config key names for the public roots, `exclude`, and the theme roots.
- The `cairn-public` catalogue's page list, within the coverage gate's sources.
- The markup form that applies `--cairn-heading-case` in the chrome, the new root export's name,
  and whether the theme-name touchpoints shrink below the one config (for example, a cookie regex
  that accepts any name).
- Whether `DEFAULT_ADMIN_SCOPE` gains `src/lib/admin`, settled by running the three motion rules
  over the engine's admin components.
- The rename's file-by-file reference list, the `theme-contrast` resolver's internals, the
  walkthrough's line-level fixes, and the probe-retry process: all in the fold record's fifth fold.
