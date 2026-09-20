// The showcase's one logger, the same shape every engine call site shares. A developer's own
// site declares a union of its own event names the same way and imports createLogger from
// @glw907/cairn-cms/log, never the engine's internal instance, to get the same envelope and
// whole-key redaction over its own vocabulary.
import { createLogger } from '@glw907/cairn-cms/log';

/** The showcase's own event vocabulary, disjoint from the engine's CairnLogEvent union. */
export type SiteLogEvent = 'admin.signups.misconfigured' | 'members.login.requested';

/** The showcase's one logger instance, shared by every route that emits a structured record. */
export const log = createLogger<SiteLogEvent>();
