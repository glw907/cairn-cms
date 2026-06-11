// The doctor's Cloudflare API checks: the onboarded sending domain, the zone HTTPS posture,
// and the D1 auth store. Every request goes through ctx.fetch with the operator's
// CLOUDFLARE_API_TOKEN, so the tests script the API and the bin passes global fetch.
//
// Endpoints verified against the Cloudflare API reference, 2026-06-11:
// - Email Sending subdomains (zone-scoped; this is the namespace `wrangler email sending
//   enable` feeds, and the listing carries `{ result: [{ name, enabled, tag }] }`):
//   GET /zones/{zone_id}/email/sending/subdomains
//   https://developers.cloudflare.com/api/resources/email_sending/
// - Zone lookup, `{ result: [{ id }] }`: GET /zones?name=<domain>
//   https://developers.cloudflare.com/api/resources/zones/
// - Zone settings, `{ result: { value } }` where always_use_https carries 'on' | 'off' and
//   security_header nests `value.strict_transport_security.{enabled,max_age}`:
//   GET /zones/{zone_id}/settings/{setting_id}
//   https://developers.cloudflare.com/api/resources/zones/subresources/settings/
// - D1 query, `{ sql }` in, `{ result: [{ results: [...] }] }` out:
//   POST /accounts/{account_id}/d1/database/{database_id}/query
//   https://developers.cloudflare.com/api/resources/d1/subresources/database/
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';

const API = 'https://api.cloudflare.com/client/v4';

// 30 days. The production zones run two years; anything under a month is a trivial pin.
const MIN_HSTS_MAX_AGE = 2592000;

const NO_TOKEN: CheckResult = {
	status: 'skip',
	detail: 'set CLOUDFLARE_API_TOKEN to run this check',
};

const NO_FROM: CheckResult = {
	status: 'skip',
	detail: 'pass --from or set CAIRN_FROM to run this check',
};

function fromDomain(from: string): string {
	return from.slice(from.indexOf('@') + 1);
}

// The registrable domain is taken as the last two labels of the from-domain. A deliberate
// simplification: correct for the single-label public suffixes cairn targets (.ski, .life),
// wrong for multi-part suffixes like .co.uk, which would need a public-suffix list the
// doctor does not carry.
function registrableDomain(domain: string): string {
	return domain.split('.').slice(-2).join('.');
}

function cfGet(ctx: DoctorContext, path: string): Promise<Response> {
	return ctx.fetch(`${API}${path}`, {
		headers: { authorization: `Bearer ${ctx.cfToken}` },
	});
}

async function resolveZoneId(
	ctx: DoctorContext,
	domain: string
): Promise<{ zoneId: string } | { fail: CheckResult }> {
	const zone = registrableDomain(domain);
	const res = await cfGet(ctx, `/zones?name=${encodeURIComponent(zone)}`);
	if (!res.ok) {
		return { fail: { status: 'fail', detail: `zone lookup for ${zone} returned ${res.status}` } };
	}
	const body = (await res.json()) as { result?: { id?: string }[] };
	const id = body.result?.[0]?.id;
	if (typeof id !== 'string') {
		return { fail: { status: 'fail', detail: `no zone named ${zone} is visible to this token` } };
	}
	return { zoneId: id };
}

export const emailSenderOnboarded: DoctorCheck = {
	id: 'email.sender-onboarded',
	conditionId: 'email.sender-not-onboarded',
	title: 'Email sending domain',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		if (!ctx.cfToken) return NO_TOKEN;
		if (!ctx.from) return NO_FROM;
		const domain = fromDomain(ctx.from);
		try {
			const zone = await resolveZoneId(ctx, domain);
			if ('fail' in zone) return zone.fail;
			const res = await cfGet(ctx, `/zones/${zone.zoneId}/email/sending/subdomains`);
			if (!res.ok) {
				return { status: 'fail', detail: `sending subdomain list returned ${res.status}` };
			}
			const body = (await res.json()) as { result?: { name?: string; enabled?: boolean }[] };
			const entry = body.result?.find((s) => s.name === domain);
			if (entry?.enabled === true) {
				return { status: 'pass', detail: `${domain} has an enabled sending subdomain` };
			}
			if (entry) {
				return { status: 'fail', detail: `${domain} is onboarded but sending is disabled` };
			}
			return { status: 'fail', detail: `${domain} has no sending subdomain on the zone` };
		} catch (err) {
			return { status: 'fail', detail: String(err) };
		}
	},
};

export const edgeHttpsForced: DoctorCheck = {
	id: 'edge.https-forced',
	conditionId: 'edge.https-not-forced',
	title: 'Always Use HTTPS',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		if (!ctx.cfToken) return NO_TOKEN;
		if (!ctx.from) return NO_FROM;
		try {
			const zone = await resolveZoneId(ctx, fromDomain(ctx.from));
			if ('fail' in zone) return zone.fail;
			const res = await cfGet(ctx, `/zones/${zone.zoneId}/settings/always_use_https`);
			if (!res.ok) {
				return { status: 'fail', detail: `always_use_https read returned ${res.status}` };
			}
			const body = (await res.json()) as { result?: { value?: string } };
			if (body.result?.value === 'on') {
				return { status: 'pass', detail: 'Always Use HTTPS is on' };
			}
			return { status: 'fail', detail: `always_use_https is ${body.result?.value ?? 'unreadable'}` };
		} catch (err) {
			return { status: 'fail', detail: String(err) };
		}
	},
};

export const edgeHsts: DoctorCheck = {
	id: 'edge.hsts',
	conditionId: 'edge.hsts-off',
	title: 'HSTS',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		if (!ctx.cfToken) return NO_TOKEN;
		if (!ctx.from) return NO_FROM;
		try {
			const zone = await resolveZoneId(ctx, fromDomain(ctx.from));
			if ('fail' in zone) return zone.fail;
			const res = await cfGet(ctx, `/zones/${zone.zoneId}/settings/security_header`);
			if (!res.ok) {
				return { status: 'fail', detail: `security_header read returned ${res.status}` };
			}
			const body = (await res.json()) as {
				result?: { value?: { strict_transport_security?: { enabled?: boolean; max_age?: number } } };
			};
			const sts = body.result?.value?.strict_transport_security;
			if (sts?.enabled !== true) {
				return { status: 'fail', detail: 'HSTS is disabled on the zone' };
			}
			const maxAge = sts.max_age ?? 0;
			if (maxAge < MIN_HSTS_MAX_AGE) {
				return {
					status: 'fail',
					detail: `HSTS max-age ${maxAge} is under the ${MIN_HSTS_MAX_AGE} (30 day) floor`,
				};
			}
			return { status: 'pass', detail: `HSTS enabled with max-age ${maxAge}` };
		} catch (err) {
			return { status: 'fail', detail: String(err) };
		}
	},
};

const AUTH_TABLES = ['editor', 'magic_token', 'session'];

async function d1Query(
	ctx: DoctorContext,
	databaseId: string,
	sql: string
): Promise<{ rows: Record<string, unknown>[] } | { fail: CheckResult }> {
	const res = await ctx.fetch(`${API}/accounts/${ctx.cfAccountId}/d1/database/${databaseId}/query`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${ctx.cfToken}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({ sql }),
	});
	if (!res.ok) {
		return {
			fail: { status: 'fail', detail: `AUTH_DB is unreachable: the query returned ${res.status}` },
		};
	}
	const body = (await res.json()) as { result?: { results?: Record<string, unknown>[] }[] };
	return { rows: body.result?.[0]?.results ?? [] };
}

export const authStore: DoctorCheck = {
	id: 'auth.store',
	conditionId: 'auth.store-unreachable',
	title: 'Auth store (D1)',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		if (!ctx.cfToken || !ctx.cfAccountId) {
			return {
				status: 'skip',
				detail: 'set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to run this check',
			};
		}
		const facts = await readWranglerConfig(ctx.readFile);
		if (typeof facts?.authDbId !== 'string') {
			return {
				status: 'skip',
				detail: 'no AUTH_DB database_id in wrangler.jsonc or wrangler.toml',
			};
		}
		try {
			const tables = await d1Query(ctx, facts.authDbId, "SELECT name FROM sqlite_master WHERE type='table'");
			if ('fail' in tables) return tables.fail;
			const names = new Set(tables.rows.map((row) => row.name));
			const missing = AUTH_TABLES.filter((table) => !names.has(table));
			if (missing.length) {
				return { status: 'fail', detail: `auth schema is missing: ${missing.join(', ')}` };
			}
			const owners = await d1Query(ctx, facts.authDbId, "SELECT count(*) AS n FROM editor WHERE role='owner'");
			if ('fail' in owners) return owners.fail;
			const n = owners.rows[0]?.n;
			if (typeof n === 'number' && n >= 1) {
				return { status: 'pass', detail: `auth schema present with ${n} owner row(s)` };
			}
			return { status: 'fail', detail: 'the editor table holds no owner row' };
		} catch (err) {
			return { status: 'fail', detail: String(err) };
		}
	},
};
