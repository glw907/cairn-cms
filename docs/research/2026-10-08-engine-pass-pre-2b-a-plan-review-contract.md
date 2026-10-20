# Plan review, contract and criteria lens: engine pass pre-2b, pass A

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md` at `504b82f0`. Spec:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`. Code read on `main`. Line
numbers below are the plan's unless a path says otherwise.

Lens: is every criterion testable, does it name the fixture state it needs, does it carry its
fail-today reason, does every spec item land intact, and does every public-surface change reach
the close's `Consumers` lines. Flagged only where a gap affects correctness or a stated
requirement, or costs real clock time.

**Counts:** 0 blocker, 8 major, 7 minor. No over-ceremony finding of consequence.

Every pass A spec item lands in a numbered task. A4 sits in the lead, C11b in Task 9, and B10 is
ruling 3. The class assignments match the spec's. The majors below are criteria that pass today,
or whose fixture lets a named mutation survive. Under this plan's own stop rule, "a mutation the
task names that no test kills" on an `auth-data` task stops the unattended run (plan :267-268).
That rule turns four of these from a fix round into a stop.

---

## Major

### M1. Task 1's "one map, five readers" passes today

- **Location:** plan :450-455; `src/lib/sveltekit/guard.ts:348,368`, `:478-483`;
  `src/lib/sveltekit/section-action.ts:275-285`; `src/lib/sveltekit/admin-action.ts:125`.
- **Defect:** the criterion asserts only that an editor is refused. Today `createAuthGuard({ runtime })`
  ignores the unknown `runtime` member and attaches `access ?? {}`, so the map is `{}`. All three
  fail-closed readers refuse on `{}`: `requireAccess` through `!hasAccessRule`, `createSectionAction`
  and `createAdminAction` through `authorizeAdminTarget`'s `no-rule`. The media screen and the nav
  resolver read `runtime.access` already. So all five refusals hold today, and the stated fail-today
  reason ("only a hand-seeded `locals.cairnAccess` reaches the last three") is false in effect.
  The named mutation "the guard reading `access` from anywhere but `runtime`" survives, because
  reading `config.access` yields `undefined`, then `{}`, then the same refusals. This is the
  headline task, and it is `auth-data`.
- **Fold:** give the fixture a positive control the empty map cannot satisfy. Add a rule that
  admits the editor role (for example `'/admin/y': ['editor']`) and assert that `requireAccess`,
  `createSectionAction`, and `createAdminAction` admit the editor there. Today those calls refuse
  with `no-rule`. Alternatively, assert that `locals.cairnAccess` is the same object as
  `runtime.access` after the guard runs. Restate the fail-today reason as "the guard attaches `{}`,
  so a mapped admit is refused as `no_rule`".

### M2. Tasks 9 and 10 place the race injection where the reorder mutation survives

- **Location:** plan :756 ("committing between the head read and the commit"), :764-765, :786,
  :795-796.
- **Defect:** if the concurrent commit is injected right after `branchHead` returns, the named
  mutation "read the head after the manifest read" survives. Under the mutation the order is: read
  `media.json` (old), read head (H0), inject (H1), commit with `expectedHead: H0`. The commit
  conflicts, and the row stays deleted. Under the correct order the same injection also conflicts.
  So the test cannot tell the two orders apart. The criterion is also undefined for today's code,
  which has no head read to inject after.
- **Fold:** define the injection point as "after the path's first read of `media.json`, the
  manifest, or the entry file, before its commit". Under the mutation the head is then read after
  the injected commit, the stale file commits cleanly, and the test goes red. Today the retry
  re-parents the stale file, so the test also fails today as the plan states. Apply the same
  wording to Task 10's publish and publish-all rows.

### M3. Task 4 names a statement that can never fail the role CHECK

- **Location:** plan :587-591, :596-598, :603-604; `src/lib/auth/store.ts:466-472`
  (`insertOwnerIfEmpty`), `migrations/0000_auth.sql` (`CHECK (role IN ('owner', 'editor'))`).
- **Defect:** the insert at `store.ts:468` is `insertOwnerIfEmpty`, which hardcodes `'owner'`.
  `'owner'` always satisfies `0000_auth.sql`'s CHECK. So "one test per statement" cannot be met for
  it, and the mutation "drop the routing on each of the four statements in turn" survives at :468.
  That is exactly the plan's stop condition (:267-268). The spec carries the same claim, and the
  fold verified the line numbers but not reachability. There is also an inverse gap. The acceptance
  names two operations (an add and a role change). The reachable role writes are three: `insertEditor`
  (:271), `setEditorRole`'s two branches (:506 when `ownerRoles` is empty, :509 when it is not), and
  `demoteOwnerIfNotLast` (:544, with a custom `newRole`).
- **Fold:** route :271, :506, :509, and :544, and leave :468 unrouted with a one-line reason (it
  writes only `'owner'`). The acceptance should give one row each: an add with a custom role,
  `setEditorRole` with `ownerRoles` empty and non-empty, and `demoteOwnerIfNotLast` to a custom role.
  Each fails on 0000 today. Name the fixture as the scaffold's real set {0000, 0003, 0004}, so the
  test meets the CHECK failure the way a site does.

### M4. Task 11's stale-manifest criterion does not name the post-field state it needs

- **Location:** plan :828-832, :838-839; `src/lib/content/manifest.ts:88-112` (empty `mediaRefs` is
  omitted), `:325-328`.
- **Defect:** the narrowed rule drops `mediaRefs` only when no committed entry carries the key. A
  fixture whose only entry is the gallery-only entry lacking `mediaRefs` is the nested-only residual.
  By design it reads as pre-field and passes. An implementer who builds the minimal fixture meets a
  red test that the design says should stay green, and may widen the rule to "never drop". That
  breaks every pre-field site's build. No criterion pins the pre-field case either, so a "never
  drop" mutation goes unchecked.
- **Fold:** fixture for the fail row: a committed manifest in which a second entry carries
  `mediaRefs` (a hero image), and the gallery-only entry lacks the key. Add a pass row: a manifest in
  which no entry carries `mediaRefs`, with gallery refs in the corpus, still verifies. Add the
  mutation "never drop" (always compare exactly), which the pass row kills.

### M5. Task 6 has no criterion for the `ok` composition, and Decision 1's coverage claim is false

- **Location:** plan :172-175 (Decision 1: "The 503 test from Task 7 covers both shapes"), :677-678
  (Task 7's route test stubs `loadHealth`), :887, :889-907.
- **Defect:** Task 7's route test stubs `loadHealth`, so it proves the route's status mapping and
  never runs `ok`'s composition inside `loadHealth`. Task 6's acceptance has no row asserting that
  `ok` is false when `githubAppToken.ok` is false and signing is ok. It also has no row asserting
  that `ok` stays true when `githubAppToken` is absent. The composition decides whether `/healthz`
  answers 503 on a refused key, the reason ruling 3 exists. An `auth-data` reviewer would block on
  the missing row, which costs a fix round, and Decision 1 tells the reviewer the opposite.
- **Fold:** add to Task 6's acceptance: with signing ok and a stubbed 401, `ok` is false. With
  `live=1` skipped (no key or a non-GitHub provider), `ok` equals the signing check. Add the mutation
  "`ok` reads the signing check alone". Correct Decision 1 to say that Task 7's test covers the
  status mapping and Task 6 covers the composition.

### M6. The dictionary-commit ordering that Task 10 relies on has no deterministic proof

- **Location:** plan :708-712, :720-729, :735, :790-792; `src/lib/admin/EditPage.svelte:163-171`.
- **Defect:** Task 8's outcome awaits `commitPendingDictionary()` before the action POST, but none
  of Task 8's acceptance rows tests it. Task 10's e2e ("lands without a conflict ... This holds
  today") is the only guard, and it is a race. If the await is dropped, the publish conflicts only
  when the dictionary commit lands between publish's head read and its commit. A green run then
  proves nothing. Review focus item 5 (:307-308) names this as a top risk. Task 8 is `engine-logic`
  with no mutation mandate, so the gap would pass review. Task 8's outcome also says every result
  clears `publishing`, but no row tests a publish failure.
- **Fold:** add to Task 8's e2e: `page.route` holds the `?/dictionaryAdd` response, and the test
  asserts that no `?/save` or `?/publish` request is sent until the response is released. That fails
  today, because the call is fire-and-forget. Add one row in which a publish answered with a 500
  failure leaves Publish enabled and the text intact.

### M7. The close's changelog list omits A1's security loosening and C11's new publish conflict

- **Location:** plan :956-960, :991-992; spec :394-395 ("a loosening ... disclosed in the
  changelog"), :540 ("Surface: a publish can answer a conflict"); `docs/internal/api-surface.md:19`
  (`canReach` is public).
- **Defect:** Task 12 enumerates the `Consumers must:` and `Consumers may:` lines, and its acceptance
  checks only "every `Consumers must:` line in the spec's draft". The spec's draft omits A1 and C11,
  so the gate cannot catch either omission. A1 changes the result of the public `canReach` for a
  `none` session: a rule naming a `none` role now admits it. That is a security-relevant behavior
  change a site may rely on. C11 lets a publish answer a conflict it never answered before. Task 3's
  notes (:562-563) have the report draft A1's line, but Task 12's list drops it.
- **Fold:** add to Task 12's per-version records two lines. `Consumers must:` review any access
  rule that names a `none`-capability role, since `canReach`, `requireAccess`, and
  `createSectionAction` now admit it. And a changelog line that publish and publish-all can answer
  the calm conflict. Widen the acceptance to "every `Consumers` line any task report drafted
  appears", not only the spec's draft.

### M8. The computed gates contradict the "F green" and e2e criteria on five `auth-data` tasks

- **Location:** plan :126-129, :555-556, :567 (Task 3), :601, :610 (Task 4), :762, :769 (Task 9),
  :842, :850 (Task 11), :907, :933 (Task 6); `~/.claude/workflows/pass-execute.js:684-707`;
  `scripts/checks/gate-tier.mjs` (the engine tier is `SCRIPTS_GATE`, with no showcase e2e,
  `check:template`, or `check:surface`).
- **Defect:** the runner sizes these tasks' gate from the diff and does not force full under
  `auth-data`. A diff that touches only `src/lib` gets the engine tier. Yet each of these tasks
  states "F green" as an acceptance criterion. Task 3 also requires "the showcase e2e sign-in specs
  stay green". Its C7 predicate change is exactly the change that could break sign-in, and the
  engine tier never runs that suite. The reviewer receives a gate that cannot prove the criterion.
  On an `auth-data` task an unmet criterion is blocking, and after one fix round it is a stop. The
  computed tier itself is defensible: `pass-gate-economy.md` keeps the e2e at the boundary for
  paint-neutral tasks. The problem is that the criteria and the gate disagree, and the departure
  from pass-core's "the repo's full gate" for `auth-data` is not justified in the plan.
- **Fold:** on Tasks 4, 6, 9, and 11, replace "F green" with "the computed gate green", and add one
  sentence citing the gate-economy rule as the justification. Pin Task 3 to `gateTier: "full"`,
  because its acceptance carries an e2e and C7 is the sign-in path. The alternative is to move
  Task 3's e2e row to the S1 boundary's F run and say so.

---

## Minor

### m1. Task 1's roles row and Task 2's doctor rows each need one named fixture state

- **Location:** plan :459-460, :505-508; `tool/internal/doctor/check_roles.go:115-117`.
- **Defect:** Task 1's "a declared role's capability resolves the same" passes today if the fixture
  role is `editor`, because `DEFAULT_ROLES` resolves it the same way. The mutation "fall back to
  `DEFAULT_ROLES`" then survives. Task 2's `{ runtime }` rows return `skip`, not `pass`, when the
  fixture declares no custom roles (`skipNoCustomRoles`).
- **Fold:** Task 1: the fixture role is absent from `DEFAULT_ROLES` and carries editor capability.
  Today it resolves to `none`. Task 2: every row runs with custom roles declared, or tests
  `guardRoleWiring` directly.

### m2. Error behaviors from outside the codebase are recalled rather than quoted

- **Location:** plan :589-591, :603-604 (Task 4), :872-875, :885 (Task 6).
- **Defect:** Task 4 matches a D1 CHECK failure by message, but the plan never quotes D1's error text.
  The mutation "widen the match so a non-constraint error is renamed" also misses the risky widening.
  A primary-key violation on `editor.email` (a concurrent duplicate add) is also an
  `SQLITE_CONSTRAINT` failure, and a match on "constraint" would rename it. Task 6's classifier
  (401 refused key, 403 suspended, 404 not found) and the Web Crypto route from a PKCS#1 key to its
  SPKI DER are stated without a GitHub or Web Crypto quotation.
- **Fold:** Task 4's pre-flight captures the real D1 error string for a CHECK failure and for a
  primary-key failure on local D1 and quotes both. Add a row: a duplicate-email insert rethrows
  untouched. Task 6 quotes GitHub's documented status list for
  `POST /app/installations/{id}/access_tokens` and the Web Crypto export step the fingerprint uses.

### m3. Task 3's A2 criterion leaves the expected reason per emitter unspecified

- **Location:** plan :535-536, :546-548.
- **Defect:** "each of the five emitters is covered by a test asserting a `reason`" passes with any
  value. The mapping from refusal outcome to reason is never stated: `authorizeAdminTarget`'s
  `not-owner`, the `editors` floor, and a `none` capability have no named reason.
- **Fold:** state the mapping. No rule gives `no_rule`, a shadowed match gives `shadowed`, and every
  other refusal (role not listed, `editors` floor, `none`, `ownerOnly`) gives `role`. Assert that
  value per emitter.

### m4. Task 5's A10 row needs a runtime that carries a reply-to

- **Location:** plan :639-640; `src/lib/sveltekit/cairn-admin.ts:105-109`; `AuthBranding.replyTo?`.
- **Defect:** "keeps the runtime's reply-to" passes vacuously when `runtime.sender.replyTo` is
  undefined.
- **Fold:** name the fixture as a runtime whose `sender.replyTo` is set.

### m5. Task 1's grep post-condition is single-line and skips the cycle snippets

- **Location:** plan :469-470, :439-442.
- **Defect:** a multi-line `createAuthGuard({\n  access` call escapes the regex. No criterion checks
  that `core.md` and `sveltekit.md`'s snippets stopped importing `roles` from the adapter.
- **Fold:** use `git grep -P` with a multi-line-tolerant pattern, or run `rg -U`. Add a grep for
  an access-module snippet that imports from `cairn.config` in `docs/reference`.

### m6. Task 12 writes STATUS without listing it, and one grep has no pattern

- **Location:** plan :941-948 (Files), :978-980, :987-990.
- **Defect:** the hand-off and the charter phrase go into `docs/STATUS.md`, which is not in Task 12's
  Files. STATUS is canonical on `main` and also written at checkpoints, so the writes collide at
  merge. "The old `/admin/auth/` public-prefix wording" has no grep pattern, so that row is not
  checkable.
- **Fold:** move the STATUS writes to close step 9 (already named there, :1049-1050), and drop them
  from Task 12. Give the prefix row a literal pattern, for example `startsWith('/admin/auth/')`
  and "every path under `/admin/auth/`".

### m7. Decision 6 hand-regenerates a file that the emit step regenerates

- **Location:** plan :197-200; `scripts/build/emit-template.mjs:165-168`.
- **Defect:** the emit step regenerates `templates/waymark/worker-configuration.d.ts` from the
  emitted tree. A hand `wrangler types` run there is redundant and can differ from emit's output.
  `check:template` would catch a difference, but only after a gate run.
- **Fold:** regenerate only the showcase's file by its line-2 command. The template's copy comes from
  `npm run emit:template`.

(Noted without a finding: Decision 3 reuses `is-it-working.md#provision-the-auth-store`, a page the
docs rebuild deleted. Only `docs/internal/record/harvest/admin/is-it-working.json` remains. The
existing `auth.store-unmigrated` condition carries the same dead anchor, so this is friction for
the admin arm's stage, not a pass A defect.)

---

## Proportionality

The header class, the per-task overrides, the close fan-out, the live smoke, and the key probe each
trace to the spec and the class table. The 11.0M ceiling and the per-segment pre-flights are sized
reasonably. The one deviation that needs a fix is M8: the gate is computed while the criteria
assume F. No step reads as over-ceremony at a material cost in clock time or tokens.
