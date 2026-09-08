# Front-door prose comparison, round 2: the technical and academic register

Dispatched 2026-09-08 after Geoff ruled the front door's register technical and academic (recorded in `docs-register.md`). Opus, fresh context, four fetched specimens (SQLite twice, the GFS paper introduction, RFC 9110, PostgreSQL's About), measured, with the rewrite that landed.

---

## 1. Specimens (fetched today, all four load)

**A. SQLite, "Appropriate Uses For SQLite"** — https://www.sqlite.org/whentouse.html
The canonical scope-and-limits page in this genre: it names what the project is not for, in flat declaratives, with the qualification carried inside the sentence.

> SQLite is not directly comparable to client/server SQL database engines such as MySQL, Oracle, PostgreSQL, or SQL Server since SQLite is trying to solve a different problem. Client/server SQL database engines strive to implement a shared repository of enterprise data. They emphasize scalability, concurrency, centralization, and control. SQLite strives to provide local data storage for individual applications and devices.
> […] Because this problem results from bugs in the underlying filesystem implementation, there is nothing SQLite can do to prevent it. A good rule of thumb is to avoid using SQLite in situations where the same database will be accessed directly (without an intervening application server) and simultaneously from many computers over a network.

**B. SQLite, "About SQLite"** — https://www.sqlite.org/about.html
A mature project's own description of itself, including its defects, with no address to the reader.

> SQLite responds gracefully to memory allocation failures and disk I/O errors. Transactions are ACID even if interrupted by system crashes or power failures. All of this is verified by the automated tests using special test harnesses which simulate system failures. Of course, even with all this testing, there are still bugs.

**C. "The Google File System", §1 Introduction** — https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf
The systems-paper introduction the ruling names: restrained first person plural used only where the authors' own work and observations are reported.

> First, component failures are the norm rather than the exception. The file system consists of hundreds or even thousands of storage machines built from inexpensive commodity parts and is accessed by a comparable number of client machines. The quantity and quality of the components virtually guarantee that some are not functional at any given time and some will not recover from their current failures.

**D. RFC 9110 §1.1, "Purpose"** — https://www.rfc-editor.org/rfc/rfc9110.txt
The standards-document overview: one qualified claim per sentence, qualification carried by subordination rather than by a following short sentence.

> One consequence of this flexibility is that the protocol cannot be defined in terms of what occurs behind the interface. Instead, we are limited to defining the syntax of communication, the intent of received communication, and the expected behavior of recipients. […] However, since multiple clients might act in parallel and perhaps at cross-purposes, we cannot require that such changes be observable beyond the scope of a single response.

**E. PostgreSQL, "About"** — https://www.postgresql.org/about/
A project front door in this register, including a bounded self-limiting claim stated as fact.

> PostgreSQL tries to conform with the SQL standard where such conformance does not contradict traditional features or could lead to poor architectural decisions. Many of the features required by the SQL standard are supported, though sometimes with slightly differing syntax or function. […] As of this writing, no relational database meets full conformance with this standard.

## 2. Measured table

Same method as round 1 (split after `.!?;`, link syntax stripped, headings excluded), plus the three new columns. "Two-beat" is the round-1 regex (`, and/but/so/which/where/while/then` or `;`); it also fires on serial-list commas, so I hand-classified a second column, **coord.** = comma-coordinated *independent clauses* only.

| Text | n | Mean | CV | Min–max | Two-beat | **coord.** | 3+ comma | **<8 words** | **imper.** | **1st person** |
|---|---|---|---|---|---|---|---|---|---|---|
| **Section A (current)** | **134** | **12.8** | 0.53 | 3–37 | 24% | 12% | 10% | **27%** | 3% | 10% |
| SQLite whentouse | 32 | 18.4 | 0.45 | 4–35 | 28% | 13% | 19% | 9% | 3% | 0% |
| SQLite about | 26 | 15.0 | 0.40 | 5–30 | 19% | 12% | 4% | 8% | 0% | 8% |
| GFS §1 | 25 | 16.8 | 0.50 | 4–35 | 20% | 6% | 16% | 16% | 0% | 20% |
| RFC 9110 §1.1 | 9 | 25.6 | 0.19 | 20–36 | 44% | 11% | 22% | 0% | 0% | 22% |
| PostgreSQL about | 15 | 23.2 | 0.33 | 9–35 | 27% | 0% | 13% | 0% | 0% | 0% |
| **Rewrite below** | 93 | 18.4 | 0.40 | 5–39 | 39% | 19% | 16% | 8% | 0% | 11% |

Section A's word count barely moved in the 2026-09-08 rewrite (1,679 → 1,778) but its sentence count went **84 → 134** and mean length **19.4 → 12.8**. The round-1 defect (two-beat 58%) is fixed and overshot: coordination now sits at 24%, below three of five specimens. The new defect is in the last three columns. **27% of sentences are under eight words, against a specimen band of 0–16%**, and the specimen maxima (GFS 16%, SQLite 9%) come from genuine one-clause facts, not from qualifications amputated off their claims.

Per-paragraph, worst first: P8 (7 sentences, mean 9), P9 (8, mean 9), P21 (10, mean 10), P20 (11, mean 13, with a run of 5/7/3/8), P12 (4, mean 8), P18 (5, mean 10, opening 4/4), P6 (5, mean 10).

## 3. Diagnosis

**Staccato runs.** Four passages read as beat-lists rather than paragraphs:

- P8: *"There is no content server to run. A save commits to a per-entry branch. […] The site's existing deploy carries it live. Editors never see any of that."*
- P9: *"Markdown is plain text. […] The file still reads without cairn. […] The editor pays for that. […] They do not make it go away."*
- P21: *"cairn is pre-1.0. […] Changes need someone who knows the stack. […] That defers the risk. It does not remove it."* Ten sentences, mean 10 words.
- P20: *"A cairn block does not. Outside cairn it renders as literal text. Builders are mainstream."*

**Qualifications split off from their claims.** This is the ruling's specific target, and the round-1 rewrite created most of these by splitting: *"That defers the risk. It does not remove it."* (P21) · *"Live preview and a tidy pass make that easier. They do not make it go away."* (P9) · *"I have no figure for that, so I am not going to invent one."* (P17) · *"I did not record what that run cost"* standing alone after the two-day claim (P23) · *"That is why cairn runs on Cloudflare."* stranded from the requirement it answers (P2) · *"It is in beta. It needs the paid plan from the first deploy."* (P18) · *"Good teams build this well."* (P11).

**Imperatives and asides.** *"stop here. cairn is not for you."* (P5), the only place the page addresses the reader as a person to be dismissed. *"Decide on purpose whether…"* followed by *"Nothing decides that for you."* (P19). *"I am not going to tell you that is the wrong call."* (P7). *"so I am not going to invent one"* (P17). *"so I cannot tell you how that goes"* (P15). The specimens contain exactly one imperative in 107 sentences, and it is instructional (*"then use a client/server database engine instead of SQLite"*), never an address about the reader's suitability.

**First person beyond the author's evidence.** 10% overall is inside the band (GFS 20%, RFC 22%), but four of the thirteen instances carry no evidence: *"I am not going to tell you"*, *"I am not going to invent one"*, *"I cannot tell you how that goes"*, *"I would want this arrangement"* (this last is fine, it is a stated preference). The evidence-bearing ones — *"I have not sized that rewrite"*, *"I wrote the engine"*, *"about 36,000 lines I wrote"*, *"I did not record"* — are exactly what the ruling licenses and all stay.

**Remaining round-1 tells.** Pseudo-cleft: *"What it buys back is support time"* (P24), *"What you would be writing yourself is…"* (P7). Abstract-noun subject: *"You are tied to GitHub as well"* is fixed, but *"The trade is…"* survives in P16 and reads as a capper. Concessive tic: *"Good teams build this well."* and *"Builders are mainstream."*, now both isolated as their own sentences, which sharpens rather than hides them. Balance capper: *"That defers the risk. It does not remove it."* is the old *X-without-Y* with a period substituted for the hinge. No appositive chains, no two-headed headings, no cappers of the round-1 aphoristic kind remain; those fixes held.

## 4. Full rewritten Section A

```markdown
# Why cairn

Before cairn, the small organizations I run sites for lived on WordPress, and later on static
site generators with a git-backed editor in front. WordPress was hard to manage and hard to
design in, a mass of plugins and theme customization that resisted integration with anything
else, and casual editors found its block editor confusing. The static generators, with
Sveltia in front for editing, were much cleaner to work on, and the editor problem for
non-technical users remained the hard part.

The people who use these sites needed one place to do nearly everything outside the basic
productivity work that Google Workspace or Office 365 already covers. I needed the technical
side to be something I could leave alone, which is the reason cairn runs on Cloudflare. Both
requirements had to be met cheaply, because a small organization usually has no money to
spare.

## What a cairn site is

A cairn site is one SvelteKit app holding the public pages and an editor admin at `/admin`.
Editors sign in from an emailed one-time link, with no password and no GitHub account. They
write markdown, a plain-text format that the site's own render function turns into pages, and
the live preview they write against comes from that same function. Publishing is a separate
step that the editor takes when the text is ready.

A developer mounts the organization's own screens in that same admin through seams:
documented extension points cairn versions and holds still. A screen written there renders
inside the admin, sits behind the same sign-in, and is built out of the admin's ready-made
components.

cairn does not ship the organization's own functionality. Member management, dues, event
registration, and announcements are the site's own code. Starting a cairn site requires a
developer, as does adding a form, a booking page, or a shop. An organization with nobody in
that role, and no plan to acquire one, is not a candidate for cairn.

## Building this without cairn

I would want this arrangement even if cairn did not exist: content as markdown in the
organization's own git repository, an admin inside the same app as the public site, and the
organization's own screens mounted into that admin. Hosting, data, media, mail, and deploy
come from one account.

All of that can be assembled directly out of SvelteKit, a git-backed CMS, and an admin
written for the purpose, which is a reasonable thing to build. Such a build supplies for
itself the emailed sign-in with no third service in the path, the publish path through git,
the admin's components, and a check that fails cairn's own build when a seam moves.

## Markdown in git

Content bodies are markdown files in the site's own GitHub repository, which supplies
history, attribution, and rollback with no content server to run. A save commits to a
per-entry branch. A deliberate publish copies that commit onto the main branch with the
editor as the commit author, after which the site's existing deploy carries it live. Editors
never see any of that.

Markdown is plain text, which is why git's diff and blame work on it the way they work on
code. The file still reads without cairn: any tool or model can read it with no export step
in between. The editor pays for that. They have to learn markdown syntax, where a rich-text
tool would ask nothing of them. Live preview and a tidy pass reduce that cost without
removing it.

Files are not a database. Validation happens in the admin rather than at the store. If two
editors save the same entry, the second save is refused rather than merged. A database can
erase a record and a content file cannot: anything personal that reaches one is in the
repository's history and in every clone of it. Because removing it means rewriting that
history, personal data belongs in the site's database rather than in a content file.

## What most organizations run instead

Most organizations run a hosted CMS with a theme and plugin market. Beside it sits a
membership product, holding the member database, dues with renewals and reminders, event
registration, invoices, a directory, and bulk email that handles unsubscribes. Good teams
build this arrangement well. The membership product supplies all of it as configuration. Each
part can be replaced on its own, every vendor comes with a support contract, and people who
already know that CMS can be hired. Some products put the site and the member portal behind a
single login. Where they are separate products, the same people work in two interfaces with
two logins, the member record lives in the vendor's store, and keeping the two connected is
the organization's job.

On a cairn site, everything that product configures is code that someone writes, tests,
secures, and keeps running. Dues automation handles money and fails in ways someone has to
catch.

## What you are tied to

cairn reaches Cloudflare's database, file storage, and hosting directly, with no layer that
would let you swap the host later. Leaving Cloudflare therefore means leaving cairn or
porting it. The repository, the content files, the theme, and the markup of your own screens
survive that move untouched. Every data access inside those screens has to be rewritten, and
I have not sized that rewrite.

GitHub is a second commitment of the same kind. Content lives in a repository the
organization needs a GitHub account to reach, even though editors never see it. That same
account is where the backup lives.

The admin is DaisyUI on Tailwind: a screen built there works in that idiom, mostly by
composing the admin's own components. I have not built one in a different kit and have no
account of how that goes.

You keep the repository, every line of SvelteKit in it, and the content as markdown files
that read without cairn. The database exports to a SQL file with one command, the stored
files move over the standard S3 API, and the engine is an MIT package on npm. cairn holds
none of your material. The trade is one large vendor with those exits, set against several
smaller vendors that can be replaced one at a time.

## What it costs

The bill starts at $5 a month for [Cloudflare's paid Workers
plan](https://developers.cloudflare.com/workers/platform/pricing/), once per account, plus
the domain. The database, the file storage, and the sign-in email all sit inside that plan's
quotas at a club's scale. The largest cost is the developer's time, for which I have no
figure and offer no estimate.

Sign-in uses [Email Sending](https://developers.cloudflare.com/email-routing/email-sending/),
which is in beta and needs the paid plan from the first deploy. If the sender is not
verified, no editor can get in. Enabling it writes a policy record on your domain telling
receivers to reject mail the domain has not authenticated.

## Who is on call

The published docs carry no backup or restore procedure for the database or the file storage.
A $5 site carries no uptime commitment: the self-serve terms are "as is," and nobody gets
paged. When the network fails globally, the site fails with it, and waiting is the only
available response. Whether the Cloudflare and GitHub accounts belong to the organization or
to its developer is a decision nothing else makes for you.

## No page builder

A block in a cairn content file names a component the site owns, with a few declared
attributes. Because what that component looks like lives in code, a theme change moves every
page at once and no editor drifts one page away from the rest. A page builder keeps that
presentation in the content instead, per occurrence. Turning a third-party builder off leaves
pages of raw output, by many accounts. A mainstream CMS's own block markup does better, since
it reads as valid HTML with ignorable comments in any tool, where a cairn block renders as
literal text outside cairn. Builders are mainstream and most people using one are not
fighting them. A page laid out unlike every other page needs a developer on cairn and nobody
at all under a builder.

## Updates

cairn is pre-1.0, with a seam already moved across two minor releases inside the tier meant
to stay frozen. Every release carries a "Consumers must" list naming the changes a site has
to make. With no vendor and no support contract, cairn leaves the developer as the support.
Editors keep editing and the site keeps serving, but changes need someone who knows the
stack. A site that stops taking updates keeps running on its pinned version, which defers the
risk rather than removing it, since sooner or later the framework or the host moves
underneath it.

## When the developer leaves

The sign-in model knows two roles, owner and editor, and assumes a handful of people who
already know each other. A larger group, or a public contributor pool, has to be built on the
auth seams. Whoever the developer is, the site they leave behind is a SvelteKit repository, a
Cloudflare account, and a GitHub account, which the next developer picks up.

## How I build on it

I build these sites with coding agents, on an engine I wrote myself. The club site I run on
cairn is mine, in my own accounts, so this is one person's experience and not a study. Its
membership, events, assets, and email sections are about 36,000 lines I wrote, sitting on
about 69,000 engine lines I did not. I built the first membership and assets admin in two
calendar days, on an overnight agent run whose cost I did not record, then spent eight weeks
refining it across 42 commits on those routes. The one blocker that reached production was a
security check failing at the seam between engine and site code.

Once the extensible admin exists, extending it to what an organization needs is comparatively
quick, though still more work than buying software. It buys back support time, because the
people using the site learn one admin idiom and every screen the organization adds lives
inside it.

The full argument behind this page, with its evidence, its counter-evidence, and the studies
that settle none of it, is [The cairn
case](https://github.com/glw907/cairn-cms/blob/main/docs/internal/record/2026-09-04-the-cairn-case.md).

## Where this leaves you

If the trade-offs are acceptable and the stack is one you would choose anyway, [the admin
track](./admin/README.md) gets a default site running with no code. [The extend
track](./extend/README.md) is where a developer takes it further. If you write for a site
someone else already set up, none of these decisions are yours to make. [Welcome,
editors](./editors/welcome.md) is where to start.
```

### Section B, rewritten

**One-sentence form (37 words) — keep, unchanged.** It is one qualified claim in a single sentence, first person carrying the author's own act, and it measures in register.

> I built cairn so a site's editors can write and publish on their own, in markdown that stays in the organization's own git repository, inside a SvelteKit admin a developer extends with the screens their organization needs.

**One-paragraph form (118 words) — rewrite.** Tells: *"What cairn does not ship is the organization's own functionality"* (pseudo-cleft, the round-1 shape, still present); *"publish from one clean place"* (self-praising adjective in a no-pitch register); the four-sentence run at mean 21 is fine, but sentences two and three split a mechanism the register would carry in one.

> I built cairn so the small organizations I run sites for could publish from one place, on infrastructure that stays up without me, at a cost they can carry. A cairn site is one SvelteKit app holding the public pages and an editor admin at `/admin`: editors sign in from an emailed one-time link, write markdown with a live preview, and publish, and their content stays as files in the organization's own GitHub repository. The same admin is where a developer mounts the site's own screens. cairn does not ship the organization's own functionality, so member management, dues, event registration, and announcements are the site's own code, and starting a cairn site needs a developer.

### Per-paragraph notes

| ¶ | Verdict | Tell quoted | What changed |
|---|---|---|---|
| P1 opener | **Keep** | — | The register's ratified specimen, and it measures in this register unaided (3 sentences, mean 27, no sentence under 8 words). No cadence change is warranted; only its facts and its rhythm are already what the ruling asks for. |
| P2 | Rewrite | *"That is why cairn runs on Cloudflare."* (7 words, stranded) | The Cloudflare consequence folds into the requirement it answers as a relative clause. *"Both had to be cheap"* becomes *"Both requirements had to be met cheaply"*, keeping the `because` qualification inside the sentence. |
| P3 | Rewrite | *"Then they publish."* (3 words) | Publish becomes a stated step with its condition inside it. The markdown gloss and the preview claim join as one 30-word sentence. |
| P4 | Keep | — | Already one colon-glossed definition plus one three-predicate sentence. In register. |
| P5 | Rewrite | *"stop here. cairn is not for you."* | The imperative and the address go; the same fact is stated about the organization, not aimed at the reader. *"You need a developer to start… and you need one again to add…"* becomes the `as does` form, one claim. |
| P6 | Rewrite | Four consecutive 7-to-11-word sentences | The four parts become one enumerative colon list, the shape SQLite and RFC 9110 both use. |
| P7 | Rewrite | *"I am not going to tell you that is the wrong call."*; *"What you would be writing yourself is…"* (pseudo-cleft) | The aside becomes a relative clause conceding the same point (*"which is a reasonable thing to build"*). The pseudo-cleft becomes a plain transitive. |
| P8 | Rewrite | 7 sentences, mean 9; *"There is no content server to run."* | Git's contribution and the absent content server join the definition. The publish and deploy chain joins with `after which`. |
| P9 | Rewrite | *"They do not make it go away."*; *"The file still reads without cairn."* | The qualification returns inside the claim (*"reduce that cost without removing it"*). Tool-and-model legibility joins the file claim on a colon. |
| P10 | Rewrite | *"A database can erase a record."* stranded; *"So personal data belongs…"* | The database/content-file contrast becomes one sentence with the colon carrying the explanation; the conclusion becomes a `Because` clause. |
| P11 | Light | *"Good teams build this well."* (5-word concessive tic) | The concession takes an object (*"this arrangement"*) and stops being a beat. The semicolon splice in the last sentence returns to a full stop plus `Where`. |
| P12 | Light | *"Dues automation handles money. It fails in ways someone has to catch."* | Both sentences fold; the four-verb chain becomes a relative clause on `code`. |
| P13 | Rewrite | *"There is no layer that would let you swap the host later, so leaving…"* | The absent layer becomes a `with` phrase on the direct-access claim; the consequence stands as its own sentence with `therefore`. |
| P14 | Rewrite | *"You are tied to GitHub as well."* (7 words, second person) | Becomes a stated commitment. Facts unchanged. |
| P15 | Rewrite | *"so I cannot tell you how that goes"* | Becomes *"and have no account of how that goes"*: the same limit, stated as evidence rather than addressed to the reader. |
| P16 | Rewrite | Four consecutive sentences of 9, 8, 6, 20 words | The three exits join as one parallel sentence; *"cairn holds none of your material"* stays as its own short claim, the one the register permits. |
| P17 | Rewrite | *"I have no figure for that, so I am not going to invent one."* | Becomes *"for which I have no figure and offer no estimate"*: the refusal to invent survives without the address. |
| P18 | Rewrite | *"It is in beta. It needs the paid plan from the first deploy."* (4, 9) | Both qualifications ride a relative clause on the service. |
| P19 | Rewrite | *"Decide on purpose whether…"*; *"Nothing decides that for you."* | The imperative and its capper become one sentence stating the decision is unmade by the system. *"and you wait"* becomes *"waiting is the only available response"*. |
| P20 | Rewrite | *"A cairn block does not. Outside cairn it renders as literal text. Builders are mainstream."* | The theme-change consequence takes a `Because` opener. The cairn-block limit joins the mainstream-markup claim under `where`. The builder concession joins its own clause. Eleven sentences become seven, mean 13 → 20. |
| P21 | Rewrite | *"That defers the risk. It does not remove it."*; *"cairn is pre-1.0."* (3 words) | The deferral and its limit return to one sentence with the `since` clause attached. The pre-1.0 fact takes its seam evidence as a `with` phrase. Ten sentences become five. |
| P22 | Light | *"The next developer picks up all three."* | Folds onto the inheritance list as a relative clause. *"If you need more than that"* becomes a stated requirement. |
| P23 | Rewrite | *"I build these sites with coding agents. I wrote the engine."* (7, 4); *"I did not record what that run cost."* | The disclosure becomes one sentence; the unrecorded cost returns inside the two-day claim as a relative clause, which is the ruling's exact instruction and reverses the round-1 split. Every figure survives. |
| P24 | Rewrite | *"What it buys back is support time"* (pseudo-cleft); *"It is still more work than buying software."* | The concession becomes a `though` clause; the support-time trade becomes a `because` clause carrying both halves of the brief's claim. |
| P25 | Keep | — | One sentence, links out. |
| P26 | Rewrite | *"start with [the admin track]."*; *"It gets a default site running with no code."* | The imperative goes; the track and what it does become one conditional sentence. The editor routing line and its link stay early and unmissable, as the front-door rule requires. |

Headings unchanged. All links, the $5 figure, the 36,000/69,000 line counts, the 42 commits, the eight weeks, the two calendar days, the CSRF-seam blocker, the DMARC record, the "as is" terms, the two roles, the S3 and SQL exits, and the MIT/npm fact are all carried.

## 5. Verdict

The 2026-09-08 rewrite corrected the round-1 defect and overshot it: coordination fell from 58% to 24%, below three of five specimens, while mean sentence length fell to 12.8 words and the share of sentences under eight words rose to 27%, against a specimen band of 0–16%, because roughly forty qualifications were amputated from the claims they qualify and set down as separate sentences. The rewrite above returns each of those qualifications to the inside of its sentence, removes the four imperatives and the four first-person clauses that carry no evidence of the author's own, and lands at 18.4 mean words, 39% two-beat, 8% short sentences, and zero imperatives, inside the technical-and-academic band on every measure while keeping the ratified opener untouched.
