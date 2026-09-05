# The cairn case

Record, 2026-09-04. The durable form of the front-door argument. The front-door concept figure
and `docs/why-cairn.md` derive from this document; neither restates it.

## Preface

This document argues why a small organization might run its website and its own tools on cairn,
for a reader who has to make that choice and can check the reasoning. The reader is a developer or
a technically fluent lead choosing how a club, a nonprofit, or a small business with non-technical
editors runs its site. It is built to survive an intelligent attack and to be graded on logic and
evidence. The figure's form is decided later, from this text, and the last section records that
open question.

Four rules govern it. Nothing here is a pitch; the document has no stake in whether the reader
adopts cairn, and it grades neither side [verifiable: docs/internal/docs-register.md]. The
traditional setup is a steel man, described in the same voice as cairn, with its advantages
stated as facts. cairn's drawbacks carry the same weight as its advantages, each with a factual
counterweight where one exists and a plain concession where none does. Every factual sentence
ends in a tag: `[verifiable: <path or URL>]` for a fact checkable against the tree or a primary
document, `[supported: <citation>]` for a claim backed by a study or report with a stated sample,
or `[opinion]` for a judgment. A sentence that could earn no tag was cut. Evidence dates matter,
because counts and ratings move; the evidence file records the read date of each number
[verifiable: scratchpad evidence.md, research date 2026-09-04].

Inputs: the ratified argument brief, its round-1 adversarial review (verdict RETHINK, twelve
ranked changes), the evidence file, the scope charter, the docs register, `why-cairn.md`, and
the extend track. Where this document departs from the review, it says so and says why.

## The traditional setup, as a competent team builds it

The shape is a hosted CMS with a theme and plugin ecosystem, beside a membership product that
carries the member database, dues, event registration, bulk email to members, and a member portal
in its own interface, with a payments provider, a registrar, and organizational mail as separate
accounts [opinion]. Good teams build this well, and the shape varies: some membership products
embed into the CMS site on its own domain, and some bundle the website builder and the portal
into one product with one member login [opinion]. Any drawing of "two systems, two logins" is
true of some vendors and false of others, so this document describes the shape's capabilities and
never a vendor [opinion].

Its advantages, stated as facts. The membership product supplies event registration with payment,
recurring dues with renewals and reminders, invoices and receipts, a member directory, bulk email
with subscription state and unsubscribe handling, and a member export, as configuration rather
than code [opinion]. The CMS supplies a visual editor a volunteer already knows, a theme and
plugin market, and a labor market of people who can be hired to work on it [opinion]. Each part
can be replaced independently, and each vendor carries a support contract [opinion]. The payments
provider arrives already integrated with dues and renewals [opinion].

Its costs, stated as facts. The same people use two interfaces and two logins where the two
products are separate, and the member record lives in the vendor's store [opinion]. The
integration between site and membership product is maintained by the organization [opinion]. A
plugin ecosystem is an update and security treadmill: Patchstack's disclosure data for 2024 counts
7,966 new vulnerabilities in the WordPress ecosystem, 96% of them in plugins, and 33% unpatched at
public disclosure [supported: Patchstack, State of WordPress Security in 2025, data updated
2025-03-14, https://patchstack.com/whitepaper/state-of-wordpress-security-in-2025/]. Patchstack
sells a competing security product, so those are disclosure counts, never an endorsement
[verifiable: same]. The cairn shape has its own treadmill, which the next sections state
[opinion].

## Leg 1: cairn is both a working CMS and an extensible admin tool

**Claim.** A cairn site is one SvelteKit app that contains the public site and an editor admin at
`/admin`, and the same admin is where a developer mounts the organization's own screens through
documented seams [verifiable: docs/extend/architecture.md].

**Reasoning and evidence.** Left at the scaffold's defaults, the adapter yields an owner/editor
CMS: editors sign in from an emailed link, write markdown with a live preview rendered by the same
function the public site uses, and publish [verifiable: docs/extend/architecture.md,
docs/why-cairn.md]. A site's own route under `src/routes/admin/` renders inside the shared shell
automatically, is gated by the same access map, audits through the same sink, and composes from
`@glw907/cairn-cms/admin-toolkit` primitives (`OfficeList`, `AdminTable`, `ListToolbar`,
`Pagination`, `StatusChip`, `EmptyState`, `FieldLabel`) [verifiable:
docs/extend/add-a-custom-admin-screen.md]. The scaffold ships one worked custom screen,
`admin/signups`, reading its own `APP_DB` binding [verifiable:
docs/extend/what-the-scaffold-wrote.md]. The seams form a versioned public surface held by a
snapshot gate, so a site's screens survive ordinary engine updates [verifiable:
docs/internal/what-cairn-is-and-is-not.md, `check:surface`].

**What the admin is for, stated exactly.** A staff-shaped audience (an instructor, a volunteer
coordinator) uses the editors' magic-link sign-in with a `none`-capability role and its own
`home`, and stays a row in `AUTH_DB` [verifiable: docs/extend/add-a-second-audience.md]. Members
are a different case. A member population gets `createAuthChannel`, a wholly separate login with
its own D1 store, its own session, and its own area outside `/admin`; nothing about it plugs into
the admin shell [verifiable: docs/extend/add-a-second-audience.md]. The engine's own example
site binds `MEMBER_DB` as a third database beside `AUTH_DB` and `APP_DB` [verifiable:
examples/showcase/wrangler.jsonc]. Member management, dues, events, and announcements are the
site's own code; cairn ships none of them, on purpose [verifiable: docs/why-cairn.md, "The honest
trade-offs"]. The engine never models a domain actor; it knows only owner and editor [verifiable:
docs/internal/what-cairn-is-and-is-not.md].

**Counter-evidence a skeptic cites.** Everything the membership product supplies as configuration
is, on cairn, code the site writes, tests, secures, and keeps running, and dues automation alone
is money-touching work with failure paths [opinion]. The brief's earlier phrasing "one login and
one interface for editors and members" was the sentence the register already killed, and it is
false for members [verifiable: docs/internal/docs-register.md, Killed list;
docs/extend/add-a-second-audience.md]. Conceded, and corrected above.

**Drawbacks.** A developer stays in the loop for anything past writing and publishing, and an
organization without that person should weigh that before starting [verifiable:
docs/why-cairn.md]. A bespoke SvelteKit app on Workers has a small labor market when that
developer leaves [opinion]. cairn is pre-1.0, and a seam has already moved across two minor
releases inside the tier meant to stay frozen [verifiable: docs/why-cairn.md,
docs/extend/migration-notes.md].

**Counterweight.** The custom code starts from a scaffold with a worked screen, a toolkit of
primitives that ship pre-compiled in cairn's own stylesheet, a documented seam per extension
point, and one agent skill (Leg 5) [verifiable: docs/extend/add-a-custom-admin-screen.md,
docs/extend/what-the-scaffold-wrote.md]. Everything past that is the developer's, and the
document does not claim otherwise [opinion].

## Leg 2: content is markdown files in the site's git repository

**Claim.** Content bodies are markdown files in the site's own GitHub repository, so history,
attribution, and rollback come from git, and there is no content server to run [verifiable:
docs/extend/architecture.md].

**Reasoning and evidence.** An editor's save commits to a per-entry holding branch,
`cairn/<concept>/<id>`, with the editor as commit author and `cairn-cms[bot]` as committer; a
deliberate publish copies it onto the adapter's configured default branch, and the site's existing
deploy carries it live [verifiable: docs/extend/architecture.md, "The write path";
docs/reference/core.md, `backend.branch`]. Editors never see git [verifiable: docs/why-cairn.md].
The pattern is the category's, not cairn's alone: Decap commits an editor's draft to a
`cms/collectionName/entrySlug` branch and opens a pull request, and TinaCMS documents an app
identity committing on the editor's behalf [verifiable:
https://decapcms.org/docs/editorial-workflows/, https://tina.io/docs/tinacloud/git-co-authoring].
The bodies are plain text a human can read and a tool can parse, and no export step stands
between the organization and its content [verifiable: docs/extend/what-the-scaffold-wrote.md,
`src/content/`].

**Corrections the round-1 review forced, accepted.** Drafts are a holding branch and also a
`status` field defaulting to `draft`, carried in the committed manifest [verifiable:
docs/reference/core.md; docs/extend/announce-on-publish.md]. The committed manifest
(`src/content/.cairn/index.json`) is a projection of every entry's identity, routing, draft
state, and edges, rebuilt at build and patched in the same commit as a save; it is an index with
a maintenance contract [verifiable: docs/extend/architecture.md, "The read path";
docs/extend/what-the-scaffold-wrote.md]. Write access to content is the GitHub App's private key,
a credential with a rotation procedure, so the attack surface moved from a database to a key
[verifiable: docs/extend/rotate-the-github-app-key.md]. A concurrent edit to one entry is
detected and refused: the engine logs `commit.failed` with `reason: conflict` on a 409, and the
second editor loses that attempt [verifiable: docs/reference/log-events.md]. A publish from
`/admin` lands on the default branch with no review gate; content is reviewable in git, and the
editor path does not route through a review [verifiable: docs/extend/architecture.md].

**What a database gives that files do not.** Validation enforced at the store, where cairn's
fieldset validates in the admin and a hand commit bypasses it [verifiable:
docs/extend/what-the-scaffold-wrote.md, `cairnManifest` regenerates the manifest on build].
Referential integrity in real time, where cairn checks references at build and guards deletes
[verifiable: docs/extend/link-content-with-references.md]. Transactions across entries, per-row
permissions, and multi-writer merge, none of which cairn has [verifiable:
docs/extend/restrict-admin-access.md gates by route and role]. Reads without a network hop: an
uncached body read crosses the GitHub API, which is limited to 5,000 requests an hour per App
installation [verifiable:
https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api]. Erasure:
personal data that reaches a content file is in history across every clone, and removing it
means rewriting history [opinion]. Cross-entry queries, reporting, and full-text search are the
developer's job at build or request time [verifiable: docs/internal/what-cairn-is-and-is-not.md,
"querying is build-time over a committed manifest"].

**Counter-evidence a skeptic cites.** GitHub recommends repositories under 1 GB and blocks files
above 100 MiB, so a content corpus has a ceiling a database does not [verifiable:
https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github].
Media therefore lives in R2, and content is split across two stores by design [verifiable:
docs/extend/data-tiers.md]. The category is small: WordPress holds 58.9% of sites with a known
CMS, and git-based CMS tools are not a tracked category [supported: W3Techs CMS overview, data
dated 2026-09-05, https://w3techs.com/technologies/overview/content_management]. Backup is as good
as the organization's GitHub account, one account and one place to lose access [verifiable:
docs/why-cairn.md, "Committing to git-backed content is itself a choice"]. All conceded. No named
case study of a git CMS failing at scale was found, and no survey of editor satisfaction with
markdown against rich text was found; both are gaps [verifiable: evidence.md, Claim 3].

**Counterweight.** cairn's fixed concepts are sized for an organization's site, and the manifest
exists so index pages never crawl the repository through the API [verifiable:
docs/extend/architecture.md]. The category's own tracked issues admit the concurrency cost (no
conflict resolution in the editor, no presence indication), which is the shape cairn chose too
[verifiable: https://github.com/decaporg/decap-cms/issues/1691, /issues/277].

### And why markdown

**Claim.** Markdown is plain text, so git's line-based diff, blame, and review work on content the
way they work on code, and a file is readable without cairn [opinion].

**Evidence.** Structured fields ride in frontmatter typed by the concept's fieldset [verifiable:
docs/reference/core.md]. cairn ships a component grammar, `defineComponent` with `fields.*`
attribute descriptors (exactly ten) and the hast helpers `cardShell`, `headRow`, and `iconSpan`;
an empty registry still renders plain markdown, GFM tables, `cairn:` links, and `media:`
references [verifiable: docs/extend/configure-rendering.md]. The site declares its own vocabulary
of callouts, figures, and embeds; cairn ships none [verifiable: same, the worked callout is
site-authored]. The charter calls markdown in git over a structured manifest the cleanest input a
language model can get, and warns to invest where machine consumption is evidenced rather than
hyped [verifiable: docs/internal/what-cairn-is-and-is-not.md]. The mechanism statement that
survives: a tool or a model reads the file itself, with no database export and no rendered page
between [verifiable: docs/extend/wire-the-delivery-surface.md, the raw-markdown twin route]. The
brief's superlative, "the most widely read format by agents," has no published measurement and is
dropped [opinion]. The CommonMark core is stable; cairn's directives, `cairn:` targets, and
`media:` scheme are pre-1.0 surface and are not covered by that stability [opinion; verifiable:
docs/why-cairn.md].

**Drawbacks.** Editors learn markdown syntax, with live preview and a tidy pass, where a visual
editor asks nothing [opinion]. The directive vocabulary is per site, so an editor moving between
two cairn sites meets two vocabularies [verifiable: docs/extend/configure-rendering.md].
Portability is bounded by the same directives: another markdown tool renders the prose and none
of the components, `cairn:` links, or `media:` references [verifiable:
docs/extend/link-content-with-references.md, docs/extend/add-an-island.md]. Moving existing
content in is a project [verifiable: docs/extend/migrate-existing-content.md].

## Leg 3: one platform for a small team

**Claim.** One Cloudflare account supplies hosting, the sign-in store, media storage, the
magic-link sender, TLS, DDoS protection, and optionally the deploy, where the traditional shape
assembles those from several vendors [verifiable: docs/extend/what-the-scaffold-wrote.md,
`wrangler.jsonc` bindings].

**Evidence, each with its caveat.** SvelteKit deploys to Workers with the Cloudflare adapter
[verifiable: https://developers.cloudflare.com/workers/frameworks/framework-guides/svelte/]. D1
is serverless SQL with SQLite semantics, and a site binds as many databases as it needs
(`AUTH_DB`, `APP_DB`, `MEMBER_DB` in `examples/showcase`) [verifiable:
https://developers.cloudflare.com/d1/, examples/showcase/wrangler.jsonc]. R2 stores objects
without egress fees; storage and operations are still billed [verifiable:
https://developers.cloudflare.com/r2/]. Email Sending sends from a Worker binding, up to 50
recipients per send, and is in public beta since 2026-04-16 on the Workers paid plan
[verifiable: https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/].
Workers Builds deploys on push from a connected GitHub or GitLab repository, and is an optional
later step in cairn's own setup that needs a second, wider API token; a site may deploy with
`wrangler` instead [verifiable: https://developers.cloudflare.com/workers/ci-cd/builds/,
docs/admin/own-your-domain.md]. Universal SSL issues certificates for every active domain, and
DDoS protection is unmetered on all plans [verifiable:
https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/,
https://developers.cloudflare.com/ddos-protection/]. The free-plan WAF is a subset (custom rules,
one rate-limiting rule, the free managed ruleset); attack scoring and advanced rate limiting are
paid [verifiable: https://developers.cloudflare.com/waf/]. DNS can sit at Cloudflare, which
consolidates a billing relationship and removes no component [opinion]. A cairn site costs the $5
Workers Paid plan plus a domain, about $6 a month, and whether the domain's certificate is charged
was unconfirmed as of 2026-08-11 [verifiable: docs/admin/before-you-start.md].

**Counter-evidence a skeptic cites.** On 2025-11-18 a Cloudflare configuration change took the
CDN, Workers KV, Access, and the dashboard down together for about five hours and forty-six
minutes, which is the single-point-of-failure argument in one vendor-authored document
[verifiable: Cloudflare blog postmortem, 2025-11-18]. In a survey of 114 participants, 35.1%
named over-dependence on a single provider as a core barrier to cloud adoption [supported:
Journal of Cloud Computing, vendor lock-in analysis, n=114]. No study isolates vendor count as a
variable against a small team's operational burden; the efficacy half of this leg is a hypothesis
[verifiable: evidence.md, Claim 2]. The DX "6 to 15 hours a week" tool-sprawl figure has no
located primary instrument and is not cited [verifiable: evidence.md, open question 7]. The
outage is conceded and named here rather than left for a reader to supply [opinion].

**Drawbacks.** One account is one vendor, and cairn has no abstraction layer for swapping
Cloudflare or GitHub later [verifiable: docs/why-cairn.md, "Why this stack"]. The traditional
shape's "each part replaceable" is a real asymmetry [opinion]. Announcements to members need list
management, unsubscribe handling, suppression, batching against rate limits, and a send record,
none of which the Email Sending primitive supplies and all of which the site builds; the engine's
own publish seam is a pure manifest diff that sends nothing [verifiable:
docs/extend/announce-on-publish.md]. A payments provider on cairn means webhooks, a subscription
state machine, and reconciliation code the site maintains, where the membership product ships
those integrated [opinion].

**Counterweight.** Every binding is declared in one committed `wrangler.jsonc`, and the scaffold
creates the databases and bucket in one run [verifiable: docs/extend/what-the-scaffold-wrote.md;
evidence.md, scaffold Cloudflare chapter]. The single-vendor cost is a choice the reader makes
knowingly, and this document does not weigh it for them [opinion].

## Leg 4: no page builder, as a feature and as a cost

**Claim, in its true form.** A directive in a cairn content file names a site-owned component
and a small declared attribute set; what the component looks like lives in code, changes for every
page at once, and cannot be overridden per occurrence [verifiable:
docs/extend/configure-rendering.md]. A page builder stores per-occurrence presentation in the
content [opinion]. The brief's "the file carries no layout" was false, since a directive carries a
component name and attributes, and is replaced by the sentence above [verifiable:
docs/extend/configure-rendering.md, the `tone` attribute on the worked callout].

**Evidence.** WordPress's own documentation shows block content stored in `post_content` as HTML
comment delimiters carrying JSON attributes [verifiable:
https://developer.wordpress.org/block-editor/getting-started/fundamentals/markup-representation-block/].
The lock-in claim is strongest for proprietary builder structures: deactivating a third-party
builder is widely reported to leave pages as raw output, with no official conversion path
[verifiable: wordpress.org support forums, InstaWP guide, read 2026-09-04; community-documented,
never an official disclosure]. It is weakest for core block markup, which reads as valid HTML
with ignorable comments in any tool, and is on that measure more portable than a cairn directive,
which renders as literal text outside cairn [opinion]. An editor cannot change the site's design
language or a component's styling; an editor can still pick the wrong directive or write a heading
that wraps badly [opinion]. The editor's job stays small: headings, emphasis, links, lists,
images, and the site's declared directives [verifiable: docs/extend/configure-rendering.md].

**Counter-evidence a skeptic cites.** Elementor runs 12.8% of all websites W3Techs tracks and
roughly 31% of WordPress sites, so tens of millions of owners choose builder coupling knowingly
[supported: W3Techs Elementor page, dated 2026-09-05]. In the WordPress 2023 annual survey
(n=3,922), 45.1% agreed the Site Editor meets their site-building needs and 28.6% disagreed, with
block editor use about 60% and rising [supported:
https://wordpress.org/news/2024/02/2023-annual-survey-results-and-next-steps/]. The block editor
is not a rejected product; conceded. The Classic Editor install count (8 million plus, fourth by
active installs, read 2026-09-04) is dropped from this argument: it measures transition friction
on sites that predate 2018, and a preference for Classic Editor is a preference for a different
visual editor, which argues toward a builder and away from markdown [verifiable:
https://wordpress.org/plugins/classic-editor/; opinion on inference]. The Gutenberg plugin rating
is dropped, since that listing is the beta channel and does not measure the shipped editor
[verifiable: https://wordpress.org/plugins/gutenberg/, the plugin's own description]. No survey
with a stated sample measures page-builder lock-in or migration regret [verifiable: evidence.md,
Claim 4].

**Drawbacks.** Any organization wanting one page laid out unlike every other page, a special page
for the annual event, needs a developer under cairn and needs nobody under a builder [opinion].
Complex layouts are the developer's components [verifiable: docs/extend/configure-rendering.md].
Moving out of cairn means resolving the site's directive vocabulary, `cairn:` ids, and `media:`
references, a migration cost symmetric to the builder's [opinion].

**Counterweight.** The trade is deliberate: content and design separate by construction because
a component's appearance lives in code rather than in the file, and a theme change reaches every
page [verifiable: docs/extend/architecture.md, one `render` for preview and public pages].

## Leg 5: agent-assisted development, in the context of cairn's division of labor

This leg gets the most care, because the brief's version claimed the most and the evidence
supports the least. The brief's caption said that before coding agents cairn's custom-code model
suited few teams, that agents make the custom code a smaller lift, and that the result costs less
than integrating separate products. Round 1 found four unverifiable claims in those three
sentences, and this document agrees [opinion]. The argument is restated below as a division of
labor with two halves, each tagged on its own evidence.

**The half cairn carries, verifiable against the tree.** cairn carries the parts of a site that
are correctness-critical and security-bearing: magic-link authentication and sessions
(`src/lib/auth/`, 1,149 lines; `src/lib/auth-crypto`, `src/lib/auth-store`), the route guard,
CSRF, and the admin action wrappers (`src/lib/sveltekit/`, 10,710 lines;
`src/lib/components/csrf-context.ts`, `CsrfField.svelte`), the markdown editor, preview, and
admin shell (`src/lib/components/`, 24,595 lines), the commit and publish path to GitHub
(`src/lib/github/`, 825 lines), the admin design system and its toolkit
(`src/lib/admin-toolkit/`, 2,267 lines; `cairn-admin.css`), the 28-rule admin audit including
accessibility (`src/lib/audit/`, 10,139 lines), and a second-audience login factory
(`src/lib/auth-channel/`, 1,697 lines) [verifiable: `wc -l` over `src/lib/*/` on `main`,
2026-09-04]. Those modules sit behind 33 check scripts and a public-surface snapshot gate
[verifiable: scripts/checks/, `check:surface`]. The last full gate ran 375 unit and integration
files with 4,934 tests plus 78 component files with 1,354 tests [verifiable: the gate run
recorded for `main`, 2026-09-04]. A site reaches these through 18 export subpaths, never by
reimplementing them [verifiable: package.json `exports`].

**The half the organization writes.** What remains is a screen, a workflow, and a data model: a
SvelteKit route under `src/routes/admin/`, a D1 table with its migration, a form posting to a
section action, and a list composed from toolkit primitives [verifiable:
docs/extend/add-a-custom-admin-screen.md]. The organization's attention goes to its own workflow
and data, since the security invariants, the editor, and the publish path are not its to write
[verifiable: docs/extend/architecture.md, "What stays engine-internal"].

**What the evidence says about that kind of work.** In a randomized trial of 95 professional
developers on one well-specified greenfield JavaScript task, the group with AI assistance finished
55.8% faster [supported: Peng, Kalliamvakou, Cihon, Demirer 2023, n=95,
https://arxiv.org/abs/2302.06590]. Across three field experiments at three firms, pooled
n=4,867 developers on production work, AI access raised completed tasks by 26.08% (SE 10.3%),
with less experienced developers gaining most [supported: Cui et al., Management Science,
https://doi.org/10.1287/mnsc.2025.00535]. Both measure well-specified work in a widely used
language, and neither manipulates scaffolding or documentation as a variable [verifiable:
evidence.md, Claim 1]. Models resolve issues at higher rates in widely represented languages, and
file-path accuracy drops by up to 47 points on unfamiliar repositories [supported: "The SWE-Bench
Illusion", https://arxiv.org/abs/2506.12286]. A screen against a documented seam in a widely used
framework is work of the shape those trials measured; that sentence matches task type to the
studies and is a judgment, since no study tests cairn's split [opinion].

**What cuts against.** In METR's randomized trial, 16 experienced open-source developers working
246 real issues in mature repositories they knew for years were 19% slower with AI while believing
they were 20% faster [supported: METR, July 2025, https://arxiv.org/abs/2507.09089]. METR names as
moderators the repositories' implicit requirements, the developers' deep tenure, and about 50
hours of tool experience [verifiable: same]. The one study that tests repository context files
directly found no general improvement in task success and an inference cost increase of over 20%,
recommending context files for non-standard conventions rather than general orientation
[supported: "Evaluating AGENTS.md", https://arxiv.org/abs/2602.11988; methodology unread beyond
the abstract]. Of 100 popular repositories' agent context files, 91 showed at least one
configuration smell [supported: https://arxiv.org/abs/2606.15828, n=100]. Developer trust in AI
output accuracy fell to 29% in 2025, and 66% report spending more time fixing almost-right code
[supported: Stack Overflow Developer Survey 2025, respondent count not re-verified]. DORA's 2024
report associated a 25-point rise in AI adoption with a 1.5% fall in delivery throughput and a
7.2% fall in stability; its 2025 report finds AI amplifies an organization's existing strengths
and dysfunctions [supported: DORA 2024, about 39,000 respondents; DORA 2025, nearly 5,000; the
2024 numbers not confirmed against DORA's own PDF]. The context-file null bears directly on
cairn's shipped skill, and the skill's effect is therefore unevidenced [opinion].

**What cairn ships for an agent, as artifacts.** One agent skill, `cairn-admin-screens`, ships
in the npm tarball: a 114-line `SKILL.md` that teaches an agent to build or review a screen inside
a cairn site's `/admin` to cairn's own register, mapping the 28 `cairn-audit` rules across static
and rendered modes, plus six reference files (list and detail exemplars, form anatomy, extension
grammar, a grader prompt, and a craft catalogue), 1,255 lines in total [verifiable:
skills/cairn-admin-screens/, package.json `files`]. `cairn-doctor --fix` installs it at
`.claude/skills/cairn-admin-screens/` and reports it fresh, missing, or stale by hash, without
failing a build [verifiable: src/lib/doctor/check-skill.ts:15]. The scaffold, `create-cairn-site`,
emits a complete SvelteKit site from the Waymark theme with one worked custom screen, and it is
pre-release: unpublished on npm as of 2026-09-04, with its ship an open roadmap item [verifiable:
packages/create-cairn-site/, ROADMAP.md:74]. Cloudflare publishes an `llms.txt` index, a Claude
Code setup page, sixteen remote MCP servers, and an Agents SDK; GitHub publishes an MCP server,
the `gh` CLI, and a coding agent that opens pull requests [verifiable:
https://developers.cloudflare.com/agent-setup/claude-code/,
https://github.com/github/github-mcp-server]. Those support "vendor agent tooling exists," and
nothing about its effect [opinion].

**The narrowest honest claim.** cairn carries the authentication, the security invariants, the
editor, the publish path, the design system, and the gates, and a site does not rewrite them
[verifiable: the module list above]. What a site writes is a screen, a workflow, and a data model
against documented seams [verifiable: docs/extend/add-a-custom-admin-screen.md]. AI assistance
raises measured output on well-specified work in widely used languages, by 26% to 56% in the two
randomized trials with numbers [supported: Peng 2023; Cui et al.]. Whether documented seams or a
shipped skill raise an agent's success on that work is not evidenced, and the one direct study
returned a null with a cost increase [supported: https://arxiv.org/abs/2602.11988]. The economic
inference, that this division changes which architectures a small team can afford, has no study
behind it and stays a hypothesis the reader tests on their own project [opinion]. This is weaker
than the brief's claim, and it is the one this document makes [opinion]. The front door states
the division and lets the reader draw the cost conclusion [opinion].

### Already extensible, measured

One production site, `aksailingclub-org`, carries a custom admin layer that consolidates what an
organization would otherwise run as two or three separate products, each with its own admin, its
own login, and its own data [opinion]. The site went live by flipping the apex from a Hugo site
and retiring a hosted membership platform after a two-week soak, and its member data was imported
from that platform's exports [verifiable: aksailingclub-org
docs/2026-07-15-mw-cutover-runbook.md, CLAUDE.md "Member-data imports"]. Its custom admin
sections, enumerated by route under `src/routes/admin/club/`, with source lines and the product
category each stands in for [verifiable: aksailingclub-org src/routes/admin/club/, `wc -l`]:

| Route | Section title | Lines | The product category otherwise bought |
| --- | --- | --- | --- |
| `members/` | Members | 1,704 | A membership platform (roster, standing, renewals) |
| `money/`, `(site)/api/stripe` | Season rollup; the payments webhook | 433 + 127 | The membership platform's dues and ledger, over a payments provider |
| `documents/` | Waivers and acknowledgements | 573 | The membership platform's waiver module, or an e-signature service |
| `committees/` | Committees | 738 | The membership platform's groups and roles |
| `classes/` | Classes | 1,748 | An events or registration tool (sessions, waitlists, fees) |
| `events/` | Events | 3,120 | An events tool (a season calendar and ledger) |
| `assets/`, `asset-requests/` | Assets; Asset requests | 1,203 + 326 | An asset or storage register (boat parking, moorings, racks) |
| `email/`, `announce/` | Email; Announce | 1,501 + 559 | An email service with segments, templates, and a send cap |
| `settings/` | Settings | 381 | Each product's own settings page |

The member-facing half of the same layer (`src/member-portal`, `src/member-auth`,
`src/member-signup`, `src/jobs`, and the `my-account`, `join`, `classes`, and `events` site
routes) is the portal those products would each ship [verifiable: aksailingclub-org src/, the
table beneath]. Counted by category, the layer stands in for a membership platform, an events or
registration tool, an asset register, and an email service, four product categories, over one
retained payments provider [opinion].

Two facts follow from the tree. First, every section is built in the engine's admin toolkit
inside the engine's shell: the sections import `OfficeList` (14 uses), `TextInput` (10),
`FieldLabel` (10), `SelectInput` (7), `StatusChip` (5), `EmptyState` (4), `itemNoun` (4),
`computeCountLine`, `Pagination`, `PageHeader`, `AdminTable`, and `ageFromBirthdate` from
`@glw907/cairn-cms/admin-toolkit`, and every `/admin/**` route renders inside `CairnAdminShell`
from `@glw907/cairn-cms/components` through one `+layout.svelte` [verifiable: aksailingclub-org
src/routes/admin/+layout.svelte:8-22; `grep` over src/routes/admin/club]. Staff therefore learn
one admin idiom across content and club sections [opinion]. Second, everything sits in one app
behind one staff sign-in: `hooks.server.ts` composes `createAuthGuard({ roles, access })` over the
whole `/admin` subtree, with `createD1AuditSink` wired beside it [verifiable: aksailingclub-org
src/hooks.server.ts:18,54]. Members remain a separate audience with their own login, built in
`src/member-auth` on the engine's `auth-crypto` primitives against the site's own database, as
[Add a second audience](../../extend/add-a-second-audience.md) prescribes [verifiable:
aksailingclub-org src/member-auth/, migrations/asc-auth/].

The minimal case beside it is the scaffold's own worked screen: `admin/signups` is 90 lines
across two files plus a 9-line migration [verifiable:
examples/showcase/src/routes/admin/signups/, examples/showcase/migrations-app/0000_signups.sql].

The pair below is the honest size record. Building something like cairn is one measurement;
building this layer on top of it is the other. The second research pass
(`evidence-round-2.md`) had not landed when this was written, so every number was taken from the
two trees on 2026-09-04, and the items marked pending await that pass [verifiable: this section's
tags].

| Measure | The engine (`cairn-cms`, `main`) | One production membership layer (`aksailingclub-org`) |
| --- | --- | --- |
| Source, TypeScript and Svelte, excluding tests | 68,644 lines under `src/lib/` [verifiable: `wc -l` over `src/lib`] | 35,888 lines in 176 files across `src/admin-club` (8,930), `src/routes/admin/club` (12,415), `src/member-portal` (4,997), `src/routes/(site)/my-account` (5,655), `src/member-auth` (914), `src/member-signup` (610), `src/jobs` (814), and the `join`, `classes`, `events`, and `api` site routes (1,553) [verifiable: `wc -l` over those paths] |
| Tests | 375 unit and integration files, 4,934 tests; 78 component files, 1,354 tests [verifiable: last full gate on `main`] | 170 test files, 32,309 lines, site-wide [verifiable: `src/tests/`] |
| Gates | 33 check scripts plus the public-surface snapshot [verifiable: scripts/checks/] | The repo's `ci.yml` (`check`, `test`, `build`) [verifiable: aksailingclub-org CLAUDE.md] |
| Shipped surface | 18 export subpaths [verifiable: package.json `exports`] | Imports 11 engine specifiers, `/sveltekit` 57 times, the root 44, `/admin-toolkit` 27, `/delivery` 22, `/components` 18, `/cloudflare` 11, `/media` 9, `/delivery/head` 6, `/auth-crypto` 4, `/render` 2, `/delivery/data` 1 [verifiable: `grep` over `src/`] |
| Schema | 3 packaged migration sets (`migrations`, `migrations-app` in the scaffold, `migrations-channel`) [verifiable: package.json `files`, docs/extend/what-the-scaffold-wrote.md] | 39 migration entries, 6,085 SQL lines [verifiable: `migrations/asc-club/`] |
| History | 87 numbered releases, `0.22.0` through `0.96.0`, 4,023 commits, 2026-05-24 to 2026-09-04 [verifiable: CHANGELOG.md, `git tag`, `git log`] | 838 commits, 2026-07-06 to 2026-08-30, in named passes with plans and post-mortems [verifiable: aksailingclub-org docs/HISTORY.md] |

What the membership layer reuses from the engine, read from its imports: `requireSession`,
`requireAccess`, `createSectionAction`, and `createD1AuditSink` for gating and audit;
`generateToken`, `hashToken`, `tokensMatch`, `generateSessionId`, and `generateCsrfToken` for
its own member login; `checkRateLimit`; `CsrfField`; and `OfficeList`, `AdminTable`,
`PageHeader`, `StatusChip`, `EmptyState`, `FieldLabel`, `TextInput`, and `SelectInput` for its
screens [verifiable: `grep "from '@glw907/cairn-cms"` over the membership directories]. The
member login is site code on the engine's crypto primitives, and it binds its own database
[verifiable: aksailingclub-org src/member-auth/, migrations/asc-auth/]. How it was built: the
passes ran as implementer and diff-reviewer chains under a workflow, with human interaction
points counted per pass, and the 2026-08-25 email-announce pass ran eleven tasks overnight
[verifiable: aksailingclub-org docs/HISTORY.md, lines 9 to 12 and 117].

What the ratio says, stated plainly. The production layer is about half the engine's source
line count (35,888 against 68,644), and it is the four-category system enumerated above, with
renewal reminders, refunds, signatures, and a member directory besides [verifiable:
aksailingclub-org src/tests/ file names]. The sentence "a small fraction of the
whole" is not what this measurement supports, and this document does not write it [opinion]. What
it supports: the layer is conventional SvelteKit code (routes, D1 tables, forms, toolkit lists)
on 11 engine import paths, and none of it reimplements authentication crypto, CSRF, the editor,
the publish path, or the design system [verifiable: the import list above]. A smaller
organization's layer, a roster and a signup form, sits nearer the 90-line end of the range than
the 35,888-line end [opinion]. Pending the second pass: the skill's measured effect on an agent
building one of these screens, and any per-screen size and elapsed-pass figures from the
production site's own post-mortems [opinion].

## Where this document argues with round 1

Round 1 ranked twelve changes. This document takes eleven as written [opinion]. It differs on one
point of scope. Round 1's section 7 holds that the comparative material belongs in `why-cairn.md`
as prose and that the front door should show one system only. This document keeps the traditional
setup as a section, because the product owner's ruling is that the case is built first and the
figure follows, and because a reader choosing between two shapes is owed the other shape in the
same voice [opinion]. The register objection to naming competitors is honored: the traditional
setup is described by capability, and the only vendor names in this document are in citations of
public numbers [opinion]. Whether any of that material reaches the front door is the figure's
question, recorded below [opinion].

## Open questions for round 2

1. **The figure's form.** Round 1's objection stands unanswered by this text: a two-panel
   contrast argues by box count, and a box costs the same ink whether it is bought (a
   subscription with a support line) or built (a developer's months), so the geometry cannot show
   the asymmetry every leg above turns on. Three options. One system drawn with its boundary
   (cairn's screens and the site's screens inside `/admin`, the payments provider, organizational
   mail, and a member auth channel outside), with the contrast carried in prose. Two panels, with
   each built capability on the cairn side visibly marked as site code. Two figures, one for the
   system and one for the contrast. This document decides none of them.
2. **Claims judged too weak to carry the front door.** The cost sentence in Leg 5, in any
   comparative form. The "one member record" and "one login for editors and members" sentences,
   removed as false. The Classic Editor and Gutenberg numbers, removed as measuring the wrong
   thing. "Edge security as a platform default," narrowed to TLS and DDoS protection with the WAF
   subset stated.
3. **Whether to name the outage.** The 2025-11-18 postmortem is the strongest single-vendor
   counter-evidence. Naming a dated incident on a front door may read as defensive; omitting it
   leaves the reader to supply it.
4. **Email Sending against the free deploy.** The scaffold's Cloudflare chapter deploys on the
   free plan, and Email Sending needs the paid plan; the front door has to state the boundary
   before the step that crosses it.
5. **Evidence gaps.** No study isolates scaffolding or documentation as a variable in agent
   success. No study prices custom code against architecture choice for small teams. No named
   case study of a git CMS failing at scale, and no editor-satisfaction survey on markdown against
   rich text. Five citations remain unfetched: the WordPress 5.0 release post, GitHub's REST and
   GraphQL pages, GitHub's App-authentication page for bot-committer wording, Universal SSL's
   "unshared" wording at the free tier, and Patchstack's 2025 full-year figure.
6. **A measured worked example.** The measured pair above sizes the code; nothing yet measures
   the effort. One custom screen built on a cairn site with an agent, its diff size, files, and
   passes recorded, would be the first evidence for Leg 5's economic half. Whether to build it
   before the figure ships is a product decision.
