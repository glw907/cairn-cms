# Engine pass B plan fold: verification read (2026-10-08)

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` at `afa59a46` (read with
`git show`). Inputs: the fold record, the three reviews, the spec, `~/.claude/workflows/pass-execute.js`,
and `~/.claude/skills/pass-core/SKILL.md`. Code read on `main`. Plan line numbers are `afa59a46`'s.
This reader took no part in the review or the fold.

Scope: unclosed blockers and majors, new contradictions, and unproven mechanisms only.

**Counts:** 0 blockers, 1 major, 5 minors.

**Verdict:** needs a second fold, for the one major (a one-line class change). The minors can ride
the same fold or be dropped.

## Major

### V-M1. The C5 coverage stop cannot fire: the runner demotes coverage findings under `engine-logic` (R-M3 not closed)

- **Where:** plan `:30-31` (Task 8 is `engine-logic`), `:356-358` (accept-alone rule excludes C5),
  `:369-371` (stop on a second `fix` with any blocking finding, coverage included, on C5), `:817`
  (Task 8's class).
- **Defect:** the runner enforces the class bar in code. `engine-logic` sets `coverageBlocks: false`
  (`pass-execute.js:264-267`). After every review, `applyClassBar` moves each `coverageOnly`
  finding to `nonBlocking` and turns a `fix` left with nothing blocking into `accept`
  (`pass-execute.js:345-360`, called at `:759` and `:795`). `pass-core/SKILL.md:104-106` states
  the same. The reviewer prompt tells it to set `coverageOnly: true` on any coverage finding with no
  behavior defect (`pass-execute.js:506`). So a missing C5 mutation proof, or a missing
  absent-allowlist case, is accepted on the first review. It never produces a `fix`, so the plan's
  C5 stop rule and its accept-alone exclusion are unreachable. That is the exact failure R-M3
  named: "the C5 floor merges with a coverage hole on its security case." The fold record marks
  R-M3 "folded" on the stop-list wording alone.
- **Proposed fold:** run Task 8 as `passClass: "auth-data"`, so `coverageBlocks: true` holds in
  code. Change the Pass class header (`:27-31`) and Task 8's class line (`:817`). Reduce the
  stop-rule wording at `:356` and `:369-370` to "Task 2, Task 5, or Task 8". Add 0.10M to the chain
  line (`:40`) for the third `auth-data` chain. The cost: a test-only fix round on C13 or D6 runs the
  full gate too. If that cost is unwanted, the alternative is to split C5 into its own `auth-data`
  task, but that adds a task split. A conductor rule that reads Task 8's `batchedNotes` would also
  work, but it lives in prose, not in the runner.

## Minors

### V-m1. Decision 3 gives a false reason: `connect()` mints no token

- **Where:** plan `:259-260` ("never through the provider resolve, which would mint a token in
  production"). The fold record repeats it at C-M1.
- **Defect:** `createGithubApp`'s `connect(env)` returns `makeGithubBackend(config, () =>
  cachedInstallationToken(...))` (`src/lib/github/backend.ts:176-178`). The token getter runs only
  inside a backend method (`:120-124`), so resolving the provider mints nothing. Reading
  `locals.cairnBackend` directly is still the right call, since it is leaner and a production
  request has no `cairnBackend`. Only the stated mechanism is wrong. A reviewer could chase a
  token-mint test that cannot fail.
- **Proposed fold:** replace the clause with "never through the provider resolve: the notice
  describes the dev store, and a production request carries no `cairnBackend`". Optionally add
  one acceptance case where the provider's `connect` throws and the shell load still succeeds.

### V-m2. The ceiling table sums to 12.00M, not 12.05M

- **Where:** plan `:46`. The fold record repeats it at C-M5 and in Measures.
- **Defect:** 0.30 + 5.25 + 0.90 + 1.20 + 0.30 + 1.10 + 2.95 = 12.00. "12.05M, held at 12.0M"
  shows fork 3's evidence a 0.05M trim that does not exist.
- **Proposed fold:** "**12.0M**". If V-M1 folds, the total becomes 12.10M. Hold it at 12.1M, with
  the 80 percent stop at 9.68M, or keep 12.0M and say what was trimmed.

### V-m3. Task 1 cites Decision 9 only in its Files block, so the `criteria` mapping misses it

- **Where:** plan `:98-99` (the mapping covers "every Decision the task cites"), `:509`
  (`form-anatomy.md` "only per Decision 9"), Task 1's header `:498-500`.
- **Defect:** the fold record says Tasks 2, 3, and 11 now cite their Decisions in their headers
  "so the mapping finds them". Task 1's header cites none. The runner sends `files` to the
  implementer only, never to the reviewer (`reviewPrompt`, `pass-execute.js:588-618`). So the reviewer never sees
  Decision 9's condition. The implementer sees the name without the text.
- **Proposed fold:** add "**Decision 9.**" to Task 1's header line.

### V-m4. The Global constraints reach the implementer only

- **Where:** plan `:92-93` (`commonNotes` carries "Global constraints").
- **Defect:** `commonNotes` renders only in `implementPrompt` (`pass-execute.js:416`).
  `reviewPrompt` (`:588-618`) carries `criteria` alone. Some constraints no gate checks, so the
  reviewer cannot block a breach of them. Two examples: "no plan, pass, or task numbers in shipped
  comments", and "no new public surface beyond what a task names" outside Task 10's explicit count.
  The fold's own X-1 reasoning applies here too.
- **Proposed fold:** add one sentence to the mapping: `criteria` ends with the Global constraints
  bullets that a diff can show (Comments, No new public surface, The template is generated,
  Reference and surface at every commit). Or accept the gap and say so.

### V-m5. Fork 1's "No" hides a second owner question

- **Where:** plan `:316-335` (fork 1), `:1012-1015` (Task 10's "Under the other answer").
- **Defect:** under "No", the conductor must "bring that choice to Geoff in the same ruling":
  pull the R2 read-through forward, or disable the Library's broken-asset cleanup. The fork's
  own text never poses that choice and gives no recommendation for it. A "No" therefore costs a
  second owner turn.
- **Proposed fold:** add one line to fork 1's "No" costs: "and choose: pull the R2 read-through
  forward, or disable broken-asset cleanup under the dev backend (recommended: disable)".

## Question by question

### 1. Did each blocker and major close where the fold cites?

| Item | Closed? | Evidence |
| --- | --- | --- |
| X-1 `criteria` mapping | Yes | Plan `:98-101`. The runner renders `Acceptance criteria: ${t.criteria}` in both prompts (`pass-execute.js:413` implement, `:606` review). `notes` (`:415`) and `commonNotes` (`:416`) reach the implementer only. V-m3 and V-m4 are residue. |
| Headless smoke | Yes | Decision 11 (`:301-305`), close step 6 (`:1192-1194`). The owner list (`:381-389`) has no click. The mechanism is proven: the showcase binds `send_email` `EMAIL` (`examples/showcase/wrangler.jsonc:24`), and Miniflare's `send_email.worker.js:3257-3299` stores the text and HTML in temp files and logs their paths. |
| Computed-tier gates, no pins | Yes | `:103-109`. S and D are gone, and no task pins `gateTier` or sets `gateLane`. The tier probe below matches every task's expected tier. |
| Stop rules | Partly | Tasks 2 and 5 hold (`auth-data` has `coverageBlocks: true`). C5 does not (V-M1). |
| C5 throw on a missing `tagNames` | Yes | `:831-837`, acceptance `:848-849`. Verified `hast-util-sanitize/lib/index.js:367-370` and `:390-393`. `buildSanitizeSchema`'s only call is in `createRenderer` (`pipeline.ts:93,113`), so the throw lands at construction. |
| Seeds only in `'fixtures'`, plus the whole-tree snapshot | Yes | `:939-944`, `:973-981`. Verified the four seed calls and `SEED_MEDIA_KEYS` at `handle.ts:100-132`, and the module seed at `fake-github.ts:42-47`. |
| `Backend.ephemeral` | Yes | Decision 3 (`:253-262`) and Task 10 (`:961-966`, `:989-990`). `CairnEvent.locals` already types `cairnBackend?: Backend` (`types.ts:66-72`). The dev handle sets it (`handle.ts:163`). The load reads it directly and never through the provider (V-m1 corrects the stated reason). `Backend` sits in the surface snapshot under `.` and `/sveltekit`, and `App.Locals` and `CairnEvent` name it by reference. So the "exactly two members" count holds, even though the diff spans more lines. |
| Task 10 owns all ruling-5 records | Yes | Decision 1 (`:237-244`), Task 10 Files (`:921-934`), Task 11's exclusions (`:1045-1046`, `:1060`, `:1063-1064`, `:1098-1101`). Task 11's grep (`:1112`) omits `seedContent`. |
| One outer `access` block, plus the layout fixes | Yes | `:518-524`. Verified the nested-start throw (`emit-template.mjs:45`; the fold cites `:36`, which is the doc comment). `SiteLogEvent` is one line, at `log.ts:8`, not `:7`; the pre-flight absorbs that. The `APP_DB` object at `wrangler.jsonc:35-43` sits beside the existing `MEMBER_DB` block, so the two blocks are adjacent, not nested. |
| Task 2's two test files | Yes | `:555-557`, pre-flight `:463-465`. The narrowed grep on `main` hits exactly the Files set, plus `README.md:138` and `config.mjs:36,48`. |
| `svelte` export condition | Yes | `:664-669`, table test `:687-688`. Proven: `vite-plugin-svelte` 7.3.1 pushes `svelte` onto `resolve.conditions` (`configure.js:79`). The manifest's key order `types, svelte, default` (`packages/cairn-cms-dev/package.json:21-24`) makes `svelte` the first runtime match. |

### 2. New contradictions, an order that cannot build, a gate that cannot run

Tier probe: `decideGate` imported from `scripts/checks/gate-tier.mjs` on `main`, run over each task's
Files in this scratchpad.

| Task | Expected | Computed | Deciding paths |
| --- | --- | --- | --- |
| 1 | F | full | `.cairn-template.json`, `src/theme/`, `wrangler.jsonc`, `src/lib/log.ts` (the showcase's), `templates/waymark/**` |
| 2 | scripts | scripts | `packages/create-cairn-site/**`, its README included |
| 3 | F | full | `routes/admin/+error.svelte`, the fixture route, `chassis/feed.ts` |
| 4 | F | full | `packages/cairn-cms-dev/package.json`, root `package.json`, `publish.yml` |
| 5 | F | full | `examples/showcase/vite.config.ts`, `app.d.ts` |
| 6 | E | engine | `src/lib/guidance/*.ts` |
| 7 | E | engine | `src/lib/content/*.ts`, `admin-dispatch.ts` |
| 8 | F | full | `src/lib/render/` |
| 9 | F | full | `examples/showcase/src/theme/` |
| 10 | F | full | `packages/cairn-cms-dev/src/**`, `hooks.server.ts` |
| 11 | docs, or higher | docs; scripts with `packages/create-cairn-site/README.md`; full with a non-`.md` `claude/**` file | as the plan says |

Every expected tier matches. Other probes:

- **Task 0's print.** The `TIER_GATES` print exits 0 under `node -e`, because the module's `main()`
  guard skips when `argv[1]` is absent. `--range HEAD..HEAD --pin full` exits 1, so the fold's
  premise holds.
- **Task 2's extra legs.** `check:facts` and `check:transcripts` sit in `check:docs-gate`
  (`docs-gate.mjs:84,92`), so Task 2's added command only needs `test:emit` and `check:template`.
- **Task 11's extra legs.** `check:surface` and `check:rulings-format` are absent from the `docs`
  tier, as Task 11 says.
- **Build order.** Task 1 alone leaves `nameWranglerResources` throwing on a real scaffold, but
  every local `create-cairn-site` test uses its own `WRANGLER_JSONC_FIXTURE` literal. Task 1's F
  therefore stays green, and CI `create-site` sees both tasks at the S1 push. No order defect.

No new contradiction between sections apart from V-M1.

### 3. New mechanisms stated from memory

Every mechanism the fold added is quoted or proven above, except Decision 3's token-mint reason
(V-m1), which is false. "GitHub refuses a pull request with no commits" is standard behavior, the
API's 422. It is unquoted but carries no risk.

### 4. Can Geoff rule forks 1 and 3?

- **Fork 1.** Yes. It is genuinely open. Ruling 5's "saving to a local stand-in"
  (`2026-10-07-engine-pass-pre-2b-rulings.md`, item 5) does not say memory or disk, and the spec
  leaves it to Geoff (spec `:705-716`). The three "No" costs are verified (`handle.ts:36-40`,
  `dev-gate.ts:31-36`). A "No" still owes a sub-choice (V-m5).
- **Fork 3.** Yes. It is open, and budget is Geoff's under the workstation rules. The cited
  record matches `2026-10-03-sveltekit-3-upgrade.md:1560-1562` (14.7M against 12.4M; the fix chain
  cost 1.95M against 1.45M for the close). The table's arithmetic is off by 0.05M (V-m2).

Neither fork is settled by an existing ruling.

### 5. Is the R-m1 refusal sound?

Yes. `publish.yml:82-88` records the one hand publish as the trusted-publisher bootstrap. The
`cairn-release` skill publishes only by firing `publish.yml` (`SKILL.md:174`). Task 4 fixes that
job and proves it with a dry-run. No measured defect and no published practice supports a
`prepack` guard.
