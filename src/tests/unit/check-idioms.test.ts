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
  findAsNeverLines,
  formatViolations,
  scanIdioms,
  COMMENT_SCOPE_PATTERN,
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

  it('flags Phase N, lettered and numbered Pass, Plan N, batch N, and round-N', () => {
    expect(findProcessReferenceLines('// proven live at Phase 2b and on a site.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// phase 4b islands are eagerly mounted.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// A file is the only path (Pass B is upload-new-only).\n')).toEqual([1]);
    expect(findProcessReferenceLines('// closed out in pass 3b of the sweep.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// the dark root gains variables in plan 2.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// retired from the barrel (batch 1a: zero consumers).\n')).toEqual([1]);
    expect(findProcessReferenceLines('// recomposed for round-3 of the amendment.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// carried at graduation (Members-refinement-round-1).\n')).toEqual([1]);
  });

  it('flags a design-arc/design-ratchet iteration citation', () => {
    expect(findProcessReferenceLines('// the toolbar control (design-arc D2) sits at the right end.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// this is not a two-segment capsule (Design ratchet D3 item 5).\n')).toEqual([1]);
  });

  it('flags a T<n> marker only when its own line also reads as an adoption/sweep/task citation', () => {
    expect(findProcessReferenceLines('// the header band (the organization pass\'s T7 adoption sweep) is PageHeader.\n')).toEqual([1]);
    expect(findProcessReferenceLines('// a dense table column budgets against T2 of its remaining width.\n')).toEqual([]);
  });

  it('passes domain vocabulary carrying no numeric or letter suffix', () => {
    expect(findProcessReferenceLines('// a validation pass over the whole tree found nothing else to fix.\n')).toEqual([]);
    expect(findProcessReferenceLines('// the constraints pass never rejects a value with no assigned rule.\n')).toEqual([]);
    expect(findProcessReferenceLines('// db.batch() writes every row in one round trip.\n')).toEqual([]);
    expect(findProcessReferenceLines('// the migration did not pass on the first attempt.\n')).toEqual([]);
  });

  it('matches the fixture file’s real hits and passes its exempt and negative lines', () => {
    const source = readFileSync(resolve(FIXTURES, 'process-reference.ts'), 'utf8');
    expect(findProcessReferenceLines(source)).toEqual([2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14]);
  });
});

describe('COMMENT_SCOPE_PATTERN', () => {
  it('matches .ts, .svelte, and .css, and rejects an unrelated extension', () => {
    expect(COMMENT_SCOPE_PATTERN.test('content-routes.ts')).toBe(true);
    expect(COMMENT_SCOPE_PATTERN.test('EditPage.svelte')).toBe(true);
    expect(COMMENT_SCOPE_PATTERN.test('cairn-admin.css')).toBe(true);
    expect(COMMENT_SCOPE_PATTERN.test('walk-files.mjs')).toBe(false);
  });

  it('catches a pass-scoped reference inside a real CSS comment', () => {
    const source = readFileSync(resolve(FIXTURES, 'comment-scope.css'), 'utf8');
    expect(findProcessReferenceLines(source)).toEqual([1]);
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

describe('findAsNeverLines', () => {
  it('flags a bare as-never cast', () => {
    expect(findAsNeverLines('const x = value as never;\n')).toEqual([1]);
  });

  it('passes a cast carrying the idioms-allow escape hatch', () => {
    expect(
      findAsNeverLines(
        "const x = value as never; // idioms-allow: as-never  feeds the runtime guard an off-union value\n",
      ),
    ).toEqual([]);
  });

  it('does not false-positive on prose containing the substring ("was never")', () => {
    expect(findAsNeverLines('// this control was never load-bearing.\n')).toEqual([]);
  });

  it('does not flag a backtick-quoted mention of the phrase', () => {
    expect(findAsNeverLines('// the same as a stray `as never` would in production.\n')).toEqual([]);
  });

  it('matches the fixture file’s real hits and passes its escaped and mention lines', () => {
    const source = readFileSync(resolve(FIXTURES, 'as-never.ts'), 'utf8');
    expect(findAsNeverLines(source)).toEqual([2]);
  });
});

const EMPTY_VIOLATIONS = {
  tabs: [],
  exit: [],
  identity: [],
  superpowersPaths: [],
  processReferences: [],
  hostnames: [],
  asNever: [],
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
      asNever: ['d.test.ts:5'],
    });
    expect(text).toContain('1 leading-tab indentation hit(s)');
    expect(text).toContain('a.ts:1');
    expect(text).not.toContain('process.exit call(s)');
    expect(text).toContain('1 self-identity spelling mismatch(es)');
    expect(text).toContain('b.mjs: mixes check-b, b');
    expect(text).toContain('1 docs/superpowers/ path reference(s)');
    expect(text).toContain('1 pass-scoped process reference(s)');
    expect(text).toContain('1 unrecognized hostname literal(s)');
    expect(text).toContain('1 unescaped "as never" cast(s)');
    expect(text).toContain('d.test.ts:5');
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
