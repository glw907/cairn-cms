# The `cairn-audit` CLI

`cairn-audit` is the design-language audit. The package ships it in its `bin` field, so an install
puts it on the project's path.

```bash
npx cairn-audit                          # run the static rules over the admin surfaces
npx cairn-audit --rendered               # run the rendered rules against a running admin
npx cairn-audit --rule motion-reduced-delay --rendered  # run only the named rule
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast  # audit the public files alone
npx cairn-audit norms <selector-or-role> # look up a measured norm
npx cairn-audit --help                   # print usage and exit
```

The static audit reads the working directory. The `norms` subcommand reads only the manifest inside
the installed package, so it needs no config, no built stylesheet, and no browser.

Pass `--rule <id>` to narrow a run to one or more registered rule ids, instead of the full static or
rendered registry. Repeat the flag for more than one id: `--rule viewport-overflow --rule
panel-width`. An id that names no registered rule exits nonzero with a message listing the known
ids, so a typo never runs a silently narrower audit than the one you asked for. `--rule` on its own,
without `--rendered`, scopes the static run the same way.

A build agent points at these mechanical checks rather than holding their formulas in working
memory. The packaged `cairn-admin-screens` skill names them by rule id and defers to the audit for
the details. [`cairn-guidance install`](./guidance.md#install) installs and freshness-checks the
skill in a consumer repo.

## What ships

`cairn-audit` ships whole, as consumer product: every registered rule, the static and rendered
rule sets alike, the norms manifest the `norms` subcommand reads, and the CLI itself. All 38
registered rules ship, and 35 of them audit the `/admin` surface. A consumer's admin IS cairn's
own admin toolkit, so conformance to cairn's design system is exactly the product being audited,
not apparatus that measures the engine from outside. The other three, `public-literals`,
`theme-conformance`, and `theme-contrast`, audit the site's public files instead: see
[The public scope](#the-public-scope).

Two things stay engine-side, both apparatus for producing the manifest the CLI ships rather than
part of the audit a consumer runs: the norms generator that renders the admin and derives the
manifest ([Regenerating the manifest](#regenerating-the-manifest)), and the probe scripts that
back a rule's own development. A module under the packed rule directories that no rule registry
reaches fails `check:package`, so the shipped rule set and the registries the tables above
document can't drift apart.

## Tiers and exit codes

Every finding carries a tier. An error-tier finding gates: it exits the command nonzero, and only a
suppression takes it out of that count. An advisory-tier finding reports and can never change the
exit code, because each advisory rule measures a compositional question a legitimately novel
component can answer differently on purpose.

| Code | What happened |
|---|---|
| 0 | No unsuppressed error-tier finding survived |
| 1 | At least one did |
| 2 | The run couldn't start or couldn't finish: a bad flag, a malformed config, no server, no browser, or the [redirect-trap refusal](#the-redirect-trap-refusal) |

Exit code 2 is never a design verdict. The audit reports it rather than printing a clean report it
can't stand behind.

## Static mode

`npx cairn-audit`, with no flags, runs the static rules over the admin surfaces in the working
directory. It parses each component with `svelte/compiler` and resolves every class token against
the built admin stylesheet, so a class written as an array, an object, a template literal, or a
`class:` directive reads the same as one written in a plain attribute, and the match is exact.
`text-base`, the size utility, and `text-base-content`, the daisyUI color utility, never read as
the same class.

The CSS-family rules read each component's own scoped `<style>` block, plus any standalone CSS file
`static.cssFiles` names.

### The static rules

Twenty-one rules run: seventeen error tier, and four advisory (`radius-scale`, `public-literals`,
`theme-conformance`, `theme-contrast`, all below). (`motion-reduced-delay`, the rendered counterpart to the two
vocabulary rules below, is advisory too; see [The rules](#the-rules) under Rendered mode.)

| ID | What it checks |
|---|---|
| `no-uncompiled-class` | Every class token a component's markup writes compiles into the built admin stylesheet, or is a name that component's own scoped `<style>` block defines. A class that reaches neither is in the author's mind and absent from what ships |
| `type-scale` | Every font size a text-sizing class token resolves to comes from a `--cairn-type-*` role. The rule reads only Tailwind's own text-sizing namespace and the `type-*` role utilities. A daisyUI component class carries its own size as part of the control's chrome, a separate system with its own `btn-sm`-style modifiers |
| `gap-scale` | An arbitrary margin, padding, or gap literal, a Tailwind bracket rather than a named step, resolves to a `--cairn-gap-*` role or lands on an exact half-step of Tailwind's spacing grid. A bracket whose value isn't a plain length, a viewport unit or a `calc()`, expresses geometry the spacing scale has no vocabulary for, so it falls outside the rule rather than failing it |
| `radius-scale` **advisory** | Every framed element's corner resolves to one of `rounded-selector`, `rounded-field`, or `rounded-box`. The rule reads `utilityBase()`, so a variant-prefixed radius (`md:rounded-lg`) is caught. It flags a bare `rounded`, a fixed size (`xs` through `4xl`), an arbitrary bracket or the `rounded-(--x)` variable shorthand, and any side or corner form of those; it passes the three role classes and their side forms, `rounded-none` and its structural zeros, and `rounded-full` except on an element that also carries `badge` (chips leave the pill). Each finding names the replacement role class the element's own daisyUI class fixes, the exact role for an arbitrary `var(--radius-<role>)` reference, or the three-role mapping otherwise. Reported at **advisory** tier until `0.99.0` promotes it to error. Coverage is class tokens only: a `border-radius` literal in a scoped `<style>` block is outside this rule's remit |
| `stock-default-hazards` | Four stock daisyUI patterns cairn's own recipes replace: `badge-ghost`, the focus-driven bare `.dropdown`, a native `disabled` on a guarded button, and a flat `base-300` card border. A fifth arm names cairn's own retired marker class, `cairn-btn-guarded`, whose reason text belongs in a `Tooltip` around the control instead: that finding is error tier, while the class itself stays compiled until a later release removes it. Three more arms, each on a `btn` element only, guard the patches cairn's own ratified button recipes replaced: an ink-opener patch (`bg-neutral` or `bg-[var(--cairn-ink-hover)]` with no `btn-neutral`, names `btn btn-neutral`), a Publish-tint patch (`bg-primary/10` with no `btn-soft`, names `btn btn-soft btn-primary`), and a `shadow-none` cancel that names nothing to add, since the theme's own depth is already zero. All three report at **advisory** tier until `0.99.0` promotes them to error; a recipe arm (ink opener or Publish tint) takes precedence over `shadow-none` on the same element, so a full retired recipe raises exactly one finding. Each finding names the refuted alternative and cites where the decision lives, eight arms total |
| `token-colors` | No raw hex, `rgb()`, or named-color literal, and no pure achromatic, a color function whose chroma or saturation is exactly zero. `transparent` and `currentColor` are excluded: neither names a color the palette could have supplied. A file listed in `static.paletteFiles` is exempt, since writing literal values down is what a palette declaration site is for |
| `grammar-boundary` | CSS never redeclares a grammar token. A site re-tunes the palette tokens freely; a grammar token names structure and holds across both themes |
| `focus-parity` | Every hand-authored `:hover` selector has a sibling selector in the same source that swaps `:hover` for `:focus-visible`, or for `:focus-within` when a container's wash acknowledges a descendant gaining focus. Tailwind's `hover:` variant classes are deliberately out of scope: their keyboard affordance is the admin's blanket focus ring, a real guarantee of a different shape |
| `motion-band` | Every transition or animation duration lands in the admin's `70ms` to `400ms` band, and `transition: all` never ships. A declaration inside a `prefers-reduced-motion: reduce` guard is exempt, since collapsing a duration toward zero is what that guard is for |
| `motion-property` | A transition or animation names only a property on the [motion allowlist](../internal/admin-design-system.md#motion), or the one frame-offset exception: an element carrying `data-cairn-motion="frame-offset"` may transition `margin-left`, one such element per screen. A named-error layout property (`width`, `margin`, and the rest) reports as a judder rather than merely outside the vocabulary. `display` and `overlay` also pass when the same transition entry carries `allow-discrete`, the CSS idiom that defers a popover or dialog's discrete top-layer exit until an accompanying paint transition finishes. The transition list splits at the top level only, so a comma inside `var()` or `cubic-bezier()` reads as a function argument rather than another transitioned property. DaisyUI's own component classes and Tailwind's `transition*` utilities are exempt on the class-join half; see [the coverage limits](#what-the-motion-rules-dont-cover) |
| `motion-vocabulary` | A transition or animation names its duration and easing with a `--cairn-dur-*` and `--cairn-ease-*` token rather than a literal value. The same DaisyUI and Tailwind exemption applies |
| `motion-hover-gate` | A hand-authored `:hover` selector that declares a transition or animation, on its own or through the rule pairing it with `:focus-visible`, sits inside `@media (hover: hover)`. It does not reach a vendor component's own `:hover` rule |
| `reduced-motion` | Every selector that declares motion is named again inside an `@media (prefers-reduced-motion: reduce)` guard in the same source |
| `stripe-trim-parity` | A striped row's `:nth-child` background pattern, or a `.table-zebra`-style class, never co-occurs with an unconditioned first/last-child padding trim on the same row class in the same source: the trim clips the stripe fill on an even-count group unless it's scoped to its own parity (`:last-child:nth-child(odd)`). Applies to any row component, not only the admin's own tables |
| `unlayered-font-clobber` | A scoped `<style>` block never declares `font-family`, `font-size`, `font-weight`, or the `font` shorthand outside an `@layer` on an element that also carries a font-affecting utility class (a `text-*` size or a `font-*` weight/family). Under the no-Preflight admin, a Svelte scoped style carries no layer of its own while Tailwind utilities sit in `@layer utilities`, so cascade layer precedence, not specificity, decides the winner; the finding names that mechanism and points at moving the typography onto the ancestor the control inherits from. Applies to any component, not only the admin's own |
| `list-role` | A `<ul>`/`<ol>`/`<menu>` carries no role attribute while its marker is suppressed: either its own classes remove it, a `list-style`/`list-style-type: none` declaration such as Tailwind's `list-none`, or an item's classes change that item's rendered display away from `list-item` to another display that still renders the item, such as `flex`, `grid`, `block`, or `inline-flex`, the way daisyUI's own `.list-row` renders `display: grid`. `display: none` (Tailwind's `hidden` and its responsive variants) is excluded: a hidden item never reaches the accessibility tree, so it cannot strip the enclosing list's implicit role. WebKit/VoiceOver stop announcing a marker-suppressed list as a list once it loses its implicit role this way; the fix is `role="list"`, plus `role="listitem"` on the item whose class caused the change (HTML-AAM's implicit `li` mapping depends on the parent relationship that change already disrupts). A list already carrying a different explicit role stays exempt: the explicit role already overrides the implicit one on purpose, so a second, conflicting role would be the wrong remedy. Coverage is own-class only: the rule resolves an element's display from classes that element itself carries, so a descendant-selector rule that reshapes an item from the *list's* own class, daisyUI's `.menu :where(li)` or breadcrumbs' `> li`, sits outside what it can see. That gap is closed by the rendered-mode `list-role` rule below, which reads each item's actual computed display in a live browser instead |
| `log-event-grammar` | A name heuristic over `<ident>.info(`, `.warn(`, `.error(` calls whose first argument is a plain string literal: the literal collides with a name `CairnLogEvent` already reserves, or its shape doesn't read as `area[.subject].verb_phrase`. It has no way to tell your own logger from `console.info` or another library's, and it never resolves a computed event name, a template literal, or a re-exported logger, since none of those carry a string literal it can read. Scans `static.sourceScope`, not `static.scope`: a log call isn't confined to an admin surface |
| `log-secret-field` | The same call heuristic, over each call's second, fields argument: a property key that whole-matches (never a substring) a member of `REDACTED_LOG_KEYS` (`@glw907/cairn-cms/log`). It can't tell your logger from `console.info` or another library's: if the call goes through a cairn `createLogger` instance the runtime already redacts that field's value, but on a bare `console` call the value ships as written. Either way this rule exists for what redaction can't reach even when it applies, the same secret's value also written directly into the message string |
| `public-literals` **advisory** | A color literal or an absolute font size in a public file, in a CSS declaration, a `style=` value (the static parts of a mixed one included), a Svelte `style:` directive, or a Tailwind arbitrary value such as `text-[#abc]` or `text-[14px]`. It reads the [public scope](#the-public-scope), never the admin surfaces. Color literals are hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`, and the named colors; `transparent`, `currentColor`, and the CSS-wide keywords are not literals, and nothing inside a quoted string or a `url()` argument is read (`content: "Issue #123"`, a quoted font family name, `fill: url(#fade)`). An absolute font size is `px`, `pt`, or `rem`, including the size inside the `font` shorthand; `em`, `%`, a keyword, and a `var()` or `calc()` over tokens pass. A custom-property definition is legal anywhere under a theme root, a component's `<style>` block included, and the root element's `font-size` is exempt, since it defines `rem` for the page. Tailwind's own utilities (`text-sm`, `bg-red-500`) are tokens a designer may choose, so it never flags them. A `<style lang="...">` block the parser can't read, such as Sass or Less, raises an "unparsed style block, not audited" finding for that file, and the rest of the run continues. It stays advisory for a consumer, since it polices your own markup |
| `theme-conformance` **advisory** | A public theme that defines everything the public stylesheets read. **Completeness:** each `@plugin "daisyui/theme"` block defines every key daisyUI's theme object carries, `color-scheme` included, except a block named after a built-in daisyUI theme (a partial block named `nord`), which daisyUI completes by merging. A hole in the default block reads as a runtime hole, and one in a secondary block as a value the default block fills. A scope with no theme block is a finding. The key list is read from `daisyui/theme/object`, and the rule fails when that list is empty or lacks `--color-base-100` or `--radius-box`. **Resolution:** a `var(--x)` with no fallback resolves to a property in the site's real [`@import` chain](#the-import-chain), a Tailwind theme variable (from Tailwind's own theme file, or the `--tw-` namespace), a key of a theme block found complete, or a custom property declared anywhere in the scanned tree (in CSS, a `<style>` block, a `style=` value, a `style:` directive, or a Tailwind arbitrary property). A `var()` with a fallback, and a name that isn't a plain custom-property identifier, are skipped. **Three more findings:** the chain never imports the engine's public stylesheet, `cairn-public.css`; a chassis file redeclares a default `cairn-public.css` sets (a stale copy of the old `tokens.css` beats the engine's layered default and cancels the derived status inks); and an `@theme` block declares a `--font-<name>` face beside a `--font-weight-<name>` weight, which Tailwind resolves to the face, so the weight utility never generates. It needs `daisyui` and `tailwindcss` installed beside the site. It is advisory on a consumer |
| `theme-contrast` **advisory** | Every text-bearing pair a public theme paints clears WCAG AA, 4.5:1, and the focus ring clears 3:1, in both sRGB and display-p3, in every scheme the theme defines. The text pairs are body text (`--color-base-content`) on `--color-base-100` and `--color-base-200`; `--color-primary` on `--color-base-100`, the link color; each role's `-content` on its own fill; `--color-muted` on `--color-base-100` and `--color-base-200`; each status ink (`--cairn-<status>-ink`) on `--color-base-100`, `--color-base-200`, and its callout tint; and each code role (`--cairn-code-ink`, `-keyword`, `-string`, `-function`, `-number`, `-comment`, `-punct`) on `--cairn-code-bg`. The non-text pair is the focus-ring color, `--color-primary`, on `--color-base-100` and `--color-base-200` at 3:1. A callout tint is the highest-percentage `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-100))` (or the same mix `in oklch`) the [`@import` chain](#the-import-chain) declares for that status. A status mix in another form, such as swapped operands or `in srgb`, keeps that status's tint pair and reports it as unmeasured. The schemes are the chain's `@plugin "daisyui/theme"` blocks, never fixed names: each block is measured as a page naming it through `data-theme`, the default block also as a page naming none on a light OS, and the `prefersdark` block also as a page naming none on a dark OS, with every `:root` rule the chain declares applied in its layer and cascade order. A block with no `name` is measured as `custom-theme`, the name daisyUI gives it. A block named after a built-in daisyUI theme takes that theme's own values where it's silent. A value the resolver can't evaluate is reported as unmeasured, never passed: see [What theme-contrast doesn't cover](#what-theme-contrast-doesnt-cover). A finding names the block and points at it. It needs `daisyui` installed beside the site. It is advisory on a consumer |

`list-role`'s two halves are complementary, not redundant: the static mode is the cheap own-class
check every run gets for free, and the rendered mode is the only one that sees a descendant-selector
change. A consumer that runs `cairn-audit` without `--rendered` gets the static half alone, so full
`list-role` coverage needs both modes run.

### The public scope

The admin rules read the admin surfaces. `public-literals`, `theme-conformance`, and
`theme-contrast` read a second scope, the public files a site ships to its visitors: the `.svelte` and `.css` files under `public.scope`, minus
`public.exclude`. The default roots are `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`,
and `src/lib/components`, with `src/routes/admin` excluded. `src/lib/components` is where a site
keeps its shared public components.

No file answers to two scopes. The public scope never claims a file under a root the admin scope
reads, whether the root comes from `static.scope` or `static.adminScope`, by default or by your
config, and never a standalone CSS file you name under `static.cssFiles`. Widening `public.scope` to
`src` or writing your own `public.exclude` therefore can't move an admin file from an error-tier
rule to the advisory public one, and `token-colors` and `public-literals` never both report the same
file. A root you name under one scope leaves the other scope's defaults: naming
`src/lib/components` under `static.scope` removes it from the public defaults, and naming an admin
default such as `src/lib/admin-toolkit` under `public.scope` removes it from the admin defaults.
An admin default that a public exclusion covers stays in the admin scope: naming
`src/routes/admin` under `public.scope` leaves your admin routes under the admin rules, since the
public scope never reads them.

A root you name under `static.adminScope` leaves the public scope too, but only the three `adminOnly`
motion rules (`motion-property`, `motion-vocabulary`, `motion-hover-gate`) scan it. The other admin
rules read `static.scope`, so name the root there as well when it holds admin screens that every
admin rule should check.

Every path you configure is normalized before it's compared: a leading `./`, a trailing `/`, and a
doubled `/` are removed, so `./src`, `src/`, and `src` name the same root and a file never lands in
two scopes through a spelling.

A default public root your tree doesn't have is skipped. A root you wrote in `public.scope` yourself
fails the run when it doesn't exist. A root you wrote in `public.scope` that is, or lies under, a
`public.exclude` path fails the run too, naming both, unless an admin root reads it, since no rule
would read its files. When a run includes a public rule and every root together
matches no file, the run fails, naming `public.scope`, so a scan that read nothing never reports a
clean tree. A run that selects no public rule, such as `--rule` naming only admin rules, never reads
the public scope and never raises that error.

#### Running the public scope alone

Name the three public rules to audit a theme without the admin surfaces:

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

A run whose selected rules are all public-scope rules needs no built admin stylesheet and no file
under the admin roots. The admin stylesheet is read only when a selected rule reads the admin scope,
so this command works on a tree where you haven't built the package's admin sheet. Plain `npx
cairn-audit` runs every static rule, the public three included, and does need the sheet. A finding
from these rules never changes the exit code, since all three are advisory on a consumer.

The roots in `public.scope` decide what the run reads, and `public.exclude` removes paths from them.
The report's scanned-file count includes every public file, so a count that doesn't rise when you add
a file means the file sits outside the roots. To confirm one file is covered, write a color literal
into it, such as `style="color: #abc"`, run the public rules, and look for a `public-literals`
finding that names the file. Remove the literal afterward. A file outside every root, or under
`src/routes/admin` or another admin root, is never read, and the run says nothing about it.

#### The import chain

`theme-conformance` and `theme-contrast` read the site's real stylesheets, not just the files that
sit in the public scope. It starts at each entry in `public.stylesheets` and follows every `@import` in order:
relative paths from the importing file, and package specifiers from the packages installed for
your site. A relative import with no extension, such as `@import "./tokens"`, reads `tokens.css`
when that file exists, the way Tailwind resolves it. A package specifier resolves the way a CSS bundler resolves it, through the package's
`exports` map under the `style` condition, then its `style` field, and to the plain file path when
the package has no `exports` field. It never uses Node's own resolution, which sends `tailwindcss`
to a JavaScript file. The rule doesn't follow `tailwindcss` itself and reads its variables from
its own theme file. The `layer()`, `source()`, and `supports()` modifiers on an `@import` are
accepted.

An entry you wrote in `public.stylesheets` yourself fails the run when it doesn't exist. The
default entry, `src/theme/theme.css`, is listed as unread when your tree doesn't have it.

An import the audit can't read is never a finding. A package that isn't installed, a subpath the
package doesn't export, and a missing file are listed at the end of the report under the Unread imports heading, so a font package you haven't installed doesn't fail a run. An import that resolves to a
file that isn't CSS is a finding, and the audit never parses the file.

`theme-conformance` resolves `daisyui` and `tailwindcss` from the audited root when it runs, and
`theme-contrast` resolves `daisyui`. When either is
missing, the run exits nonzero and names the package and the `npm install --save-dev` command. Both
are optional peer dependencies of the engine: a run that selects only admin rules doesn't need them.

The theme roots (`public.themeRoots`) are where a design value may legally be defined: a directory
or a single file, `src/theme` and the chassis `tokens.css` by default. A custom-property definition
under one is a token definition, and a literal there is the point, not a finding. The report's
scanned-file count includes the public files.

#### What theme-contrast doesn't cover

`theme-contrast` reads values, not a rendered page, so the rendered audit's `interactive-contrast`
and the page itself stay the ground truth. Its resolver has a stated bound. It follows `var()`
chains to a color literal and evaluates one `color-mix()` form: two operands, `in oklab` or
`in oklch`, and exactly one percentage, mixed in premultiplied alpha the way CSS mixes. A
translucent result is composited over its ground, and a translucent ground over `--color-base-100`.
Anything else is reported as unmeasured: a relative color (`oklch(from ...)`), `light-dark()`, a
third operand, a hue interpolation method, another mixing space, `currentColor`, and a `var()`
inside a color function.

The static cascade has limits too:

- It measures the root element only. A nested `data-theme` region recomputes a derived ink in the
  browser, and the rule doesn't measure that region.
- A media query applies when its only features are `prefers-color-scheme` tests, with or without
  the `screen` or `all` type. A `print` query never applies. A positive `@supports` applies, and
  one that starts with `not` never does.
- A nested rule resolves against the rule it sits in: `:root { @media (prefers-color-scheme: dark)
  { ... } }` and `:root { &[data-theme="x"] { ... } }` apply the way CSS nesting applies them.
- An `@import` carrying `layer()` is read as unlayered, since the loader doesn't record the
  modifier.
- A selector matches the root only when every part of it is `:root`, `html`, `:host`, `*`, a
  `data-theme` attribute test, or `:where()`, `:is()`, or `:not()` over those. A daisyUI block's
  `root` option is read the same way.
- A root custom property set anywhere else is never dropped silently. A width or container query,
  a class or another test on the root element (`:root.dark`), and a daisyUI block whose `root` is
  another element each make every pair that reads the property unmeasured, following `var()`
  chains, so an override of `--color-info` under a width query leaves the info ink's pairs
  unmeasured too.
- An operand written in sRGB (a hex value, `white`) converts into oklab through culori's matrices,
  which differ from Chromium's in the fifth significant digit. A ratio can't see a difference that
  small.

### What the motion rules don't cover

The three static motion rules read a component's own scoped `<style>` block and its class join,
and each carries a limit worth knowing before you rely on it:

- **A vendor DaisyUI class, or the six Tailwind transition utilities, is exempt on the class-join
  half.** `motion-property` and `motion-vocabulary` don't convict `.btn`, `.modal`, `.drawer`,
  `.collapse`, and DaisyUI's other component classes, or `transition`, `transition-all`,
  `transition-colors`, `transition-opacity`, `transition-shadow`, `transition-transform`, even
  where the vendor's own sheet disagrees with the language (see [the design system's eleven
  vendor disagreements](../internal/admin-design-system.md#the-daisyui-decision-eleven-vendor-disagreements)).
  An arbitrary form such as `transition-[color]` isn't exempt.
- **The frame-offset allowance only recognizes a literal attribute value.** A bound or
  interpolated `data-cairn-motion` value reads as absent and claims no allowance.
- **The allowance is one element per screen, in document order.** A screen is one component
  file; the first carrying element passes and a second is convicted.

### Suppressing a finding

A static finding sits on a source line, so it's suppressed by a comment beside it:

```svelte
<!-- cairn-audit-disable-next-line type-scale -- the K4 keming fix raised the wordmark off text-xl -->
<span class="text-[1.375rem]">Cairn</span>
```

The directive works in HTML comments in markup, and in `//` and `/* */` comments in scripts and CSS.
Three properties make it honest, and each is its own error-tier finding when it fails:

- **The reason is required.** A directive with no `-- <reason>` reports rather than suppresses.
- **A directive that silences nothing is dead** and reports. An exemption that outlives its finding
  is where the next real one hides.
- **Neither of those errors can itself be suppressed.** A build that passes by suppression has to
  read as one.

Both report under the rule id `suppression`. One exception: a file reached only through
`static.sourceScope`, the plain-text walk that `log-event-grammar` and `log-secret-field` read,
still honors a suppression directive but skips all three honesty checks, since scanning raw text
can't tell a real directive from one that appears in a string, a fixture, or a comment about the
feature itself.

The counting contract is the other half. A suppressed finding leaves the exit-code math and stays in
the report: the summary line always prints a suppression total, including when it's zero.

```text
12 files scanned, 9 rules run
0 errors, 0 advisories, 5 suppressed
```

`disable-next-line` resolves to the next syntax-tree **node**, not the next physical line, and
suppresses matching findings anywhere in that node's source range. A directive preceding a
multi-line element covers the whole element, including an attribute several lines down. In a script
or a CSS
block, where there's no template node to attach to, it resolves to the next non-blank line, extended
through a brace block when that line opens one.

A directive only suppresses the rule id it names. A mismatched id suppresses nothing and leaves both
the finding and a dead directive.

## Configuration

Everything defaults, so a project with no config file gets a meaningful run. Write
`cairn-audit.config.json` in the audited root to override, or pass `--config <path>`.

| Key | Default | What it names |
|---|---|---|
| `static.scope` | `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit` | Directories the static scan reads components from, recursively |
| `static.sourceScope` | `src` | Directories `log-event-grammar` and `log-secret-field` walk for `.ts` and `.svelte` files, read as plain text rather than parsed markup |
| `static.adminScope` | `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit` | Roots the three motion rules (`motion-property`, `motion-vocabulary`, `motion-hover-gate`) resolve over instead of `static.scope`, since they're `adminOnly`. Name your own screens here if they live outside those three defaults. A root named here leaves the public scope, and only those three rules scan it unless it's also under `static.scope` |
| `static.cssFiles` | none | Standalone CSS files the CSS-family rules also scan |
| `static.paletteFiles` | the engine's own admin stylesheet | Palette declaration sites `token-colors` skips. Name your own theme file here |
| `public.scope` | `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`, `src/lib/components` | The roots the [public scope](#the-public-scope) reads `.svelte` and `.css` files under, recursively. Naming this key replaces the defaults, and a configured root your tree doesn't have, or one a `public.exclude` path covers, fails the run |
| `public.exclude` | `src/routes/admin` | Paths the public scope never reads. A list you write merges with the default, never replaces it |
| `public.themeRoots` | `src/theme`, `src/chassis/tokens.css` | Directories or files where a design value may legally be defined. `public-literals` allows a custom-property definition under one |
| `public.stylesheets` | `src/theme/theme.css` | The entry stylesheets whose [`@import` chain](#the-import-chain) is the site's real chain. `theme-conformance` and `theme-contrast` read it. Name a second entry to audit an overlay layered after the theme. A configured entry your tree doesn't have fails the run |
| `sheet` | the built admin stylesheet, in your tree or your installed package | One or more compiled-class sources the `no-uncompiled-class` rule resolves class tokens against, same shape as `static.paletteFiles`. A string still works as a single source. A site with its own compiled stylesheet lists it alongside the packaged one: `"sheet": ["dist/site.css", "node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css"]` |
| `rendered.pages` | the core admin routes | The pages rendered mode visits. Naming this key replaces the default list |
| `rendered.extraPages` | none | Pages rendered mode visits IN ADDITION to `rendered.pages` (or, absent that key, the core admin routes). Name your own screen here rather than restating the six core routes beside it |
| `rendered.allowlist` | none | Rendered-mode exemptions. See [The allowlist](#the-allowlist) |

A default scan path your tree doesn't have is skipped, since the defaults span a library and a
consumer site. A path you wrote in `static.scope` yourself fails the run when it doesn't exist: a
typo that quietly narrows the audit to nothing is the silent green this engine exists to rule out.
A root you name explicitly under `static.scope` is an admin root, and the audit treats it as one
wherever another scope's defaults would also reach it. If your own tree still keeps a directory
named `src/lib/components` (its own convention, from before this engine's admin barrel moved to
`src/lib/admin`) and you want it back under the static scan, set `static.scope` to the default
roots your tree has plus that directory, for example
`["src/routes/admin", "src/lib/components"]`, rather than naming `src/lib/components` alone:
`static.scope` replaces the defaults outright, so the bare form would silently drop
`src/routes/admin` from every static rule.
`static.sourceScope` carries the same rule.

`sheet` behaves the same way from the other side: leave it unset and the run resolves it to a
candidate on its own (your tree's own build, then the installed package), while naming a path
yourself and getting it wrong fails the run, naming that path, rather than falling back silently.

A site's `src/admin.css` used to scan the engine's `dist` directory with its own `@source` line.
It now imports `@glw907/cairn-cms/admin-sources.css`, the engine's own Tailwind `@source`
manifest, after the site's own admin-routes `@source` line. That ordering places the engine's
utilities later in Tailwind's own generation order and makes the compiled sheet a superset of the
engine's utility set, so the engine's own responsive variants still beat the site's later-loading
base utilities inside the shared `utilities` cascade layer. The `sheet` entry described above is a
different artifact, the precompiled admin stylesheet. This import does not replace it.

## Rendered mode

Rendered mode checks the admin as it actually renders: computed contrast, computed touch-target
size, and the other measurements a source-only static rule can't reach.

Start the site first. The harness never starts a server. It reads `BASE_URL` (default
`http://localhost:4173`) and fails naming the URL it tried when nothing answers there, the same
contract the norms generator follows. Playwright loads as a dynamic import from the consuming
project's own install, printing `npm i -D playwright && npx playwright install chromium` when it is
absent, so a project that never runs rendered mode takes no browser dependency.

```bash
npm run build && npm run preview -- --port 4173   # in another shell
npx cairn-audit --rendered
```

Every configured page renders under both themes, always: a rule that only holds in one color scheme
is exactly the failure mode this exists to catch. The page list defaults to the core admin routes
and is overridable in `cairn-audit.config.json`'s `rendered.pages`. A rendered rule can also declare
an interaction state beyond a page's rest render, an open menu or a keyboard focus-visible pass, so
it only pays for the capture it actually reads from.

The run fails rather than reporting clean on every shape of silent green: no rules registered, no
pages configured, `BASE_URL` not answering, Playwright absent, or any configured page rendering
outside 2xx, which also catches a page path that names no route.

### The post-hydration page-identity guard

The runner checks every page once, after its own hydration settles, against the identity its
server-rendered response carried: the document title, and a signature of its `<main>`/`[role="main"]`
landmark plus that landmark's first heading, captured from a dedicated no-JavaScript context so the
baseline is genuinely what the server sent. Take a page whose settled DOM no longer matches: the run
navigated to `/admin/edit/some-post` and the DOM that settled belongs to an unrelated 404 or a
different route entirely. The runner reports that page unmeasurable rather than auditing it under
the wrong page's identity: a `rendered.page-identity-mismatch` finding names the route and both
identities, and no rule runs against that page in that theme. This is a harness finding, not a rule
finding, and it gates the exit code at error tier, the same way a stale allowlist entry does: a
route that hydrates into the wrong chrome is a defect worth fixing, not a compositional judgment
call.

The mechanism reads only `<title>`, `<main>`, and `[role="main"]`, none of them cairn-only markup,
so a consumer's own custom route and cairn's shell-less login page (which renders no `<main>` at
all) both stay auditable: a landmark of `null` on both the SSR and the hydrated side counts as
agreement, not as evidence of a swap.

### Auditing an authenticated admin

The admin routes rendered mode visits by default assume an unauthenticated request. Auditing a
consumer's authenticated admin, for example against a local `wrangler dev` carrying a real session,
needs a session cookie in the request. Set `CAIRN_AUDIT_COOKIES` for that, the run-specific
credential belonging in the environment rather than the config file, the same reasoning `BASE_URL`
follows:

```bash
CAIRN_AUDIT_COOKIES='cairn_session=<id>' npx cairn-audit --rendered
```

The value is Cookie-header syntax: `name=value` entries separated by a semicolon. The harness adds
every entry it parses to each browser context alongside the theme cookie. Two things throw rather
than degrading the run silently: an entry with no `=`, or an empty name, since a typo here should never
produce a quietly narrower audit; and an entry named `cairn-admin-theme`, since the run owns that
cookie itself, one per browser context, and a caller override would invalidate the per-theme
measurement.

### The redirect-trap refusal

Without a session cookie, every authenticated admin route server-redirects to the sign-in card
before a rule ever runs, and the redirect happens before hydration. The preceding post-hydration
page-identity guard compares the server-rendered and the hydrated capture, finds them in
agreement, since both are the login card, and never fires. Left unchecked, the run would measure
the same sign-in card once per configured page and report zero errors, a silent green.

The harness refuses instead. Suppose `/admin/login` is itself one of the configured pages, and
every other configured page's server response also carries the login page's own title and
landmark. The run then throws and exits 2 rather than reporting clean, naming
`CAIRN_AUDIT_COOKIES` in the message. Set the cookie, per
[Auditing an authenticated admin](#auditing-an-authenticated-admin), and re-run.

### The rules

Seventeen rules run. The first seven are error tier and exit the command nonzero.

| ID | What it checks |
|---|---|
| `one-filled-action` | At most one accent-filled control per surface. A surface is the topmost open layer, a dialog winning over the page beneath it, partitioned further by `<nav>` and `<aside>`. `<header>`, `<footer>`, and `<main>` itself don't partition: a DOM boundary between a page header and the card beneath it removes none of the harm the rule exists to catch, same visual column, same first look, where a nav rail's persistent chrome genuinely reads as a different part of the screen. "Filled" means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name |
| `focus-renders` | Every tab stop renders a focus indicator. The rule tabs through the whole page and compares each stop's focused paint against that same element's resting paint, so a real outline, a `box-shadow` ring, and a ring an ancestor renders through `:focus-within` all count, and a decorative shadow the element already carries doesn't |
| `interactive-contrast` | Interactive text reads against its own composited background at a ratio of at least 1.5. This isn't a legibility floor. The bar is that a control isn't camouflaged against its own ground. Both the ink and the ground carry every `opacity` in the chain, so a dimmed wrapper lowers the measurement rather than raising it. Disabled controls are exempt |
| `touch-targets` | Every tap target renders at least 24x24 CSS px at a 390px viewport. This is a house floor derived from WCAG 2.2 level AA's success criterion 2.5.8, Target Size (Minimum), and not an implementation of it: the rule enforces a strict superset, so a finding is a house-bar failure and not on its own an AA failure. See [What `touch-targets` doesn't cover](#what-touch-targets-doesnt-cover). The measurement is the activation region rather than the painted box: the control's own box, unioned with a qualifying `::before` inset expansion, plus every label the platform reports as activating the control. A control passes when any one of its regions clears the floor |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 and at 320. Both an element whose own box clears the viewport and an element whose content, an unbreakable string or a bleeding pseudo-element, is wider than its box and ends past the viewport's right edge. Each resize waits for a stable layout first: the document's `scrollWidth` and `clientWidth` must agree on two consecutive frames with no finite transition still running, within 500ms. A layout that never settles is measured anyway, and each finding from that read says so |
| `panel-width` | An ExpandableRow summary row or expanded panel doesn't clip its own content at 390 or 320, the hole `viewport-overflow` declines on purpose: that rule's own document-scroll gate reads clean when a table wrapper absorbs a wide row by scrolling, and its scroll-container skip exempts everything under any non-`visible` ancestor, whether or not that ancestor actually offers a scrollbar. Runs under two interaction states, `rest` and `row-expanded`: ExpandableRow only renders its panel row while expanded, so the harness clicks the first summary trigger it finds before measuring the panel half, the same way `viewport-overflow` opens a menu before it measures one; a page with no ExpandableRow can't reach `row-expanded`, which the harness records rather than silently measuring as `rest`. A row or panel is flagged only when some element inside it overflows its own box while no ancestor between it and the table wrapper is genuinely reachable, styled `overflow-x: auto`/`scroll` and currently overflowing; an `overflow-x: hidden` ancestor never counts, and neither does an `auto` one that never actually grows past its own width. The same test exempts a deliberately scrollable AdminTable (the wrap itself scrolls) and a deliberately scrollable descendant living inside the panel. Also exempt: a native `input`/`textarea` (the UA scrolls its own value internally, invisible to the computed-style test). A `select` isn't in that exemption, since it carries no caret and doesn't scroll its own displayed value, and the `scrollWidth`/`clientWidth` measurement this rule runs on otherwise only sees the overflow a `select[multiple]` listbox lays out as real child boxes; a closed single-value `select`'s truncated label never grows its own `scrollWidth` in Chromium no matter how clipped it is, so that shape gets its own painted-text measurement instead, the same paint-not-parse approach the color rules take: the selected option's own text, painted on a canvas with the select's own computed font, against the box's own available width (its `clientWidth` less its own horizontal padding, so a themed select's arrow allowance is already accounted for). An element carrying `text-overflow: ellipsis` with a clipping `overflow-x` is exempt too (the house truncation idiom). That exemption is a design-language call, not an accessibility clearance: it reads as safe only when the full value is reachable elsewhere (a `title` attribute, an expanded detail view), since at the 320 reflow floor a silently truncated value with no such fallback is still a defect |
| `list-role` | The rendered counterpart to the preceding static `list-role` rule, closing the gap that rule's own coverage note names: a descendant selector scoped to the LIST's own class, daisyUI's `.menu :where(li)` or breadcrumbs' `> li`, rather than the item's own. This rule reads each item's actual computed `display` in a live browser instead of a class-token lookup, so it catches the item regardless of which selector produced the change; the message names the descendant selector as the likely, not the asserted, cause, since the check measures only the computed value. A list already carrying an explicit role is exempt, the same carve-out the static rule gives it, and a changed item that itself already carries an explicit role, a menu-divider's `role="separator"`, is never recommended `role="listitem"`. Findings recommend `role="listitem"` on each affected item alongside `role="list"` on the list: HTML-AAM maps a bare `li` to role listitem by its parent relationship, which the display change already disrupts, so the explicit role is a defensive fix rather than reliance on that mapping alone. Runs under two interaction states, `rest` and `menu-open`, so it reaches the admin's dialog- and popover-only lists (DeleteDialog, EntryPicker, ComponentInsertDialog, the command palette's results); the check stays data-dependent even there, since an empty list reads clean regardless of what its CSS would do to a populated one |

The other ten are advisory. They report and never change the exit code, because each one measures a
compositional question that a legitimately novel component can answer differently on purpose.

| ID | What it checks |
|---|---|
| `chip-ground-collision` | A chip's own painted fill reads against the ground behind it at a ratio of at least 1.5, the same floor `interactive-contrast` applies and for the same reason, and also at a chroma-plane distance the rule can see: two colors that differ mainly in hue rather than luminance no longer collide merely for measuring close on the ratio alone. Neither rule is a contrast standard; the bar is that the chip isn't camouflaged. At 1.5:1 two surfaces aren't distinct, only not identical. The rule proves neither the chip's own label contrast nor its status cue. A chip is daisyUI's `.badge` or any element that renders as one, and a chip with no fill of its own, the `badge-outline` recipe, is exempt. Where an element outside the chip's own ancestors paints the ground behind it, an overlay chip on a sibling image, the rule reports an advisory naming the ground it couldn't read rather than an error claiming a collision. That painter test is a bounding-box intersection with no paint-order reading, and daisyUI paints a background-image on every `.btn`, so a chip overlapping a button downgrades the same way. **Stays advisory**: the chroma term closes one known false-positive class, a hue-distinct chip whose luminance sits close to its ground (a purple-tinted chip against a neutral row). A second known false-positive class, a near-neutral pill in dark theme reading bounded despite a low ratio, carries no hue for the chroma term to see and still reports. The chroma term also models trichromat perception only, so a red/green color-vision-deficient viewer can still read a collision the term calls hue-distinct, and its own floor sits inside a band no measured pair has sampled, a provisional pick rather than a value pinned by evidence on both sides. Promotion to error tier waits on closing all three gaps |
| `border-contrast` | A rendered border reads at 3:1 against at least one of the two surfaces it separates. The number is the floor WCAG 1.4.11 sets for a control-identifying boundary, applied here to every rendered border as a house bar: the criterion reaches user interface components and graphical objects, so a finding on a card hairline or a row divider is a design observation and not a conformance failure. Adjacency is measured by hit-testing the pixel beyond each edge, not by walking the DOM, so an overlaid badge is judged against what it sits on. The stroke composites over the element's own fill first, which is where `background-clip: border-box` paints it. Where an ancestor dims the element with `opacity`, the geometric sample already carries that dimming, so the rule reports that it couldn't measure rather than a ratio it can't stand behind |
| `weight-budget` | At most two distinct font-weights per content region. A region is the body text inside `<main>`, or inside an open dialog layer, split at each visible heading, with chrome removed. Chrome is text inside `<nav>` or `[role="navigation"]`; `<button>`, `[role="button"]`, or `<summary>`; a `<header>` or `[role="banner"]` that contains the heading it introduces; and `<thead>` or `[role="columnheader"]`. Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a rewritten component stays covered. A heading's own weight never spends the budget of the region it opens. Weights count on the hundreds ladder, so a variable-font ramp reads as one weight. Two limits follow from naming shapes rather than components: `PageHeader`'s caller-authored action slot renders inside the same `<header>` as the heading, so whatever a caller puts there is exempt, and a component's own non-chrome parts still spend the budget, such as `Pagination`'s item-range line and rows-per-page label, which sit outside its `<nav>` |
| `norms-bands` | A component's control heights, paddings, padding-to-type ratios, radii, and border treatments against the bands the [norms manifest](#the-norms-query) observed. An entry the manifest flags `open-question` or `ratified-drift` is treated as unbanded: a number that is not settled ground truth is not a reference to measure against |
| `screen-anatomy` | An office screen carries one `<h1>` inside PageHeader's `<header>`, renders a `.card-shell` region, and keeps its accent- and ink-filled actions in the header slot or inside the card. Desk routes are exempt, read from the drawer class the admin shell projects at SSR rather than from path depth |
| `relational-spacing` | The `--cairn-gap-*` scale matches the relationship the markup renders: a nested rhythm never opens wider than the rhythm containing it (per axis), a label sits the gap-label distance above its control, and same-level siblings sit at one gap |
| `form-font-parity` | Every rendered `input`, `select`, `textarea`, and `button` inside the theme root's own subtree computes the same first `font-family` as that root. String equality on the first family, so a control either loaded the reset or it didn't; this is the UA reset layer's own regression tripwire, catching a consumer whose sheet never reached the page. Scoped to the `[data-theme='cairn-admin']`/`[data-theme='cairn-admin-dark']` subtree (falling back to `body`, then the document root, on a page with no theme wrapper), so a control outside the admin theme is never compared against a face it never inherited. A control that opts into its own face on purpose is exempt: `font-mono`, `font-serif`, `font-sans`, an arbitrary `font-[family-name:...]` class, or Tailwind 4's `font-(family-name:--x)` shorthand, any of them with or without a variant prefix (`md:font-mono`). A finding may still be an exemption miss for a font utility the net doesn't yet recognize; the message says so and names the allowlist as the escape hatch. **Registered provisionally at advisory**: the intended tier is error, promoted only once a CI re-check confirms the rendered suite is green against cairn's own admin and showcase on the CI runner |
| `field-edge-alignment` | Within a grid or flex-column container, two or more form controls (`.input`/`.select`/`.textarea`) rendering in the same visual column must share a left edge within 1.5px. The staircase detector: an `inline`-register field whose label width varies row to row pushes its control's left edge with it, a shape a consumer's own corpus surfaced at a 1440px viewport. Advisory, since "same column" is read from rendered geometry rather than a DOM contract, a heuristic over arbitrary layouts |
| `container-inset-asymmetry` | A `.card-shell`, `.list`, or `.modal-box` container whose rendered content sits more than 24px closer to one side than the other. The phantom-gutter detector, catching a one-sided padding or margin utility and, the case a consumer's corpus actually surfaced, an unreset user-agent default: a bare `<ul class="list">` keeping the 40px bullet indent read as a 40px left inset against a 0px right one. Advisory: the threshold is judged, and a deliberately asymmetric layout is a real composition this rule can't tell from a defect |
| `motion-reduced-delay` | Under a reduced-motion emulation, no admin-owned selector computes a nonzero `transition-delay` or `animation-delay`. A delay that survives reduced motion makes an interface merely late rather than either moving or snapping. Advisory because the harness's element-to-element differential carries no join key across the emulation axis: `signature(el)` names a class of elements rather than one element, so a finding names the class and the page rather than a single offending line |

Every rule that compares two colors resolves them by painting each one on a canvas in the page and
reading the sRGB bytes back, rather than parsing color syntax. A themed admin computes to whatever
color space its palette is authored in, and cairn's own is `oklch` end to end, so a parser is the
one component in this pipeline guaranteed to be wrong about a real value.

Where a rule can't make its measurement, a gradient with no color under it leaves no single ground
to compare against, it reports an advisory finding naming what it couldn't read. That's deliberately
not silence: a check that skips itself is the failure mode the audit exists to rule out.

### What the rules don't cover

`cairn-audit` is a design-language audit, not an accessibility conformance tool. Two rules borrow a
number from WCAG, and neither implements the criterion it borrows from. A green run means these
seventeen questions came back clean. It isn't an accessibility result.

Nothing here checks:

- **1.4.3 Contrast (Minimum)**, the text legibility criterion, at 4.5:1 for normal text and 3:1 for
  large. `interactive-contrast` sits where a reader expects it, measuring a control's own `color`
  against its ground, and its floor is 1.5. No rule in the engine measures 1.4.3 at any ratio.
- **1.4.1 Use of Color**, where hue alone carries meaning with no text or shape backup.
- **2.4.11 Focus Not Obscured** and **2.4.13 Focus Appearance**. `focus-renders` proves an indicator
  exists and changes the paint; it measures neither its size, its contrast, nor whether something
  else covers it.
- **2.5.8's other four exceptions**. See below.

Run an accessibility tool for those. axe-core, Lighthouse, and Pa11y all cover the preceding
criteria, and none of them knows anything about cairn's design language, which is why a build wants
both.

### What `touch-targets` doesn't cover

`touch-targets` enforces a strict superset of SC 2.5.8, so it flags targets that conform to the
criterion. Four of its five exceptions aren't evaluated:

- **Spacing.** An undersized target is exempt when a 24px-diameter circle centered on it intersects
  no other target's circle. This is the one most admin toolbars pass on, and it's the largest gap:
  on cairn's own admin, 8 of the 10 errors this rule raises clear it.
- **Equivalent.** The rule applies a narrowed form of this one rather than omitting it. A label the
  platform reports as activating the control, but which doesn't touch it, counts as its own region,
  so a 20x20 checkbox with a large label elsewhere passes.
- **User agent control** and **Essential.**

Three more bounds, all stated rather than closed:

- The rule samples one viewport, 390px wide. The criterion carries no viewport qualifier, so a
  control that renders 24px tall at 390 and 20px at 320 is never measured.
- The target net is `a, button, [role="button"], input, select, summary`. A `textarea`, an `<area>`,
  a widget role such as `[role="tab"]` on a `<div>`, and a custom control carrying `tabindex` plus a
  pointer handler are all outside it.
- Findings collapse per selector signature at the smallest measured height, so twenty undersized
  rows sharing a class fingerprint report as one. A count here counts shapes, not elements, and it
  isn't a remediation estimate.
- The floor allows one Chromium layout quantum, 1/64 CSS px, for rect snapping, so the enforced bar
  is 23.984375.
- A control parked off-canvas at rest, a skip link at `left: -9999px`, is exempt. Such a link
  becomes a real target when focus reveals it, and the rule never measures it there.

### The allowlist

A live-page finding has no source line a suppression comment could sit beside, so rendered mode
exempts by a page+selector+reason JSON allowlist instead, in `rendered.allowlist`:

```json
{
  "rendered": {
    "allowlist": [
      { "page": "/admin/posts", "selector": ".legacy-badge", "reason": "ships in the next pass" }
    ]
  }
}
```

The `selector` is the signature a rule reports a finding under: a tag, then its id if it carries
one, then up to four of its classes, each escaped so a Tailwind class such as `lg:ml-56` stays a
valid CSS selector. Suppressed findings are counted and printed, never hidden.

An entry may also name the rule it exempts:

```json
{ "page": "/admin/posts", "selector": ".legacy-badge", "reason": "ships in the next pass", "rule": "border-contrast" }
```

Name it when you exempt an advisory finding. An entry that stops doing what it was written to do
reports under one of three rule ids of its own, rather than doing nothing silently:

| Rule id | What the entry did |
|---|---|
| `rendered.allowlist-stale` | The selector matched nothing the run visited |
| `rendered.allowlist-unprobeable` | The browser refused to parse the selector. Always advisory, because unreadable is a different claim from stale |
| `rendered.allowlist-dead` | The selector still matches an element, and the entry suppressed nothing |

A stale or dead entry reports at the tier of the rule it names. Without `rule`, it's an error, which
is right for a suppressed error-tier finding and would turn a suppressed advisory one into a gate
the next time the selector churns.

The dead verdict waits on a complete run. A rule can declare an interaction state a given page can't
reach, a page with no popup trigger can't open a menu, and on such a page the run reports an advisory
saying which state it missed instead of calling the entry dead. Removing an entry on that evidence
would leave the next complete run gating on the finding the entry covers. That advisory is its own
harness id:

| Rule id | What it means |
|---|---|
| `rendered.state-unreachable` | A registered rule declared an interaction state (`row-expanded`, currently the only one surfaced this way) that a page never reached, so the rule ran on a subset of that page. Always advisory: a page with no `ExpandableRow` never reaching `row-expanded` is ordinary, not a defect |

### Rule-declared exemptions

A rendered rule can also carry its own exemption, for a ratified exception neither suppression idiom
can express: a design token every recipe shares, on every page, which no page+selector entry names
and no source-positioned directive can reach. `border-contrast` holds the one that ships.
`--cairn-card-border`, the card hairline, is a recorded decision, so a border painted through that
token still separates its two surfaces at least as well as the ratified rendering.

An exemption suppresses a finding without silencing it. The rule still constructs the finding, the
finding still carries its measurement, and it reaches the report's suppressed list with the reason
printed beside it, the same way an allowlisted finding does:

```text
Suppressed:
  /admin/posts [light, rest]:0  advisory  border-contrast  div.card-shell: top/right/bottom/left
  border rgb(235, 231, 226) reads at contrast 1.11 against the surface beside it rgb(246, 243, 239),
  and 1.19 against its own fill rgb(253, 251, 249), both under the 3:1 house floor (WCAG 1.4.11's
  bar for a control-identifying boundary, applied here to every rendered border) (exempt: RULING 2
  (2026-07-28): painted in this page's own --cairn-card-border, the ratified hairline, and still
  separating its two surfaces at 1.190 against the better of them (ratified floor 1.15))

1 file scanned, 1 rule run
0 errors, 0 advisories, 1 suppressed
```

Identical suppressed lines collapse to one with an `(xN)` count, and the summary still counts every
finding.

Only an advisory rule can exempt itself. On an error-tier finding the run refuses the reason: the
finding stays in the gating list, the exit code stands, and the report prints the refusal where the
exemption would have gone. The engine writes a rule-declared reason, not the project, so it applies
to every page automatically and appears in no diff. A gate any rule could quiet in one line is worth
no more than the runs it passes. The allowlist is the other authority and keeps working either way,
because a project owns and reviews that file: an entry covering an error-tier finding suppresses it
whether or not the rule also asked.

## The norms query

The package ships a norms manifest: the admin's measured design norms as data. A generator renders
the admin screens in both themes, reads the computed styles of each semantic role, and derives the
bands the query returns. The query exists so an agent or a developer building a new admin surface
reads a measured number instead of inferring one from a screenshot.

A role a shipped recipe covers also prints a `recipe:` line: the plain class to write and the look
it produces, right under the role's own header. A role no recipe covers prints as it always has,
with no `recipe:` line.

```bash
npx cairn-audit norms card
```

```text
card  (container)  .card-shell
  The floating card surface: the list table, the editor panes, the auth card.
  recipe: card-shell card-shadow
    a floating card surface: the box radius, a hairline edge, and elevation.

  background-color  var(--color-base-100)  15 sites  observed
  border-color  var(--cairn-card-border)  15 sites  ratified
    ratified by ... (Ruling 2): the --cairn-card-border hairline measures 1.11 against the ambient
    beside it and 1.19 against the card's own fill in light, 1.43 and 1.20 in dark, and stays by
    design. The border-contrast rule applies a house floor of 3:1, the number WCAG 1.4.11 sets for a
    control-identifying boundary rather than for a card hairline, and exempts this one on the better
    of its two ratios against a ratified floor of 1.15
  border-radius  8px  15 sites  ratified
    ratified by docs/internal/admin-design-system.md (--radius-box)
```

### The term

The term is a role id, a class token, or a whole selector. All three of `status-chip`,
`.status-chip`, and `.btn.btn-primary` resolve. A term several roles share, such as `btn`, returns
every role that carries it.

A term that names no role exits 2 and prints the roles that exist. The command never returns an
empty result for an unknown term, because a query that printed nothing and exited 0 would read as a
role with no norms.

### The roles

| Role | Family | Selector |
|---|---|---|
| `button-primary` | control | `.btn.btn-primary` |
| `button-ghost` | control | `.btn.btn-ghost` |
| `input-text` | control | `input.input` |
| `select` | control | `select.select` |
| `status-chip` | control | `.status-chip` |
| `card` | container | `.card-shell` |
| `table-cell` | text | `table.table td` |
| `table-header-cell` | text | `table.table th` |
| `nav-item` | text | `nav[aria-label="Site content"] .menu a` |
| `page-title` | text | `h1.page-h1` |
| `eyebrow` | text | `.type-label` |
| `icon` | icon | `svg.lucide` |

A role's family decides which properties the manifest carries for it. A control carries its height,
its padding, its padding-to-font-size ratios, its border treatment, its radius, and its type size. A
container carries the border treatment and the radius, and no padding: a component composes its own
padding, so a padding band would be a distribution of per-screen choices rather than a norm. A text
role carries its type recipe. An icon carries its box.

### Reading an entry

Each entry is one role's one property.

| Field | What it states |
|---|---|
| Band | The distinct values observed, as a length in px, a ratio, a keyword vocabulary, or a relationship |
| Sites | How many distinct elements the band rests on. A theme repeat is one site, not two |
| Provenance | `ratified` when a recorded decision settles the value and the render still matches it, `observed` otherwise |
| Flags | Every caveat on the entry |

The manifest stores a palette-dependent property as a relationship, never as a resolved value. A
border color reads `var(--cairn-card-border)`, and a mixed value keeps its formula. A site that
re-tunes the palette therefore invalidates nothing in the manifest, and no entry teaches a number
that site's own theme never produces.

### Flags

| Flag | What it means |
|---|---|
| `open-question` | An open design question governs this norm. The band is a measurement, not settled ground truth, and the query prints the question |
| `single-observation` | The band rests on one element site. It is that component's value, not a distribution |
| `ratified-drift` | A recorded decision settles this pair and the render no longer matches it. Provenance falls back to `observed` |
| `literal-dropped` | At least one observation resolved to a palette value rather than a relationship, and the derivation dropped it from the band |

An entry flagged `open-question` never carries `ratified` provenance, and the `norms-bands` rule
treats it as unbanded rather than checking a measurement against an unsettled question.

The check runs in both directions, so a flag or a provenance with nothing behind it fails the same
way an unflagged open question does. An entry flagged `open-question` that no recorded question
governs, an entry claiming `ratified` that no recorded decision settles, an entry a decision does
settle that still reads `observed`, and a drifted band missing its `ratified-drift` flag are all
manifest errors. A one-directional check can only notice a row it already knows about, which is how
a settled ruling once left a stale `[open-question]` flag printing with no question behind it.

## Regenerating the manifest

The manifest is generated, committed, and shipped in `dist`. Regenerate it after a change to the
admin's rendered appearance.

```bash
VITE_CAIRN_E2E=1 npm --prefix examples/showcase run build
CAIRN_DEV_BACKEND=1 npm --prefix examples/showcase run preview -- --port 4173
npm run norms:generate
```

The generator never starts a server. It renders against `BASE_URL`, which defaults to
`http://localhost:4173`, and reports the command to start one when nothing answers. Playwright is
imported dynamically, so a project that never generates takes no browser dependency.

`npm run norms:check` regenerates into memory and compares against the committed file. The publish
workflow runs it, so a release cannot ship a stale manifest. Neither script belongs to the `check:*`
family: those run on every push and call `npm run package` on every invocation, and a browser render
in that path would slow and destabilize every other gate.

The generator refuses to write a manifest it cannot stand behind. A run that renders nothing, a role
whose selector matches nothing, and a manifest that violates one of the disciplines above each fail
the run rather than producing a smaller manifest that still reports success. The disciplines are
also checked against the committed manifest by the unit suite, which needs neither a browser nor a
server, so a manifest that drifts from the recorded decisions fails before a release does.
