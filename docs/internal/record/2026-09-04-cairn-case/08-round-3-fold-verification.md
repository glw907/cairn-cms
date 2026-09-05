# Round-3 fold verification: the cairn case (v4)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `e1790435`, 937 lines. Review folded:
`docs/internal/record/2026-09-04-cairn-case/06-round-3-review.md`. Audience lens read for section 3:
`07-audience-lens.md`. Verification ran read-only against `cairn-cms` at `e1790435` and
`aksailingclub-org` at `836d324` (verified with `git -C ... rev-parse HEAD`; no file in either repo
was modified). Date of check: 2026-09-04.

---

## Part 1: the twenty ranked changes

### 1. Disclose that the case's subject is its author. FOLDED

Lines 557-564: "The site's developer is the engine's author, and that bounds what the case shows.
799 of the site's 838 commits carry the engine's author name, the repository is under that author's
personal GitHub account, and the toolkit components named below graduated from this site into the
engine during the measured window [verifiable: `git log --format=%an | sort | uniq -c` (799
`glw907`, 29 `github-actions[bot]`, 10 under the author's full name); the site's CLAUDE.md:255
(`glw907/aksailingclub-org`); cairn-cms src/lib/admin-toolkit/index.ts:8-11]. The record measures
the engine's author extending his own engine, in his own accounts, with his own agent workflow, and
says nothing about a second developer [opinion]."

Both derivable forms carry the disclosure. Line 657: "One production site, built by the engine's
own author, landed its membership and assets admin in two calendar days". Line 822: "One production
site, built by the engine's own author, carries about 36,000 lines".

Reproduced: `git log --format=%an | sort | uniq -c` gives 799 `glw907`, 29 `github-actions[bot]`,
10 `Geoffrey L. Wright`; 838 total. `CLAUDE.md:255` reads
"- **This repo (glw907/aksailingclub-org)** is the NEW site". Both exact.

### 2. Correct the module split. FOLDED

Line 573: "eight of the sixteen existed by the end of 2026-07-07 (`member-format` and `ui` on the
6th; `assets-store`, `classes-store`, `club-action`, `club-email`, `club-settings`, `payments` on
the 7th); `ledger` first appears 2026-07-13 and the other seven 2026-07-14".

Reproduced below (Part 2, tag 1). Exact.

### 3. Fix the hours tag. FOLDED

Lines 593-595: "[verifiable: `grep -ri hours docs/` returns fourteen lines, none an hours-of-work
figure; the nearest is \"Geoff sleeping ~9h\" at docs/status-archive.md:1941]".

Reproduced below (Part 2, tag 2). The rewrite is more accurate than the review's own description of
the defect.

### 4. Pair the two days with the unrecorded spend. FOLDED

Lines 645-648: "The initial membership and assets build landed in two calendar days, as an overnight
agent run whose token spend the record does not carry, with the owner's own time unrecorded, and
with the first build rendering shells and demo data that moved onto live data a week later".

The derivable form carries it too (line 657): "in two calendar days as an overnight agent run whose
spend is unrecorded".

The "starts from those components" clause is now tagged `[opinion]` and reversed into a question,
lines 630-632: "Whether a site built on the current engine starts from them rather than deriving
them is an inference this record cannot test, since the components exist because this site derived
them, and a site's own screens still compose them [opinion]."

### 5. Add data backup and account ownership to Leg 3's drawbacks. FOLDED

New subsection at lines 352-363, "**Data, backup, and whose accounts.**": "The organization's own
data, members, payments, documents, and media, lives in D1 and R2 inside the Cloudflare account; the
published docs carry no backup or restore procedure for either, a gap the docs owe [verifiable:
`grep -rniE \"backup|restore|d1 export\" docs/admin docs/extend docs/reference` returns only
migration and key-rotation prose]." And: "Whether the Cloudflare and GitHub accounts belong to the
organization or to its developer is a choice this document does not make; in the production case the
repository is under the developer's personal account [verifiable: one production site's
CLAUDE.md:255, internal]."

The review's monitoring finding (a.5 in the IT-admin reader) is folded here too, lines 356-358: "No
monitoring, alerting, or uptime check is in the published docs beyond the scaffold's `healthz`
route".

The ownership reword landed in both places the review named. Leg 3, lines 385-387: "the content is
plain markdown files in a repository under whichever GitHub account holds it, portable by clone when
the organization controls that account [verifiable: docs/extend/what-the-scaffold-wrote.md; opinion
on control]". Leg 2 counterweight, line 230: "since the content is files in the repository its
GitHub account holds".

Reproduced: the stated grep returns 13 lines, none of them a backup or restore procedure for D1 or
R2. The absence claim holds. The tag's characterization is loose: the hits are the CSRF guard's
"restores the Origin check", the key-rotation page, an example address `Backup@Site.com` in
`auth-store.md`, an audit rule about color, and a components sentence. There are no migration hits at
all. PARTIAL on the tag's wording only, not on the claim.

### 6. Add the sign-in dependency on beta email, and the DMARC write. FOLDED, with one defect

Lines 304-311: "Editor sign-in is a magic link sent through Email Sending, so an unready sender means
no editor can sign in; the engine parses that failure (`E_SENDER_NOT_VERIFIED`) because one consumer
met it in production [verifiable: src/lib/email.ts:79-101; CLAUDE.md \"Durable gotcha (Cloudflare
email)\"; the full record at docs/internal/record/2026-08-11-t4b-email-spike.md, which CLAUDE.md
cites at a stale path]. Enabling Email Sending writes an apex DMARC record at `p=reject` on the
organization's domain, which the admin track documents [verifiable: docs/admin/own-your-domain.md:115;
CLAUDE.md:261]. Editor sign-in therefore depends on a beta product on the paid plan [opinion]."

Reproduced: `src/lib/email.ts:85-101` carries `errorCode` and `emailSendFailure` parsing
`E_SENDER_NOT_VERIFIED`. `CLAUDE.md:261` reads "It writes DNS records including an apex DMARC at
`p=reject`". `docs/admin/own-your-domain.md:115` reads "Onboarding also writes a DMARC policy at
`_dmarc.yourdomain`. It tells receivers to reject any mail". The record exists at
`docs/internal/record/2026-08-11-t4b-email-spike.md`.

**Defect.** The clause "which CLAUDE.md cites at a stale path" is false at this commit. `git show
e1790435 -- CLAUDE.md` shows the same commit fixed the pointer:
`-captured body: docs/internal/2026-08-11-t4b-email-spike.md.` /
`+captured body: docs/internal/record/2026-08-11-t4b-email-spike.md.` `CLAUDE.md:263` now cites the
correct path. This is the one correction still owed. It sits inside a `[verifiable]` tag in a
derivable section, which is why it matters.

### 7. Fix the status-API sentence. FOLDED

Lines 334-337: "The status API is a rolling window; read on 2026-09-04 it listed, among others,
Durable Objects errors on 2026-08-26, Workers Builds degraded for 1 h 39 min on 2026-08-27, and
Workers KV errors in Western Europe for 4 h on 2026-08-31 [verifiable:
https://www.cloudflarestatus.com/api/v2/incidents.json, a rolling feed; the count on any later read
differs]."

The document took the review's second branch: the count is dropped, the link and the three named
incidents stay, and the read date and the rolling-feed caveat are stated. Nothing numeric remains to
reproduce. The three named incidents were not re-fetched in this verification, since the feed is a
rolling window and a later read cannot confirm a past one; the document now says exactly that.

### 8. Cut the general-studies paragraph. FOLDED

Lines 508-513 keep only the pointer: "Ten further studies the evidence file records (SWE-Bench Pro,
Rahman et al., Watanabe et al., Evaluating AGENTS.md, Kim et al., How Coding Agents Fail Their Users,
the METR self-report survey, Peng et al. and Cui et al., Shen and Tamkin, Agarwal et al.) bear on
task type, context files, review burden, and skill formation, and none tests this partition; they
stay in the evidence file with their numbers".

What the review asked to keep is what remains in the body: SWE-bench Live with its repair caveat
(lines 494-499), SecureVibeBench, CodeRabbit, and Veracode as one sentence (lines 499-507), METR 2025
with the 2026 follow-up, and Borg (lines 515-524).

The heading is "**Speed and later maintenance.**" (line 515) rather than the review's proposed
"Speed, skill, and later maintenance". The skill-formation study (Shen and Tamkin) moved out of the
body, so the shorter title is the correct one for what remains. FOLDED, with the title improved on
the review's suggestion.

### 9. Re-scope "What the developer never writes" and promote magic-link. FOLDED

Retitled at line 746: "**What the developer would otherwise install or write elsewhere.**" The four
engine-internal groups are split into their own table, lines 763-768: "| Engine internals no
consumer writes in any stack | Module | Size |" carrying `src/lib/audit/`, `src/lib/doctor/`,
`scripts/checks/`, and `src/tests/`, out of the carried-modules total.

Leg 1's list leads with the differentiator, lines 143-148: "What cairn ships that the developer would
otherwise install or write elsewhere, the differentiator first: the magic-link editor login, where
Keystatic's GitHub mode requires each editor to hold a GitHub account with write access and Decap
requires an identity provider [verifiable: docs/why-cairn.md;
https://keystatic.com/docs/github-mode; https://decapcms.org/docs/backends-overview/, the two vendor
pages not fetched this pass]".

The unfetched-page disclosure is an honesty gain the review did not ask for.

### 10. Define the toolkit count or recount it. FOLDED

Lines 698-706: "Counting files under `src/routes/admin/club/` and `src/admin-club/` whose `import {
... } from '@glw907/cairn-cms/admin-toolkit'` statement names each symbol, multi-line imports
included (four such statements exist there): `OfficeList` 16, `TextInput` 12, `FieldLabel` 11,
`StatusChip` 9, `SelectInput` 8, `EmptyState` 7, `itemNoun` 6, `AdminTable` 4, `computeCountLine` 3,
`PageHeader` 3, `ageFromBirthdate` 3, `ExpandableRow` 3, `ListToolbar` 3, `Pagination` 2".

The document took the recount branch. Reproduced exactly below (Part 2, tag 4).

### 11. Move consumer-site tags out of derivable sections. FOLDED

Traditional setup, line 75-76: "[verifiable: one production site's record,
docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, 1E; internal]". Leg 3, line
300-302: "docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, Priority 3; internal".
Leg 3's section line, lines 270-271: "Front door: derivable, with every vendor number replaced by a
link; two tags marked internal cite a consumer site's record through the evidence file."

`grep -n aksailingclub` over the file returns no hit before line 491, so no derivable section
(lines 34 to 465) names the consumer site. Leg 3's two internal tags are the Priority 3 quota line
and the new `CLAUDE.md:255` ownership line, which matches the section line's count of two.

Minor residue: the traditional setup's section line still reads a bare "Front door: derivable." while
carrying one `; internal` tag. The tag itself no longer names the site, so the register rule is met.

### 12. State developer cost in the board's terms or as unmeasured. FOLDED

Lines 814-816: "No dollar or hour figure for developer cost exists in either repository; the token
figures convert to money only at a model's published price, which this document does not apply
[opinion]."

Placed after the token figures in "What the ratio says", as the review asked.

### 13. Add the deferred-failure sentence to the treadmill paragraph. FOLDED

Lines 79-81, directly after "npm is the surface a cairn site patches [opinion]": "A site that stops
applying updates keeps serving on its pinned version; the risk is deferred to the next platform
floor, framework major, or change to the beta email API [opinion; verifiable:
docs/extend/upgrade-cairn.md for the floors]."

### 14. Count the cairn shape's accounts. FOLDED

Lines 277-279: "Counted, the cairn shape is one Cloudflare account, one GitHub account, a payments
provider, organizational mail, and a registrar unless DNS moves to Cloudflare: four or five accounts
[opinion]."

### 15. Add the no-support sentence. FOLDED

Leg 1 drawbacks, lines 128-129: "The engine has no vendor and no support contract; the developer is
the support [verifiable: package.json, a `bugs` field and no support field; docs/why-cairn.md]."
Repeated in Leg 3's new ownership subsection, lines 361-363.

Reproduced: `package.json` carries `"bugs"` at line 24 and no `support` key.

### 16. Narrow Leg 4 for islands. FOLDED

Lines 417-421: "what the component looks like lives in code, changes for every page at once, and
cannot be overridden per occurrence; an island, by contrast, carries its props in the file, which is
per-occurrence configuration in the content [verifiable: docs/extend/configure-rendering.md;
docs/extend/add-an-island.md]".

### 17. Add the commit-count caveat. FOLDED

Lines 608-609, immediately after the later-commits table: "A commit here is one conductor-batched
agent change; the counts describe the record's shape and not effort [opinion]."

### 18. Small corrections. FOLDED (all four)

- Line 783: "4,027 commits, 2026-05-24 to 2026-09-04". See Part 2, tag 6 for the drift note.
- Line 624: "the Members pass about 3.4M subagent tokens with zero conductor questions and one
  coordination note".
- Line 614: "ToolbarDisclosure.svelte:3; index.ts:8-11" (the review asked for `index.ts:8-10`; the
  document's 8-11 is the correct span, verified below).
- Line 847: "## Open questions".

### 19. Add a plain-language glossary. FOLDED

Lines 887-937, a "## Vocabulary" appendix with a 43-row table keyed "Term | Who it stopped | Plain
equivalent", introduced at lines 889-893: "The five readers of the round-3 review each stopped on
terms this document uses in a house sense. The table merges their maps, term by term, with the
reader it stopped and the plain equivalent the front-door derivation uses."

Merge check against the five per-persona tables, in Part 3 below.

### 20. State the no-developer facts in one place. FOLDED

Leg 1 drawbacks, lines 123-125: "Starting a cairn site needs a developer: the scaffold is unpublished
and its chapters assume one; adding a form, a booking page, or a shop needs the same developer, since
content is Posts and Pages [verifiable: ROADMAP.md:74; packages/create-cairn-site/README.md:16;
CLAUDE.md \"What cairn is\"]."

Reproduced: `ROADMAP.md:74` reads "- [ ] **`create-cairn-site` ships**". The document cites
`README.md:16` where the review cited the file; line 16 is "**macOS and Linux only.** Windows is not
supported", which is the Windows refusal rather than the developer assumption. The developer
assumption sits elsewhere in the same README. The citation is off by target but not false, since the
page is the right one and the surrounding lines carry both facts. FOLDED, with the pointer worth
narrowing to the chapter list.

**Score: 20 of 20 folded.** One folded item carries a factual defect (item 6's stale-path clause).
Two carry loose pointers (item 5's grep characterization, item 20's line number).

---

## Part 2: the seven failing `[verifiable]` tags, reproduced

All commands ran with `git -C /var/home/glw907/Projects/aksailingclub-org` at `836d324`, or in
`cairn-cms` at `e1790435`. Neither repo was modified.

### Tag 1: the module split. VERIFIED

Command: `git log --reverse --format=%ad --date=short -- src/admin-club/lib/<module>.ts`, per module,
run both with and without `--follow` (identical results).

| Module | First commit date |
|---|---|
| `member-format` | 2026-07-06 |
| `ui` | 2026-07-06 |
| `assets-store` | 2026-07-07 |
| `classes-store` | 2026-07-07 |
| `club-action` | 2026-07-07 |
| `club-email` | 2026-07-07 |
| `club-settings` | 2026-07-07 |
| `payments` | 2026-07-07 |
| `ledger` | 2026-07-13 |
| `club-db` | 2026-07-14 |
| `households-store` | 2026-07-14 |
| `household-surgery` | 2026-07-14 |
| `manual-payment` | 2026-07-14 |
| `member-types` | 2026-07-14 |
| `money-store` | 2026-07-14 |
| `refunds` | 2026-07-14 |

Eight by the end of 2026-07-07, named exactly as the document names them; `ledger` on the 13th; seven
on the 14th. My number matches the document's corrected figure in every particular.

### Tag 2: the hours tag. VERIFIED

`grep -ri hours docs/` returns 14 lines. Read in full, none is an hours-of-work figure: two RV-rule
72-hour notice periods in `2026-07-17-member-waivers-design.md`, an eight-hours-early clock bug in
`2026-08-22-events-redesign-harvest-findings.md`, a CI hang in
`2026-08-25-email-announce-harvest-findings.md`, two `HISTORY.md` lines (a silent grind and the same
clock bug), a four-hour-old worktree in the design benchmark, two `offer_window_hours=72` settings
lines, and four 72-hour waiver clauses.

`docs/status-archive.md:1941` reads "**PASS 2.1 EXECUTING OVERNIGHT (2026-07-07, the extended Fable
session; Geoff sleeping ~9h):". That line does not contain the string "hours", so it is not among the
fourteen. The document's phrasing, "returns fourteen lines, none an hours-of-work figure; the nearest
is 'Geoff sleeping ~9h' at docs/status-archive.md:1941", is exactly right, and corrects the review's
own claim that the ~9h line was one of the fourteen.

### Tag 3: the status API. VERIFIED as rewritten (nothing numeric left to reproduce)

The document no longer asserts a count. It states the feed is a rolling window, gives the read date
(2026-09-04), names three incidents, and warns that a later read differs. I did not re-fetch the feed:
a rolling window read on a later date cannot confirm or refute a past read, and the document now says
so in the tag itself. The defect the review found (a stale count presented as a fixed fact) is gone.

### Tag 4: the toolkit count. VERIFIED

Method: a Python parse of every `.svelte`, `.ts`, and `.js` file under `src/routes/admin/club/` and
`src/admin-club/`, excluding `.test.ts`, matching
`import\s*\{([^}]*)\}\s*from\s*'@glw907/cairn-cms/admin-toolkit'` with `re.S` so multi-line statements
are captured, then counting distinct files per symbol.

Result: 24 import statements in 24 files, of which 4 span lines. Per-symbol file counts:

`OfficeList` 16, `TextInput` 12, `FieldLabel` 11, `StatusChip` 9, `SelectInput` 8, `EmptyState` 7,
`itemNoun` 6, `AdminTable` 4, `computeCountLine` 3, `ExpandableRow` 3, `ListToolbar` 3, `PageHeader` 3,
`ageFromBirthdate` 3, `Pagination` 2.

Every one of the fourteen numbers in the document reproduces, and "four such statements exist there"
reproduces. My numbers are the document's numbers.

### Tag 5: the `ToolbarDisclosure` graduation header. VERIFIED

`src/lib/admin-toolkit/ToolbarDisclosure.svelte:3` reads "The admin toolkit's trigger-plus-panel
disclosure, extracted from `ListToolbar`'s own overflow", which is the deeper graduation the document
now describes rather than a site graduation. `src/lib/admin-toolkit/index.ts:8-11` reads "Born in
aksailingclub-org's theme layer and graduated here by re-expression, not a file copy: ...
`ToolbarDisclosure` itself graduated a level deeper, out of `ListToolbar`'s own two duplicated
disclosure mechanics ... rather than out of a site." Lines 8 to 11 carry both halves, so the
document's `8-11` span is correct and the review's proposed `8-10` would have clipped it.

The other six components carry a site-graduation line at lines 2 to 4 as claimed: `AdminTable`
("graduated from aksailingclub-org's `src/admin-club/toolkit/AdminTable.svelte`"), `ExpandableRow`,
`StatusChip`, `ListToolbar`, `Pagination`, and the three `.ts` modules `list-toolbar`,
`pagination-window`, and `format` each at line 1.

### Tag 6: the commit count. VERIFIED, with a one-commit self-reference note

`git rev-list --count 660f92bf` gives 4,027, which is the review's number and the document's number.
`git log --oneline | wc -l` at the document's own commit `e1790435` gives 4,028, since the commit that
folded this review is itself the 4,028th. First commit 2026-05-24, last 2026-09-04, both as stated.

The correction the review asked for landed. The residual off-by-one is inherent to a repository
counting itself, and the review offered "about 4,000" as the alternative if that matters.

### Tag 7: the conductor-questions figure. VERIFIED

`docs/status-archive.md:624-625` reads "**Budgets**: ~3.4M subagent tokens (workflow 2.72M, fix round
0.36M, Opus re-read 0.14M); conductor questions to Geoff: 0 (one coordination note he answered)."

The document's line 624, "the Members pass about 3.4M subagent tokens with zero conductor questions
and one coordination note", is exact.

---

## Part 3: the three derivable-sentence changes

The review gated the front-door derivation on items 1, 5, and 6, because each changes a sentence a
front door would lift.

**Author disclosure (item 1).** Reads as asked. The internal paragraph at 557-564 carries the three
facts and the `[opinion]` scope sentence. Both derivable forms carry "built by the engine's own
author" in their first clause, at lines 657 and 822, so no lifted sentence can lose the disclosure.

**Backup, restore, and account ownership (item 5).** Reads as asked. Leg 3 gains a named subsection
carrying all three facts, and the ownership reword reached both places where the old absolute
"a repository the organization owns" stood (Leg 3 at 385-387, Leg 2 at 230). The document goes past
the review by adding the monitoring absence in the same paragraph. The only slip is the grep tag's
description of what the hits are, noted under item 5.

**Sign-in on beta email, with the DMARC write and the re-pointed record (item 6).** Reads as asked in
substance: the dependency sentence, the failure code, the DMARC write, the "beta product on the paid
plan" judgment, and the re-pointed record path are all present, and each citation reproduces. The
trailing clause "which CLAUDE.md cites at a stale path" is the one sentence that does not read as the
review asked, because the same commit removed the stale path it describes.

---

## Part 4: the Vocabulary appendix against the five maps

The appendix (lines 895-937) is a three-column table: Term, Who it stopped, Plain equivalent. Checked
row by row against each persona's map in the review.

**(a) The professor's map.** Seven terms: graduated, harvest, pass, conductor, seam, register,
tokens. All seven present, each attributed to "professor". The two disambiguating riders survive:
"never a CPU register" and "never an auth token".

**(b) The designer's map.** Fourteen entries: deploy, admin, app, platform, adapter (both senses),
manifest, directive, fieldset, seam, chassis, theme, worker, and the register/harvest/graduate/concept
group. All present. The two adapter senses are kept as two rows, "adapter (cairn's)" and "adapter
(SvelteKit's)", which the single merged row would have collapsed. `island` is added as a row, from
the audience lens rather than this map.

**(c) The IT admin's map.** Thirteen entries: deploy, admin, app, platform, repository, worker, D1,
R2, bindings, migrations, magic link, seam, chassis. All present. The deploy row merges both senses in
one cell: "publishing a page rebuilds and re-releases the site; there is no change window", which
carries the designer's sense and the admin's change-window objection together.

**(d) The board member's map.** Twenty entries. All present: cairn, SvelteKit, Cloudflare/Workers, D1,
R2, GitHub/repository, markdown, magic link, admin, seam, toolkit, npm/release/"Consumers must",
tokens, pass, CSRF, migration, frontmatter, manifest, directive, holding branch. The two the map said
to drop for this reader, frontmatter and holding branch, carry the "dropped for this reader" ruling in
their cells.

**(e) The small-business owner's map.** All of (d) plus save against publish, editor's two senses,
site against admin, and domain. All four present as rows. The map's "fine" list (draft, preview, media
library) is correctly absent, since the map raised no objection to those.

**Verdict: all five maps merged, no term dropped.** Three terms from the audience lens's must-define
tier (3.2) have no row: render, Email Sending, and scaffold/`create-cairn-site`. That tier was not
what item 19 asked the appendix to carry, so this is an optional addition rather than a gap.

---

## Part 5: banned terms in derivable sections

Checked the audience lens's section 3.3 "Must not use" list against the derivable sections
(the traditional setup, Legs 1 to 4, and the two derivable forms in Leg 5 at 657-663 and 822-827).
"Untagged" here means used without a plain equivalent in the Vocabulary appendix.

Banned terms that do appear in a derivable section, every one of them carrying an appendix row:
manifest (179, 180, 194, 206, 227, 250, 395), directive (256, 261, 263, 417, 423, 434, 436, 438, 459),
fieldset (193, 244), frontmatter (244), island (265, 419, 421), platform (80, 268, 290, 292, 300, 301,
341, 368), Worker (294, 400), bindings (275, 402), migration (132, 234, 355, 368, 402, 453, 460), CSRF
(662 in the derivable form), register (119, 120), shell (94, 109, 149, 826), frame (370).

Banned terms confined to internal sections or to the appendix itself: chassis (921 only), harvest
(593-623 and 935), graduate (559-619 and 936), conductor (590-624 and 934), implementer (591, 791),
dispatch (626), tokens (624, 808, 809, 932). None reaches a derivable section.

Consumer-site name: `grep -n aksailingclub` returns no hit before line 491, so no derivable section
names the site. The two `; internal` tags that reach the site's record do so through the evidence file
or through an unnamed "one production site's CLAUDE.md:255".

Record scaffolding (steel man, leg, claim, counterweight, derivable) appears throughout and has no
appendix row. That is correct: those words are the record's own structure and appear in no derivable
sentence. The two derivable forms at 657-663 and 822-827 carry no banned term without an appendix row.

**No banned term survives untagged in a section marked derivable.**

---

## Part 6: tell scan

- **Em dashes:** zero. `grep -c "—"` returns 0. The only ` -- ` occurrences are inside git commands
  in the case-report tables (lines 568, 570, 572, 573, 575, 600), which are code, not prose.
- **Grading words:** zero. No seamless, robust, powerful, elegant, delightful, leverage,
  comprehensive, streamlined, polished, or productive anywhere in the file. The register rule against
  grading either side holds; the document even states it at line 16, "it grades neither side".
- **"Not X but Y":** zero matches.
- **Connector openers:** zero. No sentence opens with Moreover, Additionally, Furthermore, Building
  on, Notably, Importantly, In addition, That said, or Crucially.
- **Setup-colon payoffs:** four label-colon constructions remain, all functioning as list or table
  introductions rather than rhetorical reveals: "The mechanism statement that survives:" (253), "The
  counterweights that are facts:" (384), "The sentence the two halves support:" (770), "What it
  supports:" (803). Each is followed by a substantive clause, not a punchline. Acceptable residue in a
  record of this shape; a front-door derivation should not carry the form.
- **Three-item lists:** present but load-bearing throughout (account counts, module lists, class
  totals). None reads as a rhetorical triple.

---

## Verdict

**One correction owed, then READY FOR THE OWNER'S REVIEW.**

1. Line 308: delete ", which CLAUDE.md cites at a stale path". The same commit that folded this
   review fixed that pointer, so the clause is false at `e1790435` and sits inside a `[verifiable]`
   tag in a derivable section. Line 833's account of the item is accurate and needs no change.

Two optional tightenings, neither blocking:

2. Line 354-355: the grep tag says the hits are "only migration and key-rotation prose". The stated
   grep returns key rotation, the CSRF guard's "restores", an example address, an audit rule, and a
   components sentence, and no migration hit. The absence claim holds; the description of the hits
   does not.
3. Line 125: `packages/create-cairn-site/README.md:16` points at the Windows refusal. The
   developer-assumption fact sits elsewhere on that page.

Everything else verified. Twenty of twenty ranked changes folded. All seven failing tags reproduce at
my own numbers, with one inherent one-commit drift on the repository's own commit count. The three
gating derivable sentences read as the review asked, with the single exception above. The Vocabulary
appendix merges all five persona maps with nothing dropped. No banned term survives untagged in a
derivable section. The tell scan is clean.
