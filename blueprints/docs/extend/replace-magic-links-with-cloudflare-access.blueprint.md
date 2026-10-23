---
page: Replace magic links with Cloudflare Access
type: task guide
track: extend
exemplar: extenders/sveltekit-hooks
---

# Replace magic links with Cloudflare Access

:::reader
**Who reads it.** A Svelte-fluent developer who runs a deployed cairn site whose editors sign in by magic link, and who wants those editors to sign in with the organization's Google Workspace or Microsoft Entra ID accounts instead. They work in the site's code and in the Cloudflare account's Zero Trust settings. :fact[agif8l]

**Why they arrive:**
- Their organization already holds every editor's account in an identity provider, and they want the admin behind it. :fact[agif8l]
- They are still deciding whether to switch, and need the costs before any step: every editor moves or none does, and the free Zero Trust plan caps the users who sign in through Access. :fact[v5ndhs] :fact[4olp4u]
- Their site sits behind a different authenticating reverse proxy, and they want to know which part of the page carries over. The guard's `identity` option takes any `IdentityResolver`, so the seam and the hooks wiring carry over. The page's resolver, which verifies a Cloudflare Access token, and the Cloudflare steps are replaced by that proxy's own. :fact[3p8yu8]

**What they already know.** They have edited a SvelteKit server hooks file, deployed a Worker with Wrangler, and read Workers Logs, and they can read a JWT verification sample closely enough to own the code it becomes. The page explains none of these.

**Background.** By default cairn is the identity system for its editors: an editor enters an email address, receives a one-time link, and reaches the admin with no GitHub account and no password, and the `AUTH_DB` store holds the roster, the sessions, and the single-use sign-in tokens. :fact[7oxmh4] :fact[u77pea]
The guard that `createAuthGuard` returns is a plain SvelteKit `Handle` in the server hooks, and it gates every `/admin` path except the sign-in page and the magic-link confirm page. :fact[dwc4kp] :fact[j5v0gn]
Cloudflare Access puts an application in front of the site's Worker that admits only users who match its policies and signs them in through a connected identity provider. :fact[agif8l]

**What the page does for them.** The introduction opens on that default and why it exists, then states the task: put an Access application in front of `/admin`, and give the guard a resolver that turns the Access token into the email it looks up in the roster. The roster stays in cairn, so the application decides who reaches the admin and the roster decides who among them may edit. :fact[fhit7f] :fact[k40l86]
Before the first heading, it gives the decision input: setting `identity` replaces the whole magic-link path, with no token minted and no session cookie set, and the free plan's user cap is Cloudflare's figure, linked to its plans page. :fact[v5ndhs] :fact[fhit7f] :fact[4olp4u]
The body then walks the switch in the order the parts depend on each other: the roster, the Access application, the two settings outside it, the verifier, the wiring and deploy, a check of the deployed gate, and the path through a refused sign-in.

**The figure.** A diagram closes the introduction. It shows one `/admin` request passing the Access application's policies, carrying the `Cf-Access-Jwt-Assertion` header to the guard, which calls `identity.resolve` and looks the proven email up in the roster before the admin shell opens. A `/preview/<token>` request and a `/healthz` request reach the Worker without passing the application. :fact[fhit7f] :fact[s9s8mw] :fact[vnm1p5] :fact[paotzb]

**What it leaves to other pages:**
- The threat analysis of identity mode and the risks the gate leaves open, which belong to the security model's identity-mode section.
- Setting up magic-link sign-in itself, and changing only the sign-in email while staying on magic links, which belong to Add cairn to a SvelteKit app.
- Signing in a second sign-in group beside editors who keep magic links, which belongs to Add a second sign-in group.
:::

## Before you begin

*Name what the site and the Cloudflare account must already have before the first step.*

- Before you switch, your site and your Cloudflare account need the following:
- A deployed site whose guard signs editors in by magic link, as Add cairn to a SvelteKit app sets it up.
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- The first owner's row in `AUTH_DB`, seeded by `create-cairn-site` or by `wrangler d1 execute`. Identity mode cannot create that row. :fact[qhmydf]
- See [`wrangler d1 execute`](https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute).
- The Worker served on a Custom Domain inside an active Cloudflare zone, declared as a `routes` entry with `custom_domain: true`. :fact[thgmpz]
- See [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- A Cloudflare Zero Trust team with your identity provider connected, such as Google Workspace or Microsoft Entra ID. :fact[agif8l]
- See [Self-hosted public application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).

## Prepare the roster

*Get every roster email to match the address the identity provider asserts, before anything on Cloudflare changes.*

- Under identity mode the guard trims and lowercases the email the resolver returns and looks it up in the roster with no other check. A roster row at an alias matches nothing. :fact[emrebl] :fact[g0206o]
- To prepare the roster, follow these steps:
1. In the admin's **Editors** screen, signed in as an owner, compare each editor's email with the primary address your identity provider asserts for that person. :fact[9sbf9g] :fact[g0206o]
2. For each address that differs, on the same screen, add the editor at the provider's address with the same role. :fact[9sbf9g]
3. On the same screen, remove the row at the old address. :fact[9sbf9g]
- The screen has no way to edit an email in place, and it refuses to remove the last owner. An owner whose own address differs adds the new owner row first, then removes the old one. :fact[9sbf9g]
- A row can also be corrected with `wrangler d1 execute` against `AUTH_DB`. :fact[g0206o]
- The Access application and the roster are two admission lists that never reconcile on their own: the application decides who reaches `/admin` at all, and the roster decides who among them may edit. The email the resolver returns is their only join. :fact[k40l86] :fact[emrebl]

## Create the Access application

*Walk the reader through every setting inside Zero Trust, ending with the three values the verifier needs.*

- To create and configure the application, follow these steps:
1. In Zero Trust, create a self-hosted application for the site's hostname, as Cloudflare's self-hosted application guide describes. :fact[agif8l]
2. In the application's paths, add `/admin` and `/admin/*`, so it covers `/admin`, every path beneath it, and SvelteKit's `/admin/__data.json` request. :fact[vnm1p5]
- A wildcard path such as `/admin/*` doesn't cover its parent, so an application that lists the wildcard lists `/admin` too. A `/preview/<token>` link stays outside the application so a reviewer is never sent through Access. :fact[vnm1p5]
- See [Application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).
3. In the application's policies, add a policy that admits every editor on the roster. :fact[agif8l]
- An editor the policy leaves out stops at Access and never reaches the guard. A user the policy admits but the roster lacks reaches the guard, which refuses them as unknown. :fact[k40l86] :fact[hilyos]
- See [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
4. In the application's login methods, enable your identity provider and no method whose email the signing-in user controls. :fact[33upyd]
- Access takes the email from the claim the provider returns, and the guard admits any roster address the resolver hands back. A method that lets a user choose the email lets that user sign in as any editor. :fact[33upyd]
- See [Identity mode's threat surface](security-model.md#identity-modes-threat-surface).
5. In the application's CORS settings, leave every setting off. :fact[0gltjq]
- Enabling them can make the `X-Cairn-CSRF` header settable cross-origin. That defeats the CSRF check the guard runs on that header. :fact[0gltjq]
6. In the application's **Additional settings**, copy the **Application Audience (AUD) Tag**. :fact[gs23fb]
- The verifier checks the token against this tag, never the application's id, and the tag changes only when the application is deleted or recreated. :fact[gs23fb]
7. In Zero Trust, note your team domain, `https://<your-team-name>.cloudflareaccess.com`. :fact[s9s8mw]
8. Note your team's logout address, `<your-team-name>.cloudflareaccess.com/cdn-cgi/access/logout`. :fact[nwkg0d]
- See [Session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
- From the moment it is saved, the application challenges every request to `/admin` on the site's hostname, magic-link editors included. The guard behind it keeps signing editors in by magic link until the deploy that switches it to identity. :fact[agif8l] :fact[v5ndhs]

## Close the exposures outside the application

*Close the two settings outside Zero Trust that can deliver an admin response around the application.*

- To close both before the deploy that switches the guard to identity, follow these steps:
1. In the zone's cache rules, remove `/admin` from any rule that matches it. :fact[zt0oag]
- A cache rule can ignore the origin's `Cache-Control` and cache a response for a set time, which overrides the guard's `private, no-store` on every admin response and can serve one editor's page to the next request. :fact[zt0oag]
- See [Cache rule settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/).
2. In the Worker's Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`. :fact[51uyqr]
- The two keys, shown in a `wrangler.jsonc` fragment beside the rest of the file's settings. :fact[51uyqr]

```jsonc
{
  "workers_dev": false,
  "preview_urls": false
}
```

- With `preview_urls` omitted, Wrangler leaves an existing Version URL setting alone. A site that turned those URLs on then still serves `/admin` on a `workers.dev` hostname that Access doesn't cover. :fact[51uyqr]
- The guard makes no hostname check of its own. It admits a request on such a hostname whenever the resolver accepts its token. :fact[jha9f7]
- The token check at the Worker is stateless, so a token Access has since revoked keeps verifying there until it expires. :fact[fe0dyh]
- The Wrangler edit takes effect at the deploy in the wiring section.
- See [Wire the resolver and deploy the Worker](#wire-the-resolver-and-deploy-the-worker).

## Write the verifier

*State what a verifier must do, then walk the reader through the config and resolver modules that meet it.*

- The verifier is code your site writes and owns. cairn ships no OpenID Connect (OIDC) client and doesn't depend on `jose`. TypeScript checks the resolver's shape, and nothing in cairn checks the verification it performs. :fact[lyaf6p]
- A verifier for an Access token meets the following requirements:
- It reads the `Cf-Access-Jwt-Assertion` header, not the `CF_Authorization` cookie. Cloudflare doesn't guarantee that the cookie is passed. :fact[42fdqq]
- It checks the token's signature against the team's `/cdn-cgi/access/certs` keys, and its `iss` and `aud` claims against the team domain and the AUD tag. :fact[s9s8mw] :fact[fe0dyh]
- It requires the `type` claim to be `app`, which marks an application token and excludes the `org` global session token. :fact[zas1dk]
- It refuses a token with no `email` claim, which also refuses a service token's. :fact[zas1dk]
- It returns the email and, optionally, a display name, never a role: the guard takes the role from the roster row and uses the display name only when the row's is empty. :fact[hilyos]
- Its refusal reason names the failure. The guard logs `audience`, `issuer`, `keys`, and `error` at error, as a misconfigured gate, and every other reason at warn. :fact[fu4uis]
- To write the verifier, follow these steps:
1. In the project directory, install `jose` with `npm install jose`. :fact[vm75ro]
2. In `src/lib/`, create `access-config.ts`, which exports the team domain, the AUD tag, and the logout address you noted. :fact[s9s8mw] :fact[gs23fb] :fact[nwkg0d]
- The config module, with placeholders for the three values. The guard accepts a logout address that is an absolute `https:` URL or a root-relative path. :fact[pwmybh] :fact[nwkg0d]

```ts
// src/lib/access-config.ts
// Your team domain, from Zero Trust.
export const teamDomain = 'https://<your-team-name>.cloudflareaccess.com';
// The application's Application Audience (AUD) Tag, from its Additional settings.
export const audTag = '<your-aud-tag>';
// Access's team logout address.
export const logoutUrl = 'https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/logout';
```

3. In `src/lib/`, create `access-identity.ts`, which exports an `IdentityResolver` that meets the requirements. :fact[3p8yu8]
- The resolver module that follows is illustrative, adapted from Cloudflare's Workers sample on its Validate JWTs page, which stays the authoritative reference for the verification. It maps each `jose` error code it names to a refusal reason the guard logs, and rethrows any failure it doesn't name. :fact[s9s8mw] :fact[vm75ro] :fact[zas1dk] :fact[fu4uis]
- See [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

```ts
// src/lib/access-identity.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IdentityResolver } from '@glw907/cairn-cms/sveltekit';
import { audTag, logoutUrl, teamDomain } from './access-config.js';

const JWKS = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));

// Map each jose error code this sample names to a refusal reason the guard logs.
function reasonFor(err: unknown): string | undefined {
  const { code, claim } = (err ?? {}) as { code?: string; claim?: string };
  switch (code) {
    case 'ERR_JWT_EXPIRED':
      return 'expired';
    case 'ERR_JWT_CLAIM_VALIDATION_FAILED':
      if (claim === 'aud') return 'audience';
      if (claim === 'iss') return 'issuer';
      return 'invalid';
    case 'ERR_JWKS_NO_MATCHING_KEY':
    case 'ERR_JWKS_MULTIPLE_MATCHING_KEYS':
    case 'ERR_JWKS_TIMEOUT':
      return 'keys';
    case 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED':
    case 'ERR_JWT_INVALID':
    case 'ERR_JWS_INVALID':
      return 'invalid';
    default:
      return undefined;
  }
}

export const accessIdentity: IdentityResolver = {
  label: 'Example Org sign-in',
  logoutUrl,
  async resolve(event) {
    const token = event.request.headers.get('cf-access-jwt-assertion');
    if (!token) return { ok: false, reason: 'missing' };
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: teamDomain,
        audience: audTag,
      });
      if (payload.type !== 'app') return { ok: false, reason: 'invalid' };
      if (typeof payload.email !== 'string' || payload.email === '') {
        return { ok: false, reason: 'no_email' };
      }
      return { ok: true, email: payload.email };
    } catch (err) {
      const reason = reasonFor(err);
      // Rethrow a failure the mapping doesn't name, so the guard logs it at error.
      if (reason === undefined) throw err;
      return { ok: false, reason };
    }
  },
};
```

- A failure the sample rethrows reaches the guard as a throw, which it logs at error as a `guard.refused` record whose `detail` is `error`. The record's `error` field holds the thrown message, cut to 300 characters, so under this sample `detail: error` always means the resolver threw. :fact[fu4uis] :fact[zvr7uz]
- The optional `label` names the gate on the sign-in hand-off page and on both refusal pages, and defaults to "your organization's sign-in". :fact[ojr3qm]

## Wire the resolver and deploy the Worker

*Walk the reader through the one hooks change and the deploy that turns identity mode on.*

- `createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is set. The hooks module keeps its shape, and the guard takes the resolver as one more option beside `runtime`. :fact[dwc4kp] :fact[4xrx5f]
- To turn on identity mode, follow these steps:
1. In `src/hooks.server.ts`, pass the resolver to the production branch's `createAuthGuard` call as its `identity` option. :fact[4xrx5f] :fact[f21bcz]
- An excerpt of the scaffold's hooks module, `templates/waymark/src/hooks.server.ts`, showing the import and the production branch's one changed line, with the dev-backend branch and the other imports unchanged. The `#lib/*` specifier resolves to `src/lib/`. :fact[f21bcz] :fact[dez5s3]

```ts
// src/hooks.server.ts (excerpt)
import { accessIdentity } from '#lib/access-identity.js';

handle = createAuthGuard({ runtime, identity: accessIdentity });
```

2. In the project directory, build and deploy the site the way you deploy any change. :fact[9ug9mo]
- See [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change).
- This deploy uploads the hooks option and the Wrangler settings together, and from it on identity mode is live: an editor whose roster email differs from the provider's address is refused as unknown. :fact[g0206o] :fact[51uyqr]

:::row
**Symptom.** The hooks module fails to load, and the error reads `cairn: identity.logoutUrl is not a safe redirect target` followed by the configured value.
**Cause.** `createAuthGuard` checks `identity.logoutUrl` when it is called and throws unless the value is a root-relative path with no backslash, control character, or whitespace, or an absolute URL whose protocol is `https:`. :fact[pwmybh]
**Fix.** In `src/lib/access-config.ts`, set `logoutUrl` to your team's logout address, then deploy again. :fact[pwmybh] :fact[nwkg0d]
:::

- Once deployed, the guard differs from magic-link mode in the following ways:
- It awaits `identity.resolve` on every gated `/admin` request and caches no verified identity. The token check runs once per request. :fact[4uqi5r]
- The Access application's session duration decides how long an editor stays signed in, and cairn's 30-day session no longer applies. :fact[2glcaf]
- See [Session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
- Sign-out skips the session-row delete, clears cairn's session and CSRF cookies and this request's pending sign-in cookie, and redirects to the resolver's `logoutUrl`. :fact[8xxe3b]
- At that address Access ends the editor's session across all its applications, and tokens it issued earlier stop being accepted within 20 to 30 seconds. :fact[q0icwk]
- A sign-out or a revocation takes effect only where Access sits in the request path. The token check at the Worker is stateless. :fact[fe0dyh]
- A handle placed ahead of the guard can limit that per-request work on a best-effort basis with `resolveRateLimit` from `@glw907/cairn-cms/cloudflare`. :fact[4uqi5r]
- See [`resolveRateLimit`](../reference/cloudflare.md#resolveratelimit).

## Verify the gate

*Have the reader check the deployed site by hand: a rostered editor gets in, a signed-out visitor goes to Access, and no ungated hostname answers.*

- No tool checks the sign-in redirect or the `workers.dev` exposure yet, so these checks run by hand against the deployed site. :fact[iaqcq6]
- To verify the gate, run these checks in order:
1. From a browser signed in through Access as a rostered editor, open `/admin` on the deployed site. The admin shell opens. :fact[hilyos]
2. In Workers Logs, confirm that the request left no `guard.refused` record with `reason: identity` and no `auth.identity.unknown` record. :fact[zvr7uz] :fact[hilyos]
3. In the admin, sign out. The browser lands on the logout address the config module exports. :fact[8xxe3b]
4. From a signed-out client, send an unauthenticated `GET` to `/admin/login` on the site's hostname. The redirect lands on your team domain. :fact[iaqcq6]
5. From the same client, send an unauthenticated `GET` to `/admin` on `<worker-name>.<subdomain>.workers.dev` and on each Version URL. No response comes from the Worker. :fact[iaqcq6] :fact[51uyqr]

:::row
**Symptom.** In the first check, the browser shows Cloudflare's Access block page or one of the guard's two refusal pages instead of the admin shell.
**Cause.** The application's policy, the roster, or the resolver refused the editor. :fact[k40l86] :fact[116dbd]
**Fix.** See [Resolve a refused sign-in](#resolve-a-refused-sign-in).
:::

:::row
**Symptom.** After sign-out, the browser lands on `/admin/login` instead of the logout address.
**Cause.** The sign-out re-checks the logout address it reads from request state and falls back to `/admin/login` when the value fails the guard's rule, which happens when a handle sequenced after the guard rewrites `locals.cairnIdentity`. :fact[8xxe3b]
**Fix.** Remove the write to `locals.cairnIdentity` from that handle, then deploy again. :fact[8xxe3b]
:::

:::row
**Symptom.** The `GET` to `/admin/login` stays on the site's hostname and returns a page that reads "Sign in through" and the resolver's label.
**Cause.** The application's paths don't cover `/admin/login`, so the request reaches the Worker, where the guard treats that path as public and the login route serves its hand-off page. :fact[j5v0gn] :fact[ojr3qm]
**Fix.** In the application's paths, add `/admin` and `/admin/*`. :fact[vnm1p5]
:::

:::row
**Symptom.** The Worker answers on the `workers.dev` hostname or on a Version URL.
**Cause.** The deployed Wrangler configuration leaves `workers_dev` or `preview_urls` on, or omits `preview_urls` while an earlier Version URL setting stays on. :fact[51uyqr]
**Fix.** In the Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`, then deploy again. :fact[51uyqr]
:::

## Resolve a refused sign-in

*Take the reader from the page a refused editor saw to the log record that names the cause and the setting that fixes it.*

- The guard answers a refusal by the resolver with the identity-unresolved page, headed "This admin needs" and the gate's label, and a proven email with no roster row with the unknown-identity page, headed "You're not on this site's editor roster". Each leaves one log record. :fact[116dbd] :fact[zvr7uz] :fact[hilyos]
- A refusal by the application's policy never reaches the Worker and leaves neither record. :fact[agif8l] :fact[k40l86]
- To find why an editor was refused, run these checks in order:
1. If the editor saw Cloudflare's Access block page, add the editor to the application's policy. :fact[agif8l] :fact[k40l86]
2. If the editor saw the unknown-identity page, find the request's `auth.identity.unknown` record in Workers Logs. :fact[hilyos] :fact[mjedcx]
3. On the **Editors** screen, add the editor at the address in that record's `email` field. The editor's next request succeeds. :fact[9sbf9g] :fact[hilyos] :fact[mjedcx]
4. If the editor saw the identity-unresolved page right after signing out from a tab left open, sign in through the gate again. :fact[ig5pn3]
- The shell's sign-out posts to the bare `/admin`, a gated path. A tab whose Access session already ended is refused there before the sign-out runs. :fact[ig5pn3]
5. Otherwise, in Workers Logs, read the `detail` field of the request's `guard.refused` record with `reason: identity`. :fact[zvr7uz] :fact[sbv5xj]
6. If `detail` is `audience`, compare the AUD tag in `src/lib/access-config.ts` with the one in the application's **Additional settings**. :fact[fu4uis] :fact[gs23fb]
7. If `detail` is `issuer` or `keys`, check the team domain in `src/lib/access-config.ts`. :fact[fu4uis] :fact[s9s8mw]
8. If `detail` is `missing`, confirm that the application's paths cover the requested path and that the request arrived on the site's hostname. :fact[vnm1p5] :fact[jha9f7]
9. If `detail` is `error`, read the thrown message in the record's `error` field and fix the resolver module. :fact[zvr7uz] :fact[fu4uis]
10. If `detail` is `expired`, have the editor sign in through the gate again. :fact[fu4uis]
11. If `detail` is `invalid` or `no_email`, confirm that the request came from an editor's browser rather than a service token, then check the application's login methods. :fact[zas1dk] :fact[zvr7uz]
- See [Read the structured logs](debug-your-site.md#read-the-structured-logs).
- See [Log events](../reference/log-events.md).

## See also

*Point the reader to the pages that cover the seams and limits around identity mode.*

- The following pages cover the seams and limits around identity mode:
- See [Identity mode's threat surface](security-model.md#identity-modes-threat-surface).
- See [Restrict admin access](restrict-admin-access.md).
- See [Mount the draft preview route](build-the-public-routes.md#mount-the-draft-preview-route).
- See [Add a second sign-in group](add-a-second-sign-in-group.md).
- See [`createAuthGuard`](../reference/sveltekit.md#createauthguard).
- See [`IdentityResolver`](../reference/sveltekit.md#identityresolver).
