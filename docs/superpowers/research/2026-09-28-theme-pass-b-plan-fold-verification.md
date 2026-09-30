# Theme identity pass B plan: fold verification

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md` at `9284699c` (branch
`theme-b-plan`), against the fold record `2026-09-27-theme-pass-b-plan-fold.md`, the three plan
reviews (contract, mechanics, risk), and the approved spec. Fresh-context read; no part in the fold.

**Counts:** 0 blockers, 1 major, 3 minors. No fundamental architectural question is exposed.

## Findings

| Severity | Location | Defect | Proposed fold |
| --- | --- | --- | --- |
| major | plan:577-583 (decision 20, "Pass"), plan:1222-1224 and :1229 (S1) | The check that closes C3 is vacuous in the case it exists for. `git status --porcelain` without `-uall` lists a new untracked directory, not its files. A probe that creates `src/lib/components/Chip.svelte` in a fresh folder shows only `?? src/lib/`, and `src/routes/admin/probe/+page.svelte` shows only `?? src/routes/admin/probe/`. "Every `.svelte` file `git status --porcelain` lists" then reads zero files and passes. Proven in the scratchpad (`gs-probe/`): the default output lists two directories, and `-uall` lists both files. | Use `git status --porcelain -uall` (or `git ls-files -mo --exclude-standard`) at both sites. Assert the list is nonempty and contains the `/admin/probe` route file, so the check cannot pass by reading nothing. |
| minor | plan:561-565 (decision 20, "The probe") | The command as quoted cannot take the brief as a trailing argument. `--allowedTools <tools...>` is variadic (`claude --help`), so a prompt appended after `'Bash(npx cairn-audit:*)'` is read as a third tool. Proven: the exact flag set plus a trailing prompt exits with "Input must be provided either through stdin or as a prompt argument when using --print". The brief also carries backticks (`` `/admin/probe` ``), which a double-quoted shell argument would execute. This costs one setup-agent retry, not a false result. | Feed the brief on stdin from a file written with a quoted heredoc (`claude -p ... < brief.txt`). Optionally, join the tools with a comma. |
| minor | plan:459-463 (decision 13) vs plan:675-677 ("What pass C receives") | The non-vacuity floor contradicts the remedy the test itself names. The test asserts "at least the five constants this pass leaves", and its failure message tells pass C to "promote the finding to error (and delete the constant)". Pass C's correct action on any of the three `0.98.0` promises drops the count below five and reds the test on its non-vacuity leg. | Assert at least one constant found, plus the two `0.99.0` constants by name. Or state that the promoting task lowers the floor in the same commit. |
| minor | plan:355-356 (decision 6, allowlist item 1) vs plan:754-758 (Review focus 2) and plan:987-990 (task 1 acceptance) | "Every non-`adminOnly` static rule reads both roots" is run-level behavior. `readScope` in `run.ts` walks the roots, while `config.ts` only resolves the list. An implementer who proves it in `run.test.ts` (with a temp tree, since a configured missing root throws) puts a `src/lib/components` line outside the allowlist, which blocks at task 1's greps and again at the branch close. | Allowlist item 1 reads "the restore cases in `config.test.ts` or `run.test.ts`". |

## Question 1: did each blocker and major close where the record says?

Yes, except the C3 half noted above.

- **M1 (blocker).** Closed at decision 14 (plan:469-501), task 3 (plan:1058-1059, :1068-1071, :1104-1106), and task 0 item 4 (plan:833-841). The facts it rests on hold. `cairn-btn-guarded` sits on `EditPage.svelte:1630, :1918, :2014, :2394`. The advisory arm is at `stock-default-hazards.ts:136-147`. The `badge-ghost` fence line is at `exemplar-detail.md:115`, and 13 `svelte`/`html` fences exist. `StatusChip` exists in `src/lib/admin-toolkit/`, and `BADGE_GHOST_MESSAGE` names quiet as its default. A grep of the own tree finds no fixed radius and no retired button patch, so the zero-finding assertions are plausible.
- **C1.** Closed at plan:83-95. `pass-execute.js:396` hands the reviewer only `t.criteria`. Task 1's header names decisions 23 and 25 (plan:880).
- **C2 = R1 = M4.** Closed at decision 23 (plan:594-612), decision 2 (plan:314-315), Review focus 2 (plan:754-758), task 1 (plan:941-945, :987-990), and task 8 (plan:1266-1272).
- **C3.** The `cairn-admin-screens` and `daisyui-first` placement line is closed at plan:1171-1175. The probe-coverage check is folded but vacuous as written (the major above).
- **C4 = R4.** Closed by the tripwire (decision 13, task 3 plan:1107-1108, and "What pass C receives"). One internal contradiction remains (the minor above).
- **M2 = R3.** Closed at decision 6 (plan:338-368), task 1 (plan:962-975), merge-forward step 3 (plan:193-195), and branch close step 3 (plan:1309-1312). `upgrade-cairn.md` is out (plan:1280-1282).
- **M3 = O1 = C13.** Closed at the Gates bullet (plan:260-264) and task 4 (plan:1141-1143).
- **R2 = M10.** Closed at decision 20 and S1. The one defect is the major and minor above.
- **R5.** Closed at decision 25 (plan:620-628), task 1 (plan:946-947, :992-993), and task 8 (plan:1266-1267).

## Question 2: contradictions or orders that cannot build

There is one contradiction, the decision 13 floor (minor above). Beyond it, the segment order builds:

- Decision 14's test lands in task 3, before task 5 adds the exemplar's fences, and task 5 runs it as a task check.
- The sync test lands in task 6, after its three copies exist.
- The guidance-tests gate drops a file that does not exist yet.
- The token projection sums to 13.5M as stated.
- Every npm script the gate strings name exists in the root and showcase manifests.
- Every e2e spec named in the rename string exists.
- The classifier behaves as the sentinel note says. `--pin targeted` exits 1 with only stderr, and `--pin engine` prints the engine string verbatim.
- `pass-execute.js:481` takes the reviewer model from `a.reviewerModel` first, as the plan says.

## Question 3: new mechanisms, each checked against source, docs, or a probe

- **Decision 23, `static.scope` replaces the defaults.** Confirmed in source. `asPathList` (`config.ts:157-163`) returns a configured list as is, used at `config.ts:215`. `readScope` (`run.ts:54`) throws on a configured root the tree lacks. The fold record and plan cite `run.ts:64-72`, which is `parseScope`'s message wrapper. That drift is harmless, and task 0 re-verifies it.
- **Decision 25, the `@source` line and byte-identical CSS.** Proven in `tw-probe/` with the showcase's own `@tailwindcss/cli` and `tailwindcss` 4.3.3, using the showcase's `admin.css` header shape.
  - Adding `@source "./lib/admin";` with no such folder compiles byte-identical output (`cmp` silent, 347 bytes each).
  - With the folder present, its utility compiles.
  - Neither the showcase nor the template has `src/lib/admin` (each has only `src/lib/log.ts`).
- **The headless probe.** `claude --help` lists `--setting-sources <sources>` ("user, project, local"). A Haiku probe run under `--setting-sources project,local` in the scratchpad reported no user `CLAUDE.md` content and only bundled skills. The plan's "stated limit" clause covers any residue. The variadic-flag defect is the minor above.
- **The promotion-versions test.** The three constants exist as cited: `log-event-grammar.ts:20`, `log-secret-field.ts:25`, and `stock-default-hazards.ts:45`. All are `'0.98.0'` literals matching `*PROMOTION_VERSION = '<x>'`, and `package.json` is at `0.97.0`. The unit project includes `src/tests/unit/**`, so the test runs in the engine gate and in CI.
- **`norms.yml` dispatched on a branch.** The workflow carries `workflow_dispatch` on this branch and on `main`. Its own header documents `gh workflow run norms.yml --ref <branch>`. Its recipe (`VITE_CAIRN_E2E=1` build, `CAIRN_DEV_BACKEND=1` preview, `BASE_URL`) is the one decision 20 borrows, and the template carries the dev-backend gate (`templates/waymark/src/chassis/dev-gate.ts`).
- **The merge-forward's `CONFLICT (file location)`.** Proven in `mr-probe/`.
  - Git reports the exact message the plan quotes and places the new file under the renamed folder.
  - An edit to a moved file lands on the new path.
- **Scaffold emit.** `.github/workflows/scaffold.yml:22-33` packs both tarballs and calls `emit-template.mjs <dir> file:<engine> file:<dev> <name>`, as decision 20 states.
- **Vale.**
  - `check:vale` runs at `--minAlertLevel=error`.
  - The warning-tier tokens ("custom component" at `docs/extend/configure-rendering.md:39`) cannot fail it.
  - The error-tier tokens hit only `core.md:1079` and `sveltekit.md:2043`, as decision 8 says.

## Question 4: fundamental architectural question

No. Every finding is a fold-level correction.
