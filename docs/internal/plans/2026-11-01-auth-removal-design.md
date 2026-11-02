# Auth removal: design note

Pass 1a, slug `auth-removal`, class `auth-data` with `runner` for `scripts/checks`. Initiative:
`shared-standards`. Beside pass 1b, in its own worktree. Geoff approved the scope through
`design-audit/design.md` (packet 20261101T122027-138291), the run sheet (packet
20261101T125326-233255), and #203's addition (packet 20261101T150717-448700).

## Outcome

cairn stops shipping a member sign-in, and a site that needs one builds it on `/auth-crypto` from a
recipe with no known gap. The engine's GitHub token reaches one repository with `contents: write`.
The sign-in routes take the runtime like every other route factory. Names and options no site uses
leave before the first release sets them.

## What changes

| Item | Result |
|---|---|
| #189 | `second-sign-in-group.md`'s roll-your-own recipe gains the missing discipline. One hook order: guard last. |
| #203 | `installationToken` mints for `[repo]` with `{ contents: 'write' }`. `AppCredentials` gains `repo`. The cache and the live check key on it. `/healthz?live=1` reports a 422 as `token_request_refused`. |
| E2 | `/auth-channel`, `migrations-channel/`, the showcase members code, `createChannelDb`, 13 log events, `originMatches`, `isDeployedHost`, and eval S03 go. |
| E11 | `/auth-store` goes, and `resolveOwnerLevelRoles` leaves the root barrel. |
| `bootstrapOwner` | Goes with `insertOwnerIfEmpty` and `editor.bootstrapped`. `adopt-cairn.md` teaches the SQL step. |
| Shape 13 | `createAuthRoutes({ runtime, send })`. `CairnAdminConfig.auth` is `{ send? }`. `AuthBranding` goes. `RequestOutcome` becomes `LoginRequestOutcome` with `sent` dropped. |
| `tokensMatch` | Becomes `compareTokens`. |
| Smoke | `admin-smoke-test.md` gains a migrated local D1 and two seeded editors. |

## Calls made here

These fall inside the approved scope. The PR's `## Decisions` repeats them.

- A 422 gets its own class. GitHub's page says "The installation access token cannot be granted
  access to repositories that the installation was not granted access to", and "cannot be granted
  permissions that the app was not granted", and lists 422 as "Validation failed, or the endpoint has
  been spammed". Today `classifyMintFailure` reads any other status as `unreachable`, which would send
  an owner chasing a network fault. The name is `token_request_refused`, in the `snake_case` of its
  siblings. It has to hold for every cause a 422 can have: an uncovered repository, an App without
  Contents write, a stale `repo` name, or spam. `repository_not_covered` is true of one, and
  `token_scope_refused` isn't true of spam. The recovery page must not send a 422 to a key rotation,
  since the key is fine.
- A renamed repository now fails at the mint. `/repos/{owner}/{old}` follows GitHub's redirect today, so
  a stale `repo` value works. After #203 that name reaches a validated body. Read from the docs, not
  run. T8's `Consumers must:` line says so, and every token now comes from this one mint, so reads fail
  with it.
- `contents: write` alone. Every engine route is a contents route on GitHub's permissions page:
  `git/trees`, `git/commits`, `git/refs`, `git/ref`, `contents`, `commits`, all "Contents". The engine
  never commits under `.github/workflows`: `commitOnTree` builds each tree on its parent's tree from
  the save's own `FileChange` list.
- `insertOwnerIfEmpty` goes too. `auth-routes.ts:222` is its one production caller, so it is dead
  once `bootstrapOwner` leaves. `create-cairn-site` carries its own SQL in `bootstrap.mjs`, which reads
  a comment only.
- `originMatches` goes too. `factory.ts:76` is its one production caller, and `slim.md:211` says it goes with E2.
- `isDeployedHost` goes too. `factory.ts:123` is its one production caller, and the ledger's rule is that
  wiring with no reader goes.
- `csrf-origin.spec.ts` stays and moves to `/admin/login`. It is on the `authData` list, and its first two
  tests prove Kit's refusal, which outlives the members form. `capture-transport.spec.ts` goes with the
  transport it tests.
- `src/lib/log.ts` leaves the template. Dropping `'members.login.requested'` would leave the
  template's `SiteLogEvent` an empty union, and nothing in the template imports the module. The
  showcase keeps it for `/admin/signups`.
- `/admin/signups` stays, with its baselines. The sheet says those baselines "leave with the
  showcase members code", but the route has no members code: it reads `APP_DB` through
  `createSectionAction`, `custom-screen.spec.ts` drives it, and pass 6 builds on it. If a CI visual run
  shows a diff there anyway, the standing regenerate through `e2e.yml`'s `update_snapshots` applies.
- `card` stays enabled in `tokens.css`. Its stated reason changes, and so does the "genuinely renders"
  sentence, which would contradict the keep. Removing it would change a scaffolded site's CSS for no gain
  this pass. No route renders it now, so `## Decisions` lists it, and a later pass can take it.
- The advice stays. Geoff ruled that `install.mjs:237` and `catalogue.mjs:133` keep "All
  repositories". `create-your-site.md:88` already says to narrow afterward. The `packages/` half of #203
  does not fold.

## Not done

- `createAuthRoutes` stays public until E9 in pass 3. No page teaches its old shape.
- `docs/internal/engine-rulings.md`: pass 1b records every reversed ruling, including this pass's.
- #24, #182, #187, #198, and every other `keep` below: their lines stay.
- `ROADMAP.md:161`'s xcathletes line: pass 8's R9.

## End-to-end check

The live admin smoke on the built showcase under `wrangler dev`, with a real magic-link round trip,
then `standards:web-auth-security-reviewer`'s read and green CI on the head.

## What is not proved

**The scoped mint has not run against GitHub.** A read-only planning probe was refused by the harness,
and the plan does not work around that. The request shape comes from GitHub's REST docs, and the
placeholder key means the smoke never mints.

- The 422 for an uncovered repository, a missing permission, or a stale name is inferred from the docs.
  If GitHub answers 404 or 403, the check reads `installation_not_found` or `installation_suspended`,
  which point near the right fix.
- Whether `POST` and `PATCH` on `git/refs` work without `workflows: write`. GitHub's table marks
  both with "additional permissions" and lists them under the Workflows heading too, so a ref move that
  carries a workflow-file change can be refused. The engine's commits carry none, and `createBranch`
  points a new ref at a commit already in the repository. That is safest when `branch` is the default
  branch; a content branch that differs from it by a workflow file is unproved. Only a scaffolded App
  loses anything here: it holds `contents`, `administration`, and `workflows`, and the App
  `adopt-cairn.md` teaches holds Contents alone.
- Metadata. The docs list it as separately requestable and do not say a `permissions` body keeps
  it. No engine route needs it.

The first real proof is the release's real install on rc.2, which publishes through a real App, and it
proves only a scaffolded App. A ref write refused for workflows stops for Geoff, who is at that sitting,
with the cause in hand. No fallback is written now. T8 files that as a backlog item placed at the
release.
