# Theme identity pass A: the theme

**Goal:** Move cairn's admin identity into the daisyUI theme layer. The admin sheet compiles every
daisyUI component except calendar, the theme roots become daisyUI theme blocks with split
ownership, and every override of a daisyUI declaration lives in the `cairn-idiom` sublayer with
its full state set. The markup sweep then retires the per-element patches. The starter takes the
shared corner ladder and hairline outlines. A plain-daisyUI fixture screen proves G1 in both
themes.

**Spec:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` (commit `5f7d3fd6`),
approved by Geoff 2026-09-26. This plan covers the spec's "Delivery" pass A only. Pass B (the
`radius-scale` rule, the retired-patch arms, the shipped guidance, the recipe source, the norms
print, the agent-build probe) is out of scope. Executors read the spec sections their task names.
Where this plan and the spec disagree, stop and report, except the plan's decisions on the spec's
"Open for the plan" items and the fold's decisions, recorded under "Decisions this plan takes"
below. Evidence and record: the spike (`docs/superpowers/research/2026-09-26-theme-identity-spike.md`),
the spec's fold record and its verification
(`docs/superpowers/research/2026-09-26-theme-identity-fold.md`,
`docs/superpowers/research/2026-09-26-theme-identity-fold-verification.md`), the spec's prose
review, the arc log (`docs/internal/record/2026-09-26-theme-identity-arc-log.md`), the ratified
captures (`docs/internal/record/2026-09-26-theme-identity/final-1440.png`, `final-390.png`,
`switch-1440.png`), and this plan's review, fold, fold verification, and prose review
(`docs/superpowers/research/2026-09-26-theme-identity-pass-a-review-{contract,mechanics,risk}.md`,
`...-pass-a-fold.md`, `...-pass-a-fold-verification.md`, which produced decision 13, and
`...-pass-a-prose-review.md`).

**Approach:** Build first, then the theme roots at unchanged values (so an equivalence test proves
the re-authoring alone changed nothing), then the new values, then the idiom rules family by
family, then the markup sweep, then the starter, then the fixture and the proof, then the docs.
Settle runs last: a fresh-context visual read, the felt-refinement audit, one owner sitting, and
the CI baseline regeneration. Plans specify outcomes and acceptance, never implementation code.

**Execution mode:** `pass-execute` (by name) for tasks 1 to 14, one invocation per segment, and
**sequential** (`parallel` unset). The runner does no worktree isolation (`repo` is prompt text
only, `pass-execute.js:32-33`), so parallel tasks would share one index, one `base..HEAD` range,
and one `cairn-run-gate` key. Tasks 2 to 8 all edit `src/lib/components/cairn-admin.css`, and
tasks 2 and 5 to 8 also edit `scripts/checks/custom-surface-budget.json`. Those two files are the
contended resources. Every heavy gate also queues on one machine-wide lock. Task 11 is
independent of tasks 9 and 10 (disjoint files) and is marked so, but it still runs in sequence:
`pass-execute-chains` would need a second worktree, an `npm ci`, and a merge, which costs more
than one sequential task.

Args: `repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `gate` set to **the engine string** (see Gates), `commonNotes`
carrying the Global constraints, and each task's `gateTier` and `model` as the task states. The
`gate` arg must equal the pinned tier's string exactly. For a pinned task the runner hands the
reviewer `t.gate || a.gate` (`pass-execute.js:286-288`), and any other string draws a blocking
MISMATCH on every task. Each task's `criteria` carries its acceptance lines verbatim, including
its task-check strings and the rule that a missing or red task check is blocking, because the
reviewer never sees `commonNotes` (`reviewPrompt` sends only `criteria` and the implementer's
report). Task 15 is a one-task `pass-execute` run, dispatched only if the settle steps return
work. Steps S1 to S4 are conductor-led. Task 16 is the close, authored by one fold agent with one
independent `diff-reviewer` read.

**`code-simplifier`:** the conductor dispatches it once at each segment boundary A to D, between
`pass-execute` invocations, over the segment's changed code. `cairn-implementer` has no Agent
tool, and the runner has no simplifier phase. The simplifier's changes take one engine gate and
one commit before the boundary push. That gate runs inside **a gate agent** (below), never in the
main loop.

**The gate agent:** every heavy gate the conductor needs outside a `pass-execute` chain (task 0
item 8's baseline and each boundary `code-simplifier` re-gate) runs inside one Sonnet
`general-purpose` agent per call, dispatched by the conductor at `high`. The agent runs
`cairn-run-gate '<the engine string>'` in the worktree, re-issuing the same command on exit 75
until it prints `gate exit:`. It returns the `gate exit:` line and the tail of the log. The main
loop never runs a heavy gate itself.

**Models:** Sonnet `cairn-implementer` at `high` by default. Task 3 runs with `model: "opus"`: it
picks the mechanism that moves component tests onto the compiled sheet and writes the
equivalence probe, which the spec leaves to the plan. `claude-opus-5-5` for every
`diff-reviewer`, the `visual-verifier` (S1, S4), both felt-audit lenses (S2), and the close's
fold agent. Capture agents and gate agents are Sonnet `general-purpose` at `high`. CI probes are
Haiku.

**Token ceiling:** 20M, flag at 16M (80%). The flag sits above the planned spend of about 15.8M,
so it marks an overrun past plan. Derivation:

| Item | Spend |
| --- | --- |
| Fourteen implementer chains at about 0.5M each (Sonnet implementer, Opus diff review, gate and task checks; up from 0.45M for the fold's added state and pair coverage) | 7.0M |
| Task 3's Opus upshift | 0.3M |
| Fix rounds on about a quarter of the chains at 0.25M | 0.9M |
| Task 0's before-state capture agent (item 9), its baseline gate agent (item 8), and its gate-wiring dispatch (item 6, about 0.2M) | 0.5M |
| `code-simplifier` and its gate at four boundaries, 0.2M each | 0.8M |
| S1's capture agent and `visual-verifier` over the widened page set | 0.9M |
| S2's two audit lenses | 0.8M |
| Task 15, two runs (the settle, then S3's corrections) | 1.0M |
| S3's sitting page and the fixture "before" build | 0.4M |
| S4's regen, CI reads, and the `visual-verifier` read of the regenerated set | 0.4M |
| The close's fold and review (a recorded close ran about four times its sizing, `docs/HISTORY.md:827-828`) | 1.5M |
| The conductor sessions, both halves of the resume point | 1.2M |
| CI probes at the boundaries | 0.1M |
| **Planned total** | **about 15.8M** |

**Counting rule:** what `/cost` reports for the conductor session. Before segment A, the
conductor records in the ledger whether `/cost` includes subagent and workflow agents; if not, it
names the counter it uses instead. If the flag trips in segment E, its question rides S3's
sitting. The close proceeds without a second question unless spend passes the ceiling.

**Segments and checkpoints:** the checkpoint interval is four tasks, and every checkpoint falls on
a segment boundary. Each boundary sits on a commit whose engine gate ran green.
- Segment A: task 0 (conductor), then tasks 1 to 4. The build and the theme roots.
- Segment B: tasks 5 to 8. The idiom rules.
- Segment C: tasks 9 to 11. The markup sweep and the starter.
- Segment D: tasks 12 to 14. The fixture, the proof, and the design-system docs.
- Segment E: S1 and S2 in parallel, then task 15 if either returns work.
- **Resume point.** The conductor writes STATUS with a resume prompt, points it at this plan's
  ledger, and closes the session. S3 needs Geoff attended, possibly hours later, and the
  conductor has carried fourteen chains by then. A fresh Opus 5.5 session resumes at segment F.
  If the window ends earlier, the D-to-E boundary is also a sanctioned close point.
- Segment F: S3 (the owner sitting), task 15 again only for the sitting's corrections, then S4
  (the CI baseline regeneration).
- Segment G: task 16, the close.

At each boundary the conductor runs `code-simplifier` (A to D), pushes the branch, writes the
ledger at the foot of this file (tasks, spend, decisions, verdicts, next task), and reads CI
through one Haiku probe agent. The probe reports failing jobs, failing spec file names, and, for
each failure inside the two visual specs, whether it is a `toHaveScreenshot` mismatch or a
missing baseline.

**The expected-red set:** until S4, the `e2e` workflow's `admin-visual.spec.ts` screenshot
mismatches fail by design (the render changes and the baselines are CI-canonical).
`site-visual.spec.ts` screenshot mismatches join the set only from the segment C push, which
carries task 11. Tasks 1 to 10 change nothing on the public site, so a `site-visual` red before
task 11 is the signal of an unintended public change. Until task 13 the norms freshness job
fails. Inside the two visual specs, only a `toHaveScreenshot` mismatch is expected; a crash, a
timeout, or a missing locator is red. From task 12's push, a missing-baseline failure ("A
snapshot doesn't exist") on a new `theme-kit` entry in `admin-visual.spec.ts` is also expected.
The Haiku probe reports that failure by its message, so the conductor can tell it from a
mismatch. A boundary passes when CI's failures are a subset of that set. Any other red
re-dispatches the task that owns it, with the failing step named. The conductor opens the pass PR as a draft at
the segment A push, so `pull_request` CI runs on every later push.

**Worktree:** `.claude/worktrees/theme-identity-a`, branch `theme-identity-a`, off `main` now. The
theme pass goes first (arc log, ruling 3 reversed, Geoff 2026-09-26). Draft docs pass 0+1 pauses
at its next gate-green boundary and keeps its work unmerged on `draft-docs-0`. Task 0 creates the
worktree after verifying that pause.

**Gates:** `pass-execute` has the implementer run `scripts/checks/gate-tier.mjs`, which prints a
fixed tier string. Set no task-level `gate`: the implementer runs the classifier's printed string,
and for a pinned task the reviewer compares it against `t.gate || a.gate`.
- **The engine string**, which `gate-tier.mjs --pin engine` prints once task 0 item 6 lands
  (decision 13):
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism`.
  At plan time on `main` it printed the same string ending `&& npm test`, which runs the
  component project in parallel. Task 0 item 7 confirms the new string, and the conductor passes
  the confirmed string as `gate`.
- **Paint tasks pin `gateTier: "engine"`.** The computed tier for `src/lib/components/**` is
  `admin-visual`, and its `admin-visual.spec.ts` leg fails on every deliberate render change until
  S4 regenerates the baselines on CI. The per-rule proof lives in the component tests, which the
  engine tier runs. The showcase e2e runs where a task names it, and at every boundary on CI.
- **Task checks.** A task that names extra checks runs each through `cairn-run-gate` after its
  tier gate. It quotes each `gate exit:` line in its report's `gateOutput`, under a "Task checks"
  heading after the tier gate's tail. The diff reviewer treats a missing or red task check as
  blocking. Each task's criteria spell out its task checks in full.
- **The admin CSS set:**
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.
  `check:idioms` bans pass-scoped citations in `src/lib` ("Round N", "Pass A", "Task N",
  "design-arc D2") and checks indentation and gate naming under `scripts/`.
  `check:invisible-craft` scans `examples/showcase/src/routes`. Both run only in CI's `test.yml`,
  so the set runs them per task.
- **The showcase set** (light, for tasks that touch `examples/showcase`):
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'`.
- **The comments check** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`.
- **A showcase e2e run** is heavy: `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- <spec>'`,
  preceded by the port check (Global constraints).

The heavy lane serializes: one browser gate on the machine at a time. The engine string runs the
vitest component project serialized (`--no-file-parallelism`, decision 13). Stock `npm test` runs
it in parallel, stalls on this workstation's recorded state, and is not a gate for this pass.
A component-test stall under a concurrent gate is contention, so rerun that file alone before
calling it red (the `concurrent-pass-flaky-tests` and `vitest-browser-parallel-pages-stall`
memories). The conductor runs no heavy gate itself; a gate agent runs each one (see "The gate
agent" above).

## Decisions this plan takes

The spec's "Open for the plan" items, and the plan review's fold, settled here so no implementer
invents them:

1. **Rule 11 widens.** When it moves into `cairn-idiom`, the outline and dash ink rule keys on all
   five selected forms (decision 9), not `.btn-active` alone. Reason: the selected-segment rule
   keys on all five, so a `btn-outline` pressed by attribute would otherwise keep stock ink while
   its `.btn-active` twin does not.
2. **Light's selected-segment hairline seeds from the locked 55% mix**
   (`color-mix(in oklab, var(--color-base-content) 55%, transparent)`, the value
   `segmentTintClass` already carries at `segmented-control.ts:22-24`), so the admin has one
   pressed hairline. Dark starts from rule 10's locked `oklch(57% 0.012 75)`. Task 6 measures both
   against the pair table's grounds at 3:1; a value that fails moves in lightness only, and the
   report says why it differs from the seed.
3. **The soft primary's active step starts at 22%** (the spike's value) and is kept if task 13
   records a visible step from the 15% hover. **The dark warm lift** takes the dark theme's
   `--cairn-shadow` tint (`oklch(10% 0.02 75)`, `cairn-admin.css:501`) at the light lift's
   geometry and alpha: `0 1px 2px -1px oklch(10% 0.02 75 / .35)`. Task 13 records both.
4. **Alert rules exclude daisyUI's style variants** (`alert-soft`, `alert-outline`, `alert-dash`),
   the narrow-selector condition applied to alerts. A developer's styled alert keeps daisyUI's look.
5. **The fixture route is owner-only** in `examples/showcase/src/access.ts`, beside `/admin/signups`,
   and appears in no nav config.
6. **The component tests reach the compiled sheet by a test-time mechanism task 3 chooses**, with a
   guard test that fails if the mechanism is removed (task 3 states the constraints). Task 2 makes
   the component project rebuild the sheet before every run, so the compiled sheet is never stale.
7. **The site-theme pin** is task 11's to choose, proven by a computed-style test.
8. **Per-site radius roles** the role rules do not settle are listed by task 10's implementer and
   ruled by its diff review, as the spec directs.
9. **`:checked` is the fifth selected form.** daisyUI's own state model treats a checked `.btn` as
   selected: `.btn:where(:checked:not(.filter [type=radio].btn))` sets `--btn-color` to primary and
   `--btn-fg` to primary-content (`node_modules/daisyui/components/button.css`, 5.7.44). The five
   forms are `.btn-active`, `[aria-pressed='true']`, `[aria-checked='true']`,
   `[aria-current]:not([aria-current='false'], [aria-current=''])`, and
   `:checked:not(.filter [type='radio'].btn)`. They key the selected-segment rule (task 6) and rule
   11 (decision 1), and the plain hairline excludes all five (task 5). On a plain `:checked`
   segment the selected rule also neutralizes daisyUI's checked primary, so its ink is the
   selected segment's ink, never primary-content on the wash. A color-variant `btn` that is
   checked keeps its variant, as the other four forms do.
10. **Classes the sweep removes from the engine sheet go on the compatibility safelist** in
    `scripts/build/admin-css.input.css`, per the inventory test's issue-#12 contract
    (`admin-sheet-inventory.test.ts:7-15`). A consumer's markup that uses `rounded-lg` or
    `shadow-none` keeps rendering as before, and the spec's point that fixed radii do not follow
    the ladder stays true. A class a task adds is regenerated into the inventory through
    `npm run update-admin-sheet-inventory`. The inventory test stays green at every task, and the
    close's CHANGELOG entry notes the safelist growth.
11. **The next release containing this work is `0.98.0`, a minor.** Consumers are on `^0.97.0`,
    and a visible retheme of every consumer's admin must not arrive under a caret patch. A hotfix
    before that cut branches from `v0.97.0`. The close records the planned number; the cut stays
    Geoff's deliberate act.
12. **This pass goes first, ahead of draft docs pass 0+1.** Geoff reversed the spec's ruling 3 on
    2026-09-26 (`docs/internal/record/2026-09-26-theme-identity-arc-log.md`, "Ruling 3 reversed").
    The worktree branches from `main` now. Draft docs pass 0+1 pauses at its next gate-green
    boundary and stays unmerged on `draft-docs-0` until this effort merges. Task 0 item 1 verifies
    the pause. The spec's Delivery section now says the same. The conductor reads "this effort"
    as the whole theme identity initiative, so draft docs resumes after pass B merges.
    That reading is the conductor's; Geoff confirms it at the S3 sitting.
13. **The engine tier runs the component project serialized.** Task 0 item 6 changes
    `gate-tier.mjs` so the scripts and engine string ends
    `npm run test:node-projects && npm run test:component -- --no-file-parallelism`. `package.json`
    gains `test:node-projects` (the three node projects `npm test` runs today), and `test` becomes
    `npm run test:node-projects && npm run test:component`. Reason: stock parallel `npm test`
    stalls in the component project on this workstation, and serial runs are clean
    (`vitest-browser-parallel-pages-stall` memory; `docs/HISTORY.md:545-549`). The runner forces
    the tool's printed string on every pinned task, so the serialization must live in that string.
    An implementer's own serialized run would otherwise draw a MISMATCH. The change lives in the
    tool, not in `vitest.config.ts`. `gate-tier.mjs` runs only locally, so CI keeps running
    `npm test` in `test.yml` with its component project parallel, unchanged. A config-level
    `fileParallelism: false` would also serialize CI, which shows no stall, and lengthen every CI
    run. The project list stays in one place, `package.json`. A later pass may restore the
    parallel string once stock `npm test` passes after a reboot.

## Global constraints

- Every rule that overrides a daisyUI declaration lives in `@layer utilities { @layer cairn-idiom
  { ... } }` in `src/lib/components/cairn-admin.css` and meets the spec's three conditions: full
  state set, narrow selector, variables first (spec, "The cairn-idiom sublayer"). Selectors use
  the file's house scope `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`.
  No new unlayered rule, and no new `@layer components` rule that competes with daisyUI.
- **Every idiom test covers the full state set.** It asserts each property its rule sets at rest,
  hover, focus-visible, and active, in both themes, and at disabled where the rule does not
  exclude disabled. A state the rule leaves to daisyUI is asserted to match stock, which proves the
  `:not(...)` exclusion. daisyUI restates the button variables at `:focus-visible`, `:checked`, and
  `:active`, so a rule right at rest and hover can still vanish there.
- Every `cairn-idiom` rule ships a component test proving two things: it renders, and a markup
  utility beats it. Tests render against the compiled sheet (`dist/components/cairn-admin.css`),
  never the raw partial. A "loses to a utility" case uses a utility the compiled sheet carries, or
  supplies it through `hostCss` wrapped in `@layer utilities { ... }`, the way a consumer's own site
  sheet does. The admin build scans only `src/lib/components` and `src/lib/admin-toolkit`, so a
  utility written only in a test is not compiled (`shadow-lg`, `rounded-none`, and `border-error`
  are absent at plan time).
- **A fresh sheet for every test result.** No component-test result counts, a mutation included,
  unless the admin sheet was rebuilt in the same run. From task 2 on, the component project's own
  pre-run build guarantees it; before that, run `node scripts/build/build-admin-css.mjs` first.
  Each mutation-ledger row records the rebuild.
- **Colors compare through the oracle.** A test comparing a computed color with a `color-mix(...)`
  or `var(...)` expression resolves the expression through `_idiom-probe.ts`'s `resolveColor`,
  never a hand-written serialized string.
- **Ports.** Every preview a task, capture agent, or the conductor serves outside Playwright runs
  on a port other than 4173 (4391 by default), is reached through `BASE_URL`, and is stopped on
  exit, and the report says so. Before a heavy showcase e2e, the runner confirms nothing listens
  on 4173 (`ss -ltnp 'sport = :4173'` prints no listener) and quotes the output under Task
  checks, because the showcase's Playwright config reuses any server already there
  (`playwright.config.ts:29-32`, `reuseExistingServer: !process.env.CI`). Before any command that
  measures a served preview through `BASE_URL`, the runner confirms the listener's working
  directory is this worktree (`ss -ltnp` plus `/proc/<pid>/cwd`) and quotes it.
- Every showcase build outside `test:e2e` runs `npm run package` first (only `pretest:e2e`
  repackages the engine).
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
- `admin-sheet-inventory.test.ts` stays green at every task (decision 10).
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
   (`join-item btn btn-primary` or `btn-error`, selected by each of the five forms). It must
   keep its variant fill and never take the neutral wash or the hairline. A selected plain segment
   carrying `text-error` keeps the red ink. A daisyUI radio join (`<input class="join-item btn"
   type="radio">`) renders its checked segment as the selected segment with readable ink. Task 6,
   `BtnActiveDarkGround.test.ts`.
2. **A hostile host stylesheet.** An unlayered host sheet (`div { font-family: Georgia;
   -webkit-font-smoothing: auto; scrollbar-width: auto; color-scheme: dark }`) must not move any
   computed theme value relative to the pre-edit sheet under the same host (task 3, the
   equivalence test's hostile twin). A host's own compiled Tailwind and daisyUI sheet, loaded
   before or after the admin sheet, must not stop an idiom rule from rendering (task 12,
   `theme-kit.spec.ts`). A host-after order that loses rule 11 to a host `site-theme` sublayer is
   a recorded finding for the conductor, not a patch.
3. **An RTL layout at 320px.** The fixture's join in `dir="rtl"` at a 320px viewport shows no
   horizontal page overflow, rounds its outer corners at `--radius-field` on the logical start and
   end, keeps its structural inner zeros, and keeps the selected segment's hairline. Task 12,
   `theme-kit.spec.ts`. A failure caused by daisyUI's own join geometry is reported, not patched.
4. **A developer's own `rounded-*` on a daisyUI component.** `btn rounded-full` stays fully round
   and `btn rounded-none` stays square (task 5); a `rounded-none` item inside the padded dropdown
   keeps 0 despite the concentric rule, and `toggle rounded-none` squares the switch (task 7).
5. **Dark mode with a pressed segment and a checked switch.** An `aria-pressed="true"` segment in
   `cairn-admin-dark` on a `base-100` card, at rest, hover, focus-visible, and active, shows the
   wash, weight 600, and the state hairline, and its focus ring resolves to a color other than
   `base-100`. A checked switch at focus-visible does the same: its knob and its ring share
   `currentColor` in daisyUI's toggle, so a base-100 knob must not take the ring with it. Tasks 6
   and 7; task 13 measures both rings at 3:1.

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** The conductor verifies the start conditions and records each in the ledger. Task 0
takes no tier gate of its own. Item 6's dispatch runs a targeted unit test and one light check.
Item 8's baseline runs in a gate agent, never in the main loop.

1. **Draft docs pass 0+1 is paused.** Its pause is recorded in its own ledger or STATUS, naming
   its head commit. `draft-docs-0`'s head still equals that commit (no commit since the pause),
   `git -C .claude/worktrees/draft-docs-0 status --porcelain` is empty, and `pgrep -af
   'worktrees/draft-docs-0'` finds no process, so no gate runs from its worktree. The conductor
   records the head SHA; the plan-time head was `85efee59`. If the pause is not recorded, or any
   check fails, stop with one message to Geoff: two executors must not race.
2. **No live executor** on the target path: `pgrep -af theme-identity-a` is empty and no
   `theme-identity-a` worktree or branch exists.
3. **Worktree:** create `.claude/worktrees/theme-identity-a` on a new `theme-identity-a` off
   `main`; `npm ci`; then `npm ci --prefix examples/showcase` (never `npm install`, which can
   rewrite the committed showcase lockfile), and confirm with `realpath` that the showcase's
   `node_modules/@glw907/cairn-cms` resolves into the worktree (the durable gotcha "A worktree
   showcase e2e proves MAIN's engine").
4. **Re-count the spec's inventories** in the worktree and record each against its plan-time
   count. Plan-time counts at `48a87c62`, re-verified by the plan review: daisyUI 5.7.44 and
   Tailwind 4.3.3 installed; 18 unlayered allowlist entries and `componentsLayerCap` 19 in
   `scripts/checks/custom-surface-budget.json`; 217 daisyUI classes in the admin sheet inventory;
   85 fixed-radius matches of the spec's post-condition pattern in 17 `.svelte` files under
   `src/lib/components` and `src/lib/admin-toolkit`; 24 `rounded-full`; 4 ink-opener recipes
   (`hover:bg-[var(--cairn-ink-hover)]`); 1 Publish tint recipe; 5 `shadow-none`; 8
   `border-radius:` literals in `<style>` blocks (HelpHome 6, `Tooltip.svelte:409`,
   `PreviewBanner.svelte:95`) plus the two `0.75rem` fallbacks at `MediaInsertPopover.svelte:426,446`;
   1 `type-title font-bold`; 16 inline `stroke-width="2"` sites. A changed daisyUI or Tailwind
   version, or a count off by more than about 10%, is a stop-and-report: the spec's mechanisms
   were measured on these versions.
5. **The freeze rule:** read the narrative-arm rule in `CLAUDE.md` on `main` and record it. With
   `draft-docs-0` unmerged, `main` carries the full freeze: no pass rewrites the narrative arms,
   and a deficiency a pass discovers is fixed on the page. Task 14 and the close apply it.
6. **The serialized engine string** (decision 13). One `cairn-implementer` dispatch (Sonnet,
   `high`) in the worktree makes these changes and commits them as one `build(test)` commit:
   - `package.json` gains `"test:node-projects": "vitest run --project unit --project
     unit-dist-spawn --project integration"`, and `test` becomes `npm run test:node-projects &&
     npm run test:component`. What `npm test` runs does not change.
   - `scripts/checks/gate-tier.mjs`'s `SCRIPTS_GATE` ends `npm run check && npm run
     test:node-projects && npm run test:component -- --no-file-parallelism`. npm appends the flag
     to `test:component`'s single command, and `contained.mjs` forwards its arguments to vitest.
     A comment states why the gate serializes and that CI runs `npm test`.
   - `src/tests/unit/gate-tier.test.ts` asserts that `TIER_GATES.engine` ends with the
     serialized component run.
   - `docs/internal/pass-gate-tiers.md`'s scripts row quotes the new string.
   - `.github/workflows/test.yml` is not touched; its `npm test` step keeps the parallel run.

   The dispatch runs `npx vitest run --project unit src/tests/unit/gate-tier.test.ts` and
   `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs && npm run check:idioms'`, and quotes
   both. Item 8's baseline is its full gate. A red or missing check stops the pass with one
   message to Geoff.
7. **The engine string:** run `node scripts/checks/gate-tier.mjs --range HEAD~1..HEAD --pin engine`
   in the worktree and confirm it prints the engine string under Gates. A different string
   replaces it as the `gate` arg and is recorded.
8. **Baseline gate:** one gate agent (Sonnet `general-purpose` at `high`, see "The gate agent")
   runs `cairn-run-gate '<the engine string>'` in the worktree and returns the `gate exit:` line
   and the tail of the log. The conductor quotes that return as task 0's gate evidence to task 1's
   reviewer. If the serialized component run stalls (a page prints
   `Cannot connect to the server in 60 seconds`, or the run makes no progress), the pass stops
   before segment A with one message to Geoff. The remedy is a reboot and a retest, per the
   `vitest-browser-parallel-pages-stall` memory. No rerun or further serialization clears this
   stop.
9. **Before-state capture** (one Sonnet `general-purpose` agent at `high`, headless only, in the
   worktree at its head, which renders `main`'s admin because item 6 changes only the test and
   gate wiring): `npm run package`, build the showcase (`VITE_CAIRN_E2E=1 npm
   --prefix examples/showcase run build`), serve it on 4391 (`CAIRN_DEV_BACKEND=1 npm --prefix
   examples/showcase run preview -- --port 4391`), and capture full-page PNGs at 1440 and 390,
   light and dark (theme by the `cairn-admin-theme` cookie, as `admin-visual.spec.ts` does), of
   the S1 page set that exists on `main`: every page `admin-visual.spec.ts` captures (read the
   spec's test titles for the list; it already covers `/admin/login` and `/admin/signups`),
   `/admin/signups` with its delete dialog open, `/admin/help`, and the media library's bottom
   sheet open at 390. Run `BASE_URL=http://localhost:4391 npx cairn-audit --rendered` over the
   showcase admin twice (its counts vary between identical runs; STATUS carries the watch). Record both
   runs' totals and, by finding identity, the findings of `weight-budget`, `norms-bands`,
   `touch-targets`, `focus-renders`, `interactive-contrast`, `border-contrast`, and
   `chip-ground-collision`. The agent stops its server and says so. Commit the PNGs and a short
   record to `docs/internal/record/2026-09-26-theme-identity/pass-a-before/` on the branch.
10. **`/cost` coverage:** record whether `/cost` includes subagent and workflow agents.

**Acceptance:** the ledger carries items 1 to 10. A stop condition in item 1, 4, 6, or 8 halts the
pass with one message to Geoff.

---

### Task 1: The full compile, the layer pin, and the `motion-vocabulary` fix

**Files:** `scripts/build/admin-css.input.css`, `scripts/build/build-admin-css.mjs`, a new
`scripts/build/daisyui-classes.mjs`, `src/tests/unit/admin-css-build.test.ts`,
`src/tests/unit/admin-sheet-inventory.test.ts` and its committed inventory (regenerated through
`npm run update-admin-sheet-inventory`), a new `src/tests/unit/admin-sheet-presence.test.ts`, a
unit test for the generator, the header comment of `src/lib/components/admin-css-safelist.ts`,
`src/lib/audit/rules/static/motion-vocabulary.ts`, and its test
(`src/tests/unit/audit/rules/motion-vocabulary.test.ts`).

**Interfaces produced:** `scripts/build/daisyui-classes.mjs` exports
`listDaisyuiClasses({ exclude, root })`, returning every class selector found in
`<root>/{components,utilities}/*/object.js` minus the excluded modules, where `root` defaults to
`node_modules/daisyui`. The build emits `@layer utilities.daisyui, utilities.cairn-idiom;`
directly after its existing `@layer properties, theme, base, components, utilities;` line.

**Outcome:**
- The admin sheet compiles every daisyUI component except calendar (spec, "One compiler, every
  component", D2). The plugin line becomes `@plugin "daisyui" { themes: false; exclude: calendar;
  }` and the generated list reaches the compile through one `@source inline(...)`, filled at build
  time so it tracks daisyUI upgrades with no hand-kept list. The existing hand-kept safelists in
  the input file stay (they carry Tailwind utilities and the documented public classes). The pin
  statement lands in the output. `admin-css-safelist.ts` keeps its list, and its header stops
  claiming that the admin compiles only a curated subset of daisyUI; it says the full compile now
  covers every daisyUI class and the list remains as a scan source.
- **The `motion-vocabulary` fix:** its companion selector comparison matches any comma-separated
  part of a selector, not the whole selector with `===` (`motion-vocabulary.ts:204-208`). It ships
  in `cairn-audit`, so it lands before task 3 changes the roots.

**Acceptance:**
- The generator unit test runs against the installed daisyUI: the result includes `timeline`,
  `rating`, and `rounded-selector`. The calendar classes are the difference between the lists with
  and without `exclude: ['calendar']`. That difference is non-empty, and every class in it is
  defined in `node_modules/daisyui/components/calendar/object.js`. Pointed at an empty `root`
  fixture, the generator throws naming the root (a
  renamed module directory would otherwise pass silently).
- `admin-sheet-presence.test.ts` asserts the compiled sheet carries `timeline`, `rating`,
  `radial-progress`, `countdown`, `alert-info`, `toggle-primary`, `toggle-sm`,
  `rounded-selector`, `rounded-field`, and `rounded-box`, and none of the calendar classes as the
  generator derives them. It fails if the generator drifts or daisyUI renames a module.
- `admin-sheet-inventory.test.ts` passes on the regenerated inventory; the report states the
  daisyUI class count before and after (expected 217 and 580) for the changelog.
- `admin-css-build.test.ts` asserts the pin statement follows the layer-order line, and fails if
  the two sublayer names are reversed.
- `motion-vocabulary.test.ts` gains a case with a comma-separated selector list whose second part
  is `[data-theme='cairn-admin']`, and it passes; the prior whole-selector cases still pass.
- The report records the sheet's size (raw, minified gzip, minified brotli) against the spike's
  table's "All components, calendar excluded" row; a result more than 10% off that row's 53.0 KB
  minified gzip is a finding. Task 1 adds no theme blocks and no sublayer rules, so the full
  spike's 53.2 KB is not its comparison.
- **Mutation:** deleting the `@source inline` line, then rebuilding, makes the presence test fail.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 2: The cairn-idiom sublayer, its gate category, the probe, and the first two rules

**Files:** `scripts/checks/check-custom-surface.mjs`, `scripts/checks/custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`, the gate's unit test under
`src/tests/unit/`, `src/lib/components/cairn-admin.css`, `vitest.config.ts` (the component
project's pre-run build), a new shared helper `src/tests/component/_idiom-probe.ts` and its
self-test, and a new `src/tests/component/cairn-idiom-surface.test.ts`.

**Interfaces produced:**
- The `cairn-idiom` block in `cairn-admin.css`, the one home every later idiom rule joins.
- `custom-surface-budget.json` gains an `idiomLayerCap` beside `componentsLayerCap` for the admin
  tree (the showcase tree gets `0`).
- **The component project rebuilds the admin sheet before it runs**, through a project-level
  vitest `globalSetup` on the component project that runs `build-admin-css.mjs`, so `npm test`, the
  engine string, a TDD loop, and every mutation read a fresh `dist/components/cairn-admin.css`. An
  npm pre-step does not qualify: a direct `npx vitest run --project component <file>` bypasses it.
  vitest 4.1.11 runs a project's own `globalSetup` (`TestProject._globalSetups`).
- `_idiom-probe.ts` exports:
  - `renderInTheme(html, theme, opts)`: mounts markup under a bare `data-theme` wrapper with the
    compiled sheet injected once. `theme` is `'cairn-admin'` or `'cairn-admin-dark'`.
    `opts.hostCss` is an optional sheet, and `opts.hostOrder` places it `'before'` or `'after'`
    the admin sheet (default after).
  - `styleOf(el, prop, state)`: reads a computed value at `rest`, `hover`, `focus-visible`, or
    `active`, through real input. Hover uses `userEvent.hover`. Focus-visible uses keyboard focus
    (`userEvent.tab`, or a keyboard event followed by focus). Active uses a CDP
    `Input.dispatchMouseEvent` `mousePressed` with no release through `cdp()` (the precedent at
    `src/tests/component/reproductions-containment.test.ts:17,114`), released after the read.
    CDP input coordinates are in top-level viewport space, and a browser-mode test runs in a child
    frame. The press point is therefore the element's rect center offset by
    `window.frameElement`'s rect, with any scale between the frames applied.
    Before reading, it asserts `el.matches(':hover' | ':focus-visible' | ':active')` and throws
    naming the state otherwise.
  - `resolveColor(expr, theme, context?)`: paints a color expression on a probe element and
    returns its computed value, the one color oracle every idiom test uses. By default the probe
    sits inside the same wrapper. When `context` is given, the probe sits inside that element, so
    a variable the element's classes set (for example `.alert-info`'s `--alert-color`) resolves
    as it does on the element. The self-test proves both placements.

**Outcome:** `check:custom-surface` gains the spec's third category (spec, "Gates and the pinned
rules"). The cairn-idiom block is parsed by brace matching, the way the components block is, and
its selectors count against `idiomLayerCap`. Its `SCOPED_RULE` count of unlayered rules excludes
the block. The custom-surface ledger gains an entry for the category and for each rule in it.
Two dead `@layer components` rules move into the sublayer and render for the first time:
- **The `btn-primary` warm lift** as `--btn-shadow`: `0 1px 2px -1px oklch(35% 0.04 75 / .35)` in
  light and `0 1px 2px -1px oklch(10% 0.02 75 / .35)` in dark (decision 3), identical in every
  state. It replaces the dead violet-pair lift (spec, "Material"), which is two selectors
  (`.btn-primary:not(:disabled)` and its `:hover`).
- **The `.modal-box` repair**, whose warm shadow replaces daisyUI's theme-invariant black.

`componentsLayerCap` drops from 19 to 16 (three selectors leave), and `idiomLayerCap` equals the
block's selector count. Each later task that adds or moves an idiom rule updates the cap to the
new exact count and adds its line to the custom-surface ledger.

**Acceptance:**
- The gate's unit test plants a sublayer rule written in house style and passes it inside the cap;
  plants one selector over `idiomLayerCap` and fails naming the cap; and plants the same rule
  unlayered and fails as an unsanctioned unlayered rule.
- The probe's self-test, on a stock plain `btn` in both themes: `styleOf` reaches each of the four
  states, and the `active` read of `translate` differs from rest and equals the computed form of
  daisyUI's `translate: 0 .5px` (`0px 0.5px`). A
  `styleOf` call whose state is not reached throws. `resolveColor('var(--alert-color, red)', theme,
  el)` on an `alert alert-info` element returns the info color, and the same call without `el`
  returns red.
- A guard test compares the modification times of `dist/components/cairn-admin.css` and
  `src/lib/components/cairn-admin.css` and fails when the dist sheet is older. Mutation (in the
  mutation ledger): with the `globalSetup` entry removed, touch `cairn-admin.css` and run the
  component project; the guard fails.
- `cairn-idiom-surface.test.ts`, both themes, all four states: the primary's computed
  `--btn-shadow` equals the decision 3 value for its theme (the variable, not the whole
  `box-shadow`, whose inset layer moves when task 4 zeroes `--depth`); the modal box's
  `box-shadow` is the warm repair. A markup utility beats each rule (`shadow-none` on the primary,
  and a `shadow-lg` utility supplied through `hostCss` in `@layer utilities` on the modal box).
- **Mutations** (each after a rebuild): moving the lift rule unlayered makes its
  loses-to-a-utility test fail; reversing the pin in the build makes its renders test fail. The
  report's mutation ledger shows both fired.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 3: The theme roots as daisyUI theme blocks, at unchanged values

**Model:** `opus`.

**Files:** `src/lib/components/cairn-admin.css` (the two theme roots only), a new
`src/tests/unit/admin-theme-completeness.test.ts`, a new
`src/tests/component/admin-theme-equivalence.test.ts` with its two committed expectations
`src/tests/fixtures/admin-theme-computed.json` and `src/tests/fixtures/admin-theme-computed-hostile.json`,
`src/tests/unit/admin-css-build.test.ts`, `vitest.config.ts` or a component setup file (the
mechanism below), `src/tests/component/EditorToolbar.test.ts`, and any component test whose
import of the raw partial the mechanism replaces. `ReproContext.svelte`, `CairnAdminShell.svelte`,
`LoginPage.svelte`, and `ConfirmPage.svelte` are read and change only if the mechanism needs it.

**Interfaces produced:** the two expectation files pin every computed theme value on four
elements: the light wrapper (a `div`), a light child (a `span`), the dark wrapper (a `div`), and a
dark child (a `span`). The bare file is read with no host sheet; the hostile file is read under
Review focus 2's hostile sheet. The equivalence test carries an update mode (an environment flag
named in its header) that regenerates both files. Task 4 uses it and diffs the result.

**Outcome:** D1 lands with every value unchanged (spec, "D1").
1. **Before editing the roots,** generate both expectation files from the current compiled sheet:
   every property declared in the two roots on `main`, custom and non-custom, read on the four
   elements.
   The wrapper is a `div`, so the hostile `div` rule meets the unlayered `[data-theme]` rule there;
   the child is a `span`, so the run proves inheritance through the wrapper.
2. **The plugin blocks.** `@plugin "daisyui/theme"` blocks named `cairn-admin` and
   `cairn-admin-dark` carry exactly the keys of daisyUI's theme object: `color-scheme`, the twenty
   `--color-*` roles, the three radii, the two sizes, `--border`, `--depth`, and `--noise`.
   `default` and `prefersdark` stay off. No value contains a top-level comma or a single quote.
3. **The plain unlayered root rule** on the same two selectors keeps everything else: the
   `--cairn-*` tokens, the font variables, `--cairn-shadow`, `--color-muted`, `--color-subtle`,
   `--color-positive-ink`, the nested motion rules, and every non-custom declaration
   (`font-family`, smoothing, `font-synthesis`, `scrollbar-*`, `-webkit-tap-highlight-color`, and
   a restated `color-scheme`).
4. **Component tests render against the compiled sheet** (spec, D1, fourth bullet). The mechanism
   must meet five constraints. Every import of the source partial under the component project,
   including those reached through `CairnAdminShell`, `LoginPage`, `ConfirmPage`, and
   `ReproContext`, resolves to the compiled `dist/components/cairn-admin.css`. The raw partial is
   never loaded into a component-test document beside the compiled sheet, since it declares
   `utilities.cairn-idiom` first and would reverse the pin. The packaged `dist` behavior does not
   change. `EditorToolbar.test.ts`'s raw import goes. It inherits task 2's pre-run build. The
   report names the mechanism chosen and why.

**Acceptance:**
- `admin-theme-completeness.test.ts` reads the key list from daisyUI's own theme object
  (`node_modules/daisyui/theme/object.js`, any one theme's keys) and asserts each plugin block in
  the source defines exactly those keys. It also asserts no value carries a top-level comma or a
  single quote. It fails on a planted missing key, an extra key, and a comma-bearing value.
- `admin-theme-equivalence.test.ts` runs twice. The bare run compares the built sheet's computed
  values on the four elements against `admin-theme-computed.json`. The hostile run injects the
  hostile sheet as `hostCss` and compares against `admin-theme-computed-hostile.json`. Both show
  zero differences. Both expectation files were generated before the roots changed, and the
  report quotes the commit that holds them unchanged; a file regenerated after the edit voids the
  test. A truncated or demoted value fails with the property and element named.
- `admin-css-build.test.ts` asserts the theme blocks' variables land in `@layer base` and the plain
  root rule stays unlayered.
- A guard component test mounts `CairnAdminShell` from `src` and asserts `--color-primary`
  resolves to the light theme's oklch value, and that an idiom rule (task 2's lift) wins in that
  document.
- `grammar-tokens.test.ts`, `role-layer-contrast.test.ts`, and
  `status-chip-register-parity.test.ts` pass unchanged (they read oklch literals as source text).
- **Mutations** (each after a rebuild): reverting the mechanism fails the guard test; moving
  `color-scheme` into the plugin block alone (dropping the restated one from the plain root rule)
  fails the hostile run naming `color-scheme` on the wrapper, since the block's value is demoted
  to `@layer base`.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`,
  and the comments check, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`.

---

### Task 4: The theme values and the density comments

**Files:** `src/lib/components/cairn-admin.css` (plugin block values only), both
`admin-theme-computed*.json` expectation files, `src/tests/component/cairn-idiom-surface.test.ts`,
and each test or comment that restates a number this task moves.

**Outcome:** Both themes take the round 1, 2, and 4 values (spec, "Material", "Corners", "Density"):
`--depth: 0`, `--noise: 0`, `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`,
`--radius-box: 0.5rem`, `--size-field: 0.28125rem`, `--size-selector: 0.28125rem`. The comments
that restate a moved number are re-read and corrected: the half-pixel selector sizes, the
checkbox hit-slop rule, and the EditPage bottom-bar note (spec, "Density"), plus any other the
implementer finds, listed. `RATIFIED_NORMS` does not move here: it changes in task 13 in the same
commit as the manifest it governs, since `norms.test.ts` holds the two against each other in
`npm test` (`norms.ts:555-561`).

**Acceptance:**
- Both expectation files change only in the moved properties, regenerated through the update
  mode; the report lists each changed key and its old and new value, and both equivalence runs
  pass on the new files.
- `cairn-idiom-surface.test.ts` asserts `btn-sm` at 36px tall, `btn` at 45px, and `badge-sm` at
  22.5px in both themes; it fails if the size step does not reach the family.
- `vertical-alignment-recipes.test.ts`, `interactive-control-edge-contrast.test.ts`, and
  `src/tests/unit/audit/norms.test.ts` pass; any expectation changed is listed with its reason.
- The report lists every test updated for a moved number (Global constraints).
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 5: Buttons: the plain hairline, the type, the `btn-sm` padding, the soft primary

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`, a new
`src/tests/component/cairn-idiom-buttons.test.ts`.

**Outcome:** Five idiom rule groups (spec, "Buttons"):
- **The plain `btn` hairline**, with the spec's exact exclusion list plus the five selected forms
  (decision 9). `join-item` segments are included, and `--btn-color` is never set. Each state
  sets both variables, and none takes daisyUI's base-200 restatement:

  | State | `--btn-bg` | `--btn-border` |
  | --- | --- | --- |
  | Rest | `var(--color-base-100)` | `color-mix(in oklab, var(--color-base-content) 22%, transparent)` |
  | Hover | `color-mix(in oklab, var(--color-base-content) 5%, var(--color-base-100))` | the rest edge (22%) |
  | Focus-visible | the rest fill | the rest edge (22%) |
  | Active | the hover fill (5%) | the rest edge (22%) |

  Focus-visible takes the rest values because the focus ring carries that state.
- **The ladder on plain classes:** `btn-neutral` hovers at `var(--cairn-ink-hover)`. Its rest,
  focus-visible, and active fills stay daisyUI's stock. A press also matches `:hover`, and the
  idiom layer outranks daisyUI's `:active` rule, so the hover rule excludes `:active`.
- **Button type:** weight 500 on plain and ghost buttons, 600 on `btn-primary`, `btn-neutral`,
  `btn-soft btn-primary`, and `btn-error`. The selected segment's 600 is task 6's.
- **`btn-sm` padding:** `--btn-p: 0.875rem` on `btn-sm` only.
- **Soft primary states:** rest at 10% with a transparent edge, hover and focus-visible at 15%,
  active at 22% (decision 3), `--btn-fg` pinned to `var(--color-primary)`, disabled left to daisyUI.

**Acceptance** (`cairn-idiom-buttons.test.ts`, both themes, all four states, through
`_idiom-probe.ts`):
- The plain button's fill and edge at rest, hover, focus-visible, and active match the Outcome's
  state table, each through `resolveColor`; its focus-visible outline color is not `base-100` (it
  would vanish on a card).
- A `btn` in each selected form, a checked radio `join-item btn` included, does not take the
  hairline (task 6 asserts what it does take). A `btn-disabled` plain button matches daisyUI's
  disabled look.
- `btn-ghost`, `btn-outline`, and each color variant other than `btn-neutral` match daisyUI's
  stock fill in every state (the narrow selector); `btn-soft btn-primary` is asserted by its own
  line below.
- `btn-neutral`'s hover fill resolves to `var(--cairn-ink-hover)` through `resolveColor` in both
  themes; its rest, focus-visible, and active fills match daisyUI's stock.
- Weights 500 and 600 by class; `btn-sm` padding 14px and `btn` padding unchanged.
- Soft primary fill at rest, hover, focus-visible, and active; text stays `--color-primary` in
  every state.
- Loses to a utility: `btn btn-sm px-2 font-semibold` keeps 8px and 600; `btn bg-base-200` takes
  base-200; Review focus 4's `btn rounded-full` stays fully round, and `btn rounded-none` (the
  utility through `hostCss`) stays square.
- **Mutation** (after a rebuild): moving the hairline rule unlayered fails the utility test.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 6: The selected segment, and rules 10 to 12

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`,
`src/tests/component/BtnActiveDarkGround.test.ts` (rewritten in place),
`src/lib/components/segmented-control.ts` (comment only, if its cross-reference moves).

**Outcome:** One selected-segment rule in `cairn-idiom` supersedes pinned rules 10 and 12 (spec,
"The selected segment"). It keys on the five selected forms (decision 9) and excludes the eight
color variants, `btn-outline`, `btn-dash`, and every disabled form, so a variant selected control
keeps its accent. It sets `--btn-bg` to `color-mix(in oklab, var(--color-base-content) 7%,
var(--color-base-100))` in both themes, weight 600, and an inset state hairline on `--btn-border`
(decision 2 seeds its values), with its own hover step, and holds them at focus-visible and
active. On the `:checked` form it also neutralizes daisyUI's checked primary (decision 9). Rule 11
moves into `cairn-idiom`, widened to the five forms (decision 1). Rules 10, 11, and 12 leave the
unlayered block, and the allowlist drops from 18 to 15. The EditorToolbar mode switch and
`Pagination`'s current page render as the same device. Any selected-looking variant the exclusion
list leaves open (`btn-link`, `btn-ghost`) is named in the report as a decision for the reviewer.

**Acceptance** (`BtnActiveDarkGround.test.ts`, both themes, all four states):
- **Before the move,** the report lists every `.btn` call site under `src/lib` carrying one of the
  five forms (known: `EditorToolbar.svelte:289`, `ListToolbar.svelte:289-290`,
  `MediaPicker.svelte:175-181`, `Pagination.svelte:103`), with a render verdict per site, and names
  any selected `btn-ghost` site for the reviewer.
- Each of the five forms on a plain `join-item btn` renders the wash, weight 600, and the hairline,
  at rest, hover, focus-visible, and active; the fixture-style `aria-current="page"` segment
  renders selected, not as the task 5 hairline. The checked radio segment's ink resolves to the
  selected ink, at 4.5:1 or better against the wash composited on `base-100`.
- Review focus 1: `btn-primary` and `btn-error` selected by each of the five forms keep their
  variant fill; a selected plain segment with `text-error` keeps the red ink (the existing
  assertions kept).
- Review focus 5: an `aria-pressed="true"` segment in dark on a `base-100` card, in all four
  states, shows the wash, 600, and the hairline, with a focus outline color that is not
  `base-100`.
- `btn-outline btn-active`, `btn-outline[aria-pressed='true']`, and a checked `btn-outline` take
  rule 11's ink.
- The hairline's light and dark computed colors match decision 2's values. The test computes two
  ratios itself, using the definitions of task 13's pair table rows for the hairline. The first is
  the hairline composited on `base-100` against `base-100`. The second is the same hairline
  against the resting sibling's 22% edge composited on `base-100`. It takes the colors from
  `resolveColor`, converts them with the file's existing `paintedRgba` canvas read
  (`BtnActiveDarkGround.test.ts:48`), and uses `composite` and `contrastRatio` from
  `src/lib/audit/color.ts:30,51`. It hand-rolls no color math. The report states both ratios in each theme. Under 3:1 fails the
  task. Task 13 re-measures the same rows on canvas.
- Loses to a utility: a selected segment with `font-normal` renders 400, and
  `btn-outline btn-active text-error` keeps the red ink against rule 11.
- `unlayeredAllowlist` has 15 entries; `idiomLayerCap` updated.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 7: Fields and marks: rules 13 and 14, the switch, concentric corners, Lucide strokes

**Files:** `src/lib/components/cairn-admin.css`, `custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`, a new
`src/tests/component/cairn-idiom-controls.test.ts`, the admin sheet inventory fixture (the new
`lucide` class, regenerated), and `src/tests/unit/interactive-control-edge-contrast.test.ts` only
if its read path must follow the moved rules.

**Outcome:** Four groups (spec, "Gates and the pinned rules", "The switch", "Corners", "Type and
icons"):
- **Rules 13 and 14** (the 55% checkbox, radio, and field edges) move into `cairn-idiom` with their
  selectors and exclusions unchanged, `:not(:focus)` and the disabled exclusions kept. The
  allowlist drops from 15 to 13.
- **The switch:** `border-radius: 9999px` on `.toggle` and its `::before`; checked, on all three
  checked forms (`:checked`, `[aria-checked='true']`, and `:has(> input:checked)`), fills the
  track with `--color-neutral` and turns the knob `--color-base-100`, only
  on a toggle carrying none of the eight color modifiers; off and disabled left to daisyUI. daisyUI
  draws the knob and the focus ring both from `currentColor` (`toggle.css`), so the rule sets the
  knob on `::before` or sets the ring color explicitly; a base-100 knob must not make a base-100
  ring.
- **Concentric corners:** one rule sets `--radius-field: calc(var(--radius-box) - 0.25rem)` on the
  padded `dropdown-content menu` panel.
- **Lucide strokes:** `svg.lucide[stroke-width='2'] { stroke-width: 1.75 }`, with a co-located
  `// WATCH:`-style CSS comment saying the rule keys on Lucide's default attribute value.

**Acceptance** (`cairn-idiom-controls.test.ts`, both themes, all four states where the element
takes them):
- **Before the move,** the report lists every `.input`, `.select`, `.textarea`, `.checkbox`, and
  `.radio` call site under `src/lib` that carries a border utility (grep), and states for each
  whether the utility now wins and whether that changes the render. A changed render is a finding.
- Unchecked checkbox, radio, and field edges compute the 55% mix at rest and hover; a focused
  field matches daisyUI's focus edge; a `border-error` utility (through `hostCss`) on a field wins.
- `interactive-control-edge-contrast.test.ts` passes.
- The switch: checked track neutral and knob base-100 in each of the three checked forms, at rest,
  hover, focus-visible, and active; track and knob radius 9999px; `toggle-primary` and `toggle-success` match daisyUI's
  colors; Review focus 4's `toggle rounded-none` (the utility through `hostCss`) squares it.
- The switch's focus ring: a checked switch at focus-visible, in all three checked forms and both
  themes, computes an outline color other than `base-100`; an unchecked switch does too.
- Concentric: a menu item inside a padded `dropdown-content menu` computes `border-radius` of 4px
  (8px box minus 4px); Review focus 4's `rounded-none` item keeps 0.
- Lucide: a `@lucide/svelte` icon at default stroke computes 1.75; one with `strokeWidth={2.5}`
  keeps 2.5; one with `strokeWidth={2}` computes 1.75 (the spec's stated reach).
- Loses to a utility: a Lucide icon carrying `stroke-[2.5]` (through `hostCss` in
  `@layer utilities`) computes 2.5.
- `admin-sheet-inventory.test.ts` passes on the regenerated fixture; the report names each added
  class.
- `unlayeredAllowlist` has 13 entries; `idiomLayerCap` updated.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 8: Alerts

**Files:** `src/lib/components/cairn-admin.css` (the new token in the plain root rule, the alert
rules), `custom-surface-budget.json`,
`docs/internal/design/2026-06-29-custom-surface-ledger.md`, a new
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
  text color match the table, through `resolveColor`. The stock oracle for a bare `.alert` and
  `alert-soft alert-info` is daisyUI's own formula from `node_modules/daisyui/components/alert.css`
  resolved through `resolveColor` (for a bare alert, `var(--alert-color, var(--color-base-200))`;
  for `alert-soft`, its 8% mix), never the same element read twice. Each oracle passes the alert
  under test as `resolveColor`'s `context`, so `--alert-color` resolves to the variant's value
  and not to the fallback. `alert-error text-base-content`
  takes the utility's ink.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`.

---

### Task 9: The markup sweep: recipes, type, and strokes

**Files:** `.svelte` files under `src/lib/components` and `src/lib/admin-toolkit` that carry the
recipes below, the component tests that assert on them, `scripts/build/admin-css.input.css` (the
compatibility safelist), and the admin sheet inventory fixture (additions only).

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
  `font-semibold` keep it: `IconPicker.svelte:72` and `IconPicker.svelte:84`.
- Hand-authored inline SVGs at `stroke-width="2"`, including `EditorToolbar.svelte`'s `strokeIcon`
  snippet, move to 1.75. Heavier strokes (2.2, 2.4, 2.5, 3) keep their values.
- Every class whose last engine call site this sweep removes (expected: `shadow-none`,
  `hover:bg-[var(--cairn-ink-hover)]`, `hover:bg-primary/15`) joins the compatibility safelist
  (decision 10); a class it adds (`font-[550]`) is regenerated into the inventory.

**Acceptance:**
- Zero matches under the two trees for `hover:bg-\[var\(--cairn-ink-hover\)\]`, for
  `bg-primary/10 text-primary shadow-none`, and for `type-title font-bold` (the report quotes the
  grep commands and their empty output).
- The report counts found, changed, and kept for each recipe, tied to task 0's recount (4 ink
  openers, 1 Publish tint, 5 `shadow-none`, 16 inline strokes), with a reason for each kept site.
- Every inline SVG left at `stroke-width="2"` is listed with its reason (expected: none).
- Component tests asserting the retired classes are updated to assert the rendered result, listed.
- `admin-sheet-inventory.test.ts` passes; the report lists each class safelisted and each class
  added.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`,
  and the comments check, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`.

---

### Task 10: The markup sweep: radii, and the chip re-key

**Files:** `.svelte` files under `src/lib/components` and `src/lib/admin-toolkit` carrying a fixed
radius or a `rounded-full` chip; `admin-toolkit/Tooltip.svelte`, `HelpHome.svelte`,
`PreviewBanner.svelte`, `MediaInsertPopover.svelte` style blocks;
`src/lib/reproductions/stories/CustomScreen.svelte`;
`src/lib/audit/rules/rendered/chip-ground-collision.ts` and its tests under
`src/tests/unit/audit/rules/rendered/`; `scripts/build/admin-css.input.css` (the compatibility
safelist); a `PreviewBanner` override test.

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
0.75rem to 0.5rem.
- **`PreviewBanner` keeps its public seam.** It is the design-agnostic public component, and
  `--cairn-preview-radius` is its override. Its radius stays
  `var(--cairn-preview-radius, var(--radius-box, 0.5rem))`: the site's override wins, and the
  ladder is only the fallback.
- **`CustomScreen.svelte`** (the custom-screen reproduction that models G1, outside the two swept
  trees) is swept under the same role rules, so the reproduction a developer copies uses the
  ladder.
- **The chip re-key.** `chip-ground-collision`'s chip detection is re-keyed so a filled,
  chip-height, text-carrying element at the element's resolved `--radius-selector` reads as a chip,
  beside the `.badge` class check. It never keys on a literal 4px, and interactive elements
  (buttons, inputs, links) are never chips.
- Every class whose last engine call site this sweep removes (expected: `rounded`, `rounded-sm`,
  `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-t-2xl`, `rounded-[0.55rem]`,
  `rounded-[var(--radius-field)]`) joins the compatibility safelist (decision 10).

**Acceptance:**
- **The post-condition,** over `.svelte` files in both trees and `CustomScreen.svelte`, each quoted
  with its output:
  - zero matches for the spec's PCRE pattern (`grep -rP` with
    `\brounded(-(t|b|l|r|s|e|tl|tr|br|bl|ss|se|es|ee))?(-(xs|sm|md|lg|xl|2xl|3xl|4xl)|-\[[^\]]*\])?(?![\w-])`);
  - zero output from `grep -rnP 'border-radius:(?!\s*(var\(--radius-|var\(--cairn-preview-radius|calc\())' --include=*.svelte src/lib/components src/lib/admin-toolkit`
    (the lookahead holds the whitespace, so a backtracking `\s*` cannot slip past it).
  A true circle whose shape needs a literal in a `<style>` block is listed as a named exception
  for the reviewer.
- The report tables every changed site (file:line, old class, new class, role) and lists every
  site the role rules did not settle, with the role chosen and why, for the diff review to rule on.
- Every remaining `rounded-full` is listed with its shape (true circle, or a chip the review should
  rule on).
- `PreviewBanner`: a component test on a page with no daisyUI and `--cairn-preview-radius: 2px`
  set computes 2px; with neither set it computes 8px.
- `chip-ground-collision`, positive: a filled chip at the theme's selector radius with no `.badge`
  class is treated as a chip. Negative, each not reported as a chip: a text `btn-sm` at field
  radius; a `kbd`; a filled element at `rounded-selector` that is not chip height or carries no
  text; and, under a theme whose selector radius equals its field radius, every button and input.
  The existing chroma-repair and rulings tests pass.
- `admin-sheet-inventory.test.ts` passes; the report lists each class safelisted.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the admin CSS set,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`,
  and the comments check, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`.

---

### Task 11: The starter theme (independent of tasks 9 and 10)

**Files:** `examples/showcase/src/theme/theme.css`, `templates/waymark/**` (re-emitted, never
hand-edited), the showcase's Tailwind build entry if the pin needs it, and one new e2e spec,
`examples/showcase/e2e/starter-outline-pin.spec.ts`, that proves the pin. The pin test is an e2e
spec because the component project cannot host it. That project runs in a browser with no
Tailwind plugin, and a node-side compile of `theme.css` needs the showcase's own `node_modules`
(its `@fontsource-variable` imports). CI's `test.yml` installs those only after its `npm test`
step. The e2e run also proves the pin through the showcase's real build.

**Outcome:** (spec, "Starter theme decisions")
- Both `@plugin "daisyui/theme"` blocks take `--radius-selector: 0.25rem`,
  `--radius-field: 0.375rem`, `--radius-box: 0.5rem`.
- One rule in `@layer utilities { @layer site-theme { ... } }`, pinned after daisyUI, gives an
  uncolored `btn-outline` and `badge-outline` the hairline edge. The button half writes
  `--btn-border: var(--btn-color, color-mix(in oklab, var(--color-base-content) 22%,
  transparent))`, so `btn-outline btn-primary` keeps its colored edge. The badge half sets
  `border-color` directly on an uncolored `badge-outline`, since daisyUI sets
  `border-color: currentColor` there rather than a variable
  (`docs/superpowers/research/2026-09-26-theme-identity-fold-verification.md`). The rule carries
  the full state set for the outline button.
- The file header's "only chassis VALUES" sentence gains this one declared rule. The re-skin recipe
  gains one line naming the ladder as the family geometry a site may change freely, citing no
  internal document.
- The `theme.css` cites of internal documents (`:6`, `:68`, `:201` at plan time) are repointed to a
  shipped path or inlined; the `site.css` and `prose.css` cites stay filed.
- `npm run emit:template` re-emits `templates/waymark`.

**Acceptance:**
- `starter-outline-pin.spec.ts` loads `/styleguide`, which carries an uncolored `btn-outline` and
  `badge-outline` under the showcase's built sheet, and injects any probe element it also needs
  (`btn-outline btn-primary`) into that page. It asserts that an uncolored `btn-outline` computes
  the 22% edge at rest, hover, focus-visible, and active,
  `btn-outline btn-primary` computes the primary edge, and an uncolored `badge-outline` computes
  the hairline; reversing the pin fails it (mutation ledger). The report names the pin mechanism
  chosen.
- `grep -n 'docs/internal' examples/showcase/src/theme/theme.css` returns nothing.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking):
  - `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:template && npm run test:reskin && npm run check:public-tokens && npm run check:chassis-boundary'`;
  - the showcase set, `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'`;
  - the port check (`ss -ltnp 'sport = :4173'` prints no listener), then
    `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- styleguide.spec.ts starter-outline-pin.spec.ts'`.

---

### Task 12: The G1 fixture screen and its spec

**Files:** a new `examples/showcase/src/routes/admin/theme-kit/+page.svelte`,
`examples/showcase/src/access.ts`, a new `examples/showcase/e2e/theme-kit.spec.ts`,
`examples/showcase/e2e/admin-visual.spec.ts` (new entries only; no PNG is committed locally).

**Interfaces produced:** the route `/admin/theme-kit` and its markup, which pass B's exemplar
reference is built from; stable `data-testid` hooks on each probed element, named in the spec file.

**Outcome:** A custom admin route written only in plain daisyUI classes and cairn's role utilities
(`type-*`, `gap-*`, `card-shell`, `rounded-*`), with no `<style>` block and no arbitrary value
(spec, "G1"). Its joins and controls sit on a `base-100` card. It renders:
- the button ladder: plain, ghost, neutral, primary, `btn-soft btn-primary`, error, a join with a
  `btn-active` selected segment, a segment marked only `aria-current="page"`, and one disabled;
- a second join whose selected segment is `btn-primary` (Review focus 1), and a daisyUI radio join
  (`<input class="join-item btn" type="radio" aria-label=…>`) with one segment checked;
- every alert variant and a bare `.alert`, the error alert carrying a nested link in the markup
  `ConceptList.svelte:325` uses;
- a checked and an unchecked switch, a `toggle-primary`, an unchecked and a checked checkbox and
  radio, a chip, a field, a card, a statically open `modal-box`, and a padded dropdown rendered
  open.

The route is owner-only (decision 5) and in no nav. `admin-visual.spec.ts` captures it in both
themes at 1440 and 390.

**Acceptance** (`theme-kit.spec.ts`, both themes, by cookie as `admin-visual.spec.ts` does):
- Radii of 4, 6, and 8px by role; `btn-sm` 36px tall with 14px padding; the plain button's fill and
  edge; the `aria-current` segment and the checked radio segment rendering as the selected
  segment; label weights; the soft primary's rest and hover fills; the switch's checked track and
  round knob; `toggle-primary` keeping its color; the checkbox and radio edges; the modal box's
  warm shadow; each alert's panel and ink; the dropdown item's concentric radius.
- **Review focus 2.** The host CSS is the stylesheet a public showcase page links (the spec file
  reads the `<link rel="stylesheet">` hrefs from `/` and fetches them), plus the hostile unlayered
  sheet. They are injected once before and once after the admin sheet. In both orders, the plain
  button, `btn-sm` height, and the three radii compute as above. An uncolored `btn-outline` and a
  `btn-outline btn-active` are asserted in each order and the results recorded: the host-before
  order keeps rule 11's ink; a host-after order that loses it to the host's `site-theme` sublayer
  is returned as a finding to the conductor, never patched.
- **Review focus 3.** With the join's wrapper set to `dir="rtl"` at a 320px viewport,
  `document.documentElement.scrollWidth` does not exceed the viewport, the outer corners compute
  `--radius-field` on the logical start and end, and the selected segment keeps its hairline.
- The spec fails if a rule lands in a losing layer, the pin reverses, or a class is not compiled
  (the report shows one planted failure: the pin reversed in a scratch build).
- A test asserts the showcase's rendered admin nav carries no link to `/admin/theme-kit`.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking):
  - the showcase set, `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'`;
  - the admin CSS set, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`, since the fixture route lands under `examples/showcase/src/routes/admin`, which `check:invisible-craft` scans;
  - the comments check, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`;
  - the port check (`ss -ltnp 'sport = :4173'` prints no listener), then
    `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit.spec.ts custom-screen.spec.ts'`.

  The new `admin-visual` entries are expected to fail until S4, as missing baselines in the
  expected-red set; the task does not run them.

---

### Task 13: The proof: contrast, viewports, norms, and the audit

**Files:** a new `examples/showcase/e2e/theme-kit-contrast.spec.ts`, `src/lib/audit/norms.ts`
(`RATIFIED_NORMS` values only), `src/lib/audit/norms-manifest.json` (regenerated by
`norms:generate`), `src/tests/unit/audit/norms.test.ts` and
`src/tests/unit/audit/rules/rendered/norms-bands.browser.test.ts` (expectations that restate a
moved band), `examples/showcase/cairn-audit.config.json` (the `rendered.extraPages` list), and a
new record
`docs/superpowers/research/2026-09-26-theme-identity-pass-a-proof.md`.

**Outcome:** The spec's Proof measurements, taken in a real browser on the fixture and recorded.
`theme-kit-contrast.spec.ts` paints each pair to a canvas and reads it back, as the audit engine
does, and asserts each row of **the pair table** in both themes. Every row names a foreground, a
background, the ground a translucent value composites on, and a floor:

| Foreground | Background | Composited on | Floor |
| --- | --- | --- | --- |
| Each alert ink, and the error alert's nested link | its panel | `base-100` | 4.5:1 |
| Switch checked track | the fixture card | `base-100` | 3:1 |
| Switch knob | the checked track | (opaque) | 3:1 |
| Unchecked track edge, and its knob | the fixture card | `base-100` | 3:1 |
| Selected-segment text, each of the five forms | the 7% wash | `base-100` | 4.5:1 |
| Selected hairline (55% light, the dark seed) | the fixture card | `base-100` | 3:1 |
| Selected hairline | the resting sibling's 22% edge | `base-100` | 3:1 |
| Focus ring on the plain, neutral, soft primary, and selected buttons, and on the checked and unchecked switch | the fixture card | `base-100` | 3:1 |

Each restyled family's hover step is measured and recorded, not asserted, along with the soft
primary's active step and the dark lift (decision 3). `RATIFIED_NORMS` moves to the new ladder in
this task: the four field roles (`button-primary`, `button-ghost`, `input-text`, `select`) at 6px
and `card` at 8px, in the same commit as the regenerated manifest.

**Order of steps:** edit `RATIFIED_NORMS` first, since `norms:generate` packages and then reads it
from `dist` (`norms.ts:484`); `npm run package`; build the showcase and serve its preview on 4391, with the
listener's cwd checked; run `norms:generate`, then `norms:check`, the rendered audit, and the two
live checks against it, each with `BASE_URL=http://localhost:4391`; stop the preview and say so;
confirm 4173 is free; then run the contrast e2e. `norms:check` runs the same generator as
`norms:generate`, which starts no server and falls back to `http://localhost:4173` when
`BASE_URL` is unset (`scripts/lab/generate-norms-manifest.mjs:32,124`), so it runs before the
preview stops.

**Acceptance:**
- `theme-kit-contrast.spec.ts` passes and writes its numbers into the proof record, one table per
  theme. A floor that fails is a finding returned to the conductor, never a test loosened.
- **The 320 and 390 check:** the `viewport-overflow` and `panel-width` rendered rules pass at both
  widths. The pages are added through `rendered.extraPages` in
  `examples/showcase/cairn-audit.config.json`, never `rendered.pages`, so the default core routes
  task 0 measured (`src/lib/audit/config.ts:57-64`) stay in the set. The added pages are
  `/admin/theme-kit`, `/admin/posts/2026-06-hello`, and `/admin/settings`. The record quotes the
  list and names the route that carries each region the spec checks:
  - `/admin/posts` (a default route): the `ListToolbar` filter join, and `Pagination`, since the
    showcase's 27 posts at `ConceptList`'s `pageSize` of 10 make three pages.
  - `/admin/posts/2026-06-hello`: the toolbar row and the phone desk band, which is the edit
    route's header (`admin-design-system.md`, "The desk band").
  - `/admin/settings`: the chip-beside-heading row, the "Set by your developer" chip in its
    `cairn-line-slot` (`CairnTidySettings.svelte:410`). Below `sm` that chip drops to its own line,
    so the 320 and 390 read covers the dropped layout.

  `vertical-alignment-recipes.test.ts` passes. Findings recorded.
- `RATIFIED_NORMS` and the regenerated manifest land together;
  `BASE_URL=http://localhost:4391 npm run norms:check` is green on the 4391 preview,
  `norms.test.ts` passes on the regenerated manifest, no radius row carries `ratified-drift`, and
  `norms-bands.browser.test.ts` passes with any changed expectation listed. The record lists the
  radius and height bands that moved.
- `npx cairn-audit --rendered` over the showcase admin, the three added pages included, run twice;
  the record sets both runs' totals beside task 0's before-runs, and compares the findings of
  `weight-budget`, `norms-bands`, `touch-targets`, `focus-renders`, `interactive-contrast`,
  `border-contrast`, and `chip-ground-collision` by finding identity, not totals. The identity
  comparison covers the default routes both runs share; findings on the three added pages are
  recorded as new.
- `BASE_URL=http://localhost:4391 npm run check:touch-targets` and
  `BASE_URL=http://localhost:4391 npm run check:interactive-contrast`, green, quoted. The record
  labels them public-site checks: they probe the sitemap and `/styleguide`, never the admin
  (`live-probe-support.mjs:19-25`). The admin's equivalents are the rendered audit rules above.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking):
  - the showcase set, `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'`;
  - the comments check, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`;
  - the idioms check, since the task edits `src/lib/audit/norms.ts`,
    `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:idioms'`;
  - the port check (`ss -ltnp 'sport = :4173'` prints no listener), then
    `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit-contrast.spec.ts'`.

---

### Task 14: The design-system documents

**Files:** `docs/internal/admin-design-system.md`, `docs/internal/public-design-system.md`, and the
"Admin interface design" paragraph of `CLAUDE.md`.

**Outcome:** (spec, "Documentation", "The design-system rule";
`docs/superpowers/research/2026-09-26-theme-identity-fold.md`, "Errata owed to ratified
documents"). Each line below is one deliverable. Line numbers are plan-time; re-locate by content
if lines moved.

`admin-design-system.md`, new and rewritten content:
- [ ] The Tokens section: the theme values, the alert inks with task 13's measured contrast, the
  switch, and the depth language.
- [ ] A corner-system subsection: the ladder, the role mapping, true circles by shape, structural
  zeros, and concentric corners.
- [ ] The type recipes: page heading `type-title font-[550]`, Lucide at 1.75, and a deliberate 2px
  stroke written as `2.01` or a scoped exception.
- [ ] The chip rule, in place of the pill geometry.
- [ ] The five selected forms.
- [ ] The new rule "identity lives in the theme layer": a new idiom is a theme variable or a
  cairn-idiom rule, and a per-element idiom is a defect.
- [ ] The "Verify visuals on the showcase, not in component tests" rule (`:104-107`) rewritten,
  since component tests now render against the compiled sheet.

`admin-design-system.md`, the fold record's errata:
- [ ] `:36-42`: the charter calibration stops listing "the pill family" among inherited grammars.
- [ ] `:75-86`: the load-bearing "Scoped overrides go in `@layer components`" rule names the
  spec's three homes.
- [ ] `:80` and `:394`: the violet `.btn-primary` lift claim becomes the warm lift.
- [ ] `:264` and `:272`: the page-heading recipe `text-2xl font-bold` becomes `type-title
  font-[550]`.
- [ ] `:368-378`: the Active nav recipe's "`--depth` set to `1` ... do not write a cancel rule"
  is corrected for the theme's `--depth: 0`.
- [ ] `:391`: the brand mark moves from `rounded-xl` to `rounded-box`.
- [ ] `:652-677`: the segmented-control section (rule 10 superseded, the hairline in both themes).
- [ ] `:1278-1282`: the versioned seam adds `--radius-selector` beside `--radius-field` and
  `--radius-box`.
- [ ] `:1320-1348`: the starter template section takes task 11's ladder and hairline outlines.
- [ ] Pre-existing drift at `:659-660`: `ring-base-content/20` becomes `/55`, as the code has it.
- [ ] Pre-existing drift at `:1301-1303`: "two unlayered forced workarounds" becomes the count
  after this pass, read from `unlayeredAllowlist` (the fold record expects thirteen).
- [ ] Pre-existing drift at `:1327`: the starter path becomes `src/theme/theme.css`.

`public-design-system.md`:
- [ ] The never-cross-over line (`:257-261`) names geometry and edge grammar as shared (ruling 2).
- [ ] `:26-29` and `:75-76` on starter geometry follow it.

`CLAUDE.md`:
- [ ] The "Admin interface design" paragraph's "scoped overrides go in `@layer components`"
  becomes the three homes, in one clause.

**Acceptance:**
- Each fold-record erratum is checked off in the report with its new text quoted.
- No sentence in either document still names the pill family, a violet lift, `text-2xl font-bold`
  for the page heading, `rounded-xl` for the brand mark, or `@layer components` as the home for a
  daisyUI override (the report quotes the greps).
- The measured numbers match the proof record exactly.
- Computed tier (docs; the runner's classifier resolves it, so no `gateTier`). Task checks, each
  quoted with its `gate exit:` line (missing or red is blocking):
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs'`.

---

### S1: Fresh-context visual read (conductor-led, parallel with S2)

**Outcome:** One `visual-verifier` dispatch (it must not be a context that built the work) grades the
built showcase against the committed captures: `final-1440.png` and `final-390.png` (light above
dark) and `switch-1440.png`. A Sonnet capture agent first packages, builds, and serves the
worktree's showcase on 4391 (the task 0 recipe), captures, then stops its server and says so.
- **Core pages** at 320, 390, 768, 1440, and 2560, light and dark, headless: `/admin/theme-kit`,
  `/admin/posts`, one edit page, `/admin/vocabulary`, and `/admin/signups` with its dialog open.
- **The rest of the swept surface** at 1440 and 390, light and dark: every other page
  `admin-visual.spec.ts` captures (read the spec's test titles for the list), `/admin/help`, and
  the media library's bottom sheet open at 390.

The verifier grades 1440 and 390 against the references and the task 0 before-set device by device
(MATCHED, COSMETIC, STRUCTURAL). It grades 320, 768, and 2560 against the responsive standard
(composed at the extremes, not merely unbroken), running its mandatory contrast probe. A mis-roled
radius or a layout shift from the size step is STRUCTURAL.

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
corrections.

**Files:** as the items require.

**Outcome:**
- Each STRUCTURAL and `adjust` item is fixed in the theme layer (never per element), with its test
  updated.
- The proof record and the design system are updated for any changed value.
- A change that moves any value task 13 measured also reruns `norms:generate` and `norms:check`
  with `BASE_URL` on the 4391 preview (the task 13 order of steps). It updates `RATIFIED_NORMS` if
  a ratified band moves, and re-measures the affected pair-table rows.

**Acceptance:**
- Each item is closed in the report with its test.
- `theme-kit.spec.ts` and `theme-kit-contrast.spec.ts` rerun green.
- `norms:check` is green on the 4391 preview when a value moved.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking):
  - the admin CSS set,
    `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:custom-surface && npm run check:invisible-craft && npm run check:admin-css-classes && npm run check:idioms'`;
  - if the run touches `examples/showcase`, the showcase set,
    `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'`;
  - the port check (`ss -ltnp 'sport = :4173'` prints no listener), then
    `cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit.spec.ts theme-kit-contrast.spec.ts'`.

### Resume point (between segments E and F)

The conductor writes STATUS with a resume prompt naming this plan, its ledger, the next step (S3),
the spend so far, and the open S2 owner-taste items, then closes the session. A fresh Opus 5.5
session at `medium` resumes from that prompt.

### S3: Geoff's before and after (conductor-led, the one owner sitting)

**Outcome:** One combined sitting. The conductor builds a review page showing labeled before and
after pairs at 1440 and 390, light and dark: the task 0 before-set beside the same screens now, and
the fixture screen. The fixture's "before" is the same `+page.svelte` built against `main`'s
engine in a throwaway worktree, served on a port other than 4173 and 4391, so the pair shows plain
daisyUI markup rendered stock and rendered as cairn. The page names the devices to look at: the
error alert's token ink and the success alert, the modal's warm shadow (a first render of a
ratified rule), the plain button and its hover step (graded here per the spec), the selected
segment, the switch, and one starter styleguide pair, since the starter goes live on merge. S2's
owner-taste items ride the same page as questions, each with a recommendation, and so does a
budget question if the flag tripped in segment E. The page also asks Geoff to confirm the draft
docs resume trigger (decision 12: after pass B merges). The page opens in one Chromium tab (the
`visual-review-in-local-browser` memory), or is published as an Artifact if Geoff is away from the
workstation.

**Acceptance:** Geoff's verdict is recorded verbatim in the ledger. Corrections go to one task 15
run; the throwaway worktree's server is stopped and the worktree removed. The sitting counts as
one execution sitting.

### S4: CI baseline regeneration (conductor-led)

**Outcome:** After the last paint change, the conductor pushes, then dispatches `e2e.yml` on the
branch with `update_snapshots: true` (`gh workflow run e2e.yml --ref theme-identity-a -f
update_snapshots=true`), which regenerates `admin-visual` and `site-visual` baselines on the runner
and commits them to the branch. `admin-visual` changes for two reasons at once: the admin theme and
the starter radii in the preview pane.

The regen job pushes with the workflow's `GITHUB_TOKEN`, and GitHub starts no new run for such a
push. So, once the regen run completes:
1. The conductor runs `git pull --ff-only` in the worktree, so the close's pushes fast-forward.
2. A Haiku probe confirms the regen commit, lists the PNGs it rewrote, and names those outside
   S1's page set.
3. One `visual-verifier` reads each rewritten PNG outside S1's set against the task 0 before-set
   where one exists, and grades it as S1 does. A STRUCTURAL item goes to a task 15 run before the
   close.
4. The conductor commits the S4 ledger entry and pushes, which starts `pull_request` CI on the new
   head. The `test` and `design` workflows have no `workflow_dispatch`, so a push is the trigger.

**Acceptance:** the regen commit exists on the branch and in the worktree; the `e2e` run (its
`norms` job included), and the `test` and `design` runs, for the ledger commit's SHA, and only
that SHA, are green with no expected-red exceptions left. A workstation-local e2e red on exactly
the regen's files is the durable gotcha "CI-canonical baselines this workstation cannot
reproduce" (`docs/internal/durable-gotchas.md`), not a failure.

---

### Task 16: Close

**Outcome:** One fold agent (`claude-opus-5-5`) authors the close, commits its draft, then folds;
one independent `diff-reviewer` reads the fold's diff. The cairn-pass pass-end ritual:
- `CHANGELOG.md` gains `## Unreleased` if absent, with one entry: the visible admin change (the
  corner ladder, the hairline plain button, the calmer type, the quiet alerts, the round switch,
  the size step), the admin sheet growth (daisyUI classes 217 to 580, about 1.7x gzip, admin-only,
  calendar excluded), the compatibility safelist's growth (each class the sweep retired from the
  engine's own markup, kept so consumer markup renders as before), and the starter's ladder and
  hairline outlines. `Consumers must:` nothing. A site with custom admin screens should re-check
  them, and the entry says why (plain daisyUI classes now render cairn's ladder, and a fixed
  Tailwind radius does not follow it). The entry records that this window ships as a minor,
  `0.98.0` planned, because it restyles every consumer's admin (decision 11). The heading stays
  `## Unreleased`; no version bump, no publish.
- **Facts** in `docs/internal/facts/extend.md`, written with the Edit tool: a custom screen's plain
  daisyUI classes now render cairn's ladder; every daisyUI component except calendar is available;
  a bare `btn` is a hairline; a checked `btn` renders as the selected segment; fixed Tailwind radii
  do not follow the ladder, so use `rounded-selector`, `rounded-field`, or `rounded-box`; the
  norms manifest's radius and height bands moved. `check:facts` green.
- **Reference pages:** `admin-grammar-tokens.md`, `cairn-audit.md` (the radius example at
  `:455-468`), `components.md` (the status-pill wording at `:25-26`), `admin-toolkit.md` (each
  toolkit section's exact class inventory the sweep changed: `PageHeader`, `ListToolbar`,
  `Pagination`, and any other), and `sveltekit.md` (the nav count "pill" geometry wording at
  `:1826-1845`, leaving API shape names alone). `check:reference` green.
- **Narrative arms,** under the freeze rule task 0 recorded: `docs/extend/add-a-custom-admin-screen.md:94`
  ("a status pill") and any other sentence the pass made wrong are fixed on the page as
  deficiencies, and each fix also lands as a facts bullet so the paused docs pass carries it.
- **Remaining errata:** the arc log gains the two owed lines (`--btn-p 0.875rem` applies at
  `btn-sm`, CS-m3; the round 1 lift could not have come from the shipped rule, MX-M1).
  `engine-rulings.md` records the timing-scoped reading of decision 4 in
  `motion-conform-to-daisyui-conventions` (CS-B1), or files the question, and
  `check:rulings-format` stays green.
- **ROADMAP:** the Waymark citation item (`ROADMAP.md:880`) narrowed to the `site.css` and
  `prose.css` cites; the move of pinned rules 1 to 9 into `cairn-idiom` filed as a later ratchet
  shrink; the `ADMIN_CSS_SAFELIST` retirement filed, since the full compile subsumes its daisyUI
  half; pass B filed as the next action's initiative.
- `docs/HISTORY.md` gets the pass entry: what landed, what the gates caught, spend against the 20M
  ceiling and 15.8M planned, and what a later pass would be wrong to rediscover (the sublayer and
  its pin; unnested daisyUI declarations; the theme-object key split; component tests on the
  compiled sheet and its pre-run build; the five selected forms; the runner's gate-string match
  for a pinned tier; the port-4173 reuse trap; the expected-red CI set during a render change).
- `docs/STATUS.md`, present tense, at or under 60 lines: pass A merged; pass B next with its plan
  still to author; draft docs pass 0+1 paused on `draft-docs-0` until the resume trigger Geoff
  confirmed at S3 (the conductor's reading, decision 12: after pass B merges, which completes the
  whole theme identity initiative), and on resume it merges `main` into its branch; the next cut
  from `main` is `0.98.0`
  and a hotfix before it branches from `v0.97.0`; history moved to HISTORY.
- **The merge (conductor, after the fold's review):**
  1. Re-run the executor check, widened to any conductor working `main` or `draft-docs-0`: STATUS's
     next-action line, recent workflow journal mtimes, `pgrep -af` on both worktree paths, and
     `draft-docs-0`'s head against task 0's recorded SHA.
  2. `git fetch` and merge `origin/main` into the branch if `main` moved.
  3. Re-run `check:facts`, `check:reference`, `check:docs`, `check:vale`, and
     `check:rulings-format` on the merged head, and let CI go green on it. `check:vale` covers the
     close's edits under `docs/reference/` and `docs/extend/`.
  4. If the merge changed STATUS or HISTORY, the fold agent re-writes them against the merged
     state.
  5. Mark the PR ready, confirm CI green on the merged head, and merge `theme-identity-a` to
     `main`, which puts the starter live (spec, "Release"). Remove the worktree after merge.

**Acceptance:** STATUS at or under 60 lines; `check:facts`, `check:reference`, `check:docs`,
`check:vale`, and `check:rulings-format` green on the merged head; the pass score records tokens
against the
ceiling, planning misses, and execution sittings (S3 counts as one).

## Ledger

(written by the conductor at each segment boundary)

### Task 0 (2026-09-26, conductor)

1. Draft docs paused: `draft-docs-0` head `a22d0662` ("park draft docs pass 0+1"), pause recorded
   in its plan's ledger; tree clean; no process in its worktree. Pass.
2. No executor on `theme-identity-a`. Pass.
3. Worktree `.claude/worktrees/theme-identity-a` off `main` `38e76ffd`; both `npm ci` exit 0; the
   showcase's `@glw907/cairn-cms` resolves into the worktree. Pass.
4. Counts re-verified exactly: daisyUI 5.7.44, Tailwind 4.3.3, allowlist 18, cap 19, 85 radius
   matches in 17 files, 24 `rounded-full`, 4 ink-hover, 1 Publish tint, 5 `shadow-none`, 8 style
   literals, 1 `type-title font-bold`, 16 inline `stroke-width="2"`. Pass.
5. `main` carries the full narrative-arm freeze (`CLAUDE.md`, "frozen against rewrites"). Recorded.
6. `aff583d2`: the serialized engine string. **Decision 14** added to the same commit: port 4173 is
   held by another project's server (dubplate's `sirv`), and the showcase Playwright config
   hard-coded it with `reuseExistingServer`, so a local e2e would test the wrong site. The config
   now reads `E2E_PORT` (default 4173, CI unchanged). This pass runs every local e2e with
   `E2E_PORT=4392`; the Global constraints' port check applies to 4392, not 4173.
7. `gate-tier.mjs --range HEAD~1..HEAD --pin engine` prints the plan's engine string verbatim.
8. Baseline green on the third run, `gate exit: 0`: node projects 389 files / 5145 tests, component
   (serialized) 82 files / 1429 tests. Two fixes first: `2d33e098` (a facts citation stale on
   `main`, pushed past its 10-line tolerance by item 6's added line) and `30d2372b` (**decision
   15**: two `rendered.test.ts` BASE_URL tests made hermetic by stubbing `fetch`, since the
   machine's port 4173 answered). No stall.
9. `9dfe7dd4`: 70 before PNGs over 18 page states; two rendered audits, tracked rules identical
   (`weight-budget` 4, `border-contrast` 238, `chip-ground-collision` 50, the rest 0); variance is
   `viewport-overflow` only. Server stopped.
10. `/cost` is Geoff's slash command; the conductor's counter is the sum of subagent and workflow
    token counts from task notifications. Spend since plan approval, through task 0: about 3.0M.

Owed to the close: `docs/internal/pass-gate-tiers.md`'s prose sentence above the table still
describes the old engine string.
