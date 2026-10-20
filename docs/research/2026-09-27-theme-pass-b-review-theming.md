# Theme pass B review: ease of theming

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` (main, `4365ac34`).
**Lens:** a skilled designer who wants a very different look, not a Waymark recolor. They know CSS,
Tailwind, and daisyUI, but not cairn.
**Method:** I read the spec against Waymark's `theme.css`, `src/chassis/` (tokens, prose,
composition, README, theme-toggle), `examples/cairn-theme/cairn.css`,
`docs/extend/design-your-site.md`, and `docs/reference/cairn-audit.md`. I checked the load-bearing
claims three ways: by compiling probes with the repo's own `@tailwindcss/node` and daisyUI 5.7.42,
by grepping which files read each proposed contract key, and by grepping the five production sites.

## Verdict

The contract's core is right. It is daisyUI's variables plus one engine file of defaults, and
derived inks mean a new theme needs no hand-tuned ink. That is less for a designer to learn than
today's chassis. But four mechanisms in the spec break the "floor, never a ceiling" principle in
practice:

- The completeness check rejects daisyUI's own built-in-theme merge.
- The defaults' unlayered placement silently beats the most natural daisyUI override.
- The literal guard polices where a token is defined, not only whether one is used.
- The contract promotes seven Waymark-only keys to permanent engine surface.

Each has a cheap fold. None is a blocker.

## The walk: what the designer writes today and under the spec

**Files.** One `src/theme/theme.css` that `@import`s `../chassis/tokens.css`, the font imports, and
one `@plugin "daisyui/theme"` block per scheme. Chrome components live in `src/theme/components/`.
An optional `site.css` holds layout, plus overrides of `prose.css` rules through the cascade.

**Minimum values for a conforming theme, as the spec is written.** daisyUI's theme object holds 28
keys: 20 color roles, then `--radius-selector/field/box`, `--size-selector/field`, `--border`,
`--depth`, and `--noise`. There is also `color-scheme`. `theme-conformance` requires every key in
every named block (spec:128-129), and "nothing defaults them" (spec:63-64). So a single-scheme
theme needs **28 values** and a light-plus-dark theme needs **56**. It needs zero `theme-tokens.css`
keys, since every one defaults. For comparison, Waymark itself sets about 95 values, and 11 of them
are duplicated in two dark blocks (theme.css:298-345).

**Minimum with the M1 fold.** daisyUI already defaults all 28 keys when a block's `name` matches a
built-in theme. So the true idiomatic minimum is a `name:` line plus the few roles the designer
changes, often **2 to 6 values** across both schemes.

**cairn-specific concepts the designer must learn today, beyond CSS and daisyUI:**

1. The chassis/theme boundary and its import order.
2. Where each value goes: in `@theme`, in `:root`, or in the daisyUI block. This also covers which
   one wins across cascade layers. `cairn.css:26-29` and `42-52` spend 20 lines explaining this and
   still reach for `!important`.
3. The hand-synced dark triple: a light `:root` block, a media-guarded
   `:root:not([data-theme])` block, and a `:root[data-theme="cairn-dark"]` block.
4. The split between a status fill and its ink.
5. The `--cairn-*` roles.
6. The composition primitives.
7. The class names the markdown components emit, which `prose.css` styles.
8. The `data-flourish` switch.
9. The `cairn`/`cairn-dark` theme names wired into four files.
10. The spacing-key collision with Tailwind's container scale.

The spec adds three more: the three audit rules, the literal zone, and `cairn-eyebrow`. It removes
one: derived inks eliminate item 4 for a theme that takes the defaults. The folds below remove
items 2, 3, and 9 as sources of surprise, and they cut `cairn-eyebrow`.

## Findings, ranked by consequence

### M1. `theme-conformance` rejects daisyUI's built-in-theme merge (major)

**Location:** spec:60-64 ("nothing defaults them") and spec:128-129 ("each named daisyUI theme
block defines every daisyUI theme variable").

**Defect:** daisyUI's `theme/index.js` merges a custom block over the built-in theme of the same
`name` ("Merge custom theme with built-in theme if it exists"). This works even under the chassis's
`themes: false`.

**Evidence:** I compiled a probe of `@plugin "daisyui/theme" { name: "nord"; default: true;
--color-primary: oklch(50% 0.2 20); }` with the repo's Tailwind. It emitted all 28 keys: nord's
values plus the one override. That is daisyUI's documented way to customize a theme, and 35
built-ins give a designer who wants a very different look a large set of starting points. As
written, the rule flags that block as incomplete. That polices vocabulary, not literals, which
contradicts spec:39-40. It also inflates the minimal theme from a handful of values to 28 or 56.

**Proposed fold:**

- A block whose `name` is a key of daisyUI's `theme/object.js` counts as complete. The rule already
  reads that object, per spec:62.
- Amend spec:63-64 to say "nothing in cairn defaults them; daisyUI does when you extend a built-in".
- `public-theme.md` presents "extend a built-in daisyUI theme" as the fast path to a new look, and
  "declare all 28" as the path for full control.

### M2. Engine defaults beat the daisyUI-block override and do not follow a nested `data-theme` (major)

**Location:** spec:65-69 (the `:root` roles) and spec:91-103 (derived inks). Waymark's pattern is
at theme.css:250-345.

**Defect:** There are two mechanical problems, and together they force every new theme into
Waymark's hand-synced dark triple.

1. *Cascade layers.* daisyUI emits theme blocks inside `@layer base`. The chassis `:root` defaults
   are unlayered, and the spec does not say where `theme-tokens.css` puts them. An unlayered rule
   beats any layered one. So a designer who follows daisyUI's idiom and writes
   `--cairn-info-ink: …` inside their `@plugin "daisyui/theme"` block loses silently to the engine
   default.
2. *Nested themes.* A custom property whose value uses `var()` is substituted on the element that
   declares it. Descendants inherit the resolved value. The derived defaults
   (`--cairn-*-ink`, `--color-muted`, `--color-card-border`, `--cairn-shadow`) are declared on
   `:root`, so they resolve against the root's scheme. daisyUI supports nested themes
   (`<section data-theme="cairn-dark">`), a common way to build a dark band inside a light page.
   Inside such a section, the section's roles switch but the derived muted and ink colors keep the
   light values, so dark-on-dark text fails AA. This is the reason Tailwind's docs recommend
   `@theme inline` for tokens that reference other variables.

**Evidence:**

- The compile probe put daisyUI's theme in `@layer base` and a plain `:root` rule outside any
  layer.
- A second probe showed daisyUI passes arbitrary custom properties through a theme block and emits
  them in both the media-guarded selector and the `[data-theme]` selector. Single-value tokens
  compile correctly there (`--cairn-info-ink: color-mix(…)`).
- A comma-separated multi-layer `--cairn-shadow` is split by Tailwind's option parser into two
  declarations, and the last one wins. So a theme block can carry single-value tokens only.

**Proposed fold:**

- Ship `theme-tokens.css`'s role defaults inside a cascade layer that sits below daisyUI's base,
  such as `@layer theme`, on the selector `:root, [data-theme]`.
- Waymark's unlayered `:root` overrides still win, so its render does not move.
- A daisyUI-block override now wins over the engine default.
- The derived defaults recompute inside every nested theme.
- Guidance teaches one placement rule: a per-scheme value goes in that scheme's daisyUI block.
  That covers every single-value token, the four inks, muted, and card-border. The new theme then
  needs no dark triple.
- For the shadow, either keep it on `:root` or compose the default from a single-value
  `--cairn-shadow-color`. The right-sized lens can pick which.
- The plan adds a nested-`data-theme` case to the fixture theme.

**Why this matters most for this lens:** the dark triple, and the layer confusion that
`cairn.css` papers over with `!important`, is the largest cairn-specific cost a designer pays. The
spec never mentions it. This fold removes it for new themes at no cost to Waymark.

### M3. The contract promotes seven Waymark-only keys to engine surface (major)

**Location:** spec:66-69 (the "CTA set" and `--cairn-caption-tracking` in `theme-tokens.css`) and
spec:88-89 (a rename becomes a disclosed contract change).

**Defect:** No chassis or engine file reads these keys. Only Waymark's own chrome and styleguide
read them.

**Evidence:** `grep -rn 'var(--cairn-cta\|var(--cairn-caption'` finds these readers:

- `--cairn-caption-tracking`: only `theme/components/SiteHeader.svelte:174`.
- All five `--cairn-cta-*` keys: only `routes/(site)/styleguide/+page.svelte:700-724`.

`prose.css:681-685` explicitly does *not* read the CTA pair. Every key on the reference page is
something the designer must read and understand, and something the seam promise must keep forever.
These seven protect no stated goal, since no engine component consumes them. The principle already
lets Waymark keep them as its own tokens. Put them in the engine and a different theme inherits
Waymark's house-ad CTA and nav tracking as "contract". A smaller mismatch sits in the same place:
`--text-step--2` is defined only by Waymark (theme.css:203) and has no chassis default, yet spec:67
lists `--text-step-*` as defaulted.

**Proposed fold:**

- Cut the CTA set and `--cairn-caption-tracking` from `theme-tokens.css`. They move into Waymark's
  `theme.css` as theme-own tokens, and the Waymark render does not change.
- Admit a key to `theme-tokens.css` only when a chassis or engine file reads it. `check:reference`
  or the conformance test can assert that rule.
- Decide explicitly whether `--text-step--2` is a contract key.
- Keep `--cairn-shadow` as a generic elevation role, a plausible engine-component need.

### M4. `public-literals` polices where a token is defined (major; OWNER FORK)

**Location:** spec:121-127 ("allowed in one place … `src/theme/**/*.css`" and "ecxc's
component-local `--color-header` constants are the case this catches") against spec:243-244, which
leaves "a theme's Svelte components under `src/theme`" open for the plan.

**Defect:** ecxc's constants are custom-property definitions in
`src/theme/components/SiteHeader.svelte:164-170`. That file is inside the theme, and the value is
already a token. The designer documented the choice as deliberate (SiteHeader.svelte:7-10): "a
fixed brand device, not part of the light/dark base ladder … declared as local constants on
`.site-header` rather than added to the shared token file." Forcing those constants into
`theme.css` splits one component's styling across two files. That conflicts with the idiomatic
co-location of Svelte scoped styles, and the only thing it buys is location. It does not add
re-skinnability either: a scheme-invariant brand band is not re-skinned. The spec also decides this
case in the guard section while listing it as open in "Open for the plan".

Three smaller gaps sit alongside it:

- The literal zone is hard-coded, although the admin scope already has a configurable
  `static.paletteFiles` (cairn-audit.md:170).
- "Absolute font size" is undefined: does `rem` count, and `clamp()`?
- The keywords `transparent`, `currentColor`, `inherit`, `white`, and `black` are not addressed.
  The existing check exempts some of them (`reskin-fixture.mjs`, `nonColorValue`).

A real legitimate hit also exists: xcathletes' brand page sets `style="background:#ffffff"` and
`#222222` to show its logo on fixed grounds (`routes/(site)/docs/contract/brand/+page.svelte:31,
42`).

**Options:**

- **A (recommended):** a custom-property definition holding a literal is legal anywhere under the
  theme root, including a Svelte `<style>` block. Declarations and markup stay checked.
- **B:** keep the spec as written. Only `src/theme/**/*.css` is legal, and ecxc moves its band.

**Proposed fold (either option):**

- Make the zone a config key that mirrors `static.paletteFiles`.
- Define "absolute font size" as `px`, `pt`, or `rem` outside a token definition.
- List the exempt keywords.
- `public-theme.md` names the two sanctioned escapes:
  - `@theme { --color-brand: … }`, which yields `bg-brand` and makes a one-off color a token in one
    line.
  - `cairn-audit` `disable-next-line public-literals`, for a fixed-brand exhibit like xcathletes'.

  The guard becomes a floor only when the designer can see the way past it.

### M5. `theme-conformance` resolution flags designer-owned vocabulary (major)

**Location:** spec:129-130 ("every `var(--x)` … resolves to something the theme,
`theme-tokens.css`, or daisyUI defines").

**Defect:** Several legitimate sources define custom properties outside those three:

- The composition primitives' per-instance properties (`--cairn-card-padding` and the rest, set on
  the element in `composition.css:21-38`, which is chassis and outside the scope roots).
- Component-local tokens that are legal under M4's fold.
- Inline `style="--delay: …"` and Svelte `style:--x`.
- JS-set properties.
- daisyUI's component variables, which a designer tuning daisyUI sets (`--btn-color`,
  `--alert-color`). These are not in daisyUI's theme object at all.

Resolving only against the theme, `theme-tokens.css`, and daisyUI's theme object reports these as
dangling. That checks vocabulary, contradicting spec:39-40. Once the rule is promoted to error at
the next minor, it blocks the builds of exactly the designers the principle protects.

**Proposed fold:**

- The resolution set is every custom-property definition the build can see: theme files, chassis
  CSS, component `<style>` blocks, inline `style` and `style:` custom properties, and daisyUI's
  compiled CSS, not only its theme object.
- A `var(--x, fallback)` is never flagged.
- A JS-set property uses a fallback or the disable directive.
- The rule's real target, a typo such as `--color-info-ink` for `--cairn-info-ink`, is still
  caught.

### M6. The public scope's default roots overlap the admin scope and cover cairn's admin sheet (major)

**Location:** spec:116-118 (default roots include `src/lib/components`).

**Defect:** On cairn's own tree, `src/lib/components` is the admin component directory. It holds
`cairn-admin.css`, which has 84 `oklch(` literals outside `src/theme`. `static.scope` for the admin
scope already defaults to include `src/lib/components` (cairn-audit.md:166). So every admin
component and the Warm Stone palette would be scanned by `public-literals`, and every component
there would get two rule families with conflicting literal zones. None of the five sites has a
`src/lib/components` directory, so for sites the default only adds ambiguity.

**Proposed fold:**

- Drop `src/lib/components` from the public defaults.
- Name the engine's public component directory explicitly, per spec:118, once one exists.
- The plan adds a test that the admin and public default roots are disjoint.

### M7. The spacing keys shadow five Tailwind container utilities, and the spec makes that contract (major; OWNER FORK on the remedy)

**Location:** spec:66-67 (`--spacing-*` in the engine's `@theme`) and spec:88-89.

**Defect:** The chassis README (lines 84-94) documents that `--spacing-xs/xl/2xl` hijack
`max-w-xs/xl/2xl`. The problem is larger than that.

**Evidence:** A compile probe with the chassis scale produced these rules:

- `max-w-3xs`, `max-w-2xs`, `max-w-xs`, `max-w-xl`, and `max-w-2xl` all compile to
  `var(--spacing-*)`.
- So do `w-xl` and `basis-xl`.
- `max-w-sm` and `max-w-3xl` are unaffected.

A Tailwind-fluent designer writes `max-w-2xl mx-auto` for a centered column and gets a 4rem box,
with no warning. Today the scale sits in a site-owned file a theme can drop. The spec moves it into
an engine file under the seam promise, so the trap becomes permanent. The README also undercounts
the collision at three utilities.

**Options:**

- **A (recommended now):** keep the names. `theme-tokens.md` and `public-theme.md` list all five
  shadowed utilities and their replacements (`max-w-measure`, `max-w-sm`/`md`/`lg`, or an arbitrary
  value), and the README's count is corrected. This is the cheapest option, since all four sites'
  `gap-m`, `px-m`, and `mt-2xl` markup depends on the names.
- **B:** rename the scale before it becomes contract. This breaks every site's spacing utilities
  once, and the timing is exactly right for a batched break.
- **C:** leave the `@theme` scale site-owned in the chassis and ship only the `:root` roles from the
  engine. The harvest evidence at spec:76-78 (the focus-ring set and `--cairn-caption-tracking`) is
  entirely `:root` roles, so C loses little. It also removes the plan's `@theme`-in-a-package
  utility-generation risk (spec:84-86 and 241). This is a question for the right-sized lens too.

### m1. Two defaults are wrong for a dark scheme (minor)

**Location:** spec:68 (`--cairn-shadow` and the CTA set as defaults); chassis tokens.css:140-151.

**Defect:** The default shadow mixes `--color-base-content`, which is near-white in a dark scheme.
The dark-first fixture theme therefore gets a pale glow for a shadow. Waymark avoids it only by
overriding with `black` (theme.css:316-318). The default CTA reads `--color-neutral` directly,
which Waymark's own comment warns against (theme.css:277-278).

**Proposed fold:**

- Default the shadow color to `black`. Waymark overrides it, so its baselines hold.
- The CTA issue disappears under M3.

### m2. Cut `cairn-eyebrow` (minor)

**Location:** spec:105-112.

**Defect:** The class adds up to `uppercase` plus `tracking-eyebrow`, and both utilities already
exist (theme.css:225-233). The harvest's defect was sites typing their own letter-spacing number.
A class does not prevent that: a site restyles the class with its own number, and `public-literals`
does not check `letter-spacing`. The spec also does not say which file holds the class. If it is a
droppable chassis file, a theme that drops `composition.css` (which spec:37-38 allows) silently
removes a class an engine component may use.

**Proposed fold:**

- Cut the class, and put `uppercase tracking-eyebrow` in the `public-theme.md` job-to-token table.
- If the class is kept, make it an `@utility` in `theme-tokens.css`, so variants work and it cannot
  be dropped with a chassis file.

### m3. The theme names are wired into four files, and the spec is silent (minor)

**Evidence:** `cairn` and `cairn-dark` appear in:

- `theme.css:97,145,330`
- `SiteHeader.svelte:20`
- `app.html:12`, the cookie regex
- `cairn.css:69`

ecxc keeps the names "regardless" (SiteHeader.svelte:13-17). A designer renaming the themes has to
find all four places. spec:162-166 does not say whether the fixture theme keeps the names.

**Proposed fold:** `public-theme.md` states that the names are kept by convention, or lists the
rename touchpoints. The fixture states its choice.

### m4. A replacement `prose.css` has no stated floor (minor)

**Location:** spec:37-38 (a theme "may replace or drop the chassis `prose.css`") and spec:145-148
(the reference page covers tokens only).

**Defect:** The classes `prose.css` styles are emitted by the theme's own `markdown-components.ts`
(for example `callout` at :58 and `cta` at :249), plus the engine's `.cairn-tok-*` classes. The
chassis README (lines 55-59) calls unprefixed directive classes "engine-fixed … neither the
chassis's nor a theme's to rename". The code contradicts that: the theme's build functions choose
those names.

**Proposed fold:**

- `public-theme.md` states what a replacement reading sheet must cover: the classes your registered
  components emit, the `.cairn-tok-*` contract, and plain markdown elements.
- The README sentence is filed as an engine docs fix.

### m5. Chassis CSS sits outside the public scope (minor)

**Location:** spec:116-117.

**Defect:** `src/chassis/` is not a default root. A designer who edits the site-owned `prose.css`
or `composition.css`, which the chassis README invites, can add literals that go unguarded. The same
literal written as an override in `src/theme/site.css` is flagged. Enforcement is inconsistent.

**Proposed fold:** add `src/chassis` to the default roots, or state that the exclusion is
deliberate.

## The governing principle against the mechanisms

| Promise (spec:36-40) | Holds? | Where it breaks |
|---|---|---|
| May define any tokens of its own | Partly | M5: own tokens outside "the theme" are flagged. M4: component-local definitions are banned. |
| May replace or drop `prose.css` and `composition.css` | Mostly | m2: the class's home is unstated. m4: no stated floor for a replacement. `composition.css` also styles the theme's `.site-footer` (composition.css:43-60), so Waymark's chrome is baked into the chassis. |
| May restyle anything through the ordinary cascade | Partly | M2: the daisyUI-block override loses to unlayered engine defaults. |
| The guard checks that a value is a token, never which token | No, as written | M1: the completeness check dictates keys. M5: resolution dictates where a token is defined. M4: location. |

After M1, M2, M4 (option A), and M5 are folded, all four rows hold.

## Nothing to cut beyond the above

Derived inks, the move of the `:root` roles into the engine, `theme-contrast`, and the fixture theme
each protect a stated goal cheaply. AA is a legitimate floor, not a ceiling. Tailwind palette
utilities staying legal (spec:124-125) is correct under the principle.
