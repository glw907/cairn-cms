// The doctor's Cloudflare API checks: the onboarded sending domain, the zone HTTPS posture,
// and the D1 auth store, over the shared cloudflare-api plumbing.
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
import { fail, pass, skip } from './types.js';
import type { CheckOutcome, CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { cfGet, cfPost, NO_ACCOUNT, NO_FROM, NO_TOKEN } from './cloudflare-api.js';
import { readWranglerConfig } from './wrangler-config.js';
import { DEFAULT_ROLES, ownerLevelRoles } from '../auth/roles.js';

// 30 days. The production zones run two years; anything under a month is a trivial pin.
const MIN_HSTS_MAX_AGE = 2592000;

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

// A 401/403 means the token cannot make this read at all, so the product condition's
// remediation (onboard the domain, fix the binding) would point the operator at the wrong fix.
// The conditionId stays; the detail carries the scope truth.
function permissionFail(status: number, scope: string): CheckResult | null {
  if (status !== 401 && status !== 403) return null;
  return fail(
    `the API token lacks permission for this read (HTTP ${status}); grant the token ${scope} access`
  );
}

async function resolveZoneId(ctx: DoctorContext, domain: string): Promise<CheckOutcome<string>> {
  // The from-domain may be its own Cloudflare zone (mail.example.com registered directly), so
  // the exact name is tried first and the registrable domain is the fallback.
  const apex = registrableDomain(domain);
  const names = domain === apex ? [domain] : [domain, apex];
  for (const name of names) {
    const res = await cfGet(ctx, `/zones?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      return { fail: fail(`zone lookup for ${name} returned ${res.status}`) };
    }
    const body = (await res.json()) as { result?: { id?: string }[] };
    const id = body.result?.[0]?.id;
    if (typeof id === 'string') return { value: id };
  }
  return { fail: fail(`no zone named ${names.join(' or ')} is visible to this token`) };
}

/** Resolve the domain's zone and read one of its settings, returning `result.value`. */
async function readZoneSetting<T>(
  ctx: DoctorContext,
  domain: string,
  settingId: string
): Promise<CheckOutcome<T | undefined>> {
  const zone = await resolveZoneId(ctx, domain);
  if ('fail' in zone) return zone;
  const res = await cfGet(ctx, `/zones/${zone.value}/settings/${settingId}`);
  if (!res.ok) {
    return { fail: fail(`${settingId} read returned ${res.status}`) };
  }
  const body = (await res.json()) as { result?: { value?: T } };
  return { value: body.result?.value };
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
      const res = await cfGet(ctx, `/zones/${zone.value}/email/sending/subdomains`);
      if (!res.ok) {
        return (
          permissionFail(res.status, 'Email Sending: Read') ??
          fail(`sending subdomain list returned ${res.status}`)
        );
      }
      const body = (await res.json()) as { result?: { name?: string; enabled?: boolean }[] };
      const entry = body.result?.find((s) => s.name === domain);
      if (entry?.enabled === true) {
        return pass(`${domain} has an enabled sending subdomain`);
      }
      if (entry) {
        return fail(`${domain} is onboarded but sending is disabled`);
      }
      return fail(`${domain} has no sending subdomain on the zone`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
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
      const setting = await readZoneSetting<string>(ctx, fromDomain(ctx.from), 'always_use_https');
      if ('fail' in setting) return setting.fail;
      if (setting.value === 'on') {
        return pass('Always Use HTTPS is on');
      }
      return fail(`always_use_https is ${setting.value ?? 'unreadable'}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

interface SecurityHeaderValue {
  strict_transport_security?: { enabled?: boolean; max_age?: number };
}

export const edgeHsts: DoctorCheck = {
  id: 'edge.hsts',
  conditionId: 'edge.hsts-off',
  title: 'HSTS',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    if (!ctx.cfToken) return NO_TOKEN;
    if (!ctx.from) return NO_FROM;
    try {
      const setting = await readZoneSetting<SecurityHeaderValue>(
        ctx,
        fromDomain(ctx.from),
        'security_header'
      );
      if ('fail' in setting) return setting.fail;
      const sts = setting.value?.strict_transport_security;
      if (sts?.enabled !== true) {
        return fail('HSTS is disabled on the zone');
      }
      const maxAge = sts.max_age ?? 0;
      if (maxAge < MIN_HSTS_MAX_AGE) {
        return fail(`HSTS max-age ${maxAge} is under the ${MIN_HSTS_MAX_AGE} (30 day) floor`);
      }
      return pass(`HSTS enabled with max-age ${maxAge}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

const AUTH_TABLES = ['editor', 'magic_token', 'session'];

async function d1Query(
  ctx: DoctorContext,
  databaseId: string,
  sql: string,
  params: unknown[] = []
): Promise<CheckOutcome<Record<string, unknown>[]>> {
  const res = await cfPost(
    ctx,
    `/accounts/${ctx.cfAccountId}/d1/database/${encodeURIComponent(databaseId)}/query`,
    { sql, params }
  );
  if (!res.ok) {
    return {
      fail:
        permissionFail(res.status, 'D1: Read') ??
        fail(`AUTH_DB is unreachable: the query returned ${res.status}`),
    };
  }
  const body = (await res.json()) as { result?: { results?: Record<string, unknown>[] }[] };
  return { value: body.result?.[0]?.results ?? [] };
}

export const authStore: DoctorCheck = {
  id: 'auth.store',
  conditionId: 'auth.store-unreachable',
  title: 'Auth store (D1)',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT;
    const facts = await readWranglerConfig(ctx.readFile);
    if (typeof facts?.authDbId !== 'string') {
      return skip('no AUTH_DB database_id in wrangler.jsonc or wrangler.toml');
    }
    try {
      const tables = await d1Query(ctx, facts.authDbId, "SELECT name FROM sqlite_master WHERE type='table'");
      if ('fail' in tables) return tables.fail;
      const names = new Set(tables.value.map((row) => row.name));
      const missing = AUTH_TABLES.filter((table) => !names.has(table));
      if (missing.length) {
        return fail(`auth schema is missing: ${missing.join(', ')}`);
      }
      const ownerRoles = ownerLevelRoles(ctx.roles);
      const roles = ownerRoles.length > 0 ? ownerRoles : ['owner'];
      const placeholders = roles.map(() => '?').join(', ');
      const owners = await d1Query(
        ctx,
        facts.authDbId,
        `SELECT count(*) AS n FROM editor WHERE role IN (${placeholders})`,
        roles
      );
      if ('fail' in owners) return owners.fail;
      const n = owners.value[0]?.n;
      if (typeof n === 'number' && n >= 1) {
        return pass(`auth schema present with ${n} owner-capability row(s)`);
      }
      return fail('the editor table holds no owner-capability row');
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

/**
 * A role string declared in the vocabulary, checked by name (not resolved capability), so a role
 * explicitly declared with `'none'` capability is still counted as known.
 */
function isDeclaredRole(roles: DoctorContext['roles'], role: string): boolean {
  const vocabulary = roles ?? DEFAULT_ROLES;
  return Object.hasOwn(vocabulary, role);
}

export const roleVocabulary: DoctorCheck = {
  id: 'auth.role-vocabulary',
  conditionId: 'auth.unknown-role',
  title: 'Editor role vocabulary',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT;
    const facts = await readWranglerConfig(ctx.readFile);
    if (typeof facts?.authDbId !== 'string') {
      return skip('no AUTH_DB database_id in wrangler.jsonc or wrangler.toml');
    }
    try {
      const rows = await d1Query(ctx, facts.authDbId, 'SELECT DISTINCT role FROM editor');
      if ('fail' in rows) return rows.fail;
      const unknown = rows.value
        .map((row) => String(row.role))
        .filter((role) => !isDeclaredRole(ctx.roles, role));
      if (unknown.length > 0) {
        return fail(`editor row(s) use role(s) outside the declared vocabulary: ${unknown.join(', ')}`);
      }
      return pass('every editor role is declared in the vocabulary');
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

export const emailNormalization: DoctorCheck = {
  id: 'auth.email-normalization',
  conditionId: 'auth.email-not-normalized',
  title: 'Editor email normalization',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT;
    const facts = await readWranglerConfig(ctx.readFile);
    if (typeof facts?.authDbId !== 'string') {
      return skip('no AUTH_DB database_id in wrangler.jsonc or wrangler.toml');
    }
    try {
      const rows = await d1Query(ctx, facts.authDbId, 'SELECT email FROM editor');
      if ('fail' in rows) return rows.fail;
      const bad = rows.value
        .map((row) => String(row.email))
        .filter((email) => email !== email.trim().toLowerCase());
      if (bad.length > 0) {
        return fail(`editor row(s) with a non-normalized email: ${bad.join(', ')}`);
      }
      return pass('every editor email is trimmed and lowercase');
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
