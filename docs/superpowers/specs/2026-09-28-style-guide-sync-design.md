# Style-guide sync: the base guides first, the register as cairn's voice

**Status:** approved design (Geoff, 2026-09-28), revised by the `spec-plan-review` fold
(`docs/superpowers/research/2026-09-28-style-guide-sync-fold.md`). Three owner rulings are open
(see "Owner rulings"); the plan is authored after they are answered.
**Inputs:** the brainstorm brief
(`docs/superpowers/research/2026-09-28-style-guide-sync-brainstorm-brief.md`) and the audit beside
it (`2026-09-28-style-guide-sync-audit.md`). The audit's conflict ids (C1 to C8), gap ids (S1 to
S14), and design sections (4a to 4g) are cited here without restating their evidence.
**Register copy planned against:** `docs/internal/docs-register.md` on `draft-docs-0` at
`bd935c9d` (PR #91 head). The register and `choose-an-ai-posture.md` are unchanged in committed
state since `b8bfd30f`.

## Goals

Geoff, verbatim (2026-09-28): "My goal is, put simple, is keep the register and not sacrafice the
best practices of the established standard." And: "The first order of business is to confirm that
docs adhere to the appropriate style guide. The register is essentially an overlay on top of that
... never letting the register supplant those guidelines."

The academic register's tone succeeded on the draft docs proof; its defects were structural. This
pass keeps the tone and restores the structure. Both halves are acceptance goals. Two carry over
from the theme identity spec (`2026-09-26-theme-identity-design.md`, G1 and G2), restated for
prose, and G3 protects the half that already works:

- **G1.** A writer who follows the base guide plus the register gets cairn's voice by default,
  with no page-local negotiation.
- **G2.** A drafting or reviewing agent reproduces that voice from its prompt and definition alone,
  and a structural departure from the base guide fails a gate or a blocking finding.
- **G3.** The measured, academic voice survives the structural fixes: no page this pass touches
  is flattened into the base guide's default conversational register.

### The governing analogy

The theme identity pass kept every stock daisyUI component and moved cairn's identity into the
theme's own levers, instead of per-element patches that fight the defaults. Prose works the same
way. The base guide is the stock component set: procedures, lists, headings, code font, tables,
link text, and notices stay standard. The register's voice sections are the theme: named deltas
that give cairn its measured, precise sound. A register rule that contradicts a guide rule is the
prose equivalent of a patch fighting daisyUI, and it exists only as a recorded exception. The
admin's visual feel ("warmth stays material", iA Writer's restraint) and this prose voice read as
one identity.

## Rulings (Geoff, 2026-09-28)

1. **The base guide follows the terminal.** A reader who types commands reads under Google:
   `docs/admin/`, `docs/extend/`, `docs/reference/`, the front door, the root README, the
   changelog, and cairn.pub. A reader who works only in the product's UI reads under Microsoft:
   `docs/editors/` and the admin interface's own copy. Today's `.vale.ini` mapping stands.
2. **An exception exists only by Geoff's recorded ruling**, as a row naming the base rule it
   overrides, what cairn does instead, the evidence, and the date. The register's "a floor is not
   a ceiling" clause goes (C1). A tightening needs no row. **The test:** a rule that forbids a form
   the base guide prescribes or recommends is an override and needs a row; a tightening forbids
   only what the guide permits or is silent on. A register rule that fails the test and has no row
   is a blocking finding.
3. **The Google arms take a combined voice:** Google's tone as the base, with three deltas.
   - *Measured, not casual.* The register reads as a technical report: measured, precise,
     qualification carried inside the sentence, a restrained first person only where the author's
     own evidence is stated. It keeps Google's "friendly and respectful", no slang, no jokes. Google's
     tone page prescribes "casual, natural, and approachable" and "a conversational tone rather
     than a formal one", so this delta is an **override** and takes a Google exception row
     (evidence: Geoff's 2026-09-08 voice ruling and the 2026-09-28 draft docs proof).
   - *Qualified claims stay whole.* An explanatory sentence may run past Google's 26-word guidance
     when splitting it would detach a qualification from its claim. Steps, list items, and task
     sections stay under 26 words, since that guidance is an accessibility rule and matters most
     where the reader acts. An override, with a row. The fence is enforced: a step or list item
     over 26 words is a blocking guide finding.
   - *Imperatives only in steps, task headings, cross-references ("For more information, see"),
     and notices.* A tightening.
4. **The editors arm takes Microsoft's voice unmodified, plus tightenings only:** the no-pitch
   keystone, the tell catalogue (only the families that pass ruling 2's test against Microsoft),
   and the Names rules. The reader's own question headings are allowed (Microsoft, M-headings).
   "Professional academic introduction" is dropped (C3, C4). The Microsoft exceptions table
   starts empty and also serves admin UI copy.
5. **Admin UI copy takes Microsoft's UI-text voice, tightened to "professional and restrained: no
   cute, no chatty."** "Slightly academic" leaves the admin design system. No sweep of existing
   strings in this pass.
6. **Agent-facing documents take the voice that works best for Claude**, per the authoring
   charter's agent-facing row (Anthropic / Claude Code best practices). Anthropic's "match your
   prompt style to the desired output style" guidance picks the register's own voice: the register
   is rewritten in the Google combined voice (audit 4f).

## Owner rulings

Three questions the design cannot settle. Each is yes or no; the recommendation comes first.

1. **Will you read R5's diff once for tone before the pass closes?** Recommendation: yes. You
   alone ratified the tone, and R5's scoped edit keeps every sentence outside the restructured
   passages byte-identical, so the diff is short.
   - *Yes:* the close waits on one attended read of the R5 diff, beside the register editor's
     voice verdict (criterion 9).
   - *No:* the register editor's voice verdict against the pre-pass page closes G3 alone, at zero
     attended time; an agent grades a voice it was prompted with.
2. **Adopt Google's ban on figurative language, dropping the register's allowance for a metaphor
   "inside explanatory prose where it clarifies"?** Google's tone page: "Avoid figurative
   language, which includes metaphors." The allowance loosens that with no row, and no evidence is
   on record for it. Recommendation: yes.
   - *Yes:* R1 narrows the universal-contract bullet to Google's rule; the definitional ban and
     the "writing room" and "four arms" Killed specimens stay as illustrations.
   - *No:* R1 records a Google exception row for the allowance, dated to this answer.
3. **Give PR #91's merge word now, so this pass branches off `main` after #91 merges?**
   Recommendation: yes. The approach spec says every draft docs pass "merges to `main` before the
   next starts", and `draft-docs-0`'s STATUS authors stage 2a "after `draft-docs-0` merges". PR
   #91 waits only on your word.
   - *Yes:* the pass branches from `main` after the merge; the spec, audit, review, and fold
     commits rebase onto it. The approach spec holds as written.
   - *No:* the pass stacks on `draft-docs-0`'s head and carries into stage 2a; the plan header
     records the exception to the approach spec's merge-before-next rule, and an erratum on that
     spec is owed.

## Design

Two chains with disjoint files run in parallel, then join. Chain R works in this repo; chain W in
`~/.dotfiles` (stowed into `~/.claude`). R5, the proof run (criterion 7), and the register review
(criterion 8) run after both chains merge, since each needs R's rules and W's lens together.

### Chain R: the repo

**R1. Register rewrite** (`docs/internal/docs-register.md`).

- The header names two base guides, picked by ruling 1, with a table mapping each arm, the
  changelog, and cairn.pub to its guide. "Floor" becomes "base" in the style-guide sense only: the
  front door's "Legibility floor" and the "When a Vale finding is wrong" procedure keep their
  wording.
- The header holds the **base-guide digest**, the one copy every agent reads: about ten structural
  rules quoted from the guide's own pages, each with its URL (procedures, lists, headings, code
  font, tables, link text, notices, conditions before instructions, no links in headings, no
  directional-only references, the 26-word step and list-item limit). Every quote is checked
  against the live page when written.
- A "Recorded exceptions" section holds one table per guide. Google seed rows:
  `Google.FirstPerson` off (2026-07-02), the README exclamation headings (a dormant sanction; the
  README carries none today), the tone delta and the sentence-length delta (ruling 3), and the
  metaphor allowance if owner ruling 2 is no. Microsoft: empty, and it also governs admin UI copy.
  The tightening-versus-override test from ruling 2 is stated above the tables.
- Two Voice sections, one per guide, each open with the guide's own tone rules quoted, then list
  its deltas with the guide rule each one changes. The Google section carries the voice's positive
  definition forward whole: the technical-report identity, the four traits (measured, precise,
  qualification inside the sentence, restrained first person), the comparison set (SQLite's
  "Appropriate uses", a systems paper's introduction, a standards overview, a mature database's
  self-description), and the ratified-good specimen. It adds one "structure plus voice" specimen
  taken from R5's rebuilt page: a task section's lead-in sentence and a numbered step. The clause
  "not graded against general written norms" goes.
- The voice-scope sentence narrows to ruling 1 and rulings 4-5: the academic voice governs the
  Google arms, not editors or admin copy. "The editor track keeps its plainer Microsoft floor
  inside this voice" goes.
- The heading rule follows Google's split (C8) on the Google arms: a task section takes a bare
  infinitive, a concept section a noun phrase with no leading -ing word, and no question or
  wh-clause teaser (Geoff's 2026-09-28 specimens stand). Editors headings follow Microsoft,
  reader's questions allowed (C4).
- The colon-triad rule gains the list remedy (C5): a sequence of actions or checks becomes a
  numbered list introduced by a complete sentence, parallel options a bulleted list, and only items
  that are neither fold into prose.
- The task-guide anatomy becomes a numbered list of sections and states the step form (C7): steps
  numbered, one action each, location before action, a single step as a bullet, and ordered checks
  in a verification or failure section numbered too.
- The reference section's "Dry contract prose" becomes "spare contract prose" (Google: "don't aim
  for super-dry").
- "For reviewers" opens with: grade structure against the base guide first, a guide violation is
  blocking, then grade against the track's profile.
- The whole document is rewritten in the Google combined voice (ruling 6). The rewrite changes
  voice, not meaning, except where a ruling says so. It keeps: the keystone's meaning that flat
  prose is the other way to fail (the audit 4f capper may be rephrased, not dropped); the diagram
  320/390 deviation, which is from the family responsive standard, not a guide, so it stays out of
  the exceptions tables and cites 2026-08-15; the `Names` heading (`#names` is linked from
  CLAUDE.md); every quotation (the Names table's Google and Git text, the ratified-good specimen)
  byte for byte; the vendor-link and Diátaxis rulings in substance. Anti-pattern specimens stay,
  fenced or quoted and tagged "Killed:".
- The "When a Vale finding is wrong" procedure stays as it is.

**R2a. Vale harness, pin, heading rules, and rollout** (merges the former R4).

- The CI Vale pin moves from 3.15.1 to 3.23.0 through the `dependency-upgrade` skill (a minor,
  taken by default), so the workstation, the chain's `--page` gate, and CI run one version. The
  `.vale.ini` arbiter note keeps "CI's pin governs" and updates the number.
- A fixture harness under `scripts/checks/` runs Vale with an explicit config over a fixtures tree
  outside the docs globs, in mirrored paths where a rule is path-dependent. Each must-fire fixture
  must raise that rule id; each must-not-fire fixture must raise nothing from that rule. It runs in
  CI after the Vale install step and in the docs gate, never inside `npm test`. It also runs R3's
  custom markdownlint rules. The standard's "fixtures run on every CI run" rule is met here.
- Heading rules, three ids since Vale scopes rules by section, not by branch:
  `Cairn.HeadingIng` (leading -ing word, Google arms only, per ruling 4),
  `Cairn.HeadingQuestion` (a `?` heading or a wh-word opener; off under `docs/editors/**`), and
  `Cairn.HeadingTeaser`. Each exempts pinned headings sourced from
  `scripts/checks/shipped-anchors.json` and the approach spec's pinned list (`# Is it working?`
  and the roster heading stay verbatim). `Google.Headings` and `Microsoft.Headings` join the
  promoted set once the vocab entries the mechanics probe found (GitHub App, Workers Builds, CSRF,
  SEO, Tidy, and the rest) are added; the vendored style files are never edited.
- **Rollout mechanism.** Every new rule, and both Headings rules, sits at `warning` in
  `.vale.ini`, so the tree run stays green on frozen pages. One list names the **promoted rules**
  and the **promoted pages**; the docs gate and the chain's `valeErrorRules` both read it. In
  `--page` mode the gate adds a second Vale pass filtered to the promoted rules and fails on any
  alert. In tree mode it runs the same filtered pass over the promoted pages, so an accepted page
  cannot regress (the ratchet). A page joins the list when it is chain-accepted under the new
  lens; an arm joins wholesale when its stage sweep closes. The reference arm and the root README
  follow the same per-page ratchet, with no arm-wide date in this pass. No page outside R5 is fixed
  in this pass.
- The gate tier is pinned to `--pin scripts` plus the harness: `gate-tier.mjs` defaults `.vale/**`
  and config paths to `full`, which buys two e2e suites that prove nothing about a Vale rule.

**R2b. The remaining rules**, each with fixtures in the R2a harness.

- `Cairn.ProseProcedure` (warning, not promoted): an imperative after a clause boundary
  (sentence start, a conditional clause, `otherwise`, `then`), counted per paragraph. Must-fire:
  verbatim copies of `choose-an-ai-posture.md:99-103` and `rotate-the-github-app-key.md:99-102`
  (the latter is caught by the clause-boundary arm, not sentence-initial imperatives), plus one
  held-out passage the rule was not tuned on (`docs/editors/publish-and-history.md:93-109`).
  Must-not-fire: a numbered list of imperatives and a concept paragraph using "then" as an adverb.
  The tree-wide count at landing is recorded as the promotion baseline.
- `Cairn.LinkText` (promoted): vague link text and a bare URL as link text (S11).
- `Cairn.LinkInHeading` (promoted): a link inside a heading (S8, G-headings).
- `Cairn.CodeFont` (warning): uncoded filenames and paths (S9).
- `Cairn.ListItemCase` (warning): a list item opening lowercase (S4), exempting an opening code
  span and the Names rule's lowercase `cairn`; fixtures include a nested item.

**R3. `check:markdown`.** markdownlint-cli2 as a dev dependency, wired into `docs-gate.mjs` for
`--page` pages and the promoted pages only (the tree holds dozens of findings on frozen pages).
Stock rules MD001, MD024 (siblings only), MD025, MD029, MD032, MD040, MD055, MD056, and MD058,
plus two custom rules: a heading directly after a heading, and a table with no introductory
sentence (S7, S10). The `docs-gate` unit test's pinned step list is updated in the same task. This
pass supersedes two lines of the 2026-09-26 approach spec for structural checks, on Geoff's
2026-09-28 direction: "No new check is built" and the retirement of `check:headings` and
markdownlint as a gate. The templates and the registry stay retired.

**R5. The trigger page** (`docs/extend/choose-an-ai-posture.md`), after the join. The page is
chain-rebuilt, so this is a deficiency fix under the freeze clause, and stage 2a's outline treats
it as shipped. A scoped structural edit: the failure checks and the verify section become numbered
lists, the bold run-in precondition becomes a list or a section, and headings meet R1's rule.
Sentences outside those passages stay byte-identical. The `f:1ij5h5` scoping from `b8bfd30f`
stays. Per the approach spec's "Edits after the chain", the brief's `sentences` update in the same
change, changed sentences go through the register editor and the fact read, and the gate runs with
`--brief`. The page then joins the promoted pages.

**R6. Admin design system** (`docs/internal/admin-design-system.md`). The voice principle at line
56, the Voice section, and the `writing-voice` pointer near line 1236 name Microsoft as the base
for UI copy, apply ruling 5, and point exceptions at the register's Microsoft table. The em-dash
ban stays as a tightening. No component string changes.

### Chain W: the workstation

**W1. `workflows/docs-page-chain.js`.**

- `common` becomes a function of the page. It derives the base guide from the page's track
  (`editors` gives Microsoft; every other value, including the front door and the root README,
  gives Google) and opens with it: structure to the guide first, then the register as an overlay
  that overrides a guide rule only through its Recorded exceptions. It points at the register's
  digest rather than copying it, and adds a one-sentence voice model beside it (Google arms:
  "structure to Google; sound like a careful technical report: measured, precise, each sentence
  carrying one qualified claim"; editors: Microsoft's voice).
- The register editor's prompt receives the same preamble and grades guide conformance first.
  `FINDING` gains a required `source: 'guide' | 'register'`; the runner forces `blocking` on
  `source: guide`, and the combined findings print the source for the redrafter.
- The page-inputs step names, in each excerpt's note, any way the excerpt departs from the base
  guide, so the drafter does not copy it.
- `valeErrorRules` carries the promoted-rule list from R2a.
- Tests land in `~/.dotfiles/tests/docs-page-chain-derivation.test.mjs` through its
  marker-extraction pattern: the track-to-guide derivation for every track value, the `source`
  coercion, and a static guard that the preamble names the guide before the register.

**W2. `agents/cairn-docs-drafter.md`.** A "Structure to the base guide first" section above the
five rules, pointing at the register digest, and the list remedy in the setup-colon tell.

**W3. `agents/cairn-register-editor.md`.** The base guide becomes item 0 of the living contract,
with the register as the overlay that outranks this file. A "Guide conformance, first lens"
section comes before register grading; a register delta missing from the register's delta list is
a finding. The List-cadence family gains the list remedy. The editors arm is graded to ruling 4:
"academic introduction" and the 25-40-word baseline go; Noir overcorrection and the
micro-instructed-actions item scope to the Google arms; Consumer-help keeps only what Microsoft
itself bans (just, simply, folksy softeners); the shortform-compression line scopes to the Google
arms; the editors genre exemplar becomes `editor.md`'s Microsoft exemplars. When dispatched with no
track (`register-check` on a spec or plan), the guide lens applies Google to published arms and the
register itself, and stays off for internal records.

**W4. The voice docs.** `skills/writing-voice/SKILL.md` gains "a sequence of actions is a numbered
list" beside "paragraphs over bullets", and qualifies its editor-copy routing row ("admin
walkthroughs") to a UI walkthrough with no terminal step. `docs/voice/technical-doc-web.md` gains
one line: a repo's register may record voice deltas against this standard, and within that repo
they outrank this file. `technical-doc-web.md` and `docs/voice/editor.md` replace their
prose-procedure exemplars with numbered procedures (C6); a short same-place exemplar stays in
`editor.md`, labeled as Microsoft's combine allowance. `editor.md` qualifies "someone following a
setup guide" and "setup walkthroughs" to UI-only setups. These files reach every repo on the
workstation; the report states whether `writing-voice/evals` re-run.

**W5. `agents/cairn-implementer.md`.** Its "plain voice" line gains: docs prose structures to the
base guide first (the register's header), then the register. The implementer writes the reference
arm and the per-version extend records every pass.

### Exemplars

`enable-tidy.md` and `restrict-admin-access.md` fail the new checks; their rebuild belongs to the
extend stage. The capture corpus (`~/.local/share/cairn/exemplars/`) holds no Google Cloud or
Microsoft Learn page, so this pass captures three: a Google developer task page with a numbered
procedure, a Google concept page, and a Microsoft Learn procedure page. Until in-repo exemplars
qualify, stage 2a takes anatomy from those captures, and register and vocabulary from the rebuilt
`choose-an-ai-posture.md`. The exemplar check is a plan-time conductor step: each
`exemplarSources` entry is copied to a scratch path and run against a structure-only config (R2's
structural rules plus R3, never the house rules), and the result goes in the plan's per-type list
(audit 4g). A chain-accepted page that passes becomes eligible for its page type.

## Acceptance criteria

1. The register opens with the two base guides, the arm table, and the digest (each rule with its
   URL; the task report lists each quote as fetched and matched). It holds both exceptions tables
   with the seed rows and the tightening test, carries no self-serve deviation clause, and each
   Voice section quotes its guide's tone rules and lists every delta with the rule it changes.
2. A meaning ledger of the old and new register, read by a fresh `claude-opus-5-5` reader, lists
   every ratified rule as kept, reworded, or changed by ruling N; the `#names` anchor and every
   quotation are byte-identical.
3. The fixture harness runs in CI under the pinned Vale, and every rule in R2a, R2b, and R3 has a
   must-fire and a must-not-fire fixture that it passes.
4. `Cairn.ProseProcedure` fires on both trigger passages and the held-out passage; its tree-wide
   baseline is recorded.
5. The unscoped docs gate exits 0 on the tree, and a harness case proves the promoted-rule pass
   fails a promoted page carrying a planted defect.
6. The W1 tests pass: the derivation for every track value, the `source` coercion, and the
   preamble-order guard.
7. The proof run, at the stage level: (a) the register-editor prompt the chain renders, given a
   planted page with a prose procedure and an -ing heading, returns a blocking `source: guide`
   finding on the prose procedure; (b) the docs gate on the same page fails on
   `Cairn.HeadingIng`; (c) the same prompt on the rebuilt `choose-an-ai-posture.md` returns no
   blocking `source: guide` finding.
8. The register, read by the register editor under the new lens, has no blocking finding. A
   positive control runs first: the pre-rewrite register draws blocking findings at the audit 4f
   passages, and the prompt treats an unrecorded loosening as a blocking `source: guide` finding.
9. `choose-an-ai-posture.md` passes the docs gate as a promoted page, raises zero
   `Cairn.ProseProcedure` and `Cairn.CodeFont` findings, and passes `check:provenance` with its
   brief. Sentences outside the restructured passages are byte-identical, and the register
   editor's read against the pre-pass page carries no blocking voice-delta finding. Owner ruling 1
   decides whether Geoff's read is added.
10. No voice exemplar in `technical-doc-web.md` or `editor.md` writes a procedure that crosses
    screens, or exceeds Microsoft's same-place combine allowance, as prose.
11. Per-task outcomes: R6's voice passages name Microsoft and no longer say "slightly academic";
    W2's section sits above the five rules; W3's editors-arm families are scoped as stated; W5's
    line is present; the three exemplar captures are in the corpus.
12. The dotfiles gate (`scripts/check.sh`) and `claude-tooling-sync verify` pass.

## Pass shape

- **Class:** mixed. R2a, R2b, R3, and W1 are `engine-logic` (fixture-first), gated at
  `--pin scripts` plus the harness. R1, R5, R6, and W2 to W5 are `docs`. R1 takes one
  `register-check`; R6 and W2 to W5 are agent-facing and take `diff-reviewer` against their stated
  outcomes, not the register chain. R5 follows "Edits after the chain".
- **Size:** about twelve tasks: chain R (R1, R2a, R2b, R3, R6), chain W (W1 to W5), the exemplar
  captures, and the join (R5, criteria 7 and 8). `pass-execute-chains`.
- **Order within chain R:** R1 first (R2's rules and R5's page cite it); R2a before R2b and R3
  (the harness and the promoted list).
- **Branch:** owner ruling 3 picks the base. Either way the pass branches only when the
  `draft-docs-0` worktree is clean, `pgrep -f draft-docs-0` is empty, the local ref equals
  `origin/draft-docs-0`, and that session's STATUS records its work done. The spec commits rebase
  onto the chosen base.
- **Close:** a `docs` close for the prose tasks; the fixture suite and gate for the tooling tasks.

## Out of scope

- Fixing existing pages beyond R5; each frozen arm is swept at its own stage.
- Rebuilding the two extend exemplars.
- An admin UI string sweep.
- Gating explanatory sentence length on any arm (S14). Step and list-item length is in scope,
  through the digest and the register editor.
- A separate guide-conformance agent; the lens rides inside the register editor's read (audit 4b).
- An in-chain exemplar pre-check; the plan-time step covers it until in-repo exemplars exist.

## Open for the plan

- The exact digest wording, quoted from the live guide pages.
- Whether PostToolUse hooks fire inside workflow subagents, which decides whether `vale-hook`
  warnings reach the drafter at all.
- `Cairn.HeadingIng`'s exception list (reference-arm symbol headings, fixed phrases, if any
  survive) and the pinned-heading source format.
- Whether `docs/extend/debug-your-site.md:36` (a `Google.Headings` false positive vocab cannot
  clear) needs a Cairn copy of the rule when that page is promoted.

## Risks

- **`Cairn.ProseProcedure` noise.** A heuristic on imperative runs will misfire; warning level, a
  recorded baseline, and a measured promotion contain it, and the guide lens carries the judgment.
- **Workstation reach.** W4 changes voice docs every repo loads. The changes add a list rule,
  qualify two routing lines, and replace exemplars; they remove nothing another repo relies on.
- **Concurrent executor.** The `draft-docs-0` session is still active: at fold time it held
  uncommitted edits to `choose-an-ai-posture.md` and its brief (R5's page), STATUS, HISTORY, and
  ROADMAP, with its docs gate running. R5 builds on that session's committed result; the branch
  preconditions above hold the pass until it lands.
- **Tone flattening.** The guide-first lens pulls toward Google's conversational default. The
  voice model in W1, the Voice section's positive definition, R5's byte-identical constraint, and
  criterion 9 hold the line.
