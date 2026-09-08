# Identity Seam Pass Implementation Plan (the admin login on an organization's own identity)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential; every task touches
> the guard, the routes, or the docs that describe them). Steps use checkbox syntax for
> tracking. Runs on `.claude/worktrees/identity-seam` off `main`, in PARALLEL with chassis-B1
> (Geoff, 2026-09-07). Shared with chassis-B1: `CHANGELOG.md`, `ROADMAP.md`, `docs/STATUS.md`,
> `docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md`,
> `docs/internal/docs-friction-log.md`, and `docs/HISTORY.md`. **The whole-log friction triage
> belongs to chassis-B1 this window**; Task 7 here appends this pass's own findings and triages
> only those. The reconciliation is a rebase step in the pass-end ritual of whichever pass merges
> second, performed by the conductor after the first merge lands. REVISION 2, folded 2026-09-07
> from the four-lens plan review (record `docs/internal/record/2026-09-07-identity-seam/plan-review.md`,
> fold brief `plan-fold-brief.md`); implements spec revision 3. Anchors verified against `main`
> at `de2bf1cb`; re-verify at dispatch.

**Goal:** a site behind Cloudflare Access (or any gate) signs its editors into `/admin` with
the organization's own identity, cairn minting no session and the roster still assigning
owner or editor, through one optional guard option, with the Access verification taught as a
recipe and the front door able to say so honestly.

**Architecture:** one new option on `createAuthGuard`, `identity`, replacing exactly the
session-resolution piece of the guard's five; the guard publishes `locals.cairnIdentity` on
every admin path and the login, request, confirm, and logout handlers read only that; two
registered conditions carry the refusals; the doctor's login probe gains the arms that detect
a gate or an exposed origin; no engine dependency is added. The Scaffold-tier guard keeps its
tier (an optional option is additive, with its own tier note); the three new interfaces enter
as Unstable API.

**Tech stack:** SvelteKit 2, TypeScript, vitest (the node unit and workerd integration
projects; miniflare D1 for `AUTH_DB`), the repo's gate estate.

**Spec:** `docs/superpowers/specs/2026-09-07-identity-seam-design.md` (revision 3). Inputs:
`docs/internal/record/2026-09-07-identity-seam/`.

**Token ceiling:** 5.5M. About 3.6M for the seven tasks at chassis-A's observed 0.3M to 0.6M
per task with no image reads, about 1.0M reserved for the pass-end ritual (code-simplifier over
the whole diff, three reviewers with one fix round each, the named gates, the from-scratch
showcase install plus build plus e2e), the remainder slack. Task 5a is the one expected to
exceed 0.7M. Task 2 is one dispatch producing two commits and carries no mid-dispatch split.
**Checkpoint interval:** after Tasks 3 and 6, each writing STATUS (task ledger, decisions taken,
spend against the ceiling, next task); at 80% the conductor finishes the task, writes STATUS,
and asks one combined question. **Execution:** sequential in one worktree; the machine's
two-gate ceiling is shared with chassis-B1, so the conductor sequences launches. Open the PR
after Task 1's commit; no preview deploy runs off an intermediate commit (between Task 1 and
Task 3 the branch advertises identity mode with the magic-link surface still live, safe only
because no site configures `identity` on the branch). **Merge gate:** green CI plus the
`web-auth-security-reviewer`'s accept plus the docs gates (Geoff, 2026-09-07); Geoff reads the
extend page after.

## Ruled inputs (recorded; no task re-derives them)

- **The seam is generic and engine-owned; the Access verifier is a recipe** (spec decision 5,
  the `isuniqueviolation-cloudflare` precedent). No `jose` in `package.json`. `jose` is not a
  dependency, so `check:snippets` stubs it to `any` automatically (`check-snippets.mjs:60-76`);
  no declaration is needed and none is possible, and the recipe's verification logic is proven
  only by the security reviewer's read (a blocking Task 5a criterion).
- **No guard-side bootstrap** (spec decision 6). `AuthRoutesConfig.bootstrapOwner` is inert
  under identity mode (its only call site is the 404'd `requestAction`); the first owner is
  seeded out of band BEFORE `identity` is enabled, and the doctor's `auth.store` remedy names
  the seed and the ordering.
- **One configuration point, read through `locals`** (spec decision 7): `identity` on
  `createAuthGuard` only. The guard sets `locals.cairnIdentity = { label, logoutUrl }` on EVERY
  admin path when `identity` is configured, the public admin paths (`/admin/login`,
  `/admin/auth/**`; `isPublicAdminPath`, `guard.ts:25-27`) included, since the magic-link
  handlers live only on public paths. The assignment is made from the closed-over option
  alone, immediately after the bindings refusal (`guard.ts:126-133`) and BEFORE the CSRF stage
  (`:145`), so it sits OUTSIDE the `!isPublicAdminPath` block at `:175`. `identity.resolve` is
  called only on guarded paths, inside `:175-195`. The guard is the only writer of
  `locals.cairnIdentity`, and the value it publishes is the snapshot validated at construction;
  the ambient doc says so. No `identity` member on `CairnAdminConfig` or `AuthRoutesConfig`.
- **No CSRF change** (spec decision 8); the security model states the rotation residual with
  its shared-browser shape.
- **The resolver contract:** `resolve(event: CairnEvent) => Promise<ResolvedIdentity |
  IdentityRefusal>`, the structural event type every engine seam takes (the reference page
  states why this seam gets the full event: it must read request headers). The guard wraps
  `identity.resolve` in try/catch: a throw is a refusal rendering `auth.identity-unresolved`
  and logging `guard.rejected` with `reason: 'identity'` and `detail: 'error'` plus the thrown
  message capped at 300 characters (never a token), never a 500; a `ResolvedIdentity` whose
  `email` is not a string, or is empty after normalization, is a refusal rather than a roster
  lookup. The guard normalizes `email` (trim, lowercase) for the log record and the unrostered
  page; the lookup is normalized again inside `findEditor` (`src/lib/auth/store.ts:52-58`), the
  store's own invariant. The roster row's `displayName` wins; the resolver's is used only when
  the roster row's is empty, capped at the store's display-name bound. `label` is optional
  (default "your organization's sign-in").
- **`logoutUrl`:** a root-relative path matching `/^\/(?![\\/])/` after rejecting any value
  containing a backslash, a control character, or whitespace, or an absolute URL whose parsed
  `protocol` is exactly `https:`; anything else throws at `createAuthGuard` (the OWASP
  unvalidated-redirects rule). The routes redirect to the published snapshot, never re-reading
  `identity.logoutUrl` per request.
- **Condition ids:** `auth.identity-unresolved` and `auth.identity-unknown` (the
  `<area>.<subject>-<state>` shape; the unknown one reads across from its event
  `auth.identity.unknown`, as `auth.unknown-role` / `auth.role.unknown` does). Spec text that
  names any other id is superseded by this line. Both registered in
  `src/lib/diagnostics/conditions.ts` with `docsAnchor`s into `docs/admin/is-it-working.md`;
  both arms take their interpolations through `escapeHtml` (`src/lib/escape.ts:5`): the
  requester's normalized email on the unknown arm and the site-supplied `label` on both; the
  rendered and logged email is capped at 320 characters, the bound `auth.link.requested`
  already applies (`auth-routes.ts:159-162`).
- **Log vocabulary:** `guard.rejected` gains `reason: 'identity'` with `detail` carrying the
  refusal's `reason` and `conditionId`; new event `auth.identity.unknown` with `email`. Every
  `reason` value is snake_case (`events.ts:5-7`): `missing`, `invalid`, `audience`, `issuer`,
  `expired`, `no_email`, `keys`, `error`, or a site's own word. Level: `warn` for a
  request-shaped refusal (`missing`, `invalid`, `expired`, `no_email`), `error` for an operator
  fault (`audience`, `issuer`, `keys`, `error`), since those lock out the whole roster.
- **The public admin surface under identity.** `requestAction`, `confirmAction`, and
  `confirmLoad` all return 404, so `/admin/auth/**` serves nothing and the hand-off page at
  `/admin/login` is the only public admin surface. The 404 is raised before `requireDb`, before
  `request.formData()`, and before any cookie write. In identity mode `loginLoad` mints no
  pending-login nonce and issues no CSRF token; its return shape is a discriminated addition to
  `LoginData`, recorded by `check:surface` and the changelog.
- **Tiers:** `createAuthGuard` stays Scaffold API and the reference row carries a tier note
  (`identity` and its types are Unstable inside the frozen interface; the option may change
  shape or leave in any minor); `IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal` are
  Unstable API; `locals.cairnIdentity` is documented beside `locals.cairnEditor` on `./ambient`.
- **The two doors** (email sender, backend) ride in Task 5a bounded to one section each; the
  spec review recommended cutting them to a follow-up pass (adjacency, not dependency),
  Geoff's routing keeps them, and the one-section bound is the mitigation, recorded here so
  the pass-end sizing score reads it as a deliberate override.
- **Release:** the window holds; ONE cut after polish; this pass does not bump or publish.

## Global constraints

- No public export removed; `check:surface -- --update` regenerated and committed in the tasks
  that add surface (Tasks 1 and 3; Task 3 changes the exported `LoginData` shape at
  `auth-routes.ts:59-63` and `LoginPage`'s `data` prop, both snapshotted by `check:surface`);
  every other task leaves `check:surface` green without `--update`.
- The zero-config path is byte-identical: `src/tests/integration/auth-guard.test.ts` passes
  unmodified in every task.
- Prose in comments and docs: no em dashes, no ruling or pass citations in shipped comments or
  condition copy; TSDoc; every new exported symbol carries its one-line doc.
- Gate per task: `npm run check && npm test`, `check:reference`, `check:reference:signatures`,
  `check:surface`, `check:package`, `check:docs`, `check:readiness`, `check:symbols`,
  `check:comments`, `check:consumers`; from Task 5a on also `check:snippets`, `check:vale`, and
  `check:prose`. The six CI-only gates BY NAME at pass end plus `check:idioms` and
  `check:cm-internals`.

---

### Task 1: Declare the seam and thread it

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (the three interfaces beside `AuthGuardOptions` at
  `:33-63`; the `identity` option; `logoutUrl` validation in `createAuthGuard`'s construction;
  the `locals.cairnIdentity` write for every path `isAdminPath` matches, immediately after the
  bindings refusal at `:126-133` and before the CSRF stage at `:145`, so a public admin path
  carries the flag while resolving no identity; no branch behavior inside `:175-195` yet),
  `src/lib/sveltekit/index.ts` (the three types exported), `src/lib/ambient.ts` (`:37-46`, the
  `App.Locals` augmentation) AND `src/lib/sveltekit/types.ts` (`:84-89`, `CairnEvent['locals']`,
  which repeats the same members for the engine's structural events), both adding
  `cairnIdentity?: { label: string; logoutUrl: string }`, with `ambient.ts`'s header comment's
  member count updated and a `cairnIdentity` paragraph beside the `cairnAccess` one,
  `docs/reference/sveltekit.md` (`AuthGuardOptions.identity` on the `createAuthGuard` section
  carrying its own tier note; the three types in the Types table at Unstable; the resolver's
  `CairnEvent` parameter explained), `docs/reference/ambient.md` (`locals.cairnIdentity`; the
  guard is the only writer), `docs/reference/README.md` (`:56`, the `/ambient` description names
  the augmentation's members rather than one), `docs/internal/api-surface.md`
  (`check:surface -- --update`)
- Test: `src/tests/unit/auth-guard-identity-option.test.ts` (construction: accept `/goodbye`
  and `https://team.cloudflareaccess.com/cdn-cgi/access/logout`; reject `//evil.example`,
  `/\evil.example`, `/\/evil.example`, `\\evil.example`, `/%2f%2fevil.example`, `http://x/`,
  `javascript:alert(1)`, `data:text/html,x`, `/path\r\nX-Injected: 1`, and the empty string; a
  guard without `identity` sets no `locals.cairnIdentity`; an identity-mode request to
  `/admin/login` carries `locals.cairnIdentity` and calls `resolve` zero times)

**Interfaces:**
- Produces: `IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal` from `/sveltekit`;
  `AuthGuardOptions.identity`; `App.Locals.cairnIdentity` on both declarations.

- [ ] **Step 1:** write the failing tests; the interfaces, the option, the validation, the
  locals write, the two declarations; run the tests green; `auth-guard.test.ts` unmodified and
  green.
- [ ] **Step 2:** the reference rows; `check:surface -- --update`; full gate; commit. The
  conductor opens the PR.

**Acceptance criteria:** the three interfaces declared once and homed on `/sveltekit`; the two
`locals` declarations agree member for member; `check:surface` green with the regenerated
snapshot committed; `check:reference`, `check:reference:signatures`, and `check:package` green;
the `identity` member's tier stated where the reference row declares it; the zero-config guard
path byte-identical (`src/tests/integration/auth-guard.test.ts` passes unmodified); the
`logoutUrl` table tested both ways; the public-path locals test green.

### Task 2: The guard's identity branch, its conditions, and its log vocabulary (one dispatch, two commits)

**Files:**
- Modify (first commit): `src/lib/diagnostics/conditions.ts` (the two conditions per the ruled
  input), `src/lib/sveltekit/condition-response.ts` (widen `renderConditionResponse`'s `ctx` at
  `:40` from `{ url?: URL }` to `{ url?: URL; email?: string; label?: string }`; add
  `identity: 'auth.identity-unresolved'` to `REASON_CONDITION` at `:12-17` and NOT the unknown
  id, which is not a `guard.rejected` reason; export a sibling constant
  `IDENTITY_UNKNOWN_CONDITION = 'auth.identity-unknown' as const` with a one-line doc saying it
  is renderer-reachable but has no `guard.rejected` reason, used as the second switch case's
  label so the guard and the renderer share one spelling; two page modules beside
  `https-required-page.ts` and `csrf-required-page.ts`, the unknown one interpolating the
  normalized, 320-capped email through `escapeHtml` and both escaping the site-supplied label),
  `src/lib/log/events.ts` (the `identity` reason on `guard.rejected`; `auth.identity.unknown`),
  `docs/reference/log-events.md` (the reason and the new row; the guarantee sentence at
  `:105-108` amended to name `auth.identity.unknown` as the second exception to "every `email`
  belongs to an allow-listed editor"), `docs/admin/is-it-working.md` (the two anchor sections:
  what the page means and what to do)
- Modify (second commit): `src/lib/sveltekit/guard.ts` (inside the `!isPublicAdminPath` block at
  `:175-195`: under `identity`, call `resolve` in try/catch, normalize the email, look the
  roster row up with `findEditor(db, email)` (`src/lib/auth/store.ts:52-58`, returns `EditorRow`
  and normalizes itself), build the `Editor` through `resolveCapability` as today with the
  roster's `displayName` winning, set `locals.cairnEditor`/`cairnAccess`; the two refusal paths
  render their conditions and log at the ruled levels), `src/lib/github/repo.ts` (`:267`: the
  "never request input" sentence names the identity case)
- Test: `src/tests/integration/auth-guard-identity.test.ts` (workerd project, on the
  `src/tests/integration/auth-guard.test.ts` harness verbatim: `env.AUTH_DB` from
  `cloudflare:test`, its `asHandle` shim, `./_auth-harness.js`, and `_apply-migrations.ts`; a
  fixture resolver whose answer the test controls): resolved and rostered (both locals set,
  capability resolved through the roles option); resolved and unrostered (the condition page
  with the escaped email, `auth.identity.unknown` logged with `email` only); an email
  containing `<script>` renders escaped; each refusal reason (`missing`, `invalid`, a site's own
  word) renders `auth.identity-unresolved` and logs `guard.rejected` with `reason: 'identity'`,
  the reason in `detail`, and the ruled level; a resolver that throws renders the unresolved
  condition and logs `detail: 'error'`, never a 500; a resolver returning a non-string or empty
  `email` renders the unresolved condition and performs no roster query; a resolver asserting a
  `displayName` different from the roster row's yields the roster row's on
  `locals.cairnEditor`; live revocation after a roster `DELETE`; the email normalized before
  lookup (`" Owner@Example.org "` matches `owner@example.org`); `locals.cairnIdentity` present on
  every arm and on `/admin/login` and `/admin/auth/confirm` with no `resolve` call on either; a
  request carrying a valid pre-existing session cookie plus an identity refusal is refused, the
  guard calls `resolveSession` zero times on any path under `identity`, and pre-existing
  `session` rows are inert; `hasSession` untouched

**Interfaces:**
- Consumes: Task 1's types, option, and `locals.cairnIdentity` write.
- Produces: the two condition ids and `IDENTITY_UNKNOWN_CONDITION`; the log rows; the guard's
  identity branch.

- [ ] **Step 1 (first commit):** the conditions, the arms, the page modules, the events, the doc
  anchors; `check:readiness`, `check:symbols`, `check:docs` green; commit.
- [ ] **Step 2 (second commit):** the failing integration tests; the branch; green; the
  zero-config suite unmodified; full gate; commit.

**Acceptance criteria:** the two conditions registered as `auth.identity-unresolved` and
`auth.identity-unknown`, matching `conditions.ts`'s `<area>.<subject>-<state>` shape and reading
across from the event `auth.identity.unknown`; every integration case above green; no
CSRF-issuance change in the guard and `hasSession` not redefined; `check:readiness`,
`check:symbols`, and `check:docs` green; `auth-guard.test.ts` unmodified.

### Task 3: The magic-link surface under identity mode

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts` (`loginLoad` returns the hand-off shape when
  `locals.cairnIdentity` is set, minting no pending-login nonce and issuing no CSRF token, as a
  discriminated addition to `LoginData` at `:59-63`; `requestAction`, `confirmAction`, and
  `confirmLoad` (`:265-272`) return 404 in that mode, raised before `requireDb`, before
  `request.formData()`, and before any cookie write; `logoutAction` at `:404-433` skips the
  session delete, keeps the four cookie deletes at `:411-419`, keeps `requireDb`, and redirects
  to `locals.cairnIdentity.logoutUrl`; `bootstrapOwner` never fires under identity mode, stated
  in the handler's doc), `src/lib/components/LoginPage.svelte` (whose `data` prop `loginLoad`'s
  return feeds: the hand-off paragraph "This site signs in through <label>" with a link to
  `/admin`, no form, and a `data-cairn-identity` attribute on the paragraph; the copy through
  `check:prose`), `docs/reference/sveltekit.md` (the five handlers' identity behavior, one
  sentence each; `LoginData`'s discriminated shape), `docs/reference/components.md`
  (`LoginPage`'s prop if it lists the shape), `docs/reference/doctor.md` (one line naming
  `data-cairn-identity` as the signal the probe reads), `docs/internal/api-surface.md`
  (`check:surface -- --update`)
- Test: `src/tests/integration/auth-routes-identity.test.ts` (the hand-off page with its marker
  and no form, no nonce row and no CSRF cookie written; `POST /admin/login?/request` 404s and
  emits no `auth.token.minted` and no `auth.link.requested`, mounted through `createCairnAdmin`
  with no identity-aware admin config; `GET /admin/auth/confirm?token=x` 404s and sets no
  cookie; `confirmAction` 404s; the logout redirect's `Location` equal to `logoutUrl` and the
  cookie deletes present; the same five handlers unchanged without `cairnIdentity`)

**Interfaces:**
- Consumes: `locals.cairnIdentity` (Task 1's write).
- Produces: the `data-cairn-identity` attribute on the hand-off paragraph (exact spelling;
  Task 4's probe matches on it); the five identity-mode handler behaviors; `LoginData`'s
  discriminated shape.

- [ ] **Step 1:** the failing tests; the five handler branches and the page; green;
  `check:surface -- --update`; full gate; commit.

**Acceptance criteria:** the five cases green both ways; `requireDb` in place; the hand-off
page carries the marker and no form and writes nothing; the marker documented where the probe's
contract is documented; `check:prose` and `check:surface` green.

### Task 4: The doctor's login probe learns the gate

**Files:**
- Modify: `src/lib/doctor/check-probe.ts` (`probe()` at `:45-73`, the GET arm, fetched with
  `redirect: 'manual'` through `ctx.fetch`'s init (the global fetch otherwise follows the
  gate's 302 and the classifier never sees it), classifying: a 301/302/303/307 whose
  `Location` parses and whose `host` matches `/^[a-z0-9-]+\.cloudflareaccess\.com$/i` is PASS
  "gated by <host>"; a 401 or 403 is INFO "the origin refused this request, which is consistent
  with a gate but does not prove one", never PASS (`info()` exists at
  `src/lib/doctor/types.ts:53` and never gates); a 200 whose body carries `data-cairn-identity`,
  OR a 200 that carries no form posting the `?/request` action, is FAIL "the origin answers
  without the gate: `/admin` is reachable directly" (detail "the origin answered a page this
  probe does not recognize" when the marker is absent); a 200 with the magic-link form
  continues into `postRequestAction` at `:99-148` unchanged; a second arm reads `workers_dev`
  through `readWranglerConfig` (`src/lib/doctor/wrangler-config.ts`) and, when it is not
  `false`, probes `https://<name>.<subdomain>.workers.dev/admin` with the same manual redirect
  and classifies a 200 as FAIL "the Worker serves /admin on a hostname the Access application
  does not cover", a `workers_dev: false` config skipping the arm with that reason),
  `src/lib/doctor/checks-cloudflare.ts` (`:197`: `auth.store`'s remedy names the out-of-band
  seed and the ordering: seed the first owner BEFORE enabling `identity`),
  `docs/reference/doctor.md` (the probe's outcomes and the second arm; the remedy),
  `docs/admin/troubleshooting.md` if it walks the probe
- Test: `src/tests/unit/doctor-check-probe.test.ts` (stubbed fetch: the GET is issued with
  `redirect: 'manual'`, asserted by inspecting the init the stub received; the three GET
  outcomes plus the no-form 200; a `Location` of `https://evilcloudflareaccess.com/x` does NOT
  pass; the `workers.dev` arm's FAIL and its skip; the existing probe tests pass unmodified and
  the POST arm runs only after a 200 carrying the magic-link form)

**Interfaces:**
- Consumes: Task 3's `data-cairn-identity` marker.

- [ ] **Step 1:** the failing tests; the arms; green; full gate; commit.

**Acceptance criteria:** every outcome above tested; the magic-link outcome unchanged (the
existing probe tests pass unmodified and the POST arm runs only after a 200 carrying the
form); the remedy strings present; `check:docs` green.

### Task 5a: The extend page and the Access recipe

**Files:**
- Create: `docs/extend/sign-in-through-your-organization.md` per spec revision 3's extend-page
  section, in this order: the assumption stated first; the Access route for a Workspace and an
  Entra ID organization (the Access application scoped to `/admin` on the site's hostname, the
  IdP connection, the AUD tag, Cloudflare's own steps linked, no screenshots); the migration
  step on roster emails; the REQUIRED "which login methods are safe" section (spec revision 3's
  text); the operating instructions the spec lists (the two admission lists and their drift;
  the 50-user cap read as editors who authenticate through Access and what exceeding it costs;
  seed the first owner before enabling `identity`; no cache rule on `/admin`; the application's
  path coverage including `/admin/__data.json` and `/admin?/logout` and excluding
  `/preview/<token>`; CORS off; the rate limit as the ungated-origin remedy; the
  local-development warning: never branch inside `resolve`, a site's dev build replaces the
  guard behind its own build-time conditional as `examples/showcase/src/hooks.server.ts` does);
  the recipe as a fenced `ts` block (header-only; `issuer`, `audience`, `algorithms:
  ['RS256']` pinned; `payload.type === 'app'`; the non-empty-string `email` check; the team
  domain as a bare hostname validated at construction, the AUD tag not the application id; the
  per-class `reason` set `missing`, `invalid`, `audience`, `issuer`, `expired`, `no_email`,
  `keys` mapped from `jose`'s error classes with `keys` covering a JWKS fetch failure; no
  `clockTolerance`; `createRemoteJWKSet` once per resolver with explicit `timeoutDuration`,
  `cooldownDuration`, `cacheMaxAge`; key selection JWKS-only, `jwk`/`jku`/`x5u` never
  consulted; the every-request posture; one sentence that the block is not machine-verified
  against `jose`); which reasons are operator faults deserving an alert; the roster's role;
  logout and the revocation lag; the seam's stability tier (Unstable; promotion on the first
  production consumer); the generic contract for any other gate; then the two doors, one
  section each: `CairnAdminConfig.auth.send` for a site off Cloudflare Email Sending, and
  `BackendProvider` as the backend door with no second backend taught

**Interfaces:**
- Consumes: Task 1's exported types (the recipe's fenced block imports them).
- Produces: the page every inbound edit in Task 5b links.

- [ ] **Step 1:** the page; `check:snippets` green with the recipe block counted;
  `check:vale`, `check:prose`, `check:docs`; the `prose-voice-reviewer` round; commit.
- [ ] **Step 2:** the `web-auth-security-reviewer` reads the recipe and the login-methods
  section as shipped (a blocking criterion here, not a pass-end item); its findings fixed;
  commit.

**Acceptance criteria:** `check:snippets` green; the block's cairn-side shape (the resolver
object and both return shapes) is what the gate checks, since `jose` stubs to `any`; the
security reviewer's read of the recipe returned accept; every listed section present and each
door one section; no sentence explains JWTs, JWKS, or `jose` itself (Cloudflare's and jose's
docs are linked); the tier stated on the page.

### Task 5b: The inbound doc edits and the security-model sweep

**Files:**
- Modify: `docs/extend/security-model.md` ("Identity from a gate" under the session material;
  each row of the spec review's false-statement table
  (`docs/internal/record/2026-09-07-identity-seam/spec-review.md`, the security lens's table)
  either corrected or explicitly scoped to the built-in magic-link path; the section states the
  replaced piece, that under identity the effective admin session lifetime is the Access
  application's operator-set session duration with the advice to set it to hours, the
  never-reads-the-session-cookie property, `hasSession`'s meaning under identity
  (structurally always `false` on a CSRF rejection), that identity resolution runs after the
  CSRF stage, the rotation residual with its shared-browser shape and its two levers, the
  login-methods paragraph repeated, and the doctor arms), `docs/extend/README.md` (the auth
  list), `docs/why-cairn.md` (the identity paragraph: the assumption first, then "or, behind
  Cloudflare Access, sign in with your organization's Google or Microsoft accounts"; the
  backend sentence corrected to the type's promise),
  `docs/internal/record/2026-09-04-cairn-case/26-post-freeze-notes.md` (note 4 closed by
  pointing at the page; the file is committed at `79261f74`), `docs/reference/README.md`'s
  auth list if touched

**Interfaces:**
- Consumes: Task 5a's page (every inbound edit links it).

- [ ] **Step 1:** the edits; the false-statement table walked one row at a time with the
  disposition reported; `check:arm-indexes`, `check:docs`, `check:vale`; commit.

**Acceptance criteria:** each statement in the table is either still true under identity mode
or amended, reported one by one; `why-cairn.md` carries the ruled sentence and no longer says
no backend swap exists; every doc gate green.

### Task 6: Records (last)

**Files:**
- Modify: `docs/internal/engine-rulings.md` (two rows specified down to their labeled lines:
  the seam's accept row with `Verdict:`, the seam-fit line and the charter text it fulfils,
  `Reopens on:`, `Record:` pointing at `docs/internal/record/2026-09-07-identity-seam/`, and no
  `Any-site case:` since the format scopes that to audit keeps; the Access verifier's
  declined-for-now row with `Verdict:`, `Verified:`, the reasoning naming both
  `isuniqueviolation-cloudflare` and `audit-cloudflare-verifyturnstile`, the accepted assurance
  level (the recipe is not machine-verified below its cairn-facing shape), `Reopens on:` as the
  union "a second consumer hand-rolling this verifier, an engine-internal consumer of it, or an
  evidenced defect in a family site's own resolver", and `Record:`), `CHANGELOG.md`
  (`## Unreleased`: additive surface, no `Consumers must:` unless `LoginData`'s discriminated
  addition is judged consumer-visible, in which case the line and a migration entry come back
  and the task states which way it went), `ROADMAP.md` (the identity-seam entry leaves its tier;
  the two deferred items under Later with their triggers: the engine-shipped verifier on the
  union trigger above, group-to-role mapping on a consuming site that needs it),
  `docs/STATUS.md` (stale wording only), `docs/internal/docs-friction-log.md` (this pass's own
  findings appended and triaged; the whole-log triage is chassis-B1's this window), the harvest
  at `docs/internal/record/2026-09-07-identity-seam/harvest.md` (the locals hand-off pattern,
  the inverted probe, the recipe-versus-export ruling and its assurance limit)

**Interfaces:**
- Consumes: every prior task's shipped surface (the changelog and ruling rows name it).

- [ ] **Step 1:** the rows and the routing; `check:rulings-format`, `check:docs`, `check:vale`;
  commit.

**Acceptance criteria:** both ledger rows pass `check:rulings-format` with every labeled line
present; the identity-seam entry removed from its ROADMAP tier and the two deferred items under
Later with their triggers; the changelog entry present and the migration-entry decision stated;
this pass's friction findings triaged; the harvest banked.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; the reviewer fan-out: `web-auth-security-reviewer` (the
merge gate: the guard branch, the conditions, the routes, the recipe as shipped, the
login-methods section, the security model's false-statement sweep), `cloudflare-workers-reviewer`
(the probe and the recipe's Workers posture), `svelte-reviewer` (the login page component); fix
rounds per the chain discipline; the gates BY NAME: the six CI-only ones (`check:comments`,
`check:reference:signatures`, `check:surface`, `check:snippets`, `check:transcripts`,
`check:symbols`), the four doc gates (`check:package`, `check:reference`,
`check:reference:signatures`, `check:docs`), plus `check:idioms` and `check:cm-internals`;
from-scratch showcase install, build, and e2e (the consumer build gate); the live admin smoke is
substituted by the workerd integration suite, which exercises the real guard against a real
D1, and the post-mortem says so; the rebase over whichever of chassis-B1 or this pass merged
first, reconciling the shared files; STATUS/HISTORY/ROADMAP; the post-mortem here; both
budgets scored; the next plan drafted while context is warm or the reason it is deferred; the
`cairn-*` memory refreshed; push, PR, **merge on green CI after the security reviewer's accept**
(Geoff, 2026-09-07); the pre-bake for the context clear.

## What this pass hands forward

- **Polish:** the extend page joins the cover-to-cover read; the two doors' sections.
- **Later (ROADMAP):** an engine-shipped Access verifier, reopening on a second consumer
  hand-rolling this verifier, an engine-internal consumer of it, or an evidenced defect in a
  family site's own resolver; group-to-role mapping, reopening on a consuming site that needs it.
- **The recipe's assurance limit, recorded, not implicit:** it is the first security-critical
  recipe in the extend track and is not machine-verified below its cairn-facing shape; the
  declined ledger row carries that as the accepted assurance level, and a future engine
  verifier would replace it with a tested artifact.
- **The cairn case and front door:** note 4 closed; the front-door sentence may now say "or,
  behind Cloudflare Access, sign in with your organization's Google or Microsoft accounts", with
  the assumption stated first.
- **Release:** the window holds; ONE cut after polish.
