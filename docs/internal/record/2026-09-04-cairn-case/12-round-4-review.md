# Adversarial review, round 4: the cairn case (v5)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `f6b4a12b`, 957 lines. Read in full:
the subject, the round-3 review (06), the owner's notes with the exit criterion (04), both AI-tells
reviews (09, 10), the head of the audience lens (07). Standards read: `CLAUDE.md` ("What cairn is"),
`what-cairn-is-and-is-not.md`, `docs-register.md` (keystone, universal contract, front-door section,
Killed list), `why-cairn.md`, `architecture.md`, `add-a-second-audience.md`. Spot-checks ran against
`cairn-cms` at `f6b4a12b` and `aksailingclub-org` at `836d324` (clean tree), read-only, on
2026-09-04. Nine URLs were fetched live.

What v5 folded from rounds 3, 9, and 10, and this review confirms: the author disclosure is in the
case report and both derivable forms; the module split reads eight and eight; the hours tag carries
its fourteen-line result; the two days pair with the unrecorded spend; backup, account ownership,
the beta-email dependency, the DMARC write, the deferred-failure sentence, the account count, the
no-support sentence, the no-developer sentence, and the developer-cost sentence are all present;
Leg 4 names islands; the general studies are cut to four with a pointer; magic-link leads the
comparison and the two competitor pages were fetched; the toolkit count reproduces exactly under
its new stated method; the consumer-site tags in derivable sections route through the evidence
file; the vocabulary table exists. From 09 and 10: both derivable forms are first person in five
and six sentences; the antithesis at old 340 is gone; the setup-colon inventories at old 143 and
384 are plain sentences; the six headless fragments are sentences; "stated as facts" and "in its
true form" are gone; "steel man" and "partition" are gone; the "X, never Y" habit is at zero;
semicolons fell from 77 to 30; the outage list is a table; the Leg 4 claim is three sentences; the
duplicate no-support sentence is a back-reference; "Counted," and "Left at the scaffold's defaults"
are rewritten; the heading of Leg 3 matches its body; "And why markdown" is "Why markdown".

Three folds introduced defects. The outage table pasted from 10's W3 sits under "the four that
did" and includes the row the sentence above it excludes. The Leg 3 "edges" paragraph from 09's
item 7 was added beside the spec-sheet run it was meant to replace, so the same facts now appear
twice or three times. Three tag-to-sentence joins lost their space (lines 160, 416, 446).

---

## Part 1: six readers

### (a) The skeptical computer science professor

**Verdict, in their voice.** "The disclosure I asked for is in, and the case report is now
publishable as an internal record. What I find this round is arithmetic that does not close and a
table that contradicts the sentence above it. Both are in text you mean to derive. Neither is a
matter of judgment."

**The attacks.**

1. **The outage paragraph contradicts itself.** Line 343 says six postmortems between 2025-06-12
   and 2026-02-20, two of which did not touch Workers, the 2025-07-14 resolver incident and the
   2026-02-20 BYOIP withdrawal. Line 346 introduces "the four that did", and the fourth row of that
   table is 2026-02-20, "a BYOIP route withdrawal, not a Workers incident". The table's own scope
   column refutes its heading. The count is also wrong. The blog's outage tag lists, in that window,
   2025-06-12, 2025-07-14, 2025-08-21, 2025-09-12 (the dashboard and API outage), 2025-11-18,
   2025-12-05, and 2026-02-20, seven Cloudflare-attributed postmortems, plus two external ones
   (the Iberian power outage, the `.de` DNSSEC failure). The 2025-08-21 and 2025-09-12 incidents
   are missing from the document altogether. A reader who clicks the tag link sees a different list
   from the one described.

2. **The case report's 48-hour window does not reproduce against its own definition.** The
   document defines the window as "2026-07-06 00:00 to 2026-07-08 00:00 by commit date". Run with
   those bounds, the routes-or-modules commit count is 37, not 35; the routes numstat is 1,361
   added and 158 deleted, not 1,002 and 143; the sixteen-module numstat is 1,595 added, not 1,548.
   The cause is mechanical. `git log --since=2026-07-06 --until=2026-07-08` with date-only strings
   takes the current time of day for both bounds, so the numbers move with the clock the command
   ran on. The per-day figures in the same cell, 621/124 and 740/34, reproduce exactly and sum to
   1,361/158, so the cell's parenthetical already contradicts its own total. Round 3 reported these
   rows as reproducing, which is true only for the clock at which round 3 ran.

3. **A DNS host is not a registrar.** Line 288 counts "a registrar unless DNS moves to Cloudflare".
   Line 338 says "DNS can sit at Cloudflare, which consolidates a billing relationship and removes
   no component". Both cannot hold. Moving the nameservers removes nothing; transferring the
   registration to Cloudflare Registrar removes the registrar account. Pick the second reading and
   say it, or drop the "unless".

4. **The killed sentence is misquoted.** Line 121 says "one login and one interface for editors and
   members" was "the sentence the register already killed". The Killed list carries "The whole
   organization works in one place, content and custom functions sharing one admin and one
   sign-in." Same family, different sentence. Say "a sentence of the same family".

5. **The GitHub rate limit is a floor, not a ceiling.** The cited page says an installation uses "the
   installation's minimum rate limit of 5,000 requests per hour" and scales it with repositories and
   users. "Limited to 5,000" understates it. Write "at least 5,000".

6. **A 2026-09-04 read cites data dated 2026-09-05.** Both W3Techs tags. The page says "updated
   daily" and shows no stamp in a fetch today. Either give the stamp with its timezone or drop it.

7. **The competitor comparison omits the competitor's own answer.** See (b). This is an inference
   defect, not a taste one: the sentence "the difference that matters is sign-in" is stated as the
   conclusion of a comparison that read one of Keystatic's two modes.

**Vocabulary map.** None stopped them this round. "graduated", "harvest", "pass", "conductor",
"register", and "tokens" are all in the table now.

### (b) The working SvelteKit web designer

**Verdict, in their voice.** "The comparison is finally in the shape I would make it, and then it
skips the page on Keystatic's site that answers it. I would find that page in five minutes and
stop trusting the rest."

**The attacks.**

1. **Keystatic Cloud removes the sign-in difference the leg turns on.** `keystatic.com/docs/cloud`,
   fetched today: Keystatic Cloud "skips the more complicated process of setting up GitHub mode,
   while also allowing team members to edit content without needing a GitHub account." TinaCloud
   hosts editor identity the same way. Decap's Git Gateway did the same over Netlify Identity.
   So the honest difference is not "a GitHub account or an email". It is "a third-party hosted
   identity service, or the site's own Cloudflare account sending the email". That is still a real
   difference, and the drawbacks already carry its cost (beta email, paid plan). The sentence at
   line 147 must say it that way and cite the Cloud page.

2. **"Why markdown" concedes a visual editor and never names that the alternatives ship one.**
   Keystatic's document field and Tina's rich-text editor are what a developer choosing between
   these tools compares against CodeMirror. One sentence in the drawbacks, with the two doc links.

3. **The extensibility numbers are still lines only.** Unchanged from round 3 and not a fold
   failure, so noted once: files, routes, actions, and tables per section come from the same tree
   as the line counts.

4. **The first Leg 1 evidence sentence is 89 words.** It inventories seven toolkit primitives in a
   parenthesis. In the record it is a product-vocabulary list and fine. In derivation the list is a
   link.

5. **What now reads right.** The audit "as a reviewer of their work as well as a gift". The
   "Consumers must" count with the deferred-failure sentence after it. The theme boundary at line
   398 to 411. The four-or-five-account count.

**Vocabulary map.** "snapshot gate" and "public-surface snapshot gate" are used in Legs 1, 3, and
5 and are not in the table. Plain: "a test that fails the engine's own build when an extension
point changes". "holding-branch publish path": in the table under "holding branch", fine.

### (c) The world-weary IT admin

**Verdict, in their voice.** "Backup, ownership, and the email dependency are in. Two of the three
are half-answered, because you told me the repository is the developer's and stopped there, and
because you told me the docs have no backup procedure when the platform has one."

**The attacks.**

1. **The Cloudflare account and the GitHub App are the developer's too, and that is checkable.**
   Line 384 says only that the repository is under the developer's personal account. The production
   site's `wrangler.toml:4` carries `account_id = 120c269ad6d3dfbe6d63a0bb53758ca0`, the account the
   engine's own `CLAUDE.md` names as the author's Cloudflare account. The engine's `CLAUDE.md`
   credentials section names one GitHub App installation on the author's account. Key rotation,
   the deploy, the databases, and the domain all sit behind that person's logins. Say all three, or
   the ownership paragraph answers a third of the question.

2. **D1 has a platform backup and the document reads as if nothing does.** Cloudflare's D1 Time
   Travel gives point-in-time restore over a thirty-day window on every plan. R2 documents no
   equivalent. Line 376 says the published docs carry no backup or restore procedure, which is true
   of the docs. The reader takes it as "there is no backup". State the platform facts with links,
   then the docs gap.

3. **The backup grep is described wrong.** The tag says the grep "returns only migration and
   key-rotation prose". It returns the CSRF guard's Origin "restore" in two pages, key-rotation
   prose, an email-normalization example (`Backup@Site.com`), and one line of the concept diagram
   that says "git carries the history, the review, and the backup". No migration hits. The claim
   holds. The description of the evidence does not.

4. **The same operational fact is stated three times.** Email Sending's beta and paid-plan status at
   lines 296, 315 to 319, and 332. `E_SENDER_NOT_VERIFIED` at 296 and 325. Workers Builds as an
   optional later step needing a second token at 332 and 432. An admin reads repetition as a
   document that was not read back.

5. **"Every publish re-releases the site, no change window" lives only in the vocabulary table.**
   It is the one deploy fact an admin needs, and it belongs in Leg 2's evidence as a sentence.

**Vocabulary map.** "apex DMARC record at `p=reject`": plain, "a DNS record telling other mail
servers to reject mail from your domain that fails authentication; it can affect the
organization's own mail". "post-package transpile step": plain, "a build fix inside the engine".
Both absent from the table.

### (d) The nonprofit board member approving a budget

**Verdict, in their voice.** "I can now find the lines. Hosting about $6 a month. Email $0.35 per
thousand past three thousand. Developer cost unmeasured, in those words. No support contract; the
developer is the support. Ownership is a choice we have to make. That is enough to write the sheet
from. Three lines are still blank."

**The three blank lines.**

- File storage: "storage and operations are still billed". The register says a vendor price is a
  link, so the line reads "R2 storage, priced on Cloudflare's page" with the link.
- GitHub: unpriced. One sentence: a private repository is on GitHub's free plan, with the link.
- Who owns the Cloudflare account and the GitHub App, per (c). The sheet's ownership line cannot be
  written from "the repository is the developer's" alone.

**What they can approve against now.** The vocabulary table gives them the plain forms. The
no-developer sentence in Leg 1 tells them the start-up line is a developer's invoice. The
deferred-failure sentence tells them what "stop paying for updates" means. The token figures are
labelled as not convertible without a price, which is honest.

**Vocabulary map.** "Workers Paid plan": plain, "the $5-a-month hosting plan". "beta": plain,
"not a finished product; the vendor may change or withdraw it". "scaffold" and "engine": neither
is in the table, and both appear in derivable text; plain, "the setup tool" and "the cairn
software itself".

### (e) The small-business owner who just wants a working website

**Verdict, in their voice.** "Now it says it near the top: I need a developer to start, to add a
form, and to fix it. I can change a page from an emailed link. When the hosting is down there is
nothing to do. That is what I needed. The rest is for him."

**Two attacks.** The Leg 1 drawbacks paragraph is the right paragraph. It is in the fourth
sub-heading of the first leg, under a heading about extensibility, and it will only reach this
reader if the derivation lifts it to the first screen with the editors' routing line beside it.
Second, "scaffold" appears in that paragraph and nowhere in the vocabulary table.

**Vocabulary map.** "scaffold", "engine", "beta", as above. "the adapter": in the table. Nothing
else new.

### (f) The AI-writing expert reading for tells

**Method.** Sentence lengths with tags stripped, code spans and URLs collapsed, tables excluded,
split on terminal punctuation followed by a capital. The splitter differs from 10's, so compare
rankings within this run and not the absolute values against 10's table.

| Section | n | mean | sd | CV | under 13w | semicolons |
| --- | --- | --- | --- | --- | --- | --- |
| Preface (record) | 15 | 22.7 | 13.2 | 0.581 | 20% | 2 |
| Traditional setup (derivable) | 24 | 19.9 | 10.7 | 0.539 | 29% | 0 |
| Leg 1 (derivable) | 22 | 31.4 | 19.9 | 0.634 | 9% | 0 |
| Leg 2 (derivable) | 28 | 24.6 | 15.0 | 0.609 | 18% | 0 |
| Why markdown (derivable) | 10 | 25.9 | 15.1 | 0.584 | 10% | 0 |
| Leg 3 (derivable) | 59 | 23.8 | 11.0 | 0.460 | 17% | 2 |
| Leg 4 (derivable) | 17 | 28.7 | 12.5 | 0.435 | 12% | 0 |
| Leg 5 (record) | 19 | 39.4 | 36.2 | 0.919 | 26% | 7 |
| Case report (record) | 10 | 38.3 | 29.5 | 0.771 | 10% | 0 |
| Already extensible (record) | 30 | 31.5 | 18.0 | 0.573 | 7% | 14 |
| Arguing with reviews (record) | 12 | 18.6 | 12.4 | 0.666 | 42% | 1 |
| Open questions (record) | 21 | 23.5 | 20.7 | 0.883 | 38% | 3 |

Whole file: 273 sentences, 30 semicolons (77 in v4), zero em or en dashes, zero ", never"
appositives (about twenty in v4), seven "never" in all, three setup-colon-with-semicolon lists
(all in record sections: the "What cairn carries" sentence in Leg 5, the reuse list and the token
list in "Already extensible").

**Cadence.** Leg 2 recovered; 10's flat section is now mid-pack and its three 28-word sentences
are broken. Legs 3 and 4 are now the flattest derivable sections. Leg 3 is flat because the
"edges" paragraph from 09's item 7 was added and the thirteen-sentence spec-sheet run it was
written to replace was kept; the section is 59 sentences where the derivation line says most of
them become links. Leg 4 is flat because 17 sentences average 29 words and only two are short;
the three-sentence claim is the one place it breathes.

**Vocabulary.** Clean. No marketing or grading word in the file. "Conceded" once, at line 127.
No "on purpose" tail on the ships-none sentence. No "partition", "steel man", "stated as facts",
"in its true form", or "The reader draws the inference".

**Punctuation and structure.** The two derivable-form paragraphs are five and six sentences,
first person, different openers. Three tag-to-sentence joins have no space after the closing
bracket (160, 416, 446), a fold artifact a reader sees as machine assembly. Two consecutive
caveats still sit on the later-commits table (lines 640 and 651), 10's S4, not taken.

**Summary rather than argument.** "The record keeps the figures read on 2026-09-04 below" (line
300) is method narration in derivable text. "The developer's infrastructure contact is that list"
(434) is a capper. Both are one-line cuts. The repeated Email Sending and Workers Builds facts read
as a section that was appended to rather than rewritten.

**Do the two derivable forms read as the person who did the work?** The second does. "The club
site I run on cairn carries about 36,000 lines of its own membership, events, assets, and email
code" is a developer talking, and "I wrote the engine too, so read that ratio as one author's site"
is the disclosure said the way a person would say it. The first mostly does, with one break.
"I am also the engine's author, so this shows what the author can do with his own engine" shifts
from first to third person inside one sentence, which is a tell a reader hears even if they cannot
name it. "As an overnight agent run whose spend I did not record" is a person writing a report
about himself. "I ran it overnight as an agent job and did not record what it cost" is the person.

**Fold check on 09 and 10.** 09: items 1 to 6 and 8 to 12 hold; item 7 half-held (the paragraph
was added, the run was kept). 10: B1 to B4 hold; W1, W2, W4, W5, W6 hold; W3 held and introduced
the contradiction in (a).1; S1, S2 hold; S4 not taken; S3 and S5 were advisory.

**Vocabulary map.** None stopped them. "register" is used in its house sense at line 536 and is in
the table.

---

## Part 2: the grade

### `[supported]` tags (ten in v5)

| Citation | Carries? | Note |
| --- | --- | --- |
| Patchstack 2025 (7,966; 96%; 33%) | carries | Unchanged from v3; vendor stated |
| Patchstack 2026 (11,334; 91%; 46%; five hours) | carries | Unchanged; vendor stated |
| W3Techs CMS (58.9%) | partial | 58.9% reproduces today; "dated 2026-09-05" is a day after the read date and no stamp was visible in a fetch |
| W3Techs Elementor (12.8%, about 31%) | partial | Same date defect; figures unchanged from v3 |
| WordPress 2023 survey (n=3,922; 45.1%; 28.6%) | carries | Unchanged |
| SWE-bench Live (48%; under 10%; never) | carries | Section 4.4, verified in round 3; the repair caveat follows |
| SecureVibeBench, CodeRabbit, Veracode (one tag) | carries | Each with its vendor or language caveat |
| METR 2025 (16; 246; 19%; 20%) | carries | Unchanged |
| METR 2026 (57; 800-plus; minus 18, minus 4, plus 9; 30 to 50%) | carries | Unchanged |
| Borg et al. (n=151) | carries | Unchanged |

No `[supported]` tag fails on its number. The two W3Techs tags carry a date the read date cannot
have produced.

### `[verifiable]` and `[uncited]` tags, spot-checked (about one in three)

**Carries, against `cairn-cms` at `f6b4a12b`:** 202 "Consumers must"; 37 dependencies and 4 peers;
18 export subpaths; MIT; a `bugs` field and no support field; 87 releases `0.22.0` to `0.96.0`,
`v0.96.0` on 2026-08-22, `v0.82.0` on 2026-07-07, `v0.89.0` and `v0.90.0` on the stated dates;
every `src/lib/*/` line count when counted as `.ts` plus `.svelte` (1,149; 10,710; 24,595; 825;
2,267; 10,139; 1,697; 4,378; 2,655; 2,302; 1,508; 1,315) and the 68,644 total; 446 `.test.ts`;
33 scripts among 40 files; `SKILL.md` 114 and 1,255 in all; `check-skill.ts:15,38,123`;
`ROADMAP.md:74`; `own-your-domain.md:115` and `CLAUDE.md:261` for the DMARC write;
`src/lib/email.ts` parsing `E_SENDER_NOT_VERIFIED`; the email-spike record exists at the re-pointed
path; `admin-toolkit.md:22-26`; `SKILL.md:3,10,90-97`; `theme.css:9-11,69`; `svelte.config.js:1`;
`healthz/` in the scaffold doc; `AUTH_DB`, `APP_DB`, `MEMBER_DB` in the showcase config; the
graduation headers on six components and three modules, with `ToolbarDisclosure.svelte:3` saying
"extracted from `ListToolbar`" and `index.ts:8-11` carrying the deeper graduation;
`CHANGELOG.md:3495`; `HISTORY.md:351-356,561`; `log-events.md` `commit.failed` with `conflict`;
the charter's "SvelteKit + Cloudflare, fully" and "build-time over a committed manifest";
`why-cairn.md:53` for the seam that moved; `before-you-start.md` for $5, about $6, and the
unconfirmed certificate; `signups/` 45 plus 45 and the 9-line migration; "exactly ten" and the
`tone` attribute in `configure-rendering.md`; `cairn-audit.md` "all 28"; every cited extend and
admin page exists; `create-cairn-site/README.md:16` exists and is the Windows paragraph.

**Carries, against `aksailingclub-org` at `836d324`:** 799, 29, and 10 by author; 838 commits,
2026-07-06 to 2026-08-30; `CLAUDE.md:255`; `STATUS.md:17-28`; `hooks.server.ts:18,54`;
`auth.ts:6-14,279` and `src/member-auth` at 914 lines; `status-archive.md:160,557-558,624-625,
1924,1931,1941`; `HISTORY.md:9-12,102,117,151,153-155,198-200`; the pass 2.1 harvest line; both
harvest documents at the cited lines; `grep -ri hours docs/` at fourteen lines; every route line
count and the Stripe route at 127; `src/routes/admin/club` at 12,415; `src/admin-club` at 8,930
as `.ts` plus `.svelte` excluding tests; 4,997; 5,655; 914; 610; 814; tests 172 files and 32,420
lines; migrations 125 files and 2,844 lines under `asc-club`, 2,997 `.sql` lines in all; the
eleven specifier counts exactly (57, 44, 27, 22, 18, 11, 9, 6, 4, 2, 1); every per-section subpath
count in the increment table, including `documents` at 5 and 4 and `events` with `/media`; the
toolkit symbol counts exactly under the stated method (multi-line aware, tests excluded, four
multi-line statements); `wrangler.toml` present; `CairnAdminShell` in the admin layout; the
cutover runbook; "Member-data imports" in `CLAUDE.md`; first commits `cc4edd3` and `a6d3c05`;
42 and 150 whole-repository commits on the two days; the eight-and-eight module split; the
sixteen modules at 3,879 today; 42 later commits on the routes and 81 on `src/admin-club`; the
later-commit class totals summing to +3,424/-1,394.

**URLs fetched, carries:** Keystatic GitHub mode ("Collaborators will need write access to this
repository"); Decap backends overview (OAuth proxy, Git Gateway); Tina git co-authoring (the
`tina-cloud-app` commits with a co-author trailer); the Email Service page reads "Beta"; the
"Fail Small" post commits to health-mediated deployments by the end of Q1; the 2025-12-05
postmortem gives about 25 minutes; the status feed on 2026-09-04 lists the Durable Objects,
Workers Builds, and Workers KV incidents on the stated dates; W3Techs shows 58.9%.

**Fails or does not reproduce:**

| Tag | Finding |
| --- | --- |
| "Cloudflare published six outage postmortems between 2025-06-12 and 2026-02-20 [blog tag]" | The tag page lists seven Cloudflare-attributed postmortems in that window (2025-08-21 and 2025-09-12 are missing from the document) and two external ones. |
| "The four that did [three URLs]" with a table whose fourth row is the 2026-02-20 BYOIP withdrawal | The sentence above the table excludes that incident. Three URLs are cited for four rows. |
| "Commits in the first 48 hours touching the three routes or `src/admin-club`: 35" | 37 against the document's stated window (`00:00` to `00:00`). Date-only `--since`/`--until` takes the current time of day, so the row moves with the clock. |
| "Lines added to the three routes in the first 48 hours: 1,002 added, 143 deleted (621/124 on the 6th, 740/34 on the 7th)" | The per-day figures reproduce and sum to 1,361/158, which is also the explicit-window result. The cell's total contradicts its own parenthetical. |
| "Lines added to the sixteen imported modules in the first 48 hours: 1,548 added, 98 deleted" | 1,595 added, 98 deleted against the stated window. |
| "an uncached body read in cairn crosses the GitHub API, which is limited to 5,000 requests an hour per App installation" | The page says the installation's minimum is 5,000 and scales up. |
| "`grep -rniE "backup\|restore\|d1 export" ...` returns only migration and key-rotation prose" | Returns CSRF-guard "restore" prose, key-rotation prose, an email example, and a concept-diagram line; no migration hits. The claim holds; the description does not. |
| "was the sentence the register already killed [docs-register.md, Killed list]" | The Killed list carries a different sentence of the same family. |
| "the scaffold is unpublished and its chapters assume one [ROADMAP.md:74; create-cairn-site/README.md:16]" | `README.md:16` is the Windows paragraph and says nothing about assuming a developer. `why-cairn.md:23-26`, which derives from this document, says the setup is one "a non-developer runs". The tag fails and the derived page contradicts the source. |
| "4,027 commits, 2026-05-24 to 2026-09-04 [`git log`]" | 4,031 at `f6b4a12b`, the commit the document is graded at. |
| W3Techs "data dated 2026-09-05" (two tags) | A day after the read date; no stamp visible today. |

**`[uncited]` tags (seven, all in the traditional setup).** Each is checkable in principle and
none was checked against a vendor page here, because none names one. The register allows a
vendor name inside a citation, and the document says its only vendor names are in citations, so
each `[uncited]` tag can become `[verifiable: <one vendor feature page>]` without touching the
derivable prose. Until then they are honest labels for unchecked claims.

### `[opinion]` tags

Labelled where a reader would otherwise take them as fact: yes, with two exceptions.

- "a registrar unless DNS moves to Cloudflare [opinion]" is tagged opinion and is a factual
  error about what a nameserver move removes.
- Leg 2's counterweight, "the content is files in the repository its GitHub account holds", still
  reads the organization as the account holder. Leg 3's version ("whenever the organization
  controls the GitHub account that holds it; opinion on control") is the corrected form. Align
  Leg 2 to it.

### Per-leg grades

| Leg | Logic | Evidence | Honesty | Prose |
| --- | --- | --- | --- | --- |
| The traditional setup | B. The 202 count still has no denominator; the deferred-failure sentence now sits after it, which is the right neighbour. | B. Every treadmill number reproduces; the seven `[uncited]` tags are honest labels for unchecked claims. | A-. Symmetric, and the consumer-site tags now route through the evidence file. | B+. 24 sentences, CV 0.539, no semicolons; the opening sentence is split. |
| Leg 1, CMS plus admin tool | B+. The developer's alternative is in; "the difference that matters is sign-in" is the conclusion of a comparison that read one of Keystatic's two modes. | B+. Both competitor pages fetched and carry; the no-developer tag cites the Windows paragraph. | A-. The published `why-cairn.md` says a non-developer runs the setup, and this document does not record the conflict. | A-. CV 0.634; one 89-word inventory sentence. |
| Leg 2, content in git | A-. Unchanged. | A-. The rate limit is a floor stated as a ceiling. | A. Unchanged. | B+. Recovered from 10's flat section; the six fragments are sentences. |
| Why markdown | B. Unchanged. | B. Unchanged. | A-. Concedes a visual editor without naming that the git-backed alternatives ship one. | B+. |
| Leg 3, one hosting account | C+. The outage table contradicts the sentence above it; the registrar count contradicts the DNS sentence. | B-. The postmortem count is wrong; two window rows are stated once and true; the status-feed sentence is fixed; the backup grep is misdescribed. | B+. Backup, ownership, beta-email, and DMARC are in; the Cloudflare account and the GitHub App are still unnamed where the repository is named. | B-. Flattest derivable section by count (59 sentences, CV 0.460); the edges paragraph and the spec-sheet run both survive; three facts stated twice or three times. |
| Leg 4, no page builder | A-. Islands are named and the claim is right for both. | B. Unchanged. | A-. Unchanged. | B. CV 0.435, mean 29 words, two short sentences in 17; one missing space at 446. |
| Leg 5, the case report | B+. A case report with no inference in either direction; the four studies are the four that bear; commits are described as batching. | B. Three of the nine table rows fail against the document's own window, and one cell's parenthetical contradicts its total. | A-. Author, unrecorded spend, and the commit caveat are all disclosed; the person shift in the derivable form reads as a report about a third party. | B. The 121-word "What cairn carries" sentence is a table in prose; record-only. |
| Already extensible, measured | B+. The facts are facts and the "small fraction" refusal stands. | A-. Every recounted number reproduces, including the toolkit count under its new method. | B+. Ownership is a choice in Leg 3 and still an assumption in Leg 2's counterweight. | B. Two setup-colon lists over semicolons and fourteen semicolons in 30 sentences; the three scaffolding paragraphs are cut. |

**Overall: B.** Up from B-. Honesty is now the document's strongest leg across the board; the
disclosures round 3 demanded are all present and the tells reviews are folded almost entirely.
The grade is held under B+ by three things in derivable text that a first reader would catch:
an outage table that refutes its own heading, a competitor comparison that skips the competitor's
answer, and a case-report row whose parenthetical does not add up to its total. Each is a
mechanical fix. None is a judgment call.

### Comparison with round 3, per leg

- **Traditional setup.** Logic B to B (the 202 count still lacks a denominator). Evidence B- to B
  (the `[uncited]` tag replaced `[opinion]` on the checkable claims, which is what 09's item 8
  asked). Honesty B+ to A- (the consumer-site tags moved). Prose, new, B+.
- **Leg 1.** Logic A- to B+ (Keystatic Cloud). Evidence A- to B+ (the README:16 tag). Honesty A-
  to A- (the `why-cairn.md` conflict offsets the no-support and no-developer additions). Prose A-.
- **Leg 2.** Logic A- to A-. Evidence A- to A- (rate-limit floor is a nit). Honesty A to A.
  Prose B+.
- **Why markdown.** B, B, A- unchanged. Prose B+.
- **Leg 3.** Logic B to C+ (the fold of 10's W3 introduced the table contradiction; the registrar
  sentence added in round 3's item 14 contradicts an existing sentence). Evidence B to B- (the
  postmortem count). Honesty B to B+ (four operational facts added). Prose B-.
- **Leg 4.** Logic B+ to A- (islands). Evidence B to B. Honesty A- to A-. Prose B.
- **Leg 5.** Logic B- to B+ (case report with disclosure; studies cut). Evidence B to B (the window
  rows fail against the definition the document itself added). Honesty C+ to A- (the disclosure).
  Prose B.
- **Already extensible.** Logic B to B+. Evidence A- to A- (the toolkit count now has a method and
  reproduces). Honesty B to B+. Prose B.

---

## Part 3: ranked changes

1. **Fix the outage paragraph and table.** (correction) Line 343: "Cloudflare published seven
   postmortems for its own incidents between 2025-06-12 and 2026-02-20, and two for external ones
   [verifiable: https://blog.cloudflare.com/tag/outage/, read 2026-09-04]." Name the two that did
   not touch a Workers-hosted site (2025-07-14, 2026-02-20) and the two that touched control
   surfaces only (2025-08-21 AWS us-east-1 reachability; 2025-09-12 dashboard and API). Retitle the
   table "The three that touched a Workers-hosted site" and drop the 2026-02-20 row, or keep all
   seven rows with a scope column that says which surface each touched. One URL per row.
2. **Recount the three window rows against the stated window.** (correction) Commits: 37. Routes:
   1,361 added, 158 deleted (621/124 on the 6th, 740/34 on the 7th). Modules: 1,595 added, 98
   deleted. Change every window tag to `--since='2026-07-06 00:00' --until='2026-07-08 00:00'` and
   add one clause: "date-only bounds take the current time of day, so the explicit times are part of
   the command".
3. **Name Keystatic Cloud in the sign-in comparison.** (correction) Replace lines 146 to 150 with:
   "The difference that matters is sign-in. Keystatic's GitHub mode wants every editor to hold a
   GitHub account with write access to the repository, and its hosted Cloud mode lifts that by
   routing editors through Keystatic's own service. Decap wants an OAuth backend, a GitHub OAuth app
   behind a proxy or Git Gateway. cairn sends the editor an email from the site's own Cloudflare
   account, with no third service in the sign-in path [verifiable: https://keystatic.com/docs/github-mode;
   https://keystatic.com/docs/cloud, 'without needing a GitHub account'; https://decapcms.org/docs/backends-overview/,
   all fetched 2026-09-04]." Leg 3 already carries what that costs.
4. **Reconcile the registrar count with the DNS sentence.** (correction) Line 288: "and a registrar,
   unless the registration itself moves to Cloudflare Registrar". Line 338 stands.
5. **Cut the duplicated Leg 3 facts.** (cut) Keep the "edges" paragraph (296 to 300). Delete the
   beta and paid-plan restatement at 315 to 319 down to the pricing link and the 200-a-day
   measurement. Delete "So editor sign-in rides on a beta product, on the paid plan" at 332. Keep one
   `E_SENDER_NOT_VERIFIED` sentence (325). Keep one Workers Builds sentence (432) and cut the one
   at 332.
6. **Restore the three missing spaces.** (correction) Lines 160, 416, 446, after `]`.
7. **Cite the README correctly and record the `why-cairn.md` conflict.** (correction) Line 124:
   tag to `packages/create-cairn-site/README.md:10-13` (Node 24, `npm`, `wrangler`) and
   `docs/why-cairn.md:77`. Add to Open questions: "`why-cairn.md:23-26` says the setup is one a
   non-developer runs; this document says a developer is needed to start; the derived page has to
   move to this document's sentence."
8. **Name the Cloudflare account and the GitHub App in the ownership paragraph.** (addition) Line
   384: "In the production case the repository, the Cloudflare account (`wrangler.toml:4`,
   `account_id` matching the engine author's account in cairn-cms `CLAUDE.md`), and the GitHub App
   installation (cairn-cms `CLAUDE.md`, Credentials) are all under the developer's personal accounts
   [verifiable: those lines; internal]."
9. **State the platform backup facts before the docs gap.** (addition) Line 376: "D1 offers
   point-in-time restore over a thirty-day window on every plan, and R2 documents no equivalent
   [verifiable: https://developers.cloudflare.com/d1/reference/time-travel/;
   https://developers.cloudflare.com/r2/, by absence]. The published cairn docs carry no backup or
   restore procedure for either ..." and fix the grep description: "returns the CSRF guard's Origin
   restore, key-rotation prose, and an email-normalization example, and no procedure".
10. **Fix the person shift in the first derivable form.** (rewording) "I am also the engine's
    author, so this shows what I can do with my own engine and nothing about a second developer."
    And "as an overnight agent run whose spend I did not record" to "I ran it overnight as an agent
    job and did not record what it cost".
11. **Correct the killed-sentence reference.** (rewording) Line 121: "was a sentence of the same
    family the register killed ('sharing one admin and one sign-in')".
12. **Update the Preface inputs and the commit count.** (correction) Add the round-3 review, the
    audience lens, and both tells reviews to the inputs list. "4,027 commits" to "about 4,000".
13. **Align Leg 2's counterweight on ownership.** (rewording) "since the content is files in a
    repository the organization can clone whenever it controls the account that holds it".
14. **Name the alternatives' editors in "Why markdown".** (addition) Drawbacks: "Keystatic ships a
    structured document field and Tina a rich-text editor; cairn's body is CodeMirror over markdown
    [verifiable: https://keystatic.com/docs/fields/document; https://tina.io/docs/editing/markdown]."
15. **Add five vocabulary rows.** (addition) scaffold ("the setup tool"), engine ("the cairn
    software itself"), beta ("not a finished product; the vendor may change or withdraw it"),
    snapshot gate ("a test that fails the engine's build when an extension point changes"), DMARC
    at `p=reject` ("a DNS record telling other mail servers to reject unauthenticated mail from the
    domain").
16. **State the rate limit as a floor.** (rewording) "at least 5,000 requests an hour per App
    installation".
17. **Fix the W3Techs dates.** (correction) "read 2026-09-04" on both tags, dropping "dated
    2026-09-05", or give the stamp with its timezone.
18. **Cut one of the two caveats on the later-commits table.** (cut) Keep line 651 ("A commit here
    is one conductor-batched agent change ..."); drop "the classification is a judgment" at 640, since
    the tag already says "opinion on the class".
19. **Cut two method lines in derivable text.** (cut) "The record keeps the figures read on
    2026-09-04 below" (300) and "The developer's infrastructure contact is that list" (434).
20. **Cite one vendor page per `[uncited]` tag.** (addition) The register allows vendor names in
    citations; each of the seven tags in the traditional setup becomes `[verifiable: <one membership
    product's feature page>, fetched <date>]` with the prose unchanged.
21. **Add the deploy fact to Leg 2 as a sentence.** (addition) After "Editors never see git":
    "Every publish redeploys the site the way any push does, with no change window [verifiable:
    docs/extend/architecture.md]."

**Verdict: SOUND AFTER FIXES.** The argument's structure, its disclosures, and its evidence base
hold, and the tells work is nearly complete. What remains is a self-contradicting outage table, three
case-report numbers that fail against the window the document itself defines, and a competitor
comparison that has not read the competitor's second mode, all fixable from the items above without
a judgment call.

**Does v5 meet the B+ exit criterion?** No. It grades B, and the gap is items 1 to 3 above.
