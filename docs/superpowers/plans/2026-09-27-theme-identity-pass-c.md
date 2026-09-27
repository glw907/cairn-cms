# Theme identity pass C: one public theme

**Goal:** Give the public site one theme contract that any theme can meet. The engine ships
`cairn-public.css`, a public stylesheet that holds cairn's role defaults and its design-free
emitted-class rules. Status inks derive from their fills by default. The designer walkthrough's
levers and template fixes land. `cairn-audit` gains a public scope with three rules. A new shipped
skill, `cairn-public`, teaches a designer and an implementer the contract. A second theme proves
the contract as a standing fixture, and the Waymark render does not move. The close merges passes
B and C to `main` together and cuts `0.98.0`.

**Spec:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`, approved by Geoff
2026-09-27. This plan covers pass C only: the spec's "Pass C: one public theme", the pass C half of
"Proof" (probes 2 and 3, the fixture, the rule fixtures), the pass C half of "Documentation and
records", and "Delivery"'s pass C list and "Sequencing and release". Where the spec defers to it,
the parent spec `docs/superpowers/specs/2026-09-26-theme-identity-design.md` governs. Evidence and
record: the fold record `docs/superpowers/research/2026-09-27-theme-pass-b-fold.md` (its fifth
fold's "Trim: what moved where" holds the resolver internals, the walkthrough's line-level fixes,
and the probe-retry process), its verification
`docs/superpowers/research/2026-09-27-theme-pass-b-fold-verification.md`, the designer friction
log `docs/superpowers/research/2026-09-27-theme-designer-friction-log.md`, and the nine
`2026-09-27-theme-pass-b-review-*.md` lens reviews. Executors read the spec sections their task
names. Where this plan and the spec disagree, stop and report, except the decisions recorded
under "Decisions this plan takes".

**Approach:** Fix the stylesheet parser first, since every later reader of authored CSS depends
on it. Then pin the Waymark render with a computed-value equivalence test before anything moves,
move the roles into `cairn-public.css`, and derive the inks. Then the walkthrough's levers and
template fixes, then the three audit rules in dependency order, then the fixture theme and its
harness, then the reference pages, the skill, and the internal documents. Settle runs a CI
baseline regeneration for the one intended visual change (the styleguide), the two acceptance
probes, and one owner sitting. The close merges B and C and cuts the release. Plans specify
outcomes and acceptance, never implementation code.

**Branch topology (an assumption task 0 verifies).** Pass A has merged to `main`. Pass B has
finished on its own branch and stays unmerged, and that branch has merged `main` in. Pass C runs
on a new branch cut from pass B's branch head. Every path in this plan is therefore a
**post-rename** path: the engine's admin folder is `src/lib/admin/` (at plan time
`src/lib/components/`), `cairn-admin.css` is `src/lib/admin/cairn-admin.css` and ships as
`dist/admin/cairn-admin.css`, `PreviewBanner` lives in `src/lib/public/PreviewBanner.svelte`
exported from `@glw907/cairn-cms/public`, `docs/reference/public.md` exists, and
`docs/reference/components.md` is `docs/reference/admin.md`. Plan-time facts were verified at
`main` `c9beafb3` and on `theme-identity-a` at `07bbf2bd`. Where a fact changes under pass A or B,
the plan says so. Task 0 re-verifies every path, count, and line reference against the real branch
and amends this plan before segment A.

**Pass class:** `engine-logic` by default. Per-task overrides: tasks 2, 3, 4, 5, and 10 are
`paint` (CSS, theme values, and visual assertions, each with a targeted gate named in the task).
Tasks 11 and 13 are `docs`. Task 12 is `engine-logic` with a scoped gate, since it changes no file
under `src/lib` (gate economy's blast-radius rule). The mix is honest: tasks 1, 6, 7, 8, and 9
change engine TypeScript behavior (the parser, a root export and the template gate, and the three
rules with their loader and resolver), so they carry the engine gate. The close runs the union of
the classes: `code-simplifier`, the full gate, the Svelte and daisyUI accessibility reviewers, a
fresh-context `visual-verifier` read, and the owner sitting.

**Execution mode:** `pass-execute` (by name) for tasks 1 to 13, one invocation per segment, and
**sequential** (`parallel` unset). The runner does no worktree isolation, so parallel tasks would
share one index, one `base..HEAD` range, and one `cairn-run-gate` key. Two independence claims are
recorded and still run in sequence:
- Task 1 is independent of tasks 2 to 6 (its files are `src/lib/audit/sheet.ts` and its tests).
  It runs first because task 2's snapshot test parses through it (decision 8).
- Tasks 11 and 12 touch disjoint files except the template re-emit. Both write `templates/waymark`
  through `emit:template` (task 12 bakes the new skill into `.claude/skills`), so they contend.

The contended files are `examples/showcase/src/chassis/tokens.css` (tasks 2, 3, 5),
`examples/showcase/src/theme/theme.css` (tasks 2, 3, 6), `templates/waymark/**` (every task that
edits an emitted showcase file, through `emit:template`), `src/lib/audit/config.ts` and
`src/lib/audit/run.ts` (tasks 7, 8, 9), `docs/reference/cairn-audit.md` and
`skills/cairn-admin-screens/SKILL.md`'s tier map (tasks 7, 8, 9), and `package.json` (tasks 2, 6,
9, 10, 12). Every heavy gate also queues on one machine-wide lock.

Args: `repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `passClass: "engine-logic"`, `gate` set to **the engine string**
(see Gates), `reducedGate` set to **the reduced string**, `commonNotes` carrying the Global
constraints and the sentinel note below, and each task's `passClass`, `gateTier`, `gate`, and
`model` as the task states. Each task's `criteria` carries its acceptance lines verbatim, including
its gate string, its task-check strings, and the rule that a missing or red task check is blocking,
because the reviewer never sees `commonNotes`. Under `engine-logic`, `paint`, and `docs`, the
runner moves a finding the reviewer marks `coverageOnly` to `nonBlocking` and returns it as
`batchedNotes`; the conductor lists those in the boundary ledger and acts on none mid-segment.
Task 14 is a one-task `pass-execute` run, dispatched only if settle returns work. Steps S1 to S3
are conductor-led. Task 15 is the close.

**`code-simplifier`:** runs once, at the close, over the pass's TypeScript and Svelte changes only
(`src/lib/audit/**`, `src/lib/render/**`, `src/lib/index.ts`, `src/lib/public/PreviewBanner.svelte`,
`src/lib/admin/preview-doc.ts`, the showcase `.ts` and `.svelte` files, and the new `scripts/`
modules). CSS, tests, docs, and skills are out of its scope. Its changes take one commit, and the
close's full gate runs on that commit (no separate engine gate: the full gate is a superset of the
engine string).

**The gate agent:** every heavy gate the conductor needs outside a `pass-execute` chain (task 0's
baseline and the close's full gate) runs inside one Sonnet `general-purpose` agent
per call, dispatched at `high`. The agent runs `cairn-run-gate '<the engine string>'` in the
worktree, re-issuing the same command on exit 75 until it prints `gate exit:`. It returns the
`gate exit:` line and the tail of the log. The main loop never runs a heavy gate itself.

**Models:** Sonnet `cairn-implementer` at `high` by default. Task 9 runs with `model: "opus"`: the
`theme-contrast` resolver is new correctness-critical logic, and a false pass in a contrast gate is
the silent-green failure the audit exists to prevent. `claude-opus-5-5` for every `diff-reviewer`
and for the close's reviewers and `visual-verifier`. The probes are fresh Sonnet agents (probe 3's
is a `cairn-implementer`). Capture agents and gate agents are Sonnet `general-purpose` at `high`.
CI probes are Haiku.

**Token ceiling:** 24M, flag at 19.2M (80%), pending ruling 1 (Rulings for Geoff). The
projection, itemized after the review fold:

| Item | Spend |
| --- | --- |
| Task 0: worktree, pre-flight agent, dependency sweep, baseline gate agent | 1.3M |
| Task 1 (`engine-logic`, small) | 0.5M |
| Task 2 (`paint`: equivalence spec, `cairn-public.css`, snapshot, export) | 0.9M |
| Task 3 (`paint`: measurement script and record, derivation, Waymark move) | 0.9M |
| Tasks 4 and 5 (`paint`) | 1.3M |
| Task 6 (`engine-logic`: template sweep, root export, gate fixture) | 1.0M |
| Tasks 7 and 8 (`engine-logic`: scope, loader, two rules) | 2.5M |
| Task 9 (`engine-logic`, Opus: resolver, dependencies, pack smoke, successor script) | 2.0M |
| Task 10 (`paint`: fixture theme, two-arm harness with probe modes, CI) | 1.5M |
| Tasks 11 and 13 (`docs`) | 0.9M |
| Task 12 (skill, catalogue, coverage gate) | 1.2M |
| Fix rounds on about a third of the chains, most on the reduced gate | 2.0M |
| Four segment boundaries (pre-flight, push, Haiku CI read, ledger), plus segment B's async glance | 0.7M |
| S1: CI baseline regeneration and one `visual-verifier` read | 0.8M |
| S2: probes 2 and 3, with one retry budgeted | 1.2M |
| S3: the owner sitting page and captures | 0.4M |
| Task 14 (conditional settle, one run) | 0.5M |
| The close: `code-simplifier` (its commit takes the full gate, no separate engine gate) | 0.2M |
| The close: review fan-out (Svelte, daisyUI a11y, one Opus read of the audit) | 1.0M |
| The close: Sonnet draft and one Opus review, hard cap | 0.7M |
| The close: the merge with `main` and the merged-head gates | 0.5M |
| The release: `npm outdated`, the cut, the five-site counts, the publish check | 0.7M |
| The conductor sessions | 1.5M |
| **Projected total** | **about 24.1M** |

The projection sits above the flag and at the ceiling. Ruling 1 settles how the pass treats that.
Until it is ruled, the plan's reading holds: the conductor raises the running total on S3's page
as the budget question, rather than stopping when the flag trips.

**Counting rule:** the conductor's counter is the sum of subagent and workflow token counts from
task notifications, plus its own sessions as `/cost` reports them.

**Segments and checkpoints:** the checkpoint interval is four tasks, and every checkpoint falls on
a segment boundary. A boundary is the pre-flight for the next segment, the push, the draft PR's CI
read by one Haiku probe, and the ledger. There is no local engine re-gate and no `code-simplifier`
at a boundary; CI runs the full suite on each push.
- Segment A: task 0 (conductor), then tasks 1 to 3. The parser, the stylesheet, the inks.
- Segment B: tasks 4 to 6. The preview banner and ground, the levers, the template sweep. At its
  boundary the conductor publishes one non-blocking Artifact for an async owner glance (the `paint`
  class's mid-pass glance): `PreviewBanner`'s draft and published states before and after in both
  schemes, and the new styleguide kit. Execution does not wait on it; S3 folds any reply.
- Segment C: tasks 7 to 9. The public scope and its three rules.
- Segment D: tasks 10 to 13. The fixture, the reference pages, the skill, the internal docs.
- Segment E: S1 (baseline regeneration), S2 (probes 2 and 3), then task 14 if either returns work.
- **Resume point.** The conductor writes STATUS with a resume prompt naming this plan's ledger, the
  next step (S3), the spend, and the open items, then closes the session. S3 needs Geoff attended.
  A fresh Opus 5.5 session at `medium` resumes at segment F. The C-to-D boundary is also a
  sanctioned close point.
- Segment F: S3 (the owner sitting), task 14 again only for the sitting's corrections.
- Segment G: task 15, the close, the merge, and the release.

At each boundary the conductor pushes the branch, writes the ledger at the foot of this file
(tasks, spend, decisions, verdicts, each task's `batchedNotes`, next task), and reads CI through
one Haiku probe. The probe reports failing jobs, failing spec file names, and, for each failure
inside a visual spec, whether it is a `toHaveScreenshot` mismatch or a missing baseline. The
conductor opens the pass PR against `main` as a draft at the segment A push, so `pull_request` CI
runs on every later push. Pass B's own draft PR, if one exists, is left open and closed as
superseded at the merge.

**The expected-red set:** from the segment B push until S1, `site-visual.spec.ts`
`toHaveScreenshot` mismatches on the ten `styleguide-*` captures fail by design (task 6 changes the
styleguide's sample kit and one sentence). Task 4's report states whether any `admin-visual`
capture shows the editor preview frame's `body` ground; if one does, those captures join the set
from the segment B push. Any capture task 0's dependency sweep moves, named by the segment A CI
probe, joins the set from the segment A push with the sweep as its owner. Every other
`site-visual` capture must stay green, since the Waymark
render does not move (the equivalence test is the primary proof, the baselines the secondary). A
crash, a timeout, or a missing locator inside a visual spec is red. A boundary passes when CI's
failures are a subset of the set; any other red re-dispatches the task that owns it, with the
failing step named.

**Worktree:** `.claude/worktrees/theme-identity-c`, branch `theme-identity-c`, cut from pass B's
branch head (plan-time assumption: `theme-identity-b`; STATUS names the real one). Task 0 creates
it after the start conditions hold.

**Gates:** the runner picks the string as pass A's plan records (`pass-execute.js`): whenever
`scripts/checks/gate-tier.mjs` exists, the implementer runs the classifier (with `--pin <gateTier>`
when the task pins one) and runs the string it prints instead of the task's `gate`. Only a
classifier that exits non-zero or prints nothing sends the implementer to `t.gate || a.gate`. So:
- **A targeted task** (tasks 2, 3, 4, 5, 10, 11, 12, 13) carries its own `gate` and the sentinel
  pin **`gateTier: "targeted"`**. The classifier rejects the unknown tier and exits 1 with empty
  stdout, so the implementer falls back to `t.gate`. The reviewer, seeing a pin, expects `t.gate`.
  The sentinel note in `commonNotes`: "`--pin targeted` is deliberate. The classifier rejects it
  and exits 1, which is the runner's documented fallback. Run the task's Gate command verbatim
  through `cairn-run-gate`; a classifier error here is not a finding."
- **An `engine-logic` task on the engine gate** (tasks 1, 6, 7, 8, 9) pins `gateTier: "engine"` and
  sets no `gate`.

Gate strings never contain a single quote. Every string that launches a browser runs in the heavy
lane (no `CAIRN_GATE_LANE` prefix); a check that launches none runs light.
- **The engine string**, which `gate-tier.mjs --pin engine` prints after pass A's task 0 (task 0
  here confirms it; a different string replaces it and is recorded):
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism`.
- **The reduced string** (`args.reducedGate`), run by a fix round whose blocking findings are all
  comment-only or test-only, each leg dropped when it has no file:
  `npm run check && npx vitest run --project unit <touched unit test files> && npm run test:component -- --no-file-parallelism <touched component test files> && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- <touched e2e specs>`.
- **The showcase legs** (packaged first, since the showcase's `cairn-audit` bin and its type check
  read the engine's `dist`, and a stale `dist` is a false green):
  `npm run package && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check && npm --prefix examples/showcase run test:unit`.
  As a light task check (the showcase set): `CAIRN_GATE_LANE=light cairn-run-gate '<the showcase legs>'`.
- **The public legs:**
  `npm run check:template && npm run check:public-tokens && npm run test:reskin && npm run check:chassis-boundary`.
  From task 9 on, `check:public-tokens` and `test:reskin` package the engine first.
- **The surface check** (light), for task 6 and any task that changes a typed export:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:surface'`.
- **The comments check** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:comments'`.
- **The idioms check** (light), for any task editing `src/lib`:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:idioms'`.
- **The package check** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:package'`.
- **The audit wrappers** (light), for any task editing `src/lib/audit`:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:invisible-craft && npm run check:admin-css-classes'`.
- **The equivalence spec:** `public-theme-equivalence.spec.ts`, created in task 2.
- **A showcase e2e run** is heavy and always carries `E2E_PORT=4392`:
  `E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- <spec>`, preceded by the port check
  (Global constraints).

Every string here runs the component project serialized (`--no-file-parallelism`). A component
test stall under a concurrent gate is contention, so rerun that file alone before calling it red.
The conductor runs no heavy gate itself.

## Spec task numbering

This plan moves the spec's task 6 (the `sheet.ts` fix) to the front (decision 8). Every other task
keeps its spec order, shifted by one where the move requires it. Spec text that names a task number
maps as follows:

| Spec task | Plan task | Content |
| --- | --- | --- |
| 6 | 1 | The `sheet.ts` comment fix |
| 1 | 2 | The equivalence test, `cairn-public.css`, the key-set snapshot |
| 2 | 3 | Ink and muted derivation, the shadow default, Waymark's per-scheme move |
| 3 | 4 | `PreviewBanner`'s token styling and the editor preview's ground |
| 4 | 5 | The heading levers, the toggle's scheme resolution, the theme-name config |
| 5 | 6 | The template sweep and the root export |
| 7 | 7 | The public scope and `public-literals` |
| 8 | 8 | `theme-conformance` |
| 9 | 9 | `theme-contrast`, the dependencies, the pack smoke test, `check:public-tokens` |
| 10 | 10 | The fixture theme and `test:theme-fixture` |
| 11 | 11 | The reference pages and the render registry |
| 12 | 12 | The `cairn-public` skill and its coverage gate |
| 13 | 13 | The chassis README, the design-system documents, `design-your-site.md` |

So the spec's "task 2 measures with Chromium, since the resolver lands in task 9" reads here as
task 3 and task 9; "the harness checks land in task 10" and "the page-sync and registry assertions
join in task 11" keep their numbers.

## Decisions this plan takes

The spec's "Open for the plan" items, each settled here so no implementer invents it, and the
gaps this plan found while verifying the spec against the tree.

1. **Ink derivation `N`, by a stated selection rule (task 3 measures).** For each status, the
   default is `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-content))`. Task 3
   measures, in Chromium's computed values, `N` from 0 to 100 in steps of 5, over daisyUI's 35
   stock themes, Waymark with its four ink overrides stripped (light and dark), and the fixture
   theme's palette (light and dark), on three grounds each: `base-100`, `base-200`, and that
   status's callout tint as the chassis `prose.css` paints it (the highest tint percentage the file
   uses for the status; `base-100` alone for a status with no tint). A pair passes at 4.5:1 in both
   sRGB and display-p3, the floor `check:public-tokens` measures today. **Hard constraint, applied
   first:** Waymark with its four ink overrides stripped and the fixture palette pass every pair,
   in both schemes, on all three grounds, since task 9's standing `test:reskin` case and decision
   18 require both. When no `N` meets it, task 3 stops and reports; decision 18's "a finding about
   `N`" fires here, not in task 9. **Selection among the rest:** the `N` with the highest pass
   count, subject to usable chroma: across themes whose fill has OKLCH chroma of at least 0.05, the
   derived ink's median chroma is at least half its fill's, with a tolerance of 0.005. The chroma
   ratio is computed with culori over the parsed values at full precision, so serialization
   rounding cannot move the choice. Ties go to the higher `N` (more hue). Review evidence (probe,
   stock themes plus stripped Waymark): pass counts fall as `N` rises, so the rule lands on the
   smallest `N` that meets the chroma floor (50 at review time, where the median ratio is exactly
   0.5), and stripped Waymark's light `warning` on `base-200` fails from 55. The record lists every
   theme's result at the chosen `N` and the pass counts at the neighboring `N`s, so a failing stock
   theme is named, not hidden, and the trade the floor buys is visible.
2. **Muted's form: an opaque mix.** `--color-muted` defaults to
   `color-mix(in oklab, var(--color-base-content) M%, var(--color-base-100))`, with `M` chosen by
   the same rule on `base-100` and `base-200`, chroma exempt. Reason: today's translucent default
   composites over whatever lies beneath it, so its contrast is not a property of the theme; an
   opaque mix is, and `theme-contrast`'s one `color-mix` form can measure it statically.
3. **The shadow default mixes `black` at today's light geometry.**
   `0 1px 2px color-mix(in oklab, black 6%, transparent), 0 6px 20px -8px color-mix(in oklab, black 12%, transparent)`.
   Reason: on a light theme it matches today's `base-content` default to within the ink's distance
   from black, and in a dark scheme it stays a shadow instead of glowing pale. The changed default
   is disclosed in the changelog; Waymark overrides it, so its render does not move.
4. **The fixture harness mechanism and its local-versus-CI split.** The showcase arm copies
   `examples/showcase` (without `node_modules`, `.svelte-kit`, `e2e`, and `test-results`) into a
   new gitignored directory at the repository root, `.cairn-theme-fixture-<pid>/`, beside the
   existing `.cairn-vite-test-*` precedent. Its `node_modules` is a symlink to the showcase's own, so
   the engine resolves to the working build. The harness swaps in the fixture theme, runs
   `vite build`, and serves `vite preview` on `THEME_FIXTURE_PORT` (default 4393; never 4173,
   4391, or 4392), with the build and server environment `examples/showcase/playwright.config.ts`
   gives its `webServer` (`VITE_CAIRN_E2E=1`, `CAIRN_DEV_BACKEND=1`). It removes the copy on exit,
   failure included, and deletes any stale copy before it starts. The template arm emits the
   template with `scripts/build/emit-template.mjs` against freshly packed engine and dev tarballs
   (the `scaffold.yml` recipe), installs into a directory under `os.tmpdir()` (outside the
   repository, so Node's upward resolution cannot reach the repo's `node_modules`), removes it on
   exit, and verifies the installed engine's files against the pack by content hash (the
   `link-consumer.mjs` guard against `npm pack`'s stale-cache trap). **Two probe modes**, which S2
   uses: `--theme-dir <dir>` overlays a directory onto `src/theme` (a probe's theme with its own
   chrome), and `--build-only` builds and smoke-loads the three pages without the fixture-value
   assertions; the template arm serves each build on `THEME_FIXTURE_PORT` and takes an optional
   `--probe <route> <selector>` that reports the element's computed `color` and `border-radius`
   under each theme. **Split:** CI runs both
   arms in `design.yml`. Locally, both arms run as task checks in task 10 and at the close; the
   template arm needs the network for its registry dependencies.
5. **The equivalence test's key list: a superset, fixed at capture time.** Every custom property
   the chassis `tokens.css` and Waymark's `theme.css` declare at capture time, plus the 29 keys of
   `daisyui/theme/object`, plus four computed checks: a focused `cairn-focus-ring` element's
   `outline-style`, `outline-width`, `outline-color`, and `outline-offset`; `pre.shiki`'s
   `background-color`, `color`, and `border-color`; one `.cairn-tok-*` element's `color`; and
   `.table-scroll`'s `display` and `overflow-x`. Three states: light (a light OS, no cookie), dark by
   OS preference (a dark OS, no cookie), and dark by explicit choice (`data-theme="cairn-dark"`).
   Reason: the spec's list (the moved keys, the scale, daisyUI's keys) is a subset of this one, and
   "every key either file declares" needs no judgment call about which keys will move. The
   explicit-dark state covers Waymark's per-scheme move, which changes how the dark values reach
   the page.
6. **The public scope's config keys.** A new top-level `public` section in
   `cairn-audit.config.json`, beside `static` and `rendered`:
   - `public.scope`: the roots, default `src/theme`, `src/chassis`, `src/routes`,
     `src/lib/public`, `src/lib/components`. Like `static.scope`, a configured list replaces the
     defaults, and a configured root the tree lacks throws.
   - `public.exclude`: default `src/routes/admin`. A configured list merges with the default,
     never replaces it. Every admin-scope root, default or configured, is also excluded from the
     public scope, whatever `public.exclude` says. Reason: a consumer that broadens `public.scope`
     to `src` or sets its own `exclude` must not move admin files from the error-tier admin rules
     to advisory `public-literals`; with no overlap possible, "no file answers to two grammars"
     holds without a guard ever downgrading. (This narrows the spec's precedence sentence; see the
     fold record's owed errata.)
   - `public.themeRoots`: default `src/theme` and `src/chassis/tokens.css` (a directory or a file).
   - `public.stylesheets`: the entry stylesheets whose `@import` chain is the site's real chain,
     default `src/theme/theme.css`.
   Reason: the public scope carries four keys of its own, and nesting them under `static` beside
   `static.scope` would make the admin scope's key read as the public one's. `public.stylesheets`
   is new: `theme-conformance` and `theme-contrast` need a starting point for "the site's real
   import chain", and the spec names none.
7. **The heading-case markup form, the root export's name, and the theme-name touchpoints.**
   - The chassis `tokens.css` declares one `@utility heading-case` that sets `text-transform` from
     `--cairn-heading-case`, beside the key. Chrome markup applies `font-heading heading-case`;
     scoped `<style>` rules read the two keys directly. Reason: one class per lever, named like
     Tailwind's own `normal-case`, with no arbitrary-property bracket repeated across files. The
     bracket form is also closed: `check:custom-surface`'s showcase budget allows no bracketed
     `var()` in showcase markup (`scripts/checks/custom-surface-budget.json`, retired-token budget
     0). This adds one line to the spec's `tokens.css` keep-list; the utility is site-owned.
   - The root export is **`previewMarkdown(def)`**: it returns a component's `preview` sample as
     directive markdown, or `undefined` when the component declares no `preview`. Reason: it
     returns the markdown the renderer takes, and it reads beside `parseMarkdown`, which the root
     barrel already exports.
   - **The touchpoints do not shrink below the one config.** `app.html`'s cookie regex keeps naming
     the two themes. Reason: after a theme rename, a returning visitor's stale cookie then fails
     the regex and the page falls back to the OS scheme; a regex that accepted any name would pin
     that visitor to the default block for up to a year. The unit check guards agreement instead.
8. **The snapshot test parses through `sheet.ts`, so the `sheet.ts` fix is task 1.** Reason: one
   parser reads authored CSS everywhere the audit and its tests do, and the fix is small and
   independent. `parseSheet` already reads `@theme` and `@plugin` blocks as rules whose selector is
   the at-rule prelude (verified at plan time on `tokens.css` and `theme.css`), so the snapshot and
   `theme-conformance` need no second parser.
9. **`DEFAULT_ADMIN_SCOPE` is pass B's call.** Pass B's rename task settles it by running the three
   `adminOnly` motion rules over the engine's admin components. Task 0 records pass B's outcome,
   and pass C adopts it.
10. **The remaining fifth-fold items.** The rename's file list is pass B's. The resolver internals
    are task 9's acceptance. The walkthrough's line-level fixes are tasks 4 to 6's acceptance, with
    plan-time lines. **Probe retry:** a failed probe names a guidance gap; the gap is fixed on its
    shipped page, and a fresh agent re-runs the probe once. A second failure escalates to Geoff in
    the S3 sitting's one combined question.
11. **`PreviewBanner` keeps its rules in its scoped `<style>` block** (spec gap). The spec's closed
    list of what `cairn-public.css` holds admits only design-free rules, and the banner's palette
    is a design default; its recipe line also says a built-in component's rules go in
    `cairn-public.css`. The plan follows the closed list. A scoped block that reads contract
    tokens also keeps the five override properties behaving exactly as today (an unlayered scoped
    rule reading an inherited custom property). `cairn-public`'s recipe for a built-in public
    component therefore reads: markup in `src/lib/public/`, styled by Tailwind utilities (compiled
    through the `@source` line) or a scoped `<style>` that reads contract tokens. A rule enters
    `cairn-public.css` only when it styles an engine-emitted class and carries no design choice.
12. **The F17 gate scope** (spec gap). `check:template` fails on an emitted file under the
    template's `src/` tree, or a root config file, containing `docs/internal/` or `Verdict` followed
    by a number. It skips the baked guidance under `.claude/`: those shipped skills cite the
    cairn-cms repository's own `docs/internal/` paths on purpose (the consultation skill writes its
    briefs there), verified at plan time in `templates/waymark/.claude/skills/`.
13. **Each rule task writes its own reference entry.** `src/tests/unit/audit/run.test.ts` pins the
    registry's rule list and the rule-count sentences in `docs/reference/cairn-audit.md`, and
    `check-skill-budget.mjs` fails when `skills/cairn-admin-screens/SKILL.md`'s tier map misses a
    registered rule. So tasks 7, 8, and 9 each add their rule to both and update the counts. Task 11
    keeps the pages the spec gives it (`public-css.md`, the render registry, `public.md`).
14. **The three rules register at advisory tier; cairn's own tree gates through
    `check:public-tokens`.** The registry tier is the consumer tier (spec, "Tiers"). The repo's
    successor script runs the three rules over the showcase and exits nonzero on any unsuppressed
    finding at either tier, so "all three fail CI from day one" holds for cairn's own tree.
15. **`token-colors` keeps its verdicts.** The shared detection core classifies every literal form.
    `token-colors` keeps today's verdict set (hex, `rgb()`, named colors, and achromatic color
    functions), so its findings on the admin tree do not change; `public-literals` takes every form.
16. **The empty-scope error fires only when a public-scope rule runs.** A run whose selected rules
    include none of the three, such as a wrapper that injects its own rule list, never raises it.
    Reason: the admin scope's matching error exists for its own rules; an admin-only fixture tree
    should not fail on a scope no rule it runs reads. The same holds for the optional peers:
    `daisyui` and `tailwindcss` load lazily, only when a selected rule needs them, so a consumer
    missing one keeps its error-tier admin audit on an admin-only selection, and a full run still
    fails with the spec's named message.
17. **The successor script and the reskin fixture read the packaged audit.**
    `check:public-tokens` becomes `npm run package && node scripts/checks/check-public-scope.mjs`
    (a new file, which passes decision 27's repo-owned config), and `test:reskin` packages first
    and imports the contrast core from
    `dist/audit`. Reason: the scripts are plain `.mjs`, and `check:invisible-craft` and
    `check:admin-css-classes` already read `dist/audit` the same way. In `design.yml`, the
    `check:public-tokens` step moves after the showcase install, since `theme-conformance` reads
    `cairn-public.css` from the showcase's installed package.
18. **The fixture theme's palette lands in task 3.** Task 3 creates
    `scripts/lab/theme-fixture/theme.css` with its two daisyUI blocks, so the fixture is in the
    measurement population the spec names. Task 10 completes the file (faces, corners, levers, the
    custom token) and builds the harness around it. A fixture palette that fails `theme-contrast` in
    task 9 or 10 is a finding about `N`, returned to the conductor, never a palette quietly tuned to
    pass.
19. **The template arm proves the `@source` line with a planted sentinel.** Both `@theme` colors are
    also read by the chassis, so no real key is "read only by a built-in public component". The
    harness writes a sentinel file into the temporary install's `dist/public/` that uses one utility
    over a `cairn-public.css` `@theme` color that no template source uses. It asserts the utility
    reaches the compiled CSS, and a mutation that drops the `@source` line from the temporary
    install's copy fails it. Probe 3 then proves the same path with a real component.
20. **The pack smoke test is a real install.** `check:audit-pack` (a new script) packs the engine,
    installs the tarball with production dependencies into an empty directory under `os.tmpdir()`
    (outside the repository, removed on exit), verifies the installed `dist/audit` against the pack
    by content hash, and fails if `daisyui` resolves from that directory before the no-peers run.
    Its minimal fixture site carries a `src/theme/theme.css` with one daisyUI block, so the run
    reaches peer resolution instead of the empty-scope error. It runs `dist/audit/bin.js` three
    times: the full registry without the optional peers (a nonzero exit and the named message, no
    stack trace); one admin-only `--rule` selection without the peers (a clean run, since the peers
    load only when a selected rule needs them, decision 16's logic); and the full registry after
    installing `daisyui` and `tailwindcss` (a clean run with a nonzero scanned count). It also greps
    the installed `dist/**/*.d.ts` for `culori` and fails on a hit. Reason: only a real install
    proves culori is a declared dependency; a symlinked or in-repo `node_modules` would hide exactly
    the failure the spec guards. It joins `test.yml` after `check:package`, and `check:close` gains
    it at the same position.
21. **The `cairn-public` coverage gate is a script, not a unit test.** `check:public-skill` (a new
    script) compiles the showcase's public sheet with the showcase's own Tailwind CLI, as
    `build:admin-css` does for the admin sheet, so it needs the showcase's `node_modules`. `test.yml`
    installs those only after `npm test`, so the gate runs as a `test.yml` step after the showcase
    install, and `check:close` gains it at the same position.
22. **The catalogue's page list, by rule.** One page per directive (the showcase registry's nine at
    plan time: `callout`, `alert`, `icon`, `video`, `pull-quote`, `cta`, `micro-cta`, `faq`,
    `banner`; and the engine built-ins `figure` and `include`), one per island (`Banner`), one each
    for `CairnHead` and `PreviewBanner`, one per `cairn-*` class `composition.css` defines (hero's
    title and lead sit on the hero page), and six prose pages: headings and lead, links, lists,
    blockquote, code (`pre.shiki` and `.cairn-tok-*`), and tables and figures (`table-scroll`,
    `cairn-place-*`). About 27 pages. The coverage gate, not this list, is the arbiter: a source it
    walks that has no page fails.
23. **The theme-name config** is a new `examples/showcase/src/theme/theme-names.ts` exporting the
    toggle's `ThemeToggleConfig`. Its agreement test is a new
    `examples/showcase/src/theme/theme-names.test.ts`, which the template receives, since a
    designer renaming the themes benefits from it. The radius sweep is cairn's own template
    hygiene, so it is a new root test, `src/tests/unit/template-radius-literals.test.ts`, which the
    template does not receive.
24. **One owner sitting, before the merge.** The `paint` class settles with an owner sitting, and the
    merge is the last reversible point before a publish. The sitting's page carries the
    `PreviewBanner` before and after in both schemes, the styleguide kit, the fixture theme's
    renders, the probes' outcomes, and the budget line. Geoff's release-path ruling stands; the
    sitting asks only for corrections.
25. **The charter line.** Task 13 amends
    `docs/internal/what-cairn-is-and-is-not.md`'s rule-count sentence to name the public scope and
    its advisory tier on consumers, and writes the count read from the registries at execution. The
    count is already stale at plan time (the line says 28; the registries hold 34, 17 static and 17
    rendered, and pass B adds `radius-scale`). STATUS lists that stale count among Geoff's open
    owner facts for the draft docs plan's task 9 sitting; the close notes in STATUS that this pass
    settled the count, so that sitting drops it.
26. **The old `check-public-tokens.mjs` stays green until task 9 retires it** (plan gap). Its
    token-resolution check seeds its defined set from the chassis `tokens.css`, and its contrast
    parser reads Waymark's inks from the `:root` and dark `:root` blocks. Task 2 moves the
    definitions into `cairn-public.css`, and task 3 moves Waymark's inks into its daisyUI blocks, so
    both would turn `check:public-tokens`, `test:reskin`, `design.yml`, and `check:close` red for a
    whole segment. Tasks 2 and 3 therefore make the smallest adaptation that keeps the script
    honest: task 2 adds `src/lib/public/cairn-public.css` to its definition sources, and task 3
    teaches its ink reader the daisyUI blocks. Neither adaptation loosens a check. Task 9 retires
    the file.
27. **The engine's public roots live in a repo-owned config, never the showcase's** (review
    blocker; departs from the spec's "rooted ... by the showcase config"). The showcase's
    `cairn-audit.config.json` is emitted byte for byte into `templates/waymark` and baked into
    every scaffolded site, and a configured root the tree lacks throws, so a `../../src/lib/public`
    root there would break every scaffolded site's `check:cairn` (`create-site.yml` runs it). Task
    7 adds `scripts/checks/public-scope.config.json` (repo-owned, never emitted), which names the
    showcase's default public roots plus `../../src/lib/public`, and the themeRoots plus
    `../../src/lib/public/cairn-public.css`, relative to the showcase. The packaged audit reads it
    through `--config` from the showcase directory; task 9's successor script passes it. The
    showcase's own config gains no public key, since the defaults cover it. Task 6's
    `check:template` extension also fails on an emitted `cairn-audit.config.json` holding any path
    that starts with `..`.
28. **The dependency sweep runs in task 0, not on `main` after the merge** (review finding). A
    daisyUI or Tailwind patch (daisyUI 5.7.46 is already on the registry) can move computed theme
    values; swept after the merge, it would invalidate the equivalence expectation, the ink
    measurement, and the S1 baselines, and turn `main` red inside the merge-to-cut window. Swept
    first, every piece of pass evidence is captured on the release's dependencies. The sweep runs
    the `dependency-upgrade` skill on the new branch before task 1 (every minor and patch, any
    major held with its trigger, the survey recorded under `docs/internal/record/`). At the cut,
    `cairn-release`'s skip clause applies: the window already holds the sweep, and the conductor
    runs `npm outdated` at every manifest. A new minor or patch then stops the cut; it is taken on
    a short branch through the same skill and merged green before the cut resumes.

## Rulings for Geoff

One question for the plan-approval sitting. Everything else the review raised is folded or
refused in `docs/superpowers/research/2026-09-27-theme-pass-c-plan-fold.md`. Decision 7's
`app.html` regex is not on this list: keeping the two names gives a stale cookie a graceful
fallback instead of pinning a visitor to the default block, a behavioral reason with a clear
answer, and the unit check guards agreement.

1. **Raise the token ceiling to 30M (flag 24M) at approval?** The folded projection is about
   24.1M against a 24M ceiling, and the global rule asks its 80% question at the next segment
   boundary, which at 24M would trip around segment D.
   - **Recommendation: yes.** 30M puts the flag at the projection, so the flag fires only if the
     pass overruns its plan, which is the flag's job, and the global rule applies unchanged. A
     13-task pass that also carries the merge and a release is honestly this size.
   - **Yes builds:** the header reads 30M with the flag at 24M; the conductor asks the 80% question
     at the next segment boundary as the global rule says; the close and the cut never halt on
     budget once the merge lands.
   - **No builds:** the ceiling stays 24M, and approval pre-authorizes the plan's current reading:
     the budget question moves to S3's page instead of the boundary where the flag trips, and the
     close and the cut finish past the ceiling once the merge lands, with the overrun recorded in
     HISTORY's pass score.

## Global constraints

- **The Waymark render does not move.** `public-theme-equivalence.spec.ts` stays green from task 2
  to the close in all three states. Its committed expectation never changes after task 2's first
  commit: every later task's report quotes an empty `git diff <that commit> --
  examples/showcase/e2e/fixtures/public-theme-computed.json`, and the spec refuses its update mode
  when `CI` is set. The only intended visual changes are the styleguide's sample
  kit and one sentence (task 6) and `PreviewBanner`'s palette (task 4). A task that moves any other
  computed value stops and reports.
- **Literals live only in token definitions under a theme root.** No new color literal or absolute
  font size in a CSS declaration, `style=`, `style:`, or Tailwind arbitrary value outside
  `src/theme`, the chassis `tokens.css`, or `cairn-public.css`'s own definitions. Before task 7
  the check is a grep the report quotes; from task 7 it is `public-literals`.
- **`cairn-public.css` holds four things and nothing else** (spec, "The contract", part 2). Its
  roles sit in `@layer theme` on `:root, [data-theme]`. It redefines no Tailwind stock key. A key
  enters only when an engine or chassis file reads it and it carries no site-owned design choice.
- **No daisyUI component class in `src/lib/public/`.** A built-in public component assumes only
  `cairn-public.css` and daisyUI's theme variables.
- **The template is generated, never hand-edited.** Every task that edits an emitted showcase file
  runs `npm run emit:template` in the same task, and `check:template` stays green at every commit.
- **A chassis seam change updates the chassis README's table in the same task**, since
  `check:chassis-boundary` parses it.
- **Each public export adds its reference entry in the same task** (`check:reference`), and a
  task that changes a typed export regenerates `docs/internal/api-surface.md` with `npm run
  check:surface -- --update` and commits it with the export, so CI's `check:surface` step stays
  green. One sanctioned exception: task 2's `./cairn-public.css` export is untyped, so neither
  gate reads it, and its page, `public-css.md`, lands in task 11.
- **A check added to a CI workflow is added to `check:close` at the same position** in the same
  task, since `check:close` mirrors CI's check list.
- **Dependency changes go through the `dependency-upgrade` skill's survey** in the task that makes
  them (task 0's sweep, task 9's culori move and peers), recorded under `docs/internal/record/`. No
  other task adds a dependency; the showcase gains none (task 5's test stubs its DOM globals).
- **Ports.** Every preview a task, capture agent, or the conductor serves outside Playwright runs on
  a port other than 4173 and 4392 (4391 for a showcase preview, 4393 for the fixture harness), is
  reached through `BASE_URL` or `THEME_FIXTURE_PORT`, and is stopped on exit; the report says so.
  Every local showcase e2e runs with `E2E_PORT=4392`. Before it, the runner confirms nothing listens
  on 4392 (`ss -ltnp 'sport = :4392'` prints no listener) and quotes the output under Task checks,
  because the showcase's Playwright config reuses any server already there.
- Every showcase build outside `test:e2e` runs `npm run package` first.
- `docs/internal/public-design-system.md` is read before any public CSS or chassis edit, and
  `docs/internal/admin-design-system.md` before the `preview-doc.ts` edit.
- A test that asserts a changed number is updated deliberately; the report lists each with its old
  and new value and the spec line that moved it.
- Code comments follow TSDoc; no em dash in comments; a comment never claims what its assertion
  does not prove; no process citations (plan, pass, or task numbers) in shipped comments or in the
  emitted template. The labeled report block is verbatim; counts are reported as found, changed,
  deferred.
- No release, no version bump, no publish before task 15. No committed check or test reads a git
  ref or tag: CI checks out at depth 1.
- Never `git add -A`; commit named paths. Conventional Commits; imperative mood.

## Review focus

The inputs most likely to bite a user that the per-rule fixtures would not exercise, each pinned to
a test in its owning task:

1. **A consumer who upgrades but keeps a stale copied `tokens.css`.** Its unlayered `:root` roles
   beat the engine's `@layer theme` defaults and silently cancel ink derivation. The "a chassis file
   redeclares an engine default" finding must fire on a fixture that copies today's `tokens.css`
   beside the new import, and stay silent on the new template. Task 8.
2. **A nested `data-theme` region.** A derived ink recomputes inside it; the two `@theme` colors do
   not unless the nested block sets them. The harness asserts the first and the reference page
   states the second. Tasks 10 and 11.
3. **A theme that extends a built-in daisyUI theme by name** (a partial block named `nord`) passes
   `theme-conformance`, and a partial block with a custom name fails with a message that says
   whether the hole is in the default block or a secondary one. Task 8.
4. **Authored CSS with comments everywhere.** A comment before a declaration, inside a value, and
   between a `@plugin` block's options must never fuse into a property name or a value. Task 1,
   regression-tested over the real `theme.css` and `tokens.css`.
5. **A consumer with no `daisyui` or `tailwindcss` installed.** The shipped audit fails with the
   named message and a nonzero exit, never a module-resolution stack. Task 9, `check:audit-pack`.
6. **A dark-first theme, a light OS, and no cookie.** The toggle offers light mode, and its first
   click changes the root's computed `color-scheme`. Tasks 5 and 10.
7. **A site whose `src/lib/components` holds admin components and names that root under the admin
   scope.** The root leaves the public defaults, so no file answers to both grammars. Task 7.

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** The conductor verifies the start conditions and records each in the ledger. Task 0
takes no tier gate. Item 7's baseline runs in a gate agent.

1. **Pass A is merged and pass B is finished.** `main` contains pass A's merge. Pass B's ledger or
   STATUS records its close, names its branch and head, and records that its branch merged `main`
   in. Pass B's branch head is green on CI. If any of these fails, stop with one message to Geoff.
2. **No live executor.** Per the global "one executor per worktree" rule: `pgrep -af` on pass B's
   worktree path and on `theme-identity-c` finds nothing, `git status --porcelain` in pass B's
   worktree is empty, and no `theme-identity-c` branch or worktree exists. The draft docs pass stays
   paused on `draft-docs-0`.
3. **Worktree:** create `.claude/worktrees/theme-identity-c` on a new `theme-identity-c` from pass
   B's branch head; `npm ci`; `npm ci --prefix examples/showcase`; confirm with `realpath` that the
   showcase's `node_modules/@glw907/cairn-cms` resolves into this worktree. Then the dependency
   sweep (decision 28), dispatched to one Sonnet agent under the `dependency-upgrade` skill, which
   commits the bumps and the survey record on the branch. Items 4 and 7 run on the swept tree.
4. **Re-verify the plan's facts** (one Sonnet pre-flight agent, read-only), recording each against
   its plan-time value and amending the plan where one moved:
   - The post-rename paths: `src/lib/admin/preview-doc.ts` (plan-time
     `src/lib/components/preview-doc.ts:105`, `body{margin:0;background:#fff}` with a `WATCH`
     comment at `:99-104`), `src/lib/public/PreviewBanner.svelte` (five `--cairn-preview-*`
     properties: `bg`, `fg`, `border`, `link`, `radius`; `prefers-color-scheme` block at `:126`),
     `package.json` exporting `./admin` and `./public`, `docs/reference/public.md` present,
     `src/lib/audit/config.ts`'s `DEFAULT_STATIC_SCOPE`, `DEFAULT_ADMIN_SCOPE` (pass B's outcome,
     decision 9), `DEFAULT_SHEET_CANDIDATES`, and `DEFAULT_PALETTE_CSS_FILES`, and whether pass B
     implemented the admin half of the named-root rule.
   - The versions after the sweep: daisyUI 5.7.44 and Tailwind 4.3.3 installed at plan time (5.7.46
     is on the registry); culori 4.0.2 as a devDependency; `daisyui/theme/object` exports 35 themes
     with 29 keys each (28 custom properties plus `color-scheme`). A changed daisyUI or Tailwind
     major, or a changed key count, stops the pass.
   - The registries: 17 static and 17 rendered rules at plan time, plus pass B's `radius-scale`;
     `run.test.ts`'s rule-count assertion; the tier map in `skills/cairn-admin-screens/SKILL.md`.
   - `sheet.ts`'s comment fusion reproduces: `parseSheet` over the showcase's `theme.css`,
     `tokens.css`, and `prose.css` and the admin sheet yields 23, 7, 3, and 5 declarations whose
     property carries a comment (plan time).
   - The walkthrough's lines: `resolveTheme` at `examples/showcase/src/chassis/theme-toggle.ts:23-29`
     falls back to `matchMedia`; `app.html:12`'s regex names `cairn-dark|cairn` and cookie
     `cairn-site-theme`; `SiteHeader.svelte:67-73` holds the theme type and config; the skip link at
     `(site)/+layout.svelte:74` hides by `-top-xl`; the seven 2px corners at
     `(site)/+page.svelte:198,229,330`, `archive/[page]/+page.svelte:108`, `ArticleView.svelte:172`,
     `EntryRow.svelte:71`, and `prose.css:154`; the three shape exceptions at `prose.css:302` (the
     diamond marker, `1px`), `prose.css:639` (the video facade, `999px`), and
     `(site)/+page.svelte:274,288` (`--tag-filter-radius: 999px` declared in the route's scoped
     style); the styleguide's hand-written kit in `styleguide/+page.server.ts` and the "auto-themes
     with your system light or dark setting" sentence at `styleguide/+page.svelte:156`; the heading
     readers (`font-weight: 600` at `prose.css:79,102,115`, `font-semibold` at
     `SiteHeader.svelte:101`, `SiteFooter.svelte:59`, and `(site)/+page.svelte:49`, and the scoped
     `600`s in the home, archive, `EntryRow`, and styleguide routes).
   - `serializeComponent` at `src/lib/render/component-grammar.ts:44` and `previewValues` at
     `src/lib/render/registry.ts:226`, exported from no subpath; `RESERVED_DIRECTIVE_NAMES` holds
     `figure` and `include`.
   - The `docs/internal/` and `Verdict` citations remaining in `templates/waymark/src/` after pass
     A's task 11 repointed three in `theme.css`.
   - `examples/showcase/playwright.config.ts` honors `E2E_PORT` (pass A's decision 14).
   - The retired script's live readers: `src/tests/unit/check-public-tokens.test.ts`,
     `src/tests/unit/role-layer-contrast.test.ts` (imports `dualGamutRatio`),
     `src/tests/unit/check-idioms.test.ts:83`, `scripts/lab/reskin-fixture.mjs`,
     `src/tests/culori.d.ts`, and the prose that names the file.
5. **The engine string:** run `node scripts/checks/gate-tier.mjs --range HEAD~1..HEAD --pin engine`
   and confirm it prints the engine string under Gates.
6. **The freeze rule:** read the narrative-arm rule in `CLAUDE.md` on the branch and record it.
   Tasks 13 and 15 apply it.
7. **Baseline gate:** one gate agent runs `cairn-run-gate '<the engine string>'` in the worktree
   and returns the `gate exit:` line and the tail. It is the only proof of the swept tree before
   task 1 (pass B's CI proves the unswept head). The conductor quotes it to task 1's reviewer as
   task 0's gate evidence. A red caused by the sweep goes back to the sweep agent once; a stall in
   the serialized component run, or a second red, stops the pass with one message to Geoff.
8. **The release number is still free:** `npm view @glw907/cairn-cms versions --json` lists no
   `0.98.0` (plan time: newest `0.97.0`).

**Acceptance:** the ledger carries items 1 to 8 and the sweep's taken and held versions, and the
plan is amended and committed where item 4 moved a fact. A stop condition in item 1, 2, 4, or 7 halts the pass with one message to Geoff.

---

### Task 1: The `sheet.ts` comment fix

**Pass class:** `engine-logic`. **Spec:** "The guard", "Parsing goes through `sheet.ts`"; the
mechanics review's finding 2.

**Files:** `src/lib/audit/sheet.ts`, `src/tests/unit/audit/sheet.test.ts`, and any admin source a
newly surfaced finding requires (below).

**Outcome:** `parseSheet` never fuses a comment into a declaration's property or value. A comment
before a declaration, between two, inside a value, and inside a `@plugin` or `@theme` block is
dropped from the property and the value, and every other character of both is preserved. Offsets
(`start`, `end`) keep pointing at the same source positions. Fixing this can surface findings the
existing admin rules missed while a comment hid a property name. Each surfaced finding is fixed at
its source when the fix is a token swap or an equivalent one-line edit. Otherwise it takes a
reasoned suppression and a `ROADMAP.md` line. None is left red.

**Acceptance:**
- `sheet.test.ts` gains table-driven cases for each comment position above, and a regression case
  that parses the showcase's `theme.css` and `tokens.css` and asserts no property contains `/*` and
  every daisyUI key in each `@plugin "daisyui/theme"` block reads back by its exact name. The case
  fails with the fix reverted (mutation ledger).
- The report lists, per file, the fused-declaration count before and after (plan time 23, 7, 3, 5)
  and every finding the fix surfaced with its disposition.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line (missing or red is
  blocking): the idioms check, the comments check, the audit wrappers, and the showcase set.

---

### Task 2: The equivalence test, `cairn-public.css`, and its key-set snapshot

**Pass class:** `paint`. **Spec:** "The contract", "The roles sit in `@layer theme`", "The
defaults move into the engine", "What stays copied", "The seam promise", "Proof" (the first two
bullets).

**Files:** a new `examples/showcase/e2e/public-theme-equivalence.spec.ts` with its committed
expectation `examples/showcase/e2e/fixtures/public-theme-computed.json`; a new
`src/lib/public/cairn-public.css`; `package.json` (the `./cairn-public.css` export); the chassis
`examples/showcase/src/chassis/tokens.css` and `prose.css` (the `.table-scroll` split);
`examples/showcase/src/chassis/README.md` (the seam table only, if `check:chassis-boundary` needs
it); a new `src/tests/unit/cairn-public-surface.test.ts`; `scripts/checks/check-public-tokens.mjs`
(its definition sources only, decision 26); `templates/waymark/**` (re-emitted).

**Order of steps:** write the equivalence spec and generate its expectation on the tree **before**
any CSS moves; commit that pair alone first, so the report can cite the commit that holds the
expectation unchanged. An expectation regenerated after the move voids the test.

**Outcome:**
- **The equivalence spec** captures decision 5's key list and computed checks in the three states
  on the built showcase, and asserts string equality against the committed expectation. It
  iterates the committed expectation's keys, never a list re-parsed from the moved files. The focus
  check covers every `cairn-focus-ring` element on the pages it loads (`outline-style`,
  `outline-width`, `outline-color`, `outline-offset` each), not one. It carries an update mode
  behind an environment flag named in its header.
- **`cairn-public.css`** holds the spec's four things: the roles in `@layer theme` on
  `:root, [data-theme]` (the four status inks, `--cairn-shadow`, the three focus-ring keys, the nine
  `--cairn-code-*` keys, and `--flow-space`); `--color-muted` and `--color-card-border` in
  `@theme`; the `pre.shiki` and `.cairn-tok-*` binding, the structural `.table-scroll` pair
  (`display` and `overflow-x`), and `cairn-focus-ring` as a plain `@layer components` rule (no
  longer an `@utility`); and one `@source "."` line, copying `src/lib/admin-sources.css`'s pattern.
  **Every default reproduces today's value in this task**; the changed defaults land in task 3.
- **The export:** `@glw907/cairn-cms/cairn-public.css` maps to `./dist/public/cairn-public.css`,
  beside `./admin-sources.css`. `npm run package` ships it.
- **The chassis `tokens.css`** keeps the spec's keep-list (the Tailwind import, the
  `cairn-public.css` import, the `prose.css` and `composition.css` imports, `@source not
  "./.claude"`, the daisyUI plugin activation, and the design scale) and drops the engine roles, the
  two `@theme` colors, the code-block binding, the focus-ring utility, the CTA set, and
  `--cairn-caption-tracking`. The CTA set and caption tracking stay defined in Waymark's
  `theme.css`, their only definer once the chassis defaults leave. `cairn-public.css` imports after
  `tailwindcss` and before `prose.css`, so a theme's later `@theme` declaration wins. The header's
  ownership comment is rewritten to match.
- **The chassis `prose.css`** keeps its `.table-scroll` design (flow space, scroll-edge shading,
  focus) and drops only the structural `display` and `overflow-x` pair.
- **The snapshot test** parses `cairn-public.css` through `sheet.ts` (decision 8). It pins the key
  set in a committed snapshot, so a rename or removal fails until the snapshot update discloses it,
  and it asserts every key has a reader in `src/lib` or `examples/showcase/src/chassis`.
- `npm run emit:template` re-emits the template.

**Acceptance:**
- The equivalence spec passes in all three states, against an expectation from the commit before
  the move. The report quotes that commit. The expectation holds no empty value, or the report
  lists each empty key with its reason (Tailwind emits an `@theme` variable only when something
  reads it). A mutation that drops the `cairn-public.css` import from the chassis fails it, naming
  the first differing key.
- One cascade test states `cairn-focus-ring`'s new precedence (the `paint` mandate's "a utility
  beats it"): a utility setting `outline-*` on the same element wins. The report lists the
  class's variant uses in the showcase (none at review time).
- The snapshot test passes, and fails on a planted renamed key and on a planted key with no reader
  (mutation ledger).
- `npm run package` ships `dist/public/cairn-public.css`; `check:package` is green with the new
  export.
- `grep` over the chassis `tokens.css` finds none of the moved keys, and `grep` over
  `examples/showcase/src` finds `@utility cairn-focus-ring` nowhere.
- `gateTier: "targeted"`, `gate`:
  `npm run check && npx vitest run --project unit src/tests/unit/cairn-public-surface.test.ts && npm run check:template && npm run check:public-tokens && npm run test:reskin && npm run check:chassis-boundary && npm run package && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check && npm --prefix examples/showcase run test:unit && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- public-theme-equivalence.spec.ts styleguide.spec.ts prose-table.spec.ts`.
  Task checks: the port check, quoted; the package check.

---

### Task 3: Ink and muted derivation, the shadow default, and Waymark's per-scheme move

**Pass class:** `paint`. **Spec:** "Status inks derive by default"; decisions 1 to 3 and 18.

**Files:** `src/lib/public/cairn-public.css` (the ink, muted, and shadow defaults),
`examples/showcase/src/theme/theme.css`, a new measurement script
`scripts/lab/measure-status-inks.mjs`, a new record
`docs/superpowers/research/<date>-theme-pass-c-ink-derivation.md`, a new
`scripts/lab/theme-fixture/theme.css` (its two daisyUI blocks only), the snapshot file if a default
string it pins changes, `scripts/checks/check-public-tokens.mjs` (its ink reader only, decision
26), and `templates/waymark/**` (re-emitted).

**Outcome:**
- **The measurement** (decision 1 and 2) runs in Chromium through a committed, rerunnable script,
  and its record carries the full table: per status, the pass count at each `N`, the chosen `N`,
  the chroma check, and every failing theme and ground at the chosen value. The fixture palette
  (decision 18) is dark-first: `cairn-dark` carries `default: true`, the names stay `cairn` and
  `cairn-dark`, each block declares its `color-scheme`, and its values are chosen before the
  measurement runs, never after.
- **The defaults:** each status ink takes the derived form with its chosen `N`, `--color-muted`
  takes the opaque form with its chosen `M`, and `--cairn-shadow` takes decision 3's value. Each
  sits where task 2 placed it. The code ramp, the focus ring, `--flow-space`, and
  `--color-card-border` keep today's values.
- **Waymark keeps its hand-tuned values as overrides** and moves its per-scheme inks and muted into
  its two daisyUI blocks. Its dark `--cairn-shadow` and dark `--color-card-border` carry commas, so
  they stay in its dark `:root` blocks. The hand-synced dark `:root` blocks shrink to what cannot
  move, and their comments say why. Recipe step 6 in the header stops telling the designer to
  retune each ink with its hue and says the ink follows the fill and is overridden only to
  hand-tune.

**Acceptance:**
- The equivalence spec passes unchanged in all three states (Waymark overrides every changed
  default). The report lists each Waymark key that moved blocks.
- A test in the snapshot file asserts each ink default has the derived form with the recorded `N`,
  so a changed `N` is a disclosed change.
- The record exists, its table matches the defaults, and it names the stock themes that fail at the
  chosen values. It shows decision 1's hard constraint met at the chosen `N` and `M`: stripped
  Waymark and the fixture palette pass every pair in both schemes on all three grounds. If no
  value meets it, the task stops and reports instead of choosing.
- `check:public-tokens` still measures Waymark's hand-set inks after the move (decision 26); the
  report quotes its contrast table before and after, and the two are identical.
- `gateTier: "targeted"`, `gate`:
  `npm run check && npx vitest run --project unit src/tests/unit/cairn-public-surface.test.ts src/tests/unit/role-layer-contrast.test.ts && npm run check:template && npm run check:public-tokens && npm run test:reskin && npm run check:chassis-boundary && npm run package && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check && npm --prefix examples/showcase run test:unit && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- public-theme-equivalence.spec.ts styleguide.spec.ts prose-table.spec.ts`.
  Task checks: the port check, quoted.

---

### Task 4: `PreviewBanner`'s token styling and the editor preview's themed ground

**Pass class:** `paint`. **Spec:** "Built-in public components", "Levers and template fixes" (F7);
decision 11.

**Files:** `src/lib/public/PreviewBanner.svelte`, `src/tests/component/PreviewBanner.test.ts`,
`src/lib/admin/preview-doc.ts`, `src/tests/unit/preview-doc.test.ts`, a new
`examples/showcase/e2e/public-preview-tokens.spec.ts`, and `templates/waymark/**` if an emitted file
changes.

**Outcome:**
- **`PreviewBanner`** reads contract tokens (daisyUI roles, `cairn-public.css` roles) and drops its
  literal palettes and its `prefers-color-scheme` blocks. Its five `--cairn-preview-*` properties
  stay as named overrides whose fallbacks are tokens, so a site's existing override still wins. Its
  rules stay in its scoped `<style>` block (decision 11). It uses no daisyUI component class and
  no color literal anywhere, fallbacks included (task 7's public scope scans it). Each
  `cairn-public.css` role it reads carries a daisyUI-variable fallback, so a site that bumps the
  range before adding the import still paints both states legibly. The draft and published states
  stay visually distinct.
- **The preview reset** paints `var(--color-base-100, #fff)` in place of the pinned white. The
  `WATCH` comment above it is rewritten to state what the reset now reads, and it no longer calls
  the value unaudited.

**Acceptance:**
- `PreviewBanner.test.ts` asserts a site override on each of the five properties still wins, and
  that the file holds no color literal anywhere, `var()` fallbacks included (a source-text
  assertion until `public-literals` exists in task 7). Today's file fails it.
- `public-preview-tokens.spec.ts` reaches the draft and published states through the minted-token
  and publish flow `preview.spec.ts` uses, and asserts, under Waymark light and dark (OS preference
  and explicit): the banner's computed `background-color` and `color` equal the computed values of
  the contract tokens the task names, so today's `#fff6dd` fails; its text and link each clear
  4.5:1 on its ground; and the draft and published grounds differ in each scheme.
- The same spec, for the editor preview frame (whose `<html>` carries no `data-theme`, so only an
  emulated OS scheme reaches it), emulates `prefers-color-scheme` light and dark and asserts the
  frame `body`'s computed `background-color` equals the frame document's own resolved
  `--color-base-100`, and under dark is not `rgb(255, 255, 255)`. Mutation (reverted): restoring
  the reset's `#fff` fails it.
- `preview-doc.test.ts` asserts the new reset string.
- The report states whether any `admin-visual` capture shows the preview frame's `body` ground (the
  expected-red set).
- `gateTier: "targeted"`, `gate`:
  `npm run check && npx vitest run --project unit src/tests/unit/preview-doc.test.ts && npm run test:component -- --no-file-parallelism src/tests/component/PreviewBanner.test.ts && npm run check:template && npm --prefix examples/showcase run check && npm --prefix examples/showcase run format:check && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- public-theme-equivalence.spec.ts preview.spec.ts public-preview-tokens.spec.ts`.
  Task checks: the port check, quoted; the comments check; the idioms check; the audit wrappers
  (`check:invisible-craft` scans `preview-doc.ts`).

---

### Task 5: The heading levers, the toggle's scheme resolution, and the theme-name config

**Pass class:** `paint`. **Spec:** "Levers and template fixes" (F2, F3, F4); decisions 7 and 23.

**Files:** `examples/showcase/src/chassis/tokens.css` (the two keys and the `heading-case`
utility), `prose.css` (the heading rules), `examples/showcase/src/chassis/theme-toggle.ts` and a new
`examples/showcase/src/chassis/theme-toggle.test.ts`, a new
`examples/showcase/src/theme/theme-names.ts` and `theme-names.test.ts`,
`examples/showcase/src/theme/components/SiteHeader.svelte`, `SiteFooter.svelte`, `EntryRow.svelte`,
the home, archive, and styleguide routes under `examples/showcase/src/routes/(site)/`,
`examples/showcase/src/app.html` (its comment only), the chassis README's seam table, and
`templates/waymark/**` (re-emitted).

**Outcome:**
- **The levers.** The chassis `tokens.css` declares `--font-weight-heading: 600` in `@theme`
  (generating `font-heading`) and `--cairn-heading-case: none` as a plain role, plus the
  `heading-case` utility (decision 7). `prose.css`'s heading rules and the chrome's titles read the
  keys in place of a literal `600` or `font-semibold`. Eyebrows keep `uppercase tracking-eyebrow`
  and their own weight. The report tables every `600` and `font-semibold` site from task 0 item 4
  with its disposition: a heading reads the key; anything else (a bold run, a label, an eyebrow)
  stays.
- **The toggle.** With no `data-theme` on `<html>`, `resolveTheme` resolves the scheme from the
  root's computed `color-scheme` instead of the OS media query, so a dark-first theme needs no
  edit to `app.html`, and Waymark behaves as today. A computed value other than exactly `light` or
  `dark` (`normal` from a block that omits the key, or `light dark`) falls back to today's
  `matchMedia` behavior.
- **The theme names** move into `theme-names.ts`, which `SiteHeader` imports. Its doc comment names
  the two touchpoints that cannot import it: `app.html`'s inline script (the cookie name and the
  regex) and the daisyUI block names in `theme.css`.

**Acceptance:**
- `theme-toggle.test.ts` (test-first) covers the resolution table: an explicit `data-theme` for
  either name wins; no attribute and a computed `color-scheme` of `dark` gives the dark name, and
  `light` gives the light name, regardless of the media query; `normal` and `light dark` follow the
  media query. The showcase unit project runs in Node with no DOM library, so the test stubs
  `document`, `getComputedStyle`, and `matchMedia` with `vi.stubGlobal` and adds no dependency.
- `theme-names.test.ts` asserts the config's two names equal the daisyUI block names in `theme.css`,
  the cookie name equals the one `app.html` reads, and `app.html`'s regex accepts both names. It
  fails on a planted mismatch in each.
- The equivalence spec passes unchanged, and a computed-style check in it (or a new case) shows a
  prose `h2`, the home lead title, and a styleguide section heading at weight 600 and
  `text-transform: none` under Waymark.
- `theme-toggle.spec.ts` passes unchanged.
- `gateTier: "targeted"`, `gate`:
  `npm run check:template && npm run check:public-tokens && npm run test:reskin && npm run check:chassis-boundary && npm run check:custom-surface && npm run package && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check && npm --prefix examples/showcase run test:unit && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- public-theme-equivalence.spec.ts theme-toggle.spec.ts styleguide.spec.ts`.
  Task checks: the port check, quoted; the comments check.

---

### Task 6: The template sweep and the root export

**Pass class:** `engine-logic` (the root export is new public TypeScript surface, and the
`check:template` change is gate behavior). **Spec:** "Levers and template fixes" (F5, F6, F8, F17);
decisions 7, 12, and 23.

**Files:** `src/lib/render/registry.ts` or `component-grammar.ts` (the export's home),
`src/lib/index.ts`, `docs/reference/core.md`, `docs/internal/api-surface.md` (regenerated), a new
root unit test for `previewMarkdown`,
`examples/showcase/src/routes/(site)/styleguide/+page.server.ts` and `+page.svelte`,
`examples/showcase/src/routes/(site)/+layout.svelte`, `(site)/+page.svelte`,
`archive/[page]/+page.svelte`, `ArticleView.svelte`, `EntryRow.svelte`, the chassis `prose.css`,
`examples/showcase/src/theme/theme.css`, `site.css`, a new
`src/tests/unit/template-radius-literals.test.ts`,
`packages/create-cairn-site/scripts/emit-template-dir.mjs` and its test with a new fixture, a
unit test that proves a throwaway registry entry reaches the styleguide, and `templates/waymark/**`
(re-emitted).

**Outcome:**
- **`previewMarkdown(def)`** (decision 7) is exported from the root barrel, documented on
  `core.md` in this task, and built on `previewValues` and `serializeComponent` without exporting
  either. `npm run check:surface -- --update` regenerates `docs/internal/api-surface.md` in the
  same commit; its diff is the disclosure the reviewer reads.
- **The styleguide** renders one sample per registry entry from its `preview`, serialized through
  `previewMarkdown`. An entry with no `preview` is listed by name as lacking one. The hand-written
  kit goes. The "auto-themes with your system light or dark setting" claim goes; the sentence says
  what the page does.
- **The skip link** hides with a scale-independent idiom (`sr-only focus:not-sr-only` or
  equivalent) and is fully visible once focused.
- **The radii.** The seven 2px focus-ring corners read `var(--cairn-focus-ring-radius)`. The three
  shape exceptions stay, each with a one-line comment saying it is a shape, not a step on the
  corner ladder: the tag filter's pill, the video facade's round button, and the diamond marker. The
  tag pill reads `var(--tag-filter-radius, 999px)`, and the route's scoped declaration of
  `--tag-filter-radius` goes, so a theme's root value reaches it.
- **The comment scrub.** Each `docs/internal/` path and "Verdict" citation in the emitted sources
  becomes a one-line reason or a public docs link.
- **The gate.** `check:template` fails on an emitted file under `src/` or a root config file that
  contains `docs/internal/` or `Verdict` followed by a number (decision 12), and on an emitted
  `cairn-audit.config.json` holding any path that starts with `..` (decision 27).

**Acceptance:**
- The export's unit test covers a component with a `preview`, one without (returns `undefined`),
  and one with nested slots; `check:reference` and `check:reference:signatures` are green with the
  `core.md` entry.
- A unit test adds a throwaway registry entry with a `preview` and asserts its sample appears in the
  styleguide load's output with no edit to the route.
- `template-radius-literals.test.ts` sweeps the showcase's `src/theme`, `src/chassis`, and
  `src/routes/(site)` CSS and `<style>` blocks and finds no `border-radius` literal outside `0` and
  the three named exceptions; it fails on a planted `border-radius: 3px` (mutation ledger), fails
  when a named exception is no longer found (a stale entry), and reports its scanned-file count.
- `emit-template-dir.test.mjs` proves the gate with a fixture file carrying each string, a fixture
  config holding a `../` path, and a fixture under `.claude/` that the gate skips.
- `grep -rnE "docs/internal/|Verdict [0-9]" templates/waymark/src` prints nothing, and the
  "auto-themes with your system light or dark setting" sentence is found nowhere under
  `examples/showcase/src` or `templates/waymark/src`.
- The surface check is green with the regenerated `api-surface.md`.
- The equivalence spec passes; `styleguide.spec.ts` passes with any changed locator listed.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the showcase set; the
  comments check; the idioms check; the package check; the surface check; the Node-only template checks,
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:template && npm run check:chassis-boundary && npm run check:custom-surface && npm run test:emit && npm --prefix packages/create-cairn-site test'`;
  the port check, then
  `cairn-run-gate 'E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- public-theme-equivalence.spec.ts styleguide.spec.ts tag-filter.spec.ts'`.

---

### Task 7: The public scope and `public-literals`

**Pass class:** `engine-logic`. **Spec:** "The guard" (the scope, one scope per file, no silent
empty scope, cairn's own tree, `public-literals`), "Tiers"; decisions 6, 13 to 16.

**Files:** `src/lib/audit/config.ts`, `src/lib/audit/run.ts`, `src/lib/audit/types.ts`,
`src/lib/audit/markup.ts`, a new shared detection core under `src/lib/audit/` (its name is the
implementer's), `src/lib/audit/rules/static/token-colors.ts`, a new
`src/lib/audit/rules/static/public-literals.ts`, `src/lib/audit/rules/static/index.ts`, their unit
tests under `src/tests/unit/audit/` with fixtures, `src/tests/unit/audit/run.test.ts`, a new
`scripts/checks/public-scope.config.json` (decision 27), `docs/reference/cairn-audit.md`, and
`skills/cairn-admin-screens/SKILL.md` (the tier map and its count sentence).

**Outcome:**
- **The public scope** reads `.svelte` and `.css` files under `public.scope` minus
  `public.exclude`, with decision 6's keys and defaults. A missing default root is skipped; a
  configured missing root throws, as the admin scope's does. When a public-scope rule runs and every
  root together matches no files, the run fails with an actionable message naming `public.scope`
  (decision 16).
- **One scope per file.** The admin static scope skips any file the public scope claims, and the
  public scope never claims a file under an admin-scope root (decision 6). A root a site names
  explicitly for one scope leaves the other scope's defaults, in both directions.
- **`markup.ts`** exposes the static parts of a mixed `style=` value and each Svelte `style:`
  directive, with source offsets, so a finding lands on the right line.
- **The detection core** classifies hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`,
  `oklch()`, `color()`, and named colors as literals; `transparent`, `currentColor`, and the
  CSS-wide keywords are not. `token-colors` keeps its verdict set (decision 15).
- **`public-literals`** (advisory) flags a color literal or an absolute font size (`px`, `pt`,
  `rem`) in a CSS declaration, a `style=` value, a `style:` directive, or a Tailwind arbitrary value
  (`text-[#abc]`, `text-[14px]`). `em`, `%`, and a `var()` or `calc()` over tokens pass. A
  custom-property definition is legal anywhere under a theme root, a component's `<style>` block
  included. The root element's `font-size` is exempt by rule. Tailwind's own utilities are never
  flagged.
- **The repo-owned config** (decision 27) sets `public.scope` to the showcase's default public
  roots plus the engine's `../../src/lib/public`, and `public.themeRoots` to `src/theme`,
  `src/chassis/tokens.css`, and `../../src/lib/public/cairn-public.css`. The showcase's own
  `cairn-audit.config.json` does not change. The engine's `src/lib/admin/` is never a public root.
- **The docs:** `cairn-audit.md` gains the rule's entry, the public scope's section with its config
  keys and the named-root rule, and the updated counts; the admin-screens tier map lists the rule
  under "Static, advisory tier".

**Acceptance:**
- Fixtures, each raising exactly the named finding: `public-literals` flags a `#hex` in a
  `<style>`, an `oklch(` in `style=`, `text-[14px]`, `bg-[#abc]`, a `style:color` directive, and a
  literal custom property outside a theme root. It passes a custom property in a theme component's
  `<style>`, the chassis scale's `rem` steps, `text-sm`, `bg-red-500`, `0.88em`, and the root
  `font-size` clamp.
- A table-driven test covers the detection core per form: each literal form named above flags, and
  `transparent`, `currentColor`, `inherit`, and `unset` do not. A mixed
  `style="color: #abc; width: {w}px"` fixture lands its finding on the right offset.
- A test asserts the two default root sets are disjoint, and that a root named for one scope leaves
  the other's defaults, in both directions. A test asserts the empty-scope error fires on a tree with
  no public files when a public rule runs, and not when none does. A configured missing root
  throws; a missing default root is skipped.
- A test asserts that a config with a custom `public.exclude`, and one with `public.scope:
  ["src"]`, both leave `src/routes/admin` files under `token-colors` and out of `public-literals`,
  and that a file under both scopes' configured roots raises one rule's finding, never both.
- `token-colors.test.ts` passes unmodified, and one new case asserts `oklch(60% 0.12 200)` is
  flagged by `public-literals` and not by `token-colors` (decision 15).
- `templates/waymark/cairn-audit.config.json` is byte-identical to its pre-task state.
- The packaged audit, run from the showcase directory with `--config` naming the repo-owned config
  and the rule selected, reports zero `public-literals` findings and a scanned count that includes
  `../../src/lib/public/PreviewBanner.svelte`; the report quotes both.
- `check:invisible-craft` and `check:admin-css-classes` report the same findings as before; the
  report lists any file that moved scopes.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the idioms check; the
  comments check; the audit wrappers; the package check (the skill budget and tier map); the
  showcase set.

---

### Task 8: `theme-conformance`

**Pass class:** `engine-logic`. **Spec:** "The guard", `theme-conformance`; "Proof", its fixtures;
decision 6.

**Files:** `src/lib/audit/sheet.ts` (a sibling export listing top-level statement at-rules, since
`parseSheet` drops a block-less `@import` at its `;`) with its test, a new import-chain loader
under `src/lib/audit/` (shared with task 9), a new
`src/lib/audit/rules/static/theme-conformance.ts`, `src/lib/audit/rules/static/index.ts`, their
unit tests and fixtures, `src/tests/unit/audit/run.test.ts`, `docs/reference/cairn-audit.md`, and
the admin-screens tier map.

**Outcome:**
- **The loader** reads each `public.stylesheets` entry and follows its `@import` chain in order:
  relative paths from the importing file, package specifiers from the audited root's installed
  packages (so `cairn-public.css` is read from the installed package, and counts only when the chain
  imports it). A package specifier resolves under the `style` export condition, then the `style`
  field, never plain Node resolution: `tailwindcss` resolves to `dist/lib.js` under Node's
  conditions and to `index.css` only under `style`. A non-CSS target is a named finding, never
  parsed. `tailwindcss` itself is not traversed, since resolution source 2 covers its variables.
  Every file, and every `@import` statement, is read through `sheet.ts`, never a regex over raw
  text.
- **The key list** is read from `daisyui/theme/object`, resolved from the audited root. When
  `daisyui` or `tailwindcss` cannot be resolved, the audit fails with a named message saying which
  peer is missing and how to install it. The rule fails loudly when the list is empty or lacks
  `--color-base-100` or `--radius-box`.
- **Completeness.** Each named daisyUI theme block defines every key (`color-scheme` included,
  since task 5's toggle reads it), except a block named after a
  built-in theme, which daisyUI completes by merging. The message says whether an omission sits in
  the default block (a runtime hole) or a secondary one. A scope with no theme block raises a
  finding.
- **Resolution.** A `var(--x)` with no fallback resolves to one of the spec's four sources: the real
  import chain; Tailwind's theme variables from `tailwindcss/theme.css`, or the `--tw-` namespace;
  the daisyUI keys of a block the rule found complete; or any custom property declared in the
  scanned tree, in CSS, `<style>`, `style=`, or `style:`. A `var()` with a fallback and a
  non-literal name are skipped.
- **Three more findings:** the public stylesheet does not import `cairn-public.css`; a chassis file
  redeclares an engine default; and a `--font-<name>` face declared beside a `--font-weight-<name>`
  weight.
- **The docs** as task 7's, for this rule.

**Acceptance:**
- Fixtures, each raising exactly the named finding: a block missing `--radius-box`; a key missing
  from one block only (the message names which block); `var(--typo-token)`; `var(--color-red-550)`;
  a stylesheet that skips `cairn-public.css`; a copied pre-pass-C `tokens.css` beside the new import
  (Review focus 1); and a `--font-heading` face beside `--font-weight-heading`. It passes a partial
  block named `nord`, `var(--color-red-500)`, a route-local token, and the new template's chassis.
- More fixtures, each with its named message: a hole in the default block and a hole in a
  secondary block (the two message variants); a block missing `color-scheme`; a scope with no
  theme block; an import of a package that exports CSS only under `style` (resolved and read); and
  a `var(--tw-*)` that passes. An injected empty key list, then one lacking `--radius-box`, each
  raise the rule's loud failure.
- A test asserts the named failure for a missing `daisyui` and a missing `tailwindcss` (resolution
  injected, so the test needs no uninstall).
- The rule reports zero findings over the showcase through the packaged audit with the repo-owned
  config; the report quotes the scanned count.
- `gateTier: "engine"`. Task checks, each quoted: the idioms check; the comments check; the audit
  wrappers; the package check; the showcase set.

---

### Task 9: `theme-contrast`, the dependencies, the pack smoke test, and `check:public-tokens`

**Pass class:** `engine-logic`. **Model:** `opus`. **Spec:** "The guard", `theme-contrast`,
"Tiers", "Dependencies"; the fold's guard internals; decisions 14, 17, and 20.

**Files:** a new `src/lib/audit/rules/static/theme-contrast.ts` and its resolver and contrast core
under `src/lib/audit/`, `src/lib/audit/rules/static/index.ts`, their unit tests and fixtures,
`src/tests/unit/audit/run.test.ts`, `package.json` (`dependencies`, `peerDependencies`,
`peerDependenciesMeta`, and the `check:public-tokens`, `test:reskin`, `check:audit-pack`, and
`check:close` scripts), `package-lock.json`, a new `scripts/checks/check-public-scope.mjs`, a new
`scripts/checks/check-audit-pack.mjs` with its minimal fixture site, a unit test for
`check-public-scope.mjs`'s exit logic, `scripts/lab/reskin-fixture.mjs`,
the retirement of `scripts/checks/check-public-tokens.mjs` and
`src/tests/unit/check-public-tokens.test.ts`, `src/tests/unit/role-layer-contrast.test.ts`,
`src/tests/unit/check-idioms.test.ts`, `src/tests/culori.d.ts` (or its successor),
`.github/workflows/design.yml` and `test.yml`, the dependency survey record under
`docs/internal/record/`, `docs/reference/cairn-audit.md`, the admin-screens tier map, and the live
prose that names the retired file.

**Outcome:**
- **The resolver** (the fold's stated bound) follows `var()` chains to a literal and evaluates one
  `color-mix` form: two operands in `oklab` or `oklch` and one percentage, via culori's
  `interpolateWithPremultipliedAlpha`, since CSS `color-mix()` interpolates premultiplied and plain
  `interpolate` darkens every mix toward `transparent` (verified at review: `oklch(25% 0 0) 60%,
  transparent` gives `l` 0.15 plain, 0.25 premultiplied). An achromatic operand's hue is powerless:
  the resolver treats a hue at chroma near 0 as missing if the Chromium comparison below disagrees
  with culori's interpolated hue. It then alpha-composites over the ground. Any other form yields
  an "unmeasured" finding, never a pass or a crash.
- **The scheme model.** Schemes come from the daisyUI theme blocks, never hard-coded names. Each
  named block resolves as `html[data-theme="<name>"]` would, the `prefersdark` block also takes the
  `@media (prefers-color-scheme: dark) :root:not([data-theme])` rules, and a secondary block's
  omission falls back to the default block's `:where(:root)` values. Sources load in the site's
  import order through task 8's loader.
- **The pairs:** every text-bearing role with its `-content`, plus each ink and muted on
  `base-100`, `base-200`, and the callout tint, at 4.5:1 in both sRGB and display-p3.
- **The dependencies** (each through the `dependency-upgrade` skill's survey, recorded): culori
  moves to `dependencies` at its current range; `daisyui` (`^5`) and `tailwindcss` (`^4`) become
  optional peers in `peerDependenciesMeta`, the existing `@anthropic-ai/sdk` pattern, and stay
  devDependencies. The shipped `.d.ts` resolves for a consumer: no shipped declaration references a
  culori type a consumer cannot resolve.
- **`check:audit-pack`** as decision 20 states, wired into `test.yml` after `check:package` and into
  `check:close` at the same position.
- **`check:public-tokens`** becomes decision 17's successor. It runs the three public rules over the
  showcase with the repo-owned config (decision 27), and again over the showcase with
  `examples/cairn-theme/cairn.css` layered after `theme.css` in the chain. It exits nonzero on any
  unsuppressed finding at either tier, and prints each run's scanned count and per-scheme
  measured-pair count. The old
  script and its unit test retire; `test:reskin` imports the contrast core from `dist/audit` and
  gains the standing case: Waymark with its four ink overrides stripped passes `theme-contrast` in
  both schemes. The hue-rotation case stays. `role-layer-contrast.test.ts` imports the core from
  `src/lib/audit`. `design.yml` runs `check:public-tokens` after the showcase install. A reference to
  the npm script name stays; a reference to the retired file is repointed.
- **The docs** as task 7's, for this rule, with the coverage limits stated.

**Acceptance:**
- Fixtures, each raising exactly the named finding: a hand-set ink below AA; a derived ink that
  passes light and fails dark; an ink failing on the callout tint only; a role on its `-content`
  below AA (for example `primary` on `primary-content`); and an unmeasurable expression (a
  relative color, a three-operand mix), which yields "unmeasured".
- The scheme model's fixtures use names other than `cairn`: blocks `acme` (`default: true`) and
  `acme-night` (`prefersdark`) with one failing ink in `acme-night`, whose finding names
  `acme-night`; a secondary block that omits a key and takes the default block's value; and a
  `prefersdark` media rule that changes a measured pair.
- A resolver unit test compares its `color-mix` result with Chromium's computed value for at least
  six pairs (both spaces, both percentages ends, one with a `transparent` operand, one `oklch` pair
  with an achromatic operand), recorded to the printed digit; a mismatch is a blocking finding.
- The three rules report zero findings over the showcase and over the overlay variant, each with a
  nonzero scanned count and a per-scheme measured-pair count equal to the expected pair list's
  length; `test:reskin` passes both cases; the report quotes the stripped-inks case's per-pair
  table.
- The successor fails when it should: a unit test covers `check-public-scope.mjs`'s exit logic in
  four states (no finding, an advisory finding, an error finding, a suppressed finding), and two
  mutations (each reverted), a planted sub-AA ink and a planted `#hex` in a chassis `<style>`, each
  make `npm run check:public-tokens` exit nonzero naming the rule.
- The dependency survey record exists under `docs/internal/record/`.
- `npm run check:audit-pack` passes and fails when culori is moved back to `devDependencies`
  (mutation ledger, reverted).
- `check:package` is green; `git grep -n check-public-tokens.mjs` prints only history and record
  files.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the idioms check; the
  comments check; the audit wrappers; the package check;
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:public-tokens && npm run test:reskin && npm run check:audit-pack'`
  (no browser);
  the showcase set.

---

### Task 10: The fixture theme and `test:theme-fixture`

**Pass class:** `paint`. **Spec:** "Proof", the second theme and its harness; "Levers and template
fixes", each harness check; decisions 4, 18, and 19.

**Files:** `scripts/lab/theme-fixture/theme.css` (completed), a new harness under `scripts/lab/`
with its Playwright spec and config, `package.json` (`test:theme-fixture`), `.gitignore`
(`.cairn-theme-fixture-*/`), `scripts/lab/reskin-fixture.mjs` (the fixture as a third case),
`scripts/checks/check-public-scope.mjs` (the fixture variant), and `.github/workflows/design.yml`.

**Outcome:**
- **The fixture theme** is deliberately unlike Waymark: system-stack faces, a square corner ladder
  (`--radius-box: 0` and siblings), the dark-first palette from task 3, derived inks on all but one
  status (one hand-set), one custom token read by one theme rule, per-scheme values in its daisyUI
  blocks, the CTA set and caption tracking the styleguide reads, and the walkthrough's lever values:
  `--font-weight-heading: 800`, `--cairn-heading-case: uppercase`, `--tag-filter-radius: 0`, and a
  tightened `--spacing-xl`. It keeps the names `cairn` and `cairn-dark`. The three public rules pass
  on it: `check:public-tokens` gains a third variant, the showcase with the fixture in place of
  `theme.css`.
- **The harness** (`npm run test:theme-fixture`) takes an optional theme path (default the
  committed fixture), plus decision 4's two probe modes, so the probes reuse it. **The showcase
  arm** loads home, one article, and the styleguide, and asserts: computed `--radius-box` is `0`;
  the first `font-family` entry is the fixture's face and differs from Waymark's; a derived ink,
  measured as an ink-painted element's computed `color`, equals the computed `color` of a sibling
  reference element painted with the literal `color-mix(in oklab, <resolved fill> N%, <resolved
  base-content>)`, so Chromium evaluates both sides; the custom token reaches its element; inside a
  nested `data-theme="cairn"` region injected into the dark page, the ink-painted element's
  computed `color` differs from the same element outside it and equals its value with
  `data-theme="cairn"` on the root; the toggle,
  under a light OS with no cookie, offers light mode, and its first click changes the root's
  computed `color-scheme`; a prose `h2`, the home lead title, and a styleguide section heading
  compute weight 800 and `uppercase`; the skip link is visually hidden until focused and fully
  visible once focused; and a tag pill and a focused entry link compute a `0` corner. **The template
  arm** builds the template under Waymark and under the fixture and asserts decision 19's sentinel.
- **CI:** `design.yml` runs both arms.

**Acceptance:**
- Both arms pass locally and each assertion above appears by name in the spec. The report quotes
  the run and states that the temporary copy and the preview server were removed and stopped.
- Mutations (each reverted): setting the fixture's `--radius-box` to `0.5rem` fails the corner
  assertion; removing `[data-theme]` from `cairn-public.css`'s role selector fails the nesting
  assertion; dropping the `@source` line in the template arm's installed copy fails the sentinel.
- One run of each probe mode passes: `--build-only` with `--theme-dir` pointed at Waymark's
  `src/theme`, and the template arm's `--probe` on a styleguide element, reporting its color and
  radius under both themes.
- `check:public-tokens`'s fixture variant reports zero findings; the report quotes its scanned
  count and per-scheme pair count.
- The run leaves no `.cairn-theme-fixture-*` directory and no listener on 4393, after the green run
  and after the failing `--radius-box` mutation run.
- `gateTier: "targeted"`, `gate`:
  `npm run check:public-tokens && npm run test:reskin && npm run test:theme-fixture && npm --prefix examples/showcase run check`.
  Task checks: `ss -ltnp 'sport = :4393'` prints no listener before and after, quoted.

---

### Task 11: The reference pages and the render registry

**Pass class:** `docs`. **Spec:** "Where the guidance lives" (`public-css.md`), "Documentation and
records" (reference pages), "Proof" (the snapshot's page-sync and registry assertions).

**Files:** a new `docs/reference/public-css.md`, `docs/reference/README.md` (its index entry),
`docs/reference/render.md` (the emitted-class registry), `docs/reference/public.md`
(`PreviewBanner`'s styling and its five override properties),
`src/tests/unit/cairn-public-surface.test.ts`, and facts bullets in `docs/internal/facts/`.

**Outcome:**
- **`public-css.md`** opens with the governing principle and carries the whole contract: daisyUI's
  variables, every `cairn-public.css` key with its default, the rules the sheet ships, the layer and
  nesting behavior with its limits (the two `@theme` colors do not recompute under a nested theme,
  so a nesting theme sets them in the nested block), the placement rule (a per-scheme value in that
  scheme's daisyUI block, a comma-bearing one in that scheme's `:root` block), ink derivation with
  the chosen percentages, the seam promise, and `theme-contrast`'s coverage limits. It links the
  registry.
- **The registry** gains `pre.shiki`, `.cairn-tok-*`, `cairn-place-*`, and `table-scroll`, each
  saying whether the engine sheet styles it or a theme must. It does not gain `cairn-focus-ring`,
  which the engine never emits.
- **The snapshot test** gains the page-sync assertions (the page lists each key with its default and
  names nothing the file lacks) and the registry assertion (every emitted class the sheet styles is
  in the registry).
- Facts bullets for the contract's public behaviors: the export, the derived defaults and their
  changed values, the nesting limit, and the `PreviewBanner` token styling.

**Acceptance:**
- The snapshot test passes and fails on a planted key missing from the page and a planted extra key
  on the page (mutation ledger).
- `gateTier: "targeted"`, `gate`:
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:facts && npm run check:arm-indexes && npx vitest run --project unit src/tests/unit/cairn-public-surface.test.ts`.

---

### Task 12: The `cairn-public` skill, its coverage gate, and the `cairn-extend` routing line

**Pass class:** `engine-logic`, scoped gate (no file under `src/lib` changes). **Spec:** "Where the
guidance lives" (the skill, its two halves, the coverage gate); decisions 11, 21, and 22.

**Files:** a new `skills/cairn-public/SKILL.md` and `skills/cairn-public/references/*.md`, a new
`scripts/checks/check-public-skill.mjs` with a new `src/tests/unit/check-public-skill.test.ts`,
`package.json` (`check:public-skill`,
`check:close`), `.github/workflows/test.yml`, `skills/cairn-extend/SKILL.md` (one routing line),
`docs/reference/guidance.md` (the shipped-skill list), any unit test that enumerates shipped skills,
and `templates/waymark/**` (re-emitted; the bake ships the new skill under `.claude/skills`).

**Outcome:**
- **`SKILL.md`** is a router within the 3,500-token packaged budget, deferring to the official
  daisyUI skill for component classes. **The theming section** gives the job-to-token table (rows
  for eyebrows, headings with the two levers, the default scheme, and rules: `base-300` is the rule
  and border color, never a text ground), the placement rule with its comma exception, the fast
  path (extend a built-in daisyUI theme, or start from daisyUI's theme generator) beside the
  full-control path, the two sanctioned escapes from `public-literals` (a one-line `@theme` token,
  or a reasoned suppression), the theme-name touchpoints, and what a replacement `prose.css` must
  cover (the registry). **The catalogue** is decision 22's pages, each with the rendered markup, the
  classes and tokens it reads, and its override seams. The component recipe names both paths, in
  decision 11's wording.
- **The coverage gate** asserts three things: every directive (the showcase registry, walked through
  `previewMarkdown`, plus `figure` and `include`), every island, and every composition primitive has
  a page; every class a snippet uses exists in the showcase's compiled public sheet or the registry;
  and every token a snippet or the table names resolves under `theme-conformance`'s resolution set,
  read from the packaged audit. A parser that matches nothing fails. The Tailwind compile scans the
  showcase's own sources only, never the skill's snippet files, or every valid utility would
  compile and the class check would pass vacuously.
- **`cairn-extend`** gains one routing line to `cairn-public`.

**Acceptance:**
- `check:public-skill` passes, and its unit tests prove each assertion fails on a planted gap: a
  directive with no page, an uncompiled class in a snippet, an unresolved token, and an empty parse.
- `check:package` passes with the skill budget; the report quotes each packaged `SKILL.md`'s token
  estimate.
- `templates/waymark/.claude/skills/cairn-public/SKILL.md` exists after the re-emit, and
  `npm --prefix packages/create-cairn-site test` passes. `grep` finds `cairn-public` in
  `skills/cairn-extend/SKILL.md`.
- `gateTier: "targeted"`, `gate`:
  `npm run check && npx vitest run --project unit src/tests/unit/check-public-skill.test.ts src/tests/unit/check-skill-budget.test.ts src/tests/unit/guidance/install.test.ts && npm run check:public-skill && npm run check:template && npm --prefix packages/create-cairn-site test`.
  Task checks: the package check; `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs && npm run check:vale'`.

---

### Task 13: The chassis README, the design-system documents, `design-your-site.md`, the charter

**Pass class:** `docs`. **Spec:** "Documentation and records" (the frozen narrative page, the
internal docs, the charter); decision 25.

**Files:** `examples/showcase/src/chassis/README.md`, `docs/internal/public-design-system.md`,
`docs/extend/design-your-site.md`, `docs/internal/what-cairn-is-and-is-not.md`, facts bullets in
`docs/internal/facts/`, and `templates/waymark/**` (re-emitted).

**Outcome:**
- **The chassis README:** the `tokens.css` row names the two heading keys and the `heading-case`
  utility; "The token system" paragraph describes the import of `cairn-public.css` and what stays
  site-owned; the namespace paragraph states the naming rule (daisyUI's names for daisyUI's keys, a
  Tailwind namespace for a utility-bearing key, `--cairn-*` for every other role, `--flow-space`
  grandfathered); the spacing-collision note names all five shadowed names (`3xs`, `2xs`, `xs`,
  `xl`, `2xl`); and the sentence calling directive classes engine-fixed is corrected against the
  registry.
- **`public-design-system.md`:** the fill-and-ink rule says the ink follows the fill and is
  hand-tuned only by override.
- **`design-your-site.md`** (frozen, fixed only where this pass made it wrong, each fix mirrored as
  a facts bullet): "every design-scale key … carries a generic default", the ink-retune warning,
  and "Neither ships in a scaffolded site's own `package.json`", since the audit's public scope now
  ships.
- **The charter** line, per decision 25.
- `npm run emit:template` re-emits the template after the README change.

**Acceptance:**
- `grep` finds none of the three superseded sentences on `design-your-site.md`, and the README no
  longer holds "share a suffix with three of Tailwind's built-in" (the plan-time wording).
- `gateTier: "targeted"`, `gate`:
  `npm run check:docs && npm run check:vale && npm run check:facts && npm run check:chassis-boundary && npm run check:template`.

---

### S1: CI baseline regeneration and a fresh-context read (conductor-led)

**Outcome:** After the segment D push, the conductor dispatches `e2e.yml` on the branch with
`update_snapshots: true`, which regenerates the `site-visual` baselines (and any `admin-visual`
capture task 4 put in the expected set) on the runner and commits them. Then:
1. `git pull --ff-only` in the worktree.
2. A Haiku probe lists the PNGs the regen rewrote and names any outside the expected set.
3. One `visual-verifier` reads each rewritten PNG against its previous version, and reads the
   fixture harness's captures (home, article, styleguide at 1440 and 390, both schemes) against the
   responsive standard. A rewritten PNG outside the expected set, or a STRUCTURAL verdict, goes to
   task 14.
4. The conductor commits the S1 ledger entry and pushes.

**Acceptance:** the regen commit exists on the branch; the `e2e`, `test`, and `design` runs for the
ledger commit's SHA are green with no expected-red exception left.

### S2: Probes 2 and 3 (conductor-led)

**Outcome:** Two fresh agents, each given only the shipped guidance (the packaged skills and the
reference pages as a consumer installs them) and a one-line brief, in a throwaway worktree of the
branch.
- **Probe 2** (Sonnet `general-purpose`): "Build a minimal new theme on this chassis, with its own
  chrome and one custom public component." It passes with zero public-scope findings, a scanned-file
  count that includes every file it created or edited, and a clean `test:theme-fixture
  --build-only --theme-dir <its theme>` run.
- **Probe 3** (a `cairn-implementer`): "Add a small built-in public component to
  `src/lib/public/`." It passes with zero public-scope findings on its directory and a nonzero
  scanned count. In the harness's template arm, with the component mounted by a throwaway route
  edit, `--probe` reports its computed color and radius differing between Waymark and the fixture
  and equal to each theme's tokens. The main loop reads one screenshot per theme.

A failure names a guidance gap, fixed on its shipped page by a task 14 run, and a fresh agent
re-runs the probe once. A second failure escalates in S3's question. Both throwaway worktrees are
removed.

**Acceptance:** each probe's verdict, its scanned count, its finding count, and any gap fixed are
in the ledger.

### Task 14: Settle fixes (conditional)

Dispatched only if S1, S2, or S3 returns work, as a one-task `pass-execute` run, again only for
S3's corrections.

**Files:** as the items require.

**Outcome:** each item is fixed at its source (a guidance gap on its shipped page, a visual item in
the theme layer), with its test or gate updated.

**Acceptance:** each item is closed in the report with its test. The class and gate follow the
files touched: a guidance or docs item takes task 12's or 11's gate, a CSS item task 2's, and any
`src/lib` TypeScript change the engine pin.

### Resume point (between segments E and F)

The conductor writes STATUS with a resume prompt naming this plan, its ledger, the next step (S3),
the spend, and the open items, then closes the session.

### S3: The owner sitting (conductor-led, one sitting)

**Outcome:** One review page (one Chromium tab, or an Artifact if Geoff is away) carrying: the
`PreviewBanner` draft and published states before and after, in both schemes; the styleguide's new
sample kit; the fixture theme's home, article, and styleguide at 1440 and 390, both schemes; the
probes' outcomes; any S1 owner-taste items; and the running spend against the ceiling. It asks one
combined question: any correction before the merge and the `0.98.0` cut? Each open item carries a
recommendation.

**Acceptance:** Geoff's verdict is recorded verbatim in the ledger. Corrections go to one task 14
run. The sitting counts as one execution sitting.

---

### Task 15: Close, merge, and release

**Outcome:** First, `code-simplifier:code-simplifier` runs once over the scope named under
`code-simplifier` and commits; if it changed a typed declaration, `npm run check:surface --
--update` runs and its diff joins that commit. Then the full gate on that commit, in one gate
agent: `npm run check`, `npm run test:node-projects && npm run test:component --
--no-file-parallelism` (the serialized form of `npm test`, pass A's decision 13), `npm run
check:close`, `npm --prefix examples/showcase run test:unit` (CI runs it; `check:close` does not),
and `npm run test:theme-fixture` (a browser harness, so outside `check:close`, which gained
`check:audit-pack` and `check:public-skill` in tasks 9 and 12). The consumer-build proof is CI's
`e2e` run on the pushed head. Then the review fan-out, in parallel: `svelte-reviewer` (the showcase
and `PreviewBanner` changes), `daisyui-a11y-reviewer` (the banner, the skip link, the toggle, the
styleguide), and one Opus `general-purpose` read of `src/lib/audit`'s new code against the spec's
guard section. Findings fold through one task 14 run.

Then one Sonnet agent drafts the close and commits it; one Opus `diff-reviewer` reads that diff, and
the drafter folds its findings once. Hard cap about 0.7M tokens for draft, review, and fold. The
cairn-pass ritual:
- **`CHANGELOG.md`** under `## Unreleased`: pass C's entry, with the one `Consumers must:` line the
  spec gives verbatim ("move any key your copied `src/chassis/tokens.css` adds beyond the new
  template's into your theme, then replace the copied roles, the two `@theme` colors, the code-block
  binding, and the focus-ring utility with `@import "@glw907/cairn-cms/cairn-public.css"`; compare
  your copy's ink, muted, and shadow values first, since those defaults changed."). It names the
  changed defaults, the three rules and their tiers, the two optional peers, the new root export,
  and the heading levers. It also names the consumer-visible changes a site sees on upgrade:
  `PreviewBanner`'s token palette and the editor preview's ground following the site's
  `base-100`; `cairn-focus-ring` now a components-layer rule that takes no variants and sits below
  utilities; a copied `prose.css` that read the missing focus-ring keys gaining visible outlines;
  and `check:cairn` printing advisory public-scope findings, and failing with the named message
  when a peer is missing. Pass B's entry stays as pass B wrote it.
- **`docs/extend/migration-notes.md`** and **`upgrade-cairn.md`**: the swap, with the import's
  position (after `tailwindcss`, before `prose.css`); the changed defaults; a `paletteFiles` entry
  that names the old copy; the two optional peers; the public scope's default roots with the
  named-root rule; and the template fixes a copied site ports by hand (the skip-link idiom, the
  toggle's `color-scheme` resolution, the radius-token corners, and the heading levers).
- **Facts** for every public behavior the pass changed that tasks 11 and 13 did not file, including
  the three rules' tiers and `previewMarkdown`. `check:facts` green.
- **`check:surface`** is verified current (task 6 regenerated `api-surface.md`; the full gate
  runs it).
- **`docs/internal/engine-rulings.md`** records `public-css-export`, with the corrected Verdict text
  from the fold record's sixth fold (W3). `check:rulings-format` green.
- **`ROADMAP.md`**: the Now entry "Theme identity, passes A, B, and C" leaves the live tiers; the
  "Toward 1.0" tier gains the promotion entry (promote `theme-conformance` and `theme-contrast` to
  error at the first minor cut after all five sites report zero advisory findings from them); the
  draft documentation entry's "waits for C" becomes its resume.
- **`docs/internal/docs-friction-log.md`** triaged, complete-or-move.
- **The dotfiles** (one commit in `~/.dotfiles`): `claude/.claude/agents/cairn-implementer.md` gains
  the line "a built-in public component under `src/lib/public/` carries no literal, uses no daisyUI
  component class, and follows `cairn-public`'s recipe"; `claude/.claude/skills/cairn-release/SKILL.md`
  gains the step that runs the audit's public scope over each of the five sites at every cut and
  records the counts, with its invocation named: in each site's checkout, `npm exec
  --package=@glw907/cairn-cms@<new version> -- cairn-audit`, writing no `package.json` or
  lockfile, and recording the site's `daisyui` and `tailwindcss` versions against the peer
  ranges. `claude-tooling-sync verify` green; the report quotes both lines.
- **`docs/HISTORY.md`**: the pass entry (what landed, what the gates caught, spend against the
  ceiling ruling 1 set, and what a later pass would be wrong to rediscover: the comment-fusion parser trap, the
  `@layer theme` placement and the nesting limit of `@theme` colors, the comma exception in daisyUI
  blocks, the `@source` sentinel, the real-install pack test, and the named-root rule).
- **The plan's post-mortem** appended here, with the pass score (tokens against the ceiling,
  planning misses, execution sittings).

**The merge (conductor, after the close's review):**
1. Re-run the executor check across `main`, pass B's worktree, and `draft-docs-0`.
2. `git fetch`, and merge `origin/main` into `theme-identity-c` if `main` moved; resolve STATUS to
   `main`'s and keep both sides of HISTORY.
3. Re-run `check:facts`, `check:reference`, `check:docs`, `check:vale`, `check:rulings-format`, and
   `check:template` on the merged head, and let CI go green on it.
4. Mark the PR ready and merge `theme-identity-c` to `main`, which lands passes B and C together.
   Close pass B's PR as superseded. Remove both worktrees.

**The release (under the `cairn-release` skill, in the same close):** `npm outdated` at every
manifest (decision 28: the window holds task 0's sweep, so the skill's skip clause applies; a new
minor or patch stops the cut until it lands green through a short branch); the full gate on
`main`, and a red there stops the release, STATUS records `main` as merged but unreleased, and
the fix goes on a branch; `npm view @glw907/cairn-cms versions --json` confirms `0.98.0` is free and the
skill's sizing rule confirms a minor; `npm version 0.98.0 --no-git-tag-version`; the `## Unreleased`
window finalized as `## 0.98.0` with its `<!-- release-size: minor -->` marker; `npm run
emit:template` re-emits the template at `^0.98.0`, closing the window in which the template's range
resolved to `0.97.x`; the release commit lands on `main` by fast-forward; the `test` and
`scaffold` runs on the release commit are watched green; then `gh release create v0.98.0
--target main` with a notes file carrying passes A, B, and C and every `Consumers must:` line; the
publish run watched green and `npm view @glw907/cairn-cms version` serving `0.98.0`. Then the
`cairn-release` step this pass added: the public scope's counts over the five sites, recorded.

**STATUS** (present tense, at or under 60 lines): `0.98.0` published; the theme identity initiative
done; the charter's rule count settled (decision 25); the next action is resuming draft
documentation on `draft-docs-0`, which merges `main` into its branch first; one carry-forward for
cairn-pub's pin bump (take the B and C migration first, then check its links to the renamed
`admin.md` and the new `public-css.md`); the resume prompt.

**Acceptance:** the full gate green on the branch before the merge and on `main` before the cut;
CI green on the release commit; `0.98.0` on the registry; STATUS at or under 60 lines;
`check:facts`, `check:reference`, `check:docs`, `check:vale`, and `check:rulings-format` green on
the final `main`; the pass score recorded.

## Ledger

(written by the conductor at each segment boundary)
