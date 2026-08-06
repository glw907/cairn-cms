# Engine-harvest decisions (2026-08-05)

The decision record of the pre-beta engine-harvest brainstorm. It consumes
[`docs/internal/engine-harvest-candidates.md`](../../internal/engine-harvest-candidates.md)
(2026-08-05, the standing input) and rules on each candidate against the charter boundary in
`CLAUDE.md` ("What cairn is"). The sitting ran 2026-08-05 as a Fable sitting; Geoff ratified every
ruling the same day, including one the sitting itself revised (ruling 1's rename, argued up from a
docs-only sanction on the long-term lens). The one resulting engine task executes in a fresh Opus
session ahead of the `0.94.0-rc.1` cut.

## The frame

The candidates doc's headline finding is accepted as the frame: the seam-from-unbuilt-requirement
risk this exercise exists to guard against has already been accepted five times over, deliberately,
in the current window. The marginal value of a new seam is therefore low, and the marginal value of
validation is high. Every ruling below follows that frame. One candidate produces engine work, and
it is a sanction-and-rename of surface that already exists, not an addition.

## Facts verified in source during the sitting

Each of these was checked against the worktree on 2026-08-05, not taken from the candidates doc's
uncertainty.

1. **The packaged audit sink is already generic in substance.** `createD1AuditSink` accepts
   `{ editor, action, entity, entityId, detail }` and inserts into a table whose columns are
   `actor, action, entity, entity_id, detail` (`src/lib/sveltekit/audit-sink.ts`, the insert at the
   bottom of the factory). Nothing in the record shape or the table is admin-specific except the
   type's name and the `editor` field name. A site calling the sink directly with domain events
   works today; what is missing is sanction, since `docs/reference/sveltekit.md` frames the sink
   strictly as the `adminAction` seam's implementation and says nothing either way about direct
   calls.
2. **The permalink token set cannot express a team path segment.** `KNOWN_TOKENS` is the closed set
   `slug, year, month, day` (`src/lib/content/concepts.ts`), and an unknown token throws at
   declaration. A `:team` segment is not buildable today. A future token resolving a frontmatter
   field would be an additive capability, not a compatibility event, so nothing forces it into the
   pre-beta window.
3. **The xcathletes pass-1 plan contradicts the landed factory.** Task 4 of
   `ecxc-ski/docs/superpowers/plans/2026-07-30-team-platform-pass-1.md` still specifies a
   hand-rolled OTP module with 6-digit codes, while the merged `createAuthChannel` defaults to
   8-digit codes and requires a `challenge` (`docs/reference/auth-channel.md`). Nothing in the ecxc
   repo records the reconciliation.

## Rulings

### 1. Domain-event audit: sanctioned, and the identity field renames (candidate 2b)

**Ruling.** Site code calling the D1 audit sink directly with domain events is a sanctioned
pattern, and the record's identity field renames from `editor` to `actor` in the same change,
matching the column it lands in. This is the brainstorm's only engine work, and it must merge
before the RC is cut, since it changes public surface the RC would otherwise freeze mid-rename.

**Why sanction.** Append-only audit persistence is a mechanic; the event vocabulary is the site's.
The need is proven twice in-family (ASC hand-rolled a sink before the engine had one; xcathletes
plans a domain `audit_log` in a plan written before the packaged sink existed) and is convergent
across every mature ecosystem (Rails `paper_trail`/`audited`, Laravel `activitylog` with nearly
this exact record shape, Django's `LogEntry`, the most-installed WordPress audit plugins). Any site
with members, money, or roles wants one, which describes every cairn consumer that is more than a
blog. Refusing would convert a proven mechanic into a per-site duplication ritual, the
repeated-workaround smell the charter's own rules flag.

**Why rename now.** The moment direct use is sanctioned, the record type stops being an
admin-action detail and becomes a general-purpose API, and `editor: string` misdescribes every
member-actor event written through it. The asymmetry decides the timing: pre-beta the rename costs
one `Consumers must:` line; after `1.0` it is a major-version event or a permanent wart. The blast
radius today is close to zero. The only known consumer code reading the field is ASC's hand-rolled
sink, which ASC's queued retrofit deletes in favor of the packaged factory, and the other three
sites wire no audit sink at all.

**Outcomes the task must land** (outcomes, not implementation):

- `AdminActionAuditRecord`'s identity field is `actor`; `adminAction`'s composition and every
  package-internal reader follow. `AdminActionAudit` (what a handler passes to `ctx.audit`) carries
  no identity field and is untouched.
- The two log events that spread the record (`admin.action.audited`, `audit.sink.write_failed`)
  report the identity under `actor`, and `docs/reference/log-events.md` updates in the same change.
  Auth events keep `editor`; they genuinely concern editors. `admin.action.sink_threw` also keeps
  `editor`, deliberately: it fires only inside `adminAction`, where the actor is always a cairn
  editor, and it composes its fields explicitly rather than spreading the record.
- `docs/reference/sveltekit.md`'s sink section documents the direct-call contract: calls from site
  code with domain events are supported; `actor` is the acting identity and need not be a cairn
  editor; a namespaced action vocabulary (`roster.add`) is recommended so domain rows stay
  distinguishable from admin-action rows in a shared table; the existing fail-open, truncation, and
  `waitUntil` promises apply unchanged. The custom-screen guide's sink section follows the rename.
- The changelog entry carries the `Consumers must:` line for any hand-rolled sink or custom
  `App.Locals` typing that names the old field. A site wiring no audit sink does nothing.

### 2. Team-scoped public URLs: deferred, with the gap now confirmed (candidate 2c)

**Ruling.** No engine work now. The check the candidates doc asked for has run and the gap is real
(verified fact 2), so the deferral is informed rather than blind. The requirement has exactly one
prospective consumer, xcathletes pass 3, which is unbuilt and has not stated whether a flat URL
with `team` as a frontmatter field suffices. Before pass 3 executes, the site decides: flat URLs,
or file the ask for a field-resolving permalink token. If asked for, the token is ordinary additive
minor work whenever it lands, including after the beta. The pass-1 plan amendment (ruling 3)
carries this note so the decision point cannot be missed.

### 3. Landed-seam validation: the proof obligations attach now (candidate 2a)

**Ruling.** The five seams landed ahead of their consumers get their proof obligations attached to
the sessions that will consume them, in two parts.

First, the xcathletes pass-1 plan is amended before any executor runs it: Task 4 builds against
`createAuthChannel` (8-digit default, required `challenge`, `createChannelDb` available for the dev
harness), and the reconciliation is recorded in the ecxc repo rather than only in cairn's STATUS.
The amendment also carries ruling 2's pre-pass-3 URL decision note. This is a small docs edit in
`ecxc-ski`, riding the next session that touches that repo and in any case preceding pass-1
execution.

Second, every first-consumer pass answers three seam-fit questions when it closes: did the seam's
shape fit without workaround; what did the site still hand-write beside it; which defaults fought
the site. These fold into the per-migration DX reporting shape already owed in the RC-cut session,
rather than becoming a new artifact. They apply to the ASC retrofits (`createSectionAction`,
`/auth-crypto`, `/cloudflare`, `createD1AuditSink`) and the xcathletes consumers (`publishedAt` and
`newlyPublishedEntries`, `/auth-store`, `createAuthChannel`).

### 4. The blocked four stay blocked, with riders (candidates doc section 3)

**Ruling.** Every deferral is honored; nothing is pre-decided from the candidates doc. Four riders
travel with the future sittings, and the ASC migration session files the first two as one-line
pointers on the corresponding `aksailingclub-org/ROADMAP.md` entries:

- The **events-redesign** brainstorm reopens the standing no-events-concept ruling deliberately or
  not at all; it does not drift open as a side effect of designing the page.
- The **season-rollover** design states explicitly whether content edits sit inside the guarded
  operation, manually beside it, or out of scope. Programmatic content writes are the one place a
  genuine seam gap could hide, since no export subpath commits content.
- **Class-management** screens are judged component by component against the existing
  mechanic-versus-domain test once they exist; the auth side is already served.
- **Multi-team isolation** stays deferred because the site asked that it not be answered now; the
  deferral is recorded and honored.

### 5. No composed form-protection wrapper (candidates doc section 4)

**Ruling.** Declined. The primitives landed in `/cloudflare`, both sites compose them per-site,
neither has filed an ask for a composed wrapper, and the ASC brief deliberately stopped at
primitives. Measured duplication of composition without a filed need does not clear the leanness
bar. Revisit only if a consumer files the ask.

## What executes where

- **RC-cut session (this repo, fresh Opus session):** execute ruling 1 as one task through the
  full gate, merge, then cut `0.94.0-rc.1`; author the per-migration DX reporting shape carrying
  ruling 3's three questions before the ASC migration starts.
- **Next session touching `ecxc-ski`:** the pass-1 plan amendment (ruling 3), carrying ruling 2's
  URL decision note.
- **ASC migration session:** the two one-line ROADMAP riders from ruling 4.
- **Nothing else enters the engine from this harvest.**
