# AI-tells regrade: `docs/internal/record/2026-09-04-the-cairn-case.md` (v5, 961 lines)

Second read of the same artifact, against my own v4 report
(`docs/internal/record/2026-09-04-cairn-case/10-tells-voice-reviewer.md`) and the register
editor's (`09-tells-register-editor.md`). Same method: square-bracket evidence tags stripped,
tables and headings excluded, code spans and URLs collapsed, cadence variance per derivable
section. Registers as before: front door for the derivable sections and the two "Derivable
form" paragraphs, contributor zone for the rest.

**Headline: the fold is complete.** All four Blockers and all six Warnings are FOLDED, most of
them with the proposed rewrite adopted close to verbatim. The findings below are almost
entirely about what the fold cost, not about what it missed.

---

## Deterministic floor

```
words 10,365   sentences 411   cadence_cv 1.517
slop-hard 7    tricolon 18     exclamation 1     tells/1000w 0.68
```

Unchanged in kind from v4 and still clean. All seven `slop-hard` hits are the token `showcase`
inside the literal path `examples/showcase`; the one exclamation is inside the cited paper title
`"SWE-bench Goes Live!"`. Tricolons fell 20 to 18. No scanner finding is carried as a Blocker.
The scanner's `cadence_cv` is inflated by the evidence tags and is not the number that matters;
the derived profile is below.

---

## 1. Cadence, v4 against v5, measured identically

Both revisions run through one script over the same section boundaries, so the comparison is
apples to apples. CV is population sd over mean. Healthy range for argued technical prose is
roughly 0.5 to 0.8; below about 0.45 the prose starts to hum.

| Section | v4 n | v4 CV | v4 max | v5 n | v5 CV | v5 max |
| --- | --- | --- | --- | --- | --- | --- |
| Traditional setup [D] | 24 | 0.619 | 48 | 26 | 0.603 | 37 |
| Leg 1 [D] | 31 | 0.656 | 65 | 35 | 0.614 | 46 |
| Leg 2 [D] | 33 | 0.511 | 39 | 39 | **0.526** | 37 |
| Why markdown [D] | 12 | 0.380 | 34 | 14 | 0.396 | 30 |
| Leg 3 [D] | 57 | 0.660 | 81 | 71 | **0.469** | 42 |
| Leg 4 [D] | 21 | 0.644 | 54 | 23 | **0.546** | 51 |
| Leg 5 (record) | 27 | 0.838 | 92 | 27 | 0.840 | 92 |
| Case report (record) | 33 | 0.730 | 100 | 34 | 0.619 | 100 |
| Already extensible (record) | 39 | 0.689 | 79 | 39 | 0.596 | 65 |
| Arguing with reviews (record) | 12 | 0.669 | 42 | 12 | 0.672 | 42 |
| Open questions (record) | 32 | 0.684 | 49 | 32 | 0.684 | 49 |
| **DERIVABLE SET** | **178** | **0.621** | **81** | **208** | **0.533** | **51** |
| **WHOLE** | **338** | **0.706** | — | **371** | **0.655** | — |

Derivable set, distribution: sentences of 35 words or more fell from **11% to 5%**; sentences of
12 words or fewer rose from 26% to 30%; the mean fell 21.0 to 18.5; the longest derivable
sentence fell from 81 words to 51.

**The writer's suspicion is confirmed, with a correction to the number.** My method puts the
derivable CV at 0.533 rather than 0.46, but the direction and the cause are exactly as reported:
the semicolon splits did flatten the band. The mechanism is visible in the distribution rather
than the mean. Splitting a 70-word semicolon sentence yields two sentences of 30 and 35, not one
of 8 and one of 60, so the top of the range disappeared and nothing arrived to replace it. The
prose is now a band of medium sentences with the long tail shaved off.

The loss is concentrated, not general. **Leg 3 lost 0.19 (0.660 to 0.469) and is now the lowest
section in the document**; Leg 4 lost 0.10; Leg 1 and the traditional setup each lost about 0.04,
inside noise. Leg 2, the section W1 targeted, went the right way. Runs of three-or-more
consecutive sentences within +/-3 words number two in the whole file (lines 61 and 252-269),
against eight in v4.

---

## 2. Disposition of my v4 Blockers

**B1 (`:384`, Leg 3, setup-colon triad onto three semicolon-separated counterweights) —
FOLDED.** Lines 408-416, my proposed rewrite adopted nearly verbatim:

> Three counterweights are facts rather than judgments. The content is plain markdown files in a
> repository, portable by clone whenever the organization controls the GitHub account that holds
> it. [...] That is real work, and this document does not size it. The engine is MIT-licensed on
> npm.

**B2 (`:143`, Leg 1, setup colon onto five semicolon items plus ordering narration) — FOLDED.**
Lines 150-159 take the register editor's rewrite: "The difference that matters is sign-in."
The "the differentiator first" ordering narration is gone.

**Both are folded structurally, not locally.** A sweep of every colon in the file that opens onto
a two-or-more-item list returns **zero** instances of the killed shape (colon onto three or more
parallel semicolon-separated clauses). The twelve remaining colon-list constructions all open
onto either a single explanatory clause or an enumeration of real named artifacts, which the
register protects. No new instance was introduced.

**B3 (`:192-206`, Leg 2, six consecutive headless noun-phrase fragments) — FOLDED.** Lines
200-214. All six are now finite sentences, and the fix produced something better than the
minimum asked for: a four-beat anaphora that structures the contrast the paragraph exists to
draw.

> A database enforces validation at the store. cairn's fieldset validates in the admin instead,
> so a commit made outside the admin meets only the build's manifest regeneration. A database
> also keeps referential integrity in real time [...] A database reads without a network hop.
> [...] A database can erase.

Anaphora is authorial, not machine, and it earns its repetition here: the paragraph is titled
"What a database gives that files do not," and each beat names one of those things. The
paragraph's cadence is now 27, 18, 14, 7, 22, 4, 19, 15, which is a person varying pressure.
This is the strongest single improvement in the revision.

**B4 (`:47`, `:55`, method-narration labels bound for the front door) — FOLDED, and further than
asked.** "Its advantages, stated as facts", "Its costs, stated as facts", "stated exactly", "in
its true form", "each with its caveat", and "The traditional setup is a steel man" all return
zero hits. Line 44 now opens on its content: "Good teams build this well." Line 110 is "Who the
admin is for."; line 442 is a bare "Claim." The preface's "Nothing here is a pitch" survives,
correctly, with an explicit non-derivation instruction attached at line 16-17.

---

## 3. Disposition of my v4 Warnings

**W1 (Leg 2 flat cadence, CV 0.451) — FOLDED.** Leg 2 rose to 0.526, the run of three
consecutive 28-word sentences at 184/186/188 is broken, and line 192-194 is my proposed rewrite
verbatim: "Write access to content is the GitHub App's private key. The attack surface moved
from a database to a key, and the key has a rotation procedure."

**W2 (three scaffolding paragraphs around the size tables) — FOLDED, all three.** Line 741 takes
my rewrite ("The size ratio has two halves: what one more section costs, and what the developer
never writes."); "The sentence the two halves support: ..." is **deleted outright**; the "What
the ratio says." label is **deleted** and line 821 now opens on the fact. This was the stated
reason for the half-grade I took off the whole document in v4, and it is gone.

**W3 (semicolon load carrying the banned elaborative tail) — FOLDED.** Prose semicolons, tags
and tables excluded, fell from **132 to 84**, a 36% reduction, and the specific targets named
(the four-semicolon sentences at 143 and 785, the three-semicolon sentences at 325, 476, 807)
are all restructured. The outage data at old `:325` became the table I proposed, at lines
351-356. This is the fold that carries the cost; see New tell N1.

**W4 (`:371`, 67-word sentence with a mid-sentence subject shift) — FOLDED.** Lines 396-400,
three sentences, exactly as proposed.

**W5 (`:417`, Leg 4's load-bearing 61-word two-semicolon claim) — FOLDED.** Lines 442-446, my
rewrite verbatim.

**W6 (`:128` / `:362` verbatim repeated sentence) — FOLDED.** Line 386 is the pointer sentence I
proposed: "The support question, above under Leg 1, applies to the platform choice too."

Suggestions: **S2 FOLDED** (both "Derivable form" paragraphs now open differently and in first
person). **S1 PARTIAL** (the first derivable sentence fell from 48 words to 36; still the
section's longest, still fine). **S4 MISSED** (line 634's second consecutive caveat on the same
table survives; record-only, no action). **S5 MISSED** by design; the four abstract triads
survive, and I noted them in v4 only so a fifth would not be added. None was.

---

## 4. New tells the revision introduced

**N1 (Warning) — the band narrowed, and Leg 3 carries most of it.** The numbers are in section 1.
This is not a call to restore semicolons: the register is explicit that the elaborative tail is
the tell regardless of glyph, so the splits were right. The missing move is the other half. A
person arguing in this register occasionally builds a long sentence because the thought has that
shape (subordination, not a tacked-on tail), and occasionally lets one land in five words. Leg 3
now does neither: 71 sentences, longest 42 words, only 4% at 35 or more.

The clearest local instance is the Leg 3 counterweight paragraph, **lines 425-436**, whose five
content sentences run `24, 24, 22, 7, 24` and are built to one pattern (subject, predicate,
`and` clause):

> The scaffold writes the Worker configuration, `wrangler.jsonc` with the `AUTH_DB`, `APP_DB`,
> `EMAIL`, and `MEDIA_BUCKET` bindings, the two migration sets, and the doctor's readiness
> checks. The GitHub App install, the Cloudflare deploy with its databases and bucket, and the
> domain are three guided chapters of `create-cairn-site`, which is pre-release. Workers Builds
> deploys from a push and is an optional later step needing a second token, and `wrangler
> deploy` is the other path.

Rewrite the middle of it so one sentence carries the whole list and the next one stops short:

> The scaffold writes the Worker configuration: `wrangler.jsonc` with its four bindings, the two
> migration sets, and the doctor's readiness checks. Three things it cannot write for you. The
> GitHub App install, the Cloudflare deploy with its databases and bucket, and the domain are
> guided chapters of `create-cairn-site`, which is pre-release, and Workers Builds is an optional
> later step that needs a second, wider token. That list is the developer's whole contact with
> infrastructure.

**N2 (Blocker) — three missing spaces after an evidence tag, all three new in v5, zero in v4.**
Not a register tell in itself, and I am reporting it because of where it sits: all three are at
seams where the fold inserted a sentence after a bracket, and the result renders as visible
splice damage.

- `:160` `...writes or installs each one [opinion].The 28-rule admin audit is a gate...`
- `:416` `...[verifiable: package.json "license"].None of that loosens the tie...`
- `:446` `...docs/extend/add-an-island.md].A page builder stores per-occurrence presentation...`

Each is one character. Fix all three.

**N3 (Warning) — Leg 3's evidence paragraph now carries both the replacement and the material it
was meant to replace.** The revision added the humanized opening (lines 295-302, from the
register editor's finding 7) **on top of** the vendor-number run rather than in place of it, so
the paragraph grew from 13 sentences to 21 and Leg 3 grew from 57 sentences to 71. That is the
arithmetic behind N1's variance loss. The seam reads oddly on its own terms:

> The current limits live on Cloudflare's own pages, which is where they should be read, since
> they move. The record keeps the figures read on 2026-09-04 below. (`:301-303`)

Fifteen sentences of those same limits follow. The bridge sentence licenses it for a record, and
the section's derivability line already says every vendor number becomes a link, so this is
**not** a register break in this file. It is a note for the derivation and for the count: the
spec-sheet run survives intact at `:303-341` in the same noun-verb-number-bracket shape, and it
is 21% of Leg 3's sentences. Nothing derived should carry it.

**N4 (no finding, recorded for the count) — the "X, never Y" habit was traded for ", not Y".**
Appositive `, never` constructions fell to zero; three `, not Y` appositives arrived in their
place, at `:48` ("what these products do, not who sells them"), `:459` ("not from the vendors"),
and `:686` ("its own code, not cairn's"). All three come from the register editor's proposed
rewrites. A trailing corrective appositive is ordinary English and three in 10,400 words is well
inside tolerance; this is a net improvement and needs no action. Recorded only so a later pass
does not add a fourth.

**Categories still clean, and I am not re-reporting them:** em and en dashes zero in 961 lines;
connector openers zero; participial frame openers zero (two gerund subjects, both grammatical);
marketing vocabulary zero true positives across the 54-term sweep; grading words zero; setup-colon
triads zero.

---

## 5. The two "Derivable form" paragraphs: do they read as the person who did the work?

The exemplar is the ratified why-cairn opener: "Before cairn, every content change on the small
sites I run ended up as my git commit. An editor would email me the new schedule or a corrected
paragraph, I'd make the edit, and the deploy would carry it live." It spends eighteen words on a
situation before it gives a fact, and the person is the grammatical subject throughout.

**The first (`:682-689`) mostly does.** It is first person, it is concrete, and every specific
checks against the tables above it (two days, 42 commits, twenty of them layout, eight weeks,
the CSRF defect, the site-owned login and payments). No invented specifics. Two problems.

First, it never lets a sentence land: `36, 25, 30, 24`. There is no short sentence anywhere in
it, and the exemplar's unhurriedness comes precisely from the variation.

Second, and this is the tell a reader will catch, **its last sentence abandons the person it just
established**:

> I am also the engine's author, so this shows what the author can do with his own engine and
> nothing about a second developer.

A person who has just written "I am also the engine's author" does not then write "what the
author can do with his own engine." He writes "what I can do with my own engine." The
third-person relapse in the same sentence as the first-person admission is the seam where the
voice was put on over third-person material rather than written in. Rewrite:

> I am the engine's author too, so read this as what I can do with my own engine. It says nothing
> about a second developer.

**The second (`:844-850`) does not.** It is a table narrated in first person with the person at
the bookends only: "The club site I run" opens it, "I wrote the engine too" closes it, and the
three sentences between have the site as subject and the author nowhere in them. Its lengths are
`21, 17, 17, 26, 19` — nothing under 17, nothing over 26, CV 0.34, **the flattest passage in the
derivable set**. It opens on an aggregate ("about 36,000 lines") where the exemplar opens on a
situation. One further light flag: "on the site's side of the line" is a coined spatial metaphor
doing near-definitional work, which the universal contract discourages.

Rewrite in the exemplar's shape, from facts already in the section:

> I run a club site on cairn. Its membership, events, assets, and email sections are about 36,000
> lines of code I wrote, sitting on about 69,000 engine lines I did not, reached through eleven
> import paths. The member login, the payments, and the personal data are the site's, not the
> engine's. Its screens are built from the engine's toolkit inside the engine's shell, behind the
> same guard the editors use, and the smallest such screen the scaffold ships is 90 lines. I wrote
> the engine too, so read that ratio as one author's site.

---

## Blockers

**BL1. `:160`, `:416`, `:446` — three missing spaces after an evidence tag, all at v5 fold seams
(N2 above).** Mechanical, one character each, and it is the only thing in the file that reads as
assembled rather than written.

No register break and no banned tell is carried forward. This category is otherwise empty.

## Warnings

**WA1. Derivable band narrowed (N1).** CV 0.621 to 0.533, sentences of 35+ words 11% to 5%,
longest 81 to 51. Named target for repair: Leg 3's counterweight paragraph at `:425-436`, with a
rewrite above.

**WA2. `:844-850`, the second "Derivable form" paragraph does not carry the person (section 5).**
Five sentences between 17 and 26 words, first person at the bookends only, opening on an
aggregate. Rewrite above.

**WA3. `:689`, the first "Derivable form" paragraph relapses to third person in the sentence that
claims the first (section 5).** Rewrite above.

## Suggestions

**SU1. `:301-341` (N3).** The humanized opening and the spec-sheet run now sit in one paragraph.
Defensible for a record; flagged so the derivation drops the run rather than compressing it.

**SU2. `:634`.** My v4 S4 survives: a second consecutive caveat on the same table ("A commit here
is one conductor-batched agent change; the counts describe the record's shape and not effort")
after `:625-626` has already said the classification is a judgment. Record-only. Cut one.

**SU3. `:844`, "on the site's side of the line."** Coined spatial metaphor in near-definitional
position. Replace with "are the site's, not the engine's."

---

## Grades

**Derivable sections: A- (was B).**
Every cadence the register kills by name is gone from the text bound for the front door: no
setup-colon list survives anywhere in the file, the six headless fragments became a genuine
anaphoric argument, the method-narration labels return zero hits, and em dashes, connector
openers, and marketing vocabulary remain at zero; what holds it below A is that the fix cost
variance rather than adding it, leaving Leg 3 at 0.469, the whole derivable band at 0.533, and
the second derivable-form paragraph humming at five sentences between 17 and 26 words.

**Whole document: A- (was B+).**
The three scaffolding paragraphs around the size tables, which were the entire stated reason for
v4's half-grade, are rewritten or deleted, so the record now argues from its tables instead of
announcing them, and the record sections keep the file's best cadence; the grade stops short of A
because the same semicolon reduction narrowed the record's band too (0.706 to 0.655) and left
three visible splice defects at the fold seams.

---

## Verdict

Yes. This reads as written by the register's plausible human author, and after this fold the only
passage a careful reader would still call machine-shaped is the second "Derivable form" paragraph
at `:844-850`, which is the one place where the person is asserted rather than heard.
