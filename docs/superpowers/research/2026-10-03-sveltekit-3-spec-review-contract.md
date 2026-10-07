# SvelteKit 3 spec review: contract and criteria lens (2026-10-03)

Target: `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` at `d5c2ca98`. Lens: is every
promise testable, does each acceptance condition name its fixture and the reason it would fail, can any
criterion pass vacuously, and which promises does the plan need that the spec leaves unstated. Pass
class `auth-data`. The settled decisions are taken as given. Evidence was read from the Kit 3.0.0 and
adapter-cloudflare 8.0.0 tarballs (`~/.cache/kit3-research/`) and the repo at HEAD.

Counts: 0 blocker, 9 major, 5 minor, 2 over-ceremony. One OWNER FORK (C7).

## Correctness gaps, ranked by consequence

### C1 (major): S2 can't end green, because Kit's check turns on before the Referrer-Policy fix lands

- **Location:** spec:161-167 (S2 and S3), :87-97.
- **Defect:** `csrf.checkOrigin` is a build error in Kit 3 (survey:28), so S2's bump has to delete
  `checkOrigin: false`. Kit's check then runs in `vite preview`, and that build has
  `__SVELTEKIT_DEV__` false (`respond.js:98`). The admin still serves `no-referrer` until S3, so every
  admin form POST arrives with `Origin: null` and gets a 403. The showcase e2e (`workers: 1`, under
  preview) goes red at S2's end. That breaks the "each segment ends on a green commit" contract at
  spec:152.
- **Fold:** state the interim. S2 sets `csrf: { trustedOrigins: ['*'] }`, which Kit compiles to
  `CSRF_CHECK_ORIGIN = false` (`exports/vite/index.js:495`), and S3 deletes it. S3's acceptance adds a
  grep-zero for `trustedOrigins` across the showcase, Waymark, and the scaffold. The cross-origin
  refusal case in C5 is what makes that grep non-vacuous: the case fails if the interim survives. The
  other option is to move the Referrer-Policy swap into S2. That would run the security read's subject
  ahead of the security read, so the interim is the better fold.

### C2 (major): prerender throws on any `env` read, and S0 doesn't test a prerendered route

- **Location:** spec:41-46, :66-68, :154-158.
- **Defect:** the adapter's dev and preview stub sets its proxy only in `configureServer` and
  `configurePreviewServer`. During `vite build` prerender the proxy is undefined, and every trap on
  `env` throws `Cannot access cloudflare:workers in a prerenderable route`
  (`cf/src/virtual-cloudflare-workers.js:18-20`). The showcase prerenders its public routes, and
  `hooks.server.ts` runs cairn's guard on them. Today those reads see adapter 7's build-time platform
  proxy (`svelte.config.js:7-9`, the `remoteBindings: false` comment), or `undefined`. Once they go
  through `cairnEnv(event)`, any property read during prerender throws and the build fails. S0's go
  rule checks only resolution, so the spike can pass while the showcase build fails at S2.
- **Fold:** S0 adds a prerendered route that runs the cairn handle and reaches one binding read. The
  accessor's contract states its prerender behavior, for example "returns the override or an empty
  bindings object while building, and never touches `env`". A unit test covers that behavior. The S0
  stop rule gains one clause: "a prerendered route through cairn's handle fails the build without site
  config".

### C3 (major): the debt-free promise has no test, and it already misses `kit.alias`

- **Location:** spec:15-18 (the settled rule; the gap is its verification), :136, :144-145, :196.
- **Defect:** `kit.alias` is `@deprecated` in Kit 3 (`exports/vite/public.d.ts:28-35`). The build warns
  `config_option_deprecated_alias` and points at subpath imports. The showcase and Waymark both declare
  the `$chassis` and `$theme` aliases (`svelte.config.js:16-21`), which reach every chassis and theme
  import and the starting chassis every theme port receives. The spec moves `$lib` only. `#lib` also
  resolves only through a package.json `imports` field (`utils/imports.js:37-48`, the
  `write_tsconfig` test app), and neither spec:136 nor spec:196 says so.
- **Fold:**
  - Add the alias migration to S1 or S2: `$chassis` and `$theme` become `#chassis` and `#theme` via
    package.json `imports`. The migration covers the showcase, Waymark, and the scaffold.
  - Make the debt-free rule testable. Each of the three builds emits zero Kit `config_option_deprecated*`
    warnings, checked by a grep over the build output. Add a grep-zero over `src/lib`, the templates, and
    the dev package for `$app/environment`, `invalidateAll`, `json(` and `text(` from `@sveltejs/kit`,
    `event.platform`, and `$lib`.
  - The Consumers must line becomes "add `\"imports\": { \"#lib\": \"./src/lib\", \"#lib/*\":
    \"./src/lib/*\" }` to package.json, and replace `$lib` with `#lib`", plus the same move for any
    custom `alias`.

### C4 (major): S0's fixture and go/stop rule are under-specified, so the spike can pass vacuously or stop falsely

- **Location:** spec:154-158.
- **Defect:**
  1. Cairn at HEAD imports nothing from `cloudflare:workers`, so a packed cairn tarball proves nothing
     unless a probe import is added first. If the spike uses a stand-in package instead, the result
     depends on whether that package carries cairn's externalization signals. Cairn has the `svelte`
     export condition and a `svelte` peer, and vite-plugin-svelte keys `ssr.noExternal` on those. A
     stand-in without them gives a false stop, and one with them proves only that the stand-in works.
  2. The rule names one stop condition, "needs site config". It says nothing about one mode failing
     while the others pass. The likely case is `vite preview` failing (spec:46 calls it unproven). The
     showcase's whole e2e harness runs under preview (`playwright.config.ts` `webServer`), so that
     failure moves every spec to `wrangler dev`. It's a scope change, not a pass.
  3. "Resolves" is weaker than "returns the binding inside a request". The dev stub can resolve and
     still return `undefined` when the read runs outside the AsyncLocalStorage scope or the proxy.
- **Fold:** pin the fixture and the rule.
  - The fixture is a scratch-branch build of cairn itself. The probe import sits in a module reached
    from `@glw907/cairn-cms/sveltekit`, the subpath `hooks.server.ts` imports. The tarball comes from
    `npm pack` and installs by `.tgz` path into a directory outside the repo, so nothing hoists from the
    repo's `node_modules`. No `file:` directory and no `npm link` (see the stale-pack trap in
    durable-gotchas).
  - The assertion is a request to a route whose response body echoes one binding value under each of
    the four modes, plus the prerender case from C2.
  - The rule: `vite build`, `wrangler dev`, or prerender failing without site config stops the pass as
    an architectural fork. `vite preview` failing alone stops the pass and re-plans the e2e harness.
    `vite dev` failing alone is recorded as a gotcha and the pass goes on, because the dev package
    covers dev.

### C5 (major): the S3 e2e names neither its fixtures nor what makes each case fail

- **Location:** spec:164-167.
- **Defect:** each of the three cases can pass vacuously.
  - **Cross-origin refused.** Playwright's `APIRequestContext` sends no Origin, so it gets a 403 under
    any config and proves nothing about a browser. Aimed at an admin action, the case passes on guard
    Rule 3's token refusal even with Kit's check off. The interim from C1 would also pass unnoticed
    unless the assertion names Kit's response.
  - **Admin form POST passes.** If the case uses a JSON or raw-body transport, Kit's check never
    applies, because those aren't form content types (`utils/http.js:73-83`). The mutation proof then
    can't fail.
  - **Non-admin POST.** No target is named.
- **Fold:**
  - **Cross-origin case.** Load a page at `http://127.0.0.1:$PORT` and submit a native form to a
    non-admin form action at `http://localhost:$PORT`. One preview server serves two origins, so the
    fixture needs no second server. Assert status 403 and Kit's body `Cross-site POST form submissions
    are forbidden`. Pair it with the same submission from `localhost`, which must pass. That pair proves
    the check is live, so the case can't pass under `vite dev` or with `trustedOrigins: ['*']`.
  - **Admin case.** A browser-submitted form action with a form content type, either JS-free or
    `use:enhance` (multipart, also checked). Name the action, for example Save on the edit page.
  - **Non-admin case.** Name the target: the members `createAuthChannel` request form that
    `members.spec.ts` already drives.
  - **Mutation proof.** Restoring `no-referrer` in `applySecurityHeaders` fails the admin case with
    Kit's 403. Record the red run's output as the evidence.

### C6 (major): the magic-link confirm POST, the one that locks every editor out, is in no fixture

- **Location:** spec:94-96, :164-167.
- **Defect:** the spec changes two header sites, `admin-response.ts:38` and the confirm page at
  `auth-routes.ts:293`. In the showcase e2e the dev package's owner-session bypass serves `/admin`, so
  "the login flow never runs at all" (`packages/cairn-cms-dev/src/handle.ts:132-135`). A regression on
  the confirm page's header, such as a missed edit or a later revert, passes every e2e and the mutation
  proof. It surfaces only at the live smoke, and C7 shows the smoke has no Kit 3 target.
- **Fold:** an integration test asserts `confirmLoad` sets `Referrer-Policy: strict-origin`, and a
  mutation that reverts it turns the test red. That's the cheap form. The browser behavior of
  `strict-origin` is already proven by C5's admin case, so a header assertion closes the gap without new
  e2e machinery. The live smoke stays the end-to-end proof.

### C7 (major, OWNER FORK): the live auth smoke has no Kit 3 target, and its procedure 403s under Kit's check

- **Location:** spec:175-178. Procedure: `docs/internal/admin-smoke-test.md`.
- **Defect:** the smoke doc targets ecnordic-ski and 907-life. Both stay on Kit 2, and the settled
  decisions rebuild them later. cairn.pub migrates after the cut. So no Kit 3 consumer exists at the
  close. The doc drives authed POSTs with curl and a hand-inserted session cookie. curl sends no
  Origin, so every form-encoded POST gets Kit's 403 once `checkOrigin: false` is gone. The smoke fails
  for a reason unrelated to the change, or someone works around it ad hoc.
- **Fold:** pick the target, then update the smoke doc's POST steps to send `Origin:` matching the
  Worker URL. The update also proves C10's point.
  - **A (recommended).** The showcase under `wrangler dev`, with a local D1 migrated and seeded and the
    dev backend off. Geoff clicks a magic link that the `logging` or capture transport prints. Cheap,
    with no deploy. The cost is http, not https, so `__Host-` and the Secure branch stay unexercised.
  - **B.** A throwaway `workers.dev` deploy of the showcase with a real D1 and email. This exercises
    https and the real Origin path but adds provisioning and teardown.
  - **C.** Defer the live smoke to cairn.pub's migration pass. Then nothing proves the engine live
    before the 2a release.

### C8 (major): the goal and "proves the consumer build from scratch" have no fixture, and the existing consumer gate is a `file:` link

- **Location:** spec:10-11, :176.
- **Defect:** "a fresh `sv create` project installs cairn" has no pass condition. `check:consumers`
  runs the showcase's `svelte-check` over `file:../..`, the vacuous path this lens is meant to catch,
  and no tarball-based consumer script exists. The real failure modes go unmeasured:
  - an ERESOLVE on the new peer floors;
  - a type conflict between `wrangler types`' generated `cloudflare:workers` declarations and the
    `@cloudflare/workers-types` ^5 peer, whenever cairn's dist `.d.ts` references the module;
  - externalization, as in C4.
- **Fold:** keep S0's harness as a committed lab script, and run it at the close against the final
  tarball. One fixture serves both uses, which saves building a second one. Pass conditions:
  - `npx sv create`, the current release, minimal TypeScript template;
  - `npm install <tgz>` exits 0 with no `--legacy-peer-deps` or `--force`;
  - the documented wiring is applied and `wrangler types` is run;
  - `svelte-check` reports 0 errors and 0 warnings;
  - `vite build` exits 0;
  - `wrangler dev` answers `GET /admin/login` with 200.

### C9 (major): Consumers must omits the new admin lockout from a site-wide `no-referrer`

- **Location:** spec:105-106, :191-198.
- **Defect:** before this pass, a site-wide `no-referrer` broke only non-admin forms. The admin, and
  sign-in with it, survived on the token. After the pass, Kit's check covers `/admin`. A site whose
  hooks set its own `Referrer-Policy` after `resolve`, overriding cairn's header, gets a 403 on every
  admin form, including the magic-link confirm. Every editor is locked out. The reworded condition
  catches this only when someone runs the doctor or audit. The list a migrating site reads doesn't
  mention it.
- **Fold:** add a Consumers must line: "If your hooks set `Referrer-Policy` site-wide, serve
  `strict-origin-when-cross-origin`, `strict-origin`, or `same-origin`. Under `no-referrer`, Kit now
  refuses every admin form, sign-in included." File a facts bullet for the same behavior.

## Minor

### C10 (minor): Kit 3's check refuses requests that `checkOrigin: false` used to let through, and the docs need the facts

- **Location:** spec:194.
- **Defect:** deleting the opt-out exposes two site-side behaviors.
  - A form-encoded or bodyless POST with no Origin now gets a 403, for example a server webhook such as
    Twilio or Mailgun posting `application/x-www-form-urlencoded`. Kit refuses a missing Origin before
    it consults `trustedOrigins`, so the only escape is `['*']`.
  - A site with a `custom_domain` route under `wrangler dev` sees `event.url` as the production https
    origin (the smoke doc's own warning), so every local form POST mismatches and gets a 403.
- **Fold:** file both as facts bullets for the 2a extend arm. Add one Consumers must line: "endpoints
  receiving form-encoded or bodyless server-to-server POSTs must accept JSON instead".

### C11 (minor): existing showcase e2e helpers POST with no body and no Origin

- **Location:** spec:164-167, unstated.
- **Defect:** `members.spec.ts:26` (`request.post('/test/reset-members')`) and `:177`
  (`page.request.post('/test/revoke-member-session')`) send no Content-Type and no Origin. Kit 3
  refuses an absent content type (`csrf.js` `is_csrf_forbidden`), so both helpers break when the opt-out
  goes.
- **Fold:** S2 or S3 names them. Send `data: {}` (JSON), or set an Origin header. The acceptance
  criterion is that the whole existing e2e suite runs green under the final config, not only the three
  new cases.

### C12 (minor): the `CairnPlatformBindings` re-expression is promised as a docs illustration, not a check

- **Location:** spec:77-79.
- **Defect:** "The reference page shows that check" names no test. If a `wrangler.jsonc` binding
  changes, or the type drifts, nothing fails.
- **Fold:** add a type-level test (`expectTypeOf` or a `satisfies` line under `npm run check`)
  asserting the showcase's committed `wrangler types` `Env` satisfies `CairnPlatformBindings`. The
  reference page's snippet can come from that test.

### C13 (minor): the dev-flag tripwire narrows, and its replacement proof is unstated

- **Location:** spec:81-83.
- **Defect:** retiring the `process.env` leg touches `factory.ts:126`, `guard.ts`, and
  `guard-tripwire-process-env.test.ts`. The spec states no criterion that the deployed-host 503 still
  fires with the flag in `env`. The playwright `webServer` sets `CAIRN_DEV_BACKEND` through
  `process.env`, and showcase site code reads it there (`src/chassis/dev-gate.ts`,
  `src/members/dev-wiring.ts`). The spec doesn't say where the flag lives for preview. `.dev.vars` is
  safe. `wrangler.jsonc` `vars` would ship it to production.
- **Fold:**
  - The tripwire tests are rewritten, not deleted. Flag in `env` plus a deployed host gives a 503.
  - The flag's preview source is named as `.dev.vars` or an env-only path, never `vars`.
  - Optionally, the accessor honors the `locals` override only when the flag is live. Then the existing
    tripwire also covers a leaked override. Put this to the S3 security read.

### C14 (minor): S2's "one atomic task" has no mechanical done-condition

- **Location:** spec:161-163.
- **Defect:** the 62-read sweep has no completeness check, so a missed read fails only at runtime on
  the path that has it.
- **Fold:** grep-zero for `\.platform\b` and `App.Platform` across `src/lib`, the dev package, the
  showcase, Waymark, and the scaffold. Combine it with C3's grep set into one acceptance line.

## Over-ceremony, ranked by cost

### O1 (low cost, worth trimming): two of S0's three proofs need no fresh consumer project

- **Location:** spec:157.
- **Defect:** "a vitest alias fakes it" is a property of cairn's own vitest config. A fresh consumer
  project is the wrong fixture for it, and S2's unit suite proves it anyway. "A `locals` override reaches
  it" is plain object passing through cairn's own accessor, which doesn't exist at spike time.
- **Fold:** cut both from S0, and make them S2 acceptance (the unit suite runs green on the alias, plus
  one accessor unit test for override precedence). S0 keeps the questions only it can answer, those in
  C4 and C2.

### O2 (low cost): building a throwaway spike and a separate close-time consumer proof

- **Location:** spec:154, :176.
- **Defect:** two fixtures answer the same question at two times.
- **Fold:** keep one (C8).

No other ceremony finding. The pre-dispatch security read (spec:116-119) is justified, because it gates
a design change on the auth path rather than reviewing a diff.
