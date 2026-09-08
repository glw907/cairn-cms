# A prose standard for the cairn docs

Proposal, 2026-09-08, for Geoff's review. This document follows the standard it proposes. Its
own measurements are at the end, so you can test the standard on the page that describes it.

## What this proposes

Adopt the Federal Plain Language Guidelines as the prose standard for every published cairn
page. Keep the Google and Microsoft style guides for mechanics. Turn the plain-language rules
that have numbers into gates. Rewrite the pages that fail those gates in a docs pass of their
own.

## Why the current standards were not enough

The docs follow two published guides today. Google covers the developer tracks and Microsoft
covers the editors track. Both guides work at the level of words: which term to use, how to
capitalize it, when to use the active voice. Both have Vale packages, and both were green on
the front-door draft you rejected.

The front-door draft failed above the word level. More than half its sentences were two clauses hinged on
a comma. Its subjects were abstract nouns like "the shape" and "the tie." It wrapped its claims
in disclaimers about itself. It used engine vocabulary, like "seams," on a page for a reader
who has never seen the engine. No gate saw any of this, because no gate we run has a rule
about sentences or paragraphs.

The same rhythm runs through the developer docs. Measured today, the extend track builds 48
percent of its sentences as comma-hinged pairs and the reference track 44 percent. Human
technical writing we measured for comparison runs 19 to 44 percent, and the best of it runs
under 30. A dozen extend pages sit between 53 and 67 percent.

## The standard

### Plain language for prose

The Federal Plain Language Guidelines (plainlanguage.gov) become the prose standard. The
guidelines are published, free, and stable since 2011. Their rules have numbers, which is
what makes them enforceable. The rules we adopt:

- Keep the average sentence between 15 and 20 words. Let no sentence pass 40.
- Put one idea in each sentence.
- Keep the subject, the verb, and the object close together.
- Use verbs, not nouns made from verbs. Write "decide," not "make a decision."
- Use the active voice unless the actor is unknown or does not matter.
- Use everyday words. Where a technical term is needed, define it the first time.
- Keep one topic in each paragraph, and keep paragraphs short.
- Address the reader as "you" where the track allows it.

### Principles from ISO 24495-1

ISO 24495-1:2023 sets the test that the rules serve. A document is plain when its reader can
find what they need, understand it, and use it. We adopt that test as the definition of done
for any page. A page that passes every gate and fails this test is not done.

### Sentence ceilings from Simplified Technical English

ASD-STE100 is the aerospace standard for maintenance manuals. Its controlled vocabulary is too
strict for prose, and we do not adopt it. Its two sentence ceilings are right for our instructional tracks: 20 words for a
sentence that gives an instruction, 25 for a sentence that describes. The admin and editors
tracks adopt those two numbers. The extend and reference tracks keep the plain-language
ceiling of 40.

### What stays

Google and Microsoft keep the mechanics. Their Vale packages are vendored and pinned in CI.
The four-track structure of the docs stays as it is. The front door keeps its register rulings from today: a
technical voice, graded against named human specimens, with author facts taken only from your
own brief.

## How we hold the standard

Three gates hold this standard against the drift that every ungated rule suffers.

**Vale holds the numbers** through a new Cairn rule that fails any sentence over the ceiling
for its track.
A second rule warns when a page's average passes 22 words. The `proselint` and `write-good`
packages, which Vale can vendor, catch hidden verbs, hedges, and weasel words.

**The tell scanner holds the cadence** through two measures from today's comparison: the share of sentences built as comma-hinged pairs, and the share under eight
words. Each register gets a band set by its specimens. A page whose measures fall outside its band fails the gate.

**A person holds the reading**: before a page reaches you, I read it myself, in full, against
the specimens for its register. The review agents grade against those same specimens and
report the measurements beside their verdict. A grade with no specimen beside it does not
count.

## What changes in the repository

- `docs/internal/docs-register.md` names the standard, the ceilings per track, and the
  specimen set per register.
- `.vale.ini` adds the `proselint` and `write-good` packages and the two Cairn readability
  rules.
- The `writing-voice` skill's tell scanner gains the two cadence measures and the per-register
  bands.
- The register's calibration specimens become text you wrote or approved, each dated. The
  invented specimen from the front door is already withdrawn.
- Author facts for the front door live in the author brief. A claim about you or about the
  product's stance that is not in the brief is a blocking finding.

## The docs pass

A docs pass brings the published tracks under the gates. It runs one page per read, the way
the front door will. The order is by how far a page sits outside the band, worst first. The
extend track goes first, because its readers are the developers whose respect the docs need
most. The pass is its own slice, separate from polish-B, with its own plan and ceiling.

## Changes to the Claude infrastructure

The front door failed because the tooling rewarded rule compliance and never asked the author.
Each layer of the Claude setup that touches writing changes so that it cannot happen again.
The list runs from the instructions Claude reads first to the gates that run last.

### Instructions: the global and project `CLAUDE.md`

- The writing-voice section names the Federal Plain Language Guidelines as the prose standard
  above the Google and Microsoft mechanics, and carries the numbers: an average of 15 to 20
  words, a ceiling of 40, one idea per sentence.
- A new rule, "author facts come from a brief," says that any claim about the author, the author's
  experience, or the product's stance comes from a brief the author wrote or approved, with a
  source per claim. A claim with no source in the brief is a blocking finding, never a guess.
- A new rule, "audience prose is co-written," says that a page for an evaluator, an editor, or an
  operator is drafted one section per read, with the author reading each section before the
  next. It is never produced end to end in an autonomous run.
- The thin-conductor rule gains one exception. The conductor never reads code diffs, and it
  always reads audience prose in full before that prose reaches the author.

### The writing-voice output style

The output style is the instruction Claude carries into every reply and every draft. It gains
the plain-language numbers and three tells the front door exposed: the two-headed heading, the
abstract noun standing in for the concrete thing, and the disclaimer about the page itself. Its
advice to vary sentence length stays, under the average and the ceiling.

### The writing-voice skill and its registers

The skill routes each audience to a register file under `~/.claude/docs/voice/`. Each register
file gains three things: the plain-language standard beside its mechanics guide, a specimen
set of human-written pages in that register saved locally with their sources, and the cadence
band those specimens set. A review that cites no specimen from the set is incomplete.

### The tell scanner

`tellgrader` gains the two cadence measures, the share of comma-hinged pairs and the share of
sentences under eight words, plus a sentence-length average and ceiling and a hidden-verb
count. Each register carries its band in a small file the scanner reads. In hook mode the
scanner reports a page outside its band as a finding, the same as any other tell. In gate
mode it exits non-zero, so a docs gate can run it.

### Hooks

The save hooks already run Vale and the tell scanner on every docs edit. Two things change.
First, the Vale hook grades a draft by its destination: a file under a record directory whose
name or header marks it as a draft for a published path is graded with that path's styles.
Second, a hook on the front-door files and the register's specimen section warns when a save
adds a first-person claim, and names the brief the claim must trace to.

### Linters in the repository

Vale gains the `proselint` and `write-good` packages and two Cairn rules: a sentence over the
ceiling for its track is an error, and a page average over 22 words is a warning. The
two-headed heading rule landed today. Each rule names the plain-language rule it enforces in
its message, so a finding teaches the standard as it fires.

### Review agents

`prose-voice-reviewer` and `cairn-register-editor` change in three ways. Their dispatch names
the register and the specimen set. Their report carries the measurement table beside the
verdict. And they check author-facing claims against the brief, reporting any claim the
brief does not carry as blocking. `diff-reviewer` runs the tell scanner in gate mode on any
docs task and reports the numbers.

### Skills and workflows

The `cairn-pass` skill's documentation step gains the measured read: every changed page is
measured, and any page for an external reader gets a human read before the pass closes. The
pass-execute workflow's docs tasks carry the scanner in their gate string. A new section in
the writing-voice skill, "author-facing prose," holds the protocol: brief first, one section
per read, specimens beside every grade.

### Memory

A feedback memory records today's lesson in one paragraph, so a session that starts cold
does not repeat it: the invented opener, how it passed every gate, and the rule that came out
of it.

## How to test this proposal

This document follows the rules set out above. Measured with the same script used on the front door, over everything above this section.
The second column drops the list items, which the standard wants short:

| Measure | All sentences | Prose only, lists excluded | Band |
|---|---|---|---|
| Sentences | 104 | 89 | |
| Average length | 15.0 words | 15.1 words | 15 to 20 |
| Longest sentence | 38 words | 35 words | under 40 |
| Comma-hinged pairs | 21 percent | 20 percent | 19 to 44, best under 30 |
| Sentences under 8 words | 12 percent | 9 percent | 0 to 16 |
| Vale, Google package | 0 errors | | |
| Tell scanner | 0 tells | | |

If this page reads well to you, the standard works on at least one page. If it reads badly,
the standard needs a rule it does not have, and the place to find that rule is in what you
disliked.

## Decisions for you

1. Adopt the Federal Plain Language Guidelines as the prose standard, with the numbers above.
2. Adopt the two STE ceilings for the admin and editors tracks.
3. Approve the three gates and the repository changes.
5. Approve the Claude infrastructure changes, in the order listed.
4. Approve the docs pass as its own slice, extend track first.
