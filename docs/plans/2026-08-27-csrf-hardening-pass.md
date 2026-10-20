# CSRF Hardening Pass (remediation initiative, slice 1)

> **For agentic workers:** four tasks, SERIAL (Tasks 1-3 all touch `src/lib/sveltekit/`
> and the log/reference surface; Task 4 is ledger/docs). Below six tasks: dispatch the
> `cairn-implementer` / `diff-reviewer` chain per task with the Agent tool; the full gate
> inside the chain. Steps use checkbox (`- [ ]`) syntax. No model upshift needed.

**Token ceiling (WHOLE pass, chains plus ritual): 1.8M** (re-rated by the pre-approval
review against the toolkit-seams per-task data; 900K was roughly half the optimistic
floor). **Checkpoint interval:** four
tasks. **Worktree:** `csrf-hardening` off `main` AFTER the harvest-detection merge (that pass holds
warm edits in `docs/extend/security-model.md`, `docs/reference/doctor.md`, and `CHANGELOG.md`,
all files this pass also edits; do not branch before it lands).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(the hardening slice; its standing-constraints block applies to every task here).
**Evidence base:** the 2026-08-27 `web-auth-security-reviewer` verdict, inlined below where
load-bearing; the friction-log CSRF entry (docs/internal/docs-friction-log.md, 2026-08-27).

**Goal:** close the consumer CSRF-403 incident class as far as the evidence reaches, and make
any residue diagnosable from Workers Logs. The confirm-load re-mint under `SameSite=Strict`
is a CANDIDATE mechanism, not a confirmed diagnosis (a native mail client may send Strict
cookies on its navigation); the pass fixes every named mechanism and instruments the rest.
Known post-fix behavior to state in the changelog: browsers holding an old Strict cookie
re-mint exactly once after deploy as it ages out.

**Security invariants NOT to disturb (state in every dispatch):** no CORS headers for
`/admin` or `/media`, ever (the `X-Cairn-CSRF` preflight guarantee at `csrf.ts:48-51` is
load-bearing); the `__Host-` prefix is the sole sibling-subdomain defense; the showcase's
`checkOrigin: false` pairs with the guard's own origin rule (`guard.ts:102-108`); the HTTP
response for a csrf rejection stays the single generic
`renderConditionResponse('auth.csrf-token-invalid')`.

---

## Task 1: Cookie attributes (Lax, Max-Age, logout deletion, PUBLIC_ORIGIN-derived secure)

**Files:** `src/lib/sveltekit/csrf.ts`, `src/lib/sveltekit/guard.ts` (the `isLocalHost`
comment), `src/lib/sveltekit/auth-routes.ts` (`logoutAction`), `src/tests/unit/csrf.test.ts`,
`src/tests/unit/doctor-check-probe.test.ts` (fixtures),
`src/tests/integration/auth-load-csrf.test.ts` (its `platform: { env: {} }` event must
keep working under the fallback rule; add a PUBLIC_ORIGIN-absent case),
`docs/extend/security-model.md` (the CSRF cookie's full attribute set lands here; no
reference page names `cairn_csrf` today, verified by grep), `docs/reference/auth-crypto.md`
(:122-125 currently teaches a different secure derivation; align it), and
`docs/reference/doctor.md` (:134-136 names the https-only `__Host-` form; align).

**Why (from the security review, all verified against the code):** `SameSite=Lax` and
`Strict` are behaviorally identical for everything the guard screens (`UNSAFE_METHODS` with a
form content type; Lax withholds on all of them cross-site). Strict's only delta is the
cross-site top-level GET, where it WITHHOLDS the cookie, making `issueCsrfToken`
(`csrf.ts:34-38`) re-mint and invalidate every other tab's token; the public `/admin/login`
page makes that an unauthenticated cross-tab denial primitive. The session cookie is already
Lax (`auth-routes.ts:204`). The CSRF cookie is session-scoped while the session cookie lives
30 days, so any browser state dropping session cookies leaves an authenticated editor with a
token-bearing tab and no cookie: the same intermittent 403. `secure` currently derives from
`event.url.protocol` (`csrf.ts:32`), which `crypto.ts:33-35`'s own docstring forbids.

- [ ] `csrf.ts`: the cookie sets `sameSite: 'lax'` EXPLICITLY (never attribute-omission;
      Chrome's Lax-allowing-unsafe intervention applies to no-attribute cookies for 120s,
      and the confirm flow mints moments before a POST) and
      `maxAge: Math.floor(SESSION_TTL_MS / 1000)`.
- [ ] The expiry RE-ANCHORS: because `issueCsrfToken` early-returns on a present cookie
      (`csrf.ts:34-35`), a one-shot Max-Age would expire mid-session and re-mint, recreating
      the tab invalidation on a 30-day timer. When the cookie is present, RE-SET the SAME
      value with a fresh `maxAge`. That is not rotation (the value never changes), so it does
      not violate the no-rotate-on-confirm constraint; say so in the code comment. Test: a
      present cookie is re-set with a fresh `maxAge` and an UNCHANGED value. NO
      rotate-on-confirm (rotation would reintroduce the tab invalidation this pass fixes).
- [ ] One `csrfSecure(event)` helper decides the Secure bit and cookie name for EVERY writer
      and reader in the CSRF pair: `issueCsrfToken` (`csrf.ts:32`), `validateCsrfHeader`
      (`csrf.ts:53`), `validateCsrfToken` (`csrf.ts:61`), and `admin-action.ts:164`. The
      rule, never a throw from a cookie helper: if the request host is local (the guard's
      `isLocalHost` list), derive from `event.url.protocol` (dev keeps the bare non-Secure
      name; a production `PUBLIC_ORIGIN` must not mint `__Host-` over `http://localhost`);
      otherwise `PUBLIC_ORIGIN` when it parses; otherwise fall back to `event.url.protocol`.
      Note that `env.ts:59`'s local-host list is narrower than the guard's; the helper uses
      the guard's. The doctor probe (`check-probe.ts:49`) already derives from the configured
      origin, so today the probe and the runtime disagree; this change reconciles them.
      The SESSION cookie's derivation (`guard.ts:150`, `auth-routes.ts:198`, `:223`) is
      DELIBERATELY out of this slice: it belongs to the conventions pass's auth family; file
      that as a one-line ledger note so `crypto.ts:20`'s mirror claim has a listener.
- [ ] `logoutAction` (`auth-routes.ts:221-235`) deletes the CSRF cookie alongside the
      session cookie (a persistent token must not survive logout).
- [ ] Docstrings corrected in the same change: the Strict claim and the "a second open admin
      tab reuses the same value" invariant at `csrf.ts:27-28` (which the incident broke;
      restate as what the pass now makes true). The falsified "localhost branch decides the
      cookie name" theory is NOT adopted anywhere: `isLocalHost`'s comment at `guard.ts:27-31`
      is accurate and stays.
- [ ] Tests: `csrf.test.ts:75` asserts `sameSite: 'lax'` EXPLICITLY (never delete the
      assertion) and the new `maxAge`; the logout test asserts both cookies deleted; the
      doctor-probe fixtures (`doctor-check-probe.test.ts:39,120`) stop lying about the
      attribute.
- [ ] Acceptance: full gate green; `docs/extend/security-model.md` states the CSRF cookie's
      full attribute set; CHANGELOG entry with `Consumers must: nothing` plus the
      once-per-browser re-mint note.

## Task 2: The unreadable failure paths (empty-token fallback; cache posture)

**Files:** `src/lib/sveltekit/content-routes-core.ts` (the `:644` ternary),
`src/lib/sveltekit/admin-response.ts` (`applySecurityHeaders`), their tests,
`docs/internal/admin-smoke-test.md` (cookie-scheme wording).

- [ ] `content-routes-core.ts:644`'s `csrf: event.cookies ? issueCsrfToken(...) : ''`
      ternary is removed: `cookies` is required on `CairnEvent` (`types.ts:69`), so the
      false branch is unreachable from typed callers and, from an untyped caller, renders
      every form permanently 403 with no readable cause. Call `issueCsrfToken`
      unconditionally (or throw with a named condition if `cookies` is absent); a test pins
      the non-empty token in the shell payload.
- [ ] `applySecurityHeaders` gains `Cache-Control: private, no-store` (the engine's existing
      spelling, `preview.ts:141`): under Lax the cookie is re-set far less often, removing
      the accidental `Set-Cookie` cache suppressor on admin HTML that embeds the token and
      the editor's identity. Dedupe with the header `admin-response.ts:59` already sets on
      its own path so one value survives. Verified safe: the guard returns before
      `applySecurityHeaders` for non-`/admin` paths, so media and preview caching are
      untouched. Test asserts the header on an admin response.
- [ ] `docs/internal/admin-smoke-test.md:138-156`'s cookie-scheme description updates to the
      new attributes.
- [ ] Acceptance: full gate green; CHANGELOG line (no consumer action).

## Task 3: The rejection discriminator (both events, four values plus witness)

**Files:** `src/lib/sveltekit/guard.ts` (the `reason: 'csrf'` record at `:145`),
`src/lib/sveltekit/admin-action.ts` (`admin.action.csrf_rejected` at `:163-173`),
`src/lib/sveltekit/csrf.ts`, the five further `validateCsrfHeader` call sites
(`content-routes-dictionary.ts:95`, `content-routes-tidy.ts:111`,
`content-routes-media.ts:494`, `:1065`, `:1265`), unit tests,
`docs/reference/log-events.md` (both rows). `src/lib/auth/crypto.ts` is NOT touched:
discriminating in the callers is a CONSTRAINT, not a preference (`tokensMatch`'s
constant-time and length-secrecy properties stay intact; emptiness and presence are
decidable before the compare).

**Why:** three distinct incidents currently collapse into one undifferentiated record: the
guard tries the header witness then the form field (`guard.ts:140-144`), the media path posts
header-only with no `csrf` field (so a stale header token today reads as a missing field),
and `csrf.ts:64-69`'s catch swallows an unparseable body.

- [ ] FAIL-OPEN GUARD, the review's top finding: the discriminating variant is a NEW,
      differently named function (`csrfHeaderVerdict` / `csrfTokenVerdict`) returning a
      result object; `validateCsrfHeader`/`validateCsrfToken` STAY boolean wrappers, because
      six existing call sites negate the return (`!validateCsrfHeader(...)`), and a widened
      object return would make every one truthy and silently disable the check.
      Falsifiability: break the header check once, prove one media test reds, restore.
- [ ] Both records gain `detail: 'no-cookie' | 'no-witness' | 'mismatch' |
      'unparseable-body'` and `witness: 'header' | 'field'` (which path produced the
      verdict), plus presence-only `hasSession: boolean` on the guard record (it fires
      before session resolution; never a session id or email there).
- [ ] Precedence rule, stated so `unparseable-body` cannot become the routine value: when a
      header witness was PRESENT, its verdict wins (a stale header on a raw-body endpoint
      reads `mismatch`/`witness: header`, never the field path's failure); the field path's
      verdict applies only when no header was sent. Absent-vs-empty field discriminates via
      `form.has('csrf')` (`String(form.get('csrf') ?? '')` collapses them today).
- [ ] Log-only constraints, enforced by review: no token material, prefix, OR length is ever
      logged; the HTTP response is unchanged (no discriminated body or header; the guard
      must not become an oracle).
- [ ] Tests: one per detail value per event where reachable (the media header-only stale
      token must read `mismatch`/`witness: header`, not `no-witness`); falsifiability per
      the standing rule.
- [ ] `docs/reference/log-events.md:39` and `:68` document the new fields; the logger is
      internal, so no surface change, but the event fields are the public-observable
      contract.
- [ ] Acceptance: full gate green; CHANGELOG line (`Consumers must: nothing`; note the new
      log fields for operators).

## Task 4: Ledger and record hygiene

**Files:** `docs/internal/engine-rulings.md`, `docs/internal/docs-friction-log.md`.

- [ ] File the login-CSRF finding as its own ledger entry: the magic-link confirm has no
      same-browser binding (`confirmLoad`/`confirmAction` accept any token; an
      attacker-supplied link logs the victim into the attacker's account); the newer
      `createAuthChannel` seam already carries the `pendingCookie` nonce
      (`auth-channel/factory.ts:644-650, 859`). Ruled (Geoff 2026-08-27): file, not fix.
      `Reopens on: the conventions pass's auth-family reshapes`, where the nonce adoption
      belongs.
- [ ] The friction-log CSRF entry updates to present tense: which mechanisms this pass
      closed (Strict withholding, lifetime mismatch, secure derivation, empty-token
      fallback), that the discriminator now makes any residue diagnosable, the
      once-per-browser recurrence note, and the WATCH posture: the entry leaves the log when
      a post-deploy consumer incident either stops recurring or produces a discriminated
      record that names a new mechanism.
- [ ] Acceptance: `check:docs` green; ledger formatting matches its own conventions.

---

## Pass-end notes

The review gate MUST include `web-auth-security-reviewer` over the final diff (this pass is
auth code end to end). No admin visual work, so no visual read; the live admin smoke runs
(the guard changed) with one addition: verify a minted session plus a stale CSRF cookie
produces a `mismatch` record in the dev log. Docs: reference rows and the smoke doc are
in-task; STATUS/HISTORY at close per the ritual. No version bump; the window holds.

---

## Post-mortem (pass closed 2026-08-30)

**What was built.** All four tasks landed via the workflow chain (14 agents, ~1.5M tokens),
each accepted by its Opus diff review with independent gate runs and falsifiability probes:
T1 cookie attributes (`90c6f770`, `e93406c1`), T2 failure paths (`ffbd7b72`, `2a9ca08b`),
T3 discriminator (`ef39929b`), T4 ledger (`b2a92ca8`, `ff7bced0`). The pass-end ritual added
the simplifier comment fix (`9790d6d4`), docs refresh (`242fdcac`), and two security fix
rounds (`9146217e`, `1bec6e23`).

**The pass-end security review caught a blocking defect the four per-task reviews could
not see:** `csrfSecure` as first shipped let a non-https `PUBLIC_ORIGIN` (including a
leftover dev `http://localhost:8788`, which `requireOrigin` tolerates) strip `__Host-` and
`Secure` from the cookie on a production https deploy, converting the double-submit check
into a sibling-subdomain CSRF bypass under Lax. Fixed monotonic in `9146217e`: an https
request always mints Secure; `PUBLIC_ORIGIN` can only raise, never lower. Pinned red-first.

**Deliberate deviation from the plan, ruled by the conductor:** the CSRF token now ROTATES
once inside `confirmAction` after `createSession` succeeds, though the plan said "NO
rotate-on-confirm". The plan's constraint targeted rotation that invalidates authenticated
tabs; the security review showed the no-rotation posture made the token permanent per
browser (re-anchor plus login survival), a worse property. The re-review verified every
failure path returns before the rotation (garbage tokens cannot churn a victim's cookie)
and identified the one honest cost: an already-signed-in browser confirming a fresh magic
link invalidates another tab's rendered form for one self-healing 403 (`mismatch`/
`witness: field`). The claim is stated honestly in the code comment and security-model.md.

**Also shipped beyond the plan, from review findings:** logout deletes pass their setter's
`secure` flag (the delete was silently discarded over http on 127.0.0.1); `platform` is
required-but-nullable on the CSRF helpers (omission is now a compile error; five call
sites literalized); `CookieJar.delete` widened to accept `secure` (public surface, snapshot
regenerated, changelog line, verified non-breaking under bivariance); four false doc claims
corrected including the inverted Lax/Cache-Control changelog sentence.

**Verification.** Full CI-derived local gate list green (5874 tests at close). Live admin
smoke against the worktree-resolved showcase on a real Worker: anon 200/303, authed 200,
minted cookie shows `SameSite=Lax; Max-Age=2592000` bare-named over local http per the
monotonic rule, `Cache-Control: private, no-store` on admin HTML, and the plan's smoke
addition proven live: a stale-cookie POST 403s and logs `guard.rejected` with
`detail: 'mismatch'`, `witness: 'field'`, `hasSession: true`, no token material.

**Carried forward (conventions pass, auth family):** session-cookie derivation off
`url.protocol` (ledger, reopen trigger restated as the weaker-half class);
`check-probe.ts:49`'s independent derivation, the one remaining sibling of the closed
class; the cookie-jar posture split (friction log); the login-CSRF same-browser binding
(ledger, `_pending` nonce pattern; the rotating CSRF cookie is a candidate carrier).
Known residual, filed in the WATCH entry: concurrent cookie-less first loads double-mint
and one tab 403s as `mismatch`/`witness: field`.

**Budget.** Chain spend ~1.5M of the 1.8M ceiling; the ritual (simplifier, mandated
security review, two fix rounds, re-review, smoke) ran the pass to roughly 2.1M, a ~17%
overrun accepted by the conductor to land a blocking security fix rather than hold the
pass open. Human interaction points this pass: zero questions; one standing authorization
("continue through the CSRF hardening pass") consumed.
