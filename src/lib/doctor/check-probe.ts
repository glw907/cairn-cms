// The doctor's opt-in live probe (--probe): one GET and one POST against a deployed admin,
// asserting the envelope a working sign-in presents. Zero side effects by construction: the
// POST submits a random non-editor address, and the engine's non-leak design answers a
// non-editor with the identical sent body while sending no email and minting no token, so the
// probe leaves nothing behind on the site. A factory rather than a check constant, the same
// shape as the live send: the check exists only when the bin receives --probe.
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { csrfCookieName } from '../auth/crypto.js';
import { readWranglerConfig } from './wrangler-config.js';

const NO_URL: CheckResult = skip(
	'pass --probe <url>, set PUBLIC_ORIGIN in the wrangler vars, or set PUBLIC_ORIGIN in the environment'
);

/** Build the live-probe check. A missing url falls back to the PUBLIC_ORIGIN input at run time. */
export function liveProbeCheck(url?: string): DoctorCheck {
	return {
		id: 'admin.login-probe',
		conditionId: 'admin.login-probe-failed',
		title: 'Live admin login probe',
		async run(ctx: DoctorContext): Promise<CheckResult> {
			// The wrangler vars hold the value the deployed Worker reads, so they beat the local
			// environment, the same precedence the public-origin check applies.
			const base =
				url ?? (await readWranglerConfig(ctx.readFile))?.publicOrigin ?? ctx.publicOrigin;
			if (base === undefined) return NO_URL;
			let origin: URL;
			try {
				origin = new URL(base);
			} catch {
				return fail(`probe URL does not parse: ${base}`);
			}
			try {
				return await probe(ctx, origin);
			} catch (err) {
				return fail(String(err));
			}
		},
	};
}

/** GET /admin/login and assert the sign-in envelope, then hand the harvested token pair on. */
async function probe(ctx: DoctorContext, origin: URL): Promise<CheckResult> {
	const res = await ctx.fetch(String(new URL('/admin/login', origin)));
	if (res.status !== 200) {
		return fail(`GET /admin/login returned ${res.status}, expected 200`);
	}
	const cookieName = csrfCookieName(origin.protocol === 'https:');
	const cookieValue = setCookieValue(res.headers.getSetCookie(), cookieName);
	if (cookieValue === undefined) {
		return fail(`GET /admin/login set no ${cookieName} cookie`);
	}
	const html = await res.text();
	const field = csrfFieldValue(html);
	if (field === undefined) {
		return fail('the login page carries no name="csrf" hidden field with a value');
	}
	if (!/<form[^>]*action="[^"]*\?\/request"/.test(html)) {
		return fail('the login page carries no form posting the ?/request action');
	}
	return postRequestAction(ctx, origin, `${cookieName}=${cookieValue}`, field);
}

/** The named cookie's value from the Set-Cookie lines, or undefined when no line names it. */
function setCookieValue(lines: string[], name: string): string | undefined {
	for (const line of lines) {
		const eq = line.indexOf('=');
		if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
		const rest = line.slice(eq + 1);
		const semi = rest.indexOf(';');
		return semi === -1 ? rest : rest.slice(0, semi);
	}
	return undefined;
}

/** The csrf hidden field's value, tolerant of attribute order, or undefined when absent or empty. */
function csrfFieldValue(html: string): string | undefined {
	const input = (html.match(/<input[^>]*>/g) ?? []).find((tag) => /name="csrf"/.test(tag));
	if (input === undefined) return undefined;
	const value = /value="([^"]+)"/.exec(input)?.[1];
	return value;
}

/**
 * POST the request action and read its serialized result. The address is random and non-editor
 * at the reserved example.invalid domain, so even a delivery bug could send nothing anywhere,
 * and the engine's non-leak design makes the response indistinguishable from a real send.
 */
async function postRequestAction(
	ctx: DoctorContext,
	origin: URL,
	cookie: string,
	csrf: string
): Promise<CheckResult> {
	const email = `cairn-doctor-probe-${Math.random().toString(36).slice(2, 10)}@example.invalid`;
	const res = await ctx.fetch(String(new URL('/admin/login?/request', origin)), {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			cookie,
		},
		body: new URLSearchParams({ email, csrf }).toString(),
	});
	if (res.status !== 200) {
		return fail(`POST ?/request returned ${res.status}, expected 200`);
	}
	// A no-Accept action POST answers with SvelteKit's serialized form-action JSON, shaped
	// {"type":"success","status":200,"data":"<devalue array string>"}. The data field is a
	// devalue encoding the probe reads by containment for the status literals, tolerant of
	// encoding details it does not own, instead of pulling in a devalue parser.
	let envelope: { type?: unknown; data?: unknown };
	try {
		envelope = (await res.json()) as { type?: unknown; data?: unknown };
	} catch {
		return fail('POST ?/request did not answer with the serialized action JSON');
	}
	if (envelope.type !== 'success') {
		return fail(`POST ?/request answered type ${String(envelope.type)}, expected success`);
	}
	const data = typeof envelope.data === 'string' ? envelope.data : '';
	if (data.includes('"send_error"')) {
		return fail(
			'the request action answered send_error; the magic-link send path is failing (see the email checks and the auth.link.send_failed log records)'
		);
	}
	// Every payload carries the "sent" field name, so the distinct status spellings go first.
	if (data.includes('"throttled"')) {
		return pass(
			`sign-in envelope verified at ${origin.origin}; the request action answered throttled (a real cooldown window is active), which still proves the path`
		);
	}
	if (data.includes('"sent"')) {
		return pass(
			`sign-in envelope verified at ${origin.origin}; the request action answered sent for a non-editor probe address`
		);
	}
	return fail('POST ?/request answered success with an unrecognized payload');
}
