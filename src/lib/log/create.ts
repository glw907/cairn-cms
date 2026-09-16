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
 * The field-name keys whose value a record replaces with `'<redacted>'`. Matched case
 * insensitively against a field's own key, never a substring, so `tokens`, `tokenLength`, and
 * `hasSession` are not a match and pass through unchanged.
 */
export const REDACTED_LOG_KEYS: readonly string[] = [
  'token',
  'secret',
  'password',
  'cookie',
  'authorization',
  'session_id',
  'sessionId',
  'apiKey',
  'privateKey',
];

const REDACTED_LOG_KEY_SET = new Set(REDACTED_LOG_KEYS.map((key) => key.toLowerCase()));

// Replaces every field whose key equals a REDACTED_LOG_KEYS member, case insensitively, with
// '<redacted>'. A key that only contains one of the reserved words, such as tokenLength, is not
// a match: the comparison is against the whole key, never a substring.
function redactFields(fields: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    redacted[key] = REDACTED_LOG_KEY_SET.has(key.toLowerCase()) ? '<redacted>' : value;
  }
  return redacted;
}

const sinkByLevel: Record<LogLevel, (record: LogRecord) => void> = {
  info: (record) => console.log(record),
  warn: (record) => console.warn(record),
  error: (record) => console.error(record),
};

/**
 * Builds one log record from a level, an event name, and its fields. The envelope keys are
 * written last, so a stray field named level, event, or timestamp cannot corrupt the record
 * shape a subscriber relies on.
 */
export function buildRecord(level: LogLevel, event: string, fields: Record<string, unknown>): LogRecord {
  const { level: _level, event: _event, timestamp: _timestamp, ...ownFields } = fields;
  return { ...redactFields(ownFields), level, event, timestamp: new Date().toISOString() };
}

/**
 * Builds a logger scoped to one event union. Every instance shares the same console sink, the
 * same envelope shape, and the same whole-key redaction; the sink itself carries no promise,
 * only the record shape and the redaction do, so a future subscriber fan-out sees one stream
 * regardless of how many createLogger callers exist.
 */
export function createLogger<Event extends string>(): {
  info(event: Event, fields?: Record<string, unknown>): void;
  warn(event: Event, fields?: Record<string, unknown>): void;
  error(event: Event, fields?: Record<string, unknown>): void;
} {
  function emit(level: LogLevel, event: Event, fields: Record<string, unknown> = {}): void {
    sinkByLevel[level](buildRecord(level, event, fields));
  }
  return {
    info: (event, fields) => emit('info', event, fields),
    warn: (event, fields) => emit('warn', event, fields),
    error: (event, fields) => emit('error', event, fields),
  };
}
