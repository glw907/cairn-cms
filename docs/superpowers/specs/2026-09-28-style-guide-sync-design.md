# Style-guide sync: the base guides first, the register as cairn's voice

**Status:** approved design (Geoff, 2026-09-28), pending `spec-plan-review`.
**Inputs:** the brainstorm brief
(`docs/superpowers/research/2026-09-28-style-guide-sync-brainstorm-brief.md`) and the audit beside
it (`2026-09-28-style-guide-sync-audit.md`). The audit's conflict ids (C1 to C8), gap ids (S1 to
S14), and design sections (4a to 4g) are cited here without restating their evidence.
**Register copy planned against:** `docs/internal/docs-register.md` on `draft-docs-0` at
`b8bfd30f` (PR #91, unmerged), which carries the 2026-09-28 amendments.

## Goals

Geoff, verbatim (2026-09-28): "My goal is, put simple, is keep the register and not sacrafice the
best practices of the established standard." And: "The first order of business is to confirm that
docs adhere to the appropriate style guide. The register is essentially an overlay on top of that
... never letting the register supplant those guidelines."

The academic register's tone succeeded on the draft docs proof; its defects were structural. This
pass keeps the tone and restores the structure. Two acceptance goals carry over from the theme
identity spec (`2026-09-26-theme-identity-design.md`, G1 and G2), restated for prose:

- **G1.** A writer who follows the base guide plus the register gets cairn's voice by default,
  with no page-local negotiation.
- **G2.** A drafting or reviewing agent reproduces that voice from its prompt and definition alone,
  and a structural departure from the base guide fails a gate or a blocking finding.

### The governing analogy

The theme identity pass kept every stock daisyUI component and moved cairn's identity into the
theme's own levers, instead of per-element patches that fight the defaults. Prose works the same
way here. The base guide is the stock component set: procedures, lists, headings, code font,
tables, link text, and notices stay standard. The register's voice sections are the theme: named
deltas that give cairn its measured, precise sound without fighting a guide rule. A register rule
that contradicts a guide rule is the prose equivalent of a patch fighting daisyUI, and it exists
only as a recorded exception. The admin's visual feel ("warmth stays material", iA Writer's
restraint) and this prose voice are meant to read as one identity.

## Rulings (Geoff, 2026-09-28)

1. **The base guide follows the terminal.** A reader who types commands reads under Google:
   `docs/admin/`, `docs/extend/`, `docs/reference/`, the front door, and the root README. A reader
   who works only in the product's UI reads under Microsoft: `docs/editors/` and the admin
   interface's own copy. Today's `.vale.ini` mapping stands.
2. **An exception exists only by Geoff's recorded ruling**, as a row naming the base rule it
   overrides, what cairn does instead, the evidence, and the date. The register's "a floor is not
   a ceiling" clause goes (C1). A tightening, a rule the guide is silent on or one that narrows a
   guide rule, needs no row.
3. **The Google arms take a combined voice:** Google's tone as the base, with three deltas.
   - *Measured, not casual.* Friendly and respectful, with no chatty asides. Google already rules
     out jokes and frivolity, so this is a tightening.
   - *Qualified claims stay whole.* An explanatory sentence may run past Google's 26-word guidance
     when splitting it would detach a qualification from its claim. Steps, list items, and task
     sections stay under 26 words, since that guidance is an accessibility rule and matters most
     where the reader acts. This is the one delta that loosens Google, so it is a recorded
     exception.
   - *Imperatives only in steps and task headings.* A tightening.
4. **The editors arm takes Microsoft's voice unmodified, plus tightenings only:** the no-pitch
   keystone, the tell catalogue, and the Names rules. The reader's own question headings are
   allowed (Microsoft, M-headings). "Professional academic introduction" is dropped (C3, C4). The
   Microsoft exceptions table starts empty.
5. **Admin UI copy takes Microsoft's UI-text voice, tightened to "professional and restrained: no
   cute, no chatty."** "Slightly academic" leaves the admin design system. No sweep of existing
   strings in this pass.
6. **Agent-facing documents take the voice that works best for Claude** (recorded in
   `spec-plan-review`). The register is agent-facing, and this pass writes it in the Google
   combined voice, on Geoff's hunch and Anthropic's "match your prompt style to the desired output
   style" guidance (audit 4f).

## Design

The work splits into two chains with disjoint files: chain R in this repo, chain W in
`~/.dotfiles` (stowed into `~/.claude`). They run in parallel.

### Chain R: the repo

**R1. Register rewrite** (`docs/internal/docs-register.md`).

- The header names two base guides, picked by ruling 1, with a table mapping each arm to its guide.
  "Floor" becomes "base" throughout, and each track section's "Style floor" line becomes "Base
  guide."
- A "Recorded exceptions" section holds one table per guide. Google seed rows:
  `Google.FirstPerson` off (2026-07-02), the README exclamation headings, and the sentence-length
  delta (ruling 3). Microsoft: empty.
- The universal contract's voice bullet becomes two Voice sections, one per guide, each opening
  with the guide's own tone rules quoted from its pages, then listing its deltas with the rule each
  one changes.
- The heading rule follows Google's split (C8): a task section takes a bare infinitive, a concept
  section a noun phrase with no leading -ing word. The ban on question headings holds on the Google
  arms; the reader's own question is allowed on editors (C4).
- The colon-triad rule gains the list remedy (C5): a sequence of actions or checks becomes a
  numbered list introduced by a complete sentence, parallel options a bulleted list, and only items
  that are neither fold into prose.
- The task-guide anatomy becomes a numbered list of sections and states the step form (C7): steps
  numbered, one action each, location before action, a single step as a bullet, and ordered checks
  in a verification or failure section numbered too.
- The whole document is rewritten in the Google combined voice (ruling 6). Anti-pattern specimens
  stay, fenced or quoted and tagged "Killed:". The audit's 4f names the passages that break the
  register's own rules today.
- The "When a Vale finding is wrong" procedure stays as it is.

**R2. Vale rules**, each with a must-fire fixture and a must-not-fire fixture.

- Promote `Google.Headings` (Google arms) and `Microsoft.Headings` (editors) to error, after the
  proper-noun exceptions (GitHub App, Workers Builds, CSRF, SEO, Tidy, and whatever the fixture run
  surfaces) are proven to suppress false positives (S5).
- `Cairn.HeadingForm` (error): a leading -ing word with an exception list, a question heading
  outside `docs/editors/**`, and teaser openers (S6).
- `Cairn.ProseProcedure` (warning): runs of sentence-initial imperatives and sequence connectors
  beside an imperative in one paragraph. It must fire on `choose-an-ai-posture.md:99-103` and
  `rotate-the-github-app-key.md:99-102` (S1). Promotion to error is a later decision on measured
  noise.
- `Cairn.LinkText` (error): vague link text and a bare URL as link text (S11).
- `Cairn.CodeFont` (warning): uncoded filenames and paths (S9).
- A list-item capitalization rule (S4, the mechanical half).

**R3. `check:markdown`.** markdownlint-cli2 as a dev dependency, wired into `docs-gate.mjs` and
scoped by `--page`. Stock rules MD001, MD024 (siblings only), MD025, MD029, MD032, MD040, MD055,
MD056, and MD058, plus two custom rules: a heading directly after a heading, and a table with no
introductory sentence (S7, S10). This revives part of what the 2026-09-26 approach spec retired
(`check:headings`, markdownlint as a gate); the templates and the registry stay retired.

**R4. Rollout.** New rules gate at their stated level on chain-scoped pages (`--page`) from this
pass. Across the rest of the tree they run at warning until each frozen arm reaches its own draft
stage, the register's existing sweep policy for Names. No page outside R5 is fixed in this pass.
The CI Vale pin (3.15.1) and the workstation's Vale (3.23.0) differ, so each fixture must pass
under the CI pin.

**R5. The trigger page** (`docs/extend/choose-an-ai-posture.md`). The failure checks and the
verify section become numbered lists; the bold run-in precondition becomes a list or a section;
headings meet R1's rule; the step removal STATUS already owes (fact `f:1ij5h5`) folds in. The page
passes R2 and R3 at error and clears the register chain with the new guide lens.

**R6. Admin design system** (`docs/internal/admin-design-system.md`). The two voice passages
(the principle at line 56 and the Voice section) name Microsoft as the base for UI copy and apply
ruling 5. No component string changes.

### Chain W: the workstation

**W1. `workflows/docs-page-chain.js`.**

- The shared preamble derives the base guide from the page's track (`editors` gives Microsoft,
  every other arm Google) and opens with it: structure to the guide first, and the register is an
  overlay that overrides a guide rule only through its Recorded exceptions table. A digest of
  about ten structural rules follows, quoted from the guide's own pages (procedures, lists,
  headings, code font, tables, link text, notices, conditions before instructions). Every quote is
  checked against the live guide page when the digest is written.
- The register editor's prompt grades guide conformance first. `FINDING` gains an optional
  `source: 'guide' | 'register'`, and a guide violation is blocking.
- The page-inputs step names, in each excerpt's note, any way the excerpt departs from the base
  guide, so the drafter does not copy it.
- An exemplar pre-check runs R2's structural Vale rules and R3 on each `exemplarSources` entry
  before page inputs, and stops with a named reason if one fails.

**W2. `agents/cairn-docs-drafter.md`.** A "Structure to the base guide first" section above the
five rules, carrying the same digest, and the list remedy in the setup-colon tell.

**W3. `agents/cairn-register-editor.md`.** The base guide becomes item 0 of the living contract,
with the register as the overlay that outranks this file. A "Guide conformance, first lens"
section comes before register grading. The List-cadence family gains the list remedy. The editors
"academic introduction" framing and the 25-40-word baseline go, replaced by rulings 3 and 4.

**W4. The voice docs.** `skills/writing-voice/SKILL.md` gains "a sequence of actions is a numbered
list" beside "paragraphs over bullets." `docs/voice/technical-doc-web.md` and
`docs/voice/editor.md` replace their prose-procedure exemplars with numbered procedures (C6).
`editor.md` drops "someone following a setup guide" from its reader list, or qualifies it to a
UI-only setup. These files reach every repo on the workstation.

### Exemplars

`enable-tidy.md` and `restrict-admin-access.md` fail the new checks, and W1's pre-check will
reject them; their rebuild belongs to the extend stage. Until in-repo exemplars qualify, stage 2a
takes anatomy from a guide-conformant external page in the existing capture corpus (Google Cloud
or Microsoft Learn), and register and vocabulary from the rebuilt `choose-an-ai-posture.md`. A
chain-accepted page that passes the checks becomes eligible for its page type; the pass plan keeps
the per-type list, as audit 4g describes.

## Acceptance criteria

1. The register opens with the two base guides and the arm table, holds both exceptions tables
   with the seed rows, and carries no self-serve deviation clause.
2. Every rule in R2 and R3 has a fixture that proves it fires on the target defect and stays
   silent on a conforming counterpart, under the CI Vale pin.
3. `Cairn.ProseProcedure` fires on both trigger passages.
4. The chain's shared preamble names the base guide before the register, and the register
   editor's findings carry `source`.
5. The proof run: `docs-page-chain` on one short page with a planted prose procedure and a planted
   -ing heading produces a blocking `source: guide` finding or a gate failure for each.
6. `choose-an-ai-posture.md` passes the docs gate with the new rules at error.
7. No voice exemplar in `technical-doc-web.md` or `editor.md` writes a multi-step procedure as
   prose.
8. The register, reviewed by the register editor under the new guide lens, has no blocking
   finding.
9. The dotfiles gate (`scripts/check.sh`) and `claude-tooling-sync verify` pass.

## Pass shape

- **Class:** mixed. R2, R3, and W1 are `engine-logic` (fixture-first, full gate); R1, R4 to R6,
  W2 to W4 are `docs`.
- **Size:** about ten tasks in two chains, so `pass-execute-chains`.
- **Branch:** off `draft-docs-0`'s head once the session running there commits its stage 0-1
  close, carried forward into stage 2a the way theme passes B and C carry A. Waiting for PR #91
  to merge would hold stage 2a behind pass B.
- **Order within chain R:** R1 first (R2's rules and R5's page cite it), R5 last.
- **Close:** a `docs` close for the prose tasks; the fixture suite and gate for the tooling tasks.

## Out of scope

- Fixing existing pages beyond R5; each frozen arm is swept at its own stage.
- Rebuilding the two extend exemplars.
- An admin UI string sweep.
- Gating sentence length on any arm (S14).
- A separate guide-conformance agent; the lens rides inside the register editor's read (audit 4b).

## Open for the plan

- The exact digest wording, quoted from the live guide pages.
- Whether Vale's vocabulary suppresses `Google.Headings` capitalization findings, or a Cairn copy
  of the rule is needed (R2).
- Whether PostToolUse hooks fire inside workflow subagents, which decides whether `vale-hook`
  warnings reach the drafter at all.
- The exception list for `Cairn.HeadingForm`'s -ing check (reference-arm symbol headings, "Getting
  started"-shaped fixed phrases, if any survive).

## Risks

- **`Cairn.ProseProcedure` noise.** A heuristic on imperative runs will misfire; warning level and
  a measured promotion contain it, and the guide lens carries the judgment.
- **Workstation reach.** W4 changes voice docs every repo loads. The changes add a list rule and
  replace exemplars; they remove nothing another repo relies on.
- **Concurrent executor.** Another session holds `draft-docs-0` at plan time. The pass does not
  branch until that session's close commit lands and verifies.
