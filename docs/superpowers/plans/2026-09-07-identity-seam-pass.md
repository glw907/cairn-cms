# Identity Seam Pass Implementation Plan (the admin login on an organization's own identity)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential; every task touches
> the guard, the routes, or the docs that describe them). Steps use checkbox syntax for
> tracking. Runs on `.claude/worktrees/identity-seam` off `main`, in PARALLEL with chassis-B1
> (Geoff, 2026-09-07): the two passes share no source file, only `CHANGELOG.md`,
> `ROADMAP.md`, `docs/STATUS.md`, and the friction log, which the last task of whichever
> merges second reconciles. Authored 2026-09-07 from spec revision 2; the four-lens plan
> review and its fold precede the first dispatch (record
> `docs/internal/record/2026-09-07-identity-seam/plan-review.md`).

**Goal:** a site behind Cloudflare Access (or any gate) signs its editors into `/admin` with
the organization's own identity, cairn minting no session and the roster still assigning
owner or editor, through one optional guard option, with the Access verification taught as a
snippet-gated recipe and the front door able to say so.

**Architecture:** one new option on `createAuthGuard`, `identity`, replacing exactly the
session-resolution piece of the guard's five; the guard publishes `locals.cairnIdentity` and
the login, request, confirm, and logout handlers read only that; two registered conditions
carry the refusals; the doctor's login probe gains the arms that detect a gate or an exposed
origin; no engine dependency is added (the Access verifier is a recipe on the extend page).
The Scaffold-tier guard keeps its tier (an optional option is additive); the three new
interfaces enter as Unstable API.

**Tech stack:** SvelteKit 2, TypeScript, vitest (the node unit and workerd integration
projects; miniflare D1 for `AUTH_DB`), the repo's gate estate.

**Spec:** `docs/superpowers/specs/2026-09-07-identity-seam-design.md` (revision 2). Inputs:
`docs/internal/record/2026-09-07-identity-seam/{engine-research,access-research,precedent,spec-review}.md`.
Anchors verified against `main` at `de2bf1cb`; re-verify at dispatch (chassis-A's merge
touches none of these files).

**Token ceiling:** 4.5M (6 tasks; the engine work is about 500 lines plus about 24 tests, the
docs about 500 lines; no image reads). Task 2 is the one expected to exceed 0.7M; its
pre-agreed split is conditions-and-log-vocabulary first, the guard branch second.
**Checkpoint interval:** every three tasks (checkpoints at 3 and 6), each writing STATUS (task
ledger, decisions taken, spend against the ceiling, next task). **Execution:** sequential in
one worktree; the machine's two-gate ceiling is shared with chassis-B1, so this chain never
runs its e2e-bearing gate while B1's is running (the conductor sequences launches). Open the
PR after Task 1's commit. **Merge gate:** green CI plus the `web-auth-security-reviewer`'s
accept plus the docs gates (Geoff, 2026-09-07); Geoff reads the extend page after.

## Ruled inputs (recorded; no task re-derives them)

- **The seam is generic and engine-owned; the Access verifier is a recipe** (spec decision 5,
  the `isuniqueviolation-cloudflare` precedent). No `jose` in `package.json`; the recipe's
  fenced block declares it per `check:snippets`'s convention.
- **No guard-side bootstrap** (spec decision 6). The first owner is seeded out of band; the
  doctor's `auth.store` remedy names `create-cairn-site`'s bootstrap INSERT and
  `wrangler d1 execute`.
- **One configuration point** (spec decision 7): `identity` on `createAuthGuard` only; the
  guard sets `locals.cairnIdentity = { label, logoutUrl }` on every admin path it handles in
  identity mode; the routes read only `locals.cairnIdentity`; no `identity` member on
  `CairnAdminConfig` or `AuthRoutesConfig`.
- **No CSRF change** (spec decision 8); the security model states the rotation residual.
- **The resolver contract:** `resolve(event) => Promise<ResolvedIdentity | IdentityRefusal>`,
  `logoutUrl` validated at construction (a same-origin path starting with `/` or an absolute
  `https:` URL; anything else throws at `createAuthGuard`), `label` optional (default
  "your organization's sign-in"). The guard normalizes `email` (trim, lowercase) before the
  roster lookup. `reason` is logged, never rendered.
- **Condition ids:** `auth.identity-unresolved` and `auth.identity-unrostered`, registered in
  `src/lib/diagnostics/conditions.ts` with `docsAnchor`s into `docs/admin/is-it-working.md`;
  rendered through `renderConditionResponse`; the unrostered page interpolates the requester's
  own normalized email through `escapeHtml`, the only request data any condition page renders.
- **Log vocabulary:** `guard.rejected` gains `reason: 'identity'` with `detail` carrying the
  refusal's `reason` and `conditionId`; new event `auth.identity.unknown` with `email`.
- **Tiers:** `createAuthGuard` stays Scaffold API; `IdentityResolver`, `ResolvedIdentity`,
  `IdentityRefusal` are Unstable API; `locals.cairnIdentity` is documented beside
  `locals.cairnEditor` on `./ambient`.
- **The two doors** (email sender, backend) ride in Task 5 bounded to one section each.
- **Release:** the window holds; ONE cut after polish; this pass does not bump or publish.

## Global constraints

- No public export removed; `check:surface -- --update` regenerated and committed in the task
  that adds surface (Task 1); every later task leaves `check:surface` green without `--update`.
- The zero-config path is byte-identical: `src/tests/integration/auth-guard.test.ts` passes
  unchanged in every task.
- Prose in comments and docs: no em dashes, no ruling or pass citations in shipped comments;
  TSDoc; every new exported symbol carries its one-line doc (`check:reference` and
  `jsdoc/require-jsdoc`).
- Gate per task: `npm run check && npm test`, `check:reference`, `check:reference:signatures`,
  `check:surface`, `check:docs`, `check:readiness`, `check:symbols`, `check:comments`,
  `check:consumers`; from Task 5 on also `check:snippets` and `check:vale`. The six CI-only
  gates BY NAME at pass end plus `check:idioms` and `check:cm-internals`.

---

### Task 1: Declare the seam and thread it

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (the three interfaces beside `AuthGuardOptions` at
  about `:26-45`; the `identity` option; `logoutUrl` validation in `createAuthGuard`'s
  construction; no branch behavior yet beyond setting `locals.cairnIdentity` when the option
  is present), `src/lib/sveltekit/index.ts` (the three types exported), the ambient
  declaration module that types `locals.cairnEditor` (add `cairnIdentity?: { label: string;
  logoutUrl: string }`), `docs/reference/sveltekit.md` (`AuthGuardOptions.identity` on the
  `createAuthGuard` section; the three types in the Types table at Unstable),
  `docs/reference/ambient.md` (`locals.cairnIdentity`), `docs/internal/api-surface.md`
  (`check:surface -- --update`)
- Test: `src/tests/unit/auth-guard-identity-option.test.ts` (construction rejects a
  `logoutUrl` that is neither a `/` path nor `https:`; accepts both forms; a guard without
  `identity` sets no `locals.cairnIdentity`)

**Interfaces:**
- Produces: `IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal` from `/sveltekit`;
  `AuthGuardOptions.identity`; `App.Locals.cairnIdentity`.

- [ ] **Step 1:** write the failing construction tests; the interfaces and the option; the
  ambient type; run the tests green; `auth-guard.test.ts` unchanged and green.
- [ ] **Step 2:** the reference rows; `check:surface -- --update`; full gate; commit. The
  conductor opens the PR.

**Acceptance criteria:** the three interfaces declared once and homed on `/sveltekit`;
`check:surface` green with the regenerated snapshot committed; `check:reference` and
`check:reference:signatures` green; the zero-config guard path byte-identical; the
`logoutUrl` validation tested both ways.

### Task 2: The guard's identity branch, its conditions, and its log vocabulary (pre-agreed split: 2a conditions and vocabulary, 2b the branch)

**Files:**
- Modify (2a): `src/lib/diagnostics/conditions.ts` (the two conditions per the ruled input),
  `src/lib/sveltekit/condition-response.ts` (the `REASON_CONDITION` map and the switch arms
  for the two ids; the unrostered arm takes the email and escapes it), `src/lib/log/events.ts`
  (the `identity` reason on `guard.rejected`; `auth.identity.unknown`),
  `docs/reference/log-events.md` (the reason and the new row), `docs/admin/is-it-working.md`
  (the two anchor sections: what the page means and what to do), `docs/reference/doctor.md`
  only if a condition implies a doctor row
- Modify (2b): `src/lib/sveltekit/guard.ts` (at about `:175-195`: under `identity`, call
  `resolve`, normalize the email, look the roster row up with the store's existing
  `findEditor` or equivalent, build the `Editor` through `resolveCapability` as today, set
  `locals.cairnEditor`/`cairnAccess`/`cairnIdentity`; the two refusal paths render their
  conditions and log)
- Test: `src/tests/integration/auth-guard-identity.test.ts` (workerd project, miniflare
  `AUTH_DB` with the applied migrations, a fixture resolver whose answer the test controls):
  resolved and rostered (both locals set, capability resolved through the roles option);
  resolved and unrostered (the condition page with the escaped email, `auth.identity.unknown`
  logged with `email` only); each refusal reason (`missing`, `invalid`, a site's own word)
  renders `auth.identity-unresolved` and logs `guard.rejected` with `reason: 'identity'` and
  the reason in `detail`; live revocation after a roster `DELETE`; the email normalized before
  lookup (`" Owner@Example.org "` matches `owner@example.org`); `locals.cairnIdentity` present
  on every arm; `hasSession` untouched

**Interfaces:**
- Consumes: Task 1's types and option.
- Produces: `locals.cairnIdentity` set on every identity-mode admin request; the two condition
  ids; the log rows.

- [ ] **Step 1 (2a):** the conditions, the arms, the events, the doc anchors; `check:readiness`,
  `check:symbols`, `check:docs` green; commit.
- [ ] **Step 2 (2b):** the failing integration tests; the branch; green; the zero-config suite
  unchanged; full gate; commit.

**Acceptance criteria:** every integration case above green; no CSRF-issuance change in the
guard and `hasSession` not redefined; `check:readiness`, `check:symbols`, and `check:docs`
green; `auth-guard.test.ts` unchanged.

### Task 3: The magic-link surface under identity mode

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts` (`loginLoad` returns the hand-off shape when
  `locals.cairnIdentity` is set; `requestAction` and `confirmAction` return 404 in that mode;
  `logoutAction` at about `:404-433` skips the session delete, keeps the cookie deletes, and
  redirects to `locals.cairnIdentity.logoutUrl`; `requireDb` stays), the login page component
  the routes render (the hand-off paragraph "This site signs in through <label>" with a link
  to `/admin`, no form, and a `data-cairn-identity` attribute on the paragraph; the copy
  through `check:prose`), `docs/reference/sveltekit.md` (the `AuthRoutes` handlers' identity
  behavior, one sentence each)
- Test: `src/tests/integration/auth-routes-identity.test.ts` (the hand-off page with its
  marker and no form; the two 404s; the logout redirect's `Location` equal to `logoutUrl` and
  the cookie deletes present; the same four handlers unchanged without `cairnIdentity`)

**Interfaces:**
- Consumes: `locals.cairnIdentity` (Task 2).

- [ ] **Step 1:** the failing tests; the four handler branches and the page; green; full gate;
  commit.

**Acceptance criteria:** the four cases green both ways; `requireDb` in place; the hand-off
page carries the marker and no form; `check:prose` green.

### Task 4: The doctor's login probe learns the gate

**Files:**
- Modify: `src/lib/doctor/check-probe.ts` (about `:20-71` and `:95-144`: the GET arm classifies
  the response: a 302 whose `Location` host ends in `cloudflareaccess.com`, or any 401/403,
  is PASS "gated by <host>"; a 200 whose body carries `data-cairn-identity` is FAIL "the origin
  answers without the gate: `/admin` is reachable directly" with the remediation naming the
  Access application's path and the `workers.dev` route; a 200 with the magic-link form
  continues into today's POST arm unchanged), `src/lib/doctor/checks-cloudflare.ts` (about
  `:197`: `auth.store`'s remedy string names the out-of-band seed), `docs/reference/doctor.md`
  (the probe's three outcomes; the remedy), `docs/admin/troubleshooting.md` if it walks the
  probe
- Test: the probe's unit tests (stubbed fetch: the three GET outcomes; the POST arm still
  runs only after the magic-link 200)

- [ ] **Step 1:** the failing tests; the arms; green; full gate; commit.

**Acceptance criteria:** the three outcomes tested; the magic-link path byte-identical; the
remedy strings present; `check:docs` green.

### Task 5: The extend page, the recipe, and the docs that describe the seam

**Files:**
- Create: `docs/extend/sign-in-through-your-organization.md` per the spec's section (the
  assumption first; the Access route for Workspace and Entra ID with Cloudflare's steps linked;
  the migration step on roster emails; the recipe as a fenced `ts` block with `jose` declared
  per the snippet gate, header-only, `issuer`/`audience`/`algorithms: ['RS256']` pinned, the
  non-empty-string `email` check, the per-class `reason`, the every-request posture and the
  `workers.dev` warning; the roster's role; logout and the revocation lag; the generic
  contract; then the two doors, one section each: `CairnAdminConfig.auth.send` for a site off
  Cloudflare Email Sending, and `BackendProvider` as the backend door with no second backend
  taught)
- Modify: `docs/extend/security-model.md` ("Identity from a gate" under the session material:
  the replaced piece, the rotation residual, the doctor arm), `docs/extend/README.md` (the
  auth list), `docs/why-cairn.md` (the identity paragraph: the assumption, then "or sign in
  through your organization", and the backend sentence corrected to the type's promise),
  `docs/internal/record/2026-09-04-cairn-case/26-post-freeze-notes.md` (note 4 closed by
  pointing here; this file is uncommitted on `main`, so the task edits it only if it is
  present in the worktree, else reports), `docs/extend/migration-notes.md` (a site with no
  `identity` option sees no change)

- [ ] **Step 1:** the page and the edits; `check:snippets` proves the recipe typechecks
  against the built package; `check:vale`, `check:docs`, `check:arm-indexes` green; the
  `prose-voice-reviewer` over the new page before commit; commit.

**Acceptance criteria:** `check:snippets` green with the recipe block counted; every doc gate
green; the two doors each one section; the security model's session sentences true under
identity mode; `why-cairn.md` no longer says no backend swap exists.

### Task 6: Records (last)

**Files:**
- Modify: `docs/internal/engine-rulings.md` (the seam's accept row with the seam-fit line and
  the charter text it fulfils; the Access verifier's declined-for-now row with the
  `isuniqueviolation-cloudflare` reasoning and the reopen trigger: an evidenced defect in a
  family site's own resolver, or an engine-internal consumer), `CHANGELOG.md` (`## Unreleased`:
  additive surface, no `Consumers must:`), `ROADMAP.md` (the identity-seam entry leaves the
  tier; anything deferred, the group-to-role question and the engine verifier, filed to Later
  with the trigger), `docs/STATUS.md` (stale wording only), `docs/internal/docs-friction-log.md`
  (whole-log triage), the harvest at `docs/internal/record/2026-09-07-identity-seam/harvest.md`
  (what the pass learned: the locals hand-off pattern, the inverted probe, the recipe-versus-
  export ruling)

- [ ] **Step 1:** the rows and the routing; `check:rulings-format`, `check:docs`, `check:vale`;
  commit.

**Acceptance criteria:** both ledger rows pass `check:rulings-format`; no shipped item remains
in a ROADMAP tier; the changelog and migration entries present; the friction log triaged; the
harvest banked.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; the reviewer fan-out: `web-auth-security-reviewer` (the
merge gate: the guard branch, the conditions, the routes, the recipe as shipped, the security
model), `cloudflare-workers-reviewer` (the probe and the recipe's Workers posture),
`svelte-reviewer` (the login page component); fix rounds per the chain discipline; the six
CI-only gates BY NAME (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`, `check:transcripts`, `check:symbols`) plus `check:idioms` and
`check:cm-internals`; from-scratch showcase install, build, and e2e (the consumer build gate;
the showcase adopts nothing here); the live admin smoke is substituted by the workerd
integration suite, which exercises the real guard against a real D1, and the post-mortem says
so; STATUS/HISTORY/ROADMAP; the post-mortem here; both budgets scored; push, PR, **merge on
green CI after the security reviewer's accept** (Geoff, 2026-09-07); the pre-bake for the
context clear.

## What this pass hands forward

- **Polish:** the extend page joins the cover-to-cover read; the two doors' sections.
- **Later (ROADMAP):** an engine-shipped Access verifier, reopening on the declined row's
  trigger; group-to-role mapping, reopening on a consuming site that needs it.
- **The cairn case and front door:** note 4 closed; the front-door sentence may now say
  "or sign in through your organization" with the assumption stated first.
- **Release:** the window holds; ONE cut after polish.
