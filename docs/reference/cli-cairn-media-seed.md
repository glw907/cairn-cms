# The `cairn-media-seed` CLI

`cairn-media-seed` seeds wrangler's local R2 simulator with every media-library object from a
deployed cairn site, so `vite dev` serves real media on every page with no deploy. It reads the
committed media manifest (`src/content/.cairn/media.json`, the engine's own convention),
downloads each object from the deployed site, and writes it into local R2 state under the same
content-addressed key the media route reads. Once seeded, the [local design-iteration
guide](../guides/iterate-your-design-locally.md) covers the loop this unblocks: edit,
watch `vite dev`, and see the real image.

The package ships the command in its `bin` field, so an install puts it on the project's path.
Run it once before you start iterating, and again whenever the deployed media library gains new
objects you want locally.

## How to run it

```bash
npx cairn-media-seed --from https://your-site.com
```

The command reads local config from the working directory, so run it from the directory that
holds `wrangler.jsonc` (or `wrangler.toml`) and `src/content/.cairn/media.json`. It writes into
wrangler's local state the same way `wrangler r2 object put --local` always has, so a later
`vite dev` or `wrangler dev` in the same directory sees the objects it wrote.

For a site behind Cloudflare Access or another auth gate, pass the header the gate needs on every
download:

```bash
npx cairn-media-seed --from https://staging.your-site.com \
  --header 'CF-Access-Client-Id: <id>' \
  --header 'CF-Access-Client-Secret: <secret>'
```

## Flags

| Flag | Required | What it does |
|---|---|---|
| `--from <base-url>` | Yes | The deployed site to download from. Each manifest entry's public delivery URL, `<base-url>/media/<slug>.<hash>.<ext>`, is derived from this. A trailing slash is tolerated. |
| `--header 'Name: value'` | No, repeatable | Forwarded on every download request. Repeat the flag for multiple headers; a later `--header` for the same name overwrites an earlier one. |
| `--bucket <name>` | No | The R2 bucket name to write into. Overrides the wrangler-config resolution below. |

A missing `--from`, an unknown flag, a flag with no value, or a `--header` that isn't
`Name: value` all print the usage line to stderr and exit 2 before any network request runs.

## Bucket resolution

The command needs the R2 bucket's real name, not just its wrangler binding, since
`wrangler r2 object put` addresses a bucket by name. An explicit `--bucket` always wins. Failing
that, the command reads `wrangler.jsonc` or `wrangler.toml`'s `r2_buckets` entries and uses the
sole entry's `bucket_name` when there is exactly one. Any other shape, no config file, zero
entries, several entries, or a single entry missing `bucket_name`, is an error naming `--bucket`
as the fix.

## What it writes

For each manifest row with a `slug`, `hash`, and `ext`, the command downloads
`<from>/media/<slug>.<hash>.<ext>` and writes the response body into the resolved bucket at
`media/<hash[0:2]>/<hash>.<ext>`, the content-addressed key the [media
route](./sveltekit.md) reads on every request. The command stores each object with the
`Content-Type` its extension implies, so local reads serve the same header production does. Re-running the command overwrites each key with
the same bytes, so it's safe to run again after the deployed library gains new objects. A row
missing any of those three fields is dropped rather than failing the run, the same tolerance the
manifest reader applies elsewhere.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every manifest entry synced (or the manifest holds none). |
| 1 | At least one entry failed to download or write. Each failure prints `FAILED <slug>: <message>` to stderr before the summary line. |
| 2 | Bad flags, or the R2 bucket name could not be resolved. The message names the fix. |

A clean run always prints a summary line to stdout: `cairn-media-seed: <ok> synced, <failed>
failed, of <total> manifest entries`.

## See also

- [Iterate a cairn site's design locally](../guides/iterate-your-design-locally.md) for
  the loop this tool unblocks: seed once, then edit against `vite dev` with no deploy per
  change.
- [The `cairn-doctor` CLI](./doctor.md), which reads the same wrangler config for its own
  R2-binding check.
- [Media (`/media`)](./media.md) for the manifest shape and the content-addressed naming scheme
  this command relies on.
