import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  findLeadingTabIndentLines,
  findProcessExitLines,
  selfIdentityCandidates,
  selfIdentityVariantsUsed,
  formatViolations,
  scanIdioms,
} from '../../../scripts/checks/check-idioms.mjs';

const FIXTURES = resolve(process.cwd(), 'scripts/checks/fixtures/idioms');

describe('findLeadingTabIndentLines', () => {
  it('flags a line whose first character is a tab', () => {
    expect(findLeadingTabIndentLines('const x = 1;\n\treturn x;\n')).toEqual([2]);
  });

  it('passes a file indented entirely with spaces', () => {
    expect(findLeadingTabIndentLines('function f() {\n  return 1;\n}\n')).toEqual([]);
  });

  it('ignores a tab that is not the line-leading character', () => {
    expect(findLeadingTabIndentLines('const s = "a\tb";\n')).toEqual([]);
  });

  it('matches the fixture file’s real tab-indented line', () => {
    const source = readFileSync(resolve(FIXTURES, 'tab-indented.ts'), 'utf8');
    expect(findLeadingTabIndentLines(source)).toEqual([5]);
  });
});

describe('findProcessExitLines', () => {
  it('flags a raw process.exit( call', () => {
    expect(findProcessExitLines('if (!ok) {\n  process.exit(1);\n}\n')).toEqual([2]);
  });

  it('does not flag process.exitCode, a different member entirely', () => {
    expect(findProcessExitLines('process.exitCode = 1;\n')).toEqual([]);
  });

  it('matches the fixture file’s real call', () => {
    const source = readFileSync(resolve(FIXTURES, 'process-exit.mjs'), 'utf8');
    expect(findProcessExitLines(source)).toEqual([5]);
  });
});

describe('selfIdentityCandidates', () => {
  it('offers the full, npm-script, and bare forms for a check-* stem', () => {
    expect(selfIdentityCandidates('check-chassis-boundary')).toEqual([
      'check-chassis-boundary',
      'check:chassis-boundary',
      'chassis-boundary',
    ]);
  });

  it('offers only the stem itself for a non-check-* helper', () => {
    expect(selfIdentityCandidates('reference-coverage')).toEqual(['reference-coverage']);
  });
});

describe('selfIdentityVariantsUsed', () => {
  it('finds two distinct spellings in the mixed-identity fixture', () => {
    const source = readFileSync(resolve(FIXTURES, 'check-mixed-identity.mjs'), 'utf8');
    expect(selfIdentityVariantsUsed('check-mixed-identity', source).sort()).toEqual(
      ['check-mixed-identity', 'mixed-identity'].sort(),
    );
  });

  it('finds one spelling in the consistent-identity fixture', () => {
    const source = readFileSync(resolve(FIXTURES, 'check-consistent-identity.mjs'), 'utf8');
    expect(selfIdentityVariantsUsed('check-consistent-identity', source)).toEqual(['check-consistent-identity']);
  });

  it('ignores a leading word that is not a plausible self-identity spelling', () => {
    const source = "console.log('OK done');\nconsole.error(`Contrast check (x): FAIL`);\n";
    expect(selfIdentityVariantsUsed('check-public-tokens', source)).toEqual([]);
  });
});

describe('formatViolations', () => {
  it('renders each populated category with its own heading', () => {
    const text = formatViolations({
      tabs: ['a.ts:1'],
      exit: [],
      identity: ['b.mjs: mixes check-b, b'],
    });
    expect(text).toContain('1 leading-tab indentation hit(s)');
    expect(text).toContain('a.ts:1');
    expect(text).not.toContain('process.exit call(s)');
    expect(text).toContain('1 self-identity spelling mismatch(es)');
    expect(text).toContain('b.mjs: mixes check-b, b');
  });

  it('renders nothing for an all-clean report', () => {
    expect(formatViolations({ tabs: [], exit: [], identity: [] })).toBe('');
  });
});

// Acceptance: the gate is born green on the real tree, including over its own file (scanIdioms
// walks scripts/checks, which contains check-idioms.mjs itself).
describe('scanIdioms (the real tree)', () => {
  it('finds zero violations, fixtures excluded', () => {
    const violations = scanIdioms();
    expect(violations).toEqual({ tabs: [], exit: [], identity: [] });
  });
});
