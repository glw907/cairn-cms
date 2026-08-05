// cairn-cms: scripts/dev-fold-markers.txt feeds `grep -F -f` in e2e.yml and scaffold.yml. Under
// GNU grep, a blank line in a -f pattern file matches every line, which would turn the dev-fold
// gate red on every run (spec docs/superpowers/specs/2026-08-04-auth-channel-consumer-proof-design.md,
// "Fold markers: two lists, two propositions"). A `#`-prefixed line would also grep literally
// rather than act as a comment, since -F takes every line as a fixed string. This test keeps the
// file honest.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

function markerLines(): string[] {
  const raw = readFileSync(resolve(ROOT, 'scripts/dev-fold-markers.txt'), 'utf-8');
  return raw.split('\n').filter((_, index, all) => !(index === all.length - 1 && all[index] === ''));
}

describe('scripts/dev-fold-markers.txt', () => {
  it('has no empty lines', () => {
    const lines = markerLines();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toBe('');
    }
  });

  it('has no #-prefixed lines', () => {
    for (const line of markerLines()) {
      expect(line.startsWith('#')).toBe(false);
    }
  });

  it('carries the dev-backend markers plus createChannelDb', () => {
    const lines = markerLines();
    expect(lines).toEqual([
      'editor@showcase.test',
      'createDevBackend',
      'devBackendHandle',
      'cairn-cms-dev',
      'dev-token',
      'sk-showcase-stub',
      'createFakeAuthDb',
      'createFakeR2',
      'createFakeAnthropic',
      'lastRecordedCommit',
      'committedFile',
      'createChannelDb',
    ]);
  });
});
