# Proposal review, lens 3: would the system succeed

Adversarial review of `docs-standard-proposal.md` revision 1 (Opus, fresh context, 2026-09-08). Folded into revision 2.

---

## Ranked findings

**1. The numeric gates contradict the evidence base this same system built.** (Lines 39, 73–76, 141–146: "Keep the average sentence between 15 and 20 words," a Vale rule that "fails any sentence over the ceiling," a page-average warning at 22, and tellgrader "exits non-zero, so a docs gate can run it.")

`~/.claude/skills/writing-voice/evals/research/2026-09-01-ai-tell-evidence-base.md` §3.3: "**Grade dispersion, never the mean.** No published CV threshold exists; calibrate locally." Its Top-20 list puts "sentence-length mean" under **Deliberately excluded**, alongside paragraph-length uniformity and every other unbaselined structural metric. §5.3 is explicit about the gate question: lexical grading correlates with human judgment at r = 0.25–0.48, AUPRC 0.52–0.55, and "**Use the tell scan as a diagnostic score and trend line, never a pass/fail quality gate.**" §3.7–3.9 states that no published baseline of any kind exists for the class of measure the proposal wants to gate. The proposal cites plainlanguage.gov's numbers as "what makes them enforceable" without noting that the plain-language 15-to-20 figure is a readability heuristic for public-facing government forms, not a finding about register in technical prose.

Change: strike the Vale average rule and the ceiling rule, and keep tellgrader's cadence measures in `--hook`/report mode only. Gate the lexical checks (which have effect sizes: participial tails at 527% of human, not-X-but-Y at 0.04/1k human baseline) and report everything else as a table the reviewer must read.

**2. The proposed bands would reject their own calibration specimens, including Geoff's ratified prose.** (Line 39 vs. the round-2 table.)

RFC 9110 §1.1 measures mean 25.6; PostgreSQL "About" 23.2. Both fail "average 15 to 20." RFC 9110 also measures two-beat 44% and CV 0.19 — outside the cadence expectation and below the flatness floor tellgrader already applies. Most damaging: comparison-2's P1 row records the **ratified-good opener**, Geoff's own account, as "3 sentences, mean 27, no sentence under 8 words," and rules "No cadence change is warranted." That paragraph fails the proposal's headline rule by 7 words. `docs-register.md`'s own reviewer guidance already anticipates the consequence: "Over-firing is a defect equal to missing… A finding whose rewrite merely paraphrases is not a finding."

Change: any band must be validated by running it against the full specimen set first; a band that fires on a ratified specimen is invalid by construction, and this one does. State that validation as a precondition in the proposal.

**3. The bands rest on roughly 107 sentences from five documents.** (Line 79: "Each register gets a band set by its specimens.")

Round-2 specimen sizes: 32, 26, 25, 9, 15. Round 1: 16, 13, 8, 8. Two of the proposed band edges come from a 9-sentence sample. The "19 to 44 percent" comma-hinged band the proposal quotes (line 195) is so wide that the failing draft's 58% and the passing rewrite's 39% sit on the same side of most of it, and the 0–16% short-sentence band derives from four documents where two report 0%. This is not a measurement; it is four data points with a range drawn around them.

Change: no band becomes a gate below ~1,000 sentences per register drawn from ≥10 documents, with the interval reported. Until then bands are advisory locators, which is exactly how comparison 1 used them successfully ("the metric is a locator and not a verdict").

**4. Goodhart: the proposal gates the two dimensions that have already been gamed and leaves the next one free.** (Lines 78–80.)

Round 1 optimized two-beat share down and produced staccato (27% under eight words against a 0–16 band). Round 2 optimized short-share and mean back up and produced the page Geoff still rejected. The proposal's response is to gate both numbers simultaneously. The free dimension moves, it does not close. The predictable third artifact is the uniform subordinated mid-length sentence: every claim carrying its qualification in a `because` / `which` / `since` / `after which` clause, 16–19 words, CV inside the band, zero lexical tells. Comparison-2's landed rewrite already reads that way — "Because what that component looks like lives in code…", "…which defers the risk rather than removing it, since sooner or later…", "…for which I have no figure and offer no estimate" — and it would pass every gate the proposal proposes. No proposed gate detects it; the tell scanner has no subordination check and Vale cannot express one.

Change: say plainly in the proposal that the gates cannot catch a monotone and that only the human read can, and stop describing the three as a net that "holds this standard against the drift."

**5. Root-cause fit: the fact-provenance mechanism is the only one aimed at a named cause, and it is honor-system.** (Lines 96–97, 117–119, 155–157, 163–169.)

Two observations. First, `front-door-net-failure.md` does not actually name fact provenance as a cause; its "Measured" section is entirely Vale scope, tellgrader's lexical resolution, and missing exemplars, and the invented specimen appears only in `docs-register.md`'s withdrawal note. The proposal's causal story is broader than the record it cites. Second, and worse: enforcement of "a claim with no source in the brief is a blocking finding" is assigned to `prose-voice-reviewer` and `cairn-register-editor`, both Claude, both same-family as the drafter. The evidence base §5.2 names this directly: self-preference bias 0.78 against a 0.5 baseline, self-recognition ~73.5%, "**Pick a judge from a different family than the model under test** — same-family judge and subject share blind spots." The hook (line 156) only *warns*. So the load-bearing part is "Claude will follow the rule," which is the mechanism that just failed.

Change: make provenance mechanical. Every author-fact sentence on the front door carries a footnote id resolving to a line in the brief; a script fails on a missing or dangling id. That is checkable without judgment and cannot be graded away.

**6. The human gate is a promise, not a gate.** (Lines 81–84: "before a page reaches you, I read it myself, in full"; line 124: the thin-conductor exception.)

A first-person commitment by a session that will not exist next week, carried by a memory paragraph (lines 179–183). This repo's own CLAUDE.md, under "Watch items," rules on exactly this shape: "**prose in a backlog is the weakest form and the fallback, never the default**," and "Converting a watch into a failing test is the gold standard: it cannot be forgotten." Nothing in the proposal detects a page that reached Geoff unread. Note also that Claude *did* read the front door and graded it B+; a read alone is not the gate, a read against specimens is.

Change: the read produces a committed artifact — a receipt beside the page carrying the page's content hash, the measured table, and the named specimens quoted. `check:prose-read` fails when a published page's hash has no matching receipt. That is the repo's stated gold standard applied to the one mechanism the proposal leaves as prose.

**7. Co-writing one section per read contradicts the attended-time rule, at the scale proposed.** (Lines 100–104, 120–122.)

Global CLAUDE.md: "Interaction is batched and front-loaded, never minimized… After approval, execution runs to completion with no per-task check-ins." A section-by-section co-write of the front door is defensible; it is one page, high-stakes, and the owner's own voice is the content. Generalizing it to a docs pass over the published tracks ("It runs one page per read, the way the front door will") converts a front-loaded budget into dozens of sittings, and the proposal offers no ceiling on them.

Reconcile: front-load two sittings (ratify the specimen set; approve the brief), co-write only `why-cairn.md` and the track READMEs, and run everything else autonomously with the receipt gate. The failure being answered was one page by one reader; the remedy should not be a standing per-page tax.

**8. The docs pass is churn against pages nobody has complained about, and it is scoped wrong.** (Lines 99–104: "A dozen extend pages sit between 53 and 67 percent"; "The extend track goes first.")

Measured just now over `docs/extend/*.md` (1,402 sentences): mean 21.2 words, two-beat 49%, longest sentence 98 words. The mean already exceeds the proposed 15-to-20 band for the whole track, so the rewrite target is not a dozen pages, it is all 31. The specimens setting the target register are SQLite's scope page, a systems paper, and an RFC — argumentative front-door prose, not task guides. The evidence base §5.4: "Argumentative and interpretive prose carries the register tells at over 2× the rate of procedural prose" (68% vs 32%), so the extend track is the lowest-yield target in the docs and the proposal schedules it first, on a band derived from a genre it is not in.

Change: hold the pass. Rewrite one worst-case extend page against a *task-guide* specimen set (Stripe, Django, SvelteKit how-tos), show Geoff before and after, and let that single result authorize or kill the rest.

**9. Adding rules to a stack that already contains the rules will not change the outcome.** (Lines 128–131, 112–124.)

The output style already bans the contrast frame, reflexive tricolons, the setup-colon payoff, connector and participial openers, restating the point at a paragraph's end, scaffold headers, the definitional pivot, and flat cadence, and requires one idea per sentence. The draft carried none of those and Geoff hated it anyway. Comparison 1 states the mechanism outright: "the mechanical gate grades lexicon and punctuation, and Section A was **evidently written to pass it**." Prohibitions shape what a model avoids; they do not shape what it produces, and a longer prohibition list produces a narrower avoidance envelope, which is a description of monotone. The skill itself already knows the fix: "imitating an exemplar beats consulting a rule… **the exemplars are the stronger attractor**."

Change: make the drafting turn carry 3–5 full human specimens in context as required input, saved locally with sources, and delete rather than add from the prohibition list. Adding the three new named tells (two-headed heading, abstract-noun subject, self-disclaimer) to the output style is cheap and fine; treating it as a mechanism is not.

**10. The proposal's self-test proves nothing, and it repeats the front door's own error.** (Lines 3, 185–202.)

"If this page reads well to you, the standard works on at least one page." The front door also passed every measurement offered on its behalf. My independent measurement of the proposal returns mean 14.5 words, below its own 15-to-20 floor, in a document that is largely lists and short declaratives written for a different reader in a non-published register. Also, the decision list (lines 206–210) is numbered 1, 2, 3, 5, 4.

Change: drop the self-test framing. The only evidence that would move this is the same page written both ways and read blind.

## The single mechanism worth keeping, and the theatre

**Keep, if only one:** the specimen-grounded adversarial review — the register editor must fetch and quote named human specimens in the page's genre, report the measured table beside the verdict, and a grade with no specimen quoted does not count (lines 78–84, 136–138, and the net-failure record's third bullet). It is the only mechanism with a demonstrated hit: dispatched once with five fetched specimens, it located the defect exactly and produced the paragraph-level diagnosis Geoff's complaint had not. It works because specimens are attractors and locators at once, and it degrades gracefully — a wrong band wastes a paragraph, a wrong gate rewrites a track. Run it cross-family where possible (evidence base §5.2).

**Theatre:** the memory paragraph (lines 179–183). It cannot fire, cannot fail, duplicates what `docs-register.md` already records in more detail, and is precisely the "prose in a backlog" this repo's watch-item rule names as the weakest possible carrier. The Vale average-sentence-length rule (lines 73–76, 158–161) is worse than theatre: it is an active gate that fails two of five calibration specimens and the owner's own ratified paragraph.

## Verdict

The proposal misdiagnoses a taste failure as a measurement gap and answers it by promoting four unbaselined statistics to gates, three of which its own evidence base explicitly excludes from gating and two of which reject the specimens they were derived from, including Geoff's ratified opener. Its two mechanisms aimed at the named causes — fact provenance and a human in the loop — are the two left as unenforced prose, so the load-bearing element is still "Claude will follow the rule," while the enforceable elements all point at cadence, which is the symptom that has now produced two distinct new defects in a single day under exactly this optimize-to-a-number method. Adopt the specimen-grounded review and a mechanical provenance check, convert the human read into a committed receipt a gate can verify, and cut the numeric bands to reported diagnostics and the docs pass to one demonstration page.
