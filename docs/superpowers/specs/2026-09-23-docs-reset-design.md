# The docs reset: design

**Date:** 2026-09-23. **Status:** draft for Geoff's review. **Owner rulings:** Geoff, 2026-09-22 and
2026-09-23, in the brainstorming session that produced this spec. **Inputs:** banked at
[`docs/internal/record/2026-09-23-docs-reset-inputs/`](../../internal/record/2026-09-23-docs-reset-inputs/)
(four current-state inventories and two research reports).

cairn's docs are reset from scratch. The only thing that survives from the current pages is
their verified facts. Claude Code drafts the new docs, so this initiative designs two things in
order: a writing system that makes Claude effective at drafting and proves each page against the
reader it serves, then an outline that the system drafts toward. Pass 1 builds and validates the
writing system. Pass 2 runs in a fresh session that loads it: the audience record, a calibration
trial, the jobs ledger, a structure bake-off, and the outline, with three owner stops. Nothing
here touches the `0.97.0` cut.

## Why now

The 2026-08-15 outline (`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md`) predates
the extend initiative, the Go `cairn` tool, the doctor's retirement into it, the any-site audit
remediation (retires, internals, chassis, polish), the identity seam, and the shipped agent
guidance layer (`claude/CLAUDE.md`, three skills, `cairn-guidance`). The inventories found the
page structure intact but the target stale: three pages outside the outline, most of its visual
layer unshipped, no contributor docs (34 `check:*` gates, 4 named in `CONTRIBUTING.md`), no
conceptual page for the admin building blocks, and agents served on three reference pages only.

Pass A's post-mortem (`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`) supplies the
method's central evidence: a fresh agent that had to write a working wrapper and parser from two
pages alone found 15 defects that the register editor, the profile grader, and the fact read had
all accepted, and the chain cost about 900K tokens a page over three rounds. The research reports
agree with it (persona prompts do not change what a model knows; LLM judges miss omissions;
practitioners who got signal graded outcomes).

## Rulings this design rests on

1. **Full reset (Geoff, 2026-09-23).** Only useful facts survive from the current docs. Page
   lists, structure, order, and prose are drawn fresh, including pass B's twelve-page list. The
   old pages are job provenance only; drafters never open them.
2. **The track structure is reopened (2026-09-23).** The four arms must earn their place against
   alternatives.
3. **Six audiences (2026-09-23).** Evaluator; editor (human); site operator (installs and runs a
   site; technical enough for Cloudflare, GitHub, and the `cairn` CLI, not necessarily a coder);
   site designer (design-oriented, strong HTML, CSS, and JavaScript, knows SvelteKit or is willing
   to learn it; builds the public side); admin extender; core developer. Every profile but the
   evaluator and the editor has an agent half; the site designer's is an assumption for the
   audience review to test.
4. **The agent profile widens across tracks, with no agent track (2026-09-22).** Any page an agent
   acts on is written so an agent can act without running things to find out.
5. **The audience spans organization size (2026-09-22).** The small-org framing dates from when
   cairn could not use other sign-in schemes; the identity seam makes it plausible for large
   organizations already on Cloudflare.
6. **Agentic authorability is a design criterion (2026-09-22).** Every page contract must let a
   fresh drafter build the page with no conversation context.
7. **Spend on the system, not the pages (2026-09-23).** The rewrite is token-expensive, so design
   and evidence are not economized; the grant buys evidence quality, not scope.
8. **Build, then test fresh (2026-09-23).** The writing system is built first; the design is
   tested in a fresh session that loads it.

## Evidence the method follows

From [`research-agent-docs-practice.md`](../../internal/record/2026-09-23-docs-reset-inputs/research-agent-docs-practice.md)
and [`research-opus-5-5-drafter.md`](../../internal/record/2026-09-23-docs-reset-inputs/research-opus-5-5-drafter.md):

- A reader that must act on a page is the primary test. A grader is kept for register and tone
  only, with an explicit omission checklist.
- A procedure a script can run is run literally and checked in code (docs-as-tests); a reader
  agent's "done" is backed by a deterministic check wherever one exists.
- A reader's ceiling is bounded by what it can see, not by instructions: a docs-only directory
  with no repository.
- The drafter always receives the profile and exemplars; nothing depends on it choosing to invoke
  a skill.
- Exemplars outweigh personas: two or three canonical pages in `<example>` tags, the persona
  reduced to one sentence.
- Opus 5.5 specifics: it buries the point (the brief states "the first sentence of each section
  states its answer"); it is weak as an editor and can ignore its own diagnosis (a check confirms
  each redraft applied the findings); it follows instructions inside pasted text more than earlier
  models (source material is wrapped as content); it may notice it is being tested (reader jobs
  are framed as real tasks); it can end a turn early (checklist and bounded auto-continue).

Editors and evaluators are the two audiences no agent simulates well. Their readers report every
term or step they had to assume, treated as a floor; human reads stay the gold standard there.

## Pass 1: the writing system

Built before any profile exists, so nothing in it is audience-specific. Workstation artifacts
land in `~/.dotfiles/claude/.claude/` under the rules in `~/.claude/docs/claude-tooling.md`
(one home, one manifest, `claude-tooling-sync verify` green); cairn artifacts land on a cairn-cms
branch. Each component has acceptance criteria the plan expands.

1. **Reader agents by ceiling class.** Four definitions: docs-only; docs plus the `cairn` binary;
   docs plus the showcase chassis; full repository. The ceiling is structural: each reader runs
   against a prepared directory holding only what its class allows. The audience profile, the
   arrival state, and the job arrive in the dispatch. Every reader returns a fixed shape: job
   outcome, each stall, each assumed term or step, and the deterministic check's result where one
   exists. Reader jobs are phrased as real tasks.
2. **A drafter agent** that preloads a new audience-profile skill through `skills:`. The skill's
   scaffold defines the profile-file format (one-sentence persona, vocabulary contract, knowledge
   and tool ceiling, arrival states, success criterion, exemplar list); the profiles themselves
   are pass 2's.
3. **The revised page chain** (`docs-page-chain.js`). The runner wraps source material as content,
   requires a facts-bullet ID on every drafted claim and strips the IDs at the gate, applies a
   bounded auto-continue, and treats a text-only turn end as a report. The chain runs the reader
   test in the profile grader's place, keeps the register editor and the fact read, and adds an
   applied-findings check after each redraft. Drafter default: Opus 5.5 at `high`.
4. **`cairn-register-editor`** reports every finding; a separate step filters.
5. **Stable IDs on facts-container bullets,** enforced by `check:facts`, so claims can cite them.
   `check:facts` has none today.
6. **A docs-as-tests harness** that runs a page's procedures literally and checks outcomes in code,
   grown from `check:snippets`, `check:transcripts`, and pass B's literal-walk design.
7. **Reader validation.** Each reader class runs against pages with planted defects (removed
   steps, an undefined term, a wrong flag). A reader that misses a planted defect is fixed before
   pass 2. This is pass 1's exit gate.

Pass 1 changes no published page.

## Pass 2: the audience record, the trial, and the outline

A fresh session on `claude-opus-5-5` conducts, loading pass 1's system. Fable at `high` authors;
Opus 5.5 reviews.

1. **The audience record.** The six profiles in full, written to pass 1's profile-file format plus
   a narrative record: who each reader is and the organization around them, what they arrive
   knowing, the ceiling stated positively, vocabulary, success criterion, the agent half's arrival
   and precision needs. A hat map covers the likely arrangements (a lone developer-operator; a
   volunteer operator with a hired designer; an agency across several roles; a large organization
   with a platform team as operator, an in-house design team, and a security reviewer as
   evaluator), with the handoffs and the owner of each boundary job. Audiences considered and
   rejected are listed with reasons. The evaluator may split by organization size.
2. **The audience review,** four Opus 5.5 lenses reading cold: target users across organization
   size, checked against comparable CMSs' public evidence and the club sites' real editors;
   boundaries (merges, splits, unowned jobs); agent halves (how agents actually arrive, from the
   shipped guidance layer); and an open lens that also compares how peer docs divide audiences.
   Each lens also asks whether each profile is testable as written. One Fable fold.
   **Owner stop 1.**
3. **The calibration trial.** Three pages across three audiences (site operator:
   `schedule-a-check`; site designer: a theme task guide; admin extender: a building-blocks concept
   page). Arm P drafts from a persona brief; arm O from an operational brief (jobs with done
   signals, ceiling, arrival states, exemplars). Two drafts per arm per page; arm O also compares
   Opus 5.5 at `medium` and `high`. Each draft is read twice by its reader class, on Opus 5.5 and
   on Sonnet 5, plus its deterministic checks, and the current profile grader runs unchanged
   beside them. Measures: stalls, assumed steps, redraft rounds to clear the reader, tokens.
   **Decision rule, fixed now:** O beats P or ties it, so operational contracts win; P winning
   goes to Geoff with a reason before anything changes. If the grader catches nothing the reader
   misses, the reader replaces it in the chain. Trial pages are scratch and never merge.
4. **The jobs ledger.** Every job per profile, sourced from code, the CLI tree, the facts
   container, and the inventories, never an old page. Sonnet extracts; a Fable pass merges.
   Each job carries a done signal, so the ledger doubles as the docs' acceptance suite.
5. **The structure bake-off.** Three Fable drafters group the jobs into tracks and page slots, each
   with a rationale and what its structure makes hard. The third is briefed to argue against
   audience tracks altogether (by job or by site lifecycle). **Owner stop 2:** Geoff picks one or
   a merge, with Claude's recommendation.
6. **The outline.** Every page contract (below) plus the five outline-level artifacts.
7. **The outline review,** six Opus 5.5 lenses reading cold: premise and charter; coverage against
   the code; agent authorability; agent readership; reader walks per profile; an open lens with no
   checklist. Each returns ranked findings with evidence and a proposed fix; a lens may argue the
   premise is wrong. One Fable fold rules on each, recorded in a revision record; a fold that
   hedges on a structural finding sends that finding to Fable at `max`. **Owner stop 3.**

### The page contract

The outline carries the stable part of each page's brief; the drafting pass adds the mined
skeleton, the command and fixture manifests, and the dispositions (the draft-docs spec's "How a
page gets made").

- **Identity:** path, working title, track, page type from the nine-type registry, profile (agent
  half flagged), executes in (a pass, or maintained in place).
- **Job:** one line; arrival states, including mid-failure and arrival from an agent entry point;
  anxieties answered first; a done signal a reader agent or a script can check.
- **Boundaries:** owns, defers (topic to a named page), links in and out, must not cover.
- **Sources:** facts-container sections by bullet ID, code paths and symbols, goldens and fixtures,
  records; external docs linked out rather than taught.
- **Pins:** anchors, slugs, and strings a test or the tool reads, verbatim.
- **Visuals:** each with its production path, or deferred with its trigger.
- **Craft:** exemplars, gates, the reader class and jobs that test it.

### Outline-level artifacts

1. The fact-ownership map: each topic to its one owning page.
2. The agent routing table: each agent entry point (scaffolded `CLAUDE.md`, the three skills, the
   extension reviewer, `cairn help agents`, `--json` help lines, tool fix lines) to the pages it
   routes to, with any entry-point text change filed against its owner.
3. The pinned-anchor inventory: every docs path and anchor code or a gate reads today
   (`conditions.ts` `docsAnchor` values, the Go drift tests, `check:arm-indexes`) and its new
   home.
4. The retirement map: every current page, the jobs it held, the pages that take them, and its
   harvest status. A page retires only after its facts are in the container. Drafting worktrees
   carry no old pages once the harvest is done.
5. Sequencing: which passes execute which contracts.

## What changes downstream

At owner stop 3, in one PR: the cairn-cms `CLAUDE.md` "Documentation is a pass dimension" section,
`docs/internal/docs-register.md`'s track and scripter-or-agent sections (to pointers at the
profile files), the `cairn-pass` skill's docs step and `site-pass`'s report items, superseded-by
notes on the 2026-08-14 and 2026-08-15 records, and STATUS and ROADMAP. Draft-docs passes B and C
(unmerged on `draft-docs-plans`) are replanned against the outline; the draft-docs spec's
"How a page gets made" and "Testing per audience" are superseded where pass 1 changes them. A
global `CLAUDE.md` line under Writing voice (a reader that acts proves agent-drafted docs; graders
are for register; exemplars outweigh personas) lands in dotfiles separately.

## Out of scope

Drafting any published page; the per-page fact harvest itself (the outline's retirement map
sequences it); the site round; cairn.pub's docs debt. `docs/extend/migration-notes.md`,
`docs/extend/upgrade-cairn.md`, and the reference arm's gated entries stay maintained in place
until the outline rules on them.

## Budgets

Pass 1: ceiling 3M, flag at 2.4M. Pass 2: ceiling 14M, flag at 11.2M (about 1.5M for the audience
record and review, 5M for the trial, 1.5M for the ledger and bake-off, 6M for the outline, review,
and fold). At design stage a tripped flag prompts a checkpoint question; no review lens is cut.
Fable dispatches receive pre-extracted inputs, never the raw repository, to respect the weekly
cap. Attended time: three owner stops in pass 2; none in pass 1 beyond plan approval.

## Open for the plans

- Where the reader directories are prepared and torn down, and how the `cairn` binary reader
  authenticates without real credentials.
- The facts-bullet ID syntax and its migration over the existing container.
- The planted-defect set for reader validation.
- Whether pass 1 is one cairn-cms branch plus one dotfiles commit, or split.
