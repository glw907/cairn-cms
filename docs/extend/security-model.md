# Security model

A site built on cairn lets people who hold no GitHub account change its published content, so a
developer weighing the site's security starts from how cairn decides who those people are. cairn
runs inside the site's SvelteKit app on Cloudflare Workers, and its admin is the part of that app
under `/admin`, where editors sign in from an emailed link with no password. The emailed link serves
a non-technical author, whom Decap CMS's GitHub backend would require to hold a GitHub
account with push access to the content repository. Under that zero-config default, cairn is the
identity system for a site's editors, since its D1 store, `AUTH_DB`, holds the editor roster, the
sessions, and the single-use sign-in tokens. An editor's edits reach the repository through the
site's GitHub App, never a personal account, with the App's private key held as a Worker secret.

cairn's security design assumes the likeliest attacker holds an editor's account, through a stolen
or phished sign-in link. An anonymous visitor reaches nothing behind `/admin` except the sign-in
form. Every `/admin` request passes through [the auth guard](#the-auth-guard), the server hook
[`createAuthGuard`](../reference/sveltekit.md#createauthguard) builds. The isolation of the Worker
that runs the engine belongs to Cloudflare, and [the Workers security
model](https://developers.cloudflare.com/workers/reference/security-model/) describes it.

A developer evaluating cairn before adopting it wants the whole of this design, what each defense
covers and what it leaves to the site. A developer setting up a site may want the reasoning behind
one choice, such as the GitHub App's repository-wide write permission. A developer about to replace
sign-in or add a second group of users wants to know which defenses move with that change.

The defaults are floors, not ceilings. A developer can replace those defaults, the owner and editor
roles and magic-link sign-in, with their own auth framework, after which cairn mints no session and
reads an owner or editor identity through a defined hand-off. That hand-off is the `identity` option
on the guard, which reads the proof of identity an external gate supplies in place of cairn's
session resolution. A site can also add an auth channel, which signs in a second group of users from
a form any anonymous caller can post. Weighing these defenses takes working knowledge of SvelteKit
hooks, form actions, and cookie attributes.

The built-in design's defenses fall into the following groups:

- The sign-in link, its browser binding, and the session cookie, which protect the account itself.
- CSRF protection and the admin response headers, which protect against requests forged in the
  account's name.
- The dev-backend flag's refusals, which guard against a development flag reaching a deployed Worker.
- The access map's coverage, the render pipeline's sanitizing, and the GitHub App's reach, which
  bound what a taken account reaches.

The threat surfaces of the two seams follow the built-in design, and the responsibilities that stay
with the site close the page.

Configuring the access map belongs to [Restrict admin access](restrict-admin-access.md), and an
identity gate to [Replace magic links with Cloudflare
Access](replace-magic-links-with-cloudflare-access.md). Building an auth channel belongs to [Add a
second sign-in group](add-a-second-sign-in-group.md), the renderer's options to [Configure
rendering](configure-rendering.md), and the App's private key to [Rotate the GitHub App
key](rotate-the-github-app-key.md). The history of when the sanitize floor shipped is out of scope.

## Magic-link sign-in

A sign-in link carries a single-use token that reaches only a roster address, lives 10 minutes, and
sits in the store as a hash. A sign-in request mints a 256-bit random token, stores only its SHA-256
hash, and emails the raw token in a link to `/admin/auth/confirm`, so the stored row holds nothing
that works as a link. The owner curates the roster, the `editor` table, through the owner-only
`editors` screen. Confirming consumes the token row in one atomic `DELETE ... RETURNING` and creates
a session, and a new request for the same address deletes the earlier row first, so a fresh request
replaces the previous token. A session resolves through a join on `editor`, so removing an editor
stops that editor's session on the next request.

A session lives 30 days, and a repeat request from the same address is throttled to once per minute.
The token lifetime, the session lifetime, and the throttle are named engine constants, and no
adapter option loosens them.

The request action never returns a token, since every exit answers with an outcome and a `sent`
flag, and the link travels only by email to the requested address. Against another person's address,
a requester can at most replace its live token or rebind it to the requester's browser, and learn
from a throttled answer that the address is on the roster. No log
record carries a sign-in token, a session id, or a link's contents, and the [log
events](../reference/log-events.md) reference lists the fields each event does carry.

An address off the roster receives the same `{ outcome: 'sent' }` answer that an editor's address
receives, so the common case of the request form does not reveal who is on the roster.

### Limits of the non-enumerating answer

A repeat request inside the one-minute cooldown returns a distinct `throttled` status, which reveals
that the address belongs to an editor. That status is a deliberate relaxation of the non-enumerating
answer, traded for sending no second email to an editor who presses the button again.

A token that exists can still be spent by a browser other than the one that asked for it, and
[Browser binding for sign-in](#browser-binding-for-sign-in) closes that path.

## Browser binding for sign-in

A bound sign-in completes only in the browser that requested it, and a confirm from any other
browser refuses without consuming the token. The binding closes a login CSRF, in which an attacker
holding a roster address requests a link for it and puts the link before an editor's browser.
Without the binding, that browser would sign in to the attacker's session, and the editor's next
edits would carry the attacker's identity. It also closes a scanner burn, since a mail scanner that
follows links cannot spend an editor's bound link before the editor clicks it.

The request sets a `cairn_login_pending` cookie holding a random nonce, `HttpOnly` and
`SameSite=Lax`, with the `__Host-` prefix on https and a one-hour lifetime. Confirm compares the
cookie's nonce hash against the token row's `nonce_hash` inside the same atomic `DELETE` that
consumes the token. The nonce means something only while a live token row carries its hash, and the
row's 10-minute expiry sweeps that hash, so a cookie that outlives the row grants nothing.

The binding alone would be a lockout, since an attacker posting the request form for an editor's
address once a minute would keep the live token bound to the attacker's browser while the cooldown
throttled the editor's re-request. A throttled re-request therefore rebinds the live token to the
browser that just asked, so the last browser to ask holds the binding, and the rebind leaves an
expired or unbound row untouched.

The [reference entry for the no-pending-request
error](../reference/sveltekit.md#no_pending_request_error) states which error a failed confirm
reports.

### Limits of the browser binding

A token row with no binding still matches a confirm from a browser that holds no cookie. The
engine's request action always writes a hash, so unbound rows come from an engine older than
migration `0004`, from the bootstrap `INSERT` that `create-cairn-site`, the setup command, runs, and
from a recovery row an operator seeds by hand. The setup command's first sign-in link therefore
carries none of the binding's protection.

Someone holding a forwarded token can make it work by posting the request form for that address
inside the one-minute cooldown, which rebinds the row to their browser. Outside the cooldown, the
same request deletes the earlier row and mints a new token, which destroys the forwarded one.

A confirmed sign-in, bound or unbound, becomes a session, and [The session
cookie](#the-session-cookie) carries it on every later admin request.

## The session cookie

A confirmed sign-in becomes a session cookie that carries the `__Host-` prefix on every https
deploy, so the browser binds it to the site's origin. The prefix makes the browser require `Secure`
and `Path=/` and forbid `Domain`, and local http development drops it, since `__Host-` requires
`Secure` unconditionally.

Every cairn cookie takes its `Secure` bit from one rule, under which an `https:` request is always
Secure whatever `PUBLIC_ORIGIN` says. A non-https request on a local host is not Secure and keeps
the bare cookie name. On any other host a configured, parseable `PUBLIC_ORIGIN` decides, and with
none the answer is false.

Logout reads the session id from either cookie-name form and deletes both forms, `__Host-` and bare,
of the session cookie and of the CSRF cookie, then clears the request's pending-login cookie.

### Limits of the session cookie

Outside `/admin`, a route served over http on a non-local host under an https `PUBLIC_ORIGIN` mints
a `__Host-` cookie that the browser discards, since the guard answers a plain-http request with its
help page only on an `/admin` path.

The cookie rides every admin request the browser sends, including a form post the editor never meant
to send, and [CSRF protection](#csrf-protection) answers that post.

## CSRF protection

A forged form post would act with the editor's session, so every unsafe admin form post needs a CSRF
check, and cairn runs that check in the guard in place of SvelteKit's. A site sets
`csrf: { checkOrigin: false }` in `svelte.config.js`, and the guard enforces an Origin-independent
double-submit check on every unsafe `/admin` form post, restoring an equivalent strict Origin check
on every other route.

The admin needs a check that does not read the `Origin` header, because of the referrer policy it
serves. Under the [Fetch Standard](https://fetch.spec.whatwg.org/), a non-`cors` request whose
method is not `GET` or `HEAD` sends `Origin: null` when its referrer policy is `no-referrer`, which
is the policy every admin response sets. The guard's origin check is a strict equality of the
request's `Origin` header and the URL's origin, so a request that arrives with `Origin: null` fails
it with the branded `auth.csrf-origin-mismatch` page. [SvelteKit's default
check](https://svelte.dev/docs/kit/configuration#csrf) compares the same header, and since it is one
global setting with no per-route exception, a site hands the admin's CSRF authority to the guard by
turning it off everywhere. SvelteKit has deprecated that setting in favor of `csrf.trustedOrigins`,
and [the `checkOrigin` deprecation](../reference/supported-toolchain.md#the-checkorigin-deprecation)
records what the deprecation means for the engine.

On an unsafe `/admin` form request, an `X-Cairn-CSRF` header decides outright whenever one is sent,
so a wrong header rejects instead of falling through, and only a request with no header has its
hidden form field read. The header path is how a raw-body upload passes, since the guard does not
clone a request body. The cookie and the witness are compared through
[`tokensMatch`](../reference/auth-crypto.md#tokensmatch), a length-checked constant-time compare,
and a failure renders the branded 403 and logs [`guard.refused`](../reference/log-events.md) with
reason `csrf`.

The CSRF cookie is set `HttpOnly` and `SameSite=Lax`, with `Path=/` and a `Max-Age` that matches the
session cookie's 30-day lifetime. On the magic-link path its value rotates only when a login
succeeds or a logout runs, and every other issue re-sets the identical value with a fresh `Max-Age`.

### Limits of CSRF protection

The guard sets `no-referrer` on `/admin` responses only, since the Origin check it restores outside
`/admin` refuses a form post that the policy reduces to `Origin: null`. A site therefore keeps
`no-referrer` off its site-wide default, and [`cairn doctor`](../reference/cli-cairn-doctor.md)
warns through its `config.no-referrer-blanket` check when it finds a site-wide `no-referrer`. The
check's remediation is to serve `strict-origin-when-cross-origin` or `same-origin` as the site-wide
default.

The CSRF check is one step in [The auth guard](#the-auth-guard)'s fixed order.

## The auth guard

The guard handles every request in a fixed order, and every refusing step before the session resolve
logs a named `guard.refused` reason. The steps run in the following order:

1. The [dev-backend tripwire](#the-dev-backend-flags-two-refusals), with reason
   `dev_backend_in_prod`.
2. The origin check for non-admin routes, with reason `origin`.
3. The https help page, with reason `https`.
4. The bindings check, with reason `bindings`.
5. The CSRF check, with reason `csrf`.
6. The session resolve, or the identity resolve under `identity`.

An `/admin` request over plain http on a non-local host gets the `edge.https-not-forced` help page
before the CSRF check, public login paths included. A missing `AUTH_DB` binding fails every admin
path, public ones included, with the named `bindings` condition instead of a raw 500. On a guarded
path, a missing or invalid magic-link session redirects with a 303 to `/admin/login` and writes no
log record.

Every admin response the guard's resolve path returns carries the following headers:

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Content-Security-Policy: frame-ancestors 'none'`.
- `Referrer-Policy: no-referrer`, scoped to `/admin` and never set site-wide.
- `Permissions-Policy`, denying the camera, the microphone, and geolocation.
- `Strict-Transport-Security`, with subdomain pinning as an opt-in on the guard.
- `Cache-Control: private, no-store`.

A rejection page carries the same headers less `Strict-Transport-Security`, for the reason the
[guard's reference entry](../reference/sveltekit.md#createauthguard) gives. The 303 redirect to
`/admin/login` carries none of them, since the guard throws it before `resolve` runs.

### Limits of the admin headers

The admin sends no full Content-Security-Policy by design, since the engine's defense against script
in author-written markup is the sanitize floor that [Render safety](#render-safety) describes. A
site that wants a CSP configures [`kit.csp`](https://svelte.dev/docs/kit/configuration#csp) in
`svelte.config.js`, where SvelteKit adds a nonce or a hash to the inline scripts and styles it
generates.

The loads that issue a CSRF token are `loginLoad`, `confirmLoad`, and the admin shell load. The
guard applies its headers, `Cache-Control: private, no-store` included, only to an `/admin` path, so
a token issued from one of those loads mounted elsewhere travels without them.

The guard's first step, the dev-backend tripwire, refuses a flag that must never reach a deployed
Worker, and [The dev-backend flag's two refusals](#the-dev-backend-flags-two-refusals) state what
each refusal catches and what it leaves open.

## The dev-backend flag's two refusals

A deployed Worker must never carry the `CAIRN_DEV_BACKEND` flag, so the engine refuses the flag in
two places, on different terms. Both refusals read the flag from `platform.env` and `process.env`.

The first refusal belongs to the guard, which answers with a 503 on the flag alone and logs
`guard.refused` with reason `dev_backend_in_prod`. The guard can refuse on the flag alone because it
mounts only in a production build, and a site's dev branch replaces it.

The second refusal belongs to an [auth channel](#the-auth-channels-threat-surface), the seam a site
adds for a second sign-in audience on the site's member routes, which the guard's admin-path
handling never covers. [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) builds
a channel from functions the site supplies, among them `lookup`, which resolves a contact against
the channel's roster, and `deliver`, which carries a code to the contact. Every channel action
refuses with a 503 before any other work, only when the flag is set and the request counts as
deployed, because the flag is the enable contract of a dev transport, a `deliver` that prints the
code in development instead of sending it.

A request counts as deployed when the configured `PUBLIC_ORIGIN` names a non-local host, whatever
`Host` claims. A local, absent, or unparseable `PUBLIC_ORIGIN` hands the answer to the request's
hostname, so a configured origin can only move the answer toward refusing, and a deployment with no
`PUBLIC_ORIGIN` rests on `Host`.

### Limits of the dev-backend refusals

Neither refusal can see a dev-shaped transport deployed with the flag unset, since `deliver`,
`lookup`, and the rest of the channel's config are opaque site functions. A dev-branch bundle that
replaces the guard behind the build-time `__CAIRN_DEV_BUILD__` conditional sits outside both
refusals. The example site, `examples/showcase`, closes the transport case for itself with a capture
transport that refuses to deliver unless `ctx.env.CAIRN_DEV_BACKEND` is `'1'`. The engine's CI
closes the bundle case for the example site alone, with a `wrangler deploy --dry-run` of a default
build that fails if any dev-only marker survives in the output.

A request the guard admits to a guarded path belongs to a signed-in editor, and [Access map
coverage](#access-map-coverage) decides which screens that editor reaches.

## Access map coverage

An access map narrows only the targets it names, so a screen or concept the map never mentions stays
reachable to any editor-capability session.
[`canReach`](../reference/core.md#canreach-hasaccessrule) is the one function that decides both
route enforcement and nav visibility, so the two cannot drift apart, and the `editors` roster screen
stays owner-only whatever the map says. Each engine write action gates through the map against one
target, the concept id or one of the fixed screens `media`, `nav`, `settings`, or `vocabulary`,
with the exceptions that [Limits of access map coverage](#limits-of-access-map-coverage) names.

A site's action built with [`createSectionAction`](../reference/sveltekit.md#createsectionaction),
or one that opts into the map through the `access` option of
[`createAdminAction`](../reference/sveltekit.md#createadminaction), fails closed instead, at the
following three ordered gates:

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

### Allowlist semantics from an exhaustive map

A map behaves as an allowlist only when it names every concept id and every fixed engine screen, the
coverage whose absence the `config.access_unmapped` warning reports, and [Restrict admin
access](restrict-admin-access.md) gives the steps for writing one. Even an exhaustive map leaves
open a tidy or dictionary action mounted on a route without a `concept` parameter.

An editor's reach also includes the markup they write, which every visitor's browser renders, and
[Render safety](#render-safety) covers what the engine does with it.

## Render safety

Every renderer that [`createRenderer`](../reference/core.md#createrenderer) builds runs a sanitize
floor by default, seeded from GitHub's `defaultSchema`, before the `build()` dispatch or any later
stage touches the tree. A [`build()`](../reference/core.md#definecomponent) is the function a site
registers for one of its components, site-developer code that the dispatch stage runs to turn
each use of that component in the markdown into markup. The floor strips `<script>` tags, inline
event-handler attributes, and `javascript:` and `data:` URLs. The pipeline runs nine stages in a
fixed order:

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

The `sanitizeSchema` callback receives cairn's default schema, and its return replaces the floor's
schema with nothing checking that the strip survived, so the option is additive only by contract. A
callback that admits `<script>` therefore lets author script through the floor, and the sink guard
removes no script element. A `javascript:` or `data:` URL stays stripped either way, because the
sink guard's safe-scheme list comes from GitHub's schema and never from the site's.

`unsafeDisableSanitize` is a code-level switch on the renderer config, never an admin toggle, and it
removes both the sanitize floor and the sink guard. With it set, `rehype-raw` still parses author
HTML into elements, so a `<script>` or an `onerror` handler that any editor, or anyone holding an
editor's session, writes into an entry reaches the rendered HTML that the public pages serve to
every visitor. A registered `build()` can bypass every render-safety protection by rendering trusted
literal markup outside the sanitized tree, since the protections stop at the boundary of what
`createRenderer` produced.

An editor's edits reach the repository through the engine's own credential, and [The GitHub App's
reach](#the-github-apps-reach) sets out what that credential can write.

## The GitHub App's reach

Every save and publish commits through the site's GitHub App, so the App's permissions set what its
private key and installation token can write. Publishing authenticates to GitHub as the site's
GitHub App, never a personal account, with the private key held as a single Worker secret that signs
a JWT to mint a short-lived installation token. The token is cached per Worker isolate for 55
minutes and re-minted on a miss, and it is never written to disk in the deployed runtime and never
logged.

### Limits of the installation token

The App's **Contents** permission, at **Read and write**, is repository-wide, so the installation
token can write any path in the installed repository, and only engine code confines writes to the
declared content directories. Installing the App on a repository that also holds code or other
teams' content therefore puts that content inside the token's write reach. [Rotate the GitHub App
key](rotate-the-github-app-key.md) covers operating the key.

Every defense of the built-in design assumes cairn's own sign-in, and a site that replaces it with
[an identity gate](#identity-modes-threat-surface) or adds [an auth
channel](#the-auth-channels-threat-surface) moves some of them.

## Identity mode's threat surface

A site that replaces magic-link sign-in with an identity gate leaves every sign-in defense to the
gate, and cairn's part in sign-in reduces to the roster lookup. The `identity` option on
[`createAuthGuard`](../reference/sveltekit.md#createauthguard) replaces the whole built-in sign-in
path, so no token is minted, no session is created, and no session cookie is set. `identity.resolve`
reads the gate's proof of identity, and the guard looks the proven email up against the roster
exactly as it looks up a magic-link session's email. The effective session lifetime moves to the
gate, and cairn's 30-day session constant no longer applies.

No cairn step rotates the CSRF value under `identity`, so a change of gate identity in one browser
keeps the same value until a cairn logout deletes the cookie or its `Max-Age` ends. The login-moment
rotation never runs, because the confirm action is a 404 under `identity`. A cairn logout under
`identity` skips the session-row delete, still clears every cookie, and redirects to the gate's
`logoutUrl`. Every refusal the resolver produces logs `guard.refused` with reason `identity`, and a
proven email that matches no roster row logs `auth.identity.unknown`.

### Limits of identity mode

The only join between the gate and the roster is the email string the resolver returns. The guard
rejects an empty string, then trims, lowercases, and looks up the email with no cross-check, so
cairn cannot tell a directory-asserted address from a self-asserted one. A gate login method whose
email the signing-in user controls therefore lets that user sign in to cairn as any roster address
they choose to assert. Cloudflare Access, for example, takes the email from the claim the identity
provider returns, which an [OIDC provider's email claim
setting](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/)
selects. The guard makes no hostname check under `identity`, so a hostname that reaches the Worker
outside the gate's coverage is admitted whenever the resolver accepts the presented token.

[Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) sets up
the gate these risks belong to, and the other seam a site can add, an auth channel, has [a threat
surface of its own](#the-auth-channels-threat-surface).

## The auth channel's threat surface

An auth channel's sign-in form takes a contact from an unauthenticated caller, so the channel rests
on the rule that no control keyed on the victim's identity may deny, delay, or destroy anything, and
denial keys only on the requester. An identity-keyed control either escalates through a channel the
site can act on or only logs. The rule shapes the three controls that could otherwise deny a
sign-in:

- Escalation answers `challenge-required`, a retry invitation and never a hard failure, and a failed
  challenge on an escalated action answers it again.
- Eviction keys on the requester's bucket, so a caller crowds out only its own pending rows.
- The spend ceiling never denies, and crossing it logs `auth.channel.ceiling_exceeded` at error to
  alert the site operator.

Every channel action asserts that the request's `Origin` matches the site's origin and that the
connection is https, except on a local development host, before any code, budget, or session logic
runs, and either failure throws a plain 403 with no wire result. The check mirrors the guard's rule
because the guard's admin-path handling never covers a site's member routes, where the guard
restores only the framework's origin check for unsafe form posts.

The channel correlates identity through a salted hash of the subject, prefixed `'s:'`, when a roster
lookup resolved one, or of the contact, prefixed `'c:'`, otherwise, and its logs carry only the
first 16 hex characters of that hash, never the raw contact. The prefixes keep a subject-derived
identity from colliding with a contact-derived one, and the per-deployment salt, provisioned on
first use, keeps the hash from reversing against a small contact space.

A numeric confirmation code is drawn by rejection sampling over Web Crypto random bytes, which
avoids the low-end bias that a naive modulo introduces. The random source matters because [NIST's
digital identity guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) require the secrets
behind authenticators to come from an approved random bit generator.

### Limits of the auth channel

A dev transport that prints a channel's code to the console is a roster oracle by construction,
since delivery runs only for a known subject, so an unauthenticated caller learns whether any
contact is on the roster without guessing a code. The same transport, run in a deployed Worker with
observability on, lands plaintext one-time codes in Workers Logs. No such transport ships in engine
code, and the hazard is one that a site's `deliver` could introduce.

[Add a second sign-in group](add-a-second-sign-in-group.md) builds a channel, and [Config
obligations](../reference/auth-channel.md#config-obligations) states what each supplied function
owes.

## The site's responsibilities

In short, cairn makes an editor's sign-in hard to take, and what a taken session reaches depends on
how the site configures it, so the following responsibilities stay with the site:

- Treating the setup command's first sign-in link and any recovery row seeded by hand as unbound,
  since neither carries the browser binding's protection.
- Serving every route over https, so a `__Host-` cookie minted outside `/admin` is not discarded.
- Setting `csrf: { checkOrigin: false }` in `svelte.config.js` and mounting the guard, which then
  owns CSRF for the admin.
- Keeping `Referrer-Policy: no-referrer` off the site-wide default.
- Configuring `kit.csp` when the site wants a Content-Security-Policy.
- Mounting `loginLoad`, `confirmLoad`, and the admin shell load under `/admin`, where the guard's
  headers apply.
- Keeping dev transports and the `CAIRN_DEV_BACKEND` flag out of a deployed Worker, with a refusal
  inside any dev-shaped transport.
- Making an access map exhaustive when the site intends an allowlist.
- Mounting the tidy and dictionary actions on a route that carries a `concept` parameter.
- Starting every `sanitizeSchema` callback from the schema it receives and only adding to it.
- Leaving `unsafeDisableSanitize` unset.
- Reviewing the output of every registered `build()`.
- Treating everything in the App's repository, code included, as inside the installation token's
  write reach.
- With an identity gate, allowing only gate login methods whose email the signing-in user cannot
  control.
- With an identity gate, putting every hostname that reaches the Worker behind the gate.
- Meeting the [config obligations](../reference/auth-channel.md#config-obligations) on each function
  a site supplies when it builds an auth channel.

## Related resources

The following resources cover the tasks, the system, and the standards behind these defenses.

### How-to guides

The following guides configure and operate the parts of a site these defenses depend on:

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
- [NIST's digital identity guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html), for the
  random generation of authenticator secrets.
- [SvelteKit's CSP configuration](https://svelte.dev/docs/kit/configuration#csp), for adding a
  Content-Security-Policy.
