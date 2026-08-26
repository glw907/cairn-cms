# cloudflare-audit-sink — retroactive any-site audit ranking

Subsystem: subpath `/cloudflare`. Source `src/lib/cloudflare/`, reference
`docs/reference/cloudflare.md`. Four items, all audited. No item in this bucket carries
`"collision": true`, so there are no cross-subpath signature collisions to reconcile here.

## Bucket-level context that shapes every verdict below

**Adjacent export not in this bucket.** `RateLimitLike` is exported from `/cloudflare` and
re-exported from `/sveltekit` (`src/lib/sveltekit/section-action.ts:33`, `export type
{ RateLimitLike };`), so it deduped into another auditor's bucket. Both rate-limit verdicts below
touch it; neither depends on retiring it. The structural typing is itself real value the reference
page names: "any conforming limiter serves, so the surface takes no dependency on
`@cloudflare/workers-types`" (`docs/reference/cloudflare.md:190`).

**The gate limb this subpath passes.** Neither headline limb of the standard applies literally to
`/cloudflare`. A site can legally reach every surface here: `fetch()` to
`challenges.cloudflare.com` and `env.MY_LIMITER.limit({ key })` are public platform APIs the
engine owns nothing of, and no ratified grammar has diverged. So every item in this bucket must
survive on the residual clause instead — that the hand-roll is not small, not domain-shaped, and
not a discoverability problem an export would not fix. That is a narrow ledge, and two of the four
items fall off it.

**Adoption is real, and adoption is not the bar.** The 2026-08-05 harvest brief recorded these
seams as landed-ahead-of-consumer: "the ASC retrofits (deleting `club-action.ts`,
`portal-action.ts`, the two crypto copies, `turnstile.ts`, `rate-limit.ts`, `audit-sink.ts`) are
queued in ASC's STATUS and have not run" (`docs/internal/engine-harvest-candidates.md:82`). That
is now stale. ASC has migrated: `aksailingclub-org/src/theme/turnstile.ts:2` reads "Verification
itself moved to `@glw907/cairn-cms/cloudflare`'s `verifyTurnstile` in the `0.94.0-rc.1`
migration," and thirteen ASC modules now import from `@glw907/cairn-cms/cloudflare`. xcathletes
wires `verifyTurnstile` as its auth-channel `challenge`
(`xcathletes-org/src/lib/server/auth/channel.ts:21`). ecxc-ski still carries two hand-rolled
copies (`ecxc-ski/src/theme/contact.remote.ts:15` and
`ecxc-ski/src/theme/registration/handler.ts:110`), the unmigrated duplication that motivated the
seam. Under constraint 2 none of this is sufficient by itself; it is evidence toward generality
only, and the ranking below is argued on the anonymous consumer, not the count.

**No consumer outside the family exists.** Nothing in the repo, the briefs, or the sites'
histories names one.

---

## Rank 1 — `VerifyTurnstileOptions`

- **surfacedAt:** `/cloudflare`
- **Signature:** `{ ip?: string; hostname?: string; action?: string }`
- **Collision:** none.

**Provenance.** Engine-internal, created alongside its function. It does not appear in the ASC
brief's ask, which named a positional shape: "a `verifyTurnstile(token, ip, secret)` export on a
server-only subpath" (`docs/internal/record/2026-08-01-asc-consumer-brief.md:73`). The interface
arrived with the export-map promotion (`git log -S 'VerifyTurnstileOptions'`: `d1b23796 Add
verifyTurnstile, fail-closed against Cloudflare siteverify`, then `c3957d70 Promote verifyTurnstile
and the rate-limit wrapper to the ./cloudflare subpath`). Family-originated by inheritance from
seam 3, with a built consumer for the function it decorates.

**Anonymous-consumer case.** The weakest in the bucket, and the weakness is measurable: a
repo-wide grep across all six family repos finds the identifier named exactly three times, all
three inside `src/lib/cloudflare` itself. Every real call site passes an inline object literal —
`verifyTurnstile(token, secret, { ip: clientAddress })`
(`aksailingclub-org/src/theme/donate.remote.ts:43`), `{ ip, hostname, action }`
(`xcathletes-org/src/lib/server/auth/channel.ts:74`). Nobody, in or out of the family, needs the
name today. A consumer who did could reach `Parameters<typeof verifyTurnstile>[2]` without it.

**Verdict: keep.** Against: an options type with zero by-name demand is surface the engine pays
for and nobody spends, and the audit's evenness goal argues for a smaller surface. For: an
exported function whose parameter type is unexported is a declaration-emit trap and an
anti-pattern in every TypeScript style guide; the moment a consumer factors its Turnstile
call-site guard into a shared helper, it has to annotate that helper's argument, and
`Parameters<typeof f>[2]` is the workaround an unexported type forces, not a design. The keep is
therefore structural rather than demonstrated. There is no positive anonymous-consumer scenario
pulling this into the engine on its own; it rides in because `verifyTurnstile` is kept and nothing
objects. Recorded as such: **absenceOfObjection: true.** If `verifyTurnstile` were retired, this
retires with it and needs no separate argument.

---

## Rank 2 — `checkRateLimitKeys`

- **surfacedAt:** `/cloudflare`
- **Signature:** `(binding: RateLimitLike | undefined, keys: string[]) => Promise<boolean>`
- **Collision:** none.

**Provenance.** ASC consumer brief, seam 4, which asked for one wrapper, singular: "the wrapper as
a server-only export, with the convention documented once in its reference page instead of
re-derived per site" (`docs/internal/record/2026-08-01-asc-consumer-brief.md`, seam 4 ask). The
plural variant is an engine addition on top of the ask, landed in the same commit as its sibling:
`182d3734 Add the rate-limit wrapper and consolidate RateLimitLike into it`, whose body says
"checkRateLimit and checkRateLimitKeys carry ASC's evidenced degrade-to-open convention." Seven
ASC call sites use it today (`join-apply-form.ts:326`, `contact.remote.ts:36`,
`class-signup-form.ts:142` and `:237`, `join-apply.remote.ts:28`, `class-signup.remote.ts:36`,
`my-account/+page.server.ts:152`, `my-account/confirm/+page.server.ts:118`). Family-originated,
with a built consumer.

**Anonymous-consumer case.** The entire body is a loop over its sibling:

```ts
if (!binding) return true;
for (const key of keys) {
  const success = await checkRateLimit(binding, key);
  if (!success) return false;
}
return true;
```

(`src/lib/cloudflare/rate-limit.ts:47-57`). Five lines a Workers developer writes without
thinking. The one non-obvious thing this export knows is an ordering discipline, and that
discipline is not in the code at all — it is prose: "Order the keys broadest first: the budget
that most needs to hold goes at index 0" (`docs/reference/cloudflare.md:174`). The function does
not enforce it, cannot detect a violation, and would behave identically if a caller ordered the
list backwards. An anonymous consumer checking an IP and an email budget gets a three-line loop
saved and one paragraph of advice they only receive if they read a reference page they would have
had to find anyway.

**Verdict: reshape.** Against reshaping: two named functions read more plainly at a call site than
one overloaded parameter, and seven working call sites argue the split is comfortable. That
comfort is migration cost, which the standing ruling says never discounts a verdict. For
reshaping: this is one concept under two names, and the second name buys a for-loop. Membership is
right (a site checking several budgets is a real, general situation); the form is wrong. **The
right form:** fold the plural case into the single rate-limit export as `string | string[]`,
keeping the documented short-circuit exactly as it behaves now, so the subpath carries one
rate-limit name instead of two and the broadest-first guidance lives in one place. Combine with
the rank-3 reshape and the pair becomes a single export. ASC's seven call sites become
`checkRateLimit(binding, [a, b])` mechanically.

---

## Rank 3 — `checkRateLimit`

- **surfacedAt:** `/cloudflare`
- **Signature:** `(binding: RateLimitLike | undefined, key: string) => Promise<boolean>`
- **Collision:** none.

**Provenance.** ASC consumer brief, seam 4, which is explicit about the evidence and about what
the wrapper contains: "`aksailingclub-org/src/theme/rate-limit.ts` wraps the Workers `RateLimit`
binding behind one policy: a binding absent from the running environment (local dev, vitest, a
not-yet-provisioned deploy) never blocks a request, and a present binding fails closed over its
limit. Every site with a public form re-decides that policy, and the wrapper carries no ASC
domain." Landed in `182d3734`. Six ASC call sites plus `member-portal/lib/portal-action.ts:85`.
Family-originated, with a built consumer.

**Anonymous-consumer case.** Three lines of body (`src/lib/cloudflare/rate-limit.ts:36-38`):
absent-binding early return, one `limit()` call, one strict `result?.success === true`. The
strictness is a genuinely good call and a genuinely small one. The degrade-to-open policy is the
real payload, and it is a decision, not code — a site that decides the other way writes the same
three lines with the first flipped.

The decisive evidence against the current shape is in the engine itself. cairn's own rate-limit
path does not call this export. `createSectionAction` reimplements it and says so:

> `// Mirrors checkRateLimit's own `result?.success === true` test (rate-limit.ts):`
> (`src/lib/sveltekit/section-action.ts:218`)

It reimplements because it needs a distinction the boolean erases. An absent binding gets its own
log record there — `log.warn('admin.action.rate_limit_absent', ...)`
(`section-action.ts:212`) — and a throwing `limit()` gets a third branch. `checkRateLimit` collapses
absent and allowed into one `true`, so the engine's only in-house consumer of the concept could not
use it. The reference page concedes the same gap in its own words: "Both helpers degrade to open
with no log line of their own, by design: neither has the call-site context to say what a
misspelled binding name or a not-yet-provisioned limiter should mean for the caller"
(`docs/reference/cloudflare.md:156`). A misspelled binding name silently disables the limiter and
returns `true` forever, and the export's answer is to point at a different export that hand-rolled
around it.

**Verdict: reshape.** Against reshaping: the convention is real, silently fail-closing on an
absent binding breaks local dev in a way a developer loses an hour to, and thirteen call sites run
on it happily. For reshaping: an export whose documented payload is advisory prose (normalize the
email before keying, derive the IP from `CF-Connecting-IP`, bound the key length, order keys
broadest first — `docs/reference/cloudflare.md:143-154`), and whose return type hides the one
failure an operator most needs to see, is close to a discoverability problem wearing a function's
clothes. It clears the bar only because the absent-binding policy is a decision worth shipping
once, and the current return type is the wrong vessel for it. **The right form:** one export
taking `string | string[]` and returning an outcome that names the absent-binding case rather than
folding it into `true` (a small discriminated result, or an `{ allowed, limiterPresent }` pair) —
the shape `createSectionAction` had to hand-roll, and the shape that lets any site log or alert on
a limiter that silently is not there. That reshape absorbs rank 2 and leaves `/cloudflare` with
one rate-limit name.

---

## Rank 4 — `verifyTurnstile`

- **surfacedAt:** `/cloudflare`
- **Signature:** `(token: string, secret: string, opts?: VerifyTurnstileOptions) => Promise<boolean>`
- **Collision:** none.

**Provenance.** ASC consumer brief, seam 3, on measured duplication rather than a prediction:
"`aksailingclub-org/src/theme/turnstile.ts` opens with 'Ported from ecxc.ski's own
contact.remote.ts (the family precedent this pass follows).' Two sites already carry the same
siteverify fetch verbatim; that is measured duplication, not predicted"
(`docs/internal/record/2026-08-01-asc-consumer-brief.md:64-67`). Landed as `d1b23796 Add
verifyTurnstile, fail-closed against Cloudflare siteverify`, hardened twice after review
(`a2369bb4`, `b013ad2f`). Family-originated. Two built consumers today: ASC (nine call sites) and
xcathletes' auth channel. ecxc-ski is the unmigrated third copy.

**Anonymous-consumer case.** Any Workers site putting a Turnstile widget on a public form must
POST siteverify from the server and decide what happens on eleven distinct failure paths. The
brief called the hand-roll "thirteen lines"; the shipped verifier is 175 and every added line
closes a path the thirteen-line version got wrong. `redirect: 'manual'` stops a 307/308 from
re-POSTing the secret to a redirect target (`turnstile.ts:116`). `AbortSignal.timeout(5000)`
bounds a hung call (`:119`). `isSiteverifyBody` validates every field read, not only `success`, so
a spoofed 200 becomes `false` instead of an unhandled throw (`:50-58`). A `hostname`/`action`
mismatch is what stops a token solved on one widget replaying against another form sharing the
sitekey (`:154-172`).

The consumer's own migration note is the sharpest evidence that the naive version fails open:

> "The packaged verifier is strictly stricter than the copy was: it fails closed on a fetch throw,
> a non-200, an unparseable body, and an over-length token, where this file's version would have
> thrown or trusted a malformed body."
> (`aksailingclub-org/src/theme/turnstile.ts:5-7`)

"Trusted a malformed body" is a bot bypass, written by a competent developer, shipped to
production on two sites. That is not a small hand-roll, not domain-shaped, and not a
discoverability problem — an anonymous consumer who reads Cloudflare's docs end to end still
writes the thirteen-line version, because the docs describe the endpoint, not the failure policy.

Constraint 3 was already honored here: the engine refused to transplant ASC's shape. The brief
asked for `verifyTurnstile(token, ip, secret)`; the engine shipped `(token, secret, opts)` and
documented the porting hazard it created — "`secret` is the second parameter, not the third. Both
`token` and `secret` are plain strings, so swapping them, easy to do when porting from a
hand-rolled `(token, ip, secret)` shape, still typechecks" (`docs/reference/cloudflare.md:49-52`).
The optional `hostname`/`action` narrowing exists in the engine shape and existed in neither site
copy.

**Verdict: keep.** Against: the charter says cairn "owns its core job, managing markdown content
and the editor/admin frame, and little else," and bot-defending a public donation form is site
domain the engine has no concept of. That objection is real and I do not think it wins, for two
reasons. First, the subpath's own boundary is drawn narrowly enough to hold the line the objection
worries about: "Anything proposed here must be a Cloudflare platform primitive itself; a
third-party service verifier (a payment processor's webhook check, a chat platform's notifier)
belongs to the site, whatever precedent Turnstile appears to set"
(`src/lib/cloudflare/index.ts:3-5`) — a boundary restated verbatim on the reference page, so the
precedent is fenced rather than open. Second, the engine already ships a bot-challenge seam:
`createAuthChannel` takes a `challenge` callback and names this function as its example
(`src/lib/auth-channel/factory.ts:460`, `challenge: verifyTurnstile`), and xcathletes wires
exactly that. An engine that ships the socket and refuses the one Cloudflare-native plug is less
coherent, not leaner.

**absenceOfObjection: false** — the keep rests on a stated scenario with a demonstrated failure
mode, not on nothing objecting.

---

## Summary

| Rank | Item | Verdict |
| --- | --- | --- |
| 1 | `VerifyTurnstileOptions` | keep (derivative; absence-of-objection) |
| 2 | `checkRateLimitKeys` | reshape (fold into one rate-limit export's array form) |
| 3 | `checkRateLimit` | reshape (return an outcome that names the absent-binding case) |
| 4 | `verifyTurnstile` | keep |

Net effect on the subpath: three names instead of four, with the rate-limit half re-derived around
the distinction the engine's own `createSectionAction` had to hand-roll around. Nothing here
retires outright, which is worth stating plainly rather than hiding: the two weakest items are
weak in form, not in membership, and a bucket where every item is thin enough to be worth arguing
about is a bucket the charter is holding.
