// CairnError: a thrown failure that names a known condition. A catch site narrows on it, logs from
// the condition, and renders the condition's message in place of an opaque string.
import { condition, type CairnCondition } from './conditions.js';

export class CairnError extends Error {
  readonly conditionId: string;
  readonly condition: CairnCondition;

  constructor(conditionId: string, options?: { cause?: unknown; message?: string }) {
    const resolved = condition(conditionId);
    // The registry remediation follows the title or the explicit message, so the thrown text names the next step.
    super(
      `${(options?.message ?? resolved.title).replace(/\.$/, '')}. ${resolved.remediation}`,
      options?.cause !== undefined ? { cause: options.cause } : undefined
    );
    this.name = 'CairnError';
    this.conditionId = conditionId;
    this.condition = resolved;
  }
}
