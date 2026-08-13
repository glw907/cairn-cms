# T5 spike: the Deploy to Cloudflare button against a cairn template

Run per Task 2 of `docs/superpowers/plans/2026-08-12-create-cairn-site-t5.md`. Every body below
is copied verbatim from a real response or a real dashboard surface; anything inferred rather
than observed says so in the sentence that states it. The platform claims carry their read date
and rot on Cloudflare's schedule.

Status: **Step 0 banked (the vendor documentation, read cold, before the live run). Steps 1
through 5 not yet run; they need Geoff's browser.**

## Step 0: the vendor documentation, read 2026-08-13 UTC

Read before the live run so the spike's questions have a documented expectation to be measured
against. A documented claim is not an observation, and nothing here counts as an answer to the
spec's eight questions; it is the prediction each live step falsifies or confirms.

Sources, both read 2026-08-13 UTC:

- `https://developers.cloudflare.com/workers/platform/deploy-buttons/` (the button's own page)
- `https://github.com/cloudflare/templates/blob/main/CONTRIBUTING.md` (the gallery's
  contribution conventions, which Task 3 Step 0 owes)

### The button URL format

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=<YOUR_GIT_REPO_URL>)
```

The `url` parameter takes a git repository URL. Cloudflare's own changelog example points at a
subdirectory through a tree URL
(`https://github.com/cloudflare/templates/tree/main/saas-admin-template`), so a
repository-root URL is one valid shape rather than the only one. **Step 2 records the format
actually honored**; this is the documented one, and the README embeds what the spike observes.

### What the flow does, per the vendor

Four steps, quoted from the launch changelog:

1. Creates a new git repository on the admin's GitHub or GitLab account (Cloudflare clones the
   source repo into the account).
2. Automatically provisions the resources the app needs, bound to the Worker on deployment.
3. Configures Workers Builds, so every push to the production branch builds and deploys.
4. Adds preview URLs to each pull request.

### Auto-provisioning, and the `send_email` prediction

> Currently, supported resources include:
> **Storage**: KV namespaces, D1 databases, R2 buckets, Hyperdrive, Vectorize databases, and
> Secrets Store Secrets
> **Compute**: Durable Objects, Workers AI, and Queues

`send_email` is **absent from that list**, which is the spec's question 2 prediction stated in
the vendor's own words: the flow has no documented handling for the template's `send_email`
binding. Whether it silently skips the binding or fails the deploy is exactly what Step 2 must
observe, and the doc does not settle it.

D1 and R2 are both on the list, so the two databases and the bucket are predicted to provision.
The doc also states what happens to the config afterward:

> During deployment, Cloudflare will provision any necessary resources and update the Wrangler
> configuration where applicable for newly created resources (e.g. database IDs and namespace
> IDs).

That is a write back into the created repo, which is what the Step 2 repo diff measures.

### The id shape, and why ruling 8 chose it

> To ensure successful deployment, please make sure your source repository includes default
> values for resource names, resource IDs and any other properties for each binding.

The bake's zero-UUID shape satisfies this literally; the CLI's own id-less shape does not. Spec
ruling 8 chose the zero-UUID shape on this sentence, and the sentence still reads that way
today. The fallback if the button chokes on placeholder ids stays the id-less shape T4c proved
deploys.

### Secrets

> Worker secrets can be defined in a `.dev.vars.example` or `.env.example` file with a dotenv
> format

The template's overlay uses `.dev.vars.example`. A binding or secret may additionally carry a
human description, keyed inside the template's own `package.json`:

```json
{
  "cloudflare": {
    "bindings": {
      "COOKIE_SIGNING_KEY": {
        "description": "Generate a random string using `openssl rand -hex 32`."
      }
    }
  }
}
```

Cloudflare's wording: "These secrets and environment variables will be presented to users in
the dashboard as they deploy this template, allowing them to configure each value." **This is
the keyed `package.json` merge spec ruling 4 anticipated**, and Task 3 owes it. Where the pasted
values land is question 4, and the doc does not say; the Step 2 instruments settle it.

### The repository must be public

> Repositories must be public in order for others to successfully use your Deploy to Cloudflare
> button.

This answers the Task 2 Step 1 parenthetical from the documentation side: the scratch spike repo
is created public, and `glw907/cairn-waymark-template` must be public. Whether a private repo
fails at the clone or at a later hop is not worth a probe.

### Build and deploy commands (question 7's documented expectation)

> If no `deploy` script is specified, Cloudflare will preconfigure `npx wrangler deploy` by
> default. If no `build` script is specified, Cloudflare will leave this field blank.

and, for the detection path: "Cloudflare will automatically detect and pre-populate the build
and deploy fields."

Measured against the tree this pass ships, the baked template's `package.json` scripts are:

```json
{
  "dev": "node scripts/dev.mjs",
  "build": "vite build",
  "preview": "vite preview",
  "cairn:manifest": "cairn-manifest",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
}
```

So a `build` script exists and **no `deploy` script does**. The documented prediction is
therefore build detected from `scripts.build`, deploy defaulted to `npx wrangler deploy`. That
is the combination that works: T4c's captured trigger carried an **empty** `build_command` with
`npx wrangler deploy`, which against this template's gitignored `.svelte-kit/cloudflare` artifact
is a deterministic deploy failure. The documented behavior predicts the button avoids exactly
that trap, and the spec named it as a live risk. **Step 3 reads the created trigger and settles
it**; if the button leaves `build_command` empty despite the script being present, adding an
explicit `deploy` script or a build command to the overlay becomes a Task 3 amendment.

### Gallery conventions (Task 3 Step 0's pinned answer)

From `CONTRIBUTING.md`, read 2026-08-13 UTC. Linked, never restated in shipped docs; recorded
here because the overlay's shape has to satisfy it from the start (ruling 4).

| Convention | What it requires | Where it bites this pass |
|---|---|---|
| Directory and package name | kebab-case, "should end in `-template`" | `glw907/cairn-waymark-template` already conforms; the baked `package.json` name is `cairn-showcase`, so the overlay owes a keyed `name` merge |
| `package.json` `description` | one-line description | overlay keyed merge |
| `cloudflare.bindings` | binding name to `{ "description": ... }` | the flow's own configure step; covers `AUTH_DB`, `APP_DB`, `MEDIA_BUCKET`, `EMAIL`, and each `.dev.vars.example` name |
| `cloudflare.label` | Title Case name for the dashboard | submission-time (`publish: true`) only |
| `cloudflare.products` | three or fewer featured products | submission-time only |
| `cloudflare.categories` | one of `starter`, `storage`, `ai` | submission-time only |
| `cloudflare.preview_image_url`, `cloudflare.preview_icon_url` | 16:9 screenshot and icon | roadmap, at submission (spec's out-of-scope list) |
| `cloudflare.publish` | boolean opt-in to the dashboard gallery | stays absent or `false` until the submission moment |
| README markers | a section wrapped in `<!-- dash-content-start -->` / `<!-- dash-content-end -->` for dashboard display | Task 3's README |
| README content | a getting-started section: running locally, installing third-party tokens, what the app does | Task 3's README, which the checklist already covers |
| `package-lock.json` | listed among the required files | **the baked tree has none**; see the finding below |
| `playwright-tests/` | Playwright test files | explicitly deferred (spec's out-of-scope list, at submission) |
| LICENSE | not mentioned by the conventions | the overlay ships MIT anyway, matching the engine |

The conventions do not address whether a template may live in its own standalone repository
rather than inside the `cloudflare/templates` monorepo. Since the submission itself is deferred
to the roadmap, the standalone repo is the shape this pass ships and the question stays open
until the submission sitting.

**One finding worth a decision, surfaced by the read rather than the run.** The conventions list
`package-lock.json` among a template's required files, and the baked tree has none: the bake
emits from the showcase, whose lockfile is not part of the emit. This is not only a gallery nicety.
A template repo without a lockfile gives every button deploy a floating dependency resolution,
which is the same class of failure the pass is trying to close. It is not obviously Task 3's
(generating a lockfile means resolving the engine spec against the registry at sync time, which
the sync script's resolvability gate already half-touches). **Recorded here as a decision the
spike's findings should inform, not settled in advance.**

## Step 1: publish the scratch repo through the sync script (NOT YET RUN)

## Step 2: the button run (NOT YET RUN, needs Geoff's browser)

## Step 3: the build and the commands (NOT YET RUN)

## Step 4: the Builds wiring and the adopt probe (NOT YET RUN)

## Step 5: bank and amend (NOT YET RUN)

## Spike amendments

None yet. Amendments to
`docs/superpowers/plans/2026-08-12-create-cairn-site-t5.md` land here and supersede the task
text where they conflict, the way T4c's thirteen did.

## Teardown table

Every scratch artifact lands here at creation time, per the plan's global constraints. The
pass-end teardown (Task 9 Step 1) verifies each by re-listing, never by trusting a delete call.

| Artifact | Kind | Created | Torn down | Verified by |
|---|---|---|---|---|
| (none yet) | | | | |
