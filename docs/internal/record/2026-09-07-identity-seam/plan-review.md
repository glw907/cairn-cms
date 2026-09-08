# Identity-seam plan review (2026-09-07, four Opus lenses, fresh context each)

Grounding, security (the web-auth-security-reviewer agent), hygiene and sizing, charter and precedent, on the plan at `b58b5d2e` and spec revision 2. The fold brief and the folded plan follow. Write-once.

---


Object: `docs/superpowers/plans/2026-09-07-identity-seam-pass.md` (HEAD `b58b5d2e`) against
`docs/superpowers/specs/2026-09-07-identity-seam-design.md` (rev 2) and the code on `main`.
Read-only. Every file:line below was opened. Anchors re-verified: `guard.ts`, `auth-routes.ts`,
and `check-probe.ts` are byte-identical between `de2bf1cb` (the plan's stated verification point)
and HEAD, so the plan's anchors were checkable and the errors below are authoring errors, not drift.

Findings ranked: blocking (the task cannot be built as written, or a gate fails at merge) first.

---

## G1 (BLOCKING). The guard's identity branch as anchored never runs on `/admin/login`, so Task 3
has nothing to read.

**Claim.** Ruled inputs: "the guard sets `locals.cairnIdentity = { label, logoutUrl }` on every
admin path it handles in identity mode; the routes read only `locals.cairnIdentity`". Task 2b
anchors the whole branch "at about `:175-195`". Task 3: "`loginLoad` returns the hand-off shape
when `locals.cairnIdentity` is set; `requestAction` and `confirmAction` return 404 in that mode".

**Evidence.** `src/lib/sveltekit/guard.ts:175` opens `if (!isPublicAdminPath(pathname)) {` and
closes at `:195`. `isPublicAdminPath` (`guard.ts:25-27`) is `pathname === '/admin/login' ||
pathname.startsWith('/admin/auth/')`. So everything at `:175-195` is skipped on exactly the three
paths Task 3 changes: `loginLoad` serves `/admin/login`, `requestAction` posts to
`/admin/login?/request`, `confirmAction` posts to `/admin/auth/confirm`. A branch written inside
`:175-195` leaves `locals.cairnIdentity` undefined on all three, and Task 3's handlers fall through
to the magic-link path on a gated site. Only `logoutAction` (posting to the bare `/admin`, a
non-public path) would see the field. The spec review named this (`spec-review.md` N6,
"`/admin/login` and `/admin/auth/**` stay `isPublicAdminPath`, so no identity resolves there") and
neither spec rev 2 nor the plan resolved it.

The fix is not free: setting `cairnIdentity` outside the block means the guard must either (a) set
it from the closed-over option without resolving identity on public paths (cheap, and enough for
Task 3, since the routes only need the mode flag plus `label`/`logoutUrl`), or (b) call
`identity.resolve` on public paths too (a real posture change, and `renderConditionResponse` would
then refuse the login page). The plan must choose (a) explicitly and say so.

**Exact plan text to change.** In Ruled inputs, after "on every admin path it handles in identity
mode", add: "including the public admin paths (`isPublicAdminPath`, `guard.ts:25-27`), so the
`locals.cairnIdentity` assignment sits OUTSIDE the `!isPublicAdminPath` block at `guard.ts:175`,
built from the closed-over option alone; `identity.resolve` is still called only on guarded paths,
inside `:175-195`." In Task 2b's Files line, replace "at about `:175-195`: under `identity`, call
`resolve`" with "two edits in `guard.ts`: the unconditional `locals.cairnIdentity` assignment
before the `!isPublicAdminPath` block at `:175`, and the resolve/roster branch inside it at
`:175-195`". Add to Task 2's acceptance criteria: "`locals.cairnIdentity` is set on
`/admin/login` and `/admin/auth/confirm` with no `resolve` call on either."

---

## G2 (BLOCKING). Task 1's file list is missing `src/lib/sveltekit/types.ts`, so nothing typechecks.

**Claim.** Task 1 Files: "the ambient declaration module that types `locals.cairnEditor` (add
`cairnIdentity?: { label: string; logoutUrl: string }`)".

**Evidence.** There are TWO declarations of that shape, deliberately kept in step. The ambient one
is `src/lib/ambient.ts:37-46` (`declare global { namespace App { interface Locals { cairnEditor?;
cairnBackend?; cairnAuditSink?; cairnAccess? } } }`). The engine's own STRUCTURAL event type
repeats it: `src/lib/sveltekit/types.ts:84-89`, `locals: { cairnEditor?: Editor | null;
cairnBackend?: Backend; cairnAuditSink?: AdminActionAuditSink; cairnAccess?: AccessMap }`. The
guard's handler is typed `HandleInput` (`guard.ts:22, 77`), which chains `CairnEvent`, and every
auth route takes `CairnEvent` (`auth-routes.ts:247, 403`; `AuthRoutes`, `:440-446`). Without the
`types.ts` member the guard's write and all four route reads are type errors, and `npm run check`
(the gate's `svelte-check`, 0/0) fails.

**Exact plan text to change.** In Task 1 Files, replace "the ambient declaration module that types
`locals.cairnEditor`" with "`src/lib/ambient.ts` (`:37-46`, the `App.Locals` augmentation) AND
`src/lib/sveltekit/types.ts` (`:84-89`, `CairnEvent['locals']`, which repeats the same members for
the engine's structural events), both adding `cairnIdentity?: { label: string; logoutUrl: string }`".
Add to acceptance criteria: "the two `locals` declarations agree member for member."

---

## G3 (BLOCKING). `renderConditionResponse` cannot carry an email or a label, and `REASON_CONDITION`
cannot hold two ids for one reason.

**Claim.** Task 2a Files: "`src/lib/sveltekit/condition-response.ts` (the `REASON_CONDITION` map and
the switch arms for the two ids; the unrostered arm takes the email and escapes it)". Ruled inputs:
"rendered through `renderConditionResponse`; the unrostered page interpolates the requester's own
normalized email through `escapeHtml`".

**Evidence, three separate problems in one file.**
1. Signature. `condition-response.ts:40`: `export function renderConditionResponse(id: string, ctx:
   { url?: URL } = {}): Response`. `ctx` carries only `url`, consumed by exactly one arm (`:44-48`).
   Passing an email or a `label` requires widening `ctx`, a change to an internal but
   guard-wide signature the plan never names.
2. No page interpolates request data today. The three branded arms render either a fixed page
   (`httpsRequiredPage`, `csrfRequiredPage`, `:44-50`) or `conditionFaultPage(cond)`
   (`:23-37`), which escapes only the registry's own STATIC `title`/`why`/`remediation` strings.
   Two new page builders are needed on the `https-required-page.ts` / `csrf-required-page.ts`
   pattern; neither is in any file list, and the escaping requirement the spec review demanded
   (`spec-review.md` G3, S8) has no home.
3. `REASON_CONDITION` is the wrong map. `condition-response.ts:11-17` documents it as "The
   guard.rejected reasons, each mapped to its registered condition id", keyed `https`, `csrf`,
   `origin`, `bindings`. Only `auth.identity-unresolved` is a `guard.rejected` reason (`identity`);
   `auth.identity-unrostered` logs `auth.identity.unknown`, a different event, so it has no key to
   occupy. Adding both to the map breaks its stated 1:1 with `guard.rejected.reason`.

**Exact plan text to change.** Replace Task 2a's `condition-response.ts` parenthetical with: "widen
`renderConditionResponse`'s `ctx` (`:40`) from `{ url?: URL }` to also carry `email?: string` and
`label?: string`; add two switch arms; add `identity: 'auth.identity-unresolved'` to
`REASON_CONDITION` (`:12-17`) and NOT the unrostered id, which is not a `guard.rejected` reason;
two new page modules beside `https-required-page.ts` and `csrf-required-page.ts`, the unrostered one
interpolating the normalized email through `escapeHtml` (`../escape.js`, already imported at `:7`)".
Add to Task 2's acceptance criteria: "a test asserts an email containing `<script>` renders escaped."

---

## G4 (BLOCKING). `check:surface` will drift in Task 3, which the global constraints forbid.

**Claim.** Global constraints: "`check:surface -- --update` regenerated and committed in the task
that adds surface (Task 1); every later task leaves `check:surface` green without `--update`."

**Evidence.** `LoginData` is an EXPORTED interface (`auth-routes.ts:59-63`: `siteName`, `error`,
`csrf`), returned by `loginLoad` and named on the exported `AuthRoutes` interface (`:441`).
`check-surface.mjs` exists precisely to catch this class: its header (`:1-12`) says it "renders the
FULL declared shape of every export ... A renamed or retyped field on a `*Data` interface, the
developer's real upgrade guarantee, slips past both [other gates]". Task 3's "hand-off shape"
changes `LoginData`, so `docs/internal/api-surface.md` drifts and the gate goes RED without
`--update`. The same applies to `src/lib/components/LoginPage.svelte`'s `Props.data` literal
(`LoginPage.svelte:18-27`), published on `./components`.

**Exact plan text to change.** In Global constraints, replace the parenthetical with "(Tasks 1 and 3;
Task 3 changes the exported `LoginData` shape at `auth-routes.ts:59-63` and `LoginPage`'s `data`
prop, both snapshotted by `check:surface`)". Add the snapshot file to Task 3's Files list and
`--update` to its Step 1.

---

## G5 (BLOCKING). The probe's 302 arm cannot fire: the fetch follows the redirect.

**Claim.** Task 4: "the GET arm classifies the response: a 302 whose `Location` host ends in
`cloudflareaccess.com`, or any 401/403, is PASS".

**Evidence.** `src/lib/doctor/check-probe.ts:46`: `const res = await ctx.fetch(String(new
URL('/admin/login', origin)));`, no init object, so the platform default `redirect: 'follow'`
applies. An Access 302 is followed transparently and the probe sees Access's own login page: a 200,
with no `data-cairn-identity` marker and no `?/request` form, which under the plan's own three arms
falls into no arm at all (the third arm is "a 200 with the magic-link form"). `ctx.fetch` does take
an init (`:106-113` passes one), so the fix is available but must be stated. The 401/403 half works
as written.

**Exact plan text to change.** In Task 4 Files, after "the GET arm classifies the response", insert:
"the GET at `check-probe.ts:46` is re-issued with `{ redirect: 'manual' }` so the gate's 302 is
observable at all, and a 200 that carries neither the marker nor a `?/request` form is a fourth
outcome (FAIL, 'the origin answered a page this probe does not recognize')". Add the fourth outcome
to the acceptance criteria's "the three outcomes tested".

---

## G6 (SIGNIFICANT). "`jose` declared per `check:snippets`'s convention" describes a convention that
does not exist, and the acceptance criterion overclaims what the gate proves.

**Claim.** Ruled inputs: "No `jose` in `package.json`; the recipe's fenced block declares it per
`check:snippets`'s convention." Task 5 AC: "`check:snippets` green with the recipe block counted".
Spec: "typechecked by `check:snippets` against the built package".

**Evidence.** `scripts/checks/check-snippets.mjs:60-76`, `isRealSpecifier`: the package's own
specifiers are real; relative and `$`-aliased ones never are; "Any other bare specifier is real
exactly when it resolves as an actual dependency of this package (so a devDependency a doc page
mentions but this repo does not install ... stubs automatically **with no allowlist to maintain**)".
`jose` is not installed, so `import { jwtVerify, createRemoteJWKSet } from 'jose'` is rewritten
automatically to `declare const jwtVerify: any; declare const createRemoteJWKSet: any;`
(`declFor`, `:80-82`). There is nothing to declare and no convention to follow. The consequence
matters: every `jose` call in the recipe typechecks as `any`, so the gate proves only cairn's own
types (`IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal`) and NOT the `jwtVerify` options,
the `issuer`/`audience`/`algorithms` pinning, or the payload access the spec leans on.

**Exact plan text to change.** In Ruled inputs, replace "the recipe's fenced block declares it per
`check:snippets`'s convention" with "`jose` is not a dependency, so `check:snippets` stubs it to
`any` automatically (`check-snippets.mjs:60-76`); no declaration is needed and none is possible".
In Task 5 AC, replace "`check:snippets` green with the recipe block counted" with "`check:snippets`
green; the gate proves the recipe's cairn types only, since `jose` stubs to `any`, so the
`jwtVerify` options and the payload handling are proven by the `web-auth-security-reviewer`'s read
alone, and the pass records that as the limit of the proof".

---

## G7 (SIGNIFICANT). No throw path for `identity.resolve`, so a site's resolver throws a raw 500.

**Claim.** Ruled inputs give the contract as `resolve(event) => Promise<ResolvedIdentity |
IdentityRefusal>` and Task 2's tests enumerate `missing`, `invalid`, "a site's own word". Nothing
covers a rejected promise.

**Evidence.** The recipe's own path throws routinely: `createRemoteJWKSet` fetches over the network
and `jwtVerify` throws on every verification failure, so a resolver that forgets one `try` produces
an unhandled rejection inside the guard's `handle`. The spec review supplied the fix text verbatim
("the guard wraps `identity.resolve` in try/catch; a throw is a refusal logged with
`detail: 'error'`", `spec-review.md` B5 fold text) and neither spec rev 2 nor the plan carries it.
Every other refusal in this guard is deliberate and closed (`guard.ts:96, 104, 117, 127, 164`); an
open throw here would be the one exception.

**Exact plan text to change.** Add to Ruled inputs, under "The resolver contract": "the guard wraps
`identity.resolve` in try/catch; a throw is treated as a refusal with `detail: 'error'` and the
error string scrubbed, never rethrown." Add the case to Task 2's test list and to its acceptance
criteria.

---

## G8 (SIGNIFICANT). Pin `findEditor`, and correct where normalization actually happens.

**Claim.** Task 2b: "look the roster row up with the store's existing `findEditor` or equivalent".
Ruled inputs: "The guard normalizes `email` (trim, lowercase) before the roster lookup." Task 2
test: "the email normalized before lookup (`\" Owner@Example.org \"` matches `owner@example.org`)".

**Evidence.** `findEditor` exists, exactly: `src/lib/auth/store.ts:52-58`,
`findEditor(db: D1Database, email: string): Promise<EditorRow | null>`. It normalizes internally
(`.bind(normalizeEmail(email))`, `:55`; `normalizeEmail`, `:34-36`), and the module header
(`store.ts:4-10`) states the store-level invariant that every email argument is normalized THERE
rather than at the caller. So the lookup is already case-safe with or without a guard-side
normalize; the guard's own normalize is needed for the LOG record and the escaped condition page,
not for the join. `EditorRow` is `{ email; displayName; role }` (`store.ts:45`); `Editor`
(`auth/types.ts:13-18`) adds `capability`, non-optional `displayName`, which is why the spec's
fallback chain (resolved `displayName` → roster row's → email) is required.

**Exact plan text to change.** In Task 2b Files, replace "the store's existing `findEditor` or
equivalent" with "`findEditor(db, email)` (`src/lib/auth/store.ts:52-58`), which returns
`EditorRow` and normalizes the email itself (`store.ts:34-36`)". In Ruled inputs, replace "The
guard normalizes `email` (trim, lowercase) before the roster lookup" with "The guard normalizes
`email` (trim, lowercase) for the log record and the unrostered page; the lookup is normalized
again inside `findEditor`, the store's own invariant." Reword the test case accordingly.

---

## G9 (SIGNIFICANT). `confirmLoad` is left live and still echoes a raw token into HTML.

**Claim.** Task 3 acceptance criteria: "the four cases green both ways"; Task 3 Files names
`loginLoad`, `requestAction`, `confirmAction`, `logoutAction`.

**Evidence.** `AuthRoutes` has FIVE handlers (`auth-routes.ts:440-446`). `confirmLoad`
(`:265-272`) returns `token: event.url.searchParams.get('token') ?? ''` plus a freshly issued CSRF
token, and `ConfirmPage.svelte` renders it. Under identity mode its own action 404s, so the page
can never lead anywhere, yet `/admin/auth/confirm?token=…` stays a live reflector on a public admin
path. The spec review filed this as S7 with the fix text ("under `identity`, `confirmLoad` 404s
alongside the two actions"); spec rev 2's handler list (`:145-152`) silently dropped it, and the
plan inherited the drop. This is the one item on the plan the merge-gating
`web-auth-security-reviewer` is most likely to return as a fix.

**Exact plan text to change.** Add `confirmLoad` to Task 3's Files line ("`confirmLoad` returns 404
in identity mode alongside `requestAction` and `confirmAction`"), to the test list, and change
"the four cases" to "the five cases" in the acceptance criteria. If the pass deliberately keeps
`confirmLoad` live, say so in Ruled inputs with the reasoning, so the reviewer does not re-file it.

---

## G10 (MINOR). Task 1's `guard.ts` anchor is wrong; Tasks 3 and 4's are loose but usable.

**Evidence.** `AuthGuardOptions` is `guard.ts:33-63` (the JSDoc opens at `:33`, the interface body
`:34-63`). The plan's "`:26-45`" straddles `isPublicAdminPath` (`:24-27`) and `isAdminPath`
(`:29-31`) and cuts the option block in half. Task 3's "`logoutAction` at about `:404-433`" is
`:403-434` (verified correct enough). Task 4's "`:20-71` and `:95-144`": the GET arm the task
actually edits is `probe()` at `:45-73`, and the POST arm is `postRequestAction` at `:99-148`;
`:20-71` names `liveProbeCheck` (`:18-42`), which the task does not change.

**Exact plan text to change.** Task 1: "`:26-45`" → "`:33-63`". Task 4: "about `:20-71` and
`:95-144`" → "`probe()` at `:45-73` (the GET arm) and `postRequestAction` at `:99-148`
(unchanged)".

---

## G11 (MINOR). "the login page component the routes render" is not a real relationship; name the file.

**Evidence.** `loginLoad` (`auth-routes.ts:247-254`) returns a `LoginData` object; it renders
nothing. The component is `src/lib/components/LoginPage.svelte`, published on `./components`, and
the consuming site's `+page.svelte` renders it with `data` and `form` props
(`LoginPage.svelte:18-29`). The plan lists it under Task 3's `auth-routes.ts` bullet with no path.
Separately, Task 4 says "the probe's unit tests" without naming the file: it is
`src/tests/unit/doctor-check-probe.test.ts`.

**Exact plan text to change.** Task 3 Files: "the login page component the routes render" →
"`src/lib/components/LoginPage.svelte` (whose `data` prop `loginLoad`'s return feeds)". Task 4
Test: "the probe's unit tests" → "`src/tests/unit/doctor-check-probe.test.ts`".

---

## G12 (MINOR). The `migration-notes.md` entry contradicts that page's own contract.

**Evidence.** `docs/extend/migration-notes.md:1-10` defines the page as "The per-version record of
what a consumer **must do** ... distilled from `CHANGELOG.md`'s own `Consumers must:` lines ...
**A version not listed here stated no consumer action for that release.**" The plan's own Task 6
says the CHANGELOG entry carries "no `Consumers must:`", so by the page's contract this pass
contributes no entry at all. Writing "a site with no `identity` option sees no change" makes the
page's silence-means-no-action rule ambiguous for every future reader.

**Exact plan text to change.** Delete `docs/extend/migration-notes.md` from Task 5's Modify list,
and in Task 6's acceptance criteria replace "the changelog and migration entries present" with "the
changelog entry present; no migration-notes entry, since the change carries no `Consumers must:`
line (`migration-notes.md:1-10`)".

---

## G13 (MINOR). The post-freeze notes file IS committed; the conditional is dead weight.

**Evidence.** `git ls-files` returns
`docs/internal/record/2026-09-04-cairn-case/26-post-freeze-notes.md`. The uncommitted file in that
directory is `25-front-door-proposal.md`.

**Exact plan text to change.** Task 5: delete "this file is uncommitted on `main`, so the task
edits it only if it is present in the worktree, else reports".

---

## G14 (MINOR). Name the D1 integration exemplar rather than describing it.

**Evidence.** The pattern is fixed and reusable: `src/tests/integration/auth-guard.test.ts`
(`import { env } from 'cloudflare:test'`; `const db = env.AUTH_DB`; an `asHandle` shim bridging
kit's `Handle` to the lighter `CairnEvent` fixture; a `beforeEach` truncating `session` and
`editor`), with `_auth-harness.ts` and `_apply-migrations.ts` beside it and the `integration`
project defined at `vitest.config.ts:103`. The plan describes the setup in prose ("workerd project,
miniflare `AUTH_DB` with the applied migrations") and leaves the implementer to rediscover it. The
proposed filenames themselves fit the directory's convention.

**Exact plan text to change.** Task 2 Test line: after "(workerd project", insert "on the
`src/tests/integration/auth-guard.test.ts` harness verbatim: `env.AUTH_DB` from `cloudflare:test`,
its `asHandle` shim, `./_auth-harness.js`, and `_apply-migrations.ts`".

---

## G15 (MINOR). Task 6's "whole-log triage" is a rewrite of a file the parallel pass also writes.

**Evidence.** The header says the two passes "share no source file, only `CHANGELOG.md`,
`ROADMAP.md`, `docs/STATUS.md`, and the friction log, which the last task of whichever merges
second reconciles". A whole-log triage of `docs/internal/docs-friction-log.md` (Task 6) deletes and
promotes entries across the file rather than appending, so the second merge is a manual re-triage,
not a reconcile.

**Exact plan text to change.** Task 6: "(whole-log triage)" → "(triage only the entries this pass
touched or created; a whole-log triage waits until chassis-B1 has merged, since it rewrites a file
both passes hold)".

---

## G16 (MINOR). Record the override of the review's split recommendation.

**Evidence.** `spec-review.md` Part 2 recommends "the two doors: a docs-only follow-up ... Not
here", on the grounds that they were discovered by a different input and share only the extend page
they land near ("adjacency, not dependency"). The plan's Ruled inputs keep them ("ride in Task 5
bounded to one section each") with no record that the recommendation was weighed. The bound is a
reasonable answer; the silence is the problem, because the pass-sizing rule asks for the override to
be named.

**Exact plan text to change.** Ruled inputs, the two doors line: append ",  the spec review
recommended cutting them to a follow-up pass (adjacency, not dependency); Geoff's routing keeps
them, and the one-section bound is the mitigation, recorded here so the pass-end sizing score reads
it as a deliberate override."

---

# What I verified as CORRECT

Recorded so no later reader re-checks these.

- **`guard.ts:175-195`** is exact. The session-resolution block opens at `:175` and closes at
  `:195`, and the five bundled pieces the spec names are all where the spec says they are.
- **`checks-cloudflare.ts:197`** is right. The `auth.store` check is `id: 'auth.store'` at `:156`;
  its owner-row failure is `return fail('the editor table holds no owner-capability row')` at
  `:199`, naming no remedy today, so the plan's "remedy string names the out-of-band seed" is a
  real one-string deliverable and the line reference is close enough to find in one look.
- **`auth-routes.ts:403-434`** matches the plan's "about `:404-433`" for `logoutAction`, and
  "`requireDb` stays" is correct: `requireDb` is called at `:404` before any cookie work, `db` is
  used only inside `if (id)` at `:425`, and `AUTH_DB` stays required by `guard.ts:126`, so it
  cannot throw. The four cookie deletes at `:411-419` already do the "clears cairn's own cookies"
  half unchanged.
- **`docs/admin/is-it-working.md` is the right anchor home.** `check-readiness.mjs` hard-codes
  `const DOC = 'docs/admin/is-it-working.md'`, and every registry entry's `docsAnchor` is
  `is-it-working.md#<slug>` (`conditions.ts:40, 49, 58, …`). The doc's headings are `##`-level
  (`:167, 178, 189, …`), so two new `##` sections is the right shape. The gate is fail-closed both
  ways: a condition with no anchor and an anchor with no heading both go RED.
- **The condition entry shape** is `id`, `severity`, `title`, `why`, `remediation`, `docsAnchor?`,
  `logEvent?` (`conditions.ts:10-30`), with `auth.csrf-token-invalid` (`:43-51`) as the exemplar
  the plan should imitate. `logEvent` is typed `CairnLogEvent`, so Task 2a's ordering (add
  `auth.identity.unknown` to `src/lib/log/events.ts` in the SAME step) is necessary and correct.
- **`check:symbols`'s third registry** is exactly what the plan assumes: `check-symbols.mjs:26-36`
  resolves a dotted-lowercase token against the union of the log-event union, the condition
  registry, and every `DoctorCheck.id`. So condition ids and the new event must exist in code
  before any doc names them, the plan's Task 2a-before-2b-before-Task-5 ordering is right.
- **Every gate script the plan names exists** in `package.json`: `check:arm-indexes`,
  `check:prose`, `check:readiness`, `check:symbols`, `check:snippets`, `check:docs`,
  `check:consumers`, `check:reference`, `check:reference:signatures`, `check:surface`,
  `check:comments`, `check:transcripts`, `check:idioms`, `check:cm-internals`,
  `check:rulings-format`, `check:vale`. `check:surface` runs `check-surface-leaks.mjs` in the same
  script, so the plan need not list it separately.
- **`check:prose` really does cover the hand-off copy.** `check-admin-prose.mjs:22` scans
  `src/lib/components/*.svelte`, including markup text, precisely because the compiled copy ships
  inside the package where a consuming site's own prose hook can never see it.
- **`check:arm-indexes` is satisfied by the planned `docs/extend/README.md` edit.** The gate is a
  set difference: every `.md` in `docs/extend` must be linked from `docs/extend/README.md`
  (`check-arm-indexes.mjs:28-31`), so the new page plus the auth-list edit is exactly what it wants.
- **`check:snippets` covers the new page.** `DOC_DIRS` includes `docs/extend`
  (`check-snippets.mjs:46`), and the per-block standalone typecheck plus the
  `<!-- snippet-check-skip: … -->` opt-out are the mechanics the recipe will meet.
- **The `guard.rejected` log row is the right edit surface.** `docs/reference/log-events.md:42`
  enumerates the reason values inline in the fields column AND explains them in prose, so Task 2a's
  "the reason and the new row" names a real two-part edit. That row also states outright that
  `hasSession` is "presence-only, whether a session cookie arrived, never a resolved identity", so
  the plan's acceptance criterion "`hasSession` not redefined" is both meaningful and satisfiable.
- **The downstream `Editor` contract reproduces cleanly.** `resolveCapability(vocabulary, role)`
  (`guard.ts:189`) returns `'none'` for an unknown name, the unknown-role warning at `:186-188` is
  reusable as is, and `locals.cairnAccess = access ?? {}` (`:194`) is the shape the identity branch
  must repeat, all as the plan assumes.
- **The integration filename convention fits.** `src/tests/integration/` uses
  `<area>-<topic>.test.ts` with `_`-prefixed harnesses, so `auth-guard-identity.test.ts` and
  `auth-routes-identity.test.ts` are correctly named. (Note the spec put the routes' cases under
  Unit at `:222`; the plan's move to integration is the better call, since `logoutAction` needs
  `requireDb` and a real `AUTH_DB`, and is worth one line saying so.)
- **The token ceiling's line estimates hold.** The spec review's own table budgets ~420-600 engine
  lines for a scope that included the owner bootstrap (25-40) and the config threading (20-30),
  both of which spec rev 2 removed, landing at ~375-530 against the plan's "about 500". The docs
  half (new extend page 220-300 plus the eight-file edit set 150-220) lands at ~420-560 against the
  plan's "about 500". "About 24 tests" is the review's A+B count and includes 10 `jose` unit cases
  this pass does not carry, so the ceiling has headroom rather than a shortfall.
- **No `jose` in `package.json`**, as the ruled inputs claim, and no `check:target-stack` row is
  owed, the review's G10 caveat applied only to shipping `jose` as a real dependency.
- **The chassis-B1 non-contention claim holds for source.** None of `guard.ts`, `auth-routes.ts`,
  `conditions.ts`, `condition-response.ts`, `check-probe.ts`, `checks-cloudflare.ts`, or
  `log/events.ts` is a chassis-surface file; the only real overlap is the four shared docs the
  header already names (see G15 for the friction-log half).
- **The plan's anchors were verifiable at authoring time.** `git diff de2bf1cb..HEAD` over
  `guard.ts`, `auth-routes.ts`, and `check-probe.ts` is empty, so the errors in G10 are authoring
  slips, not drift, and re-verifying at dispatch will not fix them.

---

# Top five

1. **G1**, the identity branch anchored at `guard.ts:175-195` sits inside `!isPublicAdminPath`
   (`:25-27`), so `locals.cairnIdentity` never reaches `/admin/login` or `/admin/auth/**` and all of
   Task 3 is dead code. The assignment must move outside the block.
2. **G2**, Task 1 misses `src/lib/sveltekit/types.ts:84-89`, the second `locals` declaration the
   engine's own structural events use. Without it the guard's write and every route read fail
   `npm run check`.
3. **G3**, `renderConditionResponse(id, { url? })` (`condition-response.ts:40`) cannot carry the
   email or the label, no existing page interpolates request data, and `REASON_CONDITION` is keyed
   by `guard.rejected` reason, so it cannot hold both new ids.
4. **G5**, `check-probe.ts:46` fetches with the default `redirect: 'follow'`, so the Access 302
   the new PASS arm keys on is never observable; the probe needs `{ redirect: 'manual' }`.
5. **G6**, "`jose` declared per `check:snippets`'s convention" describes nothing real
   (`check-snippets.mjs:60-76` auto-stubs it to `any` "with no allowlist to maintain"), and the
   acceptance criterion therefore claims a proof the gate does not deliver.

---


Objects: `/var/home/glw907/Projects/cairn-cms/docs/superpowers/plans/2026-09-07-identity-seam-pass.md`
and `/var/home/glw907/Projects/cairn-cms/docs/superpowers/specs/2026-09-07-identity-seam-design.md`
(revision 2). Prior lens: the security section of
`/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-07-identity-seam/spec-review.md`
(B1-B6, S1-S13, N1-N11). Code read in full: `src/lib/sveltekit/guard.ts`,
`src/lib/sveltekit/auth-routes.ts`, `src/lib/sveltekit/condition-response.ts`,
`src/lib/doctor/check-probe.ts`, plus `src/lib/sveltekit/cairn-admin.ts`,
`src/lib/sveltekit/admin-dispatch.ts`, `src/lib/auth/store.ts`, `src/lib/doctor/bin.ts`,
`src/lib/github/repo.ts`, `src/lib/escape.ts`.

Severity vocabulary as dispatched: **blocking** (do not dispatch the task as written),
**should-fix** (dispatchable, leaves an exploitable or operationally dangerous gap),
**note** (residual worth recording).

## Part A: fold audit of the prior lens's findings

| prior | status in spec rev 2 / plan | where |
|---|---|---|
| B1 inverted probe | folded, **minus its second arm** | S6 below |
| B2 two-config problem | folded in prose (decision 7), **falsified by the plan's own file anchor** | S1 below |
| B3 cookie fallback | folded (header-only, spec:186); revocation residual only half-stated | S11, S22 |
| B4 no-email / token-type check | half-folded: `email` string check kept, `type: 'app'` dropped, guard-side defensive check dropped | S7, S9 |
| B5 reason vocabulary | half-folded: a free-form `reason` is logged; the `keys` class, the error-level rule, and the try/catch dropped | S7, S8 |
| B6 unverified email claim / login-method floor | **fell through entirely** (no "One-time PIN", "login method", "social", or "verified" string in either document) | S2 |
| S1 CSRF rotation residual | folded as a stated residual; the concrete attack never written down | S22 |
| S2 issuance-before-CSRF | moot (G1: the shell issues the cookie); correctly dropped | - |
| S3 `hasSession` | folded (plan:143-144, 156-157: "not redefined", "untouched") | S18 |
| S4 guard-side bootstrap | folded by cutting it (decision 6); the `bootstrapOwner` dead-config consequence not stated | S12 |
| S5 `teamDomain`/`aud` validation | fell through (now recipe-only, and the recipe does not mention the scheme trap) | S9 |
| S6 `logoutUrl` open redirect | folded in principle, **the fold dropped the words that made it safe** | S4 |
| S7 `confirmLoad` still live | **fell through** (no `confirmLoad` string in spec or plan) | S3 |
| S8 escaped email | folded for `email`; `label` and `displayName` and the 320-char cap dropped | S16, S10, S15 |
| S9 log-events guarantee | **fell through** (the row is added, the guarantee sentence is not amended) | S15 |
| S10 local dev story | **fell through** | S14 |
| S11 Access CORS vs the header witness | **fell through** | S20 |
| S12 jose bounds / clock tolerance / key-source pinning | fell through | S8 |
| S13 `CairnEvent` not `RequestEvent` | **fell through**; spec:78 still reads `resolve(event: RequestEvent)` | S17 |
| N1 no session-cookie fallback as a property | fell through (no property statement, no test) | S20 |
| N3 no cache rule on /admin | fell through | S20 |
| N5 Access path-scoping edges | fell through | S20 |
| N6 public admin paths resolve no identity | stated in the prior review, and it is the mechanism of S1 | S1 |
| N7 Access session duration replaces cairn's constants | fell through | S11 |
| N8 no rate limit on the identity path | fell through | S20 |

---

## Part B: findings, ranked

### S1 (blocking). Task 2's file anchor puts the identity branch where public admin paths never reach it, so Task 3's entire magic-link shutdown is dead code and B2 comes back alive

**Mechanism.** Plan:131-135 pins the branch to `src/lib/sveltekit/guard.ts` "at about `:175-195`".
That range is the body of `if (!isPublicAdminPath(pathname))` (`guard.ts:175`). `isPublicAdminPath`
is `pathname === '/admin/login' || pathname.startsWith('/admin/auth/')` (`guard.ts:25-27`). The
magic-link surface lives on exactly those paths: `/admin/login` dispatches `loginLoad`
(`admin-dispatch.ts:64`, `cairn-admin.ts:151`), `/admin/auth/confirm` dispatches `confirmLoad`
(`admin-dispatch.ts:87`, `cairn-admin.ts:153`), and `?/request` / `?/confirm` post to those same
public URLs (`cairn-admin.ts:273-274`).

So under the plan as written, `locals.cairnIdentity` is undefined on every request that reaches the
magic-link handlers, and Task 3's four branches (plan:163-173) never fire. The shipped result is a
site running an Access gate in front of `/admin` while `/admin/login` still renders the magic-link
form, `POST /admin/login?/request` still mints tokens, sends email, and writes token rows
(`auth-routes.ts:216-236`), and `POST /admin/auth/confirm?/confirm` still creates session rows the
guard no longer reads (`auth-routes.ts:330-348`). That is exactly the "gate live beside a live
token-minting login" state B2 was folded to prevent, reintroduced by a line number.

Corollary that shows the split concretely: the shell posts logout to `/admin?/logout`
(a gated path), so logout would take the identity branch, while a site mounting `logoutAction` at
its documented `/admin/auth/logout` (`auth-routes.ts:369`) hits a public path and takes the
magic-link branch, deleting a nonexistent session row and redirecting to `/admin/login` instead of
the IdP. One handler, two behaviors, decided by mount point.

**Exact plan text to change.** Plan:131-135, replace the anchor sentence with:

> Modify (2b): `src/lib/sveltekit/guard.ts`. `locals.cairnIdentity = { label, logoutUrl }` is set
> for EVERY admin path when `identity` is configured, immediately after the bindings refusal at
> `:126-133` and BEFORE the CSRF stage at `:145`, so the public admin paths (`/admin/login`,
> `/admin/auth/**`, `guard.ts:25-27`) carry it too; the identity resolution, roster lookup, and the
> two refusal paths stay inside the `!isPublicAdminPath` branch at `:175-195`, since a public path
> resolves no identity by design (prior review N6).

And plan:54-56, replace "on every admin path it handles in identity mode" with "on every admin path,
the public ones included, since the magic-link handlers live only on public paths".

Add to Task 2's test list: "with `identity` configured, `GET /admin/login` and
`POST /admin/login?/request` both carry `locals.cairnIdentity`". Add to Task 3's:
"`POST /admin/login?/request` 404s and emits no `auth.token.minted` and no `auth.link.requested`,
mounted through `createCairnAdmin` with no identity-aware admin config."

---

### S2 (blocking). B6 fell through: nothing in the spec or the plan tells an operator that the Access application must only enable login methods that prove control of the asserted email

**Mechanism.** The roster join is the email claim, and cairn accepts whatever the token carries
(plan:131-135, spec:98-104). Access applications commonly enable more than one login method, and the
impersonation floor is the weakest one enabled: a generic OIDC connection (which is how the spec
itself wires Google Workspace, spec:29-32) or a social IdP asserts an `email` the end user may
control. An attacker admitted by any enabled method asserts a rostered owner's address and the guard
builds that owner's `Editor` with full capability. The magic-link path this replaces proved mailbox
control by construction; this one does not, and the shipped docs never say so.

**Evidence.** spec-review:246-283 (B6, with the exact paragraph to add). Neither
`docs/superpowers/specs/2026-09-07-identity-seam-design.md` nor the plan contains the strings
"One-time PIN", "login method", "social", "verified", or "mailbox" (grepped).

**Exact plan text to change.** Task 5's page contents (plan:207-215), insert after "the migration
step on roster emails":

> a REQUIRED "which login methods are safe" section, stated before the recipe: the email claim is
> the entire join between the gate and the roster, so the Access application must enable only methods
> that prove control of the address they assert (a Workspace or Entra directory, or Access's own
> One-time PIN); enabling a second method widens the floor to the weakest one, since every enabled
> method's token carries the same `aud` and verifies identically here; never enable a social IdP or a
> generic OIDC connection whose `email` claim the end user can edit on an application that gates a
> cairn admin. cairn cannot distinguish a directory-asserted address from a self-asserted one.

Repeat the same paragraph in the Task 5 edit to `docs/extend/security-model.md`, and add it to the
`web-auth-security-reviewer`'s named merge-gate inputs at plan:256-258.

---

### S3 (blocking). `confirmLoad` fell through: under identity mode the confirm page stays live, reflects an attacker-chosen `?token=` into an admin-origin document, and issues a CSRF cookie

**Mechanism.** `confirmLoad` (`auth-routes.ts:261-269`) reads `event.url.searchParams.get('token')`
into `ConfirmData.token`, sets `Referrer-Policy: no-referrer`, and calls `issueCsrfToken`. Task 3
(plan:163-173) changes `loginLoad`, `requestAction`, `confirmAction`, and `logoutAction`, and never
names `confirmLoad`; the spec's magic-link section (spec:144-152) omits it too. So on an
identity-mode site `/admin/auth/confirm?token=<anything>` remains a public, reachable admin-origin
page that renders attacker-supplied content, mints a 30-day CSRF cookie, and hosts a form posting to
an action that 404s. It also keeps a token-bearing URL surface alive for email scanners and access
logs on a site that has no tokens at all.

**Exact plan text to change.** Plan:163-165, extend the `auth-routes.ts` modify line:

> `requestAction`, `confirmAction`, and `confirmLoad` all return 404 in that mode, so `/admin/auth/**`
> serves nothing and the hand-off page at `/admin/login` is the only public admin surface. The 404 is
> raised before `requireDb`, before `request.formData()`, and before any cookie write.

Add to Task 3's test list: "`GET /admin/auth/confirm?token=x` 404s and sets no cookie."

---

### S4 (blocking). Task 1's `logoutUrl` rule, as the plan words it, admits `//evil.example`

**Mechanism.** Plan:59-61 ruled input: "a same-origin path starting with `/` or an absolute `https:`
URL". Plan:103-105 tests only that construction "rejects a `logoutUrl` that is neither a `/` path nor
`https:`". A literal `value.startsWith('/')` admits every scheme-relative and backslash variant:
`//evil.example` (a browser treats it as `https://evil.example`), `/\evil.example` and `/\/x`
(WHATWG treats `\` as `/` in a special-scheme URL), `/%2f%2fevil.example` after a decoding layer, and
`/\t//evil.example` with a leading control character. The redirect is reached from an authenticated
POST, so it is a weak open redirect, but the engine claimed to close it (spec:150-152) and, as
worded, does not. The prior lens's fix text said "a single `/`" and enumerated the variants
(spec-review:389-405); the fold at spec:150-152 and plan:59-61 dropped both.

**Exact plan text to change.** Plan:59-61, replace the parenthetical with:

> (a root-relative path matching `/^\/(?![\\/])/` after rejecting any value containing a backslash,
> a control character, or a whitespace character, or an absolute URL whose parsed `protocol` is
> exactly `https:`; anything else throws at `createAuthGuard`, per the OWASP Unvalidated Redirects
> and Forwards cheat sheet). The guard publishes the validated value onto `locals.cairnIdentity` at
> construction time and the routes redirect to that snapshot, never re-reading `identity.logoutUrl`
> per request.

Plan:103-105, replace the test line with an enumerated table: accept `/goodbye` and
`https://team.cloudflareaccess.com/cdn-cgi/access/logout`; reject `//evil.example`,
`/\evil.example`, `/\/evil.example`, `\\evil.example`, `/%2f%2fevil.example`, `http://x/`,
`javascript:alert(1)`, `data:text/html,x`, `/path\r\nX-Injected: 1`, and the empty string.

---

### S5 (blocking for Task 4). The probe follows redirects, so the 302 arm the plan classifies on is never observed in production, and the unit tests will pass anyway

**Mechanism.** `ctx.fetch` is `globalThis.fetch` (`src/lib/doctor/bin.ts:84`), whose default is
`redirect: 'follow'`. `probe()` (`check-probe.ts:46`) passes no init. Against a correctly gated site,
the runtime therefore follows Access's 302 and hands the check a 200 from
`<team>.cloudflareaccess.com`, not the 302 the plan's classifier reads (plan:186-189). The check then
falls into "a 200 whose body carries no `data-cairn-identity`" and continues into the POST arm, which
fails on the 404'd action: a correctly configured site reports FAIL with a message about the
magic-link send path. Worse for the gate, Task 4's stubbed-fetch tests (plan:196-197) hand the
classifier a synthetic 302 object, so all three tests go green while the live probe misclassifies.

Two further defects in the same classifier:

1. "a 302 whose `Location` host **ends in** `cloudflareaccess.com`" is a suffix test.
   `evilcloudflareaccess.com` and `notcloudflareaccess.com` are registrable and pass it. It must be
   `new URL(location).host` matched against `/^[a-z0-9-]+\.cloudflareaccess\.com$/i`.
2. A 302 to the team domain is an origin-attested claim. The origin under test is precisely the party
   whose trustworthiness is in question, and any open redirect or hand-written 302 on it produces the
   PASS. Only the FAIL arm (a 200 carrying cairn's own marker) is real evidence. "Any 401/403 is PASS"
   is weaker still: a WAF block, a Cloudflare error page, or a broken deploy all read as "gated by
   <host>".

**Exact plan text to change.** Plan:186-192, replace the GET-arm sentence with:

> the GET arm fetches with `redirect: 'manual'` (the probe's `ctx.fetch` is the global fetch, which
> otherwise follows the gate's 302 and the classifier never sees it) and classifies: a 301/302/303/307
> whose `Location` parses and whose `host` matches `/^[a-z0-9-]+\.cloudflareaccess\.com$/i` is PASS
> "gated by <host>"; a 401 or 403 is INFO "the origin refused this request, which is consistent with a
> gate but does not prove one", never PASS; a 200 whose body carries `data-cairn-identity`, OR a 200
> that carries no form posting the `?/request` action, is FAIL "the origin answers without the gate:
> `/admin` is reachable directly"; a 200 with the magic-link form continues into today's POST arm
> unchanged.

Add to Task 4's acceptance criteria: "the GET is issued with `redirect: 'manual'`, asserted by a test
that inspects the init the stubbed fetch received; a `Location` of
`https://evilcloudflareaccess.com/x` does NOT pass."

---

### S6 (blocking). B1's second arm was demoted to a remediation string, so the exposure the whole design exists to close stays undetected

**Mechanism.** The real failure shape is not "Access off" but "Access on for one hostname while the
same Worker stays reachable on another" (`*.workers.dev`, a second custom domain, a preview alias).
On that hostname `/admin` is served with no Access in the path, so neither Access policy nor Access
revocation applies, and the only remaining control is the JWT check, which any holder of an unexpired
token for that AUD passes, including an editor whose IdP account was disabled minutes ago. The prior
lens asked for an active second arm reading the wrangler config and probing the `workers.dev`
hostname (spec-review:59-63). Plan:190-192 keeps only "the remediation naming the Access application's
path and the `workers.dev` route", i.e. prose in a failure message that never fires on the very
deployment that has the problem, because the primary hostname probe passes.

**Exact plan text to change.** Plan:190-195, add to the Task 4 file list and the step:

> a second arm: read `workers_dev` through `readWranglerConfig` (`src/lib/doctor/wrangler-config.ts`);
> when it is not `false`, probe `https://<name>.<subdomain>.workers.dev/admin` with the same manual
> redirect and classify a 200 as FAIL "the Worker serves /admin on a hostname the Access application
> does not cover"; a `workers_dev: false` config skips the arm with that reason.

Add the matching acceptance criterion and one stubbed-fetch test.

---

### S7 (should-fix). The guard does not defend against its own seam: no try/catch on `resolve`, no runtime shape check on the returned `email`

**Mechanism.** `identity` is site-supplied arbitrary code. Plan:131-135 has the guard "call
`resolve`, normalize the email, look the roster row up". Two unhandled cases:

1. A resolver that throws (a JWKS timeout the recipe does not catch, a TypeError in site code)
   propagates out of `handle` and SvelteKit answers a raw 500, not the refusal page the whole
   design rests on. B5's try/catch sentence (spec-review:236-239) was not folded.
2. A resolver returning `{ ok: true, email: undefined }` (the `payload.email` case B4 describes, which
   the recipe's own `email` check is supposed to prevent but a site's edited copy will not) reaches
   `.trim()` and throws, or reaches `findEditor(db, '')` (`store.ts:52-58`) and renders the unrostered
   page for the empty string. B4's guard-side sentence
   ("the guard does not trust its shape", spec-review:191-193) was not folded either.

**Exact plan text to change.** Plan:131-135, append:

> the guard wraps `identity.resolve` in try/catch: a throw is a refusal rendering
> `auth.identity-unresolved` and logging `guard.rejected` with `reason: 'identity'` and
> `detail: 'error'` plus the thrown message capped at 300 characters (never a token), and is never a
> 500; and a `ResolvedIdentity` whose `email` is not a string, or is empty after normalization, is
> treated as a refusal rather than a roster lookup.

Add to Task 2's test list: "a resolver that throws renders the unresolved condition and logs
`detail: 'error'`, never a 500; a resolver returning a non-string or empty `email` renders the
unresolved condition and performs no roster query."

---

### S8 (should-fix). No `keys` refusal class and no jose bounds, so a JWKS outage and a mistyped AUD both read in the log as "someone bypassed the gate"

**Mechanism.** The refusal classes the plan hands the recipe (plan:213-214, spec:187-189) are
`missing`, `invalid`, `audience`, `expired`, `no-email`. A `createRemoteJWKSet` fetch failure or
timeout throws `JWKSTimeout`/`JOSEError`, which a recipe with that class list maps to `invalid`. The
operational reading of `invalid` is "a token that failed signature verification", i.e. an attack. So
a Cloudflare certs-endpoint outage produces a roster-wide lockout that reads as an intrusion, and the
two config faults that also lock everyone out forever (wrong team domain, wrong AUD) are only
distinguishable if the recipe's `audience`/`issuer` mapping is actually written. S12's `jwtVerify`
and `createRemoteJWKSet` option stance (clock tolerance, timeout, cooldown, cache age, JWKS-only key
selection) was not folded at all.

**Exact plan text to change.** Plan:212-214, replace the recipe's class list and add the bounds:

> the per-class `reason` (`missing`, `invalid`, `audience`, `issuer`, `expired`, `no-email`, `keys`),
> mapped from jose's own error classes (`JWTClaimValidationFailed` on `aud`/`iss`, `JWTExpired`,
> `JWSSignatureVerificationFailed`, `JWKSNoMatchingKey` and any fetch failure onto `keys`), with the
> page stating that `keys` and `audience`/`issuer` are operator faults that lock out the whole roster
> and deserve an alert; `jwtVerify` with no `clockTolerance` (issuer and verifier are both Cloudflare,
> so tolerance only extends an expired token's life); `createRemoteJWKSet` constructed once at
> resolver construction, never at module top level, with `timeoutDuration`, `cooldownDuration`, and
> `cacheMaxAge` written explicitly; and one sentence stating that key selection is JWKS-only and a
> token's own `jwk`/`jku`/`x5u` headers are never consulted, which is what closes the key-confusion
> class alongside `algorithms: ['RS256']`.

Also, plan:62 says `reason` is "logged, never rendered", which is correct and should stay; add that
the reason set is open (`a site's own word`) but the engine's own doc names these seven.

---

### S9 (should-fix). The recipe drops the `type: 'app'` check and says nothing about the `teamDomain` scheme trap

**Mechanism.** Access issues two `CF_Authorization` values: the per-application token and a
team-scoped global session token carrying `type: 'org'` (spec-review:180-183). Audience pinning is
the only thing separating them and the recipe relies on that implicitly. B4's `payload.type === 'app'`
check was not folded (plan:213 lists only "the non-empty-string `email` check"). Separately,
Cloudflare's own sample uses `TEAM_DOMAIN` **including** the scheme, so a developer copying the docs
into a recipe that concatenates `'https://' + teamDomain` gets `https://https://team...`, every
request fails `issuer`, and the site is totally locked out with one indistinguishable log line
(S5 in the prior review, spec-review:374-387; folded nowhere).

**Exact plan text to change.** Plan:212-213, add to the recipe bullets: "the `payload.type === 'app'`
check, refusing the team-scoped `org` session token whatever its audience says"; and add to the page
contents: "the team domain is written as a bare hostname (`<team>.cloudflareaccess.com`), stated
explicitly because Cloudflare's own sample includes the scheme, and the recipe validates it at
construction and throws naming the expected form; the AUD tag is the application's AUD, not its
application id."

---

### S10 (should-fix). A resolver-supplied `displayName` overriding the roster's puts an IdP-editable string into the site's git history and falsifies a documented invariant

**Mechanism.** spec:88-89: `displayName` "falls back to the roster row's, then to the email", i.e.
the resolver's value wins. That value flows into `locals.cairnEditor` and from there into the commit
author (`src/lib/github/types.ts:20`, `src/lib/github/repo.ts:207,230`), whose doc comment states
`author` "is derived from the verified server-side session, never request input"
(`repo.ts:267`). Under identity mode it is derived from an IdP claim, which at some enabled login
methods the end user edits (S2). One admitted editor can therefore display as another in the admin
UI and in the repository's permanent commit trail. It also reaches the media-ingest header path
(`client-ingest.ts:242-243`, `content-routes-media.ts:562`), which is `encodeURIComponent`-wrapped and
length-capped, so header injection there is closed; the git and UI paths are not.

**Exact plan text to change.** Plan:131-135, add: "the roster row's `displayName` wins; the resolver's
is used only when the roster row's is empty, and is capped at the store's own display-name bound. The
task also corrects `src/lib/github/repo.ts:267`'s 'never request input' sentence to name the identity
case." Add a Task 2 test: "a resolver asserting a `displayName` different from the roster row's yields
the roster row's on `locals.cairnEditor`."

---

### S11 (should-fix). The security-model corrections are under-scoped: the prior lens listed twelve false-or-inapplicable statements, the plan buys three

**Mechanism.** Plan:216-218 gives `docs/extend/security-model.md` one "Identity from a gate" section
carrying "the replaced piece, the rotation residual, the doctor arm". The prior lens's table
(spec-review:619-635) names twelve statements that become false or inapplicable, including
`:43-48` ("no third-party identity provider; a sign-in proves only membership in the `editor` table"),
`:45-46` ("the three lifetimes are named constants an adapter cannot loosen", which under identity is
replaced by the Access application's operator-set session duration, up to a month: prior N7),
`:225-226` ("a missing or invalid session redirects to `/admin/login` without logging", now a page
that logs), and `:424-431` (the no-CSP rationale, which rests on "an allowlisted editor's own session
attacking itself" and is weakened when the admitted population is whoever the Access policy allows).
A security model that is wrong in the shipped docs is a real defect for the only reader who consults
it.

**Exact plan text to change.** Plan:216-218, replace the `security-model.md` clause with: "each row of
the spec-review's false-statement table (`spec-review.md:619-635`) is either corrected or explicitly
scoped to the built-in magic-link path, and the section states that under identity the effective admin
session lifetime is the Access application's session duration, an operator-set value, with the advice
to set it to hours". Add the table to the security reviewer's named inputs at plan:256-258.

---

### S12 (should-fix). `bootstrapOwner` becomes dead config under identity mode, and nothing says so, which is a first-run lockout

**Mechanism.** Decision 6 removed the guard-side bootstrap, correctly. But `bootstrapOwner` fires only
inside `requestAction` (`auth-routes.ts:178-181`), which Task 3 404s. A site that turns `identity` on
while relying on `AuthRoutesConfig.bootstrapOwner` for its first owner therefore has no seeding path
at all: every editor, including the intended owner, gets the unrostered condition page. The config
value stays in `svelte.config`-adjacent site code looking effective.

**Exact plan text to change.** Plan:163-165 add to the `auth-routes.ts` behavior: "`bootstrapOwner`
never fires under identity mode, since its only call site is the 404'd `requestAction`". Plan:207-215
add to the extend page: "seed the first owner out of band BEFORE enabling `identity`;
`auth.bootstrapOwner` is inert once identity mode is on." Plan:192-193's `auth.store` remedy should
name that ordering too.

---

### S13 (should-fix). The hand-off page should mint no cookies, and `LoginData` changing shape is not "additive"

**Mechanism.** `loginLoad` currently calls `mintOrReusePendingNonce` and `issueCsrfToken`
(`auth-routes.ts:247-254`). Task 3 says only that it "returns the hand-off shape"; nothing says the
identity branch skips both. As written, an ungated public page on an identity-mode site keeps writing
a pending-login nonce that nothing can ever consume and re-anchoring a 30-day CSRF cookie
(`csrf.ts:120-132`) on every anonymous hit. Separately, `LoginData` is an exported, reference-documented
interface (`auth-routes.ts:59-63`); changing what `loginLoad` returns changes it, while plan:239 says
the changelog entry is "additive, no `Consumers must:`".

**Exact plan text to change.** Plan:163-167, add: "in identity mode `loginLoad` mints no pending-login
nonce and issues no CSRF token (the hand-off page carries no form); the return shape is a discriminated
addition to `LoginData` recorded in `check:surface` and the changelog, and the plan's 'additive, no
Consumers must:' line at Task 6 is re-checked against it. The security property rests on the two 404s,
not on the page component: a site rendering its own login page against `LoginData` may keep drawing a
form, and that form must be inert."

---

### S14 (should-fix). No local-development story, so the predictable outcome is a dev bypass inside a shipped `resolve`

**Mechanism.** Under `wrangler dev` there is no Access in front, so every admin request refuses and
the admin is unusable locally. The predictable site-authored fix is
`if (env.SOMETHING_DEV) return { ok: true, email: 'me@example.com' }` inside `resolve`, which is
invisible to both of the guard's dev-flag refusals (`guard.ts:92-98`,
`auth-channel/factory.ts`) because it is site code the guard trusts by construction. Prior S10; folded
nowhere.

**Exact plan text to change.** Plan:207-215, add to the page contents: "a warning box on local
development: never branch inside `resolve`; a site's dev build replaces the guard entirely behind its
own build-time conditional, the shape the showcase already uses
(`examples/showcase/src/hooks.server.ts`), because a resolver that returns an identity when a flag is
set is opaque to the guard's dev-backend refusals."

---

### S15 (note). The log-events guarantee is falsified and uncapped

`docs/reference/log-events.md:105-108` states that every event's `email` except
`auth.link.requested`'s belongs to an allow-listed editor. `auth.identity.unknown` fires precisely for
an address that is not on the roster. Task 2 (plan:127-128) adds the row and does not amend the
sentence. The 320-character cap the prior lens asked for (`auth-routes.ts:159-162` is the precedent) is
also absent from both the logged email and the email the unrostered page renders, so an IdP-asserted
100 KB claim becomes a 100 KB log record and a 100 KB page.

**Change:** plan:127-128, add "and the guarantee sentence at `log-events.md:105-108` is amended to name
`auth.identity.unknown` as the second exception"; plan:64-66, add "capped at 320 characters, the bound
`auth.link.requested` already applies".

---

### S16 (note). `label` is interpolated but the plan's escaping scope names only the email

Plan:64-66 says the unrostered page interpolates the requester's email "the only request data any
condition page renders". True as far as request data goes, but the spec's own copy for the unresolved
page is "this request did not arrive through `<label>`" (spec:120-121), and `label` is a site-config
string rendered into a raw HTML template built by hand in `condition-response.ts:23-37` (which escapes
only the registered condition's static fields). Either escape `label` through `escapeHtml` on both the
unresolved page and the hand-off page, or make the unresolved page's copy static and put the label only
where a Svelte component escapes it. State which.

**Change:** plan:125-127, "the two condition arms take their interpolations through `escapeHtml`
(`src/lib/escape.ts:5`): the requester's normalized email on the unrostered arm and the site-supplied
`label` on both arms."

---

### S17 (note). The seam still types `resolve(event: RequestEvent)` in the spec, against the engine's own structural-event discipline

spec:78 was not updated by the fold. `guard.ts:1-3` states the rule ("Events are typed structurally,
so the engine stays free of a site's App.* ambient types") and the `audit-auth-authchannelevent` ruling
records it. Task 1 (plan:93-105) does not name the parameter type at all, so the implementer will copy
the spec. Security-adjacent: the event type is what governs what the seam can reach.

**Change:** plan:58-59, "the resolver contract: `resolve(event: CairnEvent) => Promise<...>`, the
structural type every other engine seam takes; the reference page states why this seam gets the full
event where `lookup`/`verify` take a narrow `{ env }` context (it must read request headers)."

---

### S18 (note). Ordering against the dev-backend and bindings refusals checks out; recorded so it is not re-derived

The dev-backend refusal (`guard.ts:92-98`, a 503 before anything else) and the bindings refusal
(`guard.ts:126-133`, `config.bindings-missing` on every admin path including the public ones) both
precede any identity work, so an identity-mode site with a missing `AUTH_DB` fails closed on the
operator-fault page and a polluted dev flag still 503s. Both correct. Two residuals worth one sentence
each in the security model: `hasSession` on the CSRF rejection record is structurally always `false`
under identity (correctly, per the folded S3), so the field now means "no session cookie exists on this
site" rather than "this request carried none"; and the identity resolution deliberately runs after the
CSRF stage, which is what keeps an unauthenticated cross-site POST from triggering a JWT verification.

---

### S19 (note). 404 is the right shape, with one condition on where it is raised

A 404 on `?/request` and `?/confirm` is better than 405 (which advertises that the action exists at
another method) and better than 410 (which asserts a history this site never had). It leaks no new
signal about identity mode, because the hand-off page already names the gate to any unauthenticated
visitor, a disclosure the prior lens accepted (N4) and the doctor probe depends on. The condition:
the 404 must be raised before `requireDb` (`auth-routes.ts:299,404`), before `request.formData()`
(`:157,300`), and before any cookie write, or the identity-mode site keeps an unauthenticated
body-parse and D1 binding read on a public POST. Covered by the text proposed in S3.

---

### S20 (note). Five prior notes fell through into neither document, each one line of docs

- **N1**: "when `identity` is set the guard never reads the session cookie and never calls
  `resolveSession`, on any path, for any reason; pre-existing `session` rows are inert" is still not
  stated as a property and has no test. Add the property to the security model and one integration
  case: a request carrying a valid pre-existing session cookie plus an identity refusal is refused.
- **N3**: no Cloudflare cache rule may match `/admin`; identity is in no cache key, and
  `applySecurityHeaders` (`admin-response.ts:33-47`) sets `private, no-store` which a "Cache Everything"
  rule overrides by configuration.
- **N5**: Access path-scoping edges: the application must cover `/admin` exactly, `/admin/__data.json`,
  and the shell's form-action URLs (`/admin?/logout`, `CairnAdminShell.svelte:949`), and must NOT cover
  `/preview/<token>` (`content-routes-preview.ts:96`), a deliberately public non-editor surface.
- **N8**: on an ungated origin, `/admin` becomes an unauthenticated endpoint performing an RSA verify per
  request; name `resolveRateLimit` (`src/lib/cloudflare/rate-limit.ts`) as the site's own remedy.
- **S11 (prior)**: the Access application's own CORS settings can make `X-Cairn-CSRF` settable
  cross-origin and collapse the guard's header witness (`csrf.ts:209-211`) without touching cairn code.
  Tell the operator to leave Access CORS disabled.

All five belong in Task 5's page-contents list at plan:207-215 and cost roughly ten lines.

---

### S21 (note). `locals.cairnIdentity` is a control channel; say what may write it

Once the routes read only `locals.cairnIdentity` (decision 7, correctly), any site `handle` running
after the guard, or any custom admin route reached through the `CairnAdminShell` seam, can set it and
thereby 404 the magic-link surface and point logout at an arbitrary URL on a site that configured no
resolver, with the construction-time `logoutUrl` validation never running. This is site code acting on
its own site, so it is a hardening note rather than a vulnerability, but the contract should be
written: the guard is the only writer, it publishes the construction-validated `logoutUrl` snapshot,
and the routes treat a present `cairnIdentity` as mode only, deriving nothing else from it. This also
closes the mutation case (a site holding the resolver object and reassigning `.logoutUrl` after
construction).

**Change:** plan:54-56, append "the guard is the only writer of `locals.cairnIdentity`, and the value
it publishes is the snapshot validated at construction; the ambient doc says so."

---

### S22 (note). The CSRF rotation residual is accepted without its attack ever being written down

Decision 8 and plan:62 state that rotation-on-authentication is the one property lost. The concrete
shape belongs in the security model, because it is the one thing an operator can act on: on a shared
browser, editor A's CSRF value is minted on first admin render, survives A's Access session ending
(Access-side logout never touches cairn's cookies), and is inherited by editor B signing in through the
gate in the same browser; `issueCsrfToken` re-anchors `Max-Age` to `SESSION_TTL_MS`, 30 days, on every
call (`csrf.ts:120-132`), so A can CSRF B for the life of the cookie. Under identity the only rotation
left is cairn's own logout (Task 3 keeps the cookie deletes), which an editor who leaves through the IdP
never performs.

**Change:** plan:216-218, add "the rotation residual is stated with its shared-browser shape and its two
levers: sign out through cairn's own logout, and keep the Access application's session duration short."

---

### S23 (note). Intermediate-commit shape, and the reviewer fan-out

Two small process points, both cheap:

1. Task 1 (plan:96-97) sets `locals.cairnIdentity` "when the option is present" with no resolver call,
   and the PR opens at Task 1's commit (plan:114). Between Task 1 and Task 2 the branch has identity
   mode advertised with nothing enforcing it, and after S1's correction Task 3's 404s would land before
   Task 2's branch if the order ever slipped. State that no preview deploy runs off intermediate
   commits, or have Task 1 declare the types only and let Task 2 publish the locals value.
2. The fan-out (plan:256-258) names the right reviewer as the merge gate, but the recipe, which is the
   highest-risk artifact in the pass and ships as prose, is proven only by `check:snippets`
   typechecking plus a read. `jose` is already available in the integration project
   (spec-review G10, `spec-review.md:1419-1443`). A single unit test that mints a local JWKS and asserts
   the recipe's verifier refuses `alg: none`, an HS256 confusion attempt, a wrong `aud`, a wrong `iss`,
   an expired token, and a token with no `email` would convert the recipe from prose into a tested
   artifact for a few hundred tokens. Also name the two highest-risk one-liners, Task 1's `logoutUrl`
   validator and Task 4's probe classifier, as their own enumerated acceptance tables (done in S4 and
   S5) rather than leaving them to a pass-end read of a six-task diff.

---

## Ranked summary

**Blocking:** S1 (public-path anchor kills the whole magic-link shutdown), S2 (B6 login-method floor
fell through), S3 (`confirmLoad` left live), S4 (`logoutUrl` admits `//evil.example`), S5 (probe
follows redirects; suffix host match; origin-attested PASS), S6 (workers.dev arm demoted to prose).

**Should-fix:** S7 (no try/catch, no shape check on the seam), S8 (no `keys` class, no jose bounds),
S9 (`type: 'app'`, teamDomain scheme trap), S10 (IdP displayName into git history), S11 (security-model
corrections under-scoped), S12 (`bootstrapOwner` dead config), S13 (hand-off page cookies; `LoginData`
shape), S14 (no local-dev story).

**Note:** S15 through S23.

**Verdict:** the seam's shape is right and the fold caught most of the spec review, but the plan as
written ships an Access gate with the magic-link door still open, and three of the prior lens's
findings (B6, S7, S10) never reached either document.

---


Objects: `docs/superpowers/plans/2026-09-07-identity-seam-pass.md`, spec
`docs/superpowers/specs/2026-09-07-identity-seam-design.md`. Judged for executability by a
zero-context Sonnet implementer and an Opus `diff-reviewer` under
`~/.claude/workflows/pass-execute-chains.js` (both prompts DO carry the plan path and tell the
agent to read the task section; the condensed `criteria` string is secondary, so the task
section is the contract and anything absent from it is absent).

Findings ranked. H1 through H5 are the top five.

---

## H1 (blocking). The plan's write point for `locals.cairnIdentity` cannot reach the four routes Task 3 changes

**Evidence.** Task 2's anchor is `src/lib/sveltekit/guard.ts` "at about `:175-195`". That range
opens with `if (!isPublicAdminPath(pathname)) {` (`guard.ts:175`), and
`isPublicAdminPath` (`guard.ts:24-27`) returns true for `/admin/login` and every
`/admin/auth/**` path. Task 1 says the guard sets `locals.cairnIdentity` "when the option is
present" without naming where; the ruled input says "on every admin path it handles in identity
mode". Task 3 then keys `loginLoad`, `requestAction`, `confirmAction`, and `logoutAction` off
`locals.cairnIdentity` **alone**. Those four handlers serve exactly the public paths the guard's
named range excludes. The spec records the fact and does not resolve it (spec review N6: "`/admin/login`
and `/admin/auth/**` stay `isPublicAdminPath`, so no identity resolves there"). Implemented as
written, identity mode is invisible to the hand-off page and the two 404s, and Task 3's tests pass
only because they set `locals` directly rather than running the guard.

**Rewrite.** Task 1, Step 1: "set `locals.cairnIdentity = { label, logoutUrl }` for every path
`isAdminPath` matches, immediately BEFORE the `!isPublicAdminPath` branch at `guard.ts:175`, so a
public admin path carries the flag while resolving no identity. Task 2's branch changes only the
inside of that block." Add to Task 1's acceptance criteria: "an identity-mode request to
`/admin/login` carries `locals.cairnIdentity` and calls `resolve` zero times (unit test)"; add the
same case to Task 3's integration file so the guard, not a hand-set `locals`, produces the mode.

## H2 (blocking). Interfaces blocks are missing on half the tasks, and the one cross-task string the plan depends on is undeclared

**Evidence.** Tasks 4, 5, and 6 carry no `**Interfaces:**` block at all; Task 3 carries `Consumes`
with no `Produces`. Task 3 produces the `data-cairn-identity` attribute; Task 4's probe FAIL arm is
defined entirely by sniffing that exact string ("a 200 whose body carries `data-cairn-identity`").
The reviewer verdicts Task 4 against Task 4's section, which never says where the marker comes from,
and the implementer of Task 4 has no reason to check that Task 3 spelled it identically. The house
exemplar (`2026-09-07-chassis-b1-pass.md`) carries Consumes/Produces on its dependent tasks; this
plan drops the convention exactly where it is load-bearing.

**Rewrite.** Task 3 gains `Produces: the \`data-cairn-identity\` attribute on the hand-off
paragraph (exact spelling; Task 4's probe matches on it); the four identity-mode handler
behaviors.` Task 4 gains `Consumes: Task 3's \`data-cairn-identity\` marker.` Task 5 gains
`Consumes: Task 1's exported types (the recipe's fenced block imports them).` Task 6 gains
`Consumes: every prior task's shipped surface (the changelog and ruling rows name it).`

## H3 (blocking). "`check:snippets` proves the recipe typechecks" is false for the whole verifier

**Evidence.** `scripts/checks/check-snippets.mjs:60-81` decides per import specifier whether to
typecheck against a real module, using `import.meta.resolve(spec)`; an unresolvable specifier is
rewritten to `declare const jwtVerify: any` and friends (`stubClause`, `:84-102`). `jose` is
deliberately NOT a dependency (ruled input 1), so it does not resolve, so every `jose` call in the
recipe typechecks as `any`. The gate proves only that the cairn-side shape (`IdentityResolver`,
the return objects) matches the built package. Task 5's acceptance criterion, and the spec's
"typechecked by `check:snippets` against the built package" (spec:178), overstate that by a wide
margin, and the plan then leans on the claim as the recipe's only mechanical proof (spec "Proof":
"a runtime test of the recipe is a site's own").

**Rewrite.** Task 5 AC: "`check:snippets` green with the recipe block counted; the block's
cairn-side shape (the resolver object and both return shapes) is what the gate checks, since `jose`
is unresolvable and stubs to `any` (`check-snippets.mjs:60-81`); the recipe's verification logic is
proven only by the `web-auth-security-reviewer`'s read, which is therefore blocking for this task."
State the same limit in the extend page's own words is NOT needed; state it in the plan so the
reviewer does not accept a green gate as evidence of the verifier.

## H4 (blocking). The parallel-with-B1 shared-file list is incomplete and the reconciliation rule cannot run

**Evidence.** The header names four shared files: `CHANGELOG.md`, `ROADMAP.md`, `docs/STATUS.md`,
the friction log. Chassis-B1's last task (`2026-09-07-chassis-b1-pass.md:392-398`) also touches
`docs/extend/migration-notes.md` and runs `check:rulings-format` (so `docs/internal/engine-rulings.md`),
and this plan's Task 5 edits `migration-notes.md` while Task 6 edits `engine-rulings.md`. Both are
missing from the list. Worse, both plans' last task performs a **whole-log** friction triage
(B1:395, identity Task 6). That is a semantic race, not a text conflict: whichever runs first
deletes and promotes entries the other's triage assumed. And "the last task of whichever merges
second reconciles" is unschedulable, because each pass's last task runs before either pass merges;
neither implementer can know its own order.

**Rewrite.** Header: "Shared with chassis-B1: `CHANGELOG.md`, `ROADMAP.md`, `docs/STATUS.md`,
`docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md`,
`docs/internal/docs-friction-log.md`, and `docs/HISTORY.md`. **The whole-log friction triage
belongs to chassis-B1 this window**; Task 6 here appends this pass's own findings and triages only
those. The reconciliation is a rebase step in the pass-end ritual of whichever pass merges second,
performed by the conductor after the first merge lands, not a committed task step."

## H5 (significant). Sizing: six tasks is right now, but the wrong task is flagged as the fat one, and Task 2's "pre-agreed split" is not executable

**Evidence.** The spec review's split proposal (spec-review.md:1486-1524) rested on two reasons.
Reason 1 (nine work units) is largely retired by revision 2: the Access verifier as a recipe deletes
`jose`, `src/lib/cloudflare/access.ts`, the `/cloudflare` barrel, the two R4 reexport records, and
the 10 unit cases (proposed B1/B2/B3 collapse to one docs task), and ruled input 2 deletes the
proposed A3 bootstrap task. What remains is six units, and the plan's six tasks map onto them
one-to-one. Reason 2, the two doors as accretion by adjacency, is **not** retired: it is bounded
("one section each") but still leaves the pass without changing anything else. Bounding is the
mitigation the sizing rule allows, so the single pass stands, but the plan should say the bound is
the answer to the review's second reason rather than leaving it unaddressed.

The header predicts Task 2 as "the one expected to exceed 0.7M" and pre-splits it into 2a/2b. Task 2
is already two commits with two named file sets, so it is bounded. Task 5 is the fat one: a new
220-300 line page (the review's own estimate), five modified docs, one conditional record edit, a
`prose-voice-reviewer` round before commit, plus `check:snippets`, `check:vale`, `check:docs`, and
`check:arm-indexes`. It has one step, no Interfaces block, and the largest single deliverable in the
pass. Separately, the 2a/2b "pre-agreed split" cannot execute under
`pass-execute-chains.js`: one task is one implementer dispatch, and the conductor has no mid-dispatch
hook, so the split either never happens or requires a re-dispatch the plan does not describe.

**Rewrite.** Drop the Task 2 split language and make the deliverable count explicit per task. Split
Task 5 at its natural seam into 5a (the new extend page and the recipe; `check:snippets`,
`check:vale`, the prose reviewer) and 5b (the five inbound doc edits: `security-model.md`,
`extend/README.md`, `why-cairn.md`, post-freeze note 4, `migration-notes.md`), giving seven tasks
and a flatter profile. If the six-task shape is kept, say in the header that Task 5 is the
>0.7M task and Task 2 is not.

## H6 (significant). Task 5's post-freeze-note conditional is inverted on the facts

**Evidence.** The plan: "`docs/internal/record/2026-09-04-cairn-case/26-post-freeze-notes.md` (note
4 closed by pointing here; this file is uncommitted on `main`, so the task edits it only if it is
present in the worktree, else reports)." The file is committed (`d38f5f54`, "docs(record): note what
the figure derivation surfaced after the case freeze") and therefore present in every worktree. What
is uncommitted is a **local modification** in the main checkout (`git status` reports it `M`), which
a worktree branched from `main` will not carry. The instruction as written guarantees the implementer
edits the committed version and silently diverges from the unmerged local edit.

**Rewrite.** "…(note 4 closed by pointing here; the file is committed at `d38f5f54`. The main
checkout carries an uncommitted modification to it: the conductor commits or stashes that before the
worktree branches, and the task reports if the note-4 text it expects is absent)."

## H7 (significant). Acceptance criteria that no command or read can settle

**Evidence.**
- Task 4: "the magic-link path byte-identical", the task edits `check-probe.ts`, so nothing is
  byte-identical; the intent is behavioral.
- Task 5: "the security model's session sentences true under identity mode", a judgment with no
  enumeration, though the spec review lists the affected statements by line
  (spec-review.md:614-638, "Statements in `docs/extend/security-model.md` the design makes false or
  inapplicable").
- Task 6: "no shipped item remains in a ROADMAP tier", a read, but with no named item.
- Task 1: "the zero-config guard path byte-identical" is testable only because the global
  constraints separately name `src/tests/integration/auth-guard.test.ts`; the criterion should carry
  the file itself, since the reviewer's contract is the task section.

**Rewrite.** Task 4: "the magic-link outcome is unchanged: the existing probe tests pass unmodified
and the POST arm runs only after a 200 carrying the magic-link form." Task 5: "each statement listed
at `spec-review.md:614-638` is either still true under identity mode or amended, one by one; the
task reports the list with its disposition." Task 6: "the identity-seam entry is removed from its
ROADMAP tier and the two deferred items appear under Later with their triggers." Task 1: name the
test file inside the criterion.

## H8 (significant). Decisions the plan leaves open that the implementer should not be making

**Evidence.**
- Task 2: "look the roster row up with the store's existing `findEditor` **or equivalent**". The
  "or equivalent" invites a second lookup path in the one place the plan says authorization lives.
- The refusal record's log **level** is unspecified; the spec review's B5 fold argued an operator-fault
  refusal deserves `error`, and revision 2 dropped the discussion without ruling.
- Neither the spec's revision 2 nor the plan says what the guard does when a site's `resolve`
  **throws**, or returns a non-string or empty `email`. The resolver is site-supplied arbitrary code
  called inside `handle`; unhandled, a throw is a raw 500 and an empty string is a roster lookup on
  `''`. The spec review's B4 and B5 fixes covered both; revision 2 kept the refusal union but not the
  guard-side distrust.

**Rewrite.** Task 2 files: name `findEditor` alone (no "or equivalent"). Add to Task 2's Files:
"`guard.ts`: `identity.resolve` is called inside a try/catch; a throw is a refusal logged with the
thrown message capped and never echoed to the response; a resolved `email` that is not a non-empty
string after normalization is treated as a refusal, not a lookup." Add the two matching integration
cases and name the level for each `guard.rejected` record.

## H9 (minor, but it costs a checkpoint). Checkpoints at 3 and 6, and a ceiling with no ritual line

**Evidence.** "Checkpoints at 3 and 6." Task 6 is the last task, so its checkpoint records a finished
pass; the pass has one usable mid-course control. The ceiling is 4.5M for six tasks; chassis-A's
observed rate of about 0.3M to 0.6M per task with no image reads puts the six tasks at 1.8M to 3.6M,
so the ceiling is generous on the task list and carries **no** line for the pass-end ritual, which
here is the code-simplifier over the whole diff, three reviewer fan-outs with fix rounds, the eight
named gates, and a from-scratch showcase install plus build plus e2e. The spec review predicted
exactly this ("it will run over on the gates, not on the code", spec-review.md:1518-1524).

**Rewrite.** "Checkpoint interval: after Tasks 2 and 4 (the pass-end ritual writes STATUS in any
case). Ceiling 4.5M: about 3.0M for the six tasks at chassis-A's observed rate, about 0.8M reserved
for the pass-end ritual (simplifier, three reviewers with one fix round each, the eight named gates,
the from-scratch showcase e2e), the remainder slack. At 80% the conductor finishes the task, writes
STATUS, and asks one combined question."

## H10 (minor). The ritual misses `check:package`, ritual step 8, and the memory refresh

**Evidence.** The `cairn-pass` skill's step 5 names four doc gates that must all pass:
`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`. The plan's global
per-task gate list and its pass-end ritual name every one except `check:package`, in a pass whose
Task 1 adds three exported types and an option to an exported interface (the entry-point shapes are
exactly what that gate reads). The ritual paragraph also omits step 8 (draft the next plan while
context is warm, brainstorm first) and the "refresh the relevant `cairn-*` memory" half of step 9,
both of which it otherwise mirrors closely.

**Rewrite.** Add `check:package` to the global gate list and to the ritual's named gates. Extend the
ritual sentence: "…the post-mortem here; both budgets scored; the next plan drafted while context is
warm (brainstorm first) or the reason it is deferred; the `cairn-*` memory refreshed; push, PR,
merge…; the pre-bake for the context clear."

## H11 (minor). Condition ids drift between the spec and the plan

**Evidence.** Spec revision 2 (spec:120-128) names the conditions `identity.unresolved` and
`identity.unknown`. The plan's ruled input names `auth.identity-unresolved` and
`auth.identity-unrostered`. The plan is the correct one: `src/lib/diagnostics/conditions.ts` uses a
`<area>.<kebab-detail>` shape throughout (`auth.store-unmigrated`, `auth.role-wiring-missing`,
`admin.login-probe-failed`). But the plan's header says it was authored from revision 2, both
documents are handed to the implementer, and Task 2's acceptance criteria never restate the ids, so
the only place the correct spelling appears is a ruled-input bullet.

**Rewrite.** Amend the spec to the plan's ids (a one-line revision-2 erratum), and put the ids into
Task 2's acceptance criteria verbatim: "the two conditions registered as `auth.identity-unresolved`
and `auth.identity-unrostered`, matching `conditions.ts`'s `<area>.<kebab-detail>` shape."

## H12 (minor). Three files the implementer has to guess, one of which carries a count that goes stale

**Evidence.** Task 1: "the ambient declaration module that types `locals.cairnEditor`", the file is
`src/lib/ambient.ts`, and its header comment opens "The four members share the flat `cairn` prefix",
a sentence a fifth member falsifies. Task 3: "the login page component the routes render", unnamed.
Task 4: "the probe's unit tests", unnamed, while every other task names its test file exactly.

**Rewrite.** Name `src/lib/ambient.ts` and add "update its header comment's member count and add the
`cairnIdentity` paragraph beside the `cairnAccess` one"; resolve and name the login component path
and the probe test path at authoring time, not at dispatch.

---

## Sizing verdict

**The six-task single pass is the right answer now, with one amendment and one correction.**

The spec review's split rested on two reasons. Reason 1 is retired by revision 2: with the Access
verifier demoted to a recipe, proposed Pass B loses `jose`, `src/lib/cloudflare/access.ts`, the
`/cloudflare` barrel, the two R4 reexport records, and its 10 unit cases, collapsing three tasks into
part of one docs task; and ruled input 2 (no guard-side bootstrap) deletes proposed A3 outright. The
review's nine work units are six, which is what the plan carries.

Reason 2, the two doors, is bounded rather than retired. The bound ("one section each") is an
acceptable answer under the sizing rule, but the plan should say so explicitly, since a reader of the
review will otherwise see an unanswered split argument.

The amendment: the task profile is uneven in the direction the header gets backwards. Task 2 is
pre-split and bounded; Task 5 carries the pass's single largest deliverable plus five inbound doc
edits plus a prose reviewer plus four gates, in one step with no Interfaces block. Split Task 5 into
5a (the new page and recipe) and 5b (the inbound edits) for a seven-task pass, or at minimum move the
">0.7M" flag from Task 2 to Task 5 and drop the unexecutable 2a/2b split language.

The correction: H1 is a genuine blocker on the plan's own terms, not a sizing question. As written,
the mode never reaches the routes Task 3 changes, and the pass would discover it at Task 3 with Tasks
1 and 2 already committed.

---


Objects: `docs/superpowers/plans/2026-09-07-identity-seam-pass.md`; spec revision 2. Prior lens
section: `docs/internal/record/2026-09-07-identity-seam/spec-review.md:660-1130`.

## Part 0. Fold audit of this lens's own spec findings

| Finding | Folded into spec rev 2 | Carried by a plan task | Verdict |
|---|---|---|---|
| F1 (defer `cloudflareAccess`, recipe instead) | decision 5, spec:44-51 | Task 5 (recipe), Task 6 (declined row) | folded; but see C1 (the verification the trade rests on does not exist) and C3 (the trigger) |
| F1b (`jose` out of `package.json`) | spec:47-48 via decision 5 | plan Ruled inputs:47-49 | folded |
| F2 (no guard-side bootstrap) | decision 6, spec:52-56 | plan:50-52, Task 4 (`auth.store` remedy) | folded |
| F3 ("exactly one of five" restated) | spec:112-136 enumerates the true blast radius; the CSRF and `hasSession` re-bases are gone (decision 8) | Task 2 acceptance ("`hasSession` not redefined") | folded, with a residue: plan:22 still opens "replacing exactly the session-resolution piece of the guard's five" as the leanness claim, then names the routes and doctor in the same sentence. Honest enough; not a finding. |
| F3b (thinner shapes recorded; `label` optional) | spec:100-104, spec:82 | plan:58-62 | folded |
| F4 (bare-noun naming) | moot with F1 | n/a | folded (moot) |
| F4b (`null` collapsing four diagnoses) | spec:91-95 `reason` classes; logged in `detail` | Task 2 test list:141-143 | folded; see C5 on the case of those values |
| F5a (Unstable, not Extension) | spec:106-109 | Task 1 (Types table at Unstable) | folded |
| **F5b (`identity` is not scaffold wiring; needs a per-member tier note)** | **not folded**: spec:106 answers only F5a ("the new option is additive, so its tier holds") | **not carried**: Task 1:99 says only "`AuthGuardOptions.identity` on the `createAuthGuard` section" | **fell through, undismissed → C4** |
| F6a (roster-email lockout) | spec Risks:243-246, migration step spec:170-173 | Task 5:211 ("the migration step on roster emails"); Task 2 condition remediation | folded |
| F6b (double-maintained admission) | half: spec:238-239 states it in **Out of scope**, in cairn's voice ("two admission lists by design") | **not carried**: no extend-page bullet in Task 5's enumeration | partial → C6 |
| F6c (50-user cap explained: editors, not staff; cost of user 51) | half: spec:32 states the cap and "the paid plan lifts it"; the editors-not-staff clarification and the cost are absent | **not carried**: the cap appears nowhere in Task 5's page contents | partial → C6 |
| F7 (two doors as adjacency) | spec:194-197 states the decision and the bound explicitly, as the finding asked | plan:72, Task 5:213-215 | folded (accepted, on the record) |
| **F8 (front-door over-claim)** | **not folded**: spec:208-209 keeps "or sign in through your organization" verbatim; the proposed replacement is absent and no dismissal is recorded | **carried in its unfolded form**: Task 5:219 and plan:274-275 both re-quote the over-claimed sentence | **fell through, undismissed → C2** |

Two findings fell through with no dismissal (F5b, F8) and two folded at half (F6b, F6c).

---

## Findings, ranked

### C1. The recipe's security-critical half cannot be typechecked, so the plan's acceptance criterion and the trade F1 rests on are both false as written

`scripts/checks/check-snippets.mjs:18-21`:

> "every import whose specifier is NOT `@glw907/cairn-cms` (or a subpath) and does not resolve to
> a real dependency of this package is rewritten to an untyped `any` stand-in
> (`rewriteLocalImports`). This keeps the gate's teeth on the one thing it exists to catch: a
> snippet's use of the PACKAGE's real exports, names, and signatures."

`isRealSpecifier` (`:64-67`) confirms it: a bare specifier is real "exactly when it resolves as an
actual dependency of this package", and F1b deliberately keeps `jose` out. So in the shipped
recipe, `jwtVerify`, `createRemoteJWKSet`, and the payload they return are `any`. `check:snippets`
will prove that the recipe returns an object matching `IdentityResolver`. It cannot prove the
`issuer`/`audience`/`algorithms` pinning, the header-only read, or the non-empty-`email` check,
which is every line the security argument is about, and it will pass a recipe with the audience
check deleted.

This is not a nit about a gate: the whole F1 trade was "the recipe is a *verified* artifact, not
folklore … strictly leaner than an engine export and loses nothing the spec's argument actually
claims" (`spec-review.md:735-742`). The verification half of that trade does not exist. The
charter's own test survives it (`what-cairn-is-and-is-not.md:70-71`, "the thinnest seam"), and the
`isuniqueviolation` bar still refuses the export, so the position holds; the **claim** must not.

**Change:** plan:229, "`check:snippets` green with the recipe block counted" stands, but delete the
acceptance clause at plan:226, "`check:snippets` proves the recipe typechecks against the built
package", and replace with: "`check:snippets` proves the recipe's cairn-facing shape; the `jose`
calls stub to `any` and are proven only by the `web-auth-security-reviewer`'s read, which the
acceptance criteria name." Amend plan:47-49's ruled input the same way, and add to Task 5's page
one sentence telling the reader the block is not machine-verified against `jose`. Then either
raise the security reviewer's read of the recipe from a pass-end fan-out item to a named Task 5
acceptance criterion, or accept a lower assurance and say so on the declined ledger row.

### C2. F8 fell through: the front-door sentence the plan ships is the one this lens asked to change, with no dismissal on the record

`docs/internal/docs-register.md:322-345` (the front door) and the `comparisons-never-strawman`
memory ("states cairn's own drawbacks"). The finding at `spec-review.md:1046-1075` measured
"sign in through your organization" against the shipped shape and proposed the exact replacement:

> "or, behind Cloudflare Access, sign in with your organization's Google or Microsoft accounts",
> which names the mechanism, keeps the benefit, and cannot be misread as a directory sync.

Spec rev 2 kept the original at spec:208-209, and plan:219 and plan:274-275 carry it forward twice.
Against the shipped shape the sentence is still over-claimed in the four ways the finding listed:
it requires Cloudflare Zero Trust, an Access application, and an IdP connection; it requires a
`hooks.server.ts` edit and a redeploy; authorization stays hand-maintained per person in cairn's
roster; and off Access nothing works. Question (6) answered: **no, Task 5's why-cairn sentence is
not honest for the shipped shape**, the shipped shape is a recipe, and the sentence reads as a
switch.

**Change:** plan:219, replace "the assumption, then 'or sign in through your organization'" with
"the assumption, then 'or, behind Cloudflare Access, sign in with your organization's Google or
Microsoft accounts'", and make the same substitution at plan:274-275. If the original phrasing is
kept, the pass owes a one-line dismissal in the Ruled inputs.

### C3. The declined row's reopen trigger does not match the precedent it cites, and the row as specified is missing lines the ledger format requires

Ledger format (`engine-rulings.md:11-19`) requires per entry: `Verdict:` with a one-sentence
reason, `Reopens on:`, `Record:`, plus `Any-site case:` on every keep and `Verified:` on "every
family-originated export and every non-keep". `isuniqueviolation-cloudflare` reopens on

> "a second unrelated consumer … **or** … an engine-side D1 path that … mishandles it today …
> the engine becomes its own first consumer."

Plan:237-239 specifies the decline's trigger as "an evidenced defect in a family site's own
resolver, or an engine-internal consumer". The second limb matches. The first does **not**: it is
`verifyTurnstile`'s bar (an evidenced production defect), not `isuniqueviolation`'s duplication
limb, so as written no amount of adoption ever reopens the export, only a breach. That is a
defensible position, but the row cites one precedent and adopts another's trigger, which is
exactly what the ledger's "read it before re-arguing a settled item" exists to prevent.
Question (1) answered: the accept row's specified content (verdict, seam-fit reason, charter text)
covers `Verdict:`; **neither row is specified with a `Record:` line, and the decline, a non-keep,
is not specified with `Verified:`**. The accept row also carries no `Any-site case:`; the format
scopes that to audit keeps, so its absence is fine, but the pass should say so rather than leave
`check:rulings-format`'s scope to the implementer.

**Change:** plan:236-239, specify both rows down to their labeled lines: `Verdict:`, `Reopens on:`,
`Record:` (pointing at `docs/internal/record/2026-09-07-identity-seam/`), and `Verified:` on the
decline. Restate the decline's `Reopens on:` as the union of both cited precedents: "a second
consumer hand-rolling this verifier, an engine-internal consumer of it, **or** an evidenced defect
in a family site's own resolver", and name both `isuniqueviolation-cloudflare` and
`audit-cloudflare-verifyturnstile` as the precedents.

### C4. F5b fell through: `identity` joins a Scaffold-tier interface with no per-member tier note

`docs/reference/README.md:24-26`:

> "**Scaffold API.** Also frozen, but for the copied wiring a scaffolded site owns rather than a
> seam it imports and calls: the shape a `create-cairn-site` template writes into a consumer's
> own route files".

No scaffold writes `identity`; a developer imports a resolver and calls it, which is the Extension
or Unstable side of the distinction the two frozen tiers exist to draw. Spec:106 answers only
F5a. The consequence is concrete and reader-facing: `AuthGuardOptions` is documented as frozen, so
a reader sees `identity` inside a frozen interface while its three types are marked Unstable, and
the reference page says nothing about which promise governs the member.

**Change:** plan:99, extend the Task 1 file line to "`AuthGuardOptions.identity` on the
`createAuthGuard` section, carrying its own tier note (`identity` and its types are Unstable inside
the frozen interface; the option may change shape or leave in any minor)", and add to Task 1's
acceptance criteria: "the `identity` member's tier is stated where the reference row declares it."

### C5. Naming: three of the new names fit the ratified grammars, two do not, and the spec and plan disagree on the condition ids

Existing condition ids (`src/lib/diagnostics/conditions.ts`): `edge.https-not-forced`,
`auth.csrf-token-invalid`, `auth.csrf-origin-mismatch`, `email.sender-not-onboarded`,
`email.send-failed`, `config.bindings-missing`, `config.observability-off`,
`config.csrf-disable-missing`, `config.public-origin-invalid`, `config.site-config-invalid`,
`config.dependency-floors-unmet`, `config.tidy-key-missing`, `ai.posture-not-effective`,
`auth.store-unreachable`, `auth.store-unmigrated`, `auth.unknown-role`,
`auth.role-wiring-missing`, `config.no-referrer-blanket`, `auth.email-not-normalized`,
`github.app-unreachable`, `admin.mount-incomplete`, `skill.admin-screens-stale`,
`admin.login-probe-failed`. The grammar is `area.subject-state`, the state an adjective or a
past participle, kebab inside the segment. `auth.identity-unresolved` fits exactly.
`auth.identity-unrostered` fits the form (`store-unmigrated` is its twin) and coins a word, which
is acceptable in this grammar and reads precisely.

Events (`src/lib/log/events.ts:5-7`): "The grammar: `area[.subject].verb_phrase`. A past-tense verb
phrase names an occurrence; a state adjective names a detected condition. **Every `reason`/`scope`
value a record carries is snake_case.**" `auth.identity.unknown` is the exact shape of the
existing `auth.role.unknown` and `auth.access.denied`. Fits.

`IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal`, `cairnIdentity`, and `identity` as an
option are all nouns on non-function surface, so `convention-bare-noun-functions`
(`engine-rulings.md:185-190`) does not bite; `cairnIdentity` matches `cairnEditor`/`cairnAccess`.
Fine.

Two defects:

- **`no-email` violates the snake_case rule** for `reason` values (`events.ts:6-7`). The refusal's
  member is literally named `reason` and its value lands in a log record. Spec:93 and spec:187-188
  list `'missing', 'invalid', 'audience', 'expired', 'no-email'`.
- **The event and its own condition do not share a word.** `auth.identity.unknown` is logged by the
  condition `auth.identity-unrostered`. Every other pair in the tree reads straight across
  (`auth.unknown-role` / `auth.role.unknown`). One of the two should move.
- **The spec still names the old ids.** spec:122 says "the registered condition
  `identity.unresolved`" and spec:126 "`identity.unknown`", neither of which is area-prefixed and
  neither of which is what plan:63-64 registers. The plan is right and the spec is stale.

**Change:** plan:68, "`no-email`" → "`no_email`" wherever the refusal vocabulary is enumerated
(plan:68 and Task 2's test list at plan:141), and either rename the event to
`auth.identity.unrostered` or rename the condition to `auth.identity-unknown`; the event name is
the public-observable contract, so prefer aligning the condition. Add a plan line noting spec:122
and spec:126 are superseded by plan:63-64 so the implementer does not register the spec's ids.

### C6. F6b and F6c folded at half: the two facts a target organization needs in week one are in the spec's voice but in no task's deliverable list

The register's extend counterpart question (`docs-register.md:287-289`) asks whether the page
states the contract; the finding at `spec-review.md:1019-1044` and `:1036-1041` asked for a bullet
on double-maintained admission and a stated meaning for the 50-user cap. Spec:238-239 states the
two-lists fact inside **Out of scope**, a section a reader consulting the page for operations will
not read as an operating instruction, and spec:32 states the cap with no reading. Task 5's page
enumeration (plan:207-215) contains neither, so nothing makes the implementer write them.

**Change:** plan:211, add to the Task 5 page enumeration: "the two admission lists, maintained by
hand and able to drift (the gate says who may reach `/admin`, the roster says who may edit); the
free-plan cap read as editors who authenticate through Access, not staff, and what exceeding it
costs."

### C7. The extend page must state its tier and must not restate what the developer's own stack documents; question (2) answered

`docs-register.md:270-289` (the extend track):

> "**Register:** contract-first task, tutorial, and concept prose; this reader is fluent in their
> own stack and resents padding or hand-holding on it." … "A vendor's specifics get a link,
> cairn's own reasoning gets prose." … "**Counterpart question:** does the page state the contract
> and **its stability tier** rather than narrating implementation, and would a competent SvelteKit
> developer find any sentence here that their own stack's docs already own?"

So the page must avoid: narrating JWKS or JWT verification as a concept (jose's and Cloudflare's
docs own that), walking the Access console (spec:171 already links it, correctly), and any prose
padding around the block. It must state the seam's Unstable tier, which Task 5's enumeration does
not mention.

On the leanness half of question (2): **no precedent exists in `docs/extend` today for a
snippet-gated security recipe.** `grep -rin 'jose\|jwt\|verify'` over `docs/extend/` returns
nothing. The family's actual precedent runs the other way: when a site needs security-critical
primitives for its own auth flow, cairn **exports** them (`/auth-crypto`, whose reference page
opens on the server-only stub mechanics), rather than teaching them in a recipe. That precedent
does not overturn F1, because `/auth-crypto` clears `isuniqueviolation`'s bar (the engine's own
magic-link is its first consumer) and an Access verifier does not. It does mean the recipe is a
new shape for this repo, which is another reason C1's honesty fix matters: the first
security-critical recipe in the extend track should not ship claiming a verification it does not
have. Sixty lines of site code on an extend page is not itself a charter violation, the charter's
answer to "cairn's job or the developer's domain" (`what-cairn-is-and-is-not.md:56-58`) puts the
Access verifier in the developer's domain, and documenting the developer's domain is what the
extend track is for.

**Change:** plan:207-215, add to the page enumeration "the seam's stability tier stated on the
page (Unstable; promotion on the first production consumer)", and add to plan:229's acceptance
criteria "no sentence explains JWTs, JWKS, or `jose` itself; Cloudflare's and jose's own docs are
linked for those."

### C8. Question (5): no task adds surface beyond the spec, with one undocumented observable

Checked task by task. Task 1's three types, the option, the ambient member, and the `logoutUrl`
validation are all spec:68-96 and spec:150-152. Task 2's conditions, the `identity` reason, and
`auth.identity.unknown` are spec:120-140. Task 3's four handler branches are spec:144-152. Task 4's
three probe outcomes are spec:156-163. Task 5 adds `docs/extend/migration-notes.md`, which the
spec covers as a claim (spec:214) if not as a file. Task 6 is records.

The one item that is surface and is not documented anywhere: **`data-cairn-identity`**
(plan:167-168, spec:145-146). The doctor reads it across the network, so it is an
observable contract between the engine's page and the engine's own CLI, and a site that replaces
the login page silently breaks the probe. It is not in Task 3's reference edits, and
`check:reference` will not catch an HTML attribute.

**Change:** plan:169, add `docs/reference/doctor.md` to Task 3's modify list (or fold into Task 4)
with one line naming the marker as the signal the probe reads, and add to Task 3's acceptance
criteria "the marker is documented where the probe's contract is documented."

## Question (3), the Task 1 tier assignments, answered in full

Against `docs/reference/README.md:21-31`: the three interfaces at **Unstable API** is correct by
the tier's own last clause, "any other export whose shape is not yet committed", and matches the
`createAuthChannel` sequence the prior review cited. `createAuthGuard` holding **Scaffold API** is
correct for the factory. The unresolved half is the member, C4. One further stale line, worth a
sweep: `docs/reference/README.md:56` describes `/ambient` as "the one-line `App.Locals.cairnEditor`
augmentation for a site's `app.d.ts`", which Task 1 makes false by adding a second member; no gate
covers that sentence.
