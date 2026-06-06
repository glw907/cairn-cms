# The security model

cairn owns three trust boundaries: who may edit, what a save is allowed to write to the repo, and
what an author's markdown is allowed to render in a visitor's browser. This page explains each one
and why it is built the way it is. It links the reference for exact helper signatures and the render
floor for the keep/strip/rewrite detail, so it stays an explanation rather than a restatement.

## Authentication

An editor logs in by email. There is no GitHub account to hold and no password to manage. A
non-technical author is the audience, so the login has to ask for the one thing they already have,
their inbox.

The flow is a self-owned magic link. A request for a link looks the email up in an allowlist. On a
match it mints a fresh 256-bit token, stores only the SHA-256 hash of that token, and emails a
confirmation link carrying the raw token. The response is identical whether or not the email was on
the allowlist, so the endpoint never leaks who is an editor. A per-email cooldown caps the send to
once a minute, so the endpoint cannot flood an inbox.

Confirming the link is a POST, not the GET that opening the link performs. An email scanner that
follows the link consumes nothing, because only the POST verifies. The confirm handler hashes the
submitted token and consumes it in one atomic statement:

```sql
DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email
```

A returned row means the token was present, unexpired, and is now gone. The link is single-use by
construction. This is the one place the storage choice is load-bearing. Cloudflare D1 is strongly
consistent, so the delete-and-return cannot race with itself. KV was the rejected alternative here:
its reads are eventually consistent, so two confirmations of the same link could both read the token
as live before either delete lands, and the single-use guarantee would not hold.

A valid confirmation creates an opaque session row in D1 and sets a cookie holding the random session
id. The cookie carries the `__Host-` prefix on https, which binds it to the exact origin: the browser
enforces `Secure`, `Path=/`, and no `Domain`. On local http dev the prefix drops, because `__Host-`
requires `Secure` and a dev cookie cannot set it. The session id is opaque, so the cookie reveals
nothing and is worthless off its origin.

Every request through the `/admin/**` guard resolves the session row back to its editor by joining the
allowlist, so the role is read live. A role change or a removed editor takes effect on the next
request, with no token to revoke and no cache to clear. Two roles exist, `owner` and `editor`. Editors
edit content. Owners also manage the editor list. An owner cannot remove or demote the last remaining
owner, and that rule lives in the SQL itself: the count of owners is part of the `DELETE`, so two
concurrent removals cannot both pass a separate check and strand the site at zero owners.

See [the core reference](../reference/core.md#auth-and-github-app) for the auth helper signatures.

## Commit trust

A save commits markdown to the repo's default branch, which auto-deploys. The identity on that commit
matters, so cairn splits it. The commit author is the editor who saved, derived from the verified
server-side session and never from request input. The committer is the GitHub App, which GitHub
attributes to `cairn-cms[bot]`. A reader of the git history sees who wrote the words and that the
machinery, not a person's own credentials, performed the write.

A GitHub App is the deliberate choice over a personal access token. The App's permissions are scoped
to the contents of the installed repositories, and its installation token is short-lived. A personal
access token would tie every site's commits to one human's account and carry that account's full
reach. The App keeps the write scoped to the repo and removes the personal account from the path.

The App authenticates with a private key, and that key needs careful handling on Cloudflare's runtime.
GitHub issues the key in PKCS#1 form. The Web Crypto `importKey` that Workers run takes only PKCS#8.
cairn wraps the PKCS#1 key as PKCS#8 in process, with no Node built-ins and no octokit in the bundle,
then signs an RS256 App JWT and exchanges it for the short-lived installation token. A warm isolate
memoizes that token for most of its hour, so a burst of saves does not re-sign on every request.

The commit helper cannot enforce two preconditions on its own, so the save and lifecycle paths must.
Every write path is confined to the site's configured content directories, because the App token can
write anywhere in the repo. The commit author comes from the session, never from the request. A
stale-base commit fails safe as a conflict the editor reapplies, never a silent merge.

The JWT signing, the token mint, and the commit helper are internal to the engine, which wires them
behind the content routes, so a consuming site never calls them directly. See [the core
reference](../reference/core.md#auth-and-github-app) for the public auth surface.

## Render safety

Author markdown can carry raw HTML, and a site delivers the rendered output with `{@html}`. Without a
floor, an author could write a `<script>` tag or a `javascript:` link and have it run in a visitor's
browser. The threat is stored cross-site scripting through content an editor controls.

The guarantee is a `rehype-sanitize` floor that runs by default. The allowlist starts from
`hast-util-sanitize`'s GitHub-lineage `defaultSchema` and admits only what cairn's render needs on top
of it. A site can extend the allowlist through the `sanitizeSchema` option, which receives the safe
base and returns the schema to use. The extension can only add to the allowlist, never weaken the
dangerous strip. A developer-only `unsafeDisableSanitize` escape turns the floor off entirely, for a
site whose content is fully developer-controlled. It is a code-level adapter decision and never an
editor-facing setting. See [the render sanitize floor](../render-sanitize-floor.md) for exactly what
the floor keeps, strips, and rewrites.

A second guard covers the component dispatch. The floor runs before the dispatch, so a component's
`build()` output does not pass through it, because a component emits inline SVG icons and other markup
the floor would strip as unknown. A post-dispatch guard runs last in `createRenderer`, over the fully
built tree, under the same `unsafeDisableSanitize` switch as the floor. It scheme-checks every
URL-bearing attribute a `build()` could route a raw author value into, including `href`, `src`,
`srcset`, `xlink:href`, `poster`, `formaction`, `action`, an `<object>`'s `data`, and `background`,
against the same safe-scheme set the floor uses. It also drops every inline `on*` handler and strips
inline `style`. A `build()` can no longer emit an unsafe URL scheme, an event handler, or inline style,
whether or not an author supplied the value.

A narrow boundary remains. The guard checks attributes, so it does not strip a `build()`-emitted raw
`<script>`, `<style>`, or `<iframe srcdoc>` element node, and it leaves the anchor `ping` beacon. A
site developer writes the `build()` functions, so emitting one of those nodes is
site-developer-controlled code, not a path an author reaches through markdown alone.

## Origin and CSRF

The magic-link confirmation origin comes from `PUBLIC_ORIGIN` in config, never from a request header.
A forged `Host` header cannot redirect a link somewhere an attacker controls. The origin guard also
requires https in production, so the link and the `__Host-` cookie stay origin-bound. http is allowed
only for `localhost` and `127.0.0.1`, matched exactly, so a lookalike host cannot skip the https
requirement.

Form actions inherit SvelteKit's built-in cross-origin protection, which rejects a form POST whose
origin does not match the app. The session cookie is `SameSite=Lax`, so a cross-site request does not
carry it on the kind of request that would forge a write. Cookie, CSRF, and session hygiene are the
project's responsibility under self-owned auth, and the contract and integration tests cover the known
failure modes.
</content>
</invoke>
