# The docs reset: design

**Date:** 2026-09-23. **Status:** revision 3, after three adversarial reviews of revision 1 and one
of revision 2; for Geoff's review. **Owner rulings:** Geoff, 2026-09-22 and 2026-09-23. **Inputs:** banked at
[`docs/internal/record/2026-09-23-docs-reset-inputs/`](../../internal/record/2026-09-23-docs-reset-inputs/):
four current-state inventories, two research reports, three reviews of revision 1, and one of
revision 2 (`review-methodologies.md`, `review-repo-reality.md`, `review-project-prior-art.md`, `review-rev2.md`).

cairn's docs are reset from scratch, and the only thing that survives from the current pages is
their verified facts. Claude Code drafts the new docs, so this initiative builds the writing system
first and the outline second. Pass 1 starts from real failures: it runs reader agents against
today's pages, records what breaks, and builds only the machinery those failures justify, ending
with a validated system. Pass 2a, in a fresh session, writes the audience record and runs a
calibration trial on what the chain actually needs, with a researched exemplar corpus as the
drafters' primary input. Pass 2b builds a scripted jobs ledger, runs a structure bake-off, and
writes the outline at slot level. There are three owner stops. Nothing here touches the `0.97.0`
cut.

## Amendments at pass 1's close (2026-09-24)

Pass 1's execution corrected this spec in six places. Where a line below and the body disagree,
this section wins. The detail is in the pass 1 plan's ledger and post-mortem
(`docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md`).

- **Pass A's defects number 19, not 14.** The 14 was the verifier's ranked summary. The itemized
  ground truth (`0e7f4eb9`) has 19 scripter-visible defects, and the json-output page was tested
  at `29a03eff`, not `3bfaac37`. Every "pass A's 14" below means these 19.
- **Pass 2a defines the profile-file format together with the profiles.** The audience-profile
  skill was deferred: the drafter agent ships without a `skills:` preload, and the page chain
  passes the profile and exemplars in the drafter's dispatch prompt. Pass 2a's folds go to the
  profile files and the drafter agent.
- **The reverse mode and the Go resolver are filed, not built.** `check:facts --cited-by` sits in
  `ROADMAP.md`'s Next tier and the `tool/` resolver in its Later tier, each with a trigger. The
  TypeScript resolver for `src/` was built (rot was 25.4 percent).
- **The candidate triage covered 159 bullets, not 134.** The tag this spec calls
  `[vendor-figure]` is the container's `[vendor]` tag.
- **Pass 1's ceiling rose to 16M, flag at 12.8M** (Geoff, 2026-09-23, after the first spend
  estimate).
- **Pass 1 ends with a built system, not a validated one.** Its validation failed on the
  validation's own design (`docs/internal/record/2026-09-23-docs-reset-validation.md`). Pass 1b
  redesigns the validation and reruns it on the merged system, and pass 2a starts only after pass
  1b passes (Geoff, 2026-09-24).

## Amendments from pass 1b (2026-09-24)

Where a line below and the body or the section above disagree, this section wins.

- **Pass 1b's spec
  ([`2026-09-24-docs-reset-pass-1b-validation-design.md`](2026-09-24-docs-reset-pass-1b-validation-design.md))
  replaces pass 1 items 8 and 9 and changes pass 2a item 5.** Validation gates on-path
  sensitivity over fresh synthesized plants on frozen path maps, precision over the maps' control
  runs, and judge agreement, and reports stability, with a per-class outcome: a class that fails
  runs its readers in pass 2a as advisory only, so pass 2a no longer waits on every class passing.
  This supersedes the section above's "pass 2a starts only after pass 1b passes" for the partial
  case only. If every class fails, that line is restored: pass 1b stops and reports to Geoff
  before pass 2a starts (Geoff, 2026-09-24). Pass 1b runs the core gate only (Geoff, 2026-09-24):
  one tuning round, no transfer set, no Sonnet arm, and no historical mining. Item 8's standing
  regression floor is now pass 1b's frozen test batch, and the baseline failures (F1 to F6, R1 to
  R4) move from a gate to a report, since the instrument was tuned on them. In pass 2a item 5,
  the trial's reader runs are Opus only; pass 1b validates no Sonnet share. The grader
  comparison's labeled defect set is pass 1b's test plants only, since pass 1's plants and pass
  A's defects are development items the reader was tuned on. The trial as fixed is underpowered
  (at three pages it keeps a truly one-third-better chain about half the time), and it measures a
  chain with the reader that chain redrafted against; pass 2a resizes the trial or restates its
  decision rule, and separates the measuring jobs from the chain's reader-stage jobs or adds an
  independent measure, before it runs.
- **Pass 1b's ceiling is 15M, flag at 12M** (Geoff, 2026-09-24: the lower of 15M and the post-cut
  high estimate rounded up, flag at 80 percent), counted by a session ledger script. Pass 1's
  recorded "about 9M" undercounted: under the counting rule (input, output, and cache creation)
  it spent about 18.7M.
- **A program budget for the rest of the reset** (Geoff, 2026-09-24). At pass 1b's close the
  conductor brings Geoff a program budget for the remaining passes, with a lean default: pass 2a
  without the formal chain-depth trial, a minimal page chain that grows only on reader evidence,
  and a measured per-page target. Geoff sets a program ceiling.

## Amendments from pass 2a's brainstorm (2026-09-25)

Where a line below and this section disagree, this section wins.

- **Pass 2a has its own spec,
  [`2026-09-25-docs-reset-pass-2a-design.md`](2026-09-25-docs-reset-pass-2a-design.md), which
  replaces the pass 2a section below, except item 3's exemplar selection rules, which pass 2a's
  spec applies.** Program ruling O12 (Geoff, 2026-09-25) drops the calibration trial (items 4 and
  5) and any freeze. Pass 2a opens with a go/no-go reader pilot, and reader findings block in the
  page chain only for the reader classes the pilot passes.
- **Pass 2a's ceiling is 7M, flag 5.6M** (Geoff, 2026-09-25), against this spec's 14M; the pass 2a
  spec's owner ruling 1 asks Geoff to reset it against a revised estimate of about 13M. Pass 2b
  keeps 8M. Drafting passes are budgeted at 0.7M per page plus 1.5M per pass, and the program cap
  is about 45M counted.
- **Opus 5.5 at `high` authors pass 2a's artifacts;** Fable 5.1 is the escalation only. This
  amendment is the ruling of record. Pass 2b's Fable lines (items 1, 2, and 4) stand until pass
  2b's own spec rules on them.
- **The scratch site stays up past pass 2a** (pass 2a spec, CR7). Pass 1 item 0's "torn down at
  pass 2a's close" becomes: torn down at the close of the last drafting pass that runs
  `docs-and-binary` readers, since the operator reader class needs it. Pass 2a's close runs the
  dry-run listing as a health check only.

## Why now

The 2026-08-15 outline (`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md`) predates
the extend initiative, the Go `cairn` tool, the doctor's retirement into it, the any-site audit
remediation (retires, internals, chassis, polish), the identity seam, and the shipped agent
guidance layer (`claude/CLAUDE.md`, three skills, `cairn-guidance`). The inventories found the page
structure intact but the target stale: three pages outside the outline, most of its visual layer
unshipped, no contributor docs, no conceptual page for the admin building blocks, and agents served
on three reference pages only.

Pass A's post-mortem (`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`) supplies the central
evidence. A fresh agent that had to write a working wrapper and parser from three contract pages
alone found 14 page defects that the register editor, the profile grader, and the fact read had all
accepted. The chain
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
   `claude -p --safe-mode --restricted --strict-mcp-config` process, with `--tools` naming the tools
   its class allows, `--allowedTools` scoping Bash to named commands, `--disallowedTools
   WebFetch,WebSearch`, `--permission-prompts none`, no `--add-dir`, and a fresh directory per run.
   `--restricted` confines the file tools to the working directory; `--safe-mode` drops `CLAUDE.md`,
   skills, hooks, and installed plugins; authentication is the owner's plan login, not an API key.
   A probe on Claude Code 2.1.280 confirmed each property. Because `--restricted` does not confine a
   process Bash starts (a build can read any path), every reader runs inside a podman container
   that mounts only its prepared directory, with a minimal environment (`env -i` plus what the
   class needs) and no D-Bus or keyring. Plan authentication is one long-lived token from `claude
   setup-token`, held in the age store and passed as `CLAUDE_CODE_OAUTH_TOKEN`; no credential file
   is mounted or copied, so nothing refreshes and the owner's login is never touched (plan 1 review
   fold, 2026-09-23). Container egress goes through a host allowlisting proxy. The runner reads the
   `stream-json` init event and fails a run whose tools, MCP servers, skills, or plugins differ
   from the class's declaration and a pinned per-CLI-version baseline; a canary instruction file
   proves `CLAUDE.md` and memory stay unloaded. The accepted residual leak: a reader with `npm` could fetch cairn's
   published package metadata; the runner's transcript scan flags any such fetch.
10. **The operator reader uses real read-only access (2026-09-23).** A scratch site
    (`glw907/cairn-scratch-b`, Worker `cairn-scratch-b`, the pass B plan's design) with tokens
    scoped to it alone. Bash is allowlisted to read-only subcommands of `cairn` `tool/v1.1.0`
    (`sites list`, `health`, `logs` on the scratch site, `doctor` on the reader's own directory,
    `auth list`, `auth check`), with a reader-local `CAIRN_STATE_DIR`. A state-changing command is
    checked as a dry run against the command tree. No `tool/` change for testing's sake.
11. **The outline is complete at slot level; contracts are written per pass (2026-09-23).**
12. **The trial tests chain depth, not brief style (2026-09-23).** The research settles persona
    against operational briefs: operational briefs, exemplars over personas.
13. **Exemplars are a researched, approved input (2026-09-23).** Captured exemplar pages live
    locally at `~/.local/share/cairn/exemplars/`, outside the repository, so every worktree and
    reader directory copies from one place and the trial reads a fixed snapshot. The repository
    keeps only the manifest.
14. **The design spend stands (2026-09-23).** The design stage now totals 34M across three passes
    (pass 1 raised from 6M to 12M at the plan 1 review fold, 2026-09-23);
    the methodology review judged even revision 1's 17M ahead of published practice. Ruling 7
    accepts that, since every later page inherits the system.

## Evidence the method follows

From the two research reports and the three reviews:

- A reader that must act is the primary test. The one grader kept is the register editor, for
  register and tone, fed the Vale and `tellgrader` output so it filters rather than rediscovers,
  and given an omission checklist (pass 1 item 6 builds both). The profile grader goes.
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

0. **Prerequisite: the scratch site.** Claude provisions `cairn-scratch-b` (a private repository,
   Worker, D1) by API. In one owner sitting, the owner mints an account-owned Cloudflare token
   scoped to that Worker plus the narrowest D1 scope available, with an expiry, and confirms adding
   the repository to the cairn-cms GitHub App's installation; GitHub access is an installation
   token minted per batch (plan 1 review fold, 2026-09-23). Tokens are stored through
   `secret-set.sh`. The site is torn down at pass 2a's close.
1. **The reader runner,** a standalone Node script outside the Workflow tool (a Workflow step can
   only call `agent()`, and an agent's Bash caps at ten minutes). The conductor launches it in the
   background between chain stages; it runs a batch of readers in parallel, each in the podman
   container of ruling 9, prepared under a neutral path from the class's contents, with the
   installed package's `docs/`, `claude/`, and `skills/` directories stripped. It verifies each
   report's quotes, checks the init event, totals reported usage into a budget ledger of its own,
   and tears every container down. **Acceptance:** a reader fails to open a known repository path
   by file tool, by Bash, and through an `npm` build script; a web tool call is refused; the init
   event shows no MCP server and only the pinned built-in skills and plugins, and a canary
   instruction file stays unloaded.
2. **Four reader classes:**

   | Class | Contents | Tools | Audiences |
   | --- | --- | --- | --- |
   | Docs only | the docs set | Read, Grep, Glob | evaluator, editor |
   | Docs and binary | the docs set, `cairn` `tool/v1.1.0`, scratch-site tokens | Read, Grep, Glob, Bash (ruling 10's subcommands) | site operator |
   | Docs and site | the docs set and a scaffolded site with the engine installed from a packed tarball | Read, Write, Edit, Grep, Glob, Bash (`npm run` scripts named per job) | site designer, admin extender |
   | Repository | a clean cairn-cms checkout | all file tools, Bash (`npm run check*`, `npm test`, `make -C tool check`) | core developer |

   A reader is given a job phrased as a real task and an arrival state; before pass 2a's profiles
   exist, it gets one neutral sentence describing its class's reader. Every reader returns: job
   outcome, each stall, each term or step it had to assume, a quote per page read, and the
   deterministic check's result where one exists.
3. **The baseline run.** Before any other component, readers attempt real jobs on today's pages
   through today's chain: an operator job on `docs/admin/is-it-working.md`, a designer job on
   `docs/extend/design-your-site.md`, an extender job on `docs/extend/add-a-custom-admin-screen.md`,
   a core-developer job on `CONTRIBUTING.md`, and the scripter job on pass A's three contract pages
   at their pre-fix commits (`3bfaac37`, `3453668f`, `29a03eff`), whose 14 page defects are known
   (the fifteenth finding was the parser's own error). A script also measures line-window rot:
   the share of container pointers whose anchor no longer sits within the window. The failure
   record names what each component below must fix; a component with no failure behind it is
   dropped or deferred, and the record says which.
4. **Facts ids and provenance.** Every container bullet gains an opaque id, minted once, never
   derived from its content, stable across edits, not a bracket form, and collision-free across
   parallel worktrees (a random short id checked unique by `check:facts`). The id rule lands where
   bullets are filed: `check:facts`, the facts README, and every agent definition that files facts.
   The container is the docs-standard design's ledger: its `owner` tier is the bullets sourced to an
   owner brief, and `check:provenance` gets that design's extractor (numerals, versions, paths,
   commands, flags, export and config names). Of the 179 `[candidate]` bullets, the 134 sourced
   only to an old page are traced to code, rejected, or marked excluded, and a drafted sentence
   citing an excluded or candidate id fails; `[external]` and `[vendor-figure]` bullets stay
   citable; `[docs-drift]` bullets are resolved before a page citing them drafts. Each page's brief,
   with its `sentences` list, is committed at `docs/internal/briefs/<track>/<page>.json` (outside
   the tarball) as the page-to-claim map. `check:facts` gains a reverse mode listing the pages
   whose briefs cite a changed bullet. Symbol-anchored sources (the TypeScript compiler for `src/`,
   a Go resolver for `tool/`) are built if the baseline's rot measure exceeds ten percent;
   otherwise filed.
5. **The drafter agent.** Tools: Read, Write, Edit, Grep, Glob, Bash (for gates). Model
   `claude-opus-5-5` at `high`. Preloads the audience-profile skill through `skills:`; the skill
   defines the profile-file format (one-sentence persona, vocabulary contract, knowledge and tool
   ceiling, arrival states, success criterion, two or three exemplar pages). It replaces
   `cairn-implementer` as the page chain's default `drafterType`.
6. **The revised page chain** (a new `docs-page-chain-v2.js`, so today's `docs-page-chain.js` and
   its users are untouched until pass 2a rules). Kept: every existing gate (`check:vale`,
   `check:docs`, `check:reference`, `check:facts`, the figure path, and the rest the draft-docs spec
   lists), the register editor, and the fact read. Changed: the drafter writes the brief's
   `sentences` list and `check:provenance` runs; the register editor receives the Vale and
   `tellgrader` output and an omission checklist, reports every finding, and a separate Opus 5.5
   filter drops only findings that contradict the register or the brief; after each redraft, an
   Opus 5.5 applied-findings check returns applied or not per finding; the profile grader is
   removed and the reader stage takes its place, run by the reader runner between two workflow
   stages (draft, gates, and reads; then redraft); source material is wrapped as content; a
   text-only turn end is a report; the two-round cap holds. Which stages survive is pass 2a's
   trial's decision.
7. **Docs-as-tests.** Opens with a Doc Detective spike and a recorded build-or-adopt decision. The
   minimum either way: every shell procedure and `--json` output on an operator page runs literally
   under ruling 10's tiers and is checked in code.
8. **Validation, the exit gate.** Each reader class catches the baseline's real failures and a
   planted-defect set: copies of the baseline pages, each carrying a removed step, an undefined
   term, a wrong flag, and a stale path, recorded with their locations. The planted set becomes a
   standing regression floor. A reader that misses either is fixed first.
9. **Failure rule.** If validation cannot get a reader class to catch the known defects, pass 1
   stops and reports to Geoff instead of shipping a weaker instrument.

## Pass 2a: the audience record and the trial

A fresh session on `claude-opus-5-5` conducts, loading pass 1's system. Opus 5.5 at `high`
authors the pass 2a plan (Geoff, 2026-09-23). Fable 5.1 at `high` authors the pass's artifacts
(the audience record, the bake-off, the folds); Opus 5.5 reviews.

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
   evaluator task; both stall logs join the review. One Fable fold.
3. **The exemplar corpus.** For each profile and each page shape it will likely need, two or three
   canonical external pages chosen for a matching reader (not only a matching topic), a comparable
   product (SvelteKit, Astro, Cloudflare, Ghost, Payload, CLI manuals such as `gh`), and evidence or
   reputation of working for their readers; agent halves get pages agents demonstrably act on. The
   docs-standard spec's exemplar list is the seed. Each is captured to
   `~/.local/share/cairn/exemplars/` and gets a manifest row in
   `docs/internal/record/docs-exemplars.md`: URL, capture date, local file, and an annotation of its
   structure, the moves that make it work, and what not to copy. One cold Opus 5.5 lens asks whether
   each serves its profile or only looks polished. The corpus is extended in pass 2b once the
   outline fixes page shapes; the first accepted cairn page of each shape later becomes that shape's
   house exemplar. **Owner stop 1** covers the audience record and the corpus together, opened by a
   one-page decision brief.
4. **Trial preparation.** Fable writes full contracts for the three trial pages
   (`schedule-a-check` for the operator, a theme task guide for the designer, a building-blocks
   concept page for the extender), each carrying three or four jobs with done signals, eight to ten
   jobs in all. A scoped harvest supplies their facts through pass 1's id and provenance path.
5. **The calibration trial,** laid out as skill-creator's eval harness where it fits (an evals
   file of jobs, per-run outputs, a blind comparator). Each trial page is drafted twice through a
   minimal chain (drafter, scripted checks, one reader) and twice through the full chain of pass 1
   item 6, all at `high`. Each final draft gets three reader runs, split between Opus 5.5 and Sonnet
   5 (`claude-sonnet-5`). **Measure:** reader-confirmed defects remaining in each chain's final
   drafts, analysed per page, since jobs on one page are not independent. **Decision rule, fixed
   now:** the full chain is kept only if its final drafts carry at least a third fewer
   reader-confirmed defects than the minimal chain's across the trial pages; within it, a stage is
   kept only if it caught a defect no other stage caught; anything smaller is reported as no
   evidence, and the cheaper chain wins. A separate comparison runs the old profile grader and the
   reader over the labeled defect set (the planted set plus pass A's 14), with Fable adjudicating
   each disagreement; the grader's role survives only for defect classes the reader misses. Trial
   pages live on a scratch branch that never merges. Each reader report carries a rule-candidate
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
   - the production signal: what tells us a shipped page works (the site round's source-read logs
     and per-page reports, tool fix-line landings, the reader suite's scheduled re-runs), and where
     it is read at each tuning checkpoint;
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
ceiling). Pass 1: ceiling 12M, flag at 9.6M (raised from 6M at the plan 1 review fold,
2026-09-23: the baseline and validation reader runs, the fix round, and pass A's own overrun). Pass 2a: 14M, flag at 11.2M, of which the trial takes
about 11M (six full-chain drafts at about 900K, six minimal-chain drafts at about 300K, and 36
reader runs at about 100K). Pass 2b: 8M, flag at 6.4M. Reader runs report their own usage outside the Workflow
budget counter; the runner totals them into each pass's ledger against the same ceilings. A
tripped flag prompts a checkpoint question; no review lens is cut. Fable dispatches receive
pre-extracted inputs, never the raw repository. Attended time: plan approvals, three owner stops,
the two human reads in 2a, and one owner sitting at the start of pass 1 (the reader token, the
scratch repository's GitHub App installation, and the scratch site's Cloudflare token). The design
stage totals 34M.
