# The hosted theme catalog

How the house themes reach the hosted catalog, what holds it, and what to do when a publish run
stops. This page is for a maintainer of cairn-cms. A theme author reads the
`cairn-styling-public-pages` skill's `references/theme-directory.md` for what a release needs, and
the code is the contract: `scripts/catalog/publish.mjs`, `.github/workflows/catalog.yml`, and
`schema/cairn-catalog-1.schema.json`.

The catalog is one file, `index.json`, beside each release's archive and images in an R2 bucket. A
release is a theme's manifest `version` under `themes/<id>/`, or a content set's under
`sets/<kind>/`. Nothing in the engine or the `cairn` CLI reads the catalog yet.

## The two targets

Every run publishes to one of two targets. Each is a GitHub environment on `glw907/cairn-cms`, and
the publish script reads its target from that environment's variables alone, so the script names no
bucket or address.

| | Real | Proving |
| --- | --- | --- |
| GitHub environment | `catalog`, deployable from `main` only | `catalog-proving`, no branch rule |
| R2 bucket | `cairn-catalog` | `cairn-catalog-proving` |
| Catalog address | `https://catalog.cairn.pub` | `https://catalog-proving.cairn.pub` |
| Demo Worker (`DEMO_WORKER`) | `cairn-demo-{id}`, one per theme | `cairn-demo-proving`, shared by every theme |
| Demo address (`DEMO_ORIGIN`) | `https://demo-{id}.cairn.pub` | `https://demo-proving.cairn.pub` |
| `RELEASE_CACHE_CONTROL` | `public, max-age=31536000, immutable` | `public, max-age=60` |
| Lock rule | On `themes/` and `sets/`, no end date | None |

`{id}` stands for the theme id. Each environment also sets `CLOUDFLARE_ACCOUNT_ID` and
`CATALOG_BUCKET`, and holds three secrets: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` for its
bucket, and `CLOUDFLARE_API_TOKEN` for its demo deploys. `catalog-proving` has no branch rule
because a pull request run's ref is `refs/pull/<n>/merge`, which a branch pattern refuses.

Both buckets have their `r2.dev` address off and a CORS policy that allows `GET` and `HEAD` from any
origin. No cache rule sits in front of either, so the edge always reads the newest `index.json`, and
a browser holds it for five minutes (`max-age=300`).

Each demo Worker is static assets with no script, so it serves only the theme's prerendered public
pages, and any other path, `/admin` included, answers 404. The Wrangler file is generated into the
demo's output directory on each run and never committed.

## How a release is published

The `catalog` workflow runs `scripts/catalog/publish.mjs`. It starts on a pull request and on a push
to `main` that touch `themes/**`, `sets/**`, `schema/cairn-catalog-1.schema.json`,
`scripts/catalog/**`, `scripts/theme/**`, `scripts/build/starter-overlay/**`, or the workflow file,
and on a manual dispatch from `main`.

- **A pull request** proves the run on `catalog-proving`. `publish.mjs --reset` empties the proving
  bucket and publishes every theme and set. A second `publish.mjs` must print
  `catalog: nothing to publish`. Then `scripts/catalog/reference-check.mjs` reads the proving
  catalog. A pull request from a fork or from Dependabot skips the job, since neither gets the
  environment's secrets.
- **A push to `main`**, or a dispatch from `main`, publishes to `catalog` once, never resets, and
  runs the reference check against `https://catalog.cairn.pub/index.json`.

For each theme and set whose version the bucket's `index.json` doesn't list, a run does these in
order:

1. Reads `index.json` over S3, never through the public address. Only a missing key is an empty
   catalog. A 5xx reply, a body that isn't JSON, or one the schema refuses fails the run before
   any write.
2. Checks every release and builds it before the first write: the theme check, the archive, the
   card, and each image. A release with no `notes` is refused here.
3. Writes the archive, the screenshots, and the card create-only, under `themes/<id>/<version>.tgz`
   and `themes/<id>/<version>/`, or `sets/<kind>/<version>.tgz` for a set.
4. For a theme, builds the demo, deploys it with the checkout's own `wrangler deploy`, and polls the
   demo address for up to two minutes until its `cairn-theme-release` marker names the new release.
   The job picks the demo's content set by the first entry of the theme's manifest `kinds`: it
   builds over `sets/<kind>/` when that directory holds a `cairn-set.json`, and over
   `scripts/build/starter-overlay/` otherwise. It builds each demo with its own origin, the origin
   of `DEMO_ORIGIN` with `{id}` replaced (`new URL(...).origin`), so the canonical links, feeds,
   and sitemap name the demo's address. The set's `site.config.yaml` is laid over the composed
   site's, with `siteName` set to the title of the set's home page.
5. Generates the next `index.json`, validates it against the schema, and writes it last. It's the
   one object a run overwrites.

A failure at any step leaves `index.json` as it was, so the catalog never names an archive or a
demo that isn't there.

Runs on one environment go one at a time and are never cancelled mid-publish. GitHub may drop an
older queued run when a newer one queues; that's safe, since each run publishes whatever the index
is missing.

Pull requests share the proving target. A run's publish and its reference check sit in one job, so
another branch can't change the target in between. After the job, the proving catalog and demo hold
whatever the last pull request's run published, so a read by hand can find another branch's
release. To put your branch's release back, rerun your job from the pull request's checks page, or
with `gh run rerun <run-id>`.

Every theme's proving demo is the one address `https://demo-proving.cairn.pub`, and the last
deploy wins. The reference check groups themes by `theme.demo`. It still checks every card,
screenshot, and demo address for a 200, and it compares the release marker only for the last theme
at a shared address, in catalog order. On the real catalog every demo address is unique, so the
grouping changes nothing there.

To read a catalog the way the workflows do, run the reference check from a clone:

```bash
node scripts/catalog/reference-check.mjs --catalog https://catalog-proving.cairn.pub/index.json
```

With no `--catalog`, it reads the real catalog.

## Add a new theme's demo Worker and token scope

A new theme's first publish on `main` deploys to `cairn-demo-<id>` at `demo-<id>.cairn.pub`. The CI
tokens can deploy only over a Worker that exists, and can't attach a domain. So before the theme's
pull request merges, an interactive maintainer session with the `ws-admin` credential does the
following. A pass, a background agent, or CI never does them.

1. Create the Worker `cairn-demo-<id>` with static assets and no script, deployed once with a
   one-line placeholder page, with `workers_dev` and `preview_urls` set to false.
2. Attach the custom domain `demo-<id>.cairn.pub` to it.
3. Add the Worker to the Individual Workers Editor scope of `ci-cairn-demos`, the token behind the
   `catalog` environment's `CLOUDFLARE_API_TOKEN`. Never widen the token beyond the demo Workers.
4. Check that `https://demo-<id>.cairn.pub/` answers 200 over HTTPS and that the Worker has no
   `workers.dev` address.

The proving target needs nothing new, because every theme deploys over `cairn-demo-proving`.

The Editor tokens refuse a Wrangler file with a `routes` entry (`wrangler deploy` exits 1 with code
10084), so the demo build writes none, and every deploy keeps the domain step 2 attached.

The token names and scopes are:

| Token | Scope | Environment |
| --- | --- | --- |
| `ci-cairn-catalog-r2-rw` | R2 object read and write on `cairn-catalog` | `catalog` |
| `ci-cairn-demos` | Individual Workers Editor on `cairn-demo-waymark`, and on each later theme's Worker | `catalog` |
| `ci-cairn-catalog-proving-r2-rw` | R2 object read and write on `cairn-catalog-proving` | `catalog-proving` |
| `ci-cairn-demos-proving` | Individual Workers Editor on `cairn-demo-proving` | `catalog-proving` |

A value starts in the workstation's secret store and reaches the environment with
`gh secret set --env`, on stdin.

## Rerun a stopped publish

A run that stopped partway left some release objects written and `index.json` unchanged, so the
release is still unlisted, and the next run publishes it again. Fix the cause first: a permission
error on R2 or on the deploy is a token's scope, which the interactive session fixes, never a
broader token.

Then rerun the stopped run from the Actions page, or start a new run from `main` by a manual
dispatch of the `catalog` workflow. The rerun meets each object the stopped run wrote, and the
resume rule applies:

- A path already taken (R2 answers 412, or 409 under the lock rule) is read back. The same bytes
  mean the earlier run stopped partway, and the run goes on.
- Different bytes fail the run, naming the path.
- A card already at its path is kept without a comparison, since its bytes needn't repeat across
  machines.

An archive builds to the same bytes every time from the same source, so a rerun from an unchanged
`main` passes the comparison.

A stopped run can leave a demo ahead of `index.json`. The demo deploys inside the per-theme loop and
the index is written once at the end, so a failure after one theme's deploy leaves that demo on the
new release while the index lists the old one. The daily check reports it as a demo whose marker is
not the theme's newest release, and a rerun clears it.

Pull requests share the one proving group. A third pull request that queues replaces the second's
pending run, and the second's check shows as cancelled. Rerun that job from the Actions page.

## When a release path is locked with different bytes

A run fails with `<path> already holds different bytes (<digest> there, <digest> built); a release
path is written once` when the source of an unlisted release changed after an earlier run wrote its
objects. On `cairn-catalog` the lock rule refuses every overwrite and delete under `themes/` and
`sets/`, and that's the design. Don't remove the lock rule, and don't delete the object.

Raise the theme's or set's `version` in its manifest instead, with `notes` that say what changed,
and merge. The new version writes to fresh paths, and the stuck version stays unlisted. Its objects
stay in the bucket, unread.

`--reset` is no way out on the real bucket. `publish.mjs` refuses it, exiting 1 and deleting
nothing, unless `CATALOG_BUCKET` ends in `-proving`, and the workflow passes it only on a pull
request.

## The daily check

`.github/workflows/catalog-check.yml` runs `reference-check.mjs` against
`https://catalog.cairn.pub/index.json` every day at 15:00 UTC, and on a manual dispatch. It holds no
secret, since the catalog and the demos are public, and it never runs on a pull request. The check
serves the reference page from `127.0.0.1`, so the catalog read is cross-origin, and fails on any of
these:

- A row of the theme section the page can't show.
- A request that is neither the page, the catalog, nor an image.
- A kind or engine filter whose shown themes differ from what the data says.
- A card, a screenshot, or a demo address that doesn't answer 200.
- A demo whose marker isn't its theme's newest release.

A red run means the published catalog or a demo broke, not the code under review. Read its log for
the failing line, then rerun the `catalog` workflow on `main` if a publish was left stopped.
