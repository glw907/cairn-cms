import { describe, it, expect } from 'vitest';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDevItems, scanText, type DevItem } from '../../../scripts/docs-readers/lib/ban-grep.js';
import { REPORT_REQUEST } from '../../../scripts/docs-readers/lib/runner.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEV_ITEMS_PATH = join(ROOT, 'scripts/docs-readers/fixtures/dev-items.json');

const items: DevItem[] = [
  { id: 'D02', subject: 'each JSON payload is one compact line, not pretty-printed', page: 'docs/reference/cli-cairn-json-output.md' },
  { id: 'F5', subject: 'a spanning defect', page: 'docs/admin/is-it-working.md', pages: ['docs/why-cairn.md'] },
];

describe('scanText', () => {
  it('flags a line naming an item id as a whole token', () => {
    const hits = scanText('See D02 for the details.', items);
    expect(hits).toEqual([{ itemId: 'D02', term: 'D02', file: '<text>', line: 1 }]);
  });

  it('does not flag an id as a substring of a longer token', () => {
    expect(scanText('The D02x variant is different.', items)).toEqual([]);
  });

  it('flags a line naming an item\'s page, by its full path or its basename', () => {
    expect(scanText('Look at docs/reference/cli-cairn-json-output.md.', items)[0]).toMatchObject({ itemId: 'D02' });
    expect(scanText('Look at cli-cairn-json-output.md.', items)[0]).toMatchObject({ itemId: 'D02' });
  });

  it('flags a line naming a page only listed in pages[]', () => {
    expect(scanText('See docs/why-cairn.md for more.', items)[0]).toMatchObject({ itemId: 'F5' });
  });

  it('flags a sentence restating a subject, case- and punctuation-insensitive', () => {
    const hits = scanText('Remember: EACH JSON payload is one compact line, not pretty printed!', items);
    expect(hits[0]).toMatchObject({ itemId: 'D02' });
  });

  it('does not flag ordinary prose sharing only a couple of common words with a subject', () => {
    expect(scanText('This is one line of unrelated prose about something else entirely.', items)).toEqual([]);
  });

  it('reports the file and line number on each hit', () => {
    const hits = scanText('line one\nline two mentions D02 here\nline three', items, 'some/file.md');
    expect(hits).toEqual([{ itemId: 'D02', term: 'D02', file: 'some/file.md', line: 2 }]);
  });

  it('matches a page by its basename\'s stem, without the .md extension', () => {
    const hits = scanText('See is-it-working for the details.', items);
    expect(hits).toEqual([{ itemId: 'F5', term: 'docs/admin/is-it-working.md', file: '<text>', line: 1 }]);
  });

  it('compares a page case-insensitively', () => {
    const caseItems: DevItem[] = [{ id: 'R9', subject: 'an unrelated subject', page: 'CONTRIBUTING.md' }];
    expect(scanText('See contributing.md for the process.', caseItems)[0]).toMatchObject({ itemId: 'R9' });
  });

  it('catches a subject a source hard-wraps across two lines, which a per-line check would miss', () => {
    const wrapItems: DevItem[] = [{ id: 'W1', subject: 'chassis import alias name', page: 'docs/one.md' }];
    // Neither line alone contains all four subject words: line 1 ends after "import", line 2
    // starts at "alias". A check confined to one line at a time would find nothing here.
    const hits = scanText('Use the $chassis import\nalias name here.', wrapItems);
    expect(hits).toEqual([{ itemId: 'W1', term: 'chassis import alias name', file: '<text>', line: 1 }]);
  });
});

describe('the shipped reader prompt against the real development-item list', () => {
  const realItems = loadDevItems(DEV_ITEMS_PATH);

  it('has 46 entries, each with an id, subject, and page', () => {
    expect(realItems).toHaveLength(46);
    for (const item of realItems) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.subject).toBe('string');
      expect(typeof item.page).toBe('string');
    }
  });

  it('passes the shipped REPORT_REQUEST prompt, naming no development item', () => {
    expect(scanText(REPORT_REQUEST, realItems)).toEqual([]);
  });

  it('flags a fixture sentence carrying one of the real subjects', () => {
    const carryingSubject = realItems.find((item) => item.subject.split(' ').length >= 4);
    if (!carryingSubject) throw new Error('expected at least one multi-word subject in dev-items.json');
    const sentence = `A reminder that ${carryingSubject.subject}, in case that matters here.`;
    const hits = scanText(sentence, realItems);
    expect(hits.some((hit) => hit.itemId === carryingSubject.id)).toBe(true);
  });
});

describe('the ban grep CLI', () => {
  const BAN_GREP_FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/ban-grep');

  it('exits 0 and prints nothing for a file naming no development item', async () => {
    const { main } = await import('../../../scripts/docs-readers/ban-grep.js');
    const writes: string[] = [];
    const spy = (text: string) => {
      writes.push(text);
      return true;
    };
    const original = process.stdout.write;
    process.stdout.write = spy as typeof process.stdout.write;
    try {
      const code = main([join(BAN_GREP_FIXTURES, 'clean.txt')]);
      expect(code).toBe(0);
      expect(writes).toEqual([]);
    } finally {
      process.stdout.write = original;
    }
  });

  it('exits 1 and prints the item id, the matched term, and the file:line for a hit', async () => {
    const { main } = await import('../../../scripts/docs-readers/ban-grep.js');
    const writes: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((text: string) => {
      writes.push(text);
      return true;
    }) as typeof process.stdout.write;
    try {
      const file = join(BAN_GREP_FIXTURES, 'hit.txt');
      const code = main([file]);
      expect(code).toBe(1);
      expect(writes.join('')).toContain(`${file}:1: D01 names "D01"`);
    } finally {
      process.stdout.write = original;
    }
  });
});
