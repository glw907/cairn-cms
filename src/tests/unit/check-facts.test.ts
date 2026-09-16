import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractBullets,
  maskCodeAndQuotedSpans,
  checkTag,
  buildBasenameIndex,
  resolvePointerPath,
  extractPointers,
  validateBullet,
  factsFiles,
  TAG_VOCABULARY,
} from '../../../scripts/checks/check-facts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES_DIR = join(ROOT, 'scripts/checks/fixtures/facts');
const FACTS_DIR = join(ROOT, 'docs/internal/facts');

describe('extractBullets', () => {
  it('joins a bullet soft-wrapped across continuation lines into one string', () => {
    const markdown = ['## docs/example.md', '- First part of the claim,', '  second part. Source: page text. [verified]'].join('\n');
    const bullets = extractBullets(markdown);
    expect(bullets).toEqual([
      { section: 'docs/example.md', text: 'First part of the claim, second part. Source: page text. [verified]', line: 2 },
    ]);
  });

  it('starts a new bullet on the next `- ` line and resets on a blank line or a heading', () => {
    const markdown = [
      '## First',
      '- One. Source: page text. [verified]',
      '',
      '- Two. Source: page text. [candidate: x]',
      '## Second',
      '- Three. Source: page text. [external: GitHub]',
    ].join('\n');
    const bullets = extractBullets(markdown);
    expect(bullets.map((b) => b.section)).toEqual(['First', 'First', 'Second']);
    expect(bullets.map((b) => b.text)).toEqual([
      'One. Source: page text. [verified]',
      'Two. Source: page text. [candidate: x]',
      'Three. Source: page text. [external: GitHub]',
    ]);
  });
});

describe('maskCodeAndQuotedSpans', () => {
  it('replaces a backtick code span and a double-quoted span with same-length filler', () => {
    const text = 'A `cairn-cms[bot]` fact with a "quoted [aside]" too.';
    const masked = maskCodeAndQuotedSpans(text);
    expect(masked).not.toContain('[');
    expect(masked.length).toBe(text.length);
  });
});

describe('checkTag', () => {
  it('accepts a single trailing vocabulary tag in colon form', () => {
    expect(checkTag('A claim. Source: x. [verified]')).toEqual({ ok: true, tag: 'verified' });
    expect(checkTag('A claim. Source: x. [docs-drift: page says "y"]')).toEqual({
      ok: true,
      tag: 'docs-drift',
    });
  });

  it('ignores a bracket inside a code span or a quoted span', () => {
    expect(checkTag('The committer is `cairn-cms[bot]`. Source: x. [verified]')).toEqual({
      ok: true,
      tag: 'verified',
    });
  });

  it('rejects a bullet with no tag at all', () => {
    const result = checkTag('A claim with no tag. Source: x.');
    expect(result).toEqual({ ok: false, reason: 'missing a status tag from the vocabulary' });
  });

  it('rejects a trailing tag outside the vocabulary', () => {
    const result = checkTag('A claim. Source: x. [maybe: not sure]');
    expect(result.ok).toBe(false);
    expect(result.ok || result.reason).toContain('outside vocabulary');
  });

  it('rejects two tags on one bullet', () => {
    const result = checkTag('A claim. Source: x. [verified] [candidate: also this]');
    expect(result.ok).toBe(false);
    expect(result.ok || result.reason).toContain('2 status tags');
  });

  it('rejects a space-qualified tag, wanting the colon form', () => {
    const result = checkTag('A claim. Source: x. [candidate sourced to the page only]');
    expect(result.ok).toBe(false);
    expect(result.ok || result.reason).toContain('colon form');
  });

  it('rejects a tag that is not the last thing on the bullet', () => {
    const result = checkTag('A claim. [verified] Source: x.');
    expect(result.ok).toBe(false);
  });

  it('every vocabulary word is independently recognized', () => {
    for (const tag of TAG_VOCABULARY) {
      expect(checkTag(`A claim. Source: x. [${tag}]`)).toEqual({ ok: true, tag });
    }
  });
});

describe('extractPointers', () => {
  it('extracts a bare path:line pointer with no anchor', () => {
    const pointers = extractPointers('Source: `src/lib/log/index.ts:12`. [verified]');
    expect(pointers).toEqual([{ path: 'src/lib/log/index.ts', lineSpec: '12', anchor: null, index: 8 }]);
  });

  it('extracts a path:line-line pointer carrying a backtick-quoted anchor', () => {
    const pointers = extractPointers('Source: `a/b.ts:5-9` (`const x = 1;`). [verified]');
    expect(pointers[0]).toMatchObject({ path: 'a/b.ts', lineSpec: '5-9', anchor: 'const x = 1;' });
  });

  it('extracts a comma-separated line list', () => {
    const pointers = extractPointers('Source: `a/b.ts:5,9,20-22`. [verified]');
    expect(pointers[0].lineSpec).toBe('5,9,20-22');
  });
});

describe('resolvePointerPath and buildBasenameIndex, against the check-facts fixtures', () => {
  const index = buildBasenameIndex(FIXTURES_DIR);

  it('resolves a literal repo-relative path', () => {
    expect(resolvePointerPath('target.ts', FIXTURES_DIR, index)).toBe('target.ts');
  });

  it('returns null for a path that resolves nowhere', () => {
    expect(resolvePointerPath('does-not-exist.ts', FIXTURES_DIR, index)).toBeNull();
  });

  it('resolves a bare filename via a unique basename match in a nested directory', () => {
    expect(resolvePointerPath('only-here.ts', FIXTURES_DIR, index)).toBe('nested/only-here.ts');
  });

  it('does not fall back for a pointer that carries a directory, even if its basename is unique elsewhere', () => {
    expect(resolvePointerPath('wrong-dir/only-here.ts', FIXTURES_DIR, index)).toBeNull();
  });
});

describe('validateBullet, against the check-facts fixtures', () => {
  const index = buildBasenameIndex(FIXTURES_DIR);

  it('finds no defects across the good fixture', () => {
    const markdown = readFileSync(join(FIXTURES_DIR, 'good.md'), 'utf8');
    const bullets = extractBullets(markdown).filter(
      (b) => !['harvest record', 'provenance'].includes((b.section ?? '').trim().toLowerCase()),
    );
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) {
      const { defects } = validateBullet(bullet, FIXTURES_DIR, index);
      expect(defects).toEqual([]);
    }
  });

  it('fires exactly one rule per malformed bullet in the bad fixture', () => {
    const markdown = readFileSync(join(FIXTURES_DIR, 'bad.md'), 'utf8');
    const bullets = extractBullets(markdown).filter(
      (b) => !['harvest record', 'provenance'].includes((b.section ?? '').trim().toLowerCase()),
    );
    const results = bullets.map((bullet) => validateBullet(bullet, FIXTURES_DIR, index).defects);
    expect(results).toEqual([
      ['missing "Source:"'],
      [expect.stringContaining('outside vocabulary')],
      [expect.stringContaining('2 status tags')],
      [expect.stringContaining('colon form')],
      [expect.stringContaining('unresolved path')],
      [expect.stringContaining('out of range')],
      [expect.stringContaining('not found within')],
    ]);
  });

  it('skips a malformed bullet under the Harvest record heading', () => {
    const markdown = readFileSync(join(FIXTURES_DIR, 'bad.md'), 'utf8');
    const bullets = extractBullets(markdown);
    const skipped = bullets.filter((b) => (b.section ?? '').trim().toLowerCase() === 'harvest record');
    expect(skipped).toHaveLength(1);
    // The malformed bullet under Harvest record is never passed to validateBullet at all, since
    // main() filters it out before checking; this asserts the filter itself finds it, proving
    // the section-skip rule fires on a bullet that would otherwise fail every other rule too.
    expect(skipped[0].text).toContain('missing its Source field entirely');
  });
});

describe('the anchor window, against the check-facts fixtures', () => {
  const index = buildBasenameIndex(FIXTURES_DIR);

  it('accepts an anchor token within 10 lines of the cited line', () => {
    const bullet = extractBullets(
      '## x\n- A claim. Source: `windowed.ts:15` (`NEARBY_TOKEN`). [verified]',
    )[0];
    expect(validateBullet(bullet, FIXTURES_DIR, index).defects).toEqual([]);
  });

  it('rejects an anchor token more than 10 lines from the cited line', () => {
    const bullet = extractBullets(
      '## x\n- A claim. Source: `windowed.ts:15` (`FAR_AWAY_TOKEN`). [verified]',
    )[0];
    const { defects } = validateBullet(bullet, FIXTURES_DIR, index);
    expect(defects).toEqual([expect.stringContaining('not found within 10 lines')]);
  });
});

describe('factsFiles', () => {
  it('walks docs/internal/facts/*.md and excludes README.md', () => {
    const files = factsFiles(FACTS_DIR);
    expect(files).not.toContain('README.md');
    expect(files).toEqual(expect.arrayContaining(['admin.md', 'editors.md', 'extend.md', 'front-door.md', 'reference.md']));
  });
});
