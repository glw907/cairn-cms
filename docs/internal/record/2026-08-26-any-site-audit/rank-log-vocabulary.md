# Log-vocabulary audit: all 74 events ranked, weakest to strongest anonymous-consumer case

Subsystem: `src/lib/log/` (`events.ts` union + `emit.ts` chokepoint), contract documented at
`docs/reference/log-events.md`. Zero exported symbols; the **event names are the public-observable
contract**, so this audit tests contract shape, not membership in an export map.

## Method and the membership premise

The standard's first branch is satisfied for every item by construction: a consuming site **cannot
legally reach or patch this surface**. `src/lib/log/index.ts` exports `log` to the engine only:

```ts
export { log } from './emit.js';
export type { CairnLogEvent } from './events.js';
```

and no package subpath re-exports it (CLAUDE.md: "The logger is internal (exported from no package
subpath), so its API is free to grow; the event names are the public-observable contract"). A site
cannot add, rename, or enrich an engine event. So "should this be in the engine" is not the live
question for a log event. The live question, and the one this ranking answers, is the standard's
**second** branch plus constraint 3 (shape, not just membership):

- Does the ratified grammar in `events.ts` still describe what the engine ships? (measured divergence)
- Is the record's **shape** the one easiest for *any* site to diagnose from, or the one that fell out
  of the emitting call site's local variables?

Ranking axis: **how likely an anonymous consumer is to need this exact record to answer a real
question, and how uniquely it answers it.** Rank 1 = weakest.

## The ratified grammar being measured against

`src/lib/log/events.ts` lines 5-7:

> The grammar: `area[.subject].verb_phrase`. A past-tense verb phrase names an occurrence; a
> state adjective names a detected condition. Every `reason`/`scope` value a record carries is
> snake_case.

## Cross-check result (doc vs code)

```
74 code-events.txt / 74 doc-events.txt -> diff IDENTICAL
```

Every event in the union has at least one live emit site in `src/lib` (verified per name); there is
no dead vocabulary. `docs/reference/log-events.md` documents all 74 with no drift in names, and the
field lists I spot-checked (`config.invalid`'s `conditionId`, `guard.rejected`'s `bindings`
`conditionId`, `turnstile.verify_failed`'s per-reason fields, `media.orphans_reconciled`'s counts)
match the emit sites exactly. **The doc-vs-code contract is in good health.** The findings below are
about field shape and namespace coherence, not drift.

## Cross-cutting findings (each is charged to its item below)

**F1 — `commit.succeeded`/`commit.failed` overload `concept` with pseudo-concepts.** The event fires
from 11 sites. Five pass a value that is not a declared concept:

```ts
// nav-routes.ts:141
const commitFields = { concept: 'nav', id: 'site-config', editor: editor.email };
// content-routes-settings.ts:299
const commitFields = { concept: 'settings', id: 'tidy', editor: editor.email };
// content-routes-settings.ts:436
const commitFields = { concept: 'vocabulary', id: 'site-config', editor: editor.email };
// content-routes-media.ts:632, :1041
const commitFields = { concept: 'media', id: result.record.hash, editor: editor.email };
```

Concept keys are open — `src/lib/content/concepts.ts` reserves exactly one (`FRAGMENTS_CONCEPT_ID =
'fragments'`) and nothing else. A site that declares a concept named `media`, `nav`, `settings`, or
`vocabulary` produces records indistinguishable from the engine's own config commits. An anonymous
consumer filtering `concept: 'media'` cannot tell "my media concept saved" from "the manifest
committed."

**F2 — `preview.cleanup_failed` puts a stringified throw in the `reason` slot.** Measured divergence
from the ratified grammar's "Every `reason`/`scope` value a record carries is snake_case":

```ts
// content-routes-core.ts:507
log.warn('preview.cleanup_failed', { concept: concept.id, id, reason: String(err) });
```

Every other event in the vocabulary uses `reason` for a closed snake_case enum and `error` for a
stringified throw (`auth.session.destroy_failed`, `config.invalid`, `github.unreachable`,
`admin.action.rate_limit_failed`, `audit.sink.write_failed` all do this correctly). This one event
inverts it. The doc row propagates the divergence by listing the field as `reason`.

**F3 — the doc's redaction summary overclaims for `dictionary.*`.** `log-events.md:98`:

> The `dictionary.*` and `tidy.*` records never carry document content or an API key, only the
> editor, the model, and the outcome.

But `content-routes-dictionary.ts:126` ships the words themselves:

```ts
log.info('dictionary.added', { editor: editor.email, words: additions });
```

A personal-dictionary addition is by construction a slice of the author's draft: the tokens the
spellchecker flagged, which in practice are proper nouns, member names, and site jargon. That is
document content. Either the field becomes a count or the claim is corrected.

**F4 — the union's ordering interleaves `include.*` into the `media.*` block.** `events.ts` lines
32-46 run `media.uploaded … media.resolver_absent`, then `include.missing`, `include.read_failed`,
then back to `media.deleted … media.alt_propagated`. `log-events.md` rows 44-50 carry the identical
interleave. Cosmetic, but the surface's evenness is a stated property of this audit.

**F5 — the publish pair straddles two areas.** Success is `entry.published`; failure is
`publish.failed`. Every other outcome pair in the vocabulary shares an area
(`commit.succeeded`/`commit.failed`, `tidy.succeeded`/`tidy.failed`). An anonymous consumer
reconstructing a publish must know two prefixes.

**F6 — `taxonomy.unmarked_field` is a bare noun phrase.** Not a past-tense verb phrase and not a
state adjective; the only name in the union that is neither. (`media.resolver_absent`,
`admin.action.session_absent`, `admin.action.rate_limit_absent`, `github.unreachable`, and
`config.invalid` all parse as state adjectives and conform.)

---

# The ranking

## Rank 1 — `auth.channel.delivery_inline` — RESHAPE

Doc: "A `createAuthChannel` `deliver` call runs inline (awaited directly) because no platform
`waitUntil` is available, **the unit-test and edge-case runtime path**." The engine's supported
runtime is Cloudflare Workers, where `waitUntil` is always present. An anonymous consumer's
production site never emits this. It occupies a permanent slot in a public-observable vocabulary to
report a condition only the engine's own test harness reaches.

Any-site case: essentially none in production; the residual signal (a request paid delivery latency
inline) matters, but as a property of the request, not as a standalone occurrence.
Reshape: fold it into `auth.channel.requested` as `inline: true`, which is where an operator is
already reading the request's outcome. Provenance: `490231e0 Add createAuthChannel construction`,
per the ratified spec's Logging section ("Twelve events"). Family-originated (xcathletes platform is
the named driving consumer).

## Rank 2 — `auth.session.destroyed` — RESHAPE

The only event in the union whose documented field list is literally **`none`**. Emitted at
`auth-routes.ts:229` as `log.info('auth.session.destroyed')` with no argument. An operator reading
this record learns that *somebody* logged out — un-joinable to an editor, a request, or any other
record. Meanwhile `auth.session.created` carries `email`, so the pair cannot be walked.

The email is free here: `logoutAction` runs behind `createAuthGuard`, which has already attached it
(`guard.ts:160`, `event.locals.cairnEditor = { ...editor, capability: ... }`).
Any-site case: "an editor reports being signed out unexpectedly" — today this record cannot confirm
or deny it for that editor. Reshape: carry `email`, matching `auth.session.created`.
Provenance: `231476a7 Add the internal structured logger and event vocabulary`. Engine core.

## Rank 3 — `auth.channel.session.created` — KEEP

Fires on a successful channel session mint with `correlationId` only. Nobody diagnoses a success,
but the record closes the request→confirm→session funnel an operator walks when a member reports
"the code worked but I'm not logged in." Its case rests on the funnel, not on itself.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 4 — `auth.session.created` — KEEP

The editor-side twin of rank 3, carrying `email`. Same funnel argument. Weak alone; the pairing with
`auth.token.confirmed` is what an anonymous consumer uses to separate "the link worked but the
session row didn't write" from "the link never confirmed."
Provenance: `231476a7`. Engine core.

## Rank 5 — `dictionary.added` — RESHAPE

A successful personal-dictionary commit; low standalone diagnostic need. The reshape is F3: the
`words` payload is document-derived content logged at `info` into a store the doc tells operators is
safe to read and paste ("The records carry an editor's email for attribution and never a token or a
session id, so a log is safe to read and paste", CLAUDE.md). An anonymous consumer running a site
whose drafts name real people inherits that exposure without ever choosing it.
Any-site case: "the author says a word keeps flagging" — a count plus `retried` answers that; the
words themselves are not needed to diagnose it. Reshape: replace `words` with `added` (a count), or
correct the redaction claim at `log-events.md:98`. Provenance: `3a70d227 Add the git-committed
personal dictionary (Task 9)`. Engine core.

## Rank 6 — `commit.reverted` — KEEP

Doc: "Fires alongside the ordinary `commit.succeeded` for the same branch commit." A second record
for one git operation. It earns its slot only because `ref` (the reverted-to sha) and `branchSha`
exist nowhere else, and an anonymous consumer answering "why did this draft's text change under an
editor" needs exactly those two.
Provenance: `b7307c25 Add revertAction`. Engine core.

## Rank 7 — `auth.channel.session.destroyed` — KEEP

Documented asymmetry (`correlationId` on confirm's orphan cleanup, none on logout) with an honest
reason the code confirms: `destroyChannelSession` is a blind `DELETE ... WHERE token_hash = ?1`
(`auth-channel/store.ts:334-336`), so no subject is in scope and deriving a correlation id would
cost an extra D1 read for a log field. The comment at `factory.ts:900` states the condition
precisely. This is the right call, and it is the contrast that makes rank 2 a defect rather than a
convention.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 8 — `preview.token.revoked` — KEEP

A successful revoke plus `count`. Any-site case: "an editor swears they revoked a preview link but
it still resolves" — `count: 0` says the revoke matched no rows, which is the answer.
Provenance: `0ebf3188 Add mintPreviewToken, the previewMint/previewRevoke actions`. Engine core.

## Rank 9 — `media.alt_propagated` — KEEP

`written` (count of rewritten entries) plus `overwrite`. Any-site case: an editor sets a default alt
and reports "nothing changed on my pages" — `written: 0` with `overwrite: false` names the cause
(the placements already carried custom alt) without opening a diff.
Provenance: `3ca2a98a Land media Pass B`. Engine core.

## Rank 10 — `admin.action.audited` — KEEP

Highest-volume info record in the vocabulary (fires on every `ctx.audit` call), and largely
duplicative of what the site's own sink persists. It survives on one property the doc states
explicitly: it is the untruncated original, and `audit.sink.write_failed`'s `detail` is a truncated
copy. Any-site case: a site whose sink truncated a `detail` field reconstructs the full record from
this line.
Provenance: `4cc74bd2 feat(engine): add the Part C admin extension seams`; the ASC brief's Seam 5
("Ask: a packaged `audit_log` migration plus a sink factory"). Family-originated.

## Rank 11 — `auth.token.confirmed` — KEEP

A step in the magic-link funnel. Any-site case: an editor clicks a link and lands back on the login
screen — the presence of this record with no following `auth.session.created` isolates the fault to
the session write.
Provenance: `231476a7`. Engine core.

## Rank 12 — `media.bulk_deleted` — KEEP

`deleted` and `skipped`. Any-site case: an operator selects thirty assets, sees fewer disappear, and
`skipped` names how many were still referenced without re-running the reference scan.
Provenance: `6a45ade6 Add the bulk-delete action`. Engine core.

## Rank 13 — `preview.token.minted` — KEEP

`expiresAt` is the load-bearing field. Any-site case: "the preview link my editor sent stopped
working" — `expiresAt` against the request time settles expiry versus revocation in one read, and
`preview.rejected`'s `expired` reason confirms it from the other side. Doc: "Never carries the token
itself," which is what makes the record safe to keep at all.
Provenance: `0ebf3188`. Engine core.

## Rank 14 — `tidy.succeeded` — RESHAPE

Carries `usage` (the token counts), and the emit passes the vendor object straight through:

```ts
// content-routes-tidy.ts:258
log.info('tidy.succeeded', { editor: editor.email, model: message.model, usage: message.usage });
```

`message.usage` is `@anthropic-ai/sdk`'s own `Usage` shape. The event name is a stable contract, but
this record's field shape is whatever the optional peer dependency happens to ship, and the doc
describes it only as "(the token counts)". An anonymous consumer building a spend dashboard on the
`usage` sub-object has a contract the engine does not control and did not promise.
Any-site case: "our Anthropic bill jumped" — a per-editor token total is exactly the query.
Reshape: project the two numbers the engine means (`inputTokens`, `outputTokens`) rather than
re-exporting the SDK object, and state them in the doc row. Provenance: `ddeebf5f Converge the
log-event vocabulary onto one grammar (R6, Task 11)` renamed it; `b01b0c1b Add the tidy Worker
action` introduced the family. Engine core.

## Rank 15 — `auth.link.requested` — KEEP

Weak per-record, strong in aggregate, and the doc already argues the case with a specific anonymous
scenario (lines 101-104): "Because the endpoint has no authentication, a flood of distinct addresses
here signals a request flood that edge rate-limiting can throttle." That is a diagnostic no other
record supports, and it is why this one alone logs the raw pre-allowlist address.
Provenance: `231476a7`. Engine core.

## Rank 16 — `auth.token.minted` — KEEP

`expiresAt` separates "the link expired" from "the link never arrived." Any-site case: an editor
clicks a link and gets an expired notice; this record's `expiresAt` versus the click time decides
whether the TTL or a mail-delay is the cause.
Provenance: `231476a7`. Engine core.

## Rank 17 — `media.uploaded` — KEEP

`reused` is the field that earns the slot. Any-site case: an operator watching R2 growth wants to
know whether content-addressed dedup is working; `reused: true` says the bytes were already stored.
`bytes` and `contentType` (the sniffed value, not the client's claim) additionally close "why was my
file rejected downstream."
Provenance: `da9a1617 Add the media.* log event family`. Engine core.

## Rank 18 — `media.deleted` — KEEP

Audit trail for an irreversible-ish action. Any-site case: a broken image on a live page, traced by
`hash` back to who removed it and when.
Provenance: `da9a1617`. Engine core.

## Rank 19 — `media.replaced` — KEEP

`oldHash`, `newHash`, `affected`. Any-site case: an editor replaces a logo and reports two pages
still showing the old one — `affected` versus the real reference count exposes a stale index.
Provenance: `3ca2a98a`. Engine core.

## Rank 20 — `editor.removed` — KEEP

Any-site case: "why can't this person sign in any more" — the record names the acting owner and the
time. The `owner`/`target` field pair is the right generic shape (no site-specific naming).
Provenance: `ae694fcc feat(log): add editor-mutation events to editors-routes`. Engine core.

## Rank 21 — `editor.role_changed` — KEEP

Carries `role` and `capability` (the resolved capability, not just the label). That resolution is
the part a site cannot recompute from the log alone, since it depends on the committed vocabulary at
the time of the change. Any-site case: an editor lost access after a config edit; comparing this
record's `capability` against today's resolution names a vocabulary change as the cause.
Provenance: `ae694fcc`. Engine core.

## Rank 22 — `editor.added` — KEEP

Same shape and same argument as rank 21, for an addition.
Provenance: `ae694fcc`. Engine core.

## Rank 23 — `entry.discarded` — KEEP

Any-site case: an editor reports lost work. This record is the difference between "a discard ran"
and "a save never landed", and the two have completely different remedies (the branch is gone versus
the commit failed, which is `commit.failed`).
Provenance: `aea56f3f Add the publish and discard actions`. Engine core.

## Rank 24 — `media.orphans_reconciled` — KEEP

`orphaned` and `missing` counts from a read-only pass. Any-site case: an operator suspects R2 and the
manifest have drifted; a non-zero `missing` means public pages will 404 on images, which is a live
site defect, not a housekeeping number.
Provenance: `ddeebf5f` renamed it; `578cb62f Add the media reconcile read, doctor check, and log
events` introduced the reconcile. Engine core.

## Rank 25 — `dictionary.add_conflict` — KEEP

Doc: "hits a second commit conflict and gives up; the client keeps the words pending and re-attempts
on the next save." Any-site case: an author reports the same word flagging repeatedly — a recurring
record here says the dictionary commit is losing a race, not that the spellchecker is broken. (The
`words` payload inherits F3; the reshape is charged at rank 5.)
Provenance: `3a70d227`. Engine core.

## Rank 26 — `media.replace_blocked` — KEEP

A refusal an editor sees as a failed form. `foundIn` tells the operator the confirm gate fired, not a
reference problem. Any-site case: "replace does nothing for me" answered without a repro.
Provenance: `3ca2a98a`. Engine core.

## Rank 27 — `media.delete_blocked` — KEEP

`foundIn` (referencing entry count) is the actionable field: the editor must clear that many
references first. Any-site case: the single most common media support question a site owner fields.
Provenance: `da9a1617`. Engine core.

## Rank 28 — `commit.succeeded` — RESHAPE

The vocabulary's highest-volume success record (11 emit sites), and the carrier of finding **F1**.
The event itself is unimpeachable: an anonymous consumer answering "did that save actually reach
GitHub" reads exactly this, and `branch` distinguishes a pending-branch save from a default-branch
commit.

The shape is not. Five of the eleven sites pass a pseudo-concept (`'nav'`, `'settings'`,
`'vocabulary'`, `'media'`) into the field that otherwise names a declared concept, with a pseudo-id
(`'site-config'`, `'tidy'`, a media hash) beside it. Nothing reserves those names —
`src/lib/content/concepts.ts` reserves only `FRAGMENTS_CONCEPT_ID = 'fragments'`.

Any-site case: "my `page` entries save but my `media` concept's don't" is an unanswerable query
today on a site that named a concept `media`. Reshape: re-derive as a discriminated shape — a
`subject` field (`content` | `nav` | `settings` | `vocabulary` | `media`) alongside `concept`/`id`,
with `concept` populated only for real concepts. Provenance: `231476a7`. Engine core.

## Rank 29 — `entry.published` — RESHAPE

Strong content: `batch` plus the doc's own operator rule ("a failed publish-all logs one
`publish.failed` per entry, so the log names everything that didn't go live"). The reshape is **F5**:
this is the success half of a pair whose failure half is `publish.failed`, and the two live in
different areas. Every other outcome pair in the union shares one.
Any-site case: "which entries went live in the 09:14 publish-all, and which didn't" requires
querying two prefixes today. Reshape: rename to `publish.succeeded`, leaving `publish.failed` as the
anchor; keep `entry.discarded` where it is (its counterpart is a lifecycle event, not a publish).
Provenance: `aea56f3f`. Engine core.

## Rank 30 — `taxonomy.unmarked_field` — RESHAPE

A genuinely useful build-time lint: a concept declares a multiselect named `tags` but marks no
`taxonomy: true` field, so the tag index reads empty and an anonymous consumer sees an empty tag
page with no error anywhere. Fires once per index build (`content-index.ts:101`).

Reshape is **F6**: the name is a bare noun phrase, the only one in the union that is neither a
past-tense verb phrase nor a state adjective, against a grammar `events.ts` ratifies in its own
header. Reshape: `taxonomy.field_unmarked` (state adjective) or `taxonomy.index_empty`, which also
says what the consumer will observe.
Any-site case: "my tag pages are blank and nothing is failing." Provenance: `ae18de32 Read the
taxonomy-marked field's validated value for content tags`. Engine core.

## Rank 31 — `media.orphans_purged` — KEEP

The record of an irreversible byte deletion, at `info` with `editor` and `purged`. Any-site case: an
image 404s a week after a purge; this is the only record that a purge ran, who ran it, and how many
objects went. The doc's own framing ("the irreversible byte purge", commit `c6dd85be`) is why the
record is load-bearing rather than housekeeping.
Provenance: `c6dd85be Add the orphan scan and the irreversible byte purge`. Engine core.

## Rank 32 — `auth.session.destroy_failed` — RESHAPE

Real signal — a D1 fault on logout leaving a row behind, with the doc correctly explaining the
cookie is cleared first so the browser signs out regardless. But it carries only `error`. Like rank
2, the editor's email is already resolved on `event.locals.cairnEditor` and costs nothing.
Any-site case: repeated failures for one editor point at a row-level D1 problem; today the records
cannot be grouped by anything.
Reshape: carry `email` alongside `error`. Provenance: `7c6da422 Fold C2b review findings`. Engine
core.

## Rank 33 — `tidy.refused` — KEEP

Doc: "The model refuses to edit the text. Maps to fail(422); the author's text is untouched."
Any-site case: an author reports tidy "not working" on one document but not others — a `refused`
record means the model declined that content, which is a completely different remedy from a 502.
Carries no content and no key, correctly.
Provenance: `b01b0c1b`. Engine core.

## Rank 34 — `tidy.empty` — KEEP

The 502 twin of rank 33 for an empty completion. Separate name earns its slot because the remedy
differs (retry versus reword). Provenance: `b01b0c1b`. Engine core.

## Rank 35 — `content.field_behavior_failed` — RESHAPE

Catches a developer's own `behavior.validate()` throwing, and deliberately keeps the save working:

```ts
// fieldset.ts:450
log.warn('content.field_behavior_failed', { field: key, error: ... });
```

The comment states the intent well ("A developer's cross-field validate() is a bug, not an author
fault; log and treat the field as valid"). The defect is that `field` is a bare field *name*, and
field names repeat across concepts by design (`tags`, `summary`, `date`). An anonymous consumer with
`tags` behaviors on three concepts cannot tell which one is throwing.
Any-site case: exactly that — "one of my validators is silently swallowed and I don't know which."
Reshape: carry `concept` beside `field`. `validateFieldset` is called with the descriptor in scope,
so the value is available at the call site.
Provenance: `ddeebf5f Converge the log-event vocabulary onto one grammar (R6, Task 11)`. Engine core.

## Rank 36 — `include.missing` — RESHAPE

Two distinct authoring faults share one name and one field:

```ts
// resolve-include.ts:127
log.warn('include.missing', { fragment: '' });   // no fragment attribute at all
// resolve-include.ts:133
log.warn('include.missing', { fragment: id });   // resolver miss
```

An empty `fragment` attribute is a malformed directive; a resolver miss is a deleted or unpublished
fragment. Different fixes, one event, and the empty case is distinguished only by an empty string.
Worse, neither record names the entry that carried the directive, so an anonymous consumer reading
`include.missing {fragment: "hours"}` knows a page is showing a notice but not which page.

The entry is threadable: the resolver already rides `file.data[FRAGMENT_RESOLVE]`, so a sibling
`file.data` key is a one-line addition rather than a seam change.
Any-site case: "a visitor reported a grey 'this include doesn't name a fragment' box somewhere on
the site." Reshape: split the empty-attribute case into its own reason (or its own event) and carry
the containing entry. Provenance: `771c7fe6 feat(render): the ::include fragment resolver`. Engine
core.

## Rank 37 — `editor.bootstrapped` — KEEP

Fires once in a site's life: the configured `bootstrapOwner` address inserting the first owner row
into an empty `editor` table. Any-site case: a brand-new deploy where nobody can sign in — the
presence or absence of this record separates "the bootstrap address didn't match" from "the mail
never sent." That is a first-hour question for every anonymous consumer.
Provenance: `e2f23d7b feat(auth): config-declared bootstrap owner`. Engine core.

## Rank 38 — `auth.channel.locked` — KEEP

Per-code attempt cap exceeded; the code is not compared. Any-site case: a member reports "it says my
code is wrong but I copied it" — a `locked` record says the cap fired, which is a wait, not a
re-send. The wire answer is deliberately indistinguishable, so the log is the only place this
survives.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 39 — `auth.channel.escalated` — KEEP

Fires only when the escalation threshold trips **and** the site's `challenge` also fails or throws.
The spec is explicit about why this matters: "the entire economic bound on guessing is that
function's consequence" and "the factory cannot tell a Turnstile `siteverify` call from `async () =>
true`." Any-site case: members reporting `challenge-required` loops — this record says the site's own
challenge is failing, which is the site's bug and nowhere else visible.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 40 — `auth.channel.rate_limited` — KEEP

An honest throttle with `action` and `correlationId`. Any-site case: "members say login is randomly
refusing them" — this names the limiter rather than the roster.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 41 — `admin.action.rate_limited` — KEEP

The `createSectionAction` twin of rank 40, with `path`, `action`, `entity`, `editor`. Any-site case:
an editor reports a section action failing under load; the 429 is visible in the UI, but only this
record names which limit and which editor.
Provenance: `a3812180 Add the createSectionAction module and its suite`; ASC brief Seam 2 ("a
composable action-wrapper factory ... and an optional rate limit"). Family-originated.

## Rank 42 — `media.resolver_absent` — RESHAPE

The condition is a genuine silent-failure trap: media configured on, no `resolveMedia` wired, so
"public images would render as bare `media:` tokens" on every page. Fires once at construction,
which is the right cadence.

The payload is dead. `public-routes.ts:193` emits `{ enabled: true }` and the doc row documents the
field as "`enabled` (always `true`)". A field that can only hold one value carries no information and
teaches an anonymous consumer to expect a discriminator that isn't one.
Any-site case: a developer's first deploy renders literal `media:abc123` strings in the page source.
Reshape: drop `enabled`. Provenance: `600f68db feat(media): media.resolver_absent log event for a
configured-but-unwired resolver`. Engine core.

## Rank 43 — `include.read_failed` — KEEP

The doc states the case better than I could: "Distinguishes a transport failure from a fragment that
is genuinely absent: pair it with an `include.missing` naming the same id." That pairing rule is a
real diagnostic protocol an anonymous consumer can follow, and it carries `error`, which
`include.missing` correctly does not.
Provenance: `10619010 fix(delivery): gate enumeration, strip directives from excerpts`. Engine core.

## Rank 44 — `preview.cleanup_failed` — RESHAPE

Right event, right degradation policy (doc: "The primary action already succeeded; a stale row is a
lesser evil than failing it"), and it correctly stays silent on the two expected conditions (missing
binding, un-migrated table). Carrier of finding **F2**: `reason: String(err)` puts a stringified
throw in the slot the ratified grammar reserves for a snake_case enum, and the doc row documents the
divergence rather than catching it.
Any-site case: preview links resolving for entries an editor deleted, traced to accumulating stale
rows. Reshape: `error: String(err)` with no `reason`, matching `auth.session.destroy_failed` and
`config.invalid`; update the doc row. Provenance: `7fe141b9 Harden preview-token cleanup against
un-migrated and non-adopting sites`. Engine core.

## Rank 45 — `admin.action.session_absent` — KEEP

The doc argues its own uniqueness precisely: "this is the only trace an `adminAction`-mounted route
leaves for a session that lapsed between the guard's resolve and this action running." Any-site case:
a developer's custom admin action redirects to login mid-work and nothing else in the log explains it.
Provenance: `576c620d Fold the refusal-channel convergence security review findings`; the
`adminAction` seam lineage from `4cc74bd2 ... Part C admin extension seams`. Family-originated.

## Rank 46 — `admin.action.csrf_rejected` — KEEP

Defense-in-depth branch behind the guard's own `guard.rejected {reason: 'csrf'}`. The doc is honest
that it is "expected to be rare on a route the guard actually covers" and names the case that earns
it: "it's the only gate a custom admin route reaches if it's ever mounted outside the guard's
coverage." That is exactly an anonymous developer's mounting mistake.
Provenance: `f7f93e01 Converge adminAction's two authorization refusals onto SvelteKit's own
channels`. Family-originated (adminAction seam).

## Rank 47 — `media.resolve_missing` — RESHAPE

Fires on the broken-image case an anonymous consumer's visitors actually see: media on, hash has no
manifest row. The emit is correctly gated (media-off stays silent, per the comment at
`resolve-media.ts:98`).

Shape defect: `{ hash: ref.hash }` and nothing else. The hash names the *missing* asset; it does not
name the page carrying the dangling reference, which is the thing the operator must edit. The
resolver is a closure over the manifest, called from render with no entry in scope, so this is a
real threading cost, not a free field — I am recording it as a reshape anyway, because migration
cost never discounts a verdict and the record is diagnostically incomplete without it.
Any-site case: "one image is broken somewhere on the site and I can't find which page."
Reshape: carry the referencing entry (concept + id), threaded through the render VFile the way
`include.missing` can be. Provenance: `578cb62f`. Engine core.

## Rank 48 — `auth.channel.rate_limit_absent` — KEEP

A configured limit whose binding resolves to nothing, degrading **open**. Silent by design; this
record is the only evidence a security control is not running. Any-site case: a developer configures
a limiter, ships, and believes they are protected. Nothing else would ever tell them otherwise.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 49 — `auth.channel.rate_limit_failed` — KEEP

The binding-present-but-throwing twin. The separation is correct and the doc says why in the
`admin.action` mirror: "the binding itself was present and reachable, so the two events triage
differently." Two names, two remedies.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 50 — `admin.action.rate_limit_absent` — KEEP

Same silent-degrade-open argument as rank 48, on the `createSectionAction` seam. Doc: "the check
degrades to open (never blocks) rather than 500ing." Any-site case: a developer's admin section is
unthrottled and nothing in the UI says so.
Provenance: `a3812180`; ASC brief Seam 2. Family-originated.

## Rank 51 — `admin.action.rate_limit_failed` — KEEP

The throwing-key/limit twin, carrying `error`. Added specifically by review
(`adde6e3c Fold the ASC engine-seams pass-one review findings into createSectionAction`), which is
evidence the split was found necessary rather than assumed.
Provenance: `adde6e3c`; ASC brief Seam 2. Family-originated.

## Rank 52 — `auth.channel.confirmed` — KEEP

Dual-level by design: `info` on a real subject, `error` with `outcome: 'empty_subject_fault'` on a
stored empty string. The doc names why the log is the only witness: "the wire answer is `bad-code`
either way, identical to a wrong guess." An anonymous consumer with a roster data fault would
otherwise see members reporting wrong-code errors for codes that were correct.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 53 — `auth.channel.requested` — KEEP

The vocabulary's best-argued record, and the design spec states the reasoning verbatim:

> `auth.channel.requested` is emitted for every outcome with the outcome in a field (`delivered`,
> `unknown`, `cooldown`, `challenge_failed`, `suppressed`, `lookup_failed`), so the record's
> *existence* carries no roster signal and an operator can still alert on `ceiling_exceeded` and
> `lookup_failed`.

One event, six outcomes, a privacy property that falls out of the shape rather than being bolted on.
This is the model the rest of the vocabulary's reason-carrying events should be measured against.
Any-site case: "members say codes aren't arriving" — the `outcome` distribution answers it in one
query, and `lookup_failed` separates a roster outage from ordinary probing.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 54 — `tidy.failed` — KEEP

Six reasons across two HTTP outcomes, each with a distinct operator remedy, and the doc row does the
mapping work: `auth` (rotate the key, and it marks the key unhealthy in the shared cache),
`sdk_missing` (install the optional peer), `invalid_request` (an unsupported `tidy.model` setting),
against the retryable `timeout`/`abort`/`model`. Any-site case: "tidy stopped working for everyone
this morning" resolves to a rotated key in one query. Carries no content and no key.
Provenance: `ddeebf5f` renamed it; `b01b0c1b` introduced the family. Engine core.

## Rank 55 — `admin.action.sink_threw` — KEEP

Fires when a *site's own* audit sink throws or rejects. The doc's reasoning about what it omits is
exemplary and worth preserving as the vocabulary's redaction precedent: it drops `record.detail`
"not because `detail` is sensitive but to avoid duplication: `admin.action.audited` already logged
the full untruncated record ... one line earlier." Any-site case: a developer's sink silently loses
records while every action still succeeds (the wrapper is fail-open).
Provenance: `ddeebf5f`; the `adminAction` seam from `4cc74bd2`. Family-originated.

## Rank 56 — `admin.action.unaudited` — KEEP

At `error`, in production only (dev throws). A custom action mutated state and called `ctx.audit`
zero times. Any-site case: a compliance gap that is invisible by construction — nothing failed,
nothing 500'd, and the trail simply has a hole. No site could detect this for itself, since the
detection lives inside the wrapper.
Provenance: `4cc74bd2 feat(engine): add the Part C admin extension seams`; ASC brief Seam 5 ("a
persisted audit trail is the gap ASC shipped with"). Family-originated.

## Rank 57 — `auth.channel.ceiling_exceeded` — KEEP

At `error`, and the spec explains why it logs rather than denies: "An attacker can spend a site's SMS
budget by pumping requests at one number. Nothing denies this, deliberately, because denying it means
denying the member ... The engine logs `ceiling_exceeded` at error; the response is an operator one,
at the edge or with the provider." An engine that deliberately will not act has an obligation to say
so loudly, and this is that record.
Any-site case: an unexplained SMS bill. Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 58 — `auth.channel.send_failed` — KEEP

A site's `deliver` callback threw; the pending row is deleted and the send charge refunded. The
`error` field is scrubbed and length-capped for a stated, measured reason: "Twilio and Resend both
embed the recipient in their error strings." That is the correct generic shape — the engine cannot
know what a site's provider puts in an error, so it assumes the worst.
Any-site case: a member never receives a code and the site's provider credentials are the cause.
Provenance: `490231e0`, ratified spec. Family-originated.

## Rank 59 — `auth.role.unknown` — KEEP

A session resolves against a role outside the declared vocabulary and still authenticates at `none`
capability. The comment at `guard.ts:154-157` states the design: "only the log names it, so a stale
config never locks the person out of sign-in." Any-site case, and a very common one for an anonymous
consumer: a developer prunes a role from the committed config and an editor silently loses every
permission with no error anywhere in the UI.
Provenance: `8477c382 feat(auth): capability resolution, requireEditor, none contract`. Engine core.

## Rank 60 — `github.unreachable` — KEEP

Three best-effort reads that degrade rather than fail (`scope`: `shell`, `help`,
`publish_advisories`). Any-site case: an editor reports the pending-entries count reading zero when
drafts exist. Without this record the screen is simply, quietly wrong. Listed in
`docs/admin/troubleshooting.md`, so the anonymous operator is already routed to it.
Provenance: `6b92f835 Log the layout's GitHub degrade`. Engine core.

## Rank 61 — `media.delivery_failed` — KEEP

One binding missing, every image on the site broken, and the delivery route cannot say so in a
response that is a 404 image. `reason: 'binding_missing'` plus `binding` names exactly what to add
to `wrangler.jsonc`. Any-site case: a first deploy where every image 404s.
Provenance: `6ff13feb Add the media delivery route and requireBucket`. Engine core.

## Rank 62 — `auth.access.denied` — KEEP

Four emit sites, one shape (`email`, `role`, `target`), covering `requireAccess`, the engine's own
gated screens, and `createSectionAction`'s 403 branch. The uniform `target` is the right generic
form: a screen id, a site route target, and `'media'` all read the same way to a query.
Any-site case: the single most common admin support question — "why can't this role reach that
screen" — answered with the role and the target in one line, and distinguishable from
`auth.role.unknown` (no rule versus no valid role).
Provenance: `2d766263 feat(auth): requireAccess and the access-denial event`; `requireAccess` is the
site-facing seam. Family-originated.

## Rank 63 — `publish.address_collision` — KEEP

Doc: "A publish proceeds while another entry already resolves to the same address (last-write-wins,
**now visible**)." The engine deliberately does not refuse, so the log is the entire mechanism by
which the consequence is observable. Carries `displacedConcept` and `displacedId`, which is the
generic shape (not a URL string an anonymous site would have to parse).
Any-site case: a page silently stops resolving after an unrelated publish, with no error anywhere.
Provenance: `2ed1bf41 feat: log publish.address_collision when a publish overrides an address`.
Engine core.

## Rank 64 — `media.upload_failed` — KEEP

Nine closed snake_case reasons covering the whole refusal ladder in `ingestAndStore`, each mapping to
a distinct HTTP status and a distinct fix (`media_disabled`, `length_required`, `too_large`, `csrf`,
`session_expired`, `access_denied`, `unsupported_type`, `binding_missing`, `hash_collision`).
Grammar-conformant throughout. Any-site case: "my editor can't upload images" is the highest-volume
support ticket a content site fields, and this record resolves it without a repro.

One noted redundancy, not a defect: an access-denied upload emits both `auth.access.denied` and
`media.upload_failed {reason: 'access_denied'}` (`content-routes-media.ts:508` then `:475`). The
duplication is deliberate and useful — one record belongs to the auth story, one to the media story —
and it costs an operator nothing.
Listed in `docs/admin/troubleshooting.md`. Provenance: `da9a1617`. Engine core.

## Rank 65 — `turnstile.verify_failed` — KEEP

Seven reasons, each with its own conditional field (`tokenLength`, `error`, `status`, `codes`,
`expected`/`actual`), and — the part that makes this the best-shaped failure record in the
vocabulary — an explicit rule for what it does **not** log: "An ordinary `success: false` with only
`invalid-input-response` or `timeout-or-duplicate` logs nothing, since that is the function working."
A failure event that stays quiet on ordinary failure is what makes it alertable.

The comment at `turnstile.ts:90-95` names the anonymous scenario exactly: "if Cloudflare ever
lengthens the response token past MAX_TOKEN_LENGTH ... every submission would otherwise fail for
every visitor with a **completely silent lockout**. Carries the token's length, never the token
itself."
Any-site case: a rotated or mis-pasted secret silently rejecting every form submission site-wide.
Provenance: `d1b23796 Add verifyTurnstile, fail-closed against Cloudflare siteverify`; ASC brief Seam
3 ("Two sites already carry the same siteverify fetch verbatim; that is measured duplication, not
predicted"). Family-originated, and the strongest family-originated item in the ranking.

## Rank 66 — `audit.sink.write_failed` — KEEP

The doc states the keep burden itself: "The audited action already completed (the sink is
fail-open), so **this is the only surviving record of the persisted row**." Four reasons
(`coercion_failed`, `prepare_failed`, `insert_rejected`, `wait_until_failed`) that separate a data
problem from a binding problem, plus the whole truncated record with a placeholder for whichever
field's coercion failed. The at-most-once guarantee is stated and deliberate.

This is also the one event whose `actor` is documented as not necessarily an editor, because site
code may call `createD1AuditSink` with its own domain events — a correct generic accommodation
stated in the doc header rather than left to be discovered.
Any-site case: a site's audit table quietly missing rows while every action succeeds.
Provenance: `ddeebf5f`; ASC brief Seam 5. Family-originated.

## Rank 67 — `admin.action.misconfigured` — KEEP

Two reasons that are both pure developer faults with pure developer fixes: `db_not_bound`
(`config.resolveDb` returned nullish) and `access_map_not_attached` (the guard never ran on this
route). The second is only detectable because of a deliberate engine choice recorded at
`guard.ts:163-166`: "access ?? {}, not access ... It buys section-action.ts a real signal: an absent
`locals.cairnAccess` then only ever means the guard never ran on this route."
Any-site case: a developer mounts a custom admin section outside the guard and gets a 500 with no
explanation. This is the anonymous-consumer scenario in its purest form.
Provenance: `a3812180`; ASC brief Seam 2. Family-originated.

## Rank 68 — `config.invalid` — KEEP

Three emit sites, four call paths, and the doc row states the property that earns the top tier: two
loads degrade silently (nav → empty tree, vocabulary → empty list), and two saves answer with
generic copy while "**the parser's own message stays in this log record, not the response**." The
`scope` field is a closed snake_case enum and `conditionId` (`'config.site-config-invalid'`) ties the
record to the diagnostics registry the doctor reads.
Any-site case: an editor's nav screen renders empty after a hand-edited config, with nothing in the
UI naming the parse error. Nothing else in the system carries the parser message.
Provenance: `31516693 Finish the runtime adoption of the diagnostics condition registry`. Engine core.

## Rank 69 — `commit.failed` — RESHAPE

Diagnostically top-tier: the doc's own symptom map in CLAUDE.md routes here first — "A save that does
nothing points at a commit failure: a `conflict` reason is a stale-edit collision, and an `error`
field is the GitHub failure to act on." The warn/error split is principled and centralized in
`commit-log.ts`:

```ts
if (isConflict(err)) log.warn(event, { ...fields, reason: 'conflict' });
else log.error(event, { ...fields, error: String(err) });
```

Listed in `docs/admin/troubleshooting.md`. It reshapes only because it inherits **F1** verbatim from
`commit.succeeded` — the same `commitFields` objects carry the same pseudo-concepts into the same
field. Any fix to rank 28 must land here in the same change; the two share one field contract and
one helper.
Any-site case: "my editor pressed save and nothing happened," the most common failure a content site
has. Provenance: `231476a7`. Engine core.

## Rank 70 — `admin.action.failed` — KEEP

The single-mount admin's action chokepoint catching an unexpected throw. Doc: "the editor sees the
calm failure strip instead of the platform's raw 500." The engine deliberately hides the error from
the UI, so this record is the entire diagnostic. Fields are exactly right: `error` is "the thrown
error's message, **never a stack**", and `concept`/`id`/`editor` are conditional on being in scope
rather than faked.
Any-site case: an editor reports "it just says something went wrong." Listed in
`docs/admin/troubleshooting.md`. Provenance: `5c1705b8 fix(sveltekit): guard every admin action from
an unexpected raw 500`. Engine core.

## Rank 71 — `publish.failed` — KEEP

Same shape and same helper as rank 69, on the action with the highest stakes: content that did not go
live. The doc's publish-all rule is the property that makes it uniquely load-bearing: "a failed
publish-all logs one `publish.failed` per entry, so **the log names everything that didn't go live**."
No screen carries that list; the redirect collapses to a single bounded `publish_failed` code
(`refusal-codes.ts:17`).
Any-site case: an editor publishes twelve drafts, nine appear, and nobody can say which three
failed or why. Listed in `docs/admin/troubleshooting.md`. (The pairing reshape is charged at rank
29, which renames the success half onto this area.) Provenance: `aea56f3f`. Engine core.

## Rank 72 — `auth.link.send_failed` — KEEP

The richest failure envelope in the vocabulary — `email`, scrubbed `error`, `code`, `conditionId` —
against the failure mode CLAUDE.md names first: "An admin who cannot sign in points at a
send-failure or a guard rejection; check the `reason` field." The `code` field exists because of a
measured, documented platform trap that no anonymous consumer could reason out unaided (CLAUDE.md,
"Durable gotcha (Cloudflare email)"): the binding throws `E_SENDER_NOT_VERIFIED` for two entirely
different conditions, "the same string Routing uses for an unverified destination, **which is how
the ecxc outage hid**." The `conditionId` ties the record to the doctor's registry so the operator
gets a remedy, not just a string.
Any-site case: nobody can log in to a freshly deployed site, and the cause is an unverified sender
domain the deploy never surfaced. Listed in `docs/admin/troubleshooting.md`.
Provenance: `231476a7`; the `code`/`conditionId` fields from the email spike
(`docs/internal/2026-08-11-t4b-email-spike.md`). Engine core, hardened by a family outage but
generic in shape.

## Rank 73 — `guard.rejected` — KEEP

Eight emit sites, five reasons, and a level split that is itself the triage: `error` for the two
operator faults (`bindings` — no `AUTH_DB` on any admin path including the public login and confirm
routes; `dev_backend_in_prod` — a 503), `warn` for the three request refusals (`csrf`, `origin`,
`https`). The comment at `guard.ts:118-121` states the generic reasoning: "That is an operator
fault, not a sign-in problem, so name the condition on every admin path, the public ones included,
instead of rendering a login form that can never succeed."
Any-site case: the entire admin is unreachable on a new deploy, and the reason (a missing binding
versus an origin mismatch behind a proxy versus plain HTTP) is only here. Carries `conditionId` on
`bindings`, routing the operator to a remedy. Listed in `docs/admin/troubleshooting.md`.
Provenance: `231476a7`. Engine core.

## Rank 74 — `preview.rejected` — KEEP (strongest)

The clearest keep in the subsystem, and the doc row makes the argument in one sentence:

> Every outward response is an identical 404, except `bindings_missing`, which answers 503; **this
> log is the only place the distinction survives.**

Seven reasons, checked in a documented order, spanning an unbound binding, an un-migrated table, an
unknown hash, an expiry, a stale row, a draft that no longer validates, and a vanished branch. Those
are seven completely different operator actions behind one indistinguishable response — an
information-theoretic hole in the HTTP surface that only the log can fill, deliberately, because
distinguishing them on the wire would leak preview-token validity to a prober. The conditional field
policy is equally disciplined: `concept`/`id` only on the three reasons where an entry is actually
identified, `binding` only on `bindings_missing`, entry fields absent on `unknown`/`expired`/
`table_missing`, and never the token.

Any-site case: an anonymous consumer's editor shares a preview link with a client, the client sees a
404, and the site owner must decide between "apply migration 0003", "bind AUTH_DB", "the link
expired", and "the draft was reverted into an invalid state" — four different days of work, chosen
by one `reason` field.
Provenance: `65737bf5 Add previewLoad, the public preview page's server load`. Engine core.

---

# Summary

- 74 events audited, 0 retired, **13 reshaped**, 61 kept.
- **No retirements.** Every event has a live emit site and a condition an anonymous consumer can at
  least in principle reach. The weakest item (`auth.channel.delivery_inline`) is a reshape rather
  than a retirement because its signal is real, just misfiled as an occurrence instead of a field.
- **The doc-vs-code contract is healthy**: names diff clean, field lists match at every site I
  checked, and no vocabulary entry is dead.
- **The reshapes cluster into four shapes**, none of which is a membership question:
  1. *Missing free context* (ranks 2, 32, 35, 36, 47): the record carries what the call site had in
     a local variable rather than what a diagnosing operator needs. Four of the five fixes are free
     (the value is already in scope); `media.resolve_missing` costs a thread through the render seam.
  2. *Namespace overload* (ranks 28, 69, and 29): pseudo-concepts in the `concept` field, and a
     publish pair split across two areas.
  3. *Grammar divergence from the ratified header* (ranks 30, 44): a bare noun phrase, and a
     stringified throw in the snake_case `reason` slot.
  4. *Dead or borrowed payload* (ranks 5, 14, 42): a constant field, a vendor object re-exported as
     a stable contract, and document content logged against the doc's own redaction claim.
- **The vocabulary's best-shaped records are the family-originated ones.** `auth.channel.requested`
  (one event, six outcomes, a privacy property falling out of the shape),
  `turnstile.verify_failed` (an explicit rule for what it declines to log), and
  `audit.sink.write_failed` (a stated only-surviving-record burden) all arrived through the ASC and
  xcathletes briefs with a ratified design behind them. The engine-core records added
  opportunistically alongside a feature are where the shape defects sit. That is the finding worth
  carrying forward: **the events written to a spec are better shaped than the events written to a
  call site.**
