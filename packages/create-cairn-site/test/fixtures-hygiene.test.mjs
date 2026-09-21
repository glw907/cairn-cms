// Walks every file under fixtures/ and fails if one carries a real identifier: an email address
// or the estate account id. The corpus is meant to travel with the Go tool (fixtures/README.md
// names the trigger), so nothing in it may be a credential or an operator's own identity, even
// though every fixture is a real captured API response.
//
// `message_id` is exempted from the email-shaped check: a captured send-success body's
// `message_id` is an opaque, mail-server-generated token that is syntactically email-shaped
// (RFC 5322's own Message-ID grammar is `local-part@domain`) without naming anyone's identity,
// and the corpus's own `email_send.success.200.json` carries one against the scratch domain
// `carin-test.org`. Every other string in the corpus is still checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures', import.meta.url));
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const BANNED_ACCOUNT_ID = '120c269ad6d3dfbe6d63a0bb53758ca0';
const EMAIL_EXEMPT_KEYS = new Set(['message_id']);

/**
 * Report whether a parsed JSON value holds an email-shaped string anywhere beneath it, ignoring a
 * value reached through an exempt key.
 * @param {unknown} value the value to search
 * @param {string} [key] the key `value` was reached through, absent at the root and inside an array
 * @returns {boolean} true when an offending string is present
 */
function hasEmailShapedString(value, key) {
  if (typeof value === 'string') {
    if (key && EMAIL_EXEMPT_KEYS.has(key)) return false;
    return EMAIL_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasEmailShapedString(entry, key));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([entryKey, entryValue]) => hasEmailShapedString(entryValue, entryKey));
  }
  return false;
}

test('no fixture carries an email address or the estate account id', () => {
  const offenders = [];
  for (const entry of readdirSync(FIXTURES_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const contents = readFileSync(path, 'utf8');
    if (contents.includes(BANNED_ACCOUNT_ID)) {
      offenders.push(path);
      continue;
    }
    if (path.endsWith('.json')) {
      if (hasEmailShapedString(JSON.parse(contents))) offenders.push(path);
    } else if (EMAIL_PATTERN.test(contents)) {
      offenders.push(path);
    }
  }
  assert.deepEqual(offenders, [], `fixture(s) carry a real identifier: ${offenders.join(', ')}`);
});
