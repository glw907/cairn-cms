# The `cairn` CLI's JSON output

Six `cairn` commands accept `--json`: `cairn health`, `cairn sites list`, `cairn logs`,
`cairn adopt list`, `cairn auth check`, and `cairn doctor`. Together they publish seven payload
kinds, a closed contract a script or an agent can parse without running cairn to learn the shape.
This page describes cairn 1.0.1, the current release; cairn 1.1.0 will carry these pages.

## Streams and exit codes

Under `--json`, stdout carries the payload and stderr carries diagnostics; the two streams are
never merged. The payload still prints under `--quiet`, since `--json` outranks it. A usage
error, an unrecognized flag or a bad positional argument, writes nothing to stdout and exits `3`.

A payload's `exitCode` is the process exit code the run will use. [The `cairn` CLI's exit
codes](./cli-cairn-exit-codes.md) gives the four codes and how several verdicts combine.

## Payload kinds

Seven payload kinds are published, and every payload declares its own `kind` so a reader working
through a mixed stream can key off a field rather than off the shape it happens to see. Every
payload carries `schemaVersion`, `kind`, and `verdict` at its top level, and every payload but a
per-site NDJSON line also carries `exitCode`.

| `kind` | Written by | Schema |
| --- | --- | --- |
| `site` | `cairn health <site> --json`, and each NDJSON line of bare `cairn health --json` | [`cairn-health.schema.json`](./schema/cairn-health.schema.json), `$id` `https://cairn.pub/schema/cairn-health.schema.json` |
| `summary` | the final line of `cairn health --json` | [`cairn-health-summary.schema.json`](./schema/cairn-health-summary.schema.json), `$id` `https://cairn.pub/schema/cairn-health-summary.schema.json` |
| `sites` | `cairn sites list --json` | [`cairn-sites-list.schema.json`](./schema/cairn-sites-list.schema.json), `$id` `https://cairn.pub/schema/cairn-sites-list.schema.json` |
| `logs` | `cairn logs <site> --json` | [`cairn-logs.schema.json`](./schema/cairn-logs.schema.json), `$id` `https://cairn.pub/schema/cairn-logs.schema.json` |
| `adoptCandidates` | `cairn adopt list --json` | [`cairn-adopt-list.schema.json`](./schema/cairn-adopt-list.schema.json), `$id` `https://cairn.pub/schema/cairn-adopt-list.schema.json` |
| `authCheck` | `cairn auth check --json` | [`cairn-auth-check.schema.json`](./schema/cairn-auth-check.schema.json), `$id` `https://cairn.pub/schema/cairn-auth-check.schema.json` |
| `doctor` | `cairn doctor --json` | [`cairn-doctor.schema.json`](./schema/cairn-doctor.schema.json), `$id` `https://cairn.pub/schema/cairn-doctor.schema.json` |

Every kind's `schemaVersion` stands at `1`. Each schema is the normative source where this page
and the schema differ. A schema's `$id` sits under `https://cairn.pub/schema/`, a stable
identifier that does not need to resolve as a URL.

## Streaming `cairn health --json`

Bare `cairn health --json`, run against every registered site, writes newline-delimited JSON: one
`site` line per site, flushed as that site settles (each one the single-site payload with
`exitCode` omitted), followed by one `summary` line carrying the run's own `exitCode`. A stream
that ends with no `summary` line reads `UNKNOWN`, since a truncated stream and a complete one are
otherwise indistinguishable. A site the run's own budget or a signal cut short is folded into the
summary's `counts` as `UNKNOWN` with no line of its own; the summary's `sites` count is how many
sites the run meant to cover, which can exceed the number of `site` lines actually written.

## Verdicts and states

A run's own verdict is one of four words: `OK`, `WARNING`, `CRITICAL`, `UNKNOWN`. A check's own
state is a closed set of five wire words, computed at the payload boundary rather than marshalled
off the three-value state the `cairn` CLI tracks internally: `pass`, `fail`, `held`, `skip`,
`unknown`.
`held` is not a state on its own; it marks a failing check that an unexpired hold currently
covers.

The line between `skip` and `unknown` is carried by the check's own `reason`, and exactly three
codes read `skip`: `reason.cred-missing`, `reason.repo-not-recorded`, and
`reason.api.builds-not-connected`, each naming a check the run declined to attempt. Every other
reason reads `unknown`, a measurement the run attempted and could not read.

## A check's fields

| Field | Present on | Meaning |
| --- | --- | --- |
| `checkId` | Every check | The check's own identifier, for instance `creds` or `config.bindings`. |
| `state` | Every check | One of the five wire words above. |
| `checkedAt` | Every health check; a doctor payload carries one `checkedAt` at the top level instead | An RFC 3339 timestamp in UTC. |
| `tier` | Every health check; absent from a doctor check | Which provider credential the check needs. |
| `detail` | Wherever the check's result produced one | Plain text for a person. |
| `code` | A failing check whose result carries a machine identifier | An identifier under the `tool.` namespace, for instance `tool.creds-unauthorized`. |
| `condition` | Wherever the check's result raises one | One of the engine's own diagnostic condition ids; `cairn health` and `cairn doctor` draw from the same vocabulary. |
| `reason` | A check that reports `skip` or `unknown` | One of the 32 reason codes below. |
| `fix` | A check with a remedy | See below. |
| `hold` | A check an acknowledgement currently covers | See below. |
| `fields`, `observed` | A check with measured values | See below. |

A check's `fix` object carries `summary`, `actor`, and `outward` always; `url` where the
underlying condition has one; and `command` only for an operator's own fix, since an operator is
the one actor whose remedy is a command line `cairn` can print.

A check's `hold` object carries `until` and `expired`. An expired hold is still reported rather
than dropped, and it arrives at the run's own exit arithmetic as unacknowledged.

A check's measured values split by where they came from: `fields` holds what cairn derived
itself, and `observed` holds what was copied from a provider's own response, each as an object
carrying a `value` and the `source` it was read from. The boundary never infers a source from a
key's name or a value's shape; it reads the source a check declared.

The `errors` check carries `errorCount` always, and `errorCountTruncated` only when its own fetch
filled the provider's page limit, which makes the count a floor rather than an exact total; the
truncation key is absent when the count is exact. A verbose run also carries `topEvents`, marked
as copied straight from the provider.

On the wire, a site's `checks` sort by their own `checkId`, and its `acknowledged` array, naming
which held checks the run currently counts as acknowledged, sorts alphabetically, so two runs of
an unchanged site diff cleanly; the severity ranking belongs to the text report, never to the
payload. `durationMs` is wall time, excluded from that comparison by design, since two runs of an
unchanged site differ in it even when nothing else has. Every timestamp on the wire, including
`checkedAt`, is RFC 3339 in UTC; the zero time writes an empty string, and nothing on the wire is
relative.

## The reason vocabulary

Every check that reports `skip` or `unknown` carries `reason`, one of cairn's closed vocabulary of
32 codes, built from three sets rather than written out by hand: a code added to any of the three
joins the published vocabulary with no second list to keep in step.

Nine fixed codes: `reason.cred-missing`, `reason.cred-forbidden`, `reason.cred-revoked`,
`reason.cred-expiring`, `reason.timeout`, `reason.offline`, `reason.not-run`,
`reason.not-observable`, `reason.repo-not-recorded`.

Thirteen `reason.park.*` codes, one per park code: `reason.park.delegation-propagating`,
`reason.park.delegation-pending`, `reason.park.hostname-records-absent`,
`reason.park.hostname-resolver-lagging`, `reason.park.certificate-pending`,
`reason.park.email-not-ready`, `reason.park.email-sender-propagating`,
`reason.park.email-daily-limit`, `reason.park.builds-app-not-authorized`,
`reason.park.builds-repo-not-selected`, `reason.park.build-not-started`,
`reason.park.build-running`, `reason.park.builds-reconcile-parked`.

Ten `reason.api.*` codes, one per provider reason: `reason.api.unauthorized`,
`reason.api.forbidden`, `reason.api.not-found`, `reason.api.builds-not-connected`,
`reason.api.builds-repo-not-selected`, `reason.api.builds-app-not-authorized`,
`reason.api.sender-not-configured`, `reason.api.rate-limited`, `reason.api.request-rejected`,
`reason.api.unknown`.

`reason.api.request-rejected` names cairn's own outgoing request being wrong, an HTTP 400 no
operator can fix, so it stays out of the catch-all. `reason.api.rate-limited` is separate for the
same reason: throttling describes cairn's request, not the site.

## The `site` payload

`cairn health <site> --json` writes one `site` payload; the same shape, less `exitCode`, is each
line bare `cairn health --json` streams as a site settles. The payload also carries `domain` and
`degraded`, both visible below.

```json
{
  "schemaVersion": 1,
  "kind": "site",
  "site": "example.net",
  "domain": "example.net",
  "verdict": "CRITICAL",
  "exitCode": 2,
  "checkedAt": "2026-09-20T22:32:00Z",
  "durationMs": 1730,
  "degraded": true,
  "acknowledged": ["https-forced"],
  "checks": [
    {
      "checkId": "creds",
      "state": "fail",
      "code": "tool.creds-unauthorized",
      "tier": "none",
      "detail": "Cloudflare token not found; GitHub token read from the keyring",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fix": {
        "summary": "Create a new token, then run `cairn auth set` naming the credential.",
        "actor": "operator",
        "outward": false
      }
    },
    {
      "checkId": "delegation",
      "state": "pass",
      "tier": "none",
      "detail": "nameservers match the zone",
      "checkedAt": "2026-09-20T22:28:00Z"
    },
    {
      "checkId": "deploy",
      "state": "fail",
      "code": "tool.deploy-build-failed",
      "tier": "none",
      "detail": "build failed 26m ago (3f0ba18), main is 2 commits ahead",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fix": {
        "summary": "Read the build log in the Cloudflare dashboard, then push a fix.",
        "actor": "developer",
        "outward": true
      }
    },
    {
      "checkId": "email",
      "state": "skip",
      "reason": "reason.cred-missing",
      "tier": "none",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fix": {
        "summary": "Run `cairn auth set` naming each missing token, then run the command again.",
        "actor": "operator",
        "outward": false
      }
    },
    {
      "checkId": "engine",
      "state": "fail",
      "code": "tool.engine-behind",
      "tier": "none",
      "detail": "0.71.0 installed, 0.78.0 latest, 7 releases behind",
      "checkedAt": "2026-09-20T22:28:00Z",
      "observed": {
        "installedVersion": { "value": "0.71.0", "source": "github" }
      },
      "fix": {
        "summary": "Raise the @glw907/cairn-cms range in package.json, then deploy again.",
        "actor": "developer",
        "outward": true
      }
    },
    {
      "checkId": "errors",
      "state": "skip",
      "reason": "reason.cred-missing",
      "tier": "none",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fix": {
        "summary": "Run `cairn auth set` naming each missing token, then run the command again.",
        "actor": "operator",
        "outward": false
      }
    },
    {
      "checkId": "https-forced",
      "state": "held",
      "condition": "edge.https-not-forced",
      "tier": "none",
      "detail": "Always Use HTTPS is off for the zone",
      "checkedAt": "2026-09-20T22:28:00Z",
      "fix": {
        "summary": "Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates.",
        "url": "https://cairn.pub/docs/admin/is-it-working#force-https-at-the-edge",
        "actor": "operator",
        "outward": true
      },
      "hold": { "until": "2026-09-25T22:32:00Z", "expired": false }
    },
    {
      "checkId": "publish-path",
      "state": "pass",
      "tier": "none",
      "detail": "App installed, branch writable",
      "checkedAt": "2026-09-20T22:28:00Z"
    },
    {
      "checkId": "serving",
      "state": "pass",
      "tier": "none",
      "detail": "200 in 132ms",
      "checkedAt": "2026-09-20T22:28:00Z"
    }
  ]
}
```

## The `summary` payload

The final line of `cairn health --json` is one `summary` payload, folding every site's verdict
into the run's own. A stream carrying no sites at all writes the same shape a run against zero
registered sites writes. `sites`, `counts`, and `worstFirst` are all visible in the example below.

```json
{
  "schemaVersion": 1,
  "kind": "summary",
  "verdict": "UNKNOWN",
  "exitCode": 3,
  "checkedAt": "2026-09-20T22:32:00Z",
  "durationMs": 0,
  "sites": 0,
  "counts": { "CRITICAL": 0, "OK": 0, "UNKNOWN": 0, "WARNING": 0 },
  "worstFirst": []
}
```

## The `sites` payload

`cairn sites list --json` carries one entry per registered site with `id`, `name`, `domain`, and
`step`, plus a top-level `errors` array naming every registry read the listing could not
complete. A non-empty `errors` makes the verdict `UNKNOWN` and the exit code `3`.

```json
{
  "schemaVersion": 1,
  "kind": "sites",
  "verdict": "OK",
  "exitCode": 0,
  "sites": [
    { "id": "example-org-a1b2c3", "name": "example.org", "domain": "example.org", "step": "live" },
    { "id": "example-net-d4e5f6", "name": "example.net", "domain": "example.net", "step": "live" }
  ]
}
```

## The `logs` payload

`cairn logs <site> --json` carries `site`, `containsPersonalData`, and `entries`, each entry
being `at`, `level`, `event`, and the event's own `fields`. Under `--json` stderr is silent, so
the personal-data notice a plain run prints travels in the payload or it reaches nobody.

```json
{
  "schemaVersion": 1,
  "kind": "logs",
  "verdict": "OK",
  "exitCode": 0,
  "site": "example.org",
  "containsPersonalData": true,
  "entries": [
    {
      "at": "2026-09-20T20:32:00Z",
      "level": "error",
      "event": "publish.commit.failed",
      "fields": { "editor": "someone@example.com", "reason": "conflict" }
    }
  ]
}
```

## The `adoptCandidates` payload

`cairn adopt list --json` carries `containsPersonalData` and `candidates`, each candidate
`worker`, `repo`, `zone`, `domain`, `accountId`, `connected`, `adopted`, and `adoptable`.
`adoptable` is true only where the Worker serves a Custom Domain, since cairn provisions Workers
Custom Domains and never Workers Routes; it was added as an optional field within schema version
1, so a reader written before it still reads every candidate.

```json
{
  "schemaVersion": 1,
  "kind": "adoptCandidates",
  "verdict": "OK",
  "exitCode": 0,
  "containsPersonalData": true,
  "candidates": [
    {
      "worker": "example-org",
      "repo": "example-org/site",
      "zone": "example.org",
      "domain": "example.org",
      "accountId": "<account-id>",
      "connected": true,
      "adopted": false,
      "adoptable": false
    }
  ]
}
```

## The `authCheck` payload

`cairn auth check --json` writes a top-level `permissions` array, one row per permission cairn
can hold, plus `site` when the run named one. Each row carries `label`, `credential`, and
`state`, with `reason` beside anything other than a pass; a row never reads `held`. No example
ships for this kind; the schema is the contract.

cairn resolves three credential variables: `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and
`CAIRN_GH_READ_TOKEN`. Each is read from the process environment first, then from the other
configured providers in turn. A password prompt (`cairn auth set`, not `--json`) falls back to
reading one piped line whenever stdin carries no terminal state, so a scripted set does not hang
waiting on a terminal that is not there.

## The `doctor` payload

`cairn doctor --json` writes its own kind rather than a site payload with different checks: a
directory run has no registry record, no credential tier, and no acknowledgements, so `site`,
`domain`, `tier`, `acknowledged`, and `hold` are absent. Its `dir` is the resolved, symlink-free
directory, never the argument as typed, and a directory that is not a cairn site writes an empty
`checks` array rather than null.

The doctor payload writes only the frozen state words and adds none of its own: an info result is
written `state: "pass"` with a `note` and no `detail`; a skip is written `state: "skip"` with
`reason: "reason.not-run"`; an unchecked result is written `state: "unknown"` with
`reason: "reason.not-observable"`. `held` is never written, since a directory preflight has no
hold concept.

A doctor check's `fix` carries only `summary` and `url`, with no `actor` and no `outward`, since
every doctor failure is fixed by a developer editing a checked-in file.

```json
{
  "schemaVersion": 1,
  "kind": "doctor",
  "verdict": "UNKNOWN",
  "exitCode": 3,
  "dir": "/srv/example-site",
  "checkedAt": "2026-09-21T12:00:00Z",
  "checks": [
    {
      "checkId": "config.bindings",
      "state": "pass",
      "condition": "config.bindings-missing",
      "detail": "EMAIL and AUTH_DB are declared"
    },
    {
      "checkId": "config.media-bucket",
      "state": "skip",
      "reason": "reason.not-run",
      "condition": "config.media-bucket-missing",
      "detail": "no media assets configured"
    },
    {
      "checkId": "config.observability",
      "state": "fail",
      "condition": "config.observability-off",
      "detail": "observability.enabled is not true",
      "fix": {
        "summary": "Set observability.enabled to true in wrangler.jsonc, then re-deploy.",
        "url": "https://cairn.pub/docs/admin/is-it-working#turn-on-observability"
      }
    },
    {
      "checkId": "config.csrf-disable",
      "state": "pass",
      "condition": "config.csrf-disable-missing",
      "detail": "checkOrigin: false found (svelte.config.js or vite.config.ts) and the hooks file wires the cairn guard (heuristic text read)"
    },
    {
      "checkId": "config.site-config",
      "state": "pass",
      "condition": "config.site-config-invalid",
      "detail": "parsed (per-concept URL policy lives on the adapter concepts, not checkable from the CLI)"
    },
    {
      "checkId": "config.public-origin",
      "state": "pass",
      "condition": "config.public-origin-invalid",
      "detail": "PUBLIC_ORIGIN is https://example.com (wrangler vars)"
    },
    {
      "checkId": "config.no-referrer-blanket",
      "state": "pass",
      "condition": "config.no-referrer-blanket",
      "detail": "no site-wide Referrer-Policy: no-referrer found (read src/hooks.server.ts; static/_headers not found, heuristic text read)"
    },
    {
      "checkId": "admin.mount-shape",
      "state": "pass",
      "condition": "admin.mount-incomplete",
      "note": "no wired /admin mount detected; mount the shared /admin/+layout that renders CairnAdminShell and calls createCairnAdmin({ runtime }).shellLoad, and the /admin/[...path] catch-all rendering CairnAdmin"
    },
    {
      "checkId": "config.dependency-floors",
      "state": "pass",
      "condition": "config.dependency-floors-unmet",
      "detail": "@sveltejs/kit 2.70.0 and svelte 5.56.10 satisfy the engine peer ranges"
    },
    {
      "checkId": "auth.role-wiring",
      "state": "skip",
      "reason": "reason.not-run",
      "condition": "auth.role-wiring-missing",
      "detail": "no custom roles declared; the guard fallback owner/editor already matches the vocabulary"
    },
    {
      "checkId": "ai.posture-effective",
      "state": "unknown",
      "reason": "reason.not-observable",
      "condition": "ai.posture-not-effective",
      "detail": "could not reach the resolved origin's /robots.txt"
    }
  ]
}
```

## What freezes at 1.0

The following are a versioned contract from `v1.0`: renaming or removing any of them is a
major-version event, and adding a new member to any of these lists is a minor-version event.

- Every `cairn health` check id: `creds`, `serving`, `delegation`, `https-forced`, `email`,
  `deploy`, `publish-path`, `engine`, `errors`.
- Every `cairn doctor` check id: `config.bindings`, `config.media-bucket`,
  `config.observability`, `config.csrf-disable`, `config.site-config`, `config.public-origin`,
  `config.no-referrer-blanket`, `admin.mount-shape`, `config.dependency-floors`,
  `auth.role-wiring`, `ai.posture-effective`.
- The verdict words: `OK`, `WARNING`, `CRITICAL`, `UNKNOWN`.
- The state words: `pass`, `fail`, `held`, `skip`, `unknown`.

## What does not freeze

- `durationMs` is wall time, excluded from the freeze because it necessarily differs between two
  runs of the same site even when nothing else has.
- The glyph set a plain-text renderer draws is a presentation detail, not part of this JSON
  contract, and may change at any release.
