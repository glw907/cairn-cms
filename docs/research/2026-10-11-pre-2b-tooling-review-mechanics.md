## Mechanics and feasibility review: pre-2b tooling plan (59d09fa05)

I checked the plan against cairn-cms `b63b185f6` and dotfiles `2912c95`. I extracted cairn main into `/tmp/claude-rev/cairn`, ran a fresh `npm ci` and `npm run package`, and ran simulated patches of CT3, CT5, CT6 and CT7 against the real corpus. Most cited line numbers are correct, apart from the CT2 list and a few counts noted below. Ranked by consequence:

### Blockers

**1. The clock stop fires during the overnight wait for Geoff and breaks the morning merge.** Tag: correctness. Plan :48, :76-82, :275-280, :334-336; cairn prompt :32, :38; dotfiles prompt :29, :35.
- Each clock file is removed "at the task's end", and for CT-C and DT-C that is after the merge.
- `claude-clock-stop` runs after every tool call. The `/loop` ticks call `test -e`, so the hook fires once the wait passes twice the estimate: 120 minutes for CT-C (60-minute estimate), 50 minutes for DT-C (25).
- A stop in C then commits and pushes `Record a stop in STATUS`. That moves the PR head after `review-desk` captured `headRefOid`, so Geoff's approve carries a stale head and `gh pr merge --match-head-commit` refuses. The PR also gains a junk commit, and `pass-stop` makes later ticks end their turn.
- **Fold:** remove the CT-C and DT-C clock file at PR-ready, before `review-desk` (pass-core "Score" already ends the clock there). State that a stop after hand-over never commits or pushes.

**2. CT3 item 3 (`types: []`) does nothing under TypeScript 6.0.3, so its proof can never go red.** Tag: correctness. Plan :167, :174-175.
- The TS 6.0 announcement says: "In TypeScript 6.0, the default `types` value will be `[]`."
- Probe: calling `typecheckUnits` on one unit, with the script unmodified, already reports "Cannot find name 'process'" and "Cannot find name 'node:fs'", and the reference directive already clears them. So "fails with the script reverted" is impossible.
- The real corpus run hides the gap anyway. I added a `docs/extend` page whose block reads `node:fs` and `process.env` with no directive, and it passed with `types: []`. All units share one program, and `node_modules/vite/dist/node/index.d.ts` carries `/// <reference types="node" />`, so any vite-importing block exposes Node globals to every unit.
- A Sonnet subagent told the red proof is required will either misreport or start rewriting to one program per unit. That is slow and could trigger a clock stop in pair 1, which stalls all of track C.
- **Fold:** drop the code change. The header comment states the TS 6 default and the shared-program leak. The `node:fs` case stays as a regression lock with no red-proof requirement. The fresh-scaffold goal stays in Later, which already lists it.

### Major

**3. The CT5 subagent's own test is red by design.** Tag: correctness. Plan :203, :208, :217.
- `check-symbols.test.ts:582` asserts no findings over the real corpus.
- My simulation of items 1-3 gives 13 new findings:
  - `.cairn/admin.css` ×5
  - `.svelte-kit/cloudflare/_worker.js` ×4
  - `.claude/settings.json` ×3
  - `../worker-configuration.d.ts` ×1: `docs/reference/admin-routes.md:203`. It becomes a candidate because the trim keeps `../`.
- The fix lives in `check-symbols-allowlist.mjs`, which is not in CT5's Files, and the subagent is told "Edit only your Files".
- Three allowlist entries go dead: `file-path:cairn/admin.css` (:134), `file-path:svelte-kit/cloudflare/_worker.js` (:164), `file-path:claude/settings.json` (:173). No stale-entry check exists, so they would linger.
- **Fold:** add the allowlist to CT5's Files. Re-key the three entries to their dotted form, and decide the `../` case in the task block.

**4. CT5's templates/waymark case cites an entry point that cannot run on a temp root.** Tag: correctness. Plan :213.
- "Through the exported entry point the tests already drive" is false. The tests run `findUnresolvedSymbols` only on the real root.
- On an empty temp root it throws `ENOENT .../docs/internal/api-surface.md` (probed). It also needs `tool/testdata/flags.json`, `packages/create-cairn-site/src/args.mjs`, `src/lib/log/events.ts` and `src/lib/diagnostics/conditions.ts`. `pathExists` (:609) is not exported.
- **Fold:** export `pathExists`, or a thin `filePathResolves(token, root)`, and test it directly.

**5. CT6's CHANGELOG anchors will turn `check:facts` red on every future CHANGELOG edit. OWNER FORK.** Tag: correctness. Plan :224-225.
- New entries go at the top (`## Unreleased`), so every engine pass shifts every CHANGELOG line.
- An anchored pointer fails once its line moves more than the 10-line window. `check:facts` runs in the docs bucket, which `*.md` triggers.
- Options:
  - (a) Accept repointing about 16 CHANGELOG pointers every pass.
  - (b) Check a CHANGELOG anchor within its version section, or anywhere in the file.
  - (c) Apply the rule to `package.json` now and move CHANGELOG to Later.
- **Recommendation:** (b), or (c) if the clock is tight.

**6. `local` is a privileged escape hatch with no named channel and no check.** Tag: correctness. Plan :32, :183, :301.
- Any brief author (the drafter, a session's fix chain) can list a real engine export or repo path in `local` and silence provenance.
- **Fold:**
  - Refuse an entry that is a name in `docs/internal/api-surface.md`, or a path that exists at the repo root or under `templates/waymark/`.
  - Name the drafter as the one writer.
  - Have the fact-read seat grade `local` entries.

**7. DT1 puts a pass-scoped `git diff origin/main...HEAD` guard inside a permanent test file.** Tag: correctness. Plan :312.
- `scripts/check.sh` runs `tests/docs-page-chain-derivation.test.mjs` on every gate.
- After merge, every later dotfiles branch that touches `claude/.claude/agents/`, `cairn-figure/` or `cairn-docs-outline` fails the gate. On main the check is vacuous, and it cannot meet the "fails with source reverted" rule.
- **Fold:** make it a one-time DT1 acceptance command quoted in the commit body.

**8. On unscoped reads, the register seat still gets the whole-item cap from its definition.** Tag: correctness. Plan :298-300.
- `claude/.claude/agents/cairn-register-editor.md:58-59` says: "A step or list item over 26 words is a blocking guide finding".
- That definition loads from stowed main. `editorPrompt` gets only S2, and S1 arrives only through `scopeNote`, which returns "" when unscoped. So 2b's unscoped register reads keep the defect this pass exists to fix.
- **Fold:**
  - Put S1 in `editorPrompt`, with "S1 governs over your definition's cap line".
  - Fix lines 58-59 in DT1 so the fix lands at merge.
  - Narrow the no-agents guard to `cairn-docs-drafter.md`.

**9. CT2's list misses live uses, and one miss reds `check:template`.** Tag: correctness. Plan :144-157. Hits not listed:
- `docs/reference/auth-crypto.md:15`, `:122`
- `docs/reference/auth-channel.md:3`, `:10`, `:33`
- `docs/reference/README.md:52`, `:53`
- `templates/waymark/.claude/cairn/CLAUDE.md:26`: the acceptance grep over `templates` forces this edit. Its bake source `claude/CLAUDE.md:26` is outside the grep and outside Files. `check:template` compares the template's `.claude/` to the bake, so editing only the template copy goes red.
- `examples/showcase/src/members/channel.ts:53`: neither fixed nor listed as a record.
- `docs/internal/src-lib-map.md:50`, `:86`
- **Fold:** list them all. Add `claude/CLAUDE.md` with a `diff` check against the template copy. Put `examples/` and `src-lib-map.md` either in the fix list or in "Left as records".

**10. The close pulls the main checkout from inside the worktree, which the isolation checks block.** Tag: correctness. Plan :279, :336; prompts cairn :39, dotfiles :36.
- The worktree docs say the git-redirect check "blocks a Bash or Monitor command that redirects git into the main checkout", including `git -C`. pass-core's pull is `git -C <checkout> pull --ff-only`, and the plan orders it before ExitWorktree.
- pass-core also skips the pull when the checkout has a live session, and the executor was launched from that checkout.
- For D, `make ... install` then builds the old `lexicon.go`, and the "the showcase" confirmation fails.
- **Fold:** call ExitWorktree (`keep`) first, then pull, then install. Or build tellgrader from the worktree path, since the merged head equals the worktree head.

**11. The token meter during the overnight wait is undefined.** Tag: correctness. Plan :74, :351.
- `/loop` ticks every 1200-1800 s (unattended-work-guards) and each re-reads the cached context.
- If cache reads count, 8 idle hours on a context of about 100k tokens comes to roughly 2-3M, which can trip D's 3M stop before Geoff decides.
- **Fold:** state what the meter counts, and that the ceiling ends at hand-over.

### Minor

- **CT6 count, plan :225.** The plan's grep finds 84 unanchored manifest pointers, but `extractPointers` treats 95 as unanchored. `POINTER_RE` accepts only a strict `` (`x`) ``, so prose parentheticals do not count, for example `` `package.json:198-203` (`bin` field ``. The plan should say the sweep rewrites those into strict form, so the subagent does not stop on the count mismatch. The defect message should say "no parseable anchor". (correctness)
- **CT7 count acceptance, plan :248.**
  - 2 `src/...ts:N` pointers sit in claim prose, not in `Source:`.
  - 14 bare-name `.ts` pointers resolve into `src/` but cannot convert, because `SYMBOL_POINTER_RE` needs a `src/` path.
  - Define the count over `Source:` pointers via `extractPointers`.
  - My simulated converter gives about 677 converted, 577 left as lines, and 5 anchor drifts, so 45 minutes is feasible. (correctness)
- **Resume, plan :86.**
  - CT-C's `CT-C: Close the pass records` commit exists before hand-over, so a relaunch would skip ready, review-desk and the merge. Key CT-C's resume on PR state.
  - A relaunch between the pair merges and the fix commit would skip the page fixes. (correctness)
- **CT4 `--extract`, plan :31, :184.**
  - No state is named for a missing file argument, or for `local: []`, or for several bad `local` entries (one defect each?).
  - It does not say whether the CLI loads the container's key phrases (`extractFacts(text, keyPhrases)`, `check-provenance.mjs:225`).
  - `planPrompt` should let the plan mark a site-created name for the brief's `local`, rather than only "cite or reword". (correctness)
- **CT4 `<details>`, plan :185.** `<details open>` and tags with attributes are unhandled. (optional)
- **CT5 `link:consumer`, plan :206.**
  - The doc comment at `link-consumer.mjs:136-139` ("never adds a dependency it had not declared") becomes false.
  - `--restore` on a consumer that declares neither package then adds both registry ranges, and that state is unnamed.
  - `src/tests/lab/` exists and is in vitest's `unit` include, so the new test could live there. (correctness / optional)
- **CT3 `$lib` forms, plan :165.** `import type`, `export … from` and dynamic `import()` are unnamed. Probe: published docs hold 0 `$lib` imports, and with list-indented fences accepted, 23 newly checked blocks pass (138 checked, 33 opted out, 0 problems). The after-merge page-fix loop is likely empty. (optional)
- **CT6 `.go`.** In a probe adding `go` to `POINTER_RE`, all 245 pointers resolve with 0 failures. (informational)
- **`planPrompt`, docs-page-chain.js:1093.** It says "you do not run a gate". The new extractor step should say the extractor is not a gate, `mkdir -p ~/.cache/docs-page-chain` first, and use an absolute path for Write. (optional)
- **DT1 constants, plan :257.** Require S1 and S2 as single-line literals. A `+` concatenation breaks CT-C's flattened verbatim grep. (correctness)
- **Pairs, plan :49-50.** Say "background" explicitly. Background is the default only when fork mode is on (sub-agents docs). CT2 running beside the pair, and the sleep clock, depend on it. (optional)
- **e2e flake.** e2e on main is red at `b63b185f6`: the "e2e report" job's `npm ci` timed out (run 38188696187). `ci-green --wait` reruns an infrastructure red once. The plan's red handling, plan :66, does not mention a repeated flake. (correctness)
- **CT1 item 4, plan :126.** The new bullet lands in "## For reviewers grading against this standard", which no chain seat reads. `registerSectionsFor`, docs-page-chain.js:553-575, passes only the brief, Names, Visuals, page anatomies, track and Deviations sections. That is fine as dispatcher guidance, but no chain seat sees it. (optional)
- **Plan numbering.** CT-C's steps go 1, 2, 3, 5, 6, 7 (plan :255-275). (optional)
- **Proof wording, plan :42 vs :58.** Subagents are told "commit once", but the proof convention amends. (optional)
- **Design vs plan.** The design's "Out: any merge" (spec :22-23) differs from the plan's merge-on-approve. pass-core's desk-approve rule reconciles them, but one line in the plan should say so. (optional)
- **Over-ceremony.** The CT1 STATUS session line is removed again at CT-C. That is small, but it costs a STATUS edit, a fast lane run and a CI cycle on the first push. (optional)

### Checks that hold
- `worktree.baseRef: "head"` is set in `~/.claude/settings.json`, so EnterWorktree from main and the pair subagents branch from local HEAD as the prompts say.
- Register line numbers and heading scope match, and no heading changes.
- The `runIfMain` and `consumerPackages` line numbers are correct.
- Every other proof can go red with its script reverted.
- `review-desk`, `ci-green` and `claude agents --json` signatures match the plan.
- Vale and links pass on the merged plan files.

Scratch evidence is in `/tmp/claude-rev/` (`snip-*.txt`, `probe-ct7.mjs`, `probe-facts.mjs`, `probe-tc.mjs`).
