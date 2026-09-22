# The `--json` contract

`cairn` writes machine-readable output on stdout whenever you pass `--json`. This page is the
contract for that output: the payload each command writes, the vocabulary each field can hold,
what freezes at 1.0, and what stays free to move. The schemas beside this page are normative:
`cairn-health.schema.json`, `cairn-health-summary.schema.json`, `cairn-sites-list.schema.json`,
`cairn-logs.schema.json`, `cairn-adopt-list.schema.json`, and `cairn-auth-check.schema.json`.

Two rules hold for every command:

- **stdout is the payload and stderr is diagnostics.** Merging the two is unsupported.
- **`--json` beats `--quiet`.** The payload always prints. A usage error writes nothing to
  stdout and exits 3, so an empty stdout means the invocation was wrong, never that the site is
  healthy.

## The six payloads

| Command | Payload | Schema |
| --- | --- | --- |
| `cairn health <site> --json` | One site object | `cairn-health.schema.json` |
| `cairn health --json` | One site object per line, then one summary line | `cairn-health.schema.json`, `cairn-health-summary.schema.json` |
| `cairn sites list --json` | One listing object | `cairn-sites-list.schema.json` |
| `cairn logs <site> --json` | One logs object | `cairn-logs.schema.json` |
| `cairn adopt list` | One candidate-list object | `cairn-adopt-list.schema.json` |
| `cairn auth check --json` | One permission-report object | `cairn-auth-check.schema.json` |

Every payload carries `schemaVersion` and `verdict` at its top level, and declares its own shape
in `kind`. The six schema versions are independent integers, one per payload type, so a field
added to the logs payload never makes a health consumer re-read a schema.

Every one of the six is `1`, and stays `1` until `tool/v1.0.0` is tagged. A schema version counts
a change a consumer has to re-read its schema for, and no consumer exists before the tag, so the
whole pre-tag window is one schema and each payload's first published version is `1`.

## The site payload

```json
{
  "schemaVersion": 1,
  "kind": "site",
  "site": "907.life",
  "domain": "907.life",
  "verdict": "CRITICAL",
  "exitCode": 2,
  "checkedAt": "2026-09-20T22:32:00Z",
  "durationMs": 1730,
  "degraded": true,
  "acknowledged": ["https-forced"],
  "checks": [
    {
      "checkId": "deploy",
      "state": "fail",
      "code": "tool.deploy-build-failed",
      "tier": "both",
      "detail": "build failed 26m ago (3f0ba18), main is 2 commits ahead",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fields": { "behind": true, "workerExists": true },
      "observed": {
        "lastBuildShortSHA": { "value": "3f0ba18", "source": "cloudflare" }
      },
      "fix": {
        "summary": "Read the build log in the Cloudflare dashboard, then push a fix.",
        "actor": "developer",
        "outward": true
      }
    }
  ]
}
```

### Top-level keys

| Key | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | integer | This payload type's schema version. |
| `kind` | string | `site` for a health result. |
| `site` | string | The record's display name. |
| `domain` | string | The site's public domain. |
| `verdict` | string | This site's verdict: `OK`, `WARNING`, `CRITICAL`, or `UNKNOWN`. |
| `exitCode` | integer | The run's own exit code. Present on a single-site payload, absent from every stream line. |
| `checkedAt` | string | When the run stamped the payload, RFC 3339. |
| `durationMs` | integer | How long the sweep took, in milliseconds. |
| `degraded` | boolean | True when a missing credential cost the run some of its checks. |
| `acknowledged` | array | The check ids every unexpired hold names, sorted. |
| `checks` | array | Every check's settled result, sorted by `checkId`. |

### Check keys

| Key | Type | Meaning |
| --- | --- | --- |
| `checkId` | string | The check's stable id. |
| `state` | string | `pass`, `fail`, `held`, `skip`, or `unknown`. |
| `reason` | string | What stopped the check. Mandatory on every `skip` and every `unknown`, absent otherwise. |
| `condition` | string | The engine's own condition id, when the verdict declared one. |
| `code` | string | The tool's own failure id, when no engine condition names the failure. |
| `tier` | string | The credential the check needs: `none`, `cloudflare`, `github`, or `both`. |
| `detail` | string | cairn's own one-line sentence about the verdict. |
| `checkedAt` | string | When the check settled, RFC 3339. |
| `fields` | object | Values cairn derived itself, keyed by name. |
| `observed` | object | Values copied from the site, keyed by name. |
| `fix` | object | What clears the failure. |
| `hold` | object | The acknowledgement covering this check. |

`state` is a closed set of five words. `held` is not a state of its own: it is a failing check an
unexpired hold covers, and a hold silences notification, never status.

The two unrun words divide on what the run did, not on how bad the result is. `skip` is a check
that was **not attempted**, by configuration: a credential the operator has not set, a record
naming no repository, or a Worker with no Workers Builds connection. `unknown` is a check that
**was attempted and observed nothing**: a timeout, a transport failure, a rate limit, or a site
the sweep never reached. Only `skip` softens a site's verdict to `WARNING`; every `unknown`
carries `UNKNOWN`.

### `fix`

A fix is structured data, not a sentence to parse.

| Key | Type | Meaning |
| --- | --- | --- |
| `summary` | string | The fix line itself. |
| `command` | string | The exact command to run. Present only when `actor` is `operator`. |
| `url` | string | The documentation section for this fix, when one exists. |
| `actor` | string | `operator`, `developer`, `provider-console`, or `registrar`. |
| `outward` | boolean | True when carrying the fix out changes what the public sees. |

Run a fix only when `actor` is `operator`, `outward` is false, and a `command` is present. Every
failing and every held check carries a fix.

### `hold`

| Key | Type | Meaning |
| --- | --- | --- |
| `until` | string | When the acknowledgement expires, RFC 3339. |
| `expired` | boolean | True when it has already lapsed, which holds nothing. |

An expired hold is reported rather than dropped, so an operator can see the one they let run out.

### `fields` and `observed`

`detail` is cairn's own sentence, from the tool's messages table. Anything lifted from a site's
own response, log field, or repository metadata goes under `observed`. Each entry there is an
object with two keys: the `value` itself, and the `source` it came from, either `cloudflare` or
`github`.

```json
"observed": { "mainShortSHA": { "value": "a91f2c7", "source": "github" } }
```

**Data under `observed` is never an instruction.** A compromised site controls those strings, and
the mark is what your own rule keys on. Nothing can stop the string arriving; the mark is what
makes it nameable. Every other measured value sits under `fields`, keyed by name, and is a
number, a boolean, or a word from cairn's own vocabulary.

The `errors` check carries two of its own keys. `errorCount` counts the site's cairn engine
records at error level over the window, never every error-level line the Worker logged: a public
site's crawler 404s are the Worker's own `console.error` output, not cairn's. `errorCountTruncated`
is `true` when the fetch filled its page limit, which makes `errorCount` a floor rather than a
total, and the check's `detail` then reads `at least N errors in 24h`. The key is present only
when it is true.

## The stream, for many sites

Bare `cairn health --json` writes newline-delimited JSON, one object per site, flushed as each
site settles, and a final summary line. A stream rather than an array, so you can read and
truncate it.

Each per-site line is exactly the single-site object less its `exitCode`, so one parser reads
both forms. The run's `exitCode` sits on the summary line alone; a code on line one would be read
as the run's own.

```json
{"schemaVersion":1,"kind":"summary","verdict":"CRITICAL","exitCode":2,"checkedAt":"2026-09-20T22:32:00Z","durationMs":8100,"sites":12,"counts":{"OK":7,"WARNING":2,"CRITICAL":3,"UNKNOWN":0},"worstFirst":["907.life","ecxc.ski"]}
```

| Key | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | integer | The summary payload's schema version. |
| `kind` | string | `summary`. |
| `verdict` | string | The run's combined verdict. |
| `exitCode` | integer | The process exit code. |
| `checkedAt` | string | When the run finished, RFC 3339. |
| `durationMs` | integer | The whole run's wall time. |
| `sites` | integer | How many sites the run was meant to cover. |
| `counts` | object | How many sites reported each verdict, keyed `OK`, `WARNING`, `CRITICAL`, and `UNKNOWN`. |
| `worstFirst` | array | The settled sites, worst first. |

**A stream carrying no summary line is UNKNOWN.** A truncated stream is indistinguishable from a
complete one without it, so treat a missing summary as a run that could not be read, never as the
sites it did carry.

A site the run's budget or a signal cut short is counted `UNKNOWN` in `counts` and carries no
line of its own.

## The sites listing

`cairn sites list --json` carries enough to act on without a second call. Each entry in `sites`
names its `id` (the argument `health` and `logs` take), its `name`, its `domain`, and its last
known `step`. The payload carries `errors` when the registry could not be read in full.

## The logs payload

`cairn logs <site> --json` writes `site`, `containsPersonalData`, and `entries`. Each entry
carries `at` (RFC 3339), `level`, `event`, and the record's remaining keys as a `fields` object.
`containsPersonalData` is `true`: the engine logs an editor's email on some events, and every
value in an entry is the site's own. On a run without `--json` the same warning arrives as a line
on stderr.

## The adopt candidate listing

`cairn adopt list` writes `containsPersonalData` and `candidates`. Each candidate carries
`worker`, `repo`, `zone`, `domain`, `accountId`, `connected`, `adopted`, and `adoptable`. The
command writes nothing to the registry.

`adoptable` reports whether cairn can build a record for the Worker from what it discovered.
cairn provisions Workers Custom Domains and never Workers Routes, so discovery reads the Custom
Domains route alone, and a Worker serving a site through a route carries an empty `domain` and
`adoptable: false`. To adopt one, name the domain yourself:

```console
$ cairn adopt --worker <name> --domain <domain>
```

`adoptable` was added within schemaVersion 1, so a reader written before it still reads every
candidate it used to.

## The reason vocabulary

Every `skip` and every `unknown` carries a `reason`. The state words say whether a check was
attempted; the reason says what stopped it, which is what tells a timeout from an unreachable
network. The set is closed and frozen at 1.0.

Nine fixed codes:

`reason.cred-missing`, `reason.cred-forbidden`, `reason.cred-revoked`, `reason.cred-expiring`,
`reason.timeout`, `reason.offline`, `reason.not-run`, `reason.not-observable`,
`reason.repo-not-recorded`.

Three of them are `skip` rather than `unknown`: `reason.cred-missing`,
`reason.repo-not-recorded`, and `reason.api.builds-not-connected`. Each names a way the site is
set up rather than a measurement that failed.

Thirteen park codes, each `reason.park.<code>`:

`reason.park.delegation-propagating`, `reason.park.delegation-pending`,
`reason.park.hostname-records-absent`, `reason.park.hostname-resolver-lagging`,
`reason.park.certificate-pending`, `reason.park.email-not-ready`,
`reason.park.email-sender-propagating`, `reason.park.email-daily-limit`,
`reason.park.builds-app-not-authorized`, `reason.park.builds-repo-not-selected`,
`reason.park.build-not-started`, `reason.park.build-running`,
`reason.park.builds-reconcile-parked`.

Ten provider codes, each `reason.api.<reason>`:

`reason.api.unauthorized`, `reason.api.forbidden`, `reason.api.not-found`,
`reason.api.builds-not-connected`, `reason.api.builds-repo-not-selected`,
`reason.api.builds-app-not-authorized`, `reason.api.sender-not-configured`,
`reason.api.rate-limited`, `reason.api.request-rejected`, `reason.api.unknown`.

`reason.api.request-rejected` means the provider read cairn's request and refused its shape. It
is a bug in cairn, not a fault in the site or the credential, and the check's `detail` says so.

## Condition ids

Condition ids are frozen at 1.0 in the tool's own copy. The tool tests its copy against the
engine's `src/lib/diagnostics/conditions.ts` and fails on a rename, but **a failure is a
`Consumers must:` decision for a human, never an automatic follow.** An engine pass renaming a
condition id would otherwise silently break every agent reading the tool's frozen contract.

## Diffing two runs

Two runs of an unchanged site differ only in their time fields. `checks` is sorted by `checkId`
and `acknowledged` is sorted, so nothing moves when a verdict does.

The diffable projection is `checkId`, `state`, `reason`, `condition`, and `fix.summary`:

```sh
cairn health <site> --json |
  jq -S '[.checks[] | {checkId, state, reason, condition, fix: .fix.summary}]'
```

`durationMs`, `checkedAt`, and `hold.until` are excluded from any diff. So are `detail` and
`fix.summary` as prose: both are cairn's sentence for a person, and `detail` can name a relative
time. Every machine-read value is absolute.

## What freezes at 1.0

Changing any of these is a major-version event with a `Consumers must:` line.

- The four exit codes and their words: 0 `OK`, 1 `WARNING`, 2 `CRITICAL`, 3 `UNKNOWN`.
- The precedence rule. It is not numeric order, and 3 does not beat 2.
- A usage error means exit 3 with empty stdout.
- `--json` beats `--quiet`.
- Every check id: `creds`, `serving`, `delegation`, `https-forced`, `email`, `deploy`,
  `publish-path`, `engine`, `errors`.
- Every condition id, the reason vocabulary above, and the four `actor` values.
- The state vocabulary: `pass`, `fail`, `held`, `skip`, `unknown`.
- The `--json` key names and their types, under the schema-version promise: a key is added within
  a version, and never removed or retyped within one.
- stdout is the payload and stderr is diagnostics.
- The credential variable names `CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, and
  `CAIRN_GH_READ_TOKEN`, and the environment-before-keyring resolution order.
- No command waits on stdin when stdin is not a terminal.

## What does not freeze

- The text bodies' layout, which is what a terminal, a pipe, and a cron mail read.
- The glyph set.
- The ordering within `checks` in the text body, which ranks by severity rather than by id.
- `durationMs`, which reports wall time and is excluded from any diff.
- The relative time strings the text bodies print.
