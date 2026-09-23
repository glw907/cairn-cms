# The docs reset: design

**Date:** 2026-09-23. **Status:** revision 2, after a three-reviewer adversarial read; for Geoff's
review. **Owner rulings:** Geoff, 2026-09-22 and 2026-09-23. **Inputs:** banked at
[`docs/internal/record/2026-09-23-docs-reset-inputs/`](../../internal/record/2026-09-23-docs-reset-inputs/):
four current-state inventories, two research reports, and three reviews of revision 1
(`review-methodologies.md`, `review-repo-reality.md`, `review-project-prior-art.md`).

cairn's docs are reset from scratch, and the only thing that survives from the current pages is
their verified facts. Claude Code drafts the new docs, so this initiative builds the writing system
first and the outline second. Pass 1 starts from real failures: it runs reader agents against
today's pages, records what breaks, and builds only the machinery those failures justify, ending
with a validated system. Pass 2a, in a fresh session, writes the audience record and runs a
calibration trial on what the chain actually needs. Pass 2b builds a scripted jobs ledger, runs a
structure bake-off, and writes the outline at slot level. There are three owner stops. Nothing here
touches the `0.97.0` cut.

## Why now

The 2026-08-15 outline (`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md`) predates
the extend initiative, the Go `cairn` tool, the doctor's retirement into it, the any-site audit
remediation (retires, internals, chassis, polish), the identity seam, and the shipped agent
guidance layer (`claude/CLAUDE.md`, three skills, `cairn-guidance`). The inventories found the page
structure intact but the target stale: three pages outside the outline, most of its visual layer
unshipped, no contributor docs, no conceptual page for the admin building blocks, and agents served
on three reference pages only.

Pass A's post-mortem (`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`) supplies the central
evidence. A fresh agent that had to write a working wrapper and parser from two pages alone found 15
defects that the register editor, the profile grader, and the fact read had all accepted. The chain
cost about 900K tokens a page over three rounds, and the pass spent 6.1M against a 3.5M ceiling.

## Rulings

1. **Full reset (Geoff, 2026-09-23).** Only verified facts survive. Page lists, structure, order,
   and prose are drawn fresh, including draft-docs pass B's twelve-page list. The old pages are job
   provenance only; no drafter or mining step reads them for prose.
2. **The track structure is reopened (2026-09-23).**
3. **Six audiences (2026-09-23):** evaluator; editor; site operator (installs and runs a site;
   technical enough for Cloudflare, GitHub, and the `cairn` CLI, not necessarily a coder); site
   designer (design-oriented, strong HTML, CSS, and JavaScript, knows SvelteKit or will learn it;
   builds the public side); admin extender; core developer. All but the evaluator and the editor
   have an agent half; the site designer's is an assumption the audience review tests.
4. **The agent profile widens across tracks, with no agent track (2026-09-22).**
5. **The audience spans organization size (2026-09-22).** The identity seam makes cairn plausible for
   large organizations on Cloudflare. The charter's defaults stay tuned for a small editorial team
   (`docs/internal/what-cairn-is-and-is-not.md:36-41`); a large organization is served through the
   seams, and no profile implies the defaults move.
6. **Agentic authorability is a design criterion (2026-09-22).**
7. **Spend on the system, not the pages (2026-09-23).** The grant buys evidence quality, not scope.
8. **Build, then test fresh (2026-09-23).**
9. **Readers run confined, on the plan (2026-09-23, verified by probe).** A reader is a headless
   `claude -p --safe-mode --restricted` process started in a prepared directory, with `--tools`
   naming the tools its class allows, `--allowedTools` scoping Bash to named commands, and
   `--permission-prompts none`. `--restricted` confines the file tools to the working directory;
   `--safe-mode` drops every `CLAUDE.md`, skill, hook, and plugin; authentication is the owner's
   plan login, not an API key. A probe on Claude Code 2.1.280 confirmed each property, with the one
   leak being a directory path containing the project's name.
10. **The operator reader uses real read-only access (2026-09-23).** Read-only `cairn` commands run
    against a real scratch site with read-scoped tokens; a state-changing command is checked as a
    dry run against the command tree. No `tool/` change for testing's sake.
11. **The outline is complete at slot level; contracts are written per pass (2026-09-23).**
12. **The trial tests chain depth, not brief style (2026-09-23).** The research settles persona
    against operational briefs: operational briefs, exemplars over personas.

## Evidence the method follows

From the two research reports and the three reviews:

- A reader that must act is the primary test. A grader is kept for register and tone, fed the Vale
  and `tellgrader` output so it filters rather than rediscovers, and given an omission checklist.
- Whatever a script can check is checked by script: procedures run literally, code-declared
  surfaces are enumerated, anchors are gated. Agents are reserved for judgment (the prior-art
  review's ten cases all converge here).
- A reader's ceiling is what it can see, enforced by the process (ruling 9).
- Every agent report is verifiable: it quotes a `path:line` from each page it read, and the runner
  fails a report it cannot verify (Nx's docs-reviewer rule).
- The drafter always receives its profile and exemplars; nothing depends on it invoking a skill.
- Opus 5.5 buries the point, is weak as an editor, follows instructions inside pasted text more than
  earlier models, may notice a test, and can end a turn early. The brief states "the first sentence
  of each section states its answer"; an applied-findings check follows each redraft; source
  material is wrapped as content; reader jobs are real tasks; the runner keeps a checklist and a
  bounded auto-continue of two.
- Editors and evaluators get human reads (below); their reader agents' reports are a floor.

## Relation to existing designs

- **The 2026-09-08 docs-standard spec.** Kept: its provenance design (`check:provenance`, spec
  lines 569-586: every drafted sentence recorded in the brief's `sentences` list with a ledger id or
  `no-claim`, ids never in the published markdown), its two-round revision cap, and its staged
  delivery with a tuning checkpoint after each stage. Replaced: its unbuilt nine-type registry,
  whose place the outline takes; the live register's five page shapes
  (`docs/internal/docs-register.md:232-258`) stand until the outline rules on page types.
- **The 2026-09-21 draft-docs spec.** Pass A stands. Passes B and C, unmerged on
  `draft-docs-plans`, are replanned against the outline. Its "How a page gets made" and "Testing
  per audience" are superseded where pass 1 changes them; its per-page mining survives only as
  fact harvest, never as a skeleton read from an old page.
- **The facts container** stays the fact basis and gains ids (pass 1).

## Sequencing

- The `0.97.0` cut is independent. Pass 1 touches no published page, `package.json`, or the tarball.
- **The site round does not wait for the reset.** It runs on the current pages; its extender
  source-read log and per-page reports feed pass 1's failure record and the jobs ledger as evidence.
- In-place deficiency fixes on current pages continue under the freeze rule, each filing its
  container bullet, so the harvest keeps pace.
- The docs-infra currency pass
  (`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`) and the reset's
  closing PR both edit cairn-cms `CLAUDE.md`'s docs section; whichever lands second rebases, and
  pass 2b's plan checks the other's state first.

## Pass 1: the writing system, failure-first

A cairn-cms branch `docs-reset-system` plus a dotfiles commit series for workstation artifacts
(under `~/.claude/docs/claude-tooling.md`'s rules, `claude-tooling-sync verify` green).

1. **The reader runner.** Prepares a reader directory under a neutral path (never one naming the
   project), copies in what the reader's class allows, starts the headless process of ruling 9,
   collects the fixed report, verifies its quotes, totals the reported usage into a budget line of
   its own, and tears the directory down. **Acceptance:** a reader asked to open a known repository
   path by file tool and by Bash fails both; a reader's context carries no workstation or project
   instruction file.
2. **Four reader classes:**

   | Class | Contents | Audiences |
   | --- | --- | --- |
   | Docs only | the docs set | evaluator, editor |
   | Docs and binary | the docs set, the released `cairn` binary, read-scoped scratch-site tokens; Bash allowed only for `cairn` | site operator |
   | Docs and site | the docs set and a scaffolded site with the engine installed from a packed tarball, never engine source | site designer, admin extender |
   | Repository | a clean cairn-cms checkout | core developer |

   Every reader returns: job outcome, each stall, each term or step it had to assume, a quote per
   page read, and the deterministic check's result where one exists.
3. **The baseline run.** Before any other component, readers attempt real jobs on today's pages
   through today's chain: an operator job on `docs/admin/is-it-working.md`, a designer job on
   `docs/extend/design-your-site.md`, an extender job on `docs/extend/add-a-custom-admin-screen.md`,
   a core-developer job on `CONTRIBUTING.md`, and the scripter job on pass A's two contract pages
   at their pre-fix commits, whose 15 defects are known. The failure record names what each
   component below must fix; a component with no failure behind it is dropped or deferred, and the
   record says which.
4. **Facts ids and provenance.** Every container bullet gains a content-derived id that is not a
   bracket form, collision-free across parallel worktrees, created wherever a bullet is filed (the
   id rule lands in `check:facts`, the facts README, and every agent definition that files facts).
   The roughly 180 bullets sourced only to an old page are traced to code, rejected, or marked excluded; a
   drafted sentence citing an excluded or candidate id fails. `check:provenance` is built to the
   docs-standard design, and each page's brief, with its `sentences` list, is committed as the
   page-to-claim map. `check:facts` gains a reverse mode listing the pages whose briefs cite a
   changed bullet. Symbol-anchored sources (resolved by the TypeScript compiler for `src/` and a Go
   resolver for `tool/`) are built if the baseline shows line-window rot; otherwise filed.
5. **The drafter agent.** Tools: Read, Write, Edit, Grep, Glob, Bash (for gates). Model
   `claude-opus-5-5` at `high`. Preloads the audience-profile skill through `skills:`; the skill
   defines the profile-file format (one-sentence persona, vocabulary contract, knowledge and tool
   ceiling, arrival states, success criterion, two or three exemplar pages). It replaces
   `cairn-implementer` as the page chain's default `drafterType`.
6. **The revised page chain** (`docs-page-chain.js`). Kept: every existing gate (`check:vale`,
   `check:docs`, `check:reference`, `check:facts`, the figure path, and the rest the draft-docs spec
   lists), the register editor, and the fact read. Changed: the drafter writes the brief's
   `sentences` list and `check:provenance` runs; the register editor reports every finding, and a
   separate Opus 5.5 filter drops only findings that contradict the register or the brief; after
   each redraft, an Opus 5.5 applied-findings check returns applied or not per finding; the reader
   test runs in the profile grader's place; source material is wrapped as content; a text-only turn
   end is a report; the two-round cap holds. Which stages survive is pass 2a's trial's decision.
7. **Docs-as-tests.** Opens with a Doc Detective spike and a recorded build-or-adopt decision. The
   minimum either way: every shell procedure and `--json` output on an operator page runs literally
   under ruling 10's tiers and is checked in code.
8. **Validation, the exit gate.** Each reader class catches the baseline's real failures and a
   planted-defect set (a removed step, an undefined term, a wrong flag, a stale path), and the
   planted set becomes a standing regression floor. A reader that misses either is fixed first.
9. **Failure rule.** If validation cannot get a reader class to catch the known defects, pass 1
   stops and reports to Geoff instead of shipping a weaker instrument.

## Pass 2a: the audience record and the trial

A fresh session on `claude-opus-5-5` conducts, loading pass 1's system. Fable 5.1 at `high`
authors and folds; Opus 5.5 reviews.

1. **The audience record,** written to pass 1's profile-file format plus a narrative record per
   profile: who the reader is and the organization around them, what they arrive knowing, the
   ceiling stated positively, vocabulary, success criterion, the agent half's arrival and precision
   needs, and the real people or evidence the profile rests on (the site designer marked
   provisional until evidence supports it). A hat map covers the likely arrangements: a lone
   developer-operator; a volunteer operator with a hired designer; an agency across several roles;
   a large organization with a platform team as operator, an in-house design team, and a security
   reviewer as evaluator. Audiences considered and rejected are listed with reasons.
2. **The audience review,** four Opus 5.5 lenses reading cold: target users across organization
   size, checked against comparable CMSs' public evidence; boundaries; agent halves, from the
   shipped guidance layer; and an open lens that also compares how peer docs divide audiences.
   Each asks whether each profile is testable as written. **Human reads:** one editor on a club
   site attempts one editor task on a current page, and Geoff or an outside reader attempts one
   evaluator task; both stall logs join the review. One Fable fold. **Owner stop 1**, opened by a
   one-page decision brief.
3. **Trial preparation.** A scoped harvest for the trial's jobs, through pass 1's id and
   provenance path, so the trial drafts from traced facts.
4. **The calibration trial.** Eight to ten jobs across the operator, designer, and extender
   profiles. Each job's page is drafted through a minimal chain (drafter, scripted checks, one
   reader) and through the full chain of pass 1 item 6; the full chain's drafter also runs at
   `medium` and `high`. Each draft gets at least three reader runs, split between Opus 5.5 and
   Sonnet 5 (`claude-sonnet-5`). A separate comparison runs the old profile grader and the reader
   over the labeled defect set (the planted set plus pass A's 15). **Decision rule, fixed now:** a
   stage survives only if it catches defects the minimal chain misses; a tie is reported as no
   evidence and the cheaper chain wins it; the grader stays only for what the reader misses. Trial
   pages live on a scratch branch that never merges; each reader report carries a rule-candidate
   field, and the fold writes accepted candidates into the profile files and the drafter skill.

## Pass 2b: the ledger, the structure, and the outline

1. **The jobs ledger.** A script enumerates the code-declared surfaces (the `cairn` command tree,
   package exports, log events, `conditions.ts` anchors, `check:*` gates) into seed jobs; Sonnet 5
   adds jobs from the facts container, the inventories, and the site round's evidence; a Fable pass
   merges them per profile. Each job carries a done signal a script or a reader can check, so the
   ledger is the docs' acceptance suite. The agent entry points (the scaffolded `CLAUDE.md`, the
   three skills, the extension reviewer, `cairn help agents`, `--json` help lines, tool fix lines)
   are first-class items with jobs of their own.
2. **The structure bake-off.** Three Fable drafters group the jobs into tracks and page slots, each
   with a rationale and what its structure makes hard; the third is briefed to argue against
   audience tracks altogether. **Owner stop 2**, with a recommendation.
3. **The outline,** complete at slot level: every page with path, track, page shape, profile, its
   one-line job, what it owns, and what it defers. Full page contracts are written only for the
   first drafting pass's pages; each later pass writes its own, just ahead of drafting, carrying
   the previous pass's lessons. The outline-level artifacts:
   - the fact-ownership map, topic to owning page;
   - the agent routing table, entry point to pages, with entry-point text changes filed against
     their owners;
   - the pinned-path inventory, built as a gate: every docs path or anchor that code, a gate, the
     tarball's `files` list, `.vale.ini`'s track globs, `claude/` and the skills, or a released
     binary reads (the `cairn.pub/docs/reference/cli-cairn-*` URLs and the frozen schema `$id`s
     cannot move);
   - the retirement map: every current page and `tool/docs/` interim page, the jobs it held, the
     slots that take them, and its harvest status; a page retires only after its facts are traced;
     drafting worktrees carry no old pages once the harvest is done;
   - the drift plan: scriptable done signals join CI, the reverse `check:facts` mode flags pages
     whose facts changed, and a pass that changes a cited fact redrafts those pages;
   - the agent delivery decision (per-page Markdown, `llms.txt`, or neither), recorded against the
     2026-08-03 crawler-posture record;
   - sequencing: which pass executes which slots, each stage followed by a tuning checkpoint.
4. **The outline review,** six Opus 5.5 lenses reading cold: premise and charter; coverage
   (reviewing only what the script did not enumerate); agent authorability; agent readership;
   reader walks per profile; an open lens with no checklist. Each finding carries evidence and a
   proposed fix, and every report quotes what it read. One Fable fold with a revision record; a
   hedged structural finding goes to Fable at `max`. **Owner stop 3.**

### The page contract (per drafting pass)

- **Identity:** path, working title, track, page shape, profile (agent half flagged), executing pass.
- **Job:** one line; arrival states, including mid-failure and arrival from an agent entry point;
  anxieties answered first; the one recommended path wherever alternatives exist; a done signal a
  reader or a script can check.
- **Boundaries:** owns, defers (topic to a named page), links in and out, must not cover.
- **Sources:** facts by id, code paths and symbols, goldens and fixtures, records; external docs
  linked out rather than taught.
- **Pins:** the paths, anchors, and strings the pinned-path gate holds.
- **Visuals:** each with its production path, or deferred with its trigger.
- **Craft:** exemplars, gates, the reader class and jobs that test it.

## What changes downstream

At owner stop 3, one PR: the cairn-cms `CLAUDE.md` docs section; `docs/internal/docs-register.md`'s
track and scripter-or-agent sections, which become pointers to the profile files; the `cairn-pass`
skill's docs step and `site-pass`'s report items; superseded-by notes on the 2026-08-14 and
2026-08-15 records and on the draft-docs spec's replaced sections; STATUS and ROADMAP, including
ROADMAP's stale "scaffolder ships an agent brief" entry. The core-developer track's home is an
outline decision: today's contributor zone is unpublished, outside the tarball, and not linted, so
the outline rules whether that changes. A global `CLAUDE.md` line under Writing voice (a reader
that acts proves agent-drafted docs; graders are for register; exemplars outweigh personas) lands
in dotfiles separately.

## Out of scope

Drafting any published page; the per-track harvest beyond the trial's scope (the retirement map
sequences it); cairn.pub's docs debt. `docs/extend/migration-notes.md`,
`docs/extend/upgrade-cairn.md`, and the reference arm's gated entries stay maintained in place
until the outline rules on them.

## Budgets

Rebased on the repository's measured costs (pass A at about 900K per page and 175 percent of its
ceiling). Pass 1: ceiling 6M, flag at 4.8M. Pass 2a: 8M, flag at 6.4M, of which the trial takes
about 5M. Pass 2b: 8M, flag at 6.4M. Reader runs report their own usage outside the Workflow
budget counter; the runner totals them into each pass's ledger against the same ceilings. A
tripped flag prompts a checkpoint question; no review lens is cut. Fable dispatches receive
pre-extracted inputs, never the raw repository. Attended time: plan approvals, three owner stops,
and the two human reads in 2a.
