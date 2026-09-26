# Draft docs on a conventional approach: design

**Date:** 2026-09-26. **Status:** draft for Geoff's review. **Replaces:** the reader-validation
line of `2026-09-23-docs-reset-design.md` (stopped 2026-09-25). **Input:**
`docs/internal/record/2026-09-26-docs-approach-handoff.md`.

## Brief

cairn's published docs get rebuilt with the standard technical-writing chain: a per-page brief,
a draft, a technical review, an editorial review, and one revision, run by agents and read by
Geoff as owner and subject-matter expert. Arms go easiest first (reference, extend, admin,
editors, front door), one pass each, under a 20M-token ceiling. The budget goes to pages. The
only new machinery is a small procedure check. The real-use test is the site round that follows
each draft, plus two human task reads. No simulated reader gates anything.

## Owner rulings (this brainstorm, 2026-09-26)

| # | Ruling | Source |
| --- | --- | --- |
| R1 | Keep today's four arms (`admin/`, `editors/`, `extend/`, `reference/`) plus the front door (`why-cairn.md`, the arm READMEs). The six-audience model is dropped. | Geoff, audience question: "3" |
| R2 | Token ceiling about 20M for the whole initiative, with a checkpoint per arm. | Geoff, budget question |
| R3 | Owner review is outline plus sample: Geoff approves each arm's outline, then reads the two or three hardest pages; his notes fold across the arm. | Geoff, review question |
| R4 | Both human task sheets run during the site round, an ASC editor for Sheet 1 and an outside reader for Sheet 2. They inform and never gate. | Geoff, human-reads question |
| R5 | Easy docs first with Geoff's review, working up to hard docs. | Geoff, 2026-09-26 |
| R6 | The existing exemplar corpus stays; find new or better exemplars only where needed. | Geoff, 2026-09-26 |
| R7 | Add a consistency read per arm. | Geoff, 2026-09-26 |

Already settled before this brainstorm, and binding here: draft docs come first, then the site
round tests and fixes them, and site-pass agents may change the docs directly (Geoff, 2026-09-21,
memory `one-release-then-model-sites`). This answers the handoff's open question 1.

### Rulings retired or closed

- Reset ruling 2 (track structure reopened): closed by R1.
- Reset rulings 3 and 4 (six audiences, agent profile across tracks): dropped by R1. The
  `docs-reset-2a-audiences` branch stays archived and unmerged.
- Reset ruling 7 ("spend on the system, not the pages"): replaced by "spend on the pages."
- The core-developer track does not ship.
- The narrative-arm freeze lifts per arm, when that arm's stage merges.

Reset ruling 1 (only verified facts survive; old pages are job provenance only) stands. The
2026-09-08 docs standard stands: pages are rebuilt, never edited, with reference entries
edited in place.

## Stages

Each stage runs as its own pass, on its own worktree, and merges to `main` before the next
starts. Merging is safe: `main` reaches readers only at the next release and cairn.pub's pin
bump. Each later stage's plan is written after the previous checkpoint. Stages 0 and 1 run as
one pass.

| Stage | Scope | Starting share of 20M |
| --- | --- | --- |
| 0 Setup | Rule and fact cleanup, the procedure check (below) | 0.7M |
| 1 Reference | Check each reference page against the container and the export surface; edit in place | 0.8M |
| 2 Extend | Rebuild from a fresh outline; split 2a/2b if the outline passes about 20 pages | 11M |
| 3 Admin | Rebuild; procedures under `check:procedures` | 3.5M |
| 4 Editors | Rebuild in the Microsoft register | 3M |
| 5 Front door | `why-cairn.md` and the four arm READMEs | 1M |

Shares include each pass's planning and close. They start from about 350K per page against
today's page counts (9 admin, 8 editors, 33 extend) and reset at each checkpoint from the
measured cost.

### Stage 0 acceptance

- The narrative-arm freeze is lifted in every place that enforces it: `CLAUDE.md` ("Documentation
  is a pass dimension"), the `site-pass` and `engine-consult` skills, STATUS, and the
  `docs-rebuild-not-edit` memory's freeze rule. The text says the freeze lifts per arm at its
  stage merge and that site-pass agents follow the 2026-09-21 ruling.
- The `site-pass` skill tells a site-pass agent to follow the admin and extend pages exactly as
  written during the round, and to fix or file every divergence between page and reality.
- The four stale owner-fact items from STATUS are settled: the rule count in
  `what-cairn-is-and-is-not.md:49` against the audit's modules, `f:ab9kzr` (published version),
  `f:75hawi` (free tier), and `why-cairn.md:41` against line 84. Each is checked against its
  source first (code, the registry, Cloudflare's published limits). Only owner wording goes to
  Geoff, in one combined question.
- `CLAUDE.md` no longer cites the missing `docs-is-a-pass-dimension` memory.
- The ROADMAP "Now" entry names this spec and drops the inputs it retired.
- `check:procedures` exists, is unit-tested, and runs in the docs gate and CI.
- `docs-page-chain.js` matches the chain below. The profile grader is gone, the drafter is
  `cairn-docs-drafter`, and the per-page record carries the provenance brief path.

## Each stage's flow

1. **Outline.** A page list drawn fresh from the jobs the arm serves, one line per page, each
   with its page type and two exemplars. It carries the arm's term list and its planned
   cross-links. It also lists every rename or removal against today's pages, each with a
   redirect row, because the `cairn` binary prints `cairn.pub/docs/<arm>/<page>` URLs.
   Geoff approves the outline.
2. **Draft.** Every page goes through the page chain, three pages in flight at once.
3. **Consistency read.** After the arm's pages pass, one Opus 5.5 agent reads the whole arm for
   terms, cross-links, overlap, and uneven depth. Its fixes land as one batch through the gate.
4. **Owner read.** Geoff reads the two or three hardest pages, chosen by the conductor. Stage 2
   gets the most, since that stage tunes the method.
5. **Fold.** Geoff's notes apply across the whole arm. A note that generalizes becomes a rule
   where it runs: the register, the drafter prompt, or the runner.
6. **Merge and checkpoint.** The arm merges and its freeze lifts. The owner read is a wait
   before the fold, never a gate on the arm's quality bar.

Stage 1 skips the outline and the owner read unless the check turns up a structural problem.
It edits pages in place under `check:reference`.

## The page chain

The standard editorial chain, run by `docs-page-chain.js`.

1. **Page inputs.** One agent per page writes the page's job, its type, its two exemplars, and
   the fact ids it will draw on. It may read the old page for its list of topics, never its
   prose (reset ruling 1). A fact the job needs that the container lacks is found in code or
   config and filed as a sourced container bullet under `check:facts` before drafting. This
   per-page harvest closes the 40 percent reproduction gap draft docs pass A measured.
2. **Draft.** `cairn-docs-drafter` (Opus 5.5, high) writes the page and its sentence-to-fact
   brief at `docs/internal/briefs/<track>/<page>.json`.
3. **Gate.** `check:docs`, `check:vale`, `check:facts`, `check:provenance` on the page's brief,
   `check:procedures` on pages with fenced `cairn` commands, and `check:reference` in stage 1.
4. **Two reviews in parallel, both Opus 5.5.** The editorial review is `cairn-register-editor`.
   The technical review is a fact read: each claim matches its cited fact, and each cited fact
   still matches its source.
5. **One redraft** on the combined findings, then the gate again. A second `fix` from either
   review goes to the conductor. There is no third round.

The conductor reads only per-page records, never pages or diffs.

### Exemplars

The 68-capture corpus stays (`docs/internal/record/docs-exemplars.md`), unreviewed as a set. Each
outline assigns two exemplars per page type from different sources, since one example invites
copying its structure, phrasing, and content. The drafter prompt names what to take (structure,
register, detail per step) and what to leave (content, terms, product names). Exemplars go in
trimmed to the relevant excerpt. A weak exemplar is swapped at a checkpoint, never mid-arm; a new
one is found outside the corpus only when no capture fits.

## Testing

Four layers, cheapest first.

1. **Static gates** on every page, as listed in the chain.
2. **`check:procedures`,** a repo script built in stage 0. It extracts each fenced `cairn …`
   command from the arm pages. A read-only command (`doctor`, `--json` output, `--help`) runs
   for real against `examples/showcase`, asserting the exit code and, where there is one, the
   JSON shape. A state-changing command never runs: the check confirms its subcommand and every
   flag exist in `cairn <cmd> --help`. Fenced commands that are not `cairn` are out of its scope.
   It needs no container and no scratch site. The Doc Detective spike rejected that tool for
   this split (`2026-09-23-doc-detective-spike.md`) and sized a purpose-built check at a few
   dozen lines.
3. **The site round** follows the admin and extend pages as written and fixes or files every
   divergence (stage 0 puts this rule in the `site-pass` skill).
4. **Human task reads,** per R4, from `docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`.

The Go drift tests on the three CLI contract pages stay. A job-doing reader is an optional check
at about 35K per page, used only on a page Geoff's read flags as confusing. No planted-defect
bar and no simulated-reader gate exist in this design.

## Checkpoints and stops

At each stage close, STATUS records spend against the share, the measured cost per page (which
resets later shares), exemplar swaps, and rules landed from the fold. A stage stops and asks
Geoff when it runs 25 percent over its share, when any page escalates twice, or at 80 percent of
the 20M ceiling (the global stop rule).

## Out of scope

- cairn.pub's pin, redirect routes, nav, and `/schema/` route: cairn.pub's own pass. The redirect
  rows each outline produces are its input.
- Releases. Drafts accumulate on `main` under `## Unreleased`.
- A core-developer track, audience profiles, and any reader harness.
