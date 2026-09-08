# Front-door prose comparison against human specimens

Dispatched 2026-09-08 after Geoff's verdict on the draft ("weird AI cadence and marketing-speak"). Opus, fresh context, with five fetched human-written specimens and a measured cadence table. The finding that matters: the draft's balanced-clause share is 58 percent against 23 to 31 in every specimen. Feeds the rewrite and the tellgrader follow-up in `front-door-net-failure.md`.

---

I have everything. Writing up now.

## 1. Calibration specimens (known-good, human-authored)

**A. Drew DeVault, sr.ht general availability** — https://drewdevault.com/blog/sr.ht-general-availability/
Known-good because it is a first-person "here is what I built and how it differs" page by a technical author with an unmistakably personal voice, and it names competitors without hedging about naming them.

> For those who are new, let me explain what makes sr.ht special. It provides many of the trimmings you're used to from sites like GitHub, Gitlab, BitBucket, and so on, including git repository hosting, bug tracking software, CI, wikis, and so on. However, the sr.ht model is different from these projects - where many forges attempt to replicate GitHub's success with a thinly veiled clone of the GitHub UI and workflow, sr.ht is fundamentally different in its approach.

**B. SQLite, "Appropriate Uses For SQLite"** — https://www.sqlite.org/whentouse.html
The canonical "what this is and is not" page: it states the project's own limits flatly, as facts, with no lawyerly framing around them. Closest in genre to Section A.

> SQLite is not directly comparable to client/server SQL database engines such as MySQL, Oracle, PostgreSQL, or SQL Server since SQLite is trying to solve a different problem. […] SQLite does not compete with client/server databases. SQLite competes with fopen().
>
> A good rule of thumb is to avoid using SQLite in situations where the same database will be accessed directly (without an intervening application server) and simultaneously from many computers over a network.

**C. Simon Willison, "Datasette: instantly create and publish an API for your SQLite databases"** — https://simonwillison.net/2017/Nov/13/datasette/
A "why I built this" launch post that opens on the concrete thing, not on an abstraction, and never characterizes its own rhetorical posture.

> I just shipped the first public version of datasette, a new tool for creating and publishing JSON APIs for SQLite databases.
>
> You can try out out right now at fivethirtyeight.datasettes.com, where you can explore SQLite databases I built from Creative Commons licensed CSV files published by FiveThirtyEight.

**D. Tailscale, "How Tailscale works"** — https://tailscale.com/blog/how-tailscale-works
Known-good for an explanatory technical page written in a plain conversational register, with short unbalanced sentences and no aphoristic paragraph endings.

> People often ask us for an overview of how Tailscale works. We've been putting off answering that, because we kept changing it! But now things have started to settle down.

**E. Simon Willison, personal data warehouses (annotated talk)** — https://simonwillison.net/2020/Nov/14/personal-data-warehouses/
Secondary specimen; useful mainly as a second sample of the same author's unbalanced sentence rhythm.

---

## 2. Measured cadence

Sentences segmented after `.!?;`, link syntax stripped, markdown headings excluded. "Two-beat" counts a sentence containing a balanced clause joint (`, and` / `, but` / `, so` / `, which` / `, where` / `, while`, a semicolon, or a `not X but Y` frame). "3+ commas" approximates appositive chaining.

| Text | Sentences | Mean | SD | CV | Min–max | **Two-beat** | 3+ commas |
|---|---|---|---|---|---|---|---|
| **Section A** | 84 | 19.4 | 9.7 | 0.50 | 4–68 | **58.3%** | 17.9% |
| sr.ht (DeVault) | 16 | 26.5 | 7.6 | 0.29 | 12–39 | 31.2% | 25.0% |
| SQLite whentouse | 13 | 17.1 | 9.1 | 0.53 | 4–33 | 23.1% | 23.1% |
| Tailscale | 8 | 21.5 | 9.9 | 0.46 | 8–33 | 25.0% | 37.5% |
| Datasette launch | 8 | 19.4 | 6.7 | 0.35 | 10–29 | 25.0% | 0.0% |

**The finding is not length variance.** Section A's CV (0.50) sits comfortably inside the specimen band (0.29–0.53). The signature is the balanced-clause share: **58% against a specimen range of 23–31%**, roughly double the human rate. Nearly six sentences in ten are built as two beats hinged on a comma. That is the "weird AI cadence" Geoff heard, and it is measurable.

Per-paragraph, worst first:

| Para | Section | n | Lengths | Two-beat |
|---|---|---|---|---|
| P11 | The setup most organizations already run | 5 | 37, 15, 30, 26, 33 | **5/5** |
| P13 | What committing to cairn ties you to | 3 | 29, 18, 17 | **3/3** |
| P1 | opener (ratified) | 3 | 24, 31, 26 | 3/3 |
| P16 | exits | 4 | 20, 20, 15, 13 | 3/4 |
| P21 | Updates | 4 | 20, 29, 15, 27 | 3/4 |
| P7 | The shape underneath cairn | 2 | 24, **44** | 2/2 |
| P20 | No page builder | 7 | 18, 27, 10, 14, 31, 12, 21 | 4/7 |

P11 is the single worst paragraph in the document: five consecutive sentences, all balanced pairs, mean 28 words. P1 also scores 3/3 but is the register's own ratified specimen, which shows the metric alone does not convict — it locates, and the read decides.

---

## 3. Tellgrader output

Built binary at `~/.claude/skills/writing-voice/evals/tellgrader/tellgrader`, run over Section A extracted to `…/scratchpad/sectionA.md`:

```json
{
  "register": "docs",
  "words": 1679,
  "sentences": 97,
  "cadence_cv": 0.533,
  "counts": { "tricolon": 1 },
  "findings": [],
  "tells_per_1000_words": 0
}
```

**Zero findings.** No em dash, no contrast frame, no connector opener, no setup colon, no participial tail, no hedging filler, no slop lexicon, one non-violating tricolon. This is the important negative result: the mechanical gate grades lexicon and punctuation, and Section A was evidently written to pass it. Everything Geoff objected to lives below the checker's resolution — clause balance, stance, and abstraction. The gate is clean and the prose is still ugly, exactly as the register warns ("the gates catch slop, not flat taste").

---

## 4. Per-paragraph findings, in document order

Rewrites use only facts already in Section A or in `docs/internal/record/2026-09-08-polish-inputs/front-door-author-brief.md`.

### P1 — "Before cairn, the small organizations I run sites for…" — **KEEP**
This is the register's own ratified-good specimen (`docs-register.md`, "Calibration specimens", re-ratified 2026-09-08). It measures 3/3 two-beat, which confirms the metric is a locator and not a verdict. Do not touch it.

### P2 — "These organizations' users needed one clean, integrated place…" — **REWRITE**
Tells: `"which is the Cloudflare choice"` — an abstract noun ("the choice") standing in for the concrete act, hung off a non-restrictive relative that should be its own sentence. `"Cost sat under both, because a small organization often has none to spare"` — an aphoristic capper with a spatial metaphor ("sat under") and a cute pronoun dodge ("none to spare"). `"And I needed…"` — a connector opener carrying no adversative work.

> The people who use these sites needed one place to do nearly everything, other than the basic productivity work Google Workspace or Office 365 already covers. I needed the technical side to be something I could leave alone. That is why cairn runs on Cloudflare. Both of those had to be cheap to run, because a small organization usually has no money to spare.

### P3 — "A cairn site is one SvelteKit app…" — **REWRITE (sentence 3 only)**
Sentence 3 is the document's worst single line and the appositive-chain example the brief predicted:

> They write markdown, the plain-text formatting the site's own render function turns into pages, they see the live preview that same function produces, and they publish.

A comma-fenced gloss closes, and then a second independent clause starts on the same comma — a splice the reader has to back up and re-parse. No specimen author writes this.

> A cairn site is one SvelteKit app holding the public pages and an editor admin at `/admin`. Editors sign in from an emailed one-time link, with no password and no GitHub account. They write markdown, the plain-text format the site's own render function turns into pages. The live preview they write against comes from that same function. Then they publish.

### P4 — "The same admin is where a developer mounts…" — **REWRITE**
Tells: `"through seams, the documented extension points that cairn versions and holds still"` — a second comma-fenced appositive gloss, in the same shape as P3, two paragraphs apart. Sentence 2 is a clean tricolon (`renders inside… sits behind… builds from…`), the shape the register flags as cadence even where the punctuation is legal.

> A developer mounts the organization's own screens in that same admin, through seams: documented extension points cairn versions and holds still. A screen written there renders inside the admin and sits behind the same sign-in. It is built out of the admin's ready-made components.

### P5 — "What cairn does not ship is…" — **REWRITE**
Tells: `"What cairn does not ship is the organization's own functionality"` — a pseudo-cleft used to give a plain negative a rhetorical build-up. `"Starting a cairn site needs a developer, and so does adding a form…"` — the balanced ellipsis pair. `"weigh that before anything else on this page"` — the page referring to itself in the third person, the first of seven such moves (see the ranked list).

> cairn does not ship the organization's own functionality. Member management, dues, event registration, and announcements are the site's own code. You need a developer to start a cairn site, and you need one again to add a form, a booking page, or a shop. If your organization has nobody like that and does not plan to get anybody, stop here. cairn is not for you.

### P6 / P7 — "## The shape underneath cairn" — **REWRITE, including the heading**
The worst *section* in the document, and the residue of the heading Geoff already killed.

Tells: the heading itself is the abstract noun that replaced the two-headed one; "the shape" then recurs three more times as the subject of sentences. `"Underneath cairn is a shape I would argue for without it"` — inverted syntax, abstract subject, aphoristic close, all in thirteen words. `"this page does not grade that choice against cairn"` — self-referential and lawyerly. And a 44-word sentence built on a mangled ditransitive: `"it saves that other build the emailed sign-in with no third service in the path, the publish path through git, the admin's components, and a check that fails cairn's own build when a seam moves."` Read "it saves that other build the emailed sign-in" aloud; the reader parses "saves" three ways before landing.

Heading: **"Building this without cairn"**.

> I would want this arrangement even if cairn did not exist. Content is markdown in the organization's own git repository. The admin lives inside the same app as the public site, and the organization's own screens mount into it. Hosting, data, media, mail, and deploy come from one account.
>
> You can assemble all of that yourself, out of SvelteKit, a git-backed CMS, and an admin you write. I am not going to tell you that is the wrong call. What you would be writing yourself is the emailed sign-in with no third service in the path, the publish path through git, the admin's components, and a check that fails cairn's own build when a seam moves.

### P8 — "Content bodies are markdown files…" — **LIGHT REWRITE**
Sentence 1 packs a tricolon inside a two-beat across 27 words. The rest is good; `"Editors never see any of that."` is a genuine plain-voice capper and stays.

> Content bodies are markdown files in the site's own GitHub repository. History, attribution, and rollback come from git, and there is no content server to run. A save commits to a per-entry branch. A deliberate publish copies it onto the main branch with the editor as the commit author, and the site's existing deploy carries it live. Editors never see any of that.

### P9 — "Markdown is plain text…" — **REWRITE**
Tells: sentence 2 is a 32-word comma splice of three independent clauses. `"where a rich-text tool would ask nothing"` — "where" pressed into contrastive service, a precious construction. `"soften that cost without removing it"` — the *X-without-Y* balance capper, the contrast frame with the "not…but" filed off, which is why tellgrader misses it.

> Markdown is plain text. Git's diff and blame work on it the way they work on code. The file still reads without cairn, and any tool or model can read it with no export step in between. The editor pays for that. They have to learn markdown syntax, where a rich-text tool would ask nothing of them. Live preview and a tidy pass make that easier. They do not make it go away.

### P10 — "Files are not a database…" — **REWRITE**
Tells: `"the second save is refused, never merged"` — an *X, not Y* balance. `"A database can erase a record."` sits between two ideas without a connection to either; a reader cannot tell what it is contrasting. Sentence 4 runs 35 words across three clauses joined `and … and … so`.

> Files are not a database. Validation happens in the admin, not at the store, and if two editors save the same entry the second save is refused rather than merged. A database can erase a record. A content file's history works differently: anything personal that reaches one is in the repository's history, in every clone of it, and removing it means rewriting that history. So personal data belongs in the site's database, and content files carry content.

### P11 — "The usual shape is a hosted CMS…" — **REWRITE (highest priority)**
Five sentences, five balanced pairs, 37/15/30/26/33 words. Tells: `"The usual shape"` — the abstract noun again, third section running. `"Good teams build this well, and…"` — a concessive tic bolted onto a factual clause. `"Each part is replaceable on its own, each vendor carries a support contract, and there is a labor market of people who can be hired to work on the CMS"` — a tricolon of balanced independent clauses. `"so 'two systems, two logins' is true of some vendors and false of others"` — the page scare-quoting and adjudicating a claim it never made, which reads as a lawyer's disclaimer rather than an author's sentence.

> Most organizations run a hosted CMS with a theme and plugin market. Beside it sits a membership product, holding the member database, dues with renewals and reminders, event registration, invoices, a directory, and bulk email that handles unsubscribes. Good teams build this well. The membership product supplies all of it as configuration. Each part can be replaced on its own, every vendor comes with a support contract, and you can hire people who already know that CMS. Some products put the site and the member portal behind a single login. Where they are separate products, the same people work in two interfaces with two logins, the member record lives in the vendor's store, and keeping the two connected is the organization's job.

### P12 — "Everything that product configures is, on a cairn site, code…" — **LIGHT REWRITE**
Tells: the mid-sentence parenthetical interruption ("is, on a cairn site, code"), then a four-verb chain.

> On a cairn site, everything that product configures is code. Someone writes it, tests it, secures it, and keeps it running. Dues automation handles money, and it fails in ways someone has to catch.

### P13 — "cairn reaches Cloudflare's database…" — **LIGHT REWRITE**
3/3 two-beat. Sentence 1 runs 29 words to reach its point. `"and I have not sized that rewrite"` is good first-person and stays.

> cairn reaches Cloudflare's database, file storage, and hosting directly. There is no layer that would let you swap the host later, so leaving Cloudflare means leaving cairn or porting it. The repository, the content files, the theme, and the markup of your own screens survive that move untouched. Every data access inside those screens has to be rewritten, and I have not sized that rewrite.

### P14 — "The tie is GitHub too." — **REWRITE**
Tell: `"The tie"` — a fourth abstract noun promoted to grammatical subject, echoing the heading's "ties you to". A five-word abstract capper opening a paragraph is a cadence move, not a sentence.

> You are tied to GitHub as well. Content lives in a repository the organization needs a GitHub account to reach, even though editors never see it, and that same account is where the backup lives.

### P15 — "The admin is DaisyUI on Tailwind…" — **REWRITE**
Tells: `"A screen built off them in another kit is not something I have measured."` Two faults in one line: "built off them in another kit" is genuinely hard to parse, and "is not something I have measured" is the pseudo-cleft hedge (compare P5's "What cairn does not ship is…").

> The admin is DaisyUI on Tailwind. A screen built there works in that idiom, mostly by composing the admin's own components. I have not tried building one in a different kit, so I cannot tell you how that goes.

### P16 — "You keep the repository…" — **REWRITE (last sentence)**
Tells: `"Weigh one large vendor with those exits against smaller vendors each replaceable alone."` — an imperative aphorism that tells the reader what conclusion to draw, compressed to the point of strain ("each replaceable alone"). Sentences 1–3 are good; keep them.

> You keep the repository, every line of SvelteKit in it, and the content as markdown files that read without cairn. The database exports to a SQL file with one command, and the stored files move over the standard S3 API. The engine is an MIT package on npm, and cairn holds none of your material. That is one large vendor, with those exits, set against several smaller vendors you can replace one at a time.

### P17 — "The bill starts at $5 a month…" — **REWRITE (last sentence)**
Tell: `"which this page does not price, because I have no figure for it"` — self-reference plus hedge in one clause.

> The bill starts at $5 a month for Cloudflare's paid Workers plan, once per account, plus the domain. The database, the file storage, and the sign-in email all sit inside that plan's quotas at a club's scale. The largest cost is the developer's time. I have no figure for that, so I am not going to invent one.

### P18 — "Sign-in rides Email Sending…" — **LIGHT REWRITE**
Tell: `"rides"` — verb-as-flourish for "uses"; and a 20-word sentence carrying two unrelated facts about the service on one relative clause.

> Sign-in uses Email Sending. It is in beta, and it needs the paid plan from the first editor who signs in. If the sender is not verified, no editor can get in. Turning it on writes a policy record on your domain telling receivers to reject mail the domain has not authenticated.

### P19 — "The published docs carry no backup…" — **REWRITE (last two sentences)**
Tells: `"there is nothing to do but wait"` — aphoristic capper. `"is a choice rather than a default"` — an abstract-noun predicate that buries an action the reader must take; a human writes the instruction.

> The published docs carry no backup or restore procedure for the database or the file storage. A $5 site carries no uptime commitment. The self-serve terms are "as is". Nobody gets paged. When the network fails globally, the site fails with it, and you wait. Decide on purpose whether the Cloudflare and GitHub accounts belong to the organization or to its developer. Nothing decides that for you.

### P20 — "## No page builder" — **REWRITE**
Seven sentences, four of them balanced pairs, and the passage's argument is hard to follow because two contrasts are interleaved. Tells: `"A mainstream CMS's own block markup is the other case:"` — the setup-colon payoff, in its colonless-adjacent form. `"Turning a third-party builder off is widely reported to leave pages as raw output"` — the outside-observer hedge; the author writes as though summarizing a literature review of his own page. `"Builders are mainstream, and most people using one are not fighting it"` — the concessive tic again ("Good teams build this well"). `"needs a developer here, and needs nobody under a builder"` — a strained balance where "here" and "under a builder" are not parallel. There is also a stray line break mid-paragraph ("and most / people") in the source.

> A block in a cairn content file names a component the site owns, with a few declared attributes. What that component looks like lives in code, so a theme change moves every page at once and no editor drifts one page away from the rest. A page builder keeps that presentation in the content instead, per occurrence. Turn a third-party builder off and, by many accounts, you are left with pages of raw output. A mainstream CMS's own block markup does better: it reads as valid HTML with ignorable comments in any tool. A cairn block does not. Outside cairn it renders as literal text. Builders are mainstream, and most people using one are not fighting them. If you want one page laid out unlike every other page, that needs a developer on cairn and nobody at all under a builder.

### P21 — "cairn is pre-1.0…" — **REWRITE (last sentence)**
Tells: `"Editors keep editing and the site keeps serving; changes need someone who knows the stack"` — the semicolon two-beat, the shape the register's em-dash rule targets regardless of glyph. `"the risk deferred rather than removed until the framework or the host moves under it"` — an absolute-phrase tail hung on a comma, which is precisely the sentence-final elaborative tail the universal contract bans; swapping the em dash for a comma did not fix it.

> cairn is pre-1.0, and a seam has already moved across two minor releases inside the tier meant to stay frozen. Every release carries a "Consumers must" list naming the changes a site has to make. cairn has no vendor and no support contract, so the developer is the support. Editors keep editing and the site keeps serving. Changes need someone who knows the stack. A site that stops taking updates keeps running on its pinned version. That defers the risk. It does not remove it, and sooner or later the framework or the host moves underneath you.

### P22 — "The sign-in model knows two roles…" — **REWRITE (sentence 2)**
Tell: `"A larger or public contributor pool is something a developer builds on the auth seams"` — pseudo-cleft, third instance of the shape.

> The sign-in model knows two roles, owner and editor, and assumes a handful of people who already know each other. If you need more than that, or a public contributor pool, a developer builds it on the auth seams.

### P23 — "## How I build on it" — **REWRITE, plus a content gap**
Tells: `"so read what follows as one author's record"` — the page instructing the reader how to weigh the page. `"as an overnight agent run whose cost I did not record"` — a parenthetical hedge wedged into the middle of the one concrete anecdote, defusing it mid-sentence. `"That says nothing about a second developer."` — the seventh and last of the disclaimers, and the flattest possible paragraph ending.

**Content gap**, and the one place I would add rather than cut: the author brief's second half is missing. The brief says agentic coding made extending cairn "comparatively quick and easy", that this is "more work than buying software", and that it is "far less time spent supporting users after the fact, because they learn a single admin idiom and every screen the organization adds lives inside it". That trade is the answer to the first driver in P2 and it is nowhere on the page. The brief explicitly assigns it to this section.

> I build these sites with coding agents. I wrote the engine, and the club site I run on it is mine, in my own accounts, so this is one person's experience and not a study. Its membership, events, assets, and email sections are about 36,000 lines I wrote, sitting on about 69,000 engine lines I did not. I built the first membership and assets admin in two calendar days, on an overnight agent run. I did not record what that run cost. Then I spent eight weeks refining it, across 42 commits on those routes. The one blocker that reached production was a security check failing at the seam between engine and site code.
>
> Once the extensible admin exists, extending it to what an organization actually needs is comparatively quick. It is still more work than buying software. What it buys back is support time: the people using the site learn one admin idiom, and every screen the organization adds lives inside it.

### P24 — "The full argument behind this page…" — **KEEP**
Plain, one job, links out. Fine.

### P25 — "## Where this leaves you" — **REWRITE**
Tells: sentence 1 runs 36 words and buries two routes in one balanced pair. `"none of this is yours to decide"` — condescending in a way the rest of the page is not, and the semicolon pair again.

> If the trade-offs read as acceptable and the stack is one you'd choose anyway, start with the admin track. It gets a default site running with no code. The extend track is where a developer takes it further. If you write for a site someone else already set up, none of these decisions are yours to make. Welcome, editors is where you actually start.

### Headings — three more to fix
- `## Running costs and who is on call` — a two-headed heading in the *and*-joined form the comma rule does not catch. Split: `## What it costs` and `## Who is on call`.
- `## Updates and the developer's departure` — same shape, and "the developer's departure" is euphemistic. Split: `## Updates` and `## When the developer leaves`.
- `## What committing to cairn ties you to` — six words to reach a preposition stranded at the end. `## What you are tied to`.
- `## The shape underneath cairn` — covered above; `## Building this without cairn`.

---

## 5. Ranked top ten tells

1. **The 58% balanced-clause rate.** Measured against 23–31% in every specimen. Structural, document-wide, and the root of Geoff's complaint. Worst instance, P11, five for five: *"Each part is replaceable on its own, each vendor carries a support contract, and there is a labor market of people who can be hired to work on the CMS."*
2. **Seven disclaimers written as if by an outside observer.** *"this page does not grade that choice against cairn"* (P7), *"which this page does not price"* (P17), *"weigh that before anything else on this page"* (P5), *"read what follows as one author's record"* (P23), *"That says nothing about a second developer"* (P23), *"is not something I have measured"* (P15), *"I have not sized that rewrite"* (P13, the only one in a human register). No specimen author disclaims his own page's evidentiary status. SQLite writes "there is nothing SQLite can do to prevent it" and moves on.
3. **The appositive-comma gloss chain.** *"They write markdown, the plain-text formatting the site's own render function turns into pages, they see the live preview…"* (P3), a comma splice off the back of a gloss, and *"through seams, the documented extension points that cairn versions and holds still"* (P4). Two paragraphs apart, same shape.
4. **Abstract nouns promoted to grammatical subject.** *"the shape"* (heading plus five uses), *"the tie"* (P14), *"The usual shape"* (P11), *"is a choice rather than a default"* (P19). The residue of the heading Geoff already killed; the tortured rhythm was removed from the heading and left in the body.
5. **The 44-word ditransitive in P7.** *"it saves that other build the emailed sign-in with no third service in the path, the publish path through git, the admin's components, and a check that fails cairn's own build when a seam moves."* Unparseable on first read.
6. **The lawyerly attribution hedge.** *"Turning a third-party builder off is widely reported to leave pages as raw output"* (P20), and *"so 'two systems, two logins' is true of some vendors and false of others"* (P11), which adjudicates a claim the page never made.
7. **Sentence-final elaborative tails, carried by commas instead of em dashes.** *"keeps running on its pinned version, the risk deferred rather than removed until the framework or the host moves under it"* (P21). The register bans the rhythm, not the glyph; the glyph was swapped and the rhythm kept.
8. **Pseudo-clefts giving plain negatives a build-up.** *"What cairn does not ship is the organization's own functionality"* (P5), *"A larger or public contributor pool is something a developer builds"* (P22), *"is not something I have measured"* (P15).
9. **Balance cappers ending paragraphs on a restatement.** *"soften that cost without removing it"* (P9), *"refused, never merged"* (P10), *"needs a developer here, and needs nobody under a builder"* (P20), *"Weigh one large vendor with those exits against smaller vendors each replaceable alone"* (P16).
10. **The concessive tic.** *"Good teams build this well, and…"* (P11), *"Builders are mainstream, and most people using one are not fighting it"* (P20). Both concede fairly and both land in the identical clause shape, which turns a genuine fairness commitment into a verbal reflex.

Two more that missed the cut: three two-headed headings (§4), and *"Sign-in rides Email Sending"* (verb-as-flourish).

---

## 6. Verdict

The document is factually careful and rhetorically disciplined — it passes tellgrader with zero findings and never pitches — but it is written in a cadence no human author uses, with nearly six sentences in ten built as balanced comma-hinged pairs, and it spends seven separate clauses characterizing its own evidentiary standing rather than simply saying what the author does and does not know. Twenty of twenty-five paragraphs need work, most of it mechanical (split the pair, drop the self-reference, replace the abstract subject with the concrete one), with P6/P7, P11, and P20 needing genuine reconstruction and P23 additionally needing the author brief's support-cost trade, which the page omits entirely.
