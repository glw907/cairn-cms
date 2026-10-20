# SvelteKit 3 upgrade spec: risk-lens review (2026-10-03)

Target: `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` at `d5c2ca98`. Lens: data
integrity, security, and failure risk. Every claim below was read from the repo at HEAD or from the
published tarballs at `~/.cache/kit3-research/{kit,cf}/package`. Settled decisions (debt-free, `^3`
only, the three opportunities, release, consumers, 2a sequencing) are not re-argued.

Counts: 1 blocker, 5 major, 6 minor, 2 over-ceremony. No owner fork. Every fold is a method call.

## Correctness and security gaps, by consequence

### R1 (blocker): the guard reads `env` on every request, and adapter 8 throws on any `env` access during prerender

Location: spec:64-68 (accessor design), spec:154-158 (S0 scope); `src/lib/sveltekit/guard.ts:195`.

Evidence. The adapter's dev stub (`cf/package/src/virtual-cloudflare-workers.js:6,14-26`) captures
`globalThis.__sveltekit_cloudflare_platform` at load. Every trap (`get`, `has`, `ownKeys`) throws
`Cannot access cloudflare:workers in a prerenderable route` when that global is unset. The plugin sets it
only in `configureServer` and `configurePreviewServer` (`cf/package/index.js:224-245`). Adapter 8 has no
`emulate()`, so Kit's prerender (`kit/package/src/core/postbuild/prerender.js:176`) gets no platform.
`replace_stub` rewrites the stub only in the adapter's output directory, after prerender.

The guard's first statement reads the dev-backend flag off the env on every request, before the admin
branch (`guard.ts:195`). `createAuthGuard` is the site's `handle`, and `handle` runs for prerendered
requests. The showcase prerenders every `(site)` route (`examples/showcase/src/routes/(site)/+page.server.ts:7`,
`[...path]/+page.server.ts:6`, `archive/[page]/+page.server.ts:6`, `[...path=md]/+server.ts:10`). cairn.pub
prerenders its docs. Once that read goes through `cairnEnv(event)`, `vite build` fails for the showcase and
for every adopter that prerenders. S0's fresh project has no prerendered route behind the guard, so the
spike can't catch it.

Fold. Add to S0: "a prerendered route behind `createAuthGuard` builds." Specify in the Bindings section
that no engine code touches `env` while `building` (`$app/env`, exported at
`kit/package/src/runtime/app/env/index.js:1`). The guard's flag tripwire is skipped when `building` is
true, since a prerender never serves a deployed request. The accessor itself throws a named cairn error if
it is called while `building`, so a future read on a prerender path fails with a clear message instead of
the adapter's.

### R2 (major): `originMatches` has a second, security-bearing caller the spec deletes out from under it

Location: spec:98-100; `src/lib/auth-channel/factory.ts:13,72-75`.

Evidence. `assertOriginAndScheme`, step 1 of every `createAuthChannel` action, calls `originMatches` and
throws 403 on a mismatch. Its doc calls the check "unconditional". `createAuthChannel` mounts on non-admin
routes (the showcase's `/members/login`), so the guard's admin token never covers it. The spec deletes
`originMatches` unconditionally but hedges only on `isUnsafeFormRequest`. That hedge is moot, because
guard Rule 1 still calls `isUnsafeFormRequest` (`guard.ts:257`). An implementer who hits the compile error
can either drop the factory's check or improvise. Dropping it loses origin enforcement on the member login
in `vite dev`, where Kit skips its check. It also loses it in production for any site whose
`trustedOrigins` widens Kit's check (see R6).

Fold. The spec names the factory caller and rules that the factory keeps its origin compare as a
module-local function. A library factory that a site can mount on any route shouldn't depend on site
config for its CSRF floor. That makes it the factory's own contract, not a rebuild of Kit's check.
Reword the deletion bullet: "`originMatches` moves into `auth-channel/factory.ts`; `isUnsafeFormRequest`
stays (Rule 1)."

### R3 (major): the `event.locals` binding override is a hand-built mechanism the platform already provides, and it never reaches site code

Location: spec:70-75; `packages/cairn-cms-dev/src/handle.ts:118-147`;
`examples/showcase/src/members/dev-wiring.ts:42-52`; `examples/showcase/src/routes/admin/signups/+page.server.ts:32`;
`examples/showcase/src/routes/test/{last-otp,reset-members,revoke-member-session}/+server.ts`.

Evidence, three parts.

1. **It misses site code.** Today the dev doubles ride `event.platform.env`, which engine and site code
   both read. The handle supplies `APP_DB` as "the developer-binding example" (handle.ts:125-128) for a
   custom admin screen that reads its own binding. Under the spec, the doubles reach only engine reads
   through `cairnEnv`. A site route that does what Kit's guide says, `import { env } from
   'cloudflare:workers'`, gets the real env, so it sees no `APP_DB` and no `MEMBER_DB`. It also misses the
   `CAIRN_DEV_BACKEND: '1'` stamp that `membersDevHandle` writes and that the `/test/*` harness routes gate
   on. The showcase's member e2e and the developer-binding story break in dev.
2. **The platform already ships the mechanism.** `cloudflare:workers` exports `withEnv(newEnv, fn)`. The
   dev stub implements it over the same AsyncLocalStorage that backs `env`
   (`virtual-cloudflare-workers.js:4-9,97-102`). It is typed in the stable `@cloudflare/workers-types`
   (`node_modules/@cloudflare/workers-types/index.d.ts:16133`), not only the experimental types. A dev
   handle that returns `withEnv({ ...env, AUTH_DB: fake, ... }, () => resolve(event))` reaches every
   reader, engine and site alike. The stub's `ownKeys` trap makes the spread work. A cairn-owned override
   key is the "hand-built mechanism Kit 3 now provides" that the debt-free decision rules out.
3. **It is a production-reachable substitution seam.** A documented `locals` key that the engine layers
   over `env` is honored in every build, not only in dev. Request input can't set it, but any production
   handle can. The three-layer fence doesn't watch it: the guard's tripwire reads only the flag. If the
   flag read goes through the layered view, an override that carries the key with an `undefined` value
   masks the real flag. `locals.cairnBackend` is the same class of seam, but that precedent is no reason
   to add a second one.

Fold. Replace the override with `withEnv` in `devBackendHandle` and `membersDevHandle`. `cairnEnv(event)`
then reads `env` and nothing else. It may shrink to a direct import, which keeps the event parameter only
if a test seam needs it. Add to S0: "a value set through `withEnv` in a handle is visible to an engine read
and a site-route read, across `await` and a streamed load, under `vite dev` and `vite preview`." If S0
shows that `withEnv` context doesn't survive `resolve`, the override returns as the fallback. In that case
the flag tripwires must read the raw module `env`, never the layered view, and the spec states that.

### R4 (major): the S3 mutation proof is vacuous on the admin path, because the e2e build replaces the guard

Location: spec:164-167; `examples/showcase/playwright.config.ts:39`; `examples/showcase/src/hooks.server.ts:19-33`;
`packages/cairn-cms-dev/src/handle.ts:101-169`.

Evidence. The showcase e2e always sets `CAIRN_DEV_BACKEND=1`, so the hook mounts `devBackendHandle` *in
place of* `createAuthGuard`. `applySecurityHeaders` runs from only two places, the guard's resolve path
(`guard.ts:371`) and the branded condition pages (`admin-response.ts:67`). The dev handle never calls it.
Admin pages in the e2e build therefore carry no `Referrer-Policy` at all, and the browser default sends a
real Origin. Restoring `no-referrer` at `admin-response.ts:38` would leave the e2e green. Only
`confirmLoad`'s own `setHeaders` (`auth-routes.ts:293`) reaches the browser in that build, and only if a
spec actually POSTs the confirm form.

Fold. S3 states which build runs the admin leg. Choice one: one e2e project built without the dev backend,
running the real guard over a local D1 that `wrangler d1 migrations apply --local` seeds (the
login-to-confirm-to-admin-POST round trip). Choice two: keep the dev build, add a unit assertion that
`applySecurityHeaders` sets `strict-origin`, and have the browser leg POST the confirm form, so the
`auth-routes.ts` header is under test. Choice two is cheaper but proves only the confirm page. Choice one
is the only proof that the guard-served admin path works with Kit's check on. Recommend choice one for the
mutation proof, since the change exists for that path.

### R5 (major): a site-wide `no-referrer` now locks out admin sign-in, and the reworded condition still calls it a non-admin problem

Location: spec:105-106, spec:108-114; `src/lib/diagnostics/conditions.ts:189-196`;
`tool/internal/doctor/check_referrer.go:34,42`; `guard.ts:370-371`.

Evidence. Before the change, a site-wide `no-referrer` broke only non-admin forms, and `/admin` survived it
because its CSRF authority was the token. After the change, Kit's check also covers `/admin`, and it runs
ahead of `handle`. So any route by which `no-referrer` reaches an admin document makes the login POST, the
confirm POST, and every admin form arrive with `Origin: null`. Each gets Kit's plain-text 403, with no
branded page and no cairn log. Three reachable routes:

- The site's own handle runs after the guard on the way out (`sequence(siteHandle, createAuthGuard())`).
  The guard's `applySecurityHeaders` runs inside, and the outer handle's header set wins.
- `<meta name="referrer" content="no-referrer">` in `app.html`, which wraps every admin page. The doctor
  reads only `hooks.server.ts` and `static/_headers` (check_referrer.go:39).
- A zone Transform Rule that sets the header on every response.

The condition is `severity: 'warning'`, and its text says "cairn's own /admin responses already scope
no-referrer" (conditions.ts:193). The doctor's remedy says "no-referrer is safe only on a route protected
by a double-submit CSRF token (the way /admin is)" (check_referrer.go:34). Both become false.

Fold, leanest first.

1. The admin shell emits `<meta name="referrer" content="strict-origin">` in its `<svelte:head>`. A
   document meta updates the policy container that Origin serialization reads. Svelte head content lands
   at `%sveltekit.head%`, after `app.html`'s own metas, so the admin document's POSTs no longer depend on
   handle order, `app.html`, or zone rules. The header in `applySecurityHeaders` stays for the non-HTML
   responses.
2. Raise `config.no-referrer-blanket` to `blocker`. Reword it to say admin sign-in fails too. Fix the
   remedy strings in `conditions.ts` and `check_referrer.go`. Extend the doctor heuristic to read
   `src/app.html` for a referrer meta.
3. Add S3 e2e coverage. A site-wide `no-referrer` set from an outer handle must leave the admin login POST
   passing, which proves fold 1.

### R6 (major): `trustedOrigins: ['*']` silently disables Kit's check site-wide, and the spec deletes the one detector

Location: spec:97-99, spec:194; `kit/package/src/exports/vite/index.js:495`; `kit/package/src/runtime/server/respond.js:116`.

Evidence. Kit compiles `__SVELTEKIT_CSRF_CHECK_ORIGIN__ = !kit.csrf.trustedOrigins.includes('*')`, so a
`'*'` entry turns the check off for every route. The survey calls `['*']` "the typed replacement" for
`checkOrigin: false`, and that literal equivalent is what an adopter upgrading by search will write. With
the spec's deletions, such a site has no Origin check on any non-admin form in production. Rule 2,
`config.csrf-disable-missing`, and `check_csrf.go` are all gone, and the build succeeds silently. The
admin keeps its token for form-typed POSTs, and the member login keeps its own compare only if R2's fold
lands. Any non-`*` entry also widens the admin, because Kit's check is the admin's first Origin line now.

Fold. Repurpose `check_csrf.go` instead of deleting it. One doctor check reads the `sveltekit({ ... })`
`csrf` key. It fails on `'*'` and warns on any other entry, naming the admin exposure. Its condition
replaces `config.csrf-disable-missing` in `conditions.json` (the tool changelog already discloses that
contract break). Reword the Consumers-must line: "Delete the `csrf` block entirely. Don't replace it with
`trustedOrigins: ['*']`, which turns off SvelteKit's Origin check on every route."

## Minor

### R7 (minor): the cost statement understates scope, and the runbook route is missing

Location: spec:108-114. Cost 1 says only a *non-admin* cross-origin POST gets Kit's plain 403. After the
change, every admin form, the login and confirm POSTs included, fails the same opaque way whenever its
Origin is null or differs from `url.origin`. Causes: R5's routes, an extension or proxy that strips
Origin, and a proxy that rewrites Host. The branded `auth.csrf-token-invalid` page now fires only for
token failures. Cost 2 overstates the dev loss: sites that use `@glw907/cairn-cms-dev` never ran Rule 2 in
dev, because the dev handle replaces the guard (`hooks.server.ts:19-33`). Fold: restate cost 1 to cover
admin paths. Name the surviving diagnostic, Workers Logs invocation records (method, path, status 403).
Have `log-events.md` and the `is-it-working` runbook carry an anchor keyed on Kit's literal message,
`Cross-site POST form submissions are forbidden` (`respond.js:125`). The `guard.ts:213-218` comment
reasons that the https help page runs "before resolve() runs that check". Kit now runs its check before
`handle`, so reword that comment while the CSRF task is open.

### R8 (minor): waitUntil changes touch two public seams and leave a dead branch; tests, not dev, carry the masking risk

Location: spec:67-68; `factory.ts:151-178,229-239,843-897`; `audit-sink.ts:82-94,153`.

Evidence. The dev stub's `waitUntil` is a no-op (`virtual-cloudflare-workers.js:124`), but the promise
handed to it was already started, so in Node the background work still runs to completion. Dev doesn't
silently skip delivery, the sweep, or the audit insert. Don't add a dev shim. The real effects:

- The module's `waitUntil` is always defined, so the factory's inline-await branch and its
  `auth.channel.delivery_inline` log event become unreachable. Under the debt-free rule both retire, along
  with the `log-events.md` row.
- Unit tests that today pass no platform and get deterministic inline delivery will race once the vitest
  fake supplies `waitUntil`. A test that asserts `auth.channel.send_failed` and the refund can pass or fail
  on timing. The fake should collect promises and expose a flush that tests await.
- `DeliverContext.waitUntil` (public; its doc names `platform.ctx?.waitUntil`) and
  `createD1AuditSink(db, waitUntil)` are public surfaces whose documented call form,
  `event.platform.ctx.waitUntil.bind(...)`, stops existing. Rule each one: drop the `waitUntil` parameter
  from `createD1AuditSink`, since the engine can import it (breaking; add a Consumers-must line), or keep
  it and rewrite its contract. Either way, the reference pages change in this pass.

### R9 (minor): the logout redirect can use Kit's origin allowlist instead of `external: true`

Location: spec:132-133; `auth-routes.ts:474`. Kit 3's `redirect` accepts `{ external: [origins] }`
(`kit/package/src/exports/index.js:124`). Pass `{ external: [new URL(logoutUrl).origin] }` from the frozen
snapshot. The construction-time validation stays. The allowlist is defense in depth at zero cost and keeps
the redirect site self-evidently bounded.

### R10 (minor): stale test fixtures can pass vacuously after S2

Location: spec:83. Engine tests build events with `platform: { env: ... }` (for example,
`examples/showcase/src/routes/admin/signups/actions.test.ts:36,75`). After S2 the engine ignores
`event.platform`. A test that asserts the tripwire or the bindings condition fails loudly. A test that
asserts *admission* or *absence* keeps passing for the wrong reason. Fold: S2's gate adds a grep that no
test event literal carries `platform:`. A setup file resets the settable `cloudflare:workers` fake in
`beforeEach`, so module-global env doesn't leak between tests.

### R11 (minor): Consumers must is missing three site-code lines

Location: spec:191-198. Add these lines:

- A site handle that writes `event.platform` (the showcase's `membersDevHandle` pattern) moves to
  `withEnv` per R3.
- A site that passes `platform.ctx.waitUntil` to `createD1AuditSink` or a `deliver` follows R8's ruling.
- A site served behind a proxy whose request URL origin differs from the browser's sets `paths.origin`.
  `csrfSecure` explicitly supports TLS-terminated deploys (`csrf.ts:51-56`), and Kit's check would 403
  every admin POST there.

### R12 (minor): the `/preview` rationale is slightly wrong, with no regression

Location: spec:104. The preview page twin-renders the site layout, which can carry the site's own POST
forms (a newsletter or member form). Under `no-referrer` those POST with `Origin: null` and Kit rejects
them. Today Rule 2 rejects them the same way, so nothing regresses. Reword the bullet to: "keeps
no-referrer; a site form inside a preview render is refused, as it is today."

## Over-ceremony

### O1: three security reads of one section

spec:116-119 adds a pre-dispatch `web-auth-security-reviewer` read of the CSRF section. The spec already
goes through this adversarial round, and the close fans out the same reviewer again (spec:176-177). The
pre-dispatch read's two named questions are answered below under "Verified non-gaps". Count this lens as
that read once R2, R5, and R6 fold. Keep the close reviewer. That saves one Opus dispatch and one
serialization point before S3.

### O2: don't spend gate budget on the verified non-gaps

The items under "Verified non-gaps" need no test, shim, or guard. Adding one would be defensive code for
cases that can't happen.

## Verified non-gaps

These answer the lens questions with no fold needed.

- **Token Referer leak under `strict-origin`.** The confirm page's subresources, and its own POST, send
  only the bare origin. The 303 hop after the POST keeps the original request's referrer under the same
  policy, so it sends only the origin. A third-party hop reveals only the admin origin.
- **JSON and raw-body endpoints.** Kit skips them (`csrf.js:39`). They stay covered by the `X-Cairn-CSRF`
  header, which a cross-origin page can't set without a preflight (`csrf.ts:206-208`), as the spec says.
- **POST with no Content-Type.** Kit 3 now rejects it in production (`csrf.js:39`). Guard Rule 1's
  narrower `isUnsafeFormRequest` (`csrf.ts:87-91`) skips it in dev. All cairn cookies are `SameSite=Lax`
  (`auth-routes.ts:138,381`, `csrf.ts:127`, `factory.ts:818,1063`), so a cross-site request carries no
  session. No hole.
- **`application/x-sveltekit-formdata`.** Only remote-function forms send it
  (`kit/package/src/runtime/client/remote-functions/form.svelte.js:250,725`), and remote functions are out
  of scope.
- **PUT, PATCH, DELETE.** Kit's check covers them on the same content-type terms as POST (`csrf.js:3`).
- **GET with side effects.** The confirm GET consumes nothing (`auth-routes.ts:284-287`), and logout and
  preview minting are actions. The change doesn't touch GET handling.
- **Retiring the `process.env` flag reads.** On Cloudflare the deployed flag arrives through the env.
  `process.env` carried it only for adapter-node, which the charter excludes. The site's layer-one fence
  (`devBackendOptIn()` reading the shell flag at hook time) is site code and stays.
