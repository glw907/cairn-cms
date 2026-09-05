# Final review, axis two: STRUCTURE, with cadence measured

`docs/internal/record/2026-09-04-the-cairn-case.md` (v9b, 1,413 lines, prose plus 390 numbered notes)

Third read of this artifact by the same reviewer. Banked prior rounds:
`docs/internal/record/2026-09-04-cairn-case/10-tells-voice-reviewer.md` (v4) and
`11-tells-voice-reviewer-v5.md` (v5). Same method throughout: note markers stripped, tables,
headings, and the `Front door:` lines excluded, code spans and URLs collapsed, sentence length in
words, CV as population sd over mean. Registers as before: front door for the sections marked
"Front door: derivable", contributor zone for the rest.

**Headline.** The argument's skeleton is the best it has been. The apparatus that v9b was
restructured to build is not working: the notes channel is out of document order at 49 points, its
`Supports:` field is misattributed across the run covering the document's headline size table, two
notes are truncated mid-command with their tails spilled into the running prose, and the preface's
key to the whole tag system was destroyed by the conversion. Separately, the reported cadence gain
is an artifact: strip the 42 short sentences inserted since v5 and the derivable set falls back to
0.527, which is v5's number.

---

## Deterministic floor

```
words 16,343   sentences 1,124   cadence_cv 2.231
slop-hard 14   slop-soft 1   tricolon 24   exclamation 1   tells/1000w 0.86
```

All 14 `slop-hard` hits are the token `showcase` inside the literal path `examples/showcase`; the
one exclamation is inside the cited paper title `"SWE-bench Goes Live!"`. No scanner finding is
carried as a Blocker. The scanner's `cadence_cv` counts the notes appendix as prose and is not the
number that matters. Counts against v5 for context: slop-hard 7 to 14 (all new hits are in the
notes block, same false positive), tricolon 18 to 24, tells/1000w 0.68 to 0.86 on a document that
grew 47%.

---

## 1. The structure as a reader meets it

### Does the preface set up the legs?

Yes, and this is the strongest it has been. Lines 12-16 give the reader an accurate map before the
first section: the traditional setup, five named legs, and, critically, the interpolated shape
section flagged in advance ("and, between the first and second legs, a short section on the shape
the case argues for"). That interpolation is the one thing a reader would otherwise trip on, and
the preface pre-empts it. The map matches the file exactly.

The rules paragraph beneath it does not survive contact, for a mechanical reason. See Blocker 1.

### Does the order of legs argue?

Yes. The sequence is: the alternative steel-manned first, so every later leg has something to be
measured against; Leg 1 to establish what the object is; the shape section immediately after, to
generalize before the reader can mistake the case for product-versus-product; then three mechanism
legs in descending order of consequence (where content lives, where the site runs, what an editor
can do); then the case report last, because it is the only leg that is evidence about the author
rather than about the design. Putting the shape section after Leg 1 rather than before it is the
right call: a reader needs the concrete thing before the abstraction over it.

The forward references do real work and are worth keeping: "Leg 3 carries what that costs" (`:144`),
"read in Leg 5" (`:190`), "Leg 5 leans on this" (`:325`), "The support question, above under Leg 1"
(`:374`). One of them points at nothing. See Warning 2.

### Are the derivability lines the right skeleton?

The line itself is right: one line, directly under the heading, before any prose, stating the
derivation rule rather than merely a flag. Leg 3's is the model, because it carries the rule and
not just the verdict ("derivable, with every vendor number replaced by a link; tags marked internal
cite a consumer site's record through the evidence file"). Leg 5's names where the derivable form
sits. That is exactly the skeleton a derivation pass needs.

The problem is that the line is binary per section while the sections are not. At least six
sentences inside "Front door: derivable" sections are prose about this document's own drafting
history and cannot derive: `:119-121`, `:267-269`, `:413-415`, `:434-436`, `:858-860`, and the
Classic Editor and Gutenberg drops. The preface got an explicit per-sentence carve-out at `:19-20`
("That sentence is for this record and never derives"). Nothing else did. See Warning 4.

### Are the schema headings in the internal legs the right skeleton?

Yes, and this is the largest structural improvement since v5. The five-label rubric
(`Claim` / `Reasoning and evidence` / `Counter-evidence a skeptic cites` / `Drawbacks` /
`Counterweight`), 46 bolded labels across four legs in v4, returns **zero hits**. Legs 1 through 4
are now continuous prose. My v4 Suggestion 3 warned that the labels surviving derivation would make
`why-cairn.md` read as a filled-in rubric; that risk is gone at the source.

The sixteen bolded run-in labels that remain are all in the record-only legs, and every one names
its content rather than filling a slot: "What cairn carries, scoped to the charter", "What the
general studies test, and what they do not", "The later commits, classified", "The defect at the
seam", "The review", "The increment, per section", "The pair". They are not parallel-templated,
which is what keeps them reading as an author's section markers rather than a form. Correct as they
stand.

One cost, and I record it as a Suggestion rather than a finding: the rubric's removal took the
steel man's auditability with it in Leg 3, where drawbacks and counterweights now interleave inside
paragraphs (`:377-403` alternates tie, what leaves untouched, what is rewritten, the tie is
bounded). In Legs 1, 2, and 4 the paragraph breaks carry the turn cleanly. Leg 3 is the one place a
hostile reader can no longer tell where the concession stops.

### Do the footnotes work as a second reading channel?

**No.** This is the central finding of the review, and it is a finding about the restructure's own
purpose.

**The channel is not in document order.** Reading the prose top to bottom, the note references run
1, 2, ... 14, **372**, 15, **373**, 16, **383**, 17, 18, 19, **342**, 20, 21, 22, **343**, 23 ...
There are **49 descending steps** in the reference sequence, one for each note in the 342-390 block.
Every one of those 49 is attached to a short sentence inserted after the notes were numbered, and
they were appended to the end of the appendix rather than renumbered into place. A reader using the
appendix as a second channel, which is the stated design, gets 342 through 390 scattered through
the document and stacked at the end of the list. The appendix cannot be read in sequence against
the prose.

**The ten-note test.** Drawn at random (seed 20260904): 5, 62, 68, 102, 127, 128, 144, 204, 251, 258.

| Note | Reaches its number/command from the note alone? |
| --- | --- |
| `[^5]` | **No.** It is a legend entry, not a note. See Blocker 1. |
| `[^62]` | n/a, opinion; nothing to check. |
| `[^68]` | Partly. "Phoenix 1.8.0 release post, 2025-08-05" carries no URL; the evidence file `15-evidence-round-3-shape.md, A5` backstops it. |
| `[^102]` | n/a, opinion. |
| `[^127]` | Yes. URL plus `docs/reference/log-events.md`. `Supports: one, seven` under-covers three separate "one"s in the sentence. |
| `[^128]` | **Yes, cleanly.** URL, and `Supports: 3,000` is the figure. This is the schema working. |
| `[^144]` | Yes in kind; the note honestly says the source is "a rolling window", so the figures are not reproducible. `Supports: 2026, 09, 05, 33, 08, 21,, twelve` shreds one date into three tokens and carries a double comma. |
| `[^204]` | Yes. Three paths, no figures needed. |
| `[^251]` | Yes. Two files with line numbers. Date shredded in `Supports:` again. |
| `[^258]` | Yes. `docs/status-archive.md:160,557-558,624-625`, and the token figures are all present. |

Score: one exemplary, five workable, two opinion stubs, one partial, one broken. The path and command
half of the schema mostly works. The `Supports:` half does not, and in one place it is worse than
absent. See Blocker 8.

**Thirty notes carry no content.** Notes `[^342]` through `[^390]`, excluding the nineteen that read
"Opinion: a judgment, not a checkable fact", read "Verifiable: restates the preceding sentence's
note." A checker landing on `[^390]` is told to walk back up the prose to find `[^301]`. That is
navigable, but it is also the apparatus admitting in its own voice that thirty of the sentences it
covers restate the sentence before them. See section 2.

### Is anything now in a note that a reader of the prose needs?

Two things, both from conversion damage rather than from editorial judgment.

First, the **tag legend**. The preface at `:22-26` explains the four-kind tag system, and the
conversion turned the literal tag names into note references, so the sentence now reads: "`[^2]` for
a fact checkable against the tree or a primary document, `[^3]` for a claim backed by a study ...
`[^4]` for a statement that is checkable but was not cited here, or `[^5]` for a judgment. The
fourth tag exists so that `[^6]` marks only judgments." Notes 2 through 6 are placeholder stubs
("Verifiable: <path or URL>", and "Opinion: a judgment, not a checkable fact" three times over).
The reader's key to the entire apparatus is gone, and what replaced it is circular. Blocker 1.

Second, **two commands** are in the notes only as truncated fragments, with their tails left visible
in the prose. `:80-81` and `:580-581`. Blockers 2 and 3.

Everything else that belongs in the prose is in the prose. The judgment about what to demote was
sound; the mechanism that executed it was not.

---

## 2. Cadence per derivable section

Note markers stripped, tables and `Front door:` lines excluded, code spans and URLs collapsed.

| Section | lines | n | mean | sd | **CV** | longest | shortest | <=12w | >=35w |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Preface (record) | 6-42 | 18 | 27.6 | 21.3 | 0.771 | 88 | 4 | 17% | 22% |
| **Traditional setup [D]** | 44-87 | 29 | 18.5 | 12.7 | **0.687** | 47 | 4 | 41% | 14% |
| **Leg 1 [D]** | 89-150 | 39 | 19.3 | 11.7 | **0.609** | 47 | 4 | 31% | 15% |
| **The shape [D]** | 152-193 | 23 | 24.3 | 15.7 | **0.646** | 57 | 4 | 26% | 26% |
| **Leg 2 [D]** | 195-251 | 41 | 17.4 | 9.6 | **0.552** | 39 | 3 | 29% | 5% |
| **Why markdown [D]** | 253-278 | 21 | 14.6 | 9.9 | **0.680** | 37 | 3 | 48% | 5% |
| **Leg 3 [D]** | 280-403 | 86 | 18.1 | 10.9 | **0.600** | 48 | 3 | 33% | 9% |
| **Leg 4 [D]** | 405-446 | 30 | 16.7 | 10.4 | **0.623** | 52 | 3 | 40% | 3% |
| Leg 5 (record) | 448-565 | 57 | 27.5 | 18.0 | 0.655 | 87 | 2 | 25% | 32% |
| Case report (record) | 567-669 | 19 | 21.0 | 13.3 | 0.632 | 49 | 4 | 32% | 16% |
| Second case (record) | 671-735 | 39 | 21.5 | 14.4 | 0.667 | 55 | 2 | 33% | 21% |
| Already extensible (record) | 737-881 | 42 | 22.5 | 15.3 | 0.680 | 66 | 2 | 29% | 19% |
| Arguing with reviews (record) | 883-904 | 16 | 19.3 | 14.1 | 0.731 | 51 | 5 | 44% | 12% |
| Open questions (record) | 906-954 | 39 | 17.0 | 15.0 | 0.885 | 86 | 2 | 49% | 5% |
| **DERIVABLE SET** | | **269** | **18.3** | **11.6** | **0.634** | **57** | **3** | **34%** | **10%** |
| **WHOLE** | | **499** | **20.3** | **14.3** | **0.703** | **88** | **2** | **33%** | **15%** |

**The writer's figures are confirmed.** Pooled derivable 0.634 against the reported 0.641, inside
method noise. Leg 2 at the reported 0.609 is confirmed **if the "Why markdown" subsection is
counted with it**: pooled 195-278 gives 0.596. One correction: **Leg 2 taken alone is 0.552**, the
lowest derivable section in the document, and the pooled figure flatters it by borrowing the
subsection's 0.680. Every derivable section is now inside the healthy 0.5-0.8 band, and Leg 3, which
was the v5 casualty at 0.469, has recovered to 0.600.

**Longest and shortest per derivable section:**

- Traditional setup, 47w `:78-81` (the changelog-entry sentence, and it is 47 words only because the
  splice damage of Blocker 2 is glued onto it); 4w `:63` "Someone answers the phone."
- Leg 1, 47w `:97-99` ("Out of the box, before a developer writes anything, the adapter gives you an
  editor-first CMS with two roles, owner and editor: ..."); 4w `:115` "Members are not editors."
- The shape, 57w `:169-173` (the Rails benchmark sentence); 4w `:174` "Rails measured it first."
- Leg 2, 39w `:244-246` ("A stalled CMS leaves the content readable and the site building, since
  ..."); 3w `:206` "Publish means live."
- Why markdown, 37w `:272-275` ("Editors learn markdown syntax, with live preview and a tidy pass,
  ..."); 3w `:277` "The prose travels."
- Leg 3, 48w `:369-372` ("In the production case the repository, the Cloudflare account, and the
  GitHub App installation are all under the developer's personal accounts: ..."); 3w `:310` "The
  limits move."
- Leg 4, 52w `:434-436` (the Classic Editor drop); 3w `:428` "Builders are mainstream."

None of the seven longest is a run-on. Each is a single argued thought with real subordination,
which is the shape the register wants and the shape v5's semicolon fold had shaved off. On the long
end the repair is genuine.

### Do the added short sentences carry emphasis or read as filler?

**Both, and the arithmetic says mostly filler.**

Forty-two of the inserted sentences fall in derivable text (47 in the document). Removing them and
re-measuring:

| Section | CV as written | CV with the inserted sentences removed | delta |
| --- | --- | --- | --- |
| Traditional setup [D] | 0.671 | 0.577 | +0.095 |
| Leg 1 [D] | 0.593 | 0.487 | +0.106 |
| The shape [D] | 0.632 | 0.498 | +0.134 |
| Leg 2 [D] | 0.536 | 0.437 | +0.099 |
| Why markdown [D] | 0.648 | 0.488 | +0.159 |
| Leg 3 [D] | 0.586 | 0.501 | +0.085 |
| Leg 4 [D] | 0.617 | 0.590 | +0.027 |
| **DERIVABLE SET** | **0.619** | **0.527** | **+0.092** |

**The underlying prose is at 0.527, which is v5's 0.533.** The rhythm of the argued sentences has not
changed since the last round. The entire reported gain is a layer of short sentences applied on top
of it.

That would be fine if the layer were authorial. Three measurements say it is not.

**First, the document's own notes admit it.** Thirty of the 49 inserted sentences carry a note
reading "Verifiable: restates the preceding sentence's note." The other nineteen are "Opinion: a
judgment, not a checkable fact." Not one of the 49 carries a path, a command, or a figure of its
own. By the apparatus's own account, none of them adds a fact and thirty of them repeat one.

**Second, the repetition is verbatim in places.** A sample of the echo pairs, each inserted sentence
against the clause it restates:

- `:100` "The developer has written nothing yet" against `:97` "before a developer writes anything".
- `:156` "The shape has four parts" against `:157` "The shape has four parts:" — the same six words,
  consecutively. Blocker 4.
- `:232` "The corpus has a ceiling" against `:232` "so a content corpus has a ceiling a database does
  not".
- `:287` "It is one bill" against `:285-286` "on one bill".
- `:300` "TLS is on every plan" against `:298-300` "on every plan".
- `:354` "Sign-in rides on it" against `:354` "sign-in depends on it".
- `:383` "The rewrite is unsized" against `:383` "This document does not size that rewrite".
- `:398` "The data leaves as SQL" against `:397` "exports to a SQL file".
- `:858` "The ratio is about one to two" against `:856` "about half the engine's source line count
  (35,888 against 68,644)".
- `:245` "The content stays readable" against `:244` "leaves the content readable".
- `:77` "The treadmill runs both ways" immediately followed by `:77` "cairn has its own treadmill",
  two consecutive pivot stubs making one point.

**Third, the beats are a metronome.** The 42 inserted sentences run 4 to 10 words, with **30 of the
42 at exactly five or six words**; their own length CV is **0.21** against 0.63 for the sections
they sit in. A person letting a sentence land produces two words here and eleven there. This
produces a five-or-six-word drumbeat, 42 times, at a mean spacing of 6.3 sentences. The variance was
added by a machine keeping time.

The insertions are also detectable by punctuation alone: all 308 original markers attach with a
space (`... its site [^8].`), and all 49 inserted ones attach without one (`The volunteer needs no
developer[^372]`). See Suggestion 1.

**Which ones earn their place.** Roughly fifteen do, and they are the best sentences in the
document. Keep these: `:63` "Someone answers the phone." (the whole support-contract argument in
four words); `:115` "Members are not editors."; `:229` "Git has no `DELETE`."; `:277` "The prose
travels. The rest does not." (a genuine pair, the second reversing the first); `:362` "Deleted is
deleted."; `:690` "The reviewer did not." (landing against "Every gate passed." immediately before
it, and the best beat in the file); `:729` "Gates alone were not enough."; `:764` "Four products,
one app."; `:352` "That is the size of the bet."; `:187` "None of this names cairn."; `:743` "It is
one author's site."; `:325` "The agent reads the same pages a person does."

Cut the rest. Roughly thirty sentences leave, the derivable CV settles near 0.56 to 0.58, and it
will be a number the prose actually earned.

---

## 3. Tell sweep, and what moved since v5

**Still at zero, and I am not re-reporting them:**

- Em dashes: 0 in 1,413 lines. En dashes: 0. Held from v4 and v5.
- Connector openers (`However`, `Moreover`, `Furthermore`, `Additionally`, `Notably`, `Ultimately`,
  `Therefore`, `That said`, `In contrast`): 0 in 499 sentences.
- Grading adverbs (`importantly`, `notably`, `significantly`, `arguably`, `fundamentally`,
  `clearly`, `obviously`): 0.
- Marketing and machine vocabulary: one hit across a 45-term sweep, `robust` at `:532`, inside the
  statistical term of art "a doubly robust estimator". Zero true positives at 16,000 words. This
  remains the document's strongest dimension.
- Participial frame openers: 0. The twelve gerund openers found (`Starting`, `Adding`, `Moving`,
  `Onboarding`, `Deactivating`, `Counting`, `Naming`, `Everything`) are all grammatical subjects,
  not dangling frames.
- "Not X, it's Y" contrast frames: 0. The three `is not` constructions at `:25`, `:495`, `:859` are
  factual corrections.
- `, not Y` corrective appositives: still exactly three (`:55`, `:496`, `:878`), unchanged from v5's
  N4. No fourth was added, as asked.
- `, never Y` appositives: 0.

**What moved, and it moved backwards:**

- **Setup-colon lists in derivable text: 0 in v5, 1 now.** `:156-160`. The section that carries it,
  "The shape, not only the product", is new since v5. Blocker 5.
- **Verbatim repetition: fixed in v5, reintroduced.** `:156-157`. Blocker 4.
- **Splice damage: three missing spaces in v5, now six defects of larger kind.** Blockers 1, 2, 3, 4,
  6, 7. v5's BL1 was one character each; these truncate commands, destroy the tag legend, and break
  a numbered list.
- **A new machine cadence: the echo beat.** Section 2. This is the one tell in the document a careful
  reader would name unprompted, because five-or-six-word restatements of the preceding clause,
  forty-two times, is a recognizable model habit.
- **A new spec-sheet run.** The shape section at `:169-193` carries fifteen sentences of
  noun-verb-number-citation (Rails, Vercel, Sentry, Basecamp, Willison, Phoenix, Charm, Django,
  thoughtbot, Constraint Decay, BaxBench) in a section marked "Front door: derivable" with no
  derivation caveat. This is the same shape as v5's N3/SU1 in Leg 3, in a new section, and unlike
  Leg 3 it carries no rule telling the derivation what to do with it. Warning 3.

---

## Blockers

**B1. `:22-26` and notes `[^2]` through `[^6]` — the conversion destroyed the preface's key to the
tag system.** The four tag names (`verifiable`, `supported`, `uncited`, `opinion`) were literal
strings in the prose and the converter turned them into note references. The paragraph now reads:

> Every factual sentence ends in a tag: `[^2]` for a fact checkable against the tree or a primary
> document, `[^3]` for a claim backed by a study or report with a stated sample, `[^4]` for a
> statement that is checkable but was not cited here, or `[^5]` for a judgment. The fourth tag
> exists so that `[^6]` marks only judgments.

Notes 2 through 6 are stubs: `[^2]` "Verifiable: <path or URL>.", `[^3]` "Supported: <citation>.",
`[^4]` "Uncited: checkable against <what>.", and `[^5]` and `[^6]` are both "Opinion: a judgment, not
a checkable fact." The reader is sent to a note to learn what the note kinds mean, and the note is a
template placeholder. Restore the tag names as literal text and delete notes 2 through 6:

> Every factual sentence ends in a note giving its kind. **Verifiable** marks a fact checkable
> against the tree or a primary document. **Supported** marks a claim backed by a study or report
> with a stated sample. **Uncited** marks a statement that is checkable but was not cited here.
> **Opinion** marks a judgment. The fourth kind exists so that **Opinion** marks only judgments.

**B2. `:78-81` and note `[^23]` — the note's command leaked into the prose and the note is truncated
mid-regex.** The converter cut the tag at the first `]`, which was inside the character class
`[0-9]`. The prose now reads:

> ... starting at `v0.24.0` [^23]+\.[0-9]+\.[0-9]+' CHANGELOG.md`; `git tag | grep -E
> '^v0\.(2[2-9]|[3-9][0-9])\.[0-9]+$' | wc -l`; `v0.96.0` dated 2026-08-22].

and note `[^23]` reads "Verifiable: `grep -cE '^## [0-9. Supports: 87, ...". Neither command is
runnable from either place. Restore the full note and delete the leaked tail from `:80-81`:

> [^23]: Verifiable: `grep -cE '^## [0-9]+\.[0-9]+\.[0-9]+' CHANGELOG.md`; `git tag | grep -E
> '^v0\.(2[2-9]|[3-9][0-9])\.[0-9]+$' | wc -l`; `v0.96.0` dated 2026-08-22. Supports: 87, 70, 3.

**B3. `:577-581` and note `[^246]` — the same defect, cut at `[bot]`.** The prose reads:

> ... during the measured window [^246]`, 10 under the author's full name); the site's CLAUDE.md:255
> (`glw907/aksailingclub-org`); cairn-cms src/lib/admin-toolkit/index.ts:8-11].

and note `[^246]` is "Verifiable: `git log --format=%an | sort | uniq -c` (799 `glw907`, 29
`github-actions[bot. Supports: 799, 838." The note lost two of its three sources. This one matters
more than B2, because the sentence it supports is the author-disclosure sentence the whole case
report is bounded by. Restore all three sources into the note and delete the leaked tail.

**B4. `:156-157` — a verbatim duplicated clause.** "The shape has four parts[^348]. The shape has
four parts: content as markdown in the organization's own git repository; ..." An inserted short
sentence was placed immediately before the sentence it copies word for word. Delete the inserted
one.

**B5. `:156-160` (The shape, DERIVABLE) — setup colon onto four semicolon-separated parallel items,
the register's named killed cadence, in text bound for the front door.**

> The shape has four parts: content as markdown in the organization's own git repository; an admin
> frame that lives inside the organization's own app; the organization's own screens mounted through
> seams; and one hosting platform supplying hosting, data, media, mail, and deploy.

This is structurally identical to the specimen `docs-register.md:376` kills by name, and it is the
first instance to appear in derivable text since I certified the file at zero in v5. The universal
contract is "Fold the items into plain sentences" (`docs-register.md:54-55`). Rewrite:

> The shape has four parts. Content is markdown in the organization's own git repository. The admin
> frame lives inside the organization's own app. The organization's own screens mount through seams.
> One hosting platform supplies hosting, data, media, mail, and deploy.

**B6. `:915-947` — Open questions items 2 through 7 are swallowed into item 1.** Item 1 ends "This
document decides none of them." and item 2's marker follows inline on the same line, so markdown
renders items 2 through 7 as body text inside item 1 and the list shows two entries, 1 and 8. This is
the section a derivation pass reads to know what is unresolved, and six of its eight entries are
invisible as entries. Break each numbered item onto its own line.

**B7. `:887-889` and notes `[^330]`, `[^331]` — tag names converted to note references, leaving a
sentence with no meaning.** The prose reads "four of the ten `[^330]` tags became vendor-page
citations where a fetched page showed the claim, and the rest stay `[^331]` because ...". Both notes
have empty bodies: "Uncited: . Supports: twenty, four, ten." The original read "four of the ten
`[uncited]` tags ... the rest stay `[uncited]`". Restore the literal word and delete both notes:

> Four of the ten **uncited** tags became vendor-page citations where a fetched page showed the
> claim. The rest stay uncited, because the traditional setup is described by capability and a named
> vendor page would tie each sentence to one product.

**B8. Notes `[^304]` through `[^316]` — the `Supports:` field is misattributed by one table row
across the document's headline size table.** The field appears to have been generated by a sliding
window over the numbers near each marker, and in "The pair" table it lags by a row throughout:

- `[^304]` supports "68,644 lines under `src/lib/`" and its `Supports:` reads "28, 10,139, 2,655, 33,
  40, 446, one, One" — every one of those is from the *preceding* table, and 68,644 is absent from
  its own list.
- `[^314]` supports the History row (87 changelog entries, 73 tags, about 4,000 commits) and reads
  "11,, 9,, 6,, 4,, 2,, 1, 3, 125" — the import counts and migration counts from two rows above.
- `[^316]` supports the reuse-by-import sentence and reads "838, 2026, 07, 06, 08, 30,, 1" — the
  History row's commit count and dates.
- `[^308]`, `[^309]`, `[^310]`, `[^311]`, `[^312]`, `[^313]`, `[^315]` all carry the same sliding
  window.

Outside that run: `[^220]` reads "Supports: 200, 180", copied wholesale from `[^219]`, for a sentence
containing neither number; `[^238]` and `[^239]` carry `[^237]`'s figures; `[^142]` reads "026, 09,
04" with the year truncated; `[^176]` (an MIT-license fact with no numbers in it) reads "2, 3".
Throughout, dates are shredded into fragments ("2026, 08, 21, 22") and double commas appear
("1.0,, two", "134,619,, 70,261,, 3,059").

A checker using the notes as the second channel on the size table, which is the table the "already
extensible" argument turns on, is actively misled. This field is worse than absent. Either regenerate
it correctly against each sentence or delete `Supports:` from all 390 notes and let the path and the
command carry the check, which the ten-note sample shows they mostly can.

---

## Warnings

**W1. The reported cadence gain is an artifact of inserted restatements.** Full arithmetic in section
2. Derivable set 0.634 as written, 0.527 with the 42 inserted sentences removed, against v5's 0.533.
Thirty of the 49 carry a note reading "restates the preceding sentence's note"; 30 of 42 are exactly
five or six words long, own length CV 0.21. Keep the twelve to fifteen named in section 2, cut the
rest, and let the number land where the prose earns it.

**W2. `:163` — a cross-reference to a landmark that does not exist.** "the list Leg 1 carries under
'The developer's other option'". That heading was removed when the rubric labels came out; a grep
for the phrase returns only this reference. Point at the content instead: "the list at the end of Leg
1, beginning with the magic-link editor login".

**W3. `:169-193` (The shape, DERIVABLE) — a fifteen-sentence spec-sheet run in a section whose
derivability line carries no rule for it.** Rails, Vercel, Sentry, Basecamp, Willison, Phoenix,
Charm, Django, thoughtbot, Constraint Decay, and BaxBench in sequence, each noun-verb-number-citation.
Leg 3 has the same shape and handles it, with "derivable, with every vendor number replaced by a
link". This section says only "Front door: derivable". Either give it the same qualifier or say
plainly that the evidence run does not derive.

**W4. The derivability lines are binary and the sections are not.** At least six sentences inside
"Front door: derivable" sections are prose about this document's own drafting and cannot derive:
`:119-121` ("The brief's earlier phrasing ... was a sentence of the same family the register killed
... Conceded, and corrected above"), `:267-269` ("The brief's superlative ... is dropped"),
`:413-415` ("The brief's 'the file carries no layout' was false ... and is replaced by the sentence
above"), `:434-436` (the Classic Editor drop), `:435-436` (the Gutenberg drop), `:858-860` ("The
sentence 'a small fraction of the whole' is not what this measurement supports, and this document
does not write it"). The preface got the right treatment at `:19-20`, an explicit inline
non-derivation instruction. Give these six the same, or move them to a "Where this document argues
with the reviews" section that already exists for exactly this material at `:883-904`.

**W5. `:729-732` (record) — setup colon onto three semicolon-separated items.** "Measurements on
record: the production site's ... ; the 2026-08-25 email-announce pass ... ; and this screen's first
pass in 35 minutes, stopped in review." Record-only, so this is a Warning rather than a Blocker, and
the items are real measurements rather than rhythm. Fold to three sentences if the section is
touched.

---

## Suggestions

**S1. Marker spacing splits the document in two.** All 308 original markers attach with a space; all
49 inserted ones attach without one. Whatever survives the W1 cut should be normalized, or the seam
is visible to any reader who notices punctuation.

**S2. The thirty "restates the preceding sentence's note" notes.** If a sentence's only provenance is
the sentence before it, the sentence is not carrying a fact and does not need a note. Cutting per W1
removes these; if any of the twelve keepers needs a note, give it the note of the sentence it lands
against rather than a pointer.

**S3. Leg 3 lost the steel man's audit trail with the rubric labels.** `:377-403` interleaves tie,
what survives, what is rewritten, and the bound, so a hostile reader can no longer see where the
concession stops and the counterweight starts. Legs 1, 2, and 4 carry the turn on paragraph breaks
cleanly; Leg 3 is long enough to need a marker. One sentence would do it, at the head of `:379`:
"Three things leave with the organization untouched, and one does not."

---

## Categories with no findings

Em and en dashes, connector openers, participial frame openers, grading adverbs, marketing and
machine vocabulary, "not X, it's Y" contrast frames, `, never Y` appositives, exclamations outside
the cited title, and setup-colon lists anywhere in the derivable text except `:156`.

---

## Grades

**Prose, derivable sections: B+ (was A-).**
Vocabulary, openers, dash discipline, and grading words hold at zero across 16,000 words, the
five-label rubric is gone from all four legs, and every derivable section now sits inside the healthy
band with a genuine long sentence at the top of each range; the grade comes down from v5 because the
band's recovery is bought by 42 inserted five-or-six-word restatements rather than by the argued
prose, which still measures 0.527, and because a setup-colon four-item list and a verbatim duplicated
clause entered the new "shape" section after v5 had certified both at zero.

**Prose, whole document: B (was A-).**
The record sections carry the file's best cadence, the case report and the measured build are argued
rather than announced, and the removal of the rubric leaves continuous prose that reads as a person
working through evidence; the grade falls a full step because a record's one job is auditability and
this one now carries a destroyed tag legend, two commands truncated mid-regex with their tails spilled
into the running text, a collapsed numbered list hiding six of eight open questions, and a
provenance field misattributed by one table row across the thirteen notes covering its headline
measurement.

**Structure: B- (new grade this round).**
The argument's skeleton is A-grade work: the preface maps the legs accurately including the
interpolated shape section, the order genuinely argues by putting the alternative first and the
author's own case last, the derivability lines are the right instrument, and the run-in labels in the
internal legs name content instead of filling slots; the grade is held down by the apparatus the v9b
restructure existed to build, which does not function as a second reading channel, being out of
document order at 49 points, carrying thirty notes with no content of their own, and failing the
ten-note check in the one place a checker most needs it.

---

## Verdict

Mostly, and less than in v5: the argued prose still reads as the register's plausible human author,
but the forty-two five-or-six-word sentences inserted on top of it read as a machine keeping time,
and the notes appendix reads as a conversion nobody proofread.
