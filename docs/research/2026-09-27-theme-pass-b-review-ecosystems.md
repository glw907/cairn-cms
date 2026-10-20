# Theme pass B spec review: the theme-ecosystems lens (2026-09-27)

Target: `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at `4365ac34`.
Evidence: `docs/superpowers/research/2026-09-27-theme-ecosystem-survey.md` (cited as "survey"),
plus repo reads and one web check of daisyUI's theme docs.

Overall: the spec's shape is the one the robust ecologies converge on. It puts tokens first, keeps
the token set small and semantic, inherits the engine defaults instead of copying them, uses the
ordinary cascade as the override path, and runs a validator with a reasoned escape hatch. That is
Starlight plus daisyUI, with Hugo-style visibility for everything the site owns. The findings sit
at the edges. The spec half-applies its own copy-and-forget argument. It ships two Waymark chrome
tokens as engine contract, which is Drupal's freeze in miniature. One validator rule would reject
two documented idioms, the gscan failure. Several survey lessons would add surface without serving
a stated goal, and I refuse them below.

## Comparison table

| System or lesson | Where the spec matches | Where it diverges | Verdict |
| --- | --- | --- | --- |
| WordPress `theme.json` | Semantic token set, defaults inherited from the platform, token-first theming | No versioned defaults; the policy for a changed default *value* is unstated (F5). Style variations are absent, but daisyUI's named themes already provide them | Match; one policy sentence |
| Ghost / gscan | A rule engine with per-rule fix text and an advisory tier before error. `cairn-audit` already has reasoned, counted suppression (`docs/reference/cairn-audit.md:121-160`) | `theme-conformance` repeats gscan #86: it treats unknown vocabulary as invalid (F3) | Diverges on one rule |
| Shopify OS 2.0 / Theme Check | An engine public component composes into any conforming theme (probe 3), the analog of sections everywhere. Waymark is copied like Dawn, and Drupal's Starterkit shows copying on purpose is legitimate | The static contrast resolver can drift from the browser, the Theme Check "linted Liquid" gap (F8) | Match; name the limit |
| Hugo | Everything a site overrides lives in its own tree (`src/theme`, the copied chassis), so it is visible and precise | None material | Match |
| Astro Starlight | CSS custom properties with inherited defaults; everything not overridden tracks upstream | Starlight names its override surface. The spec's contract omits the engine-emitted class names, the one engine-owned markup a theme must style (F1) | Gap, small fold |
| Gatsby shadowing | No path-matching override mechanism; the spec correctly adds none | n/a | Match |
| Drupal Classy then Starterkit | `theme-tokens.css` holds values, not markup, and every key is overridable, so Classy's markup freeze does not transfer to the file as a whole | Two keys encode Waymark chrome (the CTA set, `--cairn-caption-tracking`) and would freeze a base-theme opinion into the seam promise (F2) | Diverges on two keys |
| Jekyll gem themes | Defaults move into `node_modules`, and the reference page is the stated window onto them | Nothing tests the reference table against the file, so the invisible file can drift from its window (F7) | Minor fold |
| daisyUI / shadcn | Semantic roles, one variable layer re-themes every component, no aliases | daisyUI's documented partial customization of a built-in theme would fail conformance (F3). Its theme generator, the tool that makes about 50 required values cheap, goes unmentioned (F9) | Fold |
| Material 3 / DTCG | The spec stays far from M3's surface area | n/a | Refuse DTCG (see Refusals) |
| L1 inherited defaults | Core move of the spec (lines 75-81) | Rules that style engine-emitted markup stay copied (F1) | Partial |
| L2 named override surface | Reference page names every token | Emitted classes are not part of the named contract (F1) | Partial |
| L3 composition designed in | One theme per site, so multi-theme composition does not arise | Default-versus-override precedence rests on import order, unstated (F6) | Minor |
| L4 validator can lag the runtime | Rendered checks (`test:reskin`, `check:interactive-contrast`) remain | Static `var()`/`color-mix` resolution has unstated limits (F8) | Minor |
| L5 component-level extension unit | Probe 3 | n/a | Match |
| L6 semantic tokens | daisyUI roles plus derived inks | n/a | Strong match |
| L7 copy on purpose | Waymark as a starter is Starterkit's model | The spec never says `prose.css`/`composition.css` stay copy-on-create on purpose, and its own line 77 argument indicts them (F1) | State it |
| L8 interchange format | n/a | n/a | Refuse |
| L9 discoverability | Site-owned files are in the tree | Engine defaults are not (F7) | Minor |
| L10 full replacement last | Tokens, then the cascade, then replacing `prose.css` | n/a | Match |
| L11 neither under- nor over-specified | Floor-not-ceiling principle, small cairn role set | About 50 required daisyUI values per two-scheme theme, with no defaults (F9) | Acceptable; point at the tooling |
| L12 validator scoped to structure | `public-literals` polices literals, not names | `theme-conformance` polices names (F3) | Diverges on one rule |

## Findings

### F1 (major): the spec fixes copy-and-forget for tokens but leaves the engine-emitted-markup bindings unplaced and unnamed

**Location:** spec:75-86, spec:58-70, spec:36-40.

**Defect.** Line 77 argues that "a copied default freezes," then moves only the token values. Today
the chassis `tokens.css` also carries three pure-structure pieces. It carries the `.cairn-tok-*`
bindings and `pre.shiki`, which style classes the engine's highlighter emits
(`src/lib/render/highlight.ts`). It also carries the `@utility cairn-focus-ring`. The file's own
comment calls the tok binding "pure structure: no theme ever needs to edit this block." Line 83 says
the chassis file keeps "the Tailwind import, the daisyUI plugin activation, and the import of the
engine defaults." That list drops all three pieces, and it drops the `prose.css`/`composition.css`
imports too, so the plan has no instruction for them. More broadly, the engine emits classes into
public markup: `cairn-glyph`, `cairn-icon`, `cairn-place-*` (`remark-figure.ts:86`), `cairn-tok-*`,
and `pre.shiki`. Only the copied `prose.css` and `site.css` style them. The two-part contract never
names them, even though line 38 lets a theme drop `prose.css`. A theme that takes that permission
has no list of what it must then style. The existing registry at `docs/reference/render.md:20-48`
omits `cairn-tok-*`, `pre.shiki`, and `cairn-place-*`, so no reference page names any of the three.

**Survey evidence.** L1 and the Jekyll/Gatsby entries: copied files silently diverge from
upstream. L2 and Starlight: the override surface is named, not implicit. L7, Drupal Starterkit, and
shadcn: copying is legitimate when it is chosen and its tradeoff is stated.

**Fold.** (a) Move the tok/shiki binding and the `cairn-focus-ring` utility into the engine
stylesheet beside the defaults, inside `@layer components` as today, so a theme still overrides
them. They style engine output and carry no design choice, the Starlight inherited-default case.
(b) Name a third contract element by reference: "the classes the engine emits into public markup,"
linking `render.md`'s registry, and add `cairn-tok-*`, `pre.shiki`, and `cairn-place-*` to that
registry. (c) State in one sentence that `prose.css` and `composition.css` stay copy-on-create on
purpose, the Starterkit and shadcn choice, and that upstream improvements reach a site through the
migration notes, not automatically. Do not move `prose.css` into the engine. That would reproduce
Classy, because `prose.css` is the design itself.

### F2 (major): two Waymark chrome tokens enter the engine contract

**Location:** spec:67-68 (the CTA set, `--cairn-caption-tracking`), spec:88-89.

**Defect.** A repo read finds that `--cairn-cta-*` and `--cairn-caption-tracking` have no reader in
`src/lib` or in the chassis CSS. Only Waymark's theme and routes read them: the CTA panel and
`SiteHeader`'s nav. They are design choices of one theme's chrome, not "what a theme must provide
for cairn's own parts to render" (line 36). Once they sit in `theme-tokens.css` under the
`--cairn-*` prefix, line 88 makes renaming or removing them a disclosed contract change. A second
theme with no CTA panel inherits vocabulary it has no use for, and the engine can never retire the
keys cheaply.

**Survey evidence.** Drupal: Classy froze because downstream themes depended on its opinions, and
Drupal's core blog says bespoke designs "aren't a good fit for subtheming an opinionated theme."
L11: extra contract surface raises the cost of a new theme.

**Fold.** Keep both in Waymark's `theme.css` as the theme's own tokens, which the governing
principle already permits. The harvest's drift finding goes away because the key and its reader
now live in the same copied theme. Renaming them to `--site-*` fits the chassis README's namespace
rule and is optional. It is cheap now, because every site is being rebuilt from Waymark anyway.
Apply the same "is there a reader outside the theme?" test to every other listed key at plan time.

### F3 (major): `theme-conformance` rejects documented idioms (the gscan failure)

**Location:** spec:128-132.

**Defect.** The rule has two halves, and each rejects a legitimate idiom.

1. *"Every `var(--x)` ... resolves to something the theme, `theme-tokens.css`, or daisyUI
   defines."* This leaves out Tailwind's own theme namespace. `var(--color-red-500)`,
   `var(--radius-lg)`, and `var(--font-sans)` are Tailwind 4's documented way to reach theme values
   in custom CSS, and line 125 already blesses those same values as utilities. The rule also leaves
   out `--tw-*` internals, component-local and inline variables (`style="--i: 3"`, Svelte
   `style:--x`), variables set by script at runtime, third-party library variables, and a `var()`
   that carries its own fallback. The current check never met these cases because it reads only
   `prose.css` and the code ramp (`check-public-tokens.mjs:546-663`). Widening it to the whole
   public scope is where they appear.
2. *"Each named daisyUI theme block defines every daisyUI theme variable."* daisyUI documents
   customizing a built-in theme with a partial block: "All the other values will be inherited from
   the original theme" (daisyui.com/docs/themes, checked 2026-09-27). Starting from one of
   daisyUI's built-in themes is the most natural "different look" path a daisyUI designer has, and
   this rule would flag it.

**Survey evidence.** L12 and gscan issue #86: a validator that conflates "not in my known
vocabulary" with "invalid" blocks legitimate extension. L4: validator rules can become a false floor.

**Fold.** Build the defined set as daisyUI keys, `theme-tokens.css` keys, Tailwind's default theme
keys, `--tw-*`, and every custom property declared anywhere in the scanned roots, including inline
and `style:` declarations. Exempt a `var()` with a fallback. Judge completeness on the resolved
theme, the block plus the built-in theme of the same name when one exists, not on the block's
literal text. The plan should verify how the `daisyui/theme` plugin behaves under the chassis's
`themes: false`. Name the existing reasoned suppression in the reference page as the escape hatch
for anything left, such as a runtime-only variable.

### F4 (minor): the `public-literals` boundary is inconsistent and underdefined

**Location:** spec:121-127 against spec:243-244.

**Defect.** Line 123 exempts custom-property values only in `src/theme/**/*.css`. The open item at
line 243 says "only CSS custom-property values are exempt" in a theme's Svelte components. Under the
first reading, a component-scoped token in a theme component's `<style>` block (idiomatic Svelte)
fails, and it becomes an error at the next minor. "Absolute font size" does not say whether `rem`
counts. The spec also never says that `transparent`, `currentColor`, and `inherit` are not literals.

**Survey evidence.** L12: police structure, not legitimate authoring idiom.

**Fold.** Exempt a custom-property value anywhere under `src/theme/`, in any file type. Define
"absolute" by unit list. Exempt color keywords that name no color value.

### F5 (minor): the policy for changing a default's value is unstated

**Location:** spec:88-89.

**Defect.** The spec covers renaming, removing, and adding keys. It says nothing about changing a
default's value. Every site that leaves a key unset re-renders on upgrade. Left unstated, the engine
will either shift sites silently or de facto never retune a default, which is Classy's freeze
arriving by habit.

**Survey evidence.** WordPress versions `theme.json` so an old theme keeps old defaults. Drupal
froze instead of evolving.

**Fold.** Add one sentence: a changed default value is a disclosed change with a changelog line,
not a breaking one, and a site that needs stability sets the key itself. A versioned schema is not
warranted (see Refusals).

### F6 (minor): whether a theme override beats a default depends on import order

**Location:** spec:65-70, spec:83-84.

**Defect.** An override in `:root` wins over the engine's `:root` default only by source order,
and `@theme` overrides likewise. A theme that imports its own file before the engine's, or splits
across files, loses silently.

**Survey evidence.** L3: composition must be designed in, not discovered.

**Fold.** For the plan: put the engine's `:root` defaults in a low cascade layer (`@layer base`,
checked against the Tailwind v4 layer order) so an unlayered theme declaration always wins. Also
state the required import order for the `@theme` half, which layers cannot fix.

### F7 (minor): the only window onto the invisible defaults is untested for completeness

**Location:** spec:145-153.

**Defect.** The defaults now live in `node_modules`, like a Jekyll gem. The reference page is the
designer's only view of them, but the named test runs one way (guidance table ⊂ tokens), and
`check:reference` gates exports, not keys or default values.

**Survey evidence.** L9 and Jekyll's `bundle show` workflow.

**Fold.** Assert that the reference page's key table equals the file's keys and defaults, in both
directions, or generate the table from the file.

### F8 (minor): static contrast resolution has unstated limits

**Location:** spec:133-136.

**Defect.** Resolving `var()` and `color-mix` statically through culori can disagree with the
browser, for example on scoped overrides, `data-theme` nesting, or a media-query dark block. The
spec also does not say the rule checks every named theme block, where today it checks two schemes.

**Survey evidence.** L4 and Theme Check's "the Liquid you lint isn't the Liquid Shopify runs."

**Fold.** Add a coverage-limits paragraph to the reference page, the same form `cairn-audit.md`
uses for the motion rules. State that every named theme is checked. The rendered checks stay the
ground truth.

### F9 (minor): the guidance omits the tool that makes the required daisyUI set cheap

**Location:** spec:149-152.

**Defect.** A minimal conforming theme needs every daisyUI variable in each scheme, about 50
values for light and dark, with no defaults (line 63). That choice is correct, since it is daisyUI's
own contract. But the "minimal set" guidance does not point at daisyUI's theme generator or at
starting from a built-in theme, which F3 makes legal.

**Survey evidence.** L6 and L11: Material 3 ships the Theme Builder because a full role set wants
tooling. daisyUI already ships its generator.

**Fold.** Add one line to `public-theme.md`: generate the daisyUI blocks with daisyUI's theme
generator, or start from a built-in theme, then override cairn keys only as needed. Name the
fixture theme as the worked minimal example.

## Refusals (lessons that would add surface without serving a stated goal)

- **WordPress style variations.** daisyUI's named themes plus `data-theme` already are style
  variations, and derived inks make an extra variation nearly free. A cairn mechanism would
  duplicate the stack.
- **Starlight-style component override map for engine components.** The engine ships no public
  Svelte components today (`src/lib/islands` and `src/lib/reproductions` carry no themed markup),
  and every public component lives in the site's tree, where it is Hugo-visible. The emitted-class
  registry (F1) is the whole named surface cairn needs.
- **A versioned token schema (`theme.json` `version`).** Semver plus the changelog already versions
  the file. F5's sentence covers the gap.
- **DTCG JSON token source.** L8 applies after multi-tool fragmentation, which cairn does not have.
  A JSON source would add a build step and a second format against the "no over-engineering" goal.
- **Multi-theme composition rules (L3 at the theme tier).** A site has one theme. Nothing to design.
- **Shipping `prose.css` in the engine.** It would buy upstream fixes at Classy's price (see F1c).

## Cairn's own drawbacks, stated plainly

- Copy-on-create for `prose.css`, `composition.css`, and Waymark means the four rebuilt sites will
  not receive upstream prose fixes automatically. That is the accepted shadcn/Starterkit cost, and
  the spec should say so (F1).
- Engine-shipped defaults mean an engine upgrade can change a site's look where the site left a key
  unset (F5). That is the accepted Starlight cost.
- A daisyUI theme cannot be partial when authored from scratch, so the entry cost for a theme is
  daisyUI's, not cairn's (F9).
