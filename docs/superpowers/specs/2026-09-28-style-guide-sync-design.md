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
    brief no longer restates the base guide, so no sync check keeps it in step.
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
    the `choose-an-ai-posture.md` paragraph at `8bbe78f5` lines 23-26 verbatim, the "Killed:"
    specimen), the Names section, the page anatomies, the track and front-door sections, and
    every recorded deviation. What shrinks is prose that restates the base guide, which the stock
    Vale packages and the guide itself already carry.
17. **The AI posture page is the developer track's primary exemplar**, as a whole page, for both
    anatomy (choose, set, pass, verify, resolve) and voice.
18. **The editor track's exemplar is a captured Microsoft Learn procedure page.** An in-repo editor
    exemplar is named when the editors stage redrafts its first page, as the AI posture page
    earned the developer slot.
19. **The register editor stays in the chain, with no A/B test.** It works a checklist plus Vale's
    output, the checklist-with-external-feedback form the research supports. A one-page A/B has a
    sample of one and cannot separate a signal from noise.
20. **The remainder of the pass carries a 6M token ceiling.**

## Sources

Each kept mechanism names its source here; the leanness record carries the full research.

- **Warning first, then promote a rule to error once the tree is clean:** GitLab's Vale practice
  (https://docs.gitlab.com/development/documentation/testing/vale/).
- **Three severity tiers, noisy rules demoted with a rationale comment:** Elastic
  (https://www.elastic.co/docs/contribute-docs/vale-linter).
- **A pass example and a fail example per custom rule:** Elastic's and Spectro Cloud's rule
  repositories (https://github.com/elastic/vale-rules,
  https://www.spectrocloud.com/blog/how-we-use-vale-to-enforce-better-writing-in-docs-and-beyond).
  Vale 3.23.0 has no `vale test` command, so a short script runs Vale over the example pairs; the
  leanness record's "Vale 3.x ships `vale test`" is wrong.
- **A style guide that names its base guide and lists its deviations in one section:** GitLab's
  and Grafana's writing guides.
- **Three to five canonical examples over long rule lists:** Anthropic's prompting guidance
  (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices);
  instruction-following falls as simultaneous rules grow (https://arxiv.org/pdf/2509.21051).
- **Checklist-driven critique with external feedback over unguided self-critique:**
  https://arxiv.org/abs/2310.01798, https://arxiv.org/pdf/2410.06458.
- **Vendored example pages under their license:** Google's developer documentation and Microsoft
  Learn content are both published under CC BY 4.0, which permits copying with attribution.
- **markdownlint-cli2 with a stock config, rules with existing hits disabled and re-enabled as
  pages are fixed:** the same warning-first ratchet as GitLab's Vale rollout, applied to
  markdownlint's on/off rules.

## Design

Two chains with disjoint files run in parallel, then join. Chain R works in this repo; chain W in
the dotfiles worktree `~/Projects/.worktrees/dotfiles-style-guide-sync`.

### Chain R: the repo

**R1t. Trim the register** (`docs/internal/docs-register.md`). R1 stays; it is trimmed, not
reverted, because it carries everything ruling 16 preserves. The trim:

- Each drafting brief becomes a short supplement to its base guide, in the GitLab and Grafana
  pattern: a link to the base guide as the structure source, the voice stated positively with its
  specimens, the exemplar list (below), and a short tell list. Prose that restates a base-guide
  rule the stock Vale package or the guide itself carries goes. A register rule stricter than the
  guide stays, stated once. Each brief stays under 1,000 words, specimens and exemplar list
  excluded.
- The `q:` and `x:` markers go. The "Guide quotes" provenance table becomes a plain sources list
  of links. "The tightening test" and the two "Recorded exceptions" sections merge into one
  "Deviations from the base guides" section: the test, then one short table per guide, each row
  naming the base rule, what cairn does instead, the ruling, and the date.
- Everything else R1 landed stays: the base-guide header and arm table, Names (heading and anchor
  byte-identical), Visuals, the page anatomies, the tracks, the reference, the front door, "When a
  Vale finding is wrong", "For reviewers" (its pointer to provenance now points at the deviations
  section), and every quotation byte for byte.
- The exemplars: the developer brief names `docs/extend/choose-an-ai-posture.md` (whole page,
  anatomy and voice), the why-cairn front-door specimen (voice, front door only), and the two
  Google captures (anatomy). The editor brief names the Microsoft Learn capture.
- Acceptance: R1's rule-disposition list is re-run against the register at `feca3348`, and no
  voice rule moves to "dropped".

**R2p. Vale pin** (landed at `5d82b505`). Its `diff-reviewer` read runs first.

**R2. The Vale rules.** Three custom rules, all at `warning` in `.vale.ini`, each with one pass
and one fail example under a fixtures directory outside the docs globs:

- `Cairn.Headings`, one merged rule on the Google arms (off under `docs/editors/**`): a leading
  -ing word, a question, or a wh-clause teaser. About 77 measured hits today.
- `Cairn.ProseProcedure`: an imperative after a clause boundary, counted per paragraph. About 52
  measured hits today. Its fail examples are `choose-an-ai-posture.md:99-103` and
  `rotate-the-github-app-key.md:99-102` at `8bbe78f5`.
- Whatever vocabulary entries `Google.Headings` and `Microsoft.Headings` need to stop firing on
  product names (GitHub App, Workers Builds, and the rest), in the accept list; vendored styles are
  never edited.

A script (`scripts/checks/vale-rule-examples.mjs`) runs Vale over the pairs and fails when a fail
example raises no alert from its rule or a pass example raises one. It runs in the docs gate's
tree mode. A rule moves to `error` once its tree-wide count reaches zero, one rule at a time; none
moves this pass. The pre-existing Cairn rules are unchanged and need no retroactive examples.

**R3. markdownlint.** `markdownlint-cli2` as a dev dependency with the stock rule set, run by the
docs gate over the published docs arms. Every stock rule with hits on today's tree is disabled in
the config with a comment giving its count; a later pass re-enables a rule once its hits are
fixed. No custom rules.

**R5. The trigger page** (`docs/extend/choose-an-ai-posture.md`), at the join. Unchanged from the
first design (at `fb1aeba3`, "R5"): the freeze warrant holds, the edit follows "Edits after the
chain", the restructured ranges are the bold precondition (lines 6-8), `## Verify the served file`
(78-96), and `## Resolve a posture warning` (97-108), and every other sentence stays
byte-identical to `8bbe78f5`. The page must raise no `Cairn.ProseProcedure` or `Cairn.Headings`
alert and pass `check:provenance` with its brief.

**R6. Admin design system and the repo `CLAUDE.md`.** `docs/internal/admin-design-system.md`'s
voice passages name Microsoft as the base for UI copy and apply ruling 5; "slightly academic",
"friendly-but-professional", and the cairn/stacking metaphor line go. The repo `CLAUDE.md`
Authoring section takes ruling 12 ("a published external standard as its base, with a recorded
house voice overlay") and names the drafting briefs in place of "On top of the Google floor".

**R9. Exemplar captures.** Three pages captured as markdown into `docs/internal/exemplars/`, each
with its source URL, capture date, and CC BY 4.0 attribution: a Google developer task page with a
numbered procedure, a Google concept page, and a Microsoft Learn procedure page. The directory
sits under `docs/internal/**`, which Vale already skips; the other docs checks skip it too. In the
repo, every chain worktree can read them.

### Chain W: the workstation

**W1r. Revert W1 and wire the brief by track.** `git revert 79c5e23` removes the extraction
validator, the coercion, `docs-chain-render.mjs`, and their tests. Then one small change to
`docs-page-chain.js`: the drafter and editor prompts name the register section for the page's
track (`## Drafting brief: editor docs` for `editors`, `## Drafting brief: developer docs` for
every other track) and tell the agent to read it from the file. The editor prompt also has the
editor run Vale on the page and grade the brief's tell list and Vale's alerts together. One test
covers the track-to-brief mapping for every track value.

**W2r. Drafter definition.** `b44f414` stays in substance: the brief is the structure and voice
source and outranks the definition, and the definition's own tell list is gone. `ead04af`'s
"exemplar roles as the dispatch renders them" is reworded to the plain form: an exemplar excerpt
is imitated for anatomy and rhythm, never its wording.

**W3r. Register-editor definition.** `4461c1f` stays in substance (the base guide first, the
editors arm graded to ruling 4, the dead references gone). Its `source` field and `q:`-id rule
references go; guide findings come from the base guide and Vale's alerts, and a register rule
stricter than the guide that has no row in the deviations section is a finding.

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
(`claude/.claude/tooling/retired-phrases.txt`), each with a comment naming its ruling. The scanner
and its tests already exist; no new check.

**W7. Infra read at pass end.** Unchanged: one fresh reader lists every file that tells a writer
how to write cairn docs or cairn UI copy and returns a verdict per file (routes to the right
brief, restates no rule of its own, carries no retired phrase). Mismatches are fixed before the
close.

### The join

R9, then R5, then Geoff's one sitting, then the register review and W7.

- **J2, the proof run.** The chain drafts one real page under the new system:
  `docs/extend/enable-tidy.md`, which the audit found breaks the base guide and which the extend
  stage rebuilds anyway. It runs on a throwaway branch, `style-guide-proof`, never merged in this
  pass; stage 2a may adopt the draft. This is the first measurement that the system writes better
  pages.
- **Geoff's sitting.** One attended read covering the R5 diff (ruling 7) and the J2 draft beside
  the current page.
- **J4, the register review.** One fresh `cairn-register-editor` read of the trimmed register, plus
  the re-run disposition list (R1t's acceptance). Blocking findings fold through one dispatch.

## Walked back or cut (ruling 15)

The first design's R7 (`check:register-briefs`), R8 (the repo tripwire), R1b (the specimen, now
covered by the whole-page exemplar), the promoted-pages list and its fail-closed JSON, the fixture
harness meta-check and legacy allowlist, `.vale-structure.ini`, `Cairn.LinkText`,
`Cairn.LinkInHeading`, `Cairn.CodeFont`, `Cairn.ListItemCase`, markdownlint custom rules, the
planted-defect positive controls, the sanctioned-copy parity clause, W1's extraction and coercion,
and the exemplar role rendering.

## Acceptance criteria

1. The register's two drafting briefs are each under 1,000 words (specimens and exemplar list
   excluded), carry no `q:` or `x:` marker, and link their base guide. The register holds one
   "Deviations from the base guides" section with the seed rows and a plain sources list.
2. The re-run disposition list against `feca3348` lists every ratified rule as kept, reworded, or
   changed by ruling N, with none dropped; the `#names` anchor and every quotation are
   byte-identical.
3. `Cairn.Headings` and `Cairn.ProseProcedure` sit at `warning`, their pass and fail examples
   pass under `vale-rule-examples.mjs`, and each rule's tree-wide count is recorded in a `WATCH`
   comment beside it.
4. `markdownlint-cli2` runs in the docs gate with a stock config, and each disabled rule carries
   its count.
5. The unscoped docs gate exits 0 on the tree.
6. `docs-page-chain.js` carries no extraction, validator, or coercion code, and its track test
   passes; the dotfiles `scripts/check.sh` and `claude-tooling-sync verify` pass.
7. `choose-an-ai-posture.md` raises no alert from either new rule, passes `check:provenance` with
   its brief, and shows every sentence outside the restructured ranges byte-identical to
   `8bbe78f5`; Geoff reads the diff once.
8. The J2 draft passes the docs gate on its branch and draws no blocking register-editor finding;
   Geoff reads it beside the current page.
9. The register review draws no blocking finding after one fold.
10. W7 returns no open mismatch, and the retired-phrase scanner passes.

## Out of scope

- Fixing existing pages beyond R5; each frozen arm is swept at its own stage.
- Merging the J2 draft.
- Promoting any rule to `error`.
- An admin UI string sweep.
- Gating explanatory sentence length (S14).
- Promoting the reference arm and root README.
