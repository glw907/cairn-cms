# Motion enforcement research for cairn-audit

Date: 2026-09-13. Status: research brief, third read. No repo changes.
Audience: the pass that specifies and builds the motion rules in `cairn-audit`.

Input: `docs/internal/record/2026-09-13-motion-language-research.md` revision 2, sections (c), (e),
and (f). Geoff's ruling of the same day: enforcement is the critical deliverable, the rules ship as
`cairn-audit` rules a consumer runs against its own screens with no configuration, the checker must
reach motion written as Tailwind utility classes, and the audit must run over the engine's own tree
first.

Four rules are in scope.

1. **Vocabulary.** Every duration and easing resolves to a `--cairn-dur-*` or `--cairn-ease-*` token.
2. **Property allowlist.** Only paint properties, transforms, and `grid-template-rows` transition. A
   named snap list never transitions.
3. **Modality gate.** A hover transition sits inside `@media (hover: hover)`.
4. **Reduced motion.** Under `prefers-reduced-motion: reduce`, delays are zero, transforms degrade to
   an opacity fade, paint transitions stay, layout snaps.

Everything measured below was run against this workstation's tree at `main` on 2026-09-13, with the
showcase dev server on port 5599 under `CAIRN_DEV_BACKEND=1` and Playwright's bundled Chromium.
Claims sourced from the web carry a URL. Claims that come from a measurement say so.

## Summary of what changed

Three findings move the spec.

- **The class-attribute scan is already built.** `src/lib/audit/markup.ts` parses every component with
  `svelte/compiler` and yields positioned class tokens from attributes, `class:` directives, template
  literals, arrays, objects, spreads, and script-level constants. A Tailwind motion rule reads
  `ctx.files[].classTokens` and gets an editable `file:line` for free. The research doc's option 1,
  "it fails on any dynamic class expression", is not true of this codebase.
- **Tailwind's `transition-*` utilities carry no duration.** Measured in the shipped sheet:
  `.transition-colors` emits `transition-duration: var(--tw-duration, var(--default-transition-duration))`.
  The number arrives from a separate `duration-*` class on the same element, or from the theme
  default, which is `0.15s` today. A vocabulary check therefore has to be per element, and the
  cheapest way to make the whole family legal is to point
  `--default-transition-duration` and `--default-transition-timing-function` at cairn tokens.
- **The CodeMirror theme is reachable from the CSSOM.** Measured on the editor page: CodeMirror's
  style-mod `<style>` element is same origin, its `cssRules` read back, and all three
  `MarkdownEditor.svelte` theme transitions appear as ordinary style rules under obfuscated class
  prefixes. No ESLint rule is needed to reach them.

## Part 1: the repo's own audit harness

### Static rules read two surfaces, and only two

`cssScopeRules` (`src/lib/audit/rules/static/css-scope.ts:33`) yields two things, confirmed by
reading the generator:

- every rule in a component's own scoped `<style>` block, positioned against the component file;
- every rule in a CSS file `config.staticCssFiles` names.

It never reads the built stylesheet, never reads `node_modules`, and never reads a class attribute.
`motion-band` and `reduced-motion` both consume it, so both see exactly those two surfaces.

The built sheet is a separate context field. `StaticRuleContext` carries `sheet: CompiledSheet`
(`src/lib/audit/types.ts`), and `CompiledSheet` exposes `has(className)`,
`mentions(className)`, and `declarations(className)`, the last returning every declaration a class
name resolves to with the rule's `selector` and its `conditions` (the enclosing at-rule preludes,
outermost first). `no-uncompiled-class` already joins markup class tokens to that index.

So the substrate for a class-aware motion rule exists today, complete, and nothing in the four
sections of the research doc that discuss static reach accounts for it.

### The class-token substrate is richer than the research doc assumed

`markup.ts` records, per class token: the class name exactly as written including variant prefixes
and bracket values, the line, the start and end offsets, and `ownerStart`, the offset of the element
or component node that owns the attribute. `ownerStart` is the field that makes a per-element join
possible: collect every token sharing an owner, and you have the element's full class list, which is
what a `transition-colors` plus `duration-[250ms]` pairing needs.

Counted across `src/lib/components/*.svelte` today: `transition-colors` six times, bare `transition`
five, `transition-opacity` twice, `transition-[width]`, `transition-shadow`, `transition-all`,
`duration-[250ms]` three times, `animate-spin` three times, and one `motion-reduce:animate-none`.

### How a rendered rule gets a page

`runRendered` (`src/lib/audit/rendered.ts`) drives the loop. Per configured page, per theme, per
needed interaction state, it opens a context, sets the theme cookie, opens a page, navigates,
applies the state, runs the page-identity guard, then calls each rule whose `states` include the
current state. The harness never starts a server: `BASE_URL` (default `http://localhost:4173`) has
to answer already.

Defaults, from `config.ts`:

| Axis | Default |
| --- | --- |
| Pages | `/admin/posts`, `/admin/pages`, `/admin/vocabulary`, `/admin/media`, `/admin/editors`, `/admin/login`, plus `rendered.extraPages` |
| Themes | `light` and `dark`, always both, never configurable |
| States | `rest`, plus any of `menu-open`, `focus-visible`, `row-expanded` a registered rule declares |

The cost model matters for the motion rules: the run is pages by themes by states, and every new
emulation axis multiplies it.

### What the harness can force today

`applyState` (`src/lib/audit/rendered/page-surface.ts`) covers three states beyond rest.

- `focus-visible` presses a real `Tab`, so `:focus-visible` matches by the browser's own heuristic
  rather than by a programmatic focus whose behavior is disputed
  ([CSSWG thread](https://lists.w3.org/Archives/Public/public-css-archive/2021Feb/0596.html)).
- `menu-open` clicks the first visible `[aria-haspopup]` trigger, which since a refinement includes
  `dialog`, so the drawer and the modal surfaces are reachable.
- `row-expanded` clicks the first visible `.toolkit-expandable-row-summary`.

A state that a page cannot reach is recorded, not swallowed.

### What the harness cannot do today

The Playwright surface is typed narrowly on purpose (`src/lib/audit/rendered/types.ts`), and the
narrowing is where the motion work lands.

- `RenderedBrowser.newContext` accepts `colorScheme` and `javaScriptEnabled` only. There is no
  `reducedMotion`, no `hasTouch`, no `isMobile`.
- `RenderedPage` exposes `goto`, `evaluate`, `keyboard.press`, `viewportSize`, `setViewportSize`,
  and `close`. There is no `hover`, no `mouse`, no `emulateMedia`, and no CDP session.
- Nothing in the harness models a media-emulation axis. Themes are a context option the runner owns;
  states are a per-page loop the rules declare into. A reduced-motion pass or a touch pass is a third
  axis that does not exist yet.

Each of these is a small, local addition to the types plus the runner loop. None is a redesign.

### The engine's own tree is not audited

Confirmed against `package.json`: no script invokes `cairn-audit`, and the repo carries no
`cairn-audit.config.json`. The default static scope (`src/routes/admin`, `src/lib/admin-toolkit`,
`src/lib/components`) would pick up the engine's components if a run happened, but
`src/lib/components/cairn-admin.css` is named only in `paletteCssFiles`, not in `staticCssFiles`, so
the CSS-family rules would still not read it. Pointing the audit at the engine is two config lines
plus a script, and the research doc's warning holds: the first run convicts
`EditPage.svelte:1643` (`transition-all`), `EditPage.svelte:2047` (`transition-[width]`), and
`MarkdownEditor.svelte:530` (`width 200ms`).

## Part 2: the rendered approach

### The experiment

A Playwright script drove the showcase admin at `/admin/posts` and an editor route under five
conditions: rest, a `reducedMotion: 'reduce'` context, a real `page.hover()`, a `Tab` press, and a
`hasTouch: true` mobile-sized context. It read every element's computed transition and animation
longhands, walked `document.styleSheets` collecting each rule's authored transition text with its
`@media` ancestry, and attempted media emulation over CDP. Numbers below are from that run.

### Computed values resolve every var(), so they cannot carry the vocabulary check

MDN defines `getComputedStyle` as returning resolved values, and for `transition-duration` and
`transition-timing-function` the resolved value is the computed value, after custom-property
substitution
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)).

Measured, at rest on `/admin/posts`: 63 elements carry motion, and every one reports a literal. A
`tr.transition-colors` reads `duration 0.15s`, `timing cubic-bezier(0.4, 0, 0.2, 1)`. A DaisyUI
`.btn` reads `0.2s`, `cubic-bezier(0, 0, 0.2, 1)`. Nothing reads `var(`.

So a rendered vocabulary check over computed styles can only compare against the token **values**,
not the token **names**. That is a weaker rule: it passes a literal `150ms` written by hand and calls
it token compliant. It is not worthless, since the value set is small and a drifted literal such as
`175ms` still fails, and it is the only technique that reaches vendor CSS. It is not the vocabulary
check the spec asks for.

### The CSSOM does carry the authored var() text and the media ancestry

Measured on the same page: three to twenty stylesheets, all same origin, zero `SecurityError`, 2257
rules walked, 70 rules carrying a transition declaration, 105 media rules, of which 16 are
`(hover: hover)` and 35 are `prefers-reduced-motion`.

Two things came back exactly as a rule would need them.

- `CSSStyleRule.style.getPropertyValue('transition-duration')` on `.transition-colors` returns the
  literal string `var(--tw-duration, var(--default-transition-duration))`. The authored text
  survives. Longhand and shorthand both read back, so a rule can take `transition` as a shorthand
  (`rotate 0.15s` on `.cairn-caret`) or the parsed longhands.
- Walking `CSSMediaRule.media.mediaText` down the tree gives a conditions array per rule, exactly the
  shape `SheetRule.conditions` already carries in the static path. The probe recovered
  `["(prefers-reduced-motion: reduce)"]` on the showcase's own guard rules and `["(hover: hover)"]`
  on the admin's guarded hover rules.

No `CSSNestedDeclarations` nodes appeared in the admin's sheets under this Chromium, so the nesting
representation caveat
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CSSNestedDeclarations)) is not live here
today. It becomes live if a future admin sheet ships nested rules, so a CSSOM walker should handle
the node type rather than assume style rules and media rules only.

### Tailwind hides the duration behind a variable, and the sheet proves it

Read from `dist/components/cairn-admin.css` at `main`:

```css
.transition-colors {
  transition-property: color, background-color, border-color, outline-color, ... ;
  transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
  transition-duration: var(--tw-duration, var(--default-transition-duration));
}
.duration-\[250ms\] {
  --tw-duration: .25s;
  transition-duration: .25s;
}
```

Line 109 and 110 of the same sheet set `--default-transition-duration: .15s` and
`--default-transition-timing-function: cubic-bezier(.4, 0, .2, 1)`. `--tw-duration` is a registered
`@property` with `syntax: "*"`.

Three consequences for the spec.

1. A `transition-*` utility alone is not a vocabulary violation or a compliance. It is a deferral.
   The verdict depends on whether a sibling `duration-*` or `ease-*` class is present, and on what
   the theme default resolves to.
2. `duration-[250ms]` compiles to `.25s`, a literal, in both the custom property and the longhand.
   An arbitrary-value duration can never satisfy a token check. `duration-[var(--cairn-dur-settle)]`
   is the form that can, and it is worth compiling one before the spec commits to it.
3. The cheapest compliance path for the eleven bare Tailwind utilities in the admin is to set
   `--default-transition-duration: var(--cairn-dur-quick)` and
   `--default-transition-timing-function: var(--cairn-ease-out)` on the admin root. Every
   `transition-colors` in the tree then resolves to a token with no markup edit, and the rule reduces
   to "no `duration-*` or `ease-*` class carrying a literal". The research doc already recommends the
   easing half of this for a different reason.

### The CodeMirror theme is reachable, which retires a recommendation

Measured on an editor route after hydration: 20 `<style>` elements, `document.adoptedStyleSheets`
empty, and the CodeMirror theme sheet readable with 229 rules. Its transition rules read back:

```
.ͼq .cm-cairn-media-placeholder-bar::-webkit-progress-value => width 200ms
.ͼq .cm-cairn-fold-btn svg => opacity 150ms, transform 150ms
.ͼq .cm-cairn-fold-flash => background-color 250ms
.ͼ1.cm-focused > .cm-scroller > .cm-cursorLayer => 1.2s steps(1) 0s infinite normal none running cm-blink
```

Those are the three declarations the research doc's section (e) said only an ESLint rule could
reach, plus a cursor-blink animation nobody has inventoried. A rendered CSSOM rule sees all four. The
selector is obfuscated by style-mod, so the finding's selector is not an editable position, which is
the same diagnostic weakness the built-sheet option carries. A co-located unit test over the theme
object is still worth having for the position, but it is a nicety now rather than the only path.

The same walk surfaced a third-party surface nobody had listed: a sortable-list dependency declaring
`box-shadow calc(var(--ssl-transition-duration) / 3 * 2)`. A duration expressed as a `calc()` over a
foreign variable is a value shape a naive token regex will misread, and it is a good argument for
scoping the vocabulary rule to the admin's own selectors rather than every rule in the document.

### Reduced-motion emulation works, and the blanket block makes the result noisy

`browser.newContext({ reducedMotion: 'reduce' })` flips `matchMedia('(prefers-reduced-motion: reduce)')`
to true, confirmed by measurement and documented
([Playwright](https://playwright.dev/docs/api/class-browser)).

The measured effect on the admin is the important part. At rest, 63 elements carry motion. Under
reduced motion, **433** elements do, every one reporting `transition-property: all`,
`transition-duration: 1e-05s`. That is `cairn-admin.css` line 1115 working exactly as designed: the
blanket `*` rule gives every element in the admin a 0.01ms transition, so "this element has a
transition" becomes true of the whole document.

A rendered reduced-motion rule therefore cannot assert absolute values. It has to compare the same
element between two passes: which properties transition at rest, and what happens to each under
reduced motion. The comparison is what expresses the four-way policy (paint stays, transform fades,
layout snaps, delays zero), and it needs a stable element identity across the two passes, which
`__cairnAudit.signature(el)` already provides.

No element on the probed pages carried a nonzero `transition-delay` at rest, so the research doc's
delay finding was neither confirmed nor refuted by this run. The delay-bearing components (tooltip,
modal box, drawer side, checkbox) all sit behind interaction states the probe did not enter. The
CSSOM read does show the delays in the authored rules, so the rendered delay check is better served
by the CSSOM walk than by computed styles.

### Hover can be forced, and modality can be emulated by one context option

Three measurements, each with a different answer.

- `page.hover()` on `tr.transition-colors` changed the computed background from `rgba(0, 0, 0, 0)` to
  `oklab(0.965 ... / 0.6)`. A real pointer move produces a real `:hover`.
- CDP `CSS.forcePseudoState` with `['hover', 'focus-visible']` also produced a hover background, with
  no pointer. And `CSS.getMatchedStylesForNode` returned each matched rule with its `media` array, so
  the modality gate is answerable per element: the two matched hover rules on that row both carried
  `media: ["(hover: hover)"]`.
- CDP `Emulation.setEmulatedMedia` with `features: [{hover: none}, {pointer: coarse}]` was **silently
  ignored**. `matchMedia('(hover: hover)')` stayed true and `(pointer: coarse)` stayed false in the
  same call where `prefers-reduced-motion: reduce` took effect. Do not build on the features array
  for hover or pointer.

The lever that does work is a plain context option: `browser.newContext({ hasTouch: true, viewport:
{ width: 390, height: 844 } })` measured `(hover: hover)` false, `(hover: none)` true, `(pointer:
coarse)` true. That is a one-line change to the harness's `newContext` type and gives the modality
gate a real touch pass without CDP.

### What a rendered rule can and cannot enforce

| Rule | Rendered verdict |
| --- | --- |
| Vocabulary | Partly. Computed styles resolve every `var()`, so only a value whitelist is possible. The CSSOM read does see `var(--cairn-dur-*)` text, and it is the only technique that reaches the CodeMirror theme and vendor CSS |
| Property allowlist | Yes, well. `transition-property` reads back as a resolved list on every element, in every state, including vendor components the static rules never see |
| Modality gate | Yes, through a second touch context, or through CDP matched-styles media arrays. Needs a new emulation axis either way |
| Reduced motion | Yes, and only rendered. It is a two-pass differential, and no static rule can express it |

## Part 3: the static approach

### Tailwind's own scanner is available and not needed

`@tailwindcss/oxide` 4.3.3 is installed in the showcase tree and exports a single `Scanner` class,
confirmed by loading it. It extracts candidate strings with Tailwind's own heuristics
([discussion](https://github.com/tailwindlabs/tailwindcss/discussions/19550)). It is the engine
package rather than a documented public API, so a dependency on it should pin an exact version.

Against cairn's own `markup.ts` it is a downgrade for this purpose. Oxide returns candidate strings
with no source position, no owner element, and no distinction between a class in an attribute and a
string that merely looks like one. `markup.ts` returns positions, owners, and a parse rather than a
heuristic. Use oxide only if the rule ever has to scan a file type the Svelte parser cannot read.

### The ESLint Tailwind plugins do not carry a motion rule

`eslint-plugin-tailwindcss` (about 1.7M weekly downloads, about 2,075 stars) ships nine rules, and
the ones near this problem are `no-arbitrary-value`, `no-unnecessary-arbitrary-value`, and
`no-custom-classname` ([repo](https://github.com/francoismassart/eslint-plugin-tailwindcss)). None is
motion aware. `no-arbitrary-value` would ban `duration-[250ms]`, and it would ban every other
bracket value in the admin at the same time, which the `gap-scale` rule already shows cairn does not
want.

`eslint-plugin-better-tailwindcss` (about 37K weekly downloads, about 820 stars, v4 supported)
carries `no-restricted-classes`, which can deny a named pattern
([repo](https://github.com/schoero/eslint-plugin-better-tailwindcss)). That is the closest
off-the-shelf fit, and it is a deny list rather than a vocabulary check. It also does not ship to
consumers: a consuming site runs `cairn-audit`, not cairn's ESLint config, which is the decisive
objection to routing any of the four rules through ESLint.

### The compiled sheet maps a utility to its declarations, with one join

`CompiledSheet.declarations(className)` already returns every declaration a class resolves to,
carrying the rule's selector and its at-rule conditions. Measured behavior for the motion family:

| Class | Declarations it resolves to |
| --- | --- |
| `transition-colors` | `transition-property: <paint list>`, `transition-timing-function: var(--tw-ease, ...)`, `transition-duration: var(--tw-duration, ...)` |
| `transition-[width]` | `transition-property: width` plus the same two `var()` lines |
| `transition-all` | `transition-property: all` plus the same two `var()` lines |
| `duration-[250ms]` | `--tw-duration: .25s`, `transition-duration: .25s` |

So the property allowlist is answerable from one class alone, and the vocabulary check is answerable
only from the element's whole class list. The join key is `ClassToken.ownerStart`.

A static check over the built sheet **without** the markup join is the weaker option the research
doc describes: it sees DaisyUI's contributions, which is real coverage, and it reports a position in
a generated file. Worth having as a separate, narrowly scoped check on the vendor surface, not as
the way the four rules are expressed.

## Part 4: prior art

### What each tool checks

| Tool | Motion rules | What it checks |
| --- | --- | --- |
| `stylelint-plugin-carbon-tokens` | `carbon/motion-duration-use`, `carbon/motion-easing-use` | Validates duration and easing declarations against `@carbon/motion` tokens, with an `acceptValues` escape list |
| `stylelint-declaration-strict-value` | none by name | Enforces that a named property carries a variable, function, or keyword rather than a literal. `expandShorthand` expands a shorthand into longhands before checking |
| `stylelint-declaration-use-variable` | none by name | Same idea for SCSS variables |
| `@atlaskit/stylelint-design-system` | none by name | One generic `ensure-design-token-usage` rule covering every token category, motion included |
| `@shopify/stylelint-polaris` | `motion/at-rule-disallowed-list`, `motion/global-disallowed-list` | Requires Polaris motion custom properties inside animation at-rules, and bans legacy motion Sass APIs |
| `@primer/stylelint-config` | none | Colors, spacing, overrides, unused and undefined vars |
| axe-core, Lighthouse, jsx-a11y | none | No rule for `prefers-reduced-motion` in any of them |

### How well each has worked

| Tool | Weekly downloads | Stars | Status |
| --- | --- | --- | --- |
| `stylelint-declaration-strict-value` | about 397,000 | not found | Active, and mostly consumed transitively inside other configs |
| `eslint-plugin-tailwindcss` | about 1,714,000 | about 2,075 | Active, v4 support arrived late (issue #325) |
| `eslint-plugin-better-tailwindcss` | about 37,000 | about 820 | Active, v4 native |
| `@shopify/stylelint-polaris` | about 5,400 | not found | Active, used by Shopify admin |
| `stylelint-plugin-carbon-tokens` | about 2,800 | not found | Maintained, lagging stylelint 16's plugin API (open issue #107) |
| `stylelint-declaration-use-variable` | about 33,000 | about 82 | Its own README says it is not actively maintained |
| `@atlaskit/stylelint-design-system` | not found | not found | Tested only to stylelint 14.6, a documented stylelint 16 incompatibility |

Two design systems publish motion tokens and enforce nothing. Material Design 3 publishes the full
duration and easing token tables and has no lint for them; a community issue states Material has no
machine-expressible motion format at all, so the enforcement is design review
([issue](https://github.com/google-labs-code/design.md/issues/47),
[M3 tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)). GitHub Primer
went further and **removed** a motion-token file from its stylelint config as unused
([changelog](https://github.com/primer/stylelint-config-primer/blob/master/CHANGELOG.md)), so the one
system that tried a dedicated motion rule and then dropped it is prior art against the dedicated
rule.

On the accessibility side the gap is total. axe-core has no `prefers-reduced-motion` rule, Lighthouse
inherits axe's rule set and so has none either
([scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)), and
`eslint-plugin-jsx-a11y` is JSX-attribute static analysis with no view of CSS. The published
technique for reduced motion is exactly the one this brief measured: drive the page under
`emulateMedia({ reducedMotion: 'reduce' })` and assert the behavior
([W3C C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39),
[QASkills](https://qaskills.sh/blog/accessibility-testing-reduced-motion)). Nobody ships it as a
rule. That is a real gap for cairn to fill, not a wheel to reinvent.

### Verdict on prior art

The approaches that have survived are narrow and generic, in that order. Polaris's two motion rules
work because each is a disallow list over a small literal surface rather than a general parser for
the `transition` shorthand, and Atlassian's motion coverage works because it is not motion coverage
at all, it is one token-usage rule applied uniformly across every token category. The approaches
that have not survived are the ambitious ones: Carbon's dedicated duration and easing plugins carry
about 2,800 weekly downloads and trail the current stylelint major, Primer built a motion-token file
and deleted it, and Material ships the most carefully specified motion tokens in the industry with no
enforcement whatsoever. For cairn the reading is that a motion rule earns its keep by being a
vocabulary check expressed the same way the existing token rules are expressed, over a surface the
audit already parses, and that a rule whose implementation is a shorthand parser plus a token table
plus an escape list is the shape that historically rots. The one thing no prior art does at all is
the reduced-motion differential, which is also the one rule here that cannot be static, so it is both
the most novel and the least de-risked piece.

## Part 5: recommended enforcement architecture

### Rule 1: motion-vocabulary, static, medium

Input: both CSS-family surfaces (`cssScopeRules`) and the per-element class-token join against
`ctx.sheet.declarations()`.

- A CSS declaration naming a duration or timing function must reference a `var(--cairn-dur-*)` or
  `var(--cairn-ease-*)` token. A literal, a bare `ease`, a bare `linear`, or a raw `cubic-bezier()`
  is an error.
- A `duration-*` or `ease-*` class whose value is not a cairn token is an error, which convicts
  `duration-[250ms]` and accepts `duration-[var(--cairn-dur-settle)]`.
- A `transition-*` class with no sibling `duration-*` or `ease-*` class is a **pass**, because it
  resolves to the theme default. That is sound only once the admin root sets the two
  `--default-transition-*` properties to cairn tokens, so the rule ships with a companion assertion
  that the built sheet does set them. Without that assertion the rule is a lie on eleven of the
  admin's declarations.

What it misses: the CodeMirror theme object, vendor CSS, and any class composed at runtime from a
value the parser cannot see. Covered by rule 4's CSSOM pass and by a unit test over the theme object.

### Rule 2: motion-property, static, small

Same two inputs, one join, no token table.

- `transition-property` and the shorthand's property slot must name an allowlisted property.
- `all` is an error, which is the existing `motion-band` ban and reaches `transition-all`.
- The snap list (`width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`,
  `font-size`) is an error, which reaches `transition-[width]` through the class join and
  `width 200ms` through the CSS path.
- More than three properties in one declaration is an error.

This is the cheapest rule and the one that catches the three shipped violations on day one. Build it
first.

### Rule 3: motion-hover-gate, static first, rendered second, small plus medium

The static half is nearly free and follows `focus-parity`'s existing shape: a hand-authored `:hover`
selector that declares motion, with no `(hover: hover)` in its conditions, is an error. Tailwind's
`hover:` variant is out of scope for the static half exactly as it is in `focus-parity`, because
Tailwind already compiles `hover:` to `@media (hover: hover) { &:hover }`
([Tailwind](https://tailwindcss.com/docs/hover-focus-and-other-states)), measured as 16 `(hover:
hover)` media rules in the admin's shipped sheets.

The rendered half exists to reach DaisyUI, whose ten ungated components the static rules never see.
It runs one extra context with `hasTouch: true` at 390 wide, walks the CSSOM for rules whose selector
carries `:hover` and whose conditions carry no hover feature, and reports each. Advisory tier at
first, since every finding is a vendor rule the consumer did not write, and the remedy is an
override cairn may or may not decide to ship.

### Rule 4: reduced-motion, rendered, large, and the risky one

This is the rule with no prior art anywhere, and it needs the harness's first emulation axis.

Mechanism: for each page, theme, and state already visited, capture a per-element motion fingerprint
keyed by `__cairnAudit.signature(el)`, then repeat the capture in a `reducedMotion: 'reduce'`
context and diff.

- Any element whose reduced pass reports a nonzero `transition-delay` or `animation-delay` is an
  error. This is the shipped bug the research doc names, and it is the finding most likely to fire on
  the first run.
- Any element transitioning a transform property at rest that still transitions it under reduced
  motion, with no opacity transition substituted, is an error.
- Any element transitioning a layout property at rest that still transitions it is an error.
- A paint transition zeroed under reduced motion is **not** a finding, because the blanket block
  zeroes every one of them by design.

Three things make it the risky one. The blanket block turns 63 motion-bearing elements into 433, so
the diff runs over the whole document rather than a handful of elements. The signature is not a
guaranteed stable identity between two page loads, so the diff needs an ordering or index fallback.
And the run cost doubles on whichever axis the emulation is added to, which is why the recommendation
is a second pass over the rest state only, not a second pass over every state.

The complementary half is cheap and should ship with it: a CSSOM scan inside the reduced context for
any admin-owned rule declaring a nonzero delay, which catches the delay class without needing an
element to be in the right state.

### Harness changes the four rules require

1. `RenderedBrowser.newContext` gains `reducedMotion` and `hasTouch` in the narrow type.
2. `runRendered` gains an emulation axis, declared by rules the way `states` is, so a run pays for a
   reduced pass only when a registered rule asks for one.
3. A shared CSSOM walker joins `__cairnAudit` beside `signature` and `isVisible`, returning each rule
   with its authored transition text and its conditions array. Every motion rule that reads
   stylesheets uses that one implementation, for the reason the helpers module already states.
4. Optionally, `RenderedPage.hover`. Not needed by any of the four rules as specified, since the
   modality gate reads the CSSOM rather than a forced state.

### Bringing the engine's own tree under the audit

Add `cairn-audit.config.json` at the repo root with two fields: `static.cssFiles` naming
`src/lib/components/cairn-admin.css`, and `rendered.extraPages` naming the editor route and the media
library, which are where most of the motion lives and which the default page list does not cover.

Add two scripts:

```
"audit": "npm run package && cairn-audit",
"audit:rendered": "cairn-audit --rendered"
```

`audit` needs the built sheet, which is why it chains `package`, the same shape
`check:invisible-craft` and `check:admin-css-classes` already use. `audit:rendered` needs a server,
and the showcase e2e job already builds and serves one at `localhost:4173` with
`CAIRN_DEV_BACKEND=1`, which mints the session directly, so no `CAIRN_AUDIT_COOKIES` is needed.
Measured: `/admin/posts` answered 200 under that env with no cookie. Ride the existing job rather
than starting a second server.

Per the gate-economy rule, `audit` joins the per-task gate (it is fast and static) and
`audit:rendered` runs at the pass-end gate and in CI.

### How a consumer's custom screen is covered with no configuration

It already is, on three separate mechanisms, and the motion rules inherit all three.

- `DEFAULT_STATIC_SCOPE` includes `src/routes/admin` and `src/lib/components`, so a custom screen
  written as a route or a component under those roots is parsed with no config.
- `DEFAULT_SHEET_CANDIDATES` falls back to `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css`,
  so the class join resolves against the installed engine's sheet.
- `rendered.extraPages` is additive, so naming a custom screen never drops the core routes.

The one thing a consumer must do is name its own theme CSS file in `static.cssFiles` if it wants the
CSS-family rules to read it. That is already true of `token-colors` and the existing two motion
rules, so the motion pass documents it rather than inventing a new mechanism.

### Scale and sequencing

| Rule | Input | Scale | Notes |
| --- | --- | --- | --- |
| `motion-property` | static, both surfaces | Small | Build first, catches the three shipped violations |
| `motion-hover-gate`, static half | static CSS surface | Small | Mirrors `focus-parity` |
| `motion-vocabulary` | static, both surfaces plus a class join | Medium | Blocked on the `--default-transition-*` decision |
| `reduced-motion` upgrade | rendered, new emulation axis | Large | The risky one |
| `motion-hover-gate`, rendered half | rendered CSSOM, touch context | Medium | Advisory tier |

The risky rule is the reduced-motion differential, for the three reasons in its own section. If the
pass has to cut, cut it to the delay check alone, which is a single CSSOM scan inside a reduced
context, catches the one bug known to be shipped today, and needs none of the diffing machinery.

## Confidence notes

- Every measurement in Part 1, Part 2, and the sheet extracts in Part 3 was run on this workstation
  on 2026-09-13 against `main` and the showcase dev server. They are reproducible from the probe
  script in this session's scratchpad.
- The CDP result is negative evidence about one API on one Chromium build. It is strong enough to
  stop the spec from depending on `Emulation.setEmulatedMedia` features for hover and pointer, and it
  is not a claim about the protocol in general.
- Part 4's download counts and issue references come from a web research pass and were not
  independently re-fetched. The two structural claims that matter, that Primer removed its motion
  token file and that axe-core carries no reduced-motion rule, should be re-verified before either is
  quoted in a shipped doc.
- No element with a nonzero `transition-delay` was reached at rest, so the research doc's
  blanket-block delay finding remains unconfirmed by measurement. Reaching it means entering the
  tooltip or modal state.
