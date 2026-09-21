// The /log subpath barrel. A consumer site importing structured logging in the engine's own
// shape reaches it here, never through the internal barrel (index.ts) the engine's own call
// sites use, which exports the engine's own instance instead of the generic factory.
export { createLogger, REDACTED_LOG_KEYS } from './create.js';
export { CAIRN_LOG_EVENTS } from './events-list.js';
export type { CairnLogEvent } from './events.js';
