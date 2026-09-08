# Proposal review, lens 4: fit to the readers' needs

Adversarial review of `docs-standard-proposal.md` revision 1 (Opus, fresh context, 2026-09-08), with reference and why-page specimens fetched and measured. Folded into revision 2.

---

## Method

Measured with one script over all specimens: markdown/HTML stripped, fenced code and tables dropped, inline `<code>`/backticks counted as one word, list items counted as separate sentences. Same script over cairn's corpus and the fetched pages, so the numbers are comparable to each other (not necessarily to the proposal's own script).

### Measured sentence length, reference and "why" specimens

| Page | n | avg | max | >40w | >25w | >20w | <8w |
|---|---|---|---|---|---|---|---|
| PostgreSQL `INSERT` (postgresql.org/docs/current/sql-insert.html) | 151 | **16.0→17.3** | 42 | 1% | 19% | 30% | 12% |
| MDN `Window.fetch()` | 40 | **15.0** | 39 | 0% | 15% | 25% | 18% |
| Rust Reference, Method-call expressions | 33 | **18.2** | 38 | 0% | 24% | 42% | 15% |
| Rust Reference, Destructors | 135 | **12.3** | 38 | 0% | 7% | 13% | 36% |
| SQLite, Appropriate Uses (whentouse.html) | 127 | **18.4** | **61** | 2% | 24% | 38% | 16% |
| htmx, When to use hypermedia | 108 | **20.2** | 42 | 2% | 31% | 48% | 18% |
| Tailwind, Styling with utility classes | 117 | **18.2** | 51 | 2% | 26% | 44% | 24% |
| Raft paper, §1 Introduction | 12 | **20.2** | 39 | 0% | 17% | — | — |

### cairn's corpus, same script

| Track | pages | n | avg | max | >40w | >25w | >20w |
|---|---|---|---|---|---|---|---|
| `docs/editors/` | 8 | 392 | **16.1** | 49 | 1% | 14% | 27% |
| `docs/admin/` | 9 | 441 | **20.1** | 68 | 5% | 27% | 42% |
| `docs/extend/` | 31 | 1345 | **23.5** | 98 | 11% | 38% | 54% |
| `docs/reference/` | 25 | 2359 | **21.8** | **151** | 10% | 33% | 46% |
| `docs/why-cairn.md` | 1 | 45 | **22.5** | 47 | 9% | 36% | 53% |
| root `README.md` | 1 | 32 | **18.3** | 55 | 9% | 25% | 34% |

Pages whose average exceeds 20 words: extend 26/31, reference 14/25, admin 5/9, editors 0/8.

---

## Per-reader verdicts

### 1. The front-door evaluator (seasoned developer) — MOSTLY FITS; one real conflict, and the register loses the argument it is assumed to win

The register's ruling: "The voice is technical and academic (Geoff, 2026-09-08)... measured, precise, with qualification carried inside the sentence rather than split off... the cadence to match is theirs: longer sentences than a blog, fewer of them, each carrying one qualified claim." Its named comparison set includes "SQLite's 'Appropriate uses' page" and "a systems paper's introduction."

The proposal: "Keep the average sentence between 15 and 20 words. Let no sentence pass 40" and "Put one idea in each sentence."

The presumed conflict on the **average** does not survive measurement. SQLite's `whentouse.html` averages **18.4** words. The Raft introduction averages **20.2**. htmx's essay **20.2**. Every specimen the register itself names sits at or inside the proposed band. `why-cairn.md` averages **22.5** and puts 9% of its sentences over 40 words, which is longer than every specimen the register grades it against. The "technical and academic" ruling does not license the current front-door cadence; it is being used to defend prose the specimens do not support.

The conflict on the **ceiling** is real. SQLite's most analytically load-bearing sentence on that page is 61 words: "For programs that have a lot of data that must be sifted and sorted in diverse ways, it is often easier and quicker to load the data into an in-memory SQLite database and use queries with joins and ORDER BY clauses to extract the data in the form and order needed rather than to try to code the same operations manually." Tailwind runs to 51, htmx and PostgreSQL to 42. All four sit at 1-2% of sentences. A hard 40-word ceiling is a rule that every specimen in the comparison set violates.

The conflict on **"one idea in each sentence"** is direct and unhedged. The register wants "qualification carried inside the sentence rather than split off." FPLG wants exactly the split: "Resist the temptation to put everything in one sentence; break up your idea into its parts and make each one the subject of its own sentence." These cannot both govern the front door.

The conflict on **"Use everyday words. Where a technical term is needed, define it the first time"** hits the register's "Product terms are the precise vocabulary, not jargon to remove. They name real system objects," the extend contract's "Nothing is banned; imprecision is," and the front-door legibility floor, which already resolves this better: "Technical terms appear where they carry information (SvelteKit, git-backed, markdown, npm dependency), with context or a short apposition doing the glossing rather than avoidance."

**Which yields where.** The average band binds; the register does not get to claim a 22.5-word average from specimens averaging 18.4. The ceiling yields to a specimen-derived allowance. "One idea per sentence" yields to the register at the front door and nowhere else. "Everyday words / define on first use" yields to the track vocabulary contracts, which are more precise than the FPLG rule.

### 2. The reference reader — FITS, and the worry is backwards

The concern was that a 40-word ceiling damages contract prose. Measured, the opposite: PostgreSQL puts **1%** of `INSERT`'s sentences over 40, MDN **0%**, the Rust Reference **0%** on both pages. cairn's reference track puts **10%** over 40, with a 151-word maximum. The world's most respected reference prose already writes inside the ceiling the proposal wants to impose. cairn does not.

The longest cairn reference sentence, `docs/reference/sveltekit.md`, is a numbered list crammed into one sentence: "In order, fail-closed at every step: (1) `locals.cairnEditor` must be populated, else a redirect to ...; (2) a valid ... header clears this step outright ...". Ordered conditions are the case the ceiling handles best, by forcing the list the content already is. Same shape at `docs/reference/media.md` (101w), `docs/reference/auth-crypto.md` (95w), `docs/extend/auth-channel-security-model.md` (97w).

Two caveats the proposal must carry:

- **The gate is gameable and the proposal built the loophole in.** Its own measurement table says "The second column drops the list items, which the standard wants short." A page can clear the ceiling by bulleting fragments the gate then declines to count. Note also that ASD-STE100, the source of the instructional ceilings, pairs its ceiling with two rules the proposal drops: "Use vertical lists for complex text" *and* "Do not omit parts of the sentence (e.g. verb, subject, article) to make the text shorter." Adopt the pair or the number produces telegraphic fragments.
- **Cost.** The 15-to-20 average would require rewriting 14 of 25 reference pages and 26 of 31 extend pages. Reference prose is gated for signatures (`check:reference:signatures`) but not for accuracy of the surrounding narrative, so a cadence-driven rewrite of failure-mode prose has no gate catching a meaning change. That is a sequencing risk, not an argument against the ceiling.

### 3. Editors and operators — CONFLICTS as written; the diagnosis is wrong and the gate is unimplementable

**The claim that motivates the whole proposal is false for this track.** The proposal says: "No gate saw any of this, because no gate we run has a rule about sentences or paragraphs." `.vale/styles/Microsoft/SentenceLength.yml` exists in this repo today:

```
extends: occurrence
message: "Try to keep sentences short (< 30 words)."
scope: sentence
level: suggestion
max: 30
```

It runs on `docs/editors/**` per `.vale.ini`, and `vale docs/editors/write-in-the-editor.md` fires it **11 times right now**. The gate was there and was reporting. What failed was the alert level, not the standard. Adopting a second prose standard does not fix a `level: suggestion`.

**The STE numbers are correctly quoted** (ASD-STE100: "no more than 20 words in instructions (procedures) and 25 words in descriptive texts"), but the proposal applies them without saying which sentence gets which. "The admin and editors tracks adopt those two numbers" is not implementable as a Vale rule: `scope: sentence` has no classifier for instruction versus description. Someone or something has to decide per sentence, and the proposal does not say who.

**Are the ceilings right?** For editors, roughly, and cheaply: the track already averages 16.1 with 14% over 25. For admin, the numbers are wrong as stated: the track averages 20.1 with **27% over 25** and a 68-word maximum, so the descriptive ceiling alone condemns a quarter of the track, and the instruction ceiling would condemn 42%. `docs/admin/setup-recovery.md` (22.7), `troubleshooting.md` (21.7), and `own-your-domain.md` (21.7) all average over the entire proposed band.

**Does plain language add anything Microsoft does not hold?** For the editors track, almost nothing. Microsoft already carries second person, everyday words, active voice, contractions, and a sentence-length rule. FPLG adds only the numbers, and the numbers are not FPLG's (see the accuracy finding below). Adopting a second standard for a track whose guide already covers it buys drift, not clarity.

**Resolution:** raise `Microsoft.SentenceLength` to `error` with `max: 25` for `docs/editors/**` and `docs/admin/**`, and drop the 20-word instruction ceiling unless someone specifies the classifier. That is a one-line `.vale.ini` change against a rule already vendored and pinned.

### 4. The evaluator's actual wants — IRRELEVANT; the standard addresses the wrong variable

Practitioner evidence says the evaluator judges on content, not cadence:

- "This just reads like marketing speak. What are the *disadvantages* of RethinkDB?" (alexpopescu, news.ycombinator.com/item?id=5146852)
- "Not mentioned: RethinkDB doesn't yet support secondary and compound indexes, which is a dealbreaker for a lot of setups" (jcdavis, item?id=5147407)
- "A solid quality test for good articles: are authors honest about the limitations?" (enviclash, item?id=32290418)
- On SQLite's own `whentouse.html`: "It is very clear and to the point about its good use cases while being clear where an alternative would be a better choice." (allyjweir, item?id=16356942)
- The failure mode is content-shaped, not length-shaped: "the least informative landing page I've seen yet. Vague marketing woo, giant hero images... and zero screenshots." (pona-a, item?id=44514745)

Not one of these is a sentence-length complaint. What earns the evaluator is the named limit with a concrete boundary: SQLite's "For device-local storage with low writer concurrency and less than a terabyte of content"; htmx's first-class "don't use this if" section. `docs/why-cairn.md` already does this, in "The honest trade-offs," with six named limits and specifics like "a seam that moved across two separate minor releases already, inside the tier meant to stay frozen."

**The risk plain language poses here is real but narrow.** A rewrite driven by a word count will attack exactly the qualified, specific sentences that make a trade-off credible, because those are the long ones. Two of `why-cairn.md`'s three longest sentences are the extensibility claim and the GitHub-choice reasoning, both of which carry the specificity that buys trust. The mitigation is a content gate, not a cadence exemption: every trade-off names a concrete boundary, and the pass reviews limits before it reviews length.

### 5. Small-organization owners — SERVED INDIRECTLY; not a separate reader, and the proposal's docs-pass ordering ignores them

The owner is a product target, not a docs track. The audience profiles place them inside two existing profiles: the admin is "Often the organization's most technical volunteer **or its owner**," and the editor skill band spans "a college student, a retiree, an executive director." The brief's "the audience is frequently a small organization where cost is critical" is a product fact that lands in `admin/before-you-start.md#what-it-costs`, which already exists. Nothing in the proposal needs an owner track, and it should not invent one.

But the owner-carrying tracks are ordered last. The proposal says: "The extend track goes first, because its readers are the developers whose respect the docs need most." That justification is the register's respect argument doing work it cannot support (see §6), and it demotes the two tracks the product's own target actually reads. The ordering happens to be right by measurement (extend is the worst track at 23.5 average and 11% over 40), so keep the order and replace the reason: worst-first by measured distance from the band, which the proposal already states one sentence earlier.

### 6. Accessibility and non-native readers — FITS; the "respect" conflict is a documented myth

Plain language helps, with standards backing:

- W3C COGA, "Making Content Usable," §4.4.5: "Keep paragraphs short. Have only one topic in each paragraph... Use short sentences. Have only one point per sentence. Use bulleted or numbered lists." §4.4.3 is "Avoid Double Negatives or Nested Clauses," which is the comma-hinged pair by another name. §4.4.9 is "Separate Each Instruction," which is the STE instruction ceiling's real justification.
- WCAG 2.2 SC 3.1.5 Reading Level is **Level AAA**, and is satisfiable by a supplemental version rather than a rewrite: "supplemental content, or a version that does not require reading ability more advanced than the lower secondary education level, is available." cairn is under no conformance obligation here. Adopting plain language is a quality choice, and the proposal should say so rather than imply a requirement.
- Non-native readers: ASD-STE100's stated benefits include "improve comprehension for people whose first language is not English." That is the strongest single argument for the STE ceilings on the editors track, and the proposal does not make it.

**The respect persona.** The register says "jargon-stripped prose would cost the tool their respect." Nielsen Norman Group, "Plain Language Is for Everyone, Even Experts" (nngroup.com/articles/plain-language-experts/): "A common misguided objection I hear about plain language is that it dumbs down content and thus insults intelligent readers. This complaint is often loudest among authors who write for skilled professionals and academics... The misconceived notion that long sentences and big words make you sound smarter (or more professional) results in great sacrifices to readability and credibility." And from their study: "in our recent usability study with domain experts in science, technology, and medical fields, we discovered that even highly educated online readers crave succinct information that is easy to scan, just like everyone else."

The register's sentence conflates two separable claims. **Vocabulary**: correct, and the register's own legibility floor already states it well. **Cadence**: unsupported, and contradicted by both the research and the register's own specimens. Split the bullet.

---

## Conflicts the proposal must resolve

| # | Conflict | Proposed resolution |
|---|---|---|
| 1 | Hard 40-word ceiling vs the register's named specimens (SQLite 61w, Tailwind 51w, htmx 42w, pg 42w) | Replace the hard ceiling with a per-page allowance derived from the specimens: no page puts more than 2% of its sentences over 40, and no sentence passes 65. Keeps the 151-word and 98-word cairn sentences failing while leaving SQLite's page compliant. |
| 2 | FPLG "Put one idea in each sentence" vs register "qualification carried inside the sentence rather than split off" | Restate as "one claim per sentence; its qualification may ride with it." Front door and extend take the claim form; editors and admin take FPLG's literal form, matching COGA §4.4.9. |
| 3 | "Use everyday words... define it the first time" vs the four vocabulary contracts and "Product terms are the precise vocabulary, not jargon to remove" | Delete the rule. The track vocabulary contracts already discharge it, per-reader, and better. |
| 4 | "Address the reader as 'you'" vs reference's "Dry contract prose, third person" | The proposal's "where the track allows it" is too vague to gate. Name it: second person in editors, admin, extend; third person in reference. |
| 5 | "No gate we run has a rule about sentences" vs `Microsoft.SentenceLength` (max 30, level suggestion), firing 11 times on one editors page today | Correct the premise. Fix the level and the max on the existing rule before importing a second standard. State plainly that the failure was a suppressed finding, not a missing one. |
| 6 | STE 20/25 split is unimplementable as a lint rule (no instruction-vs-description classifier) | Adopt one number per track (25 for admin and editors) or state who classifies each sentence and how the gate reads that classification. |
| 7 | STE ceiling adopted without its two companion rules ("use vertical lists for complex text"; "do not omit parts of the sentence to make the text shorter") | Adopt both, or the ceiling produces fragments. Also close the loophole: the measurement excludes list items, so the gate cannot see what the ceiling pushes into lists. |
| 8 | "Their rules have numbers, which is what makes them enforceable" — FPLG carries neither number | The archived FPLG "Write short sentences" page says only "Express only one idea in each sentence." A grep of the full 2011 guidelines PDF finds no average and no ceiling; the only sentence-scale figures are paragraph guidance ("no more than 150 words in three to eight sentences"). Own the numbers as cairn's own, evidenced against the measured specimen corpus. The register's deviation rule demands evidence, and "FPLG says so" is not available here. |
| 9 | "published, free, and stable since 2011" | plainlanguage.gov now 301-redirects to digital.gov, which states: "This content is adapted from PlainLanguage.gov. Selections... have been carried forward... All of the original content from the PlainLanguage.gov website is archived in the PlainLanguage.gov GitHub repository." The canonical source has been retired to an archive. Cite the archive explicitly or pick a maintained authority. |
| 10 | Docs-pass ordering justified by "the developers whose respect the docs need most," which also demotes the owner-carrying tracks | Keep extend first; justify it by measured distance from the band (extend 23.5 avg, 11% over 40), which the proposal already states. Drop the respect argument, per §6. |
| 11 | Register bullet "jargon-stripped prose would cost the tool their respect" vs NN/g expert-reader study | Split the bullet into a vocabulary rule (keep the precise terms) and a cadence rule (no license for long sentences), and cite the study where the cadence half now sits. |
| 12 | No gate protects the content that actually wins the evaluator | Add a front-door content check to the docs pass: every trade-off names a concrete boundary, and the reviewer reports the count of named limits alongside the cadence table. |

---

## Verdict

Measured against real specimens, the proposal is right about the developer tracks and wrong about why: PostgreSQL, MDN, and the Rust Reference already write at 12 to 18 words average with 0 to 1 percent of sentences over 40, while cairn's extend and reference tracks run 23.5 and 21.8 with 10 to 11 percent over 40 and single sentences reaching 151 words, so the ceiling would repair the reference rather than damage it. The front-door conflict is narrower than assumed and cuts against the register on the point it was invoked to defend, since SQLite's "Appropriate Uses," the Raft introduction, and htmx's essay all average 18 to 20 words while `why-cairn.md` averages 22.5, though the hard 40-word ceiling, "one idea per sentence," and "use everyday words" each genuinely conflict with the front-door and vocabulary contracts and must yield in the ways tabled above. The editors and admin case is the weakest part of the proposal, because the sentence gate it says does not exist has been vendored and firing at suggestion level all along, and the fix there is a level and a max on `Microsoft.SentenceLength`, not a second prose standard whose two headline numbers do not appear anywhere in the standard it names.
