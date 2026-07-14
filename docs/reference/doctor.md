# The `cairn-doctor` CLI

`cairn-doctor` is the setup preflight. It probes the configuration a deployed cairn site depends
on, from the wrangler bindings to the GitHub App, and prints one plain-text report covering every
check. A failing check never stops the run, so a single pass surfaces everything that still needs
fixing. Each check ties to a condition in cairn's diagnostics registry, and a failure prints that
condition's why and remediation, the same text the runtime error surfaces use.

The package ships the command in its `bin` field, so an install puts it on the project's path. Run
it before the first deploy and again whenever sign-in or publishing misbehaves. The
[Cloudflare readiness guide](../guides/cloudflare-readiness.md) is the manual walkthrough of the
same list, one section per condition.

## How to run it

```bash
npx cairn-doctor --from editor@your-site.com --repo you/your-site
```

The command reads local config files from the working directory, so run it from the directory that
holds `wrangler.jsonc` (or `wrangler.toml`), `svelte.config.js`, `site.config.yaml`, and
`package-lock.json`. In a repo
whose `vite.config.ts` wires the `cairnManifest` plugin, the flags are optional; the doctor reads
them off the adapter, so `npx cairn-doctor` alone works. The Cloudflare and GitHub checks need
credentials from the environment. A check whose input is missing reports SKIP with a line naming
the sources that could supply it, and a skip never fails the run, so a partial environment still
yields a useful report.

## Flags and environment

| Flag | Env fallback | What it feeds |
|---|---|---|
| `--from <address>` | `CAIRN_FROM` | The magic-link from-address. Its domain drives the email and zone checks. |
| `--repo <owner/name>` | `GITHUB_REPO` | The site repository the GitHub App check reads. |
| `--send-test <address>` | none | Opt in to one real test email to this address. |
| `--probe [url]` | none | Opt in to the live admin sign-in probe. Bare `--probe` probes the `PUBLIC_ORIGIN` input. |

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

Fourteen checks run by default. Two opt-in flags add more: `--send-test` the live email send and
`--probe` the live admin probe. The condition id is the identity the report, the runtime errors,
and the readiness checklist share. Some checks share one condition id (`config.media-bucket` and
`config.tidy-key` both reuse `config.bindings-missing`), so the readiness count holds while the
checklist gains a distinct line.

| Check | Condition | What it verifies | Skips when |
|---|---|---|---|
| `config.bindings` | `config.bindings-missing` | The wrangler config declares the `send_email` binding `EMAIL` and the D1 binding `AUTH_DB`. | No wrangler config file exists. |
| `config.media-bucket` | `config.bindings-missing` | The adapter's declared media R2 bucket has a matching `r2_buckets` binding in the wrangler config. | No media assets are configured (the adapter declares no bucket). |
| `config.observability` | `config.observability-off` | `observability.enabled` is `true`, so Workers Logs has a sink. | No wrangler config file exists. |
| `config.csrf-disable` | `config.csrf-disable-missing` | `svelte.config.js` carries `checkOrigin: false` outside a comment, and `src/hooks.server.ts` (or `.js`) wires the cairn guard (a heuristic text read of both files). | `svelte.config.js` is absent. |
| `config.site-config` | `config.site-config-invalid` | `site.config.yaml` parses and its URL policy validates. | `site.config.yaml` is absent. |
| `config.public-origin` | `config.public-origin-invalid` | `PUBLIC_ORIGIN` (from the wrangler vars, or the environment as a fallback) parses as a URL and uses https, with http allowed only on `localhost` or `127.0.0.1`. The judgment is `requireOrigin`, the same rule the Worker applies. | No wrangler config file exists and `PUBLIC_ORIGIN` is not in the environment. |
| `config.tidy-key` | `config.bindings-missing` | When `tidy.enabled` is `true` in the site config, and a literal `ANTHROPIC_API_KEY` value is readable locally (typically `.dev.vars`), the doctor actively probes it with a zero-token Anthropic call and reports valid or invalid distinctly. When only the key's name is referenced (a real deployed Worker secret, invisible to any CLI) it passes on presence alone and says so; a network failure during the probe fails soft to an unverified pass rather than claiming the key is invalid. | No `site.config.yaml` exists, or tidy is not enabled in it. |
| `admin.mount-shape` | `admin.mount-incomplete` | The four-file `/admin` mount is wired: a `shellLoad` call on any identifier and a `CairnAdminShell` render across the `/admin` route files (a heuristic text read that tolerates a renamed composer). This check never fails; it skips with guidance when it cannot see the mount, so an unconventionally wired site never goes red. | None of the candidate `/admin` mount files exist, or the two signals are not both found (a skip carries the one-line fix). |
| `config.dependency-floors` | `config.dependency-floors-unmet` | The lockfile's resolved `svelte` and `@sveltejs/kit` versions satisfy the engine's declared peer ranges, read from the installed `@glw907/cairn-cms/package.json` so the floors are declared once. | No `package-lock.json` exists (a pnpm or yarn lockfile is not read), or the lockfile carries no entry for a dependency. |
| `email.sender-onboarded` | `email.sender-not-onboarded` | The from-domain has an enabled Email Sending subdomain on its zone. | No API token, or no from-address. |
| `edge.https-forced` | `edge.https-not-forced` | Always Use HTTPS is on for the zone. | No API token, or no from-address. |
| `edge.hsts` | `edge.hsts-off` | HSTS is enabled with a max-age of at least 30 days. | No API token, or no from-address. |
| `auth.store` | `auth.store-unreachable` | The `AUTH_DB` D1 database answers, the `editor`, `magic_token`, and `session` tables exist, and an owner row is present. | No API token or account id, or the wrangler config carries no `AUTH_DB` `database_id`. |
| `github.app` | `github.app-unreachable` | The App key parses and signs, an installation token mints, and the repository answers a read. | The GitHub credential trio or the repo is missing. |
| `email.live-send` | `email.send-failed` | One real message sends through the Email Sending REST API. Runs only with `--send-test`. | No API token, account id, or from-address. |
| `admin.login-probe` | `admin.login-probe-failed` | The deployed `/admin/login` answers with a working sign-in envelope, and the request action accepts a POST. Runs only with `--probe`. | Bare `--probe` finds no URL in the wrangler vars or `PUBLIC_ORIGIN`. |

The GitHub check walks the exact chain the Worker walks on a save, so a green check means the
commit pipeline's credentials work, and a failure names which link broke. For the site config, the
doctor runs the engine's own parser and URL-policy validator; whether each policy key names a
concept the adapter declares is the one thing it cannot see, since the adapter is TypeScript.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every check passed or skipped. |
| 1 | At least one check failed. |
| 2 | Bad flags. The usage line goes to stderr. |

A skip never fails the run, so the exit code reflects only what the doctor could actually probe.

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

1. `GET <url>/admin/login` answers 200, sets the CSRF cookie (`__Host-cairn_csrf` on https, bare
   `cairn_csrf` on local http), and serves a page carrying the `name="csrf"` hidden field with a
   value and a form posting the `?/request` action.
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

## CI wiring

The exit code makes the doctor a deploy gate. One job step covers it:

```yaml
- run: npx cairn-doctor --from editor@your-site.com --repo you/your-site
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    GITHUB_APP_ID: ${{ secrets.CAIRN_GITHUB_APP_ID }}
    GITHUB_APP_INSTALLATION_ID: ${{ secrets.CAIRN_GITHUB_APP_INSTALLATION_ID }}
    GITHUB_APP_PRIVATE_KEY_B64: ${{ secrets.CAIRN_GITHUB_APP_PRIVATE_KEY_B64 }}
```

## See also

- [Cloudflare readiness](../guides/cloudflare-readiness.md) for the manual walkthrough of the same
  conditions, in setup order.
- [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md) for the deploy sequence the doctor
  gates.
- [Log events](./log-events.md) for the runtime records the conditions correlate with.
