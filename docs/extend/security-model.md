# Security model

cairn signs in a site's editors and commits their edits, so its security design decides who can
change the site. It assumes the likeliest attacker holds an editor's account, through a stolen or
phished sign-in link. An anonymous visitor reaches nothing behind `/admin` except the sign-in form.

Each component cairn exposes pairs its defenses with residual risks that stay with the site, and
[the site's responsibilities](#the-sites-responsibilities) collect those risks into one list. A site
weighs those risks before it replaces cairn's sign-in or access rules, and again before it ships. A
site can add protection above any of these defenses, as it does when it configures `kit.csp` to send
a Content-Security-Policy. A reader needs working knowledge of SvelteKit hooks, form actions, and
cookie attributes to weigh these defenses. Configuring the access map, an identity gate, an auth channel,
the renderer, and the GitHub App key belongs to the task guides that [related
resources](#related-resources) lists.

Under the zero-config default, cairn is the identity system for a site's editors, since its D1
store, `AUTH_DB`, holds the editor roster, the sessions, and the single-use sign-in tokens. Those
defaults, the owner and editor roles and magic-link sign-in, are a zero-config starting point that a
developer can replace with their own auth framework, after which cairn mints no session and reads an
owner or editor identity through a defined hand-off. That hand-off is the `identity` option on
`createAuthGuard`, which reads the proof of identity that an external gate supplies. A separate seam, the auth channel, signs users in
on a site's member routes.

The isolation of the Worker that runs the engine belongs to Cloudflare, and [the Workers security
model](https://developers.cloudflare.com/workers/reference/security-model/) describes it.

## Magic-link sign-in

An anonymous visitor reaches only the sign-in form and the confirm page its link opens, so the token
behind each sign-in link is the first thing cairn defends. A magic-link sign-in mints a 256-bit random
single-use token, stores only its SHA-256 hash, and emails the raw token in a link to
`/admin/auth/confirm`, so the stored row holds nothing that works as a link. Only an address in the
`editor` table is sent a token, and the owner curates that table through the owner-only `editors`
screen. Confirming consumes the token row in one atomic `DELETE ... RETURNING` and creates a
session, and a new request for the same address deletes the earlier row first, so a fresh request
replaces the previous token. A session resolves through a join on `editor`, so removing an editor
stops that editor's session on the next request.

A sign-in token lives 10 minutes and a session lives 30 days, and a repeat request from the same
address is throttled to once per minute. Each is a named engine constant that no adapter option
changes, so an adapter cannot loosen any of the three.

The request action never returns a token, since every exit answers with an outcome and a `sent`
flag, and the link travels only by email to the requested address. The most a requester can do to
another person's address is replace or rebind its live token. An address off the roster receives the
same `{ outcome: 'sent' }` answer that an editor's address receives, so the common case of the
request form does not reveal who is on the roster.

### Limits of the non-enumerating answer

The exception is a repeat request inside the one-minute cooldown, which returns a distinct
`throttled` status and so reveals that the address is an editor's. That status is a deliberate
relaxation of the non-enumerating answer, traded for sending no second email to an editor who
presses the button again.

## Browser binding for sign-in

Once a token exists, a browser other than the requester's could spend it, so cairn binds each
sign-in to the browser that requested the link. A bound sign-in
completes only in the browser that requested it, and a confirm from any other browser refuses
without consuming the token. The request sets a `cairn_login_pending` cookie holding a random nonce,
`HttpOnly` and `SameSite=Lax`, with the `__Host-` prefix on https and a one-hour lifetime. Confirm
compares the cookie's nonce hash against the token row's `nonce_hash` inside the same atomic
`DELETE` that consumes the token. The nonce means something only while a live token row carries its
hash, and the row's ten-minute expiry sweeps that hash, so a cookie that outlives the row grants
nothing.

The binding closes a login CSRF, in which an attacker holding a roster address requests a link for
it and puts the link before an editor's browser. Without the binding, that browser would sign in to
the attacker's session, and the editor's next edits would carry the attacker's identity. It also
closes a scanner burn, since a mail scanner that follows links cannot spend an editor's bound link
before the editor clicks it.

A submitted token that fails to confirm from a browser holding no pending-login cookie redirects to
`/admin/login?error=no-pending-request`, while one from a browser that holds the cookie reads
`?error=expired`. A site that renders its own login page branches on the exported
[`NO_PENDING_REQUEST_ERROR`](../reference/sveltekit.md#no_pending_request_error) constant.

The binding alone would be a lockout, since an attacker posting the request form for an editor's
address once a minute would keep the live token bound to the attacker's browser while the cooldown
throttled the editor's re-request. A throttled re-request therefore rebinds the live token to the
browser that just asked, so the last browser to ask holds the binding. The rebind changes nothing
else in the answer, sending no new token and no second email and leaving the cooldown window
untouched. It is one `UPDATE` that skips an expired or unbound row, so a rebind that races the
consuming `DELETE` either lands first or matches no row.

### Limits of the browser binding

A token row with no binding still matches a confirm from a browser that holds no cookie. The
engine's request action always writes a hash, so unbound rows come from an engine older than
migration `0004`, from the bootstrap `INSERT` that `create-cairn-site`, the setup command, runs, and
from a recovery row an operator seeds by hand.

The binding leaves the following risks in place:

- Someone holding a forwarded token can rebind its row to their browser by posting the request
  form for that address inside the one-minute cooldown.
- An unbound row, the setup command's first sign-in link among them, carries none of the binding's
  protection.

Outside the cooldown, the same request deletes the earlier row and mints a new token, which destroys
the forwarded one.

## The session cookie

A confirmed sign-in creates a session, and the session cookie is what carries it on every later
admin request. The session cookie carries the `__Host-` prefix on every https deploy, which makes
the browser require `Secure` and `Path=/` and forbid `Domain`, so the cookie is bound to the site's
origin. Local http development drops the prefix, since `__Host-` requires `Secure` unconditionally.

Every cairn cookie takes its `Secure` bit from one rule, under which an `https:` request is always
Secure whatever `PUBLIC_ORIGIN` says. A non-https request on a local host is not Secure and so keeps
the bare cookie name. On any other host a configured, parseable `PUBLIC_ORIGIN` decides, and with
none the answer is false.

Logout reads the session id from either cookie-name form and deletes both forms, `__Host-` and bare,
of the session cookie and of the CSRF cookie, each with its matching `Secure` flag, then clears the
request's pending-login cookie. Under `identity`, logout skips the session-row delete, still clears
every cookie, and redirects to the gate's `logoutUrl`.

### Limits of the session cookie

Outside `/admin`, a route served over http on a non-local host under an https `PUBLIC_ORIGIN` mints a
`__Host-` cookie that the browser discards, since the guard's https help page, which refuses such a
request under `/admin`, covers no other path.

## CSRF protection

A forged form post would act with the editor's session, so cairn moves the admin's CSRF check from
SvelteKit into the guard. A site sets `csrf: { checkOrigin: false }` in `svelte.config.js`, and the guard
that [`createAuthGuard`](../reference/sveltekit.md#createauthguard) builds enforces an Origin-independent double-submit check on every unsafe `/admin` form post in its
place, restoring an equivalent strict Origin check on every other route.

The admin needs a check that does not read the `Origin` header, because of the referrer policy it
serves. Under the [Fetch Standard](https://fetch.spec.whatwg.org/), a non-`cors` request whose
method is not `GET` or `HEAD` sends `Origin: null` when its referrer policy is `no-referrer`, which
is the policy every admin response sets. An Origin check refuses such a post, since the guard's
origin check is a strict equality of the request's `Origin` header and the URL's origin, and a
request that arrives with `Origin: null` gets the branded `auth.csrf-origin-mismatch` page.
SvelteKit's default check compares the same header, and since `csrf.checkOrigin` is one global
setting with no per-route exception, a site hands the admin's CSRF authority to the guard by turning
it off everywhere. SvelteKit deprecates `checkOrigin` in favor of `csrf.trustedOrigins`, and the
option stays supported across the engine's tested range, which the [`checkOrigin`
deprecation](../reference/supported-toolchain.md#the-checkorigin-deprecation) section tracks.

The guard sets `no-referrer` on `/admin` responses only, since the Origin check it restores outside
`/admin` refuses a form post that the policy reduces to `Origin: null`.
[`cairn doctor`](../reference/cli-cairn-doctor.md) warns through its `config.no-referrer-blanket`
check when a site serves `no-referrer` site-wide, and its remediation is to serve
`strict-origin-when-cross-origin` or `same-origin` as the site-wide default.

On an unsafe `/admin` form request, an `X-Cairn-CSRF` header decides outright whenever one is sent,
so a wrong header rejects instead of falling through, and only a request with no header has its
hidden form field read. An empty header value counts as sent and is judged on its own mismatch. The
header path is how a raw-body upload passes, since the guard does not clone a request body. The
cookie and the witness are compared through [`tokensMatch`](../reference/auth-crypto.md#tokensmatch),
a length-checked constant-time compare, and a failure renders the branded 403 and logs
`guard.refused` with reason `csrf`.

The CSRF cookie is set `HttpOnly` and `SameSite=Lax`, with `Path=/` and a `Max-Age` that matches the
session cookie's 30-day lifetime. It shares the session cookie's `__Host-` and `Secure` derivation.
On the magic-link path its value rotates only when a login succeeds or a logout runs. Every later
issue re-sets the identical value with a fresh `Max-Age`.

### Limits of CSRF protection

Because confirming deletes the cookie and issues a fresh value, an already signed-in browser that
re-authenticates rotates the value under another open tab's rendered form, which then fails the
compare with one generic 403 that a reload recovers from. The loads that issue a CSRF token are
`loginLoad`, `confirmLoad`, and the admin shell load. The guard applies its security headers,
`Cache-Control: private, no-store` included, only to an `/admin` path, so a token issued from one of
those loads mounted elsewhere travels without them.

## The auth guard

The CSRF check is one step of the auth guard, which also decides how an admin request fails and
which headers its response carries. The guard handles every request in a fixed order, and every
refusing step before the resolve logs a named `guard.refused` reason. The steps run as follows:

1. The dev-backend tripwire, with reason `dev_backend_in_prod`.
2. The origin check for non-admin routes, with reason `origin`.
3. The https help page, with reason `https`.
4. The bindings check, with reason `bindings`.
5. The CSRF check, with reason `csrf`.
6. The session resolve, or the identity resolve under `identity`.

An `/admin` request over plain http on a non-local host gets the `edge.https-not-forced` help page
before the CSRF check, public login paths included. A missing `AUTH_DB` binding fails every admin
path, public ones included, with the named `bindings` condition instead of a raw 500. On a guarded
path, a missing or invalid magic-link session redirects with a 303 to `/admin/login` and writes no
log record. Under `identity`, every refusal the resolver produces logs `guard.refused` with reason
`identity`, while a proven email that matches no roster row logs `auth.identity.unknown`.

Every admin response carries the following headers, except that a rejection page omits
`Strict-Transport-Security`:

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Content-Security-Policy: frame-ancestors 'none'`.
- `Referrer-Policy: no-referrer`, scoped to `/admin` and never set site-wide.
- `Permissions-Policy`, denying the camera, the microphone, and geolocation.
- `Strict-Transport-Security`, with subdomain pinning as an opt-in.
- `Cache-Control: private, no-store`.

The rejection pages cover a CSRF failure, the https help page, the bindings fault, and every
identity refusal, and they omit `Strict-Transport-Security` because under [RFC 6797 section
8.1](https://www.rfc-editor.org/rfc/rfc6797#section-8.1) a `max-age`-only header would replace a
cached `includeSubDomains` policy.

### Limits of the admin headers

A non-admin request returns from `resolve(event)` untouched, so none of these headers reach the
public site. The admin sends no full Content-Security-Policy by design, since the engine's defense
against script in author-written markup is the sanitize floor that [render safety](#render-safety)
describes. A site that wants a CSP configures [`kit.csp`](https://svelte.dev/docs/kit/configuration#csp)
in `svelte.config.js`, where SvelteKit adds a nonce or a hash to the inline scripts and styles it
generates.

## Access map coverage

A request the guard admits to a guarded admin path belongs to a signed-in editor, and the access map
decides what that editor may reach. An access map narrows only the targets it names, so a screen or
concept the map never mentions stays reachable to any editor-capability session.
[`canReach`](../reference/core.md#canreach-hasaccessrule) is the one function that decides both
route enforcement and nav visibility, so the two cannot drift apart, and the `editors` roster screen
stays owner-only whatever the map says.

The following engine write actions gate through the map, each against one target:

- Entry actions and preview mint and revoke, against the concept id.
- Media actions, against `media`.
- The nav save, against `nav`.
- The tidy settings save, against `settings`.
- The tag vocabulary save, against `vocabulary`.

Against an unmapped target, each of those actions admits any editor-capability session. The access
check for a site's actions, the one that `createSectionAction` and the opt-in `access` option of
[`createAdminAction`](../reference/sveltekit.md#createadminaction) use, fails closed at three ordered
gates:

1. A target with no rule refuses.
2. A session whose role is absent from an existing rule refuses, except that owner capability is
   always admitted.
3. An `ownerOnly` target refuses a non-owner session.

### Limits of access map coverage

The site-wide publish, `publishAllAction`, spans every concept, so it makes no single access call
and any editor-capability session can post it. It filters the pending entries it acts on through
`canReach` against each entry's concept, so a concept the map narrows publishes nothing for that
session, while a concept the map never names publishes as it would with no map. The tidy action and
the personal-dictionary action run their access check only when the route carries a `concept`
parameter, so on a route without one either action is open to any editor-capability session.
`validateAccessComposition` does not throw for a partial map, and it logs a `config.access_unmapped`
warning naming the targets a map leaves unmapped when it covers some, but not all, of the concept
ids and fixed engine screens.

#### Allowlist semantics from an exhaustive map

A map behaves as an allowlist only when it names every concept id and every fixed engine screen, the
coverage whose absence the `config.access_unmapped` warning reports. Even an exhaustive map leaves
open a tidy or dictionary action mounted on a route without a `concept` parameter. [Restrict admin
access](restrict-admin-access.md) sets out the steps.

## Render safety

An editor's reach includes writing markup that every visitor's browser renders, so the render
pipeline is cairn's defense for the public site. Every renderer that
[`createRenderer`](../reference/core.md#createrenderer) builds runs a `rehype-sanitize` floor by
default, seeded from GitHub's `defaultSchema`, which strips `<script>` tags, inline event-handler
attributes, and `javascript:` and `data:` URLs before the `build()` dispatch or any later stage
touches the tree. The pipeline runs nine stages in a fixed order:

1. Markdown parsing.
2. Raw HTML parsing through `rehype-raw`.
3. The sanitize floor.
4. The `build()` dispatch.
5. Slugs, task lists, and highlighting.
6. Anchor hardening.
7. The sink guard.
8. The table-scroll wrap.
9. The site's plugins.

Raw HTML in markdown is parsed into elements instead of escaped to literal text, and the sanitize
floor then cleans it to the same allowlist as directive-authored content. Beyond GitHub's schema,
the built schema admits cairn's directive markers as inert data attributes, a few structural tags,
`className` on any element, `srcSet` and `sizes` on `img`, and the inert `cairn:` URL scheme on
`href`. URLs with the `javascript:` and `data:` schemes stay stripped regardless.

Every anchor with `target="_blank"` has its `rel` forced, `noopener noreferrer` by default, after
highlighting and ahead of the sink guard. The sink guard runs over the fully built tree, stripping
every `on*` attribute and inline `style` and scheme-checking every URL-bearing property against the
same safe-scheme list. It does not remove a `<script>`, `<style>`, or `iframe srcdoc` element that a
`build()` emits.

### Limits of render safety

Every bypass of the pipeline's protections lives in a site's code. The `sanitizeSchema` option is
additive by contract, since a site receives cairn's default schema and returns the schema the floor
uses, and it keeps the strip by starting from that argument. Nothing checks the returned schema, so a
callback that admits `<script>` lets author script through the floor, and the sink guard removes no
script element. A `javascript:` or `data:` URL stays stripped either way, because the sink guard's
safe-scheme list comes from GitHub's schema and never from the site's.

`unsafeDisableSanitize` is a code-level switch on the renderer config, never an admin toggle, and it
removes both the sanitize floor and the sink guard. With it set, `rehype-raw` still parses author
HTML into elements, so a `<script>` or an `onerror` handler that any editor, or anyone holding an
editor's session, writes into an entry reaches the rendered HTML that the public pages serve to
every visitor. A registered `build()` can also bypass every render-safety protection by rendering
trusted literal markup outside the sanitized tree, since the protections stop at the boundary of
what `createRenderer` produced.

## The GitHub App's reach

Every save and publish commits through the site's GitHub App, so the App's permissions set what its
private key and installation token can write to the repository. Publishing authenticates to GitHub as the
site's GitHub App, never a personal account, with the private key held as a single Worker secret
that signs a JWT to mint a short-lived installation token. The token is cached per Worker isolate
for 55 minutes and re-minted on a miss, and it is never written to disk in the deployed runtime and
never logged.

### Limits of the installation token

The App's **Contents** permission, at **Read and write**, is repository-wide, so the installation
token can write any path in the installed repository, and only engine code confines writes to the
declared content directories. Installing the App on a repository that also holds code or other
teams' content therefore puts that content inside the token's write reach. [Rotate the GitHub App
key](rotate-the-github-app-key.md) covers operating the key.

## Log contents

The engine's logs record sign-in activity without the secrets that sign-in issues. No log record
carries a magic-link token, a session id, or a magic link's contents. Sign-in events log the email
and the expiry, and the channel's session events log only a correlation id. The [log
events](../reference/log-events.md) reference lists each event's fields.

## Identity mode's threat surface

A site that replaces magic-link sign-in with an identity gate leaves every sign-in defense to the
gate, and cairn's part in sign-in reduces to the roster lookup. The `identity` option on `createAuthGuard`
replaces the whole built-in sign-in path, so no token is minted, no session is created, and no
session cookie is set. `identity.resolve` reads the gate's proof of identity, and the guard looks the
proven email up against the roster exactly as it looks up a magic-link session's email. The
effective session lifetime moves to the gate, and cairn's 30-day session constant no longer applies.

No cairn step rotates the CSRF value under `identity`, so a change of gate identity in one browser
keeps the same value until a cairn logout deletes the cookie or its `Max-Age` ends. The login-moment
rotation never runs, because the confirm action is a 404 under `identity`.

The only join between the gate and the roster is the email string the resolver returns. The guard
rejects an empty string, then trims, lowercases, and looks up the email with no cross-check, so cairn
cannot tell a directory-asserted address from a self-asserted one. A gate login method whose email the
signing-in user controls therefore lets that user sign in to cairn as any roster address they choose
to assert. Cloudflare Access, for example, takes the email from the claim the identity provider
returns, which an [OIDC provider's email claim
setting](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/)
selects. The guard makes no hostname check under `identity`, so a hostname that reaches the Worker
outside the gate's coverage is admitted whenever the resolver accepts the presented token.

[Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) sets up
the gate these risks belong to.

## Auth channel threat model

An auth channel's sign-in form takes a contact from an unauthenticated caller, so its defenses start
from a rule about whose identity may trigger a denial. The auth channel rests on the rule that no
control keyed on the victim's identity may deny, delay, or destroy anything, so denial keys only on
the requester. An identity-keyed control either escalates through a channel the site can act on or
only logs. Earlier designs that keyed a failed-attempt count or a send budget on the victim's
identity each allowed a permanent lockout of that victim.

The rule shapes escalation, the challenge, eviction, and the spend ceiling as follows:

- Escalation returns `challenge-required`, a retry invitation and never a hard failure, and a failed
  challenge on an escalated action returns `challenge-required` again.
- `request` runs its challenge on every call, and `confirm` runs it once escalated.
- A failed challenge on either action returns before any code mint, attempt increment, or code
  consumption.
- Eviction of stored rows keys on the requester's bucket, so it removes only the requester's pending
  rows.
- The anti-abuse spend ceiling never denies, and crossing it logs `auth.channel.ceiling_exceeded` at
  error to alert the site operator.

Every channel action asserts that the request's `Origin` matches the site's origin and that the
connection is https, except on a local development host, before any code, budget, or session logic
runs. Either failure throws a plain 403 with no wire result. The check mirrors the guard's rule
because the guard's admin-path handling never covers a site's member routes, where the guard
restores only the framework's origin check for unsafe form posts.

The channel correlates identity through a salted hash of the subject, prefixed `'s:'`, when a roster
lookup resolved one, or of the contact, prefixed `'c:'`, otherwise, and its logs carry only the
first 16 hex characters of that hash. The prefixes keep a subject-derived identity from colliding
with a contact-derived one even when a subject looks like an email address, and the per-deployment
salt, provisioned on first use, keeps the hash from reversing against a small contact space. A
numeric confirmation code is drawn by rejection sampling over Web Crypto random bytes, which avoids
the low-end bias that a naive modulo introduces. [NIST's digital identity
guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) require the secrets behind authenticators
to come from an approved random bit generator.

### Limits of the auth channel

A dev transport that prints a channel's code to the console is a roster oracle by construction,
since delivery runs only for a known subject, so an unauthenticated caller learns whether any
contact is on the roster without guessing a code. The same transport, run in a deployed Worker with
observability on, lands plaintext one-time codes in Workers Logs. No such transport ships in engine
code, and the hazard is one that a site's `deliver` could introduce. A capture transport that
records each delivered code for readback, as the example site's does for its `/test/last-otp` route,
answers the same oracle, and the example site keeps its roster to six demo contacts with no real
contact data.

Each function a site supplies to the channel carries an obligation the factory cannot check:

- `normalize` must be idempotent, canonical per identity, and injective across distinct people.
- `lookup` must return a subject that is stable and canonical per person.
- `challenge` must verify a human, since the factory cannot distinguish a real
  [Turnstile](https://developers.cloudflare.com/turnstile/) call from `async () => true`.

[Add a second sign-in group](add-a-second-sign-in-group.md) builds a channel, and the [config
obligations](../reference/auth-channel.md#config-obligations) entry states each contract.

## Dev-backend refusals

A deployed Worker must never carry the `CAIRN_DEV_BACKEND` flag, so the engine refuses the flag in
two places, on different terms. Both refusals read the flag from `platform.env` and `process.env`.
The flag counts only as `1` or the boolean `true`, so a `CAIRN_DEV_BACKEND=true` string reads as
unset.

The two refusals apply the flag as follows:

- `createAuthGuard` refuses with a 503 on the flag alone and logs `guard.refused` with reason
  `dev_backend_in_prod`.
- Every [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) action refuses with a
  503 before any other work, and only when the flag is set and the request counts as deployed.

The guard can refuse on the flag alone because it mounts only in a production build, and a site's
dev branch replaces it entirely. The channel also requires a deployed request, because the flag is a
dev transport's enable contract.

A request counts as deployed when the configured `PUBLIC_ORIGIN` names a non-local host, whatever
`Host` claims. A local, absent, or unparseable `PUBLIC_ORIGIN` hands the answer back to the
request's hostname, so a configured `PUBLIC_ORIGIN` can make a request count as deployed but never as
local, and a deployment with no `PUBLIC_ORIGIN` rests on the fallback derived from `Host`.

### Limits of the dev-backend refusals

The two refusals leave open a dev-shaped transport deployed with the flag unset and a dev-branch
bundle that replaces the guard behind the build-time `__CAIRN_DEV_BUILD__` conditional. Neither
refusal can see the transport, since `deliver`, `lookup`, and the rest of the channel's config are
opaque site functions. cairn's example site, `examples/showcase`, closes that case for its capture
transport, which refuses to deliver unless `ctx.env.CAIRN_DEV_BACKEND` is `'1'`. The example site's
member dev wiring also loads only by dynamic import from the `__CAIRN_DEV_BUILD__` branch of
`hooks.server.ts`. cairn's CI closes the bundle case for the example site alone, since its e2e
workflow runs `wrangler deploy --dry-run` on the example site's default build and fails if any
string in `scripts/checks/dev-fold-markers.txt` survives in the output.

## The site's responsibilities

The following responsibilities stay with the site:

- Setting `csrf: { checkOrigin: false }` in `svelte.config.js` and mounting the guard, which then
  owns CSRF for the admin.
- Keeping `Referrer-Policy: no-referrer` off the site-wide default.
- Making an access map exhaustive when the site intends an allowlist.
- Mounting the tidy and dictionary actions on a route that carries a `concept` parameter.
- Under `identity`, allowing only gate login methods whose email the signing-in user cannot control.
- Under `identity`, putting every hostname that reaches the Worker behind the gate.
- Keeping dev transports and the `CAIRN_DEV_BACKEND` flag out of a deployed Worker, with a refusal
  inside any dev-shaped transport.
- Honoring the obligations on `normalize`, `lookup`, and `challenge` when building a channel.
- Starting every `sanitizeSchema` callback from the schema it receives and only adding to it.
- Leaving `unsafeDisableSanitize` unset.
- Reviewing the output of every registered `build()`.
- Treating everything in the App's repository, code included, as inside the installation token's
  write reach.
- Configuring `kit.csp` when the site wants a Content-Security-Policy.

## Related resources

The following resources cover the tasks, the system, and the standards behind these defenses.

### How-to guides

The following guides configure the seams these defenses depend on:

- [Restrict admin access](restrict-admin-access.md), for the access map.
- [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md), for
  an identity gate.
- [Add a second sign-in group](add-a-second-sign-in-group.md), for an auth channel.
- [Configure rendering](configure-rendering.md), for the renderer's options.
- [Rotate the GitHub App key](rotate-the-github-app-key.md), for the App's private key.

### Concepts

The following page explains the system these defenses protect:

- [Architecture](architecture.md), for how the engine's parts and seams fit together.

### External resources

The following standards and platform pages describe the layers beneath cairn's defenses:

- [The Workers security model](https://developers.cloudflare.com/workers/reference/security-model/),
  for the isolation of the Worker.
- [The Fetch Standard](https://fetch.spec.whatwg.org/), for when a browser sends `Origin: null`.
- [RFC 6797](https://www.rfc-editor.org/rfc/rfc6797), for how a browser caches a
  `Strict-Transport-Security` policy.
- [NIST's digital identity guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html), for the
  random generation of authenticator secrets.
- [SvelteKit's CSP configuration](https://svelte.dev/docs/kit/configuration#csp), for adding a
  Content-Security-Policy.
