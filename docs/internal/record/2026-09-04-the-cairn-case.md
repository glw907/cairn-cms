# The cairn case

Record, 2026-09-04. The durable form of the front-door argument. The front-door concept figure and
`docs/why-cairn.md` derive from this document; neither restates it.

## Preface

This document argues why a small organization might run its website and its own tools on cairn,
for a reader who has to make that choice and can check the reasoning. The reader is a developer or
a technically fluent lead choosing how a club, a nonprofit, or a small business with non-technical
editors runs its site. It is built to survive an intelligent attack and to be graded on logic and
evidence. Its sections are the traditional setup at its strongest, five legs (cairn as CMS and
admin tool; content in git; one hosting account; no page builder; agent-assisted development as a
case report), and, between the first and second legs, a short section on the shape the case argues
for, of which cairn is one implementation. The figure's form is decided later, from this text, and
the last section records that open question.

Four rules govern it. Nothing here is a pitch; the document has no stake in whether the reader
adopts cairn, and it grades neither side [^1]. That sentence is for this record and never derives,
since a page that says it is not a pitch is pitching. The traditional setup is described at its
strongest, in the same voice as cairn. cairn's drawbacks carry the same weight as its advantages,
each with a factual counterweight where one exists and a plain concession where none does. Every
factual sentence ends in a tag: `[^2]` for a fact checkable against the tree or a primary
document, `[^3]` for a claim backed by a study or report with a stated sample, `[^4]` for a
statement that is checkable but was not cited here, or `[^5]` for a judgment. The fourth tag
exists so that `[^6]` marks only judgments. A sentence that could earn no tag was cut. From
revision 9 the tags live in the numbered notes at the end of the document, one note per tag, each
carrying its kind, its path or URL, the command where one exists, and the figures the sentence
turns on, so a checker reproduces every number from the note alone; the prose carries the one
number each sentence turns on inline. Evidence dates matter, because counts and ratings move; the
evidence file records the read date of each number [^7].

Inputs: the ratified argument brief, its round-1 adversarial review (verdict RETHINK, twelve
ranked changes), the two evidence files, the product owner's strengthening notes, the round-2
review (verdict SOUND AFTER FIXES, twenty ranked changes), the round-3, round-4, and round-5
reviews, the audience lens, the two tells reviews, the third and fourth research passes (cost and
speed, the shape's public record, large-sample telemetry, the Cloudflare leg, shaped frameworks),
the measured build, the owner's round-8 notes, the scope charter, the docs register,
`why-cairn.md`, and the extend track, all banked under
`docs/internal/record/2026-09-04-cairn-case/`. Where this document departs from a review, it says
so and says why. Each section carries a front-door line: derivable, or internal record only
because it names a consumer site.

## The traditional setup, as a competent team builds it

Front door: derivable.

The shape is a hosted CMS with a theme and plugin ecosystem, beside a membership product that
carries the member database, dues, event registration, bulk email to members, and a member portal
in its own interface [^8]. A payments provider, a registrar, and organizational mail sit beside
them as separate accounts [^9]. Good teams build this well [^10]. The shape varies: some
membership products embed into the CMS site on its own domain, and some bundle the website builder
and the portal into one product with one member login [^11]. Any drawing of "two systems, two
logins" is true of some vendors and false of others. So what follows describes what these products
do, not who sells them [^12].

The membership product supplies event registration with payment, recurring dues with renewals and
reminders, invoices and receipts, a member directory, bulk email with subscription state and
unsubscribe handling, and a member export, as configuration rather than code [^13]. The CMS
supplies a visual editor a volunteer already knows, a theme and plugin market, and a labor market
of people who can be hired to work on it [^14]. The volunteer needs no developer[^372]. Each part
can be replaced independently, and each vendor carries a support contract [^15]. Someone answers
the phone[^373]. The payments provider arrives already integrated with dues and renewals [^16].
The costs are as real[^383].

The same people use two interfaces and two logins where the two products are separate, and the
member record lives in the vendor's store [^17], and the integration between site and membership
product is maintained by the organization [^18]. A plugin ecosystem is an update and security
treadmill: Patchstack's disclosure data for 2024 counts 7,966 new vulnerabilities in the WordPress
ecosystem, 96% of them in plugins, and 33% unpatched at public disclosure [^19]. Those are the
plugin ecosystem's own numbers[^342]. For 2025 the same database counts 11,334 new
vulnerabilities, 91% in plugins, 46% unpatched at public disclosure, and a weighted median of five
hours from disclosure to first exploitation among heavily exploited flaws [^20]. Patchstack sells
a competing security product. Those are counts of disclosed vulnerabilities, and nobody has
measured how often a small site is breached [^21]. The search found no independent measurement of
maintenance hours for a small organization's site, and agency care-plan prices are not evidence
[^22]. The treadmill runs both ways[^343]. cairn has its own treadmill. The engine's changelog
carries 87 numbered entries from `0.22.0` to `0.96.0`, one of them a release-candidate heading,
and the tag list carries 70 plain tags plus 3 release-candidate tags in that range, starting at
`v0.24.0` [^23]+\.[0-9]+\.[0-9]+' CHANGELOG.md`; `git tag | grep -E
'^v0\.(2[2-9]|[3-9][0-9])\.[0-9]+$' | wc -l`; `v0.96.0` dated 2026-08-22]. The phrase "Consumers
must" appears 202 times in that changelog [^24]. The package declares 37 runtime dependencies and
four peers [^25]. The production site ran two engine-adoption passes on consecutive days,
2026-08-21 and 2026-08-22 [^26]. A Vite 8 change once broke every consumer build until the engine
added a post-package transpile step [^27]. npm is the surface a cairn site patches [^28]. A site
that stops applying updates keeps serving on its pinned version, and the risk is deferred to the
next platform floor, framework major, or change to the beta email API [^29].

## Leg 1: cairn is both a working CMS and an extensible admin tool

Front door: derivable.

A cairn site is one SvelteKit app that contains the public site and an editor admin at `/admin`,
and the same admin is where a developer mounts the organization's own screens through documented
seams [^30].

Out of the box, before a developer writes anything, the adapter gives you an editor-first CMS with
two roles, owner and editor: editors sign in from an emailed link, write markdown with a live
preview rendered by the same function the public site uses, and publish [^31]. The developer has
written nothing yet[^344]. A site's own route under `src/routes/admin/` renders inside the shared
shell automatically, is gated by the same access map, audits through the same sink, and composes
from `@glw907/cairn-cms/admin-toolkit` primitives (`OfficeList`, `AdminTable`, `ListToolbar`,
`Pagination`, `StatusChip`, `EmptyState`, `FieldLabel`) [^32]. The scaffold ships one worked
custom screen, `admin/signups`, reading its own `APP_DB` binding [^33]. The seams form a versioned
public surface held by a snapshot gate, so a site's screens survive ordinary engine updates [^34].
That is the promise the gate keeps[^374].

A staff-shaped audience (an instructor, a volunteer coordinator) uses the editors' magic-link
sign-in with a `none`-capability role and its own `home`, and stays a row in `AUTH_DB` [^35].
Members are a different case. A member population gets `createAuthChannel`, a wholly separate
login with its own D1 store, its own session, and its own area outside `/admin`, and nothing about
it plugs into the admin shell [^36]. The engine's own example site binds `MEMBER_DB` as a third
database beside `AUTH_DB` and `APP_DB` [^37]. Member management, dues, events, and announcements
are the site's own code, and cairn ships none of them [^38]. The engine never models a domain
actor and knows only owner and editor [^39]. Members are not editors[^384].

Everything the membership product supplies as configuration is, on cairn, code the site writes,
tests, secures, and keeps running, and dues automation alone is money-touching work with failure
paths [^40]. The brief's earlier phrasing "one login and one interface for editors and members"
was a sentence of the same family the register killed ("sharing one admin and one sign-in"), and
it is false for members [^41]. Conceded, and corrected above.

Starting a cairn site needs a developer, because the scaffold is unpublished and its chapters
assume one [^42]. No one else is on call[^345]. Adding a form, a booking page, or a shop needs the
same developer, since content is Posts and Pages [^43]. A developer stays in the loop for anything
past writing and publishing, and an organization without that person should weigh that before
starting [^44]. The engine has no vendor and no support contract, so the developer is the support
[^45]. A bespoke SvelteKit app on Workers has a small labor market when that developer leaves
[^46]. cairn is pre-1.0, and a seam has already moved across two minor releases inside the tier
meant to stay frozen [^47].

The custom code starts from a scaffold with a worked screen, a toolkit of primitives that ship
pre-compiled in cairn's own stylesheet, a documented seam per extension point, and one agent skill
(Leg 5) [^48]. Everything past that is the developer's [^49].

A developer who will write the membership layer either way can also take SvelteKit plus a
git-backed CMS and a hand-written `/admin` [^50]. That is a fair build[^346]. The git-backed tools
in that position, by npm weekly downloads for the week of 2026-08-23: `@keystatic/core` 134,619,
TinaCMS 70,261, Decap CMS 3,059 [^51]. The difference that matters is sign-in. Keystatic's GitHub
mode wants every editor to hold a GitHub account with write access to the repository, and its
hosted Cloud mode lifts that by routing editors through Keystatic's own service. Decap wants an
OAuth backend, a GitHub OAuth app behind a proxy or Git Gateway. cairn sends the editor an email
from the site's own Cloudflare account, with no third service in the sign-in path [^52]. Sign-in
is where the two builds part[^347]. Leg 3 carries what that costs. Past that, cairn brings the
holding-branch publish path, the admin shell and its primitives, the snapshot gate that keeps the
seams from moving, and the agent skill [^53], and a developer assembling the same thing writes or
installs each one [^54]. The 28-rule admin audit is a gate over screens the developer designs,
which a designer reads as a reviewer of their work as well as a gift [^55]. It grades their
work[^375]. What the other stack gives that cairn does not: a choice of host and framework, and an
editor UI its own project maintains [^56].

## The shape, not only the product

Front door: derivable.

The case argues for a shape, and cairn is one implementation of it [^57]. The shape has four
parts[^348]. The shape has four parts: content as markdown in the organization's own git
repository; an admin frame that lives inside the organization's own app; the organization's own
screens mounted through seams; and one hosting platform supplying hosting, data, media, mail, and
deploy [^58]. A developer can build the same shape from SvelteKit plus Keystatic or Decap plus a
hand-written admin, or on another stack entirely [^59]. That is a valid choice, and this document
does not grade it against cairn [^60]. Both builds are the shape[^376]. What cairn ships that such
a build writes or installs itself is the list Leg 1 carries under "The developer's other option":
the magic-link editor login with no third service in the sign-in path, the holding-branch publish
path, the admin shell and its primitives, the snapshot gate, and the agent skill [^61]. The claim
is the shape plus those pieces, and it is never a claim about the product against another build of
the shape [^62].

Frameworks that carry the hard parts and leave the developer the domain have a measured record
with agents. The Rails Foundation runs a public benchmark on its own framework: in its first
report, 8 models on 21 atomic tasks with 3 runs each, the top model solved 92% of 63 runs, and
runs that used framework APIs solved at 92% against 87% for hand-rolled code, with six of 21 tasks
solved by every run [^63]. Rails measured it first[^349]. Its third report added cost: the top
model solved 92% of 63 runs for $75, and an open-weight model 83% for $3.31, with API recall at
most 41% [^64]. Vercel's public Next.js evals show a bundled documentation index lifting mid-tier
models to the top tier and doing nothing for models already there, with cost per eval from $0.35
to $2.68 [^65]. Team ledgers with artifacts: Sentry's Django monorepo carries a Claude co-author
trailer on 2,525 of its 13,170 commits in the first eight months of 2026, with an `AGENTS.md`
naming the framework's blind spots [^66]. Basecamp's ledger is smaller. Basecamp's open-source
Rails product Fizzy carries the trailer on 104 of 1,370 commits in the same window, with an
`AGENTS.md` naming its invariants [^66]. Simon Willison's published ledger for a library release:
34 commits over 30 files, $149.25 in model cost, the transcript public, and a data-loss bug caught
in review [^67]. Phoenix now generates the agent's instruction file with every new app, and its
auth generator defaults to magic links [^68]. Charm ran Bubble Tea v2 in production inside its own
coding agent, Crush, from the start, and published its upgrade guides for humans and LLMs; no
primary source says Charm's maintainers build with Claude, and this document does not say so
[^69]. None of this names cairn[^350]. The admin-inside-the-app precedent is older than agents:
Django's automatic admin since 2005, thoughtbot's Administrate because generic dashboards were
"too generalized to be useful to site admins", and Payload and Filament as the current generation
[^70]. The counter-record stands beside it. Constraint Decay and BaxBench, read in Leg 5, find
convention-heavy frameworks harder for agents on greenfield backends, with the best BaxBench model
at 62% correctness and about half of that exploitable, and no study conditions on a scaffold of
cairn's kind [^71].

## Leg 2: content is markdown files in the site's git repository

Front door: derivable.

Content bodies are markdown files in the site's own GitHub repository, so history, attribution,
and rollback come from git, and there is no content server to run [^72].

An editor's save commits to a per-entry holding branch, `cairn/<concept>/<id>`, with the editor as
commit author and `cairn-cms[bot]` as committer [^73]. Every save is a commit[^351]. A deliberate
publish copies it onto the adapter's configured default branch, and the site's existing deploy
carries it live [^74]. Editors never see git [^75]. Every publish redeploys the site the way any
push does, with no change window [^76]. Publish means live[^385]. The pattern is the category's,
not cairn's alone: Decap commits an editor's draft to a `cms/collectionName/entrySlug` branch and
opens a pull request, and TinaCMS documents an app identity committing on the editor's behalf
[^77]. The bodies are plain text a human can read and a tool can parse, and no export step stands
between the organization and its content [^78].

Drafts are a holding branch and also a `status` field defaulting to `draft`, carried in the
committed manifest [^79]. The committed manifest (`src/content/.cairn/index.json`) is a projection
of every entry's identity, routing, draft state, and edges, rebuilt at build and patched in the
same commit as a save, which makes it an index with a maintenance contract [^80]. Write access to
content is the GitHub App's private key. The attack surface moved from a database to a key, and
the key has a rotation procedure [^81]. A concurrent edit to one entry is detected and refused:
the engine logs `commit.failed` with `reason: conflict` on a 409, and the second editor loses that
attempt [^82]. A publish from `/admin` lands on the default branch with no review gate [^83].
Content is reviewable in git, and the editor path does not route through a review [^84].

A database enforces validation at the store. cairn's fieldset validates in the admin instead, so a
commit made outside the admin meets only the build's manifest regeneration [^85]. A database also
keeps referential integrity in real time, where cairn checks references at build and guards
deletes [^86]. Transactions across entries, per-row permissions, and multi-writer merge have no
cairn equivalent at all [^87]. A database reads without a network hop. An uncached body read in
cairn crosses the GitHub API, which allows at least 5,000 requests an hour per App installation
[^88]. A database can erase. Personal data that reaches a content file is in history across every
clone, and removing it means rewriting history [^89]. Git has no `DELETE`[^353]. Cross-entry
queries, reporting, and full-text search are the developer's job at build or request time [^90].

GitHub recommends repositories under 1 GB and blocks files above 100 MiB, so a content corpus has
a ceiling a database does not [^91]. The corpus has a ceiling[^377]. So media lives in R2, and
content is split across two stores by design [^92]. The category is small: WordPress holds 58.9%
of sites with a known CMS, and git-based CMS tools are not a tracked category [^93]. This model is
a niche[^378]. Backup is as good as the organization's GitHub account, one account and one place
to lose access [^94]. The search found no named case study of a git CMS failing at scale and no
survey of editor satisfaction with markdown against rich text. Both are gaps [^95].

The category's leading tool stalled: Netlify transferred Netlify CMS to an agency in February
2023, and a competitor reports progress stalled for more than six months before that [^96].

cairn's fixed concepts are sized for an organization's site, and the manifest exists so index
pages never crawl the repository through the API [^97]. A stalled CMS leaves the content readable
and the site building, since the content is files in a repository the organization can clone
whenever it controls the account that holds it, and the engine is an npm dependency [^98]. The
content stays readable[^352]. Personal data belongs in D1, which has `DELETE`, and content files
carry site content [^99]. A cairn site has no plugin surface to patch, since the code is the
site's own and the engine updates through npm [^100]. The category's own tracked issues admit the
concurrency cost (no conflict resolution in the editor, no presence indication), which is the
shape cairn chose too [^101].

### Why markdown

Markdown is plain text, so git's line-based diff, blame, and review work on content the way they
work on code, and a file is readable without cairn [^102]. A change reads as a change[^379].

Structured fields ride in frontmatter typed by the concept's fieldset [^103]. Plain text stays
plain[^354]. cairn ships a component grammar, `defineComponent` with `fields.*` attribute
descriptors (exactly ten) and the hast helpers `cardShell`, `headRow`, and `iconSpan` [^104]. An
empty registry still renders plain markdown, GFM tables, `cairn:` links, and `media:` references
[^105]. The site declares its own vocabulary of callouts, figures, and embeds, and cairn ships
none [^106]. The vocabulary is the site's[^355]. The charter calls markdown in git over a
structured manifest the cleanest input a language model can get, and warns to invest where machine
consumption is evidenced rather than hyped [^107]. The mechanism statement that survives: a tool
or a model reads the file itself, with no database export and no rendered page between [^108]. The
brief's superlative, "the most widely read format by agents," has no published measurement and is
dropped [^109]. The CommonMark core is stable [^110]. cairn's directives, `cairn:` targets, and
`media:` scheme are pre-1.0 surface and are not covered by that stability [^111].

Keystatic ships a rich-text document field and Tina a rich-text editor, where cairn's body is
CodeMirror over markdown [^112]. Editors feel that difference first[^356]. Editors learn markdown
syntax, with live preview and a tidy pass, where a visual editor asks nothing [^113], and the
directive vocabulary is per site, so an editor moving between two cairn sites meets two
vocabularies [^114]. Portability is bounded by the same directives: another markdown tool renders
the prose and none of the components, `cairn:` links, or `media:` references [^115]. The prose
travels. The rest does not[^386]. Moving existing content in is a project [^116]. So is moving
out[^380].

## Leg 3: one account carries hosting, data, mail, DNS, deploy, and edge protection

Front door: derivable, with every vendor number replaced by a link; tags marked internal cite a
consumer site's record through the evidence file.

One Cloudflare account supplies the compute, the static-asset cache, the sign-in store, media
storage, the magic-link sender, DNS, the TLS certificate, DDoS and WAF protection, request logs,
and, optionally, the deploy on push and the domain registration, on one bill [^117]. It is one
bill[^357]. The two-product traditional shape assembles those from a CMS host, a database host or
plugin store, a CDN, a mail relay, a certificate process, a registrar, and a CI service, or pays a
managed host to hide them [^118]. Against a bundled membership product that hosts the site, the
portal, and the mail, the vendor count is equal and the capability list is the product's [^119].
Count the accounts and cairn's shape is Cloudflare, GitHub, a payments provider if dues are
collected, and organizational mail; the registrar folds into Cloudflare when the domain moves
there [^120].

The platform is the same one the free plan gives every zone. Cloudflare publishes 348 cities and
95% of the connected population within 50 ms of one [^121]. Every plan gets that edge[^387].
Universal SSL issues, renews, and deploys "free, unshared, publicly trusted" certificates on every
plan, which settles the earlier rounds' unconfirmed certificate charge [^122]. TLS is on every
plan[^358]. DDoS protection is "standard, unmetered" at layers 3 to 7 on every plan [^123]. The
free WAF carries custom rules, one rate-limiting rule, and the Free Managed Ruleset; the full
managed rules are a $20 zone plan [^124], and bot Fight Mode is one toggle on the free plan
[^125]. Requests for static assets are "free and unlimited" and cached at the nearest location
[^126]. Workers Logs turn on with one config line and keep seven days on the paid plan, and the
engine writes one JSON record per operational event into them [^127]. Workers Builds deploys on
push with 3,000 build minutes a month free [^128]. The registrar charges registry cost with no
markup [^129]. The bill is $5 a month for Workers Paid, once per account, plus the domain, and $20
a month per zone if the full WAF is wanted; D1, R2, and 3,000 emails a month sit inside the paid
plan's included quotas at a club's scale [^130]. R2 egress is free, and D1 has no egress charge
[^131]. The limits move. Read them on Cloudflare's own pages [^132].

The setup cost of the platform is carried by cairn's tooling. The scaffold writes `wrangler.jsonc`
with its bindings, the two migration sets, and the doctor's readiness checks [^133].
`create-cairn-site`, pre-release, walks the GitHub App creation, then creates the Worker, two D1
databases, and the R2 bucket on the free plan through the developer's own wrangler session, then
creates or adopts the zone and copies existing DNS records before the nameserver switch [^134].
The developer runs the command, switches nameservers at the registrar, turns on Workers Paid, and
pastes two API tokens; the tool writes the rest [^135].

The platform is operable by an agent as well as by a person. Cloudflare hosts sixteen MCP servers,
one exposing "the entire Cloudflare API", over 2,500 endpoints, and publishes setup pages for
eight coding agents plus `llms.txt` for its docs [^136]. Wrangler authenticates from
`CLOUDFLARE_API_TOKEN` "for situations like CI/CD, and other automation" [^137]. This repo's own
operating instructions route routine Cloudflare changes through that token and the MCP plugin
[^138]. The agent reads the same pages a person does[^381]. Leg 5 leans on this. A platform an
agent can read and change from documentation is part of what makes the shape work [^139].

No study isolates vendor count against a small team's operational burden, so whether one account
is less work is untested [^140]. That question is open[^359]. Cloudflare published three
postmortems for outages that took Workers-hosted sites down between 2025-06-12 and 2025-12-05
[^141].

| Date | Duration | Scope | Postmortem |
| --- | --- | --- | --- |
| 2025-06-12 | up to 2 h 28 min | Workers KV, Access, the dashboard | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/ |
| 2025-11-18 | about 2 h 10 min globally, full restoration 17:06 UTC | CDN, Turnstile, Workers KV, Access, the dashboard | https://blog.cloudflare.com/18-november-2025-outage/ |
| 2025-12-05 | about 25 min | 28% of applications behind the network | https://blog.cloudflare.com/5-december-2025-outage/ |

Three in six months [^142]. None since carries a postmortem; the outage tag's later entries are
other providers' incidents and a 2026-05-01 post declaring the "Fail Small" plan complete [^143].
The status feed on 2026-09-05 held 33 incidents from 2026-08-21, twelve touching Workers products,
each marked "minor" and regional [^144]. A $5 site has no uptime commitment: the Business plan
carries the 100% SLA with service credits, and the self-serve terms say "as is" [^145]. When the
network fails globally, a cairn site fails with it. The traditional shape fails in parts, and no
source compares the two shapes' aggregate downtime [^146].

Vendor tie is the plain case against one account. Its size is a fact to weigh. Cloudflare is a
reverse proxy for 25.1% of all websites and 84.6% of the reverse-proxy market, and the DNS
provider for 18.1% of all websites, by W3Techs's survey [^147]. It reports 81 million HTTP
requests a second on average and is listed on the NYSE with $696.1 million of revenue in the
quarter to June 2026 [^148]. A site tied to this vendor is tied the way a site on a hyperscaler is
tied [^149]. That is the size of the bet[^388].

Email Sending is beta and paid, and sign-in depends on it, so an unverified sender means no editor
can get in [^150]. Sign-in rides on it[^360]. Onboarding writes an apex DMARC policy telling
receivers to reject mail the domain has not authenticated, `p=reject` in the record's terms
[^151]. The Email Sending pages describe no list management, unsubscribe handling, bounce
suppression, or campaign features [^152]. D1 processes one query at a time per database and caps
at 10 GB on the paid plan [^153]. That is the ceiling[^361]. That is right for a club's roster and
wrong for real write concurrency [^154]. R2 documents eleven-nines durability and no versioning or
point-in-time restore; durability "does not prevent intentional or accidental deletion" [^155].
Deleted is deleted[^362]. D1 offers Time Travel to any minute in the last 30 days on Workers Paid
and 7 days on Free [^156]. The published cairn docs carry no backup or restore procedure for
either store, a gap the docs owe [^157]. No monitoring, alerting, or uptime check is in the
published docs beyond the scaffold's `healthz` route [^158]. There is no account-transfer feature:
moving a zone to another account means re-adding the domain, repointing nameservers, and reissuing
certificates, and a Registrar-held domain needs a support request [^159]. Whether the Cloudflare
and GitHub accounts belong to the organization or to its developer is a choice this document does
not make [^160]. In the production case the repository, the Cloudflare account, and the GitHub App
installation are all under the developer's personal accounts: the site's `wrangler.toml:4` carries
an `account_id` matching the engine author's account in cairn-cms `CLAUDE.md`, and the engine's
`CLAUDE.md` names one App installation on the author's account [^161]. Members can be added to an
account under scoped policies, so the organization can own the account from day one and the
developer can be a member [^162]. The support question, above under Leg 1, applies to the platform
choice too [^163].

The tie is the platform bindings layer and the engine that reaches it. The engine has no
host-agnostic layer and reaches D1, R2, and Workers directly, so leaving Cloudflare means leaving
cairn or porting it [^164]. Nothing hides that[^363]. What leaves with the organization untouched:
the repository, the content files, the theme and the chassis copy, and the markup of its own
screens [^165]. What is rewritten: every data access in those screens, since each reaches D1
through `platform.env`, the adapter's backend and bindings, and the engine's own role [^166]. This
document does not size that rewrite, and no one has measured it [^167]. The rewrite is
unsized[^364]. That is a larger tie than the brief stated, and the counterweight below still
answers it [^168]. The admin's tie is narrower than the brief stated. The admin frame is DaisyUI
on Tailwind, and a site that restyles the admin itself works in that idiom [^169]. A custom admin
screen mostly consumes the toolkit. Each toolkit component assembles daisyUI classes from cairn's
own blessed set, keeps its layout in a scoped `<style>`, and ships pre-compiled in cairn's admin
stylesheet, and the skill tells an author to finish with `npx cairn-audit` rather than with
DaisyUI knowledge [^170]. The public site is not tied: the engine's public output is
design-agnostic and each site brings its own `render` [^171]. The scaffold's own Waymark theme
happens to use Tailwind with DaisyUI theme blocks, as copy-in files the site owns outright, and a
site built by hand may use any CSS [^172].

The tie is bounded by what the organization holds at each layer. It holds the GitHub repository,
every line of SvelteKit code in it, and its content as markdown files [^173]. Its D1 data exports
to a SQL file with one wrangler command, which blocks other requests while it runs [^174]. The
data leaves as SQL[^365]. Its R2 objects move with the AWS CLI or rclone over the S3 API [^175].
cairn holds none of it; the engine is an MIT package on npm [^176]. Announcements to members still
need list management, unsubscribe handling, suppression, batching, and a send record, none of
which the Email Sending primitive supplies and all of which the site builds; the engine's own
publish seam is a pure manifest diff that sends nothing [^177]. The reader weighs a single vendor
of this size, with these exits, against a set of smaller vendors each replaceable alone [^178].

## Leg 4: no page builder, as a feature and as a cost

Front door: derivable.

A directive in a cairn content file names a site-owned component and a small declared attribute
set. What that component looks like lives in code, changes for every page at once, and cannot be
overridden per occurrence. An island is the contrast: it carries its props in the file, which is
per-occurrence configuration living in the content [^179]. The file names a part[^366]. A page
builder does the opposite. It stores per-occurrence presentation in the content [^180]. The
brief's "the file carries no layout" was false, since a directive carries a component name and
attributes, and is replaced by the sentence above [^181].

WordPress's own documentation shows block content stored in `post_content` as HTML comment
delimiters carrying JSON attributes [^182]. The lock-in claim is strongest for proprietary builder
structures. Deactivating a third-party builder is widely reported to leave pages as raw output,
with no official conversion path [^183]. This comes from support forums and third-party guides,
not from the vendors [^184]. It is weakest for core block markup. That reads as valid HTML with
ignorable comments in any tool. On that measure it is more portable than a cairn directive, which
renders as literal text outside cairn [^185]. An editor cannot change the site's design language
or a component's styling, though an editor can still pick the wrong directive or write a heading
that wraps badly [^186]. The editor's job stays small: headings, emphasis, links, lists, images,
and the site's declared directives [^187]. That is the whole editing surface [^188].

Builders are mainstream. Elementor runs 12.8% of all websites W3Techs tracks and roughly 31% of
WordPress sites, so a large share of site owners choose builder coupling knowingly [^189]. In the
WordPress 2023 annual survey (n=3,922), 45.1% agreed the Site Editor meets their site-building
needs and 28.6% disagreed, with block editor use about 60% and rising [^190]. Most WordPress users
are not fighting it [^191]. The Classic Editor install count (8 million plus, fourth by active
installs, read 2026-09-04) is dropped from this argument: it measures transition friction on sites
that predate 2018, and a preference for Classic Editor is a preference for a different visual
editor, which argues toward a builder and away from markdown [^192]. The Gutenberg plugin rating
is dropped, since that listing is the beta channel and does not measure the shipped editor [^193].
No survey with a stated sample measures page-builder lock-in or migration regret [^194].

Any organization wanting one page laid out unlike every other page, a special page for the annual
event, needs a developer under cairn and needs nobody under a builder [^195]. Complex layouts are
the developer's components [^196]. One special page needs a developer[^389]. Moving out of cairn
means resolving the site's directive vocabulary, `cairn:` ids, and `media:` references, a
migration cost of its own [^197].

That is the trade cairn takes on purpose. A component's appearance lives in code, so changing a
theme changes every page at once, and no editor can drift one page away from the rest [^198].

## Leg 5: agent-assisted development, a case report

Front door: internal record only (names a consumer site); the derivable form is at the end of
the section.

This leg is a case report. It neither infers that agents make custom code cheap, as the brief did,
nor reverses that into the round-2 review's thesis. It states what cairn carries, what the general
studies test, and what one production site's own record measures, and it leaves the inference to
the reader [^199].

**What cairn carries, scoped to the charter.** cairn carries the correctness-critical and
security-bearing parts of the editor session and the admin frame: magic-link authentication and
sessions (`src/lib/auth/`, 1,149 lines; `src/lib/auth-crypto`, `src/lib/auth-store`), the route
guard, CSRF, and the admin action wrappers (`src/lib/sveltekit/`, 10,710 lines;
`src/lib/components/csrf-context.ts`, `CsrfField.svelte`), the markdown editor, preview, and admin
shell (`src/lib/components/`, 24,595 lines), the commit and publish path to GitHub
(`src/lib/github/`, 825 lines), the admin design system and its toolkit (`src/lib/admin-toolkit/`,
2,267 lines; `cairn-admin.css`), the 28-rule admin audit including accessibility
(`src/lib/audit/`, 10,139 lines), and a second-audience login factory (`src/lib/auth-channel/`,
1,697 lines) [^200]. Those modules sit behind 33 check scripts and a public-surface snapshot gate
[^201]. The engine's own test suite is 446 `.test.ts` files under `src/tests/` [^202]. A site
reaches these through 18 export subpaths [^203]. The site's own login, payments, and personal data
are the site's code, and the production case below shows each as site code [^204].

**What the general studies test, and what they do not.** Across 1,319 live repair tasks from 93
repositories with early-2025 models, a single-file patch under five lines was solved 48% of the
time, a patch touching three or more files or more than 100 lines under 10%, and a patch touching
seven or more files never [^205]. The benchmark measures issue repair [^206]. Two studies do
measure greenfield construction, and both cut against a bare "conventions help agents" sentence.
Constraint Decay ran 80 greenfield and 20 feature tasks across eight frameworks and found agents
about twice as successful on Flask (49%) and Express (51%) as on Django (25%) and FastAPI (24%),
blaming the conventions an agent must infer and naming data-layer defects as the leading root
cause [^207]. Its headline is the decay in its title: as explicit structural requirements
(architecture, database, ORM) accumulate, capable configurations lose about 30 points in assertion
pass rate from the baseline prompt to the fully specified task, and some weaker ones approach zero
[^208]. BaxBench, 392 tasks across 14 frameworks, found that the framework chosen moves both
correctness and security; the best model reached 62% correctness, about half of its correct
programs were exploitable, so roughly a third were both correct and secure [^209]. What no cited
study measures is construction against a scaffold that carries auth, sessions, and the admin frame
[^210]. This leg's reading of those two studies: they show where agents fail, and one failure is
inference. An agent handed a convention it must infer from the framework infers it badly, and the
convention-heavy frameworks lose on exactly that [^211]. The shape's answer is to remove inference
from the job. cairn's design makes its conventions explicit rather than inferred: the scaffold
writes the starting site, the skill states the screen anatomy, the component contracts, and the
seams, the toolkit supplies the components, the docs name the path, and the gates and the audit
refuse what drifts [^212]. The 30-point decay cuts against the easy form of that remedy: piling
more requirements into the ask made capable agents worse, so a written skill that reads as a
longer specification is not the answer, and the shape's bet is on conventions the agent can copy
(the exemplar, the toolkit) and on gates that check the result, not on a longer prompt [^213].
Whether those explicit conventions achieve it is the hypothesis the measured build below tests,
and it is unmeasured until the fix round lands [^214]. The first pass already shows the trap is
not closed by writing things down: the review found the agent followed the nearest in-repo
exemplar over the published doc, which is inference happening despite the docs [^215]. On
security-sensitive tasks the highest-scoring of 25 agent and model pairings produced correct and
secure code 23.8% of the time, AI-co-authored pull requests carried 2.74 times the security issues
of human-only ones across 470 requests, and 45% of generated solutions across 80 tasks and more
than 100 models carried a security flaw [^216]. Two public failures sit at the seam cairn carries,
the access policy over a platform-held store. CVE-2025-48757, CVSS 9.3, records Lovable-generated
sites whose row-level security let unauthenticated users read and write arbitrary tables, and the
vendor's dispute was that the policy was each customer's job [^217]. Eight months later Moltbook,
vibe-coded on Supabase, shipped a public key with no policies and exposed about 1.5 million tokens
and 35,000 email addresses [^218]. Of 200 deployed vibe-coded apps audited, 180 carried a
vulnerability and broken access control was the largest class [^219]. cairn's editor session and
route guard are engine code at that layer; a site's own member login and payments are not, and the
production case below shows both [^220]. None of these tests a framework that owns the editor and
admin invariants and hands a developer a seam [^221]. Ten further studies the evidence file
records (SWE-Bench Pro, Rahman et al., Watanabe et al., Evaluating AGENTS.md, Kim et al., How
Coding Agents Fail Their Users, the METR self-report survey, Peng et al. and Cui et al., Shen and
Tamkin, Agarwal et al.) bear on task type, context files, review burden, and skill formation, and
none tests this division of labor; they stay in the evidence file with their numbers [^222].

**Speed and later maintenance.** In METR's randomized trial, 16 experienced developers on 246
issues in mature repositories were 19% slower with AI while believing they were 20% faster [^223].
METR's 2026 follow-up, 57 developers on 800-plus tasks, gives point estimates of minus 18% and
minus 4% with intervals reaching plus 9%, with 30% to 50% of developers withholding tasks they did
not want to do without AI, so METR stands behind no uplift number [^224]. This document makes no
speed claim [^225]. In a two-phase experiment with 151 participants, code written with AI
assistance showed no significant difference in later completion time or quality when others
evolved it [^226].

**The population, from the vendors' and the field's own data.** One author's record is weak
persuasion, so the large samples are stated with their methods. A staggered-adoption study of
7,786,771 commits carrying the Claude co-author trailer from 185,517 authors, with a
5,838-developer panel, found adoption associated with 41 more commits a month and wider language
breadth, under a doubly robust estimator against not-yet-adopters [^227]. Anthropic's largest
session study, about 400,000 Claude Code sessions from about 235,000 people, found people making
about 70% of planning decisions and about 20% of execution decisions, with verified success at 28%
to 33% for experienced users; the report states it cannot see whether the code was kept [^228].
The Economic Index reports state their samples, windows, and classifiers, and each says it studies
what people delegate and not whether the output shipped [^229]. Microsoft's rollout study of tens
of thousands of engineers found 24.0% more pull requests per engineer per day after CLI-agent
adoption, with a passing placebo test and no code-quality measure [^230]. The counter, from an
independent sample: across 302,600 AI-authored commits in 6,299 repositories, over 15% of every
tool's commits introduced a static-analysis issue, Claude carried the highest rate at 1.95 issues
per commit, and 22.7% of introduced issues persisted [^231]. Agent feature pull requests are
accepted 15 to 40 points below human ones in the wild, and documentation pull requests above
[^232]. Same-task agent runs vary up to 30 times in tokens [^233]. A repository context file cut
median agent runtime 28.64% and output tokens 16.58% at the same completion rate [^234]. The
sentence the telemetry sustains: agents are a common way the mainstream typed web stack is now
built, and the vendors' own data do not show that they build it well without a gate, since no
study varies gate presence; agents are used daily by 14.1% of Stack Overflow's 2025 respondents
and by none of 52% [^235]. TypeScript is the top language for every agent's pull requests and the
most-contributed language on GitHub, and SvelteKit is named in none of these sources [^236].

**What cairn ships for an agent, as artifacts.** One agent skill, `cairn-admin-screens`, ships in
the npm tarball: a 114-line `SKILL.md` that teaches an agent to build or review a screen inside a
cairn site's `/admin` to cairn's own register, mapping the 28 `cairn-audit` rules across static
and rendered modes and pointing at the audit rather than restating it, plus six reference files
(list and detail exemplars at 212 and 206 lines, form anatomy, extension grammar, a grader prompt,
and a craft catalogue), 1,255 lines in total [^237]. `cairn-doctor --fix` installs it at
`.claude/skills/cairn-admin-screens/` and reports it fresh, missing, or stale by hash [^238]; the
check never fails a run, since the skill is a development aid [^239]. The scaffold,
`create-cairn-site`, emits a complete SvelteKit site from the Waymark theme with one worked custom
screen, and it is pre-release: unpublished on npm as of 2026-09-04, with its ship an open roadmap
item [^240]. Cloudflare publishes an `llms.txt` index, a Claude Code setup page, sixteen remote
MCP servers, and an Agents SDK; GitHub publishes an MCP server, the `gh` CLI, and a coding agent
that opens pull requests [^241]. Those support "vendor agent tooling exists," and nothing about
its effect [^242].

### The case report: one production site's membership and assets build

The site is `aksailingclub-org` at commit `836d324` (2026-08-30), read-only [^243]. The measured
scope is the three admin routes `members/`, `assets/`, and `asset-requests/` under
`src/routes/admin/club/`, plus the sixteen modules under `src/admin-club/lib/` those routes import
(`assets-store`, `classes-store`, `club-action`, `club-db`, `club-email`, `club-settings`,
`households-store`, `household-surgery`, `ledger`, `manual-payment`, `member-format`,
`member-types`, `money-store`, `payments`, `refunds`, `ui`) [^244]. The first 48 hours are
2026-07-06 00:00 to 2026-07-08 00:00 by commit date, in the commits' own timezone (UTC-8) [^245].

The site's developer is the engine's author, and that bounds what the case shows. 799 of the
site's 838 commits carry the engine's author name, the repository is under that author's personal
GitHub account, and the toolkit components named below graduated from this site into the engine
during the measured window [^246]`, 10 under the author's full name); the site's CLAUDE.md:255
(`glw907/aksailingclub-org`); cairn-cms src/lib/admin-toolkit/index.ts:8-11]. The record measures
the engine's author extending his own engine, in his own accounts, with his own agent workflow,
and says nothing about a second developer [^247].

| Measure | Value | Command or line |
| --- | --- | --- |
| First commit, `members/` and `assets/` | 2026-07-06, `cc4edd3` | `git log --reverse -- <path>` |
| First commit, `asset-requests/` | 2026-07-07, `a6d3c05` | same |
| Commits in the first 48 hours touching the three routes or `src/admin-club` | 37 | `git log --since='2026-07-06 00:00' --until='2026-07-08 00:00' --format=%h -- <routes> src/admin-club` |
| Whole-repository commits on those two days | 42 on 2026-07-06, 151 on 2026-07-07 | `git log --since='<day> 00:00' --until='<day> 23:59:59' --format=%h`, per day |
| Lines added to the three routes in the first 48 hours | 1,361 added, 158 deleted (621/124 on the 6th, 740/34 on the 7th) | `git log --since='2026-07-06 00:00' --until='2026-07-08 00:00' --numstat --format= -- <routes>`, summed |
| Lines added to the sixteen imported modules in the first 48 hours | 1,595 added, 98 deleted; eight of the sixteen existed by the end of 2026-07-07 (`member-format` and `ui` on the 6th; `assets-store`, `classes-store`, `club-action`, `club-email`, `club-settings`, `payments` on the 7th); `ledger` first appears 2026-07-13 and the other seven 2026-07-14 | `git log --since='2026-07-06 00:00' --until='2026-07-08 00:00' --numstat --format= -- <modules>`, summed; `git log --reverse -- <module>` |
| Lines today | routes 3,233 (1,704 + 1,203 + 326); the sixteen modules 3,879 | `wc -l` |
| Later commits touching the three routes, 2026-07-08 to 2026-08-30 | 42 | `git log --since=2026-07-08 -- <routes>` |
| Later commits touching `src/admin-club` | 81 | same, `-- src/admin-club` |

What the first two days built, from the commit messages: on 2026-07-06 the Club section was
scaffolded as five custom `/admin/club/*` screens on `CairnAdminShell`, with Members, Assets,
Classes, and Email rendering structural office-list-shaped table shells and the Members list and
detail screens and the signup-review queue built the same day [^248]; on 2026-07-07 the member
domain, the asset domain with the assets admin, the asset-request inbox, member magic-link
authentication, the classes admin with the club-action wrapper and audit sink, Stripe Checkout
with webhook reconciliation, and the scheduled job runner landed, and the club-admin stand-ins
were swapped onto the engine's `0.82.0` seams [^249]. The Members list and household desk moved
onto live club data on 2026-07-14, with 395 lines added and 345 deleted on the routes [^250]. How
those days ran, from the site's own record: pass 2.1 executed overnight on 2026-07-07 in an
extended conductor session while the owner slept about nine hours, ten plan tasks plus riders
built by Sonnet implementers under a Fable conductor, closed by a three-reviewer Opus fan-out
[^251]. No wall-clock hours of the owner's own time are recorded anywhere in the repository
[^252].

**The later commits, classified.** The 42 commits that touched the three routes after 2026-07-08,
classified by commit subject and by whether the diff touched `.svelte` markup or `.ts` server and
store code [^253].

| Class | Commits | Lines on the routes | What they did |
| --- | --- | --- | --- |
| Layout and toolkit shapes | 20 | +1,557 / -708 | Rebuilding the Members screen on the toolkit (`06bf1b4`, +404/-162); rebuilding Assets off raw tables (`4f2e7bd`) and asset-requests (`8778556`); both re-entering the toolkit register (`e151a09`, `339007b`); three rendering-defect rounds; the coherence round (`8bacfac`); the field-label register; zebra clip and dialog polish (`1fe2270`); typography, count-line grammar, phone formatting |
| Domain logic | 16 | +1,645 / -502 | Live club data (`81634ca`); household desk write paths, roster CRUD, surgery, payments, tier change (`ce22629`, +622); the refund engine (`87b42a8`); the membership-admin review round on refunds, caps, and races (`35e319c`); waitlist promotion and asset-type editing; decision emails; the standing tier; the opt-in control |
| Engine adoption | 6 | +222 / -184 | The `0.90.0` pickup (`5089e0c`), the `0.91.0` grammar (`986f95c`), `0.94.0-rc.1` (`fbb5908`), the swap onto the published `/admin-toolkit` subpath (`0430788`), the club gate onto the engine's typed session (`9031d5e`), retired type names (`107ab1d`) |

A commit here is one conductor-batched agent change; the counts describe the record's shape and
not effort [^254]. The layout class is the largest by commit count and the second by lines. The
components those rebuilds moved onto have since graduated into the engine: `AdminTable`,
`ExpandableRow`, `StatusChip`, `ListToolbar`, `Pagination`, `ToolbarDisclosure`, and the pure
`list-toolbar`, `pagination-window`, and `format` modules each carry a header saying they
graduated from the production site, and `ToolbarDisclosure` graduated a level deeper out of
`ListToolbar` [^255]. The `/admin-toolkit` subpath published across `0.89.0` (2026-07-21) and
`0.90.0` (2026-07-23), the release in which `ExpandableRow` graduated on its second consumer, and
six further absorptions from the site's harvests merged on 2026-08-27, unpublished [^256]. The
site's own harvest ruled on 2026-07-20 that a component graduates when its second consuming screen
has used it, and the 2026-07-30 assets harvest filed vertical centering of padded labels, the
toggle-action control, and the label-and-value row as engine-level mechanics [^257]. The site's
recorded budgets for that layout work: the Members pass about 3.4M subagent tokens with zero
conductor questions and one coordination note, the Members refinement round about 1.9M with zero,
and the assets substrate pass about 3.23M across 26 dispatches with eighteen grader runs and three
fix rounds [^258]. Of the 42 later commits, 20 touched layout and toolkit shapes that the engine's
`/admin-toolkit` has since absorbed, named above, and those components now ship in the engine
[^259]. Whether a site built on the current engine starts from them rather than deriving them is
an inference this record cannot test, since the components exist because this site derived them,
and a site's own screens still compose them [^260].

**The defect at the seam.** The site's pre-cutover blocker is a CSRF defect: its blanket
`Referrer-Policy: no-referrer` nulls `Origin` on plain form POSTs, the engine's CSRF guard rejects
them, and member sign-in failed in real browsers across 40 forms, invisible to every prior test
[^261]. The engine held the invariant and a real-browser gate caught the trip; the seam between
engine invariant and site code is where this bug lived, and the site's developer had to understand
the invariant to fix it [^262]. The site's member login is not `createAuthChannel`; it is 914
lines of site code on the engine's `auth-crypto` primitives, written before that subpath shipped
[^263].

**What the record supports.** The initial membership and assets build landed in two calendar days,
as an overnight agent run whose token spend the record does not carry, with the owner's own time
unrecorded, and with the first build rendering shells and demo data that moved onto live data a
week later [^264]. The spend is unrecorded[^367]. The layer then took 42 commits of refinement on
the routes over eight weeks, and 81 on the shared library, including six engine-adoption commits
and the CSRF seam defect [^265]. The site's recorded token spend on later passes ran 1.4 to about
2.3 times its own ceilings, which the site's record calls "roughly twofold" [^266]. The general
studies are cited only for what they test, issue repair on benchmarks and security defect rates in
generated code, and none tests this division of labor [^267].

**Derivable form, for the front door.** I built the membership and assets admin for one club site
in two days. I ran it overnight as an agent job and did not record what it cost. Then I spent
eight weeks refining it: 42 commits on those routes. Twenty of them were layout work on shapes the
engine's toolkit has since absorbed, so a site starting today starts further along than I did.
That site's member login, payments, and signatures are its own code, not cairn's, and the one
blocker that reached production was a CSRF defect at the seam between the two. I am the engine's
author too, so read this as what I can do with my own engine. It says nothing about a second
developer [^268].

### The second case: one measured screen on the showcase

The first case is the engine author's own site. The second is a controlled build anyone can repeat
from its spec: one Sonnet implementer, one dispatch, a specified volunteer-roster screen at
`/admin/volunteers` on `examples/showcase`, built against the current engine with the shipped
skill in a fresh worktree, no engine change allowed, the full gate required, and an Opus
diff-review after [^269]. The first pass and the review are stated at equal weight.

**The first pass.** Wall-clock 34 min 51 s from dispatch to last command; 198,039 tokens; 113 tool
calls; one commit, `27a9e1f5`, 31 files and 540 insertions across the showcase and the template
re-emit; showcase check 0/0, the new e2e spec 2 passed, full showcase e2e 157 passed, root check
0/0, chassis-boundary and public-tokens and template gates passed [^270]. The skill and the
exemplar supplied the guard-then-action pattern, the `OfficeList`, `AdminTable`, and `FieldLabel`
composition, the migrations-per-database convention, and the dev-wiring order; the implementer
worked out a screen-scoped `node:sqlite` dev double itself [^271]. A first attempt was killed by
an API rate limit mid-edit and discarded; the figures are the clean re-run [^272].

**The review.** The Opus diff-review escalated, which is the verdict that stops a change and sends
the decision up. It found the screen correct inside the boundary the dispatch drew and incomplete
outside it, on five items [^273]. Every gate passed. The reviewer did not[^368]. The 13 admin
visual baselines were regenerated on the workstation against the repo's rule that baselines are
CI-canonical, so the reported e2e pass partly asserted against baselines the same run wrote. The
screen leaked into the product scaffold with a third D1 binding that `create-cairn-site` never
personalizes, so a scaffolded site would deploy a placeholder database id. The implementer
followed the nearest in-repo exemplar over the published doc, taking bare actions with
`requireEditor` where the doc names `createSectionAction` and `requireAccess`, so the destructive
action writes no audit record. The skill's own done-gate, `npx cairn-audit` static and rendered,
was neither run nor reported. Native `required` and `type="email"` were removed so the e2e could
reach server validation, which is test pressure changing shipped behavior. The review's own
reading: the measured 35 minutes buys the code inside the boundary and buys nothing outside it
[^274].

**What the review teaches about conventions.** An agent follows the exemplar. So the exemplar, the
scaffold, the docs, and the skill must say the same thing and be maintained in tandem, and a
divergence between any two of them is an inference job handed to the agent [^275]. That the agent
resolves it by copying whichever it read last is the mechanism the proposed tandem gate would
test; one case supports "this happened" and no more [^276]. The measured build shows one such
divergence being resolved that way: the showcase sign-ups screen uses the raw guard, form-data,
and `fail()` shape, the custom-screen guide recommends `createSectionAction` plus `requireAccess`,
and the agent copied the screen [^277]. The six inference traps the build exposed, this divergence
among them, are filed to the passes that own them, with a tandem-maintenance gate proposed so a
later divergence fails CI instead of waiting for a measured build to find it [^278]. The measured
build is treated as a standing probe: each review's findings feed the skill, the docs, and the
gates, and the next run measures whether the trap is gone [^279].

**The fix round.** `[fix round: pending]` The fix round to the published standard is being timed;
its wall-clock, tokens, and second review complete the measurement as a two-pass figure, and the
coordinator fills this slot.

**Whole-system delivery, the regime the studies do not measure.** The controlled studies above
measure one task with a reviewer in the loop [^280]. The telemetry sees long delegations and
parallel agents: over 10% of Codex users run three or more agents at once, whole apps are built
from a specification and scored at 61.8% at best, and a month-long hackathon deployed 21 of 40
LLM-only projects [^281]. What no source measures is a gated, scaffold-based delivery with its
cost [^282]. The owner's regime is that missing case: implementers run in parallel and overnight,
a reviewer model and the gates stand in for a human reviewer, and the unit delivered is a whole
system in calendar days [^283]. The measured build shows why both halves are needed. Every gate
the spec named passed, and the reviewer model stopped the change on five items the gates did not
see [^284]. Gates alone were not enough[^369]. Measurements on record: the production site's
membership and assets layer in two calendar days, then eight weeks of refinement [^285]; the
2026-08-25 email-announce pass, eleven tasks overnight [^286]; and this screen's first pass in 35
minutes, stopped in review [^287]. In that regime wall-clock is bounded by machine and API. The
cost that moves is review and tokens, which the same records show running 1.4 to 2.3 times their
ceilings [^288]. The absence of this regime in the literature is a lag, not a contradiction, and
this document claims it only as far as these measurements carry it [^289].

### Already extensible, measured

Front door: internal record only (names a consumer site); the derivable form is at the end.

One production site, `aksailingclub-org`, carries a custom admin layer that consolidates what an
organization would otherwise run as two or three separate products, each with its own admin, its
own login, and its own data [^290]. It is one author's site[^371]. The site went live by flipping
the apex from a Hugo site and retiring a hosted membership platform after a two-week soak, and its
member data was imported from that platform's exports [^291]. Its custom admin sections,
enumerated by route under `src/routes/admin/club/`, with source lines [^292].

| Route | Section title | Lines | What the section does |
| --- | --- | --- | --- |
| `members/` | Members | 1,704 | Roster, standing, households, renewals |
| `money/`, `(site)/api/stripe` | Season rollup; the payments webhook | 433 + 127 | Dues ledger and refunds over a payments provider |
| `documents/` | Waivers and acknowledgements | 573 | Waivers, signatures, certificates |
| `committees/` | Committees | 738 | Groups and roles |
| `classes/` | Classes | 1,748 | Sessions, waitlists, fees |
| `events/` | Events | 3,120 | Season calendar and ledger |
| `assets/`, `asset-requests/` | Assets; Asset requests | 1,203 + 326 | Boat parking, moorings, racks, and requests for them |
| `email/`, `announce/` | Email; Announce | 1,501 + 559 | Segments, templates, a send cap, publish announcements |
| `settings/` | Settings | 381 | Club settings |

The member-facing half of the same layer (`src/member-portal`, `src/member-auth`,
`src/member-signup`, `src/jobs`, and the `my-account`, `join`, `classes`, and `events` site
routes) is the portal those sections serve [^293]. Counted by category, the layer stands in for a
membership platform, an events or registration tool, an asset register, and an email service, four
product categories, over one retained payments provider [^294]. Four products, one app[^382].

Two facts follow from the tree. First, every section is built from the engine's admin toolkit
inside the engine's shell. Counting files under `src/routes/admin/club/` and `src/admin-club/`
whose `import { ... } from '@glw907/cairn-cms/admin-toolkit'` statement names each symbol,
multi-line imports included (four such statements exist there): `OfficeList` 16, `TextInput` 12,
`FieldLabel` 11, `StatusChip` 9, `SelectInput` 8, `EmptyState` 7, `itemNoun` 6, `AdminTable` 4,
`computeCountLine` 3, `PageHeader` 3, `ageFromBirthdate` 3, `ExpandableRow` 3, `ListToolbar` 3,
`Pagination` 2; and every `/admin/**` route renders inside `CairnAdminShell` from
`@glw907/cairn-cms/components` through one `+layout.svelte` [^295]. Second, `hooks.server.ts`
composes `createAuthGuard({ roles, access })` over the whole `/admin` subtree, with
`createD1AuditSink` wired beside it, so the club sections use the editors' session [^296]. Members
remain a separate audience with their own login, the shape [Add a second
audience](../../extend/add-a-second-audience.md) prescribes; this site built it as its own module
on the engine's `auth-crypto` primitives, against its own database, before the `auth-channel` seam
shipped [^297].

The size ratio has two halves: what one more section costs, and what the developer never writes.
The whole-layer ratio sits beneath. All counts are `wc -l` on 2026-09-04 and include comments and
blank lines [^298].

**The increment, per section.** Ten of the eleven sections import `/sveltekit`, `/admin-toolkit`,
and `/components`; `documents/` imports the first two; no section imports more than four subpaths
[^299].

| Section | Route lines | Engine imports it leans on |
| --- | --- | --- |
| Scaffold `signups` (the minimal case) | 90, plus a 9-line migration | `/sveltekit`, `/admin-toolkit`, `/components` [^300] |
| `settings` | 381 | `/sveltekit` 1, `/admin-toolkit` 1, `/components` 1 |
| `asset-requests` | 326 | `/sveltekit` 1, `/admin-toolkit` 1, `/components` 1 |
| `money` | 433 | `/sveltekit` 1, `/admin-toolkit` 1, `/components` 1 |
| `announce` | 559 | `/sveltekit` 2, `/admin-toolkit` 2, `/components` 1 |
| `documents` | 573 | `/sveltekit` 5, `/admin-toolkit` 4 |
| `committees` | 738 | `/sveltekit` 1, `/admin-toolkit` 1, `/components` 1 |
| `assets` | 1,203 | `/sveltekit` 1, `/admin-toolkit` 1, `/components` 1 |
| `email` | 1,501 | `/sveltekit` 3, `/admin-toolkit` 3, `/components` 2 |
| `members` | 1,704 | `/sveltekit` 2, `/admin-toolkit` 2, `/components` 2 |
| `classes` | 1,748 | `/sveltekit` 4, `/admin-toolkit` 5, `/components` 3 |
| `events` | 3,120 | `/sveltekit` 2, `/admin-toolkit` 3, `/components` 2, `/media` 1 |

The route lines exclude each section's share of `src/admin-club/` (8,930 lines of stores and
actions across the eleven sections) and its tests [^301]. Stores are counted apart[^390]. The
increment runs from 90 lines to about 3,100 per section [^302].

**What the developer would otherwise install or write elsewhere.** The carried modules by name and
line count, magic-link login first, none of which the production site reimplements; the engine's
own audit, doctor, gates, and tests sit in a second group, since no stack asks a consumer to write
those [^303].

| Carried by the engine, in place of an install or a hand-written module | Module | Lines |
| --- | --- | --- |
| Magic-link auth, sessions, and access | `src/lib/auth/` | 1,149 |
| The route guard, CSRF, admin actions, and the route factories | `src/lib/sveltekit/` | 10,710 |
| The editor, preview, admin shell, and media library | `src/lib/components/` | 24,595 |
| The commit and publish path | `src/lib/github/` | 825 |
| The admin toolkit | `src/lib/admin-toolkit/` | 2,267 |
| The content model and manifest | `src/lib/content/` | 4,378 |
| The render pipeline and component grammar | `src/lib/render/` | 2,302 |
| Delivery (feeds, sitemap, robots) and media | `src/lib/delivery/`, `src/lib/media/` | 1,508 + 1,315 |
| The second-audience login factory | `src/lib/auth-channel/` | 1,697 |

| Engine internals no consumer writes in any stack | Module | Size |
| --- | --- | --- |
| The 28-rule admin audit, accessibility included | `src/lib/audit/` | 10,139 lines |
| The doctor's readiness checks | `src/lib/doctor/` | 2,655 lines |
| The gates | `scripts/checks/` | 33 scripts among 40 files |
| The tests | `src/tests/` | 446 `.test.ts` files |

**The pair.** Building something like cairn is one measurement, and building this layer on top of
it is the other.

| Measure | The engine (`cairn-cms`, `main`) | One production membership layer (`aksailingclub-org`) |
| --- | --- | --- |
| Source, TypeScript and Svelte, excluding tests | 68,644 lines under `src/lib/` [^304] | 35,888 lines in 176 files across `src/admin-club` (8,930), `src/routes/admin/club` (12,415), `src/member-portal` (4,997), `src/routes/(site)/my-account` (5,655), `src/member-auth` (914), `src/member-signup` (610), `src/jobs` (814), and the `join`, `classes`, `events`, and `api` site routes (1,553) [^305] |
| Tests | 446 `.test.ts` files under `src/tests/` [^306] | 172 `.ts` files, 32,420 lines under `src/tests/` [^307] |
| Gates | 33 check scripts plus the public-surface snapshot [^308] | The repo's `ci.yml` (`check`, `test`, `build`, e2e) [^309] |
| Shipped surface | 18 export subpaths [^310] | Imports 11 engine specifiers, `/sveltekit` 57 times, the root 44, `/admin-toolkit` 27, `/delivery` 22, `/components` 18, `/cloudflare` 11, `/media` 9, `/delivery/head` 6, `/auth-crypto` 4, `/render` 2, `/delivery/data` 1 [^311] |
| Schema | 3 packaged migration sets (`migrations`, `migrations-app` in the scaffold, `migrations-channel`) [^312] | 125 `.sql` files, 2,844 lines under `migrations/asc-club/`; 2,997 lines under `migrations/` in all [^313] |
| History | 87 numbered changelog entries, `0.22.0` through `0.96.0` (73 tags in range, `v0.96.0` on 2026-08-22), about 4,000 commits, 2026-05-24 to 2026-09-04 [^314] | 838 commits, 2026-07-06 to 2026-08-30, in named passes with plans and post-mortems [^315] |

What the membership layer reuses from the engine, read from its imports: `requireSession`,
`requireAccess`, `createSectionAction`, and `createD1AuditSink` for gating and audit;
`generateToken`, `hashToken`, `tokensMatch`, `generateSessionId`, and `generateCsrfToken` for its
own member login; `checkRateLimit`; `CsrfField`; and `OfficeList`, `AdminTable`, `PageHeader`,
`StatusChip`, `EmptyState`, `FieldLabel`, `TextInput`, and `SelectInput` for its screens [^316].
How it was built: the passes ran as implementer and diff-reviewer chains under a workflow, with
human interaction points counted per pass, and the 2026-08-25 email-announce pass ran eleven tasks
overnight [^317].

The minimal case beside it is the scaffold's own worked screen: `admin/signups` is 90 lines across
two files plus a 9-line migration [^318].

The production layer is about half the engine's source line count (35,888 against 68,644), and it
is the four-category system enumerated above, with renewal reminders, refunds, signatures, and a
member directory besides [^319]. The ratio is about one to two[^370]. The sentence "a small
fraction of the whole" is not what this measurement supports, and this document does not write it
[^320]. What it supports: the layer is SvelteKit routes, D1 tables, forms, and toolkit lists on 11
engine import paths, and none of it reimplements authentication crypto, CSRF, the editor, the
publish path, or the design system [^321]. A smaller organization's layer, a roster and a signup
form, sits nearer the 90-line end of the range than the 35,888-line end [^322]. The site's own
records give the effort in agent tokens and human interaction points, and not in hours:
events-redesign ran about 2.1M tokens against a ceiling raised from 1.5M to 2.2M; events-admin
about 3.5M against 2M; assets-register about 1.35M through six tasks plus about 2.1M in the close
against 1.5M, which the record calls "roughly twofold"; human interaction points per pass are in
single digits [^323]. The overruns are recorded against their causes, chiefly tests that asserted
text rather than mechanics [^324]. No dollar or hour figure for developer cost exists in either
repository; the token figures convert to money only at a model's published price, which this
document does not apply [^325]. No measurement of the skill's effect on an agent building one of
these screens exists in either tree, and the round-2 search found no study that isolates
scaffolding or a context file as a variable on work of this shape [^326].

**Derivable form, for the front door.** I run a club site on cairn. Its membership, events,
assets, and email sections are about 36,000 lines of code I wrote, sitting on about 69,000 engine
lines I did not, reached through eleven import paths. The member login, the payments, and the
personal data are the site's, not the engine's. Its screens are built from the engine's toolkit
inside the engine's shell, behind the same guard the editors use, and the smallest such screen the
scaffold ships is 90 lines. I wrote the engine too, so read that ratio as one author's site
[^327].

## Where this document argues with the reviews

Revision 8 folds the third and fourth research passes, the measured build, and the owner's round-8
notes without a review round [^328]. Round 5 ranked ten changes, all taken [^329]. Round 4 ranked
twenty-one changes. This document takes twenty and half of the twenty-first: four of the ten
`[^330]` tags became vendor-page citations where a fetched page showed the claim, and the rest
stay `[^331]` because the traditional setup is described by capability and a named vendor page
would tie each sentence to one product [^332]. Round 3 ranked twenty changes. This document takes
all twenty; the one it could not apply as written is the missing email-spike record, which is not
missing and is re-pointed to `docs/internal/record/2026-08-11-t4b-email-spike.md` [^333]. Round 2
ranked twenty changes. This document takes nineteen as written and overrides one: its first
change, which would reverse Leg 5 into the thesis that the division of labor hands agents the
organization's hardest work. The product owner ruled that Leg 5 is a case report, so the leg now
states the measurements and neither inference [^334]. Round 1 ranked twelve changes. This document
takes eleven as written [^335]. It differs on one point of scope. Round 1's section 7 holds that
the comparative material belongs in `why-cairn.md` as prose and that the front door should show
one system only. This document keeps the traditional setup as a section, because the product
owner's ruling is that the case is built first and the figure follows, and because a reader
choosing between two shapes is owed the other shape in the same voice [^336]. The register
objection to naming competitors is honored: the traditional setup is described by capability, and
the only vendor names in this document are in citations of public numbers [^337]. Whether any of
that material reaches the front door is the figure's question, recorded below [^338].

## Open questions

1. **The figure's form.** Round 1's objection stands unanswered by this text: a two-panel contrast
   argues by box count, and a box costs the same ink whether it is bought (a subscription with a
   support line) or built (a developer's months), so the geometry cannot show the asymmetry every
   leg above turns on. Three options. One system drawn with its boundary (cairn's screens and the
   site's screens inside `/admin`, the payments provider, organizational mail, and a member auth
   channel outside), with the contrast carried in prose. Two panels, with each built capability on
   the cairn side visibly marked as site code. Two figures, one for the system and one for the
   contrast. This document decides none of them. 2. **Claims judged too weak to carry the front
   door.** The cost sentence in Leg 5, in any comparative form, and any sentence about what agents
   do best or worst. The "one member record" and "one login for editors and members" sentences,
   removed as false. The Classic Editor and Gutenberg numbers, removed as measuring the wrong
   thing. "Edge security as a platform default," narrowed to TLS and DDoS protection with the WAF
   subset stated. 3. **Whether to name the outage.** The 2025-11-18 postmortem is the strongest
   single-vendor counter-evidence. Naming a dated incident on a front door may read as defensive;
   omitting it leaves the reader to supply it. The register's vendor rule settles the form: on a
   published page the incident is a dated link, and the duration table stays in this record. 4.
   **Email Sending against the free deploy.** The scaffold's Cloudflare chapter deploys on the
   free plan, and Email Sending needs the paid plan; the front door has to state the boundary
   before the step that crosses it. 5. **Evidence gaps, after two research passes.** No controlled
   study of agent success conditioned on framework scaffolding, test coverage, or documentation
   quality as an isolated variable. No study pricing custom code on a scaffolded stack against
   configuring a product. No survey with a stated n on non-technical editors' experience of
   markdown against rich text. No churn or retention data for git-based CMSs. No independent
   measurement of WordPress maintenance hours for small organizations, and no peer-reviewed study
   of plugin abandonment. No study of multi-vendor operational cost for small teams. No WordPress
   annual survey after 2023. METR's original study does not condition on task type. Four citations
   remain unfetched: the WordPress 5.0 release post, GitHub's App-authentication page for
   bot-committer wording, Universal SSL's "unshared" wording at the free tier, and the Cloudflare
   status incidents for 2026-08-07 to 2026-08-25. 6. **The setup-needs-a-developer conflict.**
   `why-cairn.md:23-26` says the setup is one a non-developer runs; this document says a developer
   is needed to start. The derived page has to move to this document's sentence. 7. **The evidence
   collected, and what is still missing.** The public success record of the shape and the
   cost-and-speed evidence are now in the document, from two research passes and one measured
   build [^339]. Still missing after the four "found nothing" lists: a cost per shipped feature
   with a method from any production setting; a controlled time-to-first-deploy on a scaffold; a
   study that varies scaffold quality, test coverage, or a shipped skill as the treatment; any
   telemetry that names SvelteKit or Cloudflare Workers; a per-repository resolve rate on
   SWE-bench Verified; a measured record for Laravel or Phoenix; an independent small-organization
   case of git-backed content with non-technical editors; and the measured build's fix round,
   whose slot is marked pending [^340].

8. **A measured worked example.** Answered in part by the second case, one screen measured in
   isolation; the fix round completes it. A Go server the owner expects to deliver in four or five
   calendar days is a measurement to record when it lands, and not evidence until then. One custom
   screen built on a cairn site with an agent, its diff size, files, and passes recorded, would be
   the first evidence for Leg 5's economic half. Whether to build it before the figure ships is a
   product decision.

## Vocabulary

The five readers of the round-3 review each stopped on terms this document uses in a house sense.
The table merges their maps, term by term, with the reader it stopped and the plain equivalent the
front-door derivation uses. The board member and the small-business owner stop on nearly every
technical term, so their rows give the plainest form [^341].

| Term | Who it stopped | Plain equivalent |
| --- | --- | --- |
| cairn | board member, business owner | the website software |
| SvelteKit | board member | the framework the site is written in |
| Cloudflare, Workers, Worker | designer, IT admin, board member | the hosting company; its hosting product; the hosted function that serves the site |
| D1 | IT admin, board member | the hosted database |
| R2 | IT admin, board member | hosted file storage |
| bindings | IT admin | connections declared in the config file |
| migration | IT admin, board member | a database change |
| GitHub, repository | IT admin, board member | where the website's files and their history are kept; the git repository |
| GitHub App | designer, IT admin | the site's GitHub integration identity |
| app (one SvelteKit app) | designer | the site's codebase |
| deploy | designer, IT admin | publishing a page rebuilds and re-releases the site; there is no change window |
| admin, admin frame, admin shell, admin skeleton | designer, IT admin, board member, business owner | the editing screens; the screen frame |
| admin toolkit, toolkit | designer, board member | ready-made screen parts |
| admin audit, cairn-audit | designer | the screen checks |
| platform | designer, IT admin | the hosting account (Cloudflare); a product (a membership platform); not cairn |
| adapter (cairn's) | designer | the site's configuration object |
| adapter (SvelteKit's) | designer | the build plug-in for the host |
| manifest | designer | the committed content index |
| directive | designer, board member | a named block in the markdown |
| fieldset | designer | the fields a content type declares |
| concept | designer, professor | a content type (Posts, Pages) |
| frontmatter | board member | the fields at the top of a page file; dropped for this reader |
| holding branch | board member | where a saved draft waits before publish; dropped for this reader |
| seam | designer, IT admin, board member | an extension point; a place a developer can add a screen |
| chassis | designer, IT admin | the starter theme's base layer |
| theme (Waymark) | designer | the starter site |
| island | designer | an interactive component embedded in a page |
| markdown | board member, business owner | a plain-text way of writing pages |
| magic link | IT admin, board member, business owner | sign in by clicking an emailed one-time link, no password |
| editor | business owner | the person who writes; separately, the writing box |
| save, publish | business owner | a save does not go live; a publish does |
| site, admin | business owner | the public pages; the editing screens |
| domain | business owner | your web address |
| CSRF | board member | a web security check |
| npm, release, "Consumers must" | board member | software updates the developer applies, each with a list of required changes |
| tokens | professor, board member | the unit the AI tools meter and bill in; not an auth token |
| pass | professor, board member | one planned chunk of development work |
| conductor | professor | the top-level agent directing sub-agents |
| harvest | professor, designer | the list of engine feedback banked at the end of a pass |
| graduated | professor, designer | moved from a site into the engine |
| register | professor, designer | the editorial voice standard; not a CPU register |
| scaffold | board member, business owner | the setup tool |
| engine | board member, business owner | the cairn software itself |
| beta | board member | not a finished product; the vendor may change or withdraw it |
| snapshot gate, public-surface snapshot gate | designer | a test that fails the engine's build when an extension point changes |
| point-in-time restore | IT admin | put the database back the way it was at any minute in the last 30 days |
| commit trailer, `Co-Authored-By: Claude` | professor, board member | a line at the end of a commit message naming the agent; counting it gives a floor, never a share |
| `AGENTS.md`, context file | designer | a file in the repository that tells a coding agent how the project works |
| row-level security | IT admin | a database rule saying which rows each user may read or write |
| benchmark harness, pass rate | professor | a public set of tasks with hidden tests, and the share of runs that pass them |
| gate | board member | an automated check a change must pass before it counts as done |
| escalate (a review verdict) | designer | the reviewer stopped the change and sent the decision up |
| zone | IT admin | the domain as Cloudflare manages it |
| SLA | IT admin, board member | a written uptime promise with a refund if it is broken |
| registrar | board member | the company you pay for the domain name |
| DMARC at `p=reject` | IT admin | a DNS record telling other mail servers to reject unauthenticated mail from the domain; it can affect the organization's own mail |

## Notes

[^1]: Opinion: a judgment, not a checkable fact.
[^2]: Verifiable: <path or URL>.
[^3]: Supported: <citation>.
[^4]: Uncited: checkable against <what>.
[^5]: Opinion: a judgment, not a checkable fact.
[^6]: Opinion: a judgment, not a checkable fact.
[^7]: Verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, research date 2026-09-04.
[^8]: Uncited: checkable against any membership product's feature page.
[^9]: Uncited: checkable against the same.
[^10]: Opinion: a judgment, not a checkable fact.
[^11]: Uncited: checkable against the vendors' own pages. Supports: one.
[^12]: Opinion: a judgment, not a checkable fact.
[^13]: Uncited: checkable against any membership product's feature page.
[^14]: Uncited: checkable against the WordPress plugin and theme directories; opinion on the labor market.
[^15]: Uncited: checkable against the vendors' plan pages.
[^16]: Uncited: checkable against the membership product's integrations page.
[^17]: Uncited: checkable against the two-product vendors' pages. Supports: two.
[^18]: Opinion: a judgment, not a checkable fact.
[^19]: Supported: Patchstack, State of WordPress Security in 2025, data updated 2025-03-14, https://patchstack.com/whitepaper/state-of-wordpress-security-in-2025/. Supports: 2024, 7,966, 96%, 33%.
[^20]: Supported: Patchstack, State of WordPress Security in 2026, https://patchstack.com/whitepaper/state-of-wordpress-security-in-2026/. Supports: 2025, 11,334, 91%, 46%, five.
[^21]: Verifiable: same; opinion on the second clause.
[^22]: Verifiable: docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, Priority 2.
[^23]: Verifiable: `grep -cE '^## [0-9. Supports: 87, 0.22.0, 0.96.0, one, 70, 3, 0.24.0.
[^24]: Verifiable: `grep -c "Consumers must" CHANGELOG.md`. Supports: 202.
[^25]: Verifiable: package.json. Supports: 37, four.
[^26]: Verifiable: one production site's record, docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, 1E; internal. Supports: two, 2026, 08, 21, 22.
[^27]: Verifiable: docs/internal/record/2026-06-21-e2e-dist-svelte-build-failure.md. Supports: 8.
[^28]: Opinion: a judgment, not a checkable fact.
[^29]: Opinion: ; verifiable: docs/extend/upgrade-cairn.md for the floors.
[^30]: Verifiable: docs/extend/architecture.md. Supports: one.
[^31]: Verifiable: docs/extend/architecture.md, docs/why-cairn.md. Supports: two.
[^32]: Verifiable: docs/extend/add-a-custom-admin-screen.md. Supports: 907.
[^33]: Verifiable: docs/extend/what-the-scaffold-wrote.md. Supports: one.
[^34]: Verifiable: docs/internal/what-cairn-is-and-is-not.md, `check:surface`.
[^35]: Verifiable: docs/extend/add-a-second-audience.md.
[^36]: Verifiable: docs/extend/add-a-second-audience.md. Supports: 1.
[^37]: Verifiable: examples/showcase/wrangler.jsonc.
[^38]: Verifiable: docs/why-cairn.md, "The honest trade-offs".
[^39]: Verifiable: docs/internal/what-cairn-is-and-is-not.md.
[^40]: Opinion: a judgment, not a checkable fact.
[^41]: Verifiable: docs/internal/docs-register.md, Killed list; docs/extend/add-a-second-audience.md. Supports: one.
[^42]: Verifiable: ROADMAP.md:74; packages/create-cairn-site/README.md:9-13 (`npm create`, Node 24); docs/why-cairn.md:77. Supports: one.
[^43]: Verifiable: CLAUDE.md "What cairn is".
[^44]: Verifiable: docs/why-cairn.md.
[^45]: Verifiable: package.json, a `bugs` field and no support field; docs/why-cairn.md.
[^46]: Opinion: a judgment, not a checkable fact.
[^47]: Verifiable: docs/why-cairn.md, docs/extend/migration-notes.md. Supports: 1.0,, two.
[^48]: Verifiable: docs/extend/add-a-custom-admin-screen.md, docs/extend/what-the-scaffold-wrote.md. Supports: one, 5.
[^49]: Opinion: a judgment, not a checkable fact.
[^50]: Opinion: a judgment, not a checkable fact.
[^51]: Verifiable: npm registry API, read 2026-09-04; docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 3. Supports: 2026, 08, 23, 134,619,, 70,261,, 3,059.
[^52]: Verifiable: https://keystatic.com/docs/github-mode; https://keystatic.com/docs/cloud, "without needing a GitHub account"; https://decapcms.org/docs/backends-overview/, all fetched 2026-09-04.
[^53]: Verifiable: docs/extend/architecture.md; docs/extend/add-a-custom-admin-screen.md; `check:surface`; skills/cairn-admin-screens/.
[^54]: Opinion: a judgment, not a checkable fact.
[^55]: Verifiable: docs/reference/cairn-audit.md; opinion on the reading. Supports: 28.
[^56]: Opinion: a judgment, not a checkable fact.
[^57]: Opinion: a judgment, not a checkable fact.
[^58]: Verifiable: docs/extend/architecture.md; docs/internal/what-cairn-is-and-is-not.md. Supports: four, one.
[^59]: Verifiable: https://keystatic.com/docs/github-mode; https://decapcms.org/docs/backends-overview/, both fetched 2026-09-04.
[^60]: Opinion: a judgment, not a checkable fact.
[^61]: Verifiable: docs/why-cairn.md; docs/extend/architecture.md; docs/extend/add-a-custom-admin-screen.md; `check:surface`; skills/cairn-admin-screens/. Supports: 1.
[^62]: Opinion: a judgment, not a checkable fact.
[^63]: Supported: https://rubyonrails.org/2026/8/13/agents-on-rails-the-first-benchmark-report. Supports: 8, 21, 3, 92%, 63, 87%, six.
[^64]: Supported: https://rubyonrails.org/2026/9/2/agents-on-rails-claude-fable-5-1-and-glm-5-3-flash; harness at https://github.com/rails/lemans. Supports: 92%, 63, $75,, 83%, $3.31,, 41%.
[^65]: Supported: https://nextjs.org/evals, last run 2026-08-31; https://github.com/vercel/next-evals-oss. Supports: $0.35, $2.68.
[^66]: Verifiable: GitHub commit search, read 2026-09-04; docs/internal/record/2026-09-04-cairn-case/19-evidence-round-4-shaped-tools.md, sections 1.4 and 2.1; a trailer count is a floor for one agent, never a share. Supports: 2,525, 13,170, eight, 2026,, 104, 1,370.
[^67]: Verifiable: https://simonwillison.net/2026/Jul/5/sqlite-utils-fable/. Supports: 34, 30, $149.25.
[^68]: Verifiable: Phoenix 1.8.0 release post, 2025-08-05; docs/internal/record/2026-09-04-cairn-case/15-evidence-round-3-shape.md, A5.
[^69]: Verifiable: Charm blog, "v2", 2026-02-23; docs/internal/record/2026-09-04-cairn-case/15-evidence-round-3-shape.md, A1. Supports: 2.
[^70]: Verifiable: Django docs, `ref/contrib/admin/`; thoughtbot blog, 2015-11-03; docs/internal/record/2026-09-04-cairn-case/15-evidence-round-3-shape.md, section 5. Supports: 2005,.
[^71]: Supported: https://arxiv.org/abs/2605.06445; https://arxiv.org/abs/2502.11844, abstract. Supports: 5,, 62%.
[^72]: Verifiable: docs/extend/architecture.md.
[^73]: Verifiable: docs/extend/architecture.md, "The write path".
[^74]: Verifiable: docs/extend/architecture.md, "The write path"; docs/reference/core.md, `backend.branch`.
[^75]: Verifiable: docs/why-cairn.md.
[^76]: Verifiable: docs/extend/architecture.md.
[^77]: Verifiable: https://decapcms.org/docs/editorial-workflows/, https://tina.io/docs/tinacloud/git-co-authoring.
[^78]: Verifiable: docs/extend/what-the-scaffold-wrote.md, `src/content/`.
[^79]: Verifiable: docs/reference/core.md; docs/extend/announce-on-publish.md. Supports: 1.
[^80]: Verifiable: docs/extend/architecture.md, "The read path"; docs/extend/what-the-scaffold-wrote.md.
[^81]: Verifiable: docs/extend/rotate-the-github-app-key.md.
[^82]: Verifiable: docs/reference/log-events.md. Supports: one, 409,.
[^83]: Verifiable: docs/extend/architecture.md.
[^84]: Verifiable: same.
[^85]: Verifiable: docs/extend/what-the-scaffold-wrote.md, `cairnManifest`; opinion on the bypass.
[^86]: Verifiable: docs/extend/link-content-with-references.md.
[^87]: Verifiable: docs/extend/restrict-admin-access.md gates by route and role.
[^88]: Verifiable: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api. Supports: 5,000.
[^89]: Opinion: a judgment, not a checkable fact.
[^90]: Verifiable: docs/internal/what-cairn-is-and-is-not.md, "querying is build-time over a committed manifest".
[^91]: Verifiable: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github. Supports: 1 GB, 100.
[^92]: Verifiable: docs/extend/data-tiers.md. Supports: 2,, two.
[^93]: Supported: W3Techs CMS overview, the page's own stamp 2026-09-05, read 2026-09-04, https://w3techs.com/technologies/overview/content_management. Supports: 58.9%.
[^94]: Verifiable: docs/why-cairn.md, "Committing to git-backed content is itself a choice". Supports: one.
[^95]: Verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 3.
[^96]: Verifiable: https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/; https://sveltiacms.app/en/docs/successor-to-netlify-cms, a competitor's timeline, its share figures not cited. Supports: 2023,, six.
[^97]: Verifiable: docs/extend/architecture.md.
[^98]: Verifiable: docs/why-cairn.md, "Committing to git-backed content".
[^99]: Verifiable: docs/extend/data-tiers.md. Supports: 1,.
[^100]: Verifiable: package.json, docs/extend/migration-notes.md.
[^101]: Verifiable: https://github.com/decaporg/decap-cms/issues/1691, /issues/277.
[^102]: Opinion: a judgment, not a checkable fact.
[^103]: Verifiable: docs/reference/core.md.
[^104]: Verifiable: docs/extend/configure-rendering.md. Supports: ten.
[^105]: Verifiable: docs/extend/configure-rendering.md.
[^106]: Verifiable: same, the worked callout is site-authored.
[^107]: Verifiable: docs/internal/what-cairn-is-and-is-not.md.
[^108]: Verifiable: docs/extend/wire-the-delivery-surface.md, the raw-markdown twin route.
[^109]: Opinion: a judgment, not a checkable fact.
[^110]: Opinion: a judgment, not a checkable fact.
[^111]: Opinion: ; verifiable: docs/why-cairn.md.
[^112]: Verifiable: https://keystatic.com/docs/fields/document; https://tina.io/docs/editing/markdown, both fetched 2026-09-04.
[^113]: Opinion: a judgment, not a checkable fact.
[^114]: Verifiable: docs/extend/configure-rendering.md. Supports: two.
[^115]: Verifiable: docs/extend/link-content-with-references.md, docs/extend/add-an-island.md.
[^116]: Verifiable: docs/extend/migrate-existing-content.md.
[^117]: Verifiable: examples/showcase/wrangler.jsonc; docs/internal/record/2026-09-04-cairn-case/18-evidence-round-4-cloudflare.md, section 2. Supports: One, one.
[^118]: Uncited: checkable against the vendors' pages; opinion on the last clause. Supports: two.
[^119]: Opinion: a judgment, not a checkable fact.
[^120]: Opinion: a judgment, not a checkable fact.
[^121]: Verifiable: https://www.cloudflare.com/network/, read 2026-09-05. Supports: 348, 95%, 50 ms, one.
[^122]: Verifiable: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/.
[^123]: Verifiable: https://developers.cloudflare.com/ddos-protection/. Supports: 3, 7.
[^124]: Verifiable: https://developers.cloudflare.com/waf/. Supports: one, $20.
[^125]: Verifiable: https://developers.cloudflare.com/bots/. Supports: one.
[^126]: Verifiable: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/.
[^127]: Verifiable: https://developers.cloudflare.com/workers/observability/logs/workers-logs/; docs/reference/log-events.md. Supports: one, seven.
[^128]: Verifiable: https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/. Supports: 3,000.
[^129]: Verifiable: https://www.cloudflare.com/products/registrar/.
[^130]: Verifiable: https://developers.cloudflare.com/workers/platform/pricing/; https://developers.cloudflare.com/d1/platform/pricing/; https://developers.cloudflare.com/r2/pricing/; https://developers.cloudflare.com/email-service/platform/pricing/; opinion on the scale. Supports: $5, $20, 1,, 2,, 3,000.
[^131]: Verifiable: the same. Supports: 2, 1.
[^132]: Opinion: a judgment, not a checkable fact.
[^133]: Verifiable: docs/extend/what-the-scaffold-wrote.md, "Root"; docs/admin/is-it-working.md. Supports: two.
[^134]: Verifiable: packages/create-cairn-site/README.md, the three chapters; docs/admin/own-your-domain.md; ROADMAP.md:74. Supports: two, 1, 2.
[^135]: Verifiable: docs/admin/own-your-domain.md; docs/admin/before-you-start.md. Supports: two.
[^136]: Verifiable: https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/; https://developers.cloudflare.com/agent-setup/; https://developers.cloudflare.com/llms.txt. Supports: sixteen, one, 2,500, eight.
[^137]: Verifiable: https://developers.cloudflare.com/workers/wrangler/system-environment-variables/.
[^138]: Verifiable: CLAUDE.md:86, "Cloudflare MCP ... Prefer it over the dashboard".
[^139]: Opinion: a judgment, not a checkable fact.
[^140]: Verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 2. Supports: one.
[^141]: Verifiable: docs/internal/record/2026-09-04-cairn-case/18-evidence-round-4-cloudflare.md, section 4. Supports: three, 2025, 06, 12, 05.
[^142]: Verifiable: the three postmortems above. Supports: 026, 09, 04, 18, 4, 2025, 06, 12.
[^143]: Verifiable: https://blog.cloudflare.com/tag/outage/, read 2026-09-05; https://blog.cloudflare.com/fail-small-resilience-plan/ for the plan's commitments. Supports: 2026, 05, 01.
[^144]: Verifiable: https://www.cloudflarestatus.com/api/v2/incidents.json, a rolling window. Supports: 2026, 09, 05, 33, 08, 21,, twelve.
[^145]: Verifiable: https://www.cloudflare.com/business-sla/; https://www.cloudflare.com/terms/. Supports: $5, 100%.
[^146]: Verifiable: the 2025-11-18 postmortem; opinion on the comparison. Supports: two.
[^147]: Supported: W3Techs, https://w3techs.com/technologies/overview/proxy and /dns_server, 2026-09-05. Supports: 25.1%, 84.6%, 18.1%, 3.
[^148]: Verifiable: https://blog.cloudflare.com/radar-2025-year-in-review/; https://www.cloudflare.com/press-releases/2026/cloudflare-announces-second-quarter-2026-financial-results/. Supports: 81, $696.1, 2026.
[^149]: Opinion: a judgment, not a checkable fact.
[^150]: Verifiable: https://developers.cloudflare.com/email-service/, "Beta", 2026-06-09; https://developers.cloudflare.com/email-service/platform/pricing/; src/lib/email.ts:79-101, which parses `E_SENDER_NOT_VERIFIED` because one consumer met it in production, recorded at docs/internal/record/2026-08-11-t4b-email-spike.md.
[^151]: Verifiable: docs/admin/own-your-domain.md:115; docs/internal/record/2026-08-11-t4b-email-spike.md.
[^152]: Verifiable: the pricing and limits pages, by absence.
[^153]: Verifiable: https://developers.cloudflare.com/d1/platform/limits/. Supports: 1, one, 10 GB.
[^154]: Opinion: a judgment, not a checkable fact.
[^155]: Verifiable: https://developers.cloudflare.com/r2/reference/durability/. Supports: 2, eleven.
[^156]: Verifiable: https://developers.cloudflare.com/d1/platform/limits/. Supports: 1, 30, 7.
[^157]: Verifiable: `grep -rniE "backup|restore|d1 export" docs/admin docs/extend docs/reference`, no procedure on any hit.
[^158]: Verifiable: docs/extend/what-the-scaffold-wrote.md, `healthz/`; by absence elsewhere.
[^159]: Verifiable: https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/.
[^160]: Opinion: a judgment, not a checkable fact.
[^161]: Verifiable: one production site's CLAUDE.md:255 and wrangler.toml:4; cairn-cms CLAUDE.md, "Cloudflare MCP" and "Credentials"; internal. Supports: 4, one.
[^162]: Verifiable: https://developers.cloudflare.com/fundamentals/manage-members/; opinion on the practice. Supports: one.
[^163]: Opinion: a judgment, not a checkable fact.
[^164]: Verifiable: docs/internal/what-cairn-is-and-is-not.md, "SvelteKit + Cloudflare, fully"; examples/showcase/wrangler.jsonc. Supports: 1,, 2,.
[^165]: Verifiable: docs/extend/what-the-scaffold-wrote.md.
[^166]: Verifiable: examples/showcase/src/routes/admin/signups/+page.server.ts; docs/extend/architecture.md. Supports: 1.
[^167]: Opinion: a judgment, not a checkable fact.
[^168]: Opinion: a judgment, not a checkable fact.
[^169]: Verifiable: CLAUDE.md, "What cairn is"; docs/internal/admin-design-system.md.
[^170]: Verifiable: docs/reference/admin-toolkit.md:22-26; skills/cairn-admin-screens/SKILL.md:3,10,90-97.
[^171]: Verifiable: docs/internal/what-cairn-is-and-is-not.md; docs/extend/configure-rendering.md.
[^172]: Verifiable: examples/showcase/src/theme/theme.css:9-11,69; docs/extend/design-your-site.md; docs/extend/build-a-site-by-hand.md.
[^173]: Verifiable: docs/extend/what-the-scaffold-wrote.md; docs/admin/before-you-start.md, "What you end up owning".
[^174]: Verifiable: https://developers.cloudflare.com/d1/best-practices/import-export-data/. Supports: 1, one.
[^175]: Verifiable: https://developers.cloudflare.com/r2/api/s3/api/; docs/internal/record/2026-09-04-cairn-case/18-evidence-round-4-cloudflare.md, section 3. Supports: 2, 3.
[^176]: Verifiable: package.json "license". Supports: 2, 3.
[^177]: Verifiable: the Email Sending limits page, by absence; docs/extend/announce-on-publish.md.
[^178]: Opinion: a judgment, not a checkable fact.
[^179]: Verifiable: docs/extend/configure-rendering.md; docs/extend/add-an-island.md.
[^180]: Opinion: a judgment, not a checkable fact.
[^181]: Verifiable: docs/extend/configure-rendering.md, the `tone` attribute on the worked callout.
[^182]: Verifiable: https://developer.wordpress.org/block-editor/getting-started/fundamentals/markup-representation-block/.
[^183]: Verifiable: wordpress.org support forums, InstaWP guide, read 2026-09-04.
[^184]: Opinion: a judgment, not a checkable fact.
[^185]: Opinion: a judgment, not a checkable fact.
[^186]: Opinion: a judgment, not a checkable fact.
[^187]: Verifiable: docs/extend/configure-rendering.md.
[^188]: Opinion: a judgment, not a checkable fact.
[^189]: Supported: W3Techs Elementor page, the page's own stamp 2026-09-05, read 2026-09-04. Supports: 12.8%, 3, 31%.
[^190]: Supported: https://wordpress.org/news/2024/02/2023-annual-survey-results-and-next-steps/. Supports: 2023, 3,922, 45.1%, 28.6%, 60%.
[^191]: Opinion: a judgment, not a checkable fact.
[^192]: Verifiable: https://wordpress.org/plugins/classic-editor/; opinion on inference. Supports: 8, 2026, 09, 04, 2018,.
[^193]: Verifiable: https://wordpress.org/plugins/gutenberg/, the plugin's own description.
[^194]: Verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 4.
[^195]: Opinion: a judgment, not a checkable fact.
[^196]: Verifiable: docs/extend/configure-rendering.md.
[^197]: Opinion: a judgment, not a checkable fact.
[^198]: Verifiable: docs/extend/architecture.md, one `render` for preview and public pages. Supports: one.
[^199]: Opinion: a judgment, not a checkable fact.
[^200]: Verifiable: `wc -l` over `src/lib/*/` on `main`, 2026-09-04. Supports: 10,710, 24,595, 825, 2,267, 28, 10,139, 1,697.
[^201]: Verifiable: scripts/checks/, `check:surface`. Supports: 33.
[^202]: Verifiable: `find src/tests -name '*.test.ts'`; `npm test` on `main`. Supports: 446.
[^203]: Verifiable: package.json `exports`. Supports: 18.
[^204]: Verifiable: aksailingclub-org src/member-auth/, src/routes/(site)/api/stripe/, src/routes/admin/club/documents/.
[^205]: Supported: "SWE-bench Goes Live!", https://arxiv.org/abs/2505.23419, section 4.4. Supports: 1,319, 93, 2025, five, 48%, three, 100, 10%.
[^206]: Verifiable: the same.
[^207]: Supported: Dente, Satriani, Papotti, https://arxiv.org/abs/2605.06445, Table 4; no Anthropic model in the set. Supports: 80, 20, eight, 49%, 51%, 25%, 24%.
[^208]: Supported: the same, RQ1. Supports: 30.
[^209]: Supported: Vero et al., https://arxiv.org/abs/2502.11844, abstract. Supports: 392, 14, 62%.
[^210]: Opinion: a judgment, not a checkable fact.
[^211]: Supported: Constraint Decay; BaxBench attributes the effect to language popularity and framework complexity.
[^212]: Verifiable: templates/waymark/; skills/cairn-admin-screens/SKILL.md, "Screen anatomy" and "Component contracts"; src/lib/admin-toolkit/; docs/extend/add-a-custom-admin-screen.md; scripts/checks/; src/lib/audit/.
[^213]: Opinion: a judgment, not a checkable fact.
[^214]: Opinion: a judgment, not a checkable fact.
[^215]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-review.md, NON-BLOCKING.
[^216]: Supported: SecureVibeBench, https://arxiv.org/abs/2509.22097, C/C++ memory safety; CodeRabbit, https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report, n=470, a review-tool vendor; Veracode 2025, https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/, a security vendor. Supports: 25, 23.8%, 2.74, 470, 45%, 80, 100.
[^217]: Supported: MITRE CVE record, published 2025-05-30; docs/internal/record/2026-09-04-cairn-case/19-evidence-round-4-shaped-tools.md, 4.1. Supports: 2025, 48757,, 9.3,.
[^218]: Supported: Wiz Research, https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys, 2026-01-31. Supports: Eight, 1.5, 35,000.
[^219]: Supported: Deng, Fan, Meng, https://arxiv.org/abs/2606.23130. Supports: 200, 180.
[^220]: Verifiable: src/lib/auth/, src/lib/sveltekit/; opinion on the bearing. Supports: 200, 180.
[^221]: Opinion: a judgment, not a checkable fact.
[^222]: Verifiable: docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, Priority 1. Supports: Ten.
[^223]: Supported: METR, July 2025, https://arxiv.org/abs/2507.09089. Supports: 16, 246, 19%, 20%.
[^224]: Supported: https://metr.org/blog/2026-02-24-uplift-update/. Supports: 2026, 57, 800, 18%, 4%, 9%, 30%, 50%.
[^225]: Opinion: a judgment, not a checkable fact.
[^226]: Supported: Borg et al., https://arxiv.org/abs/2507.00788. Supports: two, 151.
[^227]: Supported: Quispe and Xu, https://arxiv.org/abs/2605.25438v1; v2 revises the panel to 5,346 developers and the effect to about 35 commits; the authors call the estimates associations. Supports: 7,786,771, 185,517, 5,838, 41.
[^228]: Supported: https://www.anthropic.com/research/claude-code-expertise, 2026-06-16; classifier-labeled. Supports: 400,000, 235,000, 70%, 20%, 28%, 33%.
[^229]: Verifiable: docs/internal/record/2026-09-04-cairn-case/17-evidence-round-4-telemetry.md, section 1.
[^230]: Supported: Murphy-Hill, Butler, Savelieva, https://arxiv.org/abs/2607.01418. Supports: 24.0%.
[^231]: Supported: Liu et al., https://arxiv.org/abs/2603.28592. Supports: 302,600, 6,299, 15%, 1.95, 22.7%.
[^232]: Supported: Li, Zhang, Hassan, https://arxiv.org/abs/2507.15003, 456,535 agent PRs; the 932,791 figure is the 2026 dataset paper, https://arxiv.org/abs/2602.09185. Supports: 15, 40.
[^233]: Supported: Bai et al., https://arxiv.org/abs/2604.22750. Supports: 30.
[^234]: Supported: Lulla et al., https://arxiv.org/abs/2601.20404. Supports: 28.64%, 16.58%.
[^235]: Supported: the studies above; Stack Overflow 2025 via docs/internal/record/2026-09-04-cairn-case/17-evidence-round-4-telemetry.md, section 2; docs/internal/record/2026-09-04-cairn-case/17-evidence-round-4-telemetry.md, "The narrowest sentence". Supports: 14.1%, 2025, 52%.
[^236]: Supported: Li et al.; GitHub Octoverse 2025; verifiable: docs/internal/record/2026-09-04-cairn-case/17-evidence-round-4-telemetry.md, section 4.
[^237]: Verifiable: skills/cairn-admin-screens/, package.json `files`. Supports: One, 114, 28, six, 212, 206, 1,255.
[^238]: Verifiable: src/lib/doctor/check-skill.ts:15. Supports: 4, 28, six, 212, 206, 1,255.
[^239]: Verifiable: src/lib/doctor/check-skill.ts:38,123. Supports: 28, six, 212, 206, 1,255.
[^240]: Verifiable: packages/create-cairn-site/, ROADMAP.md:74. Supports: one, 2026, 09, 04,.
[^241]: Verifiable: https://developers.cloudflare.com/agent-setup/claude-code/, https://github.com/github/github-mcp-server. Supports: sixteen.
[^242]: Opinion: a judgment, not a checkable fact.
[^243]: Verifiable: `git rev-parse --short HEAD`. Supports: one, 836, 324, 2026, 08, 30.
[^244]: Verifiable: `grep "from '\$admin-club" src/routes/admin/club/{members,assets,asset-requests}`. Supports: three, sixteen.
[^245]: Verifiable: `git log --since='2026-07-06 00:00' --until='2026-07-08 00:00'`; date-only bounds take the current time of day, so the explicit times are part of the command. Supports: 48, 2026, 07, 06, 00, 08, 8.
[^246]: Verifiable: `git log --format=%an | sort | uniq -c` (799 `glw907`, 29 `github-actions[bot. Supports: 799, 838.
[^247]: Opinion: a judgment, not a checkable fact.
[^248]: Verifiable: aksailingclub-org `git show cc4edd3`, `a6a5f2b`, `8d7154c`. Supports: 704, 1,203, 326, sixteen, 3,879, three, 2026, 07.
[^249]: Verifiable: `99088c2`, `64a1939`, `a6d3c05`, `1046660`, `136b926`, `b918044`, `78b4a3a`, `479b2a3`. Supports: 2026, 07, 0.82.0.
[^250]: Verifiable: `81634ca`; `8db6646` deletes the demo members. Supports: 2026, 07, 14,, 395, 345.
[^251]: Verifiable: aksailingclub-org docs/status-archive.md:1924,1931,1941; docs/plans/2026-07-07-pass-2-1-harvest.md:4. Supports: 2.1, 2026, 07, nine, ten, three.
[^252]: Verifiable: `grep -ri hours docs/` returns fourteen lines, none an hours-of-work figure; the nearest is "Geoff sleeping ~9h" at docs/status-archive.md:1941.
[^253]: Verifiable: `git show --numstat <hash> -- <routes>` for each; opinion on the class. Supports: 42, three, 2026, 07, 08,.
[^254]: Opinion: a judgment, not a checkable fact.
[^255]: Verifiable: cairn-cms src/lib/admin-toolkit/*.svelte:2-4, *.ts:1; ToolbarDisclosure.svelte:3; index.ts:8-11.
[^256]: Verifiable: `git tag`; CHANGELOG.md:3495; docs/HISTORY.md:351-356,561. Supports: 0.89.0, 2026, 07, 21, 0.90.0, 23, six, 08.
[^257]: Verifiable: aksailingclub-org docs/2026-07-20-members-pass-harvest-findings.md:8,36-40; docs/2026-07-30-assets-substrate-harvest-findings.md:29,71,101. Supports: 2026, 07, 20, 30.
[^258]: Verifiable: aksailingclub-org docs/status-archive.md:160,557-558,624-625. Supports: 3.4, one, 1.9, 3.23, 26, three.
[^259]: Verifiable: the table; cairn-cms src/lib/admin-toolkit/. Supports: 42, 20.
[^260]: Opinion: a judgment, not a checkable fact.
[^261]: Verifiable: aksailingclub-org docs/STATUS.md:17-28. Supports: 40.
[^262]: Opinion: a judgment, not a checkable fact.
[^263]: Verifiable: aksailingclub-org src/member-auth/lib/auth.ts:6-14,279. Supports: 914.
[^264]: Verifiable: the case-report table's commands; `81634ca`; docs/status-archive.md:1941. Supports: two.
[^265]: Verifiable: the case-report table's commands; docs/STATUS.md:17-28. Supports: 42, eight, 81, six.
[^266]: Verifiable: aksailingclub-org docs/HISTORY.md:102,151,198-199. Supports: 1.4, 2.3.
[^267]: Opinion: a judgment, not a checkable fact.
[^268]: Verifiable: the case-report table's commands; opinion on "further along".
[^269]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-spec.md. Supports: one.
[^270]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-measurement.md; docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-commit-stat.txt. Supports: 34 min 51 s, 198,039, 113, one, 27, 9, 1, 5.
[^271]: Verifiable: the measurement, the implementer's report.
[^272]: Verifiable: the same.
[^273]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-review.md, BLOCKING and NON-BLOCKING. Supports: five.
[^274]: Verifiable: the same, SUMMARY. Supports: 35 min.
[^275]: Opinion: a judgment, not a checkable fact.
[^276]: Opinion: a judgment, not a checkable fact.
[^277]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-review.md, NON-BLOCKING; examples/showcase/src/routes/admin/signups/+page.server.ts; docs/extend/add-a-custom-admin-screen.md, "Gate it". Supports: one.
[^278]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/inference-traps-to-fix.md. Supports: six.
[^279]: Verifiable: the same, the rulings paragraph.
[^280]: Verifiable: docs/internal/record/2026-09-04-cairn-case/14-evidence-round-3-cost-speed.md, sections 2 and 3. Supports: one.
[^281]: Verifiable: docs/internal/record/2026-09-04-cairn-case/14-evidence-round-3-cost-speed.md, section 2. Supports: 10%, three, 61.8%, 21, 40.
[^282]: Verifiable: docs/internal/record/2026-09-04-cairn-case/14-evidence-round-3-cost-speed.md, "Where searches found nothing".
[^283]: Opinion: a judgment, not a checkable fact.
[^284]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-review.md. Supports: five.
[^285]: Verifiable: the case-report table. Supports: two, eight.
[^286]: Verifiable: one production site's docs/HISTORY.md:9-12; internal. Supports: two, eight, 2026, 08, 25, eleven.
[^287]: Verifiable: the measurement and review above. Supports: two, eight, 2026, 08, 25, eleven, 35 min.
[^288]: Verifiable: one production site's docs/HISTORY.md:102,151,198-199; internal. Supports: 1.4, 2.3.
[^289]: Opinion: a judgment, not a checkable fact.
[^290]: Opinion: a judgment, not a checkable fact.
[^291]: Verifiable: aksailingclub-org docs/2026-07-15-mw-cutover-runbook.md, CLAUDE.md "Member-data imports". Supports: two.
[^292]: Verifiable: aksailingclub-org src/routes/admin/club/, `wc -l`.
[^293]: Verifiable: aksailingclub-org src/, the table beneath. Supports: 3,120, 1,203, 326, 1,501, 559, 381.
[^294]: Opinion: a judgment, not a checkable fact.
[^295]: Verifiable: a parse of each `import {...} from '@glw907/cairn-cms/admin-toolkit'` statement over those two directories, `.test.ts` excluded; src/routes/admin/+layout.svelte:8-22. Supports: 907, four, 16,, 12,, 11,, 9,, 8,, 7,.
[^296]: Verifiable: aksailingclub-org src/hooks.server.ts:18,54. Supports: 1.
[^297]: Verifiable: aksailingclub-org src/member-auth/lib/auth.ts:6-14,279, migrations/asc-auth/.
[^298]: Verifiable: docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, 1E. Supports: 2026, 09, 04.
[^299]: Verifiable: `grep "from '@glw907/cairn-cms"` per directory under aksailingclub-org src/routes/admin/club/. Supports: Ten, eleven, two, four.
[^300]: Verifiable: examples/showcase/src/routes/admin/signups/. Supports: Ten, eleven, two, four, 90,, 9.
[^301]: Verifiable: aksailingclub-org src/admin-club/. Supports: 738, 1,, 1, 1,203, 1,501, 3,, 2, 1,704.
[^302]: Verifiable: the table. Supports: 90, 3,100.
[^303]: Verifiable: `wc -l` over cairn-cms src/lib/*/ on `main`; the production site's imports.
[^304]: Verifiable: `wc -l` over `src/lib`. Supports: 28, 10,139, 2,655, 33, 40, 446, one, One.
[^305]: Verifiable: `wc -l` over those paths. Supports: One, 68,644, 35,888, 176, 8,930, 12,415, 4,997, 5,655.
[^306]: Verifiable: `find`; `npm test` on `main`. Supports: One, 68,644, 35,888, 176, 8,930, 12,415, 4,997, 5,655.
[^307]: Verifiable: `find`, `wc -l`. Supports: 68,644, 35,888, 176, 8,930, 12,415, 4,997, 5,655, 914.
[^308]: Verifiable: scripts/checks/. Supports: 35,888, 176, 8,930, 12,415, 4,997, 5,655, 914, 610.
[^309]: Verifiable: aksailingclub-org CLAUDE.md. Supports: 12,415, 4,997, 5,655, 914, 610, 814, 1,553, 446.
[^310]: Verifiable: package.json `exports`. Supports: 5,655, 914, 610, 814, 1,553, 446, 172, 32,420.
[^311]: Verifiable: `grep` over `src/`. Supports: 172, 32,420, 33, 2, 18, 11, 57, 44,.
[^312]: Verifiable: package.json `files`, docs/extend/what-the-scaffold-wrote.md. Supports: 2, 18, 11, 57, 44,, 27,, 22,, 18,.
[^313]: Verifiable: `find`, `wc -l`. Supports: 18, 11, 57, 44,, 27,, 22,, 18,, 11,.
[^314]: Verifiable: CHANGELOG.md, `git tag`, `git log`. Supports: 11,, 9,, 6,, 4,, 2,, 1, 3, 125.
[^315]: Verifiable: aksailingclub-org docs/HISTORY.md. Supports: 3, 125, 2,844, 2,997, 87, 0.22.0, 0.96.0, 73.
[^316]: Verifiable: `grep "from '@glw907/cairn-cms"` over the membership directories. Supports: 838, 2026, 07, 06, 08, 30,, 1.
[^317]: Verifiable: aksailingclub-org docs/HISTORY.md, lines 9 to 12 and 117. Supports: 2026, 08, 25, eleven.
[^318]: Verifiable: examples/showcase/src/routes/admin/signups/, examples/showcase/migrations-app/0000_signups.sql. Supports: 90, two, 9.
[^319]: Verifiable: aksailingclub-org src/tests/ file names. Supports: 35,888, 68,644, four.
[^320]: Opinion: a judgment, not a checkable fact.
[^321]: Verifiable: the import list above. Supports: 1, 11.
[^322]: Opinion: a judgment, not a checkable fact.
[^323]: Verifiable: aksailingclub-org docs/HISTORY.md:102,151,198-200. Supports: 2.1, 1.5, 2.2, 3.5, 2, 1.35, six.
[^324]: Verifiable: aksailingclub-org docs/HISTORY.md:153.
[^325]: Opinion: a judgment, not a checkable fact.
[^326]: Verifiable: docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, "Where searches found nothing". Supports: one, 2.
[^327]: Verifiable: this section's tables. Supports: one.
[^328]: Opinion: a judgment, not a checkable fact.
[^329]: Opinion: a judgment, not a checkable fact.
[^330]: Uncited: . Supports: twenty, four, ten.
[^331]: Uncited: . Supports: twenty, four, ten.
[^332]: Opinion: a judgment, not a checkable fact.
[^333]: Verifiable: that path. Supports: twenty, one, 2026, 08, 11, 4.
[^334]: Opinion: a judgment, not a checkable fact.
[^335]: Opinion: a judgment, not a checkable fact.
[^336]: Opinion: a judgment, not a checkable fact.
[^337]: Opinion: a judgment, not a checkable fact.
[^338]: Opinion: a judgment, not a checkable fact.
[^339]: Verifiable: docs/internal/record/2026-09-04-cairn-case/14-evidence-round-3-cost-speed.md; docs/internal/record/2026-09-04-cairn-case/15-evidence-round-3-shape.md; docs/internal/record/2026-09-04-cairn-case/17-evidence-round-4-telemetry.md; docs/internal/record/2026-09-04-cairn-case/19-evidence-round-4-shaped-tools.md; docs/internal/record/2026-09-04-cairn-case/16-measured-build/. Supports: two, one.
[^340]: Verifiable: the "found nothing" sections of those records. Supports: four.
[^341]: Verifiable: docs/internal/record/2026-09-04-cairn-case/06-round-3-review.md, the five vocabulary maps.
[^342]: Verifiable: restates the preceding sentence's note.
[^343]: Opinion: a judgment, not a checkable fact.
[^344]: Verifiable: restates the preceding sentence's note.
[^345]: Opinion: a judgment, not a checkable fact.
[^346]: Opinion: a judgment, not a checkable fact.
[^347]: Opinion: a judgment, not a checkable fact.
[^348]: Verifiable: restates the preceding sentence's note.
[^349]: Verifiable: restates the preceding sentence's note.
[^350]: Opinion: a judgment, not a checkable fact.
[^351]: Verifiable: restates the preceding sentence's note.
[^352]: Verifiable: restates the preceding sentence's note.
[^353]: Opinion: a judgment, not a checkable fact.
[^354]: Opinion: a judgment, not a checkable fact.
[^355]: Verifiable: restates the preceding sentence's note.
[^356]: Opinion: a judgment, not a checkable fact.
[^357]: Verifiable: restates the preceding sentence's note.
[^358]: Verifiable: restates the preceding sentence's note.
[^359]: Opinion: a judgment, not a checkable fact.
[^360]: Verifiable: restates the preceding sentence's note.
[^361]: Verifiable: restates the preceding sentence's note.
[^362]: Verifiable: restates the preceding sentence's note.
[^363]: Opinion: a judgment, not a checkable fact.
[^364]: Verifiable: restates the preceding sentence's note.
[^365]: Verifiable: restates the preceding sentence's note.
[^366]: Verifiable: restates the preceding sentence's note.
[^367]: Verifiable: restates the preceding sentence's note.
[^368]: Verifiable: docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-measurement.md (gates) and experiment-review.md (verdict escalate).
[^369]: Verifiable: restates the preceding sentence's note.
[^370]: Verifiable: restates the preceding sentence's note.
[^371]: Verifiable: restates the author disclosure in the case report (799 of 838 commits).
[^372]: Opinion: a judgment, not a checkable fact.
[^373]: Opinion: a judgment, not a checkable fact.
[^374]: Opinion: a judgment, not a checkable fact.
[^375]: Opinion: a judgment, not a checkable fact.
[^376]: Opinion: a judgment, not a checkable fact.
[^377]: Verifiable: restates the preceding sentence's note.
[^378]: Opinion: a judgment, not a checkable fact.
[^379]: Opinion: a judgment, not a checkable fact.
[^380]: Opinion: a judgment, not a checkable fact.
[^381]: Opinion: a judgment, not a checkable fact.
[^382]: Verifiable: restates the preceding sentence's note.
[^383]: Opinion: a judgment, not a checkable fact.
[^384]: Verifiable: restates the preceding sentence's note.
[^385]: Verifiable: restates the preceding sentence's note.
[^386]: Verifiable: restates the preceding sentence's note.
[^387]: Opinion: a judgment, not a checkable fact.
[^388]: Opinion: a judgment, not a checkable fact.
[^389]: Verifiable: restates the preceding sentence's note.
[^390]: Verifiable: restates the preceding sentence's note.
