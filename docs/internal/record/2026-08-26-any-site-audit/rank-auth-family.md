# Auth-family subsystem ranking (`/auth-store`, `/auth-channel`, `/auth-crypto`)

Repo: `/home/glw907/Projects/cairn-cms`, `main` at HEAD. 24 items, all from
`bucket-auth-family.json`. Every item ranked 1 (weakest anonymous-consumer case) to 24
(strongest); no ties, nothing skipped.

## Collisions

**None.** Every item in this bucket carries `"collision": false`. No name in
`/auth-store`, `/auth-channel`, or `/auth-crypto` shares a name with a differing signature
elsewhere on the export surface. Noted explicitly per the audit instruction.

## Bucket-wide provenance finding

`familyOriginated` is **true for all 24 items**. Not one export in this subsystem has a
built consumer, inside the family or outside it.

- `/auth-store` (7 functions + `EditorRow`): filed by the xcathletes brief, seam 1. "The
  functions exist (`src/lib/auth/store.ts`) but are package-internal, consumed only by
  `editors-routes`; no export subpath reaches them." Status today:
  "**`/auth-store`** (0.93.0): the consumer is xcathletes Task 5 ... **Unbuilt.**"
  (`docs/internal/engine-harvest-candidates.md:71`).
- `/auth-crypto` (6 primitives): filed by the ASC brief, seam 1, on measured duplication
  ("ASC has done it twice ... each carries the same comment, 'reimplemented small here
  rather than importing the engine's auth internals'"). Status today: "the ASC retrofits
  (deleting `club-action.ts`, `portal-action.ts`, **the two crypto copies**, `turnstile.ts`
  ...) are queued in ASC's STATUS and **have not run**."
- `/auth-channel` (10 items): "**`createAuthChannel`** (merged, unpublished): the consumer
  is xcathletes Task 4. **Unbuilt**, and the pass-1 plan predates the factory ruling: it
  still specifies a hand-rolled OTP module with 6-digit codes ... while the factory defaults
  to 8-digit codes and requires a `challenge`. Nothing in the ecxc repo records the
  reconciliation; cairn's STATUS carries it one-sidedly."

No consumer outside the family exists. The showcase's `examples/showcase/src/members/`
fixture is engine-owned proof material, not an independent consumer; its own header says so
("the worked exemplar for docs/extend/add-a-second-audience.md").

---

## 1. `generateCsrfToken` — `/auth-crypto` — **retire**

`() => string`

**Provenance.** ASC brief seam 1: "a server-only export of the crypto primitives:
`generateToken`, `generateSessionId`, `generateCsrfToken`, `hashToken`, and the cookie-name
builders." Landed in `19659a39` ("re-exporting exactly six Web Crypto primitives"). No
built consumer; ASC's retrofit has not run. familyOriginated.

**Shaping evidence.** `src/lib/auth/crypto.ts:86` — the whole body is
`return randomBase64Url(32);`, byte-identical to `generateToken` and `generateSessionId`.
The reference page says it outright: "the same generator again"
(`docs/reference/auth-crypto.md:64`).

**Anonymous-consumer case.** A site building double-submit CSRF on its own member routes
needs a random token. It already has `generateToken` on the same subpath, from the same
import statement. The alias adds a third public name and zero capability, and CSRF plumbing
on a site's own forms is site domain the engine does not otherwise touch.

**Verdict: retire.** Three exported names for one function is the clearest evenness defect
in the bucket. Nothing is lost: the capability survives under `generateToken`. Argued the
other way honestly — call-site readability is a real good, and `generateCsrfToken()` reads
better in a CSRF handler than `generateToken()` does. That is a naming preference a site can
satisfy with a one-line local alias, and it does not buy a semver'd public name.

## 2. `generateSessionId` — `/auth-crypto` — **retire**

`() => string`

**Provenance.** Same ASC brief line and same commit as item 1. familyOriginated, no built
consumer.

**Shaping evidence.** `src/lib/auth/crypto.ts:81`, body `return randomBase64Url(32);`. Doc:
"the same generator `generateToken` uses under a name that reads at the session-id call
site" (`docs/reference/auth-crypto.md:52`).

**Anonymous-consumer case.** A site minting a member session id. It calls the identical
function under a different name. The edge an anonymous consumer actually hits is "how many
bytes, and is it URL-safe" — answered once by `generateToken`.

**Verdict: retire.** Ranked marginally above `generateCsrfToken` only because session
minting is closer to what a cairn site does than CSRF plumbing is. Same reasoning otherwise.
The counter-argument (a future divergence, say a longer session id) is speculative; when it
arrives it is a parameter on one generator, not a second name.

## 3. `CHANNEL_SCHEMA_VERSION` — `/auth-channel` — **retire**

`"1"`

**Provenance.** Engine-internal need, published alongside `CHANNEL_SCHEMA_SQL` in the
auth-channel factory pass (`490231e0` and successors). Neither consumer brief asks for it.
Consumer xcathletes Task 4, unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth-channel/store.ts:16` — "The schema version
`CHANNEL_SCHEMA_SQL` installs; `verifySchema` compares against this." The reference page
describes only engine-side behavior: "Every `createAuthChannel` action compares a channel's
`cairn_channel_meta` row against this value before serving" (`docs/reference/auth-channel.md:205`).

**Anonymous-consumer case.** The docs name no consumer action for this constant. The
comparison it exists for happens inside the factory. The nearest real scenario — a site's own
migration runner recording which schema version it installed — is served by the string being
embedded in `CHANNEL_SCHEMA_SQL`'s own `INSERT`, which the site runs.

**Verdict: retire.** Publishing an internal version marker as semver surface is surface
without capability, the same defect as the two aliases above. The counter is thin but real:
a site writing a bespoke drift check would want it. That site can read the
`cairn_channel_meta` row it just installed.

## 4. `devDelivery` — `/auth-channel` — **retire**

`<Env extends { CAIRN_DEV_BACKEND?: string | boolean }>(contact, code, ctx) => Promise<void>`

**Provenance.** Engine-internal, born with the factory. Neither brief asks for it. The ASC
brief's ask stops at primitives: "A site stops copying the cryptography, nothing else."
familyOriginated, no built consumer.

**Shaping evidence.** `src/lib/auth-channel/dev.ts:25-30` — the entire body is a flag check
and a `console.log`. Its own header explains why it exists at all: "The refusal lives inside
this function's own body, not in a caller's wrapper: a site writing
`deliver: (c, code, ctx) => devDelivery(c, code, ctx)` still refuses at call time without the
dev flag, the same failure mode v2 of the design left unclosed."

**Anonymous-consumer case.** A developer running `wrangler dev` with no SMS or email provider
wired wants the code printed. The hand-roll is one line:
`deliver: async (contact, code) => console.log(contact, code)`.

**Verdict: retire.** This is exactly the failure clause — "the hand-roll is small." Worse,
the export's stated justification is guarding a footgun in the factory it serves (a site
shipping the dev transport to production), which is a discoverability problem an export does
not fix: a site that wires `devDelivery` in production has already misread the docs, and a
site that hand-rolls the one-liner gets no guard from this export at all. Argued the other
way: the `CAIRN_DEV_BACKEND` refusal is genuine defense in depth. It belongs in the factory's
own construction check, not as a public transport.

## 5. `insertOwnerIfEmpty` — `/auth-store` — **retire**

`(db, email, displayName, now) => Promise<boolean>`

**Provenance.** xcathletes brief seam 1: "the existing store functions under semver."
Promoted in `82fcd36b` as one of "the seven D1 editor-provisioning functions." Consumer
unbuilt. familyOriginated.

**Shaping evidence.** The engine already ships a declarative path for this exact outcome:
`src/lib/sveltekit/auth-routes.ts:38` declares
`bootstrapOwner?: { email: string; displayName: string }`, and line 116 is the only in-engine
call, `await insertOwnerIfEmpty(db, email, config.bootstrapOwner.displayName, now)`. A site
seeds its first owner by passing `bootstrapOwner` to `createCairnAdmin`, never by calling
this.

**Anonymous-consumer case.** A site seeding the first owner from a setup script rather than
through the engine's login-path bootstrap. That scenario resolves to
`listEditors` (empty?) then `insertEditor`, both kept below.

**Verdict: retire.** Two public paths to one outcome is an evenness defect, and the
declarative one is better: it seeds on the bootstrap login, where the atomicity this function
provides actually matters. Argued the other way honestly: the
`INSERT ... SELECT ... WHERE NOT EXISTS` race safety is real engine knowledge a site would
not write. That race exists on a concurrent login path, not in the setup script this export
serves; the site with the race already has `bootstrapOwner`.

## 6. `hashToken` — `/auth-crypto` — **keep** (absence-of-objection)

`(token: string) => Promise<string>`

**Provenance.** ASC brief seam 1, named explicitly. Retrofit queued, not run.
familyOriginated.

**Shaping evidence.** `src/lib/auth/crypto.ts:91-95` — four lines: `TextEncoder`,
`crypto.subtle.digest('SHA-256', ...)`, hex map. The doc's value is in the precondition, not
the code: "Safe only for a value drawn from a CSPRNG ... never hash a password, a numeric OTP,
an email address" (`docs/reference/auth-crypto.md:79`).

**Anonymous-consumer case.** A site storing member session tokens hash-only, so a leaked
database yields no live sessions, and comparing a presented token's digest against the stored
row with `tokensMatch`. The pair is what makes the discipline usable in one import.

**Verdict: keep**, with the burden honestly unmet. The hand-roll here is small and carries no
judgment beyond "SHA-256, lowercase hex." What justifies it is the pairing: retiring it while
keeping `tokensMatch` would leave a site producing its own digest shape and comparing it with
the engine's comparator, which is a worse surface than either alone. That is an argument from
coherence, not from a scenario only this export serves, so `absenceOfObjection: true`. This
is the weakest keep in the bucket and the first item to revisit if the crypto subpath is
trimmed further.

## 7. `DeliverContext` — `/auth-channel` — **reshape**

`{ env: Env | undefined; waitUntil: (promise) => void }`

**Provenance.** Born with the factory; no brief asks for it. Consumer unbuilt.
familyOriginated.

**Shaping evidence.** `src/lib/auth-channel/factory.ts:164` — two fields. It exists because
`deliver` and `devDelivery` name it: "The context `deliver` and `devDelivery` receive
alongside the contact and code."

**Anonymous-consumer case.** A site typing its own `deliver` implementation. Entirely
entailed by `createAuthChannel`; it has no case of its own.

**Verdict: reshape**, following `createAuthChannel` (item 15). The shape of the type itself
is fine. Its membership is exactly as strong as the factory's, and if the factory shrinks to
a seam this type shrinks or disappears with it.

## 8. `ChannelRequestResult` — `/auth-channel` — **reshape**

`{ sent: true } | { error: 'invalid' | 'throttled' | 'challenge-required' | 'unavailable' }`

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth-channel/factory.ts:171` — "`sent` even for an unknown
contact, so the response never leaks roster membership." That non-leak ruling is genuine
engine knowledge, and it is expressed in the union's shape.

**Anonymous-consumer case.** A site's `+page.server.ts` switching on the request action's
result to pick a message. Entailed by `createAuthChannel`.

**Verdict: reshape**, following the factory. Noted in its favor: this union is one of the
better-shaped things in the subsystem — discriminated, closed, and it encodes the
enumeration-oracle ruling in the type rather than in prose.

## 9. `ChannelConfirmResult` — `/auth-channel` — **reshape**

`{ ok: true } | { error: 'throttled' | 'challenge-required' | 'unavailable' | 'bad-code' | 'expired' | 'locked' | 'no-pending-request' }`

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth-channel/factory.ts:177` — "`challenge-required` is a
retry invitation, never a hard failure."

**Anonymous-consumer case.** A site rendering seven distinct confirm outcomes on its login
form. Entailed by `createAuthChannel`.

**Verdict: reshape**, following the factory. Ranked one above `ChannelRequestResult` only
because a consumer touches more of it (seven arms, each needing site copy).

## 10. `AuthChannelEvent` — `/auth-channel` — **reshape**

`{ url; request; cookies; platform?; getClientAddress() }`

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** Its own header states the duplication:
"Kept local rather than reused from `CairnEvent` (`../sveltekit/types.js`) ... a real
SvelteKit `RequestEvent` satisfies both structurally" (`factory.ts:134-139`).

**Anonymous-consumer case.** A site typing the parameter of its own `challenge` callback or
`rateLimit.key`.

**Verdict: reshape**, and this one carries an objection of its own beyond the factory's. The
engine now publishes a third request-event shape (`RequestEvent`, `CairnEvent`, and this) for
a consumer to hold in their head, and the type's own comment concedes SvelteKit's satisfies
it structurally. **Right form:** name SvelteKit's `RequestEvent` in the callback signatures
and stop exporting a parallel shape; if the factory must stay framework-neutral, express the
requirement as a structural constraint on `CairnEvent` rather than a fourth published
interface.

## 11. `AuthChannel` — `/auth-channel` — **reshape**

`{ actions: { request; confirm; logout }; resolveSubject; revokeSessions }`

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `factory.ts:260-273`. Note the asymmetry inside it:
`revokeSessions: (db: D1Database, subject: string) => Promise<void>` takes a raw binding,
while every other member takes an event and resolves the binding through the config's own
`resolveDb`.

**Anonymous-consumer case.** A site holding the constructed channel in a module-scope const
and typing it.

**Verdict: reshape**, following the factory, plus that internal asymmetry. **Right form:**
`revokeSessions` should take the same `(event)` the rest of the object takes, or an env, so a
consumer never has to reach past `resolveDb` for the one call the engine itself describes as
the roster-removal exemplar.

## 12. `CHANNEL_SCHEMA_SQL` — `/auth-channel` — **reshape**

A multi-table DDL string.

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth-channel/store.ts:30` onward: four `CREATE TABLE`s, six
indexes, and a seeding `INSERT`, published as a template literal. The engine treats its own
auth schema completely differently: `migrations/0000_auth.sql` through `0003_preview.sql` are
real files, shipped in the tarball (`package.json` `files` includes `"migrations"`).

**Anonymous-consumer case.** A site must run this DDL once against its channel binding before
any action works: "Run it once, from a migration your own tooling applies, in a
`migrations_dir` separate from your site's own auth migrations"
(`docs/reference/auth-channel.md:180`). Concrete and unavoidable while the factory exists.

**Verdict: reshape.** Right membership if the factory stays — a consumer cannot migrate
without it. Wrong form, and provably so by the engine's own inconsistency: `AUTH_DB` gets
packaged `.sql` migration files, the channel gets a string a site must paste into a file it
writes. **Right form:** ship the channel schema as a packaged migration directory beside
`migrations/`, the shape the engine already proves, and drop the string constant. The
per-deployment salt exclusion the constant's comment defends is unaffected by that change.

## 13. `AuthChannelConfig` — `/auth-channel` — **reshape**

`{ resolveDb; deliver; lookup; normalize; challenge; cookie; verify?; kind?; ttl?; rateLimit? }`

**Provenance.** Born with the factory. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `factory.ts:187-257`, ten fields, nine of them under a `ttl` bag whose
own in-tree `WATCH` comment concedes the name is wrong: "only three of these nine fields are
durations ... so the `ttl` name reads narrower than the bag's contents. The grouping is
spec-faithful, since the design's own Defaults and clamps table treats every clamped numeric
knob as one family." Also `kind?: 'code'` — a single-valued union: "Reserved for a future
authenticator kind ... Only `'code'` is implemented; any other value rejects at construction."

**Anonymous-consumer case.** The surface a consumer actually reads and writes; nobody uses
the factory without it.

**Verdict: reshape**, following the factory, with two independent objections. First, `ttl`
groups nine knobs by "the spec's table said so" — transplanted from the design document
rather than re-derived for a reader, which is constraint 3 in miniature. Second, `kind?:
'code'` publishes a reserved extension point with exactly one legal value; an anonymous
consumer can only ever write the default, so it is speculative surface. **Right form:** drop
`kind` until a second authenticator exists, and if a knob bag survives the factory reshape,
name it for what it holds (limits/defaults), not for the three fields that happen to be
durations.

## 14. `generateToken` — `/auth-crypto` — **keep**

`() => string`

**Provenance.** ASC brief seam 1, named first in the ask. Measured duplication: ASC hand-rolled
it twice (`src/member-auth/lib/crypto.ts`, `src/admin-club/lib/offers.ts`), and the brief
records the xcathletes platform's member OTP as "the family's third reimplementation."
Retrofit not yet run. familyOriginated.

**Shaping evidence.** `src/lib/auth/crypto.ts:67-78` — `crypto.getRandomValues(new
Uint8Array(32))`, base64 with the three URL-safe substitutions and padding stripped.

**Anonymous-consumer case.** A site building a members area on cairn mints a single-use link
token to email a member. Written by hand, this is where `Math.random()`, a 16-byte draw, or a
raw base64 `+`/`/` in a URL path get shipped, and none of the three fails a test. One import
gives the site the same 256-bit URL-safe draw the engine's own editor login runs in
production.

**Verdict: keep**, and it absorbs items 1 and 2. This is the survivor of the three-alias
group: one generator, one name. Argued against honestly — the body is seven lines and a
competent developer writes it correctly. The counter that decides it is that the incorrect
versions look identical in review and pass every test, which is the class of thing an engine
should own rather than document.

## 15. `createAuthChannel` — `/auth-channel` — **reshape**

`<Env>(config: AuthChannelConfig<Env>) => AuthChannel<Env>`

**Provenance.** This is the item the audit exists for. **Neither filed ask requests it.** The
ASC brief asks for primitives and closes the scope explicitly: "The audience semantics stay
site-owned: the store schema, the session model, and the two-stores-never-blur rule are
untouched. **A site stops copying the cryptography, nothing else.**" The xcathletes
requirements disclaim the engine entirely: "**Member OTP auth, notifications, chat, and push
are platform-native by design and ask nothing of the engine**" (restated in the brief's own
scope check). The factory was built anyway, 965 lines plus a 446-line store. Consumer status:
"Unbuilt, and the pass-1 plan predates the factory ruling: it still specifies a hand-rolled
OTP module with 6-digit codes ... while the factory defaults to 8-digit codes and requires a
`challenge`. Nothing in the ecxc repo records the reconciliation; cairn's STATUS carries it
one-sidedly." familyOriginated, and no consumer anywhere has built against it.

**Shaping evidence.** Charter, `CLAUDE.md`: "Everything a site needs beyond that, its own
functionality, **actors**, **auth**, data, and domain logic, belongs to the developer, and
cairn serves it with **a thin seam, not a built-in feature**." What shipped is a complete
second login subsystem: its own four-table D1 schema, its own budget/sliding-window tables,
its own cookie namespace, a mandatory Turnstile hook, nonce-bound codes, a requester-versus-
identity throttle asymmetry, and a schema-version gate.

**Anonymous-consumer case.** Genuinely real, and worth stating at full strength: a cairn site
with a members area — a club, a school, a paid newsletter — needs a login for non-editors,
and the failure modes of a hand-rolled OTP (enumeration oracle on an unknown contact,
unbounded guessing, a throttle keyed on identity so a stranger can lock a member out) are
precisely what a site ships without noticing. This is the opposite of "the hand-roll is
small." The factory's atomic-conditional throttle discipline ("a read-modify-write
implementation passes every single-caller test while admitting far more than its cap under
concurrency," `store.ts:9-12`) is exactly the knowledge an engine should hold.

**Verdict: reshape**, on shape, decisively — not on membership and not on migration cost
(churn is free until beta; that never enters the verdict).

Three failures, each provable:

1. **Not a seam.** A whole authenticator with its own persistence layer is the "built-in
   feature" the charter's boundary sentence forbids for an actor cairn does not own.
2. **A second, divergent grammar.** The engine's editor login is magic-link over `AUTH_DB`
   with `cairn_session` cookies and packaged migrations. The channel is code-OTP over a
   separate binding with `cairn_channel_*` tables, a separate cookie namespace, and a DDL
   string. Two auth grammars in one library, neither derived from the other.
3. **Transplanted, not re-derived** — constraint 3, violated in the sharpest possible way.
   The only named consumer specified 6-digit codes and no challenge; the factory ships
   8-digit codes and a required challenge, taken from the design spec's Defaults table. The
   requesting site cannot adopt it unchanged, and no one has tried.

**Right form:** shrink to what both filed asks actually requested. Keep `/auth-crypto`'s
primitives as the seam, plus a documented recipe in `docs/extend/add-a-second-audience.md`
carrying the rulings that matter (never leak roster membership from `request`; charge the
requester bucket, escalate on identity, never deny on identity; make every throttle one
atomic conditional statement). If a generalized authenticator is still wanted after a real
consumer builds one, derive it by parameterizing the engine's **own** editor login by
audience, so the library holds one auth grammar rather than two. Retiring the factory
outright is the live alternative and the evidence leans that way; reshape is the verdict
because the security knowledge inside it is worth preserving somewhere, and prose plus
primitives is the cheapest place to put it.

## 16. `cookieName` — `/auth-crypto` — **keep**

`(base: string, secure: boolean) => string`

**Provenance.** ASC brief seam 1, and the one part of that ask that was correctly re-derived
rather than transplanted: "The cookie-name builders and the TTL constants are fixed to the
editor store today, so the promotion **parameterizes them (a cookie base name, TTLs as
arguments)** while the pure crypto exports as is." Delivered that way in `af886673`:
"sessionCookieName and csrfCookieName become one-line delegations through a new
cookieName(base, secure)." familyOriginated, retrofit not yet run.

**Shaping evidence.** `src/lib/auth/crypto.ts:43-56` — applies `__Host-` on secure, validates
the base against the RFC 6265 token set, and throws on an already-prefixed base because
"double-prefixing is a cookie the browser silently rejects, not a runtime error."

**Anonymous-consumer case.** A site setting a member session cookie on a cairn deployment
that runs https in production and plain http under `wrangler dev`. Hard-coding
`__Host-member_session` breaks local dev (the browser drops a `__Host-` cookie without
`Secure`); omitting the prefix in production drops origin binding. The function answers both
from one boolean, and the throw catches the `__Host-__Host-` mistake that otherwise
manifests as a cookie that silently never arrives.

**Verdict: keep.** Membership and shape both right. Note in particular that the engine's own
`sessionCookieName`/`csrfCookieName` stayed internal — the barrel comment states why
("colliding with them is the two-stores blur the `cairn_` namespace reservation warns
against"). That restraint is the model the auth-channel factory did not follow.

## 17. `tokensMatch` — `/auth-crypto` — **keep**

`(a: string, b: string) => boolean`

**Provenance.** ASC brief seam 1 (the crypto-primitive ask), consolidated into
`auth/crypto.ts` in `af886673`: "tokensMatch moves out of sveltekit/csrf.ts into
auth/crypto.ts, now byte-encoding both sides and preferring crypto.subtle.timingSafeEqual
when the runtime provides it." familyOriginated, retrofit not yet run.

**Shaping evidence.** `src/lib/auth/crypto.ts:113-125`, and the contract above it names three
non-obvious rulings: it leaks length deliberately, `tokensMatch('', '')` is **false** "so an
unset expected value can never accept an unset submitted one," and it is for fixed-length
CSPRNG tokens only.

**Anonymous-consumer case.** A site comparing a member's submitted session token, or a
double-submit CSRF pair, against a stored value. The obvious `a === b` short-circuits on the
first differing byte, and the obvious hand-roll of the fix forgets the empty-string case, so
a request with no cookie and no form field authenticates. That last one is a live
vulnerability an anonymous consumer reaches by writing the natural code.

**Verdict: keep.** The strongest item in `/auth-crypto`: a small function whose correctness
is genuinely counterintuitive, in the exact shape any site can call. The `timingSafeEqual`
feature probe is engine-appropriate runtime knowledge a site should not carry.

## 18. `EditorRow` — `/auth-store` — **keep**

`{ email: string; displayName: string; role: string }`

**Provenance.** xcathletes brief seam 1; promoted in `82fcd36b` "plus EditorRow and Role."
(`Role` has since been dropped from this barrel — evidence the surface has been pruned once
already.) Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:25`, with the boundary stated: "The store has no
access to the site's declared vocabulary, so it can never resolve `capability`; a caller that
needs a full `Editor` resolves capability itself and spreads it onto this shape."

**Anonymous-consumer case.** A site rendering its own roster screen writes
`const rows: EditorRow[] = await listEditors(db)` and maps over it. The type is not optional
surface: without it, a consumer cannot declare the result of a kept function.

**Verdict: keep.** Entailed by `listEditors`, and correctly minimal — it deliberately stops
short of `capability` rather than pulling the site's role vocabulary into the store's return
shape. Ranked below the functions because its case is entailment rather than an independent
situation, but the entailment is airtight.

## 19. `setEditorRole` — `/auth-store` — **keep**

`(db, email, role) => Promise<void>`

**Provenance.** xcathletes brief seam 1: "adding a coach there must also provision that
person as a cairn editor: coach surfaces ride the magic-link shell." Task 5, unbuilt.
familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:233` — one `UPDATE`, plus the store-wide
normalization invariant applied to the email. Doc warning: "For an owner-capability row,
`deleteEditor` and `setEditorRole` write **unconditionally**" (`docs/reference/auth-store.md:44`).

**Anonymous-consumer case.** A site with its own user-management screen promotes a
contributor to editor when their site-side role changes, and the change must be visible to
the engine's admin guard on the next request.

**Verdict: keep.** The `editor` table is engine-owned schema; a site writing raw SQL against
it couples to columns the engine is free to change. Ranked lowest of the seven functions
because it is the one with no invariant of its own — it is a bare `UPDATE`, and the doc has
to warn a caller to prefer `demoteOwnerIfNotLast` instead. That is a small shape wart, not
enough to move the verdict.

## 20. `listEditors` — `/auth-store` — **keep**

`(db) => Promise<EditorRow[]>`

**Provenance.** xcathletes brief seam 1. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:118` — `SELECT email, display_name, role FROM
editor ORDER BY email`, mapped through `toEditor` so the snake_case columns never reach a
consumer.

**Anonymous-consumer case.** A site showing "who can edit this site" inside its own admin,
or a setup script checking whether the roster is empty before seeding. Also the documented
prerequisite for using the owner guards correctly: "Both guards return `false` for two
outcomes ... To tell them apart, read the roster with `listEditors` first"
(`docs/reference/auth-store.md:57`).

**Verdict: keep.** The column-name mapping is the load-bearing part: a hand-rolled `SELECT *`
pins a consumer to `display_name` and to whatever columns the engine adds next. Argued
against — a read is the most patchable thing in the bucket, since a site's own `SELECT` works
today. It works until the engine's next migration, which is exactly the coupling an export
exists to prevent.

## 21. `insertEditor` — `/auth-store` — **keep**

`(db, email, displayName, role, now) => Promise<void>`

**Provenance.** xcathletes brief seam 1: "The functions exist ... but are package-internal
... Ask: a supported server-only export surface ... **No new logic is being requested; this
is an export-map promotion of a surface the engine already trusts internally.**" Consumer
unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:126-137`, and the reason the export is the only
safe path is spelled out at the top of the file: "`/auth-store` is public surface, and a
consumer provisioning an editor from an address as a user typed it would otherwise write a
shadow row that can never sign in yet still counts toward the last-owner guards."

**Anonymous-consumer case.** A site syncing editors from its own user table or an SSO
directory inserts a row for `Backup@Site.com` as the user typed it. Hand-rolled, that row is
unreachable to the login form's lowercased lookup — an editor who can never sign in, and who
still blocks the last-owner guard. The export normalizes at the store, so the bug is
impossible.

**Verdict: keep.** Membership and shape both right. The gate's first clause applies literally:
the `editor` table is engine-owned, and the site cannot legally reach or patch it. The `now`
parameter is a minor wart (a caller must supply a clock the engine could read itself), but it
matches every sibling in the file and keeps the store testable, so it stays.

## 22. `deleteEditor` — `/auth-store` — **keep**

`(db, email) => Promise<void>`

**Provenance.** xcathletes brief seam 1. Consumer unbuilt. familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:169-177` — three batched deletes (`session`,
`magic_token`, `editor`) plus `deleteEditorPreviewTokens` outside the batch, with 25 lines of
comment explaining why: "A single `db.batch()` fails the WHOLE batch on one statement's 'no
such table', which would regress that site's editor removal entirely."

**Anonymous-consumer case.** A site removing a departing staff member from its own roster
screen. `DELETE FROM editor WHERE email = ?` looks complete and is not: the removed person's
session cookie stays valid for up to thirty days, their pending magic link still redeems, and
every preview link they minted keeps resolving. A site cannot discover that cascade without
reading engine internals, because the tables it must also clear are engine-owned.

**Verdict: keep**, and one of the clearest keeps in the bucket. Revocation-on-removal is
security behavior the engine owns because only the engine knows what a removal must reach.

## 23. `demoteOwnerIfNotLast` — `/auth-store` — **keep**

`(db, email, ownerRoles: string[], newRole) => Promise<boolean>`

**Provenance.** xcathletes brief seam 1, "and the owner guards." Consumer unbuilt.
familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:243-260` — the owner count sits inside the
`UPDATE`'s own `WHERE`, not in a preceding read. The contract states why `ownerRoles` is a
parameter: "the vocabulary's owner-capability name set, so a site with more than one
owner-level role name stays safe."

**Anonymous-consumer case.** A site's roster screen demotes a coach who happens to be the
last owner, from two browser tabs, or two admins act at once. A read-then-write guard passes
both checks and leaves the site with zero owners and no way back into `/admin` — an
unrecoverable lockout on a live site.

**Verdict: keep.** Membership and shape both right, including the `ownerRoles` parameter,
which correctly refuses to hard-code `'owner'` and instead takes the site's own vocabulary
(derived with `ownerLevelRoles`, per the reference page). The `boolean` return conflating
"last owner" with "no match" is a documented wart the doc handles by telling callers to read
the roster first; a two-arm result would be better, and that is a refinement, not a reshape.

## 24. `removeOwnerIfNotLast` — `/auth-store` — **keep**

`(db, email, ownerRoles: string[]) => Promise<boolean>`

**Provenance.** xcathletes brief seam 1, the owner guards. Consumer unbuilt.
familyOriginated.

**Shaping evidence.** `src/lib/auth/store.ts:188-207` — the count is inside the `DELETE`
("The count is part of the DELETE, so two concurrent removals cannot both pass a separate
check and strand the allowlist below one owner"), and on success it runs the full
session/token/preview cascade.

**Anonymous-consumer case.** A site removing a departing owner from its own admin. This
single call carries both hazards the bucket contains: the concurrent last-owner race that
locks a site out of `/admin` permanently, and the revocation cascade that otherwise leaves a
removed owner with a live session, a redeemable magic link, and working preview URLs.
Neither is discoverable from outside the engine, and both are unrecoverable in production.

**Verdict: keep.** Strongest anonymous-consumer case in the subsystem, and the shape is
right: engine-owned tables, engine-owned invariant, site-owned vocabulary passed in. This is
what the rest of the bucket should be measured against.

---

## Summary

| Verdict | Count | Items |
| --- | --- | --- |
| keep | 11 | the seven `/auth-store` survivors (`listEditors`, `insertEditor`, `deleteEditor`, `setEditorRole`, `removeOwnerIfNotLast`, `demoteOwnerIfNotLast`, `EditorRow`) plus `generateToken`, `hashToken`, `cookieName`, `tokensMatch` |
| reshape | 8 | `createAuthChannel` and everything naming it (`AuthChannelConfig`, `AuthChannel`, `AuthChannelEvent`, `DeliverContext`, `ChannelRequestResult`, `ChannelConfirmResult`, `CHANNEL_SCHEMA_SQL`) |
| retire | 5 | `generateSessionId`, `generateCsrfToken`, `insertOwnerIfEmpty`, `devDelivery`, `CHANNEL_SCHEMA_VERSION` |

Net shape of the finding: `/auth-store` is the healthy subpath — engine-owned tables a site
cannot legally reach, promoted verbatim on a filed requirement, minus one duplicate path.
`/auth-crypto` is healthy in membership and slightly padded in form: three names for one
generator, collapsing to one. `/auth-channel` is the outlier — a full second auth subsystem
built past both filed asks, with the requesting site's own requirements on record saying
member OTP auth "ask[s] nothing of the engine," and no consumer anywhere has built against
it.
