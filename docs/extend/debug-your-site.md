# Debug your site

A symptom you can only fix by changing code: your adapter, your schema, your custom admin route,
or your render function. Something failed, a log event named why, and the next move is an edit and
a redeploy, not a dashboard setting or a wait.

Three surfaces divide cairn's diagnostics by what they key on. [The admin's setup
recovery](../admin/setup-recovery.md) keys on `create-cairn-site`'s own step names and state file,
for a setup run that stalled or failed partway. [The admin's
troubleshooting](../admin/troubleshooting.md) keys on observed site behavior, for a symptom an
admin who never opens an editor can see and act on. This page keys on log events whose cause lives
in a site's own source, for the developer who wrote the adapter or the custom route in question.
All three read the same [log event vocabulary](../reference/log-events.md).

Every event below fires from engine code that runs inside a site's own extension points: a
concept's `fieldset`, a `createSectionAction`-wrapped route, a public route factory a site
constructed by hand. None of them describes an engine bug or an infrastructure gap; each one is
the engine reporting that the surrounding site code did something the contract does not allow.

| You see | Log event | What happened | Fix |
| --- | --- | --- | --- |
| A tag filter or the site's tag index reads empty even though entries carry tags in that field. | [`taxonomy.unmarked_field`](../reference/log-events.md) (warn) | The concept declares a multiselect field named `tags`, `freetags`, or `categories`, but no field on the concept carries `taxonomy: true`. The tag index only ever reads the field marked that way, so it builds from nothing. | Add `taxonomy: true` to the field the concept actually uses for tags, in its `fieldset` declaration. See [Core](../reference/core.md) for the field option. |
| A save that should have been rejected went through with a value that looks wrong, and the vocabulary admin didn't say anything. | [`content.field_behavior_failed`](../reference/log-events.md) (warn) | A field's own `behavior.validate()` threw during save-time validation. The engine catches the throw and treats the field as valid rather than failing the whole save, so the bad value lands. | Fix the throwing `validate()` function on that field's `behavior`. Check the `error` the event carries for the exception message; a `validate()` that can throw on ordinary input needs its own input handling, not a bare assumption. |
| A public page renders a literal `media:` token in place of a picture. | [`media.resolver_absent`](../reference/log-events.md) (warn, once at construction) | The public route factory was built with media configured on (the adapter declares a `media` block), but no `resolveMedia` function was ever wired into it. Every `media:` reference the render pipeline meets has nothing to resolve it against. | Wire `resolveMedia` into the route factory's options. See [Delivery](../reference/delivery.md) and [Media](../reference/media.md) for the resolver's shape. |
| A custom `/admin` route built with `adminAction` throws in local development the moment it runs. | [`admin.action.unaudited`](../reference/log-events.md) (error in production; a thrown `UnauditedActionError` in dev) | The action returned normally without ever calling `ctx.audit`, and every `adminAction`-wrapped route that mutates something must audit what it did. Dev throws immediately so this is caught before a deploy; production logs instead of throwing, since a redirect or an error response mid-request would be worse than a gap in the trail. | Call `ctx.audit(...)` once for every state change the action makes, including on a path that returns early. See [SvelteKit](../reference/sveltekit.md#adminaction). |
| A custom admin action's audit trail is missing entries and nothing else looks wrong. | [`admin.action.sink_threw`](../reference/log-events.md) (error) | The site's own `event.locals.cairnAuditSink` threw synchronously or returned a rejected promise. `ctx.audit` already ran and the action still completed; only the record of it was lost. | Check the site's own audit sink implementation for the exception. If the site uses the packaged [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink), check `audit.sink.write_failed` instead, since that sink catches its own failures before this event can fire. |
| A rate limit configured on a custom action never seems to trigger, even well past the stated limit. | [`admin.action.rate_limit_absent`](../reference/log-events.md) or [`admin.action.rate_limit_failed`](../reference/log-events.md) (both warn) | Either the configured rate limit's binding resolves to nothing (`rate_limit_absent`), or the binding is present but its `key()` call threw, or the resolved limiter's own `limit()` call threw (`rate_limit_failed`, which also carries the `error`). Both degrade to open rather than blocking, on purpose: a broken limiter should never itself become an outage. | For `rate_limit_absent`, check the binding name against the site's `wrangler.jsonc`. For `rate_limit_failed`, fix the `key()` function named in the `createSectionAction` config, or the limiter your `resolve` function returns. See [SvelteKit](../reference/sveltekit.md#createsectionaction). |
| A custom admin action returns a `500` to every caller, owner included, or a route mounted through `createSectionAction` refuses everyone. | [`admin.action.misconfigured`](../reference/log-events.md) (error) | Either `config.resolveDb` returned `null` or `undefined` (`reason: 'db_not_bound'`), or `event.locals.cairnAccess` was never attached, meaning the admin guard never ran on this route (`reason: 'access_map_not_attached'`). | For `db_not_bound`, fix the `resolveDb` function passed to `createSectionAction`. For `access_map_not_attached`, check where the route is mounted; a route outside the guard's coverage never gets `locals.cairnAccess` set. See [Restrict admin access](./restrict-admin-access.md). |
| A settings screen or the nav editor silently falls back to an empty list, or a settings save fails with a generic message and no detail. | [`config.invalid`](../reference/log-events.md) (error) | The committed site config failed to parse or failed validation. Two loads degrade to an empty result rather than failing the screen (`scope: 'nav'`, `scope: 'vocabulary'`); two saves answer `fail(500)` with generic copy while the parser's real message stays in this log record (`scope: 'settings'`, `scope: 'vocabulary'`). | Read the `error` field in the log record; it carries the parser's own message, which the response deliberately does not. Fix the site config or the schema declaration that produced the invalid state. |

A symptom that isn't here and doesn't trace to any event in [the reference
table](../reference/log-events.md) is not a code-fixable case this page can name in advance; check
[the admin's troubleshooting page](../admin/troubleshooting.md) for the operational half, or file
it once you've confirmed no engine event correlates.

## A visual-regression baseline fails on a calendar day, with no code change

If your own rendering reads the live system clock, a "posted 3 days ago" label, a copyright year,
a relative timestamp, the string it produces drifts every day the clock does, even though nothing
in your source changed. A CI run that captures a screenshot baseline today and compares it against
a rebuild next week sees a different string and fails, and the failure looks like flakiness rather
than what it is: your test and your render disagreeing about what day it is.

The fix is a fixed-today seam your own code reads only from `platform.env`, never from `Date.now()`
directly inside a component or a route a test also renders:

```ts
// src/lib/today.ts
export function today(env: { CAIRN_FIXED_TODAY?: string }): Date {
  return env.CAIRN_FIXED_TODAY ? new Date(env.CAIRN_FIXED_TODAY) : new Date();
}
```

<!-- snippet-check-skip: reads App.Platform (event.platform.env), which only the site's own app.d.ts declares -->
```ts
// src/routes/+page.server.ts
import { today } from '$lib/today.js';

export const load = (event) => {
  return { today: today(event.platform?.env ?? {}) };
};
```

`new Date(env.CAIRN_FIXED_TODAY)` yields an `Invalid Date` silently on a malformed value rather
than throwing, so guard or validate the string before trusting it, or a typo in `CAIRN_FIXED_TODAY`
surfaces as a mysteriously wrong baseline instead of a loud failure. Write the string as an
explicit instant (`2026-08-29T00:00:00Z`, not the bare `2026-08-29` date-only form): the date-only
form parses as UTC midnight, so a render on a machine west of UTC formats it as the *previous*
local day, and a baseline pinned on one side of that boundary disagrees with a rebuild formatted on
the other. Format any date your own code derives from `today()` in a timezone-stable way (UTC, or
an explicit fixed zone), not the runner's local timezone, for the same reason.

The call site is what makes the seam real: `today` never reads `platform.env` for itself, so
every route that needs the date passes `event.platform?.env` in explicitly, the same value a test
can override with `CAIRN_FIXED_TODAY` and production never sets.

Wire the binding in your CI job or your `wrangler.jsonc`'s local `vars`, never in production; a
deploy with no `CAIRN_FIXED_TODAY` set falls back to the real clock exactly as before. Every place
that renders a date reads through this one function, so a baseline captured on one day and a
rebuild compared against it on another day both see the same pinned date, and the baseline holds
until you deliberately change it.

This seam only pins the value `today()` returns; it needs a real `platform.env` to read from,
which `event.platform` is under `wrangler dev`/`wrangler pages dev` and is not under plain `vite
dev` or `vite preview`. Outside the Workers runtime `event.platform` is `undefined`, so
`event.platform?.env ?? {}` silently falls back to `{}`, `CAIRN_FIXED_TODAY` is never read, and
`today()` returns the live clock with no error to say so. Run the CI job that captures a
visual-regression baseline under the Workers runtime (`wrangler pages dev`, or your adapter's
equivalent), or, for a non-Workers dev server, read the same variable from `process.env` as a
fallback so the pin still takes effect locally:

```ts
// src/lib/today.ts
export function today(env: { CAIRN_FIXED_TODAY?: string }): Date {
  const fixed = env.CAIRN_FIXED_TODAY ?? process.env.CAIRN_FIXED_TODAY;
  return fixed ? new Date(fixed) : new Date();
}
```
