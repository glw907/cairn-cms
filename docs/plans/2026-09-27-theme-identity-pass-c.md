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
probes, and one owner sitting. The close merges B and C (pass A merged to `main` on its own) and cuts the release. Plans specify
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

**Token ceiling:** 29M, flag at 23.2M (80%), per ruling 1 (Geoff, 2026-09-27). The
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
| **Projected total** | **about 24.2M** |

The projection sits about 1.1M above the 23.2M flag and well under the 29M ceiling. On the
itemized order the flag trips around segment D, and the conductor asks the global 80% question at
the next segment boundary as the rule says. The close and the cut never halt on budget once the
merge lands.

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
conductor opens the pass PR against `main` as a draft at task 0's swept head (task 0 item 9), so
`pull_request` CI runs on the sweep alone and on every later push. Pass B's own draft PR, if one exists, is left open and closed as
superseded at the merge.

**The expected-red set:** from the segment B push until S1, `site-visual.spec.ts`
`toHaveScreenshot` mismatches on the ten `styleguide-*` captures fail by design (task 6 changes the
styleguide's sample kit and one sentence). Task 4's report states whether any `admin-visual`
capture shows the editor preview frame's `body` ground; if one does, those captures join the set
from the segment B push. Any capture task 0's dependency sweep moves, named by task 0 item 9's CI
probe on the swept head before task 1 starts, joins the set from that SHA on with the sweep as its
owner; from the segment A push, any capture outside that list is red as usual. Every other
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
  `npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site`
  (task 0 amendment, 2026-09-29: the classifier prints this string at `43e6bff7`; the plan-time string
  was the docs legs joined one by one, which `check:docs-gate` now runs).
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
   `daisyui/theme/object`, plus four computed checks: the `outline-style`, `outline-width`, `outline-color`, and
   `outline-offset` of every focused `cairn-focus-ring` element on the pages it loads; `pre.shiki`'s
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
     never replaces it. Every root the admin scope reads, whether from `static.scope` or
     `static.adminScope`, default or configured, is also excluded from the public scope, whatever
     `public.exclude` says (segment C pre-flight, 2026-09-29). Reason: a consumer that broadens
     `public.scope` to `src` or sets its own `exclude` must not move admin files from the
     error-tier admin rules to advisory `public-literals`; with no overlap possible, "no file answers to two grammars"
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
20. **The pack smoke test is a real install.** `check:audit-pack` (a new script) runs `npm run
    package` first, packs the engine, installs the tarball with production dependencies and
    `--omit=peer` (so the non-optional peers stay out; segment C pre-flight, 2026-09-29) into an
    empty directory under `os.tmpdir()` (outside the repository, removed on exit), verifies the installed `dist/audit` against the pack
    by content hash, and fails if `daisyui` resolves from that directory before the no-peers run.
    Its minimal fixture site carries a `src/theme/theme.css` with one daisyUI block and one clean
    `src/routes/admin/+page.svelte`, so the run reaches peer resolution instead of the public
    scope's empty-scope error or `runStatic`'s "the static scan matched no files" throw (an empty
    static scope with no CSS files, `run.ts:159-163`). The report quotes each run's message. It runs `dist/audit/bin.js` three
    times: the full registry without the optional peers (a nonzero exit and the named message, no
    stack trace); one admin-only `--rule` selection without the peers (a clean run, since the peers
    load only when a selected rule needs them, decision 16's logic); and the full registry after
    installing `daisyui` and `tailwindcss` explicitly (a clean run with a nonzero scanned count).
    It also greps the installed `dist/**/*.d.ts` for `culori` and fails on a hit. Reason: only a real install
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
    `cairn-place-*`). 29 pages (segment D pre-flight, 2026-09-29): 11 directive pages, 1 island,
    `CairnHead` and `PreviewBanner`, 9 composition classes, and 6 prose pages. The coverage gate,
    not this list, is the arbiter: a source it walks that has no page fails.
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
    rendered, and pass B adds `radius-scale`). At the segment D pre-flight (2026-09-29) the
    registries hold 38, 21 static and 17 rendered: 35 audit `/admin`, and the three
    public rules run at advisory tier on a consumer (task 13's amendments carry the sentence). STATUS lists that stale count among Geoff's open
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
    `cairn-audit.config.json` is emitted into `templates/waymark` with its `rendered` block dropped
    by the bake, and baked into every scaffolded site, and a configured root the tree lacks throws, so a `../../src/lib/public`
    root there would break every scaffolded site's `check:cairn` (`create-site.yml` runs it). Task
    7 adds `scripts/checks/public-scope.config.json` (repo-owned, never emitted), which names
    `public.scope` as `src/theme`, `src/chassis`, `src/routes`, and `../../src/lib/public` (the
    showcase lacks the defaults' `src/lib/public` and `src/lib/components`, and a configured root
    the tree lacks throws), and the themeRoots plus
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

1. **Ruled (Geoff, 2026-09-27): the ceiling is 29M, flag at 23.2M.** The review recommended 30M
   (flag 24M); Geoff set 29M. The header carries it. With the projection at about 24.3M, the flag
   trips on plan near segment D, which asks the usual combined question at the next boundary
   rather than halting the pass.

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
  package && node scripts/checks/check-surface.mjs --update` and commits it with the export, so
  CI's `check:surface` step stays green. (`npm run check:surface -- --update` regenerates nothing:
  npm forwards the flag to the script's last command, `check-surface-leaks.mjs`, which ignores it;
  ROADMAP "npm run check:surface -- --update cannot regenerate". The direct form works whether or
  not that fix has merged.) One sanctioned exception: task 2's `./cairn-public.css` export is untyped, so neither
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

1. **Pass A is merged and pass B is finished (topology: pass B branched from pass A's closed
   head and pass C branches from pass B; Geoff ruled on 2026-09-28 that pass A merges to `main` on
   its own after his S3 sitting, overriding the 2026-09-27 ruling that all three merge together, so
   this pass's close merges B and C).** PR #92 is merged and `main` carries pass A. Pass B's
   ledger or STATUS records its close, names its branch and head, and records that its branch
   merged `main` (with pass A) in. Pass B's branch head is green on CI. If any of these fails, stop with one message to Geoff.
2. **No live executor.** Per the global "one executor per worktree" rule: `pgrep -af` on pass B's
   worktree path and on `theme-identity-c` finds nothing, `git status --porcelain` in pass B's
   worktree is empty, and no `theme-identity-c` branch or worktree exists. No executor is live on
   `theme-identity-a` or `draft-docs-0`.
3. **Worktree:** create `.claude/worktrees/theme-identity-c` on a new `theme-identity-c` from pass
   B's branch head; `npm ci`; `npm ci --prefix examples/showcase`; confirm with `realpath` that the
   showcase's `node_modules/@glw907/cairn-cms` resolves into this worktree. Then the dependency
   sweep (decision 28), dispatched to one Sonnet agent under the `dependency-upgrade` skill, which
   commits the bumps and the survey record on the branch. The dispatch carries two constraints.
   When a showcase manifest changes, the agent re-emits with `npm run emit:template` and runs
   `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:template'`, since the template is never
   hand-edited. The skill's refactor decision on each new capability is "file" in task 0: the
   sweep files any refactor and takes none, so nothing unreviewed lands before the equivalence
   capture. Items 4, 7, and 9 run on the swept tree.
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
     `tokens.css`, and `prose.css` and the admin sheet yields 22, 7, 3, and 8 declarations (task 0 amendment; plan time 23, 7, 3, 5) whose
     property carries a comment (plan time).
   - The walkthrough's lines: `resolveTheme` at `examples/showcase/src/chassis/theme-toggle.ts:23-29`
     falls back to `matchMedia`; `app.html:12`'s regex names `cairn-dark|cairn` and cookie
     `cairn-site-theme`; `SiteHeader.svelte:67-73` holds the theme type and config; the skip link at
     `(site)/+layout.svelte:74` hides by `-top-xl`; the seven 2px corners at
     `(site)/+page.svelte:198,229,330`, `archive/[page]/+page.svelte:108`, `ArticleView.svelte:172`,
     `EntryRow.svelte:71`, and `prose.css:154`; the three shape exceptions at `prose.css:302` (the
     diamond marker, `1px`), `prose.css:639` (the video facade, `999px`), and
     `(site)/+page.svelte:274,288` (`--tag-filter-radius: 999px` declared in the route's scoped
     style); the styleguide's hand-written kit in `(site)/styleguide/+page.server.ts` and the "auto-themes
     with your system light or dark setting" sentence at `(site)/styleguide/+page.svelte:156`; the heading
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
   and returns the `gate exit:` line and the tail. It is the only local proof of the swept tree before
   task 1 (pass B's CI proves the unswept head). The conductor quotes it to task 1's reviewer as
   task 0's gate evidence. A red caused by the sweep goes back to the sweep agent once; a stall in
   the serialized component run, or a second red, stops the pass with one message to Geoff.
8. **The release number is still free:** `npm view @glw907/cairn-cms versions --json` lists no
   `0.98.0` (plan time: newest `0.97.0`).
9. **The sweep's CI set.** After item 7's green baseline, the conductor pushes the swept head and
   opens the pass PR against `main` as a draft there. One Haiku probe reads that SHA's CI and names
   each `site-visual` and `admin-visual` `toHaveScreenshot` mismatch; that list is the sweep's
   entry in the expected-red set, recorded in the ledger before task 1 starts. Any other red on
   that SHA goes back to the sweep agent under item 7's rule.

**Acceptance:** the ledger carries items 1 to 9 and the sweep's taken and held versions, and the
plan is amended and committed where item 4 moved a fact. A stop condition in item 1, 2, 4, 7, or 9 halts the pass with one message to Geoff.

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
- The report lists, per file, the fused-declaration count before and after (22, 7, 3, 8 at task 0; plan time 23, 7, 3, 5)
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
  rules stay in its scoped `<style>` block (decision 11). Its `@component` doc says "four custom
  properties" at task 0 (`PreviewBanner.svelte:31-32`) and omits `--cairn-preview-radius`; the doc
  names all five. It uses no daisyUI component class and
  no color literal anywhere, fallbacks included (task 7's public scope scans it). Each
  `cairn-public.css` role it reads carries a daisyUI-variable fallback, so a site that bumps the
  range before adding the import still paints both states legibly. The draft and published states
  stay visually distinct. **The tokens (conductor ruling at the segment B boundary, 2026-09-29):**
  text reads `--color-base-content` in both states; the draft state paints `--color-base-200` with
  a `--color-warning` border and links in `var(--cairn-warning-ink, var(--color-base-content))`; the
  published state paints `--color-base-100` with a `--color-info` border and links in
  `var(--cairn-info-ink, var(--color-base-content))`. These are the contract tokens the e2e names.
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
  Task checks: the port check, quoted; the comments check; the idioms check. (Segment B amendment:
  `check:invisible-craft` deliberately does not scan `preview-doc.ts`, per
  `check-invisible-craft.mjs:16-29`, so `preview-doc.test.ts` is the reset string's only guard.)

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
  either. `npm run package && node scripts/checks/check-surface.mjs --update` regenerates
  `docs/internal/api-surface.md` in the same commit; its diff is the disclosure the reviewer reads.
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
  becomes a one-line reason or a public docs link. At task 0 four remain in the source: the showcase
  `theme/site.css:18` and `:34`, `theme/theme.css:396` (`Verdict 7`; 398 at task 0, moved by tasks 2 and
  3), and `chassis/prose.css:40`. The video facade's shape exception is at `prose.css:638` at segment B.
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
Added at the pre-flight (see the amendments below): `scripts/checks/check-invisible-craft.mjs`,
`scripts/checks/check-admin-css-classes.mjs`, `src/tests/unit/audit-gate.test.ts`,
`src/tests/unit/audit/rules/list-role.test.ts`, `src/lib/public/PreviewBanner.svelte` with its
component test, and `docs/internal/facts/reference.md`.

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
- **The repo-owned config** (decision 27) sets `public.scope` to `src/theme`, `src/chassis`,
  `src/routes`, and the engine's `../../src/lib/public` (never the literal default list: the
  showcase has no `src/lib/public` or `src/lib/components`, and a configured root the tree lacks
  throws), and `public.themeRoots` to `src/theme`,
  `src/chassis/tokens.css`, and `../../src/lib/public/cairn-public.css`. The showcase's own
  `cairn-audit.config.json` does not change. The engine's `src/lib/admin/` is never a public root.
- **The docs:** `cairn-audit.md` gains the rule's entry, the public scope's section with its config
  keys and the named-root rule, and the updated counts; the admin-screens tier map lists the rule
  under "Static, advisory tier".
- **Segment C pre-flight amendments (2026-09-29):**
  - **The audit wrappers.** `check-invisible-craft.mjs` and `check-admin-css-classes.mjs` each
    pass an explicit selection of the non-public-scope rules, so decision 16's empty-scope error
    never fires from them. Their findings stay identical to before.
  - **Existing full-registry tests.** Tests that run the full registry over admin-only fixtures
    pass an explicit admin rule list: `src/tests/unit/audit/run.test.ts` (around :200, :227, :309,
    :380, :484), `src/tests/unit/audit-gate.test.ts:109`, and
    `src/tests/unit/audit/rules/list-role.test.ts:143` (lines re-verified at dispatch). A test
    whose subject is the full registry instead gains a public-scope file in its fixture. The
    static scan's "matched no files" error still fires before the public empty-scope error, so the
    :227 test stays green unchanged.
  - **The count parser.** `run.test.ts`'s static rule-count sentence regex accepts digits or
    hyphenated words, and `NUMBER_WORDS` gains nineteen, twenty, twenty-one, thirty-six,
    thirty-seven, and thirty-eight. This task's counts are 19 static and 36 total, with the advisory
    static count at four (from three).
  - **The "all rules" line.** `docs/reference/cairn-audit.md:31-32` ("All 35 registered rules
    audit the `/admin` surface") is reworded to stay true once public rules register. It keeps
    the "All N registered rules" prefix the test parses.
  - **The tier map.** `skills/cairn-admin-screens/SKILL.md` lists `public-literals` in its own
    sentence of the advisory paragraph, since the new rules carry no promotion version. No
    non-rule backticked token (such as `public.scope`) goes in that paragraph, because its parser
    reads every backticked token there as a rule id. The count sentence at `:20-21` is updated.
  - **The scanned list.** The run report's `filesScanned` includes public-scope files. No new CLI
    flag is added to expose it.
  - **The `font` shorthand.** `public-literals` counts an absolute size inside the `font`
    shorthand as an absolute font size. `src/lib/public/PreviewBanner.svelte:97` (`font:
    0.9375rem/1.4 ...`) therefore changes to a relative (`em`) size in this task. A
    `color-mix(... black ...)` inside a custom-property definition in `cairn-public.css` is a token
    definition under a theme root, and is legal.
  - **Admin roots.** Every root the admin scope reads, from `static.scope` or
    `static.adminScope`, default or configured, is excluded from the public scope (decision 6).
  - **The facts container.** The fact in `docs/internal/facts/reference.md` (around :346) that
    says pass B implements no separate named-root mechanism "since the public scope arrives with
    the public theme" is rewritten to the new behavior. Its `config.ts` and `run.ts` citations
    that this task shifts are repointed.

**Acceptance:**
- Fixtures, each raising exactly the named finding: `public-literals` flags a `#hex` in a
  `<style>`, an `oklch(` in `style=`, `text-[14px]`, `bg-[#abc]`, a `style:color` directive, and a
  literal custom property outside a theme root. It passes a custom property in a theme component's
  `<style>`, the chassis scale's `rem` steps, `text-sm`, `bg-red-500`, `0.88em`, and the root
  `font-size` clamp.
- A table-driven test covers the detection core per form: each literal form named above flags, and
  `transparent`, `currentColor`, `inherit`, and `unset` do not. A mixed
  `style="color: #abc; width: {w}px"` fixture lands its finding on the right offset.
- A test asserts the two default root sets are disjoint after the default `public.exclude`, and that a root named for one scope leaves
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
  and the rule selected, reports zero `public-literals` findings; the report quotes the count. A
  unit test over the run's report (its scanned file list, `filesScanned`) proves the scan includes
  `../../src/lib/public/PreviewBanner.svelte`.
- `check:invisible-craft` and `check:admin-css-classes` report the same findings as before; the
  report quotes each wrapper's finding count before and after, equal, and lists any file that
  moved scopes.
- A test asserts the `font` shorthand with an absolute size flags. `PreviewBanner.svelte`'s
  component test and `public-preview-tokens.spec.ts` stay green after its `em` change.
- The existing tests named in the Outcome pass with their explicit admin rule lists, and the
  :227 "matched no files" test passes unmodified.
- `npm --prefix examples/showcase run check:cairn` stays at zero findings (the new rule runs there
  under the public defaults), and a scaffolded site's advisory findings do not fail
  `create-site.yml`'s `check:cairn`.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the idioms check; the
  comments check; the audit wrappers; the package check (the skill budget and tier map);
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts'`; the showcase set.

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
- **Segment C pre-flight amendments (2026-09-29):**
  - **An unresolvable import.** An `@import` whose package target cannot be resolved is recorded
    as unread in the report. It never raises a finding and never fails the run. Resolution follows
    the package's `exports` map under the `style` condition, and falls back to the file path when
    the package has no `exports` field. Import modifiers such as `layer(...)` and `source(...)` are
    tolerated.
  - **Counts and tier map.** `run.test.ts`'s pinned counts move to 20 static and 37 total, with the
    advisory static count at five. The
    admin-screens tier map lists `theme-conformance` in the advisory paragraph's separate
    new-rules sentence (task 7's), with no non-rule backticked token, and its count sentence at
    `:20-21` is updated.
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
- Fixtures: an `@import` of an uninstalled package is recorded
  as unread with no finding; a package with no `exports` field resolves by file path; an `@import`
  carrying `layer(...)` or `source(...)` resolves. The overlay run over `examples/cairn-theme`
  (which imports the uninstalled `@fontsource-variable/fraunces/opsz.css`) exits clean.
- `npm --prefix examples/showcase run check:cairn` stays at zero findings, and a scaffolded site's
  advisory findings do not fail `create-site.yml`'s `check:cairn`.
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
Added at the pre-flight (see the amendments below): `scripts/lab/measure-status-inks.mjs` and
`src/tests/unit/alert-ink-contrast.test.ts` (both import `dualGamutRatio` from the retired script
and move to the successor), `docs/internal/public-design-system.md` (around :261 and :374),
`docs/internal/facts/extend.md` (around :233, plus its shifted `package.json` citations),
`docs/internal/facts/admin.md` and `docs/internal/facts/reference.md` (their shifted
`package.json` citations), and culori's type declaration (today `src/tests/culori.d.ts`, moved or
replaced).

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
- **Segment C pre-flight amendments (2026-09-29):**
  - **The retired script's importers.** `measure-status-inks.mjs` and
    `alert-ink-contrast.test.ts` import `dualGamutRatio` from the successor contrast core. The
    `public-design-system.md` references repoint. `check-idioms.test.ts:83`'s
    `'check-public-tokens'` string is updated, or the report explains why it stays (it names the
    npm script, not the file).
  - **culori's type declaration** lives where `npm run check` and `check:package` both pass and no
    emitted `dist/**/*.d.ts` mentions culori.
  - **`check:audit-pack`** follows decision 20 as amended: `npm run package` first, the tarball
    installed with `--omit=peer`, and `daisyui` and `tailwindcss` installed explicitly for the
    third run.
  - **Citations.** The `package.json` line citations in `facts/extend.md`, `facts/admin.md`, and
    `facts/reference.md` that this task's `package.json` edits shift are repointed.
  - **Counts and tier map.** `run.test.ts`'s pinned counts move to 21 static and 38 total, with
    the advisory static count at six. The admin-screens tier map lists `theme-contrast` in the
    advisory paragraph's new-rules sentence, and its count sentence at `:20-21` is updated.

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
- `npm run check` and `check:package` pass with culori's type declaration in its new home, and the
  existing grep of the installed `dist/**/*.d.ts` for `culori` stays clean.
- `npm --prefix examples/showcase run check:cairn` stays at zero findings, and a scaffolded site's
  advisory findings do not fail `create-site.yml`'s `check:cairn`.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the idioms check; the
  comments check; the audit wrappers; the package check;
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:public-tokens && npm run test:reskin && npm run check:audit-pack'`
  (no browser); `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts'`;
  the showcase set.

---

### Task 10: The fixture theme and `test:theme-fixture`

**Pass class:** `paint`. **Spec:** "Proof", the second theme and its harness; "Levers and template
fixes", each harness check; decisions 4, 18, and 19.

**Files:** `scripts/lab/theme-fixture/theme.css` (completed), a new harness under `scripts/lab/`
with its Playwright spec and config, `package.json` (`test:theme-fixture`), `.gitignore`
(`.cairn-theme-fixture-*/`), `scripts/lab/reskin-fixture.mjs` (the fixture as a third case),
`scripts/checks/check-public-scope.mjs` (the fixture variant), and `.github/workflows/design.yml`.
The pre-flight changed how the fixture variant runs (see the amendments below); it adds no file.

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
- **Segment D pre-flight amendments (2026-09-29):**
  - **The fixture's import and its variant (G1, conductor chose (a)).** The fixture `theme.css`
    carries the in-place import `@import "../chassis/tokens.css"`, which resolves at the harness
    copy's `src/theme/theme.css` (the showcase's own `theme.css:90` carries the same line). The
    fixture has no `@import` today. `check:public-tokens`'s fixture variant runs over a temporary
    copy the harness makes, with the variant's `public.scope`, `themeRoots`, and `stylesheets`
    retargeted at that copy. The existing variants (`check-public-scope.mjs:37-38`) run
    unchanged.
  - **The theme-owned tokens (G6).** The fixture defines the tokens the styleguide and chrome read
    with no chassis default: `--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`,
    `--cairn-cta-btn-bg`, `--cairn-cta-btn-content` (read at the styleguide's `+page.svelte:729-754`),
    and `--cairn-caption-tracking` (read at `SiteHeader.svelte:162`). No `--tracking-caption` key
    exists or is added. The square corner ladder already sits in the fixture's daisyUI blocks
    (`theme.css:34-36` and `:71-73`), and the `--radius-box` mutation targets those lines. The
    custom token needs both its definition and a reader the fixture adds. The nested `data-theme`
    assertion relies on `cairn-public.css`'s `:root, [data-theme]` role selector (`:21-22`), the
    selector the nesting mutation edits.
  - **The CI slot (G4).** In `design.yml`, `test:theme-fixture` runs after the Chromium install
    step (`:48`, `playwright install --with-deps chromium`), not beside `check:public-tokens` and
    `test:reskin` at `:43-44`. The template arm needs the network for its registry dependencies.
  - **`check:close` (G5).** `test:theme-fixture` follows `test:reskin`'s precedent and stays out of
    `check:close`: it needs a browser and the network. Decision 4 already runs both arms as task
    checks in this task and at the close. This is the named exception to the global constraint
    that a check added to CI goes into `check:close`.

**Acceptance:**
- Both arms pass locally and each assertion above appears by name in the spec. The report quotes
  the run and states that the temporary copy and the preview server were removed and stopped.
- Mutations (each reverted): setting the fixture's `--radius-box` to `0.5rem` fails the corner
  assertion; removing `[data-theme]` from `cairn-public.css`'s role selector fails the nesting
  assertion; dropping the `@source` line in the template arm's installed copy fails the sentinel.
- One run of each probe mode passes: `--build-only` with `--theme-dir` pointed at Waymark's
  `src/theme`, and the template arm's `--probe` on a styleguide element, reporting its color and
  radius under both themes.
- `check:public-tokens`'s fixture variant reports zero findings over the harness's temporary copy
  (the Segment D amendments); the report quotes the fixture run's scanned count and per-scheme pair
  count, and states that the copy was removed.
- The fixture defines the six theme-owned tokens the Segment D amendments name, and its custom
  token has both a definition and a reader in the fixture.
- `design.yml` runs `test:theme-fixture` after the Chromium install step, and `check:close` does
  not gain it (the Segment D amendments).
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
`docs/reference/render.md` (the emitted-class registry),
`src/tests/unit/cairn-public-surface.test.ts`, and facts bullets in `docs/internal/facts/`.
Changed at the pre-flight (see the amendments below): `docs/reference/public.md` leaves the list,
since task 4 already wrote `PreviewBanner`'s styling there, and
`scripts/checks/reference-coverage.mjs` (the `/cairn-public.css` exclusion's reason) joins it.

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
- Facts bullets for the contract's public behaviors: the `cairn-public.css` export, the derived
  defaults and their changed values, and the nesting limit.
- **Segment D pre-flight amendments (2026-09-29):**
  - **`PreviewBanner`'s page is already done (M1).** `docs/reference/public.md:45-53` already
    carries `PreviewBanner`'s token styling and its five override properties, written in task 4.
    This task only checks that the text still holds against the component; it writes no
    `public.md` outcome. `PreviewBanner`'s facts are task 4's `f:xssf06` and `f:6q5q05`, so no
    new `PreviewBanner` bullet lands here.
  - **The `/cairn-public.css` exclusion stays (M2, conductor chose (a)).** The
    `SUBPATH_EXCLUSIONS` entry for `/cairn-public.css` in `reference-coverage.mjs` (`:544-548`)
    stays, since `checkOne` throws on a missing `.d.ts` (`:748-749`) and a CSS asset has none.
    Its reason is rewritten to say the subpath is a CSS asset with no `.d.ts` to enumerate, and
    that its page, `docs/reference/public-css.md`, is held by
    `cairn-public-surface.test.ts`'s page-sync assertions. The snapshot test adds an assertion
    that the page exists.
  - **The docs gate (G7).** The gate adds `npm run check:docs-gate`, which includes
    `check:symbols` and `check:snippets`; the new page meets both.

**Acceptance:**
- The snapshot test passes and fails on a planted key missing from the page and a planted extra key
  on the page (mutation ledger). It asserts that `docs/reference/public-css.md` exists.
- The `/cairn-public.css` entry stays in `SUBPATH_EXCLUSIONS` with the rewritten reason, and
  `check:reference` passes (the Segment D amendments).
- `public.md`'s `PreviewBanner` text matches the component's five override properties and token
  defaults; the report states the check and changes nothing on the page unless it has drifted.
- `gateTier: "targeted"`, `gate`:
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:facts && npm run check:arm-indexes && npm run check:docs-gate && npx vitest run --project unit src/tests/unit/cairn-public-surface.test.ts`.

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
Added at the pre-flight (see the amendments below): a compile test proving the `.claude/`
exclusion (its location is the implementer's), and, only if that test fails, the chassis
`tokens.css` in `examples/showcase/src/chassis/` with its re-emitted template copy.

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
- **Segment D pre-flight amendments (2026-09-29):**
  - **The shipped-skill list (M3).** `docs/reference/guidance.md`'s `## The three skills` (`:110`)
    becomes `## The four skills`, with a fourth bullet for `cairn-public`. The `install` section at
    `:20-25` already says "every directory the package ships under `skills/`" and stays.
  - **The engine built-ins (G2).** `RESERVED_DIRECTIVE_NAMES` in `src/lib/render/registry.ts`
    (`:158`) is private, and this task changes no `src/lib` file. The coverage gate therefore names
    the built-ins `figure` and `include` directly, and asserts, by reading that source, that its
    list still equals the engine's set, so an added built-in fails the gate.
  - **Counting directives (G3).** The gate counts directives from the showcase registry's component
    list, never only from `previewMarkdown` output, so a directive with no preview (`alert` today)
    still needs its catalogue page.
  - **The page count.** Decision 22's list comes to 29 pages: 11 directive pages, 1 island,
    `CairnHead` and `PreviewBanner`, 9 composition classes, and 6 prose pages. The gate stays the
    arbiter.
  - **The CI and `check:close` slot.** `check:public-skill` runs in `test.yml` after the showcase
    `format:check` step (`:96`), and in `check:close` after the showcase `format:check`, before
    `check:vale`.
  - **The `.claude/` exclusion (G8).** The template chassis `tokens.css:55` declares
    `@source not "./.claude"`. Tailwind resolves that path relative to the CSS file, so it may not
    exclude the project-root `.claude/`, where this task ships the skill's snippets. A compile test
    proves that no utility used only in `.claude/skills/cairn-public/**` reaches a scaffolded
    site's compiled CSS. If one does, the fix changes the chassis `@source not` path so it excludes
    the root `.claude/` directory; the showcase copy carries the fix, and the template re-emits to
    match. `guidance.md`'s `.claude/` exclusion section (`:126`) stays true either way; the report
    says whether it needed an edit.

**Acceptance:**
- `check:public-skill` passes, and its unit tests prove each assertion fails on a planted gap: a
  directive with no page, an uncompiled class in a snippet, an unresolved token, and an empty parse.
- Two more planted gaps fail the gate (the Segment D amendments): a registry directive with no
  `preview` and no page, and an engine built-in added to the gate's list but absent from
  `registry.ts` (or the reverse).
- A compile test proves that a utility used only under a scaffolded site's
  `.claude/skills/cairn-public/**` does not reach its compiled CSS. If the test first fails, the
  report names the `@source not` fix, and the showcase and template `tokens.css` match after the
  re-emit.
- `guidance.md` carries `## The four skills` with a `cairn-public` bullet.
- `check:public-skill` sits in `test.yml` and `check:close` at the positions the Segment D
  amendments name.
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
Added at the pre-flight (see the amendments below): `docs/internal/facts/front-door.md`
(`f:xh2mwb`), `docs/internal/facts/extend.md` (its named bullets), and two stale extend pages,
`docs/extend/animate-a-custom-screen.md` and `docs/extend/what-the-scaffold-wrote.md`, fixed
under the frozen-page deficiency rule.

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
- **Segment D pre-flight amendments (2026-09-29):**
  - **The charter line (M4).** The registries hold 38 rules: 21 static and 17 rendered. The
    sentence at `what-cairn-is-and-is-not.md:49-51` ("all 34 registered rules (17 static, 17
    rendered) audit the `/admin` surface") is rewritten to stay true: 35 of the 38 registered rules
    (18 static, 17 rendered) audit the `/admin` surface; the other three,
    `public-literals`, `theme-conformance`, and `theme-contrast`, audit a site's public files under
    the public scope and run at advisory tier on a consumer. The sentence makes no error-tier claim
    for the 35, since some `/admin` rules report at advisory tier (`log-event-grammar`,
    `log-secret-field`, `form-font-parity`, and arms of `stock-default-hazards`). The bullet's heading ("ships whole, as
    consumer product") stays. Fact `f:xh2mwb` (`facts/front-door.md:178`) mirrors the new sentence
    and its repointed line citation. The executor reads the facts key-phrase rule
    (`docs/internal/facts/README.md:45-53`) before editing this owner-tier bullet, and keeps its
    key phrase verbatim in the charter.
  - **`design-your-site.md` beyond the three named sentences (M5).** Each fix is mirrored in its
    fact:
    - `:22-27`: `--color-muted` and `--color-card-border` now come from the engine's
      `cairn-public.css` (`:59-60`), not `tokens.css`. `tokens.css` still holds `--font-*`,
      `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, `--container-measure*`, and
      `--font-weight-heading`.
    - `:37-39`: the ink warning holds only when a theme overrides an ink, since the engine derives
      each ink from its fill at 50 percent.
    - `:41-48`: the `check:public-tokens` description and "Neither ships". The three public rules
      ship in `cairn-audit`, and the scaffold's `check:cairn` (`templates/waymark/package.json:16`)
      runs it; `check:public-tokens` and `test:reskin` themselves do not ship. The copy-the-scripts
      sentence is corrected to match.
    - `:52-55`: the styleguide's directive list. The route now renders every registered directive
      from the registry (`styleguide/+page.server.ts:97-102`: a sample per entry that declares a
      `preview`, the rest listed by name), so the hand-written list goes. This is fact `f:bdnzcy`.
  - **`public-design-system.md` (M6).**
    - The ink rule at `:52-55` and `:253-255`: each status carries a fill and an on-surface ink;
      the ink follows the fill, derived in `cairn-public.css` as `color-mix(in oklab,
      var(--color-<status>) 50%, var(--color-base-content))`; a theme hand-tunes an ink only by
      overriding `--cairn-<status>-ink` in its daisyUI block, and only then retunes fill and ink
      together.
    - `:92-97`, the `:root` customs list: the inks, `--color-muted`, `--color-card-border`, and
      `--cairn-shadow` now live in the engine's `cairn-public.css`.
    - `:199-201`: the focus-ring keys moved from `chassis/tokens.css` to `cairn-public.css`.
  - **The chassis README (M7, G10).**
    - "The token system" (`:69-82`) is rewritten: `tokens.css` imports
      `@glw907/cairn-cms/cairn-public.css` right after Tailwind (`tokens.css:51-52`); the engine
      owns the roles (the status inks, the shadow, the focus ring, the code ramp, `--flow-space`,
      `--color-muted`, `--color-card-border`); a theme overrides one in its `:root` or daisyUI
      block; the CTA keys and `--cairn-caption-tracking` stay site-owned with no chassis default.
    - The spacing trap (`:84-94`) names the five keys `--spacing-3xs`, `-2xs`, `-xs`, `-xl`, and
      `-2xl`, which collide with Tailwind's `--container-*` keys (`max-w-3xs`, `2xs`, `xs`, `xl`,
      `2xl`). The "Tailwind 4.3.2" version is dropped or updated to the installed one.
    - The directive-class sentence (`:55-59`) is corrected against the `render.md` registry task
      11 writes: directive classes are emitted by the theme's `markdown-components.ts`, and a theme
      may rename them; `.card` is not a directive, and the chassis primitive is `.cairn-card`. The
      engine-fixed emitted names are `figure` with `cairn-place-*`, `.table-scroll`, `pre.shiki`
      with `.cairn-tok-*`, and `include`. The prefix list's ownership wording (`:50-53`) is checked
      against the same registry.
    - A new custom-property namespaces paragraph states the naming rule: daisyUI's names for
      daisyUI's keys, a Tailwind namespace for a utility-bearing key, `--cairn-*` for every other
      role, and `--flow-space` grandfathered. The existing "Class namespaces" section (`:47`)
      covers classes only. The template re-emits.
  - **Facts (M8).** In `facts/extend.md`:
    - `f:ylmc9c` (`:232`) is rewritten: the engine derives each ink from its fill at 50 percent,
      so retuning a fill retunes its ink; only a theme that overrides an ink must retune both. It
      cites `cairn-public.css:40-43`.
    - `f:iel6v5` (`:230`): its `--color-muted` citation repoints to `cairn-public.css:59`, and its
      claim follows the `:22-27` fix.
    - `f:xv2ien` (`:233`): the trailing "neither ships in a scaffolded site's own `package.json`"
      is fixed as the `:41-48` fix states.
    - `f:bdnzcy` (`:234`) is updated for the registry-driven styleguide.
    - `f:kt0epf` (`:231`) stays.
  - **Stale extend pages (the frozen-page deficiency fix rule).** These fixes follow the extend
    track's drafting brief with no register polish, and Vale's error tier runs over them:
    - `animate-a-custom-screen.md:125-127`: `static.adminScope` defaults to `src/routes/admin`,
      `src/lib/admin`, and `src/lib/admin-toolkit` (`src/lib/audit/config.ts:28`).
    - `what-the-scaffold-wrote.md:137`: `theme.css` is layered over the engine's `cairn-public.css`
      roles and the chassis's generic defaults.
    - `what-the-scaffold-wrote.md:159`: the styleguide renders every registered markdown
      component from the registry, the type scale, and the component recipes.
    - `what-the-scaffold-wrote.md:171`: "base design tokens" becomes base design tokens that
      import the engine's `cairn-public.css`.
    - The tree at `what-the-scaffold-wrote.md:19-92` gains `.claude/skills/` with its four skills
      (`cairn-public` included), and the "The tree above is complete" sentence (`:99`) is
      corrected to match.
    - `facts/extend.md` carries a bullet for each fix: `f:n2skkz` (`:450`) is reworded if the
      tree fix affects it, and new bullets land as needed.

**Acceptance:**
- `grep` finds none of the three superseded sentences on `design-your-site.md`, and the README no
  longer holds "share a suffix with three of Tailwind's built-in" (the plan-time wording).
- `grep` finds none of these on the named pages: "all 34 registered rules" in the charter or
  `facts/front-door.md`; "(callout, alert, video" on `design-your-site.md` or in `facts/extend.md`;
  "retuning BOTH the fill" in `public-design-system.md`; "defaults to `src/routes/admin` and
  `src/lib/admin-toolkit`" on `animate-a-custom-screen.md`; and ".card`) is engine-fixed" in the
  chassis README.
- The charter and `f:xh2mwb` both state 38 registered rules, 35 on `/admin` and the
  three public rules at advisory tier; `check:facts` and `check:provenance` pass with the key
  phrase intact.
- The README carries the custom-property namespaces paragraph, and the template's copy matches
  after the re-emit.
- `gateTier: "targeted"`, `gate`:
  `npm run check:docs && npm run check:vale && npm run check:facts && npm run check:provenance && npm run check:chassis-boundary && npm run check:template`.

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
`code-simplifier` and commits; if it changed a typed declaration, `npm run package && node
scripts/checks/check-surface.mjs --update` runs and its diff joins that commit. Then the full gate on that commit, in one gate
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
- **An outline input for the docs rebuild** (Geoff, 2026-09-28): facts carry atomic claims, and
  the draft docs stages also need page-level intent. Write
  `docs/internal/record/<date>-theme-contract-docs-input.md`, an outline input for draft docs
  stage 2 (extend) and stage 5 (the front door), in the form the draft docs approach spec
  (`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`) takes outline inputs. It
  covers passes A, B, and C together: each narrative page the theme work creates, changes, or
  retires (at least `design-your-site.md`, a theme-building task guide if the contract warrants
  one, and the custom admin screen pages the `./admin` and `./public` split touches), each with
  its reader, its job, its page type, and the fact ids it rests on. It also states what the
  `cairn-public` skill teaches and what the docs teach, so the two neither duplicate nor
  contradict, and it lists the frozen-page fixes this pass made in place, which the rebuild must
  keep. The close's STATUS entry names the file as a stage 2 input.
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
1. Re-run the executor check across `main`, pass A's and pass B's worktrees, and `draft-docs-0`.
   Confirm Geoff's S3 sitting on pass A is recorded in pass A's ledger, and that any S3 corrections
   landed on `theme-identity-a` have merged forward into pass B and this branch.
2. `git fetch`, and merge `origin/main` into `theme-identity-c` if `main` moved; resolve STATUS to
   `main`'s and keep both sides of HISTORY.
3. Re-run `check:facts`, `check:reference`, `check:docs`, `check:vale`, `check:rulings-format`, and
   `check:template` on the merged head, and let CI go green on it.
4. Mark the PR ready and merge `theme-identity-c` to `main`, which lands passes B and C together.
   Close pass B's PR as superseded. Remove the pass B and pass C worktrees.

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

### Task 0 (2026-09-29, conductor `cairn-cms-02`)

1. PR #92 (pass A) merged 2026-09-29. Pass B finished on `theme-identity-b` at `8c3caea2` (draft PR
   #95), green on all six CI workflows, and carries `main` through `1056432d` (it lacks only
   `d033af97`, a STATUS-only commit). Holds.
2. No live executor: no process on either worktree, pass B's tree clean, no `theme-identity-c` before
   this session. Holds.
3. Worktree `.claude/worktrees/theme-identity-c` on `theme-identity-c` from `8c3caea2`, with
   `theme-c-plan` merged in (`3f63d75f`). Showcase `node_modules/@glw907/cairn-cms` resolves into
   the worktree. Sweep `43e6bff7` (record `docs/internal/record/2026-09-29-theme-pass-c-dependency-sweep.md`):
   taken daisyui 5.7.44 to 5.7.46, wrangler 4.137.0 to 4.143.0, `@cloudflare/workers-types`
   5.20260923.1 to 5.20260929.1, vite 8.3.0 to 8.3.1, `@anthropic-ai/sdk` 0.128.0 to 0.129.0,
   `@lezer/common` 1.5.3, `@lezer/highlight` 1.2.5, `@lucide/svelte` 1.48.0, `@types/node` 24.19.0,
   `typescript-eslint` 8.71.0; Tailwind stays 4.3.3. Held majors: devalue 6, TypeScript 7, Vitest 5,
   `@types/node` 26, and a new one, eslint-plugin-jsdoc 65 (for Geoff at the next checkpoint).
   `npm audit`'s seven pre-existing dev-only findings take only a `--force` downgrade, so they are held.
   The target-stack table drift the sweep caused is fixed at `e5797f7a`.
4. Pre-flight: every fact holds except the comment-fusion counts (now 22, 7, 3, 8), the styleguide
   paths (under `(site)/`), and the four template citations (listed in task 6). Pass B did not
   build the named-root rule's public half, as expected, since decision 6 is this pass's. The
   `PreviewBanner` doc comment says four properties; task 4 carries it. Amended at `4274bf74`.
5. The engine string moved to
   `npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site`
   (amended under Gates).
6. Freeze rule on the branch: the narrative arms are frozen against rewrites until each arm's own
   stage merges, and a discovered deficiency is fixed on the page. A peer session reports Geoff's
   2026-09-28 amendment, under which the arms are harvested and then deleted after the `0.98.0` cut,
   so `0.98.0` ships today's docs.
7. Baseline: the first run went red only on the sweep's target-stack drift, which was fixed. The rerun
   had `check:docs-gate`, `check`, and `test:node-projects` green (5370 tests), `test:component`
   green (1769 passed, 2 skipped), and create-cairn-site red on 5 tests because its template was
   not baked. `npm ci` does not run the workspace's `prepack`, so a fresh worktree must run
   `npm run prepack -w packages/create-cairn-site` first. After the bake, that leg printed
   `gate exit: 0 (log: /tmp/cairn-gate-1000/ec52d0463c639d04/gate.log, 857 lines)`.
8. `0.98.0` is free (newest `0.97.0`).
9. Draft PR #97 opened at `e5797f7a`. All six workflows are green there, so the sweep adds nothing
   to the expected-red set.

A peer session (style-guide-sync) touches `docs/internal/public-design-system.md`,
`docs/internal/facts/extend.md`, and `ROADMAP.md` and will merge to `main` first. This branch merges
`main` only after that lands.

Spend: about 0.43M in subagents plus the conductor.

### Segment A (tasks 1 to 3), boundary 2026-09-29

- **Task 1** accepted, no fix round (`6c13bcb8`). Fused declarations 22, 7, 3, 8 before, 0 after. The
  fix surfaced no finding. Non-blocking: an empty-string comment replacement can join tokens
  (`1px/**/2px` reads `1px2px`); the regression case ends a theme block at the first `}`.
- **Task 2** accepted, no fix round. Expectation commit **`913523e0`** (81 keys, 29 focus elements, 11
  element checks per state, no empty key); the move is `900a188f`. Deferred to later tasks:
  `scripts/checks/reference-coverage.mjs:543` excludes `./cairn-public.css` so the coverage check
  passes, and task 11 removes the exclusion when it adds `public-css.md` (the plan's claim that an
  untyped export is invisible to `check:reference` was false). `cairn-public-surface.test.ts`
  widens the reader roots to all of `examples/showcase/src`, since `--cairn-focus-ring-radius` has
  readers only in theme chrome. The chassis README's override-seam paragraph is stale and goes to
  task 13.
- **Task 3** escalated once, then accepted after two fix rounds (`6c164b25`, `763b9418`, `7978e9a0`).
  All four inks take `N` = 50, with warning on Waymark light `base-200` the narrowest margin at 4.89.
  Decision 2's muted rule could not choose a value, because pass count rises monotonically to
  `M` = 100, which is `base-content` itself. **Conductor ruling:** muted takes the lowest `M` that
  meets the hard constraint and passes at least as many themes as the best chosen ink
  (success, 34/39). The reason: the inks accept failures only because their chroma floor forces
  them, and muted has no such force and is body-size text. The ruling gives `M` = 80 (37/39;
  retro and valentine fail). The first round applied the ruling's misstated "lowest" wording and got
  70. That was the conductor's error, corrected in round two. The fix rounds also repaired task 2's
  stale `theme.css` comments.
- **Boundary merge:** `main` at `dc9bb99b` (style-guide sync, PR #98) merged in (`1fb24faa`). STATUS
  took `main`'s version, HISTORY kept both sides, and the register adopted `main`'s structure with our
  component-names additions re-homed. `70322977` repoints five `facts/extend.md` citations. Fact
  `f:ylmc9c`'s claim (re-tuning a fill without its ink desyncs code colors) holds now only when a
  theme overrides an ink, so task 13 rewrites it.
- **Gap found:** targeted gates omit `check:facts`, and task 2 emptied a cited line range with nothing
  catching it. From segment B on, a task that moves or deletes source lines runs
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts'` as a task check.
- **Segment B pre-flight:** two lines moved (`theme.css:396`, `prose.css:638`), and one claim was wrong:
  `check:invisible-craft` does not scan `preview-doc.ts`. Task 4 named no banner tokens; the conductor
  ruled them (task 4's outcome). No `admin-visual` capture shows the preview frame, so task 4 adds
  nothing to the expected-red set.
- **Batched notes:** none acted on mid-segment. The over-long comment lines at `theme.css:15` and
  `measure-status-inks.mjs:22` are cosmetic.
- **Spend:** segment A's workflow 0.67M. The fix rounds, reviews, merge, and pre-flights came to
  about 0.45M. The running total is about 1.6M plus the conductor.

### Segment B (tasks 4 to 6), boundary 2026-09-29

- **Task 4** accepted after an escalation, with no fix round (`50607df7`). `PreviewBanner` reads the
  tokens the conductor ruled at the boundary, and the preview reset paints
  `var(--color-base-100,#fff)`. The escalation was environmental: another project holds port 4173
  on this workstation, `examples/showcase/wrangler.jsonc` pins `PUBLIC_ORIGIN` to `:4173`, and
  `preview.spec.ts` follows the minted absolute URL, so its eight tests 404 locally. With the origin
  matched to the run port, all 15 passed. The reviewer found no code defect. CI proves it at the
  segment B push. The new spec navigates by pathname. The task also fixed the stale banner docs
  (`share-a-draft-preview.md`, `reference/public.md`, facts `f:xssf06` and `f:6q5q05`).
- **Task 5** accepted, no fix round (`c8ac9926`). It adds the heading levers, the toggle's
  `color-scheme` resolution, and `theme-names.ts` with five fired mutations. `--cairn-heading-case`
  lives in `@layer theme`.
- **Task 6** accepted, no fix round (`16d387b1`). It exports `previewMarkdown`, renders the
  styleguide from the registry, and covers the skip link, the radius sweep, the citation scrub, and
  the `check:template` gate. The registry-driven styleguide dropped the expired banner that
  `islands.spec.ts` and `reading-surface-edge-cases.spec.ts` asserted. The first spec was updated;
  the second's case moved to a showcase unit test (`banner-component.test.ts`).
- **To task 14 (settle):** (1) `composition.css:87` `.cairn-hero-title` reads the heading levers;
  (2) `alert` gains a `preview`, so the styleguide shows its tones again; (3) an engine unit test
  restores the proof that an island's `data-cairn-props` reflects a `ctx.attributes` its `build()`
  cleared, the coverage the removed e2e held.
- **No action:** the members, login, `probe-craft`, and error h1s are fixtures, not template chrome.
  `--site-banner-radius` is a token definition under a theme root.
- **Async glance:** published at https://claude.ai/artifact/LsMc4YYFRNbMpnVfXtqXk7. Geoff replied
  "The theme identity page looks great", so S3 has no correction from segment B.
- **Expected-red set from the segment B push:** the `site-visual` `styleguide-*` captures (as
  planned). No `admin-visual` capture shows the preview frame.
- **Segment C pre-flight** found 15 gaps and two moved lines, amended at `e7562f82` under conductor
  rulings. The main ones: the audit wrappers select admin rules only; admin-fixture tests pass
  explicit rule lists; the count regex widens; `PreviewBanner`'s `font` shorthand moves to `em`; two
  more readers of the retired script; `check:facts` on tasks 7 and 9; unresolvable package imports
  count as unread; and `check:audit-pack` installs with `--omit=peer`.
- **Open for Geoff:** take eslint-plugin-jsdoc 65 (the conductor recommends taking it).
- **Spend:** segment B's two workflow runs 0.68M; boundary agents about 0.5M. Running total about
  3.2M plus the conductor.
- **Segment B CI (`16d387b1`):** five workflows green; e2e red on the ten planned `styleguide-*`
  `site-visual` mismatches plus `spellcheck.spec.ts` (0 of 2 underlines). A failed-job rerun passed
  `spellcheck.spec.ts`, so it is a flake. `styleguide — dark — 2560px` mismatched and then timed
  out on its retries; it stays in the expected set, and S1's regenerated baseline must render it
  cleanly. `preview.spec.ts` passed on CI, confirming task 4's environmental reading. The boundary
  passes.

### Segment C (tasks 7 to 9), boundary 2026-09-29

- **Task 7** accepted, no fix round (`6ffe6136`, `607f1474`). The shared detection core is
  `src/lib/audit/literals.ts`, and `StaticRule.publicScope` marks a public rule. One scope per file
  holds by construction (`config.isPublicFile`); `static.cssFiles` entries are admin-claimed too. The
  wrappers' finding counts are equal before and after (0/0/0). `check-symbols-allowlist.mjs` gained
  `src/chassis/tokens.css`.
- **Task 8** accepted, no fix round (`954366c2`). `src/lib/audit/import-chain.ts` is the loader.
- **Task 9** (Opus) accepted, no fix round (`12e575a8`). Its transcript passed the 1.8MB guard limit.
  The tail showed varied progress, so the guard was re-armed at the `writer` tier and nothing was
  stopped. **Accepted departures:** `check:audit-pack` also installs `svelte`, because
  `markup.ts` imports `svelte/compiler` and `svelte` is a required peer every consumer has, so decision
  20's intent holds. The Chromium comparison accepts one unit in the last printed digit, a culori
  matrix gap of about 1e-5 on sRGB operands.
- **To task 14 (settle):** (4) remove the SKILL.md tier map's promise to promote
  `theme-conformance` to error tier, which no decision makes; (5) `public-literals` flags color words
  inside quoted strings (`content: "red"`, a font family), a false positive for consumers; (6)
  `cairn-audit.md:101` and `theme-contrast.ts`'s header name only `oklab` for the tint while the
  regex accepts `oklch`.
- **To the close:** the CHANGELOG records culori as a runtime dependency and `daisyui` and
  `tailwindcss` as optional peers. ROADMAP records the edge case where `public.scope` names
  `src/routes/admin` while the non-removable default exclude still drops it.
- **Segment C CI (`12e575a8`):** five workflows green, and e2e red only on the ten planned
  `styleguide-*` mismatches. `check:audit-pack`, `check:public-tokens`, and `test:reskin` all passed
  on CI. The boundary passes.
- **Harvest coordination:** Geoff started the draft-docs harvest audit in a peer session
  (`cairn-cms-c9`). It received the full B and C brief: fact ids, pages, renames, and behaviors. Its
  auditors add only ledgers and facts bullets and defer the pages pass C edits. It deletes nothing
  before this pass merges.
- **Segment D pre-flight:** 8 moved items and 10 gaps, amended at `1eaa539e` under conductor
  rulings. The amender corrected two of the conductor's statements: several `/admin` rules run
  advisory, so the charter sentence makes no error-tier claim, and the styleguide lists
  preview-less entries by name.
- **Unattended run:** Geoff is away from about 10:30 for 6+ hours; the conductor runs through S2
  and stops before S3.
- **Spend:** segment C's workflow 1.37M; boundary and pre-flight agents about 0.9M. The running
  total is about 6.2M plus the conductor.

### Segment D (tasks 10 to 13), boundary 2026-09-29

- **Task 10** accepted, no fix round (`ee4d596b`). The harness is `scripts/lab/theme-fixture.mjs` with
  `theme-fixture-copy.mjs` and `theme-fixture-e2e/`. The fixture passes `theme-contrast` 24 of 24
  pairs in both schemes, including the third `check:public-tokens` variant. `test:theme-fixture` is
  in `design.yml` after the Chromium install and stays out of `check:close`, following
  `test:reskin`'s precedent.
- **Task 11** accepted, no fix round (`b7967ca4`): `public-css.md` and the render registry entries.
- **Task 12** accepted after one fix round (`e220ecc5`, `802cd85f`): the `cairn-public` skill (29
  catalogue pages) and `check:public-skill`.
- **Task 13** needed a conductor decision after one fix round: the chassis README's `cairn-*`
  ownership paragraph still made a false catch-all claim. A combined closing round (`7d4e205c`)
  fixed that paragraph, the `check-public-scope.test.ts` expectation task 10 left at two variants
  (its targeted gate never ran the unit suite), and fact `f:xv2ien`'s third run. The round was
  reviewed and accepted.
- **Segment D CI (`7d4e205c`):** five workflows green, and e2e red only on the ten planned
  `styleguide-*` mismatches. The boundary passes.

### Segment E (S1, S2, task 14), 2026-09-29

- **Task 14 (settle, four runs, no escalation):**
  - (a) `5cee7879`, the seven filed items: the hero title reads the levers, `alert` gains a preview,
    an engine test covers island props after a `build()` clears them, the SKILL.md promotion promise
    goes, `public-literals` skips quoted strings, and two comments are corrected.
  - (b) `bc97de69`, from the S2 probes: `runStatic` reads the admin sheet only when a selected rule
    needs it (a public-only run no longer needs the built admin CSS), plus eight guidance items.
    `cairn-audit.md`'s two advisory rows also drop the promotion promise.
  - (c) `7f44a72b`, from S1: kit headings keep the identifier's case, the faces block names tokens,
    the table cell's code fence renders, the button row is spaced, and the CTA placement line lands.
  - (d) `7a284dfd`, from probe 2b: the theme directory contents, a starter block
    (`references/theme-starter.md`), the audit placement, the rename touchpoint in `app.html`, the dark
    `:root` repetition, and the scale-key defaults.
- **S1:** two CI regenerations (`4ee09e47`, then `a349aa73` after 14c) each rewrote exactly the ten
  `styleguide-*` PNGs. The fresh-context `visual-verifier` returned PASS-WITH-LIST: every baseline
  difference is explained by the registry kit, and the fixture meets the responsive standard at
  1440 and 390 in both schemes with its identity consistent. Its F1, F2, and two pre-existing
  styleguide defects went to 14c, and the conductor confirmed the 14c render on the new baseline.
  F3 (the fixture's wide uppercase nav wraps "ADMIN" at 390) takes no action: it is the fixture's
  own tracking over Waymark's header, and the fixture is not shipped chrome.
- **S2:**
  - Probe 3 (built-in `Notice.svelte`) passed: 0 findings, 113 scanned. `--probe` computed
    Waymark `oklch(0.25 0 0)` / 8px against the fixture `oklch(0.93 0.01 260)` / 0px, each equal to
    its theme's tokens, and the conductor read both screenshots.
  - Probe 2 (new theme) passed only after audit findings the guidance did not prevent (the CTA
    tokens, a one-block ink, a derived warning ink under AA). It also hit the admin-sheet defect.
    The gaps were fixed in 14b.
  - The one sanctioned rerun, probe 2b, passed with 0 findings on its first audit (112 scanned) and
    named six completeness gaps, fixed in 14d.
- **To the close:** the CHANGELOG must not copy the spec's "promote at the first minor cut" promise.
  No decision makes it, and every shipped page now says the three public rules are advisory on a
  consumer.
- **Environment learned:** `/tmp` is a small shared tmpfs. The template arm and the probes need
  `TMPDIR` on disk (the harness header now says so).
- **Spend:** about 9.5M in subagents plus the conductor, against the 29M ceiling. The 80% flag
  (23.2M) did not trip.
- **Ledger-commit CI (`e3bc2f72`):** e2e green (the regenerated baselines cleared the expected-red
  set), but `test` failed on `check:package`: `skills/cairn-public/SKILL.md` estimated 3,595 of 3,500
  tokens. Task 14d's fix round ran the reduced gate, which skips `check:package`. `cbe04847` moved
  the theme-directory list, the audit placement, and the component token mapping into three
  `references/` pages (2,871 tokens), with every docs and skill gate green. **Lesson:** a docs fix
  round that edits a shipped skill must keep `check:package` in its reduced gate.

### S3, the owner sitting (2026-09-29)

- Sitting page: https://claude.ai/artifact/SLyB19JvyxDUXrqWFCWynG (the fixture theme at 1440 and 390
  in both schemes, probe 3's component under both themes, the Waymark styleguide baselines, the
  decided list). Geoff called the glance page and the sitting content great and returned no
  corrections, so task 14 took no S3 run. He approved the held eslint-plugin-jsdoc 65 major ("take
  the plugin") and the merge ("do the merge"). The `0.98.0` cut proceeds under decision 24's standing
  release-path ruling.
- Close pre-merge: the jsdoc bump and the two harvest chores (`a72d52ce`), the simplifier
  (`0c8258d0`) plus the snippet's missed Node pin (`399c8670`), the full gate green at `caddd95f`,
  then three reviews. The Opus audit read found four silent-green defects, fixed test-first in
  `e46bb062`. The Svelte and accessibility folds landed in `e605816a`. The conductor's role-layer
  redeclaration of muted and card-border broke a theme's `@theme` override and was reversed, with a
  guard test (`40a73308`). The close docs are `65d16d41` (dotfiles `b4593f2`). The `0.98.0` audit
  promotions (`log-event-grammar`, `log-secret-field`, the `cairn-btn-guarded` retirement arm) are
  `facc5fcf`, so the version commit keeps `promotion-versions.test.ts` green.

## Post-mortem (2026-09-29)

**What was built.** Tasks 0 to 14 and the close, in five segments plus the settle runs. The
Waymark render did not move: the equivalence expectation (`913523e0`) never changed. The engine
ships `cairn-public.css`, derives its inks and muted from the theme, and mixes the shadow from
`black` (tasks 2 and 3). The template gained the heading levers, the toggle's `color-scheme`
resolution, the skip-link idiom, radius-token corners, and a registry-driven styleguide, and
`PreviewBanner` reads tokens (tasks 4 to 6). The audit gained a public scope and three advisory
rules with optional peers, a real-install pack test, and a packaged `check:public-tokens` (tasks 7
to 9). A fixture theme and its two-arm harness proved the contract (task 10). The reference pages,
the `cairn-public` skill with its coverage gate, and the internal documents followed (tasks 11 to
13). S1 regenerated the CI baselines, S2 ran probes 2 and 3, and task 14 closed four settle runs.
The close reviews then found four groups of silent-green audit defects and Svelte and
accessibility items (the toggle's `only`-prefixed scheme, the banner link's focus ring, nested-region
colors), all folded.

**What the gates caught.** The ledger holds the detail; the short list:

- Task 3: decision 2's muted rule could not choose a value, and its first fix round applied the
  conductor's misstated wording (70, not 80).
- Task 2: a cited range emptied with nothing catching it, because no targeted gate ran `check:facts`.
- Task 4: an environmental 404 (port 4173 belongs to another project), not a code defect.
- Task 10: a `check-public-scope.test.ts` expectation left at two variants, because the task's
  targeted gate never ran the unit suite.
- Task 13: the chassis README's `cairn-*` ownership paragraph still made a false catch-all claim.
- S2: probe 2 passed only after audit findings the guidance did not prevent, plus an admin-sheet
  defect a public-only run hit.
- Ledger-commit CI: `check:package` failed on the skill's token budget (3,595 of 3,500), because a
  fix round ran a reduced gate.
- The close reviews: four groups of audit defects that passed silently, and a role-layer
  redeclaration that made a theme's `@theme` override lose (added at `e605816a`, reversed at
  `40a73308`).

**What a later pass would be wrong to rediscover.** `docs/HISTORY.md`, "Theme identity pass C",
holds the list (the comment-fusion parser trap, `@layer theme` placement and the `@theme` colors'
nesting limit, the comma exception in daisyUI blocks, the `@source` sentinel, the real-install pack
test, the named-root rule, the `/tmp` quota, and the unpromised promotion). It is not repeated here.

**Score.**

- **Tokens:** about 11M against the 29M ceiling and the 23.2M flag (the flag never tripped), from
  task notifications and `/cost`. The plan projected about 24.3M; the pass ran under it. Tasks 3, 12, and
  13 took a fix round; no other task did.
- **Planning misses: 4.** Decision 2's muted rule (pass count rises monotonically to `M` = 100, so
  the rule chose `base-content` itself); targeted gates that omitted `check:facts` (task 2 emptied
  a cited range unseen); a reduced gate that skipped `check:package` (the skill's token budget failed
  on CI); and the pre-flights' gaps (15 at segment C and 10 at segment D, each amended into the plan
  under a conductor ruling).
- **Execution sittings: 2.** One async glance (segment B's artifact, which Geoff answered "The theme
  identity page looks great") and one owner sitting, S3.

**Lessons.**

- A selection rule that lets a metric rise without limit needs a stated stopping condition; state
  the cap in the plan, not in the ruling that repairs it.
- A targeted gate names every gate whose input the task touches: a task that moves source lines
  runs `check:facts`, and a task that edits a shipped skill runs `check:package`.
- A reduced gate is a cost decision, not a scope decision: name what it skips in the fix round's
  prompt.
- An audit that cannot measure a form reports "unmeasured"; a silent pass is the defect the audit
  exists to rule out. The reviews found four groups of it in code the plan's own gates had passed.
- A layer that redeclares a value Tailwind resolves elsewhere changes who wins; test the override
  from the theme's side, not only the default.
- Harness runs need `TMPDIR` on disk here; `/tmp` is a small shared tmpfs.

### The 0.98.0 cut (2026-09-30)

- Released `v0.98.0` (release commit `0655e879`, dev-package alignment `a84a6853`; npm `latest` for
  both packages). The first `test` run failed on `check:dev-package` (the dev package stayed at
  `0.97.0`); the `cairn-release` skill now bumps it and runs the check at the cut (dotfiles
  `b7374d0`). Pre-cut: #100 (`viewport-overflow` timing, 23 and 34 errors before, 0 in five runs
  after) and #101 (patch top-up; daisyUI 5.7.47's theme values identical).
- **Five-site public-scope counts at 0.98.0** (run in scratch copies with daisyui 5.7.47 and
  tailwindcss 4.3.3, since four sites had no `node_modules`; `@fontsource` imports unread):
  | site | public-literals / theme-conformance / theme-contrast | files | promoted-rule errors |
  | --- | --- | --- | --- |
  | ecxc-ski | 27 / 1 / 1 | 110 | 4 `log-event-grammar` |
  | 907-life | 10 / 1 / 0 | 70 | 1 `log-event-grammar` |
  | aksailingclub-org | 41 / 8 / 2 | 507 | 34 `log-event-grammar` |
  | xcathletes-org | 4 / 1 / 0 | 355 | 7 `log-event-grammar` |
  | cairn-pub | 1 / 1 / 0 | 100 | 0 |
  No site carries a `log-secret-field` or `cairn-btn-guarded` error. Each of the four sites with
  `log-event-grammar` errors fails `check:cairn` on upgrading until it renames those events (the
  `Consumers must:` line); each site's upgrade pass takes that. The Toward-1.0 promotion of the two
  theme rules stays gated on all five reporting zero. Raw outputs:
  `/var/home/glw907/.cache/cairn-tmp/scratch/{pub,full}-<site>.txt` (machine-local).
