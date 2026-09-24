import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  extractBullets,
  maskCodeAndQuotedSpans,
  checkTag,
  buildBasenameIndex,
  resolvePointerPath,
  extractPointers,
  validateBullet,
  factsFiles,
  checkFacts,
  mintFactId,
  extractFactId,
  findDuplicateFactIds,
  isSkippedRecordPointer,
  TAG_VOCABULARY,
} from '../../../scripts/checks/check-facts.mjs';
import { migrateFactIds } from '../../../scripts/checks/migrate-fact-ids.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES_DIR = join(ROOT, 'scripts/checks/fixtures/facts');
const FACTS_DIR = join(ROOT, 'docs/internal/facts');
const CHECK_FACTS_PATH = join(ROOT, 'scripts/checks/check-facts.mjs');

/**
 * Run `check-facts.mjs --mint` in a fresh OS process and return the id it printed. Used to prove
 * mint uniqueness across separate processes, not just separate calls in one process.
 * @returns {Promise<string>}
 */
function mintInSubprocess(): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CHECK_FACTS_PATH, '--mint']);
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`--mint subprocess exited ${code}`));
        return;
      }
      resolvePromise(stdout.trim());
    });
  });
}

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
      [expect.stringContaining('missing a fact id')],
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
      '## x\n- `f:win001` A claim. Source: `windowed.ts:15` (`NEARBY_TOKEN`). [verified]',
    )[0];
    expect(validateBullet(bullet, FIXTURES_DIR, index).defects).toEqual([]);
  });

  it('rejects an anchor token more than 10 lines from the cited line', () => {
    const bullet = extractBullets(
      '## x\n- `f:win002` A claim. Source: `windowed.ts:15` (`FAR_AWAY_TOKEN`). [verified]',
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

describe('extractFactId', () => {
  it('extracts a bullet\'s leading id', () => {
    expect(extractFactId('`f:7k3q9x` The original claim. Source: x. [verified]')).toBe('f:7k3q9x');
  });

  it('returns the same id after the rest of the bullet is rewritten, proving an edit never moves it', () => {
    const original = '`f:7k3q9x` The original claim. Source: x. [verified]';
    const edited = '`f:7k3q9x` A completely rewritten claim with new wording. Source: y. [candidate: reworded]';
    expect(extractFactId(original)).toBe(extractFactId(edited));
  });

  it('returns null when the bullet carries no leading id', () => {
    expect(extractFactId('A claim with no id. Source: x. [verified]')).toBeNull();
  });

  it('does not match an id that is not the very first token', () => {
    expect(extractFactId('A claim `f:7k3q9x` mid-sentence. Source: x. [verified]')).toBeNull();
  });
});

describe('mintFactId', () => {
  it('mints an id in the `f:` plus six lowercase base36 characters form', () => {
    for (let i = 0; i < 50; i++) {
      expect(mintFactId()).toMatch(/^f:[0-9a-z]{6}$/);
    }
  });

  it('produces no collision across many ids minted in separate OS processes at once', async () => {
    const ids = await Promise.all(Array.from({ length: 20 }, () => mintInSubprocess()));
    for (const id of ids) expect(id).toMatch(/^f:[0-9a-z]{6}$/);
    expect(new Set(ids).size).toBe(ids.length);
  }, 20000);
});

describe('findDuplicateFactIds', () => {
  it('flags an id occurring more than once anywhere in the container', () => {
    const duplicates = findDuplicateFactIds([
      { id: 'f:aaaaaa', file: 'admin.md', line: 3 },
      { id: 'f:bbbbbb', file: 'admin.md', line: 7 },
      { id: 'f:aaaaaa', file: 'extend.md', line: 42 },
    ]);
    expect([...duplicates.keys()]).toEqual(['f:aaaaaa']);
    expect(duplicates.get('f:aaaaaa')).toHaveLength(2);
  });

  it('finds nothing when every id is unique', () => {
    const duplicates = findDuplicateFactIds([
      { id: 'f:aaaaaa', file: 'admin.md', line: 3 },
      { id: 'f:bbbbbb', file: 'admin.md', line: 7 },
    ]);
    expect(duplicates.size).toBe(0);
  });
});

describe('checkFacts, the full run over a fixture directory', () => {
  it('fails when a bullet carries no fact id', () => {
    const dir = join(FIXTURES_DIR, 'full-run/no-id');
    const { defects } = checkFacts(dir, dir);
    expect(defects.some((d) => d.includes('missing a fact id'))).toBe(true);
  });

  it('fails when the same id appears twice across different container files', () => {
    const dir = join(FIXTURES_DIR, 'full-run/duplicate-ids');
    const { defects } = checkFacts(dir, dir);
    expect(defects.some((d) => d.includes('duplicate fact id'))).toBe(true);
  });

  it('passes with no defects when every id across the container is unique', () => {
    const dir = join(FIXTURES_DIR, 'full-run/ok');
    const { defects } = checkFacts(dir, dir);
    expect(defects).toEqual([]);
  });
});

describe('isSkippedRecordPointer and the docs/internal/record export case', () => {
  it('skips a pointer under docs/internal/record when that directory is absent from root', () => {
    const root = join(FIXTURES_DIR, 'record-dir-absent');
    expect(isSkippedRecordPointer('docs/internal/record/2026-01-01-example.md', root)).toBe(true);
  });

  it('does not skip when the directory exists, even if the cited file inside it is missing', () => {
    const root = join(FIXTURES_DIR, 'record-dir-present');
    expect(isSkippedRecordPointer('docs/internal/record/2026-01-01-example.md', root)).toBe(false);
  });

  it('never skips a pointer outside docs/internal/record, regardless of root', () => {
    const root = join(FIXTURES_DIR, 'record-dir-absent');
    expect(isSkippedRecordPointer('src/lib/log/index.ts', root)).toBe(false);
  });

  it('validateBullet passes a docs/internal/record pointer when the directory is absent (the export case)', () => {
    const root = join(FIXTURES_DIR, 'record-dir-absent');
    const index = buildBasenameIndex(root);
    const bullet = extractBullets(
      '## x\n- `f:rec001` A claim. Source: `docs/internal/record/2026-01-01-example.md:5`. [verified]',
    )[0];
    expect(validateBullet(bullet, root, index).defects).toEqual([]);
  });

  it('validateBullet still fails a docs/internal/record pointer when the directory exists but the file does not', () => {
    const root = join(FIXTURES_DIR, 'record-dir-present');
    const index = buildBasenameIndex(root);
    const bullet = extractBullets(
      '## x\n- `f:rec002` A claim. Source: `docs/internal/record/2026-01-01-example.md:5`. [verified]',
    )[0];
    const { defects } = validateBullet(bullet, root, index);
    expect(defects).toEqual([expect.stringContaining('unresolved path')]);
  });
});

describe('migrateFactIds, against the migrate-before fixture', () => {
  const fixturePath = join(FIXTURES_DIR, 'migrate-before.md');

  /**
   * Assert that `after` differs from `before` only by a freshly minted id inserted right after a
   * bullet's leading `- `: same line count, and every changed line, once its inserted id is
   * stripped back out, reads exactly as the corresponding `before` line did. This is the
   * line-level stand-in for `git diff --word-diff` showing nothing but insertions.
   */
  function assertOnlyIdInsertions(before: string, after: string) {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    expect(afterLines).toHaveLength(beforeLines.length);
    for (let i = 0; i < beforeLines.length; i++) {
      if (afterLines[i] === beforeLines[i]) continue;
      const stripped = afterLines[i].replace(/^(- )`f:[0-9a-z]{6}` /, '$1');
      expect(stripped).toBe(beforeLines[i]);
    }
  }

  it('adds an id to every bullet lacking one, leaves an existing id and skipped sections untouched', () => {
    const before = readFileSync(fixturePath, 'utf8');
    const { text: after, added } = migrateFactIds(before);
    expect(added).toBe(2);
    expect(after).toContain('`f:zzz999` A claim that already carries an id');
    expect(after).toMatch(/- `f:[0-9a-z]{6}` A claim that soft-wraps/);
    expect(after).toMatch(/- `f:[0-9a-z]{6}` Another claim needing an id/);
    expect(after).toContain('- A note under the skipped heading');
    expect(after).toContain('- Another skipped-heading note.');
  });

  it('changes only id insertions: every altered line, id stripped, matches the source line', () => {
    const before = readFileSync(fixturePath, 'utf8');
    const { text: after } = migrateFactIds(before);
    assertOnlyIdInsertions(before, after);
  });

  it('is idempotent: a second run changes nothing', () => {
    const before = readFileSync(fixturePath, 'utf8');
    const { text: once } = migrateFactIds(before);
    const { text: twice, added } = migrateFactIds(once);
    expect(added).toBe(0);
    expect(twice).toBe(once);
  });
});
