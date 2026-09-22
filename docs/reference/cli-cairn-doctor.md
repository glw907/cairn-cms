# The `cairn doctor` command

This page describes cairn 1.0.1, the current release; cairn 1.1.0 will carry these pages.

`cairn doctor` checks a directory against the checked-in configuration a cairn-cms site depends
on, running eleven checks over the wrangler config, CSRF wiring, the site config, the `/admin`
mount, and the dependency floors. It reads nothing but the directory you name, needs no
credential and no adopted site, and makes at most one network request, so it runs in a fresh
clone and in CI. `cairn health` is the live-site counterpart, reaching the seven checks that need
a deployed site and provider access.

## Command form

```
cairn doctor [<dir>]
```

`<dir>` is a filesystem path, never a registered site id, and the command takes at most one. When
you omit it, the command runs against the current working directory. Shell completion offers
directories for this argument, not site ids.

```
cairn doctor ./my-site
```

## What it reads

Everything the command reads comes off disk, under the resolved directory with symlinks followed
and refused where they would resolve outside it:

- the wrangler config (`wrangler.jsonc` or `wrangler.toml`)
- `package.json` and whichever lockfile exists
- the Svelte and Vite configs (`svelte.config.js`, `vite.config.ts`)
- `src/hooks.server.ts`
- `static/_headers`
- the site config YAML (`site.config.yaml`), tried at four candidate paths: the canonical path,
  `site.config.yaml`, `src/lib/site.config.yaml`, and `src/site.config.yaml`
- six candidate `/admin` route files, since a directory snapshot offers no listing and a route
  file can be `.ts` or `.js`
- `src/content/.cairn/site-facts.json`

The command makes at most one network request beyond that: a credential-free `GET` of the
declared origin's `/robots.txt`, for the `ai.posture-effective` check. It makes none when no
`PUBLIC_ORIGIN` resolves, or when the resolved value does not parse as a URL. Nothing else touches
the network. That request carries no timeout of its own; its deadline is the command's own
context, the same one `--timeout` bounds (default 480 seconds).

## When the directory is not a cairn-cms site

A directory with neither a wrangler config nor a `@glw907/cairn-cms` dependency in `package.json`
is not a cairn-cms site. The run prints one line naming the directory and exits 3. No check runs.
Under `--json` the run writes the payload instead of the line, with an empty `checks` array,
`"verdict": "UNKNOWN"`, and `"exitCode": 3`.

## Flags

| Flag | Effect |
| --- | --- |
| `--json` | Print the payload instead of the plain-text report. It wins over `--quiet`, so the payload always prints under `--json`. |
| `--quiet` | Write nothing on a clean run. Does not suppress the not-a-cairn-cms-site line, since that run is not clean. |
| `--timeout` | Bound the whole command, including its one network request. Default 480 seconds. |
| `--color`, `--theme`, `--width` | Validated, then ignored. An out-of-set value is a usage error and exits 3; an in-set value changes nothing, since the report is plain text with no layout this command varies. |

Every reporting path writes to stdout only; no check result or report line reaches stderr. A
usage error is the exception: its message goes to stderr, and stdout stays byte-empty.

## The checks

The command runs eleven checks, always in the order of the table below, and the `--json`
payload's `checks` array carries them in that same order rather than sorted by `checkId`. A check
settles `SKIP` when its input is absent by design and there is nothing to measure, and
`UNCHECKED` when it could not observe an input it expected. Six checks can settle `UNCHECKED` on a
condition worth naming rather than a bare read error; the rest settle `UNCHECKED` only on a read
error.

| Check id | Condition | Severity on FAIL | What it observes | Reports `SKIP` when | Reports `UNCHECKED` when |
| --- | --- | --- | --- | --- | --- |
| `config.bindings` | `config.bindings-missing` | blocker | The wrangler config declares both the `EMAIL` and `AUTH_DB` bindings. | No wrangler config is found | A read error only |
| `config.media-bucket` | `config.media-bucket-missing` | warning | The adapter's declared media bucket binding has a matching `r2_buckets` entry in the wrangler config. | The adapter declares no media assets, or no wrangler config is found | `src/content/.cairn/site-facts.json` is absent |
| `config.observability` | `config.observability-off` | warning | `observability.enabled` is `true` in the wrangler config. | No wrangler config is found | A read error only |
| `config.csrf-disable` | `config.csrf-disable-missing` | warning | A `checkOrigin: false` CSRF disable is paired with `createAuthGuard` wired into `src/hooks.server.ts`, so an admin form POST stays protected once the framework's own check steps aside. | Never | Neither `svelte.config.js` nor `vite.config.ts` is found |
| `config.site-config` | `config.site-config-invalid` | blocker | The site config YAML parses: valid YAML, a mapping root, and a non-empty `siteName`. This checks presence and parsing only; the per-concept URL policy lives on the adapter concepts and is not checkable from a directory alone. | Never | No file is found at any of the four candidate paths |
| `config.public-origin` | `config.public-origin-invalid` | blocker | `PUBLIC_ORIGIN` resolves to a valid value, from the wrangler config's vars or from the environment. | Neither the wrangler config nor the environment resolves a value | A read error only |
| `config.no-referrer-blanket` | `config.no-referrer-blanket` | warning | Neither `src/hooks.server.ts` nor `static/_headers` sets a site-wide `Referrer-Policy: no-referrer`, which strips the `Origin` header from a same-origin form POST and trips cairn's own origin guard. | Neither `src/hooks.server.ts` nor `static/_headers` is found | A read error only |
| `admin.mount-shape` | `admin.mount-incomplete` | None; never fails | The `/admin` mount calls `createCairnAdmin(...).shellLoad` and renders `CairnAdminShell`. An unreadable or partial mount reports `INFO`, because the read is a heuristic text match rather than proof of a working mount. | Never | A read error only |
| `config.dependency-floors` | `config.dependency-floors-unmet` | blocker | The resolved `svelte` and `@sveltejs/kit` versions in the lockfile meet the installed engine's own declared peer ranges. | The engine's own declared peer range is not a simple caret range, the lockfile carries no entry for a peer, or a resolved version does not parse as a plain `x.y.z` | No lockfile is found, or the installed engine's `package.json` cannot be read |
| `auth.role-wiring` | `auth.role-wiring-missing` | warning | A site that declares custom roles passes the same role vocabulary to `createAuthGuard`. | The site declares no custom roles | `src/content/.cairn/site-facts.json` is absent |
| `ai.posture-effective` | `ai.posture-not-effective` | warning | The origin's served `/robots.txt` matches the adapter's declared AI posture. | Never | `src/content/.cairn/site-facts.json` is absent, or the `/robots.txt` fetch could not observe a result (no origin resolves, the origin does not parse, the fetch fails, or the response is non-200) |

When `src/content/.cairn/site-facts.json` is absent, `config.media-bucket`, `auth.role-wiring`,
and `ai.posture-effective` each report the same detail: needs engine 0.97.0 or later, and one
build.

Every check carries its condition id in the payload's `condition` field, whatever its state. On a
failing check, the report line and the `--json` `fix.url` both resolve against that condition's
own anchor on [is it working?](../admin/is-it-working.md).

## Status words

Each check settles to one of five words: `PASS`, `FAIL`, `SKIP`, `INFO`, or `UNCHECKED`. `PASS`,
`SKIP`, and `INFO` all contribute `OK` to the run's exit code. `FAIL` contributes `CRITICAL` for a
check the table above marks a blocker, and `WARNING` for one it marks a warning. `UNCHECKED`
contributes `UNKNOWN`: the check could not observe its input, which is not the same claim as a
failure.

Those five words appear in the printed report. Under `--json` a check carries one of four wire
states. `PASS` and `INFO` both write `"state": "pass"`, and an info check is told apart by its
`note` field. `FAIL` writes `"state": "fail"` with a `fix`. `SKIP` writes `"state": "skip"` with
`"reason": "reason.not-run"`. `UNCHECKED` writes `"state": "unknown"` with
`"reason": "reason.not-observable"`.

## Exit codes

`cairn doctor` follows the [exit codes](./cli-cairn-exit-codes.md) every `cairn` command shares.
Exit 3 covers three distinct cases here, so a caller tests for a nonzero exit rather than
switching on 3: a usage error, a run whose only non-passing results are `UNCHECKED`, and a
directory that is not a cairn-cms site. Read the `--json` payload to tell them apart.

Under `--json`, empty stdout means the invocation was wrong. A usage error is the one case that
writes no payload; a directory that is not a cairn-cms site still writes one, carrying the
`UNKNOWN` verdict and an empty checks array.

## Checks that need a live site

Seven check ids never appear in this command's report, because each needs a deployed, adopted
site: `serving`, `delegation`, `https-forced`, `email`, `deploy`, `publish-path`, and `errors`.
Run `cairn health` against an adopted site to reach those.

## JSON output

Under `--json`, the command writes a `doctor`-kind payload instead of the plain-text report,
following the shared conventions on the [JSON output](./cli-cairn-json-output.md) page and the
[`cairn-doctor` schema](./schema/cairn-doctor.schema.json).
