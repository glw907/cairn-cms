Write is disabled and I do not author report files, so the full report is inline.

---

# Register review: `2026-09-04-the-cairn-case.md` (v9b, 1,413 lines)

Earlier round banked at `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-04-cairn-case/09-tells-register-editor.md` (v4, 937 lines). Exemplars in ear: `/var/home/glw907/Projects/cairn-cms/docs/why-cairn.md`'s ratified opener and the front-door section of `/var/home/glw907/Projects/cairn-cms/docs/internal/docs-register.md`; internal sections graded against the contributor zone.

**A count correction before the findings.** The brief says seven sections carry `Front door: derivable`. I find six (lines 46, 91, 154, 198, 282, 407), plus two sections marked `internal record only` that carry a derivable paragraph at the end (450, 739). If the seventh is `### Why markdown` (253), it inherits Leg 2's line rather than carrying its own, and a derivation pass will not see it. Worth fixing in the section header.

---

## 1. The 49 short sentences added to break runs are inserted filler, and the notes say so in writing (notes `[^342]`–`[^390]`, throughout)

This is the finding that governs the rest. Every cadence-breaking short sentence added since v4 carries a note in the 342–390 block, and reading that block end to end (lines 1365–1413) is the confession:

> `[^342]: Verifiable: restates the preceding sentence's note.`
> `[^344]: Verifiable: restates the preceding sentence's note.`
> `[^348]: Verifiable: restates the preceding sentence's note.` … (23 of them)

Twenty-three of the 49 are self-declared restatements. The other 26 are tagged `Opinion: a judgment, not a checkable fact` and are bare gnomes with nothing behind them. So: **none of the 49 adds a fact, and the document's own apparatus records that none does.**

Three consequences, each independently disqualifying:

- **The document breaks its own fourth rule.** The preface (23–26) states four tag kinds and says "A sentence that could earn no tag was cut." "Restates the preceding sentence's note" is a fifth kind, invented to license sentences that could earn none of the four. Delete the sentences and the fifth kind disappears with them.
- **It degrades the `[opinion]` signal the preface built.** Line 26: "The fourth tag exists so that `[^6]` marks only judgments." Twenty-six throwaway beats now wear the judgment tag, so a checker counting judgments in Leg 3 finds "Deleted is deleted." beside "whether one account is less work is untested."
- **The worst specimen is a verbatim self-echo.** Line 156: `The shape has four parts[^348]. The shape has four parts: content as markdown in the organization's own git repository; …` The inserted sentence announces the count and the real sentence repeats the same five words. In a derivable section.

Others in the same shape, all derivable, all restating the clause immediately before them:

| Line | Inserted sentence | The clause it restates |
| --- | --- | --- |
| 233 | "The corpus has a ceiling." | "…so a content corpus has a ceiling a database does not" |
| 236 | "This model is a niche." | "The category is small" |
| 246 | "The content stays readable." | "leaves the content readable" |
| 300 | "TLS is on every plan." | "…on every plan" (nine words earlier) |
| 299 | "Every plan gets that edge." | "the same one the free plan gives every zone" |
| 355 | "Sign-in rides on it." | "sign-in depends on it" (same sentence) |
| 359 | "That is the ceiling." | "caps at 10 GB" |
| 384 | "The rewrite is unsized." | "This document does not size that rewrite" |

**Proposed rewrite:** delete all 49 and their notes. Where the paragraph then reads as a run, get variance the way a person does, by splitting a compound into two sentences of unequal length. Worked example, lines 59–64:

> The membership product supplies event registration with payment, recurring dues with renewals and reminders, invoices and receipts, a member directory, and bulk email with subscription state and unsubscribe handling [^13]. All of it is configuration, and a volunteer sets it up without a developer [^13]. The CMS supplies a visual editor a volunteer already knows, a theme and plugin market, and people who can be hired to work on it [^14]. Each part can be replaced on its own, each vendor carries a support contract, and the payments provider arrives already integrated with dues and renewals [^15][^16].

That is 30 / 14 / 27 / 26 words with no filler, and it deletes "The volunteer needs no developer." (61), "Someone answers the phone." (63), and "The costs are as real." (64) — the last of which is also announcement scaffolding for the paragraph below it.

## 2. The cadence statistic is confirmed and it is manufactured (measured, two derivable sections)

I measured word counts per sentence with note markers stripped, tables and headings excluded.

- **The traditional setup (48–87), n=29:** mean 17.5, sd 11.80, **CV 0.673**.
- **Leg 4 (409–446), n=30:** mean 16.1, sd 9.82, **CV 0.611**.

The writer's claim ("every derivable section at 0.609 or above") holds as arithmetic. It does not hold as prose. Remove only the inserted sentences from finding 1 and nothing else:

- Traditional setup, minus five inserts: n=24, mean 20.1, sd 11.40, **CV 0.567**.
- Leg 4, minus two inserts: n=28, mean 16.8, sd 9.74, **CV 0.579**.

Both fall under the bar. Leg 4's 0.611 against a stated floor of 0.609 is a 0.3% margin, which is the signature of writing to a metric rather than measuring finished prose. **The underlying sentences did not change shape between v4 and v9b; a metronome was laid over them.** Leg 4's variance also leans hard on one 47-word outlier (the Classic Editor sentence, 431–435); drop that single sentence and the section's CV falls to roughly 0.53 even with the inserts in.

Recommendation: stop reporting CV. It is now measuring the filler, and any future pass that optimizes it will add more.

## 3. Two corrupted footnote conversions leak raw grep commands into body prose (80–81, 580–581)

Line 80–81, inside the first derivable section, mid-sentence:

> …starting at `v0.24.0` [^23]+\.[0-9]+\.[0-9]+' CHANGELOG.md`; `git tag | grep -E '^v0\.(2[2-9]|[3-9][0-9])\.[0-9]+$' | wc -l`; `v0.96.0` dated 2026-08-22].

Line 580–581, same shape:

> …during the measured window [^246]`, 10 under the author's full name); the site's CLAUDE.md:255 (`glw907/aksailingclub-org`); cairn-cms src/lib/admin-toolkit/index.ts:8-11].

The v4 inline tag bodies were split at the first `[0-9` bracket during the conversion to footnotes, dumping their remainder into the paragraph and truncating the notes. Note `[^23]` (line 1046) is correspondingly broken: `Verifiable: \`grep -cE '^## [0-9. Supports: 87, …`. **Rewrite:** end line 80 at "starting at `v0.24.0` [^23]." and restore the full command list into note `[^23]`; same for `[^246]`. This is the highest-severity mechanical defect in the file and one of the two occurrences sits in derivable prose.

## 4. Untagged factual sentences, which the preface forbids

The preface says every factual sentence ends in a tag and untaggable sentences were cut. These carry none:

- **74** "Patchstack sells a competing security product." (a checkable fact about a named vendor, load-bearing for the paragraph's honesty)
- **110** "Members are a different case."
- **222** "A database enforces validation at the store."
- **419** "The lock-in claim is strongest for proprietary builder structures." / **421** "It is weakest for core block markup."
- **344** "When the network fails globally, a cairn site fails with it."
- **703** "An agent follows the exemplar."

Some are structural transitions and legitimately untaggable; the rule as written does not admit that class. Either add a sixth kind for a transition sentence and say so in the preface, or tag them. **74 must be tagged regardless** — it is a competitor-motive claim doing real work.

## 5. Capper cadence: the aphoristic equation, six times in derivable prose

The inserts did not just restate; several are crafted. Family: crafted pivots and cappers, aphoristic equations.

- **206** "Publish means live."
- **229** "Git has no `DELETE`."
- **257** "Plain text stays plain."
- **362** "Deleted is deleted."
- **764** "Four products, one app." — the "one engine, two templates" shape by name.
- **277** "The prose travels. The rest does not." — a two-beat balanced-halves closer, the family Geoff catches most.
- **690** "Every gate passed. The reviewer did not." — the most crafted line in the document, and it is an insert (`[^368]`).

**Rewrite:** delete all seven. Where the point is load-bearing, it is already in the preceding sentence: 277's content is "another markdown tool renders the prose and none of the components" (275–276), stated better.

## 6. A run of three-to-five-word gnomes, by line

Named runs, so the writer can see the metronome:

- **61–64**: 5 / 13 / 4 / 11 / 5 words, fact-gnome-fact-gnome.
- **203–206**: "Every save is a commit." (203), "Editors never see git." (205), "Publish means live." (206) — three sentences of ≤5 words in four lines.
- **299–300**: two 5-word inserts eighteen words apart, both restating "every plan."
- **355–362**: "Sign-in rides on it." (355), "That is the ceiling." (359), "Deleted is deleted." (362) — three 3-to-4-word gnomes in eight lines.
- **379–384**: "Nothing hides that." (379), "The rewrite is unsized." (384).

Against Geoff's baseline (unhurried 25–40-word compounds, a punch about once per section) this is noir overcorrection at roughly one punch per paragraph.

## 7. The spec-sheet run survives, shortened (300–310)

Seven consecutive sentences of one shape — [Cloudflare product] + verb + spec + number:

> DDoS protection is "standard, unmetered"… The free WAF carries… Requests for static assets are "free and unlimited"… Workers Logs turn on with one config line… Workers Builds deploys on push with 3,000 build minutes… The registrar charges registry cost with no markup. The bill is $5 a month…

v4's thirteen-sentence run at 284–320 is down to seven, which is real improvement, but the derivability line at 282–283 already commits every vendor number to a link. The derived form should be cairn's reasoning with the numbers behind links, as proposed in the v4 round. The register's vendor rule (`docs-register.md`, "A vendor's specifics get a link, never a copy") makes this mandatory, not stylistic, and lines 305–310 currently restate seven vendor specifics that move on Cloudflare's schedule.

## 8. The four-item inventory repeated verbatim across two derivable sections (144–147 and 163–165)

> **144–147:** "Past that, cairn brings the holding-branch publish path, the admin shell and its primitives, the snapshot gate that keeps the seams from moving, and the agent skill [^53], and a developer assembling the same thing writes or installs each one [^54]."
> **163–165:** "…the magic-link editor login with no third service in the sign-in path, the holding-branch publish path, the admin shell and its primitives, the snapshot gate, and the agent skill [^61]."

Twenty lines apart, same list, and 163 cross-references Leg 1 by a heading name ("The developer's other option") that does not exist in the document — Leg 1's paragraph at 136 has no such heading. Two derived pages taking these sections separately will ship the inventory twice.

**Rewrite for 163–165:** "What cairn ships that such a build writes or installs itself is the list Leg 1 carries [^61]." Let the cross-reference do the work.

## 9. "a gift," and the two ventriloquized beats in the traditional setup

- **147–149** "The 28-rule admin audit is a gate over screens the developer designs, which a designer reads as a reviewer of their work as well as a gift [^55]. It grades their work[^375]." — "as well as a gift" is selling posture in a derivable section, and the insert then restates the first half. **Rewrite:** "The 28-rule admin audit is a gate over screens the developer designs, so a designer meets it as a reviewer of their own work [^55]."
- **61, 63** "The volunteer needs no developer." / "Someone answers the phone." — the section's job is to state the traditional setup at its strongest **in the same voice as cairn** (preface, 20–21). These two are voiced differently from every sentence around them, and "Someone answers the phone" is a folksy shortform beat that reads, in context, as ventriloquism edging toward sarcasm. Delete both; the facts are in 60 and 62.

## 10. Bolded lead phrases with the same appositive tail, seven times (Leg 5, internal)

**458** "What cairn carries, scoped to the charter." / **475** "What the general studies test, and what they do not." / **552** "What cairn ships for an agent, as artifacts." / **612** "The later commits, classified." / **720** "Whole-system delivery, the regime the studies do not measure." / **785** "The increment, per section." / **808** "What the developer would otherwise install or write elsewhere."

Run-in heads are legitimate record apparatus. Seven with the identical noun-phrase-comma-qualifier shape is a machine skeleton, the same finding as v4's five-beat leg skeleton, relocated. Internal only, so low severity — but nothing derived may carry the shape, and **720**'s "the regime the studies do not measure" pairs with **475**'s "and what they do not" as an echoed frame.

## 11. Hedging stacks and a contrast frame (734–735, 497–498, 639–641; internal)

> **734–735** "The absence of this regime in the literature is a lag, not a contradiction, and this document claims it only as far as these measurements carry it [^289]."

"not X but Y" frame plus a hedge tail in one sentence. **Rewrite:** "No literature covers this regime yet. This document claims it only as far as these measurements carry it [^289]."

## 12. Logic and truth-adjacent, carried forward

- **82** "The phrase 'Consumers must' appears 202 times in that changelog [^24]." Unchanged from v4 and still a true count doing argumentative work it cannot carry: no denominator, and the honest answer (a pinned site keeps serving) arrives at 86. For the claims checker.
- **139–143** The Keystatic and Decap sign-in comparison, my v4 rewrite, is now load-bearing on the derivable page. v4 flagged those two vendor doc pages as unfetched. If they are still unfetched, the differentiator sentence rests on unread sources.
- **916–920** carries a numbered list that runs inline inside item 1's paragraph ("This document decides none of them. 2. **Claims judged too weak…**"). A markdown numbering failure, not prose, but it makes the open-questions section unreadable from item 2 to item 7.

---

## What moved since v4

Real, and worth stating plainly. Fixed outright: the balanced-halves antithesis at old 340 (now factual at 344–345); the setup-colon five-item inventory at old 145–151 (now the sign-in paragraph at 139–143, my proposed rewrite adopted); both `Derivable form` comma-chains (662–669 and 875–881 are now first-person, short-sentenced, and carry the author disclosure — these are the best prose in the document and read as a person); the "stated as facts" virtue labels; the self-admiring meta at old 346; the heading-versus-body overclaim at old 268; the verbatim duplication at old 128/361, now a cross-reference at 374; the posture tail "cairn ships none of them, on purpose"; "### And why markdown"; the house term "partition"; and "X, never Y," which has dropped from roughly twenty instances to a handful where the negation is load-bearing. Footnotes are genuinely less intrusive than the old inline tags, and no note carries prose that belongs in the body — the leakage runs the other way (finding 3).

## Grades

| | v4 | v9b |
| --- | --- | --- |
| Prose, derivable sections | C− | **B−** |
| Prose, whole document | C+ | **B** |

The derivable sections gained a full step on argument and lost part of it back on cadence. The whole document gains more, because the record's apparatus (the tables, the case report, the classified commits, the vocabulary map) is genuinely strong engineer-to-engineer writing and the 49 inserts are proportionally a smaller share of it.

## Verdict

The derivable sections now read as a person's argument in two places and as an instrument everywhere else, and the instrument has acquired a tic it did not have in v4. The argument itself is better: the concessions are real, the numbers carry their methods, the author disclosure at 577–583 and 880 is the kind of honesty a developer-peer reader will trust immediately, and the two `Derivable form` paragraphs are exactly the ratified front-door voice. But 49 sentences were added to move a statistic, 23 of them declare in their own notes that they restate the sentence before, and their removal drops both sections I measured below the variance floor they were added to clear. A reader does not hear variance; a reader hears a person saying "The shape has four parts. The shape has four parts:" and stops trusting the page. **The single change that would move the draft most: delete every sentence whose note is `[^342]`–`[^390]`, restore the two corrupted footnote conversions at 80–81 and 580–581, and stop measuring CV.** If a section then reads as a run, split one of its 35-word compounds into two unequal sentences; that is where a human's variance comes from, and it costs no facts.

---

**Five-line summary**

1. Write is disabled; the ranked report is inline above. I count six sections carrying `Front door: derivable`, not seven — please confirm which is the seventh.
2. The 49 cadence-breaking short sentences (notes `[^342]`–`[^390]`) are inserted filler: 23 notes read "restates the preceding sentence's note" and the other 26 are bare opinions, so the document invented a fifth tag kind to license sentences its own fourth rule would have cut.
3. Cadence measured and confirmed as arithmetic, refuted as prose: traditional setup CV 0.673, Leg 4 CV 0.611 (against a stated floor of 0.609); strip only the inserts and they fall to 0.567 and 0.579, which means the variance is the metronome, not the writing.
4. Two corrupted footnote conversions dump raw grep commands into body prose at 80–81 (derivable) and 580–581 and truncate notes `[^23]` and `[^246]`; capper gnomes ("Deleted is deleted.", "Four products, one app.", "The prose travels. The rest does not.") cluster in named runs at 61–64, 203–206, 299–300, 355–362, 379–384; the seven-sentence Cloudflare spec-sheet run persists at 300–310 against the register's vendor-link rule.
5. Grades: derivable prose B− (from C−), whole document B (from C+); v4's worst tells are genuinely gone and the two first-person `Derivable form` paragraphs read as a person, but the fix for cadence became a new tell, and deleting the 49 inserts is the one change that moves the draft most.