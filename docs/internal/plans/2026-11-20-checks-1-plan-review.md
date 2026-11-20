# Plan review: `checks-1`

One `standards:plan-reviewer` read (Opus at `medium`) of the plan at commit `201938418`, through the
mechanics and feasibility lens, on 2026-11-20. Verdict: not ready, three blocking findings. Every
finding is folded into the plan; the plan's "Plan review fold" says where.

## Blocking

- **B1. The install check breaks held CI and the release workflow.** `missingInstalls` refuses
  when `examples/showcase/node_modules` is absent. `test.yml:51` (`npm run check`) and `:84`
  (`npm run check:package`) run before the showcase install at `:106-110`, and `publish.yml:170`
  runs `npm run check:package` after a root `npm ci` alone. The plan ran the check before every
  build. Fold: run it for the `close` group only, as today, and widen the held-CI probe to every
  workflow with an install column.
- **B2. The task order leaves the fast lane red.** T2a's package.json cases fail until T2b
  rewrites the scripts. T2b deletes `CLOSE_COMPONENTS`, `PACKAGE_PREFIX`, and `closeSteps` while
  `gate-tier.mjs:62`, `gate-tier.test.ts:25`, and `close-ci-coverage.test.ts:4-5` still import
  them, and a missing named ESM export fails at link time, so `fast-lane.mjs` can't run. Fold:
  merge T2b and T4 into one Opus task, and move the package.json-direction cases into it.
- **B3. About a dozen cases can't keep their assertions.** The full-tier order case
  (`gate-tier.test.ts:590`), the docs-gate order case (`docs-gate.test.ts:34`), the raw commands
  read from `extraCommands` (`gate-tier.test.ts:228`, `:237`, `:251`, `:256`, `:261`, `:739-744`),
  the space-quoting case (`:275-277`), and `close-prebuilt.test.ts:89`, `:120`, and the
  `closeSteps` cases (`:20-79`). Fold: give each group a member order, and add a per-case
  table of old and new assertions.

## Should-fix

- **S1.** "No buckets means none" reverses today's fail-closed rule (`gate-tier.mjs:394-396`), and
  the plan never names the fast lane's universe; `check:theme` with no args exits 2. Fold: the
  universe is the close rows plus the rows with buckets, and today's rule stays.
- **S2.** The spawned `check-run` fixture meets the install check in CI. Fold: pass `exists: () =>
  true`, as `close-prebuilt.test.ts:248` does.
- **S3.** #370's release note is deleted on a string check, and a prefix `NODE_OPTIONS=` drops a
  caller's value (the docs eval cases pass `--node-options`). Fold: one light-lane close run first,
  and append the caller's value after the cap.
- **S4.** Every lane after T2a runs the whole close, since the new files are read by no check, and
  T2b and T4 are under-estimated. Fold: budget the lanes and re-estimate.
- **S5.** The route lists #406 and #429 as rewords; the structure design's backlog rows list them
  as folds. Fold: build both, and record the conflict under Decisions.
- **S6.** `--prebuilt` is both kept and searched for as retired, and has no caller. Fold: drop it.
- **S7.** No acceptance step runs the docs gate for real. Fold: T6 runs both forms, and the close
  reruns it after the review fold.
- **S8.** The #489 confirmation step proves nothing. Fold: the elimination grep, with `grep -c
  localhost src/tests/unit/gate-mail.test.ts` printing 0, and the backlog worded as "name lookup
  removed; outage cause unconfirmed". The reviewer probed that `listen(0, '127.0.0.2')` binds and
  that a cross-host redirect drops `Authorization`.

## Nits

- **N1.** State a row run's argument order and quoting.
- **N2.** The registry case must allow `run.mjs <group>` for the two group scripts.
- **N3.** #540a's test lives in `scripts/build/emit-definitions.test.mjs`, not under `src/tests`.
- **N4.** The review file didn't exist yet. This is it.
- **N5.** T2a copies buckets unchanged; the two new buckets come later.
- **N6.** Item 3's amendment is acceptable; a temp-tree spawn would keep it verbatim. Not taken.

## Confirmed

The 44-row count, the three greps reaching 0, the engine pin surviving when built from
`GROUPS['docs-gate']`, held CI's build behavior per `npm run` step, the T2a and T3 file split, and
the #489 loopback fix.
