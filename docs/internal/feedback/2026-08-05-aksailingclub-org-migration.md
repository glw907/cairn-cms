# aksailingclub-org: 0.91.1 to 0.94.0-rc.1

## 1. The walk

Site `aksailingclub-org` (`glw907/aksailingclub-org`), `0.91.1` to `0.94.0-rc.1`, pinned exactly
rather than caret-ranged. This was the recipe-writing walk, the first of the four in this window,
so there was nothing to follow and the guide corrections below are its main engine-side output.

Lists crossed: `0.92.0` (two items: the tightened `one-filled-action`, and the stacked field
register becoming the default), `0.93.0` (nothing, all four seams additive), and
`0.94.0-rc.1` (fifteen `Consumers must:` entries, of which this site carried eight).

**Delta 1, what the guide got wrong.** `createD1AuditSink`'s entry says to apply the bundled
`migrations/0002_audit.sql`, unconditionally. That is wrong for the sites most likely to adopt the
sink. This site already had an `audit_log` table, in `migrations/asc-club/0001_substrate`, and it
is the table `0002_audit.sql` was derived from; running the migration would have failed on an
existing table. What the sink needs is a table it can bind `actor`, `action`, `entity`,
`entity_id`, and `detail` into, and saying that instead of naming a migration file would have made
the check obvious. The bundled schema's better `created_at` default (ISO 8601 UTC at millisecond
resolution, against this site's `datetime('now')`) is a real difference, but it is a reason to
migrate the column later, not a precondition. Fixed in the guide.

Also unnecessary, though not wrong: `formatCivilDate`'s fallback-default entry cost a search that
found nothing, because this site has its own `formatCivilDate` in `$admin-club/lib/ui` and never
imported the toolkit's. No guide change; the entry is correct and the collision is the site's.

**Delta 2, what the guide never mentioned.** The `EmailSender.send` widening from `Promise<void>`
to `Promise<unknown>` is presented as a fix that dissolves an incompatibility, and it carries no
`Consumers must:` line. It is a fix from the engine's side and a compile break from a consumer's:
this site declares its own structural `EmailBindingEnv` with `send(...): Promise<void>`, the shape
a site writes when it wants to read the binding loosely rather than trust
`CairnPlatformBindings`' `NonNullable` promise, and that declaration stopped accepting what
`CairnPlatformBindings['EMAIL']` now is. Five call sites. A `Consumers must:` line now says so.

Three smaller ones, all now in the guide. A hand-built event fixture missing `route` throws
`Cannot read properties of undefined (reading 'id')` from inside `section-action.js` rather than
failing closed, and the changelog's "needs `params` and `route`" does not connect to that symptom.
`createSectionAction`'s `Env` has to be the site's whole `App.Platform['env']`, not the narrow
standalone slice the reference's worked example shows, or every binding a handler reads beside the
section's own two disappears. And `cairn-doctor`'s two zone checks report a Cloudflare API 403 with
the identical `FAIL` and remediation text a genuinely wrong zone setting gets; both of this run's
doctor failures were the API token lacking Zone Settings Read, and the suggested fix was to change
settings that are already correct.

**First gate failure.** `npm run build`, after `svelte-check` was clean at 0 errors and all 2057
tests passed. `MISSING_EXPORT: "cookieName" is not exported by
node_modules/@glw907/cairn-cms/dist/auth-crypto/browser.js`, five of them. `/auth-crypto` is
server-only and its `browser` condition throws on import; TypeScript resolves the `types`
condition regardless and says nothing, and the test runner never bundles for a browser. The error
names the stub file rather than the reason.

The diagnosis was the site's, not the engine's: `/join/apply/+page.svelte` reaches `standing.ts`,
which wanted `toSqliteDatetime` from the member-auth crypto module, so one client page had been
pulling that whole module into the browser bundle all along. The fix was to split the two SQLite
datetime helpers into their own module. **This is the highest-signal event in the walk**: the
engine's server-only condition is the first thing in three years of this site's life to say that
coupling out loud, and it can only say it at bundle time. There is no compile-time channel for
"this import is reachable from the client," so the guide now carries a section naming the symptom
and the usual cause.

**A second, worse gate failure, at the Playwright suite.** The deployed Worker does not start:
`/auth-crypto` and `/cloudflare` publish a `browser` condition, and `browser` is a condition a
Workers build resolves too, so the *server* bundle gets the throwing stub. 75 of 75 specs failed
with `ERR_CONNECTION_REFUSED`, and nothing in that output names a cairn subpath. **This blocks the
RC for every consumer in this window**, since both subpaths are server-side Cloudflare primitives;
it needs an `rc.2` adding a `worker` condition ahead of `browser`. Filed in full, with the fix
verified against this site, as
[the RC blocker](./2026-08-05-rc1-worker-condition-defect.md). The migration branch is complete
and green on `check`, `test`, `build`, and `cairn-audit`, and is held at this defect.

**Runtime-only, past typecheck and build.** Two more, both caught by the test suite rather than by
anything the engine could have flagged. The `locals` rename is invisible to a site that declared
its own `App.Locals.auditSink` instead of importing `/ambient`: `hooks.server.ts` kept compiling
while writing a key the engine no longer reads, so audit persistence would have silently stopped.
And cairn's packaged `verifyTurnstile` refuses a blank token pre-flight where this site's
thirteen-line copy posted it to siteverify, which exposed a test that had been asserting a
mocked success against an empty token.

## 2. Seam fit

| Seam | Fit without a workaround? | What the site hand-wrote beside it | Defaults overridden |
| --- | --- | --- | --- |
| `createD1AuditSink` | Yes, and the packaged insert matched the existing table column for column. The one gap is structural: the sink is fire-and-forget by contract, so it cannot join a `db.batch()`. Four site operations that need their audit row atomic with the write it describes (the season rollover, the signup statements, two enrollment writes) still hand-roll their insert, correctly. | Nothing for the admin path. The scheduled jobs runner keeps its own `actor`/action vocabulary (`'system:cron'`, `job.run`, `job.send_cap_hit`) and threads the `scheduled` handler's `waitUntil` through, since the sink returns before its insert settles and a cron tick's last rows would otherwise drop. | None. |
| `createSectionAction` | Yes. It absorbed the site's whole hand-rolled `clubAdminAction`: the composition that file's header argued for is the composition the engine now ships, and the site's version is 57 lines of config where it was 128 lines of logic. | Nothing. The site's own `ClubActionContext`/`ClubActionOptions` are now type aliases over the engine's, kept only so 40-odd call sites need no edit. | None. The rate limit is configured rather than overridden, and no call site declares `target`, since the site's access map keys on path prefixes that a bracket-form route id still matches. |
| `/cloudflare` | **No**, for the same reason as `/auth-crypto` below: it does not start on Workers as published. Once fixed, yes, and both primitives are strictly stricter than the copies they replaced. `verifyTurnstile` takes `(token, secret, opts)` where the site's copy took `(token, ip, secret)`; two adjacent string parameters swapping order is a silent hazard, and the only thing that caught it here was that the site changed every call site at once. | `RATE_LIMIT_MESSAGE`, the user-facing refusal copy, which is the site's and should be. The Turnstile site key and the `Window.turnstile` ambient type stay site-side too; the seam covers verification only. | None. No call site passes `hostname` or `action`, which is a gap on the site's side, not the seam's. |
| `/auth-crypto` | **No.** The subpath does not work on Cloudflare Workers as published (see the RC blocker above); this row describes the fit once that is fixed, measured against a locally patched copy. Yes for the cryptography. The server-only `browser` condition is the whole first-gate-failure story above, which is a fit question only in the sense that adopting the subpath surfaces a coupling a site may not know it has. | A thin naming layer, `member-auth/lib/crypto.ts`, that keeps the member store's own cookie base names and its deliberately-different 15-minute token TTL. The cryptography underneath is gone; only the domain naming remains. `tokensMatch` had been reimplemented twice more, in `auth.ts` and `portal-action.ts`, and both are now the engine's. | None. |

One shape the four seams do not cover, worth recording rather than filing: this site's
`portalAction` wrapper guards `/my-account/**` writes for a **member** session, which is not a
cairn editor at all. `createSectionAction` composes `adminAction`, so it serves the admin audience
only, and the portal wrapper stays hand-rolled by necessity. No ask is filed; the site's two
audiences are its own design, and ruling 5 already declined a composed wrapper on a weaker case.

## 3. Cost

Tokens: roughly 65.6M total across the session, of which 187K output and 64.7M cache reads, read
off the session transcript's own usage records. The cache-read share is what an execution session
costs; it is the number the next three walks should come in under.

Human interaction points: **zero**. No questions, no approvals, no corrections. Two judgment calls
were made and stated rather than asked: taking `0.92.0`'s stacked field register as the default
(the site's own ratified mockup had asked for it and `EventForm.svelte` recorded it as a wanted
future addition), and leaving the `created_at` column format alone rather than expanding the pass
into a table-rebuild migration against live audit rows.

One before/after is owed to Geoff, which is the repo's standing gate on any visual change and not
a defect of this walk: the field-register flip is the migration's one visual effect.

## 4. Where each finding went

- The unconditional `migrations/0002_audit.sql` step: **fixed here**, in the guide's `0.94.0-rc.1`
  section.
- The missing `EmailSender.send` `Consumers must:` line: **fixed here**, added to the same section.
- The `route`-less fixture TypeError: **fixed here**, in the `CairnEvent` entry.
- `createSectionAction`'s `Env` needing the site's whole platform env: **fixed here**, in the new
  "What a green typecheck misses" section.
- The server-only `browser` condition's bundle-time-only failure: **fixed here**, its own item in
  that section, since no engine change can move it earlier.
- The unauthenticated rendered audit reporting a clean pass over twelve renders of the sign-in
  card: **fixed here**, step 8 of the upgrade steps.
- Baselines needing regeneration after a rendering window: **fixed here**, step 7.
- `cairn-doctor` reporting a zone-settings 403 as the same `FAIL` a wrong setting gets:
  **filed to the friction log**, since the real fix is in the check, not the guide; the guide
  carries a warning in the meantime.
- `createD1AuditSink` being unable to join a `db.batch()`, so an audit row cannot be atomic with
  the write it describes: **filed to the friction log**, with a candidate fix (export the bound
  statement the sink already builds) and the note that the same need from a second site is the
  altitude signal.
- `verifyTurnstile`'s `(token, secret, opts)` against the `(token, ip, secret)` copy it replaces:
  **fixed here**, a warning in the guide's `/cloudflare` entry, since the swap compiles and then
  fails closed on every submission.
- `formatCivilDate`'s entry costing a search that found nothing: **dropped**, not true as a finding.
  The site's same-named local is the site's own.
- The 65 pre-existing `no-uncompiled-class` findings on this site's Club screens: **filed to the
  site's own polish backlog**, not an engine finding. Verified pre-existing by checking the flagged
  classes against `0.91.1`'s shipped sheet; six of seven sampled were already absent there, and
  nothing in this window removed a class.
- The `browser` condition firing for the Workers server build: **filed as its own document**,
  `2026-08-05-rc1-worker-condition-defect.md`, because it blocks the RC rather than informing it.
  It is engine code, not a guide gap, so nothing about it went into the upgrade guide.
- The `datetime('now')` `created_at` column: **filed to the site's own polish backlog** as a future
  migration, weighed against a table rebuild on live audit rows and deliberately not taken here.
