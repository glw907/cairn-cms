# Fresh-context verification — auth family (`/auth-store`, `/auth-channel`, `/auth-crypto`)

Verifier notes appended to the ranking at `rank-auth-family.md`. Repo `main` at HEAD, plus the
consumer repos under `~/Projects` read at their own HEADs.

## Bucket-wide correction (material, affects 15 of 24 arguments)

The ranking's headline provenance finding — "**Not one export in this subsystem has a built
consumer**", repeated per item as "retrofit queued, never run" and "Task 4/Task 5 unbuilt" — is
**false as of today**. Both consumers are built and committed:

- `aksailingclub-org`, commit `fbb5908` ("migrate to 0.94.0-rc.1 and retrofit four packaged
  seams"). `src/member-auth/lib/crypto.ts` now imports `cookieName, generateToken,
  generateSessionId, generateCsrfToken, hashToken` from `@glw907/cairn-cms/auth-crypto`; its
  header says "the copies are gone". `src/member-auth/lib/auth.ts` and
  `src/member-portal/lib/portal-action.ts` import `tokensMatch`; `src/admin-club/lib/offers.ts`
  imports `generateToken, hashToken`. All six `/auth-crypto` exports have a real caller.
- `xcathletes-org`, commit `a7bb76e` and neighbours. `src/lib/server/auth/channel.ts` calls
  `createAuthChannel` and imports `AuthChannel` and `AuthChannelEvent`;
  `src/lib/server/auth/transport.ts` imports `devDelivery` and `DeliverContext`;
  `src/lib/server/roster/roster-admin.ts` imports `deleteEditor, insertEditor, listEditors,
  removeOwnerIfNotLast` from `/auth-store`; `migrations-platform/0002_auth_channel.sql` is
  `CHANNEL_SCHEMA_SQL` pasted verbatim.

`familyOriginated` stays **true** for all 24 (both consumers are family sites), so the
anonymous-consumer bar is unchanged. But "unbuilt" was load-bearing in several arguments,
above all item 15's, and the builds falsify one of that item's three named failures.

Still unbuilt anywhere: `insertOwnerIfEmpty`, `setEditorRole`, `demoteOwnerIfNotLast`,
`EditorRow` (declared locally, not imported), `CHANNEL_SCHEMA_VERSION`,
`ChannelRequestResult`/`ChannelConfirmResult` (inferred at the call site, never imported by name),
`AuthChannelConfig` (written as an object literal, never named).

## Per item

**1. `generateCsrfToken` — retire — stands.** `crypto.ts:86` is `return randomBase64Url(32)`,
byte-identical to lines 77 and 82. Strengthened by the built consumer: ASC's `crypto.ts` imports
all three aliases and immediately re-aliases each under its own reading name
(`generateMemberCsrfToken` → `generateCsrfToken()`). The site writes the local alias anyway, which
is exactly the remedy the ranking proposed.

**2. `generateSessionId` — retire — stands.** Same evidence; ASC's `generateMemberSessionId` is a
one-line delegation. Migration churn for ASC does not enter the verdict (standing ruling).

**3. `CHANNEL_SCHEMA_VERSION` — retire — stands.** No consumer reads it: `xcathletes-org` has no
reference to the constant, and its pasted migration carries the literal `'1'` inside the seeded
`INSERT`. `verifySchema`'s comparison is engine-internal, and a mismatch already fails closed with
`{error:'unavailable'}`. The drift problem the consumer really has (a hand-diffed copy) is item
12's, and a packaged migration solves it without publishing a version marker.

**4. `devDelivery` — retire — DOES NOT STAND → keep.** Two of the ranking's premises break against
the built consumer. `xcathletes-org/src/lib/server/auth/transport.ts` imports `devDelivery`,
wraps it, and records that it satisfies a Gate 1 governance obligation *because the refusal is
inside the function*: "`devDelivery` already throws internally unless
`ctx.env.CAIRN_DEV_BACKEND === '1'`, so wrapping it below is not a bypass". The claim that this
is "a discoverability problem an export cannot fix" is wrong in the one direction that matters:
a wrapper cannot bypass an in-body check, which is precisely a footgun an export *does* close.
The hand-roll is one line only if you drop the guarantee; the failure it prevents (the dev
transport live in production, printing OTP codes to Worker logs) is silent and severe — the same
class of "looks identical in review, passes every test" defect that earned `generateToken` its
keep. Membership follows the factory: if `createAuthChannel` survives (it does, item 15), every
site building a channel needs a no-provider transport during development.

**5. `insertOwnerIfEmpty` — retire — stands.** `auth-routes.ts:116` is the only in-engine call, on
the declarative `bootstrapOwner` path (`auth-routes.ts:38`), and `xcathletes-org` seeds its owner
that way (`src/chassis/cairn.server.ts`). One extra shape objection the ranking missed: the
statement hard-codes the literal role `'owner'` (`store.ts:224`) while every sibling guard takes
the site's own `ownerRoles` vocabulary — the transplant tell, on a function whose siblings refuse
it.

**6. `hashToken` — keep — stands, and the burden is now met.** The ranking marked
`absenceOfObjection: true` on a coherence argument alone. Two independent built features use it:
ASC member sessions (`member-auth/lib/crypto.ts`) and ASC waitlist-offer tokens
(`admin-club/lib/offers.ts`), both storing hash-only. Recorded objection the docs should carry:
it is a misuse magnet — the engine's own `auth-channel/identity.ts` never hashes a contact naked,
it salts and prefixes first, and a site handed `hashToken` on the public surface will hash
contacts and OTPs with it.

**7. `DeliverContext` — reshape — stands.** Genuinely consumed: both
`xcathletes-org/src/lib/server/auth/transport.ts` and the showcase's `capture-transport.ts` import
it to type their own `deliver`. Membership is entailed by the factory and follows its verdict; the
type's own two-field shape is fine.

**8. `ChannelRequestResult` — reshape — stands.** The built consumer switches on the result
(`(members)/login/+page.server.ts:32`) without importing the type name. Follows the factory; the
no-roster-leak ruling encoded in the union must survive any reshape.

**9. `ChannelConfirmResult` — reshape — stands.** Same, at line 40. Follows the factory.

**10. `AuthChannelEvent` — reshape — stands.** The consumer imports it and types its own
`sessionPerson(event: AuthChannelEvent<Env>)`, so it is doing work; the objection is unchanged and
independent — `factory.ts:134-139` concedes a real `RequestEvent` satisfies it structurally, and
the engine now publishes a third request-event shape.

**11. `AuthChannel` — reshape — stands, and the asymmetry is confirmed in the field.**
`revokeSessions(db, subject)` (`factory.ts:272`) forced the built consumer into
`buildChannel(db).revokeSessions(db, personId)` — constructing a whole throwaway channel to reach
one method — with a paragraph of comment rationalizing it
(`xcathletes-org/src/lib/server/auth/channel.ts:142-153`). The showcase does the same, digging
`platform.env.MEMBER_DB` out by hand in `/test/revoke-member-session`. Right form as stated:
`(event)`, resolving through `resolveDb` like every sibling.

**12. `CHANNEL_SCHEMA_SQL` — reshape — stands, with the strongest field evidence in the bucket.**
The DDL now exists in three places: the constant (`auth-channel/store.ts:30`), the engine's own
`examples/showcase/migrations-members/0000_channel.sql`, and
`xcathletes-org/migrations-platform/0002_auth_channel.sql`, whose header records the drift control
as a **manual diff**: "copied verbatim from `CHANNEL_SCHEMA_SQL` ... diffed against that source at
copy time (2026-08-20, cairn-cms 0.95.0) to confirm the two agree." The engine ships
`migrations/0000_auth.sql`…`0003_preview.sql` in the tarball (`package.json` `files`) for its own
auth schema. Ship the channel schema the same way and drop the constant.

**13. `AuthChannelConfig` — reshape — stands, on a bigger defect than the one named.** The ttl-bag
name (`factory.ts:221` WATCH) and `kind?: 'code'` warts are real but minor. The load-bearing form
defect the ranking missed, recorded by the consumer at
`xcathletes-org/src/lib/server/auth/channel.ts:8-17`: `lookup(contact)` and `verify(subject)`
receive no `env` and no request context, so a D1-backed roster cannot be queried from them. The
consumer had to build one channel per `PLATFORM_DB` object and cache it in a module-level
`WeakMap`. Any anonymous consumer with a database-backed roster hits this on the first build.
Also confirmed: `codeLength` clamps 8-10, and the consumer's own six-digit requirement was
abandoned rather than fought.

**14. `generateToken` — keep — stands.** Built callers in ASC member auth and waitlist offers.
`crypto.ts:67-78` is the URL-safe 256-bit draw; the failure modes it forecloses (`Math.random`, a
16-byte draw, raw `+`/`/` in a URL) are silent.

**15. `createAuthChannel` — reshape — stands as a label, but the ranking's reasoning needs
correcting, and its "right form" is falsified.** Failure 3 ("transplanted, not re-derived; the
requesting site cannot adopt it unchanged") is disproved by the build: xcathletes adopted the
factory, took the engine's 8-digit default over its own written six-digit requirement, wired
Turnstile as `challenge`, and overrode exactly one knob (`sessionTtlMs`, 90 days, inside the
engine's one-year clamp), with an explicit in-code instruction not to fight the clamp. The
ranking's proposed right form — shrink to `/auth-crypto` plus a recipe, "retire outright is the
live alternative" — would now delete a working seam under a built consumer that took the engine's
security defaults over its own. Membership therefore holds. The reshape is a **form** verdict on
concrete, field-measured defects: config callbacks with no env/request context (item 13),
`revokeSessions`'s raw-`D1Database` asymmetry (item 11), the DDL shipped as a string (item 12),
and the parallel event interface (item 10). The charter objection (a second auth grammar beside
the engine's own magic-link login) is unresolved and belongs in whatever reshape happens; it is
not evidence for retiring the export now.

**16. `cookieName` — keep — stands.** Built consumer: ASC names two bases through it
(`asc-member`, `asc-member-csrf`), and `createAuthChannel` validates a site's base through it
twice (`factory.ts:298-299`). Recorded objection: a `cairn_`-prefixed base throws in the factory
(`factory.ts:293`) but only earns a doc warning in `cookieName` itself (`crypto.ts:38-41`), so the
guard is missing on the surface a primitives-only site uses alone. A refinement, not a reshape —
the engine's own `sessionCookieName` passes `cairn_session` through this function, so the refusal
needs an internal path before it can move.

**17. `tokensMatch` — keep — stands.** `crypto.ts:116` verifies the ranking's claim:
`aBytes.length === 0` returns false, so `tokensMatch('','')` is false. Built callers in ASC
(`member-auth/lib/auth.ts`, `member-portal/lib/portal-action.ts`).

**18. `EditorRow` — keep — stands, with the claim overstated.** "Without the type a consumer
cannot declare a kept function's result" is not what the built consumer did: `roster-admin.ts`
lets `listEditors`'s return type infer, and `roster-admin.test.ts:40` declares its own local
`EditorRow` interface. The keep survives on entailment (an exported function's return shape needs
a name for any consumer that stores or passes it) and on `check:reference`, not on necessity.

**19. `setEditorRole` — keep — stands (tested hard, nearly flipped).** I tried to reshape it into
a single guarded role writer, on the ground that it publishes an unguarded `UPDATE` beside
`demoteOwnerIfNotLast` and can strand a site with zero owners — an unrecoverable `/admin` lockout,
since `bootstrapOwner` only fires on an empty table. The flip fails on symmetry:
`demoteOwnerIfNotLast` acts **only** on owner-capability rows (writes nothing and returns false
otherwise), so a site changing an ordinary editor's role must call `setEditorRole`. That is the
same guarded/unguarded pair `removeOwnerIfNotLast`/`deleteEditor` forms, and the built consumer
uses exactly that branch pattern for removal (`roster-admin.ts:230-240`). xcathletes' rejection of
`setEditorRole` (`roster-admin.ts:220`) is a vocabulary-specific reason (its roles are only
`owner` and `coach`), not a shape complaint. The wart is that both unguarded writers rely on a doc
warning (`docs/reference/auth-store.md:45-49`); a two-arm result rather than a bare `void`/`boolean`
would carry it in the type.

**20. `listEditors` — keep — stands.** Built caller (`roster-admin.ts:232`), and the `toEditor`
mapping keeps `display_name` off the consumer's surface exactly as argued.

**21. `insertEditor` — keep — stands.** Built caller in xcathletes' coach-provisioning path, which
is precisely the "sync editors from my own user table" scenario, and the store-level email
normalization (`store.ts:15-17`, `135`) is what makes the shadow-row bug impossible.

**22. `deleteEditor` — keep — stands.** Built caller (`roster-admin.ts:239`). The cascade
(`store.ts:169-177` plus `deleteEditorPreviewTokens`) and the batch-splitting reason are
engine-only knowledge.

**23. `demoteOwnerIfNotLast` — keep — stands.** Unbuilt, but the count sits inside the `UPDATE`
(`store.ts:251-258`) and the lockout it prevents is unrecoverable without direct D1 access. The
`boolean` conflation of "last owner" with "no match" is the same documented wart as item 19.

**24. `removeOwnerIfNotLast` — keep — stands, and the built consumer proves the pairing.**
`roster-admin.ts:205-240` documents why it cannot be called unconditionally (it silently writes
nothing for a non-owner row) and branches on `ownerLevelRoles(roles)` — the site's own vocabulary,
the parameter working as designed.

## Net

23 of 24 verdicts stand. One flip: **`devDelivery` retire → keep**. Two corrections that change
the reasoning without changing a label: the bucket-wide "no built consumer" premise is stale, and
item 15's "transplanted, cannot be adopted" failure is falsified by the adoption.

---

# Second independent verification pass (fresh context, ranking not authored here)

Read the ranking, the engine sources, the docs, and the three consumer repos before reading the
notes above. Where this pass and the pass above disagree, both readings are stated.

## Independently reached the same bucket-wide correction

Built consumers exist: ASC (`member-auth/lib/crypto.ts:12`, `member-auth/lib/auth.ts:14`,
`member-portal/lib/portal-action.ts:9`, `admin-club/lib/offers.ts:18`) for `/auth-crypto`;
xcathletes (`server/roster/roster-admin.ts:11`) for `/auth-store`; xcathletes
(`server/auth/channel.ts:19`, `server/auth/transport.ts:16`) for `/auth-channel`. All family, so
the anonymous-consumer bar is untouched; what changes is that shape claims can now be tested
against a real build instead of argued.

## Verdicts (this pass)

**1-2. `generateCsrfToken`, `generateSessionId` — retire — stand.** Bodies byte-identical
(`auth/crypto.ts:76-88`). The built consumer imports all three and immediately re-aliases each
under a site-reading name, which is the one-line local alias the ranking proposed, already
happening in production.

**3. `CHANNEL_SCHEMA_VERSION` — retire — stands.** Value is interpolated into the DDL's own
seeding INSERT (`auth-channel/store.ts:70`); no consumer references the constant. Thin surviving
counter: a site writing a deploy preflight has nothing to compare the installed row against once
the constant is gone. `verifySchema` already fails closed, so the site learns of drift loudly.

**4. `devDelivery` — retire — stands. Explicit disagreement with the pass above.** That pass
flipped to keep on the in-body refusal. Two reasons this pass does not: (a) the export cannot
prevent the failure it claims to prevent, because a site that writes the one-line transport by
hand gets no guard at all, which is the definition of a discoverability problem; (b) the only
built consumer did not rely on the guarantee alone: `transport.ts` gates the call with its own
`useDevTransport(env)`, reading the identical `CAIRN_DEV_BACKEND === '1'` property, before
delegating. What remains after the redundant guard is one `console.log`. The reusable asset is the
flag-name convention, which is a documented recipe, not a semver'd export.

**5. `insertOwnerIfEmpty` — retire — stands.** `bootstrapOwner` is public and documented
(`sveltekit/cairn-admin.ts:100`, `docs/reference/sveltekit.md:821`) and is the path the built
consumer uses. Two public paths to one outcome; the declarative one covers the race that matters.

**6. `hashToken` — keep — stands.** Two built call sites. Honest counter-evidence found and
recorded: xcathletes wrote its own `sha256Hex` (`server/contract/hex.ts:28`) after `/auth-crypto`
shipped and got it right, padStart included, so the "silent hand-roll defect" argument is weaker
than for `generateToken`. That divergence is legitimate rather than a discoverability failure: its
inputs (birth dates, request bodies) are exactly what `hashToken`'s contract forbids. Keep, and
still the weakest keep on the subpath.

**7-9. `DeliverContext`, `ChannelRequestResult`, `ChannelConfirmResult` — reshape — stand.**
Entailed by the factory, verified `factory.ts:164-179`; they follow item 15.

**10. `AuthChannelEvent` — reshape — stands, with a stronger argument available.** The factory
already imports `error`, `isHttpError`, `isRedirect` from `@sveltejs/kit` (`factory.ts:12`), so the
framework-neutrality that would justify publishing a parallel event interface is already spent.

**11. `AuthChannel` — reshape — stands.** Both callers work around `revokeSessions(db, subject)`:
xcathletes `buildChannel(db).revokeSessions(db, personId)` (`server/auth/channel.ts:153`), passing
the binding twice, and the showcase re-reads `platform.env.MEMBER_DB` by hand.

**12. `CHANNEL_SCHEMA_SQL` — reshape — stands.** Both consumers transcribed the literal into a
file (`examples/showcase/migrations-members/0000_channel.sql`;
`xcathletes-org/migrations-platform/0002_auth_channel.sql`, "copied verbatim"), and the engine runs
`src/tests/unit/auth-channel-migration-drift.test.ts` to police one of the two pastes. A constant
every consumer copies, needing a drift test to stay honest, is the wrong form.

**13. `AuthChannelConfig` — reshape — stands, decisive objection replaced.** The `ttl`-name and
`kind` warts were never exercised (only `sessionTtlMs` overridden, `kind` unused). The measured
defect: `lookup(contact)` and `verify(subject)` receive no env and no request context, so a
D1-backed roster cannot be resolved inside them; the consumer built a per-binding channel factory
with a module-level `WeakMap` and a 17-line header explaining it (`server/auth/channel.ts:1-17`).
The showcase's static `Map` roster hid this from the engine's own exemplar.

**14. `generateToken` — keep — stands.** Two built call sites; the hand-roll failures
(`Math.random`, 16 bytes, raw `+`/`/` in a URL) are silent and pass every test.

**15. `createAuthChannel` — reshape — stands; premise refuted, alternative closed.** "The
requesting site cannot adopt it unchanged, and no one has tried" is false: xcathletes built it with
Turnstile plus Twilio/Cloudflare Email and recorded the reconciliation the ranking says nothing
records ("requirements doc says 'six-digit', a number this clamp rejects outright, so this platform
takes the engine's 8 rather than fighting it. Do not 'fix' this back to 6"). So "retire outright is
the live alternative" is no longer supportable. Reshape survives on the charter objection plus the
measured form defects in items 11-13, and gains the ranking's own "right form" as field evidence:
the same site then hand-rolled a third login, an operator magic-link on its own tables, explicitly
"never ... `createAuthChannel`" because the factory implements codes only
(`server/team/auth.ts:1-20`). One site, three login grammars, is the case for parameterizing the
engine's own magic-link login by audience rather than shipping a second authenticator.

**16-17. `cookieName`, `tokensMatch` — keep — stand.** `cookieName` is used with two site bases in
production (`asc-member`, `asc-member-csrf`); `tokensMatch('','') === false` verified at
`crypto.ts:116`, with two built callers.

**18. `EditorRow` — keep — stands.** Entailed by `listEditors`; correctly stops short of
`capability`.

## The `/auth-store` removal-and-role family: four exports, two operations

Items 19, 22, 23, 24 are one finding. The barrel comment and the xcathletes brief both describe
this subpath in writing as "an export-map promotion of a surface the engine already trusts
internally" — transplantation of the engine's internal decomposition, admitted on the record, which
is constraint 3. The published form then costs every consumer the dispatch the engine kept for
itself, because the read that makes the writes safe (`findEditor`) is deliberately unexported.

Measured in the only built consumer, `deprovisionCoachEditor` (`roster-admin.ts:197-241`):
- 20 lines of doc comment plus a four-step protocol (`listEditors` -> `.find()` ->
  `ownerLevelRoles(roles)` -> branch) to express "remove this person's editor access".
- Line 237 discards the guard's return: `await removeOwnerIfNotLast(authDb, email, ownerRoles);`.
  Its caller `revokeCoachAccess` then writes a `roster.revoke` audit record unconditionally. When
  the departing coach is the last owner-capability row (reachable: that site's bootstrap owner is
  also seeded as the roster's sole coach), the guard silently writes nothing, the editor row and
  every live session survive, and the audit log records a revocation that did not happen.

**19. `setEditorRole` — keep — DOES NOT STAND -> reshape.** Unconditional `UPDATE`
(`store.ts:233`). Demoting the last owner leaves a non-empty roster with zero owners;
`insertOwnerIfEmpty` fires only on an empty table (`store.ts:215-230`), so `bootstrapOwner` can
never re-seed and no engine path returns to `/admin`. The documented avoidance requires
`findEditor` (unexported) plus `resolveCapability`/`ownerLevelRoles` from the root subpath; the
engine's own caller does exactly that (`editors-routes.ts:142-152`). The pass above rejected this
flip on symmetry, that `demoteOwnerIfNotLast` acts only on owner rows so an ordinary role change
needs `setEditorRole`. That rebuttal defeats deletion, not reshape: one
`setEditorRole(db, email, role, ownerRoles)` that refuses only when it would strip the last owner
keeps both capabilities and takes the same vocabulary argument its siblings already take.

**22. `deleteEditor` — keep — DOES NOT STAND -> reshape.** Membership is not in question; the
cascade (`store.ts:139-177`) is engine-only knowledge and must survive. The form is two exports
for one operation, dispatched by a lookup the subpath withholds. Right form: one
`removeEditor(db, email, ownerRoles)` carrying both the cascade and the guard.

**23. `demoteOwnerIfNotLast` — keep — DOES NOT STAND -> reshape.** The in-`UPDATE` count
(`store.ts:243-260`) must survive; the verdict moves because it is the guarded half of the pair
item 19 reshapes, and because it carries the same conflated `boolean` the doc has to work around
("Both guards return `false` for two outcomes ... To tell them apart, read the roster with
`listEditors` first"). Evidence here is symmetry plus the doc's workaround, not a measured misuse.

**24. `removeOwnerIfNotLast` — keep — DOES NOT STAND -> reshape.** Strongest anonymous-consumer
case in the bucket and the clearest measured shape failure: see the dropped return above. A
security guard whose `false` means either "last owner" or "no match", and whose neglect is silent,
is the wrong form. Right form: `'removed' | 'last-owner' | 'not-found'`, which also retires the
unguarded twin and the "read the roster first" instruction.

**20-21. `listEditors`, `insertEditor` — keep — stand.** `listEditors` is doing double duty as the
missing `findEditor` (`roster-admin.ts:231-232`) and its `toEditor` mapping keeps `display_name`
off the consumer's surface. `insertEditor`'s normalization is the load-bearing part; recorded wart,
the consumer must substring-match a raw driver error for idempotency (`isUniqueConstraintError`,
`roster-admin.ts:122-124`, 186-194), sanctioned by the reference page. Loud and recoverable, unlike
item 19's silent lockout, so a refinement (a boolean return, or exporting `findEditor`), not a
reshape.

## Net, this pass

20 of 24 stand. Four flips, all one finding: `setEditorRole`, `deleteEditor`,
`demoteOwnerIfNotLast`, `removeOwnerIfNotLast` keep -> **reshape**, into two guarded operations
with discriminated results. One recorded disagreement with the pass above: `devDelivery` stays
**retire** here. Premises corrected without moving a label: the bucket-wide "no built consumer"
claim, item 13's decisive objection, and item 15's transplant failure.
