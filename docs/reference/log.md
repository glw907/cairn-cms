# Log (`/log`)

Available since 0.97.0. This subpath exports the factory the engine's own logger is built from, so
a site that wants structured logs in the same shape as [the engine's own events](./log-events.md)
uses it instead of writing its own `console` wrapper.

```ts
import { createLogger, CAIRN_LOG_EVENTS, REDACTED_LOG_KEYS } from '@glw907/cairn-cms/log';
```

The narrowed promise: `createLogger` returns exactly three methods (`info`, `warn`, `error`); every
record carries `level`, `event`, and `timestamp` as its last three keys, in that order; every field
whose key matches a `REDACTED_LOG_KEYS` member on the whole key is replaced with `'<redacted>'`; and
`CAIRN_LOG_EVENTS` lists every member of `CairnLogEvent`. The sink a record reaches (`console`
today) is not promised and may change; every `createLogger` instance shares one sink, so a future
subscriber sees one stream regardless of how many callers exist.

**How a key is matched.** Both sides normalize: the key and each list member are lowercased and
their `-` and `_` characters removed, then compared whole. So `apiKey`, `api_key`, and `API-KEY` all
match the single `api_key` member, while `tokenLength` (`tokenlength`) and `x-api-key` (`xapikey`)
do not, because the comparison is against the whole key, never a substring.

**How deep redaction goes.** Three levels. A key at level one (a record's own field), level two (a
field inside a headers bag), or level three (a field inside an object inside an array) is matched;
a key at level four or deeper is left as written. Each nested plain object and each array counts as
one level. A repeated reference reads as `'<cycle>'` rather than being walked twice, so a cyclic
payload cannot hang the logger. Anything that is not a plain object or an array, a `Date`, an
`Error`, a class instance, is passed through untouched.

**Never log:** a magic-link token, a URL that carries one in its query, a session ID or cookie, an
`Authorization` header, a GitHub App private key, or anything read from `.dev.vars`.
`REDACTED_LOG_KEYS` catches the field names this list already covers, but a value in an unrelated
field escapes it: redaction matches a key, never a value. The two shapes that bite are a full `url`
field, whose query string can carry a token, and an error message that embeds one. Scrub the value
at the call site, as the `createLogger` example below does, and read any record before pasting it
somewhere else.

---

## `createLogger`

Stability tier: Extension API.

```ts
function createLogger<Event extends string>(options?: { redactKeys?: readonly string[] }): {
  info(event: Event, fields?: Record<string, unknown>): void;
  warn(event: Event, fields?: Record<string, unknown>): void;
  error(event: Event, fields?: Record<string, unknown>): void;
};
```

Builds a logger scoped to one event union. Call it once per event vocabulary and hold the result,
the way [the engine's own `log`](./log-events.md) is `createLogger<CairnLogEvent>()`. Each method
takes the event name and an optional fields object:

```ts
import { createLogger } from '@glw907/cairn-cms/log';

type MySiteEvent = 'signup.created' | 'signup.failed';
const log = createLogger<MySiteEvent>({ redactKeys: ['memberNumber'] });

declare const email: string;
declare const err: unknown;

log.info('signup.created', { email });
log.error('signup.failed', { error: String(err).replace(/token=[^&\s]+/g, 'token=<redacted>') });
```

An event string outside `Event` fails to type-check, so the vocabulary stays closed at compile time.

`options.redactKeys` names your own field names to redact, `memberNumber` above. They union with
`REDACTED_LOG_KEYS` and never replace it, so passing your own list cannot narrow the engine's. Each
name normalizes the same way, so one spelling covers every separator form.

The `error` field shows the other half of the job: redaction matches a key, so a token inside a
message string is yours to strip before it reaches the record.

## `CAIRN_LOG_EVENTS`

Stability tier: Extension API.

```ts
import type { CairnLogEvent } from '@glw907/cairn-cms/log';

declare const CAIRN_LOG_EVENTS: readonly CairnLogEvent[];
```

Every member of `CairnLogEvent`, the engine's own event vocabulary documented on
[log events](./log-events.md), as a runtime array. A site validating an event string read from
untyped input (a webhook payload, a stored log line) checks it against this array instead of
re-deriving the vocabulary by hand. The array is frozen, so a `push` throws rather than corrupting a
vocabulary two of the engine's own gates parse by shape.

## `REDACTED_LOG_KEYS`

Stability tier: Extension API.

```ts
declare const REDACTED_LOG_KEYS: readonly string[];
```

The field-name keys `createLogger`'s redaction matches on the whole normalized key: `token`,
`secret`, `password`, `cookie`, `set-cookie`, `authorization`, `bearer`, `jwt`, `session_id`,
`session_token`, `access_token`, `refresh_token`, `auth_token`, `api_key`, `private_key`,
`client_secret`, `webhook_secret`. Each name is spelled once, because normalization collapses the
separator forms: the `session_id` member also matches `sessionId` and `session-id`. A key that only
contains one of these words, `tokenLength` or `hasSession`, is not a match. The array is frozen; add
your own names through `createLogger`'s `redactKeys` option. A site running its own
log-secret-field check against its own event handlers reads this array rather than hard-coding the
list a second time.

## `CairnLogEvent`

Stability tier: Extension API.

```ts
type CairnLogEvent =
  | 'auth.link.requested'
  | 'auth.link.refused'
  | 'auth.link.send_failed'
  | 'auth.token.minted'
  | /* 75 more members, documented row by row on log events */ never;
```

The engine's own event union, re-exported here so a consumer can name it, for a wrapper function
or a shared logging helper that must type its `event` parameter. The full, current membership is
the table on [log events](./log-events.md), the source both pages stay in step with; this page does
not repeat it.
