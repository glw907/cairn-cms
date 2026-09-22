# Pass A mining output: manifests, examples, and ratified dispositions

Working material for tasks 5, 6, 6b, and 7. It is agent-facing and is deleted in task 11.

Three Sonnet reads mined `tool/docs/reference/exit-codes.md`, `json-output.md`, and
`cli-cairn-doctor.md`; this file is the `claude-opus-5` dispositions read over all three, with
every "could not source" item traced to code on this tree or cut with a reason. The ratification
here is final within task 4.

**How a drafter uses this file.** Copy commands and JSON examples from the manifests verbatim.
Never compose a command, never invent a payload. Every claim a drafted page makes must trace to a
filed bullet in `docs/internal/facts/reference.md` or to a ratified disposition below. A
disposition marked CUT must not appear on a page.

**Substitution rule applied.** Owner site names, the `glw907/ecxc-ski` repository, and the real
account id are replaced in every example below. The map used: `ecxc.ski` to `example.org`,
`907.life` to `example.net`, the site ids `ecxc-ski-a1b2c3` and `907-life-d4e5f6` to
`example-org-a1b2c3` and `example-net-d4e5f6`, the worker `ecxc-ski` to `example-org`, the repo
`glw907/ecxc-ski` to `example-org/site`, the account id to `<account-id>`. Confirmed already
generic and left unchanged: `/srv/example-site` and `https://example.com` in `doctor.json`,
`someone@example.com` in `logs.json`, and the `https://cairn.pub/docs/admin/is-it-working#...`
fix URLs, which are documentation links and not site names.

---

## cli-cairn-exit-codes

Destination: `docs/reference/cli-cairn-exit-codes.md`.

### Outline (the contract in the order the original presents it)

1. The convention: Monitoring Plugins / Nagios lineage, nothing cairn-specific.
2. The four codes and words: 0 `OK`, 1 `WARNING`, 2 `CRITICAL`, 3 `UNKNOWN`.
3. Precedence `CRITICAL > UNKNOWN > WARNING > OK`, deliberately not numeric order; 3 does not
   beat 2. It applies within one site and across a sweep.
4. What one check contributes: a pass is `OK`; a failure is `CRITICAL` unless the check's own
   declared severity ranks it `WARNING` (only `engine` does); an unexpired hold softens a failure
   to `WARNING`, never to `OK`; an expired hold contributes the same code an unheld failure does.
5. A check that could not run is `UNKNOWN`, with one exclusion: a check the site's own setup gives
   nothing to read is `WARNING` (missing credential, no repository recorded, no Workers Builds
   connection).
6. `unknown` against `skip`: `skip` is not attempted by configuration; `unknown` was attempted and
   observed nothing. One fact decides both the word and the code.
7. A hold never softens an unknown.
8. A site with no checks at all is `UNKNOWN`, never `OK`.
9. Empty-registry rules: `cairn sites list` reports zero and exits 0; an `--expect-sites` mismatch
   exits 3; `cairn health` on an empty registry exits 3.
10. Hold sources: `--ack <check-id>=<YYYY-MM-DD>`, repeatable, plus an acknowledgement file named
    by `--ack-file`, default `acknowledgements.json` in the registry directory; its absence is not
    an error.
11. Two ways a code is decided, which cannot collide: a run that produced reports folds site
    verdicts, listing errors, and `--expect-sites`; a run that produced no report carries a typed
    error (a cancelled run, a usage error, `cairn auth check`'s own verdict, a tool fault).
12. Usage errors exit 3 with byte-empty stdout. `--json` beats `--quiet`, so empty stdout under
    `--json` means the invocation was wrong and never that the site is healthy. Usage and
    help-on-error go to stderr; stdout carries payloads alone. An out-of-set `--color`,
    `--theme`, or `--width` value is a usage error too.
13. `--help` and `--version` exit 0, a deliberate deviation from the monitoring guideline's 3.
14. `cairn health <site>` takes a positional operand, not a flag.
15. `cairn doctor`: reads a directory, needs no credential and no registry record, makes at most
    one network request, and has no row in the requests-per-check table. Its exit 3 covers three
    cases. Test for a nonzero exit, never switch on 3.
16. Three nested timeout bounds: each provider request is capped at 15 seconds; each check makes
    at most a fixed number of requests; `--timeout` bounds the whole command, default 480 seconds.
17. The requests-per-check table, nine rows totalling 31. 31 times 15 seconds is 465 seconds, and
    the 480-second default is that rounded up. A timeout is a ceiling, not a wait.
18. The sweep formula and the per-site share.
19. A site the budget never reaches counts `UNKNOWN` toward the run's code and is omitted from the
    `--json` stream rather than emitted empty. A site cut short partway reports each unfinished
    check `unknown` with `reason.not-run`.
20. A scheduler's own cap is set above `--timeout` with headroom; a scheduler that kills the
    process first produces no exit code at all.
21. Credentials under a scheduler: no shell profile reaches a scheduled run, so the three
    variables come from `cairn auth set` (OS keyring) or the scheduler's own environment.

### Command manifest

The original fences no command: both fenced blocks are notation, and every command is an inline
mention. Each below is verbatim, with its source in the cobra tree.

| Command or flag | Source |
| --- | --- |
| `cairn health [<site>]` | `tool/cmd/cairn/health.go:44` |
| `cairn sites list` | `tool/cmd/cairn/sites.go:29,37` |
| `cairn doctor [<dir>]` | `tool/cmd/cairn/doctor.go:24` |
| `cairn auth check [<site>]` | `tool/cmd/cairn/probe_token.go:20-21` |
| `cairn auth set <name>` | `tool/cmd/cairn/auth.go:145` |
| `--timeout`, `-t` (default 480s) | `tool/cmd/cairn/root.go:229`; default `root.go:35` |
| `--verbose`, `-v` | `tool/cmd/cairn/root.go:230` |
| `--quiet`, `-q` | `tool/cmd/cairn/root.go:231`; exclusive with `--verbose` at `root.go:236` |
| `--color` (auto, always, never) | `tool/cmd/cairn/root.go:232`; values `root.go:39-43` |
| `--theme` (dark, light) | `tool/cmd/cairn/root.go:233`; values `root.go:50-53` |
| `--width` | `tool/cmd/cairn/root.go:234` |
| `--ack-file` | `tool/cmd/cairn/root.go:235` |
| `--ack <check-id>=<YYYY-MM-DD>` | `tool/cmd/cairn/health.go:58` |
| `--json` (health) | `tool/cmd/cairn/health.go:56` |
| `--expect-sites` | `tool/cmd/cairn/sites.go:46` |
| `--version`, `-V` | `tool/cmd/cairn/root.go:218,226` |

Two notation blocks the page may carry, neither a command:

```
CRITICAL > UNKNOWN > WARNING > OK
```

```
whole-run budget = min(480 seconds x sites, 1920 seconds)
per-site budget  = min(480 seconds, remaining budget / sites still to run)
```

The first line of the second block is required verbatim by
`tool/cmd/cairn/usage_test.go:568-576`, which builds the string
`min(480 seconds x sites, 1920 seconds)` from `defaultTimeout` and `maxSweepTimeout` and fails if
the page does not carry it.

The requests-per-check table must keep the row form
`` | `<check-id>` | <count> | ``, which `tool/cmd/cairn/usage_test.go:507-527` parses with the
regexp ``^\| `([a-z-]+)` \| (\d+) \|``. The nine rows: `creds` 2, `serving` 6, `delegation` 2,
`https-forced` 1, `email` 9, `deploy` 4, `publish-path` 2, `engine` 4, `errors` 1.
`tool/cmd/cairn/usage_test.go:542-564` requires exactly the ids `health.All` runs, no more and no
fewer, and fails if the total times 15 seconds exceeds the 480-second budget.

### Example manifest

Empty, and that is a ratified disposition, not an omission. The original carries no payload and no
captured output block, and no golden maps to this page. The drafted page carries no example block.

### Ratified dispositions

Every contract statement in the original is accounted for below: 24 items, 21 filed, 3 cut.

1. FILE. The four codes, words, and meanings. Bullet: "the four exit codes and their words".
   Source `tool/internal/spine/exit.go:14-36`.
2. FILE. Precedence, not numeric order. Source `tool/internal/spine/exit.go:38-55`.
3. FILE. What one check contributes, including the hold rules. Source
   `tool/internal/spine/exit.go:98-128`.
4. FILE. `unknown` against `skip`, one fact deciding word and code. Source
   `tool/internal/spine/exit.go:202-216`, `tool/internal/spine/outcome.go:85-93`.
5. FILE. The three not-attempted reasons behind the `WARNING` exclusion.
   **Traced this task** (the Sonnet read could not source it): they are `reason.cred-missing`,
   `reason.repo-not-recorded`, and `reason.api.builds-not-connected`, the slice
   `notAttemptedReasons` at `tool/internal/spine/outcome.go:78-83`, read by `NotAttempted` at
   `:85-93`.
6. FILE. A site with no checks is `UNKNOWN`. Source `tool/internal/spine/exit.go:133-145`.
7. FILE. Empty-registry rules. Source `tool/cmd/cairn/health_sweep.go:39-44`,
   `tool/internal/spine/exit.go:147-167`, `tool/cmd/cairn/sites.go:46`.
8. FILE. `--ack` grammar and the default acknowledgement file. Source
   `tool/cmd/cairn/ack.go:17-36`, `tool/cmd/cairn/health.go:58`, `tool/cmd/cairn/root.go:235`.
9. FILE. The two ways a code is decided and why they cannot collide. Source
   `tool/cmd/cairn/main.go:133-167`.
10. FILE. A usage error exits 3 with byte-empty stdout. Source
    `tool/cmd/cairn/main.go:153-167`, test `tool/cmd/cairn/usage_test.go:133-146`.
11. FILE. `--json` beats `--quiet`. Source `tool/cmd/cairn/health_sweep.go:49-53`,
    `tool/cmd/cairn/doctor.go:88-97`.
12. FILE. `--color`, `--theme`, and `--width` validation. Source
    `tool/cmd/cairn/root.go:98-115`.
13. FILE, reworded. `--help` and `--version` exit 0. This is cobra's own behaviour, which cairn
    takes rather than overrides; the page states the outcome and does not claim a cairn override.
    Source `tool/cmd/cairn/root.go:218-226`.
14. FILE. The positional site operand. Source `tool/cmd/cairn/health.go:44`.
15. FILE. `cairn doctor`'s shape and its three exit-3 cases. Source
    `tool/cmd/cairn/doctor.go:24-27,88-97`, `tool/internal/doctor/fetchrobots.go:28-35`,
    `tool/internal/doctor/status.go:58-82`.
16. FILE. The 15-second per-request cap. **Traced this task**: `requestTimeout` at
    `tool/internal/providers/transport.go:12-16`, exported as `RequestTimeout` at
    `tool/internal/providers/probe.go:31-35`, and spent by the budget test at
    `tool/cmd/cairn/usage_test.go:560-563`. The doctor's own robots request is the documented
    exception; see the doctor section, disposition 7.
17. FILE, with the sourcing stated plainly. The nine row values live on the page and nowhere in
    Go; `tool/cmd/cairn/usage_test.go:507-564` reads them back off the page and enforces the id
    set and the arithmetic. The bullet is filed `[candidate]` for that reason, with the rule
    itself filed `[verified]`.
18. FILE. The sweep formula and the per-site share. Source
    `tool/cmd/cairn/health_sweep.go:20-26,215-253`, drift-tested at
    `tool/cmd/cairn/usage_test.go:566-576`.
19. FILE. An unreached site counts `UNKNOWN` and is omitted from the stream; a site cut short
    reports `reason.not-run`. Source `tool/cmd/cairn/health_sweep.go:28-36`,
    `tool/internal/health/health.go:151,173`, `tool/internal/render/json.go:369-371`.
20. CUT. The scheduler-cap advice and its "2400 seconds" figure. Reason: operational advice with
    no code contract behind the number; it is arithmetic on the 1920-second cap disposition 18
    already files. The page may state it as a corollary, not as a sourced contract.
21. FILE. The three credential variables and the environment-before-keyring order.
    **Traced this task**: the names at `tool/cmd/cairn/env.go:36-38`, the resolution chain (the
    environment provider prepended to the rest) at `tool/cmd/cairn/env.go:199-212`, and
    `cairn auth set` at `tool/cmd/cairn/auth.go:145`.
22. CUT by absence. No example exists to carry forward. The page carries no example block.
23. FILE, new and page-shaping. The original names `cairn auth probe` as the one command with its
    own typed verdict. That command is a Hidden alias of `cairn auth check`
    (`tool/cmd/cairn/probe_token.go:24-29`), and `tool/cmd/cairn/main.go:134`'s comment still uses
    the older name. **The drafted page names `cairn auth check`** and may note the hidden alias;
    it must not present `cairn auth probe` as the command's name.
24. CUT. The Monitoring Plugins lineage framing as a claim about cairn. Reason: it is a statement
    about an external convention, not a cairn contract, and the container's external rule keeps a
    platform fact only where an implementer acts on one. The page may still name the convention in
    its lede as orientation.

---

## cli-cairn-json-output

Destination: `docs/reference/cli-cairn-json-output.md`.

### Outline

1. Two rules for every command: stdout is the payload and stderr is diagnostics, never merged;
   `--json` beats `--quiet`, and a usage error writes nothing to stdout and exits 3.
2. Seven payload kinds, each with its command, its schema file, its `$id`, and its
   `schemaVersion`, all at 1.
3. The stream rules for bare `cairn health --json`.
4. The verdict words and the five state words.
5. The reason vocabulary, 32 codes, closed and frozen.
6. One section per payload kind: site, summary, sites listing, logs, adopt candidates, permission
   report, doctor.
7. `## What freezes at 1.0`, then `## What does not freeze`.

The two headings must appear in that order and carry what
`tool/internal/render/json_schema_test.go:502-564` requires; see the freeze lists below.

### Payload kind table (for the page, schema paths as the page will link them)

| Kind field | Command | Schema file | `$id` | `schemaVersion` |
| --- | --- | --- | --- | --- |
| `site` | `cairn health <site> --json`, and each NDJSON line of `cairn health --json` | `schema/cairn-health.schema.json` | `https://cairn.pub/schema/cairn-health.schema.json` | 1 |
| `summary` | the final line of `cairn health --json` | `schema/cairn-health-summary.schema.json` | `https://cairn.pub/schema/cairn-health-summary.schema.json` | 1 |
| `sites` | `cairn sites list --json` | `schema/cairn-sites-list.schema.json` | `https://cairn.pub/schema/cairn-sites-list.schema.json` | 1 |
| `logs` | `cairn logs <site> --json` | `schema/cairn-logs.schema.json` | `https://cairn.pub/schema/cairn-logs.schema.json` | 1 |
| `adoptCandidates` | `cairn adopt list --json` | `schema/cairn-adopt-list.schema.json` | `https://cairn.pub/schema/cairn-adopt-list.schema.json` | 1 |
| `authCheck` | `cairn auth check --json` | `schema/cairn-auth-check.schema.json` | `https://cairn.pub/schema/cairn-auth-check.schema.json` | 1 |
| `doctor` | `cairn doctor --json` | `schema/cairn-doctor.schema.json` | `https://cairn.pub/schema/cairn-doctor.schema.json` | 1 |

The `kind` values are literals at `tool/internal/render/json.go:43-50` and
`tool/internal/doctor/json.go:13`; the versions at `tool/internal/render/json.go:21-39`.

### Command manifest

| Command | Source |
| --- | --- |
| `cairn health <site> --json` | `tool/cmd/cairn/health.go:44,56` |
| `cairn health --json` | `tool/cmd/cairn/health.go:44,56` |
| `cairn sites list --json` | `tool/cmd/cairn/sites.go:29,37,46` |
| `cairn logs <site> --json` | `tool/cmd/cairn/logs.go:32,44` |
| `cairn adopt list --json` | `tool/cmd/cairn/adopt.go:56,63` |
| `cairn auth check --json` | `tool/cmd/cairn/probe_token.go:20-21,46` |
| `cairn doctor --json` | `tool/cmd/cairn/doctor.go:24,42` |

The original's two other fenced blocks are CUT: `cairn adopt --worker <name> --domain <domain>`
belongs to the adopt command's own page, and the `jq` pipeline is composed shell, not a cairn
command. See dispositions 15 and 20.

### Example manifest

Every example below is a golden with the substitution map applied, and nothing else. A drafter
copies one of these blocks whole; it does not abbreviate, reorder, or add a key.

**`site`**, from `tool/internal/render/testdata/json/health-single.json`. Substituted:
`907.life` to `example.net` in `site` and `domain`.

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

**`summary`**, from `tool/internal/render/testdata/json/health-empty.json`. No substitution
needed. It is the empty-registry summary, which is also what a run against zero sites writes.

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

**`sites`**, from `tool/internal/render/testdata/json/sites-list.json`. Substituted: both site
ids, names, and domains.

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

**`logs`**, from `tool/internal/render/testdata/json/logs.json`. Substituted: `site`.
`someone@example.com` is already generic and is left unchanged.

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

**`adoptCandidates`**, from `tool/internal/render/testdata/json/adopt-list.json`. Substituted:
worker, repo, zone, domain, and the account id.

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

**`authCheck`**: no golden exists. This is a ratified disposition, disposition 21 below. The page
carries no example for this kind and says its schema is the contract.

**`doctor`**, from `tool/internal/render/testdata/json/doctor.json`, verbatim. **No substitution
is needed and none is applied**: `/srv/example-site` is a generic path, `https://example.com` is
the IANA reserved example domain and not an owner site, and the `cairn.pub` value is a
documentation fix URL rather than a site name. This confirms the Sonnet read's flag.

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

### The two freeze lists, as the drift test requires them

`tool/internal/render/json_schema_test.go:502-564` asserts the heading
`## What freezes at 1.0` appears before `## What does not freeze`, that every golden key appears
in backticks (children of `fields` and `observed` excepted), and that the frozen section names:

- every `health.All` check id: `creds`, `serving`, `delegation`, `https-forced`, `email`,
  `deploy`, `publish-path`, `engine`, `errors`;
- every `cairn doctor` check id, all eleven: `config.bindings`, `config.media-bucket`,
  `config.observability`, `config.csrf-disable`, `config.site-config`, `config.public-origin`,
  `config.no-referrer-blanket`, `admin.mount-shape`, `config.dependency-floors`,
  `auth.role-wiring`, `ai.posture-effective`;
- the verdict words `OK`, `WARNING`, `CRITICAL`, `UNKNOWN`;
- the state words `pass`, `fail`, `held`, `skip`, `unknown`;
- every `spine.ReasonCodes()` entry in backticks, 32 in all.

The not-frozen section must name `durationMs` and the glyph set.

The 32 reason codes, built at `tool/internal/spine/outcome.go:95-119` from three sets:

- nine fixed (`tool/internal/spine/outcome.go:56-70`): `reason.cred-missing`,
  `reason.cred-forbidden`, `reason.cred-revoked`, `reason.cred-expiring`, `reason.timeout`,
  `reason.offline`, `reason.not-run`, `reason.not-observable`, `reason.repo-not-recorded`;
- thirteen `reason.park.*` over `ParkCodes()` (`tool/internal/spine/park.go:13-25`):
  `delegation-propagating`, `delegation-pending`, `hostname-records-absent`,
  `hostname-resolver-lagging`, `certificate-pending`, `email-not-ready`,
  `email-sender-propagating`, `email-daily-limit`, `builds-app-not-authorized`,
  `builds-repo-not-selected`, `build-not-started`, `build-running`, `builds-reconcile-parked`;
- ten `reason.api.*` over `providers.Reasons()` (`tool/internal/providers/errors.go:17-53`):
  `unauthorized`, `forbidden`, `not-found`, `builds-not-connected`, `builds-repo-not-selected`,
  `builds-app-not-authorized`, `sender-not-configured`, `rate-limited`, `request-rejected`,
  `unknown`.

### Ratified dispositions

23 items, 19 filed, 4 cut. Numbering follows the Sonnet read where it maps; items 20 to 23 are
this read's own additions.

1. FILE. Stdout carries the payload, stderr carries diagnostics, `--json` beats `--quiet`, and a
   usage error writes nothing to stdout and exits 3. Source `tool/cmd/cairn/root.go:231,236`,
   `tool/cmd/cairn/health_sweep.go:49-53`, `tool/cmd/cairn/main.go:153-167`.
2. FILE. The seven kinds, their commands, their schemas, and `schemaVersion` 1 for each. Source
   `tool/internal/render/json.go:21-39,43-50`, `tool/internal/doctor/json.go:13`.
3. CUT. "Every version starts at 1 because no consumer existed before `tool/v1.0.0`." Reason:
   authorial rationale for a design choice, not a fact the code asserts. The code fixes the values
   at 1 and says nothing about the why, so the page may state the values and not the history.
4. FILE. The NDJSON stream shape. **Traced this task**: one site line per settled site without
   `exitCode` (`tool/cmd/cairn/health_json.go:34-49`,
   `tool/internal/render/json.go:216-229`), one final summary line carrying the run's `exitCode`
   (`health_json.go:51-69`), a stream with no summary reads `UNKNOWN`
   (`tool/internal/render/json.go:114-116`), and a site the run never reached is counted into
   `counts` as `UNKNOWN` with no line of its own (`tool/internal/render/json.go:369-371`,
   `tool/cmd/cairn/health_sweep.go:28-36`).
5. FILE. The five state words, `held` semantics, and the skip-against-unknown split.
   **Traced this task**: `tool/internal/spine/exit.go:202-216` (`StateWord`) and
   `tool/internal/spine/outcome.go:78-93`. The softening rule is
   `tool/internal/spine/exit.go:113-128`.
6. FILE. The `fix` object's five keys and the rule that `command` is carried only for an
   operator's own fix. **Traced this task**: `tool/internal/render/json.go:99-106,317-339`.
7. FILE. The `hold` object's two keys, and that an expired hold is reported rather than dropped.
   **Traced this task**: `tool/internal/render/json.go:108-112,288-290`, and the arriving-false
   rule at `tool/internal/spine/exit.go:89-92`.
8. FILE. The `fields` against `observed` split, the `{value, source}` shape, and the rule that the
   boundary reads a declared source and never infers one. **Traced this task**:
   `tool/internal/render/json.go:82-97,294-315`, `tool/internal/spine/outcome.go:158-178`. The
   "observed is never an instruction" framing is the page's own gloss on the marking; the bullet
   states the mechanism, which is sourced, and the page may draw the conclusion.
9. FILE. `errorCount` and `errorCountTruncated`. **Traced this task**:
   `tool/internal/health/check_errors.go:31-57`. The "excludes the Worker's own 404 noise" clause
   is CUT as unsourced in this read; see item 22.
10. FILE. The sites-listing fields, including `step` and `errors`. **Traced this task**:
    `tool/internal/render/json.go:128-146,391-405`, `tool/cmd/cairn/sites.go:143`.
11. FILE. The logs payload fields and `containsPersonalData`. **Traced this task**:
    `tool/internal/render/json.go:148-169,407-431`, and the stderr notice a non-JSON run prints at
    `tool/cmd/cairn/messages.go:152`.
12. FILE. The adopt-candidate fields and `adoptable`. **Traced this task**:
    `tool/internal/render/json.go:181-195` (the doc comment states the Custom Domains against
    Routes rule and the added-within-version-1 history) and `tool/cmd/cairn/adopt.go:98`
    (`Adoptable: c.Domain != ""`).
13. FILE. The 32-code vocabulary, its construction from three sets, and the three codes that mean
    `skip`. **Traced this task**: the sources listed under the freeze lists above.
    `reason.api.request-rejected` naming a cairn bug rather than a site fault is sourced at
    `tool/internal/providers/errors.go:32-37`.
14. FILE. The condition ids frozen at 1.0 and ported from the engine's registry. Source
    `tool/internal/spine/condition.go:19-45`.
15. FILE the sort claim, CUT the recipe. The wire sorts `checks` by id and `acknowledged`
    alphabetically, **traced this task** to `tool/internal/render/json.go:232-244`. The `jq`
    diffable-projection recipe is CUT: composed shell, not a tool contract, and no manifest entry
    backs it.
16. FILE. The doctor payload's own-kind rationale, its key list, and the two divergences.
    **Traced this task**: `tool/internal/doctor/json.go:11-63` (the kind, the absent site, domain,
    tier, acknowledged, and hold, and the note-carries-no-detail rule) and `:100-129` (`INFO`
    written as `pass` plus `note`, `SKIP` as `skip` plus `reason.not-run`, `UNCHECKED` as
    `unknown` plus `reason.not-observable`). `held` is never written: the four state-word
    constants at `:18-23` do not include it.
17. FILE. The doctor's eleven check ids. Source `tool/internal/doctor/report.go:10-31`.
18. FILE. Both freeze lists, as the drift test requires them. Source
    `tool/internal/render/json_schema_test.go:502-564`.
19. FILE. The three credential variable names, the environment-before-keyring order, and that no
    command waits on stdin when stdin is not a terminal. **Traced this task**:
    `tool/cmd/cairn/env.go:36-38,199-212` and `tool/cmd/cairn/auth.go:73-109`. The stdin claim is
    filed narrowly, as the password prompt's own non-terminal fallback, which is what the code
    shows; the broader "no command waits" generalisation is not filed.
20. CUT. The fenced `cairn adopt --worker <name> --domain <domain>` block. Reason: it documents
    the adopt command, which is another page's contract, and this page's brief covers payloads.
21. FILE as a disposition, not an example. `authCheck` has no golden. The page carries no example
    for that kind and says the schema is the contract. Its wire shape is
    `tool/internal/render/json.go:448-499`.
22. CUT. "`errorCount` excludes the Worker's own `console.error` 404 noise." Reason: not traced to
    code in this read, and a claim a scripter would act on must not ship unverified.
23. FILE. Every payload carries `schemaVersion`, `kind`, and `verdict` at top level, and every
    payload but a per-site NDJSON line carries `exitCode`. Source
    `tool/internal/render/json.go:55-70,116-126,130-137,149-159,172-179`,
    `tool/internal/doctor/json.go:28-38`.

---

## cli-cairn-doctor

Destination: `docs/reference/cli-cairn-doctor.md`.

### Outline

1. What it is: a directory preflight over checked-in configuration, needing no credential, no
   adopted site, and no provider access, so it runs in a fresh clone and in CI. `cairn health` is
   the live-site counterpart.
2. Command form `cairn doctor [<dir>]`; `<dir>` defaults to the working directory and is a path,
   never a registered site id; at most one positional argument; completion offers directories.
3. What it reads, all off disk under the resolved, symlink-free `<dir>`.
4. The one network request, a `GET` of the declared origin's `/robots.txt`.
5. The not-a-site short-circuit: one line, exit 3, no checks run.
6. Flags.
7. The eleven checks in report order, with what each observes.
8. Status words and what each contributes.
9. The exit codes and the three exit-3 cases.
10. The docs anchor each failure points at.
11. The payload, by link to the JSON page and the schema.

### Command manifest

| Command | Source |
| --- | --- |
| `cairn doctor [<dir>]` | `tool/cmd/cairn/doctor.go:24` |
| `cairn doctor ./my-site` | `tool/cmd/cairn/messages.go:306`, wired at `doctor.go:27` |
| `cairn doctor --json` | `tool/cmd/cairn/doctor.go:42` |

Flags, with sources: `--json` at `tool/cmd/cairn/doctor.go:42`; the persistent `--quiet`,
`--timeout`, `--color`, `--theme`, and `--width` at `tool/cmd/cairn/root.go:229-235`.

The original's `cairn doctor --json | jq '.checks[] | select(.state == "fail")'` is CUT; see
disposition 13.

### Example manifest

The original embeds no output block. The one payload example is the `doctor` block in the
json-output section above, unsubstituted. The five report goldens under
`tool/internal/doctor/testdata/golden/` are listed for a drafter that needs a report line, and
none is reproduced on the page unless copied from here:

| Golden | Verdict and code | What it shows |
| --- | --- | --- |
| `all-clean.txt` | OK, 0 | every check passes or skips |
| `every-status.txt` | UNKNOWN, 3 | a warning-severity failure, an info, and an unchecked |
| `one-blocker-failure.txt` | CRITICAL, 2 | a blocker failure on `config.bindings` |
| `one-warning-failure.txt` | WARNING, 1 | a warning failure on `config.csrf-disable` |
| `unchecked-result.txt` | UNKNOWN, 3 | no failure, one unchecked on `ai.posture-effective` |

### Ratified dispositions

14 items, 11 filed, 3 cut or structural.

1. FILE. The command's identity and scope. Source `tool/cmd/cairn/messages.go:299-306`.
2. FILE. `<dir>` defaults to the working directory, is a path and not a site id, and completion
   offers directories. Source `tool/cmd/cairn/doctor.go:24-37,50-53`.
3. FILE, three bullets. What it reads; the six `/admin` mount candidates
   (`tool/internal/doctor/check_mount.go:14-21`); the containment rule that refuses a path
   resolving outside `<dir>`, symlinks included
   (`tool/internal/doctor/snapshot.go:75-87`). The general file list is sourced at
   `tool/internal/doctor/wrangler.go:36,48`, `check_csrf.go:72,79`, `check_referrer.go:191-234`,
   `check_floors.go:328,376,384,392`, and `facts.go:11`.
4. FILE. The one `GET /robots.txt`, and nothing else touching the network. Source
   `tool/internal/doctor/fetchrobots.go:28-35`.
5. FILE. The not-a-site predicate and its one-line, exit-3 behaviour. Source
   `tool/internal/doctor/fileread.go:89-104`, `tool/cmd/cairn/doctor.go:60-61,113-129`,
   `tool/cmd/cairn/messages.go:322-330`.
6. FILE, two bullets. `--json` and its precedence over `--quiet`
   (`tool/cmd/cairn/doctor.go:42,88-97`); `--color`, `--theme`, and `--width` are accepted and
   have no effect on this command, whose report is plain text.
7. **CUT, and a replacement filed. This is the defect finding, ratified.** The original says the
   one request "is bounded at 15 seconds inside" `--timeout`. That is false on this tree:
   `robotsClient` carries no timeout of its own, and its own doc comment at
   `tool/internal/doctor/fetchrobots.go:20-21` says "it carries no timeout of its own: the
   deadline is the caller's context, the same one --timeout already bounds", which
   `FetchRobots` repeats at `:33-34`. The 15-second cap is `internal/providers`' own, at
   `tool/internal/providers/transport.go:12-16`, and that package is deliberately not used here
   (`fetchrobots.go:14-16`). **The new page states the truth**: the one request shares the
   command's own deadline, `--timeout`, default 480 seconds
   (`tool/cmd/cairn/root.go:35`), and carries no sub-bound. The false statement is recorded as a
   cut; the true one is filed as its own bullet.
8. FILE, one bullet per check id, eleven in all, each with its condition and severity. Source
   `tool/internal/doctor/report.go:10-31` for the id list and report order, and
   `tool/internal/spine/conditions.json` for each title and severity. The condition per id:
   `config.bindings-missing` blocker, `config.media-bucket-missing` warning,
   `config.observability-off` warning, `config.csrf-disable-missing` warning,
   `config.site-config-invalid` blocker, `config.public-origin-invalid` blocker,
   `config.no-referrer-blanket` warning, `admin.mount-incomplete` warning,
   `config.dependency-floors-unmet` blocker, `auth.role-wiring-missing` warning,
   `ai.posture-not-effective` warning.
9. FILE. `config.site-config` checks presence and parsing only, never the per-concept URL policy.
   Source the detail string in `tool/internal/render/testdata/json/doctor.json` and every report
   golden.
10. FILE, and the version figure is now sourced. **Traced this task**: the three facts-dependent
    checks read `src/content/.cairn/site-facts.json`
    (`tool/internal/doctor/facts.go:8-14`), and the message every one of them reports when the
    file is absent is the literal "needs engine 0.97.0 or later, and one build" at
    `tool/internal/doctor/facts.go:16-19`. The exit-3 consequence is the general rule from
    disposition 12, not a special case, and the page states it that way.
11. FILE, now `[verified]`, not `[candidate]`. **Traced this task**: the seven ids the original
    names as live-site-only are all `cairn health` check ids and none is a doctor check id:
    `serving` (`tool/internal/health/check_serving.go:25`), `delegation`
    (`check_delegation.go:20`), `https-forced` (`check_https.go:45`), `email`
    (`check_email.go:32`), `deploy` (`check_deploy.go:132`), `publish-path`
    (`check_publish.go:59`), and `errors` (`check_errors.go:26`). The doctor's own eleven
    (`tool/internal/doctor/report.go:19-31`) are disjoint from all nine health ids.
12. FILE, three bullets: the four codes and when each applies
    (`tool/cmd/cairn/doctor_test.go:76-159`); the three-way exit-3 collision and the
    test-for-nonzero guidance (`tool/cmd/cairn/doctor_test.go:161-270`); the `--json`
    empty-stdout-means-usage-error rule (`tool/cmd/cairn/doctor_json_test.go:26-55`). The fold
    itself is `tool/internal/doctor/status.go:58-82` over
    `tool/internal/spine/exit.go:133-167`.
    **CUT** within this item: the comparison to the retired Node `cairn-doctor`'s flat exit-1
    behaviour. Reason: migration commentary, not a fact about the current command.
13. CUT. The `jq` pipeline. Reason: composed shell with no cobra `Example`, help string, or test
    behind it, and this pass forbids a drafter composing one.
14. STRUCTURAL, no bullet. The closing JSON section is a pointer: the page links the payload to
    `cli-cairn-json-output.md` and the schema under `docs/reference/schema/`. Task 6b's brief
    already carries this.

Also ratified for this page: disposition 10 of the exit-codes section applies here, so the page
links the exit codes to `cli-cairn-exit-codes.md` and carries only the one sentence specific to
this command, per its brief.

---

## log-events

What task 7 folds from `tool/docs/reference/log-events.md` into `docs/reference/log-events.md`.
The engine page's vocabulary table is untouched; the addition is one section saying what `cairn`
does with that vocabulary.

Four statements to carry, each with where it is true in Go:

1. `cairn` carries a copy of the event-name list, for `--event` completion only, as a literal
   slice at `tool/internal/logs/events.go:3-7` (the slice `eventVocabulary`), read through
   `Events()` at `tool/internal/logs/events.go:92`. The comment there states why it is a literal
   and not generated: a `go install` build reaches no `src/lib` tree.
2. A test keeps the copy in step with the engine's `src/lib/log/events.ts`, so a name the engine
   adds fails the tool's gate rather than drifting: `TestEventVocabularyMatchesEngine` at
   `tool/internal/logs/events_test.go:33-58`, which reads `events.ts` through
   `providers.RepoRoot()`.
3. `cairn logs` does nothing to a record: it prints what the endpoint returned, in reverse
   chronological order, and never rewrites, truncates, or reinterprets a field's value. It prints
   an unconditional stderr notice that the output is not safe to paste in public, the constant
   `pasteNotice` at `tool/cmd/cairn/messages.go:152`; under `--json` that notice is the payload's
   own `containsPersonalData` field instead (`tool/cmd/cairn/logs.go:70-72`,
   `tool/internal/render/json.go:155-157`).
4. The `errors` health check counts `level: error` records over its window, which is why
   `cairn health --since` and `cairn logs --since` share one grammar, a positive integer followed
   by `m`, `h`, or `d`: `ParseSince` at `tool/internal/logs/logs.go:88-97`, and
   `tool/cmd/cairn/logs.go:44,66`. A Worker with no observability dataset cannot answer either,
   and the check reports that as a skip.

Ratified (redraft round, 2026-09-22): statement 4's second half is cut. `tool/internal/logs/logs.go:56-69`
records that a Worker with observability off answers the same query 200 with zero events, the same
as a Worker that simply logged nothing over the window, so the two are not distinguishable and the
claim is not observable; it is not carried onto the page.

Two notes for the implementer:

- The original's last heading reads "The two events a health run reads" and then names no event.
  The fold does not carry that heading; it states what the `errors` check counts, which is what
  the section actually says.
- The original links the payload as `json-output.md`. In the engine page the link target is
  `cli-cairn-json-output.md`, same directory.
