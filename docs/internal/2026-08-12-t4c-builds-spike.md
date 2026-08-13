# T4c spike: Workers Builds connect, triggers, and the first deploy

Run 2026-08-12 local / 2026-08-13 UTC against the live glw907 account
(`120c269ad6d3dfbe6d63a0bb53758ca0`), per Task 1 of
`docs/superpowers/plans/2026-08-12-create-cairn-site-t4c.md`. Every body below is copied
verbatim from a real response; anything inferred rather than observed says so. The platform
claims carry this date and rot on Cloudflare's schedule.

The headline: the pass's load-bearing premise **holds**, but not for the reason the spec
assumed, and the spike changes the token key set, deletes one planned deliverable, and
rewrites how the two authorization refusals are classified.

## Step 1: the token path (ANSWERED, the pass proceeds)

**The reported blanket 401 (`code 12006`) on `/builds/*` does not reproduce.** With a token
carrying the Builds permission, every documented read answered 200 on the first try.

The estate token (`CLOUDFLARE_API_TOKEN`, id `1d508f1a...`) refuses the same route with
**HTTP 403, `code 10000`, "Authentication error"** — an ordinary scope refusal, not the
reported failure. That refusal is the shape `api.mjs` already maps to `token-scope-missing`,
so nothing about it is new.

**The permission is named "Workers CI", not "Workers Builds Configuration".** The spec's
ruling 1 named the latter; no permission by that name exists. Cloudflare's permissions
reference lists `Workers CI Read` and `Workers CI Edit` at account scope, and the working
template key is **`workers_ci`**.

### The union key set, verified live

Geoff opened the prefilled create-token page built from the six keys below and reported that
Cloudflare filled **all six rows**. The template drops an unrecognized key silently, rendering
an empty control rather than an error (the standing `prefill.mjs` hazard), so a filled row is
the only evidence that counts.

| Key | Permission | Verified |
|---|---|---|
| `zone` | Zone | 2026-08-11 (T4a) |
| `dns` | DNS | 2026-08-11 (T4a) |
| `workers_scripts` | Workers Scripts | 2026-08-11 (T4a) |
| `ssl_and_certificates` | SSL and Certificates | 2026-08-11 (T4a) |
| `email_sending` | Email Sending | 2026-08-11 (T4a) |
| `workers_ci` | Workers CI | **2026-08-12, this spike** |

Step 5 below adds two more keys to that set, for a reason no permission table predicts.

### `GET /user/tokens/verify` (HTTP 200)

```json
{"result":{"id":"d07b2a25f05151591830c45053186979","status":"active"},"success":true,"errors":[],"messages":[{"code":10000,"message":"This API Token is valid and active","type":null}]}
```

`result.id` is load-bearing beyond validation: Step 4 shows it is the `cloudflare_token_id`
the build-token registration needs.

## Step 2: the existing-usage census (a production site is already on Builds)

**`907-life` is connected to Workers Builds with two live triggers.** The census guard in the
plan therefore fires: the account's "Cloudflare Workers and Pages" GitHub App install must not
be cycled at any point, and it was not.

The install's shape, read off the GitHub settings page: **Only select repositories, one
selected, `glw907/907-life`.** That is why the refusal in Step 3 came back as
"repository not selected" rather than "App not authorized".

`GET /accounts/{acc}/builds/tokens` (HTTP 200), before anything was created:

```json
{"result":[{"build_token_uuid":"567e83d8-9801-433d-9149-517d8993499a","owner_type":"user","build_token_name":"907-life build token","cloudflare_token_id":"718f0eabbb3c963f36fb064d637b9a03"},{"build_token_uuid":"b8d55367-ef5d-4df6-b3b2-d8cdf8558ffe","owner_type":"user","build_token_name":"907-life build token","cloudflare_token_id":"d38592f844d1667c234912f8b7287a34"}],"success":true,"errors":[],"messages":[],"result_info":{"next_page":false,"page":1,"per_page":50,"count":2,"total_count":2,"total_pages":1}}
```

A clean account was therefore never observable here, which matters for the
`builds-no-build-token` row (Step 4 settles it on other grounds).

### Incidental finding: 907-life's push-to-deploy has been broken since 2026-07-14

Both of the site's most recent builds are `build_outcome: "fail"`, and the log says why:

> Failed: The build token selected for this build has been deleted or rolled and cannot be
> used for this build. Please update your build token in the Worker Builds settings and retry
> the build.

907.life has had no automatic deploy for roughly a month. This is outside T4c's scope and is
recorded for its own follow-up, but it is not merely incidental: it is the exact failure mode
of the build-token design Step 4 adopts, observed in production before the tool ships it, and
the README caveat is written from it.

## Step 3: the two refusal shapes (BOTH CAPTURED; the plan's classification was wrong)

Both refusals are **HTTP 404**, not the 403 the plan assumed, and they carry distinct codes.

**(a) The owner's account never authorized the Cloudflare App.** `PUT` for `mojombo/grit`:

```json
{"success":false,"errors":[{"code":8000008,"message":"This project is disconnected from your Git account, this may cause deployments to fail. Refer to https://developers.cloudflare.com/pages/platform/git-integration/#this-project-is-disconnected-from-your-git-account-this-may-cause-deployments-to-fail"}],"messages":[],"result":null}
```

**(b) The App is authorized, but this repository is not in the selection.** `PUT` for
`glw907/cairn-t4c-spike` before Geoff added it:

```json
{"success":false,"errors":[{"code":8000012,"message":"The project is linked to a repository that no longer exists, this may cause deployments to fail. Refer to https://developers.cloudflare.com/pages/platform/git-integration/#the-project-is-linked-to-a-repository-that-no-longer-exists-this-may-cause-deployments-to-fail"}],"messages":[],"result":null}
```

Two consequences the plan must absorb.

**The refusals never reach the blanket-403 branch.** Task 3's plan text worried that diverting
them would delete `token-scope-missing` for Builds routes and prescribed a narrower pre-check
keyed on `errors[].code` inside that branch. Since these are 404s, no such surgery is needed:
`token-scope-missing` is untouched, and the two rows key on `8000008` and `8000012` in a 404
branch of their own. Both directions still get tests.

**The platform's own wording must not be quoted to the admin.** Both messages are Pages-era
and actively wrong here. `8000012` says the repository "no longer exists" about a repository
that exists and was created ninety seconds earlier; `8000008` calls a never-connected repo a
"disconnected project". The plan's Task 2 instruction to follow the captured wording "where a
row quotes the platform" is superseded: these rows state the real condition in cairn's own
words and print the link the admin needs. The codes are the contract; the messages are not.

## Step 4: the API surface (fixtures captured; one planned row is deleted)

### Route corrections against the plan

| Plan's assumption | Reality |
|---|---|
| `listBuildConnections()` lists connections | **No list route exists.** Only `PUT .../builds/repos/connections` (upsert) and `DELETE .../{uuid}` |
| `listBuildTriggers()` is account-wide | Triggers list **per worker**: `GET .../builds/workers/{external_script_id}/triggers` |
| `kickBuild(triggerUuid, branch)` | `POST .../builds/triggers/{uuid}/builds`, body **required**, `anyOf` `{branch}` or `{commit_hash}`. An empty body is `12002 Invalid request body` |
| build tokens may be read-only | A create route exists, with a surprising body (below) |

**Read before write survives the missing list route, because the PUT is a true upsert.** The
identical PUT run twice returned the *same* `repo_connection_uuid`, with only `modified_on`
advancing:

```json
{"result":{"repo_connection_uuid":"c3b2f3e1-5639-4e5e-95cb-cb6bc12bf9b5","repo_id":"1332620835","repo_name":"cairn-t4c-spike","provider_type":"github","provider_account_id":"14229321","provider_account_name":"glw907","created_on":"2026-08-13T02:33:50.890Z","modified_on":"2026-08-13T02:33:50.890Z","deleted_on":null},"success":true,"errors":[],"messages":[]}
```

Second call: identical body, `modified_on` `2026-08-13T02:33:51.842Z`, same uuid. Adoption is
therefore structural rather than a read-then-branch, and the chapter's idempotence test asserts
the returned uuid is stable, not that a second PUT was skipped.

### The build token is a Cloudflare API token you already hold

`POST /accounts/{acc}/builds/tokens` requires **`build_token_name`, `build_token_secret`, and
`cloudflare_token_id`** (from Cloudflare's own OpenAPI schema, and confirmed by three rejected
bodies returning `12002`). The API mints nothing; it registers a token the caller already has.

**The chapter registers the admin's pasted token as the build token** (Geoff's ruling, this
sitting). It holds the secret, and `GET /user/tokens/verify` returns the id. Observed:

```json
{"result":{"build_token_uuid":"34d0cf5f-082b-44a2-9b04-7b24be3a4fd9","owner_type":"user","build_token_name":"cairn t4c spike token","cloudflare_token_id":"d07b2a25f05151591830c45053186979"},"success":true,"errors":[],"messages":[]}
```

Two consequences.

**`builds-no-build-token` is deleted from the plan.** The condition it modeled, an empty token
list with no way to create one, cannot arise: the chapter always holds a registrable token by
the time it needs one. Task 2 drops the row; Task 7 Step 3 drops its park test.

**Deleting the tool's local copy stays correct, and the coupling is real.** Cloudflare holds
the secret, so removing `cloudflare.apiToken` from the state record at the terminal step does
not break deploys. Revoking the token at the dashboard does, silently, which is exactly where
907-life sits. The README says so, naming the token by the name the prefill gives it.

### Captured shapes

`GET .../builds/workers/{tag}/triggers` on a worker with no triggers: `{"result":[],"success":true,"errors":[],"messages":[]}`.

Trigger create (`POST .../builds/triggers`), success:

```json
{"result":{"trigger_uuid":"218d9fa8-79ba-4121-80c2-a8ccabce7165","external_script_id":"ec60995bd99d4c28a8a3a4dc7ce64c10","build_token_uuid":"34d0cf5f-082b-44a2-9b04-7b24be3a4fd9","build_token_name":"cairn t4c spike token","trigger_name":"Deploy default branch","build_command":"","deploy_command":"npx wrangler deploy","root_directory":"/","branch_includes":["main"],"branch_excludes":[],"path_includes":["*"],"path_excludes":[],"build_caching_enabled":true,"created_on":"2026-08-13T02:33:54.080Z","modified_on":"2026-08-13T02:33:54.080Z","deleted_on":null,"repo_connection":{"repo_connection_uuid":"c3b2f3e1-5639-4e5e-95cb-cb6bc12bf9b5","repo_id":"1332620835","repo_name":"cairn-t4c-spike","provider_type":"github","provider_account_id":"14229321","provider_account_name":"glw907","grant_id":null,"created_on":"2026-08-13T02:33:50.890Z","modified_on":"2026-08-13T02:33:51.842Z","deleted_on":null}},"success":true,"errors":[],"messages":[]}
```

Note the trigger response **embeds the whole `repo_connection`**, so a worker's triggers are
enough to discover an existing connection without any list route.

A build record (`GET .../builds/builds/{uuid}`) carries `build_uuid`, `status`
(`queued` | `initializing` | `running` | `stopped`), `build_outcome`
(`null` until stopped, then `success` | `fail` | `skipped` | `cancelled` | `terminated`),
the four timestamps `initializing_on` / `running_on` / `stopped_on` / `created_on`, the
embedded `trigger`, and `build_trigger_metadata`.

Logs (`GET .../builds/builds/{uuid}/logs`):

```json
{"result":{"cursor":"WzAsMzRd","truncated":false,"lines":[[1784052295481,"Initializing build environment..."]],"events":[{"type":"initializing","started_on":"2026-08-13T02:34:29.793Z","ended_on":"2026-08-13T02:34:35.117Z"}]},"success":true,"errors":[],"messages":[]}
```

`lines` is an array of `[epochMillis, text]` pairs. The `builds-deploy-failed` row's log tail
is the last few `lines` entries.

`config_autofill` needs a `branch` query parameter (`12013 Invalid query parameter` without
one) and returns less than its name suggests:

```json
{"result":{"config_file":"wrangler.toml","default_worker_name":"907-life","env_worker_names":{},"package_manager":"npm","scripts":{"build":"vite build"}},"success":true,"errors":[],"messages":[]}
```

It reports the package manager and the repo's own npm scripts, not build and deploy commands.
As the spec already said, it is a cross-check, not a dependency, and the chapter derives both
commands from the scaffold it emitted.

`GET .../builds/builds/latest` also needs a parameter, `external_script_ids`, and returns a map
keyed by worker tag. The chapter does not need it; `builds/workers/{tag}/builds` is the
discovery route.

## Step 5: the id-less-binding probe (THE PREMISE HOLDS; two amendments)

The probe repo `glw907/cairn-t4c-spike` carries a `wrangler.jsonc` reproducing the cairn
scaffold's exact binding shape: two D1 bindings with `database_name` and **no `database_id`**,
an R2 bucket by name, and **no `account_id`**. It was deployed locally first, the way chapter 1
deploys a scaffolded site, which auto-provisioned all three resources and left the config file
byte-identical.

Two builds ran against that same repo and trigger. The only difference between them was which
Cloudflare token the build token wrapped.

**Build 1, wrapping the union-set token: `fail`.**

```
✘ [ERROR] A request to the Cloudflare API (/accounts/120c26.../d1/database/609640b8-df07-4397-8325-dddacff1ff3f) failed.
  Authentication error [code: 10000]
📎 It looks like you are authenticating Wrangler via a custom API token set in an environment variable.
Please ensure it has the correct permissions for this operation.
Failed: error occurred while running deploy command
```

**Build 2, wrapping a broader token, same repo, same trigger, same commit: `success`.**

```
Your Worker has access to the following bindings:
env.AUTH_DB (inherited)                          D1 Database
env.APP_DB (inherited)                           D1 Database
env.MEDIA_BUCKET (cairn-t4c-spike-media)         R2 Bucket
env.PUBLIC_ORIGIN ("http://localhost:4173")      Environment Variable
Uploaded cairn-t4c-spike (2.92 sec)
Deployed cairn-t4c-spike triggers (0.76 sec)
  https://cairn-t4c-spike.glw907.workers.dev
✨ Success! Build completed.
```

The deployed Worker answers, with every binding live:
`{"AUTH_DB":true,"APP_DB":true,"MEDIA_BUCKET":true,"PUBLIC_ORIGIN":"http://localhost:4173"}` (HTTP 200).

### What the A/B proves

**1. A Builds container resolves cairn's id-less bindings non-interactively.** Even the failing
build had already resolved `cairn-t4c-spike-auth` to a concrete database id before the
permission check refused it. Nothing prompts, and nothing needs `database_id` in the file.

**2. `account_id` is not required, so `writeAccountId` is deleted from the plan.** Wrangler
resolved the account from the build token itself and printed it (`glw907`,
`120c269ad6d3dfbe6d63a0bb53758ca0`) with no `account_id` key anywhere in the config. Task 5's
`writeAccountId` deliverable is dropped, and the reconcile's scope shrinks to the two files'
real drift, `PUBLIC_ORIGIN` chief among it. (`writeAccountId` was built before this probe
landed; it comes back out.)

**3. The union key set must gain D1 and R2.** This is the amendment no permission table
predicts and only a live deploy finds. The failing call was `GET /d1/database/{id}`, so **D1 is
observed** as required. **R2 is inferred, not observed**: build 1 died at the first D1 binding
and never reached the bucket, and build 2's token carried both. The chapter therefore ships
`d1` and `workers_r2` at edit alongside the six verified keys, and the fixture comment says
plainly which of the two was proven.

Both key names appear in Cloudflare's documented template-key list, but neither has been seen
to fill its row on the live dashboard, which is the only evidence this repo accepts. **They are
owed one dashboard confirmation before the chapter ships** — the same gate `email_sending`
passed, and the reason `ssl_certs` and `email` are recorded in `prefill.mjs` as keys that
silently do nothing.

### The narrower reading, and why the chapter does not take it

A build token could wrap a token scoped only for deploys, leaving the pasted token narrow. The
chapter does not, because the pasted token is saved at the one `cloudflare.apiToken` slot a
later chapter-2 re-entry reuses, and a second paste is a second browser trip for a persona
whose whole promise is that there is only one. One token, one union set, one paste.

## Step 6: push-to-deploy, observed (and a Task 8 correction)

A commit pushed to `main` with no local involvement produced a build that deployed itself:

```
MATCH 75a90935-80e9-4a31-a597-85639f288ad0 stopped success
  | source: push_event | branch: main | author: "glw907" | msg: "Prove push-to-deploy"
```

`build_trigger_metadata.commit_hash` equals the pushed sha, which is the key Task 8 matches the
reconcile commit on. Confirmed working.

**But a manually kicked build carries `commit_hash: ""`.** Both manual builds in this spike show
an empty hash, an empty `commit_message`, an empty `author`, and
`build_trigger_source: "manual"`. So the plan's single discovery rule splits in two:

- The reconcile **push** is found by matching `build_trigger_metadata.commit_hash` against the
  commit sha the reconcile returned. As planned.
- The **no-diff manual kick** cannot be found that way. It takes `build_uuid` straight from the
  kick response (`POST .../triggers/{uuid}/builds` returns the whole build record, already
  `status: "queued"`) and stores it as `buildsLastBuildUuid`.

Task 8's watch tests must cover both entries into the poll.

## Spike amendments (supersede the plan's task text where they conflict)

1. **Task 1's stop condition did not fire.** The `12006` report does not reproduce; the pass
   proceeds. Steps 1, 2, 3, 4, 5, and 6 are all answered, so Tasks 2, 3, 4, 6, and 7 are
   cleared.
2. **The permission is `Workers CI` and the template key is `workers_ci`**, verified live. The
   spec's "Workers Builds Configuration" name does not exist.
3. **The union key set is eight keys, not six**: the five T4a keys plus `workers_ci`, `d1`, and
   `workers_r2`. D1 is observed as required, R2 inferred. `d1` and `workers_r2` still owe one
   dashboard prefill confirmation.
4. **`builds-no-build-token` is deleted** (Task 2's row, Task 7 Step 3's test). The chapter
   registers the pasted token as the build token instead, using `verify`'s `result.id` as
   `cloudflare_token_id`.
5. **`writeAccountId` is deleted** from Task 5. `account_id` is not required by a Builds
   deploy, and the file's job shrinks accordingly.
6. **The two authorization refusals are HTTP 404 with codes `8000008` and `8000012`**, not
   403s. Task 3's narrower-pre-check-inside-the-403-branch instruction is unnecessary and
   dropped; `token-scope-missing` is never at risk from them.
7. **Neither refusal's platform message may be shown to the admin.** Both are Pages-era and
   factually wrong for this condition. The rows say what is true in cairn's words.
8. **There is no connections list route.** `listBuildConnections()` is dropped from Task 3.
   Adoption comes from the PUT's proven upsert idempotence, and from the `repo_connection`
   object embedded in each of a worker's triggers.
9. **`listBuildTriggers()` takes a worker tag**: `GET .../builds/workers/{tag}/triggers`.
10. **`kickBuild` requires a body** of `{"branch": "..."}`; an empty body is `12002`.
11. **Build discovery splits by trigger source** (Step 6 above): push builds match on
    `commit_hash`, manual kicks take `build_uuid` from the kick response.
12. **`config_autofill` needs `?branch=`** and returns only `config_file`,
    `default_worker_name`, `env_worker_names`, `package_manager`, and `scripts`.

## What the spike left behind (teardown owed)

Live on the account and in GitHub, to be removed at the pass's teardown:

| Thing | Identifier |
|---|---|
| GitHub repo | `glw907/cairn-t4c-spike` |
| Cloudflare App repo selection | `cairn-t4c-spike` added to the install (Geoff's click; **remove at teardown**) |
| Worker | `cairn-t4c-spike`, tag `ec60995bd99d4c28a8a3a4dc7ce64c10` |
| D1 | `cairn-t4c-spike-auth`, `cairn-t4c-spike-app` |
| R2 | `cairn-t4c-spike-media` |
| Builds connection | `c3b2f3e1-5639-4e5e-95cb-cb6bc12bf9b5` |
| Builds trigger | `218d9fa8-79ba-4121-80c2-a8ccabce7165` |
| Build token (spike token) | `34d0cf5f-082b-44a2-9b04-7b24be3a4fd9` |
| ~~Build token (estate token)~~ | ~~`e29515ff-9f11-4877-bb2c-3f6645321182`~~ — **already deleted**, see below |
| Spike API token | id `d07b2a25f05151591830c45053186979`, revoke at the dashboard |
| Local token file | `~/.config/cairn/t4c-spike-token` |

The estate token was registered as a build token only to run the A/B in Step 5. It is the token
STATUS already flags for urgent rotation, so that build token was deleted as soon as the A/B
was read rather than waiting for teardown: the trigger was pointed back at the spike token
(`"ok": true`), the build token was deleted (`{"result":"ok","success":true}`), and a
confirming list shows only the spike token and 907-life's two remaining.

Unlike T4a and T4b, this spike minted **no GitHub App**, so it adds nothing to the hand-delete
list.
