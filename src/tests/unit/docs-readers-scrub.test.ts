import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REDACTED, scrub } from '../../../scripts/docs-readers/lib/scrub.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixture = readFileSync(join(ROOT, 'scripts/docs-readers/fixtures/transcripts/token-bearing.jsonl'), 'utf8');
const literal = 'literal-fixture-secret-9f8e7d';

describe('scrub', () => {
  it('removes every token-shaped string and the run secret from the written fixture transcript', () => {
    const out = scrub(fixture, [literal]);
    expect(out).not.toMatch(/sk-ant-/);
    expect(out).not.toMatch(/ghs_/);
    expect(out).not.toMatch(/FIXTUREfake/);
    expect(out).not.toContain(literal);
    expect(out).toContain(`Bearer ${REDACTED}`);
    expect(out.split('\n').filter(Boolean).every((line) => JSON.parse(line))).toBe(true);
  });

  it('leaves ordinary transcript text alone and ignores secrets too short to match safely', () => {
    const text = '{"type":"result","usage":{"input_tokens":9},"result":"npm test passed"}';
    expect(scrub(text, ['npm', ''])).toBe(text);
  });

  it('keeps the label of a labelled credential and drops its value', () => {
    expect(scrub('x-api-key: abcdefghijklmnop1234')).toBe(`x-api-key: ${REDACTED}`);
    expect(scrub('password=abcdefghijklmnop1234')).toBe(`password=${REDACTED}`);
  });
});
