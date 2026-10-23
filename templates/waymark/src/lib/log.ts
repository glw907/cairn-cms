// The showcase's one logger, the same shape every engine call site shares. A developer's
// site declares a union of event names the same way and imports createLogger from
// @glw907/cairn-cms/log, never the engine's internal instance, to get the same envelope and
// whole-key redaction over its vocabulary.
import { createLogger } from '@glw907/cairn-cms/log';

/** The showcase's event vocabulary, disjoint from the engine's CairnLogEvent union. */
// prettier-ignore
export type SiteLogEvent =
  | 'members.login.requested';

/** The showcase's one logger instance, shared by every route that emits a structured record. */
export const log = createLogger<SiteLogEvent>();
