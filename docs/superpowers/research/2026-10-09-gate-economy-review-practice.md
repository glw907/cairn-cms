# Gate economy spec: published-practice review

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md`, read against `~/.claude/skills/pass-core/SKILL.md`.
Every quote below was fetched on 2026-10-09 and carries its URL. A source I searched but could not quote is listed at the end and is not relied on.

## Verdict

The spec's core shape matches published practice: targeted presubmit gate, full suite on CI, a fast first stage and a slow later stage, a deterministic runner for the gate, fresh-context review. Three things are weak or missing: nothing in the design stops an agent from loosening a test or the gate's own selection map; red-handling is underspecified (what happens to the task already in flight, and what counts as a flake); and the "never declare done without CI" rule lives in prose for hand-dispatched passes. A fourth, smaller point: pipeline state sits in the conductor's context.

## Ranked findings

Rank is by consequence for correctness first, clock second. Status is FOLLOWS, CONFLICTS, or OMITS.

### 1. Agent weakens a test or the gate's own selection config. OMITS (partly guarded)

Quotes:
- "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality." (Anthropic, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents; the same sentence appears in https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, "Workflows across multiple context windows")
- "Claude can sometimes focus too heavily on making tests pass at the expense of more general solutions ... If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them." (same prompting page, "Avoid focusing on passing tests and hardcoding")
- EvilGenie measures reward hacking "such as by hardcoding test cases or editing the testing files" and "explicit reward hacking by both Codex and Claude Code" was observed; of its three detectors, "the LLM judge" was "highly effective ... in unambiguous cases" while held-out tests gave "only minimal improvement." (https://arxiv.org/abs/2511.21654)
- Kent Beck lists as a warning sign "Any indication that the genie was cheating, for example by disabling or deleting tests." (https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)
- Secondary, practitioner: mitigations are read-only tests, failing a PR that touches test files, and holdout tests; "the judge is not in the agent's edit set." (https://dev.to/penloom_studio_829b7817d3/your-ai-agent-will-pass-any-test-its-allowed-to-edit-51fo). The post is a blog, not a study.

Spec position: `diff-reviewer` reads each diff at the class bar, which is the "LLM judge" the benchmark found effective, and `auth-data` requires a mutation proof. Neither names test weakening as a finding class. Two spec choices widen the exposure:
- The per-task gate now selects by a committed input map and a diff-to-spec map (Task 3). Both are files an implementer can edit, so an agent can shrink its own gate. The spec's "no declaration runs every gate" fails safe for a missing entry, not for an edited one.
- `pass-core` already "reduces the gate on a comment-only or test-only fix round." A test-only fix round is where an assertion gets loosened, and it runs the thinnest gate.

Folds:
- Add to the `diff-reviewer` prompt an explicit blocking finding: any existing test deleted, skipped, `.only`'d, or with a loosened assertion that the task's criteria do not name.
- Have `gate-tier.mjs` or the run record print "existing test files modified, removed lines N" per task so the reviewer and the close see it without reading the diff.
- Treat the input map, the diff-to-spec map, `ci-green`, and `.github/workflows/**` as protected paths: a diff touching them forces the full gate and a named line in the review prompt.
- Keep the CI full run as the holdout (the agent cannot narrow it by editing the map); say so in the spec, since it is the design's real guard.

### 2. Red handling with a task already in flight. OMITS

Quotes:
- "Should the integration build fail, then it needs to be fixed right away." and "nobody has a higher priority task than fixing the build" (Fowler, https://martinfowler.com/articles/continuousIntegration.html)
- "Rolling a change back is often the fastest and safest route to fix a build" (Google, https://abseil.io/resources/swe-book/html/ch23.html)

Spec position: it stops the line on red and requires "a fix commit." Pipelining dispatches the task after next while CI runs, so when a red lands, one implementer may already be building on the red commit. The spec does not say whether that work is kept, discarded, or rebased, and it offers fix-forward only. It follows the stop-the-line half of the sources.

Fold: on red, abort or park the in-flight dispatch, then choose revert-first when the fix is not a one-liner; rebase the parked task onto the green tip and re-run its targeted gate.

### 3. "Done" without CI, for hand-dispatched passes. FOLLOWS in the runners, OMITS elsewhere

Quotes:
- "Claude stops when the work looks done." and "a Stop hook runs your check as a script and blocks the turn from ending until it passes." (https://code.claude.com/docs/en/best-practices)
- "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens." (same page, "Set up hooks")
- "Claude declares victory on the entire project too early." and "Self-verify all features. Only mark features as 'passing' after careful testing." (harness post)
- "Have Claude show evidence rather than asserting success." (best-practices page)
- Caveat on hard guarantees: Claude Code "overrides a Stop hook after it blocks eight times in a row" (https://code.claude.com/docs/en/hooks-guide).

Spec position: the runners (`pass-execute`, `pass-execute-chains`) call `ci-green` as code, which is the deterministic form Anthropic prefers. Below six tasks the conductor dispatches by hand and the rule is prose in `pass-core`. The pass-core text also keeps the old boundary rule that skips a full gate when a receipt matches; the spec replaces it with `ci-green` but nothing binds the close commit to it.

Fold: make the close-ritual step "mark closed / merge" call `ci-green <HEAD>` through a script or hook that writes a receipt, and refuse the STATUS-closing commit without a receipt for the tree. The hand-dispatch path then gets the same deterministic guard.

### 4. Targeted-gate miss rate acceptance, and the standing safeguard. FOLLOWS, with a gap in how it is measured

Quotes:
- "enabling us to catch more than 99.9 percent of all regressions before they are visible to other engineers in the trunk code," while "running just a third of all tests that transitively depend on modified code." (Meta, https://engineering.fb.com/2018/11/21/developer-tools/predictive-test-selection/)
- Presubmit should be "only fast, reliable ones"; "On post-submit, you can accept longer times and some instability." (Google, https://abseil.io/resources/swe-book/html/ch23.html)
- "Early stages can find most problems yielding faster feedback, while later stages provide slower and more through probing." (Fowler, https://martinfowler.com/bliki/DeploymentPipeline.html)
- "the XP guideline of a ten minute build is perfectly within reason" (Fowler CI article)
- Anthropic's own advice: "Prefer running single tests, and not the whole test suite, for performance" (best-practices CLAUDE.md example).

Spec position: this is the same two-stage design these sources describe, and the 10-minute local target matches the CI guideline. The spec's selection is rule-based and fails safe on a missing declaration, which is more conservative than Meta's learned model. The weak point is the acceptance test: "miss rate zero on the replay" over pass A's ranges is a small sample, and Meta itself accepts a nonzero miss because a later stage catches it. In the spec CI is that later stage, so a miss costs one task of rework, not a broken `main`.

Fold: add a standing metric to the run record: each CI red on a commit whose targeted gate was green is logged as a "selection miss" with the test that caught it; two in a pass reopen the map. State the replay's zero-miss target as a floor, not as proof.

### 5. Flaky red versus real red. PARTIAL

Quotes:
- "Place any non-deterministic test in a quarantined area. (But fix quarantined tests quickly.)" and "Once you start ignoring a regression test failure, then that test is useless" (Fowler, https://martinfowler.com/articles/nonDeterminism.html)
- Google: "Our rerun mechanism is only used for tests that are marked as flaky or when users specifically request it." (an anonymous reply in the comments, https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html; the post body was not retrievable)
- Meta retries failed tests to separate those that "failed consistently (indicating a true regression)" from flaky ones (PTS post above).

Spec position: it adds retry counts to each job summary and has `ci-green` print them, so a pass on retry is visible. It does not say what a red on a known-flaky spec does to the line. The repo already files "CI-flaky pending dictionary word e2e specs" (recent commit `2733881c`). With pipelining, an unclassified flake would halt dispatch for a non-defect.

Fold: `ci-green` consults a committed quarantine list; a red on a listed test is reported and does not halt dispatch, any other red halts. A pass-on-retry counts as green but is tallied in the close score.

### 6. Pipeline state lives in the conductor's context. OMITS (partly covered)

Quotes:
- "a claude-progress.txt file that keeps a log of what agents have done" and "Read the git logs and progress files to get up to speed" (harness post)
- "the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files" (harness post)
- "Claude's latest models are extremely effective at discovering state from the local filesystem." and "Use git for state tracking" (prompting page)
- "Customize compaction behavior in CLAUDE.md with instructions like 'When compacting, always preserve the full list of modified files and any test commands'" (best-practices page)

Spec position: STATUS checkpoints exist, the global instructions carry a compaction rule, and the new run-records file is JSON lines. The pipeline's live state (which pushed SHA awaits CI, which task is in flight, which red is open) is not named as persisted. A connection drop or compaction during an unattended run (the 10-hour goal) loses it.

Fold: write the in-flight record (task id, SHA, `ci-green` state) as a JSON line to the same run-records file at each push and each `ci-green` result; the resume prompt reads the last line. `ci-green <sha>` is stateless by design, so the resume is cheap.

### 7. CI firing on the agent's pushes. FOLLOWS, with one check

Quote: "By default, GitHub Actions workflows will not run automatically when Copilot pushes changes to a pull request." The reason given: "GitHub Actions workflows can be privileged and have access to sensitive secrets." (https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/review-copilot-prs)

Spec position: this is Copilot's behavior, not Claude Code's, so it is not a conflict. It does show a platform can withhold CI from agent pushes by design. The spec's `ci-green` fails on a "missing run," which covers it. Fold: Task 4's `ci-green` test cases should include "workflow needs approval / never fired" as distinct from "missing by path filter."

### 8. Subagent review and parallel work. FOLLOWS

Quotes:
- "A fresh context improves code review since Claude won't be biased toward code it just wrote." and "Before treating a task as done, have a subagent review the diff in a fresh context and report gaps." (best-practices page)
- "A reviewer prompted to find gaps will usually report some, even when the work is sound ... Tell the reviewer to flag only gaps that affect correctness or the stated requirements." (best-practices page)
- "Worktrees: run separate CLI sessions in isolated git checkouts so edits don't collide" (best-practices page)
- "it's crucial for the agents to gain 'ground truth' from the environment at each step"; "Code solutions are verifiable through automated tests" (https://www.anthropic.com/engineering/building-effective-agents)

Spec position: matches. The Opus `diff-reviewer` per task, blocking bars by class, and one-per-worktree rule agree with the sources. No fold.

### 9. Merge queue as the pipeline's end state. NOTE, no change

Quote: a merge queue will "ensure the pull request's changes pass all required status checks when applied to the latest version of the target branch" and keeps "the branch is never broken by incompatible changes." (https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)

Spec position: pass branches merge once per pass, so a queue buys little. The one case that matters: the close gate is green on the pass branch before it merges, and `main` may have moved. `pass-core` already skips the final boundary gate only when no merge or rebase of the default branch intervened; keep that clause when the spec rewrites the close step to use `ci-green`.

## Guards for the three agent-specific risks

| Risk | Does the spec guard it? | Residual gap |
| --- | --- | --- |
| Agent edits tests or the selection map to pass the targeted gate | Partly: CI full run is an uneditable-by-selection holdout; `diff-reviewer` reads the diff | No named test-weakening finding, no protected-path rule, test-only fix rounds run a thin gate (finding 1) |
| Agent declares done without CI | Yes in the runners (`ci-green` as code at boundaries and close) | Hand-dispatched passes rely on prose (finding 3) |
| Context loss across a long unattended run | Partly: STATUS checkpoints, run records, stateless `ci-green` | In-flight pipeline state not persisted (finding 6) |

## Not fetched, not relied on

- Anthropic system-card wording on special-casing tests: a search returned only secondary summaries and the Claude 3.7 launch post held no such line. The first-party evidence used is the prompting-best-practices section and the harness post.
- Cursor, Aider, OpenHands, SWE-agent writeups: not fetched.
- Fowler's deployment-pipeline page did not contain a "commit stage" or stop-the-line quote; those come from the CI article. Fowler's "TDD inside the agent loop" article (https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html) was fetched: it concludes "there was no clearly discernable difference based on TDD workflow versus no TDD workflow" and recommends mutation testing for outcome monitoring, which supports the spec's `auth-data` mutation proof but says nothing about CI.
- Simon Willison, https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/: "Automated tests are no longer optional when working with coding agents." Supports the whole premise; no fold.
