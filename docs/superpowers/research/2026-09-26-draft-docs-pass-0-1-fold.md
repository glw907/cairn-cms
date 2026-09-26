# Draft docs pass 0+1 plan: review fold

**Target:** `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` at `90a463ff`, revised in
place. **Reviews:** `2026-09-26-draft-docs-pass-0-1-review-{contract,mechanics,risk}.md`. IDs: `C`
contract, `X` mechanics, `R` risk; `Cm` is a contract minor by its number.

**Counts:** 36 finding IDs across the three reviews, in 20 dispositions below: 36 folded, 0
refused, 0 owner forks.

Every finding was checked against the tree before folding. Verified: `pass-execute` does no
worktree isolation (`pass-execute.js:32-33`); `findBriefs` collects every `.json` under
`briefs/` (`check-provenance.mjs:457-470`); `check-provenance.mjs:607` reads briefs from
`process.argv.slice(2)` while `check:vale` is a fixed path list (`package.json:50`); the
classifier's `DOCS_GATE` is its own five-check literal (`gate-tier.mjs:50`) and its header warns
against a light lane on a mixed diff; Vale installs at `test.yml:107`, after the replaced steps;
`test.yml` fires on push only for `main` and `rebuild`, so a feature branch proves CI only through a
PR; `git show tool/v1.1.0:.../conditions.json` yields 20 unique anchors; `treeFlags` initializes
only the help flag (`flags_test.go:47-51`); the two memories, the two workstation docs, the
drafter's "Do not run the page gate" line, and the runner's scratchpad-copy header all read as
the reviews quote; `docs/reference/` word counts put `sveltekit.md` at 21,454 of 94,086.

## Dispositions

1. **Shared-worktree concurrency (X-H1, R-H1, X-M5, Cm2 second half).** Folded: header
   "Execution mode" (segment A sequential, with the reason) and task 10 (conductor builds `dist`
   once; read-only fact-read agents return proposed page and fact edits; one apply implementer per
   batch runs the gate and commits; batches sequential; acceptance that no reader packaged, gated,
   or committed). `pass-execute-chains` was checked and not taken: it assumes pre-made worktrees
   (`pass-execute-chains.js:114-118`), so segment A would need four worktrees, four `npm ci` runs,
   and a merge, while every heavy gate still queues on one machine lock.
2. **Gate scoping (C-M2, X-H2).** Folded: task 6 names the interface, a single `node` gate runner
   taking `--page` and `--brief`, and grounds it in the repo's own precedent
   (`check-provenance.mjs:607`) instead of an npm-docs quote; acceptance adds one scoped run.
   Task 7 consumes it by name.
3. **Classifier tiering and one list (X-M3, R-M2).** Folded: task 6 adds `gate-tier.mjs`, its test,
   and `pass-gate-tiers.md`; the docs tier calls `check:docs-gate` and the full tier drops the
   duplicated components. The "Gates" paragraph now says the classifier's string is the gate and
   the plan's is the fallback. Task 6's `full` tier classification is accepted as correct for a
   CI-file change; no `gateTier` pin is planned.
4. **Light lane (X-M2, R-M2 third bullet).** Folded: "Gates" paragraph, light lane only for a
   `make -C tool check`-only gate; task 3 runs heavy.
5. **CI Vale order and CI evidence (C-m1, X-M4, R-M1).** Folded: task 6 places the step after the
   Vale install and requires a green `test` run. Since `test.yml` runs on pull requests only for a
   feature branch, task 6 opens the pass PR as a draft; task 11 takes it out of draft. X-M4's
   "build `dist` once" speedup is folded too, since the gate now runs every page round.
6. **Record-derivation fixture (C-M1).** Folded: task 7 makes the derivation one pure function
   between marker comments, extracted and run by a node test in `~/.dotfiles/tests/` wired into
   `check.sh`, covering the four states the conductor named; the test fails when the markers are
   missing. Leanest form checked: the runner cannot be imported by node (top-level `return`,
   `docs-page-chain.js`, last line) and the runtime has no filesystem, so a separate module is not
   an option. Task 9 records which branch the live run took.
7. **The `cairn` line (C-M4, R-L1, X-L6 first bullet).** Folded: task 3 defines the line (first
   token exactly `cairn` after an optional prompt and assignments, continuations joined), resolves
   root-flag lines to the root path, and initializes cobra's lazy `help` and `completion`
   commands. Planted tests add the negatives, root, `help agents`, inherited-flag, and
   continuation cases. `--version` is already in `flags.json`, so no version-flag init is needed.
8. **Stale per-command map (C-M5).** Folded: task 3 acceptance plants a drifted map that fails
   `make -C tool check`.
9. **Red `check:symbols` via filing (R-L2).** Folded: task 3, any failure is fixed where it lives
   or the check does not land.
10. **Absent or malformed lists, list location, README cross-match (C-M6, X-M1).** Folded: task 4
    moves the list to `docs/internal/briefs-rebuilt.json`, matches coverage on `page` fields, runs
    coverage before the zero-brief return, fails absent or malformed lists, and plants the README
    cross-match. Task 5 fails absent, malformed, or empty lists and tests the loader on the
    committed file.
11. **Anchor count and tag at plan time (Cm5, X-L6 second bullet, R-M5).** Folded: task 5 states
    20 anchors, normalizes the prefix, and reads the tag once at implementation time; a new global
    constraint bars committed checks from reading a git ref.
12. **Rule-sweep vacuity and missed carriers (C-M3, X-L2, R-L4 first half, Cm6 first half).**
    Folded: tasks 1 and 2 widen the absence grep, list keep reasons, add per-carrier presence
    checks, name `docs-register.md:225-226` and the other carriers, add the two memories, restore
    "feeds that stage's page inputs", and require before and after quotes for memory edits (also a
    global constraint). Task 7 adds `claude-tooling.md`, `model-economy.md`, and the runner's
    `description` meta.
13. **Live stow edits (R-L4 second half).** Folded: header "Worktrees", tasks 2 and 7 write each
    file once, whole.
14. **Review page contract (C-M7, X-L5).** Folded: task 8 quotes the `artifact.d.ts` lines,
    stashes edits before publish and restores after a conflict reload, turns read-only on the first
    rejection, keeps the self-publish skeleton exact, shares one encode path between Node and page,
    and widens the fixture (svelte `</script>`, HTML comment, curly quotes); the conductor copies
    both `.d.ts` files into the task notes. Task 9 reads the comment with `ArtifactComments`.
    Review focus 5 is rewritten to match.
15. **Task 9 isolation and leak (R-M3, X-L3, Cm3).** Folded: task 9 names its own worktree, commits
    owner facts before the chain, adds the no-leak acceptance, and requires Geoff's edit to hit a
    brief-listed claim with a non-empty diff.
16. **Owner-fact web access and narrative-arm fix (X-L4, Cm3 third point).** Folded: task 9 uses a
    Sonnet `general-purpose` agent for the checks (WebFetch), quoting Cloudflare's limit text with
    its URL; the global constraints sanction the `why-cairn.md:41` fact fix.
17. **Budget (R-M4).** Folded: see "Pass ceiling" below. Task 10 splits the five largest pages by
    section and projects from the first batch.
18. **Task 7 runner details (X-L1, Cm6 second half).** Folded: the drafter runs the gate as its last
    act (the current runner already does; the drafter filed facts, which was the reason for its
    "Do not run the page gate" line, and now files none), and that line and the `[candidate]` line
    go; the `figure-verifier` read is added; the header says invoke by name, per `pass-execute.js`'s
    own header ("by name, never by path and never from a scratchpad copy"); the grep covers the
    "Profile" prompt section.
19. **CLI contract pages (X-L6 third bullet, R-L3).** Folded: task 10 names all five `cli-cairn-*`
    pages, the three contract pages, and `schema/**`; contract content is reported, never edited.
20. **Smaller mechanics (Cm4, X-L6 fourth and fifth bullets, X-L6 Models note).** Folded: the
    `/cost` pre-flight moves to the conductor before segment A; `gate` passes as a bare string;
    the "Models" line says task 5 only reads Go; task 2 alongside segment A is kept (verified
    sound). Cm2's empty-row half is folded in task 10's acceptance (nonzero claim count or reason,
    conductor diffs the list).

## Pass ceiling

6M becomes **8M, flag at 6.4M**, a method call from the evidence: task 9's chain proof is a full
page run (the spec prices a lean redraft at 0.65M; its stage 0 line counts only 0.2M for the review
page), and stage 1's 94K words put 21K on one page, so the five largest split to about 37 read
agents at about 0.1M plus about five apply batches and the close, about 4.5M. Against R8's 30M this
narrows the spec's roughly 3M arm-page headroom to roughly 1M. That is not raised as a fork: the
spec resets every share from measured cost and already puts the scope gap to Geoff at the stage 2
pilot checkpoint, so task 11 carries the narrowed headroom into STATUS as an input to that question.

## Open rulings for Geoff

None.
