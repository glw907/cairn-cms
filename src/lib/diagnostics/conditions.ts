// The cairn condition registry: one entry per known environment or operational failure mode. It is
// the shared identity the readiness checklist, the doctor probe, and the runtime renderer all draw
// from, so the three surfaces agree (the 1:1:1). Internal: exported from no public package subpath,
// so the shape stays free to grow, the same stance as src/lib/log/. Renaming an id is a breaking
// change to the observable contract. See
// docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md.
import type { CairnLogEvent } from '../log/index.js';

type ConditionSeverity = 'blocker' | 'warning';

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
	/**
	 * The condition's section in the readiness checklist, written as
	 * 'cloudflare-readiness.md#<heading-slug>' so a doc can link it relative to docs/guides/.
	 * The check:readiness gate parses the part after '#' and asserts the heading exists; two
	 * conditions may share a section. Every entry carries one unless the gate's allowlist
	 * excuses it.
	 */
	docsAnchor?: string;
	/** The log vocabulary event this condition correlates with, if any. */
	logEvent?: CairnLogEvent;
}

// Exported for the freeze test only; resolve entries through condition() everywhere else.
export const REGISTRY: Record<string, CairnCondition> = {
	'edge.https-not-forced': {
		id: 'edge.https-not-forced',
		severity: 'blocker',
		title: 'Always Use HTTPS is off',
		why: 'The JS-free admin sign-in posts a form, and the framework CSRF guard rejects a form POST whose origin scheme does not match, so an admin reached over http hits an opaque 403.',
		remediation: 'Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates, and keep HSTS on.',
		docsAnchor: 'cloudflare-readiness.md#force-https-at-the-edge',
		logEvent: 'guard.rejected',
	},
	'auth.csrf-token-invalid': {
		id: 'auth.csrf-token-invalid',
		severity: 'blocker',
		title: 'Admin CSRF token check failed',
		why: 'An admin form POST carried no valid __Host-cairn_csrf double-submit token, usually a stale tab or blocked cookies.',
		remediation: 'Open the sign-in page fresh, allow cookies for the site, and request a new link.',
		docsAnchor: 'cloudflare-readiness.md#admin-csrf-token-rejected',
		logEvent: 'guard.rejected',
	},
	'auth.csrf-origin-mismatch': {
		id: 'auth.csrf-origin-mismatch',
		severity: 'blocker',
		title: 'Non-admin form Origin rejected',
		why: "A non-admin unsafe form POST carried an Origin that did not match the site, so cairn's restored framework Origin check rejected it.",
		remediation: 'Post the form from the same origin, or check a proxy that strips or rewrites the Origin header.',
		docsAnchor: 'cloudflare-readiness.md#non-admin-origin-rejected',
		logEvent: 'guard.rejected',
	},
	'email.sender-not-onboarded': {
		id: 'email.sender-not-onboarded',
		severity: 'blocker',
		title: 'Email sending domain is not onboarded',
		why: 'The from-address domain has no enabled Cloudflare sending subdomain, so env.EMAIL.send has no aligned sender and the magic-link send throws E_SENDER_NOT_VERIFIED. No editor can sign in.',
		remediation: 'Onboard the sending domain with `wrangler email sending enable <domain>`, then re-deploy. The domain must match branding.from.',
		docsAnchor: 'cloudflare-readiness.md#onboard-the-sending-domain',
		logEvent: 'auth.link.send_failed',
	},
	'email.send-failed': {
		id: 'email.send-failed',
		severity: 'blocker',
		title: 'Magic-link email send failed',
		why: 'The magic-link send threw for a reason other than a missing sender onboarding (a delivery error, a binding misconfiguration, or a custom sender failure), so the editor never received a link.',
		remediation: 'Read the auth.link.send_failed log record (the code and error fields) in Workers Logs, and check the EMAIL binding and the sender configuration.',
		docsAnchor: 'cloudflare-readiness.md#onboard-the-sending-domain',
		logEvent: 'auth.link.send_failed',
	},
	'config.bindings-missing': {
		id: 'config.bindings-missing',
		severity: 'blocker',
		title: 'Wrangler bindings are missing',
		why: 'The wrangler config declares no send_email binding named EMAIL or no D1 binding named AUTH_DB, so the magic-link send or the session store has nothing to call and no editor can sign in.',
		remediation: 'Declare the send_email binding as EMAIL and the d1_databases binding as AUTH_DB in wrangler.jsonc (or wrangler.toml), then re-deploy.',
		docsAnchor: 'cloudflare-readiness.md#deploy-the-worker-with-its-bindings',
	},
	'config.observability-off': {
		id: 'config.observability-off',
		severity: 'warning',
		title: 'Workers Logs has no sink',
		why: 'observability.enabled is not true in the wrangler config, so the structured log records go nowhere and a runtime failure leaves nothing to read.',
		remediation: 'Set observability.enabled to true in wrangler.jsonc, then re-deploy.',
		docsAnchor: 'cloudflare-readiness.md#turn-on-observability',
	},
	'config.csrf-disable-missing': {
		id: 'config.csrf-disable-missing',
		severity: 'warning',
		title: 'Framework CSRF check is not handed off',
		why: "The CSRF authority is not handed to cairn cleanly. Either svelte.config.js does not carry csrf: { checkOrigin: false }, so SvelteKit's own Origin check runs ahead of cairn's guard and rejects an admin form POST that arrives without an Origin header, or the disable is present with no cairn guard wired in src/hooks.server.ts, which leaves the site with no CSRF protection at all.",
		remediation: "Set csrf: { checkOrigin: false } in svelte.config.js and wire createAuthGuard into src/hooks.server.ts; cairn's guard owns the Origin and double-submit token checks.",
		docsAnchor: 'cloudflare-readiness.md#wire-cairns-csrf-guard',
	},
	'config.public-origin-invalid': {
		id: 'config.public-origin-invalid',
		severity: 'blocker',
		title: 'PUBLIC_ORIGIN is missing or invalid',
		why: 'PUBLIC_ORIGIN is unset, does not parse as a URL, or uses http on a non-local host. The magic-link confirmation links and the absolute feed URLs derive from it, config-only so a forged Host header cannot redirect a link, and sign-in cannot mint a usable link without it.',
		remediation: "Set PUBLIC_ORIGIN to the site's canonical https origin in the wrangler config vars (with .dev.vars carrying the local http override), then re-deploy; http passes only on localhost or 127.0.0.1.",
		docsAnchor: 'cloudflare-readiness.md#set-the-public-origin',
	},
	'config.site-config-invalid': {
		id: 'config.site-config-invalid',
		severity: 'blocker',
		title: 'Site config does not validate',
		why: 'site.config.yaml fails to parse or fails the URL-policy validation, so the build and the admin cannot resolve the content concepts.',
		remediation: 'Correct site.config.yaml; the parse or validation error names the failing field or URL-policy rule.',
		docsAnchor: 'cloudflare-readiness.md#validate-the-site-config',
	},
	'config.dependency-floors-unmet': {
		id: 'config.dependency-floors-unmet',
		severity: 'blocker',
		title: 'A framework dependency sits below the engine floor',
		why: 'The lockfile resolves svelte or @sveltejs/kit below the range the engine declares as a peer. Consumer sites compile the shipped .svelte sources, so a below-floor compiler bites silently at build time; svelte 5.56.1 miscompiles parenthesized boolean groupings, which is why the svelte floor is ^5.56.3.',
		remediation: "Raise the devDependency range in the site's package.json to the engine peer range and reinstall so the lockfile re-resolves, for example `npm install --save-dev svelte@^5.56.3`.",
		docsAnchor: 'cloudflare-readiness.md#meet-the-dependency-floors',
	},
	'edge.hsts-off': {
		id: 'edge.hsts-off',
		severity: 'warning',
		title: 'HSTS is off',
		why: 'The zone sends no Strict-Transport-Security header with a meaningful max-age, so browsers do not pin https and a later http visit can still hit the admin guard rejection.',
		remediation: 'Turn on HSTS for the zone under SSL/TLS, Edge Certificates, with a max-age of at least six months.',
		docsAnchor: 'cloudflare-readiness.md#turn-on-hsts',
	},
	'auth.store-unreachable': {
		id: 'auth.store-unreachable',
		severity: 'blocker',
		title: 'Auth store is unreachable',
		why: 'The AUTH_DB D1 database is missing, lacks the auth schema, or holds no owner row, so no magic-link token can be minted and nobody can sign in.',
		remediation: 'Create the database, apply the auth schema with `wrangler d1 execute <db> --remote --file ./migrations/0000_auth.sql`, seed the owner row, and check the AUTH_DB binding id in wrangler.jsonc.',
		docsAnchor: 'cloudflare-readiness.md#provision-the-auth-store',
	},
	'auth.unknown-role': {
		id: 'auth.unknown-role',
		severity: 'warning',
		title: 'Editor row uses an undeclared role',
		why: "An editor row's role is not a key in the site's declared vocabulary (a pruned config or a hand-edited row), so that session resolves to none capability: it can sign in but the guard refuses every content and admin-mutation route.",
		remediation: 'Either restore the role to the vocabulary, or set the row to a declared role name through the manage-editors screen.',
		docsAnchor: 'cloudflare-readiness.md#provision-the-auth-store',
		logEvent: 'auth.role.unknown',
	},
	'auth.role-wiring-missing': {
		id: 'auth.role-wiring-missing',
		severity: 'warning',
		title: 'Guard is missing the declared role vocabulary',
		why: 'The adapter declares custom roles with defineRoles, but createAuthGuard in src/hooks.server.ts was not passed { roles }, so the running guard falls back to the implicit owner/editor pair. Every editor whose role is outside that pair resolves to none capability: they authenticate but the guard refuses every content and admin-mutation route. This is the second half of a two-part wiring the auth.unknown-role check cannot see, since the editor rows still match the declared vocabulary.',
		remediation: 'Pass the same declared vocabulary to the guard: createAuthGuard({ roles }) in src/hooks.server.ts, importing the roles the adapter declares with defineRoles.',
		docsAnchor: 'cloudflare-readiness.md#provision-the-auth-store',
		logEvent: 'auth.role.unknown',
	},
	'auth.email-not-normalized': {
		id: 'auth.email-not-normalized',
		severity: 'warning',
		title: 'Editor email is not trimmed and lowercase',
		why: 'An editor row carries an email that is not trimmed and lowercase, breaking the invariant the auth store, the allowlist lookup, and a consumer\'s own domain tables all rely on as a join key. This usually comes from a manual D1 insert.',
		remediation: 'Update the row so its email is trimmed and lowercase, matching what every write path (magic-link request, manage-editors) already normalizes to.',
		docsAnchor: 'cloudflare-readiness.md#provision-the-auth-store',
	},
	'github.app-unreachable': {
		id: 'github.app-unreachable',
		severity: 'blocker',
		title: 'GitHub App is unreachable',
		why: 'The App key fails to parse, the App fails to authenticate, the installation token fails to mint, or the repository refuses a read, so saves and publishes cannot commit.',
		remediation: 'Check GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY_B64 against the App settings, and confirm the App is installed on the repository.',
		docsAnchor: 'cloudflare-readiness.md#install-the-github-app',
		logEvent: 'github.unreachable',
	},
	'admin.mount-incomplete': {
		id: 'admin.mount-incomplete',
		severity: 'warning',
		title: 'Custom /admin mount looks incomplete',
		why: "The four-file /admin mount (the shared +layout that renders CairnAdminShell and calls the composer's shellLoad, and the [...path] catch-all that renders CairnAdmin) appears not fully wired, so a custom admin screen or the shared chrome may not render. This is a best-effort text heuristic, so an unconventionally-wired site can trip it without being broken.",
		remediation:
			'Mount the shared /admin/+layout that renders CairnAdminShell and calls createCairnAdmin(runtime).shellLoad, and the /admin/[...path] catch-all that renders CairnAdmin.',
		docsAnchor: 'cloudflare-readiness.md#wire-the-admin-mount',
	},
	'admin.login-probe-failed': {
		id: 'admin.login-probe-failed',
		severity: 'blocker',
		title: 'Live admin login probe failed',
		why: 'A live request to the deployed admin did not answer with the working sign-in envelope (the login page, its CSRF cookie and hidden field, and the request action), so a real editor cannot sign in either. A probe failure has many possible causes; the detail line names the assertion that failed.',
		remediation: 'Read the failed assertion in the detail line, run the full doctor against the same site, and work through the deploy guide; the other checks narrow the cause.',
		docsAnchor: 'cloudflare-readiness.md#probe-the-deployed-admin',
	},
};

// The registry is shared identity, never working state; freeze every entry and the map itself.
for (const entry of Object.values(REGISTRY)) Object.freeze(entry);
Object.freeze(REGISTRY);

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
