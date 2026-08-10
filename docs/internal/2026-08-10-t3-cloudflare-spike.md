# T3 Cloudflare chapter spike (verified 2026-08-10)

Task 1 of the T3 plan: rehearse the whole Cloudflare chapter by hand against the glw907 account
before any of it is written, so no task is drafted against a stale premise. Every finding below
was established by running the real command against the real account and reading its exit code
and output, except where it says otherwise.

The rehearsal baked the template from packed tarballs (the CI pattern), laid down a scratch site
named `t3-spike-a570e2`, hand-edited its `wrangler.jsonc` to the id-less slug shape Task 5 will
produce, and then ran the chapter's commands in order: install, build, deploy, migrate both
databases, rewrite `PUBLIC_ORIGIN`, redeploy, put the key as a Worker secret, seed the owner and
a bootstrap token, and drive the confirm page. Everything it created is torn down and verified
gone (see Teardown).

Toolchain: wrangler **4.120.1**, the version a scaffolded site's own `wrangler: ^4`
devDependency resolves to today, not the 4.97.0 the repo root pins. Node 24.16.0, npm 11.15.0.
Auth was the standing `CLOUDFLARE_API_TOKEN`, which makes wrangler non-interactive with no
browser trip.

**Verdicts in one line: the id-less config works end to end and needs no write-back, the
bootstrap sign-in works exactly as designed with no engine change, multi-statement `d1 execute`
is accepted, and the plan's action order has a defect that would break every fresh run.**

## (a) Id-less auto-provisioning: confirmed. Write-back: absent

A `wrangler.jsonc` whose two `d1_databases` entries carry `database_name` and `migrations_dir`
but no `database_id`, plus an `r2_buckets` entry, deploys clean. Wrangler provisioned all three
before uploading:

```
The following bindings need to be provisioned:
env.AUTH_DB              D1 Database
env.APP_DB               D1 Database
env.MEDIA_BUCKET         R2 Bucket
Provisioning AUTH_DB (D1 Database)...
🌀 Creating new D1 Database "t3-spike-a570e2-auth"...
✨ AUTH_DB provisioned 🎉
...
🎉 All resources provisioned, continuing with deployment...
```

A `diff` of `wrangler.jsonc` taken before and after the deploy shows **no change at all**.
Wrangler binds by name and writes nothing back. The umbrella's write-back claim, dated
2026-08-09, is wrong for wrangler 4.120.1.

**This does not need fixing, which is the more useful half of the finding.** The id-less config
is sufficient for every command the chapter runs, proven separately below: migrations resolve the
binding without an id (d), the second deploy inherits its bindings (g), and a deploy that meets
already-existing named resources reuses them rather than colliding (h). So the plan's decision
gate ("write-back absent → Task 7 parses the created ids and writes them into `wrangler.jsonc`
itself") resolves to **no parsing and no id write-back in T3**. Reconciling the real ids into the
pushed repo stays where the spec already put it, a named T4 open item that Builds forces, since a
Builds deploy builds from the repo rather than the admin's disk.

A related observation, same mechanism: `wrangler d1 create` offers to add the binding to the
config file and, in a non-interactive context, answers its own prompt with `no`.

## (b) The `send_email` binding deploys with no onboarded sending domain

The Worker deployed with the template's `"send_email": [{ "name": "EMAIL" }]` intact and no
sending domain onboarded for the site. The binding is listed as live:

```
env.EMAIL (unrestricted)      Send Email
```

Chapter 1 therefore deploys with email unconfigured, as designed. The estate is Workers Paid, so
this run cannot settle the free-plan half. Cloudflare's current docs answer it indirectly and
favorably: before a sending domain is onboarded you may send only to verified destination
addresses, and those sends are free "on any plan, including when only Email Routing is
configured". Sending to an arbitrary recipient is what needs the onboarded domain.

Two corrections to absorb, both against this repo's own durable gotcha in `CLAUDE.md`, which
predates the rename to Cloudflare Email Service: the surface now also has a REST send endpoint
alongside the Workers binding, and the "Sending needs Workers Paid" line is at best imprecise
about verified-destination sends. The gotcha should be re-read against the current docs by
whichever pass next touches email, which is T4.

## (c) Non-TTY behavior: no hang anywhere, and wrangler answers its own prompts

Every command in the rehearsal ran with stdout redirected to a file, the tool's own shape.
Nothing hung. Where wrangler would prompt, it detects the non-interactive context and prints the
fallback it chose:

```
? About to apply 2 migration(s)
  Your database may not be available to serve requests during the migration, continue?
🤖 Using fallback value in non-interactive context: yes
```

So the plan's `CI=1` contingency is not needed. Note the mechanism the tool gets this from for
free: the spawn seam captures stdout, so the child's stdout is a pipe rather than a TTY, and
wrangler is non-interactive no matter what the admin's own terminal is.

**A subdomain-less account is the one case this account cannot exercise** (the estate has had a
subdomain for years). Per an open workers-sdk issue, wrangler fails with a clear error rather
than hanging: `You need a workers.dev subdomain in order to proceed. Please go to the dashboard
and open the Workers menu. Opening the Workers landing page for the first time will create a
workers.dev subdomain automatically. [code: 10063]`. Task 7's `subdomain-unregistered` mapping
should match on `workers.dev subdomain` or the code `10063`, either of which is tighter than the
plan's `/subdomain/i`.

## (d) Command shapes: all three accepted

- **`wrangler d1 migrations apply AUTH_DB --remote` takes the BINDING name**, against the id-less
  config, and resolves it: `🌀 Executing on remote database AUTH_DB
  (54794a4d-1f1f-46db-8805-b7571d097889)`. Both databases migrated, exit 0 each. Task 7 needs no
  `names` param and no database-name fallback.
- **`d1 execute --remote --command` accepts several statements separated by `;`.** The seed's
  three statements (the `ON CONFLICT` owner insert, the `DELETE`, the token insert) ran as one
  invocation and returned three result objects, `"success": true` on each. **The plan's `--file`
  fallback is not needed**; Task 9 keeps `--command` and drops the temp-file branch.
- **`wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` accepts the value piped on stdin**:
  `✨ Success! Uploaded secret GITHUB_APP_PRIVATE_KEY_B64`, and `wrangler secret list` shows it.

## (e) The deploy output's URL line

The URL appears exactly once in 155 lines of deploy output, alone on an indented line, with no
ANSI escapes on it:

```
Deployed t3-spike-a570e2 triggers (0.65 sec)
  https://t3-spike-a570e2.glw907.workers.dev
Current Version ID: 851dd846-9968-4752-82d4-563f72c0c2d2
```

`/https:\/\/[^\s]+\.workers\.dev/` on the first match is correct. One caution the sample makes
plain: **wrangler emits ANSI escapes even when stdout is a pipe**, so the surrounding captured
text is full of `\x1b[37m` and friends. The URL line itself is clean, but Task 7 should strip
ANSI before matching rather than rely on that staying true.

## (f) Local resolution

From the scaffold directory after `npm install`, `npx --no-install wrangler --version` resolves
the site's own devDependency and prints `4.97.0` from the repo root but **4.120.1 from the
scaffold**, confirming it takes the site's copy rather than anything ambient.

## (g) Deploying a name that already exists

The second deploy (after the `PUBLIC_ORIGIN` rewrite) exits 0, keeps the same URL, and reports
its storage bindings as `inherited` rather than re-provisioning:

```
env.AUTH_DB (inherited)      D1 Database
env.APP_DB  (inherited)      D1 Database
```

So the chapter's two-deploy shape is safe, and the same-url assertion Task 10 makes will hold.
The consent copy's "deploying again later updates it" is accurate.

## (h) Re-provisioning when the resources exist but the Worker does not

Added by the spike, because it is the realistic resume path the plan leans on: a first deploy can
create the databases and then fail before the Worker exists, and the re-run then meets an id-less
config whose named resources are already there.

Rehearsed directly. Both databases and the bucket were created by hand with no Worker, then the
id-less config was deployed. Exit 0, **no provisioning step ran at all**, and the bindings
resolved straight to the existing named resources; a following `migrations apply AUTH_DB
--remote` targeted the hand-created database (`137b645a-b5b7-4e19-ba06-d236df9edff0`). Name
resolution, not creation, is what a deploy does when the resource exists. Task 11's resume path
is safe as written.

## (i) The plan's action order is wrong, and every fresh run would hit it

Task 10 orders the chapter `ensureLogin → ensureInstalled → buildSite → deployWorker`, and Task 3
resolves wrangler as `npx --no-install wrangler` in the scaffold directory. On a fresh scaffold
there is no `node_modules` when `ensureLogin` runs, so its `wrangler whoami` cannot resolve.
Rehearsed in a directory holding only a `package.json` that declares `wrangler: ^4`:

```
$ npx --no-install wrangler whoami
npm error npx canceled due to missing packages and no YES option: ["wrangler@4.120.1"]
exit code: 1
```

Two amendments follow, both applied to the plan in this pass:

1. **Task 10 runs the install before the login.** The order becomes `ensureInstalled →
   ensureLogin → buildSite → deployWorker → writePublicOrigin → applyMigrations → deployWorker`.
   Installing first is what puts the site's own wrangler on disk; putting the login next still
   gets the admin's one browser moment out of the way before the long build rather than after it.
2. **The missing-wrangler failure is not `ENOENT`.** Task 3's seam assumed a spawn-level error;
   what actually happens is a clean exit 1 from `npx` with `canceled due to missing packages` on
   stderr. The seam must treat both as the same "could not run wrangler at all" condition and
   reject with the catalogue's `wrangler-unavailable` row, distinct from "wrangler ran and
   failed", which still returns `{ code }` for the caller to map. That makes `exec.mjs` a
   consumer of `catalogue.mjs`, so **Task 4 is dispatched before Task 3**.

## The bootstrap premise: proven end to end, no engine change

The whole point of the rehearsal. Seeded the owner row and one hashed token with
`d1 execute --remote`, generating the token exactly as Task 9 will (`randomBytes(32)` as
base64url, SHA-256 as lowercase hex), then drove the engine's own confirm page the way a browser
does: GET for the CSRF cookie and the hidden fields, then POST the form.

```
POST /admin/auth/confirm?/confirm   →  303  →  https://…/admin
GET  /admin  →  200, final URL https://…/admin/posts
<title>Posts · Waymark</title>, page shows t3-spike@example.com
```

A signed-in admin, from seeded rows alone, with no email loop and no change to the engine. Two
mechanical details Task 9 and Task 12 both need:

- **The form posts to `?/confirm`**, SvelteKit's named action, not to the bare path. A POST to
  `/admin/auth/confirm` with no action query returns 404. This costs the tool nothing (it hands
  the admin the GET URL and the browser submits the form), but a scripted e2e must use it.
- **A scripted confirm must send a browser-like `Accept` header.** With curl's default `*/*`,
  SvelteKit's content negotiation returns its action-result envelope,
  `{"type":"redirect","status":303,"location":"/admin"}` under HTTP 200, instead of a real 303.
  The session cookie is set either way, so this is a curl artifact rather than a product defect,
  but an e2e asserting on the status would read it as one.

The owner email was normalized on insert (`T3-Spike@Example.COM` stored as
`t3-spike@example.com`), matching the store's own invariant, and the session reached `/admin`
with the App key present only as a Worker secret.

## Teardown

Both rehearsals' resources are gone, verified by listing rather than by assuming:
no `t3-spike-*` D1 database, no `t3-spike-*` R2 bucket, the Worker absent from the account's
script list, and its `workers.dev` hostname returning 404.

One operational note for Task 12's teardown: **`wrangler delete` needs a permission the standing
estate token lacks.** It deletes the Worker and then fails on the way out with `Unable to get
membership roles. Make sure you have permissions to read the account. Are you missing the
User->Memberships->Read permission?`. The deletion itself lands; only the confirmation step
fails. `DELETE /accounts/{id}/workers/scripts/{name}?force=true` is the clean alternative and is
covered by the token as it stands. Worth recording in the estate inventory as a token gap.

## Sources

- Every command above, run against account `glw907` (`120c269ad6d3dfbe6d63a0bb53758ca0`) on
  2026-08-10; transcripts under the job scratch directory for this session.
- [Cloudflare Email Service limits](https://developers.cloudflare.com/email-service/platform/limits/)
  and [send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
  for the verified-destination and onboarding rules in (b).
- [workers.dev subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
  and [workers-sdk#9045](https://github.com/cloudflare/workers-sdk/issues/9045) (open, wrangler
  4.13.0) for the subdomain-less error text in (c).
