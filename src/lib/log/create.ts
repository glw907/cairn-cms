// The generic logger factory. createLogger<Event> is what the engine's own log instance in
// emit.ts composes, and what a consumer site imports from the /log subpath to get the same
// record shape and redaction over its own event union.

/** A log level: info for a normal occurrence, warn for a recoverable fault, error for one that is not. */
export type LogLevel = 'info' | 'warn' | 'error';

/** A structured log record: caller-supplied fields plus the envelope, written last. */
export interface LogRecord {
  level: LogLevel;
  event: string;
  timestamp: string;
  [field: string]: unknown;
}

/**
 * The field-name keys whose value a record replaces with `'<redacted>'`. A key matches when its
 * normalized form, lowercased with `-` and `_` removed, equals a normalized member of this list, so
 * every separator spelling of one name collapses onto one entry: `session_id`, `sessionId`, and
 * `session-id` all match the single `session_id` member, which is why the list spells each name
 * once. The comparison is against the whole normalized key, never a substring, so `tokenLength`
 * (`tokenlength`) and `hasSession` (`hassession`) are not a match and pass through unchanged.
 * Frozen: a site adds its own keys through `createLogger`'s `redactKeys` option, which unions with
 * this list rather than replacing it.
 */
export const REDACTED_LOG_KEYS: readonly string[] = Object.freeze([
  'token',
  'secret',
  'password',
  'cookie',
  'set-cookie',
  'authorization',
  'bearer',
  'jwt',
  'session_id',
  'session_token',
  'access_token',
  'refresh_token',
  'auth_token',
  'api_key',
  'private_key',
  'client_secret',
  'webhook_secret',
] as const);

// How far into a record's own field values the redaction walks. A secret is routinely one level
// down (a headers bag) or two (a row array of objects), and three levels covers both without
// walking an arbitrarily deep payload a log record should not be carrying in the first place. A key
// at level four or deeper is left as written, which the /log reference page states as the cap.
const MAX_REDACTION_DEPTH = 3;

/** The whole-key comparison form: lowercased, with the two separator characters removed. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

const DEFAULT_REDACTED_KEYS: ReadonlySet<string> = new Set(REDACTED_LOG_KEYS.map(normalizeKey));

/**
 * Whether a value is a plain object the redaction should walk into. A class instance, a Date, a
 * Map, or an Error is left alone: walking one would rebuild it as a plain object and lose whatever
 * a sink's own serializer makes of it.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// `level` is the level of the object or array this value was read FROM, so a container found here
// would hold its own keys one level deeper; at the cap the value is returned as written. The seen
// set spans the whole walk rather than one branch, so a second appearance of the same object reads
// as '<cycle>' whether it is a true cycle or a reference shared between two branches: a log record
// is not a serialization format, and bounding the walk matters more than reproducing a graph.
function redactValue(
  value: unknown,
  level: number,
  keys: ReadonlySet<string>,
  seen: WeakSet<object>
): unknown {
  if (level >= MAX_REDACTION_DEPTH) return value;
  if (Array.isArray(value)) {
    if (seen.has(value)) return '<cycle>';
    seen.add(value);
    return value.map((item) => redactValue(item, level + 1, keys, seen));
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return '<cycle>';
    seen.add(value);
    return redactObject(value, level + 1, keys, seen);
  }
  return value;
}

// Replaces every field whose whole normalized key matches a member of `keys` with '<redacted>', and
// recurses into a plain object or array value so a secret nested in a headers bag or a row array is
// caught too. The result is assembled on a null-prototype intermediate so an own '__proto__' key in
// the source survives as an own key rather than being swallowed by Object.prototype's own setter;
// the spread that returns it copies own keys by definition, never through that setter.
function redactObject(
  fields: Record<string, unknown>,
  level: number,
  keys: ReadonlySet<string>,
  seen: WeakSet<object>
): Record<string, unknown> {
  const redacted = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(fields)) {
    redacted[key] = keys.has(normalizeKey(key))
      ? '<redacted>'
      : redactValue(value, level, keys, seen);
  }
  return { ...redacted };
}

const sinkByLevel: Record<LogLevel, (record: LogRecord) => void> = {
  info: (record) => console.log(record),
  warn: (record) => console.warn(record),
  error: (record) => console.error(record),
};

/**
 * Builds one log record from a level, an event name, and its fields, redacting against the given
 * normalized key set (the documented defaults when a caller passes none). The envelope keys are
 * written last, so a stray field named level, event, or timestamp cannot corrupt the record
 * shape a subscriber relies on.
 */
export function buildRecord(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown>,
  redactedKeys: ReadonlySet<string> = DEFAULT_REDACTED_KEYS
): LogRecord {
  const { level: _level, event: _event, timestamp: _timestamp, ...ownFields } = fields;
  return {
    ...redactObject(ownFields, 1, redactedKeys, new WeakSet()),
    level,
    event,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds a logger scoped to one event union. Every instance shares the same console sink, the
 * same envelope shape, and the same whole-key redaction; the sink itself carries no promise,
 * only the record shape and the redaction do, so a future subscriber fan-out sees one stream
 * regardless of how many createLogger callers exist. `options.redactKeys` names a site's own
 * additional field names, which union with `REDACTED_LOG_KEYS` and never replace it: a site cannot
 * narrow the engine's own list by passing its own.
 */
export function createLogger<Event extends string>(options?: { redactKeys?: readonly string[] }): {
  info(event: Event, fields?: Record<string, unknown>): void;
  warn(event: Event, fields?: Record<string, unknown>): void;
  error(event: Event, fields?: Record<string, unknown>): void;
} {
  const redactedKeys: ReadonlySet<string> = options?.redactKeys?.length
    ? new Set([...DEFAULT_REDACTED_KEYS, ...options.redactKeys.map(normalizeKey)])
    : DEFAULT_REDACTED_KEYS;
  function emit(level: LogLevel, event: Event, fields: Record<string, unknown> = {}): void {
    sinkByLevel[level](buildRecord(level, event, fields, redactedKeys));
  }
  return {
    info: (event, fields) => emit('info', event, fields),
    warn: (event, fields) => emit('warn', event, fields),
    error: (event, fields) => emit('error', event, fields),
  };
}
