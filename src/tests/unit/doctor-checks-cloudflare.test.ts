import { describe, it, expect } from 'vitest';
import {
	emailSenderOnboarded,
	edgeHttpsForced,
	edgeHsts,
	authStore,
} from '../../lib/doctor/checks-cloudflare.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const API = 'https://api.cloudflare.com/client/v4';

const WRANGLER_JSONC = `{
	"d1_databases": [
		{ "binding": "AUTH_DB", "database_name": "auth", "database_id": "abc-123" }
	]
}`;

interface Call {
	url: string;
	init?: RequestInit;
}

/** A URL-dispatching scripted fetch that records every call. A plain object return becomes a
 *  200 JSON response; return a Response directly for non-ok cases. */
function scripted(handler: (url: string, init?: RequestInit) => unknown) {
	const calls: Call[] = [];
	const impl = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		calls.push({ url, init });
		const out = handler(url, init);
		return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
	};
	return { fetch: impl as typeof fetch, calls };
}

const ZONE_OK = { success: true, result: [{ id: 'zone-1', name: 'ecxc.ski' }] };

/** Answers the zone lookup, delegating everything else to the case's own routes. */
function withZone(rest: (url: string, init?: RequestInit) => unknown) {
	return (url: string, init?: RequestInit) => {
		if (url.startsWith(`${API}/zones?name=`)) return ZONE_OK;
		return rest(url, init);
	};
}

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
	return {
		cwd: '/site',
		fetch: (() => {
			throw new Error('unexpected fetch');
		}) as never,
		readFile: async () => null,
		...over,
	};
}

const CREDS = { cfToken: 'tok', cfAccountId: 'acct', from: 'noreply@ecxc.ski' };

function bearer(call: Call): string | undefined {
	return new Headers(call.init?.headers).get('authorization') ?? undefined;
}

describe('email.sender-onboarded', () => {
	it('skips naming CLOUDFLARE_API_TOKEN when the token is absent', async () => {
		const result = await emailSenderOnboarded.run(ctx({ from: 'a@ecxc.ski' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('CLOUDFLARE_API_TOKEN');
	});

	it('skips naming --from and CAIRN_FROM when the from-address is absent', async () => {
		const result = await emailSenderOnboarded.run(ctx({ cfToken: 'tok', cfAccountId: 'acct' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('--from');
		expect(result.detail).toContain('CAIRN_FROM');
	});

	it('passes when the from-domain has an enabled sending subdomain', async () => {
		const { fetch, calls } = scripted(
			withZone(() => ({ result: [{ name: 'ecxc.ski', enabled: true, tag: 't1' }] }))
		);
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('pass');
		expect(calls.map((c) => c.url)).toEqual([
			`${API}/zones?name=ecxc.ski`,
			`${API}/zones/zone-1/email/sending/subdomains`,
		]);
		expect(calls.every((c) => bearer(c) === 'Bearer tok')).toBe(true);
	});

	it('matches a subdomain sender, falling back to the registrable domain when the exact name has no zone', async () => {
		const { fetch, calls } = scripted((url) => {
			if (url === `${API}/zones?name=mail.ecxc.ski`) return { result: [] };
			if (url === `${API}/zones?name=ecxc.ski`) return ZONE_OK;
			return { result: [{ name: 'mail.ecxc.ski', enabled: true, tag: 't1' }] };
		});
		const result = await emailSenderOnboarded.run(
			ctx({ ...CREDS, from: 'alerts@mail.ecxc.ski', fetch })
		);
		expect(result.status).toBe('pass');
		expect(calls.map((c) => c.url)).toEqual([
			`${API}/zones?name=mail.ecxc.ski`,
			`${API}/zones?name=ecxc.ski`,
			`${API}/zones/zone-1/email/sending/subdomains`,
		]);
	});

	it('uses the from-domain zone directly when the exact name is its own zone', async () => {
		const { fetch, calls } = scripted((url) => {
			if (url === `${API}/zones?name=mail.ecxc.ski`) return { result: [{ id: 'zone-sub' }] };
			if (url.startsWith(`${API}/zones?name=`)) throw new Error('queried past the exact match');
			return { result: [{ name: 'mail.ecxc.ski', enabled: true, tag: 't1' }] };
		});
		const result = await emailSenderOnboarded.run(
			ctx({ ...CREDS, from: 'alerts@mail.ecxc.ski', fetch })
		);
		expect(result.status).toBe('pass');
		expect(calls.map((c) => c.url)).toEqual([
			`${API}/zones?name=mail.ecxc.ski`,
			`${API}/zones/zone-sub/email/sending/subdomains`,
		]);
	});

	it('fails when the domain is listed with sending disabled', async () => {
		const { fetch } = scripted(
			withZone(() => ({ result: [{ name: 'ecxc.ski', enabled: false, tag: 't1' }] }))
		);
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('disabled');
	});

	it('fails when the domain has no sending subdomain at all', async () => {
		const { fetch } = scripted(withZone(() => ({ result: [] })));
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('ecxc.ski');
	});

	it('fails when no zone matches the registrable domain', async () => {
		const { fetch } = scripted(() => ({ result: [] }));
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('ecxc.ski');
	});

	it('fails with the error string when the fetch rejects', async () => {
		const fetch = (async () => {
			throw new Error('socket hang up');
		}) as unknown as typeof globalThis.fetch;
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('socket hang up');
	});

	it('names the token scope, not the product, when the sending list returns 403', async () => {
		const { fetch } = scripted(withZone(() => new Response('denied', { status: 403 })));
		const result = await emailSenderOnboarded.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('lacks permission');
		expect(result.detail).toContain('403');
		expect(result.detail).toContain('Email Sending: Read');
	});

	it('ties to the email.sender-not-onboarded condition', () => {
		expect(emailSenderOnboarded.conditionId).toBe('email.sender-not-onboarded');
	});
});

describe('edge.https-forced', () => {
	it('skips without the token', async () => {
		const result = await edgeHttpsForced.run(ctx({ from: 'a@ecxc.ski' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('CLOUDFLARE_API_TOKEN');
	});

	it('skips without the from-address', async () => {
		const result = await edgeHttpsForced.run(ctx({ cfToken: 'tok' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('--from');
	});

	it('passes when always_use_https is on, reading the zone setting', async () => {
		const { fetch, calls } = scripted(
			withZone(() => ({ result: { id: 'always_use_https', value: 'on' } }))
		);
		const result = await edgeHttpsForced.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('pass');
		expect(calls.map((c) => c.url)).toEqual([
			`${API}/zones?name=ecxc.ski`,
			`${API}/zones/zone-1/settings/always_use_https`,
		]);
	});

	it('fails when always_use_https is off', async () => {
		const { fetch } = scripted(
			withZone(() => ({ result: { id: 'always_use_https', value: 'off' } }))
		);
		const result = await edgeHttpsForced.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('off');
	});

	it('fails when the setting read returns non-ok', async () => {
		const { fetch } = scripted(withZone(() => new Response('denied', { status: 403 })));
		const result = await edgeHttpsForced.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('403');
	});

	it('ties to the edge.https-not-forced condition', () => {
		expect(edgeHttpsForced.conditionId).toBe('edge.https-not-forced');
	});
});

describe('edge.hsts', () => {
	function hstsFetch(sts: unknown) {
		return scripted(
			withZone(() => ({ result: { id: 'security_header', value: { strict_transport_security: sts } } }))
		);
	}

	it('skips without the token', async () => {
		const result = await edgeHsts.run(ctx({ from: 'a@ecxc.ski' }));
		expect(result.status).toBe('skip');
	});

	it('passes when HSTS is enabled with a serious max-age, reading security_header', async () => {
		const { fetch, calls } = hstsFetch({ enabled: true, max_age: 63072000 });
		const result = await edgeHsts.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('pass');
		expect(calls[1].url).toBe(`${API}/zones/zone-1/settings/security_header`);
	});

	it('fails when HSTS is disabled', async () => {
		const { fetch } = hstsFetch({ enabled: false, max_age: 63072000 });
		const result = await edgeHsts.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
	});

	it('fails when the max-age is under thirty days', async () => {
		const { fetch } = hstsFetch({ enabled: true, max_age: 86400 });
		const result = await edgeHsts.run(ctx({ ...CREDS, fetch }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('max-age');
	});

	it('ties to the edge.hsts-off condition', () => {
		expect(edgeHsts.conditionId).toBe('edge.hsts-off');
	});
});

describe('auth.store', () => {
	const SCHEMA_ROWS = [{ name: 'editor' }, { name: 'magic_token' }, { name: 'session' }];

	function d1Fetch(routes: { tables?: unknown; owners?: unknown; response?: Response }) {
		return scripted((url, init) => {
			expect(url).toBe(`${API}/accounts/acct/d1/database/abc-123/query`);
			if (routes.response) return routes.response;
			const body = JSON.parse(String(init?.body)) as { sql: string };
			if (body.sql.includes('sqlite_master')) return { result: [{ results: routes.tables }] };
			return { result: [{ results: routes.owners }] };
		});
	}

	function d1Ctx(fetch: typeof globalThis.fetch): DoctorContext {
		return ctx({
			...CREDS,
			fetch,
			readFile: async (relPath) => (relPath === 'wrangler.jsonc' ? WRANGLER_JSONC : null),
		});
	}

	it('skips naming both credential vars when they are absent', async () => {
		const result = await authStore.run(ctx({ from: 'a@ecxc.ski' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('CLOUDFLARE_API_TOKEN');
		expect(result.detail).toContain('CLOUDFLARE_ACCOUNT_ID');
	});

	it('skips naming the wrangler config when no AUTH_DB database_id is declared', async () => {
		const result = await authStore.run(ctx({ cfToken: 'tok', cfAccountId: 'acct' }));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('wrangler');
	});

	it('passes when the schema is present and an owner row exists', async () => {
		const { fetch, calls } = d1Fetch({ tables: SCHEMA_ROWS, owners: [{ n: 1 }] });
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('pass');
		expect(calls).toHaveLength(2);
		const sqls = calls.map((c) => (JSON.parse(String(c.init?.body)) as { sql: string }).sql);
		expect(sqls[0]).toContain("type='table'");
		expect(sqls[1]).toContain("role='owner'");
		expect(calls.every((c) => bearer(c) === 'Bearer tok')).toBe(true);
	});

	it('fails as unreachable on a non-ok response', async () => {
		const { fetch } = d1Fetch({ response: new Response('no such db', { status: 404 }) });
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('404');
		expect(result.detail).toContain('unreachable');
	});

	it('fails naming the missing tables when the schema is incomplete', async () => {
		const { fetch } = d1Fetch({ tables: [{ name: 'editor' }], owners: [] });
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('magic_token');
		expect(result.detail).toContain('session');
		expect(result.detail).not.toContain('owner');
	});

	it('fails when the editor table holds no owner row', async () => {
		const { fetch } = d1Fetch({ tables: SCHEMA_ROWS, owners: [{ n: 0 }] });
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('owner');
	});

	it('fails with the error string when the fetch rejects', async () => {
		const fetch = (async () => {
			throw new Error('getaddrinfo ENOTFOUND');
		}) as unknown as typeof globalThis.fetch;
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('ENOTFOUND');
	});

	it('names the token scope, not the product, when the query returns 403', async () => {
		const { fetch } = d1Fetch({ response: new Response('denied', { status: 403 }) });
		const result = await authStore.run(d1Ctx(fetch));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('lacks permission');
		expect(result.detail).toContain('403');
		expect(result.detail).toContain('D1: Read');
		expect(result.detail).not.toContain('unreachable');
	});

	it('encodes the database id into the query path', async () => {
		const wrangler = `{
			"d1_databases": [
				{ "binding": "AUTH_DB", "database_name": "auth", "database_id": "abc/123" }
			]
		}`;
		const { fetch, calls } = scripted((url, init) => {
			const body = JSON.parse(String(init?.body)) as { sql: string };
			if (body.sql.includes('sqlite_master')) return { result: [{ results: SCHEMA_ROWS }] };
			return { result: [{ results: [{ n: 1 }] }] };
		});
		const result = await authStore.run(
			ctx({
				...CREDS,
				fetch,
				readFile: async (relPath) => (relPath === 'wrangler.jsonc' ? wrangler : null),
			})
		);
		expect(result.status).toBe('pass');
		expect(calls[0].url).toBe(`${API}/accounts/acct/d1/database/abc%2F123/query`);
	});

	it('ties to the auth.store-unreachable condition', () => {
		expect(authStore.conditionId).toBe('auth.store-unreachable');
	});
});
