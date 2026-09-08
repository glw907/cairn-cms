# Spec review, lens: plannability and cost

Adversarial review of `docs/superpowers/specs/2026-09-08-docs-standard-design.md` revision 1, one
lens only: can a pass plan be written from each unit with no open reading, are its acceptance
criteria machine-gradeable, is each unit pass-sized, and what does the whole thing cost in the two
budgets. Read-only. Baselines measured against the working tree at 2026-09-08 (`main` at `d565ab77`,
with the untracked figures work present).

Comparison bar for "plannable": `docs/superpowers/plans/2026-09-07-identity-seam-pass.md`, whose
tasks each carry **Files** (modify / test, named to the line range), **Interfaces** (consumes /
produces, with exact spellings), numbered steps, and acceptance criteria phrased as gate outcomes.
That plan's header carries a token ceiling (5.5M), a checkpoint interval, a worktree, and a
contention list. Nothing below is graded against a stricter bar than that.

Measured baseline used throughout:

| Track | Pages | Words |
|---|---|---|
| admin | 9 | 11,448 |
| editors | 8 | 6,767 |
| extend | 33 | 40,507 |
| reference | 25 | 85,278 |
| **published total** | **75** | **144,000** |

Also measured: 432 intra-docs anchor links, 99 references to published doc paths from `src/`,
`README.md`, and `package.json`.

---

## Verdict

**Plannable with fixes, for units 2 and 4 only. Not plannable as written for units 1, 3, and 5.**

Unit 4 is the one unit that could go to a plan this week. Unit 2 needs a licensing rule and an
owner-approval gate moved out of its acceptance criteria. Units 1, 3, and 5 each hide a pass split,
and each rests on at least one mechanism the spec never specifies well enough to implement: the fact
ledger's id scheme and its definition of "proven" (unit 1), the machine-readable page-type
declaration that four of the five new scripts all require and the standard simultaneously forbids
(unit 3), and the rebuild's treatment of anchors, renames, and receipts (unit 5).

The spec is a good design document. It is not yet an implementation order.

---

## Ranked findings

### F1 — BLOCKING. Four of the five new gates need to know a page's type, and the standard forbids the page from saying so.

**Sections:** "The page" (`check:anatomy`), "The section" (`check:headings`), the script table,
unit 3's acceptance criteria.

`check:anatomy` must "fail a page whose required headings are missing or out of order", which
requires knowing which template governs that page. `check:cadence` must report "beside a named
corpus entry", which requires knowing the page type. `check:provenance` must know which ledger a
page's ids resolve against, which requires knowing the track. Yet the spec states, in the same
section: "No page may name its own type or track... The template is the only place a type is written
down."

The page brief is the only other candidate, and the spec never says what a brief *is* as a file: not
its path, not its format, not whether it is front matter, a sibling `.brief.md`, or an HTML comment.
"Four lines... kept beside the page" is a prose description, not an interface. An implementer cannot
write `check:anatomy` from this.

**Fix:** specify the brief as a machine-readable artifact in unit 3, before any script task. The
cheapest shape that satisfies both constraints is a sibling file, `docs/<track>/<page>.brief.yml`,
carrying `type`, `track`, `exemplar`, `corpus_entry`, `needs` (ledger ids), and `deviations`. It is
not the published page, so the "a page must not name its own type" rule holds; it is a fixed path,
so every gate resolves it by convention; it is not in `package.json`'s `files` array, so it does not
ship in the tarball. Make "every published page has a brief file that parses" the first
acceptance criterion of unit 3, and make a missing brief the first thing `check:anatomy` fails on.

### F2 — BLOCKING. `check:provenance` requires a claim classifier that nobody has specified, and its published form is undesigned.

**Sections:** the review chain, step 6; the script table; unit 1's drafting rule; unit 5's criteria.

Two different rules are stated. On the front door: "Every sentence... that states a fact about the
owner or about cairn's stance must carry a footnote id." On a rebuilt page: "every claim must carry
an id that resolves to a fact ledger entry."

The first rule needs a classifier that decides whether a sentence states a fact about the owner. No
script can do that, and the spec does not say a human marks them. The second rule is worse: if
"every claim" means "every claim-bearing sentence", then a rebuilt reference page carries a footnote
marker on most of its 2,707 sentences, and the published markdown becomes unreadable for the reader
the whole standard exists to serve. The spec never shows what a provenance-marked published page
looks like.

**Fix:** decide the marker's published form before unit 3 plans the script, and write one example
page fragment into the spec. The lean answer is that ids live in the brief, never in the published
markdown: the brief's `needs:` list cites ledger ids, and `check:provenance` verifies (a) every id
in the brief resolves, and (b) every *numeric or named* fact in the page (versions, counts, file
paths, export names, config keys — all machine-extractable) appears in at least one cited entry.
That is implementable, gates the class of claim that actually failed on the front door, and puts no
marker in front of a reader. If the owner wants sentence-level provenance on the front door
specifically, scope it to that one page and mark it by hand.

### F3 — BLOCKING. `check:prose-read` makes every future docs edit in this repo re-enter the review chain.

**Sections:** the review chain, step 9; the script table; unit 5's criteria.

"A file beside the page carries the page's content hash... The gate fails when a published page's
hash has no matching receipt." No hash algorithm, no normalization rule, no receipt path, no
staleness policy.

The consequence the spec does not state: after unit 5, *any* change to any published page turns the
repo's gate red until a receipt is regenerated, and a receipt carries "the reviewer's verdict and the
reader's result". A one-word typo fix, a link target updated because an export was renamed, a
version number bumped in an admin page — each one, as written, demands a fresh reviewer dispatch and
a human reader test before `npm test` goes green. The repo runs several passes a month that touch
docs; every one of them inherits this tax. It also collides with `check:docs`, which forces link
edits across pages whenever a symbol is renamed.

**Fix:** hash the page's *prose* only (strip fenced code, tables, link targets, and front matter,
which `measure-prose.mjs` already does) and define three receipt states: fresh, prose-stale, and
structure-stale. Structure-stale (headings changed, sections reordered) re-enters the chain.
Prose-stale below a threshold — say, under 5 percent of sentences changed — re-runs the scripts and
the fresh reviewer but not the reader test. A non-prose change invalidates nothing. State the
threshold in the spec, not in the script.

### F4 — BLOCKING. Unit 3 is thirteen to sixteen tasks. It is a pass and a half, not a unit.

**Section:** unit 3.

Counting the tasks I would write against the identity-seam bar: vendor the PDF and update the
register (1); write eleven templates (2, they will not fit one dispatch); the brief format and its
parser (1, per F1); `check:anatomy` (1); `check:headings` (1–2, see F5); `check:cadence` (1);
`check:provenance` (1–2, per F2); `check:prose-read` (1, per F3); the Vale rules plus must-fire
fixtures (1–2); `check:figures` seven assertions (1); the `check:visuals` alt hole (1); CI wiring and
the per-track scoping (1); the Claude setup changes (1–2, see F7). That is **13 to 16 tasks**
producing five new scripts, eleven templates, a new file format, and edits in two other repos.

The workstation rule is roughly four to eight tasks per pass and says a second task split is the
prompt to propose splitting the pass. This is a fourth split before the plan is even written.

**Fix:** split unit 3 into 3a (the structure spine: brief format, eleven templates, `check:anatomy`,
`check:headings`, CI wiring — six tasks) and 3b (the receipt spine: `check:cadence`,
`check:provenance`, `check:prose-read`, the Vale rules and fixtures, `check:figures`/`check:visuals`
— six tasks). 3a is what unit 4 actually needs to prove the shape; 3b can land while unit 4 runs.
Move the Claude setup changes out of both, per F7.

### F5 — MAJOR. Two of `check:headings`' eight rules are the part-of-speech problem the cost review already priced as Large.

**Section:** "The section"; unit 3's acceptance criterion "holds all eight heading rules".

Six of the eight are cheap regex work: sentence case, one level-one heading, no skipped levels, no
leading `-ing`, question headings only under `docs/editors/`, and (nearly) sentence case. Two are
not: "verb-first for task sections and noun phrases for the rest" and "siblings at one level must
share one form". Both need to decide whether a heading's first word is a verb. English is
ambiguous exactly where docs headings live — "Design your site", "Render safety", "Publish",
"Preview" — and `docs/extend/` already carries headings of both shapes that a naive rule will
misclassify in both directions.

The cost review priced this same class (F3/F6 there, "needs a POS tagger or a finite-verb heuristic
— real work") as Large, and the spec's decision 4a calls the whole of templates-plus-two-scripts
"medium".

**Fix:** split the rule. Ship the six mechanical rules at error level in unit 3a. Ship the two
grammatical rules as a **verb lexicon**: a committed word list of the imperative verbs cairn's docs
actually use (grep the current heading corpus; it is a closed set of maybe forty), with an
allowlist escape and a fixture. State plainly that headings outside the lexicon warn rather than
fail, and that sibling parallelism is checked only when every sibling resolves in the lexicon. No
tagger, no new dependency, and the failure mode is a warning rather than a false red.

### F6 — MAJOR. Unit 1 does not define "proven", does not define a claim's granularity, and does not define its id scheme — the three things everything downstream resolves against.

**Section:** unit 1 and its acceptance criteria.

Three gaps, each fatal to a plan:

1. **Granularity.** "One entry per claim" over 144,000 words. If a claim is a sentence, the ledger
   is roughly 5,000 entries, of which 2,700 come from the reference track. If a claim is a
   proposition a page depends on, it might be 800. The spec gives no rule, so two harvest agents on
   two tracks will produce ledgers an order of magnitude apart, and unit 5's `check:provenance`
   resolution rate is meaningless across them.
2. **"Proven."** The spec lists five *kinds* of proving source but no decision procedure. An agent
   holding a claim and a code path has no stated test for whether the path proves the claim. Nor
   does the spec say the one thing it most needs to say: **another published page is never a proving
   source.** Circular provenance is the exact failure that let the front door assert a workflow that
   never happened.
3. **The id scheme.** "The ledger ids are stable and citable" is the whole criterion. No format, no
   uniqueness scope, no retirement rule, no answer for a claim later found false. `check:provenance`
   is a resolver with no address format to resolve.

Compounding: the ledger's path is `docs/internal/record/<date>-docs-rebuild/<track>-facts.md`, and
`<date>` is unbound. Unit 5, planned weeks later, must resolve a path whose first segment nobody has
fixed. In the identity-seam plan every produced interface is named to its exact spelling; here the
central produced artifact has a wildcard in its path.

**Fix, all four in unit 1's first task:**
- Claim granularity: one entry per *checkable proposition* — a statement that could be false and
  whose falseness a reader would act on. Version numbers, counts, paths, export names, defaults,
  behaviors, promises about who does what. Explicitly not: transitions, motivation, or restatements.
- Verdict tiers: `gate` (an existing gate or fixture already asserts it — name the gate),
  `read` (an agent read it — name `file:line` and the commit sha), `owner` (an owner brief line),
  `unverified`.
- Ids: `<track>-NNN`, monotonic, never reused, retired entries kept as tombstones.
- Path: fix the date in the spec now, or drop the date and use
  `docs/internal/docs-rebuild/<track>-facts.md`.

Add a sixth criterion, and a gate that makes it real: a `check:ledger` that re-resolves every `read`
entry's `file:line` and fails when the path is gone. That converts "the harvest went stale" from
prose into a failing test, which is this repo's own stated standard for a watch item.

### F7 — MAJOR. Unit 3 edits two other repos and the home directory, where this repo's gate and its diff reviewer cannot see anything.

**Sections:** "The Claude setup"; unit 3's last acceptance criterion.

Seven of the listed pieces live outside `cairn-cms`: `~/.claude/CLAUDE.md`, the writing-voice output
style, `~/.claude/docs/voice/`, four agent definitions, two skills, and the tellgrader change (about
285 lines of Go in `~/Projects/poplar`). The pass chain grades a task by `git diff` in the repo plus
`npm test`. Neither reaches any of those. "The Claude setup changes land as listed, with both
`CLAUDE.md` files net-neutral in line count" is ungradeable by the mechanism that is supposed to
grade it.

There is also an unresolved owner decision hiding inside it. The cost review's F6 measured both
`CLAUDE.md` files at or over the workstation's own 6,000-token budget hook and at 1.7× Anthropic's
line guidance, and recommended **zero** new rules in either. The spec answers with "four lines must
replace four others". Which four come out is a taste call about the owner's standing instructions.
An implementer must not make it.

**Fix:** lift the Claude setup out of unit 3 into its own small unit (call it 3c) run in the main
loop, not through the repo chain, with the four-lines-out decision taken by the owner at the same
sitting that approves the corpus. Price the tellgrader change separately; it is a different repo with
a different gate (`make check`).

### F8 — MAJOR. The serial rule is asserted with a false reason, and it costs the initiative its cheapest parallelism.

**Section:** "Implementation": "A unit must not start before the unit above it merges, because each
depends on what the one above produces."

That reason does not hold for the first three. Unit 2 (fetch and measure corpus excerpts) consumes
nothing unit 1 produces. Unit 3 (scripts, templates, Vale rules) consumes nothing unit 1 produces,
and consumes from unit 2 only a corpus entry name for `check:cadence`, which a fixture satisfies.
The true graph is:

```
1 (ledger) ─┐
2 (corpus) ─┼─→ 4 (demo page) ──→ 5 (rebuild)
3 (gates)  ─┘
```

Units 1, 2, and 3 are genuinely independent and share no file. Unit 1 splits further into five
independent per-track chains. The spec's own workstation rules say to parallelize where tasks are
genuinely independent and to name the contended resource when serializing; here nothing is contended
and the serialization is stated as fact.

**Fix:** state the graph as above in the Implementation section, mark 1, 2, and 3 as independent so
`pass-execute-chains` can take them in parallel worktrees, and name the only real contention:
`docs/STATUS.md`, `ROADMAP.md`, `CHANGELOG.md`, and `docs/internal/docs-register.md`, reconciled by
whichever merges second, exactly as the identity-seam plan does.

### F9 — MAJOR. Unit 4 proves the loop *after* paying for the whole harvest. Reverse it.

**Sections:** "Proposal" (the ordering rationale); units 1 and 4.

Unit 4 exists to prove the rebuild shape on one page "before it is planned across the whole published
set". Good. But the ordering puts a 2 to 4.5 million token harvest of all 75 pages ahead of that
proof. If the demonstration page teaches anything about what a ledger entry must carry — and it
will, because F6 shows three central questions are open — the harvest is redone or patched across
five files.

**Fix:** harvest **one page** (`docs/extend/add-a-custom-admin-screen.md`) as unit 1's last task,
run unit 4 against it, then run the full harvest. Concretely: reorder to 1-slim → 2 ∥ 3a → 4 →
1-full ∥ 3b → 5. The full harvest then starts from a ledger schema that a real rebuild has exercised,
and the owner's approval gate at unit 4 arrives before the largest autonomous spend rather than after
it.

### F10 — MAJOR. Nine acceptance criteria across the five units cannot be verified by an agent.

A criterion an agent cannot check is a defect. The list, with a gradeable replacement for each:

| Unit | Criterion as written | Why it fails | Gradeable replacement |
|---|---|---|---|
| 1 | "Every published page's claims are accounted for" | Unbounded; the Risks section admits nothing catches a miss | Per page: a ledger entry for every extractable fact token (version, path, export name, numeral, config key) the page contains, checked by script |
| 1 | "No drafting dispatch in a later unit reads an old published page" | A claim about future units | This unit commits a dispatch-prompt fragment plus a plan lint that fails a plan whose drafting task lists an old page in its Files |
| 1 | "The ledger ids are stable and citable" | No id scheme exists | Ids match `^<track>-\d{3}$`, unique within the file, checked by `check:ledger` |
| 2 | "no later unit drafts a page against an unapproved entry" | Future tense | `check:cadence` and `check:anatomy` refuse a brief naming an entry whose manifest approval column is empty |
| 2 | "The three existing samples are migrated... and the record directory keeps no second copy" | Gradeable — keep it | — |
| 3 | "Both `CLAUDE.md` files net-neutral in line count" | One file is outside the repo | Move to 3c per F7; grade by the workstation budget hook exiting 0 |
| 4 | "The owner has read the rebuilt page and has approved unit 5" | Owner action inside a task's criteria | Make it the plan's closing gate, not a task criterion; the task's criterion is that the comparison artifact exists |
| 5 | "drafted fresh... by an agent that did not open the page it replaces" | Unverifiable from a diff after the fact | Enforce at dispatch (the drafting agent's readable file list), and record the dispatch id in the receipt |
| 5 | "with no path-scoped exclusions left" | Gradeable — keep it, and it is the right shape | — |

### F11 — MAJOR. The rebuild breaks 432 anchors and has no story for renamed or deleted pages.

**Sections:** unit 5; "Compatibility".

Measured: 432 anchor-bearing links inside the published docs, and 99 references to published doc
paths from `src/`, `README.md`, and `package.json`. A fresh draft against a template changes nearly
every heading on the page, so every inbound anchor to that page dies.

`check:docs` catches it — it resolves each `#anchor` against real headings, and it is already in the
gate. That is the good news and also the problem: the rebuild branch goes red on the first page and
stays red until the last inbound link is fixed. A track's worth of red is a branch nobody can gate,
which is how a long-lived rebuild branch diverges from a `main` that ships several passes a month.

Worse, nothing addresses **renames and deletions**. The standard actively invites them: "a page whose
job nobody can state in one line is two pages", and eleven page types will not map one-to-one onto
75 existing files. Published docs ship inside the npm tarball (`package.json` `files` lists
`docs/reference`, `docs/admin`, `docs/editors`, `docs/extend`, `docs/README.md`, `docs/why-cairn.md`),
and a markdown tarball has no redirect mechanism. Readers arriving from search, from the admin's help
link, and from npm — the spec's own list — land on a 404 with no recourse.

**Fix, three parts:**
- Make the ledger carry an **anchor map** per page: old heading → new heading, or old heading →
  retired. Unit 1's harvest is already reading every page; capturing its headings is nearly free, and
  it is the artifact that lets the rebuild fix inbound links mechanically.
- Rebuild a page and repair its inbound links in the **same task**, so the branch is green after each
  task rather than after each track.
- Add a rename policy to the Compatibility section: a published page's path is stable unless the
  owner approves the rename; an approved rename leaves a stub page at the old path linking to the new
  one for one minor version. State that in the spec, because it is a product decision, not an
  implementer's.

### F12 — MAJOR. Unit 5's gate list is incomplete, and a drafter forbidden to read the old page cannot satisfy several of the gates it omits.

**Section:** unit 5's fourth acceptance criterion, which names `check:snippets`,
`check:reference:signatures`, `check:transcripts`, and `check:docs`.

The repo's published-docs gates also include, all keyed to page paths or page content:
`check:arm-indexes` (every arm index must link every file in its directory), `check:symbols` (CLI
flag extraction from shell-tagged fences), `check:editor-quotes`, `check:prose`, `check:visuals`
(mermaid `accTitle`/`accDescr` plus a caption paragraph, image alt text, and `repro` fence validation
against the installed manifest with numbered callouts matched by a keyed list), and `check:figures`.

`check:transcripts` is the sharpest case. It carries a hardcoded `PAGE_FLOORS` map —
`docs/admin/create-your-site.md` must carry three transcript blocks, `is-it-working.md` at least one
— and each block must replay byte-identically against a named fixture under
`packages/create-cairn-site/test/fixtures/transcripts/`. A drafter who has never opened the old page
cannot know the floor exists, cannot know which fixtures the page quotes, and cannot reproduce a
block it has not seen.

The spec half-addresses this ("a gated block is a ledger entry that points at the fixture its gate
checks") but never says the ledger carries the **block body verbatim**, which it must.

**Fix:** unit 5's criterion becomes "the full `npm test` gate passes", full stop, the way every other
plan in this repo states it. And unit 1's ledger schema gains a block-entry kind that carries the
fence verbatim, its language tag, its marker comment, and the fixture path — plus a note that a
verbatim block is the one exception to the no-old-prose rule, because a code fence is not prose.

### F13 — MODERATE. Decision 5a and unit 3 build on `check:figures`, which does not exist on `main`.

**Sections:** decisions 5 and 5a; unit 3's `check:figures` criterion; the figure rules.

`git show HEAD:package.json` has no `check:figures`. The script (`scripts/figures/`), its authoring
source (`docs/internal/site-figures.svg`), its outputs (`docs/extend/assets/`), and the `package.json`
line are all uncommitted working-tree changes right now. Decision 6 compounds it: "the concept figure
comes off the front door" — but neither `docs/why-cairn.md` nor `docs/README.md` carries a figure
today. The only figure-bearing published page is `docs/extend/architecture.md`, and its assets are
untracked.

So a spec unit is written against artifacts that exist only in one uncommitted working tree. That is
also a live tripwire under the workstation's one-executor-per-worktree rule: warm uncommitted changes
at dispatch time are a stop-and-investigate signal.

**Fix:** land the figures work on `main` before any unit-3 plan is written, and re-verify decisions
5, 5a, and 6 against the merged state. Name the front-door file by path in decision 6; the spec never
does, and "the front door" is ambiguous between `docs/README.md` and `docs/why-cairn.md`.

### F14 — MODERATE. Only unit 5 is sized. The four units ahead of it add five to ten million tokens nobody has priced.

**Sections:** "Goals and non-goals" (the six-to-nine-million figure); Risks ("Unit 5 is large");
"Decisions adopted" (small / medium sizes).

The spec sizes the docs pass and says the implementation order "places it last and sizes it as its own
initiative". It never states the initiative's total, and it never states a token ceiling or a
checkpoint interval for units 1 through 4. Every plan in this repo carries both in its header; a spec
that orders five plans should carry the per-unit budget the plans will inherit.

The decision table's sizes do not fill the gap either. It calls decisions 1, 2, 4, 5, 8, and 10
"small", but six smalls plus four mediums in one unit is not a small unit, and the sizes are given
per decision rather than per unit.

**Fix:** put the unit table below into the Implementation section, with a token ceiling per unit and
a checkpoint interval, and state the initiative's total. It roughly doubles the number the Goals
section quotes, and the owner should see that before unit 1 is dispatched.

### F15 — MODERATE. The attended-sitting count is undercounted by roughly a third, and units 1 through 3 are counted at zero.

**Sections:** Risks ("The attended cost... about forty sittings"); Open items.

The spec counts only decision 9's forty reader tests. Not counted:

- **Unit 1's unverified list.** A harvest over 144,000 words will produce dozens of claims with no
  proving source. Each is an owner ruling: is it true, is it aspirational, does it come out. Two to
  four sittings, and they are the highest-value sittings in the whole initiative, because that list
  is the front-door failure generalized to 75 pages.
- **Unit 2's approvals.** Decision 7 plus the hand-picked editors entry plus any licensing calls.
  One to three sittings.
- **Unit 3's taste calls.** Which four lines leave each `CLAUDE.md`; the severity and scoping
  decisions; the fallback ruling when the two grammatical heading rules prove unreliable. Two to four.
- **Unit 4's read.** The comparison read plus the reader test on that page. One to two.

Total across the initiative: **46 to 86 sittings**, against the 40 the spec names.

**Fix:** state the sitting count per unit in the Implementation section, and batch each unit's
owner decisions into one scheduled sitting at that unit's checkpoint, per the process-proportionality
rule. Four batched sittings for units 1 through 4 is achievable; four scattered ones are not.

### F16 — MODERATE. Unit 2 has no rule for a source whose license forbids redistribution.

**Section:** "The corpus"; unit 2's criteria.

The manifest records "source, license, fetch date". The exemplar list names PostgreSQL, MDN,
Cloudflare, Stripe, GOV.UK, Kubernetes, Astro, SQLite, and the Rust RFC template. Several of those are
proprietary documentation with no redistribution grant. `cairn-cms` is a public MIT repository.
`docs/internal/` is not in `package.json`'s `files` array, so the excerpts do not ship in the
tarball — that part is safe — but they would sit in a public git history.

The spec gives an implementer no rule for what to do when a source's license does not permit a
400-word excerpt.

**Fix:** add a criterion. An entry whose license does not permit redistribution is recorded in the
manifest as **reference-only**: URL, fetch date, and the measured numbers, with no excerpt committed.
A reviewer grading against a reference-only entry uses the numbers and the section order, which is
what a structure-only entry already does. Then state that the corpus prefers permissively licensed
sources where two candidates serve the same page type.

### F17 — MODERATE. Unit 4's acceptance criteria and the receipt contract contradict each other.

**Sections:** the review chain, step 9; unit 4's criteria.

`check:prose-read`'s receipt carries "the page's content hash, the measurement table, the corpus
entry, the reviewer's verdict, **and the reader's result**". Unit 4 requires "Every gate from unit 3
passes on the page" and "The page has... a receipt". So the receipt needs a reader result, which
means the reader test must run inside unit 4 — on a task guide, meaning someone who is not the author
does the task from the page. Unit 4's criteria never mention it, and the Open items section puts all
forty reader-test sittings inside unit 5.

**Fix:** name the reader test explicitly in unit 4's criteria as one sitting. It is the right place
for it: unit 4 exists to prove the loop, and the reader test is the loop's most expensive step and
the one the owner most needs to see costed before approving forty more.

### F18 — MINOR. Unit 5 is called "one pass plan" and "its own initiative" in the same document.

**Sections:** "Implementation" opening ("Five units, in order. Each is one pass plan"); unit 5
("It must be planned with its own token ceiling"); Risks ("planned as its own initiative... never
folded into another pass").

At 50 non-reference pages, each carrying a brief, an outline review, a fresh draft, a reviewer pass,
a receipt, and up to two revision rounds, unit 5 is 50 or more tasks. Nothing in the workstation rules
contemplates a 50-task plan.

**Fix:** say plainly that unit 5 is an initiative of four to five plans, one per track, each with its
own ceiling, and that the front door is its own plan. Number them now so later work can point at
them.

### F19 — MINOR. Unit 5 has no branch model, and a months-long rebuild branch will not survive `main`.

**Section:** unit 5.

The repo runs feature worktrees off `main`, one per pass, "so `main` stays releasable", and it
currently runs two passes in parallel. Unit 5 spans four or five plans over weeks, touching 75 files
that 99 code and README references point into.

**Fix:** one worktree and one PR **per track**, merged as each lands, with the gate scoping widened
by one track at each merge (which is exactly what the Compatibility section's scope-and-widen rule
already implies but never ties to a branch). Never one long-lived rebuild branch.

### F20 — MINOR. The rebuild's own drafting rule leaks the prose it exists to exclude, and cairn.pub needs one line.

**Sections:** unit 1's drafting rule; Risks ("prose infection").

Unit 1 controls infection by keeping the drafter away from the old page. But if a ledger entry is a
sentence lifted from that page, the ledger *is* the old prose, delivered one sentence at a time, and
the drafter reads all of it.

**Fix:** require ledger claims in a normalized, non-prose form — a proposition under fifteen words,
or a `subject / predicate / value` triple — and ban verbatim sentence copying except for the gated
blocks of F12.

Separately, one line the spec should carry: cairn.pub renders the doc arms from its **installed**
engine version, so a rebuild on a branch is invisible to the live docs site until a release and a pin
bump. That is genuinely good news and worth stating, with the one rider — if unit 5 renames or
removes pages, cairn.pub's own navigation and any hardcoded links break at that pin bump, so the pub
repo needs a consultation before the first track merges.

---

## Unit table

Token figures are rough order, derived from chassis-A's observed 0.3M to 0.6M per structural task and
the cost review's 80–120k per docs page for an implementer plus reviewer chain. Sittings are the
owner's attended time, counting one combined question as one.

| Unit | Tasks I would write | Depends on | Tokens (rough order) | Attended sittings | Plannable? |
|---|---|---|---|---|---|
| 1 — fact harvest | 7–9 written, but the reference track alone needs per-page dispatch (25) → **realistically 12–15** | none | **2.0–4.5M** | 2–4 (the unverified list) | No — F6, F10 |
| 2 — corpus | 4–5 | none | **0.3–0.6M** | 1–3 (decision 7, the hand-picked editors entry, licensing) | With fixes — F16, F10 |
| 3 — rules and gates | **13–16** | 2 (weakly; a fixture suffices) | **2.5–4.5M** | 2–4 (the CLAUDE.md lines, severity calls, heading-rule fallback) | No — F1, F2, F3, F4, F5, F7 |
| 3c — Claude setup (extracted per F7) | 3–4, run in the main loop, two other repos | none | 0.3–0.6M | 1–2 | With fixes |
| 4 — demonstration page | 4–5 | 1 (one page's ledger), 2, 3a | **0.3–0.5M** | 1–2 (the comparison read, the reader test) | **Yes** |
| 5 — docs rebuild | **50+**, i.e. 4–5 plans | 1, 2, 3, 4 | **8–12M** (the cost review's 6–9M, plus briefs, outline reviews, receipts, and the two-round cap) | 40–75 | No — an initiative, not a unit |
| **Initiative total** | | | **13.5–22.5M** | **47–90** | |

The spec's Goals section quotes six to nine million for the docs pass. The four units ahead of it add
five to ten million more, and the initiative's real total is roughly twice the figure the spec puts in
front of the owner.

---

## What would make this plannable

In order, cheapest first:

1. Specify the brief as a machine-readable sibling file (F1). Everything in unit 3 unblocks behind it.
2. Fix the ledger schema: granularity, verdict tiers, id format, path, anchor map, verbatim block
   entries (F6, F11, F12, F20). One page of spec.
3. Decide `check:provenance`'s published form and `check:prose-read`'s staleness policy (F2, F3).
   Both are owner-facing product decisions, not implementer decisions.
4. Split unit 3 into 3a and 3b, extract 3c, and reorder so the demonstration page comes after a
   one-page harvest (F4, F7, F9).
5. State the true dependency graph and mark 1, 2, 3 independent (F8).
6. Land the figures work on `main` and re-verify decisions 5, 5a, 6 (F13).
7. Put a token ceiling, a checkpoint interval, and a sitting count on every unit, and state the
   initiative total (F14, F15).

With those seven, units 1 through 4 become plannable at the identity-seam bar. Unit 5 remains an
initiative and should be re-specified as one after unit 4's demonstration reports what a page
actually costs.

---

## The two-plan split (owner direction, 2026-09-08)

Direction taken: **plan one** builds the toolset (units 2, 3, 4) and runs the fact harvest
(unit 1); **plan two** is the docs rewrite (unit 5), authored only after plan one lands so each
brief cites real ledger ids and runs against real gates.

**The split is sounder than the spec's own ordering, and the spec does not currently support it.**

### Does the Implementation section support it?

Not as written, in three places, each needing an edit:

1. **"Five units, in order. Each is one pass plan."** The split makes units 1 through 4 one plan
   and unit 5 another. The sentence has to go, replaced by the two plans and the chain structure
   below.
2. **"A unit must not start before the unit above it merges, because each depends on what the one
   above produces."** The stated reason is false for units 1, 2, and 3, which share no file and
   consume nothing from each other (F8). The owner's split relies on that being false, so the spec
   must say so rather than assert the opposite. The one real edge inside plan one is unit 4, which
   joins all three.
3. **The unit-4 ordering.** The split leaves the demonstration page fourth, after the full 75-page
   harvest. F9 argues the reverse: harvest one page, prove the loop, then harvest the rest.
   Under the two-plan split this matters more, not less, because the whole point of plan one is to
   hand plan two a ledger schema that works. Recommended order inside plan one: harvest
   `docs/extend/add-a-custom-admin-screen.md` alone as the harvest chain's first task, run the
   demonstration page against it as soon as the structure gates land, then let the full harvest run.

### Plan one's chains, and which are genuinely independent

Plan one at my task counts is **35 to 40 tasks and 5.4 to 10.7M tokens**. That is larger than
polish-A, which the polish spec calls "the largest pass since the internals pass" at sixteen tasks
and a 7M ceiling. Plan one cannot be one plan document with one ceiling. It is one *initiative* of
five chains:

| Chain | Contents | Independent of | Tasks | Tokens | Gate slots |
|---|---|---|---|---|---|
| **H** — harvest | Unit 1: the ledger schema, then one sub-chain per track (admin, editors, extend, reference, front door) | everything | 12–15 | 2.0–4.5M | none (no build) |
| **C** — corpus | Unit 2 | everything | 4–5 | 0.3–0.6M | none |
| **G1** — structure spine | The brief format and parser, eleven templates, `check:anatomy`, `check:headings`, CI wiring | H, C (a fixture stands in for a corpus entry) | 6 | 1.2–2.0M | light |
| **G2** — receipt spine | `check:cadence`, `check:provenance`, `check:prose-read`, the Vale rules with must-fire fixtures, `check:figures`/`check:visuals` | H; needs C's manifest shape only | 6 | 1.3–2.5M | light |
| **S** — Claude setup | The seven pieces outside this repo, plus tellgrader | everything | 3–4 | 0.3–0.6M | poplar's own `make check` |
| **join** — demonstration | Unit 4 | depends on H (one page), C, G1, G2 | 4–5 | 0.3–0.5M | full |

H, C, G1, G2, and S are all genuinely independent of one another and can run as five concurrent
chains in one `pass-execute-chains` workflow. H and C consume no gate slot at all, since neither
touches code, which means they cost nothing against the two-concurrent-full-gate machine ceiling
that the polish spec's sequencing section already reserves. G1 and G2 share `package.json`, the CI
workflow, and `docs/internal/docs-register.md`; name those three as the contended resources and let
whichever merges second rebase, exactly as the identity-seam and polish plans do.

Practical shape: **write plan one as two plan documents under one ceiling** — `1a` the toolset
(C, G1, G2, S, and the join) and `1b` the harvest (H) — launched concurrently. That is literally
what the owner's direction describes ("the harvest needs no tooling, can run in parallel with the
gate work"), and it keeps each document inside the four-to-eight-task bar that a chain can hold.

### What plan one must hand plan two, named

Plan two cannot be authored until every one of these exists at a fixed path. Plan one's acceptance
criteria should be exactly this list:

1. **The five ledgers**, at a fixed path with the date bound (`docs/internal/docs-rebuild/<track>-facts.md`),
   carrying the id format `<track>-NNN`, the four verdict tiers (`gate` / `read` / `owner` /
   `unverified`), the per-page anchor map (F11), and the verbatim gated blocks with their fixture
   paths (F12).
2. **The page-type assignment for all 75 pages.** The spec never names this artifact and plan two
   cannot start without it: every page needs a type before a brief can cite a template or a corpus
   entry. The harvest is the natural producer, since it is the only chain that reads every page.
   Add it to unit 1's criteria.
3. **`docs/internal/corpus/` and its manifest**, with the owner's approval column filled, and every
   page type in the registry covered by at least one approved or reference-only entry (F16).
4. **`docs/internal/templates/`**, eleven templates, marked required-versus-optional per heading,
   which `check:anatomy` reads as its only source.
5. **The brief format**: the schema, the parser, and one worked brief (F1).
6. **The five scripts**, wired into `package.json` and CI, each with its path scope and, per the
   Compatibility rule, the named unit that removes the scope exclusion. Plan two's closing criterion
   is that no exclusion remains.
7. **The Vale rules with their must-fire fixtures**, verified on the CI-pinned binary.
8. **The drafting dispatch fragment**: a checked-in prompt block carrying the never-open-the-old-page
   constraint and the readable-file list, so plan two's dispatches inherit it rather than restating it
   (F10).
9. **The demonstration page's measured cost** — tokens and sittings for one page, end to end. This
   is what sizes plan two, and without it plan two's ceiling is a guess. Make it an explicit
   deliverable of the join, recorded in the plan's post-mortem.

Plan two hands plan one nothing. The only back-pressure is that plan two's authoring will find
scope exclusions and template gaps; those go to a follow-up line, never back into plan one.

### Do polish-B and polish-D fold into plan two cleanly?

**Polish-B: partly, and the part that folds should be moved rather than run.**

Polish-B is nine tasks of edits to the same 75 pages plan two rebuilds. Six of them (tasks 1, 3, 4,
6, 7, and the prose half of 5) are factual and vocabulary corrections — wrong counts, a missing
precondition, a false CSRF claim, "concepts" in operator prose. A rebuild from a *correct* ledger
produces a correct page without any of those edits. Running them and then rebuilding the page pays
twice for one outcome.

Three of them do not fold at all, because they are not prose: task 2 re-records the doctor fixtures
against the current tool, task 8 changes the `CustomScreen` reproduction and its component suite,
and task 5 carries a `check:reference` change asserting a `## Types` section. Task 9 is records.

The clean fold, and it saves real tokens:

- **Polish-B keeps** tasks 2, 8, 9, and the gate change in task 5. Call it B-code. Its ceiling drops
  well below 4M.
- **Polish-B's prose findings (D1 through D30, F7 through F10) become authoritative ledger input.**
  Each sweep finding is a correction the harvest applies at entry time: the ledger records the true
  claim with its proving source, and the old page's false claim is recorded as superseded. The
  rebuild then emits the corrected page once.
- **The ordering this forces:** B-code merges before the harvest branches, and the sweeps are handed
  to the harvest as a named input. A harvest that runs *concurrently* with polish-B's prose edits is
  the worst case — it would harvest claims that are being corrected underneath it, and every
  `file:line` citation would be stale on merge.

**Polish-D: split it. The substrate now, the page into plan two.**

Polish-D's pre-dispatch commits the figures substrate to `main`: `scripts/figures/`,
`docs/internal/site-figures.*`, `docs/extend/assets/`, the `check:figures` line in `package.json`,
and its CI step. That commit is a prerequisite for unit 3 as well (F13, which flags that unit 3's
`check:figures` criterion currently builds on uncommitted working-tree state). It should land
regardless and as early as possible.

Polish-D's tasks 2 and 3 — the anatomy figure on the architecture page, the concept figure's text
alternative, the README and cairn.pub forms — are self-contained and can run now.

Polish-D's task 1 is `docs/why-cairn.md`, the front door. **Authoring it now repeats the exact
failure the standard exists to stop:** no page type, no brief, no outline review, no provenance
check, no reader test, no corpus entry to grade against. The front door is the page whose rejection
produced this whole initiative. It should be **plan two's first page**, and it is the best-prepared
one in the set: `front-door-author-brief.md` already exists, which is precisely the owner-approved
source `check:provenance` resolves against, and the front-door page type's section order is already
written in the spec.

Polish-D's fourth item, reconciling `docs/README.md`'s six-route order against the register's five,
is now an index-page-type question that unit 3's standard governs. Move it to plan two.

The cost of waiting is real and should be stated to the owner: the front door stays as it is until
plan two's first page lands, which is at least one full plan away, and any cairn.pub work that
depends on the new front-door copy waits with it. The alternative is authoring the front door twice.

**Polish-C is the sharpest conflict and the spec does not mention it.**

Polish-C is the breaking window: renames and removals across "365 in-tree files and four sites'
route files", with one `Consumers must:` list. Every rename invalidates ledger entries wholesale —
export names, signatures, file paths, and the 99 inbound references from `src/`, `README.md`, and
`package.json` measured above. A ledger harvested before polish-C and consumed after it is
systematically wrong in exactly the class of claim it exists to guarantee.

**Polish-C must land entirely before the harvest branches, or entirely after plan two merges. Never
between them, and never concurrently with either.** Given polish-C's own sequencing ("branches after
A, B, and D have merged"), before is the achievable option, and it argues for running the polish
slices to completion first and starting plan one after polish-C's release is cut.

### Resulting sequence

```
polish-A ─┐
B-code   ─┼─→ polish-C (the breaking window + the cut)
D-substrate + D-figures + D-forms ─┘
                    │
                    ▼
     plan one:  1a toolset (C, G1, G2, S) ∥ 1b harvest (H)  ──→  join: demonstration page
                    │
                    ▼
     plan two:  the rebuild, front door first, then one plan per track
```

Three things this sequence buys that the spec's own order does not: the harvest reads a corpus that
polish-B and polish-C have already made true, so its `unverified` pile is real signal rather than
known-stale prose; `check:figures` exists before unit 3 depends on it; and the front door is authored
once, under the standard, by the initiative that exists because it was authored badly.

### Budgets under the split

| Plan | Tasks | Tokens | Attended sittings |
|---|---|---|---|
| Plan one (1a toolset + 1b harvest + join) | 35–40 across five chains | **5.4–10.7M**, and it needs a per-chain ceiling, not one number | 6–13 (the unverified list, the corpus approvals, the CLAUDE.md lines, the demo read and its reader test) |
| Plan two (the rebuild) | 50+, i.e. four to five plan documents, one per track plus the front door | **8–12M**, re-sized from the join's measured per-page cost before authoring | 40–75 |

Plan one is the plan whose ceiling nobody has set. It is also the plan that can be cut down: chains
C, G1, G2, and S together are 2.6 to 4.3M and eighteen tasks, which is one ordinary pass. The harvest
is the expensive half, and its cost is almost entirely the reference track's 85,278 words. If the
initiative needs to fit a smaller window, harvest the four small tracks first and defer the reference
harvest to sit beside plan two's reference work, which the spec already treats as the edited-in-place
exception where the structural risk does not reach.
