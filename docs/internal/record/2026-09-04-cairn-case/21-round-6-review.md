# Adversarial review, round 6: the cairn case (v8)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `5a03cd06`, 1,229 lines. Read in
full: the subject, the round-5 review (13), the owner's round-8 notes (20), evidence files 15, 17,
18, 19, the five files under `16-measured-build/`, and sections 2, 3, and "found nothing" of 14.
Standards consulted: `CLAUDE.md` ("What cairn is"), `what-cairn-is-and-is-not.md`,
`docs-register.md`, `architecture.md`, `add-a-second-audience.md`. Spot-checks ran read-only
against `cairn-cms` at `5a03cd06`, the `experiment-screen` worktree at `27a9e1f5`, and
`aksailingclub-org` at `836d324`, on 2026-09-05. Twenty-six URLs were fetched live. Nothing was
edited. Line numbers are the subject's.

This round reviews the new material: "The shape, not only the product" (177-232), the redrafted
Leg 3 (353-525), the population paragraph (677-708), the second case and the whole-system
paragraph (850-928), and the revised study reading in Leg 5 (609-664). Rounds 1 to 5 are not
repeated except where a fold regressed.

---

## Part 0: round 5's ten changes, checked

All ten landed. Time Travel now reads "30 days on Workers Paid and 7 days on Free" (467-469) and
the limits page carries both figures. The space at 167-168 is restored. Round 4's disposition is
recorded (1093-1097). The release count reproduces: 87 changelog headings, one of them `0.95.0-rc.1`,
70 plain tags plus 3 release-candidate tags in range, first tag `v0.24.0` (83-87). The external
postmortem clause reads "other providers' incidents" (434). Both W3Techs tags describe the stamp the
same way. The README range is 9-13. The grep description was shortened rather than completed, which
satisfies the intent. The self-referential tags at 433, 852, and 1252 now point at the postmortems
and the case-report table. The point-in-time restore row is in the vocabulary.

One fold regressed by omission. Open question 8 (1162-1166) still says "nothing yet measures one
screen's effort in isolation" and asks whether to build a measured example. The second case is
that example. The question is answered by the document's own section and should say so.

---

## Part 1: six readers on the new material

### (a) The skeptical professor

**Verdict.** "The measured build is the best evidence in the document and it reproduces to the
second. The paragraph built on top of it does not survive its own citations."

**Attacks.**

1. **The whole-system premise is false against the section it cites.** Line 909-912: "Every
   published design in the studies above keeps one human in the inner loop of one task"
   [verifiable: 14 sections 2 and 3; 17 section 4]. Section 2 of file 14 carries Vibe Code Bench
   (100 specifications, 16 models, whole deployed apps judged by a browser agent, best 61.8%), the
   month-long hackathon (LLM-generated code only, "no manual edits", 21 of 40 projects deployed),
   and the OpenAI Codex paper (over 10% of users running three or more concurrent agents weekly;
   25.6% sending eight-hour asks). None of those keeps a human in an inner loop. The regime the
   paragraph describes, parallel agents and long delegations, is visible in the telemetry the
   document already banked. What is absent is narrower: a controlled, gated, scaffold-based
   delivery with cost. Say that.
2. **"Gates stand in for a reviewer in the loop" is contradicted by the measured build one page
   earlier.** The first pass cleared every gate named in the spec (check 0/0, 157 e2e passed,
   three engine gates). The Opus reviewer then found five blocking items the gates did not see,
   including a scaffold leak and baselines the run had rewritten. In the owner's regime a reviewer
   is in the loop; it is a model, not a person. The sentence should say "a reviewer model and the
   gates stand in for a human reviewer," which is what the record shows.
3. **"Deliveries on record" counts a stopped build as a delivery.** Line 918-920 lists "this
   screen in 35 minutes with a review that stopped it." A screen the review stopped is not a
   delivery. It is a measurement of one pass. Move it out of the delivery list or rename the list.
4. **A forecast is not evidence.** Line 920-921: "A Go server is expected in four or five calendar
   days and is not yet a delivery [opinion]." An expectation about unfinished work has no place in
   a document graded on evidence. Cut it, or move it to the open questions as a measurement to
   record when it lands.
5. **The Constraint Decay reading misplaces the inference.** Line 624-625: "An agent handed a
   convention it must infer from the codebase infers it badly." Constraint Decay is greenfield.
   There is no codebase. The conventions the agent fails to honor are the framework's, held in its
   training, and the paper's title names its own headline: capable configurations lose about 30
   points from the baseline prompt to the fully specified task (19, 3.1, "lose 30 points on
   average"). More explicit specification made the agents worse. That finding bears directly on a
   remedy of "make the conventions explicit" and the document does not mention it. Read the paper
   body before the restructure; this review saw the finding only through the evidence file.
6. **"[supported: the two studies above]" on the interpretive sentence (625-626) is partial.**
   Constraint Decay blames implicit conventions. BaxBench attributes the framework effect to
   language popularity and framework complexity (19, 3.2). Only one of the two says inference.
7. **"This stack" (702) has no referent that the next sentence allows.** "Agents are the normal
   way this stack is now built" is followed by "SvelteKit is named in none of these sources." The
   evidence file's own narrowest sentence says "the mainstream typed web stack." Use those words.
   And "normal way" is stronger than the telemetry: file 17 section 2 carries Stack Overflow 2025,
   agents daily 14.1%, 52% not using agents at all. The document does not carry that number against
   its "normal" and should, or should soften to "a common way."
8. **"The vendors' own data show they do not build it well without a gate" (702-703) overstates
   an absence.** File 17's sentence is that the telemetry "does not support 'agents build it well
   without a gate.'" No study varies gate presence. The document's form asserts a measured result
   where the evidence file records a gap.

**Vocabulary note.** "gate" and "reviewer" are used as if interchangeable in the whole-system
paragraph and as distinct in the second case. Fix the paragraph, not the table.

### (b) The SvelteKit designer

**Verdict.** "The shape section is the one I would send a colleague. The measured build tells me
what an agent does with the skill, and the review is what I would have written. The tandem
principle is right, and it is stated as an opinion, which is honest."

**Attacks.**

1. **The forward reference at 230.** "Constraint Decay and BaxBench, above" points down. Both
   studies are introduced in Leg 5, 400 lines later. A reader of the derivable shape section meets
   two names with no antecedent. Say "in Leg 5."
2. **Next.js does not "carry the hard parts."** The section's opening (196-197) defines the shape
   as frameworks that carry the hard parts and leave the domain, then leads with Rails and Vercel.
   Next.js carries routing and rendering, not auth, sessions, or an admin. It belongs in the
   section as a vendor benchmark, but under a different sentence.
3. **The tandem principle is stated once as an opinion (887-891) and then relied on as a rule.**
   The measured build shows one divergence resolved by copying the exemplar. One case supports
   "this happened," not "the agent resolves it by copying whichever it read last." Keep the
   principle; tag the mechanism as the hypothesis the tandem gate would test.
4. **The review as evidence reads right.** The five findings are summarized without softening,
   the reviewer's own sentence is quoted, and the escalation verdict is stated. That the review
   itself said "the honest reading is narrow" and the document carries the narrow reading is the
   strongest honesty move in v8.

**Vocabulary note.** "escalate" as a review verdict is not in the table. Plain: "the reviewer
stopped the change and sent the decision up."

### (c) The IT admin

**Verdict.** "Leg 3 finally reads like an ops page: what the plan gives, what it does not, what
the exits are, who holds the account. Then it tells me the app moves as-is when I leave, and it
does not."

**Attacks.**

1. **The tie paragraph contradicts itself (488-495).** "Everything above that layer moves as-is:
   the SvelteKit app, the theme, the chassis copy, the site's own screens, and the content files."
   Two sentences later: "Moving the layer is a rewrite of every binding the engine and the site
   reach." The site's own screens reach D1 through the bindings (`+page.server.ts` on
   `platform.env`). They do not move as-is. And the charter the tag cites says the engine has "no
   framework- or host-agnostic layer" and "reaches for D1/R2/Workers directly." So the SvelteKit app
   does not move as-is either, because its engine dependency runs only on Cloudflare. The honest
   sentence: the content files, the theme, the chassis copy, and the screens' markup move; every
   data access in the site's screens is rewritten; and the engine itself does not move, so leaving
   Cloudflare means leaving cairn or porting the engine. That is a bigger tie than the paragraph
   states, and the counterweight (the exports, the MIT package, the repository) still answers it.
2. **The "Cloudflare / Wrangler" tag (415-417) cites a file that is not in the repository.** The
   repo `CLAUDE.md` has no such heading. The heading is in the author's workstation `CLAUDE.md`.
   The repo file does carry the claim at line 86 ("Cloudflare MCP ... Prefer it over the
   dashboard"). Re-point the tag or a checker will report it missing.
3. **Defaults, SLA, backup, and ownership carry.** All ten Leg 3 URLs I checked reproduce: 348
   cities and 50 ms; 7-day log retention on Paid and 3 on Free; 3,000 free build minutes; Time
   Travel 30 and 7 on the limits page; single-threaded D1 and the 10 GB cap; the Business SLA and
   the "as is" terms; the move-domain page (re-add, repoint, reissue, Registrar support request);
   the $696.1 million quarter; 81 million requests a second; the W3Techs proxy and DNS shares. The
   D1 export blocking note is on the page. "The limits move. Read them on Cloudflare's own pages"
   is the right instruction.
4. **The bill sentence (390-392) omits the Pro zone plan it just mentioned.** "$5 a month for
   Workers Paid, once per account, plus the domain" follows "the full managed rules are a $20 zone
   plan." Add "and $20 a month per zone if the full WAF is wanted," so the two numbers meet.

**Vocabulary note.** "zone" and "SLA" are not in the table. Plain: "the domain as Cloudflare
manages it"; "a written uptime promise with a refund if it is broken."

### (d) The board member

**Verdict.** "Five dollars a month plus the domain, no uptime promise at that price, a bigger
plan buys one, and the company is large and listed. I can put that on a sheet. The lock-in
paragraph I cannot approve, because it says two opposite things one line apart."

**One attack.** As (c).1. "Everything moves as-is" and "a rewrite nobody has sized" cannot both
go on the sheet. I need one sentence: what leaves with us, what has to be rewritten, and that
the cost of the rewrite is unknown. The counterweight paragraph (510-525) almost is that sentence.
Move its first two lines up and cut "moves as-is."

**Vocabulary note.** "bindings layer" is answered by the "bindings" row. "Registrar" is not in
the table. Plain: "the company you pay for the domain name."

### (e) The small-business owner

**Verdict.** "Nothing new for me and nothing worse. Five dollars a month, an emailed link to sign
in, a developer to start, and when the hosting company is down the site is down. The new part
about the AI building a screen in 35 minutes and a reviewer stopping it reads like something that
happened, not a promise."

**No new attack.** The whole-system paragraph is over this reader's head and is record-only, so
it costs nothing here.

**Vocabulary note.** None.

### (f) The AI-writing expert

**Method.** Same splitter as rounds 4 and 5: tags stripped, code spans and URLs collapsed, tables
excluded, split on terminal punctuation before a capital. Tags per sentence counted before
stripping.

| Section | n | mean | CV | max | 12w or fewer | 35w or more | tags/sentence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Traditional setup (derivable) | 24 | 21.4 | 0.553 | 47 | 25% | 12% | 0.92 |
| Leg 1 (derivable) | 36 | 20.3 | 0.605 | 47 | 31% | 19% | 0.75 |
| The shape (derivable, new) | 18 | 29.7 | 0.562 | 65 | 11% | 33% | 0.83 |
| Leg 2 (derivable) | 39 | 18.3 | 0.522 | 39 | 26% | 5% | 0.77 |
| Why markdown (derivable) | 13 | 21.2 | 0.310 | 32 | 8% | 0% | 1.15 |
| Leg 3 (derivable, redrafted) | 74 | 19.8 | 0.506 | 48 | 26% | 8% | 0.81 |
| Leg 4 (derivable) | 30 | 16.6 | 0.638 | 52 | 40% | 3% | 0.67 |
| Leg 5 head (record) | 51 | 28.3 | 0.665 | 94 | 22% | 29% | 0.82 |
| Case report (record) | 17 | 23.2 | 0.645 | 60 | 29% | 18% | 1.53 |
| Second case (record, new) | 27 | 28.0 | 0.967 | 141 | 33% | 26% | 0.70 |
| Already extensible (record) | 37 | 25.4 | 0.585 | 66 | 19% | 24% | 0.68 |
| Arguing with reviews (record) | 16 | 19.3 | 0.731 | 51 | 44% | 12% | 0.69 |
| Open questions (record) | 38 | 16.9 | 0.898 | 86 | 50% | 5% | 0.05 |

Paragraph cuts inside the new material: the shape's public record 11 sentences, mean 34.1, CV
0.492, 45% at 35 words or more; the population paragraph 12, mean 26.5, CV 0.437; the second
case to the fix round 19, mean 29.4, CV 1.065 (the 141-word review sentence at 872-885 drives
it); the whole-system paragraph 8, mean 26.0, CV 0.394, 1.12 tags per sentence.

**Cadence.** Leg 3 held its variance through a wholesale redraft (0.517 to 0.506) and gained 21
sentences, a quarter of them short. That is the redraft the document needed and it reads as an
operator's argument: "The limits move. Read them on Cloudflare's own pages." lands. The shape
section is the file's densest derivable prose: one sentence in three is over 35 words and one in
nine is under 12. It reads as a literature review, which is what it is. Two evidence sentences
could split (198-201, 208-214). The whole-system paragraph is the flattest new prose (CV 0.394)
and the most heavily tagged, and it is the paragraph the professor attacks; the two facts are
related, since every sentence is doing the same job at the same length.

**Whether the new prose reads as a person's argument.** Leg 3 does. The second case's first two
paragraphs do; the review paragraph is one 141-word sentence that reproduces the reviewer's five
findings as a semicolon chain, which is the reviewer's register imported whole. It should be five
sentences or a list. The whole-system paragraph reads as a position paper's abstract.

**Tells.** Zero em or en dashes. Zero connector openers. Eleven "never", two ", never"
appositives, seven ", not Y" appositives (five in v6; the two new ones are at 917 and 924). No
splice defects. One placeholder, `[fix round: pending]` (905), which is honest and should stay
until filled.

**Tag density as a readability cost.** 335 tags over about 470 sentences, 0.71 per sentence
across the file and above 0.8 in five derivable sections. In Leg 3 a reader sees a URL every
second sentence. The footnote restructure is the right answer; Part 3 carries the guidance.

**Vocabulary note.** None.

---

## Part 2: the grade

### `[supported]` tags in the new material, against the evidence files and the primaries

| Citation | Carries? | Note |
| --- | --- | --- |
| Rails Foundation, first report (198-201) | partial | 8 models, 21 tasks, 3 runs, 92% of 63, 92 against 87, six of 21: all on the page. "The authors calling small gaps run-to-run noise" is not on the page; "noise" appears nowhere. File 15 (A3) attributed the quote and was wrong. Cut the clause. |
| Rails Foundation, third report (202-205) | carries | 92% of 63 for $75; GLM 5.3 Flash 83% for $3.31; recall 41%; `rails/lemans` exists. |
| Vercel evals (205-208) | carries | Mid-tier lift, no lift at the top, last run 2026-08-31. The page's floor is $0.044 per eval, so "$0.35 to $2.68" is a subset; harmless. |
| Constraint Decay (615-619; 230-232) | partial | Percentages and root cause carry from Table 4. "80 greenfield backend tasks" omits the 20 feature tasks the paper also ran. "No frontier Anthropic model" understates: no Anthropic model at all. The 30-point loss from baseline to fully specified tasks is not carried; see (a).5. |
| BaxBench (619-621; 230-232) | does not | The abstract: the best model "achieves a mere 62% on code correctness," and exploits succeeded "on around half of the correct programs." The document inverts 62% into the failure share. The true failure share is about two thirds. File 19 (3.2) carries the inverted sentence and was the source of the error. |
| "[supported: the two studies above]" (625-626) | partial | Only Constraint Decay blames inferred conventions. |
| Quispe and Xu (679-682) | partial | 7,786,771 commits and 185,517 authors carry. The panel of 5,838 and +41 commits are v1 figures; the bare arXiv URL now serves v2 (5,346 developers; +35.1). Cite `2605.25438v1` or update the numbers. |
| Anthropic 400,000 sessions (682-686) | carries | Every figure and the "used or discarded" quote, dated 2026-06-16. |
| Microsoft rollout (690-692) | carries | +24.0%, tens of thousands, placebo -1.1%, no quality measure; authors right. |
| Liu et al. (692-696) | carries | 302,600; 6,299; over 15%; 1.95; 22.7%. |
| Li, Zhang, Hassan (696-698) | partial | 15 to 40 points and documentation above carry from 2507.15003. The 932,791 PR count belongs to the 2026-02 dataset paper (2602.09185); the cited paper reports 456,535. Attach the count to the right paper. |
| Bai et al. (698-699) | carries | Up to 30 times. |
| Lulla et al. (699-701) | carries | 28.64% and 16.58% at comparable completion. File 19 grades it "abstract only" while file 14 grades it high; the files disagree, the number carries. |
| "The studies above; 17, narrowest sentence" (701-705) | partial | See (a).7 and (a).8: "this stack" and "the data show" are stronger than the evidence file's own sentence. |
| Li et al.; Octoverse (705-708) | carries | TypeScript top for every agent; top by contributors. |
| W3Techs proxy and DNS (446-449) | carries | 25.1%, 84.6%, 18.1%. |
| Lovable CVE (647-650) | carries | CVSS 9.3, 2025-05-30, the dispute clause. |
| Wiz, Moltbook (650-653) | carries | 1.5 million tokens, 35,000 emails, 2026-01-31. |
| Deng, Fan, Meng (653-655) | carries | 200; 180; broken access control largest. |

Nineteen tags. Twelve carry, six partial, one does not. All seven defects are one-line
corrections. Two of them (Rails noise, BaxBench 62%) were inherited from the evidence files, so
the files need the same fix or the next fold re-imports them.

### `[verifiable]` and `[uncited]` tags in the new material, spot-checked (34 of about 95)

**Carries.** The measured build reproduces exactly: `27a9e1f5` at 31 files, 540 insertions, 0
deletions; 13 PNGs under `admin-visual.spec.ts-snapshots`; author timestamp `06:40:26Z`, eight
seconds before the stated last command; `06:05:43Z` to `06:40:34Z` is 34 min 51 s; `VOLUNTEER_DB`
in both `wrangler.jsonc` files outside the exclude markers; bare `requireEditor` in the three
handlers; four inputs with no `required` and no `type`; `config.mjs` rewrites only the auth and
app strings; `MIGRATION_DATABASES = ['AUTH_DB', 'APP_DB']` at `deploy.mjs:175`; "Gate it" at
`add-a-custom-admin-screen.md:30` with `createSectionAction` and `requireAccess`; the signups
screen on `requireOwner`, `formData`, `fail`. No fix commit exists on the branch, so the pending
slot is honestly pending. In the tree: `MEMBER_DB` at `examples/showcase/wrangler.jsonc:50`;
`ROADMAP.md:74`; the DMARC paragraph at `own-your-domain.md:115`; `svelte.config.js:1`;
`is-it-working.md`; the "Root" heading at `what-the-scaffold-wrote.md:94`; the three README
chapters; "Screen anatomy" and "Component contracts" in `SKILL.md` (39, 56); "SvelteKit +
Cloudflare, fully" in the charter; `HISTORY.md:9-12` (11 tasks, workflow mode, overnight) and
102, 151, 198-200 at `836d324`; 87 changelog headings, one rc, 70 plus 3 tags from `v0.24.0`.
Every Leg 3 URL in (c).3.

**Fails or does not reproduce.**

| Tag | Finding |
| --- | --- |
| `[verifiable: CLAUDE.md, "Cloudflare / Wrangler"]` (417) | The heading is in the workstation `CLAUDE.md`, not the repository's. The claim holds at repo `CLAUDE.md:86`. |
| `[verifiable: 14 sections 2 and 3; 17 section 4]` on "every published design keeps one human in the inner loop" (911-913) | Section 2 carries Vibe Code Bench, the hackathons, and the Codex concurrency figure. The claim is false against its own citation. |
| "Engine: cairn-cms `main` at 9bf7fcd3" (experiment-measurement.md) | `git merge-base experiment-screen main` is `3485b0bb`, four docs-only commits behind. Source is identical; the hash is not the branch's base. |
| `[verifiable: Leg 1, the same tags]` (192-193) | Self-referential, the kind round 5 asked to remove. |
| "the four pricing pages listed in 18, section 1" (392-393) | Section 1 is a table, not a list of four pages. Name them. |
| 18 section 2, "exactly these bindings: AUTH_DB and APP_DB" | The evidence file understates the showcase (it also binds `MEMBER_DB`). The document is right at 124-126; the file is not. |
| `own-your-domain.md:115` for "`p=reject`" (440-441) | Line 115 says "reject any mail ... your domain hasn't authenticated." The literal `p=reject` is not on the page. The claim holds; quote the page's words or the record file. |

**`[uncited]` tags (twelve).** Two more than v6, both in Leg 3's claim paragraph, both honest.

### `[opinion]` tags

Labelled where a reader would otherwise take them as fact, with one exception: "A Go server is
expected in four or five calendar days" (920) is a forecast, which no tag in the preface's scheme
covers. The tag is honest; the sentence should go.

### Per-leg grades

| Leg | Logic | Evidence | Honesty | Prose |
| --- | --- | --- | --- | --- |
| The traditional setup | B. Unchanged. | B+. The release count now reproduces both halves. | A-. | B+. |
| Leg 1 | A-. Unchanged. | A-. | A. | A-. The splice is gone. |
| The shape (new) | B. The forward reference at 230; Next.js under a sentence it does not fit; the tandem mechanism stated once as opinion and used as a rule. | B-. Rails "noise" does not carry; BaxBench inverted; everything else reproduces, floors stated as floors. | A-. Charm and the trailer floors are qualified in the text. | B. Mean 30 words, one sentence in three long. |
| Leg 2 | A-. | A. | A. | B+. Unchanged. |
| Why markdown | B. | B+. | A-. | B+. Unchanged. |
| Leg 3 (redrafted) | B. The tie paragraph says "moves as-is" and "rewrite of every binding the site reaches" of the same code, and understates the engine's host dependency against the charter it cites. | A-. Every vendor number checked carries; one tag cites a file outside the repository. | A. No SLA, beta email, no backup procedure, no account transfer, ownership named, "the limits move." | B+. CV 0.506 over 74 sentences through a wholesale redraft. |
| Leg 4 | A-. | B. | A-. | B+. Unchanged. |
| Leg 5 (new material) | B-. The whole-system premise fails against its own citation; "gates stand in for a reviewer" is contradicted by the measured build; a stopped build listed as a delivery; "this stack" without a referent; Constraint Decay read as codebase inference on a greenfield study, with its headline finding unmentioned. | B-. BaxBench inverted; Quispe on the wrong version; the AIDev count on the wrong paper; the measured build reproduces to the second and its review is reported whole. | A-. The review at equal weight, the rate-limit kill disclosed, the slot pending. The Go forecast and the uncarried Stack Overflow 14.1% are the lapses. | B-. The 141-word review sentence; the whole-system paragraph at CV 0.394 and 1.12 tags a sentence. |
| Already extensible | B+. Open question 8 is now answered by the second case and does not say so. | A-. | A-. | B. Unchanged. |

### Overall: B+

Held from round 5, on different ground. v6 earned B+ with a thin evidence base that all
reproduced. v8 has three times the `[supported]` base, a first-party measured build that
reproduces to the second, a Leg 3 that answers the lock-in question with exits and numbers, and a
review of its own evidence reported at full weight. Against that: seven citation defects in the
new `[supported]` set, one of them an inverted headline number (BaxBench) that appears in a
derivable section; one contradiction in Leg 3's lock-in answer, in derivable text; and a
whole-system paragraph whose premise its own citation refutes. Every defect is a one-line
correction or a cut. None requires new research. The grade stays B+ because the substance is
stronger than v6 and the defects are shallower than round 4's, and it does not rise because the
defects sit in the two paragraphs the owner's notes call the strongest new assets.

### Comparison with round 5, per leg

- **Traditional setup.** Logic B to B. Evidence B to B+. Honesty A- to A-. Prose B+ to B+.
- **Leg 1.** Logic A- to A-. Evidence A- to A-. Honesty A to A. Prose B+ to A-.
- **The shape.** New: B / B- / A- / B.
- **Leg 2, Why markdown, Leg 4.** Unchanged.
- **Leg 3.** Logic B+ to B (the tie contradiction is new). Evidence B to A- (every number now carries;
  the Time Travel error is gone). Honesty A- to A. Prose B to B+.
- **Leg 5.** Logic B+ to B- (the whole-system paragraph). Evidence A- to B- (four citation
  defects in the new studies; the measured build offsets but does not cancel). Honesty A to A-.
  Prose B to B-.
- **Already extensible.** Logic B+ to B+ with the open-question staleness noted. Others unchanged.

---

## Part 3: ranked changes, verdict, criterion, restructure guidance

### Ranked changes

1. **Correct BaxBench.** (correction) 619-621 and 230-232: "BaxBench, 392 tasks across 14
   frameworks, found that the framework chosen moves both correctness and security; the best
   model reached 62% correctness, and about half of its correct programs were exploitable, so
   roughly a third were both correct and secure [supported: Vero et al.,
   https://arxiv.org/abs/2502.11844, abstract]." Fix file 19, 3.2, in the same pass.
2. **Rewrite the tie paragraph.** (correction) 488-495: "The tie is the platform bindings layer
   and the engine that reaches it. The engine has no host-agnostic layer, so leaving Cloudflare
   means leaving cairn or porting it [verifiable: what-cairn-is-and-is-not.md, 'SvelteKit +
   Cloudflare, fully']. What leaves with the organization: the repository, the content files, the
   theme and chassis copy, and the markup of its own screens. What is rewritten: every data access
   in those screens, the adapter, and the engine's role. This document does not size that rewrite,
   and no one has measured it [opinion]." Cut "moves as-is."
3. **Rewrite the whole-system premise.** (correction) 909-913: "The controlled studies above
   measure one task with a reviewer in the loop. The telemetry sees long delegations and parallel
   agents (over 10% of Codex users running three or more at once; whole apps built from a
   specification and scored at 61.8% at best) and measures no gated, scaffold-based delivery with
   cost [verifiable: 14, section 2]." Then: "a reviewer model and the gates stand in for a human
   reviewer" (914-915). Drop the screen from the delivery list (919-920) or retitle the list
   "measurements on record." Cut the Go server sentence (920-921).
4. **Cut the Rails "noise" clause.** (cut) 200-201: end the sentence at "every run." Fix file 15,
   A3, which attributed the quote.
5. **Fix the two version and paper attributions.** (correction) 679-682: cite
   `https://arxiv.org/abs/2605.25438v1` or update to v2 (5,346; +35). 696-698: attach 932,791 to
   `https://arxiv.org/abs/2602.09185` or use 456,535 with the cited paper.
6. **Reword "this stack" and "the data show."** (rewording) 701-705: "agents are a common way the
   typed web stack is now built, and the vendors' own data do not show that they build it well
   without a gate; agents are used daily by 14.1% of Stack Overflow's 2025 respondents and by
   none of 52% [supported: the studies above; Stack Overflow 2025, via 17 section 2]."
7. **Fix the Constraint Decay reading.** (correction and addition) 615-626: "80 greenfield and 20
   feature tasks"; "no Anthropic model in the set"; replace "infer from the codebase" with "infer
   from the framework"; add the paper's own headline, that fuller task specification cost capable
   configurations about 30 points, and say what that implies for a written skill. Tag the
   interpretive sentence "[supported: Constraint Decay; BaxBench attributes the effect to
   complexity]." Verify the 30-point figure in the paper body first.
8. **Answer open question 8.** (rewording) 1162-1166: "Answered in part by the second case, one
   screen measured in isolation; the fix round completes it."
9. **Fix the forward reference and the self-referential tag.** (rewording) 230 "in Leg 5"; 192-193
   name the tags.
10. **Re-point the CLAUDE.md tag.** (correction) 417: "[verifiable: CLAUDE.md:86, 'Cloudflare MCP
    ... Prefer it over the dashboard']."
11. **Split the review sentence.** (rewording) 872-885 into five sentences or a five-item list,
    one finding each.
12. **Add the Pro zone plan to the bill sentence.** (addition) 390-392, as (c).4.
13. **Name the four pricing pages.** (rewording) 392-393, the Workers, D1, R2, and Email Sending
    pricing URLs, as the evidence file's own draft did.
14. **Correct the measurement file's engine hash.** (correction) `experiment-measurement.md`:
    "branched from `3485b0bb`; source identical to `9bf7fcd3`, which differs by four docs commits."
15. **Three vocabulary rows.** (addition) escalate; zone; SLA. Optionally Registrar.
16. **Fix 18 section 2.** (correction) "AUTH_DB, APP_DB, and the members fixture's MEMBER_DB."

### Verdict: SOUND AFTER FIXES

The structure and the evidence base hold, and the new material is the strongest the document
has carried. Two paragraphs need rewriting rather than patching: the tie (change 2) and the
whole-system premise (change 3). The rest are corrections a checker can verify in one pass. The
evidence files 15 and 19 carry two of the errors and must be fixed with the document, or the
next fold re-imports them.

**Does v8 meet the B+ exit criterion?** Yes, at B+, with changes 1 to 7 required before the
restructure moves any text, since a restructure that carries an inverted number and a
self-contradicting paragraph into footnotes buries them where a reader will not find them.

### Guidance for the footnote restructure

Keep in the prose every sentence that carries a decision the reader must weigh: the claim, the
reasoning, the counter-evidence, the drawbacks, and the counterweight of each leg, with the one
number each sentence turns on stated inline (five dollars, 34 minutes 51 seconds, 62%
correctness, three outages in six months, 25.1% of websites). Move to notes every tag, every
URL, every command, every secondary number that qualifies the inline one, and every study's
sample and method. Each note must be self-sufficient for a checker: the exact URL or path with
line numbers, the read date or the page's own stamp, the arXiv version where versions differ
(Quispe v1 against v2 is the standing example), the paper the count comes from where a dataset
has two papers, the command verbatim with its time bounds where a count depends on them (the
case-report window), the commit hash and the branch's merge-base for the measured build, and the
evidence-file section that banks the fetch. Keep the four-tag scheme inside the notes, so
`[opinion]` still marks only judgments and a note that says "supported" still names a sample. A
sentence that survives only because of its tag should go to the note with it. The vocabulary
table stays in the prose, because the board member reads it and not the notes. Fix the evidence
files (15 A3, 19 3.2, 18 section 2) in the same pass, because the notes will point at them and a
checker will read them next.
