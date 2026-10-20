# Spike: daisyui/theme blocks, a full-component admin sheet, and the cairn-theme sublayer

Throwaway feasibility spike, 2026-09-26. Worktree `.claude/worktrees/agent-a09dc3dfbaabf63c6` at
`c2f519d1`. Nothing committed. Every tracked file is restored to HEAD. The evidence lives under the
worktree's untracked `spike/` directory: scripts, built sheets, probe JSON, and screenshots.

Installed versions (measured, not recalled): daisyUI **5.7.44**, tailwindcss **4.3.3** (the
brief says 4.3.2; `node_modules/tailwindcss/package.json` reads 4.3.3), postcss-prefix-selector
2.2.1. Chromium is the headless one bundled with the repo's Playwright.

## Verdicts

| # | Point | Verdict |
|---|---|---|
| 1 | The engine stays the single compiler; consumers carry no daisyUI | **PROVEN** |
| 2 | Both admin themes authored as `@plugin "daisyui/theme"` blocks | **PROVEN WITH CONDITIONS** |
| 3 | Every daisyUI component compiles into the sheet | **PROVEN WITH CONDITIONS** (size) |
| 4 | Idiom overrides in `@layer utilities { @layer cairn-theme }` | **PROVEN** (pin the sublayer order) |

## Point 1: single compiler (PROVEN)

The showcase was rebuilt against the spike engine with no change to its `src/admin.css`
(`git status` showed it untouched). A throwaway route at `/admin/spike` used `timeline`, plain
`btn`, `btn-soft btn-primary btn-sm`, `toggle toggle-success`, and `alert alert-info`. It was served
with `VITE_CAIRN_E2E=1 npm run build` and `CAIRN_DEV_BACKEND=1 vite preview`, which is the e2e
path where the dev handle mints an owner. The page returned 200 inside `CairnAdminShell`. Computed
styles on the route:

- `.timeline`: `display: flex`. Each `li` is `display: grid` with columns `85.5px 9px 85.5px 0px`.
  `.timeline-box` has a 1px border, a 16px radius, and a base-100 fill.
- `.btn`: `inline-flex`, height 40px, padding 16px, base-200 fill, radius 10px.
- `.alert-info`: `display: grid`, fill `oklch(0.52 0.12 240)`, which is the cairn `--color-info`.
- `.toggle`: `inline-grid`, width 40px.

The consumer's own compiled `.cairn/admin.css` carries 0 `timeline` and 0 `.btn` rules. Every rule
came from the engine sheet (`tag.*.css` in the build, the one asset carrying `cairn-theme`). The
screenshot is `spike/out/consumer-spike.png`. `/admin/posts` also rendered coherently
(`spike/out/consumer-posts.png`).

**Worktree setup trap, handled:** the showcase's `node_modules/@glw907/cairn-cms` is the relative
link `../../../..`. A plain symlink to main's `examples/showcase/node_modules` would therefore have
proven main's engine (the durable gotcha). `spike/link-showcase.mjs` builds a directory of
absolute links instead. It re-creates the `@glw907` links with the same relative text, so they
resolve to the worktree. `realpath` confirmed the worktree.

## Point 2: daisyui/theme blocks (PROVEN WITH CONDITIONS)

### What the plugin does with arbitrary properties

`node_modules/daisyui/theme/index.js` pulls out five option keys and spreads everything else
verbatim into the theme rule:

```js
const { name = "custom-theme", default: isDefault = false, prefersdark = false,
  "color-scheme": colorScheme, root = ":root", ...customThemeTokens } = options
...
let selector = `${root}:has(input.theme-controller[value="${escapedName}"]:checked),[data-theme="${escapedName}"]`
...
const baseStyles = { [selector]: { "color-scheme": themeTokens["color-scheme"] ?? colorScheme ?? "normal", ...themeTokens } }
...
addBase(baseStyles)
```

So the plugin itself accepts arbitrary custom properties and even plain properties
(`font-family`, `scrollbar-color`). Tailwind's `@plugin` option parser is where the limits bite
(`node_modules/tailwindcss/dist/lib.mjs`):

```js
for(let y of m.nodes??[]){if(y.kind!=="declaration")throw new Error(`Unexpected \`@plugin\` option: ...
\`@plugin\` options must be a flat list of declarations.`);
 ... let S=y.value,x=z(S,",").map(b=>{if(b=b.trim(),b==="null")return null;if(b==="true")return!0;
 if(b==="false")return!1;if(Number.isNaN(Number(b))){if(b[0]==='"'&&b[b.length-1]==='"'||b[0]==="'"&&b[b.length-1]==="'")return b.slice(1,-1); ...
 }else return Number(b);return b});k[y.property]=x.length===1?x[0]:x}
```

Tailwind's parser imposes three conditions:

1. **No nested rules.** The light root's nested `[data-cairn-motion]` and `[data-cairn-zen-used]`
   rules, plus their `@starting-style`, cannot go in the plugin block. They stay in a plain
   `[data-theme='cairn-admin'] { ... }` rule.
2. **Top-level commas split a value into an array**, and each element becomes a repeated
   declaration, so the last one wins. Quoted elements also lose their quotes. Measured with the
   naive port (`spike/out/plugin-all.css`), 20 differences across 78 properties:
   - `--font-body` became `sans-serif`, and the `font-family` computed on the wrapper went with it.
   - `--font-display` and `--font-editor` became `sans-serif` and `monospace`.
   - `--cairn-shadow` lost its first shadow layer in both themes.
   - The parser is paren-aware, so `cubic-bezier(...)` and `color-mix(...)` survived.
3. **The fix that works:** wrap any value that has a top-level comma or starts with a quote in
   double quotes, and single-quote the inner strings. For example,
   `--font-body: "'IBM Plex Sans Variable', system-ui, ..., sans-serif";`. The parser strips the
   outer quotes and keeps the value whole. With that rule applied
   (`spike/out/plugin-quoted.css`), `spike/equiv.mjs` compared the computed value of all 78
   declarations of today's two roots on four elements: the light wrapper, a light child, the dark
   wrapper, and a dark child. It found **0 differences**. Numeric coercion (`--depth: 1`) was
   harmless.

`@plugin "daisyui/theme"` works from inside the `@import`ed partial. It does not need to sit in
`admin-css.input.css`.

### The data-theme load-bearing rule

It still holds. The emitted selector is
`:root:has(input.theme-controller[value="cairn-admin"]:checked),[data-theme="cairn-admin"]`.
postcss-prefix-selector hands the transform one selector at a time:

```js
rule.selectors = rule.selectors.map(selector => { ... options.transform(prefix, selector, prefixWithSpace + selector, ...) })
```

The `[data-theme="cairn-admin"]` half passes through unscoped through the existing
`selector.includes('[data-theme=')` branch. The theme variables therefore land on the wrapper that
carries `data-theme`. Three reads confirm it: the equivalence probe, `wrapperVars` in the
layer-order probe, and `themeRootVars` on the real showcase route (`--color-primary`,
`--color-base-100`, and the full Plex stack all set on the wrapper). The `:root:has(...)` half gets
prefixed into `:where(scope) :root:has(...)`, which is inert. That adds 10 dead selectors, and no
leak. Descendant scoping is unchanged, because the prefix step is identical.

The `default: true` and `prefersdark: true` flags were probed too (`spike/out/flags.css`). They emit
`:where(:root)` and `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }`. Both are
prefixed into inert selectors, so nothing leaks, but they add about 5 KB of dead CSS. Leave both
flags off.

### Condition A: the theme moves from unlayered to `@layer base`

`addBase` puts the theme rule in `@layer base`, where today's roots are unlayered. Against a hostile
host sheet (unlayered `div { font-family: Georgia; -webkit-font-smoothing: auto; scrollbar-width:
auto; color-scheme: dark }`), 12 computed values changed. The host rule now wins `font-family`,
`-webkit-font-smoothing`, `scrollbar-width`, and `color-scheme` on the wrapper, and so on its
children too. Today the unlayered `[data-theme]` rule (0,1,0) beats that host rule. Custom
properties did not change in that probe. They would lose only to a host unlayered rule that matches
the wrapper and sets the same `--color-*` name.

**Mitigation:** keep the non-custom declarations in the plain unlayered root rule, next to the
nested rules that must stay there anyway. Those declarations are `font-family`, the smoothing
pair, `font-synthesis`, `scrollbar-*`, and `-webkit-tap-highlight-color`. `color-scheme` is emitted
by the plugin itself. It could be restated in the plain rule if the host-override case matters.

### Condition B: the raw partial loses its palette

Loaded raw, with no Tailwind step, the spike partial gives the wrapper an empty `--color-primary`,
an empty `--cairn-dur-base`, and a `Times New Roman` font, because a browser drops the unknown
`@plugin` at-rule. Today's partial gives `oklch(52% 0.2 293)`, `150ms`, and IBM Plex. The raw
partial is imported by `src/lib/reproductions/ReproContext.svelte` and by
`src/tests/component/EditorToolbar.test.ts`. In `src/`, `CairnAdminShell`, `LoginPage`, and
`ConfirmPage` also import `./cairn-admin.css`, which is the raw partial until `svelte-package`
plus the build overwrite it in `dist`. Any component test or dev path that renders from `src`
without the compiled sheet loses its theme. Either those imports move to the compiled sheet, or
the design system states that the partial is compile-only.

Source-text tests keep passing if the `@plugin` blocks stay in the partial: `role-layer-contrast`
and `grammar-tokens` both passed, since they grep the oklch literals. The literals would have to
stay single-quote-free, or those greps change.

## Point 3: every component compiles (PROVEN WITH CONDITIONS)

### Why scanning alone cannot do it, and why `include` does not help

daisyUI registers components through `addComponents`, which Tailwind v4 aliases to
`addUtilities` and registers per class candidate
(`node_modules/tailwindcss/dist/lib.mjs`):

```js
addComponents(d,f){this.addUtilities(d,f)}
...
addUtilities(d){ ... P(u,h=>{if(h.kind==="selector"&&h.value[0]==="."&&Zi.test(h.value.slice(1))){ ...
  c.get(S).push(...x) ... } ; if(h.kind==="function"&&(h.value===":not"|| ...))return V.Skip})
```

A rule is emitted only when one of its classes is a candidate. `@keyframes` is the exception:
it is pushed to the global AST unconditionally.

The daisyUI `include`/`exclude` options only filter which modules register
(`node_modules/daisyui/index.js`):

```js
const shouldIncludeItem = (name) => { if (include && exclude) { return include.includes(name) && !exclude.includes(name) }
  if (include) { return include.includes(name) } if (exclude) { return !exclude.includes(name) } return true }
```

They force nothing to compile. The precompiled `daisyui/daisyui.css` (1,136,609 bytes) and the
per-component `components/*.css` files ship every responsive variant (`.sm\:btn`, and so on), so
importing them is the heavy path.

### The mechanism that worked

The spike generated the class list from daisyUI's own component objects. `spike/classes.mjs` walks
`node_modules/daisyui/{components,utilities}/*/object.js` and extracts every class selector: 649
classes across 65 modules. The list goes in as one `@source inline("...")` in
`admin-css.input.css`. The plugin stays as `@plugin "daisyui" { themes: false; exclude: calendar; }`.

Coverage, measured: the baseline sheet contains 217 of the 649 classes. The full build contains
649/649. The no-calendar build contains 580/649, and the only missing classes belong to calendar.
Every probe class compiled: `timeline*`, `rating`/`rating-half`, `radial-progress`, `countdown`,
`alert-info`/`alert-soft`, `toggle` with all eight colors and five sizes, `btn-soft`,
`btn-neutral`, `carousel`, `fab`, and `dock`. Generating the list at build time from the installed
daisyUI (the same walk) makes it track upgrades with no hand-kept safelist.

### Size

Sizes in bytes. The shipped `dist` sheet is unminified. "Min" means `lightningcss` minify.

| Sheet | raw | raw gz -9 | raw br 11 | min | min gz | min br |
|---|---|---|---|---|---|---|
| Today (baseline) | 378,150 | 34,513 | 26,401 | 307,287 | 31,759 | 25,001 |
| Themes as daisyui/theme only | 379,802 | 34,483 | 26,389 | 308,497 | 31,806 | 25,017 |
| All components, calendar excluded | 635,668 | 57,960 | 41,162 | 506,852 | 53,015 | 39,201 |
| **Full spike** (themes + all minus calendar + sublayer) | 639,807 | 58,146 | 41,430 | 510,090 | 53,235 | 39,338 |
| All components including calendar | 907,344 | 68,497 | 46,998 | 691,191 | 62,665 | 44,738 |

In the showcase's production build, the engine sheet asset (`tag.*.css`, minified by Vite) was
531,201 bytes: 54,162 gzip and 39,747 brotli.

Which modules add the bytes (`spike/attrib.mjs`, unminified rule bytes beyond the baseline):

| Module | Added bytes |
|---|---|
| calendar | 243,525 |
| fileinput | 15,099 |
| megamenu | 14,862 |
| otp | 12,507 |
| tab | 11,755 |
| timeline | 10,057 |
| loading | 9,877 |
| menu | 9,873 |
| fab | 9,782 |

Calendar is the skins for third-party date pickers (Cally, Pikaday, react-day-picker,
vanilla-calendar). It is more than half the growth, so `exclude: calendar` is the recommended
default.

**Net cost:** the transferred sheet grows by about 1.7x, from 31.8 KB to 53.2 KB minified and
gzipped, or from 25.0 KB to 39.3 KB brotli. It loads only on `/admin/**`.

## Point 4: cairn-theme sublayer (PROVEN)

The block `@layer utilities { @layer cairn-theme { ... } }` was appended to the partial. Tailwind
passed it through, lightningcss's nesting flatten kept the nested layer, and the prefix step scoped
its rules (`:where(scope) .btn-sm { --btn-p: .875rem }`). It landed inside the single
`@layer utilities` block, after every `daisyui.*` sublayer.

Chromium computed styles (transitions off; hover via `page.hover`; active via `mouse.down`;
focus-visible via Tab; `:focus-visible`, `:hover`, and `:active` confirmed with `el.matches`):

| Element | Stock daisyUI (baseline) | With cairn-theme rule | With markup utility |
|---|---|---|---|
| `btn btn-sm` padding | 12px (`--btn-p: .75rem`) | **14px** | `px-2`: **8px** |
| `btn` font-weight | 600 | **500** | `font-semibold`: **600** |
| `btn` radius | 10px | 10px | `rounded-none`: **0px** |
| soft primary, rest bg | primary 8% over base-100, 10% edge | **primary / 0.10, transparent edge** | `bg-base-200`: **base-200** |
| soft primary, hover | solid violet `oklab(0.4836 ...)`, near-white text | **primary / 0.15**, primary text | n/a |
| soft primary, `:active` | `oklab(0.494 ...)` solid | **primary / 0.22** | n/a |
| soft primary, `:focus-visible` | solid primary, primary-content text | **primary / 0.15**, primary text | n/a |
| toggle checked (`:checked`, `[aria-checked=true]`, `:has(>input:checked)`) | base-100 track, ink knob | **neutral track, base-100 knob** in all three forms | `bg-base-200 rounded-none`: **base-200, 0px** |

The dark theme reproduces the same pattern: 14px, 500, primary tint steps of 0.10/0.15/0.22, and a
neutral track at `oklch(0.8 0.01 75)`.

**The pin is load-bearing.** `spike/pin.mjs` rendered the same sheet three ways:

| Layer-order statement | `btn-sm` padding | `btn` weight | soft primary rest bg |
|---|---|---|---|
| None (as built) | 14px | 500 | primary 10% |
| `@layer utilities.daisyui, utilities.cairn-theme;` | 14px | 500 | primary 10% |
| Reversed | **12px** | **600** | **stock** |

Emission order happens to be right today. The build should still add the pin after
`build-admin-css.mjs`'s existing `@layer properties, theme, base, components, utilities;` line.
That is a one-line change (`spike/out/build-pin.diff`), so the result never rides emission order.

## Scoping audit of the full build

`spike/scope.mjs` and `spike/scope2.mjs` compared baseline to full spike: 1,811 selectors against
4,003 with calendar, or 3,109 without it.

**Selectors not rooted at a `data-theme` selector:** exactly one in both builds,
`body:has([data-theme='cairn-admin'],[data-theme='cairn-admin-dark'])`. It is the intentional
body-margin reset, inert unless an admin root is mounted. **Verdict: sanctioned, unchanged.**

**Rooted but unprefixed `[data-theme="cairn-admin"]` / `[data-theme="cairn-admin-dark"]`.** These
are the daisyui/theme rules, 5 per theme including the `@supports` color-mix splits, now in
`@layer base`. **Verdict: intended.** They must match the wrapper. The only change is the layer
(Condition A).

**Prefixed and inert** (`:where(scope) :root...`, `:host`, `:where(:root, [data-theme])`).
**Verdict: dead, not leaking.**

- These are the same in both builds: daisyUI's `rootscrolllock` (`:root:has(.modal[open])` and the
  other modal and drawer forms), `rootcolor` (`:where(:root, [data-theme])`), `rootscrollgutter`,
  and `:root .prose` (16x), plus Tailwind's `:host`.
- The full build adds 10 `:root:has(input.theme-controller[...])` halves from the theme selectors.
- This is pre-existing and worth knowing: daisyUI's page scroll-lock under an open modal or drawer
  does not work inside the admin, because it needs `:root`.

**`@keyframes`** (13, global, identical in both builds): `aura`, `aura-glow`, `aura-glow-after`,
`dropdown`, `menu`, `progress`, `radio`, `rating`, `rotator`, `set-page-has-scroll`, `skeleton`,
`spin`, `toast`. **Verdict: unchanged.** The safelist adds no keyframes, because `addUtilities`
already emits them unconditionally. The existing risk remains: a host keyframe with the same name
resolves by cascade layer and order.

**`@property`** (51, global, identical): `--radialprogress`, `--aura-angle`, and 49 `--tw-*`.
**Verdict: unchanged.**

**`@media (prefers-color-scheme)`:** none in either build (the flags are off). **`color-scheme`:**
set only on the theme rule.

**`@layer` names are document-global.** `cairn-theme` becomes `utilities.cairn-theme` beside any
host `utilities.daisyui`. That is harmless, and the pin makes it deterministic.

**Pre-existing Tailwind/daisyUI name overlaps** compile directly into `utilities` in both builds:
`.collapse {visibility: collapse}`, `.table {display: table}`, and `.filter {filter: ...}`. Rendered,
a daisyUI `collapse` stays `visibility: visible`, and a daisyUI `filter` has `filter: none` and
`display: flex`. **Verdict: no breakage measured, unchanged.**

## Existing gates

Run against the spike state (`node spike/gen.mjs plugin-quoted 2 1`, then `npm run package`):

| Gate | Result | Needs |
|---|---|---|
| `check:custom-surface` | PASS | Passed only because the theme rules kept their nested children, so the two allowlisted root selectors survived, and because the spike wrote bare sublayer selectors, which the gate does not see. Its `SCOPED_RULE` counts every `[data-theme=`-anchored rule outside `@layer components` as unlayered. Sublayer rules written in house style (`:where([data-theme...]) .btn`) would each fail as unsanctioned. It needs a sublayer category with its own allowlist or cap. If the roots empty out completely, the two root entries leave the allowlist. |
| `check:admin-css-classes` (no-uncompiled-class) | PASS, 0 errors | Nothing. A full sheet can only help. |
| `check:invisible-craft` | **FAIL**, 1 new error | `motion-vocabulary`'s companion assertion compares the whole selector with `===` against `[data-theme='cairn-admin']` (`src/lib/audit/rules/static/motion-vocabulary.ts:204-208`). The plugin's combined selector list (`:where(scope) :root:has(...), [data-theme="cairn-admin"]`) no longer matches. It needs to match any comma-separated part. The rule ships in the public `cairn-audit`, so consumers' audits would fail until it changes. |
| `admin-css-build.test.ts` | PASS, all | Nothing required. Adding assertions for the pin statement and the `@layer base` theme placement is advisable. |
| `admin-sheet-inventory.test.ts` | **FAIL** (drift, as designed) | A snapshot regeneration as a deliberate, changelog-carried act. The inventory goes from 217 to 580 daisyUI classes. |
| `grammar-tokens`, `role-layer-contrast`, `status-chip-register-parity`, `interactive-control-edge-contrast` | PASS | Nothing, provided the `@plugin` blocks stay in the partial. |
| Component (browser) tests | not run | The tests that `?inline` the compiled dist sheet will see the idiom-rule changes. The tests that import the raw partial (`EditorToolbar.test.ts`, via `ReproContext`) lose the palette (Condition B). |

## Risks

1. **Silent value corruption in `@plugin` blocks.** Any future theme value with a top-level comma
   (a font stack, a multi-layer shadow, a transition list) is split and truncated unless it is
   quote-wrapped, and nothing errors. This needs a build assertion: equivalence of the theme's
   computed values, or a lint on unquoted top-level commas inside the `@plugin "daisyui/theme"`
   blocks.
2. **Layer demotion of the theme rule** (Condition A). Host unlayered element rules now beat the
   wrapper's `font-family`, `color-scheme`, and scrollbar settings. Keep the non-custom properties
   in the plain unlayered rule.
3. **Raw-partial consumers lose the theme** (Condition B): ReproContext, raw-importing component
   tests, and anything rendering from `src` without the compile.
4. **Sheet weight grows by about 1.7x** gzipped (about 2x with calendar). It is admin-only, but it
   is every admin page.
5. **A broad idiom rule captures daisyUI variants.** The spike's toggle rule turned
   `toggle-primary` and `toggle-success` neutral, the known M6 risk. A cairn-theme rule sits above
   every daisyUI sublayer, so each rule must exclude the color and size variants it is not meant
   to restyle, and must specify the full state set, as the soft-primary rule did.
6. **Responsive variants of daisyUI classes still do not exist for consumers.** The engine is the
   only daisyUI compiler, and the safelist lists base classes only. `md:btn-lg` or `lg:drawer-open`
   in consumer markup compiles nowhere unless the engine uses it or the safelist expands with
   variants, and each variant multiplies the size.
7. **Gate churn:** the custom-surface model, the public `cairn-audit` motion rule, and the inventory
   snapshot all change in one pass.

## Recommended shape and fallbacks

- **Point 2:** author the `--color-*`, radius, size, depth, and `--cairn-*` tokens in the two
  `@plugin "daisyui/theme"` blocks inside the partial, with comma-bearing values quote-wrapped.
  Keep the nested rules and the non-custom properties in a plain unlayered root rule. Add a build
  equivalence assertion.
  - **Fallback if the conditions are judged too costly:** keep today's hand-written roots. The
    spike shows no capability that daisyui/theme adds for cairn. The theme-controller half is
    inert under scoping, and the flags are neutralized. Its value is idiom alignment only.
- **Point 3:** generate the class list from `node_modules/daisyui/*/object.js` at build time. Feed
  it through `@source inline(...)` with `exclude: calendar`.
  - **Fallback if the size is not acceptable:** the known one, the scanned compile plus a
    documented safelist. The size table shows it can grow family by family; `timeline` alone
    costs about 10 KB raw.
- **Point 4:** adopt as specified, with the pin statement in `layerOrder`.

## Reproducing

From the worktree:

1. Run `node spike/classes.mjs`.
2. Run `node spike/gen.mjs plugin-quoted 2 1`. The modes are `keep` / `plugin-all` /
   `plugin-quoted`, then all-components `0` / `1` / `2` (`2` means no calendar), then sublayer
   `0` / `1`.
3. Apply `spike/out/build-pin.diff`.
4. Run `npm run package`.
5. Run `node spike/equiv.mjs spike/out/baseline.css <sheet> [hostCss]`, `node spike/probe.mjs
   <label>`, `node spike/pin.mjs`, `node spike/scope.mjs <sheets>`, `node spike/size.mjs
   <sheets>`, and `node spike/coverage.mjs <sheet> [components/calendar]`.

For the consumer check, run `node spike/link-showcase.mjs` and add a route. In
`examples/showcase`, run `VITE_CAIRN_E2E=1 npm run build`, then
`CAIRN_DEV_BACKEND=1 npm run preview -- --port 4391`, then `node spike/consumer.mjs`.
