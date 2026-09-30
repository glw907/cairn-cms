import { describe, it, expect, afterAll } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyHarvest, formatReport, gitBlobSha, CUT_REASONS } from '../../../scripts/oneshot/verify-harvest.mjs';

// Every case runs against a private copy of one small passing fixture tree, mutated per case, so
// the test never reads the repository's real docs, facts, or ledgers and survives the pages'
// deletion. The blob values inside the fixture ledgers were taken from `git hash-object`.

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, 'fixtures/verify-harvest/base');
const SCRIPT = resolve(HERE, '../../../scripts/oneshot/verify-harvest.mjs');
const HARVEST = 'docs/internal/record/harvest';

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A private, mutable copy of the fixture tree with small edit helpers. */
class Root {
  readonly dir: string;
  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'verify-harvest-'));
    scratch.push(this.dir);
    cpSync(BASE, this.dir, { recursive: true });
  }
  path(rel: string): string {
    return join(this.dir, rel);
  }
  read(rel: string): string {
    return readFileSync(this.path(rel), 'utf8');
  }
  write(rel: string, text: string): void {
    mkdirSync(dirname(this.path(rel)), { recursive: true });
    writeFileSync(this.path(rel), text);
  }
  edit(rel: string, fn: (text: string) => string): void {
    const before = this.read(rel);
    const after = fn(before);
    if (after === before) throw new Error(`edit of ${rel} changed nothing`);
    this.write(rel, after);
  }
  remove(rel: string): void {
    rmSync(this.path(rel), { recursive: true, force: true });
  }
  ledger(rel: string, fn: (ledger: any) => void): void {
    const path = `${HARVEST}/${rel}`;
    const ledger = JSON.parse(this.read(path));
    fn(ledger);
    this.write(path, JSON.stringify(ledger, null, 2) + '\n');
  }
  /** Rewrite a ledger's blob to the page's current `git hash-object`, as a re-audit would. */
  reblob(ledgerRel: string): void {
    this.ledger(ledgerRel, (l) => {
      l.blob = spawnSync('git', ['hash-object', this.path(l.page)], { encoding: 'utf8' }).stdout.trim();
    });
  }
  list(fn: (list: { deleted: string[]; kept: string[] }) => void): void {
    const path = `${HARVEST}/deletion-list.json`;
    const list = JSON.parse(this.read(path));
    fn(list);
    this.write(path, JSON.stringify(list, null, 2) + '\n');
  }
}

type Opts = { arm?: string; pages?: string[] };
type Case = { name: string; mutate?: (r: Root) => void; opts?: Opts; expect: 'pass' | string[] };

function run(mutate: ((r: Root) => void) | undefined, opts: Opts = {}) {
  const root = new Root();
  mutate?.(root);
  return { root, result: verifyHarvest({ root: root.dir, ...opts }) };
}

const cases: Case[] = [
  // Passing counterparts: a rule's near-miss must not fail.
  { name: 'the unmodified fixture passes a full run', expect: 'pass' },
  { name: 'a scoped arm run passes', opts: { arm: 'admin' }, expect: 'pass' },
  { name: 'a --pages run passes', opts: { pages: ['docs/admin/alpha.md'] }, expect: 'pass' },
  {
    name: 'a page edited and re-audited (blob refreshed) passes',
    mutate: (r) => {
      r.edit('docs/admin/alpha.md', (t) => t.replace('one checkable thing', 'one checked thing'));
      r.reblob(`admin/alpha.json`);
    },
    expect: 'pass',
  },
  {
    name: 'extra blank lines need no claim',
    mutate: (r) => {
      r.edit('docs/admin/bravo.md', (t) => t + '\n\n\n');
      r.reblob('admin/bravo.json');
    },
    expect: 'pass',
  },
  {
    name: 'a missing ledger outside the scope does not fail a scoped run',
    mutate: (r) => r.remove(`${HARVEST}/editors/beta.json`),
    opts: { arm: 'admin' },
    expect: 'pass',
  },
  {
    name: 'a [rejected] bullet whose tag text names a deletion-list page passes (only Source is read)',
    mutate: (r) =>
      r.edit('docs/internal/facts/admin.md', (t) =>
        t.replace('[rejected: describes a deleted page]', '[rejected: describes the deleted page docs/admin/alpha.md]'),
      ),
    expect: 'pass',
  },

  // Failing cases, one per rule.
  {
    name: 'a stale blob fails, naming the ledger',
    mutate: (r) => r.edit('docs/admin/alpha.md', (t) => t.replace('one checkable thing', 'one checked thing')),
    expect: [`${HARVEST}/admin/alpha.json`, 'blob is stale'],
  },
  {
    name: 'an unresolved id fails, naming the claim index',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[1].fact = 'f:zz9999')),
    expect: [`${HARVEST}/admin/alpha.json: claims[1]`, 'f:zz9999', 'does not resolve'],
  },
  {
    name: 'a new-fact id absent from the container fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[3]['new-fact'] = 'f:zz9998')),
    expect: ['claims[3]', 'f:zz9998', 'does not resolve'],
  },
  {
    name: 'a [candidate] target fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[1].fact = 'f:aa0003')),
    expect: ['claims[1]', 'f:aa0003', '[candidate]'],
  },
  {
    name: 'a [docs-drift] target fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[1].fact = 'f:aa0004')),
    expect: ['claims[1]', 'f:aa0004', '[docs-drift]'],
  },
  {
    name: 'an unknown cut reason fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[0].cut = 'boring')),
    expect: ['claims[0]', 'unknown cut reason "boring"'],
  },
  {
    name: 'an undisposed claim fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => delete l.claims[0].cut),
    expect: ['claims[0]', 'no disposition'],
  },
  {
    name: 'a claim with more than one disposition fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.claims[1].cut = 'marketing')),
    expect: ['claims[1]', 'more than one disposition'],
  },
  {
    name: 'a ledger for a page off the list fails',
    mutate: (r) =>
      r.ledger('admin/alpha.json', (l) => {
        r.write(
          `${HARVEST}/admin/ghost.json`,
          JSON.stringify({ ...l, page: 'docs/admin/ghost.md' }, null, 2),
        );
      }),
    expect: [`${HARVEST}/admin/ghost.json`, 'docs/admin/ghost.md', 'is not on the deletion list'],
  },
  {
    name: 'a ledger for a kept-set page fails',
    mutate: (r) => {
      r.write(
        `${HARVEST}/extend/kept-record.json`,
        JSON.stringify({ page: 'docs/extend/kept-record.md', blob: 'x', claims: [] }, null, 2),
      );
    },
    expect: [`${HARVEST}/extend/kept-record.json`, 'is not on the deletion list'],
  },
  {
    name: 'an uncovered paragraph fails, naming the line range',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => l.claims.splice(1, 1)),
    expect: [`${HARVEST}/admin/alpha.json`, 'uncovered lines 7-8'],
  },
  {
    name: 'an uncovered fenced snippet fails (a snippet is a claim)',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => l.claims.splice(2, 1)),
    expect: ['uncovered lines 10-12'],
  },
  {
    name: 'a span reaching past the end of the page fails',
    mutate: (r) => r.ledger('admin/bravo.json', (l) => (l.claims[3].lines = [7, 99])),
    expect: ['claims[3]', 'lines'],
  },
  {
    name: 'a span reaching the empty element after the final newline fails',
    mutate: (r) => r.ledger('editors/beta.json', (l) => (l.claims[1].lines = [3, 4])),
    expect: ['claims[1]', 'lines'],
  },
  {
    name: 'a paraphrase over 25 words fails',
    mutate: (r) =>
      r.ledger('editors/beta.json', (l) => (l.claims[1].paraphrase = Array.from({ length: 26 }, (_, i) => `w${i}`).join(' '))),
    expect: ['claims[1]', 'paraphrase', '25 words'],
  },
  {
    name: 'an empty claims list fails',
    mutate: (r) => r.ledger('editors/beta.json', (l) => (l.claims = [])),
    expect: [`${HARVEST}/editors/beta.json`, 'claims is empty'],
  },
  {
    name: 'a missing ledger fails a scoped arm run, naming the expected path',
    mutate: (r) => r.remove(`${HARVEST}/admin/bravo.json`),
    opts: { arm: 'admin' },
    expect: [`${HARVEST}/admin/bravo.json`, 'missing ledger', 'docs/admin/bravo.md'],
  },
  {
    name: 'a missing ledger fails a --pages run',
    mutate: (r) => r.remove(`${HARVEST}/admin/bravo.json`),
    opts: { pages: ['docs/admin/bravo.md'] },
    expect: ['missing ledger', 'docs/admin/bravo.md'],
  },
  {
    name: 'a --pages typo fails by name',
    opts: { pages: ['docs/admin/alhpa.md'] },
    expect: ['docs/admin/alhpa.md', 'is not on the deletion list'],
  },
  {
    name: 'a --pages path naming a kept-set page fails',
    opts: { pages: ['docs/extend/kept-record.md'] },
    expect: ['docs/extend/kept-record.md', 'is not on the deletion list'],
  },
  {
    name: 'a --pages path outside the named --arm fails',
    opts: { arm: 'editors', pages: ['docs/admin/alpha.md'] },
    expect: ['docs/admin/alpha.md', 'not in arm "editors"'],
  },
  {
    name: 'an unknown --arm fails',
    opts: { arm: 'nope' },
    expect: ['unknown arm "nope"'],
  },
  {
    name: 'an absent record directory fails',
    mutate: (r) => r.remove(HARVEST),
    expect: ['record directory', HARVEST, 'is absent'],
  },
  {
    name: 'an absent deletion list fails',
    mutate: (r) => r.remove(`${HARVEST}/deletion-list.json`),
    expect: ['deletion-list.json', 'is absent'],
  },
  {
    name: 'a malformed deletion list fails',
    mutate: (r) => r.write(`${HARVEST}/deletion-list.json`, '{ "deleted": [1] }'),
    expect: ['deletion-list.json', 'deleted'],
  },
  {
    name: 'malformed ledger JSON fails, naming the ledger',
    mutate: (r) => r.write(`${HARVEST}/editors/beta.json`, '{ "page": '),
    expect: [`${HARVEST}/editors/beta.json`, 'is not valid JSON'],
  },
  {
    name: 'a page field that disagrees with the ledger location fails',
    mutate: (r) => r.ledger('admin/alpha.json', (l) => (l.page = 'docs/admin/bravo.md')),
    expect: [`${HARVEST}/admin/alpha.json`, 'does not match its location'],
  },
  {
    name: 'two ledgers for one page fail',
    mutate: (r) => r.write(`${HARVEST}/admin/alpha-copy.json`, r.read(`${HARVEST}/admin/alpha.json`)),
    expect: ['more than one ledger', 'docs/admin/alpha.md', 'alpha-copy.json'],
  },
  {
    name: 'a ledger outside the four arm directories fails',
    mutate: (r) => r.write(`${HARVEST}/stray/alpha.json`, r.read(`${HARVEST}/admin/alpha.json`)),
    expect: [`${HARVEST}/stray/alpha.json`, 'outside the arm directories'],
  },
  {
    name: 'a page on the tree but on neither list fails',
    mutate: (r) => r.write('docs/admin/delta.md', '# Delta\n'),
    expect: ['docs/admin/delta.md', 'on the tree but on neither list'],
  },
  {
    name: 'a listed page with no file on the tree fails',
    mutate: (r) => r.remove('docs/editors/beta.md'),
    expect: ['docs/editors/beta.md', 'no such page on the tree'],
  },
  {
    name: 'a kept page with no file on the tree fails',
    mutate: (r) => r.remove('docs/extend/kept-record.md'),
    expect: ['docs/extend/kept-record.md', 'kept page', 'no such page on the tree'],
  },
  {
    name: 'a page on both lists fails',
    mutate: (r) => r.list((l) => l.kept.push('docs/admin/alpha.md')),
    expect: ['docs/admin/alpha.md', 'on both lists'],
  },
  {
    name: 'a fact whose Source names a deletion-list page fails in a full run',
    mutate: (r) =>
      r.edit('docs/internal/facts/admin.md', (t) => t.replace('`src/alpha.ts:1`. [verified]', '`docs/admin/bravo.md:3`. [verified]')),
    expect: ['docs/internal/facts/admin.md', 'f:aa0001', 'names deletion-list page docs/admin/bravo.md'],
  },
  {
    name: 'a Source naming a page in prose beside a line number fails',
    mutate: (r) =>
      r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', 'the page (docs/admin/alpha.md:338)')),
    expect: ['f:be0001', 'names deletion-list page docs/admin/alpha.md'],
  },
  {
    name: 'a Source naming a deletion-list page by bare basename fails',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', 'the copy in bravo.md')),
    expect: ['f:be0001', 'names deletion-list page docs/admin/bravo.md', '"bravo.md"'],
  },
  {
    name: 'a Source naming a deletion-list page by arm-relative path fails',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', '`admin/bravo.md`')),
    expect: ['f:be0001', 'names deletion-list page docs/admin/bravo.md', '"admin/bravo.md"'],
  },
  {
    name: 'a Source naming a deletion-list page by a ../ relative path fails',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', '`../admin/bravo.md`')),
    expect: ['f:be0001', 'names deletion-list page docs/admin/bravo.md'],
  },
  {
    name: 'a bare basename shared with another file is ambiguous and is not flagged',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', '`README.md:1`')),
    expect: 'pass',
  },
  {
    name: 'a bare basename that names only a kept-set page is not flagged',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', 'kept-record.md')),
    expect: 'pass',
  },
  {
    name: 'a longer name that merely ends like a page basename is not flagged',
    mutate: (r) => r.edit('docs/internal/facts/editors.md', (t) => t.replace('`src/beta.ts:1`', 'the-bravo.md and mybravo.md')),
    expect: 'pass',
  },
  {
    name: 'an unscoped run reads a non-page section too (the whole container)',
    mutate: (r) =>
      r.edit('docs/internal/facts/front-door.md', (t) => t.replace('`README.md:1`', '`docs/admin/bravo.md:3`')),
    expect: ['docs/internal/facts/front-door.md', 'f:fd0002', 'names deletion-list page docs/admin/bravo.md'],
  },
  {
    name: 'an unscoped run reads a kept-page section too',
    mutate: (r) =>
      r.edit('docs/internal/facts/extend.md', (t) => t.replace('`docs/extend/kept-record.md`. [verified]', '`docs/admin/bravo.md:3`. [verified]')),
    expect: ['f:kr0001', 'names deletion-list page docs/admin/bravo.md'],
  },
];

describe('verifyHarvest, fixture cases', () => {
  for (const c of cases) {
    it(c.name, () => {
      const { result } = run(c.mutate, c.opts);
      if (c.expect === 'pass') {
        expect(result.failures).toEqual([]);
        return;
      }
      expect(result.failures.length).toBeGreaterThan(0);
      for (const fragment of c.expect) {
        expect(result.failures.some((f: string) => f.includes(fragment)), `no failure contains "${fragment}" in:\n${result.failures.join('\n')}`).toBe(true);
      }
    });
  }
});

describe('verifyHarvest, scoped Source check', () => {
  /** Bravo's section cites the deleted alpha page in a Source. */
  const citeAlphaFromBravo = (r: Root) =>
    r.edit('docs/internal/facts/admin.md', (t) =>
      t.replace(
        '- `f:bb0003`',
        '- `f:bb0004` Bravo cites a deleted page. Source: `docs/admin/alpha.md:3`. [verified]\n- `f:bb0003`',
      ),
    );

  it('an out-of-scope section citing a deletion-list page does not fail a scoped run', () => {
    const { result } = run(citeAlphaFromBravo, { pages: ['docs/admin/alpha.md'] });
    expect(result.failures).toEqual([]);
  });

  it('the same section fails once its page is in scope', () => {
    const { result } = run(citeAlphaFromBravo, { pages: ['docs/admin/bravo.md'] });
    expect(result.failures.some((f: string) => f.includes('f:bb0004') && f.includes('docs/admin/alpha.md'))).toBe(true);
  });

  it('the same section fails an unscoped run', () => {
    const { result } = run(citeAlphaFromBravo);
    expect(result.failures.some((f: string) => f.includes('f:bb0004'))).toBe(true);
  });

  it('a section for a page outside the arm is skipped by an arm-scoped run', () => {
    const { result } = run(
      (r) => r.edit('docs/internal/facts/extend.md', (t) => t.replace('`src/gamma.ts:1`', '`docs/admin/alpha.md:1`')),
      { arm: 'admin' },
    );
    expect(result.failures).toEqual([]);
  });
});

describe('verifyHarvest, reporting', () => {
  it('reports every failure in a run, not only the first', () => {
    const { result } = run((r) => {
      r.ledger('admin/alpha.json', (l) => {
        l.claims[0].cut = 'boring';
        l.claims[1].fact = 'f:zz9999';
      });
      r.ledger('editors/beta.json', (l) => (l.claims = []));
      r.remove(`${HARVEST}/extend/gamma.json`);
    });
    const text = result.failures.join('\n');
    expect(text).toContain('unknown cut reason');
    expect(text).toContain('f:zz9999');
    expect(text).toContain('claims is empty');
    expect(text).toContain('missing ledger');
  });

  it('counts claims, facts reused, facts filed, and cuts by reason per arm on success', () => {
    const { result } = run(undefined);
    expect(result.failures).toEqual([]);
    expect(result.counts.admin).toEqual({
      pages: 2,
      claims: 8,
      factsReused: 3,
      factsFiled: 2,
      cuts: { navigation: 2, illustrative: 1 },
    });
    expect(result.counts.extend).toEqual({
      pages: 1,
      claims: 4,
      factsReused: 0,
      factsFiled: 0,
      cuts: { navigation: 1, marketing: 1, 'external-trivia': 1, 'stance-without-owner-basis': 1 },
    });
    expect(result.counts['front-door'].pages).toBe(2);
    const report = formatReport(result);
    expect(report).toContain('verify-harvest: OK');
    expect(report).toContain('admin: 2 pages, 8 claims, 3 facts reused, 2 facts filed, cuts: illustrative 1, navigation 2');
  });

  it('a scoped run counts only its own arm', () => {
    const { result } = run(undefined, { arm: 'editors' });
    expect(Object.keys(result.counts)).toEqual(['editors']);
  });

  it('lists the cut reasons the spec names', () => {
    expect([...CUT_REASONS].sort()).toEqual(
      ['external-trivia', 'illustrative', 'marketing', 'navigation', 'stance-without-owner-basis'].sort(),
    );
  });
});

describe('gitBlobSha', () => {
  it('equals `git hash-object` for a fixture page, outside any repository', () => {
    const root = new Root();
    const file = root.path('docs/admin/alpha.md');
    const expected = spawnSync('git', ['hash-object', file], { encoding: 'utf8' }).stdout.trim();
    expect(gitBlobSha(readFileSync(file))).toBe(expected);
  });

  it('hashes multi-byte content by byte length', () => {
    const root = new Root();
    root.write('docs/admin/utf.md', '# caf\u00e9 \u2014 done\n');
    const file = root.path('docs/admin/utf.md');
    const expected = spawnSync('git', ['hash-object', file], { encoding: 'utf8' }).stdout.trim();
    expect(gitBlobSha(readFileSync(file))).toBe(expected);
  });
});

describe('verify-harvest command line', () => {
  it('exits 0 and prints counts on a passing scoped run at --root', () => {
    const root = new Root();
    const out = spawnSync(process.execPath, [SCRIPT, '--root', root.dir, '--arm', 'admin'], { encoding: 'utf8' });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('verify-harvest: OK');
    expect(out.stdout).toContain('admin: 2 pages');
  });

  it('exits 1 and names each failure on stderr', () => {
    const root = new Root();
    root.remove(`${HARVEST}/admin/bravo.json`);
    const out = spawnSync(process.execPath, [SCRIPT, '--root', root.dir, '--pages', 'docs/admin/bravo.md,docs/admin/alhpa.md'], {
      encoding: 'utf8',
    });
    expect(out.status).toBe(1);
    expect(out.stderr).toContain('missing ledger');
    expect(out.stderr).toContain('docs/admin/alhpa.md');
  });

  it('rejects an unknown flag with a usage error', () => {
    const out = spawnSync(process.execPath, [SCRIPT, '--bogus'], { encoding: 'utf8' });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('--bogus');
  });
});
