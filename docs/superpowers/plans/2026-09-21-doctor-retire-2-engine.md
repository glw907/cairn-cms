# retire-2: the engine pass (the doctor leaves, the `0.97.0` cut is unblocked)

> **For agentic workers:** nine tasks in three segments. Tasks 1 through 8 run as the per-task
> chain (`cairn-implementer` on `sonnet`, then `diff-reviewer` on `claude-opus-5`, then the full
> gate inside the chain). Task 9, the close, is authored by one fold agent with one independent
> `diff-reviewer` read. At nine tasks the plan names `~/.claude/workflows/pass-execute.js` as the
> execution mode; the task table marks the two genuinely independent tasks and names the contended
> resource everywhere else. Every `file:line` below was re-verified against this worktree's tree at
> `ddf8d9f0` during pre-flight; re-verify at dispatch, because the pre-task lands between this
> plan's writing and this pass's branch point.

**Date:** 2026-09-21.

**Spec:** [`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`](../specs/2026-09-21-doctor-retirement-design.md),
the "retire-2: the engine pass" section, its Close, and the "Pre-task and retire-2" acceptance
bullets. This plan carries retire-2 only. The pre-task
([`2026-09-21-doctor-pretask.md`](2026-09-21-doctor-pretask.md)) and retire-1 (the Go pass) are
other plans, and their outputs are preconditions here, never work.

**Inputs:** [`docs/internal/record/2026-09-21-doctor-retirement-inventory.md`](../../internal/record/2026-09-21-doctor-retirement-inventory.md)
(the engine-side survey; the spec corrects it in places, and the Pre-flight findings below correct
both).

---

## Pre-flight findings

Every claim below was re-verified against this worktree at `ddf8d9f0`. Findings marked
**EXTENDS** or **CONTRADICTS** change what a task must do; the tasks are written against the truth,
not against the spec's line numbers.

### Verified as the spec states

- **The removal predicate.** `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates
  examples` returns 79 hits outside `package-lock.json`, grouped by owning task in the
  "Removal-predicate hit groups" table below. `templates/` and `examples/` return zero hits, as the
  inventory says.
- **`src/lib/doctor/` is sixteen files**, exactly the inventory's list.
- **`check-symbols.mjs`'s `doctorCheckIds`** is declared at `scripts/checks/check-symbols.mjs:361`,
  reads `src/lib/doctor` with `readdirSync` at `:362-364`, and is called at `:441`. The spec's
  `:361-374` is one line short of the function's true end (`:375`). Its prose also names
  `src/lib/doctor/` at `:28`, `:261`, and `:353`, and cites `docs/reference/doctor.md`'s own
  "Check" / "Condition" table columns at `:357-358`.
- **`transcript-blocks.mjs` `PAGE_FLOORS`** is at `:32-35`: `docs/admin/create-your-site.md: 3`
  (`:33`) and `docs/admin/is-it-working.md: 1` (`:34`). The floors are enforced at `:469-478`.
- **Three scaffolder print sites.** `packages/create-cairn-site/src/scaffold.mjs:249`,
  `src/cloudflare/chapter2.mjs:805`, and `bin.mjs:88`'s `doctorLine`. `doctorLine` is consumed from
  **five** closing blocks, confirmed: `bin.mjs:102`/`:121`, `:154`/`:164`, `:180`/`:190`,
  `:208`/`:214`, and `:262`/`:263`. Its doc comment sits at `bin.mjs:74` and `:80-81`, and a second
  prose mention at `:146`.
- **The string-assertion tests.** `src/cloudflare/chapter2.test.mjs:1852`, `:1860`, `:1887`;
  `test/resume-chapter2.test.mjs:320` and `:446`; `test/resume-cloudflare.test.mjs:174`.
  `src/substitute.test.mjs:184` is the twin assertion against
  `src/lib/doctor/site-config-path.json`, with `src/substitute.mjs:15`'s comment naming it.
- **`readAdapterFacts`'s doctor-only fields** are `owner` (`src/lib/vite/internal.ts:292`), `repo`
  (`:294`), and `from` (`:296`). `mediaBucketBinding` (`:301`), `roles` (`:306`), and `aiPosture`
  (`:311`) already exist on `main` and are the facts writer's inputs, so the pre-task adds the
  writer, not the fields. `readAdapterFacts` is declared at `:350`; its only non-test caller today
  is `src/lib/doctor/bin.ts:60-61`.
- **The CHANGELOG window.** `## Unreleased` is `CHANGELOG.md:1`; `## 0.96.0` is `:2504`. Every
  entry the spec names was re-found by content: `:185`, `:251`, `:332-337`, `:1401` (the status
  vocabulary and exit code 3, running through `:1427`'s `Consumers must:` line), `:2169`, `:2251`,
  `:2326`.
- **The ledger format** is `docs/internal/engine-rulings.md:8-22`, gated by
  `scripts/checks/check-rulings-format.mjs`. Its allowlist,
  `scripts/checks/check-rulings-format-allowlist.json`, holds exactly one slug
  (`audit-cli-create-cairn-site-cost-narrative-chapter-1-consent-email-adm`), which is not a
  doctor entry, so no doctor entry this pass touches is excused from the `Shape:` rule.

### EXTENDS or CONTRADICTS the spec

1. **CONTRADICTS: twelve inbound references to `docs/reference/doctor.md`, not seven.** Eleven are
   markdown links; one is a bare path. Verified, with the retarget each needs:

   | Site | Form |
   | --- | --- |
   | `docs/admin/is-it-working.md:20` | link, "The full command reference is [`cairn-doctor`]" |
   | `docs/extend/README.md:132` | link, inside "Three reference pages serve the admin track" |
   | `docs/extend/rotate-the-github-app-key.md:97` | link to `#the-checks` |
   | `docs/extend/security-model.md:288` | link to `#the-opt-in-live-probe` |
   | `docs/extend/sign-in-through-your-organization.md:114` | link to `#the-opt-in-live-probe` |
   | `docs/extend/upgrade-cairn.md:54` | link |
   | `docs/extend/migration-notes.md:151` | bare path with `#status-vocabulary`, inside a past-version entry |
   | `docs/reference/cli-cairn-media-seed.md:83` | link |
   | `docs/reference/core.md:1092` | link, inside the `Editor` row |
   | `docs/reference/guidance.md:155` | link |
   | `docs/reference/README.md:55` | link, the subpath list |
   | `docs/reference/README.md:86` | link, the "Also for site admins" list |

   `migration-notes.md:151` sits in a past-version entry, which the spec puts out of scope; it is
   the one hit that stays as written, and the task says so rather than editing it.

2. **EXTENDS: `check:facts` resolves every `Source:` pointer's path and line range, so roughly
   fifty facts bullets go red the moment `src/lib/doctor/` is deleted.** Verified in
   `scripts/checks/check-facts.mjs:302-314` (`validatePointer` reads the resolved file and range-checks
   each cited line) and `:223-240` (`resolvePointerPath`, a literal path then a basename fallback
   that a deleted file cannot satisfy). Doctor hits per container file: `facts/admin.md` 28
   (`:13`, `:32`, `:41-58` are eighteen consecutive bullets whose `Source:` is
   `src/lib/doctor/*`), `facts/extend.md` 18 (`:64`, `:65`, `:118`, `:234`, `:265`, `:266`,
   `:300`, `:343`, `:344`, `:345`, `:357`, `:395`, `:399`, `:400`, `:411`, `:413`, `:457`,
   `:458`), `facts/reference.md` 24 (including the whole `## docs/reference/doctor.md` section at
   `:469-566`, plus `:780-785`, `:896`, `:1138`, `:1188`). The spec names facts bullets only as an
   addition. This repair is gate-blocking and gets its own task (Task 6).

3. **EXTENDS: the allowlist re-grounding is six entries, not four.** The spec names
   `check-symbols-allowlist.mjs` `:36`, `:69`, `:83`, `:106-107`. Verified and corrected:
   - `:36` `env-var:CAIRN_GITHUB_APP_ID`, reason cites `docs/reference/doctor.md`.
   - **`:37` and `:38`** (`_INSTALLATION_ID`, `_PRIVATE_KEY_B64`) say "same CI workflow", which is
     doctor.md's workflow. The spec misses both; they fall with `:36`.
   - `:69` `log-event:editor.email`, reason cites doctor.md.
   - `:83` `log-event:tidy.enabled`, reason cites doctor.md.
   - `:106-107` is the comment above **`:109`** `file-path:src/site.config.yaml`, grounded in the
     `03-doctor-credentialed.txt` transcript that `is-it-working.md` quotes. The entry itself is
     `:109`; the spec cites only the comment lines.

4. **EXTENDS: `cli-flag:--repo` (`:21`) must be removed, not reworded.** Its reason is
   "cairn-doctor's own flag", and no other engine bin declares `--repo`; after the removal the
   entry excuses a token no shipped CLI carries, which the allowlist's own header rule at `:1-8`
   forbids ("an entry with no reason is how a gate quietly stops gating"). `cli-flag:--from`
   (`:20`) survives on `cairn-media-seed` alone, and `cli-flag:--help` (`:23`) on the three
   remaining bins; both reasons need their doctor clause cut. The header comment at `:11` names
   `cairn-doctor` in its bin list.

5. **EXTENDS: deleting `02-doctor-bare.txt` requires deleting its "Deliberately unconsumed"
   bullet.** `packages/create-cairn-site/test/fixtures/transcripts/README.md:149-150` is that
   fixture's only citation; `transcript-blocks.mjs:480-491` reports a `fixture-uncited` violation
   for an unlisted fixture, and an orphaned bullet naming a deleted file is the same check's
   staleness. `03-doctor-credentialed.txt` is cited by `is-it-working.md:30`, the page's only
   transcript block, so the floor of 1 is met only if the replacement block lands in the same
   change.

6. **EXTENDS: regenerating `01-create-cairn-site.txt` and `01d-resume.txt` risks
   `create-your-site.md`'s floor of 3.** That page quotes `01` twice (`:35`, `:55`) and `01d` once
   (`:136`), and `docs/internal/facts/admin.md:29` asserts "three blocks, two fixtures" by name. The
   doctor line sits at `01-create-cairn-site.txt:58` and `01d-resume.txt:969`, outside all three
   quoted regions. A regeneration must leave the three quoted regions byte-identical, or the floor
   and the facts bullet both go red.

7. **EXTENDS: `check-idioms.mjs:323-325` cites a file that leaves.** Its
   `DOTTED_IDENTIFIER_ALLOWANCES` comment grounds `github.app` in two declaring sites,
   `src/lib/diagnostics/conditions.ts` and `src/lib/doctor/checks-github.ts`. The condition stays
   and the allowance stays; the second source must go.

8. **EXTENDS: `docs/reference/README.md` lists the page twice** (`:55` and `:86`), and
   `scripts/checks/check-arm-indexes.mjs` gates the arm index. `check:arm-indexes` is not in the
   spec's gate list and belongs there.

9. **EXTENDS: about twenty `audit-cli-*` ledger entries are doctor-touching, not the handful the
   spec's prose implies.** Verified by heading, with the disposition this pass owes each:

   | Line | Slug (short) | Current verdict | This pass |
   | --- | --- | --- | --- |
   | 4955 | `...skill-admin-screens-check-and-cairn-doctor-fix` | retire | progress note (already executed) |
   | 5009 | `...edge-https-forced-and-edge-hsts` | reshape | note: a `cairn health` check, post-adoption |
   | 5043 | `...admin-mount-shape-check` | reshape | amend: ported to `cairn doctor` |
   | 5051 | `...ai-posture-effective-check` | keep | amend: ported, facts-dependent |
   | 5058 | `...config-tidy-key-check-and-its-active-anthropic-probe` | reshape, **open** | close: dropped |
   | 5066 | `...no-help-on-any-of-the-five-commands` | reshape | amend: four bins become three |
   | 5082 | `...auth-role-wiring-check` | keep | amend: ported, facts-dependent |
   | 5110 | `...config-csrf-disable-check` | reshape | amend: ported |
   | 5118 | `...cairn-doctor-send-test-opt-in-live-email-send` | keep | amend: deferred to 1.x |
   | 5126 | `...cairn-media-seed-bucket-and-the-wrangler-r2-buckets-resoluti` | keep | amend: its `Verdict:` and `Any-site case:` both cite `bin.ts:12 imports readR2Buckets from ../doctor/wrangler-config.js`, the old path |
   | 5133 | `...cairn-doctor-probe-opt-in-live-admin-sign-in-probe` | keep | close: login-envelope arm dropped, workers.dev arm deferred |
   | 5161 | `...config-public-origin-check` | keep | amend: file half ported |
   | 5203 | `...cairn-doctor-shell-report-format-exit-codes` | keep | amend: superseded by the tool's frozen convention |
   | 5217 | `...cairn-doctor-flag-set-env-fallbacks-three-source-derivation` | keep | close: superseded by `cairn doctor [<dir>]` |
   | 5246 | `...email-sender-onboarded-check` | keep | note: a `cairn health` check, post-adoption |
   | 5254 | `...github-app-check` | keep | close: dropped |
   | 5276 | `...config-site-config-check` | reshape | amend: the narrowing |
   | 5312 | `...auth-store-auth-role-vocabulary-auth-email-normalization-d1-` | keep | amend: deferred to 1.x |
   | 5326 | `...config-bindings-config-media-bucket-config-observability` | keep | amend: ported; media-bucket gains its own remediation |
   | 5347 | `...config-dependency-floors-check` | reshape | amend: hand-rolled in Go, lockfile order preserved |

10. **EXTENDS: `docs-links.mjs:167` maps the retired `docs/guides/cloudflare-readiness.md` to
    `docs/admin/is-it-working.md`.** Unaffected by this pass, recorded so a task does not
    mistake it for a doctor mapping that must move.

11. **EXTENDS: `src/tests/unit/delivery-media-vite-barrel-prune.test.ts:102-103` pins
    `readAdapterFacts` and `AdapterFacts` as internal barrel exports.** Trimming the three fields
    does not break it, but it is the tripwire that fails if a task deletes either name.

12. **EXTENDS: four source comments the spec names carry no `lib/doctor` token** and are found by
    a bare `doctor` grep, not the removal predicate: `src/lib/sveltekit/guard.ts`,
    `src/lib/sveltekit/condition-response.ts`, `src/lib/dev-flag.ts`, `src/lib/delivery/robots.ts`.
    A task running only the predicate grep will miss all four.

### Removal-predicate hit groups

`grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples`, minus
`package-lock.json`, grouped by owning task.

| Group | Sites | Task |
| --- | --- | --- |
| `src/lib/media-seed/{assemble,bin,index}.ts`, `src/tests/unit/media-seed.test.ts` (`:16`, `:325`, `:337`, `:358`, `:370`, `:535`), `src/tests/unit/emit-template-tree.test.ts:52`, `packages/create-cairn-site/src/substitute.mjs:15`, `substitute.test.mjs:184` | the shared reader and the path twin | 2 |
| `package.json:36`, `:183`; all sixteen `src/lib/doctor/*`; the ten `src/tests/unit/doctor-*.test.ts`; `src/lib/components/CairnTidySettings.svelte:629`; `src/lib/sveltekit/csrf.ts:71`; `src/lib/vite/{assemble,bin,index,internal}.ts`; plus the four bare-`doctor` comment sites of finding 12 | the removal | 3 |
| `scripts/checks/check-symbols.mjs` (`:28`, `:261`, `:353`, `:362`), `check-symbols-allowlist.mjs` (`:11`, `:20`, `:21`, `:23`, `:36-38`, `:69`, `:83`, `:106-109`), `check-idioms.mjs:323`, `check-rulings-format.mjs:65` | the script gates | 3 |
| `packages/create-cairn-site/bin.mjs` (`:74`, `:80-81`, `:88`, `:146`), `src/scaffold.mjs:249`, `src/cloudflare/chapter2.mjs:805`, `chapter2.test.mjs` (`:1852`, `:1860`, `:1887`), `test/resume-chapter2.test.mjs` (`:320`, `:446`), `test/resume-cloudflare.test.mjs:174`, the four transcript fixtures, `transcripts/README.md` (`:4`, `:78`, `:79`, `:149-150`) | the scaffolder | 4 |

`scripts/checks/check-rulings-format.mjs:65` is a hardcoded slug in a repair-tracking list, not a
doctor dependency; Task 3 leaves it and Task 8 rules on it.

---

## Header

| Field | Value |
| --- | --- |
| **Goal** | `cairn-doctor` leaves the engine: the bin, `src/lib/doctor/`, the printed commands, the docs, the facts, the changelog window, and the ledger. The pass ends with one STATUS line saying the `0.97.0` cut is unblocked. |
| **Spec** | `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, the "retire-2" section, its Close, and the "Pre-task and retire-2" acceptance bullets. |
| **Preconditions (all four, checked before Task 2)** | (1) the `tool/v1.1.0` **tag** exists on origin; (2) its **GitHub release** exists on origin with the `tool` workflow green on its SHA; (3) the pre-task is merged to `main`, so `scripts/build/emit-tool-conditions.mjs`, `check:tool-conditions`, `src/content/.cairn/site-facts.json`'s writer, its reference page, and the two `conditions.ts` rewordings are all present; (4) retire-1 is merged to `main`. Task 1 builds the machine check for (1) and (2); (3) and (4) are verified by the conductor with `git log origin/main -- tool/ scripts/build/emit-tool-conditions.mjs` before branching. |
| **Branch and worktree** | Branch `doctor-engine`, cut off the **`tool/v1.1.0` merge SHA on `origin/main`** (the merge commit, not the tag object). Worktree `.claude/worktrees/doctor-engine`. |
| **Worktree setup, mandatory** | A from-scratch `npm install` in the worktree's `examples/showcase` before any showcase build or e2e is trusted. `examples/showcase/node_modules` symlinks back to the main checkout and otherwise proves **main's** engine, not this worktree's (CLAUDE.md, "a worktree showcase e2e proves MAIN's engine"). `rm -rf examples/showcase/node_modules examples/showcase/package-lock.json`, `npm install` at the root, then `npm install --prefix examples/showcase`. |
| **Token ceiling** | **3.2M**. The 80 percent decision point is **2.56M**, checked at each segment boundary, the only place a decision can land. |
| **Checkpoint interval** | Four tasks. Scheduled checkpoints after Task 4 and after Task 8, plus a STATUS write at every segment boundary. |
| **Execution mode** | Nine tasks, so `~/.claude/workflows/pass-execute.js` is the mode. Per-task chain: `cairn-implementer` (`model: sonnet`), then `diff-reviewer` (`model: claude-opus-5`), then the full gate **inside the chain**. One re-dispatch on a `fix` verdict; a second `fix` is the conductor's decision. Task 9 is the fold agent, not an implementer. |
| **Parallelism** | Tasks 7 and 8 are the only genuinely independent pair; every other task is serialized and names its contended resource in its own block. |
| **Segments** | Three, each ending on a gate-green commit. **A:** 1, 2, 3 (ends with the source removal green). **B:** 4, 5, 6 (ends with every docs and facts gate green). **C:** 7, 8, 9. The spec says "about seven tasks in two segments"; this plan counts nine and the workstation rule caps a segment at three to four, so three segments. |
| **Merge** | By PR. Before the PR, `git merge origin/main` into `doctor-engine` and re-gate; `docs/STATUS.md` is the expected conflict. |

### The gate

Gates run through `cairn-run-gate '<command string>'`. **On exit 75, re-issue the same command
unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints before
the next dispatch.

**One full gate at a time**, this pass's and any other session's: the runner is cgroup-capped at 8G
and a browser-bearing gate is what the cap is for. **Heavy lane** (the default, no env var) for
Tasks 2, 3, 4, and the post-merge re-gate. **`CAIRN_GATE_LANE=light`** for Tasks 1, 5, 6, 7, and 8,
which launch no browser; the light lane takes its own lock and a 3G cap, so it never queues behind
another session's browser gate.

**The full gate list for this pass**, the spec's list plus the three the pre-flight added:

- The two roots: `npm run check` (0 errors, 0 warnings) and `npm test` (exit 0).
- Package and surface: `check:package`, `check:surface --update`, `check:self-use`,
  `check:custom-surface`, `check:dev-package`, `check:chassis-boundary`, `check:cm-internals`.
- Docs and reference: `check:reference`, `check:reference:signatures`, `check:docs`,
  `check:arm-indexes` (**added, finding 8**), `check:facts`, `check:readiness`, `check:symbols`,
  `check:snippets`, `check:transcripts`, `check:prose`, `check:vale`, `check:comments`,
  `check:rulings-format`, `check:editor-quotes`, `check:visuals`, `check:target-stack`.
- Craft and admin: `check:idioms`, `check:invisible-craft`, `check:admin-css-classes`.
- Version and template: `check:version`, `check:template`, `test:emit`, and
  `npm --prefix packages/create-cairn-site test` (after the `template/` bake, as `test.yml` does it).
- Tool mirrors: `check:tool-conditions` (from the pre-task) and `check:tool-heuristics` (new in
  Task 3).
- Consumer-facing: `check:consumers`, then the showcase's `npm --prefix examples/showcase run
  check`, `check:cairn`, `test:unit`, and `format:check`.

**Sequencing, mandatory.** `npm test`, `check:custom-surface`, and `check:consumers` all repackage
`dist`, so they run strictly sequentially, never concurrently with each other.

**Scope.** A per-task gate may be scoped to that task's blast radius, and each task names its scope.
The **full list runs at the end of Task 3, at the end of Task 6, and again at Task 9** after the
merge from `main`, plus on CI.

**`tool.yml` path-triggers on `src/lib/diagnostics/conditions.ts` and `docs/admin/is-it-working.md`,
so an engine PR touching either also runs the Go gate. That is expected, not a fault.**

### Two standing gotchas

- **The worktree showcase gotcha**, above, is mandatory before Task 3's and Task 4's gates.
- **The baseline gotcha.** Visual baselines are CI-canonical. A local `CI=1 test:e2e` is green when
  its only visual failures are exactly the files the latest CI regen commit rewrote; anything else
  is a real red. **No task in this pass should move a baseline at all**: nothing here changes
  rendered admin markup except one sentence of body copy in `CairnTidySettings.svelte`. **A visual
  baseline move is therefore a halt, not a classification exercise**, and committing a locally
  generated baseline is forbidden.

### The conductor's rules

- **The conductor never reads a source file, a diff, a test log, or a gate transcript during
  execution.** It consumes each implementer's report and each `diff-reviewer` verdict and decides
  only accept, re-dispatch with a correction, split, upshift, or stop. A conductor caught reading
  diffs flags itself and dispatches.
- **Before each dispatch, the live-executor sweep.** `git -C <path> status --porcelain` is empty for
  every entry `git worktree list` reports except `doctor-engine` itself; `pgrep -f
  .claude/worktrees/doctor-engine` returns nothing; warm uncommitted code this pass did not author
  is stop-and-investigate, never free progress.
- **One executor per worktree.** No docs pass and no site pass shares `doctor-engine`.

### Releases

**This pass does not cut `0.97.0` and does not bump a version.** It finalizes its `CHANGELOG.md`
entry under `## Unreleased`, leaves `package.json`'s `version` untouched, runs no `npm version`, no
`gh release create`, and no publish. The cut is a later, separate act that this pass's close
unblocks.

### Halts

Stop, write STATUS, and ask one combined question on any of these. Everything else runs to
completion with no check-in.

- **Task 1's release check red.** A missing `tool/v1.1.0` tag or a missing GitHub release stops the
  pass before any removal commit.
- Any red gate that a single fix round does not clear. A second `fix` verdict from `diff-reviewer`
  is the conductor's decision, not an automatic third dispatch.
- Any visual baseline move.
- A `docsAnchor` in `conditions.ts` that `check:readiness` can no longer pin to a heading, since
  this pass deletes no registry entry and lowers no floor.
- The 80 percent ceiling flag tripping at a segment boundary.

### Pass-end reviewer fan-out

Matched to what this diff actually contains, which is a deletion, a file move, and prose.

- **`web-auth-security-reviewer` runs.** The removal takes out the containment helper
  (`src/lib/doctor/bin.ts:46`'s `readFileUnderCwd`), the live sign-in probe
  (`check-probe.ts`), and the live send (`check-send.ts`), and it rewords comments in
  `src/lib/sveltekit/csrf.ts` (`:71` documents a caller that will no longer exist),
  `src/lib/sveltekit/guard.ts`, and `src/lib/sveltekit/condition-response.ts`. The one question
  worth an independent skeptical read is whether any auth, CSRF, or guard **behavior** changed
  rather than only its documentation. The expected verdict is that none did; a finding to the
  contrary is a halt.
- **`svelte-reviewer` does not run.** The pass touches exactly one `.svelte` file,
  `CairnTidySettings.svelte:629`, and only the body copy inside an existing `<div>`. No rune, no
  load function, no action, no prop, and no reactivity changes. A Svelte 5 correctness lens over a
  sentence rewrite is spend with no finding available to it.
- **`daisyui-a11y-reviewer` does not run.** No markup structure, no class, no token, no ARIA, and
  no focus behavior changes anywhere in the diff. `cairn-admin.css` is untouched.
- **`cloudflare-workers-reviewer` does not run.** The pass **deletes** Cloudflare API and D1 calling
  code (`checks-cloudflare.ts`, `cloudflare-api.ts`, `check-send.ts`) and adds none. No Worker
  code, no binding, no D1 query, no migration, and no `wrangler.jsonc` in this repo changes. There
  is no new edge-runtime surface for the lens to grade.
- **`code-simplifier`** (plugin agent, pins Opus) runs at Task 9 over the code this pass changed,
  which is Task 2's relocated module and Task 3's trimmed `AdapterFacts`. The docs, facts,
  changelog, and ledger tasks change no code and are not read by it.

---

## Task table

| Task | Runs as | Segment | Independent of | Contended resource when serialized |
| --- | --- | --- | --- | --- |
| 1, the release precondition check | implementer chain, light lane | A | everything (it adds one new file) | none; it must land **first** because its red result stops the pass |
| 2, the shared reader's relocation | implementer chain, heavy | A | 1 | `src/lib/doctor/wrangler-config.ts` and `site-config-path.json`, which Task 3 deletes |
| 3, the removal and the script gates | implementer chain, heavy | A | nothing | the whole source tree; `check:symbols` crashes the instant `src/lib/doctor/` goes |
| 4, the scaffolder | implementer chain, heavy | B | nothing | the four transcript fixtures, which Task 5's page quotes |
| 5, the published docs arms | implementer chain, light | B | nothing | `docs/admin/is-it-working.md`'s transcript floor, met only once Task 4's fixtures settle |
| 6, the facts container | implementer chain, light | B | nothing | `check:facts` resolves pointers into the tree Task 3 deleted and the pages Task 5 rewrote |
| 7, the `## Unreleased` window | implementer chain, light | C | **8** | `CHANGELOG.md` only |
| 8, the ledger | implementer chain, light | C | **7** | `docs/internal/engine-rulings.md` only |
| 9, the close | fold agent, then one `diff-reviewer` | C | nothing | `docs/STATUS.md` on `main`, held by another session |

Tasks 7 and 8 touch disjoint files, run disjoint gates (`check:version` against the changelog;
`check:rulings-format` against the ledger), and neither reads the other's output. `pass-execute.js`
may take them in parallel. Every other pair is serialized for the reason its row names.

---

## Task 1: the release precondition check

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Light lane.

**Files:** `scripts/checks/check-tool-release.mjs` (new), `package.json` (one script entry),
`src/tests/unit/check-tool-release.test.ts` (new).

**Deliverable count:** 2 (the script, its test). Under four.

**Outcome.** A committed gate that asserts the `tool/v1.1.0` tag **and its GitHub release** exist on
origin, exiting nonzero when either is absent. It is wired as an npm script the pass can invoke by
name, and the plan runs it **before any removal commit**. A red result stops the pass.

**Constraints.**

- The script checks **both** facts. A tag alone can exist on a branch that never merged, and a
  release alone cannot exist without a tag, so the release is the stronger of the two and neither
  substitutes for the other.
- The tag check reads **origin**, not the local ref store, so a stale local clone cannot pass it.
- The script is **not** added to `npm run check`. It is a pass precondition, not a standing CI gate;
  every future CI run would query GitHub for a fact that never changes again. It is invoked by name.
- It degrades honestly with no network or no `gh` auth: it exits nonzero and says which fact it
  could not establish, never exits 0 on an unknown.
- The version it checks is a constant in the script, not an argument, so the assertion is committed
  rather than supplied at the call site.

**Acceptance criteria.**

- `node scripts/checks/check-tool-release.mjs` exits 0 against the real origin, and its output names
  both the tag and the release. Command: `node scripts/checks/check-tool-release.mjs; echo "exit:$?"`.
- The unit test proves a nonzero exit for each of three cases with the GitHub reads stubbed: tag
  absent, tag present and release absent, and the read itself failing. Command:
  `npx vitest run src/tests/unit/check-tool-release.test.ts`.
- `npm run check:tool-release` resolves. Command: `npm run check:tool-release`.
- `npm run check` stays 0/0 and the new script is absent from its composition. Command:
  `node -p "require('./package.json').scripts.check"` shows no `check:tool-release`.
- Scoped gate green: `npm run check`, `npm test`, `check:comments`, `check:version`. Command:
  `cairn-run-gate 'CAIRN_GATE_LANE=light npm run check && npm test && npm run check:comments && npm run check:version'`.

**Implementer's report shape.** Files touched; the gate result verbatim; the real-origin exit and
its output; decisions the plan did not cover; anything it could not do.

**Halt:** the real-origin run exits nonzero. That is the precondition failing, and the pass stops
there.

---

## Task 2: the shared wrangler reader's relocation

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.

**Files:** `src/lib/doctor/wrangler-config.ts` (moves), `src/lib/media-seed/` (the new home),
`src/lib/media-seed/assemble.ts:6`, `src/lib/media-seed/bin.ts:12`,
`src/lib/media-seed/index.ts:2`, `src/tests/unit/media-seed.test.ts` (`:16`, `:325`, `:337`,
`:358`, `:370`), `src/tests/unit/emit-template-tree.test.ts:52`,
`src/lib/doctor/site-config-path.json` (leaves),
`packages/create-cairn-site/src/substitute.mjs:15`,
`packages/create-cairn-site/src/substitute.test.mjs:184`,
`src/tests/unit/doctor-checks-local.test.ts:465` (its read of the leaving JSON).

**Deliverable count:** 3 (the module move and trim, the JSON consolidation, the media-seed
acceptance spawn). Under four.

**Outcome.** `readR2Buckets` and `R2BucketEntry` live under `src/lib/media-seed/`, their one
remaining consumer, trimmed to those two exports with the `DoctorContext['readFile']` type inlined
so nothing under `media-seed/` imports a doctor type. The engine's copy of `site-config-path.json`
is gone and `packages/create-cairn-site`'s copy is the one source, with `substitute.mjs`'s comment
and `substitute.test.mjs`'s twin assertion re-grounded on that fact. `cairn-media-seed` still reads
R2 buckets from a real wrangler config.

**Constraints.**

- **This task does not delete `src/lib/doctor/`** and does not touch the bin entry. It moves what
  Task 3 cannot delete, so that Task 3's deletion is a clean `rm`.
- The doctor's own checks still import the reader while this task's commit stands. Whether that is a
  temporary re-export from the old path or a direct import of the new one is the task's choice; the
  criterion is that the tree is green at this commit and that Task 3 has nothing left to preserve.
  The task states its choice in its report.
- The relocated module keeps the doctor's **line-anchored shallow read**, not a TOML parser, and
  keeps jsonc winning silently when both wrangler files exist. This is the behavior retire-1 ported
  to Go from `wrangler-config.ts:213-282`; a change here would diverge the two.
- `src/tests/unit/doctor-checks-local.test.ts:465` reads the leaving JSON. It is a doctor test that
  Task 3 deletes wholesale, so this task does the minimum to keep it green at this commit and says
  so, rather than investing in a file about to go.
- `emit-template-tree.test.ts:52`'s comment cross-reference is reworded to the new path, not
  deleted; the comparison it draws (the emitter's narrower reader against the tolerant one) is still
  true.
- The read-from-the-source rule applies: **one copy of the site-config path**, not two. The
  scaffolder's copy is it.

**Acceptance criteria.**

- `grep -rn 'lib/doctor/wrangler-config\|doctor/site-config-path' src packages scripts` returns
  nothing.
- `src/lib/doctor/site-config-path.json` does not exist:
  `test ! -e src/lib/doctor/site-config-path.json; echo "exit:$?"` prints `exit:0`.
- The relocated module exports exactly `readR2Buckets` and `R2BucketEntry` and imports nothing from
  `src/lib/doctor/`. Command: `grep -rn "from '.*doctor" src/lib/media-seed/` returns nothing.
- **The built bin spawn**, the `delivery-data-dist-spawn` precedent: `npm run package`, then spawn
  the built `dist/media-seed/bin.js` under plain Node against a fixture site carrying an
  `r2_buckets` entry, and assert it resolves the bucket. The assertion lives in
  `src/tests/unit/media-seed.test.ts` and runs on CI unconditionally, never behind a `skipIf`.
- `npm --prefix packages/create-cairn-site test` green, including `substitute.test.mjs`.
- Scoped gate green, heavy lane: `npm run check`, `npm test`, `check:package`, `check:surface
  --update`, `check:reference`, `check:reference:signatures`, `check:comments`, `check:symbols`,
  `check:idioms`, `check:template`, `test:emit`, and the scaffolder suite. Command:
  `cairn-run-gate 'npm run check && npm test && npm run check:package && npm run check:surface -- --update && npm run check:reference && npm run check:reference:signatures && npm run check:comments && npm run check:symbols && npm run check:idioms && npm run check:template && npm run test:emit && npm --prefix packages/create-cairn-site test'`.

**Implementer's report shape.** Files touched; the re-export-versus-direct-import choice and why;
the gate result verbatim; the spawn assertion's output; decisions the plan did not cover; anything
it could not do.

---

## Task 3: the removal, and the script gates that break with it

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.

**Files.** `package.json` (`:36`'s `chmod` and `:183`'s bin entry); `src/lib/doctor/**` (deleted);
the ten dedicated tests `src/tests/unit/doctor-{bin,check-floors,check-posture,check-probe,
checks-admin-mount,checks-cloudflare,checks-github,checks-local,derive,run}.test.ts` (deleted);
`src/lib/vite/internal.ts` (`:289`, `:292`, `:294`, `:296`, `:316-322`, `:345`, and the field reads
at `:363-365`); the facts writer's test file the pre-task created (gains
`doctor-derive.test.ts:213-327`'s `readAdapterFacts` coverage);
`src/lib/components/CairnTidySettings.svelte:629`; `src/lib/sveltekit/csrf.ts:71`;
`src/lib/sveltekit/guard.ts`; `src/lib/sveltekit/condition-response.ts`; `src/lib/dev-flag.ts`;
`src/lib/delivery/robots.ts`; `src/lib/vite/{assemble,bin,index}.ts`;
`src/lib/media-seed/{assemble,index}.ts`; `src/tests/unit/media-seed.test.ts:535`;
`scripts/checks/check-symbols.mjs` (`:28`, `:261`, `:353-375`, `:441`);
`scripts/checks/check-symbols-allowlist.mjs` (`:11`, `:20`, `:21`, `:23`, `:36-38`, `:69`, `:83`,
`:106-109`); `scripts/checks/check-idioms.mjs:323-325`; a new committed check-id list file under
`scripts/checks/`; `scripts/checks/check-tool-heuristics.mjs` (new); `package.json` (the
`check:tool-heuristics` script); `src/tests/unit/check-symbols.test.ts`;
`src/tests/unit/check-tool-heuristics.test.ts` (new).

**Deliverable count: 6. FLAGGED, over four.** The six are: the bin and directory removal; the
`AdapterFacts` trim and its test migration; the comment rewordings including the tidy sentence; the
`check-symbols` id-vocabulary move; the allowlist re-grounding; and `check:tool-heuristics` with its
`// WATCH:` comments. They are one task because **a task must end gate-green and `check:symbols`
crashes on `readdirSync` of a deleted directory the instant the removal lands**
(`check-symbols.mjs:362-364`). Splitting them produces a task that cannot be proven. The conductor
should expect this to be the pass's largest dispatch and consider `model: opus` if the first
implementer report hedges on the id vocabulary.

**Outcome.** `cairn-doctor` is gone from the engine: no bin, no source, no dedicated tests, no
stale comment naming it. Every script gate that read `src/lib/doctor` reads a committed list
instead. A new gate fails if any of the four symbols the Go heuristics key on disappears from
`src/lib`.

**Constraints.**

- **`check:tool-release` runs green before the first removal commit.** Command:
  `npm run check:tool-release`. A red result stops the pass.
- **No `REGISTRY` entry in `src/lib/diagnostics/conditions.ts` is deleted.**
  `config.tidy-key-missing` and `admin.login-probe-failed` become unraised and stay, because
  `check:readiness` pins each to a frozen-page heading. `github.app-unreachable` keeps its runtime
  raiser at `src/lib/github/credentials.ts:20`. Task 8 files their eventual removal to
  `ROADMAP.md` for the docs rebuild.
- **The check-id vocabulary becomes a committed list the script reads**, replacing
  `doctorCheckIds`'s directory walk. The list holds the eleven surviving ids plus the deferred and
  dropped ids docs history still cites, so a page quoting a retired check id does not become a
  hallucination. The eleven, from the spec: `config.bindings`, `config.observability`,
  `config.csrf-disable`, `config.public-origin`, `config.site-config`,
  `config.no-referrer-blanket`, `config.dependency-floors`, `admin.mount-shape`,
  `config.media-bucket`, `auth.role-wiring`, `ai.posture-effective`. The deferred and dropped set
  the list must also carry, derived from what the arms cite: `auth.store`, `auth.role-vocabulary`,
  `auth.email-normalization`, `edge.https-forced`, `email.sender-onboarded`, `github.app`,
  `config.tidy-key`, `admin.login-probe`. The task verifies that set against what the docs actually
  cite after Task 5, or states plainly that it seeded the list from this plan and that Task 5's gate
  is the proof.
- **The allowlist re-grounding**, per pre-flight finding 3 and 4: `:36`, `:37`, and `:38` lose their
  `docs/reference/doctor.md` grounding or the entries go; `:69` and `:83` likewise; `:106-109`'s
  entry is re-grounded on the new `cairn doctor` transcript Task 5 captures, or removed; `:21`
  (`cli-flag:--repo`) is **removed**, since no shipped bin declares it; `:11`, `:20`, and `:23` lose
  their `cairn-doctor` clause while the entries survive on the other bins. **Every surviving entry
  keeps a true reason**, which is the allowlist's own rule at `:1-8`.
- **`check:tool-heuristics`** fails when any of the four symbols retire-1's Go heuristics key on
  disappears from `src/lib`: `CairnAdminShell`, `.shellLoad`, `createAuthGuard`'s argument shape,
  and `checkOrigin: false`. Each symbol carries a co-located `// WATCH:` comment naming the gate, so
  the next editor sees the dependency in context. The gate joins `npm run check`.
- **`AdapterFacts` keeps `mediaBucketBinding`, `roles`, and `aiPosture`** and loses `owner`, `repo`,
  and `from`. Its doc comment at `internal.ts:289` and `adapterFactsSource`'s at `:316-322` are
  reworded to name the facts writer, not the doctor. **`readAdapterFacts` and `AdapterFacts` are not
  deleted**: `src/tests/unit/delivery-media-vite-barrel-prune.test.ts:102-103` pins both names, and
  the pre-task's facts writer is the surviving caller.
- **`doctor-derive.test.ts:213-327`'s `readAdapterFacts` coverage moves to the facts writer's
  tests** before that file is deleted. `deriveMissingInputs` and `DerivationSources`
  (`assemble.ts:120`, `:145`) leave with the directory and their coverage goes with them.
- **`CairnTidySettings.svelte:629`**: the sentence telling an editor to run `cairn-doctor` is
  rewritten to stop at "reload this page". It does not point at `cairn doctor` instead:
  `config.tidy-key` no longer exists in any tool, so nothing confirms the key. `check:prose` gates
  the result, and the change is body copy inside the existing element, with no class or structural
  edit.
- **The four bare-`doctor` comment sites of pre-flight finding 12** (`guard.ts`,
  `condition-response.ts`, `dev-flag.ts`, `delivery/robots.ts`) are reworded even though the
  removal-predicate grep does not find them. Each names `cairn doctor` or the condition, whichever
  is true.
- `scripts/checks/check-rulings-format.mjs:65`'s hardcoded slug is a repair-tracking entry, not a
  doctor dependency. This task leaves it alone.

**Acceptance criteria.**

- `npm run check:tool-release` exits 0, recorded before the first removal commit.
- **The removal predicate is empty**:
  `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples | grep -v package-lock.json`
  returns nothing. (Task 4's scaffolder hits are the one remaining group; if this task runs before
  Task 4, the criterion is that no hit remains **outside `packages/create-cairn-site`**, and the
  empty-everywhere assertion moves to Task 4's acceptance. The task states which form it proved.)
- `test ! -e src/lib/doctor; echo "exit:$?"` prints `exit:0`.
- `node -p "Object.keys(require('./package.json').bin)"` contains no `cairn-doctor`, and
  `node -p "require('./package.json').scripts.package"` names no `dist/doctor/bin.js`.
- `npm run check:symbols` green with `src/lib/doctor` absent, proving the vocabulary now comes from
  the committed list. Command: `npm run check:symbols`.
- **The new gate goes red on a removed symbol**: rename one of the four watched symbols in a scratch
  copy, run `npm run check:tool-heuristics`, and show the nonzero exit and the message naming the
  symbol. Restore, then show the green run. Both outputs go in the report.
- Every `// WATCH:` comment exists at its symbol:
  `grep -rn 'WATCH:' src/lib | grep -c tool-heuristics` returns 4.
- `npm run check:readiness` green, proving no `docsAnchor` was orphaned and no registry entry left.
- `npm run check:idioms` green with the `github.app` allowance's second source removed.
- **The full gate list is green**, the whole list under "The gate", run sequentially where the
  sequencing rule applies. This is one of the three tasks where the full list runs.
- **No visual baseline moves.** `git status --porcelain examples/showcase/` shows no
  `*-snapshots/` change.

**Implementer's report shape.** Files touched; the removal-predicate output verbatim; the two
`check:tool-heuristics` runs (red and green) verbatim; how the check-id list was seeded and which
ids it carries; which allowlist entries were re-grounded and which were removed, one line each with
the reason; the full gate result; decisions the plan did not cover; anything it could not do.

**Halt:** a `check:readiness` failure (it would mean a registry entry or anchor left that should
not have), a visual baseline move, or a second `fix` verdict.

---

## Task 4: the scaffolder

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.

**Files.** `packages/create-cairn-site/bin.mjs` (`:74`, `:80-81`, `:88`, `:146`);
`packages/create-cairn-site/src/scaffold.mjs:249`;
`packages/create-cairn-site/src/cloudflare/chapter2.mjs:805`;
`packages/create-cairn-site/src/cloudflare/chapter2.test.mjs` (`:1852`, `:1860`, `:1887`);
`packages/create-cairn-site/test/resume-chapter2.test.mjs` (`:320`, `:446`);
`packages/create-cairn-site/test/resume-cloudflare.test.mjs:174`;
`packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt` (deleted);
`.../03-doctor-credentialed.txt` (deleted); `.../01-create-cairn-site.txt` (regenerated);
`.../01d-resume.txt` (regenerated); `.../README.md` (`:4`, `:78-79`, `:149-150`, and its doctor
prose).

**Deliverable count: 4.** The three print sites, the two fixture deletions, the two fixture
regenerations, and the README rewrite, with the test updates riding each. At the limit, not over it.

**Outcome.** The scaffolder prints `cairn doctor` with an install pointer and never detects the
binary. Chapter 2's closing line drops `--from` and `--send-test`, keeps the fact that the
installer just sent a test message, and names `cairn adopt` then `cairn health` as the step that
reaches the https and email checks. The doctor's two golden transcripts leave and the two that
carry the reminder are regenerated.

**Constraints.**

- **The reminder text**, at all three print sites: run `cairn doctor` any time; install with
  `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from the release page, whose
  URL is written **literally**, not assembled at runtime.
- **The scaffolder never detects the binary.** No `which`, no spawn, no conditional message. It
  prints the pointer unconditionally, which is spec ruling 10.
- **Chapter 2's line** keeps "the installer just sent a test message" as a statement of what already
  happened, since the send test lives in the scaffolder and stays there (spec ruling 1). It names no
  re-run command, because none exists until 1.x.
- **The three quoted regions of `01-create-cairn-site.txt` and `01d-resume.txt` stay byte-identical**
  (pre-flight finding 6). `docs/admin/create-your-site.md` quotes `01` at `:35` and `:55` and `01d`
  at `:136`, its floor is 3, and `docs/internal/facts/admin.md:29` asserts the two-fixture,
  three-block shape by name. Only the doctor reminder line changes, at `01-create-cairn-site.txt:58`
  and `01d-resume.txt:969`.
- **`02-doctor-bare.txt`'s "Deliberately unconsumed" bullet goes with the file**
  (`transcripts/README.md:149-150`, pre-flight finding 5). A bullet naming a deleted fixture is
  stale in a file whose whole job is citation bookkeeping.
- **`03-doctor-credentialed.txt` cannot be deleted before its replacement block exists**, because
  `is-it-working.md:30` is the page's only transcript block and its floor is 1. If this task deletes
  it, this task also lands the replacement block; otherwise the deletion moves to Task 5. **The task
  chooses and states which**, and the criterion is that `check:transcripts` is green at this task's
  commit. The plan's recommendation: capture the new transcript here, where the fixture harness
  lives, and let Task 5 write the prose around it.
- **The capture procedure goes in the transcripts README.** How the new `cairn doctor` transcript
  was captured, from the released binary against the scaffolder's fixture site, so the next capture
  is reproducible. The README's invocation table (`:78-79`) and its doctor prose (`:4`) are
  rewritten to match.
- **The floor is not lowered.** `transcript-blocks.mjs:34` keeps `docs/admin/is-it-working.md: 1`.

**Acceptance criteria.**

- `grep -rn 'cairn-doctor' packages/` returns nothing outside `package-lock.json`.
- **The full removal predicate is empty**:
  `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples | grep -v package-lock.json`
  returns nothing. (This is the spec's acceptance bullet; it lands here or at Task 3, per Task 3's
  note.)
- `grep -rn 'go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest' packages/create-cairn-site`
  finds the literal install line, and the release-page URL is present as a literal string.
- `npm --prefix packages/create-cairn-site test` green, all four string-assertion files updated.
- `npm run check:transcripts` green, proving both floors met, no uncited fixture, and no stale
  "Deliberately unconsumed" entry. Command: `npm run check:transcripts`.
- `git diff --stat` on `01-create-cairn-site.txt` and `01d-resume.txt` shows a one-line change each.
- `npm run check:docs` and `npm run check:symbols` green.
- Scoped gate green, heavy lane: `npm run check`, `npm test`, `check:transcripts`, `check:symbols`,
  `check:docs`, `check:facts`, `check:prose`, `check:vale`, `check:template`, `test:emit`, and the
  scaffolder suite.

**Implementer's report shape.** Files touched; which of the two transcript-deletion orderings it
chose and why; the `check:transcripts` output verbatim; the one-line diffs of the two regenerated
fixtures; the gate result; decisions the plan did not cover; anything it could not do.

---

## Task 5: the published docs arms

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Light lane.

**Files.** The 21 files the inventory's section (g) names: **admin (4)**
`is-it-working.md`, `setup-recovery.md`, `troubleshooting.md`, `what-to-run-and-when.md`;
**extend (9)** `README.md`, `add-cairn-to-a-sveltekit-app.md`, `enable-tidy.md`,
`build-a-site-by-hand.md`, `rotate-the-github-app-key.md`, `upgrade-cairn.md`, `security-model.md`,
`migration-notes.md`, `sign-in-through-your-organization.md`; **reference (8)** `README.md`,
`cli-cairn-media-seed.md`, `core.md`, `components.md`, `vite.md`, `doctor.md` (deleted),
`guidance.md`, `sveltekit.md`.

**Deliverable count: 4.** The page deletion and its twelve inbound links; the five stale-step
replacements; `is-it-working.md`'s four sections and its label table; the two per-version extend
records. At the limit.

**Outcome.** No published-arm page instructs a reader to run a command or a flag that does not
exist. `docs/reference/doctor.md` is gone and every inbound reference resolves.

**Constraints.**

- **The narrative-arm freeze holds, with the stale-step allowance.** The admin, editors, and extend
  arms are frozen against rewrites. This task fixes only what is **false**: a missing step, a wrong
  warning, a stale command. No prose is rewritten for its own sake, and nothing here is
  register-graded; it is agent-facing, gated by each page's own gates.
  `docs/extend/migration-notes.md` and `docs/extend/upgrade-cairn.md` are per-version records
  **outside** the freeze and are maintained normally.
- **`docs/reference/doctor.md` is deleted.** Its twelve inbound references (pre-flight finding 1)
  are retargeted to the tool's command page or unlinked, one decision per site.
  **`docs/extend/migration-notes.md:151` is the exception**: it sits in a past-version entry, which
  the spec puts out of scope, and stays as written. The task states that explicitly rather than
  silently leaving it.
- **`docs/reference/README.md` lists the page twice** (`:55` and `:86`). Both go, and
  `check:arm-indexes` is the proof.
- **The five stale-step replacements**, each a truthful verification step, verified against the
  current text:
  - `rotate-the-github-app-key.md` (`:82`, `:91`, `:97`, `:113`, `:128`): publish an edit, then look
    for `github.unreachable` in the logs. `github.app` is dropped and its runtime raiser at
    `src/lib/github/credentials.ts:20` is what remains.
  - `enable-tidy.md` (`:34-35`, `:129`): run one tidy; a bad key fails there with its log event.
    `config.tidy-key` no longer exists in any tool.
  - `sign-in-through-your-organization.md` (`:112`, `:114`): sign in once; read the guard events.
    The login-envelope probe arm is dropped.
  - `add-cairn-to-a-sveltekit-app.md` (`:189`, `:193`, `:196`): `cairn doctor`, then the first
    publish.
  - `build-a-site-by-hand.md` (`:461`, `:655`, `:658`): `cairn doctor`, then the first publish.
  - Also true but not in the spec's list, and fixed under the same allowance because each names a
    command that will not exist: `security-model.md` (`:146`, `:279`, `:287-288`, `:515`),
    `upgrade-cairn.md` (`:47`, `:50`, `:54`, `:57`, `:63`, `:68`), `extend/README.md:88`,
    `admin/troubleshooting.md` (`:5`, `:8`, `:14`, `:30-31`, `:67`, `:70`, `:89`),
    `admin/setup-recovery.md` (`:5`, `:8`), `admin/what-to-run-and-when.md:37`. The task reports
    each as a stale-step fix with its line, so the freeze's boundary stays auditable.
- **`is-it-working.md` keeps every heading.** `check:readiness` pins each `docsAnchor` in
  `conditions.ts` to a real heading, and this pass deletes no registry entry, so deleting a heading
  is an automatic red. The four sections the spec names each gain **one line** saying which command
  checks it now or that none does until 1.x:
  - `## Configure the Tidy API key` (`:349`): no command checks it; run one tidy.
  - `## Install the GitHub App` (`:419`): no command checks it; publish an edit and read
    `github.unreachable`.
  - `## Probe the deployed admin` (`:443`): no command checks it; the login probe is dropped.
  - `## Provision the auth store` (`:373`): deferred to the CLI's 1.x.
  - Two more are reachable only after adoption and get the same treatment, naming `cairn health`:
    `## Force HTTPS at the edge` (`:170`) and `## Onboard the sending domain` (`:222`).
- **The label-to-section table** (`:130-163`) marks the rows for the dropped and deferred checks.
  Every printed label in the surviving rows must still equal its condition's registry `title`,
  which is what retire-1's port preserved.
- **`is-it-working.md`'s running instructions** (`:11-29`) name `cairn doctor` with the install
  pointer, and the transcript block at `:30` quotes the new fixture (Task 4's capture). The
  page's narration of the capture (the `CLOUDFLARE_API_TOKEN` paragraph at `:23-29`, the skip
  arithmetic) is rewritten to describe what the new capture actually shows; a stale narration of a
  replaced capture is exactly the false-step the allowance covers.
- **The facts bullets the spec names as additions** go in Task 6, with the repair. This task writes
  no facts container file.
- Vale runs Google on the admin/extend/reference arms. A replacement step that trips a new Vale
  error is fixed in the same task, not allowlisted.

**Acceptance criteria.**

- `test ! -e docs/reference/doctor.md; echo "exit:$?"` prints `exit:0`.
- `grep -rn 'reference/doctor' docs --include='*.md' | grep -v '^docs/internal/' | grep -v '^docs/superpowers/'`
  returns exactly one line, `docs/extend/migration-notes.md:151`, with its past-version exemption
  stated in the report.
- `grep -rn 'cairn-doctor' docs/admin docs/extend docs/reference docs/editors docs/why-cairn.md`
  returns nothing, except inside `migration-notes.md`'s past-version entries (`:23`, `:147`,
  `:151`, `:190`, `:382`, `:386`), which the report enumerates.
- `npm run check:readiness` green, proving every heading survived and every anchor still resolves.
- `npm run check:docs`, `npm run check:arm-indexes`, `npm run check:snippets`,
  `npm run check:symbols`, `npm run check:transcripts`, `npm run check:vale`, `npm run check:prose`,
  `npm run check:editor-quotes`, `npm run check:visuals` all green.
- `npm run check:reference` and `npm run check:reference:signatures` green with the page gone,
  proving the doctor carried no exported subpath (the inventory's section (a)).
- **The full gate list is green.** This is the second of the three tasks where it runs, at the end of
  Segment B, together with Task 6's commit.
- Every changed page is reported with its line and the false statement it replaced.

**Implementer's report shape.** Files touched; one line per retargeted or unlinked reference with
its decision; one line per stale-step fix with the false statement it replaced; the `check:readiness`
output; the gate result; decisions the plan did not cover; anything it could not do.

**Halt:** a `check:readiness` failure, or a Vale error a truthful replacement cannot avoid without
rewriting frozen prose.

---

## Task 6: the facts container

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Light lane.

**Files.** `docs/internal/facts/admin.md` (28 doctor hits, `:13`, `:32`, `:41-58`),
`docs/internal/facts/extend.md` (18 hits, `:64`, `:65`, `:118`, `:234`, `:265`, `:266`, `:300`,
`:343`, `:344`, `:345`, `:357`, `:395`, `:399`, `:400`, `:411`, `:413`, `:457`, `:458`),
`docs/internal/facts/reference.md` (24 hits, including the whole `## docs/reference/doctor.md`
section at `:469-566`, plus `:29`'s transcript assertion in `admin.md`, `:780-785`, `:896`,
`:1138`, `:1188`).

**Deliverable count: 2** (the repair, the additions). Under four, but the repair spans roughly fifty
bullets across three files, so the conductor should size the dispatch for volume rather than
complexity.

**This task exists because of pre-flight finding 2, which the spec does not carry.**
`check:facts` resolves every `Source:` pointer's path and line range
(`scripts/checks/check-facts.mjs:302-314`, `:223-240`), so every bullet sourced to
`src/lib/doctor/*` goes red the moment Task 3 lands. The repair is gate-blocking.

**Outcome.** Every facts bullet resolves against the tree as it now stands, and the container
records what this pass changed.

**Constraints.**

- **Complete-or-move, per bullet, verified against the code first.** Three dispositions and no
  fourth:
  - **Delete**, when the claim is no longer true because the subject is gone (most of
    `admin.md:41-58`'s condition-id bullets sourced to `checks-local.ts` and `checks-cloudflare.ts`;
    the whole `reference.md` `## docs/reference/doctor.md` section, whose page is deleted).
  - **Re-source**, when the claim is still true of a surviving subject at a new location (a
    condition id that lives in `src/lib/diagnostics/conditions.ts`, a wrangler-reader claim that now
    resolves under `src/lib/media-seed/`).
  - **Restate**, when the claim is true of the Go tool instead. A restated bullet's `Source:` must
    resolve inside **this** repo, which `tool/` does, so a pointer into `tool/internal/doctor/` is
    legitimate; a pointer at a cairn.pub URL is not.
- **The format is the container's own**, `docs/internal/facts/README.md`: one claim, a `Source:`
  resolving to `path:line`, exactly one status tag, tag last. A bullet whose truth this task cannot
  establish gets a `[candidate: ...]` tag, never a `[verified]` it did not earn.
- **`admin.md:29`'s transcript assertion** ("three blocks, two fixtures") must still be true after
  Task 4's regeneration, or it is re-sourced. Task 4's constraint keeps the three quoted regions
  byte-identical, so the expected outcome is that it stands unchanged; the task verifies rather than
  assumes.
- **`reference.md:780-785`'s arm-index bullets** assert `docs/reference/README.md:74-83` names
  `doctor.md` among the admin-serving pages and among the eight subpath-less pages. Both counts
  change with Task 5. The bullets are re-sourced to the new line ranges and the new counts.
- **The additions the spec names**: facts bullets in `admin.md`, `extend.md`, and `reference.md`
  recording the removal, the replaced verification steps, and `site-facts.json` as new engine
  surface. The `site-facts.json` bullet may already exist from the pre-task; the task checks and
  does not duplicate it.
- **This task writes no published-arm page.** Task 5 owns those, and it runs first.

**Acceptance criteria.**

- `npm run check:facts` green. Command: `cairn-run-gate 'CAIRN_GATE_LANE=light npm run check:facts'`.
- `grep -rn 'src/lib/doctor' docs/internal/facts/` returns nothing.
- `grep -rn 'reference/doctor' docs/internal/facts/` returns nothing.
- Every bullet this task touched is reported with its disposition (delete, re-source, restate) and,
  for a restate, the new `Source:` pointer.
- No bullet gained a `[verified]` tag without a pointer the task resolved by reading the file.
- **The full gate list is green** at this commit, closing Segment B.

**Implementer's report shape.** Files touched; a disposition count per file (deleted / re-sourced /
restated); the full list of restated bullets with their new pointers; the `check:facts` output; the
gate result; decisions the plan did not cover; anything it could not do.

---

## Task 7: the `## Unreleased` window

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Light lane.
**Independent of Task 8.**

**Files.** `CHANGELOG.md` only, the `## Unreleased` window (`:1` to `:2503`).

**Deliverable count: 2** (the seven reconciliations, the removal entry). Under four.

**Outcome.** The `0.97.0` notes do not say the doctor both gains features and leaves. One removal
entry carries the whole story and its `Consumers must:` line.

**Constraints.**

- **Line numbers are as surveyed and are re-found by content**, not trusted. Verified at
  `ddf8d9f0`, one disposition each:
  - **`:2251`**, migration `0004`'s `Consumers must:` telling operators to run the `auth.store`
    check before deploy, is rewritten to `wrangler d1 migrations list`, because `auth.store` runs
    nowhere at `0.97.0`.
  - **`:1401` through `:1427`** (the four-status vocabulary, exit code 3, and its `Consumers must:`
    line), **`:2169`**, and **`:2326`** (probe changes) fold into the removal entry as superseded.
  - **`:185`** and **`:251`** reword the actor to `cairn doctor`.
  - **`:332-337`** repoints to the scaffolder's path file, since the engine's copy left in Task 2.
  - **`:509-517`**'s claim that transcript `03` stays is corrected; the true range is `:510-516`,
    and the claim sits at `:516`.
- **The removal entry's `Consumers must:` list**, verbatim in substance: install `cairn`; replace
  `npx cairn-doctor` with `cairn doctor`; test for a nonzero exit; build once on `0.97.0` so
  `site-facts.json` exists; expect no App probe, no tidy-key check, no login probe, no D1 checks,
  and no send re-run.
- **The entry states what the survey found**: no site scripts the doctor; four wrangler configs and
  three config comments cite it; one installed guidance copy in `aksailingclub-org` refreshes on the
  next `cairn-guidance install`; site plan history is left alone.
- **`cairn-pub`'s hardcoded `/docs/reference/doctor` link**
  (`src/routes/(site)/docs/+page.svelte:67` in that repo) is **filed to cairn-pub**, not fixed here.
  This pass never edits another repo. Task 8 puts the ROADMAP line.
- **No version is set and no heading moves.** `check:version` enforces the `release-size` marker
  against the window, and the number is set at the cut, not here.
- **A fold, not a deletion.** A superseded entry's substance survives inside the removal entry; the
  window must still let a reader reconstruct what happened across the whole `0.96.0`-to-`0.97.0`
  span.

**Acceptance criteria.**

- `npm run check:version` green. Command:
  `cairn-run-gate 'CAIRN_GATE_LANE=light npm run check:version'`.
- `grep -n 'cairn-doctor' CHANGELOG.md | awk -F: '$1 < 2504'` returns only lines inside the removal
  entry, each naming the retired command as history, and the report enumerates them.
- The removal entry carries a `Consumers must:` line with all five clauses above.
- No entry in the window still asserts that the doctor gains a feature at `0.97.0`.
- `npm run check:docs`, `npm run check:symbols`, `npm run check:vale` green over the changed file.
- `git diff --stat package.json` is empty.

**Implementer's report shape.** Files touched; one line per reconciled entry with its line as
re-found by content and its disposition; the removal entry's `Consumers must:` list verbatim; the
gate result; decisions the plan did not cover; anything it could not do.

---

## Task 8: the ledger

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Light lane.
**Independent of Task 7.**

**Files.** `docs/internal/engine-rulings.md`, `ROADMAP.md`.

**Deliverable count: 3** (the nine new entries, the twenty amendments, the ROADMAP lines).
Under four by count; large by volume.

**Outcome.** Every ruled item of the spec has its entry, every affected `audit-cli-*` entry is
closed, amended, or given a progress note by name, and `ROADMAP.md` carries what this pass deferred.

**Constraints.**

- **The format is the ledger's own**, `engine-rulings.md:8-22`: a heading plus labeled lines, with
  `Verdict:`, `Reopens on:`, `Record:`, and, **on every reshape and retire entry, a `Shape:` line of
  its own**, never a parenthetical folded into `Reopens on:`. `check:rulings-format` gates it.
  `scripts/checks/check-rulings-format-allowlist.json` holds one slug and none of this pass's
  entries is on it, so no entry is excused.
- **Nine new entries**, one per ruled item: the retirement; `github.app` dropped (substitute: the
  `github.unreachable` runtime event; gap and reopening evidence: a never-published site);
  `config.tidy-key` dropped (ground: it false-fails a correctly deployed site whose key is a Worker
  secret the CLI cannot see, the defect the old `checks-local.ts:310-318` recorded); the
  login-envelope probe dropped; the workers.dev exposure arm deferred; the send re-run deferred; the
  three D1 reads deferred; the `config.site-config` narrowing; `site-facts.json` as new engine
  surface.
- **Twenty `audit-cli-*` amendments**, the table in pre-flight finding 9, each by name with the
  disposition that table gives. Two need care:
  - **`audit-cli-config-tidy-key-check-and-its-active-anthropic-probe`** (`:5058`) is an **open**
    reshape with a live `Shape:` line describing work that will now never be done. It is **closed**,
    and its `Reopens on:` says what would reopen the check itself, not the reshape.
  - **`audit-cli-cairn-media-seed-bucket-and-the-wrangler-r2-buckets-resoluti`** (`:5126`) cites
    `bin.ts:12 imports readR2Buckets from ../doctor/wrangler-config.js` in **both** its `Verdict:`
    and its `Any-site case:` lines. Both are corrected to the Task 2 path. The verdict stays
    `keep`; only the evidence's path is wrong.
- **`ROADMAP.md` lines**, in the tier where each bites: the three D1 reads, the send-test re-run,
  and the workers.dev exposure arm, filed **beside the agent-permission check** where the
  write-credential question is ruled; the two unraised registry entries
  (`config.tidy-key-missing`, `admin.login-probe-failed`) filed for the docs rebuild; and the
  cairn-pub `/docs/reference/doctor` link filed to cairn-pub.
- **ROADMAP is a pass dimension.** Any item this pass **shipped** is removed from the live tiers, not
  only marked. A roadmap that still lists shipped work is not done.
- **No entry is deleted from the ledger.** An entry is closed, amended, or annotated; the record of
  what was once ruled is the point of the file.

**Acceptance criteria.**

- `npm run check:rulings-format` green. Command:
  `cairn-run-gate 'CAIRN_GATE_LANE=light npm run check:rulings-format'`.
- Nine new headings exist, each with `Verdict:`, `Reopens on:`, `Record:`, and, where the verdict is
  reshape or retire, a `Shape:` line of its own. Command:
  `grep -c '^## ' docs/internal/engine-rulings.md` is nine higher than at `HEAD~`.
- Every slug in pre-flight finding 9's table is present in the diff. Command:
  `git diff HEAD~ -- docs/internal/engine-rulings.md | grep -c 'audit-cli-'` covers all twenty, and
  the report lists them by name.
- `grep -n 'doctor/wrangler-config' docs/internal/engine-rulings.md` returns nothing.
- `ROADMAP.md` carries the six filed items and lists nothing this pass shipped.
- `npm run check:docs` and `npm run check:vale` green over both files.

**Implementer's report shape.** Files touched; the nine new slugs; the twenty amended slugs with
one line of disposition each; the six ROADMAP lines with their tiers; anything removed from
ROADMAP; the gate result; decisions the plan did not cover; anything it could not do.

---

## Task 9: the close

**Runs as:** **one fold agent**, which commits its own draft and then folds, followed by **one
independent `diff-reviewer` read (`model: claude-opus-5`) over the fold's diff**. Not an implementer
dispatch. The conductor reads the reviewer's verdict, not the diff.

**Files.** `docs/HISTORY.md`, `ROADMAP.md`, `docs/STATUS.md`, this plan file (the post-mortem),
`docs/internal/docs-friction-log.md`.

**It migrates nothing else.** No STATUS-to-HISTORY migration of unrelated history, no arm rewrite,
no backlog reorganization beyond this pass's own items.

**Order.**

1. **`code-simplifier`** (plugin agent, pins Opus) over the code this pass changed: Task 2's
   relocated module and Task 3's trimmed `AdapterFacts`. Apply its refinements, then proceed.
2. **`web-auth-security-reviewer`** over the whole diff, on the one question named in the header's
   fan-out section: did any auth, CSRF, or guard **behavior** change, as opposed to its
   documentation. A finding that behavior changed is a halt.
3. **Friction-log triage** on `docs/internal/docs-friction-log.md`, complete-or-move: fixed and
   deleted, promoted to the `ROADMAP.md` tier where it bites, or deleted as no longer true after
   verifying against the code.
4. **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate caught,
   and **what a later pass would be wrong to rediscover from scratch**. The last clause carries this
   pass's real lessons: that `check:facts` resolves pointers into deleted source, that the
   `check-symbols` directory walk was the gate that crashed first, and that the `02-doctor-bare.txt`
   citation lived in a README bullet rather than a page.
5. **`ROADMAP.md`** reconciled: this pass's shipped items removed from the live tiers, Task 8's
   filed items confirmed present.
6. **`git merge origin/main`** into `doctor-engine`. `docs/STATUS.md` is the expected conflict.
7. **Re-gate after the merge with the FULL gate list**, the whole list under "The gate", sequentially
   where the sequencing rule applies. Then open the PR and merge it on green CI.
8. **Message whichever session holds `main`** before the STATUS write. The B2 conductor was
   `cairn-cms-2f` on 2026-09-21; confirm who holds it now rather than assuming. Two conductors never
   both write STATUS on one branch.
9. **The STATUS line, written last and written once.** `docs/STATUS.md` gains, under its immediate
   next action, the single line **"the `0.97.0` cut is unblocked"**, naming **the `tool/v1.1.0` tag**
   and **this removal's merge SHA**. retire-2's close is the **only** writer of that line; B2's close
   says only that the tool's 1.0 is merged, tagged, and released.
10. **The post-mortem** appended to this plan file, with both budget scores: tokens against the 3.2M
    ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).

**Acceptance criteria.**

- The PR is merged and CI on `main` is fully green on the exact merge SHA. Command:
  `gh run list --commit "$(git rev-parse origin/main)" --json workflowName,conclusion,status`. An
  absent run counts as red.
- `docs/STATUS.md` is at or under 60 lines, present tense, and carries the unblock line exactly
  once. Commands: `wc -l docs/STATUS.md`; `grep -c '0.97.0 cut is unblocked' docs/STATUS.md`
  returns 1.
- The unblock line names both the `tool/v1.1.0` tag and the merge SHA, and both resolve:
  `git rev-parse tool/v1.1.0` and `git cat-file -t <sha>`.
- `git ls-tree origin/main src/lib/doctor` prints nothing, and
  `node -p "Object.keys(require('./package.json').bin)"` at `origin/main` shows no `cairn-doctor`.
  These are the two checks the cut's own precondition will run.
- `docs/HISTORY.md` has this pass's entry, newest first, carrying the rediscovery clause.
- The friction log's triage is complete-or-move, with every entry either gone or promoted.
- The `diff-reviewer` read over the fold's diff returns accept.
- `git diff --stat package.json` shows no `version` change, and `git tag --points-at HEAD` is empty.

**Halt:** a red gate after the merge; a merge conflict in anything other than `docs/STATUS.md`,
`docs/HISTORY.md`, or `ROADMAP.md`; a `web-auth-security-reviewer` finding that behavior changed;
or another session holding `main` that has not acknowledged the handoff.

---

## Sizing

**Nine tasks, which is over the eight-task guideline. Stated plainly rather than absorbed.**

The spec sized retire-2 at "about seven tasks in two segments". Two pre-flight findings added work
the spec does not carry, and neither is optional:

- **The facts container repair (Task 6)** is gate-blocking. `check:facts` resolves every `Source:`
  pointer's path and line range, so roughly fifty bullets go red the instant `src/lib/doctor/` is
  deleted. It cannot be deferred to a later pass, and it cannot be folded into Task 5 without
  producing a task of six deliverables across two gates.
- **The script-gate repairs** could not be their own task, because `check:symbols` crashes the
  moment the directory goes, so they were absorbed into Task 3, which is why Task 3 carries six
  deliverables and is flagged.

**The cut point, if the pass must be split: after Task 6, at the end of Segment B.** Segment B ends
on a commit where every gate is green, the doctor is gone from source, scaffolder, published docs,
and facts container, and the removal predicate is empty. Tasks 7, 8, and 9 are records: the
changelog window, the ledger, and the close. They would become **retire-3**, a short prose-only
pass on `doctor-records` off the retire-2 merge, light lane throughout.

**The recommendation is not to split.** The cut's own precondition (`pre-cut-pass.md`, Task 6's
third gate) requires the removal's `Consumers must:` line to sit in the `CHANGELOG.md` entry on
`main` and requires the unblock STATUS line, both of which live in Tasks 7 and 9. Splitting moves
the pass's whole purpose into the follow-up and leaves `main` in a state where the doctor is gone
but the window still describes it as present, which is the exact incoherence Task 7 exists to fix.
Nine tasks in three segments is the cheaper shape.

**One task is flagged over four deliverables: Task 3, at six.** The reason is structural, not
accretive: a task must end gate-green, and `check-symbols.mjs:362-364`'s directory walk makes the
removal and the gate repair one atomic change. No scope was added to it by adjacency.

---

## Spec coverage

Every retire-2 requirement and acceptance bullet, mapped to the task that carries it.

| Spec requirement (retire-2 section) | Task |
| --- | --- |
| First task commits `scripts/checks/check-tool-release.mjs`, asserting the tag **and** the release; run before any removal commit; red stops the pass | 1 |
| `package.json`: the `cairn-doctor` bin entry and its `chmod` | 3 |
| `src/lib/doctor/**` and the ten dedicated doctor tests | 3 |
| `doctor-derive.test.ts`'s `readAdapterFacts` coverage moves to the facts writer's tests | 3 |
| Ruling 6: `wrangler-config.ts` moves to `src/lib/media-seed/`, trimmed, `DoctorContext['readFile']` inlined | 2 |
| `media-seed/assemble.ts:6`, `bin.ts:12`, and the `media-seed.test.ts` mock repoint | 2 |
| Acceptance spawns the built `cairn-media-seed` bin | 2 |
| Ruling 6: the engine's `site-config-path.json` leaves; the scaffolder's copy is the one source | 2 |
| `CairnTidySettings.svelte:629` rewritten to stop at "reload this page"; `check:prose` gates it | 3 |
| The removal-predicate grep returns nothing outside generated lockfiles | 3 (source), 4 (scaffolder) |
| Comments in `src/lib/vite`, `sveltekit/csrf.ts`, `guard.ts`, `condition-response.ts`, `dev-flag.ts`, `delivery/robots.ts`, and the incidental tests reworded | 3 |
| No `REGISTRY` entry deleted; `config.tidy-key-missing` and `admin.login-probe-failed` stay unraised; `github.app-unreachable` keeps its runtime raiser | 3 (kept), 8 (filed to ROADMAP) |
| `check-symbols.mjs`'s check-id vocabulary moves to a committed list | 3 |
| The `check-symbols-allowlist.mjs` entries excused by `docs/reference/doctor.md` re-grounded or removed | 3 |
| `check:transcripts`' floor of one for `is-it-working.md` met by a new `cairn doctor` transcript from the released binary against the scaffolder's fixture site; capture procedure in the transcripts README; the floor is not lowered | 4 (capture, README), 5 (the block on the page) |
| `check:tool-heuristics` added, failing when any of the four symbols disappears; a `// WATCH:` comment at each | 3 |
| Three scaffolder print sites: `scaffold.mjs:249`, `chapter2.mjs:805`, `bin.mjs:88`'s `doctorLine` | 4 |
| The reminder names `cairn doctor` with the `go install` line and the literal release-page URL | 4 |
| Chapter 2's line drops `--from` and `--send-test`, keeps the sent-test fact, names `cairn adopt` then `cairn health` | 4 |
| Transcripts `02` and `03` leave; `01-create-cairn-site.txt` and `01d-resume.txt` regenerated; the README's doctor prose rewritten | 4 |
| The string-assertion tests and `substitute.test.mjs`'s twin assertion follow | 4 (strings), 2 (the twin) |
| The 21 published-arm files are in scope; `docs/internal` and `docs/superpowers` are not swept; past-version `migration-notes.md` entries are not swept | 5 |
| `docs/reference/doctor.md` leaves; the cross-arm links retargeted or unlinked | 5 |
| A reference page for `site-facts.json` arrives | pre-task (precondition) |
| Five stale-step replacements: `rotate-the-github-app-key.md`, `enable-tidy.md`, `sign-in-through-your-organization.md`, `add-cairn-to-a-sveltekit-app.md`, `build-a-site-by-hand.md` | 5 |
| `is-it-working.md` keeps every heading; four sections gain one line; the label-to-section table marks those rows | 5 |
| Facts bullets in `admin.md`, `extend.md`, `reference.md` | 6 |
| `upgrade-cairn.md`'s live procedure and a new `migration-notes.md` entry | 5 |
| The site upgrade brief's four mentions corrected | 6 (it is `docs/internal/record/2026-09-21-site-upgrade-brief.md`; corrected alongside the container, since both are internal records and share no gate with the published arms) |
| The docs conductor (`cairn-cms-3c`) briefed from the spec | 9 (recorded in the close; no file in this repo carries it) |
| The `## Unreleased` reconciliation, seven named entries plus the removal entry and its `Consumers must:` list | 7 |
| cairn-pub's hardcoded `/docs/reference/doctor` link filed to cairn-pub | 8 |
| Ledger: one entry per ruled item, `Reopens on:` and `Shape:` where required; each affected `audit-cli-*` entry closed, amended, or noted by name, including the open tidy-key reshape and the media-seed import-path entry; `check:rulings-format` joins the gate list | 8 |
| Close: HISTORY, ROADMAP, then the STATUS line naming the tag and the merge SHA, after messaging whichever session holds `main` | 9 |

| Spec acceptance bullet ("Pre-task and retire-2") | Task |
| --- | --- |
| `check:tool-conditions` goes red on a hand-edited mirror, and the third workflow runs it | pre-task (precondition; this pass runs `check:tool-conditions` in its gate list) |
| A build with a changed adapter and a stale `site-facts.json` fails | pre-task (precondition) |
| The removal predicate grep is empty | 3, 4 |
| The built `cairn-media-seed` bin reads R2 buckets | 2 |
| Every gate in the list is green | 3, 6, 9 (the three full-list runs) |
| The ledger entries pass `check:rulings-format` | 8 |
| The facts bullets exist | 6 |
| The `Consumers must:` line exists | 7 |
| The ROADMAP entries exist | 8 |
| No published-arm page instructs a reader to run a command or flag that does not exist | 5 |
| STATUS carries the unblock line, written once, by retire-2's close | 9 |

---

## Post-mortem

Written at pass end by the fold agent. Both budget scores: tokens against the 3.2M ceiling
(`/cost`), and attended time as two counts (planning misses, execution sittings). Record the numbers
even when they look bad; the trend is the signal.
