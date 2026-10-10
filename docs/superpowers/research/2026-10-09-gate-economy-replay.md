# Gate economy replay: pass A against the new classifier

Parts 1 and 3 were written at Task 7; parts 2 and 4 (the timed ranges and the projection) were written at the close.

- **Branch and head:** `gate-economy` at `b835fe30` for parts 1 and 3; the timed ranges in part 2 ran at
  `4a1663f3`. Every range runs at the head of its part (Decision 8): the selection is historical, the code
  is current.
- **Pass measured:** pass A, `engine-pre-2b-a` (PR #108, merged head `8483ca5b`). Task ranges come
  from `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md` (Ledger, Post-mortem) and
  `git log --first-parent` over the branch, which leaves out the `main` commits interleaved into the
  branch's window.
- **Method:** `scripts/checks/gate-tier.mjs` run two ways per range, both with the task's pass class.
  The CLI (`--range <range> --class <class>`) prints the gate. The Node API (`diffEntries`,
  `loadContext`, `componentPlan`, `selectComponentTests`, `decideGate`, `selectChecks`, `e2eSpecs`,
  `pathBuckets`) yields the legs, the buckets, and the component selection, which comes from
  `createVitest` with `CAIRN_RELATED_RUN=1` and is never read from the gate string. The CLI's stdout
  equals the Node API's `decideGate` gate for all 18 ranges.
- **Scratch:** `~/.cache/gate-economy/task7/` (the dry-run scripts, `out.json`, the CI logs read for
  part 3).

## Part 1: classifier and selection dry runs

Task 0 is the conductor's baseline and has no gate, so it has no range. The pass class is the task's
class from the plan header's overrides (Task 2 `tool`, Tasks 5 and 7 `engine-logic`, Task 12 `docs`,
the rest `auth-data`); the class only adds the `auth-data` e2e floor. The static check universe is 45
labels (40 `check:close` steps plus 5 extras). Rows below the plan tasks are the close's three gates
and the S2 boundary's three fix rounds, run because part 3 cites the fix rounds and the close ran
real gates over the others.

**Observations that are not misses.** (1) Task 12, a `docs` task, selects the whole component
project: its diff touches `packages/cairn-cms-dev/README.md`, which sits in the docs and engine
buckets, so it is not docs-only, and nothing under `src/` exists to select from, so the classifier
fails closed to the whole project. (`CHANGELOG.md` and `ROADMAP.md` are docs-only and do not cause
it.) (2) Task 8, Task 11, and both close fix chains that
touch admin components select the whole component project through a rerun trigger.

#### Per-range summary

| Id | Range | Class | Paths | Buckets | Static checks | Component | create-cairn-site | e2e | tool |
|---|---|---|---|---|---|---|---|---|---|
| T1 | `72f8b18c..94a3f672` | auth-data | 37 | docs, engine, exportSurface, scripts, showcase | all 45 | select 6 | yes | whole suite | no |
| T2 | `94a3f672..92216610` | tool | 9 | docs, engine | 39 of 45 | select 7 | no | 2 specs | yes |
| T3 | `5549fda8..f655f877` | auth-data | 23 | docs, engine, scripts | 40 of 45 | select 6 | no | 10 specs | no |
| T4 | `f5ef5f03..4597aa49` | auth-data | 14 | docs, engine, scripts, showcase | 43 of 45 | select 7 | yes | whole suite | yes |
| T5 | `4597aa49..bad014c0` | engine-logic | 17 | docs, engine, exportSurface, scripts | 44 of 45 | select 1 | no | 11 specs | no |
| T7 | `bad014c0..092176c1` | engine-logic | 18 | docs, engine, scripts, showcase | 43 of 45 | select 7 | yes | whole suite | yes |
| T8 | `cca4bced..666aff41` | auth-data | 7 | docs, engine, scripts, showcase | 43 of 45 | whole | yes | 10 specs | no |
| T9 | `666aff41..df8857d9` | auth-data | 7 | docs, engine, scripts | 40 of 45 | select 1 | no | 10 specs | no |
| T10 | `df8857d9..a4618437` | auth-data | 5 | docs, engine, scripts, showcase | 43 of 45 | select 1 | yes | 10 specs | no |
| T11 | `db174a3d..d716ec89` | auth-data | 17 | docs, engine, exportSurface, scripts | 44 of 45 | whole | no | 19 specs | no |
| T6 | `d716ec89..a8156613` | auth-data | 9 | docs, engine, exportSurface, scripts | 44 of 45 | select 1 | no | 11 specs | no |
| T12 | `84588075..d675f953` | docs | 18 | docs, engine | 39 of 45 | whole | no | 3 specs | no |
| C-simplify | `d675f953..a4c5e4b9` | auth-data | 4 | engine | 29 of 45 | select 6 | no | 14 specs | no |
| C-fix1 | `a4c5e4b9..e31bc2dd` | auth-data | 6 | docs, engine, scripts, showcase | 43 of 45 | whole | yes | 10 specs | no |
| C-fix2 | `e31bc2dd..8e2b7d29` | auth-data | 46 | docs, engine, exportSurface, scripts, showcase | 45 of 45 | whole | yes | whole suite | yes |
| S2-fix-selfuse | `092176c1..c3d2952c` | engine-logic | 1 | exportSurface, scripts | 14 of 45 | whole | no | 3 specs | no |
| S2-fix-format | `c3d2952c..92325c02` | engine-logic | 1 | showcase | 18 of 45 | whole | yes | whole suite | no |
| S2-fix-emit | `92325c02..12027522` | engine-logic | 1 | showcase | 18 of 45 | whole | no | none | no |

#### Per-range detail

##### T1: `72f8b18c..94a3f672` (auth-data)

- **Derivation:** Task 1 commits `37797ff3`, `5cb4a5e7`, `94a3f672` (one fix round); the last branch commit before is `72f8b18c` (Task 0 close).
- **Legs:** package, static (all 45 of 45), node projects, component (select 6), create-cairn-site, e2e (whole suite).
- **Buckets:** docs, engine, exportSurface, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** 6 file(s): `CairnAdmin.test.ts`, `CairnAdminShell.test.ts`, `admin-compiled-sheet-guard.test.ts`, `admin-layout-help-nav.test.ts`, `admin-nav-icons.test.ts`, `admin-shell-theme-override.test.ts`.
- **e2e specs:** the whole suite (a path outside the table's map).
- **Fail-closed reason:** scripts/checks/check-tool-heuristics.mjs is read by no check, so every static check runs.
- **Printed gate:**

```sh
npm run package && npm run check:close && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/CairnAdminShell.test.ts src/tests/component/admin-compiled-sheet-guard.test.ts src/tests/component/admin-layout-help-nav.test.ts src/tests/component/admin-nav-icons.test.ts src/tests/component/admin-shell-theme-override.test.ts && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 --grep-invert "site home|archive page 2"
```

##### T2: `94a3f672..92216610` (tool)

- **Derivation:** Task 2 commits `eaa1b7d2`, `92216610` (one fix round); before: `94a3f672`.
- **Legs:** package, static (39 of 45), node projects, component (select 7), e2e (2 specs), tool.
- **Buckets:** docs, engine; 0 unplaced path(s).
- **Component selection (Node API):** 7 file(s): `CairnAdmin.test.ts`, `reproductions-containment.test.ts`, `reproductions-marker-crop.test.ts`, `reproductions-stories.test.ts`, `tidy-review.test.ts`, `tidy-settings.test.ts`, `vertical-alignment-recipes.test.ts`.
- **e2e specs:** `golden-path.spec.ts`, `healthz.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:custom-surface check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/reproductions-containment.test.ts src/tests/component/reproductions-marker-crop.test.ts src/tests/component/reproductions-stories.test.ts src/tests/component/tidy-review.test.ts src/tests/component/tidy-settings.test.ts src/tests/component/vertical-alignment-recipes.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 golden-path.spec.ts healthz.spec.ts && make -C tool check
```

##### T3: `5549fda8..f655f877` (auth-data)

- **Derivation:** Task 3 `f655f877`; the base is the S1 checkpoint record `5549fda8`, as Decision 9 names it.
- **Legs:** package, static (40 of 45), node projects, component (select 6), e2e (10 specs).
- **Buckets:** docs, engine, scripts; 0 unplaced path(s).
- **Component selection (Node API):** 6 file(s): `CairnAdmin.test.ts`, `CairnAdminShell.test.ts`, `admin-compiled-sheet-guard.test.ts`, `admin-layout-help-nav.test.ts`, `admin-nav-icons.test.ts`, `admin-shell-theme-override.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/CairnAdminShell.test.ts src/tests/component/admin-compiled-sheet-guard.test.ts src/tests/component/admin-layout-help-nav.test.ts src/tests/component/admin-nav-icons.test.ts src/tests/component/admin-shell-theme-override.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts
```

##### T4: `f5ef5f03..4597aa49` (auth-data)

- **Derivation:** Task 4 `4597aa49`; before: `f5ef5f03` (the S1 boundary record).
- **Legs:** package, static (43 of 45), node projects, component (select 7), create-cairn-site, e2e (whole suite), tool.
- **Buckets:** docs, engine, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** 7 file(s): `CairnAdmin.test.ts`, `reproductions-containment.test.ts`, `reproductions-marker-crop.test.ts`, `reproductions-stories.test.ts`, `tidy-review.test.ts`, `tidy-settings.test.ts`, `vertical-alignment-recipes.test.ts`.
- **e2e specs:** the whole suite (a path outside the table's map).
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/reproductions-containment.test.ts src/tests/component/reproductions-marker-crop.test.ts src/tests/component/reproductions-stories.test.ts src/tests/component/tidy-review.test.ts src/tests/component/tidy-settings.test.ts src/tests/component/vertical-alignment-recipes.test.ts && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 --grep-invert "site home|archive page 2" && make -C tool check
```

##### T5: `4597aa49..bad014c0` (engine-logic)

- **Derivation:** Task 5 `bad014c0`; before: `4597aa49`.
- **Legs:** package, static (44 of 45), node projects, component (select 1), e2e (11 specs).
- **Buckets:** docs, engine, exportSurface, scripts; 0 unplaced path(s).
- **Component selection (Node API):** 1 file(s): `CairnAdmin.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `members.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:package check:audit-pack check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts golden-path.spec.ts healthz.spec.ts members.spec.ts preview.spec.ts publish-pending-word.spec.ts
```

##### T7: `bad014c0..092176c1` (engine-logic)

- **Derivation:** Task 7 `092176c1`; before: `bad014c0`.
- **Legs:** package, static (43 of 45), node projects, component (select 7), create-cairn-site, e2e (whole suite), tool.
- **Buckets:** docs, engine, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** 7 file(s): `CairnAdmin.test.ts`, `reproductions-containment.test.ts`, `reproductions-marker-crop.test.ts`, `reproductions-stories.test.ts`, `tidy-review.test.ts`, `tidy-settings.test.ts`, `vertical-alignment-recipes.test.ts`.
- **e2e specs:** the whole suite (a path outside the table's map).
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/reproductions-containment.test.ts src/tests/component/reproductions-marker-crop.test.ts src/tests/component/reproductions-stories.test.ts src/tests/component/tidy-review.test.ts src/tests/component/tidy-settings.test.ts src/tests/component/vertical-alignment-recipes.test.ts && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 --grep-invert "site home|archive page 2" && make -C tool check
```

##### T8: `cca4bced..666aff41` (auth-data)

- **Derivation:** Task 8 `666aff41`; before: `cca4bced` (the S2 boundary record).
- **Legs:** package, static (43 of 45), node projects, component (whole), create-cairn-site, e2e (10 specs).
- **Buckets:** docs, engine, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** none selected, rerun trigger src/lib/admin/EditPage.svelte, src/tests/component/_app-forms.ts.
- **e2e specs:** `access-map.spec.ts`, `admin-nav-layout.spec.ts`, `admin-referrer.spec.ts`, `admin-sheet.spec.ts`, `admin-shell-sidebar.spec.ts`, `admin-visual.spec.ts`, `csrf-origin.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `theme-kit.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-nav-layout.spec.ts admin-referrer.spec.ts admin-sheet.spec.ts admin-shell-sidebar.spec.ts admin-visual.spec.ts csrf-origin.spec.ts edit-save-failure.spec.ts golden-path.spec.ts theme-kit.spec.ts
```

##### T9: `666aff41..df8857d9` (auth-data)

- **Derivation:** Task 9 `df8857d9`; before: `666aff41`.
- **Legs:** package, static (40 of 45), node projects, component (select 1), e2e (10 specs).
- **Buckets:** docs, engine, scripts; 0 unplaced path(s).
- **Component selection (Node API):** 1 file(s): `CairnAdmin.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts
```

##### T10: `df8857d9..a4618437` (auth-data)

- **Derivation:** Task 10 `a4618437`; before: `df8857d9`.
- **Legs:** package, static (43 of 45), node projects, component (select 1), create-cairn-site, e2e (10 specs).
- **Buckets:** docs, engine, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** 1 file(s): `CairnAdmin.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts
```

##### T11: `db174a3d..d716ec89` (auth-data)

- **Derivation:** Task 11 `bd614101` plus its fix round `d716ec89`; the base `db174a3d` is `bd614101^`, the S3 boundary record.
- **Legs:** package, static (44 of 45), node projects, component (whole), e2e (19 specs).
- **Buckets:** docs, engine, exportSurface, scripts; 0 unplaced path(s).
- **Component selection (Node API):** none selected, rerun trigger src/lib/admin/MediaAltFillDialog.svelte, src/lib/admin/MediaReplaceDialog.svelte.
- **e2e specs:** `access-map.spec.ts`, `admin-nav-layout.spec.ts`, `admin-referrer.spec.ts`, `admin-sheet.spec.ts`, `admin-shell-sidebar.spec.ts`, `admin-visual.spec.ts`, `capture-transport.spec.ts`, `container-fields.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `fragments.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`, `tag-filter.spec.ts`, `theme-kit.spec.ts`, `vocabulary-admin.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:package check:audit-pack check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && npm run test:component -- --no-file-parallelism && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-nav-layout.spec.ts admin-referrer.spec.ts admin-sheet.spec.ts admin-shell-sidebar.spec.ts admin-visual.spec.ts capture-transport.spec.ts container-fields.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts fragments.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts tag-filter.spec.ts theme-kit.spec.ts vocabulary-admin.spec.ts
```

##### T6: `d716ec89..a8156613` (auth-data)

- **Derivation:** Task 6 `c2409fdc`, `a8156613` (one fix round); before: `d716ec89`.
- **Legs:** package, static (44 of 45), node projects, component (select 1), e2e (11 specs).
- **Buckets:** docs, engine, exportSurface, scripts; 0 unplaced path(s).
- **Component selection (Node API):** 1 file(s): `CairnAdmin.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `container-fields.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:package check:audit-pack check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts container-fields.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts
```

##### T12: `84588075..d675f953` (docs)

- **Derivation:** Task 12 `21a6fdc5`, `60ff2c79`, `d675f953`; before: `84588075` (the S4a record).
- **Legs:** package, static (39 of 45), node projects, component (whole), e2e (3 specs).
- **Buckets:** docs, engine; 0 unplaced path(s).
- **Component selection (Node API):** none selected, nothing under src/ to select from.
- **e2e specs:** `access-map.spec.ts`, `csrf-origin.spec.ts`, `golden-path.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:custom-surface check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && npm run test:component -- --no-file-parallelism && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts csrf-origin.spec.ts golden-path.spec.ts
```

##### C-simplify: `d675f953..a4c5e4b9` (auth-data)

- **Derivation:** The close's simplifier pass `a4c5e4b9`; before: `d675f953`. Not a plan task; included because the close ran a gate over it.
- **Legs:** package, static (29 of 45), node projects, component (select 6), e2e (14 specs).
- **Buckets:** engine; 0 unplaced path(s).
- **Component selection (Node API):** 6 file(s): `CairnAdmin.test.ts`, `CairnAdminShell.test.ts`, `admin-compiled-sheet-guard.test.ts`, `admin-layout-help-nav.test.ts`, `admin-nav-icons.test.ts`, `admin-shell-theme-override.test.ts`.
- **e2e specs:** `access-map.spec.ts`, `admin-referrer.spec.ts`, `capture-transport.spec.ts`, `container-fields.spec.ts`, `csrf-origin.spec.ts`, `custom-screen.spec.ts`, `edit-save-failure.spec.ts`, `fragments.spec.ts`, `golden-path.spec.ts`, `healthz.spec.ts`, `preview.spec.ts`, `publish-pending-word.spec.ts`, `tag-filter.spec.ts`, `vocabulary-admin.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:custom-surface check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:target-stack check:editor-quotes check:facts check:leaks check:visuals check:symbols check:snippets check:prose check:version check:dev-package check:template 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && npm run test:node-projects && CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism src/tests/component/CairnAdmin.test.ts src/tests/component/CairnAdminShell.test.ts src/tests/component/admin-compiled-sheet-guard.test.ts src/tests/component/admin-layout-help-nav.test.ts src/tests/component/admin-nav-icons.test.ts src/tests/component/admin-shell-theme-override.test.ts && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-referrer.spec.ts capture-transport.spec.ts container-fields.spec.ts csrf-origin.spec.ts custom-screen.spec.ts edit-save-failure.spec.ts fragments.spec.ts golden-path.spec.ts healthz.spec.ts preview.spec.ts publish-pending-word.spec.ts tag-filter.spec.ts vocabulary-admin.spec.ts
```

##### C-fix1: `a4c5e4b9..e31bc2dd` (auth-data)

- **Derivation:** Close fix chain 1, `9f722bb9` and `e31bc2dd` (Save held through the reload, redirect origin check); before: `a4c5e4b9`. My grouping by message and time.
- **Legs:** package, static (43 of 45), node projects, component (whole), create-cairn-site, e2e (10 specs).
- **Buckets:** docs, engine, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** none selected, rerun trigger src/lib/admin/EditPage.svelte.
- **e2e specs:** `access-map.spec.ts`, `admin-nav-layout.spec.ts`, `admin-referrer.spec.ts`, `admin-sheet.spec.ts`, `admin-shell-sidebar.spec.ts`, `admin-visual.spec.ts`, `csrf-origin.spec.ts`, `edit-save-failure.spec.ts`, `golden-path.spec.ts`, `theme-kit.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:reference check:reference:signatures check:options check:surface check:self-use check:custom-surface check:chassis-boundary check:cm-internals check:idioms check:invisible-craft check:admin-css-classes check:readiness check:tool-conditions check:docs check:rulings-format check:target-stack check:arm-indexes check:editor-quotes check:facts check:provenance check:leaks check:visuals check:transcripts check:symbols check:snippets check:prose check:version check:dev-package check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:vale check:comments check:public-tokens && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts admin-nav-layout.spec.ts admin-referrer.spec.ts admin-sheet.spec.ts admin-shell-sidebar.spec.ts admin-visual.spec.ts csrf-origin.spec.ts edit-save-failure.spec.ts golden-path.spec.ts theme-kit.spec.ts
```

##### C-fix2: `e31bc2dd..8e2b7d29` (auth-data)

- **Derivation:** Close fix chain 2, `2a06c1b2` through `8e2b7d29`; before: `e31bc2dd`. My grouping; the post-mortem names the two chains only as `9f722bb9` through `8e2b7d29`.
- **Legs:** package, static (45 of 45), node projects, component (whole), create-cairn-site, e2e (whole suite), tool.
- **Buckets:** docs, engine, exportSurface, scripts, showcase; 0 unplaced path(s).
- **Component selection (Node API):** none selected, rerun trigger migrations/0001_roles.sql, src/lib/admin/MediaAltFillDialog.svelte, src/lib/admin/MediaReplaceDialog.svelte.
- **e2e specs:** the whole suite (a path outside the table's map).
- **Printed gate:**

```sh
npm run package && npm run check:close && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit && node scripts/checks/check-tellgrader.mjs && vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 --grep-invert "site home|archive page 2" && make -C tool check
```

##### S2-fix-selfuse: `092176c1..c3d2952c` (engine-logic)

- **Derivation:** The S2 boundary fix round `c3d2952c` (the self-use allowlist entry); before: `092176c1`. Not a plan task; the miss table cites it.
- **Legs:** package, static (14 of 45), node projects, component (whole), e2e (3 specs).
- **Buckets:** exportSurface, scripts; 0 unplaced path(s).
- **Component selection (Node API):** none selected, nothing under src/ to select from.
- **e2e specs:** `access-map.spec.ts`, `csrf-origin.spec.ts`, `golden-path.spec.ts`.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check check:package check:audit-pack check:reference check:reference:signatures check:options check:surface check:self-use check:chassis-boundary check:cm-internals check:idioms check:consumers check:public-skill check:comments && npm run test:node-projects && npm run test:component -- --no-file-parallelism && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 access-map.spec.ts csrf-origin.spec.ts golden-path.spec.ts
```

##### S2-fix-format: `c3d2952c..92325c02` (engine-logic)

- **Derivation:** The S2 boundary fix round `92325c02` (formats the health route test); before: `c3d2952c`. Not a plan task.
- **Legs:** package, static (18 of 45), node projects, component (whole), create-cairn-site, e2e (whole suite).
- **Buckets:** showcase; 0 unplaced path(s).
- **Component selection (Node API):** none selected, nothing under src/ to select from.
- **e2e specs:** the whole suite (a path outside the table's map).
- **Printed gate:**

```sh
npm run package && npm run check:close -- check:self-use check:custom-surface check:chassis-boundary check:invisible-craft check:target-stack check:leaks check:transcripts check:symbols check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:comments check:public-tokens && npm run test:emit && npm --prefix examples/showcase run test:unit && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site && export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 --grep-invert "site home|archive page 2"
```

##### S2-fix-emit: `92325c02..12027522` (engine-logic)

- **Derivation:** The S2 boundary fix round `12027522` (re-emits the template); before: `92325c02`. Not a plan task.
- **Legs:** package, static (18 of 45), node projects, component (whole).
- **Buckets:** showcase; 0 unplaced path(s).
- **Component selection (Node API):** none selected, nothing under src/ to select from.
- **e2e specs:** none.
- **Printed gate:**

```sh
npm run package && npm run check:close -- check:self-use check:custom-surface check:chassis-boundary check:invisible-craft check:target-stack check:leaks check:transcripts check:symbols check:template check:consumers 'npm --prefix examples/showcase run check' 'npm --prefix examples/showcase run check:cairn' 'npm --prefix examples/showcase run format:check' check:public-skill check:comments check:public-tokens && npm run test:emit && npm --prefix examples/showcase run test:unit && npm run test:node-projects && npm run test:component -- --no-file-parallelism
```


## Part 2: the two timed ranges

Written at the close, 2026-10-10, at `gate-economy` head `4a1663f3`. Pass A Task 3 (`5549fda8..f655f877`)
and Task 11 (`bd614101^..d716ec89`), each gate string (T3 and T11 in part 1) run through `cairn-run-gate`
in the `gate-economy` worktree, run time and lock wait recorded separately. Task 7's target was ten minutes
a gate. Both ranges exit 0. Both are over.

| Range | Pass A task | Gate exit | Window (UTC) | Elapsed | Lock wait | Run time | Exit-75 re-issues | e2e tests |
|---|---|---|---|---|---|---|---|---|
| A | Task 3, `5549fda8..f655f877` | 0 | 18:56:29 to 19:12:49 | 16.3 min | 0 | 977 s (16.3 min) | 1 | 56 |
| B | Task 11, `bd614101^..d716ec89` | 0 | 19:12:52 to 19:49:02 | 36.2 min | 662 s (11.0 min), behind another project's heavy gate | 1,506 s (25.2 min) | 3 | 216 |

Logs: `/tmp/cairn-gate-1000/2b60f3f8e7ae4a31/gate.log` (A) and `/tmp/cairn-gate-1000/73b44da30705a262/gate.log`
(B). Run records reach the live tool only at the dotfiles merge, so the live `--records` read was not
available; the durations come from the logs' own timestamps and the lock NOTE. The basis column says whether
a leg's time was printed by the tool or derived by subtraction.

**Range A, per leg (977 s):**

| Leg | Seconds | Basis |
|---|---|---|
| `check:close` subset (35 checks) | 364 | printed |
| `package` twice, `check:tool-heuristics`, `test:emit`, showcase unit boot | 53 | derived |
| showcase `test:unit`, tellgrader, vale rules, node boot | 18 | derived |
| node projects | 269 | Vitest 264.2 s (443 files, 6,463 tests) |
| component, 6 related files | 22 | Vitest 21.4 s |
| `create-cairn-site` | 0 | not triggered |
| e2e, 56 tests | 252 | Playwright 3.7 min plus the webserver builds |

Five checks took the most time: `check:surface` 84.3 s, `check:reference` 73.4 s, `check` 47.3 s,
`check:reference:signatures` 34.9 s, `check:comments` 25.8 s.

**Range B, per leg (1,506 s):**

| Leg | Seconds | Basis |
|---|---|---|
| `check:close` subset (39 checks) | 490 | printed |
| `package` twice, `check:tool-heuristics`, `test:emit`, showcase unit boot | 52 | derived |
| showcase `test:unit`, tellgrader, vale rules, node boot | 19 | derived |
| node projects | 276 | Vitest 270.9 s |
| component, whole (90 files; the `src/lib/admin/**` rerun trigger) | 235 | Vitest 234.8 s |
| `create-cairn-site` | 0 | not triggered |
| e2e, 216 tests | 435 | Playwright 6.8 min plus overhead |

The heaviest checks: `check:surface` 83.4 s, `check:reference` 71.1 s, `check` 44.9 s, `check:audit-pack`
42.2 s, `check:self-use` 35.8 s, `check:reference:signatures` 32.5 s, `check:consumers` 32.1 s,
`check:comments` 26.6 s.

**Where the time goes.** Static checks take 36 to 43 percent of a range (the five heaviest about 265 s of
it). The node projects are a fixed 265 to 271 s. The e2e leg takes 26 to 29 percent, about 188 s fixed plus
1.14 s a test (the two ranges fit that line exactly). The whole component project adds 235 s when an admin
trigger fires. The package is built twice (leg 1 and inside `check:close`), about 20 s each.

**The `check:surface` revisit (one, as Task 7 allowed).** `check:surface` was in the docs bucket, but it
reads no docs page. The close fix chain (`4ef0fdbb`) removed it from that bucket, which saves about 84 s on
a range that touches only docs-bucket paths (range A to about 14.9 min, still over ten). The other levers
are not taken in this pass: the node projects and the five heavy checks are pass B's next measurement, and
the double build is `ROADMAP.md` follow-up (g).

## Part 3: the miss-rate table

**Sources.** The CI runs API on PR #108 (138 runs on `engine-pre-2b-a`: 118 success, 19 failure,
1 cancelled; the run list is `gh api repos/glw907/cairn-cms/actions/runs?branch=engine-pre-2b-a`),
the failing logs read with `gh run view <id> --log-failed`, `docs/HISTORY.md` on `main` (pass A,
"What the gates caught", four bullets), and the gate archive
`~/.local/state/cairn-gate-archive/2026-10-09-pass-a`. Only the archive's `e153a4bcbf6696e3` is cited
(row X14); the archive holds no log of any included red. A grep of its 334 run dirs for the
`check:self-use` finding, the prettier warning, and the template drift line finds none.

**The floor.** Task 0's list of 24 items, all accounted for below: 6 included (items 6, 8, 10, 12,
16, 21) in 5 rows, 18 excluded (items 1 to 5, 7, 9, 11, 13 to 15, 17 to 20, 22 to 24) in 18 rows.
No floor item is a TDD red run: those are local and never reached CI or HISTORY, so that excluded
class is empty.

**Floor wording corrected by the logs.** Four of the floor's failure descriptions do not match the
logs, and the rows below carry what the logs show:

- Items 6, 10, and 16 read "missing-package error as item 6". The logs show real findings:
  `check:self-use` flagged `ChannelStatementLike`; `format:check` flagged
  `examples/showcase/src/routes/healthz/server.test.ts`; `check:template` reported
  `templates/waymark has drifted from a fresh bake` for the same file. These match the Ledger and
  HISTORY.
- Items 8 and 12 read "stateFiles.length === 1, guidance-file expectations". The failing step is the
  scaffolded site's `format:check` on the same `healthz/server.test.ts`.
- Item 14 reads "dev-backend artifact ... gzip bundle over the v1 hard budget". The only failing test
  is `e2e/spellcheck.spec.ts:20` (row X14).
- Item 1's parenthetical reads "Go lint". It is govulncheck (item 24 below).

### Included rows (a gate leg could have caught the red)

Selection evidence is in Part 1; the leg named is in that range's printed gate.

| Row | Floor | Source | Last green .. first red | Failing check | New selection includes it? |
|---|---|---|---|---|---|
| I1 | 16, 21 (first clause) | CI run 37892059158 (`test`, `bad014c0`); HISTORY bullet 1; Ledger "S2 boundary" | `4597aa49` (test run 37889524499 green) .. `bad014c0`; this is Task 5's range, T5 | `npm run check:self-use`: `ChannelStatementLike` (declared in `src/lib/auth-channel/store.ts`) has zero call sites and no allowlist entry | Yes. T5 selects `check:self-use` (44 of 45 checks). The fix round S2-fix-selfuse (`092176c1..c3d2952c`) selects it too. |
| I2 | 10, 21 (second clause) | CI run 37896194623 (`test`, `c3d2952c`); HISTORY bullet 1 | `4597aa49` .. first observed red `c3d2952c` (the `092176c1` test run, 37893646318, was cancelled, so no run reached `format:check` between). Introduced by Task 7 (T7, `bad014c0..092176c1`), which added `examples/showcase/src/routes/healthz/server.test.ts` | `npm --prefix examples/showcase run format:check`: prettier warns on `src/routes/healthz/server.test.ts` | Yes. T7 selects `npm --prefix examples/showcase run format:check`; the leg is in its `check:close` subset. |
| I3 | 6, 21 (second clause) | CI run 37898484811 (`test`, `92325c02`); HISTORY bullet 1 | `c3d2952c` (run 37896194623 ran `check:template` green: "templates/waymark matches a fresh bake") .. `92325c02`; introduced by the formatting commit `92325c02` itself (S2-fix-format, `c3d2952c..92325c02`), which formatted the showcase test and left `templates/waymark` unemitted | `npm run check:template`: `emit-template-dir: templates/waymark has drifted from a fresh bake`, differs `src/routes/healthz/server.test.ts` | Yes. S2-fix-format selects `check:template`, `test:emit`, and the showcase `format:check`. |
| I4 | 12 | CI run 37893646215 (`create-site`, `092176c1`) | `bad014c0` (create-site run 37892059181 green) .. `092176c1`; this is Task 7's range, T7 | `create-site` step "Install, typecheck, and build the scaffolded site": the baked site's `format:check` warns on `src/routes/healthz/server.test.ts` | Yes, by root cause. The defect is the unformatted showcase file Task 7 added, which T7's `format:check` leg catches. The `create-site` job itself is a CI workflow with no leg in the gate; T7 selects the nearest local legs, the showcase `format:check`, `check:template`, `test:emit`, and `npm test -w packages/create-cairn-site`. |
| I5 | 8 | CI run 37896194676 (`create-site`, `c3d2952c`) | The same defect as I4, still red at `c3d2952c` (its own diff only added an allowlist entry); green again at `92325c02` (run 37898484892). Introducing range: T7 | Same step and same file as I4 | Yes, by the same root cause as I4. |

### Excluded rows

| Row | Floor | Source | Class | Reason |
|---|---|---|---|---|
| X1 | 1 | CI run 37921783208 (`tool`, `a4618437`) | external | govulncheck, below |
| X2 | 2 | CI run 37919832098 (`tool`, `df8857d9`) | external | govulncheck, below |
| X3 | 3 | CI run 37913407414 (`tool`, `666aff41`) | external | govulncheck, below |
| X4 | 4 | CI run 37904581839 (`tool`, `cca4bced`) | external | govulncheck, below |
| X5 | 5 | CI run 37899677829 (`tool`, `12027522`) | external | govulncheck, below |
| X7 | 7 | CI run 37898484804 (`tool`, `92325c02`) | external | govulncheck, below |
| X9 | 9 | CI run 37896194793 (`tool`, `c3d2952c`) | external | govulncheck, below |
| X13 | 13 | CI run 37893646229 (`tool`, `092176c1`) | external | govulncheck, below |
| X15 | 15 | CI run 37892059175 (`tool`, `bad014c0`) | external | govulncheck, below |
| X17 | 17 | CI run 37889524495 (`tool`, `4597aa49`) | external | govulncheck, below |
| X18 | 18 | CI run 37884784678 (`tool`, `f5ef5f03`) | external | govulncheck, below |
| X19 | 19 | CI run 37881429363 (`tool`, `a2a88a75`) | external | govulncheck, below |
| X20 | 20 | CI run 37875629682 (`tool`, `5549fda8`, the first failing push) | external | govulncheck, below |
| X24 | 24 | HISTORY bullet 4 | external | The same govulncheck failure, described by HISTORY. Wording verified, below. |
| X11 | 11 | CI run 37893646318 (`test`, `092176c1`) | external | Cancelled at "Run npx playwright install --with-deps chromium firefox". The job started 06:27:50Z and was cancelled at 12:28:48Z, about six hours, so the install hung and no check ran. Not a diff-caused red. |
| X14 | 14 | CI run 37892059444 (`e2e`, `bad014c0`) | environmental flake | `e2e/spellcheck.spec.ts:20` failed on all three attempts (`.cm-lintRange-info` stayed at 0 for the 60 s `toPass` window; the worker streams a 1.5 MB dictionary into wasm); 347 passed. Evidence it is not diff-caused: the same spec failed in archive gate log `e153a4bcbf6696e3` (2026-10-06, a full gate on an unrelated pass, 21 failed = 20 `site-visual` drift plus this spec); the next push `092176c1` passed `e2e` (run 37893646527) with a diff that touches nothing the spec reaches; local F at `12027522` passed all 328; CI on `b835fe30` (run 38071788402) listed `e2e/spellcheck.spec.ts:20` among the 4 flaky tests that passed only on retry. See the note below on this row. |
| X22 | 22 | HISTORY bullet 2 | reviewer-only | The diff reviewer's fix rounds on Tasks 1, 2, 6, and 11 (Task 11's `nested` placement reached two dialogs under the wrong label). No gate failed and no CI run exists; no test covered the label, so no selection could have caught it. |
| X23 | 23 | HISTORY bullet 3 | reviewer-only | The close reviewers found publish-all could revert `main` and Save re-enabled during a successful save's reload. No gate or CI run failed; both were found by reading. |

**Counts.** Floor 24 = 6 included items (5 rows) + 18 excluded items (18 rows). Selection misses:
none among the included rows, 0 of 5.

**Item 24, verified (govulncheck, not Go lint).** The `tool` workflow's failing step is govulncheck.
All 13 failing `tool` logs (items 1 to 5, 7, 9, 13, 15, 17 to 20) were read with
`gh run view <id> --log-failed`: each carries 27 `Vulnerability #` blocks naming the same nine
advisories (GO-2026-6603, 6605, 6607, 6608, 6610, 6611, 6612, 6613, 6617) and the lint line
`0 issues.` The floor's parenthetical on item 1 ("Go lint: http.Client.Do / http.Header.Add in
`fetchrobots.go`, `transport.go`") is govulncheck's own call-stack trace, printed as `##[error]`
lines; it is not a lint finding. HISTORY bullet 4 is accurate. The red came from the runner's
preinstalled go1.26.8, not from the diff: `5549fda8` is a records-only commit and failed too. It
cleared when `8f2fe6da` added `check-latest: true`, and the `tool` run on `d716ec89`
(37938533671) is green.

**Note on X14.** The classifier does not select `spellcheck.spec.ts` for Task 5's range: T5's 11
specs are `access-map`, `admin-referrer`, `capture-transport`, `csrf-origin`, `custom-screen`,
`edit-save-failure`, `golden-path`, `healthz`, `members`, `preview`, and `publish-pending-word`.
That is correct for a diff touching `src/lib/auth-channel`, `src/lib/cloudflare/turnstile.ts`, and
`src/lib/sveltekit/cairn-admin.ts`, none of which the spell-check worker reads. If the conductor rules
X14 an included red instead of a flake, it is a selection miss on T5 for `spellcheck.spec.ts`.

**Seen, not on the floor, not rows.** The S1 boundary's `docs-review-browsers.test.ts` Firefox
timeout (Ledger, "S1 boundary"; one rerun cleared it) and the close's CI `e2e` flake
`edit-save-failure.spec.ts:207` on `b5953af8` (post-mortem, "Final gates"; the rerun passed). Both
are flakes, and `b5953af8` is a merge commit outside every task range.

## Part 4: the projection

Written at the close from part 2's durations. **A model, not a measurement.** Pass A's gate counts by
kind, priced at the newly measured durations, plus a CI wait per `auth-data` task at the measured CI wall
plus queue, plus pass A's unchanged review, fix, and close rows. Pass B's scored clock is the real measure.

**Inputs.**

- Gate counts: the 18 ranges of part 1 (12 plan tasks, the close's three gates, the S2 boundary's three fix
  rounds), each at the legs part 1 selected for it. The boundary full gates of pass A (about 45 minutes each
  and 3.3 hours in all) are not priced, because CI at the pushed commit replaces them.
- Leg prices, fitted to part 2: a fixed 71 s (package, `test:emit`, tool-heuristics, showcase boot, tellgrader,
  vale rules), 11.5 s per `check:close` step (the selection's static count minus the five extras), 270 s for the
  node projects (every range runs them), 22 s for a selected component run and 235 s for the whole project, 10 s
  for `create-cairn-site` (a 3.3 s Vitest run in the pass A archive), 188 s plus 1.14 s a test for e2e (337
  tests in the whole suite, per `playwright test --list`; the spec lists use the same listing), and 90 s for
  `make -C tool check`. Two prices are assumed: the tool check (no pass A log timed it) and the per-test e2e
  rate outside the two fitted points. The fit prices range A at 1,017 s against 977 s measured (4 percent over)
  and range B at 1,459 s against 1,506 s (3 percent under).
- CI wait: the test job's 663 s plus the longest queue seen, 1,232 s, which is 1,895 s (31.6 min) per read, one
  read per `auth-data` task (Tasks 1, 3, 4, 8, 9, 10, 11, and 6) and one for the close, nine in all.
- Unchanged rows from pass A's post-mortem and the gate economy inputs. Task work and review: a 60-minute chain
  less the 40-minute midpoint of its 30-to-50-minute gate, so 20 minutes for each of 12 tasks. Fix-round work
  (without the gate, which is priced above): 15 minutes for each of pass A's four reviewer rounds and three S2
  fix rounds. The close's reviewers, smoke, and key probe: 1.5 hours as reported. The close fix chains' work
  without their gates: 1.0 hour (pass A's 3.5 hours less about 2.5 hours of gates and lock waits).

**Gate rows, priced.**

| Kind | Count | Priced total | Notes |
|---|---|---|---|
| Plan-task gates | 12 | 14,697 s (245 min) | 17 to 25 min each; 5 of the 18 ranges run the whole e2e suite and 8 the whole component project |
| Close gates (simplify, two fix chains) | 3 | 4,033 s (67 min) | |
| S2 fix-round gates | 3 | 2,930 s (49 min) | |
| **Gates** | **18** | **21,660 s (361 min, 6.0 h)** | mean 20 min a gate |

**The total.**

| Row | Minutes | Basis |
|---|---|---|
| Gates | 361 | priced above |
| CI wait, 9 reads at 31.6 min | 284 | no overlap with the next task; an upper bound |
| Task work and review, 12 at 20 min | 240 | pass A, unchanged |
| Fix-round work, 7 at 15 min | 105 | pass A, unchanged |
| Close reviewers, smoke, key probe | 90 | pass A, unchanged |
| Close fix chains, work only | 60 | pass A, unchanged |
| **Total** | **1,140 (19.0 h)** | |

**Against the 9-hour target: a miss.** The model gives 19.0 hours with a serial CI wait per `auth-data` task.
Two variants bracket it. With the CI waits hidden behind the next task's work, as the sequential runner
pipelines them, only the close's read stays on the path: 888 minutes (14.8 h). With no queue at all (663 s a
read, nine reads): 955 minutes (15.9 h). All three miss. The unchanged non-gate rows alone are 495 minutes
(8.25 h), so 9 hours was reachable only if gates and CI together stayed under 45 minutes. Gate rows fall,
from about 12.5 hours in pass A (about ten chains at 30 to 50 minutes, the boundary gates, the close gate
runs) to 6.0 hours, but this pass's levers do not touch the task work, review, or fix rows. Pass A measured
about 28 hours of wall time from its first commit; its executing session from Task 3's relaunch was about
17 hours, and Tasks 1 and 2 ran before the relaunch, so the like-for-like comparison is the 28-hour wall.

**What would close the gap, for pass B's plan to weigh:** the node projects (a fixed 270 s in all 18 ranges,
81 minutes of the 361), the five heavy checks (about 265 s a range), the five ranges that run the whole e2e
suite on a fail-closed path (about 26 minutes over a selected run), and the double package build (about 20 s
a range). None changes the review rows.
