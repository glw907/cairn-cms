// The scrubber and the staged-corpus check. A body is scrubbed by key name (a credential key's
// value is never kept) and by exact value (every credential the recorder handled is a needle), then
// the staged directory is searched for each held value, so a scrub that missed one fails the run.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * Build a scrubber. Held values persist for the run, so a credential seen in one response is
 * scrubbed from every later body.
 * @returns {{ hold: (value: unknown, placeholder?: string) => void, scrub: (value: unknown, key?: string) => unknown, held: () => string[] }}
 */
export function createScrubber() {
  /** @type {Map<string, string>} */
  const needles = new Map();
  /** @type {Map<string, string>} */
  const hexIds = new Map();

  /**
   * Hold a value as a needle.
   * @param {unknown} value the exact value to scrub; non-strings and very short strings are ignored
   * @param {string} [placeholder] its replacement
   */
  function hold(value, placeholder = '<REDACTED>') {
    if (typeof value === 'string' && value.length >= 6) needles.set(value, placeholder);
  }

  /** @param {string} text */
  function scrubString(text) {
    let out = text;
    for (const needle of [...needles.keys()].sort((a, b) => b.length - a.length)) out = out.split(needle).join(needles.get(needle) ?? '');
    out = out.replace(PEM, '<REDACTED>').replace(TOKEN, '<REDACTED>').replace(EMAIL, 'editor-redacted');
    return out.replace(HEX32, (id) => {
      if (!hexIds.has(id)) hexIds.set(id, String(hexIds.size + 1).padStart(32, '0'));
      return /** @type {string} */ (hexIds.get(id));
    });
  }

  /**
   * Scrub a parsed JSON value. A credential key's string value is held before it is replaced, so
   * the later grep covers it.
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
      return scrubString(value);
    }
    if (Array.isArray(value)) return value.map((entry) => scrub(entry, key));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, scrub(entry, name)]));
    }
    return value;
  }

  return { hold, scrub, held: () => [...needles.keys()] };
}

/**
 * @param {unknown} value
 * @param {string} [key]
 * @returns {boolean}
 */
function hasEmail(value, key) {
  if (typeof value === 'string') return !(key && EMAIL_EXEMPT_KEYS.has(key)) && new RegExp(EMAIL.source, 'i').test(value);
  if (Array.isArray(value)) return value.some((entry) => hasEmail(entry, key));
  if (value && typeof value === 'object') return Object.entries(value).some(([name, entry]) => hasEmail(entry, name));
  return false;
}

/**
 * Search the staged corpus for every held value and for credential and email shapes.
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
    held.forEach((value, index) => {
      if (value && text.includes(value)) findings.push(`${path}: held value #${index}`);
    });
    if (new RegExp(TOKEN.source).test(text)) findings.push(`${path}: token shape`);
    if (new RegExp(PEM.source).test(text)) findings.push(`${path}: PEM block`);
    if (path.endsWith('.json')) {
      if (hasEmail(JSON.parse(text))) findings.push(`${path}: email`);
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
