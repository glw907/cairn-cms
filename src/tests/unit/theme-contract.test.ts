import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const contract = JSON.parse(readFileSync(new URL('../../../schema/cairn-theme-contract-1.json', import.meta.url), 'utf8')) as {
  tokens: { required: string[] };
};

describe('theme contract v1', () => {
  it('requires the eyebrow-case and scroll-cue roles', () => {
    expect(contract.tokens.required).toContain('--cairn-eyebrow-case');
    expect(contract.tokens.required).toContain('--cairn-scroll-cue');
  });
});
