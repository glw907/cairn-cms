# Audience-lens review: the cairn case (v3, `660f92bf`)

Read-only. Subject: `docs/internal/record/2026-09-04-the-cairn-case.md` at `660f92bf` (847 lines).
Line numbers below are against that commit. Standards read: the audience profiles
(`2026-08-14-audience-profiles.md`), the docs register (front-door section, keystone, universal
contract), `docs/why-cairn.md`, `docs/README.md`, the root `README.md`, the round-3 review with its
five persona verdicts and vocabulary maps, and round 1's section 7 on the figure's form. The
argument's truth is out of scope. The lens is who reads the front door and what each reader needs
in what order.

One framing fact governs everything below. The register says the front door's primary persona is
the seasoned developer serving an organization, that the editor's arrival path is a requirement,
and that the evaluator route comes first among five. The audience record has no separate evaluator
profile. The evaluator is the extender in their arrival state ("through npm, GitHub, or the root
README, often evaluating cairn against alternatives; they skim first and judge quickly"). So the
front door serves one primary reader and must route five others in its first screen without
losing any of them. The case document was written for the primary reader alone (Preface, lines
8-11). That is correct for the record and is the source of every gap below.

---

## 1. Reader by reader

Each entry gives the three questions in order, where the case answers each, what the reader must
hear before continuing, what the document carries that this reader does not need, and what the
reader needs that the document lacks.

### 1.1 The evaluator (the extender arriving to judge)

Skims, judges fast, resents padding, will not read engine source.

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | What is this, in one sentence, and where do my own screens go? | Leg 1 claim, lines 84-86. Reasoning, 88-99. |
| 2 | What do I get, and what do I still write? | "What cairn ships", 136-141. "What the admin is for", 101-111. Counterweight, 127-130. The developer's other option, 132-142. Increment table, 697-715. |
| 3 | Will the next release break my screens, and what does the stack tie cost? | Snapshot gate, 97-99. Seam moved inside the frozen tier, 123-125. Treadmill, 70-78. The tie, 328-354. |

**Must hear first.** The one-sentence identity, then the boundary in the same breath: the admin
is theirs to extend, and everything organization-specific is their code. The register's content
anchor already says this. The case's version at 108-111 is the tighter form.

**Has, does not need.** The traditional setup section (34-78) in full. The outage durations
(299-313). The fourteen-study paragraph (455-488). The case-report tables (541-606). Every tag.

**Needs, lacks.** The magic-link differentiator stated first rather than sixth of seven (round 3,
b). A per-screen signal in files, routes, actions, and tables rather than lines (round 3, b). The
no-support sentence (round 3, item 15). A count of what an engine update usually asks of a site,
in the shape of one `Consumers must` line, since "202 lines across 87 releases" reads as a rate
whether or not it is one.

### 1.2 The skeptical professor

Reads the argument as a case report. On the front door this reader is a subset of the evaluator
who follows the link to the record. The front door carries no tags, so what this reader needs
from the front door is the link and an honest scope line.

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | What is claimed, exactly? | Each leg's **Claim** paragraph: 84, 148, 228, 259, 380. |
| 2 | What is the evidence, and what does it not test? | Each leg's evidence and counter-evidence. The concession at 486-488 and 626-628. |
| 3 | Who is the subject, and who is the author? | Not answered in v3. Round 3, item 1. |

**Must hear first.** That the argument exists in a checkable form and where it lives. One sentence
on the why-cairn page pointing at the record is enough.

**Has, does not need.** Nothing surplus for this reader. The record is their document.

**Needs, lacks.** The author disclosure on every derived sentence that begins "one production
site". Without it, every front-door sentence derived from Leg 5 inherits the confound, and this
reader marks the front door down on first read. The front door must not carry a Leg 5 sentence
until item 1 lands in the record.

### 1.3 The working SvelteKit designer

Builds sites for clubs. Judges by the editor half first and the admin half second.

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | Does it handle the editor half, and how do editors sign in? | Leg 1 reasoning, 88-90. Leg 2 reasoning, 152-156. Magic-link against Keystatic and Decap: not stated in v3 (round 3, item 9). |
| 2 | What does the admin half cost me: kit, gate, editing model? | The tie, 333-341 (DaisyUI, toolkit, audit). Markdown-only, 247-253. The CSRF blocker, 608-613. Treadmill, 70-78. |
| 3 | What do I write, and what do I install? | 136-142. Increment table, 697-715. |

**Must hear first.** The sign-in mechanism, because it is the reason they would pick cairn over
the stack they already know how to assemble. Then the DaisyUI tie on admin screens, because it is
the reason they might not.

**Has, does not need.** The whole-layer ratio (766-774), which the document itself says tells them
nothing. Leg 4's WordPress survey material (401-415). The outage table. The studies.

**Needs, lacks.** Screens, routes, forms, and tables per section instead of lines. The off-chassis
cost sized, or a plain sentence that it is not sized (round 3, b). The audit named as a reviewer of
their design work, not only a gift.

### 1.4 The IT admin

Asks what runs where, whose login gets in, and who is called at three in the morning.

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | What runs where, and whose accounts hold it? | Leg 3 claim, 259-262. Drawbacks, 324-326. "Whose" is not answered (round 3, item 5). |
| 2 | What breaks, how often, and who is paged? | Outages, 299-322. Email Sending beta and quota, 278-288. Sign-in riding that beta: not stated (round 3, item 6). Monitoring: not stated. |
| 3 | What happens when the developer leaves or updates stop? | Drawbacks, 120-123 (opinion). Treadmill, 70-78. Deferred failure: not stated (round 3, item 13). |

**Must hear first.** Where the organization's own data lives and how it is backed up. The content
in git is the half they worry about least (round 3, c). Then whose accounts.

**Has, does not need.** The outage durations as a table; a dated link does the job on a published
page (open question 3, lines 825-828). The studies. The case report. Leg 4 entirely.

**Needs, lacks.** Backup and restore for D1 and R2 (item 5). Account ownership as a choice with the
production case's answer (item 5). Editor sign-in depends on a beta email product, and enabling it
writes an apex DMARC record (item 6). Nobody is paged; the status page is the only signal. A site
that stops updating keeps serving until a platform floor moves (item 13).

### 1.5 The nonprofit board member

Approves a budget. Needs five lines with numbers and one line about ownership.

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | What does it cost, in money, per year? | Hosting and domain, 295-297. Email overage, 282-285. Storage and payments: no figure (277, 359-361). Developer cost: tokens only, 596-599 and 774-779. |
| 2 | What do we own if the developer leaves? | 348-354 (content, standard SvelteKit, MIT). Ownership stated as a fact that is a choice (round 3, d). |
| 3 | Who supports it if something breaks or a vendor changes terms? | Not stated (round 3, item 15). Email beta, 278-281. |

**Must hear first.** That a developer is required and is the largest cost line, and that the
document does not price that line. Then what the organization holds in its own accounts.

**Has, does not need.** Everything past Leg 1's first paragraph and the drawbacks. Every count.
Every citation.

**Needs, lacks.** Developer cost stated as unmeasured in those words (item 12). Ownership as a
choice (item 5). The no-support sentence (item 15). A plain equivalent for every technical noun
(the map in section 3 below). The board member does not read the front door; the front door's
job is to give the developer the source facts for the one-page sheet, and three of the five are
missing from v3.

### 1.6 The small-business owner

Wants a working website. Reads until the first sentence that answers "do I need to hire someone".

| Order | Question | Where the case answers it |
|---|---|---|
| 1 | Will it exist without a developer, and can I add a form, a shop, a booking page? | Drawbacks, 120-122. Scaffold pre-release, 366-369 and 519-522. Forms and shops: not stated in one sentence (round 3, item 20). |
| 2 | Can I change a page myself? | 88-90, 152-156, 398-399. The markdown cost, 247. |
| 3 | What does it cost, and who do I call? | 295-297. Nobody to call: not stated. |

**Must hear first.** One sentence: starting a cairn site needs a developer, and so does anything
past writing and publishing. Then the routing line to the editors' welcome page, which the register
already requires in the first screen.

**Has, does not need.** Legs 2 through 5. The traditional setup. Every number.

**Needs, lacks.** Item 20's sentence. "When it is down there is nobody to call and nothing to do."
The save-against-publish distinction, which the case states well at 152-156 and is the one
mechanism this reader keeps.

### 1.7 The editor, for completeness

The audience record's editor never arrives through the front door by intent, but the register
makes their routing line a requirement. They need one sentence and one link. The case has no
sentence written to them. The derived line must be in the editor vocabulary contract: "your site",
"sign-in link", "write", "publish". No GitHub or Cloudflare noun in that line.

---

## 2. Reading order for the front door

### 2.1 The first screen: five ideas, in order

Every reader must get these before scrolling. Each carries one sentence. The sentence is the
case's, or a plain rewrite per the vocabulary maps where the case's wording would stop a
non-developer. The evaluator is the primary reader, so the sentences keep the technical nouns the
register lists as carrying information (SvelteKit, git, markdown, GitHub, Cloudflare) with a short
apposition where a savvy editor would otherwise stall.

**Idea 1. What cairn is, as one system.** The reader must know before anything else that this is a
CMS living inside the site's own app, and that the editor half works with no developer per edit.

> A cairn site is one SvelteKit app that contains the public site and an editor admin at `/admin`.
> (Leg 1 claim, line 84, first clause.)

> Editors sign in from an emailed link, write markdown with a live preview rendered by the same
> function the public site uses, and publish. (Line 88-90, with "the adapter yields an
> owner/editor CMS" dropped.)

**Idea 2. Where a developer's own screens go.** The second half of the identity. This is the
sentence the evaluator came for.

> The same admin is where a developer mounts the organization's own screens through documented
> seams, sharing cairn's components and the editors' sign-in. (Line 85-86, joined with the
> register's content anchor. "Seams" gets its apposition here: "documented extension points".)

**Idea 3. The boundary, stated as what cairn does not ship.** Four of the six readers need this
more than anything else (designer: what do I write; IT admin: where is the data; board: what do we
own; owner: do I need a developer). It must sit on the first screen, not under trade-offs.

> Member management, dues, events, and announcements are the site's own code; cairn ships none of
> them, on purpose. (Line 108-110.)

> Starting a cairn site needs a developer, and so does adding a form, a booking page, or a shop.
> (Round 3, item 20, plain form. Not in v3; the front door needs it before derivation.)

**Idea 4. Content is files in git, and editors never see it.** The mechanism that makes idea 1 true
and the constraint the board and IT admin must weigh.

> Content bodies are markdown files in the site's own GitHub repository, so history, attribution,
> and rollback come from git, and there is no content server to run. (Leg 2 claim, line 148-150.)
> Editors never see git. (Line 156.)

**Idea 5. The routing lines.** The register's five routes, evaluator first, editor second. The
editor line in the editor vocabulary: "Writing for a site built on cairn? Welcome, editors starts
with signing in." The owner and board member follow the editor route or stop here. That is the
correct outcome for them.

Four ideas plus the routes fills a first screen at 1440 and spills at 390. If one idea has to
drop below the fold at narrow widths, it is idea 4. Ideas 1 through 3 and the routes are the
floor.

### 2.2 What `why-cairn.md` carries below the fold

In this order, because each answers the next question a reader who kept reading will ask.

1. **The stack tie, whole.** Lines 328-332 and 346-354: GitHub, Cloudflare, SvelteKit, no swap
   layer, and the three counterweights (content portable by clone, standard SvelteKit with the
   adapter, MIT). The existing why-cairn "Why this stack" section carries most of this already.
   The case adds the honest sizing sentence: deploying elsewhere is an adapter change plus
   rewriting every binding, "which is real work this document does not size" (350-353).
2. **The traditional shape, by capability, as a steel man.** Lines 38-53, with the vendor-free
   framing at 43-45 kept verbatim. This is where the comparison lives, as prose that can carry
   qualifications. Not in the figure (section 4).
3. **What a developer writes and what they would otherwise install or write elsewhere.** Lines
   132-142, re-scoped per round 3 item 9 and with magic-link leading. The increment sentence from
   line 737-738 ("a developer adding a section pays a measured increment and does not write the
   modules above") without the tables.
4. **Costs with links, not numbers.** Leg 3 evidence (268-297) reduced to the register's vendor
   rule: Workers Paid from the first deploy, a domain, Email Sending on the paid plan, the daily
   quota, each as a link. The one sentence the board needs: developer cost is not measured here
   (item 12). The existing why-cairn "Setup has real moving parts" paragraph is the right home.
5. **Operations, for the IT admin.** The single-vendor concession (316-322) with the outage as a
   dated link (open question 3). Then the three sentences v3 lacks: data backup and account
   ownership (item 5), sign-in on beta email plus the DMARC write (item 6), deferred failure when
   updates stop (item 13). Nobody is paged.
6. **No page builder, as feature and cost.** Leg 4 claim (380-383) and drawbacks (417-421). The
   annual-event sentence at 417-418 is the plain form for the owner.
7. **Pre-1.0 and the treadmill.** Lines 123-125 and 70-78, with the counts replaced by what one
   `Consumers must` line looks like. The existing why-cairn first trade-off paragraph holds this.
8. **The developer's departure.** The mechanism form the IT admin asked for (round 3, c.6):
   editors keep editing, the site keeps serving, and changes need a SvelteKit-on-Workers
   developer. Plus the no-support sentence (item 15). Replaces the labor-market opinion at 122-123.
9. **Leg 5, one sentence, after the disclosure lands.** The derivable form at 630-635 rewritten
   with "built by the engine's own author" and the unrecorded-spend clause (items 1 and 4). Until
   those land, no Leg 5 sentence reaches the page.
10. **The pointer to the record**, so the professor can grade it.

### 2.3 What stays in the internal record only

Every `[verifiable]`, `[supported]`, and `[opinion]` tag. The Preface's rules and inputs. The
"Front door:" section lines. The Patchstack, W3Techs, and WordPress survey figures (a published
page links a vendor, never restates a count). The Cloudflare outage durations and the status-API
count. The fourteen studies and the METR material. The case-report tables and the classified
commits. The "Already extensible, measured" section whole, including the increment table, the
carried-modules table, and the pair table. The toolkit import counts. Every consumer-site path.
"Where this document argues with the reviews." The open questions.

---

## 3. The vocabulary ruling

Merged from the five round-3 maps and graded against the register's front-door rule: technical
terms appear where they carry information, with an apposition doing the glossing, and a savvy
editor can still get the gist. Three tiers.

### 3.1 May use without explanation

These carry information for the primary reader and are gist-recoverable by a savvy editor from
context.

site, page, post, draft, save, publish, preview, image, tag, domain, email, sign in, account,
developer, editor (the person; see the ruling below), markdown (with "plain-text formatting" on
the first use only where the sentence would otherwise stall), git, GitHub, repository, commit,
deploy, SvelteKit, TypeScript, Cloudflare, npm, open source, MIT, database, file storage, admin
(as the noun for `/admin`; see below), CMS.

Ruling on **editor**: the front door uses "editor" for the person only. The tool is "the markdown
editor" or "the writing surface". The small-business map flagged the collision and the register's
editor contract uses "the editor" for the surface, so the front door must not let the two senses
meet in one paragraph.

Ruling on **admin**: one noun. The case uses admin frame, admin skeleton, admin shell, admin
toolkit, and admin audit (designer map). The front door says "the admin" for the whole and names
the parts only where a sentence is about a part: "the admin's screen components" for the toolkit,
"the admin's design checks" for the audit. "Shell", "frame", and "skeleton" do not appear.

### 3.2 Must define on first use

| Term | Plain apposition |
|---|---|
| magic link | an emailed one-time sign-in link, no password and no GitHub account |
| seam | a documented extension point a developer builds on |
| toolkit | the admin's ready-made screen components |
| concept | a content type (Posts and Pages) |
| holding branch | the branch a save waits on until a publish copies it live (use only if the write path is described) |
| Workers | Cloudflare's hosting product, where the site runs |
| D1, R2 | Cloudflare's hosted database and file storage (only if a sentence must name them) |
| Email Sending | Cloudflare's email product, still in beta, which delivers the sign-in link |
| `Consumers must` | the list of required changes each release carries |
| GitHub App | the site's own GitHub identity that makes the commits; never "the App" alone, since "one SvelteKit app" sits nearby |
| render | the one function that turns markdown into the page, used by preview and public site alike |
| scaffold, `create-cairn-site` | the tool that creates a site; say once that it is unpublished |
| Waymark | the starter site the tool writes |
| adapter (Cloudflare) | the SvelteKit adapter that targets Cloudflare; avoid cairn's own "adapter" on the front door (say "the site's configuration") |

### 3.3 Must not use

Each with its plain equivalent, or a ruling to drop it.

| Term | Front-door equivalent |
|---|---|
| chassis | the starter site's base layer; prefer "the starter site" |
| harvest, graduate, graduated | "moved into the engine from a site" or drop |
| pass, conductor, implementer, dispatch | drop; the front door has no process vocabulary |
| register (editorial) | drop |
| tokens (as effort) | drop; "developer cost is not measured" |
| manifest | "the committed content index"; on the front door, drop |
| directive | "a named block in the markdown" |
| fieldset, frontmatter | "the fields a content type declares"; on the front door, drop |
| island | drop; extend-track term |
| adapter (cairn's) | "the site's configuration" |
| platform (any sense) | "hosting account" for Cloudflare, "product" for a membership product, "toolkit" for cairn |
| Worker (one Worker) | "one hosted function that serves the site" or drop |
| bindings, migrations | drop; "connections declared in the config" and "database changes" if unavoidable |
| CSRF | "a web security check" if the blocker is mentioned; on the front door, drop |
| steel man, leg, claim, counterweight, derivable | drop; the record's own scaffolding |
| any consumer site name | "one production site" |
| any vendor name outside a link | "a hosted CMS", "a membership product" |
| "shell", "frame", "skeleton" for the admin | "the admin" |
| "seamless", "streamlined", "polished", "productive" | drop; keystone |

---

## 4. Synthesis input for the concept figure

### 4.1 What the artwork carries, what the caption carries, what the prose carries

The eye should recover, without reading, the three ideas the first screen puts first (section
2.1). A fourth is optional.

**Artwork (recovered by the eye).**

1. One app, containing the public site and `/admin`. One outline, two regions.
2. Inside `/admin`, two visually distinct kinds of screen: cairn's own (content, media, editors)
   and the site's own, in a second fill that reads as "built here". This is idea 2 and idea 3 in
   one stroke: the developer's screens live in the same admin, and they are the developer's.
3. The boundary as a drawn line, with what stays outside for every organization on the far side:
   the payments provider, organizational mail, and the members' own sign-in if members sign in.
4. Optional, if the drawing stays under the complexity budget: the write path, an editor's
   publish becoming a commit in the repository. One arrow from `/admin` to a repository glyph. If
   the figure gets crowded, this is the idea to drop, since the prose carries it in one sentence.

**Caption (complete sentences, code-verified facts).** The seam names where the site's screens
attach. The ownership sentence: the site's screens, and everything outside the line, are code the
developer writes and maintains. The stack tie in one clause: the app is SvelteKit on Cloudflare,
content in the site's GitHub repository. The caption never says "simpler" or "fewer".

**Prose (the page).** Every cost and drawback. That a developer is required. The pre-1.0 warning.
The traditional shape, by capability. Operations, ownership, backup, the beta email dependency.
The Leg 5 sentence, when it is ready. None of these can be drawn, and the round-1 finding stands
that a drawing which tries becomes a pitch.

### 4.2 The form

Recommendation: **one system drawn with its boundary**, round 1's first option. Three reasons,
and the audience lens adds a fourth.

Round 1's objection holds on its own terms. A two-panel contrast argues by box count, a box
costs the same ink whether bought or built, and the eye reads the shape before any label, so
balanced text cannot neutralize the layout. Two panels with built capability marked on the cairn
side answers the box-count objection only halfway, because the marking is a label and the count
is still the shape. Two figures, one system and one contrast, keeps the contrast figure with all
of its problems and doubles the maintenance, since the second figure decays the day a membership
vendor ships a feature.

The audience lens adds this. Of the six readers, four ask a boundary question before any
comparison question: the designer asks what they write, the IT admin asks where the data lives
and which account holds it, the board member asks what the organization owns, and the owner asks
whether a developer is needed. One system drawn with its boundary answers all four at once,
because the boundary line is the answer: what is inside is cairn's, what is in the second fill is
the developer's, what is outside is a third party's. A two-panel figure answers none of those
four directly. It answers the evaluator's comparison question, and the evaluator is the one reader
who can read the comparison as prose in `why-cairn.md` with its qualifications intact. The
comparison therefore belongs in prose, where it can say "some vendors bundle the portal and some
do not" (line 41-45), and the figure belongs to the boundary. The second fill inside `/admin` is
also the honest form of "marking built capability": it marks by ownership inside one system, not
by count across two.

---

## 5. What would mislead or lose each reader if derived verbatim

Each row names the case sentence, the reader it harms, the harm, and the fix.

| Case sentence (line) | Reader harmed | Harm | Fix |
|---|---|---|---|
| "landed in two calendar days as agent-built code" (618-619, 630-631) | professor, board, owner | Reads as effort. The spend is unrecorded and the subject is the author. | Not on the front door until items 1 and 4 land. Then: "built by the engine's own author in an overnight agent run whose cost the record does not carry". |
| "a repository the organization owns" (348, 218-219) | board, IT admin | Ownership stated as a fact; it is a choice, and the production case is a personal account. | "in a repository under an account the organization controls, when it does" (item 5). |
| "One Cloudflare account supplies hosting, the sign-in store, media storage, the magic-link sender" (259-260) | IT admin | "One account" invites the question "whose" and the sentence does not answer it. Also reads as fewer things to run, which the IT admin does not believe. | Add the ownership choice in the next sentence. Count the cairn shape's accounts (item 14) so "one" does not read as "only". |
| "A cairn site costs the $5 Workers Paid plan plus a domain, about $6 a month" (295-296) | board, owner | Reads as the total cost. | On the page: hosting and domain as links, then "the developer's time is the largest line, and it is not measured here" (item 12). |
| "the same admin is where a developer mounts the organization's own screens" (85) | owner | An owner skims "the same admin is where ... screens" and reads it as something they can do. | Keep "a developer" as the sentence's first noun. Follow with item 20's sentence on the first screen. |
| "Editors never see git" (156) with "Editors learn markdown syntax" (247) two legs apart | owner, editor | The first without the second overstates ease. | Place them adjacent: "Editors never see git. They do learn markdown, with a live preview." |
| "about 36,000 lines ... over about 69,000 engine lines" (786-787) | designer, board, owner | The designer says lines tell them nothing; the board and owner read the numbers as scale or as cost. | Off the first screen. If it reaches `why-cairn.md`, keep the case's own guard: "the layer is SvelteKit routes, D1 tables, forms, and toolkit lists ... none of it reimplements authentication, CSRF, the editor, the publish path" (770-773), which says what the number means. |
| "the 28-rule admin audit, the public-surface snapshot gate, the magic-link editor login, the per-entry holding branch" (137-139) | designer, evaluator | Magic-link sixth of seven; the audit reads as a gift, and to a designer it is a gate over their work. | Lead with magic-link and its comparison to Keystatic's GitHub mode and Decap's identity provider (item 9). Name the audit as a check their screens pass. |
| "A bespoke SvelteKit app on Workers has a small labor market when that developer leaves" (122-123) | IT admin, board | Opinion, and it does not say what actually happens. | The mechanism form: editors keep editing, the site keeps serving, changes need a SvelteKit developer, and there is no vendor and no support contract (items 13 and 15). |
| "npm is the surface a cairn site patches" (77-78), "87 numbered releases", "202 times" (70-73) | IT admin, evaluator | Reads as a rate and as an obligation; the failure mode when updates stop is not stated. | Drop the counts on the page. Show what one `Consumers must` line looks like. Add the deferred-failure sentence. |
| The outage list with durations (299-313) and "16 incidents in the ten days" (311) | IT admin | A count that cannot be reproduced and a table that ages daily reads as an operational promise. | A dated link to the 2025-11-18 postmortem and the status page. Say nobody is paged. |
| "Members are a different case. A member population gets `createAuthChannel`" (103-105) | owner, board, IT admin | Engine noun with no gloss; the reader learns only that members are complicated. | "Members sign in separately, through a login the developer builds; cairn's editor sign-in is for staff." The API name stays in the extend track. |
| "what the component looks like lives in code, changes for every page at once, and cannot be overridden per occurrence" (380-382) | owner | True and abstract. | The annual-event sentence (417-418): a page laid out unlike every other page needs a developer under cairn. |
| "Backup is as good as the organization's GitHub account" (201-202) | IT admin | Covers content only. The member data, ledger, waivers, and media are in D1 and R2 and have no stated backup. | Item 5's sentence beside it. |
| Every sentence carrying "seam", "toolkit", "shell", "manifest", "directive", "fieldset" without an apposition | every non-developer | Stops the reader on a house term. | Section 3's tiers. |
| "Front door: derivable" lines, every tag, "Leg n", "steel man", "counterweight" | every reader | The record's scaffolding leaking into a published page. | Strip on derivation. |
| The traditional setup's advantages "stated as facts" (47-53) | evaluator, professor | On a published page these become vendor characterizations that decay; on the record they are tagged opinion. | Keep the capability-only framing at 43-45, drop the enumerated advantages to one sentence, and link nothing. |
| "Email Sending ... in public beta" (278-281) | IT admin, board | Present as a vendor fact; the consequence for sign-in is not drawn. | Item 6's sentence: an unready sender means no editor can sign in. |

---

## Closing note for the derivation

The case is written for one reader and it says so. The front door's first screen must serve six
and route five of them away in the first lines. The derivation is therefore an act of subtraction
plus three additions the record does not yet contain: the developer-required sentence (item 20),
the ownership-as-choice sentence (item 5), and the sign-in-on-beta-email sentence (item 6). The
figure should draw one system with its boundary, mark the developer's screens by fill inside that
system, and leave every comparison to prose.
