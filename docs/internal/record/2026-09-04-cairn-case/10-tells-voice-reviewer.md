# AI-tells read: `docs/internal/record/2026-09-04-the-cairn-case.md` (v4, 937 lines)

Second of two independent tells readers. Graded against `docs/internal/docs-register.md`
(front-door register for the sections marked "Front door: derivable"; contributor-zone
register for the rest) and the workstation tell catalogue in `~/.claude/CLAUDE.md`
("Writing voice") and `~/.claude/docs/voice/`.

Audience and register. Two readers in one file. The derivable sections
(lines 35-464, plus the two "Derivable form" paragraphs at 657 and 822) are graded against
the front door: primary persona the seasoned developer serving an organization, legibility
floor an intelligent non-developer, no pitch, no prose about the document's own writing, no
setup-colon triad, no em-dash rhythm. The rest is the contributor zone: engineer-to-engineer,
invariants flat, history linked not restated, and no style floor.

---

## Deterministic floor

`tellgrader --register docs` on the file:

```
words 10,076   sentences 375   cadence_cv 1.502
slop-hard 7    tricolon 20     exclamation 1     tells/1000w 0.69
```

All eight scanner findings are false positives and none is carried as a Blocker. The seven
`slop-hard` hits (lines 111, 288, 383, 390, 728, 797 x2) are the token `showcase` inside the
literal path `examples/showcase`, a real directory in this repo. The one exclamation
(line 497) is inside the paper title `"SWE-bench Goes Live!"`. The scanner is clean.

Its `cadence_cv` of 1.502 is inflated by the evidence tags, which the front-door derivation
drops. Re-measured with tags stripped, code spans and URLs collapsed, and tables excluded,
the per-section profile is below. Everything after this point is judgment the scanner cannot
make.

---

## 1. Cadence profile

Sentence length in words, tags stripped. CV is the population standard deviation over the
mean. A healthy human range for argued technical prose is roughly 0.5 to 0.8; below about
0.45 the prose starts to hum.

| Section | lines | n | mean | sd | CV | max | <=12w | >=35w |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Preface (record) | 6-33 | 13 | 23.3 | 13.0 | 0.556 | 48 | 15% | 23% |
| **Traditional setup [DERIVABLE]** | 35-81 | 23 | 20.3 | 12.1 | **0.595** | 48 | 35% | 13% |
| **Leg 1 [DERIVABLE]** | 83-155 | 30 | 21.7 | 13.6 | **0.625** | 65 | 23% | 17% |
| **Leg 2 [DERIVABLE]** | 157-238 | 32 | 20.5 | 9.3 | **0.451** | 39 | 16% | 6% |
| **Leg 2 / why markdown [DERIVABLE]** | 239-266 | 12 | 20.5 | 10.2 | **0.495** | 44 | 17% | 8% |
| **Leg 3 [DERIVABLE]** | 268-411 | 59 | 22.2 | 15.2 | **0.683** | 81 | 27% | 12% |
| **Leg 4 [DERIVABLE]** | 413-464 | 21 | 22.2 | 13.4 | **0.602** | 54 | 29% | 14% |
| Leg 5 (record) | 466-543 | 30 | 24.8 | 18.0 | 0.727 | 79 | 30% | 17% |
| Case report (record) | 545-663 | 12 | 35.2 | 33.3 | 0.943 | 118 | 25% | 33% |
| Already extensible (record) | 665-827 | 40 | 24.2 | 18.2 | 0.750 | 79 | 35% | 22% |
| Arguing with reviews (record) | 829-845 | 12 | 18.5 | 11.5 | 0.622 | 42 | 42% | 8% |
| Open questions (record) | 847-885 | 32 | 15.4 | 10.5 | 0.682 | 49 | 50% | 3% |

**Four of six derivable sections are healthy** (0.595 to 0.683). Legs 1, 3, and 4 in
particular alternate properly: Leg 3 runs `...9, 26, 18, 9, 19, 60, 19, 34, 72, 14, 45...`,
which is a human writer varying pressure.

**Leg 2 is the flat one, and it is derivable.** CV 0.451 is the lowest in the document, and
the shape of the flatness matters more than the number:

- Only **one** sentence under 13 words in 32 (line 169, "Editors never see git.", 4w). The
  next shortest is 13w. Every other sentence in the section sits between 14 and 41 words.
- A **run of three consecutive 28-word sentences** at lines 184, 186, and 188, each built
  the same way (subject, comma-apposition, `so`/`and` clause):
  `28 | 28 | 28`.
- The wider band around it: `41, 28, 28, 28, 35` (lines 180-192), then
  `28, 14, 24, 18, 29, 29, 26, 30` (lines 208-235). Two long plateaus with no relief
  between them.

**Runs of same-length clauses (+/-3 words, 3+ consecutive sentences)** across the whole file:
line 184-188 (`28, 28, 28`), lines 41-53 (`10, 10, 9`), lines 178-184 (`27, 26, 28`),
lines 494-505 (`12, 11, 8`), lines 578-597 (`29, 26, 26`), lines 697-704 (`8, 9, 12`),
lines 833-838 (`5, 6, 7`), lines 862-870 (`9, 6, 9`). Eight runs in 286 sentences is low, and
five of the eight are in record-only sections where they are inconsequential. Only the
lines 178-188 cluster lands in derivable text, and it is the same cluster as above.

There is a second, non-numeric cadence problem the length statistics miss, at
**lines 192-206** (Leg 2, derivable). Six consecutive **headless noun-phrase fragments**,
each opening on an abstract nominalisation:

> **Validation** enforced at the store... **Referential integrity** in real time, where...
> **Transactions** across entries, per-row permissions, and multi-writer merge, none of
> which cairn has. **Reads** without a network hop: an uncached body read crosses...
> **Erasure**: personal data that reaches a content file... **Cross-entry queries**,
> reporting, and full-text search are the developer's job...

This is a bulleted list wearing prose clothes, and it is the single most machine-shaped
passage in the derivable set. Two of the six carry their own internal setup colons. See
Blocker 3.

---

## 2. Vocabulary tells

**This is the strongest dimension in the document and it is close to spotless.**

**Machine and marketing words: none.** A sweep of 54 catalogue terms (`seamless`, `robust`,
`powerful`, `leverage`, `delve`, `crucial`, `comprehensive`, `holistic`, `underscore`,
`landscape`, `realm`, `journey`, `unlock`, `empower`, `streamline`, `elevate`,
`cutting-edge`, `testament`, `compelling`, `meticulous`, `intricate`, `nuanced`, and so on)
returns three hits, all legitimate:

- line 523 `significant` - used in its statistical sense, reporting Borg et al. Correct.
- line 287 `showcase` - the literal directory `examples/showcase`.
- line 476 `critical` - inside the compound term of art `correctness-critical`.

Ten thousand words of technology-comparison prose with zero marketing vocabulary is a
genuinely hard thing to do, and the front-door register's no-pitch keystone is met without
the usual cost: the prose is not flat to buy it.

**Grading words: absent by construction.** The `[opinion]` / `[verifiable]` / `[supported]`
tagging discipline has forced every evaluative word into a tagged judgment, and the untagged
prose carries none. There is no "importantly", "notably", "it is worth noting", "ultimately",
or "arguably" anywhere in the file.

**Hedges: 31 total across 286 sentences, and they are earned.** The distribution is
`about` 21, `roughly` 3, `may` 3, `could` 2, `might` 1, `appears` 1, `mostly` 1. Nearly all
the `about` and `roughly` instances attach to real measurement imprecision the document is
being honest about ("about two hours ten minutes", "about $6 a month", "about 3.4M subagent
tokens", "about half the engine's source line count"). This is not hedging; it is precision
about imprecision. No finding.

**Nominalisations: moderate, and concentrated where they should be.** The frequency table is
led by `document` (20), `production` (16), `organization` (16), `evidence` (15) - all of
which are the document's actual subject nouns, not abstraction. The real nominalisation
problem is local rather than global: the six-fragment paragraph at lines 192-206, where
`Validation`, `Referential integrity`, `Transactions`, `Erasure`, and `Cross-entry queries`
are each doing subject duty in a verbless fragment. That is one passage, not a habit.

**One vocabulary tic worth naming.** `never` appears 13 times, and in five of those it is the
register's own signature rhetorical move ("described by capability, and the only vendor names
in this document are in citations", "never incident rates on small sites", "never in hours",
"never an auth token"). This is the house style of `docs-register.md` itself bleeding into
the artifact. It is in-register for the contributor zone and reads as authorial, not
machine. Flagged for awareness, not as a finding.

---

## 3. Punctuation and structure tells

**Em dashes: zero.** Both em and en dash counts are 0 in 937 lines. Exemplary, and the harder
achievement is that the prose does not read as though something was removed.

**Semicolons: 77 in prose (excluding tags and tables), against 286 sentences.** One per 3.7
sentences is high, and the shape matters: **38 of the derivable sections' sentences carry at
least one semicolon.** The register's rule is explicit that this is not a glyph question:

> No em-dash rhythm. The sentence-final elaborative tail is the tell regardless of which
> punctuation carries it; restructure into a second sentence rather than swapping the glyph
> for a comma or colon. (`docs-register.md:56-58`)

The document banned the em dash and the semicolon absorbed the load it was carrying. Ten
sentences carry two or more semicolons; the worst are lines 143 (four), 785 (four), 325
(three), 476 (three), 807 (three).

**Setup colons: 24 in prose outside tags, headings, and the `Front door:` labels.** Most are
fine and idiomatic. Four are the register's specifically killed cadence - a setup colon
opening onto a semicolon-separated list of three or more - and all four are in derivable
sections. See Blockers 1, 2, and Warning 4.

**Triads and longer comma-enumerations: 58 instances of three-or-more comma items closing on
`and X` / `or X`.** This needs a distinction the scanner's flat count of 20 cannot make.
The large majority enumerate **real, named, checkable artifacts** - toolkit component names
(line 609), wrangler bindings (line 400), engine import specifiers (line 785), club admin
sections (line 693). Those are content, not rhythm, and the register explicitly protects
cairn's product vocabulary. I am not flagging them.

The rhetorical ones, where the third item exists for cadence rather than for information,
are fewer and worth naming: line 116 ("code the site writes, tests, secures, and keeps
running"), line 352 ("members, payments, documents, and media"), line 365 ("Content lives in
GitHub, the site runs on Cloudflare, the app is SvelteKit, and the engine reaches D1, R2,
and Workers"), line 803 ("SvelteKit routes, D1 tables, forms, and toolkit lists"). Four
instances in 10,000 words is inside tolerance. Suggestion only.

**Contrast frames ("not X, it's Y"): one, and it is legitimate.** Line 641: "The site's
member login is not `createAuthChannel`; it is 914 lines of site code on the engine's
`auth-crypto` primitives." That is a factual correction of a thing a reader would otherwise
assume, not a rhetorical frame. `not just` / `not only` / `not merely`: zero. No finding.

**Connector openers: zero.** No `However`, `Moreover`, `Furthermore`, `Additionally`,
`Notably`, `Ultimately`, `Therefore`, `That said`, `In contrast`. Zero in 286 sentences.

**Participial openers: six, and all six are ordinary gerund subjects, not the tell.** Lines
265, 297, 309, 459, 698, 864 open on `Moving`, `Sending`, `Enabling`, `Moving`, `Counting`,
`Naming` - each the grammatical subject of its sentence ("Moving existing content in is a
project"), not a dangling participial frame ("Building on this, ..."). No finding.

**Restatement and repeated frames:**

- Lines 128 and 362 carry the sentence **verbatim twice**: "The engine has no vendor and no
  support contract; the developer is the support." Both are in derivable sections (Leg 1 and
  Leg 3).
- Lines 657 and 822, the two **"Derivable form, for the front door"** paragraphs, open with
  the identical 8-word string "One production site, built by the engine's own author,". If
  both derive onto the same page, the repetition will read as a template.
- The **five-label template** (`Claim` / `Reasoning and evidence` / `Counter-evidence a
  skeptic cites` / `Drawbacks` / `Counterweight`) runs across all four legs, 46 bolded
  paragraph labels in total. See Suggestion 4.

---

## 4. Passages that read as summary rather than argument

Four clusters. The first two are in derivable text.

**a. Lines 47 and 55, Traditional setup (derivable).** "Its advantages, stated as facts." /
"Its costs, stated as facts." These are matched method announcements, not argument. See
Blocker 4.

**b. Lines 715-717, 770-771, 799-805 (record).** The densest scaffolding in the document:

> The size ratio is stated in two halves, both stated as sizes. The first is the increment:
> what one more section cost, against the engine subpaths it imports. The second is what the
> developer never writes. The whole-layer ratio sits beneath as the size record. (715-717)

> The sentence the two halves support: a developer adding a section pays a measured increment
> and does not write the first table's modules. (770-771)

> What the ratio says. The production layer is about half the engine's source line
> count... (799)

Four sentences of table-of-contents at 715-717, then a sentence at 770 whose entire content
is "the tables say what the tables say", then a third announcement at 799. The tables are
excellent and self-evident; the prose around them is narrating the document's own
organization rather than arguing from the numbers. See Warning 2.

**c. Lines 645-655, "The sentences the record supports" (record).** This one is the
counter-example and I want to name it, because a reviewer running up a score would flag it
by pattern-match. It looks like the same tic, but it is doing real work: it narrows the
claims the case report is licensed to make and explicitly refuses the inference the round-2
review wanted ("The reader draws the inference"). That is argument, not summary. **Leave
it.**

**d. Lines 597-600 and 608 (record).** "The later commits, classified... the classification is
a judgment" followed by "A commit here is one conductor-batched agent change; the counts
describe the record's shape and not effort." Two consecutive caveats about the same table.
The second could be cut. Suggestion only.

---

## Blockers

**B1. `docs/internal/record/2026-09-04-the-cairn-case.md:384` (Leg 3, DERIVABLE) - setup-colon
triad, the register's named killed cadence, 75 words.**

> The counterweights that are facts: the content is plain markdown files in a repository
> under whichever GitHub account holds it, portable by clone when the organization controls
> that account [...]; the app is standard SvelteKit with `@sveltejs/adapter-cloudflare`, so
> deploying elsewhere is an adapter change plus rewriting every D1, R2, and email binding the
> engine and the site reach, which is real work this document does not size [...]; the engine
> is MIT-licensed on npm [...].

This is structurally identical to the specimen `docs-register.md:376` killed by name ("When
something breaks: cairn-doctor diagnoses..., the logs explain..., troubleshooting maps..."):
a setup colon opening onto three parallel items. The universal contract is "Fold the items
into plain sentences" (`docs-register.md:54-55`).

Rewrite:

> Three counterweights are facts rather than judgments. The content is plain markdown files
> in a repository, portable by clone whenever the organization controls the GitHub account
> that holds it. The app is standard SvelteKit with `@sveltejs/adapter-cloudflare`, so
> deploying elsewhere means an adapter change plus rewriting every D1, R2, and email binding
> the engine and the site reach. That is real work, and this document does not size it. The
> engine is MIT-licensed on npm.

**B2. `docs/internal/record/2026-09-04-the-cairn-case.md:143` (Leg 1, DERIVABLE) - setup colon
onto five semicolon-separated items, 69 words, plus embedded method narration.**

> What cairn ships that the developer would otherwise install or write elsewhere, the
> differentiator first: the magic-link editor login, where Keystatic's GitHub mode requires
> each editor to hold a GitHub account with write access and Decap requires an identity
> provider [...]; the per-entry holding branch and publish path; the admin shell and the
> toolkit primitives; the public-surface snapshot gate that holds the seams; and the skill.

Same rule as B1, worse instance: four semicolons, and the first item is six times the length
of the last, so the list is not parallel either. "the differentiator first" is the document
telling the reader how it ordered its own list, which the front door cannot carry
(`docs-register.md:52-53`, no prose about the docs' own writing).

Rewrite:

> The magic-link editor login is what a developer would most likely have to build. Keystatic's
> GitHub mode requires each editor to hold a GitHub account with write access, and Decap
> requires an identity provider. Beside it cairn ships the per-entry holding branch and
> publish path, the admin shell and its toolkit primitives, the public-surface snapshot gate
> that holds the seams, and the agent skill.

**B3. `docs/internal/record/2026-09-04-the-cairn-case.md:192-206` (Leg 2, DERIVABLE) - six
consecutive headless fragments, a list rendered as prose.**

Six sentences in a row with no finite main verb governing the opening noun phrase, each
fronting an abstract nominalisation, two carrying their own setup colons. Under the front-door
register this fails the legibility floor (`docs-register.md:337-339`): an intelligent
non-developer cannot parse "Transactions across entries, per-row permissions, and multi-writer
merge, none of which cairn has" as a sentence, because it is not one.

Rewrite (first three, as the pattern):

> A database enforces validation at the store. cairn's fieldset validates in the admin
> instead, so a commit made outside the admin meets only the build's manifest regeneration.
> A database also keeps referential integrity in real time, where cairn checks references at
> build and guards deletes. Transactions across entries, per-row permissions, and
> multi-writer merge have no cairn equivalent at all.

**B4. `docs/internal/record/2026-09-04-the-cairn-case.md:47` and `:55` (Traditional setup,
DERIVABLE) - prose about the document's own method, in text bound for the front door.**

> Its advantages, stated as facts. (47)
> Its costs, stated as facts. (55)

The universal contract bans prose about the docs' own writing (`docs-register.md:52-53`). On
a front-door page the reader has no `[opinion]`/`[verifiable]` apparatus in view, so "stated
as facts" is either invisible or reads as the page congratulating itself on fairness. The
matched pair also sets up the steel-man symmetry as a visible scaffold. In the record itself
the labels are defensible; they must not survive derivation.

Rewrite: delete both labels and let the paragraphs open on their content.

> The membership product supplies event registration with payment, recurring dues with
> renewals and reminders... (47)
> The same people use two interfaces and two logins where the two products are separate, and
> the member record lives in the vendor's store. (55)

The same applies to `:104` ("stated exactly"), `:284` ("each with its caveat"), and `:417`
("in its true form"), all of which are derivable-section labels narrating method.

---

## Warnings

**W1. Lines 157-238 (Leg 2, DERIVABLE) - flat cadence.** CV 0.451, lowest in the document;
one sentence under 13 words in 32; three consecutive 28-word sentences at lines 184, 186,
188, each built subject-comma-apposition-`so`/`and`. Fix by breaking one of the three and
letting a short sentence land. At line 184:

> Write access to content is the GitHub App's private key, a credential with a rotation
> procedure, so the attack surface moved from a database to a key.

becomes

> Write access to content is the GitHub App's private key. The attack surface moved from a
> database to a key, and the key has a rotation procedure.

**W2. Lines 715-717, 770-771, 799 (record) - summary in place of argument.** Detailed in
section 4b. The tables carry the argument; three separate paragraphs announce what the tables
are about to say and then restate them. Cut lines 715-717 to one sentence and delete line 770
outright, since the table above it already says it.

> The size ratio has two halves: what one more section costs, and what the developer never
> writes.

and at 770, delete "The sentence the two halves support: a developer adding a section pays a
measured increment and does not write the first table's modules." The two tables state this.

**W3. Semicolon load carrying the banned elaborative tail.** 77 in prose, 38 derivable-section
sentences affected, ten sentences with two or more. `docs-register.md:56-58` names the tail as
the tell regardless of glyph. Highest-value targets after B1 and B2: lines 325 (90 words,
three semicolons - this one is a data dump that should be a table, given the document builds
tables elsewhere for less), 476 (134 words, three semicolons), 807 (75 words, three
semicolons).

For line 325, the four outages are a table in a document that already tables everything else:

> | Date | Duration | Scope |
> | --- | --- | --- |
> | 2025-06-12 | up to 2 h 28 min | Workers KV, Access, the dashboard |
> | 2025-11-18 | about 2 h 10 min, restored 17:06 UTC | CDN, Turnstile, Workers KV, Access, the dashboard |
> | 2025-12-05 | about 25 min | 28% of applications behind the network |
> | 2026-02-20 | 6 h 7 min | a BYOIP route withdrawal |

**W4. `:371` (Leg 3, DERIVABLE) - 67-word sentence, setup colon, three chained `and` clauses.**

> A custom admin screen mostly consumes the toolkit: each toolkit component assembles daisyUI
> classes from cairn's own blessed set and keeps its layout in a scoped `<style>`, ships
> pre-compiled in cairn's admin stylesheet, and the skill tells an author to load it before
> touching `/admin` routes, toolkit components, or `cairn-admin.css`, and to finish with
> `npx cairn-audit` rather than with DaisyUI knowledge.

The subject changes mid-sentence (from "each toolkit component" to "the skill") without a new
sentence, which is a comprehension break, not just a rhythm one.

Rewrite:

> A custom admin screen mostly consumes the toolkit. Each toolkit component assembles daisyUI
> classes from cairn's own blessed set, keeps its layout in a scoped `<style>`, and ships
> pre-compiled in cairn's admin stylesheet. The skill tells an author to load it before
> touching `/admin` routes, toolkit components, or `cairn-admin.css`, and to finish with
> `npx cairn-audit` rather than with DaisyUI knowledge.

**W5. `:417` (Leg 4, DERIVABLE) - the load-bearing claim of the leg is a 61-word,
two-semicolon sentence.** This is the sentence the whole leg turns on, and it is the hardest
one in the section to read. It should be the easiest.

> A directive in a cairn content file names a site-owned component and a small declared
> attribute set. What that component looks like lives in code, changes for every page at
> once, and cannot be overridden per occurrence. An island is the contrast: it carries its
> props in the file, which is per-occurrence configuration living in the content.

**W6. `:128` and `:362` - verbatim repeated sentence across two derivable sections.** "The
engine has no vendor and no support contract; the developer is the support." Keep it at
line 128 where it lands in the Leg 1 drawbacks. At line 362, either cut it or point back:
"The support question, above under Leg 1, applies to the platform choice too."

---

## Suggestions

**S1. `:38` - the first sentence of the first derivable section is 48 words.** It is the
reader's first contact with the argument and it carries three coordinate structures.
Consider splitting after "in its own interface".

**S2. `:657` and `:822` - both "Derivable form" paragraphs open with the identical string**
"One production site, built by the engine's own author,". Vary the second.

**S3. The five-label leg template** (`Claim` / `Reasoning and evidence` / `Counter-evidence a
skeptic cites` / `Drawbacks` / `Counterweight`, 46 bolded labels in all) is **correct for the
record** and I am not flagging it there - it is what makes the steel-man auditable and it is
the reason the document survives a hostile read. Flagging only the derivation risk: if the
labels or their order survive onto `why-cairn.md`, the page will read as a filled-in rubric.
The derivation should carry the content and drop the frame.

**S4. `:608` - second consecutive caveat on the same table.** "A commit here is one
conductor-batched agent change; the counts describe the record's shape and not effort" repeats
the caution already given at line 599 ("the classification is a judgment"). Cut one.

**S5. Abstract triads at `:116`, `:352`, `:365`, `:803`.** Four cadence-driven three-item
lists in 10,000 words. Inside tolerance; noted only so a later pass does not add a fifth.

---

## Categories with no findings

- **Em and en dashes**: zero in 937 lines.
- **Connector openers**: zero in 286 sentences.
- **Participial frame openers**: zero (the six gerunds found are grammatical subjects).
- **Marketing and machine vocabulary**: zero true positives across a 54-term sweep.
- **Grading words**: zero.
- **"Not X, it's Y" contrast frames**: one, and it is a factual correction rather than a frame.
- **Hedging**: 31 instances, all attached to real measurement imprecision.
- **Exclamations**: one, inside a cited paper title.

---

## Grades

**Derivable sections: B.**
The vocabulary, openers, and dash discipline are as clean as I have seen in a document this
long, and four of six sections carry human cadence variance; the grade is held down by four
list-sentences (`:143`, `:384`, `:371`, `:417`) and one six-fragment paragraph (`:192-206`)
that carry the register's own named killed cadence straight into the text the front door will
inherit, plus two method-narration labels (`:47`, `:55`) the front door cannot carry at all.

**Whole document: B+.**
As a contributor-zone record the visible five-label template and the method narration are
load-bearing rather than tells - they are what makes the steel-man auditable and the evidence
falsifiable - and the record sections have the best cadence in the file; the half-grade comes
off for the three scaffolding paragraphs around the size tables (`:715-717`, `:770`, `:799`)
that announce and restate what the tables already say.

---

## Verdict

Yes, with reservations: this reads as written by the register's plausible human author almost
everywhere, and the four setup-colon list-sentences and the six-fragment paragraph are the
only passages where a careful reader would say a machine assembled the shape rather than
argued it.
