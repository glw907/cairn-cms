// The engine's one logger and the single console chokepoint. Every diagnostic routes through
// `log`; today each call writes a structured JSON object to console, which Workers Logs ingests
// and indexes when a consumer sets observability.enabled. A future admin-extension pass adds a
// subscriber fan-out inside this module, leaving every call site unchanged.
import type { CairnLogEvent } from './events.js';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  event: CairnLogEvent;
  timestamp: string;
  [field: string]: unknown;
}

export interface Logger {
  info(event: CairnLogEvent, fields?: Record<string, unknown>): void;
  warn(event: CairnLogEvent, fields?: Record<string, unknown>): void;
  error(event: CairnLogEvent, fields?: Record<string, unknown>): void;
}

const sinkByLevel: Record<LogLevel, (record: LogRecord) => void> = {
  info: (record) => console.log(record),
  warn: (record) => console.warn(record),
  error: (record) => console.error(record),
};

function buildRecord(level: LogLevel, event: CairnLogEvent, fields: Record<string, unknown>): LogRecord {
  // The envelope keys are written last, so a stray field named level/event/timestamp cannot
  // corrupt the record shape a subscriber relies on.
  return { ...fields, level, event, timestamp: new Date().toISOString() };
}

function emit(level: LogLevel, event: CairnLogEvent, fields: Record<string, unknown> = {}): void {
  sinkByLevel[level](buildRecord(level, event, fields));
}

export const log: Logger = {
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
};
