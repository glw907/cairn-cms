# Theme identity passes B and C: the admin agent path and one public theme

**Status:** draft, folded four times (2026-09-27). This spec covers two passes: pass B (the rename
and the admin agent path) and pass C (one public theme). Geoff approved the brainstorm's design in
conversation. The nine-lens review then ran, and its fold changed parts of that design. A second
fold applied Geoff's decisions of 2026-09-27. He confirmed the `cairn-public` skill and the
library's meaning, and he settled the names, the rename, and the two-pass delivery. A third fold
applied the conductor's decisions on three conflicts the second fold surfaced: `PreviewBanner`'s
export, the release ordering, and the audit's default scopes. A fourth fold applied the
conductor's decisions on a hands-on designer walkthrough
([friction log](../research/2026-09-27-theme-designer-friction-log.md)). Every change is listed in
the fold record. This document awaits Geoff's read and his answers to R1 and R2.

**Extends:** [`2026-09-26-theme-identity-design.md`](2026-09-26-theme-identity-design.md). Its
"G2: easy for agents" section and the "Pass B, the agent path" bullet under Delivery define pass
B's agent path below. This spec adds nothing to that scope and restates it only by reference;
where the two disagree, the earlier spec governs the agent path. The fold changes no meaning in
the parent, so no erratum is owed.

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

Geoff delegated the naming, and these names are decided. cairn has two surfaces, the admin and the
public site. Every component is built-in, which means cairn ships it, or custom, which means a site
writes it. The noun is "component" on both surfaces, since the editor's insert menu already says
"components" and it is the stack's word. The surface adjective tells the two apart: "admin
component", "public component", "built-in public component", "custom admin component". "Site" keeps
its one meaning, the developer's whole project ("a cairn site"). "Custom admin screen" stays the
name for a whole admin route.

| | Built-in (cairn ships it) | Custom (a site writes it) |
|---|---|---|
| **Admin component** | Lives in `src/lib/admin/`, exported at `@glw907/cairn-cms/admin`, beside `cairn-admin.css`. Rulebook: `docs/internal/admin-design-system.md`. Audit scope: the admin static scope. Guidance: the admin design system and `cairn-implementer`. | Lives under the site's `src/routes/admin` or `src/lib/admin/`, built on `@glw907/cairn-cms/admin-toolkit`. Rulebook: the ratified norms, DaisyUI-first. Audit scope: the admin static scope. Guidance: `cairn-admin-screens`, `cairn-extend`'s `daisyui-first.md`, and `cairn-extension-reviewer`. |
| **Public component** | Lives in `src/lib/public/`, exported at `@glw907/cairn-cms/public`, styled by `cairn-public.css`. Rulebook: the public theme contract, with no literal and no daisyUI component class. Audit scope: the public scope, rooted at the engine's `src/lib/public/` by the showcase config. Guidance: `cairn-public`'s built-in recipe and the `cairn-implementer` line. | Lives under the site's `src/chassis`, `src/theme`, or `src/routes`, as a `defineComponent` plus rules in `prose.css` or a component `<style>`. Rulebook: the public theme contract. Audit scope: the public scope's default roots. Guidance: `cairn-public`'s custom recipe. |

Each surface has its own barrel. `@glw907/cairn-cms/admin` exports only admin components, and
`@glw907/cairn-cms/public` exports every built-in public component. The stylesheet subpath stays
`@glw907/cairn-cms/cairn-public.css`. A site's custom admin components live under `src/lib/admin`
or `src/routes/admin`, which is where the admin audit scope looks by default.

`src/lib/admin-toolkit` and its `./admin-toolkit` export keep their names. Pass B's first task
writes these names into the Names section of `docs/internal/docs-register.md`, with Vale
enforcement through the `Cairn.Names` and `Cairn.NamesRetired` rules.

## Pass B: the rename and the admin agent path

### The rename, first and alone

The engine's admin folder `src/lib/components/` becomes `src/lib/admin/`, and `cairn-admin.css`
moves with it. The export `@glw907/cairn-cms/components` becomes `@glw907/cairn-cms/admin`. This
is a breaking change with no compatibility alias. Geoff: "It's not too much cost, since I'm about
to rebuild each site." Under R1's recommended answer, it ships in the release cut at pass
B's merge.

The same task gives the one built-in public component its own home. `PreviewBanner` moves from the
admin folder to `src/lib/public/`. A new barrel there is exported as `@glw907/cairn-cms/public`, the
subpath every built-in public component exports from. `./admin` then carries no public component,
and its barrel drops the comment that called `PreviewBanner` an exception. The template's and the
showcase's preview routes import `PreviewBanner` from `@glw907/cairn-cms/public` in this task, so
the template's import changes once. `PreviewBanner` keeps its current styling in pass B. Pass C
migrates that styling to tokens.

The rename is pass B's first task, run alone before any other task, after pass A merges, since
pass A edits those files. It updates every path reference: the `@source` line in
`admin-sources.css`, the audit's default scopes, sheet candidates, and palette file in
`src/lib/audit/config.ts`, `check:surface` and every other gate that names the path, the reference
pages (`docs/reference/components.md` becomes `admin.md`), the shipped guidance, the `CLAUDE.md`
mentions, the templates' and showcase's imports, and the package exports. It adds
`docs/reference/public.md`, the reference page `check:reference` requires for the new subpath.

**The admin audit scope's defaults.** The admin static scope's default roots become
`src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit`. `src/lib/components` leaves the
admin defaults. A site's custom admin components belong under `src/lib/admin` or
`src/routes/admin`. A site that keeps custom admin components in `src/lib/components` either moves
them or names that root in its `cairn-audit.config.json`. Pass B's `Consumers must:` line and its
migration note both say so.

**The admin-only scope.** `DEFAULT_ADMIN_SCOPE` in `src/lib/audit/config.ts` is a separate list. It
holds the roots the three `adminOnly` motion rules (`motion-vocabulary`, `motion-hover-gate`,
`motion-property`) resolve over, today `src/routes/admin` and `src/lib/admin-toolkit`. It gains
`src/lib/admin` only if the plan confirms that those three rules already pass on the engine's admin
components. Otherwise it stays unchanged, and the gap is filed in `ROADMAP.md`. If it gains the
root, the migration note says that a site's `src/lib/admin` components now answer to the motion
rules. The rename also rewrites the comment above `DEFAULT_ADMIN_SCOPE`. That comment calls
`src/lib/components` the static scope's "middle root", which is already wrong (it is the last root)
and which the rename removes outright.

**Consumers must.** Pass B's changelog entry carries one `Consumers must:` line with three parts:
import admin components from `@glw907/cairn-cms/admin` instead of `./components`; import
`PreviewBanner` from `@glw907/cairn-cms/public`; and move any custom admin components out of
`src/lib/components` into `src/lib/admin`, or name that root in `cairn-audit.config.json`.

**Acceptance.** The full gate is green, including `check:reference` with the new
`docs/reference/public.md`. `package.json` exports `./public`, and the showcase and template
preview routes import `PreviewBanner` from it. `git grep -n PreviewBanner -- src/lib/admin` prints
nothing. This grep also prints nothing at pass B's merge:

```sh
git grep -nE "lib/components|dist/components|cairn-cms/components|['\"]\.?/components['\"]" -- \
  ':!docs/internal/history' ':!docs/internal/record' ':!docs/internal/design' ':!docs/superpowers' \
  ':!docs/HISTORY.md' ':!CHANGELOG.md'
```

The grep is pass B's acceptance, not a standing gate. Pass C's public scope names
`src/lib/components` as a default root on purpose, so the string returns in `src/lib/audit/config.ts`.

### The admin agent path

Unchanged from the theme identity spec: the `radius-scale` rule and the retired-patch arms on
`stock-default-hazards`, both advisory; the recipe field beside `RATIFIED_NORMS` as the one source
for the guidance tables, and `cairn-audit norms <role>` printing each recipe line; the shipped
guidance (`skills/cairn-admin-screens/SKILL.md` with a new exemplar built from the fixture screen,
`skills/cairn-extend/references/daisyui-first.md`, `claude/agents/cairn-extension-reviewer.md`);
the sync test between the guidance tables, the recipe source, and the fixture route; and the
admin agent-build probe. It depends on pass A's final class vocabulary and fixture screen.

## Pass C: one public theme

### The contract

The public theme contract has three parts, and nothing else:

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

**Admission.** A key enters `cairn-public.css` only when an engine or chassis file reads it. Waymark's
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
the engine contract small and removes the `@theme`-pruning risk for the scale. The cost is that a
built-in public component cannot rely on a scale key; it sizes type and space from its context
(`em`, `inherit`) or from daisyUI's `--size-field` and `--size-selector`. A custom public component
reads the scale freely, since the chassis defines it. The chassis README's collision note is corrected to
all five shadowed names.

The chassis `tokens.css` therefore keeps: the Tailwind import, the daisyUI plugin activation, the
`cairn-public.css` import, the `prose.css` and `composition.css` imports, `@source not "./.claude"`, and
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
`@theme`'s own rule, where the later declaration wins, and the chassis imports `cairn-public.css` before
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
a built-in public component that reads a newer key fails silently on an older site. Shipping a package's
design defaults in the package is the daisyUI and Tailwind idiom. The pass records a new ruling in
`docs/internal/engine-rulings.md` (the proposed text is in the fold record).

**What stays copied, on purpose.** `prose.css` and `composition.css` are the design itself, so
they stay copy-on-create, the Drupal Starterkit and shadcn choice. The cost is stated: the four
rebuilt sites do not receive upstream prose fixes automatically. Those fixes reach a site through
the migration notes.

**Built-in public components.** A built-in public component may assume `cairn-public.css` and daisyUI's
theme variables. It lives in `src/lib/public/`, where the `@source` line makes its markup a scanned
source on every consumer, so its Tailwind utilities compile and the `@theme` keys it reads are
emitted. It uses no daisyUI component class, since a site's plugin config may exclude that
component. `PreviewBanner` migrates to this posture as a named task. Pass B already moved it into
`src/lib/public/` and exports it from `./public`, so pass C changes only its styling. It reads
contract tokens and drops its literal palettes and its color-scheme media blocks. Its four `--cairn-preview-*` properties stay
as named overrides whose fallbacks are tokens, so a site's existing override still wins.

**The seam promise.** `cairn-public.css` and the emitted-class registry are public surface. Renaming or
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

### Levers and template fixes from the designer walkthrough

A designer agent re-skinned a scratch copy of the showcase to a dark-first theme and added a themed
directive ([friction log](../research/2026-09-27-theme-designer-friction-log.md)). The walkthrough
found gaps the contract does not reach, each in the chassis, the template, or one engine file. Pass
C closes each one below. Each outcome carries a check that fails if it regresses. File paths are
the showcase's, which the template receives through `emit:template`, and engine paths use pass B's
names.

- **The theme toggle follows the applied theme (F3).** `resolveTheme` in
  `src/chassis/theme-toggle.ts` falls back to `matchMedia('(prefers-color-scheme: dark)')` when
  `<html>` carries no `data-theme`. Under a theme whose default block is dark, a visitor on a light
  OS sees a dark page. The toggle then offers dark mode, and its first click changes nothing. The
  fallback reads the root's computed `color-scheme` instead, which daisyUI sets in every theme
  block. Waymark behaves as it does today, since its `prefersdark` block sets `color-scheme: dark`
  exactly when the media query matches. A dark-first theme then needs no edit to `app.html`.
  **Check:** the fixture harness loads the fixture theme under a light `prefers-color-scheme` with
  no cookie. It asserts that the toggle offers light mode and that its first click changes the
  root's computed `color-scheme`.
- **The theme names live in one place (F3, F2).** Renaming `cairn` and `cairn-dark` today means
  editing the two daisyUI blocks in `theme.css`, the type and config in `SiteHeader.svelte`, and
  the cookie regex in `app.html`. The toggle's two names move into one exported config under
  `src/theme`, and `SiteHeader` imports it. Two touchpoints cannot import it: the inline script in
  `app.html` and the daisyUI block names. The config's doc comment names both, and so does
  `cairn-public`'s theming section. The plan may reduce the touchpoints further, for example with a
  cookie regex that accepts any name. **Check:** a unit test asserts that the config's names match
  the daisyUI block names in `theme.css` and the names `app.html`'s regex accepts.
- **Heading weight and heading case are levers (F4).** Heading weight is a literal `600` in
  `prose.css`'s heading rules and in route-scoped title rules, and the chrome bakes `font-semibold`
  into its title markup. A theme can change neither without targeting route-private classes, and
  the utilities layer beats a theme's `@layer components` rule. Two keys fix this. Both sit in the
  chassis `tokens.css` beside the design scale, as site-owned defaults, because only chassis and
  template files read them. The admission rule therefore keeps them out of `cairn-public.css`.
  - `--font-weight-heading`, default `600`, in the `@theme` block. It follows Tailwind 4's
    `--font-weight-*` namespace and generates the `font-heading` utility.
    `--font-weight-display` was rejected. Tailwind 4's `font-*` utility resolves the `--font-*`
    family namespace before `--font-weight-*`, so Waymark's `--font-display` face already claims
    `font-display`, and the weight utility would never emit. A compile against the installed
    Tailwind 4.3.3 confirmed this precedence. It also means a theme that adds a `--font-heading`
    face silently takes over `font-heading`. `theme-conformance` therefore flags a `--font-<name>`
    declared beside a `--font-weight-<name>`.
  - `--cairn-heading-case`, default `none`, a chassis role. `text-transform` has no Tailwind theme
    namespace, so the key takes the `--cairn-*` form under the naming rule.

  The readers are `prose.css`'s heading rules and the template chrome's titles: the wordmark and
  titles in `SiteHeader.svelte`, the home and archive routes' title markup and scoped title rules,
  `EntryRow.svelte`, and the styleguide's own section headings. Each replaces its literal `600` or
  its `font-semibold` with the keys. The plan picks the markup form for case. Eyebrow labels are not
  headings and keep their own `uppercase tracking-eyebrow` row. Waymark's defaults reproduce
  today's weight and case, so the equivalence test holds. The evidence comes from two sources. The
  risk review found the production sites reading `--font-weight-semibold` five times (RK6), and
  this walkthrough hit the same wall. **Check:** the fixture theme sets `800` and `uppercase`. The harness asserts the
  computed `font-weight` and `text-transform` of a prose `h2`, the home page's lead title, and a
  styleguide section heading.
- **The editor preview's ground reads the theme (F7).** `src/lib/admin/preview-doc.ts` pins
  `body{margin:0;background:#fff}` in the preview document. The site paints its ground on
  `.cairn-site-shell`, not on `body`, so the site's CSS never overrides the white. Under any dark
  theme, Waymark's included, the preview shows content on a white strip. The reset's ground becomes
  `var(--color-base-100, #fff)`, and the `WATCH` comment above it closes. The fix sits in the
  engine, not in the chassis `body` rule, so it reaches every site, stale chassis copies included.
  **Check:** a showcase e2e under Waymark dark asserts that the preview frame's `body` background
  equals the page's computed `--color-base-100`.
- **The skip link hides by an idiom independent of the scale (F6).** The skip link in
  `src/routes/(site)/+layout.svelte` hides with `-top-xl`. When a theme shrinks `--spacing-xl`
  below the link's height, part of the link shows on every page. The template switches to
  Tailwind's `sr-only focus:not-sr-only`, or another idiom that reads no scale key. **Check:** under
  the fixture's tight scale, the harness asserts that the skip link is visually hidden until
  focused (clipped to nothing or wholly outside the viewport) and fully visible once focused.
- **Every rounded element reads a radius token (F5).** The template sweeps its corner literals. The
  `border-radius: 2px` focus-ring corners in the home and archive routes, `EntryRow.svelte`,
  `ArticleView.svelte`, and `prose.css`'s link focus rule read `var(--cairn-focus-ring-radius)`.
  Two full-round shapes stay as documented exceptions, since each is a shape and not a step on the
  corner ladder: the tag filter's pill and the video facade's round button. Each carries a comment
  saying so. The tag filter's pill reads `var(--tag-filter-radius, 999px)` and drops its scoped
  declaration, so a theme's root declaration reaches it. **Check:** a unit test over the template's
  and chassis's CSS and `<style>` blocks finds no `border-radius` literal outside the named
  exceptions. The fixture theme sets `--tag-filter-radius: 0`, and the harness asserts the computed
  corner of a tag pill and of a focused entry link.
- **The styleguide renders every registered component (F8).** The styleguide's component kit is a
  hand-written markdown string in `src/routes/(site)/styleguide/+page.server.ts`, so a new
  directive is missing until someone adds a sample by hand. The kit part renders one sample per
  registry entry from its `preview`, serialized through the same grammar the Insert dialog uses. An
  entry with no `preview` is listed by name as lacking one, so the gap stays visible. The grammar
  helpers are internal today, so the root barrel gains one small export that returns a component's
  preview as directive markdown. `cairn-public`'s coverage gate walks the registry through the same
  export. The styleguide's copy also stops saying it "auto-themes with your system light or dark
  setting", which is false for a dark-first theme. **Check:** a test adds a throwaway entry with a
  `preview` to the registry and asserts that its sample appears in the styleguide's rendered
  output, with no edit to the route.
- **The template's comments cite only what a site has (F17).** The emitted `theme.css`, `site.css`,
  and `prose.css` cite `docs/internal/` paths and "Verdict 7", which a scaffolded site does not
  have. Each reference in the showcase sources becomes a one-line reason or a public docs link.
  **Check:** `check:template` fails when an emitted file contains `docs/internal/` or `Verdict`
  followed by a number, proven by a fixture file carrying each string.

### The guard

`cairn-audit` gains a **public scope**, a sibling of the admin static scope.

- **Roots.** The default roots are `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`,
  and `src/lib/components`, with `src/routes/admin` excluded through a new `exclude` list. On a
  consumer, `src/lib/components` is where the audit config's own comment says a site keeps its
  shared public components. On cairn's own tree that folder no longer exists after pass B's rename.
  A missing default root is skipped, as the admin scope skips one today. `src/lib/admin` stays in
  the admin scope by default. A site that keeps custom public components elsewhere names the root
  by config.
- **One scope per file.** The admin static scope skips any file the public scope claims, so no
  file answers to two grammars and `token-colors` never double-fires with `public-literals`. A test
  asserts that the two default root sets are disjoint.
- **No silent empty scope.** The scope fails with an actionable error when the whole scope
  matches no files, as `static.scope` does today. A single missing root is not an empty scope; the
  error fires only when every root together yields nothing.
- **Cairn's own tree.** The audit runs from the showcase, so the default `src/lib/public` root
  resolves inside the showcase, not the engine. The showcase's `cairn-audit.config.json` therefore
  adds the engine's `src/lib/public/` to the public roots. The engine's `src/lib/admin/` is never a public root.

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
  - the site's real import chain, where `cairn-public.css` counts only if that chain imports it;
  - Tailwind's theme variables, read from `tailwindcss/theme.css`, or the `--tw-` namespace;
  - the daisyUI keys of a block the rule already found complete;
  - any custom property declared in the scanned tree, in CSS, `<style>`, `style=`, or `style:`.

  A `var()` with a fallback and a non-literal name are skipped. Parsing goes through `sheet.ts`,
  never a regex over raw text. Two migration findings turn the `Consumers must:` line into a
  tripwire: "the public stylesheet does not import `cairn-public.css`" and "a chassis file redeclares an
  engine default". Today's check misses a key omitted from one block only; this rule catches it.
  One more finding guards the heading lever: a `--font-<name>` face declared beside a
  `--font-weight-<name>` weight, since the face then takes over the `font-<name>` utility.
- **`theme-contrast`** is the existing dual-gamut AA check, moved from the repo-only
  `scripts/checks/check-public-tokens.mjs` into the audit. Its resolver is new code with a stated
  bound. It follows `var()` chains to a literal and evaluates the one `color-mix` form (two
  operands in `oklab` or `oklch`, one percentage) with culori's `interpolate`, whose result matched
  Chromium's computed `color-mix` to every printed digit. It then alpha-composites the result over
  the ground. Any other form yields an "unmeasured" finding, never a pass or a crash. Schemes come
  from the daisyUI theme blocks, not hard-coded names: each named block resolves as
  `html[data-theme="<name>"]` would. The `prefersdark` block also takes the
  `@media (prefers-color-scheme: dark) :root:not([data-theme])` rules. Sources load in the site's
  import order, with `cairn-public.css` read from the installed package. The pairs are every text-bearing
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
  contract: daisyUI's variables, every `cairn-public.css` key with its default, the rules the sheet
  ships, the layer and nesting behavior with its limit, ink derivation, and the coverage limits of
  `theme-contrast`. It links the emitted-class registry and opens with the governing principle.
- **A new shipped skill, `cairn-public`,** replaces the planned `public-theme.md` (confirmed by
  Geoff, 2026-09-27). It covers the
  public side only, since the admin is always the same. Its shape follows the official daisyUI
  skill: a router `SKILL.md` within the packaged skill budget, pointing at reference pages. It
  defers to the official daisyUI skill for component classes. It has two halves:
  - A **theming section**, the contract as a designer uses it. It gives the job-to-token table,
    including an eyebrow row of `uppercase tracking-eyebrow`, and one placement rule: a per-scheme
    value goes in that scheme's daisyUI block. The table also carries three rows from the designer
    walkthrough. A headings row names `--font-weight-heading` and `--cairn-heading-case`. A default-scheme row says that the theme block marked `default: true`
    sets the first-visit scheme and that the toggle follows it. A rules row says that the chassis
    reads `base-300` as the rule and border color, never as a text ground. The section names the
    fast path, extending a built-in daisyUI
    theme by name or starting from daisyUI's theme generator, beside the full-control path. It also
    lists the two sanctioned escapes from `public-literals` (a one-line `@theme` token, or a
    reasoned suppression), the theme-name touchpoints and the one config that names them (the
    fixture keeps `cairn` and `cairn-dark`), and what a replacement `prose.css` must cover.
  - A **catalogue** of about 25 short pages for cairn's public pieces: each directive's rendered
    markup, the islands, `CairnHead`, `PreviewBanner`, the chassis composition primitives, and the
    prose elements. The component recipe names both paths. A custom public component is a
    `defineComponent` plus rules in `prose.css` or a component `<style>`. A built-in public
    component is markup in `src/lib/public/` plus rules in `cairn-public.css`. Both read contract
    tokens.

  A **coverage gate** asserts three things. Every directive (the showcase registry plus the engine
  built-ins), every island, and every composition primitive has a page. The gate walks the registry
  through the same export the styleguide uses. Every class a snippet uses
  exists in the showcase's compiled public stylesheet or the emitted-class registry. Every token a
  snippet or the table names resolves under `theme-conformance`'s resolution set. A parser that
  matches nothing fails. `skills/cairn-extend/SKILL.md` gains one routing line to `cairn-public`.
- **`cairn-implementer`'s definition** gains one line: a built-in public component under
  `src/lib/public/` carries no literal, uses no daisyUI component class, and follows
  `cairn-public`'s recipe. The definition lives in the dotfiles repo
  (`~/.dotfiles/claude/.claude/agents/cairn-implementer.md`), outside the pass's diff. Pass C's
  close conductor makes that edit and commits it in the dotfiles repo, verified by
  `claude-tooling-sync verify`, and the pass report quotes the line. `public-literals` over `src/lib/public/` enforces it.

## Proof

- **The Waymark render does not move, proven by computed values.** Before the move, a
  computed-token equivalence test (the `equiv.mjs` form from pass A) records
  `getComputedStyle(documentElement)` for every `cairn-public.css` key, every chassis scale key, and
  every daisyUI key. It records them on the built showcase under Waymark light and dark, plus the
  computed outline of a focused `cairn-focus-ring` element. After the move, the test asserts string
  equality. The `site-visual` baselines stay as the secondary check.
- **The public surface is snapshotted.** A standalone unit test parses `cairn-public.css`'s keys and
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
    a `var(--typo-token)`, `var(--color-red-550)`, a stylesheet that skips `cairn-public.css`, and a
    `--font-heading` face beside `--font-weight-heading`. It
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
  its element, and the nested region's ink recomputes. The same run carries the walkthrough
  checks named under "Levers and template fixes from the designer walkthrough": the toggle's first
  click under a light OS, the heading weight and case, the skip link at the fixture's tight scale,
  and the tag pill and focus-ring corners. For those checks the fixture also sets
  `--font-weight-heading: 800`, `--cairn-heading-case: uppercase`, and `--tag-filter-radius: 0`,
  with a tightened `--spacing-xl`. A second arm builds the Waymark template
  against the working engine. It asserts that a key read only by a built-in public component under
  `src/lib/public/` reaches the compiled CSS. The harness runs in CI's design workflow, and locally
  when fast enough. `test:reskin` also gains a standing case: Waymark with its four ink overrides
  stripped must pass `theme-contrast` in both schemes. The hue-rotation case stays.
- **The walkthrough fixes outside the harness each have their own check,** as that section names
  them: the theme-name agreement test, the showcase e2e on the preview frame's ground under Waymark
  dark, the radius-literal sweep test, the styleguide's throwaway-entry test, and the
  `check:template` fixture for internal references.
- **Three acceptance probes,** each a fresh Sonnet agent given only the shipped guidance and a
  one-line brief. Probe 1 runs at pass B's close. Probes 2 and 3 run at pass C's close.
  1. An admin screen, as the theme identity spec defines it.
  2. A minimal new theme on the chassis, with its own chrome and one custom public component. It
     passes with zero public-scope findings, a scanned-file count that includes every file the probe
     created or edited, and a clean `test:theme-fixture` build under it.
  3. A throwaway built-in public component in `src/lib/public/`, written by a `cairn-implementer`. It
     passes with zero public-scope findings on its directory and a nonzero scanned count. In the
     harness's template arm, its computed color and radius must differ between Waymark and the
     fixture theme and equal each theme's tokens. The main loop also reads one screenshot per theme.
     The branch is discarded.

  A probe failure names the guidance gap. The fix lands before that pass's close, and a fresh
  agent re-runs the probe once. A second failure escalates.
- **Gates that stay green** through both passes, each from the task that adds it: `npm run check`,
  `npm test`, `check:reference`, `check:facts`, `check:template`, `check:package` (with the skill budget), `check:rulings-format`,
  `check:public-tokens` (the successor script), `test:reskin`, `test:theme-fixture`, the `npm pack`
  smoke test, `norms:check`, and the showcase e2e.

## Documentation and records

Pass B's own records are listed under Delivery. Everything in this section is pass C's.

- **Facts** in `docs/internal/facts/` for each public behavior: the `cairn-public.css` subpath, the
  one-scope-per-file rule, derived inks and the changed muted and shadow defaults, the three rules,
  `PreviewBanner`'s token styling, and the `cairn-public` skill. The walkthrough fixes add four:
  the heading levers, the toggle's scheme resolution and its one theme-name config, the editor
  preview's themed ground, and the registry-driven styleguide with its new root export.
- **Reference pages:** `docs/reference/public-css.md` (new), `render.md`'s registry,
  `public.md` for `PreviewBanner`'s styling and its override properties, `cairn-audit.md` for
  pass C's rules and the public scope's config keys, and `core.md` for the new root export.
- **Frozen narrative pages, fixed under the freeze rule** (each deficiency fixed on the page, with a
  facts bullet): `docs/extend/design-your-site.md`, whose "every design-scale key … carries a
  generic default", ink-retune warning, and dependency sentence the pass makes wrong.
- **Internal docs:** `docs/internal/public-design-system.md` changes its fill-and-ink rule to "the
  ink follows the fill; hand-tune only by override". The chassis README updates the `tokens.css`
  row with the two heading keys, "The token system" paragraph, and the namespace rule. It corrects the spacing-collision count
  to five and the sentence calling directive classes engine-fixed.
- **The charter:** `docs/internal/what-cairn-is-and-is-not.md` amends its "all 28 registered rules
  audit the `/admin` surface" line to name the public scope. The pass records the new
  `engine-rulings.md` entry.
- **`CHANGELOG.md`** under `## Unreleased`, with one `Consumers must:` line: "move any key your
  copied `src/chassis/tokens.css` adds beyond the template's into your theme, then replace the
  copied roles, code-block binding, and focus-ring utility with `@import
  "@glw907/cairn-cms/cairn-public.css"`; compare your copy's ink, muted, and shadow values first, since
  those defaults changed." `PreviewBanner`'s migration makes the import required, not optional.
- **`docs/extend/migration-notes.md`** carries the swap, the changed defaults, a `paletteFiles`
  entry that names the old copy, and the two optional peers.
- **ROADMAP** marks "One public theme" done and removes it from the live tiers.
- **The template:** `npm run emit:template` re-emits Waymark's `theme.css`, the chassis
  `tokens.css`, and the chassis README to `templates/waymark`.

## Delivery

**Two passes, run in sequence.** Each runs its tasks through `pass-execute`, with the implementer,
`diff-reviewer`, and gate chain per task.

- **Pass B** is about six tasks. Task 1 is the rename, run alone and committed green before task 2
  starts. Tasks 2 onward are the admin agent path, about five tasks.
- **Pass B's close** runs probe 1, reconciles the skill budget, and makes pass B's shared-file
  edits: `docs/reference/cairn-audit.md` for pass B's rules and the admin scope's new defaults, the
  facts for the rename, the `./public` subpath, and the new rules, the changelog entry with pass
  B's `Consumers must:` line, and the migration notes for the rename, `PreviewBanner`'s new
  subpath, and the admin scope's defaults. Under R1's recommended answer, the close then cuts the
  release.
- **Pass C** is about thirteen tasks, in dependency order. Tasks 4 and 5 are new in the fourth
  fold, and the walkthrough's other fixes fold into existing tasks:
  1. The equivalence test recorded on today's tree, then `cairn-public.css`, its `@source` directory,
     the moved rules, the chassis import, and the key-set snapshot test.
  2. Ink and muted derivation by measurement, the shadow default, the stripped-overrides case, and
     Waymark's per-scheme values moved into its daisyUI blocks with its header's step 6.
  3. `PreviewBanner`'s styling migration to contract tokens, and the editor preview document's
     themed ground with its e2e. Pass B already moved both files.
  4. The heading levers and the toggle: `--font-weight-heading` and `--cairn-heading-case` with
     their readers in `prose.css` and the template chrome, the toggle's computed-scheme
     resolution, and the one theme-name config with its agreement test.
  5. The template sweep: the radius literals and the tag pill's override, the skip link, the
     registry-driven styleguide with its root export and throwaway-entry test, and the comment
     scrub with its `check:template` fixture.
  6. The `sheet.ts` fix, the first audit task: comments no longer fuse into declaration names or
     values, with a regression test over `theme.css`. Every later rule depends on it.
  7. The public scope (roots, `exclude`, one scope per file, the empty-scope error) and
     `public-literals` on the shared core, with `markup.ts` exposing mixed `style=` parts and
     `style:` directives.
  8. `theme-conformance`, including the face-and-weight collision finding.
  9. `theme-contrast`, the three dependency decisions, the `npm pack` smoke test, and the
     `check:public-tokens` successor.
  10. The fixture theme and `test:theme-fixture`, carrying the walkthrough's harness checks.
  11. The reference page, the render registry, `PreviewBanner`'s entry on `public.md`, and the
      new root export on `core.md`.
  12. The `cairn-public` skill with the three new table rows, its coverage gate on the shared
      registry walk, and the `cairn-extend` routing line.
  13. The chassis README, `public-design-system.md`, `design-your-site.md`, and the template
      re-emit.
- **Pass C's close** runs probes 2 and 3, reconciles the skill budget, and makes pass C's
  shared-file edits: `docs/reference/cairn-audit.md` for pass C's rules, the facts, the changelog,
  the migration notes, the charter line, the rulings entry, the ROADMAP, and the dotfiles
  `cairn-implementer` line. The close then cuts the release, under either answer to R1.

Segment boundaries fall every three or four tasks within each pass.

**Sequencing.** This spec and its review touch nothing in pass A's worktree. Both plans are
authored together after pass A's segment D lands, for one approval sitting. Pass B's agent path
needs A's final vocabulary and fixture. Pass C's plan may read pass B's final names, since this
spec fixes them. Execution is sequential. Pass B starts after pass A merges: pass A edits the files
the rename moves, and B's rules would flag cairn's unswept tree. Pass C starts after pass B merges,
and it edits the starter `theme.css` that pass A's task 11 changes. Under R1's "no", pass C starts
from pass B's finished branch instead, and both merge together. Draft documentation resumes
after pass C merges, and the designer's theme guide is drafted against this contract.

**Release.** Both passes change what the template imports. Pass B changes the export names:
`./components` becomes `./admin`, and the preview route imports `PreviewBanner` from the new
`./public`. Pass C changes the stylesheet, so the template imports `cairn-public.css`. The template
goes live from `main` on merge, since the Deploy button and the setup command read
`templates/waymark` from `main`. A merge without a release would leave the template importing
subpaths no published version exports. Each merge therefore meets the first release trigger in
the repo `CLAUDE.md`: a consumer, the template on `main`, needs the change now. R1 settles whether
that means two cuts or one. The version numbers below are proposals; verify each is free with
`npm view @glw907/cairn-cms versions --json` before promising it.

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

- **R1. Cut a release at each pass's merge?** Recommend yes. Yes cuts two releases, each under
  release trigger 1, since the template on `main` needs the change at that merge. Pass B's close
  cuts passes A and B as `0.98.0`, carrying the rename's `Consumers must:` line. Pass C's close
  cuts pass C as `0.99.0`, carrying the stylesheet's `Consumers must:` line. No window opens where
  the template on `main` imports an unpublished subpath. The cost is that sites cross two
  `Consumers must:` lists instead of one, which is small, since each site is rebuilt from Waymark
  anyway. No holds pass B unmerged and cuts once at pass C's merge. Pass C then builds on pass B's
  branch, pass B waits on pass C, and one release (`0.98.0`) carries both breaking changes.
- **R2. Public-literals advisory for good, the other two promoted?** Recommend yes:
  `public-literals` stays advisory on consumers permanently, since it polices a developer's own
  markup. `theme-conformance` and `theme-contrast` are promoted to error at the next minor, because
  they protect cairn's own parts. That promotion also waits for each production site's advisory
  count to reach zero, by fixes or reasoned suppressions. No promotes all three as first drafted,
  and the charter line then says the audit gates a site's public design.

## Open for the plan

Execution calls, not design calls:

- Each status's derivation percentage and muted's form, set by measurement.
- The fixture harness's temp-copy mechanism and its local-versus-CI split.
- The equivalence test's key list, which is exactly `cairn-public.css`, the chassis scale, and daisyUI's
  keys at capture time.
- The exact config key names for the public roots, `exclude`, and the theme roots.
- The `cairn-public` catalogue's page list, within the coverage gate's sources.
- The markup form that applies `--cairn-heading-case` in the chrome, the new root export's name,
  and whether the theme-name touchpoints shrink below the one config.
- Whether `DEFAULT_ADMIN_SCOPE` gains `src/lib/admin`, settled by running the three motion rules
  over the engine's admin components.
