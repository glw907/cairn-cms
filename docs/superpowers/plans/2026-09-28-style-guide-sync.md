# Style-guide sync

> **For agentic workers:** two parallel chains (R in this repo, W in a `~/.dotfiles` worktree)
> across segments A and B, then a sequential join in two segments split by Geoff's one read.
> Chains run through the workflow runner `pass-execute-chains`, invoked by name once per segment
> with both chains in one invocation; the join runs per task with the Agent tool. Implementer
> `cairn-implementer` on `sonnet` at effort `high` unless a task names `model: opus`; reviewer
> `diff-reviewer` on `claude-opus-5-5`. **The conductor never reads a diff, a test log, or a gate
> transcript**; it consumes per-task records and decides accept, re-dispatch, split, or stop. One
> re-dispatch on `fix`; a second `fix` is the conductor's decision. Tasks state outcomes and
> acceptance criteria, never implementation code. **Resume:** the runner has none. After a halt,
> check `git status` in the affected worktree (warm uncommitted work means investigate, per the
> one-executor rule), then re-invoke with only the undone tasks.

**Date:** 2026-09-28. **Goal:** every published cairn page is structured to its base style guide
first (Google for terminal readers, Microsoft for UI-only readers), in the cairn docs voice, with
the register as an overlay that departs from a guide only through Geoff's recorded exceptions; and
every writer, in the chain or outside it, receives that standard as one flat drafting brief.

**Spec:** `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/style-guide-sync/docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
(rulings 1 to 14; task ids are the spec's, plus R2p, R8, R9, and the J tasks). Evidence: the
audit, reviews, and folds under `docs/superpowers/research/2026-09-28-style-guide-sync-*`, the
last being `...-plan-fold.md`.

**Infra re-baseline.** Amended to run on the corrected workstation infra (dotfiles infra sweep
A-core `c3e709c` and B `7de1210`, both on dotfiles `main`), applying the ten items under
"Amendments to the style-guide-sync plan" in
`/var/home/glw907/.dotfiles/docs/superpowers/specs/2026-09-28-claude-infra-sweep-design.md`.
The runner stays `pass-execute-chains`, invoked by name; the runner merge (AW-11) waits for the
sweep's pass E. Audit ids (AW-, DC-, PS-) are that sweep's audit record's.

**Pass class:** mixed, per task. Each task carries `passClass` in the runner args.
**Token ceiling:** 12M. **Checkpoint:** every segment boundary, any split, and before any question.
At 80% (9.6M) finish the task in flight, write STATUS, and ask one combined question at the next
boundary.

**Gates (runner args, exact).**
- Chain R `engine-logic` tasks (R2p, R2a, R2b, R3, R7, R8): `gateTier: "scripts"` and `gate`
  set to the literal `npm run check:docs-gate && npm run check && npm test && npm test -w
  packages/create-cairn-site` (the `SCRIPTS_GATE` string; the harness runs inside
  `check:docs-gate`). Default heavy lane: `npm test` launches Chromium.
- Chain R `docs` tasks (R1, R6): no pin; the classifier sizes the gate. Default lane.
- Chain R carries no `classifier` field: the runner makes one cached `haiku` existence probe for
  its repo and reuses it for every R task.
- Chain W sets `classifier: false` on its chain object (AW-13): no probe, no classifier paragraph.
- Chain W tasks: `gate: "bash scripts/check.sh"`, `reducedGate: "bash scripts/check.sh"` (AW-01;
  the same form as the named gate, step 1 of the runner's resolution order, since dotfiles has no
  separate type check and the class default would run nothing), `gateLane: "light"`, and `notes`
  carrying the absolute spec path. The runner reads `reducedGate` per task or from `args`, never
  per chain, so each W task carries it. The implementer's definition of done is the gate the
  dispatch names (AW-19), so the notes carry no override.
- `args.gate` is the `SCRIPTS_GATE` literal above: chain R's fallback when the classifier prints
  nothing. Every W task names its own `gate`, so W never reads it.
- Chain W's condensed `criteria` name no npm command; a W task whose plan section names one
  (W5's docs-gate line) says "per the plan section" instead.
- Never set `args.gateLane`, `args.reducedGate`, or `args.classifier`: each would reach chain R.

**Branches.** Chain R on `style-guide-sync` (this worktree). Chain W on `style-guide-sync` in a
dotfiles worktree the **conductor** creates outside `~/.dotfiles`, from dotfiles `main` (which
carries the infra sweep's B merge, `7de1210`, so W5 branches from B3's implementer edits):
`git -C ~/.dotfiles worktree add ~/Projects/.worktrees/dotfiles-style-guide-sync -b
style-guide-sync main` (inside `~/.dotfiles` it reads as drift; under `claude/` it would load
as live agents). `planPath` is this file's absolute path. The repo branch merges to `main` by PR
at the close. **No release, no version bump.**

**Owner time:** one attended read of the R5 diff (rulings 7 and 14), taken right after J1. J2 may
run while it is pending; segment J-2 waits for it. Nothing else waits on Geoff.

## Ruled inputs

Rulings 1 to 14 are in the spec. The fixed contracts below are shared across chains; R1, R7, W1,
and the tripwires key on them, byte for byte.

- **Register sections (exact headings, R1 lands them, W1 and R7 read them).**
  `## Drafting brief: developer docs` and `## Drafting brief: editor docs`, each with subsections
  `### Structure`, `### Voice`, `### Tells`, in that order. Reviewer-only layering:
  `## Provenance`, `## The tightening test`, `## Recorded exceptions: Google`,
  `## Recorded exceptions: Microsoft`. Drafter-level sections keep their HEAD headings byte for
  byte: `## Names`, `## Visuals (every page that carries one)`, `## The page anatomies`, the three
  `### The <x> track (...)` headings, `## The reference (...)`, and `## The front door (...)`.
- **Markers.** A guide quote in a brief carries `<!-- q:<id> -->`; the provenance table records
  the same `q:<id>` with the source text and URL. A brief passage an exception row governs carries
  `<!-- x:<id> -->`, and the row names that id; a dormant row (the README exclamation headings)
  carries the literal flag `dormant` in place of an id. Ids are lowercase kebab-case, unique.
- **Drafter input.** The drafter receives, extracted deterministically: its track's brief (quote
  markers stripped), `## Names`, `## Visuals`, the page's track section, and `## The page
  anatomies`. Nothing else from the register, and no register path. The register editor also
  receives `## Provenance`, `## The tightening test`, and both exceptions sections, markers kept.
- **Promoted list** `scripts/checks/promoted-docs.json` (`rules`, `pages`). R2a seeds `rules`
  with `Cairn.HeadingIng`, `Cairn.HeadingQuestion`, `Cairn.HeadingTeaser`, `Google.Headings`,
  `Microsoft.Headings`; R2b adds `Cairn.LinkText`, `Cairn.LinkInHeading`; J1 adds the first page.
- **Retired phrases** (literal strings, both lists): "Vale-enforced floor", "a floor is not a
  ceiling", "academic introduction", "slightly academic", "25-40-word", "on top of the Google
  floor", "admin walkthroughs", "no house voice", "not a house voice". Case-insensitive. A line
  carrying `<!-- retired-ok -->` (or, in code, a `retired-ok` comment) is exempt, for a line that
  records a retirement.

## Global constraints

- Base guide by track: `docs/editors/` and admin UI copy are Microsoft; every other published
  surface (admin, extend, reference, front door, root README, changelog, cairn.pub) is Google.
- A register rule that forbids a form the base guide prescribes or recommends is an override and
  needs a recorded exception row; only Geoff adds a row. The seed rows are the spec's (R1).
- No skill or agent carries a copy of a brief; a writer outside the chain is routed to it.
- Every guide quote is fetched from the live page with `curl` plus `pandoc` when written, with
  its URL. Quote the guide body, never Google's AI-generated "Page Summary" block.
- Vendored Vale styles are never edited. New rules ship at `warning` in `.vale.ini`; enforcement
  at error comes only through the promoted-rules pass, which counts alerts from Vale's JSON output
  (Vale exits 0 on warnings, filtered or not).
- Frozen narrative arms: no page outside R5 changes in this pass. A stale comment on a frozen page
  (`docs/editors/when-something-goes-wrong.md:46`, the old Vale pin) gets a friction-log line.
- Code comments in `.mjs`/`.js` follow TSDoc and the no-em-dash rule; commits are path-limited.

## Review focus

1. **A promoted rule leaking into the tree run** turns CI red on frozen pages. R2a's harness
   case: the unscoped gate exits 0 on the tree while a planted defect in a fixture-promoted page
   fails.
2. **The promoted list failing open** (missing file, renamed page, mistyped rule) silently drops
   the ratchet. R2a's fail-closed fixtures.
3. **The brief reaching the drafter empty, paraphrased, or with the layering attached.** W1's
   validator and drafter-prompt guard.
4. **A `source: guide` finding that does not force a redraft.** W1's coercion sets `verdict: fix`,
   not only `blocking`.
5. **R5 rewording approved sentences** flattens the voice (G3). J1's sentence-level diff against
   `8bbe78f5` over the pinned ranges.
6. **A tripwire red on today's tree, or vacuous on an empty list.** R8, and W6's appended phrases
   on the dotfiles scanner.

---

## Pre-flight (conductor, before segment A)

- **P0.** No other executor holds `~/.dotfiles` or this worktree (`pgrep -f`, `git status`, other
  sessions' journals).
- **P1.** One `haiku` agent checks every checkable claim in segments A and B against current
  line numbers: cairn-cms at this worktree's HEAD and dotfiles at `main` (paths, line numbers,
  `common`, `FINDING`, `valeErrorRules`, the test file's markers, both CI Vale pins, the runner's
  `Plan file` and `Task <id>` reads, the ratchet baseline entries W tasks clear). The infra
  sweep's B moved lines in files chain W edits (`cairn-implementer.md`, `site-implementer.md`,
  `claude/.claude/CLAUDE.md`, `docs-page-chain.js`, `docs/voice/commit-and-pr.md`), so a check
  run before B's merge does not count. Amend the plan, then dispatch.
- **P1a.** Re-run B1's style-guide-sync fixture render (the "style-guide-sync fixture" case in
  dotfiles `tests/pass-execute-runners.test.mjs`) from a scratch copy, with its chain arguments
  replaced by this plan's Gates-block arguments for segment A and for segment B, and grep this
  plan for the two workarounds the infra sweep spec's "Success tests" names (a chain W `notes`
  override of the implementer's definition of done; W6 deferring the tooling check to the
  boundary). Either failing halts the pass before dispatch.
- **P2.** Create the dotfiles worktree from dotfiles `main` (Branches above).
- **P3.** Run the `dependency-upgrade` skill's survey for Vale 3.15.1 to 3.23.0 and write its
  record to `docs/internal/record/`; run a new-package survey for `markdownlint-cli2` (current
  production version, license, maintenance, one line of rationale). Both paths go into R2p's and
  R3's `notes`. The implementer has no Skill tool.

## Segment A

**Chain R, in order: R1, R2p, R2a, R2b.**

### Task R1. Register rewrite

Class `docs`, `model: opus`. Files: `docs/internal/docs-register.md`.
Outcomes: every R1 bullet in the spec, without the R1b specimen, landing the Ruled inputs'
headings and markers.
- R1 sorts every register section into guide-level (inside a brief, including the universal
  contract's keystone, vendor-link, and Diátaxis rules), drafter-level (the sections the Ruled
  inputs name), or reviewer-only layering. Each brief is flat, with no cross-reference and no
  "except where".
- The developer brief's `### Voice` carries: the why-cairn specimen labeled front-door and
  first-person-only; the concept paragraph `choose-an-ai-posture.md:23-26` at `8bbe78f5`
  verbatim ("A `robots.txt` file cannot block a fetch, ..."); and one `Killed:` specimen, that
  paragraph flattened into Google's conversational default, tagged with why it fails.
- Each quote is the operative sentence or two. Provenance records each quote's URL and fetch
  date.
- Written in the cairn docs voice; meaning changes only where a ruling says so; `#names` and
  every existing quotation byte-identical. No retired phrase appears except on a line marked
  `retired-ok`.
Acceptance: criterion 1; `diff-reviewer` re-fetches every quoted URL and matches the text; the
Vale Google package on a scratch copy under a Google glob reports no error; the report lists every
ratified rule as kept, reworded, or changed by ruling N (graded at J4).

### Task R2p. Vale pin bump

Class `engine-logic`. Files: `.github/workflows/test.yml` (the "Install Vale 3.15.1" step's name
and download URL, which carry the pin literally), `.github/workflows/tool.yml` (`VALE_VERSION`),
the `.vale.ini` arbiter note, `docs/internal/docs-friction-log.md` (the frozen
page's stale pin comment). Notes: P3's survey record path.
Outcomes: both CI pins read 3.23.0; the arbiter note keeps "CI's pin governs" with the new number.
Acceptance: the existing gate green. The probe found 3.23.0 already clean on the tree, so this is
a confirmation; the PR's CI run at the close is the proof.

### Task R2a. Harness, heading rules, promoted list

Class `engine-logic`. Files: `.vale.ini`, `.vale/styles/Cairn/Heading{Ing,Question,Teaser}.yml`,
the vocab accept list, `scripts/checks/docs-gate.mjs` and its unit test,
`scripts/checks/vale-fixtures.mjs` and its fixtures tree, `scripts/checks/promoted-docs.json`,
`.vale-structure.ini` (the structure-only config), `ROADMAP.md`.
Outcomes: the spec's R2a bullets except the pin, plus:
- The promoted list is seeded per Ruled inputs. The gate fails closed on a missing or malformed
  list, a listed page that does not exist, and a listed rule whose style file is absent from
  `.vale/styles`.
- The promoted-rules pass (`--page` and tree mode) counts alerts from JSON output.
- The harness fails when any `Cairn.*` rule or custom markdownlint rule lacks a must-fire and a
  must-not-fire fixture; the pre-existing Cairn rules (Announcement, ContrastFrame, Marketing,
  Names, NamesRetired, TwoHeadedHeading, VirtueClaims) sit on a named legacy allowlist.
- Criterion 3's reading for stock and vendored rules: one config-load proof per config (a fixture
  that one loaded rule fires on), not a pair per rule. Full pairs for every Cairn and custom rule.
- `.vale-structure.ini` holds the structural rules only, never the house rules, with a Microsoft
  variant that omits the Google-arm-only rules (R9 uses both).
- `Cairn.HeadingIng`'s exception list comes from a measured tree run. The reference arm and root
  README promoted-rule counts go into a ROADMAP entry with the count as its trigger.
  `docs/extend/debug-your-site.md:36` is recorded there as deferred to that page's promotion.
Acceptance: criteria 3 (R2a) and 5, with criterion 5's case on a fixture promoted list and page,
never the live list; one fixture per fail-closed state; the report lists vocab entries and
`HeadingIng` exceptions.

### Task R2b. The remaining Vale rules

Class `engine-logic`. Files: `.vale/styles/Cairn/{ProseProcedure,LinkText,LinkInHeading,CodeFont,
ListItemCase}.yml`, fixtures, `promoted-docs.json`.
Outcomes: the spec's R2b bullets; `ProseProcedure`'s tree-wide count recorded in the report and in
a `WATCH` comment beside the rule. Acceptance: criteria 3 (R2b) and 4.

**Chain W, in order: W1, W2, W3.** On every W task (both segments): a task whose change clears a
ratchet baseline entry (a retired phrase or a self-mode dead reference) removes that entry in the
same commit, and `claude/.claude/tooling/ratchet-baseline.json` is in its Files; the gate fails
on a stale entry. Each task's audit ids are named so the close can map any halt to them.

### Task W1. `docs-page-chain.js`

Class `engine-logic`. Files: `claude/.claude/workflows/docs-page-chain.js`,
`tests/docs-page-chain-derivation.test.mjs`, `scripts/docs-chain-render.mjs` (new).
Audit ids: AW-09 (the chain's prompt, not a July plan, carries the contract), AW-10
(`registerPaths` at `docs-page-chain.js:32` reaches no editor prompt; the renderer test covers
what replaces it).
Outcomes: the spec's W1 bullets, resolved as follows.
- **Extraction.** The page-inputs agent runs one fixed shell command per section, rendered by the
  runner (a range from the exact heading to the next heading of the same or higher level, ending
  in a sentinel line with the line count), and returns stdout verbatim. A pure validator rejects a
  missing heading, a wrong first line, an absent sentinel, a line-count mismatch, a body under a
  minimum length, and a brief with no `q:` marker. A rejection escalates the page with a named
  reason.
- **Drafter prompt.** Carries the Ruled inputs' drafter sections, quote markers stripped, and
  names no register path. `common` becomes per-stage.
- **Editor prompt.** Adds the layering sections, markers kept, and grades guide conformance first.
- **Exemplar roles.** Each `exemplarSources` entry carries `role: anatomy | voice`. An anatomy
  excerpt renders as "imitate the section order and step form only; its sentences are not the
  voice." Page-inputs notes name any departure from the base guide or from the cairn docs voice.
- **Coercion.** `FINDING` gains required `source` and optional `rule`. A missing or unknown
  `source` is treated as `guide`. A `source: guide` finding whose `rule` is a `q:` id present in
  the brief is forced `blocking`; any other keeps the reviewer's value. After coercion, any
  blocking finding sets the read's `verdict` to `fix`, before `anyFix` is computed.
- **Testability.** Section-command rendering, the validator, both prompt renderers, marker
  stripping, and the coercion are pure functions between the test file's markers.
  `scripts/docs-chain-render.mjs` reuses that extraction to render either prompt from a checkout
  and a page path, and has a coerce mode that applies the coercion to a findings JSON (J2 uses
  both).
- `valeErrorRules` comes from the conductor's args, from the promoted list.
Acceptance: criterion 6, with test cases for: brief present; heading absent; empty return; line
count mismatch; drafter prompt holds brief, Names, Visuals, track, and anatomy, and no
provenance, exceptions text, `q:` marker, or `docs-register.md` path; anatomy and voice role
rendering; `source` missing, unknown, and `guide` with `blocking: false` on a brief rule id
(forced, verdict `fix`) and on a non-brief rule (kept); a read with `verdict: accept` and a forced
finding comes back `fix`. `scripts/check.sh` passes.

### Task W2. Drafter definition

Class `docs`. Files: `claude/.claude/agents/cairn-docs-drafter.md`. Audit id: AW-24 (drafter
side).
Outcomes: the spec's W2, plus: the definition says not to open the register; its own tell list is
deleted (the brief's `### Tells` is the one source), keeping the first-sentence rule, the padding
rule, and the `sentences` procedure; "sentence rhythm, and its register" applies to voice-role
exemplars only. Acceptance: criterion 12's W2 clause.

### Task W3. Register-editor definition

Class `docs`. Files: `claude/.claude/agents/cairn-register-editor.md`,
`claude/.claude/tooling/ratchet-baseline.json`. Audit ids: AW-08, AW-09.
Outcomes: the spec's W3 in full, including the no-track default, plus: the living contract loads
no July plan on a run (AW-09: the 485-line craft-references plan, item 2 at `:31`); the
definition cites no exemplar or path that does not exist (AW-08: the "ratified 2026-07-03"
exemplar at `:19-20` and the corpus path `~/.claude/docs/register-exemplars/cairn/` at `:32`),
and that path's `dead-reference` baseline entry (`GA-02`) leaves in the same commit; findings
carry `source` and, for a guide finding, the `q:` id as `rule`; "25-40-word" is deleted and
Noir overcorrection anchors to the brief's "qualified claims stay whole" delta; "What is
sanctioned" is scoped to positioning and site copy, with docs sanctions living only in the
exceptions tables; the developer-docs genre line points at the developer brief; a new tell lands
in the register first, this catalogue second. Acceptance: criterion 12's W3 clause; no retired
phrase remains; no baseline entry names this file; `scripts/check.sh` passes.

## Segment B

**Chain R, in order: R3, R7, R6, R8.**

### Task R3. `check:markdown`

Class `engine-logic`. Files: `package.json` (dev dependency pinned per P3's survey, script),
`scripts/checks/docs-gate.mjs` and its unit test, `scripts/checks/markdownlint/`, fixtures,
the structure-only markdownlint config for R9 (`.markdownlint-structure.jsonc`).
Outcomes: the spec's R3. Acceptance: criterion 3 (R3) under R2a's reading; the unscoped gate
stays green.

### Task R7. `check:register-briefs`

Class `engine-logic`. Files: `scripts/checks/register-briefs.mjs`, `package.json`, `docs-gate.mjs`
(tree mode), drift fixtures.
Outcomes: the spec's R7 failure states, keyed on the Ruled inputs' markers, plus an orphan
provenance entry (a quote dropped from a brief), a missing section heading, and a malformed or
duplicate marker. A `dormant` row passes without a passage. Every failure reports in one run.
Acceptance: criterion 11, with one fixture per failure state.

### Task R6. Admin design system

Class `docs`. Files: `docs/internal/admin-design-system.md`, `scripts/checks/check-admin-prose.mjs`
(header comment only).
Outcomes: the spec's R6, naming line 56, "friendly-but-professional" (line 1238), and "Lean on
the cairn/stacking metaphor" (line 1243, removed under rulings 5 and 8). The script header routes
the release-time read to a Microsoft UI-text read, not `content-review`. Acceptance: criterion
12's R6 clause; `check:prose` unchanged and green.

### Task R8. Stale-reference check, repo side

Class `engine-logic`. Files: `scripts/checks/retired-phrases.json` (header names the dotfiles
twin, `claude/.claude/tooling/retired-phrases.txt`), the check, its wiring in the docs gate's
tree mode, fixtures, `CLAUDE.md` (Authoring section).
Outcomes: the spec's W6, repo half. Scope: `CLAUDE.md` and `docs/internal/**`, excluding
`record/`, `consultations/`, dated specs, plans, and research, the list file, and the fixtures.
The check fails on a missing or empty list, and matches each phrase as a literal,
case-insensitive substring tolerant of a line wrap inside the phrase, like its twin. R8 lands
the repo `CLAUDE.md` Authoring edit itself (ruling 12: the charter sentence becomes "a published
external standard as its base, with a recorded house voice overlay"; "On top of the Google
floor" names the drafting briefs instead).
Acceptance: fires on a planted phrase, fails on an empty and a missing list, honors `retired-ok`,
and passes on the tree.

**Chain W, in order: W4, W5, W6.**

### Task W4. Voice docs, routing, and the charter correction

Class `docs`. Files: `claude/.claude/skills/writing-voice/SKILL.md`,
`claude/.claude/docs/voice/technical-doc-web.md`, `claude/.claude/docs/voice/editor.md`,
`claude/.claude/docs/authoring-charter.md`, `claude/.claude/CLAUDE.md` ("Writing voice"),
`claude/.claude/output-styles/writing-voice.md`, `claude/.claude/skills/register-check/SKILL.md`,
and the three other voice files (S3): `claude/.claude/docs/voice/technical-doc-go.md`,
`claude/.claude/docs/voice/commit-and-pr.md`, `claude/.claude/docs/voice/agent-facing.md`.
Audit ids: PS-07, DC-25 (ruling 12), DC-27, DC-28, AW-24 with DC-26 and CS-15 (style, `CLAUDE.md`,
skill). DC-25's poplar gap is out of scope: poplar's vendored `glw907` overlay is ruled canonical
(S2) and its stale references go in the sweep's pass F.
Outcomes: the spec's W4, "W4 addition", and ruling 12, plus:
- The charter, the global `CLAUDE.md`, the output style, and the skill state ruling 12: every
  audience starts from a published external standard; a repo may carry a named house voice as a
  recorded overlay that never replaces the base's structure, every departure with provenance and
  Geoff's ruling. Cairn's docs voice is the named example. No retired phrase remains.
- The cairn-docs route names cairn.pub's own prose as developer-brief (ruling 13).
- `technical-doc-web.md`'s "Applies to" routes cairn-cms docs to the register's developer brief.
- The output style gains "a sequence of actions is a numbered list."
- `register-check` names `docs/internal/docs-register.md` as the rule set, not the July plan, and
  sends new tells to the register first.
- All five voice files drop their "The docs-register measures" section and keep one pointer line
  to `~/.claude/skills/writing-voice/evals/tellgrader/MEASURES.md` (DC-28).
- `technical-doc-go.md`'s "Applies to" names only Go repos that exist (no `~/Projects/jrnl-md`
  today), and its linter line matches what those repos' own `.vale.ini` files select (poplar
  lints Go comments with its vendored `glw907` overlay; no Go repo selects the Vale Google
  package today) (DC-28).
- The global `CLAUDE.md` "Writing voice" names the register's developer brief, not the write-once
  `2026-09-08-docs-standard-design.md` spec, as the cairn docs standard (DC-27).
- The output style is the single owner of the full tell catalogue and the em-dash policy;
  `writing-voice/SKILL.md` ("The em dash") points at it instead of restating it (AW-24, DC-26,
  CS-15). The global `CLAUDE.md` "Writing voice" block is trimmed to the pointer plus its short
  high-frequency tell list and em-dash line, and nothing else. Those lines are the one sanctioned
  copy (the only route to subagent writers, which never receive the output style), named here for
  the infra sweep's A-rest `parity.json` to declare later.
Acceptance: criterion 10; the routing clauses present; the `CLAUDE.md` block holds only the
pointer, the short tell list, and the em-dash line, and each of those tells and the em-dash line
agrees with the output style; each of the five voice files carries the pointer line and no
measures section; `writing-voice/evals` re-run with no regression, or each
delta named; `scripts/check.sh` passes.

### Task W5. Implementer definitions

Class `docs`. Files: `claude/.claude/agents/cairn-implementer.md`,
`claude/.claude/agents/site-implementer.md`, both as the infra sweep's B3 left them (done means
the dispatched gate, AW-19; the co-author footer names the repo's convention). Outcomes: the
spec's W5 line in both (the "plain voice" line, `cairn-implementer.md:62` and
`site-implementer.md:57` on dotfiles `main`); `site-implementer`'s cairn-cms docs gate
(`site-implementer.md:106`) adds `npm run check:docs-gate -- --page <page>` for each page it
touches. B3's edits stay intact. Acceptance: criterion 12's W5 clause; `scripts/check.sh` passes.

### Task W6. Stale-reference tripwire, dotfiles side

Class `sweep`. Files: `claude/.claude/tooling/retired-phrases.txt`,
`tests/test_check_claude_refs.py` (the fixtures), `claude/.claude/tooling/ratchet-baseline.json`
only if an entry clears. W6 adds no second check: the infra sweep's A-core scanner
(`scripts/check-claude-refs.py`, run by the ratchet step of `scripts/check.sh`) already covers
W6's scope (agents, authored and vendored skills except `skills/synced/`, workflows, `docs`
except `docs/record/`, output styles, `instructions`, `CLAUDE.md`; no `evals/research/` segment
and no dated path), matches case-insensitively and across a line wrap, honors `retired-ok`, and
fails on a missing or comment-only list.
Outcomes: every Ruled-inputs retired phrase is appended to the list, each with a comment naming
its ruling (ruling 12 or the spec's W6) and the task that cleared its last hit, and the header's
twin line names `scripts/checks/retired-phrases.json` in cairn-cms. The fixtures are the ones this
section names: one planted-hit case per appended phrase, read from the real list, that the check
fails on, and one `retired-ok` case that passes. The phrases enter with zero hits and no new
baseline entry, since W2 to W5 cleared them.
Acceptance: the fixtures pass; the existing missing-list and comment-only-list cases stay green;
`bin/.local/bin/claude-tooling-sync lint --root <the chain W worktree>` passes inside the chain;
`scripts/check.sh` passes on the tree after W2 to W5.

### Segment B boundary (conductor)

1. Confirm chain R green on `style-guide-sync`.
2. Re-run P0 against `~/.dotfiles` (clean tree, no running `docs-page-chain` or
   `register-check`). Merge chain W into dotfiles `main` with `--no-ff`; record the merge SHA in
   STATUS as the rollback point (`git revert -m 1 <sha>`). The folded symlinks make it live at
   once; no re-stow is needed. Until the repo PR merges, a `docs-page-chain` run against a cairn
   checkout off `main` fails closed at page inputs; STATUS says so.
3. `claude-tooling-sync verify` passes on the merged `main`: a post-merge confirmation of the
   machine checks W6 already ran in the chain.
4. One `haiku` probe runs `~/.dotfiles/scripts/docs-chain-render.mjs` against this worktree's
   register for a Google page and an editors page, and confirms every Ruled-inputs section
   validates non-empty.
5. STATUS written.

## Join segment J-1 (sequential, Agent tool, repo branch)

### Task R9. Exemplar captures

Class `docs`. Files: `~/.local/share/cairn/exemplars/` (three captures),
`docs/internal/record/docs-exemplars.md`. Outcomes: the spec's Exemplars paragraph; the two Google
captures run against `.vale-structure.ini` plus R3's structure config, the Microsoft Learn capture
against the Microsoft variant, each result in the manifest, each manifest row naming its role
(`anatomy`). The report lists the capture paths. Acceptance: criterion 12's captures clause.

### Task J1. R5, the trigger page

Class `docs`, `model: opus`, under "Edits after the chain". Files:
`docs/extend/choose-an-ai-posture.md`, its brief, `promoted-docs.json`.
Outcomes: the spec's R5. The restructured ranges are pinned against `8bbe78f5`: the bold
precondition (lines 6-8), `## Verify the served file` (78-96), and `## Resolve a posture warning`
(97-108). Headings already take bare infinitives and do not change. Every sentence outside those
ranges is byte-identical. Acceptance: criterion 9 except Geoff's read.

**Then the conductor asks Geoff for the one tone read of the R5 diff** (ruling 14), beside the
register editor's voice verdict. J2 runs meanwhile.

### Task J2. Proof run

One `cairn-implementer` dispatch plants `docs/extend/zz-proof-plant.md` (a prose procedure and an
-ing heading), runs the promoted-rules Vale pass on it (criterion 7b), renders the register-editor
prompt for the plant and for `choose-an-ai-posture.md` with
`~/.dotfiles/scripts/docs-chain-render.mjs` into scratch files, deletes the plant, and reports
`git status` clean. The conductor then dispatches `cairn-register-editor` once per rendered
prompt, telling it to read and follow that file verbatim, and one `haiku` agent runs each returned
findings JSON through the render script's coerce mode and reports the coerced verdicts.
Outcome: criterion 7 (a), (b), (c). On a failure, re-run that part once; a repeat folds through
one W3 or W1 fix dispatch.

## Join segment J-2 (after Geoff's read)

A rejected R5 diff reopens J1 and J2(c) before this segment starts.

### Task J3. R1b

Class `docs`. Files: `docs/internal/docs-register.md`. Outcomes: the spec's R1b, the specimen
taken only from text Geoff has read (ruling 14), preferring a lead-in from the byte-identical
set; `check:register-briefs` passes.

### Task J4. Register review

A fresh `cairn-register-editor` read under the new lens (criterion 8). Positive control first: the
register at `feca3348` draws blocking findings at the audit 4f passages, and a scratch copy of the
new register with one planted unrecorded loosening (a rule forbidding a Google-prescribed form,
with no row) draws a blocking `source: guide` finding. Plus a fresh `claude-opus-5-5`
meaning-ledger read of `feca3348` against the new register (criterion 2). Blocking findings fold
through one `cairn-implementer` dispatch, which re-runs `check:register-briefs` and the docs
gate, then one re-read.

### Task J5. W7 infra read

One fresh `claude-opus-5-5` reader, no part in the pass, returns the spec's W7 file list with a
verdict per file. The list names `site-implementer`, the output style, the authoring charter, the
global `CLAUDE.md`, and `scripts/checks/check-admin-prose.mjs` explicitly. Mismatches are fixed in
one implementer dispatch per repo (dotfiles edits on the dotfiles worktree, merged `--no-ff` as
at the boundary); every new phrase joins both lists. Acceptance: both tripwires clean, and no open
mismatch.

## Close

1. `code-simplifier` over the changed code (`.mjs`, `.js`, Vale YAML), refinements applied.
2. The full repo gate, `scripts/check.sh`, and `claude-tooling-sync verify`, green.
3. Owed errata recorded (not edited), per the plan fold record: the approach spec's "No new check
   is built" and retirement row; `docs/internal/record/2026-08-15-docs-outlines-with-visuals.md:58`;
   the design spec's criterion 3 reading and W2 setup-colon clause; the design spec's W6 "fails
   the dotfiles `scripts/check.sh`" as its own check (superseded by the infra sweep's amendment
   2) and W4's file list (widened by S3).
4. `ROADMAP.md` gains a Planned item: cairn-pub adopts Vale and a `CLAUDE.md` line pointing at the
   developer brief, in a cairn-pub pass (ruling 13).
5. STATUS, HISTORY, ROADMAP per `cairn-pass`; a facts bullet only if a public behavior changed
   (none expected); `CHANGELOG.md` untouched unless the gate says otherwise.
6. PR opened; its CI run is R2p's proof. Merge on green.
7. Score both budgets: tokens against 12M, attended time as planning misses and sittings.
8. Map every runner halt, escalation, and `fix` reason from both segments and the join to an
   infra sweep audit id or to "not infra", recorded in HISTORY. The sweep's first goal
   holds when none maps to an audit id (amendment 9).
