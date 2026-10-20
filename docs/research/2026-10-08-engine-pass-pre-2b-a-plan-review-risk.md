# Plan review, domain-risk lens: engine pass A before stage 2b

**Target:** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md` at `504b82f0` (`main`).
**Spec:** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`.
**Lens:** domain risk (auth, sessions, signing, D1, the commit path). Code read on `main`, never
`.claude/worktrees/`.
**Bar:** this review flags only correctness and data-loss gaps, ranked by consequence, plus
over-ceremony ranked by cost. Everything else is optional.

## Counts

| Severity | Count | Owner forks |
|---|---|---|
| Blocker | 0 | 0 |
| Major | 5 | 1 (M4) |
| Minor | 6 | 0 |
| Over-ceremony | 1 | 0 |

## What the plan already gets right (verified, no action)

- **No window without a map.** Task 1 moves the guard, the dev handle, the showcase, and the
  template (through `emit:template`) in one task. The split rule (plan:59-63) forbids a cut inside
  S1. No consumer sees the change, because nothing is released.
- **D1 ordering.** `0001_roles.sql` rebuilds only `editor`. No table has a foreign key into
  `editor`, so the `DROP TABLE` cascades nothing. `0004` alters only `magic_token`. Wrangler
  applies an unapplied migration by name, so a site that applied {0000, 0003, 0004} still picks
  up 0001. `src/tests/integration/migrations-roles.test.ts` already proves that 0001 keeps the
  `editor` rows.
- **The roles condition's match.** `editor.role` carries the only `CHECK` in the auth schema, so
  the "widen the match" mutation (plan:603-604) is the right guard.
- **The commit guard is real.** `commitFiles` with `expectedHead` commits onto that head with a
  `force: false` ref PATCH (`src/lib/github/repo.ts:235-243,248-257`). A move between the check
  and the PATCH still conflicts. The dev package's fake backend honors `expectedHead`
  (`packages/cairn-cms-dev/src/fake-github.ts:753-758`), so Task 10's e2e proves something.
- **Delete order.** Single and bulk delete commit the row removal before they touch R2
  (`content-routes-media-delete.ts:198-210`). A conflict returns before `store.delete`.
- **Stop rules** (plan:263-274) cover both cases this lens asks about:
  - a real defect still standing after one fix round on an `auth-data` task;
  - a blocking `auth-data` coverage gap still standing after the fix round.

  The close routes its blocking findings through the same rules (plan:1023-1024).
- **The publish head read.** "Before reading the snapshots" (plan:780-782) puts the read ahead of
  `saveToBranch`'s `media.json` and manifest reads (`content-routes-entry-write.ts:216-225`).
  Those reads are the ones that matter.

## Findings

### M1 (major): the lead's five-reader test cannot kill its own headline mutation

- **Where:** plan:450-455 (acceptance) and plan:473-476 (mutations).
- **Defect:** every assertion in "one map, five readers" is a refusal. The three `locals` readers
  fail closed on an empty map:
  - `requireAccess` through `hasAccessRule` (`src/lib/sveltekit/guard.ts:493-494`);
  - `createSectionAction` and `createAdminAction` through `authorizeAdminTarget`, whose first step
    is `no-rule` (`src/lib/sveltekit/admin-action.ts:125`).

  So an editor is refused whether the guard attaches `runtime.access` or `{}`. The other two
  readers (the media screen and the nav) read `runtime.access` directly and never touch the guard.
  The whole test passes under the mutation "the guard reads `access` from anywhere but `runtime`":
  - the old `config.access`, now `undefined`, falls to `?? {}`;
  - a hard-coded `{}` passes the same way.
- **Failure scenario:** the guard drops the map. Every site route on `requireAccess`,
  `createSectionAction`, or `createAdminAction` then 403s, owners included, while the sidebar
  still shows the routes. That is the drift the lead exists to remove, and the gate stays green.
- **Fold:**
  - Add an admit half to the same fixture. An owner session is admitted on `/admin/x` by
    `requireAccess`, `createSectionAction`, and `createAdminAction`. A declared editor-capability
    role named on a second key (for example `'/admin/y': ['<role>']`) is admitted there by the
    same three.
  - After the guard's handle runs, assert that `event.locals.cairnAccess` is `runtime.access` by
    identity, the same form the dev-handle criterion already uses (plan:456-458).
  - Add the mutation "the guard attaches `{}` whatever the runtime declares".

### M2 (major): A6 never names the `error` result, which is how a save can still lose the writing

- **Where:** plan:708-718 (outcome) and plan:720-727 (acceptance).
- **Defect:** the outcome routes `failure` through `applyAction` and `redirect` through
  `location.assign`. It says nothing about `type: 'error'`. SvelteKit's `enhance` produces one in
  three cases:
  - **Network failure:** the fetch throws, and the catch sets `result = { type: 'error', error }`.
    The installed kit's `forms.js` shows this at `:202-204`, and kit 3 keeps it.
  - **Unexpected throw:** an action throws instead of returning `fail`.
  - **Non-JSON response:** the guard answers the action POST with an HTML page, either the CSRF
    condition page or the login redirect for an expired session, and deserializing it fails.

  The natural implementation is `else applyAction(result)`. For an `error` result, that renders
  the error boundary in place of the edit page, and the unsaved text is gone. A6 exists to stop
  exactly that. Under `enhance` the browser back button no longer recovers the form.
- **Failure scenario:** an editor on a train loses the connection mid-save, and the page swaps to
  an error screen with the writing gone.
- **Fold:**
  - Add an outcome line. An `error` result never reaches `applyAction`. It clears `saving` and
    `publishing`, sets the in-place failure flag, keeps the editor's text, and shows the calm
    message.
  - Add an e2e row from `?saved=1`: `page.route` aborts `?/save`. The text stays intact, no
    "Saved" shows, Save is enabled, and the leave guard prompts.
  - Give Task 8 a mutation list:
    - drop the failure flag, so "Saved" shows;
    - use `form.body` as the dirty baseline;
    - `applyAction` an `error` result;
    - fire `commitPendingDictionary` without awaiting it.

  See m5 for the class question.

### M3 (major): the close's live smoke cannot run its custom-role checks on the stock showcase

- **Where:** plan:1025-1037 (close step 5).
- **Defect:** the smoke seeds "an owner and a custom-role editor" on the showcase and expects a
  custom-role roster add to succeed after 0001. The showcase adapter declares no `roles` (no
  `roles` or `defineRoles` in `examples/showcase/src/theme/cairn.config.ts`). The roster add
  rejects a role outside the declared vocabulary before any D1 write
  (`src/lib/sveltekit/editors-routes.ts:55-58,92`). The step cannot produce the result it expects,
  and the "second local D1 without 0001 logs the named condition" check cannot fire either.
- **Failure scenario:** the smoke is the only live proof of two things:
  - A3's condition;
  - the lead's roles half, the guard resolving a declared role from the adapter alone.

  Unattended, the smoke agent either stalls the close or reports a pass on the checks it could
  run. Either way, A3 and the roles half ship with no live proof.
- **Fold:** run the smoke on a scratch showcase copy under `$HOME/.cache/engine-pre-2b-a/`. Its
  adapter declares `roles` with one editor-capability custom role and adds an `access` rule naming
  that role on a custom screen. Then add the existing checks:
  - the custom-role editor is admitted to its screen;
  - the custom-role editor is refused on `/admin/signups`;
  - the sidebar matches both outcomes.

  Keep the stock showcase for the C7 and `/healthz` checks.

### M4 (major, OWNER FORK): D1's accepted residual is the data loss D1 exists to fix, and it turns into a deferred build break

- **Where:** plan:828-832 (outcome) and plan:847-848 (Notes); the spec's D1 "One residual" passage.
- **Defect:** the delete gate trusts the committed manifest's `mediaRefs`
  (`src/lib/media/usage.ts:83-94`). The manifest writes `mediaRefs` only when it is non-empty
  (`src/lib/content/manifest.ts:112`). Consider a site whose only image references are nested
  (gallery-only) and that has not regenerated:
  - **Data loss until regenerate.** Its committed manifest reads as pre-field, and the new verify
    lets it build. The deployed engine still sees each gallery asset as an orphan, so safe-delete
    removes an in-use asset with no typed confirm. This lens names that loss.
  - **A deferred build break.** The comment the plan asks for says the residual "still builds
    green", but that holds only until the first publish on the new engine of any entry with a
    reference. That publish writes a `mediaRefs` key, the manifest becomes post-field, and the
    next build fails on every other stale entry. The editor's publish landed on `main` and reads
    as published, but the site stops deploying until a developer regenerates.

  The `Consumers must:` regenerate line covers a developer who reads the changelog, and no one
  else.
- **The fork:** this is a risk-acceptance choice, so it goes to Geoff.
  - **Accept the residual** (the spec's position). Then the shipped comment and the changelog line
    should state both consequences: the delete gate stays blind until regenerate, and the first
    referencing publish breaks the next build.
  - **Close it at the gate, at small cost.** When no committed entry carries a `mediaRefs` key and
    any concept declares a nested image shape, `mediaDeleteAction` and the bulk planner treat each
    asset as possibly in use. Single delete requires the typed slug; bulk delete skips the asset
    and reports it. That is fail-closed, the same posture as the strict branch read. Recommended:
    close it, since this lens's requirement is "never remove an in-use asset during the
    transition".

### M5 (major): the single-flight slot has no evidence under workerd, only node fakes

- **Where:** plan:879-884 (the bound), plan:892-897 (acceptance), and plan:1038-1043 (the key
  probe).
- **Defect:** every slot criterion runs in a node unit test with an injected clock. The spec's own
  evidence is a scratchpad probe. The hazard the design answers is specific to workerd: a promise
  created in one request's I/O context and awaited from another. The engine's incident record
  names it, and public reports describe such promises never settling for the second request.
  - **Bounded but untested:** the per-caller timer bounds the hang, so the isolate cannot wedge.
  - **Never shown to work:** no test shows a coalesced caller receives the settled verdict at all.
    If workerd does not deliver it, every coalesced caller reads `unreachable`.
  - **The probe does not cover it:** the close's key probe makes one call. As written, it is a
    script that sources secrets, and `loadHealth` imports `cloudflare:workers`, so the script
    cannot run `loadHealth` in node without the runtime.
- **Failure scenario:** an uptime monitor with several probes (or two monitors) hits `?live=1`
  together. The coalesced callers read `unreachable`, `/healthz` flaps to 503, and someone rotates
  or deletes a good key in response.
- **Fold (moot if fork 2 is "no"):** run close step 6 under `wrangler dev`, from a scratch
  showcase copy under `$HOME/.cache/engine-pre-2b-a/`.
  - Fire N concurrent `?live=1` requests. All report the same `githubAppToken` verdict within the
    timeout, and the log shows one mint.
  - Fire one more inside 60 seconds. It mints nothing.
  - A workerd-pool test with overlapping `SELF.fetch` calls is the alternative, if the integration
    project can stage the starter's response returning first.

### m1 (minor): the fingerprint and the health route can leak more than a fixed classifier

- **Where:** plan:885-886 (fingerprint), plan:665-669 (B5 catch branch), and plan:1038-1043
  (probe).
- **Defects:**
  - **An extractable private key.** The spec's Web Crypto route is "one extractable import". That
    means a private `CryptoKey` imported extractable on every anonymous `/healthz`, and if it is
    exported as JWK, an object holding `d`, `p`, and `q`. The plan constrains none of it.
  - **The catch echoes raw errors.** The site route's catch already echoes `err.message` to an
    anonymous caller (`examples/showcase/src/routes/healthz/+server.ts`), and Task 7 rewrites that
    branch.
  - **The probe's secret path.** The probe's key handling names sourcing, but it does not say how
    the key reaches a runtime that can run `loadHealth`.
- **Fold:**
  - The fingerprint is derived from `n` and `e` only, either parsed from the PKCS#1 DER or taken
    from a public JWK. The signing import in `appJwt` stays `extractable: false`.
  - A fingerprint failure omits `fingerprint` and never returns a message.
  - Task 7's catch returns a fixed detail.
  - One assertion: the serialized `HealthData` contains no substring of the fixture key's base64.
  - The probe passes the key to `wrangler dev` through a mode-600 `.dev.vars` in the scratch copy,
    deleted on exit, never through `--var` (the process list) and never in the worktree.

### m2 (minor): Task 9 never asserts that a conflicted delete keeps its bytes

- **Where:** plan:756-761.
- **Defect:** the head guard turns every delete race into a fail-closed conflict with no retry, so
  the conflict branch becomes the hot path. "A deleted row stays deleted" asserts the manifest
  side only. Nothing pins that a conflicted delete leaves the R2 object in place. Nothing covers
  the data-loss race either, where a publish referencing the asset lands inside the delete window.
- **Fold:** on each delete race (single and bulk), assert three things: the response is
  `MANIFEST_CONFLICT_MESSAGE`, the R2 object still exists, and no `media.deleted` is logged. Add
  one row where the in-window commit is a publish that references the asset under delete.

### m3 (minor): the guarded reads go by branch name, not by the head sha

- **Where:** plan:750-754 and plan:780-782.
- **Defect:** the guard's "head before reads" rule assumes a contents read is at least as fresh as
  the ref read before it. `readFile(path, backend.defaultBranch)` reads by branch name
  (`src/lib/github/repo.ts:82-86`). A lagging read returns content older than `head` and still
  commits cleanly onto `head`, which resurrects a row: the exact C11 loss. The existing
  `head ?? undefined` idiom (`content-routes-media-ingest.ts:238,249`) also degrades to the
  unguarded retry when `head` is null.
- **Fold:** each guarded path reads its snapshots at the `head` sha it passes as `expectedHead`.
  The contents API takes a sha as `ref`. A null head on the default branch refuses instead of
  committing unguarded. This is cheap, and it makes the guard exact. GitHub's replica lag is not
  verified here, so the finding is minor.

### m4 (minor): A1 does not name the likeliest wrong implementation as a mutation

- **Where:** plan:542-545 (acceptance) and plan:558-560 (mutations).
- **Defect:** the outcome keeps screen ids refused for `none` (plan:533-534). The likely bug is a
  `none` branch that consults the rule before the href check, which admits `none` on a screen-id
  rule that names its role. That would show the screen in a `none` session's sidebar. Neither the
  table's wording nor the mutations force a row where a screen-id rule names the `none` role.
- **Fold:** add that table row and the mutation "admit `none` on a screen-id rule naming its role".

### m5 (minor): the A6 save path runs under the softer stop rule

- **Where:** plan:251-253 and plan:702.
- **Defect:** Task 8 carries the lens's "a failure must never read as saved". As `engine-logic`, a
  second `fix` verdict gets one more round or an upshift instead of a stop. Its coverage notes are
  batched (plan:260-261), so a missing case like M2's `error` row can be demoted.
- **Fold:** keep the spec's class for the gate. Add Task 8 to the stop list for a standing
  *behavior* defect, and mark its acceptance rows blocking for coverage.

### m6 (minor): no review brief names C11 or the D1 delete gate

- **Where:** plan:1019-1024.
- **Defect:** the security reviewer's brief does not name the commit path. The Workers reviewer is
  pointed at "D1 writes", which reads as `AUTH_DB`. No close reviewer is told to read the C11 head
  guards or the D1 delete gate, the pass's two data-loss fixes. Only the per-task `diff-reviewer`
  sees them, and only against each task's own criteria.
- **Fold:** name both in the `web-auth-security-reviewer` dispatch. Name the C11 writers (publish,
  publish-all, Library, replace, alt, dictionary), with the head read placed before every
  snapshot read. Name the D1 delete gate over nested shapes and the pre-field manifest.

### O1 (over-ceremony, low cost)

- **Where:** plan:599.
- **What:** "applying 0001 after 0004 leaves `magic_token` intact" proves something 0001 cannot
  affect, since it never names `magic_token`. The existing `migrations-roles.test.ts` already
  covers the claim that matters, that the rebuild keeps the `editor` rows.
- **Fold:** drop the row, or fold it into that test as one assertion.

## Coverage map for the lens

| Risk | Test-first | Mutation | Reviewer | Live smoke |
|---|---|---|---|---|
| Runtime-required guard, dev handle, editor routes, map on adapter | yes | named, but not killable (M1) | security at close | yes, once M3 is fixed |
| No map attached mid-pass | S1 atomic | n/a | n/a | n/a |
| A3 migration and condition | yes | yes | security and Workers | unexecutable as written (M3) |
| Live key check: slot, timeout, bound, secrets | yes (node) | yes | security | single call, not under workerd (M5, m1) |
| C11 head guards, publish with a pending word | yes | yes | not named in any brief (m6) | none (keyless env); e2e covers publish |
| D1 nested images, safe delete in transition | yes | yes | not named (m6) | none; residual (M4) |
| A6 failed save | e2e | none (M2, m5) | svelte | none |
