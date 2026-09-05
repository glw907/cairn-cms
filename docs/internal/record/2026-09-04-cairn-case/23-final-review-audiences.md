# Final review, axis four: how the document addresses each audience (v9b, `8e1583fa`)

Read-only. Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `8e1583fa`, 1,413
lines, prose to line 1021 and 390 notes after. Line numbers are against that commit. Inputs read
in full: `07-audience-lens.md` (the v3 audience pass, its front-door order, its vocabulary ruling),
`06-round-3-review.md` and `13-round-5-review.md` (the persona verdicts and vocabulary maps),
`2026-08-14-audience-profiles.md`, `docs-register.md`, and the document's own Vocabulary appendix.
The argument's truth is out of scope. The axis is whether each reader finds their answers, where,
and what stops them on the way.

The derivable set is lines 44 to 447 (the traditional setup through Leg 4, including the shape
section) plus the two first-person forms at 662-670 and 875-881. Everything else is record only.

---

## 1. Reader by reader

### 1.1 The evaluating extender (the profiles record's extender in arrival state)

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | What is this, and where do my screens go? | Leg 1 claim, 93-95 (note 30). Custom route and toolkit, 99-103 (note 32). |
| 2 | What do I get, and what do I write? | Out of the box, 97-99 (note 31). The boundary, 113-115 (notes 38, 39). What the custom code starts from, 132-134 (note 48). The other option and what cairn brings, 136-150 (notes 51 to 56). Increment table, 803-820, record only. |
| 3 | Will the next release break my screens, and what does the stack tie cost? | Snapshot gate, 104-105 (note 34). Seam moved inside the frozen tier, 129-130 (note 47). Treadmill and deferred failure, 76-88 (notes 23 to 29). The tie and its exits, 377-403 (notes 164 to 178). |

**In their voice.** "The identity is the first sentence and the boundary is two paragraphs later.
Sign-in leads the comparison now, and the Keystatic and Decap pages are in the notes. I still
cannot see what an ordinary update asks of me. Two hundred and two lines over eighty-seven
releases is a rate until you show me one. And the section between Leg 1 and Leg 2 tells me what
Rails and Sentry did with agents. I came for what I would write."

**What still stops them.** Three things. First, the treadmill paragraph they read most closely
carries a leaked note: line 80 reads "`v0.24.0` [^23]+\.[0-9]+\.[0-9]+' CHANGELOG.md`; `git tag |
grep -E ...`", the body of note 23 spilled into the prose. Second, the lens's two unmet needs
from v3 are still unmet: no example of one `Consumers must` line, and no per-screen signal in
files, routes, actions, and tables (the increment table adds import counts per subpath, which is
a step, and still counts lines). Third, "the adapter gives you" at 97 uses cairn's own "adapter"
undefined, and "access map" and "audits through the same sink" at 101 are engine nouns with no
gloss. A competent SvelteKit developer reads past them. The lens ruled them out of the front door.

**Vocabulary ruling.** Holds where it matters to this reader. The house terms they resent
("harvest", "graduated", "conductor", "dispatch") are absent from the derivable range. What
survives: "the brief" three times (116, 267, 411), "the register" (116), "the charter" (264),
"counterweight" (383), and ten "Leg n" cross-references. These are the record's own scaffolding.
The lens says strip them on derivation. That is fine for the record and a burden on the deriver.

**Footnote channel.** Serves them. They will click the Keystatic, Decap, and Tina pages (notes 52,
59, 77, 112) and the `check:surface` pointer (notes 34, 53). The 91 bare "Opinion" notes and the
25 "restates the preceding sentence's note" notes are noise they skip.

### 1.2 The skeptical computer science professor

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | What is claimed, exactly? | Each leg's opening paragraph: 93-95, 197-199, 284-289, 409-413, 452-456. The shape's claim, 156-165. |
| 2 | What is the evidence, and what does it not test? | Each leg's evidence and counter-evidence. The concessions at 496-497, 523-526, 544-545, 622-624. Open questions 5 and 7, 928-951. |
| 3 | Who is the subject, and who is the author? | Now answered. Disclosure, 577-584 (notes 246, 247). First-person forms, 662-670 and 875-881. "It is one author's site", 743. |

**In their voice.** "You answered my question about the subject, in the first person, and the
disclosure is in the same paragraph as the measurement. Then the revision that moved the tags to
the end broke the apparatus I would use to check you. The legend points at three templates. Two
notes leaked into the prose. A run of notes beside the pair table carries the wrong numbers. Fix
the apparatus before anyone grades the argument on it."

**What still stops them.** This reader's channel is the notes, and the v9b restructure damaged it
in five ways, all mechanical.

1. **The legend is broken.** Lines 23-26 read "`[^2]` for a fact checkable against the tree ...
   `[^3]` for a claim backed by a study ... `[^4]` for a statement that is checkable but was not
   cited here, or `[^5]` for a judgment. The fourth tag exists so that `[^6]` marks only
   judgments." Notes 2, 3, and 4 are placeholders: "Verifiable: <path or URL>.", "Supported:
   <citation>.", "Uncited: checkable against <what>." The conversion turned the four kind names
   into footnote references. A reader learning the system from the preface is sent to templates.
2. **Two notes leaked into the body.** Line 80 (the treadmill count) and line 580, which is the
   author disclosure: "during the measured window [^246]`, 10 under the author's full name); the
   site's CLAUDE.md:255 (`glw907/aksailingclub-org`); cairn-cms src/lib/admin-toolkit/index.ts:8-11]".
   The most important sentence in the case report, for this reader, is the one with the defect.
3. **The `Supports:` fields do not keep the preface's promise.** Lines 27-30 promise "the figures
   the sentence turns on, so a checker reproduces every number from the note alone." Twenty-four
   notes carry date fragments as figures ("Supports: 2026, 08, 21, 22" at note 26; "Supports:
   026, 09, 04, 18, 4, 2025, 06, 12" at note 142, whose sentence is "Three in six months"). Notes
   304 to 316 carry their neighbours' numbers: note 304, `wc -l` over `src/lib`, lists "28,
   10,139, 2,655, 33, 40, 446" and not 68,644; note 315, the site's history, lists "87, 0.22.0,
   0.96.0, 73", which are the engine's. Notes 330 and 331 read "Uncited: ." and the sentence
   using them (887-889) refers to a tag kind by footnote number. Notes 29 and 111 read
   "Opinion: ;".
4. **Sentences that earn no tag were kept.** Line 26 says "A sentence that could earn no tag was
   cut." The 25 cadence sentences ("Publish means live[^385].", "Git has no `DELETE`[^353].")
   carry a note that says only "restates the preceding sentence's note". They earned no tag.
   Their markers are glued to the word (47 glued against 308 spaced), so they also read as a
   typographical error 47 times.
5. **One false sentence about the document itself.** Line 902-903: "the only vendor names in this
   document are in citations of public numbers." The shape section names Rails, Sentry, Basecamp,
   Vercel, Phoenix, Charm, Django, thoughtbot, Payload, and Filament in prose (169-193). Leg 1
   names Keystatic, TinaCMS, and Decap in prose (137-143). The sentence was true of v3 and is not
   true of v9b.

Also: line 157 duplicates "The shape has four parts" back to back.

**Vocabulary ruling.** Not this reader's concern. Their stops are "tokens", "pass", "conductor",
"harvest", "register", all confined to the record sections, all in the Vocabulary table.

**Footnote channel.** It is their channel, and it is the part of the document the restructure
hurt most. The URLs and commands that survive intact (the Cloudflare pages in notes 121-159, the
git commands in notes 243-266, the arXiv links in notes 205-234) are exactly right in kind. The
defects above sit between this reader and them.

### 1.3 The working SvelteKit designer

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | Does it handle the editor half, and how do editors sign in? | Out of the box, 97-99. Sign-in against Keystatic and Decap, 139-143 (note 52), now the lead of the comparison. Rich text against CodeMirror, 271-274 (notes 112, 113). |
| 2 | What does the admin half cost me? | DaisyUI tie, toolkit, and the audit as a done-gate, 385-391 (notes 169, 170). The audit as a reviewer of their work, 147-149 (note 55). Markdown-only, 271-277. Treadmill, 76-88. The CSRF seam defect, 645-651, record only. |
| 3 | What do I write, what do I install? | 132-134, 144-150. Increment table, 803-820, record only. |

**In their voice.** "Sign-in leads now, and the pages are cited. The DaisyUI tie is stated
plainly, and the audit is called what it is to me, a reviewer. I still size work in screens and
forms, and the only per-section table I get is route lines and import counts. And the document
says my public site is free of your stack and stops. It never says what an admin screen off your
toolkit costs."

**What still stops them.** The off-chassis admin cost is still unsized and not stated as unsized;
the tie paragraph (385-395) sizes the public side and the deploy-elsewhere rewrite and skips the
one between. "The adapter gives you" (97) collides with the SvelteKit adapter they know, and the
lens ruled cairn's "adapter" off the front door. "hast helpers" (260) is undefined. The editor
collision the lens ruled on is live in one paragraph: 271-274 has "cairn's body is CodeMirror over
markdown", then "Editors feel that difference first", then "where a visual editor asks nothing",
the tool sense and the person sense meeting in three sentences. Line 150 has "an editor UI its own
project maintains". The shape section's Rails and Vercel benchmarks (169-193) are a detour on the
way from Leg 1 to Leg 2 for this reader.

**Vocabulary ruling.** The 3.3 bans fail in the derivable range for this reader's map: "adapter"
three times (97, 204, 382), "platform" nine times in both senses, "manifest" six, "directive" nine,
"fieldset" two, "shell" five, "frame" two, "bindings" three, "Worker" once (314). Each has a row
in the Vocabulary table, so the deriver has the plain form in hand. The 3.2 define-on-use terms
mostly arrive undefined at first use: "seams" (95) has no apposition until 133; "toolkit" (102) is
defined by its list, which is acceptable; "scaffold" (103) is undefined until 123 and 312; "GitHub
App" (216) is undefined and sits in the same document as "one SvelteKit app" (93). Defined
properly on first use: magic link (mechanism at 97 before the term at 108), render (99), holding
branch (201-204), snapshot gate (104-105), Waymark (391).

**Footnote channel.** Serves them for the four competitor pages and the toolkit reference (notes
52, 59, 77, 112, 170). Otherwise skipped.

### 1.4 The world-weary IT admin

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | What runs where, and whose accounts hold it? | The account list, 284-287 (note 117). The account count, 292-294 (note 120). Ownership as a choice, 367-369 (note 160). The production case, all under the developer's personal accounts, 369-372 (note 161). Members on an account, 372-374 (note 162). |
| 2 | What breaks, how often, and who is paged? | Outage table and "three in six months", 330-346 (notes 141 to 146). No SLA on the $5 plan, 342-344 (note 145). Sign-in on beta email, 354-355 (note 150). The DMARC write, 355-357 (note 151). No monitoring beyond `healthz`, 364-365 (note 158). |
| 3 | What happens when the developer leaves or updates stop? | Deferred failure, 86-88 (note 29). No support, 127-128 (note 45). Key rotation, 215-217 (note 81). Backup and restore: R2 no versioning, 359-361; D1 Time Travel 30 days paid and 7 free, 361-362; the docs owe a procedure, 363-364 (notes 155 to 157). Exports, 397-401 (notes 174, 175). Account transfer, 365-367 (note 159). |

**In their voice.** "It finally says whose accounts, and that in the one real case they are all
the developer's. It says the database goes back thirty days on paid and seven on free, that file
storage has no undo, and that the docs owe a restore procedure. Sign-in rides a beta mail product,
and turning it on writes a reject-all mail record on our domain. That is the page I would hand my
board. One sentence I would still add, in these words: nobody is paged."

**What still stops them.** Little. The "nobody is paged" sentence is implied by 364-365 and not
said. "zone" (296, 308) and "WAF" (286) are undefined in the text and absent from the Vocabulary
table. The "Members can be added to an account under scoped policies" sentence (372-374) is the
recommendation they want, stated as a possibility. The register's vendor rule is honored by the
section line at 282-283, so the outage table is a record artifact and they know it.

**Vocabulary ruling.** Their map's terms (D1, R2, bindings, migrations, Worker, magic link, GitHub
App, deploy) all appear in the derivable range and all have rows. "DMARC at `p=reject`" is glossed
in the text at 355-356 and in the table. "apex" (355), "nameserver" (316), "reverse proxy" (348),
"TLS" (286), "DDoS" (286), "Universal SSL" (298), "Time Travel" (361) have no rows.

**Footnote channel.** Serves them best of the six. Notes 121 to 159 are the Cloudflare pages they
would open, one per claim, which is the register's own vendor-link rule already applied.

### 1.5 The nonprofit board member approving a budget

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | What does it cost, in money, per year? | The bill, 307-309 (note 130): $5 a month once per account, the domain, $20 a month per zone if the full WAF is wanted, D1, R2, and 3,000 emails inside the paid quotas. "The limits move. Read them on Cloudflare's own pages", 310. Registrar at cost, 306. Email Sending paid, 354. Developer cost unmeasured: 869-871 (note 325), record only, and "did not record what it cost", 664, in the first-person form. |
| 2 | What do we own if the developer leaves? | Ownership as a choice with the production case, 367-374. What the organization holds, 397-402 (notes 173 to 176). MIT, 401. |
| 3 | Who supports it if something breaks or a vendor changes terms? | No vendor, no support contract, the developer is the support, 127-128 (note 45). Beta, 354, with the "beta" row in the table. |

**In their voice.** "Hosting is five dollars and a domain, and I am told to read the limits on the
vendor's pages. Fine. What we own is now a choice, and I see that in the one real case the
developer owns everything. Who supports it: our developer, and nobody else. The line I would
budget on is the developer. That line is unmeasured, and the sentence saying so sits eight hundred
lines in, not beside the five dollars."

**What still stops them.** Placement. The lens's "must hear first" for this reader was that a
developer is required and is the largest cost line, and that the document does not price it. Both
sentences now exist. The first is at 123-124, the fourth paragraph of Leg 1. The second is at
869-871, inside "Already extensible, measured", which is record only. A board member reading Leg
3's bill paragraph sees $5 and a domain and nothing beside it. Everything else on their list is
present and in the derivable range.

**Vocabulary ruling.** The 3.3 ban does not hold for this reader in the derivable text, and it
cannot in a record. What matters is the translator's table. It covers their map (cairn, SvelteKit,
Cloudflare, D1, R2, GitHub, markdown, magic link, admin, seam, toolkit, npm, "Consumers must",
tokens, pass, CSRF, migration, frontmatter, holding branch, scaffold, engine, beta, SLA, registrar,
gate). It lacks: "Workers Paid", "Email Sending", "zone", "WAF", "TLS", "DDoS", "egress". The
bill paragraph uses five of those seven.

**Footnote channel.** In their way, and it does not matter, since the derived sheet strips it.
The 390 superscripts and the glued cadence markers read as clutter to this reader.

### 1.6 The small-business owner who wants a working website

**Three questions, answered where.**

| Order | Question | Where v9b answers it |
| --- | --- | --- |
| 1 | Will it exist without a developer, and can I add a form, a shop, a booking page? | Yes, both in one place: 123-127 (notes 42, 43, 44). "No one else is on call", 124. |
| 2 | Can I change a page myself? | 97-99: sign in from an emailed link, write with a live preview, publish. Save against publish, 201-206. "Editors never see git", 205. "Publish means live", 206. Markdown to learn, 272-274. |
| 3 | What does it cost, and who do I call? | 307-309. The developer is the support, 127-128. Down means wait: "When the network fails globally, a cairn site fails with it", 344-345, without the "nothing to do" clause. |

**In their voice.** "I need to hire someone to start and to add anything past writing. I can
change a page from an emailed link if I learn a bit of formatting, and a save is not live until I
publish. Nobody supports it but the developer. I found all of that. I had to get past a paragraph
about member databases to reach the sentence that told me I need a developer."

**What still stops them.** The order inside Leg 1. Between the claim (93-95) and the sentence
they need (123) sit the toolkit primitives list (99-103), `createAuthChannel` with "its own D1
store, its own session" (110-113), and `MEMBER_DB` beside `AUTH_DB` and `APP_DB` (111-113). The
lens's row for "Members are a different case" said the reader learns only that members are
complicated. Unchanged. "Editors never see git" (205) and "Editors learn markdown syntax" (272)
are still two sections apart; the lens asked for them adjacent. The riddle sentences ("Members are
not editors", 115) read as wordplay to this reader.

**Vocabulary ruling.** The person and tool senses of "editor" meet at 271-274 (see 1.3). "save"
and "publish" are used the way the lens wants. "domain" appears without "your web address", which
the table supplies.

**Footnote channel.** In their way, and stripped on derivation.

---

## 2. Across readers

### 2.1 Reading order against the lens's front-door order

The lens's first screen: identity, where the developer's screens go, the boundary with the
developer-required sentence, content in git, the routing lines. Below the fold: the stack tie, the
traditional shape as steel man, what the developer writes, costs as links, operations, no page
builder, pre-1.0 and the treadmill, the developer's departure, the Leg 5 sentence, the pointer to
the record.

v9b's order: preface; the traditional setup with the treadmill and deferred failure at its end;
Leg 1 (identity, screens, staff and members, boundary, developer-required and no-support and
labor market and pre-1.0, what the custom code starts from, the other option with sign-in leading);
the shape section, with the agent record for Rails, Sentry, Basecamp, Vercel, Phoenix, Charm, and
Django; Leg 2; why markdown; Leg 3 (accounts, cost, setup, agent-operable, outages, vendor size,
beta email, backup, ownership, the tie, the exits); Leg 4; Leg 5; the two record sections; the
appendices.

Three findings. First, within Legs 1 to 4 the order tracks the lens's below-fold list closely:
identity, screens, boundary, the alternative, git, costs and operations, no page builder, with
the departure material folded into Leg 1's drawbacks. Second, two things sit where the lens did
not put them. The traditional setup leads the whole document, and the document defends that at
896-901 as a record decision, correctly; the deriver reorders. The shape section is new since v3,
is marked derivable, and inserts the agent-and-frameworks record between the boundary and content
in git. The lens placed all agent material last and as one sentence. Its first paragraph (155-165)
belongs where it is. Its second (167-193) is Leg 5 material, and it carries ten vendor names in
derivable prose, which is what makes line 902-903 false. Third, the developer-required sentence is
still the fourth paragraph of Leg 1, and the developer-cost-unmeasured sentence is in a record-only
section. Those two placements are the whole of the distance between v9b and the lens's first
screen.

### 2.2 The one change that helps the most readers at once

Move lines 123-130 (developer required, forms and shops, the loop, no support, the labor market,
pre-1.0) to directly after the Leg 1 claim at 93-95, ahead of "Out of the box". Four of the six
readers ask a boundary question before any comparison question (the lens, section 4.2), and this
paragraph is the boundary in plain words. The owner reaches their sentence second instead of
fourth. The board member reads "no vendor and no support contract" before any product noun. The
IT admin reads "pre-1.0" before the seam list. The evaluator loses nothing, since the identity
sentence still leads. The members paragraph (107-115) then follows the out-of-the-box paragraph,
where a developer reads it and a non-developer has already stopped.

### 2.3 What the first-person derivation must add for the board member and the owner

Five things the record cannot carry, because a record states what exists and each of these is a
sentence only the person deriving can say.

1. **The developer's own price.** The record says no dollar or hour figure exists in either
   repository (869-871), and that is the truth about the record. The board member's sheet needs a
   number or a bracket. Only the first person can write "here is what I would budget for the
   build and for a year of keeping it current" and own the estimate.
2. **The ownership recommendation.** The record states the choice and refuses to make it
   (367-369), and reports the production case as the developer's accounts (369-372). The first
   person can say "put the Cloudflare and GitHub accounts in the organization's name on day one
   and make me a member", which is what 372-374 describes as possible.
3. **The down-means-wait sentence.** "When it is down there is nobody to call and nothing to do
   but wait" and "nobody is paged; the vendor's status page is the only signal." The record has
   the facts (344-345, 364-365) and not the plain sentence.
4. **The editor routing line, in the editor vocabulary.** The register requires it in the first
   screen. The record has no sentence written to an editor and should not. The lens's form:
   "Writing for a site built on cairn? Welcome, editors starts with signing in."
5. **The translation.** The record keeps its house terms and supplies the table. The derivation
   applies the table: "the website software", "the hosting company", "where the website's files
   and their history are kept", "sign in by clicking an emailed link, no password", and the
   "editor" ruling (person only; the tool is "the writing surface").

The two first-person forms already in the record (662-670, 875-881) show the voice can do this.
Each speaks as the engine's author about his own club site. Each discloses. Neither yet says any
of the five things above, because each derives from a record-only section and carries only what
that section measured.

---

## 3. Grade

**B.** Every reader's three questions are now answered somewhere in the derivable text, which no
earlier version could say, and two of the six readers still reach their first answer only after
paragraphs written for someone else, while the one reader who uses the notes finds the apparatus
broken by the restructure.

**Against the lens's implicit verdict on v3.** The lens graded nothing explicitly. Its findings
amount to a C+ on this axis: three of the board member's five source facts absent, the
developer-required sentence absent, ownership stated as a fact, no backup or sign-in-on-beta-email
sentence, magic-link sixth of seven, and every non-developer stopped on undefined house terms with
no table to translate them. v9b has landed every "needs, lacks" item the lens listed for all six
readers: the developer-required and forms-and-shop sentences (123-125), the no-support sentence
(127-128), ownership as a choice with the production case (367-374), backup and restore
(359-364), sign-in on beta email and the DMARC write (354-357), deferred failure (86-88),
developer cost as unmeasured (869-871), magic-link leading the comparison (139-143), the audit
as a reviewer (147-149), the commit-count caveat (622-623), and the Vocabulary table (956-1020).
The gain is content. The residue is placement, the define-on-use half of the vocabulary ruling,
and the notes. One grade step up, and the second step is a reorder plus a repair, not new
research.

---

## 4. Ranked changes

1. **Repair the preface legend.** (correction) Lines 23-26. Name the four kinds in prose
   ("Verifiable, for a fact checkable against the tree or a primary document; Supported, for a
   claim backed by a study with a stated sample; Uncited, for a checkable statement not cited
   here; Opinion, for a judgment") and delete the clause "The fourth tag exists so that `[^6]`
   marks only judgments" or reword it to "the third kind exists so that Opinion marks only
   judgments". Retire the placeholder notes 2, 3, 4 and the duplicate Opinion notes 1, 5, 6, or
   make the four of them the definitions.
2. **Un-spill the two leaked notes.** (correction) Line 80: end the sentence at "`v0.24.0` [^23]."
   and move the command text into note 23. Line 580: end at "during the measured window [^246]."
   and move the author breakdown and the two paths into note 246.
3. **Rebuild the `Supports:` fields.** (correction) Strip the date fragments from the 24 notes
   that carry them (26, 47, 51, 142, 143, 144, 148, 240, 243, 245, 248 to 251, 253, 256, 257, 286
   to 288, 298, 316, 317, 333 and their like). Realign notes 304 to 316 to the sentences they
   annotate. Fill notes 330 and 331 or drop them and reword 887-889 to name the kind ("four of
   the ten Uncited tags became vendor-page citations"). Complete notes 29 and 111.
4. **Move the boundary paragraph up.** (rewording) Lines 123-130 to follow 93-95, before "Out of
   the box". The members paragraph (107-115) follows the out-of-the-box paragraph.
5. **Put the developer line beside the bill.** (addition) After 307-309, one sentence: "The
   developer's time is the largest line, and no dollar or hour figure for it exists in either
   repository." Note: Opinion, with a pointer to note 325. The record-only sentence at 869-871
   stays.
6. **Re-mark the shape section's second paragraph.** (cut or move) Lines 167-193 become "internal
   record only" or move into Leg 5 beside the Constraint Decay and BaxBench reading at 471-491.
   Keep 155-165 derivable. Then correct 902-903: "the only vendor names in the derivable sections
   are the three git-backed CMS tools Leg 1 compares, each with its page cited" or whatever is
   true after the move.
7. **Apply the define-on-use appositions at first use in derivable text.** (rewording) "seams"
   at 95 ("documented seams, the extension points a site's own screens attach to"); "Workers" at
   128 ("Cloudflare Workers, the hosting product"); "D1" at 110 ("D1, Cloudflare's hosted
   database"); "R2" at 233 ("R2, Cloudflare's file storage"); "the scaffold" at 103 ("the
   scaffold, `create-cairn-site`, the tool that writes a new site"); "the GitHub App" at 216
   ("the GitHub App, the site's own GitHub identity that makes the commits"); "Consumers must" at
   81-82 ("the list of required changes each release carries"); "the adapter gives you" at 97
   ("the site's configuration gives you", per the lens's 3.3 ruling on cairn's "adapter").
8. **Add the missing rows to the Vocabulary table.** (addition) Workers Paid, Email Sending,
   zone, WAF, TLS and Universal SSL, DDoS, egress, apex, nameservers, reverse proxy, MCP server,
   `llms.txt`, wrangler, `healthz`, Time Travel (cross-reference the point-in-time restore row),
   CommonMark, hast helpers, CodeMirror, GFM, OAuth backend and Git Gateway, agent skill, audit
   sink, access map, role and capability. Every one appears in the derivable range; none has a
   row.
9. **Fix the editor-sense collision.** (rewording) Line 271-272: "cairn's body is CodeMirror over
   markdown" to "cairn's writing surface is a plain-text box (CodeMirror) with a live preview".
   Line 273: "where a visual editor asks nothing" to "where a rich-text tool asks nothing". Line
   150: "an editor UI its own project maintains" to "a writing surface its own project
   maintains". Line 55: "a visual editor a volunteer already knows" to "a visual writing tool a
   volunteer already knows".
10. **Decide the cadence sentences.** (correction) The 25 sentences whose note reads "restates the
    preceding sentence's note" carry no tag under the document's own rule at line 26. Either drop
    their markers and the 25 notes, keeping the sentences, or give each a real note. In either
    case put a space before every remaining marker, so 47 glued markers stop reading as typos.
11. **Cut the duplicate.** (cut) Line 157, "The shape has four parts[^348]." before "The shape
    has four parts: content as markdown ...".
12. **Place markdown-to-learn beside never-see-git.** (rewording) At 205, after "Editors never
    see git", add "They do learn markdown, with a live preview and a tidy pass; Why markdown
    carries the cost." Or move 272-274 up. The lens's row asked for adjacency.
13. **Say who is paged, in those words.** (addition) At 364-365, after the monitoring sentence:
    "Nobody is paged; Cloudflare's status page is the only signal." At 344-345: "and the
    organization has nothing to do but wait."
14. **Point the deriver at the order.** (addition) One sentence in the Preface after "Each
    section carries a front-door line": "The derived page's order is the audience lens's, section
    2 of `07-audience-lens.md`: identity, the developer's screens, the boundary with the
    developer-required sentence, content in git, the routes; the rest below." The record then
    stops needing to be read in front-door order to be derived in it.
15. **Size the off-chassis admin cost, or say it is unsized.** (addition) At 385-391, one sentence
    for the designer: "An admin screen built off the toolkit, in another kit, is not measured
    here; the audit still grades it." The tie paragraph sizes the public side and the
    deploy-elsewhere rewrite and skips this one.
