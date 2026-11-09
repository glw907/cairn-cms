# Checking a theme

Contents: the theme check, its rules, the viewer, the control page's check action, the audit command
a site runs, what each audit rule requires, the scope, the import chain, config keys, what
theme-contrast leaves unmeasured, resolving a finding.

A theme is checked two ways. The theme check runs from the cairn-cms repository over a theme
directory and gives one verdict. The audit runs from a site's root over the files the site holds.
The theme check's `audit` rule runs the audit's three theme rules, so a theme that passes the check
has passed them.

## The theme check

From the cairn-cms repository:

```bash
npm run check:theme -- themes/waymark
npm run check:theme -- <themeDir> --json
npm run check:theme -- <themeDir> --rules paths-required,fonts
npm run check:theme -- --catalog
```

The check prints `check:theme: <id> pass` or `fail`, then one line per failure with its rule, file,
and message. `--json` prints the verdict as one document that validates against
`schema/cairn-theme-check.schema.json`: a `failures` list of `file`, `rule`, and `message`, and a
`notes` list of what a passing rule measured. `--rules` runs only the named rules. `--catalog` checks
every theme in `templates/catalog.json` and fails when the catalog names no theme or an entry's
directory is missing. The `test` job in CI runs `--catalog` on every push, and a release waits on
that job, so a catalog theme that fails the check cannot ship.

One defect fails one rule. Each rule below owns a kind of defect and leaves the others to its
neighbors.

| Rule | Fails when |
|---|---|
| `manifest-schema` | `cairn-theme.json` is missing, is not JSON, or breaks `schema/cairn-theme-1.schema.json`. |
| `contract-version` | The manifest's `contract` is not the version the check reads. |
| `tokens-schema` | `tokens/tokens.json` or `tokens/resolver.json` breaks the DTCG 2025.10 schema, or the resolver cannot resolve. |
| `resolver-options` | A resolver modifier has no manifest option, an option has no modifier, or an option's values and the modifier's contexts differ. |
| `paths-required` | A path the contract requires, or a file the manifest names, is missing. |
| `paths-unlisted` | A file sits at a path the contract does not list. Files under `fonts/` belong to the `fonts` rule. |
| `tokens-stale` | A built file differs from what `scripts/theme/build-tokens.mjs` writes from the tokens. |
| `tokens-required` | A token name in the contract's `tokens.required` is not declared by the theme's built sheets in each color mode and option value. |
| `render` | The viewer's headless run, over every standard and conformance page under each option value in both modes at 1440 pixels, hits a build error, a status other than 200 (the 404 pages excepted), a console error, or runs no page. |
| `directive-styled` | A class in `src/chassis/directives/classes.json` is styled by no sheet the theme loads. The report names the sheet that styles each class. |
| `audit` | `cairn-audit`'s `theme-contrast`, `theme-conformance`, or `public-literals` rule reports a finding, or the run measured no theme block. |
| `fonts` | A file under `fonts/` is not woff2 or is named by no manifest font, a font has no SPDX license, or a font's files add up to more than 400 KB. |
| `external-host` | A CSS `url()` or `@import`, or a component's `src` or `href`, names a URL with a scheme or `//`. |

Only `render` builds a site. It takes minutes, so run the other rules with `--rules` while editing
and run all of them before calling a theme finished.

## The viewer

`npm run theme:view` renders the standard content and the conformance set under any theme, option,
color mode, and width. It runs on a workstation with no Cloudflare account: it builds a scratch copy
of the showcase, binds every D1, R2, and KV binding locally, and never calls a Cloudflare API or
reads a wrangler login. It finds themes only through `templates/catalog.json` and each theme's
manifest, or a directory passed to `--theme`.

```bash
npm run theme:view -- --theme themes/waymark
npm run theme:view -- --headless --pages all --widths 390,1440 --modes light,dark
npm run theme:view -- --headless --pages / --widths 1440 --viewport-only --option accent=ember,tide
```

Interactive mode serves a control page and prints one JSON line with its address and the site's.
The page lists every route, the catalog's themes, each option's values, the color modes, and five
widths (320, 390, 768, 1440, and 2560 pixels), and shows the site in a frame. An edit under the
theme directory copies across, and an edit to `tokens/tokens.json` or `tokens/resolver.json` reruns
the tokens build first. `THEME_VIEWER_PORT` and `THEME_VIEWER_SITE_PORT` pin the two ports.

Headless mode builds once per option combination and color mode, loads each page in Chromium, saves
a full-page PNG (the first screen under `--viewport-only`), and prints a JSON list with each page's
`status`, `options`, `mode`, `width`, `file`, and `consoleErrors`. It is how `themes/<id>/screenshots/`
is made: the catalog images are the home page at 1440 by 960 in light and dark, and at 390 wide in light.

The control page's "Run the check" button runs the theme check on the loaded theme and shows its
`--json` document.

## The audit

The audit runs from a site's root:

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

A run of only these rules needs no built admin stylesheet; plain `npx cairn-audit` adds the admin
rules and does need it. All three are advisory on a consumer: a finding never changes the exit code
unless the run sets the `fail-on` flag to `advisory`. `theme-conformance` needs `daisyui` and
`tailwindcss` installed beside the site, `theme-contrast` needs `daisyui`; a missing one exits
nonzero and names the install command. The report ends with a `Measured:` block that names each
daisyUI theme block a rule read and the file that holds it, and says `measured nothing` when the run
read none, so an empty scope never reads as a clean theme.

## What each audit rule requires

- **`public-literals`.** No color literal (hex, `rgb()`, `hsl()`, `oklch()`, `color()`, a named
  color) and no absolute font size (`px`, `pt`, `rem`) in a CSS declaration, a `style=` value, a
  `style:` directive, or a Tailwind arbitrary value such as `text-[#abc]`. `transparent`,
  `currentColor`, `em`, `%`, `var()` and `calc()` over tokens, and stock utilities (`bg-red-500`)
  pass. A custom-property definition is legal anywhere under a theme root, and the root `font-size`
  is exempt. A Sass or Less `<style lang>` block is reported unparsed and the run continues.
- **`theme-conformance`.** Each `@plugin "daisyui/theme"` block defines every key daisyUI's theme
  object carries, `color-scheme` included, unless it is named after a built-in daisyUI theme
  (`nord`), which daisyUI merges. A scope with no theme block is a finding. A `var()` with no
  fallback must resolve through the import chain, a Tailwind variable, a complete theme block, or a
  custom property declared in the scanned tree. Also a finding: the chain never imports
  `cairn-public.css`; a chassis file redeclares a default the sheet sets (a stale `tokens.css`
  copy); an `@theme` block declares `--font-<name>` beside `--font-weight-<name>`, so the weight
  utility never generates.
- **`theme-contrast`.** Text pairs clear 4.5:1 and the focus ring 3:1, in sRGB and display-p3, in
  every scheme. Pairs: body text on `--color-base-100` and `-200`; `--color-primary` on
  `--color-base-100` (the link); each role's `-content` on its fill; `--color-muted` on both bases;
  each status ink on both bases and its callout tint; each `--cairn-code-*` role on
  `--cairn-code-bg`; the focus ring on both bases. Each daisyUI block is measured as a page naming
  it through `data-theme`; the default block also as an unnamed page on a light OS, the
  `prefersdark` block on a dark OS. A value the resolver cannot evaluate is reported unmeasured,
  never passed.

## The public scope

The rules read the `.svelte` and `.css` files under `public.scope` minus `public.exclude`, and no
others, so a theme drafted elsewhere must be copied into `src/theme/` first. No file answers to two
scopes: the public scope never claims a file under an admin root (`static.scope`,
`static.adminScope`) or a file named in `static.cssFiles`. Paths are normalized (`./src`, `src/`,
and `src` are one root).

Failures: a root written into `public.scope` that does not exist fails the run; so does one that is,
or lies under, a `public.exclude` path (the message names both) unless an admin root reads it. When
a run selects a public rule and the roots match no file, the run fails naming `public.scope`, so an
empty scan never reports clean. A default root the tree lacks is skipped, and a run with no public
rule never reads the scope. To confirm a file is covered, put `style="color: #abc"` in it, expect a
`public-literals` finding naming it, then remove it.

## The import chain

`theme-conformance` and `theme-contrast` read the site's real stylesheets, starting at each
`public.stylesheets` entry and following every `@import` in order. Relative paths resolve from the
importing file (`./tokens` reads `tokens.css`). Package specifiers resolve through the package's
`exports` map under the `style` condition, then its `style` field, then the plain path; Node
resolution is never used, and `tailwindcss` is not followed (its variables come from its theme
file). `layer()`, `source()`, and `supports()` modifiers are accepted, and a `layer()` import is
read as unlayered.

An entry you wrote into `public.stylesheets` that does not exist fails the run; the default
`src/theme/theme.css` is listed as unread when the tree lacks it. An import the audit cannot read (a
package not installed, an unexported subpath, a missing file) is never a finding: it is listed under
Unread imports at the end of the report. An import resolving to a non-CSS file is a finding and is
not parsed.

## Config keys

In `cairn-audit.config.json` at the audited root, or the `config` flag with a path:

| Key | Default | Rule |
|---|---|---|
| `public.scope` | `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`, `src/lib/components` | Naming it replaces the defaults |
| `public.exclude` | `src/routes/admin` | A list you write merges with the default |
| `public.themeRoots` | `src/theme`, `src/chassis/tokens.css` | Where a design value may be defined; a definition there is never a `public-literals` finding |
| `public.stylesheets` | `src/theme/theme.css` | Entry sheets whose chain is audited; name a second to audit an overlay layered after the theme |

## What theme-contrast leaves unmeasured

It follows `var()` chains to a literal and evaluates one `color-mix()` form: two operands, `in oklab`
or `in oklch`, exactly one percentage. Unmeasured: a relative color (`oklch(from ...)`),
`light-dark()`, a third operand, a hue interpolation method, another mixing space, `currentColor`,
a `var()` inside a color function.

The cascade is static. It measures the root element only, so a nested `data-theme` region is
outside it. A media query applies when its only features are `prefers-color-scheme` tests; `print`
never applies. A positive `@supports` applies and a `not` one never does. A selector matches the
root only when every part is `:root`, `html`, `:host`, `*`, a `data-theme` test, or `:where()`,
`:is()`, `:not()` over those. A root custom property set under any other condition (a width query,
`:root.dark`, a block whose `root` option is another element) makes every pair reading it
unmeasured.

## Resolving a finding

| Symptom | Cause | Fix |
|---|---|---|
| `theme-contrast` flags a status ink after a fill change | the overridden ink no longer clears 4.5 on the new callout tint | retune the ink beside its fill, or delete the override |
| `theme-contrast` flags `--color-muted` or a link after a page color change | a hand-tuned value no longer clears 4.5 on the new base | retune it in that block |
| `theme-conformance`: a `--cairn-cta-*` key or `--cairn-caption-tracking` resolves to nothing | read, defined nowhere | declare it in the theme |
| `theme-conformance`: a chassis file redeclares a default | stale `tokens.css` copy | replace it with the import |
| `public-literals` on a color | a literal outside a token | move it to a token (`references/retheme-by-tokens.md`) |

The audit reads values and never replaces the page. Also start the dev server with
`CAIRN_DEV_BACKEND=1` (the scaffold's `npm run dev` sets it, and `/admin` opens as an owner with no
sign-in email), open an entry in the editor, and confirm the preview renders in the theme's styles
on the `--color-base-100` ground of the OS scheme. A scaffolded site carries a sample
post that shows every element; open `/posts/every-element-on-this-site`, which renders the type scale
and each directive against the current `theme.css`.

To build-check a theme directory without touching a site, from the cairn-cms repository run
`node scripts/lab/theme-fixture.mjs --build-only --theme-dir <dir>`. It overlays the directory onto
`src/theme` in a temporary copy of the showcase, builds, and smoke-loads the pages.
