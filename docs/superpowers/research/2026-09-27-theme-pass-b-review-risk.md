# Theme identity pass B: upgrade and failure-risk review

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at `4365ac34`.
**Lens:** data integrity and failure risk, read as upgrade and failure risk for a CSS and tooling
change. What happens to a production site on upgrade, and where a render can silently change or a
build or tool can silently break.
**Method:** read from source: the Waymark chassis (`templates/waymark/src/chassis/tokens.css`,
`prose.css`, `composition.css`, `src/theme/theme.css`), the audit (`src/lib/audit/config.ts`,
`run.ts`, `rules/static/*`), `package.json`, the publish and test workflows, and the five sites'
`src/chassis` and `src/theme` (read-only). Tailwind behavior was probed with the installed
`tailwindcss@4.3.3` `compile()` API in the scratchpad, not recalled.

Six findings rank major, four minor. The governing principle survives this lens. Most findings
are spec omissions that a plan would fill wrongly by default, not design errors.

## Major

### 1. Tailwind prunes the engine defaults a library component reads, so the library-component goal fails silently

- **Location:** spec lines 75-86 ("Why the defaults move into the engine"), 105-112
  (`cairn-eyebrow`), 167-174 (probe 3).
- **Defect:** Tailwind 4 emits a `@theme` variable only when something in the scanned sources
  or the CSS uses it. Tailwind's automatic source detection skips `node_modules`, so an engine
  public component's `var(--tracking-eyebrow)` or `class="cairn-eyebrow"` never registers as a
  use. The spec's own rationale is "an engine component that reads a newer key then fails
  silently on an older site." Under this design, it still fails on any site whose own sources do
  not happen to reference the key too.
- **Evidence (probe, tailwindcss 4.3.3):**
  - `@import "pkg"` with `@theme { --tracking-eyebrow: 0.08em; --text-step-2: …; --spacing-m: … }`
    and no candidates emits only `--text-step-2`, because a `:root` rule in the CSS reads it.
    `--tracking-eyebrow` and `--spacing-m` are dropped.
  - Passing the bare candidate `--tracking-eyebrow`, which is what a scanned `.svelte` file
    yields, restores it. Site sources are therefore safe, and engine sources are not.
  - `@theme static` in the package file fixes the prune in isolation. It is lost as soon as a
    theme redeclares the key in an ordinary `@theme` block: `@theme static { --tracking-eyebrow }`
    followed by `@theme { --tracking-eyebrow: 0.12em }` emitted nothing for it. Waymark does
    exactly that at `theme.css:233`.
  - A `@utility cairn-eyebrow` would be pruned the same way when only engine markup uses it.
- **Why the proof misses it:** probe 3 renders under the showcase. The showcase's own sources
  reference nearly every scale key, which masks the prune. A leaner consumer does not.
- **Proposed fold:**
  - `theme-tokens.css` carries a `@source` directive, resolved relative to itself, that points
    at the engine's public component directory in `dist`. That makes engine markup a scanned
    source on every consumer.
  - `cairn-eyebrow` ships as a plain rule in `@layer components`, never as a `@utility`.
  - Extend the plan's "`@theme` utility-generation proof" (Open for the plan, line 241) with a
    second assertion: a key referenced only by an engine component is emitted in a minimal
    consumer build.
  - Run probe 3's render check in a minimal fixture site, not only in the showcase.

### 2. `theme-contrast` in the shipped audit imports a devDependency, so `cairn-audit` crashes on every consumer

- **Location:** spec lines 133-136.
- **Defect:** the rule "resolve[s] `var()` and `color-mix` through culori" and moves into
  `cairn-audit`, which ships as `dist/audit/bin.js`. culori is a `devDependencies` entry
  (`package.json:267`), and consumers do not install dev dependencies. If the rule sits in the
  static registry that `bin.ts` imports, the import fails at load. Every `npx cairn-audit` run
  then fails with `ERR_MODULE_NOT_FOUND`, including admin-only runs.
- **Evidence:** today `src/lib/audit/color.ts` deliberately never parses color and hands strings
  to the browser canvas. No file under `src/lib` imports culori. No gate checks that `dist`
  imports only declared `dependencies`: `peer-deps.test.ts` covers framework peers only. CI
  runs the audit inside cairn's own tree, where culori is installed, so no gate catches the
  crash.
- **Proposed fold:**
  - The spec names this as a runtime dependency decision. Either promote culori to
    `dependencies` through the `dependency-upgrade` survey, or keep the color math
    dependency-free.
  - The plan adds a smoke test that runs `dist/audit/bin.js` from an `npm pack` install into an
    empty directory.

### 3. The public scope's default roots overlap the admin rules and omit `src/chassis`

- **Location:** spec lines 116-119, 154-156.
- **Defect (overlap):** the default roots include `src/lib/components`.
  - In cairn's own tree, that directory holds the admin components. `public-literals` and
    `theme-conformance` would run over the admin. `ConfirmPage.svelte:48` has
    `text-[1.375rem]`. The admin reads `--cairn-type-*` from `cairn-admin.css`, which is none
    of theme, `theme-tokens.css`, or daisyUI. `PreviewBanner.svelte:94-123` uses hex fallbacks.
  - In a consumer, `src/lib/components` is already in `DEFAULT_STATIC_SCOPE`
    (`config.ts:15-19`). The admin rules `token-colors` and `type-scale` run there at **error**
    tier (`token-colors.ts:94`, `type-scale.ts:39`). A public component would be judged by two
    vocabularies. `type-scale` demands `--cairn-type-*`, while the public contract says
    `--text-step-*`.
  - "The engine's public component directories" is never named.
- **Defect (omission):** the roots leave out `src/chassis`, where `prose.css` and
  `composition.css` live in every site and in the template. The spec says `theme-conformance`
  "closes the hole" of `prose.css` reading `--radius-*` and `--border` with no fallback. As
  scoped, the rule never reads `prose.css`.
- **Proposed fold:**
  - Name the roots explicitly: `src/theme`, `src/chassis`, and `src/routes` minus
    `src/routes/admin`.
  - Name one engine directory for public components, so cairn's tree has a real public root
    that is not `src/lib/components`.
  - State that a file in both scopes is judged by the public rules only, or drop
    `src/lib/components` from the public defaults and let a site add it by config.

### 4. The chassis residue list drops live rules, and the migration is not a one-line swap

- **Location:** spec lines 83-86, 183-185.
- **Defect:** the spec says chassis `tokens.css` keeps "the Tailwind import, the daisyUI plugin
  activation, and the import of the engine defaults." `tokens.css` also holds four other things
  (`templates/waymark/src/chassis/tokens.css:48-50, 177-211`):
  - the `prose.css` and `composition.css` imports
  - `@source not "./.claude"`
  - `@utility cairn-focus-ring`
  - the `pre.shiki` and `.cairn-tok-*` bindings in `@layer components`

  Read literally, the move deletes code-block highlighting colors and the focus-ring utility.
  Neither is a token, so neither lands in `theme-tokens.css` under the spec's own description
  of it.
- **Defect (migration):** the `Consumers must:` line promises a "one-line swap." Every site's
  copy is stale, which is expected. At least one site also added a key of its own to the copy:
  - aksailingclub-org declares `--text-step--2` in `src/chassis/tokens.css:86`.
  - That key is read by its chassis `prose.css:398` and by `PortalRail.svelte` and
    `MemberMasthead.svelte` (six reads).
  - Deleting the copied defaults drops the key. The `font-size` declarations become invalid at
    computed time and fall back to inherited sizes, with no build error.
  - The same site's `cairn-audit.config.json` names `src/chassis/tokens.css` as a
    `paletteFiles` entry.
- **Side signal:** xcathletes-org and cairn-pub also define `--text-step--2`, in their themes.
  Three of five sites need a step the contract lacks, so the harvest suggests adding it to the
  defaults. Taking that is an owner-level scope call, not a correctness fix.
- **Proposed fold:**
  - The spec states where every rule in today's `tokens.css` lands, engine or chassis.
  - The `Consumers must:` line becomes: move any key your copy adds beyond the template's into
    your theme, then replace the copied defaults with the import.
  - The migration note names the `paletteFiles` entry.

### 5. Engine `:root` role defaults sit unlayered, so a layered theme override loses silently

- **Location:** spec lines 65-70 ("cairn's roles in `:root`"), 36-40 (the principle: "restyle
  anything through the ordinary cascade").
- **Defect:** today's chassis declares the `--cairn-*` roles in unlayered `:root`. Waymark
  overrides them unlayered and later, so it wins by source order. A theme author who follows
  Tailwind 4 idiom and writes an override inside `@layer base`, or puts a `--cairn-*` key in
  `@theme`, loses that override:
  - `@theme` emits into `@layer theme`.
  - An unlayered declaration beats any layered one.
  - The engine default wins, with no warning.

  Today the default sits in an editable copied file, where an author can see it. After the move
  it sits in `node_modules`, which makes the loss harder to diagnose. This happens during the
  re-skin workflow the initiative exists to serve.
- **Proposed fold:**
  - Declare the `:root` role defaults inside `@layer theme`, the lowest layer Tailwind's import
    already declares. Any theme override, layered or not, then wins.
  - Waymark's overrides stay unlayered, so its render does not move. The `site-visual` baseline
    proves that.
  - Optionally, `theme-conformance` flags a `--cairn-*` key declared in `@theme`.

### 6. `theme-conformance`'s resolve set gives false positives on sites and a false pass on unmigrated sites

- **Location:** spec lines 128-132, 138-139.
- **Defect (false positive):** a `var(--x)` must resolve to "the theme, `theme-tokens.css`, or
  daisyUI." That set omits two sources:
  - **Tailwind's own theme variables.** The sites read `--font-weight-semibold` (5 times) and
    `--font-weight-medium` (twice) in public markup.
  - **Custom properties declared locally.** Examples are `composition.css`'s `--cairn-card-*`
    and `--cairn-band-*`, `prose.css`'s `--cairn-mark-url`, and Svelte style props.

  While the rule is advisory, this is noise. After the promotion to error, it breaks sites.
- **Defect (false pass):** on a site that has not migrated, the defaults live in its copied
  `src/chassis/tokens.css`. If the rule credits `theme-tokens.css` because the package is
  installed, it reports a key as defined even though the site's stylesheet never imports it.
  The rule then misses exactly the stale-copy failure the spec was written to end.
- **Proposed fold:**
  - Resolve against three sources: the site's actual public import graph (does the entry
    reach `theme-tokens.css`?), `tailwindcss/theme.css`, and any custom property declared
    anywhere in scope.
  - Add one finding for "public stylesheet does not import `theme-tokens.css`," and one for "a
    chassis file redeclares an engine default." Together they turn the `Consumers must:` line
    into a machine-detected tripwire, as CLAUDE.md's watch-item rule asks.

## Minor

### 7. The template on `main` imports an unpublished subpath during the hold window

- **Location:** spec lines 186 and 213-214 (no release; batches with pass A).
- **Defect:** `templates/waymark/package.json:23` pins `@glw907/cairn-cms` `^0.97.0`. After
  the merge, its `tokens.css` imports `@glw907/cairn-cms/<subpath>.css`, which no published
  version exports. A C3 `--template` or Deploy-button build from `main` then fails to resolve
  the import. CI never builds the template against the registry (`test.yml:91-94` runs only
  `check:template`). The template is marked pre-release, so few users are exposed.
- **Proposed fold:** one sentence in the spec or plan that accepts the window knowingly, or
  that notes that the release cut closes it.

### 8. Derived inks compute once at `:root`, so a nested `data-theme` region inherits the page's ink

- **Location:** spec lines 91-98.
- **Defect:** a custom property that uses `var()` resolves on the element where it is
  declared, then inherits as a computed value. A daisyUI-idiomatic dark band
  (`<section data-theme="…-dark">`) would inherit inks mixed from the root theme's fill and base
  content. The same already holds for `--color-muted` and `--color-card-border`, so the problem
  predates this spec. The new promise that "the ink follows the fill" makes it more visible. No
  production site uses nested `data-theme` today.
- **Proposed fold:** declare the derived defaults on `:root, [data-theme]` inside the layer
  from finding 5, or state the limit on the reference page.

### 9. "Promotion to error at the next minor" is unanchored

- **Location:** spec lines 138-139.
- **Defect:** releases batch, per CLAUDE.md, so "the next minor" might mean the same release or
  one months away. Rough counts of literals outside the exempt theme custom-property lines are:
  - ecxc-ski: 12
  - aksailingclub-org: about 24
  - xcathletes-org: about 10
  - 907-life and cairn-pub: near zero

  No site runs `cairn-audit` in CI today, so the promotion breaks manual and pass-gate runs, not
  deploys.
- **Proposed fold:** tie the promotion to a named release, gated on each production site's
  advisory count reaching zero, whether by fixes or reasoned suppressions. Findings 3 and 6 must
  land first.

### 10. A partial migration silently cancels ink derivation

- **Location:** spec lines 100-103, 183-185.
- **Defect:** a site might add the engine import but keep its old copied `:root` block. The
  chassis's later `--cairn-*-ink: var(--color-*)` then overrides the engine's derived default
  by source order. All five sites hand-set all four inks in light and dark, so no production
  render moves today. A future theme built on such a site would miss derivation without any
  signal.
- **Proposed fold:** covered by finding 6's "chassis redeclares an engine default" check. No
  separate work.

## Checked and sound

- **Package `@theme` generates utilities.** A `@theme` block inside a package stylesheet reached
  through `@import` does generate its utilities in tailwindcss 4.3.3 (`gap-m` and
  `tracking-eyebrow` both emitted). A later site `@theme` block overrides the package value. The
  plan's open proof point is low-risk, apart from the prune in finding 1.
- **Double definition.** A stale copy plus the engine import is harmless while values match. The
  later declaration wins, and `@import` placement guarantees the engine file comes first.
- **Status inks.** All five sites and Waymark override all four inks in `:root` and in both dark
  blocks (3 or 6 declarations each). The derivation default changes no production render.
- **Preview iframe.** `preview-doc.ts:73` links the site's compiled stylesheets, so engine
  defaults reach the preview through the same import. No change is needed.
- **Admin side.** The admin reads the same names (`--cairn-shadow`, `--cairn-warning-ink`,
  `--color-muted`), but `cairn-admin.css` defines them on its own wrapper (lines 227-428). The
  public sheet is not loaded on admin routes. The engine `:root` defaults therefore do not
  collide, and admin fallbacks are unaffected.
- **Prose.css replacement and missing theme folder.** A theme that replaces `prose.css` is
  outside this lens's failure surface, since the principle permits it and nothing in the engine
  hard-depends on prose rules. A site with no `src/theme` is safe: `readScope` skips a missing
  default root and throws only for a root the config names (`run.ts:54`), so the public scope
  still reads `src/routes`.
