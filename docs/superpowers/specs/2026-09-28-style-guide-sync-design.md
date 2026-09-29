# Style-guide sync: the base guides first, the register as cairn's voice

**Status:** re-scoped design (2026-09-28, evening). The first design, approved and revised by two
`spec-plan-review` folds, is in git history at `fb1aeba3`. The re-scope follows Geoff's ruling
that the system be proven and battle-tested, with nothing invented (ruling 15), and the leanness
record that prompted it: `docs/superpowers/research/2026-09-28-style-guide-sync-leanness.md`.
**Planned against:** `main` at `feca3348`; `docs/internal/docs-register.md` and
`docs/extend/choose-an-ai-posture.md` as merged by PR #91 at `8bbe78f5`. Landed on this branch
before the pause: R1 (`7bf6a110`, `f9723e50`) and R2p (`5d82b505`); on the dotfiles branch
`style-guide-sync`, W1 (`79c5e23`), W2 (`b44f414`, `ead04af`), and W3 (`4461c1f`).

## Goals

Geoff, verbatim (2026-09-28): "My goal is, put simple, is keep the register and not sacrafice the
best practices of the established standard." And: "The first order of business is to confirm that
docs adhere to the appropriate style guide. The register is essentially an overlay on top of that
... never letting the register supplant those guidelines."

- **G1.** A writer who follows the track's drafting brief gets the base guide's structure and
  cairn's voice by default, with nothing to reconcile.
- **G2.** A drafting agent reproduces that voice from its brief and its exemplars. A reviewing
  agent, holding the brief, the recorded deviations, and Vale's output, tells a structural defect
  from a recorded departure.
- **G3.** The measured, academic voice survives the structural fixes: no page this pass touches is
  flattened into the base guide's default conversational register.
- **G4.** Every mechanism the pass keeps is a documented practice of a named docs team or a
  published source. A mechanism with no source is cut.

## Rulings

Rulings 1 to 14 stand from the first design (text at `fb1aeba3`, lines 45-129) except where a
later ruling here supersedes a mechanism. Their substance, in short:

1. Google governs every reader who types commands (admin, extend, reference, the front door, the
   root README, the changelog, cairn.pub); Microsoft governs `docs/editors/` and admin UI copy.
2. A departure from the base guide exists only by Geoff's recorded ruling. A rule that forbids a
   form the guide prescribes or recommends is an override and needs a row; a tightening forbids
   only what the guide permits or is silent on and needs none.
3. The Google arms take the cairn docs voice: Google's tone with three deltas. Measured, not
   casual (an override, with a row). Qualified claims stay whole, while steps, list items, and
   task sections stay under 26 words (an override, with a row). Imperatives appear only in steps,
   task headings, cross-references, and notices (a tightening).
4. The editors arm takes Microsoft's voice unmodified, plus tightenings only: the no-pitch
   keystone, the tells that pass ruling 2's test, and the Names rules.
5. Admin UI copy takes Microsoft's UI-text voice, tightened to "professional and restrained: no
   cute, no chatty." No string sweep in this pass.
6. Agent-facing documents, including the register, are written in the cairn docs voice.
7. Geoff reads the R5 diff once, beside the register editor's voice verdict.
8. The register adopts Google's ban on figurative language.
9. The pass branches off `main`.
10. The first fold's edits to rulings 1 to 6 are confirmed, with two seed deviation rows (tone,
    sentence length).
11. The cairn docs voice is one positively defined whole, never "Google minus X", and each base
    guide gets one drafting brief the drafter reads. *Superseded in part by ruling 15:* the
    brief no longer quotes the base guide, so no sync check keeps it in step.
12. The charter's "no house voice" rule is corrected: every audience starts from a published
    external standard, and a repo may carry a named house voice as a recorded overlay.
13. cairn.pub's own prose routes to the developer brief now; its Vale adoption is a ROADMAP item.
14. Geoff's R5 read comes right after R5 lands; the proof run may run meanwhile.

New rulings (Geoff, 2026-09-28):

15. **A proven system, nothing invented.** Verbatim: "I'm not looking to invent anything new. I
    want a proven and battle-tested system." The re-scope takes the conventional method at every
    fork and walks back what the branch invented. The leanness record's verdict table is the
    per-mechanism ruling.
16. **The target register is preserved.** The re-scope removes machinery, never voice. Every
    ratified register rule survives, as do the voice specimens (the why-cairn front-door specimen,
    the `choose-an-ai-posture.md` paragraph at `8bbe78f5` lines 23-26 verbatim, every "Killed:"
    specimen), the Names section, the page anatomies, the track and front-door sections, and
    every recorded deviation. What shrinks is prose that restates the base guide, which the stock
    Vale packages and the guide itself already carry.
17. **The AI posture page is the developer track's primary exemplar**, as a whole page, for both
    anatomy (choose, set, pass, verify, resolve) and voice.
18. **The editor track's exemplar is a captured Microsoft Learn procedure page.** An in-repo editor
    exemplar is named when the editors stage redrafts its first page, as the AI posture page
    earned the developer slot. One exemplar falls short of the three-to-five source; no editor
    page is drafted this pass, so the gap closes at the editors stage.
19. **The register editor stays in the chain, with no A/B test.** It works a checklist plus Vale's
    output, the checklist-with-external-feedback form the research supports. A one-page A/B has a
    sample of one and cannot separate a signal from noise.
20. **The remainder of the pass carries a 6M token ceiling.**

## Sources

Each kept mechanism names its source here; the leanness record carries the full research.

- **Warning first, then promote a rule to error once the tree is clean:** GitLab's Vale practice
  (https://docs.gitlab.com/development/documentation/testing/vale/).
- **A pass example and a fail example per custom rule:** Elastic's and Spectro Cloud's rule
  repositories (https://github.com/elastic/vale-rules,
  https://www.spectrocloud.com/blog/how-we-use-vale-to-enforce-better-writing-in-docs-and-beyond),
  run by Vale's own `vale test`, which the pinned 3.23.0 ships
  (https://github.com/vale-cli/vale/releases/tag/v3.23.0) though `vale --help` omits it.
- **A style guide that names its base guide and lists its deviations in one section:** GitLab's
  and Grafana's writing guides (https://docs.gitlab.com/development/documentation/styleguide/,
  https://grafana.com/docs/writers-toolkit/write/style-guide/).
- **Three to five canonical examples over long rule lists:** Anthropic's prompting guidance
  (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices);
  instruction-following falls as simultaneous rules grow (https://arxiv.org/pdf/2509.21051).
- **Checklist-driven critique with external feedback over unguided self-critique:**
  https://arxiv.org/abs/2310.01798, https://arxiv.org/pdf/2410.06458.
- **License note for the vendored example pages:** Google's developer documentation is CC BY 4.0
  per its page footer (code samples Apache 2.0). A Microsoft Learn page is CC BY 4.0 only when its
  MicrosoftDocs source repository's `LICENSE` says so; the Learn site terms alone forbid copying.

## Design

Two chains with disjoint files run in parallel, then join. Chain R works in this repo; chain W in
the dotfiles worktree `~/Projects/.worktrees/dotfiles-style-guide-sync`.

### Chain R: the repo

**R1t. Trim the register** (`docs/internal/docs-register.md`). R1 stays; it is trimmed, not
reverted, because it carries everything ruling 16 preserves. The trim:

- Each drafting brief becomes a short supplement to its base guide, in the GitLab and Grafana
  pattern: a link to the base guide as the structure source, a structure checklist (one line per
  base-guide rule the page must meet, each with its link and no quotation, since neither agent
  can fetch the guide), the voice stated positively with its specimens, the exemplar list
  (below), and a short tell list. The trim test: no verbatim guide quotation, and no rule stated
  twice. A register rule stricter than the guide stays, stated once. No word cap: ruling 16
  governs length.
- The `q:` and `x:` markers go. The "Guide quotes" provenance table becomes a plain sources list
  of links. "The tightening test", the two "Recorded exceptions" sections, and the Provenance
  voice-departure table merge into one "Deviations from the base guides" section: the test, then
  one table per guide, each row naming the base rule, what cairn does instead, the evidence, and
  the ruling with its date. The Provenance specimen notes move into the developer brief's voice
  subsection, and the promise of a later structure-plus-voice specimen (R1b, cut) goes.
- Everything else R1 landed stays: the base-guide header and arm table, Names (heading and anchor
  byte-identical), Visuals, the page anatomies, the tracks, the reference, the front door, "When a
  Vale finding is wrong", and "For reviewers". Every remaining quotation stays byte for byte: the
  Names table's Google and Git text and the voice specimens. Every anti-pattern specimen tagged
  `Killed:` stays. No passage, including the register's opening and "For reviewers", names a
  removed section.
- The exemplars: the developer brief names `docs/extend/choose-an-ai-posture.md` (whole page,
  anatomy and voice), the why-cairn front-door specimen (voice, front door only), and the two
  Google captures (anatomy). The editor brief names the Microsoft Learn capture.
- Acceptance: R1t's `diff-reviewer` read carries the ruling-16 check. The reviewer enumerates the
  ratified rules itself from the register at `feca3348` (the keystone, every universal-contract
  bullet, the calibration specimens, and the track, front-door, Names, anatomy, and reviewer
  sections) and locates each in the trimmed register as kept, reworded, or changed by ruling N,
  with none dropped. A "reworded" rule must forbid or require the same form as before.

**R2p. Vale pin** (landed at `5d82b505`). Its `diff-reviewer` read runs first.

**R2. The Vale rules.** Two custom rules at `warning` in `.vale.ini`, each with one pass and one
fail case in a `vale test` file beside the rule, plus vocabulary entries:

- `Cairn.Headings`, one merged rule on the Google arms (off under `docs/editors/**`): a leading
  -ing word or a trailing question mark, about 49 hits in the mechanics prototype. Wh-clause
  teasers stay banned (Geoff's ruling), but the register editor judges them, since a regex cannot
  tell a teaser from a noun clause.
- `Cairn.ProseProcedure`: an imperative after a clause boundary, counted per paragraph, about 31
  hits in the prototype. Its fail cases are `choose-an-ai-posture.md:99-103` and
  `rotate-the-github-app-key.md:99-102` at `8bbe78f5`.
- Whatever vocabulary entries `Google.Headings` and `Microsoft.Headings` need to stop firing on
  product names (GitHub App, Workers Builds, and the rest), in the accept list; vendored styles are
  never edited.

The docs gate's tree mode runs `vale test` over the two rules' test files under a small fixture
config (`StylesPath` plus `[*]` with `BasedOnStyles = Cairn`), since test input matches no
`.vale.ini` section. The gate filters Vale at `error`, so it cannot show a warning: every warning
count and every "raises no alert" check in this pass uses plain `vale <path>` (the config's
`MinAlertLevel = suggestion`), and R2 records each rule's measured tree-wide count in a `WATCH`
comment. A rule moves to `error` once that count reaches zero, one rule at a time; none moves this
pass. The pre-existing Cairn rules are unchanged and need no retroactive cases.

**R3. markdownlint (deferred).** Every stock rule with hits on today's tree would be disabled, so
it would catch nothing now. The close files one ROADMAP line: the first arm stage adopts stock
`markdownlint-cli2`.

**R5. The trigger page** (`docs/extend/choose-an-ai-posture.md`), at the join. Unchanged from the
first design (at `fb1aeba3`, "R5"): the freeze warrant holds, the edit follows "Edits after the
chain", the restructured ranges are the bold precondition (lines 6-8), `## Verify the served file`
(78-96), and `## Resolve a posture warning` (97-108), and every other sentence stays
byte-identical to `8bbe78f5`. The page must raise no `Cairn.ProseProcedure` or `Cairn.Headings`
alert under plain `vale` and pass `check:provenance` with its brief.

**R6. Admin design system and the repo `CLAUDE.md`.** `docs/internal/admin-design-system.md`'s
voice passages name Microsoft as the base for UI copy and apply ruling 5; "slightly academic",
"friendly-but-professional", and the cairn/stacking metaphor line go. The repo `CLAUDE.md`
Authoring section takes ruling 12 ("a published external standard as its base, with a recorded
house voice overlay") and names the drafting briefs in place of "On top of the Google floor".

**R9. Exemplar captures.** Three pages captured as markdown into `docs/internal/exemplars/`, each
with its source URL, capture date, and CC BY 4.0 attribution: a Google developer task page with a
numbered procedure, a Google concept page, and a Microsoft Learn procedure page taken from the
markdown source of a MicrosoftDocs repository whose `LICENSE` is CC BY 4.0 (the attribution cites
that file). Vale already skips `docs/internal/**`; `check:docs` scans it, so R9 adds the directory
to that check's skip set. In the repo, every chain worktree can read them.

### Chain W: the workstation

**W1r. Revert W1 and wire the brief by track.** `git revert 79c5e23` removes the extraction
validator, the coercion, `docs-chain-render.mjs`, and their tests. Then `docs-page-chain.js`'s
prompts name, by exact heading, the register sections the agent reads from the file: the track's
brief (`## Drafting brief: editor docs` for `editors`, `## Drafting brief: developer docs` for
every other track), `## Names`, `## Visuals (every page that carries one)`, `## The page
anatomies`, and the track's own section (the register's `### The <x> track (...)` heading for
`editors`, `admin`, and `extend`, `## The reference (...)` for `reference`, and `## The front door
(...)` for `front-door` and `readme`, each copied verbatim from the register at R1t's commit), with `## Deviations from the base guides` added for the
editor. The revert's "universal contract" line goes, and W1's unknown-track throw stays. The
editor runs plain `vale` on the page, never the gate, and grades the brief's checklist and tells
with Vale's alerts together. The drafter reads the page's exemplar sources whole (ruling 17), so
the page-inputs step stops trimming excerpts. One test covers every track value and one unknown
value.

**W2r. Drafter definition.** `b44f414` stays in substance: the brief is the structure and voice
source and outranks the definition, and the definition's own tell list is gone. The sentences
written for W1's extraction go (the dispatch "extracted every part" of the brief, "do not open the
register file", "two trimmed exemplar excerpts", the voice-role and anatomy-role tags): the
drafter reads the sections the dispatch names from the register file, and imitates each exemplar
for anatomy and rhythm, never its wording.

**W3r. Register-editor definition.** `4461c1f` stays in substance (the base guide first, the
editors arm graded to ruling 4, the dead references gone). Its `source` field, `q:`-id rule
references, and the dispatch-handed `## Provenance`, `## The tightening test`, and `## Recorded
exceptions` sections go; the editor reads `## Deviations from the base guides` from the file.
Guide findings come from the brief's structure checklist and Vale's alerts. Ruling 2's test
decides deviations: a register rule that forbids a form the guide prescribes or recommends, or
permits one it forbids, and has no row is a finding; a tightening needs no row.

**W4. The voice docs and the charter correction.** As the first design's W4 (at `fb1aeba3`) and
the plan's W4 task, minus the "one sanctioned copy" parity clause: ruling 12 lands in the
authoring charter, the global `CLAUDE.md` "Writing voice", the output style, and the
`writing-voice` skill; the cairn-docs route names the drafting brief by track and cairn.pub's own
prose as developer-brief; the voice exemplars write procedures as numbered lists; the audit's
doc-hygiene items (DC-26 to DC-28, AW-24, PS-07) land.

**W5. Implementer definitions.** Unchanged: the "plain voice" line in `cairn-implementer.md` and
`site-implementer.md` points docs prose at the track's drafting brief, and `site-implementer`'s
cairn-cms docs gate runs `check:docs-gate -- --page` on each page it touches.

**W6. Retired phrases.** The ruled phrases are appended to the dotfiles scanner's existing list
(`claude/.claude/tooling/retired-phrases.txt`), each with a comment naming its ruling, and the
header's sentence naming the cut R8 twin goes. The scanner and its tests already exist; no new
check. W6 rides W5's task.

**W7. Infra read at pass end.** Unchanged: one fresh reader lists every file that tells a writer
how to write cairn docs or cairn UI copy and returns a verdict per file (routes to the right
brief, restates no rule of its own, carries no retired phrase). Mismatches are fixed before the
close.

### The join

R5, then J2, then W7. Geoff's one sitting opens when R5 lands (ruling 14) and covers the J2
draft, which runs meanwhile.

- **J2, the proof run.** The chain drafts one real page under the new system:
  `docs/extend/enable-tidy.md`, which the audit found breaks the base guide and which the extend
  stage rebuilds anyway. It runs on a throwaway branch, `style-guide-proof`, never merged in this
  pass; stage 2a may adopt the draft. Its exemplar is the AI posture page as R5 leaves it, so a
  rejected R5 diff voids J2 and reruns it after R5's fix. A fact-container change the chain makes
  is cherry-picked to `style-guide-sync`, since the container is not frozen. This is the first
  measurement that the system writes better pages.
- **Geoff's sitting.** One attended read covering the R5 diff (ruling 7) and the J2 draft beside
  the current page.

## Walked back or cut (ruling 15)

The first design's R7 (`check:register-briefs`), R8 (the repo tripwire), R1b (the specimen, now
covered by the whole-page exemplar), the promoted-pages list and its fail-closed JSON, the fixture
harness meta-check and legacy allowlist, `.vale-structure.ini`, `Cairn.LinkText`,
`Cairn.LinkInHeading`, `Cairn.CodeFont`, `Cairn.ListItemCase`, markdownlint custom rules, the
planted-defect positive controls, the sanctioned-copy parity clause, W1's extraction and coercion,
the exemplar role rendering, a home-grown rule-example runner (`vale test` does it), the per-brief
word cap, the register editor's read of the register itself, and, for this pass, markdownlint (R3).

## Acceptance criteria

1. The register's two drafting briefs each carry a structure checklist, no `q:` or `x:` marker,
   and no verbatim guide quotation, and link their base guide. The register holds one
   "Deviations from the base guides" section with all four Google rows (measured tone, qualified
   claims, first person, the dormant README exclamation row), each with its evidence, and a plain
   sources list.
2. R1t's `diff-reviewer`, enumerating the ratified rules at `feca3348` itself, finds every one
   kept, reworded to the same force, or changed by a named ruling, with none dropped. The `#names`
   anchor, every remaining quotation, and the `choose-an-ai-posture.md` paragraph (`8bbe78f5`
   lines 23-26) are byte-identical; every `Killed:` specimen remains.
3. `Cairn.Headings` and `Cairn.ProseProcedure` sit at `warning`, their cases pass under `vale
   test` in the docs gate, and each rule's measured tree-wide count is recorded in a `WATCH`
   comment beside it.
4. The unscoped docs gate exits 0 on the tree.
5. `docs-page-chain.js` carries no extraction, validator, or coercion code, and its track test
   passes; the dotfiles `scripts/check.sh` and `claude-tooling-sync verify` pass.
6. `choose-an-ai-posture.md` raises no alert from either new rule under plain `vale`, passes
   `check:provenance` with its brief, and shows every sentence outside the restructured ranges
   byte-identical to `8bbe78f5`; Geoff reads the diff once.
7. The J2 draft passes the docs gate on its branch, the register editor's findings are reported,
   and Geoff reads it beside the current page.
8. W7 returns no open mismatch, and the retired-phrase scanner passes.

## Out of scope

- Fixing existing pages beyond R5; each frozen arm is swept at its own stage.
- Merging the J2 draft.
- Promoting any rule to `error`.
- An admin UI string sweep.
- Gating explanatory sentence length (S14).
- Promoting the reference arm and root README.
