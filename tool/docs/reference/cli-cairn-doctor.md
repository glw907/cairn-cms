# `cairn doctor`

`cairn doctor` reads a cairn-cms site's checked-in configuration and reports what a deploy would
get wrong. It needs no credential, no adopted site, and no Cloudflare or GitHub access, so it runs
in a fresh clone and in CI. `cairn health` is the other half: it measures a live, adopted site
through both providers, and every check that needs one lives there.

## Synopsis

```console
$ cairn doctor [<dir>]
```

`<dir>` is the site directory, defaulting to the working directory. It is a path, never a
registered site id, so shell completion offers directories.

```console
$ cairn doctor ./my-site
$ cairn doctor --json | jq '.checks[] | select(.state == "fail")'
```

## What it reads

Everything except one request comes off the disk under `<dir>`: `wrangler.jsonc` or
`wrangler.toml`, `package.json` and the lockfile beside it, `svelte.config.js`, `src/hooks.server.ts`,
`static/_headers`, the site config YAML, the `/admin` route files, and
`src/content/.cairn/site-facts.json`. No file outside `<dir>` is read, and a symlink pointing out
of it is refused rather than followed.

The one request is a `GET` of the declared origin's `/robots.txt`, which `ai.posture-effective`
compares against the posture the adapter states. Nothing else touches the network.

A directory carrying neither a wrangler config nor a `@glw907/cairn-cms` dependency in
`package.json` is not a cairn-cms site. `cairn doctor` says so in one line and exits 3, rather than
failing eleven checks that had nothing to read.

## Flags

| Flag | Effect |
| --- | --- |
| `--json` | Write the `cairn-doctor.schema.json` payload on stdout instead of the report. |
| `--quiet` | Write nothing at all when the run is `OK`. Every other verdict prints the whole report. |
| `--timeout` | Bound the whole command. The one request is bounded at 15 seconds inside it. |

`--color`, `--theme`, and `--width` have no effect here. The report is plain text with no ANSI, so
a terminal and a CI log read the same bytes, and the command queries no terminal at all.

`--json` beats `--quiet`: under `--json` the payload always prints.

## The checks

Eleven, in report order. Each names the condition its failure raises, which is what the report's
why, fix, and docs lines come from.

| Check id | What it observes |
| --- | --- |
| `config.bindings` | The wrangler config declares the `EMAIL` and `AUTH_DB` bindings the engine needs. |
| `config.media-bucket` | The R2 bucket binding the adapter declares for media is present in the wrangler config. Skips when the adapter declares no media. |
| `config.observability` | `observability.enabled` is `true`, so the engine's structured log records have a sink. |
| `config.csrf-disable` | `checkOrigin: false` is set and the hooks file wires `createAuthGuard`, the handoff the engine's own origin check depends on. |
| `config.site-config` | The site config YAML is at a candidate path and parses. |
| `config.public-origin` | `PUBLIC_ORIGIN` is set and is an `https://` URL, or `localhost`. |
| `config.no-referrer-blanket` | No site-wide `Referrer-Policy: no-referrer` is set, which would break the engine's own same-origin checks. |
| `admin.mount-shape` | The `/admin` routes render `CairnAdminShell`, call `.shellLoad`, and carry the catch-all. |
| `config.dependency-floors` | Every framework dependency the engine declares a peer range for satisfies it. |
| `auth.role-wiring` | The guard is handed the custom role vocabulary the adapter declares. Skips when the adapter declares none. |
| `ai.posture-effective` | The served `/robots.txt` matches the AI posture the adapter states. |

`config.site-config` checks that the file is present and parses, and nothing more. The per-concept
URL policy lives on the adapter's own concepts, which a CLI reading files cannot evaluate.

`config.media-bucket`, `auth.role-wiring`, and `ai.posture-effective` read
`src/content/.cairn/site-facts.json`, which the engine writes at build time. It needs cairn-cms
`0.97.0` or later and one build. Without that file the three report `UNCHECKED`, and the run exits
3.

`cairn doctor` never reaches the checks that need a live site. For `https-forced`, `email`,
`serving`, `delegation`, `deploy`, `publish-path`, and `errors`, deploy the site, run
`cairn adopt`, then `cairn health <site>`.

## Exit codes

| Code | Word | When |
| --- | --- | --- |
| 0 | `OK` | Every check passed, skipped, or reported an info note. |
| 1 | `WARNING` | The worst failure is a warning-severity condition. |
| 2 | `CRITICAL` | A blocker-severity condition failed. |
| 3 | `UNKNOWN` | See below. |

Exit 3 covers three different things, so **test for a nonzero exit rather than switching on 3**:

- A usage error, which writes nothing at all to stdout.
- A run whose only non-passing results are `UNCHECKED`, a check that could not observe its input.
- A directory that is not a cairn-cms site.

Under `--json` the first case is the one that writes no payload, which is why an empty stdout
means the invocation was wrong rather than the site being healthy.

The severity of a failure comes from the condition it raises, so a site whose only failure is a
blocker exits 2. The Node `cairn-doctor` this command replaces exited 1 for every failure
regardless of severity.

## JSON

`cairn doctor --json` writes one object against
[`cairn-doctor.schema.json`](cairn-doctor.schema.json). Its keys, its state vocabulary, and the
two mappings that have no state word of their own are documented in
[the `--json` contract](json-output.md).
