# Theme identity pass A: plan review, mechanics and feasibility lens

Target: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md` at `c260832f`. Reviewer:
fresh context, mechanics and feasibility only. Every claim below was checked against source or a
probe in this checkout. Findings are ranked by consequence. Counts: 2 blockers, 5 majors, 10
minors, and 1 owner fork, which is inside M1.

## What holds (verified, no action)

- Every npm script the plan names exists in the root or showcase `package.json`:
  `check:custom-surface`, `check:invisible-craft`, `check:admin-css-classes`,
  `update-admin-sheet-inventory`, `emit:template`, `check:template`, `test:reskin`,
  `check:public-tokens`, `check:chassis-boundary`, `norms:generate`, `norms:check`,
  `check:touch-targets`, `check:interactive-contrast`, `check:docs`, `check:facts`,
  `check:reference`, and `check:rulings-format`.
- `pass-execute.js` supports the args the plan uses: `repo`, `gate`, `implementer`, `reviewer`,
  `commonNotes`, per-task `gateTier` and `model` (`implOpts = t.model ? { model: t.model }`), sequential by
  default, one invocation per segment, and `stopOnEscalate` defaulting to true.
- A `gateTier: "engine"` pin really skips admin-visual. `decideGate` returns the pin before the
  paint floor. The engine string is the docs checks, then `npm run check && npm test`, with no
  e2e leg.
- `check:custom-surface` passes at every intermediate commit. The allowlist is exact set
  equality, and `componentsLayerCap` is a ceiling (`>`). Rules 10 to 12 are three allowlist
  entries and rules 13 and 14 are two, so the sequence 18, 15, 13 is right. See m4 for the
  looseness of the cap.
- Every plan-time count in Task 0 item 4 re-counts exactly at HEAD. The counts are 85 matches
  in 17 files, 24 `rounded-full`, 4 ink openers, 1 Publish tint, 5 `shadow-none`, 1
  `type-title font-bold` (at `PageHeader.svelte:59`), 16 `stroke-width="2"`, and 8 style-block
  literals. The `MediaInsertPopover.svelte:426,446` fallbacks and the
  `CairnAdminShell.svelte:1074,1099` badges are where the plan says.
- Both roots define every key in `daisyui/theme/object.js`, so the Task 3 port is a move with
  no invented values. daisyUI's multipliers give the Task 4 heights exactly: `btn` is
  `--size-field * 10`, which is 45px, `btn-sm` is `* 8`, which is 36px, and `badge-sm` is
  `--size-selector * 5`, which is 22.5px.
- Lucide 1.47 renders `class="lucide ..."` and `stroke-width="2"` by default, so Task 7's
  selector reaches it.
- `e2e.yml` has the `update_snapshots` boolean dispatch. It regenerates both visual specs by
  file path and commits the baselines back with `contents: write`. `gh workflow run ... -f
  update_snapshots=true` matches the `== 'true'` comparison.
- The worktree `realpath` check covers the durable gotcha. Every existing worktree's showcase
  `node_modules/@glw907/cairn-cms` resolves to its own tree, and no later task reinstalls.
- The Task 3 mechanism is feasible. Component tests already `?inline` the dist sheet, so a
  project-scoped resolve that redirects `src/lib/components/cairn-admin.css` to `dist` leaves the
  packaged `dist` untouched. CI runs `npm run package` before `npm test`, and the engine tier's
  `check:reference` packages before `npm test`.
- `grammar-tokens.test.ts` keeps finding `[data-theme='cairn-admin'] {` because the plain root
  rule survives. `role-layer-contrast.test.ts` only checks that the oklch literals appear in the
  source, so both pass after Task 3 as the plan says.

## Blockers

### B1. Every pinned task gets a runner-injected blocking MISMATCH

- **Severity:** blocker.
- **Location:** plan:37 (`gate: "npm run check && npm test"`) with plan:86 (paint tasks pin
  `gateTier: "engine"`).
- **Defect:** For a pinned task, `resolveGate` never runs the classifier. It returns
  `t.gate || a.gate`, which is the plan's fallback string. The implementer is told to run
  `gate-tier.mjs --pin engine` and to report that string as `gateCommand`. `reviewPrompt`
  compares the two, and a difference becomes "Treat this mismatch itself as a blocking finding."
  That happens on Tasks 1 to 13 and 15. The first `fix` round mismatches again, the status ends
  `needs-decision`, and `stopOnEscalate` halts the segment after Task 1.
- **Evidence:** `pass-execute.js` resolveGate reads
  `if (t.gateTier) { return { gate: t.gate || a.gate, source: "pin", tier: t.gateTier }; }`.
  A probe replaying the runner's own `gateCore` gave this output:
  ```
  impl: npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts && npm run check && npm test
  resolved: npm run check && npm test
  MISMATCH: true
  ```
- **Fold:** Set `args.gate` to the exact engine tier string that `gate-tier.mjs --pin engine`
  prints. Task 0 item 6 already records it. Task 14 is unpinned, so it resolves through the
  classifier and is unaffected. Alternatively, give each pinned task a `gate` equal to its
  tier's string.

### B2. Task 4's `RATIFIED_NORMS` edit turns `npm test` red until Task 13

- **Severity:** blocker.
- **Location:** plan:395-405 (Task 4 moves `RATIFIED_NORMS` while "the manifest itself
  regenerates in task 13") and plan:74-76 (only the CI norms job is in the expected-red set).
- **Defect:** `src/tests/unit/audit/norms.test.ts`, "the shipped manifest honors its own
  disciplines against the production tables", runs in `npm test`. It holds the committed
  manifest against `RATIFIED_NORMS` in both directions. When a ratified band disagrees with the
  table and the entry is not flagged `ratified-drift`, the test reports a violation
  (`norms.ts:555-561`). The committed manifest carries `button-primary`, `button-ghost`,
  `input-text`, and `select` at `[10]` and `card` at `[16]`, all `ratified` with empty flags.
  Task 4 sets 6 and 8, which gives five violations. The engine gate is then red at Task 4 and at
  every task through Task 12.
- **Evidence:** Probe of `src/lib/audit/norms-manifest.json`:
  `button-primary [10] ratified []`, `card [16] ratified []`, and the same for the other three.
  The source condition is
  `if (!agrees && !entry.flags.includes('ratified-drift')) violations.push(...)`.
- **Fold:** Move the `RATIFIED_NORMS` edit out of Task 4 and into Task 13, beside
  `norms:generate`. The table then changes in the same commit as the manifest it governs. Task 4
  keeps the theme values, and its Files drop `norms.ts`. The CI norms job still stays red from
  Task 4 until Task 13, as planned.

## Majors

### M1. The class inventory breaks Tasks 7, 9, and 10, and the sweep silently drops public classes

- **Severity:** major, with an OWNER FORK.
- **Location:** Task 7 Files (plan:493-496), Task 9 (plan:558-583), Task 10 (plan:589-622), and
  the Task 16 CHANGELOG entry (plan:838-844).
- **Defect:** `admin-sheet-inventory.test.ts` diffs the full class set of the compiled sheet in
  both directions. Task 1 is the only task that regenerates it. Three later tasks drift it:
  - Task 7 adds the class `lucide` (`svg.lucide[...]`), which is not in the fixture.
  - Task 9 retires the last call sites of `shadow-none` (all five sit in the recipes it
    replaces), `hover:bg-[var(--cairn-ink-hover)]` (4 sites), and `hover:bg-primary/15`
    (1 site). It also adds `font-[550]`.
  - Task 10 retires every call site of `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`,
    `rounded-xl`, `rounded-t-2xl`, `rounded-[0.55rem]`, and `rounded-[var(--radius-field)]`.
    All eight are in the committed fixture.

  Each drift turns the engine gate red. The Task 9 and Task 10 drifts are also the issue #12
  failure the inventory exists to stop: consumer admin markup that uses `rounded-lg` silently
  loses its rule. The Task 16 CHANGELOG plans no removal line.
- **Evidence:** The contract comment in `admin-sheet-inventory.test.ts` reads "either direction
  of drift is a failure ... a class may only ever leave ... as a deliberate act carried in
  CHANGELOG.md". Greps of both trees, and `grep -E '^(rounded|shadow-none|...)'` on the
  fixture, list every class named above.
- **Fold:** Add the inventory fixture and `npm run update-admin-sheet-inventory` to the Files
  and acceptance of Tasks 7, 9, and 10. **OWNER FORK:** either (a) put the retired Tailwind
  classes in the compatibility safelist in `admin-css.input.css`, or (b) let them leave and add
  a removal line under Task 16's CHANGELOG entry. Recommendation: (a). It is the repo's standing
  doctrine, it costs a few hundred bytes, and it keeps a consumer's fixed-radius markup
  rendering as before. The spec's point that fixed radii do not follow the ladder stays true.

### M2. "Loses to a utility" tests name utilities the admin sheet does not compile

- **Severity:** major.
- **Location:** Task 2 (plan:321, `shadow-lg`), Task 5 (plan:446-448, `rounded-none`), and
  Task 7 (plan:516-522, `border-error` and `rounded-none` twice). Task 9 removes `shadow-none`,
  which Task 2 relies on.
- **Defect:** The admin build scans only `src/lib/components/**` and `src/lib/admin-toolkit/**`
  (`admin-css.input.css` `@source` lines). Tests under `src/tests` are not scanned, so a utility
  that exists only in a test does not exist in `dist/components/cairn-admin.css`. The rule then
  wins, and the test fails for a compile reason, not a layer reason. Task 2's `shadow-none` case
  passes at Task 2 and then breaks at Task 9, when the last `shadow-none` leaves the sheet.
- **Evidence:** A grep of the current `dist` sheet found `.shadow-none {` but no
  `.shadow-lg`, `.rounded-none`, or `.border-error` rule. `px-2`, `font-semibold`,
  `font-normal`, `bg-base-200`, `rounded-full`, and `text-base-content` are present.
- **Fold:** Have `_idiom-probe.ts` supply a markup utility the way a consumer's own site sheet
  does, as `hostCss` wrapping the utility in `@layer utilities { ... }`. Plain utilities-layer
  declarations beat the `cairn-idiom` sublayer, and the showcase's `.cairn/admin.css` is the
  real case. Alternatively, restrict the tests to utilities the engine compiles. Either way, add
  a rule that no idiom test may depend on a utility the sweep retires.

### M3. Preview servers on port 4173 collide with Playwright's `reuseExistingServer`

- **Severity:** major.
- **Location:** Task 0 item 8 (plan:224-229), Task 13 (plan:721-726), and S1 (plan:769-771).
  Each serves a preview at 4173. Tasks 12, 13, and 15 run heavy e2e task checks.
- **Defect:** The showcase `playwright.config.ts` sets `reuseExistingServer: !process.env.CI` on
  port 4173. Locally, any live server on 4173 is reused without a rebuild:
  - An e2e task check can run against a stale preview, even Task 0's build of `main`, and pass
    or fail on the wrong tree.
  - A preview started outside `cairn-run-gate` holds no machine lock. Another session's e2e
    gate on this machine would silently prove this worktree's server.
- **Evidence:** `examples/showcase/playwright.config.ts:29-35`:
  `command: 'VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173', port: 4173,
  reuseExistingServer: !process.env.CI`. `norms:generate`, `check:touch-targets`,
  `check:interactive-contrast`, and `cairn-audit --rendered` all honor `BASE_URL`.
- **Fold:** Serve every conductor or agent preview on a distinct port (the spike used 4391) and
  pass `BASE_URL`. Stop the preview before any e2e gate. Each e2e task check first asserts that
  4173 is free.

### M4. The hostile equivalence test cannot pass against one expectation file

- **Severity:** major.
- **Location:** Task 3 acceptance (plan:379-382) and Review focus 2 (plan:173-176).
- **Defect:** One `admin-theme-computed.json` is generated bare, and the plan requires zero
  differences from it in both the bare run and the hostile run. The hostile sheet
  `div { font-family: Georgia; ...; color-scheme: dark }` already changes a child `div` today:
  an element rule beats inheritance, and the admin's `@layer base :root` font rule reaches only
  the wrapper. If the child probe is a `div`, the hostile run differs on the child's
  `font-family`, smoothing, and `color-scheme` before any change lands. The spike's
  `equiv.mjs` compared the baseline and the new sheet under the same host sheet, not hostile
  against bare.
- **Evidence:** In `cairn-admin.css:538-545`, the base-layer `:root` maps to the scoped root
  only, and the plain root rule matches the wrapper only. The spike reads "Run
  `node spike/equiv.mjs spike/out/baseline.css <sheet> [hostCss]`" (spike:376).
- **Fold:** Pin two expectations generated before the edit, one bare and one under the hostile
  sheet, and compare each run to its twin. Name the child element's tag either way. A weak
  implementer "fix", such as regenerating the file from the post-change hostile run, would
  remove the test's purpose.

### M5. The regen commit starts no CI run, and the branch diverges

- **Severity:** major. The risk is misreading CI, not a broken build.
- **Location:** S4 (plan:821-830) and Task 16 (plan:834-871).
- **Defect:** The regen job pushes with the workflow's `GITHUB_TOKEN`. GitHub does not start a
  new workflow run for a push made with that token. S4's "reads the next full CI run" therefore
  either waits indefinitely or reads the pre-regen run. The runner's commit also lands on the
  remote branch only. The worktree must pull it before Task 16 commits, or the close's push is
  rejected as non-fast-forward.
- **Evidence:** The `e2e.yml` commit step runs `git push` with no PAT. Its triggers are `push`
  to `[main, rebuild]`, `pull_request`, and `workflow_dispatch`.
- **Fold:** After the regen, `git pull --ff-only` in the worktree. Then trigger CI with an
  explicit push, such as Task 16's first commit, or `gh workflow run` for `test`, `design`, and
  `e2e` on the ref. S4 accepts on the runs for the new head SHA only.

## Minors

- **m1. Reviewers never see `commonNotes`.**
  - *Location:* plan:37-38 and plan:91-96.
  - *Defect:* `reviewPrompt` sends only `criteria` and the implementer's JSON. The expansion of
    "the admin CSS set" and the rule that a missing task check is blocking live only in
    `commonNotes`, which the implementer alone receives. The Global constraints the reviewer
    should enforce are in the same position.
  - *Fold:* Inline each task's exact task-check strings and the blocking rule into that task's
    `criteria`. Say where the `gate exit:` lines go, since `IMPL_SCHEMA` is fixed: `summary` or
    `gateOutput`.
- **m2. The implementer cannot dispatch `code-simplifier`.**
  - *Location:* plan:38 and plan:102-103.
  - *Defect:* `cairn-implementer` has the tools Read, Write, Edit, Bash, Grep, and Glob, with no
    Agent tool, and `pass-execute` has no simplifier phase.
  - *Fold:* Have the conductor dispatch `code-simplifier` once per segment boundary, between
    invocations (the runner header anticipates this), with a gate and a commit before the push.
- **m3. Task 0 does not baseline the gate the tasks run.**
  - *Location:* Task 0 item 7 (plan:222).
  - *Defect:* The baseline runs `npm run check && npm test`, not the engine tier string. The
    `vitest-browser-parallel-pages-stall` memory's serialized workaround cannot ride a pinned
    tier: a different `gateCommand` triggers B1's mismatch.
  - *Fold:* Baseline with the exact engine string. If stock `npm test` stalls, stop before
    segment A.
- **m4. The components cap is not tight.**
  - *Location:* plan:311.
  - *Defect:* The dead lift is two selectors, rest at `cairn-admin.css:675` and `:hover` at
    `:680`. With `.modal-box`, three selectors leave, and the count lands on 16, not 17. The
    gate passes, but the ratchet keeps one slot of slack.
  - *Fold:* Set the cap to 16, or "the count as found".
- **m5. The showcase reinstall and the showcase builds.**
  - *Location:* Task 0 item 3 (plan:202-205).
  - *Defect:* `npm install` in the showcase can rewrite the committed showcase lockfile. CI uses
    `npm ci --prefix examples/showcase`. Separately, only `pretest:e2e` repackages the engine.
  - *Fold:* Use `npm ci --prefix examples/showcase`, then keep the `realpath` check. Every
    showcase build outside `test:e2e` (Task 0 item 8, Task 13, S1, S3) runs `npm run package`
    first.
- **m6. Task 15 can stale the norms manifest.**
  - *Location:* Task 15 (plan:794-801).
  - *Defect:* A settle fix that moves a value after Task 13's regen stales the manifest again.
    S4 then requires norms to be green.
  - *Fold:* Task 15 reruns `norms:generate` and `norms:check`, and the proof record's
    measurements, whenever a value moves.
- **m7. Showcase-side CI gates are in no task gate.**
  - *Location:* Tasks 11 to 13, and Tasks 3, 9, and 10.
  - *Defect:* CI runs `npm --prefix examples/showcase run check`, `check:cairn`, `format:check`
    (prettier over `src/**/*.css` and `e2e/**/*.ts`), and `npm run check:comments` (eslint over
    `src/lib` and the showcase `src` and `e2e`). None of these is in the engine tier or the
    admin CSS set, so the first red surfaces at a segment boundary and costs a re-dispatch.
  - *Fold:* Add them as light-lane task checks: the showcase gates for Tasks 11 to 13, and
    `check:comments` for Tasks 3, 9, 10, 12, and 13.
- **m8. Task 2's lift assertion breaks at Task 4.**
  - *Location:* Task 2 acceptance (plan:319-320).
  - *Defect:* daisyUI paints `box-shadow: var(--btn-inset) inset, var(--btn-shadow)`
    (`button.css`), and the alpha of `--btn-inset` scales with `--depth`, which Task 4 zeroes.
    An exact computed-string assertion breaks at Task 4.
  - *Fold:* Assert `--btn-shadow` or the lift layer, not the whole `box-shadow`.
- **m9. Task 13's regen breaks a norms test.**
  - *Location:* Task 13 Files (plan:701-703).
  - *Defect:* `norms-bands.browser.test.ts:103-109`, "does not check height on a container
    role", uses a 16px card radius and expects zero card-shell findings. After the regen, the
    card band is 8, a radius finding appears, and the test goes red.
  - *Fold:* List the test in Task 13's Files.
- **m10. The raw partial reverses the pin until Task 3 lands.**
  - *Location:* Task 3 (plan:363-370).
  - *Defect:* Until Task 3, any component test that loads the raw partial before the compiled
    sheet declares `utilities.cairn-idiom` before `utilities.daisyui` in that document, which
    reverses the pin. The raw import comes from `EditorToolbar.test.ts:8`, and from
    `CairnAdminShell`, `LoginPage`, and `ConfirmPage` through `./cairn-admin.css`. No current
    test asserts Task 2's rules, so the problem is latent now.
  - *Fold:* State in Task 3 that the mechanism replaces the raw import in the document and never
    loads it beside the compiled sheet. The guard test should also assert that the idiom rule
    wins in a component-mounted document.

## Process note

This review's first probe, `cairn-run-gate --help`, has no help mode. It queued a heavy-lane
"gate" whose command was `bash --help`, behind the `draft-docs-0` gate. It ran and exited 0. Its
state directory, `/tmp/cairn-gate-1000/8c50da5d5f3e679a`, remains, because the cleanup was
denied. That is harmless: a later call with the same string prints the stale result once.
Before relying on the tool, read its header. Its `--help` is a gate string.
