# cloudflare-audit-sink — fresh-context verification of the four verdicts

Verifier context: did not produce the ranking. Read `src/lib/cloudflare/{index,rate-limit,turnstile}.ts`,
`src/lib/sveltekit/section-action.ts:209-240`, `src/lib/auth-channel/factory.ts:444-475`,
`docs/reference/cloudflare.md:130-200`, `docs/reference/log-events.md:77`, `package.json` exports,
and grepped all six family repos for the four identifiers.

All four verdicts stand. Two carry amendments to the *reasoning*, not the verdict; one carries an
amendment to the reshapeNote's shape.

## Facts checked against the ranking's claims

- **Grep counts hold.** `VerifyTurnstileOptions` appears only inside `src/lib/cloudflare` (turnstile.ts:17,18,84
  plus the index barrel). Every real call site passes an inline literal (ASC `donate.remote.ts:43`,
  xcathletes `channel.ts:74`).
- **One count the ranking understates.** 907-life also carries a hand-rolled `verifyTurnstile(token, ip, secret)`
  (`907-life/src/routes/(site)/about/+page.server.ts:16`). Three unmigrated hand-rolled copies across
  two repos, not two. Evidence toward generality only, per constraint 2; it does not move a verdict.
- **`createSectionAction` really does reimplement the limiter** (`section-action.ts:209-240`), with an
  absent-binding log at `:212` and a throw branch at `:219-234`. The reference concedes the gap at
  `cloudflare.md:156-160`.
- **The engine logger is genuinely engine-owned.** `src/lib/log` is exported from no subpath in
  `package.json` `exports` and from no public barrel. `turnstile.verify_failed` is a documented public
  event (`log-events.md:77`) that only engine code can emit.

## Rank 1 — `VerifyTurnstileOptions` (keep) — STANDS, on better grounds

The ranking's own framing is the weakest part of it: an "absence of objection" keep is exactly the
accept-by-default the standard forbids, and a keep whose only positive case is a hypothetical shared
helper would fail the concreteness burden the verifier is asked to apply. Zero by-name demand across six
repos is real, and `Parameters<typeof verifyTurnstile>[2]` is a legal reach, so the residual clause does
not carry this item.

What carries it is the audit's other stated goal — evenness across the whole surface. Every public
function in the engine exports its options interface: `AuthGuardOptions` (guard.ts:44),
`AdminActionOptions` (admin-action.ts:71), `SectionActionOptions` (section-action.ts:48),
`FormatMoneyOptions`/`FormatCivilDateOptions`/`FormatTimestampOptions`/`FormatPhoneOptions`
(admin-toolkit/format.ts), `ContentRoutesOptions`, `EditorRoutesOptions`, `CairnAdminOptions`,
`RendererOptions`, `CairnManifestOptions`. Retiring this one would make `/cloudflare` the single subpath
whose public function's argument type is unnameable. That is a per-surface inconsistency the audit's
standing goal counts against, and it does not depend on demand.

Amendment: keep stands; `absenceOfObjection` should read **false**. The keep rests on a stated,
checkable property of the surface (uniform options-type export), not on nothing objecting. It also
remains derivative: if `verifyTurnstile` were retired, this retires with it.

## Rank 2 — `checkRateLimitKeys` (reshape) — STANDS

Tested for keep: the only argument is that two names read more plainly than one overloaded parameter.
That is taste, and against it sits the whole body being a five-line loop over its sibling
(`rate-limit.ts:47-57`) and the one non-obvious thing it knows — broadest-first ordering — living
entirely in prose (`cloudflare.md:174-179`) that the function neither enforces nor can detect a
violation of. Membership is right (checking an IP budget and an email budget on one form is a general
situation); the second name buys a for-loop. Constraint 3 (re-derive in the form easiest for any site)
picks the array parameter.

Tested for retire: dropping array support entirely would push seven ASC call sites back to hand-rolled
loops for no gain, and the fold costs one union type. Retire is worse than reshape here.

Shape note carried forward: if rank 3's reshape changes the return type, the array form must decide
whether the outcome names *which* key failed. Returning a bare aggregate loses information the
short-circuit already knows.

## Rank 3 — `checkRateLimit` (reshape) — STANDS, with the reshapeNote amended

This is the item where the adversarial case is strongest, and it is a case for **retire**, not for keep.
The body is three lines (`rate-limit.ts:36-38`). The standard says an item fails when the hand-roll is
small or is a discoverability problem an export would not fix, and the reference page's actual payload
is four paragraphs of advisory prose about key construction (`cloudflare.md:143-154`) — advice a
consumer receives only by reading a page they had to find anyway. No first-limb argument exists as
shipped: `env.MY_LIMITER.limit({ key })` is a public platform API and no ratified grammar has diverged.
Judged on the shipped shape alone, retire is at least as defensible as reshape.

What decides it for reshape is a first-limb property the ranking did not name. The failure the reference
concedes — a misspelled binding name silently disabling the limiter forever — is an *operator
diagnosis*, and cairn's diagnosis surface is its structured log vocabulary, which is engine-owned and
unreachable by a site: `src/lib/log` is exported from no subpath, yet its event names are a documented
public contract (`log-events.md`). A site hand-rolling three lines can log something; it cannot put a
record into the vocabulary an operator filters cairn events by in Workers Logs. That is the same limb
that carries `verifyTurnstile`, and it is the only thing here that a hand-roll genuinely cannot reach.

Consequently the reshapeNote should shift its load-bearing half. As written it proposes a discriminated
return (`{ allowed, limiterPresent }`) as the fix. A return type only makes a site *able* to notice; a
site that ignores the field is exactly as blind as today. The minimum reshape that actually closes the
conceded gap is an engine `warn` record on the absent-binding branch, in the log vocabulary, plus the
rank-2 array fold. The reference's stated reason for having no log — "neither has the call-site context
to say what a misspelled binding name should mean for the caller" (`cloudflare.md:156-158`) — does not
survive comparison with `verifyTurnstile`, which logs seven distinct refusal reasons with no call-site
context at all and still leaves policy to the caller. The discriminated return is a reasonable option on
top, not the essential part.

One claim in the ranking is weaker than it reads: "the shape `createSectionAction` had to hand-roll"
implies the reshape would let section-action call the export. It probably would not. Section-action's
branches carry section-specific event names (`admin.action.rate_limit_absent` with `path`/`action`/`entity`)
and a SvelteKit-specific `isRedirect`/`isHttpError` rethrow (`section-action.ts:226`). The in-engine
duplication is evidence that the boolean erases something real; it is not evidence that one export can
serve both.

## Rank 4 — `verifyTurnstile` (keep) — STANDS, on stronger grounds than argued

Tested for retire on the charter objection ("bot-defending a public donation form is site domain"). Two
pieces of evidence defeat it, one of which the ranking has and one of which it does not.

The one it has: the subpath fences the precedent in code (`cloudflare/index.ts:3-5`, restated on the
reference page), so Turnstile does not open a door for third-party service verifiers.

The one it does not: `challenge` is a **required** constructor argument on `createAuthChannel`
(`factory.ts:474`, `requireFn('challenge', config.challenge)`), and the doc example names
`verifyTurnstile` (`factory.ts:460`). The engine does not merely offer a socket a site may use; it
refuses to construct an auth channel without a bot challenge, then ships exactly one Cloudflare-native
implementation of the thing it mandates. Withdrawing it would leave the engine requiring a capability it
declines to provide on the platform it targets.

The first limb also applies here, and the ranking treats it as unavailable for the whole bucket. Every
refusal path emits `turnstile.verify_failed` with a reason (`turnstile.ts:97,122,130,138,149,158,166`),
a documented public event (`log-events.md:77`) that only engine code can emit because the logger is
exported from no subpath. A hand-rolled verifier is not merely more permissive; it is silent in cairn's
own diagnosis surface, which the site cannot legally reach.

Internal-consistency check the verifier owes: rank 3 reshapes partly because a boolean erases the
absent-binding case, while rank 4 keeps a boolean that erases eleven failure paths. That asymmetry
survives, and the reason is exactly the log: `verifyTurnstile`'s boolean is accompanied by a structured
record per refusal, `checkRateLimit`'s is accompanied by nothing. The two verdicts are consistent once
the log is the axis.

Constraint 3 was already honored: the engine refused ASC's `(token, ip, secret)` positional shape and
shipped `(token, secret, opts)` with the porting hazard documented (`cloudflare.md:49-52`), and the
`hostname`/`action` narrowing existed in no site copy.

---

# Second independent verification pass (fresh context, ranking read, prior pass read only after
# forming conclusions)

Read independently: `src/lib/cloudflare/{index,rate-limit,browser}.ts` and `turnstile.ts` in full,
`src/lib/sveltekit/section-action.ts:190-245`, `src/lib/auth-channel/factory.ts:440-480`,
`src/lib/sveltekit/index.ts`, `src/lib/index.ts`, `docs/reference/cloudflare.md:130-200`,
`src/tests/unit/rate-limit.test.ts`, `src/tests/unit/cloudflare-exports.test.ts`, `package.json`
exports, and the family call sites (ASC `donate.remote.ts:30-46`, xcathletes `channel.ts:55-80`,
ecxc `registration/handler.ts:108-118`, ASC `theme/turnstile.ts:1-8`).

All four verdicts stand. Two additions the first pass did not carry, and one it did that I reached
independently.

## Rank 1 — `VerifyTurnstileOptions` (keep) — STANDS, on evenness

New evidence not in the ranking or the first pass: **exporting the options interface beside its
factory is the engine's own ratified grammar, everywhere.** `AuthGuardOptions` (`sveltekit/index.ts:6`),
`EditorRoutesOptions` (`:15`), `CairnAdminOptions` (`:109`), `RendererOptions`/`ResolveOptions`
(`lib/index.ts:109`), `CairnManifestOptions` (`vite/index.ts:8`). Retiring this one alone would make
`verifyTurnstile` the single public factory in the package whose options type is unnameable, which is
the evenness cost the standing goal names, paid to save one line in a barrel. The ranking's stated
anySiteCase (a site's shared Turnstile helper annotating its argument) is thin and I confirmed zero
by-name uses across ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub; the keep does not
need it. `absenceOfObjection: true` is the wrong label for the record: surface evenness is a positive
reason, not an absence of one.

## Rank 2 — `checkRateLimitKeys` (reshape) — STANDS

Tested for retire independently: the naive replacement a site writes is not always the engine's loop.
`await Promise.all(keys.map((k) => checkRateLimit(b, k)))` reads as the obvious idiom and is wrong for
exactly the reason the sequential version exists: it charges every budget even when the first has
already failed. That is a real, general, non-domain mistake, so the array behavior is worth shipping,
which rules out retire. Two names for one concept is what fails, not the concept. Fold as
`string | string[]`.

## Rank 3 — `checkRateLimit` (reshape) — STANDS, reshapeNote's justification does not

I reached the first pass's amendment independently and by a different route, and the route matters
because it kills a specific sentence in the reshapeNote.

**The `createSectionAction` evidence does not support a `limiterPresent` return.** Section-action
resolves its own limiter and branches on absence *before* it would ever call the export:
`const limiter = config.rateLimit.resolve(...); if (!limiter) log.warn('admin.action.rate_limit_absent', ...)`
(`section-action.ts:210-213`). The caller supplies the binding, so `binding === undefined` is knowable
at every call site with zero help from the return type. ASC's real call site has the same property:
`checkRateLimit(platform?.env?.RATE_LIMIT_MONEY, ...)` (`donate.remote.ts:34`) — whoever wrote that
expression can test it. A field that re-tells the caller what the caller just passed in is not
information; it is a nudge, and a nudge is the fix that does not fix a discoverability problem, which
is precisely the failure mode the standard's residual clause names.

**What survives as the load-bearing reason is the engine-owned log**, and I verified the premise rather
than taking it: `package.json` `exports` lists eighteen subpaths and none is `./log`, and no public
barrel (`lib/index.ts`, `sveltekit/index.ts`, `cloudflare/index.ts`) re-exports it. So a site can write
the three lines but cannot put a record into the vocabulary an operator filters cairn events by. That is
the first limb, and it is the only clause in this bucket a hand-roll genuinely cannot reach.

**Membership, tested hardest.** The retire case is strong: three lines, zero in-engine callers (grep:
nothing outside `rate-limit.ts` and its tests calls it), and a reference page whose payload is advisory
prose. What holds membership is a concrete anonymous failure I could not talk myself out of: the
reflexive fix for the `TypeError` an unprovisioned binding throws in vitest or `wrangler dev` is
`env.LIM?.limit({ key })`, whose `success` is then `undefined`, so the naive guard degrades to **closed**
and blocks every request in local dev. Degrade-to-open is a one-line decision that a competent developer
plausibly makes backwards under exactly the conditions the wrapper exists for. Reshape, not retire.

Corrected shape: one export, `string | string[]`, keeping the boolean, plus an engine `warn` on the
absent-binding branch in the log vocabulary. A discriminated return is optional polish, not the fix, and
it should not be sold as the shape section-action wanted, because section-action's branches carry
section-specific event fields and a SvelteKit `isRedirect`/`isHttpError` rethrow (`:226-233`) that no
`/cloudflare` export can serve.

## Rank 4 — `verifyTurnstile` (keep) — STANDS

Two independent confirmations of the ranking's case, and one qualification it should carry.

The `challenge` callback is **required**, not offered: `requireFn('challenge', config.challenge)`
(`factory.ts:473`) throws at construction, the config field is non-optional (`:209`), and the doc example
is `challenge: verifyTurnstile` (`:460`). An engine that refuses to build an auth channel without a bot
challenge, on a Cloudflare-only target, and then declines to ship the Cloudflare-native implementation,
is less coherent rather than leaner.

The bypass is measured, not asserted. ecxc's shipped copy is ten lines that `await res.json()` with no
status check and no shape guard (`ecxc-ski/src/theme/registration/handler.ts:110-118`): a non-JSON error
page throws, and any 200 body without a `success` field reads as `undefined` — falsy here, but the same
file's sibling pattern is what ASC's migration note calls "trusted a malformed body"
(`aksailingclub-org/src/theme/turnstile.ts:5-7`). The engine's guard validates every field it reads
(`turnstile.ts:50-58`), bounds the call (`:119`), and blocks the secret-re-POST on a redirect (`:116`).

Qualification the audit should record: the engine's own reference consumer does **not** demonstrate this
export. `examples/showcase/src/members/channel.ts:33` wires a static expected token and says "A real site
wires `verifyTurnstile` into that seam." The keep does not depend on the showcase, but a subpath whose
strongest coherence argument is a required `challenge` seam should have its own example wire the real
verifier.
