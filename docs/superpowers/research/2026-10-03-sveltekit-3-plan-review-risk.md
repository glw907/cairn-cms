# SvelteKit 3 plan review: domain-risk lens

Target: `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` at HEAD `27b254ac`, against the
approved spec `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` and its review trail.
Lens: auth, CSRF, sessions, D1, the commit path, the public seam contract, and the Go doctor's frozen
contract. This lens flags only gaps that affect correctness or a stated requirement. The spec and its
Rulings are not re-argued.

Counts: 0 blocker, 2 major, 1 medium, 4 low; 2 over-ceremony notes. No owner fork.

## Verified non-gaps (no fold needed)

- **No insecure window on the pass branch, and none on `main`.** Task 8 sets `strict-origin` and the
  meta while `checkOrigin: false` and Rule 2 are still both in place. A referrer-policy change alone
  lowers no defense: the admin token still guards `/admin`, and Rule 2 still guards everything else.
  Task 9 removes the opt-out and Rule 2 in one task. The split rule (plan:54-57) cuts only after S2,
  and the merge waits for the close (plan:865). The spec's Split-point hazard (Rule 2 gone on a Kit
  `^2.70` peer) can't reach `main`.
- **Every security fold the spec took is carried.** `originMatches` stays for `createAuthChannel` and
  `isUnsafeFormRequest` stays for Rule 1 (plan:120). The prerender-safe env rule appears at plan:118,
  pinned at plan:688-691. Dev doubles stay out of production through the `wrangler deploy --dry-run`
  grep (plan:426-427), which CI re-runs at the S4 boundary (plan:720-721). The flag never reaches
  `wrangler.jsonc` `vars` (plan:119, 424-425). The admin referrer meta is in Task 8, and the
  `trustedOrigins` wildcard detector is in Task 10.
- **The security read is placed correctly.** Task 7 runs after S2 and before Task 8, the first CSRF
  code. Its feed is a separate problem (PR3).
- **The Kit 2.70 ordering is sound.** S2 moves the e2e onto `wrangler dev` before S3, so Kit's check,
  which is skipped in `vite dev`, is live when Task 9's cross-origin pair runs. Task 9's pair targets
  a `createAuthChannel` action, so under `'*'` the factory's own `originMatches` would still return
  403. The pair asserts Kit's body, not only the status, so the claim "fails under `'*'`" holds
  (plan:535-538).
- **Skipping a Consumers-must step fails loudly in every security-relevant case.** A leftover
  `checkOrigin` is a Kit 3 build error. A leftover `App.Platform` read surfaces in `svelte-check`. A v1
  doctor's advice leads to that same build error. A site-wide `no-referrer` makes the site's own
  forms return 403, and the doctor's `config.no-referrer-blanket` names that case. Only
  `trustedOrigins: ['*']` is silent at build time, and the Consumers-must line plus the v2 doctor
  cover it (PR4).
- **The meta covers child routes.** `EditPage` and the other admin screens render inside
  `CairnAdminShell`'s `<svelte:head>` (`CairnAdminShell.svelte:679`), so the three documents Task 8
  names cover every engine-rendered admin form.
- **Bonus evidence from the smoke.** Geoff clicks in Firefox while every automated proof runs in
  Chromium. That makes the live smoke the one cross-browser check of the meta's precedence.

## Correctness and security findings, by consequence

### PR1 (major): the live smoke's Save step can't succeed as written, and the host is ambiguous enough to invite a dev bypass

Location: plan:847-853 (Close step 5); plan:163 (Decision 9).

Defect, part 1: Save can't commit. The step ends with "a Save commits through the guard". The
showcase's backend is a placeholder:
`createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })`
(`examples/showcase/src/theme/cairn.config.ts:149`). The local env carries no
`GITHUB_APP_PRIVATE_KEY_B64` either (`examples/showcase/src/routes/healthz/+server.ts:3`). Ruling 1
sets the dev backend off with no provisioning, so no Save can commit. An executor that hits this
either fails the close or turns on the dev backend to get a commit. The second choice is the bypass
the smoke exists to exclude.

Defect, part 2: the host is ambiguous. The step says "on S2's host", and S2's host builds with
`VITE_CAIRN_E2E=1` and delivers `CAIRN_DEV_BACKEND` (plan:408-410).

Defect, part 3: the runbook is the wrong one. The step says to follow
`docs/internal/admin-smoke-test.md`. That page is the runbook for signing in without the email round
trip: it mints a session by inserting a `session` row (admin-smoke-test.md:3-4, 26-31). Following it
literally replaces the magic-link click the Ruling requires.

Defect, part 4: the origin conflicts. The showcase's `PUBLIC_ORIGIN` var is `http://localhost:4173`
(`wrangler.jsonc:61`), and plan:127 forbids port 4173. "Set to the local origin" is right, but the
step names no mechanism for setting it.

Fold. Rewrite Close step 5's acceptance as follows:

- **Build and env:** the default `npm run build`, with no `VITE_CAIRN_E2E` and no `CAIRN_DEV_BACKEND`
  in `.dev.vars` or `--var`. The guard's tripwire 503 serves as the self-check if the flag leaks in.
- **Server:** `wrangler dev` on a port from an environment variable, with
  `--var PUBLIC_ORIGIN:http://localhost:$PORT`.
- **Session:** the session comes only from Geoff's confirm click. The step uses no seeded `session`
  row, and it follows `admin-smoke-test.md` only for its POST-`Origin` steps.
- **Save evidence:** the Save POST clears Kit's check and guard Rule 1 and reaches the action. The
  proof is neither Kit's 403 nor `auth.csrf-token-invalid`, but a `commit.failed` record at `error`
  level carrying the GitHub credential failure. Quote that record.

A real commit stays unexercised until cairn.pub's migration. Record that next to the accepted
`__Host-` cost.

### PR2 (major): Task 11 claims mutation-sensitivity but requires no executed mutation proof on the reads the dev fence and the Secure branch depend on

Location: plan:680-708 (Task 11 acceptance); pass-core class table (`auth-data`: "test-first, a
mutation proof").

Defect. Task 11 moves these security-relevant reads off `event.platform` and `process.env` and onto
the module `env`:

- the guard's flag-alone tripwire (`guard.ts:195-198`);
- the factory's set-and-deployed tripwire (`auth-channel/factory.ts:121-131`), whose `isDeployedHost`
  reads `PUBLIC_ORIGIN` (`dev-flag.ts:108-118`);
- `csrfSecure`'s `PUBLIC_ORIGIN` branch, which decides Secure and `__Host-` for an http request
  behind a TLS proxy (`csrf.ts:72-84`).

Each acceptance line says a test "fails if..." but nothing requires the red run, and plan:696 names
only one tripwire. Each vitest project aliases `cloudflare:workers` to the fake on its own, so the
likeliest regression is vacuous. A project whose alias misses, or a test that sets the fake while the
engine reads another import, goes green with the guard reading nothing. Ruling 1 accepts that the
live smoke never exercises the Secure branch, so a unit test is the only pre-migration proof of
`csrfSecure`. The import-graph walker also passes vacuously on today's tree (plan:686-687).

Fold. Require four quoted red runs in Task 11's report, each restored afterward:

1. With the guard's module-`env` flag read removed, the flag-in-`env` 503 test fails.
2. With the factory's flag read or its `isDeployedHost` `PUBLIC_ORIGIN` read removed, the
   set-and-deployed test fails. Also add a passing case: flag set on a local host gives no refusal.
3. With `csrfSecure`'s `PUBLIC_ORIGIN` branch removed, a test with the fake `env` carrying
   `PUBLIC_ORIGIN: 'https://...'` and a non-local http URL fails.
4. With a temporary `workers-env` import added to a Node-context entry, the import-graph check fails.

Each test that touches the factory builds a fresh `createAuthChannel` instance, because its flag
cache latches per instance.

### PR3 (medium): Task 7's security read gets no inputs

Location: plan:473-485.

Defect. The dispatch names only "Spec: CSRF, last paragraph". A `web-auth-security-reviewer` starts
with zero context (global "Conducting a pass": pre-extract what subagents need). It must rule on the
following without having read them:

- Kit's ordering, from Kit 3 `runtime/server/respond.js:98-133` and `csrf.js`, and Kit 2.70.3
  `respond.js:73-100`;
- the `'*'` switch at `vite/index.js:495`;
- the Referrer-Policy probe results;
- the guard and the factory.

It can't return an "amend" that targets Tasks 8 to 10 without those tasks' text. The read also has no
explicit question on Decision 5's severity. That severity is the one doctor call the plan made beyond
the spec (PR4).

Fold. Add an Inputs list to Task 7:

- the spec's "Evidence" bullets on Kit's CSRF check and Referrer-Policy, and its "CSRF" section;
- the risk lens's R2, R5, and R6 (`2026-10-03-sveltekit-3-spec-review-risk.md`);
- source paths under `~/.cache/kit3-research/kit/package/src/` (the files above);
- Kit 2.70.3's `respond.js` from the repo's `node_modules`;
- `src/lib/sveltekit/{guard,csrf,admin-response,auth-routes}.ts` and
  `src/lib/auth-channel/factory.ts`;
- the three admin `.svelte` heads;
- the full text of Tasks 8, 9, and 10 and Decision 5, with a required accept or amend verdict on the
  `warning` severity.

### PR4 (low): the wildcard severity. The spec requires FAIL status and is silent on severity; `warning` is correct, but the plan doesn't record the premises

Location: plan:150-154 (Decision 5), plan:580-583; spec:214-216; risk lens R6
(`...spec-review-risk.md:160-161`); fold record (h) (`...spec-fold.md:71-72`, row R6 at :125).

What the spec requires. The spec says `check_csrf.go` "fails on a `trustedOrigins` entry of `'*'`".
In the doctor's vocabulary that means `StatusFail`, which carries either severity
(`doctor/status.go`; `spine/conditions.go:49-52` maps `"warning"` to `WarningFailure` and everything
else to `CriticalFailure`). R6 contrasted "fails on `'*'`" with "warns on any other entry", which
implies `blocker`. The fold narrowed only the non-`*` branch, to a pass with a detail, and never
carried a severity. So `warning` doesn't contradict the spec, and the plan's choice is in scope.

What is correct. `warning` (exit 1). `'*'` compiles Kit's check off on every route, but every cairn
surface keeps its own floor:

- Guard Rule 1 requires the double-submit token on every unsafe form POST under `/admin`, the public
  login and confirm posts included (`guard.ts`, the Rule 1 block after the `AUTH_DB` check).
- A cross-site JSON POST can't be sent without a preflight.
- `createAuthChannel` keeps `originMatches` (plan:120).

What's left exposed is the site's own forms, which the charter places in the developer's domain.
That matches the severity of the retired `config.csrf-disable-missing` (`conditions.json:113-114`).
A `blocker` would put a page-level verdict on a site-domain exposure.

Fold. In Decision 5, cite the two verified premises: Rule 1 covers login and confirm, and the factory
keeps `originMatches`. Require the new condition's `why` to state the exposure plainly: "`'*'` turns
off SvelteKit's Origin check on every route; cairn's admin keeps its token and member actions keep
their own origin compare; your own forms have no Origin check." Route the severity through Task 7's
verdict (PR3), so a reviewer who disagrees amends Task 10 before it runs.

### PR5 (low): Task 10's Files miss a fixture its own grep will hit, and an absent Vite config must not pass

Location: plan:568-577, 597-606.

Defect 1. `tool/cmd/cairn/doctor_test.go:47` carries a clean-site fixture with
`svelte.config.js: "export default { kit: { csrf: { checkOrigin: false } } };"`. Task 10's grep
(plan:604-606) covers `tool`, so it prints this line, but the file isn't in Task 10's Files.

Defect 2. The acceptance lists "no `csrf` key passes" but doesn't cover a site with no Vite config
file the check can read. The current check returns UNCHECKED in that case (`uncheckedCsrfDetail`,
`check_csrf.go:13`). A repurposed check that treats "no file" as "no `csrf` key" would report PASS on
a site it never read.

Fold. Add `tool/cmd/cairn/doctor_test.go` to the Files, with its fixture moved to the Kit 3 shape (no
`svelte.config.js`). Add a table case: no `vite.config.ts` gives UNCHECKED, never PASS.

### PR6 (low): Task 5 names no mutation proof, and its fixture routes now act on a real D1 binding

Location: plan:394-434; `examples/showcase/src/routes/test/reset-members/+server.ts:24-35`.

Defect. Task 5 is `auth-data`, but its acceptance has no mutation proof. The assert-empty-after-reset
check is a vacuity guard, not a mutation proof. Task 5 also repoints `/test/reset-members` (and
`last-otp` and `revoke-member-session`) from an in-memory double to the local D1 `MEMBER_DB`. Today
those routes refuse in their body on two independent checks: a local host, and
`CAIRN_DEV_BACKEND === '1'` in env. Neither check depends on the build fold. Once the flag arrives
through `.dev.vars` or `--var` instead of `membersDevHandle`'s stamp, the env check is easy to
"simplify" away. If `.dev.vars` is chosen, the plan also never proves the file stays out of git and
out of the emitted template.

Fold. Add these to Task 5's acceptance:

- Each `/test/*` route keeps both refusals.
- A test asserts 404 with the flag absent. Its mutation proof: drop the env check, and the test
  fails (quoted).
- If `.dev.vars` carries the flag, `git check-ignore examples/showcase/.dev.vars` succeeds and
  `templates/waymark` holds no `.dev.vars`.

### PR7 (low, optional): Consumers must omits the `vite preview` break

Location: spec:342-360; plan:791-793.

Defect. Under adapter 8, `vite preview` fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME` (kit#17271). The
template's own `preview` script is repointed (Decision 3), but a cairn.pub `preview` script or e2e
`webServer` on `vite preview` breaks with no line telling the developer why. This is a broken dev
workflow, not a security gap.

Fold, optional. Add one line to the list Task 13 finalizes: "Serve a built site with `wrangler dev`;
`vite preview` can't run adapter 8 output."

## Over-ceremony, by cost

### OC1: Task 6 runs the full gate over edits the full gate never exercises

Location: plan:436-463. Task 6 edits workflows and lab or check scripts that serve the showcase
build. F's whole showcase e2e exercises none of them, and Task 6's real proofs are its own named runs
(the theme fixture, `norms:check`, the grep). The S2 boundary runs F and CI anyway. Cost: one full
e2e-bearing gate run, plus its fix-round exposure. Fold: gate Task 6 on E plus its named proofs.

### OC2: Task 12's class label doesn't match its gate

Location: plan:729, 751. Task 12 is labeled `engine-logic`, whose class gate is the full gate, but
it runs S. The scoped gate is right, since no engine source changes. Under the class table, though,
the label implies a test-first mandate and a full-gate review bar. Cost: none in tokens, because the
per-task `gate` arg wins; the risk is a reviewer applying the wrong bar. Fold: say the class gate is
overridden to S by blast radius in the header's Overrides line (plan:26-29), next to Task 10's and
Task 13's.
