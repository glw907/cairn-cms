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
holds `wrangler.jsonc` (or `wrangler.toml`), `svelte.config.js`, and `site.config.yaml`. The
Cloudflare and GitHub checks need credentials from the environment. A check whose input is missing
reports SKIP with a line naming the flag or variable to set, and a skip never fails the run, so a
partial environment still yields a useful report.

## Flags and environment

| Flag | Env fallback | What it feeds |
|---|---|---|
| `--from <address>` | `CAIRN_FROM` | The magic-link from-address. Its domain drives the email and zone checks. |
| `--repo <owner/name>` | `GITHUB_REPO` | The site repository the GitHub App check reads. |
| `--send-test <address>` | none | Opt in to one real test email to this address. |

A flag beats its environment variable. The from-address arrives as a flag because `branding.from`
lives in the site's TypeScript adapter, which a CLI cannot evaluate.

The credential variables are the same values `wrangler` and the Worker use:

| Variable | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | The email, zone, and D1 checks. |
| `CLOUDFLARE_ACCOUNT_ID` | The D1 check and the live send. |
| `GITHUB_APP_ID` | The GitHub App check. |
| `GITHUB_APP_INSTALLATION_ID` | The GitHub App check. |
| `GITHUB_APP_PRIVATE_KEY_B64` | The GitHub App check. The PEM as a single-line base64 string. |

## The checks

Nine checks run by default, and `--send-test` adds a tenth. The condition id is the identity the
report, the runtime errors, and the readiness checklist share.

| Check | Condition | What it verifies | Skips when |
|---|---|---|---|
| `config.bindings` | `config.bindings-missing` | The wrangler config declares the `send_email` binding `EMAIL` and the D1 binding `AUTH_DB`. | No wrangler config file exists. |
| `config.observability` | `config.observability-off` | `observability.enabled` is `true`, so Workers Logs has a sink. | No wrangler config file exists. |
| `config.csrf-disable` | `config.csrf-disable-missing` | `svelte.config.js` carries `checkOrigin: false` (a heuristic text read). | `svelte.config.js` is absent. |
| `config.site-config` | `config.site-config-invalid` | `site.config.yaml` parses and its URL policy validates. | `site.config.yaml` is absent. |
| `email.sender-onboarded` | `email.sender-not-onboarded` | The from-domain has an enabled Email Sending subdomain on its zone. | No API token, or no from-address. |
| `edge.https-forced` | `edge.https-not-forced` | Always Use HTTPS is on for the zone. | No API token, or no from-address. |
| `edge.hsts` | `edge.hsts-off` | HSTS is enabled with a max-age of at least 30 days. | No API token, or no from-address. |
| `auth.store` | `auth.store-unreachable` | The `AUTH_DB` D1 database answers, the `editor`, `magic_token`, and `session` tables exist, and an owner row is present. | No API token or account id, or the wrangler config carries no `AUTH_DB` `database_id`. |
| `github.app` | `github.app-unreachable` | The App key parses and signs, an installation token mints, and the repository answers a read. | The GitHub credential trio or the repo is missing. |
| `email.live-send` | `email.send-failed` | One real message sends through the Email Sending REST API. Runs only with `--send-test`. | No API token, account id, or from-address. |

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
