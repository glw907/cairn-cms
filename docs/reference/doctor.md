# The `cairn-doctor` CLI

`cairn-doctor` is the setup preflight. It probes the configuration a deployed cairn site depends
on, from the wrangler bindings to the GitHub App, and prints one plain-text report covering every
check. A failing check never stops the run, so a single pass surfaces everything that still needs
fixing. Each check ties to a condition in cairn's diagnostics registry, and a failure prints that
condition's why and remediation, the same text the runtime error surfaces use.

The package ships the command in its `bin` field, so an install puts it on the project's path. Run
it before the first deploy and again whenever sign-in or publishing misbehaves. The
[Is it working?](../admin/is-it-working.md) page is the manual walkthrough of the
same list, one section per condition.

## How to run it

```bash
npx cairn-doctor --from editor@your-site.com --repo you/your-site
```

The command reads local config files from the working directory, so run it from the directory that
holds `wrangler.jsonc` (or `wrangler.toml`), `site.config.yaml`, and a lockfile (`package-lock.json`,
`pnpm-lock.yaml`, or `yarn.lock`). It also looks for `svelte.config.js` and `vite.config.ts`, since
`config.csrf-disable` reads the CSRF handoff there. A bare `sv create` scaffold, verified 2026-08-14
against `sv` 0.17.0, writes no `svelte.config.js` at all: the adapter, and any `checkOrigin: false`
setting, live inside `vite.config.ts`'s `sveltekit({ ... })` call instead, so the check reads both
files (see the `config.csrf-disable` row below). A `create-cairn-site` scaffold always carries
`svelte.config.js`, so on that scaffold the check always has a file to read. In a repo whose
`vite.config.ts` wires the `cairnManifest` plugin, the flags are optional; the doctor reads them
off the adapter, so `npx cairn-doctor` alone works. The Cloudflare and GitHub checks need
credentials from the environment.

A check whose input is missing reports one of two statuses, and the difference matters. A SKIP
means the check doesn't apply at all, with no gating, ever. An UNCHECKED means a deterministic
check needed an input the run genuinely couldn't find, which drives its own exit code. See
[Status vocabulary](#status-vocabulary) below.

## Flags and environment

| Flag | Env fallback | What it feeds |
|---|---|---|
| `--from <address>` | `CAIRN_FROM` | The magic-link from-address. Its domain drives the email and zone checks. |
| `--repo <owner/name>` | `GITHUB_REPO` | The site repository the GitHub App check reads. |
| `--send-test <address>` | none | Opt in to one real test email to this address. |
| `--probe [url]` | none | Opt in to the live admin sign-in probe. Bare `--probe` probes the `PUBLIC_ORIGIN` input. |
| `--fix` | none | Install or refresh the packaged `cairn-admin-screens` skill into `.claude/skills/cairn-admin-screens/`, before the checks run. |

The credential variables are the same values `wrangler` and the Worker use:

| Variable | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | The email, zone, and D1 checks. Env-only; never derived. |
| `CLOUDFLARE_ACCOUNT_ID` | The D1 check and the live send. Falls back to the wrangler config's top-level `account_id`. |
| `PUBLIC_ORIGIN` | The public-origin check, as a fallback when the wrangler vars carry none. |
| `GITHUB_APP_ID` | The GitHub App check. |
| `GITHUB_APP_INSTALLATION_ID` | The GitHub App check. |
| `GITHUB_APP_PRIVATE_KEY_B64` | The GitHub App check. The PEM as a single-line base64 string. |

## Where inputs come from

Each input resolves from three places, in order: an explicit flag, the environment variable, and
the repository the doctor runs in. The first source that yields a value wins, and derivation runs
lazily, only for inputs the flags and environment left missing.

When the site's Vite config wires the `cairnManifest` plugin, the doctor evaluates the configured
adapter module through the site's own Vite resolution. It reads the from-address off
`cairn.email.from` and the repository off `cairn.backend.owner` and `cairn.backend.repo`. For the
account id it falls back to the wrangler config's top-level `account_id`. A repo the doctor cannot
read this way (no Vite config, no `cairnManifest` plugin, or an adapter that fails to load)
degrades cleanly; the affected checks skip and their detail lines name the flag, the variable, and
the plugin wiring.

Secrets (`CLOUDFLARE_API_TOKEN` and the GitHub App credential trio) come only from the
environment. They are never derived from the repo and never printed.

## The checks

Nineteen checks run by default. Two opt-in flags add more: `--send-test` the live email send and
`--probe` the live admin probe. The condition id is the identity the report, the runtime errors,
and the readiness checklist share. One pair shares a condition id (`config.bindings` and
`config.media-bucket` both use `config.bindings-missing`), so the readiness checklist gains a
distinct line without a second condition to maintain; every other check carries its own.

| Check | Condition | What it verifies | Reports skip, info, or unchecked when |
|---|---|---|---|
| `config.bindings` | `config.bindings-missing` | The wrangler config declares the `send_email` binding `EMAIL` and the D1 binding `AUTH_DB`. | Skip: no wrangler config file exists. |
| `config.media-bucket` | `config.bindings-missing` | The adapter's declared media R2 bucket has a matching `r2_buckets` binding in the wrangler config. | Skip: no media assets are configured (the adapter declares no bucket). |
| `config.observability` | `config.observability-off` | `observability.enabled` is `true`, so Workers Logs has a sink. | Skip: no wrangler config file exists. |
| `config.csrf-disable` | `config.csrf-disable-missing` | `svelte.config.js` or `vite.config.ts` carries `checkOrigin: false` outside a comment, and `src/hooks.server.ts` (or `.js`) wires the cairn guard (a heuristic text read of all three). Found in neither file never reads as a pass or a skip; it fails. | Unchecked: neither `svelte.config.js` nor `vite.config.ts` exists. |
| `config.site-config` | `config.site-config-invalid` | `site.config.yaml` parses and its URL policy validates. | Unchecked: `site.config.yaml` is absent from every conventional location (the repo root, `src/lib/`, `src/`, and `src/theme/`, where `create-cairn-site` and the showcase bake it). |
| `config.public-origin` | `config.public-origin-invalid` | `PUBLIC_ORIGIN` (from the wrangler vars, or the environment as a fallback) parses as a URL and uses https, with http allowed only on `localhost` or `127.0.0.1`. The judgment is `requireOrigin`, the same rule the Worker applies. | Skip: no wrangler config file exists and `PUBLIC_ORIGIN` is not in the environment. |
| `config.tidy-key` | `config.tidy-key-missing` | When `tidy.enabled` is `true` in the site config, and a literal `ANTHROPIC_API_KEY` value is readable locally (typically `.dev.vars`), the doctor actively probes it with a zero-token Anthropic call and reports valid or invalid distinctly. When only the key's name is referenced (a real deployed Worker secret, invisible to any CLI) it passes on presence alone and says so; a network failure during the probe fails soft to an unverified pass rather than claiming the key is invalid. | Skip: no `site.config.yaml` exists, or tidy is not enabled in it. |
| `config.no-referrer-blanket` | `config.no-referrer-blanket` | `src/hooks.server.ts` (or `.js`) and `static/_headers` for a site-wide `Referrer-Policy: no-referrer` (a heuristic, single-line text read of both; it does not follow an import into another module, does not join a Prettier-wrapped multi-line header write across lines, and its comment strip cuts at the first `//` on a line even when that `//` is inside a URL literal, such as `'https://example.com'`, so the rest of that line is lost). A blanket policy strips the `Origin` header from a plain same-origin form POST, which cairn's strict `originMatches` guard rejects outside `/admin`. A path scoped to specific routes (`/admin/*` in `_headers`, a route-guarded write in the hooks file) never fails this check; the remedy for a route guarded by `originMatches` is `same-origin`, never `no-referrer`, since only a double-submit-token route like `/admin` can afford to strip `Origin` too. | Skip: neither `src/hooks.server.ts`/`.js` nor `static/_headers` is readable; the detail names both sources it looked for, plus the remedy, never a silent pass. |
| `admin.mount-shape` | `admin.mount-incomplete` | The four-file `/admin` mount is wired: a `shellLoad` call on any identifier and a `CairnAdminShell` render across the `/admin` route files (a heuristic text read that tolerates a renamed composer). This check never fails; it reports info with guidance when it cannot see the mount, so an unconventionally wired site never goes red. | Info: none of the candidate `/admin` mount files exist, or the two signals are not both found (the info line carries the one-line fix). |
| `skill.admin-screens` | `skill.admin-screens-stale` | The consumer's `.claude/skills/cairn-admin-screens/` matches the packaged skill, by a content hash of both trees. This check never fails; it skips with guidance (missing or stale) rather than gating a deploy on a development aid. | Skip: never; it always reports fresh, missing, or stale. |
| `config.dependency-floors` | `config.dependency-floors-unmet` | The lockfile's resolved `svelte` and `@sveltejs/kit` versions satisfy the engine's declared peer ranges, read from the installed `@glw907/cairn-cms/package.json` so the floors are declared once. Reads `package-lock.json`, then `pnpm-lock.yaml`, then `yarn.lock`, judging whichever it finds first. | Unchecked: none of the three lockfiles exists. Skip: the recognized lockfile carries no entry for a dependency. |
| `email.sender-onboarded` | `email.sender-not-onboarded` | The from-domain has an enabled Email Sending subdomain on its zone. | Skip: no API token, or no from-address. |
| `edge.https-forced` | `edge.https-not-forced` | Always Use HTTPS is on for the zone. cairn's own JS-free admin sign-in posts a form, and the framework CSRF guard rejects a form POST whose origin scheme doesn't match, so an admin reached over http hits an opaque 403; this stays a gating check for that reason. | Skip: no API token, or no from-address. |
| `auth.store` | `auth.store-unreachable` | The `AUTH_DB` D1 database answers, the `editor`, `magic_token`, and `session` tables exist, `magic_token` carries the `nonce_hash` column `migrations/0004_login_nonce.sql` adds (an un-migrated database fails here, naming the migration, because the engine's sign-in binds every token to that column), and at least one owner-capability row is present (every declared role mapped to owner capability, `owner` when the site declares none). | Skip: no API token or account id, or the wrangler config carries no `AUTH_DB` `database_id`. |
| `auth.role-vocabulary` | `auth.unknown-role` | Every distinct `role` value in the `editor` table is a name the site's declared vocabulary knows (checked by name, not resolved capability, so a role explicitly declared `none` still counts as known). | Skip: same as `auth.store`. |
| `auth.role-wiring` | `auth.role-wiring-missing` | When the adapter declares custom roles with `defineRoles`, `src/hooks.server.ts` passes the same vocabulary to `createAuthGuard({ roles })` (a heuristic text read), so a role outside owner/editor resolves to its declared capability instead of falling back to `none`. | Skip: the site declares no custom roles (the guard fallback already matches the declared vocabulary). Info: `src/hooks.server.ts` is not found, or the heuristic cannot read the `createAuthGuard` call (none found, or its argument is not a readable object literal). |
| `auth.email-normalization` | `auth.email-not-normalized` | Every `editor.email` is trimmed and lowercase, the invariant every write and lookup path holds; a manual `wrangler d1 execute` insert is the one way to violate it. | Skip: same as `auth.store`. |
| `github.app` | `github.app-unreachable` | The App key parses and signs, an installation token mints, and the repository answers a read. | Skip: the GitHub credential trio or the repo is missing. |
| `ai.posture-effective` | `ai.posture-not-effective` | A plain `GET /robots.txt` against the deployed origin, reporting what the live file actually carries. It fails on one case only: a site that declares an `aiPosture` the served file doesn't carry, which is a stated stance crawlers never read. A site that declares none passes, since absence is honest, and so does a managed layer (Cloudflare's AI Crawl Control or its managed robots.txt) prepending directives cairn didn't write, since whether that's wanted belongs to the zone's owner. The report never asserts why a zone is configured as it is, which is unreadable from a robots.txt body alone. | Skip: no wrangler config file exists and `PUBLIC_ORIGIN` is not in the environment, or the origin doesn't answer. |
| `email.live-send` | `email.send-failed` | One real message sends through the Email Sending REST API. Runs only with `--send-test`. | Skip: no API token, account id, or from-address. |
| `admin.login-probe` | `admin.login-probe-failed` | The deployed `/admin/login` answers with a working sign-in envelope, and the request action accepts a POST. Runs only with `--probe`. | Skip: bare `--probe` finds no URL in the wrangler vars or `PUBLIC_ORIGIN`. |

The GitHub check walks the exact chain the Worker walks on a save, so a green check means the
commit pipeline's credentials work, and a failure names which link broke. For the site config, the
doctor runs the engine's own parser and URL-policy validator; whether each policy key names a
concept the adapter declares is the one thing it cannot see, since the adapter is TypeScript.

## Status vocabulary

Every check resolves to one of five statuses, printed as a tag at the start of its line.

| Status | Meaning | Gates the run? |
|---|---|---|
| PASS | The check ran and found what it expects. | No. |
| FAIL | The check ran and found a real problem. | Yes; drives exit 1. |
| SKIP | The check doesn't apply here at all (an opt-in feature that's off, a role vocabulary with nothing custom to wire). | No, never. |
| INFO | A heuristic couldn't see enough to render a verdict, or a finding is advisory rather than a deploy blocker. Reported with guidance. | No, never. |
| UNCHECKED | A deterministic check's required input was absent or unreadable: the check IS applicable, but genuinely couldn't look. | Yes; drives exit 3 when no check failed. |

SKIP and UNCHECKED look similar (both mean "no verdict"), but they answer different questions.
SKIP means the check doesn't apply to this site at all. UNCHECKED means the check applies, and
would have an answer if it could find its input, so a silent environment gap doesn't read as a
clean run. `config.csrf-disable`, `config.site-config`, and `config.dependency-floors` are the
checks most likely to report UNCHECKED on a hand-built or partially configured site.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every check passed, skipped, or reported info; nothing failed and nothing was left unchecked. |
| 1 | At least one check failed. |
| 2 | Bad flags. The usage line goes to stderr. |
| 3 | No check failed, but at least one deterministic check reported unchecked. |

A skip or an info never fails the run, so 0 reflects only what the doctor could actually probe. A
failure always wins the exit code over an unchecked result: exit 1 beats exit 3 when a run carries
both. In CI, exit 3 fails the step the same way exit 1 does (both are nonzero), but the codes let
you branch on the difference if you want to warn on an unchecked environment gap without blocking
on it, while still blocking on a real failure; see [CI wiring](#ci-wiring).

## The opt-in live send

`--send-test <address>` sends one real email from the `--from` address to the given address through
the Email Sending REST API, with the fixed subject `cairn doctor test send`. Receiving it proves
the sending path end to end, past what the onboarding check can see. It is a real delivery to a
real inbox, so point it at your own address and leave it off in CI.

## The opt-in live probe

`--probe <url>` runs one live check against a deployed admin, the outside-in complement to the
config and credential checks. Bare `--probe` resolves the URL from the `PUBLIC_ORIGIN` input: the
wrangler config vars first, then the environment variable. The probe does not run at all without
the flag, since it is a network POST against a production site.

The probe asserts the envelope a working sign-in presents, in two steps:

1. `GET <url>/admin/login` answers 200, sets the CSRF cookie (`__Host-cairn_csrf` when the probed
   origin is https, bare `cairn_csrf` on a local http origin), and serves a page carrying the
   `name="csrf"` hidden field with a value and a form posting the `?/request` action. The expected
   cookie name derives from the PROBED origin's own scheme, deliberately, never from a separately
   resolved `PUBLIC_ORIGIN`: it's a cross-check on what the deployed runtime actually presents,
   immune to a `--url` override diverging from the wrangler config's own value.
2. `POST <url>/admin/login?/request` with the cookie and field echoed answers the serialized
   action result for a sent request. A `throttled` answer also passes, since a re-run inside a
   real editor's cooldown window still proves the path; the detail line says so.

The probe is side-effect free by construction. It submits a random non-editor address at the
reserved `example.invalid` domain, and the engine's non-leak design answers a non-editor exactly
like a successful send while sending no email and minting no token, so nothing lands in any inbox
and nothing changes on the site. A `send_error` answer fails the check, which catches a deployed
site whose send path is broken without spending a real delivery.

Run it after the first deploy, after an edge or auth change, or whenever an editor reports a
sign-in problem. A probe failure has many possible causes, so its detail line names the failed
assertion and the remediation points back at the rest of the doctor and the deploy guide.

## The `--fix` skill install

The package ships an agent-facing skill, `cairn-admin-screens`, that teaches a build agent the
register rules and the done-gate for a cairn admin screen. `--fix` installs it, copying the
packaged `skills/cairn-admin-screens/` tree into `.claude/skills/cairn-admin-screens/` in the
working directory:

```bash
npx cairn-doctor --fix
```

It runs before the checks, so `skill.admin-screens` reads fresh in the same report. Run it again
after upgrading `@glw907/cairn-cms`, whenever the skill's content changes upstream. The
`skill.admin-screens` check compares a hash of the installed copy against the packaged one and
reports missing or stale. It never fails the run, since the skill is a development aid, not a
deploy blocker.

The installed skill's own reference files quote utility class names verbatim as worked examples,
and Tailwind v4's automatic source detection scans any non-ignored file under the project,
`.claude/` included. Exclude `.claude/` from the site's own Tailwind build (an `@source not`
directive, or the equivalent of a `.gitignore` exclusion for the toolchain in use) so those
examples never compile into the site's own shipped CSS.

## CI wiring

The exit code makes the doctor a deploy gate. A single job step covers it, treating exit 1
(a failure) and exit 3 (an unchecked check) alike, since both are nonzero:

```yaml
- run: npx cairn-doctor --from editor@your-site.com --repo you/your-site
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    GITHUB_APP_ID: ${{ secrets.CAIRN_GITHUB_APP_ID }}
    GITHUB_APP_INSTALLATION_ID: ${{ secrets.CAIRN_GITHUB_APP_INSTALLATION_ID }}
    GITHUB_APP_PRIVATE_KEY_B64: ${{ secrets.CAIRN_GITHUB_APP_PRIVATE_KEY_B64 }}
```

To distinguish a real failure from an unchecked environment gap, capture the exit code instead of
letting the step fail on it directly, and branch on the value: 1 is a check that actually failed,
3 is a check that could not find its input, and 2 is a bad flag in the command itself.

GitHub Actions runs a `run:` step under `bash -e`, so a bare nonzero exit aborts the step before
the capture line runs. Make the exit non-fatal with `|| code=$?` before branching on it:

```yaml
- run: |
    code=0
    npx cairn-doctor --from editor@your-site.com --repo you/your-site || code=$?
    if [ "$code" -eq 1 ]; then
      echo "::error::cairn-doctor found a real failure"
      exit 1
    elif [ "$code" -eq 3 ]; then
      echo "::warning::cairn-doctor could not check everything (see the UNCHECKED lines above)"
    elif [ "$code" -ne 0 ]; then
      exit "$code"
    fi
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    GITHUB_APP_ID: ${{ secrets.CAIRN_GITHUB_APP_ID }}
    GITHUB_APP_INSTALLATION_ID: ${{ secrets.CAIRN_GITHUB_APP_INSTALLATION_ID }}
    GITHUB_APP_PRIVATE_KEY_B64: ${{ secrets.CAIRN_GITHUB_APP_PRIVATE_KEY_B64 }}
```

## See also

- [Is it working?](../admin/is-it-working.md) for the manual walkthrough of the same
  conditions, in setup order.
- [Create your site](../admin/create-your-site.md) for the deploy sequence the doctor
  gates.
- [Log events](./log-events.md) for the runtime records the conditions correlate with.
