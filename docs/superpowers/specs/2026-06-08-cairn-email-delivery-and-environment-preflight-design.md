# Magic-link delivery, observability, and an environment preflight

Design spec, 2026-06-08. Status: drafted, reframed as Passes 2 and 3 of the cairn diagnostics
initiative (`2026-06-08-cairn-diagnostics-initiative-design.md`). Arm A is Pass 2, the email-delivery
runtime arm. Arms B and C are Pass 3, the doctor and the readiness checklist. Both consume the Pass 1
condition model rather than inventing their own error identities, so the messages, the doctor results,
and the checklist all draw from one registry. The arms below stand, with that one change folded in
during planning.

This pass answers the ecxc DX finding
(`docs/cairn-dx-feedback-2026-06-08-ecxc-magic-link-send-swallowed.md`). A real admin could not sign
in. Every magic-link request returned the "check your email" confirmation, and no email ever arrived.
Diagnosing it cost an afternoon of `wrangler tail` and D1 reads.

## The problem, in three layers

**The surface fault.** The `ecxc.ski` sending domain was never onboarded to Cloudflare Email Sending,
so `env.EMAIL.send({ from: '…@ecxc.ski' })` had no aligned sender and threw. The site was renamed from
`ecnordic.ski`, and the old domain was onboarded while the new one was not.

**The fault that hid it.** The send is fire-and-forget. `requestAction` hands the send to `waitUntil`
and returns the literal `{ sent: true }` unconditionally, so a hard delivery failure never reaches the
form result, the page, or the action's type. The `auth.link.send_failed` log line existed, and nobody
knew to look.

**The fault under both.** Nothing checked the environment before a real editor relied on it. The
misconfiguration shipped, sat silent, and surfaced one feature at a time as things failed to work.

That third layer is a pattern, not a one-off. cairn has hit a recurring class of Cloudflare setup
pitfalls, each found the hard way through a separate broken behavior:

- Email Sending domain not onboarded (this finding).
- HTTPS not forced at the edge, which produces an opaque cross-scheme CSRF 403
  (`docs/cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md`, fixed in `0.34.0`).
- The `csrf: { checkOrigin: false }` disable missing from `svelte.config.js`, which leaves a
  no-`Origin` browser locked out
  (`docs/cairn-dx-feedback-2026-06-08-ecnordic-login-csrf-missing-origin.md`, fixed in `0.35.0`).
- `observability.enabled` not set, which leaves the troubleshooting surface itself dark when a site
  most needs it.

A developer wiring up a cairn site meets these one at a time. This pass turns that into one report at
setup. It keeps cairn Cloudflare-native, with no third-party email provider.

## What was verified and fixed live (2026-06-08)

The diagnosis was confirmed against the Cloudflare account (`glw907`,
`120c269ad6d3dfbe6d63a0bb53758ca0`). Sending-subdomain state at the time:

| Zone | Sending subdomain | State |
| --- | --- | --- |
| `907.life` | `907.life` | enabled |
| `ecnordic.ski` | `ecnordic.ski` | enabled |
| `ecxc.ski` | none | not onboarded |

`ecxc.ski` was onboarded in place (subdomain `ecxc.ski`, return path `cf-bounce.ecxc.ski`, DKIM
selector `cf-bounce`, six DNS records written, status `ready`), which clears the surface fault. The
silent-failure and missing-preflight faults are what this engine pass addresses.

## Decisions locked in brainstorming

- **Cloudflare-native.** Keep `cloudflareSend`. Cloudflare Email Sending delivers to arbitrary
  recipients once the sender domain has an enabled sending subdomain, so the editor model works without
  a second provider. The "verified destination" rule that misled the original finding belongs to Email
  Routing's `message.forward()`, a different call.
- **Relax strict non-leak for editor feedback.** The send path runs only for an allow-listed editor, so
  a send-failure message and a cooldown hint both reveal editor membership. They ride together as one
  posture choice. We accept the narrow leak, which appears only while sending is actively broken, to
  give the non-technical editor an honest signal in place of a permanent "check your email".
- **Detect at setup, not only at login.** The headline cost was the silent afternoon. A login-time
  message helps the next failure. A setup-time preflight stops the misconfiguration from shipping.

## Arm A: runtime observability

### Await the send

Stop backgrounding the magic-link send. The send outcome has to drive the response, so `requestAction`
awaits it. The cost is one email-API round trip on the login POST, which is the right trade for a login
flow. Confirm the link went out before telling someone to check their inbox. The `waitUntil`
backgrounding is removed for this send.

### A typed, additive result

`requestAction` returns a `status` discriminant alongside the existing `sent` boolean. Keeping `sent`
means a site rendering its own login form against `form.sent` is unaffected, so the change is additive.

| Path | Result |
| --- | --- |
| not an editor | `{ status: 'sent', sent: true }` |
| editor, send ok | `{ status: 'sent', sent: true }` |
| editor, send threw | `{ status: 'send_error', sent: false }` |
| editor, in cooldown | `{ status: 'throttled', sent: false }` |

The non-editor and send-ok paths stay byte-identical, so the common case still never leaks. The
`send_error` and `throttled` states are the editor-only signals the relaxed posture accepts.

### Capture the binding error code

Wrap the send in `try`/`catch`. On failure, log `auth.link.send_failed` with both `error: String(err)`
and `code` read from the binding error (`E_SENDER_NOT_VERIFIED`, `E_DELIVERY_FAILED`, and the rest of
the `E_*` set), then return `send_error`. A small `errorCode(err)` helper reads `err.code` when present
and falls back to `undefined`, so a custom injected sender that throws a plain `Error` still logs
cleanly. The next onboarding gap greps straight to its cause.

### LoginPage states

`LoginPage.svelte` gains two states, built on the admin design system
(`docs/internal/admin-design-system.md`). A `send_error` state shows a warning panel reading "We're
having trouble sending sign-in links right now. Please contact the site owner." A `throttled` state
shows a neutral hint reading "You requested a link recently. Check your inbox, or wait a minute and try
again." Both strings are provisional and confirmed at implementation.

The uncommitted confirmation polish already in the working tree (the brand-in-both-states snippet, the
inset note) folds into this rewrite, since these states share the same markup. The throwaway
`examples/showcase/src/routes/_login-preview/` route helps eyeball the states during implementation and
is deleted before the pass ships.

## Arm B: the environment preflight (`cairn doctor`)

### The contract

`cairn doctor` runs every check, accumulates the results, and prints one pass/fail table with a
remediation line for each failure. It never stops at the first problem. A developer reads the whole
environment in one report and fixes the gaps together, rather than discovering them one broken feature
at a time. The command exits non-zero when any check fails, so a site can wire it into CI and the
scaffolder can generate that wiring.

It is a new bin, a sibling to the existing `cairn-manifest` bin. A runtime diagnostic route was
considered and rejected for this pass. It would sit behind the magic-link login, which is unreachable
exactly when email is the broken thing, and it would add a guarded runtime surface to secure. The CLI
runs before deploy, needs no working email or auth, and reuses the Cloudflare and GitHub credentials the
operator already holds.

### Check architecture

Each check is an isolated unit with one shape. It carries a stable `id`, a human `title`, a one-line
`why`, a `run()` that returns `{ status: 'pass' | 'fail' | 'skip', detail }`, and a `remediation`
string shown on failure. No check depends on another check's result. The runner executes all of them,
collects the outcomes, formats the table, and sets the exit code. New checks are added by appending to
the registry, so the surface grows without reworking the runner. The registry is also the source of
truth for the readiness checklist doc described in Arm C, so the tool and the doc cannot drift.

### v1 checks

The set covers every Cloudflare setup pitfall cairn has filed. The checks read three sources: the
site's local config files, the Cloudflare account through its API, and GitHub through the App.

Local config (read the site's files):

- **Bindings.** `send_email` (`EMAIL`) and `AUTH_DB` are declared in the wrangler config.
- **Observability.** `observability.enabled` is `true` in the wrangler config, so Workers Logs has a
  sink when a site needs to troubleshoot.
- **CSRF disable.** `svelte.config.js` carries `csrf: { checkOrigin: false }`, which hands cairn's
  guard the authority and keeps a no-`Origin` browser from a hard 403. This is a heuristic read of a JS
  file, so a miss reports a warning rather than a hard fail.
- **Config.** `site.config.yaml` parses and validates against the existing URL-policy validator, and
  `branding.from` is a syntactically valid address.

Cloudflare account (read through the API):

- **Email deliverability.** The `from` domain has an enabled Cloudflare sending subdomain. On absence,
  the remediation names the command, `wrangler email sending enable <domain>`. When `config.send` is a
  custom non-Cloudflare sender, this check reports `skip`.
- **Force HTTPS.** The zone "Always Use HTTPS" setting is on, so an http request redirects at the edge
  before it reaches the auth POST. This closes the cross-scheme CSRF class that `0.34.0` documented.
- **HSTS.** The zone security-header (HSTS) setting is enabled with a non-trivial `max-age`, so a
  browser upgrades the scheme on its own after the first visit.
- **Auth store.** The `AUTH_DB` D1 database is reachable, the auth schema tables exist, and the editor
  allowlist holds at least one owner. The last item catches the wrong-owner-address confusion (`geoff@`
  versus `geoff-login@`) that compounded the original incident.

GitHub (read through the App):

- **GitHub App.** The private key parses through the PKCS#1-to-PKCS#8 path, the App authenticates, and
  the configured installation and target repository are reachable.

Opt-in:

- **Live send.** `--send-test <addr>` sends one real email through the Email Sending API for end-to-end
  inbox proof, including DKIM alignment and early deliverability. Off by default.

### Credentials and config discovery

The doctor reads the Cloudflare API token and the GitHub App credentials from the environment, the same
values the operator uses for `wrangler` and the commit pipeline. It discovers `branding.from` and the
content config the way the `cairn-manifest` bin already loads site config. The exact loader is an
implementation question for the plan. A check that needs a credential it cannot find reports `skip` with
a remediation naming the missing variable, so a partial environment still yields a useful report.

## Arm C: documentation

- **Correct the stale gotcha.** The `CLAUDE.md` "Durable gotcha (Cloudflare email)" predates the 2025
  Email Service and conflates it with the dead MailChannels path. The rewrite states three facts. The
  per-zone sending subdomain is the real gate. An unrestricted binding reaches any recipient. Routing's
  `message.forward()` is the verified-destination call. The `cloudflare-email-sending-vs-routing` memory
  is updated to match.
- **Write the Cloudflare readiness checklist.** A new `docs/guides/cloudflare-readiness.md` lists every
  pitfall with what it is, why it bites, and the remediation. It mirrors the `cairn doctor` check set
  one-to-one and is generated from, or gated against, the check registry by a new `check:readiness`
  script, the same anti-drift pattern as `check:reference`. The tool and the checklist stay in lockstep.
- **Fold the onboarding step into the deploy guide.** The deploy guide gains an "Onboard your sending
  domain" section with the `wrangler email sending enable <domain>` command, the SPF, DKIM, and
  return-path records it adds, the Workers Paid note, and the exact error strings (`destination address
  is not a verified address`, `E_SENDER_NOT_VERIFIED`). It points at `cairn doctor` and the readiness
  checklist as the pre-launch gate.
- **Reference the new surfaces.** `docs/reference/log-events.md` gains the `code` field on
  `auth.link.send_failed`. The `cairn doctor` bin gets a reference page under `docs/reference/`.
- **Changelog and upgrade guide.** The additive `status` field carries a "Consumers may:" line. The new
  bin and the readiness checklist carry "Consumers may:" lines.

## The non-leak posture change is deliberate and tested

The existing non-leak test asserts an identical response whether or not an email is allow-listed. That
property held for the success path and still does. This pass narrows it on purpose. The test is
rewritten to assert the byte-identical response for the neutral and send-ok paths, and to document that
the `send_error` and `throttled` paths differ by design. Writing the relaxation into the test makes it
explicit and puts it in front of the security reviewer rather than letting it slip in unremarked.

## Testing

- `requestAction`: the four-outcome matrix against a send sink, covering editor present and absent, send
  success and throw, and the cooldown window. Each asserts the right `status` and `sent`.
- `auth.link.send_failed`: a test asserts the record carries `code` when the binding error supplies one.
- `LoginPage.svelte`: a render test per state (`sent`, `send_error`, `throttled`) plus the existing "use
  a different email" return to the form.
- `cairn doctor`: each check is unit-tested against a faked Cloudflare and GitHub surface for its pass,
  fail, and skip branches. The runner is tested for accumulate-all behavior (several failures in one
  report) and the non-zero exit code. The `check:readiness` gate is unit-tested fail-closed against a
  checklist missing a registry entry.

## Security review

The `web-auth-security-reviewer` gate covers this pass. The reviewer confirms the deliberate non-leak
relaxation on the `send_error` and `throttled` paths is the only behavioral leak, confirms that no
token, session id, or magic-link URL reaches the new result fields or log fields, confirms that
`error.code` and `String(err)` cannot transitively carry the GitHub token or the link, and confirms the
`cairn doctor` report renders only presence-and-validity outcomes and never a secret value.

## Out of scope

- A runtime diagnostic self-check inside the deployed Worker, which would verify secret wiring more
  precisely than the CLI can. Noted as a possible future complement.
- Edge rate-limiting of the unauthenticated request route. This stays the existing engine carry-forward.
  The length cap bounds record size, not request volume.
- The `csrf.checkOrigin` deprecation in SvelteKit 2.61
  (`docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`). The doctor checks the current spelling; the
  forward-compatible replacement stays tracked in `ROADMAP.md`.

## Open implementation questions

- How the doctor discovers `branding.from` and the site config. Follow the `cairn-manifest` loader, or
  read what `site.config.yaml` carries and document a convention for the rest.
- Whether the GitHub App check asserts `contents:write` permission specifically, or stops at repo
  reachability. The stronger assertion catches a read-only installation, at the cost of a permissions
  probe.
- Whether the doctor ships all v1 checks at once, or lands the local-config and email checks first and
  grows the registry in a follow-up. The registry shape supports either, so the plan decides the
  sequencing.
