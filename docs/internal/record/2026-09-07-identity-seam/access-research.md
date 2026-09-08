# Research: a built-in cairn-cms resolver for Cloudflare Access identity

Read-only research for a spec author designing a resolver that verifies a Cloudflare Access JWT
so an admin behind Access (Google Workspace or Microsoft Entra ID as IdP) is identified by email
without cairn minting its own session.

## 1. Validating the Access application token from a Worker

**Where the token lives.**
- Header: `Cf-Access-Jwt-Assertion` on every request Access forwards to the origin/Worker once the
  user has authenticated. This is the "application token."
- Cookie: `CF_Authorization`, set on the protected domain. Access issues **two** distinct
  `CF_Authorization` tokens: a *global session token* scoped to the team domain
  (`<team-name>.cloudflareaccess.com`, avoids re-login across apps) and an *application token*
  scoped to the protected domain itself, which is what a Worker validates.
  - [Authorization cookie](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/)
  - [Application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)

**JWKS / verification.**
- JWKS endpoint: `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/certs`.
- Signing algorithm: RS256 (asymmetric RSA; Cloudflare's own Workers example and the `jose`
  library default assume RS256, Access does not document an alternate algorithm for its own
  application tokens; RS256 is what every worked example verifies against).
- Required claim checks, per Cloudflare's own Workers example and the token field reference:
  - `aud` must equal the Access application's AUD tag (`POLICY_AUD` in Cloudflare's sample).
  - `iss` must equal the team domain (`https://<team-name>.cloudflareaccess.com`).
  - `exp` / `nbf` are standard JWT claims Access issues and any JWT library checks by default
    (`jose`'s `jwtVerify` enforces `exp`/`nbf` automatically once `issuer`/`audience` are passed).
  - Cloudflare's own API Shield JWT-validation docs (a different validation surface, see below)
    document Cloudflare-side clock-skew tolerance of 60 seconds on `exp`/`nbf` checks, useful
    context even though Access application-token validation happens Worker-side, not via API
    Shield.
- Key rotation cadence: not stated as a fixed schedule in the docs surfaced; standard practice
  (and what `createRemoteJWKSet` from `jose` is built for) is to cache the JWKS response and
  re-fetch on a `kid` miss or on a caching TTL, never hard-code keys. `jose`'s `createRemoteJWKSet`
  handles this caching/refetch behavior internally.
  - [One-click Access for Workers changelog (JWKS + jose example)](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/)
  - [`http.request.jwt.claims.aud`](https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.jwt.claims.aud/)

**Claims carried in the token.**
- Application-token claims (from the [Application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/) reference):
  `type` (`app` or `org`), `aud`, `exp`, `iat`, `iss`, `email`, `sub`, `common_name` (service-token
  client ID when auth was via service token, `sub` is an empty string in that case).
- `identity_nonce` and `country` are documented Access identity fields returned by
  `/cdn-cgi/access/get-identity` (the fuller identity payload), not guaranteed to be inline in the
  compact JWT, see the cookie-size caveat below.
- **Groups (Google groups, Entra/Azure groups, or any IdP group) are never added to the JWT
  automatically.** They only appear if you explicitly configure `groups` as a custom SAML
  attribute or OIDC claim on the IdP integration. Even then, Access trims the token's `custom`
  claim once its serialized size exceeds ~1 KB, dropping later-configured values first, groups
  are usually the biggest contributor, so a user in many groups can silently lose their `groups`
  claim while others keep it. **Do not rely on custom claims (including groups) in the JWT for
  authorization decisions that must be reliable; call `/cdn-cgi/access/get-identity` instead for
  the full identity, including all groups.**
  - [Application token, custom claims and user identity](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)

## 2. Recommended verification code shape, and pitfalls

**Cloudflare's own canonical example uses `jose`** (`jwtVerify` + `createRemoteJWKSet`), not
`@tsndr/cloudflare-worker-jwt` and not raw Web Crypto. This is repeated verbatim across three
Cloudflare doc surfaces (Workers changelog, the one-click Access-for-Workers changelog, and the
general product changelog):

```javascript
import { jwtVerify, createRemoteJWKSet } from "jose";

export default {
  async fetch(request, env, ctx) {
    if (!env.POLICY_AUD) {
      return new Response("Missing required audience", { status: 403 });
    }
    const token = request.headers.get("cf-access-jwt-assertion");
    if (!token) {
      return new Response("Missing required CF Access JWT", { status: 403 });
    }
    try {
      const JWKS = createRemoteJWKSet(new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`));
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.TEAM_DOMAIN,
        audience: env.POLICY_AUD,
      });
      return new Response(`Hello ${payload.email || "authenticated user"}!`);
    } catch (error) {
      return new Response(`Invalid token: ${error.message}`, { status: 403 });
    }
  },
};
```
Required env vars: `POLICY_AUD` (the application's AUD tag) and `TEAM_DOMAIN`
(`https://<team-name>.cloudflareaccess.com`).
- [Changelog: one-click Access for Workers](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/)
- [Changelog: Workers product #6](https://developers.cloudflare.com/changelog/product/workers/6/)

**A newer, no-manual-JWT-verification path exists (as of the Aug 2026 "Protect a Worker" and
"one-click Access" features):** when Access is enabled directly on a Worker (Worker-level or
account-level protection, or a self-hosted app targeting the Worker by name via the `worker` /
`preview_worker` destination types), the runtime exposes `ctx.access` and Access verification is
done by the platform before the Worker even runs, no `jose`, no manual JWKS fetch:

```javascript
export default {
  async fetch(request, env, ctx) {
    if (!ctx.access) {
      return new Response("Not authenticated", { status: 403 });
    }
    const identity = await ctx.access.getIdentity();
    const email = identity?.email ?? "unknown";
    return new Response(`Hello, ${email}`);
  },
};
```
This is also testable locally with `wrangler dev` via a `wrangler.jsonc` `access.dev` block
(`{ "access": { "dev": { "aud": "my-app", "identity": { "email": "admin@example.com" } } } }`).
This `ctx.access` path is Workers-native (not documented as available for hostname/path-based
Access, which is what cairn would need for gating only `/admin/*` on a site that also serves
public pages under the same Worker, see §4). For that shape, manual `jose` verification of the
header remains the documented approach.
- [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Changelog: `ctx.access`/`getIdentity()`](https://developers.cloudflare.com/changelog/post/2026-08-14-workers-access/)

**Pitfalls documented by Cloudflare:**
- **Verify on every request, never trust the header's mere presence.** Cloudflare's own copy
  frames this as "to fully secure your application, it is important that you validate the JWT" , 
  i.e., an application must not assume a request reaching it came through Access; the header/
  cookie must be cryptographically checked every time, since nothing stops a request from
  reaching the origin directly if the origin has any other route not gated by Access.
- **"Protect the origin" for a traditional origin (not applicable the same way for a Worker):**
  Cloudflare's general origin-protection guidance (for zones with an origin server) is to
  allowlist Cloudflare's published IP ranges at the origin firewall so nothing reaches the origin
  except through Cloudflare's proxy, optionally hardened further with Authenticated Origin Pulls
  (mTLS) or the Aegis product. This class of "someone hits my server directly, bypassing Access"
  risk does not apply the same way to a Worker (a Worker has no separate origin IP to protect),
  but the *equivalent* risk for a Worker is an unprotected route/hostname on the same Worker: see
  §4's Access hierarchy, a Worker can have multiple overlapping Access rules (hostname/path,
  Worker-level, account-level), and removing the more specific rule silently falls back to
  whichever broader rule (or none) remains, which is why the JWT should still be checked in code
  even under Worker-level Access, not just configured in Access as a gate.
  - [Protect your origin server](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/)
  - [Cloudflare Access for Workers, Access hierarchy](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- **Service tokens vs. user identity:** service tokens (`CF-Access-Client-Id` /
  `CF-Access-Client-Secret` headers) are for machine-to-machine access with **no user identity** , 
  the application token's `sub` is an empty string and `common_name` carries the service token's
  client ID instead of a user email. Service tokens require a distinct "Service Auth" policy
  action; they are the wrong mechanism for identifying a human editor by email, but relevant if
  cairn ever needs a CI/script path into an Access-gated admin API.
  - [Application token fields](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
  - [Managed OAuth vs. service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/)
- **Logout:** visiting `<app-domain>/cdn-cgi/access/logout` (or
  `<team-name>.cloudflareaccess.com/cdn-cgi/access/logout`) revokes the user's Access session
  across all applications; the app-domain variant clears the cookie from that domain immediately
  (feels instant), the team-domain variant also works but clears the global session cookie.
  Previously issued tokens stop being accepted within 20-30 seconds either way, so a
  logout link/button in cairn's admin should target `/cdn-cgi/access/logout` on the admin's own
  domain for a snappier UX, and the app cannot assume the JWT is invalid instantaneously.
  - [Session management, Log out as a user](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- **`/cdn-cgi/access/get-identity`:** send the `CF_Authorization` cookie value to
  `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/get-identity` to retrieve the **full**
  identity (email, name, and, crucially, all IdP groups uncapped by the JWT's ~1 KB `custom`
  claim trim). This is the reliable way to get Google/Entra group membership for authorization
  decisions, rather than trusting the compact JWT's `custom` claim.
  - [get-identity usage example](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
  - [Worked device-posture Worker example using get-identity](https://developers.cloudflare.com/cloudflare-one/tutorials/extend-sso-with-workers/)

There is a **separate, unrelated JWT-validation surface**: API Shield's zone-wide JWT validation
(`http.request.jwt.claims.*` fields, WAF custom rules, `is_jwt_valid()`). This is a Cloudflare
Enterprise-plan-plus-add-on feature for validating arbitrary JWTs (not specific to Access
application tokens) at the WAF layer, and is a different mechanism from validating an Access
application token in Worker code. Cloudflare's docs cross-link the two but they solve different
problems, worth flagging so the spec author doesn't conflate "Cloudflare validates my JWT for
me" (API Shield, Enterprise-gated) with "I validate the Access JWT myself in the Worker" (the
`jose`/`ctx.access` approaches above, available on any plan tier for the Access side).
- [API Shield JWT validation](https://developers.cloudflare.com/api-shield/security/jwt-validation/)

## 3. Access with Google Workspace and Microsoft Entra ID as IdPs

**Microsoft Entra ID (Microsoft 365), documented in detail:**
1. In Entra admin center: **Applications → Enterprise applications → New application → Create
   your own application** (register an app to integrate with Entra ID; do not pick a gallery app).
2. Redirect URI (Web platform): `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`.
3. Copy the **Application (client) ID** and **Directory (tenant) ID**.
4. Add a client secret (**Client credentials → Add a certificate or secret**), noting its
   expiration (a durable gotcha: expired secret silently breaks login).
5. Grant delegated Microsoft Graph API permissions: `email`, `offline_access`, `openid`,
   `profile`, `User.Read`, `Directory.Read.All`, `GroupMember.Read.All`, then **Grant admin
   consent**.
6. In Cloudflare: **Zero Trust → Integrations → Identity providers → Add new identity provider →
   Azure AD**, paste client ID/secret/tenant ID, optionally enable **Support Groups** (required
   before any Entra group appears as an Access policy selector) and **Enable SCIM** for group
   sync/user deprovisioning.
7. Groups then appear automatically as the "Azure Groups" selector in the Access policy builder
   once SCIM is on; without SCIM, a group can still be referenced manually by its Entra `Object
   Id` (not its display name) provided **Support Groups** is enabled.
- [Microsoft Entra ID integration](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/entra-id/)

**Google Workspace:** the docs surfaced here do not expose a distinct, dedicated "Google
Workspace" walkthrough page separate from Cloudflare's generic OIDC connector; Cloudflare's own
Terraform/API examples for generic OIDC use Google's endpoints directly
(`auth_url: https://accounts.google.com/o/oauth2/auth`, `token_url:
https://accounts.google.com/o/oauth2/token`, `certs_url:
https://www.googleapis.com/oauth2/v3/certs`), i.e., Google Workspace is set up as a generic OIDC
IdP: create an OAuth client in Google Cloud Console, set the authorized redirect URI to
`https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`, then add it in Cloudflare via
**Zero Trust → Integrations → Identity providers → OpenID Connect**. The Access policy engine
does list **Google** among the IdPs whose groups can appear as an "Identity provider group"
selector (alongside Entra ID, GitHub, Okta, and any SCIM-provisioning IdP), implying Cloudflare
does have IdP-group support for Google specifically, but the setup mechanics for that (a distinct
"Google" IdP type vs. generic OIDC) weren't found verbatim in the pages retrieved, worth a
direct dashboard check ("Add new identity provider" list includes a native "Google" option
historically) before the spec finalizes wording. Flagging this as the one area where docs
retrieval was inconclusive.
- [Generic OIDC integration (Google example config)](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/)
- [Access policies, Identity provider group selector](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)

**Free-tier seat limit:** confirmed at **50 users** on the Zero Trust Free plan (web search,
Cloudflare's own pricing/marketing pages, not the developer docs corpus indexed by the MCP tool).
Beyond 50 active seats, additional users attempting to authenticate are blocked until upgrading to
the pay-as-you-go tier (quoted at $7/user/month with no user cap). This is exactly the ceiling a
nonprofit admin persona (the cairn spec's target) would size against, a small board/staff of
admins fits free; a broader open-editor pool might not.
- [Cloudflare Zero Trust Pricing Breakdown (controld.com)](https://controld.com/blog/cloudflare-zero-trust-pricing/)
- [Is Cloudflare Zero Trust Free? Free Plan Limits & Upgrade Triggers (costbench.com)](https://costbench.com/software/business-vpn/cloudflare-zero-trust/free-plan/)
- [Cloudflare Zero Trust Pricing 2026 (zerotrustcost.com)](https://zerotrustcost.com/cloudflare-zero-trust-pricing)
- Recommend re-verifying against `cloudflare.com/plans/zero-trust-services/` or the account's own
  billing page before the spec cites the number as load-bearing, since none of these are
  developers.cloudflare.com and pricing pages drift.

**Restricting policies by email domain or group:** yes, confirmed. Access policies are built from
four parts, action (Allow/Block/Bypass/Service Auth), rule type (Include/Require/Exclude),
selector, and value. Documented selectors directly relevant here: **Emails ending in** (domain
match, e.g. `@example.com`), **Identity provider group** (Entra/Google/Okta/GitHub/SCIM groups),
plus country, IP range, and more. A worked example combines them: `Allow / Include / Emails
ending in / @example.com`.
- [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Self-hosted app example with `email_domain` policy via API](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)

## 4. Wrangler/Workers side: gating only `/admin/*`

**Yes, this is a first-class, documented pattern**, and directly matches cairn's shape (one
Worker serving both public pages and a gated `/admin`):

> "Use hostname-based Access when only a specific URL that routes to your Worker should require
> sign-in, such as a `workers.dev` hostname, a Custom Domain, a subdomain, or a path.
> Hostname-based Access protects only that exact URL, whereas protecting a Worker protects the
> entire Worker regardless of how it is accessed. ... you can protect ... a single path such as
> `example.com/login` to make only part of your Worker private."

Mechanically: create a **self-hosted application** whose application domain is the path, e.g.
`example.com/admin*` (see [Application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
for wildcard/subpath matching rules), either via dashboard (**Zero Trust → Access → Applications**)
or API:
```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps" \
  --request POST --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --json '{
    "type": "self_hosted",
    "name": "Access for my-worker admin",
    "domain": "example.com/admin",
    "policies": [{"decision":"allow","include":[{"email_domain":{"domain":"example.com"}}]}]
  }'
```
(the exact `domain` field usage for a path is per the self-hosted-application docs; the account
also supports `worker`/`preview_worker` destination types to gate an entire Worker by name rather
than by hostname/path, not what cairn wants here, since that would gate the public pages too).

**Access hierarchy when multiple rules could apply** (most specific wins):
1. Hostname- or path-based Access (e.g., `admin.example.com` or `example.com/admin`).
2. Worker-level Access (the whole Worker, all its routes/domains/previews).
3. Account-level Access (fallback for all Workers).
Removing a more specific rule can silently expose the underlying broader rule (or no rule) , 
worth calling out as an operational gotcha for cairn's docs: an admin must delete/disable the
`/admin` path app deliberately, and check nothing else already grants broader access.

**Does the JWT header reach the Worker only on gated paths?** Yes, implicitly: since a
hostname/path self-hosted application "protects only that exact URL," Access only intercepts and
attaches the `Cf-Access-Jwt-Assertion` header / `CF_Authorization` cookie for requests matching
that path. Requests to public paths on the same Worker/domain are not proxied through an Access
challenge and will not carry a (valid) Access JWT, cairn's resolver should treat the header's
absence on non-`/admin` routes as expected, not an error, and should never gate a public route on
"header present" without also checking `/admin` path context.
- [Cloudflare Access for Workers, Protect a specific hostname, Custom Domain, or path](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Choose application type, self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/)
- [Application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)

**Wrangler-specific note:** if the Worker (or its bindings) is itself Access-protected, `wrangler
dev`'s remote-binding connections need to authenticate against Access too, interactively via
`cloudflared access login` when the policy allows user login, or via an Access **service token**
(`CF-Access-Client-Id`/`Secret`) in CI/non-interactive environments where the policy is
service-token-only. Also useful: the `wrangler.jsonc` `access.dev` block lets local dev simulate
an authenticated (or unauthenticated) identity without deploying, covering both the `ctx.access`
Worker-native path and general local-testing needs.
- [Local development, Connect to Access-protected Workers](https://developers.cloudflare.com/workers/local-development/)

## 5. Interaction between Access and a public + gated-`/admin` site

This is exactly what §4's hostname/path self-hosted application and Access-hierarchy sections
cover: Cloudflare's own guidance frames "protect a specific hostname/path" as the mechanism for
"mak[ing] only part of your Worker private," explicitly contrasting it with protecting the whole
Worker. No other doc surfaced a dedicated "public + gated subpath" tutorial beyond that
guidance, but the mechanism is first-class and exactly matches cairn's shape (a SvelteKit site
serving public pages plus `/admin`). One caveat worth carrying into the spec: **CORS preflight
(OPTIONS) requests to an Access-protected path always get a 403** from Access itself, regardless
of login state, because browsers never send cookies on OPTIONS requests, if cairn's `/admin`
ever needs to be called cross-origin (unlikely for a same-origin editor UI, but worth flagging),
the fix is either bypassing OPTIONS to origin in the Access app's CORS settings or handling
preflight before Access via a Worker.
- [CORS and Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/)

## cairn-family showcase: is any site already behind Access?

From `~/.claude/docs/cloudflare-estate-inventory.md` (workstation-wide Cloudflare inventory,
values-free by rule):

- **Yes: `aksailingclub-org` (ASC) is Access-protected**, with these Access apps recorded:
  **ASC CMS Admin** (`dev.aksailingclub.org/admin`), **ASC Staging**, **ASC Handbook** (+ its CMS),
  **Ops Dashboard** (ops + staging), and the **Ops Schema API** (deliberately left public/
  unlocked since the handbook consumes it cross-origin).
- This is precisely cairn's own shape: `ASC CMS Admin` gates `/admin` on the `dev.aksailingclub.org`
  Worker while the rest of the site (and the schema API) stays public, an existing, live worked
  example of §4's "protect a specific path" pattern, on the same account cairn's spec author would
  provision against.
- **Access credentials, values-free (per the inventory doc):** a **service token** exists for
  reaching Access-protected ASC sites non-interactively, `ASC_ACCESS_CLIENT_ID` /
  `ASC_ACCESS_CLIENT_SECRET` in `~/.local/secrets`, sent as `CF-Access-Client-Id` /
  `CF-Access-Client-Secret` headers. The full recipe (including the actual team domain and AUD
  tag for the ASC CMS Admin app) is recorded in a separate `asc-cloudflare-access` project memory
  that was not retrievable as a plain file from this research pass (no such file exists on disk
  under `~/.claude`; it is presumably an agent-memory entry scoped to another project's session,
  not something this read-only pass could open). **The spec author should ask Geoff, or a fresh
  session in the `aksailingclub-org`/`aksailingclub-legacy` repo, to surface the ASC CMS Admin
  app's team domain and AUD tag directly** (e.g., `cloudflare-bindings` MCP tools, or `curl
  .../access/apps` with the account's Cloudflare Admin token) rather than treating this report as
  having confirmed those specific values.
- One value IS confirmed generically: the account's single "Cloudflare Admin" API token
  (`~/.local/secrets`, `CLOUDFLARE_API_TOKEN`) has **Access apps/policies** and **Access service
  tokens** scopes granted and verified, so provisioning a new Access application (e.g., a cairn
  `/admin` gate on ecxc-ski or 907-life) via the API is already unblocked, no new token needed.

## Design-constraining facts (summary, also delivered inline above)

1. Verification target: `Cf-Access-Jwt-Assertion` header (or `CF_Authorization` cookie) → RS256
   JWT → verify against `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` (JWKS), issuer
   = team domain, audience = the app's AUD tag. Cloudflare's own canonical example uses `jose`
   (`jwtVerify` + `createRemoteJWKSet`), which also handles JWKS caching/rotation transparently.
2. Email is a first-class claim (`payload.email`); IdP groups (Google or Entra) are NOT reliably
   in the JWT, they're opt-in custom claims capped at ~1 KB and silently truncated, so a
   groups-based authorization feature must call `/cdn-cgi/access/get-identity` instead of trusting
   the JWT.
3. A newer `ctx.access` / `ctx.access.getIdentity()` runtime API exists for Workers with
   platform-level Access protection (Worker-level/account-level/`worker`-destination apps), no
   `jose` needed, but it is not documented for hostname/path-based Access, which is the shape
   cairn needs (public site + gated `/admin` path on one Worker), so manual JWT verification is
   still the applicable path for cairn's actual deployment shape.
4. Gating only `/admin/*` on an otherwise-public Worker is fully supported via a self-hosted Access
   application scoped to that path; Access only attaches the JWT/cookie on matching requests, so
   public routes never see the header and don't need Access-aware logic.
5. Logout is `<domain>/cdn-cgi/access/logout` (session revoked account-wide, tokens stop working in
   20-30s, not instantly).
6. Free-tier Zero Trust caps at 50 users (web-sourced, re-verify before treating as load-bearing);
   paid is $7/user/month uncapped.
7. Google Workspace is wired as a generic-OIDC IdP (Google's own OAuth endpoints); Entra ID has a
   dedicated, fully documented native connector requiring specific Graph API delegated permissions
   and admin consent. Both support policies scoped by email domain or IdP group.
8. `aksailingclub-org`'s "ASC CMS Admin" app is a live, working example of exactly this pattern on
   the account cairn would provision against, reuse it as the showcase, but its specific team
   domain/AUD/service-token values need to be pulled fresh from that project, not assumed from this
   pass.
9. Service tokens (machine identity, no user) are a distinct mechanism from user Access sessions;
   don't conflate them when the spec discusses non-interactive access to a gated `/admin` API.
10. A separate, Enterprise-gated Cloudflare feature (API Shield JWT validation) also validates
    JWTs zone-wide via WAF rules, unrelated to, and not a substitute for, in-Worker Access-JWT
    verification; worth a one-line disambiguation in the spec so readers don't conflate the two.
