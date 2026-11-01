# Fold record: media and publish plan, mechanics review

Fold of `2026-11-01-media-publish-review-mechanics.md` into `docs/plans/2026-11-01-media-publish.md`. Each finding was checked against source or a probe. The tree was restored after every probe.

Owner forks: none. Counts: 18 findings: 17 folded, 1 optional taken (18), 0 refused. Two folds differ from the review's text: 5 drops a clause, and 11 and 15 go further than the review did. Path 245, unchanged; task sum 365 to 380.

## Is the `parseMarkdown` change a design change?

It is an implementation detail of #106, not an owner fork.

- The design approves that a save keeps undeclared keys, and the plan settles that a failed read commits nothing. Neither holds on a retry without this change, so the change serves the approved outcome and adds none.
- The signature stays. `parseMarkdown` already throws on malformed YAML on the first parse. The change makes every later parse do the same. The old retry result was an accident of the cache: `{}` frontmatter and the whole file as the body. No doc or test states it.
- One effect reaches past the save path. A malformed file now answers `editLoad` with an error on every open, where a second open used to show the raw file as the body. A save from that screen would have written the old frontmatter into the body, so the old result was the worse one. `summarize` and the fragment target read catch the throw, and `buildSiteManifest` already fails a build on the first parse.
- It rides `## Decisions` through the plan's settled bullet.

## Dispositions

| # | Disposition | Where, and what was verified |
|---|---|---|
| 1 | Folded | Execution shape. Probed: a skill edit plus a new file makes `check:template` exit 1; `npm run emit:template` writes the tree and the check passes; `git restore` plus `git clean -fd` leaves it clean. `templates/waymark` has no ignored files, so `git clean` without `-x` is enough. `dist` exists after setup, because `prepare` runs `npm run package`. The npm script is the simpler instruction. Emit goes before each lane run, not once after commit, since a lane fix may touch `skills/`. |
| 2 | Folded | Task 2b. Probed: a named export fails `check:self-use` with exactly the reported error. An inline member without a comment fails `check:options` (`createMediaResolver.opts.strict`); with one, `check:options`, `check:self-use`, and `check:tiers` pass. `check:self-use` added to the acceptance. |
| 3 | Folded | Task 2a helper and acceptance 2 and 4; settled #31 bullet states the two-sided filter. |
| 4 | Folded | Task 2a acceptance 5. `GithubDouble.branches` is a public map. |
| 5 | Folded, one clause refused | Task 1a and settled #106 bullet. Probed: `matter(s)` throws, then reads `{}`; `matter(s, {})` throws three times. `index.js:37` skips the cache with any options value. Unit suite with the change: 402 files, 5,681 tests pass. No code touches `matter.cache`. Refused clause: "copy prior keys, never mutate the parsed object". With options the data object is fresh on each call (probed), so nothing can poison the cache. |
| 6 | Folded | Task 4 wiring. Names, the form fields at `content-routes-media-metadata.ts:315-322`, and `normalizeConcepts`' signature checked. Chose `expect.soft` so one `it` reports both failures. |
| 7 | Folded | Task 1b acceptance. `buildExcerpt` returns `description` first, as reported. |
| 8 | Folded | Task 1a mechanism. The race is narrow, but the move is one statement. |
| 9 | Folded | Task 1a Files. `log-events.md` does say the save deletes the keys, so it is added outright. Task 2a edits the same file in a later wave, so the waves stay disjoint. A grep for the claim across `docs/admin`, `docs/editors`, and `skills` hits only these and `content-model.md`, already listed. |
| 10 | Folded | Execution shape. |
| 11 | Folded, extended | Task 3b acceptance 3. The review's fix still prints `docs/research/`, whose review file names both symbols, so the grep excludes `research` too. |
| 12 | Folded | Task 3b acceptance 1. `media-public-base.test.ts:38` is the context pattern. #48 goes to 30 minutes for the async test. |
| 13 | Folded | Task 2a. Every caller is in `entry-read` or `entry-write`. The private `push` is named too. None of these is on the public surface. |
| 14 | Folded | Task 2a Files. |
| 15 | Folded, extended | Task 2b. `cairn-admin.ts:103` and `:388` also count ten; the review missed them. |
| 16 | Folded | Task 3a. |
| 17 | Folded | Task 6 steps 6 and 8; Execution shape for the CI verdict. `cairn-running-passes` confirms the PR is a draft. `gh pr ready` is not in `permissions.allow`, so the plan's answer to a refusal covers that case as well. |
| 18 | Optional, taken | Task 4 acceptance. It costs nothing and reduces risk. Probed with `git archive c85b1de0b`, not `git worktree add`: an extract plus a `node_modules` symlink ran an integration test in 7 seconds, with no worktree to register or clean up and no `npm ci`. |

## Estimates

Task 1a 40 to 45, Task 2a 35 to 40, Task 3b 45 to 50. Each stays at or under its wave's path figure: wave 1 stays 45 (Task 1b), wave 2 stays 50 (Task 2b), wave 3 stays 50 (Task 3a). Path 245, ceiling 400.

## Noted, not folded

`media-rewrite.ts:225,494` and `references.ts:79` still call bare `matter()`. They read only, on the replace and rewrite paths this pass doesn't change, so a retry there can classify a malformed file as having no hero but writes nothing wrong. No fix here.
