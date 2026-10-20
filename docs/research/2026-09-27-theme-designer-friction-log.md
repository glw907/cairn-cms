# Designer friction log: re-skinning the showcase and adding a themed directive

**Date:** 2026-09-27. **Persona:** a skilled theme designer, fluent in CSS, Tailwind, and daisyUI,
comfortable reading Svelte, new to cairn. **Tree:** a scratch copy of `examples/showcase` at
`main` `ed2b7955` (scratchpad `designer/site`), dependencies symlinked to the real showcase
`node_modules`, which resolve the engine through `file:../..` to the real repo's `dist`. No
engine, site, or worktree file was edited.

**Tagged against:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` (the
twice-folded draft, "draft, folded twice") and the nine
`docs/superpowers/research/2026-09-27-theme-pass-b-review-*.md` files plus the fold record
`2026-09-27-theme-pass-b-fold.md`. Review IDs (TH*, CP*, ME*, RK*) are the fold record's.

**Severity:** **blocks** (cannot finish the step as documented), **costs time** (finished, but
only after digging or a workaround), **annoyance** (noticed, cheap to route around).

## What was built

- **Task 1, SIGNAL:** a dark-first Swiss/brutalist theme. Black and signal red
  (`oklch(63% 0.24 28)` dark, `oklch(52% 0.21 28)` light), `--radius-*: 0`, `--border: 2px`, a
  Helvetica/Arial/Nimbus/Liberation system stack with the Fontsource imports dropped, a steep
  non-fluid 1.333 type scale, a space scale about two-thirds of Waymark's, and uppercase 800-weight
  headings. Built with `vite build` and shot with Playwright at 1440 and 390 for home, one article,
  and the styleguide, in both schemes. It took effect everywhere the tokens reach (screenshots in
  `designer/shots/signal*.png`).
- **Task 2, `event-card`:** a `defineComponent` directive in `src/theme/markdown-components.ts`,
  with a title slot, a markdown body slot, and `date`, `location`, `url`, and `linkLabel`
  attributes. It has a `preview` sample, a new `calendar` glyph in `icons.ts`, and token-only CSS
  in `site.css`. It appears in the editor's Insert-block picker under Structure. The two-pane
  configure step rendered the live preview, and Insert wrote the directive. It also renders on a
  post and on `/styleguide`. Under Waymark and SIGNAL, the computed background, radius, top rule,
  face, and heading case all switch (`designer/shots/{signal,waymark}-card-*.png`).
- **Task 3:** ran `check-public-tokens.mjs` and `reskin-fixture.mjs` from a fake root whose
  `examples/showcase` symlinks the copy, ran a small harness over the gate's own exported contrast
  core against SIGNAL, and ran the copy's `npm run check:cairn`.

Step count: about 45 tool steps end to end. Reading was about 10 (docs, README, theme header,
tokens, prose, chrome), Task 1 about 12, Task 2 about 12, and Task 3 about 8. The rest went to
spec and review reading.

## Friction points, in the order hit

### F1. The recipe is a recolor recipe, and a "very different look" falls off it immediately (costs time)

- **Tried:** following `docs/extend/design-your-site.md` ("The re-skin recipe") and the
  `theme.css` header's six steps.
- **Happened:** both describe rotating `--color-primary`'s hue and retuning the base ladder,
  "about fourteen values." Nothing covers the moves that make a look different: heading case and
  weight, a default scheme, rule thickness, pill shapes, or chrome markup that bakes weights into
  utilities. The doc's promise, "a re-skin never touches chassis," held for color only.
- **Expected:** a map from a design intent to the token or file that owns it.
- **Evidence:** `design-your-site.md:32-43`, `theme.css:15-60`.
- **Tag:** **PARTLY**. The `cairn-public` skill's theming section carries a job-to-token table, an
  eyebrow row, and a fast path (spec:263-273; TH9). `design-your-site.md` is fixed under the freeze
  rule (spec:356-358). Neither yet names heading case and weight or the default scheme, which are
  F3 and F4 below.

### F2. The theme names are wired into four files, including an inline script in `app.html` (annoyance)

- **Tried:** naming the theme `signal` / `signal-light`.
- **Happened:** `cairn`/`cairn-dark` appear in `theme.css:97,145,330`, `SiteHeader.svelte:67-79,
  135-138`, and the cookie regex at `app.html:12`. I kept the names instead.
- **Tag:** **ADDRESSED** (TH10: the touchpoints are listed in the skill, and the fixture keeps the
  names).

### F3. There is no default-scheme seam: a dark-first theme breaks the toggle (costs time)

- **Tried:** making dark the default whatever the OS says, with `default: true` on `cairn-dark`.
- **Happened:** daisyUI rendered dark correctly. `chassis/theme-toggle.ts:23-29`
  (`resolveTheme`) still falls back to `matchMedia('(prefers-color-scheme: dark)')`, though. On a
  light-OS machine it reports `cairn`, so the icon shows "switch to dark" on a dark page, and the
  first click is a no-op (it applies `cairn-dark`, which already shows). I fixed it by changing
  the no-cookie branch in `app.html:13` to set `data-theme="cairn-dark"`. That is a fifth
  touchpoint, and nothing documents it.
- **Expected:** the toggle follows whichever theme daisyUI actually applied.
- **Tag:** **NOT ADDRESSED**, theming. The spec's fixture is "a dark-first palette" (spec:318), but
  the harness asserts computed tokens, not toggle behavior. The contrast half is addressed
  (`theme-contrast` resolves schemes from daisyUI blocks, spec:232-234).
- **Leanest fix:** `resolveTheme` falls back to `getComputedStyle(document.documentElement)
  .colorScheme` (daisyUI sets `color-scheme` per theme) instead of `matchMedia`, so a dark-default
  theme works with zero config and no `app.html` edit. Add one fixture assertion: the toggle's
  first click changes the scheme.

### F4. Heading case and weight have no token and are baked into four places (costs time)

- **Tried:** uppercase 800-weight headings.
- **Happened:** the weight is a literal `600` in `chassis/prose.css:79,102,115` and in scoped
  styles (`+page.svelte:190` for `.lead__title`, `EntryRow.svelte:63`). The chrome bakes
  `font-semibold` utilities (`SiteHeader.svelte:101`, `+page.svelte:49`,
  `archive/[page]/+page.svelte:25`). My `@layer components` override of `.font-display` loses to
  the `font-semibold` utility (the utilities layer wins), and the scoped `.lead__title` rule
  (unlayered, higher specificity) beats a theme rule on weight. To get uppercase at all I had to
  target route-private class names (`.lead__title`, `.index__year`) from `theme.css`. That couples
  the theme to page internals. The styleguide's own headings (`sg-*`) stayed mixed-case.
- **Expected:** one heading-weight and one heading-case knob, or at least prose and chrome
  headings that read one token.
- **Tag:** **NOT ADDRESSED**, theming. The spec keeps the scale site-owned (spec:98-109) but never
  names a heading-weight key. The risk lens saw sites reading `--font-weight-semibold` but only as
  a resolution case (RK6).
- **Leanest fix:** two chassis design-scale keys with Waymark's values as defaults:
  `--font-weight-heading` in `@theme` (generates `font-heading`) and a `--cairn-heading-case`
  role. `prose.css` headings, `.lead__title`, and the chrome wordmark and titles read them in place
  of `600` and `font-semibold`. The job-to-token table gets a "headings" row.

### F5. Route-scoped geometry cannot be reached from the theme (costs time)

- **Tried:** square pills on the tag filter.
- **Happened:** `--tag-filter-radius: 999px` is declared inside the home page's scoped `<style>`
  (`routes/(site)/+page.svelte:274`). A `theme.css` rule on `.tag-filter` loses to Svelte's
  hashed selector, so I edited the route and set it to `var(--radius-field)`. The same pattern
  holds for the `border-radius: 2px` focus-ring corners on links (`+page.svelte:198,229,330`,
  `EntryRow.svelte:71`, `ArticleView.svelte:172`), which ignore `--cairn-focus-ring-radius`.
- **Expected:** a template-owned radius reads a daisyUI radius token by default.
- **Tag:** **NOT ADDRESSED**, theming. `public-literals` polices color and font size only
  (spec:200-210), so a literal radius passes, and TH4 makes a local definition legal anywhere.
- **Leanest fix:** in the Waymark template, default `--tag-filter-radius` to
  `var(--radius-selector)` and the five `2px` link-ring corners to `var(--cairn-focus-ring-radius)`.
  That is a template sweep, not a rule. Optionally, `public-literals` gains a `border-radius`
  literal arm at advisory.

### F6. The skip link's hidden position is coupled to the spacing scale (costs time; an a11y regression)

- **Tried:** a tighter space scale (`--spacing-xl: 2rem`).
- **Happened:** a 3px red bar showed at the top-left of every page. The skip link hides with
  `-top-xl` (`routes/(site)/+layout.svelte:74`). Once `--spacing-xl` shrank below the link's
  height, it peeked out. I replaced it with `top-0 -translate-y-[150%] focus:translate-y-0`. This
  is the kind of defect a designer ships without seeing.
- **Tag:** **NOT ADDRESSED**, theming (template chrome). The fixture's "tight" scale would expose
  it only if a screenshot is read.
- **Leanest fix:** the template uses Tailwind's `sr-only focus:not-sr-only` (or a translate that
  does not read a scale key). Add a fixture assertion that the skip link's box lies fully outside
  the viewport until focused.

### F7. The editor preview paints a white body under a dark theme (costs time)

- **Tried:** checking the event card in the Insert-block picker's live preview under SIGNAL.
- **Happened:** the card rendered on a white strip over a black page. `preview-doc.ts:105` pins
  `body{margin:0;background:#fff}`. The site paints its ground on `.cairn-site-shell` (a div), not
  `body`, so the site's CSS never wins that collision the way the comment at `:80-81` promises.
  Waymark hides this only because its default is light. Under Waymark dark, the same white shows.
  I fixed it with a `body { background-color: var(--color-base-100) }` rule in `theme.css`.
  Evidence: `shots/picker-event.png`, plus the frame probe (`body` `rgb(255,255,255)`, `html`
  `oklch(0 0 0)`).
- **Tag:** **NOT ADDRESSED**, theming. The risk lens checked the preview iframe and concluded "no
  change is needed" (review-risk.md:236-237). It checked token reach, not the ground.
- **Leanest fix:** `preview-doc.ts` resets to `background: var(--color-base-100, #fff)`, or
  `Canvas`. Or the chassis paints `body` from `--color-base-100` in `tokens.css`, so every site's
  preview matches its page. Either is one line, and the WATCH comment at `:99-104` already flags
  the literal.

### F8. `/styleguide` is hand-authored, so "every registered directive" is false for a new one (costs time)

- **Tried:** checking the new directive on `/styleguide`, as `design-your-site.md:48-51` directs
  ("every registered directive ... render[s] there").
- **Happened:** the page is a markdown string in `routes/(site)/styleguide/+page.server.ts:85-111`.
  A new directive is absent until you hand-add a sample. The copy also says the page "auto-themes
  with your system light or dark setting" (`styleguide/+page.svelte:156`), which is false for a
  dark-first theme.
- **Tag:** **NOT ADDRESSED**, theming. The spec's coverage gate covers the skill catalogue
  (spec:280-284), not the styleguide.
- **Leanest fix:** the styleguide renders one sample per registry entry from each component's
  `preview` (the picker already serializes a preview into directive markdown), so a new directive
  appears automatically. Or, at minimum, fix the doc sentence and say "add a sample."

### F9. The directive's CSS home is unclear for a site component (annoyance)

- **Tried:** finding where the showcase's own directive CSS lives, to put `event-card` next to it.
- **Happened:** callout, alert, cta, faq, and video are styled in `chassis/prose.css`, the file the
  boundary rule says a theme never touches, while the `banner` demo is in `theme/site.css`, and
  ecxc uses a separate `ecxc-components.css`. The chassis README calls unprefixed directive classes
  "engine-fixed" (`chassis/README.md:55-59`), but the theme's own `build()` chooses them. I put
  `event-card` in `site.css`.
- **Tag:** **ADDRESSED** (CP8: the recipe names both paths, "a `defineComponent` plus rules in
  `prose.css` or a component `<style>`"; TH11 corrects the README sentence).

### F10. The rendering doc shows a leaf-directive syntax that does not dispatch (costs time)

- **Tried:** learning the authoring syntax from `docs/extend/configure-rendering.md`.
- **Happened:** the doc says "an author writes `::callout{tone="tip"}`" (`configure-rendering.md:
  107`). The engine restores a leaf (`::`) or text (`:`) directive to literal prose
  (`src/lib/render/remark-directives.ts:113-116`), and the showcase says so itself
  (`markdown-components.ts:115-117`: "container-only"). Only the content files taught me the real
  `:::name[title]{attrs}` form with the body as the next lines.
- **Tag:** **NOT ADDRESSED**, broader engine docs (not theming). **Fix:** correct the line to
  `:::callout[Title]{tone="tip"}` ... `:::`, filed as an engine docs fix.

### F11. Icon glyphs are fill-only, and the type does not say so (annoyance)

- **Tried:** drawing a `calendar` glyph as a line icon.
- **Happened:** `renderGlyph` sets `fill="currentColor"` and no stroke (`render/glyph.ts:16-23`).
  My outline rendered as a solid square in the picker. The showcase's own line-art `flag` and
  `snowflake` render as near-invisible dashes in its picker today (the Icon and Announcement
  banner rows in `shots/picker-list.png`). `IconSet`'s doc ("a glyph name to SVG path-data map",
  `glyph.ts:7`, `core.md:1081`) never says the paths must be filled shapes in a 256 viewBox.
- **Tag:** **NOT ADDRESSED**, broader engine ergonomics.
- **Leanest fix:** one sentence on `IconSet` ("filled path data on a 0 0 256 256 box; stroke-only
  paths render invisible"), plus a fix to the showcase's `flag`/`snowflake` paths.

### F12. Inserting a component at a line start fuses its closing fence onto the next line (costs time for an editor)

- **Tried:** Insert block, then Event card, then Insert, with the caret at the start of the seed
  post's body.
- **Happened:** the editor text became `...linkLabel="Register"}\nTwo hours ...\n:::The original
  body.` The closing `:::` joins the existing line, so the directive no longer closes. The existing
  e2e (`golden-path.spec.ts:449-453`) asserts only that the opening text is present, so it cannot
  see this.
- **Tag:** **NOT ADDRESSED**, broader engine (the editor's insert path, not theming).
- **Leanest fix:** the insert serializer pads the block with a leading and trailing newline
  whenever the caret's line has text on either side. Assert the full inserted block in the e2e.

### F13. The contrast gate is regex-coupled to Waymark's file shape (blocks, for this theme)

- **Tried:** running `check-public-tokens.mjs` against SIGNAL.
- **Happened:** no-literals passed. Contrast threw `dark prefers-color-scheme :root block not
  found in theme.css` (`check-public-tokens.mjs:297-301`). The parser requires names `cairn` and
  `cairn-dark`, light inks in `:root`, light muted in `@theme`, and a media-guarded dark `:root`
  (`:341-360`). A dark-first theme has none of that shape. `test:reskin` fails the same way,
  since it imports the parser. I measured SIGNAL with the gate's exported core
  (`checkThemeContrastTokens`) and my own block reader: every pair passed, the lowest at 5.34:1
  (dark primary on base-100). The docs also say neither script ships in a site
  (`design-your-site.md:45-50`).
- **Tag:** **ADDRESSED** (`theme-contrast` moves into `cairn-audit`, reads schemes from daisyUI
  blocks with no hard-coded names, and resolves `var()` chains; spec:226-239 and ME10/RK5; the
  successor script and `test:reskin` share one core, spec:241-245).

### F14. The gate never measures base-200, and base-300's role is ambiguous (annoyance)

- **Happened:** SIGNAL uses `base-300` as a near-content line color, since the chassis reads it for
  `hr`, the code-block border, and the footer rule. `base-content` on `base-300` is 1.03:1 (light)
  and 1.44:1 (dark). No text paints there today (only the flourish `hr` glyph uses it as a fill,
  `prose.css:436`), so it is safe. The gate would not notice if that changed. The event card sits
  on `base-200`, and the gate does not check `base-200` either.
- **Tag:** **PARTLY**. The spec adds `base-200` and the callout tint as grounds (spec:236-237).
  `base-300` stays unmeasured, and the role (surface step or rule color) is not named in the
  job-to-token table.
- **Leanest fix:** a job-table row saying the chassis reads `base-300` as the rule and border
  color.

### F15. `cairn-audit` says "clean" but never looked at the public theme (costs time, misleading)

- **Tried:** `npm run check:cairn` in the copy after the whole re-skin.
- **Happened:** `79 files scanned, 17 rules run / 0 errors, 0 advisories`. The default static
  scope is admin-only (`docs/reference/cairn-audit.md:168`), so none of my theme, route, or chassis
  edits were in scope. A designer reads that line as a pass.
- **Tag:** **ADDRESSED** (the public scope with `src/theme`, `src/chassis`, and `src/routes` roots,
  one scope per file, and the no-silent-empty-scope error; spec:185-196, TH6, TH12).

### F16. Dark custom tokens want a hand-synced triple (annoyance for this theme; costs time in general)

- **Happened:** Waymark keeps its dark inks in a media-guarded `:root:not([data-theme])` block and a
  `[data-theme='cairn-dark']` block, "kept in sync by hand" (`theme.css:298-345`). For dark-first I
  inverted it: dark in `:root`, light under `:root[data-theme="cairn"]`. That was cheap only
  because `app.html` now always sets `data-theme` (F3).
- **Tag:** **ADDRESSED** (roles in `@layer theme` on `:root, [data-theme]`, with per-scheme values
  in each daisyUI block and no triple; spec:115-128, TH2/RK5).

### F17. The shipped template's comments point at docs a site does not have (annoyance)

- **Happened:** `theme.css:5,67-68`, `site.css:18,34`, and `prose.css:37-39` cite
  `docs/internal/public-design-system.md` and the custom-surface ledger. The template copies carry
  the same references (`templates/waymark/src/theme/theme.css`: 3, `site.css`: 2, `prose.css`: 1),
  but a scaffolded site has no `docs/internal/`. The header also cites the admin's Warm Stone
  system and "Verdict 7" (`theme.css:62-65,348`), which mean nothing to a site owner.
- **Tag:** **NOT ADDRESSED**, theming (template hygiene). Chain 2 task 11 re-emits `theme.css`
  (spec:374-375) but does not scrub it.
- **Leanest fix:** `check:template` fails on `docs/internal/` or `Verdict [0-9]` in any emitted
  file, and the references become one-line reasons or public doc links.

### F18. `vite preview` keeps serving the previous build's asset hashes after a rebuild (annoyance, tooling)

- **Happened:** after swapping `theme.css` and rebuilding, the card rendered completely unstyled
  (`Times New Roman`, transparent) until I restarted preview. That is Vite and adapter behavior, not
  cairn's. The design loop doc only describes `vite dev`, which avoids it.
- **Tag:** out of scope. At most, add one line to the local-iteration section: "restart
  `vite preview` after a rebuild."

## Pleasant surprises

- **The token reach is real.** After replacing the palette, radii, faces, and scale, the prose
  surface followed at zero edits: code blocks, blockquote rule, inline-code chip, tables, and the
  directives. Only chrome that bakes utilities (F4, F5) resisted.
- **A new directive is cheap.** Adding `event-card` took one `defineComponent` (about 45 lines,
  reading the existing ones), one icon, and about 45 lines of token-only CSS. It then appeared in
  the grouped picker, rendered in the two-pane live preview through the site's own `render()`, and
  inserted working directive markdown (apart from F12). `preview` samples make the configure step
  pleasant.
- **The restyle flip is exact.** The same card under Waymark and SIGNAL changed background, radius,
  rule color, face, and case, with no per-theme CSS (computed values logged in the run and in
  `shots/`).
- **The no-literals half of the gate ran clean on my edits,** and the exported contrast core was
  easy to reuse against a differently shaped theme.
- **The sanitize-then-dispatch order** meant `article`, `time`, and `h3` in `build()` survived
  untouched, with no allowlist work.
- **The chassis README's cascade-layer and `max-w-*` trap notes** are exactly the knowledge a
  Tailwind-fluent designer lacks. They saved a debugging loop when I tightened spacing.

## Summary tags

| # | Item | Severity | Tag | Class |
|---|---|---|---|---|
| F1 | Recipe is recolor-only | costs time | PARTLY (skill table, TH9) | theming |
| F2 | Theme names in four files | annoyance | ADDRESSED (TH10) | theming |
| F3 | No default-scheme seam; toggle wrong on dark-first | costs time | NOT ADDRESSED | theming |
| F4 | Heading weight and case have no token | costs time | NOT ADDRESSED | theming |
| F5 | Route-scoped radii unreachable | costs time | NOT ADDRESSED | theming |
| F6 | Skip link tied to spacing scale | costs time (a11y) | NOT ADDRESSED | theming |
| F7 | Preview body pinned white | costs time | NOT ADDRESSED (RK missed it) | theming |
| F8 | Styleguide not registry-driven | costs time | NOT ADDRESSED | theming |
| F9 | Directive CSS home unclear | annoyance | ADDRESSED (CP8, TH11) | theming |
| F10 | Doc shows `::callout` leaf syntax | costs time | NOT ADDRESSED | engine docs |
| F11 | Icon paths must be filled, undocumented | annoyance | NOT ADDRESSED | engine ergonomics |
| F12 | Insert fuses closing fence onto next line | costs time | NOT ADDRESSED | engine (editor) |
| F13 | Contrast gate shape-coupled to Waymark | blocks | ADDRESSED (theme-contrast) | theming |
| F14 | base-200/300 unmeasured, role unnamed | annoyance | PARTLY | theming |
| F15 | cairn-audit admin-only, says clean | costs time | ADDRESSED (public scope) | theming |
| F16 | Hand-synced dark triple | annoyance | ADDRESSED (`@layer theme`) | theming |
| F17 | Template cites internal docs | annoyance | NOT ADDRESSED | theming (template) |
| F18 | `vite preview` stale after rebuild | annoyance | out of scope | tooling |
