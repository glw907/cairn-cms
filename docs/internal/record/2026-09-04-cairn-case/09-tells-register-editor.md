Write is disabled in this session (read-only, and my own instructions forbid report files), so the full report is below rather than at the scratchpad path.

---

# Register review: `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-04-the-cairn-case.md` (v4, 937 lines)

Exemplars held in ear: the ratified `/var/home/glw907/Projects/cairn-cms/docs/why-cairn.md` opener and the front-door section of `/var/home/glw907/Projects/cairn-cms/docs/internal/docs-register.md`. Derivable sections graded against those; the rest against the contributor-zone register, where most schema scaffolding is legitimate.

## 1. The two `Derivable form` paragraphs are single 80-95-word comma-chained sentences (657-663, 822-827)

These are the only finished prose the document hands the front door, so they are likeliest to be lifted verbatim, and neither is a sentence a person would write or say. Line 657-663 carries five parallel clauses plus a reflexive numeric triad (20/16/6) behind a semicolon. Family: list cadence, semicolon chain. It reads as a model compressing a table.

Proposed derived form, from facts already in the section:

> I built the membership and assets admin for one club site in two days, as an overnight agent run, then spent eight weeks refining it: 42 commits on those routes. Half of them were layout work on shapes the engine's toolkit has since absorbed, so a site starting today starts further along than I did. That site's member login, payments, and signatures are its own code, not cairn's, and the one blocker that reached production was a CSRF defect at the seam between the two.

Same treatment for 822-827: break at the semicolon and at "with"; three sentences, one fact each.

## 2. "A multi-vendor shape fails in parts, and a single-platform shape fails whole." (340)

Balanced halves — the residue Geoff catches most. Perfect antithesis, matched clause lengths, tagged `[opinion]`, doing the work of evidence in a paragraph that just spent fifteen lines on real outage durations. Also an overstated universal: the 2025-12-05 incident named four lines above took 28% of applications, not "whole."

> When Cloudflare goes down, a cairn site goes down with it. The traditional shape loses one piece at a time instead, and that is a real difference the reader should weigh.

## 3. Setup-colon payoff with a five-item semicolon inventory (145-151)

"What cairn ships that the developer would otherwise install or write elsewhere, the differentiator first: ...; ...; ...; and the skill." The setup-colon list cadence named in the register's universal contract and its Killed list, plus a spec-sheet inventory, plus an announcement of ordering that tells the reader how to grade.

> The difference that matters is sign-in. Keystatic's GitHub mode wants every editor to hold a GitHub account with write access, and Decap wants an identity provider; cairn sends the editor an email. Past that, cairn brings the holding-branch publish path, the admin shell and its primitives, the snapshot gate that keeps the seams from moving, and the agent skill. A developer assembling the same thing writes or installs each one.

## 4. Announcement scaffolding that grades the document's own honesty (15-16, 47, 55, 70-71, 346, 715, 773)

Virtue claims and meta-lines. **47** "Its advantages, stated as facts." and **55** "Its costs, stated as facts." — the demonstration is the following sentences or it is nothing; delete both labels and let the paragraphs run. **70-71** "The cairn shape has its own treadmill, and it is stated here in the same terms" → "cairn has its own treadmill. The engine published 87 releases between `0.22.0` and `0.96.0`…". **346** "The outage is conceded and named here rather than left for a reader to supply" — the docs admiring their own writing, explicitly banned; delete, the paragraph above already named it. **15-16** "Nothing here is a pitch" is fine in a record preface but must not derive: a front-door page that says it is not a pitch is pitching. **715-717** and **773-774** are the same shape (announcement + balanced halves), internal, lower severity.

## 5. The bolded-label skeleton, identical across every leg (87, 92, 104, 116, 123, 134, 139, 161, 165, 178, 192, 208, 227, 241, …)

**Claim / Reasoning and evidence / Counter-evidence a skeptic cites / Drawbacks / Counterweight**, five beats per leg, same order every time. Defensible in the record — it is an argument schema built to be attacked. The finding is about derivation: nothing derived may carry these labels, and more importantly nothing derived should carry their *order*, because a page that answers an objection the reader has not raised sounds defensive.

Same family, machine vocabulary that must not leak: "steel man" (17), "**Claim, in its true form**" (418), "**What the admin is for, stated exactly**" (104), "**The sentences the record supports**" (645), "the efficacy half of this leg is a hypothesis" (342), and "partition" (507, 653, 818, 836) — a house term used four times, defined nowhere, and absent from the vocabulary table at 895-937 that exists to catch exactly this.

## 6. "X, never Y" as a punctuation habit (45, 66, 111-114, 205, 216, 279, 304, 341, 344, 432, 435, 449, 802, 808, 814, 911, 918-919, 932, 937)

The "not X but Y" frame in appositive dress, roughly twenty times. At that density it stops reading as precision and starts reading as a tic. Worst in derivable prose: **66** "those are disclosure counts, never incident rates on small sites" → "Those are counts of disclosed vulnerabilities. Nobody has measured how often a small site is actually breached." **432** "community-documented, never an official disclosure" → "This comes from support forums and third-party guides, not from the vendors." **45** → "So what follows describes what these products do, not who sells them." Keep it where the negation is load-bearing (114, 111); thin it elsewhere.

## 7. Flat spec-sheet cadence in Leg 3's evidence run (284-320)

Thirteen consecutive sentences of one shape: noun phrase, present verb, a number, a bracket. This is the register's second failure mode (flat prose that merely avoids marketing). The derivability line at 270-271 already says every vendor number becomes a link, which disposes of most of the paragraph. Derived form should be cairn's own reasoning with links carrying specifics:

> A cairn site runs on one Cloudflare account: the site on Workers, the sign-in store in D1, media in R2, sign-in mail through Email Sending. Two of those have edges worth knowing before you start. Email Sending is still in public beta and needs the $5 paid plan to mail arbitrary addresses, and editor sign-in depends on it, so an unverified sender means nobody can get in. D1 handles one query at a time per database, which is right for a club's roster and wrong for anything with real write concurrency. The current limits live on Cloudflare's own pages, which is where they should be read, since they move.

## 8. Tag density, and `[opinion]` doing two jobs (worst case 38-53)

Four sentences in a row at 38-45 and four more at 47-53 each end in `[opinion]`. In the record the tags earn their interruption; in derivable prose they break rhythm on every sentence. Worse, a reader who reads them learns the wrong thing: 47-53 describes what a membership product supplies, checkable against any vendor's feature page, and is tagged `[opinion]` because it was uncited, not because it is a judgment. That equivocates on the document's own tag vocabulary and undercuts the promise at 20-22. Fix in the record by splitting judgment from uncited-but-checkable. For derivation the tags come off by kind: published-docs paths become descriptive in-text links; internal paths, `CLAUDE.md`, and grep commands disappear; `[supported:]` becomes inline attribution ("Patchstack's 2026 report counts 11,334 new WordPress vulnerabilities, 91% of them in plugins"); `[opinion]` disappears and, where load-bearing, the derived sentence owns it in first person, which is the ratified voice.

## 9. Crafted pivots and cappers (121, 216, 346, 446, 462, 655)

**462-464** "The trade is deliberate: content and design separate by construction…" → "That is the trade cairn takes on purpose. A component's appearance lives in code, so changing a theme changes every page at once, and no editor can drift one page away from the rest." **121** "Conceded, and corrected above." / **216** "All conceded." / **446** "…conceded." — the same word three times as a paragraph-ending gesture; one may stay, and in derived prose a concession is a sentence: "Most WordPress users are not fighting the block editor; in the 2023 survey, 45% said the site editor met their needs." **655** "The reader draws the inference" — a capper that hands the reader homework; delete in derivation.

## 10. Participial and connector openers (92, 211, 278, 311)

**278** "Counted, the cairn shape is one Cloudflare account…" is the least human construction in Leg 3 → "Count the accounts and cairn's shape is four or five: Cloudflare, GitHub, a payments provider, organizational mail, and a registrar unless DNS moves to Cloudflare." **92** "Left at the scaffold's defaults, the adapter yields…" → "Out of the box, before a developer writes anything, the adapter gives you an editor-first CMS." Two "therefore" openers at 211 and 311; the second → "So editor sign-in rides on a beta product, on the paid plan."

## 11. Logic and truth-adjacent

- **Heading 268 versus body 278-280.** The leg is titled "one platform for a small team"; its own evidence counts four or five accounts and concedes vendor count is equal against a bundled product. The heading over-claims. Derive the claim the body holds: one *hosting* account instead of several.
- **72.** "'Consumers must' appears 202 times" — a true count doing argumentative work it cannot carry; no denominator tells the reader how many touched any given site, and the honest answer (a pinned site keeps serving) sits two sentences later. Flagged for the claims checker.
- **145-148.** Cites two competitor doc pages with "the two vendor pages not fetched this pass," under the differentiator sentence. A citation-shaped claim leaning on unread sources; must be fetched before it derives.
- **128-129 duplicated verbatim at 361-363** ("The engine has no vendor and no support contract; the developer is the support"). Echo across sections; keep the Leg 1 instance.
- **111-112** "cairn ships none of them, on purpose." The posture tail of the "cairn deliberately isn't X" family. Soft flag — the charter makes it true; prefer dropping the tail unless the derived page has established the charter.

## 12. Minor, record-only

**239** "### And why markdown" — heading on a conjunction, verbless fragment; in derivation it is a paragraph, not a heading. **216-219** three passive "was found" in four lines, and the pattern repeats across nine sentences at 870-880. **632-633** restates the table directly above it. **770-771** setup colon + restatement + balanced halves in one line.

---

## Verdict

The derivable sections do not yet read as a person's argument; they read as a well-disciplined research instrument, which is what the record was built to be, and that is the problem handed forward. The evidence is honest, the concessions are real, and the tag apparatus has kept the prose free of marketing slop, but the sentences arrive in one shape (assertion, inventory, bracket) and the paragraphs in one order (claim, evidence, objection, drawback, counterweight), so a reader hears a form being filled rather than a developer explaining his choices. Two lines in derivable territory would be caught on sight by anyone holding `why-cairn.md` in ear: the antithesis at 340 and the setup-colon inventory at 145-151. The single change that would move the draft most: write the derivation in first person from scratch rather than deriving by subtraction from these sentences. The ratified front-door voice is "Before cairn, every content change on the small sites I run ended up as my git commit," and this document's strongest material — the 42 classified commits, the CSRF defect at the seam — is first-person experience currently written in third person to make it gradeable. Grade it here, then say it as the person who did it.

---

**Five-line summary**

1. Write is disabled for this session; the full ranked report is inline above, not at the requested scratchpad path.
2. Top derivable-section tells: the two `Derivable form` paragraphs (657-663, 822-827) are 80-95-word comma-chained single sentences; the balanced-halves antithesis at 340; the setup-colon five-item inventory at 145-151.
3. Pervasive habits: "X, never Y" roughly twenty times; virtue-claim labels ("stated as facts," 47/55) and self-admiring meta (70-71, 346); the identical five-beat bolded skeleton per leg; a thirteen-sentence spec-sheet run at 284-320.
4. Tags interrupt badly in derivable prose and `[opinion]` equivocates between judgment and merely-uncited (47-53); logic flags at heading 268 vs 278-280, the "202 Consumers must" count at 72, two unfetched competitor citations at 145-148, and a sentence duplicated verbatim at 128-129 and 361-363.
5. Verdict: the derivable sections read as a research instrument, not a person's argument; derive in first person from scratch rather than by subtraction from these sentences.