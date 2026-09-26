# Docs approach handoff: the need and the failure

**Date:** 2026-09-26. **Reader:** a fresh Claude session about to brainstorm, with Geoff, a new
approach to drafting cairn's documentation. **Use:** read this first, then the sources it cites
for any point you will build on. Every claim about Geoff's wishes cites a source line or a memory
name. Where the sources conflict or say nothing, this file lists an open question instead of an
answer.

## Brief

cairn needs its published docs rebuilt: four arms (admin, editors, extend, reference) plus
`why-cairn.md`, written for six audiences, drawn only from verified facts, and shipped inside the
npm tarball that cairn.pub renders. Four production sites and cairn.pub already depend on those
pages, and the narrative arms have been frozen against rewrites while waiting for this rebuild.
The last attempt, the docs reset, spent about 43M tokens across three passes building an automated
simulated-reader instrument meant to gate drafts. The instrument never cleared its own validation,
and no page was drafted. Geoff stopped it on 2026-09-25 and asked for draft documentation built on
a conventional, proven approach (`docs/HISTORY.md:17-19`; `ROADMAP.md:285-291`). This brainstorm
designs that approach.

## The need

### Who reads the docs

- **Four arms plus the evaluator page.** `admin/` (running the default site, no code), `editors/`
  (writing in `/admin`, no terminal), `extend/` (building on the seams), `reference/` (one page per
  export subpath, gated), and `why-cairn.md` for an evaluator (`CLAUDE.md:109-114`). "A page serves
  one track or it is two pages" (`CLAUDE.md:114`).
- **Six audiences** (docs reset ruling 3, `docs/superpowers/specs/2026-09-23-docs-reset-design.md:121-125`):
  evaluator, editor, site operator, site designer, admin extender, core developer. All but the
  evaluator and the editor have an agent half. The agent profile widens across tracks, with no
  agent track (ruling 4, `:126`). The audience spans organization size up to large Cloudflare
  orgs, served through the seams while the defaults stay tuned for a small team (ruling 5,
  `:127-130`; `docs/internal/what-cairn-is-and-is-not.md:36-41`).
- **The track structure is reopened** (ruling 2, `:120`). The four-arm layout in `CLAUDE.md` and
  `docs/internal/docs-register.md:260-343` is today's shape, not a settled target.
- **The scripter-or-agent profile** for the `cairn` CLI's contract pages lives in the register
  (`docs/internal/docs-register.md:375`), written by draft docs pass A (`docs/HISTORY.md:407`).

### What is shipped, frozen, and gated

- The **reference arm** is maintained every pass and gated by `check:reference`; the three
  **narrative arms** and `why-cairn.md` are frozen against rewrites for the finalization window,
  open only to in-place fixes of discovered deficiencies (`CLAUDE.md:120-125`; memory
  `docs-rebuild-not-edit`, "Freeze rule"). `docs/extend/migration-notes.md` and
  `docs/extend/upgrade-cairn.md` sit outside the freeze (`CLAUDE.md:131-132`).
- The **facts container** (`docs/internal/facts/`, 812 bullets across five track files) is the
  fact basis: one sourced bullet per fact with an `f:<id>`, never shipped, never register-graded,
  gated by `check:facts` (`docs/internal/facts/README.md:3-17`; `CLAUDE.md:125-126`). Owner-tier
  bullets carry a key phrase from the owner brief (`docs/internal/facts/README.md:42-49`).
- "The docs rebuild after the site round rebuilds the narrative arms from the container"
  (`CLAUDE.md:126-127`).

### How docs reach readers

cairn.pub renders the doc arms shipped in the npm tarball at its installed engine version. Its
dependency pin is the docs version selector; there is no separate docs deploy
(`CLAUDE.md:146-150`). cairn.pub has been un-pinnable against the registry since `0.95.0`, so no
docs change reaches it until that is fixed (`docs/STATUS.md:15-16`;
`docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md:8-13`). The `cairn` binary prints
`https://cairn.pub/docs/<arm>/<page>` URLs, a frozen contract: move a page and you owe a redirect
(`2026-09-22-cairn-pub-docs-handoff.md:45-52`). Seven check scripts and about 25 `docsAnchor`
values in `conditions.ts` read arm pages directly (memory `docs-to-facts-reshape`).

### The quality bar

- **Style standards:** Google Developer Documentation Style Guide for developer docs, Microsoft for
  `docs/editors/**`, both enforced by Vale (`CLAUDE.md:305-311`). The sanctioned names are
  enforced by `Cairn.Names` rules (`docs/internal/docs-register.md:187`; memory
  `cairn-names-convention`).
- **The register:** the no-pitch keystone. "The writing does the persuading by being excellent,
  never by selling" (`docs/internal/docs-register.md:37-42`), plus the universal contract
  (`:44`) and page anatomies (`:232`). Comparisons never strawman the alternative (memory
  `comparisons-never-strawman`).
- **The docs standard spec** (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`): a page
  is rebuilt, never edited, reference entries excepted; a fact harvest precedes any brief;
  drafters never open the page they replace (`:9-13`; memory `docs-rebuild-not-edit`). The reset
  kept its provenance design, its two-round revision cap, and staged delivery with a tuning
  checkpoint per stage (`2026-09-23-docs-reset-design.md:192-197`).
- **Verified facts only:** "Only verified facts survive. Page lists, structure, order, and prose
  are drawn fresh. The old pages are job provenance only" (reset ruling 1,
  `2026-09-23-docs-reset-design.md:117-119`).

### What exists to build on

- **Facts, fact ids, and `check:provenance`.** Every bullet has an opaque id; `check:provenance`
  checks that each drafted sentence in a page brief cites a ledger id or `no-claim`
  (`docs/HISTORY.md:161-163`; reset spec `:259-273`). `docs/internal/briefs/` holds only its
  README; no page brief exists yet.
- **The exemplar corpus:** 68 captures at `~/.local/share/cairn/exemplars/`, manifest
  `docs/internal/record/docs-exemplars.md`. Only the editor slice's GOV.UK guidance has published
  user testing; the rest rest on reputation (`docs-exemplars.md:9-13`). Never reviewed as a set
  (`ROADMAP.md:292-293`).
- **The audience-profile format** on the unmerged branch `docs-reset-2a-audiences`:
  `docs/internal/audiences/profile.schema.json` with frontmatter keys `id`, `persona`,
  `vocabulary` (`use`, `avoid`), `ceiling`, `arrivalStates`, `success`, `exemplars`, and
  `provisional` (with `provisionalReason` required when true), plus a checker and renderer under
  `scripts/docs-audiences/`. The profiles themselves were never written (`ROADMAP.md:294-295`).
- **Pass 1's docs-as-tests harness** for `docs/admin/` procedures: read-only `cairn` commands run
  literally, state-changing ones checked against `--help` (`scripts/docs-readers/harness/run.ts:1-7`).
  Doc Detective was spiked and rejected in its favor
  (`docs/internal/record/2026-09-23-doc-detective-spike.md:3,49-78`). It lives inside the reader
  harness directory and uses the reader container; see open question 7.
- **Draft docs pass A's output:** three reference pages for the `cairn` CLI's contracts
  (`cli-cairn-exit-codes.md`, `cli-cairn-json-output.md`, `cli-cairn-doctor.md`), shipped in
  `0.97.0`, whose structure Go drift tests pin (`docs/HISTORY.md:404-451`). Pass A measured the
  old page chain at about 900K tokens per page over three rounds (`docs/HISTORY.md:469-472`).
- **Two human-read task sheets**, an editor task and an evaluator task, written for pass 2a and
  never sent back with logs (`docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`,
  Sheet 1 at `:48`, Sheet 2 at `:89`, empty Logs table at `:122`).
- **One content input** for the designer's theme guide: a short section on giving a DaisyUI site
  its own identity through a theme, linking to DaisyUI's docs (Geoff, 2026-09-24,
  `ROADMAP.md:298-300`).
- **The friction log** (`docs/internal/docs-friction-log.md`) holds three live findings.

### Who is waiting

- Four production sites depend on the package, each on its own range; "a stale doc costs real
  users" (`CLAUDE.md:145-146`).
- cairn.pub owes its own pass (the pin, the three contract pages in its nav, a `/schema/` route)
  before anything publishes (`2026-09-22-cairn-pub-docs-handoff.md`; memory
  `draft-docs-initiative`).
- Toward 1.0: "The reference docs cover every export, the guides and the upgrade guide are
  current" and a docs claims-verification audit runs after `beta.1` and blocks `1.0.0`
  (`ROADMAP.md:62-71`).

## The failure

Detail: `docs/HISTORY.md:10-229` (pass 2a, 1b, and 1 entries), and the pass 2a post-mortem at
`git show docs-reset-2a:docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` (`## Post-mortem`).

**What was tried.** Simulated readers: headless Claude sessions in podman behind an egress proxy,
one per audience job, would use a page and report stalls and errors. Their reports would gate a
drafting chain, once each reader class proved it caught planted defects (`docs/HISTORY.md:21-24`).

**The numbers.**

| Pass | Measure | Result |
| --- | --- | --- |
| 1 | Held-out defects caught | 1 of 9; all four classes failed (`docs/HISTORY.md:168-171`) |
| 1b | On-map recall per plant-run | 3 of 24, about 12 percent (`docs/HISTORY.md:38-41`) |
| 2a | Pre-registered pilot bar | 12 of 16 (75 percent); best case from 1b's audit was 13 of 24, about 54 percent (`docs/HISTORY.md:31-44`) |

**The cost.** About 43M tokens counted: pass 1 about 18.7M, 1b 20.07M, 2a 4.53M
(`docs/HISTORY.md:66-68`). No page was drafted.

**Why it failed, method.** A bespoke instrument was built where a conventional method existed. A
job-doing reader reports what its job touches, so blind plants off its path measure plant
placement more than the reader (`docs/HISTORY.md:186-188`). Readers routed around defects and
filed "the page should say X" wishes that the scoring excluded (`docs/HISTORY.md:127-129`).

**Why it failed, process.** The 2a bar was never checked against prior evidence; the 54 percent
ceiling was computable before planning (`docs/HISTORY.md:63-65`; post-mortem, planning miss 1).
Machinery dominated cost: one reader run is about 35k tokens, and every build task drew at least
one reviewer `fix` (`docs/HISTORY.md:66-69,115-116`). Budgets ran 1.3 to 1.5 times low (memory
`docs-reset-initiative`, ruling O12).

**What the readers did show.** Real defects on their own path: pass A's scripter reader found
defects that three graders had passed (19 itemized, `docs/HISTORY.md:199-200`), and round 1
control runs showed 0 false findings in five of six jobs (`docs/HISTORY.md:59-62`).

## Lessons, as constraints for the new approach

1. **Conventional method first.** "When a design fork has a widely used convention or a published
   standard on one side, take it" (memory `conform-to-conventions`; restated for docs at
   `docs/HISTORY.md:68-69`).
2. **Check that a success bar is reachable from existing evidence before planning toward it**
   (`docs/HISTORY.md:63-65`).
3. **Spend on pages, not machinery.** The instrument cost tokens; the pages got none. This inverts
   reset ruling 7, "Spend on the system, not the pages" (`2026-09-23-docs-reset-design.md:132`);
   see open question 3.
4. **Human reads are available and already written.** Two sheets exist and need only sending
   (`2026-09-25-docs-reset-2a-human-reads.md:8-46`); the reset planned human reads for editors and
   evaluators because model reports are only a floor there (`2026-09-23-docs-reset-design.md:188`).
5. **Docs-as-tests suits procedural pages.** Commands and `--json` output on operator pages can run
   literally (reset spec `:291-293`; the harness above).
6. **Method calls are Claude's.** Bring a whole evidence-based method design for one approval; ask
   Geoff one at a time only on product, priority, scope, and budget forks (memory
   `methodology-calls-are-claudes`).

## Conventional practice to consider

Candidates for the brainstorm, not decisions.

| Practice | What cairn already has |
| --- | --- |
| Published style guide plus linter | In place: Google and Microsoft via Vale, `Cairn.Names`, the register (`CLAUDE.md:305-314`) |
| SME or owner review of each page | Geoff is the owner; no per-page review step exists today |
| Docs-as-tests for procedures (Doc Detective style execution) | Pass 1's harness; Doc Detective spiked and rejected for this CLI (`2026-09-23-doc-detective-spike.md`) |
| Task-based usability testing with real users | Two sheets written, never sent; the editor slice's GOV.UK exemplar was itself user-tested |
| Exemplar-led drafting | The 68-capture corpus, unreviewed; the reset favored "exemplars over personas" (reset spec `:158-159`) |
| Review checklist from the register | The register's universal contract and reviewer section (`docs-register.md:44,476`); the `cairn-register-editor` agent |
| Fact-traced claims | `check:facts`, fact ids, `check:provenance` |
| Job-doing readers as a cheap advisory pass | About 35k per page, never a gate (`ROADMAP.md:301-302`) |

## Open questions for the brainstorm

1. **Does the narrative-arm freeze still hold, and when does it lift?** `CLAUDE.md:120-127` freezes
   the arms until "the docs rebuild after the site round"; STATUS names the new approach as the
   next action with no site round first (`docs/STATUS.md:23-25`); the reset said the site round
   does not wait for it (reset spec `:207-208`). The order is unstated.
2. **Does the six-audience ruling stand?** HISTORY lists it as a surviving input
   (`docs/HISTORY.md:71`); ROADMAP says each input is "to keep or drop on its own merits"
   (`ROADMAP.md:291`). The friction log still tags five older profiles
   (`docs-friction-log.md:10-18`), and the register still describes four tracks (`:260`).
3. **Does reset ruling 7 ("spend on the system, not the pages") survive?** The failure record
   argues against it (`docs/HISTORY.md:66-69`); no owner line retires it.
4. **Which arm is drafted first?** The 2026-09-08 staged order ran reference, extend, admin,
   editors, front door last, "easiest first" (memory `docs-rebuild-not-edit`). The reset reopened
   structure and never set a new order.
5. **What does "proven" mean to Geoff?** He asked for "a better proven approach"
   (`docs/HISTORY.md:18-19`) and "conventional practice" (`ROADMAP.md:289-291`). No source says
   whether proof means published industry practice, a measured result on cairn pages, or a human
   read.
6. **How does the facts container feed drafting?** Pass A found the container reproduced only 40
   percent of actionable claims on two admin pages, so mining ran per page (memory
   `draft-docs-initiative`). The reset then ruled that no mining step reads an old page for prose
   (ruling 1). Whether a per-page harvest precedes each draft is unsettled.
7. **Does the docs-as-tests harness survive the reader retirement?** HISTORY lists it as a
   surviving input (`docs/HISTORY.md:72`), but it lives under `scripts/docs-readers/harness/` and
   runs in the reader container, which the retirement removes (`docs/HISTORY.md:74-78`).
8. **What page chain drafts a page, and at what cost?** The old chain cost about 900K per page
   (`docs/HISTORY.md:469`); O12 budgeted drafting at 0.7M per page plus 1.5M per pass, under a
   program cap of about 45M (memory `docs-reset-initiative`). About 43M of that cap is spent; no
   source says whether the cap still applies.
9. **Who are the human readers, and when?** Sheet 1 needs a club-site editor Geoff arranges; Sheet
   2 prefers an outside reader (`2026-09-25-docs-reset-2a-human-reads.md:10-14`). No source says
   whether human reads gate pages or only inform them.
10. **Where do the audience profiles live and merge?** The format sits unmerged on
    `docs-reset-2a-audiences`; the reset planned to replace the register's track sections with
    pointers to profile files (reset spec `:407-409`).
11. **Does the core-developer track ship?** Today's contributor zone is unpublished and outside
    the tarball; the reset left that to the outline (reset spec `:411-413`).
12. **Stale owner-brief and fact items:** "all 28 registered rules" against 36 audit modules, and
    stale facts `f:ab9kzr` and `f:75hawi` (`docs/STATUS.md:29-31`). Drafting from verified facts
    needs these settled first.
13. **The `docs-is-a-pass-dimension` memory** is cited at `CLAUDE.md:146` and does not exist in the
    memory directory. Whatever it held is not available to this brainstorm.

## State of the infrastructure

The reader harness (`scripts/docs-readers/`, its tests, the reader classes) and its clade
infrastructure (the v2 page chain's reader stage in `~/.dotfiles`, the scratch Worker
`cairn-scratch-b`, `CAIRN_DOCS_READER_OAUTH_TOKEN`) are being retired in a cleanup commit the
conductor lands separately (`docs/HISTORY.md:74-78`; `docs/STATUS.md:34-35`). Do not plan around
any of it. The branches `docs-reset-2a` (report fields, judge changes, scorer, the post-mortem)
and `docs-reset-2a-audiences` (the profile format) are archived on origin, unmerged
(`docs/STATUS.md:25-27`).
