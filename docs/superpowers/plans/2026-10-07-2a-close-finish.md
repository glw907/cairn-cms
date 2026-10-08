# Stage 2a close: finish plan

**Pass class:** docs, with `engine-logic` for F2 (a new gate script) and the code lane's
already-landed changes. **Token ceiling:** 6M; stop and write STATUS at 5M. **Checkpoint:**
after F3 and after F5.
**Branch:** `draft-docs-2a` (PR #107), worktree `.claude/worktrees/draft-docs-2a`. **No release, no
tag, no publish.**

This plan finishes the stage 2a close that
[`2026-10-07-2a-unattended-finish.md`](2026-10-07-2a-unattended-finish.md) ran through R7. During the
owner's live read of the five task 8 pages on 2026-10-07, Geoff ruled on writing cadence, coding
agents, example context, and consumer-site leaks. This plan carries what those rulings still owe.

## Owner rulings (Geoff, 2026-10-07), verbatim

1. "You should not assume that an implementor is using Claude." / "A page shouldn't even assume
   that a reader IS using a coding agent." / "If we want to address coding agents, we can create
   separate docs specifically for that." / "Having a 'using Claude Code with cairn' would certainly
   be a useful documentation topic." (Landed: brief rule, `scaffolded-site-files.md` restructure,
   ROADMAP "Dedicated coding-agent docs".) Narrowed later the same day: "we don't have to assume any
   other agent than claude code. It's the only one that either of us is familiar with." Guidance
   stays Claude Code's; no `AGENTS.md` work. Then: "we _should_ assume in the general docs that a
   user is not using a coding assistance, and then we can write a separate section for claude code."
   F6 also words the drafter and register-editor rule in `~/.dotfiles` this way (the general docs
   assume no coding assistant; Claude Code gets its own section), matching `docs-register.md:149`.
2. On a run of ", since … / , which … / , so …" sentences: "really awkward AI cadence"; avoiding it
   "should live in our writing infrastructure." (Landed: tellgrader `trailing-hinge-run`, gating;
   `check:tellgrader` in `check:docs-gate`, local only.)
3. On "Every person signed in to a cairn admin holds a role, a name from the site's declared role
   vocabulary, which is owner and editor unless the site declares its own.": "Another awkward AI
   sentence." Approved rewrite: "Everyone who signs in to a cairn admin has a role. The site declares
   its own role names, or uses the default pair, owner and editor." ("This is *much* better.")
   (Landed: tellgrader `appositive-stack`, gating; exemplars in the brief and the output style.)
4. "Talking about classes and club members here seems VERY strange. Where the heck does that come
   from?" / "If this relates to the ASC's site, an implementer will have ZERO context." / "Staff is
   fine. Examples should be generic and likely to apply to many organizations." / "We need to fix
   this leak in the infra and remove all occurrences." / "And look for any other similar leaks."
   (Landed: examples sweep, published-docs leak lane; code lane on `leak-cleanup`. Audit and the
   shared vocabulary: [`../research/2026-10-07-consumer-leak-audit.md`](../research/2026-10-07-consumer-leak-audit.md).)
5. "We don't need deliberate social proof. And these sites aren't even production." (Landed: the
   production claim removed from README, CLAUDE.md, ROADMAP, migration notes, and facts.)

## Tasks

**F1. Merge the code lane.** Outcome: `leak-cleanup` (branch and worktree
`.claude/worktrees/leak-cleanup`) merges into `draft-docs-2a` with its gates green (`npm run check`
0/0, `npm test` exit 0, `make -C tool check`), and the worktree is removed. Accept criteria: the
code lane's report, or a `diff-reviewer` read of its range if no report reached the conductor. The
emitted audit messages (`border-contrast.ts`, `norms.ts`) match `docs/reference/cairn-audit.md`'s
samples.

**F2. Build `check:leaks`.** Outcome: a deterministic check in `check:docs-gate` that also runs in
CI (pure Node, unlike tellgrader), built to the audit's design: tiers T1 published, T2 shipped
(skills, claude, chassis, reproductions, CLI messages, TSDoc blocks, template and waymark minus seed
content and synced `.claude/` copies, `CHANGELOG.md` Unreleased as error and released as warning),
T3 agent inputs (briefs, outlines, facts, the register). Classes C1 identity, C2 domain vocabulary,
C3 process (T1 and T2 only), C4 personal data, with the audit's patterns. Allowlist by a
next-line or region `leak-ok` marker with a mandatory reason, and path exceptions only for seed
content and LICENSE. Unit tests cover each class and the allowlist. Acceptance: the check passes on
the tree; every remaining allowlisted line carries a reason; it fails on a planted `ecxc-ski`, a
planted "households", and a planted `(Geoff, 2026-10-07)` in a published page. Also: untrack
`docs/internal/credentials.md` (`git rm --cached`, add it to `.gitignore`, keep the local file); it
holds identifiers only, no key material (verified 2026-10-07).

**F3. Cadence rewrite.** Outcome: `check:tellgrader` passes (43 findings at plan time: about 15 on
rebuilt extend pages, 21 on reference pages, 1 on `choose-an-ai-posture.md`, plus 6
`appositive-stack`). Every fact and citation is kept; every changed sentence with a brief keeps its
brief entry (`check:provenance`). The rewrite follows the brief's tells and both exemplar pairs, reads
each paragraph whole, and never introduces a new hinge run. The drafter is `cairn-docs-drafter`
(Opus); split by arm if the context is large (extend pages, then reference pages), serially, one
writer.

**F4. Close review.** Outcome: one `diff-reviewer` read over `a72250ca..HEAD` against these
rulings and tasks, plus a `cairn-register-editor` read of the five task 8 pages. One fix round if
needed. The friction log gets any new entry (pass-core's out-of-scope rule).

**F5. Owner page and merge.** Outcome: the review page regenerated from the five task 8 pages with
`scripts/docs-review/embed.mjs` and republished to the same URL
(`https://claude.ai/artifact/LQL6u4SWcYZH97kgBH1qGP`, file
`~/.cache/claude-tmp/2a-run/review-page2/stage-2a-task8-review.html`; relabel the read-me entry as
before). HISTORY gets this plan's entry; STATUS points at the engine-pass brainstorm. PR #107's
checks are green, `origin/main` is an ancestor of the branch (merge `main` in if not), then
`gh pr merge 107 --merge`, then `main`'s push CI is green.

**F6. Dotfiles.** Outcome: `~/.dotfiles` pushed. It carries `6b3995f` (boundary-test step),
`541fda5`, `b3ce82b`, `5e36af3`, `26a74c1`, and the code lane's engine-consult wording commit;
`scripts/check.sh` green first.
