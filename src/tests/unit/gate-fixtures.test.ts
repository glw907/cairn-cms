// The captured GitHub page fixtures hold a scrubbed control list and nothing that identifies the
// test account or carries a credential.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./fixtures/gate-pages/', import.meta.url);
const fixtures = readdirSync(dir).filter((name) => /^github-.+\.txt$/.test(name));

const forbidden: Array<[string, RegExp]> = [
  ['the test login', /glw907-test/],
  ['a real gate App name', /cairn-e2e-gate-(?!fixture\b)/],
  ['an email address or @', /@/],
  ['a token or code query', /(token|code)=/],
];

describe('the captured GitHub page fixtures', () => {
  it('exist for the manifest, install, and authorize pages', () => {
    expect(fixtures).toEqual(['github-authorize.txt', 'github-install.txt', 'github-manifest.txt']);
  });

  it.each(fixtures)('%s holds no login, real App name, address, or credential', (name) => {
    const text = readFileSync(new URL(name, dir), 'utf8');
    for (const [label, pattern] of forbidden) expect(text, label).not.toMatch(pattern);
  });
});
