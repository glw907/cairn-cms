# Style-guide sync: leanness check and Geoff's ruling

Date: 2026-09-28. Segment A was paused mid-run (workflow `wf_1a23dd8e-98b`) after a fresh-context
leanness audit and a web-research round. Landed before the pause: R1 (`7bf6a110`, `f9723e50`),
R2p (`5d82b505`, review unfinished), and in dotfiles W1 `79c5e23`, W2 `b44f414`/`ead04af`,
W3 `4461c1f`. R2a and R2b never started.

## Geoff's ruling

"I'm not looking to invent anything new. I want a proven and battle-tested system." The re-scope
takes the conventional method at every fork and walks back what the branch invented.

## The prior overbuild (why this check ran)

`docs/HISTORY.md:279-292`: the docs reset's reader-validation line (2026-09-23 to 26) spent about
43M tokens over three passes, drafted zero pages, and built toward an unreachable detection bar.
Its lesson: take the conventional method first, and check a bar is reachable before building
toward it. This pass repeated the pattern in part: four review folds each turned a hypothetical
failure mode into machinery, and a 12M-token system pass touched one real page.

## Research findings (web, about 12 sources)

- GitLab adds a Vale rule at warning, fixes hits, then promotes that rule to error; one
  `.vale.ini`, no per-page staging, no fixture tests
  (https://docs.gitlab.com/development/documentation/testing/vale/).
- Elastic and Spectro Cloud test rules with a pass and a fail case, but they ship shared packages
  (https://github.com/elastic/vale-rules,
  https://www.spectrocloud.com/blog/how-we-use-vale-to-enforce-better-writing-in-docs-and-beyond).
  Vale 3.x ships `vale test` for this.
- Elastic's three tiers: error for structural, warning for high-confidence, suggestion for
  context-dependent; noisy rules demoted with a rationale comment
  (https://www.elastic.co/docs/contribute-docs/vale-linter).
- Anthropic recommends 3 to 5 canonical examples over long rule lists
  (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
  Instruction-following all-pass rates fall steeply as simultaneous rules grow
  (https://arxiv.org/pdf/2509.21051).
- Unguided self-critique often fails to help; checklist-driven critique with external feedback does
  better (https://arxiv.org/abs/2310.01798, https://arxiv.org/pdf/2410.06458).
- No team found uses quote-provenance markers, a promoted-pages list, or an LLM-chain-plus-Vale
  hybrid as a norm.

## Mechanism verdicts under the ruling

| Mechanism | Built | Verdict |
|---|---|---|
| Base guide first, stock Google/Microsoft Vale packages, vocabulary | partly | Keep |
| Deviations from the base guide, as a plain section | R1 (as exceptions tables) | Keep as a plain "Deviations" section, the GitLab/Grafana pattern |
| `q:`/`x:` markers and the provenance table | R1 | Walk back; a plain sources list of links |
| Drafter brief (about 4,500 words of rules reach the developer drafter) | R1, W1 | Replace with a short supplement, 3 to 5 exemplars, a short tell list |
| Deterministic section extraction, sentinel validator | W1 | Walk back; the drafter reads the supplement file directly |
| Forced-blocking coercion of guide findings | W1 | Walk back; the editor works a checklist plus Vale output |
| Per-rule warning-then-error promotion | no | Keep (GitLab) |
| Promoted-pages list, fail-closed JSON | no | Cut |
| Fixture harness meta-check, legacy allowlist | no | Cut; `vale test` pairs for custom regex rules only |
| Heading rules | no | One merged rule, at warning (77 measured hits) |
| ProseProcedure | no | Keep at warning (52 measured hits) |
| LinkText, LinkInHeading, CodeFont, ListItemCase | no | Cut, no observed instance |
| markdownlint-cli2 | no | Stock config; custom rules only for a measured defect |
| R8 repo tripwire, `.vale-structure.ini` pair, sanctioned-copy parity | no | Cut |
| Planted-defect controls (J4's planted loosening) | no | Cut |
| J2 real-page proof run | no | Keep: the first measurement that the system writes better pages |
| R2p Vale 3.23.0 pin, W2/W3 agent-definition syncs | yes | Keep, adjusted to the slimmer supplement |

## Constraint: the target register is preserved (Geoff, 2026-09-28)

The re-scope removes machinery, never voice. Every ratified register rule survives, as does the
voice R1 carries: the developer brief's voice specimens (the why-cairn front-door specimen, the
`choose-an-ai-posture.md` paragraph at `8bbe78f5` lines 23-26 verbatim, the "Killed:" specimen),
the Names section, the page anatomies, the track and front-door sections, and every recorded
deviation from the base guide. What shrinks is prose that restates the base guide, which Vale's
stock packages already enforce. The exemplars become the primary carrier of the register, per
Anthropic's few-examples guidance, so slimming the rule text strengthens the voice signal rather
than diluting it. Acceptance for the re-scope: R1's rule-disposition list (each ratified rule kept,
reworded, or changed by ruling) is re-run against the slimmed register, and no voice rule moves to
"dropped". J2's real-page run and Geoff's R5 read are the proof the register still lands.

## Exemplar: the AI posture page (Geoff, 2026-09-28)

`docs/extend/choose-an-ai-posture.md` (758 words, redrafted under the amended register in draft
docs pass 0+1, `c634f43c`, `b8bfd30f`) becomes the developer track's primary exemplar as a whole
page, carrying both roles: anatomy (choose, set, pass, verify, resolve) and voice. The plan used
only its concept paragraph (lines 23-26) as a specimen. The audit found both earlier in-repo
exemplars break the base guide, so this page replaces them as the model the drafter imitates. The
re-scope builds the developer drafter's 3 to 5 exemplars around it.

## Errata (2026-09-29)

Recorded at the pass close; the text above stands as written. Source for each: the re-scope fold
record (`2026-09-28-style-guide-sync-rescope-fold.md`, "Errata owed") and the plan's ledger.

1. **Verdict table, the Headings and ProseProcedure rows.** "77 measured hits" and "52 measured
   hits" were the audit's uncalibrated heuristic estimates, not measurements. Under the rules as
   merged (R2, `2c444b0e`), plain `vale` over the tree measured 49 and 31.
2. **Verdict table, the markdownlint row.** "Stock config" did not ship in this pass. The fold
   deferred markdownlint (conductor decision 3); `ROADMAP.md` carries its adoption at the first
   rebuilt arm.
3. **Verdict table, the Headings row.** The merged rule fires on a leading -ing word or a trailing
   `?` only. The wh-teaser check was dropped (conductor decision 2); the register editor judges
   wh-teasers.
4. **The constraint paragraph (ruling 16).** It says what shrinks is prose "Vale's stock packages
   already enforce". The trim went further: verbatim quotations of base-guide rules that Vale does
   not enforce also left the briefs. Each such rule survives as a linked line in its brief's
   structure checklist, so no rule was lost, but the stated boundary understated the cut.
5. **Research findings, "Vale 3.x ships `vale test` for this".** The claim was right. The
   conductor's contrary correction in the re-scoped spec was wrong; the fold removed it after
   `vale test --help` ran on 3.23.0. `vale --help` omits it from its command list.
