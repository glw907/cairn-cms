// CairnError: a thrown failure that names a known condition. A catch site narrows on it, logs from
// the condition, and renders the condition's message in place of an opaque string. Its first
// throw-site is Pass 2 (the email send mapping); Pass 1 lands and tests the primitive.
import { condition, type CairnCondition } from './conditions.js';

export class CairnError extends Error {
	readonly conditionId: string;
	readonly condition: CairnCondition;

	constructor(conditionId: string, options?: { cause?: unknown; message?: string }) {
		const resolved = condition(conditionId);
		super(
			options?.message ?? resolved.title,
			options?.cause !== undefined ? { cause: options.cause } : undefined
		);
		this.name = 'CairnError';
		this.conditionId = conditionId;
		this.condition = resolved;
	}
}
