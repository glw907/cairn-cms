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
  extractSymbolPointers,
  resolveSymbolDeclaration,
  extractKeyPhrase,
  isOwnerTierBullet,
  SKIPPED_SECTIONS,
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

describe('extractSymbolPointers', () => {
  it('extracts a `path#Symbol` pointer with its anchor, and leaves line pointers to extractPointers', () => {
    const field = 'Source: `src/lib/a.ts#outer.inner` (`const x = 1`) and `src/lib/a.ts:4`. [verified]';
    expect(extractSymbolPointers(field)).toEqual([
      { path: 'src/lib/a.ts', symbol: 'outer.inner', anchor: 'const x = 1', index: 8 },
    ]);
    expect(extractPointers(field).map((p) => p.lineSpec)).toEqual(['4']);
  });
});

describe('resolveSymbolDeclaration', () => {
  const file = 'src/lib/symbol-target.ts';
  const original = readFileSync(join(FIXTURES_DIR, 'symbols', file), 'utf8');
  const moved = readFileSync(join(FIXTURES_DIR, 'symbols-moved', file), 'utf8');

  it('resolves a top-level constant, an interface member, and a nested named function', () => {
    expect(resolveSymbolDeclaration(original, file, 'SYMBOL_ANCHOR_CONSTANT')).toMatchObject({ ok: true, startLine: 2 });
    expect(resolveSymbolDeclaration(original, file, 'SymbolAnchorShape.lookup')).toMatchObject({ ok: true, startLine: 8, endLine: 8 });
    expect(resolveSymbolDeclaration(original, file, 'symbolAnchorFactory.innerHandle')).toMatchObject({ ok: true, startLine: 13 });
  });

  it('resolves the same symbol to its new line after the declaration moves', () => {
    const before = resolveSymbolDeclaration(original, file, 'symbolAnchorFactory.innerHandle');
    const after = resolveSymbolDeclaration(moved, file, 'symbolAnchorFactory.innerHandle');
    expect(before.ok && after.ok).toBe(true);
    if (before.ok && after.ok) expect(after.startLine - before.startLine).toBe(41);
  });

  it('picks the implementation of an overloaded function', () => {
    const result = resolveSymbolDeclaration(original, file, 'symbolAnchorOverload');
    expect(result).toMatchObject({ ok: true, startLine: 21 });
  });

  it('fails an unknown symbol and an ambiguous nested one', () => {
    expect(resolveSymbolDeclaration(original, file, 'noSuchSymbol')).toMatchObject({ ok: false });
    expect(resolveSymbolDeclaration(original, file, 'symbolAnchorFactory.noSuchInner')).toMatchObject({ ok: false });
  });
});

describe('validateBullet, symbol-anchored pointers', () => {
  const bulletFor = (source: string) => extractBullets(`## x\n- \`f:sym001\` A claim. Source: ${source}. [verified]`)[0];

  it('passes an anchor inside the named declaration, before and after the declaration moves', () => {
    const bullet = bulletFor('`src/lib/symbol-target.ts#symbolAnchorFactory.innerHandle` (`const marker = input.trim()`)');
    for (const fixture of ['symbols', 'symbols-moved']) {
      const root = join(FIXTURES_DIR, fixture);
      expect(validateBullet(bullet, root, buildBasenameIndex(root)).defects).toEqual([]);
    }
  });

  it('fails an anchor whose tokens sit outside the named declaration', () => {
    const root = join(FIXTURES_DIR, 'symbols');
    const bullet = bulletFor('`src/lib/symbol-target.ts#SymbolAnchorShape.lookup` (`verify subject`)');
    const { defects } = validateBullet(bullet, root, buildBasenameIndex(root));
    expect(defects).toEqual([expect.stringContaining('not found in the declaration')]);
  });

  it('fails an unknown symbol, a path outside src/, a missing file, and a .svelte file', () => {
    const root = join(FIXTURES_DIR, 'symbols');
    const index = buildBasenameIndex(root);
    expect(validateBullet(bulletFor('`src/lib/symbol-target.ts#missingSymbol`'), root, index).defects).toEqual([
      expect.stringContaining('no declaration named'),
    ]);
    expect(validateBullet(bulletFor('`lib/symbol-target.ts#SYMBOL_ANCHOR_CONSTANT`'), root, index).defects).toEqual([
      expect.stringContaining('only for a file under src/'),
    ]);
    expect(validateBullet(bulletFor('`src/lib/absent.ts#SYMBOL_ANCHOR_CONSTANT`'), root, index).defects).toEqual([
      expect.stringContaining('unresolved path'),
    ]);
    expect(validateBullet(bulletFor('`src/lib/Widget.svelte#thing`'), root, index).defects).toEqual([
      expect.stringContaining('TypeScript or JavaScript'),
    ]);
  });
});

describe('the owner tier and its key phrases', () => {
  it('extracts a bullet\'s quoted key phrase', () => {
    expect(extractKeyPhrase('A claim. Key phrase: "floors, not ceilings". Source: x. [verified]')).toBe('floors, not ceilings');
    expect(extractKeyPhrase('A claim. Source: x, "floors, not ceilings". [verified]')).toBeNull();
  });

  it('counts a bullet as owner tier when its source or its section names the owner brief', () => {
    const bullets = extractBullets(readFileSync(join(FIXTURES_DIR, 'owner-tier/facts/front-door.md'), 'utf8'));
    expect(bullets.map((b) => isOwnerTierBullet(b))).toEqual([true, true, true, true, false]);
  });

  it('fails an owner-tier bullet with no key phrase and one whose phrase is not in the owner brief', () => {
    const root = join(FIXTURES_DIR, 'owner-tier');
    const { defects } = checkFacts(join(root, 'facts'), root);
    expect(defects).toEqual([
      expect.stringMatching(/front-door\.md:5: .*missing a key phrase/),
      expect.stringMatching(/front-door\.md:6: .*"ceilings are optional" is not a verbatim phrase/),
    ]);
  });

  it('every owner-tier bullet in the real container carries a key phrase found in the owner brief', () => {
    const bullets = extractBullets(readFileSync(join(FACTS_DIR, 'front-door.md'), 'utf8')).filter(
      (b) => !SKIPPED_SECTIONS.has((b.section ?? '').trim().toLowerCase()),
    );
    const ownerTier = bullets.filter((b) => isOwnerTierBullet(b));
    const withPhrase = ownerTier.filter((b) => extractKeyPhrase(b.text) !== null);
    expect(ownerTier.length).toBeGreaterThan(0);
    expect(withPhrase.length).toBe(ownerTier.length);
    const index = buildBasenameIndex(ROOT);
    for (const bullet of ownerTier) expect(validateBullet(bullet, ROOT, index).defects).toEqual([]);
  });
});

describe('ids on skipped sections', () => {
  it('fails a Harvest record or Provenance bullet that carries a fact id', () => {
    const dir = join(FIXTURES_DIR, 'full-run/id-in-skipped');
    const { defects } = checkFacts(dir, dir);
    expect(defects).toEqual([
      expect.stringMatching(/only\.md:7: .*carries a fact id/),
      expect.stringMatching(/only\.md:10: .*carries a fact id/),
    ]);
  });

  it('exports the skipped-section names the migration also honors', () => {
    expect([...SKIPPED_SECTIONS].sort()).toEqual(['harvest record', 'provenance']);
  });
});
