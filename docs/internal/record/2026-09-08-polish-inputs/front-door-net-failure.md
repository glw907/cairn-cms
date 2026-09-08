# Why the deterministic net passed the front-door draft

Geoff, 2026-09-08, on the proposed `why-cairn.md`: "The prose in the document is pretty
ugly... weird AI cadence and marketing-speak," and on one heading, "profoundly tortured verbal
rhythm." The draft had passed the register editor at B+, a voice review, and every gate. This
record measures how.

## Measured

- **Vale never ran on it.** The draft lived at
  `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md`, and `.vale.ini`
  gives `docs/internal/**` an empty `BasedOnStyles`. A draft destined for a published path was
  graded as an internal note.
- **Vale graded as the published page finds nothing of the kind.** Copied to
  `docs/why-cairn.tmp.md` and run under the Google package plus the Cairn style: fourteen
  `WordListCase` warnings (all "admin" to "administrator", a false positive on the product
  term, and one "functionality") and one `Google.Quotes` error. No finding touches cadence.
- **`tellgrader` scores it clean.** Section A alone (1,678 words, 96 sentences): zero tells
  per thousand words, one tricolon, cadence coefficient of variation 0.52 (well above the flat
  floor). The scanner's checks are lexical (contrast frames, connector openers, setup-colon,
  the slop lists, scaffold headers) plus one variance statistic, and the draft avoids every
  lexical pattern while carrying the tells Geoff hears.

## The tells the net cannot see

Named from the draft, for the checks that do not yet exist:

1. **Two-headed headings**, "X, and Y" ("The shape, and cairn as one build of it"). Now
   gated: `Cairn.TwoHeadedHeading` (single-comma-and in a heading; serial lists exempt).
2. **Balanced two-beat sentences** as the paragraph's default rhythm: "That worked, and it
   made me the deploy pipeline...", "A save commits to a per-entry branch. A deliberate
   publish copies it...". Each sentence is fine; a paragraph of them is the cadence.
3. **Appositive-comma chains** that suspend the main clause: "They write markdown, the
   plain-text formatting the site's own render function turns into pages, they see the live
   preview that same function produces, and they publish."
4. **Abstract nouns standing in for the concrete thing**: "the shape", "the tie", "the
   treadmill", "one build of it".
5. **Sentence-final cappers** that restate or aphorize: "and there is nothing to do but
   wait", "which is the trade to think about hardest".
6. **Observer voice on the author's own project**: hedges written as if by an auditor ("I
   have not sized that rewrite", "not something I have measured") stacked until the page
   reads as a disclosure document.

## What changes

- **Drafts of published prose are graded at their destination.** A front-door or docs draft
  is written at its destination path on a branch, never under `docs/internal/record`, so Vale
  and the hook run the destination's styles from the first save. The proposal record keeps
  the derivation notes; the prose itself lives where it will ship.
- **The tell scanner learns the cadence class.** Filed to the `writing-voice` skill's
  `tellgrader`: a balanced-pair share per paragraph (sentences of the "X, and Y" shape above a
  threshold), an appositive-chain check (a sentence carrying two or more paired-comma
  insertions between subject and verb), and an abstract-noun stand-in list for the docs
  register. These are register-aware counts, which Vale cannot express; the two-headed
  heading is the one shape Vale could take and now does.
- **The register editor grades against exemplars, not only the rule list.** The
  `cairn-register-editor` dispatch for the front door names four or five human-written
  comparison pages and asks for the measured cadence table beside the verdict; a B+ with no
  exemplar beside it is how this draft passed.
