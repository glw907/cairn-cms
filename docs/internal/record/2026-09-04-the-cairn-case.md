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
adopts cairn, and it grades neither side [opinion]. The
traditional setup is a steel man, described in the same voice as cairn, with its advantages
stated as facts. cairn's drawbacks carry the same weight as its advantages, each with a factual
counterweight where one exists and a plain concession where none does. Every factual sentence
ends in a tag: `[verifiable: <path or URL>]` for a fact checkable against the tree or a primary
document, `[supported: <citation>]` for a claim backed by a study or report with a stated sample,
or `[opinion]` for a judgment. A sentence that could earn no tag was cut. Evidence dates matter,
because counts and ratings move; the evidence file records the read date of each number
[verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, research date 2026-09-04].

Inputs: the ratified argument brief, its round-1 adversarial review (verdict RETHINK, twelve
ranked changes), the two evidence files, the product owner's strengthening notes, the round-2
review (verdict SOUND AFTER FIXES, twenty ranked changes), the scope charter, the docs register,
`why-cairn.md`, and the extend track, all banked under
`docs/internal/record/2026-09-04-cairn-case/`. Where this document departs from a review, it says
so and says why. Each section carries a front-door line: derivable, or internal record only
because it names a consumer site.

## The traditional setup, as a competent team builds it

Front door: derivable.

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
2025-03-14, https://patchstack.com/whitepaper/state-of-wordpress-security-in-2025/]. For 2025 the
same database counts 11,334 new vulnerabilities, 91% in plugins, 46% unpatched at public
disclosure, and a weighted median of five hours from disclosure to first exploitation among
heavily exploited flaws [supported: Patchstack, State of WordPress Security in 2026,
https://patchstack.com/whitepaper/state-of-wordpress-security-in-2026/]. Patchstack sells a
competing security product, so those are disclosure counts, never incident rates on small sites
[verifiable: same]. No independent measurement of maintenance hours for a small organization's
site was found, and agency care-plan prices are not evidence [verifiable:
docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, Priority 2]. The cairn shape
has its own treadmill, and it is stated here in the same terms. The engine published 87 numbered
releases from `0.22.0` to `0.96.0` [verifiable: CHANGELOG.md, `git tag`; `v0.96.0` dated
2026-08-22]. The phrase "Consumers must" appears 202 times in that changelog [verifiable: `grep -c
"Consumers must" CHANGELOG.md`]. The package declares 37 runtime dependencies and four peers
[verifiable: package.json]. The production site ran two engine-adoption passes on consecutive
days, 2026-08-21 and 2026-08-22 [verifiable: aksailingclub-org docs/HISTORY.md:236,263]. A Vite 8
change once broke every consumer build until the engine added a post-package transpile step
[verifiable: docs/internal/record/2026-06-21-e2e-dist-svelte-build-failure.md]. npm is the surface
a cairn site patches [opinion].

## Leg 1: cairn is both a working CMS and an extensible admin tool

Front door: derivable.

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
docs/extend/what-the-scaffold-wrote.md]. Everything past that is the developer's [opinion].

**The developer's other option.** A developer who will write the membership layer either way can
also take SvelteKit plus a git-backed CMS and a hand-written `/admin` [opinion]. The git-backed
tools in that position, by npm weekly downloads for the week of 2026-08-23: `@keystatic/core`
134,619, TinaCMS 70,261, Decap CMS 3,059 [verifiable: npm registry API, read 2026-09-04;
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 3]. What cairn ships that the
other stack asks the developer to write: the admin shell, the toolkit primitives, the 28-rule
admin audit, the public-surface snapshot gate that holds the seams, the magic-link editor login,
the per-entry holding branch and publish path, and the skill [verifiable:
docs/extend/add-a-custom-admin-screen.md; docs/reference/cairn-audit.md; `check:surface`;
docs/extend/architecture.md; skills/cairn-admin-screens/]. What the other stack gives that cairn
does not: a choice of host and framework, and an editor UI its own project maintains [opinion].

## Leg 2: content is markdown files in the site's git repository

Front door: derivable.

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
fieldset validates in the admin, and a commit made outside the admin meets only the build's
manifest regeneration [verifiable: docs/extend/what-the-scaffold-wrote.md, `cairnManifest`;
opinion on the bypass].
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
markdown against rich text was found; both are gaps [verifiable:
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 3].

The category's leading tool stalled: Netlify transferred Netlify CMS to an agency in February
2023, and a competitor reports progress stalled for more than six months before that
[verifiable: https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/;
https://sveltiacms.app/en/docs/successor-to-netlify-cms, a competitor's timeline, its share
figures not cited].

**Counterweight.** cairn's fixed concepts are sized for an organization's site, and the manifest
exists so index pages never crawl the repository through the API [verifiable:
docs/extend/architecture.md]. A stalled CMS leaves the content readable and the site building,
since the content is files in the organization's repository and the engine is an npm dependency
[verifiable: docs/why-cairn.md, "Committing to git-backed content"]. Personal data belongs in
D1, which has `DELETE`; content files carry site content [verifiable:
docs/extend/data-tiers.md]. A cairn site has no plugin surface to patch; the code is the site's
own and the engine updates through npm [verifiable: package.json,
docs/extend/migration-notes.md]. The category's own tracked issues admit the concurrency cost (no
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

Front door: derivable, with every vendor number replaced by a link.

**Claim.** One Cloudflare account supplies hosting, the sign-in store, media storage, the
magic-link sender, and optionally the deploy [verifiable: docs/extend/what-the-scaffold-wrote.md,
`wrangler.jsonc` bindings]. The two-product traditional shape assembles those from several
vendors [opinion]. Against a bundled membership product that hosts the site, the portal, and
the mail, vendor count is equal and the capability list is the product's [opinion]. TLS and
DDoS protection are edge defaults on every Cloudflare plan, as they are at other hosts
[verifiable: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/,
https://developers.cloudflare.com/ddos-protection/].

**Evidence, each with its caveat.** SvelteKit deploys to Workers with the Cloudflare adapter
[verifiable: https://developers.cloudflare.com/workers/frameworks/framework-guides/svelte/]. D1
is serverless SQL with SQLite semantics, and a site binds as many databases as it needs
(`AUTH_DB`, `APP_DB`, `MEMBER_DB` in `examples/showcase`) [verifiable:
https://developers.cloudflare.com/d1/, examples/showcase/wrangler.jsonc]. Each D1 database is
single-threaded and processes queries one at a time, with a 500 MB size limit on the free plan
and 10 GB on paid [verifiable: https://developers.cloudflare.com/d1/platform/limits/]. Workers
Free allows 100,000 requests a day and 10 ms CPU per invocation; Paid allows 30 s by default
[verifiable: https://developers.cloudflare.com/workers/platform/limits/]. R2 stores objects
without egress fees; storage and operations are still billed [verifiable:
https://developers.cloudflare.com/r2/]. Email Sending sends from a Worker binding, up to 50
recipients per send, and is in public beta since 2026-04-16; its product page still reads
"Beta" as of 2026-06-09 [verifiable:
https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/,
https://developers.cloudflare.com/email-service/]. Sending to arbitrary recipients requires the
Workers Paid plan, with 3,000 sends a month included and $0.35 per 1,000 beyond, and new
accounts start with a daily quota Cloudflare calls conservative; one production site measured
200 a day [verifiable: https://developers.cloudflare.com/email-service/platform/pricing/,
https://developers.cloudflare.com/email-service/platform/limits/; aksailingclub-org
docs/STATUS.md]. Its limits and pricing pages describe no list management, unsubscribe
handling, bounce suppression, or campaign features [verifiable: the same two pages, by absence].
Workers Builds deploys on push from a connected GitHub or GitLab repository, and is an optional
later step in cairn's own setup that needs a second, wider API token; a site may deploy with
`wrangler` instead [verifiable: https://developers.cloudflare.com/workers/ci-cd/builds/,
docs/admin/own-your-domain.md]. The free-plan WAF is a subset (custom rules,
one rate-limiting rule, the free managed ruleset); attack scoring and advanced rate limiting are
paid [verifiable: https://developers.cloudflare.com/waf/]. DNS can sit at Cloudflare, which
consolidates a billing relationship and removes no component [opinion]. A cairn site costs the $5
Workers Paid plan plus a domain, about $6 a month, and whether the domain's certificate is charged
was unconfirmed as of 2026-08-11 [verifiable: docs/admin/before-you-start.md].

**Counter-evidence a skeptic cites.** Cloudflare published six outage postmortems between
2025-06-12 and 2026-02-20; two of them, the 1.1.1.1 resolver on 2025-07-14 and the BYOIP
withdrawal on 2026-02-20, did not touch Workers [verifiable:
https://blog.cloudflare.com/tag/outage/]. The four that did: 2025-06-12, up to 2 h 28 min, Workers
KV, Access, and the dashboard; 2025-11-18, a database permissions change doubled a Bot Management
feature file and the CDN, Turnstile, Workers KV, Access, and the dashboard failed together, with
Cloudflare's own resilience post putting the global outage at about two hours ten minutes and full
restoration at 17:06 UTC [verifiable: https://blog.cloudflare.com/18-november-2025-outage/,
https://blog.cloudflare.com/fail-small-resilience-plan/]; 2025-12-05, about 25 minutes, 28% of
applications behind the network [verifiable:
https://blog.cloudflare.com/fail-small-resilience-plan/]; 2026-02-20, 6 h 7 min, a BYOIP route
withdrawal [verifiable: https://blog.cloudflare.com/cloudflare-outage-february-20-2026/]. The
status API lists 16 incidents in the ten days to 2026-09-04, among them Durable Objects errors,
Workers Builds degraded for 1 h 39 min, and Workers KV errors in Western Europe for 4 h
[verifiable: https://www.cloudflarestatus.com/api/v2/incidents.json, payload from 2026-08-26].
Cloudflare's "Fail Small" plan commits to health-mediated deployments for all production
configuration by the end of Q1 2026 [verifiable:
https://blog.cloudflare.com/fail-small-resilience-plan/]. A multi-vendor shape fails in parts, and
a single-platform shape fails whole [opinion]. No study isolates vendor count as a variable
against a small team's operational burden; the efficacy half of this leg is a hypothesis
[verifiable: docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 2]. The DX "6 to 15
hours a week" tool-sprawl figure has no located primary instrument and is not cited [verifiable:
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, open question 7]. The outage is
conceded and named here rather than left for a reader to supply [opinion].

**Drawbacks.** One account is one vendor, and cairn has no abstraction layer for swapping
Cloudflare or GitHub later [verifiable: docs/why-cairn.md, "Why this stack"]. The traditional
shape's "each part replaceable" is a real asymmetry [opinion].

**The tie.** A cairn site is tied to these decisions together. Content lives in
GitHub, the site runs on Cloudflare, the app is SvelteKit, and the engine reaches D1, R2, and
Workers directly with no host-agnostic layer [verifiable:
docs/internal/what-cairn-is-and-is-not.md, "SvelteKit + Cloudflare, fully"]. A change of any
one is a migration, and the platform's pricing, limits, and incidents are the site's [opinion].
The admin's tie is narrower than the brief stated. The admin frame is DaisyUI on Tailwind, and a
site that restyles the admin itself works in that idiom [verifiable: CLAUDE.md, "What cairn
is"; docs/internal/admin-design-system.md]. A custom admin screen mostly consumes the toolkit:
each toolkit component assembles daisyUI classes from cairn's own blessed set and keeps its
layout in a scoped `<style>`, ships pre-compiled in cairn's admin stylesheet, and the skill
tells an author to load it before touching `/admin` routes, toolkit components, or
`cairn-admin.css`, and to finish with `npx cairn-audit` rather than with DaisyUI knowledge
[verifiable: docs/reference/admin-toolkit.md:22-26; docs/extend/add-a-custom-admin-screen.md,
"Compose the screen"; skills/cairn-admin-screens/SKILL.md:3,10,90-97]. The public site is not
tied: the engine's public output is design-agnostic and each site brings its own `render`
[verifiable: docs/internal/what-cairn-is-and-is-not.md; docs/extend/configure-rendering.md].
The scaffold's own Waymark theme happens to use Tailwind with DaisyUI theme blocks, as copy-in
files the site owns outright with no version lock, and a site built by hand may use any CSS
[verifiable: examples/showcase/src/theme/theme.css:9-11,69; docs/extend/design-your-site.md,
"Extending the component model"; docs/extend/build-a-site-by-hand.md]. The counterweights that
are facts: the content is plain markdown files in a repository the organization owns, portable
by clone [verifiable: docs/extend/what-the-scaffold-wrote.md]; the app is standard SvelteKit
with `@sveltejs/adapter-cloudflare`, so deploying elsewhere is an adapter change plus rewriting
every D1, R2, and email binding the engine and the site reach, which is real work this document
does not size [verifiable: examples/showcase/svelte.config.js:1;
docs/internal/what-cairn-is-and-is-not.md]; the engine is MIT-licensed on npm [verifiable:
package.json "license"]. None of that loosens the tie, and the reader decides with it in view
[opinion]. Announcements to members need list
management, unsubscribe handling, suppression, batching against rate limits, and a send record,
none of which the Email Sending primitive supplies and all of which the site builds; the engine's
own publish seam is a pure manifest diff that sends nothing [verifiable:
docs/extend/announce-on-publish.md]. A payments provider on cairn means webhooks, a subscription
state machine, and reconciliation code the site maintains, where the membership product ships
those integrated [opinion].

**Counterweight, and the developer's contact with infrastructure.** The scaffold writes the Worker
configuration, `wrangler.jsonc` with the `AUTH_DB`, `APP_DB`, `EMAIL`, and `MEDIA_BUCKET`
bindings, the two migration sets, and the doctor's readiness checks [verifiable:
docs/extend/what-the-scaffold-wrote.md, "Root"; docs/admin/is-it-working.md]. The GitHub App
install, the Cloudflare deploy with its databases and bucket, and the domain are three guided
chapters of `create-cairn-site`, which is pre-release [verifiable: packages/create-cairn-site/;
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, scaffold chapters; ROADMAP.md:74].
Workers Builds deploys from a push and is an optional later step needing a second token; `wrangler
deploy` is the other path [verifiable: docs/admin/own-your-domain.md, "Connect to Workers
Builds"]. The developer's infrastructure contact is that list [opinion]. The single-vendor cost is
a choice the reader makes with the tie above in view, and this document does not weigh it for them
[opinion].

## Leg 4: no page builder, as a feature and as a cost

Front door: derivable.

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
never an official disclosure]. It is weakest for core block markup, which reads as valid HTML with
ignorable comments in any tool, and is on that measure more portable than a cairn directive, which
renders as literal text outside cairn [opinion]. An editor cannot change the site's design
language or a component's styling; an editor can still pick the wrong directive or write a heading
that wraps badly [opinion]. The editor's job stays small: headings, emphasis, links, lists,
images, and the site's declared directives [verifiable: docs/extend/configure-rendering.md].

**Counter-evidence a skeptic cites.** Elementor runs 12.8% of all websites W3Techs tracks and
roughly 31% of WordPress sites, so a large share of site owners choose builder coupling knowingly
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
with a stated sample measures page-builder lock-in or migration regret [verifiable:
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 4].

**Drawbacks.** Any organization wanting one page laid out unlike every other page, a special page
for the annual event, needs a developer under cairn and needs nobody under a builder [opinion].
Complex layouts are the developer's components [verifiable: docs/extend/configure-rendering.md].
Moving out of cairn means resolving the site's directive vocabulary, `cairn:` ids, and `media:`
references, a migration cost of its own [opinion].

**Counterweight.** The trade is deliberate: content and design separate by construction because
a component's appearance lives in code rather than in the file, and a theme change reaches every
page [verifiable: docs/extend/architecture.md, one `render` for preview and public pages].

## Leg 5: agent-assisted development, a case report

Front door: internal record only (names a consumer site); the derivable form is at the end of
the section.

This leg is a case report. It neither infers that agents make custom code cheap, as the brief
did, nor reverses that into the round-2 review's thesis. It states what cairn carries, what the
general studies test, and what one production site's own record measures, and it leaves the
inference to the reader [opinion].

**What cairn carries, scoped to the charter.** cairn carries the correctness-critical and
security-bearing parts of the editor session and the admin frame: magic-link authentication and
sessions (`src/lib/auth/`, 1,149 lines; `src/lib/auth-crypto`, `src/lib/auth-store`), the route
guard, CSRF, and the admin action wrappers (`src/lib/sveltekit/`, 10,710 lines;
`src/lib/components/csrf-context.ts`, `CsrfField.svelte`), the markdown editor, preview, and
admin shell (`src/lib/components/`, 24,595 lines), the commit and publish path to GitHub
(`src/lib/github/`, 825 lines), the admin design system and its toolkit
(`src/lib/admin-toolkit/`, 2,267 lines; `cairn-admin.css`), the 28-rule admin audit including
accessibility (`src/lib/audit/`, 10,139 lines), and a second-audience login factory
(`src/lib/auth-channel/`, 1,697 lines) [verifiable: `wc -l` over `src/lib/*/` on `main`,
2026-09-04]. Those modules sit behind 33 check scripts and a public-surface snapshot gate
[verifiable: scripts/checks/, `check:surface`]. The engine's own test suite is 446 `.test.ts`
files under `src/tests/` [verifiable: `find src/tests -name '*.test.ts'`; `npm test` on
`main`]. A site reaches these through 18 export subpaths [verifiable: package.json `exports`].
The site's own login, payments, and personal data are the site's code, and the production case
below shows each as site code [verifiable: aksailingclub-org src/member-auth/,
src/routes/(site)/api/stripe/, src/routes/admin/club/documents/].

**What the general studies test, and what they do not.** Across 1,319 live repair tasks from 93
repositories with early-2025 models, a single-file patch under five lines was solved 48% of the
time, a patch touching three or more files or more than 100 lines under 10%, and a patch touching
seven or more files never [supported: "SWE-bench Goes Live!", https://arxiv.org/abs/2505.23419].
The benchmark measures issue repair, and no cited study measures greenfield construction against a
scaffold [opinion]. On 1,865 problems, frontier models score about 42% to 44% on public
repositories and under 18% on proprietary ones [supported: SWE-Bench Pro,
https://arxiv.org/abs/2509.16941; difficulty and unfamiliarity are confounded]. On real
class-level tasks, models reach 25% to 34% correctness against 84% to 89% on synthetic benchmarks;
documentation in the prompt moved that by one to three points, and implementation patterns
retrieved from the target codebase by four to seven [supported: Rahman, Khatoonabadi, Shihab,
https://arxiv.org/abs/2510.26130]. The skill's two annotated exemplars are the nearest analogue to
those retrieved patterns, and not the same thing [opinion]. Of 567 Claude Code pull requests to
157 open-source projects, 83.8% were merged and 54.9% of those without modification, with
project-specific standards the named friction [supported: Watanabe et al.,
https://arxiv.org/abs/2509.14745; the developers chose which requests to open]. Developer-written
context files raised resolution about 4% on niche repositories and LLM-generated ones lowered it,
at 20% to 23% more steps either way [supported: "Evaluating AGENTS.md",
https://arxiv.org/html/2602.11988v1]. On security-sensitive tasks the highest-scoring of 25 agent
and model pairings produced correct and secure code 23.8% of the time [supported: SecureVibeBench,
https://arxiv.org/abs/2509.22097; C/C++ memory safety]. AI-co-authored pull requests carried 2.74
times the security issues of human-only ones across 470 requests [supported: CodeRabbit,
https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report, n=470; a review-tool
vendor]. Across 80 tasks and more than 100 models, 45% of generated solutions carried a security
flaw, unchanged by model size [supported: Veracode 2025,
https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/; a security
vendor]. In 16,758 agent trajectories, 60% to 69% of failures on two of the three agent
architectures studied reached the correct functions and still produced a wrong patch [supported:
Kim et al., https://arxiv.org/abs/2603.24631]. Across 16,118 misalignment episodes detected in
20,574 sessions, 91.49% of the resolutions the developer could see still needed an explicit
correction, and silent failures are undercounted by the method [supported: "How Coding Agents Fail
Their Users", https://arxiv.org/html/2605.29442]. None of these studies tests a framework that
owns the editor and admin invariants and hands a developer a seam; each is cited only for what it
tests [opinion].

**Speed, off the table.** In METR's randomized trial, 16 experienced developers on 246 issues in
mature repositories were 19% slower with AI while believing they were 20% faster [supported:
METR, July 2025, https://arxiv.org/abs/2507.09089]. METR's 2026 follow-up, 57 developers on
800-plus tasks, gives point estimates of minus 18% and minus 4% with intervals reaching plus 9%,
with 30% to 50% of developers withholding tasks they did not want to do without AI, so METR
stands behind no uplift number [supported: https://metr.org/blog/2026-02-24-uplift-update/].
METR's self-report survey found a median claimed speedup of 3x that METR says is overstated
[supported: https://metr.org/blog/2026-05-11-ai-usage-survey/, n=349]. The two randomized trials
with speed numbers (55.8% faster on one greenfield task, n=95; 26.08% more tasks across three
firms, n=4,867) are recorded as contested and not cited for the case [supported: Peng et al.
2023; Cui et al., Management Science]. In a randomized trial of 52 mostly junior engineers, the
AI-assisted group scored 50% on a comprehension quiz of a newly learned library against 67% for
the hand-coding group [supported: Shen and Tamkin, https://arxiv.org/abs/2601.20245]. A
developer who delegates the parts they must later maintain may learn them less; the study did
not test maintenance [opinion]. Agent-first projects show static-analysis warnings up about 18%
and cognitive complexity up about 39% [supported: Agarwal, He, Vasilescu,
https://arxiv.org/abs/2601.13597; preprint]. In a two-phase experiment with 151 participants,
code written with AI assistance showed no significant difference in later completion time or
quality when others evolved it [supported: Borg et al., https://arxiv.org/abs/2507.00788].

**What cairn ships for an agent, as artifacts.** One agent skill, `cairn-admin-screens`, ships
in the npm tarball: a 114-line `SKILL.md` that teaches an agent to build or review a screen inside
a cairn site's `/admin` to cairn's own register, mapping the 28 `cairn-audit` rules across static
and rendered modes and pointing at the audit rather than restating it, plus six reference files
(list and detail exemplars at 212 and 206 lines, form anatomy, extension grammar, a grader
prompt, and a craft catalogue), 1,255 lines in total [verifiable: skills/cairn-admin-screens/,
package.json `files`]. `cairn-doctor --fix` installs it at `.claude/skills/cairn-admin-screens/`
and reports it fresh, missing, or stale by hash [verifiable: src/lib/doctor/check-skill.ts:15];
the check never fails a run, since the skill is a development aid [verifiable:
src/lib/doctor/check-skill.ts:38,123]. The scaffold, `create-cairn-site`, emits a complete
SvelteKit site from the Waymark theme with one worked custom screen, and it is pre-release:
unpublished on npm as of 2026-09-04, with its ship an open roadmap item [verifiable:
packages/create-cairn-site/, ROADMAP.md:74]. Cloudflare publishes an `llms.txt` index, a Claude
Code setup page, sixteen remote MCP servers, and an Agents SDK; GitHub publishes an MCP server,
the `gh` CLI, and a coding agent that opens pull requests [verifiable:
https://developers.cloudflare.com/agent-setup/claude-code/,
https://github.com/github/github-mcp-server]. Those support "vendor agent tooling exists," and
nothing about its effect [opinion].

### The case report: one production site's membership and assets build

The site is `aksailingclub-org` at commit `836d324` (2026-08-30), read-only [verifiable:
`git rev-parse --short HEAD`]. The measured scope is the three admin routes `members/`,
`assets/`, and `asset-requests/` under `src/routes/admin/club/`, plus the sixteen modules under
`src/admin-club/lib/` those routes import (`assets-store`, `classes-store`, `club-action`,
`club-db`, `club-email`, `club-settings`, `households-store`, `household-surgery`, `ledger`,
`manual-payment`, `member-format`, `member-types`, `money-store`, `payments`, `refunds`, `ui`)
[verifiable: `grep "from '\$admin-club" src/routes/admin/club/{members,assets,asset-requests}`].
The first 48 hours are 2026-07-06 00:00 to 2026-07-08 00:00 by commit date [verifiable: `git log
--since=2026-07-06 --until=2026-07-08`].

| Measure | Value | Command or line |
| --- | --- | --- |
| First commit, `members/` and `assets/` | 2026-07-06, `cc4edd3` | `git log --reverse -- <path>` |
| First commit, `asset-requests/` | 2026-07-07, `a6d3c05` | same |
| Commits in the first 48 hours touching the three routes or `src/admin-club` | 35 | `git log --since --until -- <paths>` |
| Whole-repository commits on those two days | 42 on 2026-07-06, 150 on 2026-07-07 | `git log --format=%ad --date=short` |
| Lines added to the three routes in the first 48 hours | 1,002 added, 143 deleted (621/124 on the 6th, 740/34 on the 7th) | `git log --since --until --numstat -- <routes>` |
| Lines added to the sixteen imported modules in the first 48 hours | 1,548 added, 98 deleted; six of the sixteen existed by 2026-07-07, the other ten first appear 2026-07-13 or 2026-07-14 | `git log --since --until --numstat -- <modules>`; `git log --reverse -- <module>` |
| Lines today | routes 3,233 (1,704 + 1,203 + 326); the sixteen modules 3,879 | `wc -l` |
| Later commits touching the three routes, 2026-07-08 to 2026-08-30 | 42 | `git log --since=2026-07-08 -- <routes>` |
| Later commits touching `src/admin-club` | 81 | same, `-- src/admin-club` |

What the first two days built, from the commit messages: on 2026-07-06 the Club section was
scaffolded as five custom `/admin/club/*` screens on `CairnAdminShell`, with Members, Assets,
Classes, and Email rendering structural office-list-shaped table shells and the Members list
and detail screens and the signup-review queue built the same day [verifiable: aksailingclub-org
`git show cc4edd3`, `a6a5f2b`, `8d7154c`]; on 2026-07-07 the member domain, the asset domain
with the assets admin, the asset-request inbox, member magic-link authentication, the classes
admin with the club-action wrapper and audit sink, Stripe Checkout with webhook reconciliation,
and the scheduled job runner landed, and the club-admin stand-ins were swapped onto the engine's
`0.82.0` seams [verifiable: `99088c2`, `64a1939`, `a6d3c05`, `1046660`, `136b926`, `b918044`,
`78b4a3a`, `479b2a3`]. The Members list and household desk moved onto live club data on
2026-07-14, with 395 lines added and 345 deleted on the routes [verifiable: `81634ca`;
`8db6646` deletes the demo members]. How those days ran, from the site's own record: pass 2.1
executed overnight on 2026-07-07 in an extended conductor session while the owner slept about
nine hours, ten plan tasks plus riders built by Sonnet implementers under a Fable conductor,
closed by a three-reviewer Opus fan-out [verifiable: aksailingclub-org
docs/status-archive.md:1924,1931,1941; docs/plans/2026-07-07-pass-2-1-harvest.md:4]. No
wall-clock hours of the owner's own time are recorded anywhere in the repository [verifiable:
`grep -ri hours docs/`].

**The later commits, classified.** The 42 commits that touched the three routes after
2026-07-08, classified by commit subject and by whether the diff touched `.svelte` markup or
`.ts` server and store code; the classification is a judgment [verifiable: `git show --numstat
<hash> -- <routes>` for each; opinion on the class]:

| Class | Commits | Lines on the routes | What they did |
| --- | --- | --- | --- |
| Layout and toolkit shapes | 20 | +1,557 / -708 | Rebuilding the Members screen on the toolkit (`06bf1b4`, +404/-162); rebuilding Assets off raw tables (`4f2e7bd`) and asset-requests (`8778556`); both re-entering the toolkit register (`e151a09`, `339007b`); three rendering-defect rounds; the coherence round (`8bacfac`); the field-label register; zebra clip and dialog polish (`1fe2270`); typography, count-line grammar, phone formatting |
| Domain logic | 16 | +1,645 / -502 | Live club data (`81634ca`); household desk write paths, roster CRUD, surgery, payments, tier change (`ce22629`, +622); the refund engine (`87b42a8`); the membership-admin review round on refunds, caps, and races (`35e319c`); waitlist promotion and asset-type editing; decision emails; the standing tier; the opt-in control |
| Engine adoption | 6 | +222 / -184 | The `0.90.0` pickup (`5089e0c`), the `0.91.0` grammar (`986f95c`), `0.94.0-rc.1` (`fbb5908`), the swap onto the published `/admin-toolkit` subpath (`0430788`), the club gate onto the engine's typed session (`9031d5e`), retired type names (`107ab1d`) |

The layout class is the largest by commit count and the second by lines. The components those
rebuilds moved onto have since graduated into the engine: `AdminTable`, `ExpandableRow`,
`StatusChip`, `ListToolbar`, `Pagination`, `ToolbarDisclosure`, and the pure `list-toolbar`,
`pagination-window`, and `format` modules each carry a header saying they graduated from
`aksailingclub-org` [verifiable: cairn-cms src/lib/admin-toolkit/*.svelte:2-4, *.ts:1;
index.ts:8-10]. The `/admin-toolkit` subpath published across `0.89.0` (2026-07-21) and `0.90.0`
(2026-07-23), the release in which `ExpandableRow` graduated on its second consumer, and six
further absorptions from the site's harvests merged on 2026-08-27, unpublished [verifiable:
`git tag`; CHANGELOG.md:3495; docs/HISTORY.md:351-356,561]. The site's own harvest ruled on
2026-07-20 that a component graduates when its second consuming screen has used it, and the
2026-07-30 assets harvest filed vertical centering of padded labels, the toggle-action control,
and the label-and-value row as engine-level mechanics [verifiable: aksailingclub-org
docs/2026-07-20-members-pass-harvest-findings.md:8,36-40;
docs/2026-07-30-assets-substrate-harvest-findings.md:29,71,101]. The site's recorded budgets for
that layout work: the Members pass about 3.4M subagent tokens with zero conductor questions to
the owner, the Members refinement round about 1.9M with zero, and the assets substrate pass
about 3.23M across 26 dispatches with eighteen grader runs and three fix rounds [verifiable:
aksailingclub-org docs/status-archive.md:160,557-558,624-625]. Of the 42 later commits, 20
touched layout and toolkit shapes that the engine's `/admin-toolkit` has since absorbed, named
above, so a site built on the current engine starts from those components rather than deriving
them [verifiable: the table; cairn-cms src/lib/admin-toolkit/]; whether it skips all of that
work is the reader's inference, since a site's own screens still compose those components
[opinion]. The remainder was domain refinement and engine-adoption passes [verifiable: the
table].

**The defect at the seam.** The site's pre-cutover blocker is a CSRF defect: its blanket
`Referrer-Policy: no-referrer` nulls `Origin` on plain form POSTs, the engine's CSRF guard
rejects them, and member sign-in failed in real browsers across 40 forms, invisible to every
prior test [verifiable: aksailingclub-org docs/STATUS.md:17-28]. The engine held the invariant
and a real-browser gate caught the trip; the seam between engine invariant and site code is
where this bug lived, and the site's developer had to understand the invariant to fix it
[opinion]. The site's member login is not `createAuthChannel`; it is 914 lines of site code on
the engine's `auth-crypto` primitives, written before that subpath shipped [verifiable:
aksailingclub-org src/member-auth/lib/auth.ts:6-14,279].

**The sentences the record supports.** The initial membership and assets build landed in two
calendar days as agent-built code on the engine's seams, with the owner's own time on those days
unrecorded and the first build rendering shells and demo data that moved onto live data a week
later [verifiable: the table; `81634ca`]. The layer then took 42 commits of refinement on the
routes over eight weeks, and 81 on the shared library, including six engine-adoption commits and
the CSRF seam defect [verifiable: the table; docs/STATUS.md:17-28]. The site's recorded token
spend on later passes ran 1.4 to about 2.3 times its own ceilings, which the site's record calls
"roughly twofold" [verifiable: aksailingclub-org docs/HISTORY.md:102,151,198-199]. The general
studies are cited only for what they test, issue repair on benchmarks and security defect rates
in generated code, and none tests this partition [opinion]. The reader draws the inference
[opinion].

**Derivable form, for the front door.** One production site built its membership and assets
admin in two calendar days as agent-built code on the engine's seams, then refined it over
eight weeks in 42 commits on the routes, of which 20 touched layout shapes the engine's toolkit
has since absorbed, 16 were domain logic, and 6 were engine adoption; its member login,
payments, and signatures are its own code, and its one recorded blocker was a CSRF defect at the
seam between engine and site [verifiable: this section's commands].

### Already extensible, measured

Front door: internal record only (names a consumer site); the derivable form is at the end.

One production site, `aksailingclub-org`, carries a custom admin layer that consolidates what an
organization would otherwise run as two or three separate products, each with its own admin, its
own login, and its own data [opinion]. The site went live by flipping the apex from a Hugo site
and retiring a hosted membership platform after a two-week soak, and its member data was imported
from that platform's exports [verifiable: aksailingclub-org
docs/2026-07-15-mw-cutover-runbook.md, CLAUDE.md "Member-data imports"]. Its custom admin
sections, enumerated by route under `src/routes/admin/club/`, with source lines [verifiable:
aksailingclub-org src/routes/admin/club/, `wc -l`]:

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
routes) is the portal those sections serve [verifiable: aksailingclub-org src/, the table
beneath]. Counted by category, the layer stands in for a membership platform, an events or
registration tool, an asset register, and an email service, four product categories, over one
retained payments provider [opinion].

Two facts follow from the tree. First, every section is built from the engine's admin toolkit
inside the engine's shell. Counting files under `src/routes/admin/club/` and `src/admin-club/`
that import each symbol from `@glw907/cairn-cms/admin-toolkit`: `OfficeList` 14, `TextInput` 10,
`FieldLabel` 10, `SelectInput` 7, `StatusChip` 5, `EmptyState` 4, `itemNoun` 4, `computeCountLine`
2, `Pagination` 1, `PageHeader` 1, `AdminTable` 1, `ageFromBirthdate` 1; and every `/admin/**`
route renders inside `CairnAdminShell` from `@glw907/cairn-cms/components` through one
`+layout.svelte` [verifiable: `grep -rlE "import \{[^}]*\bSYMBOL\b[^}]*\} from
'@glw907/cairn-cms/admin-toolkit'"` over those two directories;
src/routes/admin/+layout.svelte:8-22]. Second, `hooks.server.ts` composes `createAuthGuard({
roles, access })` over the whole `/admin` subtree, with `createD1AuditSink` wired beside it, so
the club sections use the editors' session [verifiable: aksailingclub-org
src/hooks.server.ts:18,54]. Members remain a separate audience with their own login, the shape
[Add a second audience](../../extend/add-a-second-audience.md) prescribes; this site built it as
its own module on the engine's `auth-crypto` primitives, against its own database, before the
`auth-channel` seam shipped [verifiable: aksailingclub-org src/member-auth/lib/auth.ts:6-14,279,
migrations/asc-auth/].

The size ratio is stated in two halves, both stated as sizes. The first is the increment: what one
more section cost, against the engine subpaths it imports. The second is what the developer never
writes. The whole-layer ratio sits beneath as the size record. All counts are `wc -l` on
2026-09-04 and include comments and blank lines [verifiable:
docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, 1E].

**The increment, per section.** Ten of the eleven sections import `/sveltekit`,
`/admin-toolkit`, and `/components`; `documents/` imports the first two; no section imports
more than four subpaths [verifiable: `grep "from '@glw907/cairn-cms"` per directory under
aksailingclub-org src/routes/admin/club/].

| Section | Route lines | Engine imports it leans on |
| --- | --- | --- |
| Scaffold `signups` (the minimal case) | 90, plus a 9-line migration | `/sveltekit`, `/admin-toolkit`, `/components` [verifiable: examples/showcase/src/routes/admin/signups/] |
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
actions across the eleven sections) and its tests [verifiable: aksailingclub-org
src/admin-club/]. The increment runs from 90 lines to about 3,100 per section [verifiable: the
table].

**What the developer never writes.** The carried modules by name and line count, none of which
the production site reimplements [verifiable: `wc -l` over cairn-cms src/lib/*/ on `main`;
aksailingclub-org imports]:

| Carried by the engine | Module | Lines |
| --- | --- | --- |
| The editor, preview, admin shell, and media library | `src/lib/components/` | 24,595 |
| The route guard, CSRF, admin actions, and the route factories | `src/lib/sveltekit/` | 10,710 |
| The 28-rule admin audit, accessibility included | `src/lib/audit/` | 10,139 |
| The content model and manifest | `src/lib/content/` | 4,378 |
| The doctor's readiness checks | `src/lib/doctor/` | 2,655 |
| The render pipeline and component grammar | `src/lib/render/` | 2,302 |
| The admin toolkit | `src/lib/admin-toolkit/` | 2,267 |
| The second-audience login factory | `src/lib/auth-channel/` | 1,697 |
| Delivery (feeds, sitemap, robots) and media | `src/lib/delivery/`, `src/lib/media/` | 1,508 + 1,315 |
| Magic-link auth, sessions, and access | `src/lib/auth/` | 1,149 |
| The commit and publish path | `src/lib/github/` | 825 |
| The gates | `scripts/checks/` | 33 scripts among 40 files |
| The tests | `src/tests/` | 446 `.test.ts` files |

The sentence the two halves support: a developer adding a section pays a measured increment and
does not write the modules above [verifiable: the two tables].

**The pair, as the size record.** Building something like cairn is one measurement; building
this layer on top of it is the other.

| Measure | The engine (`cairn-cms`, `main`) | One production membership layer (`aksailingclub-org`) |
| --- | --- | --- |
| Source, TypeScript and Svelte, excluding tests | 68,644 lines under `src/lib/` [verifiable: `wc -l` over `src/lib`] | 35,888 lines in 176 files across `src/admin-club` (8,930), `src/routes/admin/club` (12,415), `src/member-portal` (4,997), `src/routes/(site)/my-account` (5,655), `src/member-auth` (914), `src/member-signup` (610), `src/jobs` (814), and the `join`, `classes`, `events`, and `api` site routes (1,553) [verifiable: `wc -l` over those paths] |
| Tests | 446 `.test.ts` files under `src/tests/` [verifiable: `find`; `npm test` on `main`] | 172 `.ts` files, 32,420 lines under `src/tests/` [verifiable: `find`, `wc -l`] |
| Gates | 33 check scripts plus the public-surface snapshot [verifiable: scripts/checks/] | The repo's `ci.yml` (`check`, `test`, `build`, e2e) [verifiable: aksailingclub-org CLAUDE.md] |
| Shipped surface | 18 export subpaths [verifiable: package.json `exports`] | Imports 11 engine specifiers, `/sveltekit` 57 times, the root 44, `/admin-toolkit` 27, `/delivery` 22, `/components` 18, `/cloudflare` 11, `/media` 9, `/delivery/head` 6, `/auth-crypto` 4, `/render` 2, `/delivery/data` 1 [verifiable: `grep` over `src/`] |
| Schema | 3 packaged migration sets (`migrations`, `migrations-app` in the scaffold, `migrations-channel`) [verifiable: package.json `files`, docs/extend/what-the-scaffold-wrote.md] | 125 `.sql` files, 2,844 lines under `migrations/asc-club/`; 2,997 lines under `migrations/` in all [verifiable: `find`, `wc -l`] |
| History | 87 numbered releases, `0.22.0` through `0.96.0` (tagged 2026-08-22), 4,023 commits, 2026-05-24 to 2026-09-04 [verifiable: CHANGELOG.md, `git tag`, `git log`] | 838 commits, 2026-07-06 to 2026-08-30, in named passes with plans and post-mortems [verifiable: aksailingclub-org docs/HISTORY.md] |

What the membership layer reuses from the engine, read from its imports: `requireSession`,
`requireAccess`, `createSectionAction`, and `createD1AuditSink` for gating and audit;
`generateToken`, `hashToken`, `tokensMatch`, `generateSessionId`, and `generateCsrfToken` for
its own member login; `checkRateLimit`; `CsrfField`; and `OfficeList`, `AdminTable`,
`PageHeader`, `StatusChip`, `EmptyState`, `FieldLabel`, `TextInput`, and `SelectInput` for its
screens [verifiable: `grep "from '@glw907/cairn-cms"` over the membership directories]. How it
was built: the passes ran as implementer and diff-reviewer chains under a workflow, with human
interaction points counted per pass, and the 2026-08-25 email-announce pass ran eleven tasks
overnight [verifiable: aksailingclub-org docs/HISTORY.md, lines 9 to 12 and 117].

The minimal case beside it is the scaffold's own worked screen: `admin/signups` is 90 lines
across two files plus a 9-line migration [verifiable:
examples/showcase/src/routes/admin/signups/, examples/showcase/migrations-app/0000_signups.sql].

What the ratio says. The production layer is about half the engine's source line count (35,888
against 68,644), and it is the four-category system enumerated above, with renewal reminders,
refunds, signatures, and a member directory besides [verifiable: aksailingclub-org src/tests/
file names]. The sentence "a small fraction of the whole" is not what this measurement supports,
and this document does not write it [opinion]. What it supports: the layer is SvelteKit routes,
D1 tables, forms, and toolkit lists on 11 engine import paths, and none of it reimplements
authentication crypto, CSRF, the editor, the publish path, or the design system [verifiable: the
import list above]. A smaller organization's layer, a roster and a signup form, sits nearer the
90-line end of the range than the 35,888-line end [opinion]. The site's own records give the
effort in agent tokens and human interaction points, never in hours: events-redesign ran about
2.1M tokens against a ceiling raised from 1.5M to 2.2M; events-admin about 3.5M against 2M;
assets-register about 1.35M through six tasks plus about 2.1M in the close against 1.5M, which
the record calls "roughly twofold"; human interaction points per pass are in single digits
[verifiable: aksailingclub-org docs/HISTORY.md:102,151,198-200]. The overruns are recorded
against their causes, chiefly tests that asserted text rather than mechanics [verifiable:
aksailingclub-org docs/HISTORY.md:153]. No measurement of the skill's effect on an agent
building one of these screens exists in either tree, and the round-2 search found no study that
isolates scaffolding or a context file as a variable on work of this shape [verifiable:
docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md, "Where searches found nothing"].

**Derivable form, for the front door.** One production site carries about 36,000 lines of its
own membership, events, assets, and email code over about 69,000 engine lines it did not write,
on eleven engine import paths, with its member login, payments, and personal data on the site's
side of the line; its custom sections compose the engine's toolkit inside the engine's shell
behind the editors' guard, and the smallest such screen in the scaffold is 90 lines [verifiable:
this section's tables].

## Where this document argues with the reviews

Round 2 ranked twenty changes. This document takes nineteen as written and overrides one: its
first change, which would reverse Leg 5 into the thesis that the partition hands agents the
organization's hardest work. The product owner ruled that Leg 5 is a case report, so the leg
now states the measurements and neither inference [opinion]. Round 1 ranked twelve changes.
This document takes eleven as written [opinion]. It differs on one
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
   comparative form, and any sentence about what agents do best or worst. The "one member
   record" and "one login for editors and members" sentences,
   removed as false. The Classic Editor and Gutenberg numbers, removed as measuring the wrong
   thing. "Edge security as a platform default," narrowed to TLS and DDoS protection with the WAF
   subset stated.
3. **Whether to name the outage.** The 2025-11-18 postmortem is the strongest single-vendor
   counter-evidence. Naming a dated incident on a front door may read as defensive; omitting it
   leaves the reader to supply it. The register's vendor rule settles the form: on a published
   page the incident is a dated link, and the duration table stays in this record.
4. **Email Sending against the free deploy.** The scaffold's Cloudflare chapter deploys on the
   free plan, and Email Sending needs the paid plan; the front door has to state the boundary
   before the step that crosses it.
5. **Evidence gaps, after two research passes.** No controlled study of agent success
   conditioned on framework scaffolding, test coverage, or documentation quality as an isolated
   variable. No study pricing custom code on a scaffolded stack against configuring a product. No
   survey with a stated n on non-technical editors' experience of markdown against rich text. No
   churn or retention data for git-based CMSs. No independent measurement of WordPress
   maintenance hours for small organizations, and no peer-reviewed study of plugin abandonment.
   No study of multi-vendor operational cost for small teams. No WordPress annual survey after
   2023. METR's original study does not condition on task type. Four citations remain unfetched:
   the WordPress 5.0 release post, GitHub's App-authentication page for bot-committer wording,
   Universal SSL's "unshared" wording at the free tier, and the Cloudflare status incidents for
   2026-08-07 to 2026-08-25.
6. **A measured worked example.** The measured pair above sizes the code, and the production
   site's records give token spend per pass; nothing yet measures one screen's effort in
   isolation. One custom screen built on a cairn site with an agent, its diff size, files, and
   passes recorded, would be the first evidence for Leg 5's economic half. Whether to build it
   before the figure ships is a product decision.
