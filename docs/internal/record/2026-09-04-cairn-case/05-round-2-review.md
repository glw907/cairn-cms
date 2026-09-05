# Adversarial review, round 2: the cairn case (v2)

Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `55d2300d`, 732 lines. Inputs read
in full: the ratified brief, the round-1 review, both evidence files, the strengthening notes.
Standards read: `CLAUDE.md` ("What cairn is"), `docs/internal/what-cairn-is-and-is-not.md`,
`docs/internal/docs-register.md`, `docs/why-cairn.md`, `docs/extend/architecture.md`,
`docs/extend/add-a-second-audience.md`, `docs/extend/add-a-custom-admin-screen.md`. Spot-checks ran
against `cairn-cms` `main` and `aksailingclub-org` at `836d324` (read-only). Every count below was
reproduced with `wc -l` and `find` on 2026-09-04 unless marked otherwise.

What round 1 asked for and v2 delivered, so this review does not repeat it: the two-panel form is
deferred to an open question; the killed "one login for editors and members" sentence is gone and
corrected; competitor names are out of the prose; the Classic Editor and Gutenberg numbers are cut;
the git-section overclaims are fixed; the component-grammar claim is corrected; the missing
drawbacks are in. Those fixes hold. This review attacks what v2 built on top of them.

---

## Part 1: the attack

### (a) The senior developer who has shipped both stacks

**1. Leg 5's own tables refute Leg 5's inference.** The leg's thesis is that cairn hands a site
"small, local, well-specified changes" of the kind the SWE-bench-Live gradient scores highest. The
increment table then records what a real section costs: 326 to 3,120 route lines each, plus a
share of 8,930 lines of shared stores, plus 39 migration sets. The gradient the leg cites puts
anything past three files or 100 lines under 10%. Every production section sits in that regime by a
factor of three to thirty. Only the 90-line scaffold screen sits in the regime the leg praises. The
document's own measurement places its own evidence on the skeptic's side, and the leg does not
notice. The token overruns are consistent with that reading. A senior developer will read the
increment table before the prose and draw the opposite conclusion from the one the leg draws.

**2. The security partition protects cairn's surface, not the organization's.** Leg 5 says cairn
carries "the parts of a site that are correctness-critical and security-bearing". It carries the
editor login, the admin CSRF guard, and the publish path. The production site wrote its own member
login (914 lines), its own Stripe webhook (127 lines), its own waiver and signature module
(`documents/`, 573 lines plus stores), and its own bulk email (1,501 lines). Those are the
money-touching and PII-touching parts of a club's system. They are exactly what the traditional
shape's vendor supplies as configuration. They are exactly what the security studies in the leg say
agents do worst at. And they are exactly what cairn's charter assigns to the site. So the leg's
partition hands agents the safest work on the CMS side and the most dangerous work on the
organization side. The one recorded defect (CSRF at the seam) is the illustration, and the document
files it as a "correction" rather than as the counterexample it is.

**3. The traditional setup is the wrong opponent for the stated reader.** The preface names the
reader as a developer. A developer choosing how to build a club site does not weigh cairn against
WordPress plus a membership product. They weigh cairn against SvelteKit plus Keystatic or Decap plus
a hand-written `/admin`, or against a bespoke app. The evidence file records Keystatic at 134,619
weekly downloads. The document never asks what cairn adds over that stack for a developer who will
write the membership layer either way. The answer exists (the admin toolkit, the audit, the shell,
the seam gate, the skill), but the document never has to make it because it picked an opponent
that cannot ask the question.

**4. The cairn treadmill is promised and never stated.** The traditional section carries
Patchstack's 11,334 vulnerabilities and then says "The cairn shape has its own treadmill, which the
next sections state." No section states it. The record supports a matching paragraph: 87 releases
in 103 days (`CHANGELOG.md`, `0.22.0` to `0.96.0`); the phrase "Consumers must" appears 202 times in
that changelog; the engine declares 37 runtime dependencies and four peers; the production site ran
two engine-adoption passes on consecutive days (`aksailingclub-org docs/HISTORY.md:236,263`); the
repo's own `CLAUDE.md` records a Vite 8 change that broke every consumer build. "A cairn site has no
plugin surface to patch" is true and misleading. npm is the plugin surface.

**5. Leg 3's asymmetry is undercut by Leg 0's concession.** The traditional section admits that
"some bundle the website builder and the portal into one product with one member login". A bundled
membership product is also one vendor, one account, and one bill for the organization. Leg 3's
claim that "the traditional shape assembles those from several vendors" holds only against the
two-product variant. Against the bundled variant, cairn's consolidation is a wash on vendor count and
a loss on capability.

**6. "One staff sign-in" is the killed sentence with one word swapped.** The killed specimen was
"content and custom functions sharing one admin and one sign-in". The document now says "everything
sits in one app behind one staff sign-in" and "Staff therefore learn one admin idiom". Both are true
of the production site. The register objection was two-count, and the factual count is now cleared.
The framing count is not. State the mechanism (`createAuthGuard` over `/admin`) and let the reader
add up the sign-ins.

**7. The DNS and domain point still removes no component.** The document concedes "DNS can sit at
Cloudflare, which consolidates a billing relationship and removes no component". Good. It then
counts TLS, DDoS, and the WAF subset as things "one Cloudflare account supplies". Every hosted CMS
on any competent host also supplies TLS and DDoS mitigation at the edge in 2026. Listing them as
cairn-side consolidation implies the traditional shape lacks them.

### (b) The research-literate reader

Each `[supported]` citation was opened in the evidence files and checked for number, sample, and
scope. The ones that carry are listed in Part 2. These do not carry their sentence as written.

**B1. The SWE-bench-Live gradient is a repair benchmark applied to feature construction.** The
1,319 tasks are GitHub issues resolved by patches. The gradient measures how patch size for a given
issue correlates with resolution. A new 300-line admin screen is not a "patch touching three files"
in that sense. It is greenfield construction against a scaffold, which no cited study measures. The
document uses the gradient in both directions (agents do well at small patches; a screen is small)
and neither direction is licensed.

**B2. Rahman et al. did not measure annotated exemplar documents.** The 4 to 7 point gain came from
retrieval of concrete implementation patterns from the target codebase into the prompt, on
class-level generation. The document says two of the skill's references "are annotated exemplars,
which is the form Rahman et al. measured as moving success most". A reference document an agent
may read is not retrieved code from the repository under edit. Nearest analogue, stated as such,
is the most the study supports.

**B3. The 91.49% denominator is wrong in the sentence.** "In 20,574 sessions, 91.49% of visible
resolutions still needed explicit user correction" reads as 91% of sessions. The study's
denominator is visible resolutions of 16,118 detected misalignment episodes. The evidence file also
records that silent failures are undercounted because episodes are detected by developer pushback.
Both qualifications are missing.

**B4. Kim et al.'s 60 to 69% is for two of three agent architectures.** The evidence file says "on
SWE-Agent and OpenHands". The document generalizes to "in 16,758 agent trajectories".

**B5. The vendor lock-in citation carries nothing.** "In a survey of 114 participants, 35.1% named
over-dependence on a single provider as a core barrier to cloud adoption [supported: Journal of
Cloud Computing, vendor lock-in analysis, n=114]." No author, no URL, no year. The evidence file
says the paper cites the survey rather than conducting it. The finding is about cloud adoption in
general, and the document's own next sentence concedes "No study isolates vendor count as a
variable". A citation whose next sentence disclaims it should be cut.

**B6. "Tens of millions of owners" is not in W3Techs.** W3Techs publishes percentages of the sites
it tracks. The absolute number is the document's inference.

**B7. The token-overrun range understates the record.** "1.4 to 1.75 times its own ceilings" is
derived from events-redesign (2.1M against 1.5M) and events-admin (3.5M against 2M). The
assets-register line the document itself cites (`HISTORY.md:102`) says "blew the plan's 1.5M
ceiling roughly twofold", and the document's own figures for that pass (1.35M plus 2.1M against
1.5M) give 2.3x. The skeptic's reply is understated by the document that wrote it.

**B8. "Six outages in fourteen months" mixes two windows and one non-Workers incident.** The six
postmortems in the evidence file span 2025-06-12 to 2026-02-20, about eight months. The 2026-02-20
incident withdrew BYOIP routes and is marked "not a Workers incident" in the evidence file. The
2025-07-14 incident was the 1.1.1.1 resolver. Counting both against a cairn site overstates. The
2025-11-18 entry gives 11:20 to 17:06 without the evidence file's note that Cloudflare reports the
global outage at about two hours ten minutes with full restoration at 17:06.

**B9. Shen and Tamkin's inference is broader than the study.** The RCT measured comprehension of a
newly learned library (Trio) by mostly junior engineers. "A developer who delegates the parts they
must later maintain learns them less" is a reasonable reading tagged as supported. The study did not
test maintenance. Tag the inference as opinion beside the number.

**B10. A stronger source the document does not use.** Borg et al., "Echoes of AI"
(arXiv 2507.00788, n=151, RCT in phase 2), is in the evidence file and answers the maintainability
objection with a neutral result. The document raises the objection through Agarwal et al. (+18%
warnings, +39% complexity, preprint) and leaves it standing. A research-literate reader will ask why
the peer-reviewed neutral result was omitted when the preprint negative result was kept.

**B11. The Melapress survey and the DryRun figures are correctly left out.** Noted so the writer
does not add them back.

### (c) The charter and register keeper

The document is an internal record, so the published-page register does not bind it directly. The
document says the front door and `why-cairn.md` derive from it. The test applied is therefore:
which sentences can survive derivation, and which will be killed at the door.

**C1. The production case cannot reach the front door as written.** The front-door register says
"Name types of functionality, never a specific consumer site." The strongest evidence in the
document, the "Already extensible, measured" section, names `aksailingclub-org` on every line. The
document never marks which sections are derivable and which are internal. A writer deriving the
front door from this text has no instruction, and the most persuasive material is the least usable.

**C2. Leg 5's scope sentence re-establishes the wrong premise in prose.** The charter's scar tissue:
an effort once "misread 'let developers extend cairn' as 'cairn should own an identity and
permissions substrate'". Leg 5 says cairn "carries the parts of a site that are correctness-critical
and security-bearing". The charter says a site's own auth, actors, data, and domain logic belong to
the developer. cairn carries the security of the editor session and the admin frame. It does not
carry the site's. The sentence overstates cairn's scope in the direction the charter warns about,
and the production record (member auth, payments, signatures as site code) proves the charter right.

**C3. The "product category otherwise bought" column is the two-panel figure in table form.**
Round 1's finding 3.1: a capability-for-capability layout makes a reader conclude that cairn answers
the membership module. The section table maps each site section to "A membership platform", "An
events tool", "An email service". Every row is site code. The column invites the reading the charter
forbids. Rename the column to what the section does and put the category mapping in one tagged
sentence.

**C4. Self-description.** The universal contract bans prose about the docs' own writing. The
document has "the honest size record", "The narrowest honest claim", "The tie, stated whole", "What
cuts against, in full", "Corrections the round-1 review forced, accepted", and "the document does not
claim otherwise". Each tells the reader the document is honest instead of being it. The preface
also tags its own neutrality as verifiable against the register, which is circular. A standard is
not evidence the document meets it.

**C5. Grading words survive.** "Developer comfort" (twice) is a grading noun. "Conventional
increment" grades. "Measured, conventional" grades twice. The register test is whether the reader
would take the sentence as fact; a reader will.

**C6. Vendor specifics are copied, not linked.** $5, $0.35 per 1,000, 3,000 sends, 500 MB and 10 GB,
100,000 requests, 10 ms, 50 recipients, 16 incidents. In the record these serve the argument. At
derivation, every one must become a link or it rots on Cloudflare's schedule. Open question 3
(naming the outage) has a register answer: a dated incident with a link is what the vendor rule
permits, and a copied duration table is what it forbids on a published page.

**C7. Stale and missing paths.** The preface cites "scratchpad evidence.md". The evidence is banked
at `docs/internal/record/2026-09-04-cairn-case/02-evidence.md` and `03-evidence-round-2.md`. Every
"[verifiable: evidence.md, ...]" and "[verifiable: evidence-round-2.md, ...]" tag points at a name
with no path.

**C8. The charter itself carries a stale number.** `what-cairn-is-and-is-not.md` says "all 23
registered rules". `docs/reference/cairn-audit.md` and the tree say 28. The document is right. The
standard is stale. Not the document's defect, but a writer citing both will be asked.

### The strongest objection the document still cannot answer

Leg 5 claims a division of labor that hands agents the work they are measured to do best. The
document's own tables show the site's increments in the size regime the cited gradient scores under
10%, and the site's own code carrying the member login, payments, signatures, and bulk email, which
are the security-sensitive work the cited studies say agents do worst. The one recorded defect sits
at that seam. No study measures cairn's partition, the document says so, and the in-tree
measurements the evidence file told the case to lean on instead point the other way. The only
answer is open question 6, a measured worked screen, and the document says it does not exist.

### The strongest version of the argument that survives

cairn is a git-backed markdown CMS and an admin frame that live inside the site's own SvelteKit
app. Editors sign in from an emailed link and never see git; a save is a commit on a holding
branch, a publish copies it to the default branch, and history and attribution come from git. A
developer's own screens mount in the same admin through a versioned seam held by a snapshot gate,
composed from a shipped toolkit and audited by a shipped rule set. Everything specific to the
organization is the site's code, including its member login, its payments, and its personal data.
One production site shows what that code weighs: about 36,000 lines of site code over about 69,000
it did not write, on eleven engine import paths, with the security-sensitive domain code on the
site's side of the line and one recorded defect at the seam. Coding agents are measured to do worst
on exactly that kind of code, so the site's developer should plan to review it as the hardest part
of the build. cairn's audit, gates, and grader prompt cover the admin half of that review and
nothing of the domain half.

That version keeps every fact, drops the inference the data contradicts, and lands on the charter's
own boundary. It is also derivable, because it names no consumer site once the numbers are stated
as "one production site".

---

## Part 2: the grade

### `[supported]` tags

| Citation | Carries the sentence? | Reason |
|---|---|---|
| Patchstack 2025 (7,966; 96%; 33%) | carries | Numbers and scope match; vendor caveat stated |
| Patchstack 2026 (11,334; 91%; 46%; 5 h) | carries | Matches; vendor caveat stated |
| W3Techs CMS (58.9%) | carries | Matches |
| Journal of Cloud Computing lock-in (n=114) | does not | No author or URL; paper cites the survey; scope is cloud adoption, not vendor count; the next sentence disclaims it |
| W3Techs Elementor (12.8%, ~31%) | partial | Percentages carry; "tens of millions of owners" is not in the source |
| WordPress 2023 survey (n=3,922) | carries | Matches |
| SWE-bench Live (48%, <10%, never) | partial | Numbers carry; it is a repair benchmark, and the document applies it to greenfield screen construction in both directions |
| SWE-Bench Pro (42 to 44%, <18%) | carries | Matches; confound stated |
| Rahman et al. (25 to 34% vs 84 to 89%; +1 to 3; +4 to 7) | partial | Numbers carry; the "annotated exemplars are the form Rahman measured" analogy is not, since the study retrieved code from the target repository |
| Watanabe et al. (83.8%; 54.9%) | carries | Matches; self-selection stated |
| Evaluating AGENTS.md (+4%; 20 to 23%) | carries | Matches |
| SecureVibeBench (23.8%) | carries | Matches; language caveat stated |
| CodeRabbit (2.74x; n=470) | carries | Matches; vendor caveat stated; no URL in the document |
| Veracode (45%; 80 tasks; 100+ models) | carries | Matches; vendor caveat stated |
| Sakib et al. (38.9%; 4,022 PRs) | carries | Matches |
| Kim et al. (60 to 69%) | partial | Figure is for two of three architectures; generalized to all trajectories |
| Ma et al. (18 runs, one task) | carries | Matches |
| METR 2025 (19% slower; 20% faster belief) | carries | Matches |
| METR 2026 (-18%, -4%, +9%; 30 to 50% withheld) | carries | Matches |
| METR survey (3x; n=349) | carries | Matches |
| Peng et al.; Cui et al. (recorded as contested) | carries | Correctly not cited for the case |
| Shen and Tamkin (50% vs 67%; n=52) | partial | Number carries; the maintenance inference is the document's |
| Agarwal et al. (+18%; +39%) | carries | Matches; preprint stated |
| How Coding Agents Fail (91.49%) | partial | Denominator is visible resolutions of misalignment episodes, not sessions; undercount caveat missing |
| "the studies above" (narrowest claim) | partial | Each study carries its own sentence; their aggregation into "succeed most on small local changes" is a synthesis the repair benchmark does not license for construction work |

### `[verifiable]` tags, spot-checked (about half of the total)

Verified against the tree, carries: `docs/extend/architecture.md` (write path, read path, "never
crawl", "What stays engine-internal"); `add-a-second-audience.md` (both paths, `MEMBER_DB`);
`add-a-custom-admin-screen.md` (toolkit list including `ListToolbar`); `what-the-scaffold-wrote.md`
(`signups/`, `APP_DB`, `cairnManifest`); `examples/showcase/wrangler.jsonc` (`AUTH_DB`, `APP_DB`,
`MEMBER_DB`, `MEDIA_BUCKET`); `examples/showcase/src/routes/admin/signups/` (45 + 45) and
`migrations-app/0000_signups.sql` (9); `docs/reference/admin-toolkit.md:22-26`;
`skills/cairn-admin-screens/SKILL.md:3,10,90-97`; the skill's 114 + 1,255 lines and six references
(212, 206, 151, 149, 153, 252); `src/lib/doctor/check-skill.ts:15` (install dir); `ROADMAP.md:74`;
`examples/showcase/src/theme/theme.css:9-11,69`; `examples/showcase/svelte.config.js:1`;
`package.json` (MIT; 18 subpaths excluding `./package.json`; `skills` in `files`); `scripts/checks/`
(33 `.mjs` and `.sh` scripts among 40 files); `docs/reference/log-events.md` (`commit.failed`,
`conflict`); `docs/admin/before-you-start.md` ($5, about $6, certificate unconfirmed 2026-08-11);
`docs/admin/own-your-domain.md` (second token, Workers Builds last); `docs/reference/cairn-audit.md`
(28 rules); `docs/extend/configure-rendering.md` (`tone`, exactly ten descriptors); all fourteen
extend and admin page paths exist; `CHANGELOG.md` (87 version headings, `0.22.0` first); `git`
(4,025 commits at HEAD, first 2026-05-24); `src/lib/*/` line counts for `components` (24,595),
`sveltekit` (10,710), `audit` (10,139), `content` (4,378), `doctor` (2,655), `render` (2,302),
`admin-toolkit` (2,267), `auth-channel` (1,697), `delivery` (1,508), `media` (1,315), `auth`
(1,149), `github` (825); `src/lib` total 68,644 (ts and svelte, tests excluded).

Verified against `aksailingclub-org` at `836d324`, carries: `docs/STATUS.md:17-28` (CSRF blocker,
40 forms) and `:38` (200 a day); `docs/HISTORY.md:9-12,117,102,151,153,198-200`;
`src/hooks.server.ts:18,54`; `src/routes/admin/+layout.svelte:8-22`;
`src/member-auth/lib/auth.ts:6-14,279`; every route line count in the increment table (all eleven
match); every path total in the pair table (8,930; 12,415; 4,997; 5,655; 914; 610; 814; 1,553; sum
35,888); import specifier counts (57, 44, 27, 22, 18, 11, 9, 6, 4, 2, 1); 838 commits, 2026-07-06 to
2026-08-30; 39 migration entries under `migrations/asc-club/`; the cutover runbook and the
`CLAUDE.md` "Member-data imports" section; `ci.yml` runs check, test, build (and e2e).

Fails or does not reproduce:

| Tag | Finding |
|---|---|
| "Every section below imports the same three engine subpaths" | False by the document's own table: `documents/` imports two (`/sveltekit` 5, `/admin-toolkit` 4, no `/components`). Reproduced. |
| "6,085 SQL lines [migrations/asc-club/]" | `find` gives 125 `.sql` files and 2,844 lines under that path. The figure may be all of `migrations/`; as cited it does not reproduce. |
| "170 test files, 32,309 lines [src/tests/]" | 172 `.ts` files, 32,420 lines at the same commit. Minor, but the same commit should give the same number. |
| "OfficeList (14 uses), TextInput (10), FieldLabel (10), SelectInput (7), StatusChip (5), EmptyState (4), itemNoun (4)" | "Uses" is undefined. Files importing each: 16, 12, 11, 8, 9, 7, 8. Occurrences: 68, 51, 75, 34, 44, 23, 20. Neither reproduces the document's numbers. |
| "375 unit and integration files with 4,934 tests plus 78 component files with 1,354 tests [the gate run recorded for main]" | No path. `find` gives 446 `.test.ts` files under `src/tests/`, not 453. A tag that names no artifact is not verifiable. |
| "1.4 to 1.75 times its own ceilings [HISTORY.md:102,151,198-199]" | Line 102 says "roughly twofold"; the document's own figures give 2.3x for that pass. |
| "six outages in fourteen months [the Cloudflare blog, tag outage]" | The six postmortems span eight months; one is BYOIP-only and one is the 1.1.1.1 resolver. |
| "a hand commit bypasses it [what-the-scaffold-wrote.md, cairnManifest regenerates the manifest on build]" | The cited fact is manifest regeneration. Validation bypass is an inference the citation does not carry. |
| Leg 3 claim, "where the traditional shape assembles those from several vendors [wrangler.jsonc bindings]" | The second clause is not in `wrangler.jsonc`. |
| "without failing a build [check-skill.ts:15]" | Line 15 is the install-dir constant. The never-fails behavior lives elsewhere in the file. |
| "[verifiable: scratchpad evidence.md]", "[verifiable: evidence.md, Claim N]", "[verifiable: evidence-round-2.md, ...]" (eleven tags) | Stale or pathless. The banked files are under `docs/internal/record/2026-09-04-cairn-case/`. |
| "The Cloudflare blog, tag outage" as a URL | Not a URL. |

### `[opinion]` tags

Labelled where a reader would otherwise take them as fact: yes, with four exceptions where a
grading judgment carries no tag or the wrong one. "The size ratio is stated in two halves, both read
as developer comfort" (no tag; grading). "a developer adding a capability pays a measured,
conventional increment [verifiable: the two tables]" (the tables verify the sizes; "conventional"
is a judgment). "Staff therefore learn one admin idiom [opinion]" (tagged, but the sentence before
it, "every section is built in the engine's admin toolkit", is the load-bearing one and is a fact).
"a migration cost symmetric to the builder's [opinion]" (tagged; "symmetric" is unmeasured and the
tag is doing heavy work).

### Per-leg grades

| Leg | Logic | Evidence | Honesty |
|---|---|---|---|
| The traditional setup | B. Describes a shape by capability and concedes its variants. | C+. Every advantage is `[opinion]`; the only quantified cost is a security vendor's count, and the promised cairn treadmill never arrives. | B. Steel-manned in prose, under-evidenced against cairn's tree-cited side. |
| Leg 1, CMS plus admin tool | B+. The claim follows and the member correction is exact. | A-. Every tag is a tree path and every checked one carries. | B+. Drawbacks present; the section still ends on the counterweight. |
| Leg 2, content in git | A-. The corrected claim follows from the mechanism. | A-. Best-cited leg; one tag mismatch (validation bypass). | A. The most complete drawback list in the document. |
| And why markdown | B. The narrowed claim follows. | B. Tree-verifiable; the stability qualifier is right. | A-. Directive portability and per-site vocabulary conceded. |
| Leg 3, one platform | C+. The asymmetry holds only against the two-product variant, which the document's own first section concedes. TLS and DDoS are not a differential. | B. Vendor pages carry; the lock-in survey does not; the outage window is muddled. | A-. The tie is stated whole and the incidents are named. |
| Leg 4, no page builder | B+. The narrowed claim is true and defensible. | B. WordPress docs carry; forum-sourced deactivation and an inferred "tens of millions". | A-. Core-block portability conceded against cairn. |
| Leg 5, agents and the division of labor | D+. The inference is contradicted by the document's own increment sizes and by which security-sensitive code the site writes; the gradient is a repair benchmark applied to construction. | B. Studies are reported accurately with four scope stretches (B1 to B4) and one understated record (B7). | B. Counter-evidence is prominent; the scope sentence still overclaims what cairn carries, and "narrowest honest claim" asserts what the tables deny. |
| Already extensible, measured | B. The facts are facts. | B+. Most counts reproduce; five do not (SQL lines, test counts, toolkit uses, "same three subpaths", the gate run). | B. The "product category otherwise bought" column and "developer comfort" grade what the numbers should be left to show. |

**Overall: C+.** Legs 1, 2, and 4 are sound after small fixes and would carry a front door. Leg 3
needs its asymmetry re-scoped. Leg 5's logic fails on the document's own evidence and needs its
thesis reversed, not repaired.

---

## Part 3: ranked changes

1. **Reverse Leg 5's inference to match its tables.** (correction) Replace "The inference that
   this partition hands agents the work they are measured to succeed at most is the case's own,
   backed by the measurements in the next subsection and by no study [opinion]" with: "The
   measurements in the next subsection put every production section past the size at which the
   cited gradient scores under 10%, and put the site's member login, payments, and signatures on
   the site's side of the line, where the security studies say agents do worst. The partition
   hands agents the CMS's safest work and the organization's hardest. The reader should plan to
   review the domain code as the hardest part of the build [opinion]." Retitle "The narrowest
   honest claim" to "The claim the measurements support".
2. **Re-scope Leg 5's carried-parts sentence to the charter.** (correction) Replace "cairn
   carries the parts of a site that are correctness-critical and security-bearing" with "cairn
   carries the correctness-critical and security-bearing parts of the editor session and the admin
   frame". Add one sentence after the module list: "The site's own login, payments, and personal
   data are the site's code, and the production case below shows each as site code [verifiable:
   aksailingclub-org src/member-auth/, src/routes/(site)/api/stripe/, src/routes/admin/club/documents/]."
3. **Add the cairn treadmill paragraph the traditional section promises.** (addition) After "The
   cairn shape has its own treadmill", state: 87 releases from `0.22.0` to `0.96.0` in 103 days
   [verifiable: CHANGELOG.md, git tag]; "Consumers must" appears 202 times in the changelog
   [verifiable: grep CHANGELOG.md]; 37 runtime dependencies and four peers [verifiable:
   package.json]; two engine-adoption passes on consecutive days at the production site
   [verifiable: aksailingclub-org docs/HISTORY.md:236,263]; the Vite 8 dist-svelte break
   [verifiable: docs/internal/record/2026-06-21-e2e-dist-svelte-build-failure.md]. Then: "npm is the
   surface a cairn site patches [opinion]."
4. **Add the developer's real alternative.** (addition) One paragraph in Leg 1 or a short new
   section: cairn against SvelteKit plus Keystatic or Decap plus a hand-written admin, with the
   npm weekly downloads from the evidence file (Keystatic 134,619; Tina 70,261; Decap 3,059, week
   of 2026-08-23) and a factual list of what cairn ships that the alternative asks the developer to
   write (the admin shell, the toolkit, the 28-rule audit, the seam snapshot gate, the skill).
   No grading word.
5. **Mark derivability per section.** (addition) Add a line under each section heading: "Front
   door: derivable" or "Front door: internal record only (names a consumer site)". Under "Already
   extensible, measured", add the derivable form: "one production site" with the numbers and no
   name.
6. **Cut the lock-in survey sentence.** (cut) Delete "In a survey of 114 participants, 35.1% ...
   [supported: Journal of Cloud Computing, vendor lock-in analysis, n=114]." The next sentence
   already disclaims it.
7. **Re-scope Leg 3's asymmetry.** (correction) After the claim, add: "Against a bundled
   membership product that hosts the site, the portal, and the mail, vendor count is equal and the
   capability list is the product's [opinion]." Move TLS and DDoS out of the consolidation list into
   one sentence: "TLS and DDoS protection are edge defaults on every plan, as they are at other
   hosts [verifiable: the two Cloudflare pages]."
8. **Fix the outage sentence.** (correction) Replace "Cloudflare's own postmortems record six
   outages in fourteen months [verifiable: the Cloudflare blog, tag 'outage']" with "Cloudflare
   published six outage postmortems between 2025-06-12 and 2026-02-20; two of them (the 1.1.1.1
   resolver on 2025-07-14 and the BYOIP withdrawal on 2026-02-20) did not touch Workers
   [verifiable: https://blog.cloudflare.com/tag/outage/]." On 2025-11-18, add "Cloudflare's own
   resilience post puts the global outage at about two hours ten minutes, with full restoration at
   17:06 [verifiable: https://blog.cloudflare.com/fail-small-resilience-plan/]."
9. **Correct the token-overrun range.** (correction) Replace "1.4 to 1.75 times its own ceilings"
   with "1.4 to about 2.3 times its own ceilings, which the site's record calls 'roughly twofold'
   [verifiable: aksailingclub-org docs/HISTORY.md:102,151,198-199]." Apply the same range in the
   "What the ratio says" paragraph.
10. **Fix the "same three subpaths" sentence.** (correction) Replace with "Ten of the eleven
    sections import `/sveltekit`, `/admin-toolkit`, and `/components`; `documents/` imports the
    first two; no section imports more than four subpaths [verifiable: the table]."
11. **Reproduce or re-scope the five counts that do not verify.** (correction) SQL lines: recount
    under `migrations/asc-club/` (2,844 across 125 `.sql` files by `find`) or cite the path that
    gives 6,085. Test files: 172 `.ts` files, 32,420 lines under `src/tests/`. Toolkit counts:
    define "uses" as files importing the symbol and use 16, 12, 11, 8, 9, 7, 8, 3, 2, 3, 4, 3. The
    gate run: cite a transcript path or retag as "[verifiable: `npm test` on main]" with the
    `find` file count (446 `.test.ts`). Remove `check-skill.ts:15` from the "without failing a
    build" clause or cite the line that carries it.
12. **Replace the eleven evidence-file tags with paths.** (correction) `scratchpad evidence.md`,
    `evidence.md`, and `evidence-round-2.md` become
    `docs/internal/record/2026-09-04-cairn-case/02-evidence.md` and `03-evidence-round-2.md`.
13. **Narrow the four study sentences.** (rewording) B1: after the SWE-bench-Live sentence add
    "The benchmark measures issue repair, and no cited study measures greenfield construction
    against a scaffold [opinion]." B2: replace "which is the form Rahman et al. measured as moving
    success most" with "the nearest analogue to the retrieved implementation patterns Rahman et al.
    measured, and not the same thing [opinion]". B3: replace "In 20,574 sessions, 91.49% of visible
    resolutions still needed explicit user correction" with "Across 16,118 misalignment episodes
    detected in 20,574 sessions, 91.49% of the resolutions the developer could see still needed an
    explicit correction, and silent failures are undercounted by the method". B4: add "on two of
    the three agent architectures studied". B9: split the Shen and Tamkin sentence and tag the
    maintenance inference `[opinion]`.
14. **Add Borg et al. beside Agarwal et al.** (addition) "In a two-phase experiment with 151
    participants, code written with AI assistance showed no significant difference in later
    completion time or quality when others evolved it [supported: Borg et al.,
    https://arxiv.org/abs/2507.00788]."
15. **Rename the table column and move the category mapping.** (rewording) "The product category
    otherwise bought" becomes "What the section does". Keep the four-category sentence after the
    table, tagged `[opinion]`, as it is.
16. **Remove self-description and grading nouns.** (rewording) "the honest size record" becomes
    "the size record"; "The narrowest honest claim" per item 1; "stated whole" and "in full" drop
    from headings; "both read as developer comfort" becomes "both stated as sizes"; "measured,
    conventional increment" becomes "measured increment". Cut "[verifiable:
    docs/internal/docs-register.md]" from the preface's neutrality sentence and tag it `[opinion]`.
17. **Replace "tens of millions of owners".** (rewording) "so a large share of site owners choose
    builder coupling knowingly".
18. **State the sign-in mechanism instead of the count.** (rewording) "everything sits in one app
    behind one staff sign-in" becomes "`hooks.server.ts` composes `createAuthGuard({ roles, access })`
    over the whole `/admin` subtree, so the club sections use the editors' session". Delete "Staff
    therefore learn one admin idiom across content and club sections [opinion]."
19. **Add the vendor-link rule to open question 3.** (addition) Record: on a published page, the
    incident is a dated link, and the duration table stays in this record.
20. **Flag the charter's stale rule count.** (addition, outside the document) File a one-line
    friction-log entry: `what-cairn-is-and-is-not.md` says 23 registered rules; the reference and
    the tree say 28.

## Verdict

**SOUND AFTER FIXES.** Round 1's structural objections (the form, the killed sentence, the
competitor names, the git overclaims) are resolved, and Legs 1, 2, and 4 now stand on tree-verified
facts with their drawbacks stated. What remains is one leg whose inference its own tables
contradict, one leg whose asymmetry its own concession undercuts, and a set of citation, count, and
register corrections a writer can apply from the list above; if the owner will not accept item 1's
reversal of Leg 5's thesis, the verdict for that leg alone is RETHINK.
