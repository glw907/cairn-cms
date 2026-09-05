import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  findLeadingTabIndentLines,
  findProcessExitLines,
  selfIdentityCandidates,
  selfIdentityVariantsUsed,
  findSuperpowersPathLines,
  findProcessReferenceLines,
  findConsumerHostnameLines,
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

describe('findSuperpowersPathLines', () => {
  it('flags a comment naming a docs/superpowers/ path', () => {
    expect(findSuperpowersPathLines('// see docs/superpowers/plans/x.md\n')).toEqual([1]);
  });

  it('passes a docs/internal/ path, which the tarball does ship', () => {
    expect(findSuperpowersPathLines('// see docs/internal/engine-rulings.md\n')).toEqual([]);
  });

  it('matches the fixture file’s real reference', () => {
    const source = readFileSync(resolve(FIXTURES, 'superpowers-path.ts'), 'utf8');
    expect(findSuperpowersPathLines(source)).toEqual([1]);
  });
});

describe('findProcessReferenceLines', () => {
  it('flags Task N, Pass N, Plan NN, and Round N labels', () => {
    expect(findProcessReferenceLines('// closed in Task 5\n')).toEqual([1]);
    expect(findProcessReferenceLines('// landed in Pass 3\n')).toEqual([1]);
    expect(findProcessReferenceLines('// see Plan 05\n')).toEqual([1]);
    expect(findProcessReferenceLines('// settled at Round 2\n')).toEqual([1]);
  });

  it('flags "this pass" and "this phase"', () => {
    expect(findProcessReferenceLines('// this pass avoided the refactor\n')).toEqual([1]);
    expect(findProcessReferenceLines('// out of scope this phase\n')).toEqual([1]);
  });

  it('flags a named-sweep parenthetical', () => {
    expect(findProcessReferenceLines('// dropped the field (env-genericity sweep)\n')).toEqual([1]);
  });

  it('flags a bare round marker not on the exemption list', () => {
    expect(findProcessReferenceLines('// merged in the C2 breaking-window pass\n')).toEqual([1]);
  });

  it('passes a bare functional-spec citation', () => {
    expect(findProcessReferenceLines('// see spec 2.8 for the contract\n')).toEqual([]);
  });

  it('passes the ruled round-marker exceptions: R2, C0, R4 re-export/closure', () => {
    expect(findProcessReferenceLines('// the media R2 bucket binding\n')).toEqual([]);
    expect(findProcessReferenceLines('// strip C0 control characters\n')).toEqual([]);
    expect(findProcessReferenceLines('// a recorded R4 re-export names it\n')).toEqual([]);
    expect(findProcessReferenceLines('// documented as an R4 closure over the field\n')).toEqual([]);
  });

  it('matches the fixture file’s real hits and passes its exempt lines', () => {
    const source = readFileSync(resolve(FIXTURES, 'process-reference.ts'), 'utf8');
    expect(findProcessReferenceLines(source)).toEqual([2, 3, 4, 5]);
  });
});

describe('findConsumerHostnameLines', () => {
  it('flags a bare hostname-shaped literal', () => {
    expect(findConsumerHostnameLines('// mentions notreal-consumer.ski by name\n')).toEqual([1]);
  });

  it('passes an allowlisted public standards or vendor host', () => {
    expect(findConsumerHostnameLines('// per w3.org and github.com conventions\n')).toEqual([]);
  });

  it('does not false-positive on a code identifier chain', () => {
    expect(findConsumerHostnameLines('const x = ctx.page.info;\n')).toEqual([]);
  });

  it('matches the fixture file’s real hit and passes its allowlisted line', () => {
    const source = readFileSync(resolve(FIXTURES, 'consumer-hostname.ts'), 'utf8');
    expect(findConsumerHostnameLines(source)).toEqual([2]);
  });
});

const EMPTY_VIOLATIONS = {
  tabs: [],
  exit: [],
  identity: [],
  superpowersPaths: [],
  processReferences: [],
  hostnames: [],
};

describe('formatViolations', () => {
  it('renders each populated category with its own heading', () => {
    const text = formatViolations({
      ...EMPTY_VIOLATIONS,
      tabs: ['a.ts:1'],
      identity: ['b.mjs: mixes check-b, b'],
      superpowersPaths: ['c.ts:2'],
      processReferences: ['c.ts:3'],
      hostnames: ['c.ts:4'],
    });
    expect(text).toContain('1 leading-tab indentation hit(s)');
    expect(text).toContain('a.ts:1');
    expect(text).not.toContain('process.exit call(s)');
    expect(text).toContain('1 self-identity spelling mismatch(es)');
    expect(text).toContain('b.mjs: mixes check-b, b');
    expect(text).toContain('1 docs/superpowers/ path reference(s)');
    expect(text).toContain('1 pass-scoped process reference(s)');
    expect(text).toContain('1 unrecognized hostname literal(s)');
  });

  it('renders nothing for an all-clean report', () => {
    expect(formatViolations(EMPTY_VIOLATIONS)).toBe('');
  });
});

// Acceptance: the gate is born green on the real tree, including over its own file (scanIdioms
// walks scripts/checks, which contains check-idioms.mjs itself) and over all of src/lib for the
// comment-register rules.
describe('scanIdioms (the real tree)', () => {
  it('finds zero violations, fixtures excluded', () => {
    const violations = scanIdioms();
    expect(violations).toEqual(EMPTY_VIOLATIONS);
  });
});
