# Theme pass B review: ease of adding a themed component

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` (main, 4365ac34).
**Lens:** can a `cairn-implementer` add a public component, to the engine or to a site, that reads
the theme values and renders right under Waymark and under a different theme with no per-theme work?
**Method:** read the spec, the engine's public markup paths (`src/lib/render`, `src/lib/islands`,
`src/lib/delivery/CairnHead.svelte`, `src/lib/components/PreviewBanner.svelte`), the showcase's CSS
entry points (`src/chassis/tokens.css`, `prose.css`, `src/theme/theme.css`, `src/admin.css`),
`package.json` exports, and `~/.claude/agents/cairn-implementer.md`. I ran two throwaway Tailwind
4.3.3 compiles through `@tailwindcss/node` (the installed version) to check variable pruning. Both
scripts were deleted afterward.

## What exists today (verified)

- **The engine ships no public stylesheet.** Its only CSS export is `./admin-sources.css`
  (`package.json:182`), a single `@source ".";` for the admin build. The public build never imports
  it: `theme.css:82` imports `../chassis/tokens.css`, which runs `@import "tailwindcss"` with
  automatic source detection, and that detection skips `node_modules`. **No class or `var()` in
  the engine's dist is scanned by a site's public Tailwind build.**
- **Engine public markup today is structure, and a copied chassis file styles it.** The render
  pipeline emits `cairn-glyph` (`render/glyph.ts:20`), `cairn-grid` (`rehype-dispatch.ts:32`),
  `cairn-place-*` (`remark-figure.ts:86`), `table-scroll` (`table-scroll.ts:57`), and `pre.shiki`
  with `.cairn-tok-*` (`highlight.ts`). Every rule for these lives in the site's copied
  `chassis/prose.css`, `chassis/tokens.css:184-211`, or `theme/site.css:134-173`. The islands
  runtime emits no styled markup. `CairnHead` renders only `<head>` content.
- **The directive library is the site's, not the engine's.** `callout`, the alert, and the video
  facade are `defineComponent` calls in `examples/showcase/src/theme/markdown-components.ts`, and
  their CSS is in `chassis/prose.css`. Both travel to sites through `templates/waymark`. The
  engine reserves only `figure` and `include` (`registry.ts:158`).
- **The one engine-shipped public component is `PreviewBanner`,** and it sets the posture the spec
  does not mention. It uses a scoped `<style>` with `var(--cairn-preview-*, <literal>)` fallbacks,
  suppresses `token-colors` six times, and its header states the premise
  (`PreviewBanner.svelte:21-23`, `:79-86`): "a consuming site may have neither DaisyUI nor Tailwind,
  so a token reference would resolve to nothing."
- **`chassis/prose.css` already follows the recipe the spec wants.** Every `font-size` reads
  `var(--text-step-*)`, and every color reads a role or a `--cairn-*` key. The chassis component
  path works today. The engine component path does not.

## Findings, ranked by consequence

### 1. Blocker: the spec gives an engine public component no CSS home, so the stated goal cannot be met

- **Location:** spec lines 65-86 (the contract, and the chassis `tokens.css` keeping "what is not a
  default"), 107-112 (`cairn-eyebrow` is a *chassis* class), 154-156 (the implementer line), and
  170-174 (probe 3).
- **Defect:** the spec moves the token *values* into the engine. It leaves every *rule* that reads
  them in the copied chassis. An implementer adding an engine public component has three possible
  CSS homes, and none of them works as specified:
  1. **Tailwind or daisyUI classes in the engine markup.** These never compile, because the site's
     public build does not scan `node_modules`. The implementer definition's DaisyUI-first section
     (`cairn-implementer.md:146-155`) pushes toward exactly this.
  2. **A rule in `chassis/prose.css`.** That file is a copy that freezes at scaffold, which is the
     same defect the spec cites as the reason to move defaults into the engine (lines 75-81). An
     engine component whose CSS lives in a frozen copy renders unstyled on every existing site.
  3. **A scoped Svelte `<style>` reading `var(--token)`.** This fails on pruning; see finding 2.

  The same gap orphans rules the chassis holds today. The spec's sentence "The chassis `tokens.css`
  keeps what is not a default: the Tailwind import, the daisyUI plugin activation, and the import
  of the engine defaults" leaves nowhere for the `pre.shiki` and `.cairn-tok-*` bindings
  (`tokens.css:184-211`) or the `@utility cairn-focus-ring` (`:177-182`). The file's own comment
  calls those bindings "the engine's ... class contract," so they belong to the engine, and they
  are neither defaults nor the Tailwind import. `cairn-eyebrow`, as a chassis class, inherits the
  freeze too: an engine component cannot rely on it being present on an older site.
- **Evidence:** the export list at `package.json:92-183` has no public CSS. `theme.css:82` imports
  the chassis copy, and nothing imports an engine sheet.
- **Proposed fold:** make the new export one **public engine stylesheet** instead of a defaults-only
  file. It holds the defaults (`@theme` plus `:root`) and, in `@layer components`, the rules for
  every class the engine emits: `pre.shiki` and `.cairn-tok-*`, `cairn-focus-ring`,
  `cairn-eyebrow`, and the base structural rules for `.table-scroll` and `cairn-glyph` that are not
  a theme's choice. Any future engine public component adds its rules there. The chassis
  `prose.css` keeps the reading-surface look a theme overrides, and a theme restyles engine classes
  through the ordinary cascade, so the floor principle holds. A developer then has a single answer
  to "where does my engine component's CSS go": the engine sheet, reading contract tokens. The
  subpath name stays open for the plan. The spec should state what the file holds, and a name such
  as `theme.css` or `public.css` beats `theme-tokens.css` once it holds rules.

### 2. Blocker: Tailwind prunes unused `@theme` variables, so an engine component reading a scale key can get nothing

- **Location:** spec lines 65-69 (the scale lives in `@theme`), 84-86 (the planned proof covers
  only *utility generation*), and 170-174 (probe 3).
- **Defect:** Tailwind 4 emits an `@theme` variable only when a scanned source or the compiled CSS
  references it. `:root` variables are always emitted. An engine component in `node_modules` that
  reads `var(--text-step-1)`, `var(--spacing-m)`, or `var(--color-muted)` from a scoped Svelte
  style is not scanned. The variable resolves only if the site happens to use that key somewhere
  else. Waymark and the showcase reference nearly every key, so the fault stays hidden there and
  shows up on a lean site or a new theme.
- **Evidence:** a compile against the installed Tailwind 4.3.3:
  - `@theme { --spacing-m; --text-step-1; --color-muted }` built with only `gap-m` emits
    `--spacing-m` and drops the other two. The `:root { --cairn-x }` variable is emitted.
  - A plain CSS rule in the same build that reads `var(--text-step-1)` keeps the variable, and a
    later site `@theme` override still wins (`1.3rem`).
  - `@theme static` in the engine, followed by an ordinary site `@theme` override of the same key,
    **drops the key again**, because the override replaces the static flag. "Mark the engine
    defaults static" is therefore not a fix.
- **Proposed fold:** fold 1 cures this, since rules in an engine sheet compiled inside the site's
  Tailwind build keep their variables alive. Add three things to the spec:
  1. The planned proof at lines 84-86 must also show that every contract key reaches the compiled
     CSS on a site that uses none of the utilities.
  2. The component recipe states that an engine public component's CSS lives in the engine sheet,
     never in a scoped `<style>` that reads an `@theme` key.
  3. Probe 3 renders under a minimal scaffold (the Waymark template with the showcase's extra
     routes removed), not only under the showcase, where the pruning is masked.

### 3. Major, OWNER FORK: may an engine public component assume the contract exists?

- **Location:** spec lines 58-64 (daisyUI keys are required and "nothing defaults them"), against
  `PreviewBanner.svelte:21-23` and the CLAUDE.md canonical scope ("public output stays
  design-agnostic").
- **Defect:** the spec makes the contract the dependency for engine components, but it does not say
  whether every public cairn site must now load it. `PreviewBanner` was written on the opposite
  premise. The spec does not mention it, and `public-literals` over the engine tree (line 155) will
  flag its six fallback palettes, so the pass has to rule on it either way.
- **Options:**
  - **(a) The contract is required for engine public components.** Every site imports the engine
    sheet, which the chassis already does and the setup command scaffolds. `PreviewBanner`
    migrates to contract tokens (`--color-warning`/`--color-base-*` roles, `--radius-box`), and its
    four `--cairn-preview-*` properties either stay as named overrides with token fallbacks or
    retire under a disclosed change. This gives the simplest recipe: read a token, done.
  - **(b) Engine public components stay contract-optional.** Each one keeps
    `var(--token, <literal>)` fallbacks, so it works on a site with neither daisyUI nor the engine
    sheet. `public-literals` must then allow a literal as a `var()` fallback in engine components.
    Every new component carries two palettes and the dual-scheme media blocks, which is the opposite
    of "easily".
- **Recommendation:** (a). The spec already says every site is rebuilt from Waymark, and the charter
  names DaisyUI and Tailwind as cairn's stack. State it in the contract section: "an engine public
  component may assume the engine stylesheet and daisyUI's theme variables." Add the
  `PreviewBanner` migration to chain 2 as a named task, or record it as a deliberate exemption with
  the reason.

### 4. Major: "the library" is ambiguous, and the answer changes where a component lives

- **Location:** spec line 27 (the goal), 154-156, and 170-174.
- **Defect:** cairn has two component libraries. The engine's is near-empty (built-in `figure` and
  `include`, the structural hast, `PreviewBanner`). The chassis's is the real one: `callout`, the
  alert, the video facade, and the FAQ in `markdown-components.ts` plus `prose.css`, which ship
  through `templates/waymark`. A chassis component works well under the spec as written, because
  its definition and its CSS travel together in the copy while the tokens it reads come live from
  the engine. An engine component needs folds 1 and 2. Probe 3 tests only the engine path, and the
  implementer line only mentions "under `src/lib`". Neither says which library Geoff meant.
- **Proposed fold:** the recipe in the guidance file names both paths in two short paragraphs.
  - **Chassis or site component:** a `defineComponent` in the theme plus rules in `prose.css` or a
    component `<style>`, reading contract tokens.
  - **Engine component:** emitted classes plus rules in the engine sheet, reading contract tokens.

  Then check whether Geoff meant the chassis library. If he did, probe 3 should add a chassis
  directive, and that is the cheaper and more representative probe.

### 5. Major: the implementer line points at the wrong page, and the recipe is split

- **Location:** spec lines 145-156.
- **Defect:** the "recipe for a themed component" lives in
  `skills/cairn-extend/references/public-theme.md`, but the implementer line sends the agent to
  `docs/reference/theme-tokens.md`, a reference page that lists keys and has no recipe. Probe 3 gives
  the agent "only the shipped guidance," which is a third framing. Review lens 3 asks whether the
  component is right "by reading one page," and the spec as drafted names two. The skill's
  `SKILL.md` also routes explicitly to each reference file (`skills/cairn-extend/SKILL.md:14`,
  `:58`), and the spec adds no routing line for `public-theme.md`, so a consumer's agent may never
  load it.
- **Proposed fold:** point the implementer line at `public-theme.md` and add a `SKILL.md` routing
  line to it. The recipe and the job-to-token table then live in that one file, and the reference
  page stays the key list. Also reword the line itself. "Reads only contract tokens" is wrong under
  the floor principle, which permits any token. The accurate rule is "no literals, never a
  Tailwind or daisyUI class in engine public markup, CSS in the engine sheet."

### 6. Minor: the test on the job-to-token table cannot pass as written

- **Location:** spec line 153.
- **Defect:** the table's "body ink" and "card edge" rows are daisyUI keys (`--color-base-content`)
  or `@theme` keys, and "a test asserts every token its table names exists in `theme-tokens.css`"
  would fail on the daisyUI rows.
- **Proposed fold:** "exists in the engine sheet or in daisyUI's theme key list," using the same
  source as `theme-conformance`.

### 7. Minor: `cairn-eyebrow` as a `@utility` would also be pruned for engine markup

- **Location:** spec lines 105-112.
- **Defect:** if `cairn-eyebrow` is an `@utility` like `cairn-focus-ring`, Tailwind emits it only
  when a scanned source uses it, so an engine component that emits the class gets no rule on a site
  that never writes it.
- **Proposed fold:** make it a plain `@layer components` rule in the engine sheet (fold 1), or state
  that engine markup never emits it. Otherwise this is fine.

### 8. Minor: the site-developer path works, but a line should say why

- **Location:** spec lines 116-119 (the default roots include `src/lib/components`).
- **Finding, not a defect:** a site developer's component under `src/lib/components` is scanned by
  Tailwind, so utilities such as `text-step-1`, `text-muted`, `bg-base-200`, and `rounded-box`
  compile, and a scoped `var(--token)` keeps its variable, because Tailwind extracts the bare
  `--name` from the source. The site path is already easy, and `public-literals` plus the recipe
  are the right amount of help. The asymmetry with the engine path (finding 2) is the reason the
  recipe must separate the two paths. The `site-implementer` definition gains no line, so the site
  path relies on the shipped skill alone. That is acceptable, since the shipped skill is what a
  consumer's agent reads.

## Cuts argued from this lens

- **Keep:** `public-literals`, the job-to-token table, `theme-conformance`'s `var()` resolution
  check (for a component author it is the check that catches a misspelled key), and the fixture
  theme with probe 3. These directly serve the goal once folds 1 and 2 land.
- **Merge:** the three guidance homes (the reference page, `public-theme.md`, and the implementer
  line) should resolve to one recipe page (fold 5). No home is cut, but only one carries the recipe.
- **Out of scope for this lens:** `theme-contrast` and ink derivation serve theme authors, not
  component authors. This lens takes no position on cutting them. Derived inks help a component
  author indirectly, because a status-colored component reads right under a new theme for free.

## Net verdict

The token half of the contract is sound, and the site and chassis component path is already easy.
The engine component path, which is the one Geoff's sentence and probe 3 name, does not work as
specified. The spec ships the values without a home for the rules that read them, and Tailwind's
variable pruning makes the obvious workaround, a scoped Svelte style, silently fail outside the
showcase. One reframe fixes both: the export becomes the engine's public stylesheet (defaults plus
engine-class rules), and probe 3 runs on a minimal site. Finding 3 is Geoff's call.
