// The scrubber, the route shapes, and the staged-corpus check. A body is first reduced to its
// route's shape (identity and inventory bodies keep only allowlisted fields, with synthetic names),
// then scrubbed by key name (a credential key's value is never kept) and by exact value (every
// credential and real name the recorder handled is a needle). The staged directory is then searched
// for each held value, so a scrub that missed one fails the run.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TEST_ZONE } from './guards.mjs';

const SECRET_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'value', 'encrypted_value', 'pem', 'client_secret',
  'webhook_secret', 'private_key', 'secret', 'password',
]);
const RAY_KEY = /^(cf[-_])?ray([-_]id)?$/i;
const TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,})/g;
const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HEX32 = /\b[0-9a-f]{32}\b/g;
const EMAIL_EXEMPT_KEYS = new Set(['message_id']);

/** Keys that name a person. No staged body may carry one. */
export const PERSONAL_KEYS = new Set(['first_name', 'last_name', 'telephone', 'zipcode', 'organizations']);

/** A needle shorter than this matches only as a whole token, so a Worker named `api` is held without wrecking unrelated text. */
const SHORT = 6;

/** @type {Record<'worker' | 'host' | 'zone' | 'account', (n: number) => string>} */
const ALIASES = {
  worker: (n) => `example-worker-${n}`,
  host: (n) => `example-${n}.${TEST_ZONE}`,
  zone: (n) => `example-zone-${n}.org`,
  account: (n) => `example-account-${n}`,
};

/** @param {string} text */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The pattern a needle matches: anywhere when long, as a whole token (bounded by anything but a
 * letter, digit, underscore, or hyphen) when short.
 * @param {string} needle
 */
function needlePattern(needle) {
  return needle.length >= SHORT ? new RegExp(escapeRegExp(needle), 'g') : new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(needle)}(?![A-Za-z0-9_-])`, 'g');
}

/**
 * Whether text carries a needle.
 * @param {string} text
 * @param {string} needle
 */
function carries(text, needle) {
  return needle.length >= SHORT ? text.includes(needle) : needlePattern(needle).test(text);
}

/**
 * Build a scrubber. Held values persist for the run, so a credential seen in one response is
 * scrubbed from every body staged with it.
 * @returns {{ hold: (value: unknown, placeholder?: string) => void, alias: (value: unknown, kind: keyof typeof ALIASES) => unknown, scrub: (value: unknown, key?: string) => unknown, held: () => string[] }}
 */
export function createScrubber() {
  /** @type {Map<string, string>} */
  const needles = new Map();
  /** @type {Map<string, string>} */
  const hexIds = new Map();
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {Set<string>} */
  const issued = new Set();

  /**
   * Hold a value as a needle.
   * @param {unknown} value the exact value to scrub; a non-string or an empty string is ignored
   * @param {string} [placeholder] its replacement
   */
  function hold(value, placeholder = '<REDACTED>') {
    if (typeof value === 'string' && value.length > 0) needles.set(value, placeholder);
  }

  /**
   * Hold a real name under a numbered synthetic one and return the synthetic one. The test zone
   * and its own placeholders are never held.
   * @param {unknown} value the real name
   * @param {keyof typeof ALIASES} kind which placeholder series
   * @returns {unknown} the placeholder, or the value unchanged when it is not a held name
   */
  function alias(value, kind) {
    if (typeof value !== 'string' || value.length === 0 || value === TEST_ZONE || issued.has(value)) return value;
    const known = needles.get(value);
    if (known) return known;
    counts[kind] = (counts[kind] ?? 0) + 1;
    const placeholder = ALIASES[kind](counts[kind]);
    needles.set(value, placeholder);
    issued.add(placeholder);
    return placeholder;
  }

  /** @param {string} text */
  function scrubString(text) {
    let out = text;
    for (const needle of [...needles.keys()].sort((a, b) => b.length - a.length)) out = out.replace(needlePattern(needle), needles.get(needle) ?? '');
    out = out.replace(PEM, '<REDACTED>').replace(TOKEN, '<REDACTED>').replace(EMAIL, 'editor-redacted');
    return out.replace(HEX32, (id) => {
      if (!hexIds.has(id)) hexIds.set(id, String(hexIds.size + 1).padStart(32, '0'));
      return /** @type {string} */ (hexIds.get(id));
    });
  }

  /**
   * Scrub a parsed JSON value. A credential key's string value is held before it is replaced, so
   * the later search covers it. A key that names a Worker, a hostname, or a zone has its value
   * aliased, so an inventory name nobody held still never reaches the corpus. Object keys are
   * scrubbed too.
   * @param {unknown} value the value
   * @param {string} [key] the key it was reached through
   * @returns {unknown} the scrubbed copy
   */
  function scrub(value, key) {
    if (typeof value === 'string') {
      if (key && SECRET_KEYS.has(key)) {
        hold(value);
        return '<REDACTED>';
      }
      if (key && RAY_KEY.test(key)) return 'ray-redacted';
      if (key === 'script' || key === 'service') return scrubString(/** @type {string} */ (alias(value, 'worker')));
      if (key === 'hostname') return scrubString(/** @type {string} */ (alias(value, 'host')));
      if (key === 'zone_name') return scrubString(/** @type {string} */ (alias(value, 'zone')));
      return scrubString(value);
    }
    if (Array.isArray(value)) return value.map((entry) => scrub(entry, key));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([name, entry]) => [scrubString(name), scrub(entry, name)]));
    }
    return value;
  }

  return { hold, alias, scrub, held: () => [...needles.keys()] };
}

/**
 * Copy only the named keys a value carries.
 * @param {unknown} value
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
function pick(value, keys) {
  if (!value || typeof value !== 'object') return {};
  const source = /** @type {Record<string, unknown>} */ (value);
  return Object.fromEntries(keys.filter((name) => Object.hasOwn(source, name)).map((name) => [name, source[name]]));
}

/** @param {any} body */
const results = (body) => (Array.isArray(body?.result) ? body.result : []);

/**
 * The v4 envelope with a replaced result. `result_info` stays verbatim, since pagination is what a
 * list fixture pins.
 * @param {unknown} body
 * @param {unknown} result
 */
const envelope = (body, result) => ({ ...pick(body, ['success', 'errors', 'messages', 'result_info']), result });

/** The made-up content a staged DNS record of each common type carries. */
const DNS_CONTENT = /** @type {Record<string, string>} */ ({
  A: '192.0.2.1',
  AAAA: '2001:db8::1',
  CNAME: `example-target.${TEST_ZONE}`,
  MX: `mail.${TEST_ZONE}`,
  TXT: 'example-txt-content',
});

/**
 * Each identity or inventory route's shape: the fields a decoder reads, with real names held and
 * replaced by synthetic ones. A route absent here is staged as the API sent it, then scrubbed.
 * @type {Record<string, (body: any, scrubber: ReturnType<typeof createScrubber>) => unknown>}
 */
const SHAPES = {
  'cloudflare/accounts': (body, s) => envelope(body, results(body).map((/** @type {any} */ account) => ({
    ...pick(account, ['id', 'type', 'created_on']),
    name: s.alias(account?.name, 'account'),
  }))),
  'cloudflare/user': (body, s) => {
    const user = body?.result ?? {};
    for (const field of ['first_name', 'last_name', 'telephone', 'zipcode', 'username']) s.hold(user[field]);
    for (const organization of Array.isArray(user.organizations) ? user.organizations : []) s.hold(organization?.name);
    return envelope(body, pick(user, ['id', 'email', 'suspended', 'two_factor_authentication_enabled', 'created_on', 'modified_on']));
  },
  'cloudflare/zones': (body, s) => {
    const all = results(body);
    for (const zone of all) if (zone?.name !== TEST_ZONE) s.alias(zone?.name, 'zone');
    return envelope(body, all.filter((/** @type {any} */ zone) => zone?.name === TEST_ZONE).map((/** @type {any} */ zone) => {
      const servers = Array.isArray(zone.name_servers) ? zone.name_servers : [];
      servers.forEach((/** @type {unknown} */ server, /** @type {number} */ index) => s.hold(server, `ns${index + 1}.example.ns.cloudflare.com`));
      return {
        ...pick(zone, ['id', 'name', 'status', 'paused', 'type', 'created_on', 'activated_on']),
        name_servers: servers.map((/** @type {unknown} */ _server, /** @type {number} */ index) => `ns${index + 1}.example.ns.cloudflare.com`),
        account: { id: zone.account?.id, name: s.alias(zone.account?.name, 'account') },
      };
    }));
  },
  // A record's content and comment are replaced outright: a TXT record can carry anything.
  'cloudflare/zone_dns_records': (body) => envelope(body, results(body).map((/** @type {any} */ record) => ({
    ...pick(record, ['id', 'type', 'name', 'proxied', 'ttl']),
    content: DNS_CONTENT[String(record?.type)] ?? 'example-record-content',
    comment: 'example record comment',
  }))),
  'cloudflare/workers_scripts': (body, s) => envelope(body, results(body).map((/** @type {any} */ script) => ({
    ...pick(script, ['tag', 'created_on', 'modified_on', 'handlers', 'has_assets', 'has_modules', 'usage_model', 'compatibility_date', 'last_deployed_from']),
    id: s.alias(script?.id, 'worker'),
  }))),
  'cloudflare/workers_domains': (body, s) => envelope(body, results(body).map((/** @type {any} */ domain) => ({
    ...pick(domain, ['id', 'zone_id', 'environment', 'enabled']),
    zone_name: s.alias(domain?.zone_name, 'zone'),
    hostname: s.alias(domain?.hostname, 'host'),
    service: s.alias(domain?.service, 'worker'),
  }))),
  'cloudflare/zone_workers_routes': (body, s) => envelope(body, results(body).map((/** @type {any} */ route) => ({
    ...pick(route, ['id', 'pattern']),
    script: s.alias(route?.script, 'worker'),
  }))),
  'cloudflare/subscriptions': (body, s) => envelope(body, results(body).map((/** @type {any} */ subscription) => {
    s.alias(subscription?.zone?.name, 'zone');
    return { ...pick(subscription, ['id', 'state', 'frequency']), rate_plan: pick(subscription?.rate_plan, ['id', 'scope']) };
  })),
};

/**
 * Reduce a body to its route's shape, holding the real names it drops or replaces.
 * @param {'cloudflare' | 'github'} provider
 * @param {string} route
 * @param {unknown} body
 * @param {ReturnType<typeof createScrubber>} scrubber
 * @returns {unknown}
 */
export function shapeBody(provider, route, body, scrubber) {
  const shape = SHAPES[`${provider}/${route}`];
  return shape ? shape(body, scrubber) : body;
}

/**
 * @param {unknown} value
 * @param {string} [key]
 * @returns {boolean}
 */
function hasEmail(value, key) {
  if (typeof value === 'string') return !(key && EMAIL_EXEMPT_KEYS.has(key)) && new RegExp(EMAIL.source, 'i').test(value);
  if (Array.isArray(value)) return value.some((entry) => hasEmail(entry, key));
  if (value && typeof value === 'object') return Object.entries(value).some(([name, entry]) => new RegExp(EMAIL.source, 'i').test(name) || hasEmail(entry, name));
  return false;
}

/**
 * Every decoded string a parsed value carries, keys included.
 * @param {unknown} value
 * @param {string[]} [out]
 * @returns {string[]}
 */
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => strings(entry, out));
  else if (value && typeof value === 'object') {
    for (const [name, entry] of Object.entries(value)) {
      out.push(name);
      strings(entry, out);
    }
  }
  return out;
}

/**
 * Whether a parsed value carries a personal-data key anywhere.
 * @param {unknown} value
 * @returns {boolean}
 */
function hasPersonalKey(value) {
  if (Array.isArray(value)) return value.some(hasPersonalKey);
  if (value && typeof value === 'object') return Object.entries(value).some(([name, entry]) => PERSONAL_KEYS.has(name) || hasPersonalKey(entry));
  return false;
}

/**
 * Search the staged corpus for every held value and for credential, email, and personal-data shapes.
 * A long held value is sought in the raw text, the file name, and every decoded string (keys
 * included), so a JSON-escaped copy is still found. A short one is sought only as a whole token in
 * the decoded strings: the raw text carries the recorder's own provenance note, and a file name is
 * built from the recorder's own route and case constants.
 * @param {string} dir the staging directory
 * @param {string[]} held the values the run handled
 * @returns {string[]} one line per finding, naming the file and the kind, never the value
 */
export function findLeaks(dir, held) {
  const findings = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const text = readFileSync(path, 'utf8');
    /** @type {unknown} */
    let parsed = null;
    if (path.endsWith('.json')) {
      parsed = JSON.parse(text);
      const provenance = /** @type {{ provenance?: { note?: unknown } } | null} */ (parsed)?.provenance;
      if (provenance && typeof provenance === 'object') parsed = { ...(/** @type {object} */ (parsed)), provenance: { ...provenance, note: undefined } };
    }
    const name = relative(dir, path);
    const decoded = strings(parsed);
    held.forEach((value, index) => {
      if (!value) return;
      const hit = (value.length >= SHORT && (text.includes(value) || name.includes(value))) || decoded.some((string) => carries(string, value));
      if (hit) findings.push(`${path}: held value #${index}`);
    });
    if (new RegExp(TOKEN.source).test(text)) findings.push(`${path}: token shape`);
    if (new RegExp(PEM.source).test(text)) findings.push(`${path}: PEM block`);
    if (parsed !== null) {
      if (hasEmail(parsed)) findings.push(`${path}: email`);
      if (hasPersonalKey(parsed)) findings.push(`${path}: personal-data field`);
    } else if (new RegExp(EMAIL.source, 'i').test(text)) findings.push(`${path}: email`);
  }
  return findings;
}

/**
 * Throw when the staged corpus leaks anything.
 * @param {string} dir the staging directory
 * @param {string[]} held the values the run handled
 */
export function verifyStaged(dir, held) {
  const findings = findLeaks(dir, held);
  if (findings.length > 0) throw new Error(`The staged corpus leaks:\n${findings.join('\n')}`);
}
