# The ASC phase-2 design suite: ops absorption, the admin architecture, the contract changes

Authored on Fable, 2026-07-06, against the live evidence sweep (the asc-ops D1 schema and
row counts, the ops dashboard's code shape, the three Stripe surfaces, MembershipWorks's
actual footprint, the handbook workers). Geoff's rulings all bind: incremental absorption
beside a running ops stack; re-architecture over lift-and-shift; the data tier open with
migrate-and-verify discipline; the five MW capabilities in scope including payments (the
existing ops-Stripe pattern); the vendor endgame; email to Cloudflare. This suite is the
document the next (Opus-conducted) sessions execute.

## Part A — the absorption plan

### The evidence's three governing facts

1. **MW still owns the crown jewels.** Signup/renewal, the member directory, and dues
   billing are 100% MembershipWorks today; ops absorbed only asset/waitlist management,
   its own transactional email (Resend, 11 templates), and a bolt-on Stripe flow for
   non-dues fees. The absorption is therefore mostly NEW BUILD against MW's behavior, not
   a port of existing ops code.
2. **The ops dashboard is 7,644 lines whose bulk is presentation.** 3,926 lines hand-build
   HTML strings; the D1 service layer beneath (1,582 lines) is comparatively clean. The
   re-architecture's real work is replacing the template layer with the cairn admin idiom;
   the service logic ports with refinement, not rewrite.
3. **`people` is not a member model.** 36 rows, deliberately thin (name/email/phone),
   anchoring asset assignments only — with an explicit prior-pass rule against widening it
   ("never add a person_type column"). The absorbed membership model is a NEW schema
   domain, not an extension of `people`.

### The passes, sequenced (each small, each shippable, ops running throughout)

**Pass 2.1 — the substrate + events/classes admin (the seam's first real test).**
**CLASS WAITLISTS ARE IN SCOPE WITH THEIR SITE INTEGRATION (Geoff, 2026-07-06):** the
club runs class waitlists today (ops's waitlist_type='class' + class_applicants fed by
PUBLIC site forms), and the new system carries both halves — the admin's waitlist
management AND the public signup/waitlist forms that feed it, Turnstile-gated like the
donate form, writing through the audited path. The class-vs-asset waitlist distinction
is STRUCTURAL, never generalized away (see the rollover section).
The aksailingclub-org repo (renamed from asc-site; the worker stays asc-site) gains its admin extension surface (Part C's contract work lands here):
the events and classes CRUD moves from ops into cairn's admin as custom screens — chosen
first because the domain is simple, the site already reads the data, the ops screens are
the most self-contained, and success/failure teaches the seam cheaply. The events schema
gets its first improvement: a CHECK constraint on event_type + the shared category enum
the C7 taxonomy wants (a migration, verified against the 12 live rows). Ops's events
screens retire; everything else in ops keeps running.
*Acceptance:* volunteers manage events/classes in cairn's admin; the season/events pages
read the same D1; ops's event routes return 410 pointing at the new home; the audit-log
convention carries over (every write attributed).

**Pass 2.2 — membership signup + the member model (the new domain).**
The real members schema, designed fresh (Part A's data-tier section below): households/
members/memberships-by-season, MW's behavior as the requirements evidence. **The
lifecycle carries an ARCHIVED state (Geoff, 2026-07-06): members who aren't coming back
archive rather than delete** — out of the active list, the directory, and every batch
segment by default; history (memberships, payments, audit) intact; reachable via an
explicit "include archived" lens; archival is a member-detail action behind the confirm
gate, reversible (unarchive), and audited. Archived is distinct from lapsed: lapsed
members are prospects for renewal outreach, archived members are deliberately excluded
from it. The public
join flow replaces the MW embed (the join page finally loses the unstylable widget);
dues payments follow the established ops-Stripe pattern (payment links or checkout — one
pattern chosen in the pass's design step, the three existing surfaces consolidated to it).
**NO MW INTEGRATION PORT (Geoff, 2026-07-06): the MembershipWorks embeds and glue do
not carry into the new system at all** — the member-facing system goes live only when it
has SUBSUMED all of MW's used functions, so there is never a hybrid state where the new
site hosts MW widgets. (The public site's phase-1 cutover is independent: its
my-account/directory surfaces stay "coming soon" until this criterion is met.)
**MEMBER SELF-SERVICE IS A KEY REQUIREMENT (Geoff, 2026-07-06): members manage their
own memberships**, and families have multiple members — so 2.2 builds two faces, not
one: the admin screens AND the member-facing my-account surface (view standing, renew
and pay, edit profile and directory visibility, manage the household's members). The
data model is household-centric: one membership covers a household; its members each
exist as people with their own directory presence. Member auth = the same lean
magic-link pattern cairn's admin proved, against the member store instead of the editor
allowlist — the site-brings-its-own-auth seam eating its own dogfood, and the reason
the my-account "coming soon" page exists in phase 1. Default rule (Geoff can override):
any adult household member manages the household's membership; the audit trail records
who. MW runs in parallel until the season boundary; the cutover imports MW's member records
(migrate-and-verify: counts, spot checks, a parallel-run month).
*Acceptance:* a new member joins and pays entirely in-house; the records reconcile with
MW's export; renewals for the next season flow in-house.

**Pass 2.3 — the directory + member email.**
**SEGMENT SENDS (Geoff, 2026-07-06): batch email to member SEGMENTS is a requirement** —
"all current members" and "all lapsed members" are the named examples, and segments
EXTEND to class rosters ("people signed up for class X" is a first-class segment). The
send flow starts from a segment picker (the same vocabulary the member list filters by,
plus one segment per active class), shows the resolved recipient count before sending,
and logs per-recipient. Segments derive from the member model and class enrollment; no
hand-built address lists.
The directory renders from the new model with per-member visibility (MW's
Visible/Hidden/Partial semantics preserved as the floor); member bulk email consolidates
onto Cloudflare Email Sending (the ops transactional layer migrates off Resend in the
same motion — the email consolidation's main event; templates port from email_templates).
*Acceptance:* the phase-1 "coming soon" member pages go live; a bulk send reaches the
membership through CF with the log trail ops already keeps.

**Pass 2.4 — asset management's re-architecture + MW retirement.**
The last ops domain (assignments/waitlist/asset payments) rebuilds on the new stack —
the polymorphic waitlist redesigned with real FKs (the app-level integrity checks the
schema comments apologize for become schema), the 844+856-line waitlist pair becomes
cairn-admin screens over the service layer. Ops retires; MW's subscription cancels; the
tidy pass (already chartered) sweeps the carcasses.
*Acceptance:* every ops function has a cairn-admin home; audit/email logs continuous
across the cutover; MW's final export archived.

### The data tier (cross-pass principles)

- New domains (members, households, memberships, dues) get NEW tables designed clean;
  existing tables improve by migration only where a pass touches them (events first).
- Every migration ships with a verification script (row counts, invariant checks, a
  before/after diff on real data) and its rollback.
- The read surfaces version: phase-1's events read keeps working across 2.1's migration
  (additive columns first, the constraint after the backfill).
- The audit_log convention is sacred and extends to the new domains from day one.

### THE SEASON ROLLOVER (Geoff: "unusual but important"; deep-read 2026-07-06)

The current function (ops settings.js startNewSeason): five independent D1 statements
via Promise.all — season upsert; active assignments' payment fields reset;
class_applicants DELETED wholesale; class waitlist rows DELETED (asset waitlist
untouched); every classes row force-reset with NO WHERE clause. NOT transactional (the
repo's own webhook uses db.batch; this doesn't), NOT audited on partial failure,
guarded only by window.confirm with a freely-editable year (no forward-only check). The
payments table (UNIQUE(assignment_id, season)) is DEAD SCHEMA — nothing writes it — so
paid-history is destroyed at every rollover, and an accidental mid-season run wipes paid
flags while orphaned Stripe links re-process as fresh payments (the webhook's
idempotency keys off the just-reset status).

The redesign's rollover, built on the per-season data model:
1. **Rollover is a CREATION, not a wipe**: new-season membership rows come into
   existence; prior seasons' rows are immutable history. The dead payments-ledger
   INTENT gets fulfilled for the asset-fee domain the same way. Nothing about a past
   season is ever destroyed.
2. **Atomic**: one db.batch for every statement, including the audit row. A rollover
   either fully happened or didn't; both outcomes are audited.
3. **Guarded like the destructive act it is**: the type-to-confirm gate (type the new
   year), a forward-only validation (new = current + 1, no arbitrary years), a preview
   of exactly what will change (counts per effect), and owner-role required.
4. **The structural asymmetry is preserved and documented**: class waitlists/applicants
   are seasonal (year-stamped offerings — they reset); asset waitlists are continuous
   multi-year queues (they NEVER reset). The redesign names these two types explicitly
   so no future generalization merges them.
5. **The class-registration reset scopes deliberately** (no bare no-WHERE UPDATE), and
   with MW gone (the no-port ruling) the year-stamped-URL reconfiguration chore dies
   with it — statuses simply move to not_scheduled/upcoming per class.

## Part B — the admin UI/UX architecture

**The battle-tested-patterns principle (Geoff, 2026-07-06).** No invented interaction
patterns: every screen names the proven convention it borrows and deviates only with a
written reason. The mappings: the member detail = the CRM record-page convention
(identity pane + activity timeline); the signup queue = the review-inbox pattern
(approve/deny per row, the decision never far from the evidence); the payments history =
the activity-feed convention (DaisyUI v5's native timeline); destructive club actions
(season rollover) = the type-to-confirm gate every serious admin uses; lists = the
office-list triage table already proven in cairn's own admin. Component skeletons come
from DaisyUI v5's natives first (timeline, list, stats, the dialog-element modal), the
design system's recipes where a native fights the idiom — the choice documented in the
component comment either way. A volunteer should find every screen familiar on first
contact because they HAVE met its pattern before, elsewhere.

**The cherry-pick clause (Geoff, 2026-07-06): battle-tested is not the same as common.**
The median CRM is the ANTI-pattern (dense chrome, forty fields, modal mazes); "everyone
does it" is not a credential. Borrow each convention from a named BEST-IN-CLASS exemplar
of it — the Stripe-dashboard class of record page (essentials prominent, the long tail
behind disclosure), the Linear/GitHub class of review queue (fast, keyboardable, the
decision beside the evidence), the calm end of activity feeds — and hold the copy to the
cairn admin's own quiet voice. If a pattern's best exemplar still feels heavy for a
35-member club, subtract until it doesn't; the club's scale is a design input, not an
afterthought.

The absorbed capabilities present INSIDE cairn's admin, in its established idiom (Warm
Stone tokens, the eyebrow groups, the card recipes, the command palette) — one admin, not
two. The architecture, per capability:

- **A "Club" section joins the admin nav** beside Content/Media/Settings: Events, Classes,
  Members, Assets, Email — each a screen family on the extension surface. The section is
  the seam's showcase: everything under "Club" is site-declared, none of it engine.
- **Events/Classes (2.1):** list screens in the admin's office-list pattern (the triage
  table: date, title, type-chip, visibility, edited-by), a detail form in the admin's
  field idiom (the same field components content editing uses — the seam should let a
  site REUSE the engine's field renderers; Part C makes that a contract point), R2 image
  fields via the existing media-library picker (another reuse seam).
- **Members (2.2):** the list with the directory-visibility chip and season-standing
  column; the detail as a two-pane (identity + household left, memberships/payments
  timeline right — the timeline reuses the audit-trail presentation). Signup review as a
  queue screen (the office-list pattern again; approve/deny with the email templates).
- **Assets/Waitlist (2.4):** the by-asset and by-person views ops proved, re-expressed as
  two lenses over one screen family; the waitlist as a single polymorphic queue with
  type chips (the redesign kills the two-page split).
- **Email (2.3):** template editing IN the cairn editor (templates are markdown-with-
  variables — the editor the volunteers already know, with a variables palette); the send
  log as a filterable list.
- **The volunteers' mental model is the design's north star:** one sign-in (magic link),
  one nav, the same editing gestures for a news post and an email template, the publish
  gate's caution carried to destructive club actions (season rollover gets the
  publish-style confirm).

**MOCKUPS RATIFIED (Geoff, 2026-07-06: "The mockup looks GREAT").** The eight-screen
set (artifact 76c80c34; the source HTML archived beside this spec as
assets/2026-07-06-club-admin-mockups.html) is the DESIGN CONTRACT for the phase-2 admin
build — adversarially reviewed, empirically re-audited, Fable-read, and Geoff-blessed.
Three build-tier refinements ride with it (not relitigated at build time, just done):
destructive actions move behind the detail's confirm (no per-row trash at arm's reach),
the identity pane decides read-view-then-edit explicitly, and the type-chip emphasis
hierarchy gets one deliberate rule.

## Part C — the engine and site-contract changes

The seam today: CairnAdminShell + a data-only adminNav + admin-scoped locals.editor +
CsrfField. Designing Part B against it exposes exactly four gaps — these are the
pre-beta contract changes, specified now so the successor implements a designed contract:

1. **Admin field-renderer reuse (the big one).** Sites building admin screens need the
   engine's field components (text/date/select/image-picker/markdown) as a supported
   export — today they're internal to the content forms. Contract: an `/admin-fields`
   subpath exporting the field primitives with their form-context contract documented.
   Breaking risk: none (new surface); the leanness case: without it every extending
   developer rebuilds worse copies, which is the seam failing its own purpose.
2. **The office-list primitive.** The admin's triage-table pattern (list + chips +
   filters + row actions) exports as a composable, or every Club screen hand-rolls it.
   Same additive shape.
3. **Admin-scoped server helpers.** The extension surface needs blessed access to the
   admin's CSRF + session + audit conventions for custom POST actions (today: CsrfField
   exists; the action-side verify helper and an audit hook do not). Contract: an
   `adminAction` wrapper (verifies CSRF + editor, exposes a typed audit emit).
4. **Nav sections.** adminNav today is flat; the Club section wants one level of
   grouping. Trivial, additive.
All four are additive to the published surface — the pre-beta breaking license likely
goes UNUSED again, which at this point is the contract's strongest credential. Each lands
with reference docs + the showcase demonstrating a minimal Club-style screen (the
extending-developer tutorial's future material).

## Sequencing note for the successor

Part C items 1-4 land as a cairn engine pass BEFORE pass 2.1 builds on them (the same
evidence-first rhythm as the harvest passes; the ASC build review's findings fold in).
The suite's open questions are deliberately few: the dues-payment pattern choice in 2.2
(links vs checkout — decide in-pass with the volume data), the season-boundary date for
the MW parallel run (Geoff's call, a calendar fact), and nothing else — everything other
than those is specified.
