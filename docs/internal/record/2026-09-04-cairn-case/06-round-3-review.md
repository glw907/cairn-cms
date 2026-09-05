# Adversarial review, round 3: the cairn case (v3)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `660f92bf`, 847 lines. Inputs read
in full: the ratified brief, the round-1 review, both evidence files, the strengthening notes, the
round-2 review. Standards read: `CLAUDE.md` ("What cairn is"), `what-cairn-is-and-is-not.md`,
`docs-register.md` (front-door register, Killed list), `why-cairn.md`, `architecture.md`,
`add-a-second-audience.md`, the showcase. Spot-checks ran against `cairn-cms` at `660f92bf` and
`aksailingclub-org` at `836d324`, read-only, on 2026-09-04. Four URLs were fetched live.

What round 2 asked for and v3 delivered, so this review does not repeat it: Leg 5 is a case report
with no agent thesis in either direction; the carried-parts sentence is scoped to the editor session
and admin frame; the cairn treadmill paragraph is in; the developer's real alternative is in; every
section carries a derivability line; the lock-in survey is cut; Leg 3's asymmetry is re-scoped; the
outage sentence and the token-overrun range are corrected; the five counts that failed now reproduce;
the study sentences are narrowed; Borg is in; the evidence tags carry paths; self-description and the
grading nouns are out; the sign-in mechanism replaces the count; the stale rule count is filed in the
friction log. All of that holds. This review attacks what is left, with five readers.

---

## Part 1: five readers

### (a) The skeptical computer science professor

**Verdict, in their voice.** "The document is now honest about what it cannot prove, and that is
worth a lot. It still fails the first question I ask of any case report: who is the subject, and who
is the author? Fix that and the report is publishable as an internal record. As it stands, the
headline measurement describes an author extending his own framework and presents it as a site."

**The attacks.**

1. **The case report does not disclose that the subject is the author.** `aksailingclub-org` is
   `glw907/aksailingclub-org`, a personal account (its `CLAUDE.md:255`). 799 of its 838 commits
   carry the same author name as the engine's commits (`git log --format=%an | sort | uniq -c`). The
   toolkit components the report says "graduated from `aksailingclub-org`" graduated because the
   engine's author was building both trees in the same weeks. So the record measures the engine's
   author extending his own engine, with the engine changing to fit the site during the measured
   window. None of that is stated. The report's own inference-shaped sentence, "a site built on the
   current engine starts from those components rather than deriving them", is exactly the claim
   that identity undercuts, because the components exist only because this site derived them.
   A reviewer marks this down before reading the numbers.

2. **The headline window has a duration and no cost.** "Two calendar days" is 192 commits produced
   overnight by an agent workflow while the owner slept (`status-archive.md:1941`). No token spend
   is recorded for that window; the token figures in the section (3.4M, 1.9M, 3.23M) belong to the
   July and August refinement passes. So the report pairs a duration without a cost with costs
   without durations, and a reader will read "two days" as effort. State that the first window's
   spend is unrecorded, in the same sentence as the two days.

3. **Citation padding.** Fourteen studies appear under "What the general studies test", and the
   paragraph closes by saying none tests the partition. Evidence the author concedes is not
   evidence for the conclusion is not evidence. Length signals a thoroughness the studies do not
   deliver. Four bear on the reader's decision: the SWE-bench-Live gradient (which reproduces from
   section 4.4 of the paper), the security trio as one sentence, METR 2025 with its 2026 follow-up,
   and Borg on later maintenance. The rest belong in the evidence file.

4. **Commit counts are the workflow's batching, not effort.** "42 commits on the routes over eight
   weeks" and "81 on the library" are counts of conductor-batched agent commits. They are fine as
   description. The derivable form leads with them, and a reader takes them as effort. One tagged
   sentence saying what a commit is here would fix it.

5. **Two numbers in the case report do not reproduce.** "Six of the sixteen existed by 2026-07-07,
   the other ten first appear 2026-07-13 or 2026-07-14" is eight and eight (`git log --reverse` per
   module: `member-format` and `ui` on the 6th; `assets-store`, `classes-store`, `club-action`,
   `club-email`, `club-settings`, `payments` on the 7th; `ledger` on the 13th; the other seven on
   the 14th; the tree at the last commit of 2026-07-07 confirms eight). And the tag
   `[verifiable: grep -ri hours docs/]` returns fourteen lines, one of them the "sleeping ~9h" line
   the same paragraph cites. The sentence is true on reading (none is an hours-of-work figure). The
   command offered as proof of absence does not show absence.

6. **The heading "Speed, off the table" carries three studies that are not about speed.** Shen and
   Tamkin (skill formation), Agarwal (complexity), and Borg (later maintenance) sit under it. Rename
   or split.

7. **Leg 4 is right for components and silent on islands.** "Cannot be overridden per occurrence"
   holds for a directive naming a component. An island carries its props in the file
   (`add-an-island.md`), which is per-occurrence configuration in the content. Islands appear only
   in the drawbacks. Narrow the claim or add the sentence.

8. **Leg 3 still never counts the cairn shape's accounts.** The traditional shape's accounts are
   enumerated. The cairn shape's (Cloudflare, GitHub, a payments provider, organizational mail, a
   registrar unless DNS moves) are not listed as a count. Evidence round 2 asked for exactly that
   count and nothing more.

**Vocabulary map.** Few stops, all house terms: "graduated" (moved from a site into the engine),
"harvest" (a list of engine feedback banked at the end of a pass), "pass" (one planned unit of
development work), "conductor" (the top-level agent directing sub-agents), "seam" (a documented
extension point), "register" (an editorial voice standard, not a CPU register), "tokens" (the unit
language-model tools meter and bill in, not an auth token).

### (b) The working SvelteKit web designer

**Verdict, in their voice.** "This matches the editor half of the job exactly, and the magic-link
login is the reason I would pick it for a club. The admin half reads like a framework I have to
evaluate on its own terms, and the document never adds up what it costs me on one side of the page.
The line counts do not tell me anything about my own work."

**What they would build instead, and the test of the document's comparison.** SvelteKit plus
Keystatic in GitHub mode, or Decap with an OAuth provider, plus a hand-written `/admin` using their
own auth and their own component kit. The document's list of what cairn ships that the other stack
asks them to write (the shell, the toolkit, the 28-rule audit, the snapshot gate, magic-link, the
holding branch, the skill) is true and misframed. A Keystatic developer does not write an audit, a
doctor, a snapshot gate, or 446 tests; they install an editor and write an admin in whatever kit they
like. The honest line is "what the developer would otherwise install or write elsewhere", and on that
line the differentiator that survives is the editor login: Keystatic's GitHub mode needs every editor
to hold a GitHub account with write access, and Decap needs an identity provider, where cairn's
editors need an email address. The document lists magic-link sixth of seven. Lead with it.

**What the seams, the toolkit, and the theme boundary cost them.** Each fact is stated somewhere in
the document; none is added on one side.
- DaisyUI on Tailwind for any admin screen, whatever the site's public stack.
- The 28-rule audit as a gate over screens they design. To a designer that is an opinionated
  reviewer of their work, not only a gift.
- Markdown-only editing. Keystatic ships structured fields and a rich-text editor; cairn's fields
  are frontmatter and the body is CodeMirror.
- The engine's invariants bind the site's choices. The case report's own blocker is the proof: the
  site chose `Referrer-Policy: no-referrer` and the engine's CSRF guard refused 40 forms.
- 202 "Consumers must" lines across 87 releases in about ninety days. That is their weekend budget,
  stated as a fact and never as a rate.
- Off-chassis cost. "Public output is design-agnostic" is true. The scaffold, the chassis, Waymark,
  and the delivery docs all assume the chassis; `build-a-site-by-hand.md` exists. The document sizes
  neither this nor the deploy-elsewhere cost, and says so for the second only.

**Whether the extensibility numbers ring true.** 90 lines for `signups` rings true. 3,120 lines for
`events` rings true for agent-written Svelte. A designer sizes work by screens, routes, forms, and
tables, not lines; lines measure verbosity as much as capability. The increment table gives one of
those (route lines) and the pair table gives one more (125 migration files). The 36,000 over 69,000
ratio tells them nothing about their own next screen, and the document now says so. The signal they
would want, per section: files, routes, actions, and tables. The table could carry it from the tree.

**Vocabulary map** (their sense against the document's sense, with the plain equivalent):
- *deploy*: theirs is "push to the host"; the document also means "a content publish triggers a
  deploy" (Leg 2, "the site's existing deploy carries it live"). Plain: "publishing a page rebuilds
  and re-releases the site."
- *admin*: the document uses admin frame, admin skeleton, admin shell, admin toolkit, and admin
  audit. Plain: "the editing screens" for the whole, "the screen frame", "the screen parts", "the
  screen checks" for the parts.
- *app*: "one SvelteKit app" and "the GitHub App" in the same document. Plain for the second:
  "the site's GitHub integration identity."
- *platform*: Cloudflare in Leg 3; "not a platform" in the charter; "membership platform" in the
  traditional section. Plain: "hosting account", "product".
- *adapter*: `@sveltejs/adapter-cloudflare` and cairn's site adapter, both in Leg 3. Plain for
  cairn's: "the site's configuration object."
- *manifest*: theirs is a web-app manifest; the document's is the content index. Plain: "the
  committed content index."
- *directive*: theirs is a Svelte or Angular directive; the document's is `::callout`. Plain: "a
  named block in the markdown."
- *fieldset*: theirs is the HTML element; the document's is the frontmatter schema. Plain: "the
  fields a content type declares."
- *seam*: no sense of their own. Plain: "extension point."
- *chassis*: plain: "the starter theme's base layer."
- *theme*: theirs is CSS; Waymark is a whole site scaffold with routes. Plain: "starter site."
- *worker*: "one Worker" is the whole site. Plain: "one serverless function that serves the site."
- *register*, *harvest*, *graduate*, *concept*: plain: "voice standard", "engine feedback list",
  "moved into the engine", "content type."

### (c) The world-weary IT admin

**Verdict, in their voice.** "The document tells me about outages I cannot do anything about and
says nothing about the two things I would actually be asked at three in the morning: where the
members' data is backed up, and whose login gets us into the hosting account when the developer is
unreachable. The content in git is the half I worry about least."

**The attacks.**

1. **No backup or restore story for the organization's own data.** Content is in git. The members,
   the dues ledger, the waivers, the sessions, and the media are in D1 and R2 in the Cloudflare
   account. Neither the case nor the published docs say how those are backed up or restored: a grep
   over `docs/admin`, `docs/extend`, and `docs/reference` for backup, restore, or D1 export finds
   nothing but migration commands. "Backup is as good as the organization's GitHub account" covers
   the half that is least likely to be lost.

2. **Whose accounts.** "One Cloudflare account" and "one GitHub account" never say whose. In the
   production case the repository is under the developer's personal account. The three-in-the-morning
   question is whether the club can sign in to Cloudflare and GitHub without that person. The
   document should state the choice and state what the production case did.

3. **Sign-in depends on a beta email product.** Editor login is a magic link sent through Email
   Sending, which is beta, quota-limited (200 a day measured), and which the engine's own record
   shows failing with `E_SENDER_NOT_VERIFIED` when the sender is not ready (the `CLAUDE.md` gotcha).
   When that path is down, nobody can sign in to the admin. That is the outage that pages someone,
   and it is not in Leg 3. Enabling Email Sending also writes an apex DMARC record at `p=reject` on
   the organization's domain, which can break the organization's own mail if its provider is not
   aligned. Not in the document. The internal record `CLAUDE.md` points at for the full detail
   (`docs/internal/2026-08-11-t4b-email-spike.md`) is not in the tree.

4. **What breaks on upgrade, and what happens if you stop upgrading.** 87 releases, 202
   "Consumers must". The admin's reading is the opposite of the developer's: a pinned site keeps
   serving the day the developer leaves. The risks are deferred, not immediate: a `compatibility_date`
   or Node floor moving, SvelteKit majoring, the beta email API changing. The document states the
   treadmill and never says the failure mode is deferred. That is the sentence an admin needs.

5. **Who gets paged.** Nobody. No monitoring, alerting, or uptime check is in the document or the
   published docs. Cloudflare's status page is the only signal named. Fine for a club. Say it.

6. **When the developer leaves.** The labor-market sentence is `[opinion]`. The admin's own version
   is verifiable from the mechanism: editors keep editing and the site keeps serving until email or a
   platform change breaks something, and then the organization needs a SvelteKit-on-Workers developer
   for the bespoke parts and the engine's own upgrade notes. The GitHub App key rotation procedure
   exists and needs that same person or that same account access.

**Vocabulary map** (their sense against the document's):
- *deploy*: theirs is a release with a change window; the document's is automatic on push and on
  every content publish. Plain: "every publish re-releases the site; there is no change window."
- *admin*: the sysadmin against `/admin`. Plain: "the editing screens."
- *app*: the application against the GitHub App. Plain: "the GitHub integration."
- *platform*: the hosting account against the membership product. Plain as in (b).
- *repository*: they may read an artifact repository. Plain: "the git repository."
- *worker*: plain: "the hosted function that serves the site."
- *D1*, *R2*, *bindings*, *migrations*: plain: "the hosted SQLite database", "hosted file storage",
  "connections declared in the config file", "schema changes."
- *magic link*: plain: "an emailed one-time sign-in link."
- *seam*, *chassis*: as in (b).

### (d) The nonprofit board member who must approve the budget

**Verdict, in their voice.** "I cannot approve against this. It is not written for me, and it says
so. What I need is five lines with numbers and one line about what we own if our developer leaves.
Three of those five lines are not in this document at all, and the ownership line is stated as a
fact that turns out to be a choice."

**Cost lines with numbers, as the document gives them.**
- Hosting: $5 a month (Workers Paid), plus a domain, "about $6 a month". Present, with the
  certificate charge unconfirmed.
- Email: 3,000 sends a month included, $0.35 per 1,000 beyond. Present.
- File storage: "storage and operations are still billed." No figure.
- Payments provider: "a percentage." No figure, and the document says it is the same in both shapes.
- GitHub: unpriced.
- The developer's time, the real line: "no wall-clock hours are recorded anywhere"; effort is given
  in agent tokens (3.4M, 1.9M, 3.23M per pass). A board cannot approve a line denominated in tokens.
  The document should either convert at a published model price and tag it, or write "developer cost
  unmeasured" in those words.
- Maintenance in perpetuity: 87 releases, 202 required-change lines. No time or money figure, and
  the document says none exists.

**What the organization owns.** The document says content lives in "a repository the organization
owns" as a fact. In the production case the repository is under the developer's personal GitHub
account, and the Cloudflare account is not named. Ownership depends on who holds the accounts. The
sentence has to say so. The engine is MIT; that line is fine. The site's own code belongs to whoever
holds the repository.

**If a vendor changes terms.** Email Sending is beta. The traditional shape's support contracts are
`[opinion]`. There is no line saying "the engine has no vendor and no support contract; the
developer is the support." That sentence is true and missing.

**Bespoke versus a mature product with support.** The document refuses to weigh it, on purpose. The
board member reads that as "the developer decides", which is the preface's stated audience. Fine.
What the document must then be is the source for the derived one-page sheet, and it is missing the
source facts for developer cost, account ownership, and support.

**Vocabulary map** (the terms that stopped them, each with the plain equivalent that would have
worked): cairn, "the website software"; SvelteKit, "the framework the site is written in";
Cloudflare, Workers, "the hosting company and its hosting product"; D1, "the database"; R2, "file
storage"; GitHub, repository, "where the website's files and their history are kept"; markdown, "a
plain-text way of writing pages"; magic link, "sign in by clicking an emailed link, no password";
admin, "the editing screens"; seam, "a place a developer can add a screen"; toolkit, "ready-made
screen parts"; npm, release, "Consumers must", "software updates the developer applies, each with a
list of required changes"; tokens, "the unit the AI tools bill in"; pass, "one chunk of development
work"; CSRF, "a web security check"; migration, "a database change"; frontmatter, manifest,
directive, holding branch, "drop these entirely for this reader."

### (e) The small-business owner who just wants a working website

**Verdict, in their voice.** "Will it exist? Only if I hire someone. Can I change a page? Yes, from
an emailed link, if I learn a bit of formatting. Who do I call? Him. That is all I got out of 847
lines, and it took me most of them to find it."

**The attacks, as questions.**
- *Will it exist?* Not without a developer. `create-cairn-site` is unpublished, macOS and Linux
  only, and its three chapters assume a developer. The document says so in Leg 3 and Leg 5 and never
  in one sentence at the top. `why-cairn.md` does.
- *Will it look right?* One starter look (Waymark). Changing it needs the developer.
- *Will it stay up without me?* Mostly. The incident table means nothing to them. The sentence they
  need is "when it is down there is nobody to call and nothing to do."
- *Can I change a page myself?* Yes. Sign in from an emailed link, write in a plain-text box with a
  preview, save, then publish. That is stated well in Leg 1 and Leg 2. The cost is stated too:
  markdown syntax to learn.
- *Can I add a contact form, a booking page, a shop, a calendar?* No, not without the developer.
  Content is Posts and Pages. The scaffold's signups screen is developer-built. The document never
  says "no forms, no shop, no booking without a developer", and that is the first thing this reader
  asks.
- *What does it cost?* About $6 a month, plus payment fees, plus whatever the developer charges to
  start and to keep it updated. Only the first is in the document.
- *Does any of the argument matter to me?* Leg 1's first paragraph and the drawbacks about needing a
  developer. Legs 2 to 5 are for the developer. That is by design, and the front door should route
  this reader to `docs/editors/welcome.md` in its first lines, as the register already requires.

**Vocabulary map.** Everything in (d)'s list, plus: *save* against *publish* (a save does not go
live, a publish does; the document states this well and it is the one distinction they need);
*draft*, *preview*, *media library* (fine); *editor* (the document uses it for the person and for
the text box; plain: "the person who writes" and "the writing box"); *site* against *admin* (plain:
"the public pages" and "the editing screens"); *domain* (plain: "your web address").

### The strongest objection the document still cannot answer

The single production case is the engine author's own site, built in his own accounts, with his own
agent workflow, while he was changing the engine to fit it. The document does not disclose that, and
nothing in it tests whether a developer who did not write the engine gets the same result. Every
derived front-door sentence that begins "one production site" inherits the gap. Open question 6
(a measured worked screen) is the only answer, and it is stronger than the document says if the
screen is built by someone other than the author.

### Does round 2's strongest surviving argument still stand?

Its first six sentences stand unchanged and are now the document's Leg 1 and Leg 2 claims. Its last
two ("agents are measured to do worst on exactly that kind of code, so plan to review it as the
hardest part") were the inference the owner ruled out, and v3 replaces them with "the reader draws
the inference". So the argument has changed shape. The round-3 form: the same six sentences, then
"One production site, built by the engine's own author, shows what that code weighs: about 36,000
lines over about 69,000 it did not write, with the member login, payments, and personal data on the
site's side and one recorded defect at the seam", and no agent sentence at all. It gained a
disclosure it needs and lost a sentence it could not support.

---

## Part 2: the grade

### `[supported]` tags

Each was checked against the evidence files and, where marked, against the source.

| Citation | Carries? | Reason |
|---|---|---|
| Patchstack 2025 (7,966; 96%; 33%) | carries | Matches; vendor caveat stated |
| Patchstack 2026 (11,334; 91%; 46%; 5 h) | carries | Matches evidence round 2; vendor caveat stated |
| W3Techs CMS (58.9%) | carries | Matches |
| W3Techs Elementor (12.8%, ~31%) | carries | "Tens of millions" is gone |
| WordPress 2023 survey (n=3,922) | carries | Matches |
| SWE-bench Live (48%, <10%, never) | carries | Fetched: all three sentences are in section 4.4; the repair-benchmark caveat now follows it |
| SWE-Bench Pro (42 to 44%, <18%) | carries | Matches; confound stated |
| Rahman et al. | carries | Numbers match; "nearest analogue, not the same thing" is the right scope |
| Watanabe et al. (83.8%; 54.9%) | carries | Matches; self-selection stated |
| Evaluating AGENTS.md (+4%; 20 to 23%) | carries | Matches |
| SecureVibeBench (23.8%) | carries | Matches; language caveat stated |
| CodeRabbit (2.74x; n=470) | carries | Matches; URL now present; vendor stated |
| Veracode (45%) | carries | Matches; vendor stated |
| Kim et al. (60 to 69%) | carries | "Two of the three architectures" now stated |
| How Coding Agents Fail (91.49%) | carries | Denominator and undercount now stated |
| METR 2025 | carries | Matches |
| METR 2026 | carries | Matches |
| METR survey (3x; n=349) | carries | Matches |
| Peng; Cui (recorded as contested) | carries | Correctly not cited for the case |
| Shen and Tamkin (50% vs 67%) | carries | The maintenance inference is now `[opinion]` |
| Agarwal et al. (+18%; +39%) | carries | Matches; preprint stated |
| Borg et al. (n=151) | carries | Matches |

No `[supported]` tag fails this round. The remaining defect with the studies is structural, not
per-citation: fourteen are cited under a heading that concedes none tests the claim (Part 1, a.3).

### `[verifiable]` tags, spot-checked (about one in three, weighted to Leg 5)

**The production-record table in Leg 5, reproduced row by row with the stated commands at
`836d324`.** First commit `members/` and `assets/`: `cc4edd3`, 2026-07-06. First commit
`asset-requests/`: `a6d3c05`, 2026-07-07. Commits in the first 48 hours touching the three routes or
`src/admin-club`: 35. Whole-repository commits: 42 on the 6th, 150 on the 7th. Lines on the routes
in the first 48 hours: 1,002 added, 143 deleted (621/124, 740/34). Lines on the sixteen modules in
the first 48 hours: 1,548 added, 98 deleted. Lines today: 1,704, 1,203, 326; modules 3,879. Later
commits on the routes: 42. Later commits on `src/admin-club`: 81. The sixteen module names reproduce
from the stated grep. All nine rows carry.

**The later-commits classification.** All 29 named hashes exist with the stated dates and subjects
consistent with the narrative. `06bf1b4` is +404/-162 on the routes, `ce22629` +622, `81634ca`
+395/-345. The three class totals sum to +3,424/-1,394, which is the total numstat of the 42 later
commits on the routes. The class boundaries are a judgment, tagged as such. Carries. The 0.82.0
swap on 2026-07-07 is consistent with `v0.82.0` tagged that day.

**Verified against `cairn-cms`, carries:** 87 release headings from `0.22.0`; `v0.96.0` dated
2026-08-22, `v0.89.0` 2026-07-21, `v0.90.0` 2026-07-23; 202 "Consumers must"; 37 dependencies and
4 peers; 18 export subpaths excluding `./package.json`; MIT; `skills` in `files`; every `src/lib/*/`
line count (1,149; 10,710; 24,595; 825; 2,267; 10,139; 1,697; 4,378; 2,655; 2,302; 1,508; 1,315)
and the 68,644 total; 446 `.test.ts`; 33 scripts among 40 files; `SKILL.md` 114 lines, six
references at 212, 206, 151, 149, 153, 252, 1,255 total; `check-skill.ts:15,38,123`;
`CHANGELOG.md:3495`; `docs/HISTORY.md:351-356,561`; `ROADMAP.md:74`; `admin-toolkit.md:22-26`;
`SKILL.md:3,10,90-97`; `theme.css:9-11,69`; `svelte.config.js:1`; `signups/` 45 + 45 and the 9-line
migration; `configure-rendering.md` (exactly ten, `tone`); `before-you-start.md` ($5, about $6,
certificate unconfirmed 2026-08-11); `migration-notes.md` and `why-cairn.md:53` (a seam moved across
two minor releases inside the frozen tier); `why-cairn.md:46,84`; `what-cairn-is-and-is-not.md:18,23`;
`docs-register.md:356` (never a specific consumer site); `log-events.md:27`;
`wire-the-delivery-surface.md:4` (raw-markdown twin); `design-your-site.md:101`;
`own-your-domain.md:128`; showcase `wrangler.jsonc` (`AUTH_DB`, `APP_DB`, `MEMBER_DB`); every
cited extend and admin page exists; the Vite 8 record exists; `packages/create-cairn-site/` exists
and its README refuses Windows; the friction log carries the 23-rules entry.

**Verified against `aksailingclub-org`, carries:** every route line count in the increment table
(381; 326; 433; 559; 573; 738; 1,203; 1,501; 1,704; 1,748; 3,120) and the Stripe route at 127; every
per-section subpath count including `documents/` at two subpaths and `events/` with `/media`; every
pair-table path (8,930; 12,415; 4,997; 5,655; 914; 610; 814; 1,553; 176 files; sum 35,888); tests
172 files, 32,420 lines; migrations 125 files, 2,844 lines, 2,997 in all; the eleven specifier counts
(57, 44, 27, 22, 18, 11, 9, 6, 4, 2, 1); 838 commits, 2026-07-06 to 2026-08-30;
`status-archive.md:160,557-558,624-625,1924,1931,1941`; `HISTORY.md:9-12,102,117,151,153,198-200,236,263`;
`STATUS.md:17-28,38`; `plans/2026-07-07-pass-2-1-harvest.md:4`; both harvest documents at the cited
lines; `member-auth/lib/auth.ts:6-14,279`; `hooks.server.ts:18,54`; `+layout.svelte:8-22`;
`package.json:48`; the cutover runbook; `CLAUDE.md` "Member-data imports"; the Stripe, documents,
and member-auth paths; `CLAUDE.md:149` for `ci.yml`.

**URLs fetched, carries:** arXiv 2505.23419 (section 4.4 sentences); Cloudflare Email Sending
pricing (Workers Paid, 3,000 included, $0.35 per 1,000); Decap editorial workflows
(`cms/collectionName/entrySlug`, opens a pull request).

**Fails or does not reproduce:**

| Tag | Finding |
|---|---|
| "six of the sixteen existed by 2026-07-07, the other ten first appear 2026-07-13 or 2026-07-14 [`git log --reverse -- <module>`]" | Eight existed by the end of 2026-07-07 and eight appear on the 13th or 14th. Reproduced two ways. |
| "No wall-clock hours of the owner's own time are recorded anywhere in the repository [`grep -ri hours docs/`]" | The command returns fourteen lines, one of them "Geoff sleeping ~9h", which the same paragraph cites. The claim holds on reading; the tag as written does not show it. |
| "The status API lists 16 incidents in the ten days to 2026-09-04 [incidents.json, payload from 2026-08-26]" | The feed is a rolling window. Fetched 2026-09-04 it spans 2026-08-21 to 2026-09-04 with 39 incidents, 30 of them from 2026-08-25 on. The number cannot be reproduced against the URL and reads stale the day it was written. |
| "Counting files under `src/routes/admin/club/` and `src/admin-club/` that import each symbol ... `OfficeList` 14, ... `AdminTable` 1 [the grep regex]" | The regex reproduces every number exactly. The regex matches single-line imports only, and six toolkit imports in those directories span lines, so the numbers are not "files that import each symbol": a file-level check gives `AdminTable` 5 and `StatusChip` 11. The command carries; the sentence's meaning does not. |
| "`AdminTable`, `ExpandableRow`, `StatusChip`, `ListToolbar`, `Pagination`, `ToolbarDisclosure`, and ... each carry a header saying they graduated from `aksailingclub-org` [src/lib/admin-toolkit/*.svelte:2-4]" | `ToolbarDisclosure.svelte` lines 1 to 4 carry no such line; `index.ts:8-10` carries it. Six of the seven components and all three modules carry it. |
| "4,023 commits, 2026-05-24 to 2026-09-04 [`git log`]" | 4,027 at `660f92bf`. |
| "the Members pass about 3.4M subagent tokens with zero conductor questions to the owner [status-archive.md:624-625]" | The record reads "0 (one coordination note he answered)". |
| Front door: derivable, on "The traditional setup" and Leg 3 | Both cite `aksailingclub-org` by name (`HISTORY.md:236,263`; `STATUS.md` for 200 a day). The register forbids naming a consumer site on the front door. The sentences are derivable; the tags are not, and the section line does not say which. |

### `[opinion]` tags

Labelled where a reader would otherwise take them as fact: yes, with three exceptions.

- "so a site built on the current engine starts from those components rather than deriving them
  [verifiable: the table; cairn-cms src/lib/admin-toolkit/]" is an inference. The tree verifies that
  the components exist; "starts from" is the counterfactual the next clause then hands to the reader.
  Tag it `[opinion]` and keep the hedge.
- "The initial membership and assets build landed in two calendar days as agent-built code on the
  engine's seams [verifiable: the table; `81634ca`]" carries a duration the table verifies and an
  implied effort it does not. Add the unrecorded-spend clause in the same sentence.
- "content is plain markdown files in a repository the organization owns [verifiable:
  what-the-scaffold-wrote.md]" states ownership as a tree fact. The tree shows files in a repository.
  Who owns the account is a choice, and in the production case it is a personal account.

The traditional setup's advantages remain `[opinion]` throughout. That is honest and still lopsided
against a cairn side cited to the tree; unchanged from round 2 and not repeated as a finding.

### Per-leg grades

| Leg | Logic | Evidence | Honesty |
|---|---|---|---|
| The traditional setup | B. Unchanged; the shape is described by capability. | B-. The promised cairn treadmill now arrives, tree-verified; the advantages stay opinion. | B+. Symmetric now; a derivable section names the consumer site in two tags. |
| Leg 1, CMS plus admin tool | A-. The developer's alternative is in and the member correction holds. | A-. Every checked tag carries. | A-. The "what cairn ships" list buries magic-link, its strongest differentiator against the named alternative. |
| Leg 2, content in git | A-. Unchanged. | A-. Decap and the rate-limit page fetched and carry. | A. Unchanged. |
| And why markdown | B. Unchanged. | B. Unchanged. | A-. Unchanged. |
| Leg 3, one platform | B. The asymmetry is re-scoped; the account count is still not stated. | B. The outage sentence is right; the status count is a rolling snapshot; nothing on data backup or account ownership. | B. The sign-in dependency on beta email and the DMARC write are absent. |
| Leg 4, no page builder | B+. Right for components; silent on islands. | B. Unchanged. | A-. Unchanged. |
| Leg 5, the case report | B-. No inference is drawn; one inference is tagged verifiable; three non-speed studies sit under "Speed". | B. Nine of nine table rows reproduce; the module split and the hours tag do not; fourteen studies are cited to be disclaimed. | C+. The subject is the author, and the report does not say so; "two calendar days" is an overnight run with unrecorded spend. |
| Already extensible, measured | B. The facts are facts. | A-. All five round-2 failures fixed; the toolkit count is a regex artifact. | B. "A repository the organization owns" is a choice stated as a fact. |

**Overall: B-.** Up from C+. Legs 1, 2, and 4 would carry a front door now. Leg 3 needs two
operational facts it omits. Leg 5 is honest about what it does not infer and not yet honest about
who its subject is.

### Comparison with round 2

Improved: every `[supported]` tag now carries (five were partial); the five failed counts reproduce;
Leg 5's logic rose from D+ to B- by dropping the contradicted inference; Leg 3's logic rose from C+
to B; the register findings (self-description, grading nouns, the killed sentence) are closed. Not
improved: the traditional setup's advantages remain uncited opinion; the case report replaced an
overclaim with an undisclosed confound; no round has yet raised backup, account ownership, or the
auth-on-beta-email dependency, and this round finds all three absent.

---

## Part 3: ranked changes

1. **Disclose that the case's subject is its author.** (addition) In "The case report" after the
   first paragraph: "The site's developer is the engine's author: 799 of the site's 838 commits carry
   the engine's author name, the repository is under that author's personal GitHub account, and the
   toolkit components named below graduated from this site into the engine during the measured
   window [verifiable: aksailingclub-org `git log --format=%an | sort | uniq -c`; CLAUDE.md:255;
   cairn-cms src/lib/admin-toolkit/index.ts:8-10]. The record measures the engine's author extending
   his own engine and says nothing about a second developer [opinion]." Add "built by the engine's
   own author" to both derivable forms.
2. **Correct the module split.** (correction) Replace "six of the sixteen existed by 2026-07-07, the
   other ten first appear 2026-07-13 or 2026-07-14" with "eight of the sixteen existed by the end of
   2026-07-07 (`member-format` and `ui` on the 6th; `assets-store`, `classes-store`, `club-action`,
   `club-email`, `club-settings`, `payments` on the 7th); `ledger` first appears 2026-07-13 and the
   other seven 2026-07-14".
3. **Fix the hours tag.** (correction) Replace "[verifiable: `grep -ri hours docs/`]" with
   "[verifiable: `grep -ri hours docs/` returns fourteen lines, none an hours-of-work figure; the
   nearest is 'Geoff sleeping ~9h' at docs/status-archive.md:1941]".
4. **Pair the two days with the unrecorded spend.** (rewording) In "The sentences the record
   supports" and the derivable form: "landed in two calendar days, as an overnight agent run whose
   token spend the record does not carry, with the owner's own time unrecorded". Tag the "starts
   from those components" clause `[opinion]`.
5. **Add data backup and account ownership to Leg 3's drawbacks.** (addition) "The organization's
   own data, members, payments, documents, and media, lives in D1 and R2 inside the Cloudflare
   account; the published docs carry no backup or restore procedure for either [verifiable:
   docs/admin, docs/extend, docs/reference, by absence]. Whether the Cloudflare and GitHub accounts
   belong to the organization or to its developer is a choice this document does not make; in the
   production case the repository is under the developer's personal account [verifiable:
   aksailingclub-org CLAUDE.md:255]." Reword "a repository the organization owns" in Leg 3 and the
   Leg 2 counterweight to "a repository under an account the organization controls, when it does".
6. **Add the sign-in dependency on beta email, and the DMARC write.** (addition) In Leg 3's
   evidence after the Email Sending sentences: "Editor sign-in is a magic link sent through Email
   Sending, so an unready sender means no editor can sign in; the engine parses that failure
   (`E_SENDER_NOT_VERIFIED`) because one consumer met it in production [verifiable: src/lib/email.ts;
   CLAUDE.md 'Durable gotcha (Cloudflare email)']. Enabling Email Sending writes an apex DMARC record
   at `p=reject` on the organization's domain [verifiable: same]." Restore or re-point the missing
   `docs/internal/2026-08-11-t4b-email-spike.md` the `CLAUDE.md` gotcha cites.
7. **Fix the status-API sentence.** (correction) "The status API is a rolling window; read on
   2026-09-04 it listed 39 incidents from 2026-08-21, among them ..." with the read timestamp, or
   drop the count and keep the link and the three named incidents.
8. **Cut the general-studies paragraph to what bears on the reader's decision.** (cut) Keep
   SWE-bench Live with its repair caveat, one sentence for SecureVibeBench, CodeRabbit, and Veracode
   together, METR 2025 with the 2026 follow-up, and Borg. Move SWE-Bench Pro, Rahman, Watanabe,
   Evaluating AGENTS.md, Kim, How Coding Agents Fail, the METR survey, Peng and Cui, Shen and
   Tamkin, and Agarwal to the evidence file with a one-line pointer. Rename "Speed, off the table"
   to "Speed, skill, and later maintenance" for what remains.
9. **Re-scope "What the developer never writes" and promote magic-link.** (rewording) Retitle to
   "What the developer would otherwise install or write elsewhere". Mark `src/lib/audit/`,
   `src/lib/doctor/`, `scripts/checks/`, and `src/tests/` as "engine internals no consumer writes
   in any stack" rather than counting them toward the never-writes total. In Leg 1's "What cairn
   ships" list, lead with "the magic-link editor login, where Keystatic's GitHub mode requires
   each editor to hold a GitHub account with write access and Decap requires an identity provider
   [verifiable: https://keystatic.com/docs/github-mode; https://decapcms.org/docs/backends-overview/]".
10. **Define the toolkit count or recount it.** (correction) Either "files whose single-line import
    statement names the symbol (six multi-line imports in those directories are not counted)", or
    recount with a file-level check and use `AdminTable` 5, `StatusChip` 11, and the rest as that
    method gives.
11. **Move consumer-site tags out of derivable sections.** (correction) In "The traditional setup"
    and Leg 3, replace "aksailingclub-org docs/HISTORY.md:236,263" and "aksailingclub-org
    docs/STATUS.md" with "one production site's record, docs/internal/record/2026-09-04-cairn-case/
    03-evidence-round-2.md, 1E and Priority 3", or add "the tags name a consumer site and are
    internal" to those two section lines.
12. **State developer cost in the board's terms or as unmeasured.** (addition) After the token
    figures in "What the ratio says": "No dollar or hour figure for developer cost exists in either
    repository; the token figures convert to money only at a model's published price, which this
    document does not apply [opinion]."
13. **Add the deferred-failure sentence to the treadmill paragraph.** (addition) After "npm is the
    surface a cairn site patches": "A site that stops applying updates keeps serving on its pinned
    version; the risk is deferred to the next platform floor, framework major, or change to the beta
    email API [opinion; verifiable: docs/extend/upgrade-cairn.md for the floors]."
14. **Count the cairn shape's accounts.** (addition) In Leg 3's claim: "The cairn shape is one
    Cloudflare account, one GitHub account, a payments provider, organizational mail, and a
    registrar unless DNS moves to Cloudflare: four or five accounts [opinion]."
15. **Add the no-support sentence.** (addition) Leg 1 drawbacks: "The engine has no vendor and no
    support contract; the developer is the support [verifiable: package.json, no support field;
    docs/why-cairn.md]."
16. **Narrow Leg 4 for islands.** (rewording) "cannot be overridden per occurrence; an island, by
    contrast, carries its props in the file [verifiable: docs/extend/add-an-island.md]".
17. **Add the commit-count caveat.** (addition) After the later-commits table: "A commit here is one
    conductor-batched agent change; the counts describe the record's shape and not effort [opinion]."
18. **Small corrections.** (correction) "4,023 commits" to "4,027" or "about 4,000"; "zero conductor
    questions to the owner" to "zero conductor questions and one coordination note"; cite
    `index.ts:8-10` for `ToolbarDisclosure`'s graduation; "Open questions for round 2" to "Open
    questions".
19. **Add a plain-language glossary for the derivation.** (addition) An appendix keyed to the five
    vocabulary maps above, so the front-door writer has the plain equivalents in hand and the editor
    routing line the register requires can be written from it.
20. **State the no-developer facts in one place for the derivable forms.** (addition) One tagged
    sentence for the front door: "Starting a cairn site needs a developer: the scaffold is
    unpublished and its chapters assume one; adding a form, a booking page, or a shop needs the
    same developer, since content is Posts and Pages [verifiable: ROADMAP.md:74;
    packages/create-cairn-site/README.md; CLAUDE.md 'What cairn is']."

## Verdict

**SOUND AFTER FIXES.** The structure now holds: every study carries its own sentence, every
case-report row reproduces from its command, and no leg draws an inference its evidence contradicts.
What remains is one disclosure the case report cannot go without (its subject is its author), two
operational facts Leg 3 omits (data backup and account ownership), one dependency it omits (editor
sign-in rides a beta email product), and a list of count and tag corrections a writer can apply from
the items above.

**Ready for the audience-lens pass and the front-door derivation?** Yes for the audience-lens pass
now; the front-door derivation should wait on items 1, 5, and 6, because each changes a derivable
sentence rather than an internal one.
