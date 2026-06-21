# What conventions tidy should manage: research reference

A cited deep-research pass (24 sources, 25 claims through three-vote adversarial verification, 24
confirmed and 1 refuted) on which writing conventions a voice-preserving light copy-edit should manage,
grounded in professional copy-editing practice, the major house style guides, and what automated tools
codify. It corrects the convention set the brief proposed. Sources are listed at the end.

## The frame: cairn sits at the copyedit-mechanics tier

Professional editing draws a stable line. Copyediting handles mechanics: technical errors, internal
consistency, and typographic house style. Line editing handles sentence-level rewriting and prose voice,
and Chicago recommends a thorough line edit be a separate, earlier step. A light copy-edit therefore
belongs at the copyedit-mechanics tier, and sentence rewriting and voice are the out-of-scope boundary.
cairn's refusal to rewrite any sentence is deliberately stricter than Chicago (which notes a copyedit
"typically involves some line editing"), and that strictness is the correct posture for preserving voice.

Every major automated tool encodes the same split as discrete, individually toggleable rule categories:
Vale's eleven check types authored as per-style YAML, LanguageTool's separation of TYPOS and GRAMMAR and
PUNCTUATION from STYLE and REDUNDANCY (its "Picky Mode" gates style separately), Grammarly's
correctness / clarity / engagement / delivery taxonomy, and proselint's per-check JSON config. So cairn's
per-convention toggle model, objective fixes on by default and style conventions opt-in, is the
industry-standard design, not an invention.

## Corrections to the proposed set

1. **The Oxford comma is three-position, not binary.** Chicago uses it in every series; AP omits it in a
   simple series but uses it in a complex one (an element containing a conjunction, "biscuits and
   gravy"). A faithful toggle needs always (Chicago) / complex-only (AP) / never.
2. **Number style is multi-position with exception sets, not binary.** AP spells out one through nine and
   uses numerals for 10 and up; Chicago spells out one through one hundred. Both always use numerals for
   ages, dates, measurements, and percentages. The toggle needs the two thresholds plus the always-numeral
   exception sets.
3. **Drop sentence spacing.** Chicago calls two spaces "discouraged" but explicitly "nothing inherently
   wrong," so it is a preference, not an error, and it must not be a default-on fix. More to the point, it
   is moot in cairn: markdown renders to HTML, where runs of spaces collapse to one, so normalizing two to
   one in source has no visible effect. Genuine whitespace errors (trailing spaces, tabs) stay in the
   objective default fixes; sentence spacing leaves the set.
4. **Smart quotes move to an advanced tier.** Straight-to-curly is mechanical in principle, and the
   markdown scoping (skip code, fences, HTML, link URLs) is a solved pattern. But apostrophes defeat naive
   paired-delimiter matching: "don't", "James'", "the '90s", "'em", and primes like 5'10" all break it,
   and SmartyPants' own author states the general case "cannot be solved." This is the single riskiest
   item in the set. It ships only behind an advanced gate, default off, with explicit
   contraction/possessive/decade-elision/prime apostrophe rules. It is never a casual default.

## Additions the research supports

5. **Percent style** (the percent sign versus the word "percent"): AP uses the sign, Chicago writes the
   word in general prose. A clean, purely typographic toggle. Add it.
6. **Spellcheck must be dialect-aware (a real change to the default-on feature).** Professional tools treat
   regional spelling as a user locale setting (Grammarly offers American, British, Indian, Australian,
   Canadian), never a default correction. So cairn's spellcheck must carry a per-site English-dialect
   setting and respect it, so it never flags "colour" or "organise." Regional spelling is not a tidy
   toggle at all; it is a locale property of the content. This was implicit in the brief's "never normalize
   regional spelling," but the research makes it concrete: the spellcheck dictionary needs a dialect
   choice.

Lower-priority additions worth listing but not pressing for v1: currency redundancy ("$100 dollars"
becomes "$100", proselint's `misc.currency`) and date-format normalization (proselint's
`dates_times.dates`). Both are mechanical and defensible; hold them as advanced or later.

## The one carve-out from the out-of-scope category

Terminology and preferred-term word swaps (utilize to use, that to which) are Vale's `substitution`
mechanism and are squarely voice/line-editing, so they stay out. The one defensible carve-out is
**brand and proper-noun capitalization** (github to GitHub, javascript to JavaScript), which is arguably
orthographic rather than word choice. If cairn ever offers it, scope it strictly to a curated
proper-noun list behind the advanced gate, never a generic preferred-word list. Open question for the
lead; default is to leave it out of v1.

## Out of scope (voice), confirmed: never expose

Word and terminology swaps, passive-to-active, weasel words, hedging, clichés, wordiness, adverb pruning,
and rhetorical rules ("do not start with But", "avoid suddenly"). write-good's entire rule set is this
class (its claim was refuted 0-3 precisely because it is all line-editing "improvement"), and proselint's
voice checks (weasel_words, hedging, pretension, corporate_speak) are the same. A voice-preserving tool
exposes none of them.

## An advantage of cairn's LLM-driven tidy

The contextual house-style rules (AP's complex-series Oxford comma, AP's number exception sets) need
parsing semantics beyond find-and-replace, which is where deterministic linters struggle. cairn's tidy is
LLM-driven, so the prompt can state the faithful position ("AP complex-only Oxford comma") and the model
applies it in context. The thing regex tools approximate, cairn can do properly, as long as the prompt
encodes the rule and the diff-review lets the author verify it.

## Open questions carried for the lead

- Brand/proper-noun capitalization: an advanced curated-list toggle, or out entirely? (Default: out of v1.)
- For the multi-position toggles, expose the faithful contextual positions (AP complex-only, the number
  exceptions) and lean on the model, or offer only the unconditional positions? (Lean: faithful, since the
  model can do it and the diff-review catches a miss.)
- The minimum complete apostrophe rule set for the smart-quotes advanced toggle (contractions,
  possessives including a trailing-s possessive, decade elision, leading-apostrophe abbreviations, primes).

## Sources

Primary: the Chicago Manual of Style site and Q&A and the official CMOS Shop Talk blog
(chicagomanualofstyle.org, cmosshoptalk.com); Vale (github.com/vale-cli/vale, vale.sh/docs);
LanguageTool's category javadoc and rule docs (languagetool.org); Grammarly's support pages
(support.grammarly.com); proselint's README and source (github.com/amperser/proselint); SmartyPants
(daringfireball.net/projects/smartypants). Secondary corroboration: the Dragonfly Editorial AP-vs-Chicago
field guide, apvschicago.com, The Punctuation Guide, and several professional-editor explainers (Jane
Friedman, ACES, Knowadays). One refuted claim (0-3): write-good as anything but line editing.
