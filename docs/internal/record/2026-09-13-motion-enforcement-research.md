# Motion enforcement research for cairn-audit

Date: 2026-09-13. Status: research brief, revision 2. No repo changes.
Audience: the pass that specifies and builds the motion rules in `cairn-audit`.

Input: `docs/internal/record/2026-09-13-motion-language-research.md` revision 2, sections (c), (e),
and (f). Geoff's ruling of the same day: enforcement is the critical deliverable, the rules ship as
`cairn-audit` rules a consumer runs against its own screens with no configuration, the checker must
reach motion written as Tailwind utility classes, and the audit must run over the engine's own tree
first.

The reference for cairn's motion language is IBM Carbon's **productive** motion set, with Atlassian
as the tiebreaker only where Carbon is silent. Every token line in Part 5 cites its Carbon source.
Other design systems appear in Part 4 as comparison data.

Four rules are in scope.

1. **Vocabulary.** Every duration and easing resolves to a `--cairn-dur-*` or `--cairn-ease-*` token,
   and every one of those aliases a named Carbon token.
2. **Property allowlist.** Only paint properties, transforms, and `grid-template-rows` transition. A
   named snap list never transitions, with one scoped exception for the admin shell's own offset.
3. **Modality gate.** A hover transition sits inside `@media (hover: hover)`.
4. **Reduced motion.** Under `prefers-reduced-motion: reduce`, no admin-owned rule declares a nonzero
   delay.

Everything measured below was run against this workstation's tree at `main` on 2026-09-13, with the
showcase dev server under `CAIRN_DEV_BACKEND=1` and Playwright's bundled Chromium.
Claims sourced from the web carry a URL. Claims that come from a measurement say so.

## Revision 2 (2026-09-13)

An adversarial review verified the substrate measurements and refuted the enforcement design. What
changed:

- **Rule 4 is respecified** as the CSSOM delay check alone, in the advisory tier, with the three
  measured DaisyUI offenders as fixtures. The two-pass differential is withdrawn: it has no join key
  and, as revision 1 wrote it, it convicts every element on the page.
- **Authoring the token set is now task zero**, specified against Carbon. Revision 1 wrote four rules
  against `--cairn-dur-*` and `--cairn-ease-*` tokens that do not exist anywhere in the tree.
- **The DaisyUI component-class question is written as an explicit decision** with the false-positive
  consequence of each answer.
- **The CI proposal is replaced.** The engine's tree *is* audited today, through
  `scripts/checks/check-invisible-craft.mjs`. The change is two additions to that script, not a
  second root config and a second gate.
- **A reconciliation with the shipped rules is added**: `motion-band` goes vacuous, a
  `no-preference` defect in `isReducedMotionGuarded` turns live, `isMotionProperty` needs widening,
  and the rendered rule needs its own id.
- **The join's field name is corrected** to `elementStart`, and its three blind spots are stated as
  decisions.
- **Part 4's numbers are re-fetched** and the Polaris rule names corrected. Carbon's own stylelint
  plugin is now named as the closest prior art, with its recorded gaps.
- **`@starting-style`, `allow-discrete` with a `var()` in the property slot, and `animate-*`** join
  rules 1 and 2 with the shipped examples as fixtures.
- **The delay confidence note is corrected**: the finding is reachable at rest.
- **Harness change 2 is resized** from small to the largest of the four.
- **A fourth day-one conviction is added**: `cairn-admin.css:545` fires `reduced-motion` falsely the
  moment that file joins `static.cssFiles`.
- **The recommended ruleset is rewritten against Carbon**, and rule 2 now carries the sidebar
  exception ratified in `2026-09-13-sidebar-zen-prior-art.md`.

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
(`src/lib/audit/types.ts:42`), and `CompiledSheet` exposes `has(className)`,
`mentions(className)`, and `declarations(className)`, the last returning every declaration a class
name resolves to with the rule's `selector` and its `conditions` (the enclosing at-rule preludes,
outermost first). `no-uncompiled-class` already joins markup class tokens to that index.

So the substrate for a class-aware motion rule exists today, complete, and nothing in the four
sections of the research doc that discuss static reach accounts for it.

### The class-token substrate is richer than the research doc assumed

`markup.ts` records, per class token: the class name exactly as written including variant prefixes
and bracket values, the line, the start and end offsets, and **`elementStart`** (`markup.ts:32`,
`:561`, `:570`), the offset of the element or component node that owns the attribute. `elementStart`
is the field that makes a per-element join possible: collect every token sharing an owner, and you
have the element's class list, which is what a `transition-colors` plus `duration-[250ms]` pairing
needs. Revision 1 called this field `ownerStart`; no such field exists.

Counted across `src/lib/components/*.svelte` today: `transition-colors` six times, bare `transition`
five, `transition-opacity` twice, `transition-[width]`, `transition-shadow`, `transition-all`,
`duration-[250ms]` three times, `animate-spin` three times, and one `motion-reduce:animate-none`.

### The join has three blind spots, each needing a decision

The per-element join is real, and it is not total. Each of these needs a stated answer in the spec,
because each changes what a finding means.

- **Conditional classes land on one element.** `markup.ts:459-463` returns both the consequent and
  the alternate of a ternary, and `:417-427` returns every object key regardless of condition. So
  `class={dense ? 'duration-75' : 'duration-500'}` gives the join two mutually exclusive durations
  under one `elementStart`. An existence rule does not care. A pairing rule must pick one, and cannot.
  **Decision needed:** report on every branch, or skip an element whose class list contains two
  values for the same slot.
- **The token dedup drops the second owner.** `markup.ts:566-573` keys a token by
  `start:end:value` and keeps its first owning element. A script constant
  `const CARD = 'transition-colors duration-[250ms]'` used on three elements attributes its tokens to
  element one only. Elements two and three carry no tokens from it, so an element that also writes a
  literal `duration-[300ms]` reads as a bare duration class with no transition beside it.
  **Decision needed:** keep every owner for motion tokens, or accept the false negative and say so.
- **Component boundaries split the pair.** `collect` sets `elementStart` on `Component` nodes too, so
  `<Button class="duration-[250ms]" />` where `Button` applies `transition-colors` internally splits
  the pairing across two files with no shared key. This is exactly the consumer-custom-screen case,
  and every consumer component rendered inside `CairnAdminShell` has this shape.
  **Decision needed:** the vocabulary rule's coverage claim must say that cross-component pairs are
  out of reach, rather than claiming three mechanisms already cover custom screens.

Two more honest false negatives to state rather than fix: a class arriving as a prop or an import
resolves to nothing (`markup.ts:479-483`), and a `class:` directive yields the directive name as a
token (`markup.ts:506-510`), so `CairnAdminShell.svelte:692`'s `class:lg:ml-56` puts a class into the
join that is off at render.

### How a rendered rule gets a page

`runRendered` (`src/lib/audit/rendered.ts:149-252`) drives the loop. Per configured page, per theme,
per needed interaction state, it opens a context, sets the theme cookie, opens a page, navigates,
applies the state, runs the page-identity guard, then calls each rule whose `states` include the
current state. The harness never starts a server (`rendered.ts:15-17`): `BASE_URL` (default
`http://localhost:4173`) has to answer already.

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

- `RenderedBrowser.newContext` accepts `colorScheme` and `javaScriptEnabled` only
  (`rendered/types.ts:60`). There is no `reducedMotion`, no `hasTouch`, no `isMobile`.
- `RenderedPage` exposes `goto`, `evaluate`, `keyboard.press`, `viewportSize`, `setViewportSize`,
  and `close` (`rendered/types.ts:35-43`). There is no `hover`, no `mouse`, no `emulateMedia`, and no
  CDP session.
- Nothing in the harness models a media-emulation axis. Themes are a context option the runner owns;
  states are a per-page loop the rules declare into. A reduced-motion pass or a touch pass is a third
  axis that does not exist yet.

### `signature` is not an element identity

`__cairnAudit.signature(el)` (`rendered/types.ts:195-200`) is documented as "a valid CSS selector
naming `el`: its tag, its id, and up to four of its classes." That names a *class* of elements, not
one element. Measured on `/admin/posts`: 483 elements collapse to 130 distinct signatures.
`tr.transition-colors.hover:bg-base-200/60` repeats once per row, `li.` 22 times, `a.` 11 times.
Revision 1 asserted this field "already provides" a stable per-element identity for rule 4's
differential. It does not, and that is one of the two reasons the differential is withdrawn.

### The engine's own tree is audited, and the gate is narrower than the rules need

Revision 1 said "the engine's own tree is not audited." That is wrong in substance.
`scripts/checks/check-invisible-craft.mjs:39-56` calls `runStatic` over
`['src/lib/components', 'src/lib/admin-toolkit', 'examples/showcase/src/chassis',
'examples/showcase/src/routes', 'examples/showcase/src/theme']` with
`cssFiles: ['examples/showcase/src/theme/theme.css']`, filtered by `scopeReport` to
`['gap-scale', 'token-colors', 'motion-band']`, and it is wired into CI at
`.github/workflows/test.yml:71`. `motion-band` audits the engine today.

The true, narrower statements are three:

- the `cairn-audit` **bin** is never invoked, and the repo carries no `cairn-audit.config.json`;
- `reduced-motion` is filtered out of the only run, because it is not in `RULE_IDS`;
- `src/lib/components/cairn-admin.css` is in `paletteCssFiles` (`config.ts:38`, `:182-183`) and in no
  run's `cssFiles`, so the CSS-family rules never read it.

The first run over `cairn-admin.css` convicts `EditPage.svelte:1643` (`transition-all`),
`EditPage.svelte:2047` (`transition-[width]`), `MarkdownEditor.svelte:530` (`width 200ms`), and one
more revision 1 missed: `cairn-admin.css:545` declares `.cairn-caret { transition: rotate 150ms ease }`,
and `reduced-motion.ts:107-115` matches by normalized selector-text equality while the blanket guard
at `:1115` names `[data-theme='cairn-admin'] *`. The rule fires on a declaration the blanket block
genuinely covers, which is a day-one false positive to resolve before the file joins the gate.

## Part 2: the rendered approach

### The experiment

A Playwright script drove the showcase admin at `/admin/posts` and an editor route under five
conditions: rest, a `reducedMotion: 'reduce'` context, a real `page.hover()`, a `Tab` press, and a
`hasTouch: true` mobile-sized context. It read every element's computed transition and animation
longhands, walked `document.styleSheets` collecting each rule's authored transition text with its
`@media` ancestry, and attempted media emulation over CDP. Numbers below are from that run, and an
independent reviewer reproduced five of them exactly.

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
`(hover: hover)` and 35 are `prefers-reduced-motion`. A reviewer's reproduction against the dev
server returned 2241 / 63 / 103 / 33 with the same 16 hover rules, the drift being preview build
against dev server.

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
   An arbitrary-value duration can never satisfy a token check. `duration-[var(--cairn-dur-shift)]`
   is the form that can, and it is worth compiling one before the spec commits to it.
3. The cheapest compliance path for the eleven bare Tailwind utilities in the admin is to set
   `--default-transition-duration: var(--cairn-dur-base)` and
   `--default-transition-timing-function: var(--cairn-ease-standard)` on the admin root. Every
   `transition-colors` in the tree then resolves to a token with no markup edit, and the rule reduces
   to "no `duration-*` or `ease-*` class carrying a literal". Note that today's default duration
   (`.15s`) already equals Carbon's `duration-moderate-01`, while today's default curve
   (`cubic-bezier(.4, 0, .2, 1)`) is Tailwind's own and is **not** Carbon's standard productive
   curve, so the easing half is a real change and the duration half is a rename.

### Three value shapes a naive parser misreads, all shipping today

Each of these belongs in the rules' fixture set, because each already exists in cairn's built sheet
or its markup.

- **`@starting-style` is live on one of the three headline violations.** `EditPage.svelte:1643`
  carries `starting:-translate-y-2 starting:opacity-0` beside `transition-all duration-[250ms]`, and
  `declarations('starting:-translate-y-2')` returns `conditions: ["@layer utilities",
  "@starting-style"]`, so the substrate handles the at-rule. Rule 2 errors on `all`, and the entry
  animation is why `transition-all` is there. The fix is `transition-[opacity,translate]`, and the
  spec should name it, since this is a headline conviction whose obvious remedy is not "delete the
  transition".
- **A `var()` occupies the property-name slot.** `dist/components/cairn-admin.css:162` reads
  `transition: var(--page-scroll-lock) background-color .3s ease-out`. No parser, static or CSSOM,
  can name what transitions there. The rule must recognize the shape and abstain rather than guess.
- **`allow-discrete` plus seven properties, inside the admin's own selectors.**
  `dist/components/cairn-admin.css:5243` reads
  `transition: overflow .2s allow-discrete var(--overflow-delay), content-visibility .2s allow-discrete, visibility .2s allow-discrete, min-height .2s ease-out allow-discrete, padding .1s ease-out 20ms, background-color .2s ease-out, height .2s`
  on DaisyUI's `.collapse ::details-content`, inside `(prefers-reduced-motion: no-preference)`,
  beside `interpolate-size: allow-keywords`. That one declaration trips four of rule 2's clauses at
  once: seven properties, three snap-list properties, a delay behind a `var()`, and `allow-discrete`
  keywords a naive splitter reads as property names. Revision 1's mitigation, "scope the vocabulary
  rule to the admin's own selectors", does not exclude it: the selector is
  `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) .collapse…`. These are the
  admin's own selectors.

### Animations escape the vocabulary rule as written

`animate-spin` resolves to `animation: var(--animate-spin)`, and
`dist/components/cairn-admin.css:107` sets `--animate-spin: spin 1s linear infinite`. A rule that
inspects `duration-*` and `ease-*` classes plus `transition-*` declarations sees neither the 1s nor
the `linear`. Three `animate-spin` uses ship today and would pass silently. The `animate-*` family
needs its own clause in rules 1 and 2.

### Reduced-motion emulation works, and the blanket block makes a differential impossible

`browser.newContext({ reducedMotion: 'reduce' })` flips `matchMedia('(prefers-reduced-motion: reduce)')`
to true, confirmed by measurement and documented
([Playwright](https://playwright.dev/docs/api/class-browser)).

The measured effect on the admin is the important part. At rest, 63 elements carry motion. Under
reduced motion, **433** elements do, every one reporting `transition-property: all`,
`transition-duration: 1e-05s`. That is `cairn-admin.css:1115` working exactly as designed: the
blanket `*` rule gives every element in the admin a 0.01ms transition.

Revision 1 proposed a two-pass differential over that. It cannot work, for two independent reasons.

1. **No join key.** `signature` names a class of elements, not an element (Part 1).
2. **The transform and layout clauses convict everything.** The blanket block sets
   `animation-duration`, `animation-iteration-count`, `transition-duration`, and `scroll-behavior`.
   It never touches `transition-property`, whose initial value is `all`. Under reduced motion 370 of
   433 motion-bearing elements report `transition-property: all`, so by revision 1's own predicate
   441 of 483 elements "still transition a transform property" and 415 "still transition a layout
   property." As literally specified the rule is 100% false positives. Adding a duration threshold to
   fix that makes both clauses unfireable in the other direction, because the blanket zero has
   already zeroed them. The four-way policy is not expressible as a differential against a blanket
   `transition-duration: 0.01ms !important`.

A third reason would have been the run cost. Because the emulation is a context option
(`rendered.ts:161`), the axis multiplies **contexts**: six pages by two themes by one reduced pass is
twelve new contexts and twelve new page loads, each re-running the hydration settle.

### The delay finding is reachable at rest

Revision 1's confidence note said no element carried a nonzero `transition-delay` at rest, so the
delay finding was unconfirmed. That is wrong. In a reduced context on `/admin/posts` with no
interaction, `div.drawer-side` computes `transition-delay: 0.1s, 0.1s` and two `div.modal-box`
elements compute `0s, 0s, 0.05s, 0s`. No tooltip or modal state entry is needed.

The four delay-bearing rules are all DaisyUI's, under the admin theme selector:

| Selector | Delay | Gated? |
| --- | --- | --- |
| `.drawer-side` | 0.1s | no |
| `.checkbox::before` | 0.1s (four longhands) | no |
| `.modal-box` | 50ms | no |
| `.tooltip*` | 75ms | yes, inside `(prefers-reduced-motion: no-preference)` |

These three ungated rules are rule 4's fixtures. They are also why rule 4 is advisory: every finding
is a vendor rule the consumer did not write and cairn ships no override for.

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
coarse)` true, reproduced independently. That is a one-line change to the harness's `newContext` type
and gives the modality gate a real touch pass without CDP.

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
foreign variable is a fourth value shape a naive token regex misreads.

### What a rendered rule can and cannot enforce

| Rule | Rendered verdict |
| --- | --- |
| Vocabulary | Partly. Computed styles resolve every `var()`, so only a value whitelist is possible. The CSSOM read does see `var(--cairn-dur-*)` text, and it is the only technique that reaches the CodeMirror theme and vendor CSS |
| Property allowlist | Yes, well. `transition-property` reads back as a resolved list on every element, in every state, including vendor components the static rules never see |
| Modality gate | Yes, through a second touch context, or through CDP matched-styles media arrays. Needs a new emulation axis either way |
| Reduced motion | Only as a CSSOM delay scan inside a reduced context. The differential is not expressible |

## Part 3: the static approach

### Tailwind's own scanner is available and not needed

`@tailwindcss/oxide` 4.3.3 is installed in the showcase tree and exports a single `Scanner` class,
confirmed by loading it, and 4.3.3 is npm's current `latest`. It extracts candidate strings with
Tailwind's own heuristics
([discussion](https://github.com/tailwindlabs/tailwindcss/discussions/19550)). It is the engine
package rather than a documented public API, so a dependency on it should pin an exact version.

Against cairn's own `markup.ts` it is a downgrade for this purpose. Oxide returns candidate strings
with no source position, no owner element, and no distinction between a class in an attribute and a
string that merely looks like one. `markup.ts` returns positions, owners, and a parse rather than a
heuristic. Use oxide only if the rule ever has to scan a file type the Svelte parser cannot read.

### The ESLint Tailwind plugins do not carry a motion rule

`eslint-plugin-tailwindcss` (1,163,602 weekly downloads, 2,073 stars, not archived) ships nine rules,
and the ones near this problem are `no-arbitrary-value`, `no-unnecessary-arbitrary-value`, and
`no-custom-classname` ([repo](https://github.com/francoismassart/eslint-plugin-tailwindcss)). None is
motion aware. `no-arbitrary-value` would ban `duration-[250ms]`, and it would ban every other
bracket value in the admin at the same time, which the `gap-scale` rule already shows cairn does not
want.

`eslint-plugin-better-tailwindcss` (823,546 weekly downloads, v4 native) carries
`no-restricted-classes`, which can deny a named pattern
([repo](https://github.com/schoero/eslint-plugin-better-tailwindcss)). That is the closest
off-the-shelf fit, and it is a deny list rather than a vocabulary check. It also does not ship to
consumers: a consuming site runs `cairn-audit`, not cairn's ESLint config, which is the decisive
objection to routing any of the four rules through ESLint.

### The compiled sheet maps a utility to its declarations, with one join

`CompiledSheet.declarations(className)` already returns every declaration a class resolves to,
carrying the rule's selector and its at-rule conditions. Measured behavior for the motion family
(each also carrying an `@layer utilities` condition):

| Class | Declarations it resolves to |
| --- | --- |
| `transition-colors` | `transition-property: <paint list>`, `transition-timing-function: var(--tw-ease, ...)`, `transition-duration: var(--tw-duration, ...)` |
| `transition-[width]` | `transition-property: width` plus the same two `var()` lines |
| `transition-all` | `transition-property: all` plus the same two `var()` lines |
| `duration-[250ms]` | `--tw-duration: .25s`, `transition-duration: .25s` |

So the property allowlist is answerable from one class alone, and the vocabulary check is answerable
only from the element's whole class list. The join key is `ClassToken.elementStart`.

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
| `@shopify/stylelint-polaris` | `polaris/at-rule-disallowed-list`, `polaris/global-disallowed-list` | Two **generic** rules configured for motion. `motion` is an object key grouping them in `index.js`, never a rule namespace |
| `@primer/stylelint-config` | none | Colors, spacing, overrides, unused and undefined vars |
| axe-core, Lighthouse, jsx-a11y | none | No rule for `prefers-reduced-motion` in any of them |

### How well each has worked

Weekly download counts re-fetched from the npm registry API on 2026-09-13. Revision 1's figures came
from a web research pass and were wrong in six places, most severely on
`eslint-plugin-better-tailwindcss` (22x low).

| Tool | Weekly downloads | Status |
| --- | --- | --- |
| `eslint-plugin-tailwindcss` | 1,163,602 | Active, 2,073 stars, v4 support arrived late (issue #325) |
| `eslint-plugin-better-tailwindcss` | 823,546 | Active, v4 native |
| `stylelint-declaration-strict-value` | 397,111 | Active, mostly consumed transitively inside other configs |
| `stylelint-declaration-use-variable` | 26,598 | Its own README says it is not actively maintained |
| `@shopify/stylelint-polaris` | 5,442 | Last publish 16.0.7 on 2025-03-17, roughly 18 months stale |
| `stylelint-plugin-carbon-tokens` | 2,786 | **Active.** Latest 5.0.6, registry-modified 2026-06-03. Issue #107 closed 2024-04-25 |
| `@atlaskit/stylelint-design-system` | 1,471 | Tested only to stylelint 14.6, a documented stylelint 16 incompatibility |

Two design systems publish motion tokens and enforce nothing. Material Design 3 publishes the full
duration and easing token tables and has no lint for them; a community issue states Material has no
machine-expressible motion format at all, so the enforcement is design review
([issue](https://github.com/google-labs-code/design.md/issues/47),
[M3 tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)). GitHub Primer
went further and **removed** a motion-token file from its stylelint config as unused
(PR #610, [changelog](https://github.com/primer/stylelint-config-primer/blob/master/CHANGELOG.md)),
so the one system that tried a dedicated motion rule and then dropped it is prior art against the
dedicated rule.

On the accessibility side the gap is total. axe-core has no `prefers-reduced-motion` rule, Lighthouse
inherits axe's rule set and so has none either
([scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)), and
`eslint-plugin-jsx-a11y` is JSX-attribute static analysis with no view of CSS. The published
technique for reduced motion is exactly the one this brief measured: drive the page under
`emulateMedia({ reducedMotion: 'reduce' })` and assert the behavior
([W3C C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39),
[QASkills](https://qaskills.sh/blog/accessibility-testing-reduced-motion)). Nobody ships it as a
rule. That is a real gap for cairn to fill, not a wheel to reinvent.

### Carbon's own plugin is the closest prior art

Since Carbon is cairn's reference, its enforcement is the one to read closely.
`stylelint-plugin-carbon-tokens` 5.0.6 ships `carbon/motion-duration-use` and
`carbon/motion-easing-use`, both loading the same `@carbon/motion` token set this brief's Part 5
aliases. Their shipped defaults are instructive:

```js
includeProps: ['/duration$/', 'transition', 'animation'],
acceptValues: ['/inherit|initial|none|unset/', '/^0s?$/'],
acceptCarbonCustomProp: false,
carbonPrefix: 'cds',
```

Four gaps cairn inherits if it copies the shape, each recorded in the plugin's own README and
defaults:

- **It is a stylelint plugin**, so it reads CSS and SCSS only. Motion written as a Tailwind utility
  class in markup is outside its reach, which is exactly the reach Geoff's ruling requires.
- **`acceptCarbonCustomProp` defaults to `false`**, so a codebase that writes
  `var(--cds-duration-fast-01)` must opt in before its own tokens are accepted. A token rule whose
  default rejects the token is a configuration burden cairn should not reproduce.
- **The vocabulary is a token table plus an escape list.** That is the shape Part 4's verdict below
  identifies as the one that historically rots.
- **It checks duration and easing only.** No property allowlist, no hover gate, no reduced motion.
  Rules 2, 3, and 4 have no prior art in Carbon's plugin either.

### Verdict on prior art

The approaches that have survived are narrow and generic, in that order. Polaris's motion coverage
works because it is not a motion rule at all: two generic rules, a disallowed at-rule list and a
disallowed global list, configured for motion. Atlassian's motion coverage works for the same reason,
one token-usage rule applied uniformly across every token category. The approaches that have not
survived are the ambitious ones: Primer built a motion-token file and deleted it, and Material ships
the most carefully specified motion tokens in the industry with no enforcement whatsoever. Carbon's
plugin is the exception that proves the rule, maintained and motion-specific, at 2,786 weekly
downloads and with four gaps against what cairn needs.

For cairn the reading is that a motion rule earns its keep by being a vocabulary check expressed the
same way the existing token rules are expressed, over a surface the audit already parses, and that a
rule whose implementation is a shorthand parser plus a token table plus an escape list is the shape
that historically rots. The one thing no prior art does at all is reduced motion, which is also the
one rule here that cannot be static.

## Part 5: recommended enforcement architecture

### Task zero: author the token set against Carbon

No rule below is specifiable until this exists. `grep -rn -- '--cairn-dur\|--cairn-ease' src/
dist/components/cairn-admin.css` returns nothing today: revision 1 wrote four rules against a
vocabulary nobody has authored. Task zero authors it, wires it through `@theme`, and migrates the
eleven existing utilities.

Durations, each aliasing one Carbon productive token. Values confirmed against the shipped
`@carbon/motion` package and its DTCG file
([overview](https://carbondesignsystem.com/elements/motion/overview/),
[`src/dtcg/motion.json`](https://unpkg.com/@carbon/motion@11.52.0/src/dtcg/motion.json)):

| cairn token | Carbon token | Value | Carbon's stated use |
| --- | --- | --- | --- |
| `--cairn-dur-instant` | `duration-fast-01` | 70ms | Micro-interactions such as button and toggle. Instant response to user action |
| `--cairn-dur-quick` | `duration-fast-02` | 110ms | Micro-interactions such as fade in. Subtle entrance or exit of small UI elements |
| `--cairn-dur-base` | `duration-moderate-01` | 150ms | Micro-interactions, small expansion, short distance movements. Default transition speed |
| `--cairn-dur-shift` | `duration-moderate-02` | 240ms | Expansion, system communication, toast |
| `--cairn-dur-settle` | `duration-slow-01` | 400ms | Large expansion, important system notifications |

Carbon's `duration-slow-02` (700ms) has no case in the admin and is deliberately not aliased. Adding
a sixth token later is a token change, not a rule change.

Easings, Carbon's **productive** curves only. The expressive pair is out of register for an admin.

| cairn token | Carbon token | Value | Use |
| --- | --- | --- | --- |
| `--cairn-ease-standard` | `easing.standard.productive` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | Elements moving within the viewport |
| `--cairn-ease-entrance` | `easing.entrance.productive` | `cubic-bezier(0, 0, 0.38, 0.9)` | Elements entering the screen |
| `--cairn-ease-exit` | `easing.exit.productive` | `cubic-bezier(0.2, 0, 1, 0.9)` | Elements leaving the screen |

Two Carbon rules the token set encodes rather than the rules enforcing them directly:

- **Duration follows distance.** Carbon: "the larger the change in distance (traveled) or size
  (scaling) of the element, the longer the animation takes"
  ([overview](https://carbondesignsystem.com/elements/motion/overview/)). A hover paint change takes
  `quick`; the shell's 224px offset takes `shift`.
- **Enter and exit are asymmetric.** Carbon pairs an entrance curve with an exit curve, so a surface
  leaves on `--cairn-ease-exit` and one duration band faster than it entered.

Reduced motion follows Carbon where it speaks and Atlassian where it does not. Carbon asks for
alternatives to motion without publishing a machine-checkable rule; Atlassian states the rule
outright, "when reduced motion is active, motion is off and instant"
([Atlassian motion](https://atlassian.design/foundations/motion)). cairn's blanket block at
`cairn-admin.css:1115-1124` already implements that, so the ruleset's job is the residue the blanket
block misses, which is rule 4's delays.

Task zero also decides the two theme defaults from Part 2:
`--default-transition-duration: var(--cairn-dur-base)` is a rename, and
`--default-transition-timing-function: var(--cairn-ease-standard)` is a real curve change away from
Tailwind's default.

### The DaisyUI component-class decision

Every rule's false-positive rate turns on one question the spec must answer explicitly, not in
passing. **Does a rule fire on a DaisyUI component class whose declarations come from the vendor?**

Measured: `.btn` computes `0.2s cubic-bezier(0, 0, 0.2, 1)` over
`color, background-color, border-color, box-shadow, transform` with no `transition-*` utility in the
markup at all, on 19 elements, plus 22 more on `color, background-color, box-shadow`.
`ctx.sheet.declarations('btn')` finds it. The same holds for `.modal-box`, `.drawer-side`,
`.tooltip`, and `.checkbox`.

| Answer | Consequence |
| --- | --- |
| Fire on them | `class="btn"` is a vocabulary and a duration violation on every button in the engine and in every consumer tree. Hundreds of unfixable findings on run one |
| Exempt every DaisyUI component class | Real coverage is lost. The vendor surface is where the ungated hover rules and the three delay bugs live, and rules 3 and 4 exist to reach it |
| Split by tier | Rules 1 and 2 exempt vendor component classes and run at error tier over cairn's own declarations; rules 3 and 4 read the vendor surface and run at advisory tier |

The split is the recommendation, and it needs an explicit, enumerable definition of "vendor component
class" (DaisyUI's component layer in the built sheet) so the exemption is checkable rather than a
hand-maintained list.

### Rule 1: motion-vocabulary, static, medium

Input: both CSS-family surfaces (`cssScopeRules`) and the per-element class-token join against
`ctx.sheet.declarations()`, joined on `elementStart`.

- A CSS declaration naming a duration or timing function must reference a `var(--cairn-dur-*)` or
  `var(--cairn-ease-*)` token. A literal, a bare `ease`, a bare `linear`, or a raw `cubic-bezier()`
  is an error.
- A `duration-*` or `ease-*` class whose value is not a cairn token is an error, which convicts
  `duration-[250ms]` and accepts `duration-[var(--cairn-dur-shift)]`.
- An `animate-*` class is checked through its `--animate-*` custom property, so `animate-spin`'s
  `spin 1s linear infinite` is an error on both the 1s and the `linear`. Without this clause the
  three shipped `animate-spin` uses pass silently.
- A `transition-*` class with no sibling `duration-*` or `ease-*` class is a **pass**, because it
  resolves to the theme default. That is sound only once the admin root sets the two
  `--default-transition-*` properties to cairn tokens, so the rule ships with a companion assertion
  that the built sheet does set them. Without that assertion the rule is a lie on eleven of the
  admin's declarations.
- The rule abstains, with a recorded note rather than a finding, on the three unparseable value
  shapes: a `var()` in the property slot (`cairn-admin.css:162`), a `calc()` over a foreign variable
  (the sortable-list dependency), and a shorthand carrying `allow-discrete` keywords
  (`cairn-admin.css:5243`).

Fixtures: `duration-[250ms]` on `EditPage.svelte:1643` (fails), `animate-spin` (fails),
`transition-colors` alone (passes), `duration-[var(--cairn-dur-shift)]` (passes), and each of the
three abstention shapes.

What it misses, stated rather than claimed away: the CodeMirror theme object, vendor CSS, a class
composed at runtime, and every cross-component pair (Part 1's third blind spot). Rule 4's CSSOM pass
and a unit test over the theme object cover the first two.

### Rule 2: motion-property, static, small

Same two inputs, one join, no token table.

- `transition-property` and the shorthand's property slot must name an allowlisted property.
- `all` is an error, which is the existing `motion-band` ban and reaches `transition-all`. The remedy
  on `EditPage.svelte:1643` is `transition-[opacity,translate]`, because that element's entry
  animation is driven by `@starting-style` and deleting the transition would delete the entrance.
- The snap list (`width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`,
  `font-size`) is an error, which reaches `transition-[width]` through the class join and
  `width 200ms` through the CSS path.
- More than three properties in one declaration is an error.
- The `animate-*` family is checked through its keyframes, so an animation of a snap-list property is
  the same error as a transition of one.

**The one exception: the admin shell's own offset.** The zen and sidebar decision
(`docs/internal/record/2026-09-13-sidebar-zen-prior-art.md`) transitions `margin-left` on
`CairnAdminShell`'s `.drawer-content`, at `--cairn-dur-shift` (Carbon `duration-moderate-02`, 240ms)
on `--cairn-ease-entrance`, exiting on `--cairn-ease-exit` one band faster, snapping under reduced
motion through the blanket block. The exception is an allowlist entry **scoped to that one selector
and that one property**, never a global relaxation of the snap list. Any other element transitioning
a snap-list property still fails, in the engine and on a consumer's custom screens alike. The
exception ships with a two-sided fixture: the shell's own offset passes, and a second element
transitioning `margin-left` fails.

This is the cheapest rule and the one that catches the shipped violations on day one. Build it first.

### Rule 3: motion-hover-gate, static first, rendered second, small plus medium

The static half is nearly free and follows `focus-parity`'s existing shape (59 lines): a
hand-authored `:hover` selector that declares motion, with no `(hover: hover)` in its conditions, is
an error. Tailwind's `hover:` variant is out of scope for the static half exactly as it is in
`focus-parity`, because Tailwind already compiles `hover:` to `@media (hover: hover) { &:hover }`
([Tailwind](https://tailwindcss.com/docs/hover-focus-and-other-states)), measured as 16 `(hover:
hover)` media rules in the admin's shipped sheets.

The rendered half exists to reach DaisyUI, whose ten ungated components the static rules never see.
It runs one extra context with `hasTouch: true` at 390 wide, walks the CSSOM for rules whose selector
carries `:hover` and whose conditions carry no hover feature, and reports each. Advisory tier, since
every finding is a vendor rule the consumer did not write and the remedy is an override cairn may or
may not decide to ship.

### Rule 4: motion-reduced-delay, rendered, small, advisory

Revision 1 specified a two-pass differential here. It is withdrawn for the two reasons in Part 2: no
join key, and the transform and layout clauses convict every element on the page. What replaces it is
revision 1's own fallback, and it turns out to be cheaper than revision 1 thought.

**Mechanism.** One CSSOM scan inside a `reducedMotion: 'reduce'` context, at rest, on each configured
page. Any rule whose selector is admin-owned and whose `transition-delay` or `animation-delay`
resolves nonzero is a finding. No differential, no signature join, no second capture, no new
interaction state, and no doubling of the run on any existing axis.

**Tier: advisory.** All three known offenders are DaisyUI's, and cairn ships no override for them.
Error tier would fail every consumer's first `audit:rendered` on CSS the consumer cannot edit.
Revision 1 put this at error tier while reasoning the opposite way about rule 3's identical
situation.

**Fixtures**, all three measured at rest on `/admin/posts` in a reduced context:

- `.drawer-side`, `transition-delay: 0.1s, 0.1s`, ungated
- `.checkbox::before`, `0.1s` across four longhands, ungated
- `.modal-box`, `50ms`, ungated
- and a negative fixture: `.tooltip*`, `75ms`, correctly gated inside
  `(prefers-reduced-motion: no-preference)`, must not fire

**Rule id.** Call it `motion-reduced-delay`, never `reduced-motion`. `reduced-motion` is a static
rule id, there is no duplicate-id guard across the two registries, and `suppress.ts` resolves
directives by id, so a source-positioned `cairn-audit-disable-next-line reduced-motion` would read as
covering a rendered finding it can never reach.

### Reconciling with the three shipped rules

None of this was in revision 1, and every item changes behavior the moment the motion work lands.

- **`motion-band` goes vacuous the moment rule 1 succeeds.** `motion-band.ts:18-25` finds durations
  by regex over literal numbers. Rewrite a declaration to
  `transition-duration: var(--cairn-dur-base)` and `durationsIn` returns `[]`, so the band check
  silently passes. Decide: retire it, or repoint it at the token definitions so it polices the token
  values rather than the call sites.
- **`isReducedMotionGuarded` treats `no-preference` as a guard.** `motion.ts:15` tests
  `/prefers-reduced-motion/`, which matches `(prefers-reduced-motion: no-preference)`. Two live
  consequences: `motion-band.ts:39` skips such a rule outright, so a 3000ms transition inside a
  `no-preference` block is exempt from the band; and `reduced-motion.ts:94-97` registers its selectors
  into `guardedByFile`, so a `no-preference` block *satisfies* the pairing for any identically
  selected rule. The inverse gate is the idiom a motion initiative adopts, and DaisyUI already uses it
  four times in the shipped sheet, so this latent defect turns live the moment cairn writes correct
  CSS. Fix it in the same pass.
- **`isMotionProperty` covers four properties.** `motion.ts:10` matches
  `transition|transition-duration|animation|animation-duration`, with no `transition-property`,
  `transition-timing-function`, `transition-delay`, `animation-delay`, or
  `animation-timing-function`. Rule 1's easing half and rule 4's delay half both need it widened, and
  widening it changes what `motion-band` and `reduced-motion` see. In particular `reduced-motion`
  would start convicting rules that declare only a timing function. Re-baseline both rules against
  the widened predicate before shipping.
- **Rule-id namespace.** Per rule 4 above, the rendered rule gets its own id.

### Harness changes the four rules require

1. **Small.** `RenderedBrowser.newContext` gains `reducedMotion` and `hasTouch` in the narrow type.
2. **Largest of the four, not small.** `runRendered` gains an emulation axis, declared by rules the
   way `states` is. `runRendered` (`rendered.ts:149-252`) nests pages, then themes, then one context,
   then states, then one page, and `RenderedRule.check` (`rendered/types.ts:122`) takes exactly one
   page and returns findings with no mechanism to carry state between invocations. Adding an axis
   above the context means threading a new loop level through the runner, extending the rule
   declaration surface, and paying the context multiplication: six pages by two themes by one reduced
   pass is twelve new contexts and twelve new page loads, each re-running the hydration settle. Rules
   3 and 4 both need it, so it is not optional, and it should be scoped and estimated on its own
   rather than bundled into a rule's line.
3. **Medium.** A shared CSSOM walker joins `__cairnAudit` beside `signature` and `isVisible`,
   returning each rule with its authored transition text and its conditions array. A throwaway probe
   is about forty lines; a shared one must handle `CSSNestedDeclarations`, `CSSSupportsRule`,
   `CSSContainerRule`, `CSSLayerBlockRule`, `@starting-style`, and a per-sheet `SecurityError`.
4. **Not needed.** `RenderedPage.hover`. The modality gate reads the CSSOM rather than a forced state.

### Bringing the engine's own tree under the audit

Revision 1 proposed a root `cairn-audit.config.json` plus two npm scripts. That would create a
**second, narrower** gate beside the one already running: `DEFAULT_STATIC_SCOPE` drops the three
showcase roots `check-invisible-craft.mjs` covers, the palette-file sets differ, and `motion-band`
would run twice against two different scopes. Do this instead.

**Static half, two additions to `scripts/checks/check-invisible-craft.mjs`:**

- add the new ids to `RULE_IDS`, which today reads `['gap-scale', 'token-colors', 'motion-band']`;
- add `src/lib/components/cairn-admin.css` to `CSS_FILES`, which today reads
  `['examples/showcase/src/theme/theme.css']`.

Resolve the `cairn-admin.css:545` false positive (Part 1) before the second addition lands, since
`reduced-motion` fires on a declaration the blanket block genuinely covers. The gate is already wired
into CI at `.github/workflows/test.yml:71` and already chains the package build, so no new script and
no new workflow job is needed.

**Rendered half, a choice the spec must make.** Revision 1 said `audit:rendered` can ride the
showcase e2e job's server at `localhost:4173`. It cannot.
`examples/showcase/playwright.config.ts:29-34` shows that server is Playwright's own `webServer`
(`VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173`, `env: {CAIRN_DEV_BACKEND: '1'}`),
whose lifetime is the `playwright test` process; `.github/workflows/e2e.yml:118` runs only
`npm --prefix examples/showcase run test:e2e`, and the audit harness refuses to start a server
(`rendered.ts:15-17`). Second-order: that server is built with `VITE_CAIRN_E2E=1`, so riding it would
audit an e2e-flagged build. The two real options:

| Option | Shape | Cost |
| --- | --- | --- |
| A new workflow step | Starts and holds its own `npm run preview` on a dedicated port, then runs `cairn-audit --rendered` | One more build and serve in CI; audits a clean build |
| A Playwright spec | Expresses the rendered motion rules as a spec inside the showcase's e2e suite | No new server; inherits the e2e-flagged build and the suite's own runner |

Recommendation is the workflow step, because the `VITE_CAIRN_E2E=1` build is not the build a consumer
ships and the rendered rules are the ones that read vendor CSS.

Per the gate-economy rule, the static half joins the per-task gate (it is fast and already there) and
the rendered half runs at the pass-end gate and in CI.

### How a consumer's custom screen is covered with no configuration

Three mechanisms carry, and revision 1 overstated what they cover.

- `DEFAULT_STATIC_SCOPE` includes `src/routes/admin` and `src/lib/components`, so a custom screen
  written as a route or a component under those roots is parsed with no config.
- `DEFAULT_SHEET_CANDIDATES` falls back to `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css`,
  so the class join resolves against the installed engine's sheet.
- `rendered.extraPages` is additive, so naming a custom screen never drops the core routes.

The correction: those three cover **existence**, not **pairing**. A consumer component that receives
`class="duration-[250ms]"` from a parent and applies `transition-colors` internally splits the
vocabulary pair across two files with no shared `elementStart`, and every consumer component rendered
inside `CairnAdminShell` has that shape. The motion pass documents the limit rather than claiming
coverage it does not have.

The one thing a consumer must do is name its own theme CSS file in `static.cssFiles` if it wants the
CSS-family rules to read it. That is already true of `token-colors` and the existing two motion
rules, so the motion pass documents it rather than inventing a new mechanism.

### Scale and sequencing

| Item | Input | Scale | Notes |
| --- | --- | --- | --- |
| Token set (task zero) | `@theme` plus eleven utility migrations | Medium | Blocks every rule below |
| `motion-property` | static, both surfaces | Small | Build first, catches the shipped violations; carries the shell exception |
| `motion-hover-gate`, static half | static CSS surface | Small | Mirrors `focus-parity` |
| Emulation axis (harness change 2) | `runRendered` plus the rule declaration surface | Large | Prerequisite for both rendered halves; multiplies contexts |
| `motion-vocabulary` | static, both surfaces plus a class join | Medium to large | Carries the three join blind spots, the DaisyUI decision, the `animate-*` clause, the three abstention shapes, and the `motion-band` reconciliation |
| `motion-reduced-delay` | rendered CSSOM, reduced context | Small | Advisory; three fixtures, no differential |
| `motion-hover-gate`, rendered half | rendered CSSOM, touch context | Medium | Advisory tier |
| Shipped-rule reconciliation | `motion.ts`, `motion-band.ts`, `reduced-motion.ts` | Medium | Re-baselining is the work, not the predicate change |

If the pass has to cut, cut the rendered halves. The static rules plus the token set deliver the
vocabulary and the property allowlist over the engine's own tree and every consumer screen, which is
the ruling's core. `motion-reduced-delay` is the cheapest rendered rule and the one catching a bug
known to be shipped today, so it is the last rendered thing to cut.

## Confidence notes

- Every measurement in Part 1, Part 2, and the sheet extracts in Part 3 was run on this workstation
  on 2026-09-13 against `main` and the showcase dev server. An independent reviewer reproduced five
  of them exactly, including the 63-element rest count, the CSSOM `var()` text with its condition
  arrays, the `hasTouch` hover flip, the CodeMirror sheet read, and the 433-element reduced count.
- The CDP result is negative evidence about one API on one Chromium build. It is strong enough to
  stop the spec from depending on `Emulation.setEmulatedMedia` features for hover and pointer, and it
  is not a claim about the protocol in general.
- Part 4's download counts were re-fetched from the npm registry API on 2026-09-13 and are exact, not
  approximate. The Polaris rule names, the Carbon plugin's status, and Primer's PR #610 were each
  re-verified against source.
- The delay finding **is** confirmed by measurement, at rest, with no interaction state entered. The
  three ungated offenders are named in rule 4's fixture list. Revision 1's note to the contrary is
  withdrawn.
- The Carbon token values in Part 5 come from the shipped `@carbon/motion` 11.52.0 package and its
  DTCG `motion.json`, not from a rendering of the documentation site.
