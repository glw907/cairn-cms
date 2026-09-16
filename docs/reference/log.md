# Log (`/log`)

Available since 0.97.0. This subpath exports the factory the engine's own logger is built from, so
a site that wants structured logs in the same shape as [the engine's own events](./log-events.md)
uses it instead of writing its own `console` wrapper.

```ts
import { createLogger, CAIRN_LOG_EVENTS, REDACTED_LOG_KEYS } from '@glw907/cairn-cms/log';
```

The narrowed promise: `createLogger` returns exactly three methods (`info`, `warn`, `error`); every
record carries `level`, `event`, and `timestamp` as its last three keys, in that order; every field
whose key matches a `REDACTED_LOG_KEYS` member, case-insensitively and on the whole key, is replaced
with `'<redacted>'`; and `CAIRN_LOG_EVENTS` lists every member of `CairnLogEvent`. The sink a record
reaches (`console` today) is not promised and may change; every `createLogger` instance shares one
sink, so a future subscriber sees one stream regardless of how many callers exist.

**Never log:** a magic-link token, a session ID or cookie, an `Authorization` header, a GitHub App
private key, or anything read from `.dev.vars`. `REDACTED_LOG_KEYS` catches the field names this
list already covers, but a value pasted into an unrelated field, an error message that embeds a
token, for one, escapes it: redaction matches a key, never a value, so treat any record before
pasting it somewhere else as unverified until you have read it.

---

## `createLogger`

Stability tier: Extension API.

```ts
function createLogger<Event extends string>(): {
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
const log = createLogger<MySiteEvent>();

declare const email: string;
declare const err: unknown;

log.info('signup.created', { email });
log.error('signup.failed', { error: String(err) });
```

An event string outside `Event` fails to type-check, so the vocabulary stays closed at compile
time.

## `CAIRN_LOG_EVENTS`

Stability tier: Extension API.

```ts
import type { CairnLogEvent } from '@glw907/cairn-cms/log';

declare const CAIRN_LOG_EVENTS: readonly CairnLogEvent[];
```

Every member of `CairnLogEvent`, the engine's own event vocabulary documented on
[log events](./log-events.md), as a runtime array. A site validating an event string read from
untyped input (a webhook payload, a stored log line) checks it against this array instead of
re-deriving the vocabulary by hand.

## `REDACTED_LOG_KEYS`

Stability tier: Extension API.

```ts
declare const REDACTED_LOG_KEYS: readonly string[];
```

The field-name keys `createLogger`'s redaction matches, case-insensitively and on the whole key:
`token`, `secret`, `password`, `cookie`, `authorization`, `session_id`, `sessionId`, `apiKey`,
`privateKey`. A key that only contains one of these words, `tokenLength` or `hasSession`, is not a
match. A site running its own log-secret-field check against its own event handlers reads this
array rather than hard-coding the list a second time.

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
