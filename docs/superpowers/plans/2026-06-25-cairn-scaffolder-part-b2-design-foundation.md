# Scaffolder Part B2: the design foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is a design pass: Phase A (the frontend-design loop) is main-loop creative work that produces the concrete visual design; the later tasks are `cairn-implementer` tasks that consume Phase A's output. The dispatch model is the cairn orchestrate-and-verify default.

**Goal:** establish cairn's public visual language and a first-class, re-skinnable DaisyUI 5 oklch token layer on the showcase, restyling the chrome and authoring a bespoke token-bound reading surface, with Home mocked against the tokens and a `/styleguide` route that proves a one-edit re-skin.

**Architecture:** the public side adopts Tailwind 4 + DaisyUI 5 for the first time (it is plain-CSS today). A `frontend-design` loop sets the visual design against the bar in [`docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md`](../specs/2026-06-25-cairn-b2-design-bar.md); the settled values feed a two-tier token layer (a DaisyUI `@plugin "daisyui/theme"` oklch block plus cairn-authored type/space/measure tokens) that both the chrome and a bespoke reading surface read, so one token edit re-skins both. Build-time syntax highlighting moves into the engine render pipeline, emitting CSS-variable tokens bound to the same DaisyUI roles. Two ordered gates close the pass: the visual-design critique, then the token-layer adversarial review.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind CSS 4 (`@tailwindcss/vite`), DaisyUI 5 (oklch theme system), Shiki (build-time highlighting in the engine pipeline), culori (oklch contrast math in CI), `@glw907/cairn-cms` engine (`file:../..`), Playwright, GitHub Actions, Node 22.

## Global constraints

- **The design bar is the acceptance contract.** Every visual and token decision is judged against
  [`docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md`](../specs/2026-06-25-cairn-b2-design-bar.md).
  The settled direction is fixed: a distinct editorial display face over a legibility-grade humanist sans
  body (mono only for code), and a warm-tinted oklch paper-and-ink ground with one restrained accent. The
  exact faces and values are Phase A's output.
- **The default is the product, and it showcases adoptable components.** Most users keep template
  defaults, so the default must be excellent, 2026-modern-not-trendy, and evidence-grounded (the bar's
  "Design principles" section), and it must demonstrate a useful set of cairn components (the directive
  registry and the own-it public components) a user can adopt or extend in place. GATE 1 tests against the
  principles.
- **Node 22** everywhere in CI. Copied from `test.yml`.
- **DaisyUI 5 / Tailwind 4 / Svelte 5 runes.** The public theme rests on DaisyUI 5's `@plugin
  "daisyui/theme"` oklch role variables, the same spine the admin's Warm Stone uses, but a structurally
  separate palette. Hold the token grammar identical to the admin; vary only the palette.
- **Worktree edits target the worktree path.** Every Edit/Write uses the worktree checkout, never the main
  checkout. Run `npm run package` (root) before any `npm test` or showcase build so the dist the showcase
  consumes is current. See the `worktree-edits-target-worktree-path` and `cairn-worktree-needs-dist-build`
  memories.
- **Lockfile discipline.** A graph-changing `examples/showcase/package.json` edit regenerates and commits
  `examples/showcase/package-lock.json` in the same commit; CI installs it with `npm ci`. The new public
  deps (`tailwindcss`, `@tailwindcss/vite`, `daisyui`) are graph-changing. See the
  `cairn-root-lockfile-drift-npm-ci` memory.
- **The preview frame must match the public page.** The editor preview iframe links the site's stylesheets
  through the `PreviewConfig` (`examples/showcase/src/lib/cairn.config.ts`, `preview.stylesheets`). The new
  public theme CSS must be referenced there too, as a `?url` import, so the preview reproduces the public
  reading surface. A reader and an author must see the same article.
- **The emitted template must still build (the B1 rot gate).** `scaffold.yml` emits the showcase and runs
  its `npm run check` and `npm run build`. B2's public Tailwind/DaisyUI build must succeed in the emitted
  tree, not only in the worktree. Treat a green local emit dry-run as the gate.
- **No bare em dash in code comments** (the `house/no-em-dash-in-comments` ESLint rule over `src/lib`).
  Engine TSDoc follows the TSDoc standard. Vale advisory findings on `docs/**` do not gate.
- **Build-time highlighting only.** The reading-route client bundle must contain no syntax highlighter
  (Shiki, Prism, hljs). Highlighting runs at render/build in the engine pipeline.

## Setup before Task 1

Run once from the main checkout at `/home/glw907/Projects/cairn-cms`:

```bash
git worktree add ../cairn-cms-part-b2 -b feat/scaffolder-b2-design-foundation main
cd ../cairn-cms-part-b2
ln -s /home/glw907/Projects/cairn-cms/node_modules node_modules
npm run package
npm ci --prefix examples/showcase
```

Baseline the gate before changing anything (all must pass): `npm run check` (0/0), `npm test` (EXIT 0),
and the showcase e2e `npm --prefix examples/showcase run test:e2e` (30/30). If a baseline is not green,
stop and report; B2 must not be blamed for a pre-existing failure. All paths below are relative to the
worktree root `../cairn-cms-part-b2`.

---

## Task 1: wire Tailwind 4 + DaisyUI 5 onto the public side

The public side has no Tailwind or DaisyUI today. This task installs them and stands up an empty public
theme stylesheet, with nothing styled yet, so later tasks have the toolchain. No visual design lands here.

**Files:**
- Modify: `examples/showcase/package.json` (add `tailwindcss` ^4, `@tailwindcss/vite` ^4, `daisyui` ^5 to devDependencies)
- Modify: `examples/showcase/package-lock.json` (regenerated, committed)
- Modify: `examples/showcase/vite.config.ts` (add the `@tailwindcss/vite` plugin)
- Create: `examples/showcase/src/lib/theme.css` (the public theme entry: `@import "tailwindcss"; @plugin "daisyui";` plus an empty `@plugin "daisyui/theme"` block placeholder commented for Task 3)
- Modify: `examples/showcase/src/routes/(site)/+layout.svelte` (link `theme.css` via a `?url` import alongside the existing `site.css`)
- Modify: `examples/showcase/src/lib/cairn.config.ts` (add the `theme.css` `?url` to `preview.stylesheets` so the preview frame loads it)

**Interfaces:**
- Produces: a buildable public side with Tailwind + DaisyUI available, a `theme.css` entry that Task 3
  fills with the token block, and preview-frame parity for it. Consumed by every later task.

- [ ] **Step 1: Add the deps and the Vite plugin**

Edit `examples/showcase/package.json` devDependencies, then `npm install --prefix examples/showcase`. Add
the plugin to `examples/showcase/vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
// ...in plugins, before sveltekit():
plugins: [tailwindcss(), sveltekit(), cairnManifest({ /* unchanged */ })],
```

- [ ] **Step 2: Create the public theme entry**

Create `examples/showcase/src/lib/theme.css`:

```css
/* The public theme entry: Tailwind 4 + DaisyUI 5 + the cairn public token layer. This is the file a
   scaffolded site owner edits to re-skin (Task 3 fills the @plugin block and the cairn tokens). It is
   linked by the (site) layout and by the editor preview config, so the reader and the author see the
   same surface. */
@import 'tailwindcss';
@plugin 'daisyui';
/* @plugin "daisyui/theme" { ... } and the cairn type/space/measure tokens land in Task 3. */
```

- [ ] **Step 3: Link it in the public layout and the preview config**

In `examples/showcase/src/routes/(site)/+layout.svelte`, add `import themeCss from '$lib/theme.css?url';`
and link it in `<svelte:head>` before `site.css`. In `examples/showcase/src/lib/cairn.config.ts`, add the
`theme.css` `?url` import to `preview.stylesheets` (before the existing `siteCss`).

- [ ] **Step 4: Build and verify**

Run: `npm --prefix examples/showcase run build`. Expected: build succeeds; `.svelte-kit/cloudflare/_worker.js` exists. Run `npm --prefix examples/showcase run check`: 0 errors in `src/`.

- [ ] **Step 5: Confirm the emitted template still builds (B1 rot gate)**

Run the local emit dry-run (the Task 5 command from the B1 plan): pack the engine + dev, emit to
`/tmp/cairn-emitted`, then `npm install && npm run check && npm run build`. Expected: clean, with the new
public Tailwind/DaisyUI build succeeding in the emitted tree.

- [ ] **Step 6: Commit**

```bash
git add examples/showcase/package.json examples/showcase/package-lock.json examples/showcase/vite.config.ts examples/showcase/src/lib/theme.css examples/showcase/src/routes/\(site\)/+layout.svelte examples/showcase/src/lib/cairn.config.ts
git commit -m "feat(showcase): wire Tailwind 4 and DaisyUI 5 onto the public side"
```

---

## Phase A: the frontend-design loop (main-loop, GATE 1)

This phase is main-loop creative work, not a `cairn-implementer` task. It runs the repo's mockup-first
methodology (the `frontend-design` skill) and produces the concrete design the implementation tasks
consume. Do not skip to implementation without it; the token values, the faces, and the layouts are its
output.

- [ ] **A1: Mock the chrome, the article reading surface, and Home.** Using the `frontend-design` skill,
  produce mockups for the public chrome (header/nav/footer), the article reading surface (every prose
  element: headings, body, blockquote, pull-quote, inline-code chip, code block, figure on the
  `center`/`wide`/`full` contract, lists, tables, captions, lead paragraph), and a composed Home, against
  the bar's criteria and the settled direction. Stress the tokens on the composed Home page specifically.
  Cover the directive component set (callout and useful siblings) and the full markdown element set in the
  reading-surface mock, since the sample content showcases every element and doubles as documentation. Also enumerate the bar's component inventory and mock the B2 core component
  set from it, so the comprehensive component demo is designed up front, not retrofitted.

- [ ] **A2: Choose the faces and the oklch palette.** Select the editorial display face and the
  legibility-grade humanist sans body (self-hostable, subsettable), and author the warm paper-and-ink
  oklch palette (light + dark siblings) with one restrained accent, the type scale (named steps + ratio +
  line-heights), the fluid space scale, the measure, and the geometry tokens. Record the concrete values.

- [ ] **A3: GATE 1, the visual-design critique.** Run an adversarial visual critique of the rev.1 mockups
  (a `frontend-design`-informed review; the `daisyui-a11y-reviewer` for the DaisyUI/a11y axis). Fold the
  findings into a rev.2. The critique asks whether the design is good, not whether it re-skins, and it
  tests the bar's non-negotiable principles: the default reads as an excellent finished product, 2026
  modern and not trendy, and grounded in evidence-based UI/UX (measure, hierarchy, Gestalt,
  aesthetic-usability), not only taste.

- [ ] **A4: Append the settled design to the bar doc.** Add a "Settled design (B2 output)" appendix to
  [`docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md`](../specs/2026-06-25-cairn-b2-design-bar.md)
  recording the chosen faces, the oklch values (light + dark), the type/space/measure/geometry token
  values, and the chrome + reading-surface layouts. The later tasks read their values from this appendix.
  Commit it: `docs: record the B2 settled design (faces, oklch values, scales)`.

**Phase A deliverable:** the rev.2 design and the value appendix. Every "(value from Phase A)" reference
below resolves to it.

---

## Task 2: the token layer

Author the two-tier token layer in `theme.css` from the Phase A appendix: the DaisyUI `@plugin
"daisyui/theme"` oklch block (light + dark siblings) and the cairn-authored custom properties (type scale,
space scale, `--flow-space`, measure, geometry). Inline-document each token at its definition. This is the
re-skin surface; it carries the committed N.

**Files:**
- Modify: `examples/showcase/src/lib/theme.css` (the `@plugin "daisyui/theme"` block + the cairn tokens)
- Create: `examples/showcase/src/lib/theme.css` companion doc comment block (the re-skin recipe, inline)

**Interfaces:**
- Consumes: the Phase A value appendix.
- Produces: the role tokens (`--color-base-100/200/300` + `-content`, `--color-primary/secondary/accent` +
  `-content`, `neutral`, status + `-content`), the radius/size/border tokens, and the cairn tokens
  (`--cairn-step-*` type steps, `--cairn-leading-*`, `--cairn-space-*`, `--flow-space`, `--cairn-measure`).
  The chrome (Task 4) and the reading surface (Task 5) read these. The committed N for the recipe.

- [ ] **Step 1: Author the DaisyUI theme block.** Fill the `@plugin "daisyui/theme"` block with the Phase
  A oklch values, a `light` block (default) and a `dark` sibling (`prefersdark: true`), wired to
  `color-scheme`. Use role names only; never appearance names.

- [ ] **Step 2: Author the cairn tokens.** Add the type scale steps + line-heights (fluid `clamp()`), the
  fluid space scale + `--flow-space`, the `--cairn-measure`, all as custom properties reading the DaisyUI
  roles where relevant. Inline-document each.

- [ ] **Step 3: Write the re-skin recipe doc comment.** At the top of the theme block, document the
  committed N: the exact role colors to edit (target ~14 values), the accent hue-rotation rule (rotate H,
  hold L and C), the two font tokens, the one type ratio, the one space-scale step. State that the prose
  surface is included at zero extra edits.

- [ ] **Step 4: Verify the build and the no-literals shape.** Run the showcase build and check. The
  no-literals grep gate (Task 7) is authored later; here, eyeball that no component yet hard-codes a color.

- [ ] **Step 5: Commit**

```bash
git add examples/showcase/src/lib/theme.css
git commit -m "feat(showcase): the public oklch token layer and the re-skin recipe"
```

---

## Task 3: build-time syntax highlighting in the engine render pipeline

Move syntax highlighting into the engine pipeline (engine-fat) so every site and the editor preview get
it. Emit CSS-variable-driven highlighting bound to the DaisyUI roles, with zero client JS. This is the one
engine change.

**Files:**
- Modify: `src/lib/render/pipeline.ts` (add the Shiki highlight step to the async pipeline)
- Create: `src/lib/render/highlight.ts` (the Shiki transformer + the CSS-variable theme bound to roles)
- Test: `src/lib/render/highlight.test.ts`
- Modify: `package.json` (engine: add `shiki`)

**Interfaces:**
- Produces: fenced code blocks rendered to static HTML whose colors resolve through CSS variables that the
  token layer defines from `base-200`/`base-300`/`base-content` plus a syntax ramp. No runtime highlighter.
  Consumed by the reading surface (Task 5, the code-block CSS) and by every `render(md)` call.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from 'vitest';
import { renderMarkdown } from './pipeline';

test('fenced code is highlighted at build time with role-bound CSS variables', async () => {
  const html = await renderMarkdown('```js\nconst x = 1;\n```', {});
  // Highlighted tokens carry inline CSS-variable colors, not literal hex.
  expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
  expect(html).toContain('var(--cairn-code');
  expect(html).not.toMatch(/#[0-9a-fA-F]{6}/); // no baked literal colors in the output
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/render/highlight.test.ts`. Expected: FAIL (no highlighting yet; output is plain `<pre><code>`).

- [ ] **Step 3: Implement the transformer.** In `src/lib/render/highlight.ts`, build a Shiki highlighter
  using the CSS-variables theme (or a dual light/dark theme) whose variables are namespaced `--cairn-code-*`
  so the token layer maps them onto the DaisyUI roles. Export an async `highlight(code, lang)` returning the
  `<pre class="shiki">` HTML. Wire it into `pipeline.ts`'s fenced-code handling. Keep it server/build-only.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/lib/render/highlight.test.ts`. Expected: PASS.

- [ ] **Step 5: Confirm no client highlighter ships.** After `npm run package` + a showcase build, grep
  `.svelte-kit/cloudflare` for `shiki`/`prism`/`hljs`. Expected: none on the reading route (the highlighter
  is build-only). Record the result.

- [ ] **Step 6: Run the full engine gate.** `npm run package` then `npm test` (EXIT 0), `npm run check`
  (0/0), `npm run check:comments`. The pipeline change must not regress the suite.

- [ ] **Step 7: Commit**

```bash
git add src/lib/render/highlight.ts src/lib/render/highlight.test.ts src/lib/render/pipeline.ts package.json package-lock.json
git commit -m "feat(render): build-time syntax highlighting bound to theme roles"
```

---

## Task 4: the chrome

Rebuild the public header/nav/footer as owned components on the token layer, replacing the plain-CSS
`site.css` chrome. Quiet, DaisyUI-built, accessible.

**Files:**
- Modify: `examples/showcase/src/routes/(site)/+layout.svelte` (the chrome markup, on DaisyUI + tokens)
- Create: `examples/showcase/src/lib/components/SiteHeader.svelte`, `SiteFooter.svelte` (owned chrome)
- Modify: `examples/showcase/src/lib/site.css` (remove the chrome rules superseded by the token chrome; keep the figure-placement contract)

**Interfaces:**
- Consumes: the token layer (Task 2).
- Produces: the public chrome the reading surface (Task 5) and Home (Task 6) render inside.

- [ ] **Step 1: Build the chrome components** from the Phase A chrome layout, using DaisyUI components and
  only token-backed utilities (`bg-base-100`, `text-base-content`, the space scale). Skip link, semantic
  `<header>`/`<nav>`/`<footer>` landmarks, a consistent `:focus-visible`.

- [ ] **Step 2: Verify** the build, check (0 in `src/`), and a manual a11y eyeball (skip link works, focus
  visible). The full a11y gate is Task 7.

- [ ] **Step 3: Commit**: `feat(showcase): the public chrome on the token layer`.

---

## Task 5: the bespoke reading surface

Author the prose CSS so every element derives from the DaisyUI roles, the measure is capped structurally,
and the code block consumes the Task 3 highlighter's CSS variables. This is the signature deliverable. It
also ships the directive component showcase: a useful directive set styled on the tokens, exercised by a
component-rich sample post, so a user keeping defaults gets adoptable components demonstrated in context.

**Files:**
- Create: `examples/showcase/src/lib/prose.css` (the bespoke reading surface, imported by `theme.css` or the entry route)
- Modify: `examples/showcase/src/routes/(site)/[...path]/+page.svelte` (wrap the article in the prose container at the capped measure)
- Modify: `examples/showcase/src/lib/site.css` (keep only the figure-placement contract; the rest moves to prose.css on tokens)

**Interfaces:**
- Consumes: the token layer (Task 2), the highlighter CSS variables (Task 3), the existing
  `center`/`wide`/`full` figure contract.
- Produces: the article reading surface Home (Task 6) and the styleguide (Task 7) render prose into.

- [ ] **Step 1: Author the prose surface** from the Phase A reading-surface layout: headings on the display
  face with the binding rhythm; the measure capped at `--cairn-measure`; blockquote and a hanging
  pull-quote; the inline-code chip (`base-200`/`base-300`); the code block consuming `--cairn-code-*`;
  figures on the contract with muted-sans captions and full-bleed breakout; refined lists; bordered/zebra
  tables; `hr`; a lead-paragraph option. Every color is a role token; no bare `prose` class is the surface.

- [ ] **Step 1b: Ship and showcase the directive component set.** Confirm or extend the directive registry
  (`examples/showcase/src/lib/cairn.config.ts` and its components) to a genuinely useful set: callout with
  note/tip/warning variants and a few useful siblings, styled on the token layer. Author a component-rich
  sample post in `examples/showcase/src/content/posts/` that exercises the set in real content, so the
  reading surface and the components are demonstrated together, and note the adopt-or-extend seam inline.
  The sample covers the full markdown element set and doubles as documentation: it teaches a new author how
  to write, use the components, and re-skin, so the default site is its own quickstart. The fuller
  self-documenting content set is B3; this anchor sample sets the pattern.

- [ ] **Step 2: Verify** the build and check; render the seed posts and confirm visually in the showcase
  (`npm run package` then the showcase build/preview). Confirm figure breakout adds no horizontal scroll.

- [ ] **Step 3: Commit**: `feat(showcase): the token-bound bespoke reading surface`.

---

## Task 6: Home, mocked against the tokens

Compose the Home page against the tokens to stress them on a real composed page. This is the mock; B3
implements the production Home. It must look intentional, not a placeholder.

**Files:**
- Modify: `examples/showcase/src/routes/(site)/+page.svelte` (the composed Home on the tokens + chrome)

**Interfaces:**
- Consumes: the token layer, the chrome, the reading surface, the existing `posts.all()` loader.

- [ ] **Step 1: Compose Home** from the Phase A Home mock: a hero/intro on the display face, the post list
  styled (the current `.post-list`/`.summary` are referenced-but-undefined; replace with token-backed
  composition), reading well at the measure. Token-backed utilities only.

- [ ] **Step 2: Verify** build, check, and the visual in the showcase.

- [ ] **Step 3: Commit**: `feat(showcase): Home mocked against the design tokens`.

---

## Task 7: the /styleguide route and the CI gates

Build the `/styleguide` proof route and wire the mechanical gates: the precise no-literals grep, the
dual-gamut contrast gate, the reduced-motion check, axe/pa11y, and the re-skin fixture that proves the
one-token-set claim.

**Files:**
- Create: `examples/showcase/src/routes/(site)/styleguide/+page.svelte` (renders every token, type step, prose element, directive, light + dark)
- Create: `scripts/check-public-tokens.mjs` (the no-literals grep + the dual-gamut contrast gate via culori)
- Create: `scripts/reskin-fixture.mjs` (edits only the documented N in `theme.css`, then runs the contrast gate)
- Create: `examples/showcase/e2e/styleguide.spec.ts` (the styleguide renders; axe has no violations; reduced-motion honored)
- Modify: `package.json` (root: `check:public-tokens`, `test:reskin`; add `culori`, `@axe-core/playwright`)
- Modify: `.github/workflows/scaffold.yml` or a new `design.yml` (run the gates)

**Interfaces:**
- Consumes: the token layer, the reading surface, the directive registry.
- Produces: the gates the token review (GATE 2) leans on, and the proof page.

- [ ] **Step 1: Build the styleguide route** rendering every role token swatch, every type step, every
  markdown element against real content, and a catalog of the adoptable components (the directive set and
  the own-it public components) with their usage shown, in both light and dark. The catalog demos the full
  B2 component inventory from the bar, and `/styleguide` is the single growing demo surface B3 and B4 add
  their feature and option components to. This catalog plus the self-documenting sample are the
  adopt-or-extend reference a user browses.

- [ ] **Step 2: Write the no-literals + contrast gate.** `scripts/check-public-tokens.mjs`: (a) grep the
  showcase `src/` for a violation, defined precisely as a literal color (`#hex`, `rgb(`, `hsl(`, `oklch(`)
  or a literal font-size (`text-[Npx]`, `text-[Nrem]`, `font-size:`) in a component or `prose.css`, with
  DaisyUI semantic utilities allowlisted; (b) parse the `theme.css` oklch role pairs, convert each through
  culori, and assert AA in both sRGB and P3 for every role/`-content` pair, failing if either drops.

- [ ] **Step 3: Write the re-skin fixture.** `scripts/reskin-fixture.mjs`: copy `theme.css`, edit only the
  documented N role values (a hue rotation), run the contrast gate on the result, and assert it stays
  green. Prove a second color source does not exist for the prose surface (grep).

- [ ] **Step 4: Write the e2e a11y spec.** Playwright + `@axe-core/playwright` over `/styleguide` and an
  article: no axe violations; the skip link works; with `prefers-reduced-motion` set, no animation runs.

- [ ] **Step 5: Run all gates.** `npm run check:public-tokens` (green), `npm run test:reskin` (green), the
  new e2e spec (green). Fix the cause in the theme/components, never by loosening a gate.

- [ ] **Step 6: Wire CI** in a `design.yml` job (Node 22): build the showcase, run `check:public-tokens`,
  `test:reskin`, and the a11y e2e. Mirror it locally first.

- [ ] **Step 7: Commit** in two commits: the route/gates, then the CI wiring.

---

## GATE 2: the token-layer adversarial review

Run after GATE 1 and the implementation, separately, because it asks a different question: can a developer
who never saw the theme re-skin and extend it from the tokens and the docs alone?

- [ ] **G2.1:** Dispatch the `daisyui-a11y-reviewer` and the `svelte-reviewer` over the token layer, the
  chrome, the reading surface, and the styleguide. Add a skeptical token review (main-loop or a dispatched
  reviewer) against the bar's token-architecture and re-skin-recipe criteria: tokens named by role not
  appearance, no value hard-coded that should read a token, every token documented, no dark variant that
  drifts from its light pair, the recipe has no missing step, and the prose surface re-skins from the same
  set. The decisive test: re-skin to a new brand editing only the documented N, screenshot `/styleguide`
  before and after, and confirm chrome and article moved together with no AA break.

- [ ] **G2.2:** Fold the findings; re-run the gates. The pass does not close until G2.1's decisive test
  passes and the reviewers are clean.

---

## Task 8: docs, the living public design system, and STATUS

Documentation is a pass dimension. B2 introduces the public design language, so it earns its living
reference, the public analog of `admin-design-system.md`.

**Files:**
- Create: `docs/internal/public-design-system.md` (the living reference: the tokens, the type system, the chrome and reading-surface recipes, the re-skin recipe, the load-bearing rules, pointing at `theme.css` and `/styleguide`)
- Modify: `docs/internal/docs-friction-log.md` (B2 findings)
- Modify: `docs/STATUS.md` (B2 complete, next is B3)
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (the engine highlighter behavior change; no consumer action for a showcase-only change beyond the new render output)

**Interfaces:**
- Produces: the durable public design reference B3/B4 and the frontend-design loop build on.

- [ ] **Step 1: Author `public-design-system.md`** from the settled design and the bar, in the
  agent-facing style of `admin-design-system.md` (load-bearing rules first, then tokens, type, recipes).
  Include the component showcase: the adoptable directive and own-it components, and the adopt-or-extend
  seam for each.
- [ ] **Step 2: Record friction-log findings** B2 surfaced (developer/editor perspective).
- [ ] **Step 3: Point STATUS at B3**, the defaults surface, per the spec's sub-pass sequencing.
- [ ] **Step 4: Run the doc gates.** `npm run check:docs`, `check:reference` (if the highlighter added an
  export), `check:comments`. All clean.
- [ ] **Step 5: Commit**: `docs: the public design system reference and B2 STATUS`.

---

## Final gate

From the worktree root, all must pass:

- [ ] `npm run package` then `npm test` (EXIT 0) and `npm run check` (0/0), `npm run check:comments`.
- [ ] `npm --prefix examples/showcase run check` (0 errors in `src/`).
- [ ] `npm --prefix examples/showcase run test:e2e` (green, matching or exceeding the 30-test baseline; the
  new styleguide/a11y spec added).
- [ ] `npm run check:public-tokens` (no-literals clean; dual-gamut AA green) and `npm run test:reskin` (the
  one-edit re-skin holds AA).
- [ ] The local emitted-template dry-run builds clean with the public theme (the B1 rot gate).
- [ ] `npm run check:docs`, `check:reference`, `check:reference:signatures`, `check:package` clean.
- [ ] GATE 1 (visual critique) and GATE 2 (token review) both folded, with G2.1's decisive re-skin test
  passing.

The `cairn-pass` pass-end ritual then runs `code-simplifier` over the changed engine code and scripts,
updates the spec/STATUS/memory, and merges `feat/scaffolder-b2-design-foundation` to `main`.

## Self-review notes

- **Spec coverage.** B2's spec scope (the design pass over the chrome and the article surface, the
  first-class tokens/theme layer with its own review, the editorial-typography lead, the shadcn own-it
  component model, Home mocked then implemented in B3) maps to Phase A (design + GATE 1), Tasks 1-7 (wire,
  tokens, highlighter, chrome, reading surface, Home mock, styleguide + gates), and GATE 2. The bar's five
  differentiators map to: #1 the token layer + reading surface reading one set (Tasks 2, 5) proven on the
  styleguide (Task 7); #2 the oklch theme + the dual-gamut gate (Tasks 2, 7); #3 the preloaded editorial
  pair (Phase A + Task 2); #4 the shared grammar with the admin (Task 2 holds the grammar); #5 the
  committed-N recipe + the re-skin fixture (Tasks 2, 7).
- **The design-phase handoff.** Phase A produces the concrete faces, oklch values, and layouts; every
  "(value from Phase A)" in Tasks 2-6 resolves to the value appendix (A4). This is the correct structure
  for a design pass, not a placeholder: the values are a design output, not a plan-time decision.
- **Engine vs showcase.** The only engine change is the highlighter (Task 3, `src/lib/render/`); everything
  else is the showcase template. The highlighter is engine-fat so the editor preview matches the public
  page, and it is verified to ship no client highlighter.
- **Out of scope (later sub-passes).** The production Home, the paginated archive, tag pages, Pagefind
  search, the SEO kit, the styled 404, and the sample content are B3. The contact form, analytics,
  media-on-default, the dark-mode toggle, and the first-run empty state are B4. The guided "pick your
  brand" generator is Part C.
- **Empirical risks.** Two. First, Shiki in the build/prerender pipeline and the editor preview both
  running the async render: Task 3 pins it with a test and the no-client-highlighter grep. Second, the
  public Tailwind/DaisyUI build inside the emitted template (the B1 rot gate): Task 1 Step 5 and the final
  gate run the emit dry-run, so a public-theme build break is caught before merge.
