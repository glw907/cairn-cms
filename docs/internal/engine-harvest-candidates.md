# Engine harvest candidates from the two consumer sites (2026-08-05)

An input to the pre-beta harvest brainstorm. It describes and evidences the planned
functionality of `aksailingclub-org` (ASC) and `ecxc-ski`, assessed against the charter
boundary in `CLAUDE.md` ("What cairn is"). It decides nothing: candidates carry no
verdicts, and the sites' own asks are labeled as their hypotheses. Sources are cited
per item; everything was read 2026-08-05 against the repos as they stood that day.

## The state of the evidence, read this first

The premise "planned at a high level and not implemented" holds unevenly, and the
uneven part is the finding.

ASC has shipped most of its program (portal, directory, waivers, payments, roles,
admin screens). What remains planned is exactly the set whose functional brainstorms
have deliberately not run yet. The xcathletes platform (ecxc's CrewLAB replacement, a
new standalone cairn consumer) is planned in ratified detail with zero code: the repo
`~/Projects/xcathletes-org` does not exist as of 2026-08-05 (cairn `docs/STATUS.md`).

More consequentially: both sites' filed consumer briefs
(`docs/internal/2026-08-01-asc-consumer-brief.md`,
`docs/internal/2026-08-01-xcathletes-consumer-brief.md`) have already been consumed by
the engine. The `/auth-store` promotion, the `publishedAt` stamp, and
`newlyPublishedEntries` shipped as `0.93.0`. The `/cloudflare` subpath
(`verifyTurnstile`, `checkRateLimit`), `createD1AuditSink` with its packaged
migration, `createSectionAction`, `/auth-crypto`, and the `createAuthChannel` factory
are merged in the unpublished window (CHANGELOG `## Unreleased`; the auth-seam memory).

So the risk this exercise exists to guard against, a seam shaped from an unbuilt
requirement, has already been accepted several times over, deliberately, in the
current window. That reframes what the brainstorm can most cheaply decide: the
marginal value of a new seam is low, and the marginal value of naming what the first
consumer builds must prove about the already-landed seams is high. Section 2a carries
that item.

## 1. What each site plans

**ASC.** The remaining planned initiatives, in the roadmap's own words
(`aksailingclub-org/ROADMAP.md`): `events-redesign`, "a full from-scratch design of
the events page, OPENING WITH A FUNCTIONAL BRAINSTORM"; `class-management`, four
capabilities (attendance/check-in, roster exports, instructor self-serve rosters,
class-fee refunds), ruled "ESPECIALLY needs interactive brainstorming, NOT
overnight-eligible"; `season-rollover`, the annual transition as "a GUARDED OWNER-ONLY
ADMIN OPERATION (preview, confirm, execute, with a per-season audit row)";
`qbo-integration`, phase 2 accounting sync; and the operational `mw-cutover`. The
immediate next pass is adoption: bump cairn and retrofit each landed seam by deleting
the site copy (`aksailingclub-org/docs/STATUS.md`, the NEXT entry).

**ecxc.** The site itself plans little: a pre-publish checklist and small content
items (`ecxc-ski/docs/STATUS.md`, `BACKLOG.md`). Its large plan is the xcathletes
platform, a standalone multi-team training platform that will be a fifth cairn
consumer. Authority: `ecxc-ski/docs/superpowers/specs/2026-07-30-team-platform-requirements.md`
(ratified), executed by `docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`
(pass map: foundation; log/check-in/push; plans/schedule/broadcast; chat; races/
cutover; East High). The requirements' own scope statement matters here: "Member OTP
auth, notifications, chat, and push are platform-native by design and ask nothing of
the engine" (restated in the filed xcathletes brief's scope check).

## 2. Candidates

### 2a. Seams already landed ahead of their consumers (validation, not addition)

Not a new seam; the inverse. Five seams now exist whose shaping evidence was a
requirement or a hand-rolled site copy, and whose first real consumer build has not
happened:

- **`publishedAt` + `newlyPublishedEntries`** (0.93.0): the consuming trigger is
  xcathletes pass 3 (announce-on-first-publish). The consumer-owned half of the
  division of labor (the deploy-completion ping, and storing the prior manifest the
  diff needs a `before` from) is unbuilt and undesigned.
- **`/auth-store`** (0.93.0): the consumer is xcathletes Task 5 (provision a coach as
  a cairn editor from a custom roster screen). Unbuilt.
- **`createAuthChannel`** (merged, unpublished): the consumer is xcathletes Task 4.
  Unbuilt, and the pass-1 plan predates the factory ruling: it still specifies a
  hand-rolled OTP module with 6-digit codes
  (`2026-07-30-team-platform-pass-1.md`, Task 4), while the factory defaults to
  8-digit codes and requires a `challenge` (`docs/reference/auth-channel.md`). Nothing
  in the ecxc repo records the reconciliation; cairn's STATUS carries it one-sidedly
  ("that consumer builds against the factory instead of hand-writing it").
- **`createSectionAction`, `/auth-crypto`, `/cloudflare`, `createD1AuditSink`**: the
  ASC retrofits (deleting `club-action.ts`, `portal-action.ts`, the two crypto copies,
  `turnstile.ts`, `rate-limit.ts`, `audit-sink.ts`) are queued in ASC's STATUS and
  have not run.

Signals: this is the two-sites signal already banked, with the proof outstanding.
What the brainstorm could usefully decide is what each consuming pass must report
back about seam fit, and whether the xcathletes pass-1 plan gets amended before
execution rather than discovering the factory mid-task.

### 2b. Domain-event audit rows against the packaged sink

What the site is trying to build: xcathletes Task 3 requires a platform-operational
`audit_log` table "written on roster changes and exports, with a store helper later
tasks call" (pass-1 plan, Gate 1 amendments), and Task 5 writes a row on every roster
add/edit/archive.

Against today's engine: the packaged implementation is `createD1AuditSink`, which
returns an `AdminActionAuditSink`, documented as the seam `adminAction` invokes
(`docs/reference/sveltekit.md`). Whether calling the returned sink directly from site
store code, with domain events rather than admin-action records, is a sanctioned
pattern is not documented. As planned, the platform hand-rolls its own audit table
and helper beside the engine's packaged one, in the same repo, for the same D1.

Signals: two sites independently (ASC hand-rolled the first sink, now engine-side;
xcathletes plans the second, in a plan written before the packaged sink existed), and
arguably a mechanic (append-only audit persistence carries no domain meaning; the
event vocabulary is the site's). Site hypothesis: none filed for the domain-event
half. ASC's brief asked for and received the `adminAction`-shaped sink only.

### 2c. Team-scoped public URLs for platform-rendered content

What the site is trying to build: pass 3 renders plans and the schedule publicly on
the platform "under stable per-team URLs," so East High needs no site of its own
(requirements, the integration contract; pass-1 plan, "Settled here").

Against today's engine: Task 2 declares the `plans` concept with `team` as a
frontmatter field and defers rendering. Whether `defineConcept`'s URL policy can
express a team path segment, or whether team stays a field behind a flat URL, has not
been checked by anyone; the plan implicitly assumes the concept model covers it.

Signals: a potential seam gap only, one site, unverified in both directions. The
cheap move is a check against the URL-policy surface before pass 3, not a design.

## 3. Cannot assess until specified

For three of the four items the vagueness is the site's own deliberate choice, and
each names an interactive brainstorm as its next step. The sequencing question for
the harvest brainstorm is therefore whether to wait for those sittings, which will
produce the missing decisions on their own schedule, rather than pre-deciding from
this document.

### ASC events-redesign

What is unclear: everything functional. The roadmap entry opens the pass with a
functional brainstorm that has not run, and licenses a from-scratch rethink ("the
current events page's timeline/chips/season machinery is evidence of requirements,
not a design to preserve").

Why it blocks the cairn's-job call specifically: "events" spans shapes with opposite
engine implications. If events remain D1 domain records with a designed public page
(they run on live D1 today, per the class-management entry), there is no engine ask
at all. If any part becomes content-shaped, it presses on the fixed-concepts model
and on date-aware public listing, which the delivery loaders do not do generically.
The engine has already ruled once here: the ASC brief's scope check excluded the iCal
builder because "events are site domain, and the engine has no events concept." That
standing ruling should be reopened deliberately or not at all.

What the decision must say: where an event lives (D1 or content); what the public
page must query (date windows, seasons, recurrence, cancellation state); and for each
query, whether it is generic to any dated corpus or depends on what a sailing-club
event means. Only after those three answers does a mechanic-versus-choice call exist.

### ASC class-management

What is unclear: screen shapes and the check-in UX; the brainstorm is deliberately
unrun and ruled interactive. The frame rulings that do exist (v1 scope, instructor
check-in writes, refund policy sourced from governance content) are all site domain.

Why it blocks: the only conceivable engine angle is whether any of the four
capabilities needs an admin-shell mechanic the toolkit lacks, for example a
mobile-first tap-through check-in surface. That is unknowable before the screens are
designed. The auth side is already served: `defineAccess`, `requireAccess`, and
`createSectionAction` cover instructor-scoped routes.

What the decision must say: which screens exist, what components they compose, and
whether any component fails the mechanic-versus-domain test that
`docs/internal/what-cairn-is-and-is-not.md` and the engine-level UI mechanics rule
already define.

### ASC season-rollover, and the guarded-operation pattern

Two blocked questions live here.

First, the pattern. The ratified shape is a guarded owner-only operation: preview,
confirm, execute, per-season audit row. Whether that is a recurring mechanic worth an
admin-toolkit recipe or a one-site design choice cannot be judged until the design
enumerates its steps. Today the evidence is one site plus a superficial resemblance
to xcathletes' rollover (section 4).

Second, the sharper one. The rollover's inventory includes "the season-stamped copy
across content pages." If the guarded operation edits markdown content
programmatically, it pushes on a surface the engine does not have: content writes
ride the admin's per-entry edit and publish flow, and no export subpath commits
content (checked against the reference index, `docs/reference/README.md`,
2026-08-05). That would be a seam gap, the strongest signal this exercise recognizes.
If the copy updates stay a manual checklist step, there is no engine question at all.
The design must say which, explicitly: content edits inside the operation, manual
beside it, or out of scope. Until it does, this cannot be assessed, and guessing
either way would shape or skip a seam on no evidence.

### xcathletes multi-team isolation beyond the two-team era

Gate 3 of the requirements' governance model (per-club admin isolation proven by
test, the vault split, entity custody) is deferred by the site itself: "Direction,
not v1"; "a third team is its own future initiative." The engine-shaped question
buried in it, whether one cairn admin ever needs per-team scoping of content
visibility, is unanswerable now, and the site has asked that it not be answered now.
Record the deferral and honor it.

## 4. Corroboration

Second-audience auth is the real one: ASC needed it twice (member sessions, offer
tokens) and xcathletes needs it for member OTP, independently. It is also already
consumed, as `/auth-crypto` and `createAuthChannel`. What both sides still owe is the
first consumer proof (section 2a).

Site-domain audit persistence is the second real one: ASC built it, xcathletes plans
it, and the open shape question is section 2b.

Season rollover appears on both sides but the resemblance is mostly superficial.
ASC's is a sitewide guarded operation across settings, class rows, assets, waivers,
and content copy; xcathletes' is archive-not-delete roster semantics baked into the
schema, with no operation designed at all. The only genuinely shared piece is the
possible guarded-operation mechanic, blocked per section 3.

Public-form protection recurs on both: ecxc's registration and contact forms and
ASC's five public money POSTs each compose Turnstile plus rate limiting. The
primitives landed in `/cloudflare`; the composition remains per-site. Neither site
has asked for a composed wrapper, and the ASC brief deliberately stopped at
primitives, so this is measured duplication of composition without a filed need.

Waiver status tracking recurs three ways (ASC member-waivers, ecxc's registration
waiver, xcathletes' `waiverStatus` on the person record), but each lives in its own
domain store with its own semantics. The shared surface is at most a status chip in
the toolkit, which exists. Superficial.

## 5. What was looked at, with nothing found

- **ecxc `BACKLOG.md`**: three open items (a rate-limit improvement that
  `/cloudflare` serves once adopted, a CSV formula-injection hygiene note, a content
  directive waiting on photos). Nothing engine-shaped.
- **ecxc `ROADMAP.md`**: stale, pre-rebuild era; it still describes building cairn
  itself as a future project. Do not read it as plan. The live plan is STATUS plus
  the team-platform docs.
- **ASC's shipped design docs** (portal, directory, waivers, money ledger, unified
  signup, segment email, membership admin, sidebar and roles, the admin screen
  passes): implemented work whose harvest already flowed through the 2026-08-01 brief
  and the per-pass findings docs. Nothing further is planned inside them.
- **xcathletes chat, push, notification control, SMS, broadcast fan-out, Zone4
  export email**: the requirements state these are platform-native and ask nothing of
  the engine, consistent with the charter's standing exclusions (no sends, no
  scheduler), and nothing in the pass map contradicts that.
- **ASC `qbo-integration` and `mw-cutover`**: accounting sync and an operational
  cutover, entirely site domain.
- **`docs/internal/extending-developer-lens.md`**: its baseline is stale in the
  expected direction. The three gaps it names (no admin-extension seam, no
  session-on-any-route path, an unenforced boundary) have all since shipped in some
  form (`CairnAdminShell` and the toolkit, `createAuthChannel` and `/auth-crypto`,
  `check:surface` and the packaging-boundary test). Its charter framing still
  governs; its baseline section should not be leaned on.
