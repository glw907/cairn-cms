# Adversarial review, round 5: the cairn case (v6)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `3485b0bb`, 971 lines. Read in full:
the subject, the round-4 review (12), the v5 tells regrade (11). Standards consulted: `CLAUDE.md`
("What cairn is"), `what-cairn-is-and-is-not.md`, `docs-register.md` (vendor-link rule, Killed
list, the no-pitch keystone), `architecture.md`, `add-a-second-audience.md`. Spot-checks ran against
`cairn-cms` at `3485b0bb` and `aksailingclub-org` at `836d324` (clean tree), read-only, on
2026-09-04. Eight URLs were fetched live. Nothing was edited.

---

## Part 1: the fold check

### Round 4's 21 ranked changes

| # | Change | Status | Answering line |
| --- | --- | --- | --- |
| 1 | Outage paragraph and table | FOLDED | 334-351. Seven own postmortems, two named as not touching Workers, two as control surfaces, a three-row table titled by scope. |
| 2 | Recount the three window rows | FOLDED | 599, 601, 602. 37; 1,361/158; 1,595/98. Every window tag carries `00:00` and the date-only clause is at 583-584. |
| 3 | Keystatic Cloud in the sign-in comparison | FOLDED | 151-158. Rewrite adopted verbatim with the Cloud page cited. |
| 4 | Registrar against the DNS sentence | FOLDED | 296-298 "unless the registration itself moves to Cloudflare Registrar". 328 stands. |
| 5 | Cut the duplicated Leg 3 facts | FOLDED | "beta" once in Leg 3 (307), `E_SENDER_NOT_VERIFIED` once (311), Workers Builds once as a deploy fact (434). The spec-sheet run is compressed into one link sentence (316-325). |
| 6 | Restore three missing spaces | PARTIAL | 163, 420, 449 are fixed. A new one arrived at 158-159: "Leg 3 carries what that costs.Past that". It sits at the seam of change 3's insertion. |
| 7 | README cite and the `why-cairn.md` conflict | FOLDED | 131-132 tags `README.md:10-13` and `why-cairn.md:77`; open question 6 at 907-909. The README range is one line off (the `npm create` line is 9, Node 24 is 13, `wrangler` is not in 10-13), which does not change the claim. |
| 8 | Name the Cloudflare account and the GitHub App | FOLDED | 384-389. `wrangler.toml:4` and `CLAUDE.md:255` both carry against the tree. |
| 9 | Platform backup facts before the docs gap | FOLDED, with a defect | 373-380. The grep description now matches the claim. The Time Travel sentence says "on every plan", which the cited page contradicts (see Part 3). |
| 10 | Person shift in the first derivable form | FOLDED | 686 and 690-692, both rewrites verbatim. |
| 11 | Killed-sentence reference | FOLDED | 124-127 "a sentence of the same family the register killed". Register line 377 carries the family sentence. |
| 12 | Preface inputs and the commit count | FOLDED | 28-32 lists round-3, round-4, the audience lens, and both tells reviews. 808 reads "about 4,000" (4,032 today). |
| 13 | Align Leg 2's counterweight on ownership | FOLDED | 242-245. |
| 14 | Name the alternatives' editors in Why markdown | FOLDED | 275-277. Both pages fetched: Keystatic's document field is "a highly customisable rich text editor"; Tina's page says "a simple WYSIWYG editor". |
| 15 | Five vocabulary rows | FOLDED | 967-971, all five. |
| 16 | Rate limit as a floor | FOLDED | 213-214 "at least 5,000". The page: minimum 5,000, scaling by 50 per repository and user, capped at 12,500. |
| 17 | W3Techs dates | PARTIAL, and round 4 was half wrong | 470 reads "read 2026-09-04". 226-227 keeps "data dated 2026-09-05". The page fetched today does stamp itself "W3Techs.com, 5 September 2026", so the CMS tag is defensible and round 4's "no stamp visible" was a fetch miss. The two tags now describe the same source two ways. |
| 18 | Cut one of the two table caveats | FOLDED | "the classification is a judgment" returns zero hits; 637 keeps the batching caveat. |
| 19 | Cut two method lines | FOLDED | Both phrases return zero hits. |
| 20 | Cite one vendor page per `[uncited]` tag | MISSED, unrecorded | Ten `[uncited]` tags remain (42-62, 294). "Where this document argues with the reviews" (855-871) does not mention round 4, so the decline is not on the record. |
| 21 | Deploy fact in Leg 2 as a sentence | FOLDED | 181-182. |

Twenty of 21 folded or partially folded. One missed and not argued.

### The v5 regrade's items (11)

| Item | Status | Answering line |
| --- | --- | --- |
| BL1 three missing spaces | PARTIAL | As change 6: the three are fixed, a fourth arrived at 159. |
| WA1 Leg 3 counterweight paragraph | FOLDED | 429-438 takes the rewrite through "Three things it cannot write for you." The capper it proposed was itself cut by round 4's change 19, correctly. |
| WA2 second derivable form | FOLDED | 847-853, the rewrite verbatim. |
| WA3 first derivable form person shift | FOLDED | 690-692. |
| SU1 spec-sheet run | FOLDED beyond the ask | The fifteen-sentence run is one sentence of links (316-325). Leg 3 fell from 71 sentences to 53 on my splitter. |
| SU2 second caveat | FOLDED | As change 18. |
| SU3 "on the site's side of the line" | FOLDED | Zero hits; 849-850 reads "are the site's, not the engine's". |

### The three recounted case-report rows, reproduced

All commands ran as `git -C /var/home/glw907/Projects/aksailingclub-org ...` at `836d324` with the
document's own stated bounds, `--since='2026-07-06 00:00' --until='2026-07-08 00:00'`.

| Row | Document | Reproduced |
| --- | --- | --- |
| Commits touching the three routes or `src/admin-club` | 37 | 37 |
| Routes numstat | 1,361 added, 158 deleted (621/124, 740/34) | 1,361/158; per day 621/124 and 740/34 |
| Sixteen-module numstat | 1,595 added, 98 deleted | 1,595/98 |
| Module split | eight by end of 07-07; `ledger` 07-13; seven on 07-14 | `member-format`, `ui` on 07-06; `assets-store`, `classes-store`, `club-action`, `club-email`, `club-settings`, `payments` on 07-07; `ledger` 07-13; the other seven 07-14 |

Also reproduced in the same run: whole-repository commits 42 and 151 on the two days (round 4
reported 150 for the 7th; 151 is what the document's `23:59:59` bound returns today); first commits
`cc4edd3` (07-06) and `a6d3c05` (07-07); 42 later commits on the routes and 81 on `src/admin-club`;
route lines 1,704, 1,203, 326; the sixteen modules at 3,879; `81634ca` at +395/-345; authors 799,
29, 10 over 838 commits, 2026-07-06 to 2026-08-30; the commits' timezone `-0800`; every one of the
sixteen named commit hashes with the subject the prose summarizes.

### The outage table and the postmortem count, against the blog tag

The tag page lists seven Cloudflare-attributed postmortems in the window: 2025-06-12, 07-14,
08-21, 09-12, 11-18, 12-05, and 2026-02-20. The document's seven match, its two "did not touch a
Workers-hosted site" match (07-14, 02-20), its two "control surfaces only" match (08-21, 09-12),
and the three-row table is the remainder. The table's scope column is consistent with its heading.
"Three in six months" holds (06-12 to 12-05).

One clause does not reproduce cleanly. "And two for external ones" undercounts the tag: the page
also carries quarterly disruption reviews (2025-10-28, 2026-01-26, 2026-04-28, 2026-07-28), the
Afghanistan shutdown post (2025-09-30), the Portugal and Spain power outage (2025-04-28), and the
`.de` DNSSEC post (2026-05-06). Round 4 named the last two as "the two", and both fall outside the
stated window. The clause is not load-bearing. It should say "and posts about other providers'
incidents", or go.

### Keystatic Cloud

`keystatic.com/docs/cloud`, fetched today: "allowing team members to edit content without needing a
GitHub account", and Keystatic Cloud "lets you connect to GitHub and authenticate". The document's
sentence, "its hosted Cloud mode lifts that by routing editors through Keystatic's own service", is
the correct reading. Confirmed.

---

## Part 2: six readers

### (a) The skeptical computer science professor

**Verdict.** "The arithmetic closes, the table agrees with its heading, and the comparison read the
second mode. I found one new factual error and two citation defects, none of which is a matter of
judgment."

**New attacks.**

1. **The D1 restore window is plan-scoped and the document says otherwise.** Line 373-374: "to any
   minute in the last 30 days on every plan". The cited page, fetched today: 30 days on Workers Paid,
   7 days on Workers Free. The reviewer who proposed the sentence wrote "every plan" and the document
   adopted it unchecked. A cairn site is on Workers Paid for email anyway, so the practical claim
   survives, but the sentence as written is false and it is in derivable text.
2. **"87 numbered releases" reproduces from the changelog, not from `git tag`.** `CHANGELOG.md`
   carries 87 `## 0.x.y` headings from `0.22.0` to `0.96.0`, of which 86 are distinct numbers and
   three are release candidates. `git tag` carries 70 tags in that range and no `v0.22.0`. The tag
   cites both. Either cite the changelog alone and say the count includes release candidates, or
   recount.
3. **Self-referential tags.** "[verifiable: the table]" (351, 676) and "[verifiable: this section's
   commands]" (692) point at the document itself. They are honest pointers, but a tag that names its
   own document as the checkable source is not what the preface defines the tag to mean. Point at the
   three URLs, or at the commands by name.

**Vocabulary note.** None.

### (b) The working SvelteKit web designer

**Verdict.** "The Keystatic page is cited, the difference is stated the way I would state it, and the
editors' rich-text alternatives are named. I trust the comparison now."

**New attacks.**

1. The splice at 158-159 sits exactly where I read most carefully: "Leg 3 carries what that
   costs.Past that, cairn brings". It is one character, and it is in the sentence that opens the
   list of what cairn brings.
2. The first Leg 1 evidence sentence is still 49 words with the seven-primitive parenthesis, and the
   next is 36. Not a fold failure; the derivation note from round 4 still applies.
3. The "developer's other option" paragraph now reads right end to end. Keystatic's two modes, Decap's
   backend, cairn's own sender, then the cost pointer to Leg 3. That is the order a designer would
   argue it in.

**Vocabulary note.** None. "snapshot gate" is in the table.

### (c) The world-weary IT admin

**Verdict.** "Ownership names all three accounts now, and the backup paragraph finally says what the
platform gives before it says what the docs owe. Then it tells me the 30-day window is on every plan,
and it is not."

**New attacks.**

1. The Time Travel plan error, as (a).1. An admin who budgets on the free plan and reads this line
   gets 7 days, not 30. Say "on the paid plan a cairn site already needs".
2. The backup grep description at 378-380 lists three of the hit classes and stops. The grep also
   returns "restore the role name", "restores the live version", "shape backup", and the concept
   figure's own "backup" line. The claim, "no procedure", holds on every hit. Add "among other
   unrelated matches" so the description is complete.
3. The repetition is gone. Email Sending's beta status, the paid plan, and the sender error each
   appear once in Leg 3. Read back, this time.

**Vocabulary note.** None.

### (d) The nonprofit board member approving a budget

**Verdict.** "The three blank lines are filled. File storage has its link. GitHub is free for a
private repository. The accounts are the developer's, all three, and the document says whose they
should be is our decision. I can write the sheet."

**One attack.** The restore line, again. A board member reads "on every plan" as a reason not to
buy the paid plan. The same sentence should say the paid plan is already required for sign-in
email, so the 30-day window comes with it.

**Vocabulary note.** "point-in-time restore" is not in the table. Plain: "put the database back
the way it was at any minute in the last 30 days".

### (e) The small-business owner who just wants a working website

**Verdict.** "Same as last time, and now the word 'scaffold' has a meaning in the table. I need a
developer to start. I can edit from an emailed link. When the hosting is down there is nothing to
do."

**No new attack.** The Leg 1 drawbacks paragraph is still the fourth sub-heading of the first leg.
That is a derivation question, and the document already says the derivation lifts it.

**Vocabulary note.** None.

### (f) The AI-writing expert reading for tells

**Method.** Tags stripped, code spans and URLs collapsed, tables excluded, split on terminal
punctuation followed by a capital. Same splitter as round 4, so compare against round 4's table, not
against 11's.

| Section | n | mean | CV | max | 12w or fewer | 35w or more |
| --- | --- | --- | --- | --- | --- | --- |
| Traditional setup (derivable) | 24 | 19.9 | 0.539 | 38 | 29% | 8% |
| Leg 1 (derivable) | 24 | 30.5 | 0.633 | 89 | 12% | 29% |
| Leg 2 (derivable) | 29 | 24.6 | 0.612 | 56 | 17% | 24% |
| Why markdown (derivable) | 11 | 25.3 | 0.583 | 62 | 9% | 18% |
| Leg 3 (derivable) | 53 | 23.8 | 0.517 | 53 | 23% | 19% |
| Leg 4 (derivable) | 22 | 22.3 | 0.614 | 52 | 32% | 18% |
| Leg 5 (record) | 19 | 39.4 | 0.919 | 121 | 26% | 42% |
| Case report (record) | 13 | 30.4 | 0.870 | 113 | 23% | 23% |
| Already extensible (record) | 30 | 31.3 | 0.552 | 82 | 7% | 33% |
| Arguing with reviews (record) | 12 | 18.6 | 0.666 | 43 | 42% | 8% |
| Open questions (record) | 22 | 23.9 | 0.836 | 88 | 36% | 23% |
| Derivable set | 162 | 24.4 | 0.619 | 89 | 22% | 20% |
| Whole | 206 | 25.9 | 0.725 | 121 | 22% | 22% |

**Cadence.** The two flat sections recovered. Leg 3 went from 0.460 to 0.517 and lost six
sentences, because the spec-sheet run became one sentence of links. Leg 4 went from 0.435 to 0.614,
with a third of its sentences now short. The derivable band is 0.619, back where v4 stood before
the semicolon splits, and this time the variance came from short sentences landing rather than from
long ones surviving. The whole file: zero em or en dashes, zero connector openers, zero ", never"
appositives, seven "never" in all. ", not Y" appositives are at five (three in v5). Watch it; do
not add a sixth.

**The two first-person paragraphs.** The first (685-692) runs 20, 15, 12, 25, 30, 18, 8. It lands
twice, once in the middle and once at the close, and it holds the person through the disclosure.
The second (847-853) runs 13, 29, 15, 30, 14. It opens on a situation ("I run a club site on
cairn"), alternates, and closes on the disclosure. Both read as the person who did the work.

**New tells.** One fragment, "Three things it cannot write for you." (432), which is authorial and
earns its place. "So what follows describes" (48) opens on a connector; it is the only one in the
file and it is inside a paragraph, so I record it without asking for a change. One trailing space
at 351 and the splice at 159 are the file's only mechanical marks.

**Vocabulary note.** None.

---

## Part 3: the grade

### `[supported]` tags (ten in v6)

| Citation | Carries? | Note |
| --- | --- | --- |
| Patchstack 2025 (7,966; 96%; 33%) | carries | Unchanged; vendor stated |
| Patchstack 2026 (11,334; 91%; 46%; five hours) | carries | Unchanged; vendor stated |
| W3Techs CMS (58.9%, "data dated 2026-09-05") | carries | The page stamps itself "5 September 2026" today; the date is the page's own |
| W3Techs Elementor (12.8%, about 31%, "read 2026-09-04") | carries | Unchanged figures; the two W3Techs tags now describe the source two ways |
| WordPress 2023 survey (n=3,922; 45.1%; 28.6%) | carries | Unchanged |
| SWE-bench Live (48%; under 10%; never) | carries | Unchanged |
| SecureVibeBench, CodeRabbit, Veracode | carries | Each with its caveat |
| METR 2025 | carries | Unchanged |
| METR 2026 | carries | Unchanged |
| Borg et al. | carries | Unchanged |

Ten carry. None is partial this round.

### `[verifiable]` and `[uncited]` tags, spot-checked (about one in three of 192)

**Carries, against `cairn-cms` at `3485b0bb`:** 202 "Consumers must"; 37 dependencies and 4 peers;
18 export subpaths (19 keys less `./package.json`); MIT; a `bugs` field and no support field;
`v0.96.0` on 2026-08-22, `v0.82.0` on 07-07, `v0.89.0` on 07-21, `v0.90.0` on 07-23; every
`src/lib/*/` line count (1,149; 10,710; 24,595; 825; 2,267; 10,139; 1,697; 4,378; 2,302; 1,508;
1,315; 2,655) and the 68,644 total; 446 `.test.ts`; 33 scripts among 40 files; `SKILL.md` 114 and
1,255 over eight files; `check-skill.ts:15,38,123`; `ROADMAP.md:74`; `own-your-domain.md:115`;
`why-cairn.md:23-26,53,77`; `email.ts:79-101`; `index.ts:8-11` and `ToolbarDisclosure.svelte:3`;
`CHANGELOG.md:3495`; `HISTORY.md:351-356,561`; `signups/` 45 plus 45 and the 9-line migration;
`MEMBER_DB` beside `AUTH_DB` and `APP_DB` in the showcase config; the Killed list's family sentence
at register line 377; `none` capability with `home` and `createAuthChannel` in the second-audience
page; "SvelteKit + Cloudflare, fully" and "build-time over a committed manifest" in the charter;
the write path, `cairn/<concept>/<id>`, and the committer in `architecture.md`; "exactly ten" and
the `tone` attribute; `commit.failed` with `conflict`; `admin-toolkit.md:22-26`;
`SKILL.md:3,10,90-97`; `theme.css:9-11,69`; `svelte.config.js:1`; `healthz/` and `cairnManifest`
in the scaffold page; $5, about $6, and the unconfirmed certificate in `before-you-start.md`; the
delete guard and build-time check in the references page; "sends nothing" in the announce page;
both record files at their paths; `CLAUDE.md` account id and "a single installation"; the 03
evidence file's 1E, Priority 2, Priority 3, and its 200-a-day line; the 02 file's open question 7.

**Carries, against `aksailingclub-org` at `836d324`:** everything in Part 1's reproduction, plus
`wrangler.toml:4`; `CLAUDE.md:255`; `STATUS.md:17-28`; `auth.ts:6-14,279` and `src/member-auth`
at 914; `status-archive.md:160,557-558,624-625,1924,1931,1941`; `HISTORY.md:9-12,102,117,151,153,
198-200`; both harvest documents at the cited lines; `grep -ri hours docs/` at fourteen;
`hooks.server.ts:18,54`; `CairnAdminShell` in the admin layout; every route line count in the
section table and the Stripe route at 127; `src/routes/admin/club` at 12,415; the eleven specifier
counts exactly; the fourteen toolkit symbol counts exactly.

**URLs fetched, carries:** the outage tag (seven own postmortems in the window); Keystatic Cloud;
Keystatic's document field ("rich text editor"); Tina's markdown page ("WYSIWYG editor"); the
GitHub rate-limit page (minimum 5,000); the Email Service page ("Beta"); W3Techs (58.9%, stamped
5 September 2026).

**Fails or does not reproduce:**

| Tag | Finding |
| --- | --- |
| "D1 offers point-in-time restore to any minute in the last 30 days on every plan [time-travel page]" | The page: 30 days on Workers Paid, 7 days on Workers Free. |
| "87 numbered releases from `0.22.0` to `0.96.0` [CHANGELOG.md, `git tag`]" | 87 changelog headings including three release candidates; 70 tags in that range and no `v0.22.0`. The changelog half carries, the tag half does not. |
| "and two for external ones [blog tag]" | The tag carries seven posts about other providers' incidents or quarterly reviews; the two round 4 named fall outside the window. |
| `README.md:10-13 (Node 24, npm, wrangler)` | Node 24 is at 13, `npm create` at 9, `wrangler` not in the range. The claim holds. |
| "returns the CSRF guard's Origin restore, key-rotation prose, and an email-normalization example, and no procedure" | Also returns four unrelated "restore" and "backup" verbs. "No procedure" holds on every hit. |

**`[uncited]` tags (ten).** Unchanged in kind. Honest labels for unchecked claims, and round 4's
change 20 to convert them was not taken and not argued.

### `[opinion]` tags

Labelled where a reader would otherwise take them as fact. Round 4's two exceptions are both
resolved: the registrar sentence is now correct, and Leg 2's ownership sentence matches Leg 3's.
No new exception found.

### Per-leg grades

| Leg | Logic | Evidence | Honesty | Prose |
| --- | --- | --- | --- | --- |
| The traditional setup | B. The 202 count still has no denominator. | B. Every number reproduces except the tag half of the 87-release citation; the ten `[uncited]` tags are unchanged. | A-. Unchanged. | B+. CV 0.539, no semicolons. |
| Leg 1 | A-. The comparison now reads both Keystatic modes and states the difference correctly. | A-. Both competitor pages carry; the README range is a line off. | A. The `why-cairn.md` conflict is recorded as open question 6. | B+. CV 0.633; the 89-word inventory sentence and the splice at 159. |
| Leg 2 | A-. Unchanged. | A. The rate limit is a floor; the deploy fact is a sentence. | A. Ownership aligned with Leg 3. | B+. CV 0.612. |
| Why markdown | B. Unchanged. | B+. The alternatives' editors are named and both pages carry. | A-. Unchanged. | B+. |
| Leg 3 | B+. The table agrees with its heading; the registrar count agrees with the DNS sentence; the account count is right. | B. Every outage fact reproduces; the Time Travel plan claim is false; the "two external" clause undercounts. | A-. All three accounts named; platform backup stated before the docs gap; each operational fact once. | B. CV 0.517, up from 0.460; the spec-sheet run is a link sentence; "Three things it cannot write for you" lands. |
| Leg 4 | A-. Unchanged. | B. Unchanged. | A-. Unchanged. | B+. CV 0.614, up from 0.435, a third of sentences short. |
| Leg 5 | B+. Unchanged. | A-. All nine table rows reproduce against the stated window; the per-day parenthetical sums to its total. | A. Disclosure in first person throughout; the spend and the owner's time both stated as unrecorded. | B. The 121-word "What cairn carries" sentence survives; record-only. |
| Already extensible | B+. Unchanged. | A-. Every recounted number reproduces. | A-. Ownership aligned. | B. Two setup-colon lists over semicolons remain in record text; the second derivable form now carries the person. |

### Overall: B+

Up from B. The three items round 4 named as the gap are all fixed and verified: the outage table
is consistent with its heading and with the blog tag, the three case-report rows reproduce exactly
against the document's own window, and the sign-in comparison reads Keystatic Cloud and cites it.
Honesty is now A or A- on every leg. What keeps it from A- is one false sentence in derivable text
(the Time Travel plan scope), one splice defect at a fold seam, a citation whose `git tag` half does
not reproduce, and an unrecorded decline of one round-4 item. Each is a one-line fix and none is a
judgment call.

### Comparison with round 4, per leg

- **Traditional setup.** Logic B to B. Evidence B to B (the 87 tag's `git tag` half offsets
  nothing new). Honesty A- to A-. Prose B+ to B+.
- **Leg 1.** Logic B+ to A- (Keystatic Cloud). Evidence B+ to A- (the README tag now supports the
  claim). Honesty A- to A (the conflict is on the record). Prose A- to B+ (the splice at 159).
- **Leg 2.** Logic A- to A-. Evidence A- to A (the floor). Honesty A to A. Prose B+ to B+.
- **Why markdown.** Logic B to B. Evidence B to B+ (the editors named). Honesty A- to A-. Prose B+.
- **Leg 3.** Logic C+ to B+ (the table and the registrar). Evidence B- to B (the outage count is
  right; the Time Travel plan claim is new and wrong). Honesty B+ to A- (accounts and backup).
  Prose B- to B (variance recovered, duplicates cut).
- **Leg 4.** Logic A- to A-. Evidence B to B. Honesty A- to A-. Prose B to B+ (CV 0.435 to 0.614).
- **Leg 5.** Logic B+ to B+. Evidence B to A- (the rows reproduce). Honesty A- to A (the person
  holds). Prose B to B.
- **Already extensible.** Logic B+ to B+. Evidence A- to A-. Honesty B+ to A-. Prose B to B.

### Ranked changes

1. **Correct the Time Travel plan scope.** (correction) Line 373-374: "D1 offers point-in-time
   restore to any minute in the last 30 days on the Workers Paid plan a cairn site already needs,
   and 7 days on the free plan; R2 documents no equivalent [verifiable:
   https://developers.cloudflare.com/d1/reference/time-travel/, read 2026-09-04;
   https://developers.cloudflare.com/r2/, by absence]."
2. **Restore the space at 159.** (correction) "Leg 3 carries what that costs. Past that, cairn
   brings".
3. **Record round 4's disposition in "Where this document argues with the reviews".** (addition)
   One sentence after the round-3 sentence: "Round 4 ranked twenty-one changes. This document takes
   twenty and declines the twenty-first, one vendor page per `[uncited]` tag, because the traditional
   setup is described by capability and a named vendor page would tie each sentence to one product
   [opinion]." Or take the change. Either is fine; silence is not.
4. **Fix the 87-release citation.** (correction) Line 77-78 and 808: "87 numbered changelog
   entries from `0.22.0` to `0.96.0`, three of them release candidates [verifiable: CHANGELOG.md
   `## ` headings]". Drop `git tag` from that tag, or recount to the 70 tags it returns.
5. **Reword the external-postmortem clause.** (rewording) Line 335: "and posts about other
   providers' incidents", or cut "and two for external ones".
6. **Align the two W3Techs tags.** (rewording) Both as "the page's own stamp, 2026-09-05, read
   2026-09-04". The stamp is real; the two tags should describe it the same way.
7. **Widen the README range.** (correction) `README.md:9-13` (`npm create`, Node 24); drop
   `wrangler` from the parenthetical or cite where it appears.
8. **Complete the grep description.** (addition) Line 378-380, append "and four unrelated
   'restore' and 'backup' verbs".
9. **Replace the self-referential tags.** (rewording) 351 "[verifiable: the three postmortems
   above]"; 676 and 692 "[verifiable: the case-report table's commands]". Trailing space at 351.
10. **Add one vocabulary row.** (addition) "point-in-time restore: put the database back the way it
    was at any minute in the last 30 days".

**Verdict: SOUND.** The structure, disclosures, and evidence base hold. Every fold round 4 asked
for is in and verified, including the three that held the grade at B. What remains is one false
plan-scope clause adopted from a reviewer's own text, one splice character, and a citation that
half reproduces. None needs another adversarial round; a fold verification of items 1 to 4 is
enough.

**Does v6 meet the B+ exit criterion?** Yes. It grades B+, with items 1 and 2 above as the fixes to
land before derivation.
