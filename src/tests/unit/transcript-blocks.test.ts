// The render layer is proven two ways: small synthetic control-stream inputs isolate one CSI
// or control-character rule at a time, and the two ground-truth checks against the real
// recorded fixtures prove the renderer survives an actual clack per-keystroke redraw, not just
// the primitives in isolation. scanTree's failure modes are each proven against a small
// temp-directory tree built for that one mode, mirroring check-symbols.test.ts's own
// scanTree(root) harness.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  renderTranscript,
  splitSegments,
  findConsecutiveRun,
  parseMarkedBlocks,
  scanTree,
} from '../../../scripts/checks/transcript-blocks.mjs';

const FIXTURES_DIR = 'packages/create-cairn-site/test/fixtures/transcripts';

describe('renderTranscript: control characters', () => {
  it('applies carriage return as a column reset, letting later writes overwrite earlier ones', () => {
    expect(renderTranscript('hello\rXY')).toBe('XYllo');
  });

  it('applies newline as a new row starting at column zero', () => {
    expect(renderTranscript('ab\ncd')).toBe('ab\ncd');
  });

  it('applies backspace as a column decrement without erasing', () => {
    expect(renderTranscript('abc\b\bXY')).toBe('aXY');
  });

  it('drops NUL and BEL bytes', () => {
    expect(renderTranscript('a\x00b\x07c')).toBe('abc');
  });

  it('right-trims trailing whitespace on a line that received other content', () => {
    expect(renderTranscript('hello   \rXY')).toBe('XYllo');
  });

  it('does not manufacture a trailing blank line for a row nothing ever wrote to', () => {
    // A bare trailing newline moves the cursor to a fresh row; unlike the spinner-erasure
    // ground truth below, nothing writes to or erases that row, so it never becomes part of
    // the rendered frame.
    expect(renderTranscript('hello\n')).toBe('hello');
  });
});

describe('renderTranscript: CSI cursor motion', () => {
  it('CSI G moves the cursor to an absolute column, 1-indexed', () => {
    expect(renderTranscript('\x1b[4Gx')).toBe('   x');
  });

  it('CSI C moves the cursor forward, padding the skipped columns with spaces', () => {
    expect(renderTranscript('\x1b[3Cx')).toBe('   x');
  });

  it('CSI D moves the cursor back, letting a write overwrite mid-line', () => {
    expect(renderTranscript('abc\x1b[2Dx')).toBe('axc');
  });

  it('CSI A moves the cursor up so a following write overwrites an earlier row', () => {
    expect(renderTranscript('row0\nrow1\x1b[1A\x1b[1Gx')).toBe('xow0\nrow1');
  });

  it('CSI H positions both row and column, 1-indexed', () => {
    expect(renderTranscript('\x1b[3;5Hx')).toBe('\n\n    x');
  });
});

describe('renderTranscript: CSI erase', () => {
  it('CSI K mode 0 (default) erases from the cursor to the end of the line', () => {
    expect(renderTranscript('hello\rXY\x1b[K')).toBe('XY');
  });

  it('CSI K mode 1 erases from the start of the line through the cursor, inclusive', () => {
    expect(renderTranscript('hello\r\x1b[3C\x1b[1K')).toBe('    o');
  });

  it('CSI K mode 2 erases the whole line', () => {
    expect(renderTranscript('hello\x1b[2K')).toBe('');
  });

  it('CSI J mode 0 (default) erases from the cursor to the end of the screen', () => {
    expect(renderTranscript('row0\nrow1\nrow2\x1b[1A\x1b[1G\x1b[J')).toBe('row0\n');
  });

  it('CSI J mode 2 erases the whole screen, keeping the row count', () => {
    expect(renderTranscript('row0\nrow1\x1b[2J')).toBe('\n');
  });
});

describe('renderTranscript: sequences that carry no visible effect', () => {
  it('discards SGR (color/style) sequences', () => {
    expect(renderTranscript('\x1b[1m\x1b[33mHello\x1b[0m')).toBe('Hello');
  });

  it('discards cursor show/hide sequences', () => {
    expect(renderTranscript('a\x1b[?25lb\x1b[?25hc')).toBe('abc');
  });

  it('discards a BEL-terminated OSC sequence', () => {
    expect(renderTranscript('a\x1b]0;title\x07b')).toBe('ab');
  });

  it('discards an ST-terminated OSC sequence', () => {
    expect(renderTranscript('a\x1b]0;title\x1b\\b')).toBe('ab');
  });

  it('discards a charset designation escape', () => {
    expect(renderTranscript('a\x1b(Bb')).toBe('ab');
  });

  it('discards any other single-character escape', () => {
    expect(renderTranscript('a\x1bcb')).toBe('ab');
  });
});

describe('renderTranscript: real fixture ground truths', () => {
  it('renders the 01-create-cairn-site.txt site-name prompt as one settled line, not a keystroke trail', async () => {
    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(join(FIXTURES_DIR, '01-create-cairn-site.txt'), 'utf8');
    const lines = renderTranscript(raw).split('\n');
    expect(lines).toContain('│  cairn-capture-scratch');
    // A per-keystroke redraw that survived un-erased would leave partial trails like these.
    for (const partial of ['│  c', '│  ca', '│  cai', '│  cair']) {
      expect(lines).not.toContain(partial);
    }
  });

  it('renders 03-doctor-credentialed.txt to exactly 36 lines with the documented shape', async () => {
    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(join(FIXTURES_DIR, '03-doctor-credentialed.txt'), 'utf8');
    const lines = renderTranscript(raw).split('\n');
    expect(lines).toHaveLength(36);
    expect(lines[0]).toContain('deprecated in favour of');
    expect(lines[1]).toContain('deprecated in favour of');
    expect(lines[2]).toBe('PASS  Wrangler bindings: EMAIL and AUTH_DB are declared');
    expect(lines.at(-2)).toBe('8 passed, 3 failed, 8 skipped');
    expect(lines.at(-1)).toBe('');
  });
});

describe('splitSegments', () => {
  it('returns the whole body as one segment when there is no elision', () => {
    expect(splitSegments('a\nb\nc')).toEqual(['a\nb\nc']);
  });

  it('splits on an elision line into ordered segments', () => {
    expect(splitSegments('a\nb\n[...]\nc\nd')).toEqual(['a\nb', 'c\nd']);
  });

  it('drops a segment left empty by adjacent elisions rather than keeping a blank entry', () => {
    expect(splitSegments('a\n[...]\n[...]\nb')).toEqual(['a', 'b']);
  });
});

describe('findConsecutiveRun', () => {
  it('finds a contiguous, order-preserving run at or after fromIndex', () => {
    const haystack = ['x', 'a', 'b', 'c', 'y'];
    expect(findConsecutiveRun(haystack, ['a', 'b', 'c'], 0)).toBe(1);
  });

  it('returns -1 when the run only appears before fromIndex', () => {
    const haystack = ['a', 'b', 'x', 'y'];
    expect(findConsecutiveRun(haystack, ['a', 'b'], 1)).toBe(-1);
  });

  it('returns -1 when the lines are present but not contiguous', () => {
    const haystack = ['a', 'x', 'b'];
    expect(findConsecutiveRun(haystack, ['a', 'b'], 0)).toBe(-1);
  });
});

describe('parseMarkedBlocks', () => {
  it('reads one marker-plus-fence block', () => {
    const text = [
      '<!-- transcript: fixtures/one.txt -->',
      '```',
      'hello',
      '```',
    ].join('\n');
    const { blocks, violations } = parseMarkedBlocks('page.md', text);
    expect(violations).toEqual([]);
    expect(blocks).toEqual([
      { file: 'page.md', markerPath: 'fixtures/one.txt', markerLineNo: 1, tag: '', body: 'hello' },
    ]);
  });

  it('accepts a fence tagged text', () => {
    const text = ['<!-- transcript: f.txt -->', '```text', 'hi', '```'].join('\n');
    const { blocks } = parseMarkedBlocks('page.md', text);
    expect(blocks[0].tag).toBe('text');
  });
});

describe('scanTree: failure modes', () => {
  const made: string[] = [];

  afterEach(() => {
    let dir: string | undefined;
    while ((dir = made.pop()) !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function buildTree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'cairn-transcript-test-'));
    made.push(root);
    for (const [rel, content] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
    return root;
  }

  it('reports content-mismatch when a block does not appear in the fixture, in order', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'line one\nline two\nline three\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '```',
        'a line that is not in the fixture at all',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'content-mismatch' })]),
    );
  });

  it('reports content-mismatch when elided segments appear out of order', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'line one\nline two\nline three\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '```',
        'line three',
        '[...]',
        'line one',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'content-mismatch' })]),
    );
  });

  it('accepts elided segments that appear in order, skipping the elided middle', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'line one\nline two\nline three\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '```',
        'line one',
        '[...]',
        'line three',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'content-mismatch' })]),
    );
  });

  it('reports fixture-missing when the named fixture does not exist', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/does-not-exist.txt -->`,
        '```',
        'hi',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'fixture-missing' })]),
    );
  });

  it('reports orphan-marker when the next non-blank line is not a fence', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'hi\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '',
        'a stray paragraph, not a fence',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'orphan-marker' })]),
    );
  });

  it('reports double-marker when two markers precede one fence', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'hi\n',
      [`${FIXTURES_DIR}/two.txt`]: 'hi\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        `<!-- transcript: ${FIXTURES_DIR}/two.txt -->`,
        '```',
        'hi',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'double-marker' })]),
    );
  });

  it('reports marker-escapes-fixtures-dir for a path that traverses outside the fixtures root', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      'secret.txt': 'not a fixture\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/../../../../../secret.txt -->`,
        '```',
        'not a fixture',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'marker-escapes-fixtures-dir' })]),
    );
  });

  it('reports bad-fence-tag for a marked fence tagged as a shell language', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'hi\n',
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '```bash',
        'hi',
        '```',
      ].join('\n'),
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'bad-fence-tag' })]),
    );
  });

  it('reports page-below-floor per page, not globally', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/one.txt`]: 'hi\n',
      // is-it-working.md carries one block (meets its floor of 1); create-your-site.md carries
      // none, so only that page should fail even though the corpus overall has a block.
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/one.txt -->`,
        '```',
        'hi',
        '```',
      ].join('\n'),
      'docs/admin/create-your-site.md': 'No transcript blocks on this page.\n',
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'page-below-floor', file: 'docs/admin/create-your-site.md' }),
      ]),
    );
    expect(violations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'page-below-floor', file: 'docs/admin/is-it-working.md' }),
      ]),
    );
  });

  it('reports fixture-uncited for a fixture no block quotes and the README does not excuse', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/orphaned.txt`]: 'nobody quotes me\n',
    });
    const { violations } = scanTree(root);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'fixture-uncited' })]),
    );
  });

  it('excuses a fixture the README lists under Deliberately unconsumed', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: [
        '## Deliberately unconsumed',
        '',
        '- `excused.txt`, kept for the record.',
      ].join('\n'),
      [`${FIXTURES_DIR}/excused.txt`]: 'nobody quotes me\n',
    });
    const { violations } = scanTree(root);
    expect(violations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'fixture-uncited' })]),
    );
  });

  it('reports nothing on a fully compliant tree', () => {
    const root = buildTree({
      [`${FIXTURES_DIR}/README.md`]: '## Deliberately unconsumed\n',
      [`${FIXTURES_DIR}/a.txt`]: 'a1\na2\n',
      [`${FIXTURES_DIR}/b.txt`]: 'b1\nb2\n',
      [`${FIXTURES_DIR}/c.txt`]: 'c1\nc2\n',
      [`${FIXTURES_DIR}/d.txt`]: 'd1\nd2\n',
      'docs/admin/create-your-site.md': [
        `<!-- transcript: ${FIXTURES_DIR}/a.txt -->`,
        '```',
        'a1',
        'a2',
        '```',
        '',
        `<!-- transcript: ${FIXTURES_DIR}/b.txt -->`,
        '```text',
        'b1',
        'b2',
        '```',
        '',
        `<!-- transcript: ${FIXTURES_DIR}/c.txt -->`,
        '```',
        'c1',
        '[...]',
        'c2',
        '```',
      ].join('\n'),
      'docs/admin/is-it-working.md': [
        `<!-- transcript: ${FIXTURES_DIR}/d.txt -->`,
        '```',
        'd1',
        'd2',
        '```',
      ].join('\n'),
    });
    const { violations, blocksChecked } = scanTree(root);
    expect(violations).toEqual([]);
    expect(blocksChecked).toBe(4);
  });
});
