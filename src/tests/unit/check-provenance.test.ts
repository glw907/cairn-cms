import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractFacts,
  loadFactIndex,
  checkSentences,
  checkPageCoverage,
  checkProvenance,
  loadRebuiltList,
  checkBriefCoverage,
} from '../../../scripts/checks/check-provenance.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/checks/fixtures/provenance');
const FACTS = join(FIXTURES, 'facts');
const REBUILT_LISTS = join(FIXTURES, 'rebuilt-lists');
const NO_REBUILT_ENTRIES = join(REBUILT_LISTS, 'empty.json');

/** Every fact the extractor finds in `text`, as `kind:value` strings for compact assertions. */
function facts(text: string, keyPhrases: string[] = []): string[] {
  return extractFacts(text, keyPhrases).map((f) => `${f.kind}:${f.value}`);
}

describe('extractFacts', () => {
  it('finds a command and its flag inside a code span', () => {
    expect(facts('Run `cairn doctor --json` in your site directory.')).toEqual(['command:cairn doctor', 'flag:--json']);
  });

  it('finds numerals, versions, and dates in prose', () => {
    expect(facts('It exits 0 from 0.97.0-rc.1 on 2026-09-23, across 1,284 facts.')).toEqual([
      'date:2026-09-23',
      'version:0.97.0-rc.1',
      'numeral:0',
      'numeral:1284',
    ]);
  });

  it('finds paths in code spans and rooted or multi-segment paths in prose', () => {
    expect(facts('Edit `wrangler.jsonc` and `src/lib/log/`, then open /admin/posts or docs/STATUS.md.')).toEqual([
      'path:wrangler.jsonc',
      'path:src/lib/log/',
      'path:/admin/posts',
      'path:docs/STATUS.md',
    ]);
  });

  it('finds an unbackticked npm command and a prose flag', () => {
    expect(facts('Run npm run check:facts, then pass --dry-run.')).toEqual(['command:npm run check:facts', 'flag:--dry-run']);
  });

  it('finds backticked export, config, and package names', () => {
    expect(facts('`defineConcept()` reads `locals.cairnEditor`, `AUTH_DB`, and `@glw907/cairn-cms`.')).toEqual([
      'name:defineConcept',
      'name:locals.cairnEditor',
      'name:AUTH_DB',
      'name:@glw907/cairn-cms',
    ]);
  });

  it('finds an owner-tier key phrase case-insensitively, across emphasis and wrapping', () => {
    expect(facts('The defaults are **Floors,\n not ceilings**.', ['floors, not ceilings'])).toEqual([
      'key phrase:floors, not ceilings',
    ]);
  });

  it('leaves out link targets, spelled-out numbers, one-slash word pairs, and named frameworks', () => {
    expect(facts('See the [guide](../extend/logging.md): two roles, owner/editor, built on Node.js.')).toEqual([]);
  });

  it('does not read a numeral out of an identifier or a heading-like token', () => {
    expect(facts('Use an h2 heading and the `E_404` code.')).toEqual(['name:E_404']);
  });
});

describe('checkSentences, one failure mode per case', () => {
  const index = loadFactIndex(FACTS);
  const { cases } = JSON.parse(readFileSync(join(FIXTURES, 'cases.json'), 'utf8')) as {
    cases: Array<{ name: string; sentence: { text: string; id?: string }; expect: string | null }>;
  };

  for (const testCase of cases) {
    it(testCase.name, () => {
      const defects = checkSentences([testCase.sentence], index);
      if (testCase.expect === null) expect(defects).toEqual([]);
      else expect(defects).toEqual([expect.stringContaining(testCase.expect)]);
    });
  }
});

describe('loadFactIndex', () => {
  it('indexes fact bullets by id with their tag, skips the Harvest record, and collects key phrases', () => {
    const index = loadFactIndex(FACTS);
    expect(index.facts.size).toBe(9);
    expect(index.facts.get('f:pv0003')?.tag).toBe('external');
    expect(index.keyPhrases).toEqual(['floors, not ceilings']);
  });
});

describe('checkPageCoverage', () => {
  it('passes when every prose sentence on the page is in the brief, skipping headings and code blocks', () => {
    const page = '# Title\n\nOne sentence. Two sentence.\n\n```sh\nnpm test\n```\n\n- A list item.\n';
    const sentences = [{ text: 'One sentence.' }, { text: 'Two sentence.' }, { text: 'A list item.' }];
    expect(checkPageCoverage(page, sentences)).toEqual([]);
  });

  it('sets aside a fence indented under an ordered list item, backticks and tildes alike', () => {
    const page = [
      '1. **Encode the key.** Run this:',
      '',
      '   ```bash',
      '   node -e "process.stdout.write(1)" > new-key.b64',
      '   ```',
      '',
      '   It writes one line.',
      '',
      '2. **Push it.**',
      '',
      '    ~~~~',
      '    npx wrangler secret put KEY',
      '    ~~~~',
      '',
    ].join('\n');
    const sentences = [
      { text: '**Encode the key.**' },
      { text: 'Run this:' },
      { text: 'It writes one line.' },
      { text: '**Push it.**' },
    ];
    expect(checkPageCoverage(page, sentences)).toEqual([]);
  });

  it('fails a page sentence the brief leaves out and a brief sentence the page does not carry', () => {
    const page = 'One sentence. An extra sentence.\n';
    const defects = checkPageCoverage(page, [{ text: 'One sentence.' }, { text: 'A missing sentence.' }]);
    expect(defects).toEqual([
      expect.stringContaining('"A missing sentence." is not on the page'),
      expect.stringContaining('unclassified page text: "An extra sentence."'),
    ]);
  });
});

describe('checkProvenance, the full run', () => {
  it('passes and says so when no page has a brief yet', () => {
    const root = join(FIXTURES, 'site-empty');
    const result = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, [], NO_REBUILT_ENTRIES);
    expect(result.defects).toEqual([]);
    expect(result.report.join('\n')).toContain('no page has a brief yet');
  });

  it('passes when the briefs directory does not exist at all', () => {
    const root = join(FIXTURES, 'site-empty');
    const result = checkProvenance(join(root, 'docs/internal/no-such-dir'), FACTS, root, [], NO_REBUILT_ENTRIES);
    expect(result.defects).toEqual([]);
    expect(result.report.join('\n')).toContain('no page has a brief yet');
  });

  it('passes a brief whose every sentence is classified, cited correctly, and on the page', () => {
    const root = join(FIXTURES, 'site-good');
    const result = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, [], NO_REBUILT_ENTRIES);
    expect(result.defects).toEqual([]);
    expect(result.report.join('\n')).toContain('good-page.json: 11 sentences (cited 8, no-claim 3)');
  });

  it('fails a broken brief, a shapeless brief, a misfiled brief, and an uncovered page', () => {
    const root = join(FIXTURES, 'site-bad');
    const { defects } = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, [], NO_REBUILT_ENTRIES);
    expect(defects).toEqual([
      expect.stringMatching(/broken\.json: not valid JSON/),
      expect.stringMatching(/misfiled\.json: names page "docs\/admin\/some-other-page\.md", but a brief is filed under its page's own name/),
      expect.stringMatching(/misfiled\.json: page "docs\/admin\/some-other-page\.md" does not exist/),
      expect.stringMatching(/shapeless\.json: missing a "sentences" array/),
      expect.stringMatching(/uncovered\.json: .*"This sentence was never written on the page\." is not on the page/),
      expect.stringMatching(/uncovered\.json: .*unclassified page text: "This sentence is not in the brief\."/),
    ]);
  });

  it('with no-argument mode explicitly given an empty list, behaves the same as no argument at all', () => {
    const root = join(FIXTURES, 'site-good');
    const withArg = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, [], NO_REBUILT_ENTRIES);
    const withoutArg = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, undefined, NO_REBUILT_ENTRIES);
    expect(withArg).toEqual(withoutArg);
  });

  it('given one brief path, checks only that brief, so a sibling bad brief does not fail it', () => {
    const root = join(FIXTURES, 'site-bad');
    const { defects } = checkProvenance(
      join(root, 'docs/internal/briefs'),
      FACTS,
      root,
      ['docs/internal/briefs/admin/uncovered.json'],
    );
    expect(defects).toEqual([
      expect.stringMatching(/uncovered\.json: .*"This sentence was never written on the page\." is not on the page/),
      expect.stringMatching(/uncovered\.json: .*unclassified page text: "This sentence is not in the brief\."/),
    ]);
  });

  it('fails a brief path that does not exist, with a clear message', () => {
    const root = join(FIXTURES, 'site-bad');
    const { defects } = checkProvenance(
      join(root, 'docs/internal/briefs'),
      FACTS,
      root,
      ['docs/internal/briefs/admin/does-not-exist.json'],
    );
    expect(defects).toEqual([
      expect.stringContaining('docs/internal/briefs/admin/does-not-exist.json: does not exist'),
    ]);
  });

  it('fails a brief path that exists but sits outside docs/internal/briefs/, with a clear message', () => {
    const root = join(FIXTURES, 'site-bad');
    const outside = join(FIXTURES, 'facts/container.md');
    const { defects } = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, [outside]);
    expect(defects).toEqual([
      expect.stringContaining(`${outside}: is not under docs/internal/briefs/`),
    ]);
  });
});

describe('checkProvenance, brief coverage against the rebuilt-page list', () => {
  const root = join(FIXTURES, 'site-coverage');
  const briefsDir = join(root, 'docs/internal/briefs');

  it('fails a listed path whose page exists but no brief names it', () => {
    const { defects } = checkProvenance(briefsDir, FACTS, root, [], join(REBUILT_LISTS, 'no-brief.json'));
    expect(defects).toEqual([
      expect.stringContaining('lists "docs/admin/foo.md" as rebuilt, but no brief names it in its "page" field'),
    ]);
  });

  it('fails a listed path whose page no longer exists, reported as a stale list entry, not a missing brief', () => {
    const { defects } = checkProvenance(briefsDir, FACTS, root, [], join(REBUILT_LISTS, 'stale.json'));
    expect(defects).toEqual([
      expect.stringContaining('lists "docs/admin/does-not-exist.md" as rebuilt, but that page no longer exists: a stale list entry'),
    ]);
  });

  it('fails a listed docs/admin/README.md whose only README brief names docs/README.md', () => {
    const { defects } = checkProvenance(briefsDir, FACTS, root, [], join(REBUILT_LISTS, 'misnamed.json'));
    expect(defects).toEqual([
      expect.stringContaining('lists "docs/admin/README.md" as rebuilt, but no brief names it in its "page" field'),
    ]);
  });

  it('runs coverage before the zero-brief early return, so an empty briefs directory does not hide a gap', () => {
    const noBriefsDir = join(root, 'docs/internal/no-briefs-here');
    const { defects } = checkProvenance(noBriefsDir, FACTS, root, [], join(REBUILT_LISTS, 'no-brief.json'));
    expect(defects).toEqual([
      expect.stringContaining('lists "docs/admin/foo.md" as rebuilt, but no brief names it in its "page" field'),
    ]);
  });

  it('fails when the rebuilt list is absent', () => {
    const emptyRoot = join(FIXTURES, 'site-empty');
    const { defects } = checkProvenance(
      join(emptyRoot, 'docs/internal/briefs'),
      FACTS,
      emptyRoot,
      [],
      join(REBUILT_LISTS, 'does-not-exist.json'),
    );
    expect(defects).toEqual([expect.stringContaining('does not exist')]);
  });

  it('fails when the rebuilt list is not valid JSON', () => {
    const emptyRoot = join(FIXTURES, 'site-empty');
    const { defects } = checkProvenance(
      join(emptyRoot, 'docs/internal/briefs'),
      FACTS,
      emptyRoot,
      [],
      join(REBUILT_LISTS, 'invalid-json.json'),
    );
    expect(defects).toEqual([expect.stringContaining('not valid JSON')]);
  });

  it('fails when the rebuilt list is not a JSON array', () => {
    const emptyRoot = join(FIXTURES, 'site-empty');
    const { defects } = checkProvenance(
      join(emptyRoot, 'docs/internal/briefs'),
      FACTS,
      emptyRoot,
      [],
      join(REBUILT_LISTS, 'not-array.json'),
    );
    expect(defects).toEqual([expect.stringContaining('not a JSON array')]);
  });

  it('passes, and prints that nothing is rebuilt yet, when the list is empty and no briefs exist', () => {
    const emptyRoot = join(FIXTURES, 'site-empty');
    const result = checkProvenance(join(emptyRoot, 'docs/internal/briefs'), FACTS, emptyRoot, [], NO_REBUILT_ENTRIES);
    expect(result.defects).toEqual([]);
    expect(result.report.join('\n')).toContain('nothing is rebuilt yet');
  });

  // Default mode (no brief-path arguments) always needs the committed rebuilt-page list to check
  // coverage against; a caller that omits it used to reach loadRebuiltList's `relative(root,
  // listPath)` with `listPath` undefined and throw a TypeError instead of failing the gate.
  it('returns a clear defect, not a thrown TypeError, when rebuiltListPath is missing in default mode', () => {
    const root = join(FIXTURES, 'site-empty');
    const { defects } = checkProvenance(join(root, 'docs/internal/briefs'), FACTS, root, []);
    expect(defects).toEqual([expect.stringContaining('rebuiltListPath')]);
  });

  it('per-brief mode skips coverage: an uncovered listed path does not fail a single-brief run', () => {
    const { defects } = checkProvenance(briefsDir, FACTS, root, [
      'docs/internal/briefs/front-door/README.json',
    ]);
    expect(defects).toEqual([]);
  });
});

describe('loadRebuiltList', () => {
  it('reads a valid list relative to root', () => {
    const root = join(FIXTURES, 'site-coverage');
    const { list, defects } = loadRebuiltList(join(REBUILT_LISTS, 'no-brief.json'), root);
    expect(list).toEqual(['docs/admin/foo.md']);
    expect(defects).toEqual([]);
  });

  it('drops one entry outside docs/ with its own defect, keeping the rest of a valid list', () => {
    const root = join(FIXTURES, 'site-coverage');
    const listPath = join(FIXTURES, 'rebuilt-lists', 'outside-docs.json');
    const { list, defects } = loadRebuiltList(listPath, root);
    expect(list).toEqual(['docs/admin/foo.md']);
    expect(defects).toEqual([expect.stringContaining('is not a path under docs/')]);
  });

  // A literal `docs/` prefix check passes "docs/../outside.md" outright, since the string itself
  // starts with "docs/"; only normalizing first catches that it actually names a file outside
  // docs/. The bare "docs" (the directory itself, not a page) is rejected too, and a normalized
  // double-slash entry is kept in its normalized form.
  it('normalizes each entry before the docs/ prefix test, rejecting an escape and the bare "docs"', () => {
    const root = join(FIXTURES, 'site-coverage');
    const listPath = join(FIXTURES, 'rebuilt-lists', 'escapes-docs.json');
    const { list, defects } = loadRebuiltList(listPath, root);
    expect(list).toEqual(['docs/admin/foo.md', 'docs/admin/bar.md']);
    expect(defects).toEqual([
      expect.stringContaining('"docs/../outside.md") is not a path under docs/'),
      expect.stringContaining('"docs") is not a path under docs/'),
    ]);
  });
});

describe('checkBriefCoverage', () => {
  it('finds no defects when every listed page is named by a brief', () => {
    const root = join(FIXTURES, 'site-coverage');
    const briefs = [join(root, 'docs/internal/briefs/front-door/README.json')];
    expect(checkBriefCoverage(['docs/README.md'], briefs, root)).toEqual([]);
  });
});
