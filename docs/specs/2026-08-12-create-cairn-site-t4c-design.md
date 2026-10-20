# create-cairn-site Pass T4c: Builds connect plus deploy-config reconciliation (design)

The sixth tool pass, planned in its own sitting per the T4a spec's queue (T4a, T4b, T4c, T4d,
T5, Pass D) and amended once in that sitting after a three-agent adversarial review of this
spec and its plan (findings and triage recorded in the plan). Parent docs: the umbrella design
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
   2026-08-12). Wrangler's session offers no builds scope (spike §A's live
   `wrangler login --scopes-list` run), so spike B's open question closes as "no." The
   chapter re-runs the T4a prefill seam, and **the chapter-3 key set is the union: the five
   verified T4a keys plus the Builds keys.** The union is forced twice over: the seam
   validates every token with `listZones`, which a Builds-only token cannot pass, and the
   saved token lives at the one `cloudflare.apiToken` key, where a narrower token would
   poison a later chapter-2 re-entry. Only the new Builds key names are owed dashboard
   verification (the five T4a keys were confirmed live 2026-08-11, recorded in
   `prefill.mjs`); the template silently drops unrecognized keys, so shipping an unverified
   key is shipping a broken URL. The open community report of a blanket 401 (`code 12006`)
   on `/builds/*` under apparently-correct permissions makes the opening spike a gate, not
   a formality.
2. **The reconcile commit lands through a fresh user-to-server OAuth trip via the site's own
   App** (Geoff, this sitting). After chapter 1 the tool holds no GitHub write credential:
   the App PEM lives only in the Worker's secret store, and the user token was a local
   variable that was never persisted. But the App's `clientId`, `clientSecret`, and
   `installationId` do persist, and `src/github/oauth.mjs` already exports `reauthorize`,
   which runs the whole trip (its own loopback, the authorize URL, the `state` check, the
   code exchange) from exactly what persists and returns the short-lived token without
   writing it anywhere. The chapter uses that seam; it does not rebuild it, and it does not
   touch `install.mjs`, whose entry point needs the deleted PEM. Attribution stays honest:
   the commit is the admin's own. The rejected alternatives are recorded so no plan
   relitigates: keeping the PEM on the state record through T4c violates the standing
   posture and cannot serve already-completed sites; a hand-edit instruction fails the
   persona.
3. **The chapter verifies the first Builds deploy end to end** (Geoff, this sitting). The
   reconcile push is ordered to be the first Builds-triggered deploy: connect, trigger,
   push, then find the push's build (newest build whose commit matches the reconcile
   commit), poll it to `stopped` with a heartbeat, and re-run the live marker checks
   (`/` 200, `/admin` 303 to `/admin/login`). A build failure is an act row carrying the
   tail of the build log. Stopping at the connected trigger was rejected because the
   reconcile push fires a build either way; the only question was whether the tool watches
   the proof of its own headline promise.
4. **Entry is flexible, and re-entry always re-reconciles** (Geoff, this sitting; the
   re-reconcile half added at the adversarial gate). In the normal fall-through the chapter
   runs after chapter 2 reaches either terminal step, `email-live` or `paid-plan-declined`;
   both are legitimate finishes and Builds needs neither email nor the paid plan (its free
   tier is 3,000 build-minutes a month). The reserved `--connect` flag becomes real and
   enters the chapter directly from any state at or past `live`, guarded by an **explicit
   allowlist of admitted steps** (never an index comparison: chapter 2's `stepIndex` treats
   unknown steps as "fresh from `live`", which would admit a half-scaffolded site). And a
   record already at `builds-live` is **not a no-op**: entry re-runs the reconcile diff and
   reports "nothing to reconcile" only when the diff is genuinely empty. This is the remedy
   for the stale-origin defect one layer up: a cutover after Builds connect rewrites
   `PUBLIC_ORIGIN` locally, and without re-entry the next Builds deploy would silently
   revert the cutover from the repo's stale copy. The fall-through after a later chapter-2
   completion re-enters chapter 3 for exactly this reason.
5. **The one-time Cloudflare GitHub App authorization is detected, not asked.** No API
   exists to perform or detect it (Cloudflare's own docs: the App install is the one
   dashboard prerequisite), so the chapter attempts the connections PUT and classifies the
   refusal (exact shapes captured by the spike, not assumed) as a **wait-class park** that
   prints the dashboard deep link and re-detects on re-run: the T4a delegation idiom
   exactly. Two conditions get two rows, because GitHub's install flow defaults to
   per-repository selection: the App not authorized at all, and the App authorized but this
   repository not selected. The raw GitHub install link
   (`github.com/apps/cloudflare-workers-and-pages/installations/new`) resolves but is
   unproven as a path Cloudflare's connections API can see, so the dashboard flow is the
   printed link unless the spike proves the direct one.
6. **`--yes` consents to the chapter and parks at the browser** (added at the adversarial
   gate). T4b's rule, an unattended run declines rather than committing the owner, keyed on
   consent that costs money; Builds is free, so `--yes` consents to the admission silently
   and proceeds through connect and trigger on `CAIRN_CF_API_TOKEN`. But the reconcile's
   OAuth trip needs a human in a browser, so an unattended run with a real config diff
   parks there with a wait row naming the interactive re-run, rather than opening a browser
   nothing will answer.

Standing rulings carried forward unchanged: no secret under the project directory; every
exit prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints
the whole chapter and performs none of it; no suite may touch the operator's desktop; every
platform claim carries a date and the plan re-verifies its own at implementation time; read
before write for every non-idempotent Cloudflare call (the T4b.1 rule).

## Scope

T4c takes a site from chapter 2's finish (or, via `--connect`, from any allowlisted state at
or past `live`) to push-to-deploy: the repo connected to Workers Builds, a production
trigger bound to the existing Worker, the deploy-learned config reconciled into the repo,
and the first Builds deploy watched to success with the site still serving. After this
chapter a content edit committed any way at all deploys itself; the closing copy claims
exactly that, and does not claim the laptop is disposable outright, because engine
migrations still run through the CLI (`wrangler d1 migrations apply` has no Builds
equivalent) and the README says so.

The reconciliation closes the standing gap the brief names: `PUBLIC_ORIGIN` (rewritten
locally at first deploy, at the cutover, and on cutover rollback, never pushed), the
account id (today only in the state record; written into the local `wrangler.jsonc` as
`account_id` by this pass, with the spike confirming what a Builds deploy actually requires
of it), and the email from-address in `src/theme/cairn.config.ts`. The repo becomes the
source of truth a Builds deploy actually builds from. The reconcile touches **only those
two tool-owned files** and commits against the repo's current head (`base_tree`), so the
admin's own commits and content are never at risk from it.

Out of scope: the localhost console (T4d); the template repo and button (T5); any change to
the engine's public API; the fake-server plumbing extraction (T4d's trigger, and T4c adds
Builds routes to the existing `fake-cloudflare.mjs` rather than a third server, so the
trigger does not fire); the deferred defect list except the `PUBLIC_ORIGIN` gap this pass
exists to close; a Builds-driven migration path (named in the README as the CLI's remaining
job); build-time environment variables and deploy hooks; preview-branch triggers (the
persona edits `main` through the admin, and a second trigger is accretion until a real
consumer asks).

## The chapter's flow

The same step and state-machine idiom as T2 through T4b: one state record, one writer, pure
step functions over an in-memory record. New states past chapter 2:
`builds-connected` → `config-reconciled` → `builds-live` (final), plus
`builds-connect-declined` (terminal by choice, re-enterable via `--connect`). The flow, in
order:

1. **Admission.** Names what the chapter needs (a one-time authorization of Cloudflare's
   GitHub App, one fresh token paste, one sign-in click for the reconcile commit) and what
   it costs (nothing new: the Builds free tier is 3,000 build-minutes a month and one
   concurrent build, stated with the date). Declining records `builds-connect-declined`,
   exits 0, and names `--connect` as the way back; the site keeps working exactly as it
   was.
2. **Token prefill**, re-run with the union key set (ruling 1). Same lifecycle as chapter
   2: pasted through a hidden prompt (env var under `--yes`), 0600 in the state store,
   absent from argv and logs, deleted at the chapter's terminal steps, cleared early only
   by `token-scope-missing` or `token-invalid`.
3. **Connect.** The repository's numeric id and its owner's numeric id both come from one
   `GET /repos/{owner}/{repo}` (the repo name and owner already sit on the state record;
   `.id` and `.owner.id` are the two values the connections PUT needs). The connections
   PUT either succeeds (idempotent by read-before-write: list connections first and adopt
   an existing one), or refuses because the App is not authorized or the repository not
   selected, which parks per ruling 5. Success records the connection uuid.
4. **Trigger.** Bind the existing Worker by its tag (`GET /workers/scripts`, matched on the
   name the tool itself wrote into `wrangler.jsonc`, so the name-must-match gotcha is
   structurally satisfied), with a build token from the build-tokens endpoint, the default
   branch as the only included branch, and build and deploy commands derived from the
   scaffold the tool itself emitted (`config_autofill` is captured by the spike as a
   cross-check on those commands, not a dependency). The build-tokens surface may be
   read-only over the API; the spike answers whether a clean account has one, and an empty
   list with no create route is a wait-class park carrying the dashboard link, not a
   dead end. Read before write: list triggers and adopt one that already matches. Success
   records the trigger uuid and `builds-connected`.
5. **The reconcile commit.** Diff-based and idempotent: fetch the repo's current
   `wrangler.jsonc` and `src/theme/cairn.config.ts`, compare against the local disk copies
   the tool has been maintaining (after writing `account_id` into the local
   `wrangler.jsonc`), and commit only what differs. When a diff exists, run the OAuth trip
   (ruling 2; under `--yes`, park per ruling 6; a denied consent is an act row, not a raw
   error), commit both files in one commit **built on the repo's current head with
   `base_tree`** (a full-tree write would silently delete everything the admin has added
   since the scaffold push; the diff itself is the idempotence, and no commit-message
   sentinel is read, since the admin's own commits move HEAD), and push by ref update. The
   push is the first Builds deploy. When nothing differs, skip the OAuth trip entirely and
   kick a manual build only if no successful build has been recorded. Success records
   `config-reconciled`.
6. **Watch the build.** Find the push's build by listing the Worker's builds and matching
   the reconcile commit (a push that has not surfaced a build yet is its own wait row);
   poll to `status: stopped` with the standing heartbeat (`queued`, `initializing`, and
   `running` all count as in-flight), then branch on `build_outcome`: `success` re-runs
   the live marker checks against the current origin and records `builds-live`, deleting
   the token; `fail` and `terminated` are an act row carrying the last lines of the build
   log and the dashboard deep link; a build still in flight past the poll budget is a
   wait-class park (the platform's own timeout is 20 minutes), re-entered by re-run, which
   resumes the same build rather than kicking another. `skipped` and `cancelled` surface
   as act rows naming what happened; neither is a tool state.
7. **Completion.** The closing copy names what changed: commits to the default branch now
   deploy themselves, and the admin edits through the site's own `/admin` from here on. It
   claims what the tool observed (a build succeeded and the site answers), never more, and
   the README carries the migrations caveat (ruling's scope note). A later re-entry that
   needs Builds writes re-runs the prefill for a fresh token and says so.

Every step follows the T2 through T4b error-catalogue discipline: literal message text per
row, classified wait / act / ask-someone / declined under the T4a exit semantics (waits and
declines return and exit 0; act and ask-someone rows throw and exit 1), each ending in one
next command, each triggered by a test. The new row names must not collide with the
existing catalogue (`build-failed` is already chapter 1's local-build row); the plan owns
the exact row list against the spike's captured bodies.

## State and resume

The `cloudflare` sub-object gains flat keys, never a nested object (`updateSite`'s merge is
one level deep, the rule T4b locked): `buildsConnectionUuid`, `buildsTriggerUuid`, and the
last watched build's `buildsLastBuildUuid` and `buildsLastBuildOutcome`, written by the
chapter orchestration only, one hop per write, with a test proving a two-hop partial write
preserves sibling `cloudflare` fields. The GitHub App's OAuth user token is never
persisted, exactly as chapter 1.

**`bin.mjs` learns the chapter's states as first-class routes**, because its dispatch is
membership lists and its fall-through is a fresh scaffold: a plain re-run at
`builds-connected` or `config-reconciled` resumes the chapter (this is what "both parks
re-enter by re-run" means at the CLI, and it is tested through `bin.mjs`'s own entry, not
only `runChapter3`); `--sign-in` keeps working from every chapter-3 state, since the site
is live throughout; and the chapter-2 re-offers that today key on the terminal step (the
declined owner's email re-entry) key on the record's own fields (`emailDeclinedAt` present,
`emailOnboardedAt` absent) so advancing `step` past chapter 2 does not orphan them.
`--start-over` from any chapter-3 state refuses, naming what exists (a connection, a
trigger, a live site). `--connect` enters via the explicit allowlist (ruling 4), refuses
below `live` naming what must finish first, and at `builds-live` re-runs the reconcile
diff. Every hop is resumable: a re-run at any state re-detects rather than re-writes (read
before write throughout), and every park re-enters by plain re-run.

## Testing

The suite stays on fake bins and API fixtures. The Builds endpoints join
`test/fake-cloudflare.mjs` as routes on the existing server (no third fake server; the
extraction trigger stays unfired and filed for T4d); the GitHub id lookup, the OAuth
authorize trip, and the reconcile commit ride `test/fake-github.mjs`, which already models
the authorize redirect and the Git Data write path but not the read path, so the fake gains
the repo-content reads the reconcile diff needs (and its Git Data read shapes align to the
real API where they drift). Every fixture body is copied verbatim from a response the spike
captured, with anything unobservable called out in-file (the standing discipline).
Triggered tests cover: every new catalogue row; both authorization parks and their resumes;
connect and trigger adoption on re-run (no repeated writes, asserted through the fakes'
request logs); the diff-based commit (a changed file commits with `base_tree` against the
current head, an unchanged repo skips the OAuth trip, admin commits since the scaffold
survive the reconcile); the build discovery, poll outcomes, and the resume-the-same-build
park; the cutover-then-reconcile round trip (`PUBLIC_ORIGIN` current after a `builds-live`
re-entry); `--connect` entry across the allowlist including named below-`live` refusals
(`scaffolded`, `deployed`) and the declined re-entry; plain re-runs at each chapter-3 state
through `bin.mjs`'s own dispatch; `--yes` parking at the browser-bound hop; and `--dry-run`
printing the whole chapter with zero shell-outs and zero network.

**Task 1 is a live spike** (T2/T3 idiom: main loop, one sitting, fixture capture as it
goes), and it gates the pass: (a) mint the union token and prove the Builds read path
against the real account, settling the 401/12006 report's relevance, and stopping the pass
here if the refusal reproduces; (b) capture both connections-PUT refusal shapes (App not
authorized; repository not selected), preferring a scratch GitHub context over touching the
account's own App install; (c) capture `config_autofill`, the worker-scripts list with its
`tag`, the build-tokens read (and whether a clean account has any, and whether any create
route exists), the trigger create, a manual build kick, one full poll to `stopped`, and the
logs read; (d) kick one manual build against a minimal repo carrying a cairn-shaped id-less
`wrangler.jsonc` and read the deploy log for how the Builds container resolves the
auto-provisioned bindings and whether it requires `account_id`, since every later task
builds on that unverified premise; (e) verify the Builds permission key names against the
live dashboard prefill template.

**The live e2e** runs the whole chapter against a real scaffolded site: connect, trigger,
reconcile, a watched first build, and one push-to-deploy proof made without the tool (a
commit through the GitHub UI deploying itself), with Geoff's browser moments enumerated and
counted for the docs. It mints another GitHub App only Geoff can delete (the standing cost
note; the one-long-lived-App procedure change stays open). Teardown deletes the trigger and
connection by uuid and verifies by listing; the App authorization is account-level and
deliberately left in place, recorded in the run notes.

## Documentation (a pass dimension)

The package README gains the chapter: the `--connect` flag, the park-and-resume story, the
token lifecycle (prefilled, pasted, deleted), the App authorization and sign-in click as
the chapter's manual moments (the "single manual step" phrasing only if the spike proves
the build token needs no dashboard visit), the free-tier figures with their date, and the
migrations caveat. The changelog extends under `## Unreleased`. Chapter 2's closing copy
gains the forward pointer to `--connect`. The admin-track chapter pages belong to Pass D
(the standing carry-forward), which now owes the Builds chapter's browser-moment count
alongside chapter 2's, and T4d's console brief gains the build watch as a second long wait
worth rendering. No engine reference page changes, since the public API is untouched.

## Acceptance criteria

A run on a site at chapter 2's terminal (or `--connect` from an allowlisted state): the
repo connected and the trigger bound to the existing Worker, both adopted rather than
re-created on re-run; the repo's `wrangler.jsonc` and `cairn.config.ts` matching the
tool's local copies, including `account_id` and the current `PUBLIC_ORIGIN`, via an
admin-attributed `base_tree` commit that leaves every other repo file untouched; the first
Builds deploy found by commit, watched to `success`, and the live checks passing on the
current origin; every park exiting 0, printing its link or next step, and resuming by
plain re-run **through `bin.mjs`**; a build failure exiting 1 with the log tail and one
next command; a `builds-live` re-entry re-running the diff so a later cutover cannot be
silently reverted; the pasted token 0600 in the state store during the chapter and absent
from the record, argv, logs, and output after the terminal steps; the OAuth user token
never written anywhere; every new catalogue row triggered by a test; `--dry-run` printing
the whole chapter with zero shell-outs and zero network; the runtime library untouched.

## What follows

T4d (the localhost console) follows T4c and precedes T5; its brief lives in the T4a spec,
now with two inputs from this pass: the build watch as a second long wait, and the grown
fake surface its extraction must cover. The loopback routing layer and the fake-plumbing
extraction both land there.

**Amended 2026-08-12 (the T5 sitting): the order above is superseded.** T5 jumps ahead of
T4d, and the live CLI e2e this pass left unrun folds into T5 rather than T4d. The ruling and
its grounds are in the T5 spec (`2026-08-12-create-cairn-site-t5-design.md`, ruling 1).
