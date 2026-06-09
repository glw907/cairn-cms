// The cairn condition registry: one entry per known environment or operational failure mode. It is
// the shared identity the readiness checklist, the doctor probe, and the runtime renderer all draw
// from, so the three surfaces agree (the 1:1:1). Internal: exported from no public package subpath,
// so the shape stays free to grow, the same stance as src/lib/log/. Renaming an id is a breaking
// change to the observable contract. See
// docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md.
import type { CairnLogEvent } from '../log/index.js';

export type ConditionSeverity = 'blocker' | 'warning';

export interface CairnCondition {
	/** Stable, greppable id, e.g. 'edge.https-not-forced'. */
	id: string;
	severity: ConditionSeverity;
	/** Short human label. */
	title: string;
	/** One or two sentences on why the condition bites. */
	why: string;
	/** The fix, often a command. */
	remediation: string;
	/** Anchor into the readiness checklist doc, filled in when that doc lands (Pass 3). */
	docsAnchor?: string;
	/** The log vocabulary event this condition correlates with, if any. */
	logEvent?: CairnLogEvent;
}

const REGISTRY: Record<string, CairnCondition> = {
	'edge.https-not-forced': {
		id: 'edge.https-not-forced',
		severity: 'blocker',
		title: 'Always Use HTTPS is off',
		why: 'The JS-free admin sign-in posts a form, and the framework CSRF guard rejects a form POST whose origin scheme does not match, so an admin reached over http hits an opaque 403.',
		remediation: 'Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates, and keep HSTS on.',
		logEvent: 'guard.rejected',
	},
	'auth.csrf-token-invalid': {
		id: 'auth.csrf-token-invalid',
		severity: 'blocker',
		title: 'Admin CSRF token check failed',
		why: 'An admin form POST carried no valid __Host-cairn_csrf double-submit token, usually a stale tab or blocked cookies.',
		remediation: 'Open the sign-in page fresh, allow cookies for the site, and request a new link.',
		logEvent: 'guard.rejected',
	},
	'auth.csrf-origin-mismatch': {
		id: 'auth.csrf-origin-mismatch',
		severity: 'blocker',
		title: 'Non-admin form Origin rejected',
		why: "A non-admin unsafe form POST carried an Origin that did not match the site, so cairn's restored framework Origin check rejected it.",
		remediation: 'Post the form from the same origin, or check a proxy that strips or rewrites the Origin header.',
		logEvent: 'guard.rejected',
	},
};

/** Resolve a condition by id. Throws on an unknown id, since ids are compile-time constants. */
export function condition(id: string): CairnCondition {
	const found = REGISTRY[id];
	if (!found) throw new Error(`unknown cairn condition: ${id}`);
	return found;
}

/** Every registered condition, for the checklist generator and coverage tests. */
export function allConditions(): CairnCondition[] {
	return Object.values(REGISTRY);
}
