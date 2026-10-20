# Theme identity pass B, review lens: idiom

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at `4365ac34`.
**Lens:** does each piece follow Tailwind CSS 4, daisyUI 5, and CSS custom-property convention as
their own docs describe them, and where does the spec invent what the stack already has?
**Versions checked:** `tailwindcss` 4.3.3, `daisyui` 5.7.44 (from `node_modules`).
**Method:** every claim is backed by a quoted doc or by a compile run against the installed
`@tailwindcss/node` in the scratchpad (inputs and outputs quoted inline). Nothing argued from memory.

## Summary

The spec's core shape is idiomatic: a package-shipped CSS file of `@theme` defaults is what Tailwind
itself recommends, `color-mix(in oklab, …)` derivation is what daisyUI itself does, and the custom
audit rules are the right tool over stylelint. Three defects matter, and all three concern cascade and
build mechanics the spec does not name. They are cheapest to fix now, before the contract freezes.

| # | Severity | Finding |
|---|----------|---------|
| 1 | major | Tailwind drops unused `@theme` variables, so an engine public component in `node_modules` can read a variable the site's build never emits |
| 2 | major | Unlayered `:root` defaults beat a theme that sets cairn roles in its `@plugin "daisyui/theme"` block, the daisyUI-idiomatic home |
| 3 | major, OWNER FORK | The `--spacing-*` t-shirt names hijack Tailwind's `max-w-xs`/`max-w-2xl`/`w-xs` sizing, and the spec freezes them as public contract |
| 4 | minor | The engine defaults silently redefine Tailwind stock keys (`--leading-tight`, `--leading-snug`, `--tracking-tight`, `--font-mono`) in every consumer |
| 5 | minor | The naming rule splits by owner; Tailwind splits by whether a token maps to a utility |
| 6 | minor | `cairn-eyebrow`'s form and home are unspecified; the Tailwind 4 form is `@utility`, in the engine file |
| 7 | minor | `public-literals` re-implements the existing `token-colors` rule |

## Findings

### 1. major: engine components can read `@theme` variables the site never emits

**Location:** spec lines 65-70 (the `@theme` defaults), 84-86 (the proof), 241 ("the `@theme`
utility-generation proof").

**Defect.** The plan's proof tests only that `@theme` keys "still generate their named utilities."
The larger risk is variable emission. Tailwind 4 emits a theme variable only when something in the
build uses it, and it does not scan `node_modules`. An engine public component shipped in `dist`
that reads `var(--text-step-3)` is invisible to the site's build. If nothing in the site's own
sources also uses that key, the variable is never emitted, and the component's `var()` dangles.
That is the goal-3 failure ("add a new component to the library and have it easily access the
theme values"), and it would pass every showcase gate whenever the showcase happens to use the key
somewhere else.

**Evidence.**

- Tailwind, [Theme variables](https://tailwindcss.com/docs/theme): "By default only used CSS
  variables will be generated in the final CSS output. If you want to always generate all CSS
  variables, you can use the `static` theme option."
- Tailwind, [Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files):
  "Tailwind will scan every file in your project for class names, except … Files in the
  `node_modules` directory." And: "This is especially useful when you need to scan an external
  library that is built with Tailwind … `@source "../node_modules/@acmecorp/ui-lib";`"
- Compile run, `@theme { --text-step-9: 3rem; --tracking-caption: 0.09em; }` with
  `.foo { letter-spacing: var(--tracking-caption) }`. With no candidates, only `--tracking-caption`
  is emitted and `--text-step-9` is absent. With the candidate string `--text-step-9` (what the
  scanner extracts from `var(--text-step-9)` in a scanned file), it is emitted.
- Compile run: `@theme static { --text-step-3: 1.5rem; }` followed by a theme's ordinary
  `@theme { --text-step-3: 2rem; }`. The key is **not** emitted. A theme's non-static redeclaration
  drops the static flag, so `@theme static` in the engine file alone is not a fix, because every
  theme overrides the scale.
- The engine already ships the precedent: `src/lib/admin-sources.css` is `@source ".";`, exported
  at `./admin-sources.css` "so a site's own admin.css imports this one line instead of naming the
  package's dist layout itself."

**Proposed fold.** The engine defaults stylesheet carries a `@source` line over the engine's
*public* component directory only, never the whole `dist`, which would pull admin markup into the
public sheet. This is the `admin-sources.css` pattern applied to the public side. Widen the plan's
proof from "utilities generate" to "an engine component under `node_modules` reading a scale key the
site never uses, under a theme that overrides that key, resolves." Record why `@theme static` was
rejected (a later non-static override drops it).

### 2. major: unlayered `:root` defaults beat the daisyUI theme block

**Location:** spec lines 67-69 ("cairn's roles in `:root`"), 100-103 (Waymark's hand-set inks), the
guidance at 149-153.

**Defect.** Today's chassis declares cairn's roles in a plain, unlayered `:root` block
(`chassis/tokens.css:114`). Carried into the engine file that way, the defaults outrank any
*layered* override, because unlayered styles beat every cascade layer. daisyUI's theme plugin
accepts arbitrary custom properties in `@plugin "daisyui/theme"` and emits them in `@layer base`, on
both the `prefers-color-scheme` selector and the `[data-theme]` selector. That block is the natural
place for a theme designer to put a scheme-dependent value such as a dark status ink. Under the
spec's shape, a designer who writes `--cairn-success-ink` there is silently overridden by the
engine default.

The same mechanism already does the job Waymark does by hand. `theme.css` keeps three hand-synced
blocks (plain `:root`, the `@media (prefers-color-scheme: dark) :root:not([data-theme])` block, and
`:root[data-theme="cairn-dark"]`), justified by the comment "plain CSS has no mixin to share a
declaration block across two different selector contexts. Keep both blocks in sync by hand." The
daisyUI theme block is that mixin.

A second consequence: a `color-mix(… var(--color-success) …)` default declared on `:root` resolves
once on the root element. Descendants inherit the resolved value, so under a daisyUI nested theme
the derived ink tracks the *root's* fill, not the nested theme's.

**Evidence.**

- `node_modules/daisyui/theme/index.js`: the options destructure is
  `const { name, default, prefersdark, "color-scheme", root, ...customThemeTokens } = options`,
  then `baseStyles = { [selector]: { "color-scheme": …, ...themeTokens } }`, emitted through
  `addBase` under both `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` and
  `[data-theme="<name>"]`.
- Compile run: a plain `:root { --cairn-success-ink: var(--color-success); }` next to
  `@plugin "daisyui/theme" { name: "t"; default: true; --cairn-success-ink: oklch(45% 0.1 150); }`
  emits the theme value inside `@layer base { :where(:root),…,[data-theme="t"] { … } }` and the
  default unlayered, so the default wins.
- daisyUI, [Themes](https://daisyui.com/docs/themes/): "Add `data-theme='THEME_NAME'` to any
  element and everything inside will have your theme. You can nest themes and there is no limit!"
- Tailwind emits its own theme variables layered, as the compile output shows:
  `@layer theme, base, components, utilities; @layer theme { :root, :host { … } }`.

**Proposed fold.**

1. Emit the engine's `:root` defaults inside `@layer theme { :root, :host { … } }`, Tailwind's own
   shape for theme variables. They become true defaults: the lowest layer, beaten by a theme's
   unlayered `:root`, its `@layer base` daisyUI block, or its own `@theme`.
2. For derived defaults that read a daisyUI role, use `:root, :host, [data-theme]` as the selector,
   so a nested theme recomputes them.
3. In `public-theme.md` and the reference page, name the `@plugin "daisyui/theme"` block as the
   home for a theme's scheme-dependent cairn values.
4. Build the fixture theme that way. Converting Waymark's three blocks is optional and
   render-neutral, since the `site-visual` baselines prove it. I recommend doing it, because Waymark
   is the file four sites will be re-skinned from, and it currently teaches the hand-sync pattern.

### 3. major, OWNER FORK: the space scale's names hijack Tailwind's sizing utilities

**Location:** spec line 66 (`--spacing-*` in the engine `@theme`), 88-89 (renaming a key becomes a
disclosed contract change).

**Defect.** The chassis space scale is `--spacing-3xs`, `-2xs`, `-xs`, `-s`, `-m`, `-l`, `-xl`, and
`-2xl`. Tailwind 4's sizing utilities look up `--spacing-<name>` for a named value, so five of these
eight names shadow Tailwind's container sizes. Once the scale ships in the engine, every consumer
gets `max-w-xs` = 0.75rem (stock: 20rem) and `max-w-2xl` = 4rem (stock: 42rem). That surprises the
extending developer, who writes stock Tailwind on top of cairn. The spec makes these names public
contract, so this is the last cheap moment to change them. Today the problem is local to each
site's copy; after pass B it becomes a disclosed break to undo.

**Evidence.**

- Tailwind, [Theme variables](https://tailwindcss.com/docs/theme), namespace table: "`--spacing-*`
  | Spacing and sizing utilities like `px-4`, `max-h-16`, and many more"; "`--container-*` |
  Container query variants like `@sm:*` and size utilities like `max-w-md`".
- `node_modules/tailwindcss/theme.css:335,340`: `--container-xs: 20rem;`, `--container-2xl: 42rem;`.
- Compile run, `@theme { --spacing-xs: 0.75rem; --spacing-2xl: 4rem; }` with candidates
  `max-w-xs max-w-2xl w-xs`:
  `.max-w-xs { max-width: var(--spacing-xs); }`, `.max-w-2xl { max-width: var(--spacing-2xl); }`,
  `.w-xs { width: var(--spacing-xs); }`.

**Options.**

- **(a) Rename the colliding steps before the freeze** to a family Tailwind does not use for sizes
  (for example `--spacing-step-*` or Utopia-style names). The cost is one mechanical markup sweep
  in the showcase and template, plus one more line in the existing `Consumers must:` swap.
- **(b) Keep the names, and document the collision** on the reference page ("`max-w-xs` means the
  space step, not the container size").
- **(c) Keep the names, and have `public-literals` or a sibling rule flag `max-w-`/`w-` with a
  colliding step name.**

**Recommendation:** (a). The spec is already making every site touch this import once, and a
guard (c) would police a trap the engine chose to set.

### 4. minor: the engine defaults redefine Tailwind's stock keys for every consumer

**Location:** spec line 66 (the `--leading-*` and `--tracking-*` defaults, the three faces).

**Defect.** Today's chassis defaults set `--leading-tight: 1.15`, `--leading-snug: 1.4`,
`--tracking-tight: -0.01em`, and `--font-mono`, all of them Tailwind stock keys with different stock
values. In a site-owned copy that is the site's choice. Shipped as engine defaults, it changes the
meaning of stock `leading-tight` for every developer who imports the engine file. Waymark sets all
of these itself, so the engine defaults are never what Waymark renders.

**Evidence.** `node_modules/tailwindcss/theme.css:385,391,392`: `--tracking-tight: -0.025em;`,
`--leading-tight: 1.25;`, `--leading-snug: 1.375;`, and `--font-mono:` at line 6. Tailwind,
[Theme variables](https://tailwindcss.com/docs/theme): the `--leading-*` namespace maps to "Line
height utilities like `leading-tight`".

**Proposed fold.** The engine file defines only keys Tailwind does not already own (`--text-step-*`,
`--leading-body`, `--tracking-eyebrow`, the measures, and so on). For the stock keys it leaves
Tailwind's values as the defaults and lets a theme retune them. The Waymark render does not move.

### 5. minor: the naming rule splits by owner, where Tailwind splits by utility mapping

**Location:** spec lines 72-73 ("Tailwind's `@theme` names for the scale, and `--cairn-*` for
cairn's roles").

**Defect.** Tailwind's documented line is whether a token should produce a utility class, not who
owns it. The spec already crosses its own line: `--color-muted` and `--color-card-border` are
cairn roles, yet they live in `@theme` so that `text-muted` and `border-card-border` generate.
The same reasoning applies to three more keys, each already in a Tailwind namespace, which the rule
sends to `--cairn-*` instead:

- `--cairn-caption-tracking` sits next to `--tracking-eyebrow` as the same kind of value;
  `--tracking-caption` would give `tracking-caption`.
- The status inks are text colors a new public component wants as `text-success-ink`; today it must
  write `text-(--cairn-success-ink)`.
- `--cairn-shadow` sits in the `--shadow-*` namespace, where it would give a `shadow-card`-style
  utility.

Goal 3 (a component author reaching theme values) is served in Tailwind by utilities.

**Evidence.** Tailwind, [Theme variables](https://tailwindcss.com/docs/theme): "Use `@theme` when
you want a design token to map directly to a utility class, and use `:root` for defining regular
CSS variables that shouldn't have corresponding utility classes." The namespace table lists
`--color-*`, `--tracking-*`, and `--shadow-*`.

**Proposed fold.** Restate the rule as "a key that belongs in a Tailwind namespace goes in `@theme`
under that namespace; everything else is `--cairn-*` in the layered `:root` block (finding 2)."
Apply it to the ink set, the caption tracking, and the shadow. The code ramp, the CTA set, the
focus ring, and `--flow-space` stay `--cairn-*`, since nothing wants them as utilities. These keys
also land in `@layer theme` for free, which resolves finding 2 for them. The Waymark overrides move
with the rename; the migration note already carries a swap. If the owner prefers minimal churn,
fold only `--tracking-caption`, the clearest case.

### 6. minor: `cairn-eyebrow` should be an engine `@utility`

**Location:** spec lines 105-112.

**Defect.** The spec says "the chassis gains one class" and names neither its form nor its home.
The same file already sets the Tailwind 4 precedent: `@utility cairn-focus-ring`
(`chassis/tokens.css:177`). A plain class in `composition.css` has two problems. It does not take
variants (`lg:cairn-eyebrow`), and a theme may drop `composition.css`, so an engine public
component could not rely on the class. A redeclared `@utility` merges its declarations, so a theme
restyles the class the same way it would restyle a component class, and every variant follows.

**Evidence.**

- Tailwind, [Functions and directives](https://tailwindcss.com/docs/functions-and-directives):
  "Use the `@utility` directive to add custom utilities to your project that work with variants
  like `hover`, `focus` and `lg`."
- Compile run: two `@utility cairn-eyebrow` blocks (the second sets `text-transform: none;
  font-variant-caps: all-small-caps`) emit one merged `.cairn-eyebrow` and one merged
  `.lg\:cairn-eyebrow`, with the later declarations winning.
- The cut alternative is Tailwind's own advice, from
  [Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles): "Using Tailwind you
  probably don't need these types of classes as often as you think." Markup could write
  `uppercase tracking-eyebrow`, both of which already generate. That loses theme-restylability,
  which is the spec's stated reason for the class, so I do not recommend the cut.

**Proposed fold.** Define `@utility cairn-eyebrow` in the engine defaults stylesheet, beside the
focus-ring utility, and state in the reference page that a theme restyles it by redeclaring the
`@utility`. Consider moving `cairn-focus-ring` there too, for the same reason.

### 7. minor: `public-literals` re-implements `token-colors`

**Location:** spec lines 121-127, 139-141 ("There is one implementation of each check").

**Defect.** `src/lib/audit/rules/static/token-colors.ts` already flags raw color literals in CSS
declarations, and already has the "declaration site is exempt" concept (`config.paletteCssFiles`,
whose comment says "a site names its own theme file the same way"). `public-literals` adds a second
color-literal detector with a second exemption mechanism (`src/theme/**/*.css`). That runs against
the spec's own one-implementation rule. The real differences are scope (public roots), the markup
arms (`style=`, arbitrary values), the chromatic `oklch()` literals `token-colors` lets through, and
absolute font sizes.

On stylelint as the alternative: stylelint is not the better idiom here. The closest plugin
enforces "variables, functions or custom CSS values … for CSS longhand … properties"
([stylelint-declaration-strict-value](https://github.com/AndyOGo/stylelint-declaration-strict-value)).
It sees CSS, not Tailwind arbitrary values in a `class` attribute, and it would add a new consumer
dependency beside an audit that already runs. The custom rules are justified.

**Proposed fold.** Implement `public-literals` as the public scope of the shared literal detector.
Either extend `token-colors`, or factor out its `hazardIn` and add the chromatic and font-size arms.
Express the theme-file exemption through the existing `paletteCssFiles` list, with glob support if
needed, rather than a new path rule.

## Checked and sound (no finding)

- **The CSS-file export.** Tailwind, [Theme variables](https://tailwindcss.com/docs/theme): "You can
  put shared theme variables like this in their own package in monorepo setups or even publish them
  to NPM and import them just like any other third-party CSS files." A JS plugin would be the
  non-idiom: "Use the `@plugin` directive to load a legacy JavaScript-based plugin"
  ([Functions and directives](https://tailwindcss.com/docs/functions-and-directives)).
- **Ink derivation by `color-mix(in oklab, …)`.** daisyUI derives the same way:
  `.alert-soft { … background: color-mix(in oklab, var(--alert-color, …) 8%, var(--color-base-100)) }`
  and `.link-success:hover { color: color-mix(in oklab, var(--color-success) 80%, #000) }`
  (`node_modules/daisyui/components/alert.css`, `link.css`). The spec mixes toward
  `--color-base-content` rather than `#000`, which is the more scheme-correct choice.
- **Inks beside daisyUI's `-content` roles.** They do different jobs, so there is no duplication.
  daisyUI, [Colors](https://daisyui.com/docs/colors/): `-content` is "Foreground content color to
  use on `primary` color", meaning text *on the fill*. daisyUI's own status text on a base surface
  is the fill itself (`.link-success{color:var(--color-success)}`, `.alert-soft` text), which is the
  contrast gap cairn's inks fill.
- **Relative color syntax deferral.** The claim is accurate. It became Baseline "Newly Available:
  Since September 16, 2024", with "Expected Widely Available: March 16, 2027"
  ([web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/relative-color/)).
- **`--cairn-*` for non-utility roles** matches Tailwind's `:root` guidance quoted in finding 5.
- **The daisyUI key list as the required floor** matches daisyUI's documented theme variables. One
  note for the ease-of-theming lens, not a defect: daisyUI already provides a lighter floor.
  "To customize a built-in theme, you can use the same structure as adding a new theme, but with
  the same name as the built-in theme … All the other values will be inherited from the original
  theme" ([Themes](https://daisyui.com/docs/themes/); `theme/index.js` merges `allThemes[name]`).
  `theme-conformance` should treat such a block as complete.
