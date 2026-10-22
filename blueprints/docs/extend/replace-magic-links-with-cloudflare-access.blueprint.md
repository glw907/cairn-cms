---
page: Replace magic links with Cloudflare Access
type: task guide
track: ""
exemplar: extenders/sveltekit-hooks
---

# Replace magic links with Cloudflare Access

:::reader
**Who reads it.** - **The organization's site developer** (the core reader). Arrives from the extend README's "Auth
  and access" group, the architecture page's seams table (the `identity` row), the security model's
  auth section, or a search for cairn plus SSO, Google Workspace, Entra, or Cloudflare Access.
  Runs a deployed magic-link site. Wants editors to sign in with the organization's accounts.
  Knows SvelteKit and Wrangler. Lacks: why the default is magic links (what they give up), what
  stays cairn's after the switch (the roster), and where Access sits relative to the Worker.
- **The developer still deciding.** Same arrival paths, earlier in the decision. Needs the costs
  before any step: all editors or none, Zero Trust's free-plan user cap, two admission lists to
  keep in agreement. Staying on magic links is the usual path, and the intro should make that a
  live option.
- **The developer behind another authenticating proxy.** Arrives by search or from the reference's
  `IdentityResolver` entry. Needs to learn the seam is not Cloudflare-specific and which parts of
  the page carry over (the resolver) and which they replace (the Cloudflare steps).
- **Readers whose need is elsewhere.** Someone who only wants a rebranded sign-in email; someone
  adding a second population beside magic-link editors. Each gets a redirect early.
- **The security reviewer.** Wants identity mode's threat analysis, which lives in the security
  model; one sentence routes them.

**Background.** - cairn's default sign-in: an emailed one-time link, no GitHub account, no password
  (f:0ij7do, f:7oxmh4). It is the default so a content site runs with zero config (f:zxdoaf, new),
  because cairn is itself the identity system, with `AUTH_DB` holding roster, sessions, and tokens
  (f:u77pea).
- SvelteKit's place: the guard is a plain `Handle` in the server hooks (f:dwc4kp) gating every
  `/admin` path except sign-in (f:9xthnq).
- Cloudflare's place: the site is a Worker (f:i74t7g); Access is an application in front of it that
  admits by policy and signs in through a connected provider (f:agif8l, f:gw1oas).
- Why replace: editors already hold provider accounts (f:gw1oas). What stays: the roster still
  decides who may edit among those Access lets through (f:k40l86).

**Place in the doc set.** Auth and access group, beside the security model. The architecture page names the `identity`
seam and points here; the security model holds the threat analysis and points here for setup;
add-cairn sets up the magic-link starting state this page requires.

**What the page does for them.** The introduction frames the page from above before it states the task, and it opens on a
statement, never an imperative. First the model the reader leaves: cairn signs editors in by
magic link by default so that a content site runs with zero config, because cairn is itself
the identity system, its `AUTH_DB` holding the roster, the sessions, and the single-use
sign-in tokens; the guard `createAuthGuard` returns is a SvelteKit handle in the server hooks
that gates the `/admin` subtree. Then why a site leaves that default: its editors already hold
Google or Microsoft accounts in the organization's identity provider, and Cloudflare Access,
an application that sits in front of the site's Worker, admits only users who match its
policies and signs them in through that provider. The contract sentence: the page puts an
Access application in front of `/admin` and writes the resolver that turns its token into the
roster email the guard looks up; the roster stays in cairn, so the application decides who
reaches the admin and the roster decides who among them may edit. Then the decision input,
placed before the first heading as the "right tool for the job" callout: setting `identity`
replaces the whole magic-link path, all editors or none, with no token minted and no session
cookie set, and the free Zero Trust plan caps the users who authenticate through Access, the
cap left to Cloudflare's plans page. It names the readers who arrive: the developer switching
an organization's site, the developer still deciding, and the developer behind a different
authenticating reverse proxy, who learns that the seam is not Cloudflare-specific, so the
resolver carries over and the Cloudflare steps are replaced. The figure closes the
introduction. :fact[zxdoaf] :fact[u77pea] :fact[2sd4if] :fact[agif8l] :fact[gw1oas] :fact[8289h7] :fact[k40l86] :fact[v5ndhs] :fact[fhit7f] :fact[4olp4u] :fact[3p8yu8]

**What they already know.** A Svelte-fluent developer who has edited a SvelteKit server hooks file, deployed a Worker with
Wrangler, can query Workers Logs, and can read a JWT verification sample closely enough to own
the code it becomes, with access to the Cloudflare account's Zero Trust settings. The page
explains none of these.

**What it leaves to other pages.** Each out-of-scope subject names its page, subject first: the threat analysis of identity mode
and the risks the gate leaves open (Security model, its identity-mode section); setting up
magic-link sign-in itself, and staying on magic links with a rebranded sign-in email (Add
cairn to a SvelteKit app); and signing a second sign-in group in beside editors who keep magic
links (Add a second sign-in group). A scope sentence may name the page.

**How the introduction runs.** 1. Statement opener: the magic-link default, why it exists (zero config, cairn as identity system),
   and the guard as a SvelteKit handle gating `/admin`.
2. Why replace and how: editors with Workspace or Entra accounts; Access in front of the Worker;
   the contract sentence (Access application plus resolver); the roster stays cairn's; who does
   the work.
3. Decision input kept from the plan (all-or-nothing, the mechanism, the plan cap).
4. Prior knowledge and the three redirects, kept.
5. What the page leaves out, kept.

:::

## Before you begin

- The switch starts from a deployed site that signs editors in by magic link, its first owner already on the roster, the Worker served on a hostname in a Cloudflare zone, and a Cloudflare Zero Trust team with your identity provider connected.
- Magic-link sign-in with the owner/editor pair is cairn's default identity so that a content site runs with zero config, and auth exists only to gate the admin. Key phrase: "so a content site runs with zero config". :fact[zxdoaf]
- Under the zero-config default cairn itself is the identity system for its editors: its own D1 store (`AUTH_DB`) holds the editor allowlist, the sessions, and the single-use sign-in tokens, and a site's own identity gate replaces session resolution only when the site configures one. :fact[u77pea]
- `createAuthGuard({ runtime })` gates the whole `/admin` subtree before any load runs, but does not decide per-route authorization; that is `requireAccess`/`createSectionAction`'s job. :fact[2sd4if]
- Cloudflare Access offers Google and Microsoft among its identity providers, so an editor behind Access can sign in with the organization's Google or Microsoft account. :fact[gw1oas]
- Behind Cloudflare Access, or any reverse proxy that authenticates the request before it reaches the Worker, an editor signs in through the site's own identity gate instead of magic-link: a site sets the guard's `identity` resolver, which replaces session-cookie resolution. :fact[8289h7]
- Configuring `createAuthGuard`'s `identity` option replaces the whole magic-link path; there is no partial adoption where some editors use magic links and others go through the gate. :fact[v5ndhs]
- `createAuthGuard`'s `identity` option replaces the entire built-in sign-in path (no token minted, no session created, no session cookie set); `identity.resolve` reads the gate's own proof of identity and the guard looks the proven email up against the roster, exactly as it looks up a magic-link session's email. :fact[fhit7f]
- The free Cloudflare Zero Trust plan caps the number of users, counted as editors who authenticate through Access rather than by the size of cairn's own roster, so a larger editorial team needs a paid plan; the cap itself is Cloudflare's figure on its plans page. :fact[4olp4u]
- See [https://www.cloudflare.com/plans/zero-trust-services/](https://www.cloudflare.com/plans/zero-trust-services/).
- See [security-model.md#identity-modes-threat-surface](security-model.md#identity-modes-threat-surface).
- See [add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email](add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email).
- See [add-a-second-sign-in-group.md](add-a-second-sign-in-group.md).
- See [../reference/sveltekit.md#createauthguard](../reference/sveltekit.md#createauthguard).
- The introduction's closing figure, a diagram of one request: the browser; the Cloudflare Access application, holding its policies and the AUD tag; the Worker, holding the guard that calls `identity.resolve`, the roster lookup by email, and the admin shell. An `/admin` request passes the application, which forwards the `Cf-Access-Jwt-Assertion` header to the guard, which looks the email up in the roster before the shell opens. A `/preview/<token>` request and a `/healthz` request reach the Worker without passing the application. The accessible description names every node and edge; the caption states only the path and the two uncovered routes, never the two-lists claim.
- The Access application must cover `/admin`, every path beneath it, and `/admin/__data.json` (SvelteKit's data-only fetch); it must not cover `/preview/<token>`, since a preview link's reviewer has no reason to be admitted to `/admin`; Access resolves overlapping application paths from the most specific path outward. :fact[vnm1p5]
- `/healthz` sits at the site root, outside `/admin`, so the auth guard does not gate it: it returns `loadHealth`'s payload `{ ok, checks: { githubAppSigning } }` (plus `githubAppToken` on a `?live=1` request) as JSON with status 200 when `ok` is true and 503 when it is false, catches a thrown error into a 503 with the fixed detail `health check failed` (never the thrown message, since the route is anonymous), sends `cache-control: no-store` on every answer, and exports `prerender = false`; `loadHealth` logs the thrown message as `health.failed` before it rethrows, so the operator still sees it. :fact[paotzb]
- A complete lead-in sentence, then a bulleted list of four preconditions, each with a link to what produces it: a deployed site whose guard signs editors in by magic link; the first owner's row in `AUTH_DB`; a Custom Domain (or route) in a Cloudflare zone serving the Worker; and a Cloudflare Zero Trust team with the organization's identity provider connected.
- See [add-cairn-to-a-sveltekit-app.md](add-cairn-to-a-sveltekit-app.md).
- The first owner must be seeded before enabling `identity`, since nothing in identity mode can bootstrap an owner (the guard never reaches the routes' bootstrap config); seed via `create-cairn-site`'s own method or `wrangler d1 execute` against `AUTH_DB`. :fact[qhmydf]
- See [https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute](https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute).
- A Worker's Wrangler configuration declares a Custom Domain as a `routes` entry whose `pattern` is the hostname and whose `custom_domain` is `true`; `npx wrangler deploy` creates the Custom Domain, and Cloudflare creates its DNS record and certificate, on a hostname inside an active Cloudflare zone. :fact[thgmpz]
- See [https://developers.cloudflare.com/workers/configuration/routing/custom-domains/](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- Cloudflare Access is a self-hosted application layer in front of a Worker: only users who match the application's policies reach it, an application connects to an identity provider, Google Workspace and Microsoft Entra ID each have a dedicated connector, and Cloudflare's own one-time PIN is a separate login method. :fact[agif8l]
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).
- Turn to the roster as the admission list cairn holds, so it comes first.

## Prepare the roster

- The Access application and cairn's roster are two admission lists that never reconcile automatically, and the email string the resolver returns is their only join, so each roster email must match the address your identity provider asserts before identity mode goes live.
- The Access application and the cairn roster are two independent admission lists that never reconcile automatically: the application decides who reaches `/admin` at all, the roster decides who among those may edit. :fact[k40l86]
- Under `identity`, the only join between the gate and the roster is the email string the resolver returns: the guard checks that `resolved.email` is a non-empty string, trims and lowercases it, and looks it up in the roster, with no cross-check of its own, so cairn cannot tell a directory-asserted address from a self-asserted one. :fact[emrebl]
- Before enabling `identity`, every roster row's email must match the primary address the IdP will assert (not an alias), or that editor is refused as unknown the moment the gate goes live; a mismatch is fixed from the roster screen or with `wrangler d1 execute` against `AUTH_DB`. :fact[g0206o]
- To prepare the roster, follow these steps:
1. In the admin's roster screen, compare each editor's email with the primary address your identity provider asserts for that person, not an alias.
2. In the roster screen, or with `wrangler d1 execute` against `AUTH_DB`, correct each email that differs.
- Turn to the other admission list, the Access application's policy.

## Create the Access application

- The guard admits whatever roster email the resolver proves, so the application must cover every admin path, admit every rostered editor, and take each email from a provider the signing-in user does not control.
- Cloudflare Access is a self-hosted application layer in front of a Worker: only users who match the application's policies reach it, an application connects to an identity provider, Google Workspace and Microsoft Entra ID each have a dedicated connector, and Cloudflare's own one-time PIN is a separate login method. :fact[agif8l]
- To create and configure the application, follow these steps:
1. In Zero Trust, create a self-hosted application for the site's hostname, as Cloudflare's self-hosted application guide describes.
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).
1. In the application's paths, cover `/admin`, every path beneath it, and `/admin/__data.json`, and leave `/preview/<token>` uncovered.
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).

:::row
**Symptom.** A signed-out request to `/admin/login` stays on the site's hostname.
**Cause.** The application's paths leave an admin path uncovered, so the request reaches the Worker without the gate's token.
**Fix.** The Access application must cover `/admin`, every path beneath it, and `/admin/__data.json` (SvelteKit's data-only fetch); it must not cover `/preview/<token>`, since a preview link's reviewer has no reason to be admitted to `/admin`; Access resolves overlapping application paths from the most specific path outward. :fact[vnm1p5]
:::

1. In the application's policies, add a policy that admits every editor on the roster, as Cloudflare's policies page describes.
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/policies/](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
- A short paragraph under the step, the one back-reference to the two-lists claim: an editor the policy leaves out stops at Access and never reaches the guard, and a user the policy admits whom the roster lacks reaches the guard, which refuses them as unknown. :fact[agif8l] :fact[k40l86] :fact[hilyos]

:::row
**Symptom.** A rostered editor sees Cloudflare's Access block page instead of the admin.
**Cause.** The application's policy does not admit that editor.
**Fix.** If the editor saw Cloudflare's Access block page, add the editor to the application's policy.
:::

1. In the application's login methods, enable your identity provider and no method whose email claim the signing-in user controls.
- A gate login method whose email the signing-in user controls lets that user sign in to cairn as any roster address they choose to assert: Access takes a user's email from the claim the identity provider returns (`email` by default, or a configured Email claim), and the guard admits whatever email the resolver hands back once it matches a roster row, with no cross-check of how the address was proven. :fact[33upyd]
- See [security-model.md#identity-modes-threat-surface](security-model.md#identity-modes-threat-surface).
1. In the application's CORS settings, leave every setting off.
- Access application CORS settings must stay off, since enabling them can make the `X-Cairn-CSRF` header settable cross-origin, collapsing the CSRF witness the admin guard relies on. :fact[0gltjq]
1. In the application's **Additional settings**, copy the AUD tag.
- Every Access application carries its own AUD tag, a property separate from the application's id (the API's application object lists both `id` and `aud`); the token's `aud` claim names the application the token is valid for, so a verifier validates against the AUD tag, never the id; the tag is copied from the application's Additional settings and never changes unless the application is deleted or recreated. :fact[gs23fb]
1. In Zero Trust, note your team domain, `https://<your-team-name>.cloudflareaccess.com`.
- Cloudflare's Workers sample for validating an Access token sets `TEAM_DOMAIN` to `https://<your-team-name>.cloudflareaccess.com`, builds a key set with `jose.createRemoteJWKSet` over the URL `${TEAM_DOMAIN}/cdn-cgi/access/certs`, reads the token from the `cf-access-jwt-assertion` request header, and calls `jose.jwtVerify(token, JWKS, { issuer: TEAM_DOMAIN, audience: AUD })`, where `AUD` is the application's AUD tag. :fact[s9s8mw]
1. On Cloudflare's session management page, find your team's Access logout address and note it.
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
- From the moment it is saved, the application challenges every request to `/admin` on the site's hostname, magic-link editors included, while the guard behind it keeps signing editors in by magic link until the deploy that switches it to identity. :fact[agif8l] :fact[v5ndhs]
- Turn to the two settings outside the application that can still deliver an admin response around it.

## Close the exposures outside the application

- A cache rule that matches `/admin` and an ungated `workers.dev` hostname each deliver an admin response the application never sees, so close both before the deploy that switches the guard to identity.
- To close both exposures, follow these steps:
1. In the zone's cache rules, remove `/admin` from any rule that matches it. A zone with no such rule skips this step.
- No Cloudflare cache rule may match `/admin` under an identity gate: a cache rule can tell Cloudflare to ignore the origin's `Cache-Control` and cache the response for a set TTL, which would override the engine's own `private, no-store` on every admin response and let one editor's cached page be served to the next matching request. :fact[zt0oag]
- See [https://developers.cloudflare.com/cache/how-to/cache-rules/settings/](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/).
1. In the Worker's Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`.
- Setting `workers_dev: false` alone does not close a preview-URL exposure: Wrangler leaves an existing Version URL setting alone when `preview_urls` is omitted, and when none exists it follows `workers_dev`'s value, so a site that set `preview_urls: true` or toggled Version URLs on in the dashboard still serves `/admin` on an ungated `<alias>-<name>.<subdomain>.workers.dev` hostname unless `preview_urls: false` is also set; an Access application can also be configured to gate those hostnames directly. :fact[51uyqr]
- See [https://developers.cloudflare.com/workers/configuration/previews/](https://developers.cloudflare.com/workers/configuration/previews/).
- Under `identity` the guard's only inputs are what `identity.resolve(event)` returns and the roster lookup of that email; it makes no hostname check of its own, so a hostname that reaches the Worker outside the gate's coverage is admitted whenever the resolver accepts the presented token. :fact[jha9f7]
- Cloudflare's documented origin-side validation of an Access application token is stateless: it checks the signature against the team's `/cdn-cgi/access/certs` keys plus the `iss` and `aud` claims, and the token carries its own `exp`; the documented procedure has no revocation step, so a revocation (a user's logout, a per-user revoke, or an application's revoke of existing tokens) takes effect only where Access sits in the request path, and a token issued before it keeps verifying at an origin that checks it this way until its `exp`. :fact[fe0dyh]
- The Wrangler change is a local edit that takes effect at the deploy in Wire the resolver and deploy the Worker.
- See [#wire-the-resolver-and-deploy-the-worker](#wire-the-resolver-and-deploy-the-worker).
- Turn to the code side, which starts from the three values noted in the application: the team domain, the AUD tag, and the logout address.

## Write the verifier

- The verifier is code you write and own, since cairn ships no OpenID Connect (OIDC) client and does not depend on `jose`, so TypeScript checks the resolver's shape and nothing in cairn checks the verification it performs.
- The verifier code is application code the site writes and owns; cairn ships no OIDC client and does not depend on `jose`, so nothing in cairn typechecks or verifies the recipe's logic. :fact[lyaf6p]
- A verifier for an Access token meets the following requirements:
- An Access-token verifier should read the `Cf-Access-Jwt-Assertion` header, not the `CF_Authorization` cookie: Cloudflare recommends validating the header because the cookie is not guaranteed to be passed, and the cookie is a browser-attached value that can be set by hand. :fact[42fdqq]
- Cloudflare's documented origin-side validation of an Access application token is stateless: it checks the signature against the team's `/cdn-cgi/access/certs` keys plus the `iss` and `aud` claims, and the token carries its own `exp`; the documented procedure has no revocation step, so a revocation (a user's logout, a per-user revoke, or an application's revoke of existing tokens) takes effect only where Access sits in the request path, and a token issued before it keeps verifying at an origin that checks it this way until its `exp`. :fact[fe0dyh]
- The verifier must check `payload.type === 'app'` (an application token, not the `org` global session token) and refuse a token with no `email` claim: Cloudflare documents `type` as `app` or `org`, and a service-token request's token carries `common_name` with an empty `sub` and no email. :fact[zas1dk]
- `ResolvedIdentity` carries an email and an optional advisory `displayName`, never a role: the guard takes the role from the roster row and uses the resolver's display name (capped at 120 characters) only when the roster's is empty; a proven email with no roster row is refused with the unknown-identity page and logged as `auth.identity.unknown` with the normalized email, and adding the row lets the very next request succeed. :fact[hilyos]
- The guard logs an identity refusal at error when its reason is `audience`, `issuer`, `keys`, or `error` (a misconfigured gate that would refuse the whole roster) and at warn for any other reason (`missing`, `invalid`, `expired`, `no_email`, or a site's own word); a resolver that throws is logged at error, and `auth.identity.unknown` is a separate warn event for a proven identity the roster does not recognize. :fact[fu4uis]
- To write the verifier, follow these steps:
1. In the project directory, install `jose` with `npm install jose`.
2. In `src/lib/`, create a config module that exports the team domain, the AUD tag, and the logout address you noted.
- `createAuthGuard` validates `identity.logoutUrl` once, at construction, and throws `cairn: identity.logoutUrl is not a safe redirect target` unless it is a root-relative path with no backslash, control character, or whitespace (checked again after percent-decoding, so `/%2f%2fevil.example` is refused) or an absolute URL whose protocol is exactly `https:`; the shell's logout then redirects to that value. :fact[pwmybh]
- See [../reference/sveltekit.md#createauthguard](../reference/sveltekit.md#createauthguard).
1. In `src/lib/`, create a resolver module that exports an `IdentityResolver` meeting the verifier requirements.
- `identity` takes any `IdentityResolver` (a `resolve` function plus a `logoutUrl`); the seam is not Cloudflare-specific, so a different reverse proxy can implement the same interface. :fact[3p8yu8]
- The resolver module that follows is illustrative, adapted from Cloudflare's Workers sample on its Validate JWTs page, which stays the authoritative reference for the verification. :fact[s9s8mw]
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
- Cloudflare's Workers sample for validating an Access token sets `TEAM_DOMAIN` to `https://<your-team-name>.cloudflareaccess.com`, builds a key set with `jose.createRemoteJWKSet` over the URL `${TEAM_DOMAIN}/cdn-cgi/access/certs`, reads the token from the `cf-access-jwt-assertion` request header, and calls `jose.jwtVerify(token, JWKS, { issuer: TEAM_DOMAIN, audience: AUD })`, where `AUD` is the application's AUD tag. :fact[s9s8mw]
- An illustrative `src/lib/access-identity.ts` implementing the `IdentityResolver` interface, adapted from Cloudflare's Workers sample: imports `createRemoteJWKSet` and `jwtVerify` from `jose`, the `IdentityResolver` type from `@glw907/cairn-cms/sveltekit`, and `audTag`, `logoutUrl`, and `teamDomain` from the config module; builds the key set; a `reasonFor` helper that maps `jose`'s error codes to the refusal reasons the guard logs (`expired`, `audience`, `issuer`, `keys`, `invalid`) and returns `undefined` for any code it does not name; and an exported `accessIdentity` with a `label`, the `logoutUrl`, and a `resolve` that returns `missing` with no header, verifies the token against the issuer and audience, returns `invalid` when `payload.type` is not `app`, returns `no_email` when the email claim is absent or empty, returns `{ ok: true, email }` otherwise, and in its `catch` returns the mapped reason or rethrows a failure the mapping does not name.
- After the sample: it returns the reason its mapping gives and rethrows any other failure, which the guard logs at error, so under the sample the `error` reason means the resolver threw. :fact[fu4uis]
- `IdentityResolver.label` is optional and defaults to "your organization's sign-in"; the guard snapshots it at construction and renders it (HTML-escaped) as the gate's name on the identity-unresolved page, the unknown-identity page, and the login route's hand-off shape, which under `identity` returns only `{ identity: { label } }` in place of the magic-link form. :fact[ojr3qm]
- Turn to the guard, which takes the resolver as one option, and to the deploy that makes the switch.

## Wire the resolver and deploy the Worker

- `createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is set, so the resolver goes in as one more option beside `runtime`, and the deploy that uploads it is the moment identity mode goes live.
- `createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is set, so an identity-mode guard composes with a site's other handles through SvelteKit's `sequence` exactly as the zero-config guard does. :fact[dwc4kp]
- `createAuthGuard(config)` takes a required `runtime`, the composed runtime with no default, and optional `includeSubDomains` and `identity`; it reads the declared role vocabulary (`roles`) from `runtime.roles` and the declared access map (`access`) from `runtime.access`, so a call that passes no `runtime` is a type error. Earlier versions took optional `roles` and `access` options and resolved a bare `createAuthGuard()` against the implicit owner/editor pair; a runtime whose adapter declares no roles still resolves every session that way. :fact[4xrx5f]
- The scaffold's hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if` whose test reads the build-time `__CAIRN_DEV_BUILD__` define directly and then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`, and exports the result as `handle`; both handles take the composed `runtime` the hooks import from `#chassis/cairn.server.js` (`createAuthGuard({ runtime })` and `devBackendHandle({ runtime })`), where earlier versions took optional `roles` and `access` options and a bare `createAuthGuard()` was valid. The opt-in reads the Worker env first and falls back to `process.env`, since `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. :fact[f21bcz]
- A site declares its access map once, as the adapter's `access` member; `composeRuntime` carries it onto the runtime, and `createAuthGuard({ runtime })` attaches `runtime.access ?? {}` to `locals.cairnAccess` on every admin path where it signs an editor in, so there is no second copy to pass to the guard. Earlier versions took the map as a separate `access` option on the guard, and the same `access` value had to be passed to both it and the adapter's `access` member. :fact[iwf4nu]
- `createAuthGuard(config)` takes a required `runtime`, the composed runtime with no default, and optional `includeSubDomains` and `identity`; it reads the declared role vocabulary (`roles`) from `runtime.roles` and the declared access map (`access`) from `runtime.access`, so a call that passes no `runtime` is a type error. Earlier versions took optional `roles` and `access` options and resolved a bare `createAuthGuard()` against the implicit owner/editor pair; a runtime whose adapter declares no roles still resolves every session that way. :fact[4xrx5f]
- See [upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change).
- To turn on identity mode, follow these steps:
1. In `src/hooks.server.ts`, pass the resolver to the production branch's `createAuthGuard` call as its `identity` option, beside `runtime`.
- An illustrative excerpt of the scaffold's hooks file, marked as an excerpt for the snippet check: the import of `accessIdentity` from `#lib/access-identity.js`, and the production branch's `handle = createAuthGuard({ runtime, identity: accessIdentity });`, with the dev-backend branch and the other imports elided and unchanged.

:::row
**Symptom.** `createAuthGuard` throws `cairn: identity.logoutUrl is not a safe redirect target` at construction.
**Cause.** The config module's logout address is neither a root-relative path nor an absolute `https:` URL.
**Fix.** In `src/lib/`, create a config module that exports the team domain, the AUD tag, and the logout address you noted.
:::

1. In the project directory, deploy the site the way you deploy any change.
- See [add-cairn-to-a-sveltekit-app.md#deploy-a-change](add-cairn-to-a-sveltekit-app.md#deploy-a-change).
- After the step: the deploy uploads the hooks option and the Wrangler settings together, and from it on identity mode is live, so an editor whose roster email differs from the provider's primary address is refused as unknown. :fact[g0206o] :fact[51uyqr]
- A lead-in tying the explanation to the deploy: once the deployed guard carries the option, it differs from magic-link mode in the ways the bulleted list that follows names.
- Under `identity` the guard awaits `identity.resolve(event)` on every non-public `/admin` request and keeps no session that caches a verified identity, so whatever verification a resolver performs (a JWT signature check, in the Access recipe) runs once per request, including a request that reaches the Worker without passing the gate; `resolveRateLimit`, exported from `@glw907/cairn-cms/cloudflare`, checks one or several keys against a Workers `RateLimit` binding as best-effort back pressure a site can put in front of that work. :fact[4uqi5r]
- See [../reference/cloudflare.md#resolveratelimit](../reference/cloudflare.md#resolveratelimit).
- Under `identity`, the effective session lifetime moves to the gate (e.g. Cloudflare Access, default 24 hours, configurable up to a month); cairn's own 30-day session constant no longer applies. :fact[2glcaf]
- See [https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
- `logoutAction` reads the session id from either cookie-name form, deletes both name forms (`__Host-` and bare) of the session cookie and of the CSRF cookie, each with its own matching `Secure` flag, and clears this request's pending-login cookie; under `identity` it skips the session-row delete (the `!event.locals.cairnIdentity && id` branch), still clears every cookie, and redirects to the gate's `logoutUrl`. The redirect re-checks the value it reads off `locals.cairnIdentity` against the guard's own `isSafeLogoutUrl` rule and redirects to `/admin/login` when it fails, since `locals` is request state another handle can write after the guard has run. :fact[8xxe3b]
- On Cloudflare Access, a user-initiated logout clears the browser's authorization cookie immediately and previously issued tokens stop being accepted in 20 to 30 seconds; an administrator's manual token revocation locks the user out for up to a minute. :fact[q0icwk]
- Cloudflare's documented origin-side validation of an Access application token is stateless: it checks the signature against the team's `/cdn-cgi/access/certs` keys plus the `iss` and `aud` claims, and the token carries its own `exp`; the documented procedure has no revocation step, so a revocation (a user's logout, a per-user revoke, or an application's revoke of existing tokens) takes effect only where Access sits in the request path, and a token issued before it keeps verifying at an origin that checks it this way until its `exp`. :fact[fe0dyh]
- Turn to checking each of these on the deployed site, from outside.

## Verify the gate

- A working gate admits a rostered editor to `/admin`, sends a signed-out visitor to the gate's hostname, and serves nothing on an ungated hostname, and since no tool checks the last two yet, you check them by hand against the deployed site.
- The npm-era doctor's `--probe` flag and its two arms (a login probe under `identity`, and a `workers.dev` exposure check) retired with the rest of that bin; no tool checks either arm until a later 1.x release of the `cairn` CLI. A site checks both by hand: an unauthenticated `GET` of the primary hostname's `/admin/login`, confirming a redirect lands on the gate's own hostname, and the same `GET` against `<worker-name>.<subdomain>.workers.dev/admin` and the preview alias, watching for any Worker-served response there. :fact[iaqcq6]
- To verify the gate, run these checks in order:
1. From a browser signed in through Access as a rostered editor, open `/admin` on the deployed site. The admin shell opens.

:::row
**Symptom.** The browser shows Cloudflare's Access block page or one of the guard's refusal pages instead of the admin shell.
**Cause.** The application's policy, the roster, or the resolver refused the editor.
**Fix.** See [#resolve-a-refused-sign-in](#resolve-a-refused-sign-in).
:::

1. In the admin, sign out. The browser lands on the gate's logout address.
- `logoutAction` reads the session id from either cookie-name form, deletes both name forms (`__Host-` and bare) of the session cookie and of the CSRF cookie, each with its own matching `Secure` flag, and clears this request's pending-login cookie; under `identity` it skips the session-row delete (the `!event.locals.cairnIdentity && id` branch), still clears every cookie, and redirects to the gate's `logoutUrl`. The redirect re-checks the value it reads off `locals.cairnIdentity` against the guard's own `isSafeLogoutUrl` rule and redirects to `/admin/login` when it fails, since `locals` is request state another handle can write after the guard has run. :fact[8xxe3b]

:::row
**Symptom.** After sign-out, the browser lands somewhere other than the gate's logout address.
**Cause.** The config module exports a different logout address.
**Fix.** In `src/lib/`, create a config module that exports the team domain, the AUD tag, and the logout address you noted.
:::

1. From a signed-out client, send an unauthenticated `GET` to `/admin/login` on the primary hostname. The redirect lands on the gate's hostname.

:::row
**Symptom.** The redirect stays on the site's hostname.
**Cause.** The application's paths do not cover `/admin/login`.
**Fix.** In the application's paths, cover `/admin`, every path beneath it, and `/admin/__data.json`, and leave `/preview/<token>` uncovered.
:::

1. From the same client, send an unauthenticated `GET` to `/admin` on `<worker-name>.<subdomain>.workers.dev` and on each preview URL. No response comes from the Worker.

:::row
**Symptom.** The Worker answers on the `workers.dev` hostname or on a preview URL.
**Cause.** The deployed Wrangler configuration leaves `workers_dev` or `preview_urls` on.
**Fix.** In the Worker's Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`.
:::

- Turn a refused sign-in in the first checks over to the failure path, which reads the records the guard left or recognizes a refusal that left none.

## Resolve a refused sign-in

- The guard shows the identity-unresolved page when the resolver refuses or throws and the unknown-identity page when a proven email matches no roster row, each leaving one log record that names the cause, while a refusal at Access never reaches the Worker and leaves none.
- `ResolvedIdentity` carries an email and an optional advisory `displayName`, never a role: the guard takes the role from the roster row and uses the resolver's display name (capped at 120 characters) only when the roster's is empty; a proven email with no roster row is refused with the unknown-identity page and logged as `auth.identity.unknown` with the normalized email, and adding the row lets the very next request succeed. :fact[hilyos]
- Condition `auth.identity-unresolved` (blocker): under a guard configured with `identity`, the site's identity gate refused the request or threw while resolving it, so cairn never learned who is asking and cannot start a session; the fix is to sign in through the gate again and, if it recurs, ask whoever runs the site to check the gate configuration and the guard logs (the `detail` of the `guard.refused` record, `reason: identity`). No tool check raises it. :fact[sbv5xj]
- See [../reference/log-events.md](../reference/log-events.md).
- To find why an editor was refused, run these checks in order:
1. If the refused request was a sign-out from a tab left open, sign in through the gate again.
- The shell's logout posts to the bare `/admin`, a guarded path, so under `identity` the guard must resolve an identity before `logoutAction` runs: a stale tab whose gate session already ended is refused with the identity-unresolved page. :fact[ig5pn3]
1. If the editor saw Cloudflare's Access block page, add the editor to the application's policy.
- Under the step: that request never reached the Worker, so it left neither of the guard's records. :fact[agif8l] :fact[k40l86]
1. Otherwise, in Workers Logs, look for an `auth.identity.unknown` record from the refused request.
- `auth.identity.unknown`'s `email` is the identity gate's confirmed address, normalized and capped the same way as `auth.link.requested`, but it is logged AFTER the allow-list lookup fails, inside the `if (!row)` branch once `findEditor` has already returned null, not before it; every other event's `email` fires only for an allow-listed editor. :fact[mjedcx]
1. If one appears, in the roster screen, add or correct the editor's row so its email matches the record's `email` field.
- `ResolvedIdentity` carries an email and an optional advisory `displayName`, never a role: the guard takes the role from the roster row and uses the resolver's display name (capped at 120 characters) only when the roster's is empty; a proven email with no roster row is refused with the unknown-identity page and logged as `auth.identity.unknown` with the normalized email, and adding the row lets the very next request succeed. :fact[hilyos]
1. Otherwise, read the reason in the `detail` field of the request's `guard.refused` record with `reason: identity`.
- The guard logs an identity refusal at error when its reason is `audience`, `issuer`, `keys`, or `error` (a misconfigured gate that would refuse the whole roster) and at warn for any other reason (`missing`, `invalid`, `expired`, `no_email`, or a site's own word); a resolver that throws is logged at error, and `auth.identity.unknown` is a separate warn event for a proven identity the roster does not recognize. :fact[fu4uis]
1. If the reason is `audience`, compare the AUD tag in the config module with the one in the application's **Additional settings**.
2. If the reason is `issuer` or `keys`, check the team domain in the config module.
- Cloudflare's Workers sample for validating an Access token sets `TEAM_DOMAIN` to `https://<your-team-name>.cloudflareaccess.com`, builds a key set with `jose.createRemoteJWKSet` over the URL `${TEAM_DOMAIN}/cdn-cgi/access/certs`, reads the token from the `cf-access-jwt-assertion` request header, and calls `jose.jwtVerify(token, JWKS, { issuer: TEAM_DOMAIN, audience: AUD })`, where `AUD` is the application's AUD tag. :fact[s9s8mw]
1. If the reason is `missing`, confirm that the application's paths cover the requested path and that the request arrived on the primary hostname.
2. If the reason is `error`, fix the resolver module, which threw.
3. If the reason is `expired`, have the editor sign in through the gate again.
- Condition `auth.identity-unresolved` (blocker): under a guard configured with `identity`, the site's identity gate refused the request or threw while resolving it, so cairn never learned who is asking and cannot start a session; the fix is to sign in through the gate again and, if it recurs, ask whoever runs the site to check the gate configuration and the guard logs (the `detail` of the `guard.refused` record, `reason: identity`). No tool check raises it. :fact[sbv5xj]
1. If the reason is `invalid` or `no_email`, confirm the request came from an editor's browser rather than a service token, then check the login method.
- The verifier must check `payload.type === 'app'` (an application token, not the `org` global session token) and refuse a token with no `email` claim: Cloudflare documents `type` as `app` or `org`, and a service-token request's token carries `common_name` with an empty `sub` and no email. :fact[zas1dk]
- See [debug-your-site.md#read-the-structured-logs](debug-your-site.md#read-the-structured-logs).

## See also

- The following pages cover the seams and limits around identity mode.
- See [security-model.md#identity-modes-threat-surface](security-model.md#identity-modes-threat-surface).
- See [add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email](add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email).
- See [add-a-second-sign-in-group.md](add-a-second-sign-in-group.md).
- See [restrict-admin-access.md](restrict-admin-access.md).
- See [share-a-draft-preview.md](share-a-draft-preview.md).
- See [../reference/sveltekit.md#createauthguard](../reference/sveltekit.md#createauthguard).
