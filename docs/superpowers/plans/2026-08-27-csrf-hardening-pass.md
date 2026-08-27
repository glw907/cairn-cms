# CSRF Hardening Pass (remediation initiative, slice 1)

> **For agentic workers:** four tasks, SERIAL (Tasks 1-3 all touch `src/lib/sveltekit/`
> and the log/reference surface; Task 4 is ledger/docs). Below six tasks: dispatch the
> `cairn-implementer` / `diff-reviewer` chain per task with the Agent tool; the full gate
> inside the chain. Steps use checkbox (`- [ ]`) syntax. No model upshift needed.

**Token ceiling (WHOLE pass, chains plus ritual): 900K.** **Checkpoint interval:** four
tasks. **Worktree:** `csrf-hardening` off `main` AFTER the harvest-detection merge (that
pass holds warm edits in `docs/extend/security-model.md`; do not branch before it lands).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(the hardening slice; its standing-constraints block applies to every task here).
**Evidence base:** the 2026-08-27 `web-auth-security-reviewer` verdict, inlined below where
load-bearing; the friction-log CSRF entry (docs/internal/docs-friction-log.md, 2026-08-27).

**Goal:** close the consumer CSRF-403 incident class as far as the evidence reaches, and make
any residue diagnosable from Workers Logs. The confirm-load re-mint under `SameSite=Strict`
is a CANDIDATE mechanism, not a confirmed diagnosis (a native mail client may send Strict
cookies on its navigation); the pass fixes every named mechanism and instrumentats the rest.
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
`src/tests/unit/doctor-check-probe.test.ts` (fixtures), `docs/reference/` (the page that
documents the auth cookies gains the CSRF cookie's attributes; locate via `grep -rn
cairn_csrf docs/reference/`).

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
      `maxAge: Math.floor(SESSION_TTL_MS / 1000)` so the pair lives and dies together. NO
      rotate-on-confirm (rotation would reintroduce the tab invalidation this pass fixes).
- [ ] `secure` derives from the configured origin (`requireOrigin(env)` /`PUBLIC_ORIGIN`),
      not `event.url.protocol`; the `isLocalHost` comment at `guard.ts:27-31` ("UX only ...
      never whether to grant access") is corrected, since the localhost branch decides the
      cookie name and Secure bit.
- [ ] `logoutAction` (`auth-routes.ts:221-235`) deletes the CSRF cookie alongside the
      session cookie (a persistent token must not survive logout).
- [ ] Docstrings corrected in the same change: `csrf.ts:29` (Strict claim) and `csrf.ts:27-29`
      (the "a second open admin tab reuses the same value" invariant, which the incident
      broke; restate it as what the pass now makes true).
- [ ] Tests: `csrf.test.ts:75` asserts `sameSite: 'lax'` EXPLICITLY (never delete the
      assertion) and the new `maxAge`; the logout test asserts both cookies deleted; the
      doctor-probe fixtures (`doctor-check-probe.test.ts:39,120`) stop lying about the
      attribute.
- [ ] Acceptance: full gate green; the reference page states the CSRF cookie's full
      attribute set; CHANGELOG entry with `Consumers must: nothing` plus the once-per-browser
      re-mint note.

## Task 2: The unreadable failure paths (empty-token fallback; cache posture)

**Files:** `src/lib/sveltekit/content-routes-core.ts` (the `:644` ternary),
`src/lib/sveltekit/admin-response.ts` (`applySecurityHeaders`), their tests,
`docs/internal/admin-smoke-test.md` (cookie-scheme wording).

- [ ] `content-routes-core.ts:644`'s `csrf: event.cookies ? issueCsrfToken(...) : ''`
      ternary is removed: `cookies` is required on `CairnEvent` (`types.ts:68`), so the
      false branch is unreachable from typed callers and, from an untyped caller, renders
      every form permanently 403 with no readable cause. Call `issueCsrfToken`
      unconditionally (or throw with a named condition if `cookies` is absent); a test pins
      the non-empty token in the shell payload.
- [ ] `applySecurityHeaders` gains `Cache-Control: no-store, private`: under Lax the cookie
      is re-set far less often, removing the accidental `Set-Cookie` cache suppressor on
      admin HTML that embeds the token and the editor's identity. Test asserts the header on
      an admin response.
- [ ] `docs/internal/admin-smoke-test.md:138-156`'s cookie-scheme description updates to the
      new attributes.
- [ ] Acceptance: full gate green; CHANGELOG line (no consumer action).

## Task 3: The rejection discriminator (both events, four values plus witness)

**Files:** `src/lib/sveltekit/guard.ts` (the `reason: 'csrf'` record at `:145`),
`src/lib/sveltekit/admin-action.ts` (`admin.action.csrf_rejected` at `:163-173`),
`src/lib/sveltekit/csrf.ts` (the validators return enough to discriminate),
`src/lib/auth/crypto.ts` ONLY if `tokensMatch` needs a distinguishable return (prefer
discriminating in the callers), unit tests, `docs/reference/log-events.md` (both rows).

**Why:** three distinct incidents currently collapse into one undifferentiated record: the
guard tries the header witness then the form field (`guard.ts:140-144`), the media path posts
header-only with no `csrf` field (so a stale header token today reads as a missing field),
and `csrf.ts:64-69`'s catch swallows an unparseable body.

- [ ] Both records gain `detail: 'no-cookie' | 'no-witness' | 'mismatch' |
      'unparseable-body'` and `witness: 'header' | 'field'` (which path produced the
      verdict), plus presence-only `hasSession: boolean` on the guard record (it fires
      before session resolution; never a session id or email there).
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
