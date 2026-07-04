# cairn DX feedback: magic-link auth can't reach editors, and the failure is silent (ecxc 0.35.0)

Filed 2026-06-08 from ecxc.ski (the renamed ecnordic.ski) running `@glw907/cairn-cms@^0.35.0`, during a
post-domain-cutover login check. The behaviour described here is present in the deployed 0.35.x and still
present on `main` (0.37.0); only a log call changed between them.

**Severity: blocker for multi-editor use.** Two faults compound. The default sender (`cloudflareSend`) can
only deliver to addresses that an account admin pre-verified in the Cloudflare dashboard, which the editor
model cannot satisfy. And when the send fails for that or any other reason, cairn reports success, so the
failure is invisible. The first fault breaks the core use case; the second hid it for an afternoon.

## Symptom

A real admin could not log in. Every magic-link request, from the browser and from a scripted form POST,
returned the success state and showed the "check your email" confirmation. No email arrived. There was no
error in the UI, no error in the form result, and nothing to tell the operator that anything had gone wrong.

The login page behaved as if mail was flowing. It was not.

## Root cause: the send is fire-and-forget, and the action always returns `{ sent: true }`

`requestAction` in `src/lib/sveltekit/auth-routes.ts` is typed `Promise<{ sent: true }>` and returns that
literal at the end, unconditionally. The send is a backgrounded side effect whose only failure handling is a
log line:

```ts
const sending = send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link })).catch(
  (err) => log.error('auth.link.send_failed', { email, error: String(err) }),
);
const ctx = event.platform?.ctx ?? event.platform?.context;
if (ctx?.waitUntil) ctx.waitUntil(sending);
else await sending;
// ...
return { sent: true };
```

`cloudflareSend` (`src/lib/email.ts`) calls `env.EMAIL.send(message)`. When that throws, the rejection is
caught, logged, and dropped. The action result is unaffected. So a hard delivery failure is invisible
everywhere the operator can see: the form result, the page, and the action's type all say success.

The actual failure, captured from a live `wrangler tail` on the deployed Worker:

```
POST https://ecxc.ski/admin/login - Ok @ 6/8/2026, 8:36:23 PM
  (error) cairn: magic-link send failed Error: destination address is not a verified address
```

(The tail "Ok" is the Worker outcome, not the send outcome. The send threw inside the backgrounded promise.)

## The deeper problem: three silent "no email" paths look identical

An operator debugging "no email arrived" has to distinguish three outcomes, and cairn makes all three return
`{ sent: true }` with no operator-visible difference:

1. **The address is not an editor.** `findEditor` returns null, the `if (editor)` block is skipped, no send
   happens. This is deliberate, for the non-leak property.
2. **The cooldown window is open.** A token was issued for this email within `SEND_COOLDOWN_MS` (60s), so the
   reissue and send are skipped. Also deliberate, also non-leak.
3. **The send threw.** A real infrastructure failure (see below). This is an error, not a design choice, but
   it reads the same as the two intentional skips.

Only the third is a fault, yet from the outside it is indistinguishable from the first two. Diagnosing it took
a Worker tail plus a read of the editor allowlist in D1. Nothing short of that could separate "you typed a
non-editor address" from "you are inside the 60s cooldown" from "the send is throwing on every attempt."

## The serious bug: `cloudflareSend` cannot reach editors

The send threw because Cloudflare's `send_email` binding only delivers to a **verified Email Routing
destination address** on the account. This holds even for an unrestricted binding (no `destination_address`):
unrestricted means "any of your verified destinations," not "any address on the internet." A destination is
verified by an account admin adding it in the Cloudflare dashboard, after which Cloudflare emails that address
a confirmation link the recipient must click.

That requirement is incompatible with how cairn defines access. Editors are added by email to the allowlist.
They are content people, not infrastructure operators, and they will not (and for security should not) have
access to the Cloudflare control panel for the site's account. So an editor invited by email has no way to
become a verified destination, and `cloudflareSend` can never deliver their magic link. The send throws
`destination address is not a verified address`, and per the bug below, the editor just sees "check your
email" forever.

This is not a documentation gap. It means the shipped default sender only works for a single operator who
happens to control the Cloudflare account and verifies their own address by hand. For any real allowlist of
editors, magic-link login is unreachable.

The good news: cairn already makes the sender injectable. `requestAction` uses `config.send ?? cloudflareSend`
(`src/lib/sveltekit/auth-routes.ts`), and `SendMagicLink` is a clean seam. The fix is a sender that does not
depend on Cloudflare destination verification, not a change to the auth flow.

## Suggestions

1. **Ship a sender that can reach arbitrary editors, and make it the documented default.** Cloudflare ended
   the free MailChannels path, so a Worker sending to unverified recipients now needs a transactional provider
   (Resend, Postmark, SES, and similar) called over `fetch` with an API key. cairn already has the seam:
   provide a reference sender (for example `httpSend` against a provider's REST API, keyed by a secret) and
   point multi-editor deployments at it through `config.send`. Reframe `cloudflareSend` as the single-operator
   option, for a site whose one owner controls the Cloudflare account and verifies their own address. This is
   the load-bearing fix; without it, magic-link login does not work for a real editor list.

2. **Make a send failure observable to the operator.** The non-leak property protects against revealing
   whether an address is an editor. A send that throws has already passed the editor check, so surfacing
   "delivery failed, check the Worker logs" after that point leaks little. At minimum, return a distinct shape
   or a status the login page can render when the send rejects, separate from the intentional skips. A louder,
   structured error with a stable code would also help an operator grep for it.

3. **Offer a preflight or doctor check.** A `cairn doctor`-style command (or an admin diagnostic) that
   confirms the configured sender can actually deliver: that `config.send` is set for a multi-editor site, or
   that the sender domain has Email Routing active and each editor is a verified destination for the
   single-operator `cloudflareSend` path. This turns a silent runtime failure into a setup-time check.

4. **Document the limitation either way.** Whatever the default, state plainly which sender reaches arbitrary
   editors and which does not. Include the exact Cloudflare error string (`destination address is not a
   verified address`) so it is greppable.

5. **Consider surfacing the cooldown.** A "you requested a link recently, check your inbox or wait a moment"
   hint would remove one of the three ambiguous paths without leaking editor existence (the hint can be shown
   for any address).

## Scope

Item 1 is the real fix: the shipped default cannot serve the editor model, so it has to change. Item 2 is
what kept the failure hidden, so it is close behind. The ecxc-specific question of which address to seed as
owner (`geoff@907.life` vs the historical `geoff-login@907.life`) is ours to resolve in the site, not a cairn
issue. It is mentioned only because the non-editor silent skip (path 1 above) compounded the confusion while
we chased the real fault.
