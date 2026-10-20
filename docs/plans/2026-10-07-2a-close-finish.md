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

The code lane reported `DONE_WITH_CONCERNS` at `b623ff9a` (pushed). Its `npm run check` and
component suite are green. Its full `npm test` never ran clean in one pass: one Firefox
`docs-review-browsers` failure passed in isolation, and the run stopped before the component
project. F1 therefore also requires these:
- A `diff-reviewer` read of `b2c2d162..b623ff9a`.
- One clean `npm test` (the durable-gotchas rerun rule applies).
- A `make -C tool check` that prints `gate exit: 0`.
- Three conductor rulings the lane left open, applied before the merge:
  1. `tool/internal/render/fixtures/fixtures.go` names the consumer sites as sample health-report
     sites, and the render goldens and reference files are built from it. Replace the sites with
     generic ids (`my-site`, `docs-site`, and so on) and regenerate the goldens.
  2. Every audit rule message that prints a `docs/internal/...` path takes the absolute GitHub URL,
     as `norms.ts` now does: `screen-anatomy.ts`, `one-filled-action.ts:170`,
     `stock-default-hazards.ts`, `ConceptList.svelte:431-435`, `admin-css-safelist.ts:62`, and
     `EditorToolbar.svelte`. A `//` comment may keep its path.
  3. `src/lib/content/ids.ts:28` and its test use "Geoff's" as the apostrophe example. Use a
     generic name instead ("O'Brien's").

  Test-file comments that name the club, and the `create-cairn-site` package's maintainer comments
  (which are not shipped), stay as they are.

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

## Post-mortem (2026-10-07)

**What each task landed.**

- **F1.** `leak-cleanup` merged at `6a70471e`. A review fix round dropped the remaining owner and
  ruling provenance from `src/lib`, plus the consumer-site test data under `tool/`. The worktree
  was removed.
- **F2.** `check:leaks` landed in `fda65231..f1700005`. The review fix is `321455aa`: a same-line
  `leak-ok` marker had excused its whole line. `95b07c26` cleared the post-merge hits.
  `docs/internal/credentials.md` was untracked.
- **F3.** `89c44122` covers the extend pages and `6a1692e1` the reference pages. Tellgrader is at 0
  findings across 47 pages. The register's hinge-word list and the tellgrader script header now
  match the detector.
- **F4.** The diff review found two blockers: a consumer site named in the shipped
  `migrations/0002_audit.sql`, which `check:leaks` did not scan, and a missing CHANGELOG entry for
  the audit output change. The register review found 13 blockers on the task 8 pages that
  tellgrader missed, including Geoff's own flagged `check.yml` paragraph, which had never been
  rewritten. The fixes landed in `c10ea293` and the merged `9488056a..8ace1c5a` (merge
  `38af392d`). The verification read found one new blocker: the restrict page omitted
  `devBackendHandle({ access })` for the tutorial site. It was fixed in `930b3167`.
- **F5.** `main` merged into the branch (`f665d5fa`); PR #107 merges after this close.
- **F6.** The dotfiles were pushed at `c22a096`.
- **Conductor rulings.** The debug page's "row" vocabulary and its `cairn help agents` sentence
  were removed. The scaffolded page's Claude Code legend is one line. Section hand-offs were cut
  wherever the heading order already makes them obvious. Both adapter paths are now named. The
  internal ROADMAP ASC naming was left for its own open ruling.

**Engine-pass boundary verdict.** An engine pass is warranted before stage 2b. Its scope is the
spec `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`, which applies Geoff's ruling
1 (an item earns its place only by improving the product); the rulings are at
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`.

**What a later pass would be wrong to rediscover.**

- Tellgrader misses hinge runs split across paragraph breaks, so a register read stays mandatory.
- `check:leaks`' T2 tier must track `package.json` `files`; a test now asserts it.
- `npm run check` needs `NODE_OPTIONS=--max-old-space-size=6144` in a worktree.
- A fresh worktree needs `npm ci`, or vitest resolves the main checkout's install.

**Budgets.** Token spend: about 3.5M against the 6M ceiling (an estimate; the conductor could not
read `/cost`). The fold-rule trial's measure is "no spec-plan-review on this plan": none ran.
