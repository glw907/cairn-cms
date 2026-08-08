# Cleanup Pass Implementation Plan

> **For agentic workers:** execute task-by-task per this repo's defaults (`cairn-pass` at
> pass start; dispatch each task to `cairn-implementer`, review the diff, verify the full
> gate between dispatches). Steps use checkbox (`- [ ]`) syntax for tracking. The
> writing-plans "which execution method?" question is pre-answered by the workstation
> defaults; do not re-ask it.

**Goal:** Make the shipped package and the repo lean along one line: a consumer receives
only what using cairn requires, and every piece of engine apparatus lives outside the
shipped surface in a named home.

**Spec:** `docs/superpowers/specs/2026-08-08-cleanup-pass-design.md` (ratified 2026-08-08).
Read it first; its rulings govern every task.

**Architecture:** Boundary-first. svelte-package ships everything reachable under
`src/lib`, and the `files` array adds the rest, so the pass moves lab apparatus out of
`src/lib`, gate-enforces the tarball's shape, converts the one heavyweight optional
dependency to an optional peer, then runs the judgment-bearing sweeps (dead tests, repo
organization) against the same line. Mechanical tasks first, judgment last.

**Tech stack:** SvelteKit 2 / Svelte 5 library packaged by svelte-package; vitest; the
repo's `check:*` gate suite; `gh` for the new themes repo.

## Global constraints

- **Worktree:** one feature worktree for the pass, per repo convention. Edits target the
  worktree path. On the worktree: from-scratch `npm install` in `examples/showcase` before
  trusting any e2e (the symlink gotcha), and `npm run package` before `npm test` (several
  assertions read the built package).
- **Gate after every task:** `npm run check` 0/0 and `npm test` exit 0. CI's gate list is
  derived from `.github/workflows/test.yml`, never restated from memory.
- **No export subpath lost:** `check:surface`, `check:reference`, `check:package` green
  throughout. The pass removes zero exports (the audit ships whole, per spec ruling 1).
- **No version bump, no publish.** The pass finalizes CHANGELOG entries under
  `## Unreleased` and stops; release one follows as its own act.
- **Baseline instrument:** `npm pack --dry-run`. Starting point: 2.5 MB packed, 7.0 MB
  unpacked, 741 files. Record the number at pass end.
- **Comments and prose:** TSDoc per `eslint.config.js`; commit messages imperative; the
  `code-simplifier` agent runs before each code commit (docs-only commits exempt).

---

### Task 1: Repo mechanical hygiene (scripts regroup, legacy delete, knip refresh)

**Files:**
- Move: `scripts/*.mjs` into `scripts/checks/` (the `check-*.mjs` gates plus their data
  files `cm-internals-allowlist.json`, `custom-surface-budget.json`, `dev-fold-markers.txt`),
  `scripts/build/` (`build-admin-css.mjs`, `build-mockup-css.mjs`, `admin-css.input.css`,
  `transpile-dist-svelte.mjs`, `emit-template.mjs`, `emit-template.test.mjs`), and
  `scripts/lab/` (`probe-vertical-alignment.mjs` moves here in Task 2;
  `generate-norms-manifest.mjs`, `live-probe-support.mjs`, `reskin-fixture.mjs`,
  `migrate-allowlist.mjs` move now). Shared helpers (`repo-root.mjs`, `walk-files.mjs`,
  and anything imported across groups) stay at `scripts/` root.
- Modify: `package.json` (29 `scripts/` path references), `.github/workflows/e2e.yml`,
  `.github/workflows/scaffold.yml`, `knip.jsonc`, any doc that names a moved script path
  (grep repo-wide; fix live docs, leave closed plans and post-mortems as history).
- Delete: `legacy/` (whole tree; git history keeps it, freeze commit `140fca04`).

**Interfaces:**
- Produces: the `scripts/{checks,build,lab}/` layout every later task references, and a
  `knip.jsonc` whose `entry`/`project` globs match it (`scripts/**/*.mjs`).

**Constraints:** classification of any ambiguous script follows its consumer: a script
`package.json`'s `check:*` targets run is a check; a script only a human or a pass runs
against a live server is lab. Do not rename any npm script name, only paths. `knip.jsonc`'s
header stops describing itself as a one-shot for the 2026-07-01 code-polish pass and states
what it now is: an on-demand dead-code instrument, not a gate; its `legacy/**` ignore dies
with the directory.

- [ ] **Step 1:** Move the scripts into the three subdirectories; update all 29
  `package.json` paths, the two workflow files, and `knip.jsonc` globs in the same commit.
- [ ] **Step 2:** Repo-wide grep for `scripts/` path references (docs, comments, other
  scripts' relative imports); fix every live reference, list the historical ones left as-is
  in the task report.
- [ ] **Step 3:** `git rm -r legacy/`; drop `legacy/**` from `knip.jsonc`; rewrite the knip
  header per the constraint above.
- [ ] **Step 4:** Run the full gate (`npm run package`, `npm run check`, `npm test`).
  Expected: 0/0 and exit 0; every `check:*` target resolves its moved path.
- [ ] **Step 5:** Run `npx knip@6.23.0 --no-progress`; expected: it runs to completion
  against the new globs (its findings are informational, not a gate).
- [ ] **Step 6:** code-simplifier over the touched non-doc files, then commit.

### Task 2: Lab eviction and the anti-leak gate

**Files:**
- Move: `src/lib/audit/rules/rendered/vertical-metrics.ts` →
  `src/tests/lab/vertical-metrics.ts`;
  `src/tests/unit/audit/rules/rendered/vertical-metrics.test.ts` →
  `src/tests/lab/vertical-metrics.test.ts`; `scripts/probe-vertical-alignment.mjs` →
  `scripts/lab/probe-vertical-alignment.mjs`.
- Modify: `src/tests/component/vertical-alignment-recipes.test.ts` (imports
  `vertical-metrics`; it is a LIVE gate and must keep passing from the new import path),
  the probe script's import of the module, `scripts/checks/check-package-files.mjs` (the
  gate extension), and the gate's existing test coverage (find its current test by
  searching for `checkPackageFiles` under `src/tests/`; extend in place).
- Delete: the module's `// WATCH:` comment (it deferred this move to this pass; the move
  discharges it).

**Interfaces:**
- Consumes: Task 1's `scripts/lab/` directory.
- Produces: a `check:package` that fails on any module under the packed rule directories
  (`dist/audit/rules/static/`, `dist/audit/rules/rendered/`) not reachable from the rule
  registries (`src/lib/audit/rules/static/index.ts`, 9 rules;
  `src/lib/audit/rules/rendered/index.ts`, 14 rules). Registry indexes and helpers a
  registered rule imports pass by construction; a module nothing reaches fails.

**Constraints:** the lab home must be outside `src/lib` (svelte-package must not reach it)
and importable by vitest (the component recipes test and the lab unit test both import
it). `src/tests/lab/` satisfies both. The gate core stays a pure function driven by the
real `npm pack --dry-run` file list plus a reachability walk of the registry sources; test
the pure function, not the CLI wrapper. Test-first on the gate: the failing case is the
pre-move tree (vertical-metrics present, unregistered).

- [ ] **Step 1:** Write the failing gate test: a file list containing
  `dist/audit/rules/rendered/vertical-metrics.js` with a registry that does not reach it
  must fail with an error naming the file; a list containing only registered rules and
  their imports must pass.
- [ ] **Step 2:** Run it. Expected: FAIL (the assertion does not exist yet).
- [ ] **Step 3:** Implement the reachability assertion in
  `scripts/checks/check-package-files.mjs`; run the test. Expected: PASS.
- [ ] **Step 4:** Run `npm run check:package` against the current tree. Expected: FAIL,
  naming `vertical-metrics` (the gate catches the live leak before the move; this is the
  gate's honest positive control).
- [ ] **Step 5:** Move the three files; update the recipes test's and probe script's
  imports; remove the WATCH comment.
- [ ] **Step 6:** `npm run package`, then `npm run check:package`. Expected: PASS, and
  `npm pack --dry-run` no longer lists `dist/audit/rules/rendered/vertical-metrics.*`.
- [ ] **Step 7:** Full gate; expected 0/0 and exit 0 (the recipes test passes from the new
  import path).
- [ ] **Step 8:** code-simplifier, then commit.

### Task 3: `@anthropic-ai/sdk` to optional peer

**Files:**
- Modify: `package.json` (move `@anthropic-ai/sdk` `^0.105.0` from `dependencies` to
  `peerDependencies` with `peerDependenciesMeta: { "@anthropic-ai/sdk": { "optional":
  true } }`, and add it to `devDependencies` so this repo's own tests and types keep
  working); `src/lib/sveltekit/content-routes-context.ts` (the static `import Anthropic`
  at line 24 becomes a dynamic import inside the default `anthropicClient` factory at
  line 263; the type-only surface stays static via `import type`).
- Test: `src/tests/integration/content-routes-tidy.test.ts` and a new absent-SDK case
  (mock the module specifier to reject, assert the refusal).

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the tidy action's refusal when the SDK is absent, following the converged
  refusal channel content actions already use (`fail()` with the precise
  `ActionFailure<T>` shape, per the C2b convergence). The refusal message names
  `@anthropic-ai/sdk` and the install command verbatim, in the repo's error-message idiom.

**Constraints:** equipped consumers see no behavior change; the injectable
`anthropicClient` seam (line 177) keeps its signature, so tests that inject fakes are
untouched. Do not add a log event unless the existing vocabulary already carries a tidy
failure event; if it does, emit it, and update `docs/reference/log-events.md` in the same
commit. The `Consumers must:` changelog line lands in this task, not the docs task:
sites using tidy add `@anthropic-ai/sdk` to their own dependencies; sites not using tidy
must do nothing and their install gets lighter.

- [ ] **Step 1:** Write the failing absent-SDK test: tidy invoked with no injected client
  and the dynamic import failing must produce the converged refusal naming the package;
  tidy with an injected fake client must succeed unchanged.
- [ ] **Step 2:** Run it. Expected: the absent case FAILS (today the static import means
  absence is a build-time crash, not a refusal).
- [ ] **Step 3:** Implement: dynamic import in the default factory, refusal path,
  `package.json` dependency moves.
- [ ] **Step 4:** Run the tidy tests. Expected: PASS, both cases.
- [ ] **Step 5:** Verify install weight: `npm pack --dry-run` unchanged (the SDK was never
  packed), and a fresh `npm install --omit=peer` style check or the showcase's install no
  longer pulls the SDK transitively. Record the consumer-side delta in the task report.
- [ ] **Step 6:** Add the `## Unreleased` changelog entry with its `Consumers must:` line.
- [ ] **Step 7:** Full gate; code-simplifier; commit.

### Task 4: Theme-port relocation

**Files:**
- Create: private repo `glw907/cairn-themes` (via `gh repo create --private`), receiving
  `examples/astropaper-theme`, `examples/foxi-theme`, `examples/gallery-theme` with
  history (`git subtree split` per theme, or one split of `examples/` filtered to the
  three; the mechanism is the implementer's call, the requirement is preserved history
  and a README in the new repo naming what each theme is and where it came from).
- Delete: the three directories from this repo after the new repo's content is verified.
- Modify: any live doc that references the three paths (pre-verified 2026-08-08: nothing
  in `.github`, `scripts/`, `package.json`, or the published docs arms does; re-grep
  repo-wide anyway, including `docs/internal/`, and fix live references or note
  historical ones).

**Interfaces:**
- Consumes: nothing from earlier tasks; independent.
- Produces: an `examples/` holding only `showcase/` (the canonical proving ground) and
  `cairn-theme/` (verified 2026-08-08: the Waymark identity layer cairn.pub runs; it
  stays).

**Constraints:** the new repo stays private (cairn is closely held until beta; the themes
follow). Verification before deletion is non-negotiable: clone the new repo fresh,
confirm each theme's tree matches (`git diff --no-index` against the pre-delete
directories), then delete here. This is the destructive step of the pass; the fresh-clone
diff is its dry run.

- [ ] **Step 1:** Create `glw907/cairn-themes` (private); split and push the three themes
  with history; write its README.
- [ ] **Step 2:** Fresh-clone the new repo; `git diff --no-index` each theme against the
  local directory. Expected: no differences.
- [ ] **Step 3:** Repo-wide grep for the three theme names; fix or classify every hit.
- [ ] **Step 4:** `git rm -r` the three directories.
- [ ] **Step 5:** Full gate (the showcase e2e must be unaffected). Commit (docs-only
  simplifier exemption does not apply; run it if any code changed, else commit directly).

### Task 5: Closed-plan artifact pruning

**Files:**
- Delete: binary artifacts (images, captures, archives) under `docs/superpowers/` (22 MB)
  and `docs/internal/` (7.6 MB) that no live document references.
- Modify: nothing else; post-mortem and plan TEXT is untouched.

**Interfaces:**
- Consumes: nothing; independent.
- Produces: the same doc trees at a fraction of the weight.

**Constraints:** "live" means the published arms (`docs/reference`, `docs/guides`,
`docs/explanation`, `docs/tutorial`, `docs/README.md`), `docs/STATUS.md`, `ROADMAP.md`,
`CLAUDE.md`, `README.md`, and the standing internal docs (`docs/internal/*.md` that are
not dated reports or in `history/`). The method is mechanical and auditable: enumerate
every non-`.md` file under the two trees with size; grep each basename across every `.md`
in the repo; a file referenced only by dated plans, dated reports, specs, or archived
STATUS is prunable; a file referenced by any live doc stays; a file referenced by nothing
is prunable. Produce the list with dispositions BEFORE deleting, keep it in the task
report, and delete in one commit (git history is the recovery path). Run the docs-links
check (`scripts/checks/docs-links.mjs` target) after.

- [ ] **Step 1:** Generate the inventory (path, size, referencing docs, disposition).
- [ ] **Step 2:** Review the inventory in the main loop (the orchestrator reads it, not
  just the implementer); confirm no live-doc reference is in the prunable set.
- [ ] **Step 3:** Delete the prunable set in one commit; record the MB recovered.
- [ ] **Step 4:** Run the docs-links gate and the full gate. Expected: green.

### Task 6: The dead-test sweep

**Files:**
- Modify/Delete: within `src/tests/` (422 test files at count; Task 2 already moved the
  lab tests). No `src/lib` changes belong in this task.

**Interfaces:**
- Consumes: Tasks 1-2 landed (so the sweep judges the post-eviction tree).
- Produces: a deletion list with per-file rationale, and a suite that still exits 0 with
  the surface gates unchanged.

**Constraints:** the spec's conservative criteria verbatim: a test dies only when (a) its
assertion target no longer exists, or (b) its coverage is demonstrably held by a NAMED
surviving test. Doubt keeps the test. The classification pass produces the list first;
nothing is deleted until the orchestrator reviews it. This task is shaped for an
adversarial find-and-verify workflow (finder fan-out over the test tree, a skeptic per
proposed deletion prompted to refute the death rationale); offer it to Geoff in one
sentence at execution and run it only on his opt-in, otherwise a `cairn-implementer`
classification dispatch plus an `claude-opus-5` reviewer dispatch over the list serves.

- [ ] **Step 1:** Produce the classification list (dead / duplicate-of-named-survivor /
  lives), with the rationale and the named survivor per duplicate.
- [ ] **Step 2:** Adversarial review of the list (workflow on opt-in, else the Opus
  reviewer dispatch); every refuted death moves to lives.
- [ ] **Step 3:** Delete the surviving deletion list in one commit.
- [ ] **Step 4:** Full gate: `npm run package`, `npm run check` 0/0, `npm test` exit 0;
  `check:surface` / `check:reference` / `check:package` byte-identical verdicts. Record
  the before/after test-file and assertion counts.

### Task 7: Docs dimension and pass close

**Files:**
- Modify: `docs/internal/what-cairn-is-and-is-not.md` (the audit ruling: cairn-audit
  ships whole as consumer product, with the one-line reasoning that a consumer's admin IS
  cairn's admin toolkit); `docs/reference/cairn-audit.md` (what ships: registered rules,
  manifest, CLI; what deliberately does not: norms generator, probe apparatus);
  `docs/reference/` and `docs/guides/` pages touched by the SDK change (tidy setup now
  names the peer install); `CHANGELOG.md` (finalize the pass's `## Unreleased` entries);
  `ROADMAP.md` (the cleanup entry leaves the Now tier; anything this pass surfaced files
  into its right tier); `docs/STATUS.md` (pass recorded, next action: release one).

**Interfaces:**
- Consumes: every earlier task's outcome (the docs state what landed).

**Constraints:** published-arm prose follows the Google standard and the docs register
(`docs/internal/docs-register.md`); Vale must be clean on the touched published pages.
Re-measure the baseline (`npm pack --dry-run`: MB packed, MB unpacked, file count) and
record it in STATUS beside the 2.5 MB / 7.0 MB / 741 starting point. The `cairn-pass`
pass-end ritual runs after this task (post-mortem, harvest check, clear-prep), per the
skill, not per this plan.

- [ ] **Step 1:** Land the ruling in the two named docs.
- [ ] **Step 2:** Update the SDK-touched reference/guide pages.
- [ ] **Step 3:** Finalize CHANGELOG `## Unreleased`; update ROADMAP and STATUS;
  re-measure and record the baseline.
- [ ] **Step 4:** Vale clean on touched published pages; full gate; commit (docs-only, no
  simplifier).
