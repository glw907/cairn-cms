# create-cairn-site Pass T4c: Builds connect plus deploy-config reconciliation (design)

The sixth tool pass, planned in its own sitting per the T4a spec's queue (T4a, T4b, T4c, T4d,
T5, Pass D). Parent docs: the umbrella design
(`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1 item 10), the T4a spec's T4c brief
(`2026-08-11-create-cairn-site-t4a-design.md`), the platform-spikes doc
(`../../internal/2026-08-09-tool-passes-platform-spikes.md` §§A-B), and the T4b.1 post-mortem.
The chapter architecture facts this spec builds on (state machine, catalogue kinds, the prefill
seam, the Git Data API push, the credential lifecycle) were re-verified against `main` at
`be9c6d91` on 2026-08-12; the Workers Builds platform facts below carry that date and rot on
Cloudflare's schedule.

## Rulings made this sitting (answer the brief's open questions)

1. **Builds connect rides a prefilled token; the wrangler session is structurally out.** The
   Builds management endpoints are gated by their own permission group, **Workers Builds
   Configuration: Edit**, plus **Workers Scripts: Read** (for the Worker-tag lookup), and
   accept **user-scoped tokens only** (Cloudflare's Builds API reference, verified
   2026-08-12). Wrangler's OAuth scope catalog (`workers-sdk` `packages/workers-auth/src/core/scopes.ts`)
   carries no `workers_builds:*` scope at all, so `wrangler login` cannot mint a qualifying
   grant regardless of API-side enforcement; spike B's open question closes as "no." The
   chapter therefore re-runs the T4a prefill seam with the Builds permission keys added.
   Two obligations ride this ruling: the prefill template mechanism silently drops
   unrecognized keys, so the exact key names must be verified against the live dashboard
   before the pass ships (the standing T4a discipline, still owed for the T4a keys too); and
   an open community report describes a blanket 401 (`code 12006`) on `/builds/*` under
   apparently-correct permissions, so the pass's opening spike proves the token path against
   the real account before anything is built on it.
2. **The reconcile commit lands through a fresh user-to-server OAuth trip via the site's own
   App** (Geoff, this sitting). After chapter 1 the tool holds no GitHub write credential:
   the App PEM lives only in the Worker's secret store, and the user token was a local
   variable that was never persisted. But the App's `clientId`, `clientSecret`, and
   `installationId` do persist, so the chapter re-runs the authorize half of chapter 1's
   OAuth machinery (`install.mjs` plus `loopback.mjs`, reused as-is, not copied) to collect a
   fresh short-lived user token, commits through the Git Data API exactly as `pushScaffold`
   does, and drops the token when the run ends. Attribution stays honest: the commit is the
   admin's own. The rejected alternatives are recorded so no plan relitigates: keeping the
   PEM on the state record through T4c violates the standing posture (the PEM leaves local
   state as soon as the Worker exists) and cannot serve already-completed sites; a hand-edit
   instruction fails the persona.
3. **The chapter verifies the first Builds deploy end to end** (Geoff, this sitting). The
   reconcile push is ordered to be the first Builds-triggered deploy: connect, trigger,
   push, then poll the build to `stopped` with a heartbeat and re-run the live marker checks
   (`/` 200, `/admin` 303 to `/admin/login`). A build failure is an act row carrying the
   tail of the build log. Stopping at the connected trigger was rejected because the
   reconcile push fires a build either way; the only question was whether the tool watches
   the proof of its own headline promise.
4. **Entry is flexible** (Geoff, this sitting). In the normal fall-through the chapter runs
   after chapter 2 reaches either terminal step, `email-live` or `paid-plan-declined`; both
   are legitimate finishes and Builds needs neither email nor the paid plan (its free tier
   is 3,000 build-minutes a month). Separately, the reserved `--connect` flag becomes real
   and enters the chapter directly from any state at or past `live`, so an owner who
   declined or parked the domain chapter still gets push-to-deploy; the reconcile commits
   whatever origin is current, and a later cutover re-reconciles by re-entering.
5. **The one-time Cloudflare GitHub App authorization is detected, not asked.** No API
   exists to perform or detect it (Cloudflare's own docs: the App install is the one
   dashboard prerequisite), so the chapter attempts the connections PUT and classifies the
   not-yet-authorized refusal (exact shape captured by the spike, not assumed) as a
   **wait-class park** that prints the dashboard deep link and re-detects on re-run: the
   T4a delegation idiom exactly. The raw GitHub install link
   (`github.com/apps/cloudflare-workers-and-pages/installations/new`) resolves but is
   unproven as a path Cloudflare's connections API can see, so the dashboard flow is the
   printed link unless the spike proves the direct one.

Standing rulings carried forward unchanged: no secret under the project directory; every
exit prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints
the whole chapter and performs none of it; no suite may touch the operator's desktop; every
platform claim carries a date and the plan re-verifies its own at implementation time; read
before write for every non-idempotent Cloudflare call (the T4b.1 rule).

## Scope

T4c takes a site from chapter 2's finish (or, via `--connect`, from any state at or past
`live`) to push-to-deploy: the repo connected to Workers Builds, a production trigger bound
to the existing Worker, the deploy-learned config reconciled into the repo, and the first
Builds deploy watched to success with the site still serving. After this chapter the
admin's laptop is disposable: an edit committed any way at all deploys itself.

The reconciliation closes the standing gap the brief names: `PUBLIC_ORIGIN` (rewritten
locally at first deploy, at the cutover, and on cutover rollback, never pushed), the
account id (today only in the state record; written into `wrangler.jsonc` as `account_id`
by this pass), and the email from-address in `cairn.config.ts`. The repo becomes the source
of truth a Builds deploy actually builds from.

Out of scope: the localhost console (T4d); the template repo and button (T5); any change to
the engine's public API; the fake-server plumbing extraction (T4d's trigger, and T4c adds
Builds routes to the existing `fake-cloudflare.mjs` rather than a third server, so the
trigger does not fire); the deferred defect list except the `PUBLIC_ORIGIN` gap this pass
exists to close; build-time environment variables and deploy hooks (no cairn scaffold needs
them; the endpoints are noted for whoever does someday); preview-branch triggers (the
persona edits `main` through the admin, and a second trigger is accretion until a real
consumer asks).

## The chapter's flow

The same step and state-machine idiom as T2 through T4b: one state record, one writer, pure
step functions over an in-memory record. New states past chapter 2:
`builds-connected` → `config-reconciled` → `builds-live` (final). The flow, in order:

1. **Admission.** Names what the chapter needs (a one-time authorization of Cloudflare's
   GitHub App, one fresh token paste) and what it costs (nothing new: the Builds free tier
   is 3,000 build-minutes a month and one concurrent build, stated plainly with the date).
   Declining parks cleanly; the site keeps working exactly as it was.
2. **Token prefill**, re-run with the Builds keys added to the T4a template. Same lifecycle
   as chapter 2: pasted through a hidden prompt (env var under `--yes`), 0600 in the state
   store, absent from argv and logs, deleted at the chapter's terminal step, cleared early
   only by `token-scope-missing` or `token-invalid`.
3. **Connect.** The GitHub-side numeric ids come from the GitHub API (`/users/{owner}`,
   `/repos/{owner}/{repo}`); the owner and repo names already sit on the state record. The
   connections PUT either succeeds (idempotent by read-before-write: list connections first
   and adopt an existing one, the T4b.1 rule) or refuses because the App is not authorized,
   which parks per ruling 5. Success records the connection uuid.
4. **Trigger.** Bind the existing Worker by its tag (`GET /workers/scripts`, matched on the
   name the tool itself wrote into `wrangler.jsonc`, so the name-must-match gotcha is
   structurally satisfied), with a build token from the build-tokens endpoint, the default
   branch as the only included branch, and build and deploy commands derived from the
   scaffold the tool itself emitted (`config_autofill` is captured by the spike as a
   cross-check on those commands, not a dependency). Read before write: list triggers and
   adopt one that already matches. Success records the trigger uuid and `builds-connected`.
5. **The reconcile commit.** Diff-based and idempotent: fetch the repo's current
   `wrangler.jsonc` and `src/theme/cairn.config.ts`, compare against the local disk copies
   the tool has been maintaining (after writing `account_id` into the local
   `wrangler.jsonc`), and commit only what differs. When a diff exists, run the OAuth trip
   (ruling 2) to collect the token, commit both files in one commit with a fixed message
   sentinel, and push by ref update; the push is the first Builds deploy. When nothing
   differs (a re-run after completion, or a `--connect` entry on a repo already current),
   skip the OAuth trip entirely and kick a manual build only if no successful build has
   been recorded. Success records `config-reconciled`.
6. **Watch the build.** Poll the build to `status: stopped` with the standing heartbeat,
   then branch on `build_outcome`: `success` re-runs the live marker checks against the
   current origin and records `builds-live`, deleting the token; `fail` (and `terminated`)
   is an act row carrying the last lines of the build log and the dashboard deep link; a
   build still queued or running past the poll budget is a wait-class park (the platform's
   own timeout is 20 minutes), re-entered by re-run. `skipped` and `cancelled` surface as
   act rows naming what happened; neither is a tool state.
7. **Completion.** The closing copy names what changed: pushes to the default branch now
   deploy themselves, the laptop is disposable, and the admin edits through the site's own
   `/admin` from here on. It claims what the tool observed (a build succeeded and the site
   answers), never more. A later re-entry that needs Builds writes re-runs the prefill for
   a fresh token and says so.

Every step follows the T2 through T4b error-catalogue discipline: literal message text per
row, classified wait / act / ask-someone / declined under the T4a exit semantics (waits and
declines return and exit 0; act and ask-someone rows throw and exit 1), each ending in one
next command, each triggered by a test. Expected new rows include the App-authorization
park (wait), the connect-declined row (declined), the build-failure and
build-config-mismatch rows (act), the token-scope rows extended to the Builds keys (act),
and the build-still-running park (wait); the plan owns the exact row list against the
spike's captured bodies.

## State and resume

The `cloudflare` sub-object gains flat keys, never a nested object (`updateSite`'s merge is
one level deep, the rule T4b locked): `buildsConnectionUuid`, `buildsTriggerUuid`, and the
last watched build's `buildsLastBuildUuid` and `buildsLastBuildOutcome`, written by the
chapter orchestration only, one hop per write, with a test proving a two-hop partial write
preserves sibling `cloudflare` fields. The GitHub
App's OAuth user token is never persisted, exactly as chapter 1. `--start-over` from any
T4c state refuses, naming what exists (a connection, a trigger, a live site). `--connect`
joins `args.mjs` as a real flag: it enters this chapter directly when the record sits at or
past `live`, refuses below `live` naming what must finish first, and is a no-op with a
plain statement when the record is already `builds-live`. Every hop is resumable: a re-run
at any state re-detects rather than re-writes (read before write throughout), and both
parks re-enter by plain re-run.

## Testing

The suite stays on fake bins and API fixtures. The Builds endpoints join
`test/fake-cloudflare.mjs` as routes on the existing server (no third fake server; the
extraction trigger stays unfired and filed for T4d); the GitHub id lookups, the OAuth
authorize trip, and the reconcile commit ride `test/fake-github.mjs`, which already models
the authorize redirect and the Git Data API. Every fixture body is copied verbatim from a
response the spike captured, with anything unobservable called out in-file (the standing
fake-cloudflare discipline). Triggered tests cover: every new catalogue row; the
App-not-authorized park and its resume; connect and trigger adoption on re-run (no repeated
writes, asserted through invocation logs); the diff-based commit (a changed file commits,
an unchanged repo skips the OAuth trip, the sentinel makes the commit idempotent); the
build poll's four outcomes; the cutover-then-reconcile round trip (`PUBLIC_ORIGIN` current
after a `--connect` re-entry); `--connect` entry from `live`, from chapter 2's terminals,
below `live` (refusal), and at `builds-live` (no-op); and `--dry-run` printing the whole
chapter with zero shell-outs and zero network.

**Task 1 is a live spike** (T2/T3 idiom: main loop, one sitting, fixture capture as it
goes), and it gates the pass: (a) mint a token with exactly the two named permission groups
and prove the Builds read path against the real account, settling the 401/12006 community
report's relevance; (b) capture the connections PUT refusal on an account whose GitHub App
is not authorized, which is the park row's fixture; (c) capture `config_autofill` for a
real cairn scaffold repo; (d) attempt the raw GitHub install link on a scratch context and
record whether the connections API sees the resulting installation (if yes, the printed
link may upgrade; if unproven, the dashboard link stands); (e) verify the Builds permission
key names against the live dashboard prefill template. If (a) fails on the real account,
the pass stops and reports rather than building against a broken platform path.

**The live e2e** runs the whole chapter against a real scaffolded site: connect, trigger,
reconcile, and a watched first build, with Geoff's browser moments enumerated (the App
authorization consent, the token paste, the OAuth click) and counted for the docs. It mints
another GitHub App only Geoff can delete (the standing cost note; the one-long-lived-App
procedure change stays open). Teardown deletes the trigger and connection by uuid and
verifies by listing; the App authorization is account-level and deliberately left in place,
recorded in the run notes.

## Documentation (a pass dimension)

The package README gains the chapter: the `--connect` flag, the park-and-resume story, the
token lifecycle (prefilled, pasted, deleted), and the one-time App authorization framed as
the single manual step. The changelog extends under `## Unreleased`. Chapter 2's closing
copy gains the forward pointer to the Builds chapter. The admin-track chapter pages belong
to Pass D (the standing carry-forward), which now owes the Builds chapter's browser-moment
count alongside chapter 2's. No engine reference page changes, since the public API is
untouched.

## Acceptance criteria

A run on a site at chapter 2's terminal (or `--connect` from `live`): the repo connected
and the trigger bound to the existing Worker, both adopted rather than re-created on
re-run; the repo's `wrangler.jsonc` and `cairn.config.ts` matching the tool's local copies,
including `account_id` and the current `PUBLIC_ORIGIN`, via a commit attributed to the
admin; the first Builds deploy watched to `success` and the live checks passing on the
current origin; the App-not-authorized park exiting 0, printing the dashboard link, and
resuming by re-run; a build failure exiting 1 with the log tail and one next command; the
pasted token 0600 in the state store during the chapter and absent from the record, argv,
logs, and output after `builds-live`; the OAuth user token never written anywhere; every
new catalogue row triggered by a test; `--dry-run` printing the whole chapter with zero
shell-outs and zero network; the runtime library untouched.

## What follows

T4d (the localhost console) follows T4c and precedes T5; its brief lives in the T4a spec
and is unchanged by this sitting. The T4d extraction trigger (a third fake server) remains
unfired; the loopback routing layer and the fake-plumbing extraction both land there.
