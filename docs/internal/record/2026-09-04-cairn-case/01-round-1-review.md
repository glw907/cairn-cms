# Adversarial review: the front-door concept figure argument

Read-only review of `front-door-concept-brief.md` (ratified 2026-09-04). Grounded against
`CLAUDE.md`, `docs/internal/what-cairn-is-and-is-not.md`, `docs/why-cairn.md`,
`docs/internal/docs-register.md`, `docs/extend/architecture.md`,
`docs/extend/add-a-custom-admin-screen.md`, `docs/extend/add-a-second-audience.md`,
`docs/extend/announce-on-publish.md`, `docs/extend/what-the-scaffold-wrote.md`,
`examples/showcase/wrangler.jsonc`, `package.json`, `skills/`.

Vendor claims carry a confidence label. Nothing was verified against a live vendor page in
this session, so no number is asserted that the repo does not already cite.

---

## 1. The skeptical developer

I have run WordPress plus a membership platform for a club. Here is where the comparison does
not survive contact.

### 1.1 The panels are not comparable, because the two named exemplars are different shapes

The brief captions Panel A with two examples at once: "WordPress with MembershipWorks" and
"the bundled-platform variant such as Wild Apricot". The drawing then commits to one shape,
two systems with two logins and two interfaces. That shape is wrong for both examples in
different directions.

Wild Apricot is a single product. It carries its own website builder, its own content pages,
its own member database, and one member login across the site and the portal (high
confidence). Drawing it as two systems with two authentication systems and two non-interacting
databases is not a steel man, it is a factual error about the named vendor. A reader who runs
Wild Apricot will see the error in two seconds and stop reading.

MembershipWorks is built to embed into an existing site (medium-high confidence). Its member
pages render on the site's own domain inside the site's own template. So "the portal in the
platform's look and the website in the CMS's" overstates the seam for the other named exemplar
too. What is true for MembershipWorks is that the member record lives in the vendor's store and
the styling is only partly yours.

A steel man must pick one shape and caption it with a vendor that actually has that shape.

### 1.2 Panel A's advantage list omits most of what the traditional shape actually does

The brief lists mature editorial features, a membership product, replaceability, specialist
vendors, and configuration over code. That is an abstract list. The concrete capabilities it
omits are the ones a club actually buys the platform for:

- **Event registration with payment**, waitlists, capacity, per-ticket-type pricing, attendee
  lists, and check-in.
- **Dues automation**: recurring renewals, proration, lapsed-member state machines, automated
  renewal reminders, invoices, and receipts. This is the single largest omission. It is months
  of bespoke work, and it is boring, high-consequence, money-touching work.
- **Member directory** with member-controlled visibility and profile fields.
- **Bulk email with list management**: subscription state, unsubscribe handling, bounce and
  complaint suppression, send reputation, per-message delivery reporting.
- **Data export and privacy tooling**: full member export, and a defined path for a deletion
  request.
- **Themes and a plugin ecosystem** for the site half, which is what lets a volunteer add a
  photo gallery on a Saturday without a developer.
- **Vendor support with a support contract**, and a labor market of people who can be hired to
  work on it.

Panel B's drawback 1 currently says only "extending cairn means writing custom code". That
understates by an order of magnitude. The honest drawback is that everything in the list above
is code the site writes, owns, tests, secures, and keeps running.

### 1.3 Panel A's cost list omits WordPress's real costs, which cuts against cairn

For fairness in the other direction: the brief's Panel A cost list omits the update and
security treadmill (core, theme, and plugin updates, plugin abandonment, compromise risk),
plugin-conflict debugging, backups, and performance work. Those are real, they are the strongest
factual case for the cairn shape, and leaving them out makes the panel neither a steel man nor a
fair account. Their absence is evidence that the cost list was assembled to support the
conclusion rather than to describe the shape.

### 1.4 "One member record" is not honest

Panel B claims one member record while Panel A is charged with duplicated data. In the cairn
shape a real club has, at minimum:

- the row in the site's own D1 table,
- the customer and subscription object at the payments provider, which owns billing state,
  dunning, card-on-file, and the renewal clock (high confidence: this is what a payments
  provider is),
- the mailbox or group at the organisational mail provider,
- and, if members sign in, a separate auth-channel store. The repo's own
  `add-a-second-audience.md` says a member population uses `createAuthChannel`, "a wholly
  separate login with its own D1 store, its own session, and its own area outside `/admin`
  entirely", and `examples/showcase/wrangler.jsonc` carries `MEMBER_DB` as a third database
  beside `AUTH_DB` and `APP_DB`.

So the cairn shape has one *self-owned* member record and at least two external records it must
reconcile by webhook. Panel A has the same reconciliation problem, except the platform vendor
has already solved the payments half of it. The brief's claim inverts the actual advantage.

The related structural dishonesty is drawing the payments provider and organisational mail
"identically in both panels". They are not identical. In Panel A the payments provider arrives
pre-integrated with the membership product: dues, renewals, invoices, and reconciliation are
configuration. In Panel B the same box means a webhook endpoint, idempotency handling, a
subscription state machine, refund and failed-payment paths, and reconciliation code the site
maintains. Drawing them as the same box is the single most misleading element in the figure.

### 1.5 "Custom announcements screen" is not honest either

Announcements to a member list is the hardest thing on the cairn side of the figure, and the
figure presents it as a screen.

Cloudflare Email Sending is a transactional-mail binding. It has no list management, no
subscription or unsubscribe state, no bounce or complaint suppression, no campaign composition,
and no deliverability reporting (high confidence on those absences; the exact per-account and
per-domain rate limits are documented by Cloudflare and I will not assert numbers here, medium
confidence). Arbitrary recipients require Workers Paid (high confidence; stated in the repo's
own `CLAUDE.md`).

That means the announcements screen the figure draws is, honestly enumerated: a recipient list,
subscription state per member, an unsubscribe link and its handling endpoint, a suppression list
fed by bounces and complaints, per-send batching against rate limits, retry and partial-failure
handling, SPF/DKIM/DMARC alignment, and a record of what was sent to whom. The repo already
knows this. `docs/extend/announce-on-publish.md` says plainly: "The engine sends nothing over
the network on its own", and the fan-out is "entirely yours to build". The engine ships a pure
manifest diff, not an announcement system.

There is also a regulatory dimension the figure ignores. Bulk mail to a membership list needs a
working unsubscribe mechanism and honoring of opt-outs (high confidence on the general
requirement under CAN-SPAM, and stricter consent rules under GDPR). Panel A's platform ships
that. Panel B's site builds it.

### 1.6 GDPR, export, and the git problem

The figure claims git gives history, review, and backup. It does not mention that content in git
also means a permanent, distributed, hard-to-redact record. If a member's personal data ever
lands in a content file, a deletion request means rewriting git history across every clone and
fork (high confidence). Panel A's platform has an export button and a delete-member path.

This is the one place the figure's advantage and a real legal obligation point in opposite
directions, and it is unmentioned.

### 1.7 Real total cost of ownership, and the bus factor

The figure's implicit TCO argument is "one platform bill beats several". The bills are the small
number. Honest TCO for the cairn shape:

- Cloudflare Workers Paid, $5/month per account, plus domain (the repo's own
  `docs/admin/before-you-start.md` says about $6/month, and flags that certificate charging is
  unconfirmed).
- The GitHub account.
- The payments provider's percentage, identical in both panels.
- **Developer time to build the member, dues, events, and announcements functionality.** This
  dominates everything else and is not on the figure.
- **Developer time in perpetuity**: dependency upgrades, SvelteKit and Cloudflare platform
  changes, cairn's own pre-1.0 seam movement (`why-cairn.md`: "seams still move", a seam moved
  across two minor releases inside the tier meant to stay frozen), and every bug in the bespoke
  code.

And the question the figure cannot answer: when the developer leaves, who maintains it? A
WordPress plus Wild Apricot club can hire from a large, cheap, well-defined labor market, or can
limp along with a volunteer clicking around an admin. A bespoke SvelteKit-on-Workers app with a
custom dues state machine has a labor market of roughly one person. `why-cairn.md` already
states the honest version of this: "A developer stays in the loop for anything past writing and
publishing... If your organization doesn't have that person and doesn't plan to, weigh that
before you start." The figure drops that warning at exactly the moment it matters most.

### 1.8 Verdict from this stance

The comparison is unfair in four specific, fixable places: the Panel A exemplars do not match the
Panel A drawing; Panel A's capability set is under-enumerated; the two outside boxes are drawn as
equivalent when they are not; and Panel B's "one member record" and announcements screen are
claims about work not done rather than capability delivered. It is also unfair to Panel B, by
omitting WordPress's maintenance and security burden.

---

## 2. The register keystone

The standard: "Nothing anywhere in the docs is a pitch"; "No marketing claims and no
benefit-forward framing. Every factual claim is literally true." The front-door section adds that
extension examples "state what could be built; they never pitch."

### 2.1 The killed specimen is nearly the same sentence

`docs-register.md`'s Calibration specimens list, under **Killed**:

> "The whole organization works in one place, content and custom functions sharing one admin and
> one sign-in." Marketing register and factually false.

The brief's Panel B advantage list reads: "one app, one repository, one platform; one login and
one interface for editors and members; one member record; one deploy". That is the killed
sentence rendered as a bullet list and put on the front door as artwork. The kill was on two
counts, and both still apply. This is the review's single most decisive finding, because it is
this repo's own prior ruling against this exact claim.

### 2.2 Claim-by-claim audit of Panel B

Verifiable as general fact, keep:

- One SvelteKit app containing the public site and `/admin`. True (`architecture.md`).
- Editors sign in by email and write markdown with live preview. True.
- The admin frame is DaisyUI on Tailwind. True (`CLAUDE.md`, `admin-design-system.md`).
- Content is markdown in the site's GitHub repository; a save is a commit on
  `cairn/<concept>/<id>`; publish copies it to the default branch; committer is
  `cairn-cms[bot]`, author is the editor. True (`architecture.md`, the write-path diagram).
- The site's own admin screens mount through documented seams. True
  (`add-a-custom-admin-screen.md`).
- D1 backs the sign-in store; R2 backs media; Email Sending carries magic links. True
  (`wrangler.jsonc`).
- `create-cairn-site` emits a working site with a starting theme. True
  (`what-the-scaffold-wrote.md`; the theme is Waymark, and it is one theme, not a choice of
  themes).
- The npm package ships agent skills. True but overstated as plural: `package.json` `files`
  includes `skills`, and `skills/` contains exactly one skill, `cairn-admin-screens`, scoped to
  admin screens. "ships an agent skill for building admin screens" is the true form.

Not verifiable, flag each:

- **"one login and one interface for editors and members".** False as engine fact. Members are
  not editors. `add-a-second-audience.md` routes a member population to `createAuthChannel`,
  which is a separate login, a separate session, a separate D1 store, and an area outside
  `/admin`. The charter is explicit: cairn "only ever knows owner/editor". Delete or restate.
- **"one member record".** Opinion at best, false at worst (section 1.4). Delete.
- **"edge security ... as platform defaults".** Overreach. TLS and DDoS mitigation are on by
  default at every plan tier (high confidence). The full Cloudflare managed WAF rulesets, rate
  limiting beyond a minimal rule, and bot management are paid add-ons above the Workers Paid
  plan the docs quote (medium-high confidence). Narrow the claim to "TLS and DDoS protection",
  which is defensible, or link Cloudflare's own page per the vendor-specifics rule.
- **"D1 ... available for the site's own data".** True and already demonstrated
  (`APP_DB` in `wrangler.jsonc`). Keep, but it is a binding you configure, not something cairn
  provides.
- **"Workers Builds for the deploy from the repository (the scaffold's default path)".** Check
  this against `docs/admin/own-your-domain.md`, which presents connecting Workers Builds as a
  later, optional step needing a second, wider API token. If it is optional, "default path"
  is wrong.
- **"so agent-assisted development works against known ground".** Pure forecast, and the phrase
  "known ground" is a grading word wearing a noun's clothes. Not verifiable in any form.
- **"potentially fragile integrations"** and **"awkward and duplicated interfaces"** in Panel A's
  cost list. "Potentially" is a hedge that admits the claim is not a fact. "Awkward" is a grading
  adjective, and the brief's own register constraints forbid adjectives that grade either side.
  The brief violates its own rule in its own text.

### 2.3 The core argument caption fails the register outright

The caption, as briefed, contains four unverifiable claims in three sentences:

1. "Before coding agents, cairn's custom-code model suited few teams." A market-history claim
   with no evidence and no way to source one.
2. "that custom code is a smaller lift". A comparative grading claim. "Smaller" is exactly the
   grading word the brief bans.
3. "the result is one app with one interface for the organisation's people". False for members
   (2.2), and marketing register.
4. "at a lower development cost than integrating separate products". A quantitative comparative
   claim with no measurement behind it, and the one most likely to be wrong: integrating
   MembershipWorks into WordPress is configuration, and building dues automation is not.

What evidence would make any of it verifiable? Only three kinds, and none is currently in hand:

- **The repo's own shipped artifacts**, stated as artifacts rather than as outcomes: cairn ships
  one agent skill for admin screens, and the seams are documented on N pages of the extend track.
  That supports "the engine ships agent-facing material", not "the lift is smaller".
- **Vendor documentation**, cited by link: GitHub and Cloudflare both publish agent tooling. That
  supports "vendor agent tooling exists", not that using it produces a cheaper result.
- **A worked example with a measurement**: a named screen, built on a cairn site, with the
  artifacts (the diff size, the files, the elapsed passes) stated. That is the only evidence that
  would support a cost claim, and even then it is one data point, so the honest form is "here is
  what one screen took", not "development costs less".

The load-bearing recommendation: the front door can state the mechanism (custom code, documented
seams, widely documented stack, vendor agent tooling, one shipped skill) and let the reader draw
the cost conclusion. It cannot draw the conclusion for them without becoming a pitch.

### 2.4 Naming vendors in the caption

The register's vendor rule is narrower than the brief assumes. It says "A vendor's specifics get
a link, never a copy", and its concern is staleness of copied dashboard paths, tiers, and pricing.
Naming SvelteKit, Cloudflare, GitHub, and DaisyUI is fine, and the front-door section explicitly
welcomes stack reasoning.

The breach is elsewhere. Naming WordPress, MembershipWorks, and Wild Apricot as the losing side
of a comparison is competitive positioning, which is a pitch structure regardless of how factual
each individual sentence is. The front-door section also says examples "never pitch" and forbids
naming a specific consumer site; naming a specific competitor is the same defect pointed outward.
Add the staleness problem: those three products ship features continuously, so any characterisation
of them is wrong on a schedule cairn does not control, which is precisely the reasoning behind the
vendor-specifics rule.

Generic roles in the artwork with no vendor names in the caption either is the register-clean
form.

---

## 3. The charter

The boundary: "cairn owns its core job, managing markdown content and the editor/admin frame, and
little else. Everything a site needs beyond that... belongs to the developer, and cairn serves it
with a thin seam, not a built-in feature."

### 3.1 The figure puts developer-owned functionality inside the cairn box

Panel B lists, as cairn-side contents: "Custom member management and a custom announcements screen
as screens inside the same admin: one login..., one member record, announcements sent through
Cloudflare Email Sending." Read as a drawing, these sit inside the panel labelled with cairn's
stack, opposite a panel whose membership features are vendor-supplied. The visual grammar of a
two-panel comparison is capability-for-capability: whatever is in the right panel answers whatever
is in the left. A reader will conclude that cairn answers Wild Apricot's membership module.

The charter's own scar tissue is directly on point. `what-cairn-is-and-is-not.md` records that an
extensibility effort "misread 'let developers extend cairn' as 'cairn should own an identity and
permissions substrate', and grew a principal model, scopes, trust tiers, and member login in the
engine before it was caught and reverted", and that "correctness and security reviews all passed,
each checking the design within the wrong premise". A front-door figure that shows member
management as a cairn-panel capability re-establishes exactly that wrong premise, in the most
public place cairn has, to the audience most likely to act on it.

This is a charter problem before it is a drawing problem. The premise check runs first.

### 3.2 The "one login" claim contradicts the charter directly

The charter: cairn "never names or models a domain actor; it only ever knows owner/editor". The
brief: "one login and one interface for editors and members". These cannot both be true. The
brief's parenthetical, "the same magic-link editor session", is correct for a staff-shaped screen
and wrong for members. If the figure means staff, it must say staff and drop "members". If it
means members, the claim is false.

### 3.3 The Cloudflare consolidation claim

Partly sound, partly overreach.

- "one Cloudflare account supplies... hosting and the CDN edge": accurate.
- "D1 for the sign-in store (and available for the site's own data)": accurate, and demonstrated
  by `APP_DB`.
- "R2 for media": accurate.
- "Email Sending for magic links and announcements": accurate for magic links, and misleading for
  announcements (section 1.5). Email Sending supplies a send primitive, not an announcement
  capability.
- "TLS and edge security as platform defaults": TLS yes, "edge security" as an unqualified noun
  no (section 2.2).
- "Workers Builds for the deploy... (the scaffold's default path)": verify against
  `docs/admin/own-your-domain.md` before asserting "default".
- "DNS can sit at Cloudflare, so no registrar box": true, and worth noting that DNS still has to
  sit *somewhere*, so this is a consolidation of billing relationships rather than the removal of
  a component. Removing the box from the drawing while Panel A keeps one is a visual overclaim.

The broader honesty point: the drawback "one platform account is one vendor" is stated but not
weighted. The cairn shape has no abstraction layer over Cloudflare; `why-cairn.md` states it
plainly ("None of these choices is reversible piece by piece"). Panel A's advantage "each part
replaceable independently" is therefore a genuinely large asymmetry the figure lists once and then
lets the visual overwhelm.

### 3.4 Does the figure promise seamlessness the engine does not deliver?

Yes, in one specific way. The figure's argument is carried by shape: fewer boxes on the right
means fewer joins. But the joins have not disappeared, they have moved inside the app where the
developer maintains them. The payments webhook, the member-to-payment reconciliation, the mail
subscription state, the member auth channel: each is a join, and none is drawn. A drawing that
shows Panel A's integration line and does not show Panel B's four internal ones is making an
argument with an omission rather than with a fact.

---

## 4. The git-managed-content section, under all three stances

### 4.1 Facts checked against the tree

True as written:

- **Per-entry holding branch, `cairn/<concept>/<id>`.** True (`architecture.md`, the write-path
  diagram; the log-events table carries `branch` on a save).
- **Publish copies the holding branch onto the default branch.** True. One precision note: the
  branch name is the adapter's `backend` field (`githubApp({ ..., branch: 'main' })` in
  `docs/reference/core.md`), so "`main`" is the default, not an engine constant. Say "the site's
  default branch".
- **The GitHub App commits on the editor's behalf, attributed to them.** True, and stronger than
  the brief states: author is the editor, committer is `cairn-cms[bot]`, so attribution and App
  identity both survive in history.
- **Editors never touch git.** True, and it is the founding claim of `why-cairn.md`.
- **Media lives in R2, so content is split across two stores.** True (`wrangler.jsonc`
  `MEDIA_BUCKET`; `data-tiers.md`).
- **D1 holds sign-in state and, if the site chooses, its own data.** True (`AUTH_DB` and `APP_DB`
  in `wrangler.jsonc`).

Not true, or true only with a qualifier the brief omits:

- **"drafts and the live site are branches, not flags in a table".** Both halves are wrong. Drafts
  are also a frontmatter flag: `docs/reference/core.md` shows a `status` field defaulting to
  `draft`, `ManifestEntry` carries a "draft flag", and `announce-on-publish.md` keys its diff on
  an entry being "live (not a draft)" plus a `publishedAt` stamp. So cairn has holding branches
  *and* a draft flag, and the flag lives in a committed JSON projection that is, functionally, a
  table. The sentence trades accuracy for a rhetorical antithesis.
- **"There is no content database to host, back up, migrate, or secure."** Overclaim on all four
  verbs. The committed content manifest (`src/content/.cairn/index.json`, plus `media.json`) is a
  projection of every entry's identity, routing, draft state, and outbound edges, rebuilt at build
  and patched in the same commit as a save; `serializeManifest`/`verifyManifest` exist because it
  has to be kept consistent. That is a content index with a maintenance contract, whatever it is
  called. Meanwhile D1 does need migrating (`migrations/`, `migrations-app/`, and the showcase's
  third `migrations-members/`, each with its own directory precisely because cross-applying them
  breaks things), and R2 needs securing. The honest form is that the *content bodies* are files,
  so there is no content server to run; the index, the auth store, and the media store are all
  still stores.
- **"no content database to secure" as a security claim.** The attack surface moved, it did not
  vanish. Write access to content is now the GitHub App private key, and the repo's own `CLAUDE.md`
  and `docs/extend/rotate-the-github-app-key.md` exist because that key is a real credential with
  a rotation procedure. A leaked App key is write access to published content. A reader entitled to
  compare security postures should be told what replaced what.
- **"Backup and portability come free."** "Come free" is a grading phrase and the brief's own
  register constraints forbid them. It is also not free: backup is as good as the organisation's
  GitHub account, which is one account, one billing relationship, and one place to lose access.
- **"movable to any other markdown-reading tool"** (and the subsection's "readable and writable
  without any tool, so the content outlives cairn"). This is the section's largest overclaim, and
  the next subsection contradicts it directly. cairn content carries frontmatter typed to a
  site-defined fieldset, `cairn:` link targets keyed on permanent ids, `media:` references
  resolving through R2, fragments, and remark-style directives for components and islands
  (`configure-rendering.md`, `link-content-with-references.md`, `add-an-island.md`). Another
  markdown tool reads the prose and renders none of that. The true claim is narrower and still
  worth making: the bodies are plain text a human can read and a tool can parse, and no export
  step stands between the organisation and its content.
- **"a push to `main` deploys the site, so a content change and a design change ride the same path
  and the same review".** Conditional, and partly contradicted by the mechanism. The push-deploys
  path requires Workers Builds connected, which `docs/admin/own-your-domain.md` presents as a
  later optional step needing a second, wider API token; a site may deploy with `wrangler` instead,
  which the brief itself concedes in Panel B. And "the same review" is false for the editor path
  by design: a publish from `/admin` commits straight to the default branch with no review gate at
  all. That is the correct design for a club editor fixing a typo, and it is the opposite of what
  "the same review" implies.
- **"Developers get everything git gives code: pull requests on content, blame, bisect, CI."**
  "Everything" is doing too much work. Two caveats belong here: a hand commit does not patch the
  manifest, so content edited outside the admin relies on the build's `cairnManifest` plugin to
  regenerate it (`what-the-scaffold-wrote.md`), and a human PR against a `cairn/...` holding branch
  is racing an admin that owns that branch. Say "content is reviewable in git" and drop
  "everything".

### 4.2 Are the drawbacks complete and honest?

The five listed are real and fairly stated, with one wording defect and several omissions.

The wording defect: **"Concurrent edits to one entry are serialised by the per-entry branch."**
Nothing serialises. The branch isolates *different* entries from each other; two editors on the
*same* entry collide, and the engine's own log vocabulary records that as `commit.failed` with
`reason: conflict` on a 409 (`docs/reference/log-events.md`). The honest statement is that a
concurrent edit to one entry is detected and refused, and the second editor loses their attempt,
which is a stronger admission than "serialised" and is the one an evaluator needs.

What a database gives that files do not, omitted entirely:

- **Enforced structured validation.** The fieldset validates in the admin. A commit made in git
  bypasses it, so the schema is a convention at the store rather than a constraint. A database has
  constraints the store itself refuses to violate.
- **Referential integrity in real time.** cairn's `reference` edges get a build-time integrity
  check and a delete guard (`link-content-with-references.md`), which is genuinely good, and it is
  a check, not a constraint. Between builds the repository can hold a dangling edge.
- **Transactional edits across entries.** A change that must touch several entries atomically has
  no transaction. It is one commit if the code assembles one, and partial states are reachable
  otherwise.
- **Per-field and per-row permissions.** cairn gates by route and role
  (`restrict-admin-access.md`). It has no notion of one editor owning one row, or a field only an
  owner may set.
- **Concurrent multi-writer semantics generally**: no locking, no optimistic-version merge, no
  collaborative editing.
- **Reads without a network hop.** Every uncached content read crosses the GitHub API, which is
  rate-limited per installation, and the manifest exists specifically to avoid crawling the repo
  (`architecture.md` says so). That is an architectural cost worth naming beside "no database to
  host".
- **Repository ceilings.** GitHub publishes size guidance and hard limits per repository and per
  file (high confidence that limits exist; I am not asserting the numbers). A content repository
  with long history has a ceiling a database does not.
- **Erasure.** Repeating the section 1.6 finding, because it belongs here too: personal data that
  reaches a content file is in history across every clone, and removing it means rewriting history.
  A database has `DELETE`.

None of these makes the choice wrong. Every one of them is the kind of fact this section claims to
be trading in, and a reader who has run a CMS will notice which ones are missing.

### 4.3 Register and charter reading of this section

Register: the section is the best-written part of the brief, and it still carries three banned
forms. "Come free" is a grading phrase. "Everything git gives code" is a superlative. "not a
feature the CMS has to build" and "not a flag in a table" are both the not-X-but-Y contrast frame
the workstation prose rules ban outright, and the second one is false besides.

Charter: this section is charter-clean. It describes what cairn owns, it makes no claim about
domain functionality, and its drawbacks point work at the developer where the charter puts it. If
the figure keeps only one argumentative section, this should be it, after the fixes above.

## 5. The "And why markdown" subsection

### 5.1 The directive and frontmatter claims are wrong in one specific way

The brief says: "richer pieces (a callout, a figure, an embed) are named directives cairn's
component grammar renders".

cairn does not ship a callout, a figure, or an embed. It ships the mechanism.
`docs/extend/configure-rendering.md` is explicit: "An empty registry still renders plain markdown,
GFM tables, `cairn:` links, and `media:` references correctly", and a component is something the
site declares with `defineComponent`, supplying its own `build` function against hast, its own
attributes, and its own slots. The page's worked example is a callout precisely because the
developer writes it. The engine supplies `cardShell`, `headRow`, and `iconSpan` as helpers, and
`attributes` accepts exactly ten field descriptors.

So the true statement is: cairn ships a directive mechanism and a small set of hast helpers, and
the site declares the vocabulary its editors get. The brief's phrasing implies a shipped component
library, which is the same charter error as section 3.1 in miniature, and it is the one an
evaluating developer will test first by looking for the component list and not finding it.

Frontmatter is stated correctly. "Structured fields ride in frontmatter" is true, typed by the
concept's fieldset (`define-an-adapter-and-schema.md`, `core.md`).

### 5.2 "The most widely read text format by coding agents and language models"

Opinion wearing a superlative, and unverifiable in the form given. There is no measurement of
"most widely read format" that anyone publishes, and the sentence cannot be sourced.

There is a real, defensible claim underneath it, and cairn's own charter has already written the
disciplined version. `what-cairn-is-and-is-not.md` says content in markdown over a structured
manifest is "the cleanest input an LLM can get", and, in the same bullet, warns to invest "where
machine consumption is actually evidenced rather than where a standard is merely hyped". The
brief's superlative is the hyped form the charter is warning against, on the front door.

The evidence-shaped replacements, in increasing strength:

- **A mechanism statement, no comparison**: the content is plain text with no extraction step, so
  a tool or a model reads the file itself rather than a database export or a rendered page. Fully
  verifiable, needs no citation.
- **A vendor-documented statement, cited by link**: model providers publish markdown as the format
  their own tooling emits and consumes. That is checkable and links out per the vendor rule.
- **A repo-artifact statement**: cairn ships raw markdown an agent can request, per-topic feeds
  emitted at build, and one agent skill in the npm package. Those are objects in the tree.

Any of the three is stronger than the superlative, because a superlative that cannot be sourced
invites the reader to discount the sentences around it.

"The format is stable, so a file written today reads the same in a decade" needs one qualifier to
be true. The core is stable because CommonMark stabilised it and GFM's additions are settled (high
confidence). cairn's own directives, `cairn:` targets, and `media:` scheme are not covered by that
stability, and cairn is pre-1.0 with seams that have moved inside a frozen tier
(`why-cairn.md`). Scope the stability claim to the markdown, or it contradicts the honest
trade-offs page.

### 5.3 The drawbacks

Better than the git section's, and honest as far as they go. Three additions:

- **Editors must learn markdown syntax.** The brief says "editors write markdown, with live
  preview", which states the fact without stating the cost. Panel A's WordPress editor is a
  block-based visual editor a volunteer already knows. This is the sharpest daily-usability
  difference in the whole figure, and it is a genuine reason a club chooses the other shape.
- **The directive vocabulary is per-site.** An editor moving between two cairn sites gets a
  different set of callouts and embeds, because the vocabulary is the site's. That is a
  consequence of 5.1 and follows from it honestly.
- **The portability the section claims is bounded by the same directives.** Whatever the file
  gains in structure, it loses in "readable without tooling". The subsection should say this
  itself rather than leaving it for a reader to notice, since it sits four bullets below
  "movable to any other markdown-reading tool".

Register note: "so the file stays plain while the page does not" is the setup-payoff cadence the
docs register lists among its killed forms, and it is doing rhetorical work the facts already do.

## 6. The "Why no page builder" subsection

### 6.1 The separation claim is false as written, and true in a narrower form

"the file carries no layout" is not true of cairn. A directive in a content file names a
component and carries attributes: `configure-rendering.md`'s worked callout declares a `tone`
select with `note`, `tip`, and `warning`, and `attributes` accepts `icon` among its ten
descriptors. An island goes further, naming a hydrating component and its props inside the file
(`add-an-island.md`). A file that says "render a warning callout with this icon here" is carrying
layout and presentation, in a different serialization than a block editor uses.

Where the line actually sits, and this is worth stating because it is the real argument:

- A cairn directive stores a **reference to a site-owned component plus a small declared
  attribute set**. What that component looks like lives in code, changes for every page at once
  when the developer changes it, and cannot be overridden per occurrence.
- A page builder typically stores **per-occurrence presentation**: widths, colors, spacing,
  breakpoints, nesting. Two instances of the same block can diverge, and a theme change does not
  reach them.

That is a genuine, defensible distinction, and it survives scrutiny. "No layout in the file" does
not.

"No editor can break the layout" is a second absolute that will not hold. An editor can pick the
wrong directive, choose a variant that reads badly, write a heading long enough to wrap into three
lines, or place a figure where the flow suffers. The defensible version is that an editor cannot
change the site's design language or override a component's styling, which is the claim actually
worth making.

### 6.2 The migration claim flattens three very different things

"block markup, shortcodes, builder JSON" are named in one breath as if they lock in equally. They
do not (high confidence on the mechanisms, which are public and stable):

- **Proprietary builder JSON** (Elementor, Divi and their peers) is the strong case. Content is
  stored in the builder's own structure, and removing the builder leaves unusable output. The
  brief's claim is fully true here.
- **Shortcodes** are middling. They are plugin-specific and degrade to visible literal text, which
  is bad, and they are trivially findable and rewritable.
- **WordPress core block markup is the weakest case for the claim, and it is the one the brief
  leans on.** A block-editor post is stored as HTML with `<!-- wp:... -->` comment delimiters. Read
  without WordPress it is valid, readable, renderable HTML, and the delimiters are ignorable
  comments. That is arguably *more* portable than a cairn directive, which renders as inert literal
  text in any tool that does not know cairn's registry.

So the brief's portability argument, aimed at the block editor, points back at cairn. The section
also omits cairn's own symmetrical migration cost, which the repo already documents: moving
existing content *into* cairn is a real project (`docs/extend/migrate-existing-content.md`), and
moving out means resolving the site's own directive vocabulary, `cairn:` id links, and `media:`
references.

### 6.3 The Classic Editor and Gutenberg-rating citation should be cut

This is the weakest element in the entire brief, and the only one I would call a defect of
integrity rather than of precision. Five separate problems, any one of which is disqualifying:

1. **It measures the wrong thing.** Classic Editor installs are dominated by sites that predate
   2018 and never migrated. That is transition friction on existing sites, not evidence about the
   editing model an organisation should choose today. The brief's closing sentence, "An
   organisation choosing a site today is choosing the editing model its editors will live with",
   is exactly the inference the data does not license, and the brief makes it explicitly.
2. **It cites the wrong artifact.** The Gutenberg listing on wordpress.org is the development and
   feature plugin, not the editor that ships in WordPress core (high confidence). Its rating is
   heavily weighted by the 2018 launch period and by users rating a beta channel. A WordPress user
   in 2026 does not experience that plugin. Citing its star rating as evidence about the core
   editor is citing a number that does not measure the thing named.
3. **The conclusion does not follow even if the data were clean.** Classic Editor restores a
   TinyMCE WYSIWYG box. If the evidence shows editors preferring Classic Editor, it shows editors
   preferring *a different visual editor*, which is closer to a page builder than to markdown. The
   citation, taken at face value, argues against cairn's editing model rather than for it.
4. **It is an argument from a competitor's dissatisfaction**, which is the most pitch-shaped move
   available and lands on the front door of a docs corpus whose keystone is "Nothing anywhere in
   the docs is a pitch." The register's front-door section permits stack reasoning; it does not
   permit competitive negative evidence.
5. **The numbers rot and cairn owns them.** Install counts and ratings move continuously. The
   vendor-specifics rule exists for exactly this: "a restated detail is wrong on a schedule cairn
   does not control, and a reader trusts it precisely because it looks specific." Putting two
   live-moving competitor metrics into artwork is the worst case that rule contemplates.

Cut it. The subsection's first three bullets stand on their own without it, and they are stronger
without a citation a hostile reader can dismantle in a paragraph, because dismantling it discredits
the bullets it was brought in to support.

### 6.4 The counterweight is honest and too narrow

"a magazine, a landing-page factory" sets the bar at publications. The real boundary is lower and
more common: any organisation that wants a one-off page for one event, laid out differently from
every other page, needs a developer under cairn and needs nobody under a builder. Say that, because
a club committee wanting a special page for the annual regatta is the reader, not a magazine.

### 6.5 Register reading

The heading itself, "a feature, not only a cost", is the not-X-but-Y contrast frame the prose rules
ban. "It is also, for an organisation's site, an advantage" is a grading claim in the brief's own
banned category, in a section whose second clause promises the argument is "made from facts rather
than taste". And the whole subsection is an argumentative essay attached to a figure, which is the
form problem of section 7 appearing again at a smaller scale.

## 7. Is the two-panel contrast the right form?

No. Three reasons, in order of weight.

**It is structurally a pitch.** The keystone says the docs "have no stake in whether the reader
adopts it". A two-panel us-and-them figure has a stake in its geometry: the reader's eye counts
boxes, and the count is the argument. The brief tries to fix this with balanced text (drawbacks
"stated with the same weight"), but text cannot neutralise a layout. The eye reads the shape
before it reads any label, which the brief itself says is the goal: "The eye should recover,
before reading: two systems and several vendors on one side against one app". That sentence is an
admission that the figure argues before it informs.

**It forces a false equivalence.** Panel A is a product category with vendor-supplied
capabilities. Panel B is an architecture with developer-supplied capabilities. Drawing them at the
same altitude in the same visual language makes "member management" look like the same kind of
object on both sides, when on one side it is a purchase and on the other it is a project. Every
one of the section 1 findings descends from this single form error.

**It cannot be kept true.** WordPress, MembershipWorks, and Wild Apricot ship features. Any
characterisation of them on cairn's front door begins decaying the day it is drawn, and cairn owns
keeping it accurate, which is exactly the failure mode the vendor-specifics rule exists to prevent.

### The form that argues better and more honestly

**One system, drawn with its boundary.** Draw the cairn shape alone: one repository, one Worker,
one app containing the public site and `/admin`, and inside `/admin` two visually distinct kinds
of screen, cairn's own (content, media, editors) and the site's own (mounted through named seams).
Draw the boundary as a real line. Outside it, draw what stays outside for everyone: the payments
provider, organisational mail, and the member-facing auth channel if members sign in. Label the
seams with their real names.

This form does every job the brief wants and none of the harm:

- It teaches the lesson the brief actually states, "cairn is both a working out-of-the-box CMS and
  an extensible admin tool", which is a claim about one system and needs no second system to make
  it.
- It shows what is inside and what is outside, which is the charter's boundary drawn literally,
  and therefore cannot imply cairn ships member management.
- It shows the joins honestly, because the boundary crossings are the drawing's subject.
- It names no competitor and needs no maintenance when a competitor ships a feature.
- It matches the reader the brief specifies: a developer choosing an architecture, who does not
  need to be told what WordPress is.

The comparative material, where any survives the register, belongs in `why-cairn.md` as prose,
where it can carry qualifications a drawing cannot.

### The strongest objection the argument cannot answer

Not the register objection, which is fixable, and not the fairness objections, which are fixable.
This one:

**The figure's central asymmetry is that Panel A's boxes are bought and Panel B's are built, and
no amount of balanced labelling can make a drawing show that.** A box on a diagram costs the same
ink whether it represents a $60-per-month subscription with a support line and a decade of other
people's bug fixes, or eighteen months of one developer's evenings. The figure's whole rhetorical
force comes from counting boxes, and the box count is precisely the metric under which the
comparison is meaningless. Every fix proposed above narrows the false claims; none of them fixes
this, because it is the form.

### The strongest version that survives every objection

State it as capability plus boundary, not as comparison:

> cairn is a CMS and an admin frame that live inside the site's own SvelteKit app. Editors sign in
> by email and write markdown; a save is a commit on a holding branch, and a publish copies it to
> the default branch, so history, attribution, and rollback come from git. The same admin is where
> a developer mounts the site's own screens, through documented seams, sharing cairn's components
> and the editors' sign-in. Everything specific to the organisation, members, dues, events,
> announcements, is code the developer writes and maintains. cairn ships none of it, and the seams
> are what it ships instead.

Every clause is verifiable against the tree. It makes the extensibility claim the brief cares
about. It contains no comparison, no forecast, no grading word, and no promise the engine does not
keep. It is also, almost verbatim, what `why-cairn.md` already says, which is a signal that the
repo's settled prose reached this position before the figure did.

---

## 8. Ranked changes to the brief

Ranked by damage prevented, not by edit size. The first three are structural.

1. **Cut the Classic Editor install count and the Gutenberg plugin rating** (6.3). It measures
   transition friction on legacy sites, cites the development plugin rather than the core editor,
   supports a conclusion cairn is not offering, is competitive negative evidence on a no-pitch
   front door, and puts two live-moving competitor metrics into artwork cairn must then keep
   accurate. It is the one item a hostile reader can use to discredit everything near it.
2. **Replace the two-panel comparison with one system drawn with its boundary** (section 7). The
   harm is geometric: a box costs the same ink whether it is bought or built, and box count is the
   figure's whole argument. No labelling fixes that.
3. **Move member management, dues, events, and announcements outside an explicitly drawn boundary,
   labelled as the site's own code** (3.1). The charter records that an earlier effort grew member
   login inside the engine because reviewers checked a correct design against a wrong premise. A
   front-door figure showing membership as a cairn-panel capability re-establishes that premise
   publicly.
4. **Delete "one member record" and "one login and one interface for editors and members"** (1.4,
   3.2, 2.1). Both false. `add-a-second-audience.md` routes members to a separate login, session,
   and D1 store; the charter says cairn "only ever knows owner/editor". Their combined form is the
   sentence `docs-register.md` already killed by name.
5. **Rewrite the core-argument caption to state mechanism, not cost** (2.3). Cut "before coding
   agents", "smaller lift", and "lower development cost". Keep documented seams, a widely used
   stack, vendor agent tooling cited by link, and the one shipped skill. Only a measured worked
   example could support a cost claim, and there is none.
6. **Fix the three overclaims in the git section** (4.1): "no content database to host, back up,
   migrate, or secure" (the manifest is an index with a maintenance contract, D1 has migration
   directories, and content-write access is now a GitHub App key with a rotation procedure);
   "backup and portability come free" ("free" is a grading word and the backup is one GitHub
   account); and "drafts and the live site are branches, not flags in a table" (cairn has holding
   branches *and* a `status` frontmatter flag carried in the manifest).
7. **Correct "cairn's component grammar renders a callout, a figure, an embed"** (5.1). cairn ships
   `defineComponent`, `cardShell`, `headRow`, `iconSpan`, and ten attribute descriptors; the site
   declares its own vocabulary, and an empty registry renders plain markdown, GFM tables, `cairn:`
   links, and `media:` references. The current phrasing implies a shipped component library the
   evaluating developer will look for and not find.
8. **Reconcile "movable to any other markdown-reading tool" with the directives** (4.1, 5.3, 6.2).
   The two sections contradict each other. State the narrower true claim: the bodies are plain text
   with no export step, and the site's directive vocabulary, `cairn:` ids, and `media:` references
   do not travel. Note also that WordPress core block markup is HTML with comment delimiters, so it
   is arguably more portable than a cairn directive, which makes the current portability argument
   reversible.
9. **Replace "serialised by the per-entry branch" with what actually happens** (4.2): a concurrent
   edit to one entry is detected and refused, recorded as `commit.failed` with `reason: conflict`.
   Nothing queues. The honest version is a stronger admission and an evaluator needs it.
10. **Stop drawing payments and organisational mail as identical boxes in both panels** (1.4). In
    Panel A the payments provider arrives integrated with dues, renewals, and invoices as
    configuration. In Panel B the same box means webhooks, a subscription state machine, refund and
    failed-payment paths, and reconciliation code the site maintains.
11. **Add the missing drawbacks the sections claim to enumerate**: what a database gives that files
    do not (enforced validation at the store, real-time referential integrity, cross-entry
    transactions, per-field and per-row permissions, reads without a network hop, repository size
    ceilings) (4.2); erasure of personal data against git history (1.6, 4.2); that editors must
    learn markdown syntax where a WordPress volunteer already knows the block editor (5.3); and that
    bespoke code has a labor market of roughly one person (1.7, already in `why-cairn.md`).
12. **Correct the remaining small facts**: "the engine ships agent skills" is one skill,
    `cairn-admin-screens` (2.2); the scaffold emits one theme, Waymark, not a choice; "edge security
    as platform defaults" narrows to TLS and DDoS protection with a link (2.2, 3.3); "Workers Builds
    ... the scaffold's default path" contradicts `docs/admin/own-your-domain.md`, which presents it
    as a later optional step needing a second token (2.2, 4.1); "publish copies it to `main`" is the
    adapter's configured `branch`, defaulting to `main` (4.1); and "a push to `main` ... the same
    review" is false for the editor path, which commits to the default branch with no review gate
    (4.1).

Also fix, below the ranking because they are wording: fix or drop the Panel A exemplars, since Wild
Apricot is one system with one member login (1.1); drop competitor names from the caption entirely
(2.4); widen the page-builder counterweight from magazines to any organisation wanting one bespoke
page (6.4); and remove the banned prose forms the brief itself bans, "not a flag in a table",
"everything git gives code", "so the file stays plain while the page does not", "a feature, not only
a cost", "awkward", and "potentially fragile" (4.3, 5.3, 6.5, 2.2).

## Verdict

**RETHINK.**

The additions moved the brief in the right direction and made its worst tendency clearer. The
git-managed-content section is the best material in the document, because it argues about a choice
cairn actually made and pays for the choice with real drawbacks; after the three overclaims in item
6 are fixed, it would carry a front door on its own. The markdown subsection is close behind, once
the component-grammar claim is corrected and the superlative about agents becomes a mechanism
statement.

The verdict does not move, for two reasons that editing cannot reach.

The form is the first. A two-panel comparison argues by box count, and box count is the one metric
under which bought capability and built capability are indistinguishable. Every finding in section
1 descends from that, and the fix is a different figure, not better labels.

The drift is the second, and the additions made it visible. The brief has grown from a concept
figure into an argumentative essay: a comparison, then a defense of git, then a defense of markdown,
then a defense of not having a page builder, the last one reaching for a competitor's plugin
ratings. Each addition is defensible alone. Together they describe a document arguing a case, and
the docs keystone says the front door has no stake in whether the reader adopts cairn. A figure that
needs four defenses is telling you the reader was going to be persuaded rather than shown.

The strongest surviving argument is still section 7's: one system, one drawn boundary, no
competitor, with the git and markdown reasoning as prose beneath it and the page-builder point
reduced to its true form, that content and design separate by construction because a component's
appearance lives in code rather than in the file. That version makes every claim the brief cares
about, holds each to the tree, names no vendor it must then track, and does not need a page builder
to be wrong in order for cairn to be right.
