# Theme identity pass A: the theme

**Goal:** Move cairn's admin identity into the daisyUI theme layer. The admin sheet compiles every
daisyUI component except calendar, the theme roots become daisyUI theme blocks with split
ownership, and every override of a daisyUI declaration lives in the `cairn-idiom` sublayer with
its full state set. The markup sweep then retires the per-element patches. The starter takes the
shared corner ladder and hairline outlines. A plain-daisyUI fixture screen proves G1 in both
themes.

**Spec:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` (commit `48a87c62`),
approved by Geoff 2026-09-26. This plan covers the spec's "Delivery" pass A only. Pass B (the
`radius-scale` rule, the retired-patch arms, the shipped guidance, the recipe source, the norms
print, the agent-build probe) is out of scope. Executors read the spec sections their task names.
Where this plan and the spec disagree, stop and report, except the plan's decisions on the spec's
"Open for the plan" items, recorded under "Decisions this plan takes" below. Evidence and record:
the spike (`docs/superpowers/research/2026-09-26-theme-identity-spike.md`), the fold record and
its verification (`...-fold.md`, `...-fold-verification.md`), the prose review, the arc log
(`docs/internal/record/2026-09-26-theme-identity-arc-log.md`), and the ratified captures
(`docs/internal/record/2026-09-26-theme-identity/final-1440.png`, `final-390.png`,
`switch-1440.png`).

**Approach:** Build first, then the theme roots at unchanged values (so an equivalence test proves
the re-authoring alone changed nothing), then the new values, then the idiom rules family by
family, then the markup sweep, then the starter, then the fixture and the proof, then the docs.
Settle runs last: a fresh-context visual read, the felt-refinement audit, one owner sitting, and
the CI baseline regeneration. Plans specify outcomes and acceptance, never implementation code.

**Execution mode:** `pass-execute` (by name) for tasks 1 to 14, one invocation per segment, and
**sequential** (`parallel` unset). The runner does no worktree isolation (`repo` is prompt text
only, `pass-execute.js:32-33`), so parallel tasks would share one index, one `base..HEAD` range,
and one `cairn-run-gate` key. Tasks 2 to 8 all edit `src/lib/components/cairn-admin.css` and
`scripts/checks/custom-surface-budget.json`, the contended resources. Every heavy gate also
queues on one machine-wide lock. Task 11 is genuinely independent of tasks 9 and 10 (disjoint
files) and is marked so, but it still runs in sequence: `pass-execute-chains` would need a second
worktree, an `npm ci`, and a merge, which costs more than one sequential task. Args:
`repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `gate: "npm run check && npm test"` (the fallback; see Gates),
`commonNotes` carrying the Global constraints and the `code-simplifier` step, and each task's
`gateTier` and `model` as the task states. Task 15 is a one-task `pass-execute` run, dispatched
only if the settle steps return work. Steps S1 to S4 are conductor-led. Task 16 is the close,
authored by one fold agent with one independent `diff-reviewer` read.

**Models:** Sonnet `cairn-implementer` at `high` by default. Task 3 runs with `model: "opus"`: it
picks the mechanism that moves component tests onto the compiled sheet and writes the
equivalence probe, which the spec leaves to the plan. `claude-opus-5-5` for every
`diff-reviewer`, the `visual-verifier` (S1), both felt-audit lenses (S2), and the close's fold
agent. Baseline and capture agents are Sonnet `general-purpose` at `high`.

**Token ceiling:** about 14.5M, flag at about 11.6M (80%), which is the planned spend, so the flag
marks an overrun past plan rather than a midpoint. Derivation: fourteen implementer chains at
about 0.45M each (a Sonnet implementer reading a 1,263-line stylesheet and daisyUI sources, an
Opus diff review, the gate probes), 6.3M; task 3's Opus upshift, +0.3M; fix rounds on about a
quarter of the chains at about 0.25M each, 0.9M; task 0's baseline agent, 0.3M; S1's
`visual-verifier` over five viewports in two themes, 0.6M; S2's two audit lenses, 0.8M; task 15,
0.5M; S3's sitting page and the fixture "before" build, 0.4M; S4's regen and CI reads, 0.1M; the
close's fold and review, 0.7M; the conductor session itself, 1.0M. Planned total about 11.9M,
rounded to the 11.6M flag since task 15 may not run. **Counting rule:** what `/cost` reports for
the conductor session. Before segment A, the conductor records in the ledger whether `/cost`
includes subagent and workflow agents; if not, it names the counter it uses instead.

**Segments and checkpoints:** the checkpoint interval is four tasks, and every checkpoint falls on
a segment boundary. Each boundary sits on a commit whose task gate ran green.
- Segment A: task 0 (conductor), then tasks 1 to 4. The build and the theme roots.
- Segment B: tasks 5 to 8. The idiom rules.
- Segment C: tasks 9 to 11. The markup sweep and the starter.
- Segment D: tasks 12 to 14. The fixture, the proof, and the design-system docs.
- Segment E: S1 and S2 in parallel, task 15 if either returns work, S3 (the owner sitting), task
  15 again only for the sitting's corrections, then S4 (the CI baseline regeneration).
- Segment F: task 16, the close.

At each boundary the conductor pushes the branch, writes the ledger at the foot of this file
(tasks, spend, decisions, verdicts, next task), and reads CI through one Haiku probe agent that
reports failing jobs and failing spec file names only. **The expected-red set:** until S4, the
`e2e` workflow's `admin-visual.spec.ts` and `site-visual.spec.ts` snapshot comparisons fail by
design (the render changes and the baselines are CI-canonical), and until task 13 the norms
freshness job fails. A boundary passes when CI's failures are a subset of that set. Any other red
re-dispatches the task that owns it, with the failing step named. The conductor opens the pass PR
as a draft at the segment A push, so `pull_request` CI runs on every later push.

**Worktree:** `.claude/worktrees/theme-identity-a`, branch `theme-identity-a`, off `main` after
draft docs pass 0+1 has merged (spec, "Delivery", ruling 3). Task 0 creates it.

**Gates:** `pass-execute` has the implementer run `scripts/checks/gate-tier.mjs`, which prints a
fixed tier string, so a task cannot supply its own gate string through the runner. Two
consequences shape every task:
- **Paint tasks pin `gateTier: "engine"`** (docs checks, `npm run check`, `npm test`, which
  includes the component project). The computed tier for `src/lib/components/**` is
  `admin-visual`, and its `admin-visual.spec.ts` leg fails on every deliberate render change until
  S4 regenerates the baselines on CI. The per-rule proof lives in the component tests, which the
  engine tier runs. The showcase e2e runs where a task names it, and at every boundary on CI.
- **Task checks.** A task that names extra checks runs each through `cairn-run-gate` after its
  tier gate and quotes each `gate exit:` line in its report under a "Task checks" heading. The
  diff reviewer treats a missing or red task check as blocking. **The admin CSS set** is
  `npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes`,
  run as `CAIRN_GATE_LANE=light cairn-run-gate '<that string>'`, since it launches no browser.
  A showcase e2e run is heavy: `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- <spec>'`.

The heavy lane serializes: one browser gate on the machine at a time. On this workstation the
vitest component project runs serialized (`--no-file-parallelism`); a component-test stall under
a concurrent gate is contention, so rerun that file alone before calling it red (the
`concurrent-pass-flaky-tests` and `vitest-browser-parallel-pages-stall` memories). Conductor-run
gates call `cairn-run-gate` directly. `code-simplifier` runs over each task's changed code before
its commit.

## Decisions this plan takes

The spec's "Open for the plan" items, settled here so no implementer invents them:

1. **Rule 11 widens.** When it moves into `cairn-idiom`, the outline and dash ink rule keys on all
   four active forms (`.btn-active`, `[aria-pressed='true']`, `[aria-checked='true']`, and
   `[aria-current]:not([aria-current='false'], [aria-current=''])`), not `.btn-active` alone.
   Reason: the selected-segment rule keys on all four, so a `btn-outline` pressed by attribute
   would otherwise keep stock ink while its `.btn-active` twin does not.
2. **Light's selected-segment hairline seeds from the locked 55% mix**
   (`color-mix(in oklab, var(--color-base-content) 55%, transparent)`, the value
   `segmentTintClass` already carries at `segmented-control.ts:10-24`), so the admin has one
   pressed hairline. Dark starts from rule 10's locked `oklch(57% 0.012 75)`. Task 6 measures both
   against the resting sibling and the ground at 3:1; a value that fails moves in lightness only,
   and the report says why it differs from the seed.
3. **The soft primary's active step starts at 22%** (the spike's value) and is kept if task 13
   records a visible step from the 15% hover. **The dark warm lift** takes the dark theme's
   `--cairn-shadow` tint at the light lift's geometry and alpha. Task 13 records both.
4. **Alert rules exclude daisyUI's style variants** (`alert-soft`, `alert-outline`, `alert-dash`),
   the narrow-selector condition applied to alerts. A developer's styled alert keeps daisyUI's look.
5. **The fixture route is owner-only** in `examples/showcase/src/access.ts`, beside `/admin/signups`,
   and appears in no nav config.
6. **The component tests reach the compiled sheet by a test-time mechanism task 3 chooses**, with a
   guard test that fails if the mechanism is removed (task 3 states the constraints).
7. **The site-theme pin** is task 11's to choose, proven by a computed-style test.
8. **Per-site radius roles** the role rules do not settle are listed by task 10's implementer and
   ruled by its diff review, as the spec directs.

## Global constraints

- Every rule that overrides a daisyUI declaration lives in `@layer utilities { @layer cairn-idiom
  { ... } }` in `src/lib/components/cairn-admin.css` and meets the spec's three conditions: full
  state set, narrow selector, variables first (spec, "The cairn-idiom sublayer"). Selectors use
  the file's house scope `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`.
  No new unlayered rule, and no new `@layer components` rule that competes with daisyUI.
- Every `cairn-idiom` rule ships a component test in both themes proving two things: it renders,
  and a markup utility beats it. Tests render against the compiled sheet
  (`dist/components/cairn-admin.css`), never the raw partial.
- Before writing a rule for a daisyUI family, read that family's source in
  `node_modules/daisyui/components/<family>.css` for its variables, its state selectors, and any
  declaration daisyUI keeps unnested in `@layer utilities` (known: `.alert` `border-color`, `.kbd`
  `box-shadow`, `.collapse` `visibility`). An unnested declaration cannot be overridden from the
  sublayer; set the variable it reads.
- No palette value changes except the new `--cairn-info-ink` and an alert-ink lightness retune the
  spec permits. No motion change (ruled 2026-09-15). No change to `.cm-*`, `prose.css`, or callouts.
- `docs/internal/admin-design-system.md` is read before any admin CSS or component edit; its
  load-bearing rules hold (`data-theme` on a bare wrapper, never on a styled element).
- The sweep changes no layout, copy, or behavior. A site where removing a patch changes the render
  beyond the intended theme change is reported as a finding, never silently fixed.
- A test that asserts a changed number (a height, a radius, a weight) is updated deliberately, and
  the report lists each such test with its old and new value and the spec line that moved it.
- Code comments follow TSDoc; no em dash in comments; a comment never claims what its assertion
  does not prove; no process citations (plan or task numbers) in shipped comments. The labeled
  report block is verbatim; counts are reported as found, changed, deferred.
- No release, no version bump, no `package.json` version change, no publish.
- No committed check or test reads a git ref or tag: CI checks out at depth 1.
- Never `git add -A`; commit named paths. Conventional Commits; imperative mood.
- The admin sheet grows about 1.7x by design (spec, D2); no task trims it.

## Review focus

The five inputs most likely to bite a user that the per-rule tests would not exercise, each pinned
to a test in its owning task:

1. **A consumer's custom screen with a color-variant button selected inside a join**
   (`join-item btn btn-primary` or `btn-error`, selected by each of the four active forms). It must
   keep its variant fill and never take the neutral wash or the hairline. A selected plain segment
   carrying `text-error` keeps the red ink. Task 6, `BtnActiveDarkGround.test.ts`.
2. **A hostile host stylesheet.** An unlayered host sheet (`div { font-family: Georgia;
   -webkit-font-smoothing: auto; scrollbar-width: auto; color-scheme: dark }`) must not move any
   computed theme value (task 3, the equivalence test's hostile variant). A host's own compiled
   Tailwind and daisyUI sheet loaded beside the admin sheet (the showcase's compiled site CSS,
   injected into the fixture page) must not stop an idiom rule from rendering (task 12,
   `theme-kit.spec.ts`).
3. **An RTL layout at 320px.** The fixture's join in `dir="rtl"` at a 320px viewport shows no
   horizontal page overflow, rounds its outer corners at `--radius-field` on the logical start and
   end, keeps its structural inner zeros, and keeps the selected segment's hairline. Task 12,
   `theme-kit.spec.ts`. A failure caused by daisyUI's own join geometry is reported, not patched.
4. **A developer's own `rounded-*` on a daisyUI component.** `btn rounded-full` stays fully round
   and `btn rounded-none` stays square (task 5); a `rounded-none` item inside the padded dropdown
   keeps 0 despite the concentric rule, and `toggle rounded-none` squares the switch (task 7).
5. **Dark mode with a pressed segment.** An `aria-pressed="true"` segment in `cairn-admin-dark` on a
   `base-100` card, at rest, on hover, and on `focus-visible`, shows the wash, weight 600, and the
   state hairline, and its focus ring resolves to a color other than `base-100`. Task 6,
   `BtnActiveDarkGround.test.ts`; task 13 measures the ring at 3:1.

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** The conductor verifies the start conditions and records each in the ledger. Task 0
takes no gate of its own; its baseline is the conductor's one gate call below.

1. **Draft docs pass 0+1 has merged to `main`**, and `docs/STATUS.md` on `main` no longer names it
   as the next action. If not, stop: the pass does not branch (ruling 3).
2. **No live executor** on the target path: `pgrep -f theme-identity-a` is empty and no
   `theme-identity-a` worktree or branch exists.
3. **Worktree:** create `.claude/worktrees/theme-identity-a` on a new `theme-identity-a` off
   `main`; `npm ci`; then `npm install` inside `examples/showcase`, and confirm with `realpath`
   that the showcase's `node_modules/@glw907/cairn-cms` resolves into the worktree (the durable
   gotcha "A worktree showcase e2e proves MAIN's engine").
4. **Re-count the spec's inventories** in the worktree and record each against its plan-time
   count. Plan-time counts at `48a87c62`: daisyUI 5.7.44 and Tailwind 4.3.3 installed; 18
   unlayered allowlist entries and `componentsLayerCap` 19 in
   `scripts/checks/custom-surface-budget.json`; 217 daisyUI classes in the admin sheet inventory;
   85 fixed-radius matches of the spec's post-condition pattern in 17 `.svelte` files under
   `src/lib/components` and `src/lib/admin-toolkit`; 24 `rounded-full`; 4 ink-opener recipes
   (`hover:bg-[var(--cairn-ink-hover)]`); 1 Publish tint recipe; 5 `shadow-none`; 8
   `border-radius:` literals in `<style>` blocks (HelpHome 6, `Tooltip.svelte:409`,
   `PreviewBanner.svelte:95`) plus the two `0.75rem` fallbacks at `MediaInsertPopover.svelte:426,446`;
   1 `type-title font-bold`; 16 inline `stroke-width="2"` sites. A changed daisyUI or Tailwind
   version, or a count off by more than about 10%, is a stop-and-report: the spec's mechanisms
   were measured on these versions.
5. **The freeze rule:** read the narrative-arm rule in `CLAUDE.md` as merged and record which arm
   stages are in flight. Task 14 and the close apply it.
6. **The gate-tier strings:** record the `engine` and `docs` tier strings `gate-tier.mjs` prints
   after the merge (the docs tier is expected to be `npm run check:docs-gate`).
7. **Baseline gate:** one `cairn-run-gate 'npm run check && npm test'` in the worktree, quoted as
   task 0's gate evidence to task 1's reviewer.
8. **Before-state capture** (one Sonnet `general-purpose` agent at `high`, headless only, in the
   worktree at `main`'s commit): build the showcase (`VITE_CAIRN_E2E=1 npm --prefix
   examples/showcase run build`), serve it (`CAIRN_DEV_BACKEND=1 npm --prefix examples/showcase run
   preview -- --port 4173`), and capture full-page PNGs at 1440 and 390, light and dark (theme by
   the `cairn-admin-theme` cookie, as `admin-visual.spec.ts` does), of `/admin/posts`, one edit
   page, `/admin/vocabulary`, `/admin/signups` with its delete dialog open, and `/admin/login`.
   Run `npx cairn-audit --rendered` over the showcase admin twice (its counts vary between
   identical runs; STATUS carries the watch) and record both runs' totals and the `weight-budget`
   and `norms-bands` counts. Commit the PNGs and a short record to
   `docs/internal/record/2026-09-26-theme-identity/pass-a-before/` on the branch.
9. **`/cost` coverage:** record whether `/cost` includes subagent and workflow agents.

**Acceptance:** the ledger carries items 1 to 9. A stop condition in item 1 or 4 halts the pass
with one message to Geoff.

---

### Task 1: The full compile and the layer pin

**Files:** `scripts/build/admin-css.input.css`, `scripts/build/build-admin-css.mjs`, a new
`scripts/build/daisyui-classes.mjs`, `src/tests/unit/admin-css-build.test.ts`,
`src/tests/unit/admin-sheet-inventory.test.ts` and its committed inventory (regenerated through
`npm run update-admin-sheet-inventory`), a new `src/tests/unit/admin-sheet-presence.test.ts`, a
unit test for the generator, and the header comment of `src/lib/components/admin-css-safelist.ts`.

**Interfaces produced:** `scripts/build/daisyui-classes.mjs` exports
`listDaisyuiClasses({ exclude })`, returning every class selector found in
`node_modules/daisyui/{components,utilities}/*/object.js` minus the excluded modules. The build
emits `@layer utilities.daisyui, utilities.cairn-idiom;` directly after its existing
`@layer properties, theme, base, components, utilities;` line.

**Outcome:** The admin sheet compiles every daisyUI component except calendar (spec, "One compiler,
every component", D2). The plugin line becomes `@plugin "daisyui" { themes: false; exclude:
calendar; }` and the generated list reaches the compile through one `@source inline(...)`, filled
at build time so it tracks daisyUI upgrades with no hand-kept list. The existing hand-kept
safelists in the input file stay (they carry Tailwind utilities and the documented public
classes). The pin statement lands in the output. `admin-css-safelist.ts` keeps its list, and its
header stops claiming that the admin compiles only a curated subset of daisyUI; it says the full
compile now covers every daisyUI class and the list remains as a scan source.

**Acceptance:**
- The generator unit test runs against the installed daisyUI: the result includes `timeline`,
  `rating`, and `rounded-selector`, excludes every calendar class when `exclude: ['calendar']`, and
  fails loud on an empty result (a renamed module directory would otherwise pass silently).
- `admin-sheet-presence.test.ts` asserts the compiled sheet carries `timeline`, `rating`,
  `radial-progress`, `countdown`, `alert-info`, `toggle-primary`, `toggle-sm`,
  `rounded-selector`, `rounded-field`, and `rounded-box`, and no calendar class. It fails if the
  generator drifts or daisyUI renames a module.
- `admin-sheet-inventory.test.ts` passes on the regenerated inventory; the report states the
  daisyUI class count before and after (expected 217 and 580) for the changelog.
- `admin-css-build.test.ts` asserts the pin statement follows the layer-order line, and fails if
  the two sublayer names are reversed.
- The report records the sheet's size (raw, minified gzip, minified brotli) against the spike's
  table; a result more than 10% off the spike's 53.2 KB gzip is a finding.
- **Mutation:** deleting the `@source inline` line makes the presence test fail.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 2: The cairn-idiom sublayer, its gate category, and the first two rules

**Files:** `scripts/checks/check-custom-surface.mjs`, `scripts/checks/custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`, the gate's unit test under
`src/tests/unit/`, `src/lib/components/cairn-admin.css`, a new shared helper
`src/tests/component/_idiom-probe.ts`, and a new `src/tests/component/cairn-idiom-surface.test.ts`.

**Interfaces produced:**
- The `cairn-idiom` block in `cairn-admin.css`, the one home every later idiom rule joins.
- `custom-surface-budget.json` gains an `idiomLayerCap` beside `componentsLayerCap` for the admin
  tree (the showcase tree gets `0`).
- `_idiom-probe.ts` exports `renderInTheme(html, theme, opts)`, which mounts markup under a bare
  `data-theme` wrapper with the compiled sheet injected once, where `theme` is `'cairn-admin'` or
  `'cairn-admin-dark'` and `opts.hostCss` is an optional sheet injected as well. It also exports
  `styleOf(el, prop, state)`, which reads a computed value at `rest`, `hover`, `focus-visible`, or
  `active`, driving real pointer and keyboard input through the vitest browser API rather than
  forcing a pseudo-class. Every later idiom test uses these two helpers.

**Outcome:** `check:custom-surface` gains the spec's third category (spec, "Gates and the pinned
rules"). The cairn-idiom block is parsed by brace matching, the way the components block is, and
its selectors count against `idiomLayerCap`. Its `SCOPED_RULE` count of unlayered rules excludes
the block. The ledger gains an entry for the category and for each rule in it. Two dead
`@layer components` rules move into the sublayer and render for the first time:
- **The `btn-primary` warm lift** as `--btn-shadow`, `0 1px 2px -1px oklch(35% 0.04 75 / .35)` in
  light and the dark equivalent (decision 3), identical in every state. It replaces the dead
  violet-pair lift (spec, "Material").
- **The `.modal-box` repair**, whose warm shadow replaces daisyUI's theme-invariant black.

`componentsLayerCap` drops from 19 to 17, and `idiomLayerCap` equals the block's selector count.
Each later task that adds or moves an idiom rule updates the cap to the new exact count and adds
its ledger line.

**Acceptance:**
- The gate's unit test plants a sublayer rule written in house style and passes it inside the cap;
  plants one selector over `idiomLayerCap` and fails naming the cap; and plants the same rule
  unlayered and fails as an unsanctioned unlayered rule.
- `cairn-idiom-surface.test.ts`, both themes: the lift's computed `box-shadow` at rest and on hover
  equals the specified value; the modal box's `box-shadow` is the warm repair; a markup utility
  (`shadow-none` on the primary, `shadow-lg` on the modal box) beats each rule.
- **Mutations:** moving the lift rule unlayered makes its loses-to-a-utility test fail; reversing
  the pin in the build makes its renders test fail. The report's mutation ledger shows both fired.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 3: The theme roots as daisyUI theme blocks, at unchanged values

**Model:** `opus`.

**Files:** `src/lib/audit/rules/static/motion-vocabulary.ts` and its test
(`src/tests/unit/audit/rules/motion-vocabulary.test.ts`), `src/lib/components/cairn-admin.css`
(the two theme roots only), a new `src/tests/unit/admin-theme-completeness.test.ts`, a new
`src/tests/component/admin-theme-equivalence.test.ts` with its committed expectation
`src/tests/fixtures/admin-theme-computed.json`, `src/tests/unit/admin-css-build.test.ts`,
`vitest.config.ts` or a component setup file (the mechanism below),
`src/tests/component/EditorToolbar.test.ts`, and any component test whose import of the raw
partial the mechanism replaces. `ReproContext.svelte`, `CairnAdminShell.svelte`,
`LoginPage.svelte`, and `ConfirmPage.svelte` are read and change only if the mechanism needs it.

**Interfaces produced:** `admin-theme-computed.json` pins every computed theme value on four
elements (the light wrapper, a light child, the dark wrapper, a dark child). Task 4 updates it
deliberately.

**Outcome:** D1 lands with every value unchanged (spec, "D1").
1. **First, the `motion-vocabulary` fix:** its companion selector comparison matches any
   comma-separated part of a selector, not the whole selector with `===`
   (`motion-vocabulary.ts:204-208`). It ships in `cairn-audit`, so it lands before the roots
   change.
2. **Before editing the roots,** generate `admin-theme-computed.json` from the current compiled
   sheet: every property declared in today's two roots, custom and non-custom, read on the four
   elements.
3. **The plugin blocks.** `@plugin "daisyui/theme"` blocks named `cairn-admin` and
   `cairn-admin-dark` carry exactly the keys of daisyUI's theme object: `color-scheme`, the twenty
   `--color-*` roles, the three radii, the two sizes, `--border`, `--depth`, and `--noise`.
   `default` and `prefersdark` stay off. No value contains a top-level comma or a single quote.
4. **The plain unlayered root rule** on the same two selectors keeps everything else: the
   `--cairn-*` tokens, the font variables, `--cairn-shadow`, `--color-muted`, `--color-subtle`,
   `--color-positive-ink`, the nested motion rules, and every non-custom declaration
   (`font-family`, smoothing, `font-synthesis`, `scrollbar-*`, `-webkit-tap-highlight-color`, and
   a restated `color-scheme`).
5. **Component tests render against the compiled sheet** (spec, D1, fourth bullet). The mechanism
   must meet four constraints. Every import of the source partial under the component project,
   including those reached through `CairnAdminShell`, `LoginPage`, `ConfirmPage`, and
   `ReproContext`, resolves to the compiled `dist/components/cairn-admin.css`. The packaged
   `dist` behavior does not change. `EditorToolbar.test.ts`'s raw import goes. A guard component
   test mounts `CairnAdminShell` from `src` and asserts `--color-primary` resolves to the light
   theme's oklch value, so removing the mechanism fails loudly. The report names the mechanism
   chosen and why.

**Acceptance:**
- `motion-vocabulary.test.ts` gains a case with a comma-separated selector list whose second part
  is `[data-theme='cairn-admin']`, and it passes; the prior whole-selector cases still pass.
- `admin-theme-completeness.test.ts` reads the key list from daisyUI's own theme object
  (`node_modules/daisyui/theme/object.js`, any one theme's keys) and asserts each plugin block in
  the source defines exactly those keys. It also asserts no value carries a top-level comma or a
  single quote. It fails on a planted missing key, an extra key, and a comma-bearing value.
- `admin-theme-equivalence.test.ts` compares the built sheet's computed values on the four
  elements against `admin-theme-computed.json`, with zero differences. It runs twice: bare, and with
  the hostile host sheet of Review focus 2 injected as `hostCss`. Both must show zero differences.
  A truncated or demoted value fails with the property and element named.
- `admin-css-build.test.ts` asserts the theme blocks' variables land in `@layer base` and the plain
  root rule stays unlayered.
- `grammar-tokens.test.ts`, `role-layer-contrast.test.ts`, and
  `status-chip-register-parity.test.ts` pass unchanged (they read oklch literals as source text).
- The guard test above fails when the mechanism is reverted (mutation ledger).
- `gateTier: "engine"`. Task checks: the admin CSS set (`check:invisible-craft` is the one the
  spike saw fail before the motion fix).

---

### Task 4: The theme values, the norms data, and the density comments

**Files:** `src/lib/components/cairn-admin.css` (plugin block values only),
`src/tests/fixtures/admin-theme-computed.json`, `src/lib/audit/norms.ts` (`RATIFIED_NORMS` values
only), and each test or comment that restates a number this task moves.

**Outcome:** Both themes take the round 1, 2, and 4 values (spec, "Material", "Corners", "Density"):
`--depth: 0`, `--noise: 0`, `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`,
`--radius-box: 0.5rem`, `--size-field: 0.28125rem`, `--size-selector: 0.28125rem`.
`RATIFIED_NORMS` moves to the new ladder: the four field roles (`button-primary`, `button-ghost`,
`input-text`, `select`) at 6px and `card` at 8px. The manifest itself regenerates in task 13,
after the sweep, since it also records heights. The comments that restate a moved number are
re-read and corrected: the half-pixel selector sizes, the checkbox hit-slop rule, and the EditPage
bottom-bar note (spec, "Density"), plus any other the implementer finds, listed.

**Acceptance:**
- `admin-theme-computed.json` changes only in the moved properties; the report lists each changed
  key and its old and new value, and `admin-theme-equivalence.test.ts` passes on the new file.
- A component test in `cairn-idiom-surface.test.ts` asserts `btn-sm` at 36px tall, `btn` at 45px,
  and `badge-sm` at 22.5px in both themes; it fails if the size step does not reach the family.
- `vertical-alignment-recipes.test.ts` and `interactive-control-edge-contrast.test.ts` pass; any
  expectation changed is listed with its reason.
- The report lists every test updated for a moved number (Global constraints).
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 5: Buttons: the plain hairline, the type, the `btn-sm` padding, the soft primary

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`, the ledger, a new
`src/tests/component/cairn-idiom-buttons.test.ts`.

**Outcome:** Four idiom rule groups (spec, "Buttons"):
- **The plain `btn` hairline**, with the spec's exact exclusion list including the
  `[aria-current]` form. Rest `--btn-bg: var(--color-base-100)`, `--btn-border: color-mix(in oklab,
  var(--color-base-content) 22%, transparent)`; hover at the proposed 5% fill step; `join-item`
  segments included; `--btn-color` never set.
- **The ladder on plain classes:** `btn-neutral` hovers at `var(--cairn-ink-hover)`.
- **Button type:** weight 500 on plain and ghost buttons, 600 on `btn-primary`, `btn-neutral`,
  `btn-soft btn-primary`, and `btn-error`. The selected segment's 600 is task 6's.
- **`btn-sm` padding:** `--btn-p: 0.875rem` on `btn-sm` only.
- **Soft primary states:** rest at 10% with a transparent edge, hover and focus-visible at 15%,
  active at 22% (decision 3), `--btn-fg` pinned to `var(--color-primary)`, disabled left to daisyUI.

**Acceptance** (`cairn-idiom-buttons.test.ts`, both themes, through `_idiom-probe.ts`):
- The plain button's fill and edge at rest and hover, and its focus-visible outline color is not
  `base-100` (it would vanish on a card).
- A `btn` marked only `aria-current="page"` does not take the hairline (the exclusion holds; task
  6 asserts what it does take). A `btn-disabled` plain button keeps daisyUI's disabled look.
- `btn-ghost`, `btn-outline`, and each color variant keep daisyUI's fill (the narrow selector).
- Weights 500 and 600 by class; `btn-sm` padding 14px and `btn` padding unchanged.
- Soft primary fill at rest, hover, focus-visible, and active; text stays `--color-primary` in
  every state.
- Loses to a utility: `btn btn-sm px-2 font-semibold` keeps 8px and 600; `btn bg-base-200` takes
  base-200; Review focus 4's `btn rounded-full` stays fully round and `btn rounded-none` stays
  square.
- **Mutation:** moving the hairline rule unlayered fails the utility test.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 6: The selected segment, and rules 10 to 12

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`, the ledger,
`src/tests/component/BtnActiveDarkGround.test.ts` (rewritten in place),
`src/lib/components/segmented-control.ts` (comment only, if its cross-reference moves).

**Outcome:** One selected-segment rule in `cairn-idiom` supersedes pinned rules 10 and 12 (spec,
"The selected segment"). It keys on the four active forms and excludes the eight color variants,
`btn-outline`, `btn-dash`, and every disabled form, so a variant selected control keeps its accent.
It sets `--btn-bg` to `color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))`
in both themes, weight 600, and an inset state hairline on `--btn-border` (decision 2 seeds its
values), with its own hover step. Rule 11 moves into `cairn-idiom`, widened to the four forms
(decision 1). Rules 10, 11, and 12 leave the unlayered block, and the allowlist drops from 18 to
15. The EditorToolbar mode switch and `Pagination`'s current page render as the same device. Any
selected-looking variant the exclusion list leaves open (`btn-link`, `btn-ghost`) is named in the
report as a decision for the reviewer.

**Acceptance** (`BtnActiveDarkGround.test.ts`, both themes):
- Each of the four active forms on a plain `join-item btn` renders the wash, weight 600, and the
  hairline, at rest and hover; the fixture-style `aria-current="page"` segment renders selected,
  not as the task 5 hairline.
- Review focus 1: `btn-primary` and `btn-error` selected by each of the four forms keep their
  variant fill; a selected plain segment with `text-error` keeps the red ink (the existing
  assertions kept).
- Review focus 5: an `aria-pressed="true"` segment in dark on a `base-100` card at rest, hover, and
  focus-visible shows the wash, 600, and the hairline, with a focus outline color that is not
  `base-100`.
- `btn-outline btn-active` and `btn-outline[aria-pressed='true']` take rule 11's ink.
- The hairline's light and dark computed colors match decision 2's values, and the report states
  their measured ratio against `base-100` and against the resting sibling's 22% edge. Under 3:1
  fails the task.
- Loses to a utility: a selected segment with `font-normal` renders 400.
- `unlayeredAllowlist` has 15 entries; `idiomLayerCap` updated.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 7: Fields and marks: rules 13 and 14, the switch, concentric corners, Lucide strokes

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`, the ledger, a new
`src/tests/component/cairn-idiom-controls.test.ts`, and
`src/tests/unit/interactive-control-edge-contrast.test.ts` only if its read path must follow the
moved rules.

**Outcome:** Four groups (spec, "Gates and the pinned rules", "The switch", "Corners", "Type and
icons"):
- **Rules 13 and 14** (the 55% checkbox, radio, and field edges) move into `cairn-idiom` with their
  selectors and exclusions unchanged, `:not(:focus)` and the disabled exclusions kept. The
  allowlist drops from 15 to 13.
- **The switch:** `border-radius: 9999px` on `.toggle` and its `::before`; checked, on all three
  checked forms, fills the track with `--color-neutral` and turns the knob `--color-base-100`, only
  on a toggle carrying none of the eight color modifiers; off and disabled left to daisyUI.
- **Concentric corners:** one rule sets `--radius-field: calc(var(--radius-box) - 0.25rem)` on the
  padded `dropdown-content menu` panel.
- **Lucide strokes:** `svg.lucide[stroke-width='2'] { stroke-width: 1.75 }`, with a co-located
  `// WATCH:`-style CSS comment saying the rule keys on Lucide's default attribute value.

**Acceptance** (`cairn-idiom-controls.test.ts`, both themes):
- **Before the move,** the report lists every `.input`, `.select`, `.textarea`, `.checkbox`, and
  `.radio` call site under `src/lib` that carries a border utility (grep), and states for each
  whether the utility now wins and whether that changes the render. A changed render is a finding.
- Unchecked checkbox, radio, and field edges compute the 55% mix; a focused field keeps daisyUI's
  focus edge; a `border-error` utility on a field wins.
- `interactive-control-edge-contrast.test.ts` passes.
- The switch: checked track neutral and knob base-100 in each of the three checked forms; track and
  knob radius 9999px; `toggle-primary` and `toggle-success` keep daisyUI's colors; Review focus 4's
  `toggle rounded-none` squares it.
- Concentric: a menu item inside a padded `dropdown-content menu` computes `border-radius` of 4px
  (8px box minus 4px); Review focus 4's `rounded-none` item keeps 0.
- Lucide: a `@lucide/svelte` icon at default stroke computes 1.75; one with `strokeWidth={2.5}`
  keeps 2.5; one with `strokeWidth={2}` computes 1.75 (the spec's stated reach).
- `unlayeredAllowlist` has 13 entries; `idiomLayerCap` updated.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 8: Alerts

**Files:** `src/lib/components/cairn-admin.css` (the new token in the plain root rule, the alert
rules), `custom-surface-budget.json`, the ledger, a new
`src/tests/component/cairn-idiom-alerts.test.ts`, `src/tests/unit/role-layer-contrast.test.ts` or a
sibling unit test for the ink contrast.

**Outcome:** The four variant alerts become the spec's tinted panels with a hairline edge and an
on-surface ink (spec, "Alerts", table). The panel is set through `--alert-color`, the edge through
`--alert-border-color` (daisyUI's `border-color` is unnested, so only the variable works), and the
ink through `color`, so a utility still wins. The new `--cairn-info-ink` (`oklch(44% 0.12 240)`,
dark `oklch(82% 0.08 240)`) joins the plain root rule. The error row reuses the locked quiet-danger
triple. A bare `.alert` and the style variants (decision 4) keep daisyUI's look. `btn-error` stays
solid.

**Acceptance:**
- A unit test computes each ink's contrast against its composited panel in each theme from the
  source values, at 4.5:1 or better. If the error ink fails, the triple is re-tuned in lightness
  only, its lock re-checked, and the report says so; no second error ink is added.
- `cairn-idiom-alerts.test.ts`, both themes: each variant's computed background, border color, and
  text color match the table; a bare `.alert` and `alert-soft alert-info` match daisyUI's stock
  render; `alert-error text-base-content` takes the utility's ink.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 9: The markup sweep: recipes, type, and strokes

**Files:** `.svelte` files under `src/lib/components` and `src/lib/admin-toolkit` that carry the
recipes below, and the component tests that assert on them.

**Outcome:** (spec, "The markup sweep", "Buttons: Button type", "Type and icons")
- The ink-opener recipe (`btn ... border-transparent bg-neutral text-neutral-content shadow-none
  hover:bg-[var(--cairn-ink-hover)]`) becomes `btn btn-neutral`.
- The Publish tint recipe (`border-transparent bg-primary/10 text-primary shadow-none
  hover:bg-primary/15`) becomes `btn btn-soft btn-primary`.
- A `shadow-none` that only cancelled depth goes. The two badges' `border-transparent` at
  `CairnAdminShell.svelte:1074,1099` go only if they cancelled a stock edge the theme now removes;
  the report states the evidence for each.
- `admin-toolkit/PageHeader.svelte:59` becomes `type-title font-[550]`.
- A plain or ghost button carrying `tracking-small-semibold` moves to `tracking-small-medium`;
  `btn-neutral` keeps `tracking-small-semibold`. The two plain-button sites that mark state with
  `font-semibold` keep it.
- Hand-authored inline SVGs at `stroke-width="2"`, including `EditorToolbar.svelte`'s `strokeIcon`
  snippet, move to 1.75. Heavier strokes (2.2, 2.4, 2.5, 3) keep their values.

**Acceptance:**
- Zero matches under the two trees for `hover:bg-\[var\(--cairn-ink-hover\)\]`, for
  `bg-primary/10 text-primary shadow-none`, and for `type-title font-bold` (the report quotes the
  grep commands and their empty output).
- The report counts found, changed, and kept for each recipe, with a reason for each kept site.
- Every inline SVG left at `stroke-width="2"` is listed with its reason (expected: none).
- Component tests asserting the retired classes are updated to assert the rendered result, listed.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 10: The markup sweep: radii, and the chip re-key

**Files:** `.svelte` files under `src/lib/components` and `src/lib/admin-toolkit` carrying a fixed
radius or a `rounded-full` chip; `admin-toolkit/Tooltip.svelte`, `HelpHome.svelte`,
`PreviewBanner.svelte`, `MediaInsertPopover.svelte` style blocks;
`src/lib/audit/rules/rendered/chip-ground-collision.ts` and its tests under
`src/tests/unit/audit/rules/rendered/`.

**Outcome:** Every framed element resolves to one of the three radius tokens by role (spec,
"Corners"): chip, tag, count, and small inline marker take `rounded-selector`; control,
button-like element, and small thumbnail take `rounded-field`; panel, card, tile, popover, sheet,
and the brand tile take `rounded-box` (side forms such as `rounded-t-box` for the mobile bottom
sheet, `CairnMediaLibrary.svelte:974`). The two `rounded-[var(--radius-field)]` become
`rounded-field`. A `rounded-full` chip, tag, or count moves to `rounded-selector`; a true circle
(equal width and height: a dot, disc, medallion, spinner, avatar, or switch) keeps `rounded-full`.
Structural zeros stay. In `<style>` blocks a literal becomes `var(--radius-*)` or a `calc` over one;
in a toolkit component the token carries a literal fallback equal to the new value
(`var(--radius-field, 0.375rem)`), including the `MediaInsertPopover` fallbacks, which move from
0.75rem to 0.5rem. `chip-ground-collision`'s chip detection is re-keyed so a filled,
chip-height, text-carrying element at `--radius-selector` still reads as a chip, beside the
`.badge` class check.

**Acceptance:**
- **The post-condition,** over `.svelte` files in both trees, each quoted with its output: zero
  matches for the spec's PCRE pattern (`grep -rP` with
  `\brounded(-(t|b|l|r|s|e|tl|tr|br|bl|ss|se|es|ee))?(-(xs|sm|md|lg|xl|2xl|3xl|4xl)|-\[[^\]]*\])?(?![\w-])`);
  zero `border-radius:` literals in `<style>` blocks other than a `var(--radius-*)` form or a
  `calc` over one. A true circle whose shape needs a literal in a `<style>` block is listed as a
  named exception for the reviewer.
- The report tables every changed site (file:line, old class, new class, role) and lists every
  site the role rules did not settle, with the role chosen and why, for the diff review to rule on.
- Every remaining `rounded-full` is listed with its shape (true circle, or a chip the review should
  rule on).
- A `chip-ground-collision` test fixture renders a filled chip at 4px radius with no `.badge` class
  and the rule still treats it as a chip; the existing chroma-repair and rulings tests pass.
- `gateTier: "engine"`. Task checks: the admin CSS set.

---

### Task 11: The starter theme (independent of tasks 9 and 10)

**Files:** `examples/showcase/src/theme/theme.css`, `templates/waymark/**` (re-emitted, never
hand-edited), the showcase's Tailwind build entry if the pin needs it, and one new test that
proves the pin.

**Outcome:** (spec, "Starter theme decisions")
- Both `@plugin "daisyui/theme"` blocks take `--radius-selector: 0.25rem`,
  `--radius-field: 0.375rem`, `--radius-box: 0.5rem`.
- One rule in `@layer utilities { @layer site-theme { ... } }`, pinned after daisyUI, gives an
  uncolored `btn-outline` and `badge-outline` the hairline edge. The button half writes
  `--btn-border: var(--btn-color, color-mix(in oklab, var(--color-base-content) 22%,
  transparent))`, so `btn-outline btn-primary` keeps its colored edge. The badge half sets
  `border-color` directly on an uncolored `badge-outline`, since daisyUI sets
  `border-color: currentColor` there rather than a variable (fold verification). The rule carries
  the full state set for the outline button.
- The file header's "only chassis VALUES" sentence gains this one declared rule. The re-skin recipe
  gains one line naming the ladder as the family geometry a site may change freely, citing no
  internal document.
- The `theme.css` cites of internal documents (`:6`, `:68`, `:201` at plan time) are repointed to a
  shipped path or inlined; the `site.css` and `prose.css` cites stay filed.
- `npm run emit:template` re-emits `templates/waymark`.

**Acceptance:**
- The pin test builds the showcase CSS and asserts, in a real browser, that an uncolored
  `btn-outline` computes the 22% edge, `btn-outline btn-primary` computes the primary edge, and an
  uncolored `badge-outline` computes the hairline; reversing the pin fails it (mutation ledger).
  The report names the pin mechanism chosen.
- `grep -n 'docs/internal' examples/showcase/src/theme/theme.css` returns nothing.
- `gateTier: "engine"`. Task checks, each quoted: `npm run check:template`, `npm run test:reskin`,
  `npm run check:public-tokens`, `npm run check:chassis-boundary` (light lane for all four), and a
  heavy `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- styleguide.spec.ts'`.

---

### Task 12: The G1 fixture screen and its spec

**Files:** a new `examples/showcase/src/routes/admin/theme-kit/+page.svelte`,
`examples/showcase/src/access.ts`, a new `examples/showcase/e2e/theme-kit.spec.ts`,
`examples/showcase/e2e/admin-visual.spec.ts` (new entries only; no PNG is committed locally).

**Interfaces produced:** the route `/admin/theme-kit` and its markup, which pass B's exemplar
reference is built from; stable `data-testid` hooks on each probed element, named in the spec file.

**Outcome:** A custom admin route written only in plain daisyUI classes and cairn's role utilities
(`type-*`, `gap-*`, `card-shell`, `rounded-*`), with no `<style>` block and no arbitrary value
(spec, "G1"). It renders the button ladder (plain, ghost, neutral, primary, `btn-soft btn-primary`,
error, a join with a `btn-active` selected segment, a segment marked only `aria-current="page"`, one
disabled), a second join whose selected segment is `btn-primary` (Review focus 1), every alert
variant and a bare `.alert` (the error alert carrying a nested link in the markup
`ConceptList.svelte:325` uses), a checked and an unchecked switch, a `toggle-primary`, a chip, a
field, a card, and a padded dropdown rendered open. The route is owner-only (decision 5) and in no
nav. `admin-visual.spec.ts` captures it in both themes at 1440 and 390.

**Acceptance** (`theme-kit.spec.ts`, both themes, by cookie as `admin-visual.spec.ts` does):
- Radii of 4, 6, and 8px by role; `btn-sm` 36px tall with 14px padding; the plain button's fill and
  edge; the `aria-current` segment rendering as the selected segment; label weights; the soft
  primary's rest and hover fills; the switch's checked track and round knob; `toggle-primary`
  keeping its color; each alert's panel and ink; the dropdown item's concentric radius.
- Review focus 2: with the showcase's compiled site CSS and the hostile unlayered sheet injected
  into the page, the plain button, `btn-sm` height, and the three radii still compute as above.
- Review focus 3: with the join's wrapper set to `dir="rtl"` at a 320px viewport,
  `document.documentElement.scrollWidth` does not exceed the viewport, the outer corners compute
  `--radius-field` on the logical start and end, and the selected segment keeps its hairline.
- The spec fails if a rule lands in a losing layer, the pin reverses, or a class is not compiled
  (the report shows one planted failure: the pin reversed in a scratch build).
- A test asserts the showcase's rendered admin nav carries no link to `/admin/theme-kit`.
- `gateTier: "engine"`. Task checks: a heavy
  `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit.spec.ts custom-screen.spec.ts'`.
  The new `admin-visual` entries are expected to fail until S4; the task does not run them.

---

### Task 13: The proof: contrast, viewports, norms, and the audit

**Files:** a new `examples/showcase/e2e/theme-kit-contrast.spec.ts`,
`src/lib/audit/norms-manifest.json` (regenerated by `norms:generate`), and a new
record `docs/superpowers/research/2026-09-26-theme-identity-pass-a-proof.md`.

**Outcome:** The spec's Proof measurements, taken in a real browser on the fixture and recorded.
`theme-kit-contrast.spec.ts` paints each pair to a canvas and reads it back, as the audit engine
does, and asserts each floor in both themes: every alert ink against its panel and the nested link
in the error alert, 4.5:1; the switch's checked track against `base-100` and its knob against the
track, 3:1; the unchecked track edge and knob against `base-100`, 3:1; the selected segment's text,
4.5:1, and its hairline against the resting sibling and the ground, 3:1; the focus ring on the
plain, neutral, soft primary, and selected buttons, 3:1. Each restyled family's hover step is
measured and recorded, not asserted, along with the soft primary's active step and the dark lift
(decision 3).

**Acceptance:**
- `theme-kit-contrast.spec.ts` passes and writes its numbers into the proof record, one table per
  theme. A floor that fails is a finding returned to the conductor, never a test loosened.
- **The 320 and 390 check:** the `viewport-overflow` and `panel-width` rendered rules pass at both
  widths over the phone desk band, the toolbar row, the `ListToolbar` filter join, `Pagination`,
  and a chip-beside-heading row; `vertical-alignment-recipes.test.ts` passes. Findings recorded.
- `npm run norms:generate` against the built preview, then `npm run norms:check` green; the record
  lists the radius and height bands that moved.
- `npx cairn-audit --rendered` over the showcase admin, run twice; the record sets both runs' totals
  and `weight-budget` and `norms-bands` counts beside task 0's before-runs.
- `BASE_URL=http://localhost:4173 npm run check:touch-targets` and `npm run
  check:interactive-contrast` against the preview, green, quoted.
- `gateTier: "engine"`. Task checks: a heavy
  `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit-contrast.spec.ts'`.

---

### Task 14: The design-system documents

**Files:** `docs/internal/admin-design-system.md`, `docs/internal/public-design-system.md`, and the
"Admin interface design" paragraph of `CLAUDE.md`.

**Outcome:** (spec, "Documentation", "The design-system rule"; fold record, "Errata owed")
- `admin-design-system.md`: the Tokens section (theme values, the alert inks with task 13's
  measured contrast, the switch, the depth language); a corner-system subsection (the ladder, the
  role mapping, true circles by shape, structural zeros, concentric corners); the type recipes
  (page heading `type-title font-[550]`, Lucide at 1.75, and a deliberate 2px stroke written as
  `2.01` or a scoped exception); the chip rule in place of the pill
  geometry; the load-bearing layer rule amended to the spec's three homes; the new rule "identity
  lives in the theme layer" (a new idiom is a theme variable or a cairn-idiom rule, and a
  per-element idiom is a defect); the "Verify visuals on the showcase, not in component tests"
  rule (`:104-107`) rewritten, since component tests now render against the compiled sheet; and
  every `admin-design-system.md` erratum the fold record lists (`:36-42`, `:75-86`, `:80` and
  `:394`, `:264` and `:272`, `:368-378`, `:391`, `:652-677`, `:1278-1282`, `:1320-1348`, and the
  pre-existing drift at `:659-660`, `:1301-1303`, `:1327`), re-located by content if lines moved.
- `public-design-system.md`: the never-cross-over line (`:257-261`) names geometry and edge grammar
  as shared (ruling 2), and `:26-29` and `:75-76` on starter geometry follow.
- `CLAUDE.md`: the "Admin interface design" paragraph's "scoped overrides go in `@layer components`"
  becomes the three homes, in one clause.

**Acceptance:**
- Each fold-record erratum is checked off in the report with its new text quoted.
- No sentence in either document still names the pill family, a violet lift, `text-2xl font-bold`
  for the page heading, `rounded-xl` for the brand mark, or `@layer components` as the home for a
  daisyUI override (the report quotes the greps).
- The measured numbers match the proof record exactly.
- Computed tier (docs). Task checks: `npm run check:docs`.

---

### S1: Fresh-context visual read (conductor-led, parallel with S2)

**Outcome:** One `visual-verifier` dispatch (it must not be a context that built the work) grades the
built showcase against the committed captures: `final-1440.png` and `final-390.png` (light above
dark) and `switch-1440.png`. A Sonnet capture agent first builds and serves the worktree's showcase
(the task 0 recipe) and captures `/admin/theme-kit`, `/admin/posts`, one edit page,
`/admin/vocabulary`, and `/admin/signups` with its dialog open, at 320, 390, 768, 1440, and 2560, in
light and dark, headless. The verifier grades 1440 and 390 against the references device by device
(MATCHED, COSMETIC, STRUCTURAL) and grades 320, 768, and 2560 against the responsive standard
(composed at the extremes, not merely unbroken), running its mandatory contrast probe.

**Acceptance:** a verdict table per page and width lands in the ledger. Every STRUCTURAL item goes
to task 15. COSMETIC items go to the S2 ledger as inputs.

### S2: The felt-refinement audit (conductor-led, parallel with S1)

**Outcome:** Two read-only `claude-opus-5-5` lens agents at `high` over the same captures plus the
live preview, each returning a ledger of items marked already-right, adjust (with the proposed
value), or owner-taste:
- **Typography and rhythm:** the 18px `type-heading` dialog heading and the editor's 30px document
  title at 700 (ruling 6), the page heading at 550, button label weights and tracking, the non-`sm`
  button padding, and vertical rhythm around the resized controls.
- **Color, surface, and depth:** the plain button's hover step, an outline chip's 55% edge beside a
  plain button's 22% edge, the soft primary's active step, the alert panels, the modal's warm
  shadow, and the selected segment in both themes.

**Acceptance:** one merged ledger in the ledger section, expected to be mostly already-right.
`adjust` items go to task 15; owner-taste items go to S3.

### Task 15: Settle fixes (conditional)

Dispatched only if S1 or S2 returns work, as a one-task `pass-execute` run, and again only for S3's
corrections. **Files:** as the items require. **Outcome:** each STRUCTURAL and `adjust` item fixed in
the theme layer (never per element), with its test updated, and the proof record and the design
system updated for any changed value. **Acceptance:** each item closed in the report with its
test; `theme-kit.spec.ts` and `theme-kit-contrast.spec.ts` rerun green; `gateTier: "engine"`;
task checks: the admin CSS set.

### S3: Geoff's before and after (conductor-led, the one owner sitting)

**Outcome:** One combined sitting. The conductor builds a review page showing labeled before and
after pairs at 1440 and 390, light and dark: the task 0 before-set beside the same screens now, and
the fixture screen. The fixture's "before" is the same `+page.svelte` built against `main`'s
engine in a throwaway worktree, so the pair shows plain daisyUI markup rendered stock and rendered
as cairn. The page names the devices to look at: the error alert's token ink and the success alert,
the modal's warm shadow (a first render of a ratified rule), the plain button and its hover step
(graded here per the spec), the selected segment, the switch, and one starter styleguide pair,
since the starter goes live on merge. S2's owner-taste items ride the same page as questions, each
with a recommendation. The page opens in one Chromium tab (the `visual-review-in-local-browser`
memory), or is published as an Artifact if Geoff is away from the workstation.

**Acceptance:** Geoff's verdict is recorded verbatim in the ledger. Corrections go to one task 15
run; the throwaway worktree is removed. The sitting counts as one execution sitting.

### S4: CI baseline regeneration (conductor-led)

**Outcome:** After the last paint change, the conductor pushes, then dispatches `e2e.yml` on the
branch with `update_snapshots: true` (`gh workflow run e2e.yml --ref theme-identity-a -f
update_snapshots=true`), which regenerates `admin-visual` and `site-visual` baselines on the runner
and commits them to the branch. `admin-visual` changes for two reasons at once: the admin theme and
the starter radii in the preview pane. A Haiku probe then confirms the regen commit landed, lists
the PNGs it rewrote, and reads the next full CI run.

**Acceptance:** the regen commit exists on the branch; the next `e2e`, `test`, `design`, and norms
runs are green with no expected-red exceptions left. A workstation-local e2e red on exactly the
regen's files is the durable gotcha, not a failure.

---

### Task 16: Close

**Outcome:** One fold agent (`claude-opus-5-5`) authors the close, commits its draft, then folds;
one independent `diff-reviewer` reads the fold's diff. The cairn-pass pass-end ritual:
- `CHANGELOG.md` gains `## Unreleased` if absent, with one entry: the visible admin change (the
  corner ladder, the hairline plain button, the calmer type, the quiet alerts, the round switch,
  the size step), the admin sheet growth (daisyUI classes 217 to 580, about 1.7x gzip, admin-only,
  calendar excluded), and the starter's ladder and hairline outlines. `Consumers must:` nothing. A
  site with custom admin screens should re-check them, and the entry says why (plain daisyUI
  classes now render cairn's ladder, and a fixed Tailwind radius does not follow it). No version
  bump, no publish.
- **Facts** in `docs/internal/facts/extend.md`, written with the Edit tool: a custom screen's plain
  daisyUI classes now render cairn's ladder; every daisyUI component except calendar is available;
  a bare `btn` is a hairline; fixed Tailwind radii do not follow the ladder, so use
  `rounded-selector`, `rounded-field`, or `rounded-box`; the norms manifest's radius and height
  bands moved. `check:facts` green.
- **Reference pages:** `admin-grammar-tokens.md`, `cairn-audit.md` (the radius example at
  `:455-468`), `components.md` (the status-pill wording at `:25-26`). `check:reference` green.
- **Narrative arms,** under the freeze rule task 0 recorded: `docs/extend/add-a-custom-admin-screen.md:94`
  ("a status pill") and any other sentence the pass made wrong are fixed as deficiencies, or filed
  if that arm's stage is in flight.
- **Remaining errata:** the arc log gains the two owed lines (`--btn-p 0.875rem` applies at
  `btn-sm`, CS-m3; the round 1 lift could not have come from the shipped rule, MX-M1).
  `engine-rulings.md` records the timing-scoped reading of decision 4 in
  `motion-conform-to-daisyui-conventions` (CS-B1), or files the question, and
  `check:rulings-format` stays green.
- **ROADMAP:** the Waymark citation item (`ROADMAP.md:880`) narrowed to the `site.css` and
  `prose.css` cites; the move of pinned rules 1 to 9 into `cairn-idiom` filed as a later ratchet
  shrink; the `ADMIN_CSS_SAFELIST` retirement filed, since the full compile subsumes its daisyUI
  half; pass B filed as the next action's initiative.
- `docs/HISTORY.md` gets the pass entry: what landed, what the gates caught, spend against the 14.5M
  ceiling and 11.6M planned, and what a later pass would be wrong to rediscover (the sublayer and
  its pin; unnested daisyUI declarations; the theme-object key split; component tests on the
  compiled sheet; the expected-red CI set during a render change).
- `docs/STATUS.md`, present tense, at or under 60 lines: pass A merged, pass B next with its plan
  still to author, history moved to HISTORY.
- The conductor marks the PR ready, confirms CI green, and merges `theme-identity-a` to `main`,
  which puts the starter live (spec, "Release"). The worktree is removed after merge.

**Acceptance:** STATUS at or under 60 lines; `check:facts`, `check:reference`, `check:docs`, and
`check:rulings-format` green; the pass score records tokens against the ceiling, planning misses,
and execution sittings (S3 counts as one).

## Ledger

(written by the conductor at each segment boundary)
