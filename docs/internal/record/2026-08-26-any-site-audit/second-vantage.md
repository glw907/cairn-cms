# Second vantage: the 2026-08-01 requirement-shaped suspects

Scope: the six seams whose shaping evidence was a filed requirement rather than a built consumer
(`docs/internal/record/2026-08-26-engine-consultation-inputs.md`, ruling 4). One question per
suspect, asked directly: **was this shaped by a built consumer or by a filed requirement, and does
the requirement's shape still show in the surface?**

Family checked: ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub, showcase. No
consumer outside the family found. Consumer pins at audit time: ASC `^0.96.0`, xcathletes `^0.96.0`,
ecxc-ski `^0.95.0`, 907-life `^0.84.4`, cairn-pub a `file:` 0.95.0-rc.1 tarball.

Headline: **all six now have at least one real consumer**, so "unbuilt requirement" is no longer the
risk. The risk that materialized is different and worse — five of six were built to a *shape* the
requirement dictated, the consumer then built around that shape, and in four cases the hand-rolling
the seam was filed to delete is still there.

---

## 1. `createAuthChannel` (`/auth-channel`) — filed requirement; shape shows

**What shaped it.** A filed requirement, stated in the design's own opening:

> "The driving consumer is the xcathletes team platform (ecxc-ski
> `docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`, Task 4). Its requirements are this
> spec's floor, with one deliberate deviation recorded below."
> — `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`

Shipped in five commits (`490231e0` … `8e069924`) against three adversarial review rounds, then
"proven" in a separate pass (`2026-08-04-auth-channel-consumer-proof.md`) by a **showcase fixture**,
not a consumer. The real consumer landed later (xcathletes pass 1, 2026-08-20).

**Does the requirement's shape still show? Yes — via the proof fixture, not the requirement text.**

The fixture's roster is a static `Map`:

```ts
// examples/showcase/src/members/channel.ts
export const MEMBER_ROSTER: ReadonlyMap<string, string> = new Map([
  ['golden-path@showcase.test', 'member-golden-path'], …
]);
async function lookupContact(contact: string): Promise<string | null> {
  return MEMBER_ROSTER.get(contact) ?? null;
}
export const memberChannel = createAuthChannel<App.Platform['env']>({ … });   // module-level constant
```

So `lookup(contact)` and `verify(subject)` never needed request context, and the config table
codifies that: `resolveDb(env)` gets env, `deliver(contact, code, ctx)` gets `{env, waitUntil}`, and
`lookup`/`verify` get only the value being resolved. The first real consumer, whose roster is in D1
like every non-demo roster, pays for it immediately:

> "`createAuthChannel`'s `lookup(contact)` and `verify(subject)` config fields receive no `env` and
> no request context, only the value being resolved … which is workable for the showcase exemplar's
> static demo roster but not for this platform's D1-backed one: `lookup` has to close over a
> specific `PLATFORM_DB` binding to query it. `memberChannel` is the factory that closes the gap,
> building one `AuthChannel` instance per distinct `PLATFORM_DB` object and caching it in a
> module-level `WeakMap`…"
> — `xcathletes-org/src/lib/server/auth/channel.ts`

Independently filed the same day:

> "Any consumer whose roster lives in D1 must close over a database, which means building the
> channel per request and caching it in a `WeakMap` keyed on the binding object. Giving `lookup` and
> `verify` the same `DeliverContext` shape `deliver` already gets would remove that dance entirely."
> — `docs/internal/record/2026-08-20-xcathletes-pass-1-harvest.md`

Second, smaller instance of the same thing: `revokeSessions(db, subject)` takes `db` explicitly even
though the factory already holds `resolveDb`, so the consumer builds a throwaway uncached channel
just to call it (`revokeMemberSessions`, same file).

Third: `challenge` is required config, and the showcase — the engine's own exemplar — cannot satisfy
it, shipping `insecureTestChallenge` because "CI has no route to challenges.cloudflare.com." A
required field whose canonical example is a stub is a field an anonymous consumer will also stub.

**The counter-evidence, and it is real.** The 8–10 digit clamp is the engine deliberately *refusing*
the requirement's shape (spec, Decision 2: "This is the deliberate deviation from the consumer's
spec'd 6"), and it held under pressure — the consumer wrote "Do not 'fix' this back to 6" into its
own config. The pass-1 harvest also called this seam "the single largest thing the engine saved this
consumer." The factory's security core is genuinely any-site. Only its *config plumbing* carries the
fixture's shape.

**What an anonymous consumer wants instead.** `lookup` and `verify` receiving the same
`DeliverContext` `deliver` already gets, so a channel is a module-level constant again;
`revokeSessions` defaulting to the configured `resolveDb`; and a documented non-Turnstile `challenge`
path, since the engine's own exemplar needed one.

---

## 2. `createSectionAction` (`/sveltekit`) — built consumer, but only half of it

**What shaped it.** A built consumer, and the brief was explicit that there were **two**:

> "ASC hand-rolled the composition twice: `src/admin-club/lib/club-action.ts` (access-map check via
> the already-public `canReach`, DB binding resolution, per-editor rate limit, audited denial,
> injected `db`) and `src/member-portal/lib/portal-action.ts` (**the same shape against a member
> session**)."
> — `docs/internal/record/2026-08-01-asc-consumer-brief.md`, seam 2

The engine re-derived the first copy and shipped it. ASC's `club-action.ts` is now a 12-line naming
layer over `createSectionAction`. That half worked.

**Does the requirement's shape still show? Yes.**

`portal-action.ts` was named in the harvest candidates as a queued retrofit
(`engine-harvest-candidates.md`: "the ASC retrofits (deleting `club-action.ts`, `portal-action.ts`,
…) are queued"). It cannot be retrofitted. Read today, still hand-rolled, with the reason in its own
header:

> "…just against a member session instead of a club role, and **with no engine `adminAction` to
> compose onto** (a member session is not a cairn editor at all…)."
> — `aksailingclub-org/src/member-portal/lib/portal-action.ts`

The seam is editor-only by construction: `createSectionAction` wraps `adminAction`, and its body
reads `ctx.editor.email`, `ctx.editor.role`, and `siteEvent.locals.cairnAccess`
(`src/lib/sveltekit/section-action.ts`). Nothing in it is parameterized on identity. The engine now
also ships `createAuthChannel`, which mints exactly the second-audience session this wrapper cannot
serve — **the two 2026-08-01 seams do not compose with each other.** An anonymous consumer with a
member area gets the wrapper for its admin routes and hand-rolls it for everything else, which is
where ASC still is.

Three smaller places ASC's copy shows through:

- `resolveDb` is **required**, not optional (`SectionActionConfig.resolveDb`, no `?`). ASC's copy
  always had exactly one `CLUB_DB`. A section action over R2, KV, or nothing must return a dummy.
- `event.platform` narrows to `PlatformContext<Env>` with no `ctx`, so a handler reaching for
  `waitUntil` needs a cast — and the engine's own doc example hides it: "`add-a-custom-admin-screen.md`'s
  own example carries a `snippet-check-skip` hiding exactly this"
  (`2026-08-20-xcathletes-pass-1-harvest.md`).
- The rate-limit config (`resolve`/`key`/`message`) is precisely ASC's per-editor-email limiter;
  ASC's own call passes `key: (ctx) => \`editor:${ctx.editor.email}\`` and there is no other key
  shape the type makes convenient.

**What an anonymous consumer wants instead.** The wrapper parameterized on a principal resolver —
cairn editor by default, an `AuthChannel` subject or a site callback otherwise — so one factory
serves both audiences; `resolveDb` optional; and the real `platform` (including `ctx`) on the wrapped
event, so the docs example stops needing a skip directive.

---

## 3. `createD1AuditSink` (`/sveltekit`) — built consumer; the shape it inherited is the problem

**What shaped it.** A built consumer, transplanted. The brief: "the implementation that closed it is
fully generic: one `audit_log` table, a `waitUntil`-kept fire-and-forget insert, fail-open." The
packaged migration says so outright:

> "The packaged audit-log sink's table (seam 5, **ASC's schema carried whole**)."
> — `migrations/0002_audit.sql`

with one deviation the engine argued for (ISO `created_at` instead of ASC's `datetime('now')`).
Two real consumers today (ASC `hooks.server.ts` + `jobs/runner.ts`, xcathletes `audit-hook.ts` +
`db/audit.ts`), and the pass-1 harvest lists it under "worked without friction."

**Does the requirement's shape still show? Yes — as the return type.**

`createD1AuditSink` returns `AdminActionAuditSink`: synchronous, fire-and-forget, needing an injected
`waitUntil`. That is exactly right inside a SvelteKit admin action and wrong everywhere else, and the
consequence is that **ASC still hand-rolls a third `audit_log` insert**, in the very repo the seam was
harvested from:

> "Insert one `audit_log` row directly (the same insert shape `createD1AuditSink` binds): the
> mechanism `claimOffer`, `declineOffer`, and the lazy sweep use in place of `ctx.audit`, since none
> of them run inside an `adminAction`-wrapped route … Awaited by every call site (each already runs
> inside an `async` function its own caller awaits, **unlike cairn's synchronous
> `AdminActionAuditSink`, which has no such chain to ride and needs `waitUntil` instead**)."
> — `aksailingclub-org/src/admin-club/lib/offers.ts:162`

So the seam filed to delete duplicated audit inserts left one standing, for a structural reason. Both
consumers also wrap it rather than call it: xcathletes' `createRosterAuditWriter` fixes `entity` and
namespaces `action` under `roster.*`; ASC's cron runner passes a synthetic `CRON_ACTOR`. `actor` is
documented as an editor email and every non-editor actor is convention, acknowledged only in the
migration comment ("a site's own identifier (a member id, `'system'`)").

Two more residues of the `/sveltekit` home:

- The barrel drags SvelteKit internals into a pure D1 helper: "Importing only `createD1AuditSink`
  still evaluates `preview.js`'s top-level `$app/environment` import," fixable only with
  `vi.mock('$app/environment')` **and** `test.server.deps.inline`
  (`2026-08-20-xcathletes-pass-1-harvest.md`). xcathletes' `db/audit.test.ts` carries that workaround.
- The engine ships the table, the indexes, and the writer, and no read surface. Every consumer that
  wants to look at its own audit trail writes raw SQL.

**What an anonymous consumer wants instead.** A promise-returning `writeAuditRow(db, record)` with
the `AdminActionAuditSink` adapter layered on top (ASC's third copy then deletes); the module on a
subpath free of `$app/*`; and the non-editor `actor` convention stated in the reference, not the
migration.

---

## 4. `/auth-store` (all eight exports) — filed requirement; shape shows most sharply

**What shaped it.** A filed requirement that specified its own implementation:

> "Ask: a supported server-only export surface (a `./auth-store` subpath or equivalent) carrying
> **the existing store functions** under semver … **No new logic is being requested; this is an
> export-map promotion of a surface the engine already trusts internally.**"
> — `docs/internal/record/2026-08-01-xcathletes-consumer-brief.md`, seam 1

Shipped as `82fcd36b` "promote editor-provisioning store to a public subpath," 0.93.0, consumer built
2026-08-20.

**Does the requirement's shape still show? Yes, and this is the clearest case of the six.** The
promoted set is *what `editors-routes` happens to call* — the ManageEditors screen's set — not what a
programmatic provisioner needs.

Usage by the only consumer (`xcathletes-org/src/lib/server/roster/roster-admin.ts`): **4 of 8**.

| Export | Consumed? |
|---|---|
| `listEditors` | yes (but see below) |
| `insertEditor` | yes |
| `deleteEditor` | yes |
| `removeOwnerIfNotLast` | yes |
| `setEditorRole` | no — the consumer explains at length why it is the wrong primitive |
| `insertOwnerIfEmpty` | no family consumer |
| `demoteOwnerIfNotLast` | no family consumer |
| `EditorRow` (type) | no — the consumer's own test declares a **local** `EditorRow` and reads `SELECT email, display_name AS display_name, role FROM editor` raw |

The single-row read the consumer actually needed is deliberately withheld. `findEditor(db, email)`
exists at `src/lib/auth/store.ts:32`; the barrel's own comment excludes it as "engine-internal to the
magic-link guard, not proven consumer surface." The consumer's workaround, on the hot path of a
roster admin screen:

```ts
// xcathletes-org/src/lib/server/roster/roster-admin.ts — deprovisionCoachEditor
const editors = await listEditors(authDb);
const row = editors.find((editor) => editor.email === normalized);
```

Fetch the entire editor roster to answer "what role does this one email hold." And the reason it
needs the role at all is that the subpath hands out screen-shaped primitives with no intent-level
operation, forcing the consumer to reproduce a branch the engine's own screen makes internally:

> "`removeOwnerIfNotLast` is therefore not a safe default for every call: its own contract only ever
> acts on a row that already IS owner-capability … so calling it unconditionally on an ordinary
> coach's row would silently fail to remove it. The role check below picks the right primitive
> instead."

The consumer also re-implements the engine's own email normalization (`email.trim().toLowerCase()`) —
the engine landed `73dc4336` "Normalize email arguments in the auth store" separately.

**What an anonymous consumer wants instead.** `findEditor(db, email)` — a read the engine already has
and already trusts — and one intent-level `removeEditor(db, email, ownerRoles)` that picks the safe
primitive, in place of three overlapping owner-guard variants of which exactly one has ever been
called by anyone outside the engine.

---

## 5. `/cloudflare` — built consumers; requirement shape does **not** show

**What shaped it.** Two built consumers with measured duplication, ASC brief seams 3 and 4:

> "`aksailingclub-org/src/theme/turnstile.ts` opens with 'Ported from ecxc.ski's own
> contact.remote.ts (the family precedent this pass follows).' **Two sites already carry the same
> siteverify fetch verbatim; that is measured duplication, not predicted.**"

**Does the requirement's shape still show? No — the engine visibly overrode it.** The brief asked for
`verifyTurnstile(token, ip, secret)` plus "the degrade-to-open convention its callers use (no secret
configured means the check passes) stated in the reference page." The engine shipped
`verifyTurnstile(token, secret, {ip, hostname, action})`, fail-closed by contract, and refused the
convention outright:

> "This function is fail-closed by contract, so a future refactor cannot flip it open by accident.
> **Degrade-to-open … is the caller's own convention (`if (secret && …)`), never this function's**"
> — `src/lib/cloudflare/turnstile.ts`

`hostname` and `action` replay-scoping is generality neither site had. The retrofit actually
completed: ASC's `rate-limit.ts` is now 10 lines of user-facing copy ("this file no longer wraps
anything") and `turnstile.ts` 28 lines of ambient type. Two independent consumers use it — ASC's five
public POSTs, xcathletes' member-login `challenge`. This is the seam the other five should be
measured against.

**Two residues worth naming anyway, neither disqualifying.**

The subpath's membership is exactly and only ASC brief seams 3 and 4, and the 2026-08-26 triage
already queues a third item into it on precedent rather than principle: "`isUniqueViolation` in
`/cloudflare` … **`/cloudflare` is the established home for helpers of this size**"
(`2026-08-26-asc-harvest-triage.md`, item 9). The barrel's boundary is a prose fence — "Anything
proposed here must be a Cloudflare platform primitive itself" — not a check, which is the harvest
overflow bucket forming in slow motion.

And two opposite conventions share one subpath, requiring each file to explain the other:
`verifyTurnstile` fails closed, `checkRateLimit` degrades open, and `rate-limit.ts` spends a paragraph
on "the two modules read the same word differently on purpose." Defensible, and a tell that the
subpath was assembled from two separately-filed asks rather than designed as one surface. The
composition both consumers repeat at every public POST (`checkRateLimitKeys` + `verifyTurnstile`)
stays per-site — flagged in `engine-harvest-candidates.md` and still open.

**What an anonymous consumer wants instead.** Nothing about the two functions. A `check:surface`-style
enforcement of the barrel's own boundary rule instead of a comment, and — if the pair is always
composed — one configured guard rather than two calls repeated verbatim at ten call sites.

---

## 6. `publishedAt` + `newlyPublishedEntries` (`/delivery/data`) — filed requirement, transplanted verbatim

**What shaped it.** A filed requirement that arrived as a **proposed division of labor**, and the
engine implemented it bullet for bullet:

> "Proposed division of labor, keeping the engine git-pure with no networking:
> - The engine stamps first publish: a `published_at` written into an entry's manifest record…
> - The engine ships a manifest-diff helper: two manifests in, newly published entries out.
> - The consumer owns the trigger and the sends…"
> — `docs/internal/record/2026-08-01-xcathletes-consumer-brief.md`, seam 2

Shipped `5ecab62f` + `1c709fdd` (0.93.0). The consumer built against it in pass 3 (2026-08-22).

**Does the requirement's shape still show? Yes, three ways.**

**(a) The engine took the easy half.** `newlyPublishedEntries` is nine lines of pure filter
(`src/lib/delivery/manifest.ts:56`). Around it, `xcathletes-org/src/lib/server/broadcast/sweep.ts`
builds a `broadcast_manifest` D1 table, a SHA-256 content hash of the whole corpus, a per-isolate
positive memo, a per-isolate *negative* memo with a `FAILED_RETRY_MS` backoff ("one broken deploy
into an error storm against D1"), a single-flight in-flight lock, and a backfill baseline. Every one
of those is generic infrastructure. The requirement drew the line where it was convenient for the
requirement's author, and the engine drew it in the same place.

**(b) The `before: null` default is a footgun its only consumer refuses.** The engine's own guide has
to warn about it — "`before: null` means no prior manifest exists at all, and every stamped entry in
`after` comes back at once, a full fan-out; that's the right call for a first backfill run, not for
an ordinary deploy" (`docs/extend/announce-on-publish.md`). The consumer's code:

> "The backfill case: … cairn's own `newlyPublishedEntries(null, manifest)` contract would return
> every currently-live stamped entry in `manifest`, a full fan-out. **That is wrong for an ordinary
> deploy** (announce-on-publish.md's own warning), so the first sweep only ever establishes the
> baseline and sends nothing."

A default whose documented behavior is "do not use this" on the one path everybody reaches it by.

**(c) There is no supported way to read the committed manifest, so both consumers hand-rolled one,
differently.**

```ts
// aksailingclub-org/src/theme/announce-stamps.ts
const globResult = import.meta.glob('../content/.cairn/index.json', { eager: true, import: 'default' });
return raw && typeof raw === 'object' ? (raw as Manifest) : { version: 1, entries: [] };
```
```ts
// xcathletes-org/src/lib/server/broadcast/sweep.ts
import bundledManifestRaw from '../../../content/.cairn/index.json?raw';
const bundledManifest: Manifest = JSON.parse(bundledManifestRaw) as Manifest;
```

Two reads of an engine-internal path (`src/content/.cairn/index.json`), two different Vite idioms,
two unchecked casts — and **neither uses `parseManifest`**, which the engine exported beside the
helper in `84fe1927` precisely for this. The engine already has the exact precedent one subpath over:
`/media` ships `readCommittedManifest(globResult)` (`src/lib/media/manifest.ts:51`,
`docs/reference/media.md`). The content manifest has no equivalent, because the requirement's author
already knew the path and so never asked for one.

**Bonus signal: the second consumer repurposed the field and immediately hit an edge.** ASC uses
`publishedAt` to order its Announce list, not to announce, and had to write a coercion because the
engine ships two date fields in incompatible formats: "`date` ('2026-03-02') and `publishedAt`
('2026-03-02T18:04:11Z') sort incorrectly against each other lexically."

**What an anonymous consumer wants instead.** `readCommittedManifest` for content, mirroring media's
own; a diff keyed on a persisted *stamp* rather than a persisted whole manifest — `publishedAt` is an
immutable ISO instant, so "everything stamped after `lastSeen`" is the same answer with none of the
D1 table, hashing, and memoization the consumer had to build; and `before: null` meaning "nothing is
new," with the full fan-out behind an explicit opt-in.

---

## Cross-cutting observation

The two seams that came from a **filed requirement specifying its own implementation** (`/auth-store`
"no new logic is being requested"; `publishedAt`/`newlyPublishedEntries` "proposed division of
labor") are the two whose shape shows most sharply, and in both the engine's own answer was already
sitting one module over — `findEditor` in `auth/store.ts`, `readCommittedManifest` in `media/`. The
one seam where the engine **argued with the requirement's proposed signature and convention**
(`/cloudflare`, refusing `(token, ip, secret)` and refusing degrade-to-open) is the one where the
retrofit completed and the hand-rolled copies are actually gone.

The discriminator is not requirement-vs-consumer. It is whether the engine re-derived the shape or
accepted the one it was handed.
