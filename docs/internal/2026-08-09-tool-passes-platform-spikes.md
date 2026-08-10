# Platform spikes for the tool passes (verified 2026-08-09)

The admin-setup umbrella parks a set of platform questions for the tool passes and warns that
"every platform claim above carries a date and rots; each plan re-verifies its own at
implementation time." This is that verification, run before the T2 and T3 plans are written so
neither is drafted against a stale premise. Every finding below is dated today and cites how it
was established: a command run against the real toolchain, a live API call, or a vendor page.

Verdicts in one line: **wrangler's session does not reach chapter 2, Workers Builds is more
API-complete than assumed, the email-onboarding gap is real, the Registrar purchase path exists
but is documented in two places that disagree, and the GitHub token migration already happened.**

## A. Does wrangler's OAuth session cover chapter 2? Mostly no, and this is decisive

Established by running `npx wrangler login --scopes-list` against wrangler 4.97.0. The session
offers 25 scopes:

`account:read`, `user:read`, `workers:write`, `workers_kv:write`, `workers_routes:write`,
`workers_scripts:write`, `workers_tail:read`, `d1:write`, `pages:write`, `zone:read`,
`ssl_certs:write`, `ai:write`, `ai-search:write`, `ai-search:run`, `websearch.run`,
`agent-memory:write`, `artifacts:write`, `browser:write`, `cloudchamber:write`,
`containers:write`, `email_routing:write`, `email_sending:write`, `flagship:write`,
`pipelines:write`, `queues:write`, `secrets_store:write`.

- **Zone creation is not covered.** `zone:read` is the only zone scope on the list.
- **Registrar is not covered.** No registrar scope exists at all.
- **Email sending config is covered**, through `email_sending:write`. Better than the spec assumed.
- **Workers Builds has no dedicated scope**; it may ride `workers:write`, which this spike did not
  confirm.

What it changes: the spec offers a narrow self-managed OAuth client or a token-prefill fallback as
alternatives if wrangler's session falls short. For the domain half of chapter 2 it falls short, so
one of those is **required**, not contingent, and T3 has to pick which before it plans step 8.

The good half: chapter 1 lives entirely inside `workers:write`, `workers_scripts:write`, and
`d1:write`, so the zero-credential quickstart holds exactly as designed.

## B. Workers Builds: confirmed, and richer than the spec claimed

The spec corrected an earlier "no API" claim as stale. That correction is right, and understated.
The current API carries:

- Connections: `PUT /accounts/{id}/builds/repos/connections`, and delete by uuid.
- Triggers: `POST`, `PATCH`, `DELETE /accounts/{id}/builds/triggers[/{uuid}]`, plus
  `purge_build_cache` and a manual build kick.
- `GET /accounts/{id}/builds/repos/{provider}/{provider_account_id}/{repo_id}/config_autofill`,
  which derives build configuration from the repo.
- Deploy hooks and build tokens, each with full CRUD.

So step 10 (push-to-deploy, the default ending) is API-driven end to end apart from the one-time
Cloudflare GitHub App authorization the spec already names as manual. `config_autofill` may let the
tool skip hand-writing build config entirely; worth a look when T3 plans that step.

## C. Email Sending onboarding: the spec's claim holds, with nuance

`wrangler email sending enable <domain>` toggles sending, and `wrangler email sending dns get`
returns the SPF and DKIM records, so the tool can fetch and present exactly what the admin must
add. The step that actually onboards the domain ("Add records and onboard") remains dashboard-only.
The spec's "still the one step with no API" survives, and the deep-link-poll-resume design it
implies is still the right shape.

One naming change to absorb before Pass D writes about it: the surface is now branded **Cloudflare
Email Service**, in public beta, and it has gained a REST send endpoint
(`POST /accounts/{id}/email/sending/send`) alongside the Workers binding. This repo's durable
gotcha in `CLAUDE.md` about `E_SENDER_NOT_VERIFIED` and the Sending-versus-Routing distinction
predates that rename and should be re-read against the current docs rather than trusted as written.

## D. Registrar API: real, but the reference and the announcement disagree

The API shipped in beta on 2026-04-15 with three endpoints:

- `GET /accounts/{id}/registrar/domain-search`
- `POST /accounts/{id}/registrar/domain-check`, which queries the registry directly
- `POST /accounts/{id}/registrar/registrations`, which **charges the default payment method**

Beta limits: a curated TLD subset, and no transfers, renewals, or contact updates.

**The trap for whoever plans this.** The API reference page for `registrar/domains` lists only
`list`, `get`, and `update`, all belonging to the older transfer-into-Cloudflare resource. It does
not carry the three endpoints above. A planner who checks the reference alone concludes the
purchase path does not exist; a planner who reads only the announcement misses that transfers and
renewals are absent. Both sources are needed.

The spec's two-step confirmation before purchase, and its treatment of the purchase as
irreversible and non-resumable, are correct and if anything more important than written: the
register call charges a card with no separate confirmation step of its own.

## E. Do .ski and .life work through the API? Still unknown, with a precise unblock

Cloudflare has not published the API-supported TLD list. The Registrar API guide literally carries
the placeholder "Add a link here to the supported extensions list once it exists." A TLD that the
dashboard supports but the API does not returns `extension_not_supported_via_api` from the check
endpoint, so the only reliable answer is to call it.

I tried. The standing `CLOUDFLARE_API_TOKEN` is valid and active (a zones list returns `907.life`
and `/user/tokens/verify` reports the token active), but **every Registrar endpoint refuses it**,
including the read-only domains list. The estate token therefore carries no Registrar permission of
any kind.

**What unblocks it:** a Cloudflare API token with Registrar permissions. With one in hand, a single
`POST` to `domain-check` for a `.ski` and a `.life` name settles the question in seconds, at no
cost, since checking is not buying. This matters directly because the family's own two domains sit
on exactly the extensions a curated subset is most likely to exclude, which is what the spec
suspected. It is also a gap in the estate inventory worth recording there.

## F. GitHub installation token format: the migration already happened

The spec says tokens "migrate to a JWT-shaped format through mid-2026." That is now past tense.
GitHub announced the change on 2026-04-24 and rolled it out from 27 April through late June 2026.

- New format is stateless, `ghs_<app-id>_<jwt>`, around 520 characters, **variable length**, and
  contains two dots. The old opaque form contains none.
- Any length check or a `ghs_[A-Za-z0-9]{36}`-style pattern breaks. The suggested tolerant pattern
  is `ghs_[A-Za-z0-9\.\-_]{36,}`.
- Storage must hold at least 520 characters.
- A per-request override header shipped 2026-05-15 for validating against either format.

For T2 this stops being a watch item and becomes a hard requirement: treat the token as an opaque
string, never parse or measure it, and size anything that stores it accordingly.

## G. Fine-grained PAT as a repo-creation fallback: viable

GitHub's "Administration" permission is documented as covering "repository creation, deletion,
settings, teams, and collaborators," and repository permissions apply to user-owned resources as
well as organization-owned ones. So the fallback path the spec wanted smoke-tested is real. It is
not yet smoke-tested against a net-new repo, which needs a minted token; the permission to ask for
is confirmed.

## What this changes for the plans

- **T2** treats installation tokens as opaque as a requirement, not a caution (F), and can plan the
  PAT fallback around the Administration permission (G).
- **T3** must choose between a self-managed OAuth client and token prefill before planning step 8,
  because wrangler cannot reach zone creation or Registrar (A). Its step 10 gets cheaper than
  budgeted (B), and its step 9 stays as designed (C).
- **Before T3 plans chapter 2's domain branch**, Geoff mints a Registrar-scoped token so the
  `.ski`/`.life` question is answered rather than assumed (E).

## Sources

- [Wrangler OAuth scopes](https://developers.cloudflare.com/workers/wrangler/commands/general/), and `wrangler login --scopes-list` run locally
- [Workers Builds API](https://developers.cloudflare.com/api/resources/workers_builds/)
- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) and the [CLI reference](https://github.com/cloudflare/skills/blob/main/skills/cloudflare-email-service/references/cli-and-mcp.md)
- [Registrar API guide](https://developers.cloudflare.com/registrar/registrar-api/) and [the beta announcement](https://blog.cloudflare.com/registrar-api-beta/)
- [GitHub App installation token format notice](https://github.blog/changelog/2026-04-24-notice-about-upcoming-new-format-for-github-app-installation-tokens/) and [the per-request override header](https://github.blog/changelog/2026-05-15-github-app-installation-tokens-per-request-override-header/)
- [Permissions required for fine-grained PATs](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
