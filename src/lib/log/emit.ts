// The engine's one logger instance and the single console chokepoint every call site imports
// through index.ts. createLogger builds the shared implementation (see create.ts); a future
// admin-extension pass adds a subscriber fan-out inside createLogger, leaving every call site in
// this file's consumers unchanged.
import { createLogger } from './create.js';
import type { CairnLogEvent } from './events.js';

export const log = createLogger<CairnLogEvent>();
