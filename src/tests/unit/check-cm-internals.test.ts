import { describe, it, expect } from 'vitest';
import { collectCmTokens, evaluate } from '../../../scripts/check-cm-internals.mjs';

const allow = {
  writingSurface: ['.cm-content', '.cm-lintRange-info'],
  cairnPrefix: '.cm-cairn-',
  chromeFloor: ['.cm-tooltip'],
  enumeratedFiles: ['a.ts'],
};

describe('collectCmTokens', () => {
  it('splits a composite selector key into individual tokens', () => {
    expect(collectCmTokens("'.cm-tooltip.cm-tooltip-lint': {}")).toEqual(
      expect.arrayContaining(['.cm-tooltip', '.cm-tooltip-lint']),
    );
  });
});

describe('evaluate', () => {
  it('passes when every cm class is writing-surface, cairn-prefixed, or the chrome floor', () => {
    const files = [{ path: 'a.ts', source: "'.cm-content': {}; '.cm-cairn-x': {}; '.cm-tooltip': {}" }];
    expect(evaluate(files, allow).pass).toBe(true);
  });

  it('fails on an unsanctioned chrome class, naming it', () => {
    const { pass, failures } = evaluate([{ path: 'a.ts', source: "'.cm-tooltip-lint': {}" }], allow);
    expect(pass).toBe(false);
    expect(failures.join('\n')).toContain('.cm-tooltip-lint');
  });

  it('exempts cairn-prefixed interpolation but catches chrome interpolation', () => {
    expect(evaluate([{ path: 'a.ts', source: '`.cm-cairn-depth-${d}`' }], allow).pass).toBe(true);
    expect(evaluate([{ path: 'a.ts', source: '`.cm-tooltip-${x}`' }], allow).pass).toBe(false);
    expect(evaluate([{ path: 'a.ts', source: 'const s = `.cm-${name}`;' }], allow).pass).toBe(false);
  });
});
